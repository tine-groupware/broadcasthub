const { createServer } = require('http');
const wslib = require('ws');
const redis = require('redis');
const Tine20AuthTokenChecker = require(`${__base}src/Tine20AuthTokenChecker.js`);
const checkAuthToken = Tine20AuthTokenChecker.checkAuthToken;

const Logger = require(`${__base}src/Logger.js`);
const logI = Logger.Info;
const logE = Logger.Error;
const logD = Logger.Broadcasthub; // Debug

const moduleName = 'Broadcasthub';

if (process.env.ENABLE_MULTITENANCY_MODE === undefined ||
    process.env.ENABLE_MULTITENANCY_MODE === null ||
    process.env.ENABLE_MULTITENANCY_MODE === '') {
  logE('app - ENABLE_MULTITENANCY_MODE is not set. Exiting...');
  process.exit(1);
}

if (process.env.ENABLE_MULTITENANCY_MODE == 'false' && (
    process.env.TINE20_JSON_API_URL === undefined ||
    process.env.TINE20_JSON_API_URL === null ||
    process.env.TINE20_JSON_API_URL === ''
  )
  ) {
  logE('app - ENABLE_MULTITENANCY_MODE is false but TINE20_JSON_API_URL is not set. Exiting...');
  process.exit(1);
}

if (process.env.ENABLE_MULTITENANCY_MODE == 'true' && (
    process.env.TINE20_JSON_API_URL_PATTERN === undefined ||
    process.env.TINE20_JSON_API_URL_PATTERN === null ||
    process.env.TINE20_JSON_API_URL_PATTERN === ''
  )
  ) {
  logE('app - ENABLE_MULTITENANCY_MODE is true but TINE20_JSON_API_URL_PATTERN is not set. Exiting...');
  process.exit(1);
}

// Global in module for stopping the Broadcasthub
// Necessary for integration tests
var wss;
var subscriber;
const httpServer = createServer();

// Global to be able to manage channels the Broadcasthub is currently listening to.
// Holds domain names the websocket clients have authorized against, see connection handling
// domain: URL without protocol, port, path, querystring.
// https://my-domain1.test:8080/my-path?myQuery=String => my-domain.test
var domains = [];


const start = function start () {
  const functionName = 'start';
  logI(`${moduleName}.${functionName} - Begin with startup procedure...`);
  logI(`${moduleName}.${functionName} - Broadcasthub is running with ENABLE_MULTITENANCY_MODE = "${process.env.ENABLE_MULTITENANCY_MODE}"`);
  var token;
  var auth;


  // ----------------------
  // Setup Redis subscriber

  const redisOptions = {
    url: process.env.REDIS_URL,
  };
  subscriber = redis.createClient(redisOptions);

  subscriber.on('connect', () => {
    logI(`${moduleName}.${functionName} - Redis client connected to Redis.`);
  });

  subscriber.on('end', () => {
    logI(`${moduleName}.${functionName} - Redis client closed connection to Redis.`);
  });

  subscriber.on('subscribe', (channel, count) => {
    logI(`${moduleName}.${functionName} - Redis client subscribed to Redis channel "${channel}".`);
  });

  subscriber.on('error', (error) => {
    logE(error);

    if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
      // Exit or implement proper retry strategy
      process.exit(1);
      // Exit makes sense for single tenancy broadcasthub with only one static
      // channel to listen to.
      // With switch to multi-tenancy enabling multiple arbitrary channels to
      // listen to dynamically on demand (automatically subscribing /
      // unsubscribing) the application should not exit on error for one of many
      // channels.
    }
  });

  // Subscribe to static channel in single tenancy mode.
  // In multi tenancy mode channel subscription is handled on demand when
  // websocket connection is established
  if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
    subscriber.subscribe(process.env.REDIS_CHANNEL);
  }


  // ----------------------
  // Setup websocket server

  wss = new wslib.WebSocketServer({ noServer: true }, () => {
    logI(`${moduleName}.${functionName} - Started websocket server.`);
  });


  wss.on('connection', async (ws, req) => {
    logD(`${functionName} - wss: client connected`);

    ws.authenticated = false;
    ws.authenticationTries = 0;
    ws.domain = null;

    const timeout = setTimeout(() => {
      logD(`${functionName} - wss: client not authorized. Closing the connection.`);
      ws.send('UNAUTHORIZED');
      ws.close();
    }, process.env.AUTH_TIMEOUT);


    ws.on('message', async (message) => {
      logD(`${functionName} - message from client: ${message}`);

      if (ws.authenticated === false && ws.authenticationTries === 0) {
        // message is buffer!
        const auth = await checkAuthToken(message.toString());

        logD(`${functionName} - Result from _checkTine20AuthToken: ${JSON.stringify(auth)}`);

        if (auth.valid === true) {
          clearTimeout(timeout);
          ws.authenticated = true;
          ws.authenticationTries++;

          ws.send('AUTHORIZED');

          logD(`${functionName} - wss: client authorized. Keeping the connection.`);

          if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {

            // Tag each client with the domain it is authenticated against and
            // for which it should receive broadcast messages
            var domain = auth.domain;
            ws.domain = domain;

            logD(`${functionName} - wss: ws.domain = ${domain}`);

            // Subscribe Redis listener to channel of new domain
            if (! domains.includes(domain)) {
              logD(`${functionName} - wss: hit new domain ${domain} not in domains: "${JSON.stringify(domains)}"`);

              subscriber.subscribe(`${domain}:${process.env.REDIS_CHANNEL}`);

              logI(`${moduleName}.${functionName} - wss: New domain "${domain}". Added Redis subscriber for channel "${domain}:${process.env.REDIS_CHANNEL}"`);

              domains.push(domain);

              logI(`${moduleName}.${functionName} - wss: New domain "${domain}". Added to domains: ${JSON.stringify(domains)}`);
            }
          }
        }
      }
    });


    // On client close:
    // Search for remaining active, authenticated clients registered to the same domain
    // Remove domain when there is no active client anymore
    ws.on('close', () => {

      // Nothing to do in single tenancy mode
      // Nothing to do for non authenticated clients
      // Only authenticated clients are tagged with domain
      // and trigger Redis subscription for new domains
      if (process.env.ENABLE_MULTITENANCY_MODE == 'false' || ws.authenticated === false) {
        return;
      }

      var hitFirstClient = false;
      var domain = ws.domain;

      wss.clients.forEach((client) => {
        if (client.readyState === wslib.WebSocket.OPEN &&
            client.authenticated === true &&
            client.domain === ws.domain) {

          hitFirstClient = true;
          return;
        }
      });

      if (! hitFirstClient) {
        logI(`${moduleName}.${functionName} - wss: ws client closes, no other active client for domain "${domain}" found. Removing the domain.`);

        _removeDomain(domain);
      }
    });
  });


  wss.on('close', () => {
    logI(`${moduleName}.${functionName} - Stopped websocket server.`);
  });


  httpServer.on('upgrade', async (request, socket, head) => {
    logD(`${functionName} - httpServer: Receiving HTTP UPGRADE request`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });

  });


  httpServer.on('close', () => {
    logI(`${moduleName}.${functionName} - httpServer: Stopped httpServer.`);
  });

  httpServer.listen(process.env.WS_PORT);


  // -----------------------------------
  // Pass through all message from Redis subscription to all websocket clients.
  // Clients from one domain only receive messages for that domain
  // Channels are prefixed with the domain, clients are tagged with the domain

  subscriber.on('message', (channel, message) => {
    logD(`${functionName} - Redis subscriber: received message on channel "${channel}": "${message}"`);

    var hitFirstClient = false;


    if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
      wss.clients.forEach((client) => {
        // Only send messages to authenticated clients, see connection handling
        if (client.readyState === wslib.WebSocket.OPEN &&
            client.authenticated === true) {
          client.send(message);

          if (! hitFirstClient) {
            logD(`${functionName} - wss: sent message to first client: "${message}"`);
            hitFirstClient = true;
          }
        }
      });
    }


    if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {
      wss.clients.forEach((client) => {
        // Only send messages to authenticated clients, see connection handling
        // Only send messages to clients that are tagged with the channel prefix
        if (client.readyState === wslib.WebSocket.OPEN &&
            client.authenticated === true &&
            channel === `${client.domain}:${process.env.REDIS_CHANNEL}`) {
          client.send(message);

          if (! hitFirstClient) {
            logD(`${functionName} - wss: sent message to first client: "${message}"`);
            hitFirstClient = true;
          }
        }
      });

      // Remove domain when there is no active client anymore
      if (! hitFirstClient) {
        // -1 for colon
        var domain = channel.substring(0, channel.length - process.env.REDIS_CHANNEL.length - 1);

        logI(`${moduleName}.${functionName} - Broadcast message to clients of domain "${domain}". No active client found. Removing domain.`);

        _removeDomain(domain);
      }
    }

  });

  logI(`${moduleName}.${functionName} - Finished with startup procedure.`);
};


const stop = function stop () {
  const functionName = 'stop';
  logI(`${moduleName}.${functionName} - Begin with teardown procedure...`);
  subscriber.quit();
  wss.close();
  httpServer.close();
  logI(`${moduleName}.${functionName} - Finished teardown procedure.`);
}


/**
 * Remove domain from domains list and stop Redis subscriber for that domain
 *
 * domains and subscriber are global vars.
 *
 * @param string domain  The domain to remove
 */
const _removeDomain = function _removeDomain(domain = null) {
  const functionName = '_removeDomain';

  logD(`${functionName} - hitting _removeDomain`);

  if (domain === null || domain === '') {
    logD(`${functionName} - domain is null or empty string. Not removing anything.`);
    return;
  }

  logD(`${functionName} - list of domains before removal: ${JSON.stringify(domains)}`);

  logI(`${functionName} - remove domain "${domain}" from domains list`);

  for( var i = 0; i < domains.length; i++){
    if ( domains[i] === domain) {
      domains.splice(i, 1);
      // In undesired case that the domain is listed more than once:
      // Decrease counter after removal to match the next element after
      // resetting the keys
      i--;
    }
  }

  logD(`${functionName} - list of domains after removal: ${JSON.stringify(domains)}`);

  subscriber.unsubscribe(`${domain}:${process.env.REDIS_CHANNEL}`);

  logI(`${functionName} - unsubscribed Redis subscriber from channel "${domain}:${process.env.REDIS_CHANNEL}"`);
}


module.exports = {
  start: start,
  stop: stop,
}

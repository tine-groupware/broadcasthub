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

// Global in module for stopping the Broadcasthub
// Necessary for integration tests
var wss;
var subscriber;
const httpServer = createServer();


const start = function start () {
  const functionName = 'start';
  logI(`${moduleName}.${functionName} - Begin with startup procedure...`);
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
    // Exit or implement proper retry strategy
    process.exit(1);
  });

  subscriber.subscribe(process.env.REDIS_CHANNEL);


  // ----------------------
  // Setup websocket server

  wss = new wslib.WebSocketServer({ noServer: true }, () => {
    logI(`${moduleName}.${functionName} - Started websocket server.`);
  });

  wss.on('connection', async (ws, req) => {
    logD(`${functionName} - wss: client connected`);
  });

  wss.on('close', () => {
    logI(`${moduleName}.${functionName} - Stopped websocket server.`);
  });

  httpServer.on('upgrade', async (request, socket, head) => {
    logD(`${functionName} - httpServer: Receiving HTTP UPGRADE request`);
    logD(`${functionName} - httpServer: client sent header: ${JSON.stringify(request.headers)}`);

    // Reset token for each connection
    token = null;

    if (request.headers.authorization !== undefined) {
      // 'Bearer <token>' => '<token>'
      token = request.headers.authorization.split(' ')[1];
    }

    var auth = await checkAuthToken(token);

    logD(`${functionName} - Result from _checkTine20AuthToken: ${auth}`);

    if (! auth) {
      logD(`${functionName} - httpServer: client not authorized. Sending HTTP 401 UNAUTHORIZED and closing the connection.`)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;

    }

    logD(`${functionName} - httpServer: client authorized. Establishing the connection.`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });

  });

  httpServer.on('close', () => {
    logI(`${moduleName}.${functionName} - httpServer: Stopped httpServer.`);
  });

  httpServer.listen(process.env.WS_PORT);


  // -----------------------------------
  // Pass through all message from Redis
  // subscription to all websocket clients

  subscriber.on('message', (channel, message) => {
    logD(`${functionName} - Redis subscriber: received message on channel "${channel}": "${message}"`);

    var hitFirstClient = false;

    wss.clients.forEach((client) => {
      // Integrationtests do not work with client !== ws
      //if (client !== ws && client.readyState === wslib.WebSocket.OPEN) {
      if (client.readyState === wslib.WebSocket.OPEN) {
        client.send(message);

        if (! hitFirstClient) {
          logD(`${functionName} - wss: sent message to first client: "${message}"`);
          hitFirstClient = true;
        }
      }
    });

  });

  logI(`${moduleName}.${functionName} - Finished with startup procedure.`);
};


const stop = function stop () {
  const functionName = 'start';
  logI(`${moduleName}.${functionName} - Begin with teardown procedure...`);
  subscriber.quit();
  wss.close();
  httpServer.close();
  logI(`${moduleName}.${functionName} - Finished teardown procedure.`);
}


module.exports = {
  start: start,
  stop: stop,
}

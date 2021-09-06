const wslib = require('ws');

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Debug;

const tine20AuthToken = require(`${__base}test/Util/Tine20AuthToken`);
const publisher = require(`${__base}test/Util/RedisPublisher.js`);


const testMain = function testMain() {

  test('A websocket client receives a string message through websocket from the Tine 2.0 Broadcasthub which is the same string message that has been published to the Redis broadcasthub channel when a string message is published to the Redis broadcasthub channel, the websocket client has sent a valid Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const websocketOptions = {
      headers: {
        Authorization: `Bearer ${tine20AuthToken}`,
      }
    }

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsMessage = 'Broadcast to all clients!';
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      redisMessage = 'Broadcast to all clients!';
      publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
        logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
      });
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      receivedWsMessage = message.toString();
      logD(`ws1 client: received: ${receivedWsMessage}`);
      ws1.close();
    });

    // Ugly workaround to wait for checkTine20AuthToken(token) in wss.onconnect event.
    // Works only with successful expect invocations. Failing expect throws error preventing
    // the promise getting resolved, leading to Jest complaining about unstopped asynchronous operations.
    // No clean exit with code 1 on failing expect at the moment.
    // Catch can be omitted, does not help to exit with code 1.
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        resolve();
      }, 500);
    });
  });


  test('A websocket client receives a JSON message through websocket from the Tine 2.0 Broadcasthub which is the same JSON message that has been published to the Redis broadcasthub channel when a JSON message is published to the Redis broadcasthub channel, the websocket client has sent a valid Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const websocketOptions = {
      headers: {
        Authorization: `Bearer ${tine20AuthToken}`,
      }
    }

    var payload = {
      integer: 5,
      float: 3.4,
      boolean: true,
      string: 'A fine string',
      object: {
        firstProperty: 'firstValue',
        secondProperty: 'secondValue',
      },
      array: [
        {propInFirstArrayMember: 'test'},
        {propInSecondArrayMember: 'testtest'},
      ]
    };

    payload = JSON.stringify(payload);

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsMessage = payload; // Expect JSON
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      redisMessage = payload; // Send JSON as message
      publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
        logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
      });
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      receivedWsMessage = message.toString();
      logD(`ws1 client: received: ${receivedWsMessage}`);
      ws1.close();
    });

    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        resolve();
      }, 500);
    });
  });


  test('Two websocket clients receive a string message through websocket from the Tine 2.0 Broadcasthub which is the same string message that has been published to the Redis broadcasthub channel when a string message is published to the Redis broadcasthub channel, the websocket clients have sent a valid Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request and the websocket clients have successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const websocketOptions = {
      headers: {
        Authorization: `Bearer ${tine20AuthToken}`,
      }
    }

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const ws2 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsMessage = 'Broadcast to all clients!';
    var receivedWsMessage1 = '';
    var receivedWsMessage2 = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      ws2.on('open', () => {
        logD('ws2 client: websocket connection is open');

        redisMessage = 'Broadcast to all clients!';
        publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
          logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
      });
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws2.on('close', () => {
      logD('ws2: closed');
    });

    ws1.on('message', (message) => {
      receivedWsMessage1 = message.toString();
      logD(`ws1 client: received: ${receivedWsMessage1}`);
      ws1.close();
    });

    ws2.on('message', (message) => {
      receivedWsMessage2 = message.toString();
       logD(`ws2 client: received: ${receivedWsMessage2}`);
      ws2.close();
    });

    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage1).toBe(expectedWsMessage);
        expect(receivedWsMessage2).toBe(expectedWsMessage);
        resolve();
      }, 500);
    });

  });


  test('A websocket client receives an unexpected HTTP 401 response from the Tine 2.0 Broadcasthub for the websocket HTTP handshake request and the Tine 2.0 Broadchasthub closes the connection to the websocket client when the websocket client sends an invalid Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request.', async () => {

    const websocketOptions = {
      headers: {
        Authorization: `Bearer wrongwrong${tine20AuthToken}`, // Send wrong token!
      }
    }

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsClientOpenedConnection = false;
    const expectedHttpStatus = 401;
    var wsClientOpenedConnection = false;
    var receivedHttpStatus = '';

    ws1.on('open', () => {
      wsClientOpenedConnection = true;
      logD('ws1 client: websocket connection is open');
    });

    ws1.on('unexpected-response', (request, response) => {
      receivedHttpStatus = response.statusCode;
      logD(`ws1 client: received unexpected response. Status code: ${response.statusCode}. Status message: ${response.statusMessage}`);
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(wsClientOpenedConnection).toBe(expectedWsClientOpenedConnection);
        expect(receivedHttpStatus).toBe(expectedHttpStatus);
        resolve();
      }, 500);
    });

  });


  test('A websocket client receives an unexpected HTTP 401 response from the Tine 2.0 Broadcasthub for the websocket HTTP handshake request and the Tine 2.0 Broadchasthub closes the connection to the websocket client when the websocket client sends no Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request.', async () => {

    const websocketOptions = {}; // Do not send HTTP Authorization header!

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsClientOpenedConnection = false;
    const expectedHttpStatus = 401;
    var wsClientOpenedConnection = false;
    var receivedHttpStatus = '';

    ws1.on('open', () => {
      wsClientOpenedConnection = true;
      logD('ws1 client: websocket connection is open');
    });

    ws1.on('unexpected-response', (request, response) => {
      receivedHttpStatus = response.statusCode;
      logD(`ws1 client: received unexpected response. Status code: ${response.statusCode}. Status message: ${response.statusMessage}`);
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(wsClientOpenedConnection).toBe(expectedWsClientOpenedConnection);
        expect(receivedHttpStatus).toBe(expectedHttpStatus);
        resolve();
      }, 500);
    });

  });


  test('A websocket client receives no message through websocket from the Tine 2.0 Broadcasthub when a message is published to another Redis channel, the websocket client has sent a valid Tine 2.0 authorization token as bearer token in the HTTP Authorization header in the initial websocket connection request and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const websocketOptions = {
      headers: {
        Authorization: `Bearer ${tine20AuthToken}`,
      }
    }

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL, websocketOptions);
    const expectedWsMessage = ''; // Expect empty value, client should not receive any message
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      redisMessage = 'An other message to an other channel!';
      publisher.publish('another_channel', redisMessage, () => {
        logD(`publisher: published message on channel "another_channel": "${redisMessage}"`);
      });
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      receivedWsMessage = message.toString();
      logD(`ws1 client: received: ${receivedWsMessage}`);
      ws1.close();
    });

    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        ws1.close(); // Close websocket client here because onmessage event will never be called
        resolve();
      }, 500);
    });

  });

}

module.exports = testMain;

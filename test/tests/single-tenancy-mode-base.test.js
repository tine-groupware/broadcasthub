const wslib = require('ws');

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Debug;

const tine20Auth = require(`${__base}test/Util/Tine20Auth`);
const publisher = require(`${__base}test/Util/RedisPublisher.js`);

// See timeouts in e2etest/test.js resp. integrationtest/test.js


const testMain = function testMain(websocketMessageTimeout, websocketMessageTimeoutFailingAuth) {

  logD(`process.env.ENABLE_MULTITENANCY_MODE: ${process.env.ENABLE_MULTITENANCY_MODE}`);

  test('A websocket client receives a string message through websocket from the Tine 2.0 Broadcasthub which is the same string message that has been published to the Redis broadcasthub channel when a string message is published to the Redis broadcasthub channel, the websocket client has sent a valid Tine 2.0 authorization token as first message and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = 'Broadcast to all clients!';
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth));
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);

      // Trigger broadcast message after receiving first AUTHORIZED message
      if (message.toString() == 'AUTHORIZED') {
        redisMessage = 'Broadcast to all clients!';
        publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
          logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
      // Second message has to match expected broadcast message
      } else {
        receivedWsMessage = message.toString();
        ws1.close();
      }
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
      }, websocketMessageTimeout);
    });

  });


  test('A websocket client receives a JSON message through websocket from the Tine 2.0 Broadcasthub which is the same JSON message that has been published to the Redis broadcasthub channel when a JSON message is published to the Redis broadcasthub channel, the websocket client has sent a valid Tine 2.0 authorization token as first message and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

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

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = payload; // Expect JSON
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth));
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);

      // Trigger broadcast message after receiving first AUTHORIZED message
      if (message.toString() == 'AUTHORIZED') {
        redisMessage = payload; // Send JSON as message
        publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
          logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
      // Second message has to match expected broadcast message
      } else {
        receivedWsMessage = message.toString();
        ws1.close();
      }
    });

    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        resolve();
      }, websocketMessageTimeout);
    });
  });


  test('Two websocket clients receive a string message through websocket from the Tine 2.0 Broadcasthub which is the same string message that has been published to the Redis broadcasthub channel when a string message is published to the Redis broadcasthub channel, the websocket clients have sent a valid Tine 2.0 authorization token as first message and the websocket clients have successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws2 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = 'Broadcast to all clients!';
    var receivedWsMessage1 = '';
    var receivedWsMessage2 = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth));

      ws2.on('open', () => {
        logD('ws2 client: websocket connection is open');

        // Authorize in first message
        ws2.send(JSON.stringify(tine20Auth));
      });
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws2.on('close', () => {
      logD('ws2: closed');
    });


    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);

      // Trigger broadcast message after receiving first AUTHORIZED message in second client
      if (message.toString() == 'AUTHORIZED') {

        ws2.on('message', (message) => {
          logD(`ws2 client: received: ${message.toString()}`);

          if (message.toString() == 'AUTHORIZED') {
            redisMessage = 'Broadcast to all clients!';
            publisher.publish(process.env.REDIS_CHANNEL, redisMessage, () => {
              logD(`publisher: published message on channel "${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
            });
          // Second message for second client has to match expected broadcast message
          } else {
            receivedWsMessage2 = message.toString();
            ws2.close();
          }
        });

      // Second message for first client has to match expected broadcast message
      } else {
        receivedWsMessage1 = message.toString();
        ws1.close();
      }
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage1).toBe(expectedWsMessage);
        expect(receivedWsMessage2).toBe(expectedWsMessage);
        resolve();
      }, websocketMessageTimeout);
    });

  });


  test('A websocket client receives message "UNAUTHORIZED" from the Tine 2.0 Broadcasthub and the Tine 2.0 Broadchasthub closes the connection to the websocket client when the websocket client sends an invalid Tine 2.0 authorization token as first message.', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = 'UNAUTHORIZED';
    var receivedWsMessage = '';
    var connectionClosed = false;

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message - wrong token
      ws1.send(JSON.stringify({token: 'wrongwrong' + tine20Auth.token}));
    });

    // Do not close websocket connection, websocket server should close the
    // connection due to failed authentication

    ws1.on('close', () => {
      logD('ws1: closed');
      connectionClosed = true;
    });

    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);
      receivedWsMessage = message.toString();
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        expect(connectionClosed).toBe(true);
        resolve();
      }, websocketMessageTimeoutFailingAuth);
    });

  });



  test('A websocket client receives message "UNAUTHORIZED" from the Tine 2.0 Broadcasthub and the Tine 2.0 Broadchasthub closes the connection to the websocket client when the websocket client sends no Tine 2.0 authorization token as first message.', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = 'UNAUTHORIZED';
    var receivedWsMessage = '';
    var connectionClosed = false;

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Do NOT authorize in first message
    });

    // Do not close websocket connection, websocket server should close the
    // connection due to failed authentication

    ws1.on('close', () => {
      logD('ws1: closed');
      connectionClosed = true;
    });

    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);
      receivedWsMessage = message.toString();
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        expect(connectionClosed).toBe(true);
        resolve();
      }, websocketMessageTimeoutFailingAuth);
    });

  });


  test('A websocket client receives no message through websocket from the Tine 2.0 Broadcasthub when a message is published to another Redis channel, the websocket client has sent a valid Tine 2.0 authorization token as first message and the websocket client has successfully connected to the Tine 2.0 Broadcasthub websocket server.', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const expectedWsMessage = ''; // Expect empty message, client should not receive any other message after first AUTHORIZATION message
    var receivedWsMessage = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth));
    });

    ws1.on('close', () => {
      logD('ws1: closed');
    });

    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);

      // Trigger broadcast message after receiving first AUTHORIZED message
      if (message.toString() == 'AUTHORIZED') {
        redisMessage = 'An other message to an other channel!';
        publisher.publish('another_channel', redisMessage, () => {
          logD(`publisher: published message on channel "another_channel": "${redisMessage}"`);
        });
      // Second message has to match expected broadcast message
      } else {
        receivedWsMessage = message.toString();
        ws1.close();
      }
    });


    // See comment in first test
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage).toBe(expectedWsMessage);
        ws1.close(); // Close websocket client here because close should not be called above
        resolve();
      }, websocketMessageTimeout);
    });

  });

}

module.exports = testMain;

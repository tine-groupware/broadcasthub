const wslib = require('ws');

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Debug;

const tine20Auth = require(`${__base}test/Util/Tine20Auth`);
const publisher = require(`${__base}test/Util/RedisPublisher.js`);

// See timeouts in e2etest/test.js resp. integrationtest/test.js

var redisPrefix = 'localhost';


const testMain = function testMain(websocketMessageTimeout, websocketMessageTimeoutFailingAuth, redisPublishTimeout, beforeRedisPublishTimeout) {

  test('Six clients from three domains get the correct messages', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws2 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws3 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws4 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws5 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws6 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const tine20Auth1 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant1.my-domain.test:4000',
    }
    const tine20Auth2 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant2.my-domain.test:4000',
    }
    const tine20Auth3 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant3.my-domain.test:4000',
    }
    const expectedWsMessage1 = 'Broadcast to all tenant 1 clients!';
    const expectedWsMessage2 = 'Broadcast to all tenant 2 clients!';
    const expectedWsMessage3 = 'Broadcast to all tenant 3 clients!';
    var receivedWsMessage1 = '';
    var receivedWsMessage2 = '';
    var receivedWsMessage3 = '';
    var receivedWsMessage4 = '';
    var receivedWsMessage5 = '';
    var receivedWsMessage6 = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth1));
    });

    ws2.on('open', () => {
      logD('ws2 client: websocket connection is open');

      // Authorize in first message
      ws2.send(JSON.stringify(tine20Auth1));
    });

    ws3.on('open', () => {
      logD('ws3 client: websocket connection is open');

      // Authorize in first message
      ws3.send(JSON.stringify(tine20Auth2));
    });

    ws4.on('open', () => {
      logD('ws4 client: websocket connection is open');

      // Authorize in first message
      ws4.send(JSON.stringify(tine20Auth2));
    });

    ws5.on('open', () => {
      logD('ws5 client: websocket connection is open');

      // Authorize in first message
      ws5.send(JSON.stringify(tine20Auth3));
    });

    ws6.on('open', () => {
      logD('ws6 client: websocket connection is open');

      // Authorize in first message
      ws6.send(JSON.stringify(tine20Auth3));
    });


    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage1 = message.toString();
        ws1.close();
      }
    });

    ws2.on('message', (message) => {
      logD(`ws2 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage2 = message.toString();
        ws2.close();
      }
    });

    ws3.on('message', (message) => {
      logD(`ws3 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage3 = message.toString();
        ws3.close();
      }
    });

    ws4.on('message', (message) => {
      logD(`ws4 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage4 = message.toString();
        ws4.close();
      }
    });

    ws5.on('message', (message) => {
      logD(`ws5 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage5 = message.toString();
        ws5.close();
      }
    });

    ws6.on('message', (message) => {
      logD(`ws6 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage6 = message.toString();
        ws6.close();
      }
    });


    await new Promise((resolve, reject) => {
      setTimeout(() => {
        redisMessage = 'Broadcast to all tenant 1 clients!';
        publisher.publish(`tenant1.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant1.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        redisMessage = 'Broadcast to all tenant 2 clients!';
        publisher.publish(`tenant2.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant2.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        redisMessage = 'Broadcast to all tenant 3 clients!';
        publisher.publish(`tenant3.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant3.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        resolve();
      }, redisPublishTimeout);
    });


    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage1).toBe(expectedWsMessage1);
        expect(receivedWsMessage2).toBe(expectedWsMessage1);
        expect(receivedWsMessage3).toBe(expectedWsMessage2);
        expect(receivedWsMessage4).toBe(expectedWsMessage2);
        expect(receivedWsMessage5).toBe(expectedWsMessage3);
        expect(receivedWsMessage6).toBe(expectedWsMessage3);
        resolve();
      }, websocketMessageTimeout);
    });

  });


  test('Three clients from three domains get the correct messages when the other three clients from the three domains close the connection right before the messages are published in Redis', async () => {

    const ws1 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws2 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws3 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws4 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws5 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const ws6 = new wslib.WebSocket(process.env.TEST_WS_URL);
    const tine20Auth1 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant1.my-domain.test:4000',
    }
    const tine20Auth2 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant2.my-domain.test:4000',
    }
    const tine20Auth3 = {
      token: tine20Auth.token,
      jsonApiUrl: 'http://tenant3.my-domain.test:4000',
    }
    const expectedWsMessage1 = 'Broadcast to all tenant 1 clients!';
    const expectedWsMessage2 = 'Broadcast to all tenant 2 clients!';
    const expectedWsMessage3 = 'Broadcast to all tenant 3 clients!';
    var receivedWsMessage1 = '';
    var receivedWsMessage2 = '';
    var receivedWsMessage3 = '';
    var receivedWsMessage4 = '';
    var receivedWsMessage5 = '';
    var receivedWsMessage6 = '';

    ws1.on('open', () => {
      logD('ws1 client: websocket connection is open');

      // Authorize in first message
      ws1.send(JSON.stringify(tine20Auth1));
    });

    ws2.on('open', () => {
      logD('ws2 client: websocket connection is open');

      // Authorize in first message
      ws2.send(JSON.stringify(tine20Auth1));
    });

    ws3.on('open', () => {
      logD('ws3 client: websocket connection is open');

      // Authorize in first message
      ws3.send(JSON.stringify(tine20Auth2));
    });

    ws4.on('open', () => {
      logD('ws4 client: websocket connection is open');

      // Authorize in first message
      ws4.send(JSON.stringify(tine20Auth2));
    });

    ws5.on('open', () => {
      logD('ws5 client: websocket connection is open');

      // Authorize in first message
      ws5.send(JSON.stringify(tine20Auth3));
    });

    ws6.on('open', () => {
      logD('ws6 client: websocket connection is open');

      // Authorize in first message
      ws6.send(JSON.stringify(tine20Auth3));
    });


    ws1.on('message', (message) => {
      logD(`ws1 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage1 = message.toString();
        ws1.close();
      }
    });

    ws2.on('message', (message) => {
      logD(`ws2 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage2 = message.toString();
        ws2.close();
      }
    });

    ws3.on('message', (message) => {
      logD(`ws3 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage3 = message.toString();
        ws3.close();
      }
    });

    ws4.on('message', (message) => {
      logD(`ws4 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage4 = message.toString();
        ws4.close();
      }
    });

    ws5.on('message', (message) => {
      logD(`ws5 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage5 = message.toString();
        ws5.close();
      }
    });

    ws6.on('message', (message) => {
      logD(`ws6 client: received: ${message.toString()}`);
      if (message.toString() != 'AUTHORIZED') {
        receivedWsMessage6 = message.toString();
        ws6.close();
      }
    });


    await new Promise((resolve, reject) => {
      setTimeout(() => {
        ws2.close();
        ws4.close();
        ws6.close();
        resolve();
      }, beforeRedisPublishTimeout);
    });


    await new Promise((resolve, reject) => {
      setTimeout(() => {
        redisMessage = 'Broadcast to all tenant 1 clients!';
        publisher.publish(`tenant1.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant1.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        redisMessage = 'Broadcast to all tenant 2 clients!';
        publisher.publish(`tenant2.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant2.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        redisMessage = 'Broadcast to all tenant 3 clients!';
        publisher.publish(`tenant3.my-domain.test:${process.env.REDIS_CHANNEL}`, redisMessage, () => {
          logD(`publisher: published message on channel "tenant3.my-domain.test:${process.env.REDIS_CHANNEL}": "${redisMessage}"`);
        });
        resolve();
      }, redisPublishTimeout);
    });


    await new Promise((resolve, reject) => {
      setTimeout(() => {
        expect(receivedWsMessage1).toBe(expectedWsMessage1);
        expect(receivedWsMessage2).toBe('');
        expect(receivedWsMessage3).toBe(expectedWsMessage2);
        expect(receivedWsMessage4).toBe('');
        expect(receivedWsMessage5).toBe(expectedWsMessage3);
        expect(receivedWsMessage6).toBe('');
        resolve();
      }, websocketMessageTimeout);
    });

  });


}

module.exports = testMain;

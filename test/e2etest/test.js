const path = require('path');
global.__base = path.resolve(__dirname + '../../..') + '/';

require('dotenv').config();

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Test;

const fetch = require('node-fetch');

const Broadcasthub = require(`${__base}src/Broadcasthub.js`);
const publisher = require(`${__base}test/Util/RedisPublisher.js`);

if (process.env.TEST_E2E_WS_URL === undefined || process.env.TEST_E2E_WS_URL == '') {
  console.error('Missing value for var "TEST_INTEGRATION_WS_URL from .env file');
  process.exit(1);
}

process.env.TEST_WS_URL = process.env.TEST_E2E_WS_URL;


afterAll(() => {
  publisher.quit();
});


describe('The Tine 2.0 broadcasthub is running: broadcasthub websocket server is running, Redis is available, broadcasthub Redis client subscribed to the broadcasthub channel and the Tine 2.0 JSON API is available.', () => {

  // process.env.AUTH_TIMEOUT for Broadcasthub cannot be overridden here
  // because Broadcasthub is started indenpendently from the tests

  // So:
  // process.env.AUTH_TIMEOUT < websocketMessageTimeoutFailingAuth < Jest Timeout

  var websocketMessageTimeout = 1000;
  const websocketMessageTimeoutFailingAuth = parseInt(process.env.AUTH_TIMEOUT) + 100;

  jest.setTimeout(websocketMessageTimeoutFailingAuth + 100);

  require(`${__base}test/tests/test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth);


  test('Checking if tine API is available on test domains - on local machines with one tine docker instance on 127.0.0.1 you just need to add /etc/hosts entries for the test domains: 127.0.0.1 <testdomain>', async () => {
    var response = await fetch('http://tenant1.my-domain.test:4000');
    expect(response.status).toBe(200);
    var response = await fetch('http://tenant2.my-domain.test:4000');
    expect(response.status).toBe(200);
    var response = await fetch('http://tenant3.my-domain.test:4000');
    expect(response.status).toBe(200);
  });

  websocketMessageTimeout = 2000;
  const redisPublishTimeout = 1500;
  const beforeRedisPublishTimeout = 800;

  require(`${__base}test/tests/test-multitenancy.test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth, redisPublishTimeout, beforeRedisPublishTimeout);

});

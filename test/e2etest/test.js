const path = require('path');
global.__base = path.resolve(__dirname + '../../..') + '/';

require('dotenv').config();

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Test;

const Broadcasthub = require(`${__base}src/Broadcasthub.js`);
const tine20AuthToken = require(`${__base}test/Util/Tine20AuthToken`);
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

  const websocketMessageTimeout = 1000;
  const websocketMessageTimeoutFailingAuth = parseInt(process.env.AUTH_TIMEOUT) + 100;

  jest.setTimeout(websocketMessageTimeoutFailingAuth + 100);

  require(`${__base}test/tests/test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth);

});

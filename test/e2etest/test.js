/*
Jest test suite for e2e tests of the Tine 2.0 Broadcasthub

TZ has to be set to UTC as environment variable on jest invocation, see package.json.

In order to test the Broadcasthub in single tenancy and in multiple tenanacy mode two separate test runs are necessary.

First run: Set ENABLE_MULTITENANCY_MODE to false in .env. Run e2etest. Single tenancy mode is tested.

Second run: Set ENABLE_MULTITENANCY_MODE to true in .env. Run e2etest. Multiple tenancy mode is tested.
*/

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

  if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
    require(`${__base}test/tests/single-tenancy-mode-base.test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth);
  }

  if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {
    require(`${__base}test/tests/multi-tenancy-mode-single-tenant-base.test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth);

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

    require(`${__base}test/tests/multi-tenancy-mode-multiple-tenants.test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth, redisPublishTimeout, beforeRedisPublishTimeout);
  }

});

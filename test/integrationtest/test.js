const path = require('path');
global.__base = path.resolve(__dirname + '../../..') + '/';

require('dotenv').config();

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Debug;

const fetchMock = require('node-fetch');

const Broadcasthub = require(`${__base}src/Broadcasthub.js`);
const tine20Auth = require(`${__base}test/Util/Tine20Auth`);
const publisher = require(`${__base}test/Util/RedisPublisher.js`);

if (process.env.TEST_INTEGRATION_WS_URL === undefined || process.env.TEST_INTEGRATION_WS_URL == '') {
  console.error('Missing value for var "TEST_INTEGRATION_WS_URL from .env file');
  process.exit(1);
}

process.env.TEST_WS_URL = process.env.TEST_INTEGRATION_WS_URL;


beforeAll(() => {

  // -----------------------------
  // Setup fetch-mock-jest - START

  // ATTENTION! All regex special characters have to be escaped twice if they should be treated as
  // non special characters! Special characters from within variable values seem not to be effected?
  // When using RegExp the complete URL including query string has to be specified.
  // Whereas plain string non regexp url 'http://localhost:4000/index.php' works without query string.
  const regex = new RegExp(`^(http:\\/\\/localhost:4000\\/index.php\\?requestType=JSON)|(http:\\/\\/tenant(1|2|3).my-domain.test:4000\\/index.php\\?requestType=JSON)$`);

  const matchObject = {
    url: regex,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {
      requestType: "JSON"
    }
  };

  const expectedBody = {
    jsonrpc: "2.0",
    id: "id",
    method: "Tinebase.checkAuthToken",
    params: {
      token: tine20Auth.token,
      channel: "broadcasthub"
    }
  };

  const responseAuthSuccess = {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      result: {
        id: "longlongid",
        auth_token: "longlongtoken",
        account_id: "bed9c7716801ba7433b8bffba0c55b0f20923185",
        valid_until: "2022-07-13 15:39:26",
        channels: ["broadcasthub"]
      },
      id: "id",
      jsonrpc: "2.0"
    }
  };

  const responseAuthFail = {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      error: {
        code: -32000,
        message: "auth token not valid",
        data: {
          message:"auth token not valid",
          code:403,
          appName: "Tinebase",
          title: "Exception ({0})",
          trace: [
            {}
          ]
        }
      },
      id:"id",
      jsonrpc:"2.0"
    }
  };

  fetchMock.post(matchObject, (url, options) => {

    logD(`fetchMock Tine 2.0 API - request url: ${url}`);
    logD(`fetchMock Tine 2.0 API - request options: ${JSON.stringify(options)}`);

    const requestBody = JSON.parse(options.body);

    if (requestBody.method == expectedBody.method &&
        requestBody.params.token == expectedBody.params.token &&
        requestBody.params.channel == expectedBody.params.channel
    ) {

      logD(`fetchMock Tine 2.0 API - response: ${JSON.stringify(responseAuthSuccess)}`);
      return responseAuthSuccess;

    } else {
      logD(`fetchMock Tine 2.0 API - response: ${JSON.stringify(responseAuthFail)}`);
      return responseAuthFail;
    }
  });

  // Setup fetch-mock-jest - END
  // ---------------------------

  Broadcasthub.start();

});


afterAll(() => {
  publisher.quit();
  Broadcasthub.stop();
});


describe('The Tine 2.0 broadcasthub is running: broadcasthub websocket server is running, Redis is available (mock), broadcasthub Redis client subscribed to the broadcasthub channel and the Tine 2.0 JSON API is available (mock).', () => {

  // Set AUTH_TIMEOUT for tests as low as possible
  // This is only possible in integrationtest where Broadcasthub is started
  // within the tests
  process.env.AUTH_TIMEOUT = 100;

  const websocketMessageTimeout = 500;
  const websocketMessageTimeoutFailingAuth = websocketMessageTimeout;

  // Jest default timeout for a test is 5000 ms.

  require(`${__base}test/tests/test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth);

  const redisPublishTimeout = websocketMessageTimeout / 2; // 250
  const beforeRedisPublisTimeout = redisPublishTimeout / 2; // 125
  require(`${__base}test/tests/test-multitenancy.test.js`)(websocketMessageTimeout, websocketMessageTimeoutFailingAuth, redisPublishTimeout, beforeRedisPublisTimeout);

});

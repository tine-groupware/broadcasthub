const fetch = require('node-fetch');
const url = require('url');

const Logger = require(`${__base}src/Logger.js`);
//const logI = Logger.Info;
const logE = Logger.Error;
const logD = Logger.Tine20AuthTokenChecker; // Debug

const moduleName = 'Tine20AuthTokenChecker';


/**
 * Checks if authMessage holds a valid Tine 2.0 channel token.
 *
 * Each websocket clients sends an authorization message as first message to the
 * Broadcasthub websocket server. Depending on the tenancy mode this
 * authorization message is passed to an other function for executing the check.
 *
 * @param string|JSON autMessage  In single tenancy mode authMessage is supposed to be string holding the Tine 2.0 channel token. In multiple tenancy mode authMessage is supposed to be JSON with fields token and jsonApiUrl. Field token is string and holds the Tine 2.0 channel token. Field jsonApiUrl is string and holds the URL to the clients Tine 2.0 JSON API.
 *
 * @return object result  result.valid is true for valid token and false for invalid token. In multiple tenancy mode additonal property result.domain holds the domain from the URL in authMessage.jsonApiUrl
 *
 */
const checkAuthToken = async function checkAuthToken(authMessage = null) {
  const functionName = 'checkAuthToken';
  logD(`${functionName} - authMessage: ${authMessage}`);

  if (process.env.ENABLE_MULTITENANCY_MODE === 'false') {
    return _checkAuthTokenInSingleTenancyMode(authMessage);
  }

  if (process.env.ENABLE_MULTITENANCY_MODE === 'true') {
    return _checkAuthTokenInMultiTenancyMode(authMessage);
  }

}


/**
 * Checks if authMessage.token is a valid Tine 2.0 channel token by request to
 * Tine 2.0 JSON API.
 *
 * This function is used in single tenancy mode where all websocket clients
 * belong to one single Tine 2.0 Server instance. Each client sends the token as
 * first message to the Broadcasthub websocket server. The Tine 2.0 JSON API URL
 * is the same for all clients. It has to be set as environment variable
 * TINE20_JSON_API_URL in the Broadcasthub.
 *
 * @param JSON authMessage  A JSON holding the field token. Field token is string and holds the Tine 2.0 channel token.
 *
 * @return object result  result.valid is true for valid token and false for invalid token
 *
 */
const _checkAuthTokenInSingleTenancyMode = async function _checkAuthTokenInSingleTenancyMode(authMessage = null) {
  const functionName = 'checkAuthTokenInSingleTenancyMode';
  logD(`${functionName} - authMessage: ${authMessage}`);
  var result = {
    valid: false,
  }

  if (authMessage === null || authMessage == '') {
    logD(`${functionName} - token is null or empty string in creds`);
    return result;
  }

  try {
    creds = JSON.parse(authMessage);
  } catch (e) {
    logE(e);
    logD(`${functionName} - Parsing creds as JSON failed`);
    return result;
  }

  if (creds.token === undefined || creds.token === '') {
    logD(`${functionName} - token is not defined or empty string in creds`);
    return result;
  }

  // authMessage is supposed to hold the token as string
  result.valid = await _checkAuthToken(`${process.env.TINE20_JSON_API_URL}/index.php?requestType=JSON`, creds.token);

  return result;
}


/**
 * Checks if authMessage.token is a valid Tine 2.0 channel token by request to
 * Tine 2.0 JSON API.
 *
 * This function is used in multiple tenancy mode where multiple Tine 2.0 Server
 * instances and their websocket clients are supported. Each client sends the
 * Tine 2.0 channel token along with the Tine 2.0 JSON API URL of its Tine 2.0
 * Server instance as first message to the Broadcasthub websocket server.
 *
 * @param JSON authMessage  A JSON holding the fields token and jsonApiUrl. Field token is string and holds the Tine 2.0 channel token. Field jsonApiUrl is string and holds the URL to the clients Tine 2.0 JSON API.
 *
 * @return object result  result.valid is true for valid token and false for invalid token. result.domain holds the domain from the URL in authMessage.jsonApiUrl
 *
 */
const _checkAuthTokenInMultiTenancyMode = async function _checkAuthTokenInMultiTenancyMode(authMessage = null) {
  const functionName = 'checkAuthTokenInMultiTenancyMode';
  logD(`${functionName} - authMessage: ${authMessage}`);
  var creds;
  var regex;
  var authUrl;
  var result = {
    valid: false,
  }


  if (authMessage === null || authMessage == '') {
    logD(`${functionName} - token is null or empty string in creds`);
    return result;
  }

  try {
    creds = JSON.parse(authMessage);
  } catch (e) {
    logE(e);
    logD(`${functionName} - Parsing creds as JSON failed`);
    return result;
  }

  if (creds.jsonApiUrl === undefined || creds.jsonApiUrl === '' ||
      creds.token === undefined || creds.token === ''
    ) {
    logD(`${functionName} - jsonApiUrl or token is not defined or empty string in creds`);
    return result;
  }

  regex = new RegExp(`^${process.env.TINE20_JSON_API_URL_PATTERN}$`);
  if (! creds.jsonApiUrl.match(regex)) {
    logD(`${functionName} - jsonApiUrl does not match process.env.TINE20_JSON_API_URL_PATTERN`);
    return result;
  }

  try {
    authUrl = new URL(`${creds.jsonApiUrl}/index.php?requestType=JSON`);
  } catch (e) {
    logE(e);
    logD(`${functionName} - Parsing creds.jsonApiUrl as URL failed`);
    return result;
  }

  result.domain = authUrl.hostname;

  result.valid = await _checkAuthToken(authUrl, creds.token);

  return result;
}


const _checkAuthToken = async function _checkAuthToken(jsonApiUrl = null, token = null) {
  const functionName = '_checkAuthToken';
  logD(`${functionName} - jsonApiUrl: ${jsonApiUrl}`);
  logD(`${functionName} - token: ${token}`);

  if (jsonApiUrl === null || jsonApiUrl === '' || token === null || token === '') {
    return false;
  }

  var body = {
    jsonrpc: "2.0",
    id: "id",
    method: "Tinebase.checkAuthToken",
    params: {
      token: token,
      channel: process.env.REDIS_CHANNEL
    }
  };

  try {
    res = await fetch(jsonApiUrl, {
            method: 'post',
            body:    JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          });

    responseBody = await res.json();

    logD(`${functionName} - responseBody: ${JSON.stringify(responseBody)}`);

    /*
    VALID:
    {
      result: {
        id: 'longlongid',
        auth_token: 'longlongtoken',
        account_id: 'b9913af0f0a571f465b4d91a1da90be719080c66',
        valid_until: '2022-08-18 20:46:02',
        channels: [ 'broadcasthub' ]
      },
      id: 'id',
      jsonrpc: '2.0'
    }

    INVALID:
    {
      error: {
        code: -32000,
        message: 'auth token not valid',
        data: {
          message: 'auth token not valid',
          code: 403,
          appName: 'Tinebase',
          title: 'Exception ({0})',
          trace: [Array]
        }
      },
      id: 'id',
      jsonrpc: '2.0'
    }
    */

    if (responseBody.error === undefined && responseBody.result !== undefined && responseBody.result.auth_token === token) {
      logD(`${functionName} - Result: true`);
      return true;
    } else {
      logD(`${functionName} - Result: false`);
      return false;
    }

  } catch (e) {
    logE(e);
    logD(`${functionName} - Result: false`);
    return false;
  }
}

module.exports = {
  checkAuthToken,
}

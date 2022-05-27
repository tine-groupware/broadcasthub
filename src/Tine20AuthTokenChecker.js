const fetch = require('node-fetch');
const url = require('url');

const Logger = require(`${__base}src/Logger.js`);
//const logI = Logger.Info;
const logE = Logger.Error;
const logD = Logger.Tine20AuthTokenChecker; // Debug

const moduleName = 'Tine20AuthTokenChecker';


const checkAuthToken = async function checkAuthToken(authMessage = null) {
  const functionName = 'checkAuthToken';
  logD(`${functionName} - authMessage: ${authMessage}`);
  var creds;
  var regex;
  var authUrl;
  var result = {
    valid: false,
  }


  if (authMessage === null) {
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

  var body = {
    jsonrpc: "2.0",
    id: "id",
    method: "Tinebase.checkAuthToken",
    params: {
      token: creds.token,
      channel: process.env.REDIS_CHANNEL
    }
  };

  try {
    res = await fetch(authUrl.href, {
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

    if (responseBody.error === undefined && responseBody.result !== undefined && responseBody.result.auth_token === creds.token) {
      logD(`${functionName} - Result: true`);
      result.valid = true;
      return result;
    } else {
      logD(`${functionName} - Result: false`);
      return result;
    }

  } catch (e) {
    logE(e);
    logD(`${functionName} - Result: false`);
    return result;
  }
}


module.exports = {
  checkAuthToken,
}

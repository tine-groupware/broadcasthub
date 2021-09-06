const fetch = require('node-fetch');

const Logger = require(`${__base}src/Logger.js`);
//const logI = Logger.Info;
const logE = Logger.Error;
const logD = Logger.Tine20AuthTokenChecker; // Debug

const moduleName = 'Tine20AuthTokenChecker';


const checkAuthToken = async function checkAuthToken(token = null) {
  const functionName = 'checkAuthToken';
  logD(`${functionName} - token: ${token}`);

  if (token === null) {
    return false;
  }

  var body = {
    jsonrpc: "2.0",
    id: "id",
    method: "Tinebase.checkAuthToken",
    params: {
      token: token,
      channel: process.env.TINE20_BROADCAST_CHANNEL
    }
  };

  try {
    res = await fetch(process.env.TINE20_JSON_API_URL, {
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

var tine20Auth = null;

if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
  tine20Auth = {
    token: 'longlongtoken'
  };
}

if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {
  tine20Auth = {
    token: 'longlongtoken',
    jsonApiUrl: 'http://localhost:4000'
  };
}

module.exports = tine20Auth;

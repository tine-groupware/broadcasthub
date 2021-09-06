const fs = require('fs');
const path = require('path');
const debug = require('debug');

const Tine20Broadcasthub = require('debug')('Tine20Broadcasthub');
// Namespaces ending in "*" should log even when there was no DEBUG env var
// set on node invocation.
// Does not work (?)
// Using manual debug.enable() ...
const Info = Tine20Broadcasthub.extend('Info:*');
const Error = Tine20Broadcasthub.extend('Error:*');

// Debug
const App = Tine20Broadcasthub.extend('App');
const Broadcasthub = Tine20Broadcasthub.extend('Broadcasthub');
const Tine20AuthTokenChecker = Tine20Broadcasthub.extend('Tine20AuthTokenChecker');


// Enable default logging when DEBUG env var is not set
// and debug default logging is activated in env file.
// "*" suffix does not work to force logs without DEBUG env var being set (?)
if (process.env.DEBUG_DEFAULT_LOGGING === 'on' && process.env.DEBUG === undefined) {
  debug.enable('Tine20Broadcasthub:Info:*');
  debug.enable('Tine20Broadcasthub:Error:*');
}

// Enable logging to file depending on vars in .env file and DEBUG env var
if (process.env.DEBUG !== undefined &&
    process.env.DEBUG !== '' &&
    process.env.DEBUG_LOG_TO_FILE === 'on' &&
    process.env.DEBUG_LOG_FILE !== undefined &&
    process.env.DEBUG_LOG_FILE !== '') {

  var logFile;

  // Handle relative and absolute path in DEBUG_LOG_FILE
  if (process.env.DEBUG_LOG_FILE.startsWith('./') || process.env.DEBUG_LOG_FILE.startsWith('../')) {
    logFile = path.resolve(`${__dirname}${process.env.DEBUG_LOG_FILE}`);
  } else {
    logFile = process.env.DEBUG_LOG_FILE;
  }

  const output = fs.createWriteStream(logFile, {flags : 'a'});

  output.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  const logger = new console.Console(output);
  debug.log = logger.log.bind(logger);
}


module.exports = {
  Tine20Broadcasthub,
  Info,
  Error,
  App,
  Broadcasthub,
  Tine20AuthTokenChecker,
}

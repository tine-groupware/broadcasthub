const Logger = require('debug')('Test');
const Error = Logger.extend('Error:*');
const Debug = Logger.extend('Debug');

// Deactivate logging to file for tests
process.env.DEBUG_LOG_TO_FILE = "off";


module.exports = {
  Logger,
  Error,
  Debug,
}

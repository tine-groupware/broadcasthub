process.env.TZ = 'UTC'; // Run the app in UTC!
global.__base = `${__dirname}/`;

require('dotenv').config();

const Logger = require(`${__base}src/Logger.js`);
const logI = Logger.Info;
//const logE = Logger.Error;
//const logD = Logger.App; // Debug

const Broadcasthub = require(`${__base}src/Broadcasthub.js`);

logI('app - Starting the Tine 2.0 Broadcasthub...');

Broadcasthub.start();

logI('app - Tine 2.0 Broadcasthub is now supposed to be running.');

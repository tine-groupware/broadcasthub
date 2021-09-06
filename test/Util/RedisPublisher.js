const redis = require('redis');

const Logger = require(`${__base}test/Util/Logger.js`);
const logE = Logger.Error;
const logD = Logger.Debug;


const redisOptions = {
 url: process.env.REDIS_URL,
};

publisher = redis.createClient(redisOptions);

publisher.on('connect', () => {
  logD('Redis client connected to Redis.');
});

publisher.on('end', () => {
  logD('Redis client closed connection to Redis.');
});

publisher.on('error', (error) => {
 logE(error);
});


module.exports = publisher;

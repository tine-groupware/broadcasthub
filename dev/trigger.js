require('dotenv').config();
const redis = require('redis');

var channel = null;

if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
  channel = process.env.REDIS_CHANNEL;
}

if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {
  channel = `localhost:${process.env.REDIS_CHANNEL}`;
}

const redisOptions = {
  url: 'redis://localhost:7379', // Use fixed string to prevent something going wrong on production
};

const publisher = redis.createClient(redisOptions);

publisher.on('error', (error) => {
  console.error(error);
});

// Simulates the Tine 2.0 Server publishing a message into the Redis channel
// the Broadcasthub listens to
var message = 'Broadcast to all clients!';
publisher.publish(channel, message, () => {
  console.log('channel: ' + channel);
  console.log('published: ' + message);

  // Simulates publishing an other message into an other Redis channel the
  // Broadcasthub does not listen to
  // Is not supposed to be received by the Tine 2.0 Broadcasthub
  channel = 'another_channel';
  message = 'A different value';
  publisher.publish(channel, message, () => {
    console.log('channel: ' + channel);
    console.log('published: ' + message);
    process.exit();
  });
});

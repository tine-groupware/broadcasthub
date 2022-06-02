require('dotenv').config();
const wslib = require('ws');

var tine20AuthString = null;

if (process.env.ENABLE_MULTITENANCY_MODE == 'false') {
  tine20AuthString = 'longlongtoken';
}

if (process.env.ENABLE_MULTITENANCY_MODE == 'true') {
  const tine20Auth = {
    token: 'longlongtoken',
    jsonApiUrl: 'http://localhost:4000'
  };

  tine20AuthString = JSON.stringify(tine20Auth);
}


// Client 1 connects successfully to Broadcasthub (valid auth token)
// Use fixed string for websocket URL to prevent something going wrong on production
const ws1 = new wslib.WebSocket('ws://localhost:8080');

ws1.on('open', () => {
  console.log('client 1 connected to server');
  // Send authorization token as first message
  ws1.send(tine20AuthString);
});

ws1.on('message', (message) => {
  console.log('client 1 received: %s', message);
});

ws1.on('close', () => {
  console.log('client 1: server closed connection')
});

ws1.on('unexpected-response', (request, response) => {
  console.log(`client 1: received unexpected response. Status code: ${response.statusCode}. Status message: ${response.statusMessage}`)
});

ws1.on('error', (err) => {
  console.log('client 1: connection to server failed');
  console.log(err);
});


// Client 2 does not connect to Broadcasthub, i.e. Broadcasthub closes the connection
// immediatley (no first message with token)
// Use fixed string for websocket URL to prevent something going wrong on production
const ws2 = new wslib.WebSocket('ws://localhost:8080');

ws2.on('open', () => {
  console.log('client 2 connected to server');
});

ws2.on('message', (message) => {
  console.log('client 2 received: %s', message);
});

ws2.on('close', () => {
  console.log('client 2: server closed connection')
});

ws2.on('unexpected-response', (request, response) => {
  console.log(`client 2: received unexpected response. Status code: ${response.statusCode}. Status message: ${response.statusMessage}`)
});

ws2.on('error', (err) => {
  console.log('client 2: connection to server failed');
  console.log(err);
});

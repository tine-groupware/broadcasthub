# tine Broadcasthub #

## What is this for? ##
The tine Broadcasthub was built to deliver status messages about files and containers from the tine Server to the tine Client in the browser. One use case would be to mark files in the tine file manager that are currently opened in the tine OnlyOffice integration by other users. But in general the Broadcasthub just pipes through any message it receives, it is up to the tine Server what to send.

The tine Server publishes messages to a Redis channel. The tine Broadcasthub listens to this channel. Furthermore the tine Broadcasthub is a websocket server. tine clients in the browsers can connect to the tine Broadcasthub as websocket clients. When the tine Broadcasthub receives a message from the Redis channel, then it sends this message to all connected websocket clients.

In order to publish status messages about files and containers the tine Server could send messages in a JSON format for example, eventually with fields for record ID, container ID, model name and HTTP verb (create, update, delete) that was used at last on the resource. For the tine Broadcasthub it does not matter, what string is published to the Redis channel, it just sends all string messages received from the Redis channel to the corresponding tine clients.

The tine Broadcasthub is a NodeJS application.


## Tenancy modes ##

### Single tenancy mode ###
Set `ENABLE_MULTITENANCY_MODE` to `false` to enable single tenancy mode.

In single tenancy mode the tine Broadcasthub routes Redis messages from one single tine Server instance to all websocket clients associated to that instance. The tine Server instance publishes its messages to the Redis instance the Broadcasthub is also connected to. The Redis channel the tine Broadcasthub is listening to and the tine Server instance is publishing to has to be set in Broadcasthub env `REDIS_CHANNEL`.

In order to connect to the tine Broadcasthub websocket server, the tine Cient in the browser has to send a JSON authentication string as the first message within a configureable time to the tine Broadcasthub websocket server. The JSON has to include a valid tine auth token for the tine broadcasthub channel:

        // Scheme
        {
            token: <auth_token>
        }

        // Example:
        {
            token: longlongtoken
        }

The tine Broadcasthub verifies the token with a request to the tine server JSON API method `Tinebase.checkAuthToken` using the URL set in Broadcasthub env `TINE20_JSON_API_URL`. If the token is valid, the tine Broadcasthub keeps the connection to the websocket client and sends 'AUHTORIZED' as message. Otherwise the tine Broadcasthub sends 'UNAUTHORIZED' as message and closes the websocket connection. Clients with valid authorization are tagged with a property and only clients with that property receive the tine Server broadcast messages.


### Multiple tenancy mode ###
Set `ENABLE_MULTITENANCY_MODE` to `true` to enable multiple tenancy mode.

The tine Broadcasthub can handle multiple tenants. It routes Redis messages from multiple tine Server instances to all websocket clients associated to these instances. Each websocket client belongs to one tine server instance only. The tine Server instances have to publish their messages to one shared Redis instance the Broadcasthub is also connected to. Each tine Server has to prefix its channel with its domain name. All tine Server instances have to use the same channel name after the prefix (Broadcasthub env `REDIS_CHANNEL`):

        // tine Server URL
        http://tenant1.my-domain.test

        // Domain
        tenant1.my-domain.test

        // Prefixed Redis channel for that instance
        // when env REDIS_CHANNEL = broadcasthub
        tenant1.my-domain.test:broadcasthub

In order to connect to the tine Broadcasthub websocket server, the tine Client in the browser has to send a JSON authentication string as the first message within a configureable time (env `AUTH_TIMEOUT`) to the tine Broadcasthub websocket server. The JSON has to include a valid tine auth token for the tine broadcasthub channel and the URL to its tine Server JSON API:

        // Scheme
        {
            token: <auth_token>,
            jsonAPIUrl: <url_with_protocol_domain_port>
        }

        // Example:
        {
            token: longlongtoken,
            jsonAPIUrl: http://tenant1.my-domain.test
        }

The URL sent in the JSON has to match the pattern in the environment variable `TINE20_JSON_API_URL_PATTERN`. In case of non matching URLs the authentication is declined, clients receive 'UNAUTHORIZED' message and websocket connection is closed. This is a security measure to restrict communication of the Broadcasthub to a known set of tine Server instances.

As next step the tine Broadcasthub verifies the token with a request to the tine server JSON API method `Tinebase.checkAuthToken` using the URL from the JSON. If the token is valid, the tine Broadcasthub keeps the connection to the websocket client and sends 'AUTHORIZED' as message. Otherwise the tine Broadcasthub sends 'UNAUTHORIZED' as message and closes the websocket connection. Clients with valid authorization are tagged with an auth property and only clients with that auth property receive the tine Server broadcast messages.

Each authenticated client is also tagged with a domain property. The domain is extracted from the URL sent in the first message. For new domains the Broadcasthub subscribes to a Redis channel prefixed with that domain. All Redis messages from that channel prefixed with the domain are sent to all websocket clients tagged with that domain.

When there is no client anymore associated to a domain, the Broadcasthub stops listening to the Redis channel prefixed with that domain. When a new websocket client from that domain connects the Broadcasthub starts listening to the channel again and pipes through the messages to the client.


## Configuration of the tine Broadcasthub ##
The tine Broadcasthub uses `dotenv` (https://www.npmjs.com/package/dotenv) for configuration. See file `.env-dist` for available variables. The file can be copied to `.env` and the variable values can be adapted as needed.

`REDIS_URL`: URL to the Redis server the tine Broadcast will connect to. All tine Server instances have publish messages to this common Redis server.

`REDIS_CHANNEL`: The name of the channel the tine auth token sent by the websocket client is valid for in the tine Server instance. Each tine Server publishes to that Redis channel. The Broadcasthub listens to that Redis channel. For multi tenancy mode: In order to distinguish the messages of the different tine Server instances each tine Server instance prefixes this Redis channel name with its domain and publishs messages to the prefixed Redis channel. The Broadcasthub listens to the different prefixed Redis channels: `<domain_prefix>:<broadcasthub_channel>`. `REDIS_CHANNEL` has to be set to `<broadcasthub_channel>`. The Broadcasthub uses the domain from the field `jsonAPIUrl` from the first authentication message of the client as domain prefix for that client.

`AUTH_TIMEOUT`: The time in ms the tine Broadcasthub waits for the first message of a client. The Broadcasthub expects a tine auth token in the first message of the client. If no message is sent within the specified time or if the token is not valid the tine Broadcasthub closes the connection to the client.

`WS_PORT`: The port the tine Broadcasthub will expose the websocket server to

`ENABLE_MULTITENANCY_MODE`: When set to `false`, the tine Broadcasthub runs in single tenancy mode. When set to true, the tine Broadcasthub runs in multiple tenancy mode. `ENABLE_MULTITENANCY_MODE` has either to be set to true or to false

`TINE20_JSON_API_URL`: The URL of the tine JSON API without path and querystring. This var has to be set when `ENABLE_MULTITENANCY_MODE` is `false`

`TINE20_JSON_API_URL_PATTERN`: The pattern each tine JSON API URL has to match against. This is a security measure to restrict communication of the Broadcasthub to a known set of tine Server instances. This var has to be set when `ENABLE_MULTITENANCY_MODE` is `true`

`DEBUG`: The package `debug` (https://www.npmjs.com/package/debug) is used for logging. The following namespaces are available:

    Tine20Broadcasthub
      Info:*
      Error:*
      App (currently not used)
      Broadcasthub
      Tine20AuthTokenChecker

`DEBUG_DEFAULT_LOGGING`: Value "on" enables logging of all loggers in the `debug` namespaces `Tine20Broadcasthub:Info:*` and `Tine20Broadcasthub:Error:*`, when `DEBUG` is not set. All other values or removing this key deactivate the default logging.

`DEBUG_LOG_TO_FILE`: Value "on" enables logging into a file instead of `stderr`. This only takes effect if the environment variables `DEBUG` or `DEBUG_DEFAULT_LOGGING` as well as `DEBUG_LOG_FILE` are set.

`DEBUG_LOG_FILE`: Absolute path or path relative to `src/Logger.js` of the log file the tine Broadcasthub should log to. The file is created if it does not exist. The logger appends the logs to an existing file.

`TEST_INTEGRATION_WS_URL`: URL to the websocket server (including protocol, domain, path, port etc.) for the integration tests.

`TEST_E2E_WS_URL`: URL to the websocket server (including protocol, domain, path etc.) for the end to end tests.


## Configuration in tine ##
@TODO: @tine team: Please verify the information in this section.

In order to use the tine Broadcasthub, it has to be activated and configured in the tine configuration. Values in Broadcasthub `.env` must match the values in the tine configuration. See `BROADCASTHUB` constants in `Tinebase/Config.php`.

Broadcasthub `.env` key `REDIS_URL` must point to the same Redis instance like tine configuration key `BROADCASTHUB_REDIS_HOST` does.

Broadcasthub `.env` key `REDIS_CHANNEL` must have the same value like tine configuration key `BROADCASTHUB_PUBSUBNAME`.

Furthermore an AuthTokenChannel has to be configured in tine. The AuthTokenChannel channel name has to be same like the value of Broadcasthub `.env` key `REDIS_CHANNEL`. See `AUTH_TOKEN_CHANNELS` constant in `Tinebase/Config.php`.

By default Broadcasthub `.env` key `REDIS_CHANNEL` and tine configuration key `BROADCASTHUB_PUBSUBNAME` and tine `AUTH_TOKEN_CHANNELS` channel name are set to `broadcasthub`.

In order for a websocket client to connect to the Broadcasthub websocket server, it has to provide an auth token for the Broadcasthub channel (see section [Tenancy modes](#tenancy-modes)). The auth tokens for the broadcasthub channel are stored in tine table `auth_token`. For testing purposes auth tokens can be added by invoking the tine setup command `add_auth_token`.

The tine Broadcasthub is fully integrated into the tine docker setup, all necessary configurations in the Broadcasthub and in tine are taken care off. See README of the tine docker setup.

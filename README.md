# Tine 2.0 Broadcasthub #
[[_TOC_]]

## What is this for? ##
The Tine 2.0 Broadcasthub was built to deliver status messages about files and containers from the Tine 2.0 Server to the Tine 2.0 Client in the browser. One use case would be to mark files in the Tine 2.0 file manager that are currently opened in the Tine 2.0 OnlyOffice integration by other users. But in general the Broadcasthub just pipes through any message it receives, it is up to the Tine 2.0 Server what to send.

The Tine 2.0 Server publishes messages to a Redis channel. The Tine 2.0 Broadcasthub listens to this channel. Furthermore the Tine 2.0 Broadcasthub is a websocket server. Tine 2.0 clients in the browsers can connect to the Tine 2.0 Broadcasthub as websocket clients. When the Tine 2.0 Broadcasthub receives a message from the Redis channel, then it sends this message to all connected websocket clients.

In order to publish status messages about files and containers the Tine 2.0 Server could send messages in a JSON format for example, eventually with fields for record ID, container ID, model name and HTTP verb (create, update, delete) that was used at last on the resource. For the Tine 2.0 Broadcasthub it does not matter, what string is published to the Redis channel, it just sends all string messages received from the Redis channel to the corresponding Tine 2.0 clients.


### Single tenancy mode ###
Set `ENABLE_MULTITENANCY_MODE` to `false` to enable single tenancy mode.

In single tenancy mode the Tine 2.0 Broadcasthub routes Redis messages from one single Tine 2.0 Server instance to all websocket clients associated to that instance. The Tine 2.0 Server instance publishes its messages to the Redis instance the Broadcasthub is also connected to. The Redis channel the Tine 2.0 Broadcasthub is listening to and the Tine 2.0 Server instance is publishing to has to be set in Broadcasthub env `REDIS_CHANNEL`.

In order to connect to the Tine 2.0 Broadcasthub websocket server, the Tine 2.0 Cient in the browser has to send a valid Tine 2.0 auth token for the Tine 2.0 broadcasthub channel in the first message within a configureable time to the Tine 2.0 Broadcasthub websocket server:

        // Scheme
        <auth_token>

        // Example
        longlongtoken

The Tine 2.0 Broadcasthub verifies the token with a request to the Tine 2.0 server JSON API method `Tinebase.checkAuthToken` using the URL set in Broadcasthub env `TINE20_JSON_API_URL`. If the token is valid, the Tine 2.0 Broadcasthub keeps the connection to the websocket client and sends 'AUHTORIZED' as message. Otherwise the Tine 2.0 Broadcasthub sends 'UNAUTHORIZED' as message and closes the websocket connection. Clients with valid authorization are tagged with a property and only clients with that property receive the Tine 2.0 Server broadcast messages.


### Multiple tenancy mode ###
Set `ENABLE_MULTITENANCY_MODE` to `true` to enable multiple tenancy mode.

The Tine 2.0 Broadcasthub can handle multiple tenants. It routes Redis messages from multiple Tine 2.0 Server instances to all websocket clients associated to these instances. Each websocket client belongs to one Tine 2.0 server instance only. The Tine 2.0 Server instances have to publish their messages to one shared Redis instance the Broadcasthub is also connected to. Each Tine 2.0 Server has to prefix its channel with its domain name. All Tine 2.0 Server instances have to use the same channel name after the prefix (Broadcasthub env `REDIS_CHANNEL`):

        // Tine 2.0 Server URL
        http://tenant1.my-domain.test

        // Domain
        tenant1.my-domain.test

        // Prefixed Redis channel for that instance
        // when env REDIS_CHANNEL = broadcasthub
        tenant1.my-domain.test:broadcasthub

In order to connect to the Tine 2.0 Broadcasthub websocket server, the Tine 2.0 Client in the browser has to send a JSON authentication string as the first message within a configureable time (env `AUTH_TIMEOUT`) to the Tine 2.0 Broadcasthub websocket server. The JSON has to include a valid Tine 2.0 auth token for the Tine 2.0 broadcasthub channel and the URL to its Tine 2.0 Server JSON API:

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

The URL sent in the JSON has to match the pattern in the environment variable `TINE20_JSON_API_URL_PATTERN`. In case of non matching URLs the authentication is declined, clients receive 'UNAUTHORIZED' message and websocket connection is closed. This is a security measure to restrict communication of the Broadcasthub to a known set of Tine 2.0 Server instances.

As next step the Tine 2.0 Broadcasthub verifies the token with a request to the Tine 2.0 server JSON API method `Tinebase.checkAuthToken` using the URL from the JSON. If the token is valid, the Tine 2.0 Broadcasthub keeps the connection to the websocket client and sends 'AUTHORIZED' as message. Otherwise the Tine 2.0 Broadcasthub sends 'UNAUTHORIZED' as message and closes the websocket connection. Clients with valid authorization are tagged with an auth property and only clients with that auth property receive the Tine 2.0 Server broadcast messages.

Each authenticated client is also tagged with a domain property. The domain is extracted from the URL sent in the first message. For new domains the Broadcasthub subscribes to a Redis channel prefixed with that domain. All Redis messages from that channel prefixed with the domain are sent to all websocket clients tagged with that domain.

When there is no client anymore associated to a domain, the Broadcasthub stops listening to the Redis channel prefixed with that domain. When a new websocket client from that domain connects the Broadcasthub starts listening to the channel again and pipes through the messages to the client.


## Prerequisites to run the Tine 2.0 Broadcasthub ##
Initial development and test setup:

* Developed and tested on Kubuntu 20.04
* Tine 2.0 Server with Tine 2.0 JSON API
* Redis Server
* node with npm, developed and tested against lts/fermium: node v14.17.5 (npm v7.20.6). Upgraded and tested against lts/gallium v16.15.0 (npm v8.5.5).

The Broadcasthub is integrated into the `tine20/docker` setup.


## Installation of the Tine 2.0 Broadcasthub ##
The necessary npm packages are defined in the package.json and pinned to an exact version in the package-lock.json.

Production:

    git clone <tine20_broadcasthub_repo>
    cd <tine20_broadcasthub_repo>
    npm install --production
    # Make sure to set NODE_ENV=production (!)

Development and CI:

    git clone <tine20_broadcasthub_repo>
    cd <tine20_broadcasthub_repo>
    npm install
    # Make sure NODE_ENV is not set or is not "production"
    # development dependencies have to get installed


## Configuration of the Tine 2.0 Broadcasthub ##
The Tine 2.0 Broadcasthub uses `dotenv` (https://www.npmjs.com/package/dotenv) for configuration. See file `.env-dist` for available variables. The file can be copied to `.env` and the variable values can be adapted as needed.

`REDIS_URL`: URL to the Redis server the Tine 2.0 Broadcast will connect to. All Tine 2.0 Server instances have publish messages to this common Redis server.

`REDIS_CHANNEL`: The name of the channel the Tine 2.0 auth token sent by the websocket client is valid for in the Tine 2.0 Server instance. Each Tine 2.0 Server publishes to that Redis channel. The Broadcasthub listens to that Redis channel. In order to distinguish the messages of the different Tine 2.0 Server instances each Tine 2.0 Server instance prefixes this channel name with its domain and the Broadcasthub listens to the different prefixed channels.

`AUTH_TIMEOUT`: The time in ms the Tine 2.0 Broadcasthub waits for the first message of a client. The Broadcasthub expects a Tine 2.0 auth token in the first message of the client. If no message is sent within the specified time or if the token is not valid the Tine 2.0 Broadcasthub closes the connection to the client.

`WS_PORT`: The port the Tine 2.0 Broadcasthub will expose the websocket server to

`ENABLE_MULTITENANCY_MODE`: When set to `false`, the Tine 2.0 Broadcasthub runs in single tenancy mode. When set to true, the Tine 2.0 Broadcasthub runs in multiple tenancy mode. `ENABLE_MULTITENANCY_MODE` has either to be set to true or to false

`TINE20_JSON_API_URL`: The URL of the Tine 2.0 JSON API without path and querystring. This var has to be set when `ENABLE_MULTITENANCY_MODE` is `false`

`TINE20_JSON_API_URL_PATTERN`: The pattern each Tine 2.0 JSON API URL has to match against. This is a security measure to restrict communication of the Broadcasthub to a known set of Tine 2.0 Server instances. This var has to be set when `ENABLE_MULTITENANCY_MODE` is `true`

`DEBUG_DEFAULT_LOGGING`: Value "on" enables logging of all loggers in the `debug` namespaces `Tine20Broadcasthub:Info:*` and `Tine20Broadcasthub:Error:*`. All other values or removing this key deactivate the default logging.

`DEBUG_LOG_TO_FILE`: Value "on" enables logging into a file instead of `stderr`. This only takes effect if the environment variables `DEBUG` and `DEBUG_LOG_FILE` are set.

`DEBUG_LOG_FILE`: Absolute path or path relative to `src/Logger.js` of the log file the Tine 2.0 Broadcasthub should log to. The file is created if it does not exist. The logger appends the logs to an existing file.

`TEST_INTEGRATION_WS_URL`: URL to the websocket server (including protocol, domain, path, port etc.) for the integration tests.

`TEST_E2E_WS_URL`: URL to the websocket server (including protocol, domain, path etc.) for the end to end tests.


## Start and stop the Tine 2.0 Broadcasthub ##
Start:

    node app.js

Stop:

    Kill the node process, with strg+c for example; stop the container etc.


## Build and push production container image ##
* Make sure to tag the commit you want run the build for and to checkout that tag
* Make sure your local repository is clean
* Execute the integration and e2e tests locally and make sure everything is fine
* Push the tag into the remote repository
* Then run:

        sh build/docker-build-prod.sh
        sh build/docker-push-prod.sh

This will build the docker image based on the current source code status (gets copied into the image) and push the image into the Metaways Gitlab registry. The image will be tagged with the current GIT tag.

The Tine 2.0 docker setup depends on this container image.

The build scripts work fine when the GIT client uses a SSH key for authentication. The build scripts have not been tested with interactive username / password prompt.


## Tests ##
Jest (https://jestjs.io/) is used as test framework.


### Integration tests ###
Run `npm run-script integrationtest` to execute the integration tests. These tests work standalone with a Redis mock and a Tine 2.0 JSON API mock. The Tine 2.0 Broadcasthub is started at the beginning of the tests and shutdown at the end of the tests. The tests setup a Redis publisher to simulate the Tine 2.0 Server sending a message to the Redis channel. The tests also setup websocket clients that connect to the Tine 2.0 Broadcasthub websocket server. The tests verify that the websocket clients receive the data they should receive.


### End to end tests ###
Run `npm run-script e2etest` to execute the end to end tests. Broadcasthub env `ENABLE_MULTITENANCY_MODE` has to be set to `false` for testing single tenancy mode and in an other run to `true` for testing multi tennancy mode. These tests require an external Redis, an external Tine 2.0 JSON API and an external already running Tine 2.0 Broadcasthub. In addition the test domains used in the multi-tenancy tests need to point to the external Tine 2.0 JSON API. If you run the tests locally and use the Tine 2.0 docker setup then you can edit your `/etc/hosts` file and resolve the test domains to 127.0.0.1:

        127.0.0.1   tenant1.my-domain.test
        127.0.0.1   tenant2.my-domain.test
        127.0.0.1   tenant3.my-domain.test

Like the integration tests the end to end tests setup a Redis publisher and websocket clients and verify that the websocket clients receive the data they should receive.

Often arbitary tests fail because the timeout for waiting for the websocket message is reached. Try to minimize system load by other processes as far as possible, deactivate running virus scanner for example. Alternatively the timeout can be temporarily increased by setting the timeouts in `test/e2etest/test.js` to a higher value.


### Tests in Gitlab CI ###
See `.gitlab-ci.yml` for configuration and https://about.gitlab.com/blog/2016/03/01/gitlab-runner-with-docker/ for background information.

In the Gitlab CI for this project only the integration tests are executed. Running the end to end tests in the Gitlab CI seems not to be worth the trouble. Rather real end to end tests from change in Tine 2.0 file manager to Tine 2.0 client in a browser should be implemented. But that is out of scope of this repository, should be implemented in the Tine 2.0 repository resp. in the Tine 2.0 docker setup.


## Logging and debug output ##
The package `debug` (https://www.npmjs.com/package/debug) is used for logging. For the namespaces for the logging in the application see file `src/Logger.js`:

    Tine20Broadcasthub
      Info:*
      Error:*
      App (currently not used)
      Broadcasthub
      Tine20AuthTokenChecker

For the namespaces for the logging in the tests see file `tests/Util/Logger.js`:

    Test
      Error:*
      Debug

Loggers in namespaces ending with `*` are logging always as soon as the `DEBUG` environment variable is set to any value. They are supposed to log always no matter if `DEBUG` is set or not, but they do not.

For available logging configuration see section "Configuration of the Tine 2.0 Broadcasthub".


### Logging in the application ###
There are three levels of logging:

* Info
* Error
* Debug


#### Configure what is logged ####
* Without `DEBUG_DEFAULT_LOGGING` and `DEBUG` being set on invocation: Only errors are logged
* With `DEBUG_DEFAULT_LOGGING` set to "on" and without `DEBUG` being set on invocation: Infos and errors are logged
* With `DEBUG` being set: All loggers in namespace with suffix `*` and all loggers in the specified namespaces logg. With `DEBUG=Tine20Broadcasthub:* node app.js` for example all loggers log (info, error and debug)


#### Configure where it is logged to ####
* When `DEBUG_LOG_TO_FILE` is not set or set to another value than "on" or when `DEBUG_LOG_FILE` is not set: Logs go to `stderr`
* With `DEBUG_LOG_TO_FILE` set to "on" and `DEBUG_LOG_FILE` set to an absolute path in the filesystem: Logs are appended to that file, file gets created when it does not exist
* With `DEBUG_LOG_TO_FILE` set to "on" and `DEBUG_LOG_FILE` set to an path relative to `src/Logger.js`: Logs are appended to that file, file gets created when it does not exist

***Attention!*** The Tine 2.0 Broadcasthub exits with status 1 when logging to file is configured and the file can not be created or is not writeable.

***Attention!*** When logs go to file make sure to not unlink that file. Otherwise the logger will continue to log to the file (by inode number, open file handler) and the file will be deleted by the system once the application is stopped/restarted and the logging process keeping the file open does not exist anymore. There is no way to recover the log file once the last link to the inode is gone. If `logrotate` is used make sure to use option `truncatecopy` to keep the original file and to just rotate the content of the file. This is valid for Linux/Unix systems only. Other systems have not been tested.


### Logging in the tests ###
There are two levels of logging:

* Error
* Debug


#### Configure what is logged in the integration tests ####
The Tine 2.0 Broadcasthub is started from within the tests. The logs can be configured as described above. The `debug` output is logged in addition to the standard Jest output.

* Without `DEBUG` being set on test invocation:

    * Tests: Error
    * Application: Depends on `DEBUG_DEFAULT_LOGGING`

        * `DEBUG_DEFAULT_LOGGING` not set or set to another value than "on": Error
        * `DEBUG_DEFAULT_LOGGING` set to "on": Info, error

* All test invocations with `DEBUG` being set activate the loggers in the namespaces with `*` suffix as well as the the loggers in the specified namespaces, for example:

    * With `DEBUG=Test:*`:

        * Tests: Error, debug
        * Application: Info, error

    * With `DEBUG=Tine20Broadcasthub:*,Test:*`:

        * Tests: Error, debug
        * Application: Info, error, debug


#### Configure where it is logged to in the integration tests ####
The tests log to `stderr` only. Logging to file is deactivated in the tests.


#### Configure logging in the end to end tests ####
The Tine 2.0 Broadcasthub is run external from the tests. See "Logging in the application" for configuration of the logs of the Tine 2.0 Broadcasthub.

By default the end to end tests do not log anything. Logs can be enabled by setting `DEBUG` at test invocation, for example `DEBUG=Test:*` for error and debug output or `DEBUG=Test:Error:*` for error output only. The end to end tests only log to stderr. Logging to file is deactivated in the tests.


## Development ##
### Development within the Tine 2.0 docker setup ###
See README of `tine20/docker`, section "Add Tine 2.0 Broadcasthub/Development".


### Development with local node application ###
For basic development the standalone integration tests (use mocks for external services) might be sufficient: Change the code, adapt tests if necessary, run integration tests and check if everything is fine.

For full local development and running the end to end tests locally a local Tine 2.0 development instance is necessary (Tine 2.0 JSON API for checking the token). Furthermore a local Redis server is necessary. Adapt the code as necessary and check if it works with the following steps:

* Stop the local Tine 2.0 Broadcasthub if it is already running (code changes only take effect after node restart)
* Start the Tine 2.0 Broadcasthub locally, optional with enabled debug output to check what is going on: `DEBUG=Tine20Broadcasthub:* node app.js`
* Start the local test client that simulates the Tine 2.0 Client in the browser: `node dev/client.js`
* In order to simulate the Tine 2.0 Server publishing into the Redis channel the Tine 2.0 Broadcasthub listens to, run the trigger file: `node dev/trigger.js`.
* Each time the trigger is run, the Tine 2.0 Broadcasthub receives a message from the Redis channel it is listening to and broadcasts the message to the connected test client. Check the logs of the running Tine 2.0 Broadcasthub as well as of the test client and trigger.


The Tine 2.0 Broadcasthub can also be started by using `nodemon` which watches for file changes and reloads the node application automatically. `nodemon` can be used like `node`:

    node_modules/.bin/nodemon app.js

Type `rs` in the `nodemon` output to force a reload. Or just change/save or `touch` a file.


### Setup local Tine 2.0 development instance ###
In general see README in `tine20/docker` repository. Webpack build etc. for the frontend can be omitted, since we only need the Tine 2.0 Server JSON API.


#### Setup auth token channel for development ####
This is already integrated and should be applied automatically in the `tine20/docker` repository. authTokenChanels` is configured in `configs/broadcasthub/broadcasthub.inc.php`, which is mounted in the Broadcasthub container in `compose/broadcasthub.yml`.

The entry in table `tine20_auth_token` is generated with the Tine 2.0 setup task `setup.php --add_auth_token --` executed in `cli/Commands/Tine/TineInstallCommand.php`.

This is how it was done before the automation and integration of the Broadcasthub into the the `tine20/docker` setup:

Prior to any execution or build in the local `tine20/docker` project modify the following file:

`configs/conf.d/custom.inc.php`

    # Add to array that is returned

    'authTokenChanels' => ['records' =>
       [ 'name' => 'broadcasthub' ],
     ],


When the local Tine 2.0 Server is up, open phpMyAdmin (see `tine20/docker` README) and add this record:

    INSERT INTO tine20_auth_token (id, auth_token, account_id, valid_until, channels) VALUES ('longlongid', 'longlongtoken', (select id from tine20_accounts where login_name = "tine20admin"), ADDDATE(NOW(), INTERVAL 1 YEAR), '["broadcasthub"]');


For later commits of `tine20/docker` which already include the Tine 2.0 Broadcasthub copy the `.pullup.json` to `pullup.json` and remove entry `broadcasthub` from the key `composeFiles`. This way the startup of the Tine 2.0 Broadcasthub should be prevented within the Tine 2.0 docker setup.


### Start local Redis server ###

    cd dev/redis-docker
    docker-compose up -d

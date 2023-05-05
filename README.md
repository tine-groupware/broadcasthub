# Developer README for tine Broadcasthub #
See [user documentation TINEDOCS.md](TINEDOCS.md) for an introduction and user guide, including configuration

This README has focus on developing, testing and building the tine Broadcasthub.

[[_TOC_]]

## Prerequisites to run the tine Broadcasthub ##
Initial development and test setup:

* Developed and tested on Kubuntu 20.04
* tine Server with tine JSON API
* Redis Server
* node with npm, developed and tested against lts/fermium: node v14.17.5 (npm v7.20.6). Upgraded and tested against lts/gallium v16.15.0 (npm v8.5.5).

The Broadcasthub is integrated into the `tine20/docker` setup.


## Installation of the tine Broadcasthub ##
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


## Start and stop the tine Broadcasthub ##
Start:

    node app.js

Stop:

    Kill the node process, with strg+c for example; stop the container etc.


## Build and push production container image ##
* Make sure your local changes are working by running the tests and manual testing
* Merge your changes into master branch
* Set a new tag on the commit and push it
* Gitlab CI will build the image and publish it to the docker registries, see `.gitlab-ci.yml` for details
* The credentials for the registries are stored as project variables in Gitlab
* The image will be tagged with the tag on the commit
* tine and the tine docker setup depend on this container image
* Gitlab CI is trigged by any tag in any branch, so be careful with pushing tags


## Tests ##
Jest (https://jestjs.io/) is used as test framework.

### Integration tests ###
Run `npm run-script integrationtest` to execute the integration tests. These tests work standalone with a Redis mock and a tine JSON API mock. The tine Broadcasthub is started at the beginning of the tests and shutdown at the end of the tests. The tests setup a Redis publisher to simulate the tine Server sending a message to the Redis channel. The tests also setup websocket clients that connect to the tine Broadcasthub websocket server. The tests verify that the websocket clients receive the data they should receive.


### End to end tests ###
Run `npm run-script e2etest` to execute the end to end tests. Broadcasthub env `ENABLE_MULTITENANCY_MODE` has to be set to `false` for testing single tenancy mode and in an other run to `true` for testing multi tennancy mode. These tests require an external Redis, an external tine JSON API and an external already running tine Broadcasthub. In addition the test domains used in the multi-tenancy tests need to point to the external tine JSON API. If you run the tests locally and use the tine docker setup then you can edit your `/etc/hosts` file and resolve the test domains to 127.0.0.1:

        127.0.0.1   tenant1.my-domain.test
        127.0.0.1   tenant2.my-domain.test
        127.0.0.1   tenant3.my-domain.test

Like the integration tests the end to end tests setup a Redis publisher and websocket clients and verify that the websocket clients receive the data they should receive.

Often arbitary tests fail because the timeout for waiting for the websocket message is reached. Try to minimize system load by other processes as far as possible, deactivate running virus scanner for example. Alternatively the timeout can be temporarily increased by setting the timeouts in `test/e2etest/test.js` to a higher value.


### Tests in Gitlab CI ###
See `.gitlab-ci.yml` for configuration and https://about.gitlab.com/blog/2016/03/01/gitlab-runner-with-docker/ for background information.

In the Gitlab CI for this project only the integration tests are executed. Running the end to end tests in the Gitlab CI seems not to be worth the trouble. Rather real end to end tests from change in tine file manager to tine client in a browser should be implemented. But that is out of scope of this repository, should be implemented in the tine repository resp. in the tine docker setup.


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

For available logging configuration see section "Configuration of the tine Broadcasthub".


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

***Attention!*** The tine Broadcasthub exits with status 1 when logging to file is configured and the file can not be created or is not writeable.

***Attention!*** When logs go to file make sure to not unlink that file. Otherwise the logger will continue to log to the file (by inode number, open file handler) and the file will be deleted by the system once the application is stopped/restarted and the logging process keeping the file open does not exist anymore. There is no way to recover the log file once the last link to the inode is gone. If `logrotate` is used make sure to use option `truncatecopy` to keep the original file and to just rotate the content of the file. This is valid for Linux/Unix systems only. Other systems have not been tested.


### Logging in the tests ###
There are two levels of logging:

* Error
* Debug


#### Configure what is logged in the integration tests ####
The tine Broadcasthub is started from within the tests. The logs can be configured as described above. The `debug` output is logged in addition to the standard Jest output.

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
The tine Broadcasthub is run external from the tests. See "Logging in the application" for configuration of the logs of the tine Broadcasthub.

By default the end to end tests do not log anything. Logs can be enabled by setting `DEBUG` at test invocation, for example `DEBUG=Test:*` for error and debug output or `DEBUG=Test:Error:*` for error output only. The end to end tests only log to stderr. Logging to file is deactivated in the tests.


## Development ##
### Development within the tine docker setup ###
See README of `tine20/docker`, section "Add tine Broadcasthub/Development".


### Development with local node application ###
For basic development the standalone integration tests (use mocks for external services) might be sufficient: Change the code, adapt tests if necessary, run integration tests and check if everything is fine.

For full local development and running the end to end tests locally a local tine development instance is necessary (tine JSON API for checking the token). Furthermore a local Redis server is necessary. Adapt the code as necessary and check if it works with the following steps:

* Stop the local tine Broadcasthub if it is already running (code changes only take effect after node restart)
* Start the tine Broadcasthub locally, optional with enabled debug output to check what is going on: `DEBUG=Tine20Broadcasthub:* node app.js`
* Start the local test client that simulates the tine Client in the browser: `node dev/client.js`
* In order to simulate the tine Server publishing into the Redis channel the tine Broadcasthub listens to, run the trigger file: `node dev/trigger.js`.
* Each time the trigger is run, the tine Broadcasthub receives a message from the Redis channel it is listening to and broadcasts the message to the connected test client. Check the logs of the running tine Broadcasthub as well as of the test client and trigger.


The tine Broadcasthub can also be started by using `nodemon` which watches for file changes and reloads the node application automatically. `nodemon` can be used like `node`:

    node_modules/.bin/nodemon app.js

Type `rs` in the `nodemon` output to force a reload. Or just change/save or `touch` a file.


### Setup local tine development instance ###
In general see README in `tine20/docker` repository. Webpack build etc. for the frontend can be omitted, since we only need the tine Server JSON API.


#### Setup auth token channel for development ####
This is already integrated and should be applied automatically in the `tine20/docker` repository. authTokenChanels` is configured in `configs/broadcasthub/broadcasthub.inc.php`, which is mounted in the Broadcasthub container in `compose/broadcasthub.yml`.

The entry in table `tine20_auth_token` is generated with the tine setup task `setup.php --add_auth_token --` executed in `cli/Commands/Tine/TineInstallCommand.php`.

This is how it was done before the automation and integration of the Broadcasthub into the the `tine20/docker` setup:

Prior to any execution or build in the local `tine20/docker` project modify the following file:

`configs/conf.d/custom.inc.php`

    # Add to array that is returned

    'authTokenChanels' => ['records' =>
       [ 'name' => 'broadcasthub' ],
     ],


When the local tine Server is up, open phpMyAdmin (see `tine20/docker` README) and add this record:

    INSERT INTO tine20_auth_token (id, auth_token, account_id, valid_until, channels) VALUES ('longlongid', 'longlongtoken', (select id from tine20_accounts where login_name = "tine20admin"), ADDDATE(NOW(), INTERVAL 1 YEAR), '["broadcasthub"]');


For later commits of `tine20/docker` which already include the tine Broadcasthub copy the `.pullup.json` to `pullup.json` and remove entry `broadcasthub` from the key `composeFiles`. This way the startup of the tine Broadcasthub should be prevented within the tine docker setup.


### Start local Redis server ###

    cd dev/redis-docker
    docker-compose up -d


### Test production image locally ###
* Code changes can be tested like described in previous sections
* But changes in the docker image (`Dockerfile`) should be tested like described in this section before they are pushed into the registries
* Build the docker image locally:

        cd <project_dir>
        docker build -t dockerregistry.metaways.net/tine20/tine20-broadcasthub:X.Y-test .

* Set the tag `X.Y-test` in tine docker setup in `docker-compose` file for the Broadcasthub
* Start tine docker setup
* Perform manual tests with test client `dev/client.js`

    * Change the Broadcasthub port in `dev/client.js` to the one used by the tine docker setup
    * Run the client from the project directory: `node dev/client.js`
    * Create, change and delete a file in the local tine in the file manager
    * The test client should print the messages from the Broadcasthub

Integration tests do not work in the production image since development dependencies are not installed.

E2E tests cannot be run against the Broadcasthub container in the tine docker setup since redis is not exposed and thus the redis publisher in the tests cannot publish messages which should be received by the clients in the tests.

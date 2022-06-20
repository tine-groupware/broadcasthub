#!/bin/sh

docker build -t dockerregistry.metaways.net/tine20/tine20-broadcasthub:$CI_COMMIT_TAG -t registry.metaways.net/tine/broadcasthub:$CI_COMMIT_TAG -t docker.io/tinegroupware/broadcasthub:$CI_COMMIT_TAG .

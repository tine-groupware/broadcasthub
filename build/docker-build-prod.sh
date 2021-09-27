#!/bin/bash

scriptDir=$(dirname "$0")
projectRoot=${scriptDir}/..

. ${projectRoot}/build/tag.sh

docker build -t dockerregistry.metaways.net/tine20/docker/tine20-broadcasthub:$tag $projectRoot

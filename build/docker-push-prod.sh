#!/bin/bash

scriptDir=$(dirname "$0")
projectRoot=${scriptDir}/..

. ${projectRoot}/build/tag.sh

echo "Are you sure to push \"$tag\" to registry, existing tag will be overridden (yes/no)? "
read answer

if [ "$answer" != "yes" ]; then
  exit
fi

docker login dockerregistry.metaways.net
docker push dockerregistry.metaways.net/tine20/docker/tine20-broadcasthub:$tag

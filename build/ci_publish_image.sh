#!/bin/sh

# Singel architecture pushes (amd64)
# docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
# docker push dockerregistry.metaways.net/tine20/tine20-broadcasthub:$CI_COMMIT_TAG
#
# docker login -u $MW_MW_REGISTRY_USER -p $MW_MW_REGISTRY_PASSWORD registry.metaways.net
# docker push registry.metaways.net/tine/broadcasthub:$CI_COMMIT_TAG
#
# docker login -u $MW_DOCKER_HUB_USER -p $MW_DOCKER_HUB_PASSWORD docker.io
# docker push docker.io/tinegroupware/broadcasthub:$CI_COMMIT_TAG

#
# Multi-architecture builds and pushes
#

# Log into each registry
# dockerregistry.metaways.net
docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
# registry.metaways.net
docker login -u $MW_MW_REGISTRY_USER -p $MW_MW_REGISTRY_PASSWORD registry.metaways.net
# docker.io
docker login -u $MW_DOCKER_HUB_USER -p $MW_DOCKER_HUB_PASSWORD docker.io

# Build and push to registries
docker buildx build --push --platform linux/amd64,linux/arm64/v8 -t dockerregistry.metaways.net/tine20/tine20-broadcasthub:$CI_COMMIT_TAG -t registry.metaways.net/tine/broadcasthub:$CI_COMMIT_TAG -t registry.metaways.net/tine/broadcasthub:latest -t docker.io/tinegroupware/broadcasthub:$CI_COMMIT_TAG .

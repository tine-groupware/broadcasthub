#!/bin/sh

# Single architecture build (amd64)
#docker build -t dockerregistry.metaways.net/tine20/tine20-broadcasthub:$CI_COMMIT_TAG -t registry.metaways.net/tine/broadcasthub:$CI_COMMIT_TAG -t docker.io/tinegroupware/broadcasthub:$CI_COMMIT_TAG .


#
# Multi-architecture build by QEMU emulation in the kernel
#

# Install buildx, not included in docker:20.10.11
# See https://docs.docker.com/build/buildx/install/#linux-packages
apk update
apk add curl
latest=$(curl -I https://github.com/docker/buildx/releases/latest | grep -i ^Location: | cut -d: -f2- | sed 's/^ *\(.*\).*/\1/' | sed 's#^https://github\.com/docker/buildx/releases/tag/\(v.\+\)$#\1#'  | tr -d '\r')
echo "Fetching buildx from https://github.com/docker/buildx/releases/download/${latest}/buildx-${latest}.linux-amd64"
wget "https://github.com/docker/buildx/releases/download/${latest}/buildx-${latest}.linux-amd64"
chmod +x buildx-${latest}.linux-amd64
mkdir -p /usr/libexec/docker/cli-plugins/
mv buildx-${latest}.linux-amd64 /usr/libexec/docker/cli-plugins/docker-buildx


# See https://docs.docker.com/build/building/multi-platform/

# Install binfmt_misc handler for access to QEMU
docker run --privileged --rm tonistiigi/binfmt --install all

# Create and use custom builder instance
docker buildx create --name container --driver=docker-container --bootstrap
docker buildx use container

# Print information about building capabilties
docker context ls
docker buildx version
docker buildx ls

# Build is done along with push in ci_publish_image.sh

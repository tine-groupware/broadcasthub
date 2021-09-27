#!/bin/bash

if [ ! -z "$(git status --porcelain)" ]; then
  echo Local git repository is not clean. Please clean up and try again.
  echo Exiting...
  exit
fi

tag=$(git describe --tags)

if [ -z "$tag" ]; then
  echo Local git repository is not on a tagged commit.
  echo Please tag your commit you want to run the build for.
  echo Exiting...
  exit
fi

if [ -z "$(git ls-remote --tags origin $tag)" ]; then
  echo Tag in local git repository does not exist in remote origin.
  echo Please push your tag to the remote origin.
  echo Exiting...
  exit
fi

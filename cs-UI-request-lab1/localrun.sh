#!/bin/bash

# for the sample UI component

export LOGDB=localhost
export SERVERBASE=http://localhost:8080/fhir/  # when in a container
# export SERVERBASE=http://localhost:9199/baseR4/   #whwn run as cli
export CUSTOMOPS=http://localhost:9300/

export POCSERVERBASE=9500


node ./pocServer.js
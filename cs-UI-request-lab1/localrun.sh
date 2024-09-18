#!/bin/bash

# for the sample UI component

export LOGDB=localhost
# always save to canshare (just for now)
# export SERVERBASE=http://localhost:8080/fhir/  # when in a container


export SERVERBASE=http://poc.canshare.co.nz:8080/fhir/  # when in a container
# export SERVERBASE=http://localhost:9199/baseR4/   #whwn run as cli

# where the custom opertions are found. Not used on models
export CUSTOMOPS=http://localhost:9300/

# the port that the server will listen on
export POCSERVERBASE=9500


node ./pocServer.js
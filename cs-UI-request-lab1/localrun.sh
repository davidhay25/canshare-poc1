#!/bin/bash

# for the sample UI component

export LOGDB=localhost
# when in a container export SERVERBASE=http://localhost:8080/fhir/
export SERVERBASE=http://localhost:9199/baseR4/   #whwn run as cli
export CUSTOMOPS=http://localhost:9300/

node ./pocServer.js
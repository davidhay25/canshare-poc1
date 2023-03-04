#!/bin/bash

# for the sample UI component

export LOGDB=localhost
export SERVERBASE=http://localhost:8080/fhir/
export CUSTOMOPS=http://localhost:9300/

node ./pocServer.js
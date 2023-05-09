#!/bin/bash

# for the sample UI component when run on the POC server. Will be deprecated when containerized

export LOGDB=localhost
export SERVERBASE=http://poc.canshare.co.nz:8080/fhir/  # when in a container
export CUSTOMOPS=http://poc.canshare.co.nz:9300/

node ./pocServer.js
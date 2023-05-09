#!/bin/bash
# when run on the pcs server. This is only temp will be replace when containerized
export LOGDB=localhost
export SERVERBASE=http://poc.canshare.co.nz:8080/fhir/   # when in a container
# export SERVERBASE=http://localhost:9199/baseR4/   #whwn run as cli

node ./server.js
#!/bin/bash

export LOGDB=localhost
# export SERVERBASE=http://localhost:8080/fhir/
export SERVERBASE=http://localhost:9199/baseR4/   #whwn run as cli

node ./server.js
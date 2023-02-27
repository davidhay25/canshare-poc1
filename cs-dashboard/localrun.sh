#!/bin/bash

#run the dashboard server. Assume the mongodb container has been started

export LOGDB=localhost
export SERVERBASE=http://localhost:8080/fhir/

node ./server-dashboard.js
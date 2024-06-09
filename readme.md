
# 

## How to deploy an instance of the LIM

setup server
install node
install pms
clone from github
setup pm2
install data
(todo create install from export script)





# old stuff

## To start for development

* cd cs-customOps & execute docker compose up in this folder. Will start mongo & hapi
* cd cs-customOps & ./localrun. Will start the custom operations component. Whenever changes are made to the component, stop and re-run localrun.
cd cd-dashboard & ./localrun. Will start the dashboard component. Whenever changes are made to the component, stop and re-run localrun.

## ports

### Port 8080: hapi server

The externally accessible hapi server

### Port 27017: mongo

The externally accessible mongodb

### Port 9300: Custom endpoints. 

All receive input bundles 

localhost:9300/$acceptActNow
localhost:9300/$acceptRequest
localhost:9300/$acceptReport


### Port 9400: Dashboard

localhost:9400 - display dashboard

## sample data

In sampleData folder
Manually upload to server after initial creation 

act-now copied from clinfhir\actnow\mosaicdata\out

POCBundle.json from cs-dataStandardDesigner


https://serverfault.com/questions/171678/nginx-config-front-end-reverse-proxy-to-another-port
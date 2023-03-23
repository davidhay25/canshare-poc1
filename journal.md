My journal of activities



## Thur Mar 23

set domain name ri.canshare.co.nz to docker server
installed nodejs on ri so can run scripts locally (rather than needing docker container yet)
already running hapi & mongo via docker containers
ufw to allow 8080 & 9300
verify that customops is accessible

set 
**nohup ./localrun.sh &** so that can access custom ops from other server
idea is that changes can be rapidly deployed to the ri server - eventually customops will be in 
a container
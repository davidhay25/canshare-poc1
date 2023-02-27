FROM node:19-alpine
LABEL maintainer="david.hay25@gmail.com"

COPY . /src
WORKDIR /src

EXPOSE 9300
ENTRYPOINT ["node", "/src/server.js"]

# build
# docker image build -t cs-ops:latest .
# run - (https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals)
# docker run -d --init --name cs-ops -p 9300:9300 cs-ops:latest

# docker-compose up -d


# docker run -d --init --name cs-ops --log-driver=fluentd  -p 9200:9200 cs-ops:latest

# docker run -d --name  fluentd jsliang/fluentd-plugin-mongo:latest
#
# docker run -it --init --name cs-poc --net poc-net -p 9100:9100 poc:latest

# shell into running container
# docker exec -it cs-poc /bin/sh

# hapi   /var/lib/jetty/target   https://smilecdr.com/docs/installation/docker_container_installation.html
# docker container run --name hapix -p 8080:8080  --mount source=hapi-data,destination=/data/hapi  hapiproject/hapi:latest
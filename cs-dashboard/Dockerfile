FROM node:19-alpine
LABEL maintainer="david.hay25@gmail.com"

COPY . /src
WORKDIR /src

EXPOSE 9400
ENTRYPOINT ["node", "/src/dashboard-server.js"]


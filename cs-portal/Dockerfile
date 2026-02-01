FROM nginx:1.27-bookworm

RUN apt-get update && apt-get install -y \
    curl \
    iputils-ping \
    iproute2 \
    netcat-traditional \
    nano \
 && rm -rf /var/lib/apt/lists/*

COPY . /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

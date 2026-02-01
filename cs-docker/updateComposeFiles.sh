#!/bin/bash

echo "About to upload the compose files to the production and test servers"
echo "Press any key to continue... (or Ctrl+C to abort)"

# Wait for a single keypress
read -n 1 -s

echo "Copying..."
scp docker-compose-backup.yml root@backup.canshare.co.nz:/opt/canshare-docker/docker-compose.yml

scp docker-compose-prod.yml root@canshare.co.nz:/opt/canshare-docker/docker-compose.yml

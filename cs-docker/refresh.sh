#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# refresh all images and restart containers

# echo "🚧 Taking down containers..."
# docker compose down

echo "📦 Pulling latest images..."
docker compose pull

echo "🚀 Starting containers..."
docker compose up -d

echo "restrting traefik"
docker restart traefik


echo "✅ All done!"
docker compose ps
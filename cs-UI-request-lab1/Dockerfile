# Use an official Node.js image as base
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy everything including node_modules
COPY . .

# Expose the port used
EXPOSE 9400

# Run the app
CMD ["./localrun.sh"]

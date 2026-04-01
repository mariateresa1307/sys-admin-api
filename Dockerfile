ARG NODE_VERSION=24.14.1
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Install dependencies for node-gyp (needed for bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]

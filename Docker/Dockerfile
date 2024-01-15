FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY ./package-lock.json ./
COPY ./Docker/dockerfile-entrypoint.sh /usr/local/bin/dockerfile-entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Install only production dependencies
RUN npm ci --only=production

COPY ./src ./src

ENTRYPOINT [ "/usr/local/bin/dockerfile-entrypoint.sh" ]
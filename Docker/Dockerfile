FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY ./package-lock.json ./
COPY ./Docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Install only production dependencies
RUN npm ci --only=production

COPY ./src ./src

# Enable polling for watching files by default since it appears that's
# the only way to have file detection work in a Docker container.
# This can always be set to false in docker-compose.yml later if necessary.
ENV CHOKIDAR_USEPOLLING=true

# Pull the version from the github build environment
ARG VERSION
ENV VERSION=${VERSION:-dev}
RUN echo $VERSION

ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
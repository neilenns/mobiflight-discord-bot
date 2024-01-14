FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY ./package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

COPY ./src ./src

CMD [ "node", "./src/index.js" ]
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
RUN apk add --no-cache ffmpeg make python3 g++ gcc

# Install app dependencies
COPY package*.json ./

RUN npm ci

# Bundle app source
COPY . .

CMD [ "node", "." ]



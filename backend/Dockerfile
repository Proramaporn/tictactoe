# Build stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include dev if needed)
RUN npm install

# Copy full project (not only src, in case you have config files)
COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]
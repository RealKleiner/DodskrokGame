FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 3000
USER node
CMD [ "node", "server.js" ]
COPY . .


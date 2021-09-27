FROM node:14

# Create app directory
WORKDIR /usr/src/app

COPY . .

# Remove .env file
# Environment variables should be injected by k8s or docker-compose setup
RUN rm -f .env

# If you are building your code for production
RUN npm ci --only=production

CMD [ "npm", "start" ]

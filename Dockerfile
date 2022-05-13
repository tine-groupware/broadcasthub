FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY . .

# Remove present ignored files like .env, node_modules, *.log etc.
# Environment variables should be injected by k8s or docker-compose setup.
# node_modules should be fetched for this container enviroment.
RUN git clean -dfx

# If you are building your code for production
RUN npm install --production

CMD [ "npm", "start" ]

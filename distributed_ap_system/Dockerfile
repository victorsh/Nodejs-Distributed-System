FROM node:argon
RUN apt-get -y update

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install
RUN npm install body-parser
RUN npm install cron
RUN npm install request
RUN npm install fs

# Bundle app source
COPY . /usr/src/app

CMD [ "npm", "start" ]

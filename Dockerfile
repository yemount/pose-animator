FROM node 
WORKDIR /app 
COPY . /app
RUN rm /app/package-lock.json
RUN rm /app/yarn.lock
RUN yarn
CMD yarn watch
EXPOSE 1234
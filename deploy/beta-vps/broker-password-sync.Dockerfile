FROM node:22-alpine

RUN apk add --no-cache docker-cli mosquitto

WORKDIR /app

COPY mosquitto ./mosquitto

CMD ["node", "mosquitto/watch-passwords.mjs"]

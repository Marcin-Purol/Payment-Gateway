FROM node:22.16.0

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
COPY tests ./tests
RUN npm run build

CMD ["node", "dist/index.js"]
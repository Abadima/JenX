FROM node:24-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json build.js .gitignore ./
COPY src ./src
RUN node build.js

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
USER node
CMD ["node", "."]

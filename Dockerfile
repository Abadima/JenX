FROM oven/bun:1.4.5 AS build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY tsconfig.json build.js .gitignore ./
COPY src ./src
RUN bun build.js

FROM oven/bun:1.4.5 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production

FROM oven/bun:1.4.5
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
USER bun
CMD ["bun", "build/bot.js"]

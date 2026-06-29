FROM node:20.19.5-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/treasury-web/package.json apps/treasury-web/package.json
COPY apps/operations-web/package.json apps/operations-web/package.json
COPY packages/web-core/package.json packages/web-core/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run build -w @paositra/api

FROM node:20.19.5-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/treasury-web/package.json apps/treasury-web/package.json
COPY apps/operations-web/package.json apps/operations-web/package.json
COPY packages/web-core/package.json packages/web-core/package.json
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
COPY scripts scripts
COPY database database
USER node
CMD ["node", "apps/api/dist/main.js"]

FROM node:20.19.5-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/operations-web/package.json apps/operations-web/package.json
COPY apps/treasury-web/package.json apps/treasury-web/package.json
COPY packages/web-core/package.json packages/web-core/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/web-core packages/web-core
COPY apps/operations-web apps/operations-web
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w @paositra/operations-web

FROM nginx:1.28.0-alpine
COPY apps/operations-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/operations-web/dist /usr/share/nginx/html
EXPOSE 80

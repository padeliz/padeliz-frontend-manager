# Production image for Expo Router web (output: server). DevContainers stay in .devcontainer/.

FROM node:20-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json* bun.lockb* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

ARG EXPO_PUBLIC_BASE_URL
ARG EXPO_PUBLIC_SCHEME=padeliz-manager://
ARG EXPO_PUBLIC_API_BASE_URL
ARG EXPO_PUBLIC_API_VERSION=v1
ARG EXPO_PUBLIC_API_MANAGER_PREFIX=/api/v1/manager
ARG EXPO_PUBLIC_APP_NAME=Padeliz Manager
ARG EXPO_PUBLIC_APP_VERSION=1.0
ARG EXPO_PUBLIC_DEBUG_MODE=0
ARG EXPO_PUBLIC_LOG_LEVEL=info

ENV EXPO_PUBLIC_BASE_URL=$EXPO_PUBLIC_BASE_URL \
    EXPO_PUBLIC_SCHEME=$EXPO_PUBLIC_SCHEME \
    EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL \
    EXPO_PUBLIC_API_VERSION=$EXPO_PUBLIC_API_VERSION \
    EXPO_PUBLIC_API_MANAGER_PREFIX=$EXPO_PUBLIC_API_MANAGER_PREFIX \
    EXPO_PUBLIC_APP_NAME=$EXPO_PUBLIC_APP_NAME \
    EXPO_PUBLIC_APP_VERSION=$EXPO_PUBLIC_APP_VERSION \
    EXPO_PUBLIC_DEBUG_MODE=$EXPO_PUBLIC_DEBUG_MODE \
    EXPO_PUBLIC_LOG_LEVEL=$EXPO_PUBLIC_LOG_LEVEL \
    NODE_ENV=production

RUN npx expo export --platform web

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

COPY --from=build /app/package.json /app/package-lock.json* /app/bun.lockb* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/app.config.js ./app.config.js
COPY --from=build /app/assets ./assets

EXPOSE 8080

CMD ["sh", "-c", "npx expo serve --port \"${PORT:-8080}\""]

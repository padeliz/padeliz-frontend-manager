ARG NODE_VERSION=20
FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION}

# Install Android SDK deps (optional), Watchman, and utilities
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git openssh-client curl ca-certificates unzip \
      libgtk-3-0 libnss3 libasound2 libxss1 libxtst6 xauth xvfb && \
    rm -rf /var/lib/apt/lists/*

# Avoid global expo install; use npx. But install watchman for better FS watching if desired
# (watchman official packages are not always available; Metro polling is enabled via env)

ENV CI=1

# Set working dir
WORKDIR /workspaces/padeliz-frontend-manager

# Copy only package files for faster layer caching
COPY package*.json ./

# Install dependencies (allow peer resolution during build for first run)
RUN npm install --no-audit --no-fund

# Copy the rest of the project
COPY . .

# Expose common Expo/Metro ports
EXPOSE 8083 8084 20000 20001 20002 20006

# Default command: just sleep; use VS Code tasks/terminal to run expo
CMD ["bash", "-lc", "sleep infinity"]

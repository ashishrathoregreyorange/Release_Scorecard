FROM node:20-alpine

# Puppeteer needs Chromium + a handful of system libs. Use the alpine package
# and point puppeteer at it instead of downloading its own bundled binary.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    DASHBOARD_PORT=3000

WORKDIR /app

# Install dependencies first (better caching).
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy the rest of the source.
COPY . .

# Build the frontend so Express can serve the SPA from /dist.
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]

# Step 1: Install dependencies
FROM node:24-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Step 2: Build the app
FROM node:24-slim AS builder
WORKDIR /app

ARG AUTH0_DOMAIN
ARG AUTH0_CLIENT_ID
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_SECRET
ARG APP_BASE_URL

ENV AUTH0_DOMAIN=${AUTH0_DOMAIN}
ENV AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
ENV AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET}
ENV AUTH0_SECRET=${AUTH0_SECRET}
ENV APP_BASE_URL=${APP_BASE_URL}

COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN echo "--- Debugging Build Environment Variables (builder stage) ---" && \
    echo "AUTH0_DOMAIN: $AUTH0_DOMAIN" && \
    echo "AUTH0_CLIENT_ID: $AUTH0_CLIENT_ID" && \
    echo "AUTH0_CLIENT_SECRET is set: ${AUTH0_CLIENT_SECRET:+yes}" && \
    echo "AUTH0_SECRET is set: ${AUTH0_SECRET:+yes}" && \
    echo "APP_BASE_URL: $APP_BASE_URL" && \
    echo "---------------------------------------------------------"

RUN npm run build

# Step 3: Run the app
FROM node:24-slim AS runner
WORKDIR /app

# Required for Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

# Copy only needed files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

#CMD ["node_modules/.bin/next", "start", "-p", "8080"]
CMD ["npx", "next", "start", "-p", "8080"]

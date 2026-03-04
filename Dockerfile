# Build stages
FROM node:20-alpine AS base
RUN apk add --no-cache curl

FROM base AS deps
WORKDIR /app
# Install build dependencies for native modules (pg)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Create directories
RUN mkdir -p /app/public/uploads /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENV NODE_ENV=production

CMD ["npm", "run", "start"]

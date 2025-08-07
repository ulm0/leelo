# Multi-stage build for Leelo PWA
FROM node:20-alpine AS base

# Install dependencies for sharp and other native modules
RUN apk add --no-cache python3 make g++ sqlite openssl openssl-dev vips-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including sharp
RUN npm install

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies including vips for sharp
RUN apk add --no-cache sqlite openssl vips

WORKDIR /app

# Create necessary directories
RUN mkdir -p /data/assets /data/fonts

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy public assets
COPY --from=builder /app/dist/public ./public

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
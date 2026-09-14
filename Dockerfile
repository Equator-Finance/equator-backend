# Multi-stage Dockerfile for equator-backend
FROM node:20-alpine AS builder

# Prisma's engine binaries need OpenSSL, which Alpine doesn't ship by default
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies — prisma/schema.prisma must be present before `npm ci`
# runs the @prisma/client postinstall generate step, or it silently generates
# without the binaryTargets declared below.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source code and build TypeScript
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules, built code, and Prisma schema/migrations
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

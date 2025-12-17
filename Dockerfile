# Multi-stage Dockerfile for ATP Investment Agent
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN pnpm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built app and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY example.env .

# Expose for debugging
ENV DEBUG=*
ENV NODE_ENV=production

# Run agent
CMD ["node", "dist/index.js"]

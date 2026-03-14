# Build Stage
FROM node:25-alpine AS builder

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package*.json ./
RUN npm ci

# Copy only required source files
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# Production Stage
FROM node:25-alpine

WORKDIR /app

# Copy package json to install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generated typescript
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Generate client again but only for production
RUN npx prisma generate

# Drop root privileges at runtime
USER node

EXPOSE 3000

# Start server
CMD ["npm", "start"]

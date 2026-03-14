# Build Stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package config and install dependencies
COPY package*.json ./
RUN npm ci

# Copy only required source files
COPY app ./app
COPY assets ./assets
COPY components ./components
COPY constants ./constants
COPY hooks ./hooks
COPY scripts ./scripts
COPY src ./src
COPY app.json expo-env.d.ts tsconfig.json ./

# Export static web files using Expo CLI
RUN npx expo export -p web

# Production Stage - non-root Nginx
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy the static web build into Nginx's html service directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 8080

# Serve Nginx
CMD ["nginx", "-g", "daemon off;"]

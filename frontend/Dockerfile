# Build Stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package config and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Export static web files using Expo CLI
RUN npx expo export -p web

# Production Stage - Nginx
FROM nginx:alpine

# Copy the static web build into Nginx's html service directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Serve Nginx
CMD ["nginx", "-g", "daemon off;"]

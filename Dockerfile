# Stage 1: Build
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the frontend and backend
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:20-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production

# Install LibreOffice, Fontconfig, and required dependencies for PDF conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# IMPORTANT: Set up Persian Fonts to prevent 'tofu' squares in PDF
# You must create an 'assets/fonts' directory in your repo containing IRANSans.ttf, B_Nazanin.ttf, etc.
RUN mkdir -p /usr/share/fonts/truetype/custom
# We use a trick to not fail if the directory is missing: we copy everything from assets/fonts to the target
# This requires assets/fonts to exist, but the folder itself doesn't have to contain anything if you don't have custom fonts
COPY ./assets/fonts/ /usr/share/fonts/truetype/custom/
RUN fc-cache -f -v

# Create uploads directory for contracts with correct permissions
RUN mkdir -p /app/uploads/contracts && chown -R node:node /app/uploads

EXPOSE 5000

# Run as non-root user
USER node

# Start the production server
CMD ["npm", "run", "start"]

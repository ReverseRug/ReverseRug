# Multi-stage build for production
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for Vite
ARG VITE_API_URL
ARG VITE_SOLANA_RPC
ARG VITE_SOLANA_NETWORK
ARG VITE_PROGRAM_ID
ARG VITE_USDC_MINT

# Set as environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOLANA_RPC=$VITE_SOLANA_RPC
ENV VITE_SOLANA_NETWORK=$VITE_SOLANA_NETWORK
ENV VITE_PROGRAM_ID=$VITE_PROGRAM_ID
ENV VITE_USDC_MINT=$VITE_USDC_MINT

# Build for production
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "5173"]

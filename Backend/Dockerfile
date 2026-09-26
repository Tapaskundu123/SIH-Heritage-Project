# =============================================================
# KarigarSetu Backend — Multi-stage Dockerfile
# Stage 1: builder  — compiles TypeScript → dist/
# Stage 2: production — lean Node.js image with compiled code
# =============================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first (layer-cache dependency installs)
COPY package.json package-lock.json ./

# Install all deps (including devDependencies needed for tsc)
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests and install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create upload directory
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]

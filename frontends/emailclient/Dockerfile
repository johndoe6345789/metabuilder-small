# Multi-stage build: node_modules from base image, source built fresh
# Context: monorepo root (..)
# Requires: docker build -f deployment/base-images/Dockerfile.node-deps \
#           -t metabuilder/base-node-deps:latest .

# --- Build stage ---
FROM metabuilder/base-node-deps:latest AS builder
COPY . .

# Build workspace library packages
RUN for ws in redux/core redux/slices redux/hooks redux/adapters \
    redux/hooks-async redux/api-clients redux/persist \
    components workflow; do \
    npm run build -w "$ws" --if-present 2>&1 || echo "WARN: $ws build failed (non-critical)"; \
done

# Build the app
RUN cd frontends/emailclient && npx next build --webpack

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/frontends/emailclient/.next/standalone ./
COPY --from=builder /app/frontends/emailclient/.next/static ./frontends/emailclient/.next/static

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/emailclient || exit 1

WORKDIR /app/frontends/emailclient
CMD ["node", "server.js"]

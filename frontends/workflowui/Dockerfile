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
RUN cd frontends/workflowui && npx next build --webpack

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app

# Install Python for Flask backend
RUN apk add --no-cache python3 py3-pip

# Copy standalone Next.js output
COPY --from=builder /app/frontends/workflowui/.next/standalone ./
COPY --from=builder /app/frontends/workflowui/.next/static ./frontends/workflowui/.next/static
COPY --from=builder /app/frontends/workflowui/public ./frontends/workflowui/public

# Copy Flask backend
COPY --from=builder /app/frontends/workflowui/backend ./backend
RUN pip3 install --no-cache-dir --break-system-packages -r /app/backend/requirements.txt

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

WORKDIR /app/frontends/workflowui
CMD ["sh", "-c", "python3 /app/backend/server_sqlalchemy.py & node server.js"]

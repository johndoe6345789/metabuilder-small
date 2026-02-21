# Multi-stage build: deps cached separately from source changes
# Context: monorepo root (..)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./

# Workspace package.json files
COPY types/package.json ./types/
COPY interfaces/package.json ./interfaces/
COPY translations/package.json ./translations/
COPY workflow/package.json ./workflow/
COPY hooks/package.json ./hooks/
COPY components/package.json ./components/
COPY components/fakemui/package.json ./components/fakemui/
COPY config/package.json ./config/
COPY scss/package.json ./scss/
COPY storybook/package.json ./storybook/
COPY frontends/nextjs/package.json ./frontends/nextjs/
COPY frontends/dbal/package.json ./frontends/dbal/
COPY redux/core/package.json ./redux/core/
COPY redux/slices/package.json ./redux/slices/
COPY redux/hooks/package.json ./redux/hooks/
COPY redux/adapters/package.json ./redux/adapters/
COPY redux/hooks-data/package.json ./redux/hooks-data/
COPY redux/hooks-auth/package.json ./redux/hooks-auth/
COPY redux/hooks-canvas/package.json ./redux/hooks-canvas/
COPY redux/hooks-async/package.json ./redux/hooks-async/
COPY redux/hooks-utils/package.json ./redux/hooks-utils/
COPY redux/hooks-forms/package.json ./redux/hooks-forms/
COPY redux/core-hooks/package.json ./redux/core-hooks/
COPY redux/api-clients/package.json ./redux/api-clients/
COPY redux/timing-utils/package.json ./redux/timing-utils/
COPY redux/middleware/package.json ./redux/middleware/
COPY redux/services/package.json ./redux/services/
COPY redux/persist/package.json ./redux/persist/

# Install root + workspace deps (cached layer)
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set maxsockets 5 \
    && npm ci --ignore-scripts

# Install app-specific deps
COPY frontends/workflowui/package.json frontends/workflowui/package-lock.json* ./frontends/workflowui/
RUN cd frontends/workflowui && npm install
# --- Build stage ---
FROM deps AS builder
COPY . .

# Build workspace library packages
RUN for ws in redux/core redux/slices redux/hooks redux/adapters \
    redux/hooks-async redux/api-clients redux/persist \
    components workflow; do \
    npm run build -w "$ws" --if-present 2>&1 || echo "WARN: $ws build failed (non-critical)"; \
done

# Pre-install Next.js SWC binary (avoids unreliable CDN download during next build)
RUN npx --package=next next --version 2>/dev/null; \
    npm install --no-save @next/swc-linux-arm64-musl @next/swc-linux-arm64-gnu 2>/dev/null || true

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

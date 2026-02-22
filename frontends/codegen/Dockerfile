# Dev server: deps cached separately from source changes
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

RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set maxsockets 5 \
    && npm ci --ignore-scripts

COPY frontends/codegen/package.json ./frontends/codegen/
COPY frontends/workflowui/package.json ./frontends/workflowui/
COPY frontends/pastebin/package.json ./frontends/pastebin/
COPY frontends/postgres/package.json ./frontends/postgres/
COPY frontends/emailclient/package.json ./frontends/emailclient/
COPY frontends/exploded-diagrams/package.json ./frontends/exploded-diagrams/

RUN npm install --ignore-scripts


# --- Dev server stage ---
FROM deps AS dev
COPY . .

RUN for ws in redux/core redux/slices redux/hooks redux/adapters \
    redux/hooks-async redux/api-clients redux/persist \
    components workflow; do \
    npm run build -w "$ws" --if-present 2>&1 || echo "WARN: $ws build failed (non-critical)"; \
done

# Clean any stale Turbopack cache so dev server compiles from fresh source
RUN rm -rf frontends/codegen/.next

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/codegen || exit 1

WORKDIR /app/frontends/codegen
CMD ["npx", "next", "dev", "--turbopack", "-p", "3000"]

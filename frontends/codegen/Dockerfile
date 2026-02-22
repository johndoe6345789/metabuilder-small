# Dev server: node_modules from base image, source copied fresh
# Context: monorepo root (..)
# Requires: docker build -f deployment/base-images/Dockerfile.node-deps \
#           -t metabuilder/base-node-deps:latest .
FROM metabuilder/base-node-deps:latest AS deps

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

# Part 2: Application Image
# Uses pre-built Conan cache for fast builds
#
# Build: docker build -f Dockerfile.app --build-arg PROJECT=dbal -t metabuilder/dbal:latest .
# Time: 2-3 minutes (uses cached dependencies)
# Size: ~100MB (just the binary)

ARG BASE_IMAGE=metabuilder/conan-cache:latest
FROM ${BASE_IMAGE} AS builder

ARG PROJECT=dbal

# Copy project source
WORKDIR /app/${PROJECT}
COPY ${PROJECT}/ .

# Conan dependencies already available from base image!
# Just link them to this project
WORKDIR /app/${PROJECT}/build-config
RUN conan install . --output-folder=_build --build=missing

# Configure and build (fast - no dependency compilation)
RUN cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -S . -B _build \
    -DCMAKE_TOOLCHAIN_FILE=_build/build/Release/generators/conan_toolchain.cmake && \
    cmake --build _build

# Runtime stage (minimal)
FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -u 1001 -m -s /bin/bash appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/*/build-config/_build/*_daemon /app/daemon

RUN chown -R appuser:appuser /app
USER appuser

ENV BIND_ADDRESS=0.0.0.0 \
    PORT=8080 \
    LOG_LEVEL=info

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["./daemon"]

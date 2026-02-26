# Multi-stage build for DBAL C++ daemon
# Context: dbal/production/ (set by docker-compose)
# Requires: metabuilder/base-apt:latest (Ubuntu 24.04 + build tools)

ARG BUILD_TYPE=Release

# ── Build stage ──────────────────────────────────────────────────────────────
FROM metabuilder/base-apt:latest AS builder

ARG BUILD_TYPE

WORKDIR /dbal

# Install Conan and detect profile (--break-system-packages for PEP 668 on Ubuntu 24.04)
RUN pip3 install --break-system-packages conan \
    && conan profile detect --force

# Copy dependency manifest first (layer caching)
COPY build-config/conanfile.py ./build-config/conanfile.py

# Install C++ dependencies via Conan (absolute output path for reliability)
# Conan 2.x places generators under build/<build_type>/generators/
RUN cd build-config \
    && conan install . \
       --output-folder=/dbal/build \
       --build=missing \
       -s build_type=${BUILD_TYPE} \
       -s compiler.cppstd=20 \
    && GENERATORS_DIR=$(dirname $(find /dbal/build -name conan_toolchain.cmake -print -quit)) \
    && echo "Generators dir: $GENERATORS_DIR" \
    && ln -sf "$GENERATORS_DIR"/* /dbal/build/

# Copy source code and build files
COPY CMakeLists.txt ./
COPY src/ ./src/
COPY include/ ./include/

# Build with CMake (use absolute path for toolchain file)
RUN cd /dbal/build \
    && cmake /dbal \
       -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
       -DCMAKE_TOOLCHAIN_FILE=/dbal/build/conan_toolchain.cmake \
       -G Ninja \
    && cmake --build . --parallel \
    && strip dbal_daemon

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM metabuilder/base-apt:latest

WORKDIR /app

# Create non-root user
RUN useradd -r -u 1001 -m -s /bin/bash dbal || \
    useradd -m -s /bin/bash dbal

# Copy binary from builder
COPY --from=builder /dbal/build/dbal_daemon /app/dbal_daemon

# Create data directories
RUN mkdir -p /app/data/blobs

# Default config (overridden by docker-compose env vars + mounted config)
RUN echo "# DBAL Configuration" > /app/config.yaml

# Environment defaults
ENV DBAL_BIND_ADDRESS=0.0.0.0 \
    DBAL_PORT=8080 \
    DBAL_LOG_LEVEL=info \
    DBAL_MODE=production \
    DBAL_CONFIG=/app/config.yaml \
    DBAL_SCHEMA_DIR=/app/schemas/entities \
    DBAL_TEMPLATE_DIR=/app/templates/sql \
    DBAL_BLOB_BACKEND=filesystem \
    DBAL_BLOB_ROOT=/app/data/blobs

VOLUME ["/app/data/blobs"]

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${DBAL_PORT}/health || exit 1

RUN chown -R dbal:dbal /app
USER dbal

CMD ["sh", "-c", "./dbal_daemon --bind ${DBAL_BIND_ADDRESS} --port ${DBAL_PORT} --mode ${DBAL_MODE} --config ${DBAL_CONFIG} --daemon"]

#!/bin/bash
# Two-part Docker build for C++ projects
set -euo pipefail

PROJECT="${1:-dbal}"

echo "=== MetaBuilder Docker Conan Build ==="
echo "Project: $PROJECT"
echo ""

# Part 1: Build Conan cache (if needed)
if ! docker image inspect metabuilder/conan-cache:latest >/dev/null 2>&1; then
    echo "Part 1: Building Conan cache (25-30 min, one-time)..."
    docker build -f Dockerfile.conan-cache -t metabuilder/conan-cache:latest .
else
    echo "Part 1: Conan cache exists (skipping)"
fi

# Part 2: Build application
echo ""
echo "Part 2: Building $PROJECT (2-3 min)..."
cd ..
docker build -f dockerconan/Dockerfile.app \
    --build-arg PROJECT=$PROJECT \
    -t metabuilder/$PROJECT:latest \
    .

echo ""
echo "=== Build Complete ==="
echo "Image: metabuilder/$PROJECT:latest"
echo "Run: docker run -d -p 8080:8080 metabuilder/$PROJECT:latest"

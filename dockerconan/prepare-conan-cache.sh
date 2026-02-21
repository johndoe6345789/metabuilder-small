#!/bin/bash
# Prepare Conan cache for Docker build
# This script copies your local .conan2 cache to speed up Docker image builds

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/.conan2-cache"

echo "🔍 Checking for local Conan cache..."

if [ -d "$HOME/.conan2" ]; then
    echo "✅ Found Conan cache at $HOME/.conan2"
    
    # Calculate size
    CACHE_SIZE=$(du -sh "$HOME/.conan2" | cut -f1)
    echo "📦 Cache size: $CACHE_SIZE"
    
    # Ask user
    echo ""
    echo "Copy Conan cache to Docker build context?"
    echo "  This will:"
    echo "  - Speed up Docker image builds (packages already cached)"
    echo "  - Increase build context size temporarily"
    echo "  - Take a few minutes to copy"
    echo ""
    read -p "Copy cache? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📋 Copying Conan cache..."
        
        # Remove old cache copy if exists
        if [ -d "$CACHE_DIR" ]; then
            echo "🗑️  Removing old cache copy..."
            rm -rf "$CACHE_DIR"
        fi
        
        # Copy cache
        mkdir -p "$CACHE_DIR"
        rsync -a --info=progress2 "$HOME/.conan2/" "$CACHE_DIR/"
        
        echo "✅ Conan cache copied successfully!"
        echo ""
        echo "Now build Docker image with:"
        echo "  cd dockerconan"
        echo "  docker-compose build --build-arg COPY_CONAN_CACHE=1"
    else
        echo "⏭️  Skipping cache copy"
        echo ""
        echo "Build Docker image normally with:"
        echo "  cd dockerconan"
        echo "  docker-compose build"
    fi
else
    echo "❌ No Conan cache found at $HOME/.conan2"
    echo ""
    echo "This is normal if you haven't run Conan locally."
    echo "The Docker image will download packages on first use."
    echo ""
    echo "Build Docker image with:"
    echo "  cd dockerconan"
    echo "  docker-compose build"
fi

echo ""
echo "ℹ️  Note: You can delete .conan2-cache/ after building the image"

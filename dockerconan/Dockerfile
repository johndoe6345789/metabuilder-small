# Docker Dev Container for MetaBuilder C++ Development
# Uses metabuilder/devcontainer — all tools, compilers, Conan packages,
# Node, Python, Rust, Go, Android SDK, and Mesa 3D pre-installed.
#
# Prerequisites: run deployment/build-base-images.sh devcontainer first.
FROM metabuilder/devcontainer:latest

WORKDIR /workspace

# Set up git config (will be overridden by user's .gitconfig mount)
RUN git config --global --add safe.directory /workspace

# Configure ccache
ENV CCACHE_DIR=/workspace/.ccache
ENV CMAKE_C_COMPILER_LAUNCHER=ccache
ENV CMAKE_CXX_COMPILER_LAUNCHER=ccache

# Set up shell
RUN chsh -s /bin/zsh
ENV SHELL=/bin/zsh

# Install oh-my-zsh for better dev experience
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" || true

# Create helpful aliases
RUN echo 'alias ll="ls -lah"' >> ~/.zshrc && \
    echo 'alias ctest="ctest --output-on-failure"' >> ~/.zshrc && \
    echo 'alias ninja-build="ninja -C _build"' >> ~/.zshrc && \
    echo 'alias conan-install="conan install . --build=missing"' >> ~/.zshrc

# Expose common ports
EXPOSE 8080 3000 5432

# Default command (keep container running for development)
CMD ["/bin/zsh"]

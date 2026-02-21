# Docker Dev Container

**Code = Doc**: All documentation is in `dev-container.py`

---

## Quick Start

```bash
# See all commands
./dev-container.py --help

# Quick start
./dev-container.py start --build --shell

# Build DBAL
./dev-container.py build-dbal

# Run DBAL
./dev-container.py run-dbal
```

---

## Features

- GCC 12 + Clang 15
- Conan 2.x + CMake + Ninja
- Python 3, Node.js 20, Rust, Go 1.21
- PostgreSQL 15
- VS Code integration
- Persistent caches

---

**Documentation**: Run `./dev-container.py --help`

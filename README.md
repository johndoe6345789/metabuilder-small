# MetaBuilder - Universal Platform

**Philosophy**: 95% JSON/YAML configuration, 5% TypeScript/C++ infrastructure

**Code = Doc**: All documentation is in self-documenting Python scripts.

---

## Quick Start

```bash
# See all commands
./metabuilder.py --help

# Quick start (all services)
./metabuilder.py quick-start

# C++ development
./metabuilder.py dev start --build --shell

# Run tests
./metabuilder.py test run comprehensive

# Check status
./metabuilder.py status
```

---

## Project Structure

| Component | Script | Purpose |
|-----------|--------|---------|
| **Root** | `./metabuilder.py` | Main entry point |
| **C++ Dev** | `./metabuilder.py dev` | Docker dev container |
| **Tests** | `./metabuilder.py test` | WorkflowUI E2E tests |

---

## Documentation = Code

All documentation is self-documenting Python scripts with argparse:

- **Main**: `./metabuilder.py --help`
- **Dev Container**: `./metabuilder.py dev --help`
- **Tests**: `./metabuilder.py test --help`

No separate documentation files - the code IS the documentation.

---

## Key Directories

```
metabuilder/
├── metabuilder.py          # Main entry point (CODE = DOC)
├── dockerconan/            # C++ dev container
│   └── dev-container.py    # Dev container manager (CODE = DOC)
├── workflowui/             # Workflow UI (Next.js + React)
│   └── test-server/
│       └── test-runner.py  # Test runner (CODE = DOC)
├── dbal/                   # Database Abstraction Layer
├── workflow/               # DAG workflow engine
├── fakemui/                # Material Design 3 components
├── CLAUDE.md               # AI assistant guide
└── txt/                    # Completion reports
```

---

## Development

```bash
# C++ development
./metabuilder.py dev start --build --shell
./metabuilder.py dev build-dbal

# Frontend development
cd workflowui
npm run dev

# Run tests
./metabuilder.py test run comprehensive --ui

# View test report
./metabuilder.py test report
```

---

**Status**: Production-Ready ✅  
**Last Updated**: 2026-02-06  
**Scale**: 27,826+ files across 34 directories

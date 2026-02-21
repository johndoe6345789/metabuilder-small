#!/usr/bin/env python3
"""
MetaBuilder - Universal Platform Manager
Self-documenting project management script

Code = Doc: This script IS the documentation.
Run with --help to see all commands.
"""

import argparse
import subprocess
import sys
from pathlib import Path

def run_cmd(cmd, cwd=None, check=True):
    """Run shell command"""
    result = subprocess.run(cmd, shell=True, cwd=cwd, check=check)
    return result.returncode == 0

def run_subcommand(script, args):
    """Run a subproject's script"""
    script_path = Path(__file__).parent / script
    if not script_path.exists():
        print(f"❌ Script not found: {script}")
        return False
    
    cmd = f"python3 {script_path} {args}"
    return run_cmd(cmd, check=False)

def main():
    parser = argparse.ArgumentParser(
        description="MetaBuilder Universal Platform Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Project Structure:
  dockerconan/          - C++ dev container (./dockerconan/dev-container.py)
  workflowui/           - Workflow UI (./workflowui/test-server/test-runner.py)
  dbal/                 - Database Abstraction Layer
  workflow/             - DAG workflow engine
  fakemui/              - Material Design 3 components
  codegen/              - CodeForge IDE (./codegen/codegen.py)
  pastebin/             - Code snippet sharing (./pastebin/pastebin.py)
  gameengine/           - SDL3/bgfx engine (./gameengine/gameengine.py)
  postgres/             - PostgreSQL dashboard (./postgres/postgres.py)
  mojo/                 - Mojo compiler (./mojo/mojo.py)

Examples:
  # Start C++ dev container
  %(prog)s dev start --build --shell

  # Run WorkflowUI tests
  %(prog)s test run comprehensive

  # Build DBAL daemon
  %(prog)s dev build-dbal

  # View test report
  %(prog)s test report

  # Quick start (all services)
  %(prog)s quick-start

For detailed help on each component:
  %(prog)s dev --help
  %(prog)s test --help

For subproject-specific commands:
  ./codegen/codegen.py --help
  ./pastebin/pastebin.py --help
  ./gameengine/gameengine.py --help
  ./postgres/postgres.py --help
  ./mojo/mojo.py --help
        """
    )
    
    subparsers = parser.add_subparsers(dest="component", help="Component to manage")
    
    # dev (dockerconan)
    dev_parser = subparsers.add_parser("dev", help="C++ dev container (dockerconan/)")
    dev_parser.add_argument("dev_args", nargs="*", help="Arguments for dev-container.py")
    
    # test (workflowui)
    test_parser = subparsers.add_parser("test", help="WorkflowUI tests")
    test_parser.add_argument("test_args", nargs="*", help="Arguments for test-runner.py")
    
    # quick-start
    subparsers.add_parser("quick-start", help="Start all services (dev + workflowui + tests)")
    
    # status
    subparsers.add_parser("status", help="Show status of all services")
    
    args = parser.parse_args()
    
    if not args.component:
        parser.print_help()
        return 0
    
    try:
        if args.component == "dev":
            arg_str = " ".join(args.dev_args) if args.dev_args else "--help"
            return 0 if run_subcommand("dockerconan/dev-container.py", arg_str) else 1
        
        elif args.component == "test":
            arg_str = " ".join(args.test_args) if args.test_args else "--help"
            return 0 if run_subcommand("workflowui/test-server/test-runner.py", arg_str) else 1
        
        elif args.component == "quick-start":
            print("🚀 Quick Start: Starting all services...")
            print("\n1️⃣  Starting C++ dev container...")
            run_subcommand("dockerconan/dev-container.py", "start --build")
            
            print("\n2️⃣  Starting WorkflowUI test infrastructure...")
            run_subcommand("workflowui/test-server/test-runner.py", "start-servers")
            
            print("\n3️⃣  Running health checks...")
            run_subcommand("workflowui/test-server/test-runner.py", "health")
            
            print("\n✅ Quick start complete!")
            print("\nNext steps:")
            print("  - Open shell: ./metabuilder.py dev shell")
            print("  - Run tests: ./metabuilder.py test run")
            print("  - View report: ./metabuilder.py test report")
        
        elif args.component == "status":
            print("📊 MetaBuilder Status\n")
            
            print("Docker Dev Container:")
            run_subcommand("dockerconan/dev-container.py", "status")
            
            print("\nWorkflowUI Servers:")
            run_subcommand("workflowui/test-server/test-runner.py", "health")
        
        return 0
    
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

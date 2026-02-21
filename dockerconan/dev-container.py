#!/usr/bin/env python3
"""
MetaBuilder Docker Dev Container Manager
Manage the C++ development container with simple commands
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path

def run_cmd(cmd, check=True, capture=False):
    """Run a shell command"""
    if capture:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result
    else:
        result = subprocess.run(cmd, shell=True, check=check)
        return result.returncode == 0

def prepare_cache():
    """Prepare Conan cache from host"""
    script_dir = Path(__file__).parent
    cache_script = script_dir / "prepare-conan-cache.sh"
    
    if not cache_script.exists():
        print("❌ prepare-conan-cache.sh not found")
        return False
    
    print("🔧 Preparing Conan cache...")
    return run_cmd(f"bash {cache_script}", check=False)

def build(with_cache=False, no_cache=False):
    """Build Docker image"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    cmd = "docker-compose build"
    
    if no_cache:
        cmd += " --no-cache"
    
    if with_cache:
        cmd += " --build-arg COPY_CONAN_CACHE=1"
    
    print(f"🏗️  Building Docker image...")
    print(f"   Command: {cmd}")
    return run_cmd(cmd)

def start(detach=True):
    """Start dev container"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    cmd = "docker-compose up"
    if detach:
        cmd += " -d"
    
    print("🚀 Starting dev container...")
    return run_cmd(cmd)

def stop():
    """Stop dev container"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("🛑 Stopping dev container...")
    return run_cmd("docker-compose down")

def shell(service="dev", sh="zsh"):
    """Open shell in container"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"🐚 Opening {sh} shell in {service} container...")
    return run_cmd(f"docker-compose exec {service} {sh}", check=False)

def logs(service="dev", follow=False):
    """View container logs"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    cmd = f"docker-compose logs {service}"
    if follow:
        cmd += " -f"
    
    print(f"📋 Viewing logs for {service}...")
    return run_cmd(cmd, check=False)

def status():
    """Check container status"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("📊 Container Status:")
    run_cmd("docker-compose ps", check=False)
    print("")
    print("💾 Volume Usage:")
    run_cmd("docker volume ls | grep metabuilder", check=False)

def clean(volumes=False):
    """Clean up containers and optionally volumes"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    cmd = "docker-compose down"
    if volumes:
        cmd += " -v"
        print("🗑️  Removing containers and volumes...")
    else:
        print("🗑️  Removing containers...")
    
    return run_cmd(cmd)

def exec_cmd(command, service="dev"):
    """Execute command in container"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"⚙️  Executing in {service}: {command}")
    return run_cmd(f'docker-compose exec {service} bash -c "{command}"', check=False)

def build_dbal():
    """Build DBAL daemon inside container"""
    print("🔨 Building DBAL daemon...")
    
    commands = [
        "cd /workspace",
        "conan install . --build=missing",
        "cmake --preset conan-debug",
        "cmake --build _build"
    ]
    
    for cmd in commands:
        print(f"   Running: {cmd}")
        if not exec_cmd(cmd):
            print(f"❌ Failed: {cmd}")
            return False
    
    print("✅ DBAL daemon built successfully")
    return True

def run_dbal():
    """Run DBAL daemon inside container"""
    print("🏃 Running DBAL daemon...")
    return exec_cmd("./_build/dbal-daemon")

def daemon(action="start", port=8080, detach=True):
    """Manage DBAL daemon (start/stop/restart/status)"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    if action == "stop":
        print("🛑 Stopping DBAL daemon...")
        return exec_cmd("pkill -9 dbal_daemon || true")

    elif action == "restart":
        print("🔄 Restarting DBAL daemon...")
        exec_cmd("pkill -9 dbal_daemon || true")
        import time
        time.sleep(2)
        return daemon(action="start", port=port, detach=detach)

    elif action == "status":
        print("📊 DBAL Daemon Status:")
        result = run_cmd(
            'docker-compose exec dev bash -c "ps aux | grep dbal_daemon | grep -v grep || echo \'Not running\'"',
            check=False,
            capture=True
        )
        print(result.stdout)
        return result.returncode == 0

    elif action == "start":
        daemon_log = "/tmp/daemon.log" if detach else "/dev/stdout"
        bg_char = "&" if detach else ""

        print(f"🚀 Starting DBAL daemon on port {port}...")
        cmd = f"cd /workspace/dbal/production/build-config/build && nohup ./dbal_daemon --daemon --port {port} --bind 0.0.0.0 > {daemon_log} 2>&1 {bg_char}"
        return exec_cmd(cmd)

def test(pattern="", verbose=True, service="dev"):
    """Run integration tests"""
    print("🧪 Running integration tests...")

    flags = "-v" if verbose else ""
    test_filter = f"-k {pattern}" if pattern else ""

    cmd = f"cd /workspace/dbal/production && pytest tests/integration/test_api_endpoints.py {flags} {test_filter}"
    return exec_cmd(cmd, service=service)

def rebuild(jobs=4):
    """Quick rebuild of C++ DBAL daemon"""
    print(f"🔨 Rebuilding DBAL daemon (parallel jobs: {jobs})...")
    cmd = f"cd /workspace/dbal/production/build-config/build && cmake --build . --parallel {jobs}"
    return exec_cmd(cmd)

def logs_daemon(lines=50, follow=False):
    """View DBAL daemon logs"""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    cmd_prefix = "docker-compose exec dev bash -c"

    if follow:
        print("📋 Following daemon logs (Ctrl+C to stop)...")
        log_cmd = f'{cmd_prefix} "tail -f /tmp/daemon.log"'
    else:
        print(f"📋 Last {lines} lines of daemon logs:")
        log_cmd = f'{cmd_prefix} "tail -{lines} /tmp/daemon.log"'

    return run_cmd(log_cmd, check=False)

def cmake_clean():
    """Clean CMake build directory"""
    print("🧹 Cleaning CMake build directory...")
    return exec_cmd("cd /workspace/dbal/production/build-config && rm -rf build && mkdir -p build")

def conan_clean():
    """Clean Conan cache inside container"""
    print("🧹 Cleaning Conan cache...")
    return exec_cmd("conan remove '*' --confirm")

def quick_cycle():
    """Quick development cycle: rebuild + restart daemon + run tests"""
    print("🔄 Quick Development Cycle")
    print("=" * 50)

    if not rebuild():
        print("❌ Build failed")
        return False

    if not daemon(action="restart"):
        print("❌ Daemon restart failed")
        return False

    # Give daemon time to start
    import time
    time.sleep(3)

    if not test():
        print("❌ Tests failed")
        return False

    print("=" * 50)
    print("✅ Quick cycle completed successfully!")
    return True

def test_matrix(backend="all", stop_on_fail=False):
    """Run integration tests across all database backends"""
    print("🎯 DBAL Multi-Backend Test Matrix")

    cmd = f"cd /workspace/dbal/production/tests/integration && python3 test_matrix.py --backend {backend}"

    if stop_on_fail:
        cmd += " --stop-on-fail"

    return exec_cmd(cmd)

def main():
    parser = argparse.ArgumentParser(
        description="MetaBuilder Docker Dev Container Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick start (build + start + enter shell)
  %(prog)s start --build --shell

  # Build with host Conan cache
  %(prog)s build --with-cache

  # Build DBAL daemon
  %(prog)s build-dbal

  # Enter shell
  %(prog)s shell

  # View logs
  %(prog)s logs --follow

  # Clean up
  %(prog)s clean --volumes

DBAL Development Commands:
  # Quick development cycle (rebuild + restart + test)
  %(prog)s quick-cycle

  # Rebuild C++ code
  %(prog)s rebuild -j 8

  # Start DBAL daemon
  %(prog)s daemon start --port 8080

  # Stop DBAL daemon
  %(prog)s daemon stop

  # Restart DBAL daemon
  %(prog)s daemon restart

  # Check daemon status
  %(prog)s daemon status

  # Run all tests
  %(prog)s test

  # Run specific test
  %(prog)s test -k test_health

  # View daemon logs
  %(prog)s logs-daemon -n 100
  %(prog)s logs-daemon --follow

  # Clean build directory
  %(prog)s cmake-clean

  # Clean Conan cache
  %(prog)s conan-clean

  # Run tests across all backends
  %(prog)s test-matrix
  %(prog)s test-matrix --backend postgres
  %(prog)s test-matrix --stop-on-fail
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # prepare-cache
    subparsers.add_parser("prepare-cache", help="Copy host Conan cache to speed up builds")
    
    # build
    build_parser = subparsers.add_parser("build", help="Build Docker image")
    build_parser.add_argument("--with-cache", action="store_true", help="Include host Conan cache")
    build_parser.add_argument("--no-cache", action="store_true", help="Build without Docker cache")
    
    # start
    start_parser = subparsers.add_parser("start", help="Start dev container")
    start_parser.add_argument("--attach", action="store_true", help="Attach to logs (default: detached)")
    start_parser.add_argument("--build", action="store_true", help="Build before starting")
    start_parser.add_argument("--shell", action="store_true", help="Open shell after starting")
    
    # stop
    subparsers.add_parser("stop", help="Stop dev container")
    
    # shell
    shell_parser = subparsers.add_parser("shell", help="Open shell in container")
    shell_parser.add_argument("--service", default="dev", help="Service name (default: dev)")
    shell_parser.add_argument("--sh", default="zsh", help="Shell to use (default: zsh)")
    
    # logs
    logs_parser = subparsers.add_parser("logs", help="View container logs")
    logs_parser.add_argument("--service", default="dev", help="Service name (default: dev)")
    logs_parser.add_argument("-f", "--follow", action="store_true", help="Follow log output")
    
    # status
    subparsers.add_parser("status", help="Check container status")
    
    # clean
    clean_parser = subparsers.add_parser("clean", help="Clean up containers")
    clean_parser.add_argument("-v", "--volumes", action="store_true", help="Remove volumes too")
    
    # exec
    exec_parser = subparsers.add_parser("exec", help="Execute command in container")
    exec_parser.add_argument("exec_command", nargs="+", help="Command to execute")
    exec_parser.add_argument("--service", default="dev", help="Service name (default: dev)")
    
    # build-dbal
    subparsers.add_parser("build-dbal", help="Build DBAL daemon inside container")
    
    # run-dbal
    subparsers.add_parser("run-dbal", help="Run DBAL daemon inside container")

    # daemon
    daemon_parser = subparsers.add_parser("daemon", help="Manage DBAL daemon (start/stop/restart/status)")
    daemon_parser.add_argument("action", choices=["start", "stop", "restart", "status"], help="Daemon action")
    daemon_parser.add_argument("--port", type=int, default=8080, help="Port for daemon (default: 8080)")
    daemon_parser.add_argument("--attach", action="store_true", help="Attach to daemon output (default: detached)")

    # test
    test_parser = subparsers.add_parser("test", help="Run integration tests")
    test_parser.add_argument("-k", "--pattern", default="", help="Test pattern filter")
    test_parser.add_argument("-q", "--quiet", action="store_true", help="Quiet output (no verbose)")
    test_parser.add_argument("--service", default="dev", help="Service name (default: dev)")

    # rebuild
    rebuild_parser = subparsers.add_parser("rebuild", help="Quick rebuild of C++ DBAL daemon")
    rebuild_parser.add_argument("-j", "--jobs", type=int, default=4, help="Parallel jobs (default: 4)")

    # logs-daemon
    logs_daemon_parser = subparsers.add_parser("logs-daemon", help="View DBAL daemon logs")
    logs_daemon_parser.add_argument("-n", "--lines", type=int, default=50, help="Number of lines (default: 50)")
    logs_daemon_parser.add_argument("-f", "--follow", action="store_true", help="Follow log output")

    # cmake-clean
    subparsers.add_parser("cmake-clean", help="Clean CMake build directory")

    # conan-clean
    subparsers.add_parser("conan-clean", help="Clean Conan cache inside container")

    # quick-cycle
    subparsers.add_parser("quick-cycle", help="Quick dev cycle: rebuild + restart daemon + run tests")

    # test-matrix
    test_matrix_parser = subparsers.add_parser("test-matrix", help="Run tests across all database backends")
    test_matrix_parser.add_argument(
        "--backend",
        choices=[
            "all", "sqlite", "sqlite_file", "postgres", "mysql", "mongodb",
            "prisma_postgres", "supabase_rest", "supabase_postgres",
            "cockroachdb", "redis", "cassandra", "mariadb", "surrealdb",
            "elasticsearch"
        ],
        default="all",
        help="Backend to test (default: all - 14 backends)"
    )
    test_matrix_parser.add_argument("--stop-on-fail", action="store_true", help="Stop on first failure")

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    # Execute command
    try:
        if args.command == "prepare-cache":
            prepare_cache()
        
        elif args.command == "build":
            build(with_cache=args.with_cache, no_cache=args.no_cache)
        
        elif args.command == "start":
            if args.build:
                build()
            start(detach=not args.attach)
            if args.shell:
                shell()
        
        elif args.command == "stop":
            stop()
        
        elif args.command == "shell":
            shell(service=args.service, sh=args.sh)
        
        elif args.command == "logs":
            logs(service=args.service, follow=args.follow)
        
        elif args.command == "status":
            status()
        
        elif args.command == "clean":
            clean(volumes=args.volumes)
        
        elif args.command == "exec":
            exec_cmd(" ".join(args.exec_command), service=args.service)
        
        elif args.command == "build-dbal":
            build_dbal()
        
        elif args.command == "run-dbal":
            run_dbal()

        elif args.command == "daemon":
            daemon(action=args.action, port=args.port, detach=not args.attach)

        elif args.command == "test":
            test(pattern=args.pattern, verbose=not args.quiet, service=args.service)

        elif args.command == "rebuild":
            rebuild(jobs=args.jobs)

        elif args.command == "logs-daemon":
            logs_daemon(lines=args.lines, follow=args.follow)

        elif args.command == "cmake-clean":
            cmake_clean()

        elif args.command == "conan-clean":
            conan_clean()

        elif args.command == "quick-cycle":
            quick_cycle()

        elif args.command == "test-matrix":
            test_matrix(backend=args.backend, stop_on_fail=args.stop_on_fail)

        return 0
    
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from datetime import datetime
import sqlite3
import json
import os
import threading
import uuid
import time
import select
import base64
import secrets
import smtplib
from email.message import EmailMessage
from functools import wraps
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import docker as _docker_lib
import requests as _http

app = Flask(__name__)

ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '*')
if ALLOWED_ORIGINS == '*':
    CORS(app, 
         origins='*',
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=False)
else:
    origins_list = [origin.strip() for origin in ALLOWED_ORIGINS.split(',')]
    CORS(app, 
         origins=origins_list,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)

DATABASE_PATH = os.environ.get('DATABASE_PATH', '/app/data/snippets.db')
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

JWT_SECRET   = os.environ.get('JWT_SECRET_KEY', 'changeme-in-production')
SMTP_HOST    = os.environ.get('SMTP_HOST', 'smtp-relay')
SMTP_PORT    = int(os.environ.get('SMTP_PORT', '2525'))
MAIL_FROM    = os.environ.get('MAIL_FROM', 'noreply@codesnippet.local')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost/pastebin')

DBAL_BASE_URL    = os.environ.get('DBAL_BASE_URL', '').rstrip('/')
DBAL_TENANT_ID   = os.environ.get('DBAL_TENANT_ID', 'pastebin')
DBAL_ADMIN_TOKEN = os.environ.get('DBAL_ADMIN_TOKEN', '')
# Seed data (Default + Examples namespaces, 5 snippets) is now handled by the
# DBAL C++ workflow engine via event_config.yaml → on_user_created.json.


def dbal_request(method: str, path: str, json_body=None):
    """Call DBAL REST API with admin token. Non-fatal on any error."""
    if not DBAL_BASE_URL:
        return None
    headers = {'Content-Type': 'application/json'}
    if DBAL_ADMIN_TOKEN:
        headers['Authorization'] = f'Bearer {DBAL_ADMIN_TOKEN}'
    try:
        r = _http.request(method, f'{DBAL_BASE_URL}{path}',
                          json=json_body, headers=headers, timeout=5)
        return r
    except Exception as exc:
        print(f'[dbal] {method} {path} — {exc}', flush=True)
        return None


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        token = header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            g.user_id = payload['sub']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

# ---------------------------------------------------------------------------
# Docker-based multi-language runner
# ---------------------------------------------------------------------------

# Mount the Docker socket into the Flask container to enable spawning runners:
#   -v /var/run/docker.sock:/var/run/docker.sock
_RUN_TIMEOUT_S   = int(os.environ.get('PYTHON_RUN_TIMEOUT', '10'))
_BUILD_TIMEOUT_S = int(os.environ.get('BUILD_TIMEOUT', '120'))

# Shared kwargs for every runner container
_CONTAINER_KWARGS: dict = dict(
    network_disabled=True,
    mem_limit='256m',
    nano_cpus=int(0.5e9),   # 0.5 CPUs
    pids_limit=64,
)

# Language runner dispatch table
_RUNNERS: dict = {
    'python': {
        'image':         lambda: os.environ.get('PYTHON_RUNNER_IMAGE', 'python:3.11-slim'),
        'interactive':   True,
        'setup_tpl':     'cd /workspace && pip install -r requirements.txt -q 2>/dev/null || true',
        'run_tpl':       'python -u /workspace/{entry}',
        'default_entry': 'main.py',
    },
    'java-maven': {
        'image':         lambda: os.environ.get('JAVA_MAVEN_RUNNER_IMAGE', 'maven:3.9-eclipse-temurin-21'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && mvn -q compile exec:java -Dexec.mainClass={entry}',
        'default_entry': 'Main',
    },
    'java-gradle': {
        'image':         lambda: os.environ.get('JAVA_GRADLE_RUNNER_IMAGE', 'gradle:8.6-jdk21'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && gradle -q run',
        'default_entry': 'main',
    },
    'javascript': {
        'image':         lambda: os.environ.get('NODE_RUNNER_IMAGE', 'node:20-slim'),
        'interactive':   False,
        'setup_tpl':     'cd /workspace && ([ -f package.json ] && npm install --silent 2>/dev/null || true)',
        'run_tpl':       'node /workspace/{entry}',
        'default_entry': 'index.js',
    },
    'cpp-cmake': {
        'image':         lambda: os.environ.get('CPP_RUNNER_IMAGE', 'cpp-runner:latest'),
        'dockerfile':    os.path.join(os.path.dirname(__file__), 'runners', 'Dockerfile.cpp'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       (
            'cd /workspace && '
            '([ -f conanfile.txt ] && conan install . --output-folder=build --build=missing '
            '-s build_type=Release -q 2>/dev/null || true) && '
            'cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release '
            '-DCMAKE_CXX_FLAGS="-include cmath -include cstdlib" '
            '$([ -f build/conan_toolchain.cmake ] && echo -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake) && '
            'ninja -C build && ./build/{entry}'
        ),
        'default_entry': 'app',
    },
    # ---------------------------------------------------------------------------
    # Additional language runners
    # ---------------------------------------------------------------------------
    'go': {
        'image':         lambda: os.environ.get('GO_RUNNER_IMAGE', 'golang:1.22-alpine'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && go run {entry}',
        'default_entry': 'main.go',
    },
    'rust': {
        'image':         lambda: os.environ.get('RUST_RUNNER_IMAGE', 'rust:1.77-slim'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && rustc {entry} -o /tmp/rustout 2>&1 && /tmp/rustout',
        'default_entry': 'main.rs',
    },
    'ruby': {
        'image':         lambda: os.environ.get('RUBY_RUNNER_IMAGE', 'ruby:3.3-slim'),
        'interactive':   False,
        'setup_tpl':     'cd /workspace && ([ -f Gemfile ] && bundle install -q 2>/dev/null || true)',
        'run_tpl':       'ruby /workspace/{entry}',
        'default_entry': 'main.rb',
    },
    'php': {
        'image':         lambda: os.environ.get('PHP_RUNNER_IMAGE', 'php:8.3-cli-alpine'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'php /workspace/{entry}',
        'default_entry': 'main.php',
    },
    'csharp': {
        'image':         lambda: os.environ.get('CSHARP_RUNNER_IMAGE', 'mcr.microsoft.com/dotnet/sdk:8.0'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && dotnet run --project . 2>&1',
        'default_entry': 'Program.cs',
    },
    'kotlin': {
        'image':         lambda: os.environ.get('KOTLIN_RUNNER_IMAGE', 'zenika/kotlin:2.0.0-jdk21'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && kotlinc {entry} -include-runtime -d /tmp/out.jar 2>/dev/null && java -jar /tmp/out.jar',
        'default_entry': 'main.kt',
    },
    'scala': {
        'image':         lambda: os.environ.get('SCALA_RUNNER_IMAGE', 'sbtscala/scala-sbt:eclipse-temurin-21.0.2_13_1.10.0_3.4.1'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'cd /workspace && scala {entry}',
        'default_entry': 'main.scala',
    },
    'haskell': {
        'image':         lambda: os.environ.get('HASKELL_RUNNER_IMAGE', 'haskell:9.8'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'runghc /workspace/{entry}',
        'default_entry': 'main.hs',
    },
    'r': {
        'image':         lambda: os.environ.get('R_RUNNER_IMAGE', 'r-base:4.4.1'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'Rscript /workspace/{entry}',
        'default_entry': 'main.R',
    },
    'julia': {
        'image':         lambda: os.environ.get('JULIA_RUNNER_IMAGE', 'julia:1.10-alpine3.19'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'julia /workspace/{entry}',
        'default_entry': 'main.jl',
    },
    'elixir': {
        'image':         lambda: os.environ.get('ELIXIR_RUNNER_IMAGE', 'elixir:1.16-slim'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'elixir /workspace/{entry}',
        'default_entry': 'main.exs',
    },
    'dart': {
        'image':         lambda: os.environ.get('DART_RUNNER_IMAGE', 'dart:3.4-sdk'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'dart run /workspace/{entry}',
        'default_entry': 'main.dart',
    },
    'lua': {
        'image':         lambda: os.environ.get('LUA_RUNNER_IMAGE', 'alpine:3.20'),
        'interactive':   False,
        'setup_tpl':     'apk add --no-cache lua5.4 -q 2>/dev/null',
        'run_tpl':       'lua5.4 /workspace/{entry}',
        'default_entry': 'main.lua',
    },
    'perl': {
        'image':         lambda: os.environ.get('PERL_RUNNER_IMAGE', 'perl:5.40-slim'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'perl /workspace/{entry}',
        'default_entry': 'main.pl',
    },
    'bash': {
        'image':         lambda: os.environ.get('BASH_RUNNER_IMAGE', 'bash:5.2-alpine3.20'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'bash /workspace/{entry}',
        'default_entry': 'script.sh',
    },
    'typescript': {
        'image':         lambda: os.environ.get('TS_RUNNER_IMAGE', 'node:20-slim'),
        'interactive':   False,
        'setup_tpl':     'cd /workspace && npm install -g tsx --silent 2>/dev/null || true',
        'run_tpl':       'tsx /workspace/{entry}',
        'default_entry': 'index.ts',
    },
    'swift': {
        'image':         lambda: os.environ.get('SWIFT_RUNNER_IMAGE', 'swift:5.10-slim'),
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       'swift /workspace/{entry}',
        'default_entry': 'main.swift',
    },
}

# Python snippet to decode FILES_PAYLOAD env var and write files to /workspace
_SETUP_FILES_PY = (
    'import os,json,base64;'
    'files=json.loads(base64.b64decode(os.environ["FILES_PAYLOAD"].encode()).decode());'
    'os.makedirs("/workspace",exist_ok=True);'
    '[open("/workspace/"+f["name"],"w").write(f["content"]) for f in files]'
)

_docker_client = None

def _docker() -> _docker_lib.DockerClient:
    global _docker_client
    if _docker_client is None:
        _docker_client = _docker_lib.from_env()
    return _docker_client


def _ensure_image(image_name: str, dockerfile: str | None = None) -> None:
    """Pull or build image if not present locally."""
    client = _docker()
    try:
        client.images.get(image_name)
        return  # already present
    except _docker_lib.errors.ImageNotFound:
        pass

    if dockerfile and os.path.exists(dockerfile):
        print(f'[ensure_image] Building {image_name} from {dockerfile} …', flush=True)
        client.images.build(
            path=os.path.dirname(dockerfile),
            dockerfile=os.path.basename(dockerfile),
            tag=image_name,
            rm=True,
        )
        print(f'[ensure_image] Built {image_name} successfully.', flush=True)
    else:
        print(f'[ensure_image] Pulling {image_name} …', flush=True)
        client.images.pull(image_name)


def _make_container_env(files: list) -> dict:
    """Encode files as base64 JSON for FILES_PAYLOAD env var."""
    payload = base64.b64encode(json.dumps(files).encode()).decode()
    return {'FILES_PAYLOAD': payload}


def _build_cmd(language: str, entry: str, interactive: bool = False) -> list:
    """Build the container command for the given language."""
    runner = _RUNNERS[language]
    write_files = f"python3 -c '{_SETUP_FILES_PY}'"
    run = runner['run_tpl'].format(entry=entry)
    setup = runner.get('setup_tpl')

    parts = [write_files]
    if setup:
        parts.append(setup)
    parts.append(run)

    full_cmd = ' && '.join(parts)
    if not interactive:
        timeout = _RUN_TIMEOUT_S if runner.get('interactive') else _BUILD_TIMEOUT_S
        return ['timeout', '--kill-after=2s', f'{timeout}s', 'bash', '-c', full_cmd]
    return ['bash', '-c', full_cmd]


def _parse_run_request(data: dict):
    """Return (language, files, entry_point) from request data.
    Supports new multi-file format {language, files, entryPoint} and legacy {code}."""
    language = (data.get('language') or 'python').lower()
    files = data.get('files') or []
    entry_point = data.get('entryPoint') or ''

    # Legacy backward compat: {code: "..."}
    if not files:
        code = (data.get('code') or '').strip()
        if code:
            runner = _RUNNERS.get(language, _RUNNERS['python'])
            default_entry = runner.get('default_entry', 'main.py')
            files = [{'name': default_entry, 'content': code}]
            if not entry_point:
                entry_point = default_entry

    if not entry_point and files:
        runner = _RUNNERS.get(language, _RUNNERS['python'])
        entry_point = runner.get('default_entry', files[0]['name'])

    # cpp-cmake: auto-inject a minimal CMakeLists.txt when one isn't provided
    if language == 'cpp-cmake':
        has_cmake = any(f['name'] == 'CMakeLists.txt' for f in files)
        if not has_cmake and files:
            cpp_entry = next((f['name'] for f in files if f['name'].endswith(('.cpp', '.cc', '.cxx'))), entry_point)
            exe_name = cpp_entry.rsplit('.', 1)[0] if '.' in cpp_entry else 'app'
            cmake_content = (
                f'cmake_minimum_required(VERSION 3.16)\n'
                f'project({exe_name})\n'
                f'set(CMAKE_CXX_STANDARD 17)\n'
                f'add_executable({exe_name} {cpp_entry})\n'
            )
            files = [{'name': 'CMakeLists.txt', 'content': cmake_content}] + list(files)
            entry_point = exe_name  # cmake runner uses exe name, not filename

    return language, files, entry_point or 'main.py'

# ---------------------------------------------------------------------------
# Interactive Python session store
# ---------------------------------------------------------------------------

# Sentinel written to stdout by the wrapper to signal an input() call.
# Uses null bytes so it cannot collide with normal print output.
_PROMPT_START = '\x00PROMPT:'
_PROMPT_END   = '\x00'

# Injected before interactive user code: overrides input() to emit the
# PROMPT sentinel on stdout then reads the response from stdin.
_INTERACTIVE_INPUT_PREAMBLE = (
    "def __isinp():\n"
    "    import sys as _s, builtins as _b\n"
    "    _ps = " + repr(_PROMPT_START) + "\n"
    "    _pe = " + repr(_PROMPT_END) + "\n"
    "    def _inp(prompt='', _sys=_s, _p0=_ps, _p1=_pe):\n"
    "        _sys.stdout.write(_p0 + str(prompt) + _p1 + '\\n')\n"
    "        _sys.stdout.flush()\n"
    "        return _sys.stdin.readline().rstrip('\\n')\n"
    "    _b.input = _inp\n"
    "    del _b, _s, _ps, _pe, _inp\n"
    "__isinp()\n"
    "del __isinp\n"
)

_SESSION_TTL = 120   # seconds
_sessions: dict = {}


class InteractiveSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.output: list = []   # {type: 'out'|'err'|'prompt'|'input-echo', text: str}
        self.done: bool = False
        self.waiting_for_input: bool = False
        self.created_at: float = time.time()
        self._container = None
        self._sock = None        # raw Docker attach socket

    def start(self, language: str, files: list, entry_point: str) -> None:
        runner = _RUNNERS[language]
        modified_files = list(files)
        # Inject input() override into the entry point file for interactive Python
        if runner.get('interactive'):
            for i, f in enumerate(modified_files):
                if f['name'] == entry_point:
                    modified_files[i] = {
                        'name': f['name'],
                        'content': _INTERACTIVE_INPUT_PREAMBLE + '\n' + f['content'],
                    }
                    break
        self._container = _docker().containers.create(
            image=runner['image'](),
            command=_build_cmd(language, entry_point, interactive=True),
            stdin_open=True,
            tty=False,
            working_dir='/workspace',
            environment=_make_container_env(modified_files),
            **_CONTAINER_KWARGS,
        )
        self._container.start()
        attach = self._container.attach_socket(
            params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1}
        )
        self._sock = attach._sock
        threading.Thread(target=self._read_socket, daemon=True).start()

    def _read_socket(self) -> None:
        """Read Docker's multiplexed framing: 8-byte header + payload per frame."""
        buf = b''
        line_bufs = {1: '', 2: ''}   # 1=stdout, 2=stderr
        self._sock.setblocking(True)
        while True:
            try:
                chunk = self._sock.recv(4096)
            except OSError:
                break
            if not chunk:
                break
            buf += chunk
            while len(buf) >= 8:
                stream_type = buf[0]
                size = int.from_bytes(buf[4:8], 'big')
                if len(buf) < 8 + size:
                    break
                payload = buf[8:8 + size].decode('utf-8', errors='replace')
                buf = buf[8 + size:]
                if stream_type not in (1, 2):
                    continue
                line_bufs[stream_type] += payload
                while '\n' in line_bufs[stream_type]:
                    line, line_bufs[stream_type] = line_bufs[stream_type].split('\n', 1)
                    self._dispatch(stream_type, line)
        for stream_type, remaining in line_bufs.items():
            if remaining:
                self._dispatch(stream_type, remaining)
        self.done = True
        try:
            self._container.remove(force=True)
        except Exception:
            pass

    def _dispatch(self, stream_type: int, line: str) -> None:
        if stream_type == 2:
            self.output.append({'type': 'err', 'text': line + '\n'})
            return
        if line.startswith(_PROMPT_START) and line.endswith(_PROMPT_END):
            prompt_text = line[len(_PROMPT_START):-len(_PROMPT_END)]
            if prompt_text:
                self.output.append({'type': 'prompt', 'text': prompt_text})
            self.waiting_for_input = True
        else:
            self.output.append({'type': 'out', 'text': line + '\n'})

    def send_input(self, value: str) -> bool:
        if not self.waiting_for_input or not self._sock:
            return False
        self.output.append({'type': 'input-echo', 'text': value + '\n'})
        self.waiting_for_input = False
        self._sock.sendall((value + '\n').encode('utf-8'))
        return True

    def kill(self) -> None:
        try:
            if self._container:
                self._container.kill()
        except Exception:
            pass


def _reap_sessions() -> None:
    now = time.time()
    for sid, s in list(_sessions.items()):
        if now - s.created_at > _SESSION_TTL:
            s.kill()
            _sessions.pop(sid, None)

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _dbal_snippet(data: dict) -> dict:
    """Normalize a DBAL Snippet record to match the frontend JSON contract."""
    if data.get('inputParameters') and isinstance(data['inputParameters'], str):
        try:
            data['inputParameters'] = json.loads(data['inputParameters'])
        except Exception:
            data['inputParameters'] = None
    if data.get('files') and isinstance(data['files'], str):
        try:
            data['files'] = json.loads(data['files'])
        except Exception:
            data['files'] = None
    data['hasPreview'] = bool(data.get('hasPreview', False))
    data['isTemplate'] = bool(data.get('isTemplate', False))
    return data


def _snippet_body(data: dict, user_id: str, include_id: bool = True, include_created: bool = True) -> dict:
    """Build a DBAL Snippet body from request data."""
    body = {
        'title':           data['title'],
        'description':     data.get('description', ''),
        'code':            data['code'],
        'language':        data['language'],
        'category':        data.get('category', 'general'),
        'namespaceId':     data.get('namespaceId'),
        'hasPreview':      bool(data.get('hasPreview')),
        'functionName':    data.get('functionName'),
        'inputParameters': json.dumps(data['inputParameters']) if data.get('inputParameters') else None,
        'files':           json.dumps(data['files']) if data.get('files') is not None else None,
        'entryPoint':      data.get('entryPoint'),
        'isTemplate':      bool(data.get('isTemplate')),
        'updatedAt':       _ts(data.get('updatedAt')),
        'userId':          user_id,
        'tenantId':        DBAL_TENANT_ID,
    }
    if include_id:
        body['id'] = data['id']
    if include_created:
        body['createdAt'] = _ts(data.get('createdAt'))
    return body


def _dbal_all_pages(path_with_params: str, limit: int = 500) -> list:
    """Fetch all pages from a DBAL list endpoint, handling pagination."""
    results = []
    page = 1
    sep = '&' if '?' in path_with_params else '?'
    while True:
        r = dbal_request('GET', f'{path_with_params}{sep}limit={limit}&page={page}')
        if not r or not r.ok:
            break
        payload = r.json().get('data', {})
        batch = payload.get('data', [])
        results.extend(batch)
        if len(results) >= payload.get('total', 0):
            break
        page += 1
    return results


def _ts(value):
    """Coerce createdAt/updatedAt to integer milliseconds."""
    if isinstance(value, str):
        return int(datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp() * 1000)
    return value


def check_and_migrate_schema():
    conn = get_db()
    cursor = conn.cursor()

    # Auth tables — safe to CREATE IF NOT EXISTS
    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS user_auth (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id TEXT PRIMARY KEY,
            settings_json TEXT NOT NULL DEFAULT '{}',
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
    ''')

    # Migrate legacy `users` table → `user_auth` if it still exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if cursor.fetchone():
        print('[schema] Migrating users → user_auth…', flush=True)
        cursor.execute('''
            INSERT OR IGNORE INTO user_auth (id, username, password_hash)
            SELECT id, username, password_hash FROM users
        ''')
        cursor.execute('DROP TABLE users')
        conn.commit()
        print('[schema] Migration complete.', flush=True)

    # Drop legacy snippets/namespaces SQLite tables — now stored in DBAL
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='snippets'")
    if cursor.fetchone():
        cursor.execute("DROP TABLE snippets")
        print('[schema] Dropped legacy snippets table (now in DBAL)', flush=True)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='namespaces'")
    if cursor.fetchone():
        cursor.execute("DROP TABLE namespaces")
        print('[schema] Dropped legacy namespaces table (now in DBAL)', flush=True)

    conn.commit()
    conn.close()


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS user_auth (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id TEXT PRIMARY KEY,
            settings_json TEXT NOT NULL DEFAULT '{}',
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
    ''')
    conn.commit()
    conn.close()
    check_and_migrate_schema()


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user_id = str(uuid.uuid4())
    now = int(time.time() * 1000)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO user_auth (id, username, password_hash) VALUES (?, ?, ?)',
            (user_id, username, generate_password_hash(password))
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username already taken'}), 409
    conn.close()

    # Persist user profile to DBAL (non-fatal — auth secrets stay local)
    dbal_request('POST', f'/{DBAL_TENANT_ID}/core/User', {
        'id': user_id,
        'username': username,
        'email': f'{username}@codesnippet.local',
        'tenantId': DBAL_TENANT_ID,
    })

    # Namespaces + seed snippets are created by the DBAL workflow engine
    # (pastebin.User.created event → on_user_created.json workflow)

    token = jwt.encode(
        {'sub': user_id, 'exp': int(time.time()) + 7 * 86400},
        JWT_SECRET, algorithm='HS256'
    )
    return jsonify({'token': token, 'user': {'id': user_id, 'username': username}}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, password_hash FROM user_auth WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode(
        {'sub': user['id'], 'exp': int(time.time()) + 7 * 86400},
        JWT_SECRET, algorithm='HS256'
    )
    return jsonify({'token': token, 'user': {'id': user['id'], 'username': user['username']}})


@app.route('/api/auth/me', methods=['GET'])
@auth_required
def get_me():
    # Try DBAL first for the full user profile
    dbal_resp = dbal_request('GET', f'/{DBAL_TENANT_ID}/core/User/{g.user_id}')
    if dbal_resp and dbal_resp.status_code == 200:
        try:
            profile = dbal_resp.json()
            return jsonify({'id': profile.get('id', g.user_id), 'username': profile.get('username', '')})
        except Exception:
            pass

    # Fall back to local auth table
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username FROM user_auth WHERE id = ?', (g.user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user['id'], 'username': user['username']})


@app.route('/api/auth/settings', methods=['GET'])
@auth_required
def get_user_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT settings_json FROM user_settings WHERE user_id = ?', (g.user_id,))
    row = cursor.fetchone()
    conn.close()
    return jsonify(json.loads(row['settings_json']) if row else {})


@app.route('/api/auth/settings', methods=['PUT'])
@auth_required
def update_user_settings():
    data = request.json or {}
    now = int(time.time() * 1000)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO user_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?) '
        'ON CONFLICT(user_id) DO UPDATE SET settings_json=excluded.settings_json, updated_at=excluded.updated_at',
        (g.user_id, json.dumps(data), now)
    )
    conn.commit()
    conn.close()
    return jsonify(data)


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip()

    if username and email:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM user_auth WHERE username = ?', (username,))
        user = cursor.fetchone()
        if user:
            cursor.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', (user['id'],))
            token = secrets.token_urlsafe(32)
            cursor.execute(
                'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
                (token, user['id'], int(time.time()) + 3600)
            )
            conn.commit()
            reset_url = f'{APP_BASE_URL}/reset-password?token={token}'
            try:
                msg = EmailMessage()
                msg['From']    = MAIL_FROM
                msg['To']      = email
                msg['Subject'] = 'Password Reset — CodeSnippet'
                msg.set_content(
                    f'Hi {username},\n\n'
                    f'Reset your password here:\n\n{reset_url}\n\n'
                    f'This link expires in 1 hour. Ignore this email if you did not request it.'
                )
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
                    s.send_message(msg)
            except Exception as e:
                print(f'[forgot_password] SMTP error: {e}', flush=True)
        conn.close()
    return jsonify({'ok': True})  # always 200 — don't leak usernames


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    token        = data.get('token', '').strip()
    new_password = data.get('new_password', '')
    if not token or not new_password:
        return jsonify({'error': 'token and new_password required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?', (token,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Invalid or expired token'}), 400
    if int(time.time()) > row['expires_at']:
        cursor.execute('DELETE FROM password_reset_tokens WHERE token = ?', (token,))
        conn.commit()
        conn.close()
        return jsonify({'error': 'Token has expired'}), 400

    cursor.execute('UPDATE user_auth SET password_hash = ? WHERE id = ?',
                   (generate_password_hash(new_password), row['user_id']))
    cursor.execute('DELETE FROM password_reset_tokens WHERE token = ?', (token,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


# ---------------------------------------------------------------------------
# Snippet endpoints (auth required, user-scoped)
# ---------------------------------------------------------------------------

def _dbal_path(entity: str) -> str:
    return f'/{DBAL_TENANT_ID}/pastebin/{entity}'


# ---------------------------------------------------------------------------
# Snippet endpoints — backed by DBAL
# ---------------------------------------------------------------------------

@app.route('/api/snippets', methods=['GET'])
@auth_required
def get_snippets():
    items = _dbal_all_pages(f'{_dbal_path("Snippet")}?filter.userId={g.user_id}&sort.updatedAt=desc')
    return jsonify([_dbal_snippet(s) for s in items])


@app.route('/api/snippets/<snippet_id>', methods=['GET'])
@auth_required
def get_snippet(snippet_id):
    r = dbal_request('GET', f'{_dbal_path("Snippet")}/{snippet_id}')
    if not r:
        return jsonify({'error': 'Snippet not found'}), 404
    if r.status_code == 404:
        return jsonify({'error': 'Snippet not found'}), 404
    if not r.ok:
        return jsonify({'error': 'Failed to fetch snippet'}), 500
    snippet = r.json().get('data', {})
    if snippet.get('userId') != g.user_id:
        return jsonify({'error': 'Snippet not found'}), 404
    return jsonify(_dbal_snippet(snippet))


@app.route('/api/snippets', methods=['POST'])
@auth_required
def create_snippet():
    data = request.json
    required = ['title', 'code', 'language', 'category']
    if not data or any(k not in data or not data[k] for k in required):
        return jsonify({'error': 'title, code, language, and category are required'}), 400
    r = dbal_request('POST', _dbal_path('Snippet'), _snippet_body(data, g.user_id))
    if not r or not r.ok:
        return jsonify({'error': 'Failed to create snippet'}), 500
    result = r.json().get('data')
    if not result:
        return jsonify({'error': 'Failed to create snippet'}), 500
    return jsonify(_dbal_snippet(result)), 201


@app.route('/api/snippets/<snippet_id>', methods=['PUT'])
@auth_required
def update_snippet(snippet_id):
    data = request.json
    required = ['title', 'code', 'language']
    if not data or any(k not in data or not data[k] for k in required):
        return jsonify({'error': 'title, code, and language are required'}), 400
    # Ownership check
    check = dbal_request('GET', f'{_dbal_path("Snippet")}/{snippet_id}')
    if not check or not check.ok:
        return jsonify({'error': 'Snippet not found'}), 404
    if check.json().get('data', {}).get('userId') != g.user_id:
        return jsonify({'error': 'Snippet not found'}), 404
    body = _snippet_body(data, g.user_id, include_id=False, include_created=False)
    r = dbal_request('PUT', f'{_dbal_path("Snippet")}/{snippet_id}', body)
    if not r or not r.ok:
        return jsonify({'error': 'Failed to update snippet'}), 500
    return jsonify(_dbal_snippet(r.json().get('data', data)))


@app.route('/api/snippets/<snippet_id>', methods=['DELETE'])
@auth_required
def delete_snippet(snippet_id):
    check = dbal_request('GET', f'{_dbal_path("Snippet")}/{snippet_id}')
    if not check or not check.ok:
        return jsonify({'error': 'Snippet not found'}), 404
    if check.json().get('data', {}).get('userId') != g.user_id:
        return jsonify({'error': 'Snippet not found'}), 404
    r = dbal_request('DELETE', f'{_dbal_path("Snippet")}/{snippet_id}')
    if not r or not r.ok:
        return jsonify({'error': 'Failed to delete snippet'}), 500
    return jsonify({'success': True})


@app.route('/api/snippets/bulk-move', methods=['POST'])
@auth_required
def bulk_move_snippets():
    data = request.json or {}
    snippet_ids = data.get('snippetIds', [])
    target_ns   = data.get('targetNamespaceId')
    if not snippet_ids or not target_ns:
        return jsonify({'error': 'snippetIds and targetNamespaceId required'}), 400

    # Verify caller owns the target namespace
    ns_check = dbal_request('GET', f'{_dbal_path("Namespace")}/{target_ns}')
    if not ns_check or not ns_check.ok or ns_check.json().get('data', {}).get('userId') != g.user_id:
        return jsonify({'error': 'Target namespace not found'}), 404

    errors = []
    for sid in snippet_ids:
        # Fetch full snippet to verify ownership and build a complete PUT body
        sr = dbal_request('GET', f'{_dbal_path("Snippet")}/{sid}')
        if not sr or not sr.ok:
            errors.append(sid)
            continue
        snippet = sr.json().get('data', {})
        if snippet.get('userId') != g.user_id:
            errors.append(sid)
            continue
        # Update only namespaceId on the raw DBAL record; pass it directly to avoid
        # double-serializing inputParameters/files (they are already JSON strings).
        full = dict(snippet)
        full['namespaceId'] = target_ns
        r = dbal_request('PUT', f'{_dbal_path("Snippet")}/{sid}', full)
        if not r or not r.ok:
            errors.append(sid)
    if errors:
        return jsonify({'error': f'Failed to move {len(errors)} snippet(s)'}), 500
    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Namespace endpoints — backed by DBAL
# ---------------------------------------------------------------------------

@app.route('/api/namespaces', methods=['GET'])
@auth_required
def get_namespaces():
    items = _dbal_all_pages(f'{_dbal_path("Namespace")}?filter.userId={g.user_id}&sort.isDefault=desc&sort.name=asc')
    for ns in items:
        ns['isDefault'] = bool(ns.get('isDefault', False))
    return jsonify(items)


@app.route('/api/namespaces', methods=['POST'])
@auth_required
def create_namespace():
    data = request.json
    if not data or not data.get('name') or not str(data.get('name', '')).strip():
        return jsonify({'error': 'name is required'}), 400
    body = {
        'id':        data['id'],
        'name':      data['name'],
        'isDefault': bool(data.get('isDefault', False)),
        'createdAt': _ts(data.get('createdAt')),
        'userId':    g.user_id,
        'tenantId':  DBAL_TENANT_ID,
    }
    r = dbal_request('POST', _dbal_path('Namespace'), body)
    if not r or not r.ok:
        return jsonify({'error': 'Failed to create namespace'}), 500
    result = r.json().get('data', data)
    result['isDefault'] = bool(result.get('isDefault', False))
    return jsonify(result), 201


@app.route('/api/namespaces/<namespace_id>', methods=['DELETE'])
@auth_required
def delete_namespace(namespace_id):
    # Fetch the namespace and verify ownership
    check = dbal_request('GET', f'{_dbal_path("Namespace")}/{namespace_id}')
    if not check or not check.ok:
        return jsonify({'error': 'Namespace not found'}), 404
    ns = check.json().get('data', {})
    if ns.get('userId') != g.user_id:
        return jsonify({'error': 'Namespace not found'}), 404
    if ns.get('isDefault'):
        return jsonify({'error': 'Cannot delete default namespace'}), 400

    # Find default namespace to re-home orphaned snippets (filter in Python — isDefault is boolean)
    all_ns = _dbal_all_pages(f'{_dbal_path("Namespace")}?filter.userId={g.user_id}')
    default_ns_id = next((n['id'] for n in all_ns if n.get('isDefault')), None)

    # Move orphan snippets to default namespace
    snippets = _dbal_all_pages(f'{_dbal_path("Snippet")}?filter.namespaceId={namespace_id}')
    for sn in snippets:
        if sn.get('userId') != g.user_id:
            continue
        full = dict(sn)
        full['namespaceId'] = default_ns_id
        put = dbal_request('PUT', f'{_dbal_path("Snippet")}/{sn["id"]}', full)
        if not put or not put.ok:
            return jsonify({'error': 'Failed to move snippets before deletion'}), 500

    r = dbal_request('DELETE', f'{_dbal_path("Namespace")}/{namespace_id}')
    if not r or not r.ok:
        return jsonify({'error': 'Failed to delete namespace'}), 500
    return jsonify({'success': True})


@app.route('/api/namespaces/<namespace_id>', methods=['PUT'])
@auth_required
def update_namespace(namespace_id):
    data = request.json or {}
    check = dbal_request('GET', f'{_dbal_path("Namespace")}/{namespace_id}')
    if not check or not check.ok:
        return jsonify({'error': 'Namespace not found'}), 404
    ns = check.json().get('data', {})
    if ns.get('userId') != g.user_id:
        return jsonify({'error': 'Namespace not found'}), 404
    body = {
        'name':      data.get('name', ns['name']),
        'isDefault': bool(ns.get('isDefault', False)),
        'userId':    g.user_id,
        'tenantId':  DBAL_TENANT_ID,
    }
    r = dbal_request('PUT', f'{_dbal_path("Namespace")}/{namespace_id}', body)
    if not r or not r.ok:
        return jsonify({'error': 'Failed to update namespace'}), 500
    result = r.json().get('data', {})
    result['isDefault'] = bool(result.get('isDefault', False))
    return jsonify(result)


@app.route('/api/wipe', methods=['POST'])
@auth_required
def wipe_database():
    # Delete all snippets for this user (all pages)
    for snippet in _dbal_all_pages(f'{_dbal_path("Snippet")}?filter.userId={g.user_id}'):
        dbal_request('DELETE', f'{_dbal_path("Snippet")}/{snippet["id"]}')
    # Delete non-default namespaces (all pages)
    all_namespaces = _dbal_all_pages(f'{_dbal_path("Namespace")}?filter.userId={g.user_id}')
    for ns in all_namespaces:
        if not ns.get('isDefault'):
            dbal_request('DELETE', f'{_dbal_path("Namespace")}/{ns["id"]}')
    # Also delete the default namespace so ensureDefaultNamespace recreates exactly one
    for ns in all_namespaces:
        if ns.get('isDefault') and ns.get('userId') == g.user_id:
            dbal_request('DELETE', f'{_dbal_path("Namespace")}/{ns["id"]}')
    return jsonify({'success': True, 'message': 'User data wiped'})

@app.route('/api/run', methods=['POST'])
@auth_required
def run_code():
    data = request.get_json(force=True, silent=True) or {}
    print(f'[run_code] recv: language={data.get("language")!r} files_count={len(data.get("files") or [])} entryPoint={data.get("entryPoint")!r}', flush=True)
    language, files, entry_point = _parse_run_request(data)
    print(f'[run_code] parsed: language={language!r} entry={entry_point!r} files={[f["name"] for f in files]}', flush=True)
    if not files:
        return jsonify({'error': 'No code or files provided'}), 400
    if language not in _RUNNERS:
        return jsonify({'error': f'Unsupported language: {language}'}), 400

    runner = _RUNNERS[language]
    image_name = runner['image']()
    _ensure_image(image_name, runner.get('dockerfile'))
    wait_timeout = (_RUN_TIMEOUT_S + 5) if runner.get('interactive') else (_BUILD_TIMEOUT_S + 5)
    container = None
    try:
        container = _docker().containers.create(
            image=image_name,
            command=_build_cmd(language, entry_point),
            working_dir='/workspace',
            environment=_make_container_env(files),
            **_CONTAINER_KWARGS,
        )
        container.start()
        result = container.wait(timeout=wait_timeout)
        exit_code = result['StatusCode']
        stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
        stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')

        if exit_code == 124:
            return jsonify({'output': stdout, 'error': f'Timed out after {wait_timeout}s'}), 408
        return jsonify({'output': stdout, 'error': stderr if exit_code != 0 else None})

    except _docker_lib.errors.DockerException as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass

@app.route('/api/run/interactive', methods=['POST'])
@auth_required
def run_interactive():
    """Start an interactive session. Returns {session_id}."""
    _reap_sessions()
    data = request.get_json(force=True, silent=True) or {}
    print(f'[run_interactive] recv: language={data.get("language")!r} files_count={len(data.get("files") or [])}', flush=True)
    language, files, entry_point = _parse_run_request(data)
    if not files:
        return jsonify({'error': 'No code or files provided'}), 400
    if language not in _RUNNERS:
        return jsonify({'error': f'Unsupported language: {language}'}), 400

    runner = _RUNNERS[language]
    _ensure_image(runner['image'](), runner.get('dockerfile'))
    session_id = str(uuid.uuid4())
    session = InteractiveSession(session_id)
    _sessions[session_id] = session
    session.start(language, files, entry_point)
    return jsonify({'session_id': session_id}), 201


@app.route('/api/run/interactive/<session_id>/poll', methods=['GET'])
@auth_required
def poll_interactive(session_id):
    """Return new output lines since `offset` and current session state."""
    session = _sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    offset = int(request.args.get('offset', 0))
    return jsonify({
        'output': session.output[offset:],
        'waiting_for_input': session.waiting_for_input,
        'done': session.done,
    })


@app.route('/api/run/interactive/<session_id>/input', methods=['POST'])
@auth_required
def send_interactive_input(session_id):
    """Send one line of user input to the running session."""
    session = _sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    data = request.json or {}
    value = data.get('value', '')
    if not session.send_input(value):
        return jsonify({'error': 'Session is not waiting for input'}), 409
    return jsonify({'ok': True})


init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

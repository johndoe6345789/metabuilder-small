from flask import Flask, request, jsonify
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
import docker as _docker_lib

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
        'interactive':   False,
        'setup_tpl':     None,
        'run_tpl':       (
            'cd /workspace && '
            '([ -f conanfile.txt ] && conan install . --output-folder=build --build=missing '
            '-s build_type=Release -q 2>/dev/null || true) && '
            'cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release '
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

def check_and_migrate_schema():
    """Check if schema needs migration and perform it if necessary"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='namespaces'")
    namespaces_exists = cursor.fetchone() is not None
    
    cursor.execute("PRAGMA table_info(snippets)")
    columns = [row[1] for row in cursor.fetchall()]
    has_namespace_id = 'namespaceId' in columns
    
    if not namespaces_exists or not has_namespace_id:
        print("Schema migration needed - recreating tables with namespace support...")
        
        cursor.execute("DROP TABLE IF EXISTS snippets")
        cursor.execute("DROP TABLE IF EXISTS namespaces")
        
        cursor.execute('''
            CREATE TABLE namespaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                createdAt INTEGER NOT NULL,
                isDefault INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE snippets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                code TEXT NOT NULL,
                language TEXT NOT NULL,
                category TEXT NOT NULL,
                namespaceId TEXT,
                hasPreview INTEGER DEFAULT 0,
                functionName TEXT,
                inputParameters TEXT,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                FOREIGN KEY (namespaceId) REFERENCES namespaces(id)
            )
        ''')
        
        cursor.execute('''
            INSERT INTO namespaces (id, name, createdAt, isDefault)
            VALUES ('default', 'Default', ?, 1)
        ''', (int(datetime.utcnow().timestamp() * 1000),))
        
        conn.commit()
        print("Schema migration completed")
    
    conn.close()

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS namespaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            isDefault INTEGER DEFAULT 0
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            category TEXT NOT NULL,
            namespaceId TEXT,
            hasPreview INTEGER DEFAULT 0,
            functionName TEXT,
            inputParameters TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            FOREIGN KEY (namespaceId) REFERENCES namespaces(id)
        )
    ''')
    
    cursor.execute("SELECT COUNT(*) FROM namespaces WHERE isDefault = 1")
    default_count = cursor.fetchone()[0]
    
    if default_count == 0:
        cursor.execute('''
            INSERT INTO namespaces (id, name, createdAt, isDefault)
            VALUES ('default', 'Default', ?, 1)
        ''', (int(datetime.utcnow().timestamp() * 1000),))
    
    conn.commit()
    conn.close()
    
    check_and_migrate_schema()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/snippets', methods=['GET'])
def get_snippets():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM snippets ORDER BY updatedAt DESC')
        rows = cursor.fetchall()
        conn.close()
        
        snippets = []
        for row in rows:
            snippet = dict(row)
            if snippet.get('inputParameters'):
                try:
                    snippet['inputParameters'] = json.loads(snippet['inputParameters'])
                except:
                    snippet['inputParameters'] = None
            snippet['hasPreview'] = bool(snippet.get('hasPreview', 0))
            snippets.append(snippet)
        
        return jsonify(snippets)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snippets/<snippet_id>', methods=['GET'])
def get_snippet(snippet_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM snippets WHERE id = ?', (snippet_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Snippet not found'}), 404
        
        snippet = dict(row)
        if snippet.get('inputParameters'):
            try:
                snippet['inputParameters'] = json.loads(snippet['inputParameters'])
            except:
                snippet['inputParameters'] = None
        snippet['hasPreview'] = bool(snippet.get('hasPreview', 0))
        
        return jsonify(snippet)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snippets', methods=['POST'])
def create_snippet():
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        input_params_json = json.dumps(data.get('inputParameters')) if data.get('inputParameters') else None
        
        created_at = data.get('createdAt')
        if isinstance(created_at, str):
            created_at = int(datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp() * 1000)
        
        updated_at = data.get('updatedAt')
        if isinstance(updated_at, str):
            updated_at = int(datetime.fromisoformat(updated_at.replace('Z', '+00:00')).timestamp() * 1000)
        
        cursor.execute('''
            INSERT INTO snippets (id, title, description, code, language, category, namespaceId, hasPreview, functionName, inputParameters, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['title'],
            data.get('description', ''),
            data['code'],
            data['language'],
            data.get('category', 'general'),
            data.get('namespaceId'),
            1 if data.get('hasPreview') else 0,
            data.get('functionName'),
            input_params_json,
            created_at,
            updated_at
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify(data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snippets/<snippet_id>', methods=['PUT'])
def update_snippet(snippet_id):
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        input_params_json = json.dumps(data.get('inputParameters')) if data.get('inputParameters') else None
        
        updated_at = data.get('updatedAt')
        if isinstance(updated_at, str):
            updated_at = int(datetime.fromisoformat(updated_at.replace('Z', '+00:00')).timestamp() * 1000)
        
        cursor.execute('''
            UPDATE snippets
            SET title = ?, description = ?, code = ?, language = ?, category = ?, namespaceId = ?, hasPreview = ?, functionName = ?, inputParameters = ?, updatedAt = ?
            WHERE id = ?
        ''', (
            data['title'],
            data.get('description', ''),
            data['code'],
            data['language'],
            data.get('category', 'general'),
            data.get('namespaceId'),
            1 if data.get('hasPreview') else 0,
            data.get('functionName'),
            input_params_json,
            updated_at,
            snippet_id
        ))
        
        conn.commit()
        conn.close()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Snippet not found'}), 404
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/snippets/<snippet_id>', methods=['DELETE'])
def delete_snippet(snippet_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM snippets WHERE id = ?', (snippet_id,))
        conn.commit()
        conn.close()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Snippet not found'}), 404
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/namespaces', methods=['GET'])
def get_namespaces():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM namespaces ORDER BY isDefault DESC, name ASC')
        rows = cursor.fetchall()
        conn.close()
        
        namespaces = []
        for row in rows:
            namespace = dict(row)
            namespace['isDefault'] = bool(namespace.get('isDefault', 0))
            namespaces.append(namespace)
        
        return jsonify(namespaces)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/namespaces', methods=['POST'])
def create_namespace():
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        created_at = data.get('createdAt')
        if isinstance(created_at, str):
            created_at = int(datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp() * 1000)
        
        cursor.execute('''
            INSERT INTO namespaces (id, name, createdAt, isDefault)
            VALUES (?, ?, ?, ?)
        ''', (
            data['id'],
            data['name'],
            created_at,
            1 if data.get('isDefault') else 0
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify(data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/namespaces/<namespace_id>', methods=['DELETE'])
def delete_namespace(namespace_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT isDefault FROM namespaces WHERE id = ?', (namespace_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Namespace not found'}), 404
        
        if row['isDefault']:
            conn.close()
            return jsonify({'error': 'Cannot delete default namespace'}), 400
        
        cursor.execute('SELECT id FROM namespaces WHERE isDefault = 1')
        default_row = cursor.fetchone()
        default_id = default_row['id'] if default_row else 'default'
        
        cursor.execute('UPDATE snippets SET namespaceId = ? WHERE namespaceId = ?', (default_id, namespace_id))
        
        cursor.execute('DELETE FROM namespaces WHERE id = ?', (namespace_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/run', methods=['POST'])
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
    wait_timeout = (_RUN_TIMEOUT_S + 5) if runner.get('interactive') else (_BUILD_TIMEOUT_S + 5)
    container = None
    try:
        container = _docker().containers.create(
            image=runner['image'](),
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

    session_id = str(uuid.uuid4())
    session = InteractiveSession(session_id)
    _sessions[session_id] = session
    session.start(language, files, entry_point)
    return jsonify({'session_id': session_id}), 201


@app.route('/api/run/interactive/<session_id>/poll', methods=['GET'])
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


@app.route('/api/wipe', methods=['POST'])
def wipe_database():
    """Emergency endpoint to wipe and recreate the database"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("DROP TABLE IF EXISTS snippets")
        cursor.execute("DROP TABLE IF EXISTS namespaces")
        
        conn.commit()
        conn.close()
        
        init_db()
        
        return jsonify({'success': True, 'message': 'Database wiped and recreated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)

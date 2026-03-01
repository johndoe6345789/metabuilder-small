from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sqlite3
import json
import os
import subprocess
import sys
import threading
import uuid
import time

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
# Docker-based Python runner
# ---------------------------------------------------------------------------

# Each code execution runs in a disposable container with no network,
# capped memory, and a pids limit.  Mount the Docker socket into the
# Flask container to enable this:  -v /var/run/docker.sock:/var/run/docker.sock
_DOCKER_IMAGE = os.environ.get('PYTHON_RUNNER_IMAGE', 'python:3.11-slim')
_DOCKER_FLAGS = [
    '--network', 'none',
    '--memory', '128m',
    '--cpus', '0.5',
    '--pids-limit', '64',
]

def _docker_cmd(code: str, stdin: bool = False) -> list:
    """Build the docker run command list for executing Python code."""
    it_flag = ['-i'] if stdin else []
    return ['docker', 'run', '--rm'] + it_flag + _DOCKER_FLAGS + [_DOCKER_IMAGE, 'python', '-u', '-c', code]

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
    "    def _inp(prompt=''):\n"
    "        _s.stdout.write(_ps + str(prompt) + _pe + '\\n')\n"
    "        _s.stdout.flush()\n"
    "        return _s.stdin.readline().rstrip('\\n')\n"
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
        self._process: subprocess.Popen | None = None

    def start(self, code: str) -> None:
        src = _INTERACTIVE_INPUT_PREAMBLE + '\n' + code
        self._process = subprocess.Popen(
            _docker_cmd(src, stdin=True),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        threading.Thread(target=self._read_stdout, daemon=True).start()
        threading.Thread(target=self._read_stderr, daemon=True).start()

    def _read_stdout(self) -> None:
        assert self._process and self._process.stdout
        for raw in self._process.stdout:
            line = raw.rstrip('\n')
            if line.startswith(_PROMPT_START) and line.endswith(_PROMPT_END):
                prompt_text = line[len(_PROMPT_START):-len(_PROMPT_END)]
                if prompt_text:
                    self.output.append({'type': 'prompt', 'text': prompt_text})
                self.waiting_for_input = True
            else:
                self.output.append({'type': 'out', 'text': raw})
        self.done = True

    def _read_stderr(self) -> None:
        assert self._process and self._process.stderr
        for line in self._process.stderr:
            self.output.append({'type': 'err', 'text': line})

    def send_input(self, value: str) -> bool:
        if not self.waiting_for_input or not self._process:
            return False
        self.output.append({'type': 'input-echo', 'text': value + '\n'})
        self.waiting_for_input = False
        assert self._process.stdin
        self._process.stdin.write(value + '\n')
        self._process.stdin.flush()
        return True

    def kill(self) -> None:
        if self._process and self._process.poll() is None:
            self._process.kill()


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
def run_python():
    data = request.json or {}
    code = data.get('code', '').strip()
    if not code:
        return jsonify({'error': 'No code provided'}), 400
    try:
        result = subprocess.run(
            _docker_cmd(code),
            capture_output=True, text=True, timeout=15,
        )
        return jsonify({
            'output': result.stdout,
            'error': result.stderr if result.returncode != 0 else None,
        })
    except subprocess.TimeoutExpired:
        return jsonify({'output': '', 'error': 'Execution timed out (15s limit)'}), 408
    except FileNotFoundError:
        return jsonify({'error': 'Docker is not available on this server'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/run/interactive', methods=['POST'])
def run_interactive():
    """Start an interactive Python session. Returns {session_id}."""
    _reap_sessions()
    data = request.json or {}
    code = data.get('code', '').strip()
    if not code:
        return jsonify({'error': 'No code provided'}), 400

    session_id = str(uuid.uuid4())
    session = InteractiveSession(session_id)
    _sessions[session_id] = session
    session.start(code)
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

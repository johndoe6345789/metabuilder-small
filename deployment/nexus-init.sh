#!/bin/sh
# One-shot Nexus initialisation — runs inside the nexus-init container.
# Creates a Docker hosted repository on port 5000 and configures auth.
set -e

NEXUS_URL="${NEXUS_URL:-http://nexus:8081}"
NEW_PASS="${NEXUS_ADMIN_NEW_PASS:-nexus}"
DOCKER_PORT="${DOCKER_REPO_PORT:-5000}"
PASS_FILE="/nexus-data/admin.password"

log() { echo "[nexus-init] $*"; }

# ── Resolve admin password (idempotent across multiple runs) ─────────────────
# On first boot Nexus writes a random password to admin.password, then deletes
# it once changed. On re-runs the file is gone — try NEW_PASS directly.
if [ -f "$PASS_FILE" ]; then
  INIT_PASS=$(cat "$PASS_FILE")
  log "First run: changing admin password..."
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    "$NEXUS_URL/service/rest/v1/security/users/admin/change-password" \
    -u "admin:$INIT_PASS" -H "Content-Type: text/plain" -d "$NEW_PASS")
  case "$HTTP" in
    204) log "Admin password set to '$NEW_PASS'" ;;
    *)   log "ERROR: password change returned HTTP $HTTP"; exit 1 ;;
  esac
else
  # File gone = password already changed; verify we can authenticate
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$NEXUS_URL/service/rest/v1/status" -u "admin:$NEW_PASS")
  if [ "$HTTP" = "200" ]; then
    log "Already initialised, continuing with password '$NEW_PASS'"
  else
    log "ERROR: cannot authenticate (HTTP $HTTP) — is NEXUS_ADMIN_NEW_PASS correct?"
    exit 1
  fi
fi

AUTH="admin:$NEW_PASS"

# ── Enable anonymous pull access ─────────────────────────────────────────────
curl -sf -X PUT "$NEXUS_URL/service/rest/v1/security/anonymous" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"enabled":true,"userId":"anonymous","realmName":"NexusAuthorizingRealm"}'
log "Anonymous access enabled"

# ── Enable Docker Bearer Token realm ─────────────────────────────────────────
# Valid IDs: NexusAuthenticatingRealm, DockerToken, ConanToken, NpmToken, etc.
# NexusAuthorizingRealm is always-on and NOT configurable via this API.
curl -sf -X PUT "$NEXUS_URL/service/rest/v1/security/realms/active" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '["NexusAuthenticatingRealm","DockerToken"]'
log "Docker Bearer Token realm enabled"

# ── Create Docker hosted repository ─────────────────────────────────────────
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$NEXUS_URL/service/rest/v1/repositories/docker/hosted" \
  -u "$AUTH" -H "Content-Type: application/json" -d "$(cat <<JSON
{
  "name": "local",
  "online": true,
  "storage": {
    "blobStoreName": "default",
    "strictContentTypeValidation": true,
    "writePolicy": "allow"
  },
  "docker": {
    "v1Enabled": false,
    "forceBasicAuth": false,
    "httpPort": $DOCKER_PORT
  }
}
JSON
)")

case "$HTTP" in
  201) log "Docker hosted repo 'local' created on port $DOCKER_PORT" ;;
  400) log "Repo 'local' already exists, skipping" ;;
  *)   log "ERROR: repo creation returned HTTP $HTTP"; exit 1 ;;
esac

# ── Enable Conan Token realm ──────────────────────────────────────────────────
curl -sf -X PUT "$NEXUS_URL/service/rest/v1/security/realms/active" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '["NexusAuthenticatingRealm","DockerToken","ConanToken"]'
log "Conan Token realm enabled"

# ── Create Conan repositories ──────────────────────────────────────────────
# Helper: 201 = created, 400 = already exists (both are fine)
create_conan_repo() {
  REPO_NAME="$1"
  REPO_TYPE="$2"
  REPO_BODY="$3"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$NEXUS_URL/service/rest/v1/repositories/conan2/$REPO_TYPE" \
    -u "$AUTH" -H "Content-Type: application/json" -d "$REPO_BODY")
  case "$HTTP" in
    201) log "Conan $REPO_TYPE repo '$REPO_NAME' created" ;;
    400) log "Conan repo '$REPO_NAME' already exists, skipping" ;;
    *)   log "ERROR: conan repo '$REPO_NAME' creation returned HTTP $HTTP"; exit 1 ;;
  esac
}

# Proxy — caches Conan Center packages locally (avoids repeated internet downloads)
create_conan_repo "conan-proxy" "proxy" "$(cat <<JSON
{
  "name": "conan-proxy",
  "online": true,
  "storage": {"blobStoreName": "default", "strictContentTypeValidation": true},
  "proxy": {"remoteUrl": "https://center2.conan.io", "contentMaxAge": 1440, "metadataMaxAge": 1440},
  "negativeCache": {"enabled": true, "timeToLive": 1440},
  "httpClient": {"blocked": false, "autoBlock": true}
}
JSON
)"

# Hosted — private packages (testcontainers-sidecar, testcontainers-native, etc.)
create_conan_repo "conan-hosted" "hosted" "$(cat <<JSON
{
  "name": "conan-hosted",
  "online": true,
  "storage": {"blobStoreName": "default", "strictContentTypeValidation": true, "writePolicy": "allow"},
  "component": {"proprietaryComponents": true}
}
JSON
)"

# Group — single URL that merges hosted (wins) + proxy (fallback)
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$NEXUS_URL/service/rest/v1/repositories/conan2/group" \
  -u "$AUTH" -H "Content-Type: application/json" -d "$(cat <<JSON
{
  "name": "conan-group",
  "online": true,
  "storage": {"blobStoreName": "default", "strictContentTypeValidation": true},
  "group": {"memberNames": ["conan-hosted", "conan-proxy"]}
}
JSON
)")
case "$HTTP" in
  201) log "Conan group repo 'conan-group' created" ;;
  400) log "Conan repo 'conan-group' already exists, skipping" ;;
  *)   log "ERROR: conan group repo creation returned HTTP $HTTP"; exit 1 ;;
esac

log ""
log "══════════════════════════════════════════"
log "  Nexus ready!"
log "  Registry : localhost:$DOCKER_PORT"
log "  Web UI   : http://localhost:8091"
log "  Login    : admin / $NEW_PASS"
log ""
log "  Conan group URL: $NEXUS_URL/repository/conan-group/"
log "  Conan hosted URL: $NEXUS_URL/repository/conan-hosted/"
log ""
log "  Next steps:"
log "    cd deployment && ./push-to-nexus.sh     (Docker images)"
log "    cd deployment && ./build-testcontainers.sh  (Conan packages)"
log "══════════════════════════════════════════"

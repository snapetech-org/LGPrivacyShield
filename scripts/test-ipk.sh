#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
mapfile -t app_identity < <(python3 - "${repo_root}/webos-app/appinfo.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as source:
    app = json.load(source)

print(app["id"])
print(app["version"])
PY
)

package="${repo_root}/dist/${app_identity[0]}_${app_identity[1]}_all.ipk"
[ -f "${package}" ] || { echo "Build the current IPK first: ${package}" >&2; exit 1; }
command -v ar >/dev/null || { echo "The ar utility is required" >&2; exit 1; }
command -v tar >/dev/null || { echo "The tar utility is required" >&2; exit 1; }

test_root="$(mktemp -d "${TMPDIR:-/tmp}/privacyshield-ipk-test-XXXXXX")"
cleanup() {
  rm -rf -- "${test_root}"
}
trap cleanup EXIT

echo "Package extraction scratch: ${test_root}"
mkdir -p "${test_root}/data"
ar p "${package}" data.tar.gz | tar -xzf - -C "${test_root}/data"

app_root="${test_root}/data/usr/palm/applications/${app_identity[0]}"
[ -f "${app_root}/index.html" ] || { echo "App payload missing from IPK" >&2; exit 1; }
PRIVACYSHIELD_APP_ROOT="${app_root}" \
PRIVACYSHIELD_HEADLESS_DIR="${test_root}" \
node --test "${repo_root}/tests/headless-ui.test.cjs"

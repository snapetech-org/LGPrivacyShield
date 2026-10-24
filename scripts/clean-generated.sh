#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
project_name="$(python3 - "${repo_root}/package.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as source:
    print(json.load(source).get("name", ""))
PY
)"
if [ "${project_name}" != "privacyshield-webos" ]; then
  echo "Refusing cleanup outside the PrivacyShield project" >&2
  exit 2
fi

rm -rf "${repo_root}/build"

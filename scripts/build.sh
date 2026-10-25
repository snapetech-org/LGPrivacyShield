#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
build_dir="${repo_root}/build"
dist_dir="${repo_root}/dist"

mapfile -t app_identity < <(python3 - "${repo_root}/webos-app/appinfo.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as source:
    app = json.load(source)

print(app["id"])
print(app["version"])
PY
)

package_name="${app_identity[0]}_${app_identity[1]}_all.ipk"
build_package="${build_dir}/${package_name}"
dist_package="${dist_dir}/${package_name}"

mkdir -p "${build_dir}" "${dist_dir}"
rm -f "${build_package}"
cd "${build_dir}"
"${repo_root}/node_modules/.bin/ares-package" \
  --app-exclude "__pycache__" \
  --app-exclude "*.pyc" \
  "${repo_root}/webos-app"
[ -f "${build_package}" ] || { echo "Package output missing: ${build_package}" >&2; exit 1; }
cp "${build_package}" "${dist_package}"
sha256sum "${dist_package}"

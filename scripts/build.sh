#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
build_dir="${repo_root}/build"
dist_dir="${repo_root}/dist"

mkdir -p "${build_dir}" "${dist_dir}"
rm -f "${build_dir}"/org.privacyshield.webos_*.ipk
rm -f "${dist_dir}"/org.privacyshield.webos_*.ipk
cd "${build_dir}"
"${repo_root}/node_modules/.bin/ares-package" \
  --app-exclude "__pycache__" \
  --app-exclude "*.pyc" \
  "${repo_root}/webos-app"
for package in "${build_dir}"/org.privacyshield.webos_*.ipk; do
  [ -f "${package}" ] || { echo "Package output missing" >&2; exit 1; }
  cp "${package}" "${dist_dir}/"
done
sha256sum "${dist_dir}"/org.privacyshield.webos_*.ipk

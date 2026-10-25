#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
build_dir="${repo_root}/build"
dist_dir="${repo_root}/dist"
staged_app="${build_dir}/app"

app_identity="$(python3 "${repo_root}/scripts/package_identity.py" "${repo_root}/webos-app/appinfo.json")"
IFS=$'\t' read -r app_id app_version <<< "${app_identity}"
if [ -z "${app_id}" ] || [ -z "${app_version}" ]; then
  echo "Could not read a valid package identity." >&2
  exit 1
fi

if [ -z "${SOURCE_DATE_EPOCH:-}" ]; then
  SOURCE_DATE_EPOCH="$(git -C "${repo_root}" log -1 --format=%ct)"
fi
if [[ ! "${SOURCE_DATE_EPOCH}" =~ ^[0-9]{1,10}$ ]] \
  || { [ "${#SOURCE_DATE_EPOCH}" -eq 10 ] && [ "${SOURCE_DATE_EPOCH}" -gt 8589934591 ]; }; then
  echo "SOURCE_DATE_EPOCH must be a nonnegative USTAR timestamp." >&2
  exit 1
fi
export SOURCE_DATE_EPOCH

package_name="${app_id}_${app_version}_all.ipk"
build_package="${build_dir}/${package_name}"
dist_package="${dist_dir}/${package_name}"

mkdir -p "${build_dir}" "${dist_dir}"
rm -f "${build_package}"
rm -rf "${staged_app}"
mkdir -p "${staged_app}"
tracked_files="$(mktemp "${build_dir}/tracked-app-files.XXXXXX")"
cleanup() {
  [ -z "${tracked_files:-}" ] || rm -f -- "${tracked_files}"
}
trap cleanup EXIT
git -C "${repo_root}" ls-files -z -- webos-app/ > "${tracked_files}"
if [ ! -s "${tracked_files}" ]; then
  echo "No tracked webOS application files were found." >&2
  exit 1
fi
while IFS= read -r -d '' relative_file; do
  relative_path="${relative_file#webos-app/}"
  case "${relative_path}" in
    src/community-data.js|src/community-reference.js|src/firmware-catalog-data.js|src/firmware-catalog.js) continue ;;
  esac
  source_file="${repo_root}/${relative_file}"
  output_file="${staged_app}/${relative_path}"
  mkdir -p "$(dirname "${output_file}")"
  if [[ "${relative_path}" == *.js ]]; then
    "${repo_root}/node_modules/.bin/esbuild" "${source_file}" \
      --target=chrome79 \
      --charset=utf8 \
      --outfile="${output_file}"
  else
    cp -a -- "${source_file}" "${output_file}"
  fi
done < "${tracked_files}"
rm -f -- "${tracked_files}"
tracked_files=""
trap - EXIT
cp "${repo_root}/LICENSE" "${staged_app}/LICENSE"
cp "${repo_root}/THIRD-PARTY-NOTICES.md" "${staged_app}/THIRD-PARTY-NOTICES.md"
python3 - "${staged_app}" <<'PY'
import shutil
import sys
from pathlib import Path

staged_app = Path(sys.argv[1])
for cache in staged_app.rglob("__pycache__"):
    shutil.rmtree(cache)
for bytecode in staged_app.rglob("*.pyc"):
    bytecode.unlink()
PY
python3 "${repo_root}/scripts/package_ipk.py" \
  --app-dir "${staged_app}" \
  --output "${build_package}"
cp "${build_package}" "${dist_package}"
sha256sum "${dist_package}"

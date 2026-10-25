#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
build_dir="${repo_root}/build"
dist_dir="${repo_root}/dist"
staged_app="${build_dir}/app"

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
rm -rf "${staged_app}"
mkdir -p "${staged_app}"
cp -a "${repo_root}/webos-app/." "${staged_app}/"
cp "${repo_root}/LICENSE" "${staged_app}/LICENSE"
cp "${repo_root}/THIRD-PARTY-NOTICES.md" "${staged_app}/THIRD-PARTY-NOTICES.md"
rm -f \
  "${staged_app}/src/community-data.js" \
  "${staged_app}/src/community-reference.js" \
  "${staged_app}/src/firmware-catalog-data.js" \
  "${staged_app}/src/firmware-catalog.js"

while IFS= read -r -d '' source_file; do
  relative_path="${source_file#"${repo_root}/webos-app/"}"
  case "${relative_path}" in
    src/community-data.js|src/community-reference.js|src/firmware-catalog-data.js|src/firmware-catalog.js) continue ;;
  esac
  output_file="${staged_app}/${relative_path}"
  mkdir -p "$(dirname "${output_file}")"
  "${repo_root}/node_modules/.bin/esbuild" "${source_file}" \
    --target=chrome79 \
    --charset=utf8 \
    --outfile="${output_file}"
done < <(find "${repo_root}/webos-app" -type f -name '*.js' -print0)

cd "${build_dir}"
"${repo_root}/node_modules/.bin/ares-package" \
  --app-exclude "__pycache__" \
  --app-exclude "*.pyc" \
  "${staged_app}"
[ -f "${build_package}" ] || { echo "Package output missing: ${build_package}" >&2; exit 1; }
cp "${build_package}" "${dist_package}"
sha256sum "${dist_package}"

#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
dist_dir="${repo_root}/dist"

if [ "$#" -ne 2 ]; then
  echo "Usage: scripts/gen-manifest.sh <public-icon-url> <public-source-url>" >&2
  exit 2
fi

icon_url="$1"
source_url="$2"
app_identity="$(python3 "${repo_root}/scripts/package_identity.py" "${repo_root}/webos-app/appinfo.json")"
IFS=$'\t' read -r app_id app_version <<< "${app_identity}"
if [ -z "${app_id}" ] || [ -z "${app_version}" ]; then
  echo "Could not read a valid package identity." >&2
  exit 1
fi
package="${dist_dir}/${app_id}_${app_version}_all.ipk"
output="${dist_dir}/org.privacyshield.webos.manifest.json"

if [ -n "${WEBOSBREW_GEN_MANIFEST:-}" ]; then
  generator="${WEBOSBREW_GEN_MANIFEST}"
elif command -v webosbrew-toolbox-gen-manifest >/dev/null 2>&1; then
  generator="$(command -v webosbrew-toolbox-gen-manifest)"
elif command -v webosbrew-gen-manifest >/dev/null 2>&1; then
  generator="$(command -v webosbrew-gen-manifest)"
else
  echo "Install webosbrew-gen-manifest from webosbrew/dev-toolbox-cli first." >&2
  exit 127
fi

[ -n "${package}" ] && [ -f "${package}" ] || { echo "Build the IPK first with npm run package." >&2; exit 1; }
"${generator}" --pkgfile "${package}" --icon "${icon_url}" --link "${source_url}" --root optional --output "${output}"
echo "Wrote ${output}"

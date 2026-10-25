#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_identity="$(python3 "${repo_root}/scripts/package_identity.py" "${repo_root}/webos-app/appinfo.json")"
IFS=$'\t' read -r app_id app_version <<< "${app_identity}"
if [ -z "${app_id}" ] || [ -z "${app_version}" ]; then
  echo "Could not read a valid package identity." >&2
  exit 1
fi

package="${repo_root}/dist/${app_id}_${app_version}_all.ipk"
[ -f "${package}" ] || { echo "Build the current IPK first: ${package}" >&2; exit 1; }
command -v ar >/dev/null || { echo "The ar utility is required" >&2; exit 1; }
command -v tar >/dev/null || { echo "The tar utility is required" >&2; exit 1; }

test_root="$(mktemp -d "${TMPDIR:-/tmp}/lgprivacyshield-ipk-test-XXXXXX")"
cleanup() {
  rm -rf -- "${test_root}"
}
trap cleanup EXIT

echo "Package extraction scratch: ${test_root}"
python3 - "${package}" "${app_id}" "${app_version}" "${repo_root}" <<'PY'
import io
import subprocess
import sys
import tarfile

package, expected_id, expected_version, repo_root = sys.argv[1:]
members = subprocess.run(["ar", "t", package], check=True, capture_output=True, text=True).stdout.splitlines()
if members != ["debian-binary", "control.tar.gz", "data.tar.gz"]:
    raise SystemExit(f"Unexpected IPK archive members: {members!r}")
format_version = subprocess.run(["ar", "p", package, "debian-binary"], check=True, capture_output=True).stdout.decode("ascii").strip()
if format_version != "2.0":
    raise SystemExit(f"Unexpected IPK format version: {format_version!r}")

control_bytes = subprocess.run(["ar", "p", package, "control.tar.gz"], check=True, capture_output=True).stdout
with tarfile.open(fileobj=io.BytesIO(control_bytes), mode="r:gz") as archive:
    control_file = archive.extractfile("control")
    if control_file is None:
        raise SystemExit("IPK control metadata is missing")
    control = dict(
        line.split(": ", 1)
        for line in control_file.read().decode("utf-8").splitlines()
        if ": " in line
    )
if control.get("Package") != expected_id or control.get("Version") != expected_version or control.get("Architecture") != "all":
    raise SystemExit(f"Unexpected IPK control metadata: {control!r}")

data_bytes = subprocess.run(["ar", "p", package, "data.tar.gz"], check=True, capture_output=True).stdout
payload_path = f"usr/palm/applications/{expected_id}/appinfo.json"
app_root = f"usr/palm/applications/{expected_id}/"
with tarfile.open(fileobj=io.BytesIO(data_bytes), mode="r:gz") as archive:
    files = {member.name.lstrip("./"): member for member in archive.getmembers() if member.isfile()}
    appinfo_member = files.get(payload_path)
    if appinfo_member is None:
        raise SystemExit(f"IPK payload is missing {payload_path}")
    appinfo_file = archive.extractfile(appinfo_member)
    if appinfo_file is None:
        raise SystemExit(f"IPK payload is missing {payload_path}")
    import json
    appinfo = json.load(appinfo_file)
    excluded_research_files = (
        f"{app_root}src/community-data.js",
        f"{app_root}src/community-reference.js",
        f"{app_root}src/firmware-catalog-data.js",
        f"{app_root}src/firmware-catalog.js",
    )
    for packaged_path in excluded_research_files:
        if packaged_path in files:
            raise SystemExit(f"Research-only file must not be included in the TV package: {packaged_path}")
    required_files = {
        f"{app_root}LICENSE": f"{repo_root}/LICENSE",
        f"{app_root}THIRD-PARTY-NOTICES.md": f"{repo_root}/THIRD-PARTY-NOTICES.md",
        f"{app_root}vendor/LICENSE-2.0.txt": f"{repo_root}/webos-app/vendor/LICENSE-2.0.txt",
        f"{app_root}vendor/LICENSE.qrcode-generator.txt": f"{repo_root}/webos-app/vendor/LICENSE.qrcode-generator.txt",
    }
    for packaged_path, source_path in required_files.items():
        member = files.get(packaged_path)
        if member is None:
            raise SystemExit(f"IPK payload is missing {packaged_path}")
        with archive.extractfile(member) as packaged_file, open(source_path, "rb") as source_file:
            if packaged_file.read() != source_file.read():
                raise SystemExit(f"Packaged license file differs from {source_path}")
with open(f"{repo_root}/LICENSE", "r", encoding="utf-8") as license_file:
    if "GNU AFFERO GENERAL PUBLIC LICENSE" not in license_file.read():
        raise SystemExit("Project LICENSE does not contain the GNU AGPL text")
if appinfo.get("id") != expected_id or appinfo.get("version") != expected_version:
    raise SystemExit(f"Payload identity does not match package identity: {appinfo!r}")
print(f"Verified IPK metadata: {expected_id} {expected_version} (architecture all)")
PY
mkdir -p "${test_root}/data"
ar p "${package}" data.tar.gz | tar -xzf - -C "${test_root}/data"

app_root="${test_root}/data/usr/palm/applications/${app_id}"
[ -f "${app_root}/index.html" ] || { echo "App payload missing from IPK" >&2; exit 1; }
LGPRIVACYSHIELD_APP_ROOT="${app_root}" \
LGPRIVACYSHIELD_HEADLESS_DIR="${test_root}" \
node --test "${repo_root}/tests/headless-ui.test.cjs"

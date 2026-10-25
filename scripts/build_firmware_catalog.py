#!/usr/bin/env python3
"""Build a compact, checksummed B/C/G OLED firmware index from processed_fw.json.

The archive index describes firmware packages and compatible model strings. It
does not contain extracted SettingsService registries. This tool deliberately
records package identity only; it never infers setting keys from an OTA family.
"""

import argparse
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote


SOURCE_URL = "https://tv.slada.sk/processed_fw.json"
MODEL_PATTERN = re.compile(r"^OLED\d{2,3}([BCG])([1-6])", re.IGNORECASE)
OTA_PATTERN = re.compile(r"^HE_DTV_W2[1-6][A-Z0-9]+_[A-Z0-9]+$", re.IGNORECASE)
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
FAMILIES = [f"{series}{generation}" for generation in range(1, 7) for series in "BCG"]


def _string(value):
    return value.strip() if isinstance(value, str) else ""


def _safe_path(value):
    path = _string(value).replace("\\", "/")
    if not path or path.startswith("/") or any(part in ("", ".", "..") for part in path.split("/")):
        return None
    return path


def build_catalog(document, source_bytes, generated_on):
    if not isinstance(document, dict) or not isinstance(document.get("fws"), dict):
        raise ValueError("source index must contain an fws object")

    packages = {}
    for path_key, source in document["fws"].items():
        if not isinstance(source, dict):
            continue
        path = _safe_path(source.get("relativePath") or path_key)
        lookup = source.get("lookupInfo")
        epks = source.get("epks")
        if not path or not isinstance(lookup, dict) or not isinstance(epks, list):
            continue

        models_by_family = {}
        for model in lookup.get("modelNames", []):
            if not isinstance(model, str):
                continue
            match = MODEL_PATTERN.match(model.strip())
            if match:
                family = f"{match.group(1).upper()}{match.group(2)}"
                models_by_family.setdefault(family, set()).add(model.strip().upper())
        if not models_by_family:
            continue

        zip_sha = _string(source.get("zipFileSha256")).lower()
        zip_size = source.get("zipFileSizeBytes")
        if not SHA256_PATTERN.fullmatch(zip_sha) or not isinstance(zip_size, int) or zip_size <= 0:
            continue

        for epk in epks:
            if not isinstance(epk, dict):
                continue
            ota_id = _string(epk.get("firmwareotaID")).upper()
            epk_sha = _string(epk.get("epkSha256")).lower()
            version = _string(epk.get("firmwareversion"))
            sdk = _string(epk.get("sdkVersion"))
            platform = _string(epk.get("platformVersion"))
            epk_size = epk.get("epkFileSizeBytes")
            if not OTA_PATTERN.fullmatch(ota_id):
                continue
            if not SHA256_PATTERN.fullmatch(epk_sha) or not version or not sdk or not platform:
                continue
            if not isinstance(epk_size, int) or epk_size <= 0:
                continue

            epk_name = _string(epk.get("file"))
            build = {
                "otaId": ota_id,
                "firmwareVersion": version,
                "sdkVersion": sdk,
                "platformVersion": platform,
                "epkSha256": epk_sha,
                "epkSizeBytes": epk_size,
                "zipSha256": zip_sha,
                "zipSizeBytes": zip_size,
                "archivePath": path,
                "archiveUrl": f"https://tv.slada.sk/{quote(path, safe='/')}",
                "epkFile": epk_name,
                "region": _string(lookup.get("country")).upper() or None,
                "releaseDate": _string(lookup.get("releaseDate")) or None,
                "families": sorted(models_by_family),
                "models": sorted({model for values in models_by_family.values() for model in values}),
            }
            identity = (
                ota_id, version, sdk, platform, epk_sha, zip_sha,
                path, epk_name,
            )
            existing = packages.get(identity)
            if existing is None:
                packages[identity] = build
            else:
                existing["families"] = sorted(set(existing["families"]) | set(build["families"]))
                existing["models"] = sorted(set(existing["models"]) | set(build["models"]))

    records = sorted(
        packages.values(),
        key=lambda item: (
            item["families"], item["otaId"], item["firmwareVersion"],
            item["region"] or "", item["zipSha256"],
        ),
    )
    model_sets = {family: set() for family in FAMILIES}
    package_counts = {family: 0 for family in FAMILIES}
    ota_ids = {family: set() for family in FAMILIES}
    for record in records:
        for family in record["families"]:
            model_sets[family].update(record["models"])
            package_counts[family] += 1
            ota_ids[family].add(record["otaId"])

    return {
        "schemaVersion": 1,
        "source": {
            "name": "EPK Firmware Archive processed firmware index",
            "url": SOURCE_URL,
            "retrievedOn": generated_on,
            "sha256": hashlib.sha256(source_bytes).hexdigest(),
            "recordCount": len(document["fws"]),
            "limits": "Package metadata only. The archive index does not contain extracted firmware files or SettingsService key registries.",
        },
        "coverage": {
            family: {
                "modelCount": len(model_sets[family]),
                "packageBuildCount": package_counts[family],
                "otaIds": sorted(ota_ids[family]),
            }
            for family in FAMILIES
        },
        "modelCount": len(set().union(*model_sets.values())),
        "packageBuildCount": len(records),
        "settingsMapsExtracted": 0,
        "records": records,
    }


def render_js(catalog):
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return (
        "(function (root, data) {\n"
        "  if (typeof module === \"object\" && module.exports) module.exports = data;\n"
        "  else root.LGPrivacyShieldFirmwareData = data;\n"
        f"}})(typeof globalThis !== \"undefined\" ? globalThis : this, Object.freeze({payload}));\n"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Downloaded processed_fw.json from the EPK Firmware Archive")
    parser.add_argument("--json-output", default="data/lg-oled-firmware-catalog.json")
    parser.add_argument("--js-output", default="webos-app/src/firmware-catalog-data.js")
    parser.add_argument("--retrieved-on", default=dt.date.today().isoformat())
    args = parser.parse_args()

    source_path = Path(args.input)
    source_bytes = source_path.read_bytes()
    document = json.loads(source_bytes)
    catalog = build_catalog(document, source_bytes, args.retrieved_on)
    json_path = Path(args.json_output)
    js_path = Path(args.js_output)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    js_path.write_text(render_js(catalog), encoding="utf-8")
    print(
        f"Indexed {catalog['packageBuildCount']} checksummed firmware builds for "
        f"{catalog['modelCount']} exact B/C/G OLED model codes across 18 cohorts; "
        "no SettingsService maps were extracted."
    )


if __name__ == "__main__":
    main()

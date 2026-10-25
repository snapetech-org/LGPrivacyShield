#!/usr/bin/env python3
"""Sanitize an extracted LG firmware key registry against a pinned model build.

Only reviewed PrivacyShield candidate names and their firmware categories are
written. Preference values and all unreviewed firmware keys are discarded.
"""

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = ROOT / "webos-app/scripts/device_snapshot.py"
SPEC = importlib.util.spec_from_file_location("privacyshield_device_snapshot", SNAPSHOT_PATH)
SNAPSHOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SNAPSHOT)
MODEL_PATTERN = re.compile(r"^(OLED\d{2,3}[BCG][1-6][A-Z0-9]+)(?:\.[A-Z0-9]+)?$", re.IGNORECASE)
OTA_PATTERN = re.compile(r"^HE_DTV_W2[1-6][A-Z0-9]+_[A-Z0-9]+$", re.IGNORECASE)
VERSION_PATTERN = re.compile(r"^\d+(?:\.\d+){2,3}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)


def model_root(value):
    text = value.strip().upper() if isinstance(value, str) else ""
    text = re.sub(r"^\[LG\]\s*|^LG\s+", "", text)
    match = MODEL_PATTERN.fullmatch(text)
    return match.group(1) if match else None


def version_key(value):
    if not isinstance(value, str) or not VERSION_PATTERN.fullmatch(value.strip()):
        return None
    version = value.strip()
    return version[:-3] if version.endswith(".01") else version


def firmware_build(catalog, model, firmware, ota_id, image_sha256):
    root = model_root(model)
    normalized_firmware = version_key(firmware)
    normalized_ota = ota_id.strip().upper() if isinstance(ota_id, str) else ""
    if not root:
        raise ValueError("model must be an exact B/C/G OLED model code")
    if not normalized_firmware:
        raise ValueError("firmware must be a numeric three- or four-part version")
    if not OTA_PATTERN.fullmatch(normalized_ota):
        raise ValueError("OTA ID must be a complete HE_DTV_W2x... identifier")
    normalized_image_sha256 = image_sha256.strip().lower() if isinstance(image_sha256, str) else ""
    if not SHA256_PATTERN.fullmatch(normalized_image_sha256):
        raise ValueError("the extracted EPK image must have a SHA-256 digest")

    matches = [
        record for record in catalog.get("records", [])
        if any(model_root(name) == root for name in record.get("models", []))
        and version_key(record.get("firmwareVersion")) == normalized_firmware
        and record.get("otaId") == normalized_ota
    ]
    if not matches:
        raise ValueError("no checksummed archive build matches the exact model, firmware version, and OTA ID")
    image_matches = [
        record for record in matches
        if str(record.get("epkSha256", "")).lower() == normalized_image_sha256
    ]
    if not image_matches:
        raise ValueError("the EPK image SHA-256 does not match a checksummed build for this model and firmware")
    return sorted(image_matches, key=lambda record: (record.get("zipSha256", ""), record.get("archiveUrl", "")))[0]


def sanitize_registry(document):
    if not isinstance(document, list):
        raise ValueError("firmware registry must be a category/key list")
    firmware_map = SNAPSHOT.firmware_settings_map(document)
    if not firmware_map or firmware_map.get("available") is not True:
        raise ValueError("firmware registry could not be read")
    settings = firmware_map.get("settings", {})
    ambiguous = firmware_map.get("ambiguous", [])
    if not settings:
        raise ValueError("firmware registry contains no reviewed PrivacyShield candidate keys")

    by_category = {}
    for key, category in settings.items():
        by_category.setdefault(category, []).append(key)
    category_keys = [
        {"category": category, "keys": sorted(keys)}
        for category, keys in sorted(by_category.items())
    ]
    return category_keys, sorted(ambiguous)


def import_registry(document, source_bytes, catalog, model, firmware, ota_id, image_sha256, imported_on):
    build = firmware_build(catalog, model, firmware, ota_id, image_sha256)
    categories, ambiguous = sanitize_registry(document)
    return {
        "provenance": {
            "model": model.strip().upper(),
            "firmware": firmware.strip(),
            "sdk": build["sdkVersion"],
            "webOSPlatform": build["platformVersion"],
            "otaId": build["otaId"],
            "capturedOn": imported_on,
            "sourcePath": "/etc/palm/description.categorykeysmap.json",
            "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
            "firmwarePackage": {
                "firmwareVersion": build["firmwareVersion"],
                "epkSha256": build["epkSha256"],
                "verifiedImageSha256": image_sha256.lower(),
                "zipSha256": build["zipSha256"],
                "archiveUrl": build["archiveUrl"],
                "archiveIndexSha256": catalog["source"]["sha256"],
            },
            "note": "The supplied EPK image hash matches the archive. The registry file hash is recorded separately; this importer does not independently reproduce the extraction step. Only reviewed PrivacyShield candidate names and categories are included; preference values and other firmware keys are omitted.",
        },
        "categoryKeysMap": categories,
        "ambiguousKeys": ambiguous,
        "evidence": {
            "firmwareImageHash": "verified-against-archive-index",
            "registryFileHash": "recorded",
            "registryExtraction": "not-independently-reproduced",
            "physicalValidation": "not-performed",
            "settingSemantics": "not-validated-by-extraction",
            "preferenceValuesIncluded": False,
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Extracted /etc/palm/description.categorykeysmap.json")
    parser.add_argument("--model", required=True, help="Exact model code, including any known region suffix")
    parser.add_argument("--firmware", required=True, help="Installed firmware version")
    parser.add_argument("--ota-id", required=True, help="Exact firmware OTA ID from the model or package")
    parser.add_argument("--image", required=True, help="Extracted EPK file whose SHA-256 must match the catalog")
    parser.add_argument("--catalog", default="data/lg-oled-firmware-catalog.json")
    parser.add_argument("--output", required=True, help="Destination for the sanitized registry")
    parser.add_argument("--imported-on", default=dt.date.today().isoformat())
    args = parser.parse_args()

    source_bytes = Path(args.input).read_bytes()
    source = json.loads(source_bytes)
    catalog = json.loads(Path(args.catalog).read_text(encoding="utf-8"))
    image_hash = hashlib.sha256()
    with Path(args.image).open("rb") as image_file:
        for chunk in iter(lambda: image_file.read(8 * 1024 * 1024), b""):
            image_hash.update(chunk)
    result = import_registry(source, source_bytes, catalog, args.model, args.firmware, args.ota_id, image_hash.hexdigest(), args.imported_on)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    key_count = sum(len(entry["keys"]) for entry in result["categoryKeysMap"])
    print(f"Imported {key_count} reviewed firmware keys; {len(result['ambiguousKeys'])} ambiguous keys were omitted.")
    print("The EPK hash matched the archive index. The importer did not reproduce extraction; setting effects and physical-device behavior remain unverified.")


if __name__ == "__main__":
    main()

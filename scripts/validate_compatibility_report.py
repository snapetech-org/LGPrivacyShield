#!/usr/bin/env python3
"""Validate a PrivacyShield compatibility report without changing support maps."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


CONTROL_KEYS = frozenset(
    {
        "livePlus",
        "voiceLongDistance",
        "turnOnByVoice",
        "lmt",
        "doNotSellMyPersonalInformation",
        "screenSaverAd",
        "homePromotion",
        "livePromotion",
        "contentRecommendation",
        "hbbTvDnt",
        "hbbTvDeviceId",
        "thirdPartyCookie",
        "hbbTV",
        "bleAdvertisingOnOff",
        "homeSenseAbsence",
    }
)
EVIDENCE_LEVELS = frozenset(
    {
        "unmapped",
        "reported",
        "source-mapped",
        "device-read-verified",
        "write-readback-verified",
        "cross-validated",
    }
)
SETTINGS_ACCESS = frozenset({"available", "partial", "unavailable"})
IDENTITY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._()+-]{0,63}$")
VERSION_RE = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}$")
APP_VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
PROFILE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{0,95}$")
IPV4_RE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")
MAC_RE = re.compile(r"^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$", re.IGNORECASE)


def _object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON field: {key}")
        result[key] = value
    return result


def parse_report(text: str) -> Any:
    """Parse JSON while rejecting duplicate fields that could hide extra data."""
    return json.loads(text, object_pairs_hook=_object)


def _require_object(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{path} must be an object")
    return value


def _require_exact_keys(value: dict[str, Any], keys: set[str] | frozenset[str], path: str) -> None:
    actual = set(value)
    missing = sorted(keys - actual)
    extra = sorted(actual - keys)
    if missing or extra:
        details = []
        if missing:
            details.append("missing " + ", ".join(missing))
        if extra:
            details.append("unknown " + ", ".join(extra))
        raise ValueError(f"{path}: {'; '.join(details)}")


def _safe_identity(value: Any, path: str, *, version: bool = False) -> None:
    if value is None:
        return
    if not isinstance(value, str):
        raise ValueError(f"{path} must be a string or null")
    valid = VERSION_RE.fullmatch(value) if version else IDENTITY_RE.fullmatch(value)
    if not valid or IPV4_RE.fullmatch(value) or MAC_RE.fullmatch(value):
        raise ValueError(f"{path} is not a supported model or software identifier")


def validate_report(report: Any) -> dict[str, Any]:
    """Validate the strict, privacy-minimized report schema and return a summary."""
    root = _require_object(report, "report")
    _require_exact_keys(
        root,
        {"schemaVersion", "appVersion", "device", "compatibility", "apiAccess", "controlReads"},
        "report",
    )
    if type(root["schemaVersion"]) is not int or root["schemaVersion"] != 1:
        raise ValueError("schemaVersion must be integer 1")
    if not isinstance(root["appVersion"], str) or not APP_VERSION_RE.fullmatch(root["appVersion"]):
        raise ValueError("appVersion must use numeric major.minor.patch form")

    device = _require_object(root["device"], "device")
    _require_exact_keys(device, {"model", "sdkVersion", "firmwareVersion"}, "device")
    _safe_identity(device["model"], "device.model")
    _safe_identity(device["sdkVersion"], "device.sdkVersion", version=True)
    _safe_identity(device["firmwareVersion"], "device.firmwareVersion", version=True)

    compatibility = _require_object(root["compatibility"], "compatibility")
    _require_exact_keys(
        compatibility,
        {"profileId", "evidenceLevel", "sampleCount", "mappedControlCount"},
        "compatibility",
    )
    profile_id = compatibility["profileId"]
    if profile_id is not None and (not isinstance(profile_id, str) or not PROFILE_ID_RE.fullmatch(profile_id)):
        raise ValueError("compatibility.profileId must be a safe profile id or null")
    evidence = compatibility["evidenceLevel"]
    if not isinstance(evidence, str) or evidence not in EVIDENCE_LEVELS:
        raise ValueError("compatibility.evidenceLevel is not recognized")
    sample_count = compatibility["sampleCount"]
    mapped_count = compatibility["mappedControlCount"]
    if type(sample_count) is not int or sample_count < 0:
        raise ValueError("compatibility.sampleCount must be a non-negative integer")
    if type(mapped_count) is not int or not 0 <= mapped_count <= len(CONTROL_KEYS):
        raise ValueError("compatibility.mappedControlCount is outside the known control range")
    if profile_id is None:
        if evidence != "unmapped" or sample_count != 0 or mapped_count != 0:
            raise ValueError("an unmapped report must have no profile, samples, or mapped controls")
    elif evidence == "unmapped" or sample_count < 1 or mapped_count < 1 or device["model"] is None:
        raise ValueError("a mapped profile requires an identified device, evidence, and at least one sample/control")

    access = _require_object(root["apiAccess"], "apiAccess")
    _require_exact_keys(access, {"systemInfo", "settingsService", "hbcSnapshot"}, "apiAccess")
    for key in ("systemInfo", "hbcSnapshot"):
        if type(access[key]) is not bool:
            raise ValueError(f"apiAccess.{key} must be a boolean")
    if not isinstance(access["settingsService"], str) or access["settingsService"] not in SETTINGS_ACCESS:
        raise ValueError("apiAccess.settingsService is not recognized")

    reads = _require_object(root["controlReads"], "controlReads")
    _require_exact_keys(reads, CONTROL_KEYS, "controlReads")
    if any(type(value) is not bool for value in reads.values()):
        raise ValueError("controlReads values must be booleans")

    return {
        "evidenceLevel": evidence,
        "mappedControlCount": mapped_count,
        "readableControlCount": sum(reads.values()),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path, help="JSON report file to validate")
    args = parser.parse_args(argv)
    try:
        report = parse_report(args.report.read_text(encoding="utf-8"))
        summary = validate_report(report)
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as error:
        print(f"Invalid compatibility report: {error}", file=sys.stderr)
        return 1

    print(
        "Valid compatibility report: "
        f"{summary['mappedControlCount']} mapped controls, "
        f"{summary['readableControlCount']} readable controls, "
        f"evidence {summary['evidenceLevel']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

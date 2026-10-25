#!/usr/bin/env python3
"""Validate and print the package identity from webOS appinfo.json."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


PACKAGE_ID = re.compile(r"^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$")
PACKAGE_VERSION = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")


def validate_package_identity(app_id: object, version: object) -> tuple[str, str]:
    if not isinstance(app_id, str) or len(app_id) > 150 or not PACKAGE_ID.fullmatch(app_id):
        raise ValueError("appinfo.json id must be a dotted package identifier")
    if not isinstance(version, str) or len(version) > 32 or not PACKAGE_VERSION.fullmatch(version):
        raise ValueError("appinfo.json version must use numeric major.minor.patch form")
    return app_id, version


def read_package_identity(appinfo_path: Path) -> tuple[str, str]:
    try:
        appinfo = json.loads(appinfo_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read appinfo.json: {error}") from error
    if not isinstance(appinfo, dict):
        raise ValueError("appinfo.json must contain a JSON object")
    return validate_package_identity(appinfo.get("id"), appinfo.get("version"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("appinfo", type=Path)
    args = parser.parse_args()
    try:
        app_id, version = read_package_identity(args.appinfo)
    except ValueError as error:
        parser.error(str(error))
    print(f"{app_id}\t{version}")


if __name__ == "__main__":
    main()

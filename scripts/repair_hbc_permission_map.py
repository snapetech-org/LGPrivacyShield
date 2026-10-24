#!/usr/bin/env python3
"""Safely add/rollback the upstream HBC lunabus.query API permission map."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile


HBC_APP_ID = "org.webosbrew.hbchannel"
HBC_SERVICE_ID = "org.webosbrew.hbchannel.service"
TREE_ROOTS = {
    "dev": "/var/luna-service2-dev",
    "nondev": "/var/luna-service2",
}
MAP_BASENAME = f"{HBC_SERVICE_ID}.api.lunabus.query.json"
EXPECTED_MAPPING = {
    "lunabus.query": [f"{HBC_SERVICE_ID}/*"],
}


class RepairError(RuntimeError):
    """The live HBC permission map is unexpected or unsafe to change."""


def _paths(filesystem_root: str | Path, tree: str) -> dict[str, Path | str]:
    if tree not in TREE_ROOTS:
        raise RepairError(f"unknown Luna service tree: {tree}")
    root = Path(filesystem_root).absolute()
    tree_path = TREE_ROOTS[tree]
    logical_manifest = f"{tree_path}/manifests.d/{HBC_APP_ID}.json"
    logical_service = f"{tree_path}/services.d/{HBC_SERVICE_ID}.service"
    logical_map = f"{tree_path}/api-permissions.d/{MAP_BASENAME}"
    return {
        "service_root": root / tree_path.lstrip("/"),
        "manifest": root / logical_manifest.lstrip("/"),
        "service": root / logical_service.lstrip("/"),
        "mapping": root / logical_map.lstrip("/"),
        "logical_manifest": logical_manifest,
        "logical_service": logical_service,
        "logical_mapping": logical_map,
        "tree": tree,
        "filesystem_root": root,
    }


def _read_json(path: Path, label: str) -> dict:
    try:
        with path.open("r", encoding="utf-8") as source:
            value = json.load(source)
    except (OSError, ValueError) as exc:
        raise RepairError(f"cannot read {label} as JSON: {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise RepairError(f"{label} must contain a JSON object: {path}")
    return value


def _reject_symlink(path: Path, label: str) -> None:
    if path.is_symlink():
        raise RepairError(f"refusing symlink for {label}: {path}")


def inspect(filesystem_root: str | Path = "/", tree: str = "dev") -> dict:
    """Validate the installed HBC files and return a dry-run repair plan."""
    paths = _paths(filesystem_root, tree)
    service_root = paths["service_root"]
    manifest_path = paths["manifest"]
    service_path = paths["service"]
    mapping_path = paths["mapping"]
    logical_service = paths["logical_service"]
    logical_mapping = paths["logical_mapping"]

    for path, label in (
        (service_root, "Luna service tree"),
        (manifest_path, "HBC app manifest"),
        (service_path, "HBC service definition"),
        (mapping_path.parent, "API permission directory"),
    ):
        _reject_symlink(path, label)
    if not service_root.is_dir():
        raise RepairError(f"Luna service tree does not exist: {service_root}")
    if not manifest_path.is_file():
        raise RepairError(f"HBC app manifest does not exist: {manifest_path}")
    if not service_path.is_file():
        raise RepairError(f"HBC service definition does not exist: {service_path}")
    if not mapping_path.parent.is_dir():
        raise RepairError(f"API permission directory does not exist: {mapping_path.parent}")

    manifest = _read_json(manifest_path, "HBC app manifest")
    if manifest.get("id") != HBC_APP_ID:
        raise RepairError(
            f"manifest id is {manifest.get('id')!r}, expected {HBC_APP_ID!r}"
        )
    service_files = manifest.get("serviceFiles")
    if not isinstance(service_files, list) or logical_service not in service_files:
        raise RepairError(
            f"manifest does not register the expected HBC service: {logical_service}"
        )
    api_files = manifest.get("apiPermissionFiles")
    if not isinstance(api_files, list) or not all(isinstance(item, str) for item in api_files):
        raise RepairError("manifest apiPermissionFiles must be a list of paths")

    aliases = [
        item for item in api_files
        if Path(item).name == MAP_BASENAME and item != logical_mapping
    ]
    if aliases:
        raise RepairError(f"manifest has a conflicting path for the permission map: {aliases}")
    already_registered = logical_mapping in api_files

    mapping_exists = mapping_path.exists()
    if mapping_path.is_symlink():
        raise RepairError(f"refusing symlink for HBC permission map: {mapping_path}")
    if mapping_exists:
        if not mapping_path.is_file():
            raise RepairError(f"HBC permission map is not a regular file: {mapping_path}")
        current_mapping = _read_json(mapping_path, "HBC permission map")
        if current_mapping != EXPECTED_MAPPING:
            raise RepairError(
                "HBC permission map already exists with different contents; "
                "leaving it untouched"
            )

    original_manifest = manifest_path.read_bytes()
    changed_manifest = not already_registered
    if changed_manifest:
        manifest["apiPermissionFiles"].append(logical_mapping)
        proposed_manifest = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
    else:
        proposed_manifest = original_manifest

    return {
        "tree": tree,
        "service_root": str(service_root),
        "manifest_path": str(manifest_path),
        "mapping_path": str(mapping_path),
        "logical_mapping": logical_mapping,
        "mapping_exists": mapping_exists,
        "mapping_registered": already_registered,
        "write_mapping": not mapping_exists,
        "write_manifest": changed_manifest,
        "already_applied": mapping_exists and already_registered,
        "manifest": _read_json(manifest_path, "HBC app manifest"),
        "original_manifest_bytes": original_manifest,
        "proposed_manifest_bytes": proposed_manifest,
        "expected_mapping_bytes": (json.dumps(EXPECTED_MAPPING, indent=2) + "\n").encode("utf-8"),
        "paths": paths,
    }


def _atomic_write(path: Path, content: bytes, mode: int, uid: int, gid: int) -> None:
    _reject_symlink(path, "write target")
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, "wb") as target:
            target.write(content)
            target.flush()
            os.fsync(target.fileno())
            os.fchown(target.fileno(), uid, gid)
            os.fchmod(target.fileno(), mode)
        os.replace(temp_path, path)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass


def _metadata(path: Path) -> dict:
    info = path.stat()
    return {
        "mode": stat.S_IMODE(info.st_mode),
        "uid": info.st_uid,
        "gid": info.st_gid,
    }


def _save_backup(plan: dict, backup_dir: str | Path) -> Path:
    root = Path(backup_dir)
    if root.exists() and root.is_symlink():
        raise RepairError(f"refusing symlink as backup directory: {root}")
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(root, 0o700)
    bundle = Path(tempfile.mkdtemp(prefix="hbc-permission-map-", dir=str(root)))
    os.chmod(bundle, 0o700)

    manifest_path = Path(plan["manifest_path"])
    mapping_path = Path(plan["mapping_path"])
    targets = {}
    for key, path, stored_name in (
        ("manifest", manifest_path, "manifest.json"),
        ("mapping", mapping_path, "lunabus-query.json"),
    ):
        existed = path.exists()
        entry = {"logical_path": str(path), "existed": existed}
        if existed:
            _reject_symlink(path, key)
            entry.update(_metadata(path))
            saved = bundle / stored_name
            saved.write_bytes(path.read_bytes())
            os.chmod(saved, 0o600)
            entry["backup_file"] = stored_name
        targets[key] = entry

    state = {
        "version": 1,
        "tree": plan["tree"],
        "service_root": plan["service_root"],
        "expected_manifest_sha256": hashlib.sha256(plan["proposed_manifest_bytes"]).hexdigest(),
        "expected_mapping_sha256": hashlib.sha256(plan["expected_mapping_bytes"]).hexdigest(),
        "targets": targets,
    }
    state_path = bundle / "state.json"
    state_path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    os.chmod(state_path, 0o600)
    return bundle


def _restore_backup(
    bundle_path: str | Path,
    filesystem_root: str | Path = "/",
    tree: str | None = None,
    *,
    verify_current: bool = True,
    scan_services: bool = False,
) -> dict:
    bundle = Path(bundle_path)
    _reject_symlink(bundle, "backup bundle")
    try:
        state = json.loads((bundle / "state.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RepairError(f"cannot read backup state from {bundle}: {exc}") from exc
    if not isinstance(state, dict) or state.get("version") != 1:
        raise RepairError(f"unsupported HBC backup bundle: {bundle}")
    expected_tree = tree or state.get("tree")
    paths = _paths(filesystem_root, expected_tree)
    if str(paths["service_root"]) != state.get("service_root"):
        raise RepairError("backup bundle belongs to a different filesystem root or Luna tree")

    manifest_path = Path(paths["manifest"])
    mapping_path = Path(paths["mapping"])
    targets = state.get("targets")
    if not isinstance(targets, dict) or set(targets) != {"manifest", "mapping"}:
        raise RepairError("backup bundle has invalid target metadata")
    if targets["manifest"].get("logical_path") != str(manifest_path):
        raise RepairError("backup manifest path does not match this target")
    if targets["mapping"].get("logical_path") != str(mapping_path):
        raise RepairError("backup mapping path does not match this target")

    _reject_symlink(manifest_path, "HBC manifest rollback target")
    _reject_symlink(mapping_path, "HBC permission-map rollback target")
    if verify_current:
        if not manifest_path.is_file():
            raise RepairError("current HBC manifest is missing; refusing rollback")
        current_manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        if current_manifest_hash != state.get("expected_manifest_sha256"):
            raise RepairError("HBC manifest changed since repair; refusing to overwrite it")
    if mapping_path.exists():
        if not mapping_path.is_file():
            raise RepairError("HBC permission map is not a regular rollback target")
        current_mapping_hash = hashlib.sha256(mapping_path.read_bytes()).hexdigest()
        if current_mapping_hash != state.get("expected_mapping_sha256"):
            raise RepairError("HBC permission map changed since repair; refusing to overwrite it")

    manifest_target = targets["manifest"]
    if not manifest_target.get("existed"):
        raise RepairError("backup has no original HBC manifest; refusing rollback")
    manifest_backup = bundle / manifest_target.get("backup_file", "")
    if not manifest_backup.is_file():
        raise RepairError("original HBC manifest backup is missing")
    _atomic_write(
        manifest_path,
        manifest_backup.read_bytes(),
        int(manifest_target["mode"]),
        int(manifest_target["uid"]),
        int(manifest_target["gid"]),
    )

    mapping_target = targets["mapping"]
    if mapping_target.get("existed"):
        mapping_backup = bundle / mapping_target.get("backup_file", "")
        if not mapping_backup.is_file():
            raise RepairError("original HBC permission map backup is missing")
        _atomic_write(
            mapping_path,
            mapping_backup.read_bytes(),
            int(mapping_target["mode"]),
            int(mapping_target["uid"]),
            int(mapping_target["gid"]),
        )
    elif mapping_path.exists():
        mapping_path.unlink()
        directory_fd = os.open(mapping_path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)

    live_status = None
    if scan_services:
        try:
            _scan_services()
            live_status = _verify_live_service(expected_lunabus_query=False)
        except RepairError as exc:
            raise RepairError(
                f"rollback files were restored but the live service did not confirm "
                f"the rollback; backup bundle remains at {bundle}: {exc}"
            ) from exc
    return {
        "rolled_back": True,
        "backup_bundle": str(bundle),
        "live_service": live_status or "not checked",
    }


def _scan_services() -> None:
    try:
        result = subprocess.run(["ls-control", "scan-services"], check=False)
    except OSError as exc:
        raise RepairError(f"could not run ls-control scan-services: {exc}") from exc
    if result.returncode != 0:
        raise RepairError(f"ls-control scan-services exited with {result.returncode}")


def parse_exec_provides(introspection: str) -> list[str]:
    """Extract the live ACG list registered for HBC's exec method."""
    matches = re.findall(
        r'"exec"\s*:\s*\{\s*"provides"\s*:\s*(\[[^\]]*\])\s*\}',
        introspection,
    )
    if len(matches) != 1:
        raise RepairError(
            "could not identify exactly one exec method in ls-monitor output"
        )
    try:
        groups = json.loads(matches[0])
    except ValueError as exc:
        raise RepairError("ls-monitor returned an invalid exec permission list") from exc
    if not isinstance(groups, list) or not all(isinstance(item, str) for item in groups):
        raise RepairError("ls-monitor exec permissions must be a list of strings")
    return groups


def _verify_live_service(*, expected_lunabus_query: bool = True) -> dict:
    """Check HBC's active registration, not just its on-disk manifest."""
    try:
        result = subprocess.run(
            ["ls-monitor", "-i", HBC_SERVICE_ID],
            check=False,
            capture_output=True,
            text=True,
            timeout=8,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RepairError(f"could not inspect the live HBC service with ls-monitor: {exc}") from exc
    if result.returncode != 0:
        raise RepairError(
            f"ls-monitor exited with {result.returncode}: {result.stderr.strip()}"
        )
    groups = parse_exec_provides(result.stdout)
    actual = "lunabus.query" in groups
    if actual != expected_lunabus_query:
        state = "does not yet provide" if expected_lunabus_query else "still provides"
        raise RepairError(
            f"the active HBC exec method {state} lunabus.query; the files and a "
            "successful scan-services command do not prove that an already-running "
            "dynamic service reloaded its access groups. Restart the HBC service, "
            "make a new HBC request, then run --verify-live."
        )
    return {"exec_groups": groups, "lunabus_query": actual}


def apply(
    filesystem_root: str | Path = "/",
    tree: str = "dev",
    backup_dir: str | Path | None = None,
    *,
    scan_services: bool = False,
) -> dict:
    if not backup_dir:
        raise RepairError("--backup-dir is required with --apply")
    plan = inspect(filesystem_root, tree)
    if plan["already_applied"]:
        live_status = None
        if scan_services:
            _scan_services()
            live_status = _verify_live_service(expected_lunabus_query=True)
        return {
            "changed": False,
            "already_applied": True,
            "tree": tree,
            "service_scan": "complete" if scan_services else "not requested",
            "live_service": live_status or "not checked",
        }
    bundle = _save_backup(plan, backup_dir)
    manifest_path = Path(plan["manifest_path"])
    mapping_path = Path(plan["mapping_path"])
    manifest_meta = _metadata(manifest_path)
    map_meta = _metadata(manifest_path)
    try:
        # Create the referenced API map before publishing its path in the manifest.
        if plan["write_mapping"]:
            _atomic_write(
                mapping_path,
                plan["expected_mapping_bytes"],
                0o644,
                map_meta["uid"],
                map_meta["gid"],
            )
        if plan["write_manifest"]:
            _atomic_write(
                manifest_path,
                plan["proposed_manifest_bytes"],
                manifest_meta["mode"],
                manifest_meta["uid"],
                manifest_meta["gid"],
            )
    except Exception:
        _restore_backup(bundle, filesystem_root, tree, verify_current=False)
        raise

    live_status = None
    if scan_services:
        try:
            _scan_services()
            live_status = _verify_live_service(expected_lunabus_query=True)
        except RepairError as exc:
            raise RepairError(f"{exc}; changes remain applied, rollback bundle: {bundle}") from exc
    return {
        "changed": True,
        "already_applied": False,
        "tree": tree,
        "mapping_path": plan["mapping_path"],
        "manifest_path": plan["manifest_path"],
        "backup_bundle": str(bundle),
        "service_scan": "complete" if scan_services else "not requested",
        "live_service": live_status or "not checked",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tree", choices=sorted(TREE_ROOTS), default="dev")
    parser.add_argument(
        "--filesystem-root",
        default="/",
        help="alternate filesystem root for offline validation (default: /)",
    )
    parser.add_argument("--apply", action="store_true", help="write the exact upstream mapping")
    parser.add_argument(
        "--verify-live",
        action="store_true",
        help="verify the active HBC exec permission groups with ls-monitor",
    )
    parser.add_argument("--backup-dir", help="required parent directory for a rollback bundle")
    parser.add_argument("--rollback", metavar="BUNDLE", help="restore a previously saved bundle")
    args = parser.parse_args(argv)

    try:
        if sum((args.apply, bool(args.rollback), args.verify_live)) > 1:
            raise RepairError("choose only one of --apply, --rollback, or --verify-live")
        live_root = Path(args.filesystem_root).absolute() == Path("/")
        if args.apply:
            if os.geteuid() != 0:
                raise RepairError("--apply must run as root on the TV")
            result = apply(
                args.filesystem_root,
                args.tree,
                args.backup_dir,
                scan_services=live_root,
            )
        elif args.verify_live:
            if not live_root:
                raise RepairError("--verify-live requires the TV's live filesystem root")
            if os.geteuid() != 0:
                raise RepairError("--verify-live must run as root on the TV")
            plan = inspect(args.filesystem_root, args.tree)
            if not plan["mapping_exists"] or not plan["mapping_registered"]:
                raise RepairError(
                    "the on-disk lunabus.query map or its HBC manifest registration is missing"
                )
            live_status = _verify_live_service(expected_lunabus_query=True)
            result = {
                "tree": args.tree,
                "mapping_path": plan["mapping_path"],
                "mapping_registered": True,
                "live_service": live_status,
            }
        elif args.rollback:
            if os.geteuid() != 0:
                raise RepairError("--rollback must run as root on the TV")
            result = _restore_backup(
                args.rollback,
                args.filesystem_root,
                args.tree,
                scan_services=live_root,
            )
        else:
            result = inspect(args.filesystem_root, args.tree)
            result = {
                key: value for key, value in result.items()
                if key not in {"manifest", "original_manifest_bytes", "proposed_manifest_bytes", "expected_mapping_bytes", "paths"}
            }
            result["mode"] = "dry-run"
        print(json.dumps(result, indent=2, default=str))
    except (RepairError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

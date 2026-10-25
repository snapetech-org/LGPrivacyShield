#!/usr/bin/env python3
"""Build a webOS IPK from an already prepared application directory."""

from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import stat
import tarfile
from pathlib import Path

from package_identity import validate_package_identity


def _tar_info(name: str, mode: int, mtime: int, size: int = 0) -> tarfile.TarInfo:
    info = tarfile.TarInfo(name)
    info.mode = mode
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = mtime
    info.size = size
    return info


def _tar_gz(
    entries: list[tuple[str, Path | bytes, int]],
    directories: set[str] | None = None,
    mtime: int = 0,
) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode="wb", compresslevel=9, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as archive:
            for name in sorted(directories or (), key=lambda item: (item.count("/"), item)):
                info = _tar_info(f"{name.rstrip('/')}/", 0o755, mtime)
                info.type = tarfile.DIRTYPE
                archive.addfile(info)
            for name, source, mode in entries:
                if isinstance(source, bytes):
                    archive.addfile(_tar_info(name, mode, mtime, len(source)), io.BytesIO(source))
                else:
                    with source.open("rb") as content:
                        archive.addfile(_tar_info(name, mode, mtime, source.stat().st_size), content)
    return output.getvalue()


def _ar_archive(members: list[tuple[str, bytes]], mtime: int) -> bytes:
    archive = bytearray(b"!<arch>\n")
    for name, content in members:
        if len(name) > 15 or "/" in name:
            raise ValueError(f"unsupported ar member name: {name}")
        header = (
            f"{name + '/':<16}{mtime:<12}{0:<6}{0:<6}{0o100644:<8o}"
            f"{len(content):<10}`\n"
        ).encode("ascii")
        if len(header) != 60:
            raise ValueError("invalid ar header")
        archive.extend(header)
        archive.extend(content)
        if len(content) % 2:
            archive.extend(b"\n")
    return bytes(archive)


def build_ipk(app_dir: Path, output: Path) -> None:
    app_dir = app_dir.resolve()
    appinfo_path = app_dir / "appinfo.json"
    appinfo = json.loads(appinfo_path.read_text(encoding="utf-8"))
    if not isinstance(appinfo, dict):
        raise ValueError("appinfo.json must contain a JSON object")
    app_id, version = validate_package_identity(appinfo.get("id"), appinfo.get("version"))

    packageinfo = json.dumps(
        {"id": app_id, "version": version, "app": app_id},
        separators=(",", ":"),
    ).encode("utf-8")
    source_date_epoch = os.environ.get("SOURCE_DATE_EPOCH", "0")
    if not source_date_epoch.isascii() or not source_date_epoch.isdecimal():
        raise ValueError("SOURCE_DATE_EPOCH must be a nonnegative integer")
    mtime = int(source_date_epoch)
    if mtime > 8_589_934_591:
        raise ValueError("SOURCE_DATE_EPOCH is too large for a reproducible USTAR archive")
    base = f"usr/palm/applications/{app_id}"
    packageinfo_path = f"usr/palm/packages/{app_id}/packageinfo.json"

    files: list[tuple[str, Path | bytes, int]] = []
    directories = {"usr", "usr/palm", "usr/palm/applications", "usr/palm/packages"}
    total_size = len(packageinfo)
    for path in sorted(app_dir.rglob("*"), key=lambda item: item.relative_to(app_dir).as_posix()):
        relative = path.relative_to(app_dir)
        if "__pycache__" in relative.parts or path.suffix == ".pyc":
            continue
        if path.is_symlink():
            raise ValueError(f"symlinks are not supported in IPK input: {relative}")
        archive_name = f"{base}/{relative.as_posix()}"
        if path.is_dir():
            directories.add(archive_name)
            continue
        if not path.is_file():
            continue
        for parent in Path(archive_name).parents:
            if parent.as_posix() not in {".", ""}:
                directories.add(parent.as_posix())
        mode = stat.S_IMODE(path.stat().st_mode) or 0o644
        files.append((archive_name, path, mode))
        total_size += path.stat().st_size
    files.append((packageinfo_path, packageinfo, 0o644))

    control = (
        f"Package: {app_id}\n"
        f"Version: {version}\n"
        "Section: misc\n"
        "Priority: optional\n"
        "Architecture: all\n"
        f"Installed-Size: {total_size}\n"
        "Maintainer: N/A <nobody@example.com>\n"
        "Description: This is a webOS application.\n"
        "webOS-Package-Format-Version: 2\n"
        "webOS-Packager-Version: x.y.x\n"
    ).encode("utf-8")

    data_entries = files
    control_tar = _tar_gz([("control", control, 0o644)], mtime=mtime)
    data_tar = _tar_gz(data_entries, directories, mtime)
    result = _ar_archive([
        ("debian-binary", b"2.0\n"),
        ("control.tar.gz", control_tar),
        ("data.tar.gz", data_tar),
    ], mtime)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_ipk(args.app_dir, args.output)
    print(args.output)


if __name__ == "__main__":
    main()

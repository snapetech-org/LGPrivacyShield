import io
import json
import os
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from package_ipk import build_ipk  # noqa: E402


def read_ar(path):
    archive = path.read_bytes()
    if not archive.startswith(b"!<arch>\n"):
        raise AssertionError("missing ar archive header")
    members = {}
    offset = 8
    while offset < len(archive):
        header = archive[offset:offset + 60]
        if len(header) != 60 or header[58:60] != b"`\n":
            raise AssertionError("invalid ar member header")
        name = header[:16].decode("ascii").rstrip().removesuffix("/")
        size = int(header[48:58].decode("ascii").strip())
        offset += 60
        members[name] = archive[offset:offset + size]
        offset += size + (size % 2)
    return members


class PackageIpkTests(unittest.TestCase):
    def test_creates_installable_reproducible_ipk_and_omits_python_cache(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            app = root / "app"
            app.mkdir()
            (app / "appinfo.json").write_text(json.dumps({"id": "org.example", "version": "1.2.3"}))
            (app / "index.html").write_text("<main>hello</main>")
            cache = app / "scripts" / "__pycache__"
            cache.mkdir(parents=True)
            (cache / "old.cpython-314.pyc").write_bytes(b"stale bytecode")

            first = root / "first.ipk"
            second = root / "second.ipk"
            with patch.dict(os.environ, {"SOURCE_DATE_EPOCH": "1792950000"}):
                build_ipk(app, first)
                build_ipk(app, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

            members = read_ar(first)
            self.assertEqual(list(members), ["debian-binary", "control.tar.gz", "data.tar.gz"])
            self.assertEqual(members["debian-binary"], b"2.0\n")
            with tarfile.open(fileobj=io.BytesIO(members["control.tar.gz"]), mode="r:gz") as archive:
                control = archive.extractfile("control").read().decode("utf-8")
            self.assertIn("Package: org.example\n", control)
            self.assertIn("Version: 1.2.3\n", control)
            with tarfile.open(fileobj=io.BytesIO(members["data.tar.gz"]), mode="r:gz") as archive:
                names = archive.getnames()
                self.assertIn("usr/palm/applications/org.example/index.html", names)
                self.assertIn("usr/palm/packages/org.example/packageinfo.json", names)
                self.assertFalse(any("__pycache__" in name or name.endswith(".pyc") for name in names))
                self.assertTrue(all(member.mtime == 1792950000 for member in archive.getmembers()))


if __name__ == "__main__":
    unittest.main()

import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/repair_hbc_permission_map.py"
SPEC = importlib.util.spec_from_file_location("repair_hbc_permission_map", MODULE_PATH)
repair = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(repair)


class HbcPermissionMapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.service_root = self.root / "var/luna-service2-dev"
        (self.service_root / "manifests.d").mkdir(parents=True)
        (self.service_root / "services.d").mkdir()
        (self.service_root / "api-permissions.d").mkdir()
        self.manifest_path = self.service_root / "manifests.d/org.webosbrew.hbchannel.json"
        self.mapping_path = self.service_root / "api-permissions.d" / repair.MAP_BASENAME
        service_path = self.service_root / "services.d/org.webosbrew.hbchannel.service.service"
        service_path.write_text("{\"services\": []}\n", encoding="utf-8")
        self.original_manifest = {
            "apiPermissionFiles": [
                "/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.json",
                "/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.public.json",
            ],
            "clientPermissionFiles": [],
            "id": "org.webosbrew.hbchannel",
            "roleFiles": [],
            "serviceFiles": [
                "/var/luna-service2-dev/services.d/org.webosbrew.hbchannel.service.service"
            ],
            "version": "0.7.3",
        }
        self.original_manifest_bytes = (json.dumps(self.original_manifest, indent=2) + "\n").encode()
        self.manifest_path.write_bytes(self.original_manifest_bytes)
        self.backups = self.root / "backup"

    def tearDown(self):
        self.temp.cleanup()

    def inspect(self):
        return repair.inspect(self.root, "dev")

    def test_dry_run_maps_the_missing_group_without_writing(self):
        plan = self.inspect()
        self.assertTrue(plan["write_mapping"])
        self.assertTrue(plan["write_manifest"])
        self.assertFalse(self.mapping_path.exists())
        self.assertEqual(self.manifest_path.read_bytes(), self.original_manifest_bytes)

    def test_apply_adds_only_exact_upstream_mapping_and_manifest_path(self):
        result = repair.apply(self.root, "dev", self.backups)
        self.assertTrue(result["changed"])
        self.assertEqual(
            json.loads(self.mapping_path.read_text(encoding="utf-8")),
            {"lunabus.query": ["org.webosbrew.hbchannel.service/*"]},
        )
        manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(
            manifest["apiPermissionFiles"],
            self.original_manifest["apiPermissionFiles"] + [
                "/var/luna-service2-dev/api-permissions.d/"
                "org.webosbrew.hbchannel.service.api.lunabus.query.json"
            ],
        )
        self.assertEqual(set(manifest), set(self.original_manifest))
        self.assertEqual(stat.S_IMODE(self.manifest_path.stat().st_mode), 0o644)
        self.assertEqual(stat.S_IMODE(self.mapping_path.stat().st_mode), 0o644)

    def test_apply_is_idempotent(self):
        first = repair.apply(self.root, "dev", self.backups)
        second = repair.apply(self.root, "dev", self.backups)
        self.assertTrue(first["changed"])
        self.assertFalse(second["changed"])
        self.assertTrue(second["already_applied"])
        self.assertEqual(len(list(self.backups.iterdir())), 1)

    def test_conflicting_existing_map_is_refused_without_mutation(self):
        self.mapping_path.write_text('{"lunabus.query": ["other.service/*"]}\n', encoding="utf-8")
        old_map = self.mapping_path.read_bytes()
        with self.assertRaisesRegex(repair.RepairError, "different contents"):
            repair.apply(self.root, "dev", self.backups)
        self.assertEqual(self.mapping_path.read_bytes(), old_map)
        self.assertEqual(self.manifest_path.read_bytes(), self.original_manifest_bytes)
        self.assertFalse(self.backups.exists())

    def test_wrong_manifest_identity_is_refused(self):
        manifest = dict(self.original_manifest)
        manifest["id"] = "unrelated.app"
        self.manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(repair.RepairError, "manifest id"):
            self.inspect()

    def test_rollback_restores_original_manifest_bytes_and_removes_new_map(self):
        self.manifest_path.chmod(0o640)
        result = repair.apply(self.root, "dev", self.backups)
        bundle = Path(result["backup_bundle"])
        rollback = repair._restore_backup(bundle, self.root, "dev")
        self.assertTrue(rollback["rolled_back"])
        self.assertEqual(self.manifest_path.read_bytes(), self.original_manifest_bytes)
        self.assertEqual(stat.S_IMODE(self.manifest_path.stat().st_mode), 0o640)
        self.assertFalse(self.mapping_path.exists())

    def test_rollback_refuses_to_overwrite_a_manifest_changed_after_apply(self):
        result = repair.apply(self.root, "dev", self.backups)
        bundle = Path(result["backup_bundle"])
        self.manifest_path.write_text("{}\n", encoding="utf-8")
        with self.assertRaisesRegex(repair.RepairError, "changed since repair"):
            repair._restore_backup(bundle, self.root, "dev")
        self.assertEqual(self.manifest_path.read_text(encoding="utf-8"), "{}\n")

    def test_existing_exact_map_is_registered_without_rewriting_it(self):
        self.mapping_path.write_text(json.dumps(repair.EXPECTED_MAPPING) + "\n", encoding="utf-8")
        self.mapping_path.chmod(0o600)
        before = self.mapping_path.stat()
        plan = self.inspect()
        self.assertFalse(plan["write_mapping"])
        self.assertTrue(plan["write_manifest"])
        repair.apply(self.root, "dev", self.backups)
        after = self.mapping_path.stat()
        self.assertEqual(stat.S_IMODE(after.st_mode), 0o600)
        self.assertEqual((after.st_uid, after.st_gid), (before.st_uid, before.st_gid))

    def test_parse_exec_permissions_from_live_ls_monitor_output(self):
        output = '''METHODS AND SIGNALS REGISTERED BY SERVICE
  "/":
      "exec": {"provides":["public","lunabus.query","default.permission.platform"]}
'''
        self.assertEqual(
            repair.parse_exec_provides(output),
            ["public", "lunabus.query", "default.permission.platform"],
        )

    def test_live_verification_requires_the_group_on_exec(self):
        completed = subprocess.CompletedProcess(
            ["ls-monitor", "-i", repair.HBC_SERVICE_ID],
            0,
            '"exec": {"provides":["public","lunabus.query"]}',
            "",
        )
        with patch.object(repair.subprocess, "run", return_value=completed):
            status = repair._verify_live_service()
        self.assertTrue(status["lunabus_query"])
        self.assertIn("lunabus.query", status["exec_groups"])

    def test_live_verification_rejects_stale_or_unexpected_registration(self):
        completed = subprocess.CompletedProcess(
            ["ls-monitor", "-i", repair.HBC_SERVICE_ID],
            0,
            '"exec": {"provides":["public","default.permission.platform"]}',
            "",
        )
        with patch.object(repair.subprocess, "run", return_value=completed):
            with self.assertRaisesRegex(repair.RepairError, "scan-services command do not prove"):
                repair._verify_live_service(expected_lunabus_query=True)
            self.assertFalse(repair._verify_live_service(expected_lunabus_query=False)["lunabus_query"])

    def test_parse_rejects_unrecognized_introspection_instead_of_passing(self):
        with self.assertRaisesRegex(repair.RepairError, "exactly one exec method"):
            repair.parse_exec_provides("service is not registered")


class AppPermissionTests(unittest.TestCase):
    def test_native_user_agreement_screen_permission_is_declared(self):
        appinfo_path = Path(__file__).resolve().parents[1] / "webos-app/appinfo.json"
        appinfo = json.loads(appinfo_path.read_text(encoding="utf-8"))
        self.assertIn("applications.launcher", appinfo["requiredACG"])


if __name__ == "__main__":
    unittest.main()

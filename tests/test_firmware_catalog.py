import importlib.util
import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_firmware_catalog import build_catalog, render_js  # noqa: E402


CATALOG_PATH = ROOT / "data/lg-oled-firmware-catalog.json"
IMPORTER_PATH = ROOT / "scripts/import_firmware_keymap.py"
SPEC = importlib.util.spec_from_file_location("import_firmware_keymap", IMPORTER_PATH)
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


def sample_document():
    return {
        "fws": {
            "mirror2/US/sample.zip": {
                "relativePath": "mirror2/US/sample.zip",
                "zipFileSha256": "a" * 64,
                "zipFileSizeBytes": 1000,
                "lookupInfo": {"country": "US", "releaseDate": "2026-09-21", "modelNames": ["OLED55B1PUA.AUS"]},
                "epks": [
                    {
                        "firmwareotaID": "HE_DTV_W21U_AFADATAA",
                        "firmwareversion": "03.53.45.01",
                        "sdkVersion": "6.5.3",
                        "platformVersion": "6.5.3",
                        "epkSha256": "b" * 64,
                        "epkFileSizeBytes": 900,
                        "file": "b1.epk",
                    },
                ],
            },
            "mirror2/US/c2.zip": {
                "relativePath": "mirror2/US/c2.zip", "zipFileSha256": "c" * 64, "zipFileSizeBytes": 800,
                "lookupInfo": {"country": "US", "releaseDate": "2026-09-21", "modelNames": ["OLED65C2PUA.AUS"]},
                "epks": [{"firmwareotaID": "HE_DTV_W22O_AFABATPU", "firmwareversion": "33.31.68.01", "sdkVersion": "10.3.1", "platformVersion": "10.3.1", "epkSha256": "d" * 64, "epkFileSizeBytes": 700, "file": "c2.epk"}],
            },
            "mirror2/US/g5.zip": {
                "relativePath": "mirror2/US/g5.zip", "zipFileSha256": "e" * 64, "zipFileSizeBytes": 700,
                "lookupInfo": {"country": "US", "releaseDate": "2026-09-21", "modelNames": ["OLED65G5WUA.AUS"]},
                "epks": [{"firmwareotaID": "HE_DTV_W25O_AFABATAA", "firmwareversion": "33.31.75.01", "sdkVersion": "10.3.1", "platformVersion": "10.3.1", "epkSha256": "f" * 64, "epkFileSizeBytes": 600, "file": "g5.epk"}],
            },
            "mirror2/US/not-lg.zip": {
                "relativePath": "mirror2/US/not-lg.zip",
                "zipFileSha256": "e" * 64,
                "zipFileSizeBytes": 2000,
                "lookupInfo": {"modelNames": ["Samsung S90"], "country": "US"},
                "epks": [],
            },
        }
    }


class FirmwareCatalogTests(unittest.TestCase):
    def test_current_catalog_covers_all_eighteen_families_and_all_exact_model_records(self):
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(catalog["coverage"]), 18)
        self.assertTrue(all(row["modelCount"] > 0 and row["packageBuildCount"] > 0 for row in catalog["coverage"].values()))
        self.assertEqual(catalog["modelCount"], 525)
        self.assertEqual(catalog["packageBuildCount"], 405)
        self.assertEqual(catalog["settingsMapsExtracted"], 0)
        self.assertEqual(catalog["coverage"]["B1"]["otaIds"], ["HE_DTV_W21U_AFADATAA", "HE_DTV_W21U_AFADJAAA"])
        self.assertTrue(all("categoryKeysMap" not in record for record in catalog["records"]))

    def test_current_index_links_the_exact_c6_firmware_build_without_claiming_key_extraction(self):
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        records = [
            record for record in catalog["records"]
            if "OLED77C6HUP" in [model.split(".", 1)[0] for model in record["models"]]
            and record["firmwareVersion"] == "43.21.79.01"
        ]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["otaId"], "HE_DTV_W26O_AFABATAA")
        self.assertEqual(records[0]["zipSha256"], "e18681230c091c85a2a343752023cdd6da3d06a73e7958b5667e8edea909e8bf")
        self.assertEqual(records[0]["epkSha256"], "aa838614c503de6179a3bbc06ff355452db31cc710d20db7a288cadc91d6b1f3")

    def test_builder_preserves_b1_w21u_and_model_specific_build_identities(self):
        raw = json.dumps(sample_document(), sort_keys=True).encode()
        catalog = build_catalog(sample_document(), raw, "2026-10-25")
        self.assertEqual(catalog["coverage"]["B1"]["otaIds"], ["HE_DTV_W21U_AFADATAA"])
        self.assertEqual(catalog["coverage"]["C2"]["otaIds"], ["HE_DTV_W22O_AFABATPU"])
        self.assertEqual(catalog["coverage"]["G5"]["otaIds"], ["HE_DTV_W25O_AFABATAA"])
        self.assertEqual(catalog["packageBuildCount"], 3)
        self.assertIn("LGPrivacyShieldFirmwareData", render_js(catalog))
        self.assertNotIn("Samsung S90", render_js(catalog))

    def test_builder_rejects_unsafe_archive_paths_and_does_not_emit_unchecksummed_images(self):
        document = sample_document()
        bad = document["fws"]["mirror2/US/sample.zip"]
        bad["relativePath"] = "../private.zip"
        catalog = build_catalog(document, b"{}", "2026-10-25")
        self.assertEqual(catalog["packageBuildCount"], 2)
        self.assertTrue(all(".." not in record["archivePath"].split("/") for record in catalog["records"]))

        document = sample_document()
        next(source for source in document["fws"].values() if "OLED65G5WUA.AUS" in source["lookupInfo"]["modelNames"])["zipFileSha256"] = "invalid"
        catalog = build_catalog(document, b"{}", "2026-10-25")
        self.assertEqual(catalog["packageBuildCount"], 2)
        self.assertFalse(any("OLED65G5WUA.AUS" in record["models"] for record in catalog["records"]))

    def test_importer_requires_exact_model_firmware_and_ota_package_identity(self):
        catalog = {
            "source": {"sha256": "f" * 64},
            "records": [{
                "models": ["OLED65G5WUA.AUS"],
                "families": ["G5"],
                "otaId": "HE_DTV_W25O_AFABATAA",
                "firmwareVersion": "33.31.75.01",
                "sdkVersion": "10.3.1",
                "platformVersion": "10.3.1",
                "epkSha256": "d" * 64,
                "zipSha256": "a" * 64,
                "archiveUrl": "https://tv.slada.sk/mirror2/US/sample.zip",
            }],
        }
        raw_registry = [
            {"category": "general", "keys": ["homePromotion", "screenSaverAd", "secretPreference"]},
            {"category": "option", "keys": ["livePlus", "hbbTvDnt"]},
            {"category": "privateCategory", "keys": ["screenSaverAd"]},
        ]
        raw_bytes = json.dumps(raw_registry, separators=(",", ":")).encode()
        image_sha256 = hashlib.sha256(b"verified firmware image").hexdigest()
        catalog["records"][0]["epkSha256"] = image_sha256
        result = IMPORTER.import_registry(
            raw_registry, raw_bytes, catalog, "OLED65G5WUA.ACCQLJD", "33.31.75",
            "HE_DTV_W25O_AFABATAA", image_sha256, "2026-10-25"
        )
        self.assertEqual(result["categoryKeysMap"], [
            {"category": "general", "keys": ["homePromotion"]},
            {"category": "option", "keys": ["hbbTvDnt", "livePlus"]},
        ])
        self.assertEqual(result["ambiguousKeys"], ["screenSaverAd"])
        self.assertEqual(result["provenance"]["firmwarePackage"]["zipSha256"], "a" * 64)
        self.assertEqual(result["provenance"]["firmwarePackage"]["verifiedImageSha256"], image_sha256)
        self.assertEqual(result["evidence"]["physicalValidation"], "not-performed")
        self.assertEqual(result["evidence"]["firmwareImageHash"], "verified-against-archive-index")
        self.assertEqual(result["evidence"]["registryExtraction"], "not-independently-reproduced")
        serialized = json.dumps(result)
        self.assertNotIn("secretPreference", serialized)
        self.assertNotIn('"off"', serialized)
        self.assertNotIn('"on"', serialized)
        self.assertNotIn("settings", result)

        for arguments in [
            ("OLED65B5PUA", "33.31.75", "HE_DTV_W25O_AFABATAA"),
            ("OLED65G5WUA", "33.31.74", "HE_DTV_W25O_AFABATAA"),
            ("OLED65G5WUA", "33.31.75", "HE_DTV_W25H_AFADATAA"),
        ]:
            with self.subTest(arguments=arguments), self.assertRaises(ValueError):
                IMPORTER.firmware_build(catalog, *arguments, image_sha256)
        with self.assertRaisesRegex(ValueError, "EPK image SHA-256"):
            IMPORTER.firmware_build(catalog, "OLED65G5WUA", "33.31.75", "HE_DTV_W25O_AFABATAA", "f" * 64)

    def test_importer_rejects_empty_or_malformed_registry_and_uses_image_hash_to_resolve_builds(self):
        with self.assertRaises(ValueError):
            IMPORTER.sanitize_registry({"general": {"homePromotion": "off"}})
        with self.assertRaises(ValueError):
            IMPORTER.sanitize_registry([{"category": "general", "keys": ["unknownPrivateKey"]}])

        catalog = {
            "source": {"sha256": "f" * 64},
            "records": [
                {
                    "models": ["OLED65G5WUA.AUS"], "otaId": "HE_DTV_W25O_AFABATAA",
                    "firmwareVersion": "33.31.75.01", "zipSha256": "a" * 64,
                    "epkSha256": "b" * 64,
                },
                {
                    "models": ["OLED65G5WUA.AUS"], "otaId": "HE_DTV_W25O_AFABATAA",
                    "firmwareVersion": "33.31.75.01", "zipSha256": "c" * 64,
                    "epkSha256": "d" * 64,
                },
            ],
        }
        selected = IMPORTER.firmware_build(
            catalog, "OLED65G5WUA", "33.31.75", "HE_DTV_W25O_AFABATAA", "d" * 64
        )
        self.assertEqual(selected["epkSha256"], "d" * 64)
        with self.assertRaisesRegex(ValueError, "EPK image SHA-256"):
            IMPORTER.firmware_build(
                catalog, "OLED65G5WUA", "33.31.75", "HE_DTV_W25O_AFABATAA", "f" * 64
            )


if __name__ == "__main__":
    unittest.main()

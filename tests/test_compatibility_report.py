import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts/validate_compatibility_report.py"
SPEC = importlib.util.spec_from_file_location("validate_compatibility_report", MODULE_PATH)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


class CompatibilityReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.example = json.loads((ROOT / "docs/compatibility-report.example.json").read_text(encoding="utf-8"))

    def test_published_example_matches_the_schema(self):
        summary = validator.validate_report(self.example)
        self.assertEqual(summary["evidenceLevel"], "source-mapped")
        self.assertEqual(summary["mappedControlCount"], 15)
        self.assertEqual(summary["readableControlCount"], 15)

    def test_unmapped_model_report_is_valid_and_has_no_mapped_controls(self):
        report = json.loads(json.dumps(self.example))
        report["device"]["model"] = "OLED65B5HNA"
        report["compatibility"] = {
            "profileId": None,
            "evidenceLevel": "unmapped",
            "sampleCount": 0,
            "mappedControlCount": 0,
        }
        self.assertEqual(validator.validate_report(report)["mappedControlCount"], 0)

    def test_rejects_unknown_fields_including_identifiers(self):
        report = json.loads(json.dumps(self.example))
        report["device"]["serialNumber"] = "1234567890"
        with self.assertRaisesRegex(ValueError, "unknown serialNumber"):
            validator.validate_report(report)

    def test_rejects_unknown_control_fields_and_non_boolean_values(self):
        report = json.loads(json.dumps(self.example))
        report["controlReads"]["macAddress"] = True
        with self.assertRaisesRegex(ValueError, "unknown macAddress"):
            validator.validate_report(report)
        del report["controlReads"]["macAddress"]
        report["controlReads"]["livePlus"] = "on"
        with self.assertRaisesRegex(ValueError, "must be booleans"):
            validator.validate_report(report)

    def test_rejects_network_identifiers_and_extra_agreement_or_setting_data(self):
        report = json.loads(json.dumps(self.example))
        report["device"]["model"] = "192.168.50.87"
        with self.assertRaisesRegex(ValueError, "not a supported"):
            validator.validate_report(report)
        report = json.loads(json.dumps(self.example))
        report["agreements"] = {"S_VNG": True}
        with self.assertRaisesRegex(ValueError, "unknown agreements"):
            validator.validate_report(report)
        report = json.loads(json.dumps(self.example))
        report["settings"] = {"livePlus": "on"}
        with self.assertRaisesRegex(ValueError, "unknown settings"):
            validator.validate_report(report)

    def test_rejects_malformed_and_duplicate_key_json(self):
        with self.assertRaises(json.JSONDecodeError):
            validator.parse_report("{bad json")
        with self.assertRaisesRegex(ValueError, "duplicate JSON field"):
            validator.parse_report('{"schemaVersion":1,"schemaVersion":1}')

    def test_rejects_inconsistent_profile_metadata(self):
        report = json.loads(json.dumps(self.example))
        report["compatibility"]["mappedControlCount"] = 0
        with self.assertRaisesRegex(ValueError, "requires an identified device"):
            validator.validate_report(report)


if __name__ == "__main__":
    unittest.main()

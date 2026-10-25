import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "webos-app/scripts/device_snapshot.py"
SPEC = importlib.util.spec_from_file_location("device_snapshot", MODULE_PATH)
device_snapshot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(device_snapshot)


class DeviceSnapshotTests(unittest.TestCase):
    def test_privacy_settings_return_only_allowlisted_on_off_values(self):
        settings = device_snapshot.privacy_settings(
            {
                "livePlus": "off",
                "turnOnByVoice": "on",
                "hbbTV": "off",
                "hbbTvDnt": "on",
                "hbbTvDeviceId": "off",
                "livePromotion": "on",
                "thirdPartyCookie": "onByUser",
                "homeSenseAbsence": "off",
                "unrelated": "on",
            },
            {
                "voiceLongDistance": "off",
                "lmt": "on",
                "doNotSellMyPersonalInformation": "off",
                "screenSaverAd": "on",
                "homePromotion": "off",
                "other": "sensitive",
            },
            {"bleAdvertisingOnOff": "off", "other": "private"},
            {"contentRecommendation": "on", "other": "private"},
        )
        self.assertEqual(
            settings,
            {
                "livePlus": "off",
                "turnOnByVoice": "on",
                "voiceLongDistance": "off",
                "hbbTV": "off",
                "hbbTvDnt": "on",
                "hbbTvDeviceId": "off",
                "lmt": "on",
                "doNotSellMyPersonalInformation": "off",
                "screenSaverAd": "on",
                "homePromotion": "off",
                "livePromotion": "on",
                "contentRecommendation": "on",
                "thirdPartyCookie": "onByUser",
                "bleAdvertisingOnOff": "off",
                "homeSenseAbsence": "off",
            },
        )

    def test_privacy_settings_omit_unrecognized_or_malformed_values(self):
        self.assertEqual(
            device_snapshot.privacy_settings(
                {"livePlus": True, "turnOnByVoice": {"value": "on"}},
                None,
            ),
            {},
        )
        self.assertEqual(device_snapshot.privacy_settings({}, {}, {}, {}), {})

    def test_agreements_return_only_allowlisted_explicit_booleans(self):
        record = {
            "eulaInfoNetwork": {
                "eulaList": [
                    {"id": "S_VNG", "accepted": False},
                    {"id": "S_ADG", "accepted": True},
                    {"id": "S_ALL", "accepted": True},
                    {"id": "S_TAG", "accepted": "false"},
                    {"id": "S_MKT"},
                ]
            }
        }
        self.assertEqual(
            device_snapshot.agreements(record),
            {
                "eulaInfoNetwork": {
                    "eulaList": [
                        {"id": "S_VNG", "accepted": False},
                        {"id": "S_ADG", "accepted": True},
                    ]
                }
            },
        )

    def test_diagnostics_expose_upload_flags_without_returning_full_preferences(self):
        details = device_snapshot.diagnostics({
            "faultLogUpload": False,
            "dbgLogUpload": False,
            "unrelated": "private",
        })
        self.assertEqual(details["faultLogUpload"], False)
        self.assertEqual(details["debugLogUpload"], False)
        self.assertIn("services", details)
        self.assertIn("autoUpload", details)
        self.assertNotIn("unrelated", details)

    def test_malformed_agreement_data_fails_closed(self):
        self.assertEqual(
            device_snapshot.agreements({"eulaInfoNetwork": {"eulaList": "bad"}}),
            {"eulaInfoNetwork": {"eulaList": []}},
        )
        self.assertEqual(
            device_snapshot.agreements({}),
            {"eulaInfoNetwork": {"eulaList": []}},
        )


if __name__ == "__main__":
    unittest.main()

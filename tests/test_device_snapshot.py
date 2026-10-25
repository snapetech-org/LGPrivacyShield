import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "webos-app/scripts/device_snapshot.py"
FIRMWARE_MAP_FIXTURE = Path(__file__).resolve().parent / "fixtures/oled77c6hup-firmware-key-map.json"
SPEC = importlib.util.spec_from_file_location("device_snapshot", MODULE_PATH)
device_snapshot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(device_snapshot)


class DeviceSnapshotTests(unittest.TestCase):
    def test_c6_firmware_key_index_fixture_matches_the_live_allowlisted_inventory(self):
        fixture = json.loads(FIRMWARE_MAP_FIXTURE.read_text(encoding="utf-8"))
        firmware_map = device_snapshot.firmware_settings_map(fixture["categoryKeysMap"])
        self.assertTrue(firmware_map["available"])
        self.assertEqual(len(firmware_map["settings"]), 24)
        self.assertEqual(firmware_map["ambiguous"], [])
        self.assertEqual(firmware_map["settings"]["livePlus"], "option")
        self.assertEqual(firmware_map["settings"]["doNotSellMyPersonalInformation"], "general")
        self.assertNotIn("hbbTvDnt", firmware_map["settings"])
        self.assertNotIn("privateUnreviewedKey", firmware_map["settings"])
        self.assertEqual(fixture["provenance"]["model"], "OLED77C6HUP.ACCQLJD")
        self.assertEqual(fixture["provenance"]["firmware"], "43.21.79")

    def test_firmware_key_index_omits_missing_and_ambiguous_candidates(self):
        firmware_map = device_snapshot.firmware_settings_map([
            {"category": "option", "keys": ["livePlus", "hbbTvDnt"]},
            {"category": "general", "keys": ["livePlus", "screenSaverAd"]},
            {"category": "../eula", "keys": ["homePromotion"]},
            {"category": "option", "keys": ["privateUnreviewedKey"]},
        ])
        self.assertEqual(firmware_map["settings"], {"hbbTvDnt": "option", "screenSaverAd": "general"})
        self.assertEqual(firmware_map["ambiguous"], ["livePlus"])
        self.assertEqual(
            device_snapshot.firmware_settings_map({"not": "the firmware format"}),
            {"available": True, "settings": {}, "ambiguous": []},
        )

    def test_firmware_key_index_filters_live_settings_and_supplies_categories(self):
        fixture = json.loads(FIRMWARE_MAP_FIXTURE.read_text(encoding="utf-8"))
        firmware_map = device_snapshot.firmware_settings_map(fixture["categoryKeysMap"])
        settings = device_snapshot.privacy_settings(
            {"livePlus": "on", "hbbTvDnt": "on"},
            {"voiceLongDistance": "off"},
            firmware_map=firmware_map,
            category_preferences={"option": {"livePlus": "off", "hbbTvDnt": "on"}, "general": {"voiceLongDistance": "on"}},
        )
        self.assertEqual(settings, {"livePlus": "off", "voiceLongDistance": "on"})

    def test_snapshot_reads_an_indexed_preference_category(self):
        requested = []

        def read_category(path):
            requested.append(path)
            return {"livePlus": "off"} if path == "/var/luna/preferences/customPrivacy" else {}

        with patch.object(device_snapshot, "read_json", side_effect=read_category):
            categories = device_snapshot.preference_categories({
                "available": True,
                "settings": {"livePlus": "customPrivacy"},
                "ambiguous": [],
            })
        self.assertEqual(categories["customPrivacy"], {"livePlus": "off"})
        self.assertIn("/var/luna/preferences/customPrivacy", requested)
        self.assertIn("/var/luna/preferences/general", requested)

    def test_reference_settings_use_the_firmware_index_category(self):
        firmware_map = {"available": True, "settings": {"sportsAlarm": "network"}, "ambiguous": []}
        settings = device_snapshot.reference_settings(
            {"sportsAlarm": "off"},
            firmware_map=firmware_map,
            category_preferences={"option": {"sportsAlarm": "on"}, "network": {"sportsAlarm": "off"}},
        )
        self.assertEqual(settings, {"sportsAlarm": "off"})

    def test_reference_settings_only_expose_read_only_research_keys(self):
        self.assertEqual(
            device_snapshot.reference_settings(
                {"webOSPromotionVideo": "off", "promotionStreamer": "on", "unrelated": "on"},
                {"sportsAlarm": "on", "other": "private"},
                {"allowMobileDeviceAccess": False, "unrelated": "private"},
            ),
            {
                "sportsAlarm": "on",
                "webOSPromotionVideo": "off",
                "promotionStreamer": "on",
                "allowMobileDeviceAccess": False,
            },
        )
        self.assertEqual(
            device_snapshot.reference_settings(
                {"webOSPromotionVideo": True, "promotionStreamer": "unknown"},
                {"sportsAlarm": {"value": "on"}},
                {"allowMobileDeviceAccess": "false"},
            ),
            {},
        )

    def test_g5_root_preferences_are_allowlisted_with_their_published_types(self):
        self.assertEqual(
            device_snapshot.reference_settings(
                {
                    "watchedListCollection": "off",
                    "usageCare": False,
                    "dbgLogUpload": True,
                    "faultLogUpload": False,
                    "thirdPartyCookie": "offByUser",
                    "unrelated": "private",
                },
                {"unrelated": "private"},
                {"unrelated": "private"},
            ),
            {
                "watchedListCollection": "off",
                "usageCare": False,
                "dbgLogUpload": True,
                "faultLogUpload": False,
                "thirdPartyCookie": "offByUser",
            },
        )
        self.assertEqual(
            device_snapshot.reference_settings(
                {
                    "watchedListCollection": "unknown",
                    "usageCare": "off",
                    "dbgLogUpload": 1,
                    "faultLogUpload": "false",
                    "thirdPartyCookie": "enabled",
                },
                None,
                None,
            ),
            {},
        )

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
                "aiNudge": "on",
                "aiSettingsNudge": "off",
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
                "aiNudge": "on",
                "aiSettingsNudge": "off",
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

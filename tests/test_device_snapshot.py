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
        self.assertEqual(len(firmware_map["settings"]), 16)
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

    def test_agreements_return_current_titles_and_explicit_selectable_choices(self):
        record = {
            "eulaInfoNetwork": {
                "eulaList": [
                    {"id": "S_VNG", "type": "M", "accepted": False, "title": "Voice Information<br>Renseignements vocaux"},
                    {"id": "S_ADG", "type": "M", "accepted": True, "title": "Viewing Information Agreement"},
                    {"id": "S_DIA", "type": "M", "accepted": False, "title": "Diagnostic Data Agreement"},
                    {"id": "S_ALL", "type": "S", "accepted": True, "title": "Select All"},
                    {"id": "S_LGN", "type": "L", "accepted": False, "title": "Legal Notice"},
                    {"id": "S_TAG", "type": "M", "accepted": "false", "title": "Bad acceptance value"},
                    {"id": "S_MKT", "type": "M", "title": "Missing acceptance"},
                    {"id": "S_BAD/ID", "type": "M", "accepted": True, "title": "Bad ID"},
                ]
            }
        }
        self.assertEqual(
            device_snapshot.agreements(record),
            {
                "eulaInfoNetwork": {
                    "eulaList": [
                        {"id": "S_VNG", "type": "M", "accepted": False, "title": "Voice Information Renseignements vocaux"},
                        {"id": "S_ADG", "type": "M", "accepted": True, "title": "Viewing Information Agreement"},
                        {"id": "S_DIA", "type": "M", "accepted": False, "title": "Diagnostic Data Agreement"},
                        {"id": "S_TAG", "type": "M", "title": "Bad acceptance value"},
                        {"id": "S_MKT", "type": "M", "title": "Missing acceptance"},
                    ]
                }
            },
        )

    def test_snapshot_returns_only_settings_firmware_map_and_agreements(self):
        with patch.object(device_snapshot, "firmware_settings_map", return_value={"available": False, "settings": {}, "ambiguous": []}), \
             patch.object(device_snapshot, "preference_categories", return_value={"option": {}, "general": {}, "network": {}, "other": {}}), \
             patch.object(device_snapshot, "agreements", return_value={"eulaInfoNetwork": {"eulaList": []}}):
            result = device_snapshot.snapshot()
        self.assertEqual(set(result), {"settings", "firmwareSettingsMap", "agreements"})
        self.assertEqual(result["settings"], {})

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

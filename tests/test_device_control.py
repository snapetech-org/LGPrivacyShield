import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "webos-app/scripts/device_control.py"
FIRMWARE_MAP_FIXTURE = Path(__file__).resolve().parent / "fixtures/oled77c6hup-firmware-key-map.json"
SPEC = importlib.util.spec_from_file_location("device_control", MODULE_PATH)
device_control = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(device_control)


class DeviceControlTests(unittest.TestCase):
    def invoke(self, key, value):
        output = io.StringIO()
        with patch.object(sys, "argv", [str(MODULE_PATH), key, value]), contextlib.redirect_stdout(output):
            return device_control.main(), output.getvalue()

    def test_settings_controls_use_the_mapped_category_and_key(self):
        expected_controls = {
            "livePlus": ("option", "livePlus"),
            "turnOnByVoice": ("option", "turnOnByVoice"),
            "voiceLongDistance": ("general", "voiceLongDistance"),
            "lmt": ("general", "lmt"),
            "screenSaverAd": ("general", "screenSaverAd"),
            "homePromotion": ("general", "homePromotion"),
            "livePromotion": ("option", "livePromotion"),
            "contentRecommendation": ("other", "contentRecommendation"),
            "thirdPartyCookie": ("option", "thirdPartyCookie"),
            "bleAdvertisingOnOff": ("network", "bleAdvertisingOnOff"),
            "homeSenseAbsence": ("option", "homeSenseAbsence"),
            "aiNudge": ("general", "aiNudge"),
            "aiSettingsNudge": ("general", "aiSettingsNudge"),
            "hbbTV": ("option", "hbbTV"),
            "hbbTvDnt": ("option", "hbbTvDnt"),
            "hbbTvDeviceId": ("option", "hbbTvDeviceId"),
        }
        self.assertEqual(set(expected_controls), set(device_control.SETTINGS))
        for key, expected in expected_controls.items():
            for requested in ("on", "off"):
                with self.subTest(key=key, requested=requested):
                    with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                        rc, _ = self.invoke(key, requested)
                    self.assertEqual(rc, 0)
                    self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.settingsservice/setSystemSettings")
                    value = {"thirdPartyCookie": {"on": "onByUser", "off": "offByUser"}}.get(key, {}).get(requested, requested)
                    self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": expected[0], "settings": {expected[1]: value}})

    def test_do_not_sell_uses_the_lg_admanager_method(self):
        with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
            rc, _ = self.invoke("doNotSellMyPersonalInformation", "off")
        self.assertEqual(rc, 0)
        self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.service.admanager/updateDNS")
        self.assertEqual(json_payload(run.call_args.args[0][-1]), {"status": "off"})

    def test_firmware_key_index_supplies_the_writer_category(self):
        with tempfile.TemporaryDirectory() as temporary:
            index_path = Path(temporary) / "description.categorykeysmap.json"
            index_path.write_text(json.dumps([{"category": "general", "keys": ["livePlus"]}]), encoding="utf-8")
            with patch.object(device_control, "FIRMWARE_MAP_PATH", str(index_path)):
                with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                    rc, _ = self.invoke("livePlus", "off")
        self.assertEqual(rc, 0)
        self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": "general", "settings": {"livePlus": "off"}})

    def test_c6h_firmware_fixture_routes_present_key_and_blocks_absent_key(self):
        fixture = json.loads(FIRMWARE_MAP_FIXTURE.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as temporary:
            index_path = Path(temporary) / "description.categorykeysmap.json"
            index_path.write_text(json.dumps(fixture["categoryKeysMap"]), encoding="utf-8")
            with patch.object(device_control, "FIRMWARE_MAP_PATH", str(index_path)):
                with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                    rc, _ = self.invoke("livePlus", "off")
                self.assertEqual(rc, 0)
                self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": "option", "settings": {"livePlus": "off"}})
                with patch.object(device_control.subprocess, "run") as absent_run:
                    with self.assertRaisesRegex(SystemExit, "not present"):
                        self.invoke("hbbTvDnt", "off")
                    absent_run.assert_not_called()

    def test_unrecognized_firmware_index_format_fails_closed(self):
        with tempfile.TemporaryDirectory() as temporary:
            index_path = Path(temporary) / "description.categorykeysmap.json"
            index_path.write_text('{"unexpected":"schema"}', encoding="utf-8")
            with patch.object(device_control, "FIRMWARE_MAP_PATH", str(index_path)):
                with patch.object(device_control.subprocess, "run") as run:
                    with self.assertRaisesRegex(SystemExit, "format is not recognized"):
                        self.invoke("livePlus", "off")
            run.assert_not_called()

    def test_writer_refuses_keys_absent_or_ambiguous_in_firmware_index(self):
        with tempfile.TemporaryDirectory() as temporary:
            index_path = Path(temporary) / "description.categorykeysmap.json"
            for document, message in (
                ([{"category": "option", "keys": ["screenSaverAd"]}], "not present"),
                ([{"category": "option", "keys": ["livePlus"]}, {"category": "general", "keys": ["livePlus"]}], "ambiguous"),
            ):
                with self.subTest(message=message):
                    index_path.write_text(json.dumps(document), encoding="utf-8")
                    with patch.object(device_control, "FIRMWARE_MAP_PATH", str(index_path)):
                        with patch.object(device_control.subprocess, "run") as run:
                            with self.assertRaisesRegex(SystemExit, message):
                                self.invoke("livePlus", "off")
                    run.assert_not_called()

    def test_hbbtv_cookie_control_uses_lg_user_choice_values(self):
        for requested, expected in (("on", "onByUser"), ("off", "offByUser")):
            with self.subTest(requested=requested):
                with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                    rc, _ = self.invoke("thirdPartyCookie", requested)
                self.assertEqual(rc, 0)
                self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.settingsservice/setSystemSettings")
                self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": "option", "settings": {"thirdPartyCookie": expected}})

    def test_uses_legacy_settings_service_only_when_the_current_service_is_missing(self):
        missing = type("Result", (), {"returncode": 0, "stdout": '{"returnValue":false,"errorText":"Unknown service"}', "stderr": ""})()
        success = type("Result", (), {"returncode": 0, "stdout": '{"returnValue":true}', "stderr": ""})()
        with patch.object(device_control.subprocess, "run", side_effect=[missing, success]) as run:
            rc, _ = self.invoke("livePlus", "off")
        self.assertEqual(rc, 0)
        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args_list[0].args[0][-2], "luna://com.webos.settingsservice/setSystemSettings")
        self.assertEqual(run.call_args_list[1].args[0][-2], "luna://com.webos.service.settings/setSystemSettings")

    def test_does_not_retry_the_legacy_service_for_permission_denials(self):
        denied = type("Result", (), {"returncode": 0, "stdout": '{"returnValue":false,"errorText":"Permission denied"}', "stderr": ""})()
        with patch.object(device_control.subprocess, "run", return_value=denied) as run:
            rc, _ = self.invoke("livePlus", "off")
        self.assertEqual(rc, 0)
        run.assert_called_once()

    def test_unknown_setting_and_invalid_value_fail_before_calling_luna(self):
        with patch.object(device_control.subprocess, "run") as run:
            with self.assertRaises(SystemExit):
                self.invoke("unreviewedSetting", "on")
            with self.assertRaises(SystemExit):
                self.invoke("lmt", "maybe")
        run.assert_not_called()


def json_payload(value):
    import json
    return json.loads(value)


if __name__ == "__main__":
    unittest.main()

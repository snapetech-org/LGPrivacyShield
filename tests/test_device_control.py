import contextlib
import importlib.util
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "webos-app/scripts/device_control.py"
SPEC = importlib.util.spec_from_file_location("device_control", MODULE_PATH)
device_control = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(device_control)


class DeviceControlTests(unittest.TestCase):
    def invoke(self, key, value):
        output = io.StringIO()
        with patch.object(sys, "argv", [str(MODULE_PATH), key, value]), contextlib.redirect_stdout(output):
            return device_control.main(), output.getvalue()

    def test_settings_controls_use_the_mapped_category_and_key(self):
        for key, expected in {
            "lmt": ("general", "lmt"),
            "screenSaverAd": ("general", "screenSaverAd"),
            "homePromotion": ("general", "homePromotion"),
            "livePromotion": ("option", "livePromotion"),
            "contentRecommendation": ("other", "contentRecommendation"),
            "bleAdvertisingOnOff": ("network", "bleAdvertisingOnOff"),
            "homeSenseAbsence": ("option", "homeSenseAbsence"),
            "hbbTV": ("option", "hbbTV"),
            "hbbTvDnt": ("option", "hbbTvDnt"),
            "hbbTvDeviceId": ("option", "hbbTvDeviceId"),
        }.items():
            with self.subTest(key=key):
                with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                    rc, _ = self.invoke(key, "on")
                self.assertEqual(rc, 0)
                self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.settingsservice/setSystemSettings")
                self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": expected[0], "settings": {expected[1]: "on"}})

    def test_do_not_sell_uses_the_lg_admanager_method(self):
        with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
            rc, _ = self.invoke("doNotSellMyPersonalInformation", "off")
        self.assertEqual(rc, 0)
        self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.service.admanager/updateDNS")
        self.assertEqual(json_payload(run.call_args.args[0][-1]), {"status": "off"})

    def test_hbbtv_cookie_control_uses_lg_user_choice_values(self):
        for requested, expected in (("on", "onByUser"), ("off", "offByUser")):
            with self.subTest(requested=requested):
                with patch.object(device_control.subprocess, "run", return_value=type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()) as run:
                    rc, _ = self.invoke("thirdPartyCookie", requested)
                self.assertEqual(rc, 0)
                self.assertEqual(run.call_args.args[0][-2], "luna://com.webos.settingsservice/setSystemSettings")
                self.assertEqual(json_payload(run.call_args.args[0][-1]), {"category": "option", "settings": {"thirdPartyCookie": expected}})

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

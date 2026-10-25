#!/usr/bin/env python3
"""Apply only the small, reviewed set of SettingsService controls."""
import json
import subprocess
import sys


SETTINGS = {
    "livePlus": ("option", "livePlus"),
    "turnOnByVoice": ("option", "turnOnByVoice"),
    "voiceLongDistance": ("general", "voiceLongDistance"),
    "lmt": ("general", "lmt"),
    "screenSaverAd": ("general", "screenSaverAd"),
    "homePromotion": ("general", "homePromotion"),
    "livePromotion": ("option", "livePromotion"),
    "contentRecommendation": ("other", "contentRecommendation"),
    "thirdPartyCookie": ("option", "thirdPartyCookie"),
    "hbbTV": ("option", "hbbTV"),
    "hbbTvDnt": ("option", "hbbTvDnt"),
    "hbbTvDeviceId": ("option", "hbbTvDeviceId"),
    "bleAdvertisingOnOff": ("network", "bleAdvertisingOnOff"),
    "homeSenseAbsence": ("option", "homeSenseAbsence"),
}
DO_NOT_SELL = "doNotSellMyPersonalInformation"


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: device_control.py <known-setting> <on|off>")
    key, value = sys.argv[1:]
    if (key not in SETTINGS and key != DO_NOT_SELL) or value not in {"on", "off"}:
        raise SystemExit("Unsupported setting or value")
    if key == DO_NOT_SELL:
        service_method = "luna://com.webos.service.admanager/updateDNS"
        payload = json.dumps({"status": value}, separators=(",", ":"))
    else:
        category, setting = SETTINGS[key]
        setting_value = {
            "thirdPartyCookie": {"on": "onByUser", "off": "offByUser"}
        }.get(key, {}).get(value, value)
        service_method = "luna://com.webos.settingsservice/setSystemSettings"
        payload = json.dumps({"category": category, "settings": {setting: setting_value}}, separators=(",", ":"))
    request = [
        "luna-send", "-i", "-f", "-n", "1",
        service_method, payload
    ]
    result = subprocess.run(request, capture_output=True, text=True, timeout=8)
    print(json.dumps({"returnCode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}))
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

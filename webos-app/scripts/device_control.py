#!/usr/bin/env python3
"""Apply only the small, reviewed set of SettingsService controls."""
import json
import re
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
    "aiNudge": ("general", "aiNudge"),
    "aiSettingsNudge": ("general", "aiSettingsNudge"),
}
DO_NOT_SELL = "doNotSellMyPersonalInformation"
FIRMWARE_MAP_PATH = "/etc/palm/description.categorykeysmap.json"
SETTINGS_SERVICES = (
    "luna://com.webos.settingsservice/setSystemSettings",
    "luna://com.webos.service.settings/setSystemSettings",
)
CATEGORY_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")


def firmware_category(key):
    fallback = "general" if key == DO_NOT_SELL else SETTINGS[key][0]
    try:
        with open(FIRMWARE_MAP_PATH, "r", encoding="utf-8") as source:
            document = json.load(source)
    except (OSError, ValueError):
        return fallback
    if not isinstance(document, list):
        raise SystemExit("The TV firmware settings map format is not recognized")
    categories = set()
    for entry in document:
        if not isinstance(entry, dict) or not isinstance(entry.get("keys"), list):
            continue
        category = entry.get("category")
        if not isinstance(category, str) or not CATEGORY_NAME.fullmatch(category):
            continue
        if key in entry["keys"]:
            categories.add(category)
    if not categories:
        raise SystemExit("This setting is not present in the TV firmware settings map")
    if len(categories) != 1:
        raise SystemExit("This setting has an ambiguous firmware category")
    return categories.pop()


def is_missing_service(result):
    text = "\n".join((getattr(result, "stdout", ""), getattr(result, "stderr", "")))
    for line in text.splitlines():
        try:
            response = json.loads(line)
        except (TypeError, ValueError):
            continue
        if isinstance(response, dict) and response.get("returnValue") is False:
            text += "\n" + str(response.get("errorText", ""))
    return bool(re.search(
        r"(?:unknown|missing|unavailable) service|service.{0,32}(?:not found|does not exist)|method.{0,32}(?:not found|does not exist)",
        text,
        re.IGNORECASE,
    ))


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: device_control.py <known-setting> <on|off>")
    key, value = sys.argv[1:]
    if (key not in SETTINGS and key != DO_NOT_SELL) or value not in {"on", "off"}:
        raise SystemExit("Unsupported setting or value")
    if key == DO_NOT_SELL:
        firmware_category(key)
        service_method = "luna://com.webos.service.admanager/updateDNS"
        payload = json.dumps({"status": value}, separators=(",", ":"))
        service_methods = (service_method,)
    else:
        category, setting = SETTINGS[key]
        category = firmware_category(key)
        setting_value = {
            "thirdPartyCookie": {"on": "onByUser", "off": "offByUser"}
        }.get(key, {}).get(value, value)
        payload = json.dumps({"category": category, "settings": {setting: setting_value}}, separators=(",", ":"))
        service_methods = SETTINGS_SERVICES

    result = None
    for index, service_method in enumerate(service_methods):
        request = [
            "luna-send", "-i", "-f", "-n", "1",
            service_method, payload
        ]
        result = subprocess.run(request, capture_output=True, text=True, timeout=8)
        if index == 0 and len(service_methods) > 1 and is_missing_service(result):
            continue
        break
    assert result is not None
    print(json.dumps({"returnCode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}))
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

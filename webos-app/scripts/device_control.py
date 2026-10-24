#!/usr/bin/env python3
"""Apply only the small, reviewed set of SettingsService controls."""
import json
import subprocess
import sys


SETTINGS = {
    "livePlus": ("option", "livePlus"),
    "turnOnByVoice": ("option", "turnOnByVoice"),
    "voiceLongDistance": ("general", "voiceLongDistance"),
}


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: device_control.py <known-setting> <on|off>")
    key, value = sys.argv[1:]
    if key not in SETTINGS or value not in {"on", "off"}:
        raise SystemExit("Unsupported setting or value")
    category, setting = SETTINGS[key]
    payload = json.dumps({"category": category, "settings": {setting: value}}, separators=(",", ":"))
    request = [
        "luna-send", "-i", "-f", "-n", "1",
        f"luna://com.webos.settingsservice/setSystemSettings", payload
    ]
    result = subprocess.run(request, capture_output=True, text=True, timeout=8)
    print(json.dumps({"returnCode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}))
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

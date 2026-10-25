#!/usr/bin/env python3
"""Read a minimal local-only snapshot for PrivacyShield's Evidence view."""
import glob
import json
import os
import re
import subprocess


FIRMWARE_MAP_PATH = "/etc/palm/description.categorykeysmap.json"
CONTROL_CATEGORIES = {
    "livePlus": "option",
    "turnOnByVoice": "option",
    "voiceLongDistance": "general",
    "lmt": "general",
    "doNotSellMyPersonalInformation": "general",
    "screenSaverAd": "general",
    "homePromotion": "general",
    "livePromotion": "option",
    "contentRecommendation": "other",
    "hbbTvDnt": "option",
    "hbbTvDeviceId": "option",
    "thirdPartyCookie": "option",
    "hbbTV": "option",
    "bleAdvertisingOnOff": "network",
    "homeSenseAbsence": "option",
    "aiNudge": "general",
    "aiSettingsNudge": "general",
}
REFERENCE_CATEGORIES = {
    "sportsAlarm": "general",
    "webOSPromotionVideo": "option",
    "promotionStreamer": "option",
    "allowMobileDeviceAccess": "network",
    "watchedListCollection": "option",
    "thirdPartyCookie": "option",
    "usageCare": "option",
    "dbgLogUpload": "option",
    "faultLogUpload": "option",
}
FIRMWARE_MAP_KEYS = set(CONTROL_CATEGORIES) | set(REFERENCE_CATEGORIES)
CATEGORY_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as source:
            return json.load(source)
    except (OSError, ValueError):
        return None


def firmware_settings_map(document=None):
    """Return only reviewed key/category pairs from this firmware's map."""
    if document is None:
        document = read_json(FIRMWARE_MAP_PATH)
    if document is None:
        return None
    if not isinstance(document, list):
        # The path exists and JSON was parsed, but its format is not understood.
        # Treat it as an empty, available index so callers fail closed.
        return {"available": True, "settings": {}, "ambiguous": []}
    categories = {}
    ambiguous = set()
    for entry in document:
        if not isinstance(entry, dict):
            continue
        category = entry.get("category")
        keys = entry.get("keys")
        if not isinstance(category, str) or not CATEGORY_NAME.fullmatch(category) or not isinstance(keys, list):
            continue
        for key in keys:
            if not isinstance(key, str) or key not in FIRMWARE_MAP_KEYS:
                continue
            if key in categories and categories[key] != category:
                ambiguous.add(key)
            else:
                categories[key] = category
    for key in ambiguous:
        categories.pop(key, None)
    return {"available": True, "settings": categories, "ambiguous": sorted(ambiguous)}


def category_for(key, fallback, firmware_map=None):
    if not isinstance(firmware_map, dict) or firmware_map.get("available") is not True:
        return fallback
    if key in firmware_map.get("ambiguous", []):
        return None
    return firmware_map.get("settings", {}).get(key)


def preference_categories(firmware_map=None):
    categories = {"general", "option", "network", "other"}
    if isinstance(firmware_map, dict) and firmware_map.get("available") is True:
        categories.update(
            category for category in firmware_map.get("settings", {}).values()
            if isinstance(category, str) and CATEGORY_NAME.fullmatch(category)
        )
    return {
        category: read_json(f"/var/luna/preferences/{category}") or {}
        for category in categories
    }


def process_names():
    wanted = {"voiceinput", "voiceinput_sound", "voiceinput_preprocessor", "voiceconductor"}
    found = set()
    for path in glob.glob("/proc/[0-9]*/comm"):
        try:
            name = open(path, "r", encoding="utf-8").read().strip()
        except OSError:
            continue
        if name in wanted:
            found.add(name)
    return sorted(found)


def installed_apps():
    apps = []
    for path in glob.glob("/media/developer/apps/usr/palm/applications/*/appinfo.json"):
        data = read_json(path)
        if not isinstance(data, dict):
            continue
        apps.append({
            "id": str(data.get("id", os.path.basename(os.path.dirname(path)))),
            "title": str(data.get("title", "")),
            "version": str(data.get("version", ""))
        })
    return sorted(apps, key=lambda item: (item["title"].lower(), item["id"]))


def diagnostics(option=None, firmware_map=None, category_preferences=None):
    if option is None:
        option = read_json("/var/luna/preferences/option")
    if not isinstance(option, dict):
        option = {}
    if not isinstance(category_preferences, dict):
        category_preferences = {"option": option}
    services = []
    try:
        result = subprocess.run(["pidof", "rdxd", "uploadd"], capture_output=True, text=True, timeout=2)
        pids = set(result.stdout.split())
        if pids:
            # Map PIDs to names without exposing process arguments.
            for pid in pids:
                try:
                    name = open(f"/proc/{pid}/comm", "r", encoding="utf-8").read().strip()
                    if name in {"rdxd", "uploadd"}:
                        services.append(name)
                except OSError:
                    pass
    except (OSError, subprocess.TimeoutExpired):
        pass
    auto_upload = None
    try:
        with open("/etc/rdxd.conf", "r", encoding="utf-8", errors="replace") as source:
            for line in source:
                key, sep, value = line.partition("=")
                if sep and key.strip().lower() == "autoupload":
                    auto_upload = value.strip().lower() == "true"
                    break
    except OSError:
        pass
    debug_category = category_for("dbgLogUpload", "option", firmware_map)
    fault_category = category_for("faultLogUpload", "option", firmware_map)
    debug_value = category_preferences.get(debug_category, {}).get("dbgLogUpload") if debug_category else None
    fault_value = category_preferences.get(fault_category, {}).get("faultLogUpload") if fault_category else None
    return {
        "services": sorted(set(services)),
        "autoUpload": auto_upload,
        "faultLogUpload": fault_value if isinstance(fault_value, bool) else None,
        "debugLogUpload": debug_value if isinstance(debug_value, bool) else None,
    }


def privacy_settings(option=None, general=None, network=None, other=None, firmware_map=None, category_preferences=None):
    """Read only explicit, reviewed privacy controls from local preferences."""
    if option is None:
        option = read_json("/var/luna/preferences/option")
    if general is None:
        general = read_json("/var/luna/preferences/general")
    if not isinstance(option, dict):
        option = {}
    if not isinstance(general, dict):
        general = {}
    if not isinstance(network, dict):
        network = {}
    if not isinstance(other, dict):
        other = {}
    if not isinstance(category_preferences, dict):
        category_preferences = {"option": option, "general": general, "network": network, "other": other}
    values = {}
    for key, fallback_category in CONTROL_CATEGORIES.items():
        category = category_for(key, fallback_category, firmware_map)
        if category:
            values[key] = category_preferences.get(category, {}).get(key)
    accepted = {"on", "off", "onByUser", "offByUser"}
    return {
        key: value
        for key, value in values.items()
        if isinstance(value, str) and value in accepted
    }


def reference_settings(option=None, general=None, network=None, firmware_map=None, category_preferences=None):
    """Read named research keys for display only; PrivacyShield never writes them."""
    if option is None:
        option = read_json("/var/luna/preferences/option")
    if general is None:
        general = read_json("/var/luna/preferences/general")
    if network is None:
        network = read_json("/var/luna/preferences/network")
    if not isinstance(option, dict):
        option = {}
    if not isinstance(general, dict):
        general = {}
    if not isinstance(network, dict):
        network = {}
    if not isinstance(category_preferences, dict):
        category_preferences = {"option": option, "general": general, "network": network}
    values = {}
    for key, fallback_category in REFERENCE_CATEGORIES.items():
        category = category_for(key, fallback_category, firmware_map)
        if category:
            values[key] = category_preferences.get(category, {}).get(key)
    boolean_keys = {"allowMobileDeviceAccess", "usageCare", "dbgLogUpload", "faultLogUpload"}
    string_values = {
        "watchedListCollection": {"on", "off"},
        "thirdPartyCookie": {"on", "off", "onByUser", "offByUser"},
    }
    return {
        key: value
        for key, value in values.items()
        if (key in boolean_keys and isinstance(value, bool))
        or (key in string_values and isinstance(value, str) and value in string_values[key])
        or (key not in boolean_keys and key not in string_values and isinstance(value, str) and value in {"on", "off"})
    }


def agreements(record=None):
    """Return only agreement IDs and explicit accepted booleans."""
    if record is None:
        record = read_json("/var/luna/preferences/eula")
    if not isinstance(record, dict):
        record = {}
    info = record.get("eulaInfoNetwork")
    source = info.get("eulaList", []) if isinstance(info, dict) else []
    if not isinstance(source, list):
        source = []
    allowlist = {"S_ADG", "S_VNG", "S_TAG", "S_MKT", "S_DPA", "S_PRG", "S_SVC"}
    entries = [
        {"id": item["id"], "accepted": item["accepted"]}
        for item in source
        if isinstance(item, dict)
        and item.get("id") in allowlist
        and isinstance(item.get("accepted"), bool)
    ]
    return {"eulaInfoNetwork": {"eulaList": entries}}


def snapshot():
    firmware_map = firmware_settings_map()
    categories = preference_categories(firmware_map)
    option = categories.get("option")
    general = categories.get("general")
    network = categories.get("network")
    other = categories.get("other")
    return {
        "apps": installed_apps(),
        "voiceProcesses": process_names(),
        "diagnostics": diagnostics(option, firmware_map, categories),
        "settings": privacy_settings(option, general, network, other, firmware_map, categories),
        "referenceSettings": reference_settings(option, general, network, firmware_map, categories),
        "firmwareSettingsMap": firmware_map,
        "agreements": agreements(),
    }


def main():
    print(json.dumps(snapshot(), separators=(",", ":")))


if __name__ == "__main__":
    main()

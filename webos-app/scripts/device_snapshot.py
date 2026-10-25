#!/usr/bin/env python3
"""Read privacy settings and agreement state for the local webOS app."""
import html
import json
import re


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
FIRMWARE_MAP_KEYS = set(CONTROL_CATEGORIES)
CATEGORY_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")
AGREEMENT_ID = re.compile(r"^S_[A-Z0-9]{1,8}$")


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


def agreements(record=None):
    """Return current selectable agreement labels and explicit saved states."""
    if record is None:
        record = read_json("/var/luna/preferences/eula")
    if not isinstance(record, dict):
        record = {}
    info = record.get("eulaInfoNetwork")
    source = info.get("eulaList", []) if isinstance(info, dict) else []
    if not isinstance(source, list):
        source = []
    known_ids = {"S_ADG", "S_VNG", "S_TAG", "S_MKT", "S_DPA", "S_PRG", "S_SVC"}
    entries = []
    for item in source:
        if not isinstance(item, dict):
            continue
        agreement_id = item.get("id")
        if not isinstance(agreement_id, str) or not AGREEMENT_ID.fullmatch(agreement_id):
            continue
        if item.get("type") != "M" and agreement_id not in known_ids:
            continue
        entry = {"id": agreement_id}
        if item.get("type") == "M":
            entry["type"] = "M"
        accepted = item.get("accepted")
        if isinstance(accepted, bool):
            entry["accepted"] = accepted
        title = item.get("title")
        if isinstance(title, str):
            # The firmware record may include bilingual HTML. Keep plain text
            # only; the app inserts it with textContent, never as markup.
            clean_title = re.sub(r"<[^>]*>", " ", title)
            clean_title = " ".join(html.unescape(clean_title).split())[:160]
            if clean_title:
                entry["title"] = clean_title
        entries.append(entry)
        if len(entries) >= 24:
            break
    return {"eulaInfoNetwork": {"eulaList": entries}}


def snapshot():
    firmware_map = firmware_settings_map()
    categories = preference_categories(firmware_map)
    option = categories.get("option")
    general = categories.get("general")
    network = categories.get("network")
    other = categories.get("other")
    return {
        "settings": privacy_settings(option, general, network, other, firmware_map, categories),
        "firmwareSettingsMap": firmware_map,
        "agreements": agreements(),
    }


def main():
    print(json.dumps(snapshot(), separators=(",", ":")))


if __name__ == "__main__":
    main()

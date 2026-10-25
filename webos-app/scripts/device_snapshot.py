#!/usr/bin/env python3
"""Read a minimal local-only snapshot for PrivacyShield's Evidence view."""
import glob
import json
import os
import subprocess


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as source:
            return json.load(source)
    except (OSError, ValueError):
        return None


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


def diagnostics(option=None):
    if option is None:
        option = read_json("/var/luna/preferences/option")
    if not isinstance(option, dict):
        option = {}
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
    return {
        "services": sorted(set(services)),
        "autoUpload": auto_upload,
        "faultLogUpload": option.get("faultLogUpload") if isinstance(option.get("faultLogUpload"), bool) else None,
        "debugLogUpload": option.get("dbgLogUpload") if isinstance(option.get("dbgLogUpload"), bool) else None,
    }


def privacy_settings(option=None, general=None, network=None, other=None):
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
    values = {
        "livePlus": option.get("livePlus"),
        "turnOnByVoice": option.get("turnOnByVoice"),
        "voiceLongDistance": general.get("voiceLongDistance"),
        "hbbTV": option.get("hbbTV"),
        "hbbTvDnt": option.get("hbbTvDnt"),
        "hbbTvDeviceId": option.get("hbbTvDeviceId"),
        "lmt": general.get("lmt"),
        "doNotSellMyPersonalInformation": general.get("doNotSellMyPersonalInformation"),
        "screenSaverAd": general.get("screenSaverAd"),
        "homePromotion": general.get("homePromotion"),
        "livePromotion": option.get("livePromotion"),
        "contentRecommendation": other.get("contentRecommendation"),
        "thirdPartyCookie": option.get("thirdPartyCookie"),
        "bleAdvertisingOnOff": network.get("bleAdvertisingOnOff"),
        "homeSenseAbsence": option.get("homeSenseAbsence"),
    }
    accepted = {"on", "off", "onByUser", "offByUser"}
    return {
        key: value
        for key, value in values.items()
        if isinstance(value, str) and value in accepted
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
    option = read_json("/var/luna/preferences/option")
    general = read_json("/var/luna/preferences/general")
    network = read_json("/var/luna/preferences/network")
    other = read_json("/var/luna/preferences/other")
    return {
        "apps": installed_apps(),
        "voiceProcesses": process_names(),
        "diagnostics": diagnostics(option),
        "settings": privacy_settings(option, general, network, other),
        "agreements": agreements(),
    }


def main():
    print(json.dumps(snapshot(), separators=(",", ":")))


if __name__ == "__main__":
    main()

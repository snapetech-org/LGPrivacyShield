# LG webOS privacy research

## Voice and viewing features

LG's Voice Information agreement is required for voice recognition. LG's
current explanation says speech recognition starts only after the user
activates it by pressing the remote microphone button or enabling hands-free
voice. LG also says the Viewing Information agreement may be needed for some
commands that depend on the current content source. Those two agreements can
restore voice-related features, while the feature switches remain separate.

Static inspection of the Settings application installed on the test TV
confirms that `option.livePlus` is the Live Plus switch and that its help text
describes recognition through the ACR module. LG's current statement says ACR
uses audio fingerprinting on the TV's internal audio processor, not screenshots,
screen recordings, video recordings, voice recordings, or other audio
recordings. PrivacyShield therefore treats Live Plus as the ACR/viewing-
recognition control. Leave it off when the goal is to keep ACR disabled, even
if the Viewing Information agreement is accepted for voice compatibility.
Some context-aware voice commands may still be limited while ACR is off.

LG says the Voice Information, Viewing Information, and interest-based
advertising agreements are optional and are not required for basic smart
services. Voice recognition needs the Voice Information agreement; some
source-aware voice commands may need Viewing Information. Accept only the
agreements needed for the desired features. The Privacy Policy and Terms of
Use are required for smart services such as Netflix and YouTube.

`docs/LG-AGREEMENT-EFFECTS.md` records the seven ID/title pairs observed in the
exact C6 agreement response and maps their supported effects to LG's current
privacy statement and User Agreements help. The Canadian-market Data Partners
Agreement is documented for ad measurement and analytics with third-party
partners, but its exact C6 feature gates are not published. The Marketing
Communications Agreement's channels and TV effects are also not specified in
LG's public summary. Additional selectable agreements are shown in the app
with an unmapped-effect notice instead of guessed behavior.

PrivacyShield's control catalog has 17 settings traced to LG's Settings UI:
Live Plus / ACR, two voice controls, Limit Ad Tracking, Do Not Sell, Screen
Saver Promotion, Home menu ads, Live Promotion, Home content recommendations,
four HbbTV controls, Bluetooth wake, Sleep on Absence, and two Smart Tips
controls. The two Smart Tips keys are mapped on C2/webOS 22 and webOS 24. C2/webOS 22
also uses the dashboard's root-side `general.lmt` write/readback evidence; its
OLED42C24LA test row is not directly linked to that code test. The exact
OLED55B56LA / SDK 10.3.1 B5 map adds `aiNudge` and three HbbTV controls. The
exact `OLED65G5WUA` / webOS 10.2.1 report supplies keys for `aiNudge`,
`screenSaverAd`, and `homePromotion`; five other option preferences remain
source research because the report does not test the app-side setter.
The numerical G5 firmware is not published. The exact C6H profile has 15
reviewed candidates, filtered by a read-only capture of that TV's firmware key
index: 14 are listed and `hbbTvDnt` is absent. Other model profiles use
narrower published platform/cohort maps, then check the installed firmware's
key index and current value before enabling each control.
The app exposes mapped controls after the TV returns a readable current value.
Research keys without an app-side SettingsService path remain in the
repository and are excluded from the TV package. Full handler and effect
notes, permission boundaries, one-time ID actions, and unmapped candidates are
in [TV-PRIVACY-CAPABILITY-MAP.md](TV-PRIVACY-CAPABILITY-MAP.md) and
[DEVICE-COMPATIBILITY.md](DEVICE-COMPATIBILITY.md).

The per-firmware category/key index is stored on rooted sets at
`/etc/palm/description.categorykeysmap.json`. PrivacyShield filters this local
index to reviewed candidates and uses its category for reads and writes. This
lets the app discover the installed firmware's registered keys on first use
without shipping a speculative per-size map. A missing key remains
unavailable. Key presence does not establish its privacy effect or prove a
write; current values and changes still require live readback.

For offline research, LG publishes model support downloads with firmware ZIPs
and applicable-model guides. The EPK Firmware Archive's `processed_fw.json`
adds checksummed ZIP/EPK identities and model/OTA relationships; the repository
now pins 405 package builds for 525 exact B/C/G OLED model codes. The catalog
does not include rootfs contents or SettingsService maps. The community
`epk2extract` tool supports LG EPK and filesystem extraction, but encrypted
EPK v2/v3 packages need AES/RSA material from a running TV. Newer webOS
packages can nest rootfs in `super.pak`. A 2026-10-25 range probe read the ZIP
directory but found a single 1.81 GB DEFLATE-compressed EPK member with no
published seek index; earlier full-download attempts ran at about 20–50 kB/s.
The repeatable importer, `scripts/import_firmware_keymap.py`, now verifies the
actual EPK SHA-256 against the catalog and marks extraction as not independently
reproduced. No additional B/C/G registry has been extracted; the C6H capture
remains the only device-specific firmware-index fixture.

The 0.4.0 IPK built for this revision was installed and launched on an
`OLED77C6HUP` running webOS 26 / firmware 43.21.79. This confirms install and
startup on that TV; setting behavior still depends on its live firmware index
and readback. See [DEVICE-COMPATIBILITY.md](DEVICE-COMPATIBILITY.md) for the
process and limits.

The Settings bundle handles Do Not Sell through
`com.webos.service.admanager/updateDNS` with a `status` value. PrivacyShield
uses that same method rather than writing the cached preference directly.
Other confirmed switches use their SettingsService category and key. Each
change is read back before the app reports success. On the exact C6H profile,
the preset applies at most nine reviewed values because this firmware's local
index omits HbbTV Do Not Track. It leaves Do Not Sell, the HbbTV master
switch, HbbTV cookies, Bluetooth wake, and Sleep on Absence for separate user
action. Family/platform profiles apply only the subset in their published map.

Turning off hands-free recognition and voice wake does not electrically
disconnect a microphone. Deliberate Magic Remote push-to-talk is a separate
path. A process list or agreement record cannot prove whether audio was
captured or transmitted.

## Hardware microphone switch

The official owner manual for OLED77C6HUP is shared across multiple model
variants. It depicts two bottom-control layouts: Type A has a microphone
switch; Type B does not. The manual does not identify which layout is fitted
to the installed unit. Check the switch on the TV itself. The software
controls disable voice features; they do not replace a hardware disconnect.

## webOS 26 and Homebrew access

PrivacyShield queries SettingsService and falls back to a root snapshot that
returns reviewed setting values, the TV's filtered firmware key map, and saved
agreement choices. It does not inspect running processes, installed apps, or
diagnostic-upload preferences. On webOS 26, the application declares
`lunabus.query`, and the installed HBC service also needs an API-permission
mapping for that group. Before repair, HBC 0.7.3 on the test TV lacked it, and
the service returned `Denied method call "exec" for category "/"`. The map and
manifest path were present after repair, but the already-running HBC process
still advertised its old access groups. `ls-control scan-services` did not
refresh that dynamic registration; restarting HBC and making a new request did.

Live validation showed `lunabus.query` in the active `exec` method's
`provides` list. From the running PrivacyShield app context, `exec id` returned
root identity and the v0.1.4 snapshot returned the original three toggle
values and seven agreement flags. The v0.1.4 allowlisted writer completed
idempotent `off` write/readback for those three controls. A later v0.1.5 app
session toggled Live Plus off and on; its other added settings were not
individually tested live. The v0.1.6 package was not installed or run on the
TV; its expanded settings were read over SSH only. No settings or
agreement choices were changed during this map work. Direct SettingsService
option/general/agreement requests remain denied on this firmware, so the app
uses the HBC snapshot fallback. System-information reads succeeded directly.
That historical session also confirmed a network-status API call, which the
current app no longer requests.

The upstream HBC change for webOS 26 adds a `lunabus.query` mapping to the
elevated service by adding
`/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.lunabus.query.json`
with `{"lunabus.query":["org.webosbrew.hbchannel.service/*"]}` and registering
that path in the HBC app manifest's `apiPermissionFiles`. The upstream code
handles both development and non-development Luna service trees. The
maintainer helper in `scripts/repair_hbc_permission_map.py` applies this exact
mapping with backup, manifest validation, atomic writes, a service scan, live
`ls-monitor` verification, and guarded rollback. It is not shipped in the IPK;
public app users need an HBC build with the upstream fix or must apply the
repair themselves on a rooted TV. See [BRIDGE-FIX.md](BRIDGE-FIX.md) for the
full permission map and scope.

## Remote navigation

The UI supports the LG remote's five-way mode. It maps the documented arrow
key codes to visible focus movement, OK to activation, and Back to Overview;
the second Back delegates to webOS's standard exit prompt. The app sets
`disableBackHistoryAPI` so the webOS Back key code can be handled explicitly.
LG requires TV apps to support five-way navigation and documents Left/Up/Right/
Down as 37/38/39/40, OK as 13, and Back as 461.

## Sources

- [LG OLED77C6HUP product support and manuals](https://www.lg.com/us/support/product/lg-OLED77C6HUP.AUS)
- [LG OLED77C6HUP owner manual](https://gscs-b2c.lge.com/open/downloadFile?fileId=wfynXPbF61Qz9tGNP8mg) — page 7 shows the two bottom-control layouts
- [LG explanation of voice recognition and ACR](https://www.lgcorp.com/media/release/30566)
- [LG Privacy Statement for Smart TVs](https://www.lg.com/us/newsroom/corporate/statement-understanding-privacy-on-lg-smart-tvs)
- [webOS TV Settings Service reference](https://webostv.developer.lge.com/develop/references/settings-service)
- [webOS TV ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)
- [LG Magic Remote input and key codes](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [LG webOS Back Button handling](https://webostv.developer.lge.com/develop/guides/back-button)
- [HBC `lunabus.query` permission change](https://github.com/webosbrew/webos-homebrew-channel/commit/50fa99e)
- [HBC app listing and current catalog version](https://repo.webosbrew.org/apps/org.webosbrew.hbchannel/)

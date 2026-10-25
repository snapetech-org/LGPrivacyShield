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

PrivacyShield exposes 15 settings traced to LG's Settings UI: Live Plus / ACR,
two voice controls, Limit Ad Tracking, Do Not Sell, Screen Saver Promotion,
Home menu ads, Live Promotion, Home content recommendations, four HbbTV
controls, Bluetooth wake, and Sleep on Absence. The full handlers, effects,
permission boundary, one-time ID actions, and unmapped candidates are in
[TV-PRIVACY-CAPABILITY-MAP.md](TV-PRIVACY-CAPABILITY-MAP.md).

The Settings bundle handles Do Not Sell through
`com.webos.service.admanager/updateDNS` with a `status` value. PrivacyShield
uses that same method rather than writing the cached preference directly.
Other confirmed switches use their SettingsService category and key. Each
change is read back before the app reports success. The ten-setting preset
leaves Do Not Sell, the HbbTV master switch, HbbTV cookies, Bluetooth wake, and
Sleep on Absence for separate user action.

Turning off hands-free recognition and voice wake does not electrically
disconnect a microphone. Deliberate Magic Remote push-to-talk is a separate
path. A process list or agreement record cannot prove whether audio was
captured or transmitted.

## Hardware microphone switch

The official owner manual for OLED77C6HUP is shared across multiple model
variants. It depicts two bottom-control layouts: Type A has a microphone
switch; Type B does not. The manual does not identify which layout is fitted
to the installed unit, so PrivacyShield displays **Check TV**. The software
controls above turn off voice features; they do not replace a hardware
disconnect.

## webOS 26 and Homebrew access

PrivacyShield queries SettingsService and falls back to a root snapshot that
reads only the 15 supported setting values, seven agreement flags, selected
diagnostic flags, service names, and Homebrew app metadata. The snapshot does
not return raw preference files. Local app/process inventory and the fallback
require the Homebrew Channel `exec` API. On webOS 26, the application declares
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
individually tested live. The current v0.1.6 package has not been installed or
run on the TV. Its expanded settings were read over SSH only; no settings or
agreement choices were changed during this map work. Direct SettingsService
option/general/agreement requests remain denied on this firmware, so the app
uses the HBC snapshot fallback. System information and network status calls
succeed directly.

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

## Samsung story context

Samsung's public documentation describes a Pet Care and Family Care feature
that uses SmartThings to analyze nearby noises such as barking or crying and
send notifications. That disclosed feature does not establish the separate
claim that a Samsung TV's audio service runs continuously or reports ambient
sound events to Samsung without a user's activation.

On October 24, 2026, a report summarized a researcher's posts about static
analysis of a 2025 Samsung TV firmware, including a service name, event
counters, and cloud endpoint. The report said the full technical writeup had
not been published and no independent lab had reproduced the findings. Treat
those claims as unverified; they do not establish behavior on this LG webOS
TV. This assessment uses this set's own preference files and webOS Settings
application, plus LG's model documentation and statements.

## Sources

- [LG OLED77C6HUP product support and manuals](https://www.lg.com/us/support/product/lg-OLED77C6HUP.AUS)
- [LG OLED77C6HUP owner manual](https://gscs-b2c.lge.com/open/downloadFile?fileId=wfynXPbF61Qz9tGNP8mg) — page 7 shows the two bottom-control layouts
- [LG explanation of voice recognition and ACR](https://www.lgcorp.com/media/release/30566)
- [Samsung support: Vision AI, including Pet Care and Family Care](https://www.samsung.com/us/support/answer/ANS10006930/)
- [Report on the Samsung reverse-engineering claims and verification status](https://pasqualepillitteri.it/en/news/26796/samsung-tvs-researcher-claims-microphone-always-on)
- [LG Privacy Statement for Smart TVs](https://www.lg.com/us/newsroom/corporate/statement-understanding-privacy-on-lg-smart-tvs)
- [webOS TV Settings Service reference](https://webostv.developer.lge.com/develop/references/settings-service)
- [webOS TV ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)
- [LG Magic Remote input and key codes](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [LG webOS Back Button handling](https://webostv.developer.lge.com/develop/guides/back-button)
- [HBC `lunabus.query` permission change](https://github.com/webosbrew/webos-homebrew-channel/commit/50fa99e)
- [HBC app listing and current catalog version](https://repo.webosbrew.org/apps/org.webosbrew.hbchannel/)

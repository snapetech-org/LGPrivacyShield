# LG webOS privacy capability map

This map covers controls and observable state traced on an LG C6 running webOS
26. It distinguishes settings that can be read and changed from permission
manager actions and other keys whose full behavior is not yet verified. A key,
process, or endpoint alone does not prove that data was collected or sent.

The exact
`OLED77C6HUP` / SDK `11.2.0` / firmware `43.21.79` profile contains 15
reviewed control candidates. The TV-local firmware key index lists 14; it does
not list `hbbTvDnt`, so that candidate is unavailable on this build. Other
B/C/G families use narrower installed-platform maps
assembled from the published sources listed below. They do not claim that
every control exists on every TV: PrivacyShield checks each mapped key and
keeps unreadable or missing settings locked. See
[DEVICE-COMPATIBILITY.md](DEVICE-COMPATIBILITY.md) for the family/platform
maps. Public records from
Glasshouse, CleanYourTV, webOS Unclutter, own-your-glass, tv-home, the LG TV
Blocklist, firmware ACR research, and the IMC ACR study are consolidated in
[COMMUNITY-EVIDENCE.md](COMMUNITY-EVIDENCE.md), with each record's model scope
and access level. They support the shared platform maps but do not extend the
full exact-device C6H profile to other TVs. The exact OLED55B56LA B5 owner map
adds Smart Tips and HbbTV controls only for its reported model/SDK match; its
firmware version was not published. A separate OLED65G5WUA / webOS 10.2.1
guide supplies three model-specific promotion-key candidates and five
read-only option values; its numeric firmware is not published, and its root
preference script is not an app-permission test.

## Evidence and limits

The investigation used read-only preference inspection, the Settings and First
Use application bundles shipped on the TV, Luna service registration, and
static analysis of the SettingsService executable. The Settings bundle is
about 3.1 MB and the First Use bundle is about 1.3 MB. REA's JavaScript parser
ran out of worker heap on both bundles, so the mapped UI paths were checked in
focused source excerpts. Ghidra analyzed SettingsService as ARM ELF32 and
decompiled its generic `setSystemSettings` handlers. Its schema and caller
permission check were visible; searches of Ghidra-defined strings found no
agreement-specific names. That does not prove the service lacks agreement
behavior.

Evidence records from the Ghidra session:

- SettingsService overview: `ev_b8a9b9d225cb84ae06013ee713421e290d64e8203faf882c73ea1edcbc16ecd6`
- Bounded search for `eula`: `ev_a4fefb835f59787c0144d1ebb32f8ced4fe584c59cc4b92636858bb17f405a4f`
- `doSetSystemSettings` pseudocode: `ev_9fd626f6fe4448e43e757b6b0f2dfe812d7f4ed32b5812ebda3f772c33f2f2a6`
- `cbSetSystemSettings` pseudocode: `ev_70d4d1783c1a51c6fdaff25541b83c94a8331508ee5db07eae918e891d803fb5`

The app can show settings, saved agreement flags, selected local service
names, diagnostics upload configuration, and installed Homebrew apps. It does
not inspect network payloads, identify the owner of an encrypted connection,
or list past reports/uploads. Router DNS logs can show destination names;
bounded packet capture is needed to study network traffic. Neither proves
payload contents when traffic is encrypted.

## Settings traced to LG's Settings app

Sixteen switches use SettingsService category and key names in the current
catalog. Do Not Sell uses LG's separate ad-manager method. PrivacyShield reads
each value back before showing a successful change. The exact C6H profile
contains 15 reviewed candidates, and the local firmware index lists 14 of
them. Smart Tips are optional and
outside the preset: both are mapped on C2/webOS 22 and webOS 24, while
`general.aiNudge` is also mapped for the exact B5 model/SDK overlay.

The current C6 firmware map was read without changing settings. It lists 24 of
25 reviewed control/reference keys and omits `hbbTvDnt`. That key is no longer
requested or writable in the app on this build, even though a saved preference
entry exists; the map does not establish that the preference is an active
SettingsService control. A live app write followed by matching TV readback was
previously confirmed for Live Plus and the two voice controls. Other candidates
remain unverified for app-side writes on this physical TV. The compatibility
screen and registry keep this distinction visible; a headless pass is not
device validation.

| Setting | LG path | PrivacyShield action | Feature effect or limit | Confidence |
|---|---|---|---|---|
| Live Plus / ACR | `option.livePlus` | Preset: `off` | Disables the Live Plus viewing-recognition feature. Related recommendations and some viewing-based features may be unavailable. LG describes ACR as audio fingerprinting; this switch does not show agreement status. | High |
| Hands-free voice recognition | `general.voiceLongDistance` | Preset: `off` | Stops far-field voice commands. It does not disconnect the built-in or remote microphone. | High |
| Voice wake | `option.turnOnByVoice` | Preset: `off` | Stops voice commands from waking the TV from standby. The power button and remote remain available. | High |
| Limit Ad Tracking | `general.lmt` | Preset: `on` | Limits advertising-related use of personal data. Ad personalization may change; ads remain. The C2/webOS 22 source list also includes a root-side C2 write/readback route. | High |
| Do Not Sell My Personal Information | Settings UI stores `general.doNotSellMyPersonalInformation` and calls `com.webos.service.admanager/updateDNS` with `status: on/off` | Separate switch through LG's ad-manager method | LG says this asks third-party providers to stop commercializing personal information. Some ad-supported services may remain. This does not change network DNS settings. | High for UI path; live effect not tested |
| Screen Saver Promotion | `general.screenSaverAd` | Preset: `off` | Hides promotions in supported screen savers and apps. Other TV ads may remain. | High |
| Home menu ads | `general.homePromotion` | Preset: `off` | Hides sponsored advertisements in the Home menu. It does not remove all TV ads. | High |
| Live Promotion | `option.livePromotion` | Preset: `off` | Disables custom ads and services while watching content. LG makes this option available when Live Plus is on. | High |
| Home content recommendations | `other.contentRecommendation` | Preset: `off` | Hides recommendation categories in the Home menu. LG notes availability can vary by country. | High |
| Smart tips | `general.aiNudge` | Optional; not in preset | Hides suggestions for TV features shown while watching or using an app. Glasshouse maps this as `on`/`off` on webOS 9.2; the source does not say it changes data collection. | Moderate; C2/webOS 22, webOS 24, exact B5 owner map, and exact G5 key report combined with Glasshouse values |
| Smart tips in Settings | `general.aiSettingsNudge` | Optional; not in preset | Hides suggested settings in LG Settings. Glasshouse maps this as `on`/`off` on webOS 9.2; the source does not say it changes data collection. | Moderate; C2/webOS 22 and webOS 24 maps |
| HbbTV Do Not Track | `option.hbbTvDnt` | Candidate only where the TV's firmware index lists it; absent on this C6H build | Asks HbbTV services to disable user tracking. It applies only when HbbTV is used. | High for the B5 source mapping; unavailable on the current C6H firmware |
| HbbTV Device ID | `option.hbbTvDeviceId` | Preset: `off` | Controls sharing of a distinct HbbTV-only ID. It has no effect while HbbTV is off. | High |
| HbbTV third-party cookies | `option.thirdPartyCookie` | Separate switch; writes `onByUser` or `offByUser` | Controls third-party cookies on HbbTV. Turning them off may affect sign-in or interactive app features. | High |
| HbbTV interactive services | `option.hbbTV` | Separate switch; recommended `off` | Disables broadcast-linked interactive services. Broadcaster apps and interactive features can be unavailable. | High |
| Bluetooth wake | `network.bleAdvertisingOnOff` | Separate switch; recommended `off` | Lets a supported mobile device turn on the TV over Bluetooth. LG warns that enabling it can increase energy use in networked standby. | High for UI path |
| Sleep on Absence | `option.homeSenseAbsence` | Separate switch; recommended `off` | Can turn off the TV after LG detects that the user is away. LG describes a one-week learning period and a requirement that the TV and mobile device not share a network for an hour. | High for UI path |

For the exact OLED55B56LA / SDK 10.3.1 B5 profile, the owner audit additionally
maps `option.hbbTV`, `option.hbbTvDnt`, and `option.hbbTvDeviceId`. These are the
same HbbTV controls already defined in the app; the source scope is limited to
that model and SDK, and its firmware number is not published. The app also
shows `network.allowMobileDeviceAccess` as read-only status there because the
audit found the local SSAP service still reachable when the setting was off.

For the exact `OLED65G5WUA` / webOS 10.2.1 overlay, the Level1Techs root guide
names `general.aiNudge`, `general.screenSaverAd`, and `general.homePromotion`.
PrivacyShield uses those as source-mapped candidates with Glasshouse's shared
SettingsService definitions; the app still requires a readable current value
and matching readback on the TV. The guide omits numerical firmware and writes
preference files directly, so its five option keys (`watchedListCollection`,
`usageCare`, `dbgLogUpload`, `faultLogUpload`, `thirdPartyCookie`) are status
only. The guide also writes cached agreement state; PrivacyShield leaves that
in the native webOS consent flow.

Glasshouse also publishes a C5/webOS 10.3.1 key-reader investigation. PrivacyShield
uses the `voiceLongDistance` and `thirdPartyCookie` findings as candidates only
on C5 devices reporting SDK 10.3.1 / webOS 25. It shows `watchedListCollection`,
`usageCare`, `dbgLogUpload`, and `faultLogUpload` as read-only status for that
same software cohort. The report does not publish the scanned set's exact SKU
or numeric firmware. `usageCare` is a Family Care menu setting in the report,
not a demonstrated collection control. The Glasshouse source reports some
readers but does not establish PrivacyShield app permissions or the result of
writing these values.

The `webos_lockout` project adds a narrower C5 row: it identifies
`OLED77C51LA` running Rockhopper 10.3.1-3006 and sets `usageCare`,
`dbgLogUpload`, and `faultLogUpload` to false in the option preference file.
PrivacyShield attributes those three read-only status values to that exact
model/software row. The project does not publish a numeric firmware version or
test the packaged app's setter. It describes `usageCare` as usage data, while
Glasshouse found a Family Care menu effect and no collection behavior; its
effect remains unresolved.

The standard profile's preset contains up to ten values: Live Plus off, both
voice settings off, Limit Ad Tracking on, Screen Saver Promotion off, Home
menu ads off, Live Promotion off, Home content recommendations off, HbbTV Do
Not Track on, and HbbTV Device ID off. The current C6H firmware index omits
HbbTV Do Not Track, so that TV's preset contains at most nine of these values.
The preset leaves Do Not Sell, HbbTV interactive services, HbbTV
third-party cookies, Bluetooth wake, and Sleep on Absence for separate choice.

## LG agreement choices

PrivacyShield reads the current selectable entries in
`eulaInfoNetwork.eulaList`. On the exact C6 firmware, seven entries of type
`M` have verified ID/title pairs. The app displays those seven with the
source-backed accepted and declined effects in
[LG-AGREEMENT-EFFECTS.md](LG-AGREEMENT-EFFECTS.md). Other current `M` entries
reported by a TV are displayed with their status and an **Effect not mapped**
cue. The app excludes the native screen's Overview, Select All, Legal Notice,
and older legacy entries from selectable-consent rows.

`accepted: false` is shown as **Not accepted**; missing or malformed data is
**Unavailable**. The app does not write `eulaStatus` or `eulaInfoNetwork`. Its
button opens LG's native User Agreements screen and refreshes the displayed
state when the app returns. Agreement status records the saved choice; it does
not show what data was processed or sent.

On this firmware, LG's native agreement flow warns that changing a required
agreement can revoke other choices and restart setup. Terms and menu behavior
can vary by region and firmware.

## Per-app permission manager

LG Settings has an App Permissions screen. Its UI lists installed apps and uses
`com.webos.service.ppm/queryPermissions` with `subscribe: true` to display
per-app permission status. The Settings bundle maps these privacy groups and
resources:

| Privacy group | Settings data name | Resource | Write path observed in LG Settings |
|---|---|---|---|
| `camera.privacy` | `cameraResourcePermission` | `camera` | SettingsService per-app permission list |
| `microphone.privacy` | `microPhonePermission` | `mic` | `com.webos.service.ppm/setPermission` with `allow` or `deny` |
| `nearbydevice.privacy` | `nearbyDevicePermission` | `ble` | SettingsService per-app permission list |
| `usbFileAccess.privacy` | `usbFileAccess` | `usbFileAccess` | `com.webos.service.ppm/setPermission` with `allow` or `deny` |

The PPM API permission file on the TV associates `ppm.query` with
`queryPermissions` and `ppm.management` with permission writes. PrivacyShield
does not yet request these groups or expose per-app switches: a root-side
`queryPermissions` attempt returned no parseable status, and the app's caller
identity and readback behavior have not been validated. The empty camera and
nearby-device arrays observed in preferences do not prove that every app is
denied. Add these controls only after app-context reads, per-app writes, and
readback are tested on supported firmware.

## One-time ID and history actions

These are actions in LG Settings, not privacy switches. They are mapped but
not included in PrivacyShield.

| LG action | Service path | What it does | Why it is separate |
|---|---|---|---|
| Reset HbbTV Distinctive ID | `com.webos.service.wampluggable.hbbtv/resetDeviceId` | Resets the HbbTV distinctive ID. | This rotates an identifier; it does not disable HbbTV ID sharing. |
| Delete Connection History | `com.webos.service.wampluggable.hbbtv/resetDialConnection` | Clears the list of apps approved when connecting to the HbbTV mobile app. | This removes local approval history; its effect on existing app access needs separate verification. |
| Reset AD ID | `com.webos.service.admanager/resetIFA` | Assigns a new advertising ID. LG's screen says ad-related data will then be collected and tracked based on that new ID. | This rotates an identifier and is not a way to stop ad tracking. |

## Other settings to map

These items appear in preferences or the Settings bundle, but their full
write/read/effect path is not yet established. They are not app controls.

| Candidate | Evidence | Remaining work |
|---|---|---|
| `homeSensePresence` | Settings label is Wake on Presence. It can turn on the TV when the user is detected nearby and the mobile device shares the network. The handler also changes `lifeOnScreenMode` and `picture.erpUserConfirm` and has alert flows. | Map all coupled writes and prompts before offering a switch. |
| `motionSensorSensitivity` | Settings UI includes a Motion Sensor Sensitivity control with non-boolean values. | Identify its valid range and linked behavior; do not model it as on/off. |
| `motionRecognition`, `absenceRecognition`, `personalRecommend` | Preference keys found during inspection, without a fully traced current UI handler. | Find the user-facing label, service handler, and effect on this firmware. |
| `adCookie`, `customizedAd`, `nativeConsentAd` | Advertising-related preferences. | Determine whether these are managed by another UI or reflect consent-derived state before considering writes. |
| `webOSPromotionVideo`, `promotionStreamer` | Promotion-related preferences. | Trace the actual UI and visible feature effect. |
| `faultLogUpload`, `dbgLogUpload`, `autoUpload` | Diagnostic flags and local diagnostic services/configuration. PrivacyShield shows selected status. | Map the user-facing controls and past-report visibility. The current app cannot enumerate past uploads or report contents. |
| `enableIpControl`, `enableSDDP` | Network/device-control preferences. | Determine discovery exposure and compatibility effects before recommending changes. |

## PrivacyShield service permissions

| Call | App permission or path | Purpose |
|---|---|---|
| `com.webos.settingsservice/getSystemSettings` | `settings.query` | Read the supported setting values and agreement records. |
| `com.webos.service.tv.systemproperty/getSystemInfo` | `systemconfig.query` | Read model and software version. |
| `com.palm.connectionmanager/getStatus` | `network.query` | Read internet connection status. |
| `com.webos.applicationManager/launch` | `applications.launcher` | Open LG User Agreements after the user selects the button. |
| `com.webos.service.admanager/updateDNS` | Public method on the inspected firmware | Apply Do Not Sell through LG's ad-manager route. |
| HBC `exec` | `lunabus.query` plus HBC's Luna API map | Run the fixed-path local snapshot and allowlisted writer. This is privileged and is not a general shell field. |

Direct SettingsService writes are denied to the Homebrew app on the inspected
firmware. The writer uses the HBC bridge with fixed script paths and an
allowlist of setting keys and values. It reads changes back before reporting
success. The bridge mapping grants the ACG to all HBC service methods, not
only `exec`; see [BRIDGE-FIX.md](BRIDGE-FIX.md) for its scope and repair
history.

## Microphone switch

LG's C6-family owner manual shows two bottom-control layouts: Type A has a
microphone switch and Type B does not. The manual does not identify which
layout is fitted to the exact TV. PrivacyShield therefore says **Check TV**.
Software voice settings disable recognition features; they do not electrically
disconnect a microphone.

Public C5 reports from Glasshouse and tv-home describe a physical microphone
switch and separate service paths for reading it. The exact model and firmware
are missing from both reports. This evidence is specific to those C5 reports;
it does not identify a switch on the C6H.

## Sources

- [LG owner manual for the OLED77C6HUP family](https://gscs-b2c.lge.com/open/downloadFile?fileId=wfynXPbF61Qz9tGNP8mg) — pages 1 and 7 show the model and two bottom-control layouts.
- [LG statement about Smart TV privacy](https://www.lg.com/us/newsroom/corporate/statement-understanding-privacy-on-lg-smart-tvs)
- [LG guide to User Agreements](https://www.lg.com/us/support/help-library/seeing-a-user-agreements-screen-on-your-lg-tv-CT10000018-20155426555618)
- [webOS Settings Service reference](https://webostv.developer.lge.com/develop/references/settings-service)
- [webOS Application Manager reference](https://webostv.developer.lge.com/develop/references/application-manager)
- [webOS Access Control Group guide](https://webostv.developer.lge.com/develop/guides/acg-guide)

See [RESEARCH.md](RESEARCH.md) for reverse-engineering notes and
[FEATURE-IMPACT.md](FEATURE-IMPACT.md) for the effects of the confirmed
switches.

# Public LG model and privacy evidence

Checked 2026-10-24. The source snapshots are in [`community-data.js`](../webos-app/src/community-data.js) and [`community-reference.js`](../webos-app/src/community-reference.js). These research files stay in the repository and are not included in the TV app package.

The combined sources provide real model rows, software versions, settings/service maps, consent effects, microphone paths, and independent network observations. Their scope and access level stay attached to each finding. A tool running as root, on a different TV variant, or in a network-capture setup does not prove that PrivacyShield can read or write the same thing from its packaged-app context.

The normalized Glasshouse (Copyright © 2026 Rory Gallagher) and CleanYourTV
(Copyright © 2026 cleanyourtv-WebOS contributors) device observations in
[`community-data.js`](../webos-app/src/community-data.js) use source snapshots
whose repositories publish MIT licenses: [Glasshouse](https://github.com/rorygallagher2024/glasshouse/blob/a1b93a218222034934004d502aeff3f111dfd411/LICENSE)
and [CleanYourTV](https://github.com/lasharor/cleanyourtv-WebOS/blob/5736f246d0192d78c9bed9b3ba66f8e2ac945c5b/LICENSE). These research files are
excluded from the TV package. Their notices are preserved in
[`LICENSE-Glasshouse`](../data/licenses/LICENSE-Glasshouse.txt) and
[`LICENSE-CleanYourTV`](../data/licenses/LICENSE-CleanYourTV.txt). The firmware
package catalog has separate license uncertainty documented in
[`data/README.md`](../data/README.md).

PrivacyShield combines a shared Glasshouse SettingsService registry with narrower model/software control maps: a C5/SDK 10.3.1 cohort overlay, exact `OLED55B56LA` B5 and `OLED65G5WUA` G5 overlays, and the exact `OLED77C6HUP` / SDK `11.2.0` / firmware `43.21.79` profile. Other reported settings remain research evidence; the app does not read or display them. These maps are published across separate projects; there is no single per-model private-key database. A source map nominates a control; the TV must return a readable value before the app enables its switch, and each change requires exact readback.

The Opt Out Of catalog has a separate guide for every B1–B6, C1–C6, and G1–G6 family. These pages are model-family privacy and menu maps, not private Luna key tables. Rooted projects publish both shared SettingsService registries that adapt to keys reported by a TV and narrower model/software maps such as the B5 and C5 findings below. The repository keeps source maps separate from on-device readback.

## Evidence types

- **Model and menu documentation** records LG's published model features and setting paths. It does not show a TV's current state.
- **Tested-app row** means another project reports that its own software ran on the listed TV. This proves that project's stated result only.
- **Firmware/source map** connects a setting, agreement, service, or device path to code or a reader found on the listed software.
- **Network observation** records DNS or packet behavior in a specific setup. A hostname found in firmware is not proof that the TV contacted it.
- **PrivacyShield source mapping** follows the published setting key, category, values, and writer behavior. Runtime availability still requires a readable value from the TV; a successful change requires matching readback. Physical tests are kept distinct from platform-level source maps.

The levels are not interchangeable. In particular, a successful install is not a privacy-control test; a root helper is not an app-context permission test; and a headless simulation does not prove TV firmware behavior.

## Pinned sources

| Source | Revision or date | What it contributes | Scope and access |
|---|---|---|---|
| [Opt Out Of LG catalog](https://optoutof.com/tv/), example [B1](https://optoutof.com/tv/lg/b1-2021/), [C6](https://optoutof.com/tv/lg/c6-2026/), and [G6](https://optoutof.com/tv/lg/g6-2026/) family pages, plus the [platform settings guide](https://optoutof.com/tv/lg/settings/) | Snapshot SHA-256 `324475eccb75ebdc1eb7eefbba6ab6672266214b1c4445db76b87c580b861cf8`; checked 2026-10-24 | Model families, sizes, microphone evidence, ACR/Live Plus, local-device discovery, menu-ad controls, update status, and version-specific menu paths | Separate guides exist for all 18 families. They do not publish internal SettingsService key names, and region/installed firmware may differ. The standard C6 page excludes C6H. |
| [Glasshouse tested TVs](https://rorygallagher2024.github.io/glasshouse/tested-tvs/), [TV research](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/), [ACR notes](https://rorygallagher2024.github.io/glasshouse/ACR/) | `rorygallagher2024/glasshouse` revision `a1b93a218222034934004d502aeff3f111dfd411` | 49 exact model/software report rows; privacy keys, reader code, agreement effects, ACR behavior, and a C5 microphone-switch finding | Root-run server and firmware research. Some research entries omit exact model/firmware even when the family and webOS are stated. The app labels the source's version field as reported webOS/SDK because the table mixes version styles. |
| [Glasshouse dashboard](https://github.com/gnacho/lg-webos-dashboard), [privacy map](https://github.com/gnacho/lg-webos-dashboard/blob/6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1/server/lib/privacy.js), and [tested-TV table](https://github.com/gnacho/lg-webos-dashboard/blob/6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1/README.md) | Revision `6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1` | C2/webOS 9.2 `general.lmt` write path and ad-manager readback | Root dashboard code reports the test on a C2. Its table lists OLED42C24LA on webOS 9.2.2 / firmware 23.25.55, but does not tie that exact row to the LMT test. This is cohort evidence, not a per-model permission test. |
| [CleanYourTV tested TVs](https://lasharor.github.io/cleanyourtv-WebOS/tested-tvs/) and [debloat guide](https://lasharor.github.io/cleanyourtv-WebOS/debloat/) | `lasharor/cleanyourtv-WebOS` revision `5736f246d0192d78c9bed9b3ba66f8e2ac945c5b` | Full tested/reported table and ad/telemetry service actions | Root service and boot integration; one maintainer-tested TV, owner reports on other rows |
| [webOS Unclutter](https://github.com/sonodima/webos-unclutter) | Revision `087c7b477071c9ae325aea20ad9b2ba834f7de61` | Telemetry/network baseline | Project says its rules were built around an European C1 on webOS 6.0; exact model and firmware are not listed |
| [own-your-glass](https://github.com/JulioFerrero/own-your-glass), [verification report](https://github.com/JulioFerrero/own-your-glass/blob/56a60fde6e112c081aa11541d3d2655a661aceae/docs/VERIFICATION-REPORT.md), and [findings](https://github.com/JulioFerrero/own-your-glass/blob/56a60fde6e112c081aa11541d3d2655a661aceae/docs/FINDINGS.md) | Revision `56a60fde6e112c081aa11541d3d2655a661aceae` | Exact OLED55B56LA B5 owner audit with SettingsService writes, plus physical ALSA capture and Magic Remote voice-path findings | Verification report: Germany OLED55B56LA, webOS 10.3.1; firmware not published. Overview's later webOS 10.3.2 path report has no model tuple. Root context is not a packaged-app permission test. |
| [Level1Techs LG G5 rooted privacy guide](https://forum.level1techs.com/t/lg-tv-block-mini-how-to/255178) and its [preference script](https://forum.level1techs.com/uploads/short-url/ycufCLNAeQsvtaQgfbqJkJMGpML.txt) | Guide dated 2026-09-05; checked 2026-10-24 | Exact-model G5 preference keys and intended off/false values | One `OLED65G5WUA` on webOS 10.2.1; numerical firmware is not published. Script edits root-owned preference files and does not test PrivacyShield's app-side SettingsService path. No script license is stated; findings only are recorded here. |
| [webos_lockout](https://github.com/josippapez/webos_lockout), [device report](https://github.com/josippapez/webos_lockout/blob/bc1b170f86aeb6bca176da5a9324158c759baa11/README.md), and [preference script](https://github.com/josippapez/webos_lockout/blob/bc1b170f86aeb6bca176da5a9324158c759baa11/tv/lockout.sh) | Revision `bc1b170f86aeb6bca176da5a9324158c759baa11`; checked 2026-10-24 | Exact C5 preference keys `usageCare`, `dbgLogUpload`, and `faultLogUpload`; script reports persistence through reboot | Built and verified on `OLED77C51LA`, Rockhopper 10.3.1-3006; numeric LG firmware is not published. Root boot script writes the preference file, not the PrivacyShield app's SettingsService path. MIT. |
| [Life's Good Without Spying](https://github.com/lewisdoesstuff/lifesgoodwithoutspying) | Revision `8c427116eb76b94e9c9aa05440a2039650195b28` | Rooted app toggles for ad/ACR/voice services, host filtering, and optional DNS | Maintainer identifies OLED65G45LW (EU), webOS TV 9.2.4, firmware 23.23.30 as the tested device; other versions are reported, not personally tested |
| [LG TV Blocklist](https://github.com/furkan-bayrak/lg-tv-blocklist) and [audit method](https://github.com/furkan-bayrak/lg-tv-blocklist/blob/main/docs/methodology.md) | Revision `68afe10de07bfdc8e8ecf91a7069a17419597271` | Evidence-annotated SAFE/STRICT DNS lists from a two-week, 44,800-packet / 267,000-query audit | One G1 on a German network; exact model code, webOS build, and firmware were not recorded. Lists/data are CC BY 4.0; scripts are MIT |
| [KallistoX C1 capture report](https://www.reddit.com/r/Ubiquiti/comments/1wgzqo6/measured_what_an_lg_webos_tv_actually_phones_home/) and [reproducible UniFi script](https://gist.github.com/KallistoX/ca0413c63e58799ecdfc516b64d603ff/486d45730c7f088cf7d25e235c9fc9e3cf27798d) | Gist revision `486d45730c7f088cf7d25e235c9fc9e3cf27798d`; checked 2026-10-24 | 40-minute DNS/SNI capture and reversible gateway sinkhole | One opted-out European C1 on webOS 6.0; exact model and firmware not published; the gist does not state a license, and the script/domain list are not redistributed |
| [webos-debloat](https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec/a269896606b83a31bb85f2f25146b51ceb876fe6) | Gist revision `a269896606b83a31bb85f2f25146b51ceb876fe6` | SettingsService keys for promotions, sports alerts, recommendations, and Live Plus; app list and preload policy | One US 2026 LG OLED, reported webOS 26 / firmware 11.2; exact model code and full build are not published. MIT |
| [PrivacyShield C6H firmware-index capture](../tests/fixtures/oled77c6hup-firmware-key-map.json) | Captured read-only 2026-10-24; source file SHA-256 is recorded in fixture provenance | Allowlisted category/key pairs from `/etc/palm/description.categorykeysmap.json`; 24 reviewed keys across control and reference candidates, with `hbbTvDnt` absent | Exact `OLED77C6HUP.ACCQLJD`, SDK 11.2.0, firmware 43.21.79. This proves registration/category only; no setting values or unreviewed firmware keys are included. |
| [LG firmware download and applicable-model guide](https://www.lg.com/us/support/product/lg-OLED77C5PUA.AUS), [openlgtv EPK extractor](https://github.com/openlgtv/epk2extract), and [`super.pak` extraction guide](https://github.com/openlgtv/epk2extract/pull/143) | Checked 2026-10-24 | Offline route to locate firmware key maps in exact-build images; EPK v2/v3 extraction needs AES/RSA material from a running TV, and newer `super.pak` layouts need a second partition-extraction step | LG's C5 support page lists a 33.31.69 update ZIP and applicable-model guide. This repository has not extracted a second SKU map from an EPK. |
| [webOS Homebrew hidden system settings](https://www.webosbrew.org/pages/hidden-system-settings) | Checked 2026-10-24 | Candidate `network.allowMobileDeviceAccess` key for SSAP/LG Connect Apps exposure on ports 3000/3001 | Public SettingsService reference; no model, firmware, or device readback. Disabling it may remove local phone-remote integrations. |
| [Looking Glass investigation report](https://github.com/richknowles/looking-glass/blob/master/investigation-report.md) | Revision `33d9abff1f651acd9cdf6198ffb5836650de97d8`; report dated 2026-09-14 | Owner-reported ACR configuration and local process/service checks | One rooted 2021 LG TV on webOS 6.0; exact model, region, and firmware are not published. MIT. The report does not include packet capture or payload analysis. |
| [TV ACR Firmware Research: LG analysis](https://github.com/xusheng6/tv-acr-research/blob/327a5f1d52351f63fb6b11b8c322f289aeb6752c/docs/vendors/lg.md), [firmware corpus](https://github.com/xusheng6/tv-acr-research/blob/327a5f1d52351f63fb6b11b8c322f289aeb6752c/docs/corpus.md) | Revision `327a5f1d52351f63fb6b11b8c322f289aeb6752c`; EPK SHA-256 `88b76f9814da8f3452105acbc2b7ddd4a2bc5514fdfbddb38e98be6ca591d76e` | `acr2`, Luna service policy/permissions, scheduled startup, logs, tests, and Live Plus UI resources | Secured EPK build `43.21.73.01-HE_DTV_W25O_AFABATAA`; exact TV model and region are not published. Static analysis (P2) establishes a firmware component/path, not household activation or transmission. MIT. |
| [tv-home privacy audit](https://github.com/astelmach20/tv-home/blob/3ccf07458cba16b0815619f0056140927e546fb1/PRIVACY.md) and [boot hook](https://github.com/astelmach20/tv-home/blob/3ccf07458cba16b0815619f0056140927e546fb1/tv/init.d/55-debloat) | Revision `3ccf07458cba16b0815619f0056140927e546fb1`; report dated October 2026 | C5 root audit of settings, agreements, logs, network connections, voice paths, and a RAM-based boot hook | One 2025 OLED C5 on webOS 11; exact model code, region, and firmware are not published. MIT. The hook also blocks firmware-update hosts. |
| [IMC 2024 ACR paper](https://discovery.ucl.ac.uk/id/eprint/10200730/) and [experiment code](https://github.com/SafeNetIoT/ACR) | Paper DOI `10.1145/3646547.3689013`; code revision `bdc56aa85ffc6beac46340890f349648c09040b5` | Controlled black-box network measurement of LG and Samsung ACR | Study scenarios and jurisdictions only; not a per-series SettingsService map |
| [Fightback: Consumer TV LG guide](https://github.com/dgomesbr/fightback-consumer-tv/blob/main/guides/vendors/lg-webos.md) | Checked 2026-10-24 | Cross-vendor index of ACR, DNS, menu, and breakage references | Secondary guide through webOS 25; it does not add an independent exact B/C/G device row. Its root-method date is 2025 and is not a current rootability check |
| [LG TV Device Information API](https://webostv.developer.lge.com/develop/references/tv-device-information), [Web API / engine table](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine), and [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide) | Official documentation, checked 2026-10-24 | Device identity fields, browser-engine versions, and app permission behavior | Public API/permission documentation; not LG's complete private settings schema |

The earlier catalog used a Glasshouse fork with a smaller report table. It has been replaced with the canonical upstream repository and its current pinned revision. The canonical page says **48 TVs across 33 series**, while its all-reports table contains **49 rows**. The snapshot preserves both figures instead of silently changing either one.

## B, C, and G coverage

The model-family list, launch years, listed sizes, and launch webOS labels below come from the Opt Out Of snapshot. Sizes are source-listed, not a guarantee that every region sells each size. A TV can later receive a newer webOS release, so launch platform and installed platform remain separate fields.

| Year | B series | C series | G series |
|---:|---|---|---|
| 2021 | B1: 55, 65, 77 · webOS 6.x | C1: 48, 55, 65, 77, 83 · webOS 6.x | G1: 55, 65, 77, 83 · webOS 6.x |
| 2022 | B2: 55, 65, 77 · webOS 22 | C2: 42, 48, 55, 65, 77, 83 · webOS 22 | G2: 55, 65, 77, 83, 97 · webOS 22 |
| 2023 | B3: 55, 65, 77 · webOS 23 | C3: 42, 48, 55, 65, 77, 83 · webOS 23 | G3: 55, 65, 77, 83 · webOS 23 |
| 2024 | B4: 48, 55, 65, 77, 83 · webOS 24 | C4: 42, 48, 55, 65, 77, 83 · webOS 24 | G4: 55, 65, 77, 83, 97 · webOS 24 |
| 2025 | B5: 48, 55, 65, 77, 83 · webOS 25 | C5: 42, 48, 55, 65, 77, 83 · webOS 25 | G5: 48, 55, 65, 77, 83, 97 · webOS 25 |
| 2026 | B6: 48, 55, 65, 77, 83 · webOS 26 | C6: 42, 48, 55, 65, 77, 83 · webOS 26 | G6: 48, 55, 65, 77, 83, 97 · webOS 26 |

Glasshouse exact report-row counts for each target family are:

| Year | B series rows | C series rows | G series rows |
|---:|---:|---:|---:|
| 2021 | B1 0 | C1 2 | G1 0 |
| 2022 | B2 0 | C2 2 | G2 1 |
| 2023 | B3 0 | C3 3 | G3 1 |
| 2024 | B4 1 | C4 4 | G4 2 |
| 2025 | B5 0 | C5 3 | G5 2 |
| 2026 | B6 0 | C6 1 | G6 0 |

Additional evidence adds a CleanYourTV G1, G2, and C5 row; two separate European C1 network baselines; a G1 network audit; a G4 rooted-app test; and the owner-audited `OLED55B56LA` B5 row. B1, B2, B3, B6, and G6 still have no exact community device row in the pinned sources. The model-unreported 2026 settings map appears separately and is not assigned to C6.

The C6 Glasshouse row is `OLED55C61LA`, SDK 11.2.0, firmware 43.21.79. Its note confirms screen-saver and remote-key results. It shares the installed software and firmware tuple with this PrivacyShield C6 sample, but the model code, size, and region differ; the row does not claim C6 privacy-control validation or establish the hardware of `OLED77C6HUP`.

The CleanYourTV snapshot distinguishes its G2 maintainer test from user reports. Its exact device rows include `OLED65G26LA` (webOS 25 / SDK 10.2.2 / 33.23.05), `OLED65C54LA` (SDK 11.2.0 / 43.21.77), and `OLED55G19LA` (webOS 6.5 / SDK 6.5.3 / 03.53.45), as well as six non-B/C/G devices. It also says two unnamed models ran firmware 23.25.55; their codes cannot be assigned to a cohort. The repository research snapshots retain all ten source rows; the TV app does not load them.

## Published privacy-control and service maps

### Live Plus, ACR, and advertising

- Glasshouse's root-run implementation writes `option.livePlus` and handles an ACR agreement flag separately. Its source does not establish one common agreement key across every firmware.
- Its code uses `general.lmt` and checks the advertising manager's reported limit-tracking state. The source notes variation by firmware; `getAdid` is absent on the listed OLED65C8PUA / 05.50.15 sample.
- The Glasshouse research describes `acr2` on a CX running webOS 5.6.2. A `getACRSolutionStatus` query started that on-demand service even with Live Plus off. In the documented off-state window, the researchers did not observe capture, the Alphonso library loading, or ACR network sockets. A process being present is not proof that capture or upload occurred; the status query itself changed process state, so it is not a passive probe.
- The IMC 2024 study reports ACR network activity for LG sets in its test scenarios and says opting out stopped ACR-server traffic in those scenarios. It also reports UK/US differences. This is direct network evidence for that study, not a B/C/G settings map or proof about all firmware.

### Agreement effects

Glasshouse traced native agreement dependencies and flags on a CX/webOS 5.6.2 and a C5/webOS 10.3.1. Its report says `generalTermsAllowed` depends on the native Terms of Use (`S_SVC`) and Privacy Policy (`S_PRG`) records. On the CX, withdrawing either agreement caused some YouTube, Netflix, and Content Store launches to enter LG's User Agreements screen. Writing the flag off while leaving agreements accepted also blocked launches until the terms were restored. Some other flags returned at boot, and the two CX units did not have identical flag sets.

This is why agreement records are not treated like ordinary on/off preferences. PrivacyShield opens LG's native agreement screen; it does not edit cached EULA records. The feature impact must be checked on the exact TV and agreement before changing it.

The current per-agreement map and its official LG sources are in
[LG-AGREEMENT-EFFECTS.md](LG-AGREEMENT-EFFECTS.md). Direct C6 title/ID records
are kept separate from LG's broader feature descriptions and Glasshouse's
firmware-specific observations.

### Additional settings found in firmware

Glasshouse's C5/webOS 10.3.1 search of `/usr` and `/etc` reports these keys and readers. The authors note that a reader constructing a key name at runtime could be missed.

| Key | Reader/effect in the report | Limitation |
|---|---|---|
| `option.dbgLogUpload` | `uploadd` and `PmLogDaemon`; hidden from the normal Settings UI; observed on again after boot | One C5 software sample; not an app-context read/write result |
| `option.faultLogUpload` | `uploadd`, `remotediag`, `prosense`, `PmLogDaemon`, Settings, and First Use | Its description limited it to Korea/USA in that firmware |
| `option.thirdPartyCookie` | Settings and WebAppMgr HbbTV plugin; accepted values included `on`, `off`, `onByUser`, `offByUser` | HbbTV-only behavior in the observed firmware |
| `general.voiceLongDistance` | Read by `voiceinput`; no capture device opened in tested active/standby checks | Authors did not settle whether detection runs on the sound chip |
| `option.watchedListCollection` | Listed by a spec file; no reader found by their search | Effect remains unknown |
| `general.lmt` | Limit AD Tracking; the CX and C5 both reported it on | Advertising-ID service readback timing varied |

The same research found that `option.usageCare` opens Family Care, but the Family Care service did not use it for screen-time locking; this is a UI/menu key, not evidence of data collection. A setting name alone is not enough to label a control as privacy-sensitive.

### Microphones and voice paths

The Glasshouse report identifies a physical microphone switch on a C5 running webOS 10.3.1. It reads the switch with `voiceinput.sound/getMicSwitchStatus`; the report describes a GPIO state and says switching it off disabled ThinQ voice activation. The research entry does not give an exact C5 model code or firmware.

The `tv-home` owner audit separately reports a C5 physical switch through `voiceinput/factory/getMicSwitchStatus` and says capture devices were closed while hands-free voice was off. Glasshouse reports `voiceinput.sound/getMicSwitchStatus`. Both are C5 reports, but they do not publish full model/firmware tuples or establish that the service paths are aliases. Neither establishes a switch on a C6 or C6H. The Glasshouse C6 row says nothing about a microphone switch, and the standard C6 manufacturer page does not cover the separate 77/83-inch C6H variants. The current C6H switch state is therefore unknown from these sources.

own-your-glass describes a different, root-only approach on an LG OLED/webOS 10.3.2: neutralize the set's ALSA capture endpoints and separately block the Magic Remote voice-input pipeline (`voiceinput_hidraw` → `voiceinput` → `voiceconductor`). The project says playback paths are preserved. It does not publish an exact model/firmware in its overview, and those device nodes cannot be assumed on other sets. This is evidence of an OS-level path, not a PrivacyShield software toggle or a universal microphone map.

The existing built-in microphone evidence table is separate from switch evidence. Product specs and reviews may identify far-field voice hardware without identifying a physical switch, its state, or which software setting disconnects it.

### Network and background services

- CleanYourTV documents stopping or preventing selected services such as `remotelogger`, `service-logger`, `contentminer`, `nudge`, `acr2`, `admanager`, `sportsalarm`, and `adoverlay-service`, plus selected ad-host redirection. This is its root service/boot integration, not a SettingsService map.
- webOS Unclutter says its telemetry rules were built around observations on a European C1 running webOS 6.0. The exact model and firmware are not listed; its own README warns that region and webOS version can change destinations.
- Glasshouse's C5/CX research separates names found in firmware from names actually seen in captures. A firmware hostname list alone does not prove a connection. Its report also finds region-prefixed variants that a simple exact-host block would miss.
- The `tv-home` C5 audit reports HDMI source, ad ID, TV MAC, nearby Wi-Fi access points, and diagnostic/log data in its observed collection map. Its author reports that optional agreements remained accepted after Live Plus was turned off, and that ten audio-capture attempts failed while output went over HDMI eARC. That is a single owner/root report; it does not establish behavior on the TV speakers, another C5 variant, or another model. The boot hook masks or replaces selected services in RAM, but also blocks firmware-update hosts; the author reports Home, the app store, and streaming apps continued working on that C5.

Two independent C1/G1 reports show why the network map must keep the exact cohort and method. The German G1 audit reports 44,800 captured packets and 267,000 DNS queries over two weeks, while warning that its exact firmware was not logged and that some resolver paths can bypass `/etc/hosts`. The separate European C1 report describes a 40-minute capture after opting out of settings and says it saw no direct-DNS, DoH, or DoT bypass. These are not contradictory measurements of the same set: region, firmware, prior opt-out state, gateway path, and capture window differ. Neither result should be generalized to every B/C/G device.

The G1 project's SAFE tier is documented to preserve streaming apps, the Content Store, and app updates on its tested G1. STRICT adds firmware-update, ThinQ, and LG Channels destinations; its documentation warns those services may stop and the Content Store may degrade. Later revisions corrected missing regional endpoint variants and moved some app-update/billing endpoints out of the default tier. PrivacyShield records the map and trade-offs but does not import or apply the blocklist.

### Additional settings and rooted app maps

The published private maps are spread across source repositories and device reports rather than collected into one model-by-model database. PrivacyShield combines them only where the model/software scope, category, key, and control behavior are clear enough to name.

The firmware itself supplies a more precise per-build key/category index at
`/etc/palm/description.categorykeysmap.json`. [LG's SettingsService reference](https://webostv.developer.lge.com/develop/references/settings-service)
documents category-specific reads and errors for undefined keys;
[webOS Debloat](https://gist.github.com/D-Rekk/468e559e823106afea72689d1e2aa1f1)
identifies the on-device index and separates it from
`/etc/palm/defaultSettings.json`, which contains defaults. The public
[Homebrew hidden-settings list](https://www.webosbrew.org/pages/hidden-system-settings)
is a shared reference, not a complete inventory for every SKU.

PrivacyShield's read-only C6H capture is `OLED77C6HUP.ACCQLJD`, webOS 26,
SDK 11.2.0, firmware 43.21.79, dated 2026-10-24. Of the 25 reviewed control
and reference candidates, the installed index lists 24; `hbbTvDnt` is absent.
The sanitized categories and source-file hash are recorded in
[`oled77c6hup-firmware-key-map.json`](../tests/fixtures/oled77c6hup-firmware-key-map.json).
This confirms registration and category on one exact build. It does not prove
the key's privacy effect, a preference's current meaning, or successful
SettingsService writes. A device's own index can be read on first use where the
HBC local snapshot is available, so another owner does not need to send us a
map first; the reviewed source map still controls which settings are offered.

The exact B5 owner report identifies `OLED55B56LA` (Germany) running webOS 10.3.1 / SDK 10.3.1; firmware is not listed. Its `policy.sh` script provides these category/key/value routes on that set:

| Key | Use in PrivacyShield | Scope and reason |
|---|---|---|
| `option.hbbTV` | Writable HbbTV master switch | Exact model/SDK map; the report links automatic HbbTV pages to third-party tracking |
| `option.hbbTvDnt` | Writable HbbTV Do Not Track | Exact model/SDK map; applies when HbbTV is enabled |
| `option.hbbTvDeviceId` | Writable HbbTV device-ID switch | Exact model/SDK map; applies when HbbTV is enabled |
| `general.aiNudge` | Optional Smart Tips switch | The B5 report names `aiNudge`; Glasshouse supplies its `general` category and `on`/`off` labels |
| `network.allowMobileDeviceAccess` | Research only; not read by the app | The report observed that turning it off did not close SSAP on the LAN, so the value is not treated as an access-control guarantee |

The B5 report also names `screenSaverAd`, `livePromotion`, `livePlus`, and Limit AD Tracking; their categories and user-facing meanings come from the shared Glasshouse registry and platform menu sources. It names `adCookie`, `sportsAlarm`, and `webOSPromotionVideo` without SettingsService categories. These remain source research; the app does not query or show them in Controls. The report says the ad cookie remained after `adCookie` was off and the sports-alert service remained running after its switch was off, so neither is presented as a protection control.

The Level1Techs guide names an exact `OLED65G5WUA` target running webOS 10.2.1, but does not publish its numerical firmware. Its script conditionally writes `general.aiNudge`, `general.screenSaverAd`, and `general.homePromotion` as off. PrivacyShield combines those exact-model key names with Glasshouse's shared `general` category and `on`/`off` SettingsService definitions, then requires a live read and matching readback. The script's five other option keys remain research only; direct preference-file changes do not establish that the packaged app can set them or that collection/upload stops. The script also edits cached EULA/consent state, which PrivacyShield does not copy; agreement changes remain in the native webOS flow.

Glasshouse's tested-TV table independently includes `OLED65G5WUA` / firmware 33.30.69 and `OLED83G5WUA` / firmware 43.21.71. Those rows report Glasshouse/dashboard behavior, not key-by-key privacy setting results, so they do not widen the G5 key map. The Level1Techs tuple and these Glasshouse rows are kept as separate samples because their firmware identity is not explicitly correlated.

Glasshouse's C5/webOS 10.3.1 firmware research supplies `general.voiceLongDistance` and `option.thirdPartyCookie` control candidates, plus four other option keys. PrivacyShield selects the two controls only for C5 devices reporting SDK 10.3.1 / webOS 25; it does not read or display the other keys. A separate exact `OLED77C51LA` / Rockhopper 10.3.1-3006 root report also sets `usageCare`, `dbgLogUpload`, and `faultLogUpload` to false and reports the values remained after reboot. It does not publish numeric firmware or test PrivacyShield's app-side setter. The sources differ on whether `usageCare` relates to collection: Glasshouse found a Family Care menu effect, while the root script treats the preference as usage data. The effect remains unresolved.

The G4 project `Life's Good Without Spying` identifies `OLED65G45LW` (EU), webOS TV 9.2.4, firmware 23.23.30 as its tested set. Its Homebrew app controls selected ad/ACR/voice daemons and generated host blocking; it separately offers optional DNS, IPv6, ThinQ, QuickSet, Home-session, and UPnP controls. Its own notes say disabling SDP can disrupt device initialization and clock-dependent apps, QuickSet blocking removes remote-code lookup, Home-session blocking affects recommendations and metadata, UPnP blocking breaks casting, and the voice-services switch can delay Settings launch. That is a useful G4 control/impact map, but root-run behavior is not a PrivacyShield app-permission test.

The model-unreported webOS 26 `webos-debloat` script maps `general:homePromotion`, `general:sportsAlarm`, `option:livePromotion`, `option:webOSPromotionVideo`, `option:promotionStreamer`, `option:livePlus`, and `other:contentRecommendation`. It reads values first, skips missing keys, saves the original values, supports dry-run, and restores the recorded values. The author reports one US 2026 OLED running webOS 26 / firmware 11.2 but does not publish its model code or full build. PrivacyShield uses the overlapping Live Plus, Home Promotion, Live Promotion, and Content Recommendation entries as platform-level candidates. This evidence is not assigned to C6 or used to map the other 11 controls.

Glasshouse's webOS 9.2 SettingsService registry also maps `general.aiNudge` and `general.aiSettingsNudge` to Smart Tips and Smart Tips in Settings, with `on`/`off` values and LG menu descriptions. Its C2/webOS 22 sample fixture lists both, though the current upstream unit test does not load that fixture. PrivacyShield maps both on C2/webOS 22 and webOS 24, and adds `general.aiNudge` for the exact OLED55B56LA B5/SDK 10.3.1 row. They remain optional prompt controls outside the recommended privacy preset; their documented effect is hiding suggestions, not changing what the TV collects.

The installed-platform map includes `general.lmt` (Limit AD Tracking) for webOS 22–26 using the published setting-key map together with model/platform menu documentation. The webOS 6 `Advertisement` item remains separate: its manual describes a legacy frequency-capping cookie, not Limit AD Tracking.

For C2/webOS 22, the app labels `general.lmt` with the Glasshouse dashboard's
root-side C2 write/readback route. The source comment identifies a C2 running
webOS 9.2; its tested-TV table lists OLED42C24LA but does not link that exact
row to the LMT test. PrivacyShield still reads the setting on the current TV
and verifies its own write there.

The webOS Homebrew hidden-settings reference documents `network.allowMobileDeviceAccess` as a boolean controlling exposure of SSAP/LG Connect Apps on ports 3000 and 3001. The B5 report also writes that key on its tested OLED55B56LA but found the local service still reachable when it was off. This finding is not read or shown by PrivacyShield. A set-specific status does not prove port exposure is blocked, and disabling the setting may affect phone-app integrations.

The `tv-acr-research` firmware analysis pins an LG secured EPK by exact build and SHA-256. It finds the `acr2` executable, ACR Luna service permissions and scheduled start, logging configuration, test resources, and Live Plus settings/help content. These artifacts establish component presence and an operational path in that firmware snapshot. The report explicitly separates this from runtime activation and network transmission. Its `zero.mp3` resource name is suggestive of audio recognition but does not establish an algorithm; the TV model and region are not published, so the finding remains unassigned to B/C/G.

The Glasshouse README currently lists 17 tested models across webOS 3.4–25. Its row for `OLED77C57LA` / C5 (webOS 10.3.1, firmware 33.31.68) explicitly says privacy, MQTT, screensaver, and the dashboard were confirmed. This overlaps the pinned 49-row Glasshouse sample rather than adding a distinct TV. Root-level/server permissions remain distinct from this packaged app.

Fightback is retained as a secondary guide and source index, not counted as a device measurement. Looking Glass is included as an unassigned owner investigation: it identifies one rooted 2021 LG webOS 6.0 TV but withholds the model code, region, and firmware. It describes configuration and process/service checks but does not publish packet capture or payload analysis. Those observations can guide follow-up inspection; they do not prove recording or transmission and are not assigned to B1, C1, or G1.

These sources give PrivacyShield and users candidate processes and destinations to inspect in local TV/router logs. They do not create a universal host blocklist. Do not block broad LG domains: Content Store and firmware paths can share those domains.

## Menu references

The repository records menu paths from Opt Out Of and LG manuals/help pages as research references. The app detects the installed platform only when the TV's SDK major agrees with the `Web0S` Chromium engine major. It does not infer the installed platform from the model year. The app does not show these menu paths.

Menu versions covered are webOS 6.x, 22, 23, 24, 25, and 26. The entries include Live Plus, User Agreements, Home Promotion, Content Recommendation, Live Promotion, Screen Saver Promotion, and Limit AD Tracking where documented. The repository keeps the legacy webOS 6 `Advertisement` help text separate from later `Limit AD Tracking` paths.

## Contributing a map

1. In Controls, choose **Prepare compatibility report**. Scan the single QR code with a phone to open the GitHub form with the report included in the link. Submitting the form creates a public issue.
2. Add the TV region or a menu-path observation in the optional form fields when useful. The report already includes model/software identity, API access, and read availability for all 17 controls.
3. Validate a saved report with `python3 scripts/validate_compatibility_report.py report.json`. The validator rejects extra fields and identifiers.
4. Do not include setting or agreement values, serial/MAC/IP, SSID, account information, full firmware or app bundles, or private screenshots. Exact-setting code can be shared as a short path/handler description and an artifact hash.
5. Mark findings as untested, reported, source-mapped, device-read-verified, write-readback-verified, or cross-validated. Do not promote an owner report directly to a writable profile.

For a new PrivacyShield profile, map the native Settings/First Use path to the service call, key, valid values, dependent agreements, side effects, and required ACG. Confirm app-context read access; test one reversible write with matching readback; check persistence and feature effects; restore the original state; and compare an independent set before calling the cohort cross-validated. Split profiles when model variant, region, firmware, UI bundle, permission, key, value domain, or behavior differs.

The current JSON report intentionally contains no settings values or agreement choices. It carries only model/SDK/firmware, profile metadata, API-read availability, and per-control read availability. Community test notes are a separate, owner-authored contribution.

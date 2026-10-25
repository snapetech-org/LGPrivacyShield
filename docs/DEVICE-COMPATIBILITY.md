# LG TV compatibility maps

TV owners can start with the [app guide](APP-GUIDE.md); this page describes the
model and software maps that control setting availability.

LGPrivacyShield builds a profile from the TV's model family and its **installed** webOS version. It supports the B1–B6, C1–C6, and G1–G6 OLED families. A series name does not prove that every setting exists on every size, region, or firmware. The app enables a mapped switch only after that TV returns a recognized value, and it reports success only after reading the requested value back.

## Profile layers

| Profile | Match | Mapped controls | Evidence |
|---|---|---|---|
| Family + platform | Recognized B/C/G family and installed webOS 6.x, 22, 23, 24, 25, or 26 | Shared controls from the platform row below; a missing key stays unavailable | Published SettingsService code, model-family guides, and platform maps; not a LGPrivacyShield physical-device test |
| C5 + SDK 10.3.1 / webOS 25 | C5 family with installed SDK 10.3.1 and webOS 25 | Family + platform controls, plus hands-free voice and HbbTV third-party cookies | Glasshouse C5/webOS 10.3.1 firmware research |
| OLED77C51LA + SDK 10.3.1 / webOS 25 | Exact C5 model and reported SDK; numeric firmware is unpublished | No additional app controls | `webos_lockout` root report; not a LGPrivacyShield app-side write test |
| OLED55B56LA + SDK 10.3.1 / webOS 25 | Exact B5 model code and matching SDK/platform; firmware was not published by the source | Family + platform controls, plus Smart Tips and three HbbTV controls | Owner-audited B5 SettingsService map. It is not a LGPrivacyShield app-side write test. |
| OLED65G5WUA + webOS 10.2.1 / webOS 25 | Exact G5 model code and matching software; numeric firmware was not published | Family + platform controls, plus `general.aiNudge`, `general.screenSaverAd`, and `general.homePromotion` | Level1Techs root guide plus Glasshouse key/value definitions. The root script edits preference files and does not test LGPrivacyShield's app-side setter. |
| Exact C6H | `OLED77C6HUP`, SDK `11.2.0`, firmware `43.21.79` | 15 profile candidates; the firmware index lists 14 and omits `hbbTvDnt` | Exact LGPrivacyShield sample; prior app write/readback checks for Live Plus and two voice settings |

The exact C6H profile takes priority. Other C6 sizes and regions use the C6 + installed-platform profile. The C5-specific settings do not carry forward to a C5 upgraded to webOS 26 because the source evidence is for webOS 10.3.1.

The repository includes a privacy guide for each B1–B6, C1–C6, and G1–G6 family. Those pages document model-family hardware, privacy claims, and menu locations; they do not publish private Luna key tables. LGPrivacyShield lists only controls selected by its installed-platform map and any exact-model overlay. The standard C6 guide explicitly excludes C6H; its microphone claims are not applied to C6H.

## Firmware-local category/key index

Rooted webOS firmware carries its own SettingsService key registry at
`/etc/palm/description.categorykeysmap.json`. The public webOS Debloat report
identifies that file as the category/key index; LG's SettingsService reference
confirms that a key can fail when undefined or requested in the wrong category.
The Homebrew hidden-settings list is useful as a shared reference, but it does
not claim to be a complete per-SKU inventory. The device-local registry is the
way to discover which reviewed candidate keys a particular installed firmware
actually registers.

The current C6H read-only capture is `OLED77C6HUP.ACCQLJD`, SDK `11.2.0`,
firmware `43.21.79`, captured 2026-10-24 from
`/etc/palm/description.categorykeysmap.json` (SHA-256
`2c818cd342ae675fac4e425ec6d2078b328e281a8e5994449bd6662cab92eec1`). The
research fixture contains 24 of 25 reviewed control/reference candidates in
`tests/fixtures/oled77c6hup-firmware-key-map.json`; `hbbTvDnt` is absent. It
remains unavailable in LGPrivacyShield even though an earlier shared map had it
as a candidate. A stored preference value does not override the firmware
registry for this app's SettingsService path.

LGPrivacyShield reads this index through the local HBC snapshot, keeps only
reviewed control keys/categories, and uses the device's category for individual
reads and writes. Missing or multiply categorized keys are omitted. If the
index is unavailable, the app falls back to the reviewed category and tests
each key separately. The index proves registration and category only; it does
not prove current value, privacy effect, successful writes, or that a feature
is active. `defaultSettings.json` contains defaults and is never used as
current-state evidence. This lets another rooted set identify its own keys on
first use without shipping a guessed key list for every size and region; the
source map still determines which findings are safe to expose as controls.

### Checksummed firmware package catalog

The EPK Firmware Archive publishes `processed_fw.json`, a model-to-package
index with firmware version, SDK/platform version, OTA ID, archive path, and
ZIP/EPK SHA-256 values. The repository's generated
[`data/lg-oled-firmware-catalog.json`](../data/lg-oled-firmware-catalog.json)
contains 405 checksummed package builds covering 525 exact OLED model codes in
all 18 B/C/G cohorts. It includes the B1 `W21U` OTA family as well as the
different C1/G1 `W21O` family. This catalog is maintainer research; the app
does not load or show firmware-package matches. Region variants can produce
multiple OTA IDs. The catalog is firmware identity metadata, not a settings
map, and it does not enable any control.

The pinned archive index was retrieved on 2026-10-24 and has SHA-256
`f27b1f8aed59da60b48fcdabd534ffff72cb84ad8d90ab1c59fd92829b0b2269`. Its
metadata identifies the exact C6H firmware package as OTA ID
`HE_DTV_W26O_AFABATAA`, firmware `43.21.79.01`, ZIP SHA-256
`e18681230c091c85a2a343752023cdd6da3d06a73e7958b5667e8edea909e8bf`, and EPK
SHA-256 `aa838614c503de6179a3bbc06ff355452db31cc710d20db7a288cadc91d6b1f3`.
The C6H settings registry in this repository is still the read-only capture
from the installed TV; the archive entry does not prove the installed bytes
match those package hashes.

Regenerate both catalog files from a downloaded source index with:

```sh
python3 scripts/build_firmware_catalog.py --input /path/to/processed_fw.json
```

The archive index contains package metadata only. A firmware-specific registry
must be extracted from the corresponding image and imported with the exact
model, firmware version, and OTA ID:

```sh
python3 scripts/import_firmware_keymap.py \
  --input extracted-rootfs/etc/palm/description.categorykeysmap.json \
  --image extracted-package/firmware.epk \
  --model OLED55B56LA.AEK --firmware 33.31.75 \
  --ota-id HE_DTV_W25H_AFADATAA \
  --output data/firmware-maps/oled55b56la-33.31.75.json
```

The importer hashes the supplied EPK and requires its SHA-256 to match the
catalog entry for the exact model, firmware, and OTA ID. It records a separate
hash for the key-registry file, drops preference values and unreviewed keys,
and labels the extraction relationship, physical validation, and setting
effects honestly. It does not accept LG defaults as current values. As of this
catalog snapshot, no additional B/C/G registry has been extracted from the
archive.

## Finding maps for other firmware builds

The exact category/key maps are installed with webOS at
`/etc/palm/description.categorykeysmap.json`; they are not published as one
complete, SKU-indexed LG catalog. The public reports we found either describe
that local path or publish selected keys from one rooted TV. LGPrivacyShield
reads the installed set's own index at first use and intersects it with its
reviewed, source-backed candidates. This avoids needing a prebuilt map for
every screen size and suffix while keeping undocumented keys out of the UI.

There is also an offline route for maintainers: LG support pages publish
firmware ZIPs and an applicable-model guide, and the community
[`epk2extract`](https://github.com/openlgtv/epk2extract) project supports LG
EPK and SquashFS extraction. Its documentation says encrypted EPK v2/v3 files
need AES/RSA keys obtained from a running TV. Newer webOS packages can place
rootfs inside `super.pak`; the community's
[`unpack-super` guide](https://github.com/openlgtv/epk2extract/pull/143)
describes using `dpmeta.pak` to locate and extract its SquashFS partitions.
LG's [C5 support page](https://www.lg.com/us/support/product/lg-OLED77C5PUA.AUS)
currently lists firmware 33.31.69 as a 1,779,109 KB ZIP, alongside its update
guide. That shows the build is available for analysis; it does not prove that
any extracted key is a privacy control or that the package covers every C5
regional suffix. Match the guide's applicable-model list before assigning an
extracted map to a SKU.

A byte-range probe on 2026-10-25 confirmed that the archive server allows
partial reads of the ZIP directory. The sampled C5 ZIP is 1,792,890,039 bytes
and contains one DEFLATE-compressed EPK of 1,810,190,512 bytes. No index for
seeking within that compressed EPK is published, so a small range can identify
the member but cannot extract its settings registry. Earlier full-download
attempts ran at roughly 20–50 kB/s, or about 10–25 hours per 1.8 GB package
before EPK decryption and rootfs extraction. No additional firmware registry
was produced in this pass.

The repository does not yet contain a second offline-extracted SKU map. The
C6H fixture is a direct read-only capture from the TV, while the B5, C5, and G5
overlays remain scoped to their cited reports. An extracted map can establish
that a firmware build registers a key and category. It cannot establish the
current value, a setting's effect, app permission, or successful write/readback
on a physical set. Those still come from live reads and verified changes on
that set.

## Shared map by installed webOS

Every supported platform profile includes these candidate settings:

| Control | SettingsService key |
|---|---|
| Live Plus | `option.livePlus` |
| Screen Saver Promotion | `general.screenSaverAd` |
| Home menu ads | `general.homePromotion` |
| Live Promotion | `option.livePromotion` |
| Home content recommendations | `other.contentRecommendation` |

The two Smart Tips keys are optional settings outside the privacy preset. Glasshouse maps both in its webOS 9.2 registry; its C2/webOS 22 sample fixture also lists them. LGPrivacyShield maps both on webOS 24 and for C2/webOS 22, and maps `general.aiNudge` for the exact B5 model/software row below. It does not infer that either key exists on every TV.

| Control | SettingsService key |
|---|---|
| Smart tips | `general.aiNudge` |
| Smart tips in Settings | `general.aiSettingsNudge` |

They are optional controls outside the privacy preset. The source describes prompts and does not establish an effect on data collection.

Additional settings are limited to the platform maps below:

| Installed webOS | Additional mapped controls | Candidate controls total |
|---|---|---:|
| 6.x | — | 5 |
| 22 | Limit Ad Tracking (`general.lmt`) | 6 |
| 22 on C2 | Smart tips and Smart tips in Settings | 8 |
| 23 | Limit Ad Tracking (`general.lmt`) | 6 |
| 24 | Limit Ad Tracking (`general.lmt`), Smart tips, Smart tips in Settings | 8 |
| 25 | Limit Ad Tracking (`general.lmt`) | 6 |
| 25 on C5 | Hands-free voice (`general.voiceLongDistance`); HbbTV third-party cookies (`option.thirdPartyCookie`) | 8 |
| 25 on `OLED55B56LA` / SDK 10.3.1 | Smart Tips (`general.aiNudge`), HbbTV (`option.hbbTV`, `option.hbbTvDnt`, `option.hbbTvDeviceId`) | 10 |
| 25 on `OLED65G5WUA` / webOS 10.2.1 | Smart Tips (`general.aiNudge`) | 7 |
| 26 | Limit Ad Tracking (`general.lmt`) | 6 controls |
| 26 on the exact C6H profile | C6H-specific candidate map before the device-local key filter | 15 |

These are candidate mappings. Some televisions do not expose every key. When available, the app first filters candidates through the TV's own firmware index, then requests each remaining key separately because webOS can reject a whole category request when one requested key is missing. It falls back to the allowlisted HBC snapshot where direct reads are denied. If the index is unavailable, it keeps the reviewed category and still tries only one key per call. A mapped control appears read-only when its current value cannot be read. The preset includes only mapped controls whose current values can be read.

## Coverage across B, C, and G families

| Model year | Launch platform | B | C | G |
|---|---:|---|---|---|
| 2021 | webOS 6.x | B1 family map | C1 family map | G1 family map |
| 2022 | webOS 22 | B2 family map | C2 family map | G2 family map |
| 2023 | webOS 23 | B3 family map | C3 family map | G3 family map |
| 2024 | webOS 24 | B4 family map | C4 family map | G4 family map |
| 2025 | webOS 25 | B5 family map + OLED55B56LA owner map | C5 family map + C5/SDK 10.3.1 controls | G5 family map + OLED65G5WUA owner map |
| 2026 | webOS 26 | B6 family map | C6 family map; exact C6H profile where matched | G6 family map |

An updated TV uses the profile for its installed webOS version, not its launch year. The profile IDs retain both cohort and platform, for example `lg-oled-b6-webos-26` and `lg-oled-c5-webos-25`.

The public catalog contains device rows for 13 of these 18 cohorts and a separate guide for each family. B1, B2, B3, B6, and G6 have no exact device row in the pinned app-test catalog. B5 has one owner-audited exact model row: `OLED55B56LA` (Germany), webOS 10.3.1; the firmware version is not published. G5 has an exact `OLED65G5WUA` root-guide row on webOS 10.2.1, also without a numeric firmware version. Its three added controls are source-mapped candidates. Five other named options remain research-only because the guide does not establish an app-side setter; LGPrivacyShield does not read or display them. Glasshouse separately lists G5 samples at firmware 33.30.69 and 43.21.71, but those rows do not report per-key privacy tests. None of these entries is a LGPrivacyShield physical-device test. The TV must return each current value, and changes require readback. Related device reports and their limits are listed in [COMMUNITY-EVIDENCE.md](COMMUNITY-EVIDENCE.md).

## Why these controls are mapped

- Glasshouse's pinned SettingsService registry defines the promotion keys, their categories, labels, and `on`/`off` values. It loads a row only when the TV reports that key; a B8-like unit test confirms that an absent key is omitted. The repository also has a C2/webOS 22 sample fixture, but the unit test does not load that fixture. The same source uses `option.livePlus` where the TV has that setting.
- Glasshouse records the `general.lmt` key and its value behavior on later firmware. Opt Out Of's model/platform guides list Limit AD Tracking on webOS 22–26; the exact C6H read also confirms the key on webOS 26. A pinned Glasshouse dashboard source adds a C2/webOS 9.2 root-side `general.lmt` write and ad-manager readback; its tested-TV table lists OLED42C24LA but does not link that exact row to the LMT code path. LGPrivacyShield uses that source on C2/webOS 22 and still requires a readable `on`/`off` value on the target TV. The webOS 6 `Advertisement` item remains separate because its manual describes a legacy frequency-capping cookie.
- Glasshouse's registry maps `general.aiNudge` and `general.aiSettingsNudge` to Smart Tips and Smart Tips in Settings, with `on`/`off` values. Its webOS 9.2 C2/webOS 22 fixture lists both, but the upstream unit test does not load that fixture. LGPrivacyShield uses that fixture only for the C2/webOS 22 overlay; it also maps both on webOS 24 and adds `aiNudge` for the exact `OLED55B56LA` / SDK 10.3.1 / webOS 25 and `OLED65G5WUA` / webOS 10.2.1 / webOS 25 rows. These prompt controls remain outside the recommended preset.
- The B5 owner's SettingsService script names the HbbTV controls as `option.hbbTV`, `option.hbbTvDnt`, and `option.hbbTvDeviceId`; the report records their HbbTV tracking rationale. LGPrivacyShield maps these only for the matching `OLED55B56LA` / SDK 10.3.1 profile. The separate `network.allowMobileDeviceAccess` finding is research only; turning it off did not close the local SSAP service.
- The B5 report names `adCookie`, `sportsAlarm`, and `webOSPromotionVideo` but does not publish their SettingsService categories. The report found the stored LG ad cookie remained after `adCookie` was switched off and that the sports-alert process continued running with its setting off; neither name is offered as a LGPrivacyShield control.
- The Level1Techs G5 guide names `general.aiNudge`, `general.screenSaverAd`, and `general.homePromotion` and writes them as off in a root script. The G5 overlay combines that exact-model key evidence with Glasshouse's common SettingsService key/value definitions, then still requires a live value and post-write readback on the TV. Its five other option keys are research only and are not read or displayed by LGPrivacyShield. The source writes cached EULA/consent records too; LGPrivacyShield leaves agreement changes to webOS's native flow.
- The webOS 26 `webos-debloat` report names `/etc/palm/description.categorykeysmap.json` as the device-local key/category index and `/etc/palm/defaultSettings.json` as the defaults file. Its one model-unassigned 2026 OLED report independently includes Live Plus, Home Promotion, Live Promotion, and Content Recommendation; it also names `general.sportsAlarm`, `option.webOSPromotionVideo`, and `option.promotionStreamer`. These latter keys remain research-only because their effects are not established. Its key list is one device's firmware evidence, not a model-assigned map.
- Glasshouse's C5/webOS 10.3.1 firmware research records `general.voiceLongDistance` and `option.thirdPartyCookie`, including the cookie value domain `on`, `off`, `onByUser`, and `offByUser`. Those controls are limited to C5 devices reporting SDK 10.3.1 / webOS 25. Four additional keys remain in source research and are not read by the app. The report does not publish the scanned set's exact model or firmware, so these are software-cohort findings, not exact-SKU validation. The cookie writer uses the TV's `onByUser`/`offByUser` values.
- `webos_lockout` names an exact `OLED77C51LA` on Rockhopper 10.3.1-3006 and its root boot script sets `option.usageCare`, `option.dbgLogUpload`, and `option.faultLogUpload` to false. The source does not publish the numeric firmware version or demonstrate a packaged-app SettingsService setter. The report's interpretation of `usageCare` conflicts with Glasshouse's Family Care menu finding, so the repository does not describe it as a proven collection control.
- Existing controls outside the platform, C5/C2, and B5 maps remain in the exact C6H profile only. Smart Tips are not in that exact profile because they were not read on the C6H tuple. Other controls are not enabled on a profile from a similar-looking key name.

Pinned sources and revisions are in the app's [community reference data](../webos-app/src/community-reference.js) and [public evidence catalog](COMMUNITY-EVIDENCE.md).

## Read, write, and permission behavior

1. The app identifies the model, SDK, firmware, and installed platform. It accepts only known B/C/G family codes and webOS versions.
2. It requests each mapped setting separately. Direct SettingsService reads are preferred; the local HBC snapshot is used when the TV denies direct reads.
3. A setting is enabled only when its value normalizes to `on` or `off` (including the documented HbbTV user-choice values).
4. The writer uses the mapped service route and value domain. If the current SettingsService URI is absent, it may try the legacy service URI; permission failures do not trigger that fallback.
5. The app reads the setting again after a change. A failed or mismatched readback is shown as an unconfirmed change.

The root-backed path requires the HBC `lunabus.query` permission map described in [BRIDGE-FIX.md](BRIDGE-FIX.md). LGPrivacyShield does not patch HBC itself. Where the bridge is unavailable and direct SettingsService access is denied, affected controls remain read-only.

## Emulation and validation

The headless emulator checks all 108 combinations of the 18 B/C/G families and installed webOS versions 6.x and 22–26. It covers SDK/browser-engine agreement, family and regional model parsing, readable and missing settings, direct API and HBC write denial, an acknowledged write that leaves the value unchanged, and normal readback. One missing key must not hide other settings, and controls outside a profile remain locked. The full cross-product is synthetic, including combinations that may not exist as real firmware upgrades; it validates selection logic, not per-model hardware or SettingsService behavior.

LG's official webOS Simulator can run platform versions 6.0 and 22–26. Its SettingsService implementation does not reproduce each OLED model's private settings schema, model code, firmware, or HBC permissions. It can check platform/API compatibility but cannot certify a B/C/G-specific map. Headless tests therefore validate LGPrivacyShield's profile selection and service behavior; they do not claim that every physical TV has accepted a write.

## Optional compatibility report

In **Controls**, choose **Prepare compatibility report** when the model/software is unmapped or a control cannot be read. The version 2 report contains the model, SDK, firmware, profile ID, map scope, API access state, and a boolean for whether each of the 17 controls was readable. It excludes setting values, agreements, serial/MAC/IP addresses, SSID, account data, app lists, process names, and network destinations. One QR code opens GitHub's form with the report included; submitting the form creates a public issue.

Use the report when the model or software is unmapped or a control remains unavailable. One QR code opens GitHub's form with the report included in the link. Submit the form to create a public issue for maintainers to review model coverage and read access.

Validate a saved report offline:

```sh
python3 scripts/validate_compatibility_report.py report.json
```

The strict [JSON Schema](compatibility-report.schema.json) and [example report](compatibility-report.example.json) are included in this repository.

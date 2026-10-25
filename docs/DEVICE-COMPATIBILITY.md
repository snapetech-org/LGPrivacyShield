# Device compatibility and PrivacyShield write support

PrivacyShield uses a separate settings map for each verified model/software cohort. The model badge alone does not establish that a control has the same label, key, values, side effects, or permission path on another TV. Public model rows, privacy findings, microphone evidence, and platform menu paths are aggregated in [Public LG model and privacy evidence](COMMUNITY-EVIDENCE.md). They inform users and map priorities, but never grant PrivacyShield write support.

## Coverage matrix

The target is the B, C, and G generation labels from 2021 through the current 2026 lineup. Model suffixes, sizes, regional availability, and firmware builds remain separate evidence fields.

| Model year | B series | C series | G series | Current PrivacyShield status |
|---|---|---|---|---|
| 2021 | B1 | C1 | G1 | Unmapped; read-only |
| 2022 | B2 | C2 | G2 | Unmapped; read-only |
| 2023 | B3 | C3 | G3 | Unmapped; read-only |
| 2024 | B4 | C4 | G4 | Unmapped; read-only |
| 2025 | B5 | C5 | G5 | Unmapped; read-only |
| 2026 | B6 | C6 | G6 | Only the exact C6 sample below is mapped; all others are unmapped |

LG's 2026 Canadian lineup identifies B6, C6, and G6, while its US lineup materials identify the C6 and G6 product families. Sizes and regional suffixes vary. Selected 2022 B2/C2/G2 sets can receive later webOS platform upgrades, so series year cannot substitute for the installed software version. [LG Canada 2026 lineup](https://www.lg.com/ca_en/buying-guides/2026-tv-lineup-guide-testpage/), [LG 2026 C6/G6 release](https://www.lg.com/us/press-release/lg-announces-rollout-of-2026-oled-tv-line-up-3-4.pdf), [LG webOS upgrade notice](https://www.lge.co.kr/support/solutions/20153367803808?category=CT50019021&cstFlag=Y&mktModelCd=OLED77B5HNA&page=0&seq=90&sort=update&subCategory=CT50019037)

## Aggregated community coverage

The current pinned sources contain 49 Glasshouse model/software rows, 10 CleanYourTV rows, and eight additional entries: two C1 network baselines, a G1 network audit, a G4 app test, a C5 root privacy audit, a model-unassigned webOS 26 settings map, a model-unassigned 2021 webOS 6 owner investigation, and static ACR analysis of LG firmware build 43.21.73. Twelve of the 18 B/C/G family labels have at least one matching entry. These sources provide real maps for unowned sets; they do not establish PrivacyShield permissions or enable a writer.

| Series | Glasshouse rows | CleanYourTV rows | Other evidence rows | PrivacyShield writes |
|---|---:|---:|---:|---|
| B1 | 0 | 0 | 0 | Locked |
| C1 | 2 | 0 | 2 | Locked |
| G1 | 0 | 1 | 1 | Locked |
| B2 | 0 | 0 | 0 | Locked |
| C2 | 2 | 0 | 0 | Locked |
| G2 | 1 | 1 | 0 | Locked |
| B3 | 0 | 0 | 0 | Locked |
| C3 | 3 | 0 | 0 | Locked |
| G3 | 1 | 0 | 0 | Locked |
| B4 | 1 | 0 | 0 | Locked |
| C4 | 4 | 0 | 0 | Locked |
| G4 | 2 | 0 | 1 | Locked |
| B5 | 0 | 0 | 0 | Locked |
| C5 | 3 | 1 | 1 | Locked |
| G5 | 2 | 0 | 0 | Locked |
| B6 | 0 | 0 | 0 | Locked |
| C6 | 1 | 0 | 0 | Exact C6H profile only |
| G6 | 0 | 0 | 0 | Locked |

The counts describe reports, not PrivacyShield setting validations; the C1/G1 network entries do not publish exact model codes. CleanYourTV's two unnamed firmware reports and the US 2026 webOS 26 settings map also remain unassigned to a family. The 2021 webOS 6 owner investigation omits the exact model, region, and firmware; the ACR firmware image omits the TV model and region. The C5 owner audit identifies its TV only as an OLED C5 running webOS 11, with no exact model, region, or firmware. The rows retain each source's model, region, firmware, method, and access limitations in [COMMUNITY-EVIDENCE.md](COMMUNITY-EVIDENCE.md). The app shows matching rows for the detected family, displays evidence with unpublished TV models separately, and keeps controls read-only outside the exact C6 profile.

### Registered profile

| Profile | Required identity | Map evidence | Sample count | Write behavior |
|---|---|---|---:|---|
| `lg-oled77c6hup-webos26-43.21.79` | Model `OLED77C6HUP`, SDK `11.2.0`, firmware `43.21.79` | Source-mapped on one C6 sample; all 15 values were read on the device | 1 | Controls can be attempted; TV readback is mandatory. App-side write/readback was previously confirmed for Live Plus and the two voice controls; the other 12 controls have headless simulation coverage, not a recorded live app write test. |

The exact Settings app bundle hash was not captured in the current investigation. The profile is therefore restricted to the exact model, SDK, and firmware tuple above. It does not cover a similarly named model, another screen size or region suffix, or a later firmware build. The local registry is `webos-app/src/compatibility.js`.

## Evidence levels

Evidence belongs to a specific control and exact device/software cohort. A model can have a source-mapped control and another control that remains unknown.

| Level | Evidence required | Enables writes? |
|---|---|---:|
| `reported` | Sanitized report or owner observation | No |
| `source-mapped` | The exact shipped Settings/First Use UI path, service method, key, values, and coupled actions have been traced | Yes, for that exact profile; readback is still mandatory |
| `device-read-verified` | The mapped state was read on a physical sample | Yes, while values remain readable |
| `write-readback-verified` | A controlled reversible app write and matching readback were verified on a sample | Yes |
| `cross-validated` | Independent devices in the same exact cohort reproduce the read/write behavior and documented effects | Yes |

The profile status describes the strongest overall mapping evidence; per-control evidence remains in the capability map and review notes. PrivacyShield does not promote `reported` evidence into an active profile. A successful UI click alone is not validation: the TV's readback must match the requested value. Headless tests simulate the service bridge and cannot prove that a specific TV firmware accepted a write. For the current profile, twelve controls have not yet had their app-side writes confirmed on the physical TV. A user-triggered, readback-confirmed change is device evidence, but it does not by itself cross-validate another unit or cohort.

## Rollout plan

Support is added per exact model/software cohort, not by enabling an entire B, C, or G generation at once. The first expansion candidates are 2026 B6 and G6, followed by the 2025 B5/C5/G5 cohorts, then older cohorts. This prioritizes current, obtainable sets and lets the C6 map serve as a comparison point. The order does not imply that settings behavior is shared within a year or series.

For each candidate cohort, the mapping record must include the complete model code and region, SDK version, firmware version, Settings/First Use app hashes, Homebrew version, and per-control evidence. If the UI bundle, service implementation, key, value domain, permission path, or side effect differs, create a separate profile. Firmware updates do not inherit the old profile automatically. A mismatch keeps every privacy switch read-only while still allowing a user to prepare a report.

The public LG Settings Service reference covers a small set of public keys, and Access Control Groups change by webOS release. It cannot supply the vendor-specific privacy schema by itself. Use it to confirm public API behavior and permissions, then trace the actual Settings/First Use UI and verify the resulting calls and values on the target firmware. [Settings Service reference](https://webostv.developer.lge.com/develop/references/settings-service), [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)

## How to map a new cohort

1. **Identify the exact set.** Record the full model code and region, model year, size, webOS SDK version, firmware version, and Homebrew version. Do not submit serial number, MAC/IP address, LG account, SSID, or a household name.
2. **Acquire the shipped UI evidence.** On a rooted owner-supplied sample or matching firmware image, identify the Settings and First Use app bundles and record local hashes. Keep LG binaries private; share hashes, relevant short excerpts, and analysis notes rather than redistributing bundles.
3. **Reverse-engineer and compare.** Use focused source inspection for JavaScript UI bundles and REA/Ghidra for native service binaries when needed. Compare the candidate call path against the C6 map; do not copy a key because its name looks familiar.
4. **Trace each candidate setting.** Follow its visible label/help text to the UI handler, Luna service and method, category/key, valid value domain, permission/ACG requirement, dependent writes, prompts, and feature effects. Treat agreements, app permissions, one-time reset actions, and hardware switches as separate kinds of control.
5. **Read before changing.** Capture only allowlisted setting state on the device. Confirm that PrivacyShield's app-context access can read it; root-shell access by itself does not establish app permission.
6. **Verify a reversible change.** First record the native menu behavior. Then test PrivacyShield's mapped writer, confirm the exact readback, verify persistence after a normal restart, and check the documented feature effect. Restore the original value. Do not test by accepting/withdrawing required agreements or editing cached consent.
7. **Compare independent owners.** A second device with the same model/region/software tuple should reproduce the map before it is labeled `cross-validated`. If artifacts differ, split the cohort.
8. **Review and add a profile.** A maintainer updates the compatibility registry, source map, tests, and this matrix in one change. Reports never change support on their own. A second independent device in the same exact cohort is needed for `cross-validated` status.

The public [Settings Service reference](https://webostv.developer.lge.com/develop/references/settings-service) documents a limited set of read keys, not the complete vendor settings schema. Access rules also depend on webOS release; the [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide) documents those version differences. The exact device's Settings/First Use artifacts and runtime behavior remain necessary.

## Community report

From **TV details**, choose **Prepare compatibility report**. PrivacyShield displays the JSON and attempts to copy it only after that action. The report contains:

- schema and PrivacyShield versions;
- model, SDK, and firmware versions;
- matched profile ID, evidence level, and sample count;
- whether system information, SettingsService, and the HBC snapshot were readable;
- a boolean for whether each known control key was readable.

It does not contain current setting values, agreements, serial/MAC/IP addresses, SSID, account data, app lists, process names, or network destinations. The report remains on the TV. PrivacyShield does not upload or send it anywhere. If clipboard access is unavailable, use the visible read-only report text; do not attach a screenshot containing private TV information.

Before sharing, run the report through the offline validator:

```sh
python3 scripts/validate_compatibility_report.py report.json
```

The strict [JSON Schema](compatibility-report.schema.json) and a matching [example report](compatibility-report.example.json) are included in this repo. The validator rejects unknown fields, duplicate JSON keys, setting/agreement payloads, and IP/MAC-shaped values. It never modifies the local profile map.

Paste only the validator-approved JSON into a compatibility issue. Add the menu path and a short observation in the issue form. Do not attach complete firmware or application bundles. A report can identify a candidate cohort and service-access problem; source tracing and physical read/write tests are still required for a supported profile.

The [public evidence catalog](COMMUNITY-EVIDENCE.md) records the exact public model/software rows and source revisions from CleanYourTV and Glasshouse, including each project's root access context and stated limitations. The [Fightback LG guide](https://github.com/dgomesbr/fightback-consumer-tv/blob/main/guides/vendors/lg-webos.md) also marks menu paths that need confirmation. These projects make the map substantially better than a family-name guess; the app still requires an exact PrivacyShield read/write/readback record before enabling that cohort.

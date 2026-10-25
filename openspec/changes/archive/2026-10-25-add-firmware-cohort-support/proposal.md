# Proposal

## Why

LGPrivacyShield currently presents the same setting map and write path on every LG webOS TV, although its reverse-engineered map is from one C6 firmware cohort. Model year, region, and webOS updates can change settings screens, keys, permissions, and hardware. Users need a clear compatibility status, and maintainers need reproducible device evidence before enabling controls on another cohort.

## What Changes

- Identify the TV using the model, webOS SDK version, and firmware version already returned by the system information API.
- Add a versioned compatibility registry with per-control mapping and evidence status. Match profiles exactly; unknown or mismatched devices remain read-only.
- Show the matched profile, its evidence level, and the reason controls are unavailable in the TV details view.
- Add an explicitly requested, local-only compatibility report containing only model/software identity, profile status, API-read availability, and per-control read availability. Exclude setting values, agreements, network identity, installed apps, and process lists. Do not upload it.
- Add an offline validator and maintainer workflow for community reports. Reports are evidence for review; they never enable controls automatically.
- Build a sourced public evidence catalog for B1–B6, C1–C6, and G1–G6: model-year cohorts, listed sizes, launch webOS versions, LG-documented menu paths, and exact community-tested TV/software rows. Preserve source, revision/date, access mode, and limitations; flag source inconsistencies instead of silently reconciling them.
- Attach each available model-family privacy guide to its cohort, and show the actual SettingsService category/key map selected for the installed platform plus any narrowly scoped model/software overlay. Keep model/menu evidence distinct from internal API-key evidence so no guide is presented as a private per-model key table.
- Include model-specific built-in microphone evidence as present, absent, conflicting, variant-limited, or unknown. Keep it separate from any physical switch or software voice control, and preserve region/SKU conflicts.
- Aggregate published privacy-control findings from rooted LG projects, firmware reverse engineering, and independent network audits, including Live Plus/ACR, ad tracking and identifier APIs, consent records, diagnostics, ad-service processes, resolver behavior, and reversible network mitigations. Record which exact model/software sample and privilege context support each claim, including when the model was not published. Separate firmware component presence, runtime activation, and network transmission.
- Show applicable community evidence and a read-only, installed-platform menu reference in the app. These references never imply current state, matching Luna keys, API permission, or LGPrivacyShield physical write testing.
- Use manually reviewed public SettingsService maps to define platform and exact-model overlays for other supported TVs. Keep the C6H exact-firmware profile separate; enable a mapped switch only when that TV returns a recognized value, and report success only after readback.
- When available, read the TV's own firmware category/key index to filter reviewed candidates and obtain exact categories for that firmware. Keep missing or ambiguous keys unavailable; do not treat the index or firmware defaults as proof of a setting's current value, effect, or write behavior.
- Add headless tests for exact matching, firmware mismatch, unsupported models, read-only behavior, report minimization, report validation, community-catalog completeness, platform detection, menu-path rendering, and the absence of writes for unmapped controls.
- Add optional controls only where a source maps the setting key, value domain, effect, and software scope; do not include those controls in the recommended preset without a separate privacy rationale.

## Capabilities

### New Capabilities

- `device-compatibility`: identify a TV firmware cohort and gate controls on an exact, evidence-backed profile.
- `compatibility-reports`: create and validate a sanitized, user-initiated device compatibility report without network submission.

### Modified Capabilities

None.

## Impact

Affected areas include `webos-app/src/app.js`, `webos-app/src/privacy-model.js`, the TV details view and styles, the compatibility registry and its scoped source maps, a separately typed community-reference catalog, headless and unit tests, offline report validation tooling, package contents, and compatibility documentation. The feature does not require new Luna permissions or server infrastructure. Evidence collection does not change TV settings; user-selected controls still follow their reviewed map and require on-device readback.

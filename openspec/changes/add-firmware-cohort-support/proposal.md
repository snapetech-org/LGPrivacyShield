# Proposal

## Why

PrivacyShield currently presents the same setting map and write path on every LG webOS TV, although its reverse-engineered map is from one C6 firmware cohort. Model year, region, and webOS updates can change settings screens, keys, permissions, and hardware. Users need a clear compatibility status, and maintainers need reproducible device evidence before enabling controls on another cohort.

## What Changes

- Identify the TV using the model, webOS SDK version, and firmware version already returned by the system information API.
- Add a versioned compatibility registry with per-control mapping and evidence status. Match profiles exactly; unknown or mismatched devices remain read-only.
- Show the matched profile, its evidence level, and the reason controls are unavailable in the TV details view.
- Add an explicitly requested, local-only compatibility report containing only model/software identity, profile status, API-read availability, and per-control read availability. Exclude setting values, agreements, network identity, installed apps, and process lists. Do not upload it.
- Add an offline validator and maintainer workflow for community reports. Reports are evidence for review; they never enable controls automatically.
- Build a sourced public evidence catalog for B1–B6, C1–C6, and G1–G6: model-year cohorts, listed sizes, launch webOS versions, LG-documented menu paths, and exact community-tested TV/software rows. Preserve source, revision/date, access mode, and limitations; flag source inconsistencies instead of silently reconciling them.
- Include model-specific built-in microphone evidence as present, absent, conflicting, variant-limited, or unknown. Keep it separate from any physical switch or software voice control, and preserve region/SKU conflicts.
- Aggregate published privacy-control findings from rooted LG projects, firmware reverse engineering, and independent network audits, including Live Plus/ACR, ad tracking and identifier APIs, consent records, diagnostics, ad-service processes, resolver behavior, and reversible network mitigations. Record which exact model/software sample and privilege context support each claim, including when the model was not published. Separate firmware component presence, runtime activation, and network transmission.
- Show applicable community evidence and a read-only, installed-platform menu reference in the app. These references provide useful guidance on unowned TVs but never imply current state, matching Luna keys, API permission, or PrivacyShield write support.
- Keep the existing exact C6 cohort as the only mapped writable cohort until PrivacyShield itself has per-control readback evidence for another exact model/software tuple.
- Add headless tests for exact matching, firmware mismatch, unsupported models, read-only behavior, report minimization, report validation, community-catalog completeness, platform detection, menu-path rendering, and the absence of writes on unverified cohorts.

## Capabilities

### New Capabilities

- `device-compatibility`: identify a TV firmware cohort and gate controls on an exact, evidence-backed profile.
- `compatibility-reports`: create and validate a sanitized, user-initiated device compatibility report without network submission.

### Modified Capabilities

None.

## Impact

Affected areas include `webos-app/src/app.js`, `webos-app/src/privacy-model.js`, the TV details view and styles, the exact compatibility registry, a separately typed community-reference catalog, headless and unit tests, offline report validation tooling, package contents, and compatibility documentation. The feature does not require new Luna permissions, server infrastructure, or changes to TV settings during collection. Public reports can guide an owner or maintainer on another model, but the existing C6 map remains the only profile that can unlock writes until PrivacyShield has reviewed exact-cohort evidence.

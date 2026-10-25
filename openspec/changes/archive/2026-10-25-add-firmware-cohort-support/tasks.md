# Tasks

## 1. Compatibility profile and evidence map

- [x] 1.1 Add an exact-match profile module for the C6 model/software tuple and per-control mapping status; verify exact match, missing identity, firmware mismatch, and model mismatch with unit tests.
- [x] 1.2 Update the capability map with evidence grades and a B1–B6/C1–C6/G1–G6 matrix; distinguish the exact C6 device profile, source-mapped platform candidates, and physical-validation gaps.

## 2. Fail-closed UI and write path

- [x] 2.1 Gate individual controls, preset, and restore through the matched profile; verify unknown, mismatched, and unreadable values cannot reach any writer.
- [x] 2.2 Add compatibility state to TV details and lock controls visibly on an unmapped model; verify D-pad navigation, readable-state behavior, and C6 writes in headless Chromium.

## 3. Local compatibility report

- [x] 3.1 Implement the report allowlist and user-triggered single-QR GitHub form link; verify the generated JSON contains no settings/agreement values or device/network identifiers and the URL pre-fills the report field.
- [x] 3.2 Document report fields and the QR submission flow; verify the published example matches the generated schema.

## 4. Community validation workflow

- [x] 4.1 Add the offline report validator and tests for valid, malformed, unknown-field, and prohibited-identifier reports; verify it prints a summary without changing profiles.
- [x] 4.2 Document evidence grades, the per-cohort reverse-engineering checklist, report contribution steps, and source/community references; mark untested B/C/G devices as not physically validated and keep unsupported controls locked.

## 5. Integrated verification and package

- [x] 5.1 Run OpenSpec validation and the full automated suite; verify all tests pass.
- [x] 5.2 Build the installable IPK and audit its contents and manifest; verify new modules and UI assets are packaged, the manifest matches, and no Homebrew submission or TV launch occurred.

## 6. Public model and community evidence

- [x] 6.1 Add a sourced catalog for all 18 B1–B6, C1–C6, and G1–G6 cohorts with source-listed model sizes, launch year, launch webOS platform, and microphone evidence/scope; label regional variants and unknown/conflicting cases.
- [x] 6.2 Import the canonical Glasshouse tested-TV rows, reported webOS/firmware values, and notes at a pinned revision; preserve and test the 48-declared-versus-49-listed count discrepancy.
- [x] 6.3 Import the CleanYourTV tested-device table at a pinned revision and record that it uses root service/boot integration rather than LGPrivacyShield's packaged-app bridge.
- [x] 6.4 Map published Glasshouse privacy findings to their source files and methods: Live Plus, ACR state and query side effects, LMT/readback, advertising-ID operations, consent-record effects, firmware settings readers, and the C5 physical mic switch. Record missing model scope as unknown.
- [x] 6.5 Record CleanYourTV's reported ad/telemetry service actions as root-level service observations, not SettingsService mappings or LGPrivacyShield-supported controls.

## 7. Runtime menu references and app presentation

- [x] 7.1 Add a separate community-reference module with the 18 model cohorts, source-scoped sample records, official platform-to-browser-engine mapping, and documented menu paths for webOS 6, 22, 23, 24, 25, and 26.
- [x] 7.2 Detect model family only from an explicit supported model-code token and platform only when the SDK major agrees with a `Web0S` user agent and allowlisted engine version; unknown or conflicting input produces no inferred menu map.
- [x] 7.3 Show matching community observations, published microphone and control evidence, and installed-platform menu references in the compatibility panel, with a plain statement that these do not read current state or enable writes. Keep controls, preset, restore, exact profile matching, and agreement behavior unchanged.
- [x] 7.4 Add unit coverage for all cohorts and model samples, the source discrepancy, each platform menu map, platform/family parsing, and exact C6-only write-profile resolution.
- [x] 7.5 Add headless Chromium coverage for unverified B/C/G devices across multiple platforms; assert references render, controls/preset/restore remain locked, and no setting writer is called.

## 8. Documentation and final verification

- [x] 8.1 Document each source, revision/date, evidence type, privilege context, tested model/software row, menu path scope, control/API mapping, and the remaining unknowns. Update README wording so it distinguishes public evidence coverage from LGPrivacyShield write support.
- [x] 8.2 Run OpenSpec validation and the full Node/Python/headless suite; confirm the existing exact C6 path still works and unsupported identities never write.
- [x] 8.3 Build the versioned installable IPK, verify its manifest and package contents include the reference module, and report that no TV launch or Homebrew publication occurred.

## 9. Consolidate current community evidence

- [x] 9.1 Replace the stale Glasshouse fork snapshot with the canonical upstream revision; import every exact model/software report row, preserve the 48-declared-versus-49-listed discrepancy, and check the C6 sample against the local C6H tuple.
- [x] 9.2 Import the complete CleanYourTV tested-device table and add separately scoped Glasshouse privacy research, C1 network baseline, and published ACR-study evidence; record model scope, access context, and unverified fields for each.
- [x] 9.3 Add a separate physical microphone-switch evidence map and expand the control findings for consent effects, privacy keys, ACR status-call behavior, and root-only microphone mitigations without changing the LGPrivacyShield write registry.
- [x] 9.4 Update the TV details view, evidence documentation, contributor issue form, and compatibility matrix so owners can inspect the merged references and contributors can submit per-control evidence without current setting values.
- [x] 9.5 Add source-scope/fail-closed tests, run OpenSpec and the full unit/headless/IPK checks once, and build the next local IPK without installing, launching, or publishing it.

## 10. Extend the community evidence catalog

- [x] 10.1 Add model-scoped samples for the G4 privacy app, G1 DNS/packet audit, and independent C1 DNS/SNI capture, retaining exact model, region, software, method, sample count, and missing fields.
- [x] 10.2 Add the model-unreported webOS 26 settings/service map as global evidence without assigning it to C6 or another family; expose its exact candidate keys and restoration behavior in the read-only findings view.
- [x] 10.3 Add pinned source metadata, license/attribution details, feature-impact notes, and source-review decisions for overlapping or unscoped projects.
- [x] 10.4 Update cohort counts and headless/unit coverage for new evidence while asserting that no community sample changes the exact C6 write profile or enables a writer.
- [x] 10.5 Revalidate OpenSpec, run the full local suite once, rebuild the local IPK, and audit its manifest and contents. Do not install, launch, or publish it.
- [x] 10.6 Add pinned LG firmware ACR analysis as model-unassigned evidence and distinguish component/path presence from runtime activation and observed transmission in the app and documentation.
- [x] 10.7 Add the C5 owner privacy audit and boot hook with model/software limits, agreement-state observations, microphone-path details, and firmware-update impact.

## 11. Integrate model guides and expand source-backed keys

- [x] 11.1 Add direct links and scope notes for every available B1–B6, C1–C6, and G1–G6 privacy guide; explicitly exclude the C6H variant from the standard C6 guide's microphone claim.
- [x] 11.2 Show the selected profile's actual SettingsService category/key entries and their map sources in the app, separate from model-family menu and hardware evidence.
- [x] 11.3 Add webOS 22–26 Limit AD Tracking, C2/webOS 22 and webOS 24 Smart Tips, the OLED55B56LA B5/SDK 10.3.1 overlay, and read-only status for unverified promotion keys.
- [x] 11.4 Extend unit/headless tests, documentation, compatibility reports, and package version for the expanded map; run the full suite and package checks without launching a TV app or publishing.
- [x] 11.5 Add the Glasshouse dashboard's C2/webOS 9.2 `general.lmt` route as cohort-scoped evidence; preserve the missing exact-SKU correlation and test its map label without broadening exact-model write support.
- [x] 11.6 Add the exact `OLED65G5WUA` / webOS 10.2.1 preference-key report; limit the control overlay to three general keys, display five option keys read-only, preserve native consent handling, and verify direct plus HBC-fallback behavior in headless tests.

## 12. Use the TV-local firmware key index

- [x] 12.1 Research the firmware-local category/key index, capture the current C6 index read-only, and preserve only an allowlisted test fixture with exact model/software/hash provenance.
- [x] 12.2 Filter the root snapshot to reviewed keys present in the local index, use indexed categories for reads and writes, and fail closed for absent or ambiguous keys; keep the static reviewed map as fallback only when the firmware index is unavailable.
- [x] 12.3 Show per-device key-index availability in TV details without implying that key presence proves current value, privacy effect, or write success; never use firmware defaults as current state.
- [x] 12.4 Test exact C6H key presence, absent hbbTvDnt behavior, category selection, no-read/no-write behavior for omitted keys, and index-unavailable fallback in Python and headless browser fixtures.
- [x] 12.5 Backfill compatibility, research, and evidence docs with the exact C6H index result and the remaining SKU/semantic-validation gap; preserve the distinction between the synthetic 108-profile matrix and physical-device validation.
- [x] 12.6 Run the full unit/headless suite, OpenSpec validation, IPK build and audit; keep the TV app closed and do not publish to Homebrew.

## 13. Index and import model-specific firmware key registries

- [x] 13.1 Parse the EPK Firmware Archive index into checksummed B/C/G package records; preserve exact model names, OTA IDs, firmware versions, and regional variants without claiming that the archive index contains key maps.
- [x] 13.2 Include B1's `W21U` package family, verify all 18 B/C/G cohorts have package records, and connect the exact C6H model/software tuple to its indexed archive package.
- [x] 13.3 Add a deterministic importer for extracted `description.categorykeysmap.json` files that requires an exact model/firmware/OTA match plus the matching EPK SHA-256, drops values and unreviewed keys, and records that the extraction relationship was not independently reproduced.
- [x] 13.4 Show archive package matches in TV details as firmware identity evidence only; do not use archive metadata to add or enable a setting.
- [x] 13.5 Run unit, Python, headless, and IPK tests; review the final package and OpenSpec status without opening the TV app or publishing to Homebrew.

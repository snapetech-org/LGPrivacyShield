# Design

## Context

See `proposal.md` for motivation and the two capability deltas for user-facing behavior. The existing app already reads model name, SDK version, and firmware version, and it has a C6-only map in `docs/TV-PRIVACY-CAPABILITY-MAP.md`. The controls currently operate from a global list and can appear writable on any model. Only one C6 device is available in this work session; its exact Settings bundle was not available for a new hash capture, and no B- or G-series unit is available for physical validation.

## Goals / Non-Goals

**Goals:**

- Turn the existing C6 map into an explicit, exact-match profile.
- Require a profile before enabling settings writes or presets.
- Give owners a simple, private way to report model/software and API-read availability.
- Make compatibility additions reviewable from source evidence and device observations.
- Provide a coverage matrix for B1–B6, C1–C6, and G1–G6 without claiming support for unseen cohorts.
- Aggregate public LG documentation and community observations to describe unowned models from published evidence rather than inferring their settings from the C6.
- Show documented menu locations for the TV's detected webOS platform, with the evidence type and limits visible.

**Non-Goals:**

- Guess settings mappings from the product family name or a community post.
- Automatically install a profile from a report or fetch profiles from a server.
- Collect or submit setting values, agreements, serials, network identifiers, installed-app inventories, or packet data in compatibility reports.
- Enable writes on firmware that has not been mapped, or alter consent/EULA records.
- Claim cross-device validation when evidence is from one set.
- Treat a rooted project's root-level/server behavior as proof of equivalent API permissions or write behavior in PrivacyShield's packaged app.
- Present a community-tested model, family, or platform menu path as a PrivacyShield-supported write profile.

## Decisions

### Exact identity and profile matching

Add `webos-app/src/compatibility.js` as the single profile registry and matching/report module. A profile declares exact model aliases, `sdkVersion`, and `firmwareVersion`, a stable profile ID, sample count, evidence level, and mapped control keys. Matching is case-normalized and whitespace-trimmed, with no substring or family fallback. The first profile is `OLED77C6HUP`, SDK `11.2.0`, firmware `43.21.79`; it records a single source-mapped sample. B-series, other C-series, G-series, regional variants, and other firmware builds remain unregistered.

An exact firmware match is intentionally strict. An OTA can change settings behavior without changing the marketing model name. A later firmware is read-only until a maintainer reviews it and adds or widens a profile with evidence. Shared profiles may be widened only after the relevant installed Settings/First Use behavior and service permissions match; matching model family alone is insufficient.

### Write gate

Keep the existing control definitions and writers. The matched profile determines whether each control is mapped. `setControl`, `applyOne`, preset application, and restore all use the same gate. A value can be read for diagnosis on any TV, but values from an unmapped profile are not presented as an on/off state. The controls remain visible as read-only with a clear profile message. The preset and restore actions are unavailable until the current profile and all required values are verified. After any permitted write, the current TV readback remains the success condition.

### Evidence grades

Use these registry statuses:

- `reported`: sanitized community report only; no mapping is enabled.
- `source-mapped`: exact shipped UI/handler/service path has been traced.
- `device-read-verified`: the key and value were observed on a physical sample.
- `write-readback-verified`: a controlled app write and readback were confirmed on a sample.
- `cross-validated`: another independent device in the same exact cohort reproduced the mapped read and write behavior.

The C6 profile is recorded as `source-mapped`, with one sample. Per-control live write evidence remains explicitly recorded in the capability map. The UI must not call the profile cross-validated. Future entries use the highest completed grade and list their device count and evidence references.

### Public evidence catalog and evidence scope

Keep three independent evidence dimensions rather than compressing unrelated facts into one confidence label:

1. **Product and menu documentation:** LG manuals and official developer references establish documented menu paths, API contracts, and platform/browser versions. A documented path establishes where an option is described, not whether a particular TV has it or what value it currently holds.
2. **Community device observations:** record the exact model, reported webOS version, firmware when supplied, project/revision, and execution context for each public test. The canonical Glasshouse upstream says 48 TVs across 33 series while its pinned all-reports table has 49 rows; retain both counts. Its tested C6 row is `OLED55C61LA`, SDK 11.2.0, firmware 43.21.79, but notes only screen-saver and remote-key results; it is a different regional/size variant from `OLED77C6HUP`. Glasshouse's server and helper use root access, so those results do not prove calls from PrivacyShield's app/ACG context. CleanYourTV's full table separates one maintainer-tested set from owner reports and shows model year can differ from installed webOS.
3. **PrivacyShield device verification:** only exact-cohort reads, controlled writes, and matching readbacks performed by PrivacyShield can advance this project's writable profile. Other projects' code and user reports do not do so automatically.

The public catalog covers all 18 target series labels B1–B6, C1–C6, and G1–G6, with the sizes and launch platform listed by the cited model catalog. Treat those sizes as source-listed entries, not a guarantee of every regional SKU. Store the source URL and retrieval/revision date for each family, test row, menu map, microphone finding, and control finding. Preserve uncertain, partial, and conflicting source claims as such. Built-in mic presence is a hardware-capability claim, not evidence of a physical disconnect switch, its state, or the behavior of a software voice toggle. Mark the 2026 C6 standard variant separately from C6H 77/83 variants; the standard C6 source does not establish the C6H hardware state. Keep conflicting C5 region documents unresolved in the app.

For community privacy findings, capture the code/document reference, device scope, and access layer. The pinned Glasshouse research includes C5/CX consent dependencies, C5 setting-reader notes and a reported C5 microphone switch, plus a CX ACR status-call side effect. A separate C5 owner audit reports agreement-state persistence after Live Plus was disabled, logged/network observations, voice-path results, a second microphone-switch method, and a boot hook that blocks firmware-update hosts. CleanYourTV documents root service actions; webOS Unclutter and an independent packet-capture report describe European C1 network behavior; a G1 audit publishes a two-week DNS/packet dataset and tiered blocklist; a G4 privacy app publishes its exact tested model/software tuple; and a webOS 26 debloat script maps promotion and ACR setting keys while withholding its exact model code. Separate unassigned sources document a 2021 webOS 6 owner investigation, a candidate mobile-device-access setting, and static ACR service/startup evidence from an LG 43.21.73 firmware image. The firmware map distinguishes component/path presence from runtime activation and observed transmission. own-your-glass describes root-only ALSA and remote-voice paths on an OLED with no exact model code; the IMC 2024 paper reports controlled LG ACR network behavior without a B/C/G series map. These provide control and behavior maps that go well beyond a family-name guess, but they do not prove identical key semantics, consent effects, feature impacts, or packaged-app permissions on every B/C/G model. Keep opposing network observations tied to their region, firmware, settings, capture method, and sample count.

### Installed-platform menu reference

Keep the community catalog in a separate browser module from `compatibility.js`. Identify a model family only from an explicit B/C/G1–G6 token in the model string. Identify installed webOS only when the TV-reported SDK major agrees with a strict allowlist of the `Web0S` user-agent token and Chromium engine major versions published by LG (for example, Chromium 132 + SDK 11 → webOS 26, 120 + SDK 10 → 25, 108 + SDK 9 → 24, 94 + SDK 8 → 23, 87 + SDK 7 → 22, and 79 + SDK 6 → 6.x). An absent signal, unlisted engine, or disagreement returns unknown and shows no path. Do not infer installed webOS from the model's launch year or SDK prefix alone.

The UI may show the model-family launch information, relevant public community sample rows, and documented menu locations for the detected platform. It must say these are references: they neither read the current option nor establish a PrivacyShield key/write mapping. They must not make controls, presets, or restore writable. The C6 profile matcher remains unchanged and exact.

Menu records are per software platform, not per television family. Current documented entries cover Live Plus, User Agreements, Home Promotion, Content Recommendation where documented, Live Promotion where documented, Screen Saver Promotion where documented, and Limit AD Tracking where documented. On webOS 6.0, label the separate `Advertisement` item as the legacy frequency-capping-cookie setting; the manual does not call it Limit AD Tracking. Do not invent an option for a platform where the cited source does not list it. The cited webOS 22/23 Limit AD Tracking path is under General → System → Additional Settings → Advertisement, not Support.

### Sanitized report and local export

The compatibility view adds a user-activated report action. `compatibility.js` builds an allowlisted JSON object containing schema/app versions, model, SDK, firmware, profile ID/evidence level, service-access outcomes, and booleans for whether each known control key was readable. It never includes values. It has no network code. The report is copied only after a button press; if clipboard access is unavailable, a read-only text area exposes the exact JSON for manual retrieval. Copy failure is shown honestly.

Add a dependency-free Python validator for the published schema. It validates types, enum values, known control keys, and exact top-level/nested properties; unexpected fields are rejected. It prints only a short valid-cohort summary and never edits the profile registry. Documentation directs users to remove any identifiers before sharing and maintainers to treat reports as leads.

### TV details and remote use

Place compatibility status in the existing TV details view, not a new tab. Show the matched model/software cohort, evidence grade and sample count, mapped-control count, read-only/write-enabled state, and a short reason. Keep the report action keyboard/remote accessible and provide visible focus. The unknown-device state must not look like a broken or frozen screen.

### Validation and rollout

Use unit tests for profile match/mismatch, per-control gating, report allowlisting, report schema validation, all 18 catalog cohorts, community sample rows/counts, strict platform detection, and menu-path differences. Extend headless Chromium scenarios for C6 and unverified B/C/G candidates; assert menu/community references render while settings, preset, and restore stay read-only and no writer is called. Keep the C6 write scenario intact. Run the full headless and Python/Node suite, OpenSpec validation, package verification, and inspect the IPK contents. Do not launch the TV app or publish to Homebrew. The installed C6 remains the only PrivacyShield physical sample; other projects' evidence is labeled with its own scope and no B/G PrivacyShield behavior is inferred from headless tests.

## Risks / Trade-offs

- **[Strict matching locks a TV after an OTA]** → Show its observed identity and a useful read-only explanation; allow maintainers to add a reviewed profile for the new build.
- **[A model string varies by region or API version]** → Add an explicit alias only after corroborating it from a device report and official/system evidence; do not add fuzzy matching.
- **[Clipboard APIs vary on webOS]** → Provide a visible read-only fallback and test both copy success and failure headlessly.
- **[Community reports may contain private identifiers]** → Generate only allowlisted fields, reject extras offline, show the exact report before copy, and never auto-submit.
- **[A source-mapped key may still behave differently at runtime]** → Require readback for every success, track write evidence per control, and preserve a per-profile read-only fallback.
- **[One device cannot establish cross-unit behavior]** → Label the C6 profile as one sample and reserve `cross-validated` for independent reproduction.

## Migration Plan

1. Add the compatibility module and C6 profile, then connect profile resolution to the current system-information read.
2. Apply the profile write gate consistently and add the compatibility panel/report action.
3. Add the report validator, contributor instructions, and B/C/G coverage matrix.
4. Run the complete headless/unit/package checks and review package contents. Keep the TV untouched and leave Homebrew submission for maintainer sign-off.
5. Roll back by reverting the profile gate and report UI/module together; existing preference values and TV state are not migrated or rewritten.

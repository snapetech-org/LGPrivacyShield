# Spec Delta

## Purpose

Identifies the exact TV software cohort for which LGPrivacyShield has an evidence-backed settings map, then limits controls to that map.

## ADDED Requirements

### Requirement: Select only a scope-correct reviewed settings map
The system MUST select the narrowest manually reviewed map supported by the available device identity. An exact device profile MUST match its declared model, SDK, firmware, and platform. A shared platform map MUST require an explicitly supported B/C/G model code and an installed webOS platform identified by the SDK/browser-engine agreement. A model overlay MUST match every model and software field published by its source; any unpublished identity field MUST remain visible as a limitation.

#### Scenario: Exact device profile match
- **WHEN** all required model, SDK, firmware, and platform fields match an exact device profile
- **THEN** the app identifies that profile and its device evidence status

#### Scenario: Shared platform map match
- **WHEN** the TV has a supported B/C/G model code and its SDK agrees with the detected installed webOS platform
- **THEN** the app selects that platform map, marks its keys as candidates, and still requires a readable value from the current TV

#### Scenario: Exact model/software overlay match
- **WHEN** every model and software field published for a reviewed overlay matches the current TV
- **THEN** the app adds only that overlay's controls and displays any missing source identity, such as an unpublished firmware version

#### Scenario: Unknown model or platform signal
- **WHEN** model identity is missing/unsupported or the SDK and browser-engine platform do not agree
- **THEN** the app selects no settings map and keeps all controls read-only

#### Scenario: Exact profile firmware mismatch
- **WHEN** firmware differs from an exact device/firmware profile but the TV matches a separately reviewed platform map
- **THEN** the exact profile does not match and only the narrower platform map may apply

### Requirement: Restrict writes to mapped controls
The system MUST enable a setting write only when the current device matches a profile that maps that control and the current value is readable. An unmapped control MUST remain read-only.

#### Scenario: Mapped control with readable value
- **WHEN** a control is mapped for the exact profile and its current value is known
- **THEN** the user can change it and LGPrivacyShield reports success only after TV readback matches

#### Scenario: Unmapped control or unreadable value
- **WHEN** a profile does not map a control or the current value cannot be read
- **THEN** the app shows the control as read-only or unavailable and blocks the write and preset action

### Requirement: Constrain candidate settings with the TV's firmware key index
When readable, the TV's firmware key index MUST filter reviewed candidates and supply the category for reads and writes. Missing or multiply categorized keys MUST remain unavailable. If the index cannot be read, the app MAY use the reviewed profile's category and make a one-key live read.

#### Scenario: Firmware index confirms a reviewed key
- **WHEN** a reviewed profile maps a key and the local firmware index lists it in one category
- **THEN** the app requests that key from the indexed category and still requires a recognized current value before enabling a write

#### Scenario: Firmware index omits a reviewed candidate
- **WHEN** a profile maps a candidate but the readable firmware index omits that key
- **THEN** the app shows it as unavailable and makes no read or write request for it

#### Scenario: Firmware index assigns conflicting categories
- **WHEN** the same reviewed key appears in more than one category
- **THEN** the app keeps that key unavailable and makes no read or write request for it

#### Scenario: Firmware index is unavailable
- **WHEN** the file cannot be read or parsed
- **THEN** the app keeps the manually reviewed category, checks the key individually through the live service, and still requires current-value readback


### Requirement: Treat firmware metadata as presence evidence only
The firmware key index MUST NOT add controls or establish privacy effect, current value, or write behavior. Default-value files MUST NOT be treated as current state.

#### Scenario: Defaults file contains a candidate value
- **WHEN** the defaults file contains a value for a reviewed key
- **THEN** the app does not report that value as the TV's current setting

### Requirement: Explain compatibility status
The system MUST show the matched profile, evidence level, and control availability in the TV details view. An unknown profile MUST explain that controls are read-only because its settings map has not been validated.

#### Scenario: Mapped device status
- **WHEN** a registered profile matches
- **THEN** the TV details view identifies the profile and states the sample and validation level recorded for it

#### Scenario: Unmapped device status
- **WHEN** no profile matches
- **THEN** the TV details view identifies the model and software versions and explains why changes are locked

### Requirement: Preserve public evidence scope
The system MUST maintain public evidence for the B1–B6, C1–C6, and G1–G6 series. Each entry MUST retain its source revision, evidence kind, exact model/software/firmware scope where available, and privilege/access context.

#### Scenario: Community evidence is shown for an unmapped TV
- **WHEN** a TV matches a family with public community observations but no exact LGPrivacyShield profile
- **THEN** the app shows the matching family and relevant public evidence while settings remain read-only and unwritable

### Requirement: Review public evidence before adding a settings map
The system MUST keep source records separate from the manually reviewed compatibility registry. A public finding or report MUST NOT change the registry automatically. A manually reviewed SettingsService map MAY define a source-mapped platform or model overlay, but MUST retain its original scope and MUST NOT claim LGPrivacyShield physical validation.

#### Scenario: A community-tested model has no model-specific LGPrivacyShield overlay
- **WHEN** a TV matches a model family with public observations but no reviewed model-specific overlay
- **THEN** no model-only controls are added; separately reviewed platform maps may still enable their own readable candidate keys

#### Scenario: Maintainer reviews a model-specific SettingsService map
- **WHEN** a maintainer verifies the source scope, category/key, value domain, and effect and adds a model/software overlay
- **THEN** only that overlay's controls are eligible, remain labeled source-mapped, and require live readback for each change

#### Scenario: A public report matches software but not the model variant
- **WHEN** a community row has the same SDK and firmware but a different size or regional model code
- **THEN** the app shows it as a comparison row and does not treat it as an exact LGPrivacyShield profile

#### Scenario: A root preference script does not establish an app setter
- **WHEN** a model-specific source writes a key directly to a preference file but does not document the SettingsService category, app access, or readback
- **THEN** the app may show an allowlisted current value as read-only status, but MUST NOT enable a write from that evidence alone

#### Scenario: A community source has conflicting or incomplete metadata
- **WHEN** a source's declared device count disagrees with its tested-model table, or a row omits firmware, model code, or reports partial behavior
- **THEN** the catalog preserves the reported values and marks the discrepancy or missing/partial field instead of silently correcting or generalizing it

#### Scenario: Microphone evidence varies by model variant or region
- **WHEN** a source covers only one size/region, fails to establish microphone presence, or conflicts with another model-specific source
- **THEN** the app labels the evidence variant-limited, unknown, or conflicting and does not claim a physical switch, switch state, or software disconnection

#### Scenario: A physical microphone switch is reported on a different cohort
- **WHEN** a public source describes a physical switch on a C5 but the current TV is a C6/C6H
- **THEN** the app shows the C5 result as a separate cohort finding and leaves the current TV's physical switch state unknown

### Requirement: Show menu references only for a detected platform
The system MUST show documented menu paths only when the installed webOS platform is identified from a supported exact runtime signal. Menu paths MUST be labeled as documentation references and MUST NOT expose or imply the current value, a Luna setting key, or LGPrivacyShield write availability.

#### Scenario: A supported platform is detected
- **WHEN** the app runs on a webOS platform matched by the official browser-engine table
- **THEN** the compatibility view lists only menu entries documented for that platform and states that current state is not read by the reference

#### Scenario: The platform signal is absent or unknown
- **WHEN** the browser user agent is not a webOS user agent or contains an unlisted engine major
- **THEN** the app shows no inferred platform menu map and does not substitute the model's launch-year platform

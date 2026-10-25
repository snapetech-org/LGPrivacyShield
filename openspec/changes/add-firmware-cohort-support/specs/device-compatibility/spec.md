# Spec Delta

## Purpose

Identifies the exact TV software cohort for which PrivacyShield has an evidence-backed settings map, then limits controls to that map.

## ADDED Requirements

### Requirement: Match a TV only to an exact compatibility profile
The system MUST match a profile using its declared model identity, webOS SDK version, and firmware version. Missing identity fields or any mismatch MUST result in an unknown profile.

#### Scenario: Exact profile match
- **WHEN** all required identity fields match a registered profile
- **THEN** the app identifies that profile and its evidence status

#### Scenario: Unknown or changed firmware
- **WHEN** the model, SDK version, or firmware differs from every registered profile
- **THEN** the app identifies the device as unmapped

### Requirement: Restrict writes to mapped controls
The system MUST enable a setting write only when the current device matches a profile that maps that control and the current value is readable. An unmapped control MUST remain read-only.

#### Scenario: Mapped control with readable value
- **WHEN** a control is mapped for the exact profile and its current value is known
- **THEN** the user can change it and PrivacyShield reports success only after TV readback matches

#### Scenario: Unmapped control or unreadable value
- **WHEN** a profile does not map a control or the current value cannot be read
- **THEN** the app shows the control as read-only or unavailable and blocks the write and preset action

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
- **WHEN** a TV matches a family with public community observations but no exact PrivacyShield profile
- **THEN** the app shows the matching family and relevant public evidence while settings remain read-only and unwritable

### Requirement: Keep public evidence separate from writable profiles
The system MUST keep public findings separate from PrivacyShield compatibility profiles. Another project's result MUST NOT unlock a PrivacyShield write.

#### Scenario: A community-tested model has no PrivacyShield profile
- **WHEN** a TV matches a model family with public community observations but no exact PrivacyShield profile
- **THEN** the app does not enable settings, presets, or restore actions for that TV

#### Scenario: A public report matches software but not the model variant
- **WHEN** a community row has the same SDK and firmware but a different size or regional model code
- **THEN** the app shows it as a comparison row and does not treat it as an exact PrivacyShield profile

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
The system MUST show documented menu paths only when the installed webOS platform is identified from a supported exact runtime signal. Menu paths MUST be labeled as documentation references and MUST NOT expose or imply the current value, a Luna setting key, or PrivacyShield write availability.

#### Scenario: A supported platform is detected
- **WHEN** the app runs on a webOS platform matched by the official browser-engine table
- **THEN** the compatibility view lists only menu entries documented for that platform and states that current state is not read by the reference

#### Scenario: The platform signal is absent or unknown
- **WHEN** the browser user agent is not a webOS user agent or contains an unlisted engine major
- **THEN** the app shows no inferred platform menu map and does not substitute the model's launch-year platform

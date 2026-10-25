# Spec Delta

## Purpose

Lets owners share the minimum device and API evidence needed to map another firmware cohort while keeping the report under the owner's control.

## ADDED Requirements

### Requirement: Generate a report only at the owner's request
The system MUST generate a compatibility report only after an explicit user action. It MUST keep the report on the TV until the user copies or otherwise exports it, and MUST NOT submit the report to a server.

#### Scenario: Owner prepares a report
- **WHEN** the owner selects the compatibility report action
- **THEN** the app displays a report and confirms that it has not been uploaded

#### Scenario: No report action
- **WHEN** the owner has not selected the report action
- **THEN** the app does not create or transmit a community report

### Requirement: Minimize report contents
The report MUST contain only its schema version, PrivacyShield version, model identity, webOS SDK version, firmware version, matched profile identity/status, service-read availability, and per-control read availability. It MUST exclude current setting values, agreement state, serial numbers, MAC/IP addresses, account data, SSIDs, installed-app lists, process lists, and network destinations.

#### Scenario: Sanitized report creation
- **WHEN** a report is generated
- **THEN** it contains only allowlisted compatibility metadata and no TV setting values or personal/network identifiers

#### Scenario: Sensitive fields are unavailable
- **WHEN** system identity or access results cannot be read
- **THEN** the report represents those fields as unavailable without substituting guessed values

### Requirement: Validate community reports offline
The system MUST provide an offline validator that accepts reports matching the published schema and rejects unknown fields, malformed values, or personal/network identifiers.

#### Scenario: Valid report
- **WHEN** a report contains all required schema fields with valid types and only allowlisted keys
- **THEN** the validator accepts it and prints a concise cohort summary

#### Scenario: Invalid or overbroad report
- **WHEN** a report has an invalid schema, unknown fields, or a prohibited identifier/value
- **THEN** the validator rejects it and identifies the field that needs removal or correction

### Requirement: Community evidence never changes support automatically
The system MUST treat submitted reports as evidence for maintainer review. A report MUST NOT create or activate a compatibility profile or enable setting writes by itself.

#### Scenario: Report describes a new cohort
- **WHEN** a valid report identifies a model/software cohort without a reviewed profile
- **THEN** the report remains a candidate and that cohort's controls remain read-only

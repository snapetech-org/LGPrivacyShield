# PrivacyShield

PrivacyShield reads LG webOS privacy settings, LG agreement status, and selected
local TV status. It can change a setting only when its model/software profile
supports that setting and the TV returns a readable current value. Each change
is read back from the TV before success is shown.

## What it shows and changes

- 17 privacy controls covering Live Plus, voice, advertising, recommendations,
  HbbTV, Bluetooth wake, and Sleep on Absence. Available controls depend on the
  model, webOS version, and keys exposed by the TV.
- A recommended settings preset and a local restore point. The preset leaves
  separate ad preferences, broadcast features, and presence features unchanged.
- LG agreement status. Changes open LG's native User Agreements screen. The app
  does not accept EULA terms or edit saved agreement records.
- Per-agreement accepted and declined effects, with source quality and an
  explicit unmapped state for additional regional or model-specific choices.
- Model and software details, local service and installed-app status, LG
  diagnostic-upload settings, documented menu paths, and published model
  reports.
- An optional compatibility report. It contains model/software identity and
  read-access results, not current setting values. It remains local until the
  user copies or scans it and submits it.

The app does not record audio or screenshots, run a background service, inspect
encrypted network traffic, or upload TV settings or viewing activity. Network
destination history requires separate router or DNS logs. A software voice
switch does not disconnect a physical microphone; the TV does not expose a
verified microphone-disconnect control to this app.

## Model support

Profile selection covers the B1–B6, C1–C6, and G1–G6 OLED families and their
installed webOS versions. Profile data comes from published source code,
community reports, LG menu guides, and model-specific settings reports. Extra
controls are restricted to the model/software scope of their source. These
profiles do not mean that each physical TV has been tested.

The exact OLED77C6HUP / webOS 26 profile contains 15 reviewed control entries.
The checked firmware key list contains 14 of them; `hbbTvDnt` is absent and
remains unavailable. The two Smart Tips controls are not part of this profile.
Three C6H settings have prior app write/readback checks. Every current switch
still requires a fresh readable value, and every write requires readback.

The firmware archive data lists package identity and checksums. It does not
contain extracted settings maps and never enables a control. See
[model compatibility](docs/DEVICE-COMPATIBILITY.md),
[public evidence](docs/COMMUNITY-EVIDENCE.md), and the
[privacy capability map](docs/TV-PRIVACY-CAPABILITY-MAP.md) for sources and
limits.

## Build and headless checks

Requirements: Node.js, Python 3, Chromium, `ar`, and the pinned webOS CLI in the
project dependencies.

```sh
npm ci
npm test
npm run package
npm run test:ipk
```

`npm test` runs the JavaScript, Python, and Chromium headless suites. The UI
tests emulate the remote, SettingsService responses, HBC access, supported and
unsupported settings, errors, and model/software profile selection. They do not
emulate private firmware code or replace physical-TV checks. The package is
written to `dist/org.privacyshield.webos_0.4.0_all.ipk`.

For QA coverage and limits, see [headless QA](docs/HEADLESS-QA.md). For a
physical TV test, see [the TV test guide](docs/TEST-ON-YOUR-TV.md).

## Release status

The source tree is at version 0.4.0 and is not published as a release. The last
published release is [v0.1.12](https://github.com/snapetech-org/PrivacyShield/releases/tag/v0.1.12).
The existing Homebrew catalog submission has not been updated by this source
change. A release or Homebrew submission requires project-owner signoff; see
[release preparation](RELEASE.md).

## License and support

PrivacyShield is licensed under the GNU Affero General Public License, version
3. See [LICENSE](LICENSE) and
[third-party notices](THIRD-PARTY-NOTICES.md).

[Ko-fi: snapetech](https://ko-fi.com/snapetech)

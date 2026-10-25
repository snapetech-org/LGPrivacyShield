# PrivacyShield

PrivacyShield lets you review and change privacy settings exposed by local services on LG webOS TVs. It also shows the agreement choices saved on the TV.

## Contents

- [What you can do](#what-you-can-do)
- [App pages](#app-pages)
  - [Overview](#overview)
  - [Controls](#controls)
  - [LG agreements](#lg-agreements)
  - [About](#about)
- [Local operation and privacy](#local-operation-and-privacy)
- [Installation and compatibility](#installation-and-compatibility)
- [Documentation](#documentation)
- [License](#license)

## What you can do

- Check the current Live Plus and voice settings.
- Review and change settings the TV exposes to PrivacyShield. Each change is read back from the TV.
- Save the current readable settings on the TV as a reusable restore point, or use the recommended values. PrivacyShield also saves the starting values before your first change when no restore point exists.
- Review saved LG agreement choices and open LG User Agreements on the TV to change them.
- Prepare a compatibility report when the TV model or software is not mapped, or a control cannot be read.
- Use the dark theme by default or choose the light theme. The choice is saved on the TV.

## App pages

Screenshots use synthetic C5/webOS 25 data. Control availability and values depend on the connected TV. Click an image to open its full-size version. The [app guide](docs/APP-GUIDE.md) describes each page and the controls on it.

### Overview

<a href="docs/screenshots/overview.png"><img src="docs/screenshots/overview.png" width="640" alt="PrivacyShield Overview showing a TV model, software version, and current Live Plus and voice settings"></a>

Overview shows the TV model and software version with the current Live Plus and voice settings. **Review controls** opens the settings available on this TV.

### Controls

<a href="docs/screenshots/controls-top.png"><img src="docs/screenshots/controls-top.png" width="640" alt="PrivacyShield Controls showing recommended settings and the first available privacy controls"></a>

Controls lists settings mapped to the TV and software. **Save current settings** stores readable values as a restore point that stays available after restoring; save again to replace it. If no restore point exists, PrivacyShield saves the starting values before the first change. Use **Apply recommended settings** or change switches individually, then choose **Restore saved settings** to apply the saved values.

<a href="docs/screenshots/controls-bottom.png"><img src="docs/screenshots/controls-bottom.png" width="640" alt="PrivacyShield Controls showing HbbTV, Bluetooth wake, and Sleep on Absence settings"></a>

The position indicator shows where you are in the available settings. Controls that the TV does not expose are left out of the list.

### LG agreements

<a href="docs/screenshots/agreements-top.png"><img src="docs/screenshots/agreements-top.png" width="640" alt="PrivacyShield LG agreements showing saved choices and their effects"></a>

Each agreement shows its saved choice and the documented effects of accepting or declining it.

<a href="docs/screenshots/agreements-bottom.png"><img src="docs/screenshots/agreements-bottom.png" width="640" alt="PrivacyShield LG agreements showing required terms and the button to open LG User Agreements"></a>

Use **Open LG User Agreements** to review or change choices in LG's screen on the TV.

### About

<a href="docs/screenshots/about.png"><img src="docs/screenshots/about.png" width="640" alt="PrivacyShield About page showing local operation, license, source code, and a Ko-fi support QR code"></a>

About shows the app version, explains local operation, links to the license and source code, and provides a QR code and link for donations and support at [ko-fi.com/snapetech](https://ko-fi.com/snapetech).

## Local operation and privacy

PrivacyShield is local-first. It reads and changes settings through local webOS services and makes no network requests. It sends no data from the app or TV.

A compatibility report is prepared on the TV. Its single QR code contains a GitHub form link with the report included. Scan once with a phone to open the prefilled form; the phone sends the report to GitHub in the link. Submit the form to create a public issue. Send a report when your model or software is unmapped, or a control is unavailable, so maintainers can review that TV's compatibility. The report includes model and software versions, service access, and yes/no results for which controls returned a value. It excludes setting values and agreement choices.

The app does not record audio or screenshots, run a background service, inspect encrypted network traffic, or upload TV settings or viewing activity. Network destination history requires separate router or DNS logs. A software voice switch does not disconnect a physical microphone if the TV does not expose a verified microphone-disconnect control to this app.

## Installation and compatibility

PrivacyShield targets LG webOS 6 and later. Available controls depend on the TV model, region, software, and Homebrew permissions. A control appears when the TV profile maps it; its switch is available when the TV returns a readable value.

Download the [latest published release](https://github.com/snapetech-org/PrivacyShield/releases/latest) and install its IPK with a Homebrew-compatible installer such as [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop). A rooted TV with Homebrew Channel provides local service access for reading and changing settings.

See the [installation and compatibility guide](docs/TEST-ON-YOUR-TV.md) before installing.

## Documentation

The [documentation index](docs/README.md) links to setting effects, LG agreement effects, model compatibility, and technical references.

## License

PrivacyShield is licensed under the GNU Affero General Public License, version 3. See [LICENSE](LICENSE).

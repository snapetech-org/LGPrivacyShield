# PrivacyShield

PrivacyShield lets you review and manage privacy settings on an LG webOS TV
using its remote. It uses the TV's local webOS services to read and change
available settings, including advertising toggles. It also shows saved LG
agreement choices and local TV status.

## Contents

- [What you can do](#what-you-can-do)
- [App tour](#app-tour)
  - [Overview](#overview)
  - [Controls](#controls)
  - [LG agreements](#lg-agreements)
  - [TV details](#tv-details)
  - [About](#about)
- [Local operation and privacy](#local-operation-and-privacy)
- [TV support and installation](#tv-support-and-installation)
- [Documentation](#documentation)
- [License](#license)

## What you can do

- Review available controls for Live Plus, voice, advertising, recommendations,
  HbbTV, Bluetooth wake, and Sleep on Absence.
- Change supported settings one at a time or apply the recommended settings.
  PrivacyShield saves a local restore point before the first change, which you
  can restore later. It reads a setting before enabling its switch and checks
  the value again after a change.
- Review saved LG agreement choices and read what LG documents about their
  effects. Open LG's User Agreements screen on the TV to change a choice.
- Check the TV model, webOS and firmware versions, network connection, local
  service status, installed Homebrew apps, and diagnostic-upload settings.
- Prepare an optional compatibility report with the model/software identity
  and yes/no results for setting read access. Choose whether to share it.

## App tour

The images are 1920×1080 headless Chromium captures using synthetic TV and
service data. They show the app layout and controls; real settings and control
availability depend on the connected TV. Click an image to open its full-size
version. The [app guide](docs/APP-GUIDE.md) explains each page in more detail.

### Overview

<a href="docs/screenshots/overview.png"><img src="docs/screenshots/overview.png" width="640" alt="PrivacyShield Overview page"></a>

Overview summarizes privacy status, Live Plus and voice settings, network
connection, microphone guidance, model and software details, and the route to
the controls.

### Controls

<a href="docs/screenshots/controls-top.png"><img src="docs/screenshots/controls-top.png" width="640" alt="PrivacyShield Controls page, top of the settings list"></a>

At the top of Controls, apply the recommended settings or review individual
switches. The counter and progress bar show how far the 17-control list
continues below.

<a href="docs/screenshots/controls-bottom.png"><img src="docs/screenshots/controls-bottom.png" width="640" alt="PrivacyShield Controls page, bottom of the settings list"></a>

The lower portion includes HbbTV, Bluetooth wake, and Sleep on Absence. A
setting marked unavailable cannot be changed on the sample profile.

### LG agreements

<a href="docs/screenshots/agreements-top.png"><img src="docs/screenshots/agreements-top.png" width="640" alt="PrivacyShield LG agreements page, first agreements"></a>

Each agreement card shows the saved choice and documented effects of accepting
or declining it. Agreement consent and feature switches are shown separately.

<a href="docs/screenshots/agreements-bottom.png"><img src="docs/screenshots/agreements-bottom.png" width="640" alt="PrivacyShield LG agreements page, remaining agreements and action"></a>

The lower portion shows the remaining choices and opens LG's native agreement
screen, where changes are made.

### TV details

<a href="docs/screenshots/tv-details-status.png"><img src="docs/screenshots/tv-details-status.png" width="640" alt="PrivacyShield TV details page, local status cards"></a>

TV details groups agreement status, voice services, network-destination
guidance, installed Homebrew apps, and model compatibility.

<a href="docs/screenshots/tv-details-compatibility.png"><img src="docs/screenshots/tv-details-compatibility.png" width="640" alt="PrivacyShield TV details page, expanded setting compatibility details"></a>

Expand Technical setting details to see mapped controls and read-only findings
for the detected model and software. The optional compatibility report records
model/software identity and setting read-access results.

### About

<a href="docs/screenshots/about.png"><img src="docs/screenshots/about.png" width="640" alt="PrivacyShield About page"></a>

About lists the app version, scope, license, source repository, support link,
and firmware-catalog note.

## Local operation and privacy

PrivacyShield runs on the TV and uses its local webOS services to read or change
settings. PrivacyShield itself sends no data off the TV and has no account,
telemetry, or automatic upload service. Its reads and changes stay local. A
compatibility report is prepared locally and copied to the TV's clipboard; it
leaves the TV only if you choose to submit it.

The app does not record audio or screenshots, run a background service, inspect
encrypted network traffic, or upload TV settings or viewing activity. Network
destination history requires separate router or DNS logs. A software voice
switch does not disconnect a physical microphone if the TV does not expose a
verified microphone-disconnect control to this app.

## TV support and installation

PrivacyShield targets LG webOS 6 and later. Available controls depend on the TV
model, region, installed software, and Homebrew permissions. A setting is
available only when the TV returns a readable current value; PrivacyShield
checks each change by reading the value back. Some TVs will show fewer controls
or read-only status.

Download the [latest published release](https://github.com/snapetech-org/PrivacyShield/releases/latest)
and install its IPK with a Homebrew-compatible installer such as
[webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop). A rooted
TV with Homebrew Channel provides local service access used for settings and TV
status. See the [installation and TV guide](docs/TEST-ON-YOUR-TV.md).

The screenshots show the current source version 0.4.0. The latest published
package is [v0.1.12](https://github.com/snapetech-org/PrivacyShield/releases/tag/v0.1.12).

## Documentation

Browse the [documentation index](docs/README.md) for user guides, setting
references, model evidence, and development notes.

## License

PrivacyShield is licensed under the GNU Affero General Public License, version
3. See [LICENSE](LICENSE).

# LGPrivacyShield

### Make your LG TV’s privacy controls easier to see and manage.

See Live Plus and voice status, adjust the controls your TV supports, and save settings to restore later.

## Contents

- [Screenshots](#screenshots)
  - [Overview](#overview)
  - [Controls](#controls)
  - [LG agreements](#lg-agreements)
  - [About](#about)
- [Local operation and privacy](#local-operation-and-privacy)
- [Install and help](#install-and-help)

## Screenshots

Click an image to enlarge. Dark mode is the default, and your light-theme choice is saved on the TV.

### Overview

Check TV software, Live Plus and voice status. **Review controls** opens supported settings.

<p><a href="docs/screenshots/overview-dark.png"><img src="docs/screenshots/overview-dark.png" width="49%" alt="Overview in dark theme"></a> <a href="docs/screenshots/overview-light.png"><img src="docs/screenshots/overview-light.png" width="49%" alt="Overview in light theme"></a></p>

### Controls

Apply recommended settings or adjust switches. Save readable settings for later; if you have no saved point, the first change saves the starting values. Changes are checked on the TV.

The top shows actions and first settings. Scroll down for the rest and your position in the list.

<p><a href="docs/screenshots/controls-top-dark.png"><img src="docs/screenshots/controls-top-dark.png" width="49%" alt="Controls, top, in dark theme"></a> <a href="docs/screenshots/controls-top-light.png"><img src="docs/screenshots/controls-top-light.png" width="49%" alt="Controls, top, in light theme"></a></p>

<p><a href="docs/screenshots/controls-bottom-dark.png"><img src="docs/screenshots/controls-bottom-dark.png" width="49%" alt="Controls, lower settings, in dark theme"></a> <a href="docs/screenshots/controls-bottom-light.png"><img src="docs/screenshots/controls-bottom-light.png" width="49%" alt="Controls, lower settings, in light theme"></a></p>

### LG agreements

Review saved choices and their documented effects. Open LG User Agreements to change them.

<p><a href="docs/screenshots/agreements-top-dark.png"><img src="docs/screenshots/agreements-top-dark.png" width="49%" alt="LG agreements, top, in dark theme"></a> <a href="docs/screenshots/agreements-top-light.png"><img src="docs/screenshots/agreements-top-light.png" width="49%" alt="LG agreements, top, in light theme"></a></p>

<p><a href="docs/screenshots/agreements-bottom-dark.png"><img src="docs/screenshots/agreements-bottom-dark.png" width="49%" alt="LG agreements, lower section, in dark theme"></a> <a href="docs/screenshots/agreements-bottom-light.png"><img src="docs/screenshots/agreements-bottom-light.png" width="49%" alt="LG agreements, lower section, in light theme"></a></p>

### About

Find the app version, license and source code, plus the support QR code and [Ko-fi link](https://ko-fi.com/snapetech).

<p><a href="docs/screenshots/about-dark.png"><img src="docs/screenshots/about-dark.png" width="49%" alt="About in dark theme"></a> <a href="docs/screenshots/about-light.png"><img src="docs/screenshots/about-light.png" width="49%" alt="About in light theme"></a></p>

## Local operation and privacy

**Local-first:** LGPrivacyShield runs on your TV and uses local webOS services. The app sends no data during normal use.

To report a missing model or unreadable control, scan the single QR code with your phone. It opens GitHub's prefilled form; opening the link sends the report, and submitting creates a public issue. The report includes TV model and software, service access, and which controls could be read—not current setting values or agreement choices. This helps us check support for your TV.

The app does not record audio or screenshots, run a background service, inspect encrypted network traffic, or upload TV settings or viewing activity. Network destination history requires separate router or DNS logs. A software voice switch does not disconnect a physical microphone if the TV does not expose a verified microphone-disconnect control to this app.

The TV's system software and other apps may still use the network. LGPrivacyShield does not monitor or block their traffic. See the [security notes](SECURITY.md) for the app's trust boundary and review limits.

## Install and help

LGPrivacyShield is expected to work on LG webOS 6 and later. Physical testing is on a C6 running webOS 26; earlier releases have not been tested. Controls depend on your TV model, software, and Homebrew access. Install the [latest release](https://github.com/snapetech-org/LGPrivacyShield/releases/latest) with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop). Homebrew Channel on a rooted TV enables local setting access.

See the [installation guide](docs/TEST-ON-YOUR-TV.md), [setting effects](docs/FEATURE-IMPACT.md), [LG agreement effects](docs/LG-AGREEMENT-EFFECTS.md), and [model compatibility](docs/DEVICE-COMPATIBILITY.md).

## License

LGPrivacyShield is licensed under the GNU Affero General Public License, version 3. See [LICENSE](LICENSE).

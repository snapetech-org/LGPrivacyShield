# PrivacyShield

PrivacyShield lets you review and manage privacy settings on an LG webOS TV. It reads and changes the TV's privacy settings, LG agreement choices, and advertising toggles
through webOS services on the TV.

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

## Local operation and privacy

PrivacyShield runs on the TV and uses its local webOS services to read or change
settings. PrivacyShield itself sends no data off the TV and has no account,
telemetry, or automatic upload service. Its reads and changes stay local. A
compatibility report is prepared locally and copied to the TV's clipboard; it
leaves the TV only if you choose to submit it.

The app does not record audio or screenshots, run a background service, inspect
encrypted network traffic, or upload TV settings or viewing activity. Network
destination history requires separate router or DNS logs. A software voice
switch does not disconnect a physical microphone; the TV does not expose a
verified microphone-disconnect control to this app.

## TV support

PrivacyShield targets LG webOS 6 and later. Available controls depend on the TV
model, region, installed software, and Homebrew permissions. A setting is
available only when the TV returns a readable current value; PrivacyShield
checks each change by reading the value back. Some TVs will show fewer controls
or read-only status.

Download the [latest release](https://github.com/snapetech-org/PrivacyShield/releases/latest)
and install its IPK with a Homebrew-compatible installer such as
[webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop). A rooted
TV with Homebrew Channel provides local service access used for settings and TV
status. See the [installation and TV guide](docs/TEST-ON-YOUR-TV.md).

## More detail

- [Model and software compatibility](docs/DEVICE-COMPATIBILITY.md)
- [LG agreement effects](docs/LG-AGREEMENT-EFFECTS.md)
- [Privacy settings and their documented effects](docs/TV-PRIVACY-CAPABILITY-MAP.md)
- [Sources for model support](docs/COMMUNITY-EVIDENCE.md)

## License

PrivacyShield is licensed under the GNU Affero General Public License, version
3. See [LICENSE](LICENSE).

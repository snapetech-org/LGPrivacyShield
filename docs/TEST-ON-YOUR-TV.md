# Install and check PrivacyShield on your LG TV

For a tour of the app pages, see the [PrivacyShield app guide](APP-GUIDE.md).
The [documentation index](README.md) links to user and technical references.

PrivacyShield can collect read-only compatibility evidence from a TV whose exact
model and software have not been mapped. This helps compare real sets instead
of inferring behavior from a series name.

## Install

Download the IPK from the [latest PrivacyShield release](https://github.com/snapetech-org/PrivacyShield/releases/latest).
Use a webOS Homebrew-compatible installer such as
[webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop) to install
the file. Rooted/Homebrew TVs must use the manager's rooted connection. Do not
enable LG Developer Mode on a TV that is already rooted.

PrivacyShield is intended for webOS 6 and newer. A rooted TV with Homebrew
Channel gives the app its best chance to read settings and local service status.
On webOS 26, the Homebrew `lunabus.query` permission may not be registered; the
report will show the access result. Installing PrivacyShield does not repair or
change Homebrew permissions.

The Homebrew catalog listing is pending upstream review. The GitHub release
provides the installable IPK in the meantime.

## Send a report

Send a report if your model/software is unmapped or expected controls remain
read-only. The model, software, and read-access results help maintainers review
compatibility coverage.

1. Open **TV details** in PrivacyShield.
2. Choose **Prepare compatibility report**.
3. Scan the QR code once with a phone. It opens GitHub's form with the report
   filled in.
4. Review the report. Add the TV region or a menu-path observation if useful.
5. Submit the form to create the issue.

The report contains the app version, model/software versions, bridge access
results, and yes/no read-access results for 17 controls. It does not contain
setting values, agreement choices, account details, serial numbers, network
addresses, SSIDs, installed app lists, or process names. The TV app does not
send the report. Opening the QR link sends the report to GitHub in the URL so
the form can be filled in. GitHub creates a public issue only when you submit.

The JSON is displayed below the code for review. Do not send a photo of the
rest of the TV screen if it includes private information.

## What to test

- Confirm that the model, SDK, and firmware shown by PrivacyShield match the TV.
- Check whether the app reports system information, SettingsService, and the
  Homebrew snapshot as available or unavailable.
- Compare the displayed model-specific public evidence with the TV's exact
  model and region. Report a mismatch or a source that no longer exists.
- For a setting, report its visible label and menu path, and whether PrivacyShield
  says its key can be read. Do not include the current value.
- If access fails, submit that result too. Denied access is useful compatibility
  evidence.

Keep controls read-only unless PrivacyShield explicitly identifies your exact
model, SDK, and firmware as a supported profile. Do not try a write or preset on
an unmapped set. Reports never enable writes by themselves; a maintainer must
trace the setting path and review the evidence first.

## Simulator limits

LG's desktop Simulator is versioned by webOS platform, not TV model; its current
downloads cover webOS 6.0, 22, 23, 24, and 26. It can run the app and emulate
remote-key input. Our headless suite also supplies synthetic identities for
every B1–B6, C1–C6, and G1–G6 family, with mocked service responses. That checks
family labels, platform mapping, navigation, locked controls, and report output.
It does not emulate each TV's firmware or settings schema. Neither simulator can
validate a particular model's hidden Settings/First Use implementation,
physical microphone layout, Homebrew permission map, or actual setting
read/write path. Those require reports and controlled checks from the real TV
cohort. See the [model coverage matrix](DEVICE-COMPATIBILITY.md) for the
evidence required to add a profile.

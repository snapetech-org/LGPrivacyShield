# Test PrivacyShield on your LG TV

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

1. Open **TV details** in PrivacyShield.
2. Choose **Prepare compatibility report**.
3. Scan the first QR code with a phone camera and copy the decoded JSON text.
4. Scan the second QR code to open the compatibility report form, then paste
   the JSON.
5. Add the full model code, TV region, SDK and firmware versions, and the exact
   Settings menu path you checked.

The code contains the app version, model/software versions, bridge access
results, and yes/no read-access results for PrivacyShield's current candidate
keys. It does not contain setting values, agreement choices, account details,
serial numbers, network addresses, SSIDs, installed app lists, or process
names. The TV does not upload the report. Posting it to GitHub is an explicit
choice by the owner.

If the QR scanner cannot copy text, the JSON is also shown below the code. Use
the phone camera or a local QR reader; do not send a photo of the rest of the TV
screen if it includes private information.

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

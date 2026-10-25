# Install and check PrivacyShield on your LG TV

See the [app guide](APP-GUIDE.md) for the four app pages. The [documentation index](README.md) links to user and technical references.

## Install

Download the IPK from the [latest PrivacyShield release](https://github.com/snapetech-org/PrivacyShield/releases/latest). Install it with a webOS Homebrew-compatible installer such as [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop). Rooted/Homebrew TVs must use the manager's rooted connection. Do not enable LG Developer Mode on a TV that is already rooted.

PrivacyShield is expected to work on webOS 6 and newer. Physical testing is currently limited to a C6 running webOS 26; earlier releases have not been tested. Homebrew Channel provides local service access used to read or change settings. On webOS 26, the Homebrew `lunabus.query` permission may not be registered; settings that cannot be read remain unavailable. Installing PrivacyShield does not change Homebrew permissions.

## Check compatibility

Open **Controls**. PrivacyShield lists settings mapped to the TV's model and software. A switch is available only when the TV returns a readable current value. If no settings are mapped, or a mapped setting cannot be read, the page offers a compatibility report.

Send a report if the TV is not mapped or expected controls remain unavailable. The report helps maintainers check model and software coverage and see which controls the TV returns. It contains model and software versions, service access, and yes/no setting-read results; it does not include setting values or agreement choices.

1. In **Controls**, choose **Prepare compatibility report**.
2. Scan the single QR code with a phone. It opens a prefilled GitHub form with the report included in the link.
3. Review the report and submit the form to create a public issue.

The TV app prepares the report locally and does not submit it. Scanning opens GitHub from the phone; submitting creates the issue.

## Check the TV information

- Compare the model, webOS version, and firmware shown on Overview with the TV's System Information screen.
- Check whether the controls you expect appear in Controls and whether their values are readable.
- If a control is missing or unavailable, include its label and the TV's region in the issue. Do not include its current value.
- If the report's model or software does not match the TV, include the correct model and software shown in System Information.

Keep controls read-only on an unmapped TV. A report does not enable writes; a maintainer must review the model-specific settings path and evidence first.

## Simulator limits

LG's desktop Simulator is versioned by webOS platform, not TV model. It can run the app and emulate remote-key input, but it does not reproduce each TV's firmware or settings schema. The headless suite also supplies synthetic identities for B1–B6, C1–C6, and G1–G6 model families with mocked service responses. Those fixtures check model matching, setting maps, navigation, read-only behavior, and report output. They cannot validate a particular TV's Settings implementation, Homebrew permissions, or actual setting read/write path. See the [model coverage matrix](DEVICE-COMPATIBILITY.md) for the evidence required to add a profile.

# Homebrew catalog preparation

The source repository is
[snapetech-org/LGPrivacyShield](https://github.com/snapetech-org/LGPrivacyShield).

The draft metadata is in
[org.privacyshield.webos.yml](org.privacyshield.webos.yml). It includes eight
screenshots showing all four pages in dark and light themes, current app
behavior, expected support for all 18 LG OLED B/C/G families on each listed
webOS version (6.x and 22–26), the compatibility-report flow, physical test
details, and the Ko-fi funding field. A QR report opens a prefilled GitHub
form; submission creates a public issue that helps maintainers review model
coverage and improve the maps. [PR body](PR-BODY.md) contains the matching
description, test record, and AI-use declaration.

The existing
[catalog pull request #296](https://github.com/webosbrew/apps-repo/pull/296)
is open for maintainer review. [Version 0.4.2](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.2)
is published, and the listing's stable manifest URL resolves to its matching
package. The compatibility map expects all 18 LG OLED B/C/G families to work
on each listed webOS version; physical TV testing has been on one C6 running
webOS 26. See [release procedure](../RELEASE.md) and the
[TV testing guide](../docs/TEST-ON-YOUR-TV.md).

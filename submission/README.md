# Homebrew catalog preparation

The source repository is
[snapetech-org/LGPrivacyShield](https://github.com/snapetech-org/LGPrivacyShield).

The draft metadata is in
[org.privacyshield.webos.yml](org.privacyshield.webos.yml). It includes eight
screenshots showing all four pages in dark and light themes, current app
behavior, expected support for all 18 LG OLED families (B1–B6, C1–C6, and
G1–G6) on webOS 6.x and 22–26, the compatibility-report flow, physical test
details, and the Ko-fi funding field. A QR report opens a prefilled GitHub
form; submission creates a public issue. Reports let us compare which controls
are readable across models, software versions, and regions, spot coverage gaps,
and improve the maps. [PR body](PR-BODY.md) contains the matching description,
test record, and AI-use declaration.

The existing
[catalog pull request #296](https://github.com/webosbrew/apps-repo/pull/296)
is open for maintainer review. [Version 0.4.2](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.2)
is published, and the listing's stable manifest URL resolves to its matching
package. We expect all 18 LG OLED families—B1–B6, C1–C6, and G1–G6—to work
on webOS 6.x and 22–26. Physical testing has been on one C6 running webOS 26;
see [release procedure](../RELEASE.md) and the
[TV testing guide](../docs/TEST-ON-YOUR-TV.md).

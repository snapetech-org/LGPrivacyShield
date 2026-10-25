# Homebrew catalog preparation

The source repository is
[snapetech-org/LGPrivacyShield](https://github.com/snapetech-org/LGPrivacyShield).

The draft metadata is in
[org.privacyshield.webos.yml](org.privacyshield.webos.yml). It includes eight
screenshots showing all four pages in dark and light themes, current app
behavior, the expected webOS 6+ claim with physical test details, and the
Ko-fi funding field. [PR body](PR-BODY.md) contains the matching description,
test record, and AI-use declaration.

The existing
[catalog pull request #296](https://github.com/webosbrew/apps-repo/pull/296)
is open for maintainer review. [Version 0.4.2](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.2)
is published, and the listing's stable manifest URL resolves to its matching
package. The listing expects webOS 6+; the C6 on webOS 26 is the only physical
test, and earlier releases remain untested. See [release procedure](../RELEASE.md)
and the [TV testing guide](../docs/TEST-ON-YOUR-TV.md).

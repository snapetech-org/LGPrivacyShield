# Homebrew catalog preparation

The source repository is
[snapetech-org/PrivacyShield](https://github.com/snapetech-org/PrivacyShield).

The draft metadata is in
[org.privacyshield.webos.yml](org.privacyshield.webos.yml). It includes eight
screenshots showing all four pages in dark and light themes, current app
behavior, the expected webOS 6+ claim with physical test details, and the
Ko-fi funding field. [PR body](PR-BODY.md) contains the matching description,
test record, and AI-use declaration.

The existing
[catalog pull request #296](https://github.com/webosbrew/apps-repo/pull/296)
has been updated to describe the current app and screenshots. The PR remains
open. Its stable manifest URL currently resolves to the public v0.1.12 release;
the 0.4.0 candidate and matching manifest are not published. Do not merge the
PR until that release is available. The listing expects webOS 6+; the C6 on
webOS 26 is the only physical test, and earlier releases remain untested. See
[release preparation](../RELEASE.md) and the [TV testing guide](../docs/TEST-ON-YOUR-TV.md).

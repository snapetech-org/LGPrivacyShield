# Homebrew catalog preparation

The source repository is
[snapetech-org/PrivacyShield](https://github.com/snapetech-org/PrivacyShield).

The draft metadata is in
[org.privacyshield.webos.yml](org.privacyshield.webos.yml). It includes the
catalog screenshots, a concise description, and the Ko-fi funding field. Its
manifest URL points to the latest release, currently v0.1.12; source version
0.4.0 has not been released.

The existing
[catalog pull request #296](https://github.com/webosbrew/apps-repo/pull/296)
still describes the v0.1.11 listing and its two-QR clipboard report flow. The
current app uses one QR code to open a prefilled GitHub form on a phone. Refresh
the PR description, screenshots, compatibility claim, and validation record
before submission. The draft declares webOS 6+ as expected compatibility;
physical testing is limited to webOS 26. Do not update or merge the PR until the
project owner decides to proceed. See [release preparation](../RELEASE.md) and the
[TV testing guide](../docs/TEST-ON-YOUR-TV.md).

# Security review

Reviewed 2026-10-25 against the LGPrivacyShield 0.4.1 source candidate.

## Changes made

- Removed the app's generic root-command API. The app now requests only a
  settings snapshot or a setting write from its allowlisted helper.
- Added a content security policy that limits scripts and connections to the
  app, blocks objects and frames, and permits only the app's data-URL QR images.
- Validated the webOS package ID and version before using them in package
  paths or control metadata.
- Made the IPK build include tracked app files only, and made its archive time
  derive from the source commit.
- Kept UI text inserted through text nodes; the app source has no dynamic HTML
  parsing or evaluation.

## Limits and exceptions

- Homebrew Channel's `exec` service runs commands with root privilege. The app
  uses it to run two bundled scripts: a read-only snapshot and a setting writer
  that accepts only known keys and `on` or `off`. The TV's Homebrew service and
  installed app package remain trusted. Compromised app code could still call
  webOS services directly; the page policy does not sandbox it from that bridge.
- The app reads and changes settings through local webOS services. It does not
  monitor or block network traffic from LG system software or other TV apps.
  Router or DNS logs are needed to review destination history.
- Compatibility checks include simulated profiles and source evidence. The
  only physical test recorded for this release line is a C6 on webOS 26.
- The firmware catalog's original author and license are unknown. It remains
  in the repository at the project owner's direction and is excluded from the
  installable IPK. Remove it if its source owner requests removal.

## Checks

The source review found no dynamic HTML or JavaScript evaluation sinks. `npm
audit` found no vulnerabilities. All 61 Node.js and 51 Python tests passed;
`shellcheck` passed for the build scripts. The 0.4.1 IPK built, and all 18
packaged browser checks passed.

GitHub shows 14 historical Dependabot alerts and one historical CodeQL alert,
all fixed, with none open. CodeQL default analysis is configured weekly for
JavaScript/TypeScript and Python. Secret scanning and push protection are
enabled, with no open secret alerts. GitHub's non-provider-pattern scanning
and token validity checks remain disabled. This review does not audit LG
firmware or Homebrew Channel internals.

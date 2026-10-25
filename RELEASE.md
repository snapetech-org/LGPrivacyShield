# Release procedure

This runbook covers versioning, validation, packaging, and publication.
Project-owner signoff is required before publishing a release or updating the
Homebrew catalog entry. Keep the catalog pull request open for maintainer
review.

## Before release

1. Update `package.json`, `package-lock.json`, `webos-app/appinfo.json`, and
   `webos-app/src/compatibility.js` to the same version.
2. Update `CHANGELOG.md` and check public documentation for local hostnames,
   usernames, private paths, serial numbers, unredacted reports, and network
   addresses. Model and software identifiers used as compatibility evidence are
   intentional.
3. Record known attribution for research data in the public source tree. The
   firmware catalog's original author and license are unknown. It is excluded
   from the IPK, retained at the project owner's direction, and will be removed
   if requested by its source owner.
4. Run `npm ci`, `npm audit`, `npm test`, `npm run package`, and
   `npm run test:ipk`.
5. Run the [Homebrew compatibility checker](https://github.com/webosbrew/dev-toolbox-cli)
   on the IPK. Record the model and webOS versions tested on real TVs. The
   listing declares webOS 6+ as expected compatibility; physical testing is
   currently limited to webOS 26.
6. Verify that the IPK contains the app sources, root AGPL license, and
   third-party notices. Record its SHA-256 and size.
7. Generate the Homebrew manifest from the final IPK and public icon/source
   URLs. Host the manifest and IPK together in the versioned release. Check
   that the manifest version, hash, and size match the package; attach that
   exact IPK without rebuilding it.
8. Review Homebrew metadata, screenshots, dependency and permission
   declarations, funding link, and release notes. Do not submit or merge before
   owner signoff.
9. After signoff, publish the GitHub release and update the Homebrew catalog
   only through its reviewed repository workflow.

## Current release

[LGPrivacyShield 0.4.1](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.1)
was published on 2026-10-25 from commit
`513c4280bae236ce2b8fc43f65cf91ba4901b203`. The release includes the installable
IPK and a Homebrew manifest generated from that exact package. The IPK is
73,926 bytes with SHA-256
`dba31d9531dbd0e966fb07cce913e91983e34068bec8ae391360432cbd6b21e2`.

Homebrew catalog PR
[#296](https://github.com/webosbrew/apps-repo/pull/296) is open for maintainer
review. Its stable latest-release manifest URL now resolves to 0.4.1. The
listing expects webOS 6 and later; physical testing is on a C6 running webOS
26. Earlier versions have not been physically tested. The 0.4.1 package passed
61 Node.js tests, 51 Python tests, and all 18 packaged browser checks. The
dependency audit reported no vulnerabilities. The compatibility checker reports
ES2017 support on its webOS 6.4.0 and later profiles; runtime API polyfills may
be needed on 6.4.0, while 7.4.0 and later profiles report native APIs.

Known security and attribution limits are recorded in
[SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md). IPK creation uses the local
Python packager and includes tracked app files only.

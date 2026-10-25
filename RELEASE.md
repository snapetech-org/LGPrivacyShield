# Release preparation

This file describes the release steps. It does not authorize publication.
Project-owner signoff is required before creating a GitHub release, submitting
or updating a Homebrew catalog entry, or merging a Homebrew repository change.

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

## Current state

Version 0.4.0 is published with the installable IPK and matching Homebrew
manifest. Its SHA-256 is
`38d5929d583ef0c7ab6e7244ec92cf2956928caaadadec7e40374cd85f804f0d` and its
size is 73,610 bytes. Homebrew PR #296 is open for maintainer review and points
to the stable latest-release manifest URL. The catalog PR checks passed before
v0.4.0 was published; rerunning them requires Homebrew repository admin access.
The current source is 0.4.1 and is not released. It includes security
hardening documented in [SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md). The
Homebrew PR still resolves to the published 0.4.0 manifest; do not merge it
until a matching 0.4.1 IPK and manifest are published. Project-owner signoff is
required before that release and PR update. IPK creation uses the local Python
packager and includes only tracked app files.

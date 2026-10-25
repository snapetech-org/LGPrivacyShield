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
3. Confirm redistribution terms for research data in the public source tree.
   The firmware catalog has no stated source license; it is excluded from the
   IPK but remains in this repository. Resolve its terms or remove it before
   further redistribution.
4. Run `npm ci`, `npm test`, `npm run package`, and `npm run test:ipk`.
5. Run the [Homebrew compatibility checker](https://github.com/webosbrew/dev-toolbox-cli)
   on the IPK. Install from a clean state and launch on a real TV; test the
   oldest webOS release claimed and record the model and webOS release.
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

Version 0.4.0 is prepared in source but has not been published. The latest
published release is v0.1.12. The catalog metadata in `submission/` is a local
release-preparation artifact; it must not be submitted or merged without
project-owner signoff.

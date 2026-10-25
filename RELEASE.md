# Release preparation

This file describes the release steps. It does not authorize publication.
Project-owner signoff is required before creating a GitHub release, submitting
or updating a Homebrew catalog entry, or merging a Homebrew repository change.

## Before release

1. Update `package.json`, `package-lock.json`, `webos-app/appinfo.json`, and
   `webos-app/src/compatibility.js` to the same version.
2. Update `CHANGELOG.md` and check that public documentation contains no local
   hostnames, usernames, paths, TV identifiers, or network addresses.
3. Run `npm ci`, `npm test`, `npm run package`, and `npm run test:ipk`.
4. Verify that the IPK contains the app sources, root AGPL license, and
   third-party notices. Record its SHA-256 and size.
5. Generate the Homebrew manifest from the final IPK and public icon/source
   URLs. Check that the manifest version, hash, and size match the package.
6. Review Homebrew metadata, dependency and permission declarations, funding
   link, and release notes. Do not submit or merge before owner signoff.
7. After signoff, attach the IPK and manifest to a versioned GitHub release.
   Update the Homebrew catalog entry only through its reviewed repository
   workflow.

## Current state

Version 0.4.0 is prepared in source but has not been published. The latest
published release is v0.1.12. The catalog metadata in `submission/` is a local
release-preparation artifact; it must not be submitted or merged without
project-owner signoff.

# Contributing

Contributions should keep model scope, observed behavior, and uncertainty
visible. A setting name found in a guide or firmware is not proof that a
particular TV exposes it or that changing it has the intended effect.

## Compatibility evidence

For a proposed model or settings change, include the source URL and revision,
exact model code and region, installed webOS and firmware versions, the setting
category/key and value format, and any readback or reboot observations. State
which items are measured, reported, inferred, or unknown. Do not copy an exact
model mapping to a sibling size or region without evidence.

New controls must remain read-only until the code has a scoped source, the TV
returns a recognized current value, and writes are verified by readback. Keep
agreement changes in LG's native consent flow. Do not add code that captures
audio, screenshots, or setting values for upload.

Firmware catalog contributions must preserve source URLs, package checksums,
exact model suffixes, and the source's redistribution terms. The current source
index has no license declaration; see [data/README.md](data/README.md).

## Build and validation

```sh
npm ci
npm test
npm run package
npm run test:ipk
```

The headless UI tests use Chromium and a simulated TV bridge. They verify
application behavior, not private firmware behavior or every physical TV.
Describe any physical-device validation separately from emulator results.

Keep pull requests focused. Do not include TV serial numbers, network or
household identifiers, credentials, unredacted reports, or local machine
names. Model and software versions are useful compatibility evidence.

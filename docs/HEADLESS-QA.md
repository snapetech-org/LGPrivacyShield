# Headless app and remote checks

`npm test` includes a browser-level check that runs the app's HTML, CSS,
`webOSTV.js`, device API, privacy model, and application code in Chromium at
1920×1080. Chromium receives webOS-style arrow, Enter, Escape, and Back events
through DevTools Protocol. A local `PalmServiceBridge` fixture returns
controlled Luna service responses; the browser does not connect to the TV or
an external service.

Run the complete suite and package checks with:

```sh
npm test
npm run package
npm run test:ipk
```

`test:ipk` checks the IPK archive layout, control metadata, architecture,
`appinfo.json` identity/version, and packaged AGPL/third-party license files
before extracting the payload and running the same headless browser scenarios
against it.

Run only the browser checks with `npm run test:headless`. If Chromium is not on
`PATH`, set `CHROMIUM_BIN=/path/to/chromium`.

The current 0.4.0 IPK is built with JavaScript targeted to Chromium 79. The
Homebrew IPK verifier result recorded for released v0.1.12 reports ES2017
syntax and no syntax incompatibility on its webOS 6.4.0/Chromium 79 profile or
later; its runtime API row remains a warning on 6.4.0. That verifier result is
for v0.1.12, not 0.3.4, and is a static package check rather than execution on
a 2021 TV.

Version 0.4.0 also tests the 405-build firmware archive catalog, exact model
and firmware matching, the B1 `W21U` OTA family, ambiguous region-package
reporting, and the sanitized firmware-registry importer. These checks validate
archive identity and import safety. They do not claim that any additional
firmware image was extracted or that another physical TV was tested.

## Verification record · 2026-10-25

- `npm test` passed: 63 Node.js tests and 51 Python tests.
- `npm run package` passed and produced a 150,372-byte IPK.
- `npm run test:ipk` passed: package metadata and all 23 packaged-app browser
  tests passed after extraction.
- Homebrew manifest generator 0.10.0 produced a matching 0.4.0 manifest with
  the same package size and SHA-256.
- SHA-256: `5416c250489d780986499b3c6a3d0840aec029f239e17cf0acc1d47330711020`

This verification includes the per-agreement effect map, TV-reported agreement
titles, the region/model terms caveat, and unmapped-agreement display. The
package was tested in Chromium and was not installed or launched on a TV.

The browser scenarios cover:

1. Successful SettingsService reads/writes for the exact C6H profile candidates,
   C2/webOS 22 Limit Ad Tracking and Smart Tips, platform Smart Tips, and the
   exact B5 and G5 model-map controls, G5 read-only preference status, and the
   exact OLED77C51LA C5 read-only preference map. It
   also checks repeated OK presses while a switch keeps focus, profile-specific
   presets, LG cookie values, readback, Do Not Sell's ad-manager request, saved
   setting restoration, and all 17 distinct control keys across supported
   model/software profiles.
2. Opening LG User Agreements only after the user selects the button. The test
   checks the exact Application Manager launch parameters, refreshes status
   after returning, and confirms PrivacyShield does not write EULA settings.
3. HBC snapshot and allowlisted writer fallback when direct setting access is
   denied.
4. Locked and navigable controls when both direct access and HBC are denied.
5. Public model and control evidence for an unmapped OLED outside the B/C/G
   matrix, a C1 with the webOS Unclutter network baseline, a C5 with a webOS
   26 runtime, G2
   launched on webOS 22 but running webOS 25, and G1 on webOS 6.x. These
   scenarios check launch/runtime platform separation, model rows, source
   counts, the C5 microphone-source conflict and switch report, the G1
   microphone listing, version-specific menu paths, public control findings,
   and that source-mapped controls are enabled only when a value is readable.
   A UI text/accessibility pass checks each section heading, every button,
   switch, link, and disclosure name, and rejects placeholder or maintainer
   wording. It navigates all five sections with the remote, checks the About
   layout and license/Ko-fi links, exercises Back and both refresh buttons, and
   checks the About screen's version.
   The B5 scenario checks the OLED55B56LA owner map, its three HbbTV controls,
   read-only mobile-access status, and that uncategorized keys are not queried.
   The G5 scenario checks `OLED65G5WUA` / webOS 10.2.1 control candidates,
   five read-only option values, and root snapshot/writer fallback without
   querying cached agreement flags as settings.
   The C6 scenario checks the exact C6H profile and sanitized firmware-index
   fixture. That index lists 14 of its 15 candidates and excludes `hbbTvDnt`;
   the UI must not request or write that key. The Glasshouse C6 model variant
   and C5 microphone-switch report remain separate.
6. All 108 combinations of 18 synthetic B1–B6, C1–C6, and G1–G6 model
   families with installed webOS 6.x and 22–26. Each checks launch-year versus
   installed-version separation, selected profile, exact per-key requests,
   profile overlays, zero writes on load, and browser-side errors. One missing
   key is exercised through a partial preset; the C5/webOS 25 cookie value
   domain and B5 HbbTV setting are written and read back. A separate B5 case
   exercises the HBC snapshot and writer path when direct service access fails.
7. Direct and HBC write-denial plus acknowledged-but-unchanged writes. Each
   must preserve the old value, restore the remote focus, and show no success
   message.
8. Each of the exact C6 profile's 15 candidate keys as both absent and present
   with an unrecognized value. Only that control may lock; readable controls
   and the remaining preset stay available, and profile discovery makes no
   writes. These per-key availability cases run without a firmware index; the
   separate C6 index fixture checks the real omission. A delayed write also
   receives a second remote OK press while busy;
   it must perform one write, keep focus on the switch, and wait for TV
   readback before reporting success. The privileged Python writer is checked
   against every allowlisted key in both on/off directions.

The extracted 0.3.4 IPK also passed these scenarios under Chromium
76.0.3803.0 (snapshot 662092), which caught and removed use of
`Element.replaceChildren()` from the shipped UI. That is an older-engine
compatibility check, not a webOS Simulator run: the package is compiled for
Chromium 79, and the harness supplies mock webOS service responses.

The all-family cross-product is intentionally synthetic. It tests selection
logic even for combinations that may not correspond to an available firmware
upgrade path. Unit checks match all 89 catalogued family-size variants against
all six platform profiles (534 profile selections) and cover each model-bearing
community row; this validates profile selection, not the presence of a setting
on each size or regional firmware.

The unmapped-device report scenario checks that the app generates two local QR
codes: one encodes the sanitized JSON, and one opens the public issue form. When
`zbarimg` is installed, the test decodes both images and compares the exact
payloads. QR generation uses no network request.

The catalog unit test checks all 18 family row counts against the pinned
49-row Glasshouse, 10-row CleanYourTV, and one-row webOS Unclutter snapshots.
It also checks source IDs, the 48/49 Glasshouse discrepancy, C6/C5 scope
boundaries, every listed size, and all model-bearing B/C/G community rows.

The test verifies the app's local Homebrew inventory, selected process names,
diagnostic upload flags, and agreement status rendering. It does not assert
that an observed service sent data or that an encrypted connection has any
particular contents.

Chromium uses a temporary profile. Set `PRIVACYSHIELD_HEADLESS_DIR` to place it
in a task-scoped scratch directory; otherwise the system temp directory is
used. The suite closes Chromium and removes that profile on success or failure.

To regenerate the screenshots embedded in the README and app guide, use:

```sh
mkdir -p docs/screenshots
PRIVACYSHIELD_DOC_SCREENSHOT_DIR=docs/screenshots npm run test:headless
```

The capture uses the synthetic C5/webOS 25 fixture and writes eight 1920×1080
PNG files. These images document the layout; they are not evidence that the
shown settings work on a physical TV. Other UI checks can save individual
screenshots with `PRIVACYSHIELD_CAPTURE_PATH`,
`PRIVACYSHIELD_REPORT_CAPTURE_PATH`, `PRIVACYSHIELD_ABOUT_CAPTURE_PATH`,
`PRIVACYSHIELD_CONTROLS_TOP_CAPTURE_PATH`, or
`PRIVACYSHIELD_CONTROLS_BOTTOM_CAPTURE_PATH` set to file paths.

These checks verify application behavior against simulated bridge responses.
They do not verify webOS permission registration, service access on a
particular TV or firmware, the contents of the TV's HBC installation, the
availability of every simulated model/OS combination, or physical Magic
Remote key delivery.

## Read-only TV checks over SSH

Check the active HBC registration without launching an app:

```sh
ssh root@TV 'python3 - --verify-live' < scripts/repair_hbc_permission_map.py
```

The output should show `lunabus.query` in `live_service.exec_groups`. If the
on-disk map exists but the active service lacks the group, HBC is advertising
stale groups; see [BRIDGE-FIX.md](BRIDGE-FIX.md).

Run the current snapshot script through SSH to read setting values without
writing them or opening PrivacyShield:

```sh
ssh root@TV 'python3 -' < webos-app/scripts/device_snapshot.py
```

This reports only the 15 allowlisted settings, seven agreement flags, selected
diagnostic flags, selected service names, and installed Homebrew app metadata.
It does not validate app-caller permissions because an SSH root process is not
the app's Luna caller. Do not use the writer script as a test: changing an
agreement must use LG's native User Agreements flow, and changing other values
should be deliberate and read back after the user chooses to do so.

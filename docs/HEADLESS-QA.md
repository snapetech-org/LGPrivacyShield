# Headless app and remote checks

`npm test` includes a browser-level check that runs the app's HTML, CSS,
`webOSTV.js`, device API, privacy model, and application code in Chromium at
1920×1080. Chromium receives webOS-style arrow, Enter, and Escape events
through DevTools Protocol. A local `PalmServiceBridge` fixture returns
controlled Luna service responses; the browser does not connect to the TV or
an external service.

Run the complete suite and package checks with:

```sh
npm test
npm run package
npm run test:ipk
```

Run only the browser checks with `npm run test:headless`. If Chromium is not on
`PATH`, set `CHROMIUM_BIN=/path/to/chromium`.

The browser scenarios cover:

1. Successful SettingsService reads/writes for all 15 switches, repeated OK
   presses while a switch keeps focus, the ten-setting preset, cookie values
   used by LG, value readback, Do Not Sell's dedicated ad-manager request, and
   remote navigation through each section.
2. Opening LG User Agreements only after the user selects the button. The test
   checks the exact Application Manager launch parameters, refreshes status
   after returning, and confirms PrivacyShield does not write EULA settings.
3. HBC snapshot and allowlisted writer fallback when direct setting access is
   denied.
4. Locked and navigable controls when both direct access and HBC are denied.
5. Public model and control evidence for an unmapped B5/webOS 25, a C1 with
   the webOS Unclutter network baseline, a C5 with a webOS 26 runtime, G2
   launched on webOS 22 but running webOS 25, and G1 on webOS 6.x. These
   scenarios check launch/runtime platform separation, model rows, source
   counts, the C5 microphone-source conflict and switch report, the G1
   microphone listing, version-specific menu paths, public control findings,
   and that settings, preset, and restore stay read-only without writer calls.
   The C6 scenario checks the matching Glasshouse software tuple while keeping
   the different model variant and C5-only microphone-switch report separate.

The catalog unit test checks all 18 family row counts against the pinned
49-row Glasshouse, 10-row CleanYourTV, and one-row webOS Unclutter snapshots.
It also checks source IDs, the 48/49 Glasshouse discrepancy, and the C6/C5
scope boundaries.

The test verifies the app's local Homebrew inventory, selected process names,
diagnostic upload flags, and agreement status rendering. It does not assert
that an observed service sent data or that an encrypted connection has any
particular contents.

Chromium uses a temporary profile. Set `PRIVACYSHIELD_HEADLESS_DIR` to place it
in a task-scoped scratch directory; otherwise the system temp directory is
used. The suite closes Chromium and removes that profile on success or failure.
To save a headless screenshot for review, set `PRIVACYSHIELD_CAPTURE_PATH` to a
file path.

These checks verify application behavior against simulated bridge responses.
They do not verify webOS permission registration, service access on a
particular TV or firmware, the contents of the TV's HBC installation, or
physical Magic Remote key delivery.

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

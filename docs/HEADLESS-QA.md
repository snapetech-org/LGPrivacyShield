# Headless app and remote checks

`npm test` includes a browser-level check that runs the app's real HTML, CSS,
`webOSTV.js`, device API, privacy model, and application code in Chromium at
1920×1080. The test sends webOS-style arrow, Enter, and Escape
events through Chromium's DevTools Protocol. A local `PalmServiceBridge` fixture
returns controlled Luna service responses; the test does not connect to the TV
or any external service.

Run just the browser checks with:

```sh
npm run test:headless
```

If Chromium is not on `PATH`, set its path explicitly:

```sh
CHROMIUM_BIN=/path/to/chromium npm run test:headless
```

After building, run the same scenarios against the actual IPK payload (including
the JavaScript minified by the webOS packager):

```sh
npm run package
npm run test:ipk
```

The test covers three service states:

1. Direct SettingsService reads and writes succeed. It navigates from Overview
   to Controls, applies the privacy preset, toggles each setting, checks that
   each OK press issues one write and verifies the readback, then navigates to
   Agreements and Evidence and opens the evidence disclosure.
2. Direct settings and agreement reads are denied while the HBC root snapshot
   and allowlisted writer succeed. It checks that settings and evidence render
   from the root snapshot and that a control change is written and read back
   through HBC.
3. Direct reads and HBC are denied. The controls show a clear unavailable
   state, remain reachable by remote arrows, and stay inert when Enter is
   pressed.

Chromium uses a temporary profile under the system temp directory. The suite
closes Chromium and removes that profile on success or failure. To retain a UI
capture for visual review, set `PRIVACYSHIELD_CAPTURE_PATH` to a file path for
the test run.

These checks verify application behavior against simulated bridge responses.
They do not verify webOS permission registration, service access on a particular
TV or firmware, the contents of the TV's HBC installation, or physical Magic
Remote key delivery. Keep those claims separate from headless test results.

## Live TV validation without launching the app

Check the active HBC registration over SSH. This verifies the on-disk map, its
manifest entry, and the ACG list that Luna Service has actually registered:

```sh
ssh root@TV 'python3 - --verify-live' < scripts/repair_hbc_permission_map.py
```

The output must show `lunabus.query` in `live_service.exec_groups`. If that
check fails after a file repair, HBC is still advertising stale groups; follow
[BRIDGE-FIX.md](BRIDGE-FIX.md) to restart the dynamic service, then repeat it.

To verify app permissions, use the already-running PrivacyShield page's remote
debugging target without navigating, reloading, or launching it. From the app
context, call `PrivacyShieldDeviceApi.rootExec("id")` and its bundled
`device_snapshot.py`; confirm `uid=0`, known values for all three controls,
and records for the seven supported agreement IDs. Then verify an idempotent
write/readback for each current setting. This proves the app caller's ACG
access; a request sent from an SSH root shell does not. Keep setting values and
agreement consent unchanged during validation.

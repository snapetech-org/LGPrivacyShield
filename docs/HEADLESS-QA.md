# Browser and package checks

## Run

```sh
npm test
npm run package
npm run test:ipk
```

`npm test` runs the Node.js and Python suites, including the headless browser
checks. To run those checks alone:

```sh
npm run test:headless
```

The browser harness uses Chromium at 1920×1080 with a local HTTP server,
mocked webOS service responses, and remote key events over DevTools Protocol.
Set `CHROMIUM_BIN` if Chromium is not on `PATH`. Set
`PRIVACYSHIELD_HEADLESS_DIR` and `TMPDIR` to task-scoped scratch paths when
running the suite in a shared environment.

## Coverage

The browser checks cover the four app pages, dark theme default and saved
light-theme preference, remote navigation and scrolling, mapped controls,
readback after writes, automatic and manually saved restore points, repeatable
manual restore, 1280×720 TV safe-area layout, agreement status and navigation,
Homebrew bridge fallback, and read-only behavior when access fails. They also
check that unmapped controls are not rendered, report generation uses one
GitHub-prefilled QR code, and the app does not access a clipboard or make a
network request while preparing it.

A synthetic matrix exercises B1–B6, C1–C6, and G1–G6 model/software
combinations. It checks profile selection and setting behavior against mocked
responses; it does not establish compatibility with every physical TV or
firmware build.

`test:ipk` checks package metadata, manifest identity, licenses, and excluded
research files, then extracts the IPK and runs the browser suite against the
packaged app. The harness does not install or launch the app on a TV.

## Screenshots

To generate the screenshots linked from the README:

```sh
PRIVACYSHIELD_DOC_SCREENSHOT_DIR=docs/screenshots npm run test:headless
```

The command writes twelve 1920×1080 PNG files: dark and light captures of
Overview, Controls top and bottom, LG agreements top and bottom, and About.
The fixture uses synthetic C5/webOS 25 data. Screenshots show the layout and
example values; they are not measurements from a physical TV.

## Read-only TV checks

To run the bounded snapshot from a rooted TV over SSH:

```sh
ssh root@TV 'python3 -' < webos-app/scripts/device_snapshot.py
```

The snapshot reads allowlisted privacy settings, the firmware category/key map,
and agreement choices. It does not read process lists, installed apps, network
status, or diagnostic-upload flags, and it does not write settings. An SSH root
request does not validate the app's own Luna permissions. See
[Homebrew bridge permissions](BRIDGE-FIX.md) for the caller-specific check.

## Verification record

2026-10-25:

- `npm test`: 58 Node.js tests and 48 Python tests passed.
- `npm run package`: produced a 71,008-byte 0.4.0 IPK, SHA-256
  `076cad5fe4d70010b925f549c5899b81f3d4ce8e04a30a6391fd6abf03419017`.
- `npm run test:ipk`: package metadata, licenses, research-file exclusions, and
  all 18 packaged-app browser checks passed.
- Successful reads leave the footer clear, and Overview shows no read timestamp.
- Installed and launched the IPK on an OLED77C6HUP running webOS 26,
  firmware 43.21.79. The app-manager reported PrivacyShield running after
  launch. This confirms install and startup on that TV.

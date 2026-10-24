# PrivacyShield

PrivacyShield is a local-first webOS Homebrew app for checking privacy settings,
optional LG agreement status, and observable local service/app state.

It does not record audio, inspect packet payloads, add a boot hook, change DNS,
or send analytics off the TV. Its control screen changes three user-facing
settings: Live Plus/ACR, hands-free voice recognition, and voice wake. It reads
each setting back after a change. A local restore point is stored in the app's
`localStorage`.

## Current scope

- **Controls:** Live Plus, far-field/hands-free voice, and voice wake.
- **Agreements:** status and likely feature impact for viewing, voice, ads,
  marketing, data partners, and the required Privacy Policy and Terms of Use.
  Consent changes must be made in LG Settings after reviewing the agreement;
  the app will not simulate legal consent by editing preference files.
- **Evidence:** model/network status, optional agreement readback, process
  presence, diagnostics upload configuration, and installed Homebrew apps.
- **Limits:** network destinations and payloads are not visible from a normal
  TV app. Use router or Pi-hole logs for DNS evidence and packet capture for
  bounded network testing. A process being present does not prove that it is
  capturing audio or sending data.
- **Remote use:** the app supports the LG remote's five-way arrows and OK
  button. The focus ring stays visible while navigating; Back returns to
  Overview and a second Back uses webOS's normal exit prompt.

The physical microphone status is shown as **not verified**. The manual page
for the OLED77C6HUP family depicts a bottom mic switch on one hardware layout
and a second layout without one; it does not identify which layout is fitted
to a particular unit. Software voice controls can disable hands-free voice
features but do not electrically disconnect a physical mic.

## Development

Requirements: Node.js 22+, npm, Python 3, Chromium, and the official
`@webos-tools/cli` package. The project pins the CLI version used to build the
IPK. Chromium runs the app in a local headless browser for remote-control and
service-bridge tests; set `CHROMIUM_BIN` if its executable is not on `PATH`.

```sh
npm ci
npm test
npm run package
```

The installable package is written to `dist/`. A successful build does not
prove service access on every firmware. PrivacyShield reads private settings
through SettingsService when allowed and uses a minimal root snapshot as a
fallback. Local app/process inventory always requires the Homebrew Channel
`exec` service. On webOS 26, HBC must also register the `lunabus.query` API
permission map. The exact map, service-manifest entry, and guarded root-only
repair/rollback helper are documented in [docs/BRIDGE-FIX.md](docs/BRIDGE-FIX.md).
The helper is for maintainers on a rooted TV and is not included in the IPK;
the app never patches HBC's system files. Without the map, private controls and
agreements show as unavailable and stay locked.

The 0.1.1 IPK installed on the test TV. During bridge validation, we found that
`ls-control scan-services` left an already-running HBC service advertising its
old access groups. The active `exec` permissions must be confirmed with
`ls-monitor`, and a stale HBC registration must be restarted before app-context
access can work; see [the permission map notes](docs/BRIDGE-FIX.md). Version
0.1.2 fixed remote focus movement and kept unreadable switches
navigable while locked. Version 0.1.3 revises the on-screen wording and status
messages. Version 0.1.4 keeps each switch focused while a setting write is
pending, so consecutive remote OK presses toggle it without moving away and
back. The headless suite drives the app in Chromium at
1920×1080 against simulated success, HBC fallback, and denied-service cases.
It checks D-pad navigation, preset and individual changes, write/readback
counts, evidence rendering, and locked-control behavior. This does not verify
the live TV bridge or physical remote delivery; those remain separate device
checks. See [docs/HEADLESS-QA.md](docs/HEADLESS-QA.md).

## Homebrew Channel submission

The public repository is
[snapetech-org/PrivacyShield](https://github.com/snapetech-org/PrivacyShield).
The current package is v0.1.4. Its installable IPK and matching manifest are
in `dist/`. The catalog entry is in
[submission/org.privacyshield.webos.yml](submission/org.privacyshield.webos.yml);
submit it to `webosbrew/apps-repo/packages/`.

Generate a manifest after each package rebuild with the Homebrew dev-toolbox:
`npm run manifest -- <public-icon-url> <public-source-url>`. It records the
current IPK size and hash. See [submission/README.md](submission/README.md) for
the catalog entry details.

## Privacy and permissions

The UI calls SettingsService, system information, and network status APIs. On
webOS TV 26+, the app declares the corresponding ACG groups plus
`lunabus.query` for the Homebrew root bridge. Older webOS releases ignore ACG
declarations. Settings and agreement status are read from the root snapshot
only when direct service queries are denied and the HBC bridge is available.
The bridge permission is security-sensitive: the upstream map grants the
`lunabus.query` group access to all methods exposed by HBC's elevated service.
Review [docs/BRIDGE-FIX.md](docs/BRIDGE-FIX.md) before enabling it.

Any root command is assembled from fixed app-owned paths and a strict setting
allowlist. No textbox or network input is passed to the root execution
service. Review the package source before installing it on a rooted TV.

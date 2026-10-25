# PrivacyShield

PrivacyShield is a local-first webOS Homebrew app for checking privacy settings,
optional LG agreement status, and observable local service/app state.

It does not record audio, inspect packet payloads, add a boot hook, change DNS,
or upload TV settings or viewing activity. Its control screen covers 15
settings for viewing recognition, voice, advertising, recommendations, HbbTV,
Bluetooth wake, and presence features. Each change is read back before success
is shown. A local restore point is stored in the app's `localStorage`.

## Current scope

- **Controls:** Live Plus, hands-free voice, voice wake, Limit Ad Tracking,
  Do Not Sell, Screen Saver Promotion, Home menu ads, Live Promotion, Home
  content recommendations, four HbbTV settings, Bluetooth wake, and Sleep on
  Absence. Ten reviewed settings are available in the recommended preset.
- **Agreements:** status and likely feature impact for viewing, voice, ads,
  marketing, data partners, and the required Privacy Policy and Terms of Use.
  The Agreements screen opens LG's native User Agreements flow; the app never
  edits cached acceptance flags.
- **Evidence:** model/network status, optional agreement readback, process
  presence, diagnostics upload configuration, and installed Homebrew apps.
- **Limits:** network destinations and payloads are not visible from a normal
  TV app. Use router or Pi-hole logs for DNS evidence and packet capture for
  bounded network testing. A process being present does not prove that it is
  capturing audio or sending data.
- **Remote use:** the app supports the LG remote's five-way arrows and OK
  button. The focus ring stays visible while navigating; Back returns to
  Overview and a second Back uses webOS's normal exit prompt.

The physical microphone switch is shown as **Check TV**. The official manual
for the OLED77C6HUP family shows one bottom-control layout with a mic switch and
another without one; it does not identify which layout is fitted to this set.
Software voice controls do not electrically disconnect a microphone.

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
0.1.2 fixed remote focus movement and kept unreadable switches navigable while
locked. Version 0.1.3 revised on-screen wording. Version 0.1.4 keeps each
switch focused during a write, so consecutive remote OK presses toggle it
without moving away and back. Version 0.1.5 adds six traced settings, diagnostic
upload status, and a button that opens LG's agreement screen. Version 0.1.6
adds six more settings traced through LG's Settings app and expands the
recommended preset to ten settings. Version 0.1.7 adds exact model, SDK, and
firmware matching, read-only behavior for unmapped sets, and a local compatibility
report with an offline validator. Version 0.1.10 consolidates the canonical
Glasshouse table (49 rows; its page declares 48 TVs), the full ten-row
CleanYourTV table, and separate C1/G1 network, G4 app, C5 root-audit, unassigned
webOS 26 settings and 2021 webOS 6 owner evidence, plus an LG firmware ACR
analysis pinned to build 43.21.73. The C5 microphone-switch reports retain
their separate model and software limits.
Version 0.1.11 compiles the packaged JavaScript for Chromium 79, the web engine
used by webOS 6. This allows the evidence and read-only views to load on 2021
sets; settings writes remain restricted to the exact validated C6H profile.
The public catalog covers all 18 B1–B6, C1–C6, and G1–G6 family labels, with
source-scoped device reports, privacy-control paths, model/menu references,
and limits. Twelve family labels have at least one matching community row in
these pinned sources. This makes the public evidence broader than the set we
own without claiming tests we have not run. The current source set has no
matching row for B1, B2, B3, B5, B6, or G6; model and menu references are still
shown for them. Community evidence is read-only research: root-run tools do not
grant the packaged app access or enable writes. The only writable profile is
the exact OLED77C6HUP / SDK 11.2.0 / firmware 43.21.79 sample. Every other
model/software cohort remains unsupported until its exact map is reviewed. See
[the public evidence catalog](docs/COMMUNITY-EVIDENCE.md) and
[the coverage matrix](docs/DEVICE-COMPATIBILITY.md) for source revisions,
model scope, conflicting reports, and the verification workflow. The headless
suite drives the app in Chromium at 1920×1080 against simulated success, HBC
fallback, denied-service, and unmapped-device cases. It checks D-pad navigation,
all 15 controls, repeated toggles, agreement-screen launch and refresh, report
privacy, evidence rendering, and locked-control behavior. This does not verify
the live TV bridge or physical remote delivery; those remain separate device
checks. See [docs/HEADLESS-QA.md](docs/HEADLESS-QA.md).

## Packaging and publication

The public repository is
[snapetech-org/PrivacyShield](https://github.com/snapetech-org/PrivacyShield).
The current package version is v0.1.11. The IPK and matching manifest are built
locally in `dist/`. The local Homebrew catalog draft includes a clickable Ko-fi
link and the catalog's `funding.ko_fi` entry. Homebrew publication is a separate
release step and requires maintainer sign-off.

## Privacy and permissions

The UI calls SettingsService, system information, network status,
Application Manager, LG's public ad-manager method, and HBC's root bridge. On
webOS TV 26+, the app declares the corresponding ACG groups, including
`applications.launcher` for the user-selected native agreement screen and
`lunabus.query` for the Homebrew root bridge. Older webOS releases ignore ACG
declarations. Settings and agreement status use the root snapshot only when
direct service queries are denied and the HBC bridge is available. The bridge
permission is security-sensitive: the upstream map grants `lunabus.query`
access to all methods exposed by HBC's elevated service. Review
[docs/BRIDGE-FIX.md](docs/BRIDGE-FIX.md) before enabling it.

Any root command is assembled from fixed app-owned paths and a strict setting
allowlist. No textbox or network input is passed to the root execution
service. Review the package source before installing it on a rooted TV.

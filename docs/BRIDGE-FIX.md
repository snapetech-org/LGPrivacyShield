# Homebrew Channel permission map

## Why the bridge was blocked

The installed Homebrew Channel on the LG C6 is version 0.7.3. PrivacyShield
already declares the `lunabus.query` ACG in its app manifest and calls
`org.webosbrew.hbchannel.service/exec`, but HBC's service manifest did not
register an API-permission file for that ACG. The service therefore rejected
the call with `Denied method call "exec" for category "/"` before the snapshot
script could run.

The upstream HBC fix adds one service API-permission file and registers its
absolute path in the HBC app manifest. It supports both
`/var/luna-service2-dev` and `/var/luna-service2`; the C6 has its live HBC
service and manifest in the `-dev` tree.
[Upstream HBC change 50fa99e](https://github.com/webosbrew/webos-homebrew-channel/commit/50fa99e)
is the source for this mapping.

## Permission map

| Caller or service | Declared permission | Target | Purpose |
|---|---|---|---|
| `org.privacyshield.webos` app | `settings.query` | `com.webos.settingsservice` | Read privacy toggles and agreement status directly when firmware permits it. |
| `org.privacyshield.webos` app | `systemconfig.query` | `com.webos.service.tv.systemproperty` | Read model and firmware details. |
| `org.privacyshield.webos` app | `network.query` | `com.palm.connectionmanager` | Read local network status. |
| `org.privacyshield.webos` app | `applications.launcher` | `com.webos.applicationManager/launch` | Open LG's agreement screen after the user selects the button. |
| `org.privacyshield.webos` app | `lunabus.query` | `org.webosbrew.hbchannel.service/exec` | Request the HBC root bridge for the bounded local snapshot and allowlisted setting writes. |
| `org.privacyshield.webos` app | `public` method on this firmware | `com.webos.service.admanager/updateDNS` | Apply the Do Not Sell choice through LG's settings path. |
| HBC `*.api.json` file (already installed) | `org.webosbrew.hbchannel.service.group`, `ares.webos.cli` | `org.webosbrew.hbchannel.service/*` | Existing HBC service and CLI access groups. |
| HBC `*.api.public.json` file (already installed) | `public` | `org.webosbrew.hbchannel.service/*` | Existing public HBC API methods. |
| HBC `*.api.lunabus.query.json` file (missing before repair) | `lunabus.query` | `org.webosbrew.hbchannel.service/*` | The missing webOS 26 caller group required by PrivacyShield's `exec` request. |

The app-side declarations are in `webos-app/appinfo.json`. The HBC-side map
must be present in **both** the API-permission directory and the HBC app
manifest's `apiPermissionFiles` list. The required map contents are:

```json
{
  "lunabus.query": [
    "org.webosbrew.hbchannel.service/*"
  ]
}
```

The TV's pre-existing HBC files map these groups as follows:

```json
{
  "org.webosbrew.hbchannel.service.group": ["org.webosbrew.hbchannel.service/*"],
  "ares.webos.cli": ["org.webosbrew.hbchannel.service/*"]
}
```

```json
{
  "public": ["org.webosbrew.hbchannel.service/*"]
}
```

For this C6, the exact TV files are:

```text
/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.json
/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.public.json
/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.lunabus.query.json
/var/luna-service2-dev/manifests.d/org.webosbrew.hbchannel.json
```

The manifest ID is `org.webosbrew.hbchannel`; the service ID is the distinct
`org.webosbrew.hbchannel.service`. Before repair, `apiPermissionFiles` contains
the existing `.api.json` and `.api.public.json` paths. After repair, it contains
those two unchanged entries plus the new `.api.lunabus.query.json` path below.
The resulting array is:

```json
[
  "/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.json",
  "/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.public.json",
  "/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.lunabus.query.json"
]
```

The manifest's `apiPermissionFiles` array must include this exact path:

```json
"/var/luna-service2-dev/api-permissions.d/org.webosbrew.hbchannel.service.api.lunabus.query.json"
```

`ls-control scan-services` reads the changed files into the Luna service
registry, but it does **not** replace the access groups of an HBC process that
is already registered. The TV can therefore have the correct files and still
deny the app. A successful scan is not a live permission check.

The live check is the `exec` method's `provides` list from:

```sh
ls-monitor -i org.webosbrew.hbchannel.service
```

It must include `lunabus.query`. The
`scripts/repair_hbc_permission_map.py --verify-live` command checks both the
on-disk map/manifest entry and this active list.
Live `--apply` and `--rollback` also verify the active list after scanning;
they return an error instead of claiming success if the dynamic HBC service is
still using stale groups. If it is stale, call HBC's `quit` method, make a new
request so the service registers again, and rerun `--verify-live`:

```sh
luna-send -i -f -n 1 luna://org.webosbrew.hbchannel.service/quit '{}'
```

For final validation, make the next request from PrivacyShield itself. A root
shell request can start the service but does not prove that the app's own
client identity has access.

## Current repair result

The map and manifest entry are present in the HBC 0.7.3 development tree. The
first filesystem check and `ls-control scan-services` were insufficient: the
active HBC service still had its old permission list. Restarting that dynamic
service and making a new request caused it to register the updated groups.
`ls-monitor -i` then showed `lunabus.query` in the live `exec` method's
`provides` list.

During v0.1.4 validation, the running PrivacyShield app's own Luna client
identity executed the bounded snapshot and allowlisted writer through HBC. The
bridge returned root identity, read three privacy settings and seven agreement
flags, and completed idempotent `off` write/readback checks for those three
controls. They were already `off`; that validation did not change them or
agreement consent. A later v0.1.5 app session toggled Live Plus off and on;
the other v0.1.5 additions were not individually tested live. The current
v0.1.6 package has not been installed or run on the TV. Direct SettingsService
reads remain denied on this firmware, so the app uses the HBC snapshot
fallback. System information and network status calls succeeded directly.

## Security scope

The group mapping targets `org.webosbrew.hbchannel.service/*`, so it exposes
every method that this HBC service registers to callers holding `lunabus.query`;
it is broader than a permission for only `exec`. This matches the upstream HBC
fix. The group gate is shared by clients with that ACG, not bound to the
PrivacyShield app ID. HBC's elevated `exec` method is security-sensitive.

PrivacyShield uses the bridge only with app-owned script paths and allowlisted
setting keys and values. Its snapshot returns only reviewed privacy settings
present in the firmware key index, seven explicit agreement flags, selected
local process names, diagnostic upload flags, and installed Homebrew app
IDs/titles/versions. The permission map does not add a background service,
change EULA consent, or alter DNS.
Review this scope before
installing the app on a rooted TV.

## Apply and rollback

`scripts/repair_hbc_permission_map.py` defaults to a dry run. It validates the
HBC app ID, service registration, existing map, and path layout before making
changes. Apply it **as root on the TV**, with a task-specific backup path:

```sh
ssh root@TV 'python3 - --apply --backup-dir /tmp/privacyshield-hbc-backups' \
  < scripts/repair_hbc_permission_map.py
```

The helper writes the map first, then adds its path to the manifest. It backs
up the manifest and any pre-existing map, writes atomically, and preserves the
manifest's mode and owner. It refuses unexpected map contents and is idempotent. The
output prints the exact backup bundle path. Roll back with that path:

```sh
ssh root@TV 'python3 - --rollback /tmp/privacyshield-hbc-backups/hbc-permission-map-…' \
  < scripts/repair_hbc_permission_map.py
```

Rollback checks that the files still match the repaired state and refuses to
overwrite later edits. The helper is a maintainer repair utility; it is not
included in the webOS IPK, and the app itself cannot patch HBC's system files.

Run its offline tests with `npm test`. On the TV, validate the active
registration without opening the app:

```sh
ssh root@TV 'python3 - --verify-live' < scripts/repair_hbc_permission_map.py
```

Then validate the app-context bridge while the app is already running. Do not
treat the filesystem check, `scan-services`, a root-shell request, or the
headless browser fixture alone as proof that app permissions work on a TV.

The Chromium suite exercises navigation and simulated direct-service success,
SettingsService denial with HBC snapshot/write fallback, and complete bridge
denial. It does not prove the live TV's permission registration. The separate
SSH validation above checks `ls-monitor`; an app-context request against the
running TV checks the caller identity and actual bridge behavior. See
[HEADLESS-QA.md](HEADLESS-QA.md).

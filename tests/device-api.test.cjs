const assert = require("node:assert/strict");
const test = require("node:test");

const api = require("../webos-app/src/device-api.js");

test("runs only the bundled root snapshot script", async () => {
  let captured;
  globalThis.webOS = {
    fetchAppRootPath: () => "file:///media/developer/apps/usr/palm/applications/org.privacyshield.webos/",
    service: {
      request(uri, options) {
        captured = { uri, method: options.method, parameters: options.parameters };
        options.onSuccess({ returnValue: true, stdoutString: "{}" });
      }
    }
  };

  await api.rootSnapshot();
  assert.deepEqual(captured, {
    uri: "luna://org.webosbrew.hbchannel.service",
    method: "exec",
    parameters: {
      command: "'python3' '/media/developer/apps/usr/palm/applications/org.privacyshield.webos/scripts/device_snapshot.py'"
    }
  });
  assert.equal(api.rootExec, undefined, "the app API must not expose an arbitrary root command");

  delete globalThis.webOS;
});

test("rejects a webOS app root outside the two supported install directories", async () => {
  let command;
  globalThis.webOS = {
    fetchAppRootPath: () => "/tmp/untrusted-app",
    service: {
      request(uri, options) {
        command = options.parameters.command;
        options.onSuccess({ returnValue: true, stdoutString: "{}" });
      }
    }
  };

  await api.rootSnapshot();
  assert.equal(
    command,
    "'python3' '/media/developer/apps/usr/palm/applications/org.privacyshield.webos/scripts/device_snapshot.py'"
  );
  delete globalThis.webOS;
});

test("root setting writes accept only allowlisted keys and on/off values", async () => {
  const commands = [];
  globalThis.webOS = {
    service: {
      request(uri, options) {
        commands.push(options.parameters.command);
        options.onSuccess({ returnValue: true });
      }
    }
  };

  await api.rootSetSetting("livePlus", "off");
  assert.deepEqual(commands, [
    "'python3' '/media/developer/apps/usr/palm/applications/org.privacyshield.webos/scripts/device_control.py' 'livePlus' 'off'"
  ]);
  await assert.rejects(api.rootSetSetting("livePlus; touch /tmp/pwned", "off"), /Unsupported setting/);
  await assert.rejects(api.rootSetSetting("livePlus", "on; touch /tmp/pwned"), /Unsupported setting/);
  assert.equal(commands.length, 1, "invalid root write requests must not reach Homebrew");

  delete globalThis.webOS;
});

test("requests the required public system information keys", async () => {
  let captured;
  globalThis.webOS = {
    service: {
      request(uri, options) {
        captured = { uri, method: options.method, parameters: options.parameters };
        options.onSuccess({ returnValue: true });
      }
    }
  };

  await api.getSystemInfo();
  assert.deepEqual(captured, {
    uri: "luna://com.webos.service.tv.systemproperty",
    method: "getSystemInfo",
    parameters: { keys: ["firmwareVersion", "modelName", "sdkVersion"] }
  });

  delete globalThis.webOS;
});

test("queries only the requested setting and uses the legacy service only when the current service is missing", async () => {
  const captured = [];
  globalThis.webOS = {
    service: {
      request(uri, options) {
        captured.push({ uri, method: options.method, parameters: options.parameters });
        if (uri === "luna://com.webos.settingsservice") {
          options.onFailure({ errorText: "Service does not exist" });
          return;
        }
        options.onSuccess({ returnValue: true, settings: { livePlus: "off" } });
      }
    }
  };

  const response = await api.getSettings("option", ["livePlus"]);
  assert.deepEqual(response.settings, { livePlus: "off" });
  assert.deepEqual(captured, [
    {
      uri: "luna://com.webos.settingsservice",
      method: "getSystemSettings",
      parameters: { category: "option", keys: ["livePlus"], subscribe: false }
    },
    {
      uri: "luna://com.webos.service.settings",
      method: "getSystemSettings",
      parameters: { category: "option", keys: ["livePlus"], subscribe: false }
    }
  ]);

  delete globalThis.webOS;
});

test("does not try the legacy service after a permission denial", async () => {
  const calls = [];
  globalThis.webOS = {
    service: {
      request(uri, options) {
        calls.push(uri);
        options.onFailure({ errorText: "SettingsService read permission denied" });
      }
    }
  };

  await assert.rejects(api.getSettings("option", ["livePlus"]), /permission denied/);
  assert.deepEqual(calls, ["luna://com.webos.settingsservice"]);
  delete globalThis.webOS;
});

test("opens LG's native agreement screen with the reviewed EULA context", async () => {
  let captured;
  globalThis.webOS = {
    service: {
      request(uri, options) {
        captured = { uri, method: options.method, parameters: options.parameters };
        options.onSuccess({ returnValue: true });
      }
    }
  };

  await api.openAgreements();
  assert.deepEqual(captured, {
    uri: "luna://com.webos.applicationManager",
    method: "launch",
    parameters: { id: "com.webos.app.firstuse-overlay", params: { target: "eula", context: "all" } }
  });

  delete globalThis.webOS;
});

test("uses LG's ad-manager path for Do Not Sell instead of writing cached settings", async () => {
  let captured;
  globalThis.webOS = {
    service: {
      request(uri, options) {
        captured = { uri, method: options.method, parameters: options.parameters };
        options.onSuccess({ returnValue: true });
      }
    }
  };

  await api.setDoNotSell("on");
  assert.deepEqual(captured, {
    uri: "luna://com.webos.service.admanager",
    method: "updateDNS",
    parameters: { status: "on" }
  });

  delete globalThis.webOS;
});

const assert = require("node:assert/strict");
const test = require("node:test");

const api = require("../webos-app/src/device-api.js");

test("converts webOSTV.js file URL into a root filesystem path", () => {
  globalThis.webOS = {
    fetchAppRootPath: () => "file:///media/developer/apps/usr/palm/applications/org.privacyshield.webos/"
  };

  assert.equal(
    api.appRootPath(),
    "/media/developer/apps/usr/palm/applications/org.privacyshield.webos"
  );

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

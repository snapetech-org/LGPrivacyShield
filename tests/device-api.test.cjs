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

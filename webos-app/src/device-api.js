(function (root) {
  "use strict";

  const SETTINGS = "luna://com.webos.settingsservice";
  const HBC = "luna://org.webosbrew.hbchannel.service";
  const ADMANAGER = "luna://com.webos.service.admanager";
  const APPLICATION_MANAGER = "luna://com.webos.applicationManager";

  function request(uri, method, parameters) {
    return new Promise((resolve, reject) => {
      if (!root.webOS || !root.webOS.service || typeof root.webOS.service.request !== "function") {
        reject(new Error("webOS service bridge is unavailable"));
        return;
      }
      try {
        root.webOS.service.request(uri, {
          method,
          parameters: parameters || {},
          onSuccess(response) {
            if (response && response.returnValue === false) {
              reject(new Error(response.errorText || "TV service rejected the request"));
            } else {
              resolve(response || {});
            }
          },
          onFailure(error) {
            reject(new Error((error && (error.errorText || error.message)) || "TV service request failed"));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function getSettings(category, keys) {
    return request(SETTINGS, "getSystemSettings", { category, keys, subscribe: false });
  }

  function getAgreements() {
    return request(SETTINGS, "getSystemSettings", { keys: ["eulaStatus", "eulaInfoNetwork"], subscribe: false });
  }

  function setSetting(category, key, value) {
    return request(SETTINGS, "setSystemSettings", { category, settings: { [key]: value } });
  }

  function setDoNotSell(value) {
    if (value !== "on" && value !== "off") {
      return Promise.reject(new Error("Invalid Do Not Sell value"));
    }
    return request(ADMANAGER, "updateDNS", { status: value });
  }

  function openAgreements() {
    return request(APPLICATION_MANAGER, "launch", {
      id: "com.webos.app.firstuse-overlay",
      params: { target: "eula", context: "all" }
    });
  }

  function getSystemInfo() {
    return request("luna://com.webos.service.tv.systemproperty", "getSystemInfo", {
      keys: ["firmwareVersion", "modelName", "sdkVersion"]
    });
  }

  function getNetworkStatus() {
    return request("luna://com.palm.connectionmanager", "getStatus", { subscribe: false });
  }

  function rootExec(command) {
    return request(HBC, "exec", { command });
  }

  function appRootPath() {
    try {
      if (root.webOS && typeof root.webOS.fetchAppRootPath === "function") {
        const path = root.webOS.fetchAppRootPath();
        if (typeof path === "string" && path.length) {
          if (/^file:\/\//i.test(path)) {
            return decodeURIComponent(new URL(path).pathname).replace(/\/$/, "");
          }
          return path.replace(/\/$/, "");
        }
      }
    } catch (_) { /* older webOS builds may not expose this helper */ }
    return "/media/developer/apps/usr/palm/applications/org.privacyshield.webos";
  }

  const api = Object.freeze({
    getAgreements,
    getNetworkStatus,
    getSettings,
    getSystemInfo,
    openAgreements,
    rootExec,
    appRootPath,
    setDoNotSell,
    setSetting
  });
  root.PrivacyShieldDeviceApi = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

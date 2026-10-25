(function (root) {
  "use strict";

  const SETTINGS = "luna://com.webos.settingsservice";
  const LEGACY_SETTINGS = "luna://com.webos.service.settings";
  const HBC = "luna://org.webosbrew.hbchannel.service";
  const ADMANAGER = "luna://com.webos.service.admanager";
  const APPLICATION_MANAGER = "luna://com.webos.applicationManager";
  const DEV_APP_ROOT = "/media/developer/apps/usr/palm/applications/org.privacyshield.webos";
  const SYSTEM_APP_ROOT = "/usr/palm/applications/org.privacyshield.webos";
  const APP_ROOTS = new Set([DEV_APP_ROOT, SYSTEM_APP_ROOT]);
  const ROOT_SETTING_KEYS = new Set([
    "livePlus", "turnOnByVoice", "voiceLongDistance", "lmt", "screenSaverAd",
    "homePromotion", "livePromotion", "contentRecommendation", "thirdPartyCookie",
    "hbbTV", "hbbTvDnt", "hbbTvDeviceId", "bleAdvertisingOnOff", "homeSenseAbsence",
    "aiNudge", "aiSettingsNudge", "doNotSellMyPersonalInformation"
  ]);

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
    return settingsRequest("getSystemSettings", { category, keys, subscribe: false });
  }

  function getAgreements() {
    return settingsRequest("getSystemSettings", { keys: ["eulaStatus", "eulaInfoNetwork"], subscribe: false });
  }

  function setSetting(category, key, value) {
    return settingsRequest("setSystemSettings", { category, settings: { [key]: value } });
  }

  function missingSettingsService(error) {
    return /(?:unknown|missing|unavailable) service|service.{0,32}(?:not found|does not exist)|method.{0,32}(?:not found|does not exist)/i
      .test(String(error && error.message || error || ""));
  }

  function settingsRequest(method, parameters) {
    return request(SETTINGS, method, parameters).catch((error) => {
      if (!missingSettingsService(error)) throw error;
      return request(LEGACY_SETTINGS, method, parameters);
    });
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

  function appRootPath() {
    try {
      if (root.webOS && typeof root.webOS.fetchAppRootPath === "function") {
        const path = root.webOS.fetchAppRootPath();
        if (typeof path === "string" && path.length) {
          let appPath = path;
          if (/^file:\/\//i.test(path)) {
            appPath = decodeURIComponent(new URL(path).pathname);
          }
          appPath = appPath.replace(/\/+$/, "");
          if (APP_ROOTS.has(appPath)) return appPath;
        }
      }
    } catch (_) { /* older webOS builds may not expose this helper */ }
    return DEV_APP_ROOT;
  }

  function shellQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  function runBundledScript(scriptName, args = []) {
    const scriptPath = `${appRootPath()}/scripts/${scriptName}`;
    const command = ["python3", scriptPath, ...args].map(shellQuote).join(" ");
    return request(HBC, "exec", { command });
  }

  function rootSnapshot() {
    return runBundledScript("device_snapshot.py");
  }

  function rootSetSetting(key, value) {
    if (!ROOT_SETTING_KEYS.has(key) || (value !== "on" && value !== "off")) {
      return Promise.reject(new Error("Unsupported setting or value"));
    }
    return runBundledScript("device_control.py", [key, value]);
  }

  const api = Object.freeze({
    getAgreements,
    getSettings,
    getSystemInfo,
    missingSettingsService,
    openAgreements,
    rootSetSetting,
    rootSnapshot,
    setDoNotSell,
    setSetting
  });
  root.LGPrivacyShieldDeviceApi = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

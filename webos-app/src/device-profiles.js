(function (root, factory) {
  const profiles = factory();
  if (typeof module === "object" && module.exports) module.exports = profiles;
  else root.PrivacyShieldDeviceProfiles = profiles;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SDK_MAJOR_TO_WEBOS = Object.freeze({
    "6": "6.x", "7": "22", "8": "23", "9": "24", "10": "25", "11": "26"
  });
  const ENGINE_MAJOR_TO_WEBOS = Object.freeze({
    "79": "6.x", "87": "22", "94": "23", "108": "24", "120": "25", "132": "26"
  });
  const MODEL_FAMILIES = Object.freeze({
    B1: Object.freeze(["55", "65", "77"]),
    C1: Object.freeze(["48", "55", "65", "77", "83"]),
    G1: Object.freeze(["55", "65", "77", "83"]),
    B2: Object.freeze(["55", "65", "77"]),
    C2: Object.freeze(["42", "48", "55", "65", "77", "83"]),
    G2: Object.freeze(["55", "65", "77", "83", "97"]),
    B3: Object.freeze(["55", "65", "77"]),
    C3: Object.freeze(["42", "48", "55", "65", "77", "83"]),
    G3: Object.freeze(["55", "65", "77", "83"]),
    B4: Object.freeze(["48", "55", "65", "77", "83"]),
    C4: Object.freeze(["42", "48", "55", "65", "77", "83"]),
    G4: Object.freeze(["55", "65", "77", "83", "97"]),
    B5: Object.freeze(["48", "55", "65", "77", "83"]),
    C5: Object.freeze(["42", "48", "55", "65", "77", "83"]),
    G5: Object.freeze(["48", "55", "65", "77", "83", "97"]),
    B6: Object.freeze(["48", "55", "65", "77", "83"]),
    C6: Object.freeze(["42", "48", "55", "65", "77", "83"]),
    G6: Object.freeze(["48", "55", "65", "77", "83", "97"])
  });

  function detectPlatform(userAgent, sdkVersion) {
    if (typeof userAgent !== "string" || !/\bWeb0S\s*;/i.test(userAgent)) return null;
    const engine = userAgent.match(/\bChrome\/(\d+)\./i);
    const sdk = typeof sdkVersion === "string" && sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (!engine || !sdk) return null;
    const enginePlatform = ENGINE_MAJOR_TO_WEBOS[engine[1]];
    const sdkPlatform = SDK_MAJOR_TO_WEBOS[sdk[1]];
    if (!enginePlatform || enginePlatform !== sdkPlatform) return null;
    return Object.freeze({ version: enginePlatform, engineMajor: Number(engine[1]) });
  }

  function cohortForModel(model) {
    if (typeof model !== "string") return null;
    const match = model.trim().match(/^\s*(?:LG\s*)?(?:OLED)?(\d{2,3})([BCG][1-6])[A-Z0-9.-]*\s*$/i);
    if (!match) return null;
    const series = match[2].toUpperCase();
    const sizes = MODEL_FAMILIES[series];
    return sizes && sizes.includes(match[1]) ? Object.freeze({ series }) : null;
  }

  return Object.freeze({ ENGINE_MAJOR_TO_WEBOS, MODEL_FAMILIES, SDK_MAJOR_TO_WEBOS, cohortForModel, detectPlatform });
});

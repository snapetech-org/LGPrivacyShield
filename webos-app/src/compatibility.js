(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PrivacyShieldCompatibility = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const APP_VERSION = "0.1.12";
  const CONTROL_KEYS = Object.freeze([
    "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt",
    "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion",
    "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId",
    "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence"
  ]);
  const PREVIOUSLY_WRITE_TESTED = new Set(["livePlus", "voiceLongDistance", "turnOnByVoice"]);

  const PROFILES = Object.freeze([
    Object.freeze({
      id: "lg-oled77c6hup-webos26-43.21.79",
      modelAliases: Object.freeze(["OLED77C6HUP", "LG OLED77C6HUP"]),
      sdkVersion: "11.2.0",
      firmwareVersion: "43.21.79",
      displayName: "LG OLED77C6HUP · webOS 26",
      evidenceLevel: "source-mapped",
      sampleCount: 1,
      sampleNote: "Mapped from one C6 sample. Other units and firmware builds are not cross-validated.",
      controls: Object.freeze(Object.fromEntries(CONTROL_KEYS.map((key) => [key, Object.freeze({
        mapping: "source-mapped",
        readEvidence: "device-read-verified",
        priorWriteReadback: PREVIOUSLY_WRITE_TESTED.has(key)
      })])))
    })
  ]);

  function exactString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function matchProfile(device) {
    const model = exactString(device && device.model).toUpperCase();
    const sdkVersion = exactString(device && device.sdk);
    const firmwareVersion = exactString(device && device.firmware);
    if (!model || !sdkVersion || !firmwareVersion) return null;
    return PROFILES.find((profile) =>
      profile.modelAliases.some((alias) => alias.toUpperCase() === model)
      && profile.sdkVersion === sdkVersion
      && profile.firmwareVersion === firmwareVersion
    ) || null;
  }

  function controlStatus(profile, key) {
    if (!profile) {
      return { mapped: false, writable: false, reason: "This model and software version have not been mapped." };
    }
    const evidence = profile.controls && profile.controls[key];
    if (!evidence || evidence.mapping !== "source-mapped") {
      return { mapped: false, writable: false, reason: "This control has not been mapped for this model and software version." };
    }
    return { mapped: true, writable: true, reason: "Mapped for this model and firmware; the TV must confirm every change." };
  }

  function canWrite(profile, key) {
    return controlStatus(profile, key).writable;
  }

  function canApplyPreset(profile, preset) {
    return Boolean(profile && Array.isArray(preset) && preset.length > 0
      && preset.every(({ key }) => canWrite(profile, key)));
  }

  function safeIdentity(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (!text || text.length > 64 || /^(model|version|firmware|software).*(unavailable|unknown|not available)$/i.test(text)
      || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(text)
      || /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(text)
      || !/^[A-Za-z0-9 ._()+-]+$/.test(text)) return null;
    return text;
  }

  function createReport(device, profile, access, controls) {
    const source = access && typeof access === "object" ? access : {};
    const list = Array.isArray(controls) ? controls : CONTROL_KEYS.map((key) => ({ key }));
    const controlReads = {};
    for (const control of list) {
      if (!control || !CONTROL_KEYS.includes(control.key)) continue;
      controlReads[control.key] = Boolean(source.controlReads && source.controlReads[control.key]);
    }
    const mappedCount = profile && profile.controls
      ? CONTROL_KEYS.filter((key) => controlStatus(profile, key).mapped).length
      : 0;
    return {
      schemaVersion: 1,
      appVersion: APP_VERSION,
      device: {
        model: safeIdentity(device && device.model),
        sdkVersion: safeIdentity(device && device.sdk),
        firmwareVersion: safeIdentity(device && device.firmware)
      },
      compatibility: {
        profileId: profile ? profile.id : null,
        evidenceLevel: profile ? profile.evidenceLevel : "unmapped",
        sampleCount: profile ? profile.sampleCount : 0,
        mappedControlCount: mappedCount
      },
      apiAccess: {
        systemInfo: Boolean(source.systemInfo),
        settingsService: ["available", "partial", "unavailable"].includes(source.settingsService)
          ? source.settingsService : "unavailable",
        hbcSnapshot: Boolean(source.hbcSnapshot)
      },
      controlReads
    };
  }

  return Object.freeze({
    APP_VERSION,
    CONTROL_KEYS,
    PROFILES,
    canApplyPreset,
    canWrite,
    controlStatus,
    createReport,
    matchProfile
  });
});

(function (root, factory) {
  const profiles = typeof module === "object" && module.exports
    ? require("./device-profiles.js")
    : null;
  if (typeof module === "object" && module.exports) module.exports = factory(profiles, root);
  else root.LGPrivacyShieldCompatibility = factory(root.LGPrivacyShieldDeviceProfiles, root);
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function (profileData, globalRoot) {
  "use strict";

  const APP_VERSION = "0.4.2";
  const CONTROL_KEYS = Object.freeze([
    "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt",
    "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion",
    "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId",
    "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence",
    "aiNudge", "aiSettingsNudge"
  ]);
  const PREVIOUSLY_WRITE_TESTED = new Set(["livePlus", "voiceLongDistance", "turnOnByVoice"]);
  const C6H_CONTROL_KEYS = Object.freeze(CONTROL_KEYS.filter((key) => key !== "aiNudge" && key !== "aiSettingsNudge"));

  function objectFromEntries(entries) {
    const result = {};
    entries.forEach(([key, value]) => {
      Object.defineProperty(result, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    });
    return result;
  }

  // These shared maps describe settings whose key, category and on/off values
  // are published by the cited projects. A map only nominates a setting; a TV
  // must return a readable value before the app enables its switch.
  const BASE_CONTROLS = Object.freeze({
    livePlus: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" }),
    screenSaverAd: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" }),
    homePromotion: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" }),
    livePromotion: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" }),
    contentRecommendation: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" })
  });

  // Platform maps are intentionally narrow. They are taken from published
  // SettingsService code and fixtures, not inferred from a family name. A
  // settings key that the firmware does not expose remains unavailable.
  const PLATFORM_MAPS = Object.freeze({
    "6.x": Object.freeze({
      id: "webos-6",
      controls: Object.freeze({ ...BASE_CONTROLS }),
      sourceIds: Object.freeze(["glasshouse"])
    }),
    "22": Object.freeze({
      id: "webos-22",
      controls: Object.freeze({
        ...BASE_CONTROLS,
        lmt: Object.freeze({ source: "glasshouse+model-guide", mapping: "platform-source-mapped" })
      }),
      sourceIds: Object.freeze(["glasshouse", "modelCatalog"])
    }),
    "23": Object.freeze({
      id: "webos-23",
      controls: Object.freeze({
        ...BASE_CONTROLS,
        lmt: Object.freeze({ source: "glasshouse+model-guide", mapping: "platform-source-mapped" })
      }),
      sourceIds: Object.freeze(["glasshouse", "modelCatalog"])
    }),
    "24": Object.freeze({
      id: "webos-24",
      controls: Object.freeze({
        ...BASE_CONTROLS,
        lmt: Object.freeze({ source: "glasshouse+model-guide", mapping: "platform-source-mapped" }),
        aiNudge: Object.freeze({ source: "glasshouse-webos24", mapping: "platform-source-mapped" }),
        aiSettingsNudge: Object.freeze({ source: "glasshouse-webos24", mapping: "platform-source-mapped" })
      }),
      sourceIds: Object.freeze(["glasshouse", "modelCatalog"])
    }),
    "25": Object.freeze({
      id: "webos-25",
      controls: Object.freeze({
        ...BASE_CONTROLS,
        lmt: Object.freeze({ source: "glasshouse+model-guide", mapping: "platform-source-mapped" })
      }),
      sourceIds: Object.freeze(["glasshouse", "modelCatalog"])
    }),
    "26": Object.freeze({
      id: "webos-26",
      controls: Object.freeze({
        livePlus: Object.freeze({ source: "glasshouse+webos-debloat", mapping: "platform-source-mapped" }),
        screenSaverAd: Object.freeze({ source: "glasshouse", mapping: "platform-source-mapped" }),
        homePromotion: Object.freeze({ source: "glasshouse+webos-debloat", mapping: "platform-source-mapped" }),
        livePromotion: Object.freeze({ source: "glasshouse+webos-debloat", mapping: "platform-source-mapped" }),
        contentRecommendation: Object.freeze({ source: "glasshouse+webos-debloat", mapping: "platform-source-mapped" }),
        lmt: Object.freeze({ source: "glasshouse+model-guide", mapping: "platform-source-mapped" })
      }),
      sourceIds: Object.freeze(["glasshouse", "webosDebloat"])
    })
  });

  // The Glasshouse C2 entries are tied to this cohort and installed platform.
  const COHORT_CONTROLS = Object.freeze({
    C2: Object.freeze({
      "22": Object.freeze({
        lmt: Object.freeze({ source: "glasshouse-dashboard-c2", mapping: "cohort-source-mapped" }),
        aiNudge: Object.freeze({ source: "glasshouse-c2-webos22-fixture", mapping: "cohort-source-mapped" }),
        aiSettingsNudge: Object.freeze({ source: "glasshouse-c2-webos22-fixture", mapping: "cohort-source-mapped" })
      })
    })
  });

  // Glasshouse reports its C5 privacy map on webOS 10.3.1 but does not publish
  // the scanned set's exact model or firmware. Keep the map at that software
  // cohort.
  const SOFTWARE_COHORT_MAPS = Object.freeze({
    C5: Object.freeze({
      "10.3.1": Object.freeze({
        platformVersion: "25",
        sourceIds: Object.freeze(["glasshouse"]),
        controls: Object.freeze({
          voiceLongDistance: Object.freeze({ source: "glasshouse-c5", mapping: "cohort-source-mapped" }),
          thirdPartyCookie: Object.freeze({ source: "glasshouse-c5", mapping: "cohort-source-mapped" })
        })
      })
    })
  });

  // These observations name an exact B5 model and SettingsService route. The
  // published report omits its firmware number, so retain that limitation in
  // the UI instead of treating this as an exact firmware profile.
  const MODEL_CONTROL_MAPS = Object.freeze([
    Object.freeze({
      id: "own-your-glass-b5-oled55b56la-sdk10.3.1",
      model: "OLED55B56LA",
      sdkVersion: "10.3.1",
      platformVersion: "25",
      sourceId: "ownYourGlass",
      source: "own-your-glass-b5",
      controls: Object.freeze({
        livePlus: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        screenSaverAd: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        livePromotion: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        lmt: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        aiNudge: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        hbbTvDnt: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        hbbTvDeviceId: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" }),
        hbbTV: Object.freeze({ source: "own-your-glass-b5", mapping: "model-source-mapped" })
      })
    }),
    Object.freeze({
      id: "level1techs-g5-oled65g5wua-webos10.2.1",
      model: "OLED65G5WUA",
      sdkVersion: "10.2.1",
      platformVersion: "25",
      sourceId: "level1techsG5",
      source: "level1techs-g5",
      controls: Object.freeze({
        screenSaverAd: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" }),
        homePromotion: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" }),
        aiNudge: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" })
      })
    })
  ]);


  const EXACT_PROFILES = Object.freeze([
    Object.freeze({
      id: "lg-oled77c6hup-webos26-43.21.79",
      modelAliases: Object.freeze(["OLED77C6HUP", "LG OLED77C6HUP"]),
      sdkVersion: "11.2.0",
      firmwareVersion: "43.21.79",
      cohort: "C6",
      platformVersion: "26",
      mappingScope: "exact-device-firmware",
      evidenceLevel: "source-mapped",
      sampleCount: 1,
      sourceIds: Object.freeze(["glasshouse", "webosDebloat", "privacyshield-c6"]),
      controls: Object.freeze(objectFromEntries(C6H_CONTROL_KEYS.map((key) => [key, Object.freeze({
        mapping: "source-mapped",
        source: "privacyshield-c6",
        readEvidence: "device-read-verified",
        priorWriteReadback: PREVIOUSLY_WRITE_TESTED.has(key)
      })])))
    })
  ]);

  function profiles() {
    return profileData || globalRoot.LGPrivacyShieldDeviceProfiles || null;
  }

  function exactString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function canonicalModel(value) {
    const model = exactString(value).toUpperCase().replace(/^\[LG\]\s*/, "").replace(/^LG\s+/, "");
    const match = model.match(/^(OLED\d{2,3}[A-Z0-9]+)(?:\.[A-Z0-9]+)?$/);
    return match ? match[1] : model;
  }

  function matchExactProfile(device) {
    const model = canonicalModel(device && device.model);
    const sdkVersion = exactString(device && device.sdk);
    const firmwareVersion = exactString(device && device.firmware);
    if (!model || !sdkVersion || !firmwareVersion) return null;
    const platformVersion = exactString(device && device.platformVersion);
    const profile = EXACT_PROFILES.find((candidate) =>
      candidate.modelAliases.some((alias) => canonicalModel(alias) === model)
      && candidate.sdkVersion === sdkVersion
      && candidate.firmwareVersion === firmwareVersion
    );
    if (!profile) return null;
    const profileMap = profiles();
    const sdkMajor = sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    const sdkPlatform = sdkMajor && profileMap && profileMap.SDK_MAJOR_TO_WEBOS[sdkMajor[1]];
    if (sdkPlatform !== profile.platformVersion) return null;
    if (platformVersion && platformVersion !== profile.platformVersion) return null;
    return profile;
  }

  function familyProfile(device) {
    const profileMap = profiles();
    const model = exactString(device && device.model);
    const cohort = profileMap && profileMap.cohortForModel(model);
    const platformVersion = exactString(device && device.platformVersion);
    const sdkVersion = exactString(device && device.sdk);
    const sdkMajor = sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    const sdkPlatform = sdkMajor && profileMap && profileMap.SDK_MAJOR_TO_WEBOS[sdkMajor[1]];
    const map = PLATFORM_MAPS[platformVersion];
    if (!cohort || !map || sdkPlatform !== platformVersion) return null;

    const controls = { ...map.controls };
    const additions = COHORT_CONTROLS[cohort.series] && COHORT_CONTROLS[cohort.series][platformVersion];
    if (additions) Object.assign(controls, additions);
    const softwareMap = SOFTWARE_COHORT_MAPS[cohort.series] && SOFTWARE_COHORT_MAPS[cohort.series][sdkVersion];
    if (softwareMap && softwareMap.platformVersion === platformVersion) Object.assign(controls, softwareMap.controls);
    const modelMap = MODEL_CONTROL_MAPS.find((candidate) =>
      candidate.model === model.toUpperCase()
      && candidate.sdkVersion === sdkVersion
      && candidate.platformVersion === platformVersion
    );
    if (modelMap) Object.assign(controls, modelMap.controls);
    return Object.freeze({
      id: modelMap
        ? `lg-oled-${cohort.series.toLowerCase()}-${map.id}-${modelMap.id}`
        : `lg-oled-${cohort.series.toLowerCase()}-${map.id}`,
      modelAliases: Object.freeze([model]),
      cohort: cohort.series,
      platformVersion,
      sdkVersion,
      mappingScope: "model-family-platform",
      evidenceLevel: "platform-source-mapped",
      sampleCount: 0,
      sourceIds: Object.freeze([...new Set([
        ...map.sourceIds,
        ...(cohort.series === "C2" && platformVersion === "22" ? ["glasshouseDashboard"] : []),
        ...(softwareMap && softwareMap.platformVersion === platformVersion ? softwareMap.sourceIds : []),
        ...(modelMap ? [modelMap.sourceId] : [])
      ])]),
      modelSpecificMap: modelMap ? Object.freeze({
        source: modelMap.source,
        sourceId: modelMap.sourceId,
        model: modelMap.model,
        sdkVersion: modelMap.sdkVersion,
        firmwarePublished: false
      }) : null,
      controls: Object.freeze(objectFromEntries(Object.entries(controls).map(([key, evidence]) => [key, Object.freeze({
        ...evidence,
        readEvidence: "must-read-on-device",
        priorWriteReadback: false
      })])))
    });
  }

  function matchProfile(device) {
    return matchExactProfile(device) || familyProfile(device);
  }

  function controlStatus(profile, key) {
    if (!profile) {
      return { mapped: false, writable: false, reason: "No controls are available for this model and software version." };
    }
    const evidence = profile.controls && profile.controls[key];
    if (!evidence) {
      return { mapped: false, writable: false, reason: "No setting is available for this control on this model and software version." };
    }
    return {
      mapped: true,
      writable: true,
      mapping: evidence.mapping,
      source: evidence.source,
      priorWriteReadback: Boolean(evidence.priorWriteReadback),
      reason: "A reviewed setting is available. The TV must return its current value before changes are enabled."
    };
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
      schemaVersion: 2,
      appVersion: APP_VERSION,
      device: {
        model: safeIdentity(device && device.model),
        sdkVersion: safeIdentity(device && device.sdk),
        firmwareVersion: safeIdentity(device && device.firmware)
      },
      compatibility: {
        profileId: profile ? profile.id : null,
        evidenceLevel: profile ? profile.evidenceLevel : "unmapped",
        mappingScope: profile ? profile.mappingScope : "unmapped",
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
    EXACT_PROFILES,
    MODEL_CONTROL_MAPS,
    PLATFORM_MAPS,
    SOFTWARE_COHORT_MAPS,
    canApplyPreset,
    canWrite,
    controlStatus,
    createReport,
    matchProfile
  });
});

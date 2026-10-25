(function (root, factory) {
  const references = typeof module === "object" && module.exports
    ? require("./community-reference.js")
    : null;
  const firmwareCatalog = typeof module === "object" && module.exports
    ? require("./firmware-catalog.js")
    : null;
  if (typeof module === "object" && module.exports) module.exports = factory(references, firmwareCatalog, root);
  else root.PrivacyShieldCompatibility = factory(null, root.PrivacyShieldFirmwareCatalog, root);
})(typeof globalThis !== "undefined" ? globalThis : this, function (moduleReferences, moduleFirmwareCatalog, globalRoot) {
  "use strict";

  const APP_VERSION = "0.4.0";
  const CONTROL_KEYS = Object.freeze([
    "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt",
    "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion",
    "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId",
    "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence",
    "aiNudge", "aiSettingsNudge"
  ]);
  const PREVIOUSLY_WRITE_TESTED = new Set(["livePlus", "voiceLongDistance", "turnOnByVoice"]);
  const C6H_CONTROL_KEYS = Object.freeze(CONTROL_KEYS.filter((key) => key !== "aiNudge" && key !== "aiSettingsNudge"));

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
  // cohort. Uncertain option keys remain read-only reference values.
  const SOFTWARE_COHORT_MAPS = Object.freeze({
    C5: Object.freeze({
      "10.3.1": Object.freeze({
        platformVersion: "25",
        sourceIds: Object.freeze(["glasshouse"]),
        sampleNote: "C5/webOS 10.3.1 research lists these settings but does not identify the exact TV or firmware. Read-only values do not enable switches.",
        controls: Object.freeze({
          voiceLongDistance: Object.freeze({ source: "glasshouse-c5", mapping: "cohort-source-mapped" }),
          thirdPartyCookie: Object.freeze({ source: "glasshouse-c5", mapping: "cohort-source-mapped" })
        }),
        referenceSettings: Object.freeze([
          Object.freeze({ category: "option", key: "watchedListCollection", label: "Viewing history setting", source: "glasshouse-c5", reason: "Glasshouse found this key in a spec file but no reader in its firmware search. Its effect remains unknown; this value is shown for reference only." }),
          Object.freeze({ category: "option", key: "usageCare", label: "Usage Care menu setting", source: "glasshouse-c5", reason: "Glasshouse found this key in Settings. Family Care did not use it for screen-time locking and its screen had no network code; this is not evidence of a collection control." }),
          Object.freeze({ category: "option", key: "dbgLogUpload", label: "Debug log upload setting", source: "glasshouse-c5", reason: "Glasshouse found readers in upload services and observed the value on again after boot. It is read-only here; PrivacyShield has not tested changing it or whether uploads stop." }),
          Object.freeze({ category: "option", key: "faultLogUpload", label: "Fault log upload setting", source: "glasshouse-c5", reason: "Glasshouse found readers in diagnostic services, Settings, and First Use; its description limited the setting to Korea and the USA. It is read-only here; PrivacyShield has not tested changing it." })
        ])
      })
    })
  });

  // Root research names these keys but does not establish a safe, user-facing
  // effect for each one. Read their on/off state when possible; never write.
  const PLATFORM_REFERENCE_SETTINGS = Object.freeze({
    "26": Object.freeze([
      Object.freeze({ category: "general", key: "sportsAlarm", label: "Sports alerts", source: "webos-debloat-webos26", reason: "The source names this key but does not document its effect or behavior after reboot." }),
      Object.freeze({ category: "option", key: "webOSPromotionVideo", label: "webOS promotion video", source: "webos-debloat-webos26", reason: "The source names this key; a separate firmware search found no reader outside LG's settings definitions." }),
      Object.freeze({ category: "option", key: "promotionStreamer", label: "Promotion streamer", source: "webos-debloat-webos26", reason: "The source names this key but does not document its effect." })
    ])
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
      sampleNote: "An owner audited this model on software version 10.3.1. The report did not list the firmware version. Each change still requires a readable value and TV confirmation.",
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
      sampleNote: "A rooted-TV guide lists OLED65G5WUA on webOS 10.2.1 but omits the firmware version. Each change still requires a readable value and TV confirmation.",
      controls: Object.freeze({
        screenSaverAd: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" }),
        homePromotion: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" }),
        aiNudge: Object.freeze({ source: "level1techs-g5+glasshouse", mapping: "model-source-mapped" })
      })
    })
  ]);

  const MODEL_REFERENCE_SETTINGS = Object.freeze([
    Object.freeze({
      id: "webos-lockout-c5-oled77c51la-sdk10.3.1",
      model: "OLED77C51LA",
      sdkVersion: "10.3.1",
      platformVersion: "25",
      sourceId: "webosLockout",
      sampleNote: "webos_lockout reports changing usageCare, dbgLogUpload, and faultLogUpload in a startup script on OLED77C51LA. The firmware number is not published. PrivacyShield shows these values as read-only; it has not tested changes or upload effects.",
      settings: Object.freeze([
        Object.freeze({ category: "option", key: "usageCare", label: "Usage Care setting", source: "webos-lockout-c5", reason: "The exact-model root script sets this to false. Glasshouse describes it as a Family Care menu setting and found no collection behavior; its effect remains unsettled. Read-only status only." }),
        Object.freeze({ category: "option", key: "dbgLogUpload", label: "Debug log upload setting", source: "webos-lockout-c5", reason: "The exact-model startup script sets this to false. Glasshouse found upload-service readers and reports the value returned after boot on its C5 sample. PrivacyShield has not tested changing it or whether uploads stop." }),
        Object.freeze({ category: "option", key: "faultLogUpload", label: "Fault log upload setting", source: "webos-lockout-c5", reason: "The exact-model startup script sets this to false. Glasshouse found diagnostic, Settings, and First Use readers, with a regional limit in its description. PrivacyShield has not tested changing this value." })
      ])
    }),
    Object.freeze({
      model: "OLED55B56LA",
      sdkVersion: "10.3.1",
      platformVersion: "25",
      sourceId: "ownYourGlass",
      settings: Object.freeze([
        Object.freeze({ category: "network", key: "allowMobileDeviceAccess", label: "Mobile device access", source: "own-your-glass-b5", reason: "The B5 audit found that turning this off did not close the local SSAP service. This value does not prove that LAN access is blocked." })
      ])
    }),
    Object.freeze({
      model: "OLED65G5WUA",
      sdkVersion: "10.2.1",
      platformVersion: "25",
      sourceId: "level1techsG5",
      settings: Object.freeze([
        Object.freeze({ category: "option", key: "watchedListCollection", label: "Viewing history collection", source: "level1techs-g5", reason: "The guide's root script changes this preference to off, but does not verify that the TV accepts the change or clears stored viewing history." }),
        Object.freeze({ category: "option", key: "usageCare", label: "Usage data collection", source: "level1techs-g5", reason: "The guide changes this preference to off but does not verify its effect on data collection." }),
        Object.freeze({ category: "option", key: "dbgLogUpload", label: "Debug log upload", source: "level1techs-g5", reason: "The guide changes this preference to off but does not verify whether uploads stop." }),
        Object.freeze({ category: "option", key: "faultLogUpload", label: "Fault log upload", source: "level1techs-g5", reason: "The guide changes this preference to off but does not verify whether uploads stop." }),
        Object.freeze({ category: "option", key: "thirdPartyCookie", label: "Third-party cookies", source: "level1techs-g5", reason: "The guide changes this option to off but does not verify HbbTV behavior on another G5 firmware." })
      ])
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
      displayName: "LG OLED77C6HUP · webOS 26",
      mappingScope: "exact-device-firmware",
      evidenceLevel: "source-mapped",
      sampleCount: 1,
      sourceIds: Object.freeze(["glasshouse", "webosDebloat", "privacyshield-c6"]),
      sampleNote: "The OLED77C6HUP is the exact C6H variant covered here. Other C6 reports refer to different TVs.",
      modelGuide: Object.freeze({
        url: "https://optoutof.com/tv/lg/c6-2026/",
        exactVariantCovered: false,
        scopeNote: "The standard C6 page excludes the separate C6H variant; its microphone evidence does not cover this model."
      }),
      controls: Object.freeze(Object.fromEntries(C6H_CONTROL_KEYS.map((key) => [key, Object.freeze({
        mapping: "source-mapped",
        source: "privacyshield-c6",
        readEvidence: "device-read-verified",
        priorWriteReadback: PREVIOUSLY_WRITE_TESTED.has(key)
      })])))
    })
  ]);

  function refs() {
    return moduleReferences || globalRoot.PrivacyShieldCommunityReference || null;
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
    const reference = refs();
    const sdkMajor = sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    const sdkPlatform = sdkMajor && reference && reference.SDK_MAJOR_TO_WEBOS[sdkMajor[1]];
    if (sdkPlatform !== profile.platformVersion) return null;
    if (platformVersion && platformVersion !== profile.platformVersion) return null;
    return profile;
  }

  function familyProfile(device) {
    const reference = refs();
    const model = exactString(device && device.model);
    const cohort = reference && reference.cohortForModel(model);
    const platformVersion = exactString(device && device.platformVersion);
    const sdkVersion = exactString(device && device.sdk);
    const sdkMajor = sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    const sdkPlatform = sdkMajor && reference && reference.SDK_MAJOR_TO_WEBOS[sdkMajor[1]];
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
    const modelReferences = MODEL_REFERENCE_SETTINGS.find((candidate) =>
      candidate.model === model.toUpperCase()
      && candidate.sdkVersion === sdkVersion
      && candidate.platformVersion === platformVersion
    );
    const referencesByKey = new Map();
    for (const setting of [
      ...(PLATFORM_REFERENCE_SETTINGS[platformVersion] || []),
      ...(softwareMap && softwareMap.platformVersion === platformVersion ? softwareMap.referenceSettings : []),
      ...(modelReferences ? modelReferences.settings : [])
    ]) referencesByKey.set(`${setting.category}.${setting.key}`, setting);
    const referenceSettings = [...referencesByKey.values()];
    const modelGuide = reference.modelGuideForModel(model);

    return Object.freeze({
      id: modelMap
        ? `lg-oled-${cohort.series.toLowerCase()}-${map.id}-${modelMap.id}`
        : modelReferences && modelReferences.id
          ? `lg-oled-${cohort.series.toLowerCase()}-${map.id}-${modelReferences.id}`
        : `lg-oled-${cohort.series.toLowerCase()}-${map.id}`,
      modelAliases: Object.freeze([model]),
      cohort: cohort.series,
      platformVersion,
      sdkVersion,
      firmwareVersion: exactString(device && device.firmware),
      displayName: `LG OLED ${cohort.series} · webOS ${platformVersion}`,
      mappingScope: "model-family-platform",
      evidenceLevel: "platform-source-mapped",
      sampleCount: 0,
      relatedDeviceReports: reference.samplesForCohort(cohort.series).length,
      sourceIds: Object.freeze([...new Set([
        ...map.sourceIds,
        ...(cohort.series === "C2" && platformVersion === "22" ? ["glasshouseDashboard"] : []),
        ...(softwareMap && softwareMap.platformVersion === platformVersion ? softwareMap.sourceIds : []),
        ...(modelMap ? [modelMap.sourceId] : []),
        ...(modelReferences ? [modelReferences.sourceId] : []),
        ...(PLATFORM_REFERENCE_SETTINGS[platformVersion] ? ["webosDebloat"] : [])
      ])]),
      modelSpecificMap: modelMap ? Object.freeze({
        source: modelMap.source,
        sourceId: modelMap.sourceId,
        model: modelMap.model,
        sdkVersion: modelMap.sdkVersion,
        firmwarePublished: false
      }) : null,
      modelSpecificReferenceMap: modelReferences ? Object.freeze({
        sourceId: modelReferences.sourceId,
        model: modelReferences.model,
        sdkVersion: modelReferences.sdkVersion,
        firmwarePublished: false
      }) : null,
      modelGuide,
      referenceSettings: Object.freeze(referenceSettings),
      sampleNote: modelMap
        ? modelMap.sampleNote
        : modelReferences && modelReferences.sampleNote
          ? modelReferences.sampleNote
          : softwareMap && softwareMap.platformVersion === platformVersion
          ? softwareMap.sampleNote
          : `Published sources list settings for webOS ${platformVersion}. This exact TV has not been checked by PrivacyShield.`,
      controls: Object.freeze(Object.fromEntries(Object.entries(controls).map(([key, evidence]) => [key, Object.freeze({
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

  function firmwareArchiveEvidence(device) {
    const catalog = moduleFirmwareCatalog || globalRoot.PrivacyShieldFirmwareCatalog;
    return catalog ? catalog.lookup(device) : null;
  }

  return Object.freeze({
    APP_VERSION,
    CONTROL_KEYS,
    EXACT_PROFILES,
    MODEL_CONTROL_MAPS,
    MODEL_REFERENCE_SETTINGS,
    PLATFORM_MAPS,
    PLATFORM_REFERENCE_SETTINGS,
    SOFTWARE_COHORT_MAPS,
    canApplyPreset,
    canWrite,
    controlStatus,
    createReport,
    firmwareArchiveEvidence,
    matchProfile
  });
});

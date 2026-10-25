const assert = require("node:assert/strict");
const test = require("node:test");
const model = require("../webos-app/src/privacy-model.js");
const compatibility = require("../webos-app/src/compatibility.js");
const deviceProfiles = require("../webos-app/src/device-profiles.js");
const publicReferences = require("../webos-app/src/community-reference.js");

const C6 = { model: "OLED77C6HUP", sdk: "11.2.0", firmware: "43.21.79" };

test("prefers the exact C6H model, SDK, and firmware tuple", () => {
  const profile = compatibility.matchProfile(C6);
  assert.equal(profile.id, "lg-oled77c6hup-webos26-43.21.79");
  assert.equal(profile.evidenceLevel, "source-mapped");
  assert.equal(profile.sampleCount, 1);
  assert.equal(compatibility.matchProfile({ ...C6, firmware: "43.21.80" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, sdk: "11.3.0" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, platformVersion: "25" }), null, "an exact model tuple cannot override an SDK/platform mismatch");
  assert.equal(compatibility.matchProfile({ ...C6, model: "OLED65C6HUP" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, model: "LG OLED77C6HUP" }).id, profile.id);
  assert.equal(compatibility.matchProfile({ ...C6, model: "OLED77C6HUP.AUS" }).id, profile.id);
  assert.equal(compatibility.matchProfile({ ...C6, model: "OLED77C6HUP.ACCQLJD" }).id, profile.id);
  assert.equal(compatibility.matchProfile({ model: C6.model, sdk: C6.sdk }), null);
  assert.equal(compatibility.matchProfile(null), null);
});

test("maps every B/C/G cohort against each supported installed webOS profile", () => {
  const platforms = [
    { version: "6.x", sdk: "6.5.3" }, { version: "22", sdk: "7.4.0" },
    { version: "23", sdk: "8.3.0" }, { version: "24", sdk: "9.2.4" },
    { version: "25", sdk: "10.3.1" }, { version: "26", sdk: "11.2.0" }
  ];
  const baseKeys = ["livePlus", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation"];
  for (const cohort of publicReferences.COHORTS) {
    for (const platform of platforms) {
      const candidate = {
        model: `OLED65${cohort.series}TEST`, sdk: platform.sdk,
        firmware: `SIM-${platform.version}`, platformVersion: platform.version
      };
      const profile = compatibility.matchProfile(candidate);
      const expectedKeys = [...baseKeys];
      if (["22", "23", "24", "25", "26"].includes(platform.version)) expectedKeys.push("lmt");
      if (platform.version === "24") expectedKeys.push("aiNudge", "aiSettingsNudge");
      if (cohort.series === "C2" && platform.version === "22") expectedKeys.push("aiNudge", "aiSettingsNudge");
      if (cohort.series === "C5" && platform.version === "25" && platform.sdk === "10.3.1") {
        expectedKeys.push("voiceLongDistance", "thirdPartyCookie");
      }
      assert.ok(profile, `${cohort.series} / webOS ${platform.version} should match`);
      assert.equal(profile.cohort, cohort.series);
      assert.equal(profile.platformVersion, platform.version);
      assert.equal(profile.sdkVersion, platform.sdk);
      assert.equal(profile.mappingScope, "model-family-platform");
      assert.equal(profile.evidenceLevel, "platform-source-mapped");
      assert.equal(profile.sampleCount, 0, "a platform map does not claim a device read sample");
      assert.deepEqual(Object.keys(profile.controls).sort(), expectedKeys.sort(), `${cohort.series} / webOS ${platform.version} control keys`);
      assert.ok(Object.values(profile.controls).every((control) => control.readEvidence === "must-read-on-device" && !control.priorWriteReadback));
      assert.equal(profile.referenceSettings, undefined, "unmapped research keys are not part of the app profile");
    }
  }
  assert.equal(compatibility.matchProfile({ model: "OLED65B5HNA", sdk: C6.sdk, firmware: C6.firmware }), null, "the installed platform is required");
  assert.equal(compatibility.matchProfile({ model: "OLED65CSPSA", sdk: C6.sdk, firmware: C6.firmware, platformVersion: "26" }), null, "unsupported model families remain locked");
  assert.equal(compatibility.matchProfile({ model: "OLED65C6TEST", sdk: "11.2.0", firmware: "SIM", platformVersion: "25" }), null, "the SDK major must agree with the selected map");
  assert.equal(compatibility.matchProfile({ model: "OLED65C6TEST", sdk: "unknown", firmware: "SIM", platformVersion: "26" }), null, "unknown SDK versions do not select a map");
});

test("matches only catalogued B/C/G sizes and preserves real regional model suffixes", () => {
  const platforms = [
    { version: "6.x", sdk: "6.5.3" }, { version: "22", sdk: "7.4.0" },
    { version: "23", sdk: "8.3.0" }, { version: "24", sdk: "9.2.4" },
    { version: "25", sdk: "10.3.1" }, { version: "26", sdk: "11.2.0" }
  ];
  for (const cohort of publicReferences.COHORTS) {
    for (const size of cohort.sizes) {
      assert.equal(deviceProfiles.cohortForModel(`OLED${size}${cohort.series}SIM`).series, cohort.series);
      assert.equal(deviceProfiles.cohortForModel(`LG OLED${size}${cohort.series}HUP`).series, cohort.series);
      for (const platform of platforms) {
        const profile = compatibility.matchProfile({
          model: `OLED${size}${cohort.series}SIM`, sdk: platform.sdk,
          firmware: `SIM-${platform.version}`, platformVersion: platform.version
        });
        assert.equal(profile && profile.cohort, cohort.series, `${cohort.series} ${size} inch / webOS ${platform.version}`);
      }
    }
  }
  for (const sample of publicReferences.COMMUNITY_SAMPLES.filter((entry) => entry.model && entry.series)) {
    assert.equal(publicReferences.cohortForModel(sample.model).series, sample.series, `${sample.model} should resolve to ${sample.series}`);
  }
  assert.equal(deviceProfiles.cohortForModel("OLED99C1HUP"), null, "unknown size variants stay unmapped");
  assert.equal(deviceProfiles.cohortForModel("unrelated-OLED65C6HUP"), null, "a family-like substring is not a model identity");
  assert.equal(deviceProfiles.cohortForModel("OLED600C6HUP"), null, "three-digit parses must still use a listed size");
});

test("allows only control keys declared by the matched profile", () => {
  const profile = compatibility.matchProfile(C6);
  assert.equal(compatibility.canWrite(profile, "livePlus"), true);
  assert.equal(compatibility.controlStatus(profile, "unknownKey").writable, false);
  assert.equal(Object.keys(profile.controls).length, 15);
  assert.deepEqual(Object.keys(profile.controls).filter((key) => profile.controls[key].priorWriteReadback), ["livePlus", "voiceLongDistance", "turnOnByVoice"]);
  assert.equal(compatibility.canWrite(null, "livePlus"), false);
  assert.equal(compatibility.canApplyPreset(profile, model.privacyPreset()), true);
  assert.equal(compatibility.canApplyPreset(null, model.privacyPreset()), false);
  assert.equal(compatibility.canApplyPreset(profile, []), false);

  const c1 = compatibility.matchProfile({ model: "OLED55C17LB", sdk: "6.5.3", firmware: "03.53.45", platformVersion: "6.x" });
  const c1Preset = model.privacyPreset().filter(({ key }) => compatibility.canWrite(c1, key));
  assert.deepEqual(c1Preset.map(({ key }) => key), ["livePlus", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation"]);
  assert.equal(compatibility.canApplyPreset(c1, c1Preset), true);
  assert.equal(compatibility.canWrite(c1, "hbbTV"), false);

  const c2Webos22 = compatibility.matchProfile({ model: "OLED55C24LA", sdk: "7.4.0", firmware: "03.30.00", platformVersion: "22" });
  const c2Webos24 = compatibility.matchProfile({ model: "OLED55C24LA", sdk: "9.2.0", firmware: "23.20.00", platformVersion: "24" });
  assert.equal(compatibility.canWrite(c2Webos22, "lmt"), true, "the documented webOS 22 menu and SettingsService key map nominate LMT");
  assert.equal(compatibility.canWrite(c2Webos24, "lmt"), true, "the Glasshouse C2/webOS 9.2 source maps to webOS 24");
  assert.equal(compatibility.canWrite(c2Webos24, "aiNudge"), true);
  assert.equal(compatibility.canWrite(c2Webos24, "aiSettingsNudge"), true);
  assert.equal(compatibility.canWrite(c2Webos22, "aiNudge"), true, "the C2/webOS 22 sample fixture maps Smart Tips for that cohort");
  assert.equal(compatibility.canWrite(c2Webos22, "aiSettingsNudge"), true);
  assert.equal(c2Webos22.controls.aiNudge.source, "glasshouse-c2-webos22-fixture");
  assert.equal(c2Webos22.controls.lmt.source, "glasshouse-dashboard-c2");
  assert.ok(c2Webos22.sourceIds.includes("glasshouseDashboard"));
  for (const version of ["22", "23", "24", "25", "26"]) {
    assert.equal(compatibility.PLATFORM_MAPS[version].controls.lmt.source, "glasshouse+model-guide");
    assert.equal(compatibility.PLATFORM_MAPS[version].controls.lmt.mapping, "platform-source-mapped");
  }
  assert.equal(compatibility.PLATFORM_MAPS["24"].controls.aiNudge.source, "glasshouse-webos24");
  assert.equal(compatibility.PLATFORM_MAPS["24"].controls.aiSettingsNudge.source, "glasshouse-webos24");
  assert.equal(model.privacyPreset().some(({ key }) => key === "aiNudge" || key === "aiSettingsNudge"), false);

  const c5 = compatibility.matchProfile({ model: "OLED77C57LA", sdk: "10.3.1", firmware: "33.31.68", platformVersion: "25" });
  assert.equal(compatibility.canWrite(c5, "voiceLongDistance"), true);
  assert.equal(compatibility.canWrite(c5, "thirdPartyCookie"), true);
  assert.equal(compatibility.canWrite(c5, "turnOnByVoice"), false);
  assert.equal(c5.referenceSettings, undefined);
  for (const key of ["watchedListCollection", "usageCare", "dbgLogUpload", "faultLogUpload"]) {
    assert.equal(compatibility.canWrite(c5, key), false, `${key} is not an app control`);
  }
  const c5DifferentSdk = compatibility.matchProfile({ model: "OLED77C57LA", sdk: "10.2.1", firmware: "33.30.00", platformVersion: "25" });
  assert.equal(compatibility.canWrite(c5DifferentSdk, "voiceLongDistance"), false, "the C5 research map is scoped to its reported SDK");
  const c5Exact = compatibility.matchProfile({ model: "OLED77C51LA", sdk: "10.3.1", firmware: "SIM-UNPUBLISHED", platformVersion: "25" });
  assert.equal(c5Exact.referenceSettings, undefined);
  const b5 = compatibility.matchProfile({ model: "OLED55B56LA", sdk: "10.3.1", firmware: "SIM-UNPUBLISHED", platformVersion: "25" });
  assert.equal(b5.id, "lg-oled-b5-webos-25-own-your-glass-b5-oled55b56la-sdk10.3.1");
  assert.equal(compatibility.canWrite(b5, "aiNudge"), true, "the exact B5/webOS 25 report maps Smart Tips");
  assert.equal(b5.controls.aiNudge.source, "own-your-glass-b5");
  for (const key of ["hbbTV", "hbbTvDnt", "hbbTvDeviceId"]) {
    assert.equal(compatibility.canWrite(b5, key), true, `the exact B5 SettingsService map includes ${key}`);
    assert.equal(b5.controls[key].source, "own-your-glass-b5");
  }
  assert.equal(compatibility.canWrite(b5, "aiSettingsNudge"), false, "the B5 report did not map Smart Tips in Settings");
  for (const key of ["livePlus", "screenSaverAd", "livePromotion", "lmt"]) {
    assert.equal(b5.controls[key].source, "own-your-glass-b5", `the exact B5 report includes ${key}`);
  }
  assert.ok(b5.sourceIds.includes("ownYourGlass"));
  const b5Sibling = compatibility.matchProfile({ model: "OLED65B56LA", sdk: "10.3.1", firmware: "33.30.70", platformVersion: "25" });
  assert.equal(compatibility.canWrite(b5Sibling, "aiNudge"), false, "the B5 owner map does not transfer to another size variant");
  assert.equal(compatibility.canWrite(b5Sibling, "hbbTV"), false);
  assert.ok(!b5Sibling.sourceIds.includes("ownYourGlass"));
  const b5WrongSdk = compatibility.matchProfile({ model: "OLED55B56LA", sdk: "10.2.0", firmware: "33.30.70", platformVersion: "25" });
  assert.equal(compatibility.canWrite(b5WrongSdk, "hbbTV"), false, "the model overlay is limited to the reported SDK");

  const g5 = compatibility.matchProfile({ model: "OLED65G5WUA", sdk: "10.2.1", firmware: "SIM-UNPUBLISHED", platformVersion: "25" });
  assert.ok(g5.id.includes("level1techs-g5-oled65g5wua-webos10.2.1"));
  assert.equal(g5.modelSpecificMap.model, "OLED65G5WUA");
  assert.equal(g5.modelSpecificMap.firmwarePublished, false);
  assert.equal(compatibility.canWrite(g5, "aiNudge"), true, "the exact G5 root guide names the key and Glasshouse maps its SettingsService semantics");
  assert.equal(compatibility.canWrite(g5, "screenSaverAd"), true);
  assert.equal(compatibility.canWrite(g5, "homePromotion"), true);
  assert.equal(g5.controls.aiNudge.source, "level1techs-g5+glasshouse");
  assert.equal(g5.controls.screenSaverAd.source, "level1techs-g5+glasshouse");
  assert.equal(g5.controls.homePromotion.source, "level1techs-g5+glasshouse");
  assert.equal(g5.controls.livePlus.source, "glasshouse", "model overlays must not relabel unrelated platform evidence");
  assert.equal(g5.controls.livePromotion.source, "glasshouse", "the G5 source does not name Live Promotion");
  assert.equal(compatibility.canWrite(g5, "thirdPartyCookie"), false, "the root script does not prove an app-side setter");
  assert.ok(g5.sourceIds.includes("level1techsG5"));
  assert.ok(!g5.sourceIds.includes("ownYourGlass"));
  const g5WrongSdk = compatibility.matchProfile({ model: "OLED65G5WUA", sdk: "10.3.1", firmware: "33.30.69", platformVersion: "25" });
  assert.equal(g5WrongSdk.modelSpecificMap, null, "the G5 overlay is limited to the reported webOS software version");
  assert.equal(compatibility.canWrite(g5WrongSdk, "aiNudge"), false);
  assert.equal(g5WrongSdk.controls.screenSaverAd.source, "glasshouse");
  const g5Sibling = compatibility.matchProfile({ model: "OLED83G5WUA", sdk: "10.2.1", firmware: "SIM-OTHER", platformVersion: "25" });
  assert.equal(g5Sibling.modelSpecificMap, null, "the G5 overlay does not transfer across size variants");
  assert.equal(compatibility.canWrite(g5Sibling, "aiNudge"), false);

  const b6 = compatibility.matchProfile({ model: "OLED65B6SIM", sdk: "11.2.0", firmware: "SIM-26", platformVersion: "26" });
  assert.equal(compatibility.canWrite(b6, "sportsAlarm"), false, "ambiguous key maps stay read-only");
  assert.equal(compatibility.canWrite(b6, "promotionStreamer"), false, "ambiguous key maps stay read-only");
  assert.equal(compatibility.canWrite(compatibility.matchProfile(C6), "aiNudge"), false, "the exact C6H profile remains limited to its 15 observed controls");
});

test("creates an allowlisted report without settings values or identifiers", () => {
  const profile = compatibility.matchProfile(C6);
  const report = compatibility.createReport(C6, profile, {
    systemInfo: true,
    settingsService: "partial",
    hbcSnapshot: true,
    controlReads: { livePlus: true, voiceLongDistance: false, leakedValue: "on" }
  }, model.CONTROLS);
  assert.deepEqual(Object.keys(report), ["schemaVersion", "appVersion", "device", "compatibility", "apiAccess", "controlReads"]);
  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.device, { model: C6.model, sdkVersion: C6.sdk, firmwareVersion: C6.firmware });
  assert.equal(report.compatibility.profileId, profile.id);
  assert.equal(report.controlReads.livePlus, true);
  assert.equal(report.controlReads.voiceLongDistance, false);
  assert.equal(Object.hasOwn(report.controlReads, "leakedValue"), false);
  const serialized = JSON.stringify(report);
  for (const forbidden of ["eulaList", "settingsValues", "serialNumber", "macAddress", "ssid", "192.168.", '"livePlus":"on"']) {
    assert.equal(serialized.includes(forbidden), false, `report must not contain ${forbidden}`);
  }
});

test("represents unavailable identity without guessing values", () => {
  const report = compatibility.createReport({ model: "", sdk: null, firmware: undefined }, null, {}, model.CONTROLS);
  assert.deepEqual(report.device, { model: null, sdkVersion: null, firmwareVersion: null });
  assert.deepEqual(report.compatibility, { profileId: null, evidenceLevel: "unmapped", mappingScope: "unmapped", sampleCount: 0, mappedControlCount: 0 });
  assert.equal(report.apiAccess.settingsService, "unavailable");
});

test("reports family/platform maps without claiming a physical-device test", () => {
  const device = { model: "OLED65B6HUP", sdk: "11.2.0", firmware: "43.20.00", platformVersion: "26" };
  const profile = compatibility.matchProfile(device);
  const report = compatibility.createReport(device, profile, { controlReads: { livePlus: true } }, model.CONTROLS);
  assert.equal(report.compatibility.profileId, "lg-oled-b6-webos-26");
  assert.equal(report.compatibility.evidenceLevel, "platform-source-mapped");
  assert.equal(report.compatibility.mappingScope, "model-family-platform");
  assert.equal(report.compatibility.sampleCount, 0);
  assert.equal(report.compatibility.mappedControlCount, 6);
  assert.equal(report.controlReads.livePlus, true);
});

test("drops network-address-shaped identity fields from reports", () => {
  const report = compatibility.createReport({ model: "192.168.50.87", sdk: "11.2.0", firmware: "43.21.79" }, null, {}, model.CONTROLS);
  assert.equal(report.device.model, null);
});

test("catalogs every B, C, and G cohort from 2021 through 2026", () => {
  assert.equal(publicReferences.COHORTS.length, 18);
  assert.deepEqual(publicReferences.COHORTS.map((cohort) => cohort.series), [
    "B1", "C1", "G1", "B2", "C2", "G2", "B3", "C3", "G3",
    "B4", "C4", "G4", "B5", "C5", "G5", "B6", "C6", "G6"
  ]);
  for (const cohort of publicReferences.COHORTS) {
    assert.equal(cohort.year, 2020 + Number(cohort.series.slice(1)));
    assert.equal(cohort.launchWebOS, cohort.series.endsWith("1") ? "6.x" : String(cohort.year).slice(2));
    assert.ok(cohort.sizes.length > 0);
    assert.ok(cohort.sizes.every((size) => /^\d{2}$/.test(size)));
    assert.equal(cohort.sourceId, publicReferences.SOURCES.modelCatalog.id);
    assert.equal(cohort.modelGuideUrl, `https://optoutof.com/tv/lg/${cohort.series.toLowerCase()}-${cohort.year}/`);
    assert.ok(["present", "absent", "reported-present", "reported-absent", "conflicting", "variant-limited", "unknown"].includes(cohort.microphone.status));
    assert.ok(cohort.microphone.summary.length > 0);
  }
  assert.equal(publicReferences.cohortForModel("OLED77C6HUP").microphone.status, "variant-limited");
  assert.equal(publicReferences.modelGuideForModel("OLED77C6HUP").exactVariantCovered, false);
  assert.match(publicReferences.modelGuideForModel("OLED77C6HUP").scopeNote, /excludes.*C6H/i);
  assert.equal(publicReferences.modelGuideForModel("OLED65C6PSA").exactVariantCovered, true);
  assert.equal(publicReferences.cohortForModel("OLED65C54LA").microphone.status, "conflicting");
  assert.equal(publicReferences.cohortForModel("OLED65B6HUP").microphone.status, "unknown");
  assert.deepEqual(Object.fromEntries(publicReferences.COHORTS.map((cohort) => [cohort.series, publicReferences.samplesForCohort(cohort.series).length])), {
    B1: 0, C1: 4, G1: 2, B2: 0, C2: 2, G2: 2, B3: 0, C3: 3, G3: 1,
    B4: 1, C4: 4, G4: 3, B5: 1, C5: 6, G5: 3, B6: 0, C6: 1, G6: 0
  });
});

test("preserves exact public community rows and the Glasshouse count discrepancy", () => {
  const glasshouse = publicReferences.COMMUNITY_SAMPLES.filter((sample) => sample.project === "Glasshouse");
  const cleanYourTV = publicReferences.COMMUNITY_SAMPLES.filter((sample) => sample.project === "CleanYourTV");
  assert.equal(glasshouse.length, 49);
  assert.equal(publicReferences.SOURCES.glasshouse.declaredModelCount, 48);
  assert.equal(publicReferences.SOURCES.glasshouse.listedModelCount, 49);
  assert.equal(publicReferences.SOURCES.glasshouse.accessContext.includes("Root-run"), true);
  assert.equal(cleanYourTV.length, 10);
  assert.deepEqual(cleanYourTV.map((sample) => sample.displayModel), [
    "OLED65G26LA", "Two models; codes not published", "OLED65C54LA",
    "55UN7200PTF", "75UN85006LA", "OLED55G19LA", "43UT7590PUA",
    "65UT7000PUA", "43UR74006LB", "65NANO753PR"
  ]);
  assert.equal(cleanYourTV.find((sample) => sample.model === "OLED65G26LA").status, "maintainer-tested");
  assert.equal(cleanYourTV.find((sample) => sample.model === null && sample.firmware === "23.25.55").series, null);
  assert.equal(publicReferences.COMMUNITY_SAMPLES.length, 70);
  assert.ok(publicReferences.COMMUNITY_SAMPLES.every((sample) => sample.sourceId && Object.values(publicReferences.SOURCES).some((source) => source.id === sample.sourceId)));
  assert.equal(publicReferences.samplesForCohort("C5").length, 6);
  assert.equal(publicReferences.samplesForCohort("G2").find((sample) => sample.project === "CleanYourTV").firmware, "33.23.05");
  assert.equal(publicReferences.samplesForCohort("B5").length, 1);
  assert.equal(publicReferences.samplesForCohort("B5")[0].model, "OLED55B56LA");
  assert.equal(publicReferences.samplesForCohort("B5")[0].webOS, "webOS 25 (10.3.1)");
  assert.equal(publicReferences.samplesForCohort("G5").length, 3);
  const g5Guide = publicReferences.samplesForCohort("G5").find((sample) => sample.project === "Level1Techs G5 rooted privacy guide");
  assert.equal(g5Guide.model, "OLED65G5WUA");
  assert.equal(g5Guide.firmware, null);
  assert.match(g5Guide.webOS, /10\.2\.1/);
  assert.equal(g5Guide.status, "user-reported");
  assert.deepEqual(publicReferences.sampleCountsForCohort("C1"), { Glasshouse: 2, "webOS Unclutter": 1, "KallistoX C1 capture": 1 });
  assert.equal(publicReferences.samplesForCohort("C1").find((sample) => sample.project === "KallistoX C1 capture").status, "network-measured");
  assert.equal(publicReferences.samplesForCohort("G1").find((sample) => sample.project === "LG TV Blocklist").webOS, "Not recorded");
  assert.equal(publicReferences.samplesForCohort("G4").find((sample) => sample.project === "Life's Good Without Spying").firmware, "23.23.30");
  assert.equal(publicReferences.samplesForCohort("C5").find((sample) => sample.project === "tv-home").webOS, "webOS 11");
  assert.equal(publicReferences.samplesForCohort("C5").find((sample) => sample.project === "tv-home").firmware, null);
  const exactC5RootMap = publicReferences.samplesForCohort("C5").find((sample) => sample.project === "webos_lockout");
  assert.equal(exactC5RootMap.model, "OLED77C51LA");
  assert.equal(exactC5RootMap.firmware, null);
  assert.equal(publicReferences.unassignedSamples().length, 4);
  assert.deepEqual(publicReferences.unassignedSamples().map((sample) => sample.project), [
    "CleanYourTV", "webos-debloat", "Looking Glass investigation", "TV ACR Firmware Research"
  ]);
  assert.ok(publicReferences.unassignedSamples().every((sample) => sample.model === null && sample.series === null));
  assert.equal(publicReferences.unassignedSamples()[1].sourceId, publicReferences.SOURCES.webosDebloat.id);
  assert.equal(publicReferences.unassignedSamples()[2].sourceId, publicReferences.SOURCES.lookingGlass.id);
  assert.equal(publicReferences.unassignedSamples()[3].firmware, "43.21.73.01-HE_DTV_W25O_AFABATAA");
  assert.equal(publicReferences.samplesForCohort("C6").find((sample) => sample.project === "Glasshouse").model, "OLED55C61LA");
  assert.equal(publicReferences.samplesForCohort("C6")[0].firmware, "43.21.79");
  assert.equal(publicReferences.samplesForCohort("C6")[0].webOS, "11.2.0");
  assert.equal(glasshouse.find((sample) => sample.model === "OLED65C8PUA").note.includes("getAdid on this firmware"), true);
  assert.equal(glasshouse.find((sample) => sample.model === "OLED65CSPSA").series, null);
});

test("keeps published privacy-control findings separate from PrivacyShield write profiles", () => {
  const findings = publicReferences.PUBLIC_CONTROL_FINDINGS;
  assert.equal(findings.length, 24);
  const byId = Object.fromEntries(findings.map((finding) => [finding.id, finding]));
  assert.match(byId["glasshouse-live-plus"].method, /option\.livePlus/);
  assert.match(byId["glasshouse-live-plus"].limit, /Root-run/);
  assert.match(byId["glasshouse-lmt"].observation, /C2\/webOS 9\.2/);
  assert.match(byId["glasshouse-dashboard-c2-lmt"].scope, /OLED42C24LA.*does not tie that exact model row/);
  assert.equal(byId["glasshouse-dashboard-c2-lmt"].sourceId, publicReferences.SOURCES.glasshouseDashboard.id);
  assert.match(byId["glasshouse-ad-id"].observation, /OLED65C8PUA firmware 05\.50\.15/);
  assert.match(byId["glasshouse-agreement-flags"].limit, /LG's native screen/);
  assert.match(byId["cleanyourtv-services"].method, /Root service integration/);
  assert.match(byId["cleanyourtv-services"].limit, /does not apply or stop them/);
  assert.match(byId["glasshouse-c5-privacy-keys"].scope, /C5\/webOS 10\.3\.1/);
  assert.match(byId["glasshouse-c5-mic-switch"].method, /getMicSwitchStatus/);
  assert.match(byId["glasshouse-c5-mic-switch"].limit, /C6\/C6H/);
  assert.equal(byId["webos-lockout-c5-exact-preferences"].scope, "Exact OLED77C51LA running Rockhopper 10.3.1-3006; numeric firmware version is not published.");
  assert.match(byId["webos-lockout-c5-exact-preferences"].limit, /Direct file changes do not show that LG accepts the change through its settings service/);
  assert.match(byId["own-your-glass-microphone-paths"].limit, /Root-only/);
  assert.match(byId["own-your-glass-b5-settings-map"].scope, /OLED55B56LA.*webOS 10\.3\.1/);
  assert.match(byId["own-your-glass-b5-settings-map"].observation, /general\.aiNudge/);
  assert.match(byId["own-your-glass-b5-settings-map"].limit, /does not prove it cleared stored data/);
  assert.match(byId["webos-unclutter-c1-network-baseline"].scope, /C1\/webOS 6\.0/);
  assert.match(byId["imc-acr-network-study"].limit, /does not identify every request payload/);
  assert.match(byId["kallistox-c1-network-capture"].limit, /differs from the G1 audit/);
  assert.match(byId["lg-tv-blocklist-g1-audit"].scope, /one LG G1/i);
  assert.match(byId["lifesgood-g4-root-controls"].observation, /OLED65G45LW.*23\.23\.30/);
  assert.match(byId["webos-debloat-webos26-settings-map"].method, /option:webOSPromotionVideo/);
  assert.match(byId["webos-debloat-webos26-settings-map"].limit, /not a PrivacyShield app permission or exact C6/);
  assert.match(byId["webosbrew-mobile-device-access"].method, /network\.allowMobileDeviceAccess/);
  assert.match(byId["webosbrew-mobile-device-access"].observation, /ports 3000 and 3001/);
  assert.match(byId["webosbrew-mobile-device-access"].limit, /not whether the key exists/);
  assert.match(byId["looking-glass-2021-owner-investigation"].scope, /2021 LG TV running webOS 6\.0/);
  assert.match(byId["looking-glass-2021-owner-investigation"].limit, /do not assign this report to B1, C1, or G1/i);
  assert.match(byId["lg-firmware-acr-43-21-73-static-map"].method, /Static analysis/);
  assert.match(byId["lg-firmware-acr-43-21-73-static-map"].observation, /com\.webos\.service\.acr/);
  assert.match(byId["lg-firmware-acr-43-21-73-static-map"].limit, /does not show that ACR was active/);
  assert.match(byId["tv-home-c5-root-privacy-audit"].observation, /agreements remained accepted after Live Plus was turned off/);
  assert.match(byId["tv-home-c5-root-privacy-audit"].observation, /ten audio-capture attempts failing while audio used HDMI eARC/);
  assert.match(byId["tv-home-c5-root-privacy-audit"].limit, /also blocks firmware-update hosts/);
  assert.equal(publicReferences.SOURCES.tvAcrFirmwareResearch.revision, "327a5f1d52351f63fb6b11b8c322f289aeb6752c");
  assert.equal(publicReferences.SOURCES.tvAcrFirmwareResearch.firmwareSha256, "88b76f9814da8f3452105acbc2b7ddd4a2bc5514fdfbddb38e98be6ca591d76e");
  assert.equal(publicReferences.SOURCES.lgTvBlocklist.revision, "68afe10de07bfdc8e8ecf91a7069a17419597271");
  assert.equal(publicReferences.SOURCES.webosDebloat.revision, "a269896606b83a31bb85f2f25146b51ceb876fe6");
  assert.equal(publicReferences.SOURCES.webosLockout.revision, "bc1b170f86aeb6bca176da5a9324158c759baa11");
  assert.equal(publicReferences.SOURCES.tvHomeC5Audit.revision, "3ccf07458cba16b0815619f0056140927e546fb1");
  assert.equal(compatibility.matchProfile(C6).id, "lg-oled77c6hup-webos26-43.21.79");
  assert.equal(publicReferences.microphoneSwitchForCohort("C5").webOS, "10.3.1");
  assert.match(publicReferences.microphoneSwitchForCohort("C5").method, /voiceinput\/factory\/getMicSwitchStatus/);
  assert.deepEqual(publicReferences.microphoneSwitchForCohort("C5").corroboratingSourceIds, [publicReferences.SOURCES.tvHomeC5Audit.id]);
  assert.equal(publicReferences.microphoneSwitchForCohort("C6"), null, "C5 hardware evidence must not transfer to C6");
});

test("recognizes only explicit model-family codes and keeps launch platform separate", () => {
  assert.equal(publicReferences.cohortForModel("OLED77C6HUP").series, "C6");
  assert.equal(publicReferences.cohortForModel("OLED42C24LA").series, "C2");
  assert.equal(publicReferences.cohortForModel("OLED65C54LA").series, "C5");
  assert.equal(publicReferences.cohortForModel("OLED65G26LA").launchWebOS, "22");
  assert.equal(publicReferences.cohortForModel("OLED65G26LA").series, "G2");
  assert.equal(publicReferences.cohortForModel("OLED55C17LB").series, "C1");
  assert.equal(publicReferences.cohortForModel("OLED65B7V-Z"), null);
  assert.equal(publicReferences.cohortForModel("OLED65CSPSA"), null);
  assert.equal(publicReferences.cohortForModel("unknown"), null);
});

test("detects the installed webOS release from LG's exact browser-engine table only", () => {
  const ua = (major) => `Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 WebAppManager`;
  for (const [engine, version] of Object.entries(publicReferences.ENGINE_MAJOR_TO_WEBOS)) {
    const sdkMajor = Object.keys(publicReferences.SDK_MAJOR_TO_WEBOS).find((major) => publicReferences.SDK_MAJOR_TO_WEBOS[major] === version);
    assert.equal(publicReferences.detectPlatform(ua(engine), `${sdkMajor}.0.0`).version, version);
  }
  assert.equal(publicReferences.detectPlatform(ua(999), "11.2.0"), null);
  assert.equal(publicReferences.detectPlatform(ua(132), "10.3.0"), null, "SDK and browser-engine platforms must agree");
  assert.equal(publicReferences.detectPlatform(ua(132)), null, "the TV-reported SDK is required");
  assert.equal(publicReferences.detectPlatform(ua(132), "unknown"), null);
  assert.equal(publicReferences.detectPlatform(ua(132).replace("Web0S", "Linux"), "11.2.0"), null);
  assert.equal(publicReferences.detectPlatform("Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Safari/537.36", "11.2.0"), null);
  assert.equal(publicReferences.detectPlatform(null, "11.2.0"), null);
});

test("keeps menu entries specific to the documented webOS release", () => {
  assert.deepEqual(Object.keys(publicReferences.MENU_REFERENCES).sort(), ["22", "23", "24", "25", "26", "6.x"]);
  for (const platform of Object.keys(publicReferences.MENU_REFERENCES)) {
    assert.ok(publicReferences.menuForPlatform(platform).length > 0);
  }
  const find = (platform, name) => publicReferences.menuForPlatform(platform).find((entry) => entry.name === name);
  assert.match(find("6.x", "Advertisement (legacy setting)").note, /does not call this Limit AD Tracking/);
  assert.equal(find("6.x", "Limit AD Tracking"), undefined);
  assert.match(find("22", "Limit AD Tracking").path, /General > System > Additional Settings > Advertisement/);
  assert.doesNotMatch(find("22", "Limit AD Tracking").path, /Support/);
  assert.equal(find("22", "Content Recommendation"), undefined);
  assert.equal(find("23", "Live Promotion"), undefined);
  assert.match(find("24", "Limit AD Tracking").path, /Support > Privacy & Terms > Advertisement/);
  assert.match(find("25", "Screen Saver Promotion").path, /Screen Saver Settings > Screen Saver Promotion/);
  assert.match(find("26", "Live Plus").path, /All Settings > System > Additional Settings/);
  assert.equal(publicReferences.menuForPlatform("5.0").length, 0);
});

const assert = require("node:assert/strict");
const test = require("node:test");
const model = require("../webos-app/src/privacy-model.js");
const compatibility = require("../webos-app/src/compatibility.js");
const publicReferences = require("../webos-app/src/community-reference.js");

const C6 = { model: "OLED77C6HUP", sdk: "11.2.0", firmware: "43.21.79" };

test("matches only the exact C6 model, SDK, and firmware tuple", () => {
  const profile = compatibility.matchProfile(C6);
  assert.equal(profile.id, "lg-oled77c6hup-webos26-43.21.79");
  assert.equal(profile.evidenceLevel, "source-mapped");
  assert.equal(profile.sampleCount, 1);
  assert.equal(compatibility.matchProfile({ ...C6, firmware: "43.21.80" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, sdk: "11.3.0" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, model: "OLED65C6HUP" }), null);
  assert.equal(compatibility.matchProfile({ ...C6, model: "LG OLED77C6HUP" }).id, profile.id);
  assert.equal(compatibility.matchProfile({ model: C6.model, sdk: C6.sdk }), null);
  assert.equal(compatibility.matchProfile(null), null);
});

test("does not infer support for any other B, C, or G generation", () => {
  for (const series of ["B1", "C1", "G1", "B2", "C2", "G2", "B3", "C3", "G3", "B4", "C4", "G4", "B5", "C5", "G5", "B6", "C6", "G6"]) {
    const modelName = series === "C6" ? "OLED65C6HUP" : `OLED77${series}HUP`;
    const candidate = { model: modelName, sdk: C6.sdk, firmware: C6.firmware };
    assert.equal(compatibility.matchProfile(candidate), null, `${series} must remain unmapped until its exact profile is reviewed`);
  }
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
  assert.deepEqual(report.compatibility, { profileId: null, evidenceLevel: "unmapped", sampleCount: 0, mappedControlCount: 0 });
  assert.equal(report.apiAccess.settingsService, "unavailable");
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
    assert.ok(["present", "absent", "reported-present", "reported-absent", "conflicting", "variant-limited", "unknown"].includes(cohort.microphone.status));
    assert.ok(cohort.microphone.summary.length > 0);
  }
  assert.equal(publicReferences.cohortForModel("OLED77C6HUP").microphone.status, "variant-limited");
  assert.equal(publicReferences.cohortForModel("OLED65C54LA").microphone.status, "conflicting");
  assert.equal(publicReferences.cohortForModel("OLED65B6HUP").microphone.status, "unknown");
  assert.deepEqual(Object.fromEntries(publicReferences.COHORTS.map((cohort) => [cohort.series, publicReferences.samplesForCohort(cohort.series).length])), {
    B1: 0, C1: 4, G1: 2, B2: 0, C2: 2, G2: 2, B3: 0, C3: 3, G3: 1,
    B4: 1, C4: 4, G4: 3, B5: 0, C5: 5, G5: 2, B6: 0, C6: 1, G6: 0
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
  assert.equal(publicReferences.COMMUNITY_SAMPLES.length, 67);
  assert.ok(publicReferences.COMMUNITY_SAMPLES.every((sample) => sample.sourceId && Object.values(publicReferences.SOURCES).some((source) => source.id === sample.sourceId)));
  assert.equal(publicReferences.samplesForCohort("C5").length, 5);
  assert.equal(publicReferences.samplesForCohort("G2").find((sample) => sample.project === "CleanYourTV").firmware, "33.23.05");
  assert.equal(publicReferences.samplesForCohort("B5").length, 0);
  assert.deepEqual(publicReferences.sampleCountsForCohort("C1"), { Glasshouse: 2, "webOS Unclutter": 1, "KallistoX C1 capture": 1 });
  assert.equal(publicReferences.samplesForCohort("C1").find((sample) => sample.project === "KallistoX C1 capture").status, "network-measured");
  assert.equal(publicReferences.samplesForCohort("G1").find((sample) => sample.project === "LG TV Blocklist").webOS, "Not recorded");
  assert.equal(publicReferences.samplesForCohort("G4").find((sample) => sample.project === "Life's Good Without Spying").firmware, "23.23.30");
  assert.equal(publicReferences.samplesForCohort("C5").find((sample) => sample.project === "tv-home").webOS, "webOS 11");
  assert.equal(publicReferences.samplesForCohort("C5").find((sample) => sample.project === "tv-home").firmware, null);
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
  assert.equal(findings.length, 20);
  const byId = Object.fromEntries(findings.map((finding) => [finding.id, finding]));
  assert.match(byId["glasshouse-live-plus"].method, /option\.livePlus/);
  assert.match(byId["glasshouse-live-plus"].limit, /Root-run/);
  assert.match(byId["glasshouse-lmt"].observation, /C2\/webOS 9\.2/);
  assert.match(byId["glasshouse-ad-id"].observation, /OLED65C8PUA firmware 05\.50\.15/);
  assert.match(byId["glasshouse-agreement-flags"].limit, /LG's native screen/);
  assert.match(byId["cleanyourtv-services"].method, /Root service integration/);
  assert.match(byId["cleanyourtv-services"].limit, /does not stop them/);
  assert.match(byId["glasshouse-c5-privacy-keys"].scope, /C5\/webOS 10\.3\.1/);
  assert.match(byId["glasshouse-c5-mic-switch"].method, /getMicSwitchStatus/);
  assert.match(byId["glasshouse-c5-mic-switch"].limit, /C6\/C6H/);
  assert.match(byId["own-your-glass-microphone-paths"].limit, /Root-only/);
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

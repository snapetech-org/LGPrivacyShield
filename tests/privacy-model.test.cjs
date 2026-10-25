const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../webos-app/src/privacy-model.js");

test("normalizes known on/off values without guessing unknown values", () => {
  assert.equal(model.normalizeToggle("on"), "on");
  assert.equal(model.normalizeToggle("onByUser"), "on");
  assert.equal(model.normalizeToggle("offByUser"), "off");
  assert.equal(model.normalizeToggle(false), "off");
  assert.equal(model.normalizeToggle("enabled"), "unknown");
});

test("reads consent only from explicit agreement acceptance state", () => {
  const record = { eulaInfoNetwork: { eulaList: [
    { id: "S_VNG", accepted: false },
    { id: "S_SVC", accepted: true }
  ] } };
  assert.equal(model.agreementState(record, "S_VNG"), "withdrawn");
  assert.equal(model.agreementState(record, "S_SVC"), "accepted");
  assert.equal(model.agreementState(record, "S_TAG"), "unknown");
});

test("maps every C6 agreement and separates required service terms from optional consents", () => {
  assert.deepEqual(model.AGREEMENTS.map(({ id }) => id), [
    "S_ADG", "S_VNG", "S_TAG", "S_MKT", "S_DPA", "S_PRG", "S_SVC"
  ]);
  assert.deepEqual(model.AGREEMENTS.filter(({ required }) => required).map(({ id }) => id), ["S_PRG", "S_SVC"]);
  assert.match(model.AGREEMENTS.find(({ id }) => id === "S_ADG").acceptedEffect, /Live Plus.*ACR/i);
  assert.match(model.AGREEMENTS.find(({ id }) => id === "S_TAG").acceptedEffect, /both.*Viewing Information/i);
  assert.match(model.AGREEMENTS.find(({ id }) => id === "S_DPA").acceptedEffect, /ad measurement and analytics/i);
  assert.match(model.AGREEMENTS.find(({ id }) => id === "S_MKT").declinedEffect, /does not identify message channels/i);
  assert.ok(model.AGREEMENTS.every(({ acceptedEffect, declinedEffect, evidence }) => acceptedEffect && declinedEffect && evidence));
});

test("uses current selectable records and exposes additional model agreements without guessing effects", () => {
  const record = { eulaInfoNetwork: { eulaList: [
    { id: "S_SVC", type: "M", accepted: true, title: "Terms of Use" },
    { id: "S_PRG", type: "M", accepted: true, title: "Privacy Policy" },
    { id: "S_DIA", type: "M", accepted: false, title: "Diagnostic &amp; Data Agreement<br>Additional terms" },
    { id: "S_LGN", type: "L", accepted: false, title: "Legal Notice" },
    { id: "S_ALL", type: "S", accepted: false, title: "Select All" },
    { id: "OTHER_ID", type: "M", accepted: false, title: "Ignored malformed identifier" }
  ] } };
  assert.equal(model.agreementState(record, "S_SVC"), "accepted");
  assert.equal(model.hasAgreementRecord(record), true);
  const summary = model.featureConsentSummary(record);
  assert.equal(summary.find(({ id }) => id === "S_SVC").state, "accepted");
  const additional = summary.find(({ id }) => id === "S_DIA");
  assert.equal(additional.title, "Diagnostic & Data Agreement Additional terms");
  assert.equal(additional.state, "withdrawn");
  assert.equal(additional.unmapped, true);
  assert.match(additional.acceptedEffect, /no verified feature map/i);
  assert.equal(summary.some(({ id }) => id === "S_LGN" || id === "S_ALL" || id === "OTHER_ID"), false);
});

test("uses the title reported by this TV while retaining the sourced agreement effect", () => {
  const summary = model.featureConsentSummary({ eulaInfoNetwork: { eulaList: [
    { id: "S_ADG", type: "M", accepted: true, title: "Informations de visionnement" }
  ] } });
  const agreement = summary.find(({ id }) => id === "S_ADG");
  assert.equal(agreement.title, "Informations de visionnement");
  assert.match(agreement.acceptedEffect, /Live Plus.*ACR/i);
  assert.match(agreement.evidence, /recorded.*on the C6/i);
});

test("privacy preset applies only reviewed reversible choices", () => {
  const preset = model.privacyPreset();
  assert.deepEqual(preset.map((entry) => entry.key), [
    "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "screenSaverAd",
    "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId"
  ]);
  assert.deepEqual(preset.map((entry) => entry.value), ["off", "off", "off", "on", "off", "off", "off", "off", "on", "off"]);
  assert.ok(!preset.some((entry) => ["doNotSellMyPersonalInformation", "hbbTV", "aiNudge", "aiSettingsNudge"].includes(entry.key)));
});

test("requires verified settings before applying the privacy preset", () => {
  const settings = Object.fromEntries(model.privacyPreset().map(({ key, value }) => [key, value]));
  assert.equal(model.canApplyPrivacyPreset(settings), true);
  assert.equal(model.canApplyPrivacyPreset({ ...settings, lmt: "unknown" }), false);
  assert.equal(model.canApplyPrivacyPreset({ ...settings, hbbTV: "unknown", doNotSellMyPersonalInformation: "unknown" }), true);
});

test("counts unknown settings separately from enabled settings", () => {
  assert.deepEqual(model.countPrivacyControls({ livePlus: "off", voiceLongDistance: "on" }), { off: 1, on: 1, unknown: 15 });
  assert.deepEqual(model.countRecommendedControls({ livePlus: "off", voiceLongDistance: "on" }), { recommended: 1, total: 17, unknown: 15 });
});

test("uses only allowlisted values from a privileged settings snapshot", () => {
  assert.deepEqual(model.snapshotSettings({ settings: {
    livePlus: "off",
    voiceLongDistance: "on",
    turnOnByVoice: "off",
    lmt: "on",
    doNotSellMyPersonalInformation: "off",
    screenSaverAd: "off",
    hbbTvDnt: "on",
    hbbTvDeviceId: "off",
    hbbTV: "off",
    homePromotion: "off",
    livePromotion: "off",
    contentRecommendation: "off",
    thirdPartyCookie: "onByUser",
    bleAdvertisingOnOff: "off",
    homeSenseAbsence: "off",
    aiNudge: "off",
    aiSettingsNudge: "on",
    unrelated: "on"
  } }), {
    livePlus: "off",
    voiceLongDistance: "on",
    turnOnByVoice: "off",
    lmt: "on",
    doNotSellMyPersonalInformation: "off",
    screenSaverAd: "off",
    hbbTvDnt: "on",
    hbbTvDeviceId: "off",
    hbbTV: "off",
    homePromotion: "off",
    livePromotion: "off",
    contentRecommendation: "off",
    thirdPartyCookie: "on",
    bleAdvertisingOnOff: "off",
    homeSenseAbsence: "off",
    aiNudge: "off",
    aiSettingsNudge: "on"
  });
  assert.deepEqual(model.snapshotSettings(null), Object.fromEntries(model.CONTROLS.map(({ key }) => [key, "unknown"])));
});

test("uses agreement snapshots only when they contain explicit acceptance state", () => {
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG", accepted: false }] } }), true);
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG" }] } }), false);
});


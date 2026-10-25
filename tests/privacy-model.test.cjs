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

test("privacy preset applies only reviewed reversible choices", () => {
  const preset = model.privacyPreset();
  assert.deepEqual(preset.map((entry) => entry.key), [
    "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "screenSaverAd",
    "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId"
  ]);
  assert.deepEqual(preset.map((entry) => entry.value), ["off", "off", "off", "on", "off", "off", "off", "off", "on", "off"]);
  assert.ok(!preset.some((entry) => ["doNotSellMyPersonalInformation", "hbbTV"].includes(entry.key)));
});

test("requires verified settings before applying the privacy preset", () => {
  const settings = Object.fromEntries(model.privacyPreset().map(({ key, value }) => [key, value]));
  assert.equal(model.canApplyPrivacyPreset(settings), true);
  assert.equal(model.canApplyPrivacyPreset({ ...settings, lmt: "unknown" }), false);
  assert.equal(model.canApplyPrivacyPreset({ ...settings, hbbTV: "unknown", doNotSellMyPersonalInformation: "unknown" }), true);
});

test("counts unknown settings separately from enabled settings", () => {
  assert.deepEqual(model.countPrivacyControls({ livePlus: "off", voiceLongDistance: "on" }), { off: 1, on: 1, unknown: 13 });
  assert.deepEqual(model.countRecommendedControls({ livePlus: "off", voiceLongDistance: "on" }), { recommended: 1, total: 15, unknown: 13 });
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
    homeSenseAbsence: "off"
  });
  assert.deepEqual(model.snapshotSettings(null), Object.fromEntries(model.CONTROLS.map(({ key }) => [key, "unknown"])));
});

test("uses agreement snapshots only when they contain explicit acceptance state", () => {
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG", accepted: false }] } }), true);
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG" }] } }), false);
});


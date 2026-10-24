const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../webos-app/src/privacy-model.js");

test("normalizes known on/off values without guessing unknown values", () => {
  assert.equal(model.normalizeToggle("on"), "on");
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

test("privacy preset disables only the explicit privacy control list", () => {
  const preset = model.privacyPreset();
  assert.deepEqual(preset.map((entry) => entry.key), ["livePlus", "voiceLongDistance", "turnOnByVoice"]);
  assert.ok(preset.every((entry) => entry.value === "off"));
});

test("requires verified settings before applying the privacy preset", () => {
  assert.equal(model.canApplyPrivacyPreset({ livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off" }), true);
  assert.equal(model.canApplyPrivacyPreset({ livePlus: "off", voiceLongDistance: "unknown", turnOnByVoice: "off" }), false);
});

test("counts unknown settings separately from enabled settings", () => {
  assert.deepEqual(model.countPrivacyControls({ livePlus: "off", voiceLongDistance: "on" }), { off: 1, on: 1, unknown: 1 });
});

test("uses only allowlisted values from a privileged settings snapshot", () => {
  assert.deepEqual(model.snapshotSettings({ settings: {
    livePlus: "off",
    voiceLongDistance: "on",
    turnOnByVoice: "off",
    unrelated: "on"
  } }), {
    livePlus: "off",
    voiceLongDistance: "on",
    turnOnByVoice: "off"
  });
  assert.deepEqual(model.snapshotSettings(null), {
    livePlus: "unknown",
    voiceLongDistance: "unknown",
    turnOnByVoice: "unknown"
  });
});

test("uses agreement snapshots only when they contain explicit acceptance state", () => {
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG", accepted: false }] } }), true);
  assert.equal(model.hasAgreementRecord({ eulaInfoNetwork: { eulaList: [{ id: "S_VNG" }] } }), false);
});


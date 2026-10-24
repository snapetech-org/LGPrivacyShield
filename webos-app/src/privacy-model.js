(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PrivacyShieldModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONTROLS = Object.freeze([
    { key: "livePlus", category: "option", label: "Live Plus", safeValue: "off", feature: "Viewing recognition and related Live Plus recommendations" },
    { key: "voiceLongDistance", category: "general", label: "Hands-free voice recognition", safeValue: "off", feature: "Far-field voice control" },
    { key: "turnOnByVoice", category: "option", label: "Voice wake", safeValue: "off", feature: "Voice wake from standby" }
  ]);

  const AGREEMENTS = Object.freeze([
    { id: "S_ADG", title: "Viewing Information Agreement", feature: "Some viewing-based services and context-aware voice commands may be unavailable. Live Plus controls ACR separately." },
    { id: "S_VNG", title: "Voice Information", feature: "LG voice recognition, including remote push-to-talk, may be unavailable." },
    { id: "S_TAG", title: "Interest-Based Advertisement Agreement", feature: "Interest-based ad personalization is unavailable." },
    { id: "S_MKT", title: "Marketing Communications Agreement", feature: "LG marketing communications are unavailable." },
    { id: "S_DPA", title: "Data Partners Agreement", feature: "Some partner-data services may be unavailable." },
    { id: "S_PRG", title: "Privacy Policy", required: true, feature: "Required for LG smart services." },
    { id: "S_SVC", title: "Terms of Use", required: true, feature: "Required for LG smart services." }
  ]);

  function normalizeToggle(value) {
    if (value === true || value === 1 || value === "on" || value === "true") return "on";
    if (value === false || value === 0 || value === "off" || value === "false") return "off";
    return "unknown";
  }

  function pickValue(response, key) {
    if (!response || typeof response !== "object") return undefined;
    if (Object.prototype.hasOwnProperty.call(response, key)) return response[key];
    if (response.settings && Object.prototype.hasOwnProperty.call(response.settings, key)) return response.settings[key];
    if (response.results && Object.prototype.hasOwnProperty.call(response.results, key)) return response.results[key];
    return undefined;
  }

  function agreementList(record) {
    if (!record) return [];
    if (Array.isArray(record)) return record;
    if (record.eulaInfoNetwork && Array.isArray(record.eulaInfoNetwork.eulaList)) return record.eulaInfoNetwork.eulaList;
    if (Array.isArray(record.eulaList)) return record.eulaList;
    return [];
  }

  function agreementState(record, id) {
    const item = agreementList(record).find((entry) => entry && entry.id === id);
    if (!item || typeof item.accepted !== "boolean") return "unknown";
    return item.accepted ? "accepted" : "withdrawn";
  }

  function countPrivacyControls(settings) {
    const values = CONTROLS.map(({ key }) => normalizeToggle(settings && settings[key]));
    return {
      off: values.filter((value) => value === "off").length,
      on: values.filter((value) => value === "on").length,
      unknown: values.filter((value) => value === "unknown").length
    };
  }

  function featureConsentSummary(record) {
    return AGREEMENTS.map((agreement) => ({
      ...agreement,
      state: agreementState(record, agreement.id)
    }));
  }

  function snapshotSettings(snapshot) {
    const source = snapshot && snapshot.settings && typeof snapshot.settings === "object" ? snapshot.settings : {};
    return Object.fromEntries(CONTROLS.map(({ key }) => [key, normalizeToggle(source[key])]));
  }

  function hasAgreementRecord(record) {
    return AGREEMENTS.some(({ id }) => agreementState(record, id) !== "unknown");
  }

  function privacyPreset() {
    return CONTROLS.map(({ key, category, safeValue }) => ({ key, category, value: safeValue }));
  }

  function canApplyPrivacyPreset(settings) {
    return CONTROLS.every(({ key }) => normalizeToggle(settings && settings[key]) !== "unknown");
  }

  return Object.freeze({
    AGREEMENTS,
    CONTROLS,
    agreementState,
    canApplyPrivacyPreset,
    countPrivacyControls,
    featureConsentSummary,
    hasAgreementRecord,
    normalizeToggle,
    pickValue,
    privacyPreset,
    snapshotSettings
  });
});

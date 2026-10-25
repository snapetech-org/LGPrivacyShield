(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PrivacyShieldModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONTROLS = Object.freeze([
    { key: "livePlus", category: "option", group: "Viewing", label: "Live Plus (ACR)", safeValue: "off", feature: "Live Plus viewing recognition and related recommendations" },
    { key: "voiceLongDistance", category: "general", group: "Voice", label: "Hands-free voice recognition", safeValue: "off", feature: "Far-field voice commands" },
    { key: "turnOnByVoice", category: "option", group: "Voice", label: "Voice wake", safeValue: "off", feature: "Voice wake from standby" },
    { key: "lmt", category: "general", group: "Advertising", label: "Limit Ad Tracking", safeValue: "on", feature: "Ad targeting may be less personalized" },
    { key: "doNotSellMyPersonalInformation", category: "general", group: "Advertising", label: "Do Not Sell My Personal Information", safeValue: "on", writer: "admanager", preset: false, feature: "LG instructs its third-party providers to stop commercializing personal information; some ad-supported services may remain" },
    { key: "screenSaverAd", category: "general", group: "Advertising", label: "Screen Saver Promotion", safeValue: "off", feature: "Promotional ads in supported screen savers and apps" },
    { key: "homePromotion", category: "general", group: "Advertising", label: "Home menu ads", safeValue: "off", feature: "Sponsored advertisements in the Home menu" },
    { key: "livePromotion", category: "option", group: "Advertising", label: "Live Promotion", safeValue: "off", feature: "Custom ads and services while watching content; available when Live Plus is on" },
    { key: "contentRecommendation", category: "other", group: "Recommendations", label: "Home content recommendations", safeValue: "off", feature: "Recommendation categories in the Home menu" },
    { key: "aiNudge", category: "general", group: "Recommendations", label: "Smart tips", safeValue: "off", preset: false, feature: "Suggestions for TV features while watching or using apps" },
    { key: "aiSettingsNudge", category: "general", group: "Recommendations", label: "Smart tips in Settings", safeValue: "off", preset: false, feature: "Suggested settings shown in LG's Settings menu" },
    { key: "hbbTvDnt", category: "option", group: "Broadcast services", label: "HbbTV Do Not Track", safeValue: "on", feature: "HbbTV apps are asked to disable user tracking" },
    { key: "hbbTvDeviceId", category: "option", group: "Broadcast services", label: "HbbTV Device ID", safeValue: "off", feature: "HbbTV apps may receive a unique HbbTV-only identifier" },
    { key: "thirdPartyCookie", category: "option", group: "Broadcast services", label: "HbbTV third-party cookies", safeValue: "off", writer: "thirdPartyCookie", preset: false, feature: "Third-party cookies used by HbbTV services" },
    { key: "hbbTV", category: "option", group: "Broadcast services", label: "HbbTV interactive services", safeValue: "off", preset: false, feature: "Broadcast-linked interactive apps and services" },
    { key: "bleAdvertisingOnOff", category: "network", group: "Connections", label: "Bluetooth wake", safeValue: "off", preset: false, feature: "Turning on the TV from a mobile device over Bluetooth while in networked standby" },
    { key: "homeSenseAbsence", category: "option", group: "Presence features", label: "Sleep on Absence", safeValue: "off", preset: false, feature: "Automatically turns the TV off after LG detects the user is away" }
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
    if (value === true || value === 1 || value === "on" || value === "onByUser" || value === "true") return "on";
    if (value === false || value === 0 || value === "off" || value === "offByUser" || value === "false") return "off";
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

  function countPrivacyControls(settings, controls = CONTROLS) {
    const values = controls.map(({ key }) => normalizeToggle(settings && settings[key]));
    return {
      off: values.filter((value) => value === "off").length,
      on: values.filter((value) => value === "on").length,
      unknown: values.filter((value) => value === "unknown").length
    };
  }

  function countRecommendedControls(settings, controls = CONTROLS) {
    const source = settings && typeof settings === "object" ? settings : {};
    const known = controls.filter(({ key }) => normalizeToggle(source[key]) !== "unknown");
    const recommended = known.filter(({ key, safeValue }) => normalizeToggle(source[key]) === safeValue).length;
    return { recommended, total: controls.length, unknown: controls.length - known.length };
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
    return CONTROLS.filter(({ preset }) => preset !== false)
      .map(({ key, category, safeValue }) => ({ key, category, value: safeValue }));
  }

  function canApplyPrivacyPreset(settings, preset = privacyPreset()) {
    return Array.isArray(preset) && preset.length > 0
      && preset.every(({ key }) => normalizeToggle(settings && settings[key]) !== "unknown");
  }

  return Object.freeze({
    AGREEMENTS,
    CONTROLS,
    agreementState,
    canApplyPrivacyPreset,
    countPrivacyControls,
    countRecommendedControls,
    featureConsentSummary,
    hasAgreementRecord,
    normalizeToggle,
    pickValue,
    privacyPreset,
    snapshotSettings
  });
});

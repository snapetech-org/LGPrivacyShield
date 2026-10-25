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
    {
      id: "S_ADG",
      title: "Viewing Information Agreement",
      acceptedEffect: "Live Plus can use ACR when it is on. LG says ACR may process content fingerprints with device, source, and network information for audience analysis; some source-aware voice commands may also need this agreement.",
      declinedEffect: "ACR is unavailable; some source-aware voice commands may be limited.",
      evidence: "LG privacy statement; S_ADG was recorded as Viewing Information Agreement on the C6."
    },
    {
      id: "S_VNG",
      title: "Voice Information",
      acceptedEffect: "LG voice recognition can run after a voice action, such as pressing the remote microphone button or enabling supported hands-free voice. Consent alone does not activate it.",
      declinedEffect: "LG voice recognition is unavailable. Voice wake and hands-free settings remain separate controls.",
      evidence: "LG privacy statement; S_VNG was recorded as Voice Information on the C6."
    },
    {
      id: "S_TAG",
      title: "Interest-Based Advertisement Agreement",
      acceptedEffect: "Permits interest-based and cross-device ads under this agreement. LG says ACR viewing data requires both this and Viewing Information consent.",
      declinedEffect: "No consent for interest-based or cross-device ads under this agreement. Other ad or service processing may be covered elsewhere.",
      evidence: "LG privacy statement; S_TAG was recorded as Interest-Based Advertisement Agreement on the C6."
    },
    {
      id: "S_MKT",
      title: "Marketing Communications Agreement",
      acceptedEffect: "Permits marketing communications covered by this agreement.",
      declinedEffect: "This consent is absent. LG's public summary does not identify message channels or TV features controlled by it.",
      evidence: "The C6 records this title for S_MKT. LG lists it as optional but does not specify its channels or TV effects."
    },
    {
      id: "S_DPA",
      title: "Data Partners Agreement",
      acceptedEffect: "For Canada, LG support notes link this agreement to ad measurement and analytics with third-party partners.",
      declinedEffect: "No consent under this agreement. LG does not identify a specific service that stops on this TV.",
      evidence: "The C6 records this title for S_DPA. Canadian LG software notes describe partner ad measurement and analytics."
    },
    {
      id: "S_PRG",
      title: "Privacy Policy",
      required: true,
      acceptedEffect: "Required with Terms of Use for LG smart services, including apps such as Netflix and YouTube.",
      declinedEffect: "LG smart services remain unavailable. Regular TV features can continue if agreement choices are deferred.",
      evidence: "LG User Agreement help; the C6 records this title for S_PRG."
    },
    {
      id: "S_SVC",
      title: "Terms of Use",
      required: true,
      acceptedEffect: "Required with the Privacy Policy for LG smart services, including apps such as Netflix and YouTube.",
      declinedEffect: "LG smart services remain unavailable. Regular TV features can continue if agreement choices are deferred.",
      evidence: "LG User Agreement help; the C6 records this title for S_SVC."
    }
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

  function agreementRecord(record, id) {
    const matches = agreementList(record).filter((entry) => entry && entry.id === id);
    const selectable = matches.filter((entry) => entry.type === "M");
    const candidates = selectable.length ? selectable : matches;
    return candidates[candidates.length - 1] || null;
  }

  function agreementState(record, id) {
    const item = agreementRecord(record, id);
    if (!item || typeof item.accepted !== "boolean") return "unknown";
    return item.accepted ? "accepted" : "withdrawn";
  }

  function agreementTitle(value) {
    if (typeof value !== "string") return "";
    return value.replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ").trim().slice(0, 160);
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
    const knownIds = new Set(AGREEMENTS.map(({ id }) => id));
    const known = AGREEMENTS.map((agreement) => {
      const current = agreementRecord(record, agreement.id);
      const title = agreementTitle(current && current.title);
      return {
        ...agreement,
        ...(title ? { title } : {}),
        state: agreementState(record, agreement.id)
      };
    });
    const additional = new Map();
    for (const entry of agreementList(record)) {
      if (!entry || entry.type !== "M" || typeof entry.id !== "string"
        || !/^S_[A-Z0-9]{1,8}$/.test(entry.id) || knownIds.has(entry.id)) continue;
      const title = agreementTitle(entry.title);
      additional.set(entry.id, {
        id: entry.id,
        title: title || "Additional LG agreement",
        evidence: "This TV reports the agreement and saved choice. Its feature effect is not mapped in PrivacyShield.",
        acceptedEffect: "Acceptance is recorded by LG. PrivacyShield has no verified feature map for this agreement.",
        declinedEffect: "This choice is not accepted. PrivacyShield has not verified which services or data uses it affects.",
        state: typeof entry.accepted === "boolean" ? (entry.accepted ? "accepted" : "withdrawn") : "unknown",
        unmapped: true
      });
    }
    return known.concat([...additional.values()]);
  }

  function snapshotSettings(snapshot) {
    const source = snapshot && snapshot.settings && typeof snapshot.settings === "object" ? snapshot.settings : {};
    return Object.fromEntries(CONTROLS.map(({ key }) => [key, normalizeToggle(source[key])]));
  }

  function hasAgreementRecord(record) {
    return AGREEMENTS.some(({ id }) => agreementState(record, id) !== "unknown")
      || agreementList(record).some((entry) => entry && entry.type === "M"
        && typeof entry.id === "string" && /^S_[A-Z0-9]{1,8}$/.test(entry.id));
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

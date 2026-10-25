(function () {
  "use strict";

  const Model = window.PrivacyShieldModel;
  const Api = window.PrivacyShieldDeviceApi;
  const Remote = window.PrivacyShieldRemoteNavigation;
  const Compatibility = window.PrivacyShieldCompatibility;
  const PublicReferences = window.PrivacyShieldCommunityReference;
  const SAVE_KEY = "privacyshield.saved-controls.v1";
  const state = {
    settings: {}, agreements: null, model: null, profile: null, network: null, root: null,
    controlReads: {}, apiAccess: {}, errors: []
  };
  let toastTimer;
  let agreementReviewRequested = false;
  const pendingSettings = new Set();
  const pendingActions = new Set();

  const $ = (selector, parent) => (parent || document).querySelector(selector);
  const $$ = (selector, parent) => Array.from((parent || document).querySelectorAll(selector));

  function responseValue(response, key) {
    return Model.pickValue(response, key);
  }

  function showToast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("is-visible"), 3400);
  }

  function statusPill(node, label, stateName) {
    node.textContent = label;
    node.className = `status-pill status-${stateName}`;
  }

  function setView(name, focusTarget) {
    $$(".tab").forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    $$(".view").forEach((view) => {
      const active = view.id === `view-${name}`;
      view.classList.toggle("is-visible", active);
      view.hidden = !active;
    });
    $("#main-content").scrollTop = 0;
    const view = $(`#view-${name}`);
    const tab = $(`.tab[data-view=\"${name}\"]`);
    if (focusTarget === "first") focusRemote(focusableElements(view)[0] || tab);
    else focusRemote(focusTarget && focusTarget.nodeType === 1 ? focusTarget : tab);
  }

  const FOCUSABLE_SELECTOR = "button:not(:disabled), input:not(:disabled), summary, a[href], [tabindex='0']";

  function focusAnchor(element) {
    return element && element.matches("input[type='checkbox']")
      ? element.closest(".switch") || element
      : element;
  }

  function focusRect(element) {
    const anchor = focusAnchor(element);
    return anchor && typeof anchor.getBoundingClientRect === "function"
      ? anchor.getBoundingClientRect()
      : null;
  }

  function focusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
      if (element.disabled || element.closest("[hidden]")) return false;
      const closedDetails = element.closest("details:not([open])");
      if (closedDetails && element !== closedDetails.querySelector("summary")) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function focusRemote(element) {
    if (!element || element.disabled) return false;
    element.focus();
    const anchor = focusAnchor(element);
    if (anchor && typeof anchor.scrollIntoView === "function") {
      anchor.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    return true;
  }

  function hasFocusWithin(element) {
    return Boolean(element && (element === document.activeElement || element.contains(document.activeElement)));
  }

  function restoreFocusAfterPending(target, hadFocus, fallback) {
    if (!hadFocus) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    const destination = target && !target.disabled ? target : fallback;
    if (destination && !destination.disabled) focusRemote(destination);
  }

  function activeTab() {
    return $(".tab.is-active");
  }

  function activeView() {
    return $(".view.is-visible");
  }

  function scrollMainPage(direction) {
    const main = $("#main-content");
    const maximum = Math.max(0, main.scrollHeight - main.clientHeight);
    if (maximum < 4) return false;
    const step = Math.max(180, Math.round(main.clientHeight * 0.68));
    const target = Math.max(0, Math.min(maximum, main.scrollTop + direction * step));
    if (Math.abs(target - main.scrollTop) < 3) return false;
    main.scrollTo({ top: target, behavior: "auto" });
    return true;
  }

  function switchSectionByKey(key) {
    const tabs = $$(".tab");
    const index = tabs.indexOf(activeTab());
    const nextIndex = index + (key === "ArrowRight" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= tabs.length) return false;
    setView(tabs[nextIndex].dataset.view, tabs[nextIndex]);
    return true;
  }

  function moveRemoteFocus(key) {
    const focused = document.activeElement;
    const tab = activeTab();
    const view = activeView();
    const onTab = focused && focused.classList.contains("tab");
    const main = $("#main-content");

    if (onTab && (key === "ArrowLeft" || key === "ArrowRight")) {
      return switchSectionByKey(key);
    }
    if (onTab) {
      if (key === "ArrowUp") return scrollMainPage(-1);
      if (main.scrollTop > 0) return scrollMainPage(1);
      const first = focusableElements(view)[0];
      if (first) return focusRemote(first);
      if (scrollMainPage(1)) return true;
      return focusRemote($("#footer-refresh"));
    }

    const candidates = focusableElements(view);
    const next = Remote.directionalCandidate(
      focusAnchor(focused),
      candidates,
      key,
      focusRect
    );
    if (next) return focusRemote(next);

    if (key === "ArrowLeft" || key === "ArrowRight") return switchSectionByKey(key);
    if (key === "ArrowUp") {
      if (main.scrollTop > 0) {
        focusRemote(tab);
        return scrollMainPage(-1);
      }
      return focusRemote(tab);
    }
    if (key === "ArrowDown") {
      if (scrollMainPage(1)) {
        focusRemote(tab);
        return true;
      }
      return focusRemote($("#footer-refresh"));
    }
    return false;
  }

  function handleRemoteKey(event) {
    const key = Remote.keyFromEvent(event);
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      moveRemoteFocus(key);
      return;
    }
    if (key === "Enter" || key === "Space") {
      const focused = document.activeElement;
      if (focused && focused.matches(".switch[aria-disabled='true']")) {
        if (event.repeat) return;
        event.preventDefault();
        const message = focused.dataset.lockReason || "Changes are locked until this setting has been verified.";
        $("#control-status").textContent = message;
        showToast(message);
        return;
      }
      if (!focused || !focused.matches("button:not(:disabled), input:not(:disabled), summary, a[href]")) return;
      if (event.repeat) return;
      event.preventDefault();
      focused.click();
      return;
    }
    if (key === "Back" || key === "Escape") {
      event.preventDefault();
      if (activeView()?.id !== "view-overview") {
        setView("overview", $(".tab[data-view='overview']"));
      } else if (key === "Back" && window.webOS && typeof window.webOS.platformBack === "function") {
        window.webOS.platformBack();
      }
    }
  }

  function bindRemoteFocusIndicator() {
    document.addEventListener("focusin", (event) => {
      $$(".remote-focused").forEach((element) => element.classList.remove("remote-focused"));
      const anchor = focusAnchor(event.target);
      if (anchor && anchor.classList) anchor.classList.add("remote-focused");
    });
  }

  function settingValues(response, keys) {
    const out = {};
    for (const key of keys) out[key] = Model.pickValue(response, key);
    return out;
  }

  function infoModel(response) {
    const model = response && (response.modelName || response.model || response.modelNameText);
    const sdk = response && (response.sdkVersion || response.webOSVersion || response.version);
    const firmware = response && (response.firmwareVersion || response.firmware || response.softwareVersion);
    const platform = PublicReferences.detectPlatform(window.navigator && window.navigator.userAgent, sdk || "");
    return {
      model: model || "Model unavailable",
      sdk: sdk || "Version unavailable",
      firmware: firmware || "",
      platformVersion: platform ? platform.version : null
    };
  }

  function agreementRecord(response) {
    return response && (response.eulaInfoNetwork || response.settings?.eulaInfoNetwork || response.results?.eulaInfoNetwork || response);
  }

  function snapshotSettings() {
    return Model.snapshotSettings(parseRootSnapshot(state.root));
  }

  function paintAgreementState() {
    for (const entry of Model.featureConsentSummary(state.agreements)) {
      const row = $(`[data-agreement="${entry.id}"]`);
      if (!row) continue;
      const pill = $(".status-pill", row);
      const label = entry.state === "accepted" ? "Accepted" : entry.state === "withdrawn" ? "Not accepted" : "Unavailable";
      statusPill(pill, label, entry.state === "accepted" ? "on" : entry.state === "withdrawn" ? "off" : "unknown");
    }
  }

  function setControl(key, value, mapped) {
    const checkbox = $(`[data-setting="${key}"]`);
    const meta = $(`#${key}-meta`);
    if (!checkbox) return;
    const normalized = Model.normalizeToggle(value);
    const switchLabel = checkbox.closest(".switch");
    checkbox.checked = normalized === "on";
    checkbox.disabled = normalized === "unknown" || !mapped;
    if (normalized === "unknown" || !mapped) {
      switchLabel.tabIndex = 0;
      switchLabel.setAttribute("aria-disabled", "true");
      switchLabel.dataset.lockReason = !mapped
        ? "This model and software version have not been mapped. Controls are read-only."
        : "Changes are locked because the current value could not be read.";
    } else {
      switchLabel.removeAttribute("tabindex");
      switchLabel.removeAttribute("aria-disabled");
      delete switchLabel.dataset.lockReason;
    }
    const stateNode = $(".switch-state", switchLabel);
    stateNode.textContent = !mapped ? "Not mapped" : normalized === "unknown" ? "Can't read" : normalized === "on" ? "On" : "Off";
    if (meta) meta.textContent = !mapped
      ? "Read-only: this model and software version have not been mapped."
      : normalized === "unknown"
        ? "Current value could not be read. Changes are locked."
        : `Current value: ${normalized === "on" ? "On" : "Off"}`;
  }

  function getConsentFlag(key) {
    const source = state.agreements;
    if (!source) return undefined;
    if (source.eulaStatus && Object.prototype.hasOwnProperty.call(source.eulaStatus, key)) return source.eulaStatus[key];
    if (source.settings && source.settings.eulaStatus) return source.settings.eulaStatus[key];
    return undefined;
  }

  function paintOverview() {
    const counts = Model.countRecommendedControls(state.settings);
    const profileAllowsPreset = Compatibility.canApplyPreset(state.profile, Model.privacyPreset());
    $("#privacy-preset").disabled = !profileAllowsPreset || !Model.canApplyPrivacyPreset(state.settings);
    const value = !state.profile ? "Device map not verified" : counts.unknown ? "Some values unavailable" : counts.recommended === counts.total ? "Recommended values set" : "Review privacy settings";
    $("#posture-value").textContent = value;
    $("#posture-detail").textContent = !state.profile
      ? "Settings are read-only until this model and software version are mapped."
      : counts.unknown
      ? `${counts.recommended} of ${counts.total} settings match recommendations; ${counts.unknown} could not be read`
      : `${counts.recommended} of ${counts.total} settings match the recommended values`;

    const viewing = Model.normalizeToggle(state.settings.livePlus);
    $("#summary-viewing").textContent = viewing === "off" ? "Live Plus is off" : viewing === "on" ? "Live Plus is on" : "Live Plus status unavailable";
    $("#dot-viewing").className = `state-dot ${viewing === "off" ? "is-safe" : viewing === "on" ? "is-on" : ""}`;

    const voiceOff = Model.normalizeToggle(state.settings.voiceLongDistance) === "off" && Model.normalizeToggle(state.settings.turnOnByVoice) === "off";
    const voiceOn = Model.normalizeToggle(state.settings.voiceLongDistance) === "on" || Model.normalizeToggle(state.settings.turnOnByVoice) === "on";
    $("#summary-voice").textContent = voiceOff ? "Hands-free voice and voice wake are off" : voiceOn ? "At least one voice setting is on" : "Voice settings unavailable";
    $("#dot-voice").className = `state-dot ${voiceOff ? "is-safe" : voiceOn ? "is-on" : ""}`;

    const connected = state.network && (state.network.isInternetConnectionAvailable === true || state.network.isInternetConnectionAvailable === "true");
    $("#summary-network").textContent = connected ? "Connected to the internet" : state.network ? "No internet connection" : "Connection status unavailable";
    $("#dot-network").className = `state-dot ${state.network ? "" : ""}`;

    const data = state.model || {};
    $("#device-summary").textContent = data.model || "LG webOS TV";
    $("#model-name").textContent = data.model || "Unavailable";
    $("#webos-version").textContent = [
      data.platformVersion ? `webOS ${data.platformVersion}` : "",
      data.sdk && `SDK ${data.sdk}`,
      data.firmware && `firmware ${data.firmware}`
    ].filter(Boolean).join(" · ") || "Unavailable";
    $("#network-name").textContent = connected ? "Connected" : state.network ? "Not connected" : "Unavailable";
    statusPill($("#connection-status"), connected ? "Connected" : state.network ? "Not connected" : "Unavailable", connected ? "on" : state.network ? "off" : "unknown");

    $("#evidence-consent").textContent = state.agreements ? consentEvidenceText() : "Agreement status could not be read.";
    $("#last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function consentEvidenceText() {
    const voice = Model.agreementState(state.agreements, "S_VNG");
    const viewing = Model.agreementState(state.agreements, "S_ADG");
    const status = (value) => value === "accepted" ? "Accepted" : value === "withdrawn" ? "Not accepted" : "Unavailable";
    return `Voice Information: ${status(voice)}. Viewing Information: ${status(viewing)}. Agreement status does not show whether data was sent.`;
  }

  function paintEvidence() {
    const root = state.root;
    if (!root) {
      $("#evidence-processes").textContent = "Could not read local service status. Check Homebrew Channel permissions.";
      $("#evidence-apps").textContent = "Could not list installed apps. Check Homebrew Channel permissions.";
      $("#diagnostics-status").textContent = "Could not read diagnostics settings. Check Homebrew Channel permissions.";
      return;
    }
    const payload = parseRootSnapshot(root);
    if (!payload) {
      $("#evidence-processes").textContent = "Local service status could not be read. Refresh to try again.";
      $("#evidence-apps").textContent = "Installed app details could not be read.";
      $("#diagnostics-status").textContent = "Diagnostics settings could not be read.";
      return;
    }
    const voice = Array.isArray(payload.voiceProcesses) ? payload.voiceProcesses : [];
    $("#evidence-processes").textContent = voice.length
      ? `Voice services running: ${voice.join(", ")}. A running service does not show whether audio was recorded or sent.`
      : "No voice service was found. Voice features may use other TV services.";
    const apps = Array.isArray(payload.apps) ? payload.apps : [];
    $("#evidence-apps").textContent = apps.length
      ? `${apps.length} Homebrew ${apps.length === 1 ? "app" : "apps"} installed.`
      : "No Homebrew apps found.";
    $("#app-inventory").replaceChildren(...apps.slice(0, 12).map((app) => {
      const li = document.createElement("li");
      li.textContent = `${app.title || app.id}${app.version ? ` ${app.version}` : ""}`;
      return li;
    }));
    const diagnostics = payload.diagnostics || {};
    const services = diagnostics.services || [];
    const autoUpload = diagnostics.autoUpload;
    const serviceStatus = services.length ? services.join(", ") : "none found";
    const uploadStatus = autoUpload == null ? "Unavailable" : autoUpload ? "enabled" : "disabled";
    const faultStatus = diagnostics.faultLogUpload == null ? "Unavailable" : diagnostics.faultLogUpload ? "On" : "Off";
    const debugStatus = diagnostics.debugLogUpload == null ? "Unavailable" : diagnostics.debugLogUpload ? "On" : "Off";
    $("#diagnostics-status").textContent = `Local diagnostics processes: ${serviceStatus}. Automatic uploads configured: ${uploadStatus}. Fault logs: ${faultStatus}. Debug logs: ${debugStatus}. Past uploads are not listed.`;
  }

  function paintCompatibility() {
    const model = state.model || {};
    const identity = [model.model, model.platformVersion && `webOS ${model.platformVersion}`, model.sdk && `SDK ${model.sdk}`, model.firmware && `firmware ${model.firmware}`]
      .filter((value) => value && !/unavailable/i.test(value)).join(" · ");
    $("#compatibility-device").textContent = identity || "Model or software version unavailable";
    if (state.profile) {
      const mappedCount = Object.values(state.profile.controls || {}).filter((control) => control.mapping === "source-mapped").length;
      const writeVerifiedCount = Object.values(state.profile.controls || {}).filter((control) => control.priorWriteReadback).length;
      statusPill($("#compatibility-status"), `Mapped · ${state.profile.sampleCount} sample`, "neutral");
      $("#compatibility-summary").textContent = `${mappedCount} settings are mapped for this exact model, SDK, and firmware. Prior app-side write/readback checks are recorded for ${writeVerifiedCount}. This map uses one C6 sample; the public references below do not add PrivacyShield write support. Every change still requires current TV readback.`;
    } else {
      statusPill($("#compatibility-status"), "Not mapped", "unknown");
      $("#compatibility-summary").textContent = "Privacy settings are read-only because PrivacyShield has no exact settings map for this model, SDK, and firmware. Public model reports and menu references below provide background, not a verified control map. A compatibility report stays on this TV.";
    }
    paintPublicReferences(model);
  }

  function paintPublicReferences(model) {
    const statusLabels = {
      "upstream-confirmed": "project report",
      "user-reported": "owner report",
      "maintainer-tested": "maintainer test",
      "maintainer-baseline": "project baseline",
      "network-measured": "network capture",
      "firmware-analyzed": "firmware analysis"
    };
    const cohort = PublicReferences.cohortForModel(model && model.model);
    const cohortNode = $("#community-cohort");
    const microphoneNode = $("#community-microphone");
    const microphoneSwitchNode = $("#community-microphone-switch");
    const samplesNode = $("#community-samples");
    samplesNode.replaceChildren();
    if (!cohort) {
      cohortNode.textContent = "No B1–G6 OLED family was identified in this model name.";
      microphoneNode.textContent = "Published built-in microphone evidence is not available for this model.";
      microphoneSwitchNode.textContent = "Physical microphone switch: no model-specific report is available.";
    } else {
      const samples = PublicReferences.samplesForCohort(cohort.series);
      const sampleCounts = PublicReferences.sampleCountsForCohort(cohort.series);
      const sourceCounts = Object.entries(sampleCounts).map(([source, count]) => `${count} ${source}`).join(", ");
      cohortNode.textContent = `${cohort.series} · ${cohort.year} model family · listed launch platform webOS ${cohort.launchWebOS} · listed sizes ${cohort.sizes.join(", ")} inches. Public entries: ${samples.length}${sourceCounts ? ` (${sourceCounts})` : ""}.`;
      const microphoneLabels = {
        present: "Listed by the cited manufacturer source",
        absent: "Listed as absent by the cited manufacturer source",
        "reported-present": "Reported by an independent review",
        "reported-absent": "Reported by LG support in a retailer Q&A",
        conflicting: "Conflicting regional sources",
        "variant-limited": "A different model variant is documented",
        unknown: "Unknown"
      };
      const exactC6H = cohort.series === "C6" && /C6H/i.test(model.model || "");
      const exactMicStatus = exactC6H ? "C6H variant not covered" : microphoneLabels[cohort.microphone.status] || "Unknown";
      microphoneNode.textContent = `Built-in microphone: ${exactMicStatus}. ${cohort.microphone.summary} This evidence does not identify or control a physical microphone switch.`;
      const switchEvidence = PublicReferences.microphoneSwitchForCohort(cohort.series);
      if (switchEvidence) {
        microphoneSwitchNode.textContent = `Physical microphone switch: reported for ${cohort.series}, ${switchEvidence.webOS}. Read paths: ${switchEvidence.method} ${switchEvidence.observation} ${switchEvidence.limit}`;
      } else if (cohort.series === "C6") {
        microphoneSwitchNode.textContent = "Physical microphone switch: no C6-specific report is included. The C5 switch finding does not establish a switch on a C6 or C6H.";
      } else {
        microphoneSwitchNode.textContent = `Physical microphone switch: no ${cohort.series}-specific report is included. This catalog does not establish whether one is present.`;
      }
      if (!samples.length) {
        const item = document.createElement("li");
        item.textContent = "No report for this family is included in the current evidence catalog.";
        samplesNode.append(item);
      } else {
        for (const sample of samples) {
          const item = document.createElement("li");
          const heading = document.createElement("strong");
          const displayModel = sample.displayModel || sample.model || `${sample.series} family`;
          const panel = sample.panel ? `; ${sample.panel}` : "";
          heading.textContent = `${displayModel} · ${sample.project} (${statusLabels[sample.status] || "reported"})`;
          item.append(heading, document.createTextNode(`Reported webOS/SDK version ${sample.webOS}; firmware ${sample.firmware || "not listed"}${panel}. ${sample.note}`));
          samplesNode.append(item);
        }
      }
    }

    const menuNode = $("#menu-reference-list");
    menuNode.replaceChildren();
    const menuEntries = model && model.platformVersion
      ? PublicReferences.menuForPlatform(model.platformVersion)
      : [];
    $("#menu-reference-status").textContent = model && model.platformVersion
      ? `webOS ${model.platformVersion} · ${menuEntries.length} documented menu locations.`
      : "Installed webOS could not be identified from this runtime. No menu path is shown.";
    for (const entry of menuEntries) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = entry.name;
      item.append(heading, document.createTextNode(entry.path));
      if (entry.note) item.append(document.createTextNode(` ${entry.note}`));
      menuNode.append(item);
    }

    const findingsNode = $("#community-control-findings");
    findingsNode.replaceChildren();
    for (const finding of PublicReferences.PUBLIC_CONTROL_FINDINGS) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = `${finding.project} · ${finding.feature}`;
      item.append(heading, document.createTextNode(`${finding.method}. ${finding.observation} Scope: ${finding.scope} ${finding.limit}`));
      findingsNode.append(item);
    }

    const unassignedNode = $("#community-unassigned-samples");
    unassignedNode.replaceChildren();
    for (const sample of PublicReferences.unassignedSamples()) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = `${sample.displayModel || "Model not published"} · ${sample.project} (${statusLabels[sample.status] || "reported"})`;
      const panel = sample.panel ? `; ${sample.panel}` : "";
      const webOS = sample.webOS === "Not recorded" ? "not recorded" : sample.webOS;
      item.append(heading, document.createTextNode(` Platform version: ${webOS}; firmware: ${sample.firmware || "not listed"}${panel}. ${sample.note}`));
      unassignedNode.append(item);
    }
  }

  function parseRootSnapshot(response) {
    const text = response && (response.stdoutString || response.stdout);
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  function shellQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  async function rootSnapshot() {
    const scriptPath = `${Api.appRootPath()}/scripts/device_snapshot.py`;
    return Api.rootExec(`python3 ${shellQuote(scriptPath)}`);
  }

  async function loadState() {
    $("#runtime-mode").textContent = "Reading TV information…";
    state.settings = Object.fromEntries(Model.CONTROLS.map(({ key }) => [key, "unknown"]));
    state.model = null;
    state.profile = null;
    state.controlReads = {};
    state.apiAccess = {};
    state.errors = [];
    for (const control of Model.CONTROLS) setControl(control.key, "unknown", false);
    $("#privacy-preset").disabled = true;
    $("#restore-button").disabled = true;
    const optionKeys = Model.CONTROLS.filter(({ category }) => category === "option").map(({ key }) => key);
    const generalKeys = Model.CONTROLS.filter(({ category }) => category === "general").map(({ key }) => key);
    const otherKeys = Model.CONTROLS.filter(({ category }) => category === "other").map(({ key }) => key);
    const networkKeys = Model.CONTROLS.filter(({ category }) => category === "network").map(({ key }) => key);
    const results = await Promise.allSettled([
      Api.getSettings("option", optionKeys),
      Api.getSettings("general", generalKeys),
      Api.getSettings("other", otherKeys),
      Api.getSettings("network", networkKeys),
      Api.getAgreements(),
      Api.getSystemInfo(),
      Api.getNetworkStatus(),
      rootSnapshot()
    ]);
    const [option, general, other, networkSettings, agreements, model, network, root] = results;
    state.root = root.status === "fulfilled" ? root.value : null;
    const rootSettings = snapshotSettings();
    const observedSettings = {};
    const privateQueryErrors = [];

    if (option.status === "fulfilled") Object.assign(observedSettings, settingValues(option.value, optionKeys));
    else privateQueryErrors.push(option.reason.message);
    if (general.status === "fulfilled") Object.assign(observedSettings, settingValues(general.value, generalKeys));
    else privateQueryErrors.push(general.reason.message);
    if (other.status === "fulfilled") Object.assign(observedSettings, settingValues(other.value, otherKeys));
    else privateQueryErrors.push(other.reason.message);
    if (networkSettings.status === "fulfilled") Object.assign(observedSettings, settingValues(networkSettings.value, networkKeys));
    else privateQueryErrors.push(networkSettings.reason.message);
    for (const control of Model.CONTROLS) {
      if (Model.normalizeToggle(observedSettings[control.key]) === "unknown") observedSettings[control.key] = rootSettings[control.key];
    }
    const directAgreements = agreements.status === "fulfilled" ? agreementRecord(agreements.value) : null;
    const rootAgreements = parseRootSnapshot(state.root)?.agreements || null;
    state.agreements = Model.hasAgreementRecord(directAgreements) ? directAgreements : rootAgreements;
    state.model = model.status === "fulfilled" ? infoModel(model.value) : null;
    if (model.status === "rejected") state.errors.push(model.reason.message);
    state.profile = Compatibility.matchProfile(state.model);
    state.controlReads = {};
    for (const control of Model.CONTROLS) {
      state.controlReads[control.key] = Model.normalizeToggle(observedSettings[control.key]) !== "unknown";
    }
    state.settings = state.profile
      ? observedSettings
      : Object.fromEntries(Model.CONTROLS.map(({ key }) => [key, "unknown"]));
    const successfulSettingsQueries = [option, general, other, networkSettings].filter((result) => result.status === "fulfilled").length;
    state.apiAccess = {
      systemInfo: model.status === "fulfilled",
      settingsService: successfulSettingsQueries === 4 ? "available" : successfulSettingsQueries > 0 ? "partial" : "unavailable",
      hbcSnapshot: Boolean(parseRootSnapshot(state.root)),
      controlReads: state.controlReads
    };
    if (!Model.hasAgreementRecord(state.agreements) && agreements.status === "rejected") state.errors.push(agreements.reason.message);
    if (state.profile && Model.CONTROLS.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown")) {
      state.errors.push(...privateQueryErrors);
      if (!privateQueryErrors.length) state.errors.push("Some privacy settings could not be read");
    }
    state.network = network.status === "fulfilled" ? network.value : null;
    if (network.status === "rejected") state.errors.push(network.reason.message);
    if (root.status === "rejected") state.errors.push(root.reason.message);

    for (const control of Model.CONTROLS) {
      setControl(control.key, state.settings[control.key], Compatibility.controlStatus(state.profile, control.key).mapped);
    }
    paintAgreementState();
    paintOverview();
    paintEvidence();
    paintCompatibility();
    $("#restore-button").disabled = !canRestoreSaved(savedControls());
    $("#runtime-mode").textContent = state.errors.length ? "Some TV information unavailable" : "TV information updated";
    if (!state.profile) {
      $("#write-access-note span").textContent = "No settings were changed. This model and software version are not mapped, so all privacy controls remain read-only.";
    } else if (state.errors.length) {
      const rootDenied = root.status === "rejected" && /Denied method call ["']exec["']/.test(root.reason.message || "");
      const controlsUnknown = Model.CONTROLS.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown");
      $("#write-access-note span").textContent = rootDenied
        ? `The Homebrew Channel did not allow local TV checks. Check its app permissions and refresh. ${controlsUnknown ? "Settings that could not be read remain locked." : "Privacy settings are available; local TV details are not."}`
        : `Some TV information could not be read. Refresh to try again. ${controlsUnknown ? "Settings without a readable value remain locked." : "Readable settings are still available."}`;
    } else {
      $("#write-access-note span").textContent = "The preset changes ten settings. Other choices remain separate because they affect LG's ad service, HbbTV, Bluetooth wake, or Sleep on Absence. Each change is read back before success is shown.";
    }
  }

  function savedControls() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) { return null; }
  }

  function canRestoreSaved(saved) {
    if (!state.profile || !saved || !saved.settings || typeof saved.settings !== "object") return false;
    const entries = Object.entries(saved.settings);
    return entries.length > 0 && entries.every(([key, target]) => {
      return ["on", "off"].includes(target)
        && Compatibility.canWrite(state.profile, key)
        && Model.normalizeToggle(state.settings[key]) !== "unknown";
    });
  }

  function saveCurrentControls() {
    if (!savedControls()) {
      const snapshot = {};
      for (const control of Model.CONTROLS) {
        const value = Model.normalizeToggle(state.settings[control.key]);
        if (value !== "unknown") snapshot[control.key] = value;
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), settings: snapshot }));
    }
    $("#restore-button").disabled = !canRestoreSaved(savedControls());
  }

  async function applyOne(control, value) {
    if (!control || !Compatibility.canWrite(state.profile, control.key)) {
      throw new Error("This model and software version have not been mapped; privacy settings are read-only.");
    }
    if (Model.normalizeToggle(state.settings[control.key]) === "unknown") {
      throw new Error("The current setting value could not be read; no change was attempted.");
    }
    const target = value === "on" ? "on" : "off";
    let directError = null;
    try {
      if (control.writer === "admanager") await Api.setDoNotSell(target);
      else {
        const serviceTarget = control.writer === "thirdPartyCookie"
          ? (target === "on" ? "onByUser" : "offByUser")
          : target;
        await Api.setSetting(control.category, control.key, serviceTarget);
      }
    }
    catch (error) { directError = error; }

    let actual = await readControl(control);
    if (actual !== target && control.writer === "admanager" && !directError) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      actual = await readControl(control);
    }
    if (actual !== target) {
      // Some LG firmware exposes writes only to privileged clients. Try the
      // Homebrew root bridge, which fails closed if firmware denies access.
      const scriptPath = `${Api.appRootPath()}/scripts/device_control.py`;
      const result = await Api.rootExec(`python3 ${shellQuote(scriptPath)} ${control.key} ${target}`);
      if (!result || (result.error && result.error !== "")) {
        throw new Error((directError && directError.message) || "The TV denied this setting change.");
      }
      actual = await readControl(control);
    }
    if (actual !== target) throw new Error(`The TV still reports ${actual}; the change was not applied.`);
    state.settings[control.key] = actual;
    state.controlReads[control.key] = true;
    setControl(control.key, actual, true);
  }

  async function readControl(control) {
    try {
      const response = await Api.getSettings(control.category, [control.key]);
      const direct = Model.normalizeToggle(Model.pickValue(response, control.key));
      if (direct !== "unknown") return direct;
    } catch (_) { /* try the privileged, allowlisted local snapshot below */ }
    try {
      state.root = await rootSnapshot();
      return Model.snapshotSettings(parseRootSnapshot(state.root))[control.key];
    } catch (_) {
      return "unknown";
    }
  }

  function changeFailureText(error) {
    const message = String(error && error.message || "");
    if (/denied|permission|access/i.test(message)) return "The TV denied the change. Check this setting in TV Settings.";
    return "The TV did not confirm the change. Check the value in TV Settings.";
  }

  async function toggleChanged(event) {
    const key = event.target.dataset.setting;
    const control = Model.CONTROLS.find((item) => item.key === key);
    if (!control) return;
    if (pendingSettings.has(key) || pendingActions.size > 0) {
      event.target.checked = Model.normalizeToggle(state.settings[key]) === "on";
      return;
    }
    const prior = Model.normalizeToggle(state.settings[key]);
    const next = event.target.checked ? "on" : "off";
    if (prior === next || prior === "unknown") return;
    const switchLabel = event.target.closest(".switch");
    const hadFocus = hasFocusWithin(switchLabel);
    pendingSettings.add(key);
    switchLabel.setAttribute("aria-busy", "true");
    saveCurrentControls();
    $("#control-status").textContent = `Turning ${control.label} ${next}…`;
    try {
      await applyOne(control, next);
      $("#control-status").textContent = `${control.label} turned ${next}.`;
      showToast(`${control.label} turned ${next}. The TV confirmed the value.`);
    } catch (error) {
      event.target.checked = prior === "on";
      $("#control-status").textContent = `${control.label}: change not confirmed.`;
      showToast(`${control.label}: ${changeFailureText(error)}`);
    } finally {
      pendingSettings.delete(key);
      switchLabel.removeAttribute("aria-busy");
      restoreFocusAfterPending(event.target, hadFocus, $("#footer-refresh"));
      paintOverview();
    }
  }

  async function applyPreset() {
    if (pendingActions.size > 0 || pendingSettings.size > 0) return;
    if (!Compatibility.canApplyPreset(state.profile, Model.privacyPreset())) {
      $("#control-status").textContent = "This model and software version have not been mapped. Settings are read-only.";
      showToast("No settings changed. This model and software version have not been mapped.");
      return;
    }
    if (!Model.canApplyPrivacyPreset(state.settings)) {
      $("#control-status").textContent = "Read the recommended settings before applying them.";
      showToast("No settings changed. One or more current values could not be read.");
      return;
    }
    const button = $("#privacy-preset");
    const hadFocus = hasFocusWithin(button);
    pendingActions.add("preset");
    button.setAttribute("aria-busy", "true");
    saveCurrentControls();
    $("#control-status").textContent = "Applying recommended privacy settings…";
    const failures = [];
    try {
      for (const item of Model.privacyPreset()) {
        const control = Model.CONTROLS.find((entry) => entry.key === item.key);
        if (Model.normalizeToggle(state.settings[item.key]) === item.value) continue;
        try { await applyOne(control, item.value); } catch (error) { failures.push({ control, error }); }
      }
    } finally {
      pendingActions.delete("preset");
      button.removeAttribute("aria-busy");
      restoreFocusAfterPending(button, hadFocus, $("#footer-refresh"));
    }
    paintOverview();
    if (failures.length) {
      $("#control-status").textContent = `${failures.length} ${failures.length === 1 ? "setting" : "settings"} could not be changed.`;
      showToast(`${failures[0].control.label}: ${changeFailureText(failures[0].error)}`);
    } else {
      $("#control-status").textContent = "Recommended privacy settings applied.";
      showToast("Recommended privacy settings applied.");
    }
  }

  async function openAgreementManager() {
    if (pendingActions.size > 0 || pendingSettings.size > 0) return;
    const button = $("#agreement-manager-button");
    const hadFocus = hasFocusWithin(button);
    pendingActions.add("agreements");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    $("#agreement-action-status").textContent = "Opening LG User Agreements…";
    let launched = false;
    try {
      await Api.openAgreements();
      agreementReviewRequested = true;
      launched = true;
      $("#agreement-action-status").textContent = "Make your choices in LG User Agreements, then select Agree to save.";
    } catch (error) {
      $("#agreement-action-status").textContent = "Could not open LG User Agreements. Use Settings → General → Privacy & Terms → User Agreements.";
      showToast(changeFailureText(error));
    } finally {
      pendingActions.delete("agreements");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (!launched) restoreFocusAfterPending(button, hadFocus, $("#footer-refresh"));
    }
  }

  function refreshAfterAgreementReview() {
    if (!agreementReviewRequested || document.hidden) return;
    agreementReviewRequested = false;
    window.setTimeout(loadState, 250);
  }

  async function restoreSettings() {
    if (pendingActions.size > 0 || pendingSettings.size > 0) return;
    if (!state.profile) {
      $("#control-status").textContent = "This model and software version have not been mapped. Settings are read-only.";
      showToast("No settings changed. This model and software version have not been mapped.");
      return;
    }
    const saved = savedControls();
    if (!canRestoreSaved(saved)) {
      $("#control-status").textContent = "Current TV values could not be read. Refresh before restoring settings.";
      showToast("No settings changed. Current TV values could not be read.");
      return;
    }
    const button = $("#restore-button");
    const hadFocus = hasFocusWithin(button);
    pendingActions.add("restore");
    button.setAttribute("aria-busy", "true");
    $("#control-status").textContent = "Restoring saved settings…";
    const failures = [];
    try {
      for (const control of Model.CONTROLS) {
        const target = saved.settings[control.key];
        if (!target || Model.normalizeToggle(state.settings[control.key]) === target) continue;
        try { await applyOne(control, target); } catch (error) { failures.push({ control, error }); }
      }
      if (failures.length) {
        $("#control-status").textContent = `Could not restore ${failures.length} saved ${failures.length === 1 ? "setting" : "settings"}.`;
        showToast(`${failures[0].control.label}: ${changeFailureText(failures[0].error)}`);
      } else {
        localStorage.removeItem(SAVE_KEY);
        $("#control-status").textContent = "Saved settings restored.";
        showToast("Saved settings restored.");
      }
    } finally {
      pendingActions.delete("restore");
      button.removeAttribute("aria-busy");
      button.disabled = !canRestoreSaved(savedControls());
      restoreFocusAfterPending(button, hadFocus, $("#privacy-preset").disabled ? $("#footer-refresh") : $("#privacy-preset"));
      paintOverview();
    }
  }

  async function prepareCompatibilityReport() {
    const button = $("#prepare-compatibility-report");
    const output = $("#compatibility-report-output");
    const status = $("#compatibility-report-status");
    const share = $("#compatibility-report-share");
    const qrImage = $("#compatibility-report-qr");
    const formQrImage = $("#compatibility-report-form-qr");
    const hadFocus = hasFocusWithin(button);
    let qrReady = false;
    const serialized = JSON.stringify(
      Compatibility.createReport(state.model, state.profile, state.apiAccess, Model.CONTROLS),
      null,
      2
    );
    output.value = serialized;
    output.hidden = false;
    output.tabIndex = 0;
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(serialized, "Byte");
      qr.make();
      qrImage.src = qr.createDataURL(7, 8);
      qrImage.hidden = false;
      const formQr = window.qrcode(0, "M");
      formQr.addData("https://github.com/snapetech-org/PrivacyShield/issues/new?template=compatibility-report.yml", "Byte");
      formQr.make();
      formQrImage.src = formQr.createDataURL(7, 8);
      formQrImage.hidden = false;
      share.hidden = false;
      qrReady = true;
    } catch (_) {
      qrImage.hidden = true;
      formQrImage.hidden = true;
      share.hidden = false;
      status.textContent = "Report ready below. QR transfer is unavailable; nothing was sent.";
    }
    if (hadFocus && typeof share.scrollIntoView === "function") {
      share.scrollIntoView({ block: "start" });
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(serialized);
      status.textContent = qrReady
        ? "Report copied to this TV's clipboard. Scan both codes with a phone to carry it to the form; nothing was uploaded."
        : "Report copied to this TV's clipboard. QR transfer is unavailable; nothing was uploaded.";
    } catch (_) {
      if (qrReady) {
        status.textContent = "Scan the codes with a phone to copy the report and open its form. Nothing was uploaded.";
      } else {
        status.textContent = "Report ready below. Clipboard and QR access are unavailable; nothing was sent.";
      }
      if (hadFocus) focusRemote(button);
    }
  }

  function bindUI() {
    $$(".tab").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view, button)));
    $$("[data-go]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.go, "first")));
    $$("[data-setting]").forEach((input) => input.addEventListener("change", toggleChanged));
    $("#refresh-button").addEventListener("click", loadState);
    $("#footer-refresh").addEventListener("click", loadState);
    $("#privacy-preset").addEventListener("click", applyPreset);
    $("#restore-button").addEventListener("click", restoreSettings);
    $("#agreement-manager-button").addEventListener("click", openAgreementManager);
    $("#prepare-compatibility-report").addEventListener("click", prepareCompatibilityReport);
    $("#restore-button").disabled = !canRestoreSaved(savedControls());
    document.addEventListener("keydown", handleRemoteKey);
    document.addEventListener("visibilitychange", refreshAfterAgreementReview);
    document.addEventListener("webOSRelaunch", refreshAfterAgreementReview);
    window.addEventListener("focus", refreshAfterAgreementReview);
    bindRemoteFocusIndicator();
  }

  bindUI();
  setView("overview", $(".tab[data-view='overview']"));
  loadState();
})();

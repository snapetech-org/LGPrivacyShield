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
    referenceSettings: {}, firmwareSettingsMap: null, controlReads: {}, apiAccess: {}, errors: []
  };
  let toastTimer;
  let agreementReviewRequested = false;
  const pendingSettings = new Set();
  const pendingActions = new Set();

  const $ = (selector, parent) => (parent || document).querySelector(selector);
  const $$ = (selector, parent) => Array.from((parent || document).querySelectorAll(selector));

  function replaceContent(node, children = []) {
    while (node.firstChild) node.removeChild(node.firstChild);
    for (const child of children) node.appendChild(child);
  }

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
    const anchor = focusAnchor(element);
    const row = anchor && anchor.closest(".control-row");
    const main = $("#main-content");
    const scrollFrame = $("#control-scroll-frame");
    const isControlRow = Boolean(row && main && scrollFrame && $("#view-controls").classList.contains("is-visible"));

    element.focus({ preventScroll: true });
    if (isControlRow) {
      const mainRect = main.getBoundingClientRect();
      const frameRect = scrollFrame.getBoundingClientRect();
      const topLimit = Math.max(mainRect.top, frameRect.bottom + 10);
      const bottomLimit = mainRect.bottom - 10;
      let rect = row.getBoundingClientRect();
      if (rect.top < topLimit) main.scrollTop = Math.max(0, main.scrollTop + rect.top - topLimit);
      rect = row.getBoundingClientRect();
      if (rect.bottom > bottomLimit) main.scrollTop += rect.bottom - bottomLimit;
    } else if (anchor && typeof anchor.scrollIntoView === "function") {
      anchor.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    updateControlScrollCue();
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
    updateControlScrollCue();
    return true;
  }

  function updateControlScrollCue() {
    const view = $("#view-controls");
    const main = $("#main-content");
    const range = $("#control-scroll-range");
    const cue = $("#control-scroll-cue");
    const track = $(".control-scroll-track");
    const fill = $("#control-scroll-progress");
    const frame = $("#control-scroll-frame");
    const rows = $$("#control-list .control-row");
    if (!view || view.hidden || !view.classList.contains("is-visible") || !main || !range || !cue || !track || !fill || !frame || !rows.length) return;

    const mainRect = main.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const visibleTop = Math.max(mainRect.top, frameRect.bottom + 2);
    const visibleRows = rows.map((row, index) => ({ index, rect: row.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > visibleTop && rect.top < mainRect.bottom - 2);
    const first = visibleRows.length ? visibleRows[0].index : 0;
    const last = visibleRows.length ? visibleRows[visibleRows.length - 1].index : first;
    const above = first;
    const below = rows.length - last - 1;

    range.textContent = `Showing ${first + 1}–${last + 1} of ${rows.length} controls`;
    if (above && below) cue.textContent = `↑ ${above} above · ↓ ${below} below · Use Up/Down`;
    else if (below) cue.textContent = `↓ ${below} more below · Use Down on the remote`;
    else if (above) cue.textContent = `↑ ${above} above · Use Up on the remote`;
    else cue.textContent = "All controls are in view";

    const reached = last + 1;
    fill.style.width = `${Math.round((reached / rows.length) * 100)}%`;
    track.setAttribute("aria-valuenow", String(reached));
    track.setAttribute("aria-valuetext", `${range.textContent}; ${above} above, ${below} below`);
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

  function snapshotReferenceSettings() {
    const snapshot = parseRootSnapshot(state.root);
    const source = snapshot && snapshot.referenceSettings;
    return source && typeof source === "object" ? source : {};
  }

  function firmwareSettingsMapFromSnapshot() {
    const snapshot = parseRootSnapshot(state.root);
    const source = snapshot && snapshot.firmwareSettingsMap;
    if (!source || source.available !== true || !source.settings || typeof source.settings !== "object" || Array.isArray(source.settings)) return null;
    const allowedKeys = new Set([
      ...Model.CONTROLS.map(({ key }) => key),
      "sportsAlarm", "webOSPromotionVideo", "promotionStreamer", "allowMobileDeviceAccess",
      "watchedListCollection", "usageCare", "dbgLogUpload", "faultLogUpload"
    ]);
    const settings = Object.fromEntries(Object.entries(source.settings).filter(([key, category]) =>
      allowedKeys.has(key) && typeof category === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(category)
    ));
    const ambiguous = Array.isArray(source.ambiguous)
      ? source.ambiguous.filter((key) => allowedKeys.has(key)) : [];
    for (const key of ambiguous) delete settings[key];
    return { available: true, settings, ambiguous };
  }

  function firmwareMapEntry(key) {
    const map = state.firmwareSettingsMap;
    if (!map) return { available: false, category: null, ambiguous: false };
    if (map.ambiguous.includes(key)) return { available: true, category: null, ambiguous: true };
    return { available: true, category: map.settings[key] || null, ambiguous: false };
  }

  function deviceControlStatus(key) {
    const status = Compatibility.controlStatus(state.profile, key);
    if (!status.mapped || !state.firmwareSettingsMap) return status;
    const firmwareEntry = firmwareMapEntry(key);
    if (firmwareEntry.ambiguous) {
      return { mapped: false, writable: false, reason: "This TV's firmware map assigns the setting to more than one category. It stays unavailable." };
    }
    const category = firmwareEntry.category;
    if (!category) {
      return { mapped: false, writable: false, reason: "This setting is not listed in this TV's firmware map. It stays unavailable." };
    }
    return { ...status, firmwareCategory: category };
  }

  function controlForDevice(control) {
    if (!control || !deviceControlStatus(control.key).mapped) return null;
    return {
      ...control,
      category: deviceControlStatus(control.key).firmwareCategory || control.category
    };
  }

  function paintAgreementState() {
    const summary = Model.featureConsentSummary(state.agreements);
    const additionalIds = new Set(summary.filter((entry) => entry.unmapped).map((entry) => entry.id));
    for (const row of $$(".unmapped-agreement", $("#agreement-list"))) {
      if (!additionalIds.has(row.dataset.agreement)) row.remove();
    }
    for (const entry of summary) {
      let row = $(`[data-agreement="${entry.id}"]`);
      if (!row && entry.unmapped) {
        row = document.createElement("article");
        row.className = "agreement-row unmapped-agreement";
        row.dataset.agreement = entry.id;
        const copy = document.createElement("div");
        copy.className = "agreement-copy";
        const heading = document.createElement("div");
        heading.className = "agreement-heading";
        const title = document.createElement("h2");
        title.textContent = entry.title;
        const tag = document.createElement("span");
        tag.className = "unmapped-tag";
        tag.textContent = "Effect not mapped";
        const code = document.createElement("span");
        code.className = "agreement-code";
        code.textContent = `TV record ${entry.id}`;
        heading.append(title, tag);
        copy.append(heading, code);
        for (const [label, text] of [
          ["Accepted:", entry.acceptedEffect],
          ["Not accepted:", entry.declinedEffect]
        ]) {
          const paragraph = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = label;
          const value = document.createElement("span");
          value.className = label === "Accepted:" ? "agreement-accepted" : "agreement-declined";
          value.textContent = text;
          paragraph.append(strong, " ", value);
          copy.append(paragraph);
        }
        const evidence = document.createElement("p");
        evidence.className = "agreement-evidence";
        evidence.textContent = entry.evidence;
        copy.append(evidence);
        const pill = document.createElement("span");
        pill.className = "status-pill status-unknown";
        pill.textContent = "Unavailable";
        row.append(copy, pill);
        $("#agreement-list").append(row);
      }
      if (!row) continue;
      $(".agreement-accepted", row).textContent = entry.acceptedEffect;
      $(".agreement-declined", row).textContent = entry.declinedEffect;
      $(".agreement-evidence", row).textContent = entry.evidence;
      const pill = $(".status-pill", row);
      const label = entry.state === "accepted" ? "Accepted" : entry.state === "withdrawn" ? "Not accepted" : "Unavailable";
      statusPill(pill, label, entry.state === "accepted" ? "on" : entry.state === "withdrawn" ? "off" : "unknown");
    }
  }

  function setControl(key, value, compatibility) {
    const checkbox = $(`[data-setting="${key}"]`);
    const meta = $(`#${key}-meta`);
    if (!checkbox) return;
    const normalized = Model.normalizeToggle(value);
    const switchLabel = checkbox.closest(".switch");
    const mapped = Boolean(compatibility && compatibility.mapped);
    checkbox.checked = normalized === "on";
    checkbox.disabled = normalized === "unknown" || !mapped;
    if (normalized === "unknown" || !mapped) {
      switchLabel.tabIndex = 0;
      switchLabel.setAttribute("aria-disabled", "true");
      switchLabel.dataset.lockReason = !mapped
        ? (compatibility && compatibility.reason) || "No setting is available for this control on this TV. It is read-only."
        : "The TV did not return a current value. This control is read-only.";
    } else {
      switchLabel.removeAttribute("tabindex");
      switchLabel.removeAttribute("aria-disabled");
      delete switchLabel.dataset.lockReason;
    }
    const stateNode = $(".switch-state", switchLabel);
    stateNode.textContent = !mapped ? "Not available" : normalized === "unknown" ? "Unavailable" : normalized === "on" ? "On" : "Off";
    if (meta) meta.textContent = !mapped
      ? (compatibility && compatibility.reason) || "No setting is available for this TV."
      : normalized === "unknown"
        ? "The TV did not return a current value. This control is read-only."
        : `Current value: ${normalized === "on" ? "On" : "Off"}`;
  }

  function mappedControls() {
    return Model.CONTROLS.map(controlForDevice).filter(Boolean);
  }

  function privacyPresetForProfile() {
    const readable = new Set(Model.CONTROLS
      .filter(({ key }) => Model.normalizeToggle(state.settings[key]) !== "unknown")
      .map(({ key }) => key));
    return Model.privacyPreset().filter(({ key }) =>
      deviceControlStatus(key).mapped && readable.has(key)
    );
  }

  function getConsentFlag(key) {
    const source = state.agreements;
    if (!source) return undefined;
    if (source.eulaStatus && Object.prototype.hasOwnProperty.call(source.eulaStatus, key)) return source.eulaStatus[key];
    if (source.settings && source.settings.eulaStatus) return source.settings.eulaStatus[key];
    return undefined;
  }

  function paintOverview() {
    const availableControls = mappedControls();
    const counts = Model.countRecommendedControls(state.settings, availableControls);
    const preset = privacyPresetForProfile();
    const profileAllowsPreset = Compatibility.canApplyPreset(state.profile, preset);
    $("#privacy-preset").disabled = !profileAllowsPreset || !Model.canApplyPrivacyPreset(state.settings, preset);
    const value = !state.profile ? "Controls read-only" : !availableControls.length ? "No controls available" : counts.unknown ? "Some values unavailable" : counts.recommended === counts.total ? "Recommended settings set" : "Review settings";
    $("#posture-value").textContent = value;
    $("#posture-detail").textContent = !state.profile
      ? "No controls are available for this model and software version."
      : !availableControls.length
      ? "No privacy controls are available for this software version."
      : counts.unknown
      ? `${counts.recommended} of ${counts.total} available settings match the recommendations; ${counts.unknown} values are unavailable.`
      : `${counts.recommended} of ${counts.total} settings match the recommended values`;

    const viewing = Model.normalizeToggle(state.settings.livePlus);
    $("#summary-viewing").textContent = viewing === "off" ? "Live Plus is off" : viewing === "on" ? "Live Plus is on" : "Live Plus status unavailable";
    $("#dot-viewing").className = `state-dot ${viewing === "off" ? "is-safe" : viewing === "on" ? "is-on" : ""}`;

    const voiceOff = Model.normalizeToggle(state.settings.voiceLongDistance) === "off" && Model.normalizeToggle(state.settings.turnOnByVoice) === "off";
    const voiceOn = Model.normalizeToggle(state.settings.voiceLongDistance) === "on" || Model.normalizeToggle(state.settings.turnOnByVoice) === "on";
    $("#summary-voice").textContent = voiceOff ? "Hands-free voice and voice wake are off" : voiceOn ? "Voice wake or hands-free listening is on" : "Voice settings unavailable";
    $("#dot-voice").className = `state-dot ${voiceOff ? "is-safe" : voiceOn ? "is-on" : ""}`;

    const connected = state.network && (state.network.isInternetConnectionAvailable === true || state.network.isInternetConnectionAvailable === "true");
    $("#summary-network").textContent = connected ? "Connected to the internet" : state.network ? "No internet connection" : "Connection status unavailable";
    $("#dot-network").className = `state-dot ${state.network ? "" : ""}`;

    const data = state.model || {};
    $("#device-summary").textContent = data.model || "LG webOS TV";
    $("#model-name").textContent = data.model || "Unavailable";
    $("#webos-version").textContent = [
      data.platformVersion ? `webOS ${data.platformVersion}` : "",
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
      $("#evidence-processes").textContent = "Local service details are unavailable. Check Homebrew Channel access.";
      $("#evidence-apps").textContent = "Installed app details are unavailable. Check Homebrew Channel access.";
      $("#diagnostics-status").textContent = "Diagnostics status is unavailable. Check Homebrew Channel access.";
      return;
    }
    const payload = parseRootSnapshot(root);
    if (!payload) {
      $("#evidence-processes").textContent = "Local service details could not be read. Refresh to try again.";
      $("#evidence-apps").textContent = "Installed app details could not be read.";
      $("#diagnostics-status").textContent = "Diagnostics status could not be read.";
      return;
    }
    const voice = Array.isArray(payload.voiceProcesses) ? payload.voiceProcesses : [];
    $("#evidence-processes").textContent = voice.length
      ? `Voice services running: ${voice.join(", ")}. This does not show whether audio was recorded or sent.`
      : "No listed voice service is running. Other services may provide voice features.";
    const apps = Array.isArray(payload.apps) ? payload.apps : [];
    $("#evidence-apps").textContent = apps.length
      ? `${apps.length} Homebrew ${apps.length === 1 ? "app" : "apps"} installed.`
      : "No Homebrew apps found.";
    replaceContent($("#app-inventory"), apps.slice(0, 12).map((app) => {
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
    $("#diagnostics-status").textContent = `Diagnostics services: ${serviceStatus}. Automatic uploads: ${uploadStatus}. Fault log upload: ${faultStatus}. Debug log upload: ${debugStatus}. Past uploads are not listed.`;
  }

  function paintCompatibility() {
    const model = state.model || {};
    const firmwareEvidence = Compatibility.firmwareArchiveEvidence(model);
    const firmwareStatus = $("#firmware-source-status");
    if (firmwareStatus) {
      firmwareStatus.textContent = firmwareEvidence
        ? window.PrivacyShieldFirmwareCatalog.describe(firmwareEvidence)
        : "No firmware package match is listed. Privacy settings are checked on the TV.";
    }
    const identity = [model.model, model.platformVersion && `webOS ${model.platformVersion}`, model.firmware && `firmware ${model.firmware}`]
      .filter((value) => value && !/unavailable/i.test(value)).join(" · ");
    $("#compatibility-device").textContent = identity || "Model or software version unavailable";
    if (state.profile) {
      const mappedCount = Object.values(state.profile.controls || {}).length;
      const writeVerifiedCount = Object.values(state.profile.controls || {}).filter((control) => control.priorWriteReadback).length;
      const locallyPresentCount = Model.CONTROLS.filter((control) =>
        state.profile.controls && state.profile.controls[control.key] && deviceControlStatus(control.key).mapped
      ).length;
      const firmwareNote = state.firmwareSettingsMap
        ? ` The TV lists ${locallyPresentCount} of these ${mappedCount} settings. Each current value is checked separately; a listed setting may still not work as expected.`
        : " The TV's setting list could not be read. Each current value must still be checked before use.";
      if (state.profile.mappingScope === "exact-device-firmware") {
        statusPill($("#compatibility-status"), "C6H settings", "neutral");
        $("#compatibility-summary").textContent = `${mappedCount} settings are documented for this model and software. ${writeVerifiedCount} changes were previously confirmed through PrivacyShield.${firmwareNote} Current values are checked before switches are enabled.`;
      } else {
        statusPill($("#compatibility-status"), `${state.profile.cohort} · webOS ${state.profile.platformVersion}`, "neutral");
        const modelMapNote = state.profile.sampleNote
          ? ` ${state.profile.sampleNote}`
          : " Published sources have not been checked on this exact TV.";
        $("#compatibility-summary").textContent = `${mappedCount} settings are documented for webOS ${state.profile.platformVersion}.${modelMapNote}${firmwareNote} A switch is enabled only when this TV returns its current value. Changes are checked afterward.`;
      }
    } else {
      statusPill($("#compatibility-status"), "Read-only", "unknown");
      $("#compatibility-summary").textContent = "No controls are available for this model and software version. A compatibility report stays on this TV until shared.";
    }
    paintMappedSettings(state.profile);
    paintPublicReferences(model);
  }

  function mapSourceLabel(source) {
    const labels = {
      glasshouse: "Glasshouse SettingsService map",
      "glasshouse-webos24": "Glasshouse webOS 9.2 map",
      "glasshouse-c2-webos22-fixture": "Glasshouse C2/webOS 22 sample fixture",
      "glasshouse-dashboard-c2": "Glasshouse dashboard · C2/webOS 22 root map",
      "glasshouse-c5": "Glasshouse C5 firmware map",
      "own-your-glass-b5": "own-your-glass B5 audit",
      "level1techs-g5": "Level1Techs G5 preference-file report",
      "webos-lockout-c5": "webos_lockout OLED77C51LA root report",
      "level1techs-g5+glasshouse": "Level1Techs G5 keys + Glasshouse SettingsService definitions",
      "webos-debloat-webos26": "webOS Debloat webOS 26 key list",
      "glasshouse+model-guide": "Glasshouse key map and model menu guide",
      "glasshouse+webos-debloat": "Glasshouse and webOS Debloat maps",
      "privacyshield-c6": "PrivacyShield C6H device map"
    };
    return labels[source] || String(source || "Published SettingsService map");
  }

  function paintMappedSettings(profile) {
    const scope = $("#mapped-settings-scope");
    const list = $("#mapped-settings-list");
    const readOnlyList = $("#research-only-setting-list");
    const readOnlySection = $("#research-only-setting-details");
    replaceContent(list);
    replaceContent(readOnlyList);
    readOnlySection.hidden = true;
    if (!profile) {
      scope.textContent = "No settings are available for this model and software version. Controls are read-only.";
      return;
    }
    const profileControls = Model.CONTROLS.filter((control) => profile.controls && profile.controls[control.key]);
    const locallyPresentCount = profileControls.filter((control) => deviceControlStatus(control.key).mapped).length;
    const firmwareNote = state.firmwareSettingsMap
      ? ` This TV lists ${locallyPresentCount} of ${profileControls.length} settings. A listed setting may still have no effect.`
      : " This TV's setting list could not be read; each setting is checked separately.";
    if (profile.mappingScope === "exact-device-firmware") {
      scope.textContent = `Settings documented for this C6H software version. Three changes were previously confirmed through PrivacyShield. The standard C6 family guide below does not cover C6H.${firmwareNote}`;
    } else {
      scope.textContent = `Settings documented for webOS ${profile.platformVersion}. A setting must be listed by the TV and return a current value before its switch is enabled. Changes are checked afterward.${firmwareNote}`;
    }
    if (!profileControls.length) {
      const item = document.createElement("li");
      item.textContent = "No settings are available.";
      list.append(item);
    } else {
      for (const control of profileControls) {
        const evidence = profile.controls[control.key];
        const compatibility = deviceControlStatus(control.key);
        const firmwareEntry = firmwareMapEntry(control.key);
        const category = compatibility.mapped ? compatibility.firmwareCategory || control.category : control.category;
        const item = document.createElement("li");
        const name = document.createElement("strong");
        const key = document.createElement("code");
        name.textContent = control.label;
        key.textContent = control.writer === "admanager"
          ? "com.webos.service.admanager/updateDNS"
          : `${category}.${control.key}`;
        const firmwareStatus = !firmwareEntry.available
          ? " The TV firmware map was unavailable."
          : compatibility.mapped ? " Present in this TV's firmware map; current value is read separately."
            : ` ${compatibility.reason}`;
        item.append(name, key, document.createTextNode(`${mapSourceLabel(evidence.source)}.${firmwareStatus}`));
        list.append(item);
      }
    }

    for (const reference of profile.referenceSettings || []) {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      const key = document.createElement("code");
      name.textContent = reference.label;
      const firmwareEntry = firmwareMapEntry(reference.key);
      key.textContent = `${firmwareEntry.category || reference.category}.${reference.key}`;
      const value = Model.normalizeToggle(state.referenceSettings[reference.key]);
      const current = firmwareEntry.available && !firmwareEntry.category
        ? "Not listed in this TV's firmware map; no value was read."
        : value === "unknown" ? "Status unavailable." : `Current value: ${value === "on" ? "On" : "Off"}.`;
      item.append(name, key, document.createTextNode(`${current} Read only. ${reference.reason} ${mapSourceLabel(reference.source)}`));
      readOnlyList.append(item);
    }
    readOnlySection.hidden = !(profile.referenceSettings && profile.referenceSettings.length);
  }

  function paintPublicReferences(model) {
    const statusLabels = {
      "upstream-confirmed": "project report",
      "user-reported": "owner report",
      "maintainer-tested": "project test",
      "maintainer-baseline": "project baseline",
      "network-measured": "network capture",
      "firmware-analyzed": "firmware analysis",
      "owner-audited": "owner audit"
    };
    const cohort = PublicReferences.cohortForModel(model && model.model);
    const cohortNode = $("#community-cohort");
    const guideNode = $("#community-model-guide");
    const discoveryNode = $("#community-device-discovery");
    const microphoneNode = $("#community-microphone");
    const microphoneSwitchNode = $("#community-microphone-switch");
    const samplesNode = $("#community-samples");
    replaceContent(samplesNode);
    replaceContent(guideNode);
    if (!cohort) {
      cohortNode.textContent = "This model is not listed in the B/C/G OLED references.";
      guideNode.textContent = "No matching model-family privacy guide is listed.";
      discoveryNode.textContent = "No matching model-specific network-discovery entry is available.";
      microphoneNode.textContent = "Published built-in microphone evidence is not available for this model.";
      microphoneSwitchNode.textContent = "Physical microphone switch: no model-specific report is available.";
    } else {
      const guide = PublicReferences.modelGuideForModel(model && model.model);
      const samples = PublicReferences.samplesForCohort(cohort.series);
      const sampleCounts = PublicReferences.sampleCountsForCohort(cohort.series);
      const sourceCounts = Object.entries(sampleCounts).map(([source, count]) => `${count} ${source}`).join(", ");
      cohortNode.textContent = `${cohort.series} · ${cohort.year} OLED family · launch version webOS ${cohort.launchWebOS} · listed screen sizes: ${cohort.sizes.join(", ")} inches. Reports: ${samples.length}${sourceCounts ? ` (${sourceCounts})` : ""}.`;
      if (guide) {
        guideNode.append(document.createTextNode("Model-family guide: "));
        const link = document.createElement("a");
        link.href = guide.url;
        link.rel = "noopener noreferrer";
        link.textContent = `LG ${guide.series} (${guide.year}) privacy guide`;
        guideNode.append(link, document.createTextNode(` ${guide.scopeNote}`));
      }
      discoveryNode.textContent = "LG says these TVs look for compatible devices on the home network. The cited guides list no setting to stop this. They do not show that the device list is sent to LG. A guest network can limit local access.";
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
      microphoneNode.textContent = `Built-in microphone: ${exactMicStatus}. ${cohort.microphone.summary} Software cannot identify or control a physical switch.`;
      const switchEvidence = PublicReferences.microphoneSwitchForCohort(cohort.series);
      if (switchEvidence) {
        microphoneSwitchNode.textContent = `Physical microphone switch: reported for ${cohort.series} on ${switchEvidence.webOS}. ${switchEvidence.observation} ${switchEvidence.limit}`;
      } else if (cohort.series === "C6") {
        microphoneSwitchNode.textContent = "Physical microphone switch: no C6-specific report is included. The C5 switch finding does not establish a switch on a C6 or C6H.";
      } else {
        microphoneSwitchNode.textContent = `Physical microphone switch: no report confirms one on this ${cohort.series} model family.`;
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
          item.append(heading, document.createTextNode(`Reported webOS version ${sample.webOS}; firmware ${sample.firmware || "not listed"}${panel}. ${sample.note}`));
          samplesNode.append(item);
        }
      }
    }

    const menuNode = $("#menu-reference-list");
    replaceContent(menuNode);
    const menuEntries = model && model.platformVersion
      ? PublicReferences.menuForPlatform(model.platformVersion)
      : [];
    $("#menu-reference-status").textContent = model && model.platformVersion
      ? `webOS ${model.platformVersion} · ${menuEntries.length} documented menu paths.`
      : "The installed webOS version is unavailable. No menu paths are shown.";
    for (const entry of menuEntries) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = entry.name;
      item.append(heading, document.createTextNode(entry.path));
      if (entry.note) item.append(document.createTextNode(` ${entry.note}`));
      menuNode.append(item);
    }

    const findingsNode = $("#community-control-findings");
    replaceContent(findingsNode);
    for (const finding of PublicReferences.PUBLIC_CONTROL_FINDINGS) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = `${finding.project} · ${finding.feature}`;
      item.append(heading, document.createTextNode(`${finding.method}. ${finding.observation} Scope: ${finding.scope} ${finding.limit}`));
      findingsNode.append(item);
    }

    const unassignedNode = $("#community-unassigned-samples");
    replaceContent(unassignedNode);
    for (const sample of PublicReferences.unassignedSamples()) {
      const item = document.createElement("li");
      const heading = document.createElement("strong");
      heading.textContent = `${sample.displayModel || "Model not published"} · ${sample.project} (${statusLabels[sample.status] || "reported"})`;
      const panel = sample.panel ? `; ${sample.panel}` : "";
      const webOS = sample.webOS === "Not recorded" ? "not recorded" : sample.webOS;
      item.append(heading, document.createTextNode(` webOS version: ${webOS}; firmware: ${sample.firmware || "not listed"}${panel}. ${sample.note}`));
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
    $("#runtime-mode").textContent = "Reading TV status…";
    state.settings = Object.fromEntries(Model.CONTROLS.map(({ key }) => [key, "unknown"]));
    state.model = null;
    state.profile = null;
    state.controlReads = {};
    state.apiAccess = {};
    state.referenceSettings = {};
    state.firmwareSettingsMap = null;
    state.errors = [];
    for (const control of Model.CONTROLS) {
      setControl(control.key, "unknown", { mapped: false, reason: "A TV profile has not been selected yet." });
    }
    $("#privacy-preset").disabled = true;
    $("#restore-button").disabled = true;
    const results = await Promise.allSettled([
      Api.getAgreements(),
      Api.getSystemInfo(),
      Api.getNetworkStatus(),
      rootSnapshot()
    ]);
    const [agreements, model, network, root] = results;
    state.root = root.status === "fulfilled" ? root.value : null;
    state.firmwareSettingsMap = firmwareSettingsMapFromSnapshot();
    const directAgreements = agreements.status === "fulfilled" ? agreementRecord(agreements.value) : null;
    const rootAgreements = parseRootSnapshot(state.root)?.agreements || null;
    state.agreements = Model.hasAgreementRecord(directAgreements) ? directAgreements : rootAgreements;
    state.model = model.status === "fulfilled" ? infoModel(model.value) : null;
    if (model.status === "rejected") state.errors.push(model.reason.message);
    state.profile = Compatibility.matchProfile(state.model);

    // Read only keys in the selected source map. A missing key therefore fails
    // only its own request instead of hiding every control in the category.
    const candidates = mappedControls();
    const settingResults = await Promise.allSettled(candidates.map((control) =>
      Api.getSettings(control.category, [control.key])
    ));
    const rootSettings = snapshotSettings();
    const observedSettings = Object.fromEntries(Model.CONTROLS.map(({ key }) => [key, "unknown"]));
    const directSuccesses = settingResults.filter((result) => result.status === "fulfilled").length;
    const directFailures = settingResults.length - directSuccesses;
    for (let index = 0; index < candidates.length; index += 1) {
      const control = candidates[index];
      const result = settingResults[index];
      let value = result.status === "fulfilled"
        ? Model.normalizeToggle(Model.pickValue(result.value, control.key))
        : "unknown";
      if (value === "unknown") value = rootSettings[control.key];
      observedSettings[control.key] = value;
    }

    const referenceSettings = state.profile && state.profile.referenceSettings || [];
    const referenceCandidates = referenceSettings.map((setting) => {
      const firmwareEntry = firmwareMapEntry(setting.key);
      if (firmwareEntry.available && !firmwareEntry.category) return null;
      return firmwareEntry.category ? { ...setting, category: firmwareEntry.category } : setting;
    }).filter(Boolean);
    const referenceResults = await Promise.allSettled(referenceCandidates.map((setting) =>
      Api.getSettings(setting.category, [setting.key])
    ));
    const rootReferenceSettings = snapshotReferenceSettings();
    for (let index = 0; index < referenceCandidates.length; index += 1) {
      const setting = referenceCandidates[index];
      const result = referenceResults[index];
      const directValue = result.status === "fulfilled"
        ? Model.normalizeToggle(Model.pickValue(result.value, setting.key))
        : "unknown";
      state.referenceSettings[setting.key] = directValue === "unknown"
        ? Model.normalizeToggle(rootReferenceSettings[setting.key])
        : directValue;
    }
    for (const setting of referenceSettings) {
      if (!referenceCandidates.some((candidate) => candidate.key === setting.key)) state.referenceSettings[setting.key] = "unknown";
    }

    state.controlReads = {};
    for (const control of Model.CONTROLS) {
      state.controlReads[control.key] = deviceControlStatus(control.key).mapped
        && Model.normalizeToggle(observedSettings[control.key]) !== "unknown";
    }
    state.settings = observedSettings;
    state.apiAccess = {
      systemInfo: model.status === "fulfilled",
      settingsService: candidates.length > 0 && directFailures === 0
        ? "available" : directSuccesses > 0 ? "partial" : "unavailable",
      hbcSnapshot: Boolean(parseRootSnapshot(state.root)),
      firmwareSettingsMap: Boolean(state.firmwareSettingsMap),
      controlReads: state.controlReads
    };
    if (!Model.hasAgreementRecord(state.agreements) && agreements.status === "rejected") state.errors.push(agreements.reason.message);
    if (candidates.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown")) {
      state.errors.push("Some mapped privacy settings are unavailable");
    }
    state.network = network.status === "fulfilled" ? network.value : null;
    if (network.status === "rejected") state.errors.push(network.reason.message);
    if (root.status === "rejected") state.errors.push(root.reason.message);

    for (const control of Model.CONTROLS) {
      setControl(control.key, state.settings[control.key], deviceControlStatus(control.key));
    }
    paintAgreementState();
    paintOverview();
    paintEvidence();
    paintCompatibility();
    $("#restore-button").disabled = !canRestoreSaved(savedControls());
    $("#runtime-mode").textContent = state.errors.length ? "Some TV status unavailable" : "TV status updated";
    $("#app-version").textContent = Compatibility.APP_VERSION;
    updateControlScrollCue();
    if (!state.profile) {
      $("#write-access-note span").textContent = "No settings were changed. No controls are available for this model and software version.";
    } else if (state.errors.length) {
      const rootDenied = root.status === "rejected" && /Denied method call ["']exec["']/.test(root.reason.message || "");
      const controlsUnknown = Model.CONTROLS.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown");
      $("#write-access-note span").textContent = rootDenied
        ? `The Homebrew Channel blocked local TV checks. Check its permissions and refresh. ${controlsUnknown ? "Unreadable settings remain locked." : "Privacy settings are available; local details are not."}`
        : `Some TV information could not be read. Refresh to try again. ${controlsUnknown ? "Settings without a readable value remain locked." : "Readable settings are still available."}`;
    } else {
      const preset = privacyPresetForProfile();
      $("#write-access-note span").textContent = `The preset includes ${preset.length} available settings. Other switches remain separate. The TV confirms each change.`;
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
        && deviceControlStatus(key).mapped
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
    const mappedControl = controlForDevice(control);
    if (!mappedControl) {
      throw new Error("No controls are available for this model and software version; settings are read-only.");
    }
    if (Model.normalizeToggle(state.settings[mappedControl.key]) === "unknown") {
      throw new Error("The current value could not be read; no change was attempted.");
    }
    const target = value === "on" ? "on" : "off";
    let directError = null;
    try {
      if (mappedControl.writer === "admanager") await Api.setDoNotSell(target);
      else {
        const serviceTarget = mappedControl.writer === "thirdPartyCookie"
          ? (target === "on" ? "onByUser" : "offByUser")
          : target;
        await Api.setSetting(mappedControl.category, mappedControl.key, serviceTarget);
      }
    }
    catch (error) { directError = error; }

    let actual = await readControl(control);
    if (actual !== target && mappedControl.writer === "admanager" && !directError) {
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
    state.settings[mappedControl.key] = actual;
    state.controlReads[mappedControl.key] = true;
    setControl(mappedControl.key, actual, deviceControlStatus(mappedControl.key));
  }

  async function readControl(control) {
    const mappedControl = controlForDevice(control);
    if (!mappedControl) return "unknown";
    try {
      const response = await Api.getSettings(mappedControl.category, [mappedControl.key]);
      const direct = Model.normalizeToggle(Model.pickValue(response, mappedControl.key));
      if (direct !== "unknown") return direct;
    } catch (_) { /* try the privileged, allowlisted local snapshot below */ }
    try {
      state.root = await rootSnapshot();
      state.firmwareSettingsMap = firmwareSettingsMapFromSnapshot();
      return Model.snapshotSettings(parseRootSnapshot(state.root))[mappedControl.key];
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
    const preset = privacyPresetForProfile();
    if (!preset.length || !preset.every(({ key }) => deviceControlStatus(key).mapped)) {
      $("#control-status").textContent = "No recommended settings are available for this TV.";
      showToast("No settings changed. No recommended settings are available for this TV.");
      return;
    }
    if (!Model.canApplyPrivacyPreset(state.settings, preset)) {
      $("#control-status").textContent = "Some current values are unavailable. Refresh before applying settings.";
      showToast("No settings changed. Some current values are unavailable.");
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
      for (const item of preset) {
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
      $("#control-status").textContent = "No settings are available for this model and software version.";
      showToast("No settings changed. These settings are read-only for this TV.");
      return;
    }
    const saved = savedControls();
    if (!canRestoreSaved(saved)) {
      $("#control-status").textContent = "Current TV values are unavailable. Refresh before restoring settings.";
      showToast("No settings changed. Current TV values are unavailable.");
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
    $("#main-content").addEventListener("scroll", updateControlScrollCue, { passive: true });
    window.addEventListener("resize", updateControlScrollCue);
    document.addEventListener("visibilitychange", refreshAfterAgreementReview);
    document.addEventListener("webOSRelaunch", refreshAfterAgreementReview);
    window.addEventListener("focus", refreshAfterAgreementReview);
    bindRemoteFocusIndicator();
  }

  bindUI();
  setView("overview", $(".tab[data-view='overview']"));
  loadState();
})();

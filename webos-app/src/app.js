(function () {
  "use strict";

  const Model = window.LGPrivacyShieldModel;
  const Api = window.LGPrivacyShieldDeviceApi;
  const Remote = window.LGPrivacyShieldRemoteNavigation;
  const Compatibility = window.LGPrivacyShieldCompatibility;
  const DeviceProfiles = window.LGPrivacyShieldDeviceProfiles;
  const SAVE_KEY = "privacyshield.saved-controls.v1";
  const THEME_KEY = "privacyshield.theme.v1";
  const state = {
    settings: {}, agreements: null, model: null, profile: null, root: null,
    firmwareSettingsMap: null, controlReads: {}, apiAccess: {}, errors: []
  };
  let toastTimer;
  let agreementReviewRequested = false;
  const pendingSettings = new Set();
  const pendingActions = new Set();

  const $ = (selector, parent) => (parent || document).querySelector(selector);
  const $$ = (selector, parent) => Array.from((parent || document).querySelectorAll(selector));

  function readThemePreference() {
    try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
    catch (_) { return "dark"; }
  }

  function setTheme(theme, persist) {
    const selected = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", selected);
    $("#theme-toggle").textContent = selected === "dark" ? "Use light theme" : "Use dark theme";
    if (persist) {
      try { localStorage.setItem(THEME_KEY, selected); } catch (_) {}
    }
  }

  function initializeThemeToggle() {
    const button = $("#theme-toggle");
    setTheme(readThemePreference(), false);
    button.addEventListener("click", () => {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
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
    const rows = $$("#control-list .control-row:not([hidden])");
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
    track.setAttribute("aria-valuemax", String(rows.length));
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
    const themeToggle = $("#theme-toggle");
    const onTab = focused && focused.classList.contains("tab");
    const main = $("#main-content");

    if (focused === themeToggle) {
      if (key === "ArrowDown") return focusRemote(tab);
      return false;
    }
    if (onTab && (key === "ArrowLeft" || key === "ArrowRight")) {
      return switchSectionByKey(key);
    }
    if (onTab) {
      if (key === "ArrowUp") {
        if (main.scrollTop > 0) return scrollMainPage(-1);
        return focusRemote(themeToggle);
      }
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
    const platform = DeviceProfiles.detectPlatform(window.navigator && window.navigator.userAgent, sdk || "");
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

  function firmwareSettingsMapFromSnapshot() {
    const snapshot = parseRootSnapshot(state.root);
    const source = snapshot && snapshot.firmwareSettingsMap;
    if (!source || source.available !== true || !source.settings || typeof source.settings !== "object" || Array.isArray(source.settings)) return null;
    const allowedKeys = new Set(Model.CONTROLS.map(({ key }) => key));
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
        const pill = document.createElement("span");
        pill.className = "status-pill status-unknown";
        pill.textContent = "Unavailable";
        row.append(copy, pill);
        $("#agreement-list").append(row);
      }
      if (!row) continue;
      $(".agreement-accepted", row).textContent = entry.acceptedEffect;
      $(".agreement-declined", row).textContent = entry.declinedEffect;
      const pill = $(".status-pill", row);
      const label = entry.state === "accepted" ? "Accepted" : entry.state === "withdrawn" ? "Not accepted" : "Unavailable";
      statusPill(pill, label, entry.state === "accepted" ? "on" : entry.state === "withdrawn" ? "off" : "unknown");
    }
  }

  function setControl(key, value, compatibility) {
    const checkbox = $(`[data-setting="${key}"]`);
    const meta = $(`#${key}-meta`);
    if (!checkbox) return;
    const row = checkbox.closest(".control-row");
    const normalized = Model.normalizeToggle(value);
    const switchLabel = checkbox.closest(".switch");
    const mapped = Boolean(compatibility && compatibility.mapped);
    if (row) row.hidden = !mapped;
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

  function updateControlsView() {
    const available = mappedControls();
    const noControls = available.length === 0;
    $("#control-toolbar").hidden = noControls;
    $("#control-scroll-frame").hidden = noControls;
    $("#control-list-frame").hidden = noControls;
    $("#no-supported-controls").hidden = !noControls;
    if (noControls) {
      $("#no-supported-controls").textContent = !state.profile
        ? "No privacy controls are mapped for this model and software version."
        : "No supported controls are listed in this TV's firmware index.";
    }
  }

  function updateCompatibilityPrompt() {
    const candidates = state.profile
      ? Model.CONTROLS.filter((control) => state.profile.controls && state.profile.controls[control.key])
      : [];
    const unavailable = !state.profile || !candidates.length || candidates.some((control) =>
      !deviceControlStatus(control.key).mapped || Model.normalizeToggle(state.settings[control.key]) === "unknown"
    );
    const prompt = $("#compatibility-report-prompt");
    prompt.hidden = !unavailable;
    if (unavailable) {
      $("#compatibility-report-reason").textContent = !state.profile
        ? "This model and software version have no supported control profile."
        : !candidates.length
          ? "No supported controls are listed in this TV's firmware index."
          : "Some mapped controls are unavailable or unreadable.";
    }
  }

  function paintOverview() {
    const preset = privacyPresetForProfile();
    const profileAllowsPreset = Compatibility.canApplyPreset(state.profile, preset);
    $("#privacy-preset").disabled = !profileAllowsPreset || !Model.canApplyPrivacyPreset(state.settings, preset);

    const viewing = Model.normalizeToggle(state.settings.livePlus);
    $("#summary-viewing").textContent = viewing === "off" ? "Off" : viewing === "on" ? "On" : "Unavailable";
    $("#dot-viewing").className = `state-dot ${viewing === "off" ? "is-safe" : viewing === "on" ? "is-on" : ""}`;

    const voiceOff = Model.normalizeToggle(state.settings.voiceLongDistance) === "off" && Model.normalizeToggle(state.settings.turnOnByVoice) === "off";
    const voiceOn = Model.normalizeToggle(state.settings.voiceLongDistance) === "on" || Model.normalizeToggle(state.settings.turnOnByVoice) === "on";
    $("#summary-voice").textContent = voiceOff ? "Voice controls are off" : voiceOn ? "Voice wake or hands-free voice is on" : "Unavailable";
    $("#dot-voice").className = `state-dot ${voiceOff ? "is-safe" : voiceOn ? "is-on" : ""}`;

    const data = state.model || {};
    $("#device-summary").textContent = data.model || "TV model unavailable";
    $("#webos-version").textContent = [
      data.platformVersion ? `webOS ${data.platformVersion}` : data.sdk && data.sdk !== "Version unavailable" ? `SDK ${data.sdk}` : "",
      data.firmware && `Firmware ${data.firmware}`
    ].filter(Boolean).join(" · ") || "TV software unavailable";
    updateControlsView();
    updateCompatibilityPrompt();
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
    const runtimeStatus = $("#runtime-mode");
    runtimeStatus.dataset.state = "reading";
    runtimeStatus.hidden = false;
    runtimeStatus.textContent = "Reading TV status…";
    state.settings = Object.fromEntries(Model.CONTROLS.map(({ key }) => [key, "unknown"]));
    state.model = null;
    state.profile = null;
    state.controlReads = {};
    state.apiAccess = {};
    state.firmwareSettingsMap = null;
    state.errors = [];
    $("#control-status").textContent = "";
    for (const control of Model.CONTROLS) {
      setControl(control.key, "unknown", { mapped: false, reason: "A TV profile has not been selected yet." });
    }
    $("#privacy-preset").disabled = true;
    $("#save-settings-button").disabled = true;
    $("#restore-button").disabled = true;
    const results = await Promise.allSettled([
      Api.getAgreements(),
      Api.getSystemInfo(),
      rootSnapshot()
    ]);
    const [agreements, model, root] = results;
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
    if (root.status === "rejected") state.errors.push(root.reason.message);

    for (const control of Model.CONTROLS) {
      setControl(control.key, state.settings[control.key], deviceControlStatus(control.key));
    }
    paintAgreementState();
    paintOverview();
    updateRestorePointButtons();
    const valuesUnavailable = state.errors.length > 0;
    runtimeStatus.dataset.state = valuesUnavailable ? "unavailable" : "ready";
    runtimeStatus.textContent = valuesUnavailable ? "Some values unavailable" : "";
    runtimeStatus.hidden = !valuesUnavailable;
    $("#app-version").textContent = Compatibility.APP_VERSION;
    updateControlScrollCue();
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

  function currentControlsSnapshot() {
    const snapshot = {};
    if (!state.profile) return snapshot;
    for (const control of Model.CONTROLS) {
      if (!deviceControlStatus(control.key).mapped) continue;
      const value = Model.normalizeToggle(state.settings[control.key]);
      if (value !== "unknown") snapshot[control.key] = value;
    }
    return snapshot;
  }

  function updateRestorePointButtons() {
    const busy = pendingActions.size > 0 || pendingSettings.size > 0;
    $("#save-settings-button").disabled = busy || Object.keys(currentControlsSnapshot()).length === 0;
    $("#restore-button").disabled = busy || !canRestoreSaved(savedControls());
  }

  function saveRestorePointIfMissing() {
    if (!savedControls()) {
      const snapshot = currentControlsSnapshot();
      if (Object.keys(snapshot).length) {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify({ kind: "automatic", savedAt: new Date().toISOString(), settings: snapshot }));
        } catch (_) {}
      }
    }
    updateRestorePointButtons();
  }

  function saveCurrentSettings() {
    if (pendingActions.size > 0 || pendingSettings.size > 0) return;
    const snapshot = currentControlsSnapshot();
    if (!Object.keys(snapshot).length) {
      $("#control-status").textContent = "No readable settings are available to save.";
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ kind: "manual", savedAt: new Date().toISOString(), settings: snapshot }));
    } catch (_) {
      $("#control-status").textContent = "Could not save settings on this TV.";
      showToast("Could not save current settings on this TV.");
      return;
    }
    updateRestorePointButtons();
    $("#control-status").textContent = "Current readable settings saved on this TV.";
    showToast("Current readable settings saved on this TV.");
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
    updateRestorePointButtons();
    switchLabel.setAttribute("aria-busy", "true");
    saveRestorePointIfMissing();
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
      updateRestorePointButtons();
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
    updateRestorePointButtons();
    button.setAttribute("aria-busy", "true");
    saveRestorePointIfMissing();
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
      updateRestorePointButtons();
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
    updateRestorePointButtons();
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
        if (saved.kind !== "manual") localStorage.removeItem(SAVE_KEY);
        $("#control-status").textContent = "Saved settings restored.";
        showToast("Saved settings restored.");
      }
    } finally {
      pendingActions.delete("restore");
      button.removeAttribute("aria-busy");
      updateRestorePointButtons();
      restoreFocusAfterPending(button, hadFocus, $("#privacy-preset").disabled ? $("#footer-refresh") : $("#privacy-preset"));
      paintOverview();
    }
  }

  function prepareCompatibilityReport() {
    const button = $("#prepare-compatibility-report");
    const status = $("#compatibility-report-status");
    const share = $("#compatibility-report-share");
    const qrImage = $("#compatibility-report-qr");
    const hadFocus = hasFocusWithin(button);
    let qrReady = false;
    const report = Compatibility.createReport(state.model, state.profile, state.apiAccess, Model.CONTROLS);
    const serialized = JSON.stringify(report);
    try {
      const issueUrl = new URL("https://github.com/snapetech-org/LGPrivacyShield/issues/new");
      issueUrl.searchParams.set("template", "compatibility-report.yml");
      issueUrl.searchParams.set("title", `[Compatibility] ${report.device.model || "Unmapped TV"}`);
      issueUrl.searchParams.set("report", serialized);
      const qr = window.qrcode(0, "M");
      qr.addData(issueUrl.toString(), "Byte");
      qr.make();
      qrImage.src = qr.createDataURL(7, 8);
      qrImage.hidden = false;
      share.hidden = false;
      qrReady = true;
    } catch (_) {
      qrImage.hidden = true;
      share.hidden = false;
    }
    if (hadFocus && typeof share.scrollIntoView === "function") {
      share.scrollIntoView({ block: "start" });
    }
    status.textContent = qrReady
      ? "Scan once to open GitHub's prefilled form. The link includes the report; Submit creates the public issue."
      : "Could not generate the QR code. Nothing was sent; try again.";
  }

  function renderSupportQr() {
    const image = $("#support-qr");
    try {
      const qr = window.qrcode(0, "M");
      qr.addData("https://ko-fi.com/snapetech", "Byte");
      qr.make();
      image.src = qr.createDataURL(6, 8);
      image.hidden = false;
    } catch (_) {
      image.hidden = true;
    }
  }

  function bindUI() {
    initializeThemeToggle();
    renderSupportQr();
    $$(".tab").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view, button)));
    $$("[data-go]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.go, "first")));
    $$("[data-setting]").forEach((input) => input.addEventListener("change", toggleChanged));
    $("#footer-refresh").addEventListener("click", loadState);
    $("#privacy-preset").addEventListener("click", applyPreset);
    $("#save-settings-button").addEventListener("click", saveCurrentSettings);
    $("#restore-button").addEventListener("click", restoreSettings);
    $("#agreement-manager-button").addEventListener("click", openAgreementManager);
    $("#prepare-compatibility-report").addEventListener("click", prepareCompatibilityReport);
    updateRestorePointButtons();
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

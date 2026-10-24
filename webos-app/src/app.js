(function () {
  "use strict";

  const Model = window.PrivacyShieldModel;
  const Api = window.PrivacyShieldDeviceApi;
  const Remote = window.PrivacyShieldRemoteNavigation;
  const SAVE_KEY = "privacyshield.saved-controls.v1";
  const state = { settings: {}, agreements: null, model: null, network: null, root: null, errors: [] };
  let toastTimer;
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
        const message = "Changes are locked because the current value could not be read.";
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
    return { model: model || "Model unavailable", sdk: sdk || "Version unavailable", firmware: firmware || "" };
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

  function setControl(key, value) {
    const checkbox = $(`[data-setting="${key}"]`);
    const meta = $(`#${key}-meta`);
    if (!checkbox) return;
    const normalized = Model.normalizeToggle(value);
    const switchLabel = checkbox.closest(".switch");
    checkbox.checked = normalized === "on";
    checkbox.disabled = normalized === "unknown";
    if (normalized === "unknown") {
      switchLabel.tabIndex = 0;
      switchLabel.setAttribute("aria-disabled", "true");
    } else {
      switchLabel.removeAttribute("tabindex");
      switchLabel.removeAttribute("aria-disabled");
    }
    const stateNode = $(".switch-state", switchLabel);
    stateNode.textContent = normalized === "unknown" ? "Can't read" : normalized === "on" ? "On" : "Off";
    if (meta) meta.textContent = normalized === "unknown"
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
    const counts = Model.countPrivacyControls(state.settings);
    $("#privacy-preset").disabled = !Model.canApplyPrivacyPreset(state.settings);
    const value = counts.unknown ? "Some values unavailable" : counts.on ? "Some settings on" : "All three off";
    $("#posture-value").textContent = value;
    $("#posture-detail").textContent = counts.unknown
      ? `${counts.unknown} setting ${counts.unknown === 1 ? "value" : "values"} could not be read`
      : `${counts.off} of ${Model.CONTROLS.length} settings are off`;

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
    $("#webos-version").textContent = [data.sdk, data.firmware].filter(Boolean).join(" · ") || "Unavailable";
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
      $("#evidence-processes").textContent = "Homebrew Channel access is needed to read local service status.";
      $("#evidence-apps").textContent = "Homebrew Channel access is needed to list installed apps.";
      $("#diagnostics-status").textContent = "Homebrew Channel access is needed to read diagnostics settings.";
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
    const serviceStatus = services.length ? `${services.length} running` : "None found";
    const uploadStatus = autoUpload == null ? "Unavailable" : autoUpload ? "On in settings" : "Off in settings";
    $("#diagnostics-status").textContent = `Diagnostics services: ${serviceStatus}. Automatic uploads: ${uploadStatus}. Past uploads are not listed.`;
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
    state.errors = [];
    const results = await Promise.allSettled([
      Api.getSettings("option", ["livePlus", "turnOnByVoice"]),
      Api.getSettings("general", ["voiceLongDistance"]),
      Api.getAgreements(),
      Api.getSystemInfo(),
      Api.getNetworkStatus(),
      rootSnapshot()
    ]);
    const [option, general, agreements, model, network, root] = results;
    state.root = root.status === "fulfilled" ? root.value : null;
    const rootSettings = snapshotSettings();
    const privateQueryErrors = [];

    if (option.status === "fulfilled") Object.assign(state.settings, settingValues(option.value, ["livePlus", "turnOnByVoice"]));
    else privateQueryErrors.push(option.reason.message);
    if (general.status === "fulfilled") Object.assign(state.settings, settingValues(general.value, ["voiceLongDistance"]));
    else privateQueryErrors.push(general.reason.message);
    for (const control of Model.CONTROLS) {
      if (Model.normalizeToggle(state.settings[control.key]) === "unknown") state.settings[control.key] = rootSettings[control.key];
    }
    const directAgreements = agreements.status === "fulfilled" ? agreementRecord(agreements.value) : null;
    const rootAgreements = parseRootSnapshot(state.root)?.agreements || null;
    state.agreements = Model.hasAgreementRecord(directAgreements) ? directAgreements : rootAgreements;
    if (Model.CONTROLS.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown")) {
      state.errors.push(...privateQueryErrors);
    }
    if (!Model.hasAgreementRecord(state.agreements) && agreements.status === "rejected") {
      state.errors.push(agreements.reason.message);
    }
    state.model = model.status === "fulfilled" ? infoModel(model.value) : null;
    if (model.status === "rejected") state.errors.push(model.reason.message);
    state.network = network.status === "fulfilled" ? network.value : null;
    if (network.status === "rejected") state.errors.push(network.reason.message);
    if (root.status === "rejected") state.errors.push(root.reason.message);

    for (const control of Model.CONTROLS) setControl(control.key, state.settings[control.key]);
    paintAgreementState();
    paintOverview();
    paintEvidence();
    $("#runtime-mode").textContent = state.errors.length ? "Some TV information unavailable" : "TV information updated";
    if (state.errors.length) {
      const rootDenied = root.status === "rejected" && /Denied method call ["']exec["']/.test(root.reason.message || "");
      const controlsUnknown = Model.CONTROLS.some((control) => Model.normalizeToggle(state.settings[control.key]) === "unknown");
      $("#write-access-note span").textContent = rootDenied
        ? `Homebrew Channel access was denied. Check its permissions and refresh. ${controlsUnknown ? "Settings that could not be read remain locked." : "Privacy settings are available; local service details are not."}`
        : `Some TV information could not be read. Refresh to try again. ${controlsUnknown ? "Settings without a readable value remain locked." : "Readable settings are still available."}`;
    }
  }

  function savedControls() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (_) { return null; }
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
    $("#restore-button").disabled = !savedControls();
  }

  async function applyOne(control, value) {
    const target = value === "on" ? "on" : "off";
    let directError = null;
    try { await Api.setSetting(control.category, control.key, target); }
    catch (error) { directError = error; }

    let actual = await readControl(control);
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
    setControl(control.key, actual);
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
    if (!Model.canApplyPrivacyPreset(state.settings)) {
      $("#control-status").textContent = "Read all three settings before turning them off.";
      showToast("No settings changed. One or more current values could not be read.");
      return;
    }
    const button = $("#privacy-preset");
    const hadFocus = hasFocusWithin(button);
    pendingActions.add("preset");
    button.setAttribute("aria-busy", "true");
    saveCurrentControls();
    $("#control-status").textContent = "Turning off privacy settings…";
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
      $("#control-status").textContent = "All three settings are off.";
      showToast("All three settings are off.");
    }
  }

  async function restoreSettings() {
    if (pendingActions.size > 0 || pendingSettings.size > 0) return;
    const saved = savedControls();
    if (!saved || !saved.settings) return;
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
      button.disabled = !savedControls();
      restoreFocusAfterPending(button, hadFocus, $("#privacy-preset").disabled ? $("#footer-refresh") : $("#privacy-preset"));
      paintOverview();
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
    $("#restore-button").disabled = !savedControls();
    document.addEventListener("keydown", handleRemoteKey);
    bindRemoteFocusIndicator();
  }

  bindUI();
  setView("overview", $(".tab[data-view='overview']"));
  loadState();
})();

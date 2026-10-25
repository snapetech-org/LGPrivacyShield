const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const test = require("node:test");

const APP_ROOT = path.resolve(process.env.PRIVACYSHIELD_APP_ROOT || path.join(__dirname, "../webos-app"));
const SCRATCH_ROOT = process.env.PRIVACYSHIELD_HEADLESS_DIR || os.tmpdir();
const CHROMIUM = process.env.CHROMIUM_BIN || "chromium";

const serviceFixture = String.raw`(() => {
  const scenario = new URLSearchParams(location.search).get("scenario") || "success";
  const directDenied = scenario === "root-fallback" || scenario === "denied";
  const rootDenied = scenario === "denied";
  const devices = {
    success: { modelName: "OLED77C6HUP", sdkVersion: "11.2.0", firmwareVersion: "43.21.79", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.207 Safari/537.36 WebAppManager" },
    unmapped: { modelName: "OLED65B5HNA", sdkVersion: "10.3.0", firmwareVersion: "33.20.90", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    c1: { modelName: "OLED55C17LB", sdkVersion: "6.5.3", firmwareVersion: "03.53.45", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 WebAppManager" },
    c5: { modelName: "OLED65C54LA", sdkVersion: "11.2.0", firmwareVersion: "43.21.77", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.207 Safari/537.36 WebAppManager" },
    g2: { modelName: "OLED65G26LA", sdkVersion: "10.2.2", firmwareVersion: "33.23.05", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    g1: { modelName: "OLED55G19LA", sdkVersion: "6.5.3", firmwareVersion: "03.53.45", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 WebAppManager" },
    g4: { modelName: "OLED65G45LW", sdkVersion: "9.2.4", firmwareVersion: "23.23.30", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 WebAppManager" }
  };
  const matrixMatch = scenario.match(/^matrix-([BCG])([1-6])$/);
  const matrixPlatforms = {
    1: { sdk: "6.5.3", firmware: "SIM-2021", chrome: "79" },
    2: { sdk: "7.4.0", firmware: "SIM-2022", chrome: "87" },
    3: { sdk: "8.3.0", firmware: "SIM-2023", chrome: "94" },
    4: { sdk: "9.2.0", firmware: "SIM-2024", chrome: "108" },
    5: { sdk: "10.3.0", firmware: "SIM-2025", chrome: "120" },
    6: { sdk: "11.2.0", firmware: "SIM-2026", chrome: "132" }
  };
  const simulatedFamily = matrixMatch && matrixPlatforms[matrixMatch[2]];
  const simulatedDevice = simulatedFamily ? {
    modelName: "OLED65" + matrixMatch[1] + matrixMatch[2] + "SIM",
    sdkVersion: simulatedFamily.sdk,
    firmwareVersion: simulatedFamily.firmware,
    userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + simulatedFamily.chrome + ".0.0.0 Safari/537.36 WebAppManager"
  } : null;
  const device = devices[scenario] || simulatedDevice || devices.success;
  const modelName = device.modelName;
  const firmwareVersion = device.firmwareVersion;
  Object.defineProperty(Navigator.prototype, "userAgent", { configurable: true, get: () => device.userAgent });
  const settings = {
    livePlus: "on", voiceLongDistance: "on", turnOnByVoice: "on",
    lmt: "off", doNotSellMyPersonalInformation: "off", screenSaverAd: "on",
    homePromotion: "on", livePromotion: "on", contentRecommendation: "on",
    hbbTvDnt: "off", hbbTvDeviceId: "on", thirdPartyCookie: "onByUser",
    hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
  };
  const eulaList = [
    { id: "S_ADG", accepted: true }, { id: "S_VNG", accepted: true },
    { id: "S_TAG", accepted: true }, { id: "S_MKT", accepted: true },
    { id: "S_DPA", accepted: false }, { id: "S_PRG", accepted: true },
    { id: "S_SVC", accepted: true }
  ];
  const calls = [];
  window.__privacyShieldFixture = { scenario, settings, calls, eulaList };
  window.PalmSystem = {
    deviceInfo: JSON.stringify({ modelName, platformVersion: device.sdkVersion, platformVersionMajor: Number.parseInt(device.sdkVersion, 10), platformVersionMinor: 0 }),
    stageReady() {},
    platformBack() { window.__privacyShieldFixture.backCalled = true; }
  };
  function answer(uri, payload) {
    const slash = uri.lastIndexOf("/");
    const service = uri.slice(0, slash);
    const method = uri.slice(slash + 1);
    const parameters = JSON.parse(payload || "{}");
    calls.push({ service, method, parameters });
    if (service === "luna://com.webos.settingsservice" && method === "getSystemSettings") {
      if (directDenied) return { returnValue: false, errorText: "SettingsService read permission denied" };
      if (parameters.category) {
        const values = {};
        for (const key of parameters.keys || []) values[key] = settings[key];
        return { returnValue: true, settings: values };
      }
      return { returnValue: true, settings: { eulaStatus: {}, eulaInfoNetwork: { eulaList } } };
    }
    if (service === "luna://com.webos.settingsservice" && method === "setSystemSettings") {
      if (directDenied) return { returnValue: false, errorText: "SettingsService write permission denied" };
      for (const [key, value] of Object.entries(parameters.settings || {})) settings[key] = value;
      return { returnValue: true };
    }
    if (service === "luna://com.webos.service.admanager" && method === "updateDNS") {
      settings.doNotSellMyPersonalInformation = parameters.status;
      return { returnValue: true };
    }
    if (service === "luna://com.webos.applicationManager" && method === "launch") {
      return { returnValue: true };
    }
    if (service === "luna://com.webos.service.tv.systemproperty" && method === "getSystemInfo") {
      return { returnValue: true, modelName, sdkVersion: device.sdkVersion, firmwareVersion };
    }
    if (service === "luna://com.palm.connectionmanager" && method === "getStatus") {
      return { returnValue: true, isInternetConnectionAvailable: true };
    }
    if (service === "luna://org.webosbrew.hbchannel.service" && method === "exec") {
      if (rootDenied) return { returnValue: false, errorText: 'Denied method call "exec" for category "/"' };
      const controlChange = (parameters.command || "").match(/\s(livePlus|voiceLongDistance|turnOnByVoice|lmt|doNotSellMyPersonalInformation|screenSaverAd|homePromotion|livePromotion|contentRecommendation|thirdPartyCookie|hbbTvDnt|hbbTvDeviceId|hbbTV|bleAdvertisingOnOff|homeSenseAbsence)\s+(on|off)\s*$/);
      if (controlChange) {
        const [key, value] = controlChange.slice(1);
        settings[key] = key === "thirdPartyCookie" ? (value === "on" ? "onByUser" : "offByUser") : value;
        return { returnValue: true, stdoutString: "setting updated" };
      }
      return {
        returnValue: true,
        stdoutString: JSON.stringify({ settings, agreements: { eulaList }, voiceProcesses: ["voice-ui"], apps: [{ id: "com.example.video", title: "Example Video", version: "1.0" }], diagnostics: { services: [], autoUpload: false, faultLogUpload: false, debugLogUpload: false } })
      };
    }
    return { returnValue: true };
  }
  window.PalmServiceBridge = class {
    call(uri, payload) {
      const result = answer(uri, payload);
      queueMicrotask(() => this.onservicecallback && this.onservicecallback(JSON.stringify(result)));
    }
    cancel() {}
  };
})();`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateChild(childProcess) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  const exited = new Promise((resolve) => childProcess.once("exit", resolve));
  childProcess.kill("SIGTERM");
  const stopped = await Promise.race([exited.then(() => true), wait(2000).then(() => false)]);
  if (stopped || childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  const forceExit = new Promise((resolve) => childProcess.once("exit", resolve));
  childProcess.kill("SIGKILL");
  await forceExit;
}

function requestJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} from ${url}`));
          return;
        }
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

function startServer() {
  const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const target = path.resolve(APP_ROOT, `.${relative}`);
    if (target !== APP_ROOT && !target.startsWith(`${APP_ROOT}${path.sep}`)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(target, (error, content) => {
      if (error) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, { "content-type": `${mime[path.extname(target)] || "application/octet-stream"}; charset=utf-8`, "cache-control": "no-store" });
      response.end(content);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function waitFor(predicate, label, timeoutMs = 10000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

async function launchHeadless(origin, userDataDir) {
  const version = spawnSync(CHROMIUM, ["--version"], { encoding: "utf8" });
  if (version.error || version.status !== 0) throw new Error(`Cannot run Chromium (${CHROMIUM}): ${version.error ? version.error.message : version.stderr}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  const childProcess = spawn(CHROMIUM, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--disable-background-networking", "--disable-component-update", "--disable-default-apps",
    "--no-first-run", "--no-default-browser-check", "--window-size=1920,1080", "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`, "about:blank"
  ], { stdio: "ignore" });
  let socket;
  try {
    const activePort = path.join(userDataDir, "DevToolsActivePort");
    await waitFor(() => fs.existsSync(activePort), "Chromium DevTools endpoint");
    const port = Number(fs.readFileSync(activePort, "utf8").split("\n")[0]);
    const targets = await requestJson(`http://127.0.0.1:${port}/json/list`);
    const target = targets.find((item) => item.type === "page");
    if (!target) throw new Error("Chromium did not create an initial page target");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message));
      else handlers.resolve(message.result || {});
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Browser evaluation failed");
      return response.result && response.result.value;
    };
    await command("Page.enable");
    await command("Runtime.enable");
    await command("Page.addScriptToEvaluateOnNewDocument", { source: serviceFixture });
    await command("Page.navigate", { url: `${origin}/index.html?scenario=success` });
    await waitFor(async () => (await evaluate("document.readyState")) === "complete", "app page load");
    return {
      process: childProcess,
      command,
      evaluate,
      async press(key) {
        const keys = {
          ArrowDown: ["ArrowDown", 40], ArrowLeft: ["ArrowLeft", 37], ArrowRight: ["ArrowRight", 39],
          ArrowUp: ["ArrowUp", 38], Enter: ["Enter", 13], Space: [" ", 32], Escape: ["Escape", 27]
        };
        const [keyValue, code] = keys[key];
        const common = { key: keyValue, code: key === "Space" ? "Space" : key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
        await command("Input.dispatchKeyEvent", { type: "keyDown", ...common });
        await command("Input.dispatchKeyEvent", { type: "keyUp", ...common });
        await wait(60);
      },
      async navigate(scenario) {
        await command("Page.navigate", { url: `${origin}/index.html?scenario=${scenario}` });
        await waitFor(async () => (await evaluate("document.readyState")) === "complete", `${scenario} fixture page load`);
      },
      async screenshot(file) {
        const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(result.data, "base64"));
      },
      async stop() {
        socket.close();
        await terminateChild(childProcess);
      }
    };
  } catch (error) {
    if (socket) socket.close();
    await terminateChild(childProcess);
    throw error;
  }
}

test("PrivacyShield works in headless Chromium with a simulated webOS remote and service bridge", async (t) => {
  const { server, origin } = await startServer();
  const userDataDir = fs.mkdtempSync(path.join(SCRATCH_ROOT, "privacyshield-headless-"));
  let browser;
  try {
    browser = await launchHeadless(origin, userDataDir);

    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV information updated", "successful service readback");
    await t.test("known settings navigate, change once, verify, and open the evidence disclosure", async () => {
      const ready = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, checked: input.checked, state: input.closest('.switch').querySelector('.switch-state').textContent })),
        initialFocus: document.activeElement.dataset.view,
        title: document.querySelector('#overview-title').textContent,
        subtitle: document.querySelector('.brand-subtitle').textContent,
        webos: document.querySelector('#webos-version').textContent,
        microphone: document.querySelector('#community-microphone').textContent,
        microphoneSwitch: document.querySelector('#community-microphone-switch').textContent,
        communitySamples: [...document.querySelectorAll('#community-samples li')].map((item) => item.innerText).join(' | '),
        menuStatus: document.querySelector('#menu-reference-status').textContent,
        livePlusPath: [...document.querySelectorAll('#menu-reference-list li')].find((item) => item.innerText.includes('Live Plus'))?.innerText || '',
        visibleCopy: document.body.innerText
      }))()`);
      assert.equal(ready.model, "OLED77C6HUP");
      assert.equal(ready.initialFocus, "overview");
      assert.equal(ready.title, "TV privacy settings");
      assert.equal(ready.subtitle, "TV privacy settings and activity");
      assert.match(ready.webos, /webOS 26.*SDK 11\.2\.0/);
      assert.match(ready.microphone, /C6H variant not covered/);
      assert.match(ready.microphone, /state remains unknown/i);
      assert.match(ready.microphoneSwitch, /no C6-specific report/i);
      assert.match(ready.communitySamples, /OLED55C61LA/);
      assert.match(ready.communitySamples, /43\.21\.79/);
      assert.match(ready.menuStatus, /webOS 26 · 7 documented menu locations/);
      assert.match(ready.livePlusPath, /System > Additional Settings > Live Plus/);
      assert.doesNotMatch(ready.visibleCopy, /what the TV can show us|your TV\. your settings|root-only|process snapshot|developer app/i);
      assert.deepEqual(ready.states.map((item) => item.disabled), Array(15).fill(false));
      assert.deepEqual(ready.states.map((item) => item.state), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Off", "On", "On", "On", "Off", "On"]);
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.applicationManager' && call.method === 'launch').length"), 0, "the LG agreement screen must not open until selected");
      const publicFindings = await browser.evaluate("[...document.querySelectorAll('#community-control-findings li')].map((item) => item.innerText).join(' | ')");
      assert.match(publicFindings, /Glasshouse · Live Plus \/ ACR switch/);
      assert.match(publicFindings, /option\.livePlus/);
      assert.match(publicFindings, /CleanYourTV · Ad and telemetry services/);
      assert.match(publicFindings, /PrivacyShield does not stop them/);
      assert.match(publicFindings, /Glasshouse · Built-in microphone switch/);
      assert.match(publicFindings, /own-your-glass · Physical and remote microphone paths/);
      assert.match(publicFindings, /webOS Unclutter · Ad and telemetry network observations/);
      assert.match(publicFindings, /KallistoX C1 capture · Network resolver behavior/);
      assert.match(publicFindings, /LG TV Blocklist · DNS\/packet audit and blocking tiers/);
      assert.match(publicFindings, /Life's Good Without Spying · Rooted privacy and voice controls/);
      assert.match(publicFindings, /webos-debloat · Promotions, sports alerts, recommendations, and Live Plus/);
      assert.match(publicFindings, /webOS Homebrew documentation · Local phone and remote control API/);
      assert.match(publicFindings, /network\.allowMobileDeviceAccess/);
      assert.match(publicFindings, /Looking Glass investigation · ACR configuration and local service state/);
      assert.match(publicFindings, /does not show a packet capture or payload analysis/);
      assert.match(publicFindings, /TV ACR Firmware Research · LG ACR service and startup path/);
      assert.match(publicFindings, /does not show that ACR was active on a specific household TV/);
      assert.match(publicFindings, /tv-home · C5 privacy, agreements, logs, and services/);
      assert.match(publicFindings, /firmware-update hosts/);
      const unassignedSamples = await browser.evaluate("[...document.querySelectorAll('#community-unassigned-samples li')].map((item) => item.innerText).join(' | ')");
      assert.match(unassignedSamples, /Two models; codes not published · CleanYourTV/);
      assert.match(unassignedSamples, /2026 LG OLED; model code not published/);
      assert.match(unassignedSamples, /2021 LG webOS TV; exact model code not listed/);
      assert.match(unassignedSamples, /LG webOS secured EPK; TV model not published/);
      assert.match(unassignedSamples, /firmware analysis/);
      assert.match(unassignedSamples, /intentionally unassigned/i);
      assert.doesNotMatch(unassignedSamples, /49LF632V|OLED65C8PUA|OLED65CSPSA/, "known model codes outside B/C/G must not appear as unassigned samples");
      assert.match(publicFindings, /IMC 2024 ACR study · ACR network behavior/);

      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.closest('.view').id"), "view-overview");
      await browser.press("Enter");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-controls");
      assert.equal(await browser.evaluate("document.activeElement.id"), "privacy-preset");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent === 'Recommended privacy settings applied.'")), "privacy preset readback");
      const preset = await browser.evaluate(`(() => ({
        settings: { ...window.__privacyShieldFixture.settings },
        writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.deepEqual(preset.settings, {
        livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off",
        lmt: "on", doNotSellMyPersonalInformation: "off", screenSaverAd: "off",
        homePromotion: "off", livePromotion: "off", contentRecommendation: "off",
        hbbTvDnt: "on", hbbTvDeviceId: "off", thirdPartyCookie: "onByUser",
        hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
      });
      assert.equal(preset.writes, 10, "the preset writes only its ten reviewed SettingsService controls");
      assert.match(preset.status, /recommended privacy settings applied/i);

      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent")) === "On", "verified Live Plus toggle");
      const write = await browser.evaluate(`(() => ({
        value: window.__privacyShieldFixture.settings.livePlus,
        writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.equal(write.value, "on");
      assert.equal(write.writes, 11, "one OK press must produce one settings write");
      assert.match(write.status, /Live Plus \(ACR\) turned on/i);
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      const capture = process.env.PRIVACYSHIELD_CAPTURE_PATH;
      if (capture) await browser.screenshot(capture);

      const toggleAgain = async (key, expected) => {
        const before = await browser.evaluate(`window.__privacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length`);
        await browser.press("Enter");
        await waitFor(async () => (await browser.evaluate(`(() => {
          const calls = window.__privacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length;
          return window.PrivacyShieldModel.normalizeToggle(window.__privacyShieldFixture.settings['${key}']) === '${expected}' && calls > ${before};
        })()`)), `${key} toggles to ${expected}`);
        const state = await browser.evaluate(`(() => { const input = document.querySelector('[data-setting=${key}]'); return { value: window.PrivacyShieldModel.normalizeToggle(window.__privacyShieldFixture.settings['${key}']), raw: window.__privacyShieldFixture.settings['${key}'], disabled: input.disabled, focus: document.activeElement.dataset.setting }; })()`);
        assert.equal(state.value, expected);
        if (key === "thirdPartyCookie") assert.equal(state.raw, expected === "on" ? "onByUser" : "offByUser");
        assert.equal(state.disabled, false);
        assert.equal(state.focus, key, `${key} should keep remote focus after its write completes`);
      };

      await toggleAgain("livePlus", "off");
      const successiveToggles = [
        ["voiceLongDistance", "on", "off"],
        ["turnOnByVoice", "on", "off"],
        ["lmt", "off", "on"],
        ["doNotSellMyPersonalInformation", "on", "off"],
        ["screenSaverAd", "on", "off"],
        ["homePromotion", "on", "off"],
        ["livePromotion", "on", "off"],
        ["contentRecommendation", "on", "off"],
        ["hbbTvDnt", "off", "on"],
        ["hbbTvDeviceId", "on", "off"],
        ["thirdPartyCookie", "off", "on"],
        ["hbbTV", "off", "on"],
        ["bleAdvertisingOnOff", "on", "off"],
        ["homeSenseAbsence", "off", "on"]
      ];
      for (const [key, first, second] of successiveToggles) {
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), key);
        await toggleAgain(key, first);
        await toggleAgain(key, second);
      }
      assert.deepEqual(
        await browser.evaluate("window.__privacyShieldFixture.settings"),
        {
          livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off",
          lmt: "on", doNotSellMyPersonalInformation: "off", screenSaverAd: "off",
          homePromotion: "off", livePromotion: "off", contentRecommendation: "off",
          hbbTvDnt: "on", hbbTvDeviceId: "off", thirdPartyCookie: "onByUser",
          hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
        },
      );
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-agreements");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "agreement-manager-button");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#agreement-action-status').textContent")) === "Make your choices in LG User Agreements, then select Agree to save.", "native agreement action status");
      const agreementLaunch = await browser.evaluate(`window.__privacyShieldFixture.calls.find((call) => call.service === 'luna://com.webos.applicationManager' && call.method === 'launch')`);
      assert.deepEqual(agreementLaunch.parameters, { id: "com.webos.app.firstuse-overlay", params: { target: "eula", context: "all" } });
      await browser.evaluate(`(() => {
        window.__privacyShieldFixture.eulaList.find((item) => item.id === 'S_TAG').accepted = false;
        document.dispatchEvent(new Event('visibilitychange'));
      })()`);
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-agreement=S_TAG] .status-pill').textContent")) === "Not accepted", "agreement status refresh after return");
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && /eula/i.test(JSON.stringify(call.parameters))).length"), 0, "PrivacyShield must leave agreement writes to LG's consent screen");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-evidence");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "prepare-compatibility-report");
      assert.match(await browser.evaluate("document.querySelector('#compatibility-summary').textContent"), /15 settings are mapped for this exact model, SDK, and firmware.*checks are recorded for 3\./i);
      await browser.evaluate(`Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("clipboard blocked"); } } })`);
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-output').hidden")) === false, "local compatibility report output");
      const report = await browser.evaluate(`(() => ({
        status: document.querySelector('#compatibility-report-status').textContent,
        json: document.querySelector('#compatibility-report-output').value
      }))()`);
      assert.equal(report.status, "Scan the codes with a phone to copy the report and open its form. Nothing was uploaded.");
      const reportJson = JSON.parse(report.json);
      assert.equal(reportJson.compatibility.profileId, "lg-oled77c6hup-webos26-43.21.79");
      assert.deepEqual(Object.keys(reportJson.controlReads).length, 15);
      assert.doesNotMatch(report.json, /eulaList|serialNumber|macAddress|ssid|192\.168\.|"livePlus":\s*"on"/i);
      const reportCapture = process.env.PRIVACYSHIELD_REPORT_CAPTURE_PATH;
      if (reportCapture) await browser.screenshot(reportCapture);
      await browser.evaluate(`Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__privacyShieldFixture.copiedReport = value; } } })`);
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-status').textContent")) === "Report copied to this TV's clipboard. Scan both codes with a phone to carry it to the form; nothing was uploaded.", "explicit compatibility report copy");
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.copiedReport === document.querySelector('#compatibility-report-output').value"), true);
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "compatibility-report-output");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.tagName"), "SUMMARY");
      await browser.press("Enter");
      assert.equal(await browser.evaluate("document.querySelector('.evidence-method').open"), true);
      await browser.press("Escape");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview");

    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV information updated", "root snapshot fallback");
    await t.test("the Homebrew bridge supplies settings and performs verified writes when direct reads are denied", async () => {
      const fallback = await browser.evaluate(`(() => ({
        settings: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, value: input.closest('.switch').querySelector('.switch-state').textContent })),
        consent: document.querySelector('[data-agreement="S_ADG"] .status-pill').textContent,
        processEvidence: document.querySelector('#evidence-processes').textContent,
        appEvidence: document.querySelector('#evidence-apps').textContent,
        directFailures: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.method === 'getSystemSettings').length
      }))()`);
      assert.deepEqual(fallback.settings.map((item) => item.value), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Off", "On", "On", "On", "Off", "On"]);
      assert.deepEqual(fallback.settings.map((item) => item.disabled), Array(15).fill(false));
      assert.equal(fallback.consent, "Accepted");
      assert.match(fallback.processEvidence, /voice-ui/);
      assert.match(fallback.appEvidence, /1 Homebrew app/);
      assert.ok(fallback.directFailures >= 3, "the private service fallback must actually be exercised");

      await browser.press("ArrowRight");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "privacy-preset");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "root-bridge setting readback");
      const bridgeWrite = await browser.evaluate(`(() => ({
        value: window.__privacyShieldFixture.settings.livePlus,
        status: document.querySelector('#control-status').textContent,
        directWriteAttempts: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.method === 'setSystemSettings').length,
        rootCalls: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec'),
      }))()`);
      assert.equal(bridgeWrite.value, "off");
      assert.equal(bridgeWrite.directWriteAttempts, 1);
      assert.equal(bridgeWrite.rootCalls.filter((call) => /device_control\.py/.test(call.parameters.command)).length, 1);
      assert.ok(bridgeWrite.rootCalls.length >= 3, "snapshot, write, and readback must all cross the HBC bridge");
      assert.match(bridgeWrite.status, /Live Plus \(ACR\) turned off/i);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.evaluate(`localStorage.setItem("privacyshield.saved-controls.v1", JSON.stringify({ settings: { livePlus: "off" } }))`);
    await browser.navigate("denied");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "Some TV information unavailable", "denied service state");
    await t.test("denied settings stay locked but remain navigable and explain why", async () => {
      const before = await browser.evaluate(`(() => ({
        values: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex, ariaDisabled: input.closest('.switch').getAttribute('aria-disabled'), detail: document.querySelector('#' + input.dataset.setting + '-meta').textContent })),
        note: document.querySelector('#write-access-note span').textContent,
        restoreDisabled: document.querySelector('#restore-button').disabled,
        placeholders: document.body.innerText.match(/idfk|not available|unavailable|unknown/ig) || []
      }))()`);
      assert.deepEqual(before.values.map((item) => item.disabled), Array(15).fill(true));
      assert.deepEqual(before.values.map((item) => item.state), Array(15).fill("Can't read"));
      assert.deepEqual(before.values.map((item) => item.tabIndex), Array(15).fill(0));
      assert.deepEqual(before.values.map((item) => item.ariaDisabled), Array(15).fill("true"));
      assert.ok(before.values.every((item) => /could not be read|locked/i.test(item.detail)));
      assert.match(before.note, /Homebrew Channel did not allow local TV checks/i);
      assert.equal(before.restoreDisabled, true, "restore must remain disabled when current values cannot be read");
      assert.ok(!before.placeholders.some((text) => /idfk|unknown/i.test(text)), `unexpected vague status text: ${before.placeholders.join(", ")}`);

      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-controls");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.classList.contains('switch')"), true);
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "livePlus");
      await browser.press("Enter");
      const blocked = await browser.evaluate(`(() => ({
        status: document.querySelector('#control-status').textContent,
        toast: document.querySelector('#toast').textContent,
        value: window.__privacyShieldFixture.settings.livePlus,
        writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length
      }))()`);
      assert.match(blocked.status, /locked because the current value could not be read/i);
      assert.match(blocked.toast, /locked because the current value could not be read/i);
      assert.equal(blocked.value, "on");
      assert.equal(blocked.writes, 0);
      await browser.evaluate(`(() => { const button = document.querySelector('#restore-button'); button.disabled = false; button.click(); })()`);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Current TV values could not be read. Refresh before restoring settings.", "restore guard on unreadable state");
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || \"\"))).length"), 0, "unreadable restore must not reach any writer");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "voiceLongDistance");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "turnOnByVoice");
      for (const key of ["lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence"]) {
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), key);
      }
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-setting]:not(:disabled)').length"), 0);
    });

    await browser.evaluate(`localStorage.setItem("privacyshield.saved-controls.v1", JSON.stringify({ settings: { livePlus: "on" } }))`);
    await browser.navigate("unmapped");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV information updated", "unmapped device identity");
    await t.test("unmapped models remain read-only and can produce a local sanitized report", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        profile: document.querySelector('#compatibility-status').textContent,
        detail: document.querySelector('#compatibility-summary').textContent,
        family: document.querySelector('#community-cohort').textContent,
        menuStatus: document.querySelector('#menu-reference-status').textContent,
        presetDisabled: document.querySelector('#privacy-preset').disabled,
        restoreDisabled: document.querySelector('#restore-button').disabled,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex })),
        writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
      }))()`);
      assert.equal(status.model, "OLED65B5HNA");
      assert.equal(status.profile, "Not mapped");
      assert.match(status.detail, /read-only/i);
      assert.match(status.family, /B5 · 2025 model family/);
      assert.match(status.family, /launch platform webOS 25/);
      assert.match(status.menuStatus, /webOS 25/);
      assert.equal(status.presetDisabled, true);
      assert.equal(status.restoreDisabled, true);
      assert.deepEqual(status.states.map((item) => item.disabled), Array(15).fill(true));
      assert.deepEqual(status.states.map((item) => item.state), Array(15).fill("Not mapped"));
      assert.deepEqual(status.states.map((item) => item.tabIndex), Array(15).fill(0));
      assert.equal(status.writerCalls, 0);

      await browser.press("ArrowRight");
      await browser.press("ArrowRight");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-evidence");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "prepare-compatibility-report");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-output').hidden")) === false, "unmapped compatibility report output");
      const qr = await browser.evaluate(`(() => ({
        hidden: document.querySelector('#compatibility-report-qr').hidden,
        src: document.querySelector('#compatibility-report-qr').src,
        formHidden: document.querySelector('#compatibility-report-form-qr').hidden,
        formSrc: document.querySelector('#compatibility-report-form-qr').src,
        alt: document.querySelector('#compatibility-report-qr').alt,
        shareVisible: !document.querySelector('#compatibility-report-share').hidden,
        reportBottom: document.querySelector('#compatibility-report-qr').getBoundingClientRect().bottom,
        formBottom: document.querySelector('#compatibility-report-form-qr').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.footer').getBoundingClientRect().top
      }))()`);
      assert.equal(qr.hidden, false);
      assert.equal(qr.formHidden, false);
      assert.equal(qr.shareVisible, true);
      assert.ok(qr.reportBottom <= qr.footerTop, "the full report QR must remain above the fixed footer");
      assert.ok(qr.formBottom <= qr.footerTop, "the report form QR must remain above the fixed footer");
      assert.match(qr.src, /^data:image\/gif;base64,/);
      assert.match(qr.formSrc, /^data:image\/gif;base64,/);
      assert.match(qr.alt, /sanitized compatibility report/i);
      const generated = await browser.evaluate("document.querySelector('#compatibility-report-output').value");
      const qrDecoder = spawnSync("zbarimg", ["--version"], { encoding: "utf8" });
      if (!qrDecoder.error && qrDecoder.status === 0) {
        for (const [source, expected, filename] of [
          [qr.src, generated, "compatibility-report.gif"],
          [qr.formSrc, "https://github.com/snapetech-org/PrivacyShield/issues/new?template=compatibility-report.yml", "compatibility-form.gif"]
        ]) {
          const qrPath = path.join(userDataDir, filename);
          fs.writeFileSync(qrPath, Buffer.from(source.split(",", 2)[1], "base64"));
          const decodedQr = spawnSync("zbarimg", ["--quiet", "--raw", qrPath], { encoding: "utf8" });
          assert.equal(decodedQr.status, 0, decodedQr.stderr);
          assert.equal(decodedQr.stdout.trimEnd(), expected);
        }
      }
      const json = JSON.parse(generated);
      assert.equal(json.device.model, "OLED65B5HNA");
      assert.equal(json.compatibility.profileId, null);
      assert.equal(json.compatibility.evidenceLevel, "unmapped");
      assert.equal(json.compatibility.mappedControlCount, 0);
      assert.deepEqual(Object.keys(json.controlReads).length, 15);
      assert.ok(Object.values(json.controlReads).every(Boolean));
      assert.doesNotMatch(generated, /eulaList|serialNumber|macAddress|ssid|192\.168\.|"livePlus":\s*"on"/i);
      assert.match(await browser.evaluate("document.querySelector('#compatibility-report-status').textContent"), /nothing was uploaded/i);
    });

    for (const [scenario, model, family, platform, sample] of [
      ["c1", "OLED55C17LB", /C1 · 2021 model family.*launch platform webOS 6\.x/, "webOS 6\\.x", "OLED55C17LB"],
      ["c5", "OLED65C54LA", /C5 · 2025 model family.*launch platform webOS 25/, "webOS 26", "OLED65C54LA"],
      ["g2", "OLED65G26LA", /G2 · 2022 model family.*launch platform webOS 22/, "webOS 25", "OLED65G26LA"],
      ["g1", "OLED55G19LA", /G1 · 2021 model family.*launch platform webOS 6\.x/, "webOS 6\\.x", "OLED55G19LA"],
      ["g4", "OLED65G45LW", /G4 · 2024 model family.*launch platform webOS 24/, "webOS 24", "Life's Good Without Spying"]
    ]) {
      await browser.navigate(scenario);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV information updated", `${scenario} community model evidence`);
      await t.test(`${model} shows separate model and platform evidence while remaining read-only`, async () => {
        const status = await browser.evaluate(`(() => ({
          model: document.querySelector('#model-name').textContent,
          version: document.querySelector('#webos-version').textContent,
          family: document.querySelector('#community-cohort').textContent,
          microphone: document.querySelector('#community-microphone').textContent,
          microphoneSwitch: document.querySelector('#community-microphone-switch').textContent,
          samples: [...document.querySelectorAll('#community-samples li')].map((item) => item.innerText).join(' | '),
          menuStatus: document.querySelector('#menu-reference-status').textContent,
          menu: [...document.querySelectorAll('#menu-reference-list li')].map((item) => item.innerText).join(' | '),
          profile: document.querySelector('#compatibility-status').textContent,
          controlsLocked: [...document.querySelectorAll('[data-setting]')].every((input) => input.disabled),
          presetDisabled: document.querySelector('#privacy-preset').disabled,
          restoreDisabled: document.querySelector('#restore-button').disabled,
          writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
        }))()`);
        assert.equal(status.model, model);
        assert.match(status.version, new RegExp(platform));
        assert.match(status.family, family);
        const microphoneEvidence = scenario === "c5"
          ? /Conflicting regional sources/
          : scenario === "g1"
            ? /Listed as absent by the cited manufacturer source/
            : scenario === "g4"
              ? /Listed by the cited manufacturer source/
              : /Built-in microphone: Unknown/;
        assert.match(status.microphone, microphoneEvidence);
        if (scenario === "c5") {
          assert.match(status.microphoneSwitch, /Physical microphone switch: reported for C5, 10\.3\.1/);
          assert.match(status.microphoneSwitch, /voiceinput\/factory\/getMicSwitchStatus/);
          assert.match(status.microphoneSwitch, /do not establish a physical switch.*C6\/C6H/i);
          assert.match(status.samples, /OLED65C54LA.*owner report/);
          assert.match(status.family, /Public entries: 5 \(3 Glasshouse, 1 CleanYourTV, 1 tv-home\)/);
          assert.match(status.samples, /LG OLED C5 \(2025\); exact model code not published · tv-home \(owner report\)/);
          assert.match(status.samples, /seven days of TV logs/);
        } else if (scenario === "c1") {
          assert.match(status.microphoneSwitch, /no C1-specific report/i);
          assert.match(status.family, /Public entries: 4 \(2 Glasshouse, 1 webOS Unclutter, 1 KallistoX C1 capture\)/);
          assert.match(status.samples, /European C1; exact model code not listed/);
          assert.match(status.samples, /KallistoX C1 capture.*network capture/);
        } else {
          assert.match(status.microphoneSwitch, /no .*?-specific report/i);
        }
        assert.match(status.samples, new RegExp(sample));
        assert.match(status.menuStatus, new RegExp(platform));
        assert.equal(status.profile, "Not mapped");
        assert.equal(status.controlsLocked, true);
        assert.equal(status.presetDisabled, true);
        assert.equal(status.restoreDisabled, true);
        assert.equal(status.writerCalls, 0);
        if (scenario === "g2") {
          assert.match(status.samples, /maintainer test/);
          assert.match(status.version, /firmware 33\.23\.05/);
        }
        if (scenario === "g1") {
          assert.match(status.samples, /03\.53\.45/);
          assert.match(status.samples, /LG TV Blocklist.*network capture/);
          assert.match(status.menu, /Advertisement \(legacy setting\)/);
          assert.equal(status.writerCalls, 0);
        }
        if (scenario === "g4") {
          assert.match(status.samples, /OLED65G45LW \(EU\).*Life's Good Without Spying.*maintainer test/);
          assert.match(status.samples, /23\.23\.30/);
        }
      });
    }

    const platformNames = ["6.x", "22", "23", "24", "25", "26"];
    for (const series of ["B", "C", "G"]) {
      for (let generation = 1; generation <= 6; generation += 1) {
        const scenario = `matrix-${series}${generation}`;
        const model = `OLED65${series}${generation}SIM`;
        await browser.navigate(scenario);
        await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV information updated", `${scenario} model fixture`);
        const status = await browser.evaluate(`(() => ({
          model: document.querySelector('#model-name').textContent,
          family: document.querySelector('#community-cohort').textContent,
          version: document.querySelector('#webos-version').textContent,
          profile: document.querySelector('#compatibility-status').textContent,
          switchesLocked: [...document.querySelectorAll('[data-setting]')].every((input) => input.disabled),
          presetDisabled: document.querySelector('#privacy-preset').disabled,
          writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
        }))()`);
        assert.equal(status.model, model);
        assert.match(status.family, new RegExp(`${series}${generation} · ${2020 + generation} model family`));
        assert.match(status.family, new RegExp(`launch platform webOS ${platformNames[generation - 1]}`));
        assert.match(status.version, new RegExp(`webOS ${platformNames[generation - 1]}`));
        assert.equal(status.profile, "Not mapped");
        assert.equal(status.switchesLocked, true);
        assert.equal(status.presetDisabled, true);
        assert.equal(status.writerCalls, 0);
      }
    }
  } finally {
    if (browser) await browser.stop();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    try { fs.rmdirSync(SCRATCH_ROOT); } catch (_) { /* preserve shared or non-empty task scratch */ }
  }
});

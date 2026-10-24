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
  const directDenied = scenario !== "success";
  const rootDenied = scenario === "denied";
  const settings = { livePlus: true, voiceLongDistance: true, turnOnByVoice: true };
  const eulaList = [
    { id: "S_ADG", accepted: true }, { id: "S_VNG", accepted: true },
    { id: "S_TAG", accepted: true }, { id: "S_MKT", accepted: true },
    { id: "S_DPA", accepted: false }, { id: "S_PRG", accepted: true },
    { id: "S_SVC", accepted: true }
  ];
  const calls = [];
  window.__privacyShieldFixture = { scenario, settings, calls };
  window.PalmSystem = {
    deviceInfo: JSON.stringify({ modelName: "LG C6 (headless fixture)", platformVersion: "11.2.0", platformVersionMajor: 11, platformVersionMinor: 2 }),
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
    if (service === "luna://com.webos.service.tv.systemproperty" && method === "getSystemInfo") {
      return { returnValue: true, modelName: "LG C6 (headless fixture)", sdkVersion: "11.2.0", firmwareVersion: "43.21.79" };
    }
    if (service === "luna://com.palm.connectionmanager" && method === "getStatus") {
      return { returnValue: true, isInternetConnectionAvailable: true };
    }
    if (service === "luna://org.webosbrew.hbchannel.service" && method === "exec") {
      if (rootDenied) return { returnValue: false, errorText: 'Denied method call "exec" for category "/"' };
      const controlChange = (parameters.command || "").match(/\s(livePlus|voiceLongDistance|turnOnByVoice)\s+(on|off)\s*$/);
      if (controlChange) {
        settings[controlChange[1]] = controlChange[2];
        return { returnValue: true, stdoutString: "setting updated" };
      }
      return {
        returnValue: true,
        stdoutString: JSON.stringify({ settings, agreements: { eulaList }, voiceProcesses: ["voice-ui"], apps: [{ id: "com.example.video", title: "Example Video", version: "1.0" }], diagnostics: { services: [], autoUpload: false } })
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
      close() { socket.close(); }
    };
  } catch (error) {
    if (socket) socket.close();
    childProcess.kill("SIGTERM");
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
        visibleCopy: document.body.innerText
      }))()`);
      assert.equal(ready.model, "LG C6 (headless fixture)");
      assert.equal(ready.initialFocus, "overview");
      assert.equal(ready.title, "TV privacy settings");
      assert.equal(ready.subtitle, "TV privacy settings and activity");
      assert.doesNotMatch(ready.visibleCopy, /what the TV can show us|your TV\. your settings|root-only|process snapshot|developer app/i);
      assert.deepEqual(ready.states.map((item) => item.disabled), [false, false, false]);
      assert.deepEqual(ready.states.map((item) => item.state), ["On", "On", "On"]);

      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.closest('.view').id"), "view-overview");
      await browser.press("Enter");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-controls");
      assert.equal(await browser.evaluate("document.activeElement.id"), "privacy-preset");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelectorAll('.switch-state').length === 3 && [...document.querySelectorAll('.switch-state')].every((item) => item.textContent === 'Off')")), "privacy preset readback");
      const preset = await browser.evaluate(`(() => ({
        settings: { ...window.__privacyShieldFixture.settings },
        writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.deepEqual(preset.settings, { livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off" });
      assert.equal(preset.writes, 3, "the preset must write each of the three controls once");
      assert.match(preset.status, /all three settings are off/i);

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
      assert.equal(write.writes, 4, "one OK press must produce one settings write");
      assert.match(write.status, /Live Plus turned on/i);
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      const capture = process.env.PRIVACYSHIELD_CAPTURE_PATH;
      if (capture) await browser.screenshot(capture);

      const toggleAgain = async (key, expected) => {
        await browser.press("Enter");
        await waitFor(async () => (await browser.evaluate(`document.querySelector('[data-setting=${key}]').closest('.switch').querySelector('.switch-state').textContent`)) === (expected === "on" ? "On" : "Off"), `${key} toggles to ${expected}`);
        const state = await browser.evaluate(`(() => { const input = document.querySelector('[data-setting=${key}]'); return { value: window.__privacyShieldFixture.settings.${key}, disabled: input.disabled, focus: document.activeElement.dataset.setting }; })()`);
        assert.equal(state.value, expected);
        assert.equal(state.disabled, false);
        assert.equal(state.focus, key, `${key} should keep remote focus after its write completes`);
      };

      await toggleAgain("livePlus", "off");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "voiceLongDistance");
      await toggleAgain("voiceLongDistance", "on");
      await toggleAgain("voiceLongDistance", "off");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "turnOnByVoice");
      await toggleAgain("turnOnByVoice", "on");
      await toggleAgain("turnOnByVoice", "off");
      assert.deepEqual(
        await browser.evaluate("window.__privacyShieldFixture.settings"),
        { livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off" },
      );
      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "voiceLongDistance");
      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.tagName"), "BUTTON");
      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.dataset.view"), "controls");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-agreements");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-evidence");
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
      assert.deepEqual(fallback.settings.map((item) => item.value), ["On", "On", "On"]);
      assert.deepEqual(fallback.settings.map((item) => item.disabled), [false, false, false]);
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
      assert.match(bridgeWrite.status, /Live Plus turned off/i);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("denied");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "Some TV information unavailable", "denied service state");
    await t.test("denied settings stay locked but remain navigable and explain why", async () => {
      const before = await browser.evaluate(`(() => ({
        values: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex, ariaDisabled: input.closest('.switch').getAttribute('aria-disabled'), detail: document.querySelector('#' + input.dataset.setting + '-meta').textContent })),
        note: document.querySelector('#write-access-note span').textContent,
        placeholders: document.body.innerText.match(/idfk|not available|unavailable|unknown/ig) || []
      }))()`);
      assert.deepEqual(before.values.map((item) => item.disabled), [true, true, true]);
      assert.deepEqual(before.values.map((item) => item.state), ["Can't read", "Can't read", "Can't read"]);
      assert.deepEqual(before.values.map((item) => item.tabIndex), [0, 0, 0]);
      assert.deepEqual(before.values.map((item) => item.ariaDisabled), ["true", "true", "true"]);
      assert.ok(before.values.every((item) => /could not be read|locked/i.test(item.detail)));
      assert.match(before.note, /Homebrew Channel access was denied/i);
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
      assert.equal(blocked.value, true);
      assert.equal(blocked.writes, 0);
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "voiceLongDistance");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "turnOnByVoice");
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-setting]:not(:disabled)').length"), 0);
    });
  } finally {
    if (browser) browser.close();
    if (browser && browser.process) {
      try { browser.process.kill("SIGTERM"); } catch (_) { /* process may have exited */ }
    }
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { recursive: true, force: true });
    try { fs.rmdirSync(SCRATCH_ROOT); } catch (_) { /* preserve shared or non-empty task scratch */ }
  }
});

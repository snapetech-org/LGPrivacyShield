const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const test = require("node:test");

const APP_ROOT = path.resolve(process.env.LGPRIVACYSHIELD_APP_ROOT || path.join(__dirname, "../webos-app"));
const SCRATCH_ROOT = process.env.LGPRIVACYSHIELD_HEADLESS_DIR || os.tmpdir();
fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
const CHROMIUM = process.env.CHROMIUM_BIN || "chromium";
const C6_FIRMWARE_FIXTURE = require("./fixtures/oled77c6hup-firmware-key-map.json");
const C6_FIRMWARE_SETTINGS_MAP = (() => {
  const settings = {};
  for (const { category, keys } of C6_FIRMWARE_FIXTURE.categoryKeysMap) {
    for (const key of keys) settings[key] = category;
  }
  return { available: true, settings, ambiguous: [] };
})();

test("compatibility issue form accepts the QR prefill with no other required fields", () => {
  const issueForm = fs.readFileSync(path.join(__dirname, "../.github/ISSUE_TEMPLATE/compatibility-report.yml"), "utf8");
  const reportFieldStart = issueForm.indexOf("  - type: textarea\n    id: report\n");
  assert.notEqual(reportFieldStart, -1, "the issue form needs a textarea with id: report");
  const nextFieldStart = issueForm.indexOf("\n  - type:", reportFieldStart + 1);
  const reportField = issueForm.slice(reportFieldStart, nextFieldStart === -1 ? issueForm.length : nextFieldStart);
  assert.match(reportField, /^      required: true$/m, "the prefilled report field must be required");
  assert.equal((issueForm.match(/^      required: true\s*$/gm) || []).length, 1, "all other issue form fields must be optional");
});

const serviceFixture = String.raw`(() => {
  const scenario = new URLSearchParams(location.search).get("scenario") || "success";
  const b5RootFallback = scenario === "b5-root-fallback";
  const g5RootFallback = scenario === "g5-root-fallback";
  const directReadDenied = scenario === "root-fallback" || scenario === "denied" || b5RootFallback || g5RootFallback;
  const directWriteDenied = directReadDenied || scenario === "write-denied";
  const rootSnapshotDenied = scenario === "denied";
  const rootWriterDenied = rootSnapshotDenied || scenario === "write-denied";
  const mismatchWrites = scenario === "readback-mismatch";
  const devices = {
    success: { modelName: "OLED77C6HUP", sdkVersion: "11.2.0", firmwareVersion: "43.21.79", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.207 Safari/537.36 WebAppManager" },
    mismatchedRuntime: { modelName: "OLED65C6SIM", sdkVersion: "11.2.0", firmwareVersion: "SIM-ENGINE-MISMATCH", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    unmapped: { modelName: "OLED65CSPSA", sdkVersion: "10.3.0", firmwareVersion: "33.20.90", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    c1: { modelName: "OLED55C17LB", sdkVersion: "6.5.3", firmwareVersion: "03.53.45", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 WebAppManager" },
    c5: { modelName: "OLED65C54LA", sdkVersion: "11.2.0", firmwareVersion: "43.21.77", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.207 Safari/537.36 WebAppManager" },
    g2: { modelName: "OLED65G26LA", sdkVersion: "10.2.2", firmwareVersion: "33.23.05", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    g1: { modelName: "OLED55G19LA", sdkVersion: "6.5.3", firmwareVersion: "03.53.45", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 WebAppManager" },
    g4: { modelName: "OLED65G45LW", sdkVersion: "9.2.4", firmwareVersion: "23.23.30", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 WebAppManager" },
    b5: { modelName: "OLED55B56LA", sdkVersion: "10.3.1", firmwareVersion: "SIM-UNPUBLISHED", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    "c5-exact-map": { modelName: "OLED77C51LA", sdkVersion: "10.3.1", firmwareVersion: "SIM-UNPUBLISHED", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" },
    g5: { modelName: "OLED65G5WUA", sdkVersion: "10.2.1", firmwareVersion: "SIM-UNPUBLISHED", userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager" }
  };
  const matrixMatch = scenario.match(/^matrix-([BCG])([1-6])(?:-p(6x|22|23|24|25|26))?$/);
  const matrixPlatforms = {
    "6x": { sdk: "6.5.3", chrome: "79" },
    "22": { sdk: "7.4.0", chrome: "87" },
    "23": { sdk: "8.3.0", chrome: "94" },
    "24": { sdk: "9.2.4", chrome: "108" },
    "25": { sdk: "10.3.1", chrome: "120" },
    "26": { sdk: "11.2.0", chrome: "132" }
  };
  const launchPlatform = { "1": "6x", "2": "22", "3": "23", "4": "24", "5": "25", "6": "26" };
  const simulatedPlatform = matrixMatch && (matrixMatch[3] || launchPlatform[matrixMatch[2]]);
  const simulatedFamily = simulatedPlatform && matrixPlatforms[simulatedPlatform];
  const simulatedDevice = simulatedFamily ? {
    modelName: "OLED65" + matrixMatch[1] + matrixMatch[2] + "SIM",
    sdkVersion: simulatedFamily.sdk,
    firmwareVersion: "SIM-" + matrixMatch[2] + "-" + simulatedPlatform,
    userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + simulatedFamily.chrome + ".0.0.0 Safari/537.36 WebAppManager"
  } : null;
  const device = devices[g5RootFallback ? "g5" : b5RootFallback ? "b5" : scenario] || simulatedDevice || devices.success;
  const modelName = device.modelName;
  const firmwareVersion = device.firmwareVersion;
  // Emulate one TV that does not expose a candidate key; other keys in the
  // same category must still remain readable and usable.
  const missingSetting = scenario.startsWith("missing-") ? scenario.slice("missing-".length) : "";
  const unreadableSetting = scenario.startsWith("unreadable-") ? scenario.slice("unreadable-".length) : "";
  const missingSettings = new Set(missingSetting
    ? [missingSetting]
    : scenario === "matrix-B1" || scenario === "matrix-B1-p6x" ? ["screenSaverAd"] : []);
  Object.defineProperty(Navigator.prototype, "userAgent", { configurable: true, get: () => device.userAgent });
  const settings = {
    livePlus: "on", voiceLongDistance: "on", turnOnByVoice: "on",
    lmt: "off", doNotSellMyPersonalInformation: "off", screenSaverAd: "on",
    homePromotion: "on", livePromotion: "on", contentRecommendation: "on",
    aiNudge: "on", aiSettingsNudge: "on",
    hbbTvDnt: "off", hbbTvDeviceId: "on", thirdPartyCookie: "onByUser",
    hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
  };
  if (modelName === "OLED65G5WUA") settings.thirdPartyCookie = "offByUser";
  if (unreadableSetting && Object.prototype.hasOwnProperty.call(settings, unreadableSetting)) {
    settings[unreadableSetting] = "enabled";
  }
  const firmwareSettingsMap = scenario === "success" ? window.__LGPRIVACYSHIELD_C6_FIRMWARE_SETTINGS_MAP__ : null;
  const activeSettingsUri = /Chrome\/79\./.test(device.userAgent)
    ? "luna://com.webos.service.settings"
    : "luna://com.webos.settingsservice";
  const eulaList = [
    { id: "S_ADG", type: "M", title: "Viewing Information Agreement", accepted: true },
    { id: "S_VNG", type: "M", title: "Voice Information", accepted: true },
    { id: "S_TAG", type: "M", title: "Interest-Based Advertisement Agreement", accepted: true },
    { id: "S_MKT", type: "M", title: "Marketing Communications Agreement", accepted: true },
    { id: "S_DPA", type: "M", title: "Data Partners Agreement", accepted: false },
    { id: "S_PRG", type: "M", title: "Privacy Policy", accepted: true },
    { id: "S_SVC", type: "M", title: "Terms of Use", accepted: true }
  ];
  const calls = [];
  window.__lgPrivacyShieldFixture = { scenario, settings, firmwareSettingsMap, calls, eulaList, errors: [], activeSettingsUri };
  window.addEventListener("error", (event) => window.__lgPrivacyShieldFixture.errors.push(event.message));
  window.addEventListener("unhandledrejection", (event) => window.__lgPrivacyShieldFixture.errors.push(String(event.reason)));
  window.PalmSystem = {
    deviceInfo: JSON.stringify({ modelName, platformVersion: device.sdkVersion, platformVersionMajor: Number.parseInt(device.sdkVersion, 10), platformVersionMinor: 0 }),
    stageReady() {},
    platformBack() { window.__lgPrivacyShieldFixture.backCalled = true; }
  };
  function answer(uri, payload) {
    const slash = uri.lastIndexOf("/");
    const service = uri.slice(0, slash);
    const method = uri.slice(slash + 1);
    const parameters = JSON.parse(payload || "{}");
    calls.push({ service, method, parameters });
    if ((service === "luna://com.webos.settingsservice" || service === "luna://com.webos.service.settings")
      && service !== activeSettingsUri) {
      return { returnValue: false, errorText: "SettingsService does not exist" };
    }
    if (service === activeSettingsUri && method === "getSystemSettings") {
      if (directReadDenied) return { returnValue: false, errorText: "SettingsService read permission denied" };
      if (parameters.category) {
        if ((parameters.keys || []).some((key) => missingSettings.has(key))) {
          return { returnValue: false, errorText: "Unknown setting key" };
        }
        const values = {};
        for (const key of parameters.keys || []) {
          if (Object.prototype.hasOwnProperty.call(settings, key)) values[key] = settings[key];
        }
        return { returnValue: true, settings: values };
      }
      return { returnValue: true, settings: { eulaStatus: {}, eulaInfoNetwork: { eulaList } } };
    }
    if (service === activeSettingsUri && method === "setSystemSettings") {
      if (directWriteDenied) return { returnValue: false, errorText: "SettingsService write permission denied" };
      if (!mismatchWrites) {
        for (const [key, value] of Object.entries(parameters.settings || {})) settings[key] = value;
      }
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
      if (rootSnapshotDenied) return { returnValue: false, errorText: 'Denied method call "exec" for category "/"' };
      const controlChange = (parameters.command || "").match(/\s(livePlus|voiceLongDistance|turnOnByVoice|lmt|doNotSellMyPersonalInformation|screenSaverAd|homePromotion|livePromotion|contentRecommendation|thirdPartyCookie|hbbTvDnt|hbbTvDeviceId|hbbTV|bleAdvertisingOnOff|homeSenseAbsence|aiNudge|aiSettingsNudge)\s+(on|off)\s*$/);
      if (controlChange) {
        if (rootWriterDenied) return { returnValue: false, errorText: 'Denied method call "exec" for category "/"' };
        const [key, value] = controlChange.slice(1);
        if (!mismatchWrites) settings[key] = key === "thirdPartyCookie" ? (value === "on" ? "onByUser" : "offByUser") : value;
        return { returnValue: true, stdoutString: "setting updated" };
      }
      const snapshotSettings = Object.fromEntries(Object.entries(settings).filter(([key]) =>
        !missingSettings.has(key) && (!firmwareSettingsMap || Object.prototype.hasOwnProperty.call(firmwareSettingsMap.settings, key))
      ));
      return {
        returnValue: true,
        stdoutString: JSON.stringify({ settings: snapshotSettings, firmwareSettingsMap, agreements: { eulaList } })
      };
    }
    return { returnValue: true };
  }
  window.PalmServiceBridge = class {
    call(uri, payload) {
      const respond = () => {
        const result = answer(uri, payload);
        queueMicrotask(() => this.onservicecallback && this.onservicecallback(JSON.stringify(result)));
      };
      const method = uri.slice(uri.lastIndexOf("/") + 1);
      if (scenario === "slow-write" && method === "setSystemSettings") window.setTimeout(respond, 250);
      else respond();
    }
    cancel() {}
  };
})();`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateChild(childProcess) {
  if (!childProcess || !childProcess.pid) return;
  const isolatedGroup = process.platform !== "win32";
  const groupExists = () => {
    if (!isolatedGroup) return childProcess.exitCode === null && childProcess.signalCode === null;
    try {
      process.kill(-childProcess.pid, 0);
      return true;
    } catch (error) {
      return error.code === "EPERM";
    }
  };
  const signalGroup = (signal) => {
    try {
      if (isolatedGroup) process.kill(-childProcess.pid, signal);
      else if (childProcess.exitCode === null && childProcess.signalCode === null) childProcess.kill(signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  const waitForParent = async (timeoutMs) => {
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) return true;
    const exited = new Promise((resolve) => childProcess.once("exit", resolve));
    return Promise.race([exited.then(() => true), wait(timeoutMs).then(() => false)]);
  };

  signalGroup("SIGTERM");
  await waitForParent(2000);
  const groupStopped = await (async () => {
    const deadline = Date.now() + 2000;
    while (groupExists() && Date.now() < deadline) await wait(25);
    return !groupExists();
  })();
  if (!groupStopped) {
    signalGroup("SIGKILL");
    await waitForParent(2000);
    const deadline = Date.now() + 2000;
    while (groupExists() && Date.now() < deadline) await wait(25);
  }
  if (childProcess.exitCode === null && childProcess.signalCode === null) {
    await new Promise((resolve) => childProcess.once("exit", resolve));
  }
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
  fs.mkdirSync(userDataDir, { recursive: true });
  const chromiumTempDir = fs.mkdtempSync(path.join(SCRATCH_ROOT, "c-"));
  const version = spawnSync(CHROMIUM, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, TMPDIR: chromiumTempDir }
  });
  if (version.error || version.status !== 0) {
    fs.rmSync(chromiumTempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw new Error(`Cannot run Chromium (${CHROMIUM}): ${version.error ? version.error.message : version.stderr}`);
  }
  const chromiumLogPath = path.join(userDataDir, "chromium.stderr.log");
  const chromiumLogFd = fs.openSync(chromiumLogPath, "w");
  const childProcess = spawn(CHROMIUM, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--disable-background-networking", "--disable-component-update", "--disable-default-apps",
    "--no-first-run", "--no-default-browser-check", "--window-size=1920,1080", "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`, "about:blank"
  ], {
    stdio: ["ignore", "ignore", chromiumLogFd],
    detached: process.platform !== "win32",
    env: { ...process.env, TMPDIR: chromiumTempDir }
  });
  fs.closeSync(chromiumLogFd);
  let socket;
  try {
    const activePort = path.join(userDataDir, "DevToolsActivePort");
    const startDeadline = Date.now() + 10000;
    while (!fs.existsSync(activePort) && Date.now() < startDeadline) {
      if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
        const log = fs.readFileSync(chromiumLogPath, "utf8").slice(-2000).trim();
        throw new Error(`Chromium exited before opening DevTools (${childProcess.exitCode ?? childProcess.signalCode}).${log ? ` ${log}` : ""}`);
      }
      await wait(50);
    }
    if (!fs.existsSync(activePort)) {
      const log = fs.readFileSync(chromiumLogPath, "utf8").slice(-2000).trim();
      throw new Error(`Timed out waiting for Chromium DevTools endpoint.${log ? ` ${log}` : ""}`);
    }
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
    await command("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await command("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.__LGPRIVACYSHIELD_C6_FIRMWARE_SETTINGS_MAP__ = ${JSON.stringify(C6_FIRMWARE_SETTINGS_MAP)};\n${serviceFixture}`
    });
    await command("Page.navigate", { url: `${origin}/index.html?scenario=success` });
    await waitFor(async () => (await evaluate("document.readyState")) === "complete", "app page load");
    return {
      process: childProcess,
      command,
      evaluate,
      async press(key) {
        const keys = {
          ArrowDown: ["ArrowDown", 40], ArrowLeft: ["ArrowLeft", 37], ArrowRight: ["ArrowRight", 39],
          ArrowUp: ["ArrowUp", 38], Enter: ["Enter", 13], Space: [" ", 32], Escape: ["Escape", 27], Back: ["Back", 461]
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
        fs.rmSync(chromiumTempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    };
  } catch (error) {
    if (socket) socket.close();
    await terminateChild(childProcess);
    fs.rmSync(chromiumTempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw error;
  }
}

async function captureDocumentationScreenshots(browser, outputDirectory) {
  const targetDirectory = path.resolve(outputDirectory);
  fs.mkdirSync(targetDirectory, { recursive: true });

  // Use a synthetic matrix identity so documentation captures do not expose a
  // specific physical TV's model or firmware details.
  for (const theme of ["dark", "light"]) {
    await browser.evaluate("localStorage.clear()");
    await browser.navigate("matrix-C5-p25");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", `${theme} screenshot fixture`);
    if (theme === "light") await browser.evaluate("document.querySelector('#theme-toggle').click()");
    const actualTheme = await browser.evaluate("document.documentElement.dataset.theme");
    if (actualTheme !== theme) throw new Error(`Expected ${theme} screenshots, got ${actualTheme}`);
    await browser.evaluate("document.activeElement.blur(); document.querySelectorAll('.remote-focused').forEach((element) => element.classList.remove('remote-focused')); document.querySelector('#main-content').scrollTop = 0");
    await wait(120);

    const capture = (page) => browser.screenshot(path.join(targetDirectory, `${page}-${theme}.png`));
    const selectView = async (view) => {
      await browser.evaluate(`(() => {
        document.querySelector('.tab[data-view="${view}"]').click();
        document.activeElement.blur();
        document.querySelectorAll('.remote-focused').forEach((element) => element.classList.remove('remote-focused'));
        document.querySelector('#main-content').scrollTop = 0;
      })()`);
      await wait(120);
    };

    await capture("overview");

    await selectView("controls");
    await capture("controls-top");
    const visibleControls = await browser.evaluate("document.querySelectorAll('.control-row:not([hidden])').length");
    await browser.evaluate("document.querySelector('.control-row:not([hidden]) [data-setting]').focus()");
    for (let index = 1; index < visibleControls; index += 1) await browser.press("ArrowDown");
    await browser.evaluate("document.activeElement.blur(); document.querySelectorAll('.remote-focused').forEach((element) => element.classList.remove('remote-focused'))");
    await capture("controls-bottom");

    await selectView("agreements");
    await capture("agreements-top");
    await browser.evaluate("(() => { const main = document.querySelector('#main-content'); main.scrollTop = main.scrollHeight; })()");
    await wait(120);
    await capture("agreements-bottom");

    await selectView("about");
    await capture("about");

    const errors = await browser.evaluate("window.__lgPrivacyShieldFixture.errors");
    if (errors.length) throw new Error(`${theme} documentation screenshots loaded with browser errors: ${errors.join("; ")}`);
  }
}

test("LGPrivacyShield works in headless Chromium with a simulated webOS remote and service bridge", async (t) => {
  const { server, origin } = await startServer();
  const userDataDir = fs.mkdtempSync(path.join(SCRATCH_ROOT, "h-"));
  let browser;
  try {
    browser = await launchHeadless(origin, userDataDir);

    try {
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "successful service readback");
    } catch (error) {
      const diagnostics = await browser.evaluate(`(() => ({
        title: document.title,
        runtime: (document.querySelector('#runtime-mode') || {}).textContent || null,
        bodyText: document.body.innerText.slice(0, 1200),
        fixtureLoaded: Boolean(window.__lgPrivacyShieldFixture),
        fixtureErrors: window.__lgPrivacyShieldFixture ? window.__lgPrivacyShieldFixture.errors : []
      }))()`).catch((diagnosticError) => ({ error: diagnosticError.message }));
      throw new Error(`${error.message}; page diagnostics: ${JSON.stringify(diagnostics)}`);
    }
    await t.test("dark is the default and the light-theme choice persists across launches", async () => {
      const initialTheme = await browser.evaluate(`(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        label: document.querySelector('#theme-toggle').textContent,
        stored: localStorage.getItem('privacyshield.theme.v1')
      }))()`);
      assert.deepEqual(initialTheme, { theme: "dark", label: "Use light theme", stored: null });

      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.id"), "theme-toggle", "the theme button must be reachable from the section tab by remote");
      await browser.press("Enter");
      assert.deepEqual(await browser.evaluate(`(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        label: document.querySelector('#theme-toggle').textContent,
        stored: localStorage.getItem('privacyshield.theme.v1')
      }))()`), { theme: "light", label: "Use dark theme", stored: "light" });

      await browser.navigate("success");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "theme preference reload");
      assert.equal(await browser.evaluate("document.documentElement.getAttribute('data-theme')"), "light");
      assert.equal(await browser.evaluate("document.querySelector('#theme-toggle').textContent"), "Use dark theme");
      await browser.press("ArrowUp");
      assert.equal(await browser.evaluate("document.activeElement.id"), "theme-toggle");
      await browser.press("Enter");
      assert.deepEqual(await browser.evaluate(`(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        label: document.querySelector('#theme-toggle').textContent,
        stored: localStorage.getItem('privacyshield.theme.v1')
      }))()`), { theme: "dark", label: "Use light theme", stored: "dark" });
    });
    await t.test("the four main pages contain useful content and work with the remote", async () => {
      const audit = await browser.evaluate(`(() => {
        const views = [...document.querySelectorAll('.view')];
        return {
          tabs: [...document.querySelectorAll('.tab')].map((item) => item.innerText.trim()),
          viewIds: views.map((view) => view.id.replace('view-', '')),
          headings: views.map((view) => view.querySelector('h1')?.innerText.trim() || ''),
          buttons: [...document.querySelectorAll('button')].map((button) => (button.getAttribute('aria-label') || button.innerText).trim()),
          switches: [...document.querySelectorAll('[data-setting]')].map((input) => [...(input.labels || [])].map((label) => label.innerText).join(' ').trim()),
          links: [...document.querySelectorAll('a[href]')].map((link) => link.innerText.trim()),
          agreementIds: [...document.querySelectorAll('#agreement-list .agreement-row')].map((row) => row.dataset.agreement),
          required: [...document.querySelectorAll('.agreement-row .required-tag')].map((tag) => tag.innerText.trim()),
          bodyCopy: views.map((view) => view.textContent).join(' '),
          aboutLinks: [...document.querySelectorAll('#view-about a')].map((link) => [link.innerText.trim(), link.href]),
          supportQr: {
            visible: !document.querySelector('#support-qr').hidden,
            dataUrl: document.querySelector('#support-qr').src.startsWith('data:image/'),
            alt: document.querySelector('#support-qr').alt
          },
          runtimeStatusHidden: document.querySelector('#runtime-mode').hidden,
          hasOverviewReadTimestamp: Boolean(document.querySelector('#last-updated')),
          darkPalette: (() => {
            const css = getComputedStyle(document.documentElement);
            const names = ['--mineral', '--paper', '--list-frame-surface', '--icon-surface', '--current', '--good', '--focus'];
            const rgb = (name) => css.getPropertyValue(name).trim().slice(1).match(/../g).map((part) => parseInt(part, 16) / 255);
            const luminance = (name) => rgb(name).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
              .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
            const contrast = (foreground, background) => {
              const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
              return (values[0] + 0.05) / (values[1] + 0.05);
            };
            return {
              colors: names.map((name) => css.getPropertyValue(name).trim()),
              textContrast: {
                inkOnPanel: contrast('--ink', '--paper'),
                mutedOnPanel: contrast('--muted', '--paper'),
                accentOnPanel: contrast('--current', '--paper'),
                focusOnPage: contrast('--focus', '--mineral')
              }
            };
          })(),
          shellInset: Number.parseFloat(getComputedStyle(document.querySelector('.shell')).paddingLeft),
          summaryColumns: getComputedStyle(document.querySelector('.summary-grid')).gridTemplateColumns.split(' ').length,
          evidenceRows: document.querySelectorAll('.agreement-evidence').length
        };
      })()`);
      const sections = ["overview", "controls", "agreements", "about"];
      assert.deepEqual(audit.tabs.map((name) => name.toLowerCase()), ["overview", "controls", "lg agreements", "about"]);
      assert.deepEqual(audit.viewIds, sections);
      assert.ok(audit.headings.every(Boolean));
      assert.ok(audit.buttons.every(Boolean), "every button has a visible or accessible label");
      assert.ok(audit.buttons.includes("Save current settings"));
      assert.equal(audit.runtimeStatusHidden, true, "successful reads do not leave a redundant footer status visible");
      assert.equal(audit.hasOverviewReadTimestamp, false, "Overview does not show a read timestamp");
      assert.equal(audit.switches.length, 17);
      assert.ok(audit.switches.every(Boolean), "every setting switch has a label");
      assert.ok(audit.links.every(Boolean));
      assert.deepEqual(audit.agreementIds, ["S_ADG", "S_VNG", "S_TAG", "S_MKT", "S_DPA", "S_PRG", "S_SVC"]);
      assert.deepEqual(audit.required, ["Required for smart services", "Required for smart services"]);
      assert.equal(audit.evidenceRows, 0, "agreement sources appear once at the end of the page");
      assert.equal(audit.summaryColumns, 2, "Overview uses both columns for its two setting summaries");
      assert.deepEqual(audit.aboutLinks.map(([label]) => label), ["GNU AGPL-3.0", "Source code", "ko-fi.com/snapetech"]);
      assert.equal(audit.aboutLinks[0][1], "https://www.gnu.org/licenses/agpl-3.0.html");
      assert.equal(audit.aboutLinks[1][1], "https://github.com/snapetech-org/LGPrivacyShield");
      assert.equal(audit.aboutLinks[2][1], "https://ko-fi.com/snapetech");
      assert.deepEqual(audit.supportQr, { visible: true, dataUrl: true, alt: "QR code for Ko-fi donations and support" });
      assert.match(audit.bodyCopy, /Donations and support/);
      assert.equal(new Set(audit.darkPalette.colors).size, audit.darkPalette.colors.length, "dark surfaces and accents use distinct colors");
      assert.ok(audit.darkPalette.textContrast.inkOnPanel >= 7);
      assert.ok(audit.darkPalette.textContrast.mutedOnPanel >= 4.5);
      assert.ok(audit.darkPalette.textContrast.accentOnPanel >= 4.5);
      assert.ok(audit.darkPalette.textContrast.focusOnPage >= 4.5);
      assert.doesNotMatch(audit.bodyCopy, /TV details|installed apps|network destinations|diagnostic.upload|firmware catalog|lorem ipsum|todo|tbd/i);
      assert.ok(audit.shellInset >= 100, "main content keeps a safe inset from the TV screen edge");

      await browser.evaluate("document.querySelector('.tab[data-view=overview]').focus()");
      for (let index = 0; index < sections.length; index += 1) {
        const section = sections[index];
        await browser.press("Enter");
        const page = await browser.evaluate(`(() => ({
          view: document.querySelector('.view.is-visible').id,
          tab: document.querySelector('.tab.is-active').dataset.view,
          current: document.querySelector('.tab.is-active').getAttribute('aria-current'),
          heading: document.querySelector('.view.is-visible h1')?.textContent.trim(),
          mainLeft: (document.querySelector('${section === "overview" ? "#view-overview [data-go=controls]" : section === "controls" ? "#control-scroll-frame" : ".view.is-visible .section-intro"}')).getBoundingClientRect().left,
          shellInset: Number.parseFloat(getComputedStyle(document.querySelector('.shell')).paddingLeft)
        }))()`);
        assert.equal(page.view, `view-${section}`);
        assert.equal(page.tab, section);
        assert.equal(page.current, "page");
        assert.ok(page.heading);
        assert.ok(page.mainLeft >= page.shellInset - 1, `${section} content left ${page.mainLeft}px stays within the ${page.shellInset}px TV safe inset`);
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("Boolean(document.activeElement.closest('.view'))"), true, `${section} accepts remote focus`);
        if (index < sections.length - 1) {
          await browser.evaluate("document.querySelector('.tab.is-active').focus()");
          await browser.press("ArrowRight");
          assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), `view-${sections[index + 1]}`);
        }
      }
      await browser.press("Back");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview");
      await browser.press("Back");
      assert.equal(await browser.evaluate("window.__lgPrivacyShieldFixture.backCalled"), true);

      try {
        await browser.command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
        const compactOverview = await browser.evaluate(`(() => {
          const button = document.querySelector('#view-overview [data-go=controls]').getBoundingClientRect();
          return { inset: parseFloat(getComputedStyle(document.querySelector('.shell')).paddingLeft), left: button.left, right: button.right, width: innerWidth };
        })()`);
        assert.ok(compactOverview.left - 8 >= 48, "Overview button and focus outline stay inside the TV safe area at 1280 px");
        await browser.evaluate("document.querySelector('.tab[data-view=controls]').click()");
        const compactControls = await browser.evaluate(`(() => {
          const inset = parseFloat(getComputedStyle(document.querySelector('.shell')).paddingLeft);
          const width = innerWidth;
          const elements = [...document.querySelectorAll('#control-scroll-frame, #control-toolbar button')];
          return { inset, width, bounds: elements.map((element) => { const rect = element.getBoundingClientRect(); return [rect.left, rect.right]; }) };
        })()`);
        assert.ok(compactControls.bounds.every(([left, right]) => left >= compactControls.inset - 1 && right <= compactControls.width - compactControls.inset + 1), "Controls frame and buttons stay within the safe area at 1280 px");
        await browser.evaluate("document.querySelector('.tab[data-view=overview]').click()");
      } finally {
        await browser.command("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
      }

      const before = await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings').length");
      await browser.evaluate("document.querySelector('#footer-refresh').focus()");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "footer refresh");
      const after = await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings').length");
      assert.ok(after > before, "Refresh reads current TV values");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview");
      assert.equal(await browser.evaluate("document.querySelectorAll('#refresh-button').length"), 0);
    });
    await t.test("privacy controls show list position and remote scrolling reaches the final setting", async () => {
      await browser.navigate("success");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "controls scroll fixture ready");
      await browser.evaluate("document.querySelector('.tab[data-view=controls]').focus()");
      await browser.press("Enter");
      const initial = await browser.evaluate(`(() => {
        const main = document.querySelector('#main-content');
        const frame = document.querySelector('#control-scroll-frame');
        const frameRect = frame.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const visibleCount = [...document.querySelectorAll('#control-list .control-row')]
          .filter((row) => { const rect = row.getBoundingClientRect(); return rect.bottom > frameRect.bottom + 2 && rect.top < mainRect.bottom - 2; }).length;
        return {
          range: document.querySelector('#control-scroll-range').textContent,
          cue: document.querySelector('#control-scroll-cue').textContent,
          visibleCount,
          total: document.querySelectorAll('#control-list .control-row:not([hidden])').length,
          progress: document.querySelector('.control-scroll-track').getAttribute('aria-valuenow'),
          sticky: getComputedStyle(frame).position,
          scrollTop: main.scrollTop
        };
      })()`);
      assert.match(initial.range, new RegExp(`^Showing 1–\\d+ of ${initial.total} controls$`));
      assert.ok(initial.visibleCount >= 2 && initial.visibleCount < initial.total, "the framed list must show some controls and indicate the rest continue below");
      assert.match(initial.cue, /below.*Use Down on the remote/i);
      assert.equal(initial.progress, String(initial.visibleCount));
      assert.equal(initial.sticky, "sticky");
      assert.equal(initial.scrollTop, 0);
      if (process.env.LGPRIVACYSHIELD_CONTROLS_TOP_CAPTURE_PATH) {
        await browser.screenshot(process.env.LGPRIVACYSHIELD_CONTROLS_TOP_CAPTURE_PATH);
      }

      const rowKeys = await browser.evaluate("[...document.querySelectorAll('#control-list .control-row:not([hidden])')].map((row) => row.dataset.control)");
      assert.equal(rowKeys.length, initial.total);
      assert.equal(rowKeys[0], "livePlus");
      assert.equal(rowKeys.at(-1), "homeSenseAbsence");
      await browser.evaluate("document.querySelector('[data-setting=livePlus]').focus()");
      for (const key of rowKeys.slice(1)) {
        await browser.press("ArrowDown");
        const focusedRow = await browser.evaluate(`(() => {
          const active = document.activeElement;
          return active.closest('.control-row')?.dataset.control || null;
        })()`);
        assert.equal(focusedRow, key, `Down should move to the ${key} available control row`);
      }
      const bottom = await browser.evaluate(`(() => {
        const main = document.querySelector('#main-content');
        const frame = document.querySelector('#control-scroll-frame');
        const frameRect = frame.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const lastRow = document.querySelector('[data-control=homeSenseAbsence]');
        const lastRect = lastRow.getBoundingClientRect();
        const switchRect = lastRow.querySelector('.switch').getBoundingClientRect();
        return {
          range: document.querySelector('#control-scroll-range').textContent,
          cue: document.querySelector('#control-scroll-cue').textContent,
          progress: document.querySelector('.control-scroll-track').getAttribute('aria-valuenow'),
          scrollTop: main.scrollTop,
          pageScrollTop: window.scrollY,
          focused: document.activeElement.dataset.setting,
          geometry: {
            main: { top: mainRect.top, bottom: mainRect.bottom, scrollTop: main.scrollTop, scrollHeight: main.scrollHeight, clientHeight: main.clientHeight },
            frame: { top: frameRect.top, bottom: frameRect.bottom, position: getComputedStyle(frame).position },
            row: { top: lastRect.top, bottom: lastRect.bottom },
            switch: { top: switchRect.top, bottom: switchRect.bottom }
          },
          lastRowVisible: lastRect.top >= frameRect.bottom - 2 && lastRect.bottom <= mainRect.bottom + 2,
          switchVisible: switchRect.top >= frameRect.bottom - 2 && switchRect.bottom <= mainRect.bottom + 2
        };
      })()`);
      assert.ok(bottom.scrollTop > 0, "remote focus should scroll the page");
      assert.equal(bottom.focused, "homeSenseAbsence");
      assert.equal(bottom.pageScrollTop, 0, "remote navigation must keep the app viewport fixed");
      assert.match(bottom.range, new RegExp(`^Showing \\d+–${initial.total} of ${initial.total} controls$`));
      assert.match(bottom.cue, /above.*Use Up on the remote/i);
      assert.equal(bottom.progress, String(initial.total));
      assert.equal(bottom.lastRowVisible, true, `the final control row must fit below the sticky cue and inside the viewport: ${JSON.stringify(bottom)}`);
      assert.equal(bottom.switchVisible, true, `the final switch must remain below the sticky cue and inside the viewport: ${JSON.stringify(bottom)}`);
      if (process.env.LGPRIVACYSHIELD_CONTROLS_BOTTOM_CAPTURE_PATH) {
        await browser.screenshot(process.env.LGPRIVACYSHIELD_CONTROLS_BOTTOM_CAPTURE_PATH);
      }
      await browser.evaluate("document.querySelector('.tab[data-view=overview]').click()");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview", "leave the fixture on Overview for the next UI test");
    });
    await t.test("Overview identifies the TV and Controls only reads mapped settings", async () => {
      await browser.evaluate("document.querySelector('.tab[data-view=overview]').focus()");
      const ready = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        webos: document.querySelector('#webos-version').textContent,
        title: document.querySelector('#overview-title').textContent,
        viewing: document.querySelector('#summary-viewing').textContent,
        voice: document.querySelector('#summary-voice').textContent,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, checked: input.checked, state: input.closest('.switch').querySelector('.switch-state').textContent, hidden: input.closest('.control-row').hidden, display: getComputedStyle(input.closest('.control-row')).display })),
        livePlusReadCategories: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && (call.parameters.keys || []).includes('livePlus')).map((call) => call.parameters.category),
        hbbDntReads: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && (call.parameters.keys || []).includes('hbbTvDnt')).length,
        requestedKeys: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || []),
        networkRequests: window.__lgPrivacyShieldFixture.calls.filter((call) => /connectionmanager/.test(call.service || '') || call.method === 'getStatus').length,
        bodyCopy: document.body.innerText,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(ready.model, "OLED77C6HUP");
      assert.equal(ready.title, "Overview");
      assert.match(ready.webos, /webOS 26.*Firmware 43\.21\.79/);
      assert.equal(ready.viewing, "On");
      assert.match(ready.voice, /voice is on/i);
      assert.ok(ready.livePlusReadCategories.length > 0);
      assert.ok(ready.livePlusReadCategories.every((category) => category === "option"));
      assert.equal(ready.hbbDntReads, 0, "a setting missing from the firmware map is not requested");
      assert.ok(ready.requestedKeys.every((key) => ["livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence", "aiNudge", "aiSettingsNudge"].includes(key)));
      assert.equal(ready.networkRequests, 0, "the app does not read network status");
      assert.doesNotMatch(ready.bodyCopy, /voice services|installed apps|diagnostic.upload|network destinations|firmware archive/i);
      assert.deepEqual(ready.errors, []);
      assert.deepEqual(ready.states.map((item) => item.disabled), [...Array(9).fill(false), true, true, true, ...Array(5).fill(false)]);
      assert.deepEqual(ready.states.map((item) => item.hidden), [...Array(9).fill(false), true, true, true, ...Array(5).fill(false)]);
      assert.ok(ready.states.filter((item) => item.hidden).every((item) => item.display === "none"), "unmapped control cards must not render");
      assert.deepEqual(ready.states.map((item) => item.state), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Not available", "Not available", "Not available", "On", "On", "On", "Off", "On"]);
      assert.equal(await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.applicationManager' && call.method === 'launch').length"), 0);

      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.closest('.view').id"), "view-overview");
      await browser.press("Enter");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-controls");
      assert.equal(await browser.evaluate("document.activeElement.id"), "privacy-preset");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent === 'Recommended privacy settings applied.'")), "privacy preset readback");
      const preset = await browser.evaluate(`(() => ({
        settings: { ...window.__lgPrivacyShieldFixture.settings },
        writes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.deepEqual(preset.settings, {
        livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off",
        lmt: "on", doNotSellMyPersonalInformation: "off", screenSaverAd: "off",
        homePromotion: "off", livePromotion: "off", contentRecommendation: "off",
        aiNudge: "on", aiSettingsNudge: "on",
        hbbTvDnt: "off", hbbTvDeviceId: "off", thirdPartyCookie: "onByUser",
        hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
      });
      assert.equal(preset.writes, 9, "the preset writes only reviewed controls present in this firmware index");
      assert.match(preset.status, /recommended privacy settings applied/i);

      const absentSetting = await browser.evaluate(`(() => {
        const input = document.querySelector('[data-setting=hbbTvDnt]');
        return { disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, value: window.__lgPrivacyShieldFixture.settings.hbbTvDnt };
      })()`);
      assert.deepEqual(absentSetting, { disabled: true, state: "Not available", value: "off" });
      const beforeAbsentWrite = await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'hbbTvDnt')).length");
      assert.equal(await browser.evaluate("document.querySelector('[data-setting=hbbTvDnt]').closest('.control-row').hidden"), true, "unmapped settings are omitted from Controls");
      const afterAbsentWrite = await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'hbbTvDnt')).length");
      assert.equal(afterAbsentWrite, beforeAbsentWrite, "an omitted firmware key must stay unwritable even when focused");
      await browser.evaluate("document.querySelector('#privacy-preset').focus()");

      await browser.evaluate("document.querySelector('[data-setting=livePlus]').focus()");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent")) === "On", "verified Live Plus toggle");
      const write = await browser.evaluate(`(() => ({
        value: window.__lgPrivacyShieldFixture.settings.livePlus,
        writes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        category: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'livePlus')).at(-1)?.parameters.category,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.equal(write.value, "on");
      assert.equal(write.writes, 10, "one OK press must produce one settings write");
      assert.equal(write.category, "option", "writes must use the exact firmware-index category");
      assert.match(write.status, /Live Plus \(ACR\) turned on/i);
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      const capture = process.env.LGPRIVACYSHIELD_CAPTURE_PATH;
      if (capture) await browser.screenshot(capture);

      const toggleAgain = async (key, expected) => {
        const before = await browser.evaluate(`window.__lgPrivacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length`);
        await browser.press("Enter");
        await waitFor(async () => (await browser.evaluate(`(() => {
          const calls = window.__lgPrivacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length;
          return window.LGPrivacyShieldModel.normalizeToggle(window.__lgPrivacyShieldFixture.settings['${key}']) === '${expected}' && calls > ${before};
        })()`)), `${key} toggles to ${expected}`);
        const state = await browser.evaluate(`(() => { const input = document.querySelector('[data-setting=${key}]'); return { value: window.LGPrivacyShieldModel.normalizeToggle(window.__lgPrivacyShieldFixture.settings['${key}']), raw: window.__lgPrivacyShieldFixture.settings['${key}'], disabled: input.disabled, focus: document.activeElement.dataset.setting }; })()`);
        assert.equal(state.value, expected);
        if (key === "thirdPartyCookie") assert.equal(state.raw, expected === "on" ? "onByUser" : "offByUser");
        assert.equal(state.disabled, false);
        assert.equal(state.focus, key, `${key} should keep remote focus after its write completes`);
        const writes = await browser.evaluate(`window.__lgPrivacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length`);
        assert.equal(writes, before + 1, `${key} must make exactly one write per remote selection`);
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
        if (key === "contentRecommendation") {
          const omittedRows = await browser.evaluate("['aiNudge', 'aiSettingsNudge'].map((key) => document.querySelector(`[data-setting=${key}]`).closest('.control-row').hidden)");
          assert.deepEqual(omittedRows, [true, true], "settings not mapped for this C6H profile are omitted");
        }
      }
      assert.deepEqual(
        await browser.evaluate("window.__lgPrivacyShieldFixture.settings"),
        {
          livePlus: "off", voiceLongDistance: "off", turnOnByVoice: "off",
          lmt: "on", doNotSellMyPersonalInformation: "off", screenSaverAd: "off",
          homePromotion: "off", livePromotion: "off", contentRecommendation: "off",
          aiNudge: "on", aiSettingsNudge: "on",
          hbbTvDnt: "off", hbbTvDeviceId: "off", thirdPartyCookie: "onByUser",
          hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
        },
      );
      const savedBaseline = {
        livePlus: "on", voiceLongDistance: "on", turnOnByVoice: "on", lmt: "off",
        doNotSellMyPersonalInformation: "off", screenSaverAd: "on", homePromotion: "on",
        livePromotion: "on", contentRecommendation: "on", aiNudge: "on", aiSettingsNudge: "on",
        hbbTvDnt: "off", hbbTvDeviceId: "on", thirdPartyCookie: "onByUser", hbbTV: "on",
        bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
      };
      assert.equal(await browser.evaluate("document.querySelector('#restore-button').disabled"), false, "a successful change must save a restore point");
      await browser.evaluate("document.querySelector('#restore-button').focus()");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Saved settings restored.", "restore saved values");
      assert.deepEqual(await browser.evaluate("window.__lgPrivacyShieldFixture.settings"), savedBaseline, "restore must return readable controls to their saved values");
      assert.equal(await browser.evaluate("document.querySelector('#restore-button').disabled"), true, "a successful restore clears the restore point");
      assert.equal(await browser.evaluate("document.querySelector('#save-settings-button').disabled"), false, "current readable settings can be saved before any change");
      await browser.evaluate("document.querySelector('#privacy-preset').focus()");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.activeElement.id"), "save-settings-button", "the save action is reachable with the remote");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Current readable settings saved on this TV.", "save current settings");
      const manuallySaved = await browser.evaluate("JSON.parse(localStorage.getItem('privacyshield.saved-controls.v1'))");
      const mappedBaseline = {
        livePlus: "on", voiceLongDistance: "on", turnOnByVoice: "on", lmt: "off",
        doNotSellMyPersonalInformation: "off", screenSaverAd: "on", homePromotion: "on",
        livePromotion: "on", contentRecommendation: "on", hbbTvDeviceId: "on", thirdPartyCookie: "on",
        hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
      };
      assert.equal(manuallySaved.kind, "manual");
      assert.deepEqual(manuallySaved.settings, mappedBaseline, "manual save stores the current readable mapped settings locally");
      await browser.evaluate("document.querySelector('[data-setting=livePlus]').focus()");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("window.LGPrivacyShieldModel.normalizeToggle(window.__lgPrivacyShieldFixture.settings.livePlus)")) === "off", "change after manual save");
      await browser.evaluate("document.querySelector('#restore-button').focus()");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Saved settings restored.", "restore manually saved settings");
      assert.deepEqual(await browser.evaluate("window.__lgPrivacyShieldFixture.settings"), savedBaseline, "manual save can be restored after another change");
      assert.equal(await browser.evaluate("document.querySelector('#restore-button').disabled"), false, "a manual restore point remains available after restoring");
      await browser.evaluate("document.querySelector('.tab[data-view=controls]').focus()");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-agreements");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "agreement-manager-button");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#agreement-action-status').textContent")) === "Make your choices in LG User Agreements, then select Agree to save.", "native agreement action status");
      const agreementLaunch = await browser.evaluate(`window.__lgPrivacyShieldFixture.calls.find((call) => call.service === 'luna://com.webos.applicationManager' && call.method === 'launch')`);
      assert.deepEqual(agreementLaunch.parameters, { id: "com.webos.app.firstuse-overlay", params: { target: "eula", context: "all" } });
      await browser.evaluate(`(() => {
        window.__lgPrivacyShieldFixture.eulaList.find((item) => item.id === 'S_TAG').accepted = false;
        window.__lgPrivacyShieldFixture.eulaList.push({ id: 'S_DIA', type: 'M', title: 'Diagnostic Data Agreement', accepted: false });
        document.dispatchEvent(new Event('visibilitychange'));
      })()`);
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-agreement=S_TAG] .status-pill').textContent")) === "Not accepted", "agreement status refresh after return");
      await waitFor(async () => Boolean(await browser.evaluate("document.querySelector('[data-agreement=S_DIA] .status-pill')?.textContent === 'Not accepted'")), "unmapped agreement status");
      const extraAgreement = await browser.evaluate(`(() => {
        const row = document.querySelector('[data-agreement=S_DIA]');
        return { title: row.querySelector('h2').textContent, tag: row.querySelector('.unmapped-tag').textContent,
          effect: row.querySelector('.agreement-declined').textContent, code: row.querySelector('.agreement-code').textContent };
      })()`);
      assert.deepEqual(extraAgreement, {
        title: "Diagnostic Data Agreement",
        tag: "Effect not mapped",
        effect: "This choice is not accepted. LGPrivacyShield has not verified which services or data uses it affects.",
        code: "TV record S_DIA"
      });
      assert.equal(await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && /eula/i.test(JSON.stringify(call.parameters))).length"), 0, "LGPrivacyShield must leave agreement writes to LG's consent screen");

    });

    await t.test("every distinct model/software control profile toggles through remote Enter with readback", async () => {
      const coveredKeys = new Set([
        "livePlus", "voiceLongDistance", "turnOnByVoice", "lmt",
        "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion",
        "livePromotion", "contentRecommendation", "hbbTvDeviceId",
        "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence"
      ]);
      const scenarios = [
        "matrix-B1-p6x", "matrix-B2-p22", "matrix-B3-p23", "matrix-B4-p24",
        "matrix-B5-p25", "matrix-B6-p26", "matrix-C2-p22", "b5",
        "c5-exact-map", "g5"
      ];
      const writerCount = (key) => browser.evaluate(`window.__lgPrivacyShieldFixture.calls.filter((call) =>
        (call.service === window.__lgPrivacyShieldFixture.activeSettingsUri && call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}'))
        || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')
      ).length`);
      const stateMatches = async (key, expected) => browser.evaluate(`(() => {
        const input = document.querySelector('[data-setting="${key}"]');
        return Boolean(input && !input.disabled
          && window.LGPrivacyShieldModel.normalizeToggle(window.__lgPrivacyShieldFixture.settings['${key}']) === '${expected}'
          && input.closest('.switch').querySelector('.switch-state').textContent === '${expected === "on" ? "On" : "Off"}');
      })()`);

      for (const scenario of scenarios) {
        await browser.evaluate("localStorage.clear()");
        await browser.navigate(scenario);
        await waitFor(async () => ["ready", "unavailable"].includes(await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")), `${scenario} settings`);
        const profile = await browser.evaluate(`(() => ({
          status: document.querySelector('#runtime-mode').dataset.state,
          keys: [...document.querySelectorAll('[data-setting]:not(:disabled)')].map((input) => input.dataset.setting),
          writers: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
          errors: window.__lgPrivacyShieldFixture.errors
        }))()`);
        assert.ok(profile.status, `${scenario} must select or report its profile`);
        assert.ok(profile.keys.length > 0, `${scenario} must expose at least one TV-readable control`);
        assert.equal(profile.writers, 0, `${scenario} must not write during profile selection`);
        assert.deepEqual(profile.errors, [], `${scenario} must load without browser errors`);

        await browser.evaluate("document.querySelector('.tab[data-view=controls]').focus()");
        await browser.press("Enter");
        for (const key of profile.keys) {
          coveredKeys.add(key);
          const initial = await browser.evaluate(`window.LGPrivacyShieldModel.normalizeToggle(window.__lgPrivacyShieldFixture.settings['${key}'])`);
          assert.ok(initial === "on" || initial === "off", `${scenario}/${key} needs a readable initial value`);
          const changed = initial === "on" ? "off" : "on";
          const before = await writerCount(key);
          await browser.evaluate(`document.querySelector('[data-setting="${key}"]').focus()`);
          await browser.press("Enter");
          try {
            await waitFor(() => stateMatches(key, changed), `${scenario}/${key} remote change and readback`);
          } catch (error) {
            const diagnostic = await browser.evaluate(`(() => ({
              runtime: document.querySelector('#runtime-mode').textContent,
              control: document.querySelector('[data-setting="${key}"]').outerHTML,
              switch: document.querySelector('[data-setting="${key}"]').closest('.switch').innerText,
              current: window.__lgPrivacyShieldFixture.settings['${key}'],
              calls: window.__lgPrivacyShieldFixture.calls.slice(-8),
              errors: window.__lgPrivacyShieldFixture.errors
            }))()`);
            throw new Error(`${error.message}; profile diagnostic=${JSON.stringify(diagnostic)}`);
          }
          assert.equal(await writerCount(key), before + 1, `${scenario}/${key} should write once`);
          await browser.press("Enter");
          await waitFor(() => stateMatches(key, initial), `${scenario}/${key} remote restore and readback`);
          assert.equal(await writerCount(key), before + 2, `${scenario}/${key} should write once per selection`);
          assert.equal(await browser.evaluate("document.activeElement.matches('[data-setting]')"), true, `${scenario}/${key} should retain remote focus`);
        }
      }
      const expectedKeys = require("../webos-app/src/compatibility.js").CONTROL_KEYS;
      assert.deepEqual([...coveredKeys].sort(), [...expectedKeys].sort(), "the profile matrix must exercise all 17 distinct control keys");
    });

    await t.test("each exact-profile key fails closed independently when missing or unrecognized", async () => {
      const exactKeys = Object.keys(require("../webos-app/src/compatibility.js").EXACT_PROFILES[0].controls);
      for (const [scenarioPrefix, expectedState] of [["missing", "Unavailable"], ["unreadable", "Unavailable"]]) {
        for (const key of exactKeys) {
          const scenario = `${scenarioPrefix}-${key}`;
          await browser.evaluate("localStorage.clear()");
          await browser.navigate(scenario);
          await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "Some values unavailable", `${scenario} exact profile`);
          const result = await browser.evaluate(`(() => ({
            locked: [...document.querySelectorAll('[data-setting]')].filter((input) => input.disabled).map((input) => input.dataset.setting),
            missingState: document.querySelector('[data-setting="${key}"]').closest('.switch').querySelector('.switch-state').textContent,
            presetDisabled: document.querySelector('#privacy-preset').disabled,
            settingReads: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === window.__lgPrivacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).map((call) => call.parameters.keys).flat(),
            writers: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
            errors: window.__lgPrivacyShieldFixture.errors
          }))()`);
          assert.deepEqual(
            result.locked.filter((lockedKey) => exactKeys.includes(lockedKey)),
            [key],
            `${scenario} must lock only the mapped setting that cannot be interpreted`
          );
          assert.deepEqual(
            result.locked.filter((lockedKey) => !exactKeys.includes(lockedKey)).sort(),
            ["aiNudge", "aiSettingsNudge"],
            `${scenario} must leave platform-only Smart tips unmapped for this exact profile`
          );
          assert.equal(result.missingState, expectedState, `${scenario} must display an unavailable value`);
          assert.equal(result.presetDisabled, false, `${scenario} must leave the readable part of the preset available`);
          assert.deepEqual(result.settingReads.sort(), [...exactKeys].sort(), `${scenario} must read every exact-profile candidate separately`);
          assert.equal(result.writers, 0, `${scenario} must not write during discovery`);
          assert.deepEqual(result.errors, [], `${scenario} must not create browser errors`);
        }
      }
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("slow-write");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "delayed write profile");
    await t.test("rapid repeated remote presses during a delayed write produce one verified transition", async () => {
      await browser.press("ArrowRight");
      await browser.press("ArrowDown");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').getAttribute('aria-busy')")) === "true", "pending delayed Live Plus write");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Live Plus (ACR) turned off.", "single delayed write readback");
      const result = await browser.evaluate(`(() => ({
        checked: document.querySelector('[data-setting=livePlus]').checked,
        state: document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent,
        tvValue: window.__lgPrivacyShieldFixture.settings.livePlus,
        focused: document.activeElement.dataset.setting,
        directWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === window.__lgPrivacyShieldFixture.activeSettingsUri && call.method === 'setSystemSettings').length,
        privilegedWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(result.checked, false);
      assert.equal(result.state, "Off");
      assert.equal(result.tvValue, "off");
      assert.equal(result.focused, "livePlus", "the remote remains on the control after readback");
      assert.equal(result.directWrites, 1, "the second press must not enqueue another write");
      assert.equal(result.privilegedWrites, 0);
      assert.deepEqual(result.errors, []);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "root snapshot fallback");
    await t.test("the Homebrew bridge supplies settings and performs verified writes when direct reads are denied", async () => {
      const fallback = await browser.evaluate(`(() => ({
        settings: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, value: input.closest('.switch').querySelector('.switch-state').textContent })),
        consent: document.querySelector('[data-agreement="S_ADG"] .status-pill').textContent,
        directFailures: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.method === 'getSystemSettings').length
      }))()`);
      assert.deepEqual(fallback.settings.map((item) => item.value), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Not available", "Not available", "Off", "On", "On", "On", "Off", "On"]);
      assert.deepEqual(fallback.settings.map((item) => item.disabled), [...Array(9).fill(false), true, true, ...Array(6).fill(false)]);
      assert.equal(fallback.consent, "Accepted");
      assert.ok(fallback.directFailures >= 3, "the private service fallback must actually be exercised");

      await browser.press("ArrowRight");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "privacy-preset");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "root-bridge setting readback");
      const bridgeWrite = await browser.evaluate(`(() => ({
        value: window.__lgPrivacyShieldFixture.settings.livePlus,
        status: document.querySelector('#control-status').textContent,
        directWriteAttempts: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.method === 'setSystemSettings').length,
        rootCalls: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec'),
      }))()`);
      assert.equal(bridgeWrite.value, "off");
      assert.equal(bridgeWrite.directWriteAttempts, 1);
      assert.equal(bridgeWrite.rootCalls.filter((call) => /device_control\.py/.test(call.parameters.command)).length, 1);
      assert.ok(bridgeWrite.rootCalls.length >= 3, "snapshot, write, and readback must all cross the HBC bridge");
      assert.match(bridgeWrite.status, /Live Plus \(ACR\) turned off/i);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("b5-root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "B5 owner-map root fallback");
    await t.test("the exact B5 map keeps its HbbTV switch usable without extra preference reads", async () => {
      const initial = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        toggleDisabled: document.querySelector('[data-setting=hbbTV]').disabled,
        requestedKeys: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || []),
        rootAvailable: window.__lgPrivacyShieldFixture.calls.some((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec')
      }))()`);
      assert.equal(initial.model, "OLED55B56LA");
      assert.equal(initial.toggleDisabled, false);
      assert.equal(initial.requestedKeys.includes("allowMobileDeviceAccess"), false, "the app does not read unrelated preference keys");
      assert.equal(initial.rootAvailable, true);
      await browser.evaluate("document.querySelector('[data-setting=hbbTV]').click()");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=hbbTV]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "B5 root writer readback");
      const write = await browser.evaluate(`(() => ({
        value: window.__lgPrivacyShieldFixture.settings.hbbTV,
        directWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        rootWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\.py/.test(call.parameters.command || '')).length,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(write.value, "off");
      assert.equal(write.directWrites, 1);
      assert.equal(write.rootWrites, 1);
      assert.deepEqual(write.errors, []);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("g5-root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "G5 root snapshot and writer fallback");
    await t.test("the exact G5 candidate map reads supported settings through the bridge", async () => {
      const initial = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        aiNudgeDisabled: document.querySelector('[data-setting=aiNudge]').disabled,
        screenSaverAdDisabled: document.querySelector('[data-setting=screenSaverAd]').disabled,
        homePromotionDisabled: document.querySelector('[data-setting=homePromotion]').disabled,
        requestedKeys: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || []),
        rootCalls: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec').length,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(initial.model, "OLED65G5WUA");
      assert.equal(initial.aiNudgeDisabled, false);
      assert.equal(initial.screenSaverAdDisabled, false);
      assert.equal(initial.homePromotionDisabled, false);
      assert.ok(initial.rootCalls > 0);
      assert.ok(initial.requestedKeys.every((key) => ["livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence", "aiNudge", "aiSettingsNudge"].includes(key)));
      assert.deepEqual(initial.errors, []);

      await browser.evaluate("document.querySelector('[data-setting=aiNudge]').click()");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=aiNudge]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "G5 root writer readback");
      const write = await browser.evaluate(`(() => ({
        value: window.__lgPrivacyShieldFixture.settings.aiNudge,
        rootWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
        unsupportedWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.parameters.settings && Object.prototype.hasOwnProperty.call(call.parameters.settings, 'thirdPartyCookie')).length
      }))()`);
      assert.equal(write.value, "off");
      assert.equal(write.rootWrites, 1);
      assert.equal(write.unsupportedWrites, 0);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("c5-exact-map");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#device-summary').textContent")) === "OLED77C51LA", "exact C5 control map");
    await t.test("the exact C5 map reads only mapped control keys", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        visibleKeys: [...document.querySelectorAll('.control-row:not([hidden]) [data-setting]')].map((input) => input.dataset.setting),
        reportPromptHidden: document.querySelector('#compatibility-report-prompt').hidden,
        reportPromptDisplay: getComputedStyle(document.querySelector('#compatibility-report-prompt')).display,
        requestedKeys: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || []),
        writerCalls: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(status.model, "OLED77C51LA");
      assert.ok(status.visibleKeys.length > 0);
      assert.equal(status.reportPromptHidden, true);
      assert.equal(status.reportPromptDisplay, "none", "the compatibility prompt stays out of view when all mapped controls are readable");
      assert.deepEqual(status.visibleKeys.sort(), [...new Set(status.requestedKeys)].sort());
      assert.ok(status.requestedKeys.every((key) => ["livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence", "aiNudge", "aiSettingsNudge"].includes(key)));
      assert.ok(!status.requestedKeys.some((key) => ["usageCare", "dbgLogUpload", "faultLogUpload", "watchedListCollection"].includes(key)));
      assert.equal(status.writerCalls, 0);
      assert.deepEqual(status.errors, []);
    });

    for (const [scenario, expectedToast] of [
      ["write-denied", /TV denied the change/i],
      ["readback-mismatch", /TV did not confirm the change/i]
    ]) {
      await browser.evaluate("localStorage.clear()");
      await browser.navigate(scenario);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", `${scenario} readable settings`);
      await t.test(`${scenario} leaves the switch unchanged and does not claim success`, async () => {
        await browser.press("ArrowRight");
        await browser.press("ArrowDown");
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
        await browser.press("Enter");
        await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Live Plus (ACR): change not confirmed.", `${scenario} verified write failure`);
        const result = await browser.evaluate(`(() => ({
          checked: document.querySelector('[data-setting=livePlus]').checked,
          value: document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent,
          tvValue: window.__lgPrivacyShieldFixture.settings.livePlus,
          status: document.querySelector('#control-status').textContent,
          toast: document.querySelector('#toast').textContent,
          focus: document.activeElement.dataset.setting,
          directWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
          rootWrites: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
          errors: window.__lgPrivacyShieldFixture.errors
        }))()`);
        assert.equal(result.checked, true);
        assert.equal(result.value, "On");
        assert.equal(result.tvValue, "on");
        assert.match(result.status, /change not confirmed/i);
        assert.match(result.toast, expectedToast);
        assert.doesNotMatch(result.status + result.toast, /turned off|confirmed the value/i);
        assert.equal(result.focus, "livePlus", "the remote remains on the switch after failure");
        assert.equal(result.directWrites, 1);
        assert.equal(result.rootWrites, 1, "the privileged writer fallback was exercised");
        assert.deepEqual(result.errors, []);
      });
    }

    await browser.evaluate("localStorage.clear()");
    await browser.evaluate(`localStorage.setItem("privacyshield.saved-controls.v1", JSON.stringify({ settings: { livePlus: "off" } }))`);
    await browser.navigate("denied");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "Some values unavailable", "denied service state");
    await t.test("denied settings remain read-only and explain why", async () => {
      const before = await browser.evaluate(`(() => ({
        values: [...document.querySelectorAll('[data-setting]')].filter((input) => !input.closest('.control-row').hidden).map((input) => ({ key: input.dataset.setting, disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex, ariaDisabled: input.closest('.switch').getAttribute('aria-disabled'), detail: document.querySelector('#' + input.dataset.setting + '-meta').textContent })),
        restoreDisabled: document.querySelector('#restore-button').disabled,
        placeholders: document.body.innerText.match(/idfk|not available|unavailable|unknown/ig) || []
      }))()`);
      assert.ok(before.values.length > 0);
      assert.ok(before.values.every((item) => item.disabled && item.state === "Unavailable" && item.tabIndex === 0 && item.ariaDisabled === "true"));
      assert.ok(before.values.some((item) => item.key === "livePlus"));
      assert.ok(before.values.every((item) => /could not be read|unavailable|locked|not mapped|read-only|no published settings map|no setting is available/i.test(item.detail)));
      assert.equal(await browser.evaluate("document.querySelector('#runtime-mode').textContent"), "Some values unavailable");
      assert.equal(await browser.evaluate("document.querySelector('#runtime-mode').hidden"), false, "read errors remain visible in the footer");
      assert.equal(before.restoreDisabled, true, "restore must remain disabled when current values cannot be read");
      assert.ok(!before.placeholders.some((text) => /idfk|unknown/i.test(text)), `unexpected vague status text: ${before.placeholders.join(", ")}`);

      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-controls");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "prepare-compatibility-report");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.classList.contains('switch')"), true);
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "livePlus");
      await browser.press("Enter");
      const blocked = await browser.evaluate(`(() => ({
        status: document.querySelector('#control-status').textContent,
        toast: document.querySelector('#toast').textContent,
        value: window.__lgPrivacyShieldFixture.settings.livePlus,
        writes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length
      }))()`);
      assert.match(blocked.status, /did not return a current value/i);
      assert.match(blocked.toast, /did not return a current value/i);
      assert.equal(blocked.value, "on");
      assert.equal(blocked.writes, 0);
      await browser.evaluate(`(() => { const button = document.querySelector('#restore-button'); button.disabled = false; button.click(); })()`);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Current TV values are unavailable. Refresh before restoring settings.", "restore guard on unreadable state");
      assert.equal(await browser.evaluate("window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || \"\"))).length"), 0, "unreadable restore must not reach any writer");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "voiceLongDistance");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "turnOnByVoice");
      for (const key of before.values.map((item) => item.key).slice(3)) {
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), key);
      }
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-setting]:not(:disabled)').length"), 0);
    });

    await browser.evaluate(`localStorage.setItem("privacyshield.saved-controls.v1", JSON.stringify({ settings: { livePlus: "on" } }))`);
    await browser.navigate("unmapped");
    try {
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "unmapped device identity");
    } catch (error) {
      const diagnostic = await browser.evaluate(`(() => ({
        runtime: document.querySelector('#runtime-mode').textContent,
        profile: document.querySelector('#runtime-mode').textContent,
        errors: window.__lgPrivacyShieldFixture.errors,
        calls: window.__lgPrivacyShieldFixture.calls.map(({ service, method, parameters }) => ({ service, method, keys: parameters.keys, category: parameters.category }))
      }))()`);
      throw new Error(`${error.message}; fixture=${JSON.stringify(diagnostic)}`);
    }
    await t.test("unmapped TVs show no control filler and can prepare a single-QR report", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        software: document.querySelector('#webos-version').textContent,
        noControls: !document.querySelector('#no-supported-controls').hidden,
        toolbarHidden: document.querySelector('#control-toolbar').hidden,
        toolbarDisplay: getComputedStyle(document.querySelector('#control-toolbar')).display,
        scrollFrameHidden: document.querySelector('#control-scroll-frame').hidden,
        scrollFrameDisplay: getComputedStyle(document.querySelector('#control-scroll-frame')).display,
        listFrameHidden: document.querySelector('#control-list-frame').hidden,
        listFrameDisplay: getComputedStyle(document.querySelector('#control-list-frame')).display,
        visibleRows: [...document.querySelectorAll('.control-row')].filter((row) => !row.hidden).length,
        promptHidden: document.querySelector('#compatibility-report-prompt').hidden,
        promptDisplay: getComputedStyle(document.querySelector('#compatibility-report-prompt')).display,
        errors: window.__lgPrivacyShieldFixture.errors,
        presetDisabled: document.querySelector('#privacy-preset').disabled,
        restoreDisabled: document.querySelector('#restore-button').disabled,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent })),
        writerCalls: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
      }))()`);
      assert.equal(status.model, "OLED65CSPSA");
      assert.match(status.software, /webOS 25/);
      assert.equal(status.noControls, true);
      assert.equal(status.toolbarHidden, true);
      assert.equal(status.toolbarDisplay, "none");
      assert.equal(status.scrollFrameHidden, true);
      assert.equal(status.scrollFrameDisplay, "none");
      assert.equal(status.listFrameHidden, true);
      assert.equal(status.listFrameDisplay, "none");
      assert.equal(status.visibleRows, 0);
      assert.equal(status.promptHidden, false);
      assert.notEqual(status.promptDisplay, "none", "the report action remains visible when no controls are mapped");
      assert.deepEqual(status.errors, []);
      assert.equal(status.presetDisabled, true);
      assert.equal(status.restoreDisabled, true);
      assert.deepEqual(status.states.map((item) => item.disabled), Array(17).fill(true));
      assert.deepEqual(status.states.map((item) => item.state), Array(17).fill("Not available"));
      assert.equal(status.writerCalls, 0);

      await browser.evaluate("document.querySelector('.tab[data-view=controls]').click()");
      await browser.evaluate(`(() => {
        window.__lgPrivacyShieldFixture.clipboardAccesses = 0;
        window.__lgPrivacyShieldFixture.qrPayloads = [];
        Object.defineProperty(navigator, "clipboard", { configurable: true, get() {
          window.__lgPrivacyShieldFixture.clipboardAccesses += 1;
          throw new Error("No TV clipboard");
        } });
        const createQr = window.qrcode;
        window.qrcode = (...args) => {
          const qr = createQr(...args);
          const addData = qr.addData.bind(qr);
          qr.addData = (data, ...options) => {
            window.__lgPrivacyShieldFixture.qrPayloads.push(data);
            return addData(data, ...options);
          };
          return qr;
        };
      })()`);
      await browser.evaluate("document.querySelector('#prepare-compatibility-report').click()");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-qr').hidden")) === false, "unmapped compatibility report QR");
      const qr = await browser.evaluate(`(() => ({
        hidden: document.querySelector('#compatibility-report-qr').hidden,
        src: document.querySelector('#compatibility-report-qr').src,
        alt: document.querySelector('#compatibility-report-qr').alt,
        imageCount: document.querySelectorAll('#compatibility-report-share img').length,
        shareVisible: !document.querySelector('#compatibility-report-share').hidden,
        reportBottom: document.querySelector('#compatibility-report-qr').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.footer').getBoundingClientRect().top,
        payloads: window.__lgPrivacyShieldFixture.qrPayloads,
        clipboardAccesses: window.__lgPrivacyShieldFixture.clipboardAccesses
      }))()`);
      assert.equal(qr.hidden, false);
      assert.equal(qr.imageCount, 1);
      assert.equal(qr.shareVisible, true);
      assert.ok(qr.reportBottom <= qr.footerTop, "the report QR must remain above the fixed footer");
      assert.equal(qr.clipboardAccesses, 0, "the TV app does not use a clipboard");
      assert.match(qr.src, /^data:image\/gif;base64,/);
      assert.match(qr.alt, /prefilled GitHub compatibility report form/i);
      assert.equal(qr.payloads.length, 1, "one QR opens the prefilled form and includes the report");
      const issueUrl = new URL(qr.payloads[0]);
      assert.equal(issueUrl.origin, "https://github.com");
      assert.equal(issueUrl.pathname, "/snapetech-org/LGPrivacyShield/issues/new");
      assert.equal(issueUrl.searchParams.get("template"), "compatibility-report.yml");
      assert.equal(issueUrl.searchParams.get("title"), "[Compatibility] OLED65CSPSA");
      const generated = issueUrl.searchParams.get("report");
      assert.ok(generated, "the report is embedded in the single QR link");
      const qrDecoder = spawnSync("zbarimg", ["--version"], { encoding: "utf8" });
      if (!qrDecoder.error && qrDecoder.status === 0) {
        const qrPath = path.join(userDataDir, "compatibility-report-link.gif");
        fs.writeFileSync(qrPath, Buffer.from(qr.src.split(",", 2)[1], "base64"));
        const decodedQr = spawnSync("zbarimg", ["--quiet", "--raw", qrPath], { encoding: "utf8" });
        assert.equal(decodedQr.status, 0, decodedQr.stderr);
        assert.equal(decodedQr.stdout.trimEnd(), qr.payloads[0]);
      }
      const json = JSON.parse(generated);
      assert.equal(json.device.model, "OLED65CSPSA");
      assert.equal(json.compatibility.profileId, null);
      assert.equal(json.compatibility.evidenceLevel, "unmapped");
      assert.equal(json.compatibility.mappingScope, "unmapped");
      assert.equal(json.compatibility.mappedControlCount, 0);
      assert.equal(Object.keys(json.controlReads).length, 17);
      assert.ok(Object.values(json.controlReads).every((value) => value === false));
      assert.doesNotMatch(generated, /eulaList|serialNumber|macAddress|ssid|192\\.168\\.|"livePlus":\\s*"on"/i);
      assert.match(await browser.evaluate("document.querySelector('#compatibility-report-status').textContent"), /Scan once to open GitHub's prefilled form.*Submit creates the public issue\./);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("mismatchedRuntime");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').dataset.state")) === "ready", "mismatched SDK/browser identity");
    await t.test("a known model with an inconsistent runtime stays read-only", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#device-summary').textContent,
        runtime: document.querySelector('#webos-version').textContent,
        controlsDisabled: [...document.querySelectorAll('[data-setting]')].every((input) => input.disabled),
        visibleRows: [...document.querySelectorAll('.control-row')].filter((row) => !row.hidden).length,
        settingReads: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).length,
        writers: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
        errors: window.__lgPrivacyShieldFixture.errors
      }))()`);
      assert.equal(status.model, "OLED65C6SIM");
      assert.match(status.runtime, /SIM-ENGINE-MISMATCH/);
      assert.equal(status.controlsDisabled, true);
      assert.equal(status.visibleRows, 0);
      assert.equal(status.settingReads, 0, "an unverified platform does not nominate candidate keys");
      assert.equal(status.writers, 0);
      assert.deepEqual(status.errors, []);
    });

    // Exercise the model-family × installed-software cross-product. Fixtures
    // verify control matching and TV service behavior, not physical devices.
    const matrixPlatforms = [
      { token: "6x", display: "6.x" }, { token: "22", display: "22" },
      { token: "23", display: "23" }, { token: "24", display: "24" },
      { token: "25", display: "25" }, { token: "26", display: "26" }
    ];
    const baseMappedKeys = ["livePlus", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation"];
    const allowedControlKeys = ["livePlus", "voiceLongDistance", "turnOnByVoice", "lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "hbbTvDnt", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence", "aiNudge", "aiSettingsNudge"];
    for (const series of ["B", "C", "G"]) {
      for (let generation = 1; generation <= 6; generation += 1) {
        for (const platform of matrixPlatforms) {
          const scenario = `matrix-${series}${generation}-p${platform.token}`;
          const model = `OLED65${series}${generation}SIM`;
          await browser.evaluate("localStorage.clear()");
          await browser.navigate(scenario);
          await waitFor(async () => await browser.evaluate(`(() => {
            const runtime = document.querySelector('#runtime-mode').dataset.state;
            return runtime === 'ready' || runtime === 'unavailable'
              || window.__lgPrivacyShieldFixture.errors.length > 0;
          })()`), `${scenario} model fixture`);
          const status = await browser.evaluate(`(() => ({
            model: document.querySelector('#device-summary').textContent,
            version: document.querySelector('#webos-version').textContent,
            errors: window.__lgPrivacyShieldFixture.errors,
            controls: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, hidden: input.closest('.control-row').hidden, state: input.closest('.switch').querySelector('.switch-state').textContent })),
            presetDisabled: document.querySelector('#privacy-preset').disabled,
            settingReads: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === window.__lgPrivacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).map((call) => call.parameters.keys),
            missingCurrentServiceProbes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.service !== window.__lgPrivacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).length,
            writerCalls: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
          }))()`);
          assert.equal(status.model, model);
          assert.deepEqual(status.errors, [], `${scenario} browser profile errors`);
          assert.match(status.version, new RegExp(`webOS ${platform.display.replace(".", "\\.")}`));
          const expectedKeys = [...baseMappedKeys];
          if (["22", "23", "24", "25", "26"].includes(platform.token)) expectedKeys.push("lmt");
          if (platform.token === "24") expectedKeys.push("aiNudge", "aiSettingsNudge");
          if (series === "C" && generation === 2 && platform.token === "22") expectedKeys.push("aiNudge", "aiSettingsNudge");
          if (series === "C" && generation === 5 && platform.token === "25") expectedKeys.push("voiceLongDistance", "thirdPartyCookie");
          const missingKey = series === "B" && generation === 1 && platform.token === "6x" ? "screenSaverAd" : null;
          const visible = status.controls.filter((item) => !item.hidden);
          const readable = visible.filter((item) => !item.disabled);
          assert.deepEqual(visible.map((item) => item.key).sort(), [...expectedKeys].sort(), `${scenario} shows only mapped control rows`);
          assert.equal(readable.length, expectedKeys.length - (missingKey ? 1 : 0));
          assert.equal(status.presetDisabled, false);
          assert.deepEqual(status.settingReads.flat().sort(), [...expectedKeys].sort(), `${scenario} reads only mapped control keys`);
          assert.equal(status.settingReads.length, expectedKeys.length, `${scenario} requests each mapped key once`);
          assert.ok(status.settingReads.every((keys) => keys.length === 1), "a missing key does not fail a whole category request");
          assert.equal(status.missingCurrentServiceProbes, platform.token === "6x" ? expectedKeys.length : 0, "webOS 6 probes the current URI before using the legacy SettingsService");
          assert.equal(status.writerCalls, 0, "initial profile detection and reads do not write settings");
          assert.ok(status.settingReads.flat().every((key) => allowedControlKeys.includes(key)), "the app does not read reference or research-only preferences");
          if (missingKey) {
            assert.equal(status.controls.find((item) => item.key === "screenSaverAd").state, "Unavailable");
            await browser.press("ArrowRight");
            await browser.press("ArrowDown");
            await browser.press("Enter");
            await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Recommended privacy settings applied.", "partial preset readback with one unavailable mapped setting");
            const partialPreset = await browser.evaluate(`(() => ({
              settings: { ...window.__lgPrivacyShieldFixture.settings },
              writes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.service === 'luna://com.webos.service.settings').map((call) => call.parameters.settings)
            }))()`);
            assert.equal(partialPreset.settings.screenSaverAd, "on", "the missing setting is left untouched");
            assert.equal(partialPreset.settings.livePlus, "off");
            assert.equal(partialPreset.settings.homePromotion, "off");
            assert.equal(partialPreset.settings.livePromotion, "off");
            assert.equal(partialPreset.settings.contentRecommendation, "off");
            assert.equal(partialPreset.writes.length, 4, "the preset applies only readable values through the legacy service");
          }
          if (series === "C" && generation === 5 && platform.token === "25") {
            await browser.evaluate("document.querySelector('[data-setting=thirdPartyCookie]').click()");
            await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=thirdPartyCookie]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "C5 HbbTV cookie value readback");
            const cookieWrite = await browser.evaluate(`(() => ({
              value: window.__lgPrivacyShieldFixture.settings.thirdPartyCookie,
              writes: window.__lgPrivacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').map((call) => call.parameters.settings.thirdPartyCookie)
            }))()`);
            assert.equal(cookieWrite.value, "offByUser");
            assert.deepEqual(cookieWrite.writes, ["offByUser"], "the C5 value domain is written and read back as published");
          }
        }
      }
    }

    if (process.env.LGPRIVACYSHIELD_DOC_SCREENSHOT_DIR) {
      await captureDocumentationScreenshots(browser, process.env.LGPRIVACYSHIELD_DOC_SCREENSHOT_DIR);
    }
  } finally {
    if (browser) await browser.stop();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    try { fs.rmdirSync(SCRATCH_ROOT); } catch (_) { /* preserve shared or non-empty task scratch */ }
  }
});

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
  const referenceSettings = {
    sportsAlarm: "on", webOSPromotionVideo: "off", promotionStreamer: "on", allowMobileDeviceAccess: false,
    watchedListCollection: "on", usageCare: true, dbgLogUpload: true, faultLogUpload: false
  };
  if (modelName === "OLED65G5WUA") {
    Object.assign(referenceSettings, {
      watchedListCollection: "off", usageCare: false, dbgLogUpload: false,
      faultLogUpload: true, thirdPartyCookie: "offByUser"
    });
    settings.thirdPartyCookie = "offByUser";
  }
  if (unreadableSetting && Object.prototype.hasOwnProperty.call(settings, unreadableSetting)) {
    settings[unreadableSetting] = "enabled";
  }
  const firmwareSettingsMap = scenario === "success" ? window.__PRIVACYSHIELD_C6_FIRMWARE_SETTINGS_MAP__ : null;
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
  window.__privacyShieldFixture = { scenario, settings, referenceSettings, firmwareSettingsMap, calls, eulaList, errors: [], activeSettingsUri };
  window.addEventListener("error", (event) => window.__privacyShieldFixture.errors.push(event.message));
  window.addEventListener("unhandledrejection", (event) => window.__privacyShieldFixture.errors.push(String(event.reason)));
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
          if (Object.prototype.hasOwnProperty.call(referenceSettings, key)) values[key] = referenceSettings[key];
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
      const snapshotReferenceSettings = Object.fromEntries(Object.entries(referenceSettings).filter(([key]) =>
        !missingSettings.has(key) && (!firmwareSettingsMap || Object.prototype.hasOwnProperty.call(firmwareSettingsMap.settings, key))
      ));
      return {
        returnValue: true,
        stdoutString: JSON.stringify({ settings: snapshotSettings, referenceSettings: snapshotReferenceSettings, firmwareSettingsMap, agreements: { eulaList }, voiceProcesses: ["voice-ui"], apps: [{ id: "com.example.video", title: "Example Video", version: "1.0" }], diagnostics: { services: [], autoUpload: false, faultLogUpload: false, debugLogUpload: false } })
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
  const chromiumTempDir = fs.mkdtempSync(path.join(process.platform === "win32" ? os.tmpdir() : "/tmp", "psh-"));
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
      source: `window.__PRIVACYSHIELD_C6_FIRMWARE_SETTINGS_MAP__ = ${JSON.stringify(C6_FIRMWARE_SETTINGS_MAP)};\n${serviceFixture}`
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
  await browser.navigate("matrix-C5-p25");
  await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "synthetic screenshot fixture");
  await browser.evaluate("localStorage.clear(); document.querySelector('#main-content').scrollTop = 0");
  await wait(120);

  const capture = (name) => browser.screenshot(path.join(targetDirectory, name));
  const selectView = async (view) => {
    await browser.evaluate(`(() => {
      document.querySelector('.tab[data-view="${view}"]').click();
      document.activeElement.blur();
      document.querySelectorAll('.remote-focused').forEach((element) => element.classList.remove('remote-focused'));
      document.querySelector('#main-content').scrollTop = 0;
    })()`);
    await wait(120);
  };

  await capture("overview.png");

  await selectView("controls");
  await capture("controls-top.png");
  await browser.evaluate("document.querySelector('[data-setting=livePlus]').focus()");
  for (let index = 1; index < 17; index += 1) await browser.press("ArrowDown");
  await capture("controls-bottom.png");

  await selectView("agreements");
  await capture("agreements-top.png");
  await browser.evaluate("(() => { const main = document.querySelector('#main-content'); main.scrollTop = main.scrollHeight; })()");
  await wait(120);
  await capture("agreements-bottom.png");

  await selectView("evidence");
  await capture("tv-details-status.png");
  await browser.evaluate(`(() => {
    const main = document.querySelector('#main-content');
    const target = document.querySelector('.compatibility-panel');
    const map = document.querySelector('#mapped-settings-details');
    map.open = true;
    main.scrollTop += target.getBoundingClientRect().top - main.getBoundingClientRect().top;
  })()`);
  await wait(120);
  await capture("tv-details-compatibility.png");

  await selectView("about");
  await capture("about.png");

  const errors = await browser.evaluate("window.__privacyShieldFixture.errors");
  if (errors.length) throw new Error(`Documentation screenshots loaded with browser errors: ${errors.join("; ")}`);
}

test("PrivacyShield works in headless Chromium with a simulated webOS remote and service bridge", async (t) => {
  const { server, origin } = await startServer();
  const userDataDir = fs.mkdtempSync(path.join(SCRATCH_ROOT, "privacyshield-headless-"));
  let browser;
  try {
    browser = await launchHeadless(origin, userDataDir);

    try {
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "successful service readback");
    } catch (error) {
      const diagnostics = await browser.evaluate(`(() => ({
        title: document.title,
        runtime: (document.querySelector('#runtime-mode') || {}).textContent || null,
        bodyText: document.body.innerText.slice(0, 1200),
        fixtureLoaded: Boolean(window.__privacyShieldFixture),
        fixtureErrors: window.__privacyShieldFixture ? window.__privacyShieldFixture.errors : []
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
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "theme preference reload");
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
    await t.test("all sections, actions, and switches are labeled and reachable by remote", async () => {
      const audit = await browser.evaluate(`(() => {
        const views = [...document.querySelectorAll('.view')];
        const aboutGrid = document.querySelector('#view-about .about-grid');
        const labels = {
          tabs: [...document.querySelectorAll('.tab')].map((item) => item.innerText.trim()),
          viewIds: views.map((view) => view.id.replace('view-', '')),
          buttons: [...document.querySelectorAll('button')].map((button) => (button.getAttribute('aria-label') || button.innerText).trim()),
          switches: [...document.querySelectorAll('[data-setting]')].map((input) => (input.getAttribute('aria-label') || [...(input.labels || [])].map((label) => label.innerText).join(' ')).trim()),
          links: [...document.querySelectorAll('a[href]')].map((link) => (link.getAttribute('aria-label') || link.innerText).trim()),
          agreementCards: [...document.querySelectorAll('#agreement-list .agreement-row')].map((row) => ({
            id: row.dataset.agreement,
            title: row.querySelector('h2')?.innerText.trim(),
            tag: row.querySelector('.required-tag, .optional-tag')?.innerText.trim(),
            accepted: row.querySelector('.agreement-accepted')?.innerText.trim(),
            declined: row.querySelector('.agreement-declined')?.innerText.trim(),
            evidence: row.querySelector('.agreement-evidence')?.innerText.trim()
          })),
          summaries: [...document.querySelectorAll('summary')].map((summary) => summary.innerText.trim())
        };
        return {
          ...labels,
          headings: views.map((view) => view.querySelector('h1')?.innerText.trim() || ''),
          bodyCopy: views.map((view) => view.textContent).join(' '),
          version: document.querySelector('#app-version').textContent,
          licenseText: document.querySelector('#about-license-title').parentElement.innerText,
          licenseHref: document.querySelector('#about-license-title').parentElement.querySelector('a')?.href,
          githubHref: document.querySelector('#about-source-title').parentElement.querySelector('a')?.href,
          kofiHref: [...document.querySelectorAll('#about-source-title ~ a, #about-source-title ~ p + a')].map((link) => link.href).join(' '),
          aboutLayout: (() => { const view = document.querySelector("#view-about"); const hidden = view.hidden; const visible = view.classList.contains("is-visible"); view.hidden = false; view.classList.add("is-visible"); const panels = [...aboutGrid.children]; const columns = new Set(panels.map((panel) => Math.round(panel.getBoundingClientRect().left))).size; const mainRect = document.querySelector("main").getBoundingClientRect(); const gridRect = aboutGrid.getBoundingClientRect(); const fitsMain = gridRect.left >= mainRect.left - 1 && gridRect.right <= mainRect.right + 1; view.hidden = hidden; view.classList.toggle("is-visible", visible); return { columns, fitsMain }; })()
        };
      })()`);
      const sectionNames = ["overview", "controls", "agreements", "evidence", "about"];
      assert.deepEqual(audit.tabs.map((name) => name.toLowerCase()), ["overview", "controls", "lg agreements", "tv details", "about"]);
      assert.deepEqual(audit.viewIds, sectionNames);
      assert.equal(audit.headings.length, sectionNames.length);
      assert.ok(audit.headings.every(Boolean), "each section must have a visible page heading");
      assert.ok(audit.buttons.every(Boolean), "every button must have a text or accessible name");
      assert.equal(audit.switches.length, 17);
      assert.ok(audit.switches.every(Boolean), "every privacy switch must have an accessible name");
      assert.ok(audit.links.every(Boolean), "every link must have a text or accessible name");
      assert.deepEqual(audit.agreementCards.map((item) => item.id), ["S_ADG", "S_VNG", "S_TAG", "S_MKT", "S_DPA", "S_PRG", "S_SVC"]);
      assert.deepEqual(audit.agreementCards.filter((item) => item.tag === "Required for smart services").map((item) => item.id), ["S_PRG", "S_SVC"]);
      assert.ok(audit.agreementCards.filter((item) => item.id.startsWith("S_") && !["S_PRG", "S_SVC"].includes(item.id)).every((item) => item.tag === "Optional"));
      assert.match(audit.agreementCards.find((item) => item.id === "S_ADG").accepted, /Live Plus.*ACR/i);
      assert.match(audit.agreementCards.find((item) => item.id === "S_TAG").accepted, /both.*Viewing Information/i);
      assert.match(audit.agreementCards.find((item) => item.id === "S_DPA").accepted, /ad measurement and analytics/i);
      assert.match(audit.agreementCards.find((item) => item.id === "S_MKT").declined, /does not identify message channels/i);
      assert.match(audit.bodyCopy, /saved choice, not whether data was used or sent/i);
      assert.ok(audit.summaries.every(Boolean), "every disclosure must have a label");
      assert.doesNotMatch(audit.bodyCopy, /\b(?:idfk|todo|tbd|lorem ipsum|placeholder|app-side|maintainer test|developer app)\b/i);
      assert.equal(audit.version, "0.4.0");
      assert.match(audit.licenseText, /GNU Affero General Public License, version 3/);
      assert.match(audit.licenseText, /No warranty is provided/);
      assert.equal(audit.licenseHref, "https://www.gnu.org/licenses/agpl-3.0.html");
      assert.equal(audit.githubHref, "https://github.com/snapetech-org/PrivacyShield");
      assert.ok(audit.kofiHref.includes("https://ko-fi.com/snapetech"));
      assert.equal(audit.aboutLayout.columns, 2, "the About view should use the two-column 1080p layout");
      assert.equal(audit.aboutLayout.fitsMain, true, "the About content must fit the viewport without horizontal clipping");

      await browser.evaluate("document.querySelector('.tab[data-view=overview]').focus()");
      for (let index = 0; index < sectionNames.length; index += 1) {
        const section = sectionNames[index];
        await browser.press("Enter");
        const page = await browser.evaluate(`(() => ({
          view: document.querySelector('.view.is-visible').id,
          tab: document.querySelector('.tab.is-active').dataset.view,
          current: document.querySelector('.tab.is-active').getAttribute('aria-current'),
          heading: document.querySelector('.view.is-visible h1')?.textContent.trim()
        }))()`);
        assert.equal(page.view, `view-${section}`);
        assert.equal(page.tab, section);
        assert.equal(page.current, "page");
        assert.ok(page.heading);
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate(`document.activeElement.closest('.view')?.id`), `view-${section}`, `${section} must accept remote focus`);
        if (section === "about" && process.env.PRIVACYSHIELD_ABOUT_CAPTURE_PATH) {
          await browser.screenshot(process.env.PRIVACYSHIELD_ABOUT_CAPTURE_PATH);
        }
        if (index < sectionNames.length - 1) {
          await browser.evaluate("document.querySelector('.tab.is-active').focus()");
          await browser.press("ArrowRight");
          assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), `view-${sectionNames[index + 1]}`);
        }
      }
      await browser.press("Back");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview", "Back returns from a section to Overview");
      await browser.press("Back");
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.backCalled"), true, "Back on Overview exits through the webOS platform handler");

      for (const buttonId of ["refresh-button", "footer-refresh"]) {
        const before = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings').length");
        await browser.evaluate(`document.querySelector('#${buttonId}').focus()`);
        await browser.press("Enter");
        await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", `${buttonId} refresh`);
        const after = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings').length");
        assert.ok(after > before, `${buttonId} must refresh TV values`);
        assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview", "refresh keeps the current section selected");
      }
    });
    await t.test("privacy controls show list position and remote scrolling reaches the final setting", async () => {
      await browser.navigate("success");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "controls scroll fixture ready");
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
          total: document.querySelectorAll('#control-list .control-row').length,
          progress: document.querySelector('.control-scroll-track').getAttribute('aria-valuenow'),
          sticky: getComputedStyle(frame).position,
          scrollTop: main.scrollTop
        };
      })()`);
      assert.match(initial.range, /^Showing 1–\d+ of 17 controls$/);
      assert.ok(initial.visibleCount >= 2 && initial.visibleCount < initial.total, "the framed list must show some controls and indicate the rest continue below");
      assert.match(initial.cue, /below.*Use Down on the remote/i);
      assert.equal(initial.progress, String(initial.visibleCount));
      assert.equal(initial.sticky, "sticky");
      assert.equal(initial.scrollTop, 0);
      if (process.env.PRIVACYSHIELD_CONTROLS_TOP_CAPTURE_PATH) {
        await browser.screenshot(process.env.PRIVACYSHIELD_CONTROLS_TOP_CAPTURE_PATH);
      }

      const rowKeys = await browser.evaluate("[...document.querySelectorAll('#control-list .control-row')].map((row) => row.dataset.control)");
      assert.equal(rowKeys.length, 17);
      assert.equal(rowKeys[0], "livePlus");
      assert.equal(rowKeys.at(-1), "homeSenseAbsence");
      await browser.evaluate("document.querySelector('[data-setting=livePlus]').focus()");
      for (const key of rowKeys.slice(1)) {
        await browser.press("ArrowDown");
        const focusedRow = await browser.evaluate(`(() => {
          const active = document.activeElement;
          return active.closest('.control-row')?.dataset.control || null;
        })()`);
        assert.equal(focusedRow, key, `Down should move to the ${key} control row, including unavailable settings`);
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
      assert.match(bottom.range, /^Showing \d+–17 of 17 controls$/);
      assert.match(bottom.cue, /above.*Use Up on the remote/i);
      assert.equal(bottom.progress, "17");
      assert.equal(bottom.lastRowVisible, true, `the final control row must fit below the sticky cue and inside the viewport: ${JSON.stringify(bottom)}`);
      assert.equal(bottom.switchVisible, true, `the final switch must remain below the sticky cue and inside the viewport: ${JSON.stringify(bottom)}`);
      if (process.env.PRIVACYSHIELD_CONTROLS_BOTTOM_CAPTURE_PATH) {
        await browser.screenshot(process.env.PRIVACYSHIELD_CONTROLS_BOTTOM_CAPTURE_PATH);
      }
      await browser.evaluate("document.querySelector('.tab[data-view=overview]').click()");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview", "leave the fixture on Overview for the next UI test");
    });
    await t.test("known settings navigate, change once, verify, and open the evidence disclosure", async () => {
      await browser.evaluate("document.querySelector('.tab[data-view=overview]').focus()");
      const ready = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, checked: input.checked, state: input.closest('.switch').querySelector('.switch-state').textContent })),
        initialFocus: document.activeElement.dataset.view,
        title: document.querySelector('#overview-title').textContent,
        subtitle: document.querySelector('.brand-subtitle').textContent,
        webos: document.querySelector('#webos-version').textContent,
        microphone: document.querySelector('#community-microphone').textContent,
        microphoneSwitch: document.querySelector('#community-microphone-switch').textContent,
        modelGuide: document.querySelector('#community-model-guide').innerText,
        discovery: document.querySelector('#community-device-discovery').textContent,
        mappedKeys: [...document.querySelectorAll('#mapped-settings-list li')].map((item) => item.innerText).join(' | '),
        firmwareArchiveStatus: document.querySelector('#firmware-source-status').textContent,
        firmwareKeyCount: Object.keys(window.__privacyShieldFixture.firmwareSettingsMap.settings).length,
        livePlusReadCategories: window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && (call.parameters.keys || []).includes('livePlus')).map((call) => call.parameters.category),
        hbbDntReads: window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && (call.parameters.keys || []).includes('hbbTvDnt')).length,
        communitySamples: [...document.querySelectorAll('#community-samples li')].map((item) => item.innerText).join(' | '),
        menuStatus: document.querySelector('#menu-reference-status').textContent,
        livePlusPath: (() => {
          const entry = [...document.querySelectorAll('#menu-reference-list li')].find((item) => item.innerText.includes('Live Plus'));
          return entry ? entry.innerText : '';
        })(),
        visibleCopy: document.body.innerText,
        errors: window.__privacyShieldFixture.errors
      }))()`);
      assert.equal(ready.model, "OLED77C6HUP");
      assert.equal(ready.initialFocus, "overview");
      assert.equal(ready.title, "TV privacy settings");
      assert.equal(ready.subtitle, "TV privacy settings and status");
      assert.match(ready.webos, /webOS 26.*firmware 43\.21\.79/);
      assert.match(ready.microphone, /C6H variant not covered/);
      assert.match(ready.microphone, /state remains unknown/i);
      assert.match(ready.microphoneSwitch, /no C6-specific report/i);
      assert.match(ready.modelGuide, /LG C6 \(2026\) privacy guide/);
      assert.match(ready.firmwareArchiveStatus, /matching firmware package \(43\.21\.79\.01\)/);
      assert.match(ready.firmwareArchiveStatus, /privacy settings have not been read from the package/);
      assert.match(ready.modelGuide, /excludes.*C6H/i);
      assert.match(ready.discovery, /look for compatible devices.*no setting to stop this/i);
      assert.match(ready.mappedKeys, /option\.livePlus.*PrivacyShield C6H device map/);
      assert.match(ready.mappedKeys, /com\.webos\.service\.admanager\/updateDNS/);
      assert.equal(ready.firmwareKeyCount, 24, "the exact C6 firmware index fixture contains 24 reviewed keys");
      assert.ok(ready.livePlusReadCategories.length > 0);
      assert.ok(ready.livePlusReadCategories.every((category) => category === "option"), "reads must use the exact firmware-index category");
      assert.equal(ready.hbbDntReads, 0, "an omitted firmware key must not be requested from SettingsService");
      assert.match(ready.mappedKeys, /hbbTvDnt.*not listed in this TV's firmware map/i);
      assert.doesNotMatch(ready.mappedKeys, /aiNudge|aiSettingsNudge/);
      assert.match(ready.communitySamples, /OLED55C61LA/);
      assert.match(ready.communitySamples, /43\.21\.79/);
      assert.match(ready.menuStatus, /webOS 26 · 7 documented menu paths/);
      assert.match(ready.livePlusPath, /System > Additional Settings > Live Plus/);
      assert.doesNotMatch(ready.visibleCopy, /what the TV can show us|your TV\. your settings|root-only|process snapshot|developer app/i);
      assert.deepEqual(ready.errors, [], "the browser fixture must load without JavaScript errors");
      assert.deepEqual(ready.states.map((item) => item.disabled), [...Array(9).fill(false), true, true, true, ...Array(5).fill(false)]);
      assert.deepEqual(ready.states.map((item) => item.state), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Not available", "Not available", "Not available", "On", "On", "On", "Off", "On"]);
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.applicationManager' && call.method === 'launch').length"), 0, "the LG agreement screen must not open until selected");
      const publicFindings = await browser.evaluate("[...document.querySelectorAll('#community-control-findings li')].map((item) => item.innerText).join(' | ')");
      assert.match(publicFindings, /Glasshouse · Live Plus \/ ACR switch/);
      assert.match(publicFindings, /Glasshouse dashboard · C2 Limit Ad Tracking key and readback/);
      assert.match(publicFindings, /option\.livePlus/);
      assert.match(publicFindings, /CleanYourTV · Ad and telemetry services/);
      assert.match(publicFindings, /PrivacyShield does not apply or stop them/);
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
        aiNudge: "on", aiSettingsNudge: "on",
        hbbTvDnt: "off", hbbTvDeviceId: "off", thirdPartyCookie: "onByUser",
        hbbTV: "on", bleAdvertisingOnOff: "off", homeSenseAbsence: "on"
      });
      assert.equal(preset.writes, 9, "the preset writes only reviewed controls present in this firmware index");
      assert.match(preset.status, /recommended privacy settings applied/i);

      const absentSetting = await browser.evaluate(`(() => {
        const input = document.querySelector('[data-setting=hbbTvDnt]');
        return { disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, value: window.__privacyShieldFixture.settings.hbbTvDnt };
      })()`);
      assert.deepEqual(absentSetting, { disabled: true, state: "Not available", value: "off" });
      const beforeAbsentWrite = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'hbbTvDnt')).length");
      await browser.evaluate("document.querySelector('[data-setting=hbbTvDnt]').closest('.switch').focus()");
      await browser.press("Enter");
      const afterAbsentWrite = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'hbbTvDnt')).length");
      assert.equal(afterAbsentWrite, beforeAbsentWrite, "an omitted firmware key must stay unwritable even when focused");
      await browser.evaluate("document.querySelector('#privacy-preset').focus()");

      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), "livePlus");
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=livePlus]').closest('.switch').querySelector('.switch-state').textContent")) === "On", "verified Live Plus toggle");
      const write = await browser.evaluate(`(() => ({
        value: window.__privacyShieldFixture.settings.livePlus,
        writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        category: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, 'livePlus')).at(-1)?.parameters.category,
        status: document.querySelector('#control-status').textContent
      }))()`);
      assert.equal(write.value, "on");
      assert.equal(write.writes, 10, "one OK press must produce one settings write");
      assert.equal(write.category, "option", "writes must use the exact firmware-index category");
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
        const writes = await browser.evaluate(`window.__privacyShieldFixture.calls.filter((call) => (call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}')) || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')).length`);
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
        if (key === "hbbTvDeviceId") {
          const omittedKey = await browser.evaluate(`(() => {
            const active = document.activeElement;
            const input = active.matches('[data-setting]') ? active : active.querySelector('[data-setting]');
            return input && { key: input.dataset.setting, disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent };
          })()`);
          assert.deepEqual(omittedKey, { key: "hbbTvDnt", disabled: true, state: "Not available" }, "the C6 firmware omission remains reachable and read-only");
          await browser.press("ArrowDown");
        }
        assert.equal(await browser.evaluate("document.activeElement.dataset.setting"), key);
        await toggleAgain(key, first);
        await toggleAgain(key, second);
        if (key === "contentRecommendation") {
          for (const unmappedKey of ["aiNudge", "aiSettingsNudge"]) {
            await browser.press("ArrowDown");
            const focused = await browser.evaluate(`(() => {
              const input = document.activeElement.matches('[data-setting]')
                ? document.activeElement
                : document.activeElement.querySelector('[data-setting]');
              return input && { key: input.dataset.setting, disabled: input.disabled, ariaDisabled: input.closest('.switch').getAttribute('aria-disabled') };
            })()`);
            assert.deepEqual(focused, { key: unmappedKey, disabled: true, ariaDisabled: "true" }, `${unmappedKey} must be reachable but remain unmapped on this C6H profile`);
          }
        }
      }
      assert.deepEqual(
        await browser.evaluate("window.__privacyShieldFixture.settings"),
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
      assert.deepEqual(await browser.evaluate("window.__privacyShieldFixture.settings"), savedBaseline, "restore must return readable controls to their saved values");
      assert.equal(await browser.evaluate("document.querySelector('#restore-button').disabled"), true, "a successful restore clears the restore point");
      await browser.evaluate("document.querySelector('.tab[data-view=controls]').focus()");
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
        window.__privacyShieldFixture.eulaList.push({ id: 'S_DIA', type: 'M', title: 'Diagnostic Data Agreement', accepted: false });
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
        effect: "This choice is not accepted. PrivacyShield has not verified which services or data uses it affects.",
        code: "TV record S_DIA"
      });
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && /eula/i.test(JSON.stringify(call.parameters))).length"), 0, "PrivacyShield must leave agreement writes to LG's consent screen");
      for (let step = 0; step < 8 && await browser.evaluate("document.querySelector('.view.is-visible').id !== 'view-evidence'"); step += 1) {
        await browser.press("ArrowRight");
      }
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-evidence");
      let reportButtonFocused = false;
      for (let step = 0; step < 40 && !reportButtonFocused; step += 1) {
        await browser.press("ArrowDown");
        reportButtonFocused = await browser.evaluate("document.activeElement.id === 'prepare-compatibility-report'");
      }
      assert.equal(reportButtonFocused, true, "the report button must be reachable with the remote from the top of TV details");
      assert.match(await browser.evaluate("document.querySelector('#compatibility-summary').textContent"), /15 settings are documented for this model and software.*3 changes were previously confirmed through PrivacyShield/i);
      await browser.evaluate(`(() => {
        window.__privacyShieldFixture.clipboardAccesses = 0;
        window.__privacyShieldFixture.qrPayloads = [];
        Object.defineProperty(navigator, "clipboard", { configurable: true, get() {
          window.__privacyShieldFixture.clipboardAccesses += 1;
          throw new Error("TV clipboard is unavailable");
        } });
        const createQr = window.qrcode;
        window.qrcode = (...args) => {
          const qr = createQr(...args);
          const addData = qr.addData.bind(qr);
          qr.addData = (data, ...options) => {
            window.__privacyShieldFixture.qrPayloads.push(data);
            return addData(data, ...options);
          };
          return qr;
        };
      })()`);
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-output').hidden")) === false, "local compatibility report output");
      const report = await browser.evaluate(`(() => ({
        status: document.querySelector('#compatibility-report-status').textContent,
        json: document.querySelector('#compatibility-report-output').value,
        clipboardAccesses: window.__privacyShieldFixture.clipboardAccesses,
        qrPayloads: window.__privacyShieldFixture.qrPayloads
      }))()`);
      assert.equal(report.status, "Scan once to open the prefilled GitHub form. The report is sent to GitHub in the link; Submit creates the public issue.");
      assert.equal(report.clipboardAccesses, 0, "report generation must not use a TV clipboard");
      const reportJson = JSON.parse(report.json);
      assert.equal(reportJson.compatibility.profileId, "lg-oled77c6hup-webos26-43.21.79");
      assert.deepEqual(Object.keys(reportJson.controlReads).length, 17);
      assert.doesNotMatch(report.json, /eulaList|serialNumber|macAddress|ssid|192\.168\.|"livePlus":\s*"on"/i);
      assert.equal(report.qrPayloads.length, 1, "the report flow must use one QR code");
      const reportUrl = new URL(report.qrPayloads[0]);
      assert.equal(reportUrl.origin, "https://github.com");
      assert.equal(reportUrl.pathname, "/snapetech-org/PrivacyShield/issues/new");
      assert.equal(reportUrl.searchParams.get("template"), "compatibility-report.yml");
      assert.equal(reportUrl.searchParams.get("title"), `[Compatibility] ${reportJson.device.model}`);
      assert.deepEqual(JSON.parse(reportUrl.searchParams.get("report")), reportJson);
      const reportCapture = process.env.PRIVACYSHIELD_REPORT_CAPTURE_PATH;
      if (reportCapture) await browser.screenshot(reportCapture);
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.id"), "compatibility-report-output");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.tagName"), "SUMMARY");
      await browser.press("Enter");
      assert.equal(await browser.evaluate("document.querySelector('.evidence-method').open"), true);
      await browser.press("Escape");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-overview");

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
      const writerCount = (key) => browser.evaluate(`window.__privacyShieldFixture.calls.filter((call) =>
        (call.service === window.__privacyShieldFixture.activeSettingsUri && call.method === 'setSystemSettings' && Object.prototype.hasOwnProperty.call(call.parameters.settings || {}, '${key}'))
        || ('${key}' === 'doNotSellMyPersonalInformation' && call.method === 'updateDNS')
      ).length`);
      const stateMatches = async (key, expected) => browser.evaluate(`(() => {
        const input = document.querySelector('[data-setting="${key}"]');
        return Boolean(input && !input.disabled
          && window.PrivacyShieldModel.normalizeToggle(window.__privacyShieldFixture.settings['${key}']) === '${expected}'
          && input.closest('.switch').querySelector('.switch-state').textContent === '${expected === "on" ? "On" : "Off"}');
      })()`);

      for (const scenario of scenarios) {
        await browser.evaluate("localStorage.clear()");
        await browser.navigate(scenario);
        await waitFor(async () => /TV status updated|Some TV status unavailable/.test(await browser.evaluate("document.querySelector('#runtime-mode').textContent")), `${scenario} settings`);
        const profile = await browser.evaluate(`(() => ({
          status: document.querySelector('#compatibility-status').textContent,
          keys: [...document.querySelectorAll('[data-setting]:not(:disabled)')].map((input) => input.dataset.setting),
          writers: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
          errors: window.__privacyShieldFixture.errors
        }))()`);
        assert.ok(profile.status, `${scenario} must select or report its profile`);
        assert.ok(profile.keys.length > 0, `${scenario} must expose at least one TV-readable control`);
        assert.equal(profile.writers, 0, `${scenario} must not write during profile selection`);
        assert.deepEqual(profile.errors, [], `${scenario} must load without browser errors`);

        await browser.evaluate("document.querySelector('.tab[data-view=controls]').focus()");
        await browser.press("Enter");
        for (const key of profile.keys) {
          coveredKeys.add(key);
          const initial = await browser.evaluate(`window.PrivacyShieldModel.normalizeToggle(window.__privacyShieldFixture.settings['${key}'])`);
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
              current: window.__privacyShieldFixture.settings['${key}'],
              calls: window.__privacyShieldFixture.calls.slice(-8),
              errors: window.__privacyShieldFixture.errors
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
          await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-status').textContent")) === "C6H settings", `${scenario} exact profile`);
          const result = await browser.evaluate(`(() => ({
            locked: [...document.querySelectorAll('[data-setting]')].filter((input) => input.disabled).map((input) => input.dataset.setting),
            missingState: document.querySelector('[data-setting="${key}"]').closest('.switch').querySelector('.switch-state').textContent,
            presetDisabled: document.querySelector('#privacy-preset').disabled,
            settingReads: window.__privacyShieldFixture.calls.filter((call) => call.service === window.__privacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).map((call) => call.parameters.keys).flat(),
            writers: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
            errors: window.__privacyShieldFixture.errors
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
    await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-status').textContent")) === "C6H settings", "delayed write profile");
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
        tvValue: window.__privacyShieldFixture.settings.livePlus,
        focused: document.activeElement.dataset.setting,
        directWrites: window.__privacyShieldFixture.calls.filter((call) => call.service === window.__privacyShieldFixture.activeSettingsUri && call.method === 'setSystemSettings').length,
        privilegedWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
        errors: window.__privacyShieldFixture.errors
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
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "root snapshot fallback");
    await t.test("the Homebrew bridge supplies settings and performs verified writes when direct reads are denied", async () => {
      const fallback = await browser.evaluate(`(() => ({
        settings: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, value: input.closest('.switch').querySelector('.switch-state').textContent })),
        consent: document.querySelector('[data-agreement="S_ADG"] .status-pill').textContent,
        processEvidence: document.querySelector('#evidence-processes').textContent,
        appEvidence: document.querySelector('#evidence-apps').textContent,
        directFailures: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.method === 'getSystemSettings').length
      }))()`);
      assert.deepEqual(fallback.settings.map((item) => item.value), ["On", "On", "On", "Off", "Off", "On", "On", "On", "On", "Not available", "Not available", "Off", "On", "On", "On", "Off", "On"]);
      assert.deepEqual(fallback.settings.map((item) => item.disabled), [...Array(9).fill(false), true, true, ...Array(6).fill(false)]);
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
    await browser.navigate("b5-root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "B5 owner-map root fallback");
    await t.test("the exact B5 map keeps its HbbTV switch usable through the root bridge", async () => {
      const initial = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        toggleDisabled: document.querySelector('[data-setting=hbbTV]').disabled,
        mobileAccess: [...document.querySelectorAll('#research-only-setting-list li')].map((item) => item.innerText).join(' | '),
        rootAvailable: window.__privacyShieldFixture.calls.some((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec')
      }))()`);
      assert.equal(initial.model, "OLED55B56LA");
      assert.equal(initial.toggleDisabled, false);
      assert.match(initial.mobileAccess, /network\.allowMobileDeviceAccess.*Current value: Off/);
      assert.equal(initial.rootAvailable, true);
      await browser.evaluate("document.querySelector('[data-setting=hbbTV]').click()");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=hbbTV]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "B5 root writer readback");
      const write = await browser.evaluate(`(() => ({
        value: window.__privacyShieldFixture.settings.hbbTV,
        directWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
        rootWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\.py/.test(call.parameters.command || '')).length,
        errors: window.__privacyShieldFixture.errors
      }))()`);
      assert.equal(write.value, "off");
      assert.equal(write.directWrites, 1);
      assert.equal(write.rootWrites, 1);
      assert.deepEqual(write.errors, []);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("g5-root-fallback");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "G5 root snapshot and writer fallback");
    await t.test("the exact G5 candidate map reads status through the bridge and keeps unsupported options read-only", async () => {
      const initial = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        aiNudgeDisabled: document.querySelector('[data-setting=aiNudge]').disabled,
        screenSaverAdDisabled: document.querySelector('[data-setting=screenSaverAd]').disabled,
        homePromotionDisabled: document.querySelector('[data-setting=homePromotion]').disabled,
        readOnly: [...document.querySelectorAll('#research-only-setting-list li')].map((item) => item.innerText).join(' | '),
        reference: window.__privacyShieldFixture.referenceSettings,
        rootCalls: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://org.webosbrew.hbchannel.service' && call.method === 'exec').length,
        errors: window.__privacyShieldFixture.errors
      }))()`);
      assert.equal(initial.model, "OLED65G5WUA");
      assert.equal(initial.aiNudgeDisabled, false);
      assert.equal(initial.screenSaverAdDisabled, false);
      assert.equal(initial.homePromotionDisabled, false);
      assert.match(initial.readOnly, /option.watchedListCollection.*Current value: Off/);
      assert.match(initial.readOnly, /option.usageCare.*Current value: Off/);
      assert.match(initial.readOnly, /option.dbgLogUpload.*Current value: Off/);
      assert.match(initial.readOnly, /option.faultLogUpload.*Current value: On/);
      assert.match(initial.readOnly, /option.thirdPartyCookie.*Current value: Off/);
      assert.ok(initial.rootCalls > 0);
      assert.deepEqual(initial.errors, []);

      await browser.evaluate("document.querySelector('[data-setting=aiNudge]').click()");
      await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=aiNudge]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "G5 root writer readback");
      const write = await browser.evaluate(`(() => ({
        value: window.__privacyShieldFixture.settings.aiNudge,
        rootWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
        unsupportedWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.parameters.settings && Object.prototype.hasOwnProperty.call(call.parameters.settings, 'thirdPartyCookie')).length
      }))()`);
      assert.equal(write.value, "off");
      assert.equal(write.rootWrites, 1);
      assert.equal(write.unsupportedWrites, 0);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("c5-exact-map");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#model-name').textContent")) === "OLED77C51LA", "exact C5 read-only map");
    await t.test("the exact C5 root map shows option status without adding switches", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        readOnly: [...document.querySelectorAll('#research-only-setting-list li')].map((item) => item.innerText).join(' | '),
        switches: [...document.querySelectorAll('[data-setting]')].map((input) => input.dataset.setting),
        summary: document.querySelector('#compatibility-summary').textContent,
        writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length,
        errors: window.__privacyShieldFixture.errors
      }))()`);
      assert.equal(status.model, "OLED77C51LA");
      assert.match(status.readOnly, /option.usageCare.*webos_lockout OLED77C51LA root report/);
      assert.match(status.readOnly, /option.dbgLogUpload.*webos_lockout OLED77C51LA root report/);
      assert.match(status.readOnly, /option.faultLogUpload.*webos_lockout OLED77C51LA root report/);
      assert.match(status.readOnly, /option.watchedListCollection.*Glasshouse C5 firmware map/);
      assert.match(status.summary, /firmware number is not published/);
      assert.equal(status.switches.some((key) => ["usageCare", "dbgLogUpload", "faultLogUpload", "watchedListCollection"].includes(key)), false);
      assert.equal(status.writerCalls, 0);
      assert.deepEqual(status.errors, []);
    });

    for (const [scenario, expectedToast] of [
      ["write-denied", /TV denied the change/i],
      ["readback-mismatch", /TV did not confirm the change/i]
    ]) {
      await browser.evaluate("localStorage.clear()");
      await browser.navigate(scenario);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", `${scenario} readable settings`);
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
          tvValue: window.__privacyShieldFixture.settings.livePlus,
          status: document.querySelector('#control-status').textContent,
          toast: document.querySelector('#toast').textContent,
          focus: document.activeElement.dataset.setting,
          directWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').length,
          rootWrites: window.__privacyShieldFixture.calls.filter((call) => call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || '')).length,
          errors: window.__privacyShieldFixture.errors
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
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "Some TV status unavailable", "denied service state");
    await t.test("denied settings stay locked but remain navigable and explain why", async () => {
      const before = await browser.evaluate(`(() => ({
        values: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex, ariaDisabled: input.closest('.switch').getAttribute('aria-disabled'), detail: document.querySelector('#' + input.dataset.setting + '-meta').textContent })),
        note: document.querySelector('#write-access-note span').textContent,
        restoreDisabled: document.querySelector('#restore-button').disabled,
        placeholders: document.body.innerText.match(/idfk|not available|unavailable|unknown/ig) || []
      }))()`);
      assert.deepEqual(before.values.map((item) => item.disabled), Array(17).fill(true));
      assert.deepEqual(before.values.map((item) => item.state), [...Array(9).fill("Unavailable"), "Not available", "Not available", ...Array(6).fill("Unavailable")]);
      assert.deepEqual(before.values.map((item) => item.tabIndex), Array(17).fill(0));
      assert.deepEqual(before.values.map((item) => item.ariaDisabled), Array(17).fill("true"));
      assert.ok(before.values.every((item) => /could not be read|unavailable|locked|not mapped|read-only|no published settings map|no setting is available/i.test(item.detail)));
      assert.match(before.note, /Homebrew Channel blocked local TV checks/i);
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
      assert.match(blocked.status, /did not return a current value/i);
      assert.match(blocked.toast, /did not return a current value/i);
      assert.equal(blocked.value, "on");
      assert.equal(blocked.writes, 0);
      await browser.evaluate(`(() => { const button = document.querySelector('#restore-button'); button.disabled = false; button.click(); })()`);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Current TV values are unavailable. Refresh before restoring settings.", "restore guard on unreadable state");
      assert.equal(await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || \"\"))).length"), 0, "unreadable restore must not reach any writer");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "voiceLongDistance");
      await browser.press("ArrowDown");
      assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), "turnOnByVoice");
      for (const key of ["lmt", "doNotSellMyPersonalInformation", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation", "aiNudge", "aiSettingsNudge", "hbbTvDnt", "hbbTvDeviceId", "thirdPartyCookie", "hbbTV", "bleAdvertisingOnOff", "homeSenseAbsence"]) {
        await browser.press("ArrowDown");
        assert.equal(await browser.evaluate("document.activeElement.querySelector('[data-setting]').dataset.setting"), key);
      }
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-setting]:not(:disabled)').length"), 0);
    });

    await browser.evaluate(`localStorage.setItem("privacyshield.saved-controls.v1", JSON.stringify({ settings: { livePlus: "on" } }))`);
    await browser.navigate("unmapped");
    try {
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "unmapped device identity");
    } catch (error) {
      const diagnostic = await browser.evaluate(`(() => ({
        runtime: document.querySelector('#runtime-mode').textContent,
        profile: document.querySelector('#compatibility-status').textContent,
        errors: window.__privacyShieldFixture.errors,
        calls: window.__privacyShieldFixture.calls.map(({ service, method, parameters }) => ({ service, method, keys: parameters.keys, category: parameters.category }))
      }))()`);
      throw new Error(`${error.message}; fixture=${JSON.stringify(diagnostic)}`);
    }
    await t.test("unmapped models remain read-only and can produce a local sanitized report", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        profile: document.querySelector('#compatibility-status').textContent,
        detail: document.querySelector('#compatibility-summary').textContent,
        family: document.querySelector('#community-cohort').textContent,
        menuStatus: document.querySelector('#menu-reference-status').textContent,
        errors: window.__privacyShieldFixture.errors,
        presetDisabled: document.querySelector('#privacy-preset').disabled,
        restoreDisabled: document.querySelector('#restore-button').disabled,
        states: [...document.querySelectorAll('[data-setting]')].map((input) => ({ disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent, tabIndex: input.closest('.switch').tabIndex })),
        writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
      }))()`);
      assert.equal(status.model, "OLED65CSPSA");
      assert.equal(status.profile, "Read-only");
      assert.match(status.detail, /No controls are available/);
      assert.match(status.family, /not listed in the B\/C\/G OLED references/);
      assert.match(status.menuStatus, /webOS 25/);
      assert.deepEqual(status.errors, [], "unmapped models must not break browser-side profile matching");
      assert.equal(status.presetDisabled, true);
      assert.equal(status.restoreDisabled, true);
      assert.deepEqual(status.states.map((item) => item.disabled), Array(17).fill(true));
      assert.deepEqual(status.states.map((item) => item.state), Array(17).fill("Not available"));
      assert.deepEqual(status.states.map((item) => item.tabIndex), Array(17).fill(0));
      assert.equal(status.writerCalls, 0);

      await browser.press("ArrowRight");
      await browser.press("ArrowRight");
      await browser.press("ArrowRight");
      assert.equal(await browser.evaluate("document.querySelector('.view.is-visible').id"), "view-evidence");
      let reportButtonFocused = false;
      for (let step = 0; step < 40 && !reportButtonFocused; step += 1) {
        await browser.press("ArrowDown");
        reportButtonFocused = await browser.evaluate("document.activeElement.id === 'prepare-compatibility-report'");
      }
      assert.equal(reportButtonFocused, true, "the report button must be reachable with the remote from the top of TV details");
      await browser.evaluate(`(() => {
        window.__privacyShieldFixture.qrPayloads = [];
        const createQr = window.qrcode;
        window.qrcode = (...args) => {
          const qr = createQr(...args);
          const addData = qr.addData.bind(qr);
          qr.addData = (data, ...options) => {
            window.__privacyShieldFixture.qrPayloads.push(data);
            return addData(data, ...options);
          };
          return qr;
        };
      })()`);
      await browser.press("Enter");
      await waitFor(async () => (await browser.evaluate("document.querySelector('#compatibility-report-output').hidden")) === false, "unmapped compatibility report output");
      const qr = await browser.evaluate(`(() => ({
        hidden: document.querySelector('#compatibility-report-qr').hidden,
        src: document.querySelector('#compatibility-report-qr').src,
        alt: document.querySelector('#compatibility-report-qr').alt,
        imageCount: document.querySelectorAll('#compatibility-report-share img').length,
        shareVisible: !document.querySelector('#compatibility-report-share').hidden,
        reportBottom: document.querySelector('#compatibility-report-qr').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.footer').getBoundingClientRect().top,
        payloads: window.__privacyShieldFixture.qrPayloads
      }))()`);
      assert.equal(qr.hidden, false);
      assert.equal(qr.imageCount, 1);
      assert.equal(qr.shareVisible, true);
      assert.ok(qr.reportBottom <= qr.footerTop, "the full report QR must remain above the fixed footer");
      assert.match(qr.src, /^data:image\/gif;base64,/);
      assert.match(qr.alt, /prefilled GitHub compatibility report form/i);
      assert.equal(qr.payloads.length, 1, "the report flow must use one QR code");
      const generated = await browser.evaluate("document.querySelector('#compatibility-report-output').value");
      const issueUrl = new URL(qr.payloads[0]);
      assert.equal(issueUrl.origin, "https://github.com");
      assert.equal(issueUrl.pathname, "/snapetech-org/PrivacyShield/issues/new");
      assert.equal(issueUrl.searchParams.get("template"), "compatibility-report.yml");
      assert.equal(issueUrl.searchParams.get("title"), "[Compatibility] OLED65CSPSA");
      assert.deepEqual(JSON.parse(issueUrl.searchParams.get("report")), JSON.parse(generated));
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
      assert.deepEqual(Object.keys(json.controlReads).length, 17);
      assert.ok(Object.values(json.controlReads).every((value) => value === false));
      assert.doesNotMatch(generated, /eulaList|serialNumber|macAddress|ssid|192\.168\.|"livePlus":\s*"on"/i);
      assert.match(await browser.evaluate("document.querySelector('#compatibility-report-status').textContent"), /report is sent to GitHub in the link.*Submit creates the public issue/i);
    });

    await browser.evaluate("localStorage.clear()");
    await browser.navigate("mismatchedRuntime");
    await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", "mismatched SDK/browser identity");
    await t.test("a known cohort with inconsistent SDK and browser engine stays read-only", async () => {
      const status = await browser.evaluate(`(() => ({
        model: document.querySelector('#model-name').textContent,
        runtime: document.querySelector('#webos-version').textContent,
        cohort: document.querySelector('#community-cohort').textContent,
        profile: document.querySelector('#compatibility-status').textContent,
        menu: document.querySelector('#menu-reference-status').textContent,
        controlsDisabled: [...document.querySelectorAll('[data-setting]')].every((input) => input.disabled),
        settingReads: window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).length,
        writers: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ''))).length,
        errors: window.__privacyShieldFixture.errors
      }))()`);
      assert.equal(status.model, "OLED65C6SIM");
      assert.match(status.runtime, /SIM-ENGINE-MISMATCH/);
      assert.match(status.cohort, /C6 · 2026 OLED family/);
      assert.equal(status.profile, "Read-only");
      assert.match(status.menu, /installed webOS version is unavailable/);
      assert.equal(status.controlsDisabled, true);
      assert.equal(status.settingReads, 0, "an unverified platform must not nominate candidate keys");
      assert.equal(status.writers, 0);
      assert.deepEqual(status.errors, []);
    });

    for (const [scenario, model, family, platform, sample, profileCohort, profilePlatform] of [
      ["c1", "OLED55C17LB", /C1 · 2021 OLED family.*launch version webOS 6\.x/, "webOS 6\\.x", "OLED55C17LB", "C1", "6.x"],
      ["c5", "OLED65C54LA", /C5 · 2025 OLED family.*launch version webOS 25/, "webOS 26", "OLED65C54LA", "C5", "26"],
      ["g2", "OLED65G26LA", /G2 · 2022 OLED family.*launch version webOS 22/, "webOS 25", "OLED65G26LA", "G2", "25"],
      ["g1", "OLED55G19LA", /G1 · 2021 OLED family.*launch version webOS 6\.x/, "webOS 6\\.x", "OLED55G19LA", "G1", "6.x"],
      ["g4", "OLED65G45LW", /G4 · 2024 OLED family.*launch version webOS 24/, "webOS 24", "Life's Good Without Spying", "G4", "24"],
      ["b5", "OLED55B56LA", /B5 · 2025 OLED family.*launch version webOS 25/, "webOS 25", "OLED55B56LA", "B5", "25"],
      ["g5", "OLED65G5WUA", /G5 · 2025 OLED family.*launch version webOS 25/, "webOS 25", "OLED65G5WUA", "G5", "25"]
    ]) {
      await browser.evaluate("localStorage.clear()");
      await browser.navigate(scenario);
      await waitFor(async () => (await browser.evaluate("document.querySelector('#runtime-mode').textContent")) === "TV status updated", `${scenario} community model evidence`);
      await t.test(`${model} uses the matching platform map while keeping its device evidence separate`, async () => {
        const status = await browser.evaluate(`(() => ({
          model: document.querySelector('#model-name').textContent,
          version: document.querySelector('#webos-version').textContent,
          family: document.querySelector('#community-cohort').textContent,
          modelGuide: document.querySelector('#community-model-guide').innerText,
          modelGuideUrl: document.querySelector('#community-model-guide a')?.href || null,
          mappedKeys: [...document.querySelectorAll('#mapped-settings-list li')].map((item) => item.innerText).join(' | '),
          readOnlyKeys: [...document.querySelectorAll('#research-only-setting-list li')].map((item) => item.innerText).join(' | '),
          readOnlySectionHidden: document.querySelector('#research-only-setting-details').hidden,
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
        assert.ok(status.modelGuideUrl.endsWith(`/tv/lg/${profileCohort.toLowerCase()}-${Number(profileCohort.slice(1)) + 2020}/`));
        assert.match(status.modelGuide, /Model-family guide/);
        assert.ok(status.mappedKeys.length > 0, "the selected internal settings map is shown");
        const microphoneEvidence = scenario === "c5"
          ? /Conflicting regional sources/
          : scenario === "g1"
            ? /Listed as absent by the cited manufacturer source/
            : scenario === "g4"
              ? /Listed by the cited manufacturer source/
              : /Built-in microphone: Unknown/;
        assert.match(status.microphone, microphoneEvidence);
        if (scenario === "c5") {
          assert.match(status.microphoneSwitch, /Physical microphone switch: reported for C5 on 10\.3\.1/);
          assert.match(status.microphoneSwitch, /Both projects report a physical microphone switch on a C5/);
          assert.match(status.microphoneSwitch, /do not establish a physical switch.*C6\/C6H/i);
          assert.match(status.samples, /OLED65C54LA.*owner report/);
          assert.match(status.family, /Reports: 6 \(3 Glasshouse, 1 CleanYourTV, 1 webos_lockout, 1 tv-home\)/);
          assert.match(status.samples, /LG OLED C5 \(2025\); exact model code not published · tv-home \(owner report\)/);
          assert.match(status.samples, /seven days of TV logs/);
        } else if (scenario === "c1") {
          assert.match(status.microphoneSwitch, /no report confirms one on this C1/i);
          assert.match(status.family, /Reports: 4 \(2 Glasshouse, 1 webOS Unclutter, 1 KallistoX C1 capture\)/);
          assert.match(status.samples, /European C1; exact model code not listed/);
          assert.match(status.samples, /KallistoX C1 capture.*network capture/);
        } else {
          assert.match(status.microphoneSwitch, /no report confirms one on this/i);
        }
        assert.match(status.samples, new RegExp(sample));
        assert.match(status.menuStatus, new RegExp(platform));
        assert.equal(status.profile, `${profileCohort} · webOS ${profilePlatform}`);
      assert.ok(status.modelGuideUrl.endsWith(`/tv/lg/${profileCohort.toLowerCase()}-${Number(profileCohort.slice(1)) + 2020}/`));
      assert.match(status.modelGuide, /Model-family guide/);
      assert.ok(status.mappedKeys.length > 0, "the selected internal settings map is shown");
        assert.equal(status.controlsLocked, false);
        assert.equal(status.presetDisabled, false);
        assert.equal(status.restoreDisabled, true);
        assert.equal(status.writerCalls, 0);
        if (scenario === "g2") {
          assert.match(status.samples, /project test/);
          assert.match(status.version, /firmware 33\.23\.05/);
        }
        if (scenario === "g1") {
          assert.match(status.samples, /03\.53\.45/);
          assert.match(status.samples, /LG TV Blocklist.*network capture/);
          assert.match(status.menu, /Advertisement \(legacy setting\)/);
          assert.equal(status.writerCalls, 0);
        }
        if (scenario === "g4") {
          assert.match(status.samples, /OLED65G45LW \(EU\).*Life's Good Without Spying.*project test/);
          assert.match(status.samples, /23\.23\.30/);
        }
        if (scenario === "b5") {
          assert.match(status.samples, /OLED55B56LA \(DEU, B5\).*own-your-glass \(owner audit\)/);
          assert.match(status.samples, /firmware not listed.*does not list the firmware version or verify changes made from PrivacyShield/);
          assert.match(status.mappedKeys, /Smart tips.*general\.aiNudge.*own-your-glass B5 audit/);
          for (const mapping of ["option.hbbTV", "option.hbbTvDnt", "option.hbbTvDeviceId"]) {
            assert.match(status.mappedKeys, new RegExp(`${mapping}.*own-your-glass B5 audit`));
          }
          assert.match(status.readOnlyKeys, /network\.allowMobileDeviceAccess.*Current value: Off.*does not prove that LAN access is blocked/);
          assert.equal(status.readOnlySectionHidden, false);
          const requestedB5Keys = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || [])");
          assert.ok(requestedB5Keys.includes("allowMobileDeviceAccess"));
          for (const unclassified of ["adCookie", "sportsAlarm", "webOSPromotionVideo"]) {
            assert.ok(!requestedB5Keys.includes(unclassified), `${unclassified} has no exact B5 category map and must not be guessed`);
          }
          await browser.evaluate("document.querySelector('[data-setting=hbbTV]').click()");
          await waitFor(async () => (await browser.evaluate("document.querySelector('[data-setting=hbbTV]').closest('.switch').querySelector('.switch-state').textContent")) === "Off", "B5 HbbTV map write/readback");
          const b5Write = await browser.evaluate("(() => ({ value: window.__privacyShieldFixture.settings.hbbTV, writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.parameters.settings && Object.prototype.hasOwnProperty.call(call.parameters.settings, 'hbbTV')).length }))()");
          assert.equal(b5Write.value, "off");
          assert.equal(b5Write.writes, 1);
        }
        if (scenario === "g5") {
          assert.match(status.samples, /OLED65G5WUA.*Level1Techs G5 rooted privacy guide \(owner report\)/);
          assert.match(status.samples, /firmware not listed.*lists privacy keys.*preference files with root access/);
          for (const mapping of ["general.aiNudge", "general.screenSaverAd", "general.homePromotion"]) {
            assert.match(status.mappedKeys, new RegExp(`${mapping}.*Level1Techs G5 keys \\+ Glasshouse SettingsService definitions`));
          }
          assert.match(status.mappedKeys, /option.livePlus.*Glasshouse SettingsService map/);
          assert.match(status.readOnlyKeys, /option.watchedListCollection.*Current value: Off.*does not verify that the TV accepts the change or clears stored viewing history/);
          assert.match(status.readOnlyKeys, /option.usageCare.*Current value: Off.*does not verify its effect on data collection/);
          assert.match(status.readOnlyKeys, /option.dbgLogUpload.*Current value: Off.*does not verify whether uploads stop/);
          assert.match(status.readOnlyKeys, /option.faultLogUpload.*Current value: On.*does not verify whether uploads stop/);
          assert.match(status.readOnlyKeys, /option.thirdPartyCookie.*Current value: Off.*does not verify HbbTV behavior on another G5 firmware/);
          const requestedG5Keys = await browser.evaluate("window.__privacyShieldFixture.calls.filter((call) => call.method === 'getSystemSettings' && call.parameters.category).flatMap((call) => call.parameters.keys || [])");
          for (const key of ["aiNudge", "screenSaverAd", "homePromotion", "watchedListCollection", "usageCare", "dbgLogUpload", "faultLogUpload", "thirdPartyCookie"]) {
            assert.ok(requestedG5Keys.includes(key), `${key} should be read only for the matching G5 software tuple`);
          }
          for (const consentOrUnmappedKey of ["voiceAllowed", "voice2Allowed", "launchEulaByHome", "adCookie"]) {
            assert.ok(!requestedG5Keys.includes(consentOrUnmappedKey), `${consentOrUnmappedKey} must not be queried or treated as an app setting`);
          }
          for (const key of ["screenSaverAd", "homePromotion", "aiNudge"]) {
            await browser.evaluate(`document.querySelector('[data-setting=${key}]').click()`);
            await waitFor(async () => (await browser.evaluate(`document.querySelector('[data-setting=${key}]').closest('.switch').querySelector('.switch-state').textContent`)) === "Off", `G5 ${key} direct write/readback`);
            const write = await browser.evaluate(`(() => {
              const writes = window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.parameters.category === 'general' && call.parameters.settings && Object.prototype.hasOwnProperty.call(call.parameters.settings, '${key}'));
              return { value: window.__privacyShieldFixture.settings.${key}, writes: writes.length, payload: writes.at(-1)?.parameters.settings.${key} };
            })()`);
            assert.equal(write.value, "off");
            assert.equal(write.writes, 1);
            assert.equal(write.payload, "off");
          }
          assert.equal(status.writerCalls, 0, "the compatibility view itself must not write settings");
        }
      });
    }

    // Exercise the full model-family × installed-software cross-product. This
    // is a parser/service/UI simulation, not a claim that every firmware path
    // exists as an OTA upgrade for every physical TV.
    const matrixPlatforms = [
      { token: "6x", display: "6.x" }, { token: "22", display: "22" },
      { token: "23", display: "23" }, { token: "24", display: "24" },
      { token: "25", display: "25" }, { token: "26", display: "26" }
    ];
    const baseMappedKeys = ["livePlus", "screenSaverAd", "homePromotion", "livePromotion", "contentRecommendation"];
    const publicCohorts = require("../webos-app/src/community-reference.js").COHORTS;
    for (const series of ["B", "C", "G"]) {
      for (let generation = 1; generation <= 6; generation += 1) {
        for (const platform of matrixPlatforms) {
          const scenario = `matrix-${series}${generation}-p${platform.token}`;
          const model = `OLED65${series}${generation}SIM`;
          await browser.evaluate("localStorage.clear()");
          await browser.navigate(scenario);
          await waitFor(async () => await browser.evaluate(`(() => {
            const runtime = document.querySelector('#runtime-mode').textContent;
            return /TV status updated|Some TV status unavailable/.test(runtime)
              || window.__privacyShieldFixture.errors.length > 0;
          })()`), `${scenario} model fixture`);
          const status = await browser.evaluate(`(() => ({
            model: document.querySelector('#model-name').textContent,
            family: document.querySelector('#community-cohort').textContent,
            version: document.querySelector('#webos-version').textContent,
            profile: document.querySelector('#compatibility-status').textContent,
            compatibilitySummary: document.querySelector('#compatibility-summary').textContent,
            errors: window.__privacyShieldFixture.errors,
            switches: [...document.querySelectorAll('[data-setting]')].map((input) => ({ key: input.dataset.setting, disabled: input.disabled, state: input.closest('.switch').querySelector('.switch-state').textContent })),
            mappedKeys: [...document.querySelectorAll('#mapped-settings-list li')].map((item) => item.innerText).join(' | '),
            readOnlyKeys: [...document.querySelectorAll('#research-only-setting-list li')].map((item) => item.innerText).join(' | '),
            readOnlySectionHidden: document.querySelector('#research-only-setting-details').hidden,
            presetDisabled: document.querySelector('#privacy-preset').disabled,
            settingReads: window.__privacyShieldFixture.calls.filter((call) => call.service === window.__privacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).map((call) => call.parameters.keys),
            missingCurrentServiceProbes: window.__privacyShieldFixture.calls.filter((call) => call.service === 'luna://com.webos.settingsservice' && call.service !== window.__privacyShieldFixture.activeSettingsUri && call.method === 'getSystemSettings' && call.parameters.category).length,
            writerCalls: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' || call.method === 'updateDNS' || (call.method === 'exec' && /device_control\\.py/.test(call.parameters.command || ""))).length
          }))()`);
          assert.equal(status.model, model);
          assert.deepEqual(status.errors, [], `${scenario} browser profile errors`);
          assert.match(status.family, new RegExp(`${series}${generation} · ${2020 + generation} OLED family`));
          const cohort = publicCohorts.find((entry) => entry.series === `${series}${generation}`);
          assert.match(status.family, new RegExp(`launch version webOS ${cohort.launchWebOS.replace(".", "\\.")}`));
          assert.match(status.version, new RegExp(`webOS ${platform.display.replace(".", "\\.")}`));
          assert.equal(status.profile, `${series}${generation} · webOS ${platform.display}`);
          const expectedKeys = [...baseMappedKeys];
          if (["22", "23", "24", "25", "26"].includes(platform.token)) expectedKeys.push("lmt");
          if (platform.token === "24") expectedKeys.push("aiNudge", "aiSettingsNudge");
          if (series === "C" && generation === 2 && platform.token === "22") expectedKeys.push("aiNudge", "aiSettingsNudge");
          if (series === "C" && generation === 5 && platform.token === "25") {
            expectedKeys.push("voiceLongDistance", "thirdPartyCookie");
          }
          const missingKey = series === "B" && generation === 1 && platform.token === "6x" ? "screenSaverAd" : null;
          const mapped = status.switches.filter((item) => !item.disabled);
          const readOnlyKeys = platform.token === "26"
            ? ["general.sportsAlarm", "option.webOSPromotionVideo", "option.promotionStreamer"]
            : series === "C" && generation === 5 && platform.token === "25"
              ? ["option.watchedListCollection", "option.usageCare", "option.dbgLogUpload", "option.faultLogUpload"]
              : [];
          assert.equal(mapped.length, expectedKeys.length - (missingKey ? 1 : 0));
          assert.equal(status.presetDisabled, false);
          assert.deepEqual(status.settingReads.flat().sort(), [...expectedKeys, ...readOnlyKeys.map((entry) => entry.split(".")[1])].sort(), "the UI reads mapped controls and source-scoped read-only keys only");
          assert.equal(status.settingReads.length, expectedKeys.length + readOnlyKeys.length, "each mapped or read-only candidate is requested once from the active SettingsService");
          assert.ok(status.settingReads.every((keys) => keys.length === 1), "a missing key must not fail a whole category request");
          assert.equal(status.missingCurrentServiceProbes, platform.token === "6x" ? expectedKeys.length : 0, "webOS 6 probes the current URI before using the legacy SettingsService");
          assert.equal(status.writerCalls, 0, "initial profile detection and reads must never write settings");
          if (series === "C" && generation === 2 && platform.token === "22") {
            assert.match(status.mappedKeys, /general\.lmt.*Glasshouse dashboard · C2\/webOS 22 root map/);
            assert.match(status.mappedKeys, /general\.aiNudge.*Glasshouse C2\/webOS 22 sample fixture/);
            assert.match(status.mappedKeys, /general\.aiSettingsNudge.*Glasshouse C2\/webOS 22 sample fixture/);
          }
          if (series === "C" && generation === 5 && platform.token === "25") {
            assert.match(status.readOnlyKeys, /option.watchedListCollection.*Current value: On/);
            assert.match(status.readOnlyKeys, /option.usageCare.*Current value: On/);
            assert.match(status.readOnlyKeys, /option.dbgLogUpload.*Current value: On/);
            assert.match(status.readOnlyKeys, /option.faultLogUpload.*Current value: Off/);
            assert.match(status.compatibilitySummary, /does not identify the exact TV or firmware/);
          }
          if (readOnlyKeys.length) {
            for (const key of readOnlyKeys) assert.match(status.readOnlyKeys, new RegExp(`${key}.*Current value:`));
            assert.equal(status.readOnlySectionHidden, false);
            assert.equal(status.switches.some((item) => readOnlyKeys.some((entry) => entry.endsWith(`.${item.key}`))), false, "read-only research keys have no switch");
          } else {
            assert.equal(status.readOnlyKeys, "");
            assert.equal(status.readOnlySectionHidden, true);
          }
          if (missingKey) {
            assert.equal(status.switches.find((item) => item.key === "screenSaverAd").state, "Unavailable");
            await browser.press("ArrowRight");
            await browser.press("ArrowDown");
            await browser.press("Enter");
            await waitFor(async () => (await browser.evaluate("document.querySelector('#control-status').textContent")) === "Recommended privacy settings applied.", "partial preset readback with one unavailable mapped setting");
            const partialPreset = await browser.evaluate(`(() => ({
              settings: { ...window.__privacyShieldFixture.settings },
              writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings' && call.service === 'luna://com.webos.service.settings').map((call) => call.parameters.settings)
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
              value: window.__privacyShieldFixture.settings.thirdPartyCookie,
              writes: window.__privacyShieldFixture.calls.filter((call) => call.method === 'setSystemSettings').map((call) => call.parameters.settings.thirdPartyCookie)
            }))()`);
            assert.equal(cookieWrite.value, "offByUser");
            assert.deepEqual(cookieWrite.writes, ["offByUser"], "the C5 value domain is written and read back as published");
          }
        }
      }
    }

    if (process.env.PRIVACYSHIELD_DOC_SCREENSHOT_DIR) {
      await captureDocumentationScreenshots(browser, process.env.PRIVACYSHIELD_DOC_SCREENSHOT_DIR);
    }
  } finally {
    if (browser) await browser.stop();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    try { fs.rmdirSync(SCRATCH_ROOT); } catch (_) { /* preserve shared or non-empty task scratch */ }
  }
});

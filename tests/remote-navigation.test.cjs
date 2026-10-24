const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const Remote = require("../webos-app/src/remote-navigation.js");

function node(left, top, width = 100, height = 40) {
  return { getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }) };
}

test("normalizes LG Magic Remote key codes and browser key names", () => {
  assert.equal(Remote.keyFromEvent({ keyCode: 37 }), "ArrowLeft");
  assert.equal(Remote.keyFromEvent({ which: 40 }), "ArrowDown");
  assert.equal(Remote.keyFromEvent({ keyCode: 13 }), "Enter");
  assert.equal(Remote.keyFromEvent({ keyCode: 461 }), "Back");
  assert.equal(Remote.keyFromEvent({ key: "ArrowRight" }), "ArrowRight");
  assert.equal(Remote.keyFromEvent({ key: " " }), "Space");
  assert.equal(Remote.keyFromEvent({ key: "x", keyCode: 88 }), "");
});

test("moves to the nearest candidate in the requested direction", () => {
  const origin = node(100, 100);
  const nearRight = node(240, 105);
  const farRight = node(520, 100);
  const left = node(0, 100);
  const below = node(100, 240);
  assert.equal(Remote.directionalCandidate(origin, [farRight, left, below, nearRight], "ArrowRight"), nearRight);
  assert.equal(Remote.directionalCandidate(origin, [farRight, left, below, nearRight], "ArrowDown"), below);
  assert.equal(Remote.directionalCandidate(origin, [farRight, left, below, nearRight], "ArrowLeft"), left);
});

test("prefers an aligned target over a nearby target far off the navigation axis", () => {
  const origin = node(100, 100);
  const diagonal = node(210, 330);
  const aligned = node(460, 102);
  assert.equal(Remote.directionalCandidate(origin, [diagonal, aligned], "ArrowRight"), aligned);
});

test("does not wrap across the opposite edge when there is no target", () => {
  const origin = node(200, 100);
  const left = node(40, 100);
  assert.equal(Remote.directionalCandidate(origin, [left], "ArrowRight"), null);
});

test("webOS manifest opts into explicit Back handling and app loads navigation support", () => {
  const appRoot = path.join(__dirname, "..", "webos-app");
  const appInfo = JSON.parse(fs.readFileSync(path.join(appRoot, "appinfo.json"), "utf8"));
  const html = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(appRoot, "src", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(appRoot, "styles.css"), "utf8");
  assert.equal(appInfo.disableBackHistoryAPI, true);
  assert.match(html, /src="src\/remote-navigation\.js"/);
  assert.ok(html.indexOf("src/remote-navigation.js") < html.indexOf("src/app.js"));
  assert.match(appSource, /addEventListener\("keydown", handleRemoteKey\)/);
  assert.match(appSource, /setView\("overview", \$\("\.tab\[data-view='overview'\]"\)\)/);
  assert.match(css, /\.switch\.remote-focused \.switch-track/);
  assert.match(html, /Arrows move · OK selects/);
});

test("privacy controls stay disabled until TV state has been verified", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "webos-app", "index.html"), "utf8");
  for (const key of ["livePlus", "voiceLongDistance", "turnOnByVoice"]) {
    assert.match(html, new RegExp(`data-setting="${key}" disabled`));
  }
  assert.match(html, /id="privacy-preset" disabled/);
});

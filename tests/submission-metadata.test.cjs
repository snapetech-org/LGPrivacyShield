const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const metadata = fs.readFileSync(path.join(__dirname, "../submission/org.privacyshield.webos.yml"), "utf8");

test("Homebrew listing states its model limits and Ko-fi support link", () => {
  assert.match(metadata, /Support development on \[Ko-fi\]\(https:\/\/ko-fi\.com\/snapetech\)\./);
  assert.match(metadata, /funding:\s*\n\s+ko_fi:\s*\[snapetech\]/);
  assert.match(metadata, /Review 15 privacy settings/);
  assert.match(metadata, /Settings can be changed only on the validated OLED77C6HUP/);
  assert.match(metadata, /webosRelease: '\>=6\.0'/);
});

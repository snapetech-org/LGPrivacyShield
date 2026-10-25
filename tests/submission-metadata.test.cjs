const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const metadata = fs.readFileSync(path.join(__dirname, "../submission/org.privacyshield.webos.yml"), "utf8");
const normalizedMetadata = metadata.replace(/\s+/g, " ");

test("Homebrew listing states readback limits and includes the Ko-fi support link", () => {
  assert.match(metadata, /Support development on \[Ko-fi\]\(https:\/\/ko-fi\.com\/snapetech\)\./);
  assert.match(metadata, /funding:\s*\n\s+ko_fi:\s*\[snapetech\]/);
  assert.match(metadata, /Review 17 privacy settings/);
  assert.match(normalizedMetadata, /A switch is enabled only when the TV returns a readable value/);
  assert.match(normalizedMetadata, /each change is confirmed by readback/);
  assert.doesNotMatch(metadata, /only on the validated OLED77C6HUP/);
  assert.match(metadata, /webosRelease: '\>=6\.0'/);
});

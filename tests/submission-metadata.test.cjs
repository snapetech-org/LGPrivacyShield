const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const metadata = fs.readFileSync(path.join(__dirname, "../submission/org.privacyshield.webos.yml"), "utf8");
const normalizedMetadata = metadata.replace(/\s+/g, " ");

test("Homebrew listing describes the current app and includes support details", () => {
  assert.match(metadata, /Support development on \[Ko-fi\]\(https:\/\/ko-fi\.com\/snapetech\)\./);
  assert.match(metadata, /funding:\s*\n\s+ko_fi:\s*\[snapetech\]/);
  const shortDescription = metadata.match(/^shortDescription: (.+)$/m)?.[1];
  assert.ok(shortDescription, "a concise listing summary is present");
  assert.ok(shortDescription.length <= 80, "the listing summary fits Homebrew's 80-character limit");
  assert.match(normalizedMetadata, /Review LG TV privacy settings and agreement choices/);
  assert.match(normalizedMetadata, /save settings to restore later/);
  assert.match(normalizedMetadata, /LGPrivacyShield runs locally; the app and TV send no data during normal use/);
  assert.match(normalizedMetadata, /Scan one QR code with a phone to open a prefilled GitHub form/);
  assert.doesNotMatch(metadata, /installed apps|diagnostic upload settings|model references/i);
  assert.doesNotMatch(metadata, /only on the validated OLED77C6HUP/);
  assert.match(metadata, /webosRelease: '\>=6\.0'/);

  const screenshots = [...metadata.matchAll(/^  - url: https:\/\/raw\.githubusercontent\.com\/snapetech-org\/LGPrivacyShield\/main\/docs\/screenshots\/([\w-]+\.png)$/gm)];
  assert.equal(screenshots.length, 8, "each main page has dark and light catalog screenshots");
  for (const [, filename] of screenshots) {
    assert.ok(fs.existsSync(path.join(__dirname, "../docs/screenshots", filename)), `${filename} exists`);
  }
});

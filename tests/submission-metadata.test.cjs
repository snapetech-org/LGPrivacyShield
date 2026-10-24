const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const metadata = fs.readFileSync(path.join(__dirname, "../submission/org.privacyshield.webos.yml"), "utf8");

test("Homebrew draft includes the Ko-fi link and supported funding field", () => {
  assert.match(metadata, /Support PrivacyShield development on \[Ko-fi\]\(https:\/\/ko-fi\.com\/snapetech\)\./);
  assert.match(metadata, /funding:\s*\n\s+ko_fi:\s*\[snapetech\]/);
  assert.match(metadata, /Review and change 15 LG TV privacy settings/);
});

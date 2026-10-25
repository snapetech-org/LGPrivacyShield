const assert = require("node:assert/strict");
const test = require("node:test");
const catalog = require("../webos-app/src/firmware-catalog.js");

test("matches the installed C6H model and firmware to a checksummed archive build", () => {
  const result = catalog.lookup({ model: "OLED77C6HUP.ACCQLJD", firmware: "43.21.79" });
  assert.equal(result.modelIndexed, true);
  assert.equal(result.packageMatchCount, 1);
  assert.deepEqual(result.otaIds, ["HE_DTV_W26O_AFABATAA"]);
  assert.equal(result.packageMatches[0].firmwareVersion, "43.21.79.01");
  assert.match(catalog.describe(result), /privacy settings have not been read from the package/);
});

test("matches the firmware archive's B1 W21U records instead of dropping that family", () => {
  const record = catalog.source && require("../data/lg-oled-firmware-catalog.json").records
    .find((item) => item.families.includes("B1"));
  assert.ok(record);
  const model = record.models[0];
  const result = catalog.lookup({ model, firmware: record.firmwareVersion });
  assert.equal(result.modelIndexed, true);
  assert.ok(result.packageMatches.some((item) => item.otaId.startsWith("HE_DTV_W21U_")));
});

test("does not claim a firmware match when the model or installed version is absent", () => {
  const unknownModel = catalog.lookup({ model: "OLED65CSPSA", firmware: "43.21.79" });
  assert.equal(unknownModel.modelIndexed, false);
  assert.match(catalog.describe(unknownModel), /Privacy controls are checked against the TV itself/);

  const unknownVersion = catalog.lookup({ model: "OLED77C6HUP", firmware: "99.99.99" });
  assert.equal(unknownVersion.modelIndexed, true);
  assert.equal(unknownVersion.packageMatchCount, 0);
  assert.match(catalog.describe(unknownVersion), /archive has no package listed/);
});

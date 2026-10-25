(function (root, factory) {
  const data = typeof module === "object" && module.exports
    ? require("./firmware-catalog-data.js")
    : root.LGPrivacyShieldFirmwareData;
  if (typeof module === "object" && module.exports) module.exports = factory(data);
  else root.LGPrivacyShieldFirmwareCatalog = factory(data);
})(typeof globalThis !== "undefined" ? globalThis : this, function (data) {
  "use strict";

  function string(value) {
    return typeof value === "string" ? value.trim().toUpperCase() : "";
  }

  function modelRoot(value) {
    let model = string(value).replace(/^\[LG\]\s*/, "").replace(/^LG\s+/, "");
    const match = model.match(/(?:^|\s)(OLED\d{2,3}[A-Z0-9]+)(?:\.[A-Z0-9]+)?(?:$|\s)/);
    return match ? match[1] : "";
  }

  function firmwareVersion(value) {
    const match = string(value).match(/^(\d+\.\d+\.\d+)(?:\.01)?$/);
    return match ? match[1] : "";
  }

  function lookup(device) {
    const identity = device && typeof device === "object" ? device : {};
    const model = modelRoot(identity.model);
    const firmware = firmwareVersion(identity.firmware);
    const indexedModels = model
      ? data.records.filter((record) => record.models.some((item) => modelRoot(item) === model))
      : [];
    const matchingBuilds = firmware
      ? indexedModels.filter((record) => firmwareVersion(record.firmwareVersion) === firmware)
      : [];
    const packages = new Map();
    for (const record of matchingBuilds) {
      const key = `${record.otaId}:${record.zipSha256}:${record.epkSha256}`;
      packages.set(key, record);
    }
    return Object.freeze({
      model,
      firmware,
      modelIndexed: indexedModels.length > 0,
      modelBuildCount: indexedModels.length,
      packageMatches: Object.freeze([...packages.values()]),
      packageMatchCount: packages.size,
      otaIds: Object.freeze([...new Set([...packages.values()].map((record) => record.otaId))].sort()),
      source: data.source
    });
  }

  function describe(result) {
    if (!result || !result.model) return "No firmware record matches this model.";
    if (!result.modelIndexed) return "This model is not listed in the firmware archive. Privacy controls are checked against the TV itself.";
    if (!result.firmware) return `The archive lists ${result.modelBuildCount} firmware packages for this model. The installed version was not identified.`;
    if (!result.packageMatchCount) return `The archive has no package listed for ${result.model} on ${result.firmware}. Privacy controls are checked against the TV itself.`;
    if (result.packageMatchCount === 1) {
      const record = result.packageMatches[0];
      return `The archive lists a matching firmware package (${record.firmwareVersion}). Its privacy settings have not been read from the package; controls still depend on the TV's own settings and readback.`;
    }
    return `The archive lists ${result.packageMatchCount} packages for ${result.model} on ${result.firmware}. The exact regional package is unresolved; no controls are inferred from this list.`;
  }

  return Object.freeze({
    buildCount: data.packageBuildCount,
    coverage: data.coverage,
    describe,
    lookup,
    modelCount: data.modelCount,
    source: data.source
  });
});

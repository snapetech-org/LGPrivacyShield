(function (root, factory) {
  const data = typeof module === "object" && module.exports
    ? require("./community-data.js")
    : root.PrivacyShieldCommunityData;
  if (typeof module === "object" && module.exports) module.exports = factory(data);
  else root.PrivacyShieldCommunityReference = factory(data);
})(typeof globalThis !== "undefined" ? globalThis : this, function (data) {
  "use strict";

  const SOURCES = Object.freeze({
    modelCatalog: Object.freeze({
      id: "optoutof-lg-model-catalog",
      name: "Opt Out Of LG model catalog",
      url: "https://optoutof.com/tv/",
      modelGuideBaseUrl: "https://optoutof.com/tv/lg/",
      settingsUrl: "https://optoutof.com/tv/lg/settings/",
      checkedOn: "2026-10-24",
      snapshotSha256: "324475eccb75ebdc1eb7eefbba6ab6672266214b1c4445db76b87c580b861cf8"
    }),
    lgPlatform: Object.freeze({
      id: "lg-webos-platform-engine-table",
      name: "LG webOS TV Web API and Web Engine table",
      url: "https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine"
    }),
    glasshouse: Object.freeze({
      id: "glasshouse-2026-10-24",
      name: "Glasshouse tested-TV table and privacy research",
      url: "https://github.com/rorygallagher2024/glasshouse",
      testedTvUrl: "https://rorygallagher2024.github.io/glasshouse/tested-tvs/",
      researchUrl: "https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/",
      acrUrl: "https://rorygallagher2024.github.io/glasshouse/ACR/",
      revision: "a1b93a218222034934004d502aeff3f111dfd411",
      checkedOn: "2026-10-24",
      declaredModelCount: 48,
      listedModelCount: 49,
      declaredSeriesCount: 33,
      accessContext: "Root-run TV server/helper; not PrivacyShield app ACG access"
    }),
    glasshouseDashboard: Object.freeze({
      id: "glasshouse-dashboard-c2-lmt-2026-10-24",
      name: "Glasshouse dashboard C2 Limit Ad Tracking source",
      url: "https://github.com/gnacho/lg-webos-dashboard",
      privacyMapUrl: "https://github.com/gnacho/lg-webos-dashboard/blob/6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1/server/lib/privacy.js",
      testedTvUrl: "https://github.com/gnacho/lg-webos-dashboard/blob/6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1/README.md",
      revision: "6d1eca0f0e171836cfbd5e796cf8cf47c2ef7ae1",
      checkedOn: "2026-10-24",
      accessContext: "Root-run dashboard code writes general.lmt and checks the ad-service LMT value on a C2/webOS 9.2; its tested-TV table lists OLED42C24LA, but the source does not tie that exact row to the key test"
    }),
    cleanYourTV: Object.freeze({
      id: "cleanyourtv-2026-10-24",
      name: "CleanYourTV tested-TV and debloat documentation",
      url: "https://github.com/lasharor/cleanyourtv-WebOS",
      testedModelsUrl: "https://lasharor.github.io/cleanyourtv-WebOS/tested-tvs/",
      debloatUrl: "https://lasharor.github.io/cleanyourtv-WebOS/debloat/",
      revision: "5736f246d0192d78c9bed9b3ba66f8e2ac945c5b",
      checkedOn: "2026-10-24",
      accessContext: "Root service and boot integration; not PrivacyShield app ACG access"
    }),
    webosUnclutter: Object.freeze({
      id: "webos-unclutter-2026-10-24",
      name: "webOS Unclutter telemetry baseline",
      url: "https://github.com/sonodima/webos-unclutter",
      revision: "087c7b477071c9ae325aea20ad9b2ba834f7de61",
      checkedOn: "2026-10-24",
      accessContext: "Network telemetry baseline from a European C1; exact model and firmware are not published"
    }),
    kallistoC1Capture: Object.freeze({
      id: "kallistox-c1-dns-sni-2026-09",
      name: "KallistoX European C1 DNS/SNI capture",
      url: "https://gist.github.com/KallistoX/ca0413c63e58799ecdfc516b64d603ff/486d45730c7f088cf7d25e235c9fc9e3cf27798d",
      reportUrl: "https://www.reddit.com/r/Ubiquiti/comments/1wgzqo6/measured_what_an_lg_webos_tv_actually_phones_home/",
      revision: "486d45730c7f088cf7d25e235c9fc9e3cf27798d",
      checkedOn: "2026-10-24",
      license: "No license stated; PrivacyShield records findings only and does not redistribute the script or domain list",
      accessContext: "Owner-run 40-minute gateway DNS/SNI capture of one European C1 after TV privacy settings were opted out; no exact model or firmware was published"
    }),
    lgTvBlocklist: Object.freeze({
      id: "lg-tv-blocklist-g1-2026-10-24",
      name: "LG TV Blocklist G1 network audit",
      url: "https://github.com/furkan-bayrak/lg-tv-blocklist",
      methodologyUrl: "https://github.com/furkan-bayrak/lg-tv-blocklist/blob/main/docs/methodology.md",
      revision: "68afe10de07bfdc8e8ecf91a7069a17419597271",
      checkedOn: "2026-10-24",
      license: "CC BY 4.0 for lists/data; MIT for scripts",
      accessContext: "Two-week German network/root audit of one LG G1; exact model, firmware, and webOS build were not recorded"
    }),
    lifesGoodWithoutSpying: Object.freeze({
      id: "lifes-good-without-spying-g4-2026-10-24",
      name: "Life's Good Without Spying tested G4",
      url: "https://github.com/lewisdoesstuff/lifesgoodwithoutspying",
      revision: "8c427116eb76b94e9c9aa05440a2039650195b28",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Rooted Homebrew app, maintainer-reported test on OLED65G45LW (EU), webOS TV 9.2.4, firmware 23.23.30; the author says other webOS versions are reported, not personally tested"
    }),
    webosDebloat: Object.freeze({
      id: "webos-debloat-gist-2026-10-24",
      name: "webos-debloat reversible settings map",
      url: "https://gist.github.com/lucataco/7c303b443934008a9031a55cfca552ec/a269896606b83a31bb85f2f25146b51ceb876fe6",
      revision: "a269896606b83a31bb85f2f25146b51ceb876fe6",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Root shell and SettingsService; tested on one US 2026 LG OLED, reported webOS 26 / firmware 11.2; exact model code and full firmware tuple are not published"
    }),
    webosbrewHiddenSettings: Object.freeze({
      id: "webosbrew-hidden-settings-2026-10-24",
      name: "webOS Homebrew hidden system settings reference",
      url: "https://www.webosbrew.org/pages/hidden-system-settings",
      checkedOn: "2026-10-24",
      accessContext: "Public SettingsService key reference with root-shell luna-send examples; no specific model or firmware is identified"
    }),
    lookingGlass: Object.freeze({
      id: "looking-glass-2026-09-23",
      name: "Looking Glass 2021 webOS investigation report",
      url: "https://github.com/richknowles/looking-glass/blob/master/investigation-report.md",
      revision: "33d9abff1f651acd9cdf6198ffb5836650de97d8",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Owner report from one rooted LG webOS 6.0 TV said to be a 2021 model; exact model, region, and firmware are not published"
    }),
    tvAcrFirmwareResearch: Object.freeze({
      id: "tv-acr-firmware-research-lg-43-21-73",
      name: "TV ACR Firmware Research — LG build 43.21.73",
      url: "https://github.com/xusheng6/tv-acr-research",
      lgAnalysisUrl: "https://github.com/xusheng6/tv-acr-research/blob/327a5f1d52351f63fb6b11b8c322f289aeb6752c/docs/vendors/lg.md",
      corpusUrl: "https://github.com/xusheng6/tv-acr-research/blob/327a5f1d52351f63fb6b11b8c322f289aeb6752c/docs/corpus.md",
      revision: "327a5f1d52351f63fb6b11b8c322f289aeb6752c",
      firmwareSha256: "88b76f9814da8f3452105acbc2b7ddd4a2bc5514fdfbddb38e98be6ca591d76e",
      firmwareBuild: "43.21.73.01-HE_DTV_W25O_AFABATAA",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Static analysis of one secured LG webOS EPK; exact TV model, region, and installed runtime state are not published"
    }),
    tvHomeC5Audit: Object.freeze({
      id: "tv-home-c5-root-privacy-audit-2026-10",
      name: "tv-home C5 root privacy audit",
      url: "https://github.com/astelmach20/tv-home",
      privacyUrl: "https://github.com/astelmach20/tv-home/blob/3ccf07458cba16b0815619f0056140927e546fb1/PRIVACY.md",
      debloatUrl: "https://github.com/astelmach20/tv-home/blob/3ccf07458cba16b0815619f0056140927e546fb1/tv/init.d/55-debloat",
      revision: "3ccf07458cba16b0815619f0056140927e546fb1",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Owner-run root audit on an OLED C5 (2025), webOS 11; exact model, region, and firmware are not published"
    }),
    ownYourGlass: Object.freeze({
      id: "own-your-glass-2026-10-24",
      name: "own-your-glass root hardening findings",
      url: "https://github.com/JulioFerrero/own-your-glass",
      verificationReportUrl: "https://github.com/JulioFerrero/own-your-glass/blob/56a60fde6e112c081aa11541d3d2655a661aceae/docs/VERIFICATION-REPORT.md",
      findingsUrl: "https://github.com/JulioFerrero/own-your-glass/blob/56a60fde6e112c081aa11541d3d2655a661aceae/docs/FINDINGS.md",
      revision: "56a60fde6e112c081aa11541d3d2655a661aceae",
      checkedOn: "2026-10-24",
      accessContext: "Its published verification report identifies an OLED55B56LA running webOS 10.3.1 and records SettingsService-backed privacy observations; a later project overview describes webOS 10.3.2 without a model tuple. The B5 report does not publish a firmware version."
    }),
    level1techsG5: Object.freeze({
      id: "level1techs-g5-root-privacy-guide-2026-09",
      name: "Level1Techs LG G5 rooted privacy guide",
      url: "https://forum.level1techs.com/t/lg-tv-block-mini-how-to/255178",
      scriptUrl: "https://forum.level1techs.com/uploads/short-url/ycufCLNAeQsvtaQgfbqJkJMGpML.txt",
      checkedOn: "2026-10-24",
      accessContext: "The author names OLED65G5WUA on webOS 10.2.1 as the sole tested target. The numerical firmware version is not published. Its helper directly edits preference JSON as root; no PrivacyShield app-side SettingsService read/write test is reported. No license is stated for the attached script; PrivacyShield records findings and does not redistribute it."
    }),
    webosLockout: Object.freeze({
      id: "webos-lockout-c5-oled77c51la-2026-10-24",
      name: "webos_lockout C5 privacy preference report",
      url: "https://github.com/josippapez/webos_lockout",
      readmeUrl: "https://github.com/josippapez/webos_lockout/blob/bc1b170f86aeb6bca176da5a9324158c759baa11/README.md",
      scriptUrl: "https://github.com/josippapez/webos_lockout/blob/bc1b170f86aeb6bca176da5a9324158c759baa11/tv/lockout.sh",
      revision: "bc1b170f86aeb6bca176da5a9324158c759baa11",
      checkedOn: "2026-10-24",
      license: "MIT",
      accessContext: "Root boot script built and verified on OLED77C51LA / Rockhopper 10.3.1-3006. The numeric LG firmware version is not published; the script edits preference JSON directly and is not a PrivacyShield app-side SettingsService test."
    }),
    acrResearch: Object.freeze({
      id: "imc-2024-acr-study",
      name: "IMC 2024 LG/Samsung ACR network study",
      url: "https://discovery.ucl.ac.uk/id/eprint/10200730/",
      codeUrl: "https://github.com/SafeNetIoT/ACR",
      codeRevision: "bdc56aa85ffc6beac46340890f349648c09040b5",
      paperTitle: "Watching TV with the Second-Party: A First Look at Automatic Content Recognition Tracking in Smart TVs",
      checkedOn: "2026-10-24",
      accessContext: "Black-box network measurement; sample-specific evidence, not a settings/API map"
    })
  });

  const MICROPHONE_EVIDENCE = Object.freeze({
    B1: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    C1: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    G1: Object.freeze({ status: "absent", sourceType: "manufacturer-specification", sources: Object.freeze(["https://www.lg.com/de/tvs-und-soundbars/oled-evo/oled65g19la/"]), summary: "LG's German specification lists Hands-free Voice Control as No." }),
    B2: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    C2: Object.freeze({ status: "reported-present", sourceType: "independent-review", sources: Object.freeze(["https://www.reviewed.com/televisions/content/lg-c2-oled-tv-review"]), summary: "A C2 review reports a built-in far-field microphone. This is a secondary source, not an exact PrivacyShield hardware check." }),
    G2: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    B3: Object.freeze({ status: "absent", sourceType: "manufacturer-specification", sources: Object.freeze(["https://dzrf1tezfwb3j.cloudfront.net/uploads/CEDocuments//2023-04-24-16-07-15.pdf"]), summary: "LG's US specification sheet marks hands-free voice control as not included." }),
    C3: Object.freeze({ status: "present", sourceType: "manufacturer-specification-copy", sources: Object.freeze(["https://valueelectronics.com/wp-content/uploads/2023/01/LG-OLED_C3_Series_2023_SpecSheet.pdf"]), summary: "LG's C3 specification sheet lists hands-free voice control for the listed C3 sizes." }),
    G3: Object.freeze({ status: "present", sourceType: "manufacturer-specification-copy", sources: Object.freeze(["https://valueelectronics.com/wp-content/uploads/2023/03/LG-OLED_G3_Series_SpecSheet.pdf"]), summary: "LG's G3 specification sheet lists hands-free voice control." }),
    B4: Object.freeze({ status: "reported-absent", sourceType: "manufacturer-support-answer-via-retailer", sources: Object.freeze(["https://www.bestbuy.com/site/questions/lg-77-class-b4-series-oled-4k-uhd-smart-webos-tv-2024/6578055/question/a1793a6f-457d-3306-a3ad-d6087c80bce7"]), summary: "LG Digital Customer Care said in a retailer Q&A that the B4 has no built-in microphone; the remote microphone remains separate." }),
    C4: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    G4: Object.freeze({ status: "present", sourceType: "manufacturer-specification", sources: Object.freeze(["https://media.us.lg.com/m/782ce7fabc624d5e/original/OLED-G4-Series-Spec-Sheet.pdf"]), summary: "LG's US specification sheet lists hands-free voice control." }),
    B5: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence; omission is not proof that one is absent." }),
    C5: Object.freeze({ status: "conflicting", sourceType: "regional-manufacturer-documents", sources: Object.freeze([
      "https://www.lg.com/uk/tvs-soundbars/oled-evo/oled55c54la/",
      "https://www.lg.com/pl/lgecs.downloadFile.ldwf?DOC_ID=20250117237409&FILE_NAME=OLED55C54LA_PIS%5B20250117040255970%5D.pdf&GSRI_DOC=GSRI&ORIGINAL_NAME_b1_a1=OLED55C54LA_PIS.pdf&SPEC_DOWNLOAD=N&TC=DwnCmd"
    ]), summary: "LG UK's product page lists hands-free voice control; LG's EU product sheet says no voice-recognition sensor. Region and exact variant need checking." }),
    G5: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence." }),
    B6: Object.freeze({ status: "unknown", sourceType: "research-gap", sources: Object.freeze([]), summary: "This catalog contains no family-specific source that confirms microphone presence or absence; omission is not proof that one is absent." }),
    C6: Object.freeze({ status: "variant-limited", sourceType: "manufacturer-product-page", sources: Object.freeze(["https://www.lg.com/au/tv-soundbars/oled-evo-tv/oled65c6psa/"]), summary: "LG lists far-field voice recognition on a standard 65-inch C6. The separate 77/83-inch C6H variant is not covered; its microphone state remains unknown." }),
    G6: Object.freeze({ status: "present", sourceType: "manufacturer-product-page", sources: Object.freeze(["https://www.lg.com/au/tv-soundbars/oled-evo-tv/oled65g6psb/"]), summary: "LG lists far-field voice recognition on the G6 model page." })
  });

  const COHORTS = Object.freeze([
    ["B1", 2021, "6.x", [55, 65, 77]],
    ["C1", 2021, "6.x", [48, 55, 65, 77, 83]],
    ["G1", 2021, "6.x", [55, 65, 77, 83]],
    ["B2", 2022, "22", [55, 65, 77]],
    ["C2", 2022, "22", [42, 48, 55, 65, 77, 83]],
    ["G2", 2022, "22", [55, 65, 77, 83, 97]],
    ["B3", 2023, "23", [55, 65, 77]],
    ["C3", 2023, "23", [42, 48, 55, 65, 77, 83]],
    ["G3", 2023, "23", [55, 65, 77, 83]],
    ["B4", 2024, "24", [48, 55, 65, 77, 83]],
    ["C4", 2024, "24", [42, 48, 55, 65, 77, 83]],
    ["G4", 2024, "24", [55, 65, 77, 83, 97]],
    ["B5", 2025, "25", [48, 55, 65, 77, 83]],
    ["C5", 2025, "25", [42, 48, 55, 65, 77, 83]],
    ["G5", 2025, "25", [48, 55, 65, 77, 83, 97]],
    ["B6", 2026, "26", [48, 55, 65, 77, 83]],
    ["C6", 2026, "26", [42, 48, 55, 65, 77, 83]],
    ["G6", 2026, "26", [48, 55, 65, 77, 83, 97]]
  ].map(([series, year, launchWebOS, sizes]) => Object.freeze({
    series,
    year,
    launchWebOS,
    sizes: Object.freeze(sizes.map(String)),
    modelGuideUrl: `${SOURCES.modelCatalog.modelGuideBaseUrl}${series.toLowerCase()}-${year}/`,
    sourceId: SOURCES.modelCatalog.id,
    microphone: MICROPHONE_EVIDENCE[series]
  })));

  // Preserve upstream rows verbatim where possible. These report whether each
  // project's own tool ran; they do not prove PrivacyShield's setting access.
  const GLASSHOUSE_ROWS = Object.freeze(data.GLASSHOUSE_ROWS.map((row) => Object.freeze({
    ...row,
    sourceId: SOURCES.glasshouse.id
  })));
  const CLEAN_YOUR_TV_ROWS = Object.freeze(data.CLEAN_YOUR_TV_ROWS.map((row) => Object.freeze({
    ...row,
    sourceId: SOURCES.cleanYourTV.id
  })));
  const OTHER_COHORT_ROWS = Object.freeze(data.OTHER_COHORT_ROWS.map((row) => Object.freeze({
    ...row,
    sourceId: SOURCES[row.sourceId].id
  })));
  const COMMUNITY_SAMPLES = Object.freeze([
    ...GLASSHOUSE_ROWS,
    ...CLEAN_YOUR_TV_ROWS,
    ...OTHER_COHORT_ROWS
  ]);

  const MICROPHONE_SWITCH_EVIDENCE = Object.freeze({
    C5: Object.freeze({
      status: "observed-on-cohort",
      sourceId: SOURCES.glasshouse.id,
      corroboratingSourceIds: Object.freeze([SOURCES.tvHomeC5Audit.id]),
      webOS: "10.3.1",
      modelScope: "C5 family; the research entry does not name its exact model code or firmware",
      method: "Glasshouse uses voiceinput.sound/getMicSwitchStatus; the separate tv-home C5 audit reports voiceinput/factory/getMicSwitchStatus.",
      observation: "Both projects report a physical microphone switch on a C5. Glasshouse describes GPIO state and says off disabled ThinQ voice activation; tv-home reports its switch state while hands-free voice and all capture devices were off.",
      limit: "The reports do not publish full model/firmware tuples or prove the two service paths are identical. They do not establish a physical switch or equivalent software control on a C6/C6H."
    })
  });

  const PUBLIC_CONTROL_FINDINGS = Object.freeze([
    Object.freeze({
      id: "glasshouse-live-plus",
      project: "Glasshouse",
      feature: "Live Plus / ACR switch",
      method: "com.webos.service.settings/setSystemSettings · option.livePlus",
      observation: "Its ACR action writes livePlus and changes a separate ACR agreement flag through another handler.",
      scope: "The source does not tie this route to a specific row in the tested-TV table.",
      limit: "Root-run server access; this does not establish PrivacyShield app permissions or justify editing stored consent.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "glasshouse-acr-status",
      project: "Glasshouse",
      feature: "Recognition status",
      method: "com.webos.service.acr/getACRSolutionStatus and getVideoCaptureStatus",
      observation: "On a CX running webOS 5.6.2, one getACRSolutionStatus query started the on-demand acr2 service. With Live Plus and ACR consent off, the report found no capture or network activity during its observation window.",
      scope: "The runtime observation is from one CX/webOS 5.6.2 sample.",
      limit: "A running acr2 process did not prove collection, but querying it changed process state. Do not use this call as a passive probe on another cohort.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "glasshouse-lmt",
      project: "Glasshouse",
      feature: "Limit AD Tracking",
      method: "general.lmt; readback through com.webos.service.admanager/getAdid → LMT",
      observation: "The code writes general.lmt and verifies through ad-manager readback. Research notes report LMT on a CX and C5; a source comment describes a C2/webOS 9.2 check.",
      scope: "The C2 source comment does not give the exact model code; the research records different firmware cohorts separately.",
      limit: "Root-run server result; it is not a PrivacyShield write profile.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "glasshouse-dashboard-c2-lmt",
      project: "Glasshouse dashboard",
      feature: "C2 Limit Ad Tracking key and readback",
      method: "Root-side write to general.lmt, verified through com.webos.service.admanager/getAdid → LMT",
      observation: "The source comment reports that changing general.lmt changed the ad service's LMT value on a C2/webOS 9.2 within a second.",
      scope: "C2/webOS 9.2 cohort evidence. The tested-TV table lists OLED42C24LA on webOS 9.2.2, but the source does not tie that exact model row to this key test.",
      limit: "Root-run server behavior; it does not establish packaged-app permissions or validate every C2 firmware build.",
      sourceId: SOURCES.glasshouseDashboard.id
    }),
    Object.freeze({
      id: "glasshouse-ad-id",
      project: "Glasshouse",
      feature: "Advertising identifier",
      method: "com.webos.service.admanager/getAdid → resetIFA → getAdid",
      observation: "The helper compares the identifier before and after a reset. The tested-TV table says getAdid is absent on OLED65C8PUA firmware 05.50.15.",
      scope: "The API is known to vary by firmware; the project does not provide a full model-by-method matrix.",
      limit: "A reset is not included in PrivacyShield's controls.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "glasshouse-agreement-flags",
      project: "Glasshouse",
      feature: "Agreement records",
      method: "/var/luna/preferences/eula and eulaInfoNetwork",
      observation: "Consent flags differ between a CX on webOS 5.6.2 and a C5 on 10.3.1. The research traces generalTermsAllowed to native Terms of Use and Privacy Policy agreements; withdrawing them caused apps to enter LG's User Agreements screen on the CX.",
      scope: "Observed across those two model families/software cohorts; the research warns the same firmware can differ between CX devices.",
      limit: "Agreement withdrawal can gate YouTube, Netflix, and the Content Store. PrivacyShield leaves agreement changes in LG's native screen and does not edit stored consent flags.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "cleanyourtv-services",
      project: "CleanYourTV",
      feature: "Ad and telemetry services",
      method: "Root service integration: stop selected services, prevent selected services from starting, and redirect selected ad hosts",
      observation: "Its guide names remotelogger, service-logger, contentminer, nudge, acr2, admanager, sportsalarm, and adoverlay-service.",
      scope: "Root service/boot integration; the project describes reversibility while its launcher is Home.",
      limit: "These are root service and network changes, not TV settings. PrivacyShield does not apply or stop them.",
      sourceId: SOURCES.cleanYourTV.id
    }),
    Object.freeze({
      id: "glasshouse-c5-privacy-keys",
      project: "Glasshouse",
      feature: "Settings keys and readers",
      method: "Firmware search of /usr and /etc; key names include option.dbgLogUpload, option.faultLogUpload, option.thirdPartyCookie, general.voiceLongDistance, option.watchedListCollection, and general.lmt.",
      observation: "The report identifies readers and limits for several keys on a C5 running webOS 10.3.1. It marks watchedListCollection as unknown, finds usageCare is a Family Care menu setting rather than a collection control, and notes a debug-log upload setting came back after boot. These keys remain in repository research; PrivacyShield does not read or display them.",
      scope: "C5/webOS 10.3.1; the research does not publish the scanned set's exact model or firmware. Runtime-generated key reads can be missed by the documented search method.",
      limit: "This is a firmware research map, not proof that PrivacyShield can read or write these values from its packaged app. The four status entries have no switch; a value is displayed only if the TV returns it.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "webos-lockout-c5-exact-preferences",
      project: "webos_lockout",
      feature: "C5 usage and log-upload preference keys",
      method: "A startup script backs up and edits the local preference file before LG settings load.",
      observation: "The script sets usageCare, dbgLogUpload, and faultLogUpload to false only if each key exists. The project reports those values persisted on its target across a reboot and remained false during the session. Glasshouse separately found the debug and fault-log readers; it describes usageCare as a Family Care menu setting, so its collection effect is unresolved.",
      scope: "Exact OLED77C51LA running Rockhopper 10.3.1-3006; numeric firmware version is not published.",
      limit: "Direct file changes do not show that LG accepts the change through its settings service or that diagnostic uploads stop. These values are not app controls; PrivacyShield does not apply the root script.",
      sourceId: SOURCES.webosLockout.id
    }),
    Object.freeze({
      id: "glasshouse-acr-client-cx",
      project: "Glasshouse",
      feature: "ACR service behavior",
      method: "com.webos.service.acr activity, acr2 process, and video-capture status on CX/webOS 5.6.2.",
      observation: "The investigation found that an ACR status call can start acr2 even with Live Plus off. Under the tested off state it observed no capture, Alphonso library load, or ACR network sockets.",
      scope: "One rooted CX software cohort; the result covers the described observation window.",
      limit: "Service presence, config strings, or a query response alone do not prove audio/video was collected or transmitted.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "glasshouse-c5-mic-switch",
      project: "Glasshouse",
      feature: "Built-in microphone switch",
      method: "voiceinput.sound/getMicSwitchStatus",
      observation: "Glasshouse reports a C5 physical switch exposed as a GPIO state; switching it off disabled ThinQ voice activation and produced an on-screen notice.",
      scope: "C5/webOS 10.3.1; exact model code and firmware are not stated in the finding.",
      limit: "Do not infer the same hardware or service on a C6/C6H. This is not evidence of an app-level switch for other models.",
      sourceId: SOURCES.glasshouse.id
    }),
    Object.freeze({
      id: "own-your-glass-b5-settings-map",
      project: "own-your-glass",
      feature: "B5 Home and advertising settings map",
      method: "The owner reports changing and reading back settings through LG's settings service on an OLED55B56LA.",
      observation: "The B5 report records screenSaverAd, adCookie, aiNudge, sportsAlarm, livePromotion, livePlus, webOSPromotionVideo, and Limit Ad Tracking. Its settings script also names option.hbbTV, option.hbbTvDnt, option.hbbTvDeviceId, and network.allowMobileDeviceAccess. PrivacyShield uses the HbbTV trio and general.aiNudge only on OLED55B56LA / webOS 25. The report found that turning network.allowMobileDeviceAccess off did not close SSAP; the app does not read that key. The report does not publish categories for adCookie, sportsAlarm, or webOSPromotionVideo, so the app does not query them.",
      scope: "OLED55B56LA (B5), webOS 10.3.1; firmware version not published.",
      limit: "One exact B5 size/region and one software sample. A setting's reported value does not prove it cleared stored data or stopped a service; no C5/C6 or other B5 variant inherits this exact-device observation.",
      sourceId: SOURCES.ownYourGlass.id
    }),
    Object.freeze({
      id: "level1techs-g5-root-preference-map",
      project: "Level1Techs G5 rooted privacy guide",
      feature: "G5 privacy preference names and intended values",
      method: "A root script conditionally edits /var/luna/preferences/general and /var/luna/preferences/option JSON files.",
      observation: "For OLED65G5WUA, the script names general.aiNudge, general.screenSaverAd, general.homePromotion, option.watchedListCollection, option.usageCare, option.dbgLogUpload, option.faultLogUpload, and option.thirdPartyCookie. It writes off/false values only when a key already exists. PrivacyShield offers the three general settings as switches on this exact model and software version; the five option settings are read-only.",
      scope: "One rooted OLED65G5WUA running webOS 10.2.1; numerical firmware version is not published.",
      limit: "The script edits local preference files but does not test changes through PrivacyShield or measure collection behavior. It also edits EULA/consent records; PrivacyShield leaves agreement changes to LG's native consent screen.",
      sourceId: SOURCES.level1techsG5.id
    }),
    Object.freeze({
      id: "own-your-glass-microphone-paths",
      project: "own-your-glass",
      feature: "Physical and remote microphone paths",
      method: "Root scripts neutralize the TV's ALSA capture endpoints and the voiceinput_hidraw → voiceinput → voiceconductor remote-microphone path.",
      observation: "The project reports four physical capture endpoints on its LG OLED and preserves playback/internal audio loopbacks; it separately blocks the Magic Remote voice path.",
      scope: "LG OLED/webOS 10.3.2; exact model, firmware, and endpoint list for other devices are not published in the overview.",
      limit: "Root-only, device-specific OS changes. This does not create a safe or available PrivacyShield toggle and must not be copied to another model by name alone.",
      sourceId: SOURCES.ownYourGlass.id
    }),
    Object.freeze({
      id: "webos-unclutter-c1-network-baseline",
      project: "webOS Unclutter",
      feature: "Ad and telemetry network observations",
      method: "Network telemetry registration and DNS filtering rules.",
      observation: "The project says its rules were built around telemetry registered on a European C1.",
      scope: "C1/webOS 6.0; exact model code and firmware are not published.",
      limit: "This is a network baseline, not a complete settings/API map. Other regions and webOS versions may contact different hosts.",
      sourceId: SOURCES.webosUnclutter.id
    }),
    Object.freeze({
      id: "kallistox-c1-network-capture",
      project: "KallistoX C1 capture",
      feature: "Network resolver behavior",
      method: "40-minute gateway DNS and TLS SNI capture on an EU OLED C1 running webOS 6.0 after privacy settings were opted out.",
      observation: "The author observed regional nextlgsdp.com and tv.wiselg.com destinations and reported no direct-DNS, DoH, or DoT bypass in that capture. The companion notes identify some app-update and billing dependencies and move those hosts out of the default blocking tier.",
      scope: "One European C1; exact model code and firmware are not published; n=1 device/firmware/region.",
      limit: "A short capture after opting out does not prove other C1 firmware or regions use the same destinations or resolver path. This observation differs from the G1 audit's resolver findings and should remain cohort-specific.",
      sourceId: SOURCES.kallistoC1Capture.id
    }),
    Object.freeze({
      id: "lg-tv-blocklist-g1-audit",
      project: "LG TV Blocklist",
      feature: "DNS/packet audit and blocking tiers",
      method: "Two-week German root-level audit: about 44,800 captured packets, 267,000 DNS queries, and per-service investigation.",
      observation: "The project publishes evidence-annotated SAFE and STRICT lists. STRICT adds firmware OTA, ThinQ cloud, and LG Channels destinations and may degrade the Content Store; later revisions corrected regional aliases and moved app-update/billing infrastructure out of the default tier.",
      scope: "One LG G1 on a German network; exact model, firmware, and webOS build were not recorded.",
      limit: "The maintainers explicitly say other models, regions, firmware, and resolver paths can differ. Do not use its blocklists as a universal PrivacyShield setting map or automatically apply them to another TV.",
      sourceId: SOURCES.lgTvBlocklist.id
    }),
    Object.freeze({
      id: "lifesgood-g4-root-controls",
      project: "Life's Good Without Spying",
      feature: "Rooted privacy and voice controls",
      method: "Homebrew app stops selected ad/ACR/voice services, bind-mounts inert stubs, applies domain blocks, and can install a boot hook; optional ConnMan DNS/IPv6, UPnP, ThinQ, QuickSet, and Home-session controls are separate.",
      observation: "The project's tested device is OLED65G45LW (EU), webOS TV 9.2.4, firmware 23.23.30. The README documents reversible service restoration and warns that SDP blocking can impair initialization/clock-dependent apps, QuickSet blocks remote-code lookup, Home-session blocking affects recommendations and metadata, UPnP blocking breaks casting, and voice settings may delay Settings launch.",
      scope: "One exact G4 model/software tuple; root and Homebrew access, not PrivacyShield app ACG access.",
      limit: "These actions do not prove that the same services, files, or settings exist on other G4 variants or webOS releases. They are source evidence, not PrivacyShield writes.",
      sourceId: SOURCES.lifesGoodWithoutSpying.id
    }),
    Object.freeze({
      id: "webos-debloat-webos26-settings-map",
      project: "webos-debloat",
      feature: "Promotions, sports alerts, recommendations, and Live Plus",
      method: "Root shell calling com.webos.settingsservice getSystemSettings/setSystemSettings for general:homePromotion, general:sportsAlarm, option:livePromotion, option:webOSPromotionVideo, option:promotionStreamer, option:livePlus, and other:contentRecommendation.",
      observation: "The script skips missing keys, records original values once, offers a dry-run, and can restore those values. It separately edits launcher visibility and preload policy; hiding a tile alone does not stop its service or free memory.",
      scope: "One US 2026 LG OLED; model code not published; the author reports webOS 26 and firmware 11.2.",
      limit: "This is a root-shell script map, not a PrivacyShield app permission or exact C6 model/firmware validation. PrivacyShield uses the overlapping keys only as webOS 26 platform candidates and still requires a readable value on the target TV; the other keys remain unmapped.",
      sourceId: SOURCES.webosDebloat.id
    }),
    Object.freeze({
      id: "webosbrew-mobile-device-access",
      project: "webOS Homebrew documentation",
      feature: "Local phone and remote control API",
      method: "network.allowMobileDeviceAccess via com.webos.settingsservice getSystemSettings/setSystemSettings.",
      observation: "The documented hidden setting controls the SSAP/LG Connect Apps protocol on ports 3000 and 3001. Turning it off is a candidate privacy measure that also disables local remote-control integrations using that protocol.",
      scope: "Public Homebrew SettingsService reference; no tested model, region, firmware, or value readback is listed.",
      limit: "This documents a key and its described effect, not whether the key exists or is writable from PrivacyShield on a particular cohort.",
      sourceId: SOURCES.webosbrewHiddenSettings.id
    }),
    Object.freeze({
      id: "looking-glass-2021-owner-investigation",
      project: "Looking Glass investigation",
      feature: "ACR configuration and local service state",
      method: "The owner report describes a config-file read and process/service checks on a rooted LG webOS TV.",
      observation: "It reports ACR and audio-capture configuration values before its own changes, then lists services it says it stopped. Those statements describe one owner's report; the project labels services by purpose, but the report does not show a packet capture or payload analysis for them.",
      scope: "One unspecified 2021 LG TV running webOS 6.0; exact model, region, and firmware are not published.",
      limit: "Configuration and process state do not by themselves prove that audio was recorded or transmitted. Do not assign this report to B1, C1, or G1 or treat its service labels as a verified collection map.",
      sourceId: SOURCES.lookingGlass.id
    }),
    Object.freeze({
      id: "lg-firmware-acr-43-21-73-static-map",
      project: "TV ACR Firmware Research",
      feature: "LG ACR service and startup path",
      method: "Static analysis of a secured LG webOS firmware image, tied to its recorded SHA-256 and build identifier.",
      observation: "The analysis identifies `/usr/sbin/acr2`, the `com.webos.service.acr` definition and permissions, scheduled startup, logging configuration, test resources, and Live Plus settings/help content. It supports component and operational-path presence in that firmware. A resource name suggesting audio recognition does not identify the algorithm.",
      scope: "Firmware build 43.21.73.01-HE_DTV_W25O_AFABATAA; exact TV model, region, and runtime consent state are not published.",
      limit: "Static firmware evidence does not show that ACR was active on a specific household TV or that data was transmitted. Do not assign the image to a B, C, or G family or infer payload contents.",
      sourceId: SOURCES.tvAcrFirmwareResearch.id
    }),
    Object.freeze({
      id: "tv-home-c5-root-privacy-audit",
      project: "tv-home",
      feature: "C5 privacy, agreements, logs, and services",
      method: "Owner-run root audit of settings and services, seven days of TV logs, and live connections sampled every three seconds for ten minutes; the companion boot hook masks selected logger services and bind-mounts no-op programs over on-demand services in RAM.",
      observation: "The author reports Live Plus/ACR events including HDMI source, ad ID, TV MAC, and nearby Wi-Fi access points; optional agreements remained accepted after Live Plus was turned off. It reports no stored voice recordings in the searched paths and ten audio-capture attempts failing while audio used HDMI eARC. The hook stops selected ACR, ads, recommendation, sports, and log-upload services; the author reports Home, the store, and streaming continued working.",
      scope: "One 2025 OLED C5 on webOS 11; exact model code, region, and firmware are not published.",
      limit: "This is a single owner/root report, not a PrivacyShield app test. The eARC result does not establish behavior on the TV speakers; the author says that path may work. The hook also blocks firmware-update hosts, which can prevent OTA updates and preserve root; do not transfer its services or effects to C6/C6H.",
      sourceId: SOURCES.tvHomeC5Audit.id
    }),
    Object.freeze({
      id: "imc-acr-network-study",
      project: "IMC 2024 ACR study",
      feature: "ACR network behavior",
      method: "Controlled black-box capture of LG and Samsung TV traffic across content/input and opt-out scenarios.",
      observation: "The study reports ACR traffic while a TV is used as an external display and reports that opting out stopped the ACR-server traffic in its tested scenarios; UK and US LG traffic differed.",
      scope: "Research devices and jurisdictions described in the paper; its abstract does not provide a B/C/G cohort map.",
      limit: "Network evidence supports the tested study setups and does not identify every request payload, model, or firmware behavior.",
      sourceId: SOURCES.acrResearch.id
    })
  ]);

  const ENGINE_MAJOR_TO_WEBOS = Object.freeze({
    "79": "6.x",
    "87": "22",
    "94": "23",
    "108": "24",
    "120": "25",
    "132": "26"
  });

  const SDK_MAJOR_TO_WEBOS = Object.freeze({
    "6": "6.x",
    "7": "22",
    "8": "23",
    "9": "24",
    "10": "25",
    "11": "26"
  });

  const ALL_GENERAL_PATH = "Settings > All Settings > General > System > Additional Settings";
  const GENERAL_PATH = "Settings > General > System > Additional Settings";
  const SYSTEM_PATH = "Settings > All Settings > System > Additional Settings";
  const ALL_SUPPORT_PATH = "Settings > All Settings > Support > Privacy & Terms";
  const SUPPORT_PATH = "Settings > Support > Privacy & Terms";

  function menuEntry(name, path, note) {
    return Object.freeze({ name, path, note: note || "" });
  }

  const MENU_REFERENCES = Object.freeze({
    "6.x": Object.freeze([
      menuEntry("Live Plus", `${ALL_GENERAL_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${ALL_GENERAL_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Content Recommendation", `${ALL_GENERAL_PATH} > Home Settings > Content Recommendation`, "Home-screen recommendations."),
      menuEntry("Live Promotion", `${ALL_GENERAL_PATH} > Live Promotion`, "Promotion shown by Live Plus."),
      menuEntry("Screen Saver Promotion", `${ALL_GENERAL_PATH} > Screen Saver Promotion`, "Promotion in supported app screen savers."),
      menuEntry("Advertisement (legacy setting)", `${ALL_GENERAL_PATH} > Advertisement`, "The cited webOS 6 manual describes a frequency-capping cookie; it does not call this Limit AD Tracking.")
    ]),
    "22": Object.freeze([
      menuEntry("Live Plus", `${ALL_GENERAL_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${ALL_GENERAL_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Limit AD Tracking", `${ALL_GENERAL_PATH} > Advertisement > Limit AD Tracking`, "Reduces interest-based ad personalization; ads remain.")
    ]),
    "23": Object.freeze([
      menuEntry("Live Plus", `${ALL_GENERAL_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${ALL_GENERAL_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Content Recommendation", `${ALL_GENERAL_PATH} > Home Settings > Content Recommendation`, "Home-screen recommendations."),
      menuEntry("Limit AD Tracking", `${ALL_GENERAL_PATH} > Advertisement > Limit AD Tracking`, "Reduces interest-based ad personalization; ads remain.")
    ]),
    "24": Object.freeze([
      menuEntry("Live Plus", `${GENERAL_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${ALL_GENERAL_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Content Recommendation", `${ALL_GENERAL_PATH} > Home Settings > Content Recommendation`, "Home-screen recommendations."),
      menuEntry("Live Promotion", `${GENERAL_PATH} > Live Promotion`, "Promotion shown by Live Plus."),
      menuEntry("Screen Saver Promotion", `${GENERAL_PATH} > Screen Saver Promotion`, "Promotion in supported app screen savers."),
      menuEntry("Limit AD Tracking", `${SUPPORT_PATH} > Advertisement > Limit AD Tracking`, "Reduces interest-based ad personalization; ads remain.")
    ]),
    "25": Object.freeze([
      menuEntry("Live Plus", `${GENERAL_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${ALL_GENERAL_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Content Recommendation", `${ALL_GENERAL_PATH} > Home Settings > Content Recommendation`, "Home-screen recommendations."),
      menuEntry("Live Promotion", `${GENERAL_PATH} > Live Promotion`, "Promotion shown by Live Plus."),
      menuEntry("Screen Saver Promotion", `${GENERAL_PATH} > Screen Saver Settings > Screen Saver Promotion`, "Promotion in supported app screen savers."),
      menuEntry("Limit AD Tracking", `${SUPPORT_PATH} > Advertisement > Limit AD Tracking`, "Reduces interest-based ad personalization; ads remain.")
    ]),
    "26": Object.freeze([
      menuEntry("Live Plus", `${SYSTEM_PATH} > Live Plus`, "Automatic content recognition control."),
      menuEntry("User Agreements", `${ALL_SUPPORT_PATH} > User Agreements`, "Review agreement status in LG's native screen."),
      menuEntry("Home Promotion", `${SYSTEM_PATH} > Home Settings > Home Promotion`, "Home-screen advertising."),
      menuEntry("Content Recommendation", `${SYSTEM_PATH} > Home Settings > Content Recommendation`, "Home-screen recommendations."),
      menuEntry("Live Promotion", `${SYSTEM_PATH} > Live Promotion`, "Promotion shown by Live Plus."),
      menuEntry("Screen Saver Promotion", `${SYSTEM_PATH} > Screen Saver Settings > Screen Saver Promotion`, "Promotion in supported app screen savers."),
      menuEntry("Limit AD Tracking", `${SUPPORT_PATH} > Advertisement > Limit AD Tracking`, "Reduces interest-based ad personalization; ads remain.")
    ])
  });

  function detectPlatform(userAgent, sdkVersion) {
    if (typeof userAgent !== "string" || !/\bWeb0S\s*;/i.test(userAgent)) return null;
    const engine = userAgent.match(/\bChrome\/(\d+)\./i);
    if (!engine) return null;
    const sdk = typeof sdkVersion === "string" && sdkVersion.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (!sdk) return null;
    const engineVersion = ENGINE_MAJOR_TO_WEBOS[engine[1]];
    const sdkPlatform = SDK_MAJOR_TO_WEBOS[sdk[1]];
    if (!engineVersion || !sdkPlatform || engineVersion !== sdkPlatform) return null;
    const version = engineVersion;
    return version ? Object.freeze({ version, engineMajor: Number(engine[1]) }) : null;
  }

  function cohortForModel(model) {
    if (typeof model !== "string") return null;
    const match = model.trim().match(/^\s*(?:LG\s*)?(?:OLED)?(\d{2,3})([BCG][1-6])[A-Z0-9.-]*\s*$/i);
    if (!match) return null;
    const size = match[1];
    const series = match[2].toUpperCase();
    const cohort = COHORTS.find((entry) => entry.series === series);
    return cohort && cohort.sizes.includes(size) ? cohort : null;
  }

  function modelGuideForModel(model) {
    const cohort = cohortForModel(model);
    if (!cohort) return null;
    if (cohort.series === "C6" && /C6H/i.test(model)) {
      return Object.freeze({
        series: cohort.series,
        year: cohort.year,
        url: cohort.modelGuideUrl,
        exactVariantCovered: false,
        scopeNote: "The standard C6 page excludes the separate C6H variant; its microphone evidence does not cover this model."
      });
    }
    return Object.freeze({
      series: cohort.series,
      year: cohort.year,
      url: cohort.modelGuideUrl,
      exactVariantCovered: true,
      scopeNote: "Family guide. Menu paths follow the installed webOS version; this guide does not list internal settings keys."
    });
  }

  function samplesForCohort(series) {
    if (typeof series !== "string") return [];
    return COMMUNITY_SAMPLES.filter((sample) => sample.series === series.toUpperCase());
  }

  function unassignedSamples() {
    // Keep unrelated historical LG models out of the B/C/G research-gap panel.
    // An exact model code is still informative even when its series is outside
    // this catalog; only reports that withheld the model code belong here.
    return COMMUNITY_SAMPLES.filter((sample) => !sample.model && !sample.series);
  }

  function sampleCountsForCohort(series) {
    const counts = {};
    for (const sample of samplesForCohort(series)) {
      counts[sample.project] = (counts[sample.project] || 0) + 1;
    }
    return Object.freeze(counts);
  }

  function microphoneSwitchForCohort(series) {
    if (typeof series !== "string") return null;
    return MICROPHONE_SWITCH_EVIDENCE[series.toUpperCase()] || null;
  }

  function menuForPlatform(version) {
    const entries = MENU_REFERENCES[version];
    return entries ? entries.slice() : [];
  }

  return Object.freeze({
    COHORTS,
    COMMUNITY_SAMPLES,
    ENGINE_MAJOR_TO_WEBOS,
    MENU_REFERENCES,
    MICROPHONE_EVIDENCE,
    MICROPHONE_SWITCH_EVIDENCE,
    PUBLIC_CONTROL_FINDINGS,
    SDK_MAJOR_TO_WEBOS,
    SOURCES,
    cohortForModel,
    detectPlatform,
    menuForPlatform,
    modelGuideForModel,
    microphoneSwitchForCohort,
    sampleCountsForCohort,
    samplesForCohort,
    unassignedSamples
  });
});

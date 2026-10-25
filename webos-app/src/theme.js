(function () {
  "use strict";

  try {
    if (localStorage.getItem("privacyshield.theme.v1") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (_) { /* theme storage may be unavailable on older webOS versions */ }
})();

(function (root) {
  "use strict";

  const KEY_CODES = Object.freeze({
    13: "Enter",
    27: "Escape",
    32: "Space",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    461: "Back"
  });

  function keyFromEvent(event) {
    if (!event) return "";
    const key = event.key;
    if (key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowRight" || key === "ArrowDown") return key;
    if (key === "Enter" || key === "Escape" || key === "Back") return key;
    if (key === " " || key === "Spacebar") return "Space";
    const code = Number(event.keyCode || event.which || 0);
    return KEY_CODES[code] || "";
  }

  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function directionalCandidate(origin, candidates, direction, rectOf) {
    if (!origin || !Array.isArray(candidates)) return null;
    const getRect = rectOf || ((node) => node.getBoundingClientRect());
    const originRect = getRect(origin);
    if (!originRect) return null;
    const from = center(originRect);
    const horizontal = direction === "ArrowLeft" || direction === "ArrowRight";
    if (!horizontal && direction !== "ArrowUp" && direction !== "ArrowDown") return null;

    let best = null;
    let bestScore = Infinity;
    for (const candidate of candidates) {
      if (!candidate || candidate === origin) continue;
      const rect = getRect(candidate);
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      const to = center(rect);
      const deltaX = to.x - from.x;
      const deltaY = to.y - from.y;
      const primary = horizontal ? deltaX : deltaY;
      const forward = direction === "ArrowRight" || direction === "ArrowDown";
      if ((forward && primary <= 1) || (!forward && primary >= -1)) continue;

      const cross = horizontal ? Math.abs(deltaY) : Math.abs(deltaX);
      const crossOverlap = horizontal
        ? Math.max(0, Math.min(originRect.bottom, rect.bottom) - Math.max(originRect.top, rect.top))
        : Math.max(0, Math.min(originRect.right, rect.right) - Math.max(originRect.left, rect.left));
      const crossPenalty = crossOverlap > 0 ? cross * 0.35 : cross * 1.8;
      const score = Math.abs(primary) + crossPenalty;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  const api = Object.freeze({ keyFromEvent, directionalCandidate });
  root.LGPrivacyShieldRemoteNavigation = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

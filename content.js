"use strict";

// Quality levels as reported by YouTube's player API, ordered highest to
// lowest. Used to walk downward from the configured target until an
// available level is found.
const QUALITY_ORDER = [
  "highres",
  "hd2880",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
  "tiny",
];

const DEFAULT_QUALITY = "hd1080";

let currentVideoId = null;
let pollTimer = null;
let pollAttempts = 0;
const MAX_POLL_ATTEMPTS = 40; // ~20 seconds at 500ms
const POLL_INTERVAL_MS = 500;

function getVideoIdFromUrl() {
  try {
    const url = new URL(location.href);
    return url.searchParams.get("v") || location.pathname;
  } catch (e) {
    return location.href;
  }
}

function getStoredQuality() {
  return browser.storage.local
    .get({ targetQuality: DEFAULT_QUALITY })
    .then((res) => res.targetQuality || DEFAULT_QUALITY);
}

function applyQuality(player, target) {
  let available;
  try {
    available = player.getAvailableQualityLevels();
  } catch (e) {
    return false;
  }
  if (!available || available.length === 0) return false;

  const startIdx = QUALITY_ORDER.indexOf(target);
  const searchOrder =
    startIdx === -1 ? QUALITY_ORDER : QUALITY_ORDER.slice(startIdx);

  for (const level of searchOrder) {
    if (available.includes(level)) {
      try {
        player.setPlaybackQualityRange(level, level);
        player.setPlaybackQuality(level);
      } catch (e) {
        // ignore, player may not support one of the calls
      }
      return true;
    }
  }
  return false;
}

function getPlayerObject() {
  const el = document.getElementById("movie_player");
  if (!el) return null;
  // Firefox content scripts see the DOM through Xray wrappers, which hide
  // methods the page script attached to the element (getAvailableQualityLevels,
  // setPlaybackQuality, etc). wrappedJSObject reaches through to the real,
  // page-context object where those methods actually exist. In Chrome
  // there's no Xray wrapping, so el itself already has them.
  return el.wrappedJSObject || el;
}

function tryApplyOnce() {
  const player = getPlayerObject();
  if (!player || typeof player.getAvailableQualityLevels !== "function") {
    return false;
  }

  getStoredQuality().then((target) => {
    applyQuality(player, target);
  });
  return true;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  pollAttempts = 0;
}

function startPollingForPlayer() {
  stopPolling();
  pollAttempts = 0;
  // Keep reapplying for the whole window, not just until the first success:
  // the list of available quality levels can grow as the video buffers, and
  // YouTube's own adaptive-quality logic can silently override the quality
  // again a second or two after we set it. Repeated idempotent calls fix both.
  pollTimer = setInterval(() => {
    pollAttempts += 1;
    tryApplyOnce();
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      stopPolling();
    }
  }, POLL_INTERVAL_MS);
}

function handlePossibleNavigation() {
  const videoId = getVideoIdFromUrl();
  if (videoId === currentVideoId) return;
  currentVideoId = videoId;
  startPollingForPlayer();
}

// YouTube's SPA fires these custom events on navigation between videos.
document.addEventListener("yt-navigate-finish", handlePossibleNavigation, true);
document.addEventListener("yt-page-data-updated", handlePossibleNavigation, true);

// Fallback: also watch for URL changes directly, in case the above
// events aren't fired in a particular YouTube layout/version.
setInterval(handlePossibleNavigation, 1000);

// Run once for the initial page load.
handlePossibleNavigation();

// If the user changes the target quality in settings while a video is
// already open, apply it immediately rather than waiting for the next
// video load. Re-run for a few seconds afterwards too, in case YouTube's
// own adaptive logic tries to override it right after the change.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.targetQuality) return;
  startPollingForPlayer();
});

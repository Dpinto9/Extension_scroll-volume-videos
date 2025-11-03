// Scroll Volume Control - Clean & Efficient
const CONFIG = {
  step: 0.05,
  overlayDuration: 700,
  scanInterval: 2000,
};

let processed = new WeakSet();

// ============================================
// CORE FUNCTIONALITY
// ============================================

function showOverlay(container, volume) {
  if (!container) return;

  let overlay = container.querySelector(".scroll-volume-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "scroll-volume-overlay";
    Object.assign(overlay.style, {
      position: "absolute",
      left: "10px",
      bottom: "10px",
      padding: "8px 12px",
      borderRadius: "8px",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "system-ui,-apple-system,sans-serif",
      zIndex: "99999",
      pointerEvents: "none",
      transition: "opacity 0.2s",
      userSelect: "none",
    });

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    container.appendChild(overlay);
  }

  const percent = Math.round(volume * 100);
  const icon = volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊";
  overlay.textContent = `${icon} ${percent}%`;
  overlay.style.opacity = "1";

  clearTimeout(overlay._timer);
  overlay._timer = setTimeout(() => {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 200);
  }, CONFIG.overlayDuration);
}

// ============================================
// GENERAL VIDEO (YouTube, etc)
// ============================================

function writeYTVolumePayload(volume) {
  try {
    const percent = Math.round(volume * 100);
    const muted = percent === 0;

    const payload = {
      data: JSON.stringify({ volume: percent, muted }),
      expiration: Date.now() + 1000 * 60 * 60 * 24 * 30,
      creation: Date.now(),
    };

    const value = JSON.stringify(payload);
    localStorage.setItem("yt-player-volume", value);
    sessionStorage.setItem("yt-player-volume", value);
  } catch (e) {}
}

function readYTVolumePayload() {
  try {
    const raw =
      sessionStorage.getItem("yt-player-volume") ||
      localStorage.getItem("yt-player-volume");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const inner = JSON.parse(parsed.data);
    return (inner.volume || 0) / 100;
  } catch (_) {
    return null;
  }
}

function updateYouTubeUI(volume) {
  const percent = Math.round(volume * 100);

  // Update volume panel
  const panel = document.querySelector(".ytp-volume-panel");
  if (panel) {
    panel.setAttribute("aria-valuenow", percent);
    panel.setAttribute("aria-valuetext", percent + "% volume");
  }

  // Update volume slider
  const slider = panel?.querySelector(".ytp-volume-slider");
  if (slider) {
    slider.style.setProperty("--volume-slider-value", percent + "%");
    slider.setAttribute("aria-valuenow", percent);
    slider.setAttribute("aria-valuetext", percent + "%");

    const handle = slider.querySelector(".ytp-volume-slider-handle");
    if (handle) {
      handle.style.left = (percent / 100) * 40 + "px";
    }
  }

  // Update mute icon
  const muteSlash = document.querySelector("#ytp-id-16");
  if (muteSlash) muteSlash.style.display = volume === 0 ? "block" : "none";

  const muteButton = document.querySelector(".ytp-mute-button");
  if (muteButton) {
    const isMuted = volume === 0;
    muteButton.setAttribute(
      "data-title-no-tooltip",
      isMuted ? "Ativar som" : "Desativar som"
    );
    muteButton.setAttribute(
      "aria-label",
      isMuted ? "Ativar som (m)" : "Desativar som (m)"
    );
  }
}

function syncYouTubeVolume(volume) {
  const video = document.querySelector("video");
  if (!video) return;

  // Apply volume to video element
  video.volume = volume;
  if (volume > 0) video.muted = false;

  // Update UI elements
  updateYouTubeUI(volume);

  // Save to storage
  writeYTVolumePayload(volume);
}

function autoApplyStoredVolume() {
  const apply = () => {
    const v = readYTVolumePayload();
    if (v == null) return false;
    const video = document.querySelector("video");
    if (!video) return false;

    // Apply volume and update UI
    video.volume = v;
    if (v > 0) video.muted = false;

    // Update YouTube UI to match stored volume
    updateYouTubeUI(v);

    return true;
  };

  apply();

  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function attachYouTube() {
  const video = document.querySelector("video");
  if (!video || processed.has(video)) return;
  processed.add(video);

  autoApplyStoredVolume();

  video.addEventListener(
    "wheel",
    (e) => {
      if (video.readyState === 0) return;

      const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
      const newVol = Math.max(0, Math.min(1, video.volume + delta));

      syncYouTubeVolume(newVol);

      e.preventDefault();
      e.stopPropagation();

      const container =
        video.closest(".html5-video-player") ||
        document.querySelector(".ytd-watch-flexy");
      showOverlay(container || video.parentElement, newVol);
    },
    { passive: false }
  );
}

function scanYouTube() {
  const video = document.querySelector("video");
  if (video && video.offsetParent && video.closest(".html5-video-player")) {
    attachYouTube();
  }
}

function initYouTube() {
  scanYouTube();
  setInterval(scanYouTube, CONFIG.scanInterval);

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanYouTube, 800);
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// ============================================
// TWITCH
// ============================================

function setTwitchVolume(delta) {
  const slider = document.querySelector(
    '[data-a-target="player-volume-slider"]'
  );
  if (!slider) return false;

  const current = parseFloat(slider.value) || 0;
  const newVol = Math.max(0, Math.min(1, current + delta));
  const percent = Math.round(newVol * 100);

  // Update hidden <input>
  slider.value = newVol;
  slider.setAttribute("aria-valuenow", percent);
  slider.setAttribute("aria-valuetext", percent + "%");

  // Dispatch events
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));

  // Update visual progress bar (Twitch uses role="progressbar")
  const progress = slider
    .closest('[data-a-target="player-volume-slider-wrapper"]')
    ?.querySelector('[role="progressbar"]');
  if (progress) {
    progress.style.width = percent + "%";
    progress.setAttribute("aria-valuenow", percent);
  }

  return newVol;
}

function attachTwitch() {
  const video = document.querySelector("video");
  if (!video) return;

  const container =
    video.closest(".video-player__container") ||
    video.closest('[data-a-target="video-player"]') ||
    video.parentElement;

  if (!container || processed.has(container)) return;
  processed.add(container);

  let isHovering = false;

  container.addEventListener("mouseenter", () => (isHovering = true));
  container.addEventListener("mouseleave", () => (isHovering = false));

  const wheelHandler = (e) => {
    if (!isHovering) return;

    const overControls =
      e.target.closest(".player-controls") ||
      e.target.closest('[data-a-target="player-controls"]');
    if (overControls) return;

    const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
    const newVol = setTwitchVolume(delta);

    if (newVol !== false) {
      e.preventDefault();
      e.stopPropagation();
      showOverlay(container, newVol);
    }
  };

  container.addEventListener("wheel", wheelHandler, { passive: false });

  const cleanupObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      container.removeEventListener("mouseenter", () => {});
      container.removeEventListener("mouseleave", () => {});
      container.removeEventListener("wheel", wheelHandler);
      processed.delete(container);
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });
}

function initTwitch() {
  const scanner = setInterval(attachTwitch, 500);
  setTimeout(() => clearInterval(scanner), 10000);

  new MutationObserver(() => {
    clearTimeout(initTwitch._debounce);
    initTwitch._debounce = setTimeout(attachTwitch, 500);
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  document.addEventListener("fullscreenchange", () => {
    processed = new WeakSet();
    setTimeout(attachTwitch, 500);
  });
}

// ============================================
// TWITTER/X (unchanged)
// ============================================

function attachTwitter(video) {
  if (!video || processed.has(video)) return;
  processed.add(video);

  video.addEventListener(
    "wheel",
    (e) => {
      if (video.readyState === 0) return;

      const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
      const newVol = Math.max(0, Math.min(1, video.volume + delta));

      video.volume = newVol;
      if (newVol > 0 && video.muted) video.muted = false;

      e.preventDefault();
      e.stopPropagation();

      const container =
        video.closest("[data-testid='videoPlayer']") ||
        video.closest("[data-testid='videoComponent']") ||
        video.parentElement;
      showOverlay(container, newVol);
    },
    { passive: false }
  );
}

function scanTwitter() {
  const videos = document.querySelectorAll(
    "[data-testid='videoPlayer'] video, [data-testid='videoComponent'] video"
  );

  if (videos.length === 0) {
    document.querySelectorAll("video").forEach((v) => {
      if (v.videoWidth > 0 && v.offsetParent !== null) attachTwitter(v);
    });
  } else {
    videos.forEach((v) => {
      if (v.offsetParent !== null) attachTwitter(v);
    });
  }
}

function initTwitter() {
  const scanner = setInterval(scanTwitter, 1000);
  setTimeout(() => clearInterval(scanner), 15000);

  setInterval(scanTwitter, CONFIG.scanInterval);

  let scrollTimeout;
  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(scanTwitter, 500);
    },
    { passive: true }
  );
}

// ============================================
// INITIALIZATION
// ============================================

const hostname = window.location.hostname;

if (hostname.includes("youtube.com")) {
  initYouTube();
} else if (hostname.includes("twitch.tv")) {
  initTwitch();
} else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
  initTwitter();
} else {
  setTimeout(() => {
    scanGeneral();
    setInterval(scanGeneral, CONFIG.scanInterval);
  }, 500);
  new MutationObserver(() => {
    clearTimeout(scanGeneral._debounce);
    scanGeneral._debounce = setTimeout(scanGeneral, 500);
  }).observe(document.body, { childList: true, subtree: true });
}

// Fallback scanGeneral for non-YouTube sites
function scanGeneral() {
  document.querySelectorAll("video").forEach((v) => {
    if (v.offsetParent !== null && !v.closest(".html5-video-player")) {
      attachGeneral(v);
    }
  });
}

function attachGeneral(video) {
  if (!video || processed.has(video)) return;
  processed.add(video);

  video.addEventListener(
    "wheel",
    (e) => {
      if (video.readyState === 0) return;

      const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
      const newVol = Math.max(0, Math.min(1, video.volume + delta));

      video.volume = newVol;
      if (newVol > 0 && video.muted) video.muted = false;

      e.preventDefault();
      e.stopPropagation();

      const container =
        video.closest(".html5-video-player") || video.parentElement;
      showOverlay(container, newVol);
    },
    { passive: false }
  );
}

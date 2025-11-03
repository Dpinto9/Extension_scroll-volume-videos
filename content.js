// ============================================
// DEBUG MODE - Change this to false to disable debug messages
// ============================================
const DEBUG_MODE = false;

// ============================================
// CONFIG
// ============================================
const CONFIG = {
  step: 0.05,
  overlayDuration: 700,
  scanInterval: 2000,
  overlayColor: "#000000",
  overlayOpacity: 0.3,
};

const processed = new WeakSet();

// ============================================
// CHROME STORAGE - Load Settings
// ============================================

function loadSettings() {
  if (!chrome.storage) {
    console.error("[Volume Scroll] chrome.storage not available!");
    return;
  }

  chrome.storage.local.get(
    ["volumeStep", "overlayColor", "overlayOpacity"],
    (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[Volume Scroll] Error loading settings:",
          chrome.runtime.lastError
        );
        return;
      }

      // console.log("[Volume Scroll] Settings loaded:", result);

      if (result.volumeStep !== undefined) {
        CONFIG.step = result.volumeStep;
        // // console.log("[Volume Scroll] Step updated to:", CONFIG.step);
      }
      if (result.overlayColor) {
        CONFIG.overlayColor = result.overlayColor;
        // console.log("[Volume Scroll] Color updated to:", CONFIG.overlayColor);
      }
      if (result.overlayOpacity !== undefined) {
        CONFIG.overlayOpacity = result.overlayOpacity;
        // console.log(
        //   "[Volume Scroll] Opacity updated to:",
        //   CONFIG.overlayOpacity
        // );
      }
    }
  );
}

// Listen for settings changes in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    // console.log("[Volume Scroll] Settings changed:", changes);

    if (changes.volumeStep) {
      CONFIG.step = changes.volumeStep.newValue;
      // console.log("[Volume Scroll] Step changed to:", CONFIG.step);
    }
    if (changes.overlayColor) {
      CONFIG.overlayColor = changes.overlayColor.newValue;
      // console.log("[Volume Scroll] Color changed to:", CONFIG.overlayColor);
    }
    if (changes.overlayOpacity) {
      CONFIG.overlayOpacity = changes.overlayOpacity.newValue;
      // console.log("[Volume Scroll] Opacity changed to:", CONFIG.overlayOpacity);
    }
  }
});

// Initialize settings
// console.log("[Volume Scroll] Extension loaded, loading settings...");
loadSettings();

// ============================================
// OVERLAY
// ============================================

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

const VOLUME_SVG = {
  mute: `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M15 3.04883C14.2234 3.04883 13.4657 3.12827 12.7305 3.26953L6 10H4.15234C3.4499 11.5223 3.04883 13.2126 3.04883 15C3.04883 16.7874 3.4499 18.4777 4.15234 20H6L12.7305 26.7305C13.4657 26.8717 14.2234 26.9512 15 26.9512V3.04883Z"/>
  <path fill="currentColor" d="M24.8284 10.7574L22 13.586L19.1716 10.7574L17.7574 12.1716L20.5858 15L17.7574 17.8284L19.1716 19.2426L22 16.4142L24.8284 19.2426L26.2426 17.8284L23.4142 15L26.2426 12.1716L24.8284 10.7574Z"/>
</svg>
  `,

  low: `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M15 3.04883C14.2234 3.04883 13.4657 3.12827 12.7305 3.26953L6 10H4.15234C3.4499 11.5223 3.04883 13.2126 3.04883 15C3.04883 16.7874 3.4499 18.4777 4.15234 20H6L12.7305 26.7305C13.4657 26.8717 14.2234 26.9512 15 26.9512Z"/>
</svg>
  `,

  medium: `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M15 3.04883C14.2234 3.04883 13.4657 3.12827 12.7305 3.26953L6 10H4.15234C3.4499 11.5223 3.04883 13.2126 3.04883 15C3.04883 16.7874 3.4499 18.4777 4.15234 20H6L12.7305 26.7305C13.4657 26.8717 14.2234 26.9512 15 26.9512Z"/>
  <path fill="currentColor" d="M19.2383 10.7617L17.832 12.1679C18.5544 12.8903 19 13.8895 19 15C19 16.1105 18.5544 17.1097 17.832 17.832L19.2383 19.2383C20.3255 18.151 21 16.6509 21 15C21 13.3491 20.3255 11.849 19.2383 10.7617Z"/>
</svg>
  `,

  high: `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M15 3.04883C14.2234 3.04883 13.4657 3.12827 12.7305 3.26953L6 10H4.15234C3.4499 11.5223 3.04883 13.2126 3.04883 15C3.04883 16.7874 3.4499 18.4777 4.15234 20H6L12.7305 26.7305C13.4657 26.8717 14.2234 26.9512 15 26.9512Z"/>
  <path fill="currentColor" d="M19.2383 10.7617L17.832 12.1679C18.5544 12.8903 19 13.8895 19 15C19 16.1105 18.5544 17.1097 17.832 17.832L19.2383 19.2383C20.3255 18.151 21 16.6509 21 15C21 13.3491 20.3255 11.849 19.2383 10.7617Z"/>
  <path fill="currentColor" d="M21.3594 8.64062L19.9551 10.0449C21.2203 11.3102 22 13.0611 22 15C22 16.9389 21.2203 18.6898 19.9551 19.9551L21.3594 21.3594C22.9895 19.7292 24 17.4794 24 15C24 12.5206 22.9895 10.2708 21.3594 8.64062Z"/>
</svg>
  `,

  max: `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M15 2.5C14.4514 2.5 13.9146 2.54681 13.3848 2.61523L7 9H4.0332C3.05698 10.7812 2.5 12.8245 2.5 15C2.5 17.1755 3.05698 19.2188 4.0332 21H7L12.5625 27.2578C13.3514 27.4137 14.1652 27.5 15 27.5Z"/>
  <path fill="currentColor" d="M24.1875 5.8125L22.7832 7.2168C24.7723 9.2059 26 11.9565 26 15C26 18.0435 24.7723 20.7941 22.7832 22.7832L24.1875 24.1875C26.5415 21.8335 28 18.5839 28 15C28 11.4161 26.5415 8.16652 24.1875 5.8125Z"/>
  <path fill="currentColor" d="M21.3594 8.64062L19.9551 10.0449C21.2203 11.3102 22 13.0611 22 15C22 16.9389 21.2203 18.6898 19.9551 19.9551L21.3594 21.3594C22.9895 19.7292 24 17.4794 24 15C24 12.5206 22.9895 10.2708 21.3594 8.64062Z"/>
  <path fill="currentColor" d="M18.5508 11.4492L17.1445 12.8555C17.6726 13.395 18 14.1323 18 14.9551C18 15.8011 17.6544 16.5566 17.0996 17.0996L18.5059 18.5059C19.4255 17.5978 20 16.3413 20 14.9551C20 13.5917 19.4438 12.3536 18.5508 11.4492Z"/>
</svg>
  `
};

const VOLUME_RANGES = [
  { key: "mute", max: 0 },
  { key: "low", max: 0.15 },
  { key: "medium", max: 0.33 },
  { key: "high", max: 0.63 },
  { key: "max", max: 1.0 },
];

function getVolumeSVG(volume) {
  const v = Math.min(Math.max(volume, 0), 1);

  for (const range of VOLUME_RANGES) {
    if (v <= range.max) {
      return VOLUME_SVG[range.key];
    }
  }
  return VOLUME_SVG.high;
}

function showOverlay(container, volume) {
  if (!container) return;

  let overlay = container.querySelector(".scroll-volume-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "scroll-volume-overlay";

    overlay.innerHTML = `
      <div class="volume-glass-container">
        <div class="volume-icon"></div>
        <div class="volume-number"></div>
      </div>
    `;

    const rgb = hexToRgb(CONFIG.overlayColor);
    const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${CONFIG.overlayOpacity})`;

    Object.assign(overlay.style, {
      position: "absolute",
      left: "20px",
      top: "20px",
      borderRadius: "16px",
      background: bgColor,
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
      boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      zIndex: "99999",
      pointerEvents: "none",
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      userSelect: "none",
      transform: "translateY(-20px) scale(0.9)",
      opacity: "0",
    });

    const glassContainer = overlay.querySelector(".volume-glass-container");
    Object.assign(glassContainer.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
    });

    const icon = overlay.querySelector(".volume-icon");
    Object.assign(icon.style, {
      width: "28px",
      height: "28px",
      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))",
      color: "white",
      flexShrink: 0,
    });

    const number = overlay.querySelector(".volume-number");
    Object.assign(number.style, {
      fontSize: "32px",
      fontWeight: "700",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "transparent",
      WebkitTextStroke: "2px rgba(255, 255, 255, 0.95)",
      textStroke: "2px rgba(255, 255, 255, 0.95)",
      letterSpacing: "-1px",
      filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))",
      minWidth: "60px",
      textAlign: "right",
    });

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    container.appendChild(overlay);
  } else {
    const rgb = hexToRgb(CONFIG.overlayColor);
    const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${CONFIG.overlayOpacity})`;
    overlay.style.background = bgColor;
  }

  const percent = Math.round(volume * 100);
  const iconElement = overlay.querySelector(".volume-icon");
  const numberElement = overlay.querySelector(".volume-number");

  iconElement.innerHTML = getVolumeSVG(volume);
  numberElement.textContent = `${percent}%`;

  overlay.style.opacity = "1";
  overlay.style.transform = "translateY(0) scale(1)";

  clearTimeout(overlay._timer);
  overlay._timer = setTimeout(() => {
    overlay.style.opacity = "0";
    overlay.style.transform = "translateY(-20px) scale(0.9)";
    setTimeout(() => overlay.remove(), 300);
  }, CONFIG.overlayDuration || 1400);
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

  const panel = document.querySelector(".ytp-volume-panel");
  if (panel) {
    panel.setAttribute("aria-valuenow", percent);
    panel.setAttribute("aria-valuetext", percent + "% volume");
  }

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

  video.volume = volume;
  if (volume > 0) video.muted = false;

  updateYouTubeUI(volume);
  writeYTVolumePayload(volume);
}

function autoApplyStoredVolume() {
  const apply = () => {
    const v = readYTVolumePayload();
    if (v == null) return false;
    const video = document.querySelector("video");
    if (!video) return false;

    video.volume = v;
    if (v > 0) video.muted = false;
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

let processedTwitch = new WeakSet();

function setTwitchVolume(delta) {
  const slider = document.querySelector(
    '[data-a-target="player-volume-slider"]'
  );
  if (!slider) return false;

  const current = parseFloat(slider.value) || 0;
  const newVol = Math.max(0, Math.min(1, current + delta));
  const percent = Math.round(newVol * 100);

  slider.value = newVol;
  slider.setAttribute("aria-valuenow", percent);
  slider.setAttribute("aria-valuetext", percent + "%");

  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));

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

  if (!container || processedTwitch.has(container)) return;
  processedTwitch.add(container);

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
      processedTwitch.delete(container);
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
  });
}

// ============================================
// TWITTER/X
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
// GENERAL VIDEO
// ============================================

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

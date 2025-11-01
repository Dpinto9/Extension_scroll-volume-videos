// Scroll Volume Control - Clean & Efficient
const CONFIG = {
  step: 0.05,
  overlayDuration: 700,
  scanInterval: 2000,
};

const processed = new WeakSet();

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

function syncYouTubeVolume(volume) {
  const video = document.querySelector("video");
  if (!video) return;

  // 1. Atualiza o volume real do <video>
  video.volume = volume;
  if (volume > 0) video.muted = false;

  // 2. Encontra o painel de volume
  const panel = document.querySelector(".ytp-volume-panel");
  if (!panel) return;

  const percent = Math.round(volume * 100);

  // Atualiza atributos ARIA do painel (acessibilidade)
  panel.setAttribute("aria-valuenow", percent);
  panel.setAttribute("aria-valuetext", `${percent}% volume`);

  // 3. Atualiza a barra visual (CSS custom property)
  const slider = panel.querySelector(".ytp-volume-slider");
  if (slider) {
    slider.style.setProperty("--volume-slider-value", percent + "%");
    slider.setAttribute("aria-valuenow", percent);
    slider.setAttribute("aria-valuetext", percent + "%");
  }

  // 4. Move o "handle" (bolinha) visualmente
  const handle = slider?.querySelector(".ytp-volume-slider-handle");
  if (handle) {
    const maxWidth = 40; // YouTube usa ~40px de largura total
    handle.style.left = (percent / 100) * maxWidth + "px";
  }

  updateYouTubeVolumeIcon(volume);
}

function attachYouTube() {
  const video = document.querySelector("video");
  if (!video || processed.has(video)) return;
  processed.add(video);

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

function updateYouTubeVolumeIcon(volume) {
  const muteSlash = document.querySelector('#ytp-id-16');
  if (!muteSlash) return;

  // Se volume = 0 → mostra a linha de mute
  // Se volume > 0 → esconde
  muteSlash.style.display = (volume === 0) ? 'block' : 'none';

  // Atualiza o botão de mute (tooltip e aria)
  const muteButton = document.querySelector('.ytp-mute-button');
  if (muteButton) {
    const percent = Math.round(volume * 100);
    const isMuted = volume === 0;
    muteButton.setAttribute('data-title-no-tooltip', isMuted ? 'Ativar som' : 'Desativar som');
    muteButton.setAttribute('aria-label', isMuted ? 'Ativar som (m)' : 'Desativar som (m)');
  }
}

function initYouTube() {
  scanYouTube();
  setInterval(scanYouTube, CONFIG.scanInterval);

  // Detecta troca de vídeo (navegação SPA)
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
    processed.clear();
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

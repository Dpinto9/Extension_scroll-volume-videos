// Scroll Volume Control - Clean & Efficient
const CONFIG = {
  step: 0.05,
  overlayDuration: 700,
  scanInterval: 2000
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
      userSelect: "none"
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

function attachGeneral(video) {
  if (!video || processed.has(video)) return;
  processed.add(video);

  video.addEventListener("wheel", (e) => {
    if (video.readyState === 0) return;

    const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    
    video.volume = newVol;
    if (newVol > 0 && video.muted) video.muted = false;

    e.preventDefault();
    e.stopPropagation();

    const container = video.closest(".html5-video-player") || video.parentElement;
    showOverlay(container, newVol);
  }, { passive: false });
}

function scanGeneral() {
  document.querySelectorAll("video").forEach(v => {
    if (v.offsetParent !== null) attachGeneral(v);
  });
}

// ============================================
// YOUTUBE
// ============================================

function initYouTube() {
  scanGeneral();
  
  setInterval(scanGeneral, CONFIG.scanInterval);
  
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanGeneral, 1000);
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// ============================================
// TWITCH
// ============================================

function setTwitchVolume(delta) {
  const slider = document.querySelector('[data-a-target="player-volume-slider"]');
  if (!slider) return false;
  
  const current = parseFloat(slider.value) || 0;
  const newVol = Math.max(0, Math.min(1, current + delta));
  
  slider.value = newVol;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
  slider.setAttribute('aria-valuenow', Math.round(newVol * 100));
  slider.setAttribute('aria-valuetext', Math.round(newVol * 100) + '%');
  
  return newVol;
}

function attachTwitch() {
  const container = document.querySelector('.video-player__container');
  if (!container || processed.has(container)) return;
  processed.add(container);

  const wheelHandler = (e) => {
    // Check if scrolling over video area (not controls)
    const target = e.target;
    const isOverControls = target.closest('.player-controls') || 
                          target.closest('[data-a-target="player-controls"]');
    
    // Only handle wheel if NOT over controls
    if (!isOverControls) {
      const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
      const newVol = setTwitchVolume(delta);
      
      if (newVol !== false) {
        e.preventDefault();
        e.stopPropagation();
        showOverlay(container, newVol);
      }
    }
  };

  container.addEventListener("wheel", wheelHandler, { passive: false });
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
    attributes: false
  });
  
  document.addEventListener("fullscreenchange", () => {
    processed.clear();
    setTimeout(attachTwitch, 500);
  });
}

// ============================================
// TWITTER/X
// ============================================

function attachTwitter(video) {
  if (!video || processed.has(video)) return;
  processed.add(video);

  video.addEventListener("wheel", (e) => {
    if (video.readyState === 0) return;

    const delta = e.deltaY > 0 ? -CONFIG.step : CONFIG.step;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    
    video.volume = newVol;
    if (newVol > 0 && video.muted) video.muted = false;

    e.preventDefault();
    e.stopPropagation();

    const container = video.closest("[data-testid='videoPlayer']") || 
                      video.closest("[data-testid='videoComponent']") || 
                      video.parentElement;
    showOverlay(container, newVol);
  }, { passive: false });
}

function scanTwitter() {
  const videos = document.querySelectorAll(
    "[data-testid='videoPlayer'] video, [data-testid='videoComponent'] video"
  );
  
  if (videos.length === 0) {
    document.querySelectorAll("video").forEach(v => {
      if (v.videoWidth > 0 && v.offsetParent !== null) attachTwitter(v);
    });
  } else {
    videos.forEach(v => {
      if (v.offsetParent !== null) attachTwitter(v);
    });
  }
}

function initTwitter() {
  const scanner = setInterval(scanTwitter, 1000);
  setTimeout(() => clearInterval(scanner), 15000);
  
  setInterval(scanTwitter, CONFIG.scanInterval);
  
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(scanTwitter, 500);
  }, { passive: true });
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
  // Fallback for other sites
  setTimeout(scanGeneral, 500);
  setInterval(scanGeneral, CONFIG.scanInterval);
  new MutationObserver(() => {
    clearTimeout(scanGeneral._debounce);
    scanGeneral._debounce = setTimeout(scanGeneral, 500);
  }).observe(document.body, { childList: true, subtree: true });
}
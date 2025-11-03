// ============================================
// DEBUG MODE - Change this to false to disable debug messages
// ============================================
const DEBUG_MODE = false;

// ============================================
// POPUP SCRIPT
// ============================================
const stepSlider = document.getElementById('volumeStep');
const stepValue = document.getElementById('stepValue');
const colorPicker = document.getElementById('overlayColor');
const opacitySlider = document.getElementById('overlayOpacity');
const opacityValue = document.getElementById('opacityValue');
const previewOverlay = document.getElementById('previewOverlay');
const savedIndicator = document.getElementById('savedIndicator');
const debugInfo = document.getElementById('debugInfo');

// Debug function
function debug(message) {
  if (!DEBUG_MODE) return;
  
  console.log('[Popup]', message);
  debugInfo.textContent = message;
  debugInfo.classList.add('show');
  setTimeout(() => debugInfo.classList.remove('show'), 3000);
}

// Hide debug info if debug mode is off
if (!DEBUG_MODE && debugInfo) {
  debugInfo.style.display = 'none';
}

// Check if chrome.storage is available
if (!chrome.storage) {
  debug('ERROR: chrome.storage not available!');
} else {
  debug('chrome.storage is available');
}

// Load saved settings
function loadSettings() {
  chrome.storage.local.get(['volumeStep', 'overlayColor', 'overlayOpacity'], (result) => {
    if (chrome.runtime.lastError) {
      debug('Error loading: ' + chrome.runtime.lastError.message);
      return;
    }
    
    debug('Loaded: ' + JSON.stringify(result));
    
    if (result.volumeStep !== undefined) {
      stepSlider.value = result.volumeStep * 100;
      stepValue.textContent = Math.round(result.volumeStep * 100) + '%';
    }
    if (result.overlayColor) {
      colorPicker.value = result.overlayColor;
    }
    if (result.overlayOpacity !== undefined) {
      opacitySlider.value = result.overlayOpacity * 100;
      opacityValue.textContent = Math.round(result.overlayOpacity * 100) + '%';
    }
    updatePreview();
  });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function updatePreview() {
  const rgb = hexToRgb(colorPicker.value);
  const opacity = opacitySlider.value / 100;
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  previewOverlay.style.background = bgColor;
}

function saveSettings() {
  const settings = {
    volumeStep: stepSlider.value / 100,
    overlayColor: colorPicker.value,
    overlayOpacity: opacitySlider.value / 100
  };

  chrome.storage.local.set(settings, () => {
    if (chrome.runtime.lastError) {
      debug('Error saving: ' + chrome.runtime.lastError.message);
      return;
    }
    
    debug('Saved: ' + JSON.stringify(settings));
    
    // Show saved indicator
    savedIndicator.classList.add('show');
    setTimeout(() => {
      savedIndicator.classList.remove('show');
    }, 2000);
  });
}

// Update step value display
stepSlider.addEventListener('input', (e) => {
  stepValue.textContent = e.target.value + '%';
  saveSettings();
});

// Update opacity value display and preview
opacitySlider.addEventListener('input', (e) => {
  opacityValue.textContent = e.target.value + '%';
  updatePreview();
  saveSettings();
});

// Update preview and save when color changes
colorPicker.addEventListener('input', () => {
  updatePreview();
  saveSettings();
});

// Load settings on popup open
loadSettings();
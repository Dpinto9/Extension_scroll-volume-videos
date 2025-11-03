const $ = (id) => document.getElementById(id);

const els = {
  toggle: $('toggle'),
  reloadNotice: $('reloadNotice'),
  volumeStep: $('volumeStep'),
  stepValue: $('stepValue'),
  overlayColor: $('overlayColor'),
  textColor: $('textColor'),
  overlayOpacity: $('overlayOpacity'),
  opacityValue: $('opacityValue'),
  previewOverlay: $('previewOverlay'),
  previewIcon: $('previewOverlay').querySelector('.preview-icon svg'),
  previewNumber: $('previewOverlay').querySelector('.preview-number'),
  expandBtn: $('expandBtn'),
  advanced: $('advanced'),
  saved: $('saved')
};

let needsReload = false;

// Load
chrome.storage.local.get([
  'volumeStep', 'overlayColor', 'textColor', 'overlayOpacity', 'extensionEnabled'
], (data) => {
  const step = data.volumeStep ?? 0.05;
  const bg = data.overlayColor ?? '#000000';
  const txt = data.textColor ?? '#ffffff';
  const op = data.overlayOpacity ?? 0.3;
  const enabled = data.extensionEnabled !== false;

  els.volumeStep.value = step * 100;
  els.stepValue.textContent = Math.round(step * 100) + '%';
  els.overlayColor.value = bg;
  els.textColor.value = txt;
  els.overlayOpacity.value = op * 100;
  els.opacityValue.textContent = Math.round(op * 100) + '%';

  els.toggle.classList.toggle('on', enabled);

  updatePreview();

  // Auto-hide reload notice if already reloaded
  if (performance.navigation.type === 1) {
    els.reloadNotice.classList.remove('show');
  }
});

// Save
function save() {
  const settings = {
    volumeStep: els.volumeStep.value / 100,
    overlayColor: els.overlayColor.value,
    textColor: els.textColor.value,
    overlayOpacity: els.overlayOpacity.value / 100,
    extensionEnabled: els.toggle.classList.contains('on')
  };

  chrome.storage.local.set(settings, () => {
    showSaved();
    if (needsReload) els.reloadNotice.classList.add('show');
    updatePreview();
  });
}

function showSaved() {
  els.saved.classList.add('show');
  setTimeout(() => els.saved.classList.remove('show'), 1800);
}

// Preview
function updatePreview() {
  const rgb = hexToRgb(els.overlayColor.value);
  const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${els.overlayOpacity.value / 100})`;
  els.previewOverlay.style.background = bg;
  els.previewIcon.style.color = els.textColor.value;
  els.previewNumber.style.color = els.textColor.value;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Events
els.toggle.addEventListener('click', () => {
  els.toggle.classList.toggle('on');
  needsReload = true;
  save();
});

els.volumeStep.addEventListener('input', () => {
  els.stepValue.textContent = els.volumeStep.value + '%';
  save();
});

els.overlayOpacity.addEventListener('input', () => {
  els.opacityValue.textContent = els.overlayOpacity.value + '%';
  save();
});

els.overlayColor.addEventListener('input', save);
els.textColor.addEventListener('input', save);

els.reloadNotice.addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
      els.reloadNotice.classList.remove('show');
    }
  });
});

els.expandBtn.addEventListener('click', () => {
  els.advanced.classList.toggle('show');
  const svg = els.expandBtn.querySelector('svg');
  svg.style.transform = els.advanced.classList.contains('show') ? 'rotate(180deg)' : '';
});
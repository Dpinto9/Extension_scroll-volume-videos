// ============================================
// Volume Scroll – Background Script
// ============================================
const DEBUG = false;
const CONFIG_KEY = 'volumeScrollConfig';

const DEFAULT_CONFIG = {
  enabled: true,
  volumeStep: 0.05,        // 5%
  overlayColor: '#000000',
  overlayOpacity: 0.3,
  overlayDuration: 1600
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.sync.get([CONFIG_KEY], (data) => {
      const config = { ...DEFAULT_CONFIG, ...(data[CONFIG_KEY] || {}) };
      chrome.storage.sync.set({ [CONFIG_KEY]: config }, () => {
        if (DEBUG) console.log('Volume Scroll: Config initialized', config);
      });
    });
  }
});

// Listen for reload requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'reload') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
    sendResponse({ status: 'reloading' });
  }
  return true;
});
// ============================================
// DEBUG MODE - Change this to false to disable debug messages
// ============================================
const DEBUG_MODE = false;

// ============================================
// Background script - Sets default values on installation
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation - set default values
    chrome.storage.local.set({
      volumeStep: 0.05,        // 5% per scroll
      overlayColor: '#000000',  // Black
      overlayOpacity: 0.3       // 30% opacity
    }, () => {
      if (DEBUG_MODE) console.log('Volume Scroll Control: Default settings initialized');
    });
  }
  
  if (details.reason === 'update') {
    // Extension updated - ensure all settings exist
    chrome.storage.local.get(['volumeStep', 'overlayColor', 'overlayOpacity'], (result) => {
      const updates = {};
      
      if (result.volumeStep === undefined) {
        updates.volumeStep = 0.05;
      }
      if (result.overlayColor === undefined) {
        updates.overlayColor = '#000000';
      }
      if (result.overlayOpacity === undefined) {
        updates.overlayOpacity = 0.3;
      }
      
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, () => {
          if (DEBUG_MODE) console.log('Volume Scroll Control: Missing settings added');
        });
      }
    });
  }
});
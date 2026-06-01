// Set the extension action click behavior to open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting side panel behavior:", error));

// Log when background service worker initialized
console.log("VisualVerify Background Service Worker initialized.");

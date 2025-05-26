// content.js
// This script is injected into all pages to track active usage and communicate with background script

let lastActiveTime = Date.now();
let isPageActive = true;

// Send activity ping to background script every 5 seconds if page is active
setInterval(() => {
  if (isPageActive) {
    chrome.runtime.sendMessage({ 
      action: "activityPing",
      url: window.location.href
    });
  }
}, 5000);

// Track user activity on page
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keydown', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('click', updateActivity);

// Update last active time when user interacts with page
function updateActivity() {
  lastActiveTime = Date.now();
  if (!isPageActive) {
    isPageActive = true;
    chrome.runtime.sendMessage({ 
      action: "activityPing",
      url: window.location.href
    });
  }
}

// Check if page is inactive (user hasn't interacted for 30 seconds)
setInterval(() => {
  if (Date.now() - lastActiveTime > 30000) { // 30 seconds
    isPageActive = false;
    chrome.runtime.sendMessage({ action: "inactivityNotification" });
  }
}, 30000);

// Listen for visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isPageActive = false;
    chrome.runtime.sendMessage({ action: "tabHidden" });
  } else {
    isPageActive = true;
    lastActiveTime = Date.now();
    chrome.runtime.sendMessage({ 
      action: "tabVisible",
      url: window.location.href
    });
  }
});
// Initial setup
chrome.runtime.onInstalled.addListener(function() {
  // Default blocked websites
  const DEFAULT_BLOCKED_SITES = {
    socialMedia: [
      { url: "facebook.com", name: "Facebook", blocked: true, timeRemaining: 0 },
      { url: "x.com", name: "X", blocked: true, timeRemaining: 0 },
      { url: "instagram.com", name: "Instagram", blocked: true, timeRemaining: 0 },
      { url: "linkedin.com", name: "LinkedIn", blocked: true, timeRemaining: 0 }
    ],
    shopping: [
      { url: "amazon.in", name: "Amazon", blocked: true, timeRemaining: 0 },
      { url: "flipkart.com", name: "FlipKart", blocked: true, timeRemaining: 0 },
      { url: "myntra.com", name: "Myntra", blocked: true, timeRemaining: 0 },
      { url: "meesho.com", name: "Meesho", blocked: true, timeRemaining: 0 },
      { url: "ebay.com", name: "eBay", blocked: true, timeRemaining: 0 },
      { url: "walmart.com", name: "Walmart", blocked: true, timeRemaining: 0 }
    ],
    ott: [
      { url: "netflix.com", name: "Netflix", blocked: true, timeRemaining: 0 },
      { url: "youtube.com/shorts", name: "YouTube Shorts", blocked: true, timeRemaining: 0 },
      { url: "primevideo.com", name: "Prime Video", blocked: true, timeRemaining: 0 },
      { url: "hotstar.com", name: "JioHotstar", blocked: true, timeRemaining: 0 },
      { url: "sonyliv.com", name: "SonyLiv", blocked: true, timeRemaining: 0 },
      { url: "jiocinema.com", name: "JioCinema", blocked: true, timeRemaining: 0 },
      { url: "mxplayer.in", name: "Amazon MX player", blocked: true, timeRemaining: 0 }
    ]
  };

  // Set initial extension state
  chrome.storage.local.set({
    extensionEnabled: true,
    blockedSites: DEFAULT_BLOCKED_SITES,
    activeTimers: {}
  });
});

// Track active tabs and time spent
const activeTimers = {};

// Listen for tab updates to detect when user visits a website
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabNavigation(tabId, tab.url);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab.url) {
      handleTabActivation(tab.id, tab.url);
    }
  });
});

// Detect website visits
function handleTabNavigation(tabId, url) {
  chrome.storage.local.get(['extensionEnabled', 'blockedSites'], function(result) {
    if (!result.extensionEnabled) return;
    
    const domain = extractDomain(url);
    const path = extractPath(url);
    const blockedSite = findBlockedSite(domain, path, result.blockedSites);
    
    if (blockedSite) {
      const { category, index, site } = blockedSite;
      
      if (site.timeRemaining <= 0) {
        // Show blocking page
        chrome.tabs.update(tabId, { url: `block.html?domain=${domain}&category=${category}&index=${index}` });
      } else {
        // Start timer for the allowed time
        startUsageTimer(tabId, site.url, category, index);
      }
    }
  });
}

// Handle tab activation
function handleTabActivation(tabId, url) {
  const domain = extractDomain(url);
  const path = extractPath(url);
  
  // Pause all timers
  Object.keys(activeTimers).forEach(key => {
    if (activeTimers[key].interval) {
      clearInterval(activeTimers[key].interval);
      activeTimers[key].interval = null;
      activeTimers[key].paused = true;
    }
  });
  
  // For YouTube Shorts, use a specific key
  const timerKey = domain === "youtube.com" && path.startsWith("/shorts") ? "youtube.com/shorts" : domain;
  
  // Resume timer for current domain if it exists
  if (activeTimers[timerKey]) {
    activeTimers[timerKey].paused = false;
    startUsageTimer(tabId, timerKey, activeTimers[timerKey].category, activeTimers[timerKey].index);
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

// Extract path from URL
function extractPath(url) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return '';
  }
}

// Find if a domain is in the blocked sites list
function findBlockedSite(domain, path, blockedSites) {
  for (const category in blockedSites) {
    for (let i = 0; i < blockedSites[category].length; i++) {
      const site = blockedSites[category][i];
      
      // Special handling for YouTube Shorts
      if (site.url === "youtube.com/shorts" && domain === "youtube.com" && path.startsWith("/shorts")) {
        return { category, index: i, site };
      }
      // Regular domain matching for other sites
      else if (site.url !== "youtube.com/shorts" && domain.includes(site.url)) {
        return { category, index: i, site };
      }
    }
  }
  return null;
}

// Start tracking usage time for a website
function startUsageTimer(tabId, siteUrl, category, index) {
  // If timer already exists, just restart the interval
  if (activeTimers[siteUrl]) {
    if (activeTimers[siteUrl].interval) {
      clearInterval(activeTimers[siteUrl].interval);
    }
  } else {
    // Create new timer entry
    activeTimers[siteUrl] = {
      category,
      index,
      interval: null,
      paused: false,
      tabId: tabId,
      lastActive: Date.now()
    };
  }
  
  // Start the interval to decrement time
  activeTimers[siteUrl].interval = setInterval(() => {
    // Only decrement if not paused
    if (!activeTimers[siteUrl].paused) {
      chrome.storage.local.get(['blockedSites'], function(result) {
        let blockedSites = result.blockedSites;
        
        // Decrement remaining time
        if (blockedSites[category][index].timeRemaining > 0) {
          blockedSites[category][index].timeRemaining -= 1;
          
          // Save updated time
          chrome.storage.local.set({ blockedSites });
          
          // If time is up, block the site
          if (blockedSites[category][index].timeRemaining <= 0) {
            clearInterval(activeTimers[siteUrl].interval);
            delete activeTimers[siteUrl];
            
            // Check if tab is still on this domain/path
            chrome.tabs.get(tabId, function(tab) {
              if (tab) {
                const currentDomain = extractDomain(tab.url);
                const currentPath = extractPath(tab.url);
                
                // For YouTube Shorts, check both domain and path
                if ((siteUrl === "youtube.com/shorts" && currentDomain === "youtube.com" && currentPath.startsWith("/shorts")) ||
                    (siteUrl !== "youtube.com/shorts" && currentDomain.includes(siteUrl))) {
                  chrome.tabs.update(tabId, { url: `block.html?domain=${currentDomain}&category=${category}&index=${index}` });
                }
              }
            });
          }
        }
      });
    }
  }, 1000);
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "unblockSite") {
    chrome.storage.local.get(['blockedSites'], function(result) {
      let blockedSites = result.blockedSites;
      blockedSites[request.category][request.index].timeRemaining = 900; // 15 minutes in seconds
      
      chrome.storage.local.set({ blockedSites }, function() {
        // Redirect back to the original site
        chrome.tabs.update(sender.tab.id, { url: `https://${request.domain}` });
        sendResponse({ success: true });
      });
    });
    return true; // Indicates async response
  }
  
  // Handle activity ping from content script
  else if (request.action === "activityPing") {
    const domain = extractDomain(request.url);
    const path = extractPath(request.url);
    
    // For YouTube Shorts, use a specific key
    const timerKey = domain === "youtube.com" && path.startsWith("/shorts") ? "youtube.com/shorts" : domain;
    
    // If this domain has an active timer, ensure it's counting down
    if (activeTimers[timerKey]) {
      activeTimers[timerKey].paused = false;
      activeTimers[timerKey].lastActive = Date.now();
      
      // Restart the interval if it was cleared
      if (!activeTimers[timerKey].interval) {
        const { category, index } = activeTimers[timerKey];
        startUsageTimer(sender.tab.id, timerKey, category, index);
      }
    }
    sendResponse({ received: true });
  }
  
  // Handle tab becoming inactive
  else if (request.action === "inactivityNotification" || request.action === "tabHidden") {
    const domain = extractDomain(sender.tab.url);
    const path = extractPath(sender.tab.url);
    
    // For YouTube Shorts, use a specific key
    const timerKey = domain === "youtube.com" && path.startsWith("/shorts") ? "youtube.com/shorts" : domain;
    
    // Pause timer for this domain
    if (activeTimers[timerKey]) {
      if (activeTimers[timerKey].interval) {
        activeTimers[timerKey].paused = true;
      }
    }
    sendResponse({ received: true });
  }
  
  // Handle tab becoming visible again
  else if (request.action === "tabVisible") {
    const domain = extractDomain(request.url);
    const path = extractPath(request.url);
    
    // For YouTube Shorts, use a specific key
    const timerKey = domain === "youtube.com" && path.startsWith("/shorts") ? "youtube.com/shorts" : domain;
    
    if (activeTimers[timerKey]) {
      activeTimers[timerKey].paused = false;
      activeTimers[timerKey].lastActive = Date.now();
      
      // Restart timer
      if (!activeTimers[timerKey].interval) {
        const { category, index } = activeTimers[timerKey];
        startUsageTimer(sender.tab.id, timerKey, category, index);
      }
    }
    sendResponse({ received: true });
  }
  
  return true; // Indicates async response
});

// Listen for tab close events
chrome.tabs.onRemoved.addListener(function(tabId) {
  // Find and pause any timers associated with this tab
  for (const siteUrl in activeTimers) {
    if (activeTimers[siteUrl].tabId === tabId) {
      if (activeTimers[siteUrl].interval) {
        clearInterval(activeTimers[siteUrl].interval);
        activeTimers[siteUrl].interval = null;
      }
      activeTimers[siteUrl].paused = true;
    }
  }
});

// Check for inactive timers periodically (every minute)
setInterval(() => {
  const now = Date.now();
  
  // Check each timer to see if it's been inactive for too long
  for (const siteUrl in activeTimers) {
    // If a timer hasn't received activity for 5 minutes, consider it inactive
    if (!activeTimers[siteUrl].paused && (now - activeTimers[siteUrl].lastActive > 5 * 60 * 1000)) {
      activeTimers[siteUrl].paused = true;
      
      if (activeTimers[siteUrl].interval) {
        clearInterval(activeTimers[siteUrl].interval);
        activeTimers[siteUrl].interval = null;
      }
    }
  }
}, 60 * 1000);
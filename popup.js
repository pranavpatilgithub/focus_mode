document.addEventListener('DOMContentLoaded', function() {
  // Default blocked websites
  const DEFAULT_BLOCKED_SITES = {
    socialMedia: [
      { url: "facebook.com", name: "Facebook", blocked: true, timeRemaining: 0 },
      { url: "twitter.com", name: "Twitter", blocked: true, timeRemaining: 0 },
      { url: "instagram.com", name: "Instagram", blocked: true, timeRemaining: 0 },
      { url: "linkedin.com", name: "LinkedIn", blocked: true, timeRemaining: 0 }
    ],
    shopping: [
      { url: "amazon.com", name: "Amazon", blocked: true, timeRemaining: 0 },
      { url: "ebay.com", name: "eBay", blocked: true, timeRemaining: 0 },
      { url: "walmart.com", name: "Walmart", blocked: true, timeRemaining: 0 }
    ],
    ott: [
      { url: "netflix.com", name: "Netflix", blocked: true, timeRemaining: 0 },
      { url: "youtube.com", name: "YouTube", blocked: true, timeRemaining: 0 },
      { url: "primevideo.com", name: "Prime Video", blocked: true, timeRemaining: 0 },
      { url: "disneyplus.com", name: "Disney+", blocked: true, timeRemaining: 0 }
    ]
  };

  // Load extension status and websites from storage
  chrome.storage.local.get(['extensionEnabled', 'blockedSites'], function(result) {
    let extensionEnabled = result.extensionEnabled;
    if (extensionEnabled === undefined) {
      extensionEnabled = true; // Default to enabled
      chrome.storage.local.set({ extensionEnabled });
    }
    
    document.getElementById('toggleExtension').checked = extensionEnabled;
    
    let blockedSites = result.blockedSites || DEFAULT_BLOCKED_SITES;
    
    // Render all website categories
    renderWebsiteCategory('socialMedia', blockedSites.socialMedia);
    renderWebsiteCategory('shopping', blockedSites.shopping);
    renderWebsiteCategory('ott', blockedSites.ott);
  });

  // Handle toggle extension switch
  document.getElementById('toggleExtension').addEventListener('change', function(e) {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ extensionEnabled: isEnabled });
  });

  // Function to render websites for a category
  function renderWebsiteCategory(categoryId, websites) {
    const categoryElement = document.getElementById(categoryId);
    categoryElement.innerHTML = '';
    
    websites.forEach((site, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'website-item';
      
      const websiteName = document.createElement('span');
      websiteName.className = 'website-name';
      websiteName.textContent = site.name;
      
      const unblockBtn = document.createElement('button');
      unblockBtn.className = 'unblock-btn';
      
      if (site.timeRemaining > 0) {
        const timeDisplay = document.createElement('span');
        timeDisplay.className = 'unblock-timer';
        const minutes = Math.floor(site.timeRemaining / 60);
        const seconds = site.timeRemaining % 60;
        timeDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        listItem.appendChild(timeDisplay);
        
        unblockBtn.textContent = 'Extend';
      } else {
        unblockBtn.textContent = 'Unblock';
      }
      
      unblockBtn.addEventListener('click', function() {
        unblockWebsite(categoryId, index);
      });
      
      listItem.appendChild(websiteName);
      listItem.appendChild(unblockBtn);
      categoryElement.appendChild(listItem);
    });
  }

  // Function to handle unblocking a website
  function unblockWebsite(categoryId, index) {
    chrome.storage.local.get(['blockedSites'], function(result) {
      let blockedSites = result.blockedSites || DEFAULT_BLOCKED_SITES;
      
      // Grant 15 minutes (900 seconds) of usage time
      blockedSites[categoryId][index].timeRemaining = 900;
      
      chrome.storage.local.set({ blockedSites }, function() {
        // Re-render the website list
        renderWebsiteCategory(categoryId, blockedSites[categoryId]);
      });
    });
  }
});
// block.js
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const domain = urlParams.get('domain');
    const category = urlParams.get('category');
    const index = parseInt(urlParams.get('index'));
    
    // Display domain name
    document.getElementById('blocked-domain').textContent = domain;
    
    // Handle unblock button click
    document.getElementById('unblockBtn').addEventListener('click', function() {
      chrome.runtime.sendMessage({ 
        action: "unblockSite", 
        domain, 
        category, 
        index 
      }, function(response) {
        if (response && response.success) {
          // The background script will handle the redirect
        }
      });
    });
    
    // Handle cancel button click
    document.getElementById('cancelBtn').addEventListener('click', function() {
      window.history.back();
    });
  });
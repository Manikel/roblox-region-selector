// content.js - Runs on Roblox game pages

(function() {
  'use strict';
  
  console.log('Roblox Region Selector content script loaded');

  let currentRegion = 'auto';

  // Get current region preference from background script
  chrome.runtime.sendMessage({action: 'getRegion'}, function(response) {
    if (response && response.region) {
      currentRegion = response.region;
      console.log('Current region preference:', currentRegion);
    }
  });

  // Listen for region changes from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'regionChanged') {
      currentRegion = message.region;
      console.log('Region preference updated to:', currentRegion);
      
      // If user is on a game page, you might want to show a notification
      if (window.location.pathname.includes('/games/')) {
        showRegionNotification(currentRegion);
      }
    }
  });

  function showRegionNotification(region) {
    // Create a temporary notification to show the user their region preference
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
    `;
    
    const regionName = getRegionName(region);
    notification.textContent = region === 'auto' 
      ? '🌐 Using default region selection'
      : `🌍 Region preference: ${regionName}`;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  function getRegionName(regionCode) {
    const regionNames = {
      'auto': 'Auto',
      'us-east': 'US East',
      'us-west': 'US West', 
      'us-central': 'US Central',
      'eu-west': 'Europe West',
      'eu-central': 'Europe Central',
      'asia-pacific': 'Asia Pacific',
      'asia-east': 'Asia East'
    };
    return regionNames[regionCode] || regionCode;
  }

  // TODO: This is where you'll implement the actual server region forcing
  // You'll need to:
  // 1. Research how Roblox selects servers (likely through specific API calls)
  // 2. Intercept those calls and modify them based on user preference
  // 3. Handle the response to ensure the game connects to the right region

  /*
  Future implementation might include:
  
  // Monitor for Roblox's server selection requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    
    // Check if this is a server selection request
    if (url.includes('roblox.com') && url.includes('join') && currentRegion !== 'auto') {
      console.log('Intercepting server request for region:', currentRegion);
      
      // Modify the request to prefer our selected region
      // This will require reverse engineering Roblox's API
    }
    
    return originalFetch.apply(this, args);
  };
  */

})();

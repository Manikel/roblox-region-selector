// content.js - Runs on Roblox game pages

(function() {
  'use strict';
  
  console.log('[Roblox Region Selector] Content script loaded');

  let currentRegion = 'auto';
  let isSearching = false;

  // Load region preference from storage on startup
  function loadRegionPreference() {
    chrome.storage.local.get(['preferredRegion'], function(result) {
      currentRegion = result.preferredRegion || 'auto';
      console.log('[Roblox Region Selector] Loaded region preference:', currentRegion);
      
      // Notify page context about the preference
      window.postMessage({
        type: 'UPDATE_REGION_PREFERENCE',
        region: currentRegion
      }, window.location.origin);
    });
  }

  // Load preference immediately
  loadRegionPreference();

  // Listen for storage changes (when user updates preference from popup)
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.preferredRegion) {
      currentRegion = changes.preferredRegion.newValue || 'auto';
      console.log('[Roblox Region Selector] Region preference updated to:', currentRegion);
      
      // Notify page context about the new preference
      window.postMessage({
        type: 'UPDATE_REGION_PREFERENCE',
        region: currentRegion
      }, window.location.origin);
    }
  });

  // Listen for region changes from popup (backup method)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'regionChanged') {
      currentRegion = message.region;
      console.log('[Roblox Region Selector] Region preference updated to:', currentRegion);
      
      // Notify page context about the new preference
      window.postMessage({
        type: 'UPDATE_REGION_PREFERENCE',
        region: currentRegion
      }, window.location.origin);
    }
  });

  // Inject the injector script into page context
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injector.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
  } else {
    injectScript();
  }

  // Listen for play button clicks
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) {
      return;
    }
    
    if (event.data && event.data.type === 'PLAY_BUTTON_CLICKED') {
      console.log('[Roblox Region Selector] Received PLAY_BUTTON_CLICKED message');
      handlePlayButtonClick(event.data.placeId);
    }
  });

  async function handlePlayButtonClick(placeId) {
    console.log('[Roblox Region Selector] handlePlayButtonClick called with placeId:', placeId);
    console.log('[Roblox Region Selector] Current region:', currentRegion);
    console.log('[Roblox Region Selector] isSearching:', isSearching);
    
    // If region is auto or not set, don't intercept - let Roblox handle it
    if (!currentRegion || currentRegion === 'auto') {
      console.log('[Roblox Region Selector] Auto mode, allowing normal join');
      return;
    }

    if (isSearching) {
      console.log('[Roblox Region Selector] Already searching for server');
      return;
    }

    console.log('[Roblox Region Selector] Play button intercepted, searching for', currentRegion, 'server');
    isSearching = true;

    // Show searching popup
    showSearchingPopup();

    try {
      // Find a server in the preferred region
      const server = await findServerInRegion(placeId, currentRegion);
      
      if (server) {
        updateSearchingPopup('Found server! Joining...', false);
        
        // Join the server
        window.postMessage({
          type: 'JOIN_SPECIFIC_SERVER',
          placeId: placeId,
          serverId: server.id
        }, window.location.origin);
        
        // Close popup after a short delay
        setTimeout(() => {
          closeSearchingPopup();
          isSearching = false;
        }, 1000);
      } else {
        updateSearchingPopup(`No servers found in ${getRegionName(currentRegion)}. Try again or select a different region.`, true);
        setTimeout(() => {
          closeSearchingPopup();
          isSearching = false;
        }, 3000);
      }
    } catch (error) {
      console.error('[Roblox Region Selector] Error finding server:', error);
      updateSearchingPopup('Error finding server. Please try again.', true);
      setTimeout(() => {
        closeSearchingPopup();
        isSearching = false;
      }, 3000);
    }
  }

  async function findServerInRegion(placeId, regionCode) {
    const maxPages = 3; // Check up to 3 pages of servers
    let cursor = '';
    
    for (let page = 0; page < maxPages; page++) {
      try {
        // Fetch server list
        const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&excludeFullGames=true&limit=100${cursor ? '&cursor=' + cursor : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('[Roblox Region Selector] Failed to fetch servers:', response.status);
          break;
        }
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
          break;
        }

        updateSearchingPopup(`Checking servers (page ${page + 1})...`, false);
        
        // Check each server in this page
        for (const server of data.data) {
          // Get server details from background script
          const details = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'getServerDetails',
              placeId: placeId,
              serverId: server.id
            }, (response) => {
              resolve(response);
            });
          });
          
          if (details && details.success && details.region === regionCode) {
            console.log('[Roblox Region Selector] Found matching server:', server.id, 'IP:', details.serverIP);
            return server;
          }
        }
        
        // Move to next page if available
        if (data.nextPageCursor) {
          cursor = data.nextPageCursor;
        } else {
          break;
        }
      } catch (error) {
        console.error('[Roblox Region Selector] Error fetching page:', error);
        break;
      }
    }
    
    return null;
  }

  function showSearchingPopup() {
    // Remove any existing popup
    closeSearchingPopup();
    
    const popup = document.createElement('div');
    popup.id = 'roblox-region-selector-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: white;
      padding: 30px 40px;
      border-radius: 16px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      z-index: 999999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      min-width: 300px;
      text-align: center;
      border: 2px solid #3a3a3a;
    `;
    
    popup.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div class="spinner" style="
          border: 3px solid #3a3a3a;
          border-top: 3px solid #0078d4;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
      </div>
      <div id="roblox-region-selector-message" style="
        font-weight: 500;
        color: #e0e0e0;
      ">Searching for server in ${getRegionName(currentRegion)}...</div>
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    popup.appendChild(style);
    
    document.body.appendChild(popup);
  }

  function updateSearchingPopup(message, isError) {
    const popup = document.getElementById('roblox-region-selector-popup');
    if (popup) {
      const messageEl = document.getElementById('roblox-region-selector-message');
      const spinner = popup.querySelector('.spinner');
      
      if (messageEl) {
        messageEl.textContent = message;
        if (isError) {
          messageEl.style.color = '#ff6b6b';
        }
      }
      
      if (spinner && isError) {
        spinner.style.display = 'none';
      }
    }
  }

  function closeSearchingPopup() {
    const popup = document.getElementById('roblox-region-selector-popup');
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
  }

  function getRegionName(regionCode) {
    const regionNames = {
      'auto': 'Auto',
      'seattle': 'Seattle, WA',
      'losangeles': 'Los Angeles, CA',
      'dallas': 'Dallas, TX',
      'chicago': 'Chicago, IL',
      'atlanta': 'Atlanta, GA',
      'miami': 'Miami, FL',
      'ashburn': 'Ashburn, VA',
      'newyork': 'New York City, NY',
      'london': 'London, UK',
      'amsterdam': 'Amsterdam, NL',
      'paris': 'Paris, FR',
      'frankfurt': 'Frankfurt, DE',
      'warsaw': 'Warsaw, PL',
      'mumbai': 'Mumbai, IN',
      'tokyo': 'Tokyo, JP',
      'singapore': 'Singapore',
      'sydney': 'Sydney, AU'
    };
    return regionNames[regionCode] || regionCode;
  }

})();
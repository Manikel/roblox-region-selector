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
      // Find a server in the preferred region using fast parallel method
      const server = await findServerInRegionFast(placeId, currentRegion);
      
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

  async function findServerInRegionFast(placeId, regionCode) {
    const startTime = Date.now();
    updateSearchingPopup('Fetching server list...', false);
    
    // Fetch all available servers (up to 500)
    const allServers = await fetchAllServers(placeId);
    
    if (!allServers || allServers.length === 0) {
      console.log('[Roblox Region Selector] No servers found');
      return null;
    }
    
    console.log('[Roblox Region Selector] Found', allServers.length, 'servers total');
    updateSearchingPopup(`Checking regions for ${allServers.length} servers...`, false);
    
    // Check all servers in parallel (batch of 20 at a time to avoid overwhelming)
    const batchSize = 20;
    const serversWithRegions = [];
    
    for (let i = 0; i < allServers.length; i += batchSize) {
      const batch = allServers.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, allServers.length);
      updateSearchingPopup(`Analyzing servers... (${progress}/${allServers.length})`, false);
      
      // Check all servers in this batch in parallel
      const batchPromises = batch.map(server => 
        getServerRegion(placeId, server.id).then(region => ({
          ...server,
          region: region
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      serversWithRegions.push(...batchResults);
      
      // If we found a matching server in the preferred region, we can stop early
      const matchingServer = batchResults.find(s => s.region === regionCode);
      if (matchingServer) {
        console.log('[Roblox Region Selector] Found matching server early:', matchingServer.id);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Roblox Region Selector] Search completed in ${elapsed}s`);
        
        // Return a medium-sized server (10-20 players if possible)
        const mediumServers = serversWithRegions.filter(s => 
          s.region === regionCode && s.playing >= 10 && s.playing <= 20
        );
        
        if (mediumServers.length > 0) {
          return mediumServers[0];
        }
        
        // Otherwise return any matching server
        return matchingServer;
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Roblox Region Selector] Search completed in ${elapsed}s`);
    
    // Filter servers by region
    const matchingServers = serversWithRegions.filter(s => s.region === regionCode);
    
    if (matchingServers.length === 0) {
      console.log('[Roblox Region Selector] No matching servers found for region:', regionCode);
      return null;
    }
    
    console.log('[Roblox Region Selector] Found', matchingServers.length, 'servers in', regionCode);
    
    // Prefer medium-sized servers (10-20 players)
    const mediumServers = matchingServers.filter(s => s.playing >= 10 && s.playing <= 20);
    if (mediumServers.length > 0) {
      console.log('[Roblox Region Selector] Selecting medium-sized server');
      return mediumServers[0];
    }
    
    // Otherwise prefer servers with some players (5-30)
    const populatedServers = matchingServers.filter(s => s.playing >= 5 && s.playing <= 30);
    if (populatedServers.length > 0) {
      console.log('[Roblox Region Selector] Selecting populated server');
      return populatedServers[0];
    }
    
    // Last resort: return any matching server
    return matchingServers[0];
  }

  async function fetchAllServers(placeId) {
    const allServers = [];
    let cursor = '';
    const maxPages = 5; // Fetch up to 500 servers (5 pages x 100)
    
    for (let page = 0; page < maxPages; page++) {
      try {
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
        
        allServers.push(...data.data);
        
        // Move to next page if available
        if (data.nextPageCursor) {
          cursor = data.nextPageCursor;
        } else {
          break;
        }
      } catch (error) {
        console.error('[Roblox Region Selector] Error fetching servers:', error);
        break;
      }
    }
    
    return allServers;
  }

  async function getServerRegion(placeId, serverId) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getServerDetails',
          placeId: placeId,
          serverId: serverId
        }, (response) => {
          resolve(response);
        });
      });
      
      if (response && response.success && response.region) {
        return response.region;
      }
      
      return 'unknown';
    } catch (error) {
      console.error('[Roblox Region Selector] Error getting server region:', error);
      return 'unknown';
    }
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
      min-width: 350px;
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
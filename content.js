// content.js - Enhanced UI with in-page globe interface
(function() {
  'use strict';

  console.log('[Roblox Region Selector] Content script loaded');

  let currentPlaceId = null;
  let allServers = [];
  let regionServerCounts = {};
  let currentSelectedRegion = null;

  // Region coordinates on globe (latitude, longitude)
  const REGION_COORDS = {
    'seattle': { lat: 47.6062, lon: -122.3321, name: 'Seattle', state: 'WA', country: 'US', flag: '🇺🇸' },
    'losangeles': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles', state: 'CA', country: 'US', flag: '🇺🇸' },
    'dallas': { lat: 32.7767, lon: -96.7970, name: 'Dallas', state: 'TX', country: 'US', flag: '🇺🇸' },
    'chicago': { lat: 41.8781, lon: -87.6298, name: 'Chicago', state: 'IL', country: 'US', flag: '🇺🇸' },
    'atlanta': { lat: 33.7490, lon: -84.3880, name: 'Atlanta', state: 'GA', country: 'US', flag: '🇺🇸' },
    'miami': { lat: 25.7617, lon: -80.1918, name: 'Miami', state: 'FL', country: 'US', flag: '🇺🇸' },
    'ashburn': { lat: 39.0438, lon: -77.4874, name: 'Ashburn', state: 'VA', country: 'US', flag: '🇺🇸' },
    'newyork': { lat: 40.7128, lon: -74.0060, name: 'New York City', state: 'NY', country: 'US', flag: '🇺🇸' },
    'london': { lat: 51.5074, lon: -0.1278, name: 'London', country: 'UK', flag: '🇬🇧' },
    'amsterdam': { lat: 52.3676, lon: 4.9041, name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
    'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris', country: 'France', flag: '🇫🇷' },
    'frankfurt': { lat: 50.1109, lon: 8.6821, name: 'Frankfurt', country: 'Germany', flag: '🇩🇪' },
    'warsaw': { lat: 52.2297, lon: 21.0122, name: 'Warsaw', country: 'Poland', flag: '🇵🇱' },
    'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai', country: 'India', flag: '🇮🇳' },
    'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
    'singapore': { lat: 1.3521, lon: 103.8198, name: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
    'sydney': { lat: -33.8688, lon: 151.2093, name: 'Sydney', country: 'Australia', flag: '🇦🇺' }
  };

  // World map texture URL
  const WORLD_MAP_URL = chrome.runtime.getURL('icons/world-map.png');

  // Inject button next to Roblox play button
  function injectRegionButton() {
    const playButtonSelectors = [
      'button[data-testid="play-button"]',
      '#game-details-play-button-container button',
      'button.btn-common-play-game-lg',
      'button[class*="btn-primary-md"][class*="play"]'
    ];

    let playButton = null;
    for (const selector of playButtonSelectors) {
      playButton = document.querySelector(selector);
      if (playButton) {
        break;
      }
    }

    if (!playButton) {
      return;
    }

    if (document.getElementById('rrs-region-button')) {
      return;
    }

    // Extract place ID from URL
    const match = window.location.pathname.match(/\/games\/(\d+)/);
    if (!match) {
      return;
    }
    currentPlaceId = match[1];

    // Create our button
    const regionButton = document.createElement('button');
    regionButton.id = 'rrs-region-button';
    regionButton.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 28px; height: 28px; vertical-align: middle;" />
    `;

    // Style to match Roblox button with blue color
    const playButtonStyles = window.getComputedStyle(playButton);
    regionButton.style.cssText = `
      background: #4181FA;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      font-family: ${playButtonStyles.fontFamily};
      height: ${playButtonStyles.height};
      margin-right: 8px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    regionButton.addEventListener('mouseenter', () => {
      regionButton.style.background = '#3366CC';
      regionButton.style.transform = 'scale(1.05)';
    });

    regionButton.addEventListener('mouseleave', () => {
      regionButton.style.background = '#4181FA';
      regionButton.style.transform = 'scale(1)';
    });

    regionButton.addEventListener('click', () => {
      openGlobeOverlay();
    });

    // Insert before play button
    playButton.parentNode.insertBefore(regionButton, playButton);

    // Slightly shrink the play button to make room
    const currentWidth = playButton.offsetWidth;
    playButton.style.width = `${currentWidth - 60}px`;

    console.log('[Roblox Region Selector] Region button injected');
  }

  // Try to inject button with retries
  let injectionAttempts = 0;
  const maxAttempts = 20;
  const injectionInterval = setInterval(() => {
    injectRegionButton();
    injectionAttempts++;
    if (injectionAttempts >= maxAttempts || document.getElementById('rrs-region-button')) {
      clearInterval(injectionInterval);
    }
  }, 500);

  // Also watch for DOM changes
  const observer = new MutationObserver(() => {
    injectRegionButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Open globe overlay
  async function openGlobeOverlay() {
    if (document.getElementById('rrs-globe-overlay')) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'rrs-globe-overlay';
    overlay.innerHTML = `
      <style>
        #rrs-globe-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: rrs-fadeIn 0.3s ease;
        }

        @keyframes rrs-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes rrs-fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes rrs-globePopIn {
          0% {
            opacity: 0;
            transform: scale(0.5) translateX(0);
          }
          60% {
            transform: scale(1.1) translateX(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateX(0);
          }
        }

        #rrs-status-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: white;
          font-size: 18px;
          font-family: 'Segoe UI', sans-serif;
          font-weight: 500;
          margin-bottom: 30px;
          opacity: 0;
          animation: rrs-fadeIn 0.5s ease 0.3s forwards;
        }

        #rrs-status-logo {
          width: 32px;
          height: 32px;
        }

        #rrs-status-text {
          color: white;
        }

        .rrs-mini-spinner {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid #4181FA;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: rrs-spin 1s linear infinite;
        }

        .rrs-mini-spinner.hidden {
          display: none;
        }

        @keyframes rrs-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        #rrs-globe-container {
          position: relative;
          width: 600px;
          height: 600px;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          animation: rrs-globePopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        #rrs-globe-container.shifted {
          transform: translateX(-200px);
        }

        #rrs-globe {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
          user-select: none;
        }

        #rrs-globe:active {
          cursor: grabbing;
        }

        .rrs-region-dot {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rrs-region-dot:hover {
          r: 12 !important;
        }

        .rrs-region-dot.inactive {
          fill: #666;
        }

        .rrs-region-dot.active {
          fill: #4181FA;
          filter: drop-shadow(0 0 8px rgba(65, 129, 250, 0.8));
        }

        #rrs-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        }

        #rrs-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        #rrs-server-list {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(calc(-50% + 100px), -50%);
          width: 450px;
          max-height: 80vh;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 16px;
          padding: 30px;
          opacity: 0;
          pointer-events: none;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        #rrs-server-list.visible {
          transform: translate(calc(-50% + 350px), -50%);
          opacity: 1;
          pointer-events: auto;
        }

        .rrs-server-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          transition: all 0.2s ease;
        }

        .rrs-server-item:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .rrs-server-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .rrs-player-count {
          color: #4181FA;
          font-weight: 600;
          font-size: 16px;
        }

        .rrs-player-avatars {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .rrs-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .rrs-join-btn {
          background: #4181FA;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .rrs-join-btn:hover {
          background: #3366CC;
          transform: scale(1.02);
        }

        .rrs-region-header {
          color: white;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rrs-region-flag {
          font-size: 32px;
        }

        .rrs-tooltip {
          position: fixed;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Segoe UI', sans-serif;
          pointer-events: none;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .rrs-tooltip.visible {
          opacity: 1;
        }

        #rrs-server-list::-webkit-scrollbar {
          width: 8px;
        }

        #rrs-server-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        #rrs-server-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }

        #rrs-server-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>

      <div id="rrs-close-btn">×</div>

      <div id="rrs-status-bar">
        <img id="rrs-status-logo" src="${chrome.runtime.getURL('icons/icon128.png')}" />
        <span id="rrs-status-text">Searching for servers...</span>
        <div class="rrs-mini-spinner" id="rrs-mini-spinner"></div>
      </div>

      <div id="rrs-globe-container">
        <div id="rrs-globe"></div>
      </div>

      <div id="rrs-server-list"></div>

      <div class="rrs-tooltip" id="rrs-tooltip"></div>
    `;

    document.body.appendChild(overlay);

    // Close button handler
    document.getElementById('rrs-close-btn').addEventListener('click', closeGlobeOverlay);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeGlobeOverlay();
      }
    });

    // Render globe immediately (with all gray dots) and store reference
    renderGlobe().then(instance => {
      globeRendererInstance = instance;
      console.log('[RRS] Globe rendered successfully');
    }).catch(error => {
      console.error('[RRS] Failed to render globe:', error);
    });

    // Start scanning servers in real-time
    scanServersForRegionsRealtime();
  }

  function closeGlobeOverlay() {
    const overlay = document.getElementById('rrs-globe-overlay');
    if (overlay) {
      overlay.style.animation = 'rrs-fadeOut 0.3s ease';
      setTimeout(() => {
        overlay.remove();
        globeRendererInstance = null; // Clean up reference
      }, 300);
    }
  }

  // Scan all servers and group by region
  async function scanServersForRegions() {
    regionServerCounts = {};

    // Fetch all servers
    allServers = await fetchAllServers(currentPlaceId);

    if (!allServers || allServers.length === 0) {
      document.getElementById('rrs-loading').innerHTML = `
        <div style="color: #ff6b6b;">No servers found for this game.</div>
      `;
      return;
    }

    console.log(`[RRS] Starting region scan for ${allServers.length} servers`);

    // Check regions in smaller batches with delays to avoid rate limiting
    const batchSize = 10; // Reduced from 20 to 10
    const batchDelay = 300; // 300ms delay between batches

    for (let i = 0; i < allServers.length; i += batchSize) {
      const batch = allServers.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, allServers.length);

      // Always show spinner during scan
      document.getElementById('rrs-loading').innerHTML = `
        <div class="rrs-spinner"></div>
        <div>Scanning regions... (${progress}/${allServers.length})</div>
      `;

      // Add delay between batches (except first batch)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // Use Promise.allSettled instead of Promise.all to handle failures gracefully
      const batchPromises = batch.map(server =>
        getServerRegion(currentPlaceId, server.id).then(region => ({
          ...server,
          region: region
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Count servers per region
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.region && result.value.region !== 'unknown') {
          const region = result.value.region;
          regionServerCounts[region] = (regionServerCounts[region] || 0) + 1;
        }
      });

      // Log progress
      const regionsFound = Object.keys(regionServerCounts).length;
      console.log(`[RRS] Progress: ${progress}/${allServers.length} scanned, ${regionsFound} regions found`);
    }

    console.log('[RRS] Region scan complete:', regionServerCounts);

    // Hide loading, show globe
    document.getElementById('rrs-loading').style.display = 'none';
    renderGlobe().catch(error => {
      console.error('[RRS] Failed to render globe:', error);
    });
  }

  // Global reference to globe renderer for real-time updates
  let globeRendererInstance = null;
  let shouldStopScanning = false;  // Flag to stop scanning when server is joined

  // Real-time server scanning - updates globe as regions are discovered
  async function scanServersForRegionsRealtime() {
    regionServerCounts = {};
    shouldStopScanning = false;  // Reset flag

    // Update status
    const statusText = document.getElementById('rrs-status-text');
    const miniSpinner = document.getElementById('rrs-mini-spinner');

    // Fetch all servers
    statusText.textContent = 'Loading servers...';
    allServers = await fetchAllServers(currentPlaceId);

    if (!allServers || allServers.length === 0) {
      statusText.textContent = 'No servers found';
      miniSpinner.classList.add('hidden');
      return;
    }

    // Scan ALL servers continuously
    const scanList = allServers;

    console.log(`[RRS] Fetched ${allServers.length} servers, will scan all for regions`);
    statusText.textContent = `Scanning regions... (0/${scanList.length})`;

    // Check regions in batches with real-time updates
    const batchSize = 10;
    const batchDelay = 300;

    for (let i = 0; i < scanList.length; i += batchSize) {
      // Stop scanning if player joined a server
      if (shouldStopScanning) {
        console.log('[RRS] Stopping scan - player joined server');
        break;
      }

      const batch = scanList.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, scanList.length);

      // Update status
      statusText.textContent = `Scanning regions... (${progress}/${scanList.length})`;

      // Add delay between batches
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // Check batch regions
      const batchPromises = batch.map(server =>
        getServerRegion(currentPlaceId, server.id).then(region => ({
          ...server,
          region: region
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Update region counts and store region info in allServers
      let newRegionFound = false;
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.region) {
          const region = result.value.region;
          const serverIndex = i + idx;

          // Store region in allServers array
          if (allServers[serverIndex]) {
            allServers[serverIndex].region = region;
          }

          if (region !== 'unknown') {
            if (!regionServerCounts[region]) {
              newRegionFound = true;
              console.log(`[RRS] New region discovered: ${region}`);
            }
            regionServerCounts[region] = (regionServerCounts[region] || 0) + 1;
          }
        }
      });

      // Re-render globe to update dots if new region found
      if (newRegionFound && globeRendererInstance) {
        globeRendererInstance.updateDots();
      }

      // Log progress
      const regionsFound = Object.keys(regionServerCounts).length;
      console.log(`[RRS] Progress: ${progress}/${scanList.length} scanned, ${regionsFound} regions found, ${Object.values(regionServerCounts).reduce((a,b) => a+b, 0)} servers mapped`);
    }

    console.log('[RRS] Real-time scan complete:', regionServerCounts);

    // Update status - scanning complete
    const totalMapped = Object.values(regionServerCounts).reduce((a,b) => a+b, 0);
    statusText.textContent = `Found ${Object.keys(regionServerCounts).length} regions (${totalMapped} servers)`;
    miniSpinner.classList.add('hidden');
  }


  //
  // Render 3D globe with optimized Canvas rendering
  // Professional globe renderer using Globe3D
  let globeInstance = null;

  async function renderGlobe() {
    // Create globe instance (Globe3D is loaded via manifest.json)
    globeInstance = new Globe3D('rrs-globe', {
      width: 600,
      height: 600,
      radius: 250
    });

    // Load texture
    await globeInstance.loadTexture(WORLD_MAP_URL);

    // Add markers for all regions
    Object.entries(REGION_COORDS).forEach(([code, data]) => {
      globeInstance.addMarker(data.lat, data.lon, {
        code: code,
        name: data.name,
        city: data.name,
        state: data.state,
        country: data.country,
        flag: data.flag,
        count: regionServerCounts[code] || 0
      });
    });

    // Handle marker clicks
    globeInstance.onMarkerClick = (markerData) => {
      if (markerData.count > 0) {
        showServerList(markerData.code);
      }
    };

    // Start rendering
    globeInstance.start();

    // Return API matching old implementation
    return {
      updateDots: () => {
        // Update marker data when server counts change
        if (globeInstance) {
          globeInstance.markers = [];
          Object.entries(REGION_COORDS).forEach(([code, data]) => {
            globeInstance.addMarker(data.lat, data.lon, {
              code: code,
              name: data.name,
              city: data.name,
              state: data.state,
              country: data.country,
              flag: data.flag,
              count: regionServerCounts[code] || 0
            });
          });
        }
      },
      destroy: () => {
        if (globeInstance) {
          globeInstance.destroy();
          globeInstance = null;
        }
      }
    };
  }

  // Show server list for a specific region
  async function showServerList(regionCode) {
    // If clicking the same region, do nothing
    if (currentSelectedRegion === regionCode) {
      return;
    }

    const serverList = document.getElementById('rrs-server-list');
    const globeContainer = document.getElementById('rrs-globe-container');

    // If there's already a region selected, animate out first
    if (currentSelectedRegion !== null) {
      // Slide out and fade out current server list
      serverList.classList.remove('visible');
      globeContainer.classList.remove('shifted');

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Update current selection
    currentSelectedRegion = regionCode;

    const regionData = REGION_COORDS[regionCode];

    const regionServers = allServers.filter(s => s.region === regionCode);

    // Sort by player count (high to low)
    regionServers.sort((a, b) => b.playing - a.playing);

    // Build server list HTML
    const locationName = regionData.state
      ? `${regionData.name}, ${regionData.state}`
      : regionData.name;

    let html = `
      <div class="rrs-region-header">
        <span class="rrs-region-flag">${regionData.flag}</span>
        <span>${locationName}</span>
      </div>
    `;

    // Add servers with player avatars
    for (const server of regionServers) {
      // Get player avatars (limit to 6 players)
      const playerIds = server.playerTokens ? server.playerTokens.slice(0, 6) : [];

      let avatarsHtml = '';
      if (playerIds.length > 0) {
        avatarsHtml = '<div class="rrs-player-avatars">';
        for (const token of playerIds) {
          avatarsHtml += `<img class="rrs-avatar" src="https://www.roblox.com/headshot-thumbnail/image?userId=${token}&width=48&height=48&format=png" onerror="this.src='${chrome.runtime.getURL('icons/icon48.png')}'" />`;
        }
        avatarsHtml += '</div>';
      }

      html += `
        <div class="rrs-server-item">
          <div class="rrs-server-header">
            <span class="rrs-player-count">${server.playing}/${server.maxPlayers} players</span>
          </div>
          ${avatarsHtml}
          <button class="rrs-join-btn" data-server-id="${server.id}">Join Server</button>
        </div>
      `;
    }

    const serverListElem = document.getElementById('rrs-server-list');
    serverListElem.innerHTML = html;

    // Shift globe left and show server list with animation
    setTimeout(() => {
      globeContainer.classList.add('shifted');
      serverListElem.classList.add('visible');
    }, 100);

    // Add join button handlers
    serverListElem.querySelectorAll('.rrs-join-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serverId = btn.getAttribute('data-server-id');
        joinServer(serverId);
      });
    });
  }

  // Join a specific server
  async function joinServer(serverId) {
    console.log('[RRS] Joining server:', serverId);

    // Stop scanning
    shouldStopScanning = true;

    // Close overlay
    closeGlobeOverlay();

    // Join via injector
    window.postMessage({
      type: 'JOIN_SPECIFIC_SERVER',
      placeId: currentPlaceId,
      serverId: serverId
    }, window.location.origin);

    // Show thank you popup after a short delay
    setTimeout(() => {
      showThankYouPopup();
    }, 1000);
  }

  function showThankYouPopup() {
    const popup = document.createElement('div');
    popup.id = 'rrs-thankyou-popup';
    popup.innerHTML = `
      <style>
        #rrs-thankyou-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: rrs-fadeIn 0.3s ease;
        }

        #rrs-thankyou-content {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 20px;
          padding: 50px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        #rrs-thankyou-content img {
          width: 100px;
          height: 100px;
          margin-bottom: 30px;
        }

        #rrs-thankyou-content h2 {
          color: white;
          font-family: 'Segoe UI', sans-serif;
          font-size: 28px;
          margin-bottom: 15px;
        }

        #rrs-thankyou-content p {
          color: #ccc;
          font-family: 'Segoe UI', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .rrs-thankyou-btn {
          background: #4181FA;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 30px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          font-family: 'Segoe UI', sans-serif;
          margin: 0 10px;
        }

        .rrs-thankyou-btn:hover {
          background: #3366CC;
          transform: scale(1.05);
        }

        .rrs-thankyou-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
        }

        .rrs-thankyou-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      </style>

      <div id="rrs-thankyou-content">
        <img src="${chrome.runtime.getURL('icons/icon128.png')}" />
        <h2>Thank You!</h2>
        <p>Thank you for using Roblox Region Selector! Your server is loading. If you enjoyed this extension, please consider rating us.</p>
        <button class="rrs-thankyou-btn" id="rrs-rate-btn">Rate Extension</button>
        <button class="rrs-thankyou-btn secondary" id="rrs-close-thankyou">Close</button>
      </div>
    `;

    document.body.appendChild(popup);

    // Close button
    document.getElementById('rrs-close-thankyou').addEventListener('click', () => {
      popup.remove();
    });

    // Rate button
    document.getElementById('rrs-rate-btn').addEventListener('click', () => {
      window.open('https://chrome.google.com/webstore', '_blank');
      popup.remove();
    });

    // Auto close after 10 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 10000);
  }

  // Helper: Fetch all servers
  async function fetchAllServers(placeId) {
    const allServers = [];
    let cursor = '';
    const maxPages = 15; // Fetch up to 1500 servers (15 pages * 100)

    console.log('[RRS] Starting to fetch servers...');

    for (let page = 0; page < maxPages; page++) {
      try {
        const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&excludeFullGames=true&limit=100${cursor ? '&cursor=' + cursor : ''}`;

        // Add delay between pages to avoid rate limiting (150ms)
        if (page > 0) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        const response = await fetch(url);

        if (!response.ok) {
          console.log(`[RRS] Fetch failed with status ${response.status}, stopping at page ${page}`);
          break;
        }

        const data = await response.json();
        if (!data.data || data.data.length === 0) {
          console.log(`[RRS] No more servers found at page ${page}`);
          break;
        }

        allServers.push(...data.data);
        console.log(`[RRS] Fetched page ${page + 1}: ${data.data.length} servers (total: ${allServers.length})`);

        // Update loading UI
        document.getElementById('rrs-loading').innerHTML = `
          <div class="rrs-spinner"></div>
          <div>Loading servers... (${allServers.length} found)</div>
        `;

        if (data.nextPageCursor) {
          cursor = data.nextPageCursor;
        } else {
          console.log(`[RRS] No more pages available`);
          break;
        }
      } catch (error) {
        console.error('[RRS] Error fetching servers:', error);
        break;
      }
    }

    console.log(`[RRS] Total servers fetched: ${allServers.length}`);
    return allServers;
  }

  // Helper: Get server region with retry logic
  async function getServerRegion(placeId, serverId, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add exponential backoff delay for retries
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }

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

        // If we got a response but no region, don't retry
        if (response && response.success) {
          return 'unknown';
        }
      } catch (error) {
        if (attempt === retries) {
          console.error('[RRS] Error getting server region after retries:', error);
        }
      }
    }
    return 'unknown';
  }

  // Inject the injector script
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injector.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
  } else {
    injectScript();
  }

})();

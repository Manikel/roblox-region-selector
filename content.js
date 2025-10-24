// content.js - Enhanced UI with in-page globe interface
(function() {
  'use strict';

  console.log('[Roblox Region Selector] Content script loaded');

  let currentPlaceId = null;
  let allServers = [];
  let regionServerCounts = {};

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
      if (playButton) break;
    }

    if (!playButton || document.getElementById('rrs-region-button')) {
      return;
    }

    // Extract place ID from URL
    const match = window.location.pathname.match(/\/games\/(\d+)/);
    if (!match) return;
    currentPlaceId = match[1];

    // Create our button
    const regionButton = document.createElement('button');
    regionButton.id = 'rrs-region-button';
    regionButton.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 20px; height: 20px; vertical-align: middle;" />
    `;

    // Style to match Roblox button
    const playButtonStyles = window.getComputedStyle(playButton);
    regionButton.style.cssText = `
      background: #00b06f;
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
      regionButton.style.background = '#00a561';
      regionButton.style.transform = 'scale(1.05)';
    });

    regionButton.addEventListener('mouseleave', () => {
      regionButton.style.background = '#00b06f';
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

        #rrs-globe-container {
          position: relative;
          width: 600px;
          height: 600px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #rrs-globe-container.shifted {
          transform: translateX(-250px);
        }

        #rrs-globe {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
        }

        #rrs-globe:active {
          cursor: grabbing;
        }

        #rrs-globe-svg {
          width: 100%;
          height: 100%;
        }

        .rrs-region-dot {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rrs-region-dot:hover {
          transform: scale(1.5);
        }

        .rrs-region-dot.inactive {
          fill: #666;
        }

        .rrs-region-dot.active {
          fill: #00b06f;
          filter: drop-shadow(0 0 8px rgba(0, 176, 111, 0.8));
        }

        #rrs-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 60px;
          height: 60px;
          z-index: 10;
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

        #rrs-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 18px;
          font-family: 'Segoe UI', sans-serif;
          text-align: center;
        }

        .rrs-spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #00b06f;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: rrs-spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes rrs-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        #rrs-server-list {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%) translateX(100%);
          width: 450px;
          max-height: 80vh;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 16px;
          padding: 30px;
          opacity: 0;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        #rrs-server-list.visible {
          transform: translateY(-50%) translateX(0);
          opacity: 1;
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
          color: #00b06f;
          font-weight: 600;
          font-size: 16px;
        }

        .rrs-join-btn {
          background: #00b06f;
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
          background: #00a561;
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
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Segoe UI', sans-serif;
          pointer-events: none;
          z-index: 1000;
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

      <img id="rrs-logo" src="${chrome.runtime.getURL('icons/icon128.png')}" />

      <div id="rrs-close-btn">×</div>

      <div id="rrs-globe-container">
        <div id="rrs-loading">
          <div class="rrs-spinner"></div>
          <div>Scanning servers across regions...</div>
        </div>
        <div id="rrs-globe"></div>
        <div id="rrs-server-list"></div>
      </div>

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

    // Start scanning servers
    await scanServersForRegions();
  }

  function closeGlobeOverlay() {
    const overlay = document.getElementById('rrs-globe-overlay');
    if (overlay) {
      overlay.style.animation = 'rrs-fadeOut 0.3s ease';
      overlay.addEventListener('animationend', () => {
        overlay.remove();
      });
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

    // Check regions in batches
    const batchSize = 20;
    for (let i = 0; i < allServers.length; i += batchSize) {
      const batch = allServers.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, allServers.length);

      document.getElementById('rrs-loading').innerHTML = `
        <div class="rrs-spinner"></div>
        <div>Scanning servers... (${progress}/${allServers.length})</div>
      `;

      const batchPromises = batch.map(server =>
        getServerRegion(currentPlaceId, server.id).then(region => ({
          ...server,
          region: region
        }))
      );

      const batchResults = await Promise.all(batchPromises);

      // Count servers per region
      batchResults.forEach(server => {
        if (server.region && server.region !== 'unknown') {
          regionServerCounts[server.region] = (regionServerCounts[server.region] || 0) + 1;
        }
      });
    }

    // Hide loading, show globe
    document.getElementById('rrs-loading').style.display = 'none';
    renderGlobe();
  }

  // Render 3D-style globe with regions
  function renderGlobe() {
    const globe = document.getElementById('rrs-globe');
    const size = 600;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 250;

    let rotationX = 0;
    let rotationY = 15;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function projectPoint(lat, lon) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + rotationX) * (Math.PI / 180);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      // Perspective projection
      const scale = 400 / (400 + z);
      return {
        x: centerX + x * scale,
        y: centerY + y * scale,
        visible: z > -radius * 0.3,
        scale: scale
      };
    }

    function render() {
      let svg = `<svg id="rrs-globe-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

      // Draw globe outline
      svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="rgba(30, 30, 30, 0.5)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="2"/>`;

      // Draw latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        let pathData = '';
        for (let lon = -180; lon <= 180; lon += 5) {
          const point = projectPoint(lat, lon);
          if (point.visible) {
            pathData += (pathData ? 'L' : 'M') + `${point.x},${point.y} `;
          }
        }
        if (pathData) {
          svg += `<path d="${pathData}" stroke="rgba(255, 255, 255, 0.05)" fill="none" stroke-width="1"/>`;
        }
      }

      // Draw longitude lines
      for (let lon = -180; lon < 180; lon += 30) {
        let pathData = '';
        for (let lat = -90; lat <= 90; lat += 5) {
          const point = projectPoint(lat, lon);
          if (point.visible) {
            pathData += (pathData ? 'L' : 'M') + `${point.x},${point.y} `;
          }
        }
        if (pathData) {
          svg += `<path d="${pathData}" stroke="rgba(255, 255, 255, 0.05)" fill="none" stroke-width="1"/>`;
        }
      }

      // Draw region dots
      const regions = Object.entries(REGION_COORDS).map(([code, data]) => {
        const point = projectPoint(data.lat, data.lon);
        const serverCount = regionServerCounts[code] || 0;
        const isActive = serverCount > 0;

        return {
          code,
          data,
          point,
          serverCount,
          isActive,
          z: point.visible ? projectPoint(data.lat, data.lon + rotationX).scale : -1
        };
      }).sort((a, b) => a.z - b.z); // Back to front

      regions.forEach(region => {
        if (region.point.visible) {
          const dotSize = 8 * region.point.scale;
          svg += `<circle
            class="rrs-region-dot ${region.isActive ? 'active' : 'inactive'}"
            cx="${region.point.x}"
            cy="${region.point.y}"
            r="${dotSize}"
            data-region="${region.code}"
            data-count="${region.serverCount}"
          />`;
        }
      });

      svg += '</svg>';
      globe.innerHTML = svg;

      // Add event listeners to dots
      document.querySelectorAll('.rrs-region-dot').forEach(dot => {
        const regionCode = dot.getAttribute('data-region');
        const count = dot.getAttribute('data-count');
        const tooltip = document.getElementById('rrs-tooltip');

        dot.addEventListener('mouseenter', (e) => {
          const regionData = REGION_COORDS[regionCode];
          tooltip.textContent = `${regionData.name}: ${count} server${count !== '1' ? 's' : ''}`;
          tooltip.style.left = e.pageX + 10 + 'px';
          tooltip.style.top = e.pageY + 10 + 'px';
          tooltip.classList.add('visible');
        });

        dot.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });

        dot.addEventListener('click', () => {
          if (count > 0) {
            showServerList(regionCode);
          }
        });
      });
    }

    // Mouse drag to rotate
    globe.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        rotationX += deltaX * 0.5;
        rotationY = Math.max(-30, Math.min(30, rotationY - deltaY * 0.2));

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        render();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    render();
  }

  // Show server list for selected region
  function showServerList(regionCode) {
    const regionData = REGION_COORDS[regionCode];
    const regionServers = allServers.filter(s => s.region === regionCode);

    // Sort by player count (high to low)
    regionServers.sort((a, b) => b.playing - a.playing);

    // Shift globe left
    document.getElementById('rrs-globe-container').classList.add('shifted');

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

    regionServers.forEach(server => {
      html += `
        <div class="rrs-server-item">
          <div class="rrs-server-header">
            <span class="rrs-player-count">${server.playing}/${server.maxPlayers} players</span>
          </div>
          <button class="rrs-join-btn" data-server-id="${server.id}">Join Server</button>
        </div>
      `;
    });

    const serverList = document.getElementById('rrs-server-list');
    serverList.innerHTML = html;

    // Add slight delay for animation
    setTimeout(() => {
      serverList.classList.add('visible');
    }, 50);

    // Add join button handlers
    serverList.querySelectorAll('.rrs-join-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const serverId = btn.getAttribute('data-server-id');
        joinServer(serverId);
      });
    });
  }

  // Join a specific server
  async function joinServer(serverId) {
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

  // Show thank you popup
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
          background: #00b06f;
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
          background: #00a561;
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
    const maxPages = 5;

    for (let page = 0; page < maxPages; page++) {
      try {
        const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&excludeFullGames=true&limit=100${cursor ? '&cursor=' + cursor : ''}`;
        const response = await fetch(url);

        if (!response.ok) break;

        const data = await response.json();
        if (!data.data || data.data.length === 0) break;

        allServers.push(...data.data);

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

  // Helper: Get server region
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

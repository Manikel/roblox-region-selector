// content.js - Enhanced UI with THREE.js globe interface
(function() {
  'use strict';

  console.log('[Roblox Region Selector] Content script loaded');

  let currentPlaceId = null;
  let allServers = [];
  let regionServerCounts = {};
  let currentSelectedRegion = null;
  let threeJsLoaded = false;

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

  // Load THREE.js dynamically
  function loadThreeJs() {
    return new Promise((resolve, reject) => {
      if (window.THREE) {
        threeJsLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        threeJsLoaded = true;
        console.log('[RRS] THREE.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('[RRS] Failed to load THREE.js');
        reject(new Error('Failed to load THREE.js'));
      };
      document.head.appendChild(script);
    });
  }

  // Inject button next to Roblox play button
  function injectRegionButton() {
    console.log('[RRS] Attempting to inject button...');

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
        console.log('[RRS] Found play button with selector:', selector);
        break;
      }
    }

    if (!playButton) {
      console.log('[RRS] No play button found');
      return;
    }

    if (document.getElementById('rrs-region-button')) {
      console.log('[RRS] Button already exists');
      return;
    }

    // Extract place ID from URL
    const match = window.location.pathname.match(/\/games\/(\d+)/);
    if (!match) {
      console.log('[RRS] No game ID in URL');
      return;
    }
    currentPlaceId = match[1];
    console.log('[RRS] Game ID:', currentPlaceId);

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

    // Load THREE.js first
    try {
      await loadThreeJs();
    } catch (error) {
      console.error('[RRS] Failed to load THREE.js:', error);
      alert('Failed to load 3D library. Please refresh the page and try again.');
      return;
    }

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
          gap: 6px;
          margin-bottom: 15px;
          flex-wrap: wrap;
          max-height: 200px;
          overflow-y: auto;
        }

        .rrs-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .rrs-avatar:hover {
          transform: scale(1.2);
          border-color: #4181FA;
          z-index: 10;
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

        .rrs-player-avatars::-webkit-scrollbar {
          width: 6px;
        }

        .rrs-player-avatars::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .rrs-player-avatars::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
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

    // Render THREE.js globe
    globeRendererInstance = renderThreeJsGlobe();

    // Start scanning servers in real-time
    scanServersForRegionsRealtime();
  }

  function closeGlobeOverlay() {
    const overlay = document.getElementById('rrs-globe-overlay');
    if (overlay) {
      // Clean up THREE.js resources
      if (globeRendererInstance && globeRendererInstance.cleanup) {
        globeRendererInstance.cleanup();
      }

      overlay.style.animation = 'rrs-fadeOut 0.3s ease';
      setTimeout(() => {
        overlay.remove();
        globeRendererInstance = null;
      }, 300);
    }
  }

  // Global reference to globe renderer for real-time updates
  let globeRendererInstance = null;

  // Real-time server scanning - FIXED: Scan ALL servers and show way more per region
  async function scanServersForRegionsRealtime() {
    regionServerCounts = {};

    const statusText = document.getElementById('rrs-status-text');
    const miniSpinner = document.getElementById('rrs-mini-spinner');

    // FIXED: Fetch way more servers (2000+)
    statusText.textContent = 'Loading servers...';
    allServers = await fetchAllServers(currentPlaceId);

    if (!allServers || allServers.length === 0) {
      statusText.textContent = 'No servers found';
      miniSpinner.classList.add('hidden');
      return;
    }

    // FIXED: Scan ALL fetched servers (not just 1000)
    const scanList = allServers; // Scan everything we fetched
    console.log(`[RRS] Fetched ${allServers.length} servers, will scan ALL for regions`);
    statusText.textContent = `Scanning regions... (0/${scanList.length})`;

    // Check regions in batches
    const batchSize = 15; // Slightly larger batches
    const batchDelay = 250; // Slightly faster

    for (let i = 0; i < scanList.length; i += batchSize) {
      const batch = scanList.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, scanList.length);

      statusText.textContent = `Scanning regions... (${progress}/${scanList.length})`;

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      const batchPromises = batch.map(server =>
        getServerRegion(currentPlaceId, server.id).then(region => ({
          ...server,
          region: region
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);

      let newRegionFound = false;
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.region) {
          const region = result.value.region;
          const serverIndex = i + idx;

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

      if (newRegionFound && globeRendererInstance) {
        globeRendererInstance.updateDots();
      }

      const regionsFound = Object.keys(regionServerCounts).length;
      console.log(`[RRS] Progress: ${progress}/${scanList.length} scanned, ${regionsFound} regions found, ${Object.values(regionServerCounts).reduce((a,b) => a+b, 0)} servers mapped`);
    }

    console.log('[RRS] Real-time scan complete:', regionServerCounts);

    const totalMapped = Object.values(regionServerCounts).reduce((a,b) => a+b, 0);
    statusText.textContent = `Found ${Object.keys(regionServerCounts).length} regions (${totalMapped} servers)`;
    miniSpinner.classList.add('hidden');
  }

  // Render THREE.js globe with proper texture mapping
  function renderThreeJsGlobe() {
    const container = document.getElementById('rrs-globe');
    const width = 600;
    const height = 600;

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create globe sphere
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(WORLD_MAP_URL);

    // Create material with texture
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 5,
      transparent: false
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create dots for regions
    const dotGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const activeMaterial = new THREE.MeshBasicMaterial({ color: 0x4181FA });
    const inactiveMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });

    const regionDots = {};

    Object.entries(REGION_COORDS).forEach(([code, data]) => {
      const lat = data.lat * (Math.PI / 180);
      const lon = data.lon * (Math.PI / 180);

      // Convert lat/lon to 3D position on sphere
      const x = Math.cos(lat) * Math.sin(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.cos(lon);

      const dot = new THREE.Mesh(dotGeometry, inactiveMaterial.clone());
      dot.position.set(x * 1.01, y * 1.01, z * 1.01);
      dot.userData = { code, data };
      scene.add(dot);

      regionDots[code] = dot;
    });

    // Rotation controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        globe.rotation.y += deltaX * 0.005;
        globe.rotation.x += deltaY * 0.005;

        // Also rotate dots with globe
        Object.values(regionDots).forEach(dot => {
          dot.rotation.y = globe.rotation.y;
          dot.rotation.x = globe.rotation.x;
        });

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Raycasting for hover
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / width) * 2 - 1,
        -((e.clientY - rect.top) / height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(Object.values(regionDots));
      const tooltip = document.getElementById('rrs-tooltip');

      if (intersects.length > 0) {
        const dot = intersects[0].object;
        const { code, data } = dot.userData;
        const serverCount = regionServerCounts[code] || 0;

        tooltip.textContent = `${data.name}: ${serverCount} server${serverCount !== 1 ? 's' : ''}`;
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
        tooltip.classList.add('visible');
        renderer.domElement.style.cursor = 'pointer';
      } else {
        tooltip.classList.remove('visible');
        renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    });

    renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
      isDragging = false;
      document.getElementById('rrs-tooltip').classList.remove('visible');
    });

    // Click handler
    renderer.domElement.addEventListener('click', (e) => {
      if (isDragging) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / width) * 2 - 1,
        -((e.clientY - rect.top) / height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(Object.values(regionDots));

      if (intersects.length > 0) {
        const dot = intersects[0].object;
        const { code } = dot.userData;
        const serverCount = regionServerCounts[code] || 0;

        if (serverCount > 0) {
          showServerList(code);
        }
      }
    });

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Return API
    return {
      updateDots: function() {
        Object.entries(regionDots).forEach(([code, dot]) => {
          const serverCount = regionServerCounts[code] || 0;
          dot.material = serverCount > 0 ? activeMaterial : inactiveMaterial;
        });
      },
      cleanup: function() {
        // Clean up THREE.js resources
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }

  // FIXED: Show server list with ALL player avatars
  async function showServerList(regionCode) {
    if (currentSelectedRegion === regionCode) {
      return;
    }

    const serverList = document.getElementById('rrs-server-list');
    const globeContainer = document.getElementById('rrs-globe-container');

    if (currentSelectedRegion !== null) {
      serverList.classList.remove('visible');
      globeContainer.classList.remove('shifted');
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    currentSelectedRegion = regionCode;

    const regionData = REGION_COORDS[regionCode];
    const regionServers = allServers.filter(s => s.region === regionCode);

    // Sort by player count (high to low)
    regionServers.sort((a, b) => b.playing - a.playing);

    const locationName = regionData.state
      ? `${regionData.name}, ${regionData.state}`
      : regionData.name;

    let html = `
      <div class="rrs-region-header">
        <span class="rrs-region-flag">${regionData.flag}</span>
        <span>${locationName}</span>
      </div>
    `;

    // FIXED: Display ALL player avatars (up to 50, which is Roblox's limit)
    for (const server of regionServers) {
      const playerIds = server.playerTokens || [];
      const displayLimit = Math.min(playerIds.length, 50); // Show all up to 50

      let avatarsHtml = '';
      if (displayLimit > 0) {
        avatarsHtml = '<div class="rrs-player-avatars">';
        for (let i = 0; i < displayLimit; i++) {
          const token = playerIds[i];
          // Roblox headshot thumbnail API
          avatarsHtml += `<img class="rrs-avatar" src="https://www.roblox.com/headshot-thumbnail/image?userId=${token}&width=48&height=48&format=png" onerror="this.src='${chrome.runtime.getURL('icons/icon48.png')}'" title="Player ${i + 1}" />`;
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

    setTimeout(() => {
      globeContainer.classList.add('shifted');
      serverListElem.classList.add('visible');
    }, 100);

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
    console.log('[Roblox Region Selector] Joining server:', serverId);

    closeGlobeOverlay();

    window.postMessage({
      type: 'JOIN_SPECIFIC_SERVER',
      placeId: currentPlaceId,
      serverId: serverId
    }, window.location.origin);

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

    document.getElementById('rrs-close-thankyou').addEventListener('click', () => {
      popup.remove();
    });

    document.getElementById('rrs-rate-btn').addEventListener('click', () => {
      window.open('https://chrome.google.com/webstore', '_blank');
      popup.remove();
    });

    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 10000);
  }

  // FIXED: Fetch way more servers (2000+)
  async function fetchAllServers(placeId) {
    const allServers = [];
    let cursor = '';
    const maxPages = 20; // FIXED: Fetch up to 2000 servers (20 pages × 100)

    console.log('[RRS] Starting to fetch servers...');

    for (let page = 0; page < maxPages; page++) {
      try {
        const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&excludeFullGames=true&limit=100${cursor ? '&cursor=' + cursor : ''}`;

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
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 100;
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
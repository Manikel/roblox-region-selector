// globe-renderer.js - Runs in page context to handle THREE.js globe rendering

(function() {
  'use strict';

  console.log('[RRS Globe] Globe renderer script loaded in page context');

  let scene, camera, renderer, globe, raycaster, mouse;
  let regionDots = [];
  let hoveredDot = null;
  let isRotating = false;
  let lastMouseX = 0;
  let rotationVelocity = 0;

  const WORLD_MAP_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';

  // Region coordinates (lat, lon) - must match content.js
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

  // Load THREE.js and initialize globe
  function loadThreeJs() {
    return new Promise((resolve, reject) => {
      if (window.THREE) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        console.log('[RRS Globe] THREE.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('[RRS Globe] Failed to load THREE.js');
        reject(new Error('Failed to load THREE.js'));
      };
      document.head.appendChild(script);
    });
  }

  // Convert lat/lon to 3D sphere coordinates
  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  // Create region dot
  function createRegionDot(regionCode, hasServers) {
    const coords = REGION_COORDS[regionCode];
    if (!coords) return null;

    const dotGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: hasServers ? 0x4da6ff : 0x808080,
      transparent: true,
      opacity: 0.9
    });

    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    const position = latLonToVector3(coords.lat, coords.lon, 1.02);
    dot.position.copy(position);

    dot.userData = {
      regionCode: regionCode,
      regionName: coords.name,
      hasServers: hasServers,
      originalColor: hasServers ? 0x4da6ff : 0x808080
    };

    return dot;
  }

  // Initialize THREE.js scene
  function initGlobe() {
    const container = document.getElementById('rrs-globe');
    if (!container) {
      console.error('[RRS Globe] Container not found');
      return;
    }

    const width = 600;
    const height = 600;

    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      WORLD_MAP_URL,
      (texture) => {
        const material = new THREE.MeshPhongMaterial({
          map: texture,
          shininess: 5,
          transparent: false
        });

        globe = new THREE.Mesh(geometry, material);
        scene.add(globe);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        // Setup raycaster for mouse interaction
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Add mouse event listeners
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('click', onMouseClick);

        // Start animation loop
        animate();

        // Notify content script that globe is ready
        window.postMessage({ type: 'GLOBE_READY' }, '*');

        console.log('[RRS Globe] Globe initialized successfully');
      },
      undefined,
      (error) => {
        console.error('[RRS Globe] Error loading texture:', error);
        window.postMessage({ type: 'GLOBE_ERROR', error: 'Failed to load texture' }, '*');
      }
    );
  }

  // Mouse event handlers
  function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isRotating) {
      const deltaX = event.clientX - lastMouseX;
      globe.rotation.y += deltaX * 0.005;
      rotationVelocity = deltaX * 0.001;
      lastMouseX = event.clientX;
    } else {
      // Check for dot hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(regionDots);

      if (intersects.length > 0) {
        const intersectedDot = intersects[0].object;

        if (hoveredDot !== intersectedDot) {
          // Reset previous hovered dot
          if (hoveredDot && hoveredDot.userData) {
            hoveredDot.material.color.setHex(hoveredDot.userData.originalColor);
            hoveredDot.material.opacity = 0.9;
          }

          // Highlight new dot
          hoveredDot = intersectedDot;
          if (hoveredDot.userData.hasServers) {
            hoveredDot.material.color.setHex(0xffffff);
            hoveredDot.material.opacity = 1.0;
            renderer.domElement.style.cursor = 'pointer';
          }
        }
      } else {
        // No dot hovered
        if (hoveredDot && hoveredDot.userData) {
          hoveredDot.material.color.setHex(hoveredDot.userData.originalColor);
          hoveredDot.material.opacity = 0.9;
        }
        hoveredDot = null;
        renderer.domElement.style.cursor = 'grab';
      }
    }
  }

  function onMouseDown(event) {
    isRotating = true;
    lastMouseX = event.clientX;
    renderer.domElement.style.cursor = 'grabbing';
  }

  function onMouseUp(event) {
    isRotating = false;
    renderer.domElement.style.cursor = hoveredDot ? 'pointer' : 'grab';
  }

  function onMouseClick(event) {
    if (hoveredDot && hoveredDot.userData && hoveredDot.userData.hasServers) {
      // Send message to content script
      window.postMessage({
        type: 'REGION_CLICKED',
        regionCode: hoveredDot.userData.regionCode,
        regionName: hoveredDot.userData.regionName
      }, '*');

      console.log('[RRS Globe] Region clicked:', hoveredDot.userData.regionCode);
    }
  }

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Apply rotation velocity (inertia)
    if (!isRotating && Math.abs(rotationVelocity) > 0.0001) {
      globe.rotation.y += rotationVelocity;
      rotationVelocity *= 0.95; // Damping
    }

    renderer.render(scene, camera);
  }

  // Update region dots
  function updateRegionDots(regionsData) {
    // Remove existing dots
    regionDots.forEach(dot => {
      scene.remove(dot);
      dot.geometry.dispose();
      dot.material.dispose();
    });
    regionDots = [];

    // Add new dots
    Object.keys(REGION_COORDS).forEach(regionCode => {
      const hasServers = regionsData[regionCode] && regionsData[regionCode] > 0;
      const dot = createRegionDot(regionCode, hasServers);
      if (dot) {
        scene.add(dot);
        regionDots.push(dot);
      }
    });

    console.log('[RRS Globe] Updated region dots:', Object.keys(regionsData).length);
  }

  // Cleanup function
  function cleanup() {
    if (renderer) {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('click', onMouseClick);

      regionDots.forEach(dot => {
        dot.geometry.dispose();
        dot.material.dispose();
      });

      if (globe) {
        globe.geometry.dispose();
        globe.material.dispose();
      }

      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }

    scene = null;
    camera = null;
    renderer = null;
    globe = null;
    regionDots = [];

    console.log('[RRS Globe] Cleaned up resources');
  }

  // Listen for messages from content script
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;

    const data = event.data;

    if (data.type === 'INIT_GLOBE') {
      console.log('[RRS Globe] Initializing globe...');
      loadThreeJs()
        .then(() => initGlobe())
        .catch(error => {
          console.error('[RRS Globe] Failed to load THREE.js:', error);
          window.postMessage({ type: 'GLOBE_ERROR', error: error.message }, '*');
        });
    }
    else if (data.type === 'UPDATE_REGIONS') {
      console.log('[RRS Globe] Updating regions:', data.regions);
      updateRegionDots(data.regions);
    }
    else if (data.type === 'CLEANUP_GLOBE') {
      console.log('[RRS Globe] Cleaning up globe');
      cleanup();
    }
  });

  // Notify content script that globe renderer is ready
  window.postMessage({
    type: 'GLOBE_RENDERER_READY',
    source: 'roblox-region-selector'
  }, window.location.origin);

})();

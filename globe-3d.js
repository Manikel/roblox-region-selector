// Professional 3D Globe Renderer - No external dependencies
// Uses Canvas 2D with proper spherical projection

class Globe3D {
  constructor(containerId, options = {}) {
    console.log('[Globe3D] Initializing with container:', containerId);
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error('[Globe3D] Container not found:', containerId);
      throw new Error(`Container ${containerId} not found`);
    }

    this.width = options.width || 600;
    this.height = options.height || 600;
    this.radius = options.radius || 250;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.width;
    this.canvas.style.cursor = 'grab';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });

    // Globe state
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.markers = [];
    this.texture = null;
    this.animationFrame = null;

    // Setup events
    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;

      this.targetRotation.y += dx * 0.5;
      this.targetRotation.x += dy * 0.5;

      // Clamp vertical rotation
      this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x));

      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.handleClick(x, y);
      }
    });
  }

  loadTexture(url) {
    console.log('[Globe3D] Loading texture from:', url);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('[Globe3D] Texture loaded successfully');
        this.texture = img;
        resolve();
      };
      img.onerror = (err) => {
        console.error('[Globe3D] Failed to load texture:', err);
        reject(err);
      };
      img.src = url;
    });
  }

  addMarker(lat, lon, data) {
    this.markers.push({ lat, lon, data });
  }

  latLonToXYZ(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;  // Angle from north pole
    const theta = lon * Math.PI / 180;  // Longitude in radians

    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta)
    };
  }

  project3DTo2D(x, y, z) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Apply rotation
    const rotX = this.rotation.x * Math.PI / 180;
    const rotY = this.rotation.y * Math.PI / 180;

    // Rotate around Y axis
    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

    // Rotate around X axis
    const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

    // Simple orthographic projection
    return {
      x: centerX + x1,
      y: centerY - y2,
      z: z2,
      visible: z2 > 0
    };
  }

  handleClick(x, y) {
    // Find clicked marker
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (const marker of this.markers) {
      const pos = this.latLonToXYZ(marker.lat, marker.lon, this.radius);
      const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

      if (projected.visible) {
        const dist = Math.hypot(x - projected.x, y - projected.y);
        if (dist < 20) {  // Increased click radius
          if (this.onMarkerClick) {
            this.onMarkerClick(marker.data);
          }
          return;
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Smooth rotation interpolation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.15;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.15;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw globe sphere with gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, this.radius * 0.3,
      centerX, centerY, this.radius
    );
    gradient.addColorStop(0, '#2a3f5f');
    gradient.addColorStop(0.7, '#1a2f4f');
    gradient.addColorStop(1, '#0a1f3f');

    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw texture if loaded
    if (this.texture) {
      this.renderTexturedGlobe();
    }

    // Draw grid
    this.drawGrid();

    // Draw markers
    this.drawMarkers();

    // Draw border
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.animationFrame = requestAnimationFrame(() => this.render());
  }

  renderTexturedGlobe() {
    const ctx = this.ctx;
    const imageData = ctx.createImageData(this.width, this.height);
    const data = imageData.data;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const rotX = this.rotation.x * Math.PI / 180;
    const rotY = this.rotation.y * Math.PI / 180;

    const cosRotX = Math.cos(rotX);
    const sinRotX = Math.sin(rotX);
    const cosRotY = Math.cos(rotY);
    const sinRotY = Math.sin(rotY);

    // Create off-screen canvas for texture sampling (cache it if possible)
    if (!this.texCanvas) {
      this.texCanvas = document.createElement('canvas');
      this.texCanvas.width = this.texture.width;
      this.texCanvas.height = this.texture.height;
      const texCtx = this.texCanvas.getContext('2d', { willReadFrequently: true });
      texCtx.drawImage(this.texture, 0, 0);
      this.texData = texCtx.getImageData(0, 0, this.texture.width, this.texture.height).data;
    }
    const texData = this.texData;

    // Sample every pixel for quality
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= this.radius * this.radius) {
          const dz = Math.sqrt(this.radius * this.radius - distSq);

          let nx = dx / this.radius;
          let ny = -dy / this.radius;
          let nz = dz / this.radius;

          // Apply rotation
          const nx1 = nx * cosRotY + nz * sinRotY;
          const nz1 = -nx * sinRotY + nz * cosRotY;
          const ny2 = ny * cosRotX - nz1 * sinRotX;
          const nz2 = ny * sinRotX + nz1 * cosRotX;

          // Only render front hemisphere
          if (nz2 > 0) {
            // Convert to spherical coordinates
            const phi = Math.acos(Math.max(-1, Math.min(1, ny2)));  // Angle from north pole [0, π]
            const theta = Math.atan2(nz2, nx1);  // Longitude [-π, π]

            // Map to texture coordinates (equirectangular)
            const u = (theta + Math.PI) / (2 * Math.PI);  // Map [-π, π] to [0, 1]
            const v = phi / Math.PI;  // Map [0, π] to [0, 1]

            const tx = Math.floor(u * (this.texture.width - 1));
            const ty = Math.floor(v * (this.texture.height - 1));
            const texIdx = (ty * this.texture.width + tx) * 4;

            // Apply lighting based on surface orientation
            const brightness = Math.max(0.3, Math.min(1, nz2 * 1.2));

            const idx = (y * this.width + x) * 4;
            data[idx] = texData[texIdx] * brightness;
            data[idx + 1] = texData[texIdx + 1] * brightness;
            data[idx + 2] = texData[texIdx + 2] * brightness;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Draw latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      let firstPoint = true;

      for (let lon = -180; lon <= 180; lon += 5) {
        const pos = this.latLonToXYZ(lat, lon, this.radius);
        const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

        if (projected.visible) {
          if (firstPoint) {
            ctx.moveTo(projected.x, projected.y);
            firstPoint = false;
          } else {
            ctx.lineTo(projected.x, projected.y);
          }
        } else {
          firstPoint = true;
        }
      }
      ctx.stroke();
    }

    // Draw longitude lines
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let firstPoint = true;

      for (let lat = -90; lat <= 90; lat += 5) {
        const pos = this.latLonToXYZ(lat, lon, this.radius);
        const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

        if (projected.visible) {
          if (firstPoint) {
            ctx.moveTo(projected.x, projected.y);
            firstPoint = false;
          } else {
            ctx.lineTo(projected.x, projected.y);
          }
        } else {
          firstPoint = true;
        }
      }
      ctx.stroke();
    }
  }

  drawMarkers() {
    const ctx = this.ctx;

    for (const marker of this.markers) {
      const pos = this.latLonToXYZ(marker.lat, marker.lon, this.radius);
      const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

      if (projected.visible) {
        const hasServers = marker.data && marker.data.count > 0;

        // Draw glow (larger)
        const gradient = ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, 18
        );
        gradient.addColorStop(0, hasServers ? 'rgba(65, 129, 250, 0.8)' : 'rgba(150, 150, 150, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw dot (larger)
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = hasServers ? '#4181FA' : '#888';
        ctx.fill();

        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  start() {
    console.log('[Globe3D] Starting globe rendering');
    this.render();
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas.remove();
  }
}

// Export for use
window.Globe3D = Globe3D;

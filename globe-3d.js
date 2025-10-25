// Vector-based 3D Globe with Polygon Continents
// No texture - uses simplified polygon data for countries/continents

class Globe3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`);
    }

    this.width = options.width || 600;
    this.height = options.height || 600;
    this.radius = options.radius || 250;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.cursor = 'grab';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Globe rotation
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.lastDragTime = Date.now();
    this.dragDistance = 0;  // Track drag distance to prevent click after drag

    // Data
    this.markers = [];

    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.lastDragTime = Date.now();
      this.dragDistance = 0;
      this.velocity = { x: 0, y: 0 };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      const dt = Date.now() - this.lastDragTime;

      // Track total drag distance
      this.dragDistance += Math.abs(dx) + Math.abs(dy);

      this.targetRotation.y -= dx * 0.5;  // Fixed: inverted direction
      this.targetRotation.x -= dy * 0.5;
      this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x));

      // Track velocity for momentum
      if (dt > 0) {
        this.velocity.x = dy * 0.5 / dt * 16;
        this.velocity.y = -dx * 0.5 / dt * 16;  // Fixed: inverted direction
      }

      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.lastDragTime = Date.now();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('click', (e) => {
      // Only handle click if drag distance was minimal (< 10 pixels)
      console.log('[Globe3D] Click event - dragDistance:', this.dragDistance);
      if (this.dragDistance < 10) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log('[Globe3D] Processing click at:', x, y);
        this.handleClick(x, y);
      } else {
        console.log('[Globe3D] Click ignored - too much drag');
      }
    });
  }

  latLonToXYZ(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return {
      x: -radius * Math.sin(phi) * Math.cos(theta),  // Negated to fix east/west inversion
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta)
    };
  }

  project3DTo2D(x, y, z) {
    const rotX = this.rotation.x * Math.PI / 180;
    const rotY = this.rotation.y * Math.PI / 180;

    // Rotate Y
    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

    // Rotate X
    const y2 = y * Math.cos(rotX) + z1 * Math.sin(rotX);
    const z2 = -y * Math.sin(rotX) + z1 * Math.cos(rotX);

    return {
      x: this.width / 2 + x1,
      y: this.height / 2 - y2,
      z: z2,
      visible: z2 > 0
    };
  }

  addMarker(lat, lon, data) {
    this.markers.push({ lat, lon, data });
  }

  handleClick(x, y) {
    console.log('[Globe3D] handleClick called - checking', this.markers.length, 'markers');
    console.log('[Globe3D] onMarkerClick callback exists:', !!this.onMarkerClick);

    for (const marker of this.markers) {
      const pos = this.latLonToXYZ(marker.lat, marker.lon, this.radius * 1.05);
      const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

      if (projected.visible) {
        const dist = Math.hypot(x - projected.x, y - projected.y);
        console.log('[Globe3D] Marker', marker.data?.name, '- distance:', dist.toFixed(2), 'visible:', projected.visible);
        if (dist < 20) {
          console.log('[Globe3D] Marker clicked!', marker.data);
          if (this.onMarkerClick) {
            this.onMarkerClick(marker.data);
          } else {
            console.warn('[Globe3D] onMarkerClick not defined!');
          }
          return;
        }
      }
    }
    console.log('[Globe3D] No marker clicked');
  }

  render() {
    const ctx = this.ctx;

    // Apply momentum when not dragging
    if (!this.isDragging) {
      this.targetRotation.x += this.velocity.x;
      this.targetRotation.y += this.velocity.y;
      this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x));
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
    }

    // Smooth interpolation
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.2;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.2;

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw globe sphere with modern gray gradient
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.radius * 0.3,
      this.width / 2, this.height / 2, this.radius
    );
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(0.7, '#2d3748');
    gradient.addColorStop(1, '#1a202c');

    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw latitude/longitude grid
    this.drawGrid();

    // Draw markers
    this.drawMarkers();

    // Draw border
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    requestAnimationFrame(() => this.render());
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Latitude lines
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

    // Longitude lines
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
      const pos = this.latLonToXYZ(marker.lat, marker.lon, this.radius * 1.05);
      const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

      if (projected.visible) {
        const hasServers = marker.data && marker.data.count > 0;

        // Glow
        const gradient = ctx.createRadialGradient(
          projected.x, projected.y, 0,
          projected.x, projected.y, 20
        );
        gradient.addColorStop(0, hasServers ? 'rgba(65, 129, 250, 0.9)' : 'rgba(150, 150, 150, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = hasServers ? '#4181FA' : '#888';
        ctx.fill();

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  start() {
    console.log('[Globe3D] Starting vector globe rendering');
    this.render();
  }

  destroy() {
    this.canvas.remove();
  }

  loadTexture(url) {
    // No-op for compatibility with existing code
    return Promise.resolve();
  }
}

window.Globe3D = Globe3D;

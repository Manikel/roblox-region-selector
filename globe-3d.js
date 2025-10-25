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

    // Data
    this.markers = [];
    this.worldPolygons = this.getWorldPolygons();

    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.lastDragTime = Date.now();
      this.velocity = { x: 0, y: 0 };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      const dt = Date.now() - this.lastDragTime;

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
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
    });
  }

  // Simplified world polygon data ([lon, lat] pairs)
  getWorldPolygons() {
    return {
      // North America
      usa: {
        name: 'United States',
        color: '#4a9eff',
        points: [
          -125, 50, -110, 49, -95, 49, -85, 46, -80, 43, -75, 42,
          -71, 41, -70, 42, -71, 45, -68, 47, -66, 45, -70, 43,
          -75, 38, -76, 37, -80, 35, -82, 29, -85, 30, -90, 29,
          -95, 29, -97, 26, -99, 27, -100, 29, -103, 32, -108, 32,
          -111, 32, -115, 35, -117, 32, -120, 35, -123, 40, -125, 45,
          -130, 55, -135, 58, -140, 60, -145, 60, -150, 61, -155, 58,
          -160, 56, -165, 60, -170, 58, -165, 55, -160, 55, -155, 57,
          -150, 59, -145, 58, -140, 58, -135, 55, -130, 52, -125, 50
        ]
      },
      canada: {
        name: 'Canada',
        color: '#ff6b6b',
        points: [
          -141, 70, -130, 71, -120, 73, -110, 74, -100, 73, -90, 73,
          -80, 73, -70, 73, -65, 72, -60, 70, -55, 68, -60, 65,
          -65, 62, -70, 60, -75, 58, -80, 56, -85, 53, -90, 51,
          -95, 50, -100, 50, -105, 50, -110, 51, -115, 52, -120, 52,
          -125, 51, -130, 54, -135, 58, -140, 62, -141, 70
        ]
      },
      mexico: {
        name: 'Mexico',
        color: '#51cf66',
        points: [
          -117, 32, -115, 30, -112, 28, -110, 26, -108, 23, -105, 21,
          -102, 19, -100, 18, -97, 17, -95, 16, -92, 15, -90, 16,
          -88, 18, -90, 20, -92, 21, -95, 23, -98, 25, -101, 27,
          -105, 30, -110, 31, -115, 32, -117, 32
        ]
      },
      // South America
      brazil: {
        name: 'Brazil',
        color: '#ffd43b',
        points: [
          -73, 5, -70, 2, -68, -2, -67, -8, -65, -12, -62, -15,
          -58, -18, -55, -21, -52, -25, -50, -28, -48, -30, -45, -24,
          -42, -20, -38, -15, -35, -10, -35, -5, -35, 0, -37, 3,
          -40, 5, -45, 3, -50, 0, -55, -2, -60, -5, -65, -2,
          -68, 0, -70, 3, -73, 5
        ]
      },
      argentina: {
        name: 'Argentina',
        color: '#74c0fc',
        points: [
          -73, -22, -70, -25, -68, -30, -68, -35, -68, -40, -70, -45,
          -72, -50, -72, -53, -70, -52, -68, -51, -66, -48, -64, -44,
          -62, -40, -60, -36, -58, -32, -58, -28, -59, -24, -62, -22,
          -66, -22, -70, -22, -73, -22
        ]
      },
      // Europe
      uk: {
        name: 'United Kingdom',
        color: '#ff6b6b',
        points: [
          -5, 58, -3, 59, -1, 58, 1, 57, 2, 54, 1, 52, 0, 51,
          -2, 50, -4, 50, -5, 52, -6, 54, -6, 56, -5, 58
        ]
      },
      france: {
        name: 'France',
        color: '#4a9eff',
        points: [
          -5, 48, -2, 49, 0, 50, 2, 51, 5, 50, 7, 48, 8, 46,
          7, 44, 5, 43, 3, 43, 0, 43, -2, 44, -4, 46, -5, 48
        ]
      },
      germany: {
        name: 'Germany',
        color: '#51cf66',
        points: [
          6, 55, 8, 55, 10, 54, 13, 54, 15, 53, 15, 51, 14, 49,
          12, 48, 10, 47, 8, 48, 6, 49, 5, 51, 6, 53, 6, 55
        ]
      },
      spain: {
        name: 'Spain',
        color: '#ffd43b',
        points: [
          -9, 43, -7, 43, -4, 43, -1, 42, 2, 41, 3, 40, 3, 38,
          1, 37, -2, 37, -5, 37, -8, 38, -9, 40, -9, 43
        ]
      },
      italy: {
        name: 'Italy',
        color: '#ff8787',
        points: [
          8, 47, 10, 46, 12, 45, 14, 44, 16, 42, 17, 40, 18, 38,
          17, 37, 16, 38, 14, 40, 12, 42, 10, 44, 8, 46, 8, 47
        ]
      },
      poland: {
        name: 'Poland',
        color: '#a9e34b',
        points: [
          14, 54, 17, 54, 20, 54, 23, 53, 24, 51, 23, 50, 20, 49,
          17, 49, 15, 50, 14, 52, 14, 54
        ]
      },
      // Africa
      africa: {
        name: 'Africa',
        color: '#ffa94d',
        points: [
          -17, 35, -12, 33, -8, 31, -3, 28, 3, 25, 8, 22, 13, 18,
          18, 15, 23, 12, 28, 8, 33, 4, 38, 0, 40, -5, 42, -10,
          43, -15, 41, -20, 37, -25, 32, -30, 28, -33, 23, -34,
          18, -34, 13, -32, 10, -28, 8, -23, 5, -18, 3, -12,
          0, -6, -3, 0, -5, 5, -8, 10, -10, 15, -13, 20,
          -15, 25, -17, 30, -17, 35
        ]
      },
      // Asia
      russia: {
        name: 'Russia',
        color: '#ff9999',
        points: [
          20, 70, 30, 72, 50, 75, 70, 76, 90, 75, 110, 73, 130, 70,
          150, 65, 165, 60, 175, 55, 180, 52, 180, 50, 175, 48,
          165, 48, 155, 48, 145, 50, 135, 52, 125, 53, 115, 54,
          105, 55, 95, 56, 85, 57, 75, 58, 65, 58, 55, 57,
          45, 55, 35, 53, 25, 51, 20, 50, 20, 70
        ]
      },
      china: {
        name: 'China',
        color: '#ffd43b',
        points: [
          75, 50, 80, 48, 85, 47, 90, 45, 95, 42, 100, 40, 105, 37,
          110, 34, 115, 32, 120, 30, 122, 28, 123, 25, 122, 22,
          118, 20, 113, 20, 108, 22, 103, 24, 98, 27, 93, 30,
          88, 33, 83, 36, 78, 40, 74, 44, 73, 47, 75, 50
        ]
      },
      india: {
        name: 'India',
        color: '#51cf66',
        points: [
          68, 35, 70, 33, 72, 30, 75, 27, 77, 23, 80, 19, 83, 15,
          86, 12, 88, 9, 86, 9, 83, 11, 80, 13, 77, 16, 74, 19,
          71, 22, 69, 25, 68, 28, 67, 31, 68, 35
        ]
      },
      japan: {
        name: 'Japan',
        color: '#ff8787',
        points: [
          130, 45, 132, 44, 135, 42, 137, 40, 140, 38, 141, 35,
          142, 33, 141, 31, 139, 32, 136, 34, 133, 37, 131, 40,
          129, 42, 130, 45
        ]
      },
      // Oceania
      australia: {
        name: 'Australia',
        color: '#4a9eff',
        points: [
          113, -11, 115, -13, 120, -16, 125, -19, 130, -22, 135, -25,
          140, -28, 145, -32, 150, -35, 153, -37, 152, -40, 148, -42,
          143, -43, 138, -43, 133, -42, 128, -40, 123, -37, 118, -33,
          114, -28, 112, -23, 112, -18, 112, -13, 113, -11
        ]
      },
      newzealand: {
        name: 'New Zealand',
        color: '#51cf66',
        points: [
          166, -34, 168, -36, 172, -38, 175, -40, 177, -42, 177, -44,
          175, -45, 172, -46, 169, -45, 166, -43, 165, -40, 165, -37,
          166, -34
        ]
      }
    };
  }

  latLonToXYZ(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
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
    for (const marker of this.markers) {
      const pos = this.latLonToXYZ(marker.lat, marker.lon, this.radius * 1.05);
      const projected = this.project3DTo2D(pos.x, pos.y, pos.z);

      if (projected.visible) {
        const dist = Math.hypot(x - projected.x, y - projected.y);
        if (dist < 20) {
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

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw ocean sphere
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.radius * 0.3,
      this.width / 2, this.height / 2, this.radius
    );
    gradient.addColorStop(0, '#1e4d7a');
    gradient.addColorStop(0.7, '#0f3554');
    gradient.addColorStop(1, '#051f33');

    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw polygons (continents/countries)
    this.drawPolygons();

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

  drawPolygons() {
    const ctx = this.ctx;

    // Sort polygons by average Z (back to front)
    const polygonList = Object.entries(this.worldPolygons).map(([key, poly]) => {
      const points3D = [];
      for (let i = 0; i < poly.points.length; i += 2) {
        const lon = poly.points[i];
        const lat = poly.points[i + 1];
        const pos = this.latLonToXYZ(lat, lon, this.radius);
        const projected = this.project3DTo2D(pos.x, pos.y, pos.z);
        points3D.push(projected);
      }
      const avgZ = points3D.reduce((sum, p) => sum + p.z, 0) / points3D.length;
      return { poly, points3D, avgZ };
    });

    polygonList.sort((a, b) => a.avgZ - b.avgZ);

    // Draw each polygon
    for (const { poly, points3D } of polygonList) {
      const visiblePoints = points3D.filter(p => p.visible);
      if (visiblePoints.length < 3) continue;

      ctx.beginPath();
      ctx.moveTo(points3D[0].x, points3D[0].y);
      for (let i = 1; i < points3D.length; i++) {
        ctx.lineTo(points3D[i].x, points3D[i].y);
      }
      ctx.closePath();

      // Fill
      ctx.fillStyle = poly.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();

      ctx.globalAlpha = 1;
    }
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

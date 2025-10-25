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

  // Simplified world polygon data (lat, lon coordinates)
  getWorldPolygons() {
    return {
      // North America
      usa: {
        name: 'United States',
        color: '#4a9eff',
        points: [
          [-130, 50], [-125, 50], [-120, 49], [-115, 49], [-110, 49], [-105, 49],
          [-100, 49], [-95, 49], [-90, 48], [-85, 47], [-80, 45], [-75, 45],
          [-71, 42], [-67, 45], [-67, 47], [-70, 48], [-130, 60], [-140, 60],
          [-145, 60], [-150, 59], [-155, 58], [-160, 56], [-165, 55], [-170, 53],
          [-125, 32], [-120, 34], [-115, 32], [-110, 31], [-105, 32], [-100, 29],
          [-97, 26], [-93, 29], [-90, 29], [-85, 30], [-80, 25], [-80, 30],
          [-75, 35], [-70, 42], [-130, 50]
        ]
      },
      canada: {
        name: 'Canada',
        color: '#ff6b6b',
        points: [
          [-141, 69], [-135, 70], [-130, 71], [-120, 72], [-110, 73], [-100, 73],
          [-90, 72], [-80, 73], [-70, 72], [-60, 72], [-55, 70], [-60, 65],
          [-65, 62], [-70, 60], [-75, 58], [-80, 55], [-85, 53], [-90, 50],
          [-95, 49], [-100, 49], [-105, 50], [-110, 50], [-115, 50], [-120, 50],
          [-125, 51], [-130, 53], [-135, 55], [-140, 60], [-141, 69]
        ]
      },
      mexico: {
        name: 'Mexico',
        color: '#51cf66',
        points: [
          [-117, 32], [-115, 29], [-112, 27], [-110, 25], [-108, 22], [-105, 20],
          [-102, 18], [-100, 17], [-97, 16], [-95, 16], [-92, 15], [-90, 16],
          [-88, 18], [-92, 21], [-95, 22], [-97, 24], [-100, 26], [-103, 28],
          [-107, 30], [-110, 31], [-113, 31], [-117, 32]
        ]
      },
      // South America
      brazil: {
        name: 'Brazil',
        color: '#ffd43b',
        points: [
          [-73, 5], [-70, 0], [-68, -5], [-67, -10], [-65, -15], [-60, -18],
          [-57, -20], [-54, -24], [-50, -28], [-48, -30], [-44, -23], [-40, -18],
          [-36, -10], [-34, -5], [-35, 0], [-38, 5], [-42, 3], [-45, 0],
          [-50, -2], [-55, -5], [-60, -3], [-65, 0], [-70, 3], [-73, 5]
        ]
      },
      argentina: {
        name: 'Argentina',
        color: '#74c0fc',
        points: [
          [-73, -23], [-70, -28], [-68, -33], [-68, -38], [-70, -43], [-72, -48],
          [-72, -53], [-70, -52], [-68, -50], [-65, -45], [-62, -40], [-60, -35],
          [-58, -30], [-57, -25], [-60, -23], [-65, -22], [-68, -22], [-73, -23]
        ]
      },
      // Europe
      uk: {
        name: 'United Kingdom',
        color: '#ff6b6b',
        points: [
          [-6, 58], [-4, 57], [-2, 57], [0, 56], [2, 53], [1, 51], [-1, 50],
          [-3, 50], [-5, 51], [-6, 54], [-6, 58]
        ]
      },
      france: {
        name: 'France',
        color: '#4a9eff',
        points: [
          [-5, 48], [-2, 51], [2, 51], [4, 50], [7, 49], [8, 47], [7, 44],
          [5, 43], [3, 43], [0, 43], [-2, 43], [-4, 45], [-5, 48]
        ]
      },
      germany: {
        name: 'Germany',
        color: '#51cf66',
        points: [
          [6, 54], [9, 54], [12, 54], [14, 53], [15, 51], [13, 48], [11, 47],
          [8, 47], [6, 48], [5, 50], [6, 54]
        ]
      },
      spain: {
        name: 'Spain',
        color: '#ffd43b',
        points: [
          [-9, 43], [-7, 42], [-3, 42], [0, 40], [3, 40], [3, 38], [0, 37],
          [-3, 37], [-6, 37], [-9, 38], [-9, 43]
        ]
      },
      italy: {
        name: 'Italy',
        color: '#ff8787',
        points: [
          [7, 47], [9, 46], [12, 46], [13, 44], [15, 42], [16, 40], [17, 38],
          [16, 37], [15, 38], [13, 40], [11, 42], [9, 44], [7, 45], [7, 47]
        ]
      },
      // Africa
      africa: {
        name: 'Africa',
        color: '#ffa94d',
        points: [
          [-17, 35], [-10, 32], [-5, 30], [0, 28], [5, 25], [10, 22], [15, 20],
          [20, 18], [25, 15], [30, 10], [35, 5], [38, 0], [40, -5], [42, -10],
          [43, -15], [40, -20], [35, -25], [30, -30], [25, -33], [20, -35],
          [15, -35], [12, -30], [10, -25], [8, -20], [5, -15], [3, -10],
          [0, -5], [-3, 0], [-5, 5], [-8, 10], [-10, 15], [-12, 20], [-15, 25],
          [-17, 30], [-17, 35]
        ]
      },
      // Asia
      russia: {
        name: 'Russia',
        color: '#ff6b6b',
        points: [
          [20, 70], [40, 72], [60, 75], [80, 75], [100, 73], [120, 70], [140, 65],
          [160, 60], [170, 55], [180, 52], [180, 50], [170, 48], [160, 47],
          [150, 48], [140, 50], [130, 52], [120, 53], [110, 54], [100, 55],
          [90, 56], [80, 58], [70, 58], [60, 57], [50, 55], [40, 53], [30, 50],
          [20, 48], [20, 70]
        ]
      },
      china: {
        name: 'China',
        color: '#ffd43b',
        points: [
          [75, 50], [80, 48], [85, 45], [90, 42], [95, 40], [100, 38], [105, 35],
          [110, 32], [115, 30], [120, 28], [122, 25], [120, 22], [115, 20],
          [110, 20], [105, 22], [100, 25], [95, 28], [90, 30], [85, 33],
          [80, 35], [75, 38], [72, 42], [73, 45], [75, 50]
        ]
      },
      india: {
        name: 'India',
        color: '#51cf66',
        points: [
          [68, 35], [70, 32], [72, 28], [75, 24], [78, 20], [82, 16], [85, 12],
          [87, 8], [85, 8], [82, 10], [78, 12], [75, 15], [72, 18], [70, 22],
          [68, 25], [67, 28], [68, 32], [68, 35]
        ]
      },
      japan: {
        name: 'Japan',
        color: '#ff8787',
        points: [
          [130, 45], [132, 43], [135, 40], [138, 37], [140, 34], [142, 32],
          [140, 30], [138, 32], [135, 34], [132, 37], [130, 40], [128, 42],
          [130, 45]
        ]
      },
      // Oceania
      australia: {
        name: 'Australia',
        color: '#4a9eff',
        points: [
          [113, -10], [115, -12], [120, -15], [125, -17], [130, -19], [135, -22],
          [140, -25], [145, -28], [150, -32], [153, -35], [150, -38], [145, -40],
          [140, -42], [135, -43], [130, -42], [125, -40], [120, -37], [115, -34],
          [113, -30], [112, -25], [112, -20], [112, -15], [113, -10]
        ]
      },
      newzealand: {
        name: 'New Zealand',
        color: '#51cf66',
        points: [
          [166, -34], [168, -35], [172, -37], [175, -39], [178, -41], [178, -43],
          [175, -45], [172, -46], [169, -46], [166, -44], [165, -42], [165, -40],
          [166, -38], [166, -34]
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
      for (let i = 0; i < poly.points.length; i++) {
        const [lon, lat] = poly.points[i];
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

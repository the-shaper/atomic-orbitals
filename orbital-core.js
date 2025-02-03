// Constants
const MILLISECONDS_PER_DAY = 1000;
const MONDAY_START = -Math.PI / 2;
const DEGREES_PER_DAY = (Math.PI * 2) / 6;
const BASE_PLANET_SPEED = 2000;
const GOLDEN_RATIO = 1.618;

class OrbitalCore {
  constructor(canvasId, config = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    this.ctx = this.canvas.getContext("2d");

    // Default configuration
    this.config = {
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      radius: this.canvas.width * 0.4,
      backgroundColor: "#f3ffe6",
      gridColor: "#cce0cc",
      textColor: "#cce0cc",
      dotColors: ["#ffb347", "#2b4d59", "#a5a5a5"],
      activeMoonColor: "#ff6b35",
      syncLineColor: "#ff6b35",
      days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      rings: 4,
      radarRotation: 0,
      isPlaying: false,
      startTime: Date.now(),
      pauseTime: 0,
      globalSpeedMultiplier: 1.0,
      ...config,
    };

    // Initialize dots
    this.dots = {
      sun: {
        x: this.config.centerX,
        y: this.config.centerY,
        size: 16,
        baseSize: 16,
      },
      planet: {
        radius: (this.config.radius / this.config.rings) * 3,
        angle: MONDAY_START,
        size: 12,
        baseSize: 12,
        x: 0,
        y: 0,
        period: MILLISECONDS_PER_DAY,
        direction: 1,
      },
      moon: {
        orbitRadius: 40,
        startingAngle: (270 * Math.PI) / 180,
        angle: (270 * Math.PI) / 180,
        size: 8,
        baseSize: 8,
        x: 0,
        y: 0,
        period: MILLISECONDS_PER_DAY * 2,
        direction: 1,
      },
    };

    // Set up resize observer
    this.setupResizeObserver();

    // Start animation loop
    this.animate();
  }

  setupResizeObserver() {
    const resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const container = entry.target;
          const width = container.clientWidth;
          const height = container.clientHeight;
          const size = Math.min(width, height);

          if (this.canvas.width !== size * 2) {
            this.canvas.width = size * 2;
            this.canvas.height = size * 2;
            this.config.centerX = this.canvas.width / 2;
            this.config.centerY = this.canvas.height / 2;
            this.config.radius = this.canvas.width * 0.4;
            this.dots.planet.radius =
              (this.config.radius / this.config.rings) * 3;
            this.dots.sun.x = this.config.centerX;
            this.dots.sun.y = this.config.centerY;
          }
        }
      });
    });

    resizeObserver.observe(this.canvas.parentElement);
  }

  updateDotPositions() {
    const currentTime = this.config.isPlaying
      ? Date.now() - this.config.startTime
      : this.config.pauseTime;
    const speedMultiplier = this.config.globalSpeedMultiplier;

    // Update planet position
    const planetAngle =
      MONDAY_START +
      (currentTime / this.dots.planet.period) *
        (Math.PI * 2) *
        this.dots.planet.direction *
        speedMultiplier;

    this.dots.planet.x =
      this.config.centerX + Math.cos(planetAngle) * this.dots.planet.radius;
    this.dots.planet.y =
      this.config.centerY + Math.sin(planetAngle) * this.dots.planet.radius;

    // Update moon position
    const moonAngle =
      this.dots.moon.startingAngle +
      (currentTime / this.dots.moon.period) *
        (Math.PI * 2) *
        this.dots.moon.direction *
        speedMultiplier;

    this.dots.moon.x =
      this.dots.planet.x + Math.cos(moonAngle) * this.dots.moon.orbitRadius;
    this.dots.moon.y =
      this.dots.planet.y + Math.sin(moonAngle) * this.dots.moon.orbitRadius;
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw celestial bodies
    this.drawDots();
  }

  drawGrid() {
    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    // Draw rings
    for (let i = 1; i <= this.config.rings; i++) {
      const radius = (this.config.radius / this.config.rings) * i;
      this.ctx.beginPath();
      this.ctx.arc(
        this.config.centerX,
        this.config.centerY,
        radius,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    }

    // Draw day markers
    this.ctx.font = "20px Arial";
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    for (let i = 0; i < 6; i++) {
      const angle = MONDAY_START + (i * Math.PI * 2) / 6;
      const x =
        this.config.centerX + Math.cos(angle) * (this.config.radius + 30);
      const y =
        this.config.centerY + Math.sin(angle) * (this.config.radius + 30);
      this.ctx.fillText(this.config.days[i], x, y);
    }
  }

  drawDots() {
    // Draw sun
    this.ctx.fillStyle = this.config.dotColors[0];
    this.ctx.beginPath();
    this.ctx.arc(
      this.dots.sun.x,
      this.dots.sun.y,
      this.dots.sun.size,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw planet
    this.ctx.fillStyle = this.config.dotColors[1];
    this.ctx.beginPath();
    this.ctx.arc(
      this.dots.planet.x,
      this.dots.planet.y,
      this.dots.planet.size,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw moon
    this.ctx.fillStyle = this.config.dotColors[2];
    this.ctx.beginPath();
    this.ctx.arc(
      this.dots.moon.x,
      this.dots.moon.y,
      this.dots.moon.size,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }

  animate = () => {
    if (this.config.isPlaying) {
      this.updateDotPositions();
    }
    this.draw();
    requestAnimationFrame(this.animate);
  };

  play() {
    if (!this.config.isPlaying) {
      this.config.isPlaying = true;
      if (this.config.pauseTime > 0) {
        this.config.startTime = Date.now() - this.config.pauseTime;
      } else {
        this.config.startTime = Date.now();
      }
    }
  }

  pause() {
    if (this.config.isPlaying) {
      this.config.isPlaying = false;
      this.config.pauseTime = Date.now() - this.config.startTime;
    }
  }

  reset() {
    this.config.startTime = Date.now();
    this.config.pauseTime = 0;
    this.updateDotPositions();
  }

  setSpeed(multiplier) {
    this.config.globalSpeedMultiplier = multiplier;
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.updateDotPositions();
  }
}

// Export for both module and non-module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = OrbitalCore;
} else {
  window.OrbitalCore = OrbitalCore;
}

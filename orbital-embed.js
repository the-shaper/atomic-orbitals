class OrbitalEmbed {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    // Default options
    this.options = {
      autoplay: true,
      showSpeedControl: true,
      width: "100%",
      height: "100%",
      mode: null, // Can be 'current', 'A', 'B', or a custom JSON config
      ...options,
    };

    this.init();
  }

  init() {
    // Create wrapper
    this.wrapper = document.createElement("div");
    this.wrapper.className = "orbital-embed-wrapper";
    this.wrapper.style.width = this.options.width;
    this.wrapper.style.height = this.options.height;

    // Create canvas container
    this.radarContainer = document.createElement("div");
    this.radarContainer.className = "radar-container";

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = `radarCanvas-${Math.random().toString(36).substr(2, 9)}`;

    // Append elements
    this.radarContainer.appendChild(this.canvas);
    this.wrapper.appendChild(this.radarContainer);

    // Add speed control if enabled
    if (this.options.showSpeedControl) {
      const speedControl = document.createElement("div");
      speedControl.className = "speed-control";
      speedControl.innerHTML = `
        <input type="range" id="${this.canvas.id}-speed" min="10" max="500" value="100" step="5">
        <span class="speed-value">1.0×</span>
      `;
      this.wrapper.appendChild(speedControl);

      // Add speed control listener
      const speedInput = speedControl.querySelector("input");
      speedInput.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        const multiplier = value / 100;
        speedControl.querySelector(
          ".speed-value"
        ).textContent = `${multiplier.toFixed(1)}×`;
        if (this.orbital) {
          this.orbital.setSpeed(multiplier);
        }
      });
    }

    this.container.appendChild(this.wrapper);

    // Load required styles
    this.loadStyles();

    // Initialize the visualization
    this.initVisualization();
  }

  loadStyles() {
    // Load embed-specific styles only
    if (!document.getElementById("orbital-embed-styles")) {
      const styles = document.createElement("style");
      styles.id = "orbital-embed-styles";
      styles.textContent = `
        .orbital-embed-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .orbital-embed-wrapper .radar-container {
          width: 100%;
          height: 100%;
          aspect-ratio: 1;
          background: #1a1a1a;
        }
        .orbital-embed-wrapper canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .orbital-embed-wrapper .speed-control {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
        }
        .orbital-embed-wrapper .speed-control input {
          flex: 1;
        }
        .orbital-embed-wrapper .speed-control span {
          min-width: 4ch;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  async initVisualization() {
    try {
      // Load configuration based on mode
      const config = await this.loadConfiguration();

      // Initialize orbital visualization
      this.orbital = new OrbitalCore(this.canvas.id, config);

      // Initialize with autoplay if enabled
      if (this.options.autoplay) {
        setTimeout(() => this.play(), 100);
      }
    } catch (error) {
      console.error("Error loading visualization:", error);
      this.container.innerHTML = `<div style="color: red;">Error loading visualization: ${error.message}</div>`;
    }
  }

  async loadConfiguration() {
    if (!this.options.mode) return {};

    try {
      let config;

      // Use configurations provided in the options
      if (this.options.configurations) {
        if (typeof this.options.mode === "object") {
          // Direct JSON configuration
          config = this.options.mode;
        } else {
          // Load from provided configurations
          const mode = this.options.mode.toUpperCase();
          if (this.options.configurations[mode]) {
            config = this.options.configurations[mode];
          } else if (
            mode === "CURRENT" &&
            this.options.configurations.current
          ) {
            config = this.options.configurations.current;
          }
        }
      }

      // Fallback to default config if provided
      if (!config && this.options.defaultConfig) {
        config = this.options.defaultConfig;
      }

      // Ensure we have a valid configuration object
      if (typeof config === "string") {
        try {
          config = JSON.parse(config);
        } catch (e) {
          console.warn("Failed to parse configuration string:", e);
          config = this.options.defaultConfig || {};
        }
      }

      return config || {};
    } catch (error) {
      console.error("Error loading configuration:", error);
      // Fallback to default config if available
      return this.options.defaultConfig || {};
    }
  }

  // Public API methods
  play() {
    if (this.orbital) {
      this.orbital.play();
    }
  }

  pause() {
    if (this.orbital) {
      this.orbital.pause();
    }
  }

  reset() {
    if (this.orbital) {
      this.orbital.reset();
    }
  }

  async setMode(mode) {
    this.options.mode = mode;
    const config = await this.loadConfiguration();
    if (this.orbital) {
      this.orbital.updateConfig(config);
    }
  }
}

// Export for both module and non-module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = OrbitalEmbed;
} else {
  window.OrbitalEmbed = OrbitalEmbed;
}

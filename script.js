// Constants
const MILLISECONDS_PER_DAY = 1000; // 1 second represents one day for smooth animation
const MONDAY_START = -Math.PI / 2;
const DEGREES_PER_DAY = (Math.PI * 2) / 6;
const BASE_PLANET_SPEED = 2000; // Doubled from 1000 to make base speed half as fast

// Get canvas and context
const canvas = document.getElementById("radarCanvas");
const ctx = canvas.getContext("2d");

// Set initial canvas size
canvas.width = 1000;
canvas.height = 1000;

// Configuration
const config = {
  centerX: canvas.width / 2,
  centerY: canvas.height / 2,
  radius: canvas.width * 0.4, // 40% of canvas width
  backgroundColor: "#f3ffe6",
  gridColor: "#cce0cc",
  textColor: "#cce0cc",
  dotColors: ["#ffb347", "#2b4d59", "#a5a5a5"], // sun, planet, moon colors
  activeMoonColor: "#ff6b35",
  syncLineColor: "#ff6b35",
  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  rings: 4,
  radarRotation: 0,
  gravityEnabled: false,
  gravityStrength: 0.5,
  alignmentDays: new Set([1, 4]), // Tuesday and Friday by default
  brainstreamDays: new Set([2, 5]), // Wednesday and Saturday by default
  transitionDuration: 0.2,
  maxGravityEffect: 120,
  moonSizeMultiplier: 1,
  GOLDEN_RATIO: 1.618,
  transitionCurve: "easeInOut",
  waveAmplitude: 5,
  waveSpeed: 3,
  waveLength: 2,
  sunHeartbeat: {
    enabled: true,
    beatsPerDay: 1.0,
  },
  planetHeartbeat: {
    enabled: true,
    beatsPerDay: 1.0,
  },
  isPlaying: false,
  startTime: Date.now(),
  pauseTime: 0,
  planetWave: {
    amplitude: 5,
    speed: 3,
    wavelength: 2,
    thickness: 2,
  },
  sunWave: {
    amplitude: 5,
    speed: 3,
    wavelength: 2,
    thickness: 2,
  },
  secondWaveColor: "#2b4d59",
  secondMoon: {
    enabled: false,
    color: "#808080",
    activeColor: "#ff9b35",
  },
  planetParticles: {
    enabled: false,
    color: "#2b4d59",
    size: 3,
    amount: 30,
    speed: 5,
    opacity: 0.7,
    dispersion: 30,
    dayTiming: true,
    alignmentSync: false,
    particles: [], // Will store particle positions
  },
  sunParticles: {
    enabled: false,
    color: "#ffb347",
    size: 3,
    amount: 30,
    speed: 5,
    opacity: 0.7,
    dispersion: 30,
    dayTiming: true,
    alignmentSync: false,
    particles: [], // Will store particle positions
  },
  planetRadioWaves: {
    enabled: false,
    color: "#2b4d59",
    speed: 3,
    spacing: 20,
    thickness: 1.5,
    arc: 90,
    range: 100,
    opacity: 0.7,
    dayTiming: true,
    alignmentSync: false,
    waves: [],
  },
  sunRadioWaves: {
    enabled: false,
    color: "#ffb347",
    speed: 3,
    spacing: 20,
    thickness: 1.5,
    arc: 90,
    range: 100,
    opacity: 0.7,
    dayTiming: true,
    alignmentSync: false,
    waves: [],
  },
  lineThickness: 1,
  fontSize: 20,
  fontFamily: "Arial",
  sunspots: {
    enabled: false,
    spots: [], // Will store active sunspots
    size: 4,
    attraction: 0.5,
    energy: 1.0,
    color: "#ff4500",
    lastAlignmentTime: 0,
    alignmentCooldown: MILLISECONDS_PER_DAY,
    baseSize: 4,
    spotsPerDay: 1,
    totalMass: 0,
    spotsCreatedInCurrentDay: 0, // Track spots created in current day
    lastDayNumber: -1, // Track the current day number
  },
};

// Calculate the radius for the third ring
const thirdRingRadius = (config.radius / config.rings) * 3;

// Dot objects (celestial bodies)
const dots = {
  sun: { x: config.centerX, y: config.centerY, size: 16, baseSize: 16 },
  planet: {
    radius: (config.radius / config.rings) * 3,
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
    startingAngle: (270 * Math.PI) / 180, // 270 degrees in radians
    angle: (270 * Math.PI) / 180, // Initialize angle to match starting angle
    size: 8,
    x: 0,
    y: 0,
    period: MILLISECONDS_PER_DAY * 2, // 0.5 rotations per day
    direction: 1,
  },
  secondMoon: {
    orbitRadius: 40,
    startingAngle: (90 * Math.PI) / 180, // Opposite to first moon
    angle: (90 * Math.PI) / 180,
    size: 8,
    x: 0,
    y: 0,
    period: MILLISECONDS_PER_DAY * 2,
    direction: 1,
  },
};

// Communication lines state
const communicationLines = Array(6).fill(false);

// Add resize observer for responsive canvas
const resizeObserver = new ResizeObserver((entries) => {
  // Use requestAnimationFrame to throttle updates
  requestAnimationFrame(() => {
    for (const entry of entries) {
      const container = entry.target;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const size = Math.min(width, height);

      // Only update if size has actually changed
      if (canvas.width !== size * 2) {
        // Set canvas resolution (2x for retina displays)
        canvas.width = size * 2;
        canvas.height = size * 2;

        // Update config to maintain proportions
        config.centerX = canvas.width / 2;
        config.centerY = canvas.height / 2;
        config.radius = canvas.width * 0.4; // Keep radius at 40% of canvas width

        // Update planet radius to maintain ring level 3
        dots.planet.radius = (config.radius / config.rings) * 3;

        // Update sun position to stay centered
        dots.sun.x = config.centerX;
        dots.sun.y = config.centerY;
      }
    }
  });
});

// Observe the radar container
resizeObserver.observe(document.querySelector(".radar-container"));

// Control handlers
function initializeControls() {
  // Planet controls
  document
    .getElementById("planetOrbitRadius")
    .addEventListener("input", (e) => {
      dots.planet.radius = (config.radius / config.rings) * e.target.value;
      updateValueDisplay("planetOrbitRadius", e.target.value);
    });

  document.getElementById("planetPeriod").addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    // Calculate velocity multiplier: 0.5x, 0.809x, 1.309x, 2.118x, 3.427x
    const velocityMultiplier = Math.pow(config.GOLDEN_RATIO, step - 1) * 0.5;

    // Faster speed = smaller period
    dots.planet.period = BASE_PLANET_SPEED / velocityMultiplier;

    // Update display with the actual multiplier
    updateValueDisplay("planetPeriod", velocityMultiplier.toFixed(3), "×");
  });

  document.getElementById("planetDirection").addEventListener("change", (e) => {
    dots.planet.direction = parseInt(e.target.value);
  });

  // Moon controls
  document.getElementById("moonOrbitRadius").addEventListener("input", (e) => {
    const radius = parseInt(e.target.value);
    dots.moon.orbitRadius = radius;
    // Direction is now controlled by the Direction dropdown instead
    updateValueDisplay("moonOrbitRadius", radius, "px");
  });

  document.getElementById("moonPeriod").addEventListener("input", (e) => {
    const rotationsPerDay = parseFloat(e.target.value);
    // Calculate period in milliseconds for the specified number of rotations per day
    dots.moon.period = MILLISECONDS_PER_DAY / rotationsPerDay;
    updateValueDisplay("moonPeriod", rotationsPerDay, "/day");
  });

  document.getElementById("moonDirection").addEventListener("change", (e) => {
    dots.moon.direction = parseInt(e.target.value);
  });

  // Radar rotation control
  document.getElementById("radarRotation").addEventListener("input", (e) => {
    config.radarRotation = (parseInt(e.target.value) * Math.PI) / 180; // Convert degrees to radians
    updateValueDisplay("radarRotation", e.target.value, "°");
  });

  // Gravity strength control
  document.getElementById("gravityStrength").addEventListener("input", (e) => {
    config.gravityStrength = parseFloat(e.target.value);
    updateValueDisplay("gravityStrength", e.target.value);
  });

  // Day selection controls
  document.querySelectorAll(".day-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const day = parseInt(e.target.value);
      if (e.target.checked) {
        config.alignmentDays.add(day);
      } else {
        config.alignmentDays.delete(day);
      }
    });
  });

  // Brainstream sync day selection controls
  document.querySelectorAll(".brainstream-day-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const day = parseInt(e.target.value);
      if (e.target.checked) {
        config.brainstreamDays.add(day);
      } else {
        config.brainstreamDays.delete(day);
      }
    });
  });

  // Moon size multiplier control
  document
    .getElementById("moonSizeMultiplier")
    .addEventListener("input", (e) => {
      config.moonSizeMultiplier = parseInt(e.target.value);
      updateValueDisplay(
        "moonSizeMultiplier",
        config.GOLDEN_RATIO * config.moonSizeMultiplier,
        "×"
      );
    });

  // Color controls
  document.getElementById("radarLinesColor").addEventListener("input", (e) => {
    config.gridColor = e.target.value;
  });

  document.getElementById("textColor").addEventListener("input", (e) => {
    config.textColor = e.target.value;
  });

  document.getElementById("sunColor").addEventListener("input", (e) => {
    config.dotColors[0] = e.target.value;
  });

  document.getElementById("planetColor").addEventListener("input", (e) => {
    config.dotColors[1] = e.target.value;
  });

  document.getElementById("moonColor").addEventListener("input", (e) => {
    config.dotColors[2] = e.target.value;
  });

  document.getElementById("activeMoonColor").addEventListener("input", (e) => {
    config.activeMoonColor = e.target.value;
  });

  document.getElementById("syncLineColor").addEventListener("input", (e) => {
    config.syncLineColor = e.target.value;
  });

  // Transition curve control
  document.getElementById("transitionCurve").addEventListener("change", (e) => {
    config.transitionCurve = e.target.value;
  });

  // Transition duration control
  document
    .getElementById("transitionDuration")
    .addEventListener("input", (e) => {
      config.transitionDuration = parseInt(e.target.value) / 100;
      updateValueDisplay("transitionDuration", e.target.value, "%");
    });

  // Wave controls
  document.getElementById("waveAmplitude").addEventListener("input", (e) => {
    config.waveAmplitude = parseInt(e.target.value);
    updateValueDisplay("waveAmplitude", e.target.value, "px");
  });

  document.getElementById("waveSpeed").addEventListener("input", (e) => {
    config.waveSpeed = parseInt(e.target.value);
    updateValueDisplay("waveSpeed", e.target.value, "×");
  });

  document.getElementById("waveLength").addEventListener("input", (e) => {
    config.waveLength = parseFloat(e.target.value);
    updateValueDisplay("waveLength", e.target.value, "×");
  });

  // Add heartbeat controls
  document
    .getElementById("sunHeartbeatEnabled")
    .addEventListener("change", (e) => {
      config.sunHeartbeat.enabled = e.target.checked;
    });

  document
    .getElementById("sunHeartbeatsPerDay")
    .addEventListener("input", (e) => {
      const step = parseInt(e.target.value);
      const beatsPerDay = 1 + (step - 1) * 0.5; // Start at 1, increment by 0.5
      config.sunHeartbeat.beatsPerDay = beatsPerDay;
      updateValueDisplay("sunHeartbeatsPerDay", beatsPerDay.toFixed(1), "/day");
    });

  document
    .getElementById("planetHeartbeatEnabled")
    .addEventListener("change", (e) => {
      config.planetHeartbeat.enabled = e.target.checked;
    });

  document
    .getElementById("planetHeartbeatsPerDay")
    .addEventListener("input", (e) => {
      const step = parseInt(e.target.value);
      const beatsPerDay = 1 + (step - 1) * 0.5; // Start at 1, increment by 0.5
      config.planetHeartbeat.beatsPerDay = beatsPerDay;
      updateValueDisplay(
        "planetHeartbeatsPerDay",
        beatsPerDay.toFixed(1),
        "/day"
      );
    });

  // Add canvas background control
  document.getElementById("canvasBackground").addEventListener("input", (e) => {
    config.backgroundColor = e.target.value;
  });

  // Add preset controls
  document.getElementById("savePreset").addEventListener("click", savePreset);
  document.getElementById("loadPreset").addEventListener("click", () => {
    document.getElementById("presetFileInput").click();
  });

  document.getElementById("presetFileInput").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      loadPreset(e.target.files[0]);
    }
  });

  // Update moon starting position control
  document
    .getElementById("moonStartingPosition")
    .addEventListener("input", (e) => {
      const degrees = parseInt(e.target.value);
      dots.moon.startingAngle = (degrees * Math.PI) / 180;
      // Update the moon's current angle immediately if not playing
      if (!config.isPlaying) {
        dots.moon.angle = dots.moon.startingAngle;
        updateDotPositions();
      }
      updateValueDisplay("moonStartingPosition", degrees, "°");
    });

  // Add planet wave controls
  document
    .getElementById("planetWaveAmplitude")
    .addEventListener("input", (e) => {
      config.planetWave.amplitude = parseInt(e.target.value);
      updateValueDisplay("planetWaveAmplitude", e.target.value, "px");
    });

  document.getElementById("planetWaveSpeed").addEventListener("input", (e) => {
    config.planetWave.speed = parseInt(e.target.value);
    updateValueDisplay("planetWaveSpeed", e.target.value, "×");
  });

  document.getElementById("planetWaveLength").addEventListener("input", (e) => {
    config.planetWave.wavelength = parseFloat(e.target.value);
    updateValueDisplay("planetWaveLength", e.target.value, "×");
  });

  document
    .getElementById("planetWaveThickness")
    .addEventListener("input", (e) => {
      config.planetWave.thickness = parseFloat(e.target.value);
      updateValueDisplay("planetWaveThickness", e.target.value, "px");
    });

  // Add sun wave controls
  document.getElementById("sunWaveAmplitude").addEventListener("input", (e) => {
    config.sunWave.amplitude = parseInt(e.target.value);
    updateValueDisplay("sunWaveAmplitude", e.target.value, "px");
  });

  document.getElementById("sunWaveSpeed").addEventListener("input", (e) => {
    config.sunWave.speed = parseInt(e.target.value);
    updateValueDisplay("sunWaveSpeed", e.target.value, "×");
  });

  document.getElementById("sunWaveLength").addEventListener("input", (e) => {
    config.sunWave.wavelength = parseFloat(e.target.value);
    updateValueDisplay("sunWaveLength", e.target.value, "×");
  });

  document.getElementById("sunWaveThickness").addEventListener("input", (e) => {
    config.sunWave.thickness = parseFloat(e.target.value);
    updateValueDisplay("sunWaveThickness", e.target.value, "px");
  });

  document.getElementById("secondWaveColor").addEventListener("input", (e) => {
    config.secondWaveColor = e.target.value;
  });

  // Add gravity toggle control
  document.getElementById("gravityEnabled").addEventListener("change", (e) => {
    config.gravityEnabled = e.target.checked;
  });

  // Add sun size control
  document.getElementById("sunSize").addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    // Calculate size multiplier: 1x, 1.618x, 2.618x, 4.236x, 6.854x
    const sizeMultiplier = Math.pow(config.GOLDEN_RATIO, step - 1);

    // Update sun size based on base size and multiplier
    dots.sun.size = dots.sun.baseSize * sizeMultiplier;

    // Update display with the actual multiplier
    updateValueDisplay("sunSize", sizeMultiplier.toFixed(3), "×");
  });

  // Second moon controls
  document
    .getElementById("secondMoonEnabled")
    .addEventListener("change", (e) => {
      config.secondMoon.enabled = e.target.checked;
    });

  document.getElementById("secondMoonColor").addEventListener("input", (e) => {
    config.secondMoon.color = e.target.value;
  });

  document
    .getElementById("secondMoonActiveColor")
    .addEventListener("input", (e) => {
      config.secondMoon.activeColor = e.target.value;
    });

  // Add second moon orbit controls
  document
    .getElementById("secondMoonOrbitRadius")
    .addEventListener("input", (e) => {
      const radius = parseInt(e.target.value);
      dots.secondMoon.orbitRadius = radius;
      updateValueDisplay("secondMoonOrbitRadius", radius, "px");
    });

  document.getElementById("secondMoonPeriod").addEventListener("input", (e) => {
    const rotationsPerDay = parseFloat(e.target.value);
    // Calculate period in milliseconds for the specified number of rotations per day
    dots.secondMoon.period = MILLISECONDS_PER_DAY / rotationsPerDay;
    updateValueDisplay("secondMoonPeriod", rotationsPerDay, "/day");
  });

  // Planet size control
  document.getElementById("planetSize").addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    const sizeMultiplier = Math.pow(config.GOLDEN_RATIO, step - 1);
    dots.planet.size = dots.planet.baseSize * sizeMultiplier;
    updateValueDisplay("planetSize", sizeMultiplier.toFixed(3), "×");
  });

  // Particle flow controls
  document
    .getElementById("particleFlowEnabled")
    .addEventListener("change", (e) => {
      config.planetParticles.enabled = e.target.checked;
      if (config.planetParticles.enabled) {
        initializeParticles();
      }
    });

  document.getElementById("particleColor").addEventListener("input", (e) => {
    config.planetParticles.color = e.target.value;
  });

  document.getElementById("particleSize").addEventListener("input", (e) => {
    config.planetParticles.size = parseInt(e.target.value);
    updateValueDisplay("particleSize", e.target.value, "px");
  });

  document.getElementById("particleAmount").addEventListener("input", (e) => {
    config.planetParticles.amount = parseInt(e.target.value);
    updateValueDisplay("particleAmount", e.target.value);
    initializeParticles();
  });

  document.getElementById("particleSpeed").addEventListener("input", (e) => {
    config.planetParticles.speed = parseInt(e.target.value);
    updateValueDisplay("particleSpeed", e.target.value, "×");
  });

  document.getElementById("particleOpacity").addEventListener("input", (e) => {
    config.planetParticles.opacity = parseInt(e.target.value) / 100;
    updateValueDisplay("particleOpacity", e.target.value, "%");
  });

  document
    .getElementById("particleDispersion")
    .addEventListener("input", (e) => {
      config.planetParticles.dispersion = parseInt(e.target.value);
      updateValueDisplay("particleDispersion", e.target.value, "%");
    });

  document
    .getElementById("particleDayTiming")
    .addEventListener("change", (e) => {
      config.planetParticles.dayTiming = e.target.checked;
    });

  // Sun particle controls
  document
    .getElementById("sunParticleFlowEnabled")
    .addEventListener("change", (e) => {
      config.sunParticles.enabled = e.target.checked;
      if (config.sunParticles.enabled) {
        initializeSunParticles();
      }
    });

  document.getElementById("sunParticleColor").addEventListener("input", (e) => {
    config.sunParticles.color = e.target.value;
  });

  document.getElementById("sunParticleSize").addEventListener("input", (e) => {
    config.sunParticles.size = parseInt(e.target.value);
    updateValueDisplay("sunParticleSize", e.target.value, "px");
  });

  document
    .getElementById("sunParticleAmount")
    .addEventListener("input", (e) => {
      config.sunParticles.amount = parseInt(e.target.value);
      updateValueDisplay("sunParticleAmount", e.target.value);
      initializeSunParticles();
    });

  document.getElementById("sunParticleSpeed").addEventListener("input", (e) => {
    config.sunParticles.speed = parseInt(e.target.value);
    updateValueDisplay("sunParticleSpeed", e.target.value, "×");
  });

  document
    .getElementById("sunParticleOpacity")
    .addEventListener("input", (e) => {
      config.sunParticles.opacity = parseInt(e.target.value) / 100;
      updateValueDisplay("sunParticleOpacity", e.target.value, "%");
    });

  document
    .getElementById("sunParticleDispersion")
    .addEventListener("input", (e) => {
      config.sunParticles.dispersion = parseInt(e.target.value);
      updateValueDisplay("sunParticleDispersion", e.target.value, "%");
    });

  document
    .getElementById("sunParticleDayTiming")
    .addEventListener("change", (e) => {
      config.sunParticles.dayTiming = e.target.checked;
    });

  // Add alignment sync controls
  document
    .getElementById("particleAlignmentSync")
    .addEventListener("change", (e) => {
      config.planetParticles.alignmentSync = e.target.checked;
    });

  document
    .getElementById("sunParticleAlignmentSync")
    .addEventListener("change", (e) => {
      config.sunParticles.alignmentSync = e.target.checked;
    });

  // Planet radio wave controls
  document
    .getElementById("planetRadioWavesEnabled")
    .addEventListener("change", (e) => {
      config.planetRadioWaves.enabled = e.target.checked;
      if (config.planetRadioWaves.enabled) {
        initializePlanetRadioWaves();
      }
    });

  document
    .getElementById("planetRadioWaveColor")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.color = e.target.value;
    });

  document
    .getElementById("planetRadioWaveSpeed")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.speed = parseInt(e.target.value);
      updateValueDisplay("planetRadioWaveSpeed", e.target.value, "×");
    });

  document
    .getElementById("planetRadioWaveSpacing")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.spacing = parseInt(e.target.value);
      updateValueDisplay("planetRadioWaveSpacing", e.target.value, "px");
    });

  document
    .getElementById("planetRadioWaveThickness")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.thickness = parseFloat(e.target.value);
      updateValueDisplay("planetRadioWaveThickness", e.target.value, "px");
    });

  document
    .getElementById("planetRadioWaveArc")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.arc = parseInt(e.target.value);
      updateValueDisplay("planetRadioWaveArc", e.target.value, "°");
    });

  document
    .getElementById("planetRadioWaveOpacity")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.opacity = parseInt(e.target.value) / 100;
      updateValueDisplay("planetRadioWaveOpacity", e.target.value, "%");
    });

  document
    .getElementById("planetRadioWaveDayTiming")
    .addEventListener("change", (e) => {
      config.planetRadioWaves.dayTiming = e.target.checked;
    });

  document
    .getElementById("planetRadioWaveAlignmentSync")
    .addEventListener("change", (e) => {
      config.planetRadioWaves.alignmentSync = e.target.checked;
    });

  document
    .getElementById("planetRadioWaveRange")
    .addEventListener("input", (e) => {
      config.planetRadioWaves.range = parseInt(e.target.value);
      updateValueDisplay("planetRadioWaveRange", e.target.value, "%");
    });

  // Sun radio wave controls
  document
    .getElementById("sunRadioWavesEnabled")
    .addEventListener("change", (e) => {
      config.sunRadioWaves.enabled = e.target.checked;
      if (config.sunRadioWaves.enabled) {
        initializeSunRadioWaves();
      }
    });

  document
    .getElementById("sunRadioWaveColor")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.color = e.target.value;
    });

  document
    .getElementById("sunRadioWaveSpeed")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.speed = parseInt(e.target.value);
      updateValueDisplay("sunRadioWaveSpeed", e.target.value, "×");
    });

  document
    .getElementById("sunRadioWaveSpacing")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.spacing = parseInt(e.target.value);
      updateValueDisplay("sunRadioWaveSpacing", e.target.value, "px");
    });

  document
    .getElementById("sunRadioWaveThickness")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.thickness = parseFloat(e.target.value);
      updateValueDisplay("sunRadioWaveThickness", e.target.value, "px");
    });

  document.getElementById("sunRadioWaveArc").addEventListener("input", (e) => {
    config.sunRadioWaves.arc = parseInt(e.target.value);
    updateValueDisplay("sunRadioWaveArc", e.target.value, "°");
  });

  document
    .getElementById("sunRadioWaveOpacity")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.opacity = parseInt(e.target.value) / 100;
      updateValueDisplay("sunRadioWaveOpacity", e.target.value, "%");
    });

  document
    .getElementById("sunRadioWaveDayTiming")
    .addEventListener("change", (e) => {
      config.sunRadioWaves.dayTiming = e.target.checked;
    });

  document
    .getElementById("sunRadioWaveAlignmentSync")
    .addEventListener("change", (e) => {
      config.sunRadioWaves.alignmentSync = e.target.checked;
    });

  document
    .getElementById("sunRadioWaveRange")
    .addEventListener("input", (e) => {
      config.sunRadioWaves.range = parseInt(e.target.value);
      updateValueDisplay("sunRadioWaveRange", e.target.value, "%");
    });

  // Add radar line thickness control
  document
    .getElementById("radarLineThickness")
    .addEventListener("input", (e) => {
      config.lineThickness = parseFloat(e.target.value);
      updateValueDisplay("radarLineThickness", e.target.value, "px");
    });

  // Add font controls
  document.getElementById("radarFontFamily").addEventListener("change", (e) => {
    config.fontFamily = e.target.value;
  });

  document.getElementById("radarFontSize").addEventListener("input", (e) => {
    config.fontSize = parseInt(e.target.value);
    updateValueDisplay("radarFontSize", e.target.value, "px");
  });

  // Add day label controls
  for (let i = 0; i < 6; i++) {
    document.getElementById(`dayLabel${i}`).addEventListener("input", (e) => {
      const value = e.target.value.toUpperCase();
      e.target.value = value;
      config.days[i] = value || config.days[i];
    });
  }

  // Sunspots controls
  document.getElementById("sunspotsEnabled").addEventListener("change", (e) => {
    config.sunspots.enabled = e.target.checked;
    if (!e.target.checked) {
      config.sunspots.spots = []; // Clear spots when disabled
    }
  });

  document.getElementById("sunspotSize").addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    // Calculate size using golden ratio: 1x, 1.618x, 2.618x, 4.236x, 6.854x
    const sizeMultiplier = Math.pow(config.GOLDEN_RATIO, step - 1);
    config.sunspots.size = config.sunspots.baseSize * sizeMultiplier;
    updateValueDisplay("sunspotSize", sizeMultiplier.toFixed(3), "×");
  });

  document
    .getElementById("sunspotAttraction")
    .addEventListener("input", (e) => {
      config.sunspots.attraction = parseFloat(e.target.value);
      updateValueDisplay("sunspotAttraction", e.target.value);
    });

  document.getElementById("sunspotEnergy").addEventListener("input", (e) => {
    config.sunspots.energy = parseFloat(e.target.value);
    updateValueDisplay("sunspotEnergy", e.target.value, "×");
  });

  document.getElementById("sunspotColor").addEventListener("input", (e) => {
    config.sunspots.color = e.target.value;
  });

  document.getElementById("clearSunspots").addEventListener("click", () => {
    config.sunspots.spots = [];
  });

  // Initialize all value displays
  updateValueDisplay("planetOrbitRadius", 3.0);
  updateValueDisplay("planetPeriod", 1.0, "/day");
  updateValueDisplay("sunSize", 1.0, "×");
  updateValueDisplay("moonOrbitRadius", 40, "px");
  updateValueDisplay("moonPeriod", 0.5, "/day");
  updateValueDisplay("moonStartingPosition", 270, "°");
  updateValueDisplay("radarRotation", 0, "°");
  updateValueDisplay("gravityStrength", 0.5);
  updateValueDisplay("moonSizeMultiplier", config.GOLDEN_RATIO, "×");
  updateValueDisplay("transitionDuration", 20, "%");
  updateValueDisplay("waveAmplitude", 5, "px");
  updateValueDisplay("waveSpeed", 3, "×");
  updateValueDisplay("waveLength", 2.0, "×");

  // Initialize accordion
  initializeAccordion();

  // Add new control handler
  document.getElementById("spotsPerDay").addEventListener("input", (e) => {
    config.sunspots.spotsPerDay = parseInt(e.target.value);
    updateValueDisplay("spotsPerDay", e.target.value);
  });
}

function drawBackground() {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  ctx.strokeStyle = config.gridColor;
  ctx.lineWidth = config.lineThickness;

  // Save the current context state
  ctx.save();

  // Translate to center and rotate the entire radar
  ctx.translate(config.centerX, config.centerY);
  ctx.rotate(config.radarRotation);
  ctx.translate(-config.centerX, -config.centerY);

  // Draw rings
  for (let i = 1; i <= config.rings; i++) {
    ctx.beginPath();
    ctx.arc(
      config.centerX,
      config.centerY,
      (config.radius / config.rings) * i,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  // Draw section lines
  for (let i = 0; i < 6; i++) {
    const angle = MONDAY_START + i * DEGREES_PER_DAY;
    ctx.beginPath();
    ctx.moveTo(config.centerX, config.centerY);
    ctx.lineTo(
      config.centerX + Math.cos(angle) * config.radius,
      config.centerY + Math.sin(angle) * config.radius
    );
    ctx.stroke();
  }

  // Draw day labels with updated font settings
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.textColor;
  ctx.textAlign = "center";
  config.days.forEach((day, i) => {
    const angle = MONDAY_START + i * DEGREES_PER_DAY;
    const x = config.centerX + Math.cos(angle) * (config.radius + 30);
    const y = config.centerY + Math.sin(angle) * (config.radius + 30);
    ctx.fillText(day, x, y);
  });

  // Restore the context state
  ctx.restore();
}

function updateValueDisplay(inputId, value, suffix = "") {
  const displayElement = document.getElementById(inputId + "Value");
  if (displayElement) {
    displayElement.textContent = Number(value).toFixed(1) + suffix;
  }
}

function linear(x) {
  return x;
}

function easeInOut(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function elastic(x) {
  const c4 = (2 * Math.PI) / 3;
  return x === 0
    ? 0
    : x === 1
    ? 1
    : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
}

function bounce(x) {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
}

function getTransitionCurve(type) {
  switch (type) {
    case "linear":
      return linear;
    case "elastic":
      return elastic;
    case "bounce":
      return bounce;
    default:
      return easeInOut;
  }
}

function getTransitionFactor(dayProgress, dayNumber) {
  const transitionWindow = config.transitionDuration;

  // Check current, previous and next days
  const isCurrentDayAlignment = config.alignmentDays.has(dayNumber);
  const isPrevDayAlignment = config.alignmentDays.has((dayNumber - 1 + 6) % 6);
  const isNextDayAlignment = config.alignmentDays.has((dayNumber + 1) % 6);

  let factor = 0;

  // Calculate transition based on proximity to alignment days
  if (isCurrentDayAlignment) {
    factor = 1;
  }

  // Add transition from previous day
  if (isPrevDayAlignment && dayProgress < transitionWindow) {
    const prevFactor = 1 - dayProgress / transitionWindow;
    factor = Math.max(factor, prevFactor);
  }

  // Add transition to next day
  if (isNextDayAlignment && dayProgress > 1 - transitionWindow) {
    const nextFactor =
      (dayProgress - (1 - transitionWindow)) / transitionWindow;
    factor = Math.max(factor, nextFactor);
  }

  return factor;
}

function checkAlignment() {
  const vectorToMoon = {
    x: dots.moon.x - dots.sun.x,
    y: dots.moon.y - dots.sun.y,
  };
  const vectorToPlanet = {
    x: dots.planet.x - dots.sun.x,
    y: dots.planet.y - dots.sun.y,
  };

  // Calculate angles from sun to both bodies
  const moonAngle = Math.atan2(vectorToMoon.y, vectorToMoon.x);
  const planetAngle = Math.atan2(vectorToPlanet.y, vectorToPlanet.x);

  // Calculate the smallest angle between the two vectors (0 to PI)
  let angleDiff = Math.abs(moonAngle - planetAngle);
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }

  // Convert to a 0-1 scale where 0 is perfect alignment
  const alignmentStrength = angleDiff / Math.PI;

  return {
    isAligned: alignmentStrength < 0.01,
    alignmentStrength: alignmentStrength,
  };
}

function updateDotPositions() {
  const currentTime = config.isPlaying
    ? Date.now() - config.startTime
    : config.pauseTime;

  // Calculate angles
  const planetAngle = config.isPlaying
    ? MONDAY_START +
      ((currentTime % (dots.planet.period * 6)) / (dots.planet.period * 6)) *
        (Math.PI * 2) *
        dots.planet.direction
    : dots.planet.angle;

  const moonTimeProgress = config.isPlaying
    ? (currentTime % (MILLISECONDS_PER_DAY * 6)) / dots.moon.period
    : dots.moon.angle / (Math.PI * 2);

  const moonAngle = config.isPlaying
    ? dots.moon.startingAngle +
      moonTimeProgress * (Math.PI * 2) * dots.moon.direction
    : dots.moon.angle;

  // Second moon angle (opposite to first moon)
  const secondMoonAngle = config.isPlaying
    ? dots.secondMoon.startingAngle +
      moonTimeProgress * (Math.PI * 2) * dots.moon.direction
    : dots.secondMoon.angle;

  // Update positions
  dots.planet.x = config.centerX + Math.cos(planetAngle) * dots.planet.radius;
  dots.planet.y = config.centerY + Math.sin(planetAngle) * dots.planet.radius;
  dots.planet.angle = planetAngle;

  // Calculate moon positions
  let moonX = Math.cos(moonAngle) * Math.abs(dots.moon.orbitRadius);
  let moonY = Math.sin(moonAngle) * Math.abs(dots.moon.orbitRadius);

  let secondMoonX =
    Math.cos(secondMoonAngle) * Math.abs(dots.secondMoon.orbitRadius);
  let secondMoonY =
    Math.sin(secondMoonAngle) * Math.abs(dots.secondMoon.orbitRadius);

  if (dots.moon.orbitRadius < 0) {
    moonX = -moonX;
    moonY = -moonY;
    secondMoonX = -secondMoonX;
    secondMoonY = -secondMoonY;
  }

  dots.moon.x = dots.planet.x + moonX;
  dots.moon.y = dots.planet.y + moonY;
  dots.moon.angle = moonAngle;

  dots.secondMoon.x = dots.planet.x + secondMoonX;
  dots.secondMoon.y = dots.planet.y + secondMoonY;
  dots.secondMoon.angle = secondMoonAngle;
}

function calculateTransitionState(dayProgress, dayNumber) {
  // Get base transition factor
  const transitionFactor = getTransitionFactor(dayProgress, dayNumber);

  // Calculate alignment
  const vectorToMoon = {
    x: dots.moon.x - dots.sun.x,
    y: dots.moon.y - dots.sun.y,
  };
  const vectorToPlanet = {
    x: dots.planet.x - dots.sun.x,
    y: dots.planet.y - dots.sun.y,
  };

  const dotProduct =
    (vectorToMoon.x * vectorToPlanet.x + vectorToMoon.y * vectorToPlanet.y) /
    (Math.sqrt(
      vectorToMoon.x * vectorToMoon.x + vectorToMoon.y * vectorToMoon.y
    ) *
      Math.sqrt(
        vectorToPlanet.x * vectorToPlanet.x +
          vectorToPlanet.y * vectorToPlanet.y
      ));

  // Calculate alignment factor with smoother threshold
  const alignmentThreshold = 0.95;
  const alignmentRange = 0.04;
  let alignmentFactor = 0;

  if (dotProduct > alignmentThreshold) {
    alignmentFactor = (dotProduct - alignmentThreshold) / alignmentRange;
    alignmentFactor = Math.min(1, alignmentFactor);
  }

  // Apply the selected transition curve to create a single smooth factor
  const curveFunction = getTransitionCurve(config.transitionCurve);
  const smoothFactor = curveFunction(transitionFactor * alignmentFactor);

  // Reset spots counter when entering a new day
  if (dayNumber !== config.sunspots.lastDayNumber) {
    config.sunspots.spotsCreatedInCurrentDay = 0;
    config.sunspots.lastDayNumber = dayNumber;
  }

  // Create sunspots during alignment if quota not met
  if (
    config.sunspots.enabled &&
    smoothFactor > 0.95 &&
    config.sunspots.spotsCreatedInCurrentDay < config.sunspots.spotsPerDay &&
    config.alignmentDays.has(dayNumber)
  ) {
    // Only create spots on alignment days

    // Calculate how far we are into the current day (0 to 1)
    const dayProgressNormalized = dayProgress;

    // Calculate when in the day each spot should appear
    const spotTiming = 1 / (config.sunspots.spotsPerDay + 1);

    // Check if we've reached the next spot timing
    const nextSpotIndex = config.sunspots.spotsCreatedInCurrentDay + 1;
    const nextSpotTiming = spotTiming * nextSpotIndex;

    if (
      dayProgressNormalized >= nextSpotTiming &&
      config.sunspots.spotsCreatedInCurrentDay < nextSpotIndex
    ) {
      // Calculate angle from sun to moon for directional spawning
      const moonToSunAngle = Math.atan2(
        dots.moon.y - dots.sun.y,
        dots.moon.x - dots.sun.x
      );

      // Add a sunspot at the calculated entry point
      const x = dots.sun.x + Math.cos(moonToSunAngle) * dots.sun.size;
      const y = dots.sun.y + Math.sin(moonToSunAngle) * dots.sun.size;
      addSunspot(x, y, moonToSunAngle);

      config.sunspots.lastAlignmentTime = Date.now();
      config.sunspots.spotsCreatedInCurrentDay++;
    }
  }

  return {
    transitionFactor,
    alignmentFactor,
    smoothFactor,
    dotProduct,
  };
}

function lerpColor(color1, color2, factor) {
  // Convert hex to RGB
  const c1 = {
    r: parseInt(color1.slice(1, 3), 16),
    g: parseInt(color1.slice(3, 5), 16),
    b: parseInt(color1.slice(5, 7), 16),
  };
  const c2 = {
    r: parseInt(color2.slice(1, 3), 16),
    g: parseInt(color2.slice(3, 5), 16),
    b: parseInt(color2.slice(5, 7), 16),
  };

  // Interpolate
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);

  // Convert back to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function drawWavyLine(
  startX,
  startY,
  endX,
  endY,
  amplitude,
  frequency,
  phase,
  thickness
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.lineWidth = thickness;

  const segments = Math.ceil(distance / 5);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startX + dx * t;
    const y = startY + dy * t;

    const waveOffset =
      amplitude * Math.sin(frequency * t * Math.PI * 2 + phase);
    const perpX = -Math.sin(angle) * waveOffset;
    const perpY = Math.cos(angle) * waveOffset;

    if (i === 0) {
      ctx.moveTo(x + perpX, y + perpY);
    } else {
      ctx.lineTo(x + perpX, y + perpY);
    }
  }
  ctx.stroke();
}

function calculateHeartbeatScale(beatsPerDay) {
  if (beatsPerDay <= 0) return 1;

  const planetAngleNorm = (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
  const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;
  const beatProgress = (dayProgress * beatsPerDay) % 1;
  const phase = beatProgress * Math.PI * 2;

  // Single smooth easing function
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

  // Simplified cardiac cycle with fewer phases and slower timing
  const cyclePosition = phase / (Math.PI * 2);
  let scale = 1.0;

  if (cyclePosition < 0.3) {
    // Doubled from 0.15
    // Initial contraction (atrial) - slower rise
    const t = cyclePosition / 0.3;
    scale += 0.15 * easeOutQuint(t);
  } else if (cyclePosition < 0.5) {
    // Increased from 0.3
    // Main contraction (ventricular) - slower peak
    const t = (cyclePosition - 0.3) / 0.2;
    scale += 0.3 * (1 - easeOutQuint(1 - t));
  } else if (cyclePosition < 0.7) {
    // Increased from 0.4
    // Peak and initial relaxation - slower descent
    const t = (cyclePosition - 0.5) / 0.2;
    scale += 0.3 * (1 - easeOutQuint(t));
  } else if (cyclePosition < 0.9) {
    // Increased from 0.7
    // Gradual return to baseline - slower return
    const t = (cyclePosition - 0.7) / 0.2;
    scale += 0.15 * (1 - easeOutQuint(t));
  }
  // Rest period (no movement) - slightly shorter rest period

  return scale;
}

function drawDots() {
  const planetAngleNorm = (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
  const dayNumber = Math.floor(planetAngleNorm / DEGREES_PER_DAY);
  const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;

  const transitionState = calculateTransitionState(dayProgress, dayNumber);
  const isAlignmentDay = config.alignmentDays.has(dayNumber);

  // Draw wavy alignment beams for first moon
  if (transitionState.smoothFactor > 0.01) {
    const sunPhase =
      (Date.now() / (1000 / config.sunWave.speed)) % (Math.PI * 2);
    const moonPhase = sunPhase + Math.PI;
    const opacity = Math.floor(transitionState.smoothFactor * 255); // Changed from 128 to 255 for full opacity range
    const opacityHex = opacity.toString(16).padStart(2, "0");

    // First moon waves
    ctx.strokeStyle = `${config.syncLineColor}${opacityHex}`;
    drawWavyLine(
      dots.sun.x,
      dots.sun.y,
      dots.moon.x,
      dots.moon.y,
      config.sunWave.amplitude * transitionState.smoothFactor,
      config.sunWave.wavelength,
      sunPhase,
      config.sunWave.thickness
    );

    ctx.strokeStyle = `${config.secondWaveColor}${opacityHex}`;
    drawWavyLine(
      dots.sun.x,
      dots.sun.y,
      dots.moon.x,
      dots.moon.y,
      config.planetWave.amplitude * transitionState.smoothFactor,
      config.planetWave.wavelength,
      moonPhase,
      config.planetWave.thickness
    );

    // Second moon waves (if enabled)
    if (config.secondMoon.enabled) {
      ctx.strokeStyle = `${config.syncLineColor}${opacityHex}`;
      drawWavyLine(
        dots.sun.x,
        dots.sun.y,
        dots.secondMoon.x,
        dots.secondMoon.y,
        config.sunWave.amplitude * transitionState.smoothFactor,
        config.sunWave.wavelength,
        sunPhase + Math.PI, // Offset phase for second moon
        config.sunWave.thickness
      );

      ctx.strokeStyle = `${config.secondWaveColor}${opacityHex}`;
      drawWavyLine(
        dots.sun.x,
        dots.sun.y,
        dots.secondMoon.x,
        dots.secondMoon.y,
        config.planetWave.amplitude * transitionState.smoothFactor,
        config.planetWave.wavelength,
        moonPhase + Math.PI, // Offset phase for second moon
        config.planetWave.thickness
      );
    }
  }

  // Draw particle flow
  if (config.planetParticles.enabled) {
    // Check alignment sync condition
    const showParticles =
      !config.planetParticles.alignmentSync || !isAlignmentDay;

    if (showParticles) {
      const particles = config.planetParticles.particles;
      const planetToSunAngle = Math.atan2(
        dots.sun.y - dots.planet.y,
        dots.sun.x - dots.planet.x
      );
      const distance = Math.sqrt(
        Math.pow(dots.sun.x - dots.planet.x, 2) +
          Math.pow(dots.sun.y - dots.planet.y, 2)
      );

      // Calculate day progress for particle timing
      const planetAngleNorm =
        (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
      const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;

      // Calculate timing factor
      let timingFactor = 1;
      if (config.planetParticles.dayTiming) {
        // Fade in during first 20% of day, fade out during last 20%
        const fadeWindow = 0.2;
        if (dayProgress < fadeWindow) {
          timingFactor = dayProgress / fadeWindow;
        } else if (dayProgress > 1 - fadeWindow) {
          timingFactor = (1 - dayProgress) / fadeWindow;
        }
        timingFactor = Math.max(0, Math.min(1, timingFactor));
      }

      ctx.fillStyle = config.planetParticles.color;
      particles.forEach((particle, index) => {
        // Update particle progress
        particle.progress += 0.001 * config.planetParticles.speed;
        if (particle.progress >= 1) {
          particle.progress = 0;
          particle.offset = Math.random() * Math.PI * 2;
        }

        // Calculate particle position with dispersion
        const particleDistance = distance * particle.progress;
        const dispersionFactor = config.planetParticles.dispersion / 100; // Convert to 0-1 range
        const wobbleAmplitude = 5 + 35 * dispersionFactor * particle.progress; // Smaller at origin, increases along path
        const wobbleFrequency = 4 - 2 * dispersionFactor; // Reduce frequency as dispersion increases

        const wobble =
          Math.sin(
            particle.progress * Math.PI * wobbleFrequency + particle.offset
          ) *
          wobbleAmplitude *
          (1 + particle.progress * dispersionFactor); // Increase dispersion along the path

        const particleX =
          dots.planet.x +
          Math.cos(planetToSunAngle) * particleDistance +
          Math.cos(planetToSunAngle + Math.PI / 2) * wobble;
        const particleY =
          dots.planet.y +
          Math.sin(planetToSunAngle) * particleDistance +
          Math.sin(planetToSunAngle + Math.PI / 2) * wobble;

        // Draw particle with fade out and timing factor
        ctx.globalAlpha =
          config.planetParticles.opacity *
          (1 - particle.progress) *
          timingFactor;
        ctx.beginPath();
        ctx.arc(
          particleX,
          particleY,
          config.planetParticles.size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  // Draw sun particles
  if (config.sunParticles.enabled) {
    // Check alignment sync condition
    const showParticles = !config.sunParticles.alignmentSync || !isAlignmentDay;

    if (showParticles) {
      const particles = config.sunParticles.particles;
      const sunToPlanetAngle = Math.atan2(
        dots.planet.y - dots.sun.y,
        dots.planet.x - dots.sun.x
      );
      const distance = Math.sqrt(
        Math.pow(dots.planet.x - dots.sun.x, 2) +
          Math.pow(dots.planet.y - dots.sun.y, 2)
      );

      // Calculate day progress for particle timing
      const planetAngleNorm =
        (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
      const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;

      // Calculate timing factor
      let timingFactor = 1;
      if (config.sunParticles.dayTiming) {
        const fadeWindow = 0.2;
        if (dayProgress < fadeWindow) {
          timingFactor = dayProgress / fadeWindow;
        } else if (dayProgress > 1 - fadeWindow) {
          timingFactor = (1 - dayProgress) / fadeWindow;
        }
        timingFactor = Math.max(0, Math.min(1, timingFactor));
      }

      ctx.fillStyle = config.sunParticles.color;
      particles.forEach((particle) => {
        particle.progress += 0.001 * config.sunParticles.speed;
        if (particle.progress >= 1) {
          particle.progress = 0;
          particle.offset = Math.random() * Math.PI * 2;
        }

        const particleDistance = distance * particle.progress;
        const dispersionFactor = config.sunParticles.dispersion / 100;
        const wobbleAmplitude = 5 + 35 * dispersionFactor * particle.progress;
        const wobbleFrequency = 4 - 2 * dispersionFactor;

        const wobble =
          Math.sin(
            particle.progress * Math.PI * wobbleFrequency + particle.offset
          ) *
          wobbleAmplitude *
          (1 + particle.progress * dispersionFactor);

        const particleX =
          dots.sun.x +
          Math.cos(sunToPlanetAngle) * particleDistance +
          Math.cos(sunToPlanetAngle + Math.PI / 2) * wobble;
        const particleY =
          dots.sun.y +
          Math.sin(sunToPlanetAngle) * particleDistance +
          Math.sin(sunToPlanetAngle + Math.PI / 2) * wobble;

        ctx.globalAlpha =
          config.sunParticles.opacity * (1 - particle.progress) * timingFactor;
        ctx.beginPath();
        ctx.arc(particleX, particleY, config.sunParticles.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  // Draw radio waves
  if (config.planetRadioWaves.enabled) {
    const showWaves =
      !config.planetRadioWaves.alignmentSync ||
      (config.planetRadioWaves.alignmentSync &&
        config.brainstreamDays.has(dayNumber));

    if (showWaves) {
      const planetToSunAngle = Math.atan2(
        dots.sun.y - dots.planet.y,
        dots.sun.x - dots.planet.x
      );

      let timingFactor = 1;
      if (config.planetRadioWaves.dayTiming) {
        const fadeWindow = 0.2;
        if (dayProgress < fadeWindow) {
          timingFactor = dayProgress / fadeWindow;
        } else if (dayProgress > 1 - fadeWindow) {
          timingFactor = (1 - dayProgress) / fadeWindow;
        }
        timingFactor = Math.max(0, Math.min(1, timingFactor));
      }

      // Create clipping region for the range
      ctx.save();
      ctx.beginPath();
      const maxRadius = (config.radius * config.planetRadioWaves.range) / 100;
      ctx.arc(dots.planet.x, dots.planet.y, maxRadius, 0, Math.PI * 2);
      ctx.clip();

      // Draw waves
      ctx.strokeStyle = config.planetRadioWaves.color;
      ctx.lineWidth = config.planetRadioWaves.thickness;

      config.planetRadioWaves.waves.forEach((wave, index) => {
        wave.radius += 0.5 * config.planetRadioWaves.speed;
        if (wave.radius > config.radius) {
          wave.radius = 0;
        }

        const arcAngle = (config.planetRadioWaves.arc * Math.PI) / 180;
        const startAngle = planetToSunAngle - arcAngle / 2;
        const endAngle = planetToSunAngle + arcAngle / 2;

        ctx.beginPath();
        ctx.globalAlpha =
          config.planetRadioWaves.opacity *
          (1 - wave.radius / config.radius) *
          timingFactor;
        ctx.arc(
          dots.planet.x,
          dots.planet.y,
          wave.radius,
          startAngle,
          endAngle
        );
        ctx.stroke();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  if (config.sunRadioWaves.enabled) {
    const showWaves =
      !config.sunRadioWaves.alignmentSync ||
      (config.sunRadioWaves.alignmentSync &&
        config.brainstreamDays.has(dayNumber));

    if (showWaves) {
      const sunToPlanetAngle = Math.atan2(
        dots.planet.y - dots.sun.y,
        dots.planet.x - dots.sun.x
      );

      let timingFactor = 1;
      if (config.sunRadioWaves.dayTiming) {
        const fadeWindow = 0.2;
        if (dayProgress < fadeWindow) {
          timingFactor = dayProgress / fadeWindow;
        } else if (dayProgress > 1 - fadeWindow) {
          timingFactor = (1 - dayProgress) / fadeWindow;
        }
        timingFactor = Math.max(0, Math.min(1, timingFactor));
      }

      // Create clipping region for the range
      ctx.save();
      ctx.beginPath();
      const maxRadius = (config.radius * config.sunRadioWaves.range) / 100;
      ctx.arc(dots.sun.x, dots.sun.y, maxRadius, 0, Math.PI * 2);
      ctx.clip();

      // Draw waves
      ctx.strokeStyle = config.sunRadioWaves.color;
      ctx.lineWidth = config.sunRadioWaves.thickness;

      config.sunRadioWaves.waves.forEach((wave, index) => {
        wave.radius += 0.5 * config.sunRadioWaves.speed;
        if (wave.radius > config.radius) {
          wave.radius = 0;
        }

        const arcAngle = (config.sunRadioWaves.arc * Math.PI) / 180;
        const startAngle = sunToPlanetAngle - arcAngle / 2;
        const endAngle = sunToPlanetAngle + arcAngle / 2;

        ctx.beginPath();
        ctx.globalAlpha =
          config.sunRadioWaves.opacity *
          (1 - wave.radius / config.radius) *
          timingFactor;
        ctx.arc(dots.sun.x, dots.sun.y, wave.radius, startAngle, endAngle);
        ctx.stroke();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // Draw celestial bodies
  // Draw sun with heartbeat
  const sunScale = config.sunHeartbeat.enabled
    ? calculateHeartbeatScale(config.sunHeartbeat.beatsPerDay)
    : 1;

  ctx.beginPath();
  ctx.save();
  ctx.translate(dots.sun.x, dots.sun.y);
  ctx.scale(sunScale, sunScale);
  ctx.arc(0, 0, dots.sun.size, 0, Math.PI * 2);
  ctx.restore();
  ctx.fillStyle = config.dotColors[0];
  ctx.fill();

  // Draw sunspots on top of sun
  if (config.sunspots.enabled && config.sunspots.spots.length > 0) {
    ctx.fillStyle = config.sunspots.color;

    // First update all positions
    for (let i = 0; i < config.sunspots.spots.length; i++) {
      const spot = config.sunspots.spots[i];

      // Update position
      spot.x += spot.vx;
      spot.y += spot.vy;

      // Calculate distance to sun center
      const dx = spot.x - dots.sun.x;
      const dy = spot.y - dots.sun.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply attraction/repulsion force
      const force = config.sunspots.attraction * 0.1;
      const ax = (-dx / distance) * force;
      const ay = (-dy / distance) * force;

      spot.vx += ax;
      spot.vy += ay;

      // Add friction
      spot.vx *= 0.99;
      spot.vy *= 0.99;

      // Keep spots inside sun
      const maxDistance = dots.sun.size - spot.effectiveSize;
      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        spot.x = dots.sun.x + Math.cos(angle) * maxDistance;
        spot.y = dots.sun.y + Math.sin(angle) * maxDistance;

        // Bounce off the boundary
        const normalX = dx / distance;
        const normalY = dy / distance;
        const dot = spot.vx * normalX + spot.vy * normalY;
        spot.vx = spot.vx - 2 * dot * normalX;
        spot.vy = spot.vy - 2 * dot * normalY;
      }

      // Apply repulsion between spots
      for (let j = i + 1; j < config.sunspots.spots.length; j++) {
        const otherSpot = config.sunspots.spots[j];
        const dx = otherSpot.x - spot.x;
        const dy = otherSpot.y - spot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = spot.effectiveSize + otherSpot.effectiveSize;

        if (distance < minDistance) {
          const angle = Math.atan2(dy, dx);
          const overlap = minDistance - distance;
          const moveX = Math.cos(angle) * overlap * 0.5;
          const moveY = Math.sin(angle) * overlap * 0.5;

          // Move spots apart
          spot.x -= moveX;
          spot.y -= moveY;
          otherSpot.x += moveX;
          otherSpot.y += moveY;

          // Exchange momentum
          const tempVx = spot.vx;
          const tempVy = spot.vy;
          spot.vx = otherSpot.vx * 0.8;
          spot.vy = otherSpot.vy * 0.8;
          otherSpot.vx = tempVx * 0.8;
          otherSpot.vy = tempVy * 0.8;
        }
      }
    }

    // Then draw all spots
    config.sunspots.spots.forEach((spot) => {
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.effectiveSize, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw planet with heartbeat
  const planetScale = config.planetHeartbeat.enabled
    ? calculateHeartbeatScale(config.planetHeartbeat.beatsPerDay)
    : 1;

  ctx.beginPath();
  ctx.save();
  ctx.translate(dots.planet.x, dots.planet.y);
  ctx.scale(planetScale, planetScale);
  ctx.arc(0, 0, dots.planet.size, 0, Math.PI * 2);
  ctx.restore();
  ctx.fillStyle = config.dotColors[1];
  ctx.fill();

  // Draw first moon with interpolated size and color
  const baseSize = dots.moon.size;
  const targetSize =
    baseSize * (config.GOLDEN_RATIO * config.moonSizeMultiplier);
  const currentSize =
    baseSize + (targetSize - baseSize) * transitionState.smoothFactor;

  const currentColor = lerpColor(
    config.dotColors[2],
    config.activeMoonColor,
    transitionState.smoothFactor
  );

  ctx.beginPath();
  ctx.arc(dots.moon.x, dots.moon.y, currentSize, 0, Math.PI * 2);
  ctx.fillStyle = currentColor;
  ctx.fill();

  // Draw second moon if enabled
  if (config.secondMoon.enabled) {
    const secondMoonColor = lerpColor(
      config.secondMoon.color,
      config.secondMoon.activeColor,
      transitionState.smoothFactor
    );

    ctx.beginPath();
    ctx.arc(dots.secondMoon.x, dots.secondMoon.y, currentSize, 0, Math.PI * 2);
    ctx.fillStyle = secondMoonColor;
    ctx.fill();
  }
}

function drawCommunicationLines() {
  ctx.lineWidth = 3;
  communicationLines.forEach((isActive, index) => {
    if (isActive) {
      const startAngle = MONDAY_START + index * DEGREES_PER_DAY;
      const endAngle = MONDAY_START + (index + 1) * DEGREES_PER_DAY;
      const midAngle = (startAngle + endAngle) / 2;

      ctx.beginPath();
      ctx.strokeStyle = config.communicationLineColor;
      ctx.moveTo(config.centerX, config.centerY);
      ctx.lineTo(
        config.centerX + Math.cos(midAngle) * config.radius,
        config.centerY + Math.sin(midAngle) * config.radius
      );
      ctx.stroke();
    }
  });
}

function animate() {
  // Empty function - removed random communication lines
}

function render() {
  drawBackground();
  drawGrid();
  updateDotPositions();
  drawDots();
  requestAnimationFrame(render);
}

// Initialize controls and start animation
initializeControls();
render();

// Add animation control functions
function togglePlayPause() {
  config.isPlaying = !config.isPlaying;
  if (config.isPlaying) {
    config.startTime = Date.now() - (config.pauseTime || 0);
  } else {
    config.pauseTime = Date.now() - config.startTime;
  }
  updatePlayPauseButton();
}

function resetAnimation() {
  config.isPlaying = false;
  config.startTime = Date.now();
  config.pauseTime = 0;

  // Reset positions to aligned state
  dots.planet.angle = MONDAY_START;
  // Set moon's initial angle directly to the starting angle
  dots.moon.angle = dots.moon.startingAngle;
  dots.secondMoon.angle = dots.secondMoon.startingAngle;

  // Reset sunspots
  config.sunspots.spots = [];
  config.sunspots.totalMass = 0;
  config.sunspots.spotsCreatedInCurrentDay = 0;
  config.sunspots.lastDayNumber = -1;
  config.sunspots.lastAlignmentTime = 0;

  // Update positions
  updateDotPositions();
  updatePlayPauseButton();
}

function updatePlayPauseButton() {
  const playPauseBtn = document.getElementById("playPauseBtn");
  if (playPauseBtn) {
    playPauseBtn.textContent = config.isPlaying ? "⏸️ Pause" : "▶️ Play";
  }
}

// Add keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePlayPause();
  }
});

// Add after initializeControls function
function initializeAccordion() {
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const group = header.parentElement;
      group.classList.toggle("closed");
    });
  });
}

function savePreset() {
  const preset = {
    config: { ...config },
    dots: {
      planet: { ...dots.planet },
      moon: { ...dots.moon },
    },
  };

  const blob = new Blob([JSON.stringify(preset, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "radar-preset.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadPreset(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const preset = JSON.parse(e.target.result);

      // Update config
      Object.assign(config, preset.config);

      // Update checkboxes for brainstream days
      document
        .querySelectorAll(".brainstream-day-checkbox")
        .forEach((checkbox) => {
          const day = parseInt(checkbox.value);
          checkbox.checked = config.brainstreamDays.has(day);
        });

      // Update dots
      Object.assign(dots.planet, preset.dots.planet);
      Object.assign(dots.moon, preset.dots.moon);

      // Update UI
      updateUIFromConfig();
    } catch (error) {
      console.error("Error loading preset:", error);
    }
  };
  reader.readAsText(file);
}

function updateUIFromConfig() {
  // Update all input values to match config
  document.getElementById("canvasBackground").value = config.backgroundColor;
  document.getElementById("planetOrbitRadius").value =
    dots.planet.radius / (config.radius / config.rings);
  const planetVelocity = MILLISECONDS_PER_DAY / dots.planet.period;
  const velocityStep =
    Math.round(Math.log(planetVelocity) / Math.log(config.GOLDEN_RATIO)) + 1; // Add 1 to match our new scale
  document.getElementById("planetPeriod").value = velocityStep;
  document.getElementById("planetDirection").value = dots.planet.direction;
  document.getElementById("moonOrbitRadius").value = dots.moon.orbitRadius;
  document.getElementById("moonPeriod").value =
    MILLISECONDS_PER_DAY / dots.moon.period;
  document.getElementById("moonDirection").value = dots.moon.direction;
  document.getElementById("radarRotation").value =
    (config.radarRotation * 180) / Math.PI;
  document.getElementById("gravityStrength").value = config.gravityStrength;
  document.getElementById("moonSizeMultiplier").value =
    config.moonSizeMultiplier;
  document.getElementById("transitionCurve").value = config.transitionCurve;
  document.getElementById("transitionDuration").value =
    config.transitionDuration * 100;
  document.getElementById("waveAmplitude").value = config.waveAmplitude;
  document.getElementById("waveSpeed").value = config.waveSpeed;
  document.getElementById("waveLength").value = config.waveLength;
  document.getElementById("sunHeartbeatEnabled").checked =
    config.sunHeartbeat.enabled;
  document.getElementById("sunHeartbeatsPerDay").value =
    config.sunHeartbeat.beatsPerDay;
  document.getElementById("planetHeartbeatEnabled").checked =
    config.planetHeartbeat.enabled;
  document.getElementById("planetHeartbeatsPerDay").value =
    config.planetHeartbeat.beatsPerDay;
  document.getElementById("gravityEnabled").checked = config.gravityEnabled;

  // Update all value displays
  updateAllValueDisplays();
}

function updateAllValueDisplays() {
  updateValueDisplay(
    "planetOrbitRadius",
    dots.planet.radius / (config.radius / config.rings)
  );
  const planetVelocity = MILLISECONDS_PER_DAY / dots.planet.period;
  updateValueDisplay("planetPeriod", planetVelocity.toFixed(3), "×");
  updateValueDisplay("moonOrbitRadius", dots.moon.orbitRadius, "px");
  updateValueDisplay(
    "moonPeriod",
    MILLISECONDS_PER_DAY / dots.moon.period,
    "/day"
  );
  updateValueDisplay(
    "radarRotation",
    (config.radarRotation * 180) / Math.PI,
    "°"
  );
  updateValueDisplay("gravityStrength", config.gravityStrength);
  updateValueDisplay(
    "moonSizeMultiplier",
    config.GOLDEN_RATIO * config.moonSizeMultiplier,
    "×"
  );
  updateValueDisplay(
    "transitionDuration",
    config.transitionDuration * 100,
    "%"
  );
  updateValueDisplay("waveAmplitude", config.waveAmplitude, "px");
  updateValueDisplay("waveSpeed", config.waveSpeed, "×");
  updateValueDisplay("waveLength", config.waveLength, "×");
  updateValueDisplay(
    "sunHeartbeatsPerDay",
    config.sunHeartbeat.beatsPerDay.toFixed(1),
    "/day"
  );
  updateValueDisplay(
    "planetHeartbeatsPerDay",
    config.planetHeartbeat.beatsPerDay.toFixed(1),
    "/day"
  );
}

// Initialize with new default values
function initializeAllValueDisplays() {
  updateValueDisplay("planetPeriod", config.GOLDEN_RATIO, "×");
  updateValueDisplay("moonPeriod", 2.0, "/day");
  updateValueDisplay("sunHeartbeatsPerDay", 1.0, "/day");
  updateValueDisplay("planetHeartbeatsPerDay", 1.0, "/day");
  // ... rest of initializations ...
}

// Add after initializeControls function
function initializeParticles() {
  config.planetParticles.particles = [];
  for (let i = 0; i < config.planetParticles.amount; i++) {
    config.planetParticles.particles.push({
      progress: Math.random(), // Random initial progress (0-1)
      offset: Math.random() * Math.PI * 2, // Random angle offset
    });
  }
}

// Add after initializeParticles function
function initializeSunParticles() {
  config.sunParticles.particles = [];
  for (let i = 0; i < config.sunParticles.amount; i++) {
    config.sunParticles.particles.push({
      progress: Math.random(), // Random initial progress (0-1)
      offset: Math.random() * Math.PI * 2, // Random angle offset
    });
  }
}

// Add after initializeSunParticles function
function initializePlanetRadioWaves() {
  config.planetRadioWaves.waves = [];
  const maxRadius = config.radius; // Use radar radius instead of canvas diagonal
  const numWaves = Math.ceil(maxRadius / config.planetRadioWaves.spacing);

  for (let i = 0; i < numWaves; i++) {
    config.planetRadioWaves.waves.push({
      radius: i * config.planetRadioWaves.spacing,
      opacity: 1,
    });
  }
}

function initializeSunRadioWaves() {
  config.sunRadioWaves.waves = [];
  const maxRadius = config.radius; // Use radar radius instead of canvas diagonal
  const numWaves = Math.ceil(maxRadius / config.sunRadioWaves.spacing);

  for (let i = 0; i < numWaves; i++) {
    config.sunRadioWaves.waves.push({
      radius: i * config.sunRadioWaves.spacing,
      opacity: 1,
    });
  }
}

function addSunspot(x, y, entryAngle) {
  const angleVariation = ((Math.random() - 0.5) * Math.PI) / 4;
  const speed = 2 + Math.random() * 2 * config.sunspots.energy;
  const spotMass = config.sunspots.size; // Base mass from size

  config.sunspots.totalMass += spotMass;
  const massScale = Math.log2(config.sunspots.totalMass) / 10; // Logarithmic scaling

  config.sunspots.spots.push({
    x: x,
    y: y,
    vx: Math.cos(entryAngle + angleVariation) * speed,
    vy: Math.sin(entryAngle + angleVariation) * speed,
    mass: spotMass,
    effectiveSize: config.sunspots.size * (1 + massScale),
  });
}

// Mode System
const MODE_TEMPLATE = {
  config: {
    // Visual settings
    backgroundColor: null,
    gridColor: null,
    textColor: null,
    dotColors: [], // [sunColor, planetColor, moonColor]
    activeMoonColor: null,
    syncLineColor: null,
    secondWaveColor: null,
    lineThickness: null,
    fontSize: null,
    fontFamily: null,

    // Core mechanics
    radarRotation: null,
    gravityEnabled: null,
    gravityStrength: null,
    alignmentDays: null, // Set
    brainstreamDays: null, // Set
    transitionDuration: null,
    transitionCurve: null,
    moonSizeMultiplier: null,

    // Wave settings
    waveAmplitude: null,
    waveSpeed: null,
    waveLength: null,

    // Heartbeat settings
    sunHeartbeat: {
      enabled: null,
      beatsPerDay: null,
    },
    planetHeartbeat: {
      enabled: null,
      beatsPerDay: null,
    },

    // Wave effects
    planetWave: {
      amplitude: null,
      speed: null,
      wavelength: null,
      thickness: null,
    },
    sunWave: {
      amplitude: null,
      speed: null,
      wavelength: null,
      thickness: null,
    },

    // Second moon settings
    secondMoon: {
      enabled: null,
      color: null,
      activeColor: null,
    },

    // Particle effects
    planetParticles: {
      enabled: null,
      color: null,
      size: null,
      amount: null,
      speed: null,
      opacity: null,
      dispersion: null,
      dayTiming: null,
      alignmentSync: null,
    },
    sunParticles: {
      enabled: null,
      color: null,
      size: null,
      amount: null,
      speed: null,
      opacity: null,
      dispersion: null,
      dayTiming: null,
      alignmentSync: null,
    },

    // Radio waves
    planetRadioWaves: {
      enabled: null,
      color: null,
      speed: null,
      spacing: null,
      thickness: null,
      arc: null,
      range: null,
      opacity: null,
      dayTiming: null,
      alignmentSync: null,
    },
    sunRadioWaves: {
      enabled: null,
      color: null,
      speed: null,
      spacing: null,
      thickness: null,
      arc: null,
      range: null,
      opacity: null,
      dayTiming: null,
      alignmentSync: null,
    },

    // Sunspot settings
    sunspots: {
      enabled: null,
      size: null,
      baseSize: null,
      attraction: null,
      energy: null,
      color: null,
      spotsPerDay: null,
    },
  },

  dots: {
    sun: {
      size: null,
      baseSize: null,
    },
    planet: {
      radius: null,
      size: null,
      baseSize: null,
      period: null,
      direction: null,
    },
    moon: {
      orbitRadius: null,
      startingAngle: null,
      size: null,
      period: null,
      direction: null,
    },
    secondMoon: {
      orbitRadius: null,
      startingAngle: null,
      size: null,
      period: null,
      direction: null,
    },
  },
};

const modeSystem = {
  modes: new Map(),
  nextModeLabel: "C",
  currentMode: null,
  modeTemplates: new Map(), // Store templates for each mode

  initialize() {
    console.log("Initializing mode system...");
    // Initialize mode buttons container
    this.modeButtonsContainer = document.querySelector(".mode-buttons");

    // Add event listeners for mode controls
    document.getElementById("saveModeA").addEventListener("click", () => {
      console.log("Save Mode A clicked");
      this.saveMode("A");
    });
    document.getElementById("saveModeB").addEventListener("click", () => {
      console.log("Save Mode B clicked");
      this.saveMode("B");
    });
    document
      .getElementById("addNewMode")
      .addEventListener("click", () => this.addNewMode());

    // Create initial radio buttons for modes A and B
    this.createModeRadio("A");
    this.createModeRadio("B");
    console.log("Mode system initialized");
  },

  createModeRadio(label) {
    const existingRadio = document.getElementById(`mode${label}Container`);
    if (existingRadio) return; // Don't create if it already exists

    const radioContainer = document.createElement("label");
    radioContainer.className = "mode-radio";
    radioContainer.id = `mode${label}Container`;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "mode";
    input.value = label;
    input.id = `mode${label}`;

    const text = document.createTextNode(`Mode ${label}`);

    radioContainer.appendChild(input);
    radioContainer.appendChild(text);

    input.addEventListener("change", () => this.setMode(label));
    this.modeButtonsContainer.appendChild(radioContainer);
  },

  deepCloneConfig() {
    // Create a deep clone of the config object
    const configClone = {};

    // Clone each property carefully
    for (const [key, value] of Object.entries(config)) {
      if (value instanceof Set) {
        configClone[key] = new Set(value);
      } else if (Array.isArray(value)) {
        configClone[key] = [...value];
      } else if (typeof value === "object" && value !== null) {
        // Deep clone nested objects
        configClone[key] = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (Array.isArray(nestedValue)) {
            configClone[key][nestedKey] = [...nestedValue];
          } else if (typeof nestedValue === "object" && nestedValue !== null) {
            configClone[key][nestedKey] = { ...nestedValue };
          } else {
            configClone[key][nestedKey] = nestedValue;
          }
        }
      } else {
        configClone[key] = value;
      }
    }

    // Ensure all UI-related properties are included
    const uiProperties = [
      "backgroundColor",
      "gridColor",
      "textColor",
      "dotColors",
      "activeMoonColor",
      "syncLineColor",
      "secondWaveColor",
      "lineThickness",
      "fontSize",
      "fontFamily",
      "radarRotation",
      "gravityEnabled",
      "gravityStrength",
      "transitionDuration",
      "transitionCurve",
      "moonSizeMultiplier",
      "waveAmplitude",
      "waveSpeed",
      "waveLength",
      "sunHeartbeat",
      "planetHeartbeat",
      "planetWave",
      "sunWave",
      "secondMoon",
      "planetParticles",
      "sunParticles",
      "planetRadioWaves",
      "sunRadioWaves",
      "sunspots",
    ];

    // Ensure each property exists in the clone
    uiProperties.forEach((prop) => {
      if (!(prop in configClone)) {
        configClone[prop] = config[prop];
      }
    });

    return configClone;
  },

  deepCloneDots() {
    // Create a deep clone of the dots object with all properties
    return {
      sun: {
        x: dots.sun.x,
        y: dots.sun.y,
        size: dots.sun.size,
        baseSize: dots.sun.baseSize,
      },
      planet: {
        radius: dots.planet.radius,
        angle: dots.planet.angle,
        size: dots.planet.size,
        baseSize: dots.planet.baseSize,
        x: dots.planet.x,
        y: dots.planet.y,
        period: dots.planet.period,
        direction: dots.planet.direction,
      },
      moon: {
        orbitRadius: dots.moon.orbitRadius,
        startingAngle: dots.moon.startingAngle,
        angle: dots.moon.angle,
        size: dots.moon.size,
        x: dots.moon.x,
        y: dots.moon.y,
        period: dots.moon.period,
        direction: dots.moon.direction,
      },
      secondMoon: {
        orbitRadius: dots.secondMoon.orbitRadius,
        startingAngle: dots.secondMoon.startingAngle,
        angle: dots.secondMoon.angle,
        size: dots.secondMoon.size,
        x: dots.secondMoon.x,
        y: dots.secondMoon.y,
        period: dots.secondMoon.period,
        direction: dots.secondMoon.direction,
      },
    };
  },

  createModeTemplate() {
    const template = JSON.parse(JSON.stringify(MODE_TEMPLATE));

    // Fill template with current values
    for (const [key, value] of Object.entries(config)) {
      if (key in template.config) {
        if (value instanceof Set) {
          template.config[key] = new Set(value);
        } else if (Array.isArray(value)) {
          template.config[key] = [...value];
        } else if (typeof value === "object" && value !== null) {
          template.config[key] = JSON.parse(JSON.stringify(value));
        } else {
          template.config[key] = value;
        }
      }
    }

    // Fill dots template
    for (const [dotKey, dotValue] of Object.entries(dots)) {
      if (dotKey in template.dots) {
        template.dots[dotKey] = JSON.parse(JSON.stringify(dotValue));
      }
    }

    return template;
  },

  saveMode(label) {
    console.log(`Saving mode ${label}...`);

    // Create and store template
    const template = this.createModeTemplate();
    this.modeTemplates.set(label, template);

    console.log("Template saved for mode", label, template);

    // Create mode data from template
    const modeData = JSON.parse(JSON.stringify(template));

    // Handle special cases (Sets)
    modeData.config.alignmentDays = new Set(Array.from(config.alignmentDays));
    modeData.config.brainstreamDays = new Set(
      Array.from(config.brainstreamDays)
    );

    // Save the mode
    this.modes.set(label, modeData);

    // Create radio button if needed
    if (!document.getElementById(`mode${label}`)) {
      this.createModeRadio(label);
    }

    // Select the saved mode
    this.setMode(label);
  },

  addNewMode() {
    const newLabel = this.nextModeLabel;
    this.saveMode(newLabel);

    // Update next mode label (A -> B -> C -> D, etc.)
    this.nextModeLabel = String.fromCharCode(
      this.nextModeLabel.charCodeAt(0) + 1
    );
  },

  setMode(label) {
    console.log(`Setting mode ${label}...`);

    const modeData = this.modes.get(label);
    if (!modeData) {
      console.error(`Mode ${label} not found!`);
      return;
    }

    // Get the template for this mode
    const template = this.modeTemplates.get(label);
    console.log("Loading template for mode", label, template);

    // Update radio buttons
    document.querySelectorAll(".mode-radio").forEach((radio) => {
      radio.classList.remove("active");
      if (radio.querySelector(`#mode${label}`)) {
        radio.classList.add("active");
      }
    });

    // Select the radio button
    const radio = document.getElementById(`mode${label}`);
    if (radio) radio.checked = true;

    // Apply configuration from template
    Object.assign(config, JSON.parse(JSON.stringify(modeData.config)));

    // Handle special cases (Sets)
    config.alignmentDays = new Set(Array.from(modeData.config.alignmentDays));
    config.brainstreamDays = new Set(
      Array.from(modeData.config.brainstreamDays)
    );

    // Apply dots configuration
    Object.assign(dots.sun, modeData.dots.sun);
    Object.assign(dots.planet, modeData.dots.planet);
    Object.assign(dots.moon, modeData.dots.moon);
    Object.assign(dots.secondMoon, modeData.dots.secondMoon);

    // Update positions
    updateDotPositions();

    // Reinitialize effects
    if (config.planetParticles.enabled) initializeParticles();
    if (config.sunParticles.enabled) initializeSunParticles();
    if (config.planetRadioWaves.enabled) initializePlanetRadioWaves();
    if (config.sunRadioWaves.enabled) initializeSunRadioWaves();

    // Update UI
    updateUIFromConfig();

    this.currentMode = label;
    console.log(`Mode ${label} set successfully`);
  },
};

// Initialize mode system after all other initializations
modeSystem.initialize();

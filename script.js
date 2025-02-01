const canvas = document.getElementById("radarCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size with higher resolution for retina displays
canvas.width = 1000;
canvas.height = 1000;

// Configuration
const config = {
  centerX: canvas.width / 2,
  centerY: canvas.height / 2,
  radius: 400,
  backgroundColor: "#f3ffe6",
  gridColor: "#cce0cc",
  textColor: "#cce0cc",
  dotColors: ["#ffb347", "#2b4d59", "#a5a5a5"], // sun, planet, moon colors
  activeMoonColor: "#ff6b35",
  syncLineColor: "#ff6b35", // New property for sync line color
  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  rings: 4,
  radarRotation: 0, // New property for radar rotation
  gravityEnabled: false, // Add this line to set gravity off by default
  gravityStrength: 0.5,
  alignmentDays: new Set([1, 4]), // Tuesday and Friday by default
  transitionDuration: 0.2, // Duration of transition in days
  maxGravityEffect: 120, // New property for maximum gravity strength
  moonSizeMultiplier: 1,
  GOLDEN_RATIO: 1.618,
  transitionCurve: "easeInOut",
  waveAmplitude: 5,
  waveSpeed: 3,
  waveLength: 2, // New property for wavelength
  // Add heartbeat configuration
  sunHeartbeat: {
    enabled: true,
    beatsPerDay: 1.0,
  },
  planetHeartbeat: {
    enabled: true,
    beatsPerDay: 1.0,
  },
  isPlaying: false, // Add animation state
  startTime: Date.now(), // Add reference time for animations
  pauseTime: 0, // Add pause time tracking
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
  secondWaveColor: "#2b4d59", // Add new color property
};

// Update the MILLISECONDS_PER_DAY constant to represent one day (1/6 of the radar)
const MILLISECONDS_PER_DAY = 1000; // 1 second represents one day for smooth animation

// Calculate the radius for the third ring
const thirdRingRadius = (config.radius / config.rings) * 3;

// Calculate starting angles for alignment
const MONDAY_START = -Math.PI / 2;
const DEGREES_PER_DAY = (Math.PI * 2) / 6;

// Dot objects (celestial bodies)
const dots = {
  sun: { x: config.centerX, y: config.centerY, size: 16 },
  planet: {
    radius: thirdRingRadius,
    angle: MONDAY_START,
    size: 12,
    x: 0,
    y: 0,
    period: MILLISECONDS_PER_DAY, // One rotation per day
    direction: 1,
  },
  moon: {
    orbitRadius: 40,
    startingAngle: 0,
    angle: 0,
    size: 8,
    x: 0,
    y: 0,
    period: MILLISECONDS_PER_DAY / 2, // Two rotations per day
    direction: 1,
  },
};

// Communication lines state
const communicationLines = Array(6).fill(false);

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
    const velocityMultiplier = Math.pow(config.GOLDEN_RATIO, step - 1); // Subtract 1 so first step is 1x
    dots.planet.period = MILLISECONDS_PER_DAY / velocityMultiplier;
    updateValueDisplay("planetPeriod", velocityMultiplier.toFixed(3), "×");
  });

  document.getElementById("planetDirection").addEventListener("change", (e) => {
    dots.planet.direction = parseInt(e.target.value);
  });

  // Moon controls
  document.getElementById("moonOrbitRadius").addEventListener("input", (e) => {
    dots.moon.orbitRadius = parseInt(e.target.value);
    updateValueDisplay("moonOrbitRadius", e.target.value, "px");
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

  // Initialize all value displays
  updateValueDisplay("planetOrbitRadius", 3.0);
  updateValueDisplay("planetPeriod", 1.0, "/day");
  updateValueDisplay("moonOrbitRadius", 40, "px");
  updateValueDisplay("moonPeriod", 2.0, "/day");
  updateValueDisplay("radarRotation", 0, "°");
  updateValueDisplay("gravityStrength", 0.5);
  updateValueDisplay("moonSizeMultiplier", config.GOLDEN_RATIO, "×");
  updateValueDisplay("transitionDuration", 20, "%");
  updateValueDisplay("waveAmplitude", 5, "px");
  updateValueDisplay("waveSpeed", 3, "×");
  updateValueDisplay("waveLength", 2.0, "×");

  // Initialize accordion
  initializeAccordion();
}

function drawBackground() {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  ctx.strokeStyle = config.gridColor;
  ctx.lineWidth = 1;

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

  // Draw day labels
  ctx.font = "20px Arial";
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

function updateDotPositions() {
  const currentTime = config.isPlaying
    ? Date.now() - config.startTime
    : config.pauseTime;

  // Calculate planet angle
  const planetAngle = config.isPlaying
    ? MONDAY_START +
      ((currentTime % (MILLISECONDS_PER_DAY * 6)) /
        (MILLISECONDS_PER_DAY * 6)) *
        (Math.PI * 2) *
        dots.planet.direction
    : dots.planet.angle;

  // Calculate moon angle continuously across all days
  const moonTimeProgress = config.isPlaying
    ? (currentTime % (MILLISECONDS_PER_DAY * 6)) / dots.moon.period
    : dots.moon.angle / (Math.PI * 2);

  const moonAngle = config.isPlaying
    ? dots.moon.startingAngle +
      moonTimeProgress * (Math.PI * 2) * dots.moon.direction
    : dots.moon.angle;

  // Calculate current day segment time (keep this for other calculations)
  const daySegment = Math.floor(
    (currentTime % (MILLISECONDS_PER_DAY * 6)) / MILLISECONDS_PER_DAY
  );
  const dayProgress =
    (currentTime % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_DAY;

  // Update planet position
  dots.planet.x = config.centerX + Math.cos(planetAngle) * dots.planet.radius;
  dots.planet.y = config.centerY + Math.sin(planetAngle) * dots.planet.radius;
  dots.planet.angle = planetAngle;

  // Calculate moon position relative to planet
  let moonX = Math.cos(moonAngle) * dots.moon.orbitRadius;
  let moonY = Math.sin(moonAngle) * dots.moon.orbitRadius;

  // Calculate transition state for gravity effect
  const planetAngleNorm = (planetAngle - MONDAY_START) % (Math.PI * 2);
  const dayNumber = Math.floor(planetAngleNorm / DEGREES_PER_DAY);

  const transitionState = calculateTransitionState(dayProgress, dayNumber);

  if (transitionState.smoothFactor > 0 && config.gravityEnabled) {
    // Calculate vector from moon to sun
    const moonToSun = {
      x: config.centerX - (dots.planet.x + moonX),
      y: config.centerY - (dots.planet.y + moonY),
    };

    // Calculate distance for inverse square law
    const distance = Math.sqrt(
      moonToSun.x * moonToSun.x + moonToSun.y * moonToSun.y
    );

    // Enhanced gravity effect with inverse square law
    const baseGravityStrength =
      config.gravityStrength * config.maxGravityEffect;
    const gravityEffect =
      (baseGravityStrength / (distance * 0.05)) * transitionState.smoothFactor;

    // Create figure-8 effect
    const moonRelativeAngle = Math.atan2(moonY, moonX);
    const figurePullFactor = Math.sin(2 * moonRelativeAngle);

    // Apply gravitational pull
    const normalizedVector = {
      x: moonToSun.x / distance,
      y: moonToSun.y / distance,
    };

    const tangentialVector = {
      x: -normalizedVector.y,
      y: normalizedVector.x,
    };

    moonX +=
      (normalizedVector.x * gravityEffect +
        tangentialVector.x * gravityEffect * figurePullFactor) *
      2;
    moonY +=
      (normalizedVector.y * gravityEffect +
        tangentialVector.y * gravityEffect * figurePullFactor) *
      2;
  }

  // Add the planet's position to get the final moon position
  dots.moon.x = dots.planet.x + moonX;
  dots.moon.y = dots.planet.y + moonY;
  dots.moon.angle = moonAngle;
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

  // Use planet's position in the sun's orbit to determine the day progress
  const planetAngleNorm = (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
  const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;

  // Calculate beat progress based on the planet's position in the current day segment
  const beatProgress = (dayProgress * beatsPerDay) % 1;

  // Simulate the cardiac cycle phases
  // Each phase is given a portion of the complete cycle
  const phase = beatProgress * Math.PI * 2;

  // 1. Atrial Contraction (quick rise) - 15% of cycle
  // 2. Isovolumetric Contraction (sharp peak) - 5% of cycle
  // 3. Ventricular Ejection (plateau with slight decline) - 30% of cycle
  // 4. Isovolumetric Relaxation (sharp drop) - 5% of cycle
  // 5. Ventricular Filling (gradual rise) - 25% of cycle
  // 6. Atrial Relaxation (baseline) - 20% of cycle

  let scale = 1.0; // Base scale
  const cyclePosition = phase / (Math.PI * 2);

  if (cyclePosition < 0.15) {
    // Atrial Contraction
    const t = cyclePosition / 0.15;
    scale += 0.2 * Math.pow(t, 2);
  } else if (cyclePosition < 0.2) {
    // Isovolumetric Contraction
    const t = (cyclePosition - 0.15) / 0.05;
    scale += 0.2 + 0.1 * Math.sin(t * Math.PI);
  } else if (cyclePosition < 0.5) {
    // Ventricular Ejection
    const t = (cyclePosition - 0.2) / 0.3;
    scale += 0.3 * Math.pow(1 - t, 0.5);
  } else if (cyclePosition < 0.55) {
    // Isovolumetric Relaxation
    const t = (cyclePosition - 0.5) / 0.05;
    scale += 0.2 * (1 - Math.pow(t, 0.5));
  } else if (cyclePosition < 0.8) {
    // Ventricular Filling
    const t = (cyclePosition - 0.55) / 0.25;
    scale += 0.1 * Math.pow(t, 2);
  } // else Atrial Relaxation (baseline)

  return scale;
}

function drawDots() {
  // Calculate planet's position in orbit for day tracking
  const planetAngleNorm = (dots.planet.angle - MONDAY_START) % (Math.PI * 2);
  const dayNumber = Math.floor(planetAngleNorm / DEGREES_PER_DAY);
  const dayProgress = (planetAngleNorm % DEGREES_PER_DAY) / DEGREES_PER_DAY;

  const transitionState = calculateTransitionState(dayProgress, dayNumber);

  // Draw wavy alignment beams first
  if (transitionState.smoothFactor > 0.01) {
    const sunPhase =
      (Date.now() / (1000 / config.sunWave.speed)) % (Math.PI * 2);
    const moonPhase = sunPhase + Math.PI; // Offset by 180 degrees for DNA-like effect
    const opacity = Math.floor(transitionState.smoothFactor * 128);
    const opacityHex = opacity.toString(16).padStart(2, "0");

    // Draw both waves between sun and moon
    // First wave
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

    // Second wave with different color
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
  }

  // Now draw the celestial bodies on top
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

  // Draw moon with interpolated size and color
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

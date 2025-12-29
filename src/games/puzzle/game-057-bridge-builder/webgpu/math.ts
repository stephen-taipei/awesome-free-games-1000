/**
 * Math Utilities - Bridge Builder
 * Industrial Engineering / Civil Construction Theme
 * Game #057
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Beam stress visualization
export function stressGradient(stress: number): { r: number; g: number; b: number } {
  if (stress < 0.3) {
    return { r: 0.2, g: 0.6, b: 0.2 }; // Green - safe
  } else if (stress < 0.6) {
    return { r: 0.9, g: 0.6, b: 0.1 }; // Yellow/Orange - caution
  } else {
    return { r: 0.9, g: 0.2, b: 0.1 }; // Red - danger
  }
}

// Steel beam flex
export function beamFlex(length: number, load: number, time: number): number {
  const sag = load * length * 0.0001;
  const vibration = Math.sin(time * 10) * 0.001 * load;
  return sag + vibration;
}

// Rivet spark
export function rivetSpark(angle: number, time: number): { x: number; y: number; intensity: number } {
  const spread = Math.random() * 0.5;
  return {
    x: Math.cos(angle + spread) * (0.5 + Math.random() * 0.5),
    y: Math.sin(angle + spread) * (0.5 + Math.random() * 0.5),
    intensity: Math.random() * 0.5 + 0.5
  };
}

// Weld glow
export function weldGlow(distance: number, time: number): number {
  const flicker = Math.sin(time * 50) * 0.2 + 0.8;
  const glow = Math.exp(-distance * 5) * flicker;
  return glow;
}

// Structural strain wave
export function strainWave(position: number, time: number, stressPoint: number): number {
  const wave = Math.sin((position - stressPoint) * 10 - time * 5);
  const decay = Math.exp(-Math.abs(position - stressPoint) * 3);
  return wave * decay;
}

// Construction dust cloud
export function dustCloud(x: number, y: number, time: number, seed: number): { dx: number; dy: number; alpha: number } {
  const phase = seed * Math.PI * 2;
  return {
    dx: Math.sin(time + phase) * 0.02,
    dy: -0.03 - Math.random() * 0.02,
    alpha: (1 - time) * 0.5 * (Math.sin(phase + time * 3) * 0.3 + 0.7)
  };
}

// Bolt tightening torque
export function boltTorque(progress: number): number {
  // Resistance increases exponentially
  return 1 - Math.exp(-progress * 3);
}

// Safety cable sway
export function cableSway(position: number, time: number, tension: number): number {
  const frequency = 2 + tension * 3;
  return Math.sin(position * 5 + time * frequency) * (1 - tension) * 0.1;
}

// Metal fatigue cracks pattern
export function fatigueCrack(t: number, stress: number): { x: number; y: number } {
  const jitter = Math.sin(t * 100) * 0.1 * stress;
  return {
    x: t + jitter,
    y: Math.sin(t * 20) * 0.1 * stress
  };
}

// Hydraulic press motion
export function hydraulicPress(progress: number, resistance: number): number {
  const motion = smoothstep(0, 1, progress);
  const strain = Math.sin(progress * 20) * resistance * 0.05;
  return motion + strain;
}

// I-beam cross section shadow
export function iBeamShadow(x: number): number {
  // Top and bottom flanges
  if (Math.abs(x) > 0.4) return 0.3;
  // Web
  if (Math.abs(x) < 0.1) return 0.2;
  return 0.5;
}

// Load distribution
export function loadDistribution(position: number, loadPoint: number, beamLength: number): number {
  const dist = Math.abs(position - loadPoint);
  return Math.max(0, 1 - dist / (beamLength * 0.5));
}

// Wind gust effect on suspended structure
export function windGust(time: number, height: number): number {
  const base = Math.sin(time * 0.5) * 0.02;
  const gust = Math.sin(time * 2 + height * 0.01) * 0.01;
  return base + gust;
}

// Construction crane motion
export function craneSwing(time: number, load: number): number {
  const swing = Math.sin(time * 1.5) * (0.1 + load * 0.05);
  const damping = Math.exp(-time * 0.1);
  return swing * damping;
}

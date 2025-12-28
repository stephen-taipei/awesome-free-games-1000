/**
 * Math Utilities - Block Fit
 * Architect's Blueprint / Construction Site Theme
 * Game #054
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

// Blueprint line pattern
export function blueprintLine(position: number, time: number): number {
  const line = Math.sin(position * 20) * 0.5 + 0.5;
  const fade = Math.sin(time * 0.5) * 0.1 + 0.9;
  return line * fade;
}

// Grid alignment snap effect
export function gridSnap(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Construction dust drift
export function dustDrift(time: number, seed: number): { x: number; y: number } {
  const angle = seed * Math.PI * 2;
  const drift = Math.sin(time * 2 + seed * 10) * 0.2;
  return {
    x: Math.cos(angle) * drift,
    y: Math.sin(angle) * drift + 0.001
  };
}

// Placement impact effect
export function placementImpact(distance: number, time: number): number {
  const ring = Math.sin(distance * 30 - time * 10) * 0.5 + 0.5;
  const decay = Math.exp(-distance * 5);
  return ring * decay;
}

// Rotation spiral pattern
export function rotationSpiral(angle: number, time: number): number {
  const spiral = Math.sin(angle * 4 + time * 5);
  return (spiral * 0.5 + 0.5) * Math.exp(-time * 2);
}

// Drafting pen stroke
export function penStroke(t: number): number {
  const pressure = Math.sin(t * Math.PI);
  const wobble = Math.sin(t * 50) * 0.02;
  return pressure + wobble;
}

// Measurement tick marks
export function measurementTick(position: number, interval: number): number {
  const tick = Math.abs(((position % interval) / interval) - 0.5) * 2;
  return smoothstep(0.9, 1.0, tick);
}

// Compass needle wobble
export function compassWobble(time: number): number {
  const base = Math.sin(time * 2) * 0.05;
  const settle = Math.exp(-time * 0.5) * Math.sin(time * 8) * 0.1;
  return base + settle;
}

// Safety barrier stripe pattern
export function safetyStripe(position: number, time: number): number {
  const stripe = Math.sin((position + time * 0.1) * 10) > 0 ? 1 : 0;
  return stripe;
}

// Block weight drop effect
export function blockDrop(progress: number): number {
  // Bounce easing
  const t = 1 - progress;
  if (t < 1 / 2.75) {
    return 1 - 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 1 - (7.5625 * t2 * t2 + 0.75);
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 1 - (7.5625 * t2 * t2 + 0.9375);
  } else {
    const t2 = t - 2.625 / 2.75;
    return 1 - (7.5625 * t2 * t2 + 0.984375);
  }
}

// Grid alignment indicator
export function alignmentPulse(distance: number, time: number): number {
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;
  const glow = Math.exp(-distance * 10);
  return glow * pulse;
}

// Construction light flicker
export function constructionLight(time: number, seed: number): number {
  const base = 0.8;
  const flicker = Math.sin(time * 30 + seed) > 0.95 ? 0.2 : 0;
  const pulse = Math.sin(time * 2 + seed) * 0.1;
  return base + flicker + pulse;
}

// Blueprint fade reveal
export function blueprintReveal(y: number, time: number): number {
  const reveal = smoothstep(time * 0.5, time * 0.5 + 0.2, y);
  return reveal;
}

/**
 * Math Utilities - Island Connect
 * Tropical Ocean / Island Paradise Theme
 * Game #109
 */

// Wave motion using Gerstner wave approximation
export function gerstnerWave(x: number, t: number, amplitude: number, frequency: number, phase: number): number {
  return amplitude * Math.sin(frequency * x + t + phase) * Math.cos(frequency * x * 0.5 + t * 0.7);
}

// Ocean swell pattern
export function oceanSwell(x: number, y: number, t: number): number {
  const wave1 = Math.sin(x * 0.05 + t) * 0.5;
  const wave2 = Math.sin(y * 0.03 + t * 1.3) * 0.3;
  const wave3 = Math.sin((x + y) * 0.04 + t * 0.8) * 0.2;
  return wave1 + wave2 + wave3;
}

// Island shape using superellipse
export function islandShape(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = Math.abs(x - cx) / rx;
  const dy = Math.abs(y - cy) / ry;
  return Math.pow(dx, 2.5) + Math.pow(dy, 2.5);
}

// Palm tree sway
export function palmSway(t: number, height: number): number {
  const baseFreq = 1.5;
  const gustFreq = 0.3;
  const baseSway = Math.sin(t * baseFreq) * 3;
  const gustSway = Math.sin(t * gustFreq) * Math.sin(t * 0.7) * 5;
  return (baseSway + gustSway) * (height / 100);
}

// Bridge catenary curve
export function catenaryBridge(x: number, a: number, span: number): number {
  const normalized = (x / span - 0.5) * 2;
  return a * (Math.cosh(normalized) - 1);
}

// Tropical cloud formation
export function cloudFormation(x: number, y: number, t: number, seed: number): number {
  const cloudX = Math.sin(x * 0.02 + seed) * Math.cos(y * 0.015 + t * 0.1);
  const cloudY = Math.sin(y * 0.018 + seed * 2) * Math.cos(x * 0.012 + t * 0.15);
  return (cloudX + cloudY + 2) * 0.25;
}

// Sand ripple pattern
export function sandRipple(x: number, y: number, t: number): number {
  const ripple1 = Math.sin(x * 0.3 + t * 0.2) * 0.5;
  const ripple2 = Math.sin(y * 0.25 - t * 0.15) * 0.3;
  return (ripple1 + ripple2 + 1) * 0.5;
}

// Water caustics
export function waterCaustics(x: number, y: number, t: number): number {
  const c1 = Math.sin(x * 0.1 + t) * Math.cos(y * 0.08 + t * 1.2);
  const c2 = Math.sin((x + y) * 0.07 + t * 0.9) * Math.cos((x - y) * 0.06 + t);
  return Math.abs(c1 + c2) * 0.5;
}

// Splash radius expansion
export function splashRadius(t: number, maxRadius: number, duration: number): number {
  const progress = Math.min(t / duration, 1);
  return maxRadius * Math.sin(progress * Math.PI * 0.5);
}

// Tropical sun rays
export function sunRay(angle: number, t: number, rayCount: number): number {
  const rayAngle = (angle * rayCount) % (Math.PI * 2);
  const intensity = (Math.sin(rayAngle) + 1) * 0.5;
  const pulse = Math.sin(t * 2 + rayAngle) * 0.1 + 0.9;
  return intensity * pulse;
}

// Foam pattern at shoreline
export function shorelineFoam(distance: number, t: number): number {
  const foam = Math.sin(distance * 10 + t * 3) * 0.5 + 0.5;
  const fade = Math.exp(-distance * 5);
  return foam * fade;
}

// Bridge connection glow
export function bridgeGlow(progress: number, t: number): number {
  const base = Math.sin(progress * Math.PI);
  const pulse = Math.sin(t * 4 + progress * 6) * 0.2 + 0.8;
  return base * pulse;
}

// Seabird flight path
export function seabirdPath(t: number, amplitude: number): { x: number; y: number } {
  const x = t;
  const y = amplitude * Math.sin(t * 2) * Math.cos(t * 0.5);
  return { x, y };
}

// Tropical water color gradient
export function tropicalWaterColor(depth: number): { r: number; g: number; b: number } {
  // Shallow (turquoise) to deep (ocean blue)
  const shallow = { r: 0.25, g: 0.88, b: 0.82 }; // Turquoise
  const deep = { r: 0.13, g: 0.59, b: 0.95 };    // Ocean blue

  const t = Math.min(depth, 1);
  return {
    r: shallow.r + (deep.r - shallow.r) * t,
    g: shallow.g + (deep.g - shallow.g) * t,
    b: shallow.b + (deep.b - shallow.b) * t,
  };
}

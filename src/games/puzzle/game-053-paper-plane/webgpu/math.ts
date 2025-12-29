/**
 * Math Utilities - Paper Plane Puzzle
 * Origami Workshop / Japanese Zen Garden Theme
 * Game #053
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

// Sakura petal fall pattern - gentle swaying motion
export function sakuraFall(time: number, seed: number): { x: number; y: number } {
  const sway = Math.sin(time * 2 + seed * 10) * 0.3;
  const drift = Math.cos(time * 1.5 + seed * 7) * 0.1;
  return {
    x: sway + drift,
    y: 0.02 + Math.sin(time + seed) * 0.005
  };
}

// Paper fold crease animation
export function foldCrease(progress: number): number {
  // Sharp at the start, settling down
  const sharp = Math.pow(1 - progress, 3);
  const settle = Math.sin(progress * Math.PI) * 0.5;
  return sharp + settle;
}

// Wind flow pattern for breeze effect
export function windFlow(x: number, y: number, time: number): { vx: number; vy: number } {
  const baseWind = Math.sin(time * 0.5) * 0.5 + 0.5;
  const turbulence = Math.sin(x * 10 + time * 2) * Math.cos(y * 8 + time * 1.5);
  return {
    vx: baseWind * 0.02 + turbulence * 0.005,
    vy: turbulence * 0.003
  };
}

// Zen ripple pattern - for water or calm effects
export function zenRipple(distance: number, time: number): number {
  const wave = Math.sin(distance * 15 - time * 2) * 0.5 + 0.5;
  const decay = Math.exp(-distance * 3);
  return wave * decay;
}

// Bamboo sway animation
export function bambooSway(time: number, height: number): number {
  const base = Math.sin(time * 0.8) * 0.1;
  const tip = Math.sin(time * 1.2 + height * 2) * 0.15;
  return base + tip * height;
}

// Washi paper texture pattern
export function washiTexture(x: number, y: number): number {
  const fiber1 = Math.sin(x * 50 + y * 30) * 0.5;
  const fiber2 = Math.cos(x * 40 - y * 45) * 0.3;
  const fiber3 = Math.sin((x + y) * 60) * 0.2;
  return (fiber1 + fiber2 + fiber3) * 0.5 + 0.5;
}

// Ink brush stroke effect
export function inkBrush(t: number): number {
  // Pressure variation like calligraphy
  const pressure = Math.sin(t * Math.PI) * 0.5 + 0.5;
  const wobble = Math.sin(t * 30) * 0.05;
  return pressure + wobble;
}

// Petal rotation animation
export function petalRotation(time: number, seed: number): number {
  const spin = time * (1 + seed * 0.5);
  const wobble = Math.sin(time * 3 + seed) * 0.3;
  return spin + wobble;
}

// Stone garden wave pattern
export function stoneGardenWave(x: number, y: number, cx: number, cy: number): number {
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return Math.sin(dist * 20) * Math.exp(-dist * 2);
}

// Lantern glow pulse
export function lanternGlow(time: number): number {
  const base = 0.7;
  const pulse = Math.sin(time * 2) * 0.1;
  const flicker = Math.random() > 0.95 ? 0.1 : 0;
  return base + pulse + flicker;
}

// Paper texture grain
export function paperGrain(x: number, y: number, seed: number): number {
  const hash = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (hash - Math.floor(hash)) * 0.1;
}

// Fold line highlight
export function foldHighlight(progress: number, time: number): number {
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;
  const glow = Math.pow(Math.sin(progress * Math.PI), 2);
  return glow * pulse;
}

// Spring breeze pattern
export function springBreeze(time: number): number {
  const gentle = Math.sin(time * 0.3) * 0.5 + 0.5;
  const gust = Math.pow(Math.sin(time * 0.7), 4) * 0.3;
  return gentle + gust;
}

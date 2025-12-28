/**
 * WebGPU Math Utilities - Candy Factory
 * Sweet Factory / Industrial Production Line Theme
 * Game #075
 */

/**
 * Conveyor belt movement pattern
 */
export function conveyorFlow(x: number, time: number, speed: number = 1): number {
  return (x + time * speed) % 1.0;
}

/**
 * Gear rotation
 */
export function gearRotation(time: number, speed: number = 1): number {
  return (time * speed) % (Math.PI * 2);
}

/**
 * Steam puff effect
 */
export function steamPuff(y: number, time: number): number {
  const rise = Math.sin(time * 3 + y * 0.5) * 0.5 + 0.5;
  return rise * Math.exp(-y * 0.1);
}

/**
 * Candy bounce physics
 */
export function candyBounce(time: number, frequency: number = 2): number {
  const bounce = Math.abs(Math.sin(time * frequency * Math.PI));
  return Math.pow(bounce, 0.5) * 0.2;
}

/**
 * Sweet sparkle pattern
 */
export function sweetSparkle(x: number, y: number, time: number): number {
  const sparkle1 = Math.sin(x * 10 + time * 3) * Math.sin(y * 10 - time * 2);
  const sparkle2 = Math.cos(x * 8 - time * 4) * Math.cos(y * 8 + time * 3);
  return (sparkle1 + sparkle2) * 0.5 + 0.5;
}

/**
 * Factory pulse - machinery rhythm
 */
export function factoryPulse(time: number, bpm: number = 60): number {
  const beat = time * (bpm / 60);
  return Math.pow(Math.sin(beat * Math.PI) * 0.5 + 0.5, 2);
}

/**
 * Candy color lookup
 */
export function getCandyColor(
  colorIndex: number
): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.91, g: 0.30, b: 0.24 },  // Red
    { r: 0.20, g: 0.60, b: 0.86 },  // Blue
    { r: 0.18, g: 0.80, b: 0.44 },  // Green
    { r: 0.95, g: 0.77, b: 0.06 },  // Yellow
  ];
  return colors[colorIndex % colors.length];
}

/**
 * Industrial color palette
 */
export function getIndustrialColor(
  intensity: number
): { r: number; g: number; b: number } {
  return {
    r: 0.17 * intensity + 0.1,
    g: 0.24 * intensity + 0.12,
    b: 0.31 * intensity + 0.15,
  };
}

/**
 * Warm factory lighting
 */
export function warmLight(
  x: number,
  y: number,
  time: number
): { r: number; g: number; b: number } {
  const flicker = Math.sin(time * 20) * 0.05 + 0.95;
  const distance = Math.sqrt(x * x + y * y);
  const falloff = Math.exp(-distance * 0.01);

  return {
    r: 1.0 * falloff * flicker,
    g: 0.85 * falloff * flicker,
    b: 0.6 * falloff * flicker,
  };
}

/**
 * Conveyor stripe pattern
 */
export function conveyorStripe(
  position: number,
  time: number,
  direction: number = 1
): number {
  const stripe = Math.sin((position + time * direction) * 10);
  return stripe > 0.7 ? 1 : 0;
}

/**
 * Sugar particle drift
 */
export function sugarDrift(
  time: number,
  seed: number
): { x: number; y: number } {
  const angle = Math.sin(time * 0.5 + seed) * 0.3;
  return {
    x: Math.sin(angle + seed) * 0.5,
    y: -1 + Math.sin(time * 2 + seed) * 0.2,
  };
}

/**
 * Machine shake
 */
export function machineShake(time: number, intensity: number = 1): { x: number; y: number } {
  return {
    x: Math.sin(time * 30) * intensity * 0.5,
    y: Math.cos(time * 35) * intensity * 0.3,
  };
}

/**
 * Random in range
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Lerp
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

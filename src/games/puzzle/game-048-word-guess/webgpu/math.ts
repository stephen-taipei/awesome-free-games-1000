/**
 * Math Utilities - Word Guess
 * Secret Agent / Spy Decoder Theme
 * Game #048
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Convert letter to index (0-25)
export function letterIndex(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0);
  return clamp(code - 65, 0, 25);
}

// Scramble effect - character morph progress
export function scrambleProgress(t: number, speed: number = 1): number {
  return clamp(t * speed, 0, 1);
}

// Radar sweep angle
export function radarAngle(time: number, speed: number = 1): number {
  return (time * speed) % (Math.PI * 2);
}

// Encryption shimmer - glitch-like effect
export function encryptionFlicker(t: number, frequency: number = 10): number {
  const base = Math.sin(t * frequency) * 0.5 + 0.5;
  const noise = Math.sin(t * frequency * 3.7) * 0.3;
  return clamp(base + noise, 0, 1);
}

// Matrix rain speed variation
export function rainSpeed(column: number, seed: number): number {
  return 0.5 + Math.sin(column * 0.7 + seed) * 0.3 + Math.random() * 0.2;
}

// Scanline intensity
export function scanlineIntensity(y: number, time: number): number {
  const scanY = (time * 0.5) % 1;
  const dist = Math.abs(y - scanY);
  return Math.exp(-dist * 20);
}

// Ease out quad for reveal animations
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// Pulse effect for submit
export function submitPulse(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI) * Math.exp(-t * 2);
}

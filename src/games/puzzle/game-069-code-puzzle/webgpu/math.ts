/**
 * Math Utilities - Code Puzzle
 * Matrix / Cyberpunk / Hacker Theme
 * Game #069
 */

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Matrix rain drop position
export function matrixRainDrop(startY: number, speed: number, time: number): number {
  const cycle = (startY + time * speed) % 1.2;
  return cycle - 0.1;
}

// Data stream pulse
export function dataStreamPulse(x: number, time: number, frequency: number = 2): number {
  return Math.sin(x * 10 + time * frequency) * 0.5 + 0.5;
}

// Binary flicker
export function binaryFlicker(time: number, seed: number): boolean {
  const t = time * 5 + seed * 100;
  return Math.sin(t) > 0.3 || Math.cos(t * 1.7) > 0.6;
}

// Circuit trace path
export function circuitPath(progress: number, segments: number = 4): { x: number; y: number; direction: number } {
  const segmentLength = 1 / segments;
  const currentSegment = Math.floor(progress / segmentLength);
  const segmentProgress = (progress % segmentLength) / segmentLength;

  // Alternating horizontal and vertical
  const isHorizontal = currentSegment % 2 === 0;
  const direction = isHorizontal ? 0 : Math.PI / 2;

  return {
    x: isHorizontal ? segmentProgress : currentSegment * 0.2,
    y: isHorizontal ? currentSegment * 0.2 : segmentProgress,
    direction,
  };
}

// Decrypt progress animation
export function decryptProgress(time: number, totalLength: number): number {
  const progress = time * 0.5; // Speed of decryption
  return Math.min(progress, totalLength);
}

// Glitch offset
export function glitchOffset(time: number, intensity: number = 1): { x: number; y: number } {
  const glitchActive = Math.random() < 0.1 * intensity;
  if (glitchActive) {
    return {
      x: (Math.random() - 0.5) * 10 * intensity,
      y: (Math.random() - 0.5) * 5 * intensity,
    };
  }
  return { x: 0, y: 0 };
}

// Scan line position
export function scanLine(time: number, height: number): number {
  return (time * 0.3 % 1) * height;
}

// Neon glow pulse
export function neonPulse(time: number, baseIntensity: number = 0.8): number {
  const pulse = Math.sin(time * 3) * 0.2 + baseIntensity;
  return clamp(pulse, 0, 1);
}

// Terminal cursor blink
export function cursorBlink(time: number): boolean {
  return Math.floor(time * 2) % 2 === 0;
}

// Hex code generation
export function generateHexDigit(seed: number, time: number): string {
  const chars = '0123456789ABCDEF';
  const index = Math.floor((seed * 16 + time * 10) % 16);
  return chars[Math.abs(index)];
}

// Data packet trajectory
export function dataPacket(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  progress: number
): { x: number; y: number } {
  // Step-like movement (like data through circuits)
  const halfProgress = 0.5;
  if (progress < halfProgress) {
    const t = progress / halfProgress;
    return {
      x: startX + (endX - startX) * t,
      y: startY,
    };
  } else {
    const t = (progress - halfProgress) / halfProgress;
    return {
      x: endX,
      y: startY + (endY - startY) * t,
    };
  }
}

// Code character reveal
export function characterReveal(index: number, time: number, delay: number = 0.05): boolean {
  return time > index * delay;
}

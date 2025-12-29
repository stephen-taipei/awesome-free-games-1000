/**
 * WebGPU Math Utilities - Yin Yang Balance
 * Cosmic Duality / Balance Energy Theme
 * Game #074
 */

/**
 * Yin Yang spiral pattern
 */
export function yinYangSpiral(x: number, y: number, time: number, radius: number = 1): number {
  const angle = Math.atan2(y, x) + time * 0.5;
  const dist = Math.sqrt(x * x + y * y);
  const spiral = Math.sin(angle * 2 + dist * 0.1 - time);
  return (spiral + 1) * 0.5 * Math.exp(-dist / radius);
}

/**
 * Balance wave - oscillates around center
 */
export function balanceWave(value: number, time: number, frequency: number = 1): number {
  return Math.sin(value * frequency + time) * Math.cos(time * 0.5);
}

/**
 * Dual energy flow - represents yin and yang energy flowing
 */
export function dualEnergyFlow(x: number, y: number, time: number, phase: number = 0): number {
  const angle = Math.atan2(y, x);
  const flow = Math.sin(angle * 4 + time + phase) * 0.5 + 0.5;
  return flow;
}

/**
 * Harmony pulse - pulses when balance is achieved
 */
export function harmonyPulse(time: number, intensity: number = 1): number {
  const pulse = Math.pow(Math.sin(time * 3) * 0.5 + 0.5, 2);
  return pulse * intensity;
}

/**
 * Cosmic drift - slow drifting motion
 */
export function cosmicDrift(x: number, y: number, time: number): { dx: number; dy: number } {
  const angle = time * 0.3;
  const drift = Math.sin(time * 0.5) * 0.5;
  return {
    dx: Math.cos(angle + x * 0.01) * drift,
    dy: Math.sin(angle + y * 0.01) * drift,
  };
}

/**
 * Duality gradient - transitions between yin and yang colors
 */
export function dualityGradient(
  t: number,
  time: number
): { r: number; g: number; b: number } {
  // Yin: dark purple/black, Yang: bright white/gold
  const phase = Math.sin(time * 0.5) * 0.5 + 0.5;
  const blend = t * (1 - phase * 0.3);

  if (blend < 0.5) {
    // Yin side - dark purple to black
    const f = blend * 2;
    return {
      r: 0.1 * (1 - f) + 0.02 * f,
      g: 0.1 * (1 - f) + 0.02 * f,
      b: 0.15 * (1 - f) + 0.08 * f,
    };
  } else {
    // Yang side - white to gold
    const f = (blend - 0.5) * 2;
    return {
      r: 0.9 * (1 - f) + 1.0 * f,
      g: 0.9 * (1 - f) + 0.85 * f,
      b: 0.9 * (1 - f) + 0.4 * f,
    };
  }
}

/**
 * Scale tilt oscillation
 */
export function scaleTilt(imbalance: number, time: number): number {
  const damping = Math.exp(-time * 0.5);
  const oscillation = Math.sin(time * 5) * damping;
  return imbalance + oscillation * 0.1;
}

/**
 * Energy orbit - particles orbiting around a point
 */
export function energyOrbit(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
  time: number
): { x: number; y: number } {
  const wobble = Math.sin(time * 3) * 0.1;
  const r = radius * (1 + wobble);
  return {
    x: centerX + Math.cos(angle + time) * r,
    y: centerY + Math.sin(angle + time) * r,
  };
}

/**
 * Chi flow - energy flowing in a pattern
 */
export function chiFlow(distance: number, time: number, speed: number = 1): number {
  const wave = Math.sin(distance * 0.05 - time * speed);
  return (wave + 1) * 0.5 * Math.exp(-distance * 0.01);
}

/**
 * Yin color (dark)
 */
export function getYinColor(intensity: number = 1): { r: number; g: number; b: number } {
  return {
    r: 0.1 * intensity,
    g: 0.1 * intensity,
    b: 0.18 * intensity,
  };
}

/**
 * Yang color (light)
 */
export function getYangColor(intensity: number = 1): { r: number; g: number; b: number } {
  return {
    r: 0.96 * intensity,
    g: 0.96 * intensity,
    b: 0.88 * intensity,
  };
}

/**
 * Balance color (golden/purple)
 */
export function getBalanceColor(balanced: boolean, time: number): { r: number; g: number; b: number } {
  if (balanced) {
    const pulse = Math.sin(time * 2) * 0.2 + 0.8;
    return {
      r: 0.95 * pulse,
      g: 0.77 * pulse,
      b: 0.25 * pulse,
    };
  }
  return {
    r: 0.9,
    g: 0.35,
    b: 0.28,
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

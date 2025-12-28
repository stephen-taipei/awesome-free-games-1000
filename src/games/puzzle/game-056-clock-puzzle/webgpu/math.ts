/**
 * Math Utilities - Clock Puzzle
 * Elegant Clock Tower / Victorian Timekeeper Theme
 * Game #056
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

// Clock pendulum motion
export function pendulumSwing(time: number, period: number = 2): number {
  return Math.sin(time * Math.PI * 2 / period) * 0.3;
}

// Gear rotation with teeth
export function gearTeeth(angle: number, teeth: number): number {
  const tooth = Math.sin(angle * teeth) * 0.5 + 0.5;
  return smoothstep(0.3, 0.7, tooth);
}

// Clock tick motion (discrete steps)
export function clockTick(time: number, ticksPerSecond: number = 1): number {
  return Math.floor(time * ticksPerSecond) / ticksPerSecond;
}

// Escapement mechanism pulse
export function escapementPulse(time: number): number {
  const cycle = time % 1;
  if (cycle < 0.1) {
    return smoothstep(0, 0.1, cycle);
  } else if (cycle < 0.15) {
    return 1 - smoothstep(0.1, 0.15, cycle);
  }
  return 0;
}

// Spring unwinding spiral
export function springSpiral(t: number, coils: number): { x: number; y: number } {
  const angle = t * Math.PI * 2 * coils;
  const radius = 0.5 - t * 0.4;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

// Bell chime decay
export function bellDecay(time: number, strikeTime: number): number {
  const elapsed = time - strikeTime;
  if (elapsed < 0) return 0;
  return Math.exp(-elapsed * 2) * Math.sin(elapsed * 30);
}

// Polished brass shimmer
export function brassShimmer(x: number, y: number, time: number): number {
  const wave = Math.sin(x * 10 + time) * Math.sin(y * 10 + time * 1.3);
  return smoothstep(0.5, 1.0, wave) * 0.3;
}

// Roman numeral pattern (for decorative purposes)
export function romanPattern(position: number): number {
  const marks = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  for (const mark of marks) {
    if (Math.abs(position - mark) < 3) {
      return 1;
    }
  }
  return 0;
}

// Clockwork dust motes
export function dustMote(time: number, seed: number): { x: number; y: number; alpha: number } {
  const phase = seed * Math.PI * 2;
  return {
    x: Math.sin(time * 0.5 + phase) * 0.3,
    y: Math.cos(time * 0.3 + phase * 1.5) * 0.2 - time * 0.1,
    alpha: Math.sin(time + seed * 10) * 0.3 + 0.5
  };
}

// Hand rotation easing (slight overshoot)
export function handRotation(progress: number): number {
  if (progress < 0.8) {
    return smoothstep(0, 0.8, progress) * 1.05;
  } else {
    return 1.05 - smoothstep(0.8, 1.0, progress) * 0.05;
  }
}

// Clock face glow (center brightest)
export function faceGlow(distance: number): number {
  return 1 - smoothstep(0, 0.6, distance);
}

// Victorian filigree pattern
export function filigreeCurve(t: number): { x: number; y: number } {
  const scale = 0.3;
  const twist = 3;
  return {
    x: Math.cos(t * twist) * scale * (1 + Math.sin(t * 2) * 0.3),
    y: Math.sin(t * twist) * scale * (1 + Math.cos(t * 3) * 0.3)
  };
}

// Time ripple effect (when time changes)
export function timeRipple(distance: number, time: number, eventTime: number): number {
  const elapsed = time - eventTime;
  if (elapsed < 0 || elapsed > 1) return 0;
  const wave = distance - elapsed * 0.5;
  if (Math.abs(wave) > 0.05) return 0;
  return (1 - elapsed) * smoothstep(0.05, 0, Math.abs(wave));
}

// Grandfather clock chime pattern
export function chimePattern(time: number, hour: number): number {
  const chimeTime = hour % 12;
  const cycle = time % (chimeTime + 1);
  if (cycle < 0.2) {
    return smoothstep(0, 0.1, cycle) * smoothstep(0.2, 0.1, cycle);
  }
  return 0;
}

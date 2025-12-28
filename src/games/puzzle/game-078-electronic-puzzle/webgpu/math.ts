/**
 * WebGPU Math Utilities - Electronic Puzzle
 * Cyberpunk / Circuit Board Theme
 * Game #078
 */

export function electronFlow(x: number, y: number, time: number): number {
  return Math.sin(x * 0.2 + time * 5) * Math.cos(y * 0.2 - time * 3) * 0.5 + 0.5;
}

export function currentPulse(t: number, frequency: number = 1): number {
  return (Math.sin(t * frequency * Math.PI * 2) * 0.5 + 0.5) * Math.exp(-((t % 1) * 2));
}

export function sparkIntensity(time: number, offset: number = 0): number {
  const t = (time + offset) % 1;
  return t < 0.1 ? 1 - t * 10 : 0;
}

export function circuitGlow(powered: boolean, time: number): number {
  if (!powered) return 0.2;
  return 0.6 + Math.sin(time * 3) * 0.4;
}

export function waveform(x: number, time: number, frequency: number = 1): number {
  return Math.sin(x * frequency - time * 4) * 0.5 + 0.5;
}

export function gridPulse(x: number, y: number, time: number): number {
  const wave = Math.sin(x * 0.5 + time * 2) + Math.sin(y * 0.5 + time * 2);
  return (wave * 0.25 + 0.5) * 0.3;
}

export function signalNoise(x: number, y: number, time: number): number {
  return Math.sin(x * 10 + time * 20) * Math.sin(y * 10 - time * 15) * 0.5 + 0.5;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getComponentColor(type: string, powered: boolean): { r: number; g: number; b: number } {
  if (powered) {
    switch (type) {
      case "battery": return { r: 0.0, g: 1.0, b: 0.5 };
      case "led": return { r: 1.0, g: 1.0, b: 0.0 };
      case "wire": return { r: 0.0, g: 1.0, b: 0.5 };
      case "corner": return { r: 0.0, g: 0.9, b: 0.6 };
      case "tee": return { r: 0.0, g: 0.8, b: 0.7 };
      case "cross": return { r: 0.0, g: 0.7, b: 0.8 };
      default: return { r: 0.0, g: 1.0, b: 0.5 };
    }
  }
  return { r: 0.2, g: 0.2, b: 0.3 };
}

export function getCyberpunkColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.0, g: 1.0, b: 0.5 },   // Neon green
    { r: 0.0, g: 0.8, b: 1.0 },   // Cyan
    { r: 1.0, g: 0.0, b: 0.5 },   // Magenta
    { r: 1.0, g: 0.8, b: 0.0 },   // Yellow
    { r: 0.5, g: 0.0, b: 1.0 },   // Purple
  ];
  return colors[index % colors.length];
}

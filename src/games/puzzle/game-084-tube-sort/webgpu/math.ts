/**
 * WebGPU Math Utilities - Tube Sort
 * Laboratory / Chemistry / Test Tube Theme
 * Game #084
 */

export function liquidFlow(y: number, time: number, speed: number): number {
  return y + Math.sin(time * speed + y * 0.1) * 2;
}

export function bubbleFloat(x: number, y: number, time: number): { x: number; y: number } {
  const wobble = Math.sin(time * 3 + x * 0.1) * 3;
  return {
    x: x + wobble,
    y: y - time * 20,
  };
}

export function chemicalReaction(time: number, intensity: number): number {
  return Math.sin(time * 5) * Math.cos(time * 3) * intensity;
}

export function vapourRise(y: number, time: number): number {
  return y - Math.abs(Math.sin(time * 2)) * 1.5;
}

export function liquidSurface(x: number, time: number, amplitude: number): number {
  return Math.sin(x * 0.1 + time * 2) * amplitude;
}

export function dropletArc(t: number, startY: number, endY: number, height: number): number {
  const arc = 4 * height * t * (1 - t);
  const linear = startY + (endY - startY) * t;
  return linear - arc;
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

export function getLabColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.91, g: 0.30, b: 0.24 }, // Red reagent
    { r: 0.20, g: 0.60, b: 0.86 }, // Blue solution
    { r: 0.18, g: 0.80, b: 0.44 }, // Green chemical
    { r: 0.95, g: 0.77, b: 0.06 }, // Yellow acid
    { r: 0.61, g: 0.35, b: 0.71 }, // Purple compound
    { r: 0.90, g: 0.49, b: 0.13 }, // Orange mixture
    { r: 0.10, g: 0.74, b: 0.61 }, // Teal liquid
    { r: 0.91, g: 0.12, b: 0.39 }, // Pink solution
  ];
  return colors[index % colors.length];
}

export function getGlassColor(): { r: number; g: number; b: number } {
  return { r: 0.9, g: 0.95, b: 1.0 };
}

export function getVapourColor(baseColor: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  return {
    r: baseColor.r * 0.8 + 0.2,
    g: baseColor.g * 0.8 + 0.2,
    b: baseColor.b * 0.8 + 0.2,
  };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}

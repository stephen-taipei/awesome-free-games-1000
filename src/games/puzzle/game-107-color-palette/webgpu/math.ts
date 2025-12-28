/**
 * WebGPU Math Utilities - Color Palette
 * Artist Studio / Creative Theme
 * Game #107
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Paint drip motion
export function paintDrip(time: number, speed: number = 1): number {
  return Math.sin(time * speed) * 0.5 + 0.5;
}

// Brush stroke curve
export function brushCurve(t: number, amplitude: number = 10): number {
  const wave = Math.sin(t * Math.PI * 4) * amplitude;
  const pressure = Math.sin(t * Math.PI) * 0.5 + 0.5;
  return wave * pressure;
}

// Color wheel rotation
export function colorWheelAngle(time: number, sections: number = 6): number {
  return (time * 0.5) % (Math.PI * 2);
}

// Palette knife spread
export function paletteSpread(x: number, center: number, width: number): number {
  const dist = Math.abs(x - center);
  return Math.max(0, 1 - dist / width);
}

// Pigment blend factor
export function pigmentBlend(a: number, b: number, ratio: number): number {
  // Subtractive color mixing approximation
  return Math.pow(Math.pow(a, 1 / ratio) * Math.pow(b, ratio), 1);
}

// Canvas texture noise
export function canvasTexture(x: number, y: number): number {
  const noise1 = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.3;
  const noise2 = Math.sin(x * 0.2 + 1) * Math.cos(y * 0.3) * 0.2;
  return 0.9 + noise1 + noise2;
}

// Splatter pattern
export function splatterRadius(angle: number, irregularity: number = 0.3): number {
  const base = 1.0;
  const noise = Math.sin(angle * 7) * 0.3 + Math.sin(angle * 13) * 0.2;
  return base + noise * irregularity;
}

// Watercolor edge diffusion
export function watercolorEdge(dist: number, time: number): number {
  const spread = 1 + Math.sin(time * 2) * 0.1;
  return Math.exp(-dist * dist * spread);
}

// Oil paint thickness
export function oilThickness(pressure: number, time: number): number {
  const base = pressure * 2;
  const shimmer = Math.sin(time * 3) * 0.1;
  return base + shimmer;
}

// Color temperature shift
export function colorTemperature(hue: number, warmth: number): number {
  // Shift hue towards warm (orange) or cool (blue)
  const shift = warmth * 0.1;
  return (hue + shift + 1) % 1;
}

// Easel wobble
export function easelWobble(time: number): number {
  return Math.sin(time * 1.5) * 0.005;
}

// Paint tube squeeze
export function tubeSqueeze(time: number, duration: number): number {
  const t = clamp(time / duration, 0, 1);
  return Math.sin(t * Math.PI) * (1 - t);
}

// Spectrum rainbow
export function spectrumHue(position: number, time: number): number {
  return (position + time * 0.1) % 1;
}

// HSL to RGB conversion
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

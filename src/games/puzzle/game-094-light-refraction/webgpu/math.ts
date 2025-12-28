/**
 * WebGPU Math Utilities - Light Refraction
 * Light / Prism / Rainbow / Spectral Theme
 * Game #094
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

// Light beam intensity
export function beamIntensity(distance: number, spread: number = 1): number {
  return Math.exp(-distance * distance * spread);
}

// Prism refraction angle calculation
export function refractionAngle(incidentAngle: number, n1: number = 1, n2: number = 1.5): number {
  const sinI = Math.sin(incidentAngle);
  const sinR = (n1 / n2) * sinI;
  return Math.asin(clamp(sinR, -1, 1));
}

// Rainbow spectrum based on wavelength/position
export function spectrumColor(t: number): [number, number, number] {
  // t from 0 to 1 maps through rainbow
  const hue = t * 300; // 0 (red) to 300 (violet)
  return hslToRgb(hue / 360, 1, 0.5);
}

// HSL to RGB conversion
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

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

// Named rainbow colors
export function getRainbowColor(index: number): [number, number, number] {
  const colors: [number, number, number][] = [
    [1.0, 0.42, 0.42],  // #ff6b6b - Red
    [0.99, 0.89, 0.34], // #feca57 - Orange/Yellow
    [0.28, 0.86, 0.98], // #48dbfb - Cyan
    [1.0, 0.62, 0.95],  // #ff9ff3 - Pink
    [0.33, 0.63, 1.0],  // #54a0ff - Blue
  ];
  return colors[index % colors.length];
}

// Light glow effect
export function glowFalloff(distance: number, radius: number): number {
  const d = distance / radius;
  return Math.max(0, 1 - d * d);
}

// Prismatic dispersion effect
export function dispersion(wavelength: number, angle: number): number {
  // Different wavelengths refract at slightly different angles
  const disperseFactor = 0.05;
  return angle + (wavelength - 0.5) * disperseFactor;
}

// Sparkle pattern
export function sparkle(x: number, y: number, time: number): number {
  const n1 = Math.sin(x * 20 + time * 3) * Math.cos(y * 20 - time * 2);
  const n2 = Math.sin(x * 30 - y * 25 + time * 5) * 0.5;
  return clamp((n1 + n2) * 0.5 + 0.5, 0, 1);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Math Utilities - Stained Glass
 * Cathedral / Light Through Glass Theme
 * Game #143
 */

export const GLASS_COLORS = {
  deepViolet: [0.10, 0.08, 0.18, 1.0] as const,
  royalPurple: [0.61, 0.35, 0.71, 1.0] as const,
  amethyst: [0.58, 0.27, 0.68, 1.0] as const,
  sapphire: [0.20, 0.40, 0.85, 1.0] as const,
  ruby: [0.85, 0.25, 0.25, 1.0] as const,
  emerald: [0.18, 0.80, 0.44, 1.0] as const,
  amber: [0.95, 0.75, 0.15, 1.0] as const,
  opal: [0.95, 0.95, 0.95, 0.8] as const,
  lightBeam: [1.0, 0.98, 0.90, 0.9] as const,
  prismRainbow: [1.0, 0.90, 0.95, 1.0] as const,
  dustGold: [1.0, 0.95, 0.70, 0.6] as const,
  leadGray: [0.25, 0.28, 0.32, 1.0] as const,
} as const;

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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function vec2Normalize(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

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

export function getRainbowColor(t: number): readonly [number, number, number, number] {
  const [r, g, b] = hslToRgb(t, 0.8, 0.6);
  return [r, g, b, 1.0] as const;
}

export function getGlassColor(index: number): readonly [number, number, number, number] {
  const colors = [
    GLASS_COLORS.ruby,
    GLASS_COLORS.sapphire,
    GLASS_COLORS.amber,
    GLASS_COLORS.emerald,
    GLASS_COLORS.amethyst,
  ];
  return colors[index % colors.length];
}

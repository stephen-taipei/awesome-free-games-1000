/**
 * WebGPU Math Utilities - Combination Lock
 * Vault / Safe-Cracking / Heist Night Theme
 * Game #100
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

export function dialRotation(angle: number, speed: number, time: number): number {
  return angle + Math.sin(time * speed) * 0.1;
}

export function gearMesh(angle: number, teeth: number): number {
  const toothAngle = (Math.PI * 2) / teeth;
  const normalized = ((angle % toothAngle) + toothAngle) % toothAngle;
  return normalized < toothAngle * 0.5 ? 1 : 0.7;
}

export function vaultShine(x: number, y: number, time: number): number {
  const sweep = Math.sin(time * 0.5) * 0.5 + 0.5;
  const dist = Math.abs(x - sweep);
  return Math.exp(-dist * 10) * 0.3;
}

export function securityLaser(y: number, time: number, index: number): number {
  const phase = time * 2 + index * 1.5;
  const pos = Math.sin(phase) * 0.3 + 0.5;
  const dist = Math.abs(y - pos);
  return dist < 0.01 ? 1 : 0;
}

export function spotlightCone(x: number, y: number, cx: number, cy: number, angle: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pointAngle = Math.atan2(dy, dx);
  const angleDiff = Math.abs(pointAngle - angle);
  const coneWidth = 0.3;

  if (angleDiff < coneWidth && dist < 0.5) {
    return (1 - dist / 0.5) * (1 - angleDiff / coneWidth);
  }
  return 0;
}

export function colorToVec4(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1];
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

// Vault theme colors
export const VAULT_COLORS = {
  steel: '#4a5568',
  gold: '#d69e2e',
  goldBright: '#ecc94b',
  correct: '#48bb78',
  wrongPosition: '#ed8936',
  wrong: '#f56565',
  laser: '#e53e3e',
  spotlight: '#faf089',
  dark: '#1a202c',
  chrome: '#a0aec0'
};

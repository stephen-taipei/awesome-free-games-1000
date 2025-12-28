/**
 * WebGPU Math Utilities - 3D Maze
 * Sci-Fi Corridor / Cyberpunk Dungeon Theme
 * Game #079
 */

export function corridorPulse(depth: number, time: number): number {
  return Math.sin(depth * 0.5 - time * 3) * 0.5 + 0.5;
}

export function fogDensity(depth: number, maxDepth: number): number {
  return Math.min(1, depth / maxDepth);
}

export function portalGlow(dist: number, time: number): number {
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;
  return Math.exp(-dist * 0.3) * pulse;
}

export function wallFlicker(x: number, y: number, time: number): number {
  const flicker = Math.sin(x * 10 + time * 20) * Math.cos(y * 10 - time * 15);
  return flicker > 0.95 ? 1 : 0;
}

export function neonPulse(time: number, frequency: number = 1): number {
  return (Math.sin(time * frequency * Math.PI * 2) * 0.3 + 0.7);
}

export function scanlineEffect(y: number, time: number): number {
  return Math.sin(y * 50 + time * 5) * 0.1 + 0.9;
}

export function depthFog(depth: number, maxDepth: number, intensity: number = 1): number {
  return Math.exp(-depth / maxDepth * intensity * 2);
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

export function getWallColor(depth: number, isExit: boolean): { r: number; g: number; b: number } {
  if (isExit) {
    const intensity = 0.5 + (1 - Math.min(1, depth / 10)) * 0.5;
    return { r: 0, g: intensity, b: intensity * 0.3 };
  }
  const shade = 1 - Math.min(1, depth / 15);
  return {
    r: 0.15 + shade * 0.15,
    g: 0.15 + shade * 0.2,
    b: 0.3 + shade * 0.4,
  };
}

export function getCyberpunkColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.0, g: 1.0, b: 1.0 },   // Cyan
    { r: 1.0, g: 0.0, b: 1.0 },   // Magenta
    { r: 0.0, g: 1.0, b: 0.5 },   // Green
    { r: 1.0, g: 0.5, b: 0.0 },   // Orange
    { r: 0.5, g: 0.0, b: 1.0 },   // Purple
  ];
  return colors[index % colors.length];
}

/**
 * Math Utilities - 3D Puzzle
 * Holographic / Geometric / Futuristic Theme
 * Game #070
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Holographic shimmer effect
export function hologramShimmer(time: number, offset: number = 0): number {
  const wave1 = Math.sin(time * 3 + offset) * 0.5;
  const wave2 = Math.sin(time * 7 + offset * 2) * 0.3;
  const wave3 = Math.sin(time * 11 + offset * 0.5) * 0.2;
  return (wave1 + wave2 + wave3 + 1) * 0.5;
}

// Grid pulse animation
export function gridPulse(time: number, x: number, y: number): number {
  const dist = Math.sqrt(x * x + y * y);
  return Math.sin(dist * 0.1 - time * 2) * 0.5 + 0.5;
}

// Wireframe flicker
export function wireframeFlicker(time: number): number {
  const flicker = Math.sin(time * 20) > 0.8 ? 0.3 : 1;
  return flicker * (Math.sin(time * 5) * 0.2 + 0.8);
}

// Cube rotation animation
export function cubeRotation(time: number, axis: 'x' | 'y' | 'z'): number {
  const speeds = { x: 0.7, y: 1.0, z: 0.5 };
  return (time * speeds[axis]) % (Math.PI * 2);
}

// Prism refraction color
export function prismColor(angle: number): { r: number; g: number; b: number } {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const phase = normalized / (Math.PI * 2);

  return {
    r: Math.sin(phase * Math.PI * 2) * 0.5 + 0.5,
    g: Math.sin(phase * Math.PI * 2 + Math.PI * 2 / 3) * 0.5 + 0.5,
    b: Math.sin(phase * Math.PI * 2 + Math.PI * 4 / 3) * 0.5 + 0.5,
  };
}

// Assembly snap animation
export function assemblySnap(progress: number): number {
  // Ease out elastic
  const c4 = (2 * Math.PI) / 3;
  if (progress === 0) return 0;
  if (progress === 1) return 1;
  return Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
}

// Geometric orbit position
export function orbitPosition(time: number, radius: number, speed: number, phase: number = 0): { x: number; y: number } {
  const angle = time * speed + phase;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

// Holographic interference pattern
export function interferencePattern(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.05 + time * 2);
  const wave2 = Math.sin(y * 0.05 - time * 1.5);
  const wave3 = Math.sin((x + y) * 0.03 + time);
  return (wave1 + wave2 + wave3) / 3;
}

// 3D depth fade
export function depthFade(z: number, maxDepth: number = 100): number {
  return clamp(1 - (z / maxDepth), 0.3, 1);
}

// Geometric shape vertices
export function getTriangleVertices(centerX: number, centerY: number, size: number, rotation: number): number[][] {
  const vertices = [];
  for (let i = 0; i < 3; i++) {
    const angle = rotation + (i * Math.PI * 2 / 3) - Math.PI / 2;
    vertices.push([
      centerX + Math.cos(angle) * size,
      centerY + Math.sin(angle) * size,
    ]);
  }
  return vertices;
}

export function getHexagonVertices(centerX: number, centerY: number, size: number, rotation: number): number[][] {
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = rotation + (i * Math.PI / 3);
    vertices.push([
      centerX + Math.cos(angle) * size,
      centerY + Math.sin(angle) * size,
    ]);
  }
  return vertices;
}

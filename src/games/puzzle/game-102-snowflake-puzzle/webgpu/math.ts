/**
 * Math Utilities - Snowflake Puzzle
 * Winter Wonderland / Frozen Crystal Theme
 * Game #102
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

export function snowflakeArm(angle: number, branches: number): number {
  const branchAngle = (Math.PI * 2) / branches;
  const normalizedAngle = ((angle % branchAngle) + branchAngle) % branchAngle;
  const halfBranch = branchAngle / 2;
  return Math.abs(normalizedAngle - halfBranch) / halfBranch;
}

export function frostPattern(x: number, y: number, time: number): number {
  const cx = x - 0.5;
  const cy = y - 0.5;
  const angle = Math.atan2(cy, cx);
  const dist = Math.sqrt(cx * cx + cy * cy);
  const branches = 6;
  const arm = snowflakeArm(angle, branches);
  const crystal = Math.sin(dist * 20 + time * 2) * 0.5 + 0.5;
  return arm * crystal * (1 - dist * 2);
}

export function iceRefraction(x: number, y: number, time: number): [number, number] {
  const offsetX = Math.sin(y * 10 + time) * 0.01;
  const offsetY = Math.cos(x * 10 + time) * 0.01;
  return [x + offsetX, y + offsetY];
}

export function auroraBorealis(y: number, time: number): number {
  const wave1 = Math.sin(y * 5 + time * 0.5) * 0.5 + 0.5;
  const wave2 = Math.sin(y * 8 + time * 0.7 + 1) * 0.3;
  const wave3 = Math.sin(y * 12 + time * 0.3 + 2) * 0.2;
  return clamp(wave1 + wave2 + wave3, 0, 1);
}

export function snowDrift(x: number, y: number, time: number, seed: number): number {
  const windX = Math.sin(time * 0.5 + seed) * 0.3;
  const windY = Math.cos(time * 0.3 + seed * 2) * 0.1;
  const drift = Math.sin((x + windX) * 10 + (y + windY) * 5 + time);
  return drift * 0.5 + 0.5;
}

export function crystalFacet(angle: number, facets: number): number {
  const facetAngle = (Math.PI * 2) / facets;
  const normalizedAngle = ((angle % facetAngle) + facetAngle) % facetAngle;
  const center = facetAngle / 2;
  return 1 - Math.abs(normalizedAngle - center) / center;
}

export function polarToCartesian(
  angle: number,
  radius: number,
  centerX: number,
  centerY: number
): [number, number] {
  return [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius
  ];
}

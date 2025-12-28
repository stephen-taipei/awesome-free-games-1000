/**
 * Math Utilities - Magic Circle
 * Arcane Mystical / Ancient Magic Theme
 * Game #062
 */

/**
 * Magic swirl pattern for energy flows
 */
export function magicSwirl(x: number, y: number, time: number, intensity: number = 1.0): number {
  const angle = Math.atan2(y, x);
  const dist = Math.sqrt(x * x + y * y);
  const swirl = Math.sin(angle * 3 + dist * 0.1 - time * 2) * intensity;
  return swirl * 0.5 + 0.5;
}

/**
 * Rune glow pulsation effect
 */
export function runeGlow(time: number, phase: number = 0, speed: number = 1.0): number {
  const base = Math.sin(time * speed + phase) * 0.3 + 0.7;
  const flicker = Math.sin(time * speed * 7 + phase) * 0.05;
  return Math.max(0, Math.min(1, base + flicker));
}

/**
 * Crystal shimmer for gem effects
 */
export function crystalShimmer(x: number, y: number, time: number): number {
  const facet1 = Math.sin(x * 10 + time * 3) * 0.5 + 0.5;
  const facet2 = Math.cos(y * 10 + time * 2) * 0.5 + 0.5;
  const sparkle = Math.sin((x + y) * 20 + time * 5) > 0.95 ? 1.0 : 0;
  return facet1 * facet2 * 0.6 + sparkle * 0.4;
}

/**
 * Arcane energy field
 */
export function arcaneEnergy(x: number, y: number, time: number): number {
  const dist = Math.sqrt(x * x + y * y);
  const wave1 = Math.sin(dist * 0.15 - time * 2) * 0.5 + 0.5;
  const wave2 = Math.sin(dist * 0.08 + time * 1.5) * 0.5 + 0.5;
  const angle = Math.atan2(y, x);
  const spiral = Math.sin(angle * 5 + dist * 0.05 - time) * 0.3 + 0.7;
  return wave1 * wave2 * spiral;
}

/**
 * Portal ripple effect
 */
export function portalRipple(x: number, y: number, time: number, centerX: number = 0, centerY: number = 0): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ripple = Math.sin(dist * 0.3 - time * 4) * 0.5 + 0.5;
  const fade = Math.exp(-dist * 0.02);
  return ripple * fade;
}

/**
 * Ring rotation interpolation
 */
export function ringRotation(current: number, target: number, speed: number = 0.15): number {
  const diff = target - current;
  return current + diff * speed;
}

/**
 * Mystical fog movement
 */
export function mysticalFog(x: number, y: number, time: number): number {
  const fog1 = Math.sin(x * 0.02 + time * 0.5) * Math.cos(y * 0.02 + time * 0.3);
  const fog2 = Math.sin((x + y) * 0.015 - time * 0.4);
  const fog3 = Math.cos(x * 0.01 - y * 0.01 + time * 0.2);
  return (fog1 + fog2 + fog3) / 3 * 0.5 + 0.5;
}

/**
 * Alignment check glow
 */
export function alignmentGlow(rotation: number, threshold: number = 5): number {
  const normalizedRot = ((rotation % 360) + 360) % 360;
  const distToAligned = Math.min(normalizedRot, 360 - normalizedRot);
  return 1 - Math.min(1, distToAligned / threshold);
}

/**
 * Particle arc trajectory for magical effects
 */
export function magicArc(t: number, startX: number, startY: number, endX: number, endY: number, height: number = 50): { x: number; y: number } {
  const x = startX + (endX - startX) * t;
  const y = startY + (endY - startY) * t - height * Math.sin(t * Math.PI);
  return { x, y };
}

/**
 * Constellation connection line
 */
export function constellationLine(t: number, length: number): number {
  const progress = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  return progress * length;
}

/**
 * Star burst pattern
 */
export function starBurst(angle: number, rays: number = 8, time: number = 0): number {
  const rayAngle = (Math.PI * 2) / rays;
  const normalizedAngle = ((angle % rayAngle) + rayAngle) % rayAngle;
  const centerDist = Math.abs(normalizedAngle - rayAngle / 2) / (rayAngle / 2);
  const pulse = Math.sin(time * 3) * 0.2 + 0.8;
  return (1 - centerDist) * pulse;
}

/**
 * Easing function for smooth animations
 */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Easing function for magic effects
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

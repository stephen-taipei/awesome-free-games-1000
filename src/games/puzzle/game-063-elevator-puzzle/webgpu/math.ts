/**
 * Math Utilities - Elevator Puzzle
 * Modern Building / Urban Elevator Theme
 * Game #063
 */

/**
 * Elevator movement easing
 */
export function elevatorEase(t: number): number {
  // Smooth acceleration and deceleration
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Floor indicator light pulse
 */
export function floorLightPulse(time: number, floor: number, currentFloor: number): number {
  const isActive = Math.abs(floor - currentFloor) < 0.5;
  if (isActive) {
    return Math.sin(time * 6) * 0.3 + 0.7;
  }
  return 0.3;
}

/**
 * Button glow effect
 */
export function buttonGlow(time: number, isPressed: boolean): number {
  if (isPressed) {
    return Math.sin(time * 4) * 0.2 + 0.8;
  }
  return 0.4 + Math.sin(time * 2) * 0.1;
}

/**
 * Door sliding animation
 */
export function doorSlide(t: number, opening: boolean): number {
  const progress = opening ? t : 1 - t;
  // Slight ease for mechanical feel
  return progress * progress * (3 - 2 * progress);
}

/**
 * Passenger walking animation
 */
export function passengerWalk(time: number, speed: number = 1): { x: number; y: number } {
  const bounce = Math.abs(Math.sin(time * speed * 10)) * 0.02;
  const sway = Math.sin(time * speed * 5) * 0.01;
  return { x: sway, y: bounce };
}

/**
 * Building ambient light flicker
 */
export function buildingLights(x: number, y: number, time: number): number {
  const window = Math.floor(x * 10) + Math.floor(y * 20) * 10;
  const flicker = Math.sin(time * 2 + window * 0.5) * 0.1;
  const base = (Math.sin(window * 1.7) * 0.5 + 0.5) * 0.6 + 0.4;
  return base + flicker;
}

/**
 * Cable vibration effect
 */
export function cableVibration(y: number, time: number, speed: number): number {
  return Math.sin(y * 50 + time * speed * 20) * 0.002;
}

/**
 * Elevator motor vibration
 */
export function motorVibration(time: number, isMoving: boolean): number {
  if (!isMoving) return 0;
  return Math.sin(time * 60) * 0.001 + Math.sin(time * 47) * 0.0005;
}

/**
 * Floor arrival ding timing
 */
export function dingTiming(progress: number): boolean {
  return progress > 0.95 && progress < 0.98;
}

/**
 * Indicator arrow animation
 */
export function indicatorArrow(time: number, direction: number): number {
  if (direction === 0) return 0;
  return (Math.sin(time * 4) * 0.3 + 0.7) * direction;
}

/**
 * Glass reflection shimmer
 */
export function glassReflection(x: number, y: number, time: number): number {
  const reflection = Math.sin(x * 3 + y * 2 + time * 0.5) * 0.5 + 0.5;
  return reflection * 0.15;
}

/**
 * Emergency light blink
 */
export function emergencyBlink(time: number): number {
  return Math.sin(time * 8) > 0 ? 1 : 0.2;
}

/**
 * Counter number scroll animation
 */
export function numberScroll(current: number, target: number, speed: number): number {
  const diff = target - current;
  return current + diff * speed;
}

/**
 * Particle trail for movement effects
 */
export function trailPosition(time: number, index: number, direction: number): { x: number; y: number } {
  const offset = index * 0.1;
  const fade = 1 - index * 0.15;
  return {
    x: Math.sin(time * 2 + offset) * 2 * fade,
    y: direction * index * 5 * fade
  };
}

/**
 * WebGPU Math Utilities - Time Rewind
 * Temporal / Cosmic / Time Vortex Theme
 * Game #072
 */

export function temporalWave(time: number, phase: number = 0): number {
  const wave = Math.sin(time * 2 + phase) * 0.5 + 0.5;
  const distortion = Math.sin(time * 5 + phase * 2) * 0.2;
  return wave + distortion;
}

export function clockTick(time: number, segments: number = 12): number {
  const normalized = (time % (Math.PI * 2)) / (Math.PI * 2);
  const segment = Math.floor(normalized * segments);
  return segment / segments;
}

export function rewindPulse(time: number, speed: number = 3): number {
  const reverseTime = 1 - (time % 1);
  return (Math.sin(reverseTime * Math.PI * speed) + 1) * 0.5;
}

export function vortexSpiral(angle: number, time: number, arms: number = 5): number {
  const spiral = Math.sin(angle * arms + time * 2);
  const depth = 1 - (1 / (1 + Math.abs(spiral)));
  return depth;
}

export function cosmicDrift(x: number, y: number, time: number): { dx: number; dy: number } {
  const angle = Math.atan2(y, x) + time * 0.5;
  const dist = Math.sqrt(x * x + y * y);
  return {
    dx: Math.cos(angle) * dist * 0.1,
    dy: Math.sin(angle) * dist * 0.1,
  };
}

export function chronoFlicker(time: number, frequency: number = 10): number {
  const fast = Math.sin(time * frequency);
  const slow = Math.sin(time * 0.5);
  return fast * 0.3 + slow * 0.7;
}

export function portalGlow(distance: number, time: number): number {
  const pulse = Math.sin(time * 3) * 0.3 + 0.7;
  const glow = Math.exp(-distance * 0.5) * pulse;
  return Math.min(1, glow);
}

export function timelineTrace(progress: number, segments: number): number {
  const segmentProgress = (progress * segments) % 1;
  return Math.sin(segmentProgress * Math.PI);
}

export function paradoxShimmer(time: number, layer: number): number {
  const phase1 = Math.sin(time * 2 + layer);
  const phase2 = Math.sin(time * 3 - layer * 0.5);
  return (phase1 + phase2 + 2) * 0.25;
}

export function hourglassFall(progress: number, gravity: number = 1): number {
  return Math.pow(progress, 2) * gravity;
}

/** Pure rules for Portal Dash: track generation and collision. No DOM or three.js, so tests can import it. */

export const TAU = Math.PI * 2;
export const TUNNEL_RADIUS = 6;
export const TURN_SPEED = 3.4; // rad/s at full keyboard input
export const PLAYER_HALF_ANGLE = 0.07;
export const OBSTACLE_DEPTH = 0.9;
export const PORTAL_EVERY = 14;

export type Phase = 0 | 1;

export interface Arc {
  kind: 'arc';
  /** Centre angle in radians. */
  angle: number;
  /** Angular width in radians; TAU means a closed ring. */
  span: number;
  phase: Phase;
  /**
   * Rotation in radians per unit of track travelled (0 for static blocks). The rotation follows distance, not time,
   * so a spinning arc sits at `angle` when it reaches the player (z = 0), at any speed; see arcAngleAt.
   */
  spin: number;
}
export interface Shard { kind: 'shard'; angle: number; offset: number; }
export interface Portal { kind: 'portal'; }
export type Piece = Arc | Shard | Portal;
export interface Row { pieces: Piece[]; spacing: number; }

/** Wraps an angle into (-PI, PI]. */
export function wrap(angle: number): number {
  let a = (angle + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** True when the player at `playerAngle` overlaps an arc of `span` centred on `arcAngle`. */
export function overlaps(playerAngle: number, arcAngle: number, span: number, margin = PLAYER_HALF_ANGLE): boolean {
  if (span >= TAU - 1e-6) return true;
  return Math.abs(wrap(playerAngle - arcAngle)) < span / 2 + margin;
}

/** An arc blocks the player only when its colour differs from the player's phase. */
export const isSolid = (arc: Arc, playerPhase: Phase) => arc.phase !== playerPhase;

/** Centre angle of `arc` at depth `z` (negative ahead of the player, 0 where it reaches the player). */
export const arcAngleAt = (arc: Arc, z: number) => (arc.spin ? wrap(arc.angle + arc.spin * z) : arc.angle);

/**
 * A portal hands the player `phase`. Every closed ring between that portal and the next one takes that colour,
 * so it is a phantom for the player whatever they flipped by hand before the portal. `ahead` lists the pieces
 * past the portal, nearest first.
 */
export function syncRings(ahead: readonly (Arc | { kind: 'shard' | 'portal' })[], phase: Phase): void {
  for (const piece of ahead) {
    if (piece.kind === 'portal') break;
    if (piece.kind === 'arc' && piece.span >= TAU - 1e-6) piece.phase = phase;
  }
}

export interface GeneratorState {
  row: number;
  gapAngle: number;
  /** Phase the player will have if they never flip by hand (portals flip it). */
  expectedPhase: Phase;
  sector: number;
}

export function createGenerator(): GeneratorState {
  return { row: 0, gapAngle: -Math.PI / 2, expectedPhase: 0, sector: 1 };
}

/**
 * Produces the next row of the track. Every row keeps a geometric gap the player can reach by
 * steering alone, so flipping phase is a shortcut and never mandatory. Closed rings are the exception:
 * the generator colours them for a player who never flips by hand, and the game recolours them with
 * syncRings when the portal is crossed, so they always match the phase that portal gave the player.
 */
export function nextRow(state: GeneratorState, speed: number, random: () => number): Row {
  state.row += 1;
  const level = Math.min(10, Math.floor(state.row / 25));
  const spacing = Math.max(11, 19 - level * 0.8);
  // How far the gap may move so it stays reachable: 75% of the turn the player can make in time.
  const reach = TURN_SPEED * (spacing / speed) * 0.75;

  if (state.row % PORTAL_EVERY === 0) {
    state.expectedPhase = (1 - state.expectedPhase) as Phase;
    state.sector += 1;
    const pieces: Piece[] = [{ kind: 'portal' }];
    for (let i = 0; i < 6; i++) pieces.push({ kind: 'shard', angle: state.gapAngle + (i - 2.5) * 0.18, offset: -i * 1.4 - 3 });
    return { pieces, spacing: spacing + 6 };
  }

  if (state.sector >= 2 && state.row % PORTAL_EVERY === 2) {
    // A closed ring in the colour the portal gives the player (syncRings corrects it for manual flips): trust the portal.
    return { pieces: [{ kind: 'arc', angle: 0, span: TAU, phase: state.expectedPhase, spin: 0 }], spacing };
  }

  const roll = random();
  state.gapAngle = wrap(state.gapAngle + (random() * 2 - 1) * reach);
  const gapWidth = Math.max(0.85, 1.35 - level * 0.05);

  if (roll < 0.14) {
    // Shard helix with no obstacles: a breather that refills phase charges.
    const pieces: Piece[] = [];
    const turn = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < 5; i++) pieces.push({ kind: 'shard', angle: state.gapAngle + turn * i * 0.16, offset: -i * 1.6 });
    return { pieces, spacing };
  }

  if (roll < 0.3 && level >= 1) {
    // Two opposed spinning blades. They turn with distance (0.5-1.6 rad/s at the current speed), so when the row
    // reaches the player its gaps sit at gapAngle and gapAngle + PI: wider than a static gap, and just as reachable.
    const spin = (0.5 + random() * 0.6 + level * 0.05) * (random() < 0.5 ? -1 : 1) / speed;
    const span = Math.min(1.9, 1.3 + level * 0.06);
    const phase = (random() < 0.5 ? 0 : 1) as Phase;
    return {
      pieces: [
        { kind: 'arc', angle: state.gapAngle + Math.PI / 2, span, phase, spin },
        { kind: 'arc', angle: state.gapAngle - Math.PI / 2, span, phase: (1 - phase) as Phase, spin },
      ],
      spacing: spacing + 2,
    };
  }

  // Fill the circle outside the gap with one to three blocks of random colour.
  const filled = TAU - gapWidth;
  const count = 1 + Math.floor(random() * Math.min(3, 1 + level));
  const seam = 0.12;
  const pieces: Piece[] = [];
  let cursor = state.gapAngle + gapWidth / 2;
  for (let i = 0; i < count; i++) {
    const span = filled / count - seam;
    pieces.push({ kind: 'arc', angle: wrap(cursor + span / 2), span, phase: (random() < 0.5 ? 0 : 1) as Phase, spin: 0 });
    cursor += span + seam;
  }
  if (random() < 0.35) pieces.push({ kind: 'shard', angle: state.gapAngle, offset: 0 });
  return { pieces, spacing };
}

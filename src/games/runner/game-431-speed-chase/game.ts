// Speed Chase - Chase Runner Game
// Theme: Police chase - catch criminals while avoiding traffic

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  sirensOn: boolean;
  boostActive: boolean;
  boostTimer: number;
}

export interface Criminal {
  x: number;
  y: number;
  lane: number;
  speed: number;
  type: 'car' | 'bike' | 'truck';
  health: number;
  maxHealth: number;
  captured: boolean;
}

export interface Traffic {
  x: number;
  y: number;
  lane: number;
  type: 'sedan' | 'suv' | 'bus';
  width: number;
  height: number;
}

export interface Powerup {
  x: number;
  y: number;
  lane: number;
  type: 'nitro' | 'spike' | 'emp';
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  score: number;
  distance: number;
  captures: number;
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  player: Player;
  criminals: Criminal[];
  traffic: Traffic[];
  powerups: Powerup[];
  particles: Particle[];
  nitroCount: number;
  spikeCount: number;
  empCount: number;
  sirenPhase: number;
  pursuitMeter: number;
  maxPursuitMeter: number;
  streak: number;
  maxStreak: number;
}

export type GamePhase = GameState['phase'];

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const JUMP_FORCE = -14;
const GRAVITY = 0.7;
const BOOST_DURATION = 3000;
const BOOST_MULTIPLIER = 1.5;

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    distance: 0,
    captures: 0,
    speed: 6,
    baseSpeed: 6,
    maxSpeed: 16,
    player: {
      x: 100,
      y: 300,
      lane: 1,
      targetLane: 1,
      jumping: false,
      jumpVelocity: 0,
      groundY: 300,
      sirensOn: true,
      boostActive: false,
      boostTimer: 0,
    },
    criminals: [],
    traffic: [],
    powerups: [],
    particles: [],
    nitroCount: 0,
    spikeCount: 0,
    empCount: 0,
    sirenPhase: 0,
    pursuitMeter: 50,
    maxPursuitMeter: 100,
    streak: 0,
    maxStreak: 0,
  };
}

export function getLaneY(lane: number, canvasHeight: number): number {
  const roadTop = canvasHeight * 0.3;
  const roadHeight = canvasHeight * 0.6;
  const laneHeight = roadHeight / LANE_COUNT;
  return roadTop + laneHeight * (lane + 0.5);
}

export function getLaneX(lane: number, canvasWidth: number): number {
  const roadLeft = (canvasWidth - LANE_WIDTH * LANE_COUNT) / 2;
  return roadLeft + LANE_WIDTH * (lane + 0.5);
}

function spawnCriminal(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Criminal['type'][] = ['car', 'bike', 'truck'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);

  const healthByType = { car: 2, bike: 1, truck: 4 };
  const speedByType = { car: 0.8, bike: 1.2, truck: 0.5 };

  const criminal: Criminal = {
    x: canvasWidth + 100,
    y: getLaneY(lane, canvasHeight),
    lane,
    speed: state.speed * speedByType[type],
    type,
    health: healthByType[type],
    maxHealth: healthByType[type],
    captured: false,
  };

  state.criminals.push(criminal);
}

function spawnTraffic(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Traffic['type'][] = ['sedan', 'suv', 'bus'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);

  const sizeByType = {
    sedan: { width: 40, height: 25 },
    suv: { width: 45, height: 28 },
    bus: { width: 70, height: 30 },
  };

  // Check for overlap with existing traffic
  const existingInLane = state.traffic.filter(t => t.lane === lane);
  if (existingInLane.some(t => t.x > canvasWidth - 150)) return;

  const traffic: Traffic = {
    x: canvasWidth + 50,
    y: getLaneY(lane, canvasHeight),
    lane,
    type,
    ...sizeByType[type],
  };

  state.traffic.push(traffic);
}

function spawnPowerup(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Powerup['type'][] = ['nitro', 'spike', 'emp'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);

  const powerup: Powerup = {
    x: canvasWidth + 50,
    y: getLaneY(lane, canvasHeight),
    lane,
    type,
    collected: false,
  };

  state.powerups.push(powerup);
}

function createSirenParticle(state: GameState, color: string): void {
  const player = state.player;
  state.particles.push({
    x: player.x + PLAYER_WIDTH / 2,
    y: player.y - PLAYER_HEIGHT / 2 - 5,
    vx: (Math.random() - 0.5) * 3,
    vy: -Math.random() * 2 - 1,
    life: 30,
    maxLife: 30,
    color,
    size: 4 + Math.random() * 4,
  });
}

function createCaptureParticle(state: GameState, x: number, y: number): void {
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * (3 + Math.random() * 3),
      vy: Math.sin(angle) * (3 + Math.random() * 3),
      life: 40,
      maxLife: 40,
      color: ['#ff6b6b', '#ffd93d', '#fff'][Math.floor(Math.random() * 3)],
      size: 5 + Math.random() * 5,
    });
  }
}

function createBoostParticle(state: GameState): void {
  const player = state.player;
  state.particles.push({
    x: player.x - 10,
    y: player.y + (Math.random() - 0.5) * PLAYER_HEIGHT,
    vx: -5 - Math.random() * 5,
    vy: (Math.random() - 0.5) * 2,
    life: 20,
    maxLife: 20,
    color: '#ffd93d',
    size: 6 + Math.random() * 6,
  });
}

function checkCollision(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function update(state: GameState, deltaTime: number, canvasWidth: number, canvasHeight: number): void {
  if (state.phase !== 'playing') return;

  const dt = deltaTime / 16.67;
  const effectiveSpeed = state.player.boostActive ? state.speed * BOOST_MULTIPLIER : state.speed;

  // Update distance and score
  state.distance += effectiveSpeed * dt;
  state.score += Math.floor(effectiveSpeed * dt * 0.5);

  // Gradually increase speed
  if (state.speed < state.maxSpeed) {
    state.speed += 0.001 * dt;
  }

  // Update boost timer
  if (state.player.boostActive) {
    state.player.boostTimer -= deltaTime;
    if (state.player.boostTimer <= 0) {
      state.player.boostActive = false;
    }
    createBoostParticle(state);
  }

  // Update pursuit meter (decreases over time, increase by catching criminals)
  state.pursuitMeter -= 0.02 * dt;
  if (state.pursuitMeter <= 0) {
    state.phase = 'gameover';
    return;
  }

  // Update player lane position
  const targetX = getLaneX(state.player.targetLane, canvasWidth);
  state.player.x += (targetX - state.player.x - PLAYER_WIDTH / 2) * 0.15 * dt;
  state.player.lane = state.player.targetLane;

  // Update player ground Y based on lane
  state.player.groundY = getLaneY(state.player.lane, canvasHeight);

  // Update jump physics
  if (state.player.jumping) {
    state.player.jumpVelocity += GRAVITY * dt;
    state.player.y += state.player.jumpVelocity * dt;

    if (state.player.y >= state.player.groundY) {
      state.player.y = state.player.groundY;
      state.player.jumping = false;
      state.player.jumpVelocity = 0;
    }
  } else {
    state.player.y = state.player.groundY;
  }

  // Update siren phase
  state.sirenPhase += 0.15 * dt;
  if (state.player.sirensOn && Math.random() < 0.3) {
    const sirenColor = Math.sin(state.sirenPhase) > 0 ? '#ff0000' : '#0066ff';
    createSirenParticle(state, sirenColor);
  }

  // Spawn entities
  if (Math.random() < 0.015 * dt) spawnCriminal(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.025 * dt) spawnTraffic(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.008 * dt) spawnPowerup(state, canvasWidth, canvasHeight);

  // Update criminals
  for (const criminal of state.criminals) {
    criminal.x -= (effectiveSpeed - criminal.speed) * dt;

    // Check if player is ramming criminal
    const playerLeft = state.player.x;
    const playerRight = state.player.x + PLAYER_WIDTH;
    const playerTop = state.player.y - PLAYER_HEIGHT;
    const playerBottom = state.player.y;

    const criminalWidth = criminal.type === 'truck' ? 60 : criminal.type === 'bike' ? 30 : 45;
    const criminalHeight = criminal.type === 'truck' ? 35 : criminal.type === 'bike' ? 20 : 28;

    if (!criminal.captured &&
        state.player.lane === criminal.lane &&
        checkCollision(
          playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
          criminal.x - criminalWidth / 2, criminal.y - criminalHeight, criminalWidth, criminalHeight
        )) {
      // Ram damage
      criminal.health -= state.player.boostActive ? 2 : 1;

      if (criminal.health <= 0) {
        criminal.captured = true;
        state.captures++;
        state.streak++;
        state.maxStreak = Math.max(state.maxStreak, state.streak);

        // Score bonus based on type
        const bonusByType = { car: 100, bike: 50, truck: 200 };
        state.score += bonusByType[criminal.type] * (1 + state.streak * 0.1);

        // Restore pursuit meter
        state.pursuitMeter = Math.min(state.maxPursuitMeter, state.pursuitMeter + 15);

        createCaptureParticle(state, criminal.x, criminal.y - criminalHeight / 2);
      }
    }
  }

  // Update traffic
  for (const traffic of state.traffic) {
    traffic.x -= effectiveSpeed * 0.7 * dt;

    // Check collision with player
    const playerLeft = state.player.x;
    const playerTop = state.player.y - PLAYER_HEIGHT;

    if (state.player.lane === traffic.lane &&
        !state.player.jumping &&
        checkCollision(
          playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
          traffic.x - traffic.width / 2, traffic.y - traffic.height, traffic.width, traffic.height
        )) {
      // Crash! End pursuit streak
      state.streak = 0;
      state.pursuitMeter -= 20;

      // Remove traffic
      traffic.x = -200;

      if (state.pursuitMeter <= 0) {
        state.phase = 'gameover';
        return;
      }
    }
  }

  // Update powerups
  for (const powerup of state.powerups) {
    powerup.x -= effectiveSpeed * dt;

    if (!powerup.collected && state.player.lane === powerup.lane) {
      const playerLeft = state.player.x;
      const playerTop = state.player.y - PLAYER_HEIGHT;

      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        powerup.x - 15, powerup.y - 30, 30, 30
      )) {
        powerup.collected = true;

        switch (powerup.type) {
          case 'nitro':
            state.nitroCount++;
            break;
          case 'spike':
            state.spikeCount++;
            break;
          case 'emp':
            state.empCount++;
            break;
        }

        state.score += 25;
      }
    }
  }

  // Update particles
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }

  // Clean up
  state.criminals = state.criminals.filter(c => c.x > -100 && !c.captured);
  state.traffic = state.traffic.filter(t => t.x > -100);
  state.powerups = state.powerups.filter(p => p.x > -50 && !p.collected);
  state.particles = state.particles.filter(p => p.life > 0);
}

export function moveLeft(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (state.player.targetLane > 0) {
    state.player.targetLane--;
  }
}

export function moveRight(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (state.player.targetLane < LANE_COUNT - 1) {
    state.player.targetLane++;
  }
}

export function jump(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (!state.player.jumping) {
    state.player.jumping = true;
    state.player.jumpVelocity = JUMP_FORCE;
  }
}

export function activateNitro(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (state.nitroCount > 0 && !state.player.boostActive) {
    state.nitroCount--;
    state.player.boostActive = true;
    state.player.boostTimer = BOOST_DURATION;
  }
}

export function startGame(state: GameState): void {
  Object.assign(state, createInitialState());
  state.phase = 'playing';
}

export function getStats(state: GameState) {
  return {
    score: Math.floor(state.score),
    distance: Math.floor(state.distance),
    captures: state.captures,
    maxStreak: state.maxStreak,
  };
}

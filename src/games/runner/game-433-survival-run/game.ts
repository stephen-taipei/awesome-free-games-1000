// Survival Run - Survival Runner Game
// Theme: Post-apocalyptic survival - collect resources, avoid zombies and hazards

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  stamina: number;
  maxStamina: number;
  sprinting: boolean;
}

export interface Zombie {
  x: number;
  y: number;
  lane: number;
  type: 'walker' | 'runner' | 'crawler';
  speed: number;
  health: number;
}

export interface Hazard {
  x: number;
  y: number;
  lane: number;
  type: 'fire' | 'toxic' | 'pitfall' | 'barricade';
  width: number;
  height: number;
}

export interface Resource {
  x: number;
  y: number;
  lane: number;
  type: 'food' | 'water' | 'medkit' | 'ammo';
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
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  player: Player;
  zombies: Zombie[];
  hazards: Hazard[];
  resources: Resource[];
  particles: Particle[];
  foodCount: number;
  waterCount: number;
  medkitCount: number;
  ammoCount: number;
  hunger: number;
  thirst: number;
  maxHungerThirst: number;
  dayNightCycle: number;
  isNight: boolean;
  survivalDays: number;
}

export type GamePhase = GameState['phase'];

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const JUMP_FORCE = -14;
const GRAVITY = 0.7;
const SPRINT_SPEED_BONUS = 1.5;
const STAMINA_DRAIN = 0.5;
const STAMINA_REGEN = 0.2;

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    distance: 0,
    speed: 6,
    baseSpeed: 6,
    maxSpeed: 14,
    player: {
      x: 80,
      y: 300,
      lane: 1,
      targetLane: 1,
      jumping: false,
      jumpVelocity: 0,
      groundY: 300,
      stamina: 100,
      maxStamina: 100,
      sprinting: false,
    },
    zombies: [],
    hazards: [],
    resources: [],
    particles: [],
    foodCount: 0,
    waterCount: 0,
    medkitCount: 0,
    ammoCount: 0,
    hunger: 100,
    thirst: 100,
    maxHungerThirst: 100,
    dayNightCycle: 0,
    isNight: false,
    survivalDays: 0,
  };
}

export function getLaneY(lane: number, canvasHeight: number): number {
  const groundY = canvasHeight * 0.75;
  return groundY;
}

export function getLaneX(lane: number, canvasWidth: number): number {
  const roadLeft = (canvasWidth - LANE_WIDTH * LANE_COUNT) / 2;
  return roadLeft + LANE_WIDTH * (lane + 0.5);
}

function spawnZombie(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Zombie['type'][] = ['walker', 'runner', 'crawler'];
  const weights = state.isNight ? [0.3, 0.5, 0.2] : [0.5, 0.3, 0.2];
  const rand = Math.random();
  let cumulative = 0;
  let type: Zombie['type'] = 'walker';

  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      type = types[i];
      break;
    }
  }

  const lane = Math.floor(Math.random() * LANE_COUNT);
  const speedByType = { walker: 0.3, runner: 0.7, crawler: 0.2 };
  const healthByType = { walker: 1, runner: 1, crawler: 2 };

  const zombie: Zombie = {
    x: canvasWidth + 50,
    y: getLaneY(lane, canvasHeight),
    lane,
    type,
    speed: state.speed * speedByType[type],
    health: healthByType[type],
  };

  state.zombies.push(zombie);
}

function spawnHazard(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Hazard['type'][] = ['fire', 'toxic', 'pitfall', 'barricade'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  let width: number, height: number;
  switch (type) {
    case 'fire':
      width = 50;
      height = 45;
      break;
    case 'toxic':
      width = 60;
      height = 20;
      break;
    case 'pitfall':
      width = 55;
      height = 10;
      break;
    case 'barricade':
      width = 40;
      height = 55;
      break;
    default:
      width = 40;
      height = 40;
  }

  const hazard: Hazard = {
    x: canvasWidth + 50,
    y: groundY,
    lane,
    type,
    width,
    height,
  };

  state.hazards.push(hazard);
}

function spawnResource(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Resource['type'][] = ['food', 'water', 'medkit', 'ammo'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  const resource: Resource = {
    x: canvasWidth + 50,
    y: groundY - 35,
    lane,
    type,
    collected: false,
  };

  state.resources.push(resource);
}

function createZombieDeathParticle(state: GameState, x: number, y: number): void {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30,
      maxLife: 30,
      color: ['#4a7c59', '#2d5a3d', '#1a3d25'][Math.floor(Math.random() * 3)],
      size: 5 + Math.random() * 5,
    });
  }
}

function createCollectParticle(state: GameState, x: number, y: number, color: string): void {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      life: 20,
      maxLife: 20,
      color,
      size: 4,
    });
  }
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
  const effectiveSpeed = state.player.sprinting ? state.speed * SPRINT_SPEED_BONUS : state.speed;

  // Update distance and score
  state.distance += effectiveSpeed * dt;
  state.score += Math.floor(effectiveSpeed * dt);

  // Day/night cycle (every 500 distance = 1 day)
  state.dayNightCycle += effectiveSpeed * dt * 0.002;
  const cyclePhase = state.dayNightCycle % 1;
  const wasNight = state.isNight;
  state.isNight = cyclePhase > 0.5;

  if (wasNight && !state.isNight) {
    state.survivalDays++;
    state.score += 100; // Bonus for surviving a night
  }

  // Gradually increase speed
  if (state.speed < state.maxSpeed) {
    state.speed += 0.001 * dt;
  }

  // Hunger and thirst drain
  state.hunger -= 0.015 * dt;
  state.thirst -= 0.02 * dt;

  if (state.hunger <= 0 || state.thirst <= 0) {
    state.phase = 'gameover';
    return;
  }

  // Stamina management
  if (state.player.sprinting) {
    state.player.stamina -= STAMINA_DRAIN * dt;
    if (state.player.stamina <= 0) {
      state.player.stamina = 0;
      state.player.sprinting = false;
    }
  } else {
    state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + STAMINA_REGEN * dt);
  }

  // Update player lane position
  const targetX = getLaneX(state.player.targetLane, canvasWidth);
  state.player.x += (targetX - state.player.x - PLAYER_WIDTH / 2) * 0.15 * dt;
  state.player.lane = state.player.targetLane;

  // Update player ground Y
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

  // Spawn entities (more zombies at night)
  const zombieRate = state.isNight ? 0.025 : 0.015;
  if (Math.random() < zombieRate * dt) spawnZombie(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.012 * dt) spawnHazard(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.015 * dt) spawnResource(state, canvasWidth, canvasHeight);

  // Player hitbox
  const playerTop = state.player.y - PLAYER_HEIGHT;
  const playerLeft = state.player.x;

  // Update zombies
  for (const zombie of state.zombies) {
    zombie.x -= (effectiveSpeed - zombie.speed) * dt;

    // Check collision
    if (state.player.lane === zombie.lane) {
      const zombieWidth = zombie.type === 'crawler' ? 40 : 30;
      const zombieHeight = zombie.type === 'crawler' ? 25 : 45;

      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        zombie.x - zombieWidth / 2, zombie.y - zombieHeight, zombieWidth, zombieHeight
      )) {
        // If sprinting, kill zombie
        if (state.player.sprinting) {
          zombie.health--;
          if (zombie.health <= 0) {
            createZombieDeathParticle(state, zombie.x, zombie.y - zombieHeight / 2);
            zombie.x = -100;
            state.score += 50;
          }
        } else {
          // Game over if hit by zombie
          state.phase = 'gameover';
          return;
        }
      }
    }
  }

  // Update hazards
  for (const hazard of state.hazards) {
    hazard.x -= effectiveSpeed * dt;

    // Check collision
    if (state.player.lane === hazard.lane) {
      let canAvoid = false;

      // Jumping avoids pitfalls and toxic
      if ((hazard.type === 'pitfall' || hazard.type === 'toxic') && state.player.jumping) {
        canAvoid = true;
      }

      if (!canAvoid && checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        hazard.x - hazard.width / 2, hazard.y - hazard.height, hazard.width, hazard.height
      )) {
        state.phase = 'gameover';
        return;
      }
    }
  }

  // Update resources
  for (const resource of state.resources) {
    resource.x -= effectiveSpeed * dt;

    if (!resource.collected && state.player.lane === resource.lane) {
      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        resource.x - 15, resource.y - 15, 30, 30
      )) {
        resource.collected = true;

        let color: string;
        switch (resource.type) {
          case 'food':
            state.foodCount++;
            state.hunger = Math.min(state.maxHungerThirst, state.hunger + 20);
            color = '#f39c12';
            break;
          case 'water':
            state.waterCount++;
            state.thirst = Math.min(state.maxHungerThirst, state.thirst + 25);
            color = '#3498db';
            break;
          case 'medkit':
            state.medkitCount++;
            state.hunger = Math.min(state.maxHungerThirst, state.hunger + 10);
            state.thirst = Math.min(state.maxHungerThirst, state.thirst + 10);
            color = '#e74c3c';
            break;
          case 'ammo':
            state.ammoCount++;
            state.score += 30;
            color = '#95a5a6';
            break;
        }

        createCollectParticle(state, resource.x, resource.y, color);
        state.score += 20;
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
  state.zombies = state.zombies.filter(z => z.x > -100);
  state.hazards = state.hazards.filter(h => h.x > -100);
  state.resources = state.resources.filter(r => r.x > -50 && !r.collected);
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

export function toggleSprint(state: GameState, sprinting: boolean): void {
  if (state.phase !== 'playing') return;
  if (sprinting && state.player.stamina > 0) {
    state.player.sprinting = true;
  } else {
    state.player.sprinting = false;
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
    survivalDays: state.survivalDays,
    resourcesCollected: state.foodCount + state.waterCount + state.medkitCount + state.ammoCount,
  };
}

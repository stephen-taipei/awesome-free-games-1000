/**
 * Rhythm Battle Game Engine
 * Game #240
 *
 * Rhythm game with combat elements!
 */

interface Note {
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
}

interface HitEffect {
  x: number;
  y: number;
  alpha: number;
  text: string;
  color: string;
}

interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const LANE_COUNT = 4;
const NOTE_SPEED = 5;
const HIT_ZONE_Y = 0.85;
const HIT_TOLERANCE = 50;
const LANE_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a855f7"];

export class RhythmBattleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private notes: Note[] = [];
  private effects: HitEffect[] = [];
  private laneWidth = 0;
  private hitZoneY = 0;
  private noteTimer = 0;
  private bpm = 120;
  private beatInterval = 0;
  private lastBeat = 0;

  private playerHp = 100;
  private enemyHp = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.laneWidth = size / LANE_COUNT;
    this.hitZoneY = size * HIT_ZONE_Y;

    this.draw();
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.status = "playing";
    this.notes = [];
    this.effects = [];
    this.noteTimer = 0;
    this.playerHp = 100;
    this.enemyHp = 100;
    this.beatInterval = (60 / this.bpm) * 1000;
    this.lastBeat = Date.now();

    this.emitState();
    this.gameLoop();
  }

  hitLane(lane: number) {
    if (this.status !== "playing") return;
    if (lane < 0 || lane >= LANE_COUNT) return;

    const laneX = lane * this.laneWidth + this.laneWidth / 2;

    // Find closest note in lane
    let closestNote: Note | null = null;
    let closestDist = Infinity;

    this.notes.forEach((note) => {
      if (note.lane === lane && !note.hit && !note.missed) {
        const dist = Math.abs(note.y - this.hitZoneY);
        if (dist < closestDist && dist < HIT_TOLERANCE) {
          closestDist = dist;
          closestNote = note;
        }
      }
    });

    if (closestNote) {
      closestNote.hit = true;

      // Calculate accuracy
      let accuracy = "Perfect!";
      let scoreAdd = 100;
      let color = "#4ecdc4";

      if (closestDist > HIT_TOLERANCE * 0.3) {
        accuracy = "Great!";
        scoreAdd = 75;
        color = "#ffe66d";
      }
      if (closestDist > HIT_TOLERANCE * 0.6) {
        accuracy = "Good";
        scoreAdd = 50;
        color = "#ffa502";
      }

      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      // Combo bonus
      scoreAdd += Math.floor(this.combo / 10) * 10;
      this.score += scoreAdd;

      // Damage enemy
      this.enemyHp = Math.max(0, this.enemyHp - (5 + Math.floor(this.combo / 5)));

      // Hit effect
      this.effects.push({
        x: laneX,
        y: this.hitZoneY,
        alpha: 1,
        text: accuracy,
        color,
      });

      this.emitState();

      if (this.enemyHp <= 0) {
        this.victory();
      }
    } else {
      // Miss effect
      this.effects.push({
        x: laneX,
        y: this.hitZoneY,
        alpha: 1,
        text: "Miss",
        color: "#ff6b6b",
      });
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const now = Date.now();
    this.noteTimer++;

    // Spawn notes on beat
    if (now - this.lastBeat >= this.beatInterval / 2) {
      this.lastBeat = now;

      // Random pattern generation
      const pattern = Math.random();
      if (pattern < 0.6) {
        // Single note
        const lane = Math.floor(Math.random() * LANE_COUNT);
        this.notes.push({ lane, y: -30, hit: false, missed: false });
      } else if (pattern < 0.85) {
        // Double note
        const lane1 = Math.floor(Math.random() * LANE_COUNT);
        let lane2 = Math.floor(Math.random() * LANE_COUNT);
        while (lane2 === lane1) {
          lane2 = Math.floor(Math.random() * LANE_COUNT);
        }
        this.notes.push({ lane: lane1, y: -30, hit: false, missed: false });
        this.notes.push({ lane: lane2, y: -30, hit: false, missed: false });
      } else {
        // Triple or more
        const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 3);
        lanes.forEach((lane) => {
          this.notes.push({ lane, y: -30, hit: false, missed: false });
        });
      }
    }

    // Update notes
    this.notes.forEach((note) => {
      if (!note.hit && !note.missed) {
        note.y += NOTE_SPEED;

        // Check if missed
        if (note.y > this.hitZoneY + HIT_TOLERANCE) {
          note.missed = true;
          this.combo = 0;
          this.playerHp = Math.max(0, this.playerHp - 5);
          this.emitState();

          if (this.playerHp <= 0) {
            this.gameOver();
          }
        }
      }
    });

    // Remove old notes
    this.notes = this.notes.filter(
      (n) => n.y < this.canvas.height + 50 && !(n.hit && n.y > this.hitZoneY + 100)
    );

    // Update effects
    this.effects.forEach((effect) => {
      effect.y -= 2;
      effect.alpha -= 0.02;
    });
    this.effects = this.effects.filter((e) => e.alpha > 0);
  }

  private victory() {
    this.score += 1000 + this.playerHp * 10;
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw lanes
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = i * this.laneWidth;

      // Lane background
      ctx.fillStyle = `rgba(${i % 2 === 0 ? "30, 30, 50" : "40, 40, 60"}, 0.8)`;
      ctx.fillRect(x, 0, this.laneWidth, h);

      // Lane separator
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw hit zone
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, this.hitZoneY - 25, w, 50);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.hitZoneY);
    ctx.lineTo(w, this.hitZoneY);
    ctx.stroke();

    // Draw notes
    this.notes.forEach((note) => {
      if (!note.hit) {
        const x = note.lane * this.laneWidth + this.laneWidth / 2;
        const color = LANE_COLORS[note.lane];

        // Note glow
        const gradient = ctx.createRadialGradient(x, note.y, 0, x, note.y, 30);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, note.y, 30, 0, Math.PI * 2);
        ctx.fill();

        // Note core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, note.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Note highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(x - 5, note.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw HP bars
    this.drawHPBars();

    // Draw effects
    this.effects.forEach((effect) => {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.fillStyle = effect.color;
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y);
      ctx.restore();
    });

    // Draw combo
    if (this.combo > 0) {
      ctx.fillStyle = "#ffe66d";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${this.combo} COMBO`, w / 2, h * 0.3);
    }
  }

  private drawHPBars() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const barWidth = w * 0.35;
    const barHeight = 15;
    const y = 20;

    // Player HP (left)
    ctx.fillStyle = "#333";
    ctx.fillRect(10, y, barWidth, barHeight);
    ctx.fillStyle = "#4ecdc4";
    ctx.fillRect(10, y, barWidth * (this.playerHp / 100), barHeight);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("YOU", 10, y - 5);

    // Enemy HP (right)
    ctx.fillStyle = "#333";
    ctx.fillRect(w - barWidth - 10, y, barWidth, barHeight);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(w - 10 - barWidth * (this.enemyHp / 100), y, barWidth * (this.enemyHp / 100), barHeight);
    ctx.textAlign = "right";
    ctx.fillText("ENEMY", w - 10, y - 5);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

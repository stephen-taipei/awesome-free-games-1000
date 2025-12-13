/**
 * Rhythm Tap Game Logic
 * Game #336 - Tap to the beat as notes fall down
 */

export interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  notes: Note[];
  hitZoneY: number;
  perfect: number;
  good: number;
  miss: number;
  bpm: number;
}

const LANES = 4;
const NOTE_SPEED = 5;
const HIT_ZONE_HEIGHT = 60;
const PERFECT_RANGE = 20;
const GOOD_RANGE = 40;

export class RhythmTapGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private noteId: number = 0;
  private spawnTimer: number = 0;
  private laneWidth: number = 100;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("rhythmTapHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      combo: 0,
      maxCombo: 0,
      notes: [],
      hitZoneY: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      bpm: 120,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.hitZoneY = height - 100;
    this.laneWidth = width / LANES;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      hitZoneY: this.canvasHeight - 100,
    };
    this.noteId = 0;
    this.spawnTimer = 0;
    this.emitState();
  }

  public tapLane(lane: number): void {
    if (this.state.phase !== "playing") return;
    if (lane < 0 || lane >= LANES) return;

    const { notes, hitZoneY } = this.state;
    let hitNote: Note | null = null;
    let hitQuality: "perfect" | "good" | null = null;

    for (const note of notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;

      const distance = Math.abs(note.y - hitZoneY);

      if (distance <= PERFECT_RANGE) {
        hitNote = note;
        hitQuality = "perfect";
        break;
      } else if (distance <= GOOD_RANGE) {
        hitNote = note;
        hitQuality = "good";
      }
    }

    if (hitNote && hitQuality) {
      hitNote.hit = true;
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

      if (hitQuality === "perfect") {
        this.state.score += 100 * (1 + Math.floor(this.state.combo / 10));
        this.state.perfect++;
      } else {
        this.state.score += 50 * (1 + Math.floor(this.state.combo / 10));
        this.state.good++;
      }

      this.emitState();
    }
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { notes } = this.state;

    // Move notes down
    for (const note of notes) {
      if (!note.hit && !note.missed) {
        note.y += NOTE_SPEED;

        // Check if note passed hit zone
        if (note.y > this.state.hitZoneY + GOOD_RANGE) {
          note.missed = true;
          this.state.miss++;
          this.state.combo = 0;
        }
      }
    }

    // Remove off-screen notes
    this.state.notes = notes.filter(
      (n) => n.y < this.canvasHeight + 50 || (!n.hit && !n.missed)
    );

    // Spawn new notes
    this.spawnTimer++;
    const spawnInterval = Math.floor(60 / (this.state.bpm / 60));

    if (this.spawnTimer >= spawnInterval) {
      this.spawnNote();
      this.spawnTimer = 0;
    }

    // Check game over (too many misses)
    if (this.state.miss >= 20) {
      this.gameOver();
      return;
    }

    this.emitState();
  }

  private spawnNote(): void {
    const lane = Math.floor(Math.random() * LANES);

    // Sometimes spawn multiple notes
    const lanes = [lane];
    if (Math.random() > 0.7) {
      const secondLane = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
      lanes.push(secondLane);
    }

    for (const l of lanes) {
      this.state.notes.push({
        id: this.noteId++,
        lane: l,
        y: -30,
        hit: false,
        missed: false,
      });
    }

    // Gradually increase BPM
    if (this.state.score > 1000) {
      this.state.bpm = Math.min(180, 120 + Math.floor(this.state.score / 500) * 10);
    }
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("rhythmTapHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getLaneWidth(): number {
    return this.laneWidth;
  }

  public getLaneCount(): number {
    return LANES;
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

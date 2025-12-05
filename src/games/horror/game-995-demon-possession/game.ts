import { translations } from './i18n';

interface ControlPoint {
  id: number;
  x: number;
  y: number;
  strength: number;
}

export class Game {
  private possession: number = 0;
  private isRunning: boolean = false;
  private controlPoints: ControlPoint[] = [];
  private nextPointId: number = 0;
  private resistPower: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private possessionRate: number = 0.5;
  private spawnRate: number = 2000;
  private gameLoop: number | null = null;
  private spawnLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;
  private onControlPointsChange: ((points: ControlPoint[]) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.possession = 0;
    this.resistPower = 0;
    this.controlPoints = [];
    this.nextPointId = 0;
    this.isRunning = true;
    this.possessionRate = 0.5;
    this.spawnRate = 2000;

    this.notifyChange();
    this.log('start');

    // Main game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // Calculate possession increase based on control points
      const pointInfluence = this.controlPoints.reduce((sum, p) => sum + p.strength, 0);
      const increase = this.possessionRate + (pointInfluence * 0.1);

      // Apply resistance
      const decrease = this.resistPower * 0.5;
      this.resistPower = Math.max(0, this.resistPower - 0.3);

      this.possession = Math.min(100, Math.max(0, this.possession + increase - decrease));

      // Increase difficulty over time
      this.possessionRate = Math.min(2, this.possessionRate + 0.01);

      if (this.possession >= 100) {
        this.endGame(false);
      }

      this.notifyChange();
    }, 100);

    // Spawn control points
    this.spawnLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (this.controlPoints.length < 5) {
        this.spawnControlPoint();
      }
      // Increase spawn rate
      this.spawnRate = Math.max(800, this.spawnRate - 50);
    }, this.spawnRate);

    // Victory condition: survive for 60 seconds
    setTimeout(() => {
      if (this.isRunning && this.possession < 100) {
        this.endGame(true);
      }
    }, 60000);
  }

  resist() {
    if (!this.isRunning) return;
    this.resistPower = Math.min(10, this.resistPower + 1);
    this.log('resist');
  }

  removeControlPoint(id: number) {
    if (!this.isRunning) return;
    const index = this.controlPoints.findIndex(p => p.id === id);
    if (index !== -1) {
      this.controlPoints.splice(index, 1);
      this.possession = Math.max(0, this.possession - 5);
      this.log('purge');
      this.notifyControlPoints();
      this.notifyChange();
    }
  }

  private spawnControlPoint() {
    const point: ControlPoint = {
      id: this.nextPointId++,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      strength: 1 + Math.random() * 2
    };
    this.controlPoints.push(point);
    this.notifyControlPoints();

    // Auto-remove after some time if not clicked
    setTimeout(() => {
      const idx = this.controlPoints.findIndex(p => p.id === point.id);
      if (idx !== -1) {
        this.controlPoints.splice(idx, 1);
        this.notifyControlPoints();
      }
    }, 5000);
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.spawnLoop) clearInterval(this.spawnLoop);
    this.log(win ? 'win' : 'lose');
    this.notifyChange();
  }

  getStats() {
    return {
      possession: this.possession,
      isRunning: this.isRunning,
      controlPoints: this.controlPoints,
      resistPower: this.resistPower
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  setOnControlPointsChange(cb: (points: ControlPoint[]) => void) {
    this.onControlPointsChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private notifyControlPoints() {
    if (this.onControlPointsChange) this.onControlPointsChange(this.controlPoints);
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}

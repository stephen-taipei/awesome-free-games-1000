export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private running = false;
  private score = 0;
  private level = 1;
  private frameId = 0;

  onScore: (score: number) => void = () => {};
  onLevel: (level: number) => void = () => {};
  onGameOver: () => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = 600;
    this.canvas.height = 400;
  }

  start() {
    this.running = true;
    this.score = 0;
    this.level = 1;
    this.loop();
  }

  private loop() {
    if (!this.running) return;
    this.update();
    this.render();
    this.frameId = requestAnimationFrame(() => this.loop());
  }

  private update() {
    this.score += 1;
    if (this.score % 100 === 0) {
      this.level++;
      this.onLevel(this.level);
    }
    this.onScore(this.score);
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Game Running...', this.canvas.width / 2, this.canvas.height / 2);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.onGameOver();
  }
}

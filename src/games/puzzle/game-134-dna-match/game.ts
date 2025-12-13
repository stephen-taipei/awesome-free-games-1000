/**
 * DNA Match - Game #134
 * Match DNA base pairs (A-T, G-C)
 */

export interface DNABase {
  type: 'A' | 'T' | 'G' | 'C';
  paired: boolean;
  position: number;
}

export interface Level {
  leftStrand: ('A' | 'T' | 'G' | 'C')[];
  rightStrand: ('A' | 'T' | 'G' | 'C')[];
}

const BASE_PAIRS: { [key: string]: string } = {
  'A': 'T',
  'T': 'A',
  'G': 'C',
  'C': 'G'
};

const BASE_COLORS: { [key: string]: string } = {
  'A': '#e74c3c', // Red
  'T': '#3498db', // Blue
  'G': '#2ecc71', // Green
  'C': '#f1c40f'  // Yellow
};

const LEVELS: Level[] = [
  {
    leftStrand: ['A', 'T', 'G'],
    rightStrand: ['T', 'A', 'C']
  },
  {
    leftStrand: ['A', 'G', 'C', 'T'],
    rightStrand: ['T', 'C', 'G', 'A']
  },
  {
    leftStrand: ['G', 'A', 'T', 'C', 'A'],
    rightStrand: ['C', 'T', 'A', 'G', 'T']
  },
  {
    leftStrand: ['A', 'T', 'G', 'C', 'A', 'G'],
    rightStrand: ['T', 'A', 'C', 'G', 'T', 'C']
  },
  {
    leftStrand: ['G', 'C', 'A', 'T', 'T', 'A', 'G'],
    rightStrand: ['C', 'G', 'T', 'A', 'A', 'T', 'C']
  }
];

export class DNAMatchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private leftBases: DNABase[] = [];
  private rightBases: DNABase[] = [];
  private correctPairs: { [key: number]: string } = {};

  private baseRadius = 25;
  private strandX = { left: 0, right: 0 };
  private strandStartY = 0;
  private baseSpacing = 0;

  private currentLevel = 0;
  private pairsMatched = 0;
  private totalPairs = 0;

  private selectedBase: { strand: 'left' | 'right'; index: number } | null = null;
  private connections: { leftIndex: number; rightIndex: number }[] = [];

  private helixAngle = 0;
  private animating = false;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];
    this.totalPairs = level.leftStrand.length;
    this.pairsMatched = 0;
    this.connections = [];

    // Store correct pairs
    this.correctPairs = {};
    for (let i = 0; i < level.leftStrand.length; i++) {
      this.correctPairs[i] = BASE_PAIRS[level.leftStrand[i]];
    }

    // Create left strand
    this.leftBases = level.leftStrand.map((type, i) => ({
      type,
      paired: false,
      position: i
    }));

    // Create shuffled right strand
    const shuffledRight = this.shuffleArray([...level.rightStrand]);
    this.rightBases = shuffledRight.map((type, i) => ({
      type,
      paired: false,
      position: i
    }));

    this.calculateLayout();
    this.notifyState();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private calculateLayout() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    this.strandX = {
      left: canvasWidth * 0.25,
      right: canvasWidth * 0.75
    };

    const availableHeight = canvasHeight - 100;
    this.baseSpacing = Math.min(60, availableHeight / (this.leftBases.length + 1));
    this.baseRadius = Math.min(25, this.baseSpacing * 0.4);

    this.strandStartY = (canvasHeight - (this.leftBases.length - 1) * this.baseSpacing) / 2;
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Check left strand
      for (let i = 0; i < this.leftBases.length; i++) {
        const baseY = this.strandStartY + i * this.baseSpacing;
        const dist = Math.sqrt(
          Math.pow(x - this.strandX.left, 2) +
          Math.pow(y - baseY, 2)
        );

        if (dist < this.baseRadius && !this.leftBases[i].paired) {
          this.selectedBase = { strand: 'left', index: i };
          return;
        }
      }

      // Check right strand
      for (let i = 0; i < this.rightBases.length; i++) {
        const baseY = this.strandStartY + i * this.baseSpacing;
        const dist = Math.sqrt(
          Math.pow(x - this.strandX.right, 2) +
          Math.pow(y - baseY, 2)
        );

        if (dist < this.baseRadius && !this.rightBases[i].paired) {
          this.selectedBase = { strand: 'right', index: i };
          return;
        }
      }
    } else if (type === 'up' && this.selectedBase) {
      // Check if releasing on valid pair
      const targetStrand = this.selectedBase.strand === 'left' ? 'right' : 'left';
      const targetBases = targetStrand === 'left' ? this.leftBases : this.rightBases;
      const targetX = this.strandX[targetStrand];

      for (let i = 0; i < targetBases.length; i++) {
        const baseY = this.strandStartY + i * this.baseSpacing;
        const dist = Math.sqrt(
          Math.pow(x - targetX, 2) +
          Math.pow(y - baseY, 2)
        );

        if (dist < this.baseRadius && !targetBases[i].paired) {
          this.tryConnect(this.selectedBase, { strand: targetStrand, index: i });
          break;
        }
      }

      this.selectedBase = null;
    }
  }

  private tryConnect(
    sel1: { strand: 'left' | 'right'; index: number },
    sel2: { strand: 'left' | 'right'; index: number }
  ) {
    const leftSel = sel1.strand === 'left' ? sel1 : sel2;
    const rightSel = sel1.strand === 'right' ? sel1 : sel2;

    const leftBase = this.leftBases[leftSel.index];
    const rightBase = this.rightBases[rightSel.index];

    // Check if correct pair
    if (BASE_PAIRS[leftBase.type] === rightBase.type) {
      leftBase.paired = true;
      rightBase.paired = true;

      this.connections.push({
        leftIndex: leftSel.index,
        rightIndex: rightSel.index
      });

      this.pairsMatched++;
      this.notifyState();

      if (this.pairsMatched >= this.totalPairs) {
        this.status = 'won';
        this.notifyState();
      }
    }
  }

  private loop = () => {
    this.helixAngle += 0.02;
    this.draw();

    if (this.status === 'playing' || this.status === 'won') {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background with gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.5, '#2d2d5a');
    gradient.addColorStop(1, '#1a1a3e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw helix backbone
    this.drawHelixBackbone('left');
    this.drawHelixBackbone('right');

    // Draw connections
    for (const conn of this.connections) {
      this.drawConnection(conn.leftIndex, conn.rightIndex);
    }

    // Draw bases
    for (let i = 0; i < this.leftBases.length; i++) {
      this.drawBase(this.leftBases[i], 'left', i);
    }

    for (let i = 0; i < this.rightBases.length; i++) {
      this.drawBase(this.rightBases[i], 'right', i);
    }

    // Draw labels
    this.drawLabels();
  }

  private drawHelixBackbone(strand: 'left' | 'right') {
    const x = this.strandX[strand];
    const amplitude = 20;
    const offset = strand === 'left' ? 0 : Math.PI;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    for (let y = 20; y < this.canvas.height - 20; y += 2) {
      const waveX = x + Math.sin((y * 0.02) + this.helixAngle + offset) * amplitude;
      if (y === 20) {
        this.ctx.moveTo(waveX, y);
      } else {
        this.ctx.lineTo(waveX, y);
      }
    }

    this.ctx.stroke();
  }

  private drawConnection(leftIndex: number, rightIndex: number) {
    const leftY = this.strandStartY + leftIndex * this.baseSpacing;
    const rightY = this.strandStartY + rightIndex * this.baseSpacing;

    // Draw hydrogen bonds (dashed lines)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.strandX.left + this.baseRadius, leftY);
    this.ctx.lineTo(this.strandX.right - this.baseRadius, rightY);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  private drawBase(base: DNABase, strand: 'left' | 'right', index: number) {
    const x = this.strandX[strand];
    const y = this.strandStartY + index * this.baseSpacing;

    // Glow effect
    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, this.baseRadius * 1.5);
    glowGradient.addColorStop(0, BASE_COLORS[base.type] + '40');
    glowGradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.baseRadius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Base circle
    this.ctx.fillStyle = base.paired ? BASE_COLORS[base.type] : BASE_COLORS[base.type] + '80';
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.baseRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = base.paired ? '#fff' : 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = base.paired ? 3 : 2;
    this.ctx.stroke();

    // Letter
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `bold ${this.baseRadius}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(base.type, x, y);

    // Selection highlight
    if (this.selectedBase &&
        this.selectedBase.strand === strand &&
        this.selectedBase.index === index) {
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.baseRadius + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawLabels() {
    this.ctx.fillStyle = '#888';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'center';

    // Strand labels
    this.ctx.fillText("5'", this.strandX.left, 25);
    this.ctx.fillText("3'", this.strandX.left, this.canvas.height - 15);
    this.ctx.fillText("3'", this.strandX.right, 25);
    this.ctx.fillText("5'", this.strandX.right, this.canvas.height - 15);

    // Base pair legend
    const legendY = this.canvas.height - 40;
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText('A-T  G-C', this.canvas.width / 2, legendY);
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    this.calculateLayout();
    this.draw();
  }

  reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  nextLevel() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        pairsMatched: this.pairsMatched,
        totalPairs: this.totalPairs
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}

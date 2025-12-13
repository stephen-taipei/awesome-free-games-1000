interface Note {
  id: number;
  frequency: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  placed: boolean;
  slotIndex: number;
}

interface LevelConfig {
  melody: number[]; // frequency indices
  noteCount: number;
}

const NOTE_FREQUENCIES: { name: string; freq: number }[] = [
  { name: "C4", freq: 261.63 },
  { name: "D4", freq: 293.66 },
  { name: "E4", freq: 329.63 },
  { name: "F4", freq: 349.23 },
  { name: "G4", freq: 392.0 },
  { name: "A4", freq: 440.0 },
  { name: "B4", freq: 493.88 },
  { name: "C5", freq: 523.25 },
];

const LEVELS: LevelConfig[] = [
  { melody: [0, 2, 4, 4], noteCount: 4 }, // C E G G (simple)
  { melody: [0, 0, 4, 4, 5, 5, 4], noteCount: 5 }, // Twinkle twinkle
  { melody: [0, 1, 2, 3, 4, 5], noteCount: 6 }, // Scale up
  { melody: [4, 2, 0, 2, 4, 4, 4], noteCount: 5 }, // Mary had a little lamb
];

export class NotePuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioCtx: AudioContext | null = null;

  currentLevel: number = 0;
  targetMelody: number[] = [];
  notes: Note[] = [];
  slots: { x: number; y: number; noteId: number | null }[] = [];

  selectedNote: Note | null = null;
  placedCount: number = 0;

  status: "playing" | "won" = "playing";
  playingNote: number = -1;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public start() {
    this.initAudio();
    this.status = "playing";
    this.selectedNote = null;
    this.placedCount = 0;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        notes: `0/${this.targetMelody.length}`,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.targetMelody = [...config.melody];

    const { width, height } = this.canvas;

    // Create slots for melody
    this.slots = [];
    const slotWidth = 60;
    const slotGap = 10;
    const totalSlotWidth = this.targetMelody.length * slotWidth + (this.targetMelody.length - 1) * slotGap;
    const slotStartX = (width - totalSlotWidth) / 2;
    const slotY = 80;

    for (let i = 0; i < this.targetMelody.length; i++) {
      this.slots.push({
        x: slotStartX + i * (slotWidth + slotGap),
        y: slotY,
        noteId: null,
      });
    }

    // Create notes (shuffled)
    const uniqueNotes = [...new Set(this.targetMelody)];
    const noteWidth = 70;
    const noteHeight = 50;
    const noteGap = 15;
    const totalNoteWidth = uniqueNotes.length * noteWidth + (uniqueNotes.length - 1) * noteGap;
    const noteStartX = (width - totalNoteWidth) / 2;
    const noteY = height - 120;

    // Shuffle the unique notes
    const shuffled = [...uniqueNotes].sort(() => Math.random() - 0.5);

    this.notes = shuffled.map((freqIndex, i) => ({
      id: i,
      frequency: NOTE_FREQUENCIES[freqIndex].freq,
      name: NOTE_FREQUENCIES[freqIndex].name,
      x: noteStartX + i * (noteWidth + noteGap),
      y: noteY,
      width: noteWidth,
      height: noteHeight,
      placed: false,
      slotIndex: -1,
    }));

    this.placedCount = 0;
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking on a note
    for (const note of this.notes) {
      if (
        x >= note.x &&
        x <= note.x + note.width &&
        y >= note.y &&
        y <= note.y + note.height
      ) {
        this.playNote(note.frequency);

        if (note.placed) {
          // Unplace the note
          const slot = this.slots[note.slotIndex];
          if (slot) {
            slot.noteId = null;
          }
          note.placed = false;
          note.slotIndex = -1;
          this.placedCount--;
          this.resetNotePositions();

          if (this.onStateChange) {
            this.onStateChange({
              notes: `${this.placedCount}/${this.targetMelody.length}`,
            });
          }
        } else {
          this.selectedNote = note;
        }
        return;
      }
    }

    // Check if clicking on a slot
    if (this.selectedNote) {
      for (let i = 0; i < this.slots.length; i++) {
        const slot = this.slots[i];
        if (
          x >= slot.x &&
          x <= slot.x + 60 &&
          y >= slot.y &&
          y <= slot.y + 80
        ) {
          if (slot.noteId === null) {
            // Place note in slot
            slot.noteId = this.selectedNote.id;
            this.selectedNote.placed = true;
            this.selectedNote.slotIndex = i;
            this.selectedNote.x = slot.x - 5;
            this.selectedNote.y = slot.y + 15;
            this.placedCount++;
            this.selectedNote = null;

            if (this.onStateChange) {
              this.onStateChange({
                notes: `${this.placedCount}/${this.targetMelody.length}`,
              });
            }

            this.checkWin();
          }
          return;
        }
      }
    }

    this.selectedNote = null;
  }

  private resetNotePositions() {
    const { width, height } = this.canvas;
    const unplacedNotes = this.notes.filter((n) => !n.placed);
    const noteWidth = 70;
    const noteGap = 15;
    const totalNoteWidth = unplacedNotes.length * noteWidth + (unplacedNotes.length - 1) * noteGap;
    const noteStartX = (width - totalNoteWidth) / 2;
    const noteY = height - 120;

    unplacedNotes.forEach((note, i) => {
      note.x = noteStartX + i * (noteWidth + noteGap);
      note.y = noteY;
    });
  }

  private checkWin() {
    if (this.placedCount !== this.targetMelody.length) return;

    // Check if melody matches
    let matches = true;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.noteId === null) {
        matches = false;
        break;
      }

      const note = this.notes.find((n) => n.id === slot.noteId);
      if (!note) {
        matches = false;
        break;
      }

      const expectedFreq = NOTE_FREQUENCIES[this.targetMelody[i]].freq;
      if (note.frequency !== expectedFreq) {
        matches = false;
        break;
      }
    }

    if (matches) {
      this.status = "won";
      this.playMelody();

      setTimeout(() => {
        if (this.onStateChange) {
          this.onStateChange({
            status: "won",
            level: this.currentLevel + 1,
            hasNextLevel: this.currentLevel < LEVELS.length - 1,
          });
        }
      }, this.targetMelody.length * 400 + 500);
    }
  }

  public playNote(frequency: number, duration: number = 0.3) {
    if (!this.audioCtx) return;

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    oscillator.start(this.audioCtx.currentTime);
    oscillator.stop(this.audioCtx.currentTime + duration);
  }

  public playMelody() {
    if (!this.audioCtx) return;

    const frequencies: number[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.noteId !== null) {
        const note = this.notes.find((n) => n.id === slot.noteId);
        if (note) {
          frequencies.push(note.frequency);
        }
      }
    }

    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playingNote = i;
        this.playNote(freq, 0.35);
        setTimeout(() => {
          this.playingNote = -1;
        }, 300);
      }, i * 400);
    });
  }

  public playTargetMelody() {
    if (!this.audioCtx) return;

    this.targetMelody.forEach((freqIndex, i) => {
      setTimeout(() => {
        this.playingNote = i;
        this.playNote(NOTE_FREQUENCIES[freqIndex].freq, 0.35);
        setTimeout(() => {
          this.playingNote = -1;
        }, 300);
      }, i * 400);
    });
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#1a252f");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw staff lines
    this.drawStaff();

    // Draw slots
    this.drawSlots();

    // Draw notes
    this.drawNotes();

    // Draw target melody indicator
    this.drawTargetIndicator();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawStaff() {
    const { width } = this.canvas;
    const staffY = 120;

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(50, staffY + i * 12);
      this.ctx.lineTo(width - 50, staffY + i * 12);
      this.ctx.stroke();
    }

    // Treble clef (simplified)
    this.ctx.font = "60px serif";
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    this.ctx.fillText("𝄞", 55, staffY + 45);
  }

  private drawSlots() {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const isPlaying = this.playingNote === i;

      // Slot background
      this.ctx.fillStyle = isPlaying
        ? "rgba(241, 196, 15, 0.3)"
        : "rgba(255, 255, 255, 0.1)";
      this.ctx.strokeStyle = isPlaying ? "#f1c40f" : "rgba(255, 255, 255, 0.3)";
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      this.ctx.roundRect(slot.x, slot.y, 60, 80, 8);
      this.ctx.fill();
      this.ctx.stroke();

      // Slot number
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.font = "14px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(String(i + 1), slot.x + 30, slot.y + 95);
    }
  }

  private drawNotes() {
    for (const note of this.notes) {
      const isSelected = this.selectedNote?.id === note.id;

      // Note background
      const noteGradient = this.ctx.createLinearGradient(
        note.x,
        note.y,
        note.x,
        note.y + note.height
      );

      if (isSelected) {
        noteGradient.addColorStop(0, "#f39c12");
        noteGradient.addColorStop(1, "#d68910");
      } else if (note.placed) {
        noteGradient.addColorStop(0, "#9b59b6");
        noteGradient.addColorStop(1, "#8e44ad");
      } else {
        noteGradient.addColorStop(0, "#3498db");
        noteGradient.addColorStop(1, "#2980b9");
      }

      this.ctx.fillStyle = noteGradient;
      this.ctx.beginPath();
      this.ctx.roundRect(note.x, note.y, note.width, note.height, 8);
      this.ctx.fill();

      // Note symbol
      this.ctx.fillStyle = "white";
      this.ctx.font = "24px serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("♪", note.x + note.width / 2, note.y + note.height / 2 - 5);

      // Note name
      this.ctx.font = "12px Arial";
      this.ctx.fillText(note.name, note.x + note.width / 2, note.y + note.height - 8);
    }
  }

  private drawTargetIndicator() {
    const { width } = this.canvas;

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Target Melody:", width / 2, 50);

    // Show note names
    const targetNames = this.targetMelody.map((i) => NOTE_FREQUENCIES[i].name);
    this.ctx.fillStyle = "#f1c40f";
    this.ctx.fillText(targetNames.join(" → "), width / 2, 68);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.notes.length > 0) {
        this.initLevel();
      }
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}

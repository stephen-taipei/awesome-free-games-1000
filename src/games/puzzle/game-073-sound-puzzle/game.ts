/**
 * Sound Puzzle Game
 * Game #073 - Listen and repeat the sound sequence (Simon Says style)
 */

export interface Note {
  id: number;
  frequency: number;
  color: string;
  activeColor: string;
}

const NOTES: Note[] = [
  { id: 0, frequency: 261.63, color: "#e74c3c", activeColor: "#ff6b6b" }, // C4 - Red
  { id: 1, frequency: 329.63, color: "#3498db", activeColor: "#5dade2" }, // E4 - Blue
  { id: 2, frequency: 392.00, color: "#2ecc71", activeColor: "#58d68d" }, // G4 - Green
  { id: 3, frequency: 523.25, color: "#f39c12", activeColor: "#f5b041" }, // C5 - Yellow
];

export class SoundPuzzleGame {
  audioContext: AudioContext | null = null;

  currentLevel: number = 0;
  sequence: number[] = [];
  playerSequence: number[] = [];
  activeNote: number = -1;

  isPlaying: boolean = false;
  isPlayerTurn: boolean = false;
  score: number = 0;

  status: "playing" | "won" | "failed" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  constructor() {}

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public start() {
    this.initAudio();
    this.loadLevel(this.currentLevel);
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= 10) { // 10 levels max
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1, score: this.score });
      }
      return;
    }

    // Generate sequence for this level
    const sequenceLength = levelIndex + 3; // Start with 3, increase each level
    this.sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
      this.sequence.push(Math.floor(Math.random() * 4));
    }

    this.playerSequence = [];
    this.status = "playing";
    this.isPlaying = false;
    this.isPlayerTurn = false;

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        score: this.score,
        phase: "ready",
      });
    }
  }

  public async playSequence() {
    if (this.isPlaying || this.isPlayerTurn) return;

    this.isPlaying = true;
    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        score: this.score,
        phase: "listening",
      });
    }

    // Play each note in sequence
    for (let i = 0; i < this.sequence.length; i++) {
      const noteId = this.sequence[i];
      this.activeNote = noteId;

      if (this.onStateChange) {
        this.onStateChange({
          status: "playing",
          level: this.currentLevel + 1,
          score: this.score,
          phase: "listening",
          activeNote: noteId,
        });
      }

      await this.playNote(noteId);
      await this.wait(300);

      this.activeNote = -1;
      if (this.onStateChange) {
        this.onStateChange({
          status: "playing",
          level: this.currentLevel + 1,
          score: this.score,
          phase: "listening",
          activeNote: -1,
        });
      }

      await this.wait(200);
    }

    this.isPlaying = false;
    this.isPlayerTurn = true;
    this.playerSequence = [];

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        score: this.score,
        phase: "playerTurn",
      });
    }
  }

  public async pressNote(noteId: number) {
    if (!this.isPlayerTurn || this.status !== "playing") return;

    this.activeNote = noteId;
    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        score: this.score,
        phase: "playerTurn",
        activeNote: noteId,
      });
    }

    await this.playNote(noteId);

    this.activeNote = -1;
    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        score: this.score,
        phase: "playerTurn",
        activeNote: -1,
      });
    }

    this.playerSequence.push(noteId);

    // Check if correct
    const currentIndex = this.playerSequence.length - 1;
    if (this.playerSequence[currentIndex] !== this.sequence[currentIndex]) {
      // Wrong!
      this.status = "failed";
      this.isPlayerTurn = false;
      if (this.onStateChange) {
        this.onStateChange({
          status: "failed",
          level: this.currentLevel + 1,
          score: this.score,
        });
      }

      // Auto reset after delay
      setTimeout(() => {
        this.loadLevel(this.currentLevel);
      }, 1500);
      return;
    }

    // Check if complete
    if (this.playerSequence.length === this.sequence.length) {
      // Level complete!
      this.score += this.sequence.length * 10;
      this.status = "won";
      this.isPlayerTurn = false;

      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          score: this.score,
        });
      }
    }
  }

  private async playNote(noteId: number) {
    if (!this.audioContext) return;

    const note = NOTES[noteId];
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);

    await this.wait(300);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.score = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return 10;
  }

  public getNotes(): Note[] {
    return NOTES;
  }

  public getActiveNote(): number {
    return this.activeNote;
  }

  public isListening(): boolean {
    return this.isPlaying;
  }

  public isYourTurn(): boolean {
    return this.isPlayerTurn;
  }
}

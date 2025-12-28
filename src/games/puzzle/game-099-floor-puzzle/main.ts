/**
 * Floor Puzzle Main Entry
 * Game #099 - With WebGPU Effects
 */
import { FloorGame, GameState, Passenger } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Elevator / Building sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      this.audioContext = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.15
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Elevator moving
  playElevatorMove(direction: 'up' | 'down') {
    if (!this.audioContext) return;

    const startFreq = direction === 'up' ? 150 : 200;
    const endFreq = direction === 'up' ? 200 : 150;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.25);

    // Mechanical whir
    this.playTone(80, 0.15, "triangle", 0.05);
  }

  // Elevator arrives - ding sound
  playDing() {
    if (!this.audioContext) return;

    // Classic elevator ding
    this.playTone(1200, 0.4, "sine", 0.15);
    setTimeout(() => {
      this.playTone(1600, 0.5, "sine", 0.12);
    }, 100);
  }

  // Passenger boards
  playBoard() {
    if (!this.audioContext) return;

    this.playTone(400, 0.08, "sine", 0.1);
    setTimeout(() => this.playTone(500, 0.08, "sine", 0.12), 60);
    setTimeout(() => this.playTone(600, 0.1, "sine", 0.1), 120);
  }

  // Passenger exits / delivered
  playDelivered() {
    if (!this.audioContext) return;

    this.playTone(600, 0.1, "sine", 0.12);
    setTimeout(() => this.playTone(800, 0.15, "sine", 0.14), 80);
    setTimeout(() => this.playTone(1000, 0.2, "sine", 0.12), 160);
  }

  // Victory - all passengers delivered
  playVictory() {
    if (!this.audioContext) return;

    const melody = [523, 659, 784, 1047, 1319, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.12);
        if (i > 3) {
          this.playTone(freq * 0.75, 0.15, "triangle", 0.08);
        }
      }, i * 80);
    });

    // Multiple dings
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(1400 + i * 100, 0.3, "sine", 0.08);
      }, 300 + i * 150);
    }
  }

  // Level start
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(300, 0.1, "sine", 0.08);
    setTimeout(() => this.playTone(400, 0.1, "sine", 0.1), 100);
    setTimeout(() => this.playTone(500, 0.12, "sine", 0.12), 200);
    setTimeout(() => this.playDing(), 300);
  }

  // Reset
  playReset() {
    if (!this.audioContext) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(400 - i * 80, 0.1, "triangle", 0.08);
      }, i * 60);
    }
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const passengersDisplay = document.getElementById("passengers-display")!;
const floorsEl = document.getElementById("floors")!;
const elevatorEl = document.getElementById("elevator")!;
const elevatorFloorDisplay = document.getElementById("elevator-floor")!;
const elevatorPassengersEl = document.getElementById("elevator-passengers")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const boardBtn = document.getElementById("board-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: FloorGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();
let previousPassengerCount = 0;

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener("change", () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    console.warn("WebGPU not available, running without effects");
    webgpuRenderer = null;
  } else {
    resizeWebGPU();
  }
}

function resizeWebGPU(): void {
  if (webgpuRenderer && webgpuCanvas.parentElement) {
    const rect = webgpuCanvas.parentElement.getBoundingClientRect();
    webgpuRenderer.resize(rect.width, rect.height);
  }
}

function getElevatorPosition(): { x: number; y: number } {
  if (!elevatorEl || !webgpuCanvas) return { x: 0, y: 0 };

  const elevRect = elevatorEl.getBoundingClientRect();
  const canvasRect = webgpuCanvas.getBoundingClientRect();

  return {
    x: elevRect.left - canvasRect.left + elevRect.width / 2,
    y: elevRect.top - canvasRect.top + elevRect.height / 2,
  };
}

function initGame(): void {
  game = new FloorGame();

  game.onStateChange = (state: GameState) => {
    renderFloors(state);
    renderElevator(state);
    updateUI(state);

    // Check for passenger delivery
    const currentRemaining = game.getRemainingPassengers();
    if (currentRemaining < previousPassengerCount && state.status === "playing") {
      audioSystem.playDelivered();
      const pos = getElevatorPosition();
      webgpuRenderer?.emitPassengerExit(pos.x, pos.y);
    }
    previousPassengerCount = currentRemaining;

    if (state.status === "won") {
      audioSystem.playVictory();
      webgpuRenderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 600);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", resizeWebGPU);
}

function createFloors(count: number): void {
  floorsEl.innerHTML = "";

  for (let f = 1; f <= count; f++) {
    const floor = document.createElement("div");
    floor.className = "floor";
    floor.dataset.floor = f.toString();

    const floorNum = document.createElement("span");
    floorNum.className = "floor-number";
    floorNum.textContent = f.toString();

    const passengers = document.createElement("div");
    passengers.className = "floor-passengers";
    passengers.id = `floor-${f}-passengers`;

    floor.appendChild(floorNum);
    floor.appendChild(passengers);
    floorsEl.appendChild(floor);
  }
}

function renderFloors(state: GameState): void {
  // Recreate floors if count changed
  if (floorsEl.children.length !== state.floors) {
    createFloors(state.floors);
  }

  // Update current floor highlight
  const floors = floorsEl.querySelectorAll(".floor");
  floors.forEach((floor) => {
    const floorNum = parseInt(floor.getAttribute("data-floor")!);
    floor.classList.toggle("current", floorNum === state.elevatorFloor);
  });

  // Render waiting passengers on each floor
  for (let f = 1; f <= state.floors; f++) {
    const container = document.getElementById(`floor-${f}-passengers`);
    if (!container) continue;

    container.innerHTML = "";

    const waitingPassengers = game.getPassengersOnFloor(f);
    waitingPassengers.forEach((p) => {
      const passengerEl = createPassengerElement(p);
      container.appendChild(passengerEl);
    });
  }
}

function renderElevator(state: GameState): void {
  // Position elevator
  const floorHeight = 54; // Approximate height per floor
  const bottomOffset = (state.elevatorFloor - 1) * floorHeight;
  elevatorEl.style.bottom = `${bottomOffset}px`;

  // Update floor display
  elevatorFloorDisplay.textContent = state.elevatorFloor.toString();

  // Render passengers in elevator
  elevatorPassengersEl.innerHTML = "";
  const ridingPassengers = game.getPassengersInElevator();
  ridingPassengers.forEach((p) => {
    const passengerEl = createPassengerElement(p);
    elevatorPassengersEl.appendChild(passengerEl);
  });
}

function createPassengerElement(passenger: Passenger): HTMLElement {
  const el = document.createElement("div");
  el.className = `passenger ${passenger.status}`;
  el.textContent = passenger.destinationFloor.toString();
  el.title = `Going to floor ${passenger.destinationFloor}`;
  return el;
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  passengersDisplay.textContent = game.getRemainingPassengers().toString();
}

function handleKeydown(e: KeyboardEvent): void {
  if (game.getState().status !== "playing") return;

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      e.preventDefault();
      handleMoveUp();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      e.preventDefault();
      handleMoveDown();
      break;
    case " ":
    case "Enter":
      e.preventDefault();
      handleBoard();
      break;
  }
}

function handleMoveUp(): void {
  audioSystem.init();
  const pos = getElevatorPosition();

  if (game.moveUp()) {
    audioSystem.playElevatorMove('up');
    webgpuRenderer?.emitElevatorMove(pos.x, pos.y, 'up');

    setTimeout(() => {
      webgpuRenderer?.emitElevatorArrive(pos.x, pos.y - 54);
    }, 300);
  }
}

function handleMoveDown(): void {
  audioSystem.init();
  const pos = getElevatorPosition();

  if (game.moveDown()) {
    audioSystem.playElevatorMove('down');
    webgpuRenderer?.emitElevatorMove(pos.x, pos.y, 'down');

    setTimeout(() => {
      webgpuRenderer?.emitElevatorArrive(pos.x, pos.y + 54);
    }, 300);
  }
}

function handleBoard(): void {
  audioSystem.init();
  const ridingBefore = game.getPassengersInElevator().length;
  game.boardPassengers();
  const ridingAfter = game.getPassengersInElevator().length;

  if (ridingAfter > ridingBefore) {
    audioSystem.playBoard();
    const pos = getElevatorPosition();
    webgpuRenderer?.emitPassengerBoard(pos.x, pos.y);
  } else {
    audioSystem.playDing();
    const pos = getElevatorPosition();
    webgpuRenderer?.emitElevatorArrive(pos.x, pos.y);
  }
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${state.moves}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      previousPassengerCount = game.getRemainingPassengers();
      audioSystem.playLevelStart();
      webgpuRenderer?.emitLevelStart();
    };
  }
}

function startGame(level: number = 1): void {
  audioSystem.init();
  overlay.style.display = "none";
  game.start(level);
  previousPassengerCount = game.getRemainingPassengers();
  audioSystem.playLevelStart();
  webgpuRenderer?.emitLevelStart();
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audioSystem.init();
  game.reset();
  previousPassengerCount = game.getRemainingPassengers();
  audioSystem.playReset();
  webgpuRenderer?.emitReset();
});
upBtn.addEventListener("click", handleMoveUp);
downBtn.addEventListener("click", handleMoveDown);
boardBtn.addEventListener("click", handleBoard);

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});

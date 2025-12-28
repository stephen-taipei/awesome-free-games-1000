/**
 * Robot Program Main Entry
 * Game #095 - With WebGPU Effects
 */
import { RobotProgramGame, Command, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

const i18n = {
  locale: "en" as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Audio System for Robot/Cyber sounds
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

  // Command added - digital beep
  playAddCommand() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  // Robot move - servo sound
  playRobotMove() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // Wall hit - error buzz
  playWallHit() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(100, this.audioContext.currentTime);

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);

    // Secondary buzz
    setTimeout(() => {
      this.playTone(80, 0.2, "square", 0.1);
    }, 100);
  }

  // Goal reached - success chime
  playGoalReached() {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, "sine", 0.12);
      }, i * 80);
    });
  }

  // Run program - boot sound
  playRunProgram() {
    if (!this.audioContext) return;

    this.playTone(300, 0.1, "square", 0.08);
    setTimeout(() => this.playTone(400, 0.1, "square", 0.08), 50);
    setTimeout(() => this.playTone(600, 0.15, "square", 0.1), 100);
  }

  // Victory - robot celebration
  playVictory() {
    if (!this.audioContext) return;

    const melody = [523, 659, 784, 880, 784, 880, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "square", 0.1);
      }, i * 100);
    });
  }

  // Level start - activation sound
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(200, 0.1, "sine", 0.08);
    setTimeout(() => this.playTone(400, 0.1, "sine", 0.08), 80);
    setTimeout(() => this.playTone(600, 0.15, "sine", 0.1), 160);
    setTimeout(() => this.playTone(800, 0.2, "sine", 0.12), 240);
  }

  // Reset - deactivation
  playReset() {
    if (!this.audioContext) return;

    this.playTone(600, 0.1, "triangle", 0.08);
    setTimeout(() => this.playTone(400, 0.1, "triangle", 0.06), 60);
    setTimeout(() => this.playTone(200, 0.15, "triangle", 0.05), 120);
  }

  // Clear commands
  playClear() {
    this.playTone(300, 0.15, "square", 0.06);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const commandsDisplay = document.getElementById("commands-display")!;
const commandList = document.getElementById("command-list")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const runBtn = document.getElementById("run-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const cmdButtons = document.querySelectorAll(".cmd-btn");

let game: RobotProgramGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();

const commandSymbols: Record<Command, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

function initI18n() {
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

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function renderCommandList(commands: Command[], executingIndex = -1) {
  commandList.innerHTML = "";

  commands.forEach((cmd, index) => {
    const item = document.createElement("div");
    item.className = `command-item ${index === executingIndex ? "executing" : ""}`;

    const label = document.createElement("span");
    label.textContent = `${index + 1}. ${commandSymbols[cmd]}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-cmd";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      game.removeCommand(index);
    });

    item.appendChild(label);
    item.appendChild(removeBtn);
    commandList.appendChild(item);
  });
}

async function initWebGPU() {
  if (!webgpuCanvas) return;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    console.warn("WebGPU not available, running without effects");
    webgpuRenderer = null;
  }
}

function initGame() {
  game = new RobotProgramGame(canvas);
  game.resize();

  if (webgpuRenderer && webgpuCanvas.parentElement) {
    const rect = webgpuCanvas.parentElement.getBoundingClientRect();
    webgpuRenderer.resize(rect.width, rect.height);
  }

  // Command buttons
  cmdButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      audioSystem.init();
      const cmd = (btn as HTMLElement).dataset.cmd;
      if (cmd === "clear") {
        game.clearCommands();
        audioSystem.playClear();
        webgpuRenderer?.emitReset();
      } else if (cmd) {
        const added = game.addCommand(cmd as Command);
        if (added) {
          audioSystem.playAddCommand();
          // Emit visual effect at button position
          const rect = (btn as HTMLElement).getBoundingClientRect();
          const canvasRect = webgpuCanvas?.getBoundingClientRect();
          if (canvasRect) {
            const x = rect.left + rect.width / 2 - canvasRect.left;
            const y = rect.top + rect.height / 2 - canvasRect.top;
            webgpuRenderer?.emitAddCommand(x, y, cmd);
          }
        }
      }
    });
  });

  game.setOnStateChange((state: GameState) => {
    // Handle game events
    if (state.event) {
      switch (state.event) {
        case "addCommand":
          // Handled in button click
          break;

        case "removeCommand":
          audioSystem.playClear();
          break;

        case "clearCommands":
          audioSystem.playClear();
          webgpuRenderer?.emitReset();
          break;

        case "run":
          audioSystem.playRunProgram();
          if (state.robotX !== undefined && state.robotY !== undefined) {
            webgpuRenderer?.emitRunProgram(state.robotX, state.robotY);
          }
          break;

        case "move":
          audioSystem.playRobotMove();
          if (state.robotX !== undefined && state.robotY !== undefined) {
            webgpuRenderer?.emitRobotMove(
              state.robotX,
              state.robotY,
              state.direction ?? "right"
            );
          }
          break;

        case "wallHit":
          audioSystem.playWallHit();
          if (state.robotX !== undefined && state.robotY !== undefined) {
            webgpuRenderer?.emitWallHit(state.robotX, state.robotY);
          }
          break;

        case "goalReached":
          audioSystem.playGoalReached();
          if (state.goalX !== undefined && state.goalY !== undefined) {
            webgpuRenderer?.emitGoalReached(state.goalX, state.goalY);
          }
          break;

        case "victory":
          audioSystem.playVictory();
          webgpuRenderer?.emitVictory();
          break;

        case "levelStart":
          audioSystem.playLevelStart();
          if (state.robotX !== undefined && state.robotY !== undefined) {
            webgpuRenderer?.emitLevelStart(state.robotX, state.robotY);
          }
          break;

        case "reset":
          audioSystem.playReset();
          webgpuRenderer?.emitReset();
          break;
      }
    }

    // Update UI
    if (state.commands !== undefined) {
      commandsDisplay.textContent = state.commands;
    }

    if (state.commandList !== undefined) {
      renderCommandList(state.commandList, state.executingIndex ?? -1);
    }

    if (state.executingIndex !== undefined) {
      renderCommandList(game.getCommands(), state.executingIndex);
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "failed") {
      showFailed();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (webgpuRenderer && webgpuCanvas.parentElement) {
      const rect = webgpuCanvas.parentElement.getBoundingClientRect();
      webgpuRenderer.resize(rect.width, rect.height);
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 500);
}

function showFailed() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.failed");
    overlayMsg.textContent = "";
    nextBtn.style.display = "none";
    startBtn.textContent = i18n.t("game.reset");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  renderCommandList([]);
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  renderCommandList([]);
}

startBtn.addEventListener("click", startGame);
runBtn.addEventListener("click", () => {
  audioSystem.init();
  game.run();
});
resetBtn.addEventListener("click", () => {
  game.reset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});

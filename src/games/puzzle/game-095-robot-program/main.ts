/**
 * Robot Program Main Entry
 * Game #095
 */
import { RobotProgramGame, Command } from "./game";
import { translations } from "./i18n";

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

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
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

function initGame() {
  game = new RobotProgramGame(canvas);
  game.resize();

  // Command buttons
  cmdButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = (btn as HTMLElement).dataset.cmd;
      if (cmd === "clear") {
        game.clearCommands();
      } else if (cmd) {
        game.addCommand(cmd as Command);
      }
    });
  });

  game.setOnStateChange((state: any) => {
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
  game.run();
});
resetBtn.addEventListener("click", () => {
  game.reset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();

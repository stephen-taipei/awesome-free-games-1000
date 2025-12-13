/**
 * Symmetry Draw Main Entry
 * Game #089
 */
import { SymmetryDrawGame, SymmetryMode } from "./game";
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
const modeDisplay = document.getElementById("mode-display")!;

const overlay = document.getElementById("game-overlay")!;
const startBtn = document.getElementById("start-btn")!;
const modeBtn = document.getElementById("mode-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const saveBtn = document.getElementById("save-btn")!;
const brushSizeInput = document.getElementById("brush-size") as HTMLInputElement;

const colorButtons = document.querySelectorAll(".color-btn");

let game: SymmetryDrawGame;

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
    updateModeDisplay();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function updateModeDisplay() {
  const mode = game.getMode();
  const modeNames: Record<SymmetryMode, string> = {
    vertical: i18n.t("game.vertical"),
    horizontal: i18n.t("game.horizontal"),
    quad: i18n.t("game.quad"),
    radial: i18n.t("game.radial"),
  };
  modeDisplay.textContent = modeNames[mode];
}

function initGame() {
  game = new SymmetryDrawGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("down", e.clientX - rect.left, e.clientY - rect.top);
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", e.clientX - rect.left, e.clientY - rect.top);
  });

  window.addEventListener("mouseup", () => {
    game.handleInput("up", 0, 0);
  });

  // Touch inputs
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      game.handleInput("down", touch.clientX - rect.left, touch.clientY - rect.top);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      game.handleInput("move", touch.clientX - rect.left, touch.clientY - rect.top);
    },
    { passive: false }
  );

  window.addEventListener("touchend", () => {
    game.handleInput("up", 0, 0);
  });

  game.setOnStateChange((state: any) => {
    if (state.mode !== undefined) {
      updateModeDisplay();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
  });

  // Color buttons
  colorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const color = (btn as HTMLElement).dataset.color;
      if (color) game.setColor(color);
    });
  });

  // Brush size
  brushSizeInput.addEventListener("input", () => {
    game.setBrushSize(parseInt(brushSizeInput.value));
  });
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  updateModeDisplay();
}

startBtn.addEventListener("click", startGame);

modeBtn.addEventListener("click", () => {
  game.nextMode();
});

clearBtn.addEventListener("click", () => {
  game.clear();
});

saveBtn.addEventListener("click", () => {
  game.save();
});

// Init
initI18n();
initGame();

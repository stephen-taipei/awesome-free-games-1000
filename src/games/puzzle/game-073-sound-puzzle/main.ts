/**
 * Sound Puzzle Main Entry
 * Game #073
 */
import { SoundPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const nextBtn = document.getElementById("next-btn")!;
const playBtn = document.getElementById("play-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

const noteButtons = document.querySelectorAll(".note-btn") as NodeListOf<HTMLButtonElement>;
const phaseDisplay = document.getElementById("phase-display")!;

let game: SoundPuzzleGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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

function initGame() {
  game = new SoundPuzzleGame();

  // Set up note button colors
  const notes = game.getNotes();
  noteButtons.forEach((btn, index) => {
    if (notes[index]) {
      btn.style.backgroundColor = notes[index].color;
      btn.dataset.noteId = index.toString();
    }
  });

  // Note button click handlers
  noteButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const noteId = parseInt(btn.dataset.noteId || "0");
      await game.pressNote(noteId);
    });

    btn.addEventListener("mousedown", () => {
      const noteId = parseInt(btn.dataset.noteId || "0");
      const note = notes[noteId];
      if (note) {
        btn.style.backgroundColor = note.activeColor;
        btn.style.transform = "scale(0.95)";
      }
    });

    btn.addEventListener("mouseup", () => {
      const noteId = parseInt(btn.dataset.noteId || "0");
      const note = notes[noteId];
      if (note) {
        btn.style.backgroundColor = note.color;
        btn.style.transform = "scale(1)";
      }
    });

    btn.addEventListener("mouseleave", () => {
      const noteId = parseInt(btn.dataset.noteId || "0");
      const note = notes[noteId];
      if (note) {
        btn.style.backgroundColor = note.color;
        btn.style.transform = "scale(1)";
      }
    });
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    scoreDisplay.textContent = state.score?.toString() || "0";

    // Update phase display
    if (state.phase === "ready") {
      phaseDisplay.textContent = i18n.t("game.hint");
      playBtn.style.display = "inline-block";
      enableNotes(false);
    } else if (state.phase === "listening") {
      phaseDisplay.textContent = i18n.t("game.listening");
      playBtn.style.display = "none";
      enableNotes(false);
    } else if (state.phase === "playerTurn") {
      phaseDisplay.textContent = i18n.t("game.yourTurn");
      playBtn.style.display = "none";
      enableNotes(true);
    }

    // Update active note visual
    const notes = game.getNotes();
    noteButtons.forEach((btn, index) => {
      if (state.activeNote === index) {
        btn.style.backgroundColor = notes[index].activeColor;
        btn.style.transform = "scale(1.1)";
        btn.style.boxShadow = `0 0 30px ${notes[index].activeColor}`;
      } else {
        btn.style.backgroundColor = notes[index].color;
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = `0 4px 15px ${notes[index].color}80`;
      }
    });

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    } else if (state.status === "failed") {
      phaseDisplay.textContent = i18n.t("game.reset");
      enableNotes(false);
    }
  });
}

function enableNotes(enabled: boolean) {
  noteButtons.forEach((btn) => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.6";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "";
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.score}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  playBtn.style.display = "inline-block";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
});
playBtn.addEventListener("click", () => game.playSequence());

initI18n();
initGame();

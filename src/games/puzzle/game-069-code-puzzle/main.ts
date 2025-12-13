/**
 * Code Puzzle Main Entry
 * Game #069
 */
import { CodePuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const attemptsDisplay = document.getElementById("attempts-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const puzzleArea = document.getElementById("puzzle-area")!;
const puzzleType = document.getElementById("puzzle-type")!;
const encodedText = document.getElementById("encoded-text")!;
const clueText = document.getElementById("clue-text")!;
const answerInput = document.getElementById("answer-input") as HTMLInputElement;
const submitBtn = document.getElementById("submit-btn")!;
const feedbackMsg = document.getElementById("feedback-msg")!;

let game: CodePuzzleGame;

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
    game.setLocale(i18n.getLocale());
    updateTexts();
    updatePuzzleDisplay();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new CodePuzzleGame();
  game.setLocale(i18n.getLocale());

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    attemptsDisplay.textContent = state.attempts.toString();

    if (state.wrong) {
      feedbackMsg.textContent = i18n.t("game.wrong");
      feedbackMsg.style.color = "#e74c3c";
      feedbackMsg.style.display = "block";
      answerInput.classList.add("shake");
      setTimeout(() => {
        answerInput.classList.remove("shake");
        feedbackMsg.style.display = "none";
      }, 1500);
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    }
  });
}

function updatePuzzleDisplay() {
  const type = game.getPuzzleType();
  if (!type) return;

  const typeNames: { [key: string]: { [lang: string]: string } } = {
    caesar: { "zh-TW": "凱撒密碼", "zh-CN": "凯撒密码", en: "Caesar Cipher", ja: "シーザー暗号", ko: "시저 암호" },
    number: { "zh-TW": "數字規律", "zh-CN": "数字规律", en: "Number Pattern", ja: "数字パターン", ko: "숫자 패턴" },
    symbol: { "zh-TW": "符號替換", "zh-CN": "符号替换", en: "Symbol Substitution", ja: "記号置換", ko: "기호 치환" },
    binary: { "zh-TW": "二進制", "zh-CN": "二进制", en: "Binary", ja: "バイナリ", ko: "이진법" },
    morse: { "zh-TW": "摩斯密碼", "zh-CN": "摩斯密码", en: "Morse Code", ja: "モールス信号", ko: "모스 부호" },
  };

  const locale = i18n.getLocale();
  puzzleType.textContent = typeNames[type][locale] || typeNames[type]["en"];
  encodedText.textContent = game.getEncodedText();
  clueText.textContent = `${i18n.t("game.clue")}: ${game.getClue()}`;
  answerInput.value = "";
  feedbackMsg.style.display = "none";
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.attempts")}: ${attemptsDisplay.textContent}`;
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
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
  puzzleArea.style.display = "block";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  updatePuzzleDisplay();
}

function submitAnswer() {
  const answer = answerInput.value.trim();
  if (!answer) return;
  game.checkAnswer(answer);
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  updatePuzzleDisplay();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  updatePuzzleDisplay();
});

submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") submitAnswer();
});

initI18n();
initGame();

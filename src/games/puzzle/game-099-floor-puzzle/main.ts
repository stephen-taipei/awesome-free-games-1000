/**
 * Floor Puzzle Main Entry
 * Game #099
 */
import { FloorGame, GameState, Passenger } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

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

let game: FloorGame;

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

function initGame(): void {
  game = new FloorGame();

  game.onStateChange = (state: GameState) => {
    renderFloors(state);
    renderElevator(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 600);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
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
      game.moveUp();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      e.preventDefault();
      game.moveDown();
      break;
    case " ":
    case "Enter":
      e.preventDefault();
      game.boardPassengers();
      break;
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
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
upBtn.addEventListener("click", () => game.moveUp());
downBtn.addEventListener("click", () => game.moveDown());
boardBtn.addEventListener("click", () => game.boardPassengers());

// Initialize
initI18n();
initGame();

/**
 * Molecule Connect Main Entry
 * Game #103
 */
import { MoleculeGame, GameState, Atom, AtomType } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const bondsDisplay = document.getElementById("bonds-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const clearBtn = document.getElementById("clear-btn")!;

let game: MoleculeGame;
let dragging = false;
let dragStart: Atom | null = null;
let dragEnd: { x: number; y: number } | null = null;

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
  resizeCanvas();

  game = new MoleculeGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  // Mouse events
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);

  // Touch events
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function findAtomAt(x: number, y: number): Atom | null {
  const state = game.getState();
  for (const atom of state.atoms) {
    const props = game.getAtomProperties(atom.type);
    const dist = Math.sqrt((x - atom.x) ** 2 + (y - atom.y) ** 2);
    if (dist <= props.radius + 5) {
      return atom;
    }
  }
  return null;
}

function handleMouseDown(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const atom = findAtomAt(x, y);

  if (atom) {
    dragging = true;
    dragStart = atom;
    dragEnd = { x, y };
  }
}

function handleMouseMove(e: MouseEvent): void {
  if (!dragging || !dragStart) return;

  const { x, y } = getCanvasCoords(e);
  dragEnd = { x, y };
  render(game.getState());
}

function handleMouseUp(e: MouseEvent): void {
  if (!dragging || !dragStart) {
    dragging = false;
    dragStart = null;
    dragEnd = null;
    return;
  }

  const { x, y } = getCanvasCoords(e);
  const endAtom = findAtomAt(x, y);

  if (endAtom && endAtom.id !== dragStart.id) {
    game.addBond(dragStart.id, endAtom.id);
  }

  dragging = false;
  dragStart = null;
  dragEnd = null;
  render(game.getState());
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  const atom = findAtomAt(x, y);

  if (atom) {
    dragging = true;
    dragStart = atom;
    dragEnd = { x, y };
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!dragging || !dragStart) return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  dragEnd = { x, y };
  render(game.getState());
}

function handleTouchEnd(e: TouchEvent): void {
  if (!dragging || !dragStart || !dragEnd) {
    dragging = false;
    dragStart = null;
    dragEnd = null;
    return;
  }

  const endAtom = findAtomAt(dragEnd.x, dragEnd.y);

  if (endAtom && endAtom.id !== dragStart.id) {
    game.addBond(dragStart.id, endAtom.id);
  }

  dragging = false;
  dragStart = null;
  dragEnd = null;
  render(game.getState());
}

function render(state: GameState): void {
  const { width, height } = canvas;

  // Clear
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Draw grid pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw target bonds (ghost)
  ctx.strokeStyle = "rgba(0, 255, 136, 0.2)";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  state.targetBonds.forEach((bond) => {
    const atom1 = state.atoms.find((a) => a.id === bond.atom1)!;
    const atom2 = state.atoms.find((a) => a.id === bond.atom2)!;
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Draw existing bonds
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 10;
  state.bonds.forEach((bond) => {
    const atom1 = state.atoms.find((a) => a.id === bond.atom1)!;
    const atom2 = state.atoms.find((a) => a.id === bond.atom2)!;
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Draw drag line
  if (dragging && dragStart && dragEnd) {
    ctx.strokeStyle = "rgba(0, 255, 136, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragEnd.x, dragEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw atoms
  state.atoms.forEach((atom) => {
    const props = game.getAtomProperties(atom.type);

    // Glow
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, props.radius + 5, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      atom.x,
      atom.y,
      props.radius,
      atom.x,
      atom.y,
      props.radius + 15
    );
    gradient.addColorStop(0, props.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, props.radius, 0, Math.PI * 2);
    ctx.fillStyle = props.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = atom.type === "H" ? "#333" : "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(atom.type, atom.x, atom.y);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  bondsDisplay.textContent = `${game.getCurrentBonds()}/${game.getRequiredBonds()}`;
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
    overlayMsg.textContent = `${i18n.t("game.level")} ${state.level} ${i18n.t("game.win")}`;
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
clearBtn.addEventListener("click", () => game.clearBonds());

// Initialize
initI18n();
initGame();

import { MusicRunGame, GameState, Obstacle, Collectible, SoundWave } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const notesDisplay = document.getElementById("notes-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: MusicRunGame;
let animationFrame: number | null = null;

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener("change", () => { i18n.setLocale(languageSelect.value as Locale); updateTexts(); });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();
  game = new MusicRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
}

function resizeCanvas(): void {
  canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Music studio background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#1a1a2e");
  bgGradient.addColorStop(0.5, "#16213e");
  bgGradient.addColorStop(1, "#0f3460");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Equalizer bars in background
  const beatPulse = Math.sin(Date.now() * 0.01 + state.beat) * 0.3 + 0.7;
  const eqColors = ['#FF1493', '#00CED1', '#FFD700', '#32CD32', '#FF6347'];
  for (let i = 0; i < 15; i++) {
    const barHeight = (30 + Math.sin(Date.now() * 0.005 + i * 0.5) * 25) * beatPulse;
    ctx.fillStyle = eqColors[i % eqColors.length];
    ctx.globalAlpha = 0.3;
    ctx.fillRect(i * 32 + 5, height - 85 - barHeight, 25, barHeight);
  }
  ctx.globalAlpha = 1;

  // Sound waves
  state.soundWaves.forEach(wave => drawSoundWave(wave));

  // Stage floor
  const groundY = height - 65;
  const stageGradient = ctx.createLinearGradient(0, groundY, 0, height);
  stageGradient.addColorStop(0, "#2d2d44");
  stageGradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = stageGradient;
  ctx.fillRect(0, groundY + 20, width, 50);

  // Stage lights reflection
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 5; i++) {
    const lightX = i * 100 + 50 + Math.sin(Date.now() * 0.002 + i) * 20;
    const gradient = ctx.createRadialGradient(lightX, groundY + 30, 0, lightX, groundY + 30, 60);
    gradient.addColorStop(0, eqColors[i % eqColors.length]);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(lightX - 60, groundY + 20, 120, 50);
  }
  ctx.globalAlpha = 1;

  // Lane markers (neon lines)
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) {
    const gradient = ctx.createLinearGradient(i * (width / 3), groundY - 60, i * (width / 3), groundY + 20);
    gradient.addColorStop(0, "rgba(255, 20, 147, 0)");
    gradient.addColorStop(0.5, "rgba(255, 20, 147, 0.8)");
    gradient.addColorStop(1, "rgba(255, 20, 147, 0)");
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 20, 147, 0.9)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);

  // Combo indicator
  if (state.combo > 1) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.8;
    ctx.fillText("x" + state.combo, state.player.x, state.player.y - 60);
    ctx.globalAlpha = 1;
  }
}

function drawSoundWave(wave: SoundWave): void {
  ctx.strokeStyle = wave.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = wave.alpha;
  ctx.beginPath();
  ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  const beatPulse = 1 + Math.sin(Date.now() * 0.02 + state.beat) * 0.05;
  ctx.scale(beatPulse, beatPulse);

  // DJ character body
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-14, -20, 28, 38);

  // Hoodie
  ctx.fillStyle = "#9370DB";
  ctx.beginPath();
  ctx.moveTo(-14, -20);
  ctx.lineTo(14, -20);
  ctx.lineTo(14, 10);
  ctx.lineTo(-14, 10);
  ctx.closePath();
  ctx.fill();

  // Hood
  ctx.beginPath();
  ctx.arc(0, -25, 12, Math.PI, 0);
  ctx.fill();

  // Head
  ctx.fillStyle = "#FFDAB9";
  ctx.beginPath();
  ctx.arc(0, -30, 10, 0, Math.PI * 2);
  ctx.fill();

  // Headphones
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -33, 14, Math.PI + 0.3, -0.3);
  ctx.stroke();
  ctx.fillStyle = "#FF1493";
  ctx.beginPath();
  ctx.arc(-12, -28, 6, 0, Math.PI * 2);
  ctx.arc(12, -28, 6, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (closed, feeling the music)
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -31);
  ctx.lineTo(-1, -31);
  ctx.moveTo(1, -31);
  ctx.lineTo(5, -31);
  ctx.stroke();

  // Smile
  ctx.beginPath();
  ctx.arc(0, -27, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Arms (swaying to music)
  const armSwing = Math.sin(Date.now() * 0.01) * 15;
  ctx.fillStyle = "#9370DB";
  ctx.save();
  ctx.translate(-14, -10);
  ctx.rotate((armSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 20);
  ctx.restore();
  ctx.save();
  ctx.translate(14, -10);
  ctx.rotate((-armSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 20);
  ctx.restore();

  // Legs
  ctx.fillStyle = "#1a1a2e";
  const legSwing = Math.sin(Date.now() * 0.015) * 6;
  ctx.save();
  ctx.translate(-6, 18);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 14);
  ctx.restore();
  ctx.save();
  ctx.translate(6, 18);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 14);
  ctx.restore();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "speaker":
      // Speaker cabinet
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = obs.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Woofer
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(0, 5, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(0, 5, 8, 0, Math.PI * 2);
      ctx.fill();
      // Tweeter
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(0, -15, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "drum":
      // Drum body
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, obs.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Drum top
      ctx.fillStyle = "#F5F5DC";
      ctx.beginPath();
      ctx.ellipse(0, -obs.height / 3, obs.width / 2, obs.height / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Rim
      ctx.strokeStyle = "#C0C0C0";
      ctx.lineWidth = 3;
      ctx.stroke();
      break;

    case "piano":
      // Piano body
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // White keys
      ctx.fillStyle = "#FFFFF0";
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(-obs.width / 2 + 2 + i * 7, -obs.height / 2 + 5, 6, obs.height - 10);
      }
      // Black keys
      ctx.fillStyle = "#1a1a2e";
      const blackKeyPos = [1, 2, 4, 5, 6];
      for (const pos of blackKeyPos) {
        ctx.fillRect(-obs.width / 2 + pos * 7, -obs.height / 2 + 5, 5, (obs.height - 10) * 0.6);
      }
      break;

    case "guitar":
      // Guitar body
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.ellipse(0, 8, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sound hole
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(0, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      // Neck
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(-5, -obs.height / 2, 10, obs.height / 2 - 5);
      // Strings
      ctx.strokeStyle = "#C0C0C0";
      ctx.lineWidth = 0.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 2, -obs.height / 2);
        ctx.lineTo(i * 2, 25);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y);

  const float = Math.sin(Date.now() * 0.008) * 5;
  ctx.translate(0, float);
  const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  const noteColors = ['#FF1493', '#00CED1', '#FFD700'];
  const color = noteColors[col.lane % 3];

  switch (col.type) {
    case "note":
      ctx.fillStyle = color;
      // Note head
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Stem
      ctx.fillRect(6, -20, 3, 20);
      // Flag for eighth note
      if (col.noteType === 'eighth') {
        ctx.beginPath();
        ctx.moveTo(9, -20);
        ctx.quadraticCurveTo(18, -15, 12, -8);
        ctx.lineTo(9, -10);
        ctx.fill();
      }
      break;

    case "treble":
      // Treble clef (simplified)
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 28px serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1D11E}", 0, 8);
      break;

    case "bass":
      // Bass clef (simplified)
      ctx.fillStyle = "#9370DB";
      ctx.font = "bold 28px serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1D122}", 0, 8);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  notesDisplay.textContent = state.notes.toString();
  comboDisplay.textContent = "x" + state.combo;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  const distLabel = i18n.t("game.distance");
  const notesLabel = i18n.t("game.notes");
  const maxComboLabel = i18n.t("game.maxCombo");
  statsGrid.innerHTML = '<div class="stat-item"><div class="stat-label">' + distLabel + '</div><div class="stat-value">' + Math.floor(state.distance) + 'm</div></div><div class="stat-item"><div class="stat-label">' + notesLabel + '</div><div class="stat-value">' + state.notes + '</div></div><div class="stat-item"><div class="stat-label">' + maxComboLabel + '</div><div class="stat-value">x' + state.maxCombo + '</div></div>';
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  statsGrid.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();

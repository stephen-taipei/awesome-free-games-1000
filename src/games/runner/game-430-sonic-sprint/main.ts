import { SonicSprintGame, GameState, Obstacle, Collectible, Particle, SoundWave } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const notesDisplay = document.getElementById("notes-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const sonicBar = document.getElementById("sonic-bar")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SonicSprintGame;
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
  game = new SonicSprintGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
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
  const boomBtn = document.getElementById("boom-btn");
  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  boomBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.activateBoost(); });
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

  // Musical background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0a2e");
  gradient.addColorStop(0.5, "#2d1b4e");
  gradient.addColorStop(1, "#1a0a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Beat pulse background (rhythm indicator)
  const beatPhase = (Date.now() % 500) / 500;
  const beatAlpha = Math.sin(beatPhase * Math.PI) * 0.15;
  ctx.fillStyle = `rgba(155, 89, 182, ${beatAlpha})`;
  ctx.fillRect(0, 0, width, height);

  // Musical staff lines in background
  ctx.strokeStyle = "rgba(155, 89, 182, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 80 + i * 25;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Ground (stage)
  const groundY = height - 75;
  ctx.fillStyle = "#2a1a3a";
  ctx.fillRect(0, groundY + 20, width, 55);

  // Stage lights effect
  ctx.strokeStyle = state.player.isBoosting ? "#ffd93d" : "#9b59b6";
  ctx.lineWidth = 4;
  ctx.shadowBlur = state.player.isBoosting ? 25 : 12;
  ctx.shadowColor = state.player.isBoosting ? "#ffd93d" : "#9b59b6";
  ctx.beginPath();
  ctx.moveTo(0, groundY + 20);
  ctx.lineTo(width, groundY + 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lane lines
  ctx.strokeStyle = "rgba(155, 89, 182, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 100);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(155, 89, 182, 0.6)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Sound waves
  state.soundWaves.forEach(wave => drawSoundWave(wave));

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);

  // Combo display (big text when combo is high)
  if (state.combo >= 5) {
    ctx.fillStyle = `rgba(255, 217, 61, ${0.6 + Math.sin(Date.now() * 0.01) * 0.2})`;
    ctx.font = `bold ${24 + state.combo}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`${state.combo}x COMBO!`, width / 2, 60);
  }
}

function drawSoundWave(wave: SoundWave): void {
  const alpha = wave.life / 30;
  ctx.strokeStyle = `rgba(155, 89, 182, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = `rgba(255, 217, 61, ${alpha * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wave.x, wave.y, wave.radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Boost aura
  if (player.isBoosting) {
    ctx.shadowBlur = 35;
    ctx.shadowColor = '#ffd93d';

    // Rainbow aura
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
    gradient.addColorStop(0, 'rgba(255, 217, 61, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.2)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Speaker/music player body
  ctx.fillStyle = player.isBoosting ? '#ffd93d' : '#9b59b6';

  // Main body (speaker cone shape)
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = player.isBoosting ? '#ff6b6b' : '#6c3483';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Sound wave emanating
  ctx.strokeStyle = player.isBoosting ? '#ffffff' : '#bb88dd';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const waveOffset = (Date.now() * 0.01 + i * 10) % 30;
    ctx.globalAlpha = 1 - waveOffset / 30;
    ctx.beginPath();
    ctx.arc(10, 0, 5 + waveOffset, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Musical note icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', 0, 0);

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "sound_barrier":
      // Sound barrier (jagged waves)
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const r = i % 2 === 0 ? 25 : 15;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case "noise_block":
      // Static noise block
      ctx.fillStyle = "#555";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Static pattern
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "#888" : "#333";
        const px = -obs.width / 2 + Math.random() * obs.width;
        const py = -obs.height / 2 + Math.random() * obs.height;
        ctx.fillRect(px, py, 5, 5);
      }
      break;

    case "silence_zone":
      // Silence zone (muted area)
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Mute symbol
      ctx.fillStyle = "#666";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔇", 0, 0);
      break;

    case "discord":
      // Discordant note
      ctx.fillStyle = "#8e44ad";
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♯", 0, 0);
      // Warning ring
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 1;
  const rotation = Date.now() * 0.002;
  ctx.scale(pulse, pulse);

  const noteColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

  switch (col.type) {
    case "note":
      ctx.fillStyle = noteColors[col.noteType || 0];
      ctx.shadowBlur = 10;
      ctx.shadowColor = noteColors[col.noteType || 0];
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♪", 0, 0);
      ctx.shadowBlur = 0;
      break;

    case "chord":
      ctx.fillStyle = "#ffd93d";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffd93d";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♫", 0, 0);
      ctx.shadowBlur = 0;
      break;

    case "beat_boost":
      // Speaker icon
      ctx.fillStyle = "#9b59b6";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#9b59b6";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sound waves
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 15 + i * 5, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      }

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", 0, 0);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  comboDisplay.textContent = state.combo.toString();
  notesDisplay.textContent = state.notes.toString();
  speedDisplay.textContent = state.speed.toFixed(1);

  const sonicPercent = (state.player.sonicEnergy / state.player.maxSonicEnergy) * 100;
  sonicBar.style.width = sonicPercent + "%";
  sonicBar.style.background = state.player.isBoosting ?
    "linear-gradient(90deg, #ffd93d, #ff6b6b)" :
    "linear-gradient(90deg, #9b59b6, #8e44ad)";

  // Update combo display color based on combo
  if (state.combo >= 10) {
    comboDisplay.style.color = "#ffd93d";
  } else if (state.combo >= 5) {
    comboDisplay.style.color = "#ff6b6b";
  } else {
    comboDisplay.style.color = "#9b59b6";
  }
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.notes")}</div><div class="stat-value">${state.notes}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.maxCombo")}</div><div class="stat-value">${state.maxCombo}x</div></div>
  `;
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

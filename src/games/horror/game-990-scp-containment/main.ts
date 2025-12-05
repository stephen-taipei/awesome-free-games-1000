import { Game } from './game';
import { translations, SCP } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const powerBar = document.getElementById('power-bar')!;
const powerValue = document.getElementById('power-value')!;
const containmentBar = document.getElementById('containment-bar')!;
const containmentValue = document.getElementById('containment-value')!;
const terminal = document.getElementById('terminal')!;
const terminalOutput = document.getElementById('terminal-output')!;
const alertLight = document.getElementById('alert-light')!;
const statusLight = document.getElementById('status-light')!;
const scpPanel = document.getElementById('scp-panel')!;
const scpClass = document.getElementById('scp-class')!;
const scpNumber = document.getElementById('scp-number')!;
const scpDescription = document.getElementById('scp-description')!;
const lockdownBtn = document.getElementById('lockdown-btn')!;
const powerBtn = document.getElementById('power-btn')!;
const containBtn = document.getElementById('contain-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function render() {
  const stats = game.getStats();

  powerBar.style.width = `${stats.power}%`;
  powerValue.textContent = `${Math.floor(stats.power)}%`;
  containmentBar.style.width = `${stats.containment}%`;
  containmentValue.textContent = `${Math.floor(stats.containment)}%`;

  // Update lights
  if (stats.hasBreach) {
    alertLight.classList.add('active');
    terminal.classList.add('breach-active');
  } else {
    alertLight.classList.remove('active');
    terminal.classList.remove('breach-active');
  }

  if (stats.isRunning && !stats.hasBreach) {
    statusLight.classList.add('active');
  } else {
    statusLight.classList.remove('active');
  }

  // Lockdown visual
  const container = document.querySelector('.game-container')!;
  if (stats.isLockdown) {
    container.classList.add('lockdown-active');
    lockdownBtn.classList.add('active');
  } else {
    container.classList.remove('lockdown-active');
    lockdownBtn.classList.remove('active');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    lockdownBtn.disabled = stats.isLockdown;
    powerBtn.disabled = stats.power >= 100;
    containBtn.disabled = !stats.hasBreach;
  } else {
    startBtn.style.display = 'block';
    lockdownBtn.disabled = true;
    powerBtn.disabled = true;
    containBtn.disabled = true;
  }
}

function addTerminalLine(msg: string, type: string) {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = msg;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;

  // Limit lines
  while (terminalOutput.children.length > 20) {
    terminalOutput.removeChild(terminalOutput.firstChild!);
  }
}

function showSCPCard(scp: SCP) {
  scpClass.textContent = scp.class.toUpperCase();
  scpClass.className = `scp-class ${scp.class}`;
  scpNumber.textContent = scp.number;
  scpDescription.textContent = scp.description;
  scpPanel.classList.add('active');
}

function hideSCPCard() {
  scpPanel.classList.remove('active');
}

function handleGameEnd(win: boolean, score: number) {
  statusMsg.textContent = win
    ? `Shift complete! SCPs contained: ${score}`
    : `Facility lost. SCPs contained: ${score}`;
  statusMsg.className = `status-msg ${win ? 'success' : 'danger'}`;
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);
  game.setOnTerminalLog(addTerminalLine);
  game.setOnBreachStart(showSCPCard);
  game.setOnBreachEnd(hideSCPCard);
  game.setOnGameEnd(handleGameEnd);

  startBtn.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
    hideSCPCard();
    statusMsg.textContent = '';
    game.start();
  });

  lockdownBtn.addEventListener('click', () => game.lockdown());
  powerBtn.addEventListener('click', () => game.restorePower());
  containBtn.addEventListener('click', () => game.recontain());

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();

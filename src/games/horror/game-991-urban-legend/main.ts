import { Game } from './game';
import { translations, Legend } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const courageBar = document.getElementById('courage-bar')!;
const survivalBar = document.getElementById('survival-bar')!;
const storyCard = document.getElementById('story-card')!;
const legendIcon = document.getElementById('legend-icon')!;
const legendTitle = document.getElementById('legend-title')!;
const storyText = document.getElementById('story-text')!;
const cardImage = document.getElementById('card-image')!;
const choicesContainer = document.getElementById('choices')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const nextBtn = document.getElementById('next-btn')!;

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

  courageBar.style.width = `${stats.courage}%`;
  survivalBar.style.width = `${stats.survival}%`;

  if (stats.isRunning) {
    startBtn.classList.add('hidden');
  } else {
    startBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
  }
}

function showLegend(legend: Legend) {
  legendIcon.textContent = legend.icon;
  legendTitle.textContent = legend.title;
  storyText.textContent = legend.story;
  cardImage.textContent = legend.icon;

  storyCard.classList.add('fade-in');
  setTimeout(() => storyCard.classList.remove('fade-in'), 500);

  // Create choice buttons
  choicesContainer.innerHTML = '';
  legend.choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.addEventListener('click', () => {
      game.makeChoice(index);
    });
    choicesContainer.appendChild(btn);
  });

  nextBtn.classList.add('hidden');
}

function handleChoiceResult(correct: boolean, choiceIndex: number) {
  const buttons = choicesContainer.querySelectorAll('.choice-btn');

  buttons.forEach((btn, index) => {
    (btn as HTMLButtonElement).disabled = true;
    if (index === choiceIndex) {
      btn.classList.add(correct ? 'correct' : 'wrong');
    }
  });

  if (correct) {
    storyCard.classList.add('success-glow');
    setTimeout(() => storyCard.classList.remove('success-glow'), 1000);
  } else {
    storyCard.classList.add('shake');
    setTimeout(() => storyCard.classList.remove('shake'), 500);
  }

  // Show next button after delay
  setTimeout(() => {
    const stats = game.getStats();
    if (stats.isRunning && stats.survival > 0) {
      nextBtn.classList.remove('hidden');
    }
  }, 1500);
}

function handleGameEnd(win: boolean) {
  const container = document.querySelector('.game-container')!;
  container.classList.remove('game-over', 'victory');
  container.classList.add(win ? 'victory' : 'game-over');

  choicesContainer.innerHTML = '';
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    statusMsg.className = `status-msg ${key === 'wrong' || key === 'lose' ? 'danger' : 'success'}`;
  });

  game.setOnLegendChange(showLegend);
  game.setOnChoiceResult(handleChoiceResult);
  game.setOnGameEnd(handleGameEnd);

  startBtn.addEventListener('click', () => {
    const container = document.querySelector('.game-container')!;
    container.classList.remove('game-over', 'victory');
    game.start();
  });

  nextBtn.addEventListener('click', () => {
    game.nextLegend();
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();

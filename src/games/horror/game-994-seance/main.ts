import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const energyFill = document.getElementById('energy-fill')!;
const crystalBall = document.getElementById('crystal-ball')!;
const spiritMessage = document.getElementById('spirit-message')!;
const questionOptions = document.getElementById('question-options')!;
const responseArea = document.getElementById('response-area')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const seanceTable = document.querySelector('.seance-table')!;

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

  energyFill.style.width = `${stats.energy}%`;

  if (stats.isRunning) {
    startBtn.style.display = 'none';
    seanceTable.classList.add('seance-active');
  } else {
    startBtn.style.display = 'block';
    seanceTable.classList.remove('seance-active');
    questionOptions.innerHTML = '';
  }
}

function showSpiritMessage(msg: string) {
  spiritMessage.textContent = msg;
  spiritMessage.classList.add('visible');

  setTimeout(() => {
    spiritMessage.classList.remove('visible');
  }, 4000);
}

function showResponse(msg: string) {
  const responseEl = document.createElement('div');
  responseEl.className = 'response-text';
  responseEl.textContent = `"${msg}"`;

  responseArea.innerHTML = '';
  responseArea.appendChild(responseEl);
}

function createQuestionButtons(questions: string[]) {
  questionOptions.innerHTML = '';

  questions.forEach((question, index) => {
    const btn = document.createElement('button');
    btn.className = 'question-btn';
    btn.textContent = question;
    btn.addEventListener('click', () => {
      game.askQuestion(index);

      // Disable all buttons briefly
      const buttons = questionOptions.querySelectorAll('button');
      buttons.forEach(b => (b as HTMLButtonElement).disabled = true);

      setTimeout(() => {
        buttons.forEach(b => (b as HTMLButtonElement).disabled = false);
      }, 2000);
    });
    questionOptions.appendChild(btn);
  });
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    statusMsg.className = `status-msg ${key === 'spiritAngry' ? 'danger' : 'mystical'}`;

    if (key === 'spiritAngry') {
      seanceTable.classList.add('spirit-angry');
      setTimeout(() => seanceTable.classList.remove('spirit-angry'), 2000);
    }
  });

  game.setOnSpiritMessage((msg) => {
    showSpiritMessage(msg);
    showResponse(msg);
  });

  game.setOnQuestionsReady((questions) => {
    createQuestionButtons(questions);
  });

  startBtn.addEventListener('click', () => {
    responseArea.innerHTML = '';
    game.start();
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();


import { Game, type GameObject } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale = 'zh-TW';

// Elements
const gameView = document.getElementById('game-view')!;
const worldIndicator = document.getElementById('world-indicator')!;
const inventoryDisplay = document.getElementById('inventory')!;
const roomDiv = document.getElementById('room')!;
const switchBtn = document.getElementById('switch-btn')!;
const messageLog = document.getElementById('message-log')!;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function render() {
  const world = game.getCurrentWorld();
  
  // Update View Class
  gameView.className = `view ${world}`;
  
  // Update Text
  worldIndicator.textContent = t(`game.${world}World`);
  
  const invItems = game.getInventory().map(id => t(`game.items.${id}`));
  inventoryDisplay.textContent = `Inventory: [${invItems.join(', ')}]`;

  // Render Objects
  roomDiv.innerHTML = '';
  game.objects.forEach(obj => {
    if (obj.collected) return;
    
    // CSS filters handle visibility based on parent class, but we can also check here
    // For simplicity, we render all and let CSS hide 'dark' items in 'light' world etc.
    
    const el = document.createElement('div');
    el.className = `interactable obj-${obj.id}`;
    el.style.left = `${obj.x}%`;
    el.style.top = `${obj.y}%`;
    el.textContent = obj.icon;
    
    if (obj.interactable) {
        el.onclick = () => handleInteract(obj.id);
    }
    
    roomDiv.appendChild(el);
  });
}

function handleInteract(id: string) {
  const msgKey = game.interact(id);
  messageLog.textContent = t(`game.msgs.${msgKey}`);
  render();
}

function init() {
  switchBtn.addEventListener('click', () => {
    game.switchWorld();
  });

  game.setOnStateChange(render);
  
  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();

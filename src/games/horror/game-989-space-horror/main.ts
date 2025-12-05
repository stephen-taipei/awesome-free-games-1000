import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const oxygenBar = document.getElementById('oxygen-bar')!;
const hullBar = document.getElementById('hull-bar')!;
const powerBar = document.getElementById('power-bar')!;
const stationMap = document.getElementById('station-map')!;
const playerMarker = document.getElementById('player-marker')!;
const creatureMarker = document.getElementById('creature-marker')!;
const roomInfo = document.getElementById('room-info')!;
const actionsContainer = document.getElementById('actions')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;

const roomElements: Record<string, HTMLElement> = {
  bridge: document.getElementById('room-bridge')!,
  airlock: document.getElementById('room-airlock')!,
  quarters: document.getElementById('room-quarters')!,
  engineering: document.getElementById('room-engineering')!,
  medbay: document.getElementById('room-medbay')!,
  cargo: document.getElementById('room-cargo')!
};

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function positionMarker(marker: HTMLElement, roomId: string) {
  const room = roomElements[roomId];
  if (!room) return;

  const rect = room.getBoundingClientRect();
  const mapRect = stationMap.getBoundingClientRect();

  marker.style.left = `${rect.left - mapRect.left + rect.width / 2 - 10}px`;
  marker.style.top = `${rect.top - mapRect.top + rect.height / 2 - 10}px`;
}

function render() {
  const stats = game.getStats();

  oxygenBar.style.width = `${stats.oxygen}%`;
  hullBar.style.width = `${stats.hull}%`;
  powerBar.style.width = `${stats.power}%`;

  // Update room classes
  Object.keys(roomElements).forEach(id => {
    roomElements[id].classList.remove('current', 'danger');
    if (id === stats.playerRoom) {
      roomElements[id].classList.add('current');
    }
  });

  // Position player
  positionMarker(playerMarker, stats.playerRoom);

  // Creature nearby warning
  if (stats.isCreatureNearby) {
    stationMap.classList.add('creature-nearby');
    const adjacentRooms = game.getAdjacentRooms();
    if (adjacentRooms.includes(stats.creatureRoom as any)) {
      roomElements[stats.creatureRoom]?.classList.add('danger');
    }
  } else {
    stationMap.classList.remove('creature-nearby');
  }

  // Low oxygen warning
  if (stats.oxygen < 30) {
    stationMap.classList.add('low-oxygen');
  } else {
    stationMap.classList.remove('low-oxygen');
  }

  // Room info and actions
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    roomInfo.textContent = t(`game.rooms.${stats.playerRoom}`);
    updateActions(stats.playerRoom);
  } else {
    startBtn.style.display = 'block';
    actionsContainer.innerHTML = '';
  }
}

function updateActions(room: string) {
  actionsContainer.innerHTML = '';

  const actions: { room: string; action: string }[] = [
    { room: 'engineering', action: 'repair' },
    { room: 'medbay', action: 'refillO2' },
    { room: 'bridge', action: 'restorePower' },
    { room: 'quarters', action: 'hide' },
    { room: 'cargo', action: 'hide' },
    { room: 'airlock', action: 'eject' }
  ];

  const roomActions = actions.filter(a => a.room === room);
  const adjacentRooms = game.getAdjacentRooms();

  // Room-specific actions
  roomActions.forEach(({ action }) => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = t(`game.actions.${action}`);
    btn.addEventListener('click', () => game.doAction(action));
    actionsContainer.appendChild(btn);
  });

  // Move buttons
  adjacentRooms.forEach(roomId => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = `→ ${roomId.charAt(0).toUpperCase() + roomId.slice(1)}`;
    btn.addEventListener('click', () => game.moveToRoom(roomId));
    actionsContainer.appendChild(btn);
  });
}

function handleCreatureMove(room: string, visible: boolean) {
  if (visible) {
    creatureMarker.classList.remove('hidden');
    positionMarker(creatureMarker, room);
  } else {
    creatureMarker.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnCreatureMove(handleCreatureMove);

  game.setOnGameEnd((win) => {
    creatureMarker.classList.add('hidden');
  });

  // Room click handlers
  Object.keys(roomElements).forEach(id => {
    roomElements[id].addEventListener('click', () => {
      const stats = game.getStats();
      if (stats.isRunning && game.getAdjacentRooms().includes(id as any)) {
        game.moveToRoom(id as any);
      }
    });
  });

  startBtn.addEventListener('click', () => {
    creatureMarker.classList.add('hidden');
    game.start();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();

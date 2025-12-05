import { translations } from './i18n';

type RoomId = 'bridge' | 'airlock' | 'quarters' | 'engineering' | 'medbay' | 'cargo';

interface Room {
  id: RoomId;
  adjacent: RoomId[];
}

const ROOMS: Room[] = [
  { id: 'bridge', adjacent: ['quarters', 'airlock'] },
  { id: 'airlock', adjacent: ['bridge', 'cargo'] },
  { id: 'quarters', adjacent: ['bridge', 'medbay'] },
  { id: 'engineering', adjacent: ['medbay', 'cargo'] },
  { id: 'medbay', adjacent: ['quarters', 'engineering'] },
  { id: 'cargo', adjacent: ['airlock', 'engineering'] }
];

export class Game {
  private oxygen: number = 100;
  private hull: number = 100;
  private power: number = 100;
  private playerRoom: RoomId = 'bridge';
  private creatureRoom: RoomId = 'cargo';
  private isRunning: boolean = false;
  private tasksCompleted: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private creatureMoveInterval: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onCreatureMove: ((room: RoomId, visible: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.oxygen = 100;
    this.hull = 100;
    this.power = 100;
    this.playerRoom = 'bridge';
    this.creatureRoom = 'cargo';
    this.isRunning = true;
    this.tasksCompleted = 0;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      this.oxygen -= 0.3;
      this.power -= 0.1;

      if (this.oxygen <= 0 || this.hull <= 0) {
        this.endGame(false);
        return;
      }

      if (this.tasksCompleted >= 5) {
        this.endGame(true);
        return;
      }

      this.notifyChange();
    }, 100);

    // Creature movement
    this.creatureMoveInterval = window.setInterval(() => {
      if (!this.isRunning) return;
      this.moveCreature();
    }, 4000);
  }

  private moveCreature() {
    const currentRoom = ROOMS.find(r => r.id === this.creatureRoom)!;
    const possibleRooms = currentRoom.adjacent;
    this.creatureRoom = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];

    const isAdjacent = this.isCreatureNearby();
    const visible = this.creatureRoom === this.playerRoom;

    if (this.onCreatureMove) {
      this.onCreatureMove(this.creatureRoom, visible);
    }

    if (visible) {
      this.showMessage(translations[this.locale].game.msgs.creatureAttack, 'danger');
      this.hull -= 20;
      this.notifyChange();
    } else if (isAdjacent) {
      this.showMessage(translations[this.locale].game.msgs.creatureNearby, 'warning');
    }
  }

  moveToRoom(roomId: RoomId) {
    if (!this.isRunning) return;

    const currentRoom = ROOMS.find(r => r.id === this.playerRoom)!;
    if (!currentRoom.adjacent.includes(roomId)) return;

    this.playerRoom = roomId;
    this.oxygen -= 2;

    if (this.playerRoom === this.creatureRoom) {
      this.showMessage(translations[this.locale].game.msgs.creatureAttack, 'danger');
      this.hull -= 25;
    }

    this.notifyChange();
  }

  doAction(action: string) {
    if (!this.isRunning) return;

    const t = translations[this.locale].game;

    switch (action) {
      case 'repair':
        if (this.playerRoom === 'engineering') {
          this.hull = Math.min(100, this.hull + 20);
          this.power -= 10;
          this.tasksCompleted++;
          this.showMessage(t.msgs.repaired, 'success');
        }
        break;
      case 'refillO2':
        if (this.playerRoom === 'medbay') {
          this.oxygen = Math.min(100, this.oxygen + 30);
          this.tasksCompleted++;
          this.showMessage(t.msgs.oxygenRefilled, 'success');
        }
        break;
      case 'restorePower':
        if (this.playerRoom === 'bridge') {
          this.power = Math.min(100, this.power + 25);
          this.tasksCompleted++;
          this.showMessage(t.msgs.powerRestored, 'success');
        }
        break;
      case 'hide':
        if (this.playerRoom === 'quarters' || this.playerRoom === 'cargo') {
          this.showMessage(t.msgs.hiding, '');
        }
        break;
      case 'eject':
        if (this.playerRoom === 'airlock' && this.creatureRoom === 'airlock') {
          this.showMessage(t.msgs.creatureEjected, 'success');
          this.endGame(true);
        }
        break;
    }

    this.notifyChange();
  }

  isCreatureNearby(): boolean {
    const currentRoom = ROOMS.find(r => r.id === this.playerRoom)!;
    return currentRoom.adjacent.includes(this.creatureRoom);
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.creatureMoveInterval) clearInterval(this.creatureMoveInterval);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.win : t.lose, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      oxygen: this.oxygen,
      hull: this.hull,
      power: this.power,
      playerRoom: this.playerRoom,
      creatureRoom: this.creatureRoom,
      isRunning: this.isRunning,
      tasksCompleted: this.tasksCompleted,
      isCreatureNearby: this.isCreatureNearby()
    };
  }

  getAdjacentRooms(): RoomId[] {
    const room = ROOMS.find(r => r.id === this.playerRoom);
    return room ? room.adjacent : [];
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnCreatureMove(cb: (room: RoomId, visible: boolean) => void) { this.onCreatureMove = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}

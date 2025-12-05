import { translations } from './i18n';

interface Room {
  id: string;
  exits: string[];
  searched: boolean;
}

export class Game {
  private health: number = 100;
  private garlic: number = 0;
  private cross: number = 0;
  private mirror: number = 0;
  private currentRoom: string = 'entrance';
  private vampireRoom: string = 'crypt';
  private isRunning: boolean = false;
  private vampireAttacking: boolean = false;
  private isHiding: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private rooms: Map<string, Room> = new Map();
  private vampireLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onVampireState: ((attacking: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initRooms();
  }

  private initRooms() {
    this.rooms.set('entrance', { id: 'entrance', exits: ['library', 'dining', 'garden'], searched: false });
    this.rooms.set('library', { id: 'library', exits: ['entrance', 'tower'], searched: false });
    this.rooms.set('dining', { id: 'dining', exits: ['entrance', 'kitchen'], searched: false });
    this.rooms.set('kitchen', { id: 'kitchen', exits: ['dining', 'cellar'], searched: false });
    this.rooms.set('cellar', { id: 'cellar', exits: ['kitchen', 'crypt'], searched: false });
    this.rooms.set('chapel', { id: 'chapel', exits: ['garden', 'crypt'], searched: false });
    this.rooms.set('bedroom', { id: 'bedroom', exits: ['tower'], searched: false });
    this.rooms.set('tower', { id: 'tower', exits: ['library', 'bedroom'], searched: false });
    this.rooms.set('crypt', { id: 'crypt', exits: ['cellar', 'chapel'], searched: false });
    this.rooms.set('garden', { id: 'garden', exits: ['entrance', 'chapel', 'exit'], searched: false });
    this.rooms.set('exit', { id: 'exit', exits: [], searched: false });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.garlic = 0;
    this.cross = 0;
    this.mirror = 0;
    this.currentRoom = 'entrance';
    this.vampireRoom = 'crypt';
    this.isRunning = true;
    this.vampireAttacking = false;
    this.isHiding = false;

    // Reset rooms
    this.rooms.forEach(room => room.searched = false);

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Vampire moves and hunts
    this.vampireLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.vampireBehavior();
    }, 4000);
  }

  private vampireBehavior() {
    // Move vampire
    const vampRoom = this.rooms.get(this.vampireRoom);
    if (vampRoom && vampRoom.exits.length > 0) {
      const exits = vampRoom.exits.filter(e => e !== 'exit');
      if (exits.length > 0) {
        // Move towards player sometimes
        if (Math.random() < 0.4) {
          this.vampireRoom = exits[Math.floor(Math.random() * exits.length)];
        }
      }
    }

    // Check if in same room
    if (this.vampireRoom === this.currentRoom) {
      if (this.isHiding && Math.random() < 0.6) {
        // Hide successful
        this.showMessage(translations[this.locale].game.msgs.hiding, 'success');
        this.isHiding = false;
      } else {
        this.startAttack();
      }
    } else {
      // Check if adjacent
      const currentRoomData = this.rooms.get(this.currentRoom);
      if (currentRoomData && currentRoomData.exits.includes(this.vampireRoom)) {
        this.showMessage(translations[this.locale].game.msgs.vampireNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startAttack() {
    if (this.isHiding) {
      this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      this.isHiding = false;
    }

    this.vampireAttacking = true;
    this.showMessage(translations[this.locale].game.msgs.vampireAttack, 'danger');
    if (this.onVampireState) this.onVampireState(true);
    this.notifyChange();

    // Deal damage
    const attackInterval = setInterval(() => {
      if (!this.isRunning || !this.vampireAttacking) {
        clearInterval(attackInterval);
        return;
      }

      this.health -= 8;

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(attackInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 600);

    // Attack ends if not repelled
    setTimeout(() => {
      if (this.vampireAttacking) {
        this.vampireAttacking = false;
        if (this.onVampireState) this.onVampireState(false);
        // Vampire moves to adjacent room
        const vampRoom = this.rooms.get(this.vampireRoom);
        if (vampRoom && vampRoom.exits.length > 0) {
          const exits = vampRoom.exits.filter(e => e !== 'exit' && e !== this.currentRoom);
          if (exits.length > 0) {
            this.vampireRoom = exits[Math.floor(Math.random() * exits.length)];
          }
        }
        this.notifyChange();
      }
    }, 4000);
  }

  moveTo(roomId: string) {
    if (!this.isRunning) return;

    const currentRoomData = this.rooms.get(this.currentRoom);
    if (!currentRoomData || !currentRoomData.exits.includes(roomId)) return;

    if (roomId === 'exit') {
      this.endGame(true);
      return;
    }

    this.currentRoom = roomId;
    this.isHiding = false;
    this.notifyChange();

    // Check for vampire
    if (this.vampireRoom === this.currentRoom && !this.vampireAttacking) {
      setTimeout(() => this.startAttack(), 500);
    }
  }

  search() {
    if (!this.isRunning || this.vampireAttacking) return;

    const t = translations[this.locale].game.msgs;
    const room = this.rooms.get(this.currentRoom);

    if (!room || room.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    room.searched = true;
    const roll = Math.random();

    if (roll < 0.35) {
      this.garlic++;
      this.showMessage(t.foundGarlic, 'success');
    } else if (roll < 0.55) {
      this.cross++;
      this.showMessage(t.foundCross, 'success');
    } else if (roll < 0.70) {
      this.mirror++;
      this.showMessage(t.foundMirror, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning || this.vampireAttacking) return;

    this.isHiding = true;
    this.showMessage(translations[this.locale].game.msgs.hiding, '');
    this.notifyChange();
  }

  useItem() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (!this.vampireAttacking) {
      this.showMessage(t.noVampire, '');
      return;
    }

    if (this.garlic > 0) {
      this.garlic--;
      this.repelVampire(t.usedGarlic);
    } else if (this.cross > 0) {
      this.cross--;
      this.repelVampire(t.usedCross);
    } else if (this.mirror > 0) {
      this.mirror--;
      this.repelVampire(t.usedMirror);
    } else {
      this.showMessage(t.noItems, 'warning');
    }

    this.notifyChange();
  }

  private repelVampire(msg: string) {
    this.vampireAttacking = false;
    if (this.onVampireState) this.onVampireState(false);
    this.showMessage(msg, 'success');

    // Vampire flees to far room
    const farRooms = ['crypt', 'tower', 'cellar'];
    this.vampireRoom = farRooms[Math.floor(Math.random() * farRooms.length)];
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.vampireLoop) clearInterval(this.vampireLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.died, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getCurrentRoom() {
    return this.rooms.get(this.currentRoom);
  }

  getRoomName(roomId: string): string {
    return (translations[this.locale].game.rooms as any)[roomId] || roomId;
  }

  getRoomDesc(roomId: string): string {
    return (translations[this.locale].game.descs as any)[roomId] || '';
  }

  getStats() {
    return {
      health: this.health,
      garlic: this.garlic,
      cross: this.cross,
      mirror: this.mirror,
      currentRoom: this.currentRoom,
      isRunning: this.isRunning,
      vampireAttacking: this.vampireAttacking,
      isHiding: this.isHiding
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnVampireState(cb: (attacking: boolean) => void) { this.onVampireState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}

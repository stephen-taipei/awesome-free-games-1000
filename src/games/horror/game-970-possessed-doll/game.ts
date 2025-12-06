import { translations } from './i18n';

interface Room {
  id: string;
  adjacent: string[];
}

export class Game {
  private sanity: number = 100;
  private battery: number = 100;
  private currentHour: number = 0; // 0 = 12AM, 6 = 6AM
  private playerRoom: string = 'bedroom';
  private dollRoom: string = 'bedroom';
  private isHiding: boolean = false;
  private isWatching: boolean = false;
  private dollApproaching: boolean = false;
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private rooms: Map<string, Room> = new Map();
  private gameLoop: number | null = null;
  private timeLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onDollState: ((state: 'hidden' | 'same-room' | 'approaching' | 'attacking') => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initRooms();
  }

  private initRooms() {
    this.rooms.set('bedroom', { id: 'bedroom', adjacent: ['hallway'] });
    this.rooms.set('hallway', { id: 'hallway', adjacent: ['bedroom', 'living', 'bathroom'] });
    this.rooms.set('living', { id: 'living', adjacent: ['hallway', 'kitchen'] });
    this.rooms.set('kitchen', { id: 'kitchen', adjacent: ['living'] });
    this.rooms.set('bathroom', { id: 'bathroom', adjacent: ['hallway'] });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.battery = 100;
    this.currentHour = 0;
    this.playerRoom = 'bedroom';
    this.dollRoom = 'bedroom';
    this.isHiding = false;
    this.isWatching = false;
    this.dollApproaching = false;
    this.isRunning = true;

    if (this.onDollState) this.onDollState('same-room');
    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Doll behavior loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.dollBehavior();
    }, 3000);

    // Time progression
    this.timeLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.currentHour++;

      if (this.currentHour >= 6) {
        this.endGame(true);
      }

      this.notifyChange();
    }, 10000); // Each hour = 10 seconds
  }

  private dollBehavior() {
    const t = translations[this.locale].game.msgs;

    // Doll doesn't move if being watched
    if (this.isWatching && this.playerRoom === this.dollRoom) {
      this.showMessage(t.watchStop, 'success');
      this.dollApproaching = false;
      if (this.onDollState) this.onDollState('same-room');
      return;
    }

    // Doll moves toward player
    if (this.dollRoom !== this.playerRoom) {
      const dollRoomData = this.rooms.get(this.dollRoom);
      if (dollRoomData) {
        // Find path toward player
        const nextRoom = this.findPathToPlayer();
        if (nextRoom) {
          this.dollRoom = nextRoom;
          this.showMessage(t.dollMoved, 'warning');

          // Check if doll is adjacent to player
          const playerRoomData = this.rooms.get(this.playerRoom);
          if (playerRoomData && playerRoomData.adjacent.includes(this.dollRoom)) {
            this.showMessage(t.dollClose, 'danger');
          }
        }
      }
    }

    // Doll in same room as player
    if (this.dollRoom === this.playerRoom) {
      if (this.isHiding) {
        // 50% chance to find player
        if (Math.random() < 0.5) {
          this.isHiding = false;
          this.showMessage(t.hideFail, 'danger');
          this.dollApproaching = true;
          if (this.onDollState) this.onDollState('approaching');
        } else {
          this.showMessage(t.hideSuccess, 'success');
          // Doll moves away
          const dollRoomData = this.rooms.get(this.dollRoom);
          if (dollRoomData && dollRoomData.adjacent.length > 0) {
            this.dollRoom = dollRoomData.adjacent[Math.floor(Math.random() * dollRoomData.adjacent.length)];
          }
          if (this.onDollState) this.onDollState('hidden');
        }
      } else {
        this.showMessage(t.dollSameRoom, 'danger');
        this.dollApproaching = true;
        if (this.onDollState) this.onDollState('approaching');
        this.sanity = Math.max(0, this.sanity - 15);
      }
    } else {
      this.dollApproaching = false;
      if (this.onDollState) this.onDollState('hidden');
    }

    // Attack if approaching too long
    if (this.dollApproaching && this.dollRoom === this.playerRoom && !this.isHiding) {
      if (Math.random() < 0.4) {
        this.attack();
      }
    }

    // Sanity drain
    this.sanity = Math.max(0, this.sanity - 3);
    if (this.sanity <= 30 && this.sanity > 27) {
      this.showMessage(t.sanityLow, 'danger');
    }

    if (this.sanity <= 0) {
      this.endGame(false);
    }

    this.notifyChange();
  }

  private findPathToPlayer(): string | null {
    const dollRoomData = this.rooms.get(this.dollRoom);
    if (!dollRoomData) return null;

    // Simple: move to adjacent room closest to player
    for (const adj of dollRoomData.adjacent) {
      if (adj === this.playerRoom) return adj;
    }

    // Move toward player through adjacent rooms
    for (const adj of dollRoomData.adjacent) {
      const adjData = this.rooms.get(adj);
      if (adjData && adjData.adjacent.includes(this.playerRoom)) {
        return adj;
      }
    }

    // Random adjacent room
    if (dollRoomData.adjacent.length > 0) {
      return dollRoomData.adjacent[Math.floor(Math.random() * dollRoomData.adjacent.length)];
    }

    return null;
  }

  private attack() {
    if (this.onDollState) this.onDollState('attacking');

    setTimeout(() => {
      if (this.isRunning) {
        this.endGame(false);
      }
    }, 1000);
  }

  moveTo(roomId: string) {
    if (!this.isRunning || this.dollApproaching) return;

    const currentRoom = this.rooms.get(this.playerRoom);
    if (!currentRoom || !currentRoom.adjacent.includes(roomId)) return;

    this.playerRoom = roomId;
    this.isHiding = false;
    this.isWatching = false;

    // Check if doll is in this room
    if (this.dollRoom === this.playerRoom) {
      this.showMessage(translations[this.locale].game.msgs.dollSameRoom, 'danger');
      if (this.onDollState) this.onDollState('same-room');
    } else {
      if (this.onDollState) this.onDollState('hidden');
    }

    this.notifyChange();
  }

  watch() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    this.isWatching = true;
    this.isHiding = false;
    this.showMessage(t.watching, '');

    if (this.dollRoom === this.playerRoom) {
      this.dollApproaching = false;
      if (this.onDollState) this.onDollState('same-room');
    }

    // Watching drains sanity slowly
    this.sanity = Math.max(0, this.sanity - 5);

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    this.isHiding = true;
    this.isWatching = false;
    this.showMessage(t.hiding, '');

    this.notifyChange();
  }

  flashlight() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.battery <= 0) {
      this.showMessage(t.flashlightDead, 'danger');
      return;
    }

    this.battery = Math.max(0, this.battery - 15);
    this.showMessage(t.flashlight, 'success');

    // Flashlight reveals doll and scares it slightly
    if (this.dollRoom === this.playerRoom) {
      this.dollApproaching = false;
      if (this.onDollState) this.onDollState('same-room');
    }

    if (this.battery <= 20 && this.battery > 5) {
      this.showMessage(t.flashlightLow, 'warning');
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.timeLoop) clearInterval(this.timeLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.survived : t.caught, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getTimeDisplay(): string {
    const hour = this.currentHour === 0 ? 12 : this.currentHour;
    return `${hour}:00 AM`;
  }

  getRoomName(roomId: string): string {
    return (translations[this.locale].game.rooms as any)[roomId] || roomId;
  }

  getCurrentRoom() {
    return this.rooms.get(this.playerRoom);
  }

  getStats() {
    return {
      sanity: this.sanity,
      battery: this.battery,
      currentHour: this.currentHour,
      playerRoom: this.playerRoom,
      dollRoom: this.dollRoom,
      isHiding: this.isHiding,
      isWatching: this.isWatching,
      dollApproaching: this.dollApproaching,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnDollState(cb: (state: 'hidden' | 'same-room' | 'approaching' | 'attacking') => void) { this.onDollState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}

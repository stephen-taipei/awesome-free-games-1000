import { translations } from './i18n';

interface Room {
  id: string;
  exits: string[];
  searched: boolean;
  evidenceType: number | null; // 1-4 for evidence types, null for none
}

export class Game {
  private sanity: number = 100;
  private battery: number = 100;
  private evidence: boolean[] = [false, false, false, false];
  private currentRoom: string = 'lobby';
  private patientRoom: string = 'morgue';
  private isRunning: boolean = false;
  private patientChasing: boolean = false;
  private isHiding: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private rooms: Map<string, Room> = new Map();
  private patientLoop: number | null = null;
  private drainLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onPatientState: ((chasing: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initRooms();
  }

  private initRooms() {
    this.rooms.set('lobby', { id: 'lobby', exits: ['ward_a', 'ward_b', 'office'], searched: false, evidenceType: null });
    this.rooms.set('ward_a', { id: 'ward_a', exits: ['lobby', 'kitchen'], searched: false, evidenceType: 1 });
    this.rooms.set('ward_b', { id: 'ward_b', exits: ['lobby', 'basement'], searched: false, evidenceType: 2 });
    this.rooms.set('office', { id: 'office', exits: ['lobby', 'rooftop'], searched: false, evidenceType: 3 });
    this.rooms.set('morgue', { id: 'morgue', exits: ['basement'], searched: false, evidenceType: null });
    this.rooms.set('kitchen', { id: 'kitchen', exits: ['ward_a', 'basement'], searched: false, evidenceType: null });
    this.rooms.set('basement', { id: 'basement', exits: ['ward_b', 'kitchen', 'morgue'], searched: false, evidenceType: 4 });
    this.rooms.set('rooftop', { id: 'rooftop', exits: ['office', 'exit'], searched: false, evidenceType: null });
    this.rooms.set('exit', { id: 'exit', exits: [], searched: false, evidenceType: null });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.battery = 100;
    this.evidence = [false, false, false, false];
    this.currentRoom = 'lobby';
    this.patientRoom = 'morgue';
    this.isRunning = true;
    this.patientChasing = false;
    this.isHiding = false;

    // Reset rooms
    this.rooms.forEach(room => room.searched = false);

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Patient behavior
    this.patientLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.patientBehavior();
    }, 4000);

    // Sanity and battery drain
    this.drainLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.drain();
    }, 1000);
  }

  private patientBehavior() {
    // Move patient
    const patientRoomData = this.rooms.get(this.patientRoom);
    if (patientRoomData && patientRoomData.exits.length > 0) {
      const exits = patientRoomData.exits.filter(e => e !== 'exit');
      if (exits.length > 0 && Math.random() < 0.6) {
        this.patientRoom = exits[Math.floor(Math.random() * exits.length)];
      }
    }

    // Check if in same room
    if (this.patientRoom === this.currentRoom) {
      if (this.isHiding && Math.random() < 0.5) {
        this.showMessage(translations[this.locale].game.msgs.hiding, '');
        this.isHiding = false;
      } else {
        this.startChase();
      }
    } else {
      // Check if adjacent
      const currentRoomData = this.rooms.get(this.currentRoom);
      if (currentRoomData && currentRoomData.exits.includes(this.patientRoom)) {
        this.showMessage(translations[this.locale].game.msgs.patientNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startChase() {
    if (this.isHiding) {
      this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      this.isHiding = false;
    }

    this.patientChasing = true;
    this.showMessage(translations[this.locale].game.msgs.patientChase, 'danger');
    if (this.onPatientState) this.onPatientState(true);

    // Drain sanity fast during chase
    const chaseInterval = setInterval(() => {
      if (!this.isRunning || !this.patientChasing) {
        clearInterval(chaseInterval);
        return;
      }

      this.sanity -= 4;

      if (this.sanity <= 0) {
        this.sanity = 0;
        clearInterval(chaseInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 400);

    // Chase ends after time
    setTimeout(() => {
      if (this.patientChasing) {
        this.patientChasing = false;
        if (this.onPatientState) this.onPatientState(false);
        this.showMessage(translations[this.locale].game.msgs.patientLost, '');
        this.movePatientAway();
        this.notifyChange();
      }
    }, 5000);
  }

  private movePatientAway() {
    const farRooms = ['morgue', 'basement', 'ward_b'].filter(r => r !== this.currentRoom);
    this.patientRoom = farRooms[Math.floor(Math.random() * farRooms.length)];
  }

  private drain() {
    this.battery = Math.max(0, this.battery - 0.5);

    // Low battery drains sanity
    if (this.battery < 20) {
      this.sanity = Math.max(0, this.sanity - 0.3);
    }

    if (this.sanity <= 20 && this.sanity > 19) {
      this.showMessage(translations[this.locale].game.msgs.sanityLow, 'danger');
    }

    this.notifyChange();
  }

  moveTo(roomId: string) {
    if (!this.isRunning || this.patientChasing) return;

    const currentRoomData = this.rooms.get(this.currentRoom);
    if (!currentRoomData || !currentRoomData.exits.includes(roomId)) return;

    const t = translations[this.locale].game.msgs;

    // Exit requires all evidence
    if (roomId === 'exit') {
      if (this.evidence.every(e => e)) {
        this.endGame(true);
      } else {
        this.showMessage(t.exitLocked, 'warning');
      }
      return;
    }

    this.currentRoom = roomId;
    this.isHiding = false;
    this.notifyChange();

    // Check for patient
    if (this.patientRoom === this.currentRoom && !this.patientChasing) {
      setTimeout(() => this.startChase(), 300);
    }
  }

  search() {
    if (!this.isRunning || this.patientChasing) return;

    const t = translations[this.locale].game.msgs;
    const room = this.rooms.get(this.currentRoom);

    if (!room || room.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    room.searched = true;

    if (room.evidenceType !== null && !this.evidence[room.evidenceType - 1]) {
      this.evidence[room.evidenceType - 1] = true;

      const msgs = [t.foundRecord, t.foundMeds, t.foundKey, t.foundPhoto];
      this.showMessage(msgs[room.evidenceType - 1], 'success');

      // Check if all evidence collected
      if (this.evidence.every(e => e)) {
        setTimeout(() => {
          this.showMessage(t.allEvidence, 'success');
        }, 1500);
      }
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning || this.patientChasing) return;

    this.isHiding = true;
    this.showMessage(translations[this.locale].game.msgs.hiding, '');
    this.notifyChange();
  }

  flash() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.battery < 15) {
      this.showMessage(t.noBattery, 'warning');
      return;
    }

    this.battery -= 15;

    if (this.patientChasing) {
      this.patientChasing = false;
      if (this.onPatientState) this.onPatientState(false);
      this.showMessage(t.flashUsed, 'success');
      this.movePatientAway();
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.patientLoop) clearInterval(this.patientLoop);
    if (this.drainLoop) clearInterval(this.drainLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.caught, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getCurrentRoom() {
    return this.rooms.get(this.currentRoom);
  }

  getRoomName(roomId: string): string {
    return (translations[this.locale].game.rooms as any)[roomId] || roomId;
  }

  getStats() {
    return {
      sanity: this.sanity,
      battery: this.battery,
      evidence: this.evidence,
      evidenceCount: this.evidence.filter(e => e).length,
      currentRoom: this.currentRoom,
      isRunning: this.isRunning,
      patientChasing: this.patientChasing,
      isHiding: this.isHiding
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnPatientState(cb: (chasing: boolean) => void) { this.onPatientState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}

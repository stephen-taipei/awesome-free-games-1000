export interface RoomObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  emoji?: string;
  state: Record<string, any>;
  onClick: (game: RoomEscapeGame) => void;
}

export interface Room {
  id: number;
  objects: RoomObject[];
  safeCode?: string;
}

function createRoom1(): Room {
  return {
    id: 1,
    safeCode: "1234",
    objects: [
      // Door
      {
        id: "door",
        type: "door",
        x: 280,
        y: 80,
        width: 80,
        height: 180,
        state: { locked: true },
        onClick: (game) => {
          if (game.room.objects.find((o) => o.id === "door")!.state.locked) {
            if (game.hasItem("key")) {
              game.removeItem("key");
              game.room.objects.find((o) => o.id === "door")!.state.locked = false;
              game.showMessage("msg.doorOpen");
            } else {
              game.showMessage("msg.needKey");
            }
          } else {
            game.win();
          }
        },
      },
      // Safe
      {
        id: "safe",
        type: "safe",
        x: 50,
        y: 150,
        width: 80,
        height: 70,
        state: { opened: false },
        onClick: (game) => {
          const safe = game.room.objects.find((o) => o.id === "safe")!;
          if (safe.state.opened) {
            game.showMessage("msg.drawer");
            return;
          }
          const code = prompt("Enter code:");
          if (code === game.room.safeCode) {
            safe.state.opened = true;
            game.addItem("key", "msg.foundKey");
            game.showMessage("msg.safeOpen");
          } else if (code) {
            game.showMessage("msg.wrongCode");
          }
        },
      },
      // Painting
      {
        id: "painting",
        type: "painting",
        x: 450,
        y: 100,
        width: 100,
        height: 80,
        state: { checked: false },
        onClick: (game) => {
          const painting = game.room.objects.find((o) => o.id === "painting")!;
          if (!painting.state.checked) {
            painting.state.checked = true;
            game.addItem("note", "msg.foundNote");
            game.showMessage("msg.paintingHint");
          } else {
            game.showMessage("msg.painting");
          }
        },
      },
      // Clock
      {
        id: "clock",
        type: "clock",
        x: 180,
        y: 100,
        width: 50,
        height: 50,
        emoji: "🕐",
        state: {},
        onClick: (game) => {
          game.showMessage("msg.clock");
        },
      },
      // Plant
      {
        id: "plant",
        type: "plant",
        x: 500,
        y: 280,
        width: 50,
        height: 60,
        emoji: "🪴",
        state: {},
        onClick: (game) => {
          game.showMessage("msg.plant");
        },
      },
      // Rug
      {
        id: "rug",
        type: "rug",
        x: 250,
        y: 320,
        width: 140,
        height: 60,
        state: { checked: false },
        onClick: (game) => {
          const rug = game.room.objects.find((o) => o.id === "rug")!;
          if (!rug.state.checked) {
            rug.state.checked = true;
            game.showMessage("msg.rug");
          }
        },
      },
      // Desk
      {
        id: "desk",
        type: "desk",
        x: 30,
        y: 280,
        width: 120,
        height: 60,
        state: {},
        onClick: (game) => {
          game.showMessage("msg.drawer");
        },
      },
    ],
  };
}

function createRoom2(): Room {
  return {
    id: 2,
    safeCode: "7890",
    objects: [
      {
        id: "door",
        type: "door",
        x: 500,
        y: 80,
        width: 80,
        height: 180,
        state: { locked: true },
        onClick: (game) => {
          if (game.room.objects.find((o) => o.id === "door")!.state.locked) {
            if (game.hasItem("key")) {
              game.removeItem("key");
              game.room.objects.find((o) => o.id === "door")!.state.locked = false;
              game.showMessage("msg.doorOpen");
            } else {
              game.showMessage("msg.needKey");
            }
          } else {
            game.win();
          }
        },
      },
      {
        id: "safe",
        type: "safe",
        x: 100,
        y: 200,
        width: 80,
        height: 70,
        state: { opened: false },
        onClick: (game) => {
          const safe = game.room.objects.find((o) => o.id === "safe")!;
          if (safe.state.opened) {
            game.showMessage("msg.drawer");
            return;
          }
          const code = prompt("Enter code:");
          if (code === game.room.safeCode) {
            safe.state.opened = true;
            game.addItem("key", "msg.foundKey");
            game.showMessage("msg.safeOpen");
          } else if (code) {
            game.showMessage("msg.wrongCode");
          }
        },
      },
      {
        id: "bookshelf",
        type: "painting",
        x: 250,
        y: 100,
        width: 150,
        height: 120,
        state: { checked: false },
        onClick: (game) => {
          const obj = game.room.objects.find((o) => o.id === "bookshelf")!;
          if (!obj.state.checked) {
            obj.state.checked = true;
            game.addItem("note", "msg.foundNote");
          }
          game.showMessage("msg.painting");
        },
      },
      {
        id: "lamp",
        type: "plant",
        x: 50,
        y: 100,
        width: 40,
        height: 80,
        emoji: "🪔",
        state: {},
        onClick: (game) => {
          game.showMessage("msg.plant");
        },
      },
      {
        id: "chair",
        type: "plant",
        x: 400,
        y: 280,
        width: 50,
        height: 70,
        emoji: "🪑",
        state: {},
        onClick: (game) => {
          game.showMessage("msg.drawer");
        },
      },
    ],
  };
}

const ROOMS = [createRoom1, createRoom2];

export class RoomEscapeGame {
  roomView: HTMLElement;
  inventoryEl: HTMLElement;
  messageBox: HTMLElement;

  level: number = 1;
  room: Room;
  inventory: string[] = [];
  selectedItem: string | null = null;
  status: "playing" | "won" = "playing";

  onStateChange: ((s: any) => void) | null = null;
  onMessage: ((key: string) => void) | null = null;

  constructor(
    roomView: HTMLElement,
    inventoryEl: HTMLElement,
    messageBox: HTMLElement
  ) {
    this.roomView = roomView;
    this.inventoryEl = inventoryEl;
    this.messageBox = messageBox;
    this.room = createRoom1();
  }

  public start() {
    this.status = "playing";
    this.inventory = [];
    this.selectedItem = null;
    this.room = ROOMS[(this.level - 1) % ROOMS.length]();
    this.render();
    this.renderInventory();
    this.notifyChange();
  }

  private render() {
    this.roomView.innerHTML = "";

    // Floor
    const floor = document.createElement("div");
    floor.className = "floor";
    floor.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 120px;
    `;
    this.roomView.appendChild(floor);

    // Wall
    const wall = document.createElement("div");
    wall.className = "wall";
    wall.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 280px;
    `;
    this.roomView.appendChild(wall);

    // Objects
    this.room.objects.forEach((obj) => {
      const el = this.createObjectElement(obj);
      this.roomView.appendChild(el);
    });
  }

  private createObjectElement(obj: RoomObject): HTMLElement {
    const el = document.createElement("div");
    el.className = `room-object ${obj.type}`;
    el.style.cssText = `
      left: ${obj.x}px;
      top: ${obj.y}px;
      width: ${obj.width}px;
      height: ${obj.height}px;
    `;

    if (obj.emoji) {
      el.textContent = obj.emoji;
      el.style.display = "flex";
      el.style.justifyContent = "center";
      el.style.alignItems = "center";
      el.style.fontSize = `${Math.min(obj.width, obj.height) * 0.8}px`;
    }

    // Special rendering for door
    if (obj.type === "door") {
      const handle = document.createElement("div");
      handle.className = "door-handle";
      el.appendChild(handle);

      if (!obj.state.locked) {
        el.style.transform = "perspective(200px) rotateY(-30deg)";
        el.style.transformOrigin = "left center";
      }
    }

    // Special rendering for safe
    if (obj.type === "safe" && obj.state.opened) {
      el.style.background = "#4a5568";
      el.innerHTML = '<div style="color:#2c3e50;text-align:center;padding-top:20px;">空</div>';
    }

    el.addEventListener("click", () => {
      obj.onClick(this);
      this.render();
      this.renderInventory();
    });

    return el;
  }

  public addItem(item: string, messageKey?: string) {
    if (!this.inventory.includes(item)) {
      this.inventory.push(item);
      this.renderInventory();
      if (messageKey) {
        this.showMessage(messageKey);
      }
    }
  }

  public removeItem(item: string) {
    this.inventory = this.inventory.filter((i) => i !== item);
    this.renderInventory();
  }

  public hasItem(item: string): boolean {
    return this.inventory.includes(item);
  }

  private renderInventory() {
    this.inventoryEl.innerHTML = "";

    const itemEmojis: Record<string, string> = {
      key: "🔑",
      note: "📝",
      flashlight: "🔦",
      screwdriver: "🪛",
    };

    this.inventory.forEach((item) => {
      const el = document.createElement("div");
      el.className = `inventory-item ${this.selectedItem === item ? "selected" : ""}`;
      el.textContent = itemEmojis[item] || "❓";
      el.addEventListener("click", () => {
        this.selectedItem = this.selectedItem === item ? null : item;
        this.renderInventory();
      });
      this.inventoryEl.appendChild(el);
    });
  }

  public showMessage(key: string) {
    if (this.onMessage) {
      this.onMessage(key);
    }
  }

  public win() {
    this.status = "won";
    this.notifyChange();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  public setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        status: this.status,
      });
    }
  }
}

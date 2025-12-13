export interface Clock {
  id: number;
  hourAngle: number; // 0-360
  minuteAngle: number; // 0-360
  element?: HTMLElement;
}

export interface Level {
  clocks: number;
  targetHour: number;
  targetMinute: number;
  linkedClocks?: number[][]; // Groups of clocks that move together
}

const LEVELS: Level[] = [
  { clocks: 3, targetHour: 12, targetMinute: 0 },
  { clocks: 4, targetHour: 3, targetMinute: 0 },
  { clocks: 4, targetHour: 6, targetMinute: 30 },
  { clocks: 6, targetHour: 9, targetMinute: 15 },
  { clocks: 6, targetHour: 2, targetMinute: 45, linkedClocks: [[0, 1], [2, 3]] },
  { clocks: 9, targetHour: 10, targetMinute: 10 },
  { clocks: 9, targetHour: 4, targetMinute: 20, linkedClocks: [[0, 2], [1, 3], [4, 5, 6]] },
  { clocks: 9, targetHour: 7, targetMinute: 35, linkedClocks: [[0, 4, 8], [2, 4, 6]] },
];

export class ClockGame {
  container: HTMLElement;
  clocks: Clock[] = [];
  level: number = 1;
  moves: number = 0;
  currentLevel: Level;
  status: "playing" | "won" = "playing";
  onStateChange: ((s: any) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.initClocks();
    this.render();
    this.notifyChange();
  }

  private initClocks() {
    this.clocks = [];
    for (let i = 0; i < this.currentLevel.clocks; i++) {
      // Random starting position
      this.clocks.push({
        id: i,
        hourAngle: Math.floor(Math.random() * 12) * 30,
        minuteAngle: Math.floor(Math.random() * 12) * 30,
      });
    }
  }

  private render() {
    this.container.innerHTML = "";

    // Adjust grid based on clock count
    const cols = this.currentLevel.clocks <= 4 ? 2 : 3;
    this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    this.clocks.forEach((clock, index) => {
      const clockEl = this.createClockElement(clock, index);
      clock.element = clockEl;
      this.container.appendChild(clockEl);
    });

    this.updateClockVisuals();
  }

  private createClockElement(clock: Clock, index: number): HTMLElement {
    const clockEl = document.createElement("div");
    clockEl.className = "clock";
    clockEl.dataset.id = String(index);

    // Clock face
    const face = document.createElement("div");
    face.className = "clock-face";

    // Hour marks and numbers
    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const isHourMark = i % 3 === 0;

      // Mark
      const mark = document.createElement("div");
      mark.className = `clock-mark ${isHourMark ? "hour-mark" : ""}`;
      mark.style.top = "5px";
      mark.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      mark.style.transformOrigin = "center 55px";
      face.appendChild(mark);

      // Numbers for main hours
      if (isHourMark) {
        const num = document.createElement("div");
        num.className = "clock-number";
        const hour = i === 0 ? 12 : i;
        num.textContent = String(hour);
        const rad = ((angle - 90) * Math.PI) / 180;
        const radius = 42;
        num.style.left = `${50 + Math.cos(rad) * radius}%`;
        num.style.top = `${50 + Math.sin(rad) * radius}%`;
        face.appendChild(num);
      }
    }

    // Center dot
    const center = document.createElement("div");
    center.className = "clock-center";
    face.appendChild(center);

    // Hour hand
    const hourHand = document.createElement("div");
    hourHand.className = "clock-hand hour-hand";
    hourHand.dataset.type = "hour";
    hourHand.addEventListener("click", (e) => {
      e.stopPropagation();
      this.rotateHand(index, "hour");
    });
    face.appendChild(hourHand);

    // Minute hand
    const minuteHand = document.createElement("div");
    minuteHand.className = "clock-hand minute-hand";
    minuteHand.dataset.type = "minute";
    minuteHand.addEventListener("click", (e) => {
      e.stopPropagation();
      this.rotateHand(index, "minute");
    });
    face.appendChild(minuteHand);

    clockEl.appendChild(face);
    return clockEl;
  }

  private rotateHand(clockIndex: number, handType: "hour" | "minute") {
    if (this.status === "won") return;

    const linkedGroups = this.currentLevel.linkedClocks || [];
    const clocksToRotate = [clockIndex];

    // Find linked clocks
    linkedGroups.forEach((group) => {
      if (group.includes(clockIndex)) {
        group.forEach((idx) => {
          if (!clocksToRotate.includes(idx)) {
            clocksToRotate.push(idx);
          }
        });
      }
    });

    // Rotate all linked clocks
    clocksToRotate.forEach((idx) => {
      const clock = this.clocks[idx];
      if (handType === "hour") {
        clock.hourAngle = (clock.hourAngle + 30) % 360;
      } else {
        clock.minuteAngle = (clock.minuteAngle + 30) % 360;
      }
    });

    this.moves++;
    this.updateClockVisuals();
    this.checkWin();
    this.notifyChange();
  }

  private updateClockVisuals() {
    const targetHourAngle = (this.currentLevel.targetHour % 12) * 30;
    const targetMinuteAngle = (this.currentLevel.targetMinute / 5) * 30;

    this.clocks.forEach((clock) => {
      if (!clock.element) return;

      const hourHand = clock.element.querySelector(".hour-hand") as HTMLElement;
      const minuteHand = clock.element.querySelector(".minute-hand") as HTMLElement;

      if (hourHand) {
        hourHand.style.transform = `translateX(-50%) rotate(${clock.hourAngle}deg)`;
      }
      if (minuteHand) {
        minuteHand.style.transform = `translateX(-50%) rotate(${clock.minuteAngle}deg)`;
      }

      // Check if this clock is correct
      const isCorrect =
        clock.hourAngle === targetHourAngle &&
        clock.minuteAngle === targetMinuteAngle;
      clock.element.classList.toggle("correct", isCorrect);
    });
  }

  private checkWin() {
    const targetHourAngle = (this.currentLevel.targetHour % 12) * 30;
    const targetMinuteAngle = (this.currentLevel.targetMinute / 5) * 30;

    const allCorrect = this.clocks.every(
      (clock) =>
        clock.hourAngle === targetHourAngle &&
        clock.minuteAngle === targetMinuteAngle
    );

    if (allCorrect) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.level, moves: this.moves });
      }
    }
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public reset() {
    this.start();
  }

  public getTargetTimeString(): string {
    const h = this.currentLevel.targetHour;
    const m = this.currentLevel.targetMinute;
    return `${h}:${m.toString().padStart(2, "0")}`;
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        moves: this.moves,
        target: this.getTargetTimeString(),
        status: this.status,
      });
    }
  }
}

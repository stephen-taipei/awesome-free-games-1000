export type GateType = "AND" | "OR" | "NOT" | "INPUT" | "OUTPUT";

export interface Gate {
  id: number;
  type: GateType;
  x: number;
  y: number;
  inputs: number[]; // Wire IDs connected to inputs (0 or 1 usually, can vary)
  outputs: number[]; // Wire IDs connected from output
  value: boolean; // Current state
  label?: string; // For INPUT type
}

export interface Wire {
  id: number;
  fromGateId: number;
  // fromPort? Output is usually singular.
  toGateId: number;
  toPortIdx: number; // 0 or 1
  value: boolean;
}

export class LogicGame {
  svgContainer: HTMLElement;

  // State
  gates: Gate[] = [];
  wires: Wire[] = [];
  nextId = 1;

  // Config
  levelIndex = 0;

  status: "playing" | "won" = "playing";
  onStateChange: ((s: any) => void) | null = null;

  constructor(container: HTMLElement) {
    this.svgContainer = container;
  }

  public start() {
    this.status = "playing";
    this.loadLevel(0);
    this.simulate();
    this.notify();
  }

  public loadLevel(idx: number) {
    this.gates = [];
    this.wires = [];
    this.nextId = 1;

    // Example Level 1: A AND B -> Out
    // Inputs
    this.addGate("INPUT", 50, 50, "A");
    this.addGate("INPUT", 50, 150, "B");

    // Output
    this.addGate("OUTPUT", 600, 100);

    // Initial setup maybe? Empty for now, user builds it.
    // Wait, description says "Connect gates".
    // Maybe we supply fixed components and user wires them?
    // Or user drags gates from toolbox.
    // Let's assume Inputs and Outputs are fixed on board, User drags gates and wires.
  }

  public addGate(type: GateType, x: number, y: number, label?: string): Gate {
    const g: Gate = {
      id: this.nextId++,
      type,
      x,
      y,
      inputs: [],
      outputs: [],
      value: false,
      label,
    };
    this.gates.push(g);
    this.notify();
    return g;
  }

  public addWire(fromId: number, toId: number, toPort: number) {
    // Validate: No cycle? (Hard to check instantly, sim will handle or oscillate)
    // Validate: Input port free?
    const existing = this.wires.find(
      (w) => w.toGateId === toId && w.toPortIdx === toPort
    );
    if (existing) {
      // Remove old
      this.removeWire(existing.id);
    }

    const w: Wire = {
      id: this.nextId++,
      fromGateId: fromId,
      toGateId: toId,
      toPortIdx: toPort,
      value: false,
    };
    this.wires.push(w);
    this.simulate();
    this.notify();
  }

  public removeWire(id: number) {
    this.wires = this.wires.filter((w) => w.id !== id);
    this.simulate();
    this.notify();
  }

  public toggleInput(id: number) {
    const g = this.gates.find((g) => g.id === id);
    if (g && g.type === "INPUT") {
      g.value = !g.value;
      this.simulate();
      this.notify();
    }
  }

  public moveGate(id: number, x: number, y: number) {
    const g = this.gates.find((g) => g.id === id);
    if (g) {
      g.x = x;
      g.y = y;
      this.notify(); // Updates wire positions visually
    }
  }

  private simulate() {
    // Propagation loop
    // Simple iterative approach for acyclic.
    // Max iterations to prevent infinite loops.
    let changed = true;
    let iter = 0;

    // Reset wires? No, keep state.

    while (changed && iter < 10) {
      changed = false;

      // Calc Gates
      this.gates.forEach((g) => {
        const oldVal = g.value;
        if (g.type === "INPUT") return; // Manually set

        // Read Inputs from wires
        const inputs = [false, false]; // Default false

        // Find wires connected to this gate's inputs
        const connectedWires = this.wires.filter((w) => w.toGateId === g.id);
        connectedWires.forEach((w) => {
          const sourceGate = this.gates.find((sg) => sg.id === w.fromGateId);
          if (sourceGate) w.value = sourceGate.value;
          inputs[w.toPortIdx] = w.value;
        });

        // Logic
        let newVal = false;
        if (g.type === "AND") newVal = inputs[0] && inputs[1];
        else if (g.type === "OR") newVal = inputs[0] || inputs[1];
        else if (g.type === "NOT") newVal = !inputs[0]; // Only input 0 used
        else if (g.type === "OUTPUT") newVal = inputs[0];

        if (newVal !== oldVal) {
          g.value = newVal;
          changed = true;
        }
      });
      iter++;
    }

    this.checkWin();
  }

  private checkWin() {
    // Condition: Output is ON?
    // Or specific Truth Table?
    // Simple MVP: Just light up Output node.
    const out = this.gates.find((g) => g.type === "OUTPUT");
    if (out && out.value) {
      // this.status = 'won'; // Don't auto win, user might be testing
    }
  }

  public check() {
    // Verify against truth table?
    // For now, if output is high, win.
    const out = this.gates.find((g) => g.type === "OUTPUT");
    if (out && out.value) {
      this.status = "won";
      this.notify();
    }
  }

  public reset() {
    this.start();
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        gates: this.gates,
        wires: this.wires,
        status: this.status,
        level: this.levelIndex + 1,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}

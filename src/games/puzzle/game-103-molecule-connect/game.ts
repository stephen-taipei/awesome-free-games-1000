/**
 * Molecule Connect Game Logic
 * Game #103 - Connect atoms to form molecules
 */

export type AtomType = "C" | "O" | "H" | "N";

export interface Atom {
  id: number;
  type: AtomType;
  x: number;
  y: number;
  maxBonds: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export interface Level {
  id: number;
  atoms: { type: AtomType; x: number; y: number }[];
  targetBonds: [number, number][];
}

export interface GameState {
  atoms: Atom[];
  bonds: Bond[];
  targetBonds: Bond[];
  level: number;
  status: "playing" | "won";
}

const ATOM_PROPERTIES: Record<AtomType, { color: string; maxBonds: number; radius: number }> = {
  C: { color: "#4a4a4a", maxBonds: 4, radius: 25 },
  O: { color: "#ff4444", maxBonds: 2, radius: 22 },
  H: { color: "#ffffff", maxBonds: 1, radius: 18 },
  N: { color: "#4466ff", maxBonds: 3, radius: 22 },
};

const LEVELS: Level[] = [
  // Level 1: H2O - Water
  {
    id: 1,
    atoms: [
      { type: "O", x: 200, y: 200 },
      { type: "H", x: 120, y: 150 },
      { type: "H", x: 280, y: 150 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
    ],
  },
  // Level 2: CO2 - Carbon Dioxide
  {
    id: 2,
    atoms: [
      { type: "C", x: 200, y: 200 },
      { type: "O", x: 100, y: 200 },
      { type: "O", x: 300, y: 200 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
    ],
  },
  // Level 3: CH4 - Methane
  {
    id: 3,
    atoms: [
      { type: "C", x: 200, y: 200 },
      { type: "H", x: 200, y: 120 },
      { type: "H", x: 120, y: 240 },
      { type: "H", x: 280, y: 240 },
      { type: "H", x: 200, y: 280 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  // Level 4: NH3 - Ammonia
  {
    id: 4,
    atoms: [
      { type: "N", x: 200, y: 200 },
      { type: "H", x: 120, y: 260 },
      { type: "H", x: 200, y: 120 },
      { type: "H", x: 280, y: 260 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  // Level 5: H2O2 - Hydrogen Peroxide
  {
    id: 5,
    atoms: [
      { type: "O", x: 150, y: 200 },
      { type: "O", x: 250, y: 200 },
      { type: "H", x: 80, y: 150 },
      { type: "H", x: 320, y: 250 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [1, 3],
    ],
  },
  // Level 6: HCN - Hydrogen Cyanide
  {
    id: 6,
    atoms: [
      { type: "H", x: 80, y: 200 },
      { type: "C", x: 180, y: 200 },
      { type: "N", x: 300, y: 200 },
    ],
    targetBonds: [
      [0, 1],
      [1, 2],
    ],
  },
  // Level 7: C2H6 - Ethane
  {
    id: 7,
    atoms: [
      { type: "C", x: 150, y: 200 },
      { type: "C", x: 250, y: 200 },
      { type: "H", x: 80, y: 140 },
      { type: "H", x: 80, y: 260 },
      { type: "H", x: 150, y: 120 },
      { type: "H", x: 320, y: 140 },
      { type: "H", x: 320, y: 260 },
      { type: "H", x: 250, y: 280 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 5],
      [1, 6],
      [1, 7],
    ],
  },
  // Level 8: N2O - Nitrous Oxide
  {
    id: 8,
    atoms: [
      { type: "N", x: 120, y: 200 },
      { type: "N", x: 200, y: 200 },
      { type: "O", x: 300, y: 200 },
    ],
    targetBonds: [
      [0, 1],
      [1, 2],
    ],
  },
  // Level 9: CH3OH - Methanol
  {
    id: 9,
    atoms: [
      { type: "C", x: 150, y: 200 },
      { type: "O", x: 270, y: 200 },
      { type: "H", x: 80, y: 140 },
      { type: "H", x: 80, y: 260 },
      { type: "H", x: 150, y: 120 },
      { type: "H", x: 340, y: 200 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 5],
    ],
  },
  // Level 10: C2H4 - Ethylene
  {
    id: 10,
    atoms: [
      { type: "C", x: 150, y: 200 },
      { type: "C", x: 250, y: 200 },
      { type: "H", x: 80, y: 140 },
      { type: "H", x: 80, y: 260 },
      { type: "H", x: 320, y: 140 },
      { type: "H", x: 320, y: 260 },
    ],
    targetBonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 4],
      [1, 5],
    ],
  },
];

export class MoleculeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    const atoms: Atom[] = level.atoms.map((a, i) => ({
      id: i,
      type: a.type,
      x: a.x,
      y: a.y,
      maxBonds: ATOM_PROPERTIES[a.type].maxBonds,
    }));

    const targetBonds: Bond[] = level.targetBonds.map(([a1, a2]) => ({
      atom1: Math.min(a1, a2),
      atom2: Math.max(a1, a2),
    }));

    return {
      atoms,
      bonds: [],
      targetBonds,
      level: levelNum,
      status: "playing",
    };
  }

  public start(levelNum: number = 1): void {
    this.state = this.createInitialState(levelNum);
    this.emitState();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getAtomProperties(type: AtomType) {
    return ATOM_PROPERTIES[type];
  }

  public addBond(atom1Id: number, atom2Id: number): boolean {
    if (this.state.status !== "playing") return false;
    if (atom1Id === atom2Id) return false;

    const id1 = Math.min(atom1Id, atom2Id);
    const id2 = Math.max(atom1Id, atom2Id);

    // Check if bond already exists
    const exists = this.state.bonds.some(
      (b) => b.atom1 === id1 && b.atom2 === id2
    );
    if (exists) return false;

    // Check if atoms can have more bonds
    const atom1 = this.state.atoms.find((a) => a.id === id1)!;
    const atom2 = this.state.atoms.find((a) => a.id === id2)!;

    const atom1BondCount = this.state.bonds.filter(
      (b) => b.atom1 === id1 || b.atom2 === id1
    ).length;
    const atom2BondCount = this.state.bonds.filter(
      (b) => b.atom1 === id2 || b.atom2 === id2
    ).length;

    if (atom1BondCount >= atom1.maxBonds || atom2BondCount >= atom2.maxBonds) {
      return false;
    }

    this.state.bonds.push({ atom1: id1, atom2: id2 });

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
    }

    this.emitState();
    return true;
  }

  public removeBond(atom1Id: number, atom2Id: number): boolean {
    const id1 = Math.min(atom1Id, atom2Id);
    const id2 = Math.max(atom1Id, atom2Id);

    const idx = this.state.bonds.findIndex(
      (b) => b.atom1 === id1 && b.atom2 === id2
    );
    if (idx === -1) return false;

    this.state.bonds.splice(idx, 1);
    this.emitState();
    return true;
  }

  public clearBonds(): void {
    this.state.bonds = [];
    this.emitState();
  }

  private checkWin(): boolean {
    if (this.state.bonds.length !== this.state.targetBonds.length) return false;

    const bondSet = new Set(
      this.state.bonds.map((b) => `${b.atom1}-${b.atom2}`)
    );
    return this.state.targetBonds.every((b) =>
      bondSet.has(`${b.atom1}-${b.atom2}`)
    );
  }

  public reset(): void {
    this.start(this.state.level);
  }

  public nextLevel(): boolean {
    if (this.state.level >= LEVELS.length) return false;
    this.start(this.state.level + 1);
    return true;
  }

  public getState(): GameState {
    return this.state;
  }

  public getRequiredBonds(): number {
    return this.state.targetBonds.length;
  }

  public getCurrentBonds(): number {
    return this.state.bonds.length;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

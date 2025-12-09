/**
 * Logic Gates Main Entry
 * Game #027
 */
import { LogicGame, type Gate, type Wire } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const svgContainer = document.getElementById("svg-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const checkBtn = document.getElementById("check-btn")!;

// Namespaces
const SVG_NS = "http://www.w3.org/2000/svg";

let game: LogicGame;
let svg: SVGSVGElement;
let dragGateId: number | null = null;
let dragOffset = { x: 0, y: 0 };

// Wire Creation State
let wiringStart: {
  gateId: number;
  type: "input" | "output";
  portIdx: number;
} | null = null;
let tempWire: SVGPathElement | null = null;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener("change", () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  // Create SVG
  svg = document.createElementNS(SVG_NS, "svg");
  svgContainer.appendChild(svg);

  // Mouse Events for SVG background (Wire drag)
  svg.addEventListener("mousemove", onSvgMouseMove);
  svg.addEventListener("mouseup", onSvgMouseUp);

  game = new LogicGame(svgContainer);

  // Drag & Drop specific types
  const draggables = document.querySelectorAll(".gate-draggable");
  draggables.forEach((d) => {
    d.addEventListener("dragstart", (e: any) => {
      e.dataTransfer.setData("type", d.getAttribute("data-type"));
    });
  });

  svgContainer.addEventListener("dragover", (e) => e.preventDefault());
  svgContainer.addEventListener("drop", (e: any) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const rect = svgContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (type) game.addGate(type, x, y);
  });

  game.setOnStateChange((state: any) => {
    render(state);

    if (state.status === "won") {
      showWin();
    }
  });
}

function render(state: any) {
  // Clear check? Or diff?
  // Complete redraw for MVP simplicity (state size is small)
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Draw Wires
  state.wires.forEach((w: Wire) => {
    const fromG = state.gates.find((g: Gate) => g.id === w.fromGateId);
    const toG = state.gates.find((g: Gate) => g.id === w.toGateId);
    if (!fromG || !toG) return;

    const path = document.createElementNS(SVG_NS, "path");
    const p1 = getPortPos(fromG, "output", 0);
    const p2 = getPortPos(toG, "input", w.toPortIdx);

    const d = getWirePath(p1.x, p1.y, p2.x, p2.y);
    path.setAttribute("d", d);
    path.setAttribute("class", `wire ${w.value ? "active" : ""}`);

    // Click to delete
    path.addEventListener("click", (e) => {
      e.stopPropagation();
      game.removeWire(w.id);
    });

    svg.appendChild(path);
  });

  // Temp Wire
  if (tempWire) svg.appendChild(tempWire);

  // Draw Gates
  state.gates.forEach((g: Gate) => {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", `translate(${g.x}, ${g.y})`);
    group.setAttribute("class", "gate-group");

    // Drag Logic
    group.addEventListener("mousedown", (e) => {
      if ((e.target as Element).classList.contains("port")) return; // Don't drag gate if clicking port
      e.stopPropagation(); // prevent wire cancel
      dragGateId = g.id;
      dragOffset = { x: 0, y: 0 }; // relative?
      // Actually offset from mouse logic usually needed
    });

    // Draw Body based on Type
    renderGateBody(group, g);

    svg.appendChild(group);
  });
}

function renderGateBody(group: SVGGElement, g: Gate) {
  if (g.type === "INPUT") {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "-20");
    rect.setAttribute("y", "-20");
    rect.setAttribute("width", "40");
    rect.setAttribute("height", "40");
    rect.setAttribute("class", `io-node ${g.value ? "on" : ""}`);
    rect.setAttribute("rx", "5");

    // Click to toggle
    rect.addEventListener("click", () => game.toggleInput(g.id));

    group.appendChild(rect);

    const text = document.createElementNS(SVG_NS, "text");
    text.textContent = g.label || "IN";
    text.setAttribute("y", "5");
    text.setAttribute("class", "gate-text");
    text.style.pointerEvents = "none";
    group.appendChild(text);

    // Output Port
    createPort(group, g.id, 20, 0, "output", 0);
  } else if (g.type === "OUTPUT") {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", "20");
    circle.setAttribute("class", `io-node ${g.value ? "on" : ""}`);
    group.appendChild(circle);

    const text = document.createElementNS(SVG_NS, "text");
    text.textContent = "OUT";
    text.setAttribute("y", "5");
    text.setAttribute("class", "gate-text");
    group.appendChild(text);

    // Input Port
    createPort(group, g.id, -20, 0, "input", 0);
  } else {
    // Logic Gates
    const path = document.createElementNS(SVG_NS, "path");
    let d = "";
    let fill = "#ecf0f1";

    if (g.type === "AND") {
      // D-shape
      d = "M-20,-20 L0,-20 Q20,-20 20,0 Q20,20 0,20 L-20,20 Z";
    } else if (g.type === "OR") {
      // Shield shape
      d = "M-20,-20 Q0,-20 10,-10 Q25,0 10,10 Q0,20 -20,20 Q-10,0 -20,-20 Z";
    } else if (g.type === "NOT") {
      // Triangle
      d = "M-20,-15 L10,0 L-20,15 Z";
      // Circle tip handled separately or included
      // Let's add circle at tip
    }

    path.setAttribute("d", d);
    path.setAttribute("class", "gate-body");
    group.appendChild(path);

    if (g.type === "NOT") {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", "15");
      c.setAttribute("cy", "0");
      c.setAttribute("r", "5");
      c.setAttribute("class", "gate-body");
      group.appendChild(c);
    }

    const text = document.createElementNS(SVG_NS, "text");
    text.textContent = g.type;
    text.setAttribute("x", "-5");
    text.setAttribute("y", "4");
    text.setAttribute("class", "gate-text");
    group.appendChild(text);

    // Ports
    if (g.type === "NOT") {
      createPort(group, g.id, -20, 0, "input", 0);
      createPort(group, g.id, 20, 0, "output", 0); // Tip of triangle + circle
    } else {
      createPort(group, g.id, -20, -10, "input", 0);
      createPort(group, g.id, -20, 10, "input", 1);
      createPort(group, g.id, 20, 0, "output", 0);
    }
  }
}

function createPort(
  group: SVGGElement,
  gId: number,
  x: number,
  y: number,
  type: "input" | "output",
  idx: number
) {
  const c = document.createElementNS(SVG_NS, "circle");
  c.setAttribute("cx", x.toString());
  c.setAttribute("cy", y.toString());
  c.setAttribute("r", "6");
  c.setAttribute("class", `port ${type}`);

  c.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    wiringStart = { gateId: gId, type, portIdx: idx };
    tempWire = document.createElementNS(SVG_NS, "path");
    tempWire.setAttribute("class", "wire");
    // Start pos
    const p = getPortPos(
      { x: 0, y: 0, type: "AND", id: 0, inputs: [], outputs: [], value: false },
      type,
      0
    ); // dummy for offset
    // Wait, better to store start coords
  });

  // Handle Drop (MouseUp)
  c.addEventListener("mouseup", (e) => {
    e.stopPropagation();
    if (wiringStart) {
      // Validate Connection: Output -> Input
      if (wiringStart.type === "output" && type === "input") {
        game.addWire(wiringStart.gateId, gId, idx);
      } else if (wiringStart.type === "input" && type === "output") {
        game.addWire(gId, wiringStart.gateId, wiringStart.portIdx);
      }
      wiringStart = null;
      if (tempWire) tempWire.remove();
      tempWire = null;
    }
  });

  group.appendChild(c);
}

function getPortPos(g: Gate, type: "input" | "output", idx: number) {
  // Basic offsets from gate center (x,y)
  // Matches renderGateBody
  let dx = 0,
    dy = 0;

  if (g.type === "INPUT") {
    if (type === "output") dx = 20;
  } else if (g.type === "OUTPUT") {
    if (type === "input") dx = -20;
  } else if (g.type === "NOT") {
    if (type === "input") dx = -20;
    else dx = 20;
  } else {
    if (type === "input") {
      dx = -20;
      dy = idx === 0 ? -10 : 10;
    } else {
      dx = 20;
    }
  }
  return { x: g.x + dx, y: g.y + dy };
}

function getWirePath(x1: number, y1: number, x2: number, y2: number) {
  // Benzier
  const cx1 = x1 + 50;
  const cx2 = x2 - 50;
  return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
}

function onSvgMouseMove(e: MouseEvent) {
  const rect = svgContainer.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (dragGateId) {
    // Update gate pos
    // Snap?
    game.moveGate(dragGateId, mx, my);
  }

  if (wiringStart && tempWire) {
    // Draw from start to mouse
    const startG = (game as any).gates.find(
      (g: Gate) => g.id === wiringStart!.gateId
    );
    if (startG) {
      const startPos = getPortPos(
        startG,
        wiringStart.type,
        wiringStart.portIdx
      );
      const d = getWirePath(startPos.x, startPos.y, mx, my);
      tempWire.setAttribute("d", d);
    }
  }
}

function onSvgMouseUp(e: MouseEvent) {
  dragGateId = null;
  if (wiringStart) {
    wiringStart = null;
    if (tempWire) tempWire.remove();
    tempWire = null;
  }
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
checkBtn.addEventListener("click", () => game.check());

// Init
initI18n();
initGame();

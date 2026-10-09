/** Procedural canvas textures for Pyramid: card faces (one atlas), card back, felt, grain, glow, slot marks and confetti. */
import { THREE } from '../../../shared/three/kit';
import { isRed, rankOf, suitOf, type Suit } from './logic';

export const FACE_W = 200;
export const FACE_H = 280;
const PAD = 4;
export const CELL_W = FACE_W + PAD * 2;
export const CELL_H = FACE_H + PAD * 2;
export const ATLAS_W = CELL_W * 13;
export const ATLAS_H = CELL_H * 4;

const RED = '#b81d2f';
const INK = '#17202b';
const GOLD = '#c9a043';
const GOLD_DARK = '#7a5a17';
const SERIF = "Georgia, 'Times New Roman', 'Noto Serif', serif";
export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUIT_CHARS = ['♠', '♥', '♦', '♣'];

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return [el, el.getContext('2d')!];
}

function texture(el: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(el);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fills a suit symbol of height `s` centred on (cx, cy). Drawn as paths, so no font needs the glyphs. */
export function drawSuit(ctx: CanvasRenderingContext2D, suit: Suit, cx: number, cy: number, s: number): void {
  const w = s;
  const h = s;
  ctx.beginPath();
  if (suit === 1) {
    ctx.moveTo(cx, cy + h * 0.44);
    ctx.bezierCurveTo(cx - w * 0.12, cy + h * 0.26, cx - w * 0.5, cy + h * 0.06, cx - w * 0.5, cy - h * 0.16);
    ctx.bezierCurveTo(cx - w * 0.5, cy - h * 0.42, cx - w * 0.14, cy - h * 0.5, cx, cy - h * 0.24);
    ctx.bezierCurveTo(cx + w * 0.14, cy - h * 0.5, cx + w * 0.5, cy - h * 0.42, cx + w * 0.5, cy - h * 0.16);
    ctx.bezierCurveTo(cx + w * 0.5, cy + h * 0.06, cx + w * 0.12, cy + h * 0.26, cx, cy + h * 0.44);
  } else if (suit === 2) {
    ctx.moveTo(cx, cy - h * 0.5);
    ctx.quadraticCurveTo(cx + w * 0.16, cy - h * 0.18, cx + w * 0.4, cy);
    ctx.quadraticCurveTo(cx + w * 0.16, cy + h * 0.18, cx, cy + h * 0.5);
    ctx.quadraticCurveTo(cx - w * 0.16, cy + h * 0.18, cx - w * 0.4, cy);
    ctx.quadraticCurveTo(cx - w * 0.16, cy - h * 0.18, cx, cy - h * 0.5);
  } else if (suit === 0) {
    ctx.moveTo(cx, cy - h * 0.5);
    ctx.bezierCurveTo(cx + w * 0.12, cy - h * 0.3, cx + w * 0.5, cy - h * 0.12, cx + w * 0.5, cy + h * 0.1);
    ctx.bezierCurveTo(cx + w * 0.5, cy + h * 0.32, cx + w * 0.2, cy + h * 0.38, cx + w * 0.05, cy + h * 0.2);
    ctx.quadraticCurveTo(cx + w * 0.07, cy + h * 0.42, cx + w * 0.24, cy + h * 0.5);
    ctx.lineTo(cx - w * 0.24, cy + h * 0.5);
    ctx.quadraticCurveTo(cx - w * 0.07, cy + h * 0.42, cx - w * 0.05, cy + h * 0.2);
    ctx.bezierCurveTo(cx - w * 0.2, cy + h * 0.38, cx - w * 0.5, cy + h * 0.32, cx - w * 0.5, cy + h * 0.1);
    ctx.bezierCurveTo(cx - w * 0.5, cy - h * 0.12, cx - w * 0.12, cy - h * 0.3, cx, cy - h * 0.5);
  } else {
    const r = w * 0.22;
    ctx.arc(cx, cy - h * 0.22, r, 0, Math.PI * 2);
    ctx.moveTo(cx - w * 0.25 + r, cy + h * 0.07);
    ctx.arc(cx - w * 0.25, cy + h * 0.07, r, 0, Math.PI * 2);
    ctx.moveTo(cx + w * 0.25 + r, cy + h * 0.07);
    ctx.arc(cx + w * 0.25, cy + h * 0.07, r, 0, Math.PI * 2);
    ctx.moveTo(cx - w * 0.08, cy);
    ctx.lineTo(cx + w * 0.08, cy);
    ctx.quadraticCurveTo(cx + w * 0.06, cy + h * 0.38, cx + w * 0.24, cy + h * 0.5);
    ctx.lineTo(cx - w * 0.24, cy + h * 0.5);
    ctx.quadraticCurveTo(cx - w * 0.06, cy + h * 0.38, cx - w * 0.08, cy);
  }
  ctx.fill();
}

/** Text squeezed horizontally when it is wider than `maxWidth` (the "10" index). */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) { ctx.fillText(text, x, y); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(maxWidth / width, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Pip rows as fractions of the pip field, column -1/0/1.
const PIPS: Record<number, Array<[number, number]>> = {
  2: [[0, 0], [0, 1]],
  3: [[0, 0], [0, 0.5], [0, 1]],
  4: [[-1, 0], [1, 0], [-1, 1], [1, 1]],
  5: [[-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  6: [[-1, 0], [1, 0], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  7: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  8: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [0, 0.75], [-1, 1], [1, 1]],
  9: [[-1, 0], [1, 0], [-1, 1 / 3], [1, 1 / 3], [0, 0.5], [-1, 2 / 3], [1, 2 / 3], [-1, 1], [1, 1]],
  10: [[-1, 0], [1, 0], [0, 1 / 6], [-1, 1 / 3], [1, 1 / 3], [-1, 2 / 3], [1, 2 / 3], [0, 5 / 6], [-1, 1], [1, 1]],
};

function drawCrown(ctx: CanvasRenderingContext2D, rank: number, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (rank === 13) {
    ctx.moveTo(cx - 22, cy + 12);
    ctx.lineTo(cx - 25, cy - 12);
    ctx.lineTo(cx - 12, cy - 1);
    ctx.lineTo(cx, cy - 18);
    ctx.lineTo(cx + 12, cy - 1);
    ctx.lineTo(cx + 25, cy - 12);
    ctx.lineTo(cx + 22, cy + 12);
    ctx.closePath();
  } else if (rank === 12) {
    ctx.moveTo(cx - 20, cy + 11);
    ctx.quadraticCurveTo(cx - 24, cy - 4, cx - 14, cy - 9);
    ctx.quadraticCurveTo(cx - 8, cy + 1, cx, cy - 14);
    ctx.quadraticCurveTo(cx + 8, cy + 1, cx + 14, cy - 9);
    ctx.quadraticCurveTo(cx + 24, cy - 4, cx + 20, cy + 11);
    ctx.closePath();
  } else {
    // Jack: a plumed cap.
    ctx.moveTo(cx - 20, cy + 11);
    ctx.quadraticCurveTo(cx - 18, cy - 6, cx + 2, cy - 7);
    ctx.quadraticCurveTo(cx + 18, cy - 6, cx + 20, cy + 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 6);
    ctx.quadraticCurveTo(cx + 26, cy - 26, cx + 30, cy - 10);
    ctx.quadraticCurveTo(cx + 18, cy - 14, cx + 4, cy - 6);
  }
  ctx.fill();
  ctx.stroke();
  // Jewels.
  ctx.fillStyle = '#0f7a5a';
  const jewels = rank === 13 ? [-25, 0, 25] : rank === 12 ? [-14, 0, 14] : [0];
  for (const dx of jewels) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + (rank === 13 ? (dx ? -12 : -18) : rank === 12 ? (dx ? -9 : -14) : 3), 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(cx - 21, cy + 6, 42, 2);
  ctx.restore();
}

function drawCourt(ctx: CanvasRenderingContext2D, card: number): void {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const color = isRed(card) ? RED : INK;
  const x = 46, y = 38, w = FACE_W - 92, h = FACE_H - 76;
  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  if (isRed(card)) { bg.addColorStop(0, '#fff3e8'); bg.addColorStop(1, '#f5d9c6'); }
  else { bg.addColorStop(0, '#f0f7f2'); bg.addColorStop(1, '#d3e6db'); }
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.clip();
  // Diagonal brocade.
  ctx.strokeStyle = isRed(card) ? 'rgba(184, 29, 47, 0.1)' : 'rgba(15, 106, 76, 0.13)';
  ctx.lineWidth = 2;
  for (let i = -h; i < w + h; i += 12) {
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i - h, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + i - h, y); ctx.lineTo(x + i, y + h); ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = GOLD_DARK;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.stroke();
  const cx = FACE_W / 2;
  const cy = FACE_H / 2;
  // Mirrored halves, like a real court card.
  for (let half = 0; half < 2; half++) {
    ctx.save();
    if (half) { ctx.translate(cx, cy); ctx.rotate(Math.PI); ctx.translate(-cx, -cy); }
    drawCrown(ctx, rank, cx, y + 30);
    ctx.fillStyle = color;
    ctx.font = `700 60px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(RANK_LABELS[rank], cx, cy - 16);
    drawSuit(ctx, suit, cx - 34, cy - 30, 16);
    drawSuit(ctx, suit, cx + 34, cy - 30, 16);
    ctx.restore();
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 10, cy); ctx.lineTo(x + w - 10, cy); ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 7, cy); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, card: number): void {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const color = isRed(card) ? RED : INK;
  roundRect(ctx, 0, 0, FACE_W, FACE_H, 15);
  const paper = ctx.createLinearGradient(0, 0, 0, FACE_H);
  paper.addColorStop(0, '#fffdf7');
  paper.addColorStop(1, '#f3ead7');
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.strokeStyle = 'rgba(176, 140, 64, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 7, 7, FACE_W - 14, FACE_H - 14, 10);
  ctx.stroke();

  // Corner index: large, since only the top of covered pyramid cards shows.
  for (let corner = 0; corner < 2; corner++) {
    ctx.save();
    if (corner) { ctx.translate(FACE_W, FACE_H); ctx.rotate(Math.PI); }
    ctx.fillStyle = color;
    ctx.font = `700 50px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    fitText(ctx, RANK_LABELS[rank], 31, 56, 44);
    drawSuit(ctx, suit, 31, 80, 27);
    ctx.restore();
  }

  ctx.fillStyle = color;
  if (rank === 1) {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(FACE_W / 2, FACE_H / 2, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(FACE_W / 2, FACE_H / 2, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    drawSuit(ctx, suit, FACE_W / 2, FACE_H / 2 + 2, suit === 2 ? 84 : 76);
  } else if (rank <= 10) {
    const top = 66, span = FACE_H - 132;
    for (const [col, f] of PIPS[rank]) {
      const px = FACE_W / 2 + col * 37;
      const py = top + f * span;
      ctx.save();
      ctx.translate(px, py);
      if (f > 0.5) ctx.rotate(Math.PI);
      drawSuit(ctx, suit, 0, 0, 34);
      ctx.restore();
    }
  } else {
    drawCourt(ctx, card);
  }
}

/** All 52 faces in one 13 x 4 atlas: column = rank - 1, row = suit. */
export function buildAtlas(): THREE.CanvasTexture {
  const [el, ctx] = canvas(ATLAS_W, ATLAS_H);
  // Paper colour behind every cell, so mipmaps never bleed dark seams into the card edges.
  ctx.fillStyle = '#efe5cf';
  ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);
  for (let card = 0; card < 52; card++) {
    ctx.save();
    ctx.translate((rankOf(card) - 1) * CELL_W + PAD, suitOf(card) * CELL_H + PAD);
    drawFace(ctx, card);
    ctx.restore();
  }
  return texture(el);
}

/** Atlas UV rectangle [u0, v0, u1, v1] of a card's face. */
export function atlasRect(card: number): [number, number, number, number] {
  const x = (rankOf(card) - 1) * CELL_W + PAD;
  const y = suitOf(card) * CELL_H + PAD;
  return [x / ATLAS_W, 1 - (y + FACE_H) / ATLAS_H, (x + FACE_W) / ATLAS_W, 1 - y / ATLAS_H];
}

/** Emerald back with a gold lattice and a stepped-pyramid medallion. */
export function buildBack(): THREE.CanvasTexture {
  const W = 256, H = 358;
  const [el, ctx] = canvas(W, H);
  ctx.fillStyle = '#063526';
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, 19);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H * 0.7);
  bg.addColorStop(0, '#13775a');
  bg.addColorStop(1, '#063526');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  roundRect(ctx, 22, 22, W - 44, H - 44, 8);
  ctx.clip();
  ctx.strokeStyle = 'rgba(232, 196, 110, 0.28)';
  ctx.lineWidth = 1.3;
  for (let i = -H; i < W + H; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + H, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240, 206, 120, 0.45)';
  for (let y = 0; y < H; y += 20) {
    for (let x = (y / 20) % 2 ? 10 : 0; x < W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#e2bd62';
  ctx.lineWidth = 4;
  roundRect(ctx, 12, 12, W - 24, H - 24, 12);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRect(ctx, 21, 21, W - 42, H - 42, 8);
  ctx.stroke();

  const cx = W / 2, cy = H / 2;
  ctx.fillStyle = '#073b2b';
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e2bd62';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke();
  // Stepped pyramid of three tiers.
  const gold = ctx.createLinearGradient(cx - 40, cy - 30, cx + 40, cy + 30);
  gold.addColorStop(0, '#f6dc8c');
  gold.addColorStop(1, '#b8892c');
  ctx.fillStyle = gold;
  const tiers = [[36, 16], [24, 0], [12, -16]];
  for (const [half, top] of tiers) ctx.fillRect(cx - half, cy + top - 1, half * 2, 15);
  ctx.beginPath(); ctx.moveTo(cx, cy - 34); ctx.lineTo(cx + 9, cy - 18); ctx.lineTo(cx - 9, cy - 18); ctx.closePath(); ctx.fill();
  return texture(el);
}

/** Emerald felt: fibrous noise and a dark vignette baked in. */
export function buildFelt(): THREE.CanvasTexture {
  const S = 1024;
  const [el, ctx] = canvas(S, S);
  ctx.fillStyle = '#0b5038';
  ctx.fillRect(0, 0, S, S);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Low-frequency mottling, like dyed wool.
  for (let i = 0; i < 260; i++) {
    const x = rand() * S, y = rand() * S, r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? 'rgba(40, 140, 100, 0.07)' : 'rgba(0, 25, 16, 0.08)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const image = ctx.getImageData(0, 0, S, S);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    data[i] = clampByte(data[i] + n * 0.6);
    data[i + 1] = clampByte(data[i + 1] + n);
    data[i + 2] = clampByte(data[i + 2] + n * 0.8);
  }
  ctx.putImageData(image, 0, 0);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5000; i++) {
    const x = rand() * S, y = rand() * S, a = rand() * Math.PI, l = 2 + rand() * 6;
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(150, 225, 190, 0.035)' : 'rgba(0, 18, 10, 0.05)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  // Vignette: the table falls off into the dark room.
  const vignette = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.5);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.45, 'rgba(0, 8, 5, 0.32)');
  vignette.addColorStop(0.8, 'rgba(1, 7, 5, 0.8)');
  vignette.addColorStop(1, 'rgba(2, 10, 7, 1)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, S, S);
  return texture(el);
}

const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Small tileable grain used as a bump map for the felt nap. */
export function buildGrain(): THREE.CanvasTexture {
  const S = 128;
  const [el, ctx] = canvas(S, S);
  const image = ctx.createImageData(S, S);
  let seed = 11;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = 96 + (seed / 2147483647) * 64;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const tex = texture(el, false);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Soft white glow around a card-shaped hole; tinted by the halo materials. */
export function buildGlow(): THREE.CanvasTexture {
  const W = 256, H = 320;
  const [el, ctx] = canvas(W, H);
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffffff';
  const cw = W * 0.64, ch = H * 0.7;
  roundRect(ctx, (W - cw) / 2, (H - ch) / 2, cw, ch, 12);
  ctx.fill();
  ctx.fill();
  return texture(el);
}

/** Radial dot for particles. */
export function buildDot(): THREE.CanvasTexture {
  const [el, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return texture(el);
}

/** Outline drawn on the felt where a pile sits; `icon` adds a redeal arrow or a stop mark. */
export function buildSlotMark(icon: 'none' | 'redeal' | 'empty'): THREE.CanvasTexture {
  const W = 200, H = 280;
  const [el, ctx] = canvas(W, H);
  ctx.strokeStyle = 'rgba(236, 204, 128, 0.55)';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  roundRect(ctx, 6, 6, W - 12, H - 12, 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0, 30, 20, 0.25)';
  roundRect(ctx, 6, 6, W - 12, H - 12, 16);
  ctx.fill();
  const cx = W / 2, cy = H / 2;
  ctx.strokeStyle = 'rgba(240, 210, 130, 0.85)';
  ctx.fillStyle = 'rgba(240, 210, 130, 0.85)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  if (icon === 'redeal') {
    ctx.beginPath(); ctx.arc(cx, cy, 44, -Math.PI * 0.35, Math.PI * 1.3); ctx.stroke();
    const a = -Math.PI * 0.35;
    const tx = cx + Math.cos(a) * 44, ty = cy + Math.sin(a) * 44;
    ctx.beginPath(); ctx.moveTo(tx + 20, ty - 4); ctx.lineTo(tx - 6, ty - 20); ctx.lineTo(tx - 4, ty + 14); ctx.closePath(); ctx.fill();
  } else if (icon === 'empty') {
    ctx.strokeStyle = 'rgba(240, 210, 130, 0.4)';
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 28, cy + 28); ctx.lineTo(cx + 28, cy - 28); ctx.stroke();
  }
  return texture(el);
}

/** A tiny card used by the win confetti. */
export function buildMiniCard(): THREE.CanvasTexture {
  const [el, ctx] = canvas(64, 88);
  roundRect(ctx, 0, 0, 64, 88, 8);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  roundRect(ctx, 4, 4, 56, 80, 6);
  ctx.stroke();
  ctx.fillStyle = '#c0303c';
  drawSuit(ctx, 1, 32, 44, 34);
  return texture(el);
}

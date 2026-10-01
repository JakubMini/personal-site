// The hero's circuit board. The hero's green stands in for the solder mask,
// and as the page scrolls a signal crosses it: current through a shunt
// resistor, up the sense lines into an amplifier, through the MCU, a shielded
// radio and its antenna, a hop to the cloud, then a second hop onto a
// dashboard, where it lands as the chart's newest point.
//
// Drawn in a 2D canvas in the site's own flat language: copper is an ink tint
// on the green, metal and ceramic are paper with an ink outline, moulded
// packages are ink, and light is paper-white. The board is rendered once per
// size; each frame adds the signal and whatever it is lighting up.
// scripts/motion.ts scrubs the progress with the scroll.

type Pt = [number, number];

interface Segment {
  pts: Pt[];
  part?: 'shunt' | 'amp' | 'mcu' | 'rf' | 'ant' | 'cloud';
  air?: boolean;
  link?: boolean;
  chart?: boolean;
  lens: number[];
  len: number;
  start: number;
}

// Layout units; the canvas keeps these proportions (global.css, .hero-chain).
const W = 1660;
const H = 300;
const TAU = Math.PI * 2;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
};
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---- The route the signal takes; segments with a `part` hide it -------------

const quad = ([ax, ay]: Pt, [cx, cy]: Pt, [bx, by]: Pt): Pt[] =>
  Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
  });

// The dashboard's chart: past values, and the one the signal brings.
const HIST = [0.32, 0.38, 0.35, 0.46, 0.42, 0.55, 0.51, 0.6, 0.58];
const NEXT = 0.72;
const chartX = (i: number) => 1440 + i * 20;
const chartY = (v: number) => 244 - v * 80;
const LAST: Pt = [chartX(HIST.length - 1), chartY(HIST[HIST.length - 1])];
const AIR = quad([1026, 155], [1085, 112], [1148, 148]);
const LINK = quad([1362, 120], [1480, 24], LAST);
const CARD = { x: 1420, y: 96, w: 220, h: 166 };

const ROUTE: Segment[] = (
  [
    { pts: [[-10, 200], [160, 200]] },
    { pts: [[160, 200], [186, 200], [186, 176]], part: 'shunt' },
    { pts: [[186, 176], [186, 118], [322, 118]] },
    { pts: [[322, 118], [356, 118]], part: 'amp' },
    { pts: [[356, 118], [420, 118], [447.5, 145.5], [508, 145.5]] },
    { pts: [[508, 145.5], [662, 154.5]], part: 'mcu' },
    { pts: [[662, 154.5], [760, 154.5]] },
    { pts: [[760, 154.5], [880, 155]], part: 'rf' },
    { pts: [[880, 155], [950, 155]] },
    { pts: [[950, 155], [1026, 155]], part: 'ant' },
    { pts: AIR, air: true },
    { pts: [[1148, 148], [1240, 142], [1362, 120]], part: 'cloud' },
    { pts: LINK, link: true },
    { pts: [LAST, [chartX(HIST.length), chartY(NEXT)]], chart: true },
  ] as Omit<Segment, 'lens' | 'len' | 'start'>[]
).map((seg) => ({ ...seg, lens: [], len: 0, start: 0 }));

let TOTAL = 0;
for (const seg of ROUTE) {
  for (let i = 1; i < seg.pts.length; i++) {
    const l = Math.hypot(seg.pts[i][0] - seg.pts[i - 1][0], seg.pts[i][1] - seg.pts[i - 1][1]);
    seg.lens.push(l);
    seg.len += l;
  }
  seg.start = TOTAL;
  TOTAL += seg.len;
}

const byPart = (name: Segment['part']) => ROUTE.find((r) => r.part === name)!;
const AIR_SEG = ROUTE.find((r) => r.air)!;
const LINK_SEG = ROUTE.find((r) => r.link)!;
const CHART_SEG = ROUTE.find((r) => r.chart)!;
const HIDDEN = ROUTE.filter((r) => r.part);

function point(s: number): Pt {
  s = clamp(s, 0, TOTAL);
  const seg = ROUTE.find((r) => s <= r.start + r.len) ?? ROUTE[ROUTE.length - 1];
  let d = s - seg.start;
  for (let i = 0; i < seg.lens.length; i++) {
    if (d <= seg.lens[i] || i === seg.lens.length - 1) {
      const k = seg.lens[i] ? d / seg.lens[i] : 0;
      const [a, b] = [seg.pts[i], seg.pts[i + 1]];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    d -= seg.lens[i];
  }
  return seg.pts[seg.pts.length - 1];
}

// 1 inside a segment, easing to 0 over `edge` either side of it.
const within = (s: number, seg: Segment, edge: number) => smooth(Math.min(s - seg.start + edge, seg.start + seg.len + edge - s) / edge);
const visible = (s: number) => smooth(s / 30) * HIDDEN.reduce((v, seg) => v * (1 - within(s, seg, 7)), 1);

// Where the second hop crosses into the dashboard card: from there the signal
// is drawn in ink, or it would vanish on the paper.
const S_CARD = (() => {
  let at = LINK_SEG.start;
  for (let i = 1; i < LINK_SEG.pts.length; i++) {
    const [x, y] = LINK_SEG.pts[i];
    if (x >= CARD.x && x <= CARD.x + CARD.w && y >= CARD.y && y <= CARD.y + CARD.h) return at;
    at += LINK_SEG.lens[i - 1];
  }
  return LINK_SEG.start + LINK_SEG.len;
})();
const inked = (s: number) => smooth((s - S_CARD) / 10);

// ---- The cloud: dots in a cloud's outline, joined to their neighbours --------

const CLOUD = (() => {
  const random = seeded(5);
  const blobs = [[1198, 156, 44], [1262, 124, 60], [1326, 152, 46]];
  const inside = (x: number, y: number) =>
    (y <= 196 && y >= 150 && x >= 1176 && x <= 1354) || blobs.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r);
  const nodes: { x: number; y: number; z: number; d: number }[] = [];
  for (let tries = 0; nodes.length < 92 && tries < 8000; tries++) {
    const x = 1150 + random() * 226;
    const y = 60 + random() * 140;
    if (!inside(x, y) || nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 12.5)) continue;
    nodes.push({ x, y, z: random(), d: Math.hypot(x - 1152, y - 150) });
  }
  const links: [number, number][] = [];
  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 22) links.push([i, j]);
    });
  });
  return { nodes, links };
})();

// ---- Materials -----------------------------------------------------------------

const INK = '#0b0f0c';
const PAPER = '#f3f2ec';
const LIGHT = '#fbfaf4';
const GREEN = '#2ff27c';
const ink = (a: number) => `rgba(11, 15, 12, ${a})`;
const light = (a: number) => `rgba(251, 250, 244, ${a})`;
type G = CanvasRenderingContext2D;

// Device pixels per layout unit: shadow sizes ignore the transform.
let S = 1;

const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
};
const line = (g: G, pts: Pt[]) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
};
// A hairline of lift, no more.
const lift = (g: G) => {
  g.shadowColor = ink(0.14);
  g.shadowBlur = 2.5 * S;
  g.shadowOffsetX = 0;
  g.shadowOffsetY = 1.2 * S;
};

function trace(g: G, pts: Pt[], w: number) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  line(g, pts);
  g.strokeStyle = ink(w > 20 ? 0.09 : 0.3);
  g.lineWidth = w;
  g.stroke();
}
function via(g: G, x: number, y: number) {
  g.beginPath();
  g.arc(x, y, 4.6, 0, TAU);
  g.strokeStyle = ink(0.32);
  g.lineWidth = 1.3;
  g.stroke();
  g.beginPath();
  g.arc(x, y, 1.8, 0, TAU);
  g.fillStyle = ink(0.6);
  g.fill();
}
function pad(g: G, x: number, y: number, w: number, h: number) {
  g.fillStyle = PAPER;
  rr(g, x, y, w, h, 1.2);
  g.fill();
  g.strokeStyle = ink(0.22);
  g.lineWidth = 0.8;
  g.stroke();
}
// Metal and ceramic: paper with an ink outline.
function body(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.save();
  lift(g);
  g.fillStyle = PAPER;
  rr(g, x, y, w, h, r);
  g.fill();
  g.restore();
  g.strokeStyle = ink(0.7);
  g.lineWidth = 1;
  rr(g, x, y, w, h, r);
  g.stroke();
}
// A moulded package: ink, with a faint line where the top meets the sides.
function pkg(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.save();
  lift(g);
  g.fillStyle = INK;
  rr(g, x, y, w, h, r);
  g.fill();
  g.restore();
  const i = Math.min(w, h) * 0.07;
  g.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  g.lineWidth = 1;
  rr(g, x + i, y + i, w - 2 * i, h - 2 * i, r * 0.7);
  g.stroke();
}
function lead(g: G, ax: number, ay: number, bx: number, by: number, w: number) {
  g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.strokeStyle = ink(0.45);
  g.lineWidth = w + 1.2;
  g.stroke();
  g.strokeStyle = PAPER;
  g.lineWidth = w;
  g.stroke();
}
function capacitor(g: G, x: number, y: number) {
  g.save();
  g.translate(x, y);
  pad(g, -9, -5, 6, 10);
  pad(g, 3, -5, 6, 10);
  body(g, -7, -4, 14, 8, 1);
  g.fillStyle = ink(0.85);
  g.fillRect(-3.4, -4, 6.8, 8);
  g.restore();
}

// ---- The board, drawn once per size -----------------------------------------

const MCU = { x: 520, y: 85, w: 130, h: 130 };
const PITCH = 9;
const FIRST = 15.5;
const LEADS = 12;
const LEAD_LEN = 12;
const leadY = (i: number) => MCU.y + FIRST + i * PITCH;
const leadX = (i: number) => MCU.x + FIRST + i * PITCH;

function renderBoard(scale: number) {
  const b = document.createElement('canvas');
  b.width = Math.round(W * scale);
  b.height = Math.round(H * scale);
  const g = b.getContext('2d')!;
  g.setTransform(scale, 0, 0, scale, 0, 0);

  // Copper: the phase-current pour, then signals.
  trace(g, [[-20, 200], [160, 200]], 40);
  trace(g, [[280, 200], [420, 200], [452, 232], [452, 330]], 40);
  trace(g, [[186, 176], [186, 118], [322, 118]], 4.2);
  trace(g, [[254, 176], [254, 138], [322, 138]], 4.2);
  trace(g, [[322, 128], [306, 128]], 3.5);
  trace(g, [[356, 118], [420, 118], [447.5, 145.5], [508, 145.5]], 4.2);
  trace(g, [[662, 154.5], [760, 154.5]], 4.2);
  trace(g, [[662, 163.5], [760, 163.5]], 4.2);
  trace(g, [[880, 155], [950, 155]], 6);
  trace(g, [[508, 100.5], [492, 100.5]], 3.5);
  trace(g, [[478, 100.5], [462, 100.5]], 3.5);
  trace(g, [[662, 100.5], [685, 100.5]], 3.5);
  trace(g, [[699, 100.5], [716, 100.5]], 3.5);
  trace(g, [[662, 199.5], [685, 199.5]], 3.5);
  trace(g, [[699, 199.5], [716, 199.5]], 3.5);
  trace(g, [[leadX(4), 73], [leadX(4), 48]], 3.5);
  trace(g, [[leadX(5), 73], [leadX(5), 58], [leadX(5) + 22, 36], [leadX(5) + 60, 36]], 3.5);
  trace(g, [[leadX(2), 227], [leadX(2), 248]], 3.5);
  trace(g, [[leadX(9), 227], [leadX(9), 248]], 3.5);
  const vias: Pt[] = [[306, 128], [462, 100.5], [716, 100.5], [716, 199.5], [leadX(4), 44], [leadX(5) + 64, 36]];
  vias.forEach(([x, y]) => via(g, x, y));
  for (let x = 892; x <= 940; x += 12) {
    via(g, x, 141);
    via(g, x, 169);
  }

  // Fiducials: a dot in a ring cleared of mask.
  for (const [x, y] of [[84, 66], [1104, 266]]) {
    g.beginPath();
    g.arc(x, y, 9, 0, TAU);
    g.fillStyle = ink(0.08);
    g.fill();
    g.beginPath();
    g.arc(x, y, 4, 0, TAU);
    g.fillStyle = PAPER;
    g.fill();
    g.strokeStyle = ink(0.4);
    g.lineWidth = 0.8;
    g.stroke();
  }

  // Silkscreen.
  g.save();
  g.strokeStyle = ink(0.26);
  g.fillStyle = ink(0.26);
  g.lineWidth = 1;
  g.lineCap = 'round';
  g.strokeRect(136, 166, 168, 68);
  g.strokeRect(312, 102, 52, 52);
  const c = 8;
  const l = MCU.x - 16;
  const t = MCU.y - 16;
  const r = MCU.x + MCU.w + 16;
  const btm = MCU.y + MCU.h + 16;
  for (const corner of [
    [[l, t + c * 2], [l, t], [l + c * 2, t]],
    [[r - c * 2, t], [r, t], [r, t + c * 2]],
    [[l, btm - c * 2], [l, btm], [l + c * 2, btm]],
    [[r - c * 2, btm], [r, btm], [r, btm - c * 2]],
  ] as Pt[][]) {
    line(g, corner);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(l - 2, t - 9);
  g.lineTo(l + 6, t - 9);
  g.lineTo(l - 2, t - 1);
  g.closePath();
  g.fill();
  g.strokeRect(752, 97, 136, 116);
  g.setLineDash([3, 4]);
  g.strokeRect(938, 128, 100, 54);
  g.restore();

  // The shunt: a 2512 current-sense resistor, ink body, paper ends.
  pad(g, 146, 176, 54, 48);
  pad(g, 240, 176, 54, 48);
  body(g, 160, 186, 120, 28, 3);
  g.fillStyle = INK;
  g.fillRect(186, 186, 68, 28);
  g.strokeStyle = ink(0.7);
  g.lineWidth = 1;
  rr(g, 160, 186, 120, 28, 3);
  g.stroke();

  // The current-sense amplifier, a SOT-23-5 on its side.
  for (const y of [118, 128, 138]) {
    pad(g, 316, y - 3.5, 10, 7);
    lead(g, 330, y, 320, y, 3.2);
  }
  for (const y of [118, 138]) {
    pad(g, 352, y - 3.5, 10, 7);
    lead(g, 348, y, 358, y, 3.2);
  }
  pkg(g, 330, 110, 18, 36, 2);

  // The microcontroller, an LQFP-48 with its decoupling and crystal.
  for (let i = 0; i < LEADS; i++) {
    const y = leadY(i);
    const x = leadX(i);
    pad(g, MCU.x - LEAD_LEN - 2, y - 2.6, 9, 5.2);
    pad(g, MCU.x + MCU.w + LEAD_LEN - 7, y - 2.6, 9, 5.2);
    pad(g, x - 2.6, MCU.y - LEAD_LEN - 2, 5.2, 9);
    pad(g, x - 2.6, MCU.y + MCU.h + LEAD_LEN - 7, 5.2, 9);
    lead(g, MCU.x, y, MCU.x - LEAD_LEN, y, 3.6);
    lead(g, MCU.x + MCU.w, y, MCU.x + MCU.w + LEAD_LEN, y, 3.6);
    lead(g, x, MCU.y, x, MCU.y - LEAD_LEN, 3.6);
    lead(g, x, MCU.y + MCU.h, x, MCU.y + MCU.h + LEAD_LEN, 3.6);
  }
  pkg(g, MCU.x, MCU.y, MCU.w, MCU.h, 4);
  g.fillStyle = '#1d221f';
  g.beginPath();
  g.arc(MCU.x + 18, MCU.y + 18, 5.5, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(MCU.x + MCU.w - 22, MCU.y + MCU.h - 22, 9, 0, TAU);
  g.stroke();
  capacitor(g, 485, 100.5);
  capacitor(g, 692, 100.5);
  capacitor(g, 692, 199.5);
  pad(g, 546, 246, 16, 20);
  pad(g, 608, 246, 16, 20);
  body(g, 552, 242, 66, 28, 6);
  g.strokeStyle = ink(0.25);
  g.lineWidth = 1;
  rr(g, 557, 247, 56, 18, 4);
  g.stroke();

  // The radio: a shield can, a via-fenced feed, a ceramic chip antenna.
  for (let x = 768; x <= 872; x += 13) {
    pad(g, x - 2.5, 100, 5, 6);
    pad(g, x - 2.5, 204, 5, 6);
  }
  body(g, 760, 105, 120, 100, 8);
  g.strokeStyle = ink(0.25);
  g.lineWidth = 1;
  rr(g, 770.5, 115.5, 99, 79, 5);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.beginPath();
      g.arc(838 + i * 9, 132 + j * 9, 1.6, 0, TAU);
      g.fillStyle = ink(0.5);
      g.fill();
    }
  }
  pad(g, 946, 147, 12, 16);
  pad(g, 1018, 147, 12, 16);
  body(g, 950, 143, 76, 24, 2);
  g.strokeStyle = ink(0.45);
  g.lineWidth = 1;
  line(g, [[959, 143], [959, 167]]);
  g.stroke();
  line(g, [[1017, 143], [1017, 167]]);
  g.stroke();

  // A faint dotted path for each hop through the air, kept off the card.
  g.save();
  g.beginPath();
  g.rect(-60, -60, W + 120, H + 120);
  g.roundRect(CARD.x, CARD.y, CARD.w, CARD.h, 10);
  g.clip('evenodd');
  g.strokeStyle = ink(0.24);
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  g.setLineDash([1, 7]);
  line(g, AIR);
  g.stroke();
  line(g, LINK);
  g.stroke();
  g.restore();

  // The dashboard: a card with a window bar, two title bars and a chart grid.
  body(g, CARD.x, CARD.y, CARD.w, CARD.h, 10);
  g.strokeStyle = ink(0.2);
  g.lineWidth = 1;
  line(g, [[CARD.x, 116], [CARD.x + CARD.w, 116]]);
  g.stroke();
  for (const x of [1434, 1444, 1454]) {
    g.beginPath();
    g.arc(x, 106, 2.6, 0, TAU);
    g.fillStyle = ink(0.4);
    g.fill();
  }
  g.fillStyle = ink(0.2);
  rr(g, 1436, 128, 60, 5, 2.5);
  g.fill();
  g.fillStyle = ink(0.1);
  rr(g, 1436, 138, 32, 4, 2);
  g.fill();
  g.strokeStyle = ink(0.08);
  for (const y of [178, 200, 222]) {
    line(g, [[1440, y], [1620, y]]);
    g.stroke();
  }
  g.strokeStyle = ink(0.22);
  line(g, [[1440, 244], [1620, 244]]);
  g.stroke();
  return b;
}

// ---- Light: paper-white and soft, a tight glow, never a flare -------------------

function glow(g: G, a: number, blur: number, paint: (g: G) => void) {
  if (a <= 0.001) return;
  g.save();
  g.globalAlpha = a;
  g.shadowColor = LIGHT;
  g.shadowBlur = blur * S;
  g.fillStyle = LIGHT;
  g.strokeStyle = LIGHT;
  paint(g);
  g.restore();
}

// Light around a part, never over it: the halo is a shadow cast from far
// off-canvas, clipped to everything outside the shape, then a paper rim.
function halo(g: G, a: number, blur: number, shape: (g: G) => void) {
  if (a <= 0.001) return;
  g.save();
  g.beginPath();
  g.rect(-60, -60, W + 120, H + 120);
  shape(g);
  g.clip('evenodd');
  g.globalAlpha = a * 0.7;
  g.shadowColor = LIGHT;
  g.shadowBlur = blur * S;
  g.shadowOffsetX = 5000 * S;
  g.fillStyle = LIGHT;
  g.translate(-5000, 0);
  g.beginPath();
  shape(g);
  g.fill();
  g.restore();
  g.save();
  g.globalAlpha = a * 0.6;
  g.strokeStyle = LIGHT;
  g.lineWidth = 1;
  g.beginPath();
  shape(g);
  g.stroke();
  g.restore();
}

function frame(ctx: G, board: HTMLCanvasElement, scale: number, p: number) {
  const s = p * TOTAL;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(board, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // Each part answers while the signal is inside it.
  halo(ctx, within(s, byPart('shunt'), 30), 12, (g) => g.roundRect(160, 186, 120, 28, 3));
  halo(ctx, within(s, byPart('amp'), 20), 10, (g) => g.roundRect(330, 110, 18, 36, 2));
  const mcu = within(s, byPart('mcu'), 26);
  if (mcu > 0) {
    // A band of light crosses the package from the input pin to the output
    // pin, lighting the leads it passes.
    halo(ctx, mcu * 0.8, 16, (g) => g.roundRect(MCU.x, MCU.y, MCU.w, MCU.h, 4));
    const k = clamp((s - byPart('mcu').start) / byPart('mcu').len, 0, 1);
    const span = MCU.w + LEAD_LEN * 2;
    const sweep = (x: number) => {
      const q = ((x - (MCU.x - LEAD_LEN)) / span - k) / 0.16;
      return mcu * Math.exp(-q * q);
    };
    for (let i = 0; i < LEADS; i++) {
      const y = leadY(i);
      const x = leadX(i);
      const left = sweep(MCU.x - LEAD_LEN / 2) * (i === 5 ? 1 : 0.5);
      const right = sweep(MCU.x + MCU.w + LEAD_LEN / 2) * (i === 6 ? 1 : 0.5);
      glow(ctx, left * 0.9, 4, (g) => g.fillRect(MCU.x - LEAD_LEN, y - 1.8, LEAD_LEN, 3.6));
      glow(ctx, right * 0.9, 4, (g) => g.fillRect(MCU.x + MCU.w, y - 1.8, LEAD_LEN, 3.6));
      glow(ctx, sweep(x) * 0.7, 4, (g) => {
        g.fillRect(x - 1.8, MCU.y - LEAD_LEN, 3.6, LEAD_LEN);
        g.fillRect(x - 1.8, MCU.y + MCU.h, 3.6, LEAD_LEN);
      });
    }
  }
  halo(ctx, within(s, byPart('rf'), 26), 12, (g) => g.roundRect(760, 105, 120, 100, 8));
  halo(ctx, within(s, byPart('ant'), 24), 12, (g) => g.roundRect(950, 143, 76, 24, 2));

  // Radio: rings leave the antenna as the signal crosses the gap.
  const flown = s - AIR_SEG.start;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    const r = 6 + flown * 0.95 - k * 20;
    if (flown <= 0 || r <= 6 || r >= 150) continue;
    ctx.strokeStyle = light(+(0.75 * Math.pow(1 - r / 150, 1.3)).toFixed(3));
    ctx.beginPath();
    ctx.arc(1026, 155, r, -0.95, 0.75);
    ctx.stroke();
  }
  ctx.restore();

  // The cloud: ink dots that light from where the signal enters.
  const front = Math.max(0, (s - byPart('cloud').start) * 1.2);
  const lit = CLOUD.nodes.map((n) => smooth((front - n.d) / 34));
  ctx.save();
  ctx.lineWidth = 0.9;
  for (const [a, b] of CLOUD.links) {
    const l = Math.min(lit[a], lit[b]);
    const A = CLOUD.nodes[a];
    const B = CLOUD.nodes[b];
    ctx.strokeStyle = l > 0.01 ? light(+(0.15 + 0.45 * l).toFixed(3)) : ink(0.16);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  }
  CLOUD.nodes.forEach((n, i) => {
    const r = 1.7 + n.z * 2.4;
    if (lit[i] < 0.99) {
      ctx.fillStyle = ink(+((0.55 + 0.45 * n.z) * (1 - lit[i])).toFixed(3));
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, TAU);
      ctx.fill();
    }
    if (lit[i] > 0.01) {
      glow(ctx, lit[i], 4 + n.z * 4, (g) => {
        g.beginPath();
        g.arc(n.x, n.y, r, 0, TAU);
        g.fill();
      });
    }
  });
  ctx.restore();

  // The dashboard: the signal drops onto the latest point and draws the next
  // one; the old end point gives way to it.
  const grown = clamp((s - CHART_SEG.start) / CHART_SEG.len, 0, 1);
  halo(ctx, 0.55 * smooth((s - LINK_SEG.start - LINK_SEG.len * 0.6) / 60), 14, (g) => g.roundRect(CARD.x, CARD.y, CARD.w, CARD.h, 10));
  const pts: Pt[] = HIST.map((v, i) => [chartX(i), chartY(v)]);
  if (grown > 0) {
    const from = HIST[HIST.length - 1];
    pts.push([LAST[0] + 20 * grown, chartY(from + (NEXT - from) * grown)]);
  }
  ctx.save();
  line(ctx, pts);
  ctx.lineTo(pts[pts.length - 1][0], 244);
  ctx.lineTo(pts[0][0], 244);
  ctx.closePath();
  ctx.fillStyle = ink(0.06);
  ctx.fill();
  line(ctx, pts);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fillStyle = ink(+(1 - grown).toFixed(3));
  ctx.beginPath();
  ctx.arc(LAST[0], LAST[1], 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();

  // The signal: a paper-white dot with a soft halo and a fading tail. On the
  // card it turns to ink and comes to rest as the chart's newest point.
  const v = visible(s);
  if (v <= 0.005) return;
  // The tail draws in over the last stretch, so the dot settles on its own.
  const settle = smooth((TOTAL - s) / 24);
  for (let k = 12; k >= 1; k--) {
    const q = s - k * 6.5;
    const tv = visible(q) * (1 - k / 13) * settle;
    if (q <= 0 || tv <= 0.01) continue;
    const [x, y] = point(q);
    ctx.fillStyle = inked(q) < 0.5 ? light(+(0.6 * tv).toFixed(3)) : ink(+(0.45 * tv).toFixed(3));
    ctx.beginPath();
    ctx.arc(x, y, 3.4 - k * 0.2, 0, TAU);
    ctx.fill();
  }
  const [x, y] = point(s);
  const c = inked(s);
  glow(ctx, v * (1 - c), 12, (g) => {
    g.beginPath();
    g.arc(x, y, 4.2, 0, TAU);
    g.fill();
  });
  if (c > 0) {
    ctx.save();
    ctx.globalAlpha = v * c;
    ctx.shadowColor = GREEN;
    ctx.shadowBlur = 10 * S;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

// Draws the board into `canvas` and keeps it sized to the canvas's CSS box at
// the screen's density (two at most). draw(p) shows the signal at progress p,
// 0 at rest on the left to 1 landed on the chart.
export function signalChain(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let board: HTMLCanvasElement | null = null;
  let scale = 1;
  let progress = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(w * dpr);
    if (board && width === canvas.width) return;
    canvas.width = width;
    canvas.height = Math.round(((w * H) / W) * dpr);
    scale = canvas.width / W;
    S = scale;
    board = renderBoard(scale);
    frame(ctx, board, scale, progress);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    canvas,
    draw(p: number) {
      progress = clamp(p, 0, 1);
      if (board) frame(ctx, board, scale, progress);
    },
    // Where the signal is across the board at progress p, 0 (left) to 1 (right).
    at(p: number) {
      return point(clamp(p, 0, 1) * TOTAL)[0] / W;
    },
    stop() {
      observer.disconnect();
    },
  };
}

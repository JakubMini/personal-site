// The hero's signal chain, from a motor to the app in your pocket. A hub
// motor's phase current enters a board through its connector and crosses a
// shunt; the voltage across it climbs the Kelvin sense lines into an
// amplifier and the microcontroller, where the firmware turns the analogue
// dot into a train of pulses for the radio. Off the antenna it flies as a
// packet to the cloud, hops broker, function and database, and drops into a
// phone, where it lands as the chart's newest point. The dashboard window
// behind the phone gets the same point.
//
// Drawn in a 2D canvas in the site's flat language: copper is an ink tint on
// the green, metal and ceramic are paper with an ink outline, moulded packages
// are ink. The carrier is ink with a paper rim, so it reads on green, on paper
// and across the phone's bezel; ink parts light green, paper parts get an ink
// ring. The board is rendered once per size; each frame adds the signal,
// whatever it is lighting, and the part under the pointer, which has a small
// loop of its own. The chain plays by itself and loops: each run brings one
// new sample and the charts scroll on. scripts/motion.ts runs the frames while
// the hero is on screen and hands over the pointer.
//
// Two drawings of the same parts: wide (1660 × 300) for the desktop band and
// tall (390 × 1200) for phones, the chain running down the page.

type Pt = [number, number];
type G = CanvasRenderingContext2D;
type Form = 'dot' | 'pulses' | 'packet';
type Glyph = 'broker' | 'fn' | 'db';
type PartName = 'shunt' | 'amp' | 'mcu' | 'rf' | 'ant';

interface Segment {
  pts: Pt[];
  form: Form;
  // The part the signal is inside. `hidden` ones answer in the carrier's place.
  part?: PartName;
  hidden?: boolean;
  // Time per unit of length: under 1 dwells, over 1 hurries.
  speed?: number;
  ease?: boolean;
  air?: boolean;
  link?: boolean;
  chart?: boolean;
  // The cloud glyph at this segment's start, lit once the packet reaches it.
  glyph?: Glyph;
  // On the link into the phone: past this edge the packet is a dot again.
  dotFromX?: number;
  dotFromY?: number;
  // Filled in by build().
  lens: number[];
  len: number;
  start: number;
  dur: number;
  t0: number;
}
type SegmentSpec = Omit<Segment, 'lens' | 'len' | 'start' | 'dur' | 't0'>;

interface Chart {
  x0: number;
  step: number;
  base: number;
  amp: number;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Cloud {
  blobs: [number, number, number][];
  base: [number, number, number, number];
  broker: Pt;
  fn: Pt;
  db: Pt;
}

const TAU = Math.PI * 2;
const INK = '#0b0f0c';
const PAPER = '#f3f2ec';
// The green is the page's (global.css, --green): the electric green on the
// light page and a deeper one on the dark, read when the chain is made and
// again when the theme changes.
let GREEN = '#2ff27c';
let greenRgb = '47, 242, 124';
const ink = (a: number) => `rgba(11, 15, 12, ${+a.toFixed(3)})`;
const green = (a: number) => `rgba(${greenRgb}, ${+a.toFixed(3)})`;
const paper = (a: number) => `rgba(243, 242, 236, ${+a.toFixed(3)})`;
function readGreen() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return;
  GREEN = v;
  greenRgb = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(', ');
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
};
// A fixed pseudo-random in [0, 1) for an index, so blinking pins and the
// chart's walk are the same on every visit.
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const quad = (a: Pt, c: Pt, b: Pt, n = 25): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Device pixels per layout unit: shadow sizes ignore the transform.
let S = 1;

// ---- Primitives ---------------------------------------------------------------

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
function dotted(g: G, pts: Pt[], a: number, dash: number[] = [1, 6]) {
  g.save();
  g.setLineDash(dash);
  g.lineCap = 'round';
  g.strokeStyle = ink(a);
  g.lineWidth = 1.4;
  line(g, pts);
  g.stroke();
  g.restore();
}
// The carrier: ink with a paper rim.
function dot(g: G, x: number, y: number, r: number) {
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(x, y, r + 1.7, 0, TAU);
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
function polyline(pts: Pt[]) {
  const lens: number[] = [];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    len += l;
  }
  return {
    len,
    at(d: number): Pt {
      d = clamp(d, 0, len);
      for (let i = 0; i < lens.length; i++) {
        if (d <= lens[i] || i === lens.length - 1) {
          const k = lens[i] ? d / lens[i] : 0;
          return lerpPt(pts[i], pts[i + 1], k);
        }
        d -= lens[i];
      }
      return pts[pts.length - 1];
    },
  };
}

// ---- Parts ----------------------------------------------------------------------

function magnets(g: G, r: number) {
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * TAU + 0.025;
    const a1 = ((i + 1) / 14) * TAU - 0.025;
    g.beginPath();
    g.arc(0, 0, r - 4, a0, a1);
    g.arc(0, 0, r - 11, a1, a0, true);
    g.closePath();
    g.fillStyle = ink(i % 2 ? 0.5 : 0.2);
    g.fill();
  }
}
// An outrunner seen end-on: a magnet ring round twelve wound teeth.
function motor(g: G, cx: number, cy: number, r: number) {
  g.save();
  g.translate(cx, cy);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = ink(0.14);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  g.stroke();
  magnets(g, r);
  for (let i = 0; i < 12; i++) {
    g.save();
    g.rotate((i / 12) * TAU);
    g.fillStyle = ink(0.55);
    g.fillRect(r * 0.28, -2, r * 0.48, 4);
    rr(g, r * 0.4, -6.5, r * 0.26, 13, 3);
    g.fillStyle = PAPER;
    g.fill();
    g.strokeStyle = ink(0.7);
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = ink(0.35);
    g.lineWidth = 0.8;
    for (let k = 1; k < 4; k++) {
      const x = r * 0.4 + (k * r * 0.26) / 4;
      g.beginPath();
      g.moveTo(x, -6.5);
      g.lineTo(x, 6.5);
      g.stroke();
    }
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, r * 0.3, 0, TAU);
  g.fillStyle = ink(0.55);
  g.fill();
  g.beginPath();
  g.arc(0, 0, r * 0.17, 0, TAU);
  g.fillStyle = PAPER;
  g.fill();
  g.strokeStyle = ink(0.7);
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * 0.06, 0, TAU);
  g.fillStyle = ink(0.8);
  g.fill();
  g.restore();
}
function wires(g: G, runs: Pt[][]) {
  g.save();
  g.strokeStyle = ink(0.6);
  g.lineWidth = 2.6;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  runs.forEach((pts) => {
    line(g, pts);
    g.stroke();
  });
  g.restore();
}
// The board as an object: an edge, and a plated hole in each corner.
function board(g: G, x: number, y: number, w: number, h: number) {
  rr(g, x, y, w, h, 8);
  g.fillStyle = ink(0.07);
  g.fill();
  g.strokeStyle = ink(0.55);
  g.lineWidth = 1.5;
  g.stroke();
  for (const [hx, hy] of [
    [x + 24, y + 24],
    [x + w - 24, y + 24],
    [x + 24, y + h - 24],
    [x + w - 24, y + h - 24],
  ]) {
    g.beginPath();
    g.arc(hx, hy, 9.5, 0, TAU);
    g.fillStyle = ink(0.12);
    g.fill();
    g.beginPath();
    g.arc(hx, hy, 6.2, 0, TAU);
    g.fillStyle = GREEN;
    g.fill();
    g.strokeStyle = ink(0.6);
    g.lineWidth = 1.2;
    g.stroke();
  }
}
// The phase connector: a header with a hole per phase.
function header(g: G, x: number, y: number, w: number, h: number, pins: Pt[]) {
  body(g, x, y, w, h, 2);
  pins.forEach(([px, py]) => {
    g.beginPath();
    g.arc(px, py, 3.6, 0, TAU);
    g.fillStyle = ink(0.85);
    g.fill();
    g.beginPath();
    g.arc(px, py, 1.4, 0, TAU);
    g.fillStyle = ink(0.35);
    g.fill();
  });
}
// The shunt: a 2512 current-sense resistor, ink body, paper ends.
function shunt(g: G, x: number, y: number, vertical: boolean) {
  g.save();
  if (vertical) {
    g.translate(x + 28, y);
    g.rotate(Math.PI / 2);
  } else g.translate(x, y);
  pad(g, -14, -10, 54, 48);
  pad(g, 80, -10, 54, 48);
  body(g, 0, 0, 120, 28, 3);
  g.fillStyle = INK;
  g.fillRect(26, 0, 68, 28);
  g.strokeStyle = ink(0.7);
  g.lineWidth = 1;
  rr(g, 0, 0, 120, 28, 3);
  g.stroke();
  g.restore();
}
// A power FET in a D-PAK: a paper tab, an ink body, three legs.
function fet(g: G, x: number, y: number) {
  pad(g, x + 4, y, 24, 8);
  for (const dx of [6, 16, 26]) {
    pad(g, x + dx - 2.5, y + 33, 5, 6);
    lead(g, x + dx, y + 28, x + dx, y + 36, 3);
  }
  pkg(g, x, y + 6, 32, 22, 2);
}
// The current-sense amplifier, a SOT-23-5 on its side.
function amp(g: G, x: number, y: number) {
  for (const dy of [8, 18, 28]) {
    pad(g, x - 14, y + dy - 3.5, 10, 7);
    lead(g, x, y + dy, x - 10, y + dy, 3.2);
  }
  for (const dy of [8, 28]) {
    pad(g, x + 22, y + dy - 3.5, 10, 7);
    lead(g, x + 18, y + dy, x + 28, y + dy, 3.2);
  }
  pkg(g, x, y, 18, 36, 2);
}
// The microcontroller, an LQFP-48.
const PITCH = 9;
const FIRST = 15.5;
const LEADS = 12;
const LEAD_LEN = 12;
const leadAt = (o: number, i: number) => o + FIRST + i * PITCH;
function mcu(g: G, M: Box) {
  for (let i = 0; i < LEADS; i++) {
    const y = leadAt(M.y, i);
    const x = leadAt(M.x, i);
    pad(g, M.x - LEAD_LEN - 2, y - 2.6, 9, 5.2);
    pad(g, M.x + M.w + LEAD_LEN - 7, y - 2.6, 9, 5.2);
    pad(g, x - 2.6, M.y - LEAD_LEN - 2, 5.2, 9);
    pad(g, x - 2.6, M.y + M.h + LEAD_LEN - 7, 5.2, 9);
    lead(g, M.x, y, M.x - LEAD_LEN, y, 3.6);
    lead(g, M.x + M.w, y, M.x + M.w + LEAD_LEN, y, 3.6);
    lead(g, x, M.y, x, M.y - LEAD_LEN, 3.6);
    lead(g, x, M.y + M.h, x, M.y + M.h + LEAD_LEN, 3.6);
  }
  pkg(g, M.x, M.y, M.w, M.h, 4);
  g.fillStyle = '#1d221f';
  g.beginPath();
  g.arc(M.x + 18, M.y + 18, 5.5, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(M.x + M.w - 22, M.y + M.h - 22, 9, 0, TAU);
  g.stroke();
  // Silkscreen: corner marks and the pin-1 arrow.
  g.save();
  g.strokeStyle = ink(0.26);
  g.fillStyle = ink(0.26);
  g.lineWidth = 1;
  g.lineCap = 'round';
  const c = 8;
  const l = M.x - 16;
  const t = M.y - 16;
  const r = M.x + M.w + 16;
  const b = M.y + M.h + 16;
  for (const corner of [
    [[l, t + 2 * c], [l, t], [l + 2 * c, t]],
    [[r - 2 * c, t], [r, t], [r, t + 2 * c]],
    [[l, b - 2 * c], [l, b], [l + 2 * c, b]],
    [[r - 2 * c, b], [r, b], [r, b - 2 * c]],
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
  g.restore();
}
function crystal(g: G, x: number, y: number, vertical: boolean) {
  g.save();
  if (vertical) {
    g.translate(x + 28, y);
    g.rotate(Math.PI / 2);
  } else g.translate(x, y);
  pad(g, -6, 4, 16, 20);
  pad(g, 56, 4, 16, 20);
  body(g, 0, 0, 66, 28, 6);
  g.strokeStyle = ink(0.25);
  g.lineWidth = 1;
  rr(g, 5, 5, 56, 18, 4);
  g.stroke();
  g.restore();
}
// The radio: a shield can on a fence of pads.
function rfCan(g: G, x: number, y: number, vertical: boolean) {
  g.save();
  g.strokeStyle = ink(0.26);
  g.lineWidth = 1;
  g.strokeRect(x - 8, y - 8, 136, 116);
  g.restore();
  if (vertical) {
    for (let py = y + 8; py <= y + 92; py += 12) {
      pad(g, x - 5, py - 2.5, 6, 5);
      pad(g, x + 119, py - 2.5, 6, 5);
    }
  } else {
    for (let px = x + 8; px <= x + 112; px += 13) {
      pad(g, px - 2.5, y - 5, 5, 6);
      pad(g, px - 2.5, y + 99, 5, 6);
    }
  }
  body(g, x, y, 120, 100, 8);
  g.strokeStyle = ink(0.25);
  g.lineWidth = 1;
  rr(g, x + 10.5, y + 10.5, 99, 79, 5);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.beginPath();
      g.arc(x + 78 + i * 9, y + 27 + j * 9, 1.6, 0, TAU);
      g.fillStyle = ink(0.5);
      g.fill();
    }
  }
}
// A ceramic chip antenna in its keep-out.
function antenna(g: G, x: number, y: number, vertical: boolean) {
  g.save();
  if (vertical) {
    g.translate(x + 24, y);
    g.rotate(Math.PI / 2);
  } else g.translate(x, y);
  g.save();
  g.setLineDash([3, 4]);
  g.strokeStyle = ink(0.26);
  g.lineWidth = 1;
  g.strokeRect(-12, -15, 98, 54);
  g.restore();
  pad(g, -4, 4, 12, 16);
  pad(g, 68, 4, 12, 16);
  body(g, 0, 0, 76, 24, 2);
  g.strokeStyle = ink(0.45);
  g.lineWidth = 1;
  line(g, [[9, 0], [9, 24]]);
  g.stroke();
  line(g, [[67, 0], [67, 24]]);
  g.stroke();
  g.restore();
}
// The cloud: a paper object with an ink outline. Stroking every shape, then
// filling them all, leaves one outline round the union.
function cloudShape(g: G, C: Cloud) {
  const shapes = (paint: () => void) => {
    C.blobs.forEach(([x, y, r]) => {
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      paint();
    });
    const [x, y, w, h] = C.base;
    rr(g, x, y, w, h, 10);
    paint();
  };
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.lineJoin = 'round';
  shapes(() => g.stroke());
  g.restore();
  g.save();
  lift(g);
  g.fillStyle = PAPER;
  shapes(() => g.fill());
  g.restore();
  g.fillStyle = PAPER;
  shapes(() => g.fill());
  dotted(g, [C.broker, C.fn], 0.5, [1.2, 4]);
  dotted(g, [C.fn, C.db], 0.5, [1.2, 4]);
}
// Its glyphs, broker, function and database, each taking the green as it lights.
function cloudGlyphs(g: G, C: Cloud, lit: Record<Glyph, number>) {
  const [bx, by] = C.broker;
  g.save();
  g.strokeStyle = ink(0.6);
  g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.35;
    g.beginPath();
    g.moveTo(bx + 7 * Math.cos(a), by + 7 * Math.sin(a));
    g.lineTo(bx + 15 * Math.cos(a), by + 15 * Math.sin(a));
    g.stroke();
    g.beginPath();
    g.arc(bx + 16 * Math.cos(a), by + 16 * Math.sin(a), 2.2, 0, TAU);
    g.fillStyle = ink(0.75);
    g.fill();
  }
  g.beginPath();
  g.arc(bx, by, 7, 0, TAU);
  g.fillStyle = INK;
  g.fill();
  g.fillStyle = green(lit.broker);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();

  const [fx, fy] = C.fn;
  g.save();
  rr(g, fx - 14, fy - 14, 28, 28, 6);
  g.fillStyle = PAPER;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.stroke();
  g.beginPath();
  g.moveTo(fx + 2, fy - 10);
  g.lineTo(fx - 6, fy + 1);
  g.lineTo(fx - 1, fy + 1);
  g.lineTo(fx - 2, fy + 10);
  g.lineTo(fx + 6, fy - 1);
  g.lineTo(fx + 1, fy - 1);
  g.closePath();
  g.fillStyle = INK;
  g.fill();
  g.fillStyle = green(lit.fn);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();

  const [dx, dy] = C.db;
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(dx - 13, dy - 10);
  g.lineTo(dx - 13, dy + 11);
  g.ellipse(dx, dy + 11, 13, 4.5, 0, Math.PI, 0, true);
  g.lineTo(dx + 13, dy - 10);
  g.closePath();
  g.fillStyle = PAPER;
  g.fill();
  g.stroke();
  for (const yy of [dy - 3, dy + 4]) {
    g.beginPath();
    g.ellipse(dx, yy, 13, 4.5, 0, 0, Math.PI);
    g.strokeStyle = ink(0.45);
    g.lineWidth = 1;
    g.stroke();
  }
  g.beginPath();
  g.ellipse(dx, dy - 10, 13, 4.5, 0, 0, TAU);
  g.fillStyle = INK;
  g.fill();
  g.fillStyle = green(lit.db);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
}
// The dashboard: a window with a bar, two title lines and room for a chart.
function windowCard(g: G, W: Box) {
  body(g, W.x, W.y, W.w, W.h, 8);
  g.strokeStyle = ink(0.2);
  g.lineWidth = 1;
  line(g, [[W.x, W.y + 20], [W.x + W.w, W.y + 20]]);
  g.stroke();
  for (const dx of [14, 24, 34]) {
    g.beginPath();
    g.arc(W.x + dx, W.y + 10, 2.6, 0, TAU);
    g.fillStyle = ink(0.4);
    g.fill();
  }
  g.fillStyle = ink(0.2);
  rr(g, W.x + 14, W.y + 30, 60, 5, 2.5);
  g.fill();
  g.fillStyle = ink(0.1);
  rr(g, W.x + 14, W.y + 40, 32, 4, 2);
  g.fill();
}
// The phone: an ink body, a paper screen, a title, a tile, room for the chart
// and two rows under it.
function phone(g: G, P: Box) {
  g.save();
  lift(g);
  g.fillStyle = INK;
  rr(g, P.x, P.y, P.w, P.h, 14);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  g.lineWidth = 1;
  rr(g, P.x + 2, P.y + 2, P.w - 4, P.h - 4, 12);
  g.stroke();
  g.fillStyle = PAPER;
  rr(g, P.x + 6, P.y + 8, P.w - 12, P.h - 16, 9);
  g.fill();
  g.beginPath();
  g.arc(P.x + P.w / 2, P.y + 15, 2.2, 0, TAU);
  g.fillStyle = INK;
  g.fill();
  g.fillStyle = ink(0.2);
  rr(g, P.x + 16, P.y + 26, 34, 5, 2.5);
  g.fill();
  g.fillStyle = ink(0.06);
  rr(g, P.x + 16, P.y + 38, P.w - 32, 28, 4);
  g.fill();
  g.fillStyle = ink(0.3);
  rr(g, P.x + 22, P.y + 44, 18, 4, 2);
  g.fill();
  g.fillStyle = ink(0.15);
  rr(g, P.x + 22, P.y + 54, 30, 3, 1.5);
  g.fill();
  g.fillStyle = ink(0.08);
  rr(g, P.x + 16, P.y + P.h - 38, P.w - 32, 4, 2);
  g.fill();
  rr(g, P.x + 16, P.y + P.h - 28, P.w - 32, 4, 2);
  g.fill();
}
// A chart on paper: the grid, the history, and the new point growing in as
// the old end point gives way to it.
function chart(g: G, c: Chart, hist: number[], next: number, grown: number, x1: number) {
  const cx = (i: number) => c.x0 + i * c.step;
  const cy = (v: number) => c.base - v * c.amp;
  g.save();
  g.strokeStyle = ink(0.08);
  g.lineWidth = 1;
  for (const k of [0.33, 0.66]) {
    line(g, [[c.x0, c.base - k * c.amp], [x1, c.base - k * c.amp]]);
    g.stroke();
  }
  g.strokeStyle = ink(0.22);
  line(g, [[c.x0, c.base], [x1, c.base]]);
  g.stroke();
  const pts: Pt[] = hist.map((v, i) => [cx(i), cy(v)]);
  const last = hist[hist.length - 1];
  if (grown > 0) pts.push([cx(hist.length - 1) + c.step * grown, cy(last + (next - last) * grown)]);
  line(g, pts);
  g.lineTo(pts[pts.length - 1][0], c.base);
  g.lineTo(pts[0][0], c.base);
  g.closePath();
  g.fillStyle = ink(0.06);
  g.fill();
  line(g, pts);
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke();
  g.fillStyle = ink(1 - grown);
  g.beginPath();
  g.arc(cx(hist.length - 1), cy(last), 2.6, 0, TAU);
  g.fill();
  g.restore();
}

// ---- The route: arc length, the time warp, what the carrier can be seen in ----

interface Route {
  segs: Segment[];
  segAt(s: number): Segment;
  point(s: number): Pt;
  // Progress 0..1 of a run to a place along the route, each segment taking
  // its share of the time by length and speed.
  sFromP(p: number): number;
  // 1 inside a segment, easing to 0 over `edge` either side of it.
  within(s: number, seg: Segment, edge: number): number;
  visible(s: number): number;
  by(part: PartName): Segment;
  glyph(name: Glyph): Segment;
}

function build(specs: SegmentSpec[]): Route {
  const segs = specs.map((spec) => ({ ...spec, lens: [], len: 0, start: 0, dur: 0, t0: 0 }) as Segment);
  let total = 0;
  let D = 0;
  for (const s of segs) {
    for (let i = 1; i < s.pts.length; i++) {
      const l = Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
      s.lens.push(l);
      s.len += l;
    }
    s.start = total;
    total += s.len;
    s.dur = s.len / (s.speed ?? 1);
    s.t0 = D;
    D += s.dur;
  }
  const segAt = (s: number) => segs.find((r) => s <= r.start + r.len) ?? segs[segs.length - 1];
  const point = (s: number): Pt => {
    s = clamp(s, 0, total);
    const seg = segAt(s);
    let d = s - seg.start;
    for (let i = 0; i < seg.lens.length; i++) {
      if (d <= seg.lens[i] || i === seg.lens.length - 1) {
        const k = seg.lens[i] ? clamp(d / seg.lens[i], 0, 1) : 0;
        return lerpPt(seg.pts[i], seg.pts[i + 1], k);
      }
      d -= seg.lens[i];
    }
    return seg.pts[seg.pts.length - 1];
  };
  const sFromP = (p: number) => {
    const t = clamp(p, 0, 1) * D;
    const seg = segs.find((r) => t <= r.t0 + r.dur) ?? segs[segs.length - 1];
    let u = seg.dur ? clamp((t - seg.t0) / seg.dur, 0, 1) : 1;
    if (seg.ease) u = smooth(u);
    return seg.start + u * seg.len;
  };
  const within = (s: number, seg: Segment, edge: number) => smooth(Math.min(s - seg.start + edge, seg.start + seg.len + edge - s) / edge);
  const hidden = segs.filter((r) => r.hidden);
  const visible = (s: number) => (s < 0 ? 0 : hidden.reduce((v, h) => v * (1 - within(s, h, 6)), 1));
  const by = (part: PartName) => segs.find((r) => r.part === part)!;
  const glyph = (name: Glyph) => segs.find((r) => r.glyph === name)!;
  return { segs, segAt, point, sFromP, within, visible, by, glyph };
}

// ---- Lights for the run -------------------------------------------------------

// A band of green crosses the package from the input pin to the output pin,
// lighting the leads it passes, those two fully.
function mcuLights(g: G, M: Box, axis: 'x' | 'y', k: number, m: number, inPin: number, outPin: number) {
  const span = (axis === 'x' ? M.w : M.h) + 2 * LEAD_LEN;
  const origin = (axis === 'x' ? M.x : M.y) - LEAD_LEN;
  const front = origin + k * span;
  g.save();
  rr(g, M.x, M.y, M.w, M.h, 4);
  g.clip();
  const grad = axis === 'x' ? g.createLinearGradient(front - 26, 0, front + 26, 0) : g.createLinearGradient(0, front - 26, 0, front + 26);
  grad.addColorStop(0, green(0));
  grad.addColorStop(0.5, green(0.6 * m));
  grad.addColorStop(1, green(0));
  g.fillStyle = grad;
  g.fillRect(M.x, M.y, M.w, M.h);
  g.restore();
  const sweep = (pos: number) => {
    const q = ((pos - origin) / span - k) / 0.16;
    return m * Math.exp(-(q * q));
  };
  for (let i = 0; i < LEADS; i++) {
    const y = leadAt(M.y, i);
    const x = leadAt(M.x, i);
    const l = axis === 'x' ? sweep(M.x - 6) * (i === inPin ? 1 : 0.5) : sweep(y) * 0.7;
    const r = axis === 'x' ? sweep(M.x + M.w + 6) * (i === outPin ? 1 : 0.5) : sweep(y) * 0.7;
    const t = axis === 'y' ? sweep(M.y - 6) * (i === inPin ? 1 : 0.5) : sweep(x) * 0.7;
    const b = axis === 'y' ? sweep(M.y + M.h + 6) * (i === outPin ? 1 : 0.5) : sweep(x) * 0.7;
    g.fillStyle = green(l);
    g.fillRect(M.x - LEAD_LEN, y - 1.8, LEAD_LEN, 3.6);
    g.fillStyle = green(r);
    g.fillRect(M.x + M.w, y - 1.8, LEAD_LEN, 3.6);
    g.fillStyle = green(t);
    g.fillRect(x - 1.8, M.y - LEAD_LEN, 3.6, LEAD_LEN);
    g.fillStyle = green(b);
    g.fillRect(x - 1.8, M.y + M.h, 3.6, LEAD_LEN);
  }
  g.fillStyle = green(m);
  g.beginPath();
  g.arc(M.x + 18, M.y + 18, 5.5, 0, TAU);
  g.fill();
}
function ringStroke(g: G, a: number, lw: number, shape: (g: G) => void) {
  if (a <= 0.004) return;
  g.save();
  g.strokeStyle = ink(a);
  g.lineWidth = lw;
  g.lineJoin = 'round';
  shape(g);
  g.stroke();
  g.restore();
}
// Rings leaving the antenna's end, the way it points.
function rings(g: G, at: Pt, dir: number, radii: number[]) {
  g.save();
  g.lineCap = 'round';
  g.lineWidth = 2;
  for (const r of radii) {
    if (r <= 8 || r >= 150) continue;
    g.strokeStyle = ink(0.85 * Math.pow(1 - (r - 8) / 142, 1.3));
    g.beginPath();
    g.arc(at[0], at[1], r, dir - 0.95, dir + 0.8);
    g.stroke();
  }
  g.restore();
}
function antennaRings(g: G, air: Segment, s: number, at: Pt, dir: number) {
  const flown = s - air.start;
  if (flown <= 0) return;
  rings(g, at, dir, [0, 1, 2].map((k) => 8 + flown * 0.95 - k * 22));
}

// ---- The carrier, in its forms ---------------------------------------------------

function carrier(g: G, R: Route, s: number) {
  const seg = R.segAt(s);
  const p = R.point(s);
  const v = R.visible(s);
  if (seg.chart) {
    // Settling as the chart's newest point: ink, with a green ring.
    const grown = clamp((s - seg.start) / seg.len, 0, 1);
    for (let k = 6; k >= 1; k--) {
      const q = s - k * 5;
      const tv = (1 - k / 7) * 0.5 * (1 - grown);
      if (q <= 0 || tv < 0.01) continue;
      const [x, y] = R.point(q);
      g.fillStyle = ink(tv);
      g.beginPath();
      g.arc(x, y, 3.6 - k * 0.3, 0, TAU);
      g.fill();
    }
    g.fillStyle = INK;
    g.beginPath();
    g.arc(p[0], p[1], 3.6 + 1.2 * (1 - grown), 0, TAU);
    g.fill();
    g.strokeStyle = green(smooth(grown));
    g.lineWidth = 2;
    g.beginPath();
    g.arc(p[0], p[1], 7.5, 0, TAU);
    g.stroke();
    return;
  }
  // Inside the phone the packet is a dot again, on its way to the chart.
  const inPhone = !!seg.link && ((seg.dotFromX != null && p[0] > seg.dotFromX) || (seg.dotFromY != null && p[1] > seg.dotFromY));
  if (seg.form === 'dot' || inPhone) {
    for (let k = 10; k >= 1; k--) {
      const q = s - k * 5.5;
      const tv = R.visible(q) * (1 - k / 11) * 0.6;
      if (q <= 0 || tv < 0.01) continue;
      const [x, y] = R.point(q);
      g.fillStyle = ink(tv);
      g.beginPath();
      g.arc(x, y, 4.4 - k * 0.28, 0, TAU);
      g.fill();
    }
    if (v > 0.01) {
      g.fillStyle = paper(v);
      g.beginPath();
      g.arc(p[0], p[1], 6.6, 0, TAU);
      g.fill();
      g.fillStyle = ink(v);
      g.beginPath();
      g.arc(p[0], p[1], 4.9, 0, TAU);
      g.fill();
    }
  } else if (seg.form === 'pulses') {
    // Four pulses, the way the firmware put them on the bus.
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      const s1 = s - k * 14;
      const s0 = s1 - 7;
      if (s0 <= 0) continue;
      const a = R.visible((s0 + s1) / 2) * (1 - k * 0.14);
      if (a < 0.01) continue;
      const pts = Array.from({ length: 5 }, (_, i) => R.point(s0 + ((s1 - s0) * i) / 4));
      line(g, pts);
      g.strokeStyle = paper(a);
      g.lineWidth = 7.6;
      g.stroke();
      g.strokeStyle = ink(a);
      g.lineWidth = 4.4;
      g.stroke();
    }
    g.restore();
  } else {
    // A packet, turned along its path, with a short trail.
    for (let k = 1; k <= 3; k++) {
      const q = s - 10 - k * 9;
      const a = R.visible(q) * (0.5 - k * 0.13);
      if (q <= 0 || a < 0.01) continue;
      const [x, y] = R.point(q);
      g.fillStyle = ink(a);
      g.beginPath();
      g.arc(x, y, 3.4 - k * 0.5, 0, TAU);
      g.fill();
    }
    if (v > 0.01) {
      const [ax, ay] = R.point(s - 2);
      const [bx, by] = R.point(s + 2);
      g.save();
      g.translate(p[0], p[1]);
      g.rotate(Math.atan2(by - ay, bx - ax));
      rr(g, -9.6, -7.1, 19.2, 14.2, 4.2);
      g.fillStyle = paper(v);
      g.fill();
      rr(g, -8, -5.5, 16, 11, 3);
      g.fillStyle = ink(v);
      g.fill();
      g.strokeStyle = paper(0.5 * v);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-5, -2.5);
      g.lineTo(0, 1.5);
      g.lineTo(5, -2.5);
      g.stroke();
      g.restore();
    }
  }
}

// ---- Hover: each part has a small loop of its own under the pointer ------------

interface Part {
  hit(x: number, y: number): boolean;
  // T is the chain's clock in seconds; alpha is already set to the hover level.
  draw(g: G, T: number): void;
}
const hitRect = (x: number, y: number, w: number, h: number) => (px: number, py: number) => px >= x && px <= x + w && py >= y && py <= y + h;
const hitCircle = (cx: number, cy: number, r: number) => (px: number, py: number) => Math.hypot(px - cx, py - cy) <= r;

// The rotor turns and the three phases run down the wires, a third apart.
function hoverMotor(cx: number, cy: number, r: number, wireRuns: Pt[][]): Part {
  const runs = wireRuns.map(polyline);
  return {
    hit: hitCircle(cx, cy, r + 8),
    draw(g, T) {
      g.save();
      g.translate(cx, cy);
      g.beginPath();
      g.arc(0, 0, r + 1.6, 0, TAU);
      g.arc(0, 0, r - 11.5, 0, TAU, true);
      g.fillStyle = GREEN;
      g.fill();
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.arc(0, 0, r - 11.5, 0, TAU, true);
      g.fillStyle = ink(0.14);
      g.fill();
      g.rotate(T * 3.2);
      magnets(g, r);
      g.rotate(-T * 3.2);
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.strokeStyle = INK;
      g.lineWidth = 2.2;
      g.stroke();
      g.restore();
      runs.forEach((pl, i) => {
        const [x, y] = pl.at(((T * 0.9 + i / 3) % 1) * pl.len);
        dot(g, x, y, 3);
      });
    },
  };
}
// The body beats and both sense lines carry the measurement to the amplifier.
function hoverShunt(rect: [number, number, number, number], senseRuns: Pt[][], hit: Part['hit']): Part {
  const runs = senseRuns.map(polyline);
  return {
    hit,
    draw(g, T) {
      const beat = 0.5 + 0.5 * Math.sin(T * TAU * 1.2);
      g.fillStyle = green(0.35 + 0.5 * beat);
      g.fillRect(rect[0], rect[1], rect[2], rect[3]);
      runs.forEach((pl) => {
        const [x, y] = pl.at(((T * 0.55) % 1) * pl.len);
        dot(g, x, y, 3);
      });
    },
  };
}
// A small dot in, a bigger one out, with a flash as it crosses.
function hoverAmp(ax: number, ay: number, inPts: Pt[], outPts: Pt[], hit: Part['hit']): Part {
  const pin = polyline(inPts);
  const pout = polyline(outPts);
  return {
    hit,
    draw(g, T) {
      const u = (T * 0.8) % 1;
      if (u < 0.5) {
        const [x, y] = pin.at(u * 2 * pin.len);
        dot(g, x, y, 2.2);
      } else {
        const [x, y] = pout.at((u - 0.5) * 2 * pout.len);
        dot(g, x, y, 5.2);
      }
      const q = (u - 0.5) / 0.08;
      rr(g, ax, ay, 18, 36, 2);
      g.fillStyle = green(0.85 * Math.exp(-(q * q)));
      g.fill();
    },
  };
}
// Pins blink like a working chip, the pin-1 LED beats, the crystal ticks.
function hoverMcu(M: Box, xtal: [number, number, number, number, number], hit: Part['hit']): Part {
  return {
    hit,
    draw(g, T) {
      for (let i = 0; i < LEADS; i++) {
        for (let side = 0; side < 4; side++) {
          const ph = hash(i * 4 + side + 1);
          if (Math.sin(T * TAU * (0.6 + ph * 1.8) + ph * TAU) < 0.55) continue;
          const y = leadAt(M.y, i);
          const x = leadAt(M.x, i);
          g.fillStyle = green(0.9);
          if (side === 0) g.fillRect(M.x - LEAD_LEN, y - 1.8, LEAD_LEN, 3.6);
          else if (side === 1) g.fillRect(M.x + M.w, y - 1.8, LEAD_LEN, 3.6);
          else if (side === 2) g.fillRect(x - 1.8, M.y - LEAD_LEN, 3.6, LEAD_LEN);
          else g.fillRect(x - 1.8, M.y + M.h, 3.6, LEAD_LEN);
        }
      }
      g.fillStyle = green(Math.max(0, Math.sin(T * TAU)));
      g.beginPath();
      g.arc(M.x + 18, M.y + 18, 5.5, 0, TAU);
      g.fill();
      g.strokeStyle = green(Math.sin(T * TAU * 4) > 0 ? 0.9 : 0.2);
      g.lineWidth = 2.2;
      rr(g, xtal[0], xtal[1], xtal[2], xtal[3], xtal[4]);
      g.stroke();
    },
  };
}
// The can pulses its ring and the antenna keeps transmitting.
function hoverRadio(can: [number, number, number, number, number], antEnd: Pt, dir: number, hit: Part['hit']): Part {
  return {
    hit,
    draw(g, T) {
      const pulse = 0.5 + 0.5 * Math.sin(T * TAU * 1.5);
      g.strokeStyle = ink(0.45 + 0.45 * pulse);
      g.lineWidth = 2.4;
      rr(g, can[0], can[1], can[2], can[3], can[4]);
      g.stroke();
      rings(g, antEnd, dir, [0, 1, 2].map((k) => 8 + ((T * 60 + k * 50) % 150)));
    },
  };
}
// The message keeps hopping broker, function, database, a ring at each arrival.
function hoverCloud(C: Cloud, hit: Part['hit']): Part {
  return {
    hit,
    draw(g, T) {
      const u = (T % 3.2) / 3.2;
      const ph = (a: number, b: number) => smooth((u - a) / (b - a));
      let pos: Pt | null = null;
      if (u < 0.3) pos = lerpPt(C.broker, C.fn, ph(0, 0.3));
      else if (u < 0.4) pos = C.fn;
      else if (u < 0.7) pos = lerpPt(C.fn, C.db, ph(0.4, 0.7));
      else if (u < 0.92) pos = C.db;
      for (const [t0, [x, y]] of [[0, C.broker], [0.3, C.fn], [0.7, C.db]] as [number, Pt][]) {
        const d = u - t0;
        if (d < 0 || d > 0.25) continue;
        const k = d / 0.25;
        g.strokeStyle = green(0.95 * (1 - k));
        g.lineWidth = 2.2;
        g.beginPath();
        g.arc(x, y, 10 + 16 * k, 0, TAU);
        g.stroke();
      }
      if (pos) dot(g, pos[0], pos[1], 3.6);
    },
  };
}
// The dashboard's chart draws itself in again.
function hoverWindow(c: Chart, x1: number, st: State, hit: Part['hit']): Part {
  return {
    hit,
    draw(g, T) {
      const k = smooth(Math.min(1, ((T * 0.5) % 1) / 0.7));
      const top = c.base - c.amp - 12;
      const w = x1 - c.x0 + 12;
      g.fillStyle = PAPER;
      g.fillRect(c.x0 - 6, top, w, c.amp + 18);
      g.save();
      g.beginPath();
      g.rect(c.x0 - 6, top, w * k, c.amp + 18);
      g.clip();
      chart(g, c, st.hist, st.next, 0, x1);
      g.restore();
    },
  };
}
// The phone's chart goes live, scrolling on with a green-ringed newest point.
function hoverPhone(c: Chart, x1: number, P: Box): Part {
  const val = (i: number) => clamp(0.52 + 0.22 * Math.sin(i * 0.55) + 0.1 * Math.sin(i * 1.3 + 1) + 0.05 * (hash(i) - 0.5), 0.1, 0.95);
  return {
    hit: hitRect(P.x, P.y, P.w, P.h),
    draw(g, T) {
      const top = c.base - c.amp - 12;
      g.fillStyle = PAPER;
      g.fillRect(c.x0 - 6, top, x1 - c.x0 + 12, c.amp + 18);
      const rate = 1.6;
      const n = Math.floor(T * rate);
      const f = (T * rate) % 1;
      const pts: Pt[] = [];
      for (let i = -1; i <= 10; i++) pts.push([c.x0 + (i - f) * c.step, c.base - val(n + i) * c.amp]);
      g.save();
      g.beginPath();
      g.rect(c.x0 - 2, top, x1 - c.x0 + 4, c.amp + 18);
      g.clip();
      g.strokeStyle = ink(0.08);
      g.lineWidth = 1;
      for (const k of [0.33, 0.66]) {
        line(g, [[c.x0, c.base - k * c.amp], [x1, c.base - k * c.amp]]);
        g.stroke();
      }
      g.strokeStyle = ink(0.22);
      line(g, [[c.x0, c.base], [x1, c.base]]);
      g.stroke();
      line(g, pts);
      g.lineTo(pts[pts.length - 1][0], c.base);
      g.lineTo(pts[0][0], c.base);
      g.closePath();
      g.fillStyle = ink(0.06);
      g.fill();
      line(g, pts);
      g.strokeStyle = INK;
      g.lineWidth = 1.6;
      g.lineJoin = 'round';
      g.stroke();
      const last = pts[pts.length - 2];
      g.fillStyle = INK;
      g.beginPath();
      g.arc(last[0], last[1], 3, 0, TAU);
      g.fill();
      g.strokeStyle = GREEN;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(last[0], last[1], 6.5, 0, TAU);
      g.stroke();
      g.restore();
    },
  };
}

// ---- The samples: each run brings one more, and the history scrolls on ----------

interface State {
  hist: number[];
  next: number;
  n: number;
  commit(): void;
}
function makeState(): State {
  const st: State = {
    hist: [0.32, 0.38, 0.35, 0.46, 0.42, 0.55, 0.51, 0.6, 0.58],
    next: 0.72,
    n: 0,
    commit() {
      st.hist.push(st.next);
      st.hist.shift();
      st.n++;
      // A walk that keeps to the middle of the chart.
      st.next = clamp(st.next + (hash(st.n) - 0.5) * 0.36 + (0.52 - st.next) * 0.2, 0.25, 0.85);
    },
  };
  return st;
}
// The cloud glyphs light as the packet reaches them and keep their light until
// `carry` fades it at the start of the next run.
const litFor = (R: Route, s: number, carry: number): Record<Glyph, number> => ({
  broker: Math.max(smooth((s - R.glyph('broker').start) / 12), carry),
  fn: Math.max(smooth((s - R.glyph('fn').start) / 12), carry),
  db: Math.max(smooth((s - R.glyph('db').start) / 12), carry),
});

// ---- The two drawings --------------------------------------------------------------

interface Geo {
  R: Route;
  link: Pt[];
}
interface Layout {
  W: number;
  H: number;
  st: State;
  // The route depends on where the chart's last point sits, so it is rebuilt
  // after every commit, and the board with it (the dotted link ends there).
  routes(): Geo;
  drawStatic(g: G, geo: Geo): void;
  drawLights(g: G, s: number, geo: Geo, carry: number): void;
  parts: Part[];
}

// Wide, 1660 × 300: motor, board, cloud and the phone in front of the window.
function wideLayout(): Layout {
  const W = 1660;
  const H = 300;
  const st = makeState();
  const MC: Pt = [72, 192];
  const MR = 46;
  const M: Box = { x: 588, y: 85, w: 130, h: 130 };
  const lx = (i: number) => leadAt(M.x, i);
  const CL: Cloud = { blobs: [[1205, 156, 42], [1268, 128, 56], [1335, 156, 42]], base: [1178, 150, 190, 48], broker: [1205, 160], fn: [1270, 128], db: [1335, 160] };
  const WIN: Box = { x: 1400, y: 44, w: 200, h: 122 };
  const PH: Box = { x: 1538, y: 108, w: 90, h: 176 };
  const PC: Chart = { x0: 1554, step: 6.8, base: 232, amp: 56 };
  const WC: Chart = { x0: 1414, step: 12, base: 150, amp: 50 };
  const AIR = quad([1086, 155], [1128, 92], [1172, 150]);
  const WIRES: Pt[][] = [[[116, 180], [170, 178]], [[118, 192], [170, 192]], [[116, 204], [170, 206]]];
  const SENSE: Pt[][] = [[[258, 170], [258, 118], [392, 118]], [[330, 170], [330, 138], [392, 138]]];

  const routes = (): Geo => {
    const last: Pt = [PC.x0 + 8 * PC.step, PC.base - st.hist[8] * PC.amp];
    const next: Pt = [PC.x0 + 9 * PC.step, PC.base - st.next * PC.amp];
    const link = quad([1376, 152], [1470, 250], last);
    const R = build([
      { pts: [[96, 192], [170, 192], [246, 192]], form: 'dot' },
      { pts: [[246, 192], [258, 192], [258, 170]], form: 'dot', part: 'shunt' },
      { pts: SENSE[0], form: 'dot' },
      { pts: [[392, 118], [426, 118]], form: 'dot', part: 'amp', hidden: true },
      { pts: [[426, 118], [500, 118], [527.5, 145.5], [576, 145.5]], form: 'dot' },
      { pts: [[576, 145.5], [730, 154.5]], form: 'dot', part: 'mcu', hidden: true, speed: 0.5 },
      { pts: [[730, 154.5], [820, 154.5]], form: 'pulses' },
      { pts: [[820, 154.5], [940, 155]], form: 'pulses', part: 'rf', hidden: true },
      { pts: [[940, 155], [1010, 155]], form: 'pulses' },
      { pts: [[1010, 155], [1086, 155]], form: 'pulses', part: 'ant', hidden: true },
      { pts: AIR, form: 'packet', air: true, speed: 1.5, ease: true },
      { pts: [[1172, 150], CL.broker], form: 'packet' },
      { pts: [CL.broker, CL.fn], form: 'packet', glyph: 'broker', speed: 0.9 },
      { pts: [CL.fn, CL.db], form: 'packet', glyph: 'fn', speed: 0.9 },
      { pts: [CL.db, [1376, 152]], form: 'packet', glyph: 'db' },
      { pts: link, form: 'packet', link: true, speed: 1.4, ease: true, dotFromX: PH.x + 6 },
      { pts: [last, next], form: 'dot', chart: true, speed: 0.4 },
    ]);
    return { R, link };
  };

  const drawStatic = (g: G, geo: Geo) => {
    motor(g, MC[0], MC[1], MR);
    wires(g, WIRES);
    board(g, 150, 36, 950, 248);
    // Copper: the phase pour through the shunt to the FETs, then signals.
    trace(g, [[184, 192], [236, 192]], 34);
    trace(g, [[352, 192], [430, 192], [430, 238]], 34);
    trace(g, SENSE[0], 4.2);
    trace(g, SENSE[1], 4.2);
    trace(g, [[392, 128], [376, 128]], 3.5);
    via(g, 376, 128);
    trace(g, [[426, 118], [500, 118], [527.5, 145.5], [576, 145.5]], 4.2);
    trace(g, [[730, 154.5], [820, 154.5]], 4.2);
    trace(g, [[730, 163.5], [820, 163.5]], 4.2);
    trace(g, [[576, 100.5], [560, 100.5]], 3.5);
    trace(g, [[546, 100.5], [530, 100.5]], 3.5);
    via(g, 530, 100.5);
    trace(g, [[730, 100.5], [753, 100.5]], 3.5);
    trace(g, [[767, 100.5], [784, 100.5]], 3.5);
    via(g, 784, 100.5);
    trace(g, [[730, 199.5], [753, 199.5]], 3.5);
    trace(g, [[767, 199.5], [784, 199.5]], 3.5);
    via(g, 784, 199.5);
    trace(g, [[lx(4), 73], [lx(4), 50]], 3.5);
    via(g, lx(4), 46);
    trace(g, [[lx(5), 73], [lx(5), 62], [lx(5) + 18, 44], [lx(5) + 56, 44]], 3.5);
    via(g, lx(5) + 60, 44);
    trace(g, [[lx(2), 227], [lx(2), 248]], 3.5);
    trace(g, [[lx(9), 227], [lx(9), 248]], 3.5);
    trace(g, [[940, 155], [1010, 155]], 6);
    for (let x = 952; x <= 1000; x += 12) {
      via(g, x, 141);
      via(g, x, 169);
    }
    header(g, 156, 164, 28, 54, [[170, 178], [170, 192], [170, 206]]);
    shunt(g, 234, 178, false);
    fet(g, 400, 244);
    fet(g, 444, 244);
    amp(g, 400, 110);
    mcu(g, M);
    capacitor(g, 553, 100.5);
    capacitor(g, 760, 100.5);
    capacitor(g, 760, 199.5);
    crystal(g, lx(2) - 0.5, 242, false);
    rfCan(g, 820, 105, false);
    antenna(g, 1010, 143, false);
    // The hops through the air, dotted; the one into the phone stops at its bezel.
    dotted(g, AIR, 0.35);
    g.save();
    g.beginPath();
    g.rect(-60, -60, W + 120, H + 120);
    g.roundRect(PH.x, PH.y, PH.w, PH.h, 14);
    g.clip('evenodd');
    dotted(g, geo.link, 0.35);
    g.restore();
    dotted(g, quad([1336, 108], [1368, 62], [1400, 96]), 0.35);
    cloudShape(g, CL);
    windowCard(g, WIN);
    phone(g, PH);
  };

  const drawLights = (g: G, s: number, geo: Geo, carry: number) => {
    const { R } = geo;
    const sh = R.within(s, R.by('shunt'), 24);
    if (sh > 0.004) {
      g.fillStyle = green(sh * 0.85);
      g.fillRect(260, 178, 68, 28);
    }
    const am = R.within(s, R.by('amp'), 18);
    if (am > 0.004) {
      rr(g, 400, 110, 18, 36, 2);
      g.fillStyle = green(am * 0.85);
      g.fill();
    }
    const mseg = R.by('mcu');
    const m = R.within(s, mseg, 26);
    if (m > 0.004) {
      const k = clamp((s - mseg.start) / mseg.len, 0, 1);
      mcuLights(g, M, 'x', k, m, 5, 6);
      g.strokeStyle = green(m * (0.55 + 0.45 * Math.sin(k * TAU * 4)));
      g.lineWidth = 2.2;
      rr(g, lx(2) - 0.5, 242, 66, 28, 6);
      g.stroke();
    }
    const rf = R.within(s, R.by('rf'), 26);
    ringStroke(g, rf, 2.6, (g) => rr(g, 820, 105, 120, 100, 8));
    ringStroke(g, rf * 0.6, 1.4, (g) => rr(g, 830.5, 115.5, 99, 79, 5));
    antennaRings(g, R.segs.find((r) => r.air)!, s, [1086, 155], 0);
    cloudGlyphs(g, CL, litFor(R, s, carry));
    const cs = R.segs.find((r) => r.chart)!;
    const grown = clamp((s - cs.start) / cs.len, 0, 1);
    chart(g, WC, st.hist, st.next, grown, 1530);
    if (grown > 0) {
      g.fillStyle = ink(grown);
      g.beginPath();
      g.arc(WC.x0 + 9 * WC.step, WC.base - st.next * WC.amp, 2.4, 0, TAU);
      g.fill();
    }
    chart(g, PC, st.hist, st.next, grown, 1612);
  };

  const parts: Part[] = [
    hoverMotor(MC[0], MC[1], MR, WIRES),
    hoverShunt([260, 178, 68, 28], SENSE, hitRect(220, 168, 148, 48)),
    hoverAmp(400, 110, [[372, 118], [400, 118]], [[418, 118], [500, 118], [527.5, 145.5], [560, 145.5]], hitRect(384, 104, 52, 48)),
    hoverMcu(M, [lx(2) - 0.5, 242, 66, 28, 6], hitRect(572, 69, 162, 206)),
    hoverRadio([820, 105, 120, 100, 8], [1086, 155], 0, hitRect(812, 97, 136, 116)),
    hoverRadio([820, 105, 120, 100, 8], [1086, 155], 0, hitRect(998, 128, 98, 54)),
    hoverCloud(CL, hitRect(1163, 72, 216, 126)),
    // The phone before the window: it is in front.
    hoverPhone(PC, 1612, PH),
    hoverWindow(WC, 1530, st, hitRect(WIN.x, WIN.y, WIN.w, WIN.h)),
  ];
  return { W, H, st, routes, drawStatic, drawLights, parts };
}

// Tall, 390 × 1200: the same parts, the chain running down the page.
function tallLayout(): Layout {
  const W = 390;
  const H = 1200;
  const st = makeState();
  const M: Box = { x: 130, y: 420, w: 130, h: 130 };
  const ly = (i: number) => leadAt(M.y, i);
  const CL: Cloud = { blobs: [[152, 926, 38], [200, 905, 50], [250, 924, 40]], base: [118, 920, 160, 44], broker: [152, 932], fn: [200, 906], db: [250, 930] };
  const WIN: Box = { x: 48, y: 990, w: 200, h: 122 };
  const PH: Box = { x: 230, y: 1010, w: 90, h: 176 };
  const PC: Chart = { x0: 246, step: 6.8, base: 1134, amp: 56 };
  const WC: Chart = { x0: 62, step: 14, base: 1096, amp: 50 };
  const AIR = quad([196, 816], [150, 862], [150, 900]);
  const WIRES: Pt[][] = [[[100, 60], [192, 60], [192, 137]], [[102, 72], [178, 72], [178, 137]], [[100, 84], [164, 84], [164, 137]]];
  const SENSE: Pt[][] = [[[154, 206], [60, 206], [60, 358], [90, 358]], [[154, 290], [80, 290], [80, 338], [90, 338]]];

  const routes = (): Geo => {
    const last: Pt = [PC.x0 + 8 * PC.step, PC.base - st.hist[8] * PC.amp];
    const next: Pt = [PC.x0 + 9 * PC.step, PC.base - st.next * PC.amp];
    const link = quad([288, 938], [312, 1010], last);
    const R = build([
      { pts: [[88, 72], [178, 72], [178, 137], [178, 206]], form: 'dot' },
      { pts: [[178, 206], [154, 206]], form: 'dot', part: 'shunt' },
      { pts: SENSE[0], form: 'dot' },
      { pts: [[90, 358], [132, 338]], form: 'dot', part: 'amp', hidden: true },
      { pts: [[132, 338], [154.5, 338], [154.5, 408]], form: 'dot' },
      { pts: [[154.5, 408], [235.5, 562]], form: 'dot', part: 'mcu', hidden: true, speed: 0.5 },
      { pts: [[235.5, 562], [235.5, 580], [196, 580], [196, 596]], form: 'pulses' },
      { pts: [[196, 596], [196, 696]], form: 'pulses', part: 'rf', hidden: true },
      { pts: [[196, 696], [196, 740]], form: 'pulses' },
      { pts: [[196, 740], [196, 816]], form: 'pulses', part: 'ant', hidden: true },
      { pts: AIR, form: 'packet', air: true, speed: 1.5, ease: true },
      { pts: [[150, 900], CL.broker], form: 'packet' },
      { pts: [CL.broker, CL.fn], form: 'packet', glyph: 'broker', speed: 0.9 },
      { pts: [CL.fn, CL.db], form: 'packet', glyph: 'fn', speed: 0.9 },
      { pts: [CL.db, [288, 938]], form: 'packet', glyph: 'db' },
      { pts: link, form: 'packet', link: true, speed: 1.4, ease: true, dotFromY: PH.y + 8 },
      { pts: [last, next], form: 'dot', chart: true, speed: 0.4 },
    ]);
    return { R, link };
  };

  const drawStatic = (g: G, geo: Geo) => {
    motor(g, 64, 72, 40);
    wires(g, WIRES);
    board(g, 24, 118, 342, 710);
    trace(g, [[178, 150], [178, 196]], 30);
    trace(g, [[178, 308], [178, 352], [262, 352], [262, 364]], 30);
    trace(g, SENSE[0], 4.2);
    trace(g, SENSE[1], 4.2);
    trace(g, [[90, 348], [72, 348]], 3.5);
    via(g, 72, 348);
    trace(g, [[132, 338], [154.5, 338], [154.5, 408]], 4.2);
    trace(g, [[235.5, 562], [235.5, 580], [196, 580], [196, 596]], 4.2);
    trace(g, [[118, 453.5], [98, 453.5]], 3.5);
    trace(g, [[118, 516.5], [98, 516.5]], 3.5);
    for (const y of [ly(3), ly(8)]) {
      trace(g, [[272, y], [291, y]], 3.5);
      trace(g, [[309, y], [318, y]], 3.5);
      via(g, 318, y);
    }
    trace(g, [[196, 696], [196, 740]], 6);
    for (let y = 708; y <= 732; y += 12) {
      via(g, 182, y);
      via(g, 210, y);
    }
    header(g, 150, 124, 56, 26, [[164, 137], [178, 137], [192, 137]]);
    shunt(g, 164, 190, true);
    fet(g, 246, 372);
    fet(g, 292, 372);
    amp(g, 104, 330);
    mcu(g, M);
    capacitor(g, 300, ly(3));
    capacitor(g, 300, ly(8));
    crystal(g, 84, 451.5, true);
    rfCan(g, 136, 596, true);
    antenna(g, 184, 740, true);
    dotted(g, AIR, 0.35);
    g.save();
    g.beginPath();
    g.rect(-60, -60, W + 120, H + 120);
    g.roundRect(PH.x, PH.y, PH.w, PH.h, 14);
    g.clip('evenodd');
    dotted(g, geo.link, 0.35);
    g.restore();
    dotted(g, quad([170, 962], [150, 980], [120, 990]), 0.35);
    cloudShape(g, CL);
    windowCard(g, WIN);
    phone(g, PH);
  };

  const drawLights = (g: G, s: number, geo: Geo, carry: number) => {
    const { R } = geo;
    const sh = R.within(s, R.by('shunt'), 24);
    if (sh > 0.004) {
      g.fillStyle = green(sh * 0.85);
      g.fillRect(164, 216, 28, 68);
    }
    const am = R.within(s, R.by('amp'), 18);
    if (am > 0.004) {
      rr(g, 104, 330, 18, 36, 2);
      g.fillStyle = green(am * 0.85);
      g.fill();
    }
    const mseg = R.by('mcu');
    const m = R.within(s, mseg, 26);
    if (m > 0.004) {
      const k = clamp((s - mseg.start) / mseg.len, 0, 1);
      mcuLights(g, M, 'y', k, m, 1, 10);
      g.strokeStyle = green(m * (0.55 + 0.45 * Math.sin(k * TAU * 4)));
      g.lineWidth = 2.2;
      rr(g, 84, 451.5, 28, 66, 6);
      g.stroke();
    }
    const rf = R.within(s, R.by('rf'), 26);
    ringStroke(g, rf, 2.6, (g) => rr(g, 136, 596, 120, 100, 8));
    ringStroke(g, rf * 0.6, 1.4, (g) => rr(g, 146.5, 606.5, 99, 79, 5));
    antennaRings(g, R.segs.find((r) => r.air)!, s, [196, 816], Math.PI / 2);
    cloudGlyphs(g, CL, litFor(R, s, carry));
    const cs = R.segs.find((r) => r.chart)!;
    const grown = clamp((s - cs.start) / cs.len, 0, 1);
    chart(g, WC, st.hist, st.next, grown, 226);
    if (grown > 0) {
      g.fillStyle = ink(grown);
      g.beginPath();
      g.arc(WC.x0 + 9 * WC.step, WC.base - st.next * WC.amp, 2.4, 0, TAU);
      g.fill();
    }
    chart(g, PC, st.hist, st.next, grown, 304);
  };

  const parts: Part[] = [
    hoverMotor(64, 72, 40, WIRES),
    hoverShunt([164, 216, 28, 68], SENSE, hitRect(150, 172, 56, 156)),
    hoverAmp(104, 330, [[80, 338], [104, 338]], [[122, 338], [154.5, 338], [154.5, 400]], hitRect(86, 324, 54, 48)),
    hoverMcu(M, [84, 451.5, 28, 66, 6], hitRect(80, 404, 196, 162)),
    hoverRadio([136, 596, 120, 100, 8], [196, 816], Math.PI / 2, hitRect(128, 588, 136, 116)),
    hoverRadio([136, 596, 120, 100, 8], [196, 816], Math.PI / 2, hitRect(169, 728, 54, 94)),
    hoverCloud(CL, hitRect(114, 855, 176, 110)),
    hoverPhone(PC, 304, PH),
    hoverWindow(WC, 226, st, hitRect(WIN.x, WIN.y, WIN.w, WIN.h)),
  ];
  return { W, H, st, routes, drawStatic, drawLights, parts };
}

// ---- The chain on a canvas -----------------------------------------------------------

export type Kind = 'wide' | 'tall';

// A run is the signal's journey; the rest leaves it landed before the next.
const RUN = 6.5;
const REST = 2.4;

// Draws the chain into `canvas` in the wide or the tall drawing and keeps it
// sized to the canvas's CSS box at the screen's density (two at most). Drawn
// landed until tick() is called; from then on the run is timed by the ticks.
export function signalChain(canvas: HTMLCanvasElement, kind: Kind) {
  const L = kind === 'tall' ? tallLayout() : wideLayout();
  canvas.dataset.layout = kind;
  const ctx = canvas.getContext('2d')!;
  let base: HTMLCanvasElement | null = null;
  let scale = 1;
  let geo = L.routes();
  let started = false;
  let T = 0; // the hovers' clock, seconds
  let cycle = 0; // seconds into this run and its rest
  let p = 1; // progress of the run; landed until the loop starts
  let hovered: Part | null = null; // under the pointer
  let held: Part | null = null; // the last one tapped on a touch screen
  const levels = new Map<Part, number>(L.parts.map((part) => [part, 0]));

  const renderBase = () => {
    base = document.createElement('canvas');
    base.width = canvas.width;
    base.height = canvas.height;
    const g = base.getContext('2d')!;
    S = scale;
    g.setTransform(scale, 0, 0, scale, 0, 0);
    L.drawStatic(g, geo);
  };
  const render = () => {
    if (!base) return;
    const s = geo.R.sFromP(p);
    const carry = started ? clamp(1 - cycle / 0.8, 0, 1) : 0;
    S = scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    L.drawLights(ctx, s, geo, carry);
    carrier(ctx, geo.R, s);
    for (const part of L.parts) {
      const h = levels.get(part)!;
      if (h <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = h;
      part.draw(ctx, T);
      ctx.restore();
    }
  };
  const resize = () => {
    const w = canvas.clientWidth;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(w * dpr);
    if (base && width === canvas.width) return;
    canvas.width = width;
    canvas.height = Math.round(((w * L.H) / L.W) * dpr);
    scale = canvas.width / L.W;
    renderBase();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  readGreen();
  resize();
  const retheme = () => {
    readGreen();
    if (!base) return;
    renderBase();
    render();
  };
  document.addEventListener('themechange', retheme);

  return {
    canvas,
    kind,
    // Advances the loop and the hovers by `dt` seconds and draws the frame.
    tick(dt: number) {
      if (!started) {
        // The landed point becomes history and the first run sets off.
        started = true;
        L.st.commit();
        geo = L.routes();
        renderBase();
      } else {
        cycle += dt;
        T += dt;
      }
      if (cycle < RUN) p = cycle / RUN;
      else if (cycle < RUN + REST) p = 1;
      else {
        L.st.commit();
        geo = L.routes();
        renderBase();
        cycle = 0;
        p = 0;
      }
      const on = hovered ?? held;
      for (const part of L.parts) {
        const v = levels.get(part)!;
        levels.set(part, part === on ? Math.min(1, v + dt / 0.25) : Math.max(0, v - dt / 0.4));
      }
      render();
    },
    // The pointer is over the canvas at `e`, or has left it (null). A mouse
    // hovers; a touch taps, and the tapped part keeps its loop until the next tap.
    point(e: PointerEvent | null) {
      if (!e) {
        hovered = null;
        return;
      }
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * L.W;
      const y = ((e.clientY - r.top) / r.height) * L.H;
      const part = L.parts.find((pt) => pt.hit(x, y)) ?? null;
      if (e.pointerType === 'touch') {
        if (e.type === 'pointerdown') held = part;
      } else hovered = part;
    },
    // Back to the landed drawing, nothing moving.
    rest() {
      started = false;
      p = 1;
      cycle = 0;
      hovered = held = null;
      levels.forEach((_, part) => levels.set(part, 0));
      render();
    },
    stop() {
      observer.disconnect();
      document.removeEventListener('themechange', retheme);
    },
  };
}

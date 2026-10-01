// The vinyl record of the intro and the vinyls page: a glossy black disc with
// a lettered label, drawn in a 2D canvas so it costs no library. What turns
// with the record (lacquer, grooves, label) is drawn once; each frame turns it
// and adds what stays put relative to the light: the streaks the grooves throw
// back, the gloss on the lacquer, and a white and a green rim light.

const TAU = Math.PI * 2;

// Fractions of the radius.
const GROOVES_OUT = 0.955;
const GROOVES_IN = 0.36;
const LABEL = 0.33;
const HOLE = 0.022;
const TRACK_GAPS = [0.5, 0.61, 0.72, 0.84];

// Where the grooves run, for a stylus to track (scripts/crate.ts).
export const GROOVES = { out: GROOVES_OUT, in: GROOVES_IN };

// The light comes from the top left: the groove streaks lie along that axis.
const LIGHT = -Math.PI * 0.75;

const VINYL = {
  centre: '#1b1b1e',
  edge: '#050506',
  light: 'rgba(255, 255, 255, 0.075)',
  dark: 'rgba(0, 0, 0, 0.6)',
  gap: 'rgba(0, 0, 0, 0.92)',
  lip: 'rgba(255, 255, 255, 0.16)',
  sheen: 0.3,
};

// The label's colour: the intro's green, paper, or ink with green lettering.
export type LabelScheme = 'green' | 'paper' | 'ink';

export interface Label {
  top: string;
  bottom: string;
  monogram: string;
  scheme?: LabelScheme;
}

export interface Pose {
  turn: number; // radians
  cut: number; // 0 bare lacquer to 1 grooves cut down to the label
  label: number; // the label's opacity
}

function layer(size: number, paint: (g: CanvasRenderingContext2D, r: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.translate(size / 2, size / 2);
  paint(g, size / 2);
  return c;
}

// A park-miller generator: the same grooves on every load.
function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function lacquer(g: CanvasRenderingContext2D, r: number) {
  const fill = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
  fill.addColorStop(0, VINYL.centre);
  fill.addColorStop(1, VINYL.edge);
  g.fillStyle = fill;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  // The raised lip at the edge.
  g.strokeStyle = VINYL.lip;
  g.lineWidth = Math.max(1, r * 0.012);
  g.beginPath();
  g.arc(0, 0, r * 0.982, 0, TAU);
  g.stroke();
}

// Rings a device pixel or so apart, each a little lighter or darker than the
// last, with four smooth bands between the tracks.
function grooves(g: CanvasRenderingContext2D, r: number) {
  const random = seeded(11);
  const step = Math.max(0.55, r / 320);
  for (let at = r * GROOVES_OUT; at > r * GROOVES_IN; at -= step) {
    const gap = TRACK_GAPS.some((f) => Math.abs(f * r - at) < r * 0.007);
    g.globalAlpha = gap ? 1 : 0.3 + random() * 0.7;
    g.strokeStyle = gap ? VINYL.gap : random() < 0.5 ? VINYL.light : VINYL.dark;
    g.lineWidth = gap ? step * 1.3 : Math.max(0.45, r / 480);
    g.beginPath();
    g.arc(0, 0, at, 0, TAU);
    g.stroke();
  }
  g.globalAlpha = 1;
}

// Letters set round a circle: over the top reading clockwise, or along the
// bottom reading anticlockwise, both upright from outside. Text that would
// run past `maxArc` radians is set smaller, down to 60%, then loses its tail.
function round(g: CanvasRenderingContext2D, text: string, r: number, top: boolean, weight: number, family: string, size: number, tracking: number, maxArc: number) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let letters = [...text];
  let at = size;
  const measure = () => {
    g.font = `${weight} ${at}px ${family}`;
    return letters.map((l) => g.measureText(l).width + (tracking * at) / size);
  };
  const total = (w: number[]) => w.reduce((a, b) => a + b, 0);
  let widths = measure();
  while (total(widths) / r > maxArc && at > size * 0.6) {
    at *= 0.95;
    widths = measure();
  }
  const kept = [...letters];
  while (total(widths) / r > maxArc && kept.length > 3) {
    kept.pop();
    letters = [...kept, '…'];
    widths = measure();
  }
  const dir = top ? 1 : -1;
  let a = top ? -Math.PI / 2 - total(widths) / (2 * r) : Math.PI / 2 + total(widths) / (2 * r);
  letters.forEach((l, i) => {
    a += (dir * widths[i]) / (2 * r);
    g.save();
    g.rotate(a + (dir * Math.PI) / 2);
    g.fillText(l, 0, -dir * r);
    g.restore();
    a += (dir * widths[i]) / (2 * r);
  });
}

function label(g: CanvasRenderingContext2D, r: number, text: Label, css: CSSStyleDeclaration) {
  const rl = r * LABEL;
  const green = css.getPropertyValue('--green').trim();
  const ink = css.getPropertyValue('--ink').trim();
  const paper = css.getPropertyValue('--paper').trim();
  // Each scheme: the label's colour lit and plain, its lettering, and a rim
  // where the label would otherwise vanish into the record.
  const schemes = {
    green: { fill: ['#8affbb', green], text: ink, rim: null },
    paper: { fill: ['#ffffff', paper], text: ink, rim: null },
    ink: { fill: ['#2b312d', ink], text: green, rim: 'rgba(243, 242, 236, 0.55)' },
  } as const;
  const scheme = schemes[text.scheme ?? 'green'];
  const fill = g.createRadialGradient(-rl * 0.35, -rl * 0.35, rl * 0.1, 0, 0, rl);
  fill.addColorStop(0, scheme.fill[0]);
  fill.addColorStop(1, scheme.fill[1]);
  g.fillStyle = fill;
  g.beginPath();
  g.arc(0, 0, rl, 0, TAU);
  g.fill();
  if (scheme.rim) {
    g.strokeStyle = scheme.rim;
    g.lineWidth = Math.max(0.8, rl * 0.02);
    g.beginPath();
    g.arc(0, 0, rl * 0.985, 0, TAU);
    g.stroke();
  }

  g.fillStyle = g.strokeStyle = scheme.text;
  g.globalAlpha = 0.5;
  g.lineWidth = Math.max(0.6, rl * 0.012);
  g.beginPath();
  g.arc(0, 0, rl * 0.9, 0, TAU);
  g.stroke();
  g.globalAlpha = 1;

  const sans = css.getPropertyValue('--sans');
  round(g, text.top.toUpperCase(), rl * 0.72, true, 600, sans, rl * 0.15, rl * 0.035, 3.2);
  round(g, text.bottom.toUpperCase(), rl * 0.74, false, 400, sans, rl * 0.11, rl * 0.02, 2.9);
  g.font = `600 ${rl * 0.24}px ${css.getPropertyValue('--display')}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text.monogram, 0, -rl * 0.3);
}

// The two narrow streaks and a softer pair either side, opposite each other
// along the light's axis.
function sheen(g: CanvasRenderingContext2D, r: number, a: number) {
  const pairs: [number, number][][] = [
    [[0, a], [0.02, a * 0.45], [0.06, 0], [0.44, 0], [0.48, a * 0.45], [0.5, a], [0.52, a * 0.45], [0.56, 0], [0.94, 0], [0.98, a * 0.45], [1, a]],
    [[0, a * 0.35], [0.1, 0], [0.4, 0], [0.5, a * 0.35], [0.6, 0], [0.9, 0], [1, a * 0.35]],
  ];
  for (const stops of pairs) {
    const cone = g.createConicGradient(LIGHT, 0, 0);
    for (const [at, alpha] of stops) cone.addColorStop(at, `rgba(255, 255, 255, ${alpha})`);
    g.fillStyle = cone;
    g.fillRect(-r, -r, 2 * r, 2 * r);
  }
}

// Draws into `canvas`, square and already sized in device pixels. Returns the
// frame function, which blurs the label by however far it turned since the
// last frame, as a camera shutter would, and a way to put another label on.
export function vinyl(canvas: HTMLCanvasElement, text: Label) {
  const size = canvas.width;
  const r = size / 2;
  const css = getComputedStyle(document.documentElement);
  const turning = {
    lacquer: layer(size, lacquer),
    grooves: layer(size, grooves),
    label: layer(size, (g, r) => label(g, r, text, css)),
  };
  const g = canvas.getContext('2d')!;
  let last = 0;

  const setLabel = (next: Label) => {
    turning.label = layer(size, (g, r) => label(g, r, next, css));
  };

  const frame = ({ turn, cut, label: shown }: Pose) => {
    const rOut = r * GROOVES_OUT;
    const rCut = rOut - (rOut - r * GROOVES_IN) * cut;
    let moved = turn - last;
    last = turn;
    if (Math.abs(moved) > 0.6) moved = 0; // a jump, not motion

    g.setTransform(1, 0, 0, 1, r, r);
    g.clearRect(-r, -r, size, size);

    // Grooves exist only where the cut has reached, from the edge inwards.
    g.save();
    g.rotate(turn);
    g.drawImage(turning.lacquer, -r, -r);
    g.beginPath();
    g.arc(0, 0, rOut, 0, TAU);
    g.arc(0, 0, rCut, 0, TAU, true);
    g.clip();
    g.drawImage(turning.grooves, -r, -r);
    g.restore();

    // Copy k at alpha 1/k: the copies average into one blurred label.
    if (shown > 0) {
      const copies = Math.max(1, Math.min(10, Math.ceil((Math.abs(moved) * r * LABEL) / 1.5)));
      for (let k = 1; k <= copies; k++) {
        g.save();
        g.globalAlpha = shown / k;
        g.rotate(turn - (copies > 1 ? (moved * (k - 1)) / (copies - 1) : 0));
        g.drawImage(turning.label, -r, -r);
        g.restore();
      }
    }

    g.save();
    g.beginPath();
    g.arc(0, 0, rOut, 0, TAU);
    g.arc(0, 0, rCut, 0, TAU, true);
    g.clip();
    g.globalCompositeOperation = 'screen';
    sheen(g, r, VINYL.sheen);
    g.restore();

    g.save();
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.clip();
    g.globalCompositeOperation = 'screen';
    const gloss = g.createRadialGradient(-r * 0.45, -r * 0.5, 0, -r * 0.45, -r * 0.5, r * 1.1);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.11)');
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = gloss;
    g.fillRect(-r, -r, size, size);
    g.lineWidth = Math.max(1, r * 0.009);
    g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    g.beginPath();
    g.arc(0, 0, r * 0.992, -Math.PI * 0.95, -Math.PI * 0.45);
    g.stroke();
    g.strokeStyle = 'rgba(47, 242, 124, 0.5)'; // --green
    g.beginPath();
    g.arc(0, 0, r * 0.992, Math.PI * 0.05, Math.PI * 0.55);
    g.stroke();
    g.restore();

    // The cutting head's spark, fixed at the right while the record turns.
    if (cut > 0 && cut < 1) {
      const x = rCut * Math.cos(-0.25);
      const y = rCut * Math.sin(-0.25);
      const spark = g.createRadialGradient(x, y, 0, x, y, r * 0.06);
      spark.addColorStop(0, 'rgba(140, 255, 190, 0.95)');
      spark.addColorStop(1, 'rgba(47, 242, 124, 0)');
      g.fillStyle = spark;
      g.beginPath();
      g.arc(x, y, r * 0.06, 0, TAU);
      g.fill();
    }

    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(0, 0, r * HOLE, 0, TAU);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  };

  return { frame, setLabel };
}

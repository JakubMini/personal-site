// The lean figure's still frame: a bike on a gradient, leaning, with the vectors
// from the snippet drawn at its IMU, as an orthographic projection to SVG paths.
// Drawn at build time; it is what shows without JS and under reduced motion.
// With motion, scripts/lean-scene-3d.ts replaces it with the rendered scene.

type V3 = readonly [number, number, number];
type Pt = readonly [number, number];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const DEG = 180 / Math.PI;

// World axes: x along the road's heading, y up, z to the bike's right.
// The slope the snippet recovers, set steep enough for the error to show.
export const GRADIENT = 8 / DEG;

// The e-bike from components/Machine.astro, in its SVG units (y down, ground at 186).
const FRAME: readonly (readonly number[])[] = [
  [80, 140, 175, 144, 155, 66, 80, 140],
  [175, 144, 150, 50],
  [134, 48, 166, 48],
  [155, 68, 262, 62],
  [175, 144, 268, 86],
  [262, 54, 270, 86, 300, 140],
  [262, 54, 258, 42, 282, 38],
  [189.4, 119, 249.4, 83, 256.6, 95, 196.6, 131, 189.4, 119], // battery
];
const WHEELS: readonly Pt[] = [[80, 140], [300, 140]];
const WHEEL_R = 46;
const IMU: Pt = [223, 107]; // on the battery, where the sensor sits

// Drawing units to scene units: origin under the bike, 100 units to 1.
const inPlane = ([x, y]: Pt): Pt => [(x - 190) / 100, (186 - y) / 100];

// The view: 520 x 400, looking down a little from the front right.
const W = 520;
const H = 400;
const SCALE = 112;
const CENTRE: Pt = [W / 2, 312];
const PITCH = 0.3;

function project(p: V3, yaw: number): Pt {
  const x = p[0] * Math.cos(yaw) - p[2] * Math.sin(yaw);
  const z = p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
  const y = p[1] * Math.cos(PITCH) - z * Math.sin(PITCH);
  return [CENTRE[0] + SCALE * x, CENTRE[1] - SCALE * y];
}

const path = (pts: readonly V3[], yaw: number, close = false): string =>
  pts.map((p, i) => {
    const [x, y] = project(p, yaw);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + (close ? ' Z' : '');

export interface Label {
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

export interface Frame {
  d: Record<string, string>;
  at: Record<string, Label>;
  naive: number;
  corrected: number;
  leanDegrees: number;
  // How visible the lateral share is: 0 upright, 1 from about 12 degrees of lean.
  lateralOpacity: number;
}

// One frame at a given lean (rad, + to the right) and camera yaw (rad).
export function leanScene(lean: number, yaw: number): Frame {
  // The bike's axes: fwd up the slope, up and lat rolled by the lean about fwd.
  const fwd: V3 = [Math.cos(GRADIENT), Math.sin(GRADIENT), 0];
  const up0: V3 = [-Math.sin(GRADIENT), Math.cos(GRADIENT), 0];
  const lat0: V3 = [0, 0, 1];
  const up = add(mul(up0, Math.cos(lean)), mul(lat0, Math.sin(lean)));
  const lat = add(mul(up0, -Math.sin(lean)), mul(lat0, Math.cos(lean)));
  const onBike = (p: Pt): V3 => add(mul(fwd, inPlane(p)[0]), mul(up, inPlane(p)[1]));
  const onRoad = (along: number, across: number): V3 => add(mul(fwd, along), mul(lat0, across));

  // At rest the accelerometer reads 1 g straight up, whatever the bike does.
  const accel: V3 = [0, 1, 0];
  const lateral = mul(lat, dot(accel, lat));
  // R(-lean) · accel: the same reading, rolled back into the bike's plane.
  const above = Math.hypot(dot(accel, up), dot(accel, lat));
  const upright = add(mul(fwd, dot(accel, fwd)), mul(up, above));

  const o = onBike(IMU);
  const tip = (v: V3, len: number): V3 => add(o, mul(v, len));
  const arrow = (v: V3, len: number) => path([o, tip(v, len)], yaw);
  // A point a fixed gap past the tip of v drawn at len, wherever v points.
  const beyond = (v: V3, len: number, gap: number): V3 => add(tip(v, len), mul(v, gap / (Math.hypot(...v) || 1)));
  const circle = (c: Pt, r: number, n = 40) =>
    Array.from({ length: n + 1 }, (_, i) => onBike([c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)]));
  // Arc from a to b (unit, perpendicular) at the given centre and radius.
  const arc = (c: V3, a: V3, b: V3, angle: number, r: number, n = 16) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = (angle * i) / n;
      return add(c, add(mul(a, r * Math.cos(t)), mul(b, r * Math.sin(t))));
    });

  const L = 1.45;
  const AXIS = 0.5;
  const rear = onRoad(-1.75, 0);
  // A label beside a point, anchored away from the IMU so it never sits on its own arrow.
  const origin = project(o, yaw);
  const label = (v: V3, side?: 'start' | 'end'): Label => {
    const [x, y] = project(v, yaw);
    const anchor = side ?? (x < origin[0] - 6 ? 'end' : 'start');
    return { x: x + (anchor === 'end' ? -4 : 4), y: y + 4, anchor };
  };
  // accel and its corrected twin meet when upright: put their labels on opposite sides.
  const uprightRight = project(tip(upright, L), yaw)[0] >= project(tip(accel, L), yaw)[0];

  return {
    d: {
      road: path([onRoad(-2.0, -0.75), onRoad(2.0, -0.75), onRoad(2.0, 0.75), onRoad(-2.0, 0.75)], yaw, true),
      centreLine: path([onRoad(-2.0, 0), onRoad(2.0, 0)], yaw),
      level: path([rear, add(rear, [1.4, 0, 0])], yaw),
      gradientArc: path(arc(rear, [1, 0, 0], [0, 1, 0], GRADIENT, 1.15), yaw),
      bike: [...FRAME.map((line) => path(line.reduce<V3[]>((acc, v, i) => (i % 2 ? acc : [...acc, onBike([v, line[i + 1]])]), []), yaw)),
        ...WHEELS.map((c) => path(circle(c, WHEEL_R), yaw))].join(' '),
      plumb: path([o, add(o, mul(up0, 1.05))], yaw),
      leanArc: path(arc(o, up0, lat0, lean, 0.95), yaw),
      fwd: arrow(fwd, AXIS),
      up: arrow(up, AXIS),
      lat: arrow(lat, AXIS),
      accel: arrow(accel, L),
      lateral: arrow(lateral, L),
      upright: arrow(upright, L),
    },
    at: {
      fwd: label(tip(fwd, AXIS + 0.12)),
      up: label(tip(up, AXIS + 0.12)),
      lat: label(tip(lat, AXIS + 0.12)),
      accel: label(beyond(accel, L, 0.22), uprightRight ? 'end' : 'start'),
      lateral: label(beyond(lateral, L, 0.22)),
      upright: label(beyond(upright, L, 0.3), uprightRight ? 'start' : 'end'),
      lean: label(add(o, add(mul(up0, 1.08 * Math.cos(lean / 2)), mul(lat0, 1.08 * Math.sin(lean / 2))))),
      gradient: label(add(rear, [1.25, 0.07, 0])),
    },
    lateralOpacity: Math.min(1, Math.abs(dot(accel, lat)) * 5),
    leanDegrees: Math.abs(lean) * DEG,
    naive: Math.atan2(dot(accel, fwd), dot(accel, up)) * DEG,
    corrected: Math.atan2(dot(accel, fwd), above) * DEG,
  };
}

export const FIGURE_SIZE = { width: W, height: H } as const;

// The still frame the page ships with: mid-lean, so the problem is visible
// without JavaScript and under reduced motion.
export const STILL = { lean: 0.6, yaw: 0.75 } as const;

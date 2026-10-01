// The lean figure in WebGL (three.js): a modelled e-bike on an 8 degree climb,
// leaning into a corner, with the vectors from the snippet at its IMU.
// Loaded only when the figure nears the viewport (scripts/motion.ts); the SVG
// still in components/LeanFigure.astro stays for no-JS and reduced motion.

import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
} from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GRADIENT } from './lean-figure';

const UP = new Vector3(0, 1, 0);
const DEG = 180 / Math.PI;

// Bike drawing units (components/Machine.astro, y down, ground at 186) to the
// bike's own frame: x forward, y up from the road, z to its right, in metres-ish.
const at = (x: number, y: number, z = 0) => new Vector3((x - 190) / 100, (186 - y) / 100, z);

const COLOURS = {
  paper: '#f3f2ec',
  frame: '#5d676d',
  tyre: '#1c1e1e',
  metal: '#b4b8b6',
  battery: '#66706c',
  imu: '#2ff27c',
  road: '#e2e0d8',
  roadLine: '#fbfaf6',
  guide: '#8a8d86',
  accel: '#0b0f0c',
  axis: '#1d6a86',
  lateral: '#b0305c',
  upright: '#1c8a4a',
};

const mat = (color: string, roughness = 0.6, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });

// A round tube from a to b.
function tube(a: Vector3, b: Vector3, r: number, material: MeshStandardMaterial) {
  const dir = new Vector3().subVectors(b, a);
  const m = new Mesh(new CylinderGeometry(r, r, dir.length(), 20), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.castShadow = true;
  return m;
}

function joint(p: Vector3, r: number, material: MeshStandardMaterial) {
  const m = new Mesh(new SphereGeometry(r, 16, 12), material);
  m.position.copy(p);
  m.castShadow = true;
  return m;
}

function wheel(centre: Vector3, hubRadius: number) {
  const g = new Group();
  g.position.copy(centre);
  const tyre = new Mesh(new TorusGeometry(0.43, 0.034, 18, 96), mat(COLOURS.tyre, 0.85));
  const rim = new Mesh(new TorusGeometry(0.395, 0.012, 10, 96), mat(COLOURS.metal, 0.3, 0.8));
  const hub = new Mesh(new CylinderGeometry(hubRadius, hubRadius, 0.07, 32), mat(COLOURS.frame, 0.45, 0.4));
  hub.rotation.x = Math.PI / 2;
  // Spokes laced from alternate hub flanges, so the wheel reads as a wheel.
  const pts: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const flange = i % 2 ? 0.03 : -0.03;
    pts.push(Math.cos(a) * hubRadius * 0.8, Math.sin(a) * hubRadius * 0.8, flange, Math.cos(a + 0.35) * 0.39, Math.sin(a + 0.35) * 0.39, 0);
  }
  const spokes = new LineSegments(
    new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pts, 3)),
    new LineBasicMaterial({ color: COLOURS.metal }),
  );
  for (const m of [tyre, rim, hub]) m.castShadow = true;
  g.add(tyre, rim, hub, spokes);
  return g;
}

function buildBike() {
  const bike = new Group();
  const frame = mat(COLOURS.frame, 0.4, 0.45);
  const r = 0.022;
  const rear = at(80, 140);
  const front = at(300, 140);
  const bb = at(175, 144);
  const seatTop = at(150, 52);
  const headTop = at(262, 54);
  const headBottom = at(270, 86);
  const seatCluster = at(155, 66);

  // Main triangle.
  bike.add(tube(bb, seatTop, r, frame), tube(seatCluster, at(262, 62), r, frame), tube(bb, headBottom, r * 1.3, frame));
  bike.add(tube(headTop, headBottom, r * 1.3, frame));
  // Stays and fork in pairs either side of the wheels.
  for (const side of [-0.055, 0.055]) {
    const hubR = at(80, 140, side);
    bike.add(tube(hubR, at(175, 144, side * 0.4), r * 0.8, frame), tube(hubR, at(155, 66, side * 0.3), r * 0.8, frame));
    bike.add(tube(at(270, 86, side * 0.6), at(300, 140, side), r * 0.85, frame));
  }
  // Stem, bar across the bike, grips.
  const barCentre = at(282, 38);
  bike.add(tube(headTop, at(258, 42), r, frame), tube(at(258, 42), barCentre, r, frame));
  bike.add(tube(at(282, 38, -0.22), at(282, 38, 0.22), r * 0.9, frame));
  for (const side of [-0.22, 0.22]) bike.add(tube(at(282, 38, side), at(282, 38, side * 0.72), r * 1.4, mat('#222424', 0.85)));
  // Saddle.
  const saddle = new Mesh(new BoxGeometry(0.24, 0.035, 0.1), mat('#222424', 0.8));
  saddle.position.copy(at(150, 47));
  saddle.castShadow = true;
  bike.add(saddle);
  for (const p of [bb, seatCluster, headTop, headBottom, at(258, 42), barCentre]) bike.add(joint(p, r * 1.3, frame));

  // Cranks, pedals, chainring.
  const ring = new Mesh(new TorusGeometry(0.1, 0.01, 8, 48), mat(COLOURS.metal, 0.3, 0.8));
  ring.position.copy(bb).setZ(0.07);
  bike.add(ring);
  for (const [side, sign] of [[0.09, 1], [-0.09, -1]] as const) {
    const pedal = at(175 + 13 * sign, 144 + 16 * sign, side);
    bike.add(tube(at(175, 144, side), pedal, 0.012, frame));
    const p = new Mesh(new BoxGeometry(0.09, 0.02, 0.1), mat('#1a1c1c', 0.8));
    p.position.copy(pedal).setZ(side * 1.6);
    p.castShadow = true;
    bike.add(p);
  }

  bike.add(wheel(rear, 0.13), wheel(front, 0.04));

  // Battery on the down tube, and the IMU on the battery.
  const tilt = Math.atan2(at(268, 86).y - bb.y, at(268, 86).x - bb.x);
  const battery = new Mesh(new BoxGeometry(0.62, 0.1, 0.085), mat(COLOURS.battery, 0.5, 0.25));
  battery.position.copy(at(223, 107));
  battery.rotation.z = tilt;
  battery.castShadow = true;
  const imu = new Mesh(new BoxGeometry(0.1, 0.03, 0.07), new MeshStandardMaterial({ color: COLOURS.imu, roughness: 0.4, emissive: COLOURS.imu, emissiveIntensity: 0.35 }));
  imu.position.copy(at(223, 107)).add(new Vector3(-Math.sin(tilt), Math.cos(tilt), 0).multiplyScalar(0.065));
  imu.rotation.z = tilt;
  bike.add(battery, imu);
  return { bike, imu };
}

// An arrow: a shaft and a cone, pointed and sized each frame.
class Arrow extends Group {
  private shaft: Mesh;
  private head: Mesh;
  constructor(color: string, private radius: number) {
    super();
    const m = new MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
    this.shaft = new Mesh(new CylinderGeometry(radius, radius, 1, 16), m);
    this.head = new Mesh(new ConeGeometry(radius * 2.8, radius * 9, 24), m);
    this.shaft.castShadow = this.head.castShadow = true;
    this.add(this.shaft, this.head);
  }
  point(from: Vector3, dir: Vector3, length: number) {
    const headLen = this.radius * 9;
    const shaftLen = Math.max(length - headLen, 0.001);
    this.position.copy(from);
    this.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    this.shaft.scale.set(1, shaftLen, 1);
    this.shaft.position.y = shaftLen / 2;
    this.head.position.y = shaftLen + headLen / 2;
    this.visible = length > headLen * 0.6;
  }
}

function label(text: string, kind: string) {
  const el = document.createElement('span');
  el.className = `lf3-label lf3-${kind}`;
  el.textContent = text;
  return new CSS2DObject(el);
}

// Nudge labels that would poke out of the figure back inside it, after
// CSS2DRenderer has placed them. Each label's box is worked out the way the
// renderer places it (project the anchor, offset by centre and size), so no
// layout is read per frame; sizes are measured once, at mount.
const projected = new Vector3();
function keepInside(tags: CSS2DObject[], sizes: Map<CSS2DObject, readonly [number, number]>, camera: PerspectiveCamera, w: number, h: number, pad = 4) {
  for (const tag of tags) {
    const [ew, eh] = sizes.get(tag) ?? [0, 0];
    tag.getWorldPosition(projected).project(camera);
    const x = (projected.x * 0.5 + 0.5) * w - tag.center.x * ew;
    const y = (-projected.y * 0.5 + 0.5) * h - tag.center.y * eh;
    const dx = Math.max(0, pad - x) - Math.max(0, x + ew - (w - pad));
    const dy = Math.max(0, pad - y) - Math.max(0, y + eh - (h - pad));
    if (dx || dy) tag.element.style.transform += ` translate(${dx}px, ${dy}px)`;
  }
}

function dashed(points: Vector3[], color: string) {
  const line = new Line(new BufferGeometry().setFromPoints(points), new LineDashedMaterial({ color, dashSize: 0.06, gapSize: 0.05 }));
  line.computeLineDistances();
  return line;
}

// Mount the scene into `host` (which holds the SVG still). Returns the stop.
export function mountLeanScene(host: HTMLElement, readout: { naive: Element | null; fixed: Element | null; lean: Element | null }) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    return () => {}; // no WebGL: the SVG still stays
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // sharp enough, and half the pixels of 2x
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(new Color(COLOURS.paper));
  const labels = new CSS2DRenderer();
  renderer.domElement.className = 'lf3-canvas';
  labels.domElement.className = 'lf3-labels';
  labels.domElement.setAttribute('aria-hidden', 'true'); // the host's description says it in words
  host.append(renderer.domElement, labels.domElement);

  const scene = new Scene();
  scene.add(new HemisphereLight('#ffffff', '#cfcbbd', 1.9));
  const sun = new DirectionalLight('#ffffff', 2.4);
  sun.position.set(-2.5, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 15 });
  scene.add(sun);

  // The road climbs at GRADIENT; the bike rolls about its contact line on it.
  const road = new Group();
  road.rotation.z = GRADIENT;
  scene.add(road);
  const slab = new Mesh(new BoxGeometry(9, 0.05, 1.7), mat(COLOURS.road, 0.95));
  slab.position.y = -0.025;
  slab.receiveShadow = true;
  road.add(slab);
  for (let x = -4.25; x < 4.3; x += 0.5) {
    const dash = new Mesh(new BoxGeometry(0.25, 0.002, 0.03), mat(COLOURS.roadLine, 0.9));
    dash.position.set(x, 0.001, -0.62);
    dash.receiveShadow = true;
    road.add(dash);
  }

  const roll = new Group();
  road.add(roll);
  const { bike, imu } = buildBike();
  roll.add(bike);

  // The level the climb is measured from, and its angle.
  const rearContact = new Vector3(-2, 0, 0).applyAxisAngle(new Vector3(0, 0, 1), GRADIENT).setZ(0.95);
  scene.add(dashed([rearContact, rearContact.clone().add(new Vector3(1.6, 0, 0))], COLOURS.guide));
  scene.add(dashed([rearContact, rearContact.clone().add(new Vector3(1.6 * Math.cos(GRADIENT), 1.6 * Math.sin(GRADIENT), 0))], COLOURS.guide));
  const gradientArc = new Mesh(new TorusGeometry(1.25, 0.006, 6, 24, GRADIENT), mat(COLOURS.guide));
  gradientArc.position.copy(rearContact);
  scene.add(gradientArc);
  const thetaLabel = label('θ = 8°', 'guide');
  thetaLabel.position.copy(rearContact).add(new Vector3(1.5, 0.1, 0));
  thetaLabel.center.set(-0.1, 0.5);
  scene.add(thetaLabel);

  // Vectors at the IMU.
  const L = 1.4;
  const arrows = {
    accel: new Arrow(COLOURS.accel, 0.018),
    lateral: new Arrow(COLOURS.lateral, 0.016),
    upright: new Arrow(COLOURS.upright, 0.018),
    fwd: new Arrow(COLOURS.axis, 0.009),
    up: new Arrow(COLOURS.axis, 0.009),
    lat: new Arrow(COLOURS.axis, 0.009),
  };
  scene.add(...Object.values(arrows));
  const tags = {
    accel: label('accel', 'accel'),
    lateral: label('lateral share', 'lateral'),
    upright: label('R(−lean)·accel', 'upright'),
    fwd: label('fwd', 'axis'),
    up: label('up', 'axis'),
    lat: label('lat', 'axis'),
    lean: label('lean', 'guide'),
  };
  scene.add(...Object.values(tags));
  const plumb = dashed([new Vector3(), new Vector3(0, 1.1, 0)], COLOURS.guide);
  scene.add(plumb);
  // The lean, as an arc from the road's normal to the bike's up: one buffer,
  // rewritten in place each frame.
  const ARC_STEPS = 48;
  const arcPositions = new Float32BufferAttribute(new Float32Array((ARC_STEPS + 1) * 3), 3);
  const leanArc = new Line(new BufferGeometry().setAttribute('position', arcPositions), new LineBasicMaterial({ color: COLOURS.guide }));
  leanArc.frustumCulled = false;
  scene.add(leanArc);
  const arcPoint = new Vector3();

  const camera = new PerspectiveCamera(26, 1, 0.1, 60);
  const target = new Vector3(0.1, 1.0, 0.1);

  let w = 0;
  let h = 0;
  const resize = () => {
    w = host.clientWidth;
    h = host.clientHeight;
    renderer.setSize(w, h, false);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const o = new Vector3();
  const accel = new Vector3(0, 1, 0); // at rest the accelerometer reads 1 g straight up
  const fwd = new Vector3();
  const up0 = new Vector3();
  const up = new Vector3();
  const lat = new Vector3();
  const lat0 = new Vector3(0, 0, 1);

  const draw = (t: number) => {
    const lean = 0.7 * Math.sin((2 * Math.PI * t) / 7); // ±40°, every 7 s
    const az = 0.7 + 0.18 * Math.sin((2 * Math.PI * t) / 17); // a slow drift of the camera
    roll.rotation.x = lean;
    scene.updateMatrixWorld();
    imu.getWorldPosition(o);

    fwd.set(Math.cos(GRADIENT), Math.sin(GRADIENT), 0);
    up0.set(-Math.sin(GRADIENT), Math.cos(GRADIENT), 0);
    up.copy(up0).multiplyScalar(Math.cos(lean)).addScaledVector(lat0, Math.sin(lean));
    lat.copy(up0).multiplyScalar(-Math.sin(lean)).addScaledVector(lat0, Math.cos(lean));
    const lateral = lat.clone().multiplyScalar(accel.dot(lat));
    const above = Math.hypot(accel.dot(up), accel.dot(lat));
    const upright = fwd.clone().multiplyScalar(accel.dot(fwd)).addScaledVector(up, above);

    arrows.accel.point(o, accel, L);
    arrows.upright.point(o, upright, L);
    arrows.lateral.point(o, lateral, L * lateral.length());
    arrows.fwd.point(o, fwd, 0.55);
    arrows.up.point(o, up, 0.55);
    arrows.lat.point(o, lat, 0.55);

    // Labels just past each tip; accel and its corrected twin on opposite sides.
    const tip = (v: Vector3, len: number, gap: number) => o.clone().addScaledVector(v.clone().normalize(), len + gap);
    tags.accel.position.copy(tip(accel, L, 0.03));
    tags.upright.position.copy(tip(upright, L, 0.03));
    tags.lateral.position.copy(tip(lateral, L * lateral.length(), 0.14));
    tags.lateral.element.style.opacity = String(Math.min(1, lateral.length() * 5));
    tags.fwd.position.copy(tip(fwd, 0.55, 0.1));
    tags.up.position.copy(tip(up, 0.55, 0.1));
    tags.lat.position.copy(tip(lat, 0.55, 0.1));
    const side = upright.x * Math.cos(az) - upright.z * Math.sin(az) >= 0 ? 1 : -1;
    tags.accel.center.set(side > 0 ? 1.08 : -0.08, 0.5);
    tags.upright.center.set(side > 0 ? -0.08 : 1.08, 0.5);

    plumb.position.copy(o);
    plumb.quaternion.setFromUnitVectors(UP, up0);
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = (lean * i) / ARC_STEPS;
      arcPoint.copy(o).addScaledVector(up0, 0.85 * Math.cos(a)).addScaledVector(lat0, 0.85 * Math.sin(a));
      arcPositions.setXYZ(i, arcPoint.x, arcPoint.y, arcPoint.z);
    }
    arcPositions.needsUpdate = true;
    tags.lean.position.copy(o).addScaledVector(up0, 0.98 * Math.cos(lean / 2)).addScaledVector(lat0, 0.98 * Math.sin(lean / 2));

    const el = 0.27;
    const dist = 7.2;
    camera.position.set(target.x + dist * Math.sin(az) * Math.cos(el), target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(target);

    renderer.render(scene, camera);
    labels.render(scene, camera);
    if (!sizes.size) for (const tag of allTags) sizes.set(tag, [tag.element.offsetWidth, tag.element.offsetHeight]);
    keepInside(allTags, sizes, camera, w, h);

    // Write the readout only when what it shows changes.
    show(readout.naive, `${(Math.atan2(accel.dot(fwd), accel.dot(up)) * DEG).toFixed(1)}°`);
    show(readout.fixed, `${(Math.atan2(accel.dot(fwd), above) * DEG).toFixed(1)}°`);
    show(readout.lean, `${Math.abs(lean * DEG).toFixed(0)}°`);
  };
  const allTags = [...Object.values(tags), thetaLabel];
  const sizes = new Map<CSS2DObject, readonly [number, number]>();
  const show = (el: Element | null, text: string) => {
    if (el && el.textContent !== text) el.textContent = text;
  };

  // Run only while on screen and the tab is visible.
  let raf = 0;
  let onScreen = false;
  const t0 = performance.now();
  const frame = (now: number) => {
    draw((now - t0) / 1000);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (onScreen && !document.hidden && !raf) raf = requestAnimationFrame(frame);
  };
  const halt = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) run();
    else halt();
  });
  io.observe(host);
  const onVisibility = () => (document.hidden ? halt() : run());
  document.addEventListener('visibilitychange', onVisibility);

  draw(1.5); // first frame at once, mid-lean, so the swap from the still is seamless
  host.classList.add('is-3d');

  return () => {
    halt();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    host.classList.remove('is-3d');
    scene.traverse((obj) => {
      const m = obj as Mesh;
      m.geometry?.dispose();
      const material = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      (Array.isArray(material) ? material : material ? [material] : []).forEach((x) => x.dispose());
    });
    renderer.dispose();
    renderer.domElement.remove();
    labels.domElement.remove();
  };
}

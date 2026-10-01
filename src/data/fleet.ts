// The Minimal fleet architecture figure (components/FleetFigure.astro): build,
// cloud, TCU and ECUs, with releases going out to the vehicles and data coming
// back. It is drawn twice: wide, in four columns (1200 x 512), and tall, the
// same parts stacked for narrow screens (360 x 656). Coordinates are in each
// layout's viewBox; the parts, wires and paths share ids across both.

export type Pt = readonly [number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Icons on a 36 x 36 box, drawn in the figure's line. `fill` parts are solid.
export const ICONS: Record<string, { line: string; fill?: string }> = {
  actions: {
    line: 'M8 13v10M13 28h8M13 8h8q6 0 6 6v7 M3 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M3 28a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M24 21h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z',
    fill: 'M6.5 5.8l4 2.2-4 2.2z',
  },
  artifact: { line: 'M18 3l14 7v16l-14 7-14-7V10z M4 10l14 7 14-7M18 17v16 M12 22l-3 3 3 3M24 22l3 3-3 3' },
  jobs: { line: 'M7 3h16a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z M9 11l2 2 4-4M9 19l2 2 4-4M18 12h4M18 20h4 M23 27h11m-4-4l4 4-4 4' },
  balena: { line: 'M18 3l14 7-14 7-14-7z M4 16l14 7 14-7M4 22l14 7 14-7' },
  core: { line: 'M10 28a7 7 0 0 1 0-14 9 9 0 0 1 17 2 6 6 0 0 1-1 12z M14 22a5 5 0 0 1 8 0M11 19a9 9 0 0 1 14 0', fill: 'M16.8 25a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0' },
  s3: { line: 'M5 8a13 4.5 0 1 0 26 0a13 4.5 0 1 0-26 0 M5 8l3.5 22q9.5 5 19 0L31 8 M8 17q10 4 20 0' },
  chip: { line: 'M11 8h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z M13 8V3M18 8V3M23 8V3M13 33v-5M18 33v-5M23 33v-5M8 13H3M8 18H3M8 23H3M33 13h-5M33 18h-5M33 23h-5' },
};

export const CHECKS = ['build', 'MISRA C', 'unit tests', 'sign'];

export const CLOUD = [
  { id: 'artifact', icon: 'artifact', title: 'CodeArtifact', sub: 'firmware packages' },
  { id: 'jobs', icon: 'jobs', title: 'IoT Jobs', sub: 'fleet rollouts' },
  { id: 'balena', icon: 'balena', title: 'balenaCloud', sub: 'TCU software' },
  { id: 'core', icon: 'core', title: 'IoT Core', sub: 'vehicle data' },
  { id: 's3', icon: 's3', title: 'S3', sub: 'logs' },
] as const;

export const OTA_LINES = ['reads the manifest', 'verifies each image', 'flashes in order'];

export const ECUS = [
  { id: 'ecu1', name: 'ECU 1', from: '1.3', to: '1.4' },
  { id: 'ecu2', name: 'ECU 2', from: '2.0', to: '2.1' },
] as const;

export type EcuId = (typeof ECUS)[number]['id'];

// A drawn wire. Arrows mark which way a lane runs; CAN links have none.
export interface Wire {
  id: string;
  pts: Pt[];
  arrow?: 'end' | 'both';
  label?: string;
  // Where the label is centred.
  at?: Pt;
}

export interface Layout {
  width: number;
  height: number;
  // Column headings (wide only).
  headings: { x: number; text: string }[];
  boxes: Record<string, Box>;
  // Cloud tiles: icon beside the name, or above it.
  tiles: 'row' | 'stack';
  // An ECU's flash map: offsets from the top of its box and heights.
  bars: { top: number; boot: number; app: number; dl: number; gap: number };
  wires: Wire[];
  bus: { pts: Pt[]; taps: Pt[]; label: Pt; vertical: boolean };
  // Where the TCU's name goes (tall only; wide has it as a heading).
  tcuLabel?: Pt;
  // The routes packets take; most are a wire, the CAN ones cross the bus.
  paths: Record<string, Pt[]>;
}

export type LayoutName = 'wide' | 'tall';

const lane = (id: string, a: Pt, b: Pt, label: string, at: Pt, arrow: Wire['arrow'] = 'end'): Wire => ({ id, pts: [a, b], arrow, label, at });

export const LAYOUTS: Record<LayoutName, Layout> = {
  wide: {
    width: 1200,
    height: 512,
    headings: [
      { x: 16, text: 'Build' },
      { x: 266, text: 'Cloud' },
      { x: 556, text: 'TCU · Raspberry Pi · balenaOS' },
      { x: 946, text: 'ECUs' },
    ],
    boxes: {
      ci: { x: 16, y: 60, w: 180, h: 270 },
      artifact: { x: 266, y: 78, w: 210, h: 64 },
      jobs: { x: 266, y: 168, w: 210, h: 64 },
      balena: { x: 266, y: 258, w: 210, h: 64 },
      core: { x: 266, y: 348, w: 210, h: 64 },
      s3: { x: 266, y: 438, w: 210, h: 64 },
      tcu: { x: 556, y: 60, w: 310, h: 446 },
      ota: { x: 572, y: 78, w: 198, h: 154 },
      os: { x: 572, y: 258, w: 198, h: 64 },
      other: { x: 572, y: 348, w: 198, h: 140 },
      can: { x: 786, y: 78, w: 64, h: 410 },
      ecu1: { x: 946, y: 75, w: 238, h: 184 },
      ecu2: { x: 946, y: 301, w: 238, h: 184 },
    },
    tiles: 'row',
    bars: { top: 58, boot: 26, app: 40, dl: 36, gap: 6 },
    wires: [
      lane('ci-artifact', [196, 110], [266, 110], 'images', [231, 126]),
      lane('ci-jobs', [196, 200], [266, 200], 'manifest', [231, 216]),
      lane('ci-balena', [196, 290], [266, 290], 'containers', [231, 306]),
      lane('artifact-ota', [476, 110], [572, 110], 'images', [516, 126]),
      lane('jobs-ota', [476, 200], [572, 200], 'job', [516, 216]),
      lane('balena-os', [476, 290], [572, 290], 'updates', [516, 306], 'both'),
      lane('other-core', [572, 380], [476, 380], 'telemetry', [516, 396]),
      lane('other-s3', [572, 470], [476, 470], 'logs', [516, 486]),
      { id: 'ota-can', pts: [[770, 167], [786, 167]] },
      { id: 'can-bus-1', pts: [[850, 167], [900, 167]] },
      { id: 'bus-ecu1', pts: [[900, 167], [946, 167]] },
      { id: 'can-other', pts: [[786, 393], [770, 393]] },
      { id: 'can-bus-2', pts: [[850, 393], [900, 393]] },
      { id: 'bus-ecu2', pts: [[900, 393], [946, 393]] },
    ],
    bus: { pts: [[900, 120], [900, 440]], taps: [[900, 167], [900, 393]], label: [890, 280], vertical: true },
    paths: {
      'ci-artifact': [[196, 110], [266, 110]],
      'ci-jobs': [[196, 200], [266, 200]],
      'ci-balena': [[196, 290], [266, 290]],
      'artifact-ota': [[476, 110], [572, 110]],
      'jobs-ota': [[476, 200], [572, 200]],
      'balena-os': [[476, 290], [572, 290]],
      'other-core': [[572, 380], [476, 380]],
      'other-s3': [[572, 470], [476, 470]],
      'ota-ecu1': [[770, 167], [946, 167]],
      'ota-ecu2': [[770, 167], [900, 167], [900, 393], [946, 393]],
      'ecu2-other': [[946, 393], [770, 393]],
    },
  },
  // Top to bottom: build, the five cloud services side by side, the TCU, the
  // bus, the ECUs. Each cloud service keeps its lane straight down to the TCU.
  tall: {
    width: 360,
    height: 656,
    headings: [],
    boxes: {
      ci: { x: 4, y: 4, w: 352, h: 92 },
      artifact: { x: 2, y: 150, w: 68, h: 76 },
      jobs: { x: 74, y: 150, w: 68, h: 76 },
      balena: { x: 146, y: 150, w: 68, h: 76 },
      core: { x: 218, y: 150, w: 68, h: 76 },
      s3: { x: 290, y: 150, w: 68, h: 76 },
      tcu: { x: 2, y: 270, w: 356, h: 170 },
      ota: { x: 14, y: 284, w: 130, h: 84 },
      os: { x: 148, y: 284, w: 64, h: 84 },
      other: { x: 216, y: 284, w: 130, h: 84 },
      can: { x: 14, y: 400, w: 332, h: 28 },
      ecu1: { x: 2, y: 500, w: 174, h: 154 },
      ecu2: { x: 184, y: 500, w: 174, h: 154 },
    },
    tiles: 'stack',
    bars: { top: 56, boot: 22, app: 30, dl: 28, gap: 5 },
    wires: [
      lane('ci-artifact', [36, 96], [36, 150], 'images', [36, 123]),
      lane('ci-jobs', [108, 96], [108, 150], 'manifest', [108, 123]),
      lane('ci-balena', [180, 96], [180, 150], 'containers', [180, 123]),
      lane('artifact-ota', [36, 226], [36, 284], 'images', [36, 250]),
      lane('jobs-ota', [108, 226], [108, 284], 'job', [108, 250]),
      lane('balena-os', [180, 226], [180, 284], 'updates', [180, 250], 'both'),
      lane('other-core', [252, 284], [252, 226], 'telemetry', [252, 250]),
      lane('other-s3', [324, 284], [324, 226], 'logs', [324, 250]),
      { id: 'ota-can', pts: [[90, 368], [90, 400]] },
      { id: 'can-bus-1', pts: [[90, 428], [90, 470]] },
      { id: 'bus-ecu1', pts: [[90, 470], [90, 500]] },
      { id: 'can-other', pts: [[270, 400], [270, 368]] },
      { id: 'can-bus-2', pts: [[270, 428], [270, 470]] },
      { id: 'bus-ecu2', pts: [[270, 470], [270, 500]] },
    ],
    bus: { pts: [[24, 470], [336, 470]], taps: [[90, 470], [270, 470]], label: [180, 462], vertical: false },
    tcuLabel: [180, 389],
    paths: {
      'ci-artifact': [[36, 96], [36, 150]],
      'ci-jobs': [[108, 96], [108, 150]],
      'ci-balena': [[180, 96], [180, 150]],
      'artifact-ota': [[36, 226], [36, 284]],
      'jobs-ota': [[108, 226], [108, 284]],
      'balena-os': [[180, 226], [180, 284]],
      'other-core': [[252, 284], [252, 226]],
      'other-s3': [[324, 284], [324, 226]],
      'ota-ecu1': [[90, 368], [90, 500]],
      'ota-ecu2': [[90, 368], [90, 470], [270, 470], [270, 500]],
      'ecu2-other': [[270, 500], [270, 368]],
    },
  },
};

// The wires and parts a path lights while a packet is on it; a lane lights itself.
export const PATH_LIGHTS: Record<string, string[]> = {
  'ota-ecu1': ['ota-can', 'can', 'can-bus-1', 'bus', 'bus-ecu1'],
  'ota-ecu2': ['ota-can', 'can', 'can-bus-1', 'bus', 'bus-ecu2'],
  'ecu2-other': ['bus-ecu2', 'bus', 'can-bus-2', 'can', 'can-other'],
};

export interface Packet {
  path: string;
  label: string;
  // Run the path backwards.
  back?: boolean;
  // Seconds after the step starts.
  delay?: number;
}

export interface Step {
  caption: string;
  // Parts lit for the whole step, beyond the ones its packets light.
  on: string[];
  packets?: Packet[];
  // An ECU's flash: `fill` streams the image into its download slot, `swap`
  // has the bootloader move it into the application.
  flash?: { ecu: EcuId; fill?: boolean; swap?: boolean };
}

export const STEPS: Step[] = [
  { caption: 'Each ECU’s firmware is built, checked against MISRA C, tested and signed in GitHub Actions.', on: ['ci'] },
  {
    caption: 'The signed images go to CodeArtifact, and a release manifest goes out to the fleet as an IoT Job.',
    on: ['ci', 'artifact', 'jobs'],
    packets: [{ path: 'ci-artifact', label: 'images' }, { path: 'ci-jobs', label: 'manifest' }],
  },
  {
    caption: 'Each vehicle’s TCU takes the job, and its OTA service reads the manifest.',
    on: ['jobs', 'ota'],
    packets: [{ path: 'jobs-ota', label: 'job' }],
  },
  {
    caption: 'It downloads the images it needs from CodeArtifact and checks every signature.',
    on: ['artifact', 'ota'],
    packets: [{ path: 'artifact-ota', label: 'image ✓' }],
  },
  {
    caption: 'It streams each image over CAN into the ECU’s download slot.',
    on: ['ota', 'ecu1'],
    packets: [{ path: 'ota-ecu1', label: 'CAN' }],
    flash: { ecu: 'ecu1', fill: true },
  },
  { caption: 'The bootloader checks the image and swaps it in as the application.', on: ['ecu1', 'ecu1-boot'], flash: { ecu: 'ecu1', swap: true } },
  {
    caption: 'Then the next ECU, in the order the manifest gives.',
    on: ['ota', 'ecu2', 'ecu2-boot'],
    packets: [{ path: 'ota-ecu2', label: 'CAN' }],
    flash: { ecu: 'ecu2', fill: true, swap: true },
  },
  {
    caption: 'The job reports success, vehicle by vehicle.',
    on: ['ota', 'jobs'],
    packets: [{ path: 'jobs-ota', label: 'succeeded', back: true }],
  },
  {
    caption: 'Back the other way: the TCU reads the vehicle over CAN and sends telemetry to IoT Core, daily logs to S3.',
    on: ['other', 'core', 's3'],
    packets: [
      { path: 'ecu2-other', label: 'CAN' },
      { path: 'other-core', label: 'telemetry', delay: 1.3 },
      { path: 'other-s3', label: 'logs', delay: 1.5 },
    ],
  },
  {
    caption: 'The TCU’s own software ships as containers through balenaCloud, which also watches every TCU’s health.',
    on: ['ci', 'balena', 'os'],
    packets: [
      { path: 'ci-balena', label: 'containers' },
      { path: 'balena-os', label: 'update', delay: 1.3 },
      { path: 'balena-os', label: 'health', back: true, delay: 2.9 },
    ],
  },
];

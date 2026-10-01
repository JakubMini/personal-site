// The Skarper OTA figure (components/OtaFigure.astro): firmware from CI through
// the platform and the rider's phone to the bike's two slots, and the results
// and rides back. Drawn twice: wide, in four columns (1200 x 530), and tall,
// stacked for narrow screens (360 x 890). Coordinates are in each layout's
// viewBox; parts, wires and paths share ids across both.

import type { Box, Pt } from './fleet';

export type { Box, Pt };

// Icons on a 36 x 36 box, in the fleet figure's line.
export const ICONS: Record<string, { line: string; fill?: string }> = {
  actions: {
    line: 'M8 13v10M13 28h8M13 8h8q6 0 6 6v7 M3 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M3 28a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M24 21h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z',
    fill: 'M6.5 5.8l4 2.2-4 2.2z',
  },
  func: { line: 'M7 5h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z M12 13l-4 5 4 5M24 13l4 5-4 5M20 11l-4 14' },
  storage: { line: 'M6.5 6h23a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 4 12.5v-4A2.5 2.5 0 0 1 6.5 6z M6.5 21h23a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 4 27.5v-4A2.5 2.5 0 0 1 6.5 21z M9 10.5h4M9 25.5h4' },
  db: { line: 'M6 8a12 4.5 0 1 0 24 0a12 4.5 0 1 0-24 0 M6 8v20c0 2.5 5.4 4.5 12 4.5s12-2 12-4.5V8M6 18c0 2.5 5.4 4.5 12 4.5s12-2 12-4.5' },
  auth: { line: 'M10 16h16a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z M12 16v-4a6 6 0 0 1 12 0v4 M18 22v4' },
  dash: { line: 'M6 5h24a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z M3 11h30M8 24l6-6 5 4 8-8 M13 33h10' },
  phone: { line: 'M13.5 2h9a3.5 3.5 0 0 1 3.5 3.5v25a3.5 3.5 0 0 1-3.5 3.5h-9a3.5 3.5 0 0 1-3.5-3.5v-25A3.5 3.5 0 0 1 13.5 2z M16 29h4' },
  chip: { line: 'M11 8h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z M13 8V3M18 8V3M23 8V3M13 33v-5M18 33v-5M23 33v-5M8 13H3M8 18H3M8 23H3M33 13h-5M33 18h-5M33 23h-5' },
};

export const CHECKS = ['build', 'unit tests', 'sign · ECDSA-P256'];

export const PLATFORM = [
  { id: 'import', icon: 'func', title: 'Import', sub: ['checks signature, hash, header'] },
  { id: 'storage', icon: 'storage', title: 'Storage', sub: ['signed firmware images'] },
  { id: 'db', icon: 'db', title: 'Database', sub: ['releases · devices · users', 'rides · update outcomes'], tall: ['releases · devices', 'users · rides', 'update outcomes'] },
  { id: 'auth', icon: 'auth', title: 'Auth', sub: ['riders · staff with MFA'] },
] as const;

export const APP_STEPS = [
  { id: 'check', label: 'update check' },
  { id: 'fetch', label: 'download · SHA-256' },
  { id: 'ble', label: 'Bluetooth transfer' },
  { id: 'report', label: 'confirm · report' },
] as const;

// What the two slots hold before the update; the new image lands in B.
export const SLOTS = { a: '1.4.2', b: '1.4.1', next: '1.5.0' };

export interface Wire {
  id: string;
  pts: Pt[];
  arrow?: 'end' | 'both';
  label?: string;
  at?: Pt;
  // Other ids that light this wire: the tall drawing runs check and results on one.
  also?: string[];
}

export interface Layout {
  width: number;
  height: number;
  headings: { x: number; text: string }[];
  boxes: Record<string, Box>;
  // Where each app step sits, and the bike's flash parts.
  chips: Record<string, Box>;
  flash: { staging: Box; boot: Box; slotA: Box; slotB: Box; labels: { text: string; at: Pt }[] };
  // Platform frame label (tall only).
  frameLabel?: Pt;
  wires: Wire[];
  paths: Record<string, Pt[]>;
}

export type LayoutName = 'wide' | 'tall';

const w = (id: string, pts: Pt[], label?: string, at?: Pt, arrow: Wire['arrow'] = 'end', also?: string[]): Wire => ({ id, pts, arrow, label, at, also });

export const LAYOUTS: Record<LayoutName, Layout> = {
  wide: {
    width: 1200,
    height: 530,
    headings: [
      { x: 16, text: 'Build' },
      { x: 246, text: 'Platform · Supabase' },
      { x: 646, text: 'Rider’s phone' },
      { x: 926, text: 'Bike · STM32WB55' },
    ],
    boxes: {
      ci: { x: 16, y: 60, w: 180, h: 214 },
      frame: { x: 246, y: 48, w: 310, h: 370 },
      import: { x: 262, y: 64, w: 278, h: 60 },
      storage: { x: 262, y: 140, w: 278, h: 60 },
      db: { x: 262, y: 216, w: 278, h: 108 },
      auth: { x: 262, y: 340, w: 278, h: 60 },
      dash: { x: 246, y: 460, w: 310, h: 64 },
      app: { x: 646, y: 60, w: 200, h: 340 },
      bike: { x: 926, y: 60, w: 258, h: 400 },
    },
    chips: {
      check: { x: 662, y: 140, w: 168, h: 44 },
      fetch: { x: 662, y: 198, w: 168, h: 44 },
      ble: { x: 662, y: 256, w: 168, h: 44 },
      report: { x: 662, y: 314, w: 168, h: 44 },
    },
    flash: {
      staging: { x: 942, y: 154, w: 226, h: 34 },
      boot: { x: 942, y: 214, w: 226, h: 34 },
      slotA: { x: 942, y: 286, w: 226, h: 66 },
      slotB: { x: 942, y: 364, w: 226, h: 66 },
      labels: [
        { text: 'external flash', at: [942, 146] },
        { text: 'internal flash', at: [942, 278] },
      ],
    },
    wires: [
      w('ci-import', [[196, 94], [262, 94]], 'signed', [221, 112]),
      w('import-storage', [[290, 124], [290, 140]]),
      w('dash-db', [[401, 460], [401, 418]], 'publish · ramp', [458, 446], 'both'),
      w('storage-app', [[540, 170], [646, 170]], 'image', [601, 188]),
      w('db-app', [[540, 250], [646, 250]], 'update check', [601, 268], 'both'),
      w('app-db', [[646, 318], [540, 318]], 'results', [601, 336]),
      w('app-bike', [[846, 260], [926, 260]], 'Bluetooth', [886, 278], 'both'),
    ],
    paths: {
      'ci-import': [[196, 94], [262, 94]],
      'import-storage': [[290, 124], [290, 140]],
      'dash-db': [[401, 460], [401, 418]],
      'storage-app': [[540, 170], [646, 170]],
      'db-app': [[540, 250], [646, 250]],
      'app-db': [[646, 318], [540, 318]],
      'app-bike': [[846, 260], [926, 260]],
    },
  },
  // Top to bottom: CI and the dashboard side by side, the platform in two
  // columns, the phone, the bike. Check and results share one wire here.
  tall: {
    width: 360,
    height: 900,
    headings: [],
    boxes: {
      ci: { x: 2, y: 2, w: 174, h: 108 },
      dash: { x: 184, y: 2, w: 174, h: 108 },
      frame: { x: 2, y: 150, w: 356, h: 222 },
      import: { x: 14, y: 166, w: 156, h: 56 },
      storage: { x: 14, y: 262, w: 156, h: 56 },
      db: { x: 190, y: 166, w: 156, h: 110 },
      auth: { x: 238, y: 300, w: 108, h: 56 },
      app: { x: 2, y: 430, w: 356, h: 158 },
      bike: { x: 2, y: 630, w: 356, h: 266 },
    },
    chips: {
      check: { x: 14, y: 494, w: 162, h: 36 },
      fetch: { x: 184, y: 494, w: 162, h: 36 },
      ble: { x: 14, y: 538, w: 162, h: 36 },
      report: { x: 184, y: 538, w: 162, h: 36 },
    },
    flash: {
      staging: { x: 14, y: 714, w: 332, h: 30 },
      boot: { x: 14, y: 756, w: 332, h: 30 },
      slotA: { x: 14, y: 816, w: 162, h: 64 },
      slotB: { x: 184, y: 816, w: 162, h: 64 },
      labels: [
        { text: 'external flash', at: [14, 706] },
        { text: 'internal flash', at: [14, 808] },
      ],
    },
    frameLabel: [346, 364],
    wires: [
      w('ci-import', [[60, 110], [60, 166]], 'signed', [60, 138]),
      w('dash-db', [[270, 110], [270, 166]], 'publish · ramp', [270, 138], 'both'),
      w('import-storage', [[60, 222], [60, 262]]),
      w('storage-app', [[60, 318], [60, 430]], 'image', [60, 400]),
      w('db-app', [[214, 276], [214, 430]], 'check · results', [214, 400], 'both', ['app-db']),
      w('app-bike', [[180, 588], [180, 630]], 'Bluetooth', [180, 609], 'both'),
    ],
    paths: {
      'ci-import': [[60, 110], [60, 166]],
      'import-storage': [[60, 222], [60, 262]],
      'dash-db': [[270, 110], [270, 166]],
      'storage-app': [[60, 318], [60, 430]],
      'db-app': [[214, 276], [214, 430]],
      'app-db': [[214, 430], [214, 276]],
      'app-bike': [[180, 588], [180, 630]],
    },
  },
};

export interface Packet {
  path: string;
  label: string;
  back?: boolean;
  delay?: number;
}

export interface Step {
  caption: string;
  on: string[];
  packets?: Packet[];
  // `stage` streams the image into external flash; `swap` has the bootloader
  // copy it into slot B and boot it.
  flash?: 'stage' | 'swap';
}

export const STEPS: Step[] = [
  { caption: 'Firmware is built, unit-tested and signed with ECDSA-P256 in CI.', on: ['ci'] },
  {
    caption: 'The platform checks the signature, hash and header, stores the image and opens a draft release.',
    on: ['ci', 'import', 'storage', 'db'],
    packets: [{ path: 'ci-import', label: 'v1.5.0' }, { path: 'import-storage', label: 'image', delay: 1.3 }],
  },
  {
    caption: 'On the dashboard, the release is published to a channel and ramped across the fleet.',
    on: ['dash', 'db'],
    packets: [{ path: 'dash-db', label: 'publish' }],
  },
  {
    caption: 'The rider’s app asks whether their bike has an update, and gets an offer back.',
    on: ['app', 'check', 'db'],
    packets: [{ path: 'db-app', label: 'check', back: true }, { path: 'db-app', label: 'offer 1.5.0', delay: 1.4 }],
  },
  {
    caption: 'It downloads the image from storage and checks its size, SHA-256 and header.',
    on: ['app', 'fetch', 'storage'],
    packets: [{ path: 'storage-app', label: 'image ✓' }],
  },
  {
    caption: 'With the bike on charge, it streams the image over Bluetooth into the bike’s staging flash.',
    on: ['app', 'ble', 'bike', 'staging'],
    packets: [{ path: 'app-bike', label: '244 B chunks' }],
    flash: 'stage',
  },
  {
    caption: 'After a reset the bootloader copies it into the spare slot; MCUboot checks the signature and boots the newer image.',
    on: ['bike', 'boot', 'slotB'],
    flash: 'swap',
  },
  {
    caption: 'The app reconnects, confirms the version the bike now reports and sends the outcome back.',
    on: ['app', 'report', 'db', 'bike'],
    packets: [{ path: 'app-bike', label: 'v1.5.0 ✓', back: true }, { path: 'app-db', label: 'success', delay: 1.4 }],
  },
  {
    caption: 'Rides come back the same way, and the dashboard shows every bike, its rides and its firmware.',
    on: ['app', 'db', 'dash'],
    packets: [
      { path: 'app-bike', label: 'ride data', back: true },
      { path: 'app-db', label: 'telemetry', delay: 1.3 },
      { path: 'dash-db', label: 'rides', back: true, delay: 2.6 },
    ],
  },
];

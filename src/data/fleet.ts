// The Minimal fleet architecture figure (components/FleetFigure.astro): six
// blocks and one release that runs through them. It is drawn twice: wide, the
// blocks in a row (1200 x 420), and tall, in two columns for narrow screens
// (360 x 576). Coordinates are in each layout's viewBox.

export type Pt = readonly [number, number];

export interface Block {
  id: string;
  title: string;
  sub: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BLOCKS: Block[] = [
  { id: 'ci', title: 'CI/CD', sub: 'build · test · sign' },
  { id: 'manifest', title: 'Manifest', sub: 'pins every version' },
  { id: 'aws', title: 'AWS IoT', sub: 'jobs out · data in' },
  { id: 'tcu', title: 'TCU', sub: 'Raspberry Pi · balenaOS' },
  { id: 'ecu', title: 'ECUs × 6', sub: 'STM32 · VESC' },
  { id: 'balena', title: 'balenaCloud', sub: 'TCU updates · health' },
];

// The two halves of every ECU's flash.
export const SLOT_LABELS = { boot: 'bootloader', app: 'application' };

export interface Layout {
  width: number;
  height: number;
  boxes: Record<string, Box>;
  slots: Record<keyof typeof SLOT_LABELS, Box>;
  edges: Record<string, Pt[]>;
  // Where the CAN label sits beside its link.
  can: { x: number; y: number; anchor: 'start' | 'middle' };
}

export type LayoutName = 'wide' | 'tall';

export const LAYOUTS: Record<LayoutName, Layout> = {
  wide: {
    width: 1200,
    height: 420,
    boxes: {
      ci: { x: 20, y: 100, w: 150, h: 100 },
      manifest: { x: 230, y: 100, w: 150, h: 100 },
      aws: { x: 440, y: 100, w: 150, h: 100 },
      tcu: { x: 650, y: 90, w: 200, h: 120 },
      ecu: { x: 950, y: 70, w: 230, h: 164 },
      balena: { x: 650, y: 300, w: 200, h: 90 },
    },
    slots: {
      boot: { x: 970, y: 106, w: 190, h: 38 },
      app: { x: 970, y: 152, w: 190, h: 38 },
    },
    edges: {
      'ci-manifest': [[170, 150], [230, 150]],
      'manifest-aws': [[380, 150], [440, 150]],
      'aws-tcu': [[590, 140], [650, 140]],
      'tcu-aws': [[650, 162], [590, 162]],
      'tcu-ecu': [[850, 150], [950, 150]],
      'tcu-balena': [[750, 210], [750, 300]],
    },
    can: { x: 900, y: 136, anchor: 'middle' },
  },
  // The release comes down the right column to the vehicle; the two clouds
  // sit side by side above the TCU, and the ECUs under it.
  tall: {
    width: 360,
    height: 576,
    boxes: {
      ci: { x: 10, y: 10, w: 140, h: 84 },
      manifest: { x: 210, y: 10, w: 140, h: 84 },
      balena: { x: 10, y: 154, w: 140, h: 84 },
      aws: { x: 210, y: 154, w: 140, h: 84 },
      tcu: { x: 10, y: 298, w: 340, h: 96 },
      ecu: { x: 10, y: 454, w: 340, h: 112 },
    },
    slots: {
      boot: { x: 30, y: 490, w: 145, h: 36 },
      app: { x: 185, y: 490, w: 145, h: 36 },
    },
    edges: {
      'ci-manifest': [[150, 52], [210, 52]],
      'manifest-aws': [[280, 94], [280, 154]],
      'aws-tcu': [[266, 238], [266, 298]],
      'tcu-aws': [[294, 298], [294, 238]],
      'tcu-ecu': [[180, 394], [180, 454]],
      'tcu-balena': [[80, 298], [80, 238]],
    },
    can: { x: 192, y: 428, anchor: 'start' },
  },
};

export interface Step {
  caption: string;
  edge?: string;
  packet?: string;
  // A second packet at the same time, for the report back.
  also?: { edge: string; packet: string };
  on: string[];
  slot?: 'boot' | 'app';
}

export const STEPS: Step[] = [
  { caption: 'Each ECU’s firmware is built, checked against MISRA C, tested and signed in CI.', on: ['ci'] },
  { caption: 'A release manifest pins every board’s version.', edge: 'ci-manifest', packet: 'v1.4.0', on: ['ci', 'manifest'] },
  { caption: 'It goes out to the fleet as an AWS IoT Job.', edge: 'manifest-aws', packet: 'job', on: ['manifest', 'aws'] },
  { caption: 'Each vehicle’s TCU takes the job, downloads the signed images and verifies them.', edge: 'aws-tcu', packet: 'images', on: ['aws', 'tcu'] },
  { caption: 'It streams each image over CAN to the ECU’s bootloader.', edge: 'tcu-ecu', packet: 'CAN', on: ['tcu', 'ecu'], slot: 'boot' },
  { caption: 'The bootloader checks the image and swaps the new application in.', on: ['ecu'], slot: 'app' },
  {
    caption: 'The TCU reports back: telemetry to AWS, health to balenaCloud, which also updates the TCU itself.',
    edge: 'tcu-aws', packet: 'telemetry', also: { edge: 'tcu-balena', packet: 'health' }, on: ['tcu', 'aws', 'balena'],
  },
];

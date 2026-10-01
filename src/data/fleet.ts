// The Minimal fleet architecture figure (components/FleetFigure.astro): six
// blocks in a row and one release that runs through them. Coordinates are in
// the SVG's 1200 x 420 viewBox.

export type Pt = readonly [number, number];

export interface Block {
  id: string;
  title: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BLOCKS: Block[] = [
  { id: 'ci', title: 'CI/CD', sub: 'build · test · sign', x: 20, y: 100, w: 150, h: 100 },
  { id: 'manifest', title: 'Manifest', sub: 'pins every version', x: 230, y: 100, w: 150, h: 100 },
  { id: 'aws', title: 'AWS IoT', sub: 'jobs out · data in', x: 440, y: 100, w: 150, h: 100 },
  { id: 'tcu', title: 'TCU', sub: 'Raspberry Pi · balenaOS', x: 650, y: 90, w: 200, h: 120 },
  { id: 'ecu', title: 'ECUs × 6', sub: 'STM32 · VESC', x: 950, y: 70, w: 230, h: 164 },
  { id: 'balena', title: 'balenaCloud', sub: 'TCU updates · health', x: 650, y: 300, w: 200, h: 90 },
];

// The two halves of every ECU's flash.
export const SLOTS = {
  boot: { x: 970, y: 106, w: 190, h: 38, label: 'bootloader' },
  app: { x: 970, y: 152, w: 190, h: 38, label: 'application' },
};

export const EDGES: Record<string, Pt[]> = {
  'ci-manifest': [[170, 150], [230, 150]],
  'manifest-aws': [[380, 150], [440, 150]],
  'aws-tcu': [[590, 140], [650, 140]],
  'tcu-aws': [[650, 162], [590, 162]],
  'tcu-ecu': [[850, 150], [950, 150]],
  'tcu-balena': [[750, 210], [750, 300]],
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

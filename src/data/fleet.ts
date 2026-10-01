// The Minimal fleet architecture figure (components/FleetFigure.astro):
// what is drawn, what each part does, and the flows that run across it.
// Coordinates are in the SVG's 1200 x 600 viewBox. Drawn from the repos;
// no CAN IDs, addresses, account names, variants or partners.

export type Pt = readonly [number, number];

export interface Part {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'node' | 'chip' | 'ecu';
  detail: string;
  tags: string[];
}

const NODE_W_A = 316;
const NODE_W_B = 324;
const NODE_H = 64;
const CHIP_W = 154;
const CHIP_H = 36;

export const ZONES = [
  { label: 'Build & release', x: 16, y: 44, w: 352, h: 540 },
  { label: 'Cloud', x: 412, y: 44, w: 360, h: 540 },
  { label: 'Vehicle', x: 808, y: 44, w: 376, h: 540 },
];

// The TCU's outline, holding its service chips.
export const TCU_BOX = { x: 826, y: 64, w: 340, h: 288, label: 'TCU · Raspberry Pi 4 · balenaOS' };
export const BUS = { x1: 826, x2: 1166, y: 396, gap: 8, label: 'CAN · two buses · shared DBC' };

const ecuX = (i: number) => 842 + i * 53.4;

export const PARTS: Part[] = [
  // Build & release
  { id: 'repos', label: 'Board repos', sub: 'one per ECU · semver tags', x: 34, y: 64, w: NODE_W_A, h: NODE_H, kind: 'node',
    detail: 'Each ECU’s firmware lives in its own repository, versioned on its own, with the application and the bootloader tagged separately.',
    tags: ['C', 'STM32', 'CMake'] },
  { id: 'ci', label: 'GitHub Actions', sub: 'Docker builds · MISRA · tests', x: 34, y: 160, w: NODE_W_A, h: NODE_H, kind: 'node',
    detail: 'Shared actions build the STM32 and VESC firmware in Docker, enforce formatting and MISRA C through cppcheck, run GoogleTest and scan for leaked secrets.',
    tags: ['GitHub Actions', 'Docker', 'cppcheck', 'GoogleTest'] },
  { id: 'artifact', label: 'AWS CodeArtifact', sub: 'signed, versioned firmware', x: 34, y: 256, w: NODE_W_A, h: NODE_H, kind: 'node',
    detail: 'Every build is published as a versioned package: the CRC-stamped hex with its Ed25519 signature. Vehicles download from here directly.',
    tags: ['CodeArtifact', 'Ed25519', 'semver'] },
  { id: 'manifest', label: 'Release manifest', sub: 'pinned versions · upgrade order', x: 34, y: 352, w: NODE_W_A, h: NODE_H, kind: 'node',
    detail: 'One repository pins every board to a tagged version as a submodule. CI turns it into an ordered upgrade manifest, release notes and an IoT Job template, per vehicle variant.',
    tags: ['Git submodules', 'Python', 'IoT Jobs'] },
  { id: 'tcurepo', label: 'TCU stack', sub: 'balena multicontainer project', x: 34, y: 488, w: NODE_W_A, h: NODE_H, kind: 'node',
    detail: 'The TCU’s services as one balena project, each service its own repository with pytest, and the whole stack runnable in an emulator on virtual CAN.',
    tags: ['Docker', 'balena', 'pytest', 'vcan'] },

  // Cloud
  { id: 'iot', label: 'AWS IoT Core', sub: 'MQTT over TLS · per-vehicle certs', x: 430, y: 64, w: NODE_W_B, h: NODE_H, kind: 'node',
    detail: 'Each vehicle connects with its own certificate. Telemetry and events arrive as Protobuf; short-lived S3 credentials come from the IoT credential provider.',
    tags: ['MQTT', 'TLS', 'Protobuf'] },
  { id: 'jobs', label: 'AWS IoT Jobs', sub: 'firmware and config jobs', x: 430, y: 160, w: NODE_W_B, h: NODE_H, kind: 'node',
    detail: 'Releases and configuration reach vehicles as IoT Jobs, with pre-signed S3 URLs, and every vehicle reports its own job status back.',
    tags: ['IoT Jobs', 'pre-signed URLs'] },
  { id: 's3', label: 'Amazon S3', sub: 'manifests · configs · logs', x: 430, y: 352, w: NODE_W_B, h: NODE_H, kind: 'node',
    detail: 'Holds the published manifests and config documents, published by CI through OIDC with no stored keys, and receives each vehicle’s daily logs.',
    tags: ['S3', 'OIDC'] },
  { id: 'balena', label: 'balenaCloud', sub: 'TCU releases · fleet health', x: 430, y: 488, w: NODE_W_B, h: NODE_H, kind: 'node',
    detail: 'Builds the TCU’s containers, rolls releases out as deltas, and shows every device’s health, logs and container state.',
    tags: ['balenaOS', 'balenaCloud'] },

  // TCU services
  { id: 'gateway', label: 'Gateway', x: 842, y: 100, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Bridges the TCU’s local MQTT bus to AWS IoT Core, applies config jobs and has services hot-reload, and uploads logs, preferring Wi-Fi.',
    tags: ['Python', 'AWS IoT SDK', 'paho-mqtt'] },
  { id: 'ota', label: 'OTA service', x: 842, y: 144, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Turns a job into a CAN update: checks the on-device manifest, skips boards already current, fetches and verifies each signed image, puts the vehicle into OTA state and flashes the ECUs in order.',
    tags: ['Python', 'CAN', 'Ed25519'] },
  { id: 'canif', label: 'CAN interface', x: 842, y: 188, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Decodes both CAN buses with the shared DBC definitions and publishes the signals on the local bus.',
    tags: ['SocketCAN', 'cantools', 'DBC'] },
  { id: 'incident', label: 'Incident monitor', x: 842, y: 232, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Scores events from the IMU and CAN streams, and reads fault codes from the ECUs over UDS.',
    tags: ['UDS', 'ISO-TP'] },
  { id: 'vsm', label: 'Vehicle state', x: 1004, y: 100, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'The vehicle state machine, and the range estimate.', tags: ['Python'] },
  { id: 'modem', label: 'Modem · GNSS', x: 1004, y: 144, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Cellular connection and position, through ModemManager over D-Bus.', tags: ['ModemManager', 'D-Bus', 'NMEA'] },
  { id: 'imu', label: 'IMU', x: 1004, y: 188, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Sampled over I2C, for incidents and orientation.', tags: ['I2C'] },
  { id: 'ble', label: 'BLE · TPMS', x: 1004, y: 232, w: CHIP_W, h: CHIP_H, kind: 'chip',
    detail: 'Reads the tyre-pressure sensors over BLE.', tags: ['BlueZ', 'BLE'] },
  { id: 'mqtt', label: 'Mosquitto · local MQTT bus', x: 842, y: 280, w: 316, h: 28, kind: 'chip',
    detail: 'Every service publishes and subscribes on one local broker, so each can be developed, tested and restarted on its own.',
    tags: ['MQTT', 'Mosquitto'] },
  { id: 'supervisor', label: 'balena supervisor', x: 842, y: 316, w: 208, h: 26, kind: 'chip',
    detail: 'Applies TCU releases on the device: pulls the deltas and restarts only the containers that changed.',
    tags: ['balenaOS'] },
  { id: 'canport', label: 'can0 · can1', x: 1058, y: 316, w: 100, h: 26, kind: 'chip',
    detail: 'Both CAN buses, through SocketCAN.', tags: ['SocketCAN'] },

  // ECUs on the bus
  ...(
    [
      ['bcu', 'BCU', 'Body control: lights, switched loads and vehicle IO, on STM32 with high-side switch drivers.', ['STM32F4', 'SPI', 'XCP']],
      ['avas', 'AVAS', 'The pedestrian warning sound, streamed over I2S from external flash.', ['STM32F4', 'I2S']],
      ['immo', 'IMMO', 'The immobiliser, unlocked with an NFC card.', ['STM32G0', 'NFC']],
      ['dcdc', 'DC-DC', 'The 48 V to 12 V converter and the 12 V battery.', ['STM32L4']],
      ['motor', 'MOTOR', 'Two motor controllers on VESC: field-oriented control, regenerative braking and hill hold.', ['VESC', 'ChibiOS', 'FOC']],
      ['hmi', 'HMI', 'The rider display, scripted in LispBM.', ['LispBM']],
    ] as const
  ).map(([id, label, what, tags], i): Part => ({
    id, label, x: ecuX(i), y: 440, w: 48, h: 96, kind: 'ecu',
    detail: `${what} Its own bootloader keeps a running and a download slot: an image arrives over CAN into the download slot and is checked before it is swapped in.`,
    tags: [...tags],
  })),
];

export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<string, Part>;

// Connections, as polylines. A flow step can run one either way.
export const EDGES: Record<string, Pt[]> = {
  'repos-ci': [[192, 128], [192, 160]],
  'ci-artifact': [[192, 224], [192, 256]],
  'artifact-manifest': [[192, 320], [192, 352]],
  'manifest-s3': [[350, 384], [430, 384]],
  'manifest-jobs': [[350, 372], [392, 372], [392, 192], [430, 192]],
  'jobs-gateway': [[754, 192], [796, 192], [796, 118], [842, 118]],
  'iot-gateway': [[754, 96], [804, 96], [804, 108], [842, 108]],
  's3-gateway': [[754, 384], [788, 384], [788, 128], [842, 128]],
  'artifact-ota': [[350, 288], [812, 288], [812, 162], [842, 162]],
  'gateway-ota': [[919, 136], [919, 144]],
  'tcurepo-balena': [[350, 520], [430, 520]],
  'balena-supervisor': [[754, 520], [800, 520], [800, 329], [842, 329]],
  'canport-bus': [[1108, 342], [1108, 396]],
  ...Object.fromEntries(['bcu', 'avas', 'immo', 'dcdc', 'motor', 'hmi'].map((id, i) => [`bus-${id}`, [[ecuX(i) + 24, 404], [ecuX(i) + 24, 440]] as Pt[]])),
};

export interface Step {
  caption: string;
  // The packet's path: edge ids, each with a direction (1 as listed, -1 reversed).
  path: [string, 1 | -1][];
  packet?: string;
  // Parts to light up while the step runs.
  on: string[];
  // ECU slot to show filling: the download slot, then the swap into run.
  slot?: 'download' | 'swap';
}

export interface Flow {
  id: string;
  title: string;
  steps: Step[];
}

export const FLOWS: Flow[] = [
  {
    id: 'firmware',
    title: 'Ship firmware',
    steps: [
      { caption: 'A board is tagged. CI builds it in Docker, checks MISRA C and runs the tests.', path: [['repos-ci', 1]], packet: 'v1.4.0', on: ['repos', 'ci'] },
      { caption: 'The signed image is published to CodeArtifact as a versioned package.', path: [['ci-artifact', 1]], packet: 'signed .hex', on: ['ci', 'artifact'] },
      { caption: 'The release manifest pins every board’s version and sets the order they update in.', path: [['artifact-manifest', 1]], packet: 'pin', on: ['artifact', 'manifest'] },
      { caption: 'CI publishes the manifest to S3 and an IoT Job template, through OIDC: no AWS keys stored in GitHub.', path: [['manifest-jobs', 1]], packet: 'job template', on: ['manifest', 'jobs', 's3'] },
      { caption: 'The job reaches each vehicle’s TCU over MQTT and TLS.', path: [['jobs-gateway', 1]], packet: 'job', on: ['jobs', 'gateway'] },
      { caption: 'The gateway hands the desired versions to the OTA service on the local bus.', path: [['gateway-ota', 1]], packet: 'versions', on: ['gateway', 'ota', 'mqtt'] },
      { caption: 'The OTA service skips boards already current, downloads the rest from CodeArtifact and verifies each Ed25519 signature.', path: [['artifact-ota', 1]], packet: 'image', on: ['artifact', 'ota'] },
      { caption: 'It asks the vehicle for OTA state, then streams the image over CAN into the ECU’s download slot.', path: [['canport-bus', 1], ['bus-bcu', 1]], packet: 'CAN', on: ['ota', 'canport', 'bcu'], slot: 'download' },
      { caption: 'The bootloader checks the image and swaps it in. The TCU updates its manifest and reports the job done.', path: [['jobs-gateway', -1]], packet: 'succeeded', on: ['bcu', 'gateway', 'jobs'], slot: 'swap' },
    ],
  },
  {
    id: 'tcu',
    title: 'Update the TCU',
    steps: [
      { caption: 'One push builds every TCU service container in balenaCloud.', path: [['tcurepo-balena', 1]], packet: 'push', on: ['tcurepo', 'balena'] },
      { caption: 'Vehicles download only what changed, over Wi-Fi or cellular.', path: [['balena-supervisor', 1]], packet: 'delta', on: ['balena', 'supervisor'] },
      { caption: 'The supervisor restarts the containers that changed. The rest keep running.', path: [], on: ['supervisor', 'gateway', 'ota', 'canif', 'incident', 'vsm', 'modem', 'imu', 'ble'] },
      { caption: 'Health, logs and container state flow back to the fleet dashboard.', path: [['balena-supervisor', -1]], packet: 'health', on: ['supervisor', 'balena'] },
    ],
  },
  {
    id: 'config',
    title: 'Change config',
    steps: [
      { caption: 'At start-up the gateway reports the version of every config it holds.', path: [['jobs-gateway', -1]], packet: 'versions', on: ['gateway', 'jobs'] },
      { caption: 'Anything stale comes back as an IoT Job with a pre-signed S3 URL.', path: [['jobs-gateway', 1]], packet: 'job + URL', on: ['jobs', 'gateway'] },
      { caption: 'The gateway downloads the new vehicle, fleet, security or cloud config.', path: [['s3-gateway', 1]], packet: 'config', on: ['s3', 'gateway'] },
      { caption: 'Then it broadcasts a reconfigure, and the services hot-reload without a restart.', path: [], on: ['gateway', 'mqtt', 'ota', 'canif', 'incident', 'vsm', 'modem', 'imu', 'ble'] },
    ],
  },
  {
    id: 'watch',
    title: 'Watch the fleet',
    steps: [
      { caption: 'The CAN interface decodes both buses with the shared DBC and publishes the signals on the local bus.', path: [['bus-motor', -1], ['canport-bus', -1]], packet: 'frames', on: ['motor', 'canport', 'canif', 'mqtt'] },
      { caption: 'The incident monitor scores events from IMU and CAN data, and reads fault codes over UDS.', path: [['canport-bus', 1], ['bus-bcu', 1]], packet: 'UDS', on: ['incident', 'imu', 'canport', 'bcu'] },
      { caption: 'The gateway sends telemetry and events to AWS IoT Core, encoded as Protobuf.', path: [['iot-gateway', -1]], packet: 'telemetry', on: ['gateway', 'iot'] },
      { caption: 'Daily logs go to S3 with short-lived credentials, over Wi-Fi when it can.', path: [['s3-gateway', -1]], packet: 'logs', on: ['gateway', 's3'] },
      { caption: 'balenaCloud shows the health of every TCU in the fleet.', path: [['balena-supervisor', -1]], packet: 'health', on: ['supervisor', 'balena'] },
    ],
  },
];

export const OVERVIEW = {
  title: 'Fleet architecture',
  detail: 'Select any part to see what it does, or pick a flow above to follow it through the system.',
};

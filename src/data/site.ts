// Everything the page says lives here; the markup only lays it out.
// Placeholders still to fill are listed under "Before it goes live" in README.md.

import type { ImageMetadata } from 'astro';
import portrait from '../assets/photos/portrait.jpg';
import propellerRigPoster from '../assets/photos/propeller-rig-poster.jpg';
import propellerRig from '../assets/video/propeller-rig.mp4';

export interface Photo {
  // import photo from '../assets/photos/drive-system.jpg' and set it here;
  // left undefined, the slot renders as a grey placeholder with the caption.
  src?: ImageMetadata;
  // A short silent loop, played like a GIF while on screen. `src` is its
  // poster: what shows before it plays, under reduced motion and without JS.
  video?: string;
  square?: boolean;
  alt: string;
  caption: string;
}

// Code is shown as text, highlighted at build time, never as a screenshot.
// Without `code` the slot renders blank, with faint line numbers.
export interface Snippet {
  caption: string;
  // A Shiki language id: 'c', 'cpp', 'python', 'sql', 'ts', 'yaml', ...
  lang?: string;
  code?: string;
  // The problem the code solves, in a sentence or two, shown above it.
  note?: string;
}

export const person = {
  name: 'Jakub Szypicyn',
  email: 'jakub.m.szypicyn@gmail.com',
  linkedin: 'https://linkedin.com/in/szypicynjakub',
  // A path under public/, e.g. '/jakub-szypicyn-cv.pdf'. null hides every CV link.
  cv: null as string | null,
  location: 'London',
};

export const hero = {
  pitch:
    "Engineering for electric mobility and energy storage — from the motor controller's first boot to the app in your pocket.",
  now: 'Head of Connected Systems, Skarper',
  previously: 'Minimal, Breathe Battery Technologies, Skarper, WeCorp Industries',
  education: 'PhD, Imperial College London',
};

export const about = {
  draft: true,
  lead: "I like products that move. For seven years I've taken e-bikes, battery labs and electric cargo vehicles from first boot to fleets in the field.",
  body: [
    'I design the boards, write the firmware, and build the pipelines that keep machines updated long after they leave the factory.',
    'Before industry, a PhD at Imperial on reconfigurable analogue circuits. Away from the desk: cycling and touring, Formula 1, photography.',
  ],
  portrait: { src: portrait, alt: 'Jakub Szypicyn, smiling, in a white shirt and striped tie', caption: 'Portrait' } as Photo,
};

export type Machine = 'drone' | 'ebike' | 'battery' | 'cargo' | 'connected-ebike';

export interface Chapter {
  label: string;
  year: string;
  machine: Machine;
  // Where the drawing sits when nothing moves (reduced motion), as a left offset.
  at: string;
  // The way the drawing faces, so it never drives backwards. 1 = rightwards.
  heading: 1 | -1;
  dates: string;
  where: string;
  role: string;
  summary: string;
  tags: string[];
  photo: Photo;
  snippet?: Snippet;
}

export const journey: Chapter[] = [
  {
    label: 'Drones',
    year: '2020',
    machine: 'drone',
    at: '28%',
    heading: 1,
    dates: '2020',
    where: 'WeCorp Industries, London',
    role: 'EEE Research Technical Lead',
    summary:
      'Built an STM32 drone-propeller test rig with C++ firmware and a Python DAQ GUI, and a field-oriented motor controller that cut power losses by 5%.',
    tags: ['STM32', 'C++', 'FOC', 'Python DAQ'],
    photo: {
      src: propellerRigPoster,
      video: propellerRig,
      square: true,
      alt: 'A drone motor spinning a propeller on the test rig',
      caption: 'Propeller test rig',
    },
  },
  {
    label: 'E-bikes',
    year: '2021',
    machine: 'ebike',
    at: '56%',
    heading: 1,
    dates: '2021 – 2024',
    where: 'Skarper, London',
    role: 'Senior Electronics Engineer',
    summary:
      'Second hire. Architected the 48V drive system — motor controller, VCU, UI and BMS — and wrote the first firmware for every board. Bring-up to mass production: 2,000+ units shipped, PCB BOM cost cut by more than half.',
    tags: ['48V drives', 'BMS', 'EN 15194', 'MISRA C', 'Production test'],
    photo: { alt: 'E-bike drive system', caption: 'Drive system' },
    snippet: { caption: '[Code snippet]' },
  },
  {
    label: 'Batteries',
    year: '2024',
    machine: 'battery',
    at: '18%',
    heading: 1,
    dates: '2024 – 2025',
    where: 'Breathe Battery Technologies, London',
    role: 'Embedded Firmware & Data Engineer',
    summary:
      'An Ethernet/TFTP bootloader for zero-touch updates across STM32 lab assets, CI/CD and Python services automating battery lab testing, and a Simscape pack model for BMS validation.',
    tags: ['Bootloaders', 'GitLab CI', 'Azure', 'gRPC', 'Simscape'],
    photo: { alt: 'Battery test lab', caption: 'Battery lab' },
    snippet: { caption: '[Code snippet]' },
  },
  {
    label: 'Four-wheel cargo',
    year: '2025',
    machine: 'cargo',
    at: '50%',
    heading: -1,
    dates: '2025 – 2026',
    where: 'Minimal, London',
    role: 'Senior Embedded Firmware & Data Engineer',
    summary:
      'A CAN bootloader and fleet OTA for 30+ connected vehicles. Firmware builds went from half a day to under ten minutes, releases from monthly to weekly.',
    tags: ['CAN', 'Fleet OTA', 'BalenaOS', 'MISRA C', 'EN ISO 13849-1'],
    photo: { alt: 'Electric cargo vehicle fleet', caption: 'Cargo fleet' },
    snippet: { caption: '[Code snippet]' },
  },
  {
    label: 'Back on e-bikes',
    year: '2026',
    machine: 'connected-ebike',
    at: '24%',
    heading: 1,
    dates: '2026 – Now',
    where: 'Skarper, London',
    role: 'Head of Connected Systems',
    summary:
      'Rejoined to lead embedded engineering: secure OTA with MCUboot and signed A/B images, a connected product platform from firmware to app, product cybersecurity and the EU Battery Passport.',
    tags: ['MCUboot', 'BLE GATT', 'Supabase', 'Expo', 'EU Battery Passport', 'AI agents'],
    photo: { alt: 'Connected e-bike', caption: 'Today' },
    snippet: { caption: '[Code snippet]' },
  },
];

// Only what Jakub's own commits or CV show; colleagues' repos are not claimed.
// Top of the list is closest to the user, the bottom closest to the silicon.
export const stack = [
  {
    n: '08',
    layer: 'AI',
    items:
      'Claude Code, agent and skill design, MCP servers, the Anthropic API, AI review on pull requests',
  },
  {
    n: '07',
    layer: 'App & cloud',
    items:
      'Supabase (PostgreSQL, row-level security, Auth with MFA, Deno edge functions), React Native and Expo / EAS, React and Vite, MapLibre, AWS IoT Core, IoT Jobs, S3 and CodeArtifact, Azure, Cloudflare, FastAPI',
  },
  {
    n: '06',
    layer: 'Edge & data',
    items:
      'Raspberry Pi gateways in Python, MQTT, cellular and GNSS over ModemManager, balenaOS fleets, Protobuf, gRPC, pandas, NumPy, Plotly, Streamlit, Simscape',
  },
  {
    n: '05',
    layer: 'OTA & release',
    items:
      'MCUboot with signed A/B images and rollback, Ed25519-signed CAN flashing, CAN and TFTP bootloaders, BLE firmware update, fleet manifests to AWS IoT Jobs, GitHub Actions, GitLab CI',
  },
  {
    n: '04',
    layer: 'Firmware',
    items:
      'C and C++, STM32 (F4, G0, L4, WB55), Nordic nRF52, FreeRTOS, ChibiOS, bare metal, VESC and LispBM, FOC, PID and Kalman estimation, CMake, PlatformIO',
  },
  {
    n: '03',
    layer: 'Test & quality',
    items:
      'GoogleTest, Ceedling with Unity and CMock, pytest, pgTAP, Jest, Renode and Robot Framework emulation, cppcheck and PC-lint Plus, gcov',
  },
  {
    n: '02',
    layer: 'Interfaces',
    items:
      'CAN and CAN FD, DBC tooling, UDS over ISO-TP, XCP, SocketCAN, BLE GATT as peripheral and central, NFC (ISO 14443A), SPI, I2C, I2S, UART, Ethernet',
  },
  {
    n: '01',
    layer: 'Hardware',
    items:
      'PCB design and bring-up, 48V motor drives, BMS, DC-DC conversion, IMUs and encoders, production test and flashing rigs',
  },
  {
    n: 'Compliance',
    layer: 'Standards',
    items:
      'EN 15194, EN ISO 13849-1, EN 17860, MISRA C:2012 and 2023, IEC 60730 Class B, EU Cyber Resilience Act, UK PSTI, EU Battery Passport, product cybersecurity',
  },
];

// How AI is part of the engineering, stated without naming internals.
export const ai = {
  title: 'AI in the loop.',
  lead: 'AI agents are part of how I engineer: each with one job and only the tools that job needs, arguing over the decisions that are expensive to undo, and never trusted with the last word.',
  practices: [
    {
      n: '01',
      title: 'Agents with roles',
      detail:
        'Architect, reviewer, database, research and red-team agents, each fenced to its own tools. The ones that review cannot write what they judge.',
    },
    {
      n: '02',
      title: 'Adversarial review',
      detail:
        'Schema, keys, wire formats and the boot path get two agents in parallel, one making the case and one trying to break it. The decision is recorded with what would change it.',
    },
    {
      n: '03',
      title: 'Release gates',
      detail:
        'AI review on every pull request, and nothing reaches production until an independent red-team pass has tried to break it. Confirmed findings block the release.',
    },
    {
      n: '04',
      title: 'Skills and context',
      detail:
        'Agent instructions and skills written into firmware and platform repos; Claude skills that turn test-rig telemetry into range reports and flag tickets that no longer tell the truth; Jira and Confluence over MCP, and an MCP server I wrote for Basecamp.',
    },
    {
      n: '05',
      title: 'Models in software',
      detail:
        'A briefing agent on the Anthropic API: deterministic rules first, the model only returns strict JSON with no tools, and the prompt is hardened against injection.',
    },
  ],
  snippet: { caption: '[Code snippet]' } as Snippet,
};

export const education = [
  {
    degree: 'PhD',
    field: 'Circuits & Systems',
    where: 'Imperial College London, 2017 – 2021',
    detail:
      'Thesis on memristor-enabled reconfigurable analogue systems. Graduate Teaching Assistant in EE labs, amplifier design and FPGA.',
  },
  {
    degree: 'MEng',
    field: 'Electronic Engineering, First Class',
    where: 'Imperial College London, 2013 – 2017',
    detail:
      "85%, top 10% of cohort. Dean's List and the Nicholas Battersby Prize for analogue electronics.",
  },
];

// A null title renders as "[Paper title]"; a null href renders the row without a link.
export const publications: { venue: string; title: string | null; href: string | null }[] = [
  {
    venue: 'Patent, 2022',
    title: 'US11421527B2, co-inventor',
    href: 'https://patents.google.com/patent/US11421527B2',
  },
  { venue: 'IEEE MEMRISYS', title: null, href: null },
  { venue: 'IEEE CAS', title: null, href: null },
  { venue: 'IEEE', title: null, href: null },
];

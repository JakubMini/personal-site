// Everything the page says lives here; the markup only lays it out.
// Placeholders still to fill are listed under "Before it goes live" in README.md.

import type { ImageMetadata } from 'astro';

export interface Photo {
  // import photo from '../assets/photos/drive-system.jpg' and set it here;
  // left undefined, the slot renders as a grey placeholder with the caption.
  src?: ImageMetadata;
  alt: string;
  caption: string;
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
  portrait: { alt: 'Jakub Szypicyn', caption: 'Portrait' } as Photo,
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
    photo: { alt: 'Drone-propeller test rig', caption: 'Propeller test rig' },
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
      'Rejoined to lead engineering: secure OTA with MCUboot and signed A/B images, a connected product platform from firmware to app, product cybersecurity and the EU Battery Passport.',
    tags: ['MCUboot', 'BLE GATT', 'Supabase', 'Expo', 'EU Battery Passport'],
    photo: { alt: 'Connected e-bike', caption: 'Today' },
  },
];

export const stack = [
  {
    n: '05',
    layer: 'App & cloud',
    items: 'Supabase, PostgreSQL, Cloudflare, Expo / EAS, AWS, Azure, FastAPI',
  },
  {
    n: '04',
    layer: 'OTA & release',
    items:
      'MCUboot, signed A/B images with rollback, CAN and TFTP bootloaders, GitHub Actions, GitLab CI',
  },
  {
    n: '03',
    layer: 'Firmware',
    items: 'C, C++, STM32, Nordic nRF52, FreeRTOS, ChibiOS, bare metal',
  },
  {
    n: '02',
    layer: 'Interfaces',
    items: 'CAN, BLE with custom GATT profiles, SPI, I2C, Ethernet, MQTT',
  },
  {
    n: '01',
    layer: 'Hardware',
    items: 'PCB design and bring-up, 48V motor drives, FOC, BMS, production test',
  },
  {
    n: 'Compliance',
    layer: 'Standards',
    items:
      'EN 15194, EN ISO 13849-1, EN 17860, MISRA C:2023, EU Battery Passport, product cybersecurity',
  },
];

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

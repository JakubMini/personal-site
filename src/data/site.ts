// Everything the page says lives here; the markup only lays it out.
// Placeholders still to fill are listed under "Before it goes live" in README.md.

import type { ImageMetadata } from 'astro';
import portrait from '../assets/photos/portrait.jpg';
import propellerRigPoster from '../assets/photos/propeller-rig-poster.jpg';
import propellerRig from '../assets/video/propeller-rig.mp4';
import driveUnit from '../assets/photos/skarper-drive-unit.jpg';
import batteryCyclers from '../assets/photos/battery-cyclers.webp';

export interface Photo {
  // import photo from '../assets/photos/drive-system.jpg' and set it here;
  // left undefined, the slot renders as a grey placeholder with the caption.
  src?: ImageMetadata;
  // A short silent loop, played like a GIF while on screen. `src` is its
  // poster: what shows before it plays, under reduced motion and without JS.
  video?: string;
  square?: boolean;
  // Show the whole image at its own shape instead of cropping it to the slot:
  // for wide photos, and product shots whose background is the page colour.
  whole?: boolean;
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
  // `backticks` set identifiers from the code in code type.
  note?: string;
  // The note's heading; 'The problem' unless set.
  noteLabel?: string;
  // An animated figure: 'lean' beside the note (components/LeanFigure.astro);
  // 'tftp' and 'fleet' full width under it (TftpFigure.astro, FleetFigure.astro).
  figure?: 'lean' | 'tftp' | 'fleet';
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

// The startup animation (components/Intro.astro). The log runs one line after
// another while the record is cut and spins up; the label is lettered round
// the top, round the bottom, and with the monogram above the spindle hole.
export const intro = {
  log: ['power on', 'cutting grooves', 'needle down'],
  label: { top: person.name, bottom: 'Side A  ·  33⅓ rpm', monogram: 'JS' },
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
      'Built an STM32 drone-propeller test rig with C++ firmware and a Python DAQ GUI, and a field-oriented motor controller that cut power losses by 5%. Designed the mechatronic prototypes, harnesses and sensor instrumentation around it, and was made research technical lead within the year.',
    tags: ['STM32', 'C++', 'FOC', 'Python DAQ', 'Mechatronics'],
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
      'Second hire, leading a team of three from concept to mass production: 2,000+ units shipped. Architected the 48V drive system (motor controller, VCU, UI and BMS) and wrote the first firmware for every board, from bare-metal bring-up to a FreeRTOS system controller with BLE, CAN to the BMS and EN 15194 assist limits. Cut the production PCB BOM by more than half, built the production test jigs (~95% functional coverage) and owned release sign-off through launch.',
    tags: ['48V drives', 'FreeRTOS', 'BLE', 'CAN', 'EN 15194', 'MISRA C', 'Production test'],
    photo: {
      src: driveUnit,
      whole: true,
      alt: 'The Skarper drive unit: a grey body with a round disc carrying a lens, status lights and a button',
      caption: 'Skarper drive unit',
    },
    snippet: {
      caption: 'Lean-compensated road gradient (C)',
      note: 'Assistance follows the road gradient, read from an IMU in the Skarper unit. The accelerometer only sees gravity and the bike’s speed changes, and when the bike leans into a corner part of the gravity reading moves onto the sensor’s `lat` axis. The `up` share shrinks, so a naive estimate reads every climb steeper than it is. `roadGradient` measures the `lean`, rolls the reading back into the bike’s plane with `rodrigues(fwd, -lean)`, and returns the slope alone. All that while compensating for speed and vibration artefacts.',
      figure: 'lean',
      lang: 'c',
      code: `// Rotation by angle a about unit axis k: R = cos(a) I + sin(a) [k]x + (1 - cos(a)) k k^T
static mat3_t rodrigues(const vec3_t k, const float32_t a)
{
    assert_param(fabsf(vec3_dot(k, k) - 1.0f) < 1e-3f);  // axis must be a unit vector
    assert_param(isfinite(a));

    const float32_t c = cosf(a), s = sinf(a), t = 1.0f - c;
    return (mat3_t){ .m = {
        { c + t * k.x * k.x,       t * k.x * k.y - s * k.z, t * k.x * k.z + s * k.y },
        { t * k.y * k.x + s * k.z, c + t * k.y * k.y,       t * k.y * k.z - s * k.x },
        { t * k.z * k.x - s * k.y, t * k.z * k.y + s * k.x, c + t * k.z * k.z       },
    } };
}

// Road gradient (rad) from an accelerometer sample (g) and wheel acceleration (m/s^2)
float32_t roadGradient(const vec3_t accel, const float32_t wheelAccel)
{
    // A NaN would poison every filter downstream; out-of-range values are clamped below
    assert_param(isfinite(accel.x) && isfinite(accel.y) && isfinite(accel.z));
    assert_param(isfinite(wheelAccel));
    assert_param(fabsf(Mount.pitch) < (float32_t) M_PI_4);  // calibration sanity

    // The IMU is mounted pitched, so the bike's forward and up axes are not the sensor's
    const float32_t cp = cosf(Mount.pitch), sp = sinf(Mount.pitch);
    const vec3_t fwd = {  cp, sp, 0.0f };
    const vec3_t up  = { -sp, cp, 0.0f };

    // Leaning in a corner reads as slope: measure the lean, roll gravity back upright
    const float32_t lean = atan2f(accel.z, vec3_dot(accel, up));
    const vec3_t    g    = mat3_mul_vec3(rodrigues(fwd, -lean), accel);

    // Remove the bike's own acceleration and clamp what no road can produce
    const float32_t along = constrainf32(vec3_dot(g, fwd) - wheelAccel / G_MPS2, -3.0f, 3.0f);
    const float32_t above = constrainf32(vec3_dot(g, up), 0.0f, 2.0f);

    return atan2f(along, above);
}`,
    },
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
      'Designed an Ethernet/TFTP bootloader for zero-touch updates across the lab’s STM32 assets. Built the GitLab CI/CD and Python microservices that automate battery testing, co-designed the SQL schema and REST layer behind them, and took gRPC services into production on Azure. Modelled a battery pack in Simscape to validate BMS control in the battery-in-the-loop harness.',
    tags: ['Bootloaders', 'GitLab CI', 'Python', 'SQL', 'gRPC', 'Azure', 'Simscape'],
    photo: {
      src: batteryCyclers,
      whole: true,
      alt: 'An aisle of battery cyclers and test cabinets in the battery lab, with orange cabling overhead',
      caption: 'The battery cycler fleet',
    },
    snippet: {
      caption: 'Ethernet bootloader, one update end to end. Addresses and sizes are illustrative.',
      noteLabel: 'How it works',
      note: 'Zero-touch updates for the battery lab’s STM32 controllers: no programmer cable, no visit to the rig. An AT command over UART asks the running application to hand over to the bootloader, which brings Ethernet up, takes an address over DHCP and accepts the image from any standard TFTP client on `UDP :69`. Every 512-byte block is programmed, read back and checked against its `CRC32`. Built on ST’s lwIP in-application-programming example, extended with the AT interface, boot flags shared with the application, and per-block verification.',
      figure: 'tftp',
    },
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
      'Firmware and fleet software for an electric cargo vehicle: STM32 body-control, sound, immobiliser and DC-DC ECUs, VESC motor-control work, and a Raspberry Pi telematics stack on balenaOS. Built the CAN bootloader and signed over-the-air updates for 30+ connected vehicles, plus the CI that took builds from half a day to under ten minutes and releases from monthly to weekly. Refactored the core ECUs to MISRA C with GoogleTest, cutting static-analysis findings by 90%, and mentored two engineers.',
    tags: ['STM32', 'CAN', 'Fleet OTA', 'balenaOS', 'MISRA C', 'EN ISO 13849-1'],
    photo: { alt: 'Electric cargo vehicle fleet', caption: 'Cargo fleet' },
    snippet: {
      caption: 'A release out to the fleet, and the data back.',
      noteLabel: 'The architecture',
      note: 'The ECUs, each with its own bootloader and application, share CAN with a Raspberry Pi TCU on balenaOS. A release is built and signed in CI, pinned in a manifest and sent out as an `AWS IoT Job`; the TCU flashes the ECUs over CAN, and telemetry and logs come back to AWS.',
      figure: 'fleet',
    },
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
      'Rejoined to lead embedded engineering and the connected product. Building one platform for manufacturing, users, the app and servicing on Supabase, Cloudflare and Expo, with secure OTA (MCUboot, signed A/B images, BLE flashing), product cybersecurity and the EU Battery Passport. Also running the electronics cost-down and a new BLE handlebar controller, with AI agents built into how the team engineers.',
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
    link: {
      label: 'Read the thesis',
      href: 'https://spiral.imperial.ac.uk/entities/publication/a6fcdfcd-2b67-4008-8dc3-40a7eb30e746',
    },
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
  {
    venue: 'PhD thesis, 2021',
    title: 'Memristor enabled reconfigurable analogue systems',
    href: 'https://spiral.imperial.ac.uk/entities/publication/a6fcdfcd-2b67-4008-8dc3-40a7eb30e746',
  },
  {
    venue: 'IEEE ICEIC, 2020',
    title: 'Memristor-enabled reconfigurable integrated circuits',
    href: 'https://spiral.imperial.ac.uk/entities/publication/12b492f5-dc43-497a-aed7-2d24a2bce300',
  },
  { venue: 'IEEE MEMRISYS', title: null, href: null },
  { venue: 'IEEE CAS', title: null, href: null },
];

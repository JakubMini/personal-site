// The Skarper fleet dashboard as a click-through (components/DashDemo.astro): real
// screens from a local copy of the platform loaded with demo data, and where to click
// on each. Coordinates are CSS pixels on a 1440px-wide page; each screen is as tall
// as its page, and scrolls inside the window when taller than 900.

import type { ImageMetadata } from 'astro';
import overview from '../assets/dashboard/overview.webp';
import bikes from '../assets/dashboard/bikes.webp';
import bike from '../assets/dashboard/bike.webp';
import bikeFirmware from '../assets/dashboard/bike-firmware.webp';
import rideLive from '../assets/dashboard/ride-live.webp';
import ride from '../assets/dashboard/ride.webp';
import rides from '../assets/dashboard/rides.webp';
import firmware from '../assets/dashboard/firmware.webp';
import people from '../assets/dashboard/people.webp';

export const WIDTH = 1440;
export const VIEW = 900;

export interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  // The screen it opens.
  to: string;
  label: string;
}

export interface Screen {
  id: string;
  // Shown in the window's address bar.
  path: string;
  caption: string;
  image: ImageMetadata;
  height: number;
  spots: Spot[];
}

const spot = (x: number, y: number, w: number, h: number, to: string, label: string): Spot => ({ x, y, w, h, to, label });

export const SCREENS: Screen[] = [
  {
    id: 'overview',
    path: '/overview',
    caption: 'Overview: who is riding now, the last day’s rides, and anything that needs a look.',
    image: overview,
    height: 900,
    spots: [
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(549, 77, 279, 111, 'rides', 'All rides'),
      spot(983, 218, 68, 20, 'rides', 'All rides'),
      spot(257, 276, 810, 46, 'ride-live', 'The ride in progress'),
      spot(1291, 269, 104, 31, 'ride-live', 'Watch live'),
    ],
  },
  {
    id: 'bikes',
    path: '/units',
    caption: 'Bikes: every bike with its rider, battery, firmware and odometer.',
    image: bikes,
    height: 1063,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(257, 167, 1154, 57, 'bike', 'DEMO-2026-C00101'),
      spot(1291, 180, 104, 31, 'ride-live', 'Watch live'),
    ],
  },
  {
    id: 'bike',
    path: '/units/DEMO-2026-C00101',
    caption: 'One bike: its rides, who holds it, its build record and its firmware.',
    image: bike,
    height: 900,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(256, 14, 31, 19, 'bikes', 'Bikes'),
      spot(752, 269, 180, 44, 'bike-firmware', 'Firmware & updates tab'),
      spot(257, 401, 1154, 46, 'ride-live', 'The ride in progress'),
      spot(257, 490, 1154, 46, 'ride', 'The ride with a fault'),
    ],
  },
  {
    id: 'bike-firmware',
    path: '/units/DEMO-2026-C00101/firmware',
    caption: 'A bike’s firmware: what it runs, what it is offered, and every update it has taken.',
    image: bikeFirmware,
    height: 900,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(256, 14, 31, 19, 'bikes', 'Bikes'),
      spot(256, 269, 117, 44, 'bike', 'Rides tab'),
      spot(1089, 413, 306, 20, 'firmware', 'Open in Firmware'),
    ],
  },
  {
    id: 'ride-live',
    path: '/units/DEMO-2026-C00101/rides/live',
    caption: 'A ride in progress, streamed from the rider’s app at 1 Hz.',
    image: rideLive,
    height: 1380,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(256, 14, 31, 19, 'bikes', 'Bikes'),
      spot(310, 14, 114, 19, 'bike', 'DEMO-2026-C00101'),
    ],
  },
  {
    id: 'ride',
    path: '/units/DEMO-2026-C00101/rides/29-sept',
    caption: 'A finished ride: route, summary, a fault on the timeline, and the telemetry behind it.',
    image: ride,
    height: 1450,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(256, 14, 31, 19, 'bikes', 'Bikes'),
      spot(310, 14, 114, 19, 'bike', 'DEMO-2026-C00101'),
    ],
  },
  {
    id: 'rides',
    path: '/rides',
    caption: 'Every ride across the fleet.',
    image: rides,
    height: 1852,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
      spot(257, 119, 1154, 54, 'ride-live', 'The ride in progress'),
      spot(1291, 131, 104, 31, 'ride-live', 'Watch live'),
      spot(257, 683, 1154, 46, 'ride', 'The ride with a fault'),
    ],
  },
  {
    id: 'firmware',
    path: '/firmware',
    caption: 'Releases: drafts imported from CI, published to a channel and ramped across the fleet.',
    image: firmware,
    height: 900,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 339, 203, 34, 'people', 'Users & access'),
    ],
  },
  {
    id: 'people',
    path: '/people',
    caption: 'Riders and staff. Staff roles need a second factor.',
    image: people,
    height: 1226,
    spots: [
      spot(12, 90, 203, 34, 'overview', 'Overview'),
      spot(12, 125, 203, 34, 'bikes', 'Bikes'),
      spot(12, 159, 203, 34, 'rides', 'Rides'),
      spot(12, 232, 203, 34, 'firmware', 'Firmware'),
    ],
  },
];

// Where the click-through starts.
export const START = 'overview';

// Under the window: who sees what, and how riders' data is kept.
export const NOTE =
  'Staff see the fleet through scopes (telemetry viewer, support, manufacturing, super admin) enforced in the database itself: a rider’s name and location stay masked unless the scope needs them, location is recorded only with the rider’s consent, admin changes need a second factor, and deleting an account erases the rider’s data. Every person and bike shown here is made up.';

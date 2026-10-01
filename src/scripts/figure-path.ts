// Shared by the fleet and OTA figures: where a packet is along its route.

export type Pt = readonly [number, number];

// A point `k` of the way along a polyline.
export function along(pts: readonly Pt[], k: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(left / lens[i], 1) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    left -= lens[i];
  }
  return pts[pts.length - 1];
}

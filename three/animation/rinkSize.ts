/** The regulation ice surface: 60 × 30 m with 8.5 m corner radii, centred on the origin, long axis along X. */
export const RINK = { length: 60, width: 30, radius: 8.5 };

/** True when (x, z) lies on the ice at least `margin` metres inside the boards, the rounded corners included. */
export function insideRink(x: number, z: number, margin = 0): boolean {
  const hx = RINK.length / 2 - margin;
  const hz = RINK.width / 2 - margin;
  const ax = Math.abs(x);
  const az = Math.abs(z);
  if (ax > hx || az > hz) return false;
  const r = Math.max(0, RINK.radius - margin);
  const cx = hx - r;
  const cz = hz - r;
  if (ax <= cx || az <= cz) return true;
  return Math.hypot(ax - cx, az - cz) <= r;
}

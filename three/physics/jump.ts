/**
 * Physics of a figure-skating jump, kept pure so the timeline builders can shape root
 * motion from it and the tests can check it directly. No three.js, no animation types.
 *
 * Units are metres, seconds and radians. Yaw grows counter-clockwise seen from above,
 * the way most skaters rotate.
 */

export const G = 9.81;

/* ---------- ballistics ---------- */

/**
 * Time in the air by nominal rotation count, calibrated on what elite skaters show.
 * The take-off velocity is solved from these targets so a quad always flies 0.72 s.
 */
export const AIR_TIME: Record<number, number> = { 1: 0.42, 2: 0.52, 3: 0.63, 4: 0.72, 5: 0.8 };

export function airTimeFor(rotations: number, axel: boolean): number {
  // the Axel's extra half revolution needs a touch more hang time
  return (AIR_TIME[rotations] ?? 0.7) + (axel ? 0.03 : 0);
}

/** Vertical take-off velocity that keeps the skater airborne for T seconds. */
export const verticalVelocityForAirTime = (T: number): number => (G * T) / 2;
/** Vertical take-off velocity whose flight peaks at the given height. */
export const verticalVelocityForHeight = (h: number): number => Math.sqrt(2 * G * h);

export interface Flight {
  /** Time in the air. */
  T: number;
  /** Vertical take-off velocity; the skater meets the ice at the same speed downward. */
  vy: number;
  vx: number;
  /** Peak height of the root above the ice. */
  apex: number;
  /** Horizontal distance covered in the air. */
  range: number;
  /** Height t seconds after take-off: 0 at take-off and at landing. */
  y: (t: number) => number;
  x: (t: number) => number;
}

/** Projectile motion under gravity alone, which is all that acts once the blade leaves the ice. */
export function flight(vy: number, vx: number): Flight {
  const T = (2 * vy) / G;
  return {
    T,
    vy,
    vx,
    apex: (vy * vy) / (2 * G),
    range: vx * T,
    y: (t) => vy * t - (G * t * t) / 2,
    x: (t) => vx * t,
  };
}

/* ---------- angular momentum ---------- */

/**
 * Moment of inertia about the vertical axis with arms and free leg out, as at take-off
 * (kg m², typical of a skater). It only scales L; the rotation rates do not depend on it.
 */
export const I_OPEN = 1.6;
/** Tucked inertia as a fraction of open: pulling in raises the spin rate about 2.5×, which keeps quads near 5.5 rev/s as in the biomechanics literature. */
export const TUCK_RATIO = 0.4;

export interface InertiaSchedule {
  /** Seconds after take-off by which the tuck is closed. */
  tuckIn: number;
  /** Seconds after take-off when the body starts opening for the landing. */
  openOut: number;
}

/**
 * When the body closes and opens, shared with the pose keys so the inertia follows what
 * the viewer sees: a quick tuck, then opening in the last fifth (at most 0.1 s).
 */
export function inertiaSchedule(T: number): InertiaSchedule {
  return { tuckIn: Math.min(0.14, T * 0.25), openOut: T - Math.min(0.1, T * 0.2) };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** Moment of inertia t seconds after take-off (kg m²), easing between open and tucked. */
export function inertiaAt(t: number, T: number, s: InertiaSchedule): number {
  let tucked: number;
  if (t < s.tuckIn) tucked = smooth(t / s.tuckIn);
  else if (t > s.openOut) tucked = 1 - smooth((t - s.openOut) / (T - s.openOut));
  else tucked = 1;
  return I_OPEN * (1 - (1 - TUCK_RATIO) * tucked);
}

export interface RotationProfile {
  T: number;
  turns: number;
  /** Angular momentum (kg m²/s): constant in the air, since nothing there can apply a torque. */
  L: number;
  /** Yaw rate t seconds after take-off, rad/s. */
  omega: (t: number) => number;
  /** Radians turned since take-off; exactly turns × 2π at t = T. */
  angle: (t: number) => number;
  peakOmega: number;
  /** Rate at the instant of leaving the ice, which the pre-rotation has to build up to. */
  omegaTakeoff: number;
  omegaLanding: number;
}

const STEPS = 256;

/**
 * Yaw in the air from conservation of angular momentum, ω(t) = L / I(t). L is solved so
 * the flight turns exactly `turns` revolutions, which lets one model serve fully rotated
 * and under-rotated jumps alike. The angle is the running integral of ω, tabulated once.
 */
export function rotationProfile(turns: number, T: number, schedule: InertiaSchedule = inertiaSchedule(T)): RotationProfile {
  const invI = (t: number) => 1 / inertiaAt(t, T, schedule);
  const cum = new Float64Array(STEPS + 1);
  const h = T / STEPS;
  for (let i = 1; i <= STEPS; i++) cum[i] = cum[i - 1] + (h * (invI((i - 1) * h) + invI(i * h))) / 2;
  const L = (turns * 2 * Math.PI) / cum[STEPS];
  const angle = (t: number) => {
    const p = Math.max(0, Math.min(STEPS, (t / T) * STEPS));
    const i = Math.min(STEPS - 1, Math.floor(p));
    return L * (cum[i] + (cum[i + 1] - cum[i]) * (p - i));
  };
  const omega = (t: number) => L * invI(Math.max(0, Math.min(T, t)));
  return { T, turns, L, omega, angle, peakOmega: L / (I_OPEN * TUCK_RATIO), omegaTakeoff: omega(0), omegaLanding: omega(T) };
}

/* ---------- pre-rotation on the ice ---------- */

/**
 * Angle turned on the ice during the take-off, by fraction x ∈ [0, 1] of the load phase.
 * All of `total` is reached at x = 1 with a final rate of `rateEnd` (radians per unit x),
 * so the on-ice spin runs straight into the air rate with no kink. A power law meets both
 * with a monotonic curve: the faster the jump spins, the later the snap on the ice.
 */
export function preRotationRamp(x: number, total: number, rateEnd: number): number {
  if (total <= 0) return 0;
  // below an exponent of 1 the start would be the fast part, so settle for linear there
  const n = Math.max(1, rateEnd / total);
  return total * Math.pow(clamp01(x), n);
}

/* ---------- edge lean ---------- */

/** Lean of a skater holding a circle of radius R at speed v: the body lines up with the resultant of gravity and the centripetal pull. */
export const edgeLean = (speed: number, radius: number): number => Math.atan((speed * speed) / (G * radius));

/**
 * Roll about the skater's forward axis that tilts the body by `lean` toward a point
 * offset (dx, dz) from the skater, such as the circle centre. With Euler order YXZ and
 * the skater facing (sin yaw, 0, cos yaw), positive roll leans to the skater's right.
 * The projection fades to zero when the skater faces the point, where no roll could help.
 */
export function rollToward(yaw: number, dx: number, dz: number, lean: number): number {
  const len = Math.hypot(dx, dz) || 1;
  return (lean * (-dx * Math.cos(yaw) + dz * Math.sin(yaw))) / len;
}

/* ---------- landing ---------- */

/** Seconds the knees take to absorb the landing. */
export const ABSORB_TIME = 0.25;
/** Metres of root dip per m/s of landing speed. Kept small: the rig has no foot pinning, so most of the absorption is a deeper knee in the landing pose. */
export const DIP_PER_SPEED = 0.004;

/**
 * Extra downward offset of the root t seconds after touchdown: a fast dip proportional
 * to the landing speed, recovering smoothly and back to zero by ABSORB_TIME.
 */
export function landingDip(t: number, vLand: number): number {
  if (t <= 0 || t >= ABSORB_TIME) return 0;
  const u = t / ABSORB_TIME;
  const down = 0.3; // share of the absorption spent going down
  const shape = u < down ? 1 - Math.pow(1 - u / down, 2) : 1 - smooth((u - down) / (1 - down));
  return -DIP_PER_SPEED * Math.abs(vLand) * shape;
}

/** Time constant of the check-out; the upper body settles the rotation over about half a second. */
export const CHECK_TAU = 0.15;

/** Fraction of the check-out done t seconds after touchdown: critically damped, so it starts gently and settles exponentially. */
export function checkOut(t: number, tau = CHECK_TAU): number {
  if (t <= 0) return 0;
  const r = t / tau;
  return 1 - (1 + r) * Math.exp(-r);
}

/**
 * Rotation finished on the ice after an under-rotated landing. The body keeps turning at
 * the landing rate while the blade's grip brakes it exponentially, with the time constant
 * that makes the braked rotation total exactly `missing` radians.
 */
export function landingSkid(t: number, missing: number, omegaLanding: number): number {
  if (t <= 0 || missing <= 0 || omegaLanding <= 0) return 0;
  return missing * (1 - Math.exp((-t * omegaLanding) / missing));
}

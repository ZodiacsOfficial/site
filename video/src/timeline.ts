/**
 * The 450-frame storyboard. Every boundary is a cross-dissolve; nothing
 * cuts. Frame 0 is the fully-composed hero (the thumbnail); frames 444+
 * return to the exact hero composition so 449 → 0 wraps invisibly.
 */
import { Easing, interpolate } from 'remotion';

export const DUR = 450;
export const FPS = 30;

export const T = {
  heroOut: [40, 54] as const,
  natalIn: [40, 54] as const,
  natalOut: [138, 152] as const,
  horoIn: [138, 152] as const,
  horoOut: [228, 242] as const,
  synIn: [228, 242] as const,
  synOut: [318, 332] as const,
  skyIn: [318, 332] as const,
  skyOut: [404, 418] as const,
  endIn: [404, 418] as const,
  endTextOut: [428, 442] as const,
  heroReturn: [428, 444] as const,
  // Wheel travel between the hero spot and the natal spot.
  wheelMove: [40, 58] as const,
  // Aspect web: fades as a group, then redraws chord by chord.
  aspectFade: [44, 56] as const,
  aspectRedraw: { start: 62, stagger: 4.5, dur: 15 },
};

const ease = Easing.bezier(0.32, 0.72, 0, 1); // site --ease
export const easeSoft = Easing.bezier(0.22, 1, 0.36, 1); // site --ease-soft

export const ramp = (
  frame: number,
  [from, to]: readonly [number, number],
  dir: 'in' | 'out' = 'in',
): number => {
  const v = interpolate(frame, [from, to], dir === 'in' ? [0, 1] : [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return v;
};

/** Visibility envelope: fade in over `win.in`, out over `win.out`. */
export const envelope = (
  frame: number,
  win: { in?: readonly [number, number]; out?: readonly [number, number] },
): number => {
  let v = 1;
  if (win.in) v *= ramp(frame, win.in, 'in');
  if (win.out) v *= ramp(frame, win.out, 'out');
  return v;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

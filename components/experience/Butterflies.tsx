"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";

type Point = { x: number; y: number };
type Pose = Point & { tilt: number; scale: number };
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type ButterflyDef = {
  className: string;
  src: string;
  scale: number;
  corner: Corner;
  home: Point;
  start: Point;
  hold: number;
  depart: number;
  roam: number;
  extra: boolean;
};

type Flight = {
  stopped: boolean;
  anim: Animation | null;
  timer: number;
  finishWait: ((ok: boolean) => void) | null;
};

const CORNER_BOX: Record<Corner, { x0: number; y0: number; x1: number; y1: number }> = {
  "top-left": { x0: 0.04, y0: 0.06, x1: 0.3, y1: 0.4 },
  "top-right": { x0: 0.7, y0: 0.06, x1: 0.96, y1: 0.36 },
  "bottom-left": { x0: 0.04, y0: 0.64, x1: 0.34, y1: 0.92 },
  "bottom-right": { x0: 0.66, y0: 0.62, x1: 0.96, y1: 0.92 },
};

function aroundCenter(index: number, count: number): Point {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 0.5 + Math.cos(angle) * 0.05,
    y: 0.5 + Math.sin(angle) * 0.04,
  };
}

const SPECS: Omit<ButterflyDef, "start">[] = [
  { className: "butterfly-one", src: "/gift/butterfly-sparkle-v2.png", scale: 0.92, corner: "top-left", home: { x: 0.08, y: 0.12 }, hold: 1.65, depart: 15.5, roam: 18, extra: false },
  { className: "butterfly-extra-blue", src: "/gift/butterfly-blue.png", scale: 0.82, corner: "top-right", home: { x: 0.92, y: 0.12 }, hold: 1.25, depart: 15, roam: 19, extra: true },
  { className: "butterfly-extra-pink", src: "/gift/butterfly-pink.png", scale: 0.74, corner: "bottom-left", home: { x: 0.1, y: 0.84 }, hold: 1.05, depart: 14.2, roam: 20, extra: true },
  { className: "butterfly-extra-rose", src: "/gift/butterfly-rose.png", scale: 0.78, corner: "bottom-right", home: { x: 0.9, y: 0.82 }, hold: 1.45, depart: 16, roam: 18, extra: true },
  { className: "butterfly-extra-cyan", src: "/gift/butterfly-cyan.png", scale: 0.76, corner: "top-right", home: { x: 0.78, y: 0.2 }, hold: 1.85, depart: 16.5, roam: 17, extra: true },
  { className: "butterfly-extra-lilac", src: "/gift/butterfly-lilac.png", scale: 0.7, corner: "bottom-left", home: { x: 0.22, y: 0.72 }, hold: 2.05, depart: 14.8, roam: 19, extra: true },
  { className: "butterfly-extra-midnight", src: "/gift/butterfly-midnight.png", scale: 0.74, corner: "top-left", home: { x: 0.18, y: 0.22 }, hold: 2.5, depart: 15.2, roam: 18, extra: true },
  { className: "butterfly-extra-sapphire", src: "/gift/butterfly-sapphire.png", scale: 0.72, corner: "bottom-right", home: { x: 0.76, y: 0.68 }, hold: 2.3, depart: 17, roam: 20, extra: true },
  { className: "butterfly-extra-fuchsia", src: "/gift/butterfly-fuchsia.png", scale: 0.68, corner: "top-left", home: { x: 0.11, y: 0.32 }, hold: 0.85, depart: 13.5, roam: 18, extra: true },
];

const FLIGHTS: ButterflyDef[] = SPECS.map((spec, index) => ({
  ...spec,
  start: aroundCenter(index, SPECS.length),
}));

const CRUISE_SPEED = 0.375;
const EASE_MS = 20000; // 2× cruise at the start, back to cruise over 20s

function pace(flightStart: number) {
  const x = clamp((performance.now() - flightStart) / EASE_MS, 0, 1);
  const eased = x * x * (3 - 2 * x);
  return CRUISE_SPEED * (2 - eased);
}

function travelSeconds(seconds: number, flightStart: number) {
  return seconds / pace(flightStart);
}

const SOFT = "cubic-bezier(0.42, 0.05, 0.2, 1)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function poseTransform(pose: Pose) {
  const x = (pose.x - 0.5) * 100;
  const y = (pose.y - 0.5) * 100;
  return `translate3d(${x}vw, ${y}vh, 0) rotate(${pose.tilt}deg) scale(${pose.scale})`;
}

function tiltBetween(from: Point, to: Point) {
  return clamp((to.x - from.x) * 18, -8, 8);
}

function arcMid(start: Point, home: Point): Point {
  const mid = { x: (start.x + home.x) / 2, y: (start.y + home.y) / 2 };
  const dx = home.x - start.x;
  const dy = home.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const bow = 0.07;
  const candidates = [
    { x: mid.x + px * bow, y: mid.y + py * bow },
    { x: mid.x - px * bow, y: mid.y - py * bow },
  ];
  const away = (point: Point) => (point.x - 0.5) ** 2 + (point.y - 0.5) ** 2;
  const chosen = away(candidates[0]) > away(candidates[1]) ? candidates[0] : candidates[1];
  return {
    x: clamp(chosen.x, 0.05, 0.95),
    y: clamp(chosen.y, 0.06, 0.92),
  };
}

function bow(from: Point, to: Point, amount: number): Point {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const side = Math.random() < 0.5 ? 1 : -1;
  return {
    x: clamp(mid.x + (-dy / len) * amount * side, 0.05, 0.95),
    y: clamp(mid.y + (dx / len) * amount * side, 0.07, 0.9),
  };
}

function roamPoint(home: Point, corner: Corner, step: number): Point {
  const box = CORNER_BOX[corner];
  const angle = step * 1.45 + Math.random() * 0.5;
  const radius = 0.045 + Math.random() * 0.04;
  return {
    x: clamp(home.x + Math.cos(angle) * radius * 1.2, box.x0, box.x1),
    y: clamp(home.y + Math.sin(angle) * radius, box.y0, box.y1),
  };
}

function wanderPoint(current: Point): Point {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = {
      x: 0.06 + Math.random() * 0.88,
      y: 0.08 + Math.random() * 0.8,
    };
    if (Math.hypot(next.x - current.x, next.y - current.y) > 0.32) return next;
  }
  return {
    x: current.x < 0.5 ? 0.84 : 0.16,
    y: current.y < 0.5 ? 0.78 : 0.18,
  };
}

function stop(flight: Flight) {
  flight.stopped = true;
  flight.anim?.cancel();
  window.clearTimeout(flight.timer);
  flight.finishWait?.(false);
  flight.finishWait = null;
}

function wait(flight: Flight, ms: number) {
  return new Promise<boolean>((resolve) => {
    flight.finishWait = resolve;
    flight.timer = window.setTimeout(() => {
      flight.finishWait = null;
      resolve(!flight.stopped);
    }, ms);
  });
}

function play(el: HTMLElement, flight: Flight, frames: Keyframe[], duration: number) {
  if (flight.stopped) return Promise.resolve(false);
  flight.anim?.cancel();
  const anim = el.animate(frames, { duration: duration * 1000, fill: "forwards" });
  flight.anim = anim;
  return anim.finished.then(
    () => {
      if (flight.stopped) return false;
      const last = frames[frames.length - 1]?.transform;
      if (typeof last === "string") el.style.transform = last;
      return true;
    },
    () => false,
  );
}

function glide(el: HTMLElement, flight: Flight, poses: Pose[], duration: number, easing = SOFT) {
  const frames: Keyframe[] = poses.map((pose, index) => ({
    transform: poseTransform(pose),
    offset: poses.length === 1 ? 0 : index / (poses.length - 1),
    ...(index < poses.length - 1 ? { easing } : {}),
  }));
  return play(el, flight, frames, duration);
}

function mixPose(from: Pose, to: Pose, t: number): Pose {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    tilt: from.tilt + (to.tilt - from.tilt) * t,
    scale: from.scale + (to.scale - from.scale) * t,
  };
}

function departSamples(start: Pose, mid: Pose, home: Pose) {
  const steps = 4;
  const poses: Pose[] = [];
  for (const [from, to] of [
    [start, mid],
    [mid, home],
  ] as const) {
    for (let i = 0; i < steps; i += 1) poses.push(mixPose(from, to, i / steps));
  }
  poses.push(home);
  return poses;
}

async function followPath(el: HTMLElement, flight: Flight, poses: Pose[], nominalSeconds: number, flightStart: number) {
  let total = 0;
  const lengths: number[] = [];
  for (let index = 1; index < poses.length; index += 1) {
    const length = Math.hypot(poses[index].x - poses[index - 1].x, poses[index].y - poses[index - 1].y);
    lengths.push(length);
    total += length;
  }
  for (let index = 1; index < poses.length; index += 1) {
    const share = total > 0 ? lengths[index - 1] / total : 1 / (poses.length - 1);
    const duration = travelSeconds(nominalSeconds * share, flightStart);
    if (!(await glide(el, flight, [poses[index - 1], poses[index]], duration, "linear"))) return false;
  }
  return true;
}

function useButterflyFlight(ref: RefObject<HTMLSpanElement | null>, spec: ButterflyDef, reduced: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const flightStart = performance.now();
    const flight: Flight = { stopped: false, anim: null, timer: 0, finishWait: null };
    const home: Pose = { ...spec.home, tilt: 0, scale: spec.scale };

    async function run() {
      const start: Pose = { ...spec.start, tilt: 0, scale: spec.scale };
      el!.style.transform = poseTransform(start);
      if (!(await wait(flight, spec.hold * 1000))) return;

      const mid: Pose = {
        ...arcMid(spec.start, spec.home),
        tilt: tiltBetween(spec.start, spec.home),
        scale: spec.scale * 1.04,
      };
      if (!(await followPath(el!, flight, departSamples(start, mid, home), spec.depart, flightStart))) return;

      const movesUntil = performance.now() + Math.max(0, travelSeconds(spec.roam - 2.6, flightStart)) * 1000;
      let current = home;
      let step = 0;
      while (!flight.stopped && performance.now() < movesUntil) {
        const next: Pose = {
          ...roamPoint(spec.home, spec.corner, step),
          tilt: 0,
          scale: spec.scale,
        };
        next.tilt = tiltBetween(current, next);
        next.scale = spec.scale * (0.97 + Math.random() * 0.07);
        step += 1;
        const remaining = (movesUntil - performance.now()) / 1000;
        const minHop = travelSeconds(1.6, flightStart);
        const duration = clamp(travelSeconds(2 + Math.random() * 1.3, flightStart), minHop, Math.max(minHop, remaining));
        if (!(await glide(el!, flight, [current, bowPose(current, next, 0.03), next], duration))) return;
        current = next;
        const spare = movesUntil - performance.now();
        if (spare > travelSeconds(0.7, flightStart) * 1000 && !(await wait(flight, Math.min(travelSeconds(0.9, flightStart) * 1000, spare * 0.45)))) return;
      }
      if (!(await glide(el!, flight, [current, home], travelSeconds(2.4, flightStart)))) return;

      current = home;
      while (!flight.stopped) {
        const point = wanderPoint(current);
        const next: Pose = {
          ...point,
          tilt: tiltBetween(current, point),
          scale: spec.scale * (0.95 + Math.random() * 0.1),
        };
        const duration = clamp(
          Math.hypot(next.x - current.x, next.y - current.y) / (0.05 * pace(flightStart)),
          travelSeconds(6.5, flightStart),
          travelSeconds(15, flightStart),
        );
        if (!(await glide(el!, flight, [current, bowPose(current, next, 0.055), next], duration))) return;
        current = next;
        if (!(await wait(flight, travelSeconds(0.65 + Math.random() * 1.1, flightStart) * 1000))) return;
      }
    }

    void run();
    return () => stop(flight);
  }, [reduced, spec, ref]);
}

function bowPose(from: Pose, to: Pose, amount: number): Pose {
  return {
    ...bow(from, to, amount),
    tilt: tiltBetween(from, to) * 0.65,
    scale: (from.scale + to.scale) / 2,
  };
}

function ButterflySprite({ spec, reduced }: { spec: ButterflyDef; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useButterflyFlight(ref, spec, reduced);
  const resting = reduced
    ? { left: `${spec.home.x * 100}%`, top: `${spec.home.y * 100}%`, transform: `scale(${spec.scale})` }
    : { transform: poseTransform({ ...spec.start, tilt: 0, scale: spec.scale }) };

  return (
    <span ref={ref} className={spec.extra ? `butterfly butterfly-extra ${spec.className}` : `butterfly ${spec.className}`} style={resting}>
      <Image
        src={spec.src}
        alt=""
        fill
        sizes={spec.extra ? "(max-width: 800px) 16vw, 6rem" : "(max-width: 800px) 12vw, 5rem"}
        className="butterfly-art"
      />
      <i className="butterfly-sparkle butterfly-sparkle-one" />
      <i className="butterfly-sparkle butterfly-sparkle-two" />
    </span>
  );
}

export function ButterflyField({ reduced }: { reduced: boolean }) {
  return (
    <div className="butterfly-field" aria-hidden="true">
      {FLIGHTS.map((spec) => (
        <ButterflySprite key={spec.className} spec={spec} reduced={reduced} />
      ))}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { ButterflyField } from "@/components/experience/Butterflies";

const OPENING_VIDEO = "/gift/gift-unwrapping.webm";
const OPENING_POSTER = "/gift/box-closed.png";
const OPENING_FINAL_FRAME = "/gift/gift-unwrapping-final.png";
const OPENING_SWITCH_MS = 4000;
const GIFT_BUTTON_DELAY_MS = 2500;
const CONFETTI = Array.from({ length: 30 }, (_, index) => ({
  left: (index * 37) % 100,
  width: 5 + (index % 4) * 2,
  height: 10 + (index % 5) * 3,
  delay: (index % 8) * 0.08,
  duration: 2.8 + (index % 5) * 0.24,
  drift: ((index % 7) - 3) * 2.4,
  spin: (index % 2 === 0 ? 1 : -1) * (160 + (index % 4) * 55),
  color: ["#c8b8ff", "#f6b5dc", "#b3e4f7", "#fff1b8"][index % 4],
}));
const SPARKLES = [
  { left: 15, top: 25, size: 0.85, delay: 0.2, color: "#fff7d6" },
  { left: 28, top: 46, size: 0.58, delay: 0.9, color: "#f8d5ff" },
  { left: 73, top: 27, size: 0.72, delay: 0.45, color: "#d8f5ff" },
  { left: 87, top: 54, size: 0.52, delay: 1.2, color: "#fff" },
  { left: 19, top: 78, size: 0.6, delay: 1.6, color: "#e6d5ff" },
  { left: 80, top: 78, size: 0.78, delay: 0.7, color: "#ffe0f4" },
];

export function Seal({ waiting }: { waiting: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"closed" | "opening" | "revealed">("closed");
  const [giftButtonReady, setGiftButtonReady] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const [videoError, setVideoError] = useState(false);
  const [candlesLit, setCandlesLit] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const switchTimer = useRef<number | null>(null);
  const openedOnce = useRef(false);
  const opened = phase !== "closed";
  const lit = phase === "revealed";

  useEffect(() => {
    if (phase === "revealed") heading.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealed") return;
    const timer = window.setTimeout(() => setGiftButtonReady(true), reduced ? 0 : GIFT_BUTTON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  useEffect(() => {
    return () => {
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    };
  }, []);

  function finishOpening() {
    if (switchTimer.current !== null) {
      window.clearTimeout(switchTimer.current);
      switchTimer.current = null;
    }
    setPhase("revealed");
  }

  function openBox() {
    if (openedOnce.current) return;
    openedOnce.current = true;
    if (reduced) {
      finishOpening();
      return;
    }
    setPhase("opening");
    const player = video.current;
    if (!player) {
      finishOpening();
      return;
    }
    player.currentTime = 0;
    switchTimer.current = window.setTimeout(finishOpening, OPENING_SWITCH_MS);
    void player.play().catch(() => {
      setVideoError(true);
      finishOpening();
    });
  }

  return (
    <main className={lit ? "house unveil is-open" : "house unveil"}>
      {lit ? <BirthdayScene candlesLit={candlesLit} reduced={reduced} onBlow={() => setCandlesLit(false)} /> : null}
      {phase === "revealed" ? <OpeningFx reduced={reduced} /> : null}
      <div className="unveil-layout">
        <div
          className={
            phase === "revealed"
              ? "opening-video-buffer"
              : opened
                ? "present-slot is-settled"
                : "present-slot"
          }
        >
          <button
            type="button"
            className="present-hit"
            onClick={openBox}
            disabled={opened}
            aria-hidden={opened || undefined}
            aria-label="Abre la caja de regalo"
          >
            <GiftFilm
              videoRef={video}
              playing={phase === "opening"}
              showFinal={(reduced || videoError) && phase === "revealed"}
              onEnded={finishOpening}
              onError={() => {
                setVideoError(true);
                finishOpening();
              }}
            />
          </button>
        </div>
        {phase === "revealed" ? (
          <div className="unveil-copy">
            <motion.h1
              ref={heading}
              className="unveil-greeting"
              tabIndex={-1}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.62, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 240, damping: 16, delay: 0.04 }
              }
            >
              <span className="greeting-line greeting-line-lead">¡Feliz cumpleaños,</span>
              <span className="greeting-line greeting-line-name">mi mejor amiga, Kaylita!</span>
            </motion.h1>
          </div>
        ) : null}
      </div>
      {phase === "revealed" && giftButtonReady ? (
        <motion.div
          className="unveil-dock"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduced ? { duration: 0.01 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
          }
        >
          {waiting ? (
            <p className="lede waiting-note">Esto sigue cerrado hasta {waiting}.</p>
          ) : (
            <button type="button" className="open-button" onClick={() => router.push("/opened")}>
              Abre tu regalo
            </button>
          )}
        </motion.div>
      ) : null}
    </main>
  );
}

function OpeningFx({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <>
      <div className="fx fx-back" aria-hidden="true">
        {CONFETTI.map((piece, index) => (
          <i
            key={index}
            className="confetti-bit"
            style={
              {
                left: `${piece.left}%`,
                width: `${piece.width}px`,
                height: `${piece.height}px`,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                "--drift": `${piece.drift}rem`,
                "--spin": `${piece.spin}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="fx fx-front" aria-hidden="true">
        {SPARKLES.map((sparkle, index) => (
          <i
            key={index}
            className="sparkle"
            style={
              {
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                width: `${sparkle.size}rem`,
                height: `${sparkle.size}rem`,
                color: sparkle.color,
                animationDelay: `${sparkle.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

function GiftFilm({
  videoRef,
  playing,
  showFinal,
  onEnded,
  onError,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  playing: boolean;
  showFinal: boolean;
  onEnded: () => void;
  onError: () => void;
}) {
  return (
    <span className={playing ? "gift-frame is-playing" : "gift-frame"}>
      {showFinal ? (
        <Image
          src={OPENING_FINAL_FRAME}
          alt=""
          fill
          sizes="(max-width: 800px) 86vw, 30rem"
          draggable={false}
          priority
          className="gift-final-still"
        />
      ) : (
        <video
          ref={videoRef}
          className="gift-video"
          src={OPENING_VIDEO}
          poster={OPENING_POSTER}
          muted
          playsInline
          preload="auto"
          onEnded={onEnded}
          onError={onError}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

function BirthdayScene({
  candlesLit,
  reduced,
  onBlow,
}: {
  candlesLit: boolean;
  reduced: boolean;
  onBlow: () => void;
}) {
  return (
    <div className={reduced ? "birthday-scene is-reduced" : "birthday-scene"}>
      <div className="cake-stage">
        <button
          type="button"
          className="cake-blow-target"
          onClick={onBlow}
          disabled={!candlesLit}
          aria-label={candlesLit ? "Apaga la vela de cumpleaños" : "La vela de cumpleaños está apagada"}
          aria-pressed={!candlesLit}
        >
          <Image
            key={candlesLit ? "lit-cake" : "blown-cake"}
            src={candlesLit ? "/gift/birthday-cake.png" : "/gift/birthday-cake-no-flame.png"}
            alt="Un pastel de cumpleaños en azul pastel, morado y blanco"
            fill
            sizes="(max-width: 800px) 88vw, 37rem"
            priority
            className="cake-art"
          />
        </button>
      </div>
      <ButterflyField reduced={reduced} />
      <p className="blow-note">{candlesLit ? "Toca el pastel para apagar la vela" : "¡Pide un deseo!"}</p>
    </div>
  );
}

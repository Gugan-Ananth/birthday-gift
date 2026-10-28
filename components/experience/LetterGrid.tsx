"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

const ENVELOPES = [
  "/gift/envelopes/bow.png",
  "/gift/envelopes/lilac.png",
  "/gift/envelopes/linen.png",
  "/gift/envelopes/tag.png",
  "/gift/envelopes/floral.png",
  "/gift/envelopes/journal.png",
  "/gift/envelopes/hydrangea.png",
  "/gift/envelopes/border.png",
  "/gift/envelopes/blossom.png",
  "/gift/envelopes/quill.png",
  "/gift/envelopes/parcel.png",
] as const;

const LETTER_COUNT = 100;
const STORAGE_KEY = "birthday-gift-next-letter";

let snapshot = LETTER_COUNT;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStored() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return LETTER_COUNT;
    const value = Number(stored);
    if (Number.isInteger(value) && value >= 0 && value <= LETTER_COUNT) return value;
  } catch {
    // Storage can be blocked. The visit still opens in order.
  }
  return LETTER_COUNT;
}

function getSnapshot() {
  // Read once. Later calls must return this same value until a letter opens.
  if (!loaded) {
    loaded = true;
    snapshot = readStored();
  }
  return snapshot;
}

function getServerSnapshot() {
  return LETTER_COUNT;
}

function openNext(number: number) {
  if (number !== snapshot || number < 1) return;
  snapshot = number - 1;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(snapshot));
  } catch {
    // Keep the open for this visit even if storage is blocked.
  }
  emit();
}

function envelopeFor(index: number) {
  return ENVELOPES[(index * 3) % ENVELOPES.length];
}

export function LetterGrid() {
  const next = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hint, setHint] = useState<number | null>(null);
  const hintTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    };
  }, []);

  function showHint(number: number) {
    setHint(number);
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => {
      hintTimer.current = null;
      setHint(null);
    }, 2400);
  }

  function press(number: number) {
    if (number > next) return;
    if (number < next) {
      showHint(next);
      return;
    }
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = null;
    setHint(null);
    openNext(number);
  }

  return (
    <main className="letter-home" aria-label="Cartas">
      <ul className="letter-grid">
        {Array.from({ length: LETTER_COUNT }, (_, index) => {
          const number = LETTER_COUNT - index;
          const opened = number > next;
          const available = number === next;
          const state = opened ? "opened" : available ? "next" : "locked";
          return (
            <li key={number}>
              <button
                type="button"
                className={`letter-card is-${state}`}
                aria-disabled={!available}
                aria-label={
                  opened
                    ? `Carta ${number}, abierta`
                    : available
                      ? `Abrir la carta ${number}`
                      : `Carta ${number}. Abre primero la carta ${next}.`
                }
                onClick={() => press(number)}
              >
                <span
                  className="letter-frame"
                  style={
                    available
                      ? ({ "--letter-art": `url("${envelopeFor(index)}")` } as CSSProperties)
                      : undefined
                  }
                >
                  <Image
                    src={envelopeFor(index)}
                    alt=""
                    fill
                    unoptimized
                    priority={index === 0}
                    sizes="(max-width: 720px) 44vw, (max-width: 1100px) 30vw, 22vw"
                    className="letter-art"
                  />
                  {available ? (
                    <>
                      <span className="letter-gleam" aria-hidden="true" />
                      <span className="letter-sparkle letter-sparkle-a" aria-hidden="true" />
                      <span className="letter-sparkle letter-sparkle-b" aria-hidden="true" />
                      <span className="letter-sparkle letter-sparkle-c" aria-hidden="true" />
                      <span className="letter-sparkle letter-sparkle-d" aria-hidden="true" />
                      <span className="letter-sparkle letter-sparkle-e" aria-hidden="true" />
                    </>
                  ) : null}
                  <span className="letter-number">{number}</span>
                  {opened ? <span className="letter-opened">Abierta</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className={hint === null ? "letter-hint" : "letter-hint is-shown"} role="status">
        {hint === null ? "" : `Primero abre la carta ${hint}.`}
      </p>
    </main>
  );
}

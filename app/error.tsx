"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="house">
      <div className="stage">
        <article className="sheet">
          <h1 className="title">This page tore.</h1>
          <p className="body">The letter is still here. Try opening it again.</p>
          <button type="button" className="continue" onClick={reset}>
            Try again
          </button>
        </article>
      </div>
    </main>
  );
}

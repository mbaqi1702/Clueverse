"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { Clue, PublicPuzzle } from "@/lib/game/content";
import type { GuessResult } from "@/lib/game/guess";

type GameStatus = "playing" | "won" | "lost";

type GuessRecord = {
  value: string;
  result: "wrong" | "correct";
};

export function GameClient() {
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/game/today")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load today’s puzzle.");
        return (await response.json()) as PublicPuzzle;
      })
      .then((data) => {
        if (active) setPuzzle(data);
      })
      .catch(() => {
        if (active) setLoadError("Today’s mystery didn’t load. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  function retryLoadPuzzle() {
    setLoadError("");
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puzzle || !guess.trim() || submitting || status !== "playing") return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/game/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess: guess.trim(),
          attemptNumber: guesses.length + 1,
        }),
      });
      const result = (await response.json()) as GuessResult | { error: string };
      if (!response.ok || "error" in result) {
        setError("error" in result ? result.error : "Your guess could not be checked.");
        return;
      }

      setGuesses((previous) => [
        ...previous,
        { value: guess.trim(), result: result.correct ? "correct" : "wrong" },
      ]);
      setGuess("");
      const nextClue = result.correct ? undefined : result.clue;
      if (nextClue) setClues((previous) => [...previous, nextClue]);
      if (result.completed) {
        if (result.answer) setAnswer(result.answer);
        setStatus(result.correct ? "won" : "lost");
      }
    } catch {
      setError("We couldn’t check that guess. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const attemptsLeft = puzzle ? puzzle.maxAttempts - guesses.length : 0;

  return (
    <main className="page-shell relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col overflow-hidden px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
      <div aria-hidden="true" className="page-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]" />
      <header className="mb-12 flex items-center justify-between sm:mb-16">
        <Link className="flex items-center gap-3" href="/" aria-label="ClueVerse home">
          <span className="brand-mark grid size-10 place-items-center rounded-2xl text-lg font-black text-slate-950">
            C
          </span>
          <span className="text-lg font-bold tracking-tight">
            clue<span className="text-amber-300">verse</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-300 sm:text-xs">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgb(110_231_183_/_65%)]" />
          Anime <span className="text-slate-600">/</span> Daily puzzle
        </div>
      </header>

      <section className="mb-9 text-center sm:mb-11">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300 sm:text-xs">
          Your daily dose of the unexpected
        </p>
        <h1 className="text-[2.65rem] font-bold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl">
          One clue <span className="headline-accent">closer.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
          A story, a handful of hints, and one answer hiding in plain sight.
        </p>
      </section>

      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_292px] lg:gap-5">
        <section className="game-shell rounded-[1.75rem] border border-white/[0.09] p-5 shadow-2xl shadow-black/25 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                The daily case
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-200">
                {puzzle ? formatPuzzleDate(puzzle.date) : "A new mystery awaits"}
              </p>
            </div>
            <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 sm:text-[10px]">
              Original sample
            </span>
          </div>

          <div className="synopsis-card relative overflow-hidden rounded-2xl p-5 sm:p-7">
            <div aria-hidden="true" className="synopsis-orbit absolute -right-8 -top-12 size-40 rounded-full" />
            <div className="relative">
              <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800/75">
                <span aria-hidden="true" className="text-base leading-none text-amber-600">✳</span>
                The opening clue
              </div>
              {loading ? (
                <div aria-label="Loading the daily mystery" className="space-y-3" role="status">
                  <span className="sr-only">Loading today’s mystery…</span>
                  <div className="h-3 w-full animate-pulse rounded-full bg-slate-900/10" />
                  <div className="h-3 w-[92%] animate-pulse rounded-full bg-slate-900/10" />
                  <div className="h-3 w-[68%] animate-pulse rounded-full bg-slate-900/10" />
                </div>
              ) : loadError ? (
                <div role="alert">
                  <p className="text-sm leading-6 text-slate-700">{loadError}</p>
                  <button
                    className="mt-4 rounded-lg border border-slate-900/15 px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-900/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                    onClick={retryLoadPuzzle}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <p className="max-w-2xl text-[15px] font-medium leading-7 text-slate-800 sm:text-base sm:leading-8">
                  {puzzle?.synopsis}
                </p>
              )}
            </div>
          </div>

          <div
            aria-label="Attempts remaining"
            aria-valuemax={puzzle?.maxAttempts ?? 5}
            aria-valuemin={0}
            aria-valuenow={attemptsLeft}
            className="my-6"
            role="progressbar"
          >
            <div className="mb-3 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">Your chances</span>
              <span className="text-slate-200">
                {puzzle ? `${attemptsLeft} ${attemptsLeft === 1 ? "guess" : "guesses"} left` : "—"}
              </span>
            </div>
            <div aria-hidden="true" className="flex gap-2">
              {Array.from({ length: puzzle?.maxAttempts ?? 5 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    index < attemptsLeft ? "bg-amber-300" : "bg-white/[0.09]"
                  }`}
                />
              ))}
            </div>
          </div>

          {clues.length > 0 && (
            <ol className="mb-6 space-y-2.5" aria-label="Unlocked clues">
              {clues.map((clue, index) => (
                <li
                  className="clue-card flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
                  key={`${clue.label}-${index}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-300/10 text-xs font-bold text-indigo-200">
                    {index + 2}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{clue.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">{clue.value}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {guesses.length > 0 && (
            <ol aria-label="Your guesses" aria-live="polite" className="mb-5 space-y-2">
              {guesses.map((item, index) => (
                <li
                  key={`${index}-${item.value}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.045] bg-white/[0.025] px-4 py-3 text-sm"
                >
                  <span className="truncate text-slate-300">{item.value}</span>
                  <span className={`shrink-0 text-xs font-semibold ${item.result === "correct" ? "text-emerald-300" : "text-rose-300"}`}>
                    {item.result === "correct" ? "That’s it!" : "Not this one"}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {status === "playing" && puzzle ? (
            <form onSubmit={submitGuess}>
              <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="anime-guess">
                What’s your answer?
              </label>
              <p className="mb-3 text-xs text-slate-500" id="guess-help">
                Take your best shot. Every miss reveals another clue.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  autoComplete="off"
                  aria-describedby="guess-help"
                  id="anime-guess"
                  maxLength={100}
                  onChange={(event) => setGuess(event.target.value)}
                  placeholder="Type a title…"
                  value={guess}
                  disabled={loading || submitting || !puzzle}
                />
                <button
                  className="guess-button h-12 shrink-0 rounded-xl px-6 text-sm font-bold text-slate-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={loading || submitting || !guess.trim() || !puzzle}
                  type="submit"
                >
                  {submitting ? "Checking…" : "Lock it in"}
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}
            </form>
          ) : status !== "playing" ? (
            <div
              className={`rounded-2xl border p-5 ${
                status === "won"
                  ? "border-emerald-300/20 bg-emerald-300/[0.07]"
                  : "border-amber-200/15 bg-amber-200/[0.06]"
              }`}
              role="status"
            >
              <p className="text-sm font-bold text-white">
                {status === "won" ? "Mystery solved!" : "That’s a wrap for today."}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                The answer was <span className="font-semibold text-amber-200">{answer}</span>.
              </p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="game-shell rounded-[1.75rem] border border-white/[0.09] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">How it works</h2>
              <span aria-hidden="true" className="text-lg text-amber-300">✳</span>
            </div>
            <ol className="mt-5 space-y-4">
              {[
                ["01", "Start with the story", "Your first clue is already waiting."],
                ["02", "Take a guess", "Each miss brings a new hint."],
                ["03", "Find the title", "Solve it before your chances run out."],
              ].map(([number, title, description]) => (
                <li className="flex gap-3.5" key={number}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-amber-200/10 bg-amber-200/[0.06] text-[10px] font-bold text-amber-200">
                    {number}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-200">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="note-card rounded-[1.5rem] border p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">A note from the team</p>
            <p className="mt-2.5 text-xs leading-5 text-slate-300">
              This original sample lets us tune the game before we bring in licensed anime data. Guesses aren’t saved; refreshing starts a new round.
            </p>
          </section>
        </aside>
      </div>

      <footer className="mt-auto pt-12 text-center text-[10px] font-medium tracking-wide text-slate-600 sm:pt-14 sm:text-xs">
        Made for curious minds <span className="px-1.5 text-amber-300/60">✳</span> Come back for another mystery tomorrow
      </footer>
    </main>
  );
}

function formatPuzzleDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

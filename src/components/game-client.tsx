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
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        if (active) setError("Today’s puzzle could not load. Please refresh to try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
      <header className="mb-10 flex items-center justify-between">
        <Link className="flex items-center gap-3" href="/" aria-label="ClueVerse home">
          <span className="grid size-10 place-items-center rounded-2xl bg-amber-300 text-lg font-black text-slate-950 shadow-lg shadow-amber-950/20">
            C
          </span>
          <span className="text-lg font-bold tracking-tight">
            clue<span className="text-amber-300">verse</span>
          </span>
        </Link>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300">
          ANIME · DAILY PUZZLE
        </div>
      </header>

      <section className="mb-7 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
          A little mystery, every day
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          One clue closer.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
          Name the anime. Miss a guess, uncover a clue. See how far you get before the answer is revealed.
        </p>
      </section>

      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="game-shell rounded-3xl border border-white/[0.08] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Today’s puzzle
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {puzzle ? formatPuzzleDate(puzzle.date) : "Loading puzzle…"}
              </p>
            </div>
            <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.07] px-3 py-1.5 text-xs font-semibold text-amber-200">
              SAMPLE PUZZLE
            </span>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/35 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              <span className="size-1.5 rounded-full bg-amber-300" />
              The opening clue
            </div>
            <p className="text-[15px] leading-7 text-slate-100 sm:text-base">
              {loading ? "Finding today’s mystery…" : puzzle?.synopsis}
            </p>
          </div>

          <div className="my-6" aria-label={`${attemptsLeft} attempts remaining`}>
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">Attempts remaining</span>
              <span className="text-slate-200">{puzzle ? `${attemptsLeft} of ${puzzle.maxAttempts}` : "—"}</span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: puzzle?.maxAttempts ?? 5 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index < attemptsLeft ? "bg-amber-300" : "bg-white/10"
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
            <ol className="mb-5 space-y-2" aria-label="Your guesses">
              {guesses.map((item, index) => (
                <li
                  key={`${index}-${item.value}`}
                  className="flex items-center justify-between rounded-xl bg-white/[0.025] px-4 py-3 text-sm"
                >
                  <span className="text-slate-300">{item.value}</span>
                  <span className={item.result === "correct" ? "text-emerald-300" : "text-rose-300"}>
                    {item.result === "correct" ? "That’s it!" : "Not this one"}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {status === "playing" ? (
            <form onSubmit={submitGuess}>
              <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="anime-guess">
                Your guess
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  autoComplete="off"
                  id="anime-guess"
                  maxLength={100}
                  onChange={(event) => setGuess(event.target.value)}
                  placeholder="Type an anime title…"
                  value={guess}
                  disabled={loading || submitting || !puzzle}
                />
                <button
                  className="h-12 shrink-0 rounded-xl bg-amber-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || submitting || !guess.trim() || !puzzle}
                  type="submit"
                >
                  {submitting ? "Checking…" : "Lock it in"}
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}
            </form>
          ) : (
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
          )}
        </section>

        <aside className="space-y-4">
          <section className="game-shell rounded-3xl border border-white/[0.08] p-5">
            <h2 className="text-sm font-bold text-white">How to play</h2>
            <ol className="mt-4 space-y-4">
              {[
                ["01", "Read the synopsis", "Every puzzle starts with one story clue."],
                ["02", "Make a guess", "A wrong answer unlocks the next hint."],
                ["03", "Solve the mystery", "Can you get it before the final clue?"],
              ].map(([number, title, description]) => (
                <li className="flex gap-3" key={number}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-amber-200">
                    {number}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-indigo-200/10 bg-indigo-300/[0.05] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Prototype note</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              This is an original sample puzzle while we review licensed anime data sources.               Progress is held in memory and resets if you reload the page.
            </p>
          </section>
        </aside>
      </div>

      <footer className="mt-auto pt-10 text-center text-xs text-slate-600">
        A fresh mystery, every day <span className="px-1.5">·</span> Built for curious fans
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

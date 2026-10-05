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
        if (active) setLoadError("The puzzle could not be loaded. Check your connection and try again.");
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
      setError("The guess could not be checked. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const attemptsLeft = puzzle ? puzzle.maxAttempts - guesses.length : 0;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to puzzle</a>

      <header className="site-header">
        <div className="page-width masthead">
          <Link className="wordmark" href="/" aria-label="ClueVerse home">
            ClueVerse
          </Link>
          <span className="edition-label">Daily anime puzzle</span>
        </div>
      </header>

      <main className="page-width game-page" id="main-content" aria-labelledby="page-title">
        <section className="page-intro">
          <h1 id="page-title">Name the anime.</h1>
          <p className="intro-copy">
            Read the synopsis. Each wrong guess reveals another clue.
          </p>
        </section>

        <section className="game-sheet" aria-label="Today’s anime puzzle">
          <div className="puzzle-meta">
            <span>Today’s puzzle</span>
            <span>{puzzle ? formatPuzzleDate(puzzle.date) : "Loading date"}</span>
          </div>

          <section className="synopsis" aria-labelledby="synopsis-title">
            <h2 className="section-label" id="synopsis-title">The synopsis</h2>
            {loading ? (
              <p className="synopsis-copy" role="status">Loading today’s puzzle…</p>
            ) : loadError ? (
              <div role="alert">
                <p className="error-copy">{loadError}</p>
                <button className="text-button" onClick={retryLoadPuzzle} type="button">
                  Try again
                </button>
              </div>
            ) : (
              <p className="synopsis-copy">{puzzle?.synopsis}</p>
            )}
          </section>

          <div
            aria-label="Guesses remaining"
            aria-valuemax={puzzle?.maxAttempts ?? 5}
            aria-valuemin={0}
            aria-valuenow={attemptsLeft}
            className="attempts"
            role="progressbar"
          >
            <div className="attempts-heading">
              <span>Guesses remaining</span>
              <span>{puzzle ? `${attemptsLeft} of ${puzzle.maxAttempts}` : "—"}</span>
            </div>
            <div aria-hidden="true" className="attempt-marks">
              {Array.from({ length: puzzle?.maxAttempts ?? 5 }, (_, index) => (
                <span className={index < attemptsLeft ? "attempt-mark is-open" : "attempt-mark"} key={index} />
              ))}
            </div>
          </div>

          {clues.length > 0 && (
            <ol aria-label="Unlocked clues" className="clue-list">
              {clues.map((clue, index) => (
                <li className="clue-row" key={`${clue.label}-${index}`}>
                  <span aria-hidden="true" className="clue-number">{index + 2}</span>
                  <div>
                    <p className="clue-label">{clue.label}</p>
                    <p className="clue-copy">{clue.value}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {guesses.length > 0 && (
            <ol aria-label="Your guesses" aria-live="polite" className="guess-list">
              {guesses.map((item, index) => (
                <li className="guess-row" key={`${index}-${item.value}`}>
                  <span className="guess-value">{item.value}</span>
                  <span className={item.result === "correct" ? "guess-result is-correct" : "guess-result"}>
                    {item.result === "correct" ? "Correct" : "Not quite"}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {status === "playing" && puzzle ? (
            <form className="guess-form" onSubmit={submitGuess}>
              <label className="section-label" htmlFor="anime-guess">Your guess</label>
              <div className="guess-controls">
                <Input
                  autoComplete="off"
                  className="guess-input"
                  id="anime-guess"
                  maxLength={100}
                  onChange={(event) => setGuess(event.target.value)}
                  placeholder="Anime title"
                  value={guess}
                  disabled={loading || submitting || !puzzle}
                />
                <button
                  className="guess-submit"
                  disabled={loading || submitting || !guess.trim() || !puzzle}
                  type="submit"
                >
                  {submitting ? "Checking…" : "Check title"}
                </button>
              </div>
              {error && <p className="error-copy" role="alert">{error}</p>}
            </form>
          ) : status !== "playing" ? (
            <div className="result-panel" role="status">
              <p className="section-label">{status === "won" ? "Solved" : "Round complete"}</p>
              <p className="result-copy">
                {status === "won" ? "The answer was" : "Today’s answer was"}{" "}
                <span>{answer}</span>
              </p>
            </div>
          ) : null}
        </section>

        <p className="play-note">
          Five guesses. Each miss opens a new clue. Your round resets if you refresh.
        </p>
      </main>

      <footer className="site-footer">
        <div className="page-width footer-content">
          <span>ClueVerse</span>
          <span>Original sample puzzle</span>
        </div>
      </footer>
    </>
  );
}

function formatPuzzleDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

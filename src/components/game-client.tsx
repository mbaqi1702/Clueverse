"use client";

import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { Clue, PublicPuzzle } from "@/lib/game/content";
import type { GuessComparison, GuessResult } from "@/lib/game/guess";
import { formatShareResult } from "@/lib/game/share-result";

type GameStatus = "playing" | "won" | "lost";

type GuessRecord = {
  value: string;
  result: "wrong" | "correct" | "skipped";
  comparison?: GuessComparison;
};

type GameClientProps = {
  vertical?: "anime" | "movie" | "book";
};

function isPublicPuzzle(value: unknown): value is PublicPuzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "id" in value &&
    typeof value.id === "string" &&
    "date" in value &&
    typeof value.date === "string" &&
    "synopsis" in value &&
    typeof value.synopsis === "string" &&
    "maxAttempts" in value &&
    typeof value.maxAttempts === "number"
  );
}

export function GameClient({ vertical = "anime" }: GameClientProps) {
  const isMovie = vertical === "movie";
  const isBook = vertical === "book";
  const isAnime = vertical === "anime";
  const mediaName = isMovie ? "movie" : isBook ? "book" : "anime";
  const titleName = isMovie ? "Movie title" : isBook ? "Book title" : "Anime title";
  const todayEndpoint = isMovie
    ? "/api/game/movies/today"
    : isBook
      ? "/api/game/books/today"
      : "/api/game/today";

  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [dismissedSuggestionQuery, setDismissedSuggestionQuery] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const maxAttempts = puzzle?.maxAttempts ?? (isMovie ? 3 : 5);

  useEffect(() => {
    let active = true;

    fetch(todayEndpoint)
      .then(async (response) => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            !Array.isArray(data) &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Today’s puzzle is temporarily unavailable. Please try again later.";
          throw new Error(message);
        }
        if (!isPublicPuzzle(data)) {
          throw new Error("The puzzle response was invalid. Please try again later.");
        }
        return data;
      })
      .then((data) => {
        if (active) setPuzzle(data);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof TypeError
            ? "Could not connect to the game server. Check your connection and try again."
            : error instanceof Error
              ? error.message
              : "Today’s puzzle could not be loaded. Please try again.";
        if (active) setLoadError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt, todayEndpoint]);

  useEffect(() => {
    const query = guess.trim();
    if (
      !puzzle ||
      !query ||
      query === dismissedSuggestionQuery ||
      status !== "playing"
    ) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/game/suggestions?vertical=${mediaName}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as
          | { suggestions: string[] }
          | { error: string };
        if (!response.ok || "error" in result) {
          throw new Error("error" in result ? result.error : "Title suggestions are unavailable.");
        }
        setSuggestions(result.suggestions);
        setSuggestionError("");
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionError("Title suggestions are unavailable. You can still enter a guess.");
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [dismissedSuggestionQuery, guess, mediaName, puzzle, status]);

  function retryLoadPuzzle() {
    setLoadError("");
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  }

  function selectSuggestion(title: string) {
    setGuess(title);
    setDismissedSuggestionQuery(title);
    setSuggestions([]);
    setActiveSuggestion(-1);
  }

  function handleGuessKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) {
      if (event.key === "Escape") setDismissedSuggestionQuery(guess.trim());
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((active) => (active + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((active) => (active <= 0 ? suggestions.length - 1 : active - 1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissedSuggestionQuery(guess.trim());
      setSuggestions([]);
      setActiveSuggestion(-1);
    }
  }

  async function submitAttempt(
    action: { guess: string } | { skip: true },
    displayValue: string,
  ) {
    if (!puzzle || submitting || status !== "playing") return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(todayEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...action,
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
        {
          value: displayValue,
          result: result.correct ? "correct" : result.skipped ? "skipped" : "wrong",
          comparison: result.correct || result.skipped ? undefined : result.comparison,
        },
      ]);
      setGuess("");
      setSuggestions([]);
      setSuggestionError("");
      setActiveSuggestion(-1);
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

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = guess.trim();
    if (!title) return;
    void submitAttempt({ guess: title }, title);
  }

  function skipAttempt() {
    void submitAttempt({ skip: true }, "Skipped");
  }

  async function shareResult() {
    if (!puzzle || status === "playing") return;
    setShareMessage("");

    const text = formatShareResult({
      vertical,
      date: puzzle.date,
      status,
      attempts: guesses.map((item) => item.result),
      maxAttempts,
    });
    const title = `ClueVerse ${mediaName} result`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        setShareMessage("Result shared.");
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(text);
      setShareMessage("Result copied to the clipboard.");
    } catch {
      setShareMessage("Could not share or copy your result. Please try again.");
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
          <nav aria-label="Daily games" className="edition-nav">
            <Link aria-current={isAnime ? "page" : undefined} className="edition-link" href="/">
              Anime
            </Link>
            <Link aria-current={isMovie ? "page" : undefined} className="edition-link" href="/movies">
              Movies
            </Link>
            <Link aria-current={isBook ? "page" : undefined} className="edition-link" href="/books">
              Books
            </Link>
          </nav>
        </div>
      </header>

      <main className="page-width game-page" id="main-content" aria-labelledby="page-title">
        <section className="page-intro">
          <h1 id="page-title">Name the {mediaName}.</h1>
          <p className="intro-copy">
            Read the synopsis. Guess a title or skip to reveal another clue; skips use a guess.
          </p>
        </section>

        <section className="game-sheet" aria-label={`Today’s ${mediaName} puzzle`}>
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
            aria-valuemax={maxAttempts}
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
              {Array.from({ length: maxAttempts }, (_, index) => (
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
                  <div className="guess-row-heading">
                    {item.result !== "skipped" && (
                      <span className="guess-value">{item.value}</span>
                    )}
                    <span className={`guess-result${item.result === "correct" ? " is-correct" : item.result === "skipped" ? " is-skipped" : ""}`}>
                      {item.result === "correct" ? "Correct" : item.result === "skipped" ? "Skipped" : "Not quite"}
                    </span>
                  </div>
                  {item.result === "wrong" && item.comparison && (
                    item.comparison.available && item.comparison.fields.length > 0 ? (
                      <ul aria-label={`Clue comparison for ${item.value}`} className="comparison-grid">
                        {item.comparison.fields.map((field) => (
                          <li className={`comparison-field is-${field.result}`} key={field.label}>
                            <span className="comparison-label">{field.label}</span>
                            <span className="comparison-value">{field.guessValue}</span>
                            <span className={`comparison-result is-${field.result}`}>
                              {field.detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="comparison-note">
                        Choose an approved title from suggestions to compare its clues.
                      </p>
                    )
                  )}
                </li>
              ))}
            </ol>
          )}

          {status === "playing" && puzzle ? (
            <form className="guess-form" onSubmit={submitGuess}>
              <label className="section-label" htmlFor={`${mediaName}-guess`}>Your guess</label>
              <div className="guess-controls">
                <div className="guess-input-wrap">
                  <Input
                    aria-activedescendant={
                      activeSuggestion >= 0 ? `${mediaName}-suggestion-${activeSuggestion}` : undefined
                    }
                    aria-autocomplete="list"
                    aria-controls={`${mediaName}-title-suggestions`}
                    aria-expanded={suggestions.length > 0}
                    autoComplete="off"
                    className="guess-input"
                    id={`${mediaName}-guess`}
                    maxLength={100}
                    onChange={(event) => {
                      setGuess(event.target.value);
                      setDismissedSuggestionQuery("");
                      setSuggestions([]);
                      setSuggestionError("");
                      setActiveSuggestion(-1);
                    }}
                    onKeyDown={handleGuessKeyDown}
                    placeholder={titleName}
                    role="combobox"
                    value={guess}
                    disabled={loading || submitting || !puzzle}
                  />
                  {suggestions.length > 0 && (
                    <ul
                      className="suggestion-list"
                      id={`${mediaName}-title-suggestions`}
                      role="listbox"
                    >
                      {suggestions.map((title, index) => (
                        <li
                          aria-selected={index === activeSuggestion}
                          className={
                            index === activeSuggestion
                              ? "suggestion-option is-active"
                              : "suggestion-option"
                          }
                          id={`${mediaName}-suggestion-${index}`}
                          key={title}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => selectSuggestion(title)}
                          role="option"
                        >
                          {title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  className="guess-submit"
                  disabled={loading || submitting || !guess.trim() || !puzzle}
                  aria-label={submitting ? "Checking guess" : "Submit guess"}
                  title={submitting ? "Checking guess" : "Submit guess"}
                  type="submit"
                >
                  {submitting ? (
                    <span aria-hidden="true" className="guess-submit-spinner" />
                  ) : (
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="20"
                      viewBox="0 0 20 20"
                      width="20"
                    >
                      <path
                        d="M4.167 10h11.666m0 0-5-5m5 5-5 5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.75"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <button
                className="skip-button"
                disabled={loading || submitting || !puzzle}
                onClick={skipAttempt}
                type="button"
              >
                Skip and reveal next clue
              </button>
              {suggestionError && <p className="suggestion-error" role="status">{suggestionError}</p>}
              {error && <p className="error-copy" role="alert">{error}</p>}
            </form>
          ) : status !== "playing" ? (
            <div className="result-panel" role="status">
              <p className="section-label">{status === "won" ? "Solved" : "Round complete"}</p>
              <p className="result-copy">
                {status === "won" ? "The answer was" : "Today’s answer was"}{" "}
                <span>{answer}</span>
              </p>
              <button className="skip-button share-button" onClick={shareResult} type="button">
                Share result
              </button>
              {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}
            </div>
          ) : null}
        </section>

        <p className="play-note">
            {maxAttempts} attempts. Wrong guesses and skips reveal clues. Your round resets if you refresh.
        </p>
      </main>

      <footer className="site-footer">
        <div className="page-width footer-content">
          <span>ClueVerse</span>
          {isMovie ? (
            <div className="tmdb-attribution">
              <a
                aria-label="The Movie Database (TMDB)"
                className="tmdb-logo-link"
                href="https://www.themoviedb.org"
                rel="noreferrer"
                target="_blank"
              >
                {/* Official TMDB logo, as required by the provider's current API terms. */}
                <span aria-hidden="true" className="tmdb-logo">TMDB</span>
              </a>
              <span>
                This application uses TMDB and the TMDB APIs but is not endorsed, certified, or
                otherwise approved by TMDB.
              </span>
            </div>
          ) : (
            <span>Daily {isBook ? "book" : "anime"} puzzle</span>
          )}
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

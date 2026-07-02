import { useEffect, useState } from "react";
import type { MatchState, PickRecommendation, RankedCard } from "@mtg-coach/core";

interface CoachUpdate {
  mode: "live" | "demo";
  logPath: string | null;
  committedColors: string[];
  recommendation: PickRecommendation | null;
  matchState: MatchState | null;
}

interface CoachApi {
  onUpdate: (cb: (update: CoachUpdate) => void) => () => void;
  reloadDemo: () => Promise<void>;
  ingest: (text: string) => Promise<{ events: number }>;
  close: () => void;
}

declare global {
  interface Window {
    coach: CoachApi;
  }
}

const COLOR_HEX: Record<string, string> = {
  W: "#f8f4d8",
  U: "#3b7dd8",
  B: "#4b3b52",
  R: "#e0533a",
  G: "#3a9b5c"
};

const GRADE_HEX: Record<string, string> = {
  S: "#ffd447",
  A: "#7bd88f",
  B: "#8fd0ff",
  C: "#d9d98f",
  D: "#e0a06a",
  F: "#e06a6a"
};

function ManaPips({ colors }: { colors: string[] }) {
  if (colors.length === 0) return <span className="pip pip-c">C</span>;
  return (
    <span className="pips">
      {colors.map((c) => (
        <span key={c} className="pip" style={{ background: COLOR_HEX[c] ?? "#888", color: c === "W" ? "#222" : "#fff" }}>
          {c}
        </span>
      ))}
    </span>
  );
}

function HeroPick({ ranked }: { ranked: RankedCard }) {
  const { card } = ranked;
  return (
    <div className="hero" style={card.artCropUrl ? { backgroundImage: `url(${card.artCropUrl})` } : undefined}>
      <div className="hero-scrim" />
      <div className="hero-body">
        {card.imageUrl && <img className="hero-card" src={card.imageUrl} alt={card.name} />}
        <div className="hero-info">
          <span className="hero-tag">TOP PICK</span>
          <span className="hero-name">{card.name}</span>
          <div className="hero-score-row">
            <span className="grade" style={{ background: GRADE_HEX[ranked.grade] ?? "#888" }}>
              {ranked.grade}
            </span>
            <span className="hero-score">{ranked.score.toFixed(0)}</span>
            <span className="hero-score-label">/100</span>
            <ManaPips colors={card.colors} />
          </div>
          <span className="card-reasons">{ranked.reasons.slice(0, 3).join(" · ")}</span>
        </div>
      </div>
    </div>
  );
}

function CardRow({ ranked }: { ranked: RankedCard }) {
  const { card } = ranked;
  return (
    <li className="card-row">
      {card.imageUrl ? (
        <img className="row-thumb" src={card.imageUrl} alt={card.name} />
      ) : (
        <span className="row-thumb row-thumb-empty" />
      )}
      <span className="grade" style={{ background: GRADE_HEX[ranked.grade] ?? "#888" }}>
        {ranked.grade}
      </span>
      <span className="card-main">
        <span className="card-name">{card.name}</span>
        <span className="card-reasons">{ranked.reasons.join(" · ")}</span>
      </span>
      <ManaPips colors={card.colors} />
      <span className="score">{ranked.score.toFixed(0)}</span>
    </li>
  );
}

export function App() {
  const [update, setUpdate] = useState<CoachUpdate | null>(null);

  useEffect(() => {
    if (!window.coach) return;
    const off = window.coach.onUpdate(setUpdate);
    return off;
  }, []);

  const rec = update?.recommendation ?? null;
  const match = update?.matchState ?? null;

  return (
    <div className="overlay">
      <header className="titlebar">
        <div className="brand">
          <span className="logo">MTG</span> Arena Coach
        </div>
        <div className="titlebar-actions">
          <span className={update?.mode === "live" ? "mode live" : "mode demo"}>
            {update?.mode === "live" ? "LIVE" : "DEMO"}
          </span>
          <button className="icon-btn" title="Reload sample draft" onClick={() => window.coach?.reloadDemo()}>
            ⟳
          </button>
          <button className="icon-btn close" title="Close" onClick={() => window.coach?.close()}>
            ✕
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Draft Assistant</h2>
          {rec && (
            <span className="pack-meta">
              P{rec.pack.packNumber} · P{rec.pack.pickNumber}
            </span>
          )}
        </div>
        {update && update.committedColors.length > 0 && (
          <div className="commit">
            Committed colors: <ManaPips colors={update.committedColors} />
          </div>
        )}
        {rec?.bestPick ? (
          <>
            <HeroPick ranked={rec.bestPick} />
            <ul className="card-list">
              {rec.ranked.slice(1).map((r) => (
                <CardRow key={r.card.arenaId ?? r.card.name} ranked={r} />
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">Waiting for a draft pack…</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Match Tracker</h2>
        </div>
        {match ? (
          <div className="match">
            <div className="match-line">
              <span>Turn {match.turn}</span>
              <span>{match.onThePlay ? "On the play" : "On the draw"}</span>
            </div>
            <div className="revealed">
              <span className="revealed-label">Opponent revealed:</span>
              {match.opponentRevealed.length ? (
                match.opponentRevealed.map((name, i) => (
                  <span key={`${name}-${i}`} className="tag">
                    {name}
                  </span>
                ))
              ) : (
                <span className="muted">nothing yet</span>
              )}
            </div>
          </div>
        ) : (
          <p className="empty">No active match.</p>
        )}
      </section>

      <footer className="foot">
        {update?.mode === "live" && update.logPath ? `Watching ${update.logPath}` : "Sample data · point MTGA_LOG_PATH at Player.log for live coaching"}
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { API_URL } from "../config";
import "./driver/Driver.css";

/* ══════════════════════════════════════════════════════════════
   Standings — the championship table, three ways.

     Peak pace   best single code lap (ties on average pace)
     Rating      Elo rating, earned against each track's field
     This week   best code lap since Monday 00:00 UTC

   English warm-ups count on none of them. The top three stand on a
   podium; everyone links to their driver page; and a signed-in
   driver outside the top fifty gets their own row pinned underneath,
   so the page always answers "where am I?".
   ══════════════════════════════════════════════════════════════ */

const BOARDS = [
  {
    id: "peak",
    label: "Peak pace",
    sub: "Each driver's best single code lap",
    main: ["Peak", (r) => r.peakWpm],
    cols: [
      ["Avg", (r) => r.averageWpm],
      ["Laps", (r) => r.totalRaces],
    ],
    unit: "WPM",
  },
  {
    id: "rating",
    label: "Rating",
    sub: "Elo rating, won or lost against each track's field",
    main: ["Rating", (r) => r.eloRating],
    cols: [
      ["Peak", (r) => r.peakWpm],
      ["Laps", (r) => r.totalRaces],
    ],
    unit: "",
  },
  {
    id: "weekly",
    label: "This week",
    sub: "Best code lap since Monday 00:00 UTC — everyone starts level each week",
    main: ["Best", (r) => r.weekBest],
    cols: [
      ["Avg", (r) => r.weekAverage],
      ["Laps", (r) => r.weekRaces],
    ],
    unit: "WPM",
  },
];

/* Podium metals: [helmet/number, block top]. */
const METAL = {
  1: ["#f2c230", "#fff3a6"],
  2: ["#b9c1cc", "#f4f6fa"],
  3: ["#cd7f32", "#f0b27a"],
};
const STEP_HEIGHT = { 1: 96, 2: 70, 3: 52 };

function Helmet({ color }) {
  return (
    <svg className="std-step-helmet" viewBox="0 0 64 54" aria-hidden="true">
      <path d="M6 40C6 22 18 8 35 8c13 0 23 9 23 22v10c0 3-2 5-5 5H11c-3 0-5-2-5-5z" fill={color} />
      <path d="M31 21h23c2.5 0 4 1.8 4 4v7H35c-2.5 0-4.5-2-4.5-4.5z" fill="#0b0d10" opacity="0.88" />
      <path d="M36 24h17" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 34h20" stroke="rgba(var(--cc-accent-rgb), 0.95)" strokeWidth="4" />
      <path d="M14 15c5-4 11-6 18-6" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PodiumStep({ pos, row, board }) {
  const [metal, shine] = METAL[pos];
  const h = STEP_HEIGHT[pos];
  const driver = row ? (
    <Link to={`/driver/${encodeURIComponent(row.username)}`} className="std-step-driver">
      <Helmet color={metal} />
      <span className="std-step-name">{row.username}</span>
      <span className="std-step-score">
        {board.main[1](row)} {board.unit}
      </span>
    </Link>
  ) : (
    <div className="std-step-driver std-step-empty">
      <Helmet color="var(--cc-border-strong)" />
      <span className="std-step-name">Open seat</span>
      <span className="std-step-score">&nbsp;</span>
    </div>
  );
  return (
    <div className={`std-step is-p${pos}`}>
      {driver}
      <svg className="std-step-block" viewBox={`0 0 120 ${h + 12}`} aria-hidden="true">
        <defs>
          <linearGradient id={`std-face-${pos}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cc-elevated)" />
            <stop offset="1" stopColor="var(--cc-surface)" />
          </linearGradient>
        </defs>
        <path d="M4 12 14 1h92l10 11z" fill={shine} opacity="0.85" />
        <rect x="4" y="12" width="112" height={h} fill={`url(#std-face-${pos})`} stroke="var(--cc-border-strong)" />
        <rect x="4" y="12" width="112" height="4" fill={metal} />
        <text
          x="60"
          y={12 + h / 2 + 13}
          textAnchor="middle"
          fontFamily="Saira, sans-serif"
          fontWeight="800"
          fontSize={pos === 1 ? 40 : 34}
          fill={metal}
        >
          {pos}
        </text>
      </svg>
    </div>
  );
}

function Row({ row, board, you, pinned = false }) {
  return (
    <div className={`std-row${you ? " is-you" : ""}${pinned ? " is-pinned" : ""}`}>
      <span className="std-pos">P{row.rank}</span>
      <span className="std-driver">
        <Link to={`/driver/${encodeURIComponent(row.username)}`}>{row.username}</Link>
        {you && <span className="std-you">You</span>}
      </span>
      <span className="std-num is-main">{board.main[1](row)}</span>
      {board.cols.map(([label, get]) => (
        <span key={label} className="std-num">
          {get(row)}
        </span>
      ))}
    </div>
  );
}

export default function Standings() {
  const { user, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const boardId = BOARDS.some((b) => b.id === params.get("board")) ? params.get("board") : "peak";
  const board = BOARDS.find((b) => b.id === boardId);
  /* Keyed by board and viewer, so switching tabs back is instant and
     a sign-in refetches with "you". */
  const [results, setResults] = useState({});
  const cacheKey = `${boardId}:${token ? "me" : "anon"}`;
  const result = results[cacheKey];

  useEffect(() => {
    if (results[cacheKey]) return undefined;
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/leaderboard/standings?board=${boardId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load the standings.");
        return res.json();
      })
      .then((data) => setResults((prev) => ({ ...prev, [cacheKey]: data })))
      .catch((err) => {
        if (err.name !== "AbortError") setResults((prev) => ({ ...prev, [cacheKey]: { error: err.message } }));
      });
    return () => ctrl.abort();
  }, [boardId, token, cacheKey, results]);

  const rows = result?.rows ?? [];
  const you = result?.you ?? null;
  const youInList = you && rows.some((r) => r.rank === you.rank && r.username === you.username);

  return (
    <div className="drv-page">
      <div className="std">
        <header className="std-head">
          <p className="cc-brand std-eyebrow">World Drivers&apos; Championship</p>
          <h1 className="std-title">Driver Standings</h1>
          <p className="std-sub">
            {board.sub}. Code laps only; English warm-ups don&apos;t count.
          </p>
        </header>

        <div className="std-tabs" role="tablist" aria-label="Standings board">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              id={`std-tab-${b.id}`}
              aria-selected={b.id === boardId}
              aria-controls="std-board"
              className="std-tab"
              onClick={() => setParams(b.id === "peak" ? {} : { board: b.id }, { replace: true })}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div id="std-board" role="tabpanel" aria-labelledby={`std-tab-${boardId}`}>
          {!result ? (
            <p className="std-empty" aria-busy="true">Loading the standings…</p>
          ) : result.error ? (
            <p className="std-empty" role="alert">{result.error}</p>
          ) : rows.length === 0 ? (
            <div className="std-empty">
              <p>
                {boardId === "weekly"
                  ? "Nobody has raced code this week yet. The first lap takes P1."
                  : "No drivers on the board yet. Be the first to claim P1."}
              </p>
              <Link to="/test" className="drv-btn is-primary">
                Enter the grid
              </Link>
            </div>
          ) : (
            <>
              <div className="std-podium" aria-label="Podium">
                <PodiumStep pos={2} row={rows[1]} board={board} />
                <PodiumStep pos={1} row={rows[0]} board={board} />
                <PodiumStep pos={3} row={rows[2]} board={board} />
              </div>

              <div className="std-table">
                <div className="std-row is-head" aria-hidden="true">
                  <span className="std-pos">Pos</span>
                  <span>Driver</span>
                  <span className="std-num">{board.main[0]}</span>
                  {board.cols.map(([label]) => (
                    <span key={label} className="std-num">
                      {label}
                    </span>
                  ))}
                </div>
                {rows.map((row) => (
                  <Row
                    key={row.username}
                    row={row}
                    board={board}
                    you={Boolean(user && youInList && row.username === you.username)}
                  />
                ))}
                {you && !youInList && <Row row={you} board={board} you pinned />}
                <p className="std-foot">
                  {rows.length} driver{rows.length === 1 ? "" : "s"} classified
                  {!user && " · sign in to see where you stand"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

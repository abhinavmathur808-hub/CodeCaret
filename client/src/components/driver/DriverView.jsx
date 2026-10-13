import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ActivityCalendar from "./ActivityCalendar";
import TrophyBadge from "./TrophyBadge";
import { TROPHIES } from "../../utils/trophies";
import "./Driver.css";

/* ══════════════════════════════════════════════════════════════
   DriverView — a driver's career on one page.

   Shared by the public driver page (/driver/:name) and your own
   profile (/profile), which adds the private sections — account,
   symbol fluency, security — around it through `children`.

   `driver` is GET /api/users/:name/public. `laps`, when given, is a
   longer log (oldest first) for the form chart; otherwise the chart
   uses the twenty recent laps the public read carries.
   ══════════════════════════════════════════════════════════════ */

const fmtDate = (d, opts) => new Date(d).toLocaleDateString(undefined, opts);

function initials(name) {
  const parts = String(name).split(/[\s_.-]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name).slice(0, 2)).toUpperCase();
}

function Stat({ label, value, sub, accent = false }) {
  return (
    <div className={`drv-stat${accent ? " is-accent" : ""}`}>
      <span className="drv-stat-value">{value}</span>
      <span className="drv-stat-label">{label}</span>
      {sub && <span className="drv-stat-sub">{sub}</span>}
    </div>
  );
}

function FormTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const lap = payload[0].payload;
  return (
    <div className="drv-tooltip">
      <strong>{lap.wpm} WPM</strong>
      <span>{lap.accuracy}% · {lap.language}</span>
      <span>{fmtDate(lap.createdAt, { day: "numeric", month: "short" })}</span>
    </div>
  );
}

export default function DriverView({ driver, laps, isYou = false, actions = null, children = null }) {
  const held = new Map((driver.trophies || []).map((t) => [t.id, t.at]));
  const form = (laps ?? [...(driver.recent || [])].reverse())
    .filter((l) => l.language !== "English" && l.language?.toLowerCase?.() !== "english")
    .map((l, i) => ({ ...l, n: i + 1 }));

  return (
    <div className="drv">
      <header className="drv-head">
        <div className="drv-avatar" aria-hidden="true">
          {initials(driver.username)}
        </div>
        <div className="drv-id">
          <p className="cc-brand drv-eyebrow">{isYou ? "Your career" : "Driver"}</p>
          <h1 className="drv-name">{driver.username}</h1>
          <p className="drv-meta">
            Racing since {fmtDate(driver.joinedAt, { month: "long", year: "numeric" })}
            {driver.peakRank ? (
              <>
                {" · "}
                <Link to="/standings" className="drv-rank">
                  P{driver.peakRank} in the standings
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {actions && <div className="drv-actions">{actions}</div>}
      </header>

      <section className="drv-stats" aria-label="Career numbers">
        <Stat label="Peak WPM" value={driver.peakWpm} accent />
        <Stat label="Average WPM" value={driver.averageWpm} />
        <Stat label="Code laps" value={driver.totalRaces} />
        <Stat label="Rating" value={driver.eloRating} />
        <Stat
          label="Streak"
          value={driver.currentStreak}
          sub={`best ${driver.maxStreak} day${driver.maxStreak === 1 ? "" : "s"}`}
        />
        <Stat
          label="Track records"
          value={driver.board?.records ?? 0}
          sub={`${driver.board?.podiums ?? 0} podium${driver.board?.podiums === 1 ? "" : "s"} · ${driver.board?.tracks ?? 0} tracks`}
        />
      </section>

      <section className="drv-card" aria-labelledby="drv-trophies">
        <div className="drv-card-head">
          <h2 id="drv-trophies" className="drv-card-title">Trophy cabinet</h2>
          <span className="drv-card-note">
            {held.size} of {TROPHIES.length}
          </span>
        </div>
        <ul className="drv-trophies">
          {TROPHIES.map((t) => {
            const at = held.get(t.id);
            return (
              <li key={t.id} className={`drv-trophy${at ? "" : " is-locked"}`}>
                <TrophyBadge id={t.id} earned={Boolean(at)} size={60} />
                <span className="drv-trophy-title">{t.title}</span>
                <span className="drv-trophy-sub">
                  {at ? fmtDate(at, { day: "numeric", month: "short", year: "numeric" }) : t.blurb}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="drv-card" aria-labelledby="drv-activity">
        <div className="drv-card-head">
          <h2 id="drv-activity" className="drv-card-title">Activity</h2>
        </div>
        <ActivityCalendar activity={driver.activity} />
      </section>

      <div className="drv-split">
        <section className="drv-card" aria-labelledby="drv-form">
          <div className="drv-card-head">
            <h2 id="drv-form" className="drv-card-title">Form</h2>
            <span className="drv-card-note">
              {form.length > 0 ? `last ${form.length} code lap${form.length === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          {form.length > 1 ? (
            <div className="drv-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={form} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--cc-border)" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="n" tick={false} axisLine={{ stroke: "var(--cc-border)" }} tickLine={false} />
                  <YAxis yAxisId="wpm" tick={{ fill: "var(--cc-text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="acc" orientation="right" domain={[50, 100]} hide />
                  <Tooltip content={<FormTooltip />} cursor={{ stroke: "var(--cc-border-strong)" }} />
                  <Line yAxisId="wpm" type="monotone" dataKey="wpm" stroke="var(--cc-accent)" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Line yAxisId="acc" type="monotone" dataKey="accuracy" stroke="var(--cc-success)" strokeWidth={1.6} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="drv-chart-key" aria-hidden="true">
                <span className="is-wpm">WPM</span>
                <span className="is-acc">Accuracy</span>
              </p>
            </div>
          ) : (
            <p className="drv-empty">A couple of code laps and the form line appears here.</p>
          )}
        </section>

        <section className="drv-card" aria-labelledby="drv-langs">
          <div className="drv-card-head">
            <h2 id="drv-langs" className="drv-card-title">By language</h2>
          </div>
          {driver.languages?.length ? (
            <table className="drv-table">
              <thead>
                <tr>
                  <th scope="col">Language</th>
                  <th scope="col">Laps</th>
                  <th scope="col">Best</th>
                  <th scope="col">Avg</th>
                </tr>
              </thead>
              <tbody>
                {[...driver.languages]
                  .sort((a, b) => a.warmup - b.warmup || b.races - a.races)
                  .map((l) => (
                    <tr key={l.language}>
                      <td>
                        {l.language}
                        {l.warmup && <span className="drv-tag">warm-up</span>}
                      </td>
                      <td>{l.races}</td>
                      <td>{l.best}</td>
                      <td>{l.averageWpm}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="drv-empty">No laps yet.</p>
          )}
        </section>
      </div>

      {children}

      <section className="drv-card" aria-labelledby="drv-recent">
        <div className="drv-card-head">
          <h2 id="drv-recent" className="drv-card-title">Recent laps</h2>
        </div>
        {driver.recent?.length ? (
          <table className="drv-table drv-table-recent">
            <thead>
              <tr>
                <th scope="col">WPM</th>
                <th scope="col">Accuracy</th>
                <th scope="col">Language</th>
                <th scope="col">Time</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {driver.recent.map((r, i) => (
                <tr key={`${r.createdAt}-${i}`}>
                  <td className="drv-td-wpm">{r.wpm}</td>
                  <td>{r.accuracy}%</td>
                  <td>
                    {r.language}
                    {r.language === "English" && <span className="drv-tag">warm-up</span>}
                  </td>
                  <td>{r.timeElapsed}s</td>
                  <td>{fmtDate(r.createdAt, { day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="drv-empty">
            No laps yet.{" "}
            {isYou && (
              <Link to="/test" className="drv-link">
                Head to the grid
              </Link>
            )}
          </p>
        )}
      </section>
    </div>
  );
}

import { useMemo } from "react";

/* ══════════════════════════════════════════════════════════════
   ActivityCalendar — a year of racing, one square per day.

   Columns are weeks (Monday first), the newest on the right, ending
   on today. Days are UTC days, the same days the server buckets the
   race log by. A darker square is a busier day.
   ══════════════════════════════════════════════════════════════ */

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const LEFT = 26;
const TOP = 16;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const level = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);

export default function ActivityCalendar({ activity = {}, today = new Date() }) {
  const { cells, months, days, total } = useMemo(() => {
    const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const endDow = (new Date(end).getUTCDay() + 6) % 7; // Monday = 0
    const start = end - ((WEEKS - 1) * 7 + endDow) * DAY_MS;
    const out = [];
    const monthLabels = [];
    let active = 0;
    let sum = 0;
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const t = start + (w * 7 + d) * DAY_MS;
        if (t > end) break;
        const date = new Date(t);
        const key = date.toISOString().slice(0, 10);
        const n = activity[key] || 0;
        if (n > 0) active++;
        sum += n;
        out.push({ key, w, d, n });
        if (date.getUTCDate() === 1 && w < WEEKS - 1) monthLabels.push({ w, label: MONTHS[date.getUTCMonth()] });
      }
    }
    return { cells: out, months: monthLabels, days: active, total: sum };
  }, [activity, today]);

  const width = LEFT + WEEKS * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  return (
    <figure className="activity">
      <div className="activity-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={`${total} lap${total === 1 ? "" : "s"} on ${days} day${days === 1 ? "" : "s"} in the last year`}
        >
          {months.map((m) => (
            <text key={`${m.w}-${m.label}`} x={LEFT + m.w * (CELL + GAP)} y={10} className="activity-month">
              {m.label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((label, i) => (
            <text key={label} x={0} y={TOP + i * 2 * (CELL + GAP) + CELL - 2} className="activity-day">
              {label}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.key}
              x={LEFT + c.w * (CELL + GAP)}
              y={TOP + c.d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2.5}
              className={`activity-cell l${level(c.n)}`}
            >
              <title>{`${c.key}: ${c.n === 0 ? "no laps" : `${c.n} lap${c.n === 1 ? "" : "s"}`}`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <figcaption className="activity-caption">
        <span>
          {total} lap{total === 1 ? "" : "s"} on {days} day{days === 1 ? "" : "s"}
        </span>
        <span className="activity-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`activity-cell l${l}`} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}

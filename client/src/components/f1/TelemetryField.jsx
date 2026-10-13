import { AnimatePresence, motion as Motion } from "framer-motion";
import { CircleCheckBig } from "lucide-react";
import { CHANNEL_STATES, channelState } from "./theme";

/* ══════════════════════════════════════════════════════════════
   One telemetry channel.

   Each field reads like a channel on a pit-wall readout: a two-digit
   index down the left margin, the label, and a live status word on
   the right. The rule under the value is two layers — a dim base plus
   a coloured bar that sweeps in from the left the moment the channel
   goes live, locks or faults. That sweep is the only motion in the
   row, so the eye is drawn to the field that just changed state.
   ══════════════════════════════════════════════════════════════ */
export default function TelemetryField({
  index,
  name,
  label,
  hint,
  counter,
  below,
  extraDescribedBy,
  error,
  done,
  active,
  reduced,
  value,
  onChange,
  onFocus,
  onBlur,
  trailing,
  ...inputProps
}) {
  /* Any extra description is announced alongside whichever of the error or
     hint is currently showing, so a screen reader hears what is still
     outstanding rather than just the one message. */
  const describedBy =
    [error ? `${name}-error` : hint ? `${name}-hint` : null, extraDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;

  const { text, color } = CHANNEL_STATES[channelState({ error, done, active })];
  const standby = !error && !done && !active;
  const footer = error || hint || counter;

  return (
    <div className="relative pl-8">
      <span
        aria-hidden="true"
        className="absolute top-px left-0 font-mono text-[0.62rem] tabular-nums transition-colors duration-300"
        style={{ color }}
      >
        {String(index).padStart(2, "0")}
      </span>

      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={name}
          className="text-[0.85rem] leading-none text-white/75"
        >
          {label}
        </label>
        <span
          aria-hidden="true"
          className="font-mono text-[0.56rem] tracking-[0.22em] uppercase transition-colors duration-300"
          style={{ color }}
        >
          {text}
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          id={name}
          name={name}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => onFocus(name)}
          onBlur={() => onBlur(name)}
          className="w-full border-0 bg-transparent p-0 pt-1 pb-1.5 pr-16 text-lg font-semibold text-white placeholder:font-normal placeholder:text-white/25 focus:ring-0 focus:outline-none"
          {...inputProps}
        />
        {trailing}
        <AnimatePresence>
          {done && (
            <Motion.span
              key="tick"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute text-emerald-400"
              aria-hidden="true"
              style={{ right: trailing ? "2rem" : "0" }}
            >
              <CircleCheckBig className="h-4 w-4" />
            </Motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative h-px w-full bg-white/12">
        <Motion.div
          className="absolute inset-0 origin-left"
          initial={false}
          animate={{ scaleX: standby ? 0 : 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          style={{ backgroundColor: color, boxShadow: `0 0 9px ${color}` }}
        />
      </div>

      {footer && (
        <div className="mt-1.5 flex items-start justify-between gap-3">
          {error ? (
            <p id={`${name}-error`} role="alert" className="text-xs text-red-300">
              {error}
            </p>
          ) : hint ? (
            <p id={`${name}-hint`} className="text-xs text-white/40">
              {hint}
            </p>
          ) : (
            <span />
          )}
          {counter && (
            <span className="shrink-0 font-mono text-[0.6rem] tabular-nums text-white/30">
              {counter}
            </span>
          )}
        </div>
      )}

      {below}
    </div>
  );
}

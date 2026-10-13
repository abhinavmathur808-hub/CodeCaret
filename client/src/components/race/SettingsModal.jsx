import { ENGINEER_VERBOSITY } from "../useRaceEngineer";
import { SOUND_PROFILES } from "../../hooks/useTypingSound";
import { GOAL_OPTIONS, formatPractice } from "../../hooks/usePracticeTracker";
import { THEME_GROUPS, getTheme } from "../../themes";
import { FONTS, getFont, fontPreview } from "../../fonts";
import { CODE_LANGUAGES, WARMUP_LANGUAGE, DENSITY_OPTIONS, TOPIC_OPTIONS } from "../../utils/snippetPool";

/* ══════════════════════════════════════════════════════════════
   SettingsModal — Race Configuration, the /test page's settings.

   Moved out of TestTypingSandbox.jsx, which owns every setting's state
   and persistence; this component only lays the controls out and calls
   back. Opened from the track bar, the profile menu and the keyboard.
   ══════════════════════════════════════════════════════════════ */
export default function SettingsModal({
  applyRaceConfig,
  autoIndent,
  blindMode,
  caretBlink,
  caretStyle,
  codeLength,
  customReady,
  customSnippet,
  density,
  dsaSnippet,
  engineerVerbosity,
  fontSize,
  freedomMode,
  ghostCaret,
  ghostSource,
  globalFont,
  handleResetSettings,
  handleThemeChange,
  hideLiveWpm,
  highlightMode,
  languages,
  lineHeight,
  practiceGoalMs,
  practiceGoalReached,
  practiceMs,
  practiceProgress,
  resetArmed,
  restartRace,
  setAutoIndent,
  setBlindMode,
  setCaretBlink,
  setCaretStyle,
  setCustomSnippet,
  setEngineerVerbosity,
  setFontSize,
  setFreedomMode,
  setGhostCaret,
  setGhostSource,
  setGlobalFont,
  setHideLiveWpm,
  setHighlightMode,
  setLineHeight,
  setPracticeGoal,
  setResetArmed,
  setSettingsOpen,
  setShowKeyboard,
  setSmoothCaret,
  setSoundProfile,
  setSoundVolume,
  setStrictMode,
  setUseCustom,
  setZenMode,
  showKeyboard,
  smoothCaret,
  sound,
  soundProfile,
  soundVolume,
  strictMode,
  theme,
  timeLimit,
  topic,
  topicCount,
  useCustom,
  warmupMode,
  zenMode,
}) {
  return (
    <>
      <div className="settings-modal-backdrop" onClick={() => setSettingsOpen(false)} />
      <div
        className="settings-modal"
        id="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Chequered trim, matching the goal alert and the results
            screen — the one literal flag reference in the panel. */}
        <div className="settings-flag" aria-hidden="true" />

        {/* Spec-drawing registration marks, as on the auth pages. */}
        <span className="settings-mark settings-mark-tl" aria-hidden="true" />
        <span className="settings-mark settings-mark-tr" aria-hidden="true" />
        <span className="settings-mark settings-mark-bl" aria-hidden="true" />
        <span className="settings-mark settings-mark-br" aria-hidden="true" />

        <header className="settings-modal-header">
          <div className="settings-head-id">
            <span className="settings-head-led" aria-hidden="true" />
            <span className="settings-modal-title" id="settings-modal-title">
              Race Configuration
            </span>
          </div>

          {/* Live summary of the three settings that actually change
              the next race, so the headline state is readable without
              scanning every card for its active pill. */}
          <div className="settings-head-readout" aria-hidden="true">
            <span>
              {customReady
                ? 'Custom'
                : warmupMode
                  ? 'English warm-up'
                  : languages.length === CODE_LANGUAGES.length
                    ? 'All languages'
                    : languages.join(' + ')}
            </span>
            <i />
            <span>
              {topic === 'any' || warmupMode
                ? codeLength
                : TOPIC_OPTIONS.find((t) => t.id === topic)?.label}
            </span>
            <i />
            <span>{timeLimit === 0 ? 'No limit' : `${timeLimit}s`}</span>
          </div>

          <button
            className="settings-modal-close"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="settings-modal-body">
          <div className="settings-grid">
            {/* ══ 01 — Race setup ══════════════════════ */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">01</span>
                <h3 className="settings-card-title">Race Setup</h3>
              </div>

              {/* Multi-select for code: a race draws from every
                  language switched on, so you can mix C++ and
                  JavaScript in one session. The last one cannot be
                  turned off — an empty mix has nothing to draw from.

                  English sits apart, past the divider: a plain-prose
                  warm-up that never mixes with code. Picking it
                  switches the code languages off; picking any code
                  language switches it off again. */}
              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Languages</span>
                  <span className="settings-section-sublabel">
                    {warmupMode
                      ? "Warm-up: doesn't count for rating or the leaderboard"
                      : languages.length === 1
                        ? 'Pick more than one to mix them'
                        : `Drawing from ${languages.length}`}
                  </span>
                </div>
                <div className="settings-segmented">
                  {CODE_LANGUAGES.map((lang) => {
                    const on = languages.includes(lang);
                    const only = on && languages.length === 1;
                    return (
                      <button
                        key={lang}
                        role="checkbox"
                        aria-checked={on}
                        title={only ? 'At least one language must stay on' : undefined}
                        className={`settings-seg-btn ${on ? 'active' : ''}`}
                        onClick={() => {
                          if (only) return;
                          const next = warmupMode
                            ? [lang]
                            : on
                              ? languages.filter((l) => l !== lang)
                              : CODE_LANGUAGES.filter(
                                  (l) => l === lang || languages.includes(l)
                                );
                          applyRaceConfig({ languages: next });
                        }}
                      >
                        {lang}
                      </button>
                    );
                  })}
                  <span className="settings-seg-divider" aria-hidden="true" />
                  <button
                    role="checkbox"
                    aria-checked={warmupMode}
                    title={
                      warmupMode
                        ? 'Pick a code language to switch back'
                        : "Plain-English warm-up. Laps don't count for your rating or the global leaderboard."
                    }
                    className={`settings-seg-btn ${warmupMode ? 'active' : ''}`}
                    onClick={() => {
                      if (!warmupMode) applyRaceConfig({ languages: [WARMUP_LANGUAGE] });
                    }}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Topic and symbol density describe code, so a warm-up
                  swaps both for a line saying why they are gone. */}
              {warmupMode ? (
                <p className="settings-warmup-note">
                  Topic and symbol filters are for code. English warm-ups
                  draw from every passage of the length below.
                </p>
              ) : (
                <>
                {/* A grid, not a segmented strip — twenty topics
                    would overflow a single row many times over. */}
                <div className="settings-sound-block">
                  <div className="settings-label-group">
                    <span className="settings-section-label">Topic</span>
                    <span className="settings-section-sublabel">
                      {topic === 'any'
                        ? 'Drawing from every category'
                        : `${topicCount} snippets available`}
                    </span>
                  </div>
                  <div
                    className="settings-sound-grid"
                    role="radiogroup"
                    aria-label="Snippet topic"
                  >
                    {TOPIC_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={topic === opt.id}
                        className={`settings-sound-btn ${topic === opt.id ? 'active' : ''}`}
                        onClick={() => applyRaceConfig({ topic: opt.id })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-label-group">
                    <span className="settings-section-label">Symbols</span>
                    <span className="settings-section-sublabel">
                      How brace- and operator-heavy
                    </span>
                  </div>
                  <div className="settings-segmented">
                    {DENSITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        className={`settings-seg-btn ${density === opt.id ? 'active' : ''}`}
                        onClick={() => applyRaceConfig({ density: opt.id })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                </>
              )}

              <div className="settings-section">
                <span className="settings-section-label">Length</span>
                <div className="settings-segmented">
                  {['short', 'medium', 'long'].map((len) => (
                    <button
                      key={len}
                      className={`settings-seg-btn ${codeLength === len ? 'active' : ''}`}
                      onClick={() => applyRaceConfig({ codeLength: len })}
                    >
                      {len.charAt(0).toUpperCase() + len.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Time Limit</span>
                  <span className="settings-section-sublabel">
                    Ends a single race
                  </span>
                </div>
                <div className="settings-segmented">
                  {[15, 30, 60, 120, 0].map((t) => (
                    <button
                      key={t}
                      className={`settings-seg-btn ${timeLimit === t ? 'active' : ''}`}
                      onClick={() => applyRaceConfig({ timeLimit: t })}
                    >
                      {t === 0 ? 'None' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ Custom snippet ══════════════════════════
                Overrides the dataset entirely while it is on, so
                the filters above are left alone rather than being
                disabled — turning this off puts you straight back
                on whatever draw they had produced. */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">02</span>
                <h3 className="settings-card-title">Custom Snippet</h3>
                <span className="settings-card-note">
                  {customReady
                    ? `${customSnippet.trim().length} chars · ${warmupMode ? 'shown as plain text' : `highlighted as ${languages[0]}`}`
                    : 'Paste your own code'}
                </span>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Use my code</span>
                  <span className="settings-section-sublabel">
                    {useCustom && customSnippet.trim().length === 0
                      ? 'Paste something below to switch over'
                      : 'Race your own snippet instead of the library'}
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-custom">
                  <input
                    type="checkbox"
                    id="toggle-custom"
                    checked={useCustom}
                    onChange={() => {
                      setUseCustom((v) => !v);
                      restartRace();
                    }}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <textarea
                className="settings-custom-input"
                value={customSnippet}
                spellCheck="false"
                aria-label="Custom snippet code"
                placeholder={"function hello(name) {\n  return 'hi ' + name;\n}"}
                onChange={(e) => setCustomSnippet(e.target.value)}
                /* Tab must indent the paste, not jump focus out of
                   the field — this is a code editor, however small. */
                onKeyDown={(e) => {
                  if (e.key !== 'Tab') return;
                  e.preventDefault();
                  const el = e.target;
                  const { selectionStart: a, selectionEnd: b, value } = el;
                  const next = `${value.slice(0, a)}  ${value.slice(b)}`;
                  setCustomSnippet(next);
                  window.requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = a + 2;
                  });
                }}
              />

              <div className="settings-custom-actions">
                <button
                  type="button"
                  className="settings-mini-btn"
                  disabled={customSnippet.length === 0}
                  onClick={() => {
                    setCustomSnippet('');
                    setUseCustom(false);
                    restartRace();
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="settings-mini-btn is-primary"
                  disabled={customSnippet.trim().length === 0}
                  onClick={() => {
                    setUseCustom(true);
                    restartRace();
                  }}
                >
                  Race this
                </button>
              </div>
            </section>

            {/* ══ 03 — Training ════════════════════════
                A *daily* target measured in active racing time,
                not a per-race limit like Time Limit above — hence
                its own card rather than a row next to it.

                Today's progress lives here rather than on the
                dashboard, so the number sits beside the control
                that changes it and out of sight while you type. */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">03</span>
                <h3 className="settings-card-title">Training</h3>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Daily Practice Goal</span>
                  <span className="settings-section-sublabel">
                    Counts active typing only
                  </span>
                </div>
                <div className="settings-segmented">
                  {GOAL_OPTIONS.map((option) => (
                    <button
                      key={option.ms}
                      className={`settings-seg-btn ${practiceGoalMs === option.ms ? 'active' : ''}`}
                      onClick={() => setPracticeGoal(option.ms)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-practice">
                <div className="settings-practice-top">
                  <span className="settings-practice-caption">Today</span>
                  <span
                    className={`settings-practice-readout ${practiceGoalReached ? 'is-done' : ''}`}
                  >
                    <strong>{formatPractice(practiceMs)}</strong>
                    {' / '}
                    {formatPractice(practiceGoalMs)}
                    {practiceGoalReached ? ' — goal met' : ''}
                  </span>
                </div>
                <div className="settings-practice-bar">
                  <div
                    className={`settings-practice-bar-fill ${practiceGoalReached ? 'is-done' : ''}`}
                    style={{ width: `${practiceProgress * 100}%` }}
                  />
                </div>
              </div>
            </section>

            {/* ══ 03 — Typing ══════════════════════════ */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">04</span>
                <h3 className="settings-card-title">Typing</h3>
              </div>

              <div className="settings-section">
                <span className="settings-section-label">Caret Style</span>
                <div className="settings-segmented">
                  {['thin', 'thick', 'caret-only'].map((style) => (
                    <button
                      key={style}
                      className={`settings-seg-btn ${caretStyle === style ? 'active' : ''}`}
                      onClick={() => setCaretStyle(style)}
                    >
                      {style === 'caret-only' ? 'Caret Only' : style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Strict Mode</span>
                  <span className="settings-section-sublabel">
                    Stop on a mistake until it&apos;s corrected
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-strict">
                  <input
                    type="checkbox"
                    id="toggle-strict"
                    checked={strictMode}
                    onChange={() => setStrictMode((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Indentation</span>
                  <span className="settings-section-sublabel">
                    {autoIndent
                      ? 'Enter carries you past the indent'
                      : 'Type every leading space yourself'}
                  </span>
                </div>
                <div className="settings-segmented">
                  <button
                    className={`settings-seg-btn ${autoIndent ? 'active' : ''}`}
                    onClick={() => setAutoIndent(true)}
                  >
                    Auto-skip
                  </button>
                  <button
                    className={`settings-seg-btn ${!autoIndent ? 'active' : ''}`}
                    onClick={() => setAutoIndent(false)}
                  >
                    Manual
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Freedom Mode</span>
                  <span className="settings-section-sublabel">
                    Delete any character, even correct ones
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-freedom">
                  <input
                    type="checkbox"
                    id="toggle-freedom"
                    checked={freedomMode}
                    onChange={() => setFreedomMode((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Virtual Keyboard</span>
                  <span className="settings-section-sublabel">
                    On-screen key highlighting
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-keyboard">
                  <input
                    type="checkbox"
                    id="toggle-keyboard"
                    checked={showKeyboard}
                    onChange={() => setShowKeyboard((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>
            </section>

            {/* ══ Focus ═══════════════════════════════════
                Every option here defaults to how the app already
                behaved, so none of this changes anyone's typing
                experience unless they ask for it. */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">05</span>
                <h3 className="settings-card-title">Focus</h3>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Zen Mode</span>
                  <span className="settings-section-sublabel">
                    Hide the dashboard, keyboard, progress and radio
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-zen">
                  <input
                    type="checkbox"
                    id="toggle-zen"
                    checked={zenMode}
                    onChange={() => setZenMode((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Hide Live WPM</span>
                  <span className="settings-section-sublabel">
                    Masked while racing, revealed at the flag
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-hidewpm">
                  <input
                    type="checkbox"
                    id="toggle-hidewpm"
                    checked={hideLiveWpm}
                    onChange={() => setHideLiveWpm((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Blind Mode</span>
                  <span className="settings-section-sublabel">
                    No error highlighting until the race ends
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-blind">
                  <input
                    type="checkbox"
                    id="toggle-blind"
                    checked={blindMode}
                    onChange={() => setBlindMode((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Highlight</span>
                  <span className="settings-section-sublabel">
                    {highlightMode === 'character'
                      ? 'Just the next character'
                      : highlightMode === 'word'
                        ? 'The word you are typing'
                        : 'The word after this one'}
                  </span>
                </div>
                <div className="settings-segmented">
                  {[
                    { id: 'character', label: 'Char' },
                    { id: 'word', label: 'Word' },
                    { id: 'next-word', label: 'Next' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      className={`settings-seg-btn ${highlightMode === opt.id ? 'active' : ''}`}
                      onClick={() => setHighlightMode(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Caret Blink</span>
                  <span className="settings-section-sublabel">
                    Pulse the caret, or hold it steady
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-blink">
                  <input
                    type="checkbox"
                    id="toggle-blink"
                    checked={caretBlink}
                    onChange={() => setCaretBlink((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Smooth Caret</span>
                  <span className="settings-section-sublabel">
                    Glide between characters instead of snapping
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-smooth">
                  <input
                    type="checkbox"
                    id="toggle-smooth"
                    checked={smoothCaret}
                    onChange={() => setSmoothCaret((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Ghost Lap</span>
                  <span className="settings-section-sublabel">
                    Race a translucent caret replaying your best lap
                    on this snippet
                  </span>
                </div>
                <label className="settings-toggle" htmlFor="toggle-ghost">
                  <input
                    type="checkbox"
                    id="toggle-ghost"
                    checked={ghostCaret}
                    onChange={() => setGhostCaret((v) => !v)}
                  />
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                </label>
              </div>

              {ghostCaret && (
                <div className="settings-section">
                  <div className="settings-label-group">
                    <span className="settings-section-label">Ghost Source</span>
                    <span className="settings-section-sublabel">
                      Your own best, or the fastest lap on the track&apos;s
                      board — your best stands in when it has none
                    </span>
                  </div>
                  <div className="settings-segmented" role="radiogroup" aria-label="Ghost source">
                    {[
                      { id: "mine", label: "My best" },
                      { id: "record", label: "Record" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={ghostSource === opt.id}
                        className={`settings-seg-btn${ghostSource === opt.id ? " active" : ""}`}
                        onClick={() => setGhostSource(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ══ Audio ════════════════════════════════ */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">06</span>
                <h3 className="settings-card-title">Audio</h3>
              </div>

              {/* A grid rather than a segmented row: thirteen
                  switches would overflow a single strip long before
                  they all fit. */}
              <div className="settings-sound-block">
                <div className="settings-label-group">
                  <span className="settings-section-label">Key Sound</span>
                  <span className="settings-section-sublabel">
                    Click any switch to hear it
                  </span>
                </div>
                <div
                  className="settings-sound-grid"
                  role="radiogroup"
                  aria-label="Key sound profile"
                >
                  {SOUND_PROFILES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={soundProfile === p.id}
                      className={`settings-sound-btn ${soundProfile === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setSoundProfile(p.id);
                        /* Audition it immediately — picking a switch
                           you can't hear until the next race is a
                           guess, not a choice. The id is passed
                           explicitly because this runs before the
                           effect that syncs the hook's profile ref. */
                        if (p.id !== 'off') sound.click(true, { profile: p.id });
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Volume</span>
                  <span className="settings-section-sublabel">
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  className="settings-range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  disabled={soundProfile === 'off'}
                  aria-label="Sound volume"
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  onMouseUp={() => sound.click(true, {})}
                />
              </div>

              <div className="settings-section">
                <div className="settings-label-group">
                  <span className="settings-section-label">Race Engineer</span>
                  <span className="settings-section-sublabel">
                    Radio messages during a race
                  </span>
                </div>
                <div className="settings-segmented">
                  {ENGINEER_VERBOSITY.map((v) => (
                    <button
                      key={v.id}
                      className={`settings-seg-btn ${engineerVerbosity === v.id ? 'active' : ''}`}
                      onClick={() => setEngineerVerbosity(v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ 05 — Typeface ════════════════════════ */}
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">07</span>
                <h3 className="settings-card-title">Typeface</h3>
                <span className="settings-card-note">
                  {getFont(globalFont).note}
                </span>
              </div>

              <div className="settings-section">
                <span className="settings-section-label">Size</span>
                <div className="settings-segmented">
                  {[
                    { label: 'S', value: '1.5rem' },
                    { label: 'M', value: '2rem' },
                    { label: 'L', value: '2.5rem' },
                    { label: 'XL', value: '3rem' },
                  ].map((size) => (
                    <button
                      key={size.value}
                      className={`settings-seg-btn ${fontSize === size.value ? 'active' : ''}`}
                      onClick={() => setFontSize(size.value)}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <span className="settings-section-label">Line Height</span>
                <div className="settings-segmented">
                  {[
                    { label: 'Tight', value: '1.4' },
                    { label: 'Normal', value: '1.8' },
                    { label: 'Loose', value: '2.2' },
                  ].map((lh) => (
                    <button
                      key={lh.value}
                      className={`settings-seg-btn ${lineHeight === lh.value ? 'active' : ''}`}
                      onClick={() => setLineHeight(lh.value)}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="settings-font-grid"
                role="radiogroup"
                aria-label="Font family"
              >
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={globalFont === f.id}
                    aria-label={`${f.label} — ${f.note}`}
                    title={f.note}
                    className={`settings-font-btn ${globalFont === f.id ? 'active' : ''}`}
                    onClick={() => setGlobalFont(f.id)}
                  >
                    {/* Rendered in the face itself, so the choice is
                        visible before you commit to it. */}
                    <span
                      className="settings-font-sample"
                      style={{ fontFamily: fontPreview(f.id) }}
                    >
                      Aa0{'{}'}
                    </span>
                    <span className="settings-font-name">{f.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ══ 06 — Livery (theme), full width ══════ */}
            <section className="settings-card settings-card-wide">
              <div className="settings-card-head">
                <span className="settings-card-index" aria-hidden="true">08</span>
                <h3 className="settings-card-title">Livery</h3>
                <span className="settings-card-note">{getTheme(theme).blurb}</span>
              </div>

              {THEME_GROUPS.map((group) => (
                <div key={group.scheme} className="settings-theme-group">
                  <span className="settings-theme-group-label">{group.label}</span>
                  <div
                    className="settings-theme-grid"
                    role="radiogroup"
                    aria-label={`${group.label} colour themes`}
                  >
                    {group.themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={theme === t.id}
                        aria-label={`${t.label} — ${t.blurb}`}
                        title={`${t.label} — ${t.blurb}`}
                        className={`settings-theme-swatch ${theme === t.id ? "active" : ""}`}
                        onClick={() => handleThemeChange(t.id)}
                      >
                        <span
                          className="settings-theme-chip"
                          style={{ background: t.swatch.bg, borderColor: t.swatch.surface }}
                        >
                          <span
                            className="settings-theme-dot"
                            style={{ background: t.swatch.accent }}
                          />
                          <span
                            className="settings-theme-bar"
                            style={{ background: t.swatch.text }}
                          />
                        </span>
                        <span className="settings-theme-name">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* ══ Danger zone ═════════════════════════════
              Last thing in the scroll, deliberately: reaching it
              means scrolling past every setting it would undo.
              It was previously in the modal footer — persistent
              chrome, always one click from arming, right where
              the eye rests. A destructive action belongs at the
              end of the content it destroys, visually separated
              and never styled as something to press casually. */}
          <section className="settings-danger">
            <div className="settings-danger-copy">
              <h3 className="settings-danger-title">Reset all settings</h3>
              <p className="settings-danger-text">
                Puts every option above back to its default, on this
                device and on your account. Your account, race stats
                and practice history are not affected.
              </p>
            </div>

            {resetArmed ? (
              <div className="settings-danger-actions">
                <span className="settings-danger-ask">
                  This cannot be undone
                </span>
                <button
                  type="button"
                  className="settings-mini-btn"
                  onClick={() => setResetArmed(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-mini-btn is-danger"
                  onClick={handleResetSettings}
                >
                  Yes, reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="settings-mini-btn is-danger-outline"
                onClick={() => setResetArmed(true)}
              >
                Reset settings
              </button>
            )}
          </section>
        </div>

        <footer className="settings-modal-footer">
          <span className="settings-foot-label">Loaded</span>
          <span className="settings-snippet-chip">
            {customReady
              ? 'Your custom snippet'
              : `${dsaSnippet.title} · ${dsaSnippet.language} · ${dsaSnippet.topic} · ${dsaSnippet.difficulty}`}
          </span>
          <span className="settings-foot-hint">
            <kbd>Esc</kbd> to close
          </span>
        </footer>
      </div>
    </>
  );
}

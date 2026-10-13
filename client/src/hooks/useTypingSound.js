import { useCallback, useEffect, useMemo, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   useTypingSound — synthesised keyboard and race audio.

   Everything is generated with the Web Audio API rather than
   shipped as files: samples would be hundreds of KB, would need
   preloading before the first keystroke felt right, and every
   press would be bit-identical — which is exactly what makes a
   fast run sound fake.

   ── How a keypress is built ────────────────────────────────
   A switch is not a tone. What your ear identifies as "thocky"
   or "clacky" is a short broadband impact ringing a resonant
   cavity — the case, the plate, the keycap. So each press is
   three layers rather than a beep:

     sub    a low sine thump — the bottom-out you feel
     body   white noise through a HIGH-Q BANDPASS, which rings
            at the filter frequency; this is the layer that
            carries almost all of the perceived character
     click  a brief high-passed noise tick — the leaf, the
            stem, the plastic

   Sweeping the body filter downward gives a "pop"; a second
   delayed click gives the two-stage rattle of a real clicky
   switch. Profiles differ mostly in where the body resonance
   sits and how sharp it is, which is what the earlier
   sine-based version could not express — every profile came out
   a variation on the same beep.
   ══════════════════════════════════════════════════════════════ */

export const SOUND_PROFILES = [
  { id: "off", label: "Off" },
  { id: "thocky", label: "Thocky" },
  { id: "creamy", label: "Creamy" },
  { id: "holypanda", label: "Holy Panda" },
  { id: "topre", label: "Topre" },
  { id: "clacky", label: "Clacky" },
  { id: "marble", label: "Marble" },
  { id: "poppy", label: "Poppy" },
  { id: "clicky", label: "Clicky" },
  { id: "alps", label: "Blue Alps" },
  { id: "buckling", label: "Buckling Spring" },
  { id: "typewriter", label: "Typewriter" },
  { id: "silent", label: "Silent" },
];

export const DEFAULT_SOUND_PROFILE = "off";
export const DEFAULT_VOLUME = 0.5;

/* ── Output stage ─────────────────────────────────────────────
   Every voice here is short (a keypress body decays in ~60ms) and
   most of its energy is squeezed through a high-Q bandpass, so the
   signal that actually reaches the speakers carries far less energy
   than the per-layer `level` numbers suggest. Perceived loudness
   integrates over time, and there is very little time.

   The fix is gain staging rather than louder layers: drive the
   master well past unity and put a limiter after it. Raising the
   layers instead would change the voicing that separates the twelve
   profiles from each other.
   ────────────────────────────────────────────────────────────── */

/** Master drive. `volume` is 0..1 from the slider (not 0..100), so
    this is the headroom multiplier on top of it. */
const MASTER_BOOST = 3;

/**
 * Post-master compressor.
 *
 * Every value here was chosen by rendering 24 keypresses at 100ms
 * through an OfflineAudioContext and measuring peak / RMS / clipped
 * samples, because the obvious settings do not survive contact with
 * this signal:
 *
 *  - attack 2ms LETS THE TRANSIENT THROUGH. These voices are almost
 *    entirely transient, so the compressor clamped down after the
 *    peak had already passed and 12 samples per burst clipped at the
 *    slider's top end. 0.5ms catches it.
 *  - Going harder is counter-productive. DynamicsCompressorNode has
 *    no makeup gain, so ratio 20 at -24dB measured 1-2dB QUIETER than
 *    doing nothing: it removed level and gave nothing back.
 */
const COMPRESSOR = {
  threshold: -12,  // dB — start working early
  knee: 10,        // dB — soft transition, no audible "grab"
  ratio: 10,       // heavy squashing on peaks
  attack: 0.0005,  // s — fast enough to catch the transient itself
  release: 0.1,    // s — recovered before the next key at 120wpm
};

/**
 * Final trim after the compressor.
 *
 * The compressor alone still overshoots on the first transient of a
 * burst; measured peak at full slider was 1.17 without this, i.e.
 * clipping. 0.8 buys the headroom that makes the whole range
 * clip-free, and costs less than the compression gains back.
 */
const OUTPUT_TRIM = 0.8;

/** Slider position to master gain. One place, so the initial value
    and every later change can never disagree about the boost. */
const masterGainFor = (volume) => volume * MASTER_BOOST;

/* Keys with a bigger keycap and a longer stabiliser ring deeper than
   the alphas — the single most recognisable detail of a real board. */
const BIG_KEYS = new Set([" ", "Enter", "Backspace", "Tab", "Shift"]);

const VOICES = {
  /* Deep, dark, dampened. Almost no top end — a heavy foam-filled
     case swallowing the transient. */
  thocky: {
    sub: { freq: 104, level: 0.6, decay: 0.085 },
    body: { freq: 180, q: 8, level: 0.8, decay: 0.06 },
    click: { freq: 1600, level: 0.08, decay: 0.009 },
    variance: 0.05,
    bigScale: 0.8,
  },

  /* Smooth and rounded, pitched a little above thocky, with a longer
     unhurried tail — heavily lubed, no rattle anywhere. */
  creamy: {
    sub: { freq: 128, level: 0.42, decay: 0.1 },
    body: { freq: 295, q: 4.5, level: 0.6, decay: 0.085 },
    click: { freq: 2400, level: 0.1, decay: 0.012 },
    variance: 0.04,
    bigScale: 0.84,
  },

  /* Deep like thocky but with a real tactile snap on top — the bump
     you hear as well as feel. Rounder and louder in the mids than a
     linear, which is most of why it became the reference switch. */
  holypanda: {
    sub: { freq: 112, level: 0.55, decay: 0.08 },
    body: { freq: 332, q: 9, level: 0.8, decay: 0.07 },
    click: { freq: 2100, level: 0.24, decay: 0.013 },
    variance: 0.05,
    bigScale: 0.82,
  },

  /* Electrocapacitive: a rubber dome collapsing into a deep resonant
     case. Soft, low top end, with a second dome-thump just behind the
     main body rather than a plastic tick. */
  topre: {
    sub: { freq: 118, level: 0.5, decay: 0.105 },
    body: { freq: 212, q: 5, level: 0.64, decay: 0.08 },
    click: { freq: 900, level: 0.13, decay: 0.02 },
    click2: { freq: 620, q: 3, level: 0.14, decay: 0.045, delay: 0.007 },
    variance: 0.04,
    bigScale: 0.83,
  },

  /* Glassy and tuneful — a very high Q so the body rings almost like
     a pitched note, with hardly any low end under it. */
  marble: {
    sub: { freq: 195, level: 0.18, decay: 0.03 },
    body: { freq: 1240, q: 15, level: 0.7, decay: 0.055 },
    click: { freq: 5200, level: 0.24, decay: 0.008 },
    variance: 0.07,
    bigScale: 0.85,
  },

  /* Vintage clicky. Sharper and higher than an MX click, and the two
     transients sit closer together — a tighter, more brittle tick. */
  alps: {
    sub: { freq: 145, level: 0.22, decay: 0.03 },
    body: { freq: 1150, q: 4.5, level: 0.5, decay: 0.03 },
    click: { freq: 7200, level: 0.55, decay: 0.006 },
    click2: { freq: 6000, level: 0.3, decay: 0.009, delay: 0.011 },
    variance: 0.07,
    bigScale: 0.9,
  },

  /* Model M. The giveaway is not the click but the SPRING PING that
     rings on after it — a very high Q resonance with a long decay,
     which no other profile here has. */
  buckling: {
    sub: { freq: 132, level: 0.45, decay: 0.06 },
    body: { freq: 780, q: 4, level: 0.6, decay: 0.045 },
    click: { freq: 5200, level: 0.6, decay: 0.012 },
    click2: { freq: 3400, q: 20, level: 0.3, decay: 0.3, delay: 0.012 },
    variance: 0.06,
    bigScale: 0.88,
  },

  /* Dampened. Enough of a thud to confirm the keypress landed and
     almost nothing above it — for typing next to other people. */
  silent: {
    sub: { freq: 110, level: 0.3, decay: 0.05 },
    body: { freq: 250, q: 2, level: 0.3, decay: 0.035 },
    click: { freq: 1800, level: 0.05, decay: 0.006 },
    variance: 0.03,
    bigScale: 0.85,
  },

  /* Bright, hard, plastic. Resonance up near 1kHz and a loud tick:
     thin case, hard plate, PBT caps. */
  clacky: {
    sub: { freq: 165, level: 0.2, decay: 0.032 },
    body: { freq: 980, q: 3, level: 0.62, decay: 0.028 },
    click: { freq: 4800, level: 0.45, decay: 0.013 },
    variance: 0.09,
    bigScale: 0.88,
  },

  /* The body filter sweeps sharply downward, which is what a "pop"
     physically is — a resonance falling in pitch as it decays. High Q
     keeps it tuneful rather than noisy. */
  poppy: {
    sub: { freq: 175, level: 0.3, decay: 0.055 },
    body: { freq: 640, endFreq: 290, q: 13, level: 0.78, decay: 0.105 },
    click: { freq: 3200, level: 0.16, decay: 0.009 },
    variance: 0.1,
    bigScale: 0.78,
  },

  /* Two transients a few milliseconds apart — the click leaf firing,
     then the bottom-out. That gap is the whole character. */
  clicky: {
    sub: { freq: 150, level: 0.18, decay: 0.028 },
    body: { freq: 1450, q: 5.5, level: 0.4, decay: 0.026 },
    click: { freq: 6200, level: 0.6, decay: 0.007 },
    click2: { freq: 5000, level: 0.36, decay: 0.011, delay: 0.017 },
    variance: 0.06,
    bigScale: 0.9,
  },

  /* Heavy mechanical slap with a metallic afterthought — the type bar
     hitting the platen, then the carriage. */
  typewriter: {
    sub: { freq: 92, level: 0.62, decay: 0.12 },
    body: { freq: 235, q: 2.5, level: 0.72, decay: 0.1 },
    click: { freq: 3000, level: 0.5, decay: 0.028 },
    click2: { freq: 1500, level: 0.3, decay: 0.055, q: 2.5, delay: 0.038 },
    variance: 0.05,
    bigScale: 0.85,
  },
};

/** One short burst of white noise, reused for every layer. */
function buildNoiseBuffer(ctx) {
  const frames = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export default function useTypingSound({ profile, volume }) {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const noiseRef = useRef(null);
  const compressorRef = useRef(null);

  /* Read settings through refs so the returned callbacks stay stable —
     they are handed to RaceTrack, and a new identity every render would
     re-bind its keydown listener on every keystroke. */
  const profileRef = useRef(profile);
  const volumeRef = useRef(volume);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    volumeRef.current = volume;
    /* Must go through masterGainFor as well — setting the raw slider
       value here would quietly undo the boost the moment anyone
       touched the volume control. */
    if (masterRef.current) {
      masterRef.current.gain.value = masterGainFor(volume);
    }
  }, [volume]);

  const getContext = useCallback((profileOverride) => {
    const active = profileOverride ?? profileRef.current;
    if (active === "off") return null;

    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null; // No Web Audio — stay silent rather than throw.
      const ctx = new Ctx();

      /* Signal path:
           every voice -> master gain -> compressor -> trim -> out
         The compressor and trim together are the only thing between
         a 3x master and clipping, so nothing may connect around
         them — every layer must target masterRef. */
      const trim = ctx.createGain();
      trim.gain.value = OUTPUT_TRIM;
      trim.connect(ctx.destination);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = COMPRESSOR.threshold;
      compressor.knee.value = COMPRESSOR.knee;
      compressor.ratio.value = COMPRESSOR.ratio;
      compressor.attack.value = COMPRESSOR.attack;
      compressor.release.value = COMPRESSOR.release;
      compressor.connect(trim);

      const master = ctx.createGain();
      master.gain.value = masterGainFor(volumeRef.current);
      master.connect(compressor);

      ctxRef.current = ctx;
      masterRef.current = master;
      compressorRef.current = compressor;
      noiseRef.current = buildNoiseBuffer(ctx);
    }

    /* Autoplay policy can leave a fresh context suspended until a
       gesture; resume is a no-op when it is already running. */
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  /* ── Layer primitives ──────────────────────────────────────── */

  /**
   * Filtered noise burst. With `type: "bandpass"` and a high Q this
   * rings rather than hisses — that ring is the body of the keypress.
   */
  const noiseLayer = useCallback(
    (ctx, { freq, endFreq, q = 1, level, decay, type = "bandpass", delay = 0 }) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseRef.current;

      const filter = ctx.createBiquadFilter();
      filter.type = type;
      const now = ctx.currentTime + delay;
      filter.frequency.setValueAtTime(freq, now);
      if (endFreq) {
        /* The downward sweep that turns a resonance into a "pop". */
        filter.frequency.exponentialRampToValueAtTime(endFreq, now + decay);
      }
      filter.Q.value = q;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      src.connect(filter).connect(gain).connect(masterRef.current);
      src.start(now);
      src.stop(now + decay + 0.03);
    },
    []
  );

  /** Low sine thump — the bottom-out. */
  const subLayer = useCallback(
    (ctx, { freq, level, decay, type = "sine", delay = 0 }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const gain = ctx.createGain();
      const now = ctx.currentTime + delay;

      osc.frequency.setValueAtTime(freq, now);
      /* Drop a little in pitch as it decays; a struck object never
         holds a constant frequency. */
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + decay);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain).connect(masterRef.current);
      osc.start(now);
      osc.stop(now + decay + 0.03);
    },
    []
  );

  /**
   * A clean held tone.
   *
   * Separate from subLayer because that one droops to 0.75x pitch as
   * it decays — right for a key bottoming out, wrong for a chime,
   * where a sagging pitch reads as a mistake rather than a note.
   */
  const toneLayer = useCallback(
    (ctx, { freq, level, attack = 0.006, decay, type = "sine", delay = 0 }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const gain = ctx.createGain();
      const now = ctx.currentTime + delay;

      osc.frequency.setValueAtTime(freq, now);

      /* exponentialRamp cannot reach or leave zero, hence the 0.0001
         floor on both ends — the same idiom the layers above use. */
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain).connect(masterRef.current);
      osc.start(now);
      osc.stop(now + decay + 0.03);
    },
    []
  );

  /* ── Public voices ─────────────────────────────────────────── */

  /**
   * One keypress.
   *
   * `profile` overrides the stored setting so the settings picker can
   * audition a switch in the same tick it selects it — before the
   * effect that syncs profileRef has run.
   */
  const click = useCallback(
    (isCorrect = true, { key, profile: profileOverride } = {}) => {
      const ctx = getContext(profileOverride);
      if (!ctx) return;
      const voice = VOICES[profileOverride ?? profileRef.current];
      if (!voice) return;

      if (!isCorrect) {
        /* Dull, low and slightly sour — deliberately unlike any of the
           switch profiles, so a mistake registers without looking. */
        noiseLayer(ctx, { freq: 220, q: 1.2, level: 0.5, decay: 0.07, type: "lowpass" });
        subLayer(ctx, { freq: 98, level: 0.4, decay: 0.14, type: "triangle" });
        return;
      }

      /* Per-press detune, so a fast run never sounds like one sample
         on repeat, and a deeper voicing for the big stabilised keys. */
      const drift = 1 + (Math.random() * 2 - 1) * voice.variance;
      const scale = (BIG_KEYS.has(key) ? voice.bigScale : 1) * drift;

      subLayer(ctx, {
        freq: voice.sub.freq * scale,
        level: voice.sub.level,
        decay: voice.sub.decay,
      });

      noiseLayer(ctx, {
        freq: voice.body.freq * scale,
        endFreq: voice.body.endFreq ? voice.body.endFreq * scale : undefined,
        q: voice.body.q,
        level: voice.body.level,
        decay: voice.body.decay,
      });

      noiseLayer(ctx, {
        freq: voice.click.freq * scale,
        q: voice.click.q ?? 1,
        level: voice.click.level,
        decay: voice.click.decay,
        type: "highpass",
      });

      if (voice.click2) {
        noiseLayer(ctx, {
          freq: voice.click2.freq * scale,
          q: voice.click2.q ?? 1,
          level: voice.click2.level,
          decay: voice.click2.decay,
          type: voice.click2.q ? "bandpass" : "highpass",
          delay: voice.click2.delay,
        });
      }
    },
    [getContext, noiseLayer, subLayer]
  );

  /** Five ascending blips, then the drop — the start-light sequence. */
  const lightsOut = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    for (let i = 0; i < 5; i++) {
      subLayer(ctx, {
        freq: 440,
        level: 0.16,
        decay: 0.09,
        type: "square",
        delay: i * 0.11,
      });
    }
    subLayer(ctx, {
      freq: 880,
      level: 0.24,
      decay: 0.35,
      type: "sawtooth",
      delay: 0.62,
    });
  }, [getContext, subLayer]);

  /** Two-note chime on the chequered flag. */
  const chequered = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    subLayer(ctx, { freq: 660, level: 0.2, decay: 0.22, type: "triangle" });
    subLayer(ctx, {
      freq: 990,
      level: 0.18,
      decay: 0.4,
      type: "triangle",
      delay: 0.13,
    });
  }, [getContext, subLayer]);

  /* ══════════════════════════════════════════════════════════════
     Celebrations — the reward for crossing the line ahead of a
     record. Both route through getContext, so they honour the
     `off` profile and the volume slider exactly like every other
     voice: a silenced keyboard stays silenced.
     ══════════════════════════════════════════════════════════════ */

  /**
   * Personal best — a broadcast telemetry chime.
   *
   * Three rising staccato notes, the kind that plays under a
   * qualifying graphic. Each note is a sine fundamental with a
   * quiet triangle an octave above: the octave adds the glassy
   * edge that reads as "instrument", where a bare sine reads as a
   * test tone.
   */
  const playPersonalBest = useCallback(
    (ctx) => {
      const notes = [
        { freq: 800, delay: 0, decay: 0.13 },
        { freq: 1200, delay: 0.1, decay: 0.13 },
        /* The third lands a fifth above and rings roughly three
           times as long — the arrival, rather than a third blip. */
        { freq: 1800, delay: 0.2, decay: 0.42 },
      ];

      for (const n of notes) {
        toneLayer(ctx, {
          freq: n.freq,
          level: 0.22,
          decay: n.decay,
          type: "sine",
          delay: n.delay,
        });
        toneLayer(ctx, {
          freq: n.freq * 2,
          level: 0.05,
          decay: n.decay * 0.7,
          type: "triangle",
          delay: n.delay,
        });
      }
    },
    [toneLayer]
  );

  /**
   * Track record — a high-RPM Doppler fly-by.
   *
   * Two sawtooths an octave apart through one low-pass, because an
   * engine is a harmonic stack and a single oscillator sounds like
   * a synth lead instead. The shape is: accelerate, upshift,
   * accelerate, then the pitch collapses as the car goes past.
   *
   * The pitch drop at the end is the Doppler shift. The filter
   * follows it — a receding car loses its top end as well as its
   * pitch, and sweeping only the frequency sounds like a slowing
   * engine rather than a departing one.
   */
  const playTrackRecord = useCallback(
    (ctx) => {
      const t0 = ctx.currentTime;
      const END = 0.95;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 6;
      filter.frequency.setValueAtTime(700, t0);
      filter.frequency.linearRampToValueAtTime(4800, t0 + 0.6);
      filter.frequency.linearRampToValueAtTime(900, t0 + END);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.18); // approach
      gain.gain.setValueAtTime(0.28, t0 + 0.58);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + END); // past

      /* Left to right across the whole pass. StereoPannerNode is
         absent on older Safari; without it the fly-by still works,
         it simply happens in the middle of the image. */
      let tail = gain;
      if (typeof ctx.createStereoPanner === "function") {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(-0.9, t0);
        panner.pan.linearRampToValueAtTime(0.9, t0 + END);
        gain.connect(panner);
        tail = panner;
      }
      tail.connect(filter).connect(masterRef.current);

      for (const [mult, level] of [
        [1, 1],
        [0.5, 0.55], // sub-octave, for the weight
      ]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        const f = osc.frequency;

        /* Rev, upshift, rev, then the Doppler collapse. The dip at
           0.42s is the gear change: revs fall as the clutch goes in
           and climb again on the other side. */
        f.setValueAtTime(400 * mult, t0);
        f.linearRampToValueAtTime(1150 * mult, t0 + 0.4);
        f.linearRampToValueAtTime(900 * mult, t0 + 0.46);
        f.linearRampToValueAtTime(1250 * mult, t0 + 0.6);
        f.linearRampToValueAtTime(430 * mult, t0 + 0.82);

        const oscGain = ctx.createGain();
        oscGain.gain.value = level;
        osc.connect(oscGain).connect(gain);
        osc.start(t0);
        osc.stop(t0 + END + 0.05);
      }
    },
    []
  );

  /**
   * Fire a celebration.
   *
   * @param {"pb"|"record"} type
   */
  const playCelebration = useCallback(
    (type) => {
      const ctx = getContext();
      if (!ctx) return;
      if (type === "record") playTrackRecord(ctx);
      else if (type === "pb") playPersonalBest(ctx);
    },
    [getContext, playPersonalBest, playTrackRecord]
  );

  /* Close the context on unmount — browsers cap how many a page may
     hold open. */
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      masterRef.current = null;
      compressorRef.current = null;
      noiseRef.current = null;
      if (ctx && ctx.state !== "closed") ctx.close();
    };
  }, []);

  return useMemo(
    () => ({ click, lightsOut, chequered, playCelebration }),
    [click, lightsOut, chequered, playCelebration]
  );
}

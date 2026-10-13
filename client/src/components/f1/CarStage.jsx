import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import BrandLogo from "../BrandLogo";
import StageBoundary from "./StageBoundary";

/* The canvas and everything in it — three.js, the circuit, the car —
   arrive as their own chunk, so the form is on screen and usable first. */
const StageCanvas = lazy(() => import("./StageCanvas"));

/* ══════════════════════════════════════════════════════════════
   CarStage — the left half of both auth pages: the 3D car, its
   lighting rig, the zoom box and the panel furniture over it.

   /signup drives the four `*In` flags from field validation so the
   car assembles as you type; /signin passes them all true so the
   car arrives already built.
   ══════════════════════════════════════════════════════════════ */

const ZOOM_BUTTON =
  "flex h-9 w-9 items-center justify-center border border-white/20 bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]";

export default function CarStage({
  chassisIn,
  wheelsIn,
  wingsIn,
  secure,
  launching,
  reduced,
  autoRotate = false,
  children,
}) {
  /* This panel is a zoom box: a zoom gesture inside it moves the camera and
     never the page, while a zoom gesture anywhere else stays the browser's
     own — deliberately, since hijacking page zoom everywhere would break
     the one accessibility affordance people rely on to read.

     Reading the gesture off the wheel event rather than off keyboard state
     is what makes trackpad pinch work: a pinch synthesises a wheel event
     with ctrlKey set without any key ever going down. */
  const panelRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomBy = useCallback((factor) => zoomRef.current?.(factor), []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    /* Exponential so each notch is a constant ratio — the dolly feels the
       same whether the camera is near or far, and it composes with the
       buttons' fixed 1.25 steps. */
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // a plain scroll is the page's
      e.preventDefault();
      zoomRef.current?.(Math.exp(e.deltaY * 0.0025));
    };

    /* Safari sends non-standard gesture events for pinch instead of a
       ctrlKey wheel, so it needs its own path. e.scale grows as the fingers
       spread, hence prev/current: spreading gives a factor below 1, which
       pulls the camera in. */
    let lastScale = 1;
    const onGestureStart = (e) => {
      e.preventDefault();
      lastScale = e.scale || 1;
    };
    const onGestureChange = (e) => {
      e.preventDefault();
      const scale = e.scale || 1;
      if (scale > 0) zoomRef.current?.(lastScale / scale);
      lastScale = scale;
    };

    /* passive:false — without it preventDefault is ignored and the browser
       zooms the page anyway. */
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart, { passive: false });
    el.addEventListener("gesturechange", onGestureChange, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  return (
    /* Pinned on wide screens: the form can be taller than the viewport, so
       the grid row grows past 100vh. Left to stretch, the car would grow
       with it and drift out of frame — sticky + self-start keeps this a
       fixed viewport-height panel that the form scrolls against. */
    <section
      ref={panelRef}
      className="relative order-1 min-h-[52vh] lg:sticky lg:top-0 lg:h-screen lg:self-start"
    >
      {/* The circuit is lit behind the logo and the zoom buttons; this
          shades the top of the stage so both stay readable over it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-black/70 via-black/35 to-transparent"
      />
      {/* CodeCaret logo over the scene, and the way home. The art is black
          line-work on transparency (public/logo-mark.png), so inverting it
          is all the dark stage needs — no blend mode, which this sticky
          section's own stacking context would keep from reaching the page.
          The strip ignores the pointer so the car can still be dragged
          around the logo; only the link itself takes clicks. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-6 sm:p-8">
        <Link
          to="/"
          aria-label="CodeCaret home"
          className="pointer-events-auto inline-block rounded-md transition-opacity hover:opacity-80
                     focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600]"
        >
          <BrandLogo tone="light" alt="" className="h-20 w-auto sm:h-24" />
        </Link>
      </div>

      {/* Zoom controls. The canvas sits under a pointer-events-none scrim at
          the bottom, so these go top-right where nothing else competes.
          z-20 to clear both the logo and that scrim. */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-1.5 sm:top-8 sm:right-8">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          aria-label="Zoom in"
          title="Zoom in (or hold Ctrl / ⌘ and scroll)"
          className={ZOOM_BUTTON}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          aria-label="Zoom out"
          title="Zoom out (or hold Ctrl / ⌘ and scroll)"
          className={ZOOM_BUTTON}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Fills the whole half. The canvas draws its own surroundings — the
          night circuit in CircuitScene — so nothing behind it shows. */}
      <div className="absolute inset-0 overflow-hidden">
        <StageBoundary>
          <Suspense fallback={null}>
            <StageCanvas
              chassisIn={chassisIn}
              wheelsIn={wheelsIn}
              wingsIn={wingsIn}
              secure={secure}
              launching={launching}
              reduced={reduced}
              autoRotate={autoRotate}
              zoomRef={zoomRef}
            />
          </Suspense>
        </StageBoundary>
      </div>

      {/* Copy laid over the bottom of the scene. The scrim keeps it legible
          whatever the backdrop, and pointer-events-none lets drags reach
          OrbitControls. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-6 pt-16 sm:p-8 sm:pt-20">
        {children}
      </div>
    </section>
  );
}

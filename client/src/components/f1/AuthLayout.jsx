import { useState } from "react";
import { CornerMarks, PanelGrid } from "./chrome";
import { PAGE_BG } from "./theme";

/* ══════════════════════════════════════════════════════════════
   AuthLayout — the page frame every auth route sits in.

     <AuthLayout>
       <CarStage … />              left column (the 3D car)
       <AuthPanel>form</AuthPanel> right column
     </AuthLayout>

   The car stage's canvas draws its own surroundings (the night
   circuit, CircuitScene.jsx), so the page backdrop here only shows
   through the glass form panel. AuthPanel owns that frosted surface,
   so no page can end up with a form sitting on bare artwork.

   Stacking, bottom to top, all inside one `isolate` context so
   nothing in here can climb above app-level overlays such as the
   driver-ident modal (z-200):

     z-0   backdrop   glow + grain; fixed, inert, aria-hidden
     z-10  content    stage | panel
   ══════════════════════════════════════════════════════════════ */

/* A cool haze towards the seam with the circuit, a trace of red low
   down — the floodlit night and the car's paint — so the frost has
   something to diffuse rather than reading as a flat slab. */
const PANEL_GLOW = [
  "radial-gradient(70% 60% at 55% 35%, rgba(120, 150, 190, 0.09), rgba(120, 150, 190, 0) 70%)",
  "radial-gradient(60% 45% at 50% 100%, rgba(225, 6, 0, 0.07), rgba(225, 6, 0, 0) 70%)",
].join(", ");

/* Film grain, generated once per session: the backdrop is nearly all
   dark gradient, and 8-bit displays band those into visible steps. A
   faint noise layer dithers them smooth. Seeded, so it never shimmers
   between visits. */
let grainUrl = null;

function grainTile() {
  if (grainUrl) return grainUrl;
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  const pixels = g.createImageData(size, size);
  let seed = 20260917;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = Math.floor((seed / 2147483647) * 256);
    pixels.data[i] = v;
    pixels.data[i + 1] = v;
    pixels.data[i + 2] = v;
    pixels.data[i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
  grainUrl = canvas.toDataURL("image/png");
  return grainUrl;
}

function AuthBackdrop() {
  const [grain] = useState(grainTile);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: PANEL_GLOW }}
    >
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: `url(${grain})` }}
      />
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div
      className="relative isolate min-h-screen w-full text-zinc-100"
      style={{ backgroundColor: PAGE_BG }}
    >
      <AuthBackdrop />
      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-[6fr_4fr]">
        {children}
      </div>
    </div>
  );
}

/* The form column. Frosted rather than solid, so the backdrop glow
   reads through — but the tint is what guarantees legibility. Under
   prefers-contrast: more it goes fully solid. */
export function AuthPanel({ children }) {
  return (
    <section className="relative order-2 flex flex-col border-t border-white/10 bg-zinc-950/90 p-6 backdrop-blur-2xl sm:p-10 lg:border-t-0 lg:border-l lg:bg-zinc-950/60 contrast-more:bg-zinc-950">
      <PanelGrid />
      <CornerMarks />

      {/* Capped measure: at 40% of a wide viewport the fields would
          otherwise stretch far past a comfortable line length.

          `my-auto` rather than `justify-center` on the section: both
          centre the form when there is room, but auto margins collapse
          instead of overflowing symmetrically, so on a short viewport
          the top of the form stays reachable rather than being clipped
          above the scroll origin. */}
      <div className="relative mx-auto my-auto w-full max-w-[27rem]">
        {children}
      </div>
    </section>
  );
}

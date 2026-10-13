import { useEffect, useMemo } from "react";
import { GROUND, WALL_Z, makeCanvas, mulberry32, toTexture } from "./circuitKit";
import { Matte } from "./circuitParts";
import { MarshalPost, TvCamera } from "./trackPeople";

/* ══════════════════════════════════════════════════════════════
   Trackside — the start/finish straight ahead of the car: the right
   side of the stage from the default camera.

     - the CODECARET logo painted across the track before the line,
       scuffed by tyres
     - launch rubber: black double streaks from the pole slot
     - a marshal post on the run-off: shelter, two marshals in
       orange, one showing the green flag, and an LED flag panel
     - a TV camera on a tripod, its operator under an umbrella still
       up from the last shower, lens trained on the grid

   Placed to read at 20–35 m, where the default camera sees them:
   between the far kerb and the pit wall, right of the car.
   ══════════════════════════════════════════════════════════════ */

const MARSHAL_POST = [17, GROUND, WALL_Z + 1.05];
const CAMERA_STAND = [27.5, GROUND, WALL_Z + 1.3];

/* ── Textures ──────────────────────────────────────────────────── */

/* Track paint: white italic lettering, worn through where the tyres run. */
function paintedLogo(rand) {
  const W = 1024;
  const H = 256;
  const [canvas, g] = makeCanvas(W, H);
  g.fillStyle = "#ffffff";
  g.font = "italic 900 176px 'Arial Black', 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("CODECARET", W / 2, H / 2 + 6, W - 40);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(0,0,0,${0.25 + rand() * 0.6})`;
    g.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 1 + rand() * 2);
  }
  /* Two scuffed bands where the cars' wheels cross it. */
  for (const y of [H * 0.32, H * 0.7]) {
    const grad = g.createLinearGradient(0, y - 18, 0, y + 18);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, y - 18, W, 36);
  }
  return canvas;
}

/* Launch rubber: two tyre-width streaks, heaviest where the wheels
   first spun and fading as the car hooked up. */
function launchRubber() {
  const W = 512;
  const H = 64;
  const [canvas, g] = makeCanvas(W, H);
  for (const y of [14, 50]) {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.04, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, y - 6, W, 12);
  }
  return canvas;
}

function glow() {
  const [canvas, g] = makeCanvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return canvas;
}

export default function Trackside() {
  const textures = useMemo(() => {
    const rand = mulberry32(0x5eed);
    return {
      logo: toTexture(paintedLogo(rand)),
      rubber: toTexture(launchRubber()),
      glow: toTexture(glow()),
    };
  }, []);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  return (
    <group>
      {/* Painted across the far half of the straight, reading upright from
          the default camera. */}
      <mesh position={[12, GROUND + 0.006, -4.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11, 2.7]} />
        <Matte map={textures.logo} color="#c9ccd0" transparent opacity={0.62} roughness={0.45} depthWrite={false} />
      </mesh>

      {/* Launch rubber off the pole slot, towards the line. */}
      <mesh position={[11.5, GROUND + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[17, 1.9]} />
        <meshBasicMaterial alphaMap={textures.rubber} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <MarshalPost position={MARSHAL_POST} glowTexture={textures.glow} />
      <TvCamera position={CAMERA_STAND} umbrella />
    </group>
  );
}

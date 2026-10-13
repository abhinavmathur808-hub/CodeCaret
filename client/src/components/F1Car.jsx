import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { FIT, MODEL_URL, paintedBodyOf, wheelsOf } from "./f1/carGeometry";
import { carMetal, carPaint } from "./f1/carPaint";

/* ══════════════════════════════════════════════════════════════
   F1Car — GLTF car that assembles itself as the form is filled.

   ── What the model actually contains ──────────────────────────
   f1-car-transformed.glb has THREE meshes, merged by MATERIAL and
   not by part:

     FRONT NOSE_Carbon Fiber - Twill_0   1,352,043 tris  (main body)
     Body122_Carbon Fiber - Plain_0        143,959 tris  (aero section)
     Body387_Rubber - Weathered_0          125,762 tris  (all four tyres)

   So there is no separate halo or wing node to grab. Two consequences:

   • wheelsGroup is built by splitting the single rubber mesh into four
     quadrant clusters (see wheelsOf in f1/carGeometry.js). The tyres
     sit at the four corners, so a centroid split on the model's X/Y
     plane separates them cleanly and gives four independently
     animatable wheels.
   • The car assembles in three parts — chassis, wheels, aero. The
     sign-up form's fourth stage (the password) has no part of its
     own to fit; it arms the stage instead (`secure` in CarStage).

   ── Damping ───────────────────────────────────────────────────
   THREE.MathUtils.damp3 / dampEuler do not exist — three r185 ships
   only MathUtils.damp (damp3/dampE come from maath). The helpers
   below are built on MathUtils.damp so the animation is still
   frame-rate independent with no extra dependency.

   Each assembly rides ONE 0→1 progress scalar, so its slide-in and its
   scale-up can never drift apart, and an unfitted part is switched off
   entirely rather than parked just out of shot.
   ══════════════════════════════════════════════════════════════ */

/* Below this a part is treated as fully stowed. Exponential damping is
   asymptotic and never actually reaches 0, so without a cutoff a hidden
   assembly would linger as an ever-shrinking sliver forever. */
const STOWED_EPS = 0.004;

/* Place one assembly from its progress value: p=0 is stowed (parked at
   `offset`, zero-scaled, switched off), p=1 is fitted at the origin.

   Scale is what actually hides a part. Offset alone was not enough — the
   stowed positions sat 8 units out, but the camera orbits at ~10.7 and
   zooms to 12, so those parts stayed inside the frustum and hovered in
   the background of an empty form. */
function placeAssembly(group, p, offset) {
  if (!group) return;
  const k = 1 - p;
  group.position.set(offset[0] * k, offset[1] * k, offset[2] * k);
  group.scale.setScalar(p);
  group.visible = p > STOWED_EPS;
}

function dampEuler(euler, to, lambda, dt) {
  euler.x = THREE.MathUtils.damp(euler.x, to[0], lambda, dt);
  euler.y = THREE.MathUtils.damp(euler.y, to[1], lambda, dt);
  euler.z = THREE.MathUtils.damp(euler.z, to[2], lambda, dt);
}

export default function F1Car({
  chassisIn = false,
  wheelsIn = false,
  wingsIn = false,
  launching = false,
  reduced = false,
}) {
  const { nodes, materials } = useGLTF(MODEL_URL);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);

  const master = useRef(null);
  const chassisGroup = useRef(null);
  const wheelsGroup = useRef(null);
  const wingsGroup = useRef(null);
  const wheelRefs = useRef([]);
  const spinRefs = useRef([]);

  /* 0 = stowed, 1 = fitted. Starts at 0 so an untouched form shows an
     empty garage — nothing is on screen until a field actually validates. */
  const progress = useRef({ chassis: 0, wheels: 0, wings: 0 });

  const bodyMesh = nodes["FRONT_NOSE_Carbon_Fiber_-_Twill_0"];
  const aeroMesh = nodes["Body122_Carbon_Fiber_-_Plain_0"];
  const rubberMesh = nodes["Body387_Rubber_-_Weathered_0"];

  /* 125k triangles, so do this once and keep it. */
  const wheels = useMemo(
    () => (rubberMesh ? wheelsOf(rubberMesh.geometry) : []),
    [rubberMesh]
  );

  /* The car stays off stage until every shader it uses is built — in
     parallel, off the main thread where the driver allows — and its
     assembly starts only then, so it plays in full instead of losing
     its first moments to a compile stall. The stage built the paint's
     program before the model arrived (Precompile in f1/StageCanvas.jsx),
     so this is normally a single tick. */
  const ready = useRef(false);
  useLayoutEffect(() => {
    const car = master.current;
    if (!car) return undefined;
    const { scene, camera } = get();
    let live = true;
    const show = () => {
      if (!live) return;
      ready.current = true;
      car.visible = true;
    };
    car.visible = false;
    gl.compileAsync(car, camera, scene).then(show, show);
    /* A driver that never reports its programs done must not cost the
       car: past this it is drawn anyway, compiled or not. */
    const giveUp = setTimeout(show, 5000);
    return () => {
      live = false;
      clearTimeout(giveUp);
    };
  }, [gl, get]);

  /* Two draw groups over the body mesh: paint, then wheel hardware. */
  const bodyGeometry = useMemo(() => {
    if (!bodyMesh || wheels.length === 0) return bodyMesh?.geometry ?? null;
    return paintedBodyOf(bodyMesh.geometry, wheels);
  }, [bodyMesh, wheels]);

  useFrame((_, delta) => {
    if (!ready.current) return;
    const dt = Math.min(delta, 1 / 30);
    const L = reduced ? 40 : 4.5; // damping rate; high = effectively instant

    const advance = (key, on) => {
      const p = THREE.MathUtils.damp(progress.current[key], on ? 1 : 0, L, dt);
      progress.current[key] = p;
      return p;
    };

    placeAssembly(chassisGroup.current, advance("chassis", chassisIn), [0, 8, 0]);

    /* Wheels roll in from the left and right edges of the X axis. The
       split alternates sides, so each pair arrives from one edge. */
    const pWheels = advance("wheels", wheelsIn);
    wheelRefs.current.forEach((g, i) => {
      placeAssembly(g, pWheels, [i % 2 === 0 ? -8 : 8, 0, 0]);
    });

    /* One aero group, so it arrives from +Z. The model has no second
       wing mesh to bring in from -Z — see the note at the top. */
    placeAssembly(wingsGroup.current, advance("wings", wingsIn), [0, 0, 8]);

    /* Wheels rotate into place as they arrive, then spin up on launch.
       The axle is the model's X axis, so that is the spin axis. */
    spinRefs.current.forEach((g, i) => {
      if (!g) return;
      if (launching) {
        g.rotation.x -= delta * 34;
      } else if (wheelsIn) {
        dampEuler(g.rotation, [0, 0, 0], L, dt);
      } else {
        g.rotation.x = (i % 2 === 0 ? -1 : 1) * 1.4;
      }
    });

    /* The whole car accelerates off the right of frame. */
    if (master.current) {
      const to = launching ? 20 : 0;
      master.current.position.x = THREE.MathUtils.damp(
        master.current.position.x,
        to,
        launching ? 1.6 : 6,
        dt
      );
    }
  });

  return (
    /* skipReflection: the wet track's mirror pass leaves the car out. Its
       reflection would sit under the plinth where nothing can see it, and
       at ~1.6M triangles it is most of the cost of drawing the scene twice. */
    <group ref={master} userData={{ skipReflection: true }}>
      {/* +90° about Y points the car's length down the X axis, so it
          launches nose-first. Flip the sign if it drives off backwards. */}
      <group rotation={[0, Math.PI / 2, 0]}>
        {/* ── chassisGroup ── */}
        {/* scale={0} on every assembly below: groups default to scale 1, so
            without it there is one frame before useFrame runs where the whole
            car pops in at full size. */}
        <group ref={chassisGroup} scale={0}>
          <group position={FIT.position} rotation={FIT.rotation} scale={FIT.scale}>
            {bodyGeometry && (
              <mesh
                geometry={bodyGeometry}
                material={[carPaint, carMetal]}
                castShadow
                receiveShadow
              />
            )}
          </group>
        </group>

        {/* ── wheelsGroup ── four clusters split out of the rubber mesh ── */}
        <group ref={wheelsGroup}>
          {wheels.map((w, i) => (
            <group key={i} ref={(el) => (wheelRefs.current[i] = el)} scale={0}>
              <group position={FIT.position} rotation={FIT.rotation} scale={FIT.scale}>
                <group ref={(el) => (spinRefs.current[i] = el)} position={w.centre}>
                  <mesh
                    geometry={w.geometry}
                    material={materials["Rubber_-_Weathered"]}
                    castShadow
                  />
                </group>
              </group>
            </group>
          ))}
        </group>

        {/* ── wingsGroup ── */}
        <group ref={wingsGroup} scale={0}>
          <group position={FIT.position} rotation={FIT.rotation} scale={FIT.scale}>
            {aeroMesh && (
              <mesh
                geometry={aeroMesh.geometry}
                material={carMetal}
                castShadow
                receiveShadow
              />
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

import { memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import F1Car from "../F1Car";
import CircuitScene from "./CircuitScene";
import Pedestal from "./Pedestal";
import StageBoundary from "./StageBoundary";
import { carMetal, carPaint } from "./carPaint";
import {
  ACCENT,
  CAM_MAX_DISTANCE,
  CAM_MIN_DISTANCE,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAR_RIM,
} from "./theme";

/* ══════════════════════════════════════════════════════════════
   StageCanvas — the 3D half of CarStage: the car, the circuit, the
   plinth and the lighting rig. A chunk of its own, so the auth form
   is up and usable while three.js and the scene are still arriving.

   ── Why the first frame waits ─────────────────────────────────
   The stage draws with ~60 shader programs. Left to the first frame,
   three compiles them one after another and blocks on each, which
   froze the page for seconds on a first visit. Precompile hands them
   all to the driver up front instead — compiled in parallel, off the
   main thread, wherever KHR_parallel_shader_compile is available — and
   the frame loop starts once they are built. The frames themselves are
   unchanged; they just stop stalling.
   ══════════════════════════════════════════════════════════════ */

/* Dollies the camera along its current view ray, which is what
   OrbitControls' own wheel handler does — so button zoom and gesture zoom
   land in the same place. Lives inside <Canvas> because that is the only
   place `state.controls` exists; it publishes a setter onto the ref the
   panel holds, and renders nothing. */
function ZoomBridge({ zoomRef }) {
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const ref = zoomRef;
    ref.current = (factor) => {
      if (!controls) return;
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.min(
        CAM_MAX_DISTANCE,
        Math.max(CAM_MIN_DISTANCE, offset.length() * factor)
      );
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
    };
    return () => {
      ref.current = null;
    };
  }, [controls, camera, zoomRef]);

  return null;
}

/* Red light under the floorboard, pulsing while the secure stage holds. */
function SecureLight({ active }) {
  const ref = useRef(null);
  useFrame((state, delta) => {
    const l = ref.current;
    if (!l) return;
    const want = active ? 7 + Math.sin(state.clock.elapsedTime * 3.6) * 4.5 : 0;
    l.intensity += (want - l.intensity) * Math.min(delta, 1 / 30) * 8;
  });
  return (
    <pointLight
      ref={ref}
      position={[0, -0.35, 0]}
      color={ACCENT}
      intensity={0}
      distance={10}
    />
  );
}

/* Every material in this model is near-black carbon or rubber at
   metalness ~0.76, and a PBR metal with nothing to reflect renders flat
   black regardless of the scene background. These lightformers give the
   carbon a studio to reflect. Built in-scene, so no CDN HDR fetch.

   The paint carries a full clearcoat, so realism comes from what it
   REFLECTS: the long thin bars below streak across the bodywork like
   showroom ceiling lights, which is the single strongest "real car" cue.

   memo, and no props: <Environment> re-renders its cube and rebuilds the
   reflection map whenever its children change, and fresh JSX children
   count as a change — so without this it did both on every re-render of
   the stage. */
const Studio = memo(function Studio() {
  return (
    <Environment resolution={512}>
      {/* broad overhead key */}
      <Lightformer
        intensity={2.6}
        position={[0, 8, 0]}
        scale={[12, 12, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* horizontal reflection bars raking each flank */}
      <Lightformer
        intensity={4}
        position={[7, 5, 1]}
        scale={[12, 0.5, 1]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Lightformer
        intensity={3}
        position={[7, 2.5, -2]}
        scale={[10, 0.4, 1]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Lightformer
        intensity={4}
        position={[-7, 5, -1]}
        scale={[12, 0.5, 1]}
        rotation={[0, Math.PI / 2, 0]}
      />
      {/* nose/tail fill so the ends aren't black */}
      <Lightformer
        intensity={1.8}
        position={[9, 3, 0]}
        scale={[3, 5, 1]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Lightformer
        intensity={1.4}
        position={[-9, 3, 0]}
        scale={[3, 5, 1]}
        rotation={[0, Math.PI / 2, 0]}
      />
      {/* red brand kicker */}
      <Lightformer
        intensity={1}
        color="#ff2233"
        position={[-7, 2, -5]}
        scale={[4, 6, 1]}
      />
    </Environment>
  );
});

/* Stands in for the car while its 2.8MB model is on its way, so the
   paint's program — clearcoat over physical, the heaviest on the stage —
   is built with everything else rather than when the car arrives.
   Position and normal only, like the model's own meshes: the program
   compiled here is the one the car asks for. Never added to the scene. */
const PROBE_GEOMETRY = new THREE.BufferGeometry();
PROBE_GEOMETRY.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
PROBE_GEOMETRY.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
const PAINT_PROBE = new THREE.Group().add(
  new THREE.Mesh(PROBE_GEOMETRY, carPaint),
  new THREE.Mesh(PROBE_GEOMETRY, carMetal)
);

/* Past this, start drawing whatever is left unbuilt. Only a lost
   context should get here: the programs then never report in. */
const GIVE_UP_MS = 10000;

/* Builds every program the stage's first frames will ask for, then
   calls onReady once the driver reports them all done. Mounted last, so
   the scene it compiles — lights, fog and environment included — is
   complete. */
function Precompile({ onReady }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);

  useEffect(() => {
    /* Read at effect time: PerspectiveCamera's makeDefault has landed
       by now, whatever this component saw when it rendered. */
    const { scene, camera } = get();
    let settled = false;
    let poll = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(poll);
      clearTimeout(deadline);
      onReady();
    };
    const deadline = setTimeout(finish, GIVE_UP_MS);

    try {
      gl.compile(scene, camera);
      gl.compile(PAINT_PROBE, camera, scene);

      /* The wet track draws the scene a second time, into a render
         target — where three skips tone mapping, so each material there
         is a second program. Any render target selects those. */
      const mirror = new THREE.WebGLRenderTarget(1, 1);
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(mirror);
      try {
        gl.compile(scene, camera);
      } finally {
        gl.setRenderTarget(previous);
        mirror.dispose();
      }
    } catch (error) {
      console.warn("[auth] shader precompile skipped:", error);
      finish();
    }

    /* isReady() asks the driver without blocking, and says yes at once
       where it cannot tell — the first frame then compiles as it always
       did. */
    const check = () => {
      if (settled) return;
      if (gl.info.programs.every((program) => program.isReady())) finish();
      else poll = setTimeout(check, 16);
    };
    check();

    return () => {
      settled = true;
      clearTimeout(poll);
      clearTimeout(deadline);
    };
  }, [gl, get, onReady]);

  return null;
}

/* memo: the auth forms re-render on every keystroke, and none of that
   needs to reach the scene — only the flags below do. */
export default memo(function StageCanvas({
  chassisIn,
  wheelsIn,
  wingsIn,
  secure,
  launching,
  reduced,
  autoRotate,
  zoomRef,
}) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    /* shadows="percentage" (PCF), not plain `shadows` (PCF soft): three
       r185 retired the soft type, and its first shadow pass swaps it for
       PCF — with a console warning — so PCF is what has always been
       drawn. Asking for it up front matters to Precompile: the shadow
       type is part of every program's identity, and programs compiled
       before that swap were each built a second time on the first frame. */
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      frameloop={ready ? "always" : "never"}
    >
      {/* Angled three-quarter view. Orientation is left to
          OrbitControls, which looks at its target ([0,0,0]) every
          update — camera.up stays +Y so maxPolarAngle constrains the
          intended axis.

          fov 38, not 30. The panel is a ~0.80 (portrait) half rather
          than a 16:10 box, and horizontal FOV follows the aspect: at 30
          the visible width was ~4.58m against a 4.76m car, so both ends
          clipped. 38 gives ~5.9m. */}
      <PerspectiveCamera
        makeDefault
        position={CAMERA_POSITION}
        fov={CAMERA_FOV}
        near={0.1}
        far={80}
      />
      {/* makeDefault registers these as the scene's controls, so they
          bind to the camera above rather than the implicit one R3F
          creates before PerspectiveCamera's makeDefault lands.

          OrbitControls never takes the wheel: left on, it swallowed
          every scroll that started over the canvas — 60% of the page —
          and dollied instead of scrolling. Zoom comes from the panel's
          own gesture handler and the buttons, both going through
          ZoomBridge. Drag to orbit is always on. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={CAM_MIN_DISTANCE}
        maxDistance={CAM_MAX_DISTANCE}
        autoRotate={autoRotate && !reduced}
        autoRotateSpeed={0.45}
      />
      <ZoomBridge zoomRef={zoomRef} />

      {/* Soft key and fill. Intensities stay low on purpose: three r185
          is physically based, so the obvious values blow the carbon out
          to grey. */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 10, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-4, 8, -3]} intensity={0.4} />

      {/* Overhead key and a white rim from behind, to give the car
          definition against the background.

          Intensities are scaled up from 2.5 / 1.5. three r155+ is
          physically based, so irradiance falls off as intensity/d²: at
          d=15 an intensity of 2.5 lands at 0.011 against the 0.128 of
          the burgundy spot below. Measured, 2.5/1.5 gave a frame
          byte-identical to both lights switched off. */}
      <spotLight
        position={[0, 15, 0]}
        intensity={160}
        penumbra={0.5}
        angle={0.6}
        castShadow
      />
      <pointLight position={[-5, 2, -5]} intensity={45} color="#ffffff" />

      {/* Deep burgundy rim raking the chassis from the rear, with a
          brighter red kicker on the opposite flank. */}
      <spotLight
        position={[-8, 2.5, 0]}
        angle={0.8}
        penumbra={1}
        intensity={9}
        color={CAR_RIM}
        distance={22}
      />
      <spotLight
        position={[2, 2, -7]}
        angle={0.9}
        penumbra={1}
        intensity={5}
        color={ACCENT}
        distance={20}
      />

      <Studio />

      {/* Encrypted-state signal: pulses under the floorboard. */}
      <SecureLight active={secure} />

      {/* The circuit and the display plinth. Outside Suspense on
          purpose: neither has assets to wait for, so both are on stage
          before the car model arrives — an empty plinth on /signup
          until the first part validates. The rim LED pulses with the
          same secure signal. */}
      <CircuitScene />
      <Pedestal active={secure} reduced={Boolean(reduced)} />

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.8}
        scale={14}
        blur={2.4}
        far={3}
        resolution={512}
      />

      {/* useGLTF suspends while the 2.8MB model loads. If it never
          arrives, the circuit and plinth stay on without it. */}
      <StageBoundary what="car model">
        <Suspense fallback={null}>
          <F1Car
            chassisIn={chassisIn}
            wheelsIn={wheelsIn}
            wingsIn={wingsIn}
            launching={launching}
            reduced={Boolean(reduced)}
          />
        </Suspense>
      </StageBoundary>

      <Precompile onReady={onReady} />
    </Canvas>
  );
});

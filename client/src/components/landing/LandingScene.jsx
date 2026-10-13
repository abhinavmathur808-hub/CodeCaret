import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import CarFX from "./CarFX";
import Gantries from "./Gantries";
import GhostCar from "./GhostCar";
import PostFX from "./PostFX";
import RaceCar, { CarLights } from "./RaceCar";
import SetPieces from "./SetPieces";
import TrackMeshes from "./TrackMeshes";
import World from "./World";
import { applyAccent } from "./accent";
import { lap } from "./lapStore";
import { rig, updateRig } from "./rig";
import { useBrandReady } from "./textures";
import { watchThemeAccent } from "./themeAccent";
import { S_STOP, smoothstep } from "./trackLayout";

/* ══════════════════════════════════════════════════════════════
   LandingScene — the canvas, and the order things happen in each
   frame:

     priority −2   Driver      poses car, ghost and camera (rig.js)
     priority −1   CameraRig   applies the pose to the camera
     priority  0   everything else reads rig / lap
     priority  1   PostFX      renders through the composer

   Before the loader lifts, Warmup compiles every material in the
   scene — including set pieces still hidden down the track — so the
   first time each one comes into view costs nothing.
   ══════════════════════════════════════════════════════════════ */

const FOG = "#121019";

function Driver() {
  useFrame((_, dt) => updateRig(Math.min(dt, 0.05)), -2);
  return null;
}

function CameraRig() {
  useFrame(({ camera, size }) => {
    rig.aspect = size.width / Math.max(1, size.height);
    const c = rig.cam;
    camera.position.copy(c.pos);
    camera.lookAt(c.target);
    if (c.roll) camera.rotateZ(c.roll);
    /* Lens shift: render a window that sits `lift` of a frame lower,
       which moves the picture up without tilting the camera. */
    const lift = Math.round(rig.lift * size.height);
    const view = camera.view;
    const shifted = view?.enabled ? view.offsetY : 0;
    const resized = view?.enabled && (view.fullWidth !== size.width || view.fullHeight !== size.height);
    if (lift !== shifted || resized) {
      if (lift) camera.setViewOffset(size.width, size.height, 0, lift, size.width, size.height);
      else camera.clearViewOffset();
    }
    if (Math.abs(camera.fov - c.fov) > 0.01) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }
  }, -1);
  return null;
}

/* A little clearer air for the finale, as the camera cranes up. */
function FogDriver() {
  useFrame(({ scene }) => {
    if (scene.fog) scene.fog.density = THREE.MathUtils.lerp(0.0019, 0.0013, smoothstep(S_STOP - 70, S_STOP, lap.s));
  });
  return null;
}

function Warmup({ onDone }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let live = true;
    let raf = 0;
    rig.warm = true;
    /* Two frames so every component has applied `visible` for warm-up. */
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(async () => {
        try {
          if (gl.compileAsync) await gl.compileAsync(scene, camera);
          else gl.compile(scene, camera);
        } catch {
          /* Compiling ahead is an optimisation; drawing will compile anyway. */
        }
        rig.warm = false;
        if (live) onDone?.();
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      rig.warm = false;
    };
  }, [gl, scene, camera, onDone]);
  return null;
}

/* A model that will not load (offline, decoder blocked) must not
   take the circuit down with it. */
class CarBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("[landing] car model unavailable:", error);
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* The car's reflections: a night circuit in miniature — floodlight
   bars overhead, the city's glow low down, an accent kicker. Built
   in the scene, so no HDR download. */
function NightEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#05060a"]} />
      <Lightformer intensity={2.2} position={[0, 10, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 3, 1]} />
      <Lightformer intensity={3.2} position={[6, 6, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[14, 0.35, 1]} />
      <Lightformer intensity={2.4} position={[-6, 5, -2]} rotation={[0, Math.PI / 2, 0]} scale={[14, 0.35, 1]} />
      <Lightformer intensity={1.2} position={[0, 2, 9]} scale={[16, 1.2, 1]} color="#ffb48a" />
      <Lightformer intensity={1.6} position={[0, 1.5, -9]} rotation={[0, Math.PI, 0]} scale={[6, 2, 1]} color="#ff2a2a" />
    </Environment>
  );
}

/* Load progress for the page's loader, which lives outside this
   lazily loaded chunk so that it can show before three.js arrives. */
function ProgressBridge({ onProgress }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);
  return null;
}

export default function LandingScene({ onReady, onProgress }) {
  /* The scene's neon follows the visitor's theme. */
  useEffect(() => watchThemeAccent(applyAccent), []);

  const small = typeof window !== "undefined" && window.innerWidth < 760;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  const quality = small || cores <= 4 ? 0.6 : 1;
  const maxDpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, small ? 1.5 : 1.75);
  const [dpr, setDpr] = useState(maxDpr);
  /* Signs, boards and holograms are drawn once, in the logo's
     lettering and with the logo itself: wait for both to load. */
  const brand = useBrandReady();
  const camera = useMemo(() => ({ fov: 40, near: 0.15, far: 6500, position: [-30, 30, -40] }), []);

  return (
    <Canvas
      dpr={dpr}
      camera={camera}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#040508");
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(maxDpr)}
        onFallback={() => setDpr(1)}
      />
      <ProgressBridge onProgress={onProgress} />
      <fogExp2 attach="fog" args={[FOG, 0.0019]} />
      <Driver />
      <CameraRig />
      <FogDriver />

      <hemisphereLight args={["#7d8fd6", "#1a0d0a", 0.35]} />
      <directionalLight position={[-300, 420, -260]} intensity={0.45} color="#b8c4ff" />
      <NightEnvironment />

      <World quality={quality} />
      {brand && <TrackMeshes />}
      {brand && <Gantries />}
      {brand && <SetPieces />}
      <CarLights />
      <CarFX />

      <CarBoundary onFail={onReady}>
        <Suspense fallback={null}>
          <RaceCar />
          <GhostCar />
          {brand && <Warmup onDone={onReady} />}
        </Suspense>
      </CarBoundary>

      <PostFX />
    </Canvas>
  );
}

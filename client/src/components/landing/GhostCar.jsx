import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { FIT, MODEL_URL } from "../f1/carGeometry";
import { lap } from "./lapStore";
import { rig } from "./rig";
import { DISPLAY, canvasTexture } from "./textures";

/* ══════════════════════════════════════════════════════════════
   GhostCar — the ghost lap, drawn as light.

   Your personal best comes back as a second caret on the typing
   page; out here it is a second car made of ~75,000 points sampled
   from the real model's own vertices, in timing-screen purple (a
   personal best is a purple lap). Points, not a second copy of the
   1.6M-triangle mesh: a fraction of the cost, and it reads as a
   replay rather than a rival.
   ══════════════════════════════════════════════════════════════ */

const GHOST = new THREE.Color("#b46cff");

/* The same transform chain RaceCar applies: FIT, then +90° yaw. */
function toCarFrame() {
  const m = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const fit = new THREE.Matrix4().compose(
    new THREE.Vector3(...FIT.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...FIT.rotation)),
    new THREE.Vector3(FIT.scale, FIT.scale, FIT.scale)
  );
  return m.multiply(fit);
}

function sample(geometries) {
  const m = toCarFrame();
  const v = new THREE.Vector3();
  const out = [];
  for (const [geometry, every] of geometries) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i += every) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      out.push(v.x, v.y, v.z);
    }
  }
  const positions = new Float32Array(out);
  const rand = new Float32Array(positions.length / 3);
  for (let i = 0; i < rand.length; i++) rand[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  g.computeBoundingSphere();
  return g;
}

function labelTexture() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(180,108,255,0.16)";
    ctx.strokeStyle = "rgba(200,150,255,0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 24, w - 16, h - 48, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Ghost · PB", w / 2, h / 2 + 2);
  });
}

export default function GhostCar() {
  const { nodes } = useGLTF(MODEL_URL);
  const geometry = useMemo(
    () =>
      sample([
        [nodes["FRONT_NOSE_Carbon_Fiber_-_Twill_0"].geometry, 9],
        [nodes["Body122_Carbon_Fiber_-_Plain_0"].geometry, 5],
        [nodes["Body387_Rubber_-_Weathered_0"].geometry, 7],
      ]),
    [nodes]
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uVis: { value: 0 },
          uColor: { value: GHOST },
          uPx: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute float aRand;
          uniform float uTime;
          uniform float uVis;
          uniform float uPx;
          varying float vA;
          void main() {
            vec3 p = position;
            /* A scan band sweeping nose to tail, and a little shimmer. */
            float band = smoothstep(0.5, 0.0, abs(fract(p.x * 0.22 - uTime * 0.55) - 0.5) * 3.0);
            p.y += sin(uTime * 9.0 + aRand * 60.0) * 0.004;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = clamp(uPx * (1.4 + band * 1.6) * (9.0 / max(-mv.z, 0.5)), 1.0, 5.0 * uPx);
            vA = uVis * (0.28 + 0.72 * band) * (0.75 + 0.25 * sin(uTime * 23.0 + aRand * 97.0));
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * vA;
            gl_FragColor = vec4(uColor * a * 1.15, 1.0);
          }
        `,
      }),
    []
  );
  const label = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: labelTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    []
  );

  const root = useRef(null);
  const cloud = useRef(null);
  const tag = useRef(null);
  useFrame((state) => {
    const g = rig.ghost;
    const vis = lap.reduced ? Math.min(g.visible, 0.6) : g.visible;
    const u = cloud.current?.material.uniforms;
    if (u) {
      u.uVis.value = vis;
      u.uTime.value = state.clock.elapsedTime;
      u.uPx.value = state.viewport.dpr;
    }
    if (tag.current) tag.current.material.opacity = vis * 0.95;
    if (root.current) {
      root.current.visible = rig.warm || vis > 0.002;
      if (root.current.visible) {
        root.current.matrix.copy(g.matrix);
        root.current.matrixWorldNeedsUpdate = true;
      }
    }
    if (tag.current) tag.current.position.y = 2.2 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
  });

  return (
    <group ref={root} matrixAutoUpdate={false} visible={false}>
      <points ref={cloud} geometry={geometry} material={material} frustumCulled={false} />
      <sprite ref={tag} material={label} scale={[2.6, 0.65, 1]} position={[0, 2.2, 0]} />
    </group>
  );
}

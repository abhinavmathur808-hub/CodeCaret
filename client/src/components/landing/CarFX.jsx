import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ACCENT } from "./accent";
import { lap } from "./lapStore";
import { CAR_SCALE, rig } from "./rig";
import { TRACK_LENGTH, sampleLine } from "./trackLayout";

/* ══════════════════════════════════════════════════════════════
   CarFX — what speed looks like.

     Trails   vapour off the rear wing tips and a red streak from
              the rain light, drawn back along the line the car
              actually drove (it is on rails, so its past is just
              the racing line behind it — no history buffer).
     Sparks   titanium skid blocks: at speed, and in the
              compression at the bottom of the drop.
     Air      streaks in the air ahead that the car rushes through.

   All three scale with rig.speed01 and vanish when the car stops.
   ══════════════════════════════════════════════════════════════ */

const SEG = 48;
const _f = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };

/* ── Ribbons that always face the camera ──────────────────────── */
function trailMaterial(colour, width) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColour: { value: colour }, uWidth: { value: width }, uFade: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSide;
      attribute float aT;
      attribute vec3 aDir;
      uniform float uWidth;
      varying float vT;
      varying float vSide;
      void main() {
        vec3 view = normalize(cameraPosition - position);
        vec3 across = normalize(cross(aDir, view) + 1e-6);
        float w = uWidth * (1.0 - aT * 0.65);
        vec3 p = position + across * aSide * w;
        vT = aT;
        vSide = aSide;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour;
      uniform float uFade;
      varying float vT;
      varying float vSide;
      void main() {
        float edge = 1.0 - abs(vSide);
        float a = pow(1.0 - vT, 1.6) * smoothstep(0.0, 0.6, edge + 0.25) * uFade;
        gl_FragColor = vec4(uColour * a, 1.0);
      }
    `,
  });
}

function Trail({ offset, colour, width, gain = 1 }) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = (SEG + 1) * 2;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aDir", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const side = new Float32Array(n), t = new Float32Array(n);
    for (let i = 0; i <= SEG; i++) {
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
      t[i * 2] = t[i * 2 + 1] = i / SEG;
    }
    g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    const index = [];
    for (let i = 0; i < SEG; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(index);
    return { geometry: g, material: trailMaterial(colour, width) };
  }, [colour, width]);

  const ref = useRef(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const speed = lap.speed;
    const fade = lap.reduced ? 0 : THREE.MathUtils.smoothstep(rig.speed01, 0.12, 0.45) * gain;
    mesh.material.uniforms.uFade.value = fade;
    mesh.visible = rig.warm || fade > 0.01;
    if (fade <= 0.01) return;
    const g = mesh.geometry;
    const f = _f;
    /* Behind the car is backwards along its direction of travel. */
    const dir = speed >= 0 ? -1 : 1;
    const len = 4 + 34 * rig.speed01;
    const pos = g.attributes.position.array;
    const adir = g.attributes.aDir.array;
    /* The offset is in the model's metres; the car is drawn larger. */
    const ox = offset[0] * CAR_SCALE;
    const oy = offset[1] * CAR_SCALE;
    const oz = offset[2] * CAR_SCALE;
    for (let i = 0; i <= SEG; i++) {
      const s = THREE.MathUtils.clamp(lap.s + dir * (i / SEG) * len, 0, TRACK_LENGTH);
      sampleLine(s, f);
      const x = f.pos.x + f.fwd.x * ox + f.up.x * oy + f.right.x * oz;
      const y = f.pos.y + f.fwd.y * ox + f.up.y * oy + f.right.y * oz;
      const z = f.pos.z + f.fwd.z * ox + f.up.z * oy + f.right.z * oz;
      for (let k = 0; k < 2; k++) {
        const j = (i * 2 + k) * 3;
        pos[j] = x;
        pos[j + 1] = y;
        pos[j + 2] = z;
        adir[j] = f.fwd.x;
        adir[j + 1] = f.fwd.y;
        adir[j + 2] = f.fwd.z;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aDir.needsUpdate = true;
  });

  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={7} />;
}

/* ── Sparks ───────────────────────────────────────────────────── */
const MAX_SPARKS = 320;
const _spark = new THREE.Vector3();

function Sparks() {
  const size = useThree((s) => s.size);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    /* A unit quad: x along the streak (0 head → 1 tail), y across. */
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const pos = new Float32Array(MAX_SPARKS * 3);
    const vel = new Float32Array(MAX_SPARKS * 3);
    const life = new Float32Array(MAX_SPARKS);
    g.setAttribute("aPos", new THREE.InstancedBufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aVel", new THREE.InstancedBufferAttribute(vel, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aLife", new THREE.InstancedBufferAttribute(life, 1).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = MAX_SPARKS;
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: /* glsl */ `
        attribute vec3 aPos;
        attribute vec3 aVel;
        attribute float aLife;
        uniform vec2 uRes;
        varying float vLife;
        varying float vAlong;
        void main() {
          vLife = aLife;
          vAlong = position.x;
          vec4 head = projectionMatrix * viewMatrix * vec4(aPos, 1.0);
          vec4 tail = projectionMatrix * viewMatrix * vec4(aPos - aVel * 0.028, 1.0);
          vec2 h = head.xy / head.w, t = tail.xy / tail.w;
          vec2 d = (t - h) * uRes;
          float len = length(d);
          vec2 dir = len > 0.0001 ? d / len : vec2(1.0, 0.0);
          vec2 n = vec2(-dir.y, dir.x);
          vec4 p = mix(head, tail, position.x);
          float w = (aLife > 0.0 ? 1.05 : 0.0) * (1.0 - position.x * 0.7);
          p.xy += n * position.y * w / uRes * 2.0 * p.w;
          gl_Position = p;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        varying float vAlong;
        void main() {
          if (vLife <= 0.0) discard;
          vec3 hot = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.45, 0.08), vAlong);
          gl_FragColor = vec4(hot * (1.0 - vAlong) * vLife * 2.6, 1.0);
        }
      `,
    });
    return { geometry: g, material: m };
  }, []);

  const ref = useRef(null);
  /* Emitter bookkeeping: next slot, fractional carry, per-spark life. */
  const sim = useRef(null);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!sim.current) sim.current = { next: 0, carry: 0, maxLife: new Float32Array(MAX_SPARKS) };
    mesh.material.uniforms.uRes.value.set(size.width, size.height);
    const at = mesh.geometry.attributes;
    const st = sim.current;
    const pos = at.aPos.array, vel = at.aVel.array, life = at.aLife.array;
    const c = rig.car;
    const speed = lap.speed;

    /* Emission: grows past ~200 km/h; extra in the dip at the bottom
       of the descent, where the floor bottoms out. */
    const fast = Math.max(0, rig.speed01 - 0.55) * 2.2;
    const dip = Math.exp(-Math.pow((lap.s - 1046) / 26, 2)) * Math.min(1, rig.speed01 * 3);
    const rate = lap.reduced ? 0 : (fast + dip * 1.5) * 150 * (speed > 0 ? 1 : 0);
    st.carry += rate * dt;
    while (st.carry >= 1) {
      st.carry -= 1;
      const i = st.next;
      st.next = (st.next + 1) % MAX_SPARKS;
      _spark.set(-1.3 + Math.random() * 1.6, 0.03, (Math.random() - 0.5) * 0.5);
      _spark.applyMatrix4(c.matrix);
      pos.set([_spark.x, _spark.y, _spark.z], i * 3);
      /* Inherit most of the car's speed, kicked back and up. */
      const carV = speed * 0.82;
      const back = 3 + Math.random() * 8;
      const up = 1.2 + Math.random() * 3.4;
      const lat = (Math.random() - 0.5) * 5;
      vel[i * 3] = c.fwd.x * (carV - back) + c.right.x * lat;
      vel[i * 3 + 1] = c.fwd.y * (carV - back) + up;
      vel[i * 3 + 2] = c.fwd.z * (carV - back) + c.right.z * lat;
      st.maxLife[i] = 0.25 + Math.random() * 0.35;
      life[i] = 1;
    }
    let alive = false;
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (life[i] <= 0) continue;
      alive = true;
      life[i] -= dt / st.maxLife[i];
      if (life[i] <= 0) {
        life[i] = 0;
        continue;
      }
      vel[i * 3 + 1] -= 9.8 * dt;
      const drag = Math.exp(-dt * 1.8);
      vel[i * 3] *= drag;
      vel[i * 3 + 2] *= drag;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    mesh.visible = rig.warm || alive;
    if (alive) {
      at.aPos.needsUpdate = true;
      at.aVel.needsUpdate = true;
      at.aLife.needsUpdate = true;
    }
  });

  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={9} visible={false} />;
}

/* ── Air streaks ──────────────────────────────────────────────── */
const STREAKS = 180;

function AirStreaks() {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const at = new Float32Array(STREAKS * 3);
    const dir = new Float32Array(STREAKS * 3);
    g.setAttribute("aAt", new THREE.InstancedBufferAttribute(at, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = STREAKS;
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uLen: { value: 0 }, uAlpha: { value: 0 }, uAccent: ACCENT },
      vertexShader: /* glsl */ `
        attribute vec3 aAt;
        attribute vec3 aDir;
        uniform float uLen;
        varying float vX;
        void main() {
          vX = position.x;
          vec3 p = aAt + aDir * position.x * uLen;
          vec3 view = normalize(cameraPosition - p);
          vec3 across = normalize(cross(aDir, view) + 1e-6);
          p += across * position.y * 0.022;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha;
        uniform vec3 uAccent;
        varying float vX;
        void main() {
          float a = sin(vX * 3.14159) * uAlpha;
          gl_FragColor = vec4(mix(vec3(0.8, 0.88, 1.0), uAccent, 0.25) * a, 1.0);
        }
      `,
    });
    return { geometry: g, material: m };
  }, []);

  const ref = useRef(null);
  /* Each streak lives at a fixed point beside the line until the car
     has passed it, then jumps back out ahead. */
  const slots = useRef(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!slots.current) slots.current = Array.from({ length: STREAKS }, () => ({ s: -1, lat: 0, h: 0 }));
    const a = lap.reduced ? 0 : Math.pow(THREE.MathUtils.smoothstep(rig.speed01, 0.2, 0.8), 1.5);
    const u = mesh.material.uniforms;
    u.uAlpha.value = a * 0.55;
    u.uLen.value = 2 + 16 * rig.speed01;
    const forward = lap.speed >= 0;
    const attrs = mesh.geometry.attributes;
    const at = attrs.aAt.array;
    const dir = attrs.aDir.array;
    const f = _f;
    let dirty = false;
    for (let i = 0; i < STREAKS; i++) {
      const sl = slots.current[i];
      const behind = forward ? sl.s < lap.s - 14 : sl.s > lap.s + 14;
      const tooFar = Math.abs(sl.s - lap.s) > 220;
      if (sl.s >= 0 && !behind && !tooFar) continue;
      sl.s = THREE.MathUtils.clamp(lap.s + (forward ? 1 : -1) * (10 + Math.random() * 190), 0, TRACK_LENGTH);
      sl.lat = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 9);
      sl.h = 0.3 + Math.random() * 5.5;
      sampleLine(sl.s, f);
      at.set([f.pos.x + f.right.x * sl.lat, f.pos.y + sl.h, f.pos.z + f.right.z * sl.lat], i * 3);
      dir.set([f.fwd.x, f.fwd.y, f.fwd.z], i * 3);
      dirty = true;
    }
    if (dirty) {
      attrs.aAt.needsUpdate = true;
      attrs.aDir.needsUpdate = true;
    }
  });

  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={8} />;
}

const VAPOUR = new THREE.Color(0.75, 0.85, 1.0);
const RAIN_RED = new THREE.Color(2.4, 0.08, 0.06);

export default function CarFX() {
  return (
    <>
      {/* Wing-tip vortices and the rain light's streak (car frame: x
          forward, y up, z right — see RaceCar). */}
      <Trail offset={[-2.18, 0.9, 0.53]} colour={VAPOUR} width={0.05} gain={0.8} />
      <Trail offset={[-2.18, 0.9, -0.53]} colour={VAPOUR} width={0.05} gain={0.8} />
      <Trail offset={[-2.34, 0.37, 0]} colour={RAIN_RED} width={0.07} />
      <Sparks />
      <AirStreaks />
    </>
  );
}

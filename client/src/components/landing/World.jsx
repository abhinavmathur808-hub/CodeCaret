import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ACCENT } from "./accent";
import { rig } from "./rig";
import { FLOOR_Y, TRACK_LENGTH, sampleTrack } from "./trackLayout";
import { MASK_BOUNDS, glyphAtlas, rng, trackMask } from "./textures";

/* ══════════════════════════════════════════════════════════════
   World — everything that isn't the circuit: the night sky, the
   grid floor far below the floating deck, the city of lit towers
   around it, and code glyphs drifting up out of the dark.

   Each is one draw call (instanced where it repeats), lit entirely
   in its own shader — none of it takes a scene light.
   ══════════════════════════════════════════════════════════════ */

const NOISE = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

/* ── Sky ──────────────────────────────────────────────────────── */
function Sky() {
  const ref = useRef(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: { uAccent: ACCENT, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uAccent;
          uniform float uTime;
          varying vec3 vDir;
          ${NOISE}
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 zenith = vec3(0.0025, 0.003, 0.008);
            vec3 horizon = vec3(0.03, 0.026, 0.042);
            vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.5, h));

            /* The city's glow on the haze, warm with a breath of accent. */
            col += vec3(0.19, 0.095, 0.06) * exp(-abs(h + 0.005) * 20.0) * 0.55;
            col += uAccent * 0.12 * exp(-abs(h) * 8.0);

            /* Slow aurora-like veils of accent high up. */
            float veil = vnoise(vec3(d.xz * 3.0 / max(h + 0.35, 0.2), uTime * 0.02));
            veil = smoothstep(0.55, 0.95, veil) * smoothstep(0.05, 0.35, h) * (1.0 - smoothstep(0.55, 0.95, h));
            col += uAccent * veil * 0.06;

            /* Stars. */
            vec3 p = d * 130.0;
            vec3 id = floor(p);
            float r = hash13(id);
            float star = smoothstep(0.16, 0.0, length(fract(p) - 0.5)) * step(0.991, r);
            star *= smoothstep(0.03, 0.25, h) * (0.55 + 0.45 * sin(uTime * (0.8 + r * 3.0) + r * 60.0));
            col += vec3(0.85, 0.9, 1.0) * star * 2.2;

            /* A moon, low over the far side of the circuit. */
            vec3 moonDir = normalize(vec3(-0.55, 0.24, -0.8));
            float m = dot(d, moonDir);
            col += vec3(1.0, 0.96, 0.9) * smoothstep(0.99965, 0.99985, m) * 3.0;
            col += vec3(0.6, 0.65, 0.8) * pow(max(m, 0.0), 900.0) * 0.35;

            col = mix(col, vec3(0.005, 0.005, 0.008), smoothstep(-0.01, -0.25, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  );
  useFrame((state) => {
    const sky = ref.current;
    if (!sky) return;
    sky.material.uniforms.uTime.value = state.clock.elapsedTime;
    sky.position.copy(state.camera.position);
  });
  return (
    <mesh ref={ref} material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[3000, 48, 24]} />
    </mesh>
  );
}

/* ── Floor ────────────────────────────────────────────────────── */
function Floor({ mask }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uAccent: ACCENT,
          uTime: { value: 0 },
          uCar: { value: new THREE.Vector3() },
          uMask: { value: mask.texture },
          uMaskOrigin: { value: new THREE.Vector2(MASK_BOUNDS.minX, MASK_BOUNDS.minZ) },
          uMaskSize: { value: MASK_BOUNDS.size },
        },
        vertexShader: /* glsl */ `
          #include <fog_pars_vertex>
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            vec4 mvPosition = viewMatrix * world;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: /* glsl */ `
          #include <fog_pars_fragment>
          uniform vec3 uAccent;
          uniform float uTime;
          uniform vec3 uCar;
          uniform sampler2D uMask;
          uniform vec2 uMaskOrigin;
          uniform float uMaskSize;
          varying vec3 vWorld;

          float grid(vec2 p, float size, float width) {
            vec2 c = p / size;
            vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
            return 1.0 - clamp(min(g.x, g.y) / width, 0.0, 1.0);
          }

          void main() {
            float camDist = distance(vWorld, cameraPosition);
            float fade = exp(-camDist * 0.0011);
            float minor = grid(vWorld.xz, 10.0, 1.0) * smoothstep(900.0, 250.0, camDist);
            float major = grid(vWorld.xz, 80.0, 1.5);

            /* Light pooled under the deck. */
            vec2 muv = (vWorld.xz - uMaskOrigin) / uMaskSize;
            float under = texture2D(uMask, muv).r;

            /* Pulses rolling out from beneath the car. */
            float d = length(vWorld.xz - uCar.xz);
            float wave = pow(0.5 + 0.5 * sin(d * 0.05 - uTime * 2.4), 18.0) * exp(-d * 0.004);

            vec3 col = vec3(0.004, 0.0045, 0.007);
            col += uAccent * (minor * 0.08 + major * 0.2) * fade;
            col += uAccent * major * wave * 1.6;
            col += uAccent * under * 0.07 + vec3(0.012, 0.009, 0.014) * under;
            gl_FragColor = vec4(col, 1.0);
            #include <fog_fragment>
          }
        `,
      }),
    [mask]
  );
  const ref = useRef(null);
  useFrame((state) => {
    const u = ref.current?.material.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uCar.value.copy(rig.car.pos);
  });
  return (
    <mesh
      ref={ref}
      material={material}
      position={[MASK_BOUNDS.cx, FLOOR_Y, MASK_BOUNDS.cz]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-10}
    >
      <planeGeometry args={[9000, 9000, 1, 1]} />
    </mesh>
  );
}

/* ── City ─────────────────────────────────────────────────────── */
function City({ mask, count }) {
  const { geometry, material } = useMemo(() => {
    const rand = rng(7);
    /* A unit box from (0,0,0) to (1,1,1): scaled by aSize, vLocal then
       runs 0…w, 0…h, 0…d — what the window and corner-strip maths want. */
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0.5, 0.5, 0.5);
    const geometry = new THREE.InstancedBufferGeometry().copy(box);
    const offsets = [], sizes = [], seeds = [];
    const half = MASK_BOUNDS.size / 2 + 700;
    let tries = 0;
    while (seeds.length < count && tries++ < count * 30) {
      const x = MASK_BOUNDS.cx + (rand() * 2 - 1) * half;
      const z = MASK_BOUNDS.cz + (rand() * 2 - 1) * half;
      const near = mask.sample(x, z);
      if (near > 0.012) continue; // keep the deck's surroundings open
      const fromCentre = Math.hypot(x - MASK_BOUNDS.cx, z - MASK_BOUNDS.cz) / half;
      const w = 14 + rand() * 30, dpt = 14 + rand() * 30;
      /* Taller toward the outskirts, a few real spires. */
      let h = 18 + rand() * 60 + fromCentre * 90;
      if (rand() > 0.93) h += 80 + rand() * 120;
      offsets.push(x, FLOOR_Y, z);
      sizes.push(w, h, dpt);
      seeds.push(rand());
    }
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(new Float32Array(sizes), 3));
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
    geometry.instanceCount = seeds.length;

    const material = new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uAccent: ACCENT,
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        attribute vec3 aOffset;
        attribute vec3 aSize;
        attribute float aSeed;
        varying vec3 vLocal;
        varying vec3 vN;
        varying vec3 vSize;
        varying float vSeed;
        void main() {
          vLocal = position * aSize;
          vSize = aSize;
          vN = normal;
          vSeed = aSeed;
          vec4 mvPosition = viewMatrix * vec4(aOffset + vLocal, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform vec3 uAccent;
        uniform float uTime;
        varying vec3 vLocal;
        varying vec3 vN;
        varying vec3 vSize;
        varying float vSeed;
        ${NOISE}
        void main() {
          vec3 n = abs(vN);
          vec3 col = vec3(0.010, 0.011, 0.016);
          if (n.y < 0.5) {
            vec2 uv = n.x > 0.5 ? vLocal.zy : vLocal.xy;
            vec2 cell = vec2(3.2, 3.6);
            vec2 c = uv / cell;
            vec2 id = floor(c), f = fract(c);
            float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.24, f.y) * step(f.y, 0.76);
            float r = hash12(id + vSeed * 91.7);
            float lit = step(0.6, r) * step(5.0, vLocal.y);
            vec3 warm = mix(vec3(1.0, 0.7, 0.42), vec3(0.62, 0.78, 1.0), step(0.82, hash12(id.yx + vSeed * 13.0)));
            float flicker = 0.88 + 0.12 * sin(uTime * (0.6 + r * 2.0) + r * 40.0);
            /* Far away the window grid is sub-pixel: fade to its average
               rather than letting it shimmer. */
            float blur = clamp(max(fwidth(c.x), fwidth(c.y)) * 1.4, 0.0, 1.0);
            float glow = mix(win * lit * flicker, 0.4 * 0.36 * 0.9, blur);
            col += warm * glow * 1.7;
            /* Some towers carry an accent light strip up their corners. */
            float edge = max(smoothstep(0.6, 0.0, abs(uv.x)), smoothstep(0.6, 0.0, abs(uv.x - (n.x > 0.5 ? vSize.z : vSize.x))));
            col += uAccent * edge * step(0.86, vSeed) * 1.4;
          }
          /* Crown lights on the tall ones. */
          float crown = smoothstep(vSize.y - 3.0, vSize.y - 0.4, vLocal.y) * step(0.7, vSeed) * step(70.0, vSize.y);
          col += mix(uAccent, vec3(1.0), 0.2) * crown * 2.6;
          /* Haze pooling at street level. */
          col += vec3(0.05, 0.035, 0.05) * exp(-vLocal.y * 0.05);
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });
    return { geometry, material };
  }, [mask, count]);

  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ── Rising code ──────────────────────────────────────────────── */
function CodeRain({ count }) {
  const { geometry, material } = useMemo(() => {
    const rand = rng(21);
    const geometry = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    const base = new Float32Array(count * 3);
    const data = new Float32Array(count * 4);
    const frame = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    for (let i = 0; i < count; i++) {
      sampleTrack(rand() * TRACK_LENGTH, frame);
      const side = rand() < 0.5 ? -1 : 1;
      const off = 16 + Math.pow(rand(), 1.6) * 150;
      base[i * 3] = frame.pos.x + frame.right.x * off * side + (rand() - 0.5) * 30;
      base[i * 3 + 1] = rand() * 140; // phase along the climb
      base[i * 3 + 2] = frame.pos.z + frame.right.z * off * side + (rand() - 0.5) * 30;
      data[i * 4] = Math.floor(rand() * 64); // glyph
      data[i * 4 + 1] = 1.2 + rand() * 3.4; // climb speed
      data[i * 4 + 2] = 1.0 + rand() * 2.6; // size
      data[i * 4 + 3] = rand() < 0.42 ? 1 : 0; // accent or white
    }
    geometry.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
    geometry.setAttribute("aData", new THREE.InstancedBufferAttribute(data, 4));
    geometry.instanceCount = count;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uAtlas: { value: glyphAtlas() },
        uAccent: ACCENT,
        uTime: { value: 0 },
        uFloor: { value: FLOOR_Y },
        uRange: { value: 140 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aBase;
        attribute vec4 aData;
        uniform float uTime;
        uniform float uFloor;
        uniform float uRange;
        varying vec2 vUv;
        varying float vGlyph;
        varying float vTint;
        varying float vAlpha;
        void main() {
          float h = mod(aBase.y + uTime * aData.y, uRange);
          vec3 p = vec3(aBase.x, uFloor + h, aBase.z);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          mv.xy += position.xy * aData.z;
          gl_Position = projectionMatrix * mv;
          vUv = uv;
          vGlyph = aData.x;
          vTint = aData.w;
          float dist = -mv.z;
          vAlpha = smoothstep(0.0, 14.0, h) * (1.0 - smoothstep(uRange - 30.0, uRange, h))
                 * smoothstep(6.0, 18.0, dist) * (1.0 - smoothstep(220.0, 480.0, dist));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform vec3 uAccent;
        varying vec2 vUv;
        varying float vGlyph;
        varying float vTint;
        varying float vAlpha;
        void main() {
          float g = floor(vGlyph + 0.5);
          vec2 cell = vec2(mod(g, 8.0), floor(g / 8.0));
          vec2 uv = vec2((cell.x + vUv.x) / 8.0, (7.0 - cell.y + vUv.y) / 8.0);
          float a = texture2D(uAtlas, uv).r;
          vec3 col = mix(vec3(0.75, 0.82, 1.0), uAccent * 1.6, vTint);
          gl_FragColor = vec4(col * a * vAlpha * 0.9, 1.0);
        }
      `,
    });
    return { geometry, material };
  }, [count]);
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}

export default function World({ quality = 1 }) {
  const mask = useMemo(() => trackMask(), []);
  return (
    <>
      <Sky />
      <Floor mask={mask} />
      <City mask={mask} count={Math.round(900 * quality)} />
      <CodeRain count={Math.round(2400 * quality)} />
    </>
  );
}

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";
import { lap } from "./lapStore";
import { rig } from "./rig";

/* ══════════════════════════════════════════════════════════════
   PostFX — the lens the lap is filmed through.

     render (HDR) → bloom → lens → tone map + sRGB → FXAA

   Bloom is what turns emissive values above 1 — LEDs, the start
   lights, the trail along the walls — into light. The lens pass
   adds speed: a radial zoom blur and chromatic fringing that grow
   with the car's speed, plus vignette and a touch of grain. All of
   it is three's own example passes; no extra dependency.

   Mounting this takes over rendering (useFrame priority 1), so
   R3F's own render is skipped.
   ══════════════════════════════════════════════════════════════ */

const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uCar: { value: new THREE.Vector2(0.5, 0.3) },
    uAspect: { value: 1 },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uSpeed;
    uniform vec2 uCentre;
    uniform vec2 uCar;
    uniform float uAspect;
    uniform float uFlash;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 dir = vUv - uCentre;
      vec2 dirA = dir * vec2(uAspect, 1.0);
      float dist = length(dirA);

      /* The car stays sharp: everything else streaks, it doesn't. */
      float keep = smoothstep(0.05, 0.24, length((vUv - uCar) * vec2(uAspect, 1.0)));

      /* Zoom blur: sample back toward the vanishing point. */
      float amount = uSpeed * 0.032 * smoothstep(0.18, 0.8, dist) * keep;
      vec3 col = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float f = 1.0 - amount * (float(i) / 7.0);
        col += texture2D(tDiffuse, uCentre + dir * f).rgb;
      }
      col /= 8.0;

      /* Chromatic fringing toward the corners. */
      float ca = (0.0012 + uSpeed * 0.0026) * dist * keep;
      vec2 off = normalize(dir + 1e-5) * ca;
      col.r = mix(col.r, texture2D(tDiffuse, vUv + off).r, 0.85);
      col.b = mix(col.b, texture2D(tDiffuse, vUv - off).b, 0.85);

      /* Vignette, a little tighter at speed. */
      float vig = smoothstep(1.05 - uSpeed * 0.12, 0.28, dist);
      col *= mix(0.42, 1.0, vig);

      /* Grain, scaled to the signal so blacks stay black. */
      float g = hash(vUv * 1024.0 + fract(uTime * 7.13) * 97.0) - 0.5;
      col += g * 0.035 * (0.25 + min(col, vec3(1.0)));

      col += uFlash;
      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `,
};

const centre = new THREE.Vector3();

export default function PostFX({ bloomStrength = 0.62 }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const fx = useRef(null);

  useEffect(() => {
    /* HDR, so values above 1 survive for bloom to find.

       Deliberately NOT multisampled. On Intel Arc under ANGLE/D3D11 a
       4× MSAA half-float target resolves to solid black — no GL error,
       no lost context, just an empty frame — while software WebGL
       renders it perfectly, so the page looked fine everywhere it was
       tested and black on a real laptop. FXAA at the end of the chain
       does the antialiasing instead, identically on every GPU. */
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bloomStrength, 0.5, 0.88);
    composer.addPass(bloom);
    const lens = new ShaderPass(LensShader);
    composer.addPass(lens);
    composer.addPass(new OutputPass());
    /* After tone mapping: FXAA works on the final, display-referred image. */
    composer.addPass(new FXAAPass());
    const px = gl.getSize(new THREE.Vector2());
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(px.x, px.y);
    lens.uniforms.uAspect.value = px.x / Math.max(1, px.y);
    fx.current = { composer, bloom, lens };
    return () => {
      fx.current = null;
      composer.dispose();
    };
  }, [gl, scene, camera, bloomStrength]);

  useEffect(() => {
    const f = fx.current;
    if (!f) return;
    f.composer.setPixelRatio(dpr);
    f.composer.setSize(size.width, size.height);
    f.lens.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size, dpr]);

  useFrame((state, delta) => {
    const f = fx.current;
    if (!f) {
      state.gl.render(state.scene, state.camera);
      return;
    }
    const { composer, bloom, lens } = f;
    const u = lens.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    const speed = lap.reduced ? 0 : rig.speed01;
    u.uSpeed.value += (speed - u.uSpeed.value) * Math.min(1, delta * 6);

    /* Blur toward where the car is heading, not the screen centre. */
    centre.copy(rig.car.pos).addScaledVector(rig.car.fwd, 30).project(state.camera);
    const cx = THREE.MathUtils.clamp(centre.x * 0.5 + 0.5, 0.2, 0.8);
    const cy = THREE.MathUtils.clamp(centre.y * 0.5 + 0.5, 0.2, 0.8);
    u.uCentre.value.x += (cx - u.uCentre.value.x) * Math.min(1, delta * 4);
    u.uCentre.value.y += (cy - u.uCentre.value.y) * Math.min(1, delta * 4);
    centre.copy(rig.car.pos).project(state.camera);
    u.uCar.value.set(centre.x * 0.5 + 0.5, centre.y * 0.5 + 0.5);

    /* A white pop as the car takes the flag. */
    const since = lap.finishedAt >= 0 ? lap.time - lap.finishedAt : 99;
    u.uFlash.value = lap.reduced ? 0 : Math.max(0, 0.22 * (1 - since / 0.5));

    bloom.strength = bloomStrength * (1 + 0.25 * speed);
    composer.render(delta);
  }, 1);

  return null;
}

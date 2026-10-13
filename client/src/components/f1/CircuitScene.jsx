import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import {
  BARRIER_Z,
  GARAGE_H,
  GARAGE_PITCH,
  GARAGE_W,
  GARAGE_Z,
  GARAGES,
  GRID_SLOTS,
  GROUND,
  KERB_Z,
  LENGTH,
  TEAM_NAMES,
  TEAMS,
  TRACK_HALF,
  WALL_H,
  WALL_Z,
  atlas,
  garageX,
  makeCanvas,
  mulberry32,
  toTexture,
} from "./circuitKit";
import { Instances, Matte } from "./circuitParts";
import PitLane from "./PitLane";
import StandSide from "./StandSide";
import Trackside from "./Trackside";
import { ACCENT } from "./theme";

/* ══════════════════════════════════════════════════════════════
   CircuitScene — a night-race start/finish straight around the car.

   Real geometry in the car's own scene, so it shares the camera,
   the zoom and the orbit: the pedestal stands on the wet asphalt,
   the pit wall and garages keep their true perspective from every
   angle, and nothing has to be faked to line up.

   What the default camera sees (it looks down 22°, so the view is
   mostly track):
     - wet asphalt, mirroring the lit garages, LED boards and
       floodlights (a blurred planar reflection, not a painted one)
     - the far kerb and track limit line
     - the pit wall with its LED advertising boards and debris fence
     - the lower half of the lit pit garages beyond
   Orbiting brings in the start-light gantry, the floodlight towers
   and, behind the camera, the packed grandstand side (StandSide.jsx).

   The car points down +x. Track along x, pit lane on −z.
   Everything is procedural: canvases for the textures, no files.
   ══════════════════════════════════════════════════════════════ */

/* Fog and sky meet at this colour: a floodlit haze, not black. */
const HORIZON = "#151c28";

/* ── Procedural textures ───────────────────────────────────── */

/* Aggregate speckle, a few darker patches and faint rubbered-in lines:
   multiplied into the asphalt colour, and reused (greyscale) to ripple
   the reflections the way standing water does. */
function asphalt(rand) {
  const S = 512;
  const [canvas, g] = makeCanvas(S, S);
  g.fillStyle = "#dedede";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 30 + rand() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(40,40,40,${0.05 + rand() * 0.1})`);
    grad.addColorStop(1, "rgba(40,40,40,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const image = g.getImageData(0, 0, S, S);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 44;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  g.putImageData(image, 0, 0);
  g.strokeStyle = "rgba(20,20,20,0.18)";
  for (let i = 0; i < 6; i++) {
    g.lineWidth = 6 + rand() * 10;
    const y = rand() * S;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(S, y + (rand() - 0.5) * 20);
    g.stroke();
  }
  return canvas;
}

/* Pit-wall LED boards: four 4 m panels, with a dark pixel lattice laid
   over so they read as LED rather than print. */
function ledBoards() {
  const W = 2048;
  const H = 128;
  const [canvas, g] = makeCanvas(W, H);
  const panels = [
    { bg: ACCENT, fg: "#ffffff", text: "CODECARET" },
    { bg: "#05070a", fg: "#ffffff", text: "LIGHTS OUT", bar: ACCENT },
    { bg: "#05080d", fg: "#27f4d2", text: "300 WPM CLUB" },
    { bg: "#05070a", fg: ACCENT, text: "CODECARET", bar: "#ffffff" },
  ];
  const pw = W / panels.length;
  panels.forEach((p, i) => {
    const x = i * pw;
    g.fillStyle = p.bg;
    g.fillRect(x, 0, pw, H);
    if (p.bar) {
      g.fillStyle = p.bar;
      g.fillRect(x + 18, 20, 10, H - 40);
      g.fillRect(x + pw - 28, 20, 10, H - 40);
    }
    g.fillStyle = p.fg;
    g.font = "italic 900 74px 'Arial Black', 'Segoe UI', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(p.text, x + pw / 2, H / 2 + 4, pw - 80);
  });
  g.fillStyle = "rgba(0,0,0,0.45)";
  for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  return canvas;
}

/* What you see through a garage door (256×200 px over 5.6×4.3 m):
   strip lights overhead, the team's branded back wall with timing
   screens, tyre racks either side, a bright epoxy floor, and the car up
   on its stands with mechanics round it. Drawn so the lower half —
   all the default camera sees — is the car and the crew. */
function garageInterior(rand, team) {
  const W = 256;
  const H = 200;
  const FLOOR = 146;
  const [canvas, g] = makeCanvas(W, H);

  const wall = g.createLinearGradient(0, 0, 0, FLOOR);
  wall.addColorStop(0, "#eef2f6");
  wall.addColorStop(0.35, "#aeb8c3");
  wall.addColorStop(1, "#6d7782");
  g.fillStyle = wall;
  g.fillRect(0, 0, W, FLOOR);
  const floor = g.createLinearGradient(0, FLOOR, 0, H);
  floor.addColorStop(0, "#9aa4ae");
  floor.addColorStop(1, "#c3cad1");
  g.fillStyle = floor;
  g.fillRect(0, FLOOR, W, H - FLOOR);

  g.fillStyle = "#ffffff";
  for (let x = 10; x < W; x += 60) g.fillRect(x, 5, 44, 6);

  /* Branded back wall: team band, two timing screens. */
  g.fillStyle = team;
  g.fillRect(0, 50, W, 30);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, 80, W, 4);
  g.fillStyle = "#0b1422";
  g.fillRect(70, 90, 50, 30);
  g.fillRect(136, 90, 50, 30);
  g.fillStyle = "#3d8bff";
  for (let k = 0; k < 5; k++) {
    g.fillRect(74, 94 + k * 5, 20 + rand() * 20, 2);
    g.fillRect(140, 94 + k * 5, 20 + rand() * 20, 2);
  }

  /* Tyre racks against the side walls. */
  for (const x0 of [6, W - 40]) {
    g.fillStyle = "#3b4149";
    g.fillRect(x0 - 2, 70, 38, FLOOR - 70);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const cx = x0 + 9 + col * 17;
        const cy = 84 + row * 22;
        g.fillStyle = "#15171b";
        g.beginPath();
        g.arc(cx, cy, 9, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = ["#e10600", "#f2c417", "#e9e9e9"][(row + col) % 3];
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(cx, cy, 6.5, 0, Math.PI * 2);
        g.stroke();
      }
    }
  }

  /* The car, side on, on its stands. */
  const body = "#121418";
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(40, 172);
  g.lineTo(78, 168);
  g.lineTo(108, 160);
  g.lineTo(120, 152);
  g.quadraticCurveTo(130, 141, 142, 148);
  g.lineTo(156, 145);
  g.lineTo(190, 154);
  g.lineTo(205, 156);
  g.lineTo(206, 138);
  g.lineTo(226, 138);
  g.lineTo(226, 170);
  g.lineTo(40, 176);
  g.closePath();
  g.fill();
  g.fillRect(28, 172, 36, 5); // front wing
  g.strokeStyle = team;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(80, 166);
  g.lineTo(118, 156);
  g.moveTo(158, 150);
  g.lineTo(200, 158);
  g.stroke();
  for (const [cx, r] of [
    [84, 14],
    [196, 16],
  ]) {
    g.fillStyle = "#0a0b0d";
    g.beginPath();
    g.arc(cx, 184 - r + 8, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#6a717a";
    g.beginPath();
    g.arc(cx, 184 - r + 8, r * 0.45, 0, Math.PI * 2);
    g.fill();
  }

  /* Mechanics, in the team's suits. */
  const suit = team;
  for (const x of [52 + rand() * 20, 150 + rand() * 20, 214 + rand() * 12]) {
    g.fillStyle = "#1a1c21";
    g.fillRect(x - 5, 162, 4, 24);
    g.fillRect(x + 1, 162, 4, 24);
    g.fillStyle = suit;
    g.fillRect(x - 7, 134, 14, 30);
    g.fillStyle = "#e6e8eb";
    g.beginPath();
    g.arc(x, 128, 6, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}

/* Name boards over the garage doors: one tile per team. */
function fascias() {
  const TILE = 256;
  const [canvas, g] = makeCanvas(TILE * TEAMS.length, 40);
  TEAMS.forEach((colour, i) => {
    const x = i * TILE;
    g.fillStyle = colour;
    g.fillRect(x, 0, TILE, 40);
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, 32, TILE, 8);
    g.fillStyle = i === 7 || i === 1 || i === 6 ? "#0b0c0e" : "#ffffff";
    g.font = "italic 900 24px 'Arial Black', 'Segoe UI', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(TEAM_NAMES[i], x + TILE / 2, 18, TILE - 24);
  });
  return canvas;
}

function checker() {
  const [canvas, g] = makeCanvas(256, 32);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? "#e9ebee" : "#111214";
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  return canvas;
}

/* Illuminated signs for the pit building roof. They sit above the frame
   at the default camera angle, but their reflections land on the wet
   track just behind the car — which is where a night race shows them. */
function roofSigns() {
  const W = 2048;
  const H = 256;
  const [canvas, g] = makeCanvas(W, H);
  const signs = [
    { bg: ACCENT, fg: "#ffffff", text: "CODECARET" },
    { bg: "#04060a", fg: "#ffffff", text: "LIGHTS OUT", bar: ACCENT },
  ];
  const sw = W / signs.length;
  signs.forEach((s, i) => {
    const x = i * sw;
    g.fillStyle = s.bg;
    g.fillRect(x + 12, 12, sw - 24, H - 24);
    if (s.bar) {
      g.fillStyle = s.bar;
      g.fillRect(x + 40, H - 58, sw - 80, 16);
    }
    g.fillStyle = s.fg;
    g.font = "italic 900 150px 'Arial Black', 'Segoe UI', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(s.text, x + sw / 2, H / 2 - (s.bar ? 8 : 0), sw - 120);
  });
  return canvas;
}

/* Where the track holds standing water: darker = smoother, so the
   reflection there is sharp instead of smeared. */
function puddles(rand) {
  const S = 512;
  const [canvas, g] = makeCanvas(S, S);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 40 + rand() * 110;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(40,40,40,1)");
    grad.addColorStop(0.6, "rgba(40,40,40,0.7)");
    grad.addColorStop(1, "rgba(40,40,40,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.4 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}

function glow() {
  const [canvas, g] = makeCanvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return canvas;
}

/* A soft pool of light for the pit lane in front of each garage. */
function pool() {
  const [canvas, g] = makeCanvas(256, 256);
  const grad = g.createRadialGradient(128, 90, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return canvas;
}

/* Soft-edged band across its width, for the racing line. */
function band() {
  const [canvas, g] = makeCanvas(8, 128);
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 128);
  return canvas;
}

function useTextures() {
  const textures = useMemo(() => {
    const rand = mulberry32(0x0f1);
    const asphaltCanvas = asphalt(rand);
    return {
      asphalt: toTexture(asphaltCanvas, { repeat: [LENGTH / 5, 100 / 5] }),
      ripple: toTexture(asphaltCanvas, { srgb: false, repeat: [LENGTH / 9, 100 / 9] }),
      led: toTexture(ledBoards(), { repeat: [LENGTH / 16, 1] }),
      garages: TEAMS.map((team) => toTexture(garageInterior(rand, team))),
      fascias: atlas(fascias(), TEAMS.length),
      checker: toTexture(checker(), { repeat: [1, 9] }),
      glow: toTexture(glow()),
      pool: toTexture(pool()),
      band: toTexture(band()),
      /* One canvas, two views of it: offset and repeat live on the texture
         object, so each sign variant needs its own. */
      signs: (() => {
        const canvas = roofSigns();
        return [0, 0.5].map((offset) => {
          const t = toTexture(canvas);
          t.repeat.set(0.5, 1);
          t.offset.set(offset, 0);
          return t;
        });
      })(),
      puddles: toTexture(puddles(rand), { srgb: false, repeat: [LENGTH / 34, 100 / 34] }),
    };
  }, []);

  useEffect(
    () => () => {
      for (const t of Object.values(textures)) {
        if (Array.isArray(t)) t.forEach((x) => x.dispose());
        else t.dispose();
      }
    },
    [textures]
  );

  return textures;
}

/* ── Sky ───────────────────────────────────────────────────── */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 haze;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 colour = mix(horizon, zenith, smoothstep(0.0, 0.45, h));
    colour += haze * exp(-abs(h) * 14.0);
    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          zenith: { value: new THREE.Color("#020308") },
          horizon: { value: new THREE.Color(HORIZON) },
          haze: { value: new THREE.Color("#1a1512") },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[62, 32, 16]} />
    </mesh>
  );
}

/* ── Track ─────────────────────────────────────────────────── */

const KERB_BLOCKS = 110;
const placeKerb = (i) => {
  const side = i % 2 === 0 ? -1 : 1;
  const k = Math.floor(i / 2);
  return {
    position: [-LENGTH / 4 + k * 1 + 0.5, GROUND + 0.018, side * KERB_Z],
    scale: [1, 0.036, 1.2],
    colour: k % 2 ? "#c4c7cb" : "#a80e22",
  };
};

/* ── Wet asphalt ───────────────────────────────────────────────
   A planar reflection (three's Reflector renders the mirrored view each
   frame) with its own surface shader. Stock reflector materials multiply
   the reflection into the lit diffuse colour, so a reflection is only as
   bright as the floor is lit — on a dark night track they vanish. Real
   wet asphalt is the other way round: a near-black surface with the
   reflection *added* on top. So:

     - base: dark asphalt, unlit
     - reflection: added, stretched along the view (wet roads smear
       lights towards you) and blurred through the mip chain — sharp in
       the puddles, soft elsewhere, rippled by a noise map
     - Fresnel: little mirror underfoot, a lot towards the horizon
     - scene fog applied as usual */

const WET_SHADER = {
  name: "WetAsphalt",
  uniforms: {
    ...THREE.UniformsLib.fog,
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tAsphalt: { value: null },
    tPuddles: { value: null },
    tRipple: { value: null },
    asphaltRepeat: { value: new THREE.Vector2(LENGTH / 5, 100 / 5) },
    puddleRepeat: { value: new THREE.Vector2(LENGTH / 34, 100 / 34) },
    baseColour: { value: new THREE.Color("#1a1b1f") },
    strength: { value: 1.25 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vReflect;
    varying vec2 vUv;
    varying vec3 vWorld;
    #include <common>
    #include <fog_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = uv;
      vReflect = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vec4 mvPosition = viewMatrix * world;
      gl_Position = projectionMatrix * mvPosition;
      #include <logdepthbuf_vertex>
      #include <fog_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform sampler2D tAsphalt;
    uniform sampler2D tPuddles;
    uniform sampler2D tRipple;
    uniform vec2 asphaltRepeat;
    uniform vec2 puddleRepeat;
    uniform vec3 baseColour;
    uniform float strength;
    varying vec4 vReflect;
    varying vec2 vUv;
    varying vec3 vWorld;
    #include <common>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      /* Two scales multiplied, so the 5 m tile never reads as a grid. */
      vec3 asphalt = texture2D(tAsphalt, vUv * asphaltRepeat).rgb
        * (0.55 + 0.45 * texture2D(tAsphalt, vUv * asphaltRepeat * 0.137 + 0.31).r);
      float wet = 1.0 - texture2D(tPuddles, vUv * puddleRepeat).g;
      vec2 ripple = texture2D(tRipple, vUv * asphaltRepeat * 0.37).rg - 0.5;

      vec2 uv = vReflect.xy / vReflect.w + ripple * mix(0.014, 0.004, wet);
      float lod = mix(4.5, 1.2, wet);
      float spread = mix(0.014, 0.004, wet);
      vec3 reflection = vec3(0.0);
      float total = 0.0;
      for (int i = -4; i <= 4; i++) {
        float w = 1.0 - abs(float(i)) / 5.0;
        reflection += textureLod(tDiffuse, uv + vec2(0.0, float(i) * spread), lod).rgb * w;
        total += w;
      }
      reflection /= total;

      vec3 toEye = normalize(cameraPosition - vWorld);
      float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(toEye.y, 0.0, 1.0), 5.0);
      float amount = strength * mix(0.5, 1.0, wet) * (0.3 + 0.7 * fresnel);

      gl_FragColor = vec4(baseColour * asphalt + reflection * color * amount, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
};

function WetAsphalt({ textures }) {
  const reflector = useMemo(() => {
    const surface = new Reflector(new THREE.PlaneGeometry(LENGTH, 100), {
      shader: WET_SHADER,
      color: "#ffffff",
      textureWidth: 1024,
      textureHeight: 1024,
      multisample: 0,
      clipBias: 0.003,
    });
    /* Mipmaps on the reflection are what make the cheap blur possible. */
    const target = surface.getRenderTarget().texture;
    target.generateMipmaps = true;
    target.minFilter = THREE.LinearMipmapLinearFilter;

    surface.material.fog = true;
    surface.material.uniforms.tAsphalt.value = textures.asphalt;
    surface.material.uniforms.tPuddles.value = textures.puddles;
    surface.material.uniforms.tRipple.value = textures.ripple;
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(0, GROUND, -10);

    /* Anything tagged userData.skipReflection (the car) is hidden for the
       mirror pass only. The tag is looked up each frame rather than cached,
       so it keeps working as the car's parts mount and unmount. */
    const renderMirror = surface.onBeforeRender;
    const skipped = [];
    surface.onBeforeRender = function (renderer, scene, camera, ...rest) {
      skipped.length = 0;
      scene.traverseVisible((object) => {
        if (object.userData.skipReflection) skipped.push(object);
      });
      for (const object of skipped) object.visible = false;
      renderMirror.call(this, renderer, scene, camera, ...rest);
      for (const object of skipped) object.visible = true;
    };
    return surface;
  }, [textures]);

  useEffect(
    () => () => {
      reflector.dispose();
      reflector.geometry.dispose();
    },
    [reflector]
  );

  return <primitive object={reflector} />;
}

function Track({ textures }) {
  return (
    <group>
      {/* One reflector for everything on the ground: each costs a full
          extra render, so the track, run-off and pit lane share it. */}
      <WetAsphalt textures={textures} />

      {/* Light from the rig over the car, pooled on the track around it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.002, 0]} renderOrder={-1}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial
          map={textures.pool}
          color="#8a97a8"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* The rubbered-in racing line: darker, so less shine. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.001, -2.4]} renderOrder={-3}>
        <planeGeometry args={[LENGTH, 4.6]} />
        <meshBasicMaterial alphaMap={textures.band} color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* Uneven floodlighting: broad soft pools where the towers aim. */}
      {[-46, -12, 18, 52].map((x, i) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND + 0.003, i % 2 ? -4 : 3]} renderOrder={-1}>
          <planeGeometry args={[34, 24]} />
          <meshBasicMaterial
            map={textures.pool}
            color="#6f7f94"
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Drier, rougher run-off: a dark veil that dulls the reflection
          outside the racing surface. The pit lane gets only a light one —
          the garage lights reflect there, and they are the best of it. */}
      {[
        [(-TRACK_HALF - 0.2 + WALL_Z) / 2, WALL_Z + TRACK_HALF + 0.2, 0.15],
        [(TRACK_HALF + 0.2 + BARRIER_Z) / 2, BARRIER_Z - TRACK_HALF - 0.2, 0.45],
        [(WALL_Z - 0.6 + GARAGE_Z) / 2, WALL_Z - 0.6 - GARAGE_Z, 0.2],
      ].map(([z, depth, opacity]) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.002, z]} renderOrder={-2}>
          <planeGeometry args={[LENGTH, Math.abs(depth)]} />
          <meshBasicMaterial color="#050608" transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}

      {/* Track limit lines. */}
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.004, side * (TRACK_HALF - 0.1)]}>
          <planeGeometry args={[LENGTH, 0.24]} />
          <Matte color="#d6d9dd" roughness={0.55} />
        </mesh>
      ))}

      <Instances count={KERB_BLOCKS * 2} place={placeKerb} castShadow={false}>
        <boxGeometry />
        <Matte roughness={0.55} />
      </Instances>

      {/* Pit lane edge line and the dashed speed-limit line. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND + 0.004, WALL_Z - 1.2]}>
        <planeGeometry args={[LENGTH, 0.2]} />
        <Matte color="#d6d9dd" roughness={0.6} />
      </mesh>

      {/* Grid slots behind the car. */}
      {GRID_SLOTS.map(([x, z]) => (
        <group key={x} position={[x, GROUND + 0.004, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 4.4]} />
            <Matte color="#d6d9dd" roughness={0.6} />
          </mesh>
          {[-2.1, 2.1].map((dz) => (
            <mesh key={dz} rotation={[-Math.PI / 2, 0, 0]} position={[0.6, 0, dz]}>
              <planeGeometry args={[1.2, 0.2]} />
              <Matte color="#d6d9dd" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Start / finish line. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[24, GROUND + 0.004, 0]}>
        <planeGeometry args={[1.1, TRACK_HALF * 2]} />
        <Matte map={textures.checker} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ── Pit wall ──────────────────────────────────────────────── */

const LAMP_H = 7.4;
const LAMPS = Array.from({ length: 13 }, (_, i) => -84 + i * 14);

/* A low row of fence lamps. Lights ~3 m up are the ones whose reflections
   fall in the open track between the kerb and the car at the default
   angle — higher ones land under the pedestal, lower ones in the run-off. */
const FENCE_LAMP_H = 3.1;
const FENCE_LAMPS = Math.floor(LENGTH / 3);
const placeFenceLamp = (i) => ({
  position: [-LENGTH / 2 + 1.5 + i * 3, GROUND + FENCE_LAMP_H, WALL_Z - 0.2],
  scale: [0.55, 0.16, 1],
});

const FENCE_POSTS = Math.floor(LENGTH / 4);
const placePost = (i) => ({
  position: [-LENGTH / 2 + i * 4, GROUND + WALL_H + 1.7, WALL_Z - 0.32],
  scale: [0.09, 3.4, 0.09],
});

function PitWall({ textures }) {
  return (
    <group>
      <mesh position={[0, GROUND + WALL_H / 2, WALL_Z - 0.32]}>
        <boxGeometry args={[LENGTH, WALL_H, 0.64]} />
        <Matte color="#1b1e23" roughness={0.93} />
      </mesh>
      <mesh position={[0, GROUND + WALL_H + 0.03, WALL_Z - 0.32]}>
        <boxGeometry args={[LENGTH, 0.06, 0.7]} />
        <Matte color="#2d3137" roughness={0.8} />
      </mesh>

      {/* LED boards on the track face. toneMapped off so they glow at
          their true colour instead of being compressed to grey. */}
      <mesh position={[0, GROUND + 0.62, WALL_Z + 0.004]}>
        <planeGeometry args={[LENGTH, 0.72]} />
        <meshBasicMaterial map={textures.led} toneMapped={false} color="#d9d9d9" />
      </mesh>

      <Instances count={FENCE_POSTS} place={placePost}>
        <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
        <Matte color="#3a4048" metalness={0.6} roughness={0.5} />
      </Instances>
      {/* Debris fence: at this distance the mesh reads as a faint veil. */}
      <mesh position={[0, GROUND + WALL_H + 1.7, WALL_Z - 0.3]}>
        <planeGeometry args={[LENGTH, 3.4]} />
        <meshBasicMaterial color="#8e9aab" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, GROUND + WALL_H + 3.42, WALL_Z - 0.32]}>
        <boxGeometry args={[LENGTH, 0.07, 0.07]} />
        <Matte color="#3a4048" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Bloom stand-in: LEDs that bright light the air around them. */}
      <mesh position={[0, GROUND + 0.62, WALL_Z + 0.06]} renderOrder={1}>
        <planeGeometry args={[LENGTH, 1.9]} />
        <meshBasicMaterial
          map={textures.band}
          color="#b9c3d1"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Instances count={FENCE_LAMPS} place={placeFenceLamp}>
        <planeGeometry />
        <meshBasicMaterial color="#fff3df" toneMapped={false} />
      </Instances>

      {/* Lamp rigs on the fence. Too high to be in frame at the default
          angle — but their reflections are what streak down the wet track
          between the kerb and the car. */}
      {LAMPS.map((x) => (
        <group key={x} position={[x, GROUND, WALL_Z - 0.32]}>
          <mesh position={[0, (WALL_H + LAMP_H) / 2, -0.12]}>
            <cylinderGeometry args={[0.06, 0.08, LAMP_H - WALL_H, 6]} />
            <Matte color="#2a2f36" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[0, LAMP_H, 0.35]}>
            <boxGeometry args={[1.4, 0.22, 0.7]} />
            <Matte color="#1b1f25" roughness={0.7} />
          </mesh>
          <mesh position={[0, LAMP_H - 0.115, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.5]} />
            <meshBasicMaterial color="#f7f3ea" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <sprite position={[0, LAMP_H - 0.3, 0.6]} scale={[5.5, 5.5, 1]}>
            <spriteMaterial map={textures.glow} color="#fff4e2" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 2.6]} renderOrder={-1}>
            <planeGeometry args={[9, 7]} />
            <meshBasicMaterial
              map={textures.pool}
              color="#8e97a3"
              transparent
              opacity={0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Pit building ──────────────────────────────────────────── */

const placePillar = (i) => ({
  position: [garageX(i) + GARAGE_PITCH / 2, GROUND + GARAGE_H / 2, GARAGE_Z - 0.6],
  scale: [GARAGE_PITCH - GARAGE_W, GARAGE_H, 1.2],
});
const placeMullion = (i) => ({
  position: [-LENGTH / 2 + i * 2.2, GROUND + 6.55, GARAGE_Z - 0.35],
  scale: [0.12, 2.3, 0.1],
});

function PitBuilding({ textures }) {
  const garages = useMemo(
    () => Array.from({ length: GARAGES }, (_, i) => ({ x: garageX(i), team: i % TEAMS.length })),
    []
  );

  return (
    <group>
      {/* Lit interiors, set back behind the pillars. */}
      {garages.map(({ x, team }) => (
        <group key={x}>
          <mesh position={[x, GROUND + GARAGE_H / 2, GARAGE_Z - 1.2]}>
            <planeGeometry args={[GARAGE_W + 0.2, GARAGE_H]} />
            <meshBasicMaterial map={textures.garages[team]} toneMapped={false} color="#c8ccd2" />
          </mesh>
          {/* Team name board over the door. */}
          <mesh position={[x, GROUND + GARAGE_H + 0.42, GARAGE_Z + 0.01]}>
            <planeGeometry args={[GARAGE_W * 0.86, 0.5]} />
            <meshBasicMaterial map={textures.fascias[team]} toneMapped={false} color="#d8d8d8" />
          </mesh>
          {/* Work light spilling out onto the pit lane. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND + 0.006, GARAGE_Z + 3.2]} renderOrder={-1}>
            <planeGeometry args={[GARAGE_W * 1.5, 7.5]} />
            <meshBasicMaterial
              map={textures.pool}
              color="#aeb8c4"
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <Instances count={GARAGES + 1} place={placePillar}>
        <boxGeometry />
        <Matte color="#151820" roughness={0.85} />
      </Instances>

      {/* Band over the doors, the glazed hospitality level and the roof. */}
      <mesh position={[0, GROUND + GARAGE_H + 0.55, GARAGE_Z - 0.6]}>
        <boxGeometry args={[LENGTH, 1.1, 1.2]} />
        <Matte color="#12151b" roughness={0.8} />
      </mesh>
      <mesh position={[0, GROUND + 6.55, GARAGE_Z - 0.45]}>
        <planeGeometry args={[LENGTH, 2.3]} />
        <meshBasicMaterial color="#27384d" toneMapped={false} />
      </mesh>
      <Instances count={Math.floor(LENGTH / 2.2)} place={placeMullion}>
        <boxGeometry />
        <Matte color="#0c0f14" roughness={0.7} />
      </Instances>
      <mesh position={[0, GROUND + 8.4, GARAGE_Z - 1.5]}>
        <boxGeometry args={[LENGTH, 1.4, 3.2]} />
        <Matte color="#0e1116" roughness={0.85} />
      </mesh>
      <mesh position={[0, GROUND + 7.72, GARAGE_Z + 0.12]}>
        <boxGeometry args={[LENGTH, 0.05, 0.05]} />
        <meshBasicMaterial color="#dff1ff" toneMapped={false} />
      </mesh>

      {/* Roof signs on short masts. */}
      {[-66, -22, 22, 66].map((x, i) => (
        <group key={x} position={[x, GROUND + 9.1, GARAGE_Z - 0.9]}>
          <mesh position={[0, 2.35, 0]}>
            <planeGeometry args={[30, 3.6]} />
            <meshBasicMaterial map={textures.signs[i % 2]} toneMapped={false} color="#e8e8e8" />
          </mesh>
          {[-12, 0, 12].map((dx) => (
            <mesh key={dx} position={[dx, 0.28, -0.2]}>
              <boxGeometry args={[0.3, 0.56, 0.3]} />
              <Matte color="#15181d" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ── Floodlights and start gantry ──────────────────────────── */

const TOWERS = [
  ...[-80, -40, 0, 40, 80].map((x) => ({ x, z: -40, facing: 1 })),
  ...[-45, -15, 15, 45].map((x) => ({ x, z: 46, facing: -1 })),
];

function Floodlights({ textures }) {
  return (
    <group>
      {TOWERS.map(({ x, z, facing }) => (
        <group key={`${x}:${z}`} position={[x, GROUND, z]}>
          <mesh position={[0, 13, 0]}>
            <cylinderGeometry args={[0.18, 0.32, 26, 8]} />
            <Matte color="#1c2027" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[0, 26.4, facing * 0.3]}>
            <boxGeometry args={[5.2, 2.4, 0.4]} />
            <Matte color="#14171c" roughness={0.7} />
          </mesh>
          {[-1.8, -0.6, 0.6, 1.8].flatMap((dx) =>
            [-0.55, 0.55].map((dy) => (
              <mesh key={`${dx}:${dy}`} position={[dx, 26.4 + dy, facing * 0.52]} rotation={[0, facing > 0 ? 0 : Math.PI, 0]}>
                <planeGeometry args={[1, 0.8]} />
                <meshBasicMaterial color="#f5f8ff" toneMapped={false} />
              </mesh>
            ))
          )}
          <sprite position={[0, 26.4, facing * 1.2]} scale={[22, 22, 1]}>
            <spriteMaterial map={textures.glow} color="#dce8ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

function StartGantry({ textures }) {
  const x = 24;
  const lights = [];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 2; row++) {
      lights.push([-3.2 + col * 1.6, row * 0.7]);
    }
  }
  return (
    <group position={[x, GROUND, 0]}>
      {[-11.4, 11.4].map((z) => (
        <group key={z}>
          <mesh position={[0, 3.6, z]}>
            <boxGeometry args={[0.8, 7.2, 0.8]} />
            <Matte color="#1a1d23" roughness={0.7} />
          </mesh>
          {/* Marshal light panel on each leg, facing the grid: green,
              the track is clear. */}
          <mesh position={[-0.46, 2.9, z]}>
            <boxGeometry args={[0.12, 0.86, 0.86]} />
            <Matte color="#0d0f12" roughness={0.6} />
          </mesh>
          <mesh position={[-0.53, 2.9, z]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.66, 0.66]} />
            <meshBasicMaterial color="#27e05f" toneMapped={false} />
          </mesh>
          <sprite position={[-0.7, 2.9, z]} scale={[2.2, 2.2, 1]}>
            <spriteMaterial map={textures.glow} color="#3dff78" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
      <mesh position={[0, 6.8, 0]}>
        <boxGeometry args={[1, 1.6, 23.6]} />
        <Matte color="#111318" roughness={0.6} />
      </mesh>
      {lights.map(([dz, dy]) => (
        <group key={`${dz}:${dy}`} position={[-0.51, 6.45 + dy, dz]}>
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.24, 20]} />
            <meshBasicMaterial color={ACCENT} toneMapped={false} />
          </mesh>
          <sprite position={[-0.1, 0, 0]} scale={[1.8, 1.8, 1]}>
            <spriteMaterial map={textures.glow} color={ACCENT} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

export default function CircuitScene() {
  const textures = useTextures();
  /* A fragment, not a group: `attach="fog"` and `attach="background"`
     bind to the parent object, and they have to land on the scene. */
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      {/* Floodlit haze rather than black: distance brightens slightly,
          the way a lit circuit's air does. */}
      <fog attach="fog" args={[HORIZON, 24, 80]} />
      <Sky />
      <Track textures={textures} />
      <PitWall textures={textures} />
      <PitLane />
      <Trackside />
      <PitBuilding textures={textures} />
      <Floodlights textures={textures} />
      <StartGantry textures={textures} />
      <StandSide textures={textures} />
    </>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { FIT, MODEL_URL, paintedBodyOf, wheelsOf } from "../f1/carGeometry";
import { ACCENT, PAINT, onAccent } from "./accent";
import { lap } from "./lapStore";
import { rig } from "./rig";

/* ══════════════════════════════════════════════════════════════
   RaceCar — the auth pages' F1 car, out on track.

   Posed from rig.car every frame (matrixAutoUpdate off: the frame
   comes ready-made). The body is sprung separately from the wheels,
   so it pitches and rolls over tyres that stay on the road; the
   front wheels steer to the line's curvature and all four roll at
   the car's real speed.

   Model frame (see f1/carGeometry.js): after FIT and the +90° yaw
   below, the nose points down +x, y is up and +z is the driver's
   right — the same frame rig.car.matrix is built in.
   ══════════════════════════════════════════════════════════════ */

const ROLL_CENTRE = 0.3; // metres: the body pivots here, not at the road

export default function RaceCar() {
  const { nodes, materials } = useGLTF(MODEL_URL);
  const body = nodes["FRONT_NOSE_Carbon_Fiber_-_Twill_0"];
  const aero = nodes["Body122_Carbon_Fiber_-_Plain_0"];
  const rubber = nodes["Body387_Rubber_-_Weathered_0"];

  const wheels = useMemo(() => wheelsOf(rubber.geometry), [rubber]);
  const bodyGeometry = useMemo(() => paintedBodyOf(body.geometry, wheels), [body, wheels]);

  /* Clearcoated paint in the theme's accent (crimson on Carbon). */
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: PAINT.value.clone(),
        metalness: 0.18,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.6,
      }),
    []
  );
  const carbon = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#09090a",
        metalness: 0.75,
        roughness: 0.4,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.1,
      }),
    []
  );
  useEffect(() => onAccent(() => paint.color.copy(PAINT.value)), [paint]);

  const root = useRef(null);
  const chassis = useRef(null);
  const steer = useRef([]);
  const spin = useRef([]);
  const rain = useRef(null);

  useFrame((state) => {
    const c = rig.car;
    if (root.current) {
      root.current.matrix.copy(c.matrix);
      root.current.matrixWorldNeedsUpdate = true;
    }
    if (chassis.current) {
      chassis.current.position.y = ROLL_CENTRE + c.heave;
      chassis.current.rotation.set(c.roll, 0, c.pitch);
    }
    for (let i = 0; i < 4; i++) {
      if (steer.current[i]) steer.current[i].rotation.z = i < 2 ? c.steer : 0;
      if (spin.current[i]) spin.current[i].rotation.x = c.spin;
    }
    /* Rain light: steady on the grid, blinking when the yellow flag is out. */
    if (rain.current) {
      const blink = lap.light === "amber" ? (Math.sin(state.clock.elapsedTime * 12) > 0 ? 1 : 0.08) : 1;
      rain.current.material.color.setRGB(6 * blink, 0.25 * blink, 0.2 * blink);
    }
  });

  return (
    <group ref={root} matrixAutoUpdate={false}>
      {/* Sprung mass: body and wings. */}
      <group ref={chassis}>
        <group position={[0, -ROLL_CENTRE, 0]}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <group position={FIT.position} rotation={FIT.rotation} scale={FIT.scale}>
              <mesh geometry={bodyGeometry} material={[paint, carbon]} />
              <mesh geometry={aero.geometry} material={carbon} />
            </group>
          </group>
          <mesh ref={rain} position={[-2.33, 0.37, 0]}>
            <boxGeometry args={[0.03, 0.07, 0.15]} />
            <meshBasicMaterial color={[6, 0.25, 0.2]} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Unsprung: the wheels, steering at the front. */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <group position={FIT.position} rotation={FIT.rotation} scale={FIT.scale}>
          {wheels.map((w, i) => (
            <group key={i} position={w.centre} ref={(el) => (steer.current[i] = el)}>
              <group ref={(el) => (spin.current[i] = el)}>
                <mesh geometry={w.geometry} material={materials["Rubber_-_Weathered"]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/* Lights that travel with the car: a key from above the nose like a
   TV crane light, and an accent rim from behind. Real lights, but
   only these two — they are what make the paint read as paint. */
const _v = new THREE.Vector3();
export function CarLights() {
  const key = useRef(null);
  const rim = useRef(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const c = rig.car;
    if (key.current) {
      _v.copy(c.pos).addScaledVector(c.fwd, 5).addScaledVector(c.right, -3.5);
      _v.y += 9;
      key.current.position.copy(_v);
      target.position.copy(c.pos);
      target.updateMatrixWorld();
    }
    if (rim.current) {
      _v.copy(c.pos).addScaledVector(c.fwd, -6).addScaledVector(c.right, 2.5);
      _v.y += 2.2;
      rim.current.position.copy(_v);
      rim.current.color.copy(ACCENT.value);
    }
  });
  return (
    <>
      <primitive object={target} />
      <spotLight ref={key} target={target} intensity={210} angle={0.36} penumbra={0.9} distance={30} decay={2} color="#fff6ec" />
      <pointLight ref={rim} intensity={26} distance={14} decay={2} />
    </>
  );
}

useGLTF.preload(MODEL_URL);

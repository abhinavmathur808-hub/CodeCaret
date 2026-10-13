import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { FRONT_AXLE, REAR_AXLE, TRACK_HALF_WIDTH } from "./circuitKit";

/* ══════════════════════════════════════════════════════════════
   circuitParts — small building blocks for the circuit scenery.
   ══════════════════════════════════════════════════════════════ */

/* Scenery barely takes the studio environment. Those Lightformers exist
   to put showroom highlights on the car; on rough asphalt and concrete
   their broad specular reads as daylight and greys the whole night out. */
export function Matte(props) {
  return <meshStandardMaterial envMapIntensity={0.06} {...props} />;
}

/* A low-detail F1 car: enough of the silhouette — nose, sidepods,
   engine cover and airbox, halo, both wings, wheels — to read at
   15–40 m, for the cars in the pit boxes and on the grid. Built along
   +x, wheels on the ground at y = 0. */
export function ProxyCar({ position, colour }) {
  const carbon = "#111317";
  const tyre = "#15161a";
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[3.9, 0.05, 1.45]} />
        <Matte color={carbon} roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.44, 0]}>
        <boxGeometry args={[2, 0.5, 0.74]} />
        <Matte color={colour} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[1.95, 0.3, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[1.5, 0.22, 0.34]} />
        <Matte color={colour} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[-0.45, 0.35, 0]}>
        <boxGeometry args={[1.6, 0.42, 1.34]} />
        <Matte color={colour} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[-1.2, 0.62, 0]}>
        <boxGeometry args={[1.5, 0.46, 0.52]} />
        <Matte color={colour} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[-0.35, 0.95, 0]}>
        <boxGeometry args={[0.5, 0.32, 0.3]} />
        <Matte color={carbon} roughness={0.5} />
      </mesh>
      {/* Driver's helmet and the halo over it. */}
      <mesh position={[0.25, 0.8, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <Matte color="#f1f2f4" roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.035, 6, 20, Math.PI]} />
        <Matte color={carbon} roughness={0.5} />
      </mesh>
      {/* Rear wing: two elements between endplates. */}
      <mesh position={[-2.05, 0.95, 0]}>
        <boxGeometry args={[0.34, 0.06, 1.02]} />
        <Matte color={carbon} roughness={0.5} />
      </mesh>
      <mesh position={[-2.0, 1.06, 0]}>
        <boxGeometry args={[0.22, 0.05, 1.02]} />
        <Matte color={colour} roughness={0.4} />
      </mesh>
      {[-0.52, 0.52].map((z) => (
        <mesh key={z} position={[-2.02, 0.84, z]}>
          <boxGeometry args={[0.62, 0.5, 0.03]} />
          <Matte color={carbon} roughness={0.5} />
        </mesh>
      ))}
      {/* Front wing and endplates. */}
      <mesh position={[2.55, 0.13, 0]}>
        <boxGeometry args={[0.46, 0.05, 1.9]} />
        <Matte color={carbon} roughness={0.5} />
      </mesh>
      {[-0.95, 0.95].map((z) => (
        <mesh key={z} position={[2.55, 0.22, z]}>
          <boxGeometry args={[0.46, 0.2, 0.03]} />
          <Matte color={colour} roughness={0.4} />
        </mesh>
      ))}
      {/* Wheels, axles along z. */}
      {[
        [FRONT_AXLE, 0.36, 0.32],
        [REAR_AXLE, 0.37, 0.4],
      ].flatMap(([x, r, w]) =>
        [-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, w, 16]} />
            <Matte color={tyre} roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* One draw call for many copies. `place(i)` returns each copy's
   position, and optionally scale, rotation (Euler XYZ, or rotationY for
   the common upright case) and colour. `place` must be stable — a
   module-level function — or the matrices are rebuilt every render. */
export function Instances({ count, place, children, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const { position, scale = [1, 1, 1], rotation, rotationY = 0, colour } = place(i);
      if (rotation) q.setFromEuler(e.set(rotation[0], rotation[1], rotation[2]));
      else q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotationY);
      m.compose(p.set(position[0], position[1], position[2]), q, s.set(scale[0], scale[1], scale[2]));
      mesh.setMatrixAt(i, m);
      if (colour) mesh.setColorAt(i, c.set(colour));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, place]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false} {...props}>
      {children}
    </instancedMesh>
  );
}

import * as THREE from "three";
import { Matte } from "./circuitParts";

/* ══════════════════════════════════════════════════════════════
   trackPeople — the people and posts around the circuit, as plain
   meshes for the handful placed by hand. (The pit crews, dozens of
   them, are instanced in PitLane.jsx with the same proportions.)
   ══════════════════════════════════════════════════════════════ */

/* A standing person, 1.76 m. Faces +z by default; `wave` raises the
   right arm, and whatever is passed as children is held in that hand. */
export function Figure({ position, rotationY = 0, suit, legs, helmet, wave = false, children }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.36, 0.86, 0.24]} />
        <Matte color={legs} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.16, 0]} scale={[1, 0.62, 1]}>
        <capsuleGeometry args={[0.2, 0.45, 4, 10]} />
        <Matte color={suit} roughness={0.7} />
      </mesh>
      <mesh position={[-0.27, 1.12, 0]} rotation={[0, 0, -0.1]}>
        <capsuleGeometry args={[0.065, 0.46, 3, 6]} />
        <Matte color={suit} roughness={0.7} />
      </mesh>
      <group position={[0.27, 1.38, 0]} rotation={[0, 0, wave ? 2.6 : 0.1]}>
        <mesh position={[0, -0.26, 0]}>
          <capsuleGeometry args={[0.065, 0.46, 3, 6]} />
          <Matte color={suit} roughness={0.7} />
        </mesh>
        <group position={[0, -0.55, 0]}>{children}</group>
      </group>
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.15, 12, 10]} />
        <Matte color={helmet} roughness={0.35} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* A flag on a short pole, held in the hand. */
export function Flag({ colour }) {
  return (
    <group>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 5]} />
        <Matte color="#d7d9dc" roughness={0.5} />
      </mesh>
      <mesh position={[0.32, -0.62, 0]}>
        <planeGeometry args={[0.62, 0.44]} />
        <Matte color={colour} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* A marshal post: shelter, two marshals in orange — one showing the
   green flag, one holding the yellow — and an LED flag panel. Built
   with its back to −z; turn it with rotationY to face another track. */
export function MarshalPost({ position, rotationY = 0, glowTexture }) {
  const orange = "#ff6a00";
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.15, -0.85]}>
        <boxGeometry args={[2.6, 2.3, 0.08]} />
        <Matte color="#e9ebee" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.3, -0.8]}>
        <boxGeometry args={[2.6, 0.6, 0.02]} />
        <Matte color={orange} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.34, -0.25]}>
        <boxGeometry args={[2.9, 0.08, 1.4]} />
        <Matte color={orange} roughness={0.6} />
      </mesh>
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.17, 0.35]}>
          <boxGeometry args={[0.07, 2.34, 0.07]} />
          <Matte color="#c9ccd1" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[1.0, 0.75, -0.76]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <Matte color="#d11a1a" roughness={0.5} />
      </mesh>

      <Figure position={[-0.45, 0, 0.05]} rotationY={-0.5} suit={orange} legs="#b34a00" helmet="#f2f3f5" wave>
        <Flag colour="#1fd15a" />
      </Figure>
      <Figure position={[0.55, 0, -0.25]} rotationY={-0.2} suit={orange} legs="#b34a00" helmet="#f2f3f5">
        <Flag colour="#ffd400" />
      </Figure>

      <group position={[2.1, 0, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 2.4, 6]} />
          <Matte color="#2a2e35" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.62, 0]}>
          <boxGeometry args={[0.92, 0.92, 0.12]} />
          <Matte color="#0c0e11" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.62, 0.065]}>
          <planeGeometry args={[0.74, 0.74]} />
          <meshBasicMaterial color="#27e05f" toneMapped={false} />
        </mesh>
        {glowTexture && (
          <sprite position={[0, 2.62, 0.3]} scale={[2.4, 2.4, 1]}>
            <spriteMaterial map={glowTexture} color="#3dff78" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        )}
      </group>
    </group>
  );
}

/* A broadcast camera on a tripod, aimed at the car on the pedestal (the
   origin). The lens looks along the group's +x; a yaw of θ turns +x to
   (cos θ, −sin θ) in x/z, so aiming at the origin needs
   θ = atan2(z, −x) of the stand. Optionally raised on a platform. */
export function TvCamera({ position, umbrella = false, height = 0 }) {
  const dark = "#1b1e24";
  const yaw = Math.atan2(position[2], -position[0]);
  return (
    <group position={position}>
      <group position={[0, height, 0]} rotation={[0, yaw, 0]}>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.22, 0.68, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}>
            <cylinderGeometry args={[0.018, 0.022, 1.42, 5]} />
            <Matte color="#2f343b" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.56, 0.38, 0.3]} />
          <Matte color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[0.62, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.12, 0.72, 12]} />
          <Matte color="#e2e4e7" roughness={0.4} />
        </mesh>
        <mesh position={[-0.12, 1.76, 0.1]}>
          <boxGeometry args={[0.2, 0.14, 0.18]} />
          <Matte color="#101216" roughness={0.5} />
        </mesh>
        {/* Figures face +z; a quarter turn faces the operator along +x,
            into the viewfinder. */}
        <Figure position={[-0.62, 0, 0]} rotationY={Math.PI / 2} suit={dark} legs="#111318" helmet="#20242b" />
        {umbrella && (
          <>
            <mesh position={[-0.62, 1.95, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 1.0, 5]} />
              <Matte color="#9aa0a8" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[-0.62, 2.4, 0]}>
              <coneGeometry args={[0.8, 0.32, 14, 1, true]} />
              <Matte color="#0d0e11" roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

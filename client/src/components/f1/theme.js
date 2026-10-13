/* Shared look-and-feel constants for the two F1 auth pages (/signup and
   /signin). Both render the same car stage against the same artwork, so
   these live in one place rather than drifting between the pages. */

/* PAGE_BG is the page colour: under the backdrop scene, and what the
   scrims fade to beneath the form. */
export const PAGE_BG = "#08090c";

export const ACCENT = "#E10600";

/* The car's paint and its burgundy rim light. */
export const CAR_PAINT = "#a6051a";
export const CAR_RIM = "#6b0014";

/* The car stage's default camera. */
export const CAMERA_POSITION = [-7, 4, 7];
export const CAMERA_FOV = 38;

/* Shared by OrbitControls and the zoom buttons, so both clamp the camera
   to the same range and the buttons stop exactly where a drag-zoom would. */
export const CAM_MIN_DISTANCE = 4;
export const CAM_MAX_DISTANCE = 12;

/* Height of the ground the pedestal stands on (its deck top is y = 0, where
   the car's wheels are). The circuit's asphalt is laid just below it. */
export const STAGE_FLOOR_Y = -0.22;

/* Status vocabulary for a telemetry channel. Colours are applied as inline
   styles rather than `text-*` classes so they land regardless of which
   utilities Tailwind's scanner happens to emit. */
export const CHANNEL_STATES = {
  fault: { text: "Fault", color: "#f87171" },
  locked: { text: "Locked", color: "#34d399" },
  live: { text: "Live", color: "#ffffff" },
  standby: { text: "Standby", color: "rgba(255,255,255,0.28)" },
};

export function channelState({ error, done, active }) {
  if (error) return "fault";
  if (done) return "locked";
  if (active) return "live";
  return "standby";
}

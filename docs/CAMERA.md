# Camera system

The cinematic camera is a piecewise eased rail defined in `src/main.js`.

- Establishing: long lens-like distant view.
- Approach: lower, closer perspective for scale.
- Propellant/cutaway: controlled close-up.
- Engine bay: descending macro shot.
- Ignition: ground-level wide shot with low/high-frequency shake.
- Liftoff/tower clear: tracking target follows compressed vehicle Y motion.
- Ascent: camera-relative tracking so the vehicle remains readable while telemetry altitude increases faster than browser-space distance.
- Hot-staging: close tracking around the stage interface.
- Separation: pull-back to read both trajectories.

EXPLORE mode enables OrbitControls; AUTO mode owns camera position and look target.

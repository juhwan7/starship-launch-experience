# Project Status

Current version: **v0.9.5 visual/performance revision**

## Done
- 16-stage cinematic sequence shortened to **~5:07 at 1x**.
- Default playback **2x** (~2:34 effective runtime).
- Playback choices: **1x / 2x / 5x / 10x / 25x / 50x**.
- High-detail Three.js mode with external CC-BY Block 3 GLB.
- Smart default quality selection from mobile / memory / CPU / DPR hints.
- Sustained low-FPS automatic quality reduction when quality is not manually locked.
- Speed-aware particle density and bloom scaling.
- 10x+ audio suppression; high-speed visual simplification.
- Live lightweight vehicle proxy and environment render during high-detail model loading.
- Brighter natural outdoor lighting based on official SpaceX Flight 13 / Pad 2 references.
- Wider establishing / ascent / separation camera framing.
- Procedural soil, concrete, road, structural steel, pipe and stainless surface variation.
- Ground stains, wet/scorched variation and service/tire marks.
- Continuous-motion pass: subtle camera drift, cloud drift, Earth rotation, flame flicker and ongoing vent/smoke.
- Pad 2 inspired tower, arms, tank farm, pipe rack, roads and scale vehicles.
- 33-engine booster overlay + 33 procedural plumes; 6 Ship plumes for hot-staging.
- Educational internal-tank cutaway.
- AUTO / EXPLORE / timeline / quality selector / procedural sound.
- Standalone WebGL2 fallback.
- GitHub Pages + CI workflows.
- Research, visual references, assets, licensing, QA and decision documentation.

## Verification required after this revision
- CI syntax/static checks on current main.
- Public GitHub Pages redeploy.
- High-detail runtime check at 1x, 2x, 10x, 25x and 50x.
- Confirm speed change + timeline scrub does not desynchronize vehicle/camera/VFX.
- Confirm entry proxy disappears cleanly when GLB finishes.
- Desktop and mobile FPS check.
- Compare wide Starbase / liftoff / ascent / hot-stage frames against official SpaceX references.

## Next
1. Wait for current CI and Pages deploy.
2. Inspect public page on desktop.
3. Inspect Android/iOS viewport.
4. Capture wide-shot QA frames.
5. Tune weakest three shots before v1.0.

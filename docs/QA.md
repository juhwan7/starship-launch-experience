# QA status

## Verified in this environment
- All JavaScript in the self-contained `fallback.html` executed in Chromium/WebGL2 with no page errors at ten forced sequence checkpoints.
- Screenshots were captured for Starbase, propellant load, cutaway, engine bay, ignition, tower-clear, ascent, high-altitude, staging and separation.
- `src/main.js` passes `node --check`.
- Static file/ID integrity test passes.

## Environment limitation
The container browser cannot reach the external jsDelivr CDN, so the high-detail runtime path (Three.js + external 8 MB GLB) cannot be end-to-end rendered inside this execution environment. It is therefore **not marked visually verified here**. On GitHub Pages, `index.html` includes an explicit boot/model failure screen linking to `fallback.html`.

## Deployment acceptance checklist
- High-detail GLB reaches 100% load.
- No console errors.
- Vehicle is upright, grounded and approximately 124 m in the scene.
- Ship/Super Heavy stage groups are detected and visibly separate.
- 33 booster plume overlay is aligned with the aft end.
- Mobile Safari and Android Chrome complete the sequence without memory failure.
- Direct GitHub Pages reload returns all modules/assets with 200 status.

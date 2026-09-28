# Project Status

Current version: **v0.9 high-detail candidate**

## Done
- 16-stage 7:31 cinematic timeline.
- High-detail Three.js mode with external CC-BY Block 3 GLB.
- PBR material normalization, ACES tone mapping, bloom and PMREM reflections.
- Pad 2 inspired environment, tower, arms, tank farm, pipe rack, roads and scale vehicles.
- 33-engine booster overlay + 33 procedural plumes; 6 Ship plumes for hot-staging.
- Vent vapor, expanding pad smoke, clouds, atmosphere and procedural Earth reveal.
- Educational internal-tank cutaway.
- AUTO / EXPLORE / scroll timeline / quality selector / procedural sound.
- Standalone WebGL2 fallback.
- GitHub Pages + CI workflows.
- Research, assets, licensing, QA and decision documentation.

## Verified
- Static integrity / JavaScript syntax checks: PASS.
- Fallback WebGL2 forced-scene browser QA: PASS (10 checkpoints, no page errors).

## Verification pending
- High-detail CDN/GLB end-to-end render on the public Pages deployment.
- Real Android Chrome / iOS Safari device run.
- High-detail stage-node separation alignment on the deployed runtime.

## Next
1. Deploy this tree to GitHub Pages.
2. Open the public Pages URL on desktop and mobile.
3. Capture high-detail scene screenshots at the ten QA checkpoints.
4. Correct model stage-node detection/alignment if the GLB hierarchy differs at runtime.
5. Tune the three weakest shots before v1.0.

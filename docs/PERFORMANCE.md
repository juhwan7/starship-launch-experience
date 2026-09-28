# Performance strategy

Quality presets control device pixel ratio, shadow-map size and bloom strength.

- LOW: DPR <= 1.0, 1024 shadow map.
- MEDIUM: DPR <= 1.25, 1024 shadow map.
- HIGH: DPR <= 1.65, 2048 shadow map.
- ULTRA: DPR <= 2.0, 4096 shadow map.

If measured FPS stays below ~26 for a sustained sample, quality automatically steps down. Mobile defaults to MEDIUM.

The high-detail GLB is ~8 MB. The project uses progressive loading UI and a fully self-contained `fallback.html` for model/CDN failure.

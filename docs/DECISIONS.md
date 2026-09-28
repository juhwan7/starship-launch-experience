# Decisions

1. **Do not force a single HTML file for the premium path.** It prevents sensible model/material separation and makes maintenance worse.
2. **Keep a single-file fallback.** It provides a no-CDN path and a known-good WebGL2 baseline.
3. **Use an attributed Block 3 model rather than pretending primitive geometry is photorealistic.**
4. **Overlay the official 33-engine layout.** The selected reference GLB is documented as modeling 13 booster Raptors; SpaceX's current public vehicle page specifies 33, so the experience adds an explicit 20+10+3 engine/nozzle and plume visualization.
5. **Compress ascent distance.** Real altitude and a 100+ km browser coordinate range are poor for camera precision/readability; UI altitude is an educational interpolation and browser-space Y is compressed.
6. **No claim of indistinguishability from real footage.** This is a real-time visual reconstruction.

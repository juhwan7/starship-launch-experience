# VFX design

## Engine flame
Custom transparent additive shader with animated procedural noise, white-hot core, orange body and darker turbulent edge. 33 booster instances are positioned in 20 + 10 + 3 rings. Six upper-stage plumes activate for hot-staging.

## Smoke and vapor
CPU-managed sprite pools use a generated radial alpha texture. Smoke expands laterally from the pad; propellant vent vapor is emitted from upper/lower vehicle regions before launch.

## Atmosphere
Three.js `Sky` provides physically inspired daylight scattering. Rayleigh/turbidity and scene fog are reduced as telemetry altitude rises. A procedural Earth sphere appears during the high-altitude segment.

## Known limitation
Full volumetric fluid simulation and screen-space refractive heat haze are deliberately not used in the current release because they would make mobile fallback and GitHub Pages performance substantially less predictable.

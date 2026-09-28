# Material direction

- Vehicle GLB: original texture maps retained; PBR metalness/roughness is normalized by material category.
- Stainless steel: high metalness, roughness ~0.22–0.58, PMREM environment reflection.
- Engines/nozzles: darker steel, high metalness, roughness ~0.31.
- Heat-shield-like dark materials: low metalness, higher roughness.
- Tower: painted/weathered structural steel, deliberately less reflective than the vehicle.
- Ground: high-roughness concrete/asphalt/soil.
- Flame: emissive shader with additive blending, excluded from normal PBR lighting.

import fs from 'node:fs';
const required=['index.html','fallback.html','src/main.js','src/style.css','docs/ASSETS.md','docs/RESEARCH.md'];
for(const p of required){if(!fs.existsSync(p)){console.error(`Missing ${p}`);process.exit(1)}}
const html=fs.readFileSync('index.html','utf8');
for(const id of ['scene','loading','fatal','autoBtn','exploreBtn','timelineMarkers']){if(!html.includes(`id="${id}"`)){console.error(`Missing #${id}`);process.exit(1)}}
const js=fs.readFileSync('src/main.js','utf8');
if(!js.includes('starship-block3.glb')){console.error('High-detail model URL missing');process.exit(1)}
console.log('Static integrity checks passed.');

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

window.__STARSHIP_BOOTED = true;
window.__STARSHIP_READY = false;
window.__STARSHIP_PROGRESS = 0;

const $ = s => document.querySelector(s);
const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const smooth = t => { t=clamp(t); return t*t*(3-2*t); };
const mobile = matchMedia('(max-width:760px)').matches;
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
const qp = new URLSearchParams(location.search);
const forced = qp.has('p') ? clamp(Number(qp.get('p'))||0) : null;

const ui = {
  loading:$('#loading'), loaderBar:$('#loaderBar'), loaderLabel:$('#loaderLabel'), loaderPct:$('#loaderPct'), loaderNote:$('#loaderNote'),
  fatal:$('#fatal'), fatalReason:$('#fatalReason'), autoBtn:$('#autoBtn'), exploreBtn:$('#exploreBtn'), soundBtn:$('#soundBtn'), speedSelect:$('#speedSelect'), qualityBtn:$('#qualityBtn'),
  storyIndex:$('#storyIndex'), storyLabel:$('#storyLabel'), storyTitle:$('#storyTitle'), storyCopy:$('#storyCopy'), fact:$('#fact'),
  missionClock:$('#missionClock'), altitude:$('#altitude'), velocity:$('#velocity'), sequence:$('#sequence'), countdown:$('#countdown'),
  modeBadge:$('#modeBadge'), timelineFill:$('#timelineFill'), timelineMarkers:$('#timelineMarkers'), hint:$('#hint')
};
function loadPct(p,label,note=''){ p=clamp(Number(p)||0,0,100); window.__STARSHIP_PROGRESS=p; ui.loaderBar.style.width=p+'%'; ui.loaderPct.textContent=Math.round(p)+'%'; ui.loaderLabel.textContent=label; if(note)ui.loaderNote.textContent=note; }
function fatal(msg){
  window.__STARSHIP_ERROR=String(msg);
  ui.loading.hidden=true; ui.fatal.hidden=false; ui.fatalReason.textContent=msg; console.error(msg);
}
addEventListener('error',e=>{ if(!window.__STARSHIP_READY) fatal('초기화 오류: '+(e?.message||'unknown runtime error')); });
addEventListener('unhandledrejection',e=>{ if(!window.__STARSHIP_READY) fatal('초기화 오류: '+(e?.reason?.message||e?.reason||'unhandled promise rejection')); });

const stages = [
 ['starbase','STARBASE','A QUIET PAD','Starbase Pad 2의 전체 환경과 발사 시스템의 규모부터 시작합니다.',23,'STARBASE · PAD 2 · V3 VISUAL RECONSTRUCTION'],
 ['approach','APPROACH','THE 124-METER STACK','서비스 도로에서 124 m급 Starship V3 / Super Heavy V3 스택으로 접근합니다.',19,'OFFICIAL HEIGHT 124 m · DIAMETER 9 m'],
 ['support','GROUND SYSTEMS','PAD 2 / GROUND SUPPORT','타워, catch arms, 탱크팜과 지상 배관을 훑습니다.',19,'GROUND SYSTEMS ARE A VISUAL RECONSTRUCTION'],
 ['load','PROPELLANT LOAD','METHANE / OXYGEN','액체메탄과 액체산소 적재가 진행되며 venting과 결빙이 증가합니다.',29,'FLIGHT 13 COUNTDOWN REFERENCES'],
 ['cutaway','CUTAWAY','INSIDE THE TANKS','탱크와 공급 라인을 교육용 cutaway로 보여줍니다.',23,'EDUCATIONAL VISUALIZATION'],
 ['engine','ENGINE BAY','33 RAPTOR 3 ENGINES','Super Heavy 하부의 33개 Raptor 3 배열을 강조합니다.',25,'13 CENTER + 20 PERIMETER ENGINES'],
 ['countdown','FINAL COUNTDOWN','T−00:00:30','발사 직전 venting과 지상 조명이 긴장감을 높입니다.',23,'FLAME DIVERTER T−00:17 · ENGINE START T−00:03'],
 ['ignition','IGNITION','RAPTOR 3 START','33개 엔진 plume과 배기가스가 발사대 아래에서 확장됩니다.',15,'REAL-TIME VFX APPROXIMATION'],
 ['liftoff','LIFTOFF','THE STACK MOVES','거대한 발사체가 천천히 지면에서 분리되기 시작합니다.',21,'33 RAPTOR 3 ENGINES'],
 ['tower','TOWER CLEAR','CLEAR OF PAD 2','발사탑을 완전히 벗어나는 순간을 낮은 시점에서 추적합니다.',16,'CINEMATIC CAMERA'],
 ['ascent','ASCENT','THROUGH THE ATMOSPHERE','발사장이 멀어지고 구름층과 대기 색이 변화합니다.',27,'PROCEDURAL ATMOSPHERE / CLOUDS'],
 ['maxq','MAX Q','PEAK AERODYNAMIC STRESS','최대 동압 구간을 속도감과 공력 분위기로 표현합니다.',12,'FLIGHT 13: MAX Q ≈ T+00:58'],
 ['high','HIGH ALTITUDE','THE SKY FALLS AWAY','하늘이 어두워지고 지구 곡률이 나타납니다.',19,'EARTH SCALE COMPRESSED'],
 ['meco','STAGING PREP','SUPER HEAVY MECO','부스터 엔진이 정지하며 카메라가 stage interface로 접근합니다.',12,'FLIGHT 13: MECO ≈ T+02:18'],
 ['hotstage','HOT-STAGING','SIX RAPTORS IGNITE','Starship의 6개 Raptor가 점화되며 hot-staging이 시작됩니다.',10,'FLIGHT 13: HOT-STAGING ≈ T+02:21'],
 ['separated','SEPARATION','TWO VEHICLES, TWO PATHS','Starship과 Super Heavy가 서로 다른 궤적으로 멀어집니다.',14,'POST-SEPARATION MOTION COMPRESSED']
].map(([id,label,title,copy,sec,fact])=>({id,label,title,copy,sec,fact}));
const TOTAL = stages.reduce((a,s)=>a+s.sec,0);
let acc=0; stages.forEach((s,i)=>{s.i=i;s.start=acc/TOTAL;acc+=s.sec;s.end=acc/TOTAL;});
const stage = p => stages.find(s=>p>=s.start&&p<s.end)||stages.at(-1);
const S = id => stages.find(s=>s.id===id).start;
const E = id => stages.find(s=>s.id===id).end;

loadPct(5,'CREATING WEBGL RENDERER');
let renderer;
try{
  const canvas=$('#scene');
  const testGL=canvas.getContext('webgl2',{powerPreference:'high-performance',antialias:!mobile,alpha:false})
    || canvas.getContext('webgl',{powerPreference:'high-performance',antialias:!mobile,alpha:false});
  if(!testGL) throw new Error('WebGL을 사용할 수 없습니다.');
  renderer = new THREE.WebGLRenderer({canvas,context:testGL,antialias:!mobile,powerPreference:'high-performance'});
}catch(e){
  fatal('WebGL 초기화 실패: '+(e?.message||e));
  setTimeout(()=>location.replace('./fallback.html?reason=webgl-init'),900);
  throw e;
}
loadPct(7,'WEBGL READY');
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.28;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0xb9c6ce,.00105);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,300000);
camera.position.set(292,116,338);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.enabled=false; controls.maxDistance=400;

loadPct(8,'INITIALIZING POST PROCESSING');
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.24,.4,1.1);
composer.addPass(bloom); composer.addPass(new OutputPass());

loadPct(10,'SETTING NATURAL LIGHTING');
const sun=new THREE.DirectionalLight(0xffe7c8,5.4); sun.position.set(-210,285,165); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-180; sun.shadow.camera.right=180; sun.shadow.camera.top=220; sun.shadow.camera.bottom=-120; sun.shadow.camera.far=650;
scene.add(sun,new THREE.HemisphereLight(0xd4eaff,0x806d58,2.15));
const launchLight=new THREE.PointLight(0xff6a18,0,180,1.6); scene.add(launchLight);

const sky=new Sky(); sky.scale.setScalar(300000); scene.add(sky);
sky.material.uniforms.turbidity.value=4.4; sky.material.uniforms.rayleigh.value=2.2; sky.material.uniforms.mieCoefficient.value=.0035;
sky.material.uniforms.mieDirectionalG.value=.82;
sky.material.uniforms.sunPosition.value.setFromSphericalCoords(1,THREE.MathUtils.degToRad(67),THREE.MathUtils.degToRad(128));

loadPct(12,'CREATING MATERIAL SYSTEM');
const mat=(c,m=.1,r=.7,o={})=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r,...o});
function surfaceTexture(baseHex,variation=.12,grain=1,streaks=false){
  const size=mobile?96:160,c=document.createElement('canvas');c.width=c.height=size;
  const x=c.getContext('2d'),base=new THREE.Color(baseHex);
  const img=x.createImageData(size,size);let seed=(baseHex>>>0)^0x9e3779b9;
  const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){
    const i=(y*size+xx)*4;
    const broad=(rnd()-.5)*variation;
    const fine=(rnd()-.5)*variation*.35*grain;
    const band=streaks?Math.sin((y+rnd()*3)*.33)*variation*.18:0;
    const f=clamp(.86+broad+fine+band,.45,1.18);
    img.data[i]=Math.round(base.r*255*f);img.data[i+1]=Math.round(base.g*255*f);img.data[i+2]=Math.round(base.b*255*f);img.data[i+3]=255;
  }
  x.putImageData(img,0,0);
  if(streaks){x.globalAlpha=.13;x.strokeStyle='#0b0e10';for(let y=9;y<size;y+=23){x.beginPath();x.moveTo(0,y);x.lineTo(size,y+(rnd()-.5)*2);x.stroke();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);t.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);return t;
}
function roughTexture(level=.8,variation=.18){
  const size=mobile?64:96;
  const c=document.createElement('canvas');
  c.width=c.height=size;
  const x=c.getContext('2d');
  if(!x) throw new Error('2D canvas context unavailable');
  const img=x.createImageData(size,size);
  let seed=1234567+Math.floor(level*1000);
  const rnd=()=>((seed=(seed*1103515245+12345)>>>0)/4294967296);
  for(let i=0;i<img.data.length;i+=4){const q=Math.round(clamp(level+(rnd()-.5)*variation)*255);img.data[i]=img.data[i+1]=img.data[i+2]=q;img.data[i+3]=255;}
  x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);return t;
}
const surf={
  soil:surfaceTexture(0x765b42,.24,1.4,false),
  concrete:surfaceTexture(0x9a9489,.13,1.1,false),
  road:surfaceTexture(0x3d4345,.09,1.4,true),
  steel:surfaceTexture(0x56636a,.08,.7,true),
  pipe:surfaceTexture(0xaab2b5,.045,.5,true),
  stainless:surfaceTexture(0xc0c7ca,.035,.35,true)
};
const rough={soil:roughTexture(.95,.08),concrete:roughTexture(.86,.15),road:roughTexture(.93,.09),steel:roughTexture(.48,.22),pipe:roughTexture(.35,.17),stainless:roughTexture(.27,.13)};
const BOX=new THREE.BoxGeometry(1,1,1), CYL=new THREE.CylinderGeometry(1,1,2,24), SPH=new THREE.SphereGeometry(1,32,48);
const M={
  concrete:mat(0xffffff,.02,.88,{map:surf.concrete,roughnessMap:rough.concrete,bumpMap:rough.concrete,bumpScale:.045}),
  soil:mat(0xffffff,0,.98,{map:surf.soil,roughnessMap:rough.soil,bumpMap:rough.soil,bumpScale:.075}),
  road:mat(0xffffff,0,.96,{map:surf.road,roughnessMap:rough.road,bumpMap:rough.road,bumpScale:.025}),
  steel:mat(0xffffff,.72,.48,{map:surf.steel,roughnessMap:rough.steel,bumpMap:rough.steel,bumpScale:.012}),
  pipe:mat(0xffffff,.8,.34,{map:surf.pipe,roughnessMap:rough.pipe}),
  stainless:mat(0xffffff,.94,.27,{map:surf.stainless,roughnessMap:rough.stainless}),
  dark:mat(0x24292d,.62,.52)
};
function mesh(g,m,p,s,parent=scene,cast=false){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;}

loadPct(14,'BUILDING STARBASE ENVIRONMENT');
const ground=new THREE.Group(); scene.add(ground);
mesh(BOX,M.soil,[0,-1.4,0],[520,2,430],ground);
mesh(BOX,M.concrete,[0,.05,0],[78,.45,70],ground);
mesh(BOX,M.road,[0,.08,70],[360,.25,13],ground);
const stainMat=new THREE.MeshStandardMaterial({color:0x2b2622,roughness:.82,transparent:true,opacity:.28,depthWrite:false});
for(const [x,z,sx,sz,o] of [[3,3,32,28,.24],[-18,-6,15,9,.18],[38,15,18,11,.15],[-64,44,24,14,.16]]){const q=mesh(new THREE.PlaneGeometry(1,1),stainMat.clone(),[x,.292,z],[sx,sz,1],ground);q.rotation.x=-Math.PI/2;q.material.opacity=o;}
const trackMat=new THREE.MeshBasicMaterial({color:0x181b1c,transparent:true,opacity:.16,depthWrite:false});
for(const x of [-3.1,3.1]){const q=mesh(new THREE.PlaneGeometry(1,1),trackMat,[x,.295,70],[1.05,245,1],ground);q.rotation.x=-Math.PI/2;}
const tower=new THREE.Group(); tower.position.x=18; ground.add(tower);
for(const [x,z] of [[-5,-5],[5,-5],[-5,5],[5,5]]) mesh(BOX,M.steel,[x,72,z],[1.45,144,1.45],tower,true);
for(let y=6;y<144;y+=6.4){mesh(BOX,M.steel,[0,y,-5],[11.3,.42,.42],tower,true);mesh(BOX,M.steel,[0,y,5],[11.3,.42,.42],tower,true);}
mesh(BOX,M.steel,[0,145,0],[13,5,13],tower,true);
for(const z of [-4,4]) mesh(BOX,M.steel,[-7.5,84,z],[17,1.15,1.2],tower,true);
mesh(BOX,M.steel,[-8,106,0],[16,.95,2.1],tower,true);

const farm=new THREE.Group(); ground.add(farm);
for(const [x,z,r,h] of [[-62,42,11.5,31],[-43,43,10.5,29],[-24,42,9.3,26],[-67,14,6.5,15],[-50,13,6.2,14]]){
  mesh(CYL,M.stainless,[x,h/2,z],[r,h/2,r],farm,true); mesh(SPH,M.stainless,[x,h,z],[r,2.1,r],farm,true);
}
for(const z of [31.5,33,34.5,36]){const p=mesh(CYL,M.pipe,[-25,4.4,z],[.12,34,.12],farm,true);p.rotation.z=Math.PI/2;}

const vehicles=new THREE.Group();ground.add(vehicles);
for(let i=0;i<12;i++) mesh(BOX,mat(i%4?0x3a4145:0xd7d9d8,.25,.5),[-48+i*9,.7,61+(i%2)*3],[3.2,1,1.55],vehicles,true);

function radialTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.75)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
const soft=radialTexture();
const clouds=new THREE.Group();scene.add(clouds);
const cloudMat=new THREE.SpriteMaterial({map:soft,color:0xe7edf2,transparent:true,opacity:.15,depthWrite:false});
for(let i=0;i<(mobile?90:180);i++){const a=Math.random()*Math.PI*2,r=150+Math.random()*600,s=new THREE.Sprite(cloudMat.clone());s.position.set(Math.cos(a)*r,330+Math.random()*170,Math.sin(a)*r);const q=30+Math.random()*80;s.scale.set(q*2.4,q,1);clouds.add(s);}

const earthTex=(()=>{const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#154e83');g.addColorStop(1,'#09294f');x.fillStyle=g;x.fillRect(0,0,1024,512);let seed=9;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<42;i++){x.fillStyle='rgba(64,130,72,.42)';x.beginPath();x.ellipse(rnd()*1024,70+rnd()*360,20+rnd()*85,8+rnd()*40,(rnd()-.5)*1.3,0,Math.PI*2);x.fill();}for(let i=0;i<100;i++){x.fillStyle='rgba(245,248,250,.08)';x.beginPath();x.ellipse(rnd()*1024,rnd()*512,20+rnd()*70,4+rnd()*16,0,0,Math.PI*2);x.fill();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const earth=new THREE.Mesh(new THREE.SphereGeometry(1600,64,96),new THREE.MeshStandardMaterial({map:earthTex,roughness:.75}));
earth.visible=false;scene.add(earth);
const atmo=new THREE.Mesh(new THREE.SphereGeometry(1624,48,64),new THREE.MeshBasicMaterial({color:0x4c9fff,transparent:true,opacity:.075,side:THREE.BackSide,blending:THREE.AdditiveBlending}));
atmo.visible=false;scene.add(atmo);

loadPct(24,'LOADING HIGH-DETAIL STARSHIP BLOCK 3');
const vehicleRoot=new THREE.Group();vehicleRoot.position.y=2.7;scene.add(vehicleRoot);
const entryProxy=new THREE.Group();vehicleRoot.add(entryProxy);
mesh(new THREE.CylinderGeometry(4.25,4.25,72,40),M.stainless,[0,36,0],[1,1,1],entryProxy,true);
mesh(new THREE.CylinderGeometry(4.15,4.15,44,40),M.stainless,[0,94,0],[1,1,1],entryProxy,true);
mesh(new THREE.ConeGeometry(4.15,8,40),M.stainless,[0,120,0],[1,1,1],entryProxy,true);
const proxyTile=mesh(new THREE.BoxGeometry(1,1,1),M.dark,[3.9,96,0],[.35,42,5.5],entryProxy);proxyTile.rotation.z=.015;
let model=null,boosterPart=null,shipPart=null;
function partitionVehicle(root){
  boosterPart=new THREE.Group(); shipPart=new THREE.Group();
  boosterPart.name='SuperHeavyV3'; shipPart.name='StarshipV3';
  vehicleRoot.add(boosterPart,shipPart);
  vehicleRoot.updateMatrixWorld(true); root.updateMatrixWorld(true);
  const meshes=[]; root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const center=new THREE.Vector3();
  for(const o of meshes){
    new THREE.Box3().setFromObject(o).getCenter(center);
    const local=vehicleRoot.worldToLocal(center.clone());
    (local.y>=72?shipPart:boosterPart).attach(o);
  }
  root.removeFromParent();
}
const MODEL_URL='https://cdn.jsdelivr.net/gh/haskaomni/blueprint@main/public/models/starship-block3.glb';
const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);

function normalizeVehicle(root){
  root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root),s=new THREE.Vector3();b.getSize(s);const k=124/Math.max(.001,s.y);root.scale.setScalar(k);root.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(root),c=new THREE.Vector3();b2.getCenter(c);root.position.x-=c.x;root.position.z-=c.z;root.position.y-=b2.min.y;
  root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const arr=Array.isArray(o.material)?o.material:[o.material];for(const m of arr){if(!m)continue;if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;if('metalness'in m){const n=(o.name||'').toLowerCase();if(/tile|heat|black/.test(n)){m.metalness=Math.min(m.metalness??.1,.15);m.roughness=Math.max(m.roughness??.5,.68);}else{m.metalness=Math.max(m.metalness??.2,.58);m.roughness=clamp(m.roughness??.4,.22,.58);}}}});
}
function loadModel(){return new Promise((res,rej)=>loader.load(MODEL_URL,g=>{model=g.scene;normalizeVehicle(model);vehicleRoot.add(model);partitionVehicle(model);entryProxy.visible=false;res();},x=>{if(x.total){const ratio=clamp(x.loaded/Math.max(1,x.total));loadPct(24+ratio*48,'LOADING HIGH-DETAIL STARSHIP BLOCK 3',((x.loaded/1048576).toFixed(1))+' / '+((x.total/1048576).toFixed(1))+' MB · CC BY 4.0');}},rej));}

const engineOverlay=new THREE.Group();vehicleRoot.add(engineOverlay);
const nozzleGeo=new THREE.CylinderGeometry(.3,.58,2.0,18,1,true),nozzleMat=mat(0x292c2d,.92,.3,{side:THREE.DoubleSide});
const enginePos=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;enginePos.push([Math.cos(a)*3.65,Math.sin(a)*3.65]);}
for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.17;enginePos.push([Math.cos(a)*2.25,Math.sin(a)*2.25]);}
for(let i=0;i<3;i++){const a=i/3*Math.PI*2;enginePos.push([Math.cos(a)*.78,Math.sin(a)*.78]);}
for(const [x,z] of enginePos){const n=new THREE.Mesh(nozzleGeo,nozzleMat);n.position.set(x,-.6,z);engineOverlay.add(n);}

const flameMat=()=>new THREE.MeshBasicMaterial({color:0xff7a18,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
const flameGeo=new THREE.ConeGeometry(.55,1,14,1,true);flameGeo.translate(0,-.5,0);
const boosterFlames=new THREE.Group();vehicleRoot.add(boosterFlames);
for(const [x,z] of enginePos){const f=new THREE.Mesh(flameGeo,flameMat());f.position.set(x,-1.3,z);boosterFlames.add(f);}
const shipFlames=new THREE.Group();vehicleRoot.add(shipFlames);shipFlames.visible=false;
for(let i=0;i<6;i++){const a=(i%3)/3*Math.PI*2,r=i<3?1.25:3.05,f=new THREE.Mesh(flameGeo,flameMat());f.position.set(Math.cos(a)*r,70.5,Math.sin(a)*r);shipFlames.add(f);}

const cutaway=new THREE.Group();cutaway.visible=false;vehicleRoot.add(cutaway);
const shell=new THREE.MeshPhysicalMaterial({color:0x8c989e,metalness:.55,roughness:.3,transparent:true,opacity:.16,side:THREE.DoubleSide});
const lox=new THREE.MeshPhysicalMaterial({color:0x55b8ed,transparent:true,opacity:.45,roughness:.12,emissive:0x0b3148,emissiveIntensity:.3});
const ch4=new THREE.MeshPhysicalMaterial({color:0x58d7c6,transparent:true,opacity:.42,roughness:.12,emissive:0x0b403a,emissiveIntensity:.25});
for(const [y,h,m] of [[24,31,ch4],[52.5,22,lox],[87,18,ch4],[104,13,lox]]){mesh(new THREE.CylinderGeometry(3.95,3.95,h,36,1,true),shell,[0,y,0],[1,1,1],cutaway);mesh(new THREE.CylinderGeometry(3.72,3.72,h*.88,36),m,[0,y-h*.04,0],[1,1,1],cutaway);}

class SpritePool{
  constructor(max,color){this.max=max;this.live=[];this.mat=new THREE.SpriteMaterial({map:soft,color,transparent:true,opacity:.35,depthWrite:false});this.group=new THREE.Group();scene.add(this.group);}
  spawn(p,v,size,life){if(this.live.length>=this.max)return;const s=new THREE.Sprite(this.mat.clone());s.position.copy(p);s.scale.set(size,size,1);s.userData={v:v.clone(),life,max:life,size};this.group.add(s);this.live.push(s);}
  update(dt){for(let i=this.live.length-1;i>=0;i--){const s=this.live[i],u=s.userData;s.position.addScaledVector(u.v,dt);u.v.multiplyScalar(Math.pow(.965,dt*60));u.v.y+=.5*dt;u.life-=dt;const a=1-u.life/u.max,q=u.size*(1+a*2.3);s.scale.set(q,q,1);s.material.opacity=clamp(u.life/u.max)*.35;if(u.life<=0){this.group.remove(s);this.live.splice(i,1);}}}
}
const smoke=new SpritePool(mobile?140:320,0x8f9497),vapor=new SpritePool(mobile?70:150,0xeaf2f6);
let smokeAcc=0,vaporAcc=0;

function stateAt(p){
  const ign=clamp((p-S('ignition'))/(E('ignition')-S('ignition')));
  const a=clamp((p-S('liftoff'))/(S('meco')-S('liftoff'))),e=smooth(a),sep=clamp((p-S('hotstage'))/(E('hotstage')-S('hotstage')));
  return {ign,ascent:a,visualY:e*1580,alt:e*92000,vel:a?Math.min(27600,Math.pow(a,.76)*27600):0,sep};
}
function updateVFX(dt,p,st){
  const pf=speedProfile().particles;
  if(p>=S('load')&&p<S('liftoff')){vaporAcc+=dt*pf*(10+25*clamp((p-S('load'))/(E('load')-S('load'))));while(vaporAcc>1){vaporAcc--;const side=Math.random()<.5?-1:1,y=Math.random()<.55?28:94;vapor.spawn(new THREE.Vector3(side*4.6,vehicleRoot.position.y+y,(Math.random()-.5)*4),new THREE.Vector3(side*(1+Math.random()*4),.7+Math.random()*2,(Math.random()-.5)*2),4+Math.random()*8,2.2+Math.random()*2);}}
  if(st.ign>.02){smokeAcc+=dt*pf*(25+st.ign*(mobile?65:120));while(smokeAcc>1){smokeAcc--;const a=Math.random()*Math.PI*2,r=Math.random()*6;smoke.spawn(new THREE.Vector3(Math.cos(a)*r,vehicleRoot.position.y-1,Math.sin(a)*r),new THREE.Vector3((Math.random()-.5)*(7+st.ign*15),.5+Math.random()*3,(Math.random()-.5)*(7+st.ign*15)),8+Math.random()*16,2.5+Math.random()*3);}}
  smoke.update(dt);vapor.update(dt);
}

const cameraKeys=[
 [0,[292,116,338],[0,60,0],45],[S('approach'),[218,92,252],[0,61,0],44],[S('support'),[152,72,182],[8,64,0],43],
 [S('load'),[116,126,148],[0,88,0],42],[S('cutaway'),[54,93,68],[0,73,0],41],[S('engine'),[37,34,47],[0,10,0],45],
 [E('engine'),[27,20,34],[0,5,0],48],[S('countdown'),[112,52,140],[0,52,0],45],[S('ignition'),[92,34,116],[0,12,0],48],
 [S('liftoff'),[124,49,154],[0,38,0],48],[S('tower'),[148,108,178],[0,103,0],45]
];
function cameraSpec(p,st){
  if(p>=S('ascent')){const y=vehicleRoot.position.y;if(p<S('maxq'))return {pos:new THREE.Vector3(174,y+54,218),tar:new THREE.Vector3(0,y+58,0),f:43};
    if(p<S('high'))return {pos:new THREE.Vector3(236,y+88,286),tar:new THREE.Vector3(0,y+72,0),f:41};
    if(p<S('meco'))return {pos:new THREE.Vector3(316,y+112,372),tar:new THREE.Vector3(0,y+79,0),f:39};
    if(p<S('hotstage'))return {pos:new THREE.Vector3(128,y+48,158),tar:new THREE.Vector3(0,y+77,0),f:44};
    if(p<E('hotstage'))return {pos:new THREE.Vector3(96,y+34,119),tar:new THREE.Vector3(0,y+77,0),f:46};
    return {pos:new THREE.Vector3(362,y+126,424),tar:new THREE.Vector3(0,y+75,0),f:39};}
  let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1][0])i++;const a=cameraKeys[i],b=cameraKeys[i+1]||a,t=smooth((p-a[0])/Math.max(.0001,b[0]-a[0]));
  return {pos:new THREE.Vector3(...a[1]).lerp(new THREE.Vector3(...b[1]),t),tar:new THREE.Vector3(...a[2]).lerp(new THREE.Vector3(...b[2]),t),f:lerp(a[3],b[3],t)};
}

const speedLevels=[1,2,5,10,25,50];
const savedSpeed=Number(localStorage.getItem('starship.speed'));
let playbackRate=speedLevels.includes(savedSpeed)?savedSpeed:2;
function detectQuality(){
  const mem=navigator.deviceMemory||4,cores=navigator.hardwareConcurrency||4,dpr=devicePixelRatio||1;
  if(mobile||mem<=4||cores<=4)return 'medium';
  if(mem>=8&&cores>=8&&dpr<=2.5)return 'high';
  return 'medium';
}
const savedQuality=localStorage.getItem('starship.quality');
let qualityLocked=['low','medium','high','ultra'].includes(savedQuality);
let mode='auto',progress=forced??0,target=progress,autoSec=progress*TOTAL,last=performance.now(),quality=qualityLocked?savedQuality:detectQuality();
function speedProfile(){
  if(playbackRate>=25)return {particles:.28,bloom:.50,sim:2.0};
  if(playbackRate>=10)return {particles:.45,bloom:.64,sim:2.5};
  if(playbackRate>=5)return {particles:.68,bloom:.80,sim:3.0};
  if(playbackRate>=2)return {particles:.88,bloom:.94,sim:2.0};
  return {particles:1,bloom:1,sim:1};
}
function applyQuality(q,manual=false){
  quality=q;if(manual){qualityLocked=true;localStorage.setItem('starship.quality',q);}
  const d={low:1,medium:1.25,high:1.65,ultra:2}[q];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,d));renderer.setSize(innerWidth,innerHeight,false);composer.setPixelRatio(Math.min(devicePixelRatio||1,d));composer.setSize(innerWidth,innerHeight);
  sun.shadow.mapSize.set(q==='ultra'?4096:q==='high'?2048:1024,q==='ultra'?4096:q==='high'?2048:1024);
  const base=q==='low'?.10:q==='medium'?.15:q==='high'?.19:.22;bloom.strength=base*speedProfile().bloom;
  ui.qualityBtn.textContent=(qualityLocked?'':'AUTO·')+q.toUpperCase();
}
applyQuality(quality);ui.speedSelect.value=String(playbackRate);
function setMode(m){mode=m;controls.enabled=m==='explore';ui.autoBtn.classList.toggle('active',m==='auto');ui.exploreBtn.classList.toggle('active',m==='explore');ui.modeBadge.textContent=m==='auto'?'CINEMATIC AUTO':'FREE EXPLORE';}
ui.autoBtn.onclick=()=>{autoSec=progress*TOTAL;setMode('auto');};
ui.exploreBtn.onclick=()=>{setMode('explore');target=progress;};
ui.qualityBtn.onclick=()=>{const a=['low','medium','high','ultra'];applyQuality(a[(a.indexOf(quality)+1)%a.length],true);};
ui.speedSelect.onchange=()=>{const v=Number(ui.speedSelect.value);if(speedLevels.includes(v)){playbackRate=v;localStorage.setItem('starship.speed',String(v));applyQuality(quality);if(v>=10&&audio.ctx&&audio.on){audio.ctx.suspend();audio.on=false;ui.soundBtn.textContent='SOUND AUTO';}}};
addEventListener('scroll',()=>{if(mode==='explore'&&forced===null){const max=document.documentElement.scrollHeight-innerHeight;target=max?scrollY/max:0;}},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality(quality);});

for(const s of stages){const b=document.createElement('button');b.className='marker';b.style.left=(s.start*100)+'%';b.dataset.label=s.label;b.onclick=()=>{progress=target=s.start+.0001;autoSec=progress*TOTAL;};ui.timelineMarkers.appendChild(b);}
const fmt=n=>{n=Math.max(0,Math.round(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
function updateUI(p,st){const s=stage(p);ui.storyIndex.textContent=String(s.i+1).padStart(2,'0')+' / '+stages.length;ui.storyLabel.textContent=s.label;ui.storyTitle.textContent=s.title;ui.storyCopy.textContent=s.copy;ui.fact.textContent=s.fact;ui.missionClock.textContent=fmt(p*TOTAL)+' / '+fmt(TOTAL);ui.altitude.textContent=st.alt<1000?Math.round(st.alt)+' m':(st.alt/1000).toFixed(st.alt<10000?1:0)+' km';ui.velocity.textContent=Math.round(st.vel).toLocaleString()+' km/h';ui.sequence.textContent=Math.round(p*100)+'%';ui.timelineFill.style.width=(p*100)+'%';[...ui.timelineMarkers.children].forEach((m,i)=>m.classList.toggle('on',i===s.i));ui.hint.style.opacity=p<.018?'1':'0';const launch=S('liftoff');if(p>=S('countdown')&&p<launch){ui.countdown.textContent='T−00:00:'+String(Math.ceil((launch-p)*TOTAL)).padStart(2,'0');ui.countdown.classList.add('on');}else ui.countdown.classList.remove('on');}

const audio={ctx:null,on:false,async toggle(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();const master=this.ctx.createGain();master.gain.value=.22;master.connect(this.ctx.destination);const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sawtooth';osc.frequency.value=38;gain.gain.value=0;osc.connect(gain).connect(master);osc.start();this.osc=osc;this.gain=gain;}if(this.ctx.state==='suspended')await this.ctx.resume();else if(this.on)await this.ctx.suspend();this.on=this.ctx.state==='running';return this.on;},update(st){if(this.ctx&&this.on){const t=this.ctx.currentTime,rateGain=playbackRate>=10?0:playbackRate>=5?.32:1;this.gain.gain.setTargetAtTime(st.ign*.22*rateGain,t,.2);this.osc.frequency.setTargetAtTime(36+st.ign*15,t,.2);}}};
ui.soundBtn.onclick=async()=>{ui.soundBtn.textContent=(await audio.toggle())?'SOUND ON':'SOUND OFF';};

function updateScene(p,st,dt,now){
  vehicleRoot.position.y=2.7+st.visualY;
  cutaway.visible=p>=S('cutaway')&&p<E('engine');
  if(boosterPart&&shipPart){boosterPart.visible=!cutaway.visible;shipPart.visible=!cutaway.visible;}
  engineOverlay.visible=p>=S('engine')&&p<S('hotstage');
  const boosterPower=st.ign*(1-clamp((p-S('meco'))/(E('meco')-S('meco'))));
  boosterFlames.visible=boosterPower>.01;boosterFlames.children.forEach((f,i)=>{const flick=.92+.08*Math.sin(now*.028+i*.71)+.035*Math.sin(now*.063+i);f.scale.y=lerp(1,i<20?23:26,boosterPower)*flick;f.scale.x=f.scale.z=.93+.07*Math.sin(now*.041+i*.37);f.material.opacity=.42+boosterPower*.5;});
  const hot=clamp((p-S('hotstage'))/Math.max(.001,(E('hotstage')-S('hotstage'))*.35));shipFlames.visible=hot>.02;shipFlames.children.forEach((f,i)=>{const flick=.91+.09*Math.sin(now*.031+i);f.scale.y=lerp(1,12,hot)*flick;f.scale.x=f.scale.z=.94+.06*Math.sin(now*.052+i*.6);});
  launchLight.intensity=boosterPower*45;launchLight.position.set(0,vehicleRoot.position.y,0);
  const sep=st.sep;
  if(boosterPart&&shipPart){
    boosterPart.position.set(-sep*14,-sep*28,0); boosterPart.rotation.z=-sep*.45;
    shipPart.position.set(sep*22,sep*48,-sep*8); shipPart.rotation.z=sep*.08;
  }
  engineOverlay.position.set(-sep*14,-sep*28,0); engineOverlay.rotation.z=-sep*.45;
  shipFlames.position.set(sep*22,sep*48,-sep*8); shipFlames.rotation.z=sep*.08;
  updateVFX(dt,p,st);
  const space=clamp((st.alt-16000)/76000);scene.fog.density=lerp(.00125,.000018,space);sky.visible=space<.96;sky.material.uniforms.rayleigh.value=lerp(2.5,.12,space);sky.material.uniforms.turbidity.value=lerp(6.5,1.2,space);ground.visible=space<.72;clouds.visible=space<.74;clouds.position.y=st.visualY*.12;
  const er=clamp((p-S('high'))/Math.max(.001,E('high')-S('high')));earth.visible=er>.03;atmo.visible=er>.08;earth.position.y=vehicleRoot.position.y-1610;atmo.position.y=earth.position.y;earth.rotation.y=now*.0000065;atmo.rotation.y=earth.rotation.y;
  clouds.position.x=Math.sin(now*.000035)*28;clouds.position.z=Math.cos(now*.000027)*18;clouds.rotation.y=now*.000003;
  const c=cameraSpec(p,st);if(mode==='auto'||forced!==null){
    const calm=p<S('liftoff')?1:2.5;const driftX=Math.sin(now*.00031+1.1)*calm+Math.sin(now*.00011)*calm*.55;const driftZ=Math.cos(now*.00027+.4)*calm*.7;const driftY=Math.sin(now*.00019+.8)*calm*.28;
    c.pos.x+=driftX;c.pos.z+=driftZ;c.pos.y+=driftY;c.tar.x+=Math.sin(now*.00017)*calm*.22;c.tar.y+=Math.cos(now*.00015)*calm*.16;
    camera.position.copy(c.pos);camera.fov=c.f;camera.updateProjectionMatrix();
    if(!reduced&&boosterPower>.05&&p<S('ascent')){const q=.1+boosterPower*.35;camera.position.x+=Math.sin(now*.019)*q;camera.position.y+=Math.sin(now*.027+1.2)*q*.6;}
    camera.lookAt(c.tar);controls.target.copy(c.tar);
  }else controls.update();
}

let frames=0,ft=0,cool=0;
function animate(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;if(forced!==null){progress=target=forced;}else if(mode==='auto'){autoSec+=dt*playbackRate;progress=target=clamp(autoSec/TOTAL);if(progress>=1)setMode('explore');}else progress+= (target-progress)*(reduced?.25:.085);const st=stateAt(progress),simDt=Math.min(.08,dt*speedProfile().sim);updateScene(progress,st,simDt,now);audio.update(st);updateUI(progress,st);composer.render();frames++;ft+=dt;cool=Math.max(0,cool-dt);if(ft>4){const fps=frames/ft;if(cool===0&&fps<28&&quality!=='low'&&!qualityLocked){const a=['low','medium','high','ultra'];applyQuality(a[Math.max(0,a.indexOf(quality)-1)]);cool=10;}frames=0;ft=0;}if(forced===null)requestAnimationFrame(animate);}

async function start(){
  last=performance.now();if(forced!==null)animate(last);else requestAnimationFrame(animate);
  try{await loadModel();loadPct(84,'CALIBRATING PBR MATERIALS','STAINLESS STEEL · TILES · RAPTOR ENGINE OVERLAY');loadPct(92,'INITIALIZING LAUNCH VFX','33 BOOSTER PLUMES · 6 SHIP PLUMES · SMOKE · VENTING');loadPct(100,'READY','HIGH-DETAIL MODE · AUTO '+playbackRate+'x');window.__STARSHIP_READY=true;setTimeout(()=>{ui.loading.classList.add('done');setTimeout(()=>ui.loading.hidden=true,700);},220);}catch(e){fatal('고해상도 3D 모델을 불러오지 못했습니다: '+(e?.message||e));}}
start();

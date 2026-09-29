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
  fatal:$('#fatal'), fatalReason:$('#fatalReason'), autoBtn:$('#autoBtn'), exploreBtn:$('#exploreBtn'), soundBtn:$('#soundBtn'), qualityBtn:$('#qualityBtn'),
  storyIndex:$('#storyIndex'), storyLabel:$('#storyLabel'), storyTitle:$('#storyTitle'), storyCopy:$('#storyCopy'), fact:$('#fact'),
  missionClock:$('#missionClock'), altitude:$('#altitude'), velocity:$('#velocity'), sequence:$('#sequence'), countdown:$('#countdown'),
  modeBadge:$('#modeBadge'), timelineFill:$('#timelineFill'), timelineMarkers:$('#timelineMarkers'), hint:$('#hint')
};
function loadPct(p,label,note=''){ ui.loaderBar.style.width=p+'%'; ui.loaderPct.textContent=Math.round(p)+'%'; ui.loaderLabel.textContent=label; if(note)ui.loaderNote.textContent=note; }
function fatal(msg){ ui.loading.hidden=true; ui.fatal.hidden=false; ui.fatalReason.textContent=msg; console.error(msg); }

const stages = [
 ['starbase','STARBASE','A QUIET PAD','Starbase Pad 2의 전체 환경과 발사 시스템의 규모부터 시작합니다.',34,'STARBASE · PAD 2 · V3 VISUAL RECONSTRUCTION'],
 ['approach','APPROACH','THE 124-METER STACK','서비스 도로에서 124 m급 Starship V3 / Super Heavy V3 스택으로 접근합니다.',28,'OFFICIAL HEIGHT 124 m · DIAMETER 9 m'],
 ['support','GROUND SYSTEMS','PAD 2 / GROUND SUPPORT','타워, catch arms, 탱크팜과 지상 배관을 훑습니다.',30,'GROUND SYSTEMS ARE A VISUAL RECONSTRUCTION'],
 ['load','PROPELLANT LOAD','METHANE / OXYGEN','액체메탄과 액체산소 적재가 진행되며 venting과 결빙이 증가합니다.',42,'FLIGHT 13 COUNTDOWN REFERENCES'],
 ['cutaway','CUTAWAY','INSIDE THE TANKS','탱크와 공급 라인을 교육용 cutaway로 보여줍니다.',34,'EDUCATIONAL VISUALIZATION'],
 ['engine','ENGINE BAY','33 RAPTOR 3 ENGINES','Super Heavy 하부의 33개 Raptor 3 배열을 강조합니다.',36,'13 CENTER + 20 PERIMETER ENGINES'],
 ['countdown','FINAL COUNTDOWN','T−00:00:30','발사 직전 venting과 지상 조명이 긴장감을 높입니다.',32,'FLAME DIVERTER T−00:17 · ENGINE START T−00:03'],
 ['ignition','IGNITION','RAPTOR 3 START','33개 엔진 plume과 배기가스가 발사대 아래에서 확장됩니다.',22,'REAL-TIME VFX APPROXIMATION'],
 ['liftoff','LIFTOFF','THE STACK MOVES','거대한 발사체가 천천히 지면에서 분리되기 시작합니다.',30,'33 RAPTOR 3 ENGINES'],
 ['tower','TOWER CLEAR','CLEAR OF PAD 2','발사탑을 완전히 벗어나는 순간을 낮은 시점에서 추적합니다.',25,'CINEMATIC CAMERA'],
 ['ascent','ASCENT','THROUGH THE ATMOSPHERE','발사장이 멀어지고 구름층과 대기 색이 변화합니다.',38,'PROCEDURAL ATMOSPHERE / CLOUDS'],
 ['maxq','MAX Q','PEAK AERODYNAMIC STRESS','최대 동압 구간을 속도감과 공력 분위기로 표현합니다.',16,'FLIGHT 13: MAX Q ≈ T+00:58'],
 ['high','HIGH ALTITUDE','THE SKY FALLS AWAY','하늘이 어두워지고 지구 곡률이 나타납니다.',25,'EARTH SCALE COMPRESSED'],
 ['meco','STAGING PREP','SUPER HEAVY MECO','부스터 엔진이 정지하며 카메라가 stage interface로 접근합니다.',18,'FLIGHT 13: MECO ≈ T+02:18'],
 ['hotstage','HOT-STAGING','SIX RAPTORS IGNITE','Starship의 6개 Raptor가 점화되며 hot-staging이 시작됩니다.',16,'FLIGHT 13: HOT-STAGING ≈ T+02:21'],
 ['separated','SEPARATION','TWO VEHICLES, TWO PATHS','Starship과 Super Heavy가 서로 다른 궤적으로 멀어집니다.',25,'POST-SEPARATION MOTION COMPRESSED']
].map(([id,label,title,copy,sec,fact])=>({id,label,title,copy,sec,fact}));
const TOTAL = stages.reduce((a,s)=>a+s.sec,0);
let acc=0; stages.forEach((s,i)=>{s.i=i;s.start=acc/TOTAL;acc+=s.sec;s.end=acc/TOTAL;});
const stage = p => stages.find(s=>p>=s.start&&p<s.end)||stages.at(-1);
const S = id => stages.find(s=>s.id===id).start;
const E = id => stages.find(s=>s.id===id).end;

loadPct(5,'CREATING WEBGL RENDERER');
const renderer = new THREE.WebGLRenderer({canvas:$('#scene'),antialias:!mobile,powerPreference:'high-performance',logarithmicDepthBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x92a4b1,.00125);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,300000);
camera.position.set(170,78,210);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.enabled=false; controls.maxDistance=400;

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.24,.4,1.1);
composer.addPass(bloom); composer.addPass(new OutputPass());

const sun=new THREE.DirectionalLight(0xffe5c0,4.2); sun.position.set(-160,240,120); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-180; sun.shadow.camera.right=180; sun.shadow.camera.top=220; sun.shadow.camera.bottom=-120; sun.shadow.camera.far=650;
scene.add(sun,new THREE.HemisphereLight(0xb7d8f5,0x443528,1.4));
const launchLight=new THREE.PointLight(0xff6a18,0,180,1.6); scene.add(launchLight);

const sky=new Sky(); sky.scale.setScalar(300000); scene.add(sky);
sky.material.uniforms.turbidity.value=6.5; sky.material.uniforms.rayleigh.value=2.5; sky.material.uniforms.mieCoefficient.value=.004;
sky.material.uniforms.mieDirectionalG.value=.82;
sky.material.uniforms.sunPosition.value.setFromSphericalCoords(1,THREE.MathUtils.degToRad(67),THREE.MathUtils.degToRad(128));

const mat=(c,m=.1,r=.7,o={})=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r,...o});
const BOX=new THREE.BoxGeometry(1,1,1), CYL=new THREE.CylinderGeometry(1,1,2,24), SPH=new THREE.SphereGeometry(1,32,48);
const M={concrete:mat(0x69645e,.02,.94),soil:mat(0x493728,0,1),road:mat(0x23282b,0,.98),steel:mat(0x354047,.72,.43),pipe:mat(0x899297,.78,.31),stainless:mat(0xaab2b6,.94,.25),dark:mat(0x1b2024,.62,.48)};
function mesh(g,m,p,s,parent=scene,cast=false){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;}

loadPct(14,'BUILDING STARBASE ENVIRONMENT');
const ground=new THREE.Group(); scene.add(ground);
mesh(BOX,M.soil,[0,-1.4,0],[520,2,430],ground);
mesh(BOX,M.concrete,[0,.05,0],[78,.45,70],ground);
mesh(BOX,M.road,[0,.08,70],[360,.25,13],ground);
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
let model=null;
const MODEL_URL='https://cdn.jsdelivr.net/gh/haskaomni/blueprint@main/public/models/starship-block3.glb';
const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);

function normalizeVehicle(root){
  root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root),s=new THREE.Vector3();b.getSize(s);const k=124/Math.max(.001,s.y);root.scale.setScalar(k);root.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(root),c=new THREE.Vector3();b2.getCenter(c);root.position.x-=c.x;root.position.z-=c.z;root.position.y-=b2.min.y;
  root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const arr=Array.isArray(o.material)?o.material:[o.material];for(const m of arr){if(!m)continue;if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;if('metalness'in m){const n=(o.name||'').toLowerCase();if(/tile|heat|black/.test(n)){m.metalness=Math.min(m.metalness??.1,.15);m.roughness=Math.max(m.roughness??.5,.68);}else{m.metalness=Math.max(m.metalness??.2,.58);m.roughness=clamp(m.roughness??.4,.22,.58);}}}});
}
function loadModel(){return new Promise((res,rej)=>loader.load(MODEL_URL,g=>{model=g.scene;normalizeVehicle(model);vehicleRoot.add(model);res();},x=>{if(x.total)loadPct(24+(x.loaded/x.total)*48,'LOADING HIGH-DETAIL STARSHIP BLOCK 3',((x.loaded/1048576).toFixed(1))+' / '+((x.total/1048576).toFixed(1))+' MB · CC BY 4.0');},rej));}

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
  if(p>=S('load')&&p<S('liftoff')){vaporAcc+=dt*(10+25*clamp((p-S('load'))/(E('load')-S('load'))));while(vaporAcc>1){vaporAcc--;const side=Math.random()<.5?-1:1,y=Math.random()<.55?28:94;vapor.spawn(new THREE.Vector3(side*4.6,vehicleRoot.position.y+y,(Math.random()-.5)*4),new THREE.Vector3(side*(1+Math.random()*4),.7+Math.random()*2,(Math.random()-.5)*2),4+Math.random()*8,2.2+Math.random()*2);}}
  if(st.ign>.02){smokeAcc+=dt*(25+st.ign*(mobile?65:120));while(smokeAcc>1){smokeAcc--;const a=Math.random()*Math.PI*2,r=Math.random()*6;smoke.spawn(new THREE.Vector3(Math.cos(a)*r,vehicleRoot.position.y-1,Math.sin(a)*r),new THREE.Vector3((Math.random()-.5)*(7+st.ign*15),.5+Math.random()*3,(Math.random()-.5)*(7+st.ign*15)),8+Math.random()*16,2.5+Math.random()*3);}}
  smoke.update(dt);vapor.update(dt);
}

const cameraKeys=[
 [0,[178,82,212],[0,58,0],52],[S('approach'),[112,52,132],[0,60,0],49],[S('support'),[55,38,74],[8,62,0],47],
 [S('load'),[30,98,42],[0,87,0],43],[S('cutaway'),[17,75,23],[0,72,0],39],[S('engine'),[15,20,18],[0,8,0],47],
 [E('engine'),[10,7.5,13],[0,2.5,0],55],[S('countdown'),[31,18,40],[0,42,0],51],[S('ignition'),[23,10.5,28],[0,4,0],56],
 [S('liftoff'),[39,17,48],[0,29,0],56],[S('tower'),[48,76,62],[0,91,0],49]
];
function cameraSpec(p,st){
  if(p>=S('ascent')){const y=vehicleRoot.position.y;if(p<S('maxq'))return {pos:new THREE.Vector3(58,y+21,74),tar:new THREE.Vector3(0,y+44,0),f:47};
    if(p<S('high'))return {pos:new THREE.Vector3(80,y+38,95),tar:new THREE.Vector3(0,y+55,0),f:44};
    if(p<S('meco'))return {pos:new THREE.Vector3(108,y+52,128),tar:new THREE.Vector3(0,y+65,0),f:42};
    if(p<S('hotstage'))return {pos:new THREE.Vector3(42,y+12,52),tar:new THREE.Vector3(0,y+76,0),f:48};
    if(p<E('hotstage'))return {pos:new THREE.Vector3(27,y+4,35),tar:new THREE.Vector3(0,y+76,0),f:54};
    return {pos:new THREE.Vector3(98,y+61,117),tar:new THREE.Vector3(0,y+68,0),f:43};}
  let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1][0])i++;const a=cameraKeys[i],b=cameraKeys[i+1]||a,t=smooth((p-a[0])/Math.max(.0001,b[0]-a[0]));
  return {pos:new THREE.Vector3(...a[1]).lerp(new THREE.Vector3(...b[1]),t),tar:new THREE.Vector3(...a[2]).lerp(new THREE.Vector3(...b[2]),t),f:lerp(a[3],b[3],t)};
}

let mode='auto',progress=forced??0,target=progress,autoSec=progress*TOTAL,last=performance.now(),quality=mobile?'medium':'high';
function applyQuality(q){quality=q;const d={low:1,medium:1.25,high:1.65,ultra:2}[q];renderer.setPixelRatio(Math.min(devicePixelRatio||1,d));renderer.setSize(innerWidth,innerHeight,false);composer.setPixelRatio(Math.min(devicePixelRatio||1,d));composer.setSize(innerWidth,innerHeight);sun.shadow.mapSize.set(q==='ultra'?4096:q==='high'?2048:1024,q==='ultra'?4096:q==='high'?2048:1024);bloom.strength=q==='low'?.12:q==='medium'?.18:.24;ui.qualityBtn.textContent=q.toUpperCase();}
applyQuality(quality);
function setMode(m){mode=m;controls.enabled=m==='explore';ui.autoBtn.classList.toggle('active',m==='auto');ui.exploreBtn.classList.toggle('active',m==='explore');ui.modeBadge.textContent=m==='auto'?'CINEMATIC AUTO':'FREE EXPLORE';}
ui.autoBtn.onclick=()=>{autoSec=progress*TOTAL;setMode('auto');};
ui.exploreBtn.onclick=()=>{setMode('explore');target=progress;};
ui.qualityBtn.onclick=()=>{const a=['low','medium','high','ultra'];applyQuality(a[(a.indexOf(quality)+1)%a.length]);};
addEventListener('scroll',()=>{if(mode==='explore'&&forced===null){const max=document.documentElement.scrollHeight-innerHeight;target=max?scrollY/max:0;}},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality(quality);});

for(const s of stages){const b=document.createElement('button');b.className='marker';b.style.left=(s.start*100)+'%';b.dataset.label=s.label;b.onclick=()=>{progress=target=s.start+.0001;autoSec=progress*TOTAL;};ui.timelineMarkers.appendChild(b);}
const fmt=n=>{n=Math.max(0,Math.round(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
function updateUI(p,st){const s=stage(p);ui.storyIndex.textContent=String(s.i+1).padStart(2,'0')+' / '+stages.length;ui.storyLabel.textContent=s.label;ui.storyTitle.textContent=s.title;ui.storyCopy.textContent=s.copy;ui.fact.textContent=s.fact;ui.missionClock.textContent=fmt(p*TOTAL)+' / '+fmt(TOTAL);ui.altitude.textContent=st.alt<1000?Math.round(st.alt)+' m':(st.alt/1000).toFixed(st.alt<10000?1:0)+' km';ui.velocity.textContent=Math.round(st.vel).toLocaleString()+' km/h';ui.sequence.textContent=Math.round(p*100)+'%';ui.timelineFill.style.width=(p*100)+'%';[...ui.timelineMarkers.children].forEach((m,i)=>m.classList.toggle('on',i===s.i));ui.hint.style.opacity=p<.018?'1':'0';const launch=S('liftoff');if(p>=S('countdown')&&p<launch){ui.countdown.textContent='T−00:00:'+String(Math.ceil((launch-p)*TOTAL)).padStart(2,'0');ui.countdown.classList.add('on');}else ui.countdown.classList.remove('on');}

const audio={ctx:null,on:false,async toggle(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();const master=this.ctx.createGain();master.gain.value=.22;master.connect(this.ctx.destination);const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sawtooth';osc.frequency.value=38;gain.gain.value=0;osc.connect(gain).connect(master);osc.start();this.osc=osc;this.gain=gain;}if(this.ctx.state==='suspended')await this.ctx.resume();else if(this.on)await this.ctx.suspend();this.on=this.ctx.state==='running';return this.on;},update(st){if(this.ctx&&this.on){const t=this.ctx.currentTime;this.gain.gain.setTargetAtTime(st.ign*.22,t,.2);this.osc.frequency.setTargetAtTime(36+st.ign*15,t,.2);}}};
ui.soundBtn.onclick=async()=>{ui.soundBtn.textContent=(await audio.toggle())?'SOUND ON':'SOUND OFF';};

function updateScene(p,st,dt,now){
  vehicleRoot.position.y=2.7+st.visualY;
  cutaway.visible=p>=S('cutaway')&&p<E('engine');if(model)model.visible=!cutaway.visible&&p<S('hotstage');
  engineOverlay.visible=p>=S('engine')&&p<S('hotstage');
  const boosterPower=st.ign*(1-clamp((p-S('meco'))/(E('meco')-S('meco'))));
  boosterFlames.visible=boosterPower>.01;boosterFlames.children.forEach((f,i)=>{f.scale.y=lerp(1,i<20?23:26,boosterPower);f.material.opacity=.45+boosterPower*.5;});
  const hot=clamp((p-S('hotstage'))/Math.max(.001,(E('hotstage')-S('hotstage'))*.35));shipFlames.visible=hot>.02;shipFlames.children.forEach(f=>f.scale.y=lerp(1,12,hot));
  launchLight.intensity=boosterPower*45;launchLight.position.set(0,vehicleRoot.position.y,0);
  const sep=st.sep;if(p>=S('hotstage')){engineOverlay.visible=true;engineOverlay.position.set(-sep*14,-sep*28,0);engineOverlay.rotation.z=-sep*.45;shipFlames.position.set(sep*22,sep*48,-sep*8);}
  updateVFX(dt,p,st);
  const space=clamp((st.alt-16000)/76000);scene.fog.density=lerp(.00125,.000018,space);sky.visible=space<.96;sky.material.uniforms.rayleigh.value=lerp(2.5,.12,space);sky.material.uniforms.turbidity.value=lerp(6.5,1.2,space);ground.visible=space<.72;clouds.visible=space<.74;clouds.position.y=st.visualY*.12;
  const er=clamp((p-S('high'))/Math.max(.001,E('high')-S('high')));earth.visible=er>.03;atmo.visible=er>.08;earth.position.y=vehicleRoot.position.y-1610;atmo.position.y=earth.position.y;
  const c=cameraSpec(p,st);if(mode==='auto'||forced!==null){camera.position.copy(c.pos);camera.fov=c.f;camera.updateProjectionMatrix();if(!reduced&&boosterPower>.05&&p<S('ascent')){const q=.1+boosterPower*.35;camera.position.x+=Math.sin(now*.019)*q;camera.position.y+=Math.sin(now*.027+1.2)*q*.6;}camera.lookAt(c.tar);controls.target.copy(c.tar);}else controls.update();
}

let frames=0,ft=0,cool=0;
function animate(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;if(forced!==null){progress=target=forced;}else if(mode==='auto'){autoSec+=dt;progress=target=clamp(autoSec/TOTAL);if(progress>=1)setMode('explore');}else progress+= (target-progress)*(reduced?.25:.085);const st=stateAt(progress);updateScene(progress,st,dt,now);audio.update(st);updateUI(progress,st);composer.render();frames++;ft+=dt;cool=Math.max(0,cool-dt);if(ft>4){const fps=frames/ft;if(cool===0&&fps<26&&quality!=='low'){const a=['low','medium','high','ultra'];applyQuality(a[Math.max(0,a.indexOf(quality)-1)]);cool=10;}frames=0;ft=0;}if(forced===null)requestAnimationFrame(animate);}

async function start(){try{await loadModel();loadPct(84,'CALIBRATING PBR MATERIALS','STAINLESS STEEL · TILES · RAPTOR ENGINE OVERLAY');loadPct(92,'INITIALIZING LAUNCH VFX','33 BOOSTER PLUMES · 6 SHIP PLUMES · SMOKE · VENTING');loadPct(100,'READY','HIGH-DETAIL MODE');setTimeout(()=>{ui.loading.classList.add('done');setTimeout(()=>ui.loading.hidden=true,700);},220);last=performance.now();if(forced!==null)animate(last);else requestAnimationFrame(animate);}catch(e){fatal('고해상도 3D 모델을 불러오지 못했습니다: '+(e?.message||e));}}
start();

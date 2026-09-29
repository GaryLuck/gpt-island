import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed = 2317;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const range = (a, b) => a + random() * (b - a);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e4ede5');
scene.fog = new THREE.Fog('#e4ede5', 48, 115);
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .1, 160);
const initialCamera = new THREE.Vector3(23, 21, 28);
const initialTarget = new THREE.Vector3(0, 1.3, 0);
camera.position.copy(initialCamera);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  document.body.classList.add('error');
  $('loading').lastElementChild.textContent = 'This little world needs WebGL. Please enable hardware acceleration in your browser and reload.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
$('world').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(initialTarget);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.minDistance = 6;
controls.maxDistance = 55;
controls.minPolarAngle = .18;
controls.maxPolarAngle = Math.PI / 2.12;
controls.autoRotateSpeed = .4;
controls.panSpeed = .6;
const hemi = new THREE.HemisphereLight('#f0f5e7', '#628f86', 2.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0cc', 3.5);
sun.position.set(-15, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 65 });
sun.shadow.normalBias = .035;
sun.shadow.bias = -.0002;
scene.add(sun);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true, ...extra });
const materials = {
  sand: mat('#e7d3a1'), rock: mat('#859183'), darkrock: mat('#6b8276'),
  trunk: mat('#76624a'), leaves: ['#426b49', '#507f51', '#6b9356', '#7d9e61'].map(c => mat(c)),
  wall: mat('#f1e7c7'), roof: mat('#b86b4a', { side: THREE.DoubleSide }), roofDark: mat('#775a4c', { side: THREE.DoubleSide }),
  wood: mat('#a17d55'), darkwood: mat('#685847'), white: mat('#f4eee0'),
  glass: mat('#33585a', { roughness: .3 }), brass: mat('#c69a49'),
};
function mesh(geometry, material, x = 0, y = 0, z = 0, parent = scene) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
function box(w, h, d, material, x, y, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent); }
function cylinder(top, bottom, h, material, x, y, z, parent, segments = 8) { return mesh(new THREE.CylinderGeometry(top, bottom, h, segments), material, x, y, z, parent); }
function rock(x, z, size, y = height(x, z), material = materials.rock) {
  const r = mesh(new THREE.DodecahedronGeometry(size, 0), material, x, y + size * .3, z);
  r.scale.set(range(.8, 1.6), range(.6, 1), range(.7, 1.3));
  r.rotation.set(random(), random() * Math.PI, random()); return r;
}
function radius(a) { return 8.3 + .55 * Math.sin(a * 3 + .5) + .38 * Math.cos(a * 5) + .2 * Math.sin(a * 9); }
function height(x, z) {
  const a = Math.atan2(z / .82, x), r = Math.hypot(x, z / .82) / radius(a);
  const base = .35 + 1.4 * Math.max(0, 1 - r * r);
  const hill = 2.55 * Math.exp(-((x + 1.7) ** 2 / 10 + (z + 1.8) ** 2 / 8));
  const eastHill = 1.1 * Math.exp(-((x - 4.5) ** 2 / 4 + (z + 1) ** 2 / 5));
  const cliff = .9 * Math.exp(-((x + 5.7) ** 2 / 4 + (z + .7) ** 2 / 4));
  return base + (hill + eastHill + cliff) * Math.max(0, 1 - r ** 8);
}

// Concentric irregular rings produce a continuous faceted landmass with a sandy rim.
const rings = 18, segments = 96, positions = [], colors = [];
const grassColors = ['#819956', '#8fa460', '#9aad6c', '#799750', '#a0ae6c'].map(c => new THREE.Color(c));
function vertex(ring, i) {
  const a = i / segments * Math.PI * 2;
  const r = radius(a) * ring / rings;
  const x = Math.cos(a) * r, z = Math.sin(a) * r * .82;
  return [x, ring === rings ? .24 : height(x, z), z];
}
function triangle(a, b, c, sand) {
  positions.push(...a, ...b, ...c);
  const color = sand ? new THREE.Color('#e3d1a1').multiplyScalar(range(.95, 1.05)) : grassColors[Math.floor(random() * grassColors.length)];
  for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
}
for (let r = 0; r < rings; r++) for (let i = 0; i < segments; i++) {
  const a = vertex(r, i), b = vertex(r + 1, i), c = vertex(r + 1, i + 1), d = vertex(r, i + 1);
  triangle(a, c, b, r > rings - 3); if (r > 0) triangle(a, d, c, r > rings - 3);
}
const terrainGeometry = new THREE.BufferGeometry();
terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeometry.computeVertexNormals();
mesh(terrainGeometry, mat('#ffffff', { vertexColors: true }));

// Shallow reef shelves and a moving, softly striped sea.
const waterUniforms = { time: { value: 0 }, tint: { value: new THREE.Color('#66bcb4') } };
const waterMaterial = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: `varying vec3 vPosition; void main(){vec4 world=modelMatrix*vec4(position,1.0);vPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader: `uniform float time;uniform vec3 tint;varying vec3 vPosition;
  void main(){vec2 p=vPosition.xz;float d=length(p*vec2(1.,1.22));float a=atan(p.y*1.22,p.x);float edge=8.3+.55*sin(a*3.+.5)+.38*cos(a*5.)+.2*sin(a*9.);float shore=1.-smoothstep(edge,edge+3.8,d);float farFade=smoothstep(16.,62.,d);float wave=sin(p.x*2.3+p.y*3.8+time*.75)*sin(p.x*.55-p.y*.82-time*.35);float fleck=smoothstep(.975,1.,wave)*.11;vec3 c=mix(tint,vec3(.56,.80,.70),shore*.64);c+=fleck;float foam=pow(.5+.5*sin((d-edge)*9.-time*.8+sin(a*13.)*.5),18.)*(1.-smoothstep(.05,1.3,d-edge))*smoothstep(-.05,.18,d-edge);c+=foam*.12;c=mix(c,vec3(.894,.929,.898),farFade);gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`,
});
const water = mesh(new THREE.PlaneGeometry(300, 300), waterMaterial, 0, .04, 0);
water.rotation.x = -Math.PI / 2; water.castShadow = false;
const seabed = mesh(new THREE.CylinderGeometry(9.6, 10.2, .25, 96), mat('#aad8bc'), 0, -.2, 0);
seabed.scale.z = .83;

function tree(x, z, size = 1) {
  const group = new THREE.Group(); group.position.set(x, height(x, z), z); scene.add(group);
  group.rotation.y = random() * Math.PI;
  cylinder(.085, .13, 1.7 * size, materials.trunk, 0, .7 * size, 0, group, 5);
  const leaf = materials.leaves[Math.floor(random() * materials.leaves.length)];
  for (let k = 0; k < 3; k++) {
    const cone = mesh(new THREE.ConeGeometry((.73 - k * .16) * size, (1.35 - k * .2) * size, 6), leaf, 0, (1.1 + k * .5) * size, 0, group);
    cone.rotation.y = k * .45;
  }
}
for (let i = 0; i < 155; i++) {
  const x = range(-6.8, 6.8), z = range(-5.5, 4.3);
  if (Math.hypot(x, z / .82) > 6.9) continue;
  if (x < -4.3 && z > -.9) continue;
  if (x > .1 && z > .1) continue;
  if (Math.abs(z - (x * .22 + 1.1)) < .65) continue;
  tree(x, z, range(.65, 1.25));
}
for (let i = 0; i < 44; i++) {
  const a = random() * Math.PI * 2, r = radius(a) * range(.87, 1.12);
  const x = Math.cos(a) * r, z = Math.sin(a) * r * .82;
  if (z > 3.4 && x > -1 && x < 5) continue;
  rock(x, z, range(.2, .67), r > radius(a) ? .07 : height(x, z));
}
// A meandering footpath laid directly onto the hillside.
function path(points, width = .27) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x,0,z)));
  const p = [], n = 100;
  for (let i = 0; i < n; i++) {
    const a = curve.getPoint(i/n), b = curve.getPoint((i+1)/n);
    const normal = new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(width);
    const vertices = [a.clone().add(normal),b.clone().add(normal),a.clone().sub(normal),b.clone().add(normal),b.clone().sub(normal),a.clone().sub(normal)];
    vertices.forEach(v => p.push(v.x, height(v.x,v.z)+.035,v.z));
  }
  const geo = new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();
  mesh(geo,mat('#c9b78a',{side:THREE.DoubleSide}));
}
path([[-5.4,.5],[-3,1],[-1,1.15],[1.2,2.1],[3,2.2],[3.4,4.8]],.21);
path([[1.4,2],[2.2,.9],[3.5,.2],[4.3,-.3]],.17);

const windowGlow = mat('#efc977',{emissive:'#ffc766',emissiveIntensity:.1});
function cottage(x,z,scale,rotation,roofMaterial=materials.roof) {
  const g = new THREE.Group();g.position.set(x,height(x,z)+.04,z);g.rotation.y=rotation;g.scale.setScalar(scale);scene.add(g);
  box(1.5,.16,1.25,materials.rock,0,.04,0,g);
  box(1.35,1.02,1.1,materials.wall,0,.61,0,g);
  // Gable geometry keeps the roof ridge horizontal and the eaves crisp.
  const roofGeo=new THREE.BufferGeometry();
  roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.84,0,-.7,.84,0,-.7,0,.72,-.7, -.84,0,.7,0,.72,.7,.84,0,.7, -.84,0,-.7,0,.72,-.7,-.84,0,.7, 0,.72,-.7,0,.72,.7,-.84,0,.7, .84,0,-.7,.84,0,.7,0,.72,-.7, 0,.72,-.7,.84,0,.7,0,.72,.7],3));roofGeo.computeVertexNormals();
  mesh(roofGeo,roofMaterial,0,1.08,0,g);
  box(.28,.65,.035,materials.darkwood,.1,.43,.564,g);
  for (const xx of [-.43,.43]) {box(.26,.3,.05,materials.white,xx,.73,.57,g);box(.19,.23,.055,windowGlow,xx,.73,.58,g);}
  box(.24,.64,.24,materials.wall,.39,1.52,-.2,g);
  box(.3,.07,.3,materials.rock,.39,1.85,-.2,g);
  box(.5,.07,.26,materials.rock,.1,.11,.69,g);
  return g;
}
cottage(2.2,1.2,1.12,.22);
cottage(4.15,.15,.84,-.6,materials.roofDark);
cottage(.8,3.05,.73,-.2);
// Garden fencing and little warm-colored flower beds.
for(let i=0;i<8;i++){const x=.95+i*.35,z=.3;box(.055,.46,.055,materials.white,x,height(x,z)+.22,z);}
for(let i=0;i<7;i++){const x=1.12+i*.35,z=.3;box(.37,.045,.04,materials.white,x,height(x,z)+.32,z);}
for(let i=0;i<22;i++){const x=range(1.1,3.2),z=range(2.45,2.7);cylinder(.04,.04,.15,materials.leaves[0],x,height(x,z)+.06,z);mesh(new THREE.IcosahedronGeometry(.065),mat(i%2?'#e6bf62':'#d99179'),x,height(x,z)+.16,z);}

const lighthouse = new THREE.Group();
lighthouse.position.set(-5.45,height(-5.45,.25),.25);scene.add(lighthouse);
cylinder(.78,.94,.25,materials.rock,0,.08,0,lighthouse,12);
cylinder(.38,.61,2.75,materials.white,0,1.53,0,lighthouse,12);
cylinder(.435,.48,.5,materials.roof,0,2.1,0,lighthouse,12);
cylinder(.6,.6,.12,materials.darkwood,0,2.92,0,lighthouse,12);
cylinder(.38,.38,.61,materials.glass,0,3.26,0,lighthouse,8);
const lantern=mesh(new THREE.SphereGeometry(.19,12,8),windowGlow,0,3.29,0,lighthouse);
for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(.025,.025,.67,materials.white,Math.cos(a)*.38,3.27,Math.sin(a)*.38,lighthouse,5);cylinder(.02,.02,.35,materials.darkwood,Math.cos(a)*.56,3.12,Math.sin(a)*.56,lighthouse,5);}
const rail=mesh(new THREE.TorusGeometry(.56,.022,4,16),materials.darkwood,0,3.28,0,lighthouse);rail.rotation.x=Math.PI/2;
mesh(new THREE.ConeGeometry(.58,.48,12),materials.roof,0,3.8,0,lighthouse);
cylinder(.04,.04,.22,materials.brass,0,4.12,0,lighthouse);
box(.25,.5,.035,materials.darkwood,0,.42,.58,lighthouse);
box(.16,.28,.03,materials.glass,0,1.4,.51,lighthouse);
const beacon=new THREE.PointLight('#ffb555',0,10);beacon.position.set(-5.45,lighthouse.position.y+3.3,.25);scene.add(beacon);

// Dock, mooring posts, and a small sailboat.
const dock = new THREE.Group();dock.position.set(3.35,.39,6.1);dock.rotation.y=-.13;scene.add(dock);
for(let i=0;i<19;i++)box(1.03,.1,.18,materials.wood,0,0,i*.19-1.45,dock);
for(const x of [-.47,.47])for(const z of [-1.3,.15,1.75]){cylinder(.065,.075,.95,materials.darkwood,x,-.18,z,dock);cylinder(.075,.075,.04,materials.wood,x,.31,z,dock);}
box(1.5,.1,.55,materials.wood,.24,0,1.85,dock);
const boat = new THREE.Group();boat.position.set(5.05,.19,7.25);boat.rotation.y=.22;scene.add(boat);
const hull=mesh(new THREE.SphereGeometry(1,12,8),mat('#e9e4cf'),0,0,0,boat);hull.scale.set(.4,.24,1.05);
box(.5,.08,1.24,materials.wood,0,.18,0,boat);
cylinder(.028,.034,2.05,materials.darkwood,0,1.13,0,boat,6);
const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,.5,0,0,2.1,0,0,.5,.92, .04,.63,-.08,.04,1.87,-.08,.04,.63,-.76],3));sailGeo.computeVertexNormals();mesh(sailGeo,mat('#f6edd3',{side:THREE.DoubleSide}),0,0,0,boat);
const buoy=mesh(new THREE.SphereGeometry(.15,8,6),materials.roof,2,.15,8.3);

// A few offshore rocks and quiet cloud clusters.
rock(-9.5,-2,.7,.04);rock(-9,-2.5,.42,.02);rock(8,-5,.62,.05);
const clouds=[];
const cloudMat=mat('#f6f7eb',{transparent:true,opacity:.8});
for(const [x,y,z,s] of [[-9,8,-5,1],[6,9,-9,1.2],[-3,10,-12,.8]]){
  const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(s);scene.add(group);
  for(let j=0;j<5;j++){const puff=mesh(new THREE.IcosahedronGeometry(range(.5,.9),1),cloudMat,(j-2)*.66,range(-.1,.18),range(-.25,.25),group);puff.scale.set(1,.62,.75);puff.castShadow=false;}
  clouds.push({group,x});
}
const birds=[];
const birdMat=mat('#f3f2df',{side:THREE.DoubleSide});
for(let i=0;i<6;i++){
  const g=new THREE.Group();scene.add(g);
  const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.28,.07,.06,-.48,0,-.04, 0,0,0,.28,.07,.06,.48,0,-.04],3));shape.computeVertexNormals();mesh(shape,birdMat,0,0,0,g);birds.push(g);
}

const places={
  lighthouse:{title:'The lighthouse',kicker:'01 / THE WESTERN HEADLAND',description:'Above the rocky shore, a little beacon keeps watch. Some things are worth slowing down for.',point:new THREE.Vector3(-5.45,3.3,.25),offset:new THREE.Vector3(7,5,10)},
  village:{title:'Hillside cottages',kicker:'02 / A PLACE TO CALL HOME',description:'Terracotta roofs, a tiny garden, and the sea just beyond the doorstep. There’s no rush here.',point:new THREE.Vector3(2.3,2,1.2),offset:new THREE.Vector3(7,5,10)},
  harbor:{title:'The quiet harbor',kicker:'03 / DOWN BY THE WATER',description:'One sailboat. A weathered wooden dock. An afternoon with absolutely nothing on the agenda.',point:new THREE.Vector3(3.7,.7,6.6),offset:new THREE.Vector3(7,5,9)},
  forest:{title:'Pinewood trail',kicker:'04 / INTO THE GREEN',description:'Follow the winding path between the pines. Up here, the only company is the passing clouds.',point:new THREE.Vector3(-1.8,3.7,-2),offset:new THREE.Vector3(8,7,9)},
};
let transition=null, sunset=false;
const visited=new Set();
function moveTo(target,position){transition={start:performance.now(),from:camera.position.clone(),fromTarget:controls.target.clone(),to:position.clone(),target:target.clone(),duration:reducedMotion?0:1500};}
function setRotation(enabled){controls.autoRotate=enabled;$('rotate').setAttribute('aria-pressed',String(enabled));}
function selectPlace(key){
  const place=places[key];visited.add(key);setRotation(false);
  moveTo(place.point,place.point.clone().add(place.offset));
  $('place-kicker').textContent=place.kicker;$('place-title').textContent=place.title;$('place-description').textContent=place.description;$('place-card').hidden=false;
  $('discovered').textContent=`${String(visited.size).padStart(2,'0')} / 04`;
  document.querySelectorAll('.landmark').forEach(button=>{button.classList.toggle('active',button.dataset.place===key);button.classList.toggle('visited',visited.has(button.dataset.place));button.setAttribute('aria-pressed',String(button.dataset.place===key));});
}
document.querySelectorAll('.landmark').forEach(button=>button.addEventListener('click',()=>selectPlace(button.dataset.place)));
function closePlace(){ $('place-card').hidden=true;document.querySelectorAll('.landmark').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');}); }
$('close-place').addEventListener('click',closePlace);
function reset(){closePlace();setRotation(false);moveTo(initialTarget,initialCamera);}
$('reset').addEventListener('click',reset);
$('rotate').addEventListener('click',()=>{transition=null;setRotation(!controls.autoRotate);});
function zoom(factor){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
$('zoom-in').addEventListener('click',()=>zoom(.8));$('zoom-out').addEventListener('click',()=>zoom(1.25));
$('daylight').addEventListener('click',()=>{
  sunset=!sunset;$('daylight').setAttribute('aria-pressed',String(sunset));$('day-label').textContent=sunset?'Golden hour':'Daylight';$('day-icon').textContent=sunset?'☾':'☼';$('daylight').title=sunset?'Switch to daylight':'Switch to sunset';
  $('weather-label').textContent=sunset?'One last bit of sunshine.':'A perfectly ordinary, beautiful day.';
  sun.color.set(sunset?'#ffb66b':'#fff0cc');sun.intensity=sunset?2.9:3.5;sun.position.set(sunset?-25:-15,sunset?12:28,12);
  hemi.color.set(sunset?'#dbbdcb':'#f0f5e7');hemi.intensity=sunset?1.7:2.5;
  waterUniforms.tint.value.set(sunset?'#719e9e':'#66bcb4');windowGlow.emissiveIntensity=sunset?1.9:.1;beacon.intensity=sunset?8:0;
});
$('help-toggle').addEventListener('click',()=>{const open=$('help').hidden;$('help').hidden=!open;$('help-toggle').setAttribute('aria-expanded',String(open));});
controls.addEventListener('start',()=>{transition=null;setRotation(false);});
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closePlace();$('help').hidden=true;$('help-toggle').setAttribute('aria-expanded','false');return;}
  if(event.target.closest('button,input,a'))return;
  if(event.key.toLowerCase()==='h'){reset();return;}
  if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(event.key==='-'?1.15:1/1.15);return;}
  if(event.key.startsWith('Arrow')){
    event.preventDefault();transition=null;setRotation(false);
    const sphere=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if(event.key==='ArrowLeft')sphere.theta-=.09;if(event.key==='ArrowRight')sphere.theta+=.09;
    if(event.key==='ArrowUp')sphere.phi-=.07;if(event.key==='ArrowDown')sphere.phi+=.07;
    sphere.phi=THREE.MathUtils.clamp(sphere.phi,controls.minPolarAngle,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere));controls.update();
  }
});
function resize(){const width=$('app').clientWidth,height=$('app').clientHeight;camera.aspect=width/height;camera.fov=width<700?54:36;camera.updateProjectionMatrix();renderer.setSize(width,height);}
window.addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const delta=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  if(transition){const raw=transition.duration===0?1:Math.min(1,(performance.now()-transition.start)/transition.duration);const ease=raw*raw*(3-2*raw);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.target,ease);if(raw===1)transition=null;}
  if(!reducedMotion){waterUniforms.time.value=t;boat.position.y=.19+Math.sin(t*1.3)*.035;boat.rotation.z=Math.sin(t)*.025;buoy.position.y=.15+Math.sin(t*1.3+1)*.04;
    clouds.forEach(({group,x},i)=>group.position.x=x+Math.sin(t*.025+i)*1.2);
    birds.forEach((bird,i)=>{const a=t*.09+i*1.05;bird.position.set(Math.cos(a)*(7+i*.3),6+Math.sin(t*.3+i)*.25,Math.sin(a)*5);bird.rotation.y=-a;bird.rotation.z=Math.sin(t*2+i)*.08;});
  }
  controls.update(delta);
  // Keep panning within the small world's useful bounds.
  const bounded=controls.target.clone();bounded.x=THREE.MathUtils.clamp(bounded.x,-12,12);bounded.y=THREE.MathUtils.clamp(bounded.y,0,8);bounded.z=THREE.MathUtils.clamp(bounded.z,-12,12);
  camera.position.add(bounded.clone().sub(controls.target));controls.target.copy(bounded);
  $('compass-needle').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;
  renderer.render(scene,camera);
}
animate();
document.body.classList.add('loaded');
$('loading').setAttribute('aria-hidden','true');
renderer.domElement.addEventListener('webglcontextlost',(event)=>{event.preventDefault();document.body.classList.remove('loaded');$('loading').removeAttribute('aria-hidden');$('loading').lastElementChild.textContent='The view was interrupted. Reload to return to your island.';});

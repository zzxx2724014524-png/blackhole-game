// 海底模式：发光漩涡在海床上吞噬海洋生物；鱼群会逃跑，水母/大型生物会伤害你；氧气需要靠气泡补充
import * as THREE from 'three';
import { GB, makeMaterial } from './models.js?v=3';

const PI = Math.PI, W = 110; // 海床半宽
let MAT = null, MODELS = null;
const T1 = { tint: 1 }, WHITE = 0xffffff;

function eyes(g, x, y, z, r = 0.07) { for (const s of [-1, 1]) { g.sph(r * 1.5, WHITE, s * x, y, z, 6, 4); g.sph(r, 0x212529, s * (x + r * 0.6), y, z + r * 0.5, 6, 4); } }
function fishModel() { const g = new GB(); g.sph(0.5, WHITE, 0, 0, 0, 8, 6, 1, T1); g.parts[g.parts.length - 1].scale(0.55, 0.75, 1.0); g.add(new THREE.ConeGeometry(0.32, 0.5, 4), WHITE, 0, 0, -0.62, -PI / 2, 0, 0, 0.3, 1, 1, T1); g.add(new THREE.ConeGeometry(0.15, 0.35, 4), WHITE, 0, 0.36, -0.05, 0, 0, 0, 0.3, 1, 1, T1); eyes(g, 0.2, 0.08, 0.3, 0.06); return g; }
function tropModel() { const g = new GB(); g.sph(0.5, WHITE, 0, 0, 0, 8, 6, 1, T1); g.parts[g.parts.length - 1].scale(0.4, 1.1, 0.9); for (const z of [0.15, -0.2]) g.box(0.42, 0.9, 0.1, WHITE, 0, -0.45, z); g.add(new THREE.ConeGeometry(0.35, 0.45, 4), WHITE, 0, 0, -0.6, -PI / 2, 0, 0, 0.25, 1, 1, T1); eyes(g, 0.17, 0.1, 0.28, 0.06); return g; }
function crabModel() { const g = new GB(); g.sph(0.55, WHITE, 0, 0.3, 0, 8, 6, 1, T1); g.parts[g.parts.length - 1].scale(1.2, 0.55, 0.9); for (const s of [-1, 1]) { g.sph(0.22, WHITE, s * 0.75, 0.35, 0.45, 6, 4, 1, T1); for (let i = 0; i < 3; i++) g.add(new THREE.BoxGeometry(0.5, 0.07, 0.07), WHITE, s * 0.75, 0.18, -0.25 + i * 0.22, 0, 0, s * -0.5, 1, 1, 1, T1); g.cyl(0.03, 0.03, 0.3, 0x495057, s * 0.15, 0.5, 0.35, 4); g.sph(0.08, 0x212529, s * 0.15, 0.82, 0.35, 6, 4); } return g; }
function turtleModel() { const g = new GB(); g.sph(1.0, WHITE, 0, 0, 0, 10, 6, 1, T1); g.parts[g.parts.length - 1].scale(1, 0.45, 1.2); g.sph(0.95, 0xfff3bf, 0, -0.08, 0, 10, 4); g.parts[g.parts.length - 1].scale(1.02, 0.25, 1.22); g.sph(0.35, 0x8ce99a, 0, 0.05, 1.35, 8, 6); for (const s of [-1, 1]) { g.add(new THREE.BoxGeometry(0.9, 0.1, 0.4), 0x8ce99a, s * 1.0, -0.05, 0.6, 0, s * 0.5, 0); g.add(new THREE.BoxGeometry(0.5, 0.1, 0.3), 0x8ce99a, s * 0.75, -0.05, -0.85, 0, -s * 0.4, 0); } eyes(g, 0.15, 0.15, 1.6, 0.06); return g; }
function octoModel() { const g = new GB(); g.sph(0.7, WHITE, 0, 1.0, 0, 10, 8, 1.25, T1); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; g.add(new THREE.CylinderGeometry(0.07, 0.18, 1.1, 5), WHITE, Math.sin(a) * 0.55, 0.25, Math.cos(a) * 0.55, Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6, 1, 1, 1, T1); } eyes(g, 0.25, 1.05, 0.55, 0.1); return g; }
function jellyModel() { const g = new GB(); g.add(new THREE.SphereGeometry(0.8, 10, 6, 0, PI * 2, 0, PI / 2), WHITE, 0, 0.9, 0, 0, 0, 0, 1, 0.8, 1, T1); g.cyl(0.78, 0.7, 0.12, WHITE, 0, 0.82, 0, 10, T1); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; g.cyl(0.03, 0.05, 1.4, WHITE, Math.sin(a) * 0.45, -0.55, Math.cos(a) * 0.45, 4, T1); } return g; }
function sharkModel() { const g = new GB(); g.sph(1, 0x748ffc, 0, 0, 0, 10, 8); g.parts[g.parts.length - 1].scale(0.9, 0.8, 3.0); g.sph(0.95, 0xf1f3f5, 0, -0.25, 0.2, 10, 6); g.parts[g.parts.length - 1].scale(0.75, 0.5, 2.6); g.add(new THREE.ConeGeometry(0.6, 1.4, 4), 0x748ffc, 0, 1.1, -0.2, -0.3, 0, 0, 0.3, 1, 1); g.add(new THREE.ConeGeometry(0.8, 1.6, 4), 0x748ffc, 0, 0.5, -3.3, -0.9, 0, 0, 0.25, 1, 1); g.add(new THREE.ConeGeometry(0.6, 1.2, 4), 0x748ffc, 0, -0.5, -3.1, -2.3, 0, 0, 0.25, 1, 1); for (const s of [-1, 1]) g.add(new THREE.ConeGeometry(0.4, 1.3, 4), 0x748ffc, s * 0.9, -0.4, 0.6, 0, 0, s * 1.9, 0.3, 1, 1); eyes(g, 0.55, 0.25, 1.9, 0.1); g.box(0.8, 0.06, 0.1, 0xffffff, 0, -0.25, 2.55); return g; }
function whaleModel() { const g = new GB(); g.sph(1, 0x4c6ef5, 0, 0, 0, 12, 8); g.parts[g.parts.length - 1].scale(2.4, 1.9, 5.2); g.sph(1, 0xdbe4ff, 0, -0.7, 0.8, 12, 6); g.parts[g.parts.length - 1].scale(2.0, 1.2, 4.2); g.add(new THREE.BoxGeometry(4.5, 0.25, 1.6), 0x4c6ef5, 0, 0.2, -6.0, 0, 0, 0); for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(2.4, 0.2, 1.0), 0x4c6ef5, s * 2.6, -0.8, 1.5, 0, s * 0.4, s * -0.4); eyes(g, 1.9, 0.0, 3.0, 0.2); return g; }
function bubbleModel() { const g = new GB(); g.sph(0.45, 0xc5f6fa, 0, 0, 0, 8, 6); g.sph(0.12, 0xffffff, 0.15, 0.2, 0.3, 4, 3); return g; }
function clamModel() { const g = new GB(); g.add(new THREE.SphereGeometry(0.6, 8, 4, 0, PI * 2, 0, PI / 2), 0xffc9de, 0, 0.0, 0, 0, 0, 0, 1, 0.5, 1); g.add(new THREE.SphereGeometry(0.6, 8, 4, 0, PI * 2, 0, PI / 2), 0xffdeeb, 0, 0.1, -0.15, -1.0, 0, 0, 1, 0.5, 1); g.sph(0.22, 0xfdfdff, 0, 0.32, 0.1, 8, 6); return g; }
function chestModel() { const g = new GB(); g.rbox(1.8, 1.0, 1.2, 0.1, 0x9c6644, 0, 0, 0); g.add(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8, 1, false, 0, PI), 0x9c6644, 0, 1.0, -0.1, 0, 0, PI / 2, 1, 1, 1); g.box(1.85, 0.12, 1.25, 0xffd43b, 0, 0.45, 0); g.box(0.2, 0.3, 0.1, 0xffd43b, 0, 0.75, 0.62); for (let i = 0; i < 5; i++) g.cyl(0.15, 0.15, 0.05, 0xffd43b, -0.6 + i * 0.3, 1.0 + (i % 2) * 0.05, 0.3, 8); return g; }
function wreckModel() { const g = new GB(); g.add(new THREE.BoxGeometry(4, 2.4, 14), 0x8d6e63, 0, 1.0, 0, 0, 0, 0.35); g.add(new THREE.ConeGeometry(2.1, 4, 4), 0x8d6e63, 0, 1.0, 8.5, PI / 2, PI / 4, 0.35, 1, 1, 1); g.add(new THREE.BoxGeometry(3.4, 0.2, 12), 0xbc8a5f, 0.4, 2.1, 0, 0, 0, 0.35); g.add(new THREE.CylinderGeometry(0.2, 0.25, 7, 6), 0x6d4c41, 1.4, 5, -1, 0, 0, 0.5); g.add(new THREE.BoxGeometry(3, 2.2, 0.1), 0xe9ecef, 2.3, 6, -1, 0, 0.2, 0.5); for (let i = 0; i < 3; i++) g.cylC(0.3, 0.3, 0.1, 0x212529, 2.0, 1.4, -4 + i * 3, 0, 0, PI / 2 + 0.35, 8); return g; }
function seaweedModel() { const g = new GB(); for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.35; for (let k = 0; k < 4; k++) g.add(new THREE.BoxGeometry(0.18, 0.9, 0.06), WHITE, x + Math.sin(k * 1.3 + i) * 0.15, 0.45 + k * 0.85, 0, 0, i, Math.sin(k + i) * 0.25, 1, 1, 1, T1); } return g; }
function coralModel() { const g = new GB(); g.cyl(0.25, 0.35, 0.8, WHITE, 0, 0, 0, 6, T1); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; g.add(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 5), WHITE, Math.sin(a) * 0.35, 1.2, Math.cos(a) * 0.35, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5, 1, 1, 1, T1); g.sph(0.16, WHITE, Math.sin(a) * 0.65, 1.8, Math.cos(a) * 0.65, 6, 4, 1, T1); } return g; }
function rockModel() { const g = new GB(); g.ico(1, WHITE, 0, 0.5, 0, 1.4, 0.8, 1.1, T1); g.ico(0.6, WHITE, 0.9, 0.3, 0.4, 1, 0.8, 1, T1); return g; }
function starModel() { const g = new GB(); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; g.add(new THREE.ConeGeometry(0.15, 0.6, 4), WHITE, 0, 0.08, 0.28, PI / 2, 0, 0, 1, 1, 0.4, T1); g.parts[g.parts.length - 1].rotateY(a); } g.sph(0.18, WHITE, 0, 0.08, 0, 6, 4, 0.5, T1); return g; }

const SPEC = [
  // key, model, fr, value, count, y, speed, kind
  { key: 'fish', m: fishModel, fr: 0.45, value: 1, n: 240, y: [1, 4], speed: 5, kind: 'school', pal: [0x74c0fc, 0x99e9f2, 0xffd43b, 0xb197fc, 0xffa8a8] },
  { key: 'trop', m: tropModel, fr: 0.55, value: 2, n: 60, y: [1, 3.5], speed: 4.5, kind: 'flee', pal: [0xff922b, 0xffd43b, 0xff8cc6, 0x63e6be] },
  { key: 'crab', m: crabModel, fr: 0.75, value: 3, n: 40, y: [0, 0], speed: 2.4, kind: 'crab', pal: [0xff6b6b, 0xff922b] },
  { key: 'star', m: starModel, fr: 0.5, value: 2, n: 60, y: [0, 0], speed: 0, kind: 'static', pal: [0xff8787, 0xffa94d, 0xfcc2d7, 0xb197fc] },
  { key: 'octo', m: octoModel, fr: 1.4, value: 10, n: 14, y: [0.5, 2], speed: 3, kind: 'flee', pal: [0xf783ac, 0xb197fc, 0xff8787] },
  { key: 'turtle', m: turtleModel, fr: 1.7, value: 14, n: 14, y: [1.5, 4], speed: 2.2, kind: 'cruise', pal: [0x51cf66, 0x40c057, 0x94d82d] },
  { key: 'jelly', m: jellyModel, fr: 0.9, value: 8, n: 26, y: [1.5, 5], speed: 0.8, kind: 'jelly', hazard: true, eatAt: 3.6, pal: [0xf783ac, 0xb197fc, 0x99e9f2] },
  { key: 'shark', m: sharkModel, fr: 3.4, value: 45, n: 7, y: [2.5, 5], speed: 5.5, kind: 'shark', pal: [0xffffff] },
  { key: 'whale', m: whaleModel, fr: 6.8, value: 160, n: 3, y: [5, 8], speed: 2.5, kind: 'cruise', pal: [0xffffff] },
  { key: 'chest', m: chestModel, fr: 1.3, value: 12, n: 10, y: [0, 0], speed: 0, kind: 'static', bonus: 500, pal: [0xffffff] },
  { key: 'wreck', m: wreckModel, fr: 7.5, value: 220, n: 3, y: [0, 0], speed: 0, kind: 'static', bonus: 2000, pal: [0xffffff] },
  { key: 'clam', m: clamModel, fr: 0.6, value: 2, n: 24, y: [0, 0], speed: 0, kind: 'pearl', pal: [0xffffff] },
  { key: 'bubble', m: bubbleModel, fr: 0.45, value: 0, n: 70, y: [0, 0], speed: 0, kind: 'bubble', pal: [0xffffff] },
];
const DECOR = [{ m: seaweedModel, n: 140, pal: [0x40c057, 0x2f9e44, 0x69db7c, 0x37b24d], s: [0.8, 1.8] }, { m: coralModel, n: 90, pal: [0xff8787, 0xffa94d, 0xf783ac, 0xb197fc, 0x66d9e8], s: [0.8, 1.6] }, { m: rockModel, n: 50, pal: [0x868e96, 0xadb5bd, 0x748089], s: [0.8, 2.5] }];

const massFor = (L) => 8 * (Math.pow(1.57, L - 1) - 1);
const radiusFor = (L) => 0.9 * Math.pow(1.2, L - 1);

function inst(geo, n) {
  const g = geo.clone(); g.setAttribute('iFade', new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1));
  const m = new THREE.InstancedMesh(g, MAT, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; return m;
}

export class SeaWorld {
  constructor(ctx) {
    this.c = ctx; const { scene } = ctx; this.scene = scene;
    if (!MAT) { MAT = makeMaterial(); MODELS = { spec: SPEC.map(s => s.m().build()), decor: DECOR.map(d => d.m().build()) }; }
    this.group = new THREE.Group(); scene.add(this.group);
    // 环境
    this.prevBg = scene.background;
    const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0b4f8a'); gr.addColorStop(0.5, '#1c7fb8'); gr.addColorStop(1, '#3fb0d6'); x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
    this.bg = new THREE.CanvasTexture(cv); this.bg.colorSpace = THREE.SRGBColorSpace; scene.background = this.bg;
    scene.fog.color.setHex(0x1f86b5);
    ctx.hemi.color.setHex(0xb5f2ff); ctx.hemi.groundColor.setHex(0x2a6f8f); ctx.hemi.intensity = 1.7; ctx.sun.color.setHex(0xd7fbff); ctx.sun.intensity = 1.5;
    // 海床 + 焦散
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, fogColor: { value: new THREE.Color(0x1f86b5) }, fogNear: { value: 50 }, fogFar: { value: 200 } },
      vertexShader: `varying vec2 vw; varying float vd; void main(){ vec4 w = modelMatrix*vec4(position,1.); vw = w.xz; vec4 mv = viewMatrix*w; vd = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float t; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec2 vw; varying float vd;
        float h(vec2 p){ return fract(sin(dot(floor(p), vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 p = vw;
          float n = h(p*0.15)*0.5 + h(p*0.05)*0.5;
          vec3 sand = mix(vec3(0.93,0.86,0.66), vec3(0.85,0.77,0.58), n);
          float c1 = sin(p.x*0.42 + sin(p.y*0.31 + t*0.9)*1.7 + t*0.7);
          float c2 = sin(p.y*0.37 + sin(p.x*0.27 - t*0.8)*1.5 - t*0.6);
          float ca = pow(1.0 - abs(c1*c2), 6.0);
          vec3 col = sand*vec3(0.06,0.22,0.36) + ca*vec3(0.14,0.32,0.34);
          float edge = smoothstep(${W - 6}.0, ${W + 4}.0, max(abs(p.x), abs(p.y)));
          col = mix(col, vec3(0.02,0.1,0.2), edge);
          float f = smoothstep(fogNear, fogFar, vd);
          gl_FragColor = vec4(mix(col, fogColor, f), 1.);
          #include <colorspace_fragment>
        }`
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 + 120, W * 2 + 120).rotateX(-PI / 2), this.floorMat); floor.renderOrder = -5; this.group.add(floor);
    // 光束
    const rc = document.createElement('canvas'); rc.width = 8; rc.height = 128; const rx = rc.getContext('2d'); const rg = rx.createLinearGradient(0, 0, 0, 128); rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); rx.fillStyle = rg; rx.fillRect(0, 0, 8, 128);
    const rayMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0.5 });
    this.rays = [];
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(3 + Math.random() * 4, 60), rayMat); r.rotation.z = -0.35; r.userData = { ox: (i - 3) * 14 + Math.random() * 6, oz: -10 - Math.random() * 30, ph: Math.random() * 6 }; r.renderOrder = 10; this.group.add(r); this.rays.push(r); }
    // 漩涡（玩家）
    this.v = { x: 0, z: 0, vx: 0, vz: 0, r: radiusFor(1), rT: radiusFor(1), level: 1, mass: 0, score: 0, inv: 0, color: new THREE.Color(ctx.playerColor) };
    this.vMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { t: { value: 0 }, col: { value: this.v.color } },
      vertexShader: `varying vec2 p; void main(){ p = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float t; uniform vec3 col; varying vec2 p; void main(){
        float d = length(p); float a = atan(p.y, p.x);
        float sp = sin(a*3. + d*14. - t*7.)*0.5+0.5;
        float core = smoothstep(0.75, 0.0, d);
        float rim = smoothstep(0.8, 1.0, d) * smoothstep(1.12, 1.0, d);
        vec3 c = mix(col*1.4 + 0.25, vec3(0.0,0.03,0.08), core) + sp*(col*0.9+0.2)*(1.0-core*0.8);
        c += rim*vec3(1.0)*0.8;
        float al = smoothstep(1.12, 0.98, d) * (0.75 + 0.25*sp);
        gl_FragColor = vec4(c, al); }`
    });
    this.vortex = new THREE.Mesh(new THREE.CircleGeometry(1.12, 48).rotateX(-PI / 2), this.vMat); this.vortex.position.y = 0.06; this.vortex.renderOrder = 3; this.group.add(this.vortex);
    // 实体
    this.meshes = []; this.ents = [];
    SPEC.forEach((s, si) => { const m = inst(MODELS.spec[si], s.n); this.meshes.push(m); this.group.add(m); for (let i = 0; i < s.n; i++) this.ents.push(this.spawn({ s, si, i }, true)); });
    // 鱼群
    this.schools = []; for (let i = 0; i < 18; i++) this.schools.push({ x: (Math.random() * 2 - 1) * (W - 10), z: (Math.random() * 2 - 1) * (W - 10), vx: 0, vz: 0, h: Math.random() * 6, y: 1.5 + Math.random() * 2.5 });
    this.ents.filter(e => e.s.kind === 'school').forEach((e, k) => { e.school = this.schools[k % this.schools.length]; e.ox = (Math.random() - 0.5) * 5; e.oz = (Math.random() - 0.5) * 5; e.oy = (Math.random() - 0.5) * 1.5; e.x = e.school.x + e.ox; e.z = e.school.z + e.oz; });
    // 装饰（静态，只写一次）
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), c = new THREE.Color();
    this.decor = []; this.decCam = [1e9, 1e9, 0];
    DECOR.forEach((d, di) => { const m = inst(MODELS.decor[di], d.n); m.userData = { all: new Float32Array(d.n * 16), allC: new Float32Array(d.n * 3), pos: new Float32Array(d.n * 2), rad: new Float32Array(d.n) }; for (let i = 0; i < d.n; i++) { const sc = d.s[0] + Math.random() * (d.s[1] - d.s[0]); let x = (Math.random() * 2 - 1) * (W + 8), z = (Math.random() * 2 - 1) * (W + 8); if (di < 2 && Math.random() < 0.5) { const a = Math.random() * 6.28, rr = 6 + Math.random() * 12, cx = Math.sin(i * 7.1) * 70, cz = Math.cos(i * 3.3) * 70; x = cx + Math.cos(a) * rr; z = cz + Math.sin(a) * rr; } _m.compose(_p.set(x, 0, z), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28), _s.set(sc, sc * (0.8 + Math.random() * 0.5), sc)); _m.toArray(m.userData.all, i * 16); c.setHex(d.pal[(Math.random() * d.pal.length) | 0]); c.toArray(m.userData.allC, i * 3); m.userData.pos[i * 2] = x; m.userData.pos[i * 2 + 1] = z; m.userData.rad[i] = sc * 2.5; } this.group.add(m); this.decor.push(m); });
    // 气泡喷口
    this.vents = []; for (let i = 0; i < 12; i++) this.vents.push({ x: (Math.random() * 2 - 1) * (W - 15), z: (Math.random() * 2 - 1) * (W - 15), t: Math.random() * 2 });
    this.o2 = 100; this.time = 0; this.timeLeft = 999; this.pearls = 0; this.eatScore = 0; this.maxLevel = 1; this.flashT = 0; this.ended = false; this.eatenCount = 0;
    this.camX = 0; this.camZ = 0; this.camD = 30; this.t = 0;
    this._mat = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(); this._c = new THREE.Color();
    ctx.sfx.seaMode = true; ctx.sfx.startAmbience();
    this.flashEl = document.getElementById('flash');
  }
  spawn(e, initial) {
    const s = e.s; let x, z;
    for (let k = 0; k < 8; k++) { x = (Math.random() * 2 - 1) * (W - 5); z = (Math.random() * 2 - 1) * (W - 5); const px = this.v ? this.v.x : 0, pz = this.v ? this.v.z : 0, dd = Math.hypot(x - px, z - pz); const danger = s.hazard || s.kind === 'shark' || s.key === 'whale'; if (initial ? dd > (danger ? 35 : 8) : dd > 45) break; }
    Object.assign(e, { x, z, y: s.y[0] + Math.random() * (s.y[1] - s.y[0]), h: Math.random() * 6.28, sp: s.speed * (0.8 + Math.random() * 0.4), state: 0, alive: true, sc: 1, suck: 0, rt: 0, ph: Math.random() * 6, col: s.pal[(Math.random() * s.pal.length) | 0], wander: Math.random() * 3 });
    if (s.kind === 'bubble') { e.alive = false; e.state = 3; }
    if (s.key === 'whale' || s.key === 'shark') e.sc = 0.9 + Math.random() * 0.25;
    return e;
  }
  emitBubble(x, z) { const e = this.ents.find(b => b.s.kind === 'bubble' && !b.alive); if (!e) return; Object.assign(e, { x: x + (Math.random() - 0.5), z: z + (Math.random() - 0.5), y: 0.3, alive: true, state: 0, sc: 0.6 + Math.random() * 0.7, ph: Math.random() * 6, life: 9 }); }
  addMass(m) { const v = this.v; v.mass = Math.max(0, v.mass + m); let L = 1; while (L < 18 && v.mass >= massFor(L + 1)) L++; if (L > v.level) { this.c.sfx.levelUp(); this.c.vib([15, 30, 15]); this.c.banner(`升级！Lv.${L}`, '#63e6be'); } v.level = L; v.rT = radiusFor(L); this.maxLevel = Math.max(this.maxLevel, L); }
  update(dt, state) {
    this.t += dt; this.floorMat.uniforms.t.value = this.t; this.vMat.uniforms.t.value = this.t;
    const v = this.v, play = state === 'play';
    if (play) {
      this.time += dt;
      this.o2 -= (1.6 + this.time * 0.012) * dt;
      if (this.o2 <= 0 && !this.ended) { this.o2 = 0; this.ended = true; this.c.sfx.stopAmbience(); this.c.end('oxygen'); }
      const dir = this.c.readInput(v.x, v.z);
      const speed = 8.5 + v.r * 1.1, a = 1 - Math.exp(-dt * 16);
      v.vx += (dir[0] * speed - v.vx) * a; v.vz += (dir[1] * speed - v.vz) * a;
    } else { v.vx *= 0.9; v.vz *= 0.9; }
    v.x = Math.max(-W, Math.min(W, v.x + v.vx * dt)); v.z = Math.max(-W, Math.min(W, v.z + v.vz * dt));
    v.r += (v.rT - v.r) * (1 - Math.exp(-dt * 4)); if (v.inv > 0) v.inv -= dt;
    this.vortex.position.x = v.x; this.vortex.position.z = v.z; this.vortex.scale.setScalar(v.r);
    this.vortex.material.opacity = 1; this.vortex.visible = !(v.inv > 0 && Math.sin(this.t * 30) > 0.3);
    // 鱼群中心
    for (const sc of this.schools) {
      const dx = sc.x - v.x, dz = sc.z - v.z, d = Math.hypot(dx, dz) || 1, fear = v.r * 3 + 7;
      sc.h += (Math.random() - 0.5) * dt; let tx = Math.cos(sc.h) * 3.5, tz = Math.sin(sc.h) * 3.5;
      if (d < fear && play) { tx = dx / d * 6; tz = dz / d * 6; }
      if (Math.abs(sc.x) > W - 8) tx = -Math.sign(sc.x) * 5; if (Math.abs(sc.z) > W - 8) tz = -Math.sign(sc.z) * 5;
      sc.vx += (tx - sc.vx) * dt * 2; sc.vz += (tz - sc.vz) * dt * 2; sc.x += sc.vx * dt; sc.z += sc.vz * dt;
    }
    // 喷口
    for (const vt of this.vents) { vt.t -= dt; if (vt.t <= 0) { vt.t = 0.9 + Math.random() * 1.2; this.emitBubble(vt.x, vt.z); } }
    const R = v.r; const cam = this.c.camera, tn = Math.tan(cam.fov * PI / 360); this.vhw = this.camD * 1.25 * tn * cam.aspect + 4; this.vfar = this.camD * 1.1 + 6; this.vnear = this.camD * 0.75;
    const counts = new Array(this.meshes.length).fill(0);
    const M = this._mat, Q = this._q, P = this._p, S = this._s;
    for (const e of this.ents) {
      const s = e.s;
      if (!e.alive) { if (s.kind !== 'bubble') { e.rt -= dt; if (e.rt <= 0) this.spawn(e, false); } continue; }
      e.ph += dt;
      if (e.state === 1) { // 被吸入漩涡
        e.suck += dt; const k = Math.min(1, e.suck / 0.6);
        e.ang = (e.ang || 0) + dt * (6 + k * 10); e.sd *= Math.pow(0.04, dt);
        e.x = v.x + Math.cos(e.ang) * e.sd; e.z = v.z + Math.sin(e.ang) * e.sd; e.y = e.y0 * (1 - k) - k * 0.5; e.sc = e.sc0 * (1 - k * 0.9); e.h += dt * 12;
        if (k >= 1) this.consume(e);
      } else {
        const dx = e.x - v.x, dz = e.z - v.z, d = Math.hypot(dx, dz) || 0.01;
        // 行为
        if (s.kind === 'school') { const sc = e.school; const tx = sc.x + e.ox + Math.sin(e.ph * 1.7) * 0.6, tz = sc.z + e.oz + Math.cos(e.ph * 1.3) * 0.6; const mx = tx - e.x, mz = tz - e.z; e.x += mx * Math.min(1, dt * 3); e.z += mz * Math.min(1, dt * 3); e.y = sc.y + e.oy + Math.sin(e.ph * 2) * 0.2; if (Math.abs(mx) + Math.abs(mz) > 0.05) e.h = Math.atan2(mx, mz); }
        else if (s.kind !== 'static' && s.kind !== 'pearl' && s.kind !== 'bubble') {
          let flee = (s.kind === 'flee' || s.kind === 'crab' || s.kind === 'cruise') && s.fr < R * 0.95 && d < R * 2.5 + 6 && play;
          let chase = s.kind === 'shark' && this.time > 15 && v.level >= 3 && s.fr * e.sc > R * 0.95 && d < 26 && play;
          if (s.kind === 'shark' && !chase && d < R * 2 + 8 && play) flee = true;
          e.wander -= dt; if (e.wander <= 0) { e.wander = 1 + Math.random() * 3; e.th = e.h + (Math.random() - 0.5) * 2; }
          let th = e.th ?? e.h, spd = e.sp;
          if (flee) { th = Math.atan2(dx, dz); spd *= s.key === 'octo' ? 2.0 : 1.3; }
          if (chase) { th = Math.atan2(-dx, -dz); spd *= 1.3; }
          if (Math.abs(e.x) > W - 4 || Math.abs(e.z) > W - 4) th = Math.atan2(-e.x, -e.z);
          let dh = th - e.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); e.h += dh * Math.min(1, dt * (flee || chase ? 6 : 1.5));
          const mvh = s.kind === 'crab' ? e.h + PI / 2 : e.h;
          e.x += Math.sin(mvh) * spd * dt; e.z += Math.cos(mvh) * spd * dt;
          if (s.kind === 'jelly') e.y = s.y[0] + (s.y[1] - s.y[0]) * (0.5 + 0.5 * Math.sin(e.ph * 0.6));
        } else if (s.kind === 'bubble') { e.y += dt * 1.6; e.x += Math.sin(e.ph * 3) * dt * 0.4; e.life -= dt; if (e.life <= 0) { e.alive = false; continue; } }
        // 与漩涡交互
        if (play && d < R + s.fr * e.sc * 0.5) {
          const fr = s.fr * e.sc;
          const edible = s.hazard ? R >= s.eatAt : fr < R * 0.92;
          if (edible && d < R * 0.95) { e.state = 1; e.suck = 0; e.sd = d; e.ang = Math.atan2(dz, dx); e.y0 = e.y; e.sc0 = e.sc; }
          else if (!edible && v.inv <= 0 && (s.hazard || (s.kind !== 'static' && s.kind !== 'bubble')) && d < R + fr * 0.3) this.hurt(e, dx / d, dz / d);
        }
      }
      // 写实例（视野外剔除）
      const cx = e.x - this.camX, cz = e.z - this.camZ, ex = s.fr * e.sc + 2;
      if (cx > this.vhw + ex || cx < -this.vhw - ex || cz < -this.vfar - ex || cz > this.vnear + ex) continue;
      const m = this.meshes[e.si], k = counts[e.si]++;
      let tilt = 0; if (s.kind === 'school' || s.kind === 'flee') tilt = Math.sin(e.ph * 8) * 0.15;
      this._e.set(s.kind === 'jelly' ? Math.sin(e.ph) * 0.1 : 0, e.h + tilt, 0); Q.setFromEuler(this._e);
      const bob = s.kind === 'jelly' ? 1 + Math.sin(e.ph * 3) * 0.08 : 1;
      M.compose(P.set(e.x, e.y, e.z), Q, S.set(e.sc, e.sc * bob, e.sc)); m.setMatrixAt(k, M);
      this._c.setHex(e.col); if (s.hazard) this._c.multiplyScalar(1.35);
      m.setColorAt(k, this._c);
    }
    this.meshes.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    // 装饰剔除（相机移动后重排）
    const dc = this.decCam;
    if (Math.abs(dc[0] - this.camX) + Math.abs(dc[1] - this.camZ) > 3 || Math.abs(dc[2] - this.camD) > 3) {
      dc[0] = this.camX; dc[1] = this.camZ; dc[2] = this.camD;
      const hw = this.vhw + 6, fz = this.vfar + 6, nz = this.vnear + 6;
      for (const m of this.decor) { const u = m.userData, n = u.rad.length, A = m.instanceMatrix.array, C = m.instanceColor.array; let k = 0;
        for (let i = 0; i < n; i++) { const cx = u.pos[i * 2] - this.camX, cz = u.pos[i * 2 + 1] - this.camZ, r = u.rad[i];
          if (cx > hw + r || cx < -hw - r || cz < -fz - r || cz > nz + r) continue;
          for (let j = 0; j < 16; j++) A[k * 16 + j] = u.all[i * 16 + j]; C[k * 3] = u.allC[i * 3]; C[k * 3 + 1] = u.allC[i * 3 + 1]; C[k * 3 + 2] = u.allC[i * 3 + 2]; k++; }
        m.count = k; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    }
    // 光束
    for (const r of this.rays) { const u = r.userData; r.position.set(this.camX + u.ox + Math.sin(this.t * 0.2 + u.ph) * 4, 18, this.camZ + u.oz); r.material.opacity = 0.35 + Math.sin(this.t * 0.5 + u.ph) * 0.15; r.lookAt(this.c.camera.position.x, 18, this.c.camera.position.z); r.rotateZ(-0.35); }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashEl.classList.remove('on'); }
  }
  consume(e) {
    const s = e.s, v = this.v; e.alive = false; e.state = 0;
    e.rt = s.kind === 'pearl' ? 12 : s.key === 'whale' ? 25 : s.key === 'wreck' || s.key === 'chest' ? 999 : 4 + Math.random() * 6;
    if (s.kind === 'bubble') { this.o2 = Math.min(100, this.o2 + 12); this.c.sfx.bubble(); this.c.popup('氧气+12'); return; }
    this.eatenCount++;
    const esc = e.sc0 || 1; e.sc = esc;
    this.addMass(s.value * esc * esc);
    let pts = Math.round(s.value * 10 * esc * esc);
    if (s.kind === 'pearl') { this.pearls++; pts += 300; this.c.sfx.pearl(); this.c.vib(20); }
    if (s.bonus) { pts += s.bonus; this.c.sfx.pearl(); this.c.banner(s.key === 'wreck' ? '吞下沉船！+' + s.bonus : '宝箱！+' + s.bonus, '#ffd43b'); }
    this.eatScore += pts; v.score = this.eatScore;
    this.c.popup(pts, s.kind === 'pearl' || !!s.bonus);
    this.c.sfx.slurp(s.fr * esc * 1.2);
    if (s.fr > 2) this.c.vib(25);
  }
  hurt(e, nx, nz) {
    const v = this.v; v.inv = 1.3;
    v.vx += nx * -14; v.vz += nz * -14;
    const loss = Math.max(2, v.mass * 0.18); this.addMass(-loss); this.eatScore = Math.max(0, this.eatScore - 100); this.o2 = Math.max(0, this.o2 - (e.s.hazard ? 8 : 4));
    this.c.sfx.sting(); this.c.vib([60, 30, 60]); this.flashEl.classList.add('on'); this.flashT = 0.25; this.shake = 0.5;
    this.c.banner(e.s.hazard ? '被水母蜇了！' : `被${e.s.key === 'shark' ? '鲨鱼' : '大鱼'}撞了！`, '#ff6b6b');
  }
  camera(dt, state) {
    const cam = this.c.camera, v = this.v, tan = Math.tan(cam.fov * PI / 360), r = Math.max(v.rT, 1);
    const want = state === 'menu' ? 80 : Math.max((7 + r * 3.3) / tan, (7 + r * 2.5) / (tan * cam.aspect));
    const a = 1 - Math.exp(-dt * 10); this.camX += (v.x - this.camX) * a; this.camZ += (v.z - this.camZ) * a; this.camD += (want - this.camD) * (1 - Math.exp(-dt * 2.2));
    let sx = 0; if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * this.shake * 2; }
    const P = 58 * PI / 180; cam.position.set(this.camX + sx, Math.sin(P) * this.camD, this.camZ + Math.cos(P) * this.camD); cam.lookAt(this.camX + sx, 0, this.camZ); cam.updateMatrixWorld();
    this.scene.fog.near = this.camD * 0.9; this.scene.fog.far = this.camD * 3.2 + 40;
    this.floorMat.uniforms.fogNear.value = this.scene.fog.near; this.floorMat.uniforms.fogFar.value = this.scene.fog.far;
  }
  get focus() { return this.v; }
  hud() {
    const set = (id, v) => { const el = document.getElementById(id); if (el._v !== v) { el._v = v; el.textContent = v; } };
    set('seaTime', `${Math.floor(this.time / 60)}:${String(Math.floor(this.time % 60)).padStart(2, '0')}`);
    set('seaLvl', 'Lv.' + this.v.level); set('seaPearl', '🦪 ' + this.pearls); set('seaScore', this.eatScore + Math.floor(this.time) * 10);
    const o2 = Math.max(0, this.o2); const bar = document.getElementById('o2Bar'); const w = o2.toFixed(0) + '%'; if (bar._w !== w) { bar._w = w; bar.style.width = w; bar.classList.toggle('low', o2 < 25); }
    const p = Math.min(1, (this.v.mass - massFor(this.v.level)) / (massFor(this.v.level + 1) - massFor(this.v.level))); document.getElementById('seaProg').style.width = (p * 100).toFixed(0) + '%';
  }
  result() {
    const timeS = Math.floor(this.time), score = this.eatScore + timeS * 10;
    return { score, time: timeS, level: this.maxLevel, pearls: this.pearls, lines: [['吞噬得分', this.eatScore], ['存活奖励', timeS * 10], ['吞下生物', this.eatenCount + ' 只'], ['珍珠', this.pearls + ' 颗'], ['总分', score]] };
  }
  dispose() {
    this.c.sfx.stopAmbience(); this.c.sfx.seaMode = false;
    this.scene.remove(this.group);
    this.group.traverse(o => { if (o.isInstancedMesh) { o.geometry.dispose(); o.dispose(); } });
    this.scene.background = this.prevBg; this.flashEl.classList.remove('on');
  }
}

// 黑洞入侵 · 网页版 v2 —— 主逻辑（城市模式 + 海底模式入口）
import * as THREE from 'three';
import { buildTypes, makeMaterial } from './models.js?v=3';
import { generateCity, buildGround, BOUND, HALF, roadCenters } from './city.js?v=3';
import { levelDef, LEVEL_COUNT, THEMES } from './levels.js?v=3';
import { Sfx } from './audio.js?v=3';
import { SeaWorld } from './sea.js?v=3';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const sfx = new Sfx();
const UP = new THREE.Vector3(0, 1, 0);
const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

// ---------------- 渲染器（无实时阴影，自适应分辨率）----------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (devicePixelRatio || 1) < 2, powerPreference: 'high-performance', stencil: true });
const maxPR = Math.min(devicePixelRatio || 1, 1.5);
let pr = maxPR; renderer.setPixelRatio(pr);
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();
function gradientTex(top, mid, bot) {
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, bot);
  x.fillStyle = g; x.fillRect(0, 0, 2, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SKY_TEX = gradientTex('#6ec6ff', '#bde7ff', '#e6f7ff');
const SKY_FOG = 0xd8f1ff;
scene.background = SKY_TEX;
scene.fog = new THREE.Fog(SKY_FOG, 200, 520);
const camera = new THREE.PerspectiveCamera(50, 1, 1, 1600);
const hemi = new THREE.HemisphereLight(0xffffff, 0xb8d4a0, 1.55);
const sun = new THREE.DirectionalLight(0xfff1dc, 1.9);
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.38).normalize();
sun.position.copy(SUN_DIR).multiplyScalar(100);
scene.add(hemi, sun);

const TYPES = buildTypes();
const MAT = makeMaterial();
const SEG_H = 2.6;

// 地面
const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
Object.assign(groundMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
let groundMesh = null;

// 假阴影（贴地柔和斑块）
function blobTex(square) {
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  if (square) { x.filter = 'blur(6px)'; x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(10, 10, 44, 44); }
  else { const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  return new THREE.CanvasTexture(cv);
}
function blobMesh(square, cap) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(square), transparent: true, opacity: square ? 0.22 : 0.28, depthWrite: false, color: 0x2b3a55 }), cap);
  Object.assign(m.material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc });
  m.renderOrder = -4; m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m;
}
let blobRd = null, blobSq = null;

// ---------------- 黑洞视觉 ----------------
const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
const maskGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const pitGeo = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 48, 4, true).translate(0, -0.5, 0);
  const P = g.attributes.position, col = new Float32Array(P.count * 3), top = new THREE.Color(0x3b3170), bot = new THREE.Color(0x000000), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const t = Math.pow(-P.getY(i), 0.4); c.copy(top).lerp(bot, t); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
})();
const pitMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
const bottomGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).translate(0, -1, 0);
const bottomMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
const rimGeo = new THREE.RingGeometry(1, 1.06, 56).rotateX(-Math.PI / 2);
const ringGeo = new THREE.RingGeometry(1.1, 1.2, 64).rotateX(-Math.PI / 2);
const ringMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { prog: { value: 0 }, col: { value: new THREE.Color(0xffd43b) } },
  vertexShader: `varying vec2 p; void main(){ p = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float prog; uniform vec3 col; varying vec2 p; void main(){ float a = atan(p.x, -p.y)/6.2831853 + 0.5; float on = step(a, prog); gl_FragColor = vec4(mix(vec3(1.), col, on), mix(0.3, 0.95, on)); }`
});

// ---------------- 状态 ----------------
let city = null, objs = [], movers = [], falling = [], disturbed = new Set(), stacks = [];
let typeMesh = [];          // 每类型一个 InstancedMesh（每帧按可见性压缩）
let objMat = new Float32Array(16);
let lanes = [];
let holes = [], player = null;
let state = 'menu', mode = 'level', timeLeft = 120, gameTime = 0, totalValue = 1, eatenValue = 0;
let playerColor = 0x7b5cff, playerName = '鸭鸭';
let combo = 0, comboT = 0, comboBest = 0, rushT = 0, rushDone = false;
let sea = null;
let curLevel = 1, lv = null, lvFitK = 1, coins = [], lvCleared = false;
const COLORS = [0x7b5cff, 0xff4d6d, 0x2ec4b6, 0xffb703, 0x3a86ff, 0x8ac926, 0xff7a1a, 0xf15bb5];
const AI_NAMES = ['小橘子', '夜行猫', '吞天大王', '西瓜太郎', '闪电侠', '饭团子', '螺蛳粉', '芝士喵', '黑旋风', '奶茶续命', '摸鱼达人', '虚空领主', '小笼包', '咕噜咕噜'];
const GOLD = new THREE.Color(1.7, 1.25, 0.25);
const massFor = (L) => 8 * (Math.pow(1.6, L - 1) - 1);
const MAX_LEVEL = 16;
const radiusFor = (L) => Math.pow(1.225, L - 1);

// ---------------- 空间网格 ----------------
const GS = 10, GOFF = 154 + 30, GN = Math.ceil((GOFF * 2) / GS);
let grid = [];
const cellIdx = (x, z) => { const i = Math.min(GN - 1, Math.max(0, Math.floor((x + GOFF) / GS))), j = Math.min(GN - 1, Math.max(0, Math.floor((z + GOFF) / GS))); return i * GN + j; };
function gridAdd(o) { o.cell = cellIdx(o.x, o.z); grid[o.cell].push(o); }
function gridRemove(o) { if (o.cell < 0) return; const a = grid[o.cell], k = a.indexOf(o); if (k >= 0) { a[k] = a[a.length - 1]; a.pop(); } o.cell = -1; }
function gridMove(o) { const c = cellIdx(o.x, o.z); if (c !== o.cell) { gridRemove(o); o.cell = c; grid[c].push(o); } }
let _qcb = null;
function gridQuery(x, z, r, cb) {
  const i0 = Math.max(0, Math.floor((x - r + GOFF) / GS)), i1 = Math.min(GN - 1, Math.floor((x + r + GOFF) / GS));
  const j0 = Math.max(0, Math.floor((z - r + GOFF) / GS)), j1 = Math.min(GN - 1, Math.floor((z + r + GOFF) / GS));
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = grid[i * GN + j]; for (let k = a.length - 1; k >= 0; k--) cb(a[k]); }
}
const MAXFR = Math.max(...TYPES.list.map(t => t.fr));

// ---------------- 矩阵 ----------------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _mat = new THREE.Matrix4();
function writeMatrix(o) {
  _q.setFromAxisAngle(UP, o.yaw);
  if (o.tilt) { _ax.set(o.ax, 0, o.az); _q2.setFromAxisAngle(_ax, o.tilt); _q.premultiply(_q2); }
  _mat.compose(_p.set(o.x, o.y, o.z), _q, _s.set(o.scale, o.scale, o.scale));
  const e = _mat.elements, b = o.id * 16; for (let i = 0; i < 16; i++) objMat[b + i] = e[i];
}

// ---------------- 城市构建 ----------------
function disposeCity() {
  for (const m of typeMesh) if (m) { scene.remove(m); m.dispose(); }
  typeMesh = [];
  if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); groundMesh = null; }
  for (const b of [blobRd, blobSq]) if (b) { scene.remove(b); b.dispose(); }
  blobRd = blobSq = null;
  clearPickups();
  objs = []; movers = []; falling = []; stacks = []; disturbed.clear();
}
function buildCity(def) {
  disposeCity();
  city = def ? generateCity(TYPES, def.seed, def) : generateCity(TYPES);
  coins = [];
  grid = Array.from({ length: GN * GN }, () => []);
  const counts = new Array(TYPES.list.length).fill(0);
  const mk = (t, x, z, yaw, col, gold) => {
    const o = { t, x, z, y: 0, yaw, tilt: 0, ax: 1, az: 0, tt: 0, ty: 0, state: 0, scale: 1, cell: -1, mover: null, hidden: false, id: objs.length, fade: 1, fadeT: 1, stack: null, gold: !!gold, acc: 0 };
    const c = new THREE.Color(col); if (gold) c.copy(GOLD); o.cr = c.r; o.cg = c.g; o.cb = c.b;
    counts[t.id]++; objs.push(o); return o;
  };
  for (const s of city.objs) { const o = mk(s.t, s.x, s.z, s.yaw, s.col, s.gold); gridAdd(o); if (s.t.cat === 'coin') coins.push(o); }
  lanes = city.lanes;
  for (const lane of lanes) lane.cars = lane.cars.map(c => { const o = mk(c.t, 0, 0, 0, c.col, false); o.mover = { kind: 'car', lane, s: c.s, v: c.v }; movers.push(o); return o; });
  for (const w of city.walkers) { const o = mk(w.t, 0, 0, 0, w.col, Math.random() < 0.03); o.mover = { kind: 'walk', ...w, ph: Math.random() * 6 }; movers.push(o); }
  // 叠叠楼
  for (const st of city.stacks) {
    const S = TYPES.groups.segs[st.k];
    const stack = { k: st.k, x: st.x, z: st.z, segs: [], baseY: 0, vy: 0, fr: S.a.fr, fade: 1, eatenCount: 0 };
    for (let i = 0; i < st.n; i++) {
      const top = i === st.n - 1, t = top ? S.roof : (i % 2 ? S.b : S.a);
      const o = mk(t, st.x, st.z, st.yaw + (i % 3 === 2 ? 0.08 : 0), i % 2 ? st.c2 : st.c1, false);
      o.y = i * SEG_H; o.stack = stack; stack.segs.push(o);
    }
    gridAdd(stack.segs[0]);
    stacks.push(stack);
  }
  objMat = new Float32Array(objs.length * 16);
  for (const t of TYPES.list) {
    const n = counts[t.id]; if (!n) { typeMesh[t.id] = null; continue; }
    const geo = t.geo.clone();
    const fa = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1); fa.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iFade', fa);
    const m = new THREE.InstancedMesh(geo, MAT, n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.fadeAttr = fa;
    scene.add(m); typeMesh[t.id] = m;
  }
  for (const o of objs) { if (o.mover) updateMover(o, 0); writeMatrix(o); }
  groundMesh = new THREE.Mesh(buildGround(city.blockKinds, def ? def.theme : undefined), groundMat); groundMesh.renderOrder = -5; scene.add(groundMesh);
  blobRd = blobMesh(false, objs.length); blobSq = blobMesh(true, objs.length + stacks.length); scene.add(blobRd, blobSq);
  totalValue = objs.reduce((a, o) => a + (o.t.cat === 'coin' ? 0 : o.t.value), 0); eatenValue = 0;
}

// ---------------- 每帧可见性压缩（视锥 + 距离裁剪）----------------
const frustum = new THREE.Frustum(), _pm = new THREE.Matrix4();
let visTris = 0, visCalls = 0;
function compact() {
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_pm);
  const P = frustum.planes;
  const p0 = P[0], p1 = P[1], p2 = P[2], p3 = P[3], p4 = P[4], p5 = P[5];
  for (const m of typeMesh) if (m) m.count = 0;
  let nr = 0, ns = 0; const br = blobRd.instanceMatrix.array, bs = blobSq.instanceMatrix.array;
  const tinyCull = mode === 'level' && state !== 'menu' ? (camD > 220 ? 0.45 : 0) : camD > 120 ? 1.0 : camD > 75 ? 0.45 : 0;
  for (let i = 0, L = objs.length; i < L; i++) {
    const o = objs[i]; if (o.state === 2 || o.hidden) continue;
    const t = o.t; if (t.fr < tinyCull && t.h < 2.5 && o.state === 0) continue;
    const hh = t.h * 0.5, cx = o.x, cy = o.y + hh, cz = o.z, r = (t.fr > hh ? t.fr : hh) + 0.5;
    if (p0.normal.x * cx + p0.normal.y * cy + p0.normal.z * cz + p0.constant < -r || p1.normal.x * cx + p1.normal.y * cy + p1.normal.z * cz + p1.constant < -r ||
      p2.normal.x * cx + p2.normal.y * cy + p2.normal.z * cz + p2.constant < -r || p3.normal.x * cx + p3.normal.y * cy + p3.normal.z * cz + p3.constant < -r ||
      p4.normal.x * cx + p4.normal.y * cy + p4.normal.z * cz + p4.constant < -r || p5.normal.x * cx + p5.normal.y * cy + p5.normal.z * cz + p5.constant < -r) continue;
    const m = typeMesh[t.id], k = m.count++;
    const a = m.instanceMatrix.array, b = o.id * 16, d = k * 16; for (let j = 0; j < 16; j++) a[d + j] = objMat[b + j];
    const c = m.instanceColor.array; c[k * 3] = o.cr; c[k * 3 + 1] = o.cg; c[k * 3 + 2] = o.cb;
    m.fadeAttr.array[k] = o.fade;
    if (o.state === 0 && o.y > -0.2 && t.blob !== 'none') {
      if (t.blob === 'sq') { const s = t.fr * 1.9 + t.h * 0.06, off = t.h * 0.06, q = ns++ * 16; bs[q] = s; bs[q + 1] = 0; bs[q + 2] = 0; bs[q + 3] = 0; bs[q + 4] = 0; bs[q + 5] = 1; bs[q + 6] = 0; bs[q + 7] = 0; bs[q + 8] = 0; bs[q + 9] = 0; bs[q + 10] = s; bs[q + 11] = 0; bs[q + 12] = cx + off; bs[q + 13] = 0.075; bs[q + 14] = cz - off; bs[q + 15] = 1; }
      else { const s = t.fr * 2.1 + 0.3, q = nr++ * 16; br[q] = s; br[q + 1] = 0; br[q + 2] = 0; br[q + 3] = 0; br[q + 4] = 0; br[q + 5] = 1; br[q + 6] = 0; br[q + 7] = 0; br[q + 8] = 0; br[q + 9] = 0; br[q + 10] = s; br[q + 11] = 0; br[q + 12] = cx + 0.15; br[q + 13] = 0.07; br[q + 14] = cz - 0.15; br[q + 15] = 1; }
    }
  }
  for (const st of stacks) if (st.segs.length && st.baseY < 0.5) { const s = st.fr * 2.1 + Math.min(st.segs.length, 30) * 0.12, off = Math.min(st.segs.length * SEG_H, 60) * 0.05, q = ns++ * 16; bs.fill(0, q, q + 16); bs[q] = s; bs[q + 5] = 1; bs[q + 10] = s; bs[q + 12] = st.x + off; bs[q + 13] = 0.075; bs[q + 14] = st.z - off; bs[q + 15] = 1; }
  blobRd.count = nr; blobSq.count = ns; blobRd.instanceMatrix.needsUpdate = true; blobSq.instanceMatrix.needsUpdate = true;
  visTris = 0; visCalls = 2;
  for (const m of typeMesh) if (m && m.count) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.fadeAttr.needsUpdate = true; visTris += m.count * m.geometry.attributes.position.count / 3; visCalls++; }
}

// ---------------- 移动物体 ----------------
let trafficT = 0;
function updateMover(o, dt) {
  const m = o.mover;
  if (m.kind === 'car') {
    const lane = m.lane, dir = lane.dir, half = o.t.fr * 0.95;
    let target = lane.speed;
    const cyc = trafficT % 16, green = cyc < 7.2 ? 'x' : (cyc >= 8 && cyc < 15.2 ? 'z' : '');
    if (green !== lane.axis) for (let i = 0; i < roadCenters.length; i++) { const stop = roadCenters[i] - dir * 6.8, ahead = (stop - (m.s + dir * half)) * dir; if (ahead > 0 && ahead < 3.5) { target = 0; break; } }
    const cars = lane.cars;
    for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (c === o || c.state) continue; let gap = (c.mover.s - m.s) * dir; if (gap < 0) gap += lane.L; if (gap > 0 && gap - half - c.t.fr * 0.95 < 2.2) { target = 0; break; } }
    m.v += (target - m.v) * Math.min(1, dt * (target < m.v ? 6 : 1.5));
    m.s += dir * m.v * dt;
    if (m.s * dir > lane.L / 2) m.s -= dir * lane.L;
    if (lane.axis === 'x') { o.x = m.s; o.z = lane.fixed; o.yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { o.z = m.s; o.x = lane.fixed; o.yaw = dir > 0 ? 0 : Math.PI; }
    o.hidden = Math.abs(m.s) > HALF + 9;
  } else {
    const P = 8 * m.off; m.p = ((m.p + m.dir * m.speed * dt) % P + P) % P; m.ph += dt * m.speed * 6;
    const k = Math.floor(m.p / (2 * m.off)), u = m.p - k * 2 * m.off - m.off;
    let lx, lz, yaw;
    if (k === 0) { lx = u; lz = -m.off; yaw = Math.PI / 2; } else if (k === 1) { lx = m.off; lz = u; yaw = 0; } else if (k === 2) { lx = -u; lz = m.off; yaw = -Math.PI / 2; } else { lx = -m.off; lz = -u; yaw = Math.PI; }
    if (m.dir < 0) yaw += Math.PI;
    o.x = m.cx + lx; o.z = m.cz + lz; o.yaw = yaw; o.y = Math.abs(Math.sin(m.ph)) * 0.1;
  }
}

// ---------------- 黑洞 ----------------
class Hole {
  constructor(name, color, isPlayer, skill = 1) {
    this.name = name; this.color = color; this.isPlayer = isPlayer; this.skill = skill;
    this.x = 0; this.z = 0; this.vx = 0; this.vz = 0; this.level = 1; this.mass = 0; this.score = 0;
    this.r = radiusFor(1); this.rTarget = this.r; this.rMul = 1; this.alive = true; this.dying = 0; this.respawn = 0; this.prot = 0; this.kills = 0; this.out = false;
    this.fx = { magnet: 0, speed: 0, grow: 0 };
    this.ai = { t: 0, tx: 0, tz: 0, mode: '' };
    this.group = new THREE.Group();
    this.mask = new THREE.Mesh(maskGeo, maskMat); this.mask.renderOrder = -10; this.mask.position.y = 0.09;
    this.pit = new THREE.Group(); this.pit.add(new THREE.Mesh(pitGeo, pitMat), new THREE.Mesh(bottomGeo, bottomMat));
    this.rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })); this.rim.position.y = 0.1;
    this.group.add(this.mask, this.pit, this.rim);
    if (isPlayer) { this.ring = new THREE.Mesh(ringGeo, ringMat); this.ring.position.y = 0.11; this.ring.renderOrder = 2; this.group.add(this.ring); }
    scene.add(this.group);
    this.label = document.createElement('div'); this.label.className = 'label' + (isPlayer ? ' me' : '');
    $('labels').appendChild(this.label); this.setLabel(false);
  }
  setLabel(crown) { this.label.innerHTML = (crown ? '<span class="crown">👑</span>' : '') + escapeHtml(this.name); this._crown = crown; }
  dispose() { scene.remove(this.group); this.label.remove(); this.rim.material.dispose(); }
  resetSize() { this.level = 1; this.mass = 0; this.r = 0.2; this.rTarget = radiusFor(1); }
  addMass(v) {
    this.mass += v; let up = false;
    while (this.mass >= massFor(this.level + 1) && this.level < MAX_LEVEL) { this.level++; up = true; }
    if (up) { this.rTarget = radiusFor(this.level); if (this.isPlayer) { sfx.levelUp(); flashLevel(); vib([15, 30, 15]); } }
  }
  progress() { const a = massFor(this.level), b = massFor(this.level + 1); return Math.min(1, (this.mass - a) / (b - a)); }
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function randomSpawn(h) {
  let best = null, bestD = -1;
  for (let k = 0; k < 12; k++) {
    const x = (Math.random() * 2 - 1) * (HALF - 10), z = (Math.random() * 2 - 1) * (HALF - 10);
    let d = 1e9; for (const o of holes) if (o !== h && o.alive) d = Math.min(d, Math.hypot(o.x - x, o.z - z) - o.r * 2);
    if (d > bestD) { bestD = d; best = [x, z]; }
  }
  h.x = best[0]; h.z = best[1]; h.vx = h.vz = 0;
}

// ---------------- 吞噬交互 ----------------
function interact(h, o) {
  const dx = o.x - h.x, dz = o.z - h.z, fr = o.t.fr, reach = h.r + fr;
  const d2 = dx * dx + dz * dz; if (d2 > reach * reach) return;
  if (o.stack && o.y > SEG_H * 0.6) return; // 尚未落地的楼层
  const d = Math.sqrt(d2), R = h.r;
  const nx = d > 1e-3 ? -dx / d : 1, nz = d > 1e-3 ? -dz / d : 0;
  if (fr < R * 0.92) {
    if (d < Math.max(R - fr * 0.4, R * 0.3)) { startFall(o, h); return; }
    if (o.stack) return;
    const k = Math.min(1, Math.max(0, (R + fr * 0.35 - d) / (fr * 0.75 + 0.01)));
    disturb(o, nz, -nx, k * 0.55, -k * fr * 0.18);
  } else if (!o.stack) {
    const over = 1 - d / reach;
    disturb(o, nz, -nx, over * 0.09 * (0.6 + 0.4 * Math.sin(gameTime * 22 + o.id)), 0);
  }
}
function disturb(o, ax, az, tilt, y) { if (tilt > o.tt) { o.tt = tilt; o.ty = y; o.ax = ax; o.az = az; } disturbed.add(o); }
function startFall(o, h) {
  gridRemove(o); disturbed.delete(o);
  if (o.mover && o.mover.kind === 'car') { const c = o.mover.lane.cars, k = c.indexOf(o); if (k >= 0) c.splice(k, 1); }
  o.state = 1; o.hole = h; o.rx = o.x - h.x; o.rz = o.z - h.z; o.rvx = 0; o.rvz = 0; o.vy = 0; o.y = Math.min(o.y, 0);
  o.spin = (Math.random() - 0.5) * 2;
  if (o.stack) {
    const st = o.stack; st.segs.shift(); o.vy = Math.min(0, st.vy) - 2; o.spin *= 0.3;
    if (st.segs.length) { st.baseY = SEG_H * 0.55; gridAdd(st.segs[0]); if (st.vy > -6) st.vy = -6; }
    st.eatenCount++; o.segIdx = st.eatenCount;
  }
  falling.push(o);
}
function updateStacks(dt) {
  for (const st of stacks) {
    if (!st.segs.length || (st.baseY <= 0 && st.vy === 0)) continue;
    st.vy -= 46 * dt; if (st.vy < -34) st.vy = -34;
    st.baseY += st.vy * dt;
    if (st.baseY <= 0) { if (st.vy < -10 && player && Math.hypot(st.x - player.x, st.z - player.z) < 40) sfx.eat(1.5, 0); st.baseY = 0; st.vy = 0; }
    for (let i = 0; i < st.segs.length; i++) { const o = st.segs[i]; o.y = st.baseY + i * SEG_H; o.yaw = o.yaw; writeMatrix(o); }
  }
}
function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const o = falling[i], h = o.hole, fr = o.t.fr;
    o.rvx += (-o.rx * 14 - o.rvx * 5) * dt; o.rvz += (-o.rz * 14 - o.rvz * 5) * dt;
    o.rx += o.rvx * dt; o.rz += o.rvz * dt;
    const dist = Math.hypot(o.rx, o.rz), lim = Math.max(0, h.r - fr * 0.55);
    if (o.y < -0.2 && dist > lim) { const s = lim / dist; o.rx *= s; o.rz *= s; }
    o.x = h.x + o.rx; o.z = h.z + o.rz;
    o.vy -= (22 + h.r * 4) * dt; o.y += o.vy * dt;
    if (dist > 0.05) { const ax = o.rz / dist, az = -o.rx / dist, a = Math.min(1, dt * 6); o.ax += (ax - o.ax) * a; o.az += (az - o.az) * a; const l = Math.hypot(o.ax, o.az) || 1; o.ax /= l; o.az /= l; }
    o.tilt += ((o.stack ? 0.3 : 1.35) - o.tilt) * Math.min(1, dt * 5 / (1 + o.t.h * 0.03));
    o.yaw += o.spin * dt;
    if (o.y < -(o.t.h + 1 + fr * 0.5)) { o.state = 2; falling.splice(i, 1); eaten(o, h); continue; }
    writeMatrix(o);
  }
}
function comboMult() { return combo >= 40 ? 5 : combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1; }
const MILESTONES = [[10, '不错！'], [20, '爽吃！'], [40, '停不下来！'], [80, '暴食之王！'], [150, '吞噬天地！']];
function eaten(o, h) {
  if (o.t.cat === 'coin') {
    if (h.isPlayer) { const secs = 2 + ((o.id * 7) % 4); timeLeft += secs; popup('+' + secs + '秒', 'time'); sfx.coin(); vib(15); h.score += 50; }
    return;
  }
  h.addMass(o.t.value); eatenValue += o.t.value;
  if (h.isPlayer) {
    combo++; comboT = 1.4; if (combo > comboBest) comboBest = combo;
    for (const [n, txt] of MILESTONES) if (combo === n) { banner(txt + ` 连吃×${n}`); sfx.combo(MILESTONES.findIndex(m => m[0] === n) + 1); vib(25); }
    const pts = Math.round(o.t.value * 10 * comboMult() * (rushT > 0 ? 2 : 1) * (o.gold ? 5 : 1));
    h.score += pts; popup(pts, o.gold);
    if (o.stack) sfx.segment(o.segIdx); else sfx.eat(o.t.fr * 1.3, combo);
    if (o.gold) { sfx.gold(); vib(20); }
    else if (o.t.cat === 'bld' || o.t.fr > 3) vib(18);
  } else {
    h.score += Math.round(o.t.value * 10 * (rushT > 0 ? 2 : 1) * (o.gold ? 5 : 1));
    if (player && o.t.fr > 2 && Math.hypot(h.x - player.x, h.z - player.z) < 35) sfx.eat(o.t.fr * 1.3, 0);
  }
}
function updateDisturbed(dt) {
  for (const o of disturbed) {
    const tgt = o.tt, ty = o.ty || 0;
    o.tilt += (tgt - o.tilt) * Math.min(1, dt * 12); o.y += (ty - o.y) * Math.min(1, dt * 12);
    o.tt = 0; o.ty = 0;
    if (tgt === 0 && o.tilt < 0.002 && Math.abs(o.y) < 0.002) { o.tilt = 0; if (!o.mover) o.y = 0; disturbed.delete(o); }
    writeMatrix(o);
  }
}

// ---------------- 道具 ----------------
const PU = { magnet: { name: '磁铁', col: '#ff6b6b', dur: 8 }, speed: { name: '加速', col: '#ffd43b', dur: 6 }, grow: { name: '变大', col: '#69db7c', dur: 8 } };
const puTex = {};
function drawIcon(kind) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 56, 10, 64, 64, 60); g.addColorStop(0, '#ffffff'); g.addColorStop(1, PU[kind].col);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke();
  x.lineCap = 'round'; x.lineJoin = 'round';
  if (kind === 'magnet') { x.lineWidth = 16; x.strokeStyle = '#e03131'; x.beginPath(); x.arc(64, 60, 22, Math.PI, 0, true); x.stroke(); x.strokeStyle = '#dee2e6'; x.beginPath(); x.moveTo(42, 60); x.lineTo(42, 86); x.moveTo(86, 60); x.lineTo(86, 86); x.stroke(); x.strokeStyle = '#e03131'; x.beginPath(); x.moveTo(42, 60); x.lineTo(42, 70); x.moveTo(86, 60); x.lineTo(86, 70); x.stroke(); }
  else if (kind === 'speed') { x.fillStyle = '#f08c00'; x.beginPath(); x.moveTo(72, 22); x.lineTo(40, 70); x.lineTo(62, 70); x.lineTo(54, 106); x.lineTo(88, 54); x.lineTo(66, 54); x.closePath(); x.fill(); }
  else { x.fillStyle = '#2b8a3e'; x.beginPath(); x.moveTo(64, 24); x.lineTo(98, 62); x.lineTo(76, 62); x.lineTo(76, 100); x.lineTo(52, 100); x.lineTo(52, 62); x.lineTo(30, 62); x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let pickups = [], puTimer = 0;
function clearPickups() { for (const p of pickups) scene.remove(p.sprite); pickups = []; }
function spawnPickup() {
  const kinds = Object.keys(PU), kind = kinds[(Math.random() * kinds.length) | 0];
  if (!puTex[kind]) puTex[kind] = new THREE.SpriteMaterial({ map: drawIcon(kind), depthWrite: false, fog: false });
  const sp = new THREE.Sprite(puTex[kind]); sp.renderOrder = 5;
  // 放在道路上
  const rc = roadCenters[(Math.random() * roadCenters.length) | 0], a = (Math.random() * 2 - 1) * (HALF - 6);
  const x = Math.random() < 0.5 ? a : rc, z = x === a ? rc : a;
  sp.position.set(x, 2, z); scene.add(sp);
  pickups.push({ kind, x, z, sprite: sp, ph: Math.random() * 6 });
}
function updatePickups(dt) {
  if (state !== 'play') return;
  puTimer -= dt;
  const maxN = rushT > 0 ? 12 : 7;
  if (puTimer <= 0 && pickups.length < maxN) { spawnPickup(); puTimer = rushT > 0 ? 1 : 4; }
  const sc = Math.max(2.6, camD / 14);
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.ph += dt * 3;
    p.sprite.position.y = sc * 0.6 + Math.sin(p.ph) * 0.4; p.sprite.scale.setScalar(sc * (1 + Math.sin(p.ph * 2) * 0.05));
    for (const h of holes) {
      if (!h.alive) continue;
      if (Math.hypot(h.x - p.x, h.z - p.z) < h.r + 1.2) {
        h.fx[p.kind] = PU[p.kind].dur; scene.remove(p.sprite); pickups.splice(i, 1);
        if (h.isPlayer) { sfx.power(p.kind); banner(`${PU[p.kind].name}！`, PU[p.kind].col); vib(30); }
        break;
      }
    }
  }
}
function applyMagnet(h, dt) {
  const R = h.r * 2.6 + 3, sp = (5 + h.r * 2) * dt;
  gridQuery(h.x, h.z, R, (o) => {
    if (o.state || o.stack || o.t.fr >= h.r * 0.92) return;
    const dx = h.x - o.x, dz = h.z - o.z, d = Math.hypot(dx, dz);
    if (d > R || d < 0.01) return;
    const m = Math.min(d, sp * (1.5 - d / R)); o.x += dx / d * m; o.z += dz / d * m; gridMove(o); writeMatrix(o);
  });
}

// ---------------- 输入（固定摇杆，零延迟）----------------
const input = { keys: new Set(), joy: null, mouse: null, mouseActive: false, out: [0, 0] };
const joyEl = $('joy'), knobEl = $('joyKnob');
let JOY_R = 60, joyCX = 0, joyCY = 0;
function layoutJoy() { const r = joyEl.getBoundingClientRect(); joyCX = r.left + r.width / 2; joyCY = r.top + r.height / 2; JOY_R = r.width / 2; }
function joyUpdate(x, y) {
  const j = input.joy; j.x = x; j.y = y;
  let dx = x - joyCX, dy = y - joyCY; const l = Math.hypot(dx, dy), k = l > JOY_R * 0.8 ? JOY_R * 0.8 / l : 1;
  knobEl.style.transform = `translate(${dx * k}px,${dy * k}px)`;
}
canvas.addEventListener('pointerdown', (e) => {
  sfx.init();
  if (e.pointerType === 'mouse') { input.mouse = { x: e.clientX, y: e.clientY }; input.mouseActive = true; return; }
  if (input.joy) return;
  input.joy = { id: e.pointerId, x: e.clientX, y: e.clientY };
  joyEl.classList.add('active'); joyUpdate(e.clientX, e.clientY);
}, { passive: true });
joyEl.addEventListener('pointerdown', (e) => { sfx.init(); if (input.joy) return; input.joy = { id: e.pointerId, x: e.clientX, y: e.clientY }; joyEl.classList.add('active'); joyUpdate(e.clientX, e.clientY); }, { passive: true });
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { input.mouse = { x: e.clientX, y: e.clientY }; input.mouseActive = true; return; }
  const j = input.joy; if (!j || j.id !== e.pointerId) return; joyUpdate(e.clientX, e.clientY);
}, { passive: true });
const endJoy = (e) => { if (input.joy && input.joy.id === e.pointerId) { input.joy = null; joyEl.classList.remove('active'); knobEl.style.transform = ''; } };
window.addEventListener('pointerup', endJoy); window.addEventListener('pointercancel', endJoy);
document.addEventListener('mouseleave', () => { input.mouseActive = false; });
window.addEventListener('keydown', (e) => { input.keys.add(e.code); if (e.code === 'Escape' && state === 'play') pause(true); });
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
window.addEventListener('blur', () => input.keys.clear());
const _v = new THREE.Vector3();
export function readInput(hx, hz) {
  const K = input.keys, out = input.out; let x = 0, z = 0;
  if (K.has('KeyA') || K.has('ArrowLeft')) x -= 1; if (K.has('KeyD') || K.has('ArrowRight')) x += 1;
  if (K.has('KeyW') || K.has('ArrowUp')) z -= 1; if (K.has('KeyS') || K.has('ArrowDown')) z += 1;
  if (x || z) { const l = Math.hypot(x, z); input.mouseActive = false; out[0] = x / l; out[1] = z / l; return out; }
  if (input.joy) {
    const dx = input.joy.x - joyCX, dy = input.joy.y - joyCY, l = Math.hypot(dx, dy);
    if (l < 3) { out[0] = out[1] = 0; return out; }
    const m = Math.min(1, l / (JOY_R * 0.55)); out[0] = dx / l * m; out[1] = dy / l * m; return out;
  }
  if (input.mouseActive && input.mouse) {
    _v.set(hx, 0, hz).project(camera);
    const sx = (_v.x * 0.5 + 0.5) * innerWidth, sy = (-_v.y * 0.5 + 0.5) * innerHeight;
    const dx = input.mouse.x - sx, dy = input.mouse.y - sy, l = Math.hypot(dx, dy), full = Math.min(innerWidth, innerHeight) * 0.18;
    if (l < 12) { out[0] = out[1] = 0; return out; }
    const m = Math.min(1, (l - 12) / full); out[0] = dx / l * m; out[1] = dy / l * m; return out;
  }
  out[0] = out[1] = 0; return out;
}

// ---------------- AI ----------------
function aiThink(h) {
  const ai = h.ai; ai.t = 0.35 + Math.random() * 0.35;
  let fx = 0, fz = 0, threat = false, prey = null, preyD = 1e9;
  for (const o of holes) {
    if (o === h || !o.alive) continue;
    const dx = h.x - o.x, dz = h.z - o.z, d = Math.hypot(dx, dz) || 0.01;
    if (o.r > h.r * 1.1 && d < o.r + h.r + 7 + h.r * 1.5 && Math.random() < 0.6 + h.skill * 0.4) { fx += dx / d / d; fz += dz / d / d; threat = true; }
    else if (h.r > o.r * 1.18 && o.prot <= 0 && d < 16 + h.r * 2.5 && d < preyD) { prey = o; preyD = d; }
  }
  if (threat) { const l = Math.hypot(fx, fz); ai.tx = h.x + fx / l * 30; ai.tz = h.z + fz / l * 30; ai.mode = 'flee'; return; }
  if (prey && Math.random() < h.skill) { ai.tx = prey.x + prey.vx * 0.4; ai.tz = prey.z + prey.vz * 0.4; ai.mode = 'chase'; return; }
  let best = null, bs = 0; const R = 12 + h.r * 3, r9 = h.r * 0.9;
  const reach = BOUND - h.r * 0.4 + h.r * 0.6;
  gridQuery(h.x, h.z, R, (o) => {
    if (o.t.fr >= r9 || Math.abs(o.x) > reach || Math.abs(o.z) > reach) return;
    const d = Math.hypot(o.x - h.x, o.z - h.z); const s = (o.stack ? o.stack.segs.length * o.t.value : o.t.value * (o.gold ? 5 : 1)) / (d + 3) * (0.7 + Math.random() * 0.6);
    if (s > bs) { bs = s; best = o; }
  });
  for (const p of pickups) { const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < 25 && 8 / (d + 3) > bs) { bs = 8 / (d + 3); best = p; } }
  if (!best && mode === 'level') { let bd = 1e9; for (const o of objs) { if (o.state || o.hidden || o.t.fr >= r9 || (o.stack && o !== o.stack.segs[0])) continue; const d = Math.abs(o.x - h.x) + Math.abs(o.z - h.z); if (d < bd) { bd = d; best = o; } } }
  if (best) { ai.tx = best.x; ai.tz = best.z; ai.mode = 'eat'; return; }
  if (ai.mode !== 'wander' || Math.hypot(ai.tx - h.x, ai.tz - h.z) < 5) { ai.tx = (Math.random() * 2 - 1) * (HALF - 15); ai.tz = (Math.random() * 2 - 1) * (HALF - 15); }
  ai.mode = 'wander';
}
const _aiOut = [0, 0];
function aiDir(h, dt) {
  h.ai.t -= dt; if (h.ai.t <= 0) aiThink(h);
  const dx = h.ai.tx - h.x, dz = h.ai.tz - h.z, d = Math.hypot(dx, dz);
  if (d < 0.3) { h.ai.t = 0; _aiOut[0] = _aiOut[1] = 0; return _aiOut; }
  const m = Math.min(1, d / 2) * (0.82 + 0.18 * h.skill), wob = Math.sin(gameTime * 1.3 + h.skill * 10) * 0.15;
  _aiOut[0] = dx / d * m - dz / d * wob; _aiOut[1] = dz / d * m + dx / d * wob; return _aiOut;
}

// ---------------- 黑洞更新 ----------------
function updateHoles(dt) {
  for (const h of holes) {
    if (!h.alive) {
      if (h.dying > 0) {
        h.dying -= dt; const e = h.eater; h.x += (e.x - h.x) * Math.min(1, dt * 8); h.z += (e.z - h.z) * Math.min(1, dt * 8); h.r *= Math.pow(0.02, dt);
        if (h.dying <= 0) h.group.visible = false;
      } else if (h.respawn > 0) {
        h.respawn -= dt;
        if (h.respawn <= 0) { h.alive = true; h.resetSize(); randomSpawn(h); h.prot = 2.5; h.group.visible = true; if (h.isPlayer) $('dead').classList.add('hidden'); }
      }
    } else {
      for (const k in h.fx) if (h.fx[k] > 0) h.fx[k] -= dt;
      let dir = _aiOut; _aiOut[0] = _aiOut[1] = 0;
      if (state === 'play') dir = (h.isPlayer && !h.autopilot) ? readInput(h.x, h.z) : aiDir(h, dt);
      const speed = (7.5 + h.r * 0.9) * (h.isPlayer ? 1 : 0.86 + 0.1 * h.skill) * (h.fx.speed > 0 ? 1.55 : 1);
      const a = 1 - Math.exp(-dt * (h.isPlayer ? 16 : 6));
      h.vx += (dir[0] * speed - h.vx) * a; h.vz += (dir[1] * speed - h.vz) * a;
      h.x += h.vx * dt; h.z += h.vz * dt;
      const lim = BOUND - h.r * 0.4; h.x = Math.max(-lim, Math.min(lim, h.x)); h.z = Math.max(-lim, Math.min(lim, h.z));
      h.rMul += ((h.fx.grow > 0 ? 1.4 : 1) - h.rMul) * (1 - Math.exp(-dt * 5));
      h.r += (h.rTarget * h.rMul - h.r) * (1 - Math.exp(-dt * 4));
      if (h.prot > 0) h.prot -= dt;
      if (h.fx.magnet > 0) applyMagnet(h, dt);
    }
    const r = Math.max(0.01, h.r), depth = Math.max(4, r * 3.2);
    h.group.position.set(h.x, 0, h.z);
    h.mask.scale.set(r, 1, r); h.rim.scale.set(r, 1, r); h.pit.scale.set(r * 0.999, depth, r * 0.999);
    if (h.ring) { h.ring.scale.set(r, 1, r); ringMat.uniforms.prog.value = h.progress(); }
    const fxOn = h.fx.magnet > 0 || h.fx.speed > 0 || h.fx.grow > 0;
    h.rim.material.opacity = h.prot > 0 ? (Math.sin(gameTime * 18) > 0 ? 0.95 : 0.15) : 0.95;
    h.rim.scale.multiplyScalar(fxOn ? 1 + 0.03 * Math.sin(gameTime * 12) : 1);
  }
  if (state !== 'play') return;
  for (const a of holes) for (const b of holes) {
    if (a === b || !a.alive || !b.alive || b.prot > 0 || a.prot > 0) continue;
    if (a.r > b.r * 1.12) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < a.r - b.r * 0.3) holeEaten(b, a); }
  }
}
function holeEaten(b, a) {
  b.alive = false; b.dying = 0.5; b.eater = a; a.kills++;
  a.addMass(b.mass * 0.3 + 5); const pts = 200 + Math.round(b.mass * 5); a.score += pts;
  feed(`<b style="color:${hex(a.color)}">${escapeHtml(a.name)}</b> 吞掉了 <b style="color:${hex(b.color)}">${escapeHtml(b.name)}</b>`);
  if (a.isPlayer) { sfx.eatHole(); popup(pts); vib([30, 40, 60]); }
  if (b.isPlayer) { sfx.eaten(); vib(200); combo = 0; }
  if (mode === 'battle') { b.out = true; b.respawn = 0; if (b.isPlayer) setTimeout(() => endGame('被吞噬'), 1200); else checkBattleEnd(); }
  else { b.respawn = 3.5; if (b.isPlayer) { $('deadBy').textContent = `你被「${a.name}」吞掉了！`; $('dead').classList.remove('hidden'); } }
}
function checkBattleEnd() { const alive = holes.filter(h => !h.out); if (alive.length <= 1 && state === 'play') setTimeout(() => endGame('胜利'), 1000); }
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function interactions() {
  for (const h of holes) {
    if (!h.alive || h.r < 0.05) continue;
    gridQuery(h.x, h.z, h.r + MAXFR, (o) => interact(h, o));
    for (let i = 0; i < movers.length; i++) { const o = movers[i]; if (o.state === 0 && !o.hidden) { const dx = o.x - h.x, dz = o.z - h.z, r = h.r + o.t.fr; if (dx * dx + dz * dz < r * r) interact(h, o); } }
  }
}

// ---------------- 遮挡淡出 ----------------
const fading = new Set();
function updateOcclusion(dt) {
  const h = player;
  if (h && state !== 'menu') {
    const r = Math.max(h.r, 1), cot = 1 / Math.tan(PITCH);
    const test = (o, top) => { const dz = o.z - h.z; return dz > -o.t.fr * 0.4 && dz < top * cot + o.t.fr * 0.8 && Math.abs(o.x - h.x) < o.t.fr * 0.8 + r * 0.7; };
    gridQuery(h.x, h.z + 25, 60, (o) => { if (o.t.h < 9 || o.state || o.stack) return; if (test(o, o.t.h)) { o.fadeT = 0.35; fading.add(o); } });
    for (const st of stacks) if (st.segs.length > 2 && Math.abs(st.z - h.z - 20) < 60) { const b = st.segs[0]; if (test(b, st.baseY + st.segs.length * SEG_H)) for (const o of st.segs) { o.fadeT = 0.35; fading.add(o); } }
  }
  for (const o of fading) {
    const tgt = o.fadeT; o.fadeT = 1;
    o.fade += (tgt - o.fade) * Math.min(1, dt * 8); if (Math.abs(o.fade - tgt) < 0.01) o.fade = tgt;
    if (o.fade === 1 && tgt === 1) fading.delete(o);
  }
}

// ---------------- 相机 ----------------
let camD = 30, camX = 0, camZ = 0, menuAng = 0, shake = 0;
const PITCH = 60 * Math.PI / 180;
function updateCamera(dt) {
  const tan = Math.tan(camera.fov * Math.PI / 360), aspect = camera.aspect;
  let tx, tz, want;
  if (state === 'menu') { menuAng += dt * 0.05; tx = Math.sin(menuAng) * 50; tz = Math.cos(menuAng * 0.7) * 50; want = 110; }
  else {
    tx = player.x; tz = player.z; const r = Math.max(player.rTarget * player.rMul, 1);
    want = Math.max((8 + r * 3.3) / tan, (8 + r * 2.5) / (tan * aspect));
    if (mode === 'level') { want *= 1 + (lvFitK - 1) * Math.pow(Math.min(1, player.mass / totalValue), 0.6); tx = Math.max(-HALF + 6, Math.min(HALF - 6, tx)); tz = Math.max(-HALF + 6, Math.min(HALF - 6, tz)); }
  }
  const a = 1 - Math.exp(-dt * (state === 'menu' ? 1 : 10));
  camX += (tx - camX) * a; camZ += (tz - camZ) * a; camD += (want - camD) * (1 - Math.exp(-dt * 2.2));
  let sx = 0, sz = 0; if (shake > 0) { shake -= dt; sx = (Math.random() - 0.5) * shake * 2; sz = (Math.random() - 0.5) * shake * 2; }
  camera.position.set(camX + sx, Math.sin(PITCH) * camD, camZ + Math.cos(PITCH) * camD + sz);
  camera.lookAt(camX + sx, 0, camZ - camD * 0.04 + sz);
  camera.updateMatrixWorld();
  if (mode === 'level' && state !== 'menu') { scene.fog.near = camD * 2.4; scene.fog.far = camD * 6 + 160; } else { scene.fog.near = camD * 1.6; scene.fog.far = camD * 4 + 120; }
}

// ---------------- HUD ----------------
const popPool = []; let popAcc = 0, popT = 0, popGold = false;
let popKind = '';
function popup(pts, gold) { if (typeof pts === 'string') { popAcc = pts; popT = 0; popKind = gold === 'time' ? ' time' : ' o2'; return; } if (typeof popAcc === 'string') popAcc = 0; popAcc += pts; if (gold) popGold = true; }
function flushPop(dt) {
  const F = sea ? sea.v : player;
  popT -= dt; if (popAcc <= 0 || popT > 0 || !F) return;
  popT = 0.12;
  let el = popPool.find(e => !e._busy);
  if (!el) { el = document.createElement('div'); el.className = 'pop'; $('pops').appendChild(el); popPool.push(el); el.addEventListener('animationend', () => { el._busy = false; el.style.display = 'none'; }); }
  _v.set(F.x, 0, F.z - F.r).project(camera);
  const x = (_v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 50, y = (-_v.y * 0.5 + 0.5) * innerHeight - 20;
  el._busy = true; el.textContent = typeof popAcc === 'string' ? popAcc : (popGold ? '黄金 +' : '+') + popAcc; el.className = 'pop' + (popGold ? ' gold' : '') + (popAcc >= 500 ? ' big' : '') + (typeof popAcc === 'string' ? popKind : '');
  el.style.display = 'block'; el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  popAcc = 0; popGold = false;
}
function feed(html) { const f = $('feed'), d = document.createElement('div'); d.innerHTML = html; f.prepend(d); setTimeout(() => d.remove(), 3500); while (f.children.length > 3) f.lastChild.remove(); }
function banner(txt, col) { const b = $('banner'); b.textContent = txt; b.style.color = col || ''; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function flashLevel() { $('lvl').animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' }); }
let hudT = 0, lastSec = -1, hintT = 0, hintO = null; const hudCache = {};
const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
function updateHud(dt) {
  hudT -= dt;
  const t = Math.max(0, Math.ceil(timeLeft));
  setText('timer', `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`);
  $('timer').classList.toggle('warn', t <= 10);
  if (t <= 10 && t !== lastSec && state === 'play' && t > 0) sfx.tick(); lastSec = t;
  setText('lvlNum', player.level);
  const off = (125.6 * (1 - player.progress())).toFixed(1); if (hudCache.arc !== off) { hudCache.arc = off; $('lvlArc').style.strokeDashoffset = off; }
  setText('myScore', player.score);
  // 连击
  const cb = $('combo');
  if (combo >= 5 && comboT > 0) { cb.classList.remove('hidden'); setText('comboN', '×' + comboMult()); setText('comboM', `连吃 ${combo > 99 ? '99+' : combo}`); $('comboBar').style.transform = `scaleX(${Math.max(0, comboT / 1.4)})`; }
  else cb.classList.add('hidden');
  // 道具
  let fxHtml = ''; for (const k in PU) if (player.fx[k] > 0) fxHtml += `<div style="--c:${PU[k].col}">${PU[k].name} ${Math.ceil(player.fx[k])}s</div>`;
  if (hudCache.fx !== fxHtml) { hudCache.fx = fxHtml; $('fx').innerHTML = fxHtml; }
  $('rush').classList.toggle('hidden', !(rushT > 0));
  if (mode === 'solo') { const p = Math.min(100, eatenValue / totalValue * 100); setText('soloTxt', `城市吞噬 ${p.toFixed(1)}%`); $('soloBar').style.width = p + '%'; }
  if (mode === 'level') { const p = Math.min(100, eatenValue / totalValue * 100); setText('soloTxt', `第${lv.i}关 · 吞噬 ${Math.floor(p)}%  ${'★'.repeat(starsFor(p))}${'☆'.repeat(3 - starsFor(p))}`); $('soloBar').style.width = p.toFixed(1) + '%'; }
  if (hudT <= 0) {
    hudT = 0.3;
    const sorted = holes.slice().sort((a, b) => b.score - a.score);
    let html = '';
    sorted.forEach((h, i) => { if (i < 5 || h.isPlayer) html += `<div class="${h.isPlayer ? 'me' : ''} ${h.out ? 'dead' : ''}"><em>${i + 1}</em><i style="background:${hex(h.color)}"></i><span>${escapeHtml(h.name)}</span><b>${h.score}</b></div>`; });
    if (hudCache.lb !== html) { hudCache.lb = html; $('lb').innerHTML = html; }
    const leader = sorted[0];
    for (const h of holes) { const c = h === leader && h.score > 0; if (c !== h._crown) h.setLabel(c); }
  }
  // 闯关：剩余不多时，指示最近的未吃物体
  if (mode === 'level') {
    const hint = $('hint'); hintT -= dt;
    if (hintT <= 0) { hintT = 0.25; hintO = null; if (eatenValue >= totalValue * 0.9) { let bd = 1e9; for (const o of objs) { if (o.state || o.hidden || o.t.cat === 'coin' || (o.stack && o !== o.stack.segs[0])) continue; const d = (o.x - player.x) ** 2 + (o.z - player.z) ** 2; if (d < bd) { bd = d; hintO = o; } } } }
    if (hintO && hintO.state === 0) {
      _v.set(hintO.x, 0, hintO.z).project(camera); let x = (_v.x * 0.5 + 0.5) * innerWidth, y = (-_v.y * 0.5 + 0.5) * innerHeight;
      const m = 34; x = Math.max(m, Math.min(innerWidth - m, x)); y = Math.max(150, Math.min(innerHeight - 190, y));
      hint.style.display = 'block'; hint.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-100%)`;
    } else hint.style.display = 'none';
  }
  if (!player.alive && player.respawn > 0 && mode !== 'battle') setText('deadT', `${Math.ceil(player.respawn)} 秒后复活`);
}
function updateLabels() {
  for (const h of holes) {
    if (!h.group.visible || state === 'menu') { if (h.label.style.display !== 'none') h.label.style.display = 'none'; continue; }
    _v.set(h.x, 0, h.z - h.r * 1.05).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) { h.label.style.display = 'none'; continue; }
    h.label.style.display = 'block';
    h.label.style.transform = `translate(${((_v.x * 0.5 + 0.5) * innerWidth) | 0}px,${((-_v.y * 0.5 + 0.5) * innerHeight) | 0}px) translate(-50%,-120%)`;
  }
}

// ---------------- 流程 ----------------
function clearHoles() { for (const h of holes) h.dispose(); holes = []; player = null; }
function setupHoles(withPlayer, nAI) {
  clearHoles();
  const cols = COLORS.filter(c => c !== playerColor).sort(() => Math.random() - 0.5);
  const names = [...AI_NAMES].sort(() => Math.random() - 0.5);
  if (withPlayer) { player = new Hole(playerName || '我', playerColor, true); holes.push(player); }
  for (let i = 0; i < nAI; i++) holes.push(new Hole(names[i], cols[i % cols.length], false, 0.45 + Math.random() * 0.55));
  for (const h of holes) randomSpawn(h);
  if (player) { randomSpawn(player); for (const h of holes) if (!h.isPlayer && Math.hypot(h.x - player.x, h.z - player.z) < 30) { h.x = -h.x || 60; h.z = -h.z || 60; } }
}
const skyCache = {};
const TOD = [null, { sky: ['#ffb3c7', '#ffe0ea', '#fff6f0'], tint: 0xfff0f4 }, { sky: ['#4fb4ff', '#b0e0ff', '#f0fbff'], tint: 0xffffff }, { sky: ['#ff7f50', '#ffbf80', '#ffe8c8'], tint: 0xffd8b0 }, { sky: ['#7bdff2', '#c9f5ff', '#fdfdea'], tint: 0xffffff }];
function enterCityVisuals(def) {
  if (!def) { scene.background = SKY_TEX; scene.fog.color.setHex(SKY_FOG); hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0xb8d4a0); hemi.intensity = 1.55; sun.color.setHex(0xfff1dc); sun.intensity = 1.9; return; }
  const th = def.theme, tod = def.themeKey !== 'night' ? TOD[(def.i / 12) | 0] : null;
  const sky = tod ? tod.sky : th.sky, key = sky.join();
  scene.background = skyCache[key] || (skyCache[key] = gradientTex(...sky));
  scene.fog.color.setHex(th.fog);
  const L = th.light; hemi.color.setHex(L[0]); hemi.groundColor.setHex(L[1]); hemi.intensity = L[2]; sun.color.setHex(L[3]); sun.intensity = L[4];
  if (tod) sun.color.multiply(new THREE.Color(tod.tint));
}
// ---------- 闯关进度 ----------
function loadProg() { try { return JSON.parse(localStorage.getItem('bh_levels') || '{}'); } catch (e) { return {}; } }
function saveProg(p) { try { localStorage.setItem('bh_levels', JSON.stringify(p)); } catch (e) { } }
function unlockedUpTo() { const p = loadProg(); let u = 1; while (u < LEVEL_COUNT && p[u] > 0) u++; return u; }
function starsFor(pct) { if (!lv) return 0; return pct >= 99.9 ? 3 : pct >= (lv.target + 100) / 2 ? 2 : pct >= lv.target ? 1 : 0; }
function showLevelSel() {
  state = 'menu'; ['menu', 'over', 'hud'].forEach(id => $(id).classList.add('hidden')); $('levelSel').classList.remove('hidden');
  const p = loadProg(), un = unlockedUpTo(), g = $('lvGrid'); let tot = 0, html = '';
  for (let i = 1; i <= LEVEL_COUNT; i++) {
    const st = p[i] || 0; tot += st; const d = levelDef(i), lock = i > un;
    html += `<button data-l="${i}" class="${lock ? 'lock' : ''} ${i === un ? 'cur' : ''}">${lock ? '<small>🔒</small>' : `<small>${d.theme.icon}</small>`}${i}<em>${'★'.repeat(st)}<span class="off">${'★'.repeat(3 - st)}</span></em></button>`;
  }
  g.innerHTML = html; $('lvStars').textContent = `★ ${tot}/${LEVEL_COUNT * 3}`;
  g.querySelectorAll('button').forEach(b => b.onclick = () => { const i = +b.dataset.l; if (i > unlockedUpTo()) { b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; } startLevel(i); });
  const cur = g.querySelector('.cur'); if (cur) cur.scrollIntoView({ block: 'center' });
}
function startLevel(i) { curLevel = i; mode = 'level'; $('levelSel').classList.add('hidden'); $('menu').classList.add('hidden'); startGame(); }
function showMenu() {
  state = 'menu'; paused = false;
  ['hud', 'over', 'count', 'dead', 'paused', 'seaHud', 'levelSel'].forEach(id => $(id).classList.add('hidden'));
  document.body.classList.remove('lv'); lv = null; $('hint').style.display = 'none'; $('lvModeSub').textContent = `50 关 · 已解锁 ${unlockedUpTo()} 关 · 吃光地图拿三星 · 金币加时`;
  $('joy').classList.add('hidden');
  $('menu').classList.remove('hidden');
  if (sea) { sea.dispose(); sea = null; }
  enterCityVisuals(); buildCity(); setupHoles(false, 0); sfx.stopMusic(); sfx.setIntense(false);
}
let countT = 0, lastCount = 4;
function startGame() {
  if (mode === 'level' && state === 'menu' && !$('menu').classList.contains('hidden')) { showLevelSel(); return; }
  sfx.init();
  playerName = ($('nameInput').value || '').trim() || '我';
  try { localStorage.setItem('bh_name', playerName); localStorage.setItem('bh_color', playerColor); } catch (e) { }
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('joy').classList.toggle('hidden', !isTouch); layoutJoy();
  $('feed').innerHTML = ''; combo = 0; comboT = 0; comboBest = 0; rushT = 0; rushDone = false; sfx.setIntense(false);
  timeLeft = 120; gameTime = 0; trafficT = 0; puTimer = 1;
  if (mode === 'sea') {
    disposeCity(); clearHoles();
    sea = new SeaWorld({ THREE, scene, camera, renderer, sfx, hemi, sun, readInput, banner, popup: (n, g) => popup(n, g), vib, playerName, playerColor, end: (r) => endGame(r) });
    $('cityHud').classList.add('hidden'); $('seaHud').classList.remove('hidden');
    $('modeName').textContent = '海底模式';
  } else {
    if (sea) { sea.dispose(); sea = null; }
    lv = mode === 'level' ? levelDef(curLevel) : null; lvCleared = false;
    document.body.classList.toggle('lv', !!lv);
    enterCityVisuals(lv);
    $('cityHud').classList.remove('hidden'); $('seaHud').classList.add('hidden');
    buildCity(lv);
    setupHoles(true, mode === 'solo' || lv ? 0 : mode === 'battle' ? 7 : 5);
    if (lv) {
      timeLeft = lv.time;
      let rc = roadCenters[0]; for (const r of roadCenters) if (Math.abs(r) < Math.abs(rc)) rc = r; player.x = rc; player.z = rc;
      // 视角：洞吃光整张图时的大小，镜头刚好框住整张图
      let L = 1; while (L < MAX_LEVEL && totalValue >= massFor(L + 1)) L++;
      const rF = radiusFor(L), tan = Math.tan(camera.fov * Math.PI / 360), asp = Math.min(camera.aspect, 1);
      const stdD = Math.max((8 + rF * 3.3) / tan, (8 + rF * 2.5) / (tan * asp)), fitD = (HALF + 9) / (tan * asp);
      lvFitK = Math.max(1, fitD / stdD);
      const mk = $('solo').querySelector('.bar'); mk.querySelectorAll('.mk').forEach(e => e.remove());
      for (const v of [lv.target, (lv.target + 100) / 2]) { const e = document.createElement('i'); e.className = 'mk'; e.style.left = v + '%'; mk.appendChild(e); }
      banner(`第${lv.i}关 · ${lv.name}`, '#ffffff');
    }
    camX = player.x; camZ = player.z; camD = 40;
    $('solo').classList.toggle('hidden', mode !== 'solo' && !lv);
    $('modeName').textContent = lv ? `第${lv.i}关 · ${lv.theme.icon}${lv.name}` : { classic: '经典模式', battle: '大逃杀', solo: '单人模式' }[mode];
  }
  state = 'countdown'; countT = 3.0; lastCount = 4;
}
function updateCountdown(dt) {
  countT -= dt; const n = Math.ceil(countT), el = $('count');
  if (n !== lastCount) {
    lastCount = n; el.classList.remove('hidden', 'anim'); void el.offsetWidth; el.classList.add('anim');
    if (n > 0) { el.textContent = n; sfx.count(); } else { el.textContent = mode === 'sea' ? '下潜！' : '开吃！'; sfx.go(); sfx.startMusic(); }
  }
  if (countT <= 0 && state === 'countdown') { state = 'play'; setTimeout(() => el.classList.add('hidden'), 700); }
}
function endGame(reason) {
  if (state === 'over') return;
  state = 'over'; $('hint').style.display = 'none'; sfx.stopMusic(); sfx.fanfare(); sfx.setIntense(false);
  $('dead').classList.add('hidden'); input.joy = null; $('joy').classList.add('hidden');
  const medal = ['🥇', '🥈', '🥉'];
  let bestKey = 'bh_best_' + mode, myScore;
  ['overStars', 'nextBtn', 'selBtn'].forEach(id => $(id).classList.add('hidden')); $('againBtn').textContent = '再来一局';
  if (mode === 'level') {
    const pct = Math.min(100, eatenValue / totalValue * 100), st = starsFor(pct), bonus = reason === 'clear' ? Math.ceil(timeLeft) * 50 : 0;
    player.score += bonus; myScore = player.score; bestKey = 'bh_best_lv' + lv.i;
    const p = loadProg(); if (st > (p[lv.i] || 0)) { p[lv.i] = st; saveProg(p); }
    $('overTitle').textContent = st ? (reason === 'clear' ? '🎉 完美吃光！' : '🎉 过关！') : '差一点点！';
    $('myRank').innerHTML = `第${lv.i}关 · ${lv.name}<br>吞噬 <b>${pct.toFixed(1)}%</b>（目标 ${lv.target}%）· 得分 <b>${player.score}</b>`;
    $('rankList').innerHTML = [['吞噬进度', pct.toFixed(1) + '%'], ['最高连吃', comboBest], ['剩余时间奖励', bonus], ['总分', player.score]].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    const os = $('overStars'); os.classList.remove('hidden'); [...os.children].forEach(e => e.classList.remove('on'));
    setTimeout(() => [...os.children].forEach((e, k) => { if (k < st) setTimeout(() => { e.classList.add('on'); sfx.star(k); vib(20); }, k * 350); }), 1000);
    if (st && lv.i < LEVEL_COUNT) $('nextBtn').classList.remove('hidden');
    $('selBtn').classList.remove('hidden'); $('againBtn').textContent = st ? '再玩一次' : '重试';
  } else if (mode === 'sea') {
    const r = sea.result(); myScore = r.score;
    $('overTitle').textContent = reason === 'oxygen' ? '氧气耗尽！' : '上浮！时间到';
    $('myRank').innerHTML = `存活 <b>${r.time}s</b> · 最大体型 Lv.${r.level} · 珍珠 ${r.pearls} 颗<br>得分 <b>${r.score}</b>`;
    $('rankList').innerHTML = r.lines.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
  } else {
    myScore = player.score;
    const sorted = holes.slice().sort((a, b) => (mode === 'battle' ? (a.out - b.out) || (b.score - a.score) : b.score - a.score));
    const rank = sorted.indexOf(player) + 1;
    $('overTitle').textContent = reason === '被吞噬' ? '你被吞掉了！' : (mode === 'solo' ? '时间到！' : rank === 1 ? '🏆 你赢了！' : '时间到！');
    if (mode === 'solo') $('myRank').innerHTML = `吞噬了城市的 <b>${(eatenValue / totalValue * 100).toFixed(1)}%</b> · 得分 <b>${player.score}</b> · 最高连吃 ${comboBest}`;
    else $('myRank').innerHTML = `第 <b>${rank}</b> 名 · 得分 <b>${player.score}</b> · 最高连吃 ${comboBest} · 吞掉对手 ${player.kills} 次`;
    $('rankList').innerHTML = sorted.map((h, i) => `<li class="${h.isPlayer ? 'me' : ''}"><span class="r">${medal[i] || i + 1}</span><i style="background:${hex(h.color)}"></i><span>${escapeHtml(h.name)}${h.out && mode === 'battle' ? ' 💀' : ''}</span><b>${h.score}</b></li>`).join('');
  }
  try { const best = +localStorage.getItem(bestKey) || 0; if (myScore > best) { localStorage.setItem(bestKey, myScore); $('myRank').innerHTML += '<br>🎉 新纪录！'; } else $('myRank').innerHTML += `<br><small>最佳：${best}</small>`; } catch (e) { }
  setTimeout(() => $('over').classList.remove('hidden'), 900);
}
let paused = false;
function pause(p) { if (state !== 'play' && state !== 'countdown') return; paused = p; $('paused').classList.toggle('hidden', !p); if (p) sfx.stopMusic(); else sfx.startMusic(); }

(function initUI() {
  try { const n = localStorage.getItem('bh_name'); if (n) $('nameInput').value = n; const c = +localStorage.getItem('bh_color'); if (c) playerColor = c; } catch (e) { }
  const sk = $('skins');
  COLORS.forEach(c => { const b = document.createElement('button'); b.style.setProperty('--c', hex(c)); if (c === playerColor) b.classList.add('active'); b.onclick = () => { playerColor = c; [...sk.children].forEach(x => x.classList.remove('active')); b.classList.add('active'); }; sk.appendChild(b); });
  document.querySelectorAll('.mode').forEach(b => b.onclick = () => { document.querySelectorAll('.mode').forEach(x => x.classList.remove('active')); b.classList.add('active'); mode = b.dataset.mode; });
  $('startBtn').onclick = startGame; $('againBtn').onclick = () => mode === 'level' ? startLevel(curLevel) : startGame(); $('homeBtn').onclick = showMenu;
  $('nextBtn').onclick = () => startLevel(Math.min(LEVEL_COUNT, curLevel + 1)); $('selBtn').onclick = () => { showMenu(); showLevelSel(); }; $('lvBack').onclick = showMenu;
  $('muteBtn').onclick = () => { sfx.init(); sfx.setMuted(!sfx.muted); $('muteBtn').textContent = sfx.muted ? '🔇' : '🔊'; };
  $('pauseBtn').onclick = () => pause(true); $('resumeBtn').onclick = () => pause(false);
  $('quitBtn').onclick = () => { paused = false; showMenu(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(true); });
})();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 52 : 42; camera.updateProjectionMatrix();
  if (state !== 'menu') layoutJoy();
}
window.addEventListener('resize', resize); resize();

// ---------------- 主循环（基于 dt，无每帧分配）----------------
let last = performance.now(), frameN = 0, perfAcc = 0, perfN = 0, perfHold = 3, renderMs = 0, stepMs = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (dt <= 0) return;
  if (paused) { renderer.render(scene, camera); return; }
  perfAcc += dt; perfN++; perfHold -= dt;
  if (perfAcc > 1.2) {
    const avg = perfAcc / perfN;
    if (perfHold <= 0) {
      if (avg > 1 / 50 && pr > 1) { pr = Math.max(1, pr - 0.25); renderer.setPixelRatio(pr); resize(); perfHold = 2; }
      else if (avg < 1 / 58 && pr < maxPR) { pr = Math.min(maxPR, pr + 0.25); renderer.setPixelRatio(pr); resize(); perfHold = 8; }
    }
    perfAcc = 0; perfN = 0;
  }
  step(dt);
  if (sea) sea.camera(dt, state); else { updateCamera(dt); updateOcclusion(dt); compact(); }
  if (player) { updateHud(dt); flushPop(dt); }
  if (sea && state !== 'menu') { sea.hud(); flushPop(dt); }
  updateLabels();
  frameN++;
  const t0 = performance.now();
  renderer.render(scene, camera);
  renderMs = renderMs * 0.95 + (performance.now() - t0) * 0.05;
}
function step(dt) {
  const t0 = performance.now();
  gameTime += dt; trafficT += dt;
  if (state === 'countdown') updateCountdown(dt);
  if (state === 'play') {
    timeLeft -= dt;
    if (mode !== 'sea') {
      if (!rushDone && mode !== 'level' && timeLeft <= 50) { rushDone = true; rushT = 15; banner('狂欢时刻！得分×2', '#ffd43b'); sfx.rush(); sfx.setIntense(true); vib([40, 40, 40]); for (let i = 0; i < 5; i++) spawnPickup(); }
      if (rushT > 0) { rushT -= dt; if (rushT <= 0) sfx.setIntense(false); }
    }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (mode === 'level' && !lvCleared && eatenValue >= totalValue * 0.999) { lvCleared = 0.9; banner('全部吃光！', '#ffd43b'); sfx.levelUp(); }
    if (lvCleared) { lvCleared -= dt; if (lvCleared <= 0) { endGame('clear'); return; } }
    if (timeLeft <= 0 && mode !== 'sea') { timeLeft = 0; endGame('时间到'); }
  }
  if (sea) { sea.update(dt, state); if (state === 'play' && sea) timeLeft = sea.timeLeft; }
  else {
    const far = camD * 1.4 + 40;
    for (let i = 0; i < movers.length; i++) {
      const o = movers[i]; if (o.state !== 0) continue;
      o.acc += dt;
      const isFar = Math.abs(o.x - camX) > far || Math.abs(o.z - camZ) > far;
      if (isFar && ((frameN + o.id) & 3) !== 0) continue;
      updateMover(o, o.acc); o.acc = 0;
      if (!disturbed.has(o)) writeMatrix(o);
    }
    updateHoles(dt);
    if (state === 'play' || state === 'menu') interactions();
    updateDisturbed(dt);
    updateStacks(dt);
    updateFalling(dt);
    updatePickups(dt);
    for (const c of coins) if (c.state === 0 && !disturbed.has(c)) { c.yaw += dt * 2.6; c.y = Math.sin(gameTime * 3 + c.id) * 0.15; writeMatrix(c); }
  }
  stepMs = stepMs * 0.95 + (performance.now() - t0) * 0.05;
}

window.__bh = {
  get state() { return state; }, get player() { return player; }, get holes() { return holes; }, get objs() { return objs; }, get stacks() { return stacks; }, get sea() { return sea; },
  renderer, startGame, step, setMode: (m) => mode = m, setTime: (t) => { timeLeft = t; if (sea) sea.timeLeft = t; },
  get perf() { return { stepMs, renderMs, pr, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, visTris, visCalls }; },
  startLevel, showLevelSel, levelDef, get lvFitK() { return lvFitK; }, get timeLeft() { return timeLeft; }, get coins() { return coins; },
  get total() { return totalValue; }, get eaten() { return eatenValue / totalValue; }, get combo() { return comboBest; },
};
showMenu();
$('loading').remove();
requestAnimationFrame(frame);

// 黑洞入侵 · 网页版 —— 主逻辑
import * as THREE from 'three';
import { buildTypes, makeMaterials } from './models.js';
import { generateCity, buildGround, noiseTexture, BOUND, HALF, roadCenters } from './city.js';
import { Sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const isMobile = matchMedia('(pointer:coarse)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const sfx = new Sfx();
const TAU = Math.PI * 2, UP = new THREE.Vector3(0, 1, 0);

// ---------------- 渲染器 ----------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile || devicePixelRatio < 2, powerPreference: 'high-performance', stencil: true });
const maxPR = Math.min(devicePixelRatio || 1, isMobile ? 1.6 : 2);
let pr = maxPR;
renderer.setPixelRatio(pr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const SKY = 0xa9dcf3;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 200, 520);
const camera = new THREE.PerspectiveCamera(42, 1, 1, 1600);
const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x6f7f55, 1.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
sun.castShadow = true;
const SHADOW_SIZE = isMobile ? 1024 : 2048;
sun.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.38).normalize();

const TYPES = buildTypes();
const MATS = makeMaterials();

// 地面（模板测试：黑洞处不绘制地面）
const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: noiseTexture() });
Object.assign(groundMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
let groundMesh = null;

// ---------------- 黑洞视觉 ----------------
const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
const maskGeo = new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2);
const pitGeo = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 56, 6, true).translate(0, -0.5, 0);
  const P = g.attributes.position, col = new Float32Array(P.count * 3), top = new THREE.Color(0x2c2840), bot = new THREE.Color(0x000000), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const t = Math.pow(-P.getY(i), 0.45); c.copy(top).lerp(bot, t); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
})();
const pitMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
const bottomGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2).translate(0, -1, 0);
const bottomMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
const rimGeo = new THREE.RingGeometry(1, 1.045, 64).rotateX(-Math.PI / 2);
const ringGeo = new THREE.RingGeometry(1.1, 1.2, 72).rotateX(-Math.PI / 2);
const ringMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { prog: { value: 0 }, col: { value: new THREE.Color(0xffd23f) } },
  vertexShader: `varying vec2 p; void main(){ p = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float prog; uniform vec3 col; varying vec2 p; void main(){ float a = atan(p.x, -p.y)/6.2831853 + 0.5; float on = step(a, prog); gl_FragColor = vec4(mix(vec3(1.), col, on), mix(0.28, 0.95, on)); }`
});

// ---------------- 状态 ----------------
let city = null, objs = [], movers = [], falling = [], disturbed = new Set(), meshesByType = [], dirtyTypes = new Set();
let lanes = [];
let holes = [], player = null;
let state = 'menu', mode = 'classic', timeLeft = 120, gameTime = 0, totalValue = 1, eatenValue = 0;
let playerColor = 0x7b5cff, playerName = '鸭鸭';
const COLORS = [0x7b5cff, 0xff4d6d, 0x2ec4b6, 0xffb703, 0x3a86ff, 0x8ac926, 0xff7a1a, 0xf15bb5];
const AI_NAMES = ['小橘子', '夜行猫', '吞天大王', '西瓜太郎', '闪电侠', '饭团子', '螺蛳粉', '芝士喵', '黑旋风', '奶茶续命', '摸鱼达人', '虚空领主', '小笼包', '咕噜咕噜'];

// 等级：质量阈值与半径
const massFor = (L) => 8 * (Math.pow(1.6, L - 1) - 1);
const MAX_LEVEL = 16;
const radiusFor = (L) => 1.0 * Math.pow(1.225, L - 1);

// ---------------- 网格空间索引 ----------------
const GS = 10, GOFF = BOUND + 30, GN = Math.ceil((GOFF * 2) / GS);
let grid = [];
const cellIdx = (x, z) => { const i = Math.min(GN - 1, Math.max(0, Math.floor((x + GOFF) / GS))), j = Math.min(GN - 1, Math.max(0, Math.floor((z + GOFF) / GS))); return i * GN + j; };
function gridAdd(o) { o.cell = cellIdx(o.x, o.z); grid[o.cell].push(o); }
function gridRemove(o) { if (o.cell < 0) return; const a = grid[o.cell], k = a.indexOf(o); if (k >= 0) { a[k] = a[a.length - 1]; a.pop(); } o.cell = -1; }
function gridQuery(x, z, r, cb) {
  const i0 = Math.max(0, Math.floor((x - r + GOFF) / GS)), i1 = Math.min(GN - 1, Math.floor((x + r + GOFF) / GS));
  const j0 = Math.max(0, Math.floor((z - r + GOFF) / GS)), j1 = Math.min(GN - 1, Math.floor((z + r + GOFF) / GS));
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = grid[i * GN + j]; for (let k = a.length - 1; k >= 0; k--) cb(a[k]); }
}
const MAXFR = Math.max(...TYPES.list.map(t => t.fr));

// ---------------- 实例矩阵 ----------------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _mat = new THREE.Matrix4();
function writeMatrix(o) {
  _q.setFromAxisAngle(UP, o.yaw);
  if (o.tilt) { _ax.set(o.ax, 0, o.az); _q2.setFromAxisAngle(_ax, o.tilt); _q.premultiply(_q2); }
  if (o.state === 2 || o.hidden) { _p.set(0, -800, 0); _s.set(1e-4, 1e-4, 1e-4); }
  else { _p.set(o.x, o.y, o.z); _s.setScalar(o.scale); }
  _mat.compose(_p, _q, _s);
  const ms = meshesByType[o.t.id]; for (let i = 0; i < ms.length; i++) ms[i].setMatrixAt(o.idx, _mat);
  dirtyTypes.add(o.t.id);
}
function flushMatrices() { for (const id of dirtyTypes) for (const m of meshesByType[id]) m.instanceMatrix.needsUpdate = true; dirtyTypes.clear(); }

// ---------------- 城市构建 ----------------
function buildCity() {
  // 清理
  for (const ms of meshesByType) if (ms) for (const m of ms) { scene.remove(m); m.geometry.dispose(); m.dispose(); }
  if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); }
  city = generateCity(TYPES);
  objs = []; movers = []; falling = []; disturbed.clear(); grid = Array.from({ length: GN * GN }, () => []);
  const counts = new Array(TYPES.list.length).fill(0);
  const mk = (t, x, z, yaw) => { const o = { t, idx: counts[t.id]++, x, z, y: 0, yaw, tilt: 0, ax: 1, az: 0, tt: 0, state: 0, scale: 1, cell: -1, mover: null, hidden: false, id: objs.length }; objs.push(o); return o; };
  for (const s of city.objs) gridAdd(mk(s.t, s.x, s.z, s.yaw));
  lanes = city.lanes;
  for (const lane of lanes) for (const c of lane.cars) { const o = mk(c.t, 0, 0, 0); o.mover = { kind: 'car', lane, s: c.s, v: c.v }; c.o = o; movers.push(o); }
  for (const lane of lanes) lane.cars = lane.cars.map(c => c.o);
  for (const w of city.walkers) { const o = mk(w.t, 0, 0, 0); o.mover = { kind: 'walk', ...w, ph: Math.random() * 6 }; movers.push(o); }
  meshesByType = [];
  for (const t of TYPES.list) {
    const n = counts[t.id]; meshesByType[t.id] = [];
    if (!n) continue;
    for (const k in t.geos) {
      const mat = k === 'base' ? MATS.base : MATS.fac[k];
      const m = new THREE.InstancedMesh(t.geos[k], mat, n);
      m.castShadow = t.shadow; m.receiveShadow = t.cat === 'bld'; m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const fa = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1); fa.setUsage(THREE.DynamicDrawUsage);
      m.geometry = m.geometry.clone(); m.geometry.setAttribute('iFade', fa); m.fadeAttr = fa;
      scene.add(m); meshesByType[t.id].push(m);
    }
  }
  for (const o of objs) { if (o.mover) updateMover(o, 0); writeMatrix(o); }
  flushMatrices();
  groundMesh = new THREE.Mesh(buildGround(city.blockKinds), groundMat);
  groundMesh.receiveShadow = true; groundMesh.renderOrder = -5;
  scene.add(groundMesh);
  totalValue = objs.reduce((a, o) => a + o.t.value, 0); eatenValue = 0;
}

// ---------------- 移动物体 ----------------
let trafficT = 0;
function updateMover(o, dt) {
  const m = o.mover;
  if (m.kind === 'car') {
    const lane = m.lane, dir = lane.dir, half = o.t.fr * 0.95;
    let target = lane.speed;
    // 红绿灯
    const cyc = trafficT % 16, green = cyc < 7.2 ? 'x' : (cyc >= 8 && cyc < 15.2 ? 'z' : '');
    if (green !== lane.axis) for (const rc of roadCenters) { const stop = rc - dir * 6.8, ahead = (stop - (m.s + dir * half)) * dir; if (ahead > 0 && ahead < 3.5) { target = 0; break; } }
    // 跟车
    for (const c of lane.cars) { if (c === o || c.state) continue; let gap = (c.mover.s - m.s) * dir; if (gap < 0) gap += lane.L; if (gap - half - c.t.fr * 0.95 < 2.2 && gap > 0) { target = 0; break; } }
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
    o.x = m.cx + lx; o.z = m.cz + lz; o.yaw = yaw; o.y = Math.abs(Math.sin(m.ph)) * 0.07;
  }
}

// ---------------- 黑洞 ----------------
class Hole {
  constructor(name, color, isPlayer, skill = 1) {
    this.name = name; this.color = color; this.isPlayer = isPlayer; this.skill = skill;
    this.x = 0; this.z = 0; this.vx = 0; this.vz = 0; this.level = 1; this.mass = 0; this.score = 0;
    this.r = radiusFor(1); this.rTarget = this.r; this.alive = true; this.dying = 0; this.respawn = 0; this.prot = 0; this.kills = 0; this.out = false;
    this.ai = { t: 0, tx: 0, tz: 0, wx: 0, wz: 0 };
    this.group = new THREE.Group();
    this.mask = new THREE.Mesh(maskGeo, maskMat); this.mask.renderOrder = -10; this.mask.position.y = 0.09;
    this.pit = new THREE.Group(); this.pit.add(new THREE.Mesh(pitGeo, pitMat), new THREE.Mesh(bottomGeo, bottomMat));
    this.rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })); this.rim.position.y = 0.1;
    this.group.add(this.mask, this.pit, this.rim);
    if (isPlayer) { this.ring = new THREE.Mesh(ringGeo, ringMat); this.ring.position.y = 0.11; this.ring.renderOrder = 2; this.group.add(this.ring); }
    scene.add(this.group);
    this.label = document.createElement('div'); this.label.className = 'label' + (isPlayer ? ' me' : '');
    $('labels').appendChild(this.label); this.setLabel();
  }
  setLabel(crown) { this.label.innerHTML = (crown ? '<span class="crown">👑</span>' : '') + escapeHtml(this.name); this._crown = crown; }
  dispose() { scene.remove(this.group); this.label.remove(); this.rim.material.dispose(); }
  resetSize() { this.level = 1; this.mass = 0; this.r = 0.2; this.rTarget = radiusFor(1); }
  addMass(v) {
    this.mass += v;
    let up = false;
    while (this.mass >= massFor(this.level + 1) && this.level < MAX_LEVEL) { this.level++; up = true; }
    if (up) { this.rTarget = radiusFor(this.level); if (this.isPlayer) { sfx.levelUp(); flashLevel(); } }
  }
  progress() { const a = massFor(this.level), b = massFor(this.level + 1); return Math.min(1, (this.mass - a) / (b - a)); }
}
const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function randomSpawn(h) {
  let best = null, bestD = -1;
  for (let k = 0; k < 12; k++) {
    const x = (Math.random() * 2 - 1) * (HALF - 10), z = (Math.random() * 2 - 1) * (HALF - 10);
    let d = 1e9; for (const o of holes) if (o !== h && o.alive) d = Math.min(d, Math.hypot(o.x - x, o.z - z) - o.r * 2);
    if (d > bestD) { bestD = d; best = [x, z]; }
  }
  h.x = best[0]; h.z = best[1]; h.vx = h.vz = 0;
}

// ---------------- 交互：吞噬 / 倾倒 ----------------
function interact(h, o) {
  const dx = o.x - h.x, dz = o.z - h.z, reach = h.r + o.t.fr;
  const d2 = dx * dx + dz * dz; if (d2 > reach * reach) return;
  const d = Math.sqrt(d2), fr = o.t.fr, R = h.r;
  const nx = d > 1e-3 ? -dx / d : 1, nz = d > 1e-3 ? -dz / d : 0; // 指向洞中心
  if (fr < R * 0.92) {
    if (d < Math.max(R - fr * 0.4, R * 0.3)) { startFall(o, h); return; }
    const k = Math.min(1, Math.max(0, (R + fr * 0.35 - d) / (fr * 0.75 + 0.01)));
    disturb(o, nz, -nx, k * 0.55, -k * fr * 0.18);
  } else {
    const over = 1 - d / reach;
    disturb(o, nz, -nx, over * 0.09 * (0.6 + 0.4 * Math.sin(gameTime * 22 + o.id)), 0);
  }
}
function disturb(o, ax, az, tilt, y) {
  if (tilt > o.tt) { o.tt = tilt; o.ty = y; o.ax = ax; o.az = az; }
  disturbed.add(o);
}
function startFall(o, h) {
  gridRemove(o); disturbed.delete(o);
  if (o.mover && o.mover.kind === 'car') { const c = o.mover.lane.cars, k = c.indexOf(o); if (k >= 0) c.splice(k, 1); }
  o.state = 1; o.hole = h; o.rx = o.x - h.x; o.rz = o.z - h.z; o.rvx = 0; o.rvz = 0; o.vy = 0; o.y = Math.min(o.y, 0);
  o.spin = (Math.random() - 0.5) * 2;
  falling.push(o);
}
function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const o = falling[i], h = o.hole, fr = o.t.fr;
    const k = 14, damp = 5;
    o.rvx += (-o.rx * k - o.rvx * damp) * dt; o.rvz += (-o.rz * k - o.rvz * damp) * dt;
    o.rx += o.rvx * dt; o.rz += o.rvz * dt;
    const dist = Math.hypot(o.rx, o.rz), lim = Math.max(0, h.r - fr * 0.55);
    if (o.y < -0.2 && dist > lim) { const s = lim / dist; o.rx *= s; o.rz *= s; }
    o.x = h.x + o.rx; o.z = h.z + o.rz;
    const g = 22 + h.r * 4;
    o.vy -= g * dt; o.y += o.vy * dt;
    if (dist > 0.05) { const ax = -o.rz / dist, az = o.rx / dist; o.ax += (-ax - o.ax) * Math.min(1, dt * 6); o.az += (-az - o.az) * Math.min(1, dt * 6); const l = Math.hypot(o.ax, o.az) || 1; o.ax /= l; o.az /= l; }
    o.tilt += (1.35 - o.tilt) * Math.min(1, dt * 5 / (1 + o.t.h * 0.03));
    o.yaw += o.spin * dt;
    if (o.y < -(o.t.h + 1 + fr * 0.5)) { o.state = 2; falling.splice(i, 1); eaten(o, h); }
    writeMatrix(o);
  }
}
function eaten(o, h) {
  h.addMass(o.t.value); const pts = o.t.value * 10; h.score += pts; eatenValue += o.t.value;
  if (h.isPlayer) { sfx.pop(o.t.fr * 1.3); popup(pts); if (o.t.cat === 'bld' && navigator.vibrate) navigator.vibrate(15); }
  else if (player && Math.hypot(h.x - player.x, h.z - player.z) < 40 && o.t.fr > 2) sfx.pop(o.t.fr * 1.3);
}
function updateDisturbed(dt) {
  for (const o of disturbed) {
    const tgt = o.tt, ty = o.ty || 0;
    o.tilt += (tgt - o.tilt) * Math.min(1, dt * 12);
    o.y += (ty - o.y) * Math.min(1, dt * 12);
    o.tt = 0; o.ty = 0;
    if (tgt === 0 && o.tilt < 0.002 && Math.abs(o.y) < 0.002) { o.tilt = 0; if (!o.mover) o.y = 0; disturbed.delete(o); }
    if (!o.mover) writeMatrix(o);
  }
}

// ---------------- 输入 ----------------
const input = { keys: new Set(), joy: null, mouse: null, mouseActive: false };
const joyEl = $('joy'), knobEl = $('joyKnob');
const JOY_R = 55;
canvas.addEventListener('pointerdown', (e) => {
  sfx.init();
  if (e.pointerType === 'mouse') { input.mouse = { x: e.clientX, y: e.clientY }; input.mouseActive = true; return; }
  if (input.joy) return;
  input.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  joyEl.classList.remove('hidden'); joyEl.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; knobEl.style.transform = '';
}, { passive: true });
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { input.mouse = { x: e.clientX, y: e.clientY }; input.mouseActive = true; return; }
  const j = input.joy; if (!j || j.id !== e.pointerId) return;
  j.x = e.clientX; j.y = e.clientY;
  let dx = j.x - j.ox, dy = j.y - j.oy; const l = Math.hypot(dx, dy);
  if (l > JOY_R) { j.ox += dx * (1 - JOY_R / l); j.oy += dy * (1 - JOY_R / l); dx = j.x - j.ox; dy = j.y - j.oy; joyEl.style.transform = `translate(${j.ox}px,${j.oy}px)`; }
  knobEl.style.transform = `translate(${dx}px,${dy}px)`;
}, { passive: true });
const endJoy = (e) => { if (input.joy && input.joy.id === e.pointerId) { input.joy = null; joyEl.classList.add('hidden'); } };
window.addEventListener('pointerup', endJoy); window.addEventListener('pointercancel', endJoy);
document.addEventListener('mouseleave', () => { input.mouseActive = false; });
window.addEventListener('keydown', (e) => { input.keys.add(e.code); if (e.code === 'Escape' && state === 'play') pause(true); });
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
window.addEventListener('blur', () => input.keys.clear());
const _v = new THREE.Vector3();
function readInput() {
  const K = input.keys; let x = 0, z = 0;
  if (K.has('KeyA') || K.has('ArrowLeft')) x -= 1; if (K.has('KeyD') || K.has('ArrowRight')) x += 1;
  if (K.has('KeyW') || K.has('ArrowUp')) z -= 1; if (K.has('KeyS') || K.has('ArrowDown')) z += 1;
  if (x || z) { const l = Math.hypot(x, z); input.mouseActive = false; return [x / l, z / l]; }
  if (input.joy) { const dx = input.joy.x - input.joy.ox, dy = input.joy.y - input.joy.oy, l = Math.hypot(dx, dy); if (l < 4) return [0, 0]; const m = Math.min(1, l / (JOY_R * 0.7)); return [dx / l * m, dy / l * m]; }
  if (input.mouseActive && input.mouse && player) {
    _v.set(player.x, 0, player.z).project(camera);
    const hx = (_v.x * 0.5 + 0.5) * innerWidth, hy = (-_v.y * 0.5 + 0.5) * innerHeight;
    const dx = input.mouse.x - hx, dy = input.mouse.y - hy, l = Math.hypot(dx, dy);
    const dead = 12, full = Math.min(innerWidth, innerHeight) * 0.18;
    if (l < dead) return [0, 0];
    const m = Math.min(1, (l - dead) / full); return [dx / l * m, dy / l * m];
  }
  return [0, 0];
}

// ---------------- AI ----------------
function aiThink(h) {
  const ai = h.ai; ai.t = 0.3 + Math.random() * 0.35;
  let fx = 0, fz = 0, threat = false, prey = null, preyD = 1e9;
  for (const o of holes) {
    if (o === h || !o.alive || o.dying) continue;
    const dx = h.x - o.x, dz = h.z - o.z, d = Math.hypot(dx, dz) || 0.01;
    if (o.r > h.r * 1.1 && d < o.r + h.r + 7 + h.r * 1.5 && Math.random() < 0.6 + h.skill * 0.4) { fx += dx / d * (1 / d); fz += dz / d * (1 / d); threat = true; }
    else if (h.r > o.r * 1.18 && o.prot <= 0 && d < 16 + h.r * 2.5 && d < preyD) { prey = o; preyD = d; }
  }
  if (threat) { const l = Math.hypot(fx, fz); ai.tx = h.x + fx / l * 30; ai.tz = h.z + fz / l * 30; ai.mode = 'flee'; return; }
  if (prey && Math.random() < h.skill) { ai.tx = prey.x + prey.vx * 0.4; ai.tz = prey.z + prey.vz * 0.4; ai.mode = 'chase'; return; }
  let best = null, bs = 0; const R = 12 + h.r * 3;
  gridQuery(h.x, h.z, R, (o) => {
    if (o.t.fr >= h.r * 0.9) return;
    const d = Math.hypot(o.x - h.x, o.z - h.z); const s = o.t.value / (d + 3) * (0.7 + Math.random() * 0.6);
    if (s > bs) { bs = s; best = o; }
  });
  if (best) { ai.tx = best.x; ai.tz = best.z; ai.mode = 'eat'; return; }
  if (ai.mode !== 'wander' || Math.hypot(ai.tx - h.x, ai.tz - h.z) < 5) { ai.tx = (Math.random() * 2 - 1) * (HALF - 15); ai.tz = (Math.random() * 2 - 1) * (HALF - 15); }
  ai.mode = 'wander';
}
function aiDir(h, dt) {
  h.ai.t -= dt; if (h.ai.t <= 0) aiThink(h);
  const dx = h.ai.tx - h.x, dz = h.ai.tz - h.z, d = Math.hypot(dx, dz);
  if (d < 0.3) { h.ai.t = 0; return [0, 0]; }
  const m = Math.min(1, d / 2) * (0.82 + 0.18 * h.skill);
  const wob = Math.sin(gameTime * 1.3 + h.skill * 10) * 0.15;
  return [dx / d * m - dz / d * wob, dz / d * m + dx / d * wob];
}

// ---------------- 每帧更新 ----------------
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
      let dir = [0, 0];
      if (state === 'play') dir = (h.isPlayer && !h.autopilot) ? readInput() : aiDir(h, dt);
      const speed = (7.2 + h.r * 0.9) * (h.isPlayer ? 1 : 0.86 + 0.1 * h.skill);
      const a = 1 - Math.exp(-dt * (h.isPlayer ? 11 : 6));
      h.vx += (dir[0] * speed - h.vx) * a; h.vz += (dir[1] * speed - h.vz) * a;
      h.x += h.vx * dt; h.z += h.vz * dt;
      const lim = BOUND - h.r * 0.4; h.x = Math.max(-lim, Math.min(lim, h.x)); h.z = Math.max(-lim, Math.min(lim, h.z));
      h.r += (h.rTarget - h.r) * (1 - Math.exp(-dt * 4));
      if (h.prot > 0) h.prot -= dt;
    }
    const r = Math.max(0.01, h.r), depth = Math.max(4, r * 3.2);
    h.group.position.set(h.x, 0, h.z);
    h.mask.scale.set(r, 1, r); h.rim.scale.set(r, 1, r);
    h.pit.scale.set(r * 0.999, depth, r * 0.999);
    if (h.ring) { h.ring.scale.set(r, 1, r); ringMat.uniforms.prog.value = h.progress(); }
    h.rim.material.opacity = h.prot > 0 ? (Math.sin(gameTime * 18) > 0 ? 0.9 : 0.15) : 0.9;
  }
  // 洞吃洞
  if (state !== 'play') return;
  for (const a of holes) for (const b of holes) {
    if (a === b || !a.alive || !b.alive || b.prot > 0 || a.prot > 0) continue;
    if (a.r > b.r * 1.12) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < a.r - b.r * 0.3) holeEaten(b, a); }
  }
}
function holeEaten(b, a) {
  b.alive = false; b.dying = 0.5; b.eater = a; a.kills++;
  a.addMass(b.mass * 0.3 + 5); a.score += 200 + Math.round(b.mass * 5);
  feed(`<b style="color:${hex(a.color)}">${escapeHtml(a.name)}</b> 吞掉了 <b style="color:${hex(b.color)}">${escapeHtml(b.name)}</b>`);
  if (a.isPlayer) { sfx.eatHole(); popup(200 + Math.round(b.mass * 5)); }
  if (b.isPlayer) { sfx.eaten(); }
  if (mode === 'battle') { b.out = true; b.respawn = 0; if (b.isPlayer) setTimeout(() => endGame('被吞噬'), 1200); else checkBattleEnd(); }
  else { b.respawn = 3.5; if (b.isPlayer) { $('deadBy').textContent = `你被「${a.name}」吞掉了！`; $('dead').classList.remove('hidden'); } }
}
function checkBattleEnd() { const alive = holes.filter(h => !h.out); if (alive.length <= 1 && state === 'play') setTimeout(() => endGame('胜利'), 1000); }
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function interactions() {
  for (const h of holes) {
    if (!h.alive || h.r < 0.05) continue;
    gridQuery(h.x, h.z, h.r + MAXFR, (o) => interact(h, o));
    for (const o of movers) if (o.state === 0 && !o.hidden) { const dx = o.x - h.x, dz = o.z - h.z, r = h.r + o.t.fr; if (dx * dx + dz * dz < r * r) interact(h, o); }
  }
}

// ---------------- 遮挡淡出 ----------------
const fading = new Set(); const fadeDirty = new Set();
function updateOcclusion(dt) {
  const h = player;
  if (h && state !== 'menu') {
    const r = Math.max(h.r, 1), tanP = 1 / Math.tan(PITCH);
    gridQuery(h.x, h.z + 25, 60, (o) => {
      if (o.t.h < 9 || o.state) return;
      const dz = o.z - h.z, reachZ = o.t.h * tanP + o.t.fr * 0.8;
      if (dz > -o.t.fr * 0.4 && dz < reachZ && Math.abs(o.x - h.x) < o.t.fr * 0.8 + r * 0.7) { o.fadeT = 0.35; fading.add(o); }
    });
  }
  for (const o of fading) {
    const tgt = o.fadeT ?? 1; o.fadeT = 1;
    const f = o.fade ?? 1, nf = f + (tgt - f) * Math.min(1, dt * 8);
    o.fade = Math.abs(nf - tgt) < 0.01 ? tgt : nf;
    for (const m of meshesByType[o.t.id]) { m.fadeAttr.array[o.idx] = o.fade; fadeDirty.add(m); }
    if (o.fade === 1 && tgt === 1) fading.delete(o);
  }
  for (const m of fadeDirty) m.fadeAttr.needsUpdate = true; fadeDirty.clear();
}

// ---------------- 相机 ----------------
let camD = 30, camX = 0, camZ = 0, menuAng = 0;
const PITCH = 60 * Math.PI / 180;
function updateCamera(dt) {
  const tan = Math.tan(camera.fov * Math.PI / 360), aspect = camera.aspect;
  let tx, tz, want;
  if (state === 'menu') {
    menuAng += dt * 0.05; tx = Math.sin(menuAng) * 50; tz = Math.cos(menuAng * 0.7) * 50; want = 95;
  } else {
    const h = player; tx = h.x; tz = h.z;
    const r = Math.max(h.rTarget, 1);
    const halfH = 8 + r * 3.3, halfW = 8 + r * 2.5;
    want = Math.max(halfH / tan, halfW / (tan * aspect));
  }
  const a = 1 - Math.exp(-dt * (state === 'menu' ? 1 : 9));
  camX += (tx - camX) * a; camZ += (tz - camZ) * a; camD += (want - camD) * (1 - Math.exp(-dt * 2.2));
  camera.position.set(camX, Math.sin(PITCH) * camD, camZ + Math.cos(PITCH) * camD);
  camera.lookAt(camX, 0, camZ - camD * 0.04);
  // 阴影相机跟随
  const S = Math.min(170, Math.max(28, camD * 0.85));
  const sc = sun.shadow.camera;
  if (Math.abs(sc.right - S) > 2) { sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.updateProjectionMatrix(); }
  const texel = (2 * S) / SHADOW_SIZE; const sx = Math.round(camX / texel) * texel, sz = Math.round((camZ - camD * 0.15) / texel) * texel;
  sun.target.position.set(sx, 0, sz); sun.position.set(sx + SUN_DIR.x * 200, SUN_DIR.y * 200, sz + SUN_DIR.z * 200);
  scene.fog.near = camD * 1.6; scene.fog.far = camD * 4 + 120;
}

// ---------------- HUD ----------------
const popPool = []; let popAcc = 0, popT = 0;
function popup(pts) { popAcc += pts; }
function flushPop(dt) {
  popT -= dt; if (popAcc <= 0 || popT > 0 || !player) return;
  popT = 0.12;
  let el = popPool.find(e => !e._busy);
  if (!el) { el = document.createElement('div'); el.className = 'pop'; $('pops').appendChild(el); popPool.push(el); el.addEventListener('animationend', () => { el._busy = false; el.style.display = 'none'; }); }
  _v.set(player.x, 0, player.z - player.r).project(camera);
  const x = (_v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 40, y = (-_v.y * 0.5 + 0.5) * innerHeight - 20;
  el._busy = true; el.textContent = '+' + popAcc; el.style.display = 'block';
  el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  popAcc = 0;
}
function feed(html) { const d = document.createElement('div'); d.innerHTML = html; $('feed').prepend(d); setTimeout(() => d.remove(), 3500); while ($('feed').children.length > 4) $('feed').lastChild.remove(); }
function flashLevel() { const el = $('lvl'); el.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' }); }
let hudT = 0, lastSec = -1;
function updateHud(dt) {
  hudT -= dt;
  const t = Math.max(0, Math.ceil(timeLeft));
  const tEl = $('timer'); tEl.textContent = `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
  tEl.classList.toggle('warn', t <= 10);
  if (t <= 10 && t !== lastSec && state === 'play' && t > 0) sfx.tick(); lastSec = t;
  $('lvlNum').textContent = player.level;
  $('lvlArc').style.strokeDashoffset = 125.6 * (1 - player.progress());
  $('myScore').textContent = player.score;
  if (mode === 'solo') { const p = Math.min(100, eatenValue / totalValue * 100); $('soloTxt').textContent = `城市吞噬 ${p.toFixed(1)}%`; $('soloBar').style.width = p + '%'; }
  if (hudT <= 0) {
    hudT = 0.25;
    const sorted = [...holes].sort((a, b) => b.score - a.score);
    let html = '';
    sorted.forEach((h, i) => { if (i < 5 || h.isPlayer) html += `<div class="${h.isPlayer ? 'me' : ''} ${h.out ? 'dead' : ''}"><em>${i + 1}</em><i style="background:${hex(h.color)}"></i><span>${escapeHtml(h.name)}</span><b>${h.score}</b></div>`; });
    $('lb').innerHTML = html;
    const leader = sorted[0];
    for (const h of holes) { const c = h === leader && h.score > 0; if (c !== h._crown) h.setLabel(c); }
  }
  if (!player.alive && player.respawn > 0 && mode !== 'battle') $('deadT').textContent = `${Math.ceil(player.respawn)} 秒后复活`;
}
function updateLabels() {
  for (const h of holes) {
    if (!h.group.visible || state === 'menu') { h.label.style.display = 'none'; continue; }
    _v.set(h.x, 0, h.z - h.r * 1.05).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) { h.label.style.display = 'none'; continue; }
    h.label.style.display = 'block';
    h.label.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px,${(-_v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-120%)`;
  }
}

// ---------------- 游戏流程 ----------------
function clearHoles() { for (const h of holes) h.dispose(); holes = []; player = null; }
function setupHoles(withPlayer, nAI) {
  clearHoles();
  const cols = COLORS.filter(c => c !== playerColor).sort(() => Math.random() - 0.5);
  const names = [...AI_NAMES].sort(() => Math.random() - 0.5);
  if (withPlayer) { player = new Hole(playerName || '我', playerColor, true); holes.push(player); }
  for (let i = 0; i < nAI; i++) holes.push(new Hole(names[i], cols[i % cols.length], false, 0.45 + Math.random() * 0.55));
  for (const h of holes) randomSpawn(h);
  if (player) { randomSpawn(player); randomSpawnOthersAway(); }
}
function randomSpawnOthersAway() { for (const h of holes) if (!h.isPlayer && Math.hypot(h.x - player.x, h.z - player.z) < 30) { h.x = -h.x || 60; h.z = -h.z || 60; } }

function showMenu() {
  state = 'menu';
  ['hud', 'over', 'count', 'dead', 'paused'].forEach(id => $(id).classList.add('hidden'));
  $('menu').classList.remove('hidden');
  buildCity(); setupHoles(false, 0); sfx.stopMusic();
}
let countT = 0;
function startGame() {
  sfx.init();
  playerName = ($('nameInput').value || '').trim() || '我';
  try { localStorage.setItem('bh_name', playerName); localStorage.setItem('bh_color', playerColor); } catch (e) { }
  buildCity();
  const nAI = mode === 'solo' ? 0 : mode === 'battle' ? 7 : 5;
  setupHoles(true, nAI);
  timeLeft = 120; gameTime = 0; trafficT = 0;
  camX = player.x; camZ = player.z; camD = 40;
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('solo').classList.toggle('hidden', mode !== 'solo');
  $('modeName').textContent = { classic: '经典模式', battle: '大逃杀', solo: '单人模式' }[mode];
  $('feed').innerHTML = '';
  state = 'countdown'; countT = 3.0; lastCount = 4;
}
let lastCount = 4;
function updateCountdown(dt) {
  countT -= dt; const n = Math.ceil(countT);
  const el = $('count');
  if (n !== lastCount) {
    lastCount = n; el.classList.remove('hidden', 'anim'); void el.offsetWidth; el.classList.add('anim');
    if (n > 0) { el.textContent = n; sfx.count(); } else { el.textContent = '开吃！'; sfx.go(); sfx.startMusic(); }
  }
  if (countT <= 0 && state === 'countdown') { state = 'play'; setTimeout(() => el.classList.add('hidden'), 700); }
}
function endGame(reason) {
  if (state === 'over') return;
  state = 'over'; sfx.stopMusic(); sfx.fanfare();
  $('dead').classList.add('hidden'); input.joy = null; joyEl.classList.add('hidden');
  const sorted = [...holes].sort((a, b) => (mode === 'battle' ? (a.out - b.out) || (b.score - a.score) : b.score - a.score));
  const rank = sorted.indexOf(player) + 1;
  $('overTitle').textContent = reason === '被吞噬' ? '你被吞掉了！' : (mode === 'solo' ? '时间到！' : rank === 1 ? '🏆 你赢了！' : '时间到！');
  if (mode === 'solo') $('myRank').innerHTML = `吞噬了城市的 <b>${(eatenValue / totalValue * 100).toFixed(1)}%</b> · 得分 <b>${player.score}</b> · Lv.${player.level}`;
  else $('myRank').innerHTML = `你的排名：<b>第 ${rank} 名</b> · 得分 <b>${player.score}</b> · 吞掉对手 ${player.kills} 次`;
  const medal = ['🥇', '🥈', '🥉'];
  $('rankList').innerHTML = sorted.map((h, i) => `<li class="${h.isPlayer ? 'me' : ''}"><span class="r">${medal[i] || i + 1}</span><i style="background:${hex(h.color)}"></i><span>${escapeHtml(h.name)}${h.out && mode === 'battle' ? ' 💀' : ''}</span><b>${h.score}</b></li>`).join('');
  try { const best = +localStorage.getItem('bh_best_' + mode) || 0; if (player.score > best) { localStorage.setItem('bh_best_' + mode, player.score); $('myRank').innerHTML += '<br>🎉 新纪录！'; } else $('myRank').innerHTML += `<br><small>最佳：${best}</small>`; } catch (e) { }
  setTimeout(() => $('over').classList.remove('hidden'), 900);
}
let paused = false;
function pause(p) { if (state !== 'play' && state !== 'countdown') return; paused = p; $('paused').classList.toggle('hidden', !p); if (p) sfx.stopMusic(); else sfx.startMusic(); }

// ---------------- UI 绑定 ----------------
(function initUI() {
  try { const n = localStorage.getItem('bh_name'); if (n) $('nameInput').value = n; const c = +localStorage.getItem('bh_color'); if (c) playerColor = c; } catch (e) { }
  const sk = $('skins');
  COLORS.forEach(c => { const b = document.createElement('button'); b.style.setProperty('--c', hex(c)); if (c === playerColor) b.classList.add('active'); b.onclick = () => { playerColor = c; [...sk.children].forEach(x => x.classList.remove('active')); b.classList.add('active'); }; sk.appendChild(b); });
  document.querySelectorAll('.mode').forEach(b => b.onclick = () => { document.querySelectorAll('.mode').forEach(x => x.classList.remove('active')); b.classList.add('active'); mode = b.dataset.mode; });
  $('startBtn').onclick = startGame; $('againBtn').onclick = startGame; $('homeBtn').onclick = showMenu;
  $('muteBtn').onclick = () => { sfx.init(); sfx.setMuted(!sfx.muted); $('muteBtn').textContent = sfx.muted ? '🔇' : '🔊'; };
  $('pauseBtn').onclick = () => pause(true); $('resumeBtn').onclick = () => pause(false);
  $('quitBtn').onclick = () => { paused = false; showMenu(); };
  if (isMobile) $('tip').textContent = '按住屏幕任意位置拖动，控制黑洞移动';
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(true); });
})();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 50 : 42; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------------- 主循环 ----------------
let last = performance.now(), frameN = 0, perfAcc = 0, perfN = 0, perfHold = 3;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (paused) { renderer.render(scene, camera); return; }
  // 动态分辨率，保证流畅
  perfAcc += dt; perfN++; perfHold -= dt;
  if (perfAcc > 1.5) {
    const avg = perfAcc / perfN;
    if (perfHold <= 0) {
      if (avg > 1 / 45 && pr > 0.75) { pr = Math.max(0.75, pr - 0.25); renderer.setPixelRatio(pr); resize(); perfHold = 2; }
      else if (avg < 1 / 58 && pr < maxPR) { pr = Math.min(maxPR, pr + 0.25); renderer.setPixelRatio(pr); resize(); perfHold = 6; }
    }
    perfAcc = 0; perfN = 0;
  }
  step(dt);
  updateCamera(dt);
  updateOcclusion(dt);
  if (player) { updateHud(dt); flushPop(dt); }
  updateLabels();
  if (isMobile) { renderer.shadowMap.autoUpdate = false; if (frameN % 2 === 0) renderer.shadowMap.needsUpdate = true; }
  frameN++;
  const t0 = performance.now();
  renderer.render(scene, camera);
  renderMs = renderMs * 0.95 + (performance.now() - t0) * 0.05;
}
let renderMs = 0, stepMs = 0;
function step(dt) {
  const t0 = performance.now();
  gameTime += dt; trafficT += dt;
  if (state === 'countdown') updateCountdown(dt);
  if (state === 'play') {
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endGame('时间到'); }
  }
  for (const o of movers) if (o.state === 0) { updateMover(o, dt); if (!disturbed.has(o)) writeMatrix(o); }
  updateHoles(dt);
  if (state === 'play' || state === 'menu') interactions();
  updateDisturbed(dt);
  for (const o of disturbed) if (o.mover) writeMatrix(o);
  updateFalling(dt);
  flushMatrices();
  stepMs = stepMs * 0.95 + (performance.now() - t0) * 0.05;
}

// 测试钩子
window.__bh = { get state() { return state; }, get player() { return player; }, get holes() { return holes; }, get objs() { return objs; }, renderer, startGame, step, get perf() { return { stepMs, renderMs, pr, info: renderer.info.render }; }, get total() { return totalValue; }, get eaten() { return eatenValue / totalValue; }, endGame, setMode: (m) => mode = m, setTime: (t) => timeLeft = t };

showMenu();
$('loading').remove();
requestAnimationFrame(frame);

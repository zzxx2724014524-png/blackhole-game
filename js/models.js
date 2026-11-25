// v2 原创可爱风低多边形模型：顶点色 + 实例染色(tint) + 程序生成贴图图集（立面窗户）
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from '../lib/RoundedBoxGeometry.js?v=2';

const PI = Math.PI;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export const TILE = { apt: 0, house: 1, office: 2, tower: 3, store: 4, seg: 5, awning: 6, bus: 7, roof: 8, brick: 9, carwin: 10, sign: 11, seg2: 12, door: 13 };

export class GB {
  constructor() { this.parts = []; }
  // o: {tint:0|1, tile:-1.., cw, ch}
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3), tint = new Float32Array(n), tile = new Float32Array(n), uv = new Float32Array(n * 2);
    _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; tint[i] = o.tint ? 1 : 0; tile[i] = -1; }
    if (o.tile !== undefined && o.tile >= 0) {
      g.computeBoundingBox(); const b = g.boundingBox;
      const w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z;
      const cw = o.cw || 3, ch = o.ch || 3;
      const cx = Math.max(1, Math.round(w / cw)), cz = Math.max(1, Math.round(d / cw)), cy = Math.max(1, Math.round(h / ch));
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < n; i++) {
        const nx = N.getX(i), ny = N.getY(i);
        if (Math.abs(ny) > 0.5) continue;
        tile[i] = o.tile;
        const v = (P.getY(i) - b.min.y) / h * cy;
        const u = Math.abs(nx) > 0.5 ? (P.getZ(i) - b.min.z) / d * cz : (P.getX(i) - b.min.x) / w * cx;
        uv[i * 2] = u; uv[i * 2 + 1] = v;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
    g.setAttribute('tile', new THREE.BufferAttribute(tile, 1));
    g.setAttribute('auv', new THREE.BufferAttribute(uv, 2));
    this.parts.push(g); return this;
  }
  box(w, h, d, c, x = 0, y = 0, z = 0, o, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, rx, ry, rz, 1, 1, 1, o); }
  rbox(w, h, d, r, c, x = 0, y = 0, z = 0, o, ry = 0) { return this.add(new RoundedBoxGeometry(w, h, d, 1, r), c, x, y + h / 2, z, 0, ry, 0, 1, 1, 1, o); }
  cyl(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8, o) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, 0, 0, 0, 1, 1, 1, o); }
  cylC(rt, rb, h, c, x, y, z, rx, ry, rz, seg = 8, o) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz, 1, 1, 1, o); }
  cone(r, h, c, x = 0, y = 0, z = 0, seg = 7, ry = 0, o) { return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 0, ry, 0, 1, 1, 1, o); }
  ico(r, c, x, y, z, sx = 1, sy = 1, sz = 1, o) { return this.add(new THREE.IcosahedronGeometry(r, 0), c, x, y, z, 0, 0, 0, sx, sy, sz, o); }
  sph(r, c, x, y, z, ws = 8, hs = 6, sy = 1, o) { return this.add(new THREE.SphereGeometry(r, ws, hs), c, x, y, z, 0, 0, 0, 1, sy, 1, o); }
  build() { const g = mergeGeometries(this.parts); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }
}

// ---------- 图集 512x512, 4x4 格 ----------
function makeAtlas() {
  const S = 512, C = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
  const cell = (t, fn) => { const col = t % 4, row = (t / 4) | 0; x.save(); x.translate(col * C, (3 - row) * C); x.beginPath(); x.rect(0, 0, C, C); x.clip(); fn(); x.restore(); };
  const rr = (X, Y, W, H, R, fill) => { x.fillStyle = fill; x.beginPath(); x.roundRect(X, Y, W, H, R); x.fill(); };
  const glass = (X, Y, W, H, R = 6, a = '#bfe6ff', b = '#5a8fc7') => {
    const g = x.createLinearGradient(X, Y, X + W * 0.3, Y + H); g.addColorStop(0, a); g.addColorStop(1, b);
    rr(X, Y, W, H, R, g);
    x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.moveTo(X + W * 0.15, Y + H * 0.9); x.lineTo(X + W * 0.55, Y + H * 0.1); x.lineTo(X + W * 0.72, Y + H * 0.1); x.lineTo(X + W * 0.32, Y + H * 0.9); x.fill();
  };
  cell(TILE.apt, () => { rr(26, 18, 76, 80, 10, '#ffffff'); glass(32, 24, 64, 66, 8); x.fillStyle = '#fff'; x.fillRect(62, 24, 4, 66); rr(20, 96, 88, 12, 5, '#e8e2da'); x.fillStyle = '#ff9fb2'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(32 + i * 16, 94, 6, 0, 7); x.fill(); } });
  cell(TILE.house, () => { rr(34, 26, 60, 70, 8, '#ffffff'); glass(40, 32, 48, 58, 6); x.fillStyle = '#fff'; x.fillRect(62, 32, 4, 58); x.fillRect(40, 59, 48, 4); rr(16, 26, 16, 70, 4, '#d5cfc6'); rr(96, 26, 16, 70, 4, '#d5cfc6'); });
  cell(TILE.office, () => { glass(4, 4, 120, 88, 3, '#c9ecff', '#4f86c6'); x.fillStyle = '#fff'; x.fillRect(62, 4, 4, 88); rr(0, 96, 128, 32, 0, '#e9eef3'); });
  cell(TILE.tower, () => { glass(3, 0, 122, 116, 2, '#d4f1ff', '#3f78b8'); x.fillStyle = '#fff'; for (const X of [0, 42, 84, 125]) x.fillRect(X, 0, 3, 116); x.fillStyle = '#e3e9ef'; x.fillRect(0, 116, 128, 12); });
  cell(TILE.store, () => { glass(6, 20, 116, 104, 4, '#e1f5ff', '#7fb3dd'); x.fillStyle = '#fff'; x.fillRect(62, 20, 4, 104); rr(0, 0, 128, 16, 0, '#ffffff'); });
  cell(TILE.seg, () => { rr(0, 0, 128, 14, 0, '#ffffff'); glass(14, 26, 44, 60, 8); glass(70, 26, 44, 60, 8); rr(4, 92, 120, 8, 4, '#ffffff'); for (let i = 0; i < 10; i++) x.fillRect(8 + i * 12, 100, 4, 18); rr(4, 116, 120, 6, 3, '#ffffff'); });
  cell(TILE.seg2, () => { rr(0, 0, 128, 12, 0, '#ffffff'); glass(10, 24, 108, 50, 10, '#ffe6f0', '#d07aa0'); x.fillStyle = '#fff'; x.fillRect(46, 24, 4, 50); x.fillRect(80, 24, 4, 50); rr(0, 84, 128, 44, 0, '#f2efe9'); x.fillStyle = '#e0dbd3'; for (let i = 0; i < 4; i++) x.fillRect(0, 92 + i * 9, 128, 2); });
  cell(TILE.awning, () => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff6b6b'; x.fillRect(i * 16, 0, 16, 128); } x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 110, 128, 18); });
  cell(TILE.bus, () => { rr(0, 0, 128, 128, 0, '#ffffff'); glass(6, 10, 52, 70, 8, '#d8f0ff', '#2f4f73'); glass(70, 10, 52, 70, 8, '#d8f0ff', '#2f4f73'); });
  cell(TILE.roof, () => { for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) rr(c * 16 + (r % 2) * 8, r * 16, 15, 15, 5, r % 2 ? '#f2f2f2' : '#dcdcdc'); });
  cell(TILE.brick, () => { x.fillStyle = '#ececec'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#ffffff'; for (let r = 0; r < 12; r++) for (let c = -1; c < 6; c++) x.fillRect(c * 24 + (r % 2) * 12 + 1, r * 11 + 1, 22, 9); rr(30, 22, 68, 76, 8, '#fff'); glass(36, 28, 56, 64, 6); });
  cell(TILE.carwin, () => { glass(0, 0, 128, 128, 0, '#cfe9ff', '#2c4a6e'); });
  cell(TILE.sign, () => { rr(0, 0, 128, 128, 0, '#ffffff'); const cs = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c']; for (let i = 0; i < 4; i++) { x.fillStyle = cs[i]; x.beginPath(); x.arc(20 + i * 29, 64, 12, 0, 7); x.fill(); } });
  cell(TILE.door, () => { rr(0, 0, 128, 128, 0, '#ffffff'); rr(36, 30, 56, 98, 10, '#a0785a'); x.fillStyle = '#ffd43b'; x.beginPath(); x.arc(80, 82, 5, 0, 7); x.fill(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}

export function makeMaterial() {
  const atlas = makeAtlas();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.atlas = { value: atlas };
    sh.vertexShader = 'attribute float tint;\nattribute float tile;\nattribute vec2 auv;\nattribute float iFade;\nvarying float vTile;\nvarying vec2 vAuv;\nvarying float vFade;\n' +
      sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
        vColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, tint);
      #endif
      vTile = tile; vAuv = auv; vFade = iFade;`);
    sh.fragmentShader = 'uniform sampler2D atlas;\nvarying float vTile;\nvarying vec2 vAuv;\nvarying float vFade;\n' +
      sh.fragmentShader.replace('void main() {', `void main() {
        if (vFade < 0.99) {
          vec2 p = mod(floor(gl_FragCoord.xy), 4.0); vec2 a = mod(p, 2.0), b = floor(p / 2.0);
          float th = (4.0 * mod(2.0 * a.x + 3.0 * a.y, 4.0) + mod(2.0 * b.x + 3.0 * b.y, 4.0) + 0.5) / 16.0;
          if (vFade < th) discard;
        }`).replace('#include <color_fragment>', `#include <color_fragment>
        if (vTile > -0.5) {
          float t = floor(vTile + 0.5); vec2 cell = vec2(mod(t, 4.0), floor(t / 4.0));
          vec2 f = fract(vAuv);
          vec2 auv = (cell + 0.03 + f * 0.94) * 0.25;
          diffuseColor.rgb *= textureGrad(atlas, auv, dFdx(vAuv) * 0.235, dFdy(vAuv) * 0.235).rgb;
        }`);
  };
  mat.customProgramCacheKey = () => 'bh2';
  return mat;
}

// ---------- 调色板 ----------
export const PAL = {
  car: [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xb197fc, 0xff922b, 0xf8f9fa, 0xff8cc6, 0x3bc9db],
  shirt: [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xb197fc, 0xff922b, 0xffffff, 0xff8cc6, 0x20c997],
  wall: [0xffe3e3, 0xfff3bf, 0xd3f9d8, 0xd0ebff, 0xe5dbff, 0xffe8cc, 0xf8f9fa, 0xc5f6fa, 0xffdeeb],
  glass: [0xa5d8ff, 0x99e9f2, 0xb2f2bb, 0xd0bfff, 0xffd8a8, 0xbac8ff],
  seg: [0xff8787, 0xffa94d, 0xffd43b, 0x8ce99a, 0x66d9e8, 0x74c0fc, 0xb197fc, 0xf783ac, 0xffc9c9, 0x96f2d7],
  leaf: [0x69db7c, 0x51cf66, 0x8ce99a, 0x94d82d, 0x40c057],
  awn: [0xff6b6b, 0x4dabf7, 0x69db7c, 0xffa94d, 0xb197fc],
  white: [0xffffff],
};
const GL = 0x3b5b7e, TIRE = 0x343a40, WHITE = 0xffffff, GREY = 0xadb5bd, DGREY = 0x495057;
const T1 = { tint: 1 };

// ---------- 车辆 ----------
function wheels(g, xs, zs, r = 0.42, w = 0.34) {
  for (const sx of [-1, 1]) for (const z of zs) { g.cylC(r, r, w, TIRE, sx * xs, r, z, 0, 0, PI / 2, 10); g.cylC(r * 0.5, r * 0.5, w + 0.04, 0xe9ecef, sx * xs, r, z, 0, 0, PI / 2, 6); }
}
function car() {
  const g = new GB();
  wheels(g, 0.78, [-1.05, 1.05]);
  g.rbox(1.8, 0.75, 3.4, 0.28, WHITE, 0, 0.3, 0, T1);
  g.rbox(1.5, 0.66, 1.75, 0.22, WHITE, 0, 0.95, -0.2, { tile: TILE.carwin, cw: 2, ch: 1 });
  g.rbox(1.56, 0.14, 1.7, 0.06, WHITE, 0, 1.56, -0.2, T1);
  for (const s of [-1, 1]) { g.sph(0.16, 0xfff3bf, s * 0.55, 0.78, 1.66, 6, 4); g.box(0.3, 0.14, 0.06, 0xff4d4d, s * 0.58, 0.78, -1.72); }
  g.box(0.8, 0.12, 0.08, DGREY, 0, 0.45, 1.72);
  return g;
}
function taxi() {
  const g = car();
  g.rbox(0.7, 0.28, 0.35, 0.08, 0xffffff, 0, 1.7, -0.2);
  g.box(0.72, 0.06, 0.37, 0xff6b6b, 0, 1.78, -0.2);
  return g;
}
function police() {
  const g = car();
  g.box(0.42, 0.18, 0.3, 0xff4d4d, -0.22, 1.7, -0.2); g.box(0.42, 0.18, 0.3, 0x4d7bff, 0.22, 1.7, -0.2);
  g.box(1.84, 0.22, 1.6, 0x343a40, 0, 0.55, 0.1);
  return g;
}
function suv() {
  const g = new GB();
  wheels(g, 0.86, [-1.2, 1.2], 0.48, 0.38);
  g.rbox(2.0, 0.95, 3.9, 0.3, WHITE, 0, 0.35, 0, T1);
  g.rbox(1.8, 0.8, 2.6, 0.25, WHITE, 0, 1.15, -0.35, { tile: TILE.carwin, cw: 2, ch: 1 });
  g.rbox(1.86, 0.16, 2.5, 0.07, WHITE, 0, 1.9, -0.35, T1);
  g.box(1.4, 0.08, 1.8, DGREY, 0, 2.06, -0.35);
  for (const s of [-1, 1]) { g.sph(0.17, 0xfff3bf, s * 0.62, 0.95, 1.9, 6, 4); g.box(0.3, 0.2, 0.06, 0xff4d4d, s * 0.7, 0.95, -1.96); }
  return g;
}
function van() {
  const g = new GB();
  wheels(g, 0.88, [-1.4, 1.4], 0.46, 0.36);
  g.rbox(2.0, 2.1, 4.6, 0.35, WHITE, 0, 0.35, -0.1, T1);
  g.rbox(1.9, 0.8, 0.3, 0.1, WHITE, 0, 1.45, 2.05, { tile: TILE.carwin, cw: 2, ch: 1 });
  g.box(2.04, 0.5, 2.6, WHITE, 0, 1.3, -0.8);
  for (const s of [-1, 1]) g.sph(0.17, 0xfff3bf, s * 0.62, 0.75, 2.15, 6, 4);
  return g;
}
function truck() {
  const g = new GB();
  wheels(g, 1.0, [-2.3, -1.3, 2.0], 0.52, 0.4);
  g.box(2.0, 0.35, 7.0, DGREY, 0, 0.5, 0);
  g.rbox(2.3, 2.1, 1.9, 0.3, WHITE, 0, 0.6, 2.5, T1);
  g.rbox(2.1, 0.8, 0.2, 0.08, WHITE, 0, 1.7, 3.4, { tile: TILE.carwin, cw: 2, ch: 1 });
  g.rbox(2.4, 3.0, 5.0, 0.2, 0xf8f9fa, 0, 0.8, -1.0);
  g.box(2.45, 0.7, 4.0, WHITE, 0, 1.9, -1.0, T1);
  for (const s of [-1, 1]) g.sph(0.2, 0xfff3bf, s * 0.8, 1.0, 3.45, 6, 4);
  return g;
}
function bus() {
  const g = new GB(), L = 9.6;
  wheels(g, 1.1, [-3.0, 3.0], 0.56, 0.42);
  g.rbox(2.5, 2.9, L, 0.45, WHITE, 0, 0.45, 0, T1);
  g.box(2.56, 1.15, L - 1.4, WHITE, 0, 1.55, -0.4, { tile: TILE.bus, cw: 1.8, ch: 1.15 });
  g.rbox(2.2, 1.3, 0.2, 0.1, WHITE, 0, 1.45, L / 2 - 0.05, { tile: TILE.carwin, cw: 2, ch: 1.3 });
  g.rbox(1.6, 0.4, 2.6, 0.15, 0xe9ecef, 0, 3.3, -1.5);
  for (const s of [-1, 1]) g.sph(0.22, 0xfff3bf, s * 0.85, 0.9, L / 2, 6, 4);
  return g;
}
function moto() {
  const g = new GB();
  g.cylC(0.32, 0.32, 0.16, TIRE, 0, 0.32, 0.65, 0, 0, PI / 2, 10); g.cylC(0.32, 0.32, 0.16, TIRE, 0, 0.32, -0.65, 0, 0, PI / 2, 10);
  g.rbox(0.42, 0.45, 1.2, 0.15, WHITE, 0, 0.4, 0, T1);
  g.rbox(0.36, 0.14, 0.6, 0.06, DGREY, 0, 0.85, -0.2);
  g.box(0.7, 0.06, 0.06, DGREY, 0, 1.05, 0.5); g.sph(0.12, 0xfff3bf, 0, 0.85, 0.65, 6, 4);
  return g;
}

// ---------- 行人（大头可爱风）----------
function person(pants, hair, skin, style) {
  const g = new GB();
  g.rbox(0.18, 0.55, 0.2, 0.06, pants, -0.11, 0, 0); g.rbox(0.18, 0.55, 0.2, 0.06, pants, 0.11, 0, 0);
  g.rbox(0.5, 0.58, 0.32, 0.12, WHITE, 0, 0.5, 0, T1);
  g.rbox(0.13, 0.42, 0.14, 0.05, WHITE, -0.32, 0.6, 0, T1); g.rbox(0.13, 0.42, 0.14, 0.05, WHITE, 0.32, 0.6, 0, T1);
  g.sph(0.3, skin, 0, 1.34, 0, 10, 7);
  if (style === 0) g.sph(0.32, hair, 0, 1.42, -0.03, 10, 5, 0.85);
  else if (style === 1) { g.sph(0.32, hair, 0, 1.42, -0.03, 10, 5, 0.85); g.sph(0.14, hair, 0, 1.62, -0.25, 6, 4); }
  else { g.cyl(0.33, 0.33, 0.08, hair, 0, 1.5, 0, 10); g.cyl(0.22, 0.24, 0.2, hair, 0, 1.56, 0, 10); }
  g.box(0.06, 0.08, 0.02, 0x343a40, -0.1, 1.34, 0.29); g.box(0.06, 0.08, 0.02, 0x343a40, 0.1, 1.34, 0.29);
  g.box(0.08, 0.04, 0.02, 0xff8fab, -0.17, 1.25, 0.27); g.box(0.08, 0.04, 0.02, 0xff8fab, 0.17, 1.25, 0.27);
  return g;
}

// ---------- 植物/街道 ----------
function treeRound() {
  const g = new GB();
  g.cyl(0.16, 0.22, 1.4, 0xb08968, 0, 0, 0, 6);
  g.ico(1.15, WHITE, 0, 2.2, 0, 1, 0.95, 1, T1); g.ico(0.75, WHITE, 0.55, 2.0, 0.3, 1, 1, 1, T1); g.ico(0.7, WHITE, -0.5, 2.6, -0.2, 1, 1, 1, T1);
  return g;
}
function treePine() {
  const g = new GB();
  g.cyl(0.15, 0.2, 0.8, 0xb08968, 0, 0, 0, 6);
  g.cone(1.2, 1.6, WHITE, 0, 0.7, 0, 7, 0, T1); g.cone(0.92, 1.4, WHITE, 0, 1.6, 0, 7, 0.4, T1); g.cone(0.6, 1.1, WHITE, 0, 2.45, 0, 7, 0.8, T1);
  return g;
}
function bush() { const g = new GB(); g.ico(0.62, WHITE, 0, 0.5, 0, 1.15, 0.85, 1, T1); g.ico(0.42, WHITE, 0.45, 0.4, 0.2, 1, 1, 1, T1); g.ico(0.12, 0xff8fab, 0.2, 0.95, 0.3); g.ico(0.12, 0xffd43b, -0.3, 0.85, 0.2); return g; }
function flowerBed() { const g = new GB(); g.rbox(1.8, 0.4, 0.9, 0.12, 0xe9ecef, 0, 0, 0); g.box(1.6, 0.05, 0.7, 0x8d6e63, 0, 0.4, 0); const cs = [0xff6b6b, 0xffd43b, 0xff8cc6, 0xffffff, 0xb197fc]; for (let i = 0; i < 6; i++) g.ico(0.2, cs[i % 5], -0.6 + (i % 3) * 0.6, 0.55, i < 3 ? -0.15 : 0.18); return g; }
function lamp() { const g = new GB(); g.cyl(0.18, 0.22, 0.3, DGREY, 0, 0, 0, 6); g.cyl(0.07, 0.09, 3.6, 0x5c677d, 0, 0.3, 0, 6); g.sph(0.32, 0xfff9db, 0, 4.05, 0, 8, 6); g.cyl(0.36, 0.2, 0.15, 0x5c677d, 0, 4.25, 0, 8); return g; }
function bench() { const g = new GB(); for (const s of [-0.7, 0.7]) g.box(0.1, 0.42, 0.5, DGREY, s, 0, 0); g.rbox(1.7, 0.1, 0.5, 0.04, 0xd9a066, 0, 0.42, 0); g.rbox(1.7, 0.35, 0.1, 0.04, 0xd9a066, 0, 0.55, -0.24); return g; }
function hydrant() { const g = new GB(); g.cyl(0.17, 0.19, 0.6, 0xff6b6b, 0, 0, 0, 8); g.sph(0.17, 0xff6b6b, 0, 0.6, 0, 8, 4); g.cylC(0.07, 0.07, 0.46, 0xffd43b, 0, 0.4, 0, 0, 0, PI / 2, 6); return g; }
function trashBin() { const g = new GB(); g.cyl(0.28, 0.24, 0.8, 0x51cf66, 0, 0, 0, 8); g.cyl(0.31, 0.31, 0.1, 0x2f9e44, 0, 0.8, 0, 8); return g; }
function cone() { const g = new GB(); g.rbox(0.5, 0.06, 0.5, 0.03, 0xff922b, 0, 0, 0); g.cone(0.2, 0.65, 0xff922b, 0, 0.06, 0, 8); g.cyl(0.13, 0.15, 0.1, WHITE, 0, 0.3, 0, 8); return g; }
function mailbox() { const g = new GB(); g.box(0.1, 0.55, 0.1, DGREY, 0, 0, 0); g.rbox(0.5, 0.6, 0.5, 0.15, 0x4dabf7, 0, 0.55, 0); g.box(0.3, 0.04, 0.02, 0x343a40, 0, 0.95, 0.26); return g; }
function busStop() { const g = new GB(); for (const s of [-1.4, 1.4]) g.box(0.1, 2.4, 0.1, GREY, s, 0, -0.5); g.rbox(3.3, 0.14, 1.4, 0.06, WHITE, 0, 2.4, 0, T1); g.box(2.8, 1.8, 0.06, 0xd0ebff, 0, 0.45, -0.55); g.rbox(0.9, 1.6, 0.12, 0.05, WHITE, 1.45, 0.5, 0, T1); g.rbox(2.0, 0.1, 0.4, 0.04, 0xd9a066, -0.2, 0.45, -0.3); return g; }
function kiosk() { const g = new GB(); g.rbox(2.0, 2.2, 1.8, 0.2, 0xfff9db, 0, 0, 0); g.box(1.7, 0.9, 0.05, WHITE, 0, 1.0, 0.91, { tile: TILE.store, cw: 1.7, ch: 0.9 }); g.add(new THREE.BoxGeometry(2.1, 0.08, 1.0), WHITE, 0, 2.15, 1.25, 0.35, 0, 0, 1, 1, 1, { tile: TILE.awning, cw: 2.1, ch: 1 }); g.rbox(2.2, 0.3, 2.0, 0.1, WHITE, 0, 2.2, 0, T1); return g; }
function fountain() { const g = new GB(); g.cyl(2.4, 2.5, 0.6, 0xe9ecef, 0, 0, 0, 14); g.cyl(2.15, 2.15, 0.06, 0x74c0fc, 0, 0.55, 0, 14); g.cyl(0.35, 0.45, 1.3, 0xe9ecef, 0, 0.5, 0, 8); g.cyl(0.95, 0.4, 0.3, 0xe9ecef, 0, 1.75, 0, 10); g.cyl(0.8, 0.8, 0.06, 0x99e9f2, 0, 2.02, 0, 10); g.cone(0.25, 0.9, 0xd0ebff, 0, 2.05, 0, 6); return g; }
function statue() { const g = new GB(); g.rbox(2.0, 1.0, 2.0, 0.1, 0xdee2e6, 0, 0, 0); const B = 0x8ce99a; g.rbox(1.0, 1.4, 0.6, 0.25, B, 0, 1.0, 0); g.sph(0.5, B, 0, 2.8, 0, 8, 6); g.rbox(0.25, 1.0, 0.25, 0.1, B, 0.6, 2.3, 0); return g; }
function umbrella() { const g = new GB(); g.cyl(0.5, 0.5, 0.06, WHITE, 0, 0.72, 0, 10); g.cyl(0.05, 0.05, 2.4, GREY, 0, 0, 0, 5); g.add(new THREE.ConeGeometry(1.3, 0.55, 8), WHITE, 0, 2.6, 0, 0, 0, 0, 1, 1, 1, T1); return g; }
function vending() { const g = new GB(); g.rbox(1.0, 1.9, 0.8, 0.12, WHITE, 0, 0, 0, T1); g.box(0.66, 1.1, 0.04, WHITE, -0.08, 0.6, 0.41, { tile: TILE.store, cw: 0.66, ch: 1.1 }); return g; }
function bicycle() { const g = new GB(); for (const z of [-0.5, 0.5]) g.add(new THREE.TorusGeometry(0.32, 0.05, 4, 10), TIRE, 0, 0.34, z, 0, PI / 2, 0); g.add(new THREE.BoxGeometry(0.06, 0.06, 1.0), WHITE, 0, 0.6, 0, -0.2, 0, 0, 1, 1, 1, T1); g.box(0.14, 0.06, 0.24, DGREY, 0, 0.82, -0.25); g.box(0.5, 0.05, 0.05, DGREY, 0, 0.9, 0.42); return g; }
function waterTower() { const g = new GB(); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.box(0.16, 3, 0.16, 0x8d6e63, x, 0, z); g.cyl(1.6, 1.6, 2.2, 0xffa94d, 0, 3, 0, 10); g.cone(1.75, 1.0, 0xff6b6b, 0, 5.2, 0, 10); return g; }
function tlight() { const g = new GB(); g.cyl(0.1, 0.12, 3.3, 0x5c677d, 0, 0, 0, 6); g.box(0.1, 0.1, 1.8, 0x5c677d, 0, 3.2, 0.85); g.rbox(0.4, 1.0, 0.34, 0.1, 0x343a40, 0, 2.5, 1.7); for (const [y, c] of [[3.25, 0xff6b6b], [2.95, 0xffd43b], [2.65, 0x69db7c]]) g.sph(0.11, c, 0, y, 1.88, 6, 4); return g; }

// ---------- 建筑（立面用图集，几何极简）----------
function house(roof) {
  const g = new GB();
  g.box(6.4, 0.3, 6.4, 0xdee2e6, 0, 0, 0);
  g.box(6, 3.2, 6, WHITE, 0, 0.3, 0, { tint: 1, tile: TILE.house, cw: 3, ch: 3.2 });
  g.box(1.3, 2.1, 0.12, WHITE, 0, 0.3, 3.02, { tile: TILE.door, cw: 1.3, ch: 2.1 });
  g.add(new THREE.ConeGeometry(4.8, 2.6, 4), roof, 0, 3.5 + 1.3, 0, 0, PI / 4, 0);
  g.rbox(0.8, 1.6, 0.8, 0.1, 0xfff5f5, 1.6, 4.1, -1.0);
  return g;
}
function shop(wall) {
  const g = new GB();
  g.box(9, 3.4, 8, WHITE, 0, 0, 0, { tile: TILE.store, cw: 3, ch: 3.4 });
  g.box(9, 3.2, 8, wall, 0, 3.4, 0, { tile: TILE.brick, cw: 3, ch: 3.2 });
  g.rbox(9.4, 0.5, 8.4, 0.12, WHITE, 0, 6.6, 0);
  g.add(new THREE.BoxGeometry(9.2, 0.12, 1.6), WHITE, 0, 3.15, 4.6, 0.38, 0, 0, 1, 1, 1, { tile: TILE.awning, cw: 2.3, ch: 1.6 });
  g.rbox(5, 1.1, 0.35, 0.12, WHITE, 0, 5.3, 4.1, T1);
  g.box(4.2, 0.5, 0.05, WHITE, 0, 5.6, 4.29, { tile: TILE.sign, cw: 4.2, ch: 0.5 });
  g.rbox(1.6, 0.9, 1.2, 0.15, 0xe9ecef, -2.5, 7.1, -1.5);
  return g;
}
function apartment() {
  const g = new GB(), H = 15;
  g.box(11.6, 0.6, 11.6, 0xdee2e6, 0, 0, 0);
  g.box(11, H, 11, WHITE, 0, 0.6, 0, { tint: 1, tile: TILE.apt, cw: 2.75, ch: 3 });
  for (let f = 1; f < 5; f++) g.box(11.3, 0.2, 11.3, WHITE, 0, 0.5 + f * 3, 0);
  g.rbox(11.6, 0.9, 11.6, 0.2, WHITE, 0, 0.6 + H, 0);
  g.cyl(1.2, 1.2, 1.8, 0xffa94d, 2.5, H + 1.5, -2, 8); g.cone(1.3, 0.8, 0xff6b6b, 2.5, H + 3.3, -2, 8);
  g.rbox(1.6, 1.0, 1.6, 0.2, 0xe9ecef, -3, H + 1.5, 2);
  return g;
}
function office() {
  const g = new GB(), H = 26;
  g.box(12.8, 1, 12.8, 0xdee2e6, 0, 0, 0);
  g.box(12, H, 12, WHITE, 0, 1, 0, { tint: 1, tile: TILE.office, cw: 3, ch: 4 });
  g.rbox(12.6, 1.3, 12.6, 0.25, WHITE, 0, H + 1, 0);
  g.cyl(3.4, 3.4, 0.2, 0x495057, 0, H + 2.3, 0, 12); g.cyl(2.8, 2.8, 0.05, 0xffd43b, 0, H + 2.5, 0, 12); g.cyl(2.5, 2.5, 0.06, 0x495057, 0, H + 2.5, 0, 12);
  return g;
}
function skyscraper() {
  const g = new GB();
  g.box(14, 8, 14, 0xf1f3f5, 0, 0, 0, { tile: TILE.store, cw: 3.5, ch: 4 });
  g.rbox(14.4, 0.8, 14.4, 0.2, WHITE, 0, 8, 0);
  g.box(10, 32, 10, WHITE, 0, 8.8, 0, { tint: 1, tile: TILE.tower, cw: 2.5, ch: 4 });
  g.rbox(10.5, 1, 10.5, 0.25, WHITE, 0, 40.8, 0);
  g.box(6.5, 8, 6.5, WHITE, 0, 41.8, 0, { tint: 1, tile: TILE.tower, cw: 2.2, ch: 4 });
  g.rbox(7, 0.8, 7, 0.2, WHITE, 0, 49.8, 0);
  g.cyl(0.1, 0.18, 6, 0xdee2e6, 0, 50.6, 0, 5); g.sph(0.3, 0xff6b6b, 0, 56.8, 0, 6, 4);
  return g;
}
function gasStation() { const g = new GB(); for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) g.box(0.4, 4, 0.4, WHITE, x, 0, z); g.rbox(8, 0.7, 6, 0.2, WHITE, 0, 4, 0); g.box(8.05, 0.3, 6.05, 0x69db7c, 0, 4.15, 0); for (const x of [-1.5, 1.5]) { g.rbox(0.6, 1.4, 0.7, 0.12, 0xff6b6b, x, 0, 0); } return g; }
// 叠叠楼：单层楼块（可堆叠）
function segment(w, tile) {
  const g = new GB(), h = 2.6;
  g.box(w, h - 0.3, w, WHITE, 0, 0, 0, { tint: 1, tile, cw: w / Math.max(1, Math.round(w / 3)), ch: h - 0.3 });
  g.rbox(w + 0.5, 0.3, w + 0.5, 0.1, WHITE, 0, h - 0.3, 0);
  return g;
}
function segRoof(w) {
  const g = new GB();
  g.rbox(w + 0.5, 0.6, w + 0.5, 0.2, WHITE, 0, 0, 0, T1);
  g.add(new THREE.ConeGeometry(w * 0.62, w * 0.45, 4), WHITE, 0, 0.6 + w * 0.225, 0, 0, PI / 4, 0, 1, 1, 1, T1);
  g.sph(0.35, 0xffd43b, 0, 0.6 + w * 0.45 + 0.2, 0, 6, 4);
  return g;
}
function golden() { const g = new GB(); g.rbox(1.2, 1.2, 1.2, 0.3, 0xffd43b, 0, 0.1, 0); g.box(1.25, 0.3, 0.3, 0xff6b6b, 0, 0.55, 0); g.box(0.3, 0.3, 1.25, 0xff6b6b, 0, 0.55, 0); g.sph(0.25, 0xff6b6b, 0, 1.4, 0, 6, 4); return g; }

// ---------- 类型注册 ----------
export function buildTypes() {
  const T = [];
  const def = (name, gb, cat, opts = {}) => {
    const geo = gb.build(); const bb = geo.boundingBox;
    const hw = Math.max(-bb.min.x, bb.max.x), hd = Math.max(-bb.min.z, bb.max.z);
    const fr = opts.fr ?? (Math.max(hw, hd) * 0.85 + Math.min(hw, hd) * 0.25);
    const h = opts.h ?? bb.max.y;
    const value = opts.value ?? Math.max(1, Math.round(fr * fr * (1 + Math.min(h, 40) * 0.05) * 1.6));
    const t = { id: T.length, name, geo, cat, fr, h, value, pal: opts.pal || PAL.white, blob: opts.blob ?? (cat === 'bld' ? 'sq' : 'rd'), tris: geo.attributes.position.count / 3 };
    T.push(t); return t;
  };
  const G = { misc: {} };
  G.cars = [def('car', car(), 'car', { pal: PAL.car }), def('car', car(), 'car', { pal: PAL.car }), def('suv', suv(), 'car', { pal: PAL.car })];
  G.cars.push(def('taxi', taxi(), 'car', { pal: [0xffd43b] }), def('police', police(), 'car', { pal: [0xffffff] }));
  G.big = [def('van', van(), 'car', { pal: PAL.car }), def('truck', truck(), 'car', { pal: PAL.car }), def('bus', bus(), 'car', { pal: [0xffd43b, 0x69db7c, 0x4dabf7, 0xff8787] })];
  G.moto = def('moto', moto(), 'small', { pal: PAL.car });
  G.people = [def('person', person(0x4c6ef5, 0x343a40, 0xffd8b5, 0), 'person', { value: 1, pal: PAL.shirt }), def('person', person(0x495057, 0x8d5524, 0xf1c27d, 1), 'person', { value: 1, pal: PAL.shirt }), def('person', person(0x868e96, 0xffd43b, 0xffe0c7, 2), 'person', { value: 1, pal: PAL.shirt })];
  G.trees = [def('tree', treeRound(), 'tree', { pal: PAL.leaf }), def('pine', treePine(), 'tree', { pal: [0x2f9e44, 0x37b24d, 0x40c057] })];
  G.misc.autumn = [0xffa94d, 0xffc078, 0xff8787];
  G.misc.bush = def('bush', bush(), 'small', { value: 2, pal: PAL.leaf });
  G.misc.flower = def('flower', flowerBed(), 'small', { value: 3 });
  G.misc.lamp = def('lamp', lamp(), 'small', { fr: 0.4, value: 2 });
  G.misc.bench = def('bench', bench(), 'small', { value: 3 });
  G.misc.hydrant = def('hydrant', hydrant(), 'small', { value: 1 });
  G.misc.trash = def('trash', trashBin(), 'small', { value: 1 });
  G.misc.cone = def('cone', cone(), 'small', { value: 1 });
  G.misc.mailbox = def('mailbox', mailbox(), 'small', { value: 1 });
  G.misc.tlight = def('tlight', tlight(), 'small', { fr: 0.6, value: 3 });
  G.misc.busStop = def('busstop', busStop(), 'mid', { pal: PAL.awn });
  G.misc.kiosk = def('kiosk', kiosk(), 'mid', { pal: PAL.awn });
  G.misc.fountain = def('fountain', fountain(), 'mid');
  G.misc.statue = def('statue', statue(), 'mid');
  G.misc.umbrella = def('umbrella', umbrella(), 'small', { pal: PAL.awn });
  G.misc.vending = def('vending', vending(), 'small', { pal: [0xff6b6b, 0x4dabf7, 0x69db7c] });
  G.misc.bicycle = def('bike', bicycle(), 'small', { value: 1, pal: PAL.car });
  G.misc.waterTower = def('watertower', waterTower(), 'mid');
  G.misc.gas = def('gas', gasStation(), 'bld');
  G.misc.gift = def('gift', golden(), 'small', { value: 4 });
  G.houses = [def('house', house(0xff8787), 'bld', { pal: PAL.wall }), def('house', house(0x74c0fc), 'bld', { pal: PAL.wall }), def('house', house(0xffa94d), 'bld', { pal: PAL.wall })];
  G.shops = [def('shop', shop(0xffe3e3), 'bld', { pal: PAL.awn }), def('shop', shop(0xd0ebff), 'bld', { pal: PAL.awn })];
  G.apts = [def('apartment', apartment(), 'bld', { pal: PAL.wall })];
  G.offices = [def('office', office(), 'bld', { pal: PAL.glass })];
  G.skys = [def('sky', skyscraper(), 'bld', { pal: PAL.glass })];
  // 叠叠楼
  G.segs = {};
  for (const [k, w] of [['S', 4.4], ['M', 6.4], ['L', 9]]) {
    G.segs[k] = {
      a: def('seg' + k, segment(w, TILE.seg), 'seg', { pal: PAL.seg, value: Math.max(1, Math.round(w * w * 0.1)), blob: 'none' }),
      b: def('seg' + k, segment(w, TILE.seg2), 'seg', { pal: PAL.seg, value: Math.max(1, Math.round(w * w * 0.1)), blob: 'none' }),
      roof: def('segroof' + k, segRoof(w), 'seg', { pal: PAL.seg, value: Math.max(1, Math.round(w * w * 0.12)), blob: 'none' }),
    };
  }
  return { list: T, groups: G };
}

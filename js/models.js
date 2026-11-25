// 原创低多边形模型：全部由几何体程序化拼合，无外部素材
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
  _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const PI = Math.PI;

export class GB {
  constructor() { this.lists = {}; }
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, list = 'base', uvfn = null) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (uvfn) uvfn(g); else if (g.attributes.uv) g.deleteAttribute('uv');
    (this.lists[list] ||= []).push(g);
    return this;
  }
  box(w, h, d, c, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, rx, ry, rz); }
  boxC(w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz); }
  cyl(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 12) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z); }
  cylC(rt, rb, h, c, x, y, z, rx = 0, ry = 0, rz = 0, seg = 12) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz); }
  cone(r, h, c, x = 0, y = 0, z = 0, seg = 8, ry = 0) { return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 0, ry, 0); }
  ico(r, c, x, y, z, sx = 1, sy = 1, sz = 1, detail = 0) { return this.add(new THREE.IcosahedronGeometry(r, detail), c, x, y, z, 0, 0, 0, sx, sy, sz); }
  sph(r, c, x, y, z, ws = 8, hs = 6) { return this.add(new THREE.SphereGeometry(r, ws, hs), c, x, y, z); }
  // 带窗户贴图坐标的立面盒子（底部定位，轴对齐）
  facade(w, h, d, c, x, y, z, cw, ch, list) {
    const cx = Math.max(1, Math.round(w / cw)), cz = Math.max(1, Math.round(d / cw));
    const rows = Math.max(1, Math.round(h / ch));
    const cwx = w / cx, cwz = d / cz, chh = h / rows, x0 = x - w / 2, z0 = z - d / 2, y0 = y;
    return this.add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, 0, 0, 0, 1, 1, 1, list, (g) => {
      const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2);
      for (let i = 0; i < P.count; i++) {
        const nx = N.getX(i), ny = N.getY(i);
        let u, v;
        if (Math.abs(ny) > 0.5) { u = 0.02; v = 0.02; }
        else if (Math.abs(nx) > 0.5) { u = (P.getZ(i) - z0) / cwz; v = (P.getY(i) - y0) / chh; }
        else { u = (P.getX(i) - x0) / cwx; v = (P.getY(i) - y0) / chh; }
        uv[i * 2] = u; uv[i * 2 + 1] = v;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    });
  }
  build() {
    const out = {};
    for (const k in this.lists) if (this.lists[k].length) {
      const g = mergeGeometries(this.lists[k]);
      g.computeBoundingBox(); g.computeBoundingSphere();
      out[k] = g;
    }
    return out;
  }
}

// ---------- 窗户贴图 ----------
function windowTex(kind) {
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
  const glass = (x0, y0, w, h) => {
    const gr = x.createLinearGradient(x0, y0, x0 + w, y0 + h);
    gr.addColorStop(0, '#5f86ad'); gr.addColorStop(0.45, '#2c4766'); gr.addColorStop(1, '#3f6189');
    x.fillStyle = gr; x.fillRect(x0, y0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.22)';
    x.beginPath(); x.moveTo(x0, y0 + h * 0.55); x.lineTo(x0 + w * 0.5, y0); x.lineTo(x0 + w * 0.7, y0); x.lineTo(x0, y0 + h * 0.85); x.fill();
  };
  if (kind === 'apt') {
    x.fillStyle = '#e9e9e9'; x.fillRect(14, 10, 36, 36);
    glass(17, 13, 30, 30);
    x.fillStyle = '#e9e9e9'; x.fillRect(31, 13, 2, 30);
    x.fillStyle = '#c8c8c8'; x.fillRect(12, 46, 40, 4);
  } else if (kind === 'house') {
    x.fillStyle = '#f4f4f4'; x.fillRect(18, 14, 28, 32);
    glass(20, 16, 24, 28);
    x.fillStyle = '#f4f4f4'; x.fillRect(31, 16, 2, 28); x.fillRect(20, 29, 24, 2);
    x.fillStyle = '#9a9a9a'; x.fillRect(11, 14, 6, 32); x.fillRect(47, 14, 6, 32);
  } else if (kind === 'office') {
    glass(0, 0, 64, 44);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 3, 64); x.fillRect(61, 0, 3, 64); x.fillRect(31, 0, 2, 44);
    x.fillStyle = '#d3dae2'; x.fillRect(0, 44, 64, 20);
  } else if (kind === 'tower') {
    glass(0, 0, 64, 58);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 2, 64); x.fillRect(62, 0, 2, 64); x.fillRect(21, 0, 1, 58); x.fillRect(42, 0, 1, 58);
    x.fillStyle = '#c4ccd6'; x.fillRect(0, 58, 64, 6);
  } else if (kind === 'store') {
    glass(2, 6, 60, 58);
    x.fillStyle = '#ffffff'; x.fillRect(30, 6, 3, 58);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; t.generateMipmaps = true;
  return t;
}

// 遮挡淡出：每实例 iFade 属性 + 有序抖动（无需排序的半透明）
function addFade(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float iFade;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = iFade;');
    sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      if (vFade < 0.99) {
        vec2 p = mod(floor(gl_FragCoord.xy), 4.0);
        vec2 a = mod(p, 2.0), b = floor(p / 2.0);
        float th = (4.0 * mod(2.0 * a.x + 3.0 * a.y, 4.0) + mod(2.0 * b.x + 3.0 * b.y, 4.0) + 0.5) / 16.0;
        if (vFade < th) discard;
      }`);
  };
  mat.customProgramCacheKey = () => 'fade';
  return mat;
}
export function makeMaterials() {
  const base = addFade(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const fac = {};
  for (const k of ['apt', 'house', 'office', 'tower', 'store']) fac[k] = addFade(new THREE.MeshLambertMaterial({ vertexColors: true, map: windowTex(k) }));
  return { base, fac };
}

// ---------- 模型 ----------
const WHEEL = 0x1d1d22, HUB = 0xc9ccd1, GLASS = 0x22364c, DARK = 0x33363c;

function wheels(g, xs, zs, r = 0.34, w = 0.26) {
  for (const sx of [-1, 1]) for (const z of zs) {
    g.cylC(r, r, w, WHEEL, sx * xs, r, z, 0, 0, PI / 2, 12);
    g.cylC(r * 0.58, r * 0.58, w + 0.02, HUB, sx * xs, r, z, 0, 0, PI / 2, 8);
  }
}

function sedan(color, extra) {
  const g = new GB(), W = 1.7, L = 3.9;
  wheels(g, 0.78, [-1.22, 1.22]);
  g.box(W * 0.96, 0.14, L * 0.96, 0x2a2a30, 0, 0.18, 0);
  g.box(W, 0.48, L, color, 0, 0.3, 0);
  g.boxC(W * 0.94, 0.1, 1.05, color, 0, 0.8, 1.3, -0.1, 0, 0); // 引擎盖
  g.box(1.5, 0.5, 1.95, GLASS, 0, 0.76, -0.25);
  g.box(1.52, 0.07, 1.6, color, 0, 1.25, -0.3);
  g.box(1.54, 0.48, 0.14, color, 0, 0.78, -0.2);   // B柱
  g.box(1.54, 0.48, 0.12, color, 0, 0.78, -1.2);
  g.box(W + 0.04, 0.2, 0.16, 0x3a3a40, 0, 0.26, L / 2);
  g.box(W + 0.04, 0.2, 0.16, 0x3a3a40, 0, 0.26, -L / 2);
  for (const s of [-1, 1]) {
    g.box(0.36, 0.14, 0.06, 0xfff3c0, s * 0.56, 0.56, L / 2 + 0.01);
    g.box(0.36, 0.12, 0.06, 0xe0302a, s * 0.56, 0.58, -L / 2 - 0.01);
    g.box(0.12, 0.1, 0.2, color, s * (W / 2 + 0.06), 0.82, 0.55);
  }
  g.box(0.7, 0.14, 0.05, 0x1f1f22, 0, 0.4, L / 2 + 0.06);
  if (extra) extra(g);
  return g;
}
function taxi() {
  return sedan(0xf5c518, (g) => {
    g.box(0.7, 0.24, 0.32, 0xffffff, 0, 1.32, -0.3);
    g.box(0.72, 0.06, 0.34, 0xe0302a, 0, 1.32, -0.3);
    g.box(1.72, 0.12, 3.2, 0x222222, 0, 0.52, 0); // 车身腰线
  });
}
function police() {
  return sedan(0xf4f6f8, (g) => {
    g.box(1.73, 0.3, 2.0, 0x1c2a44, 0, 0.32, -0.2);
    g.box(1.0, 0.14, 0.3, 0x222222, 0, 1.32, -0.3);
    g.box(0.45, 0.16, 0.28, 0xff2a2a, -0.25, 1.36, -0.3);
    g.box(0.45, 0.16, 0.28, 0x2a6bff, 0.25, 1.36, -0.3);
  });
}
function suv(color) {
  const g = new GB(), W = 1.9, L = 4.3;
  wheels(g, 0.86, [-1.35, 1.35], 0.42, 0.3);
  g.box(W, 0.75, L, color, 0, 0.35, 0);
  g.box(1.8, 0.62, 2.9, GLASS, 0, 1.1, -0.45);
  g.box(1.84, 0.1, 2.8, color, 0, 1.7, -0.45);
  g.box(1.84, 0.62, 0.16, color, 0, 1.1, 0.25);
  g.box(1.84, 0.62, 0.16, color, 0, 1.1, -1.2);
  g.box(1.6, 0.06, 2.2, 0x2b2b2b, 0, 1.8, -0.45);
  g.box(W + 0.06, 0.25, 0.18, 0x2a2a2e, 0, 0.3, L / 2);
  g.box(W + 0.06, 0.25, 0.18, 0x2a2a2e, 0, 0.3, -L / 2);
  for (const s of [-1, 1]) { g.box(0.38, 0.16, 0.06, 0xfff3c0, s * 0.62, 0.85, L / 2 + 0.01); g.box(0.3, 0.2, 0.06, 0xe0302a, s * 0.7, 0.85, -L / 2 - 0.01); }
  g.box(0.9, 0.3, 0.05, 0x1f1f22, 0, 0.6, L / 2 + 0.02);
  return g;
}
function van(color) {
  const g = new GB(), W = 1.95, L = 4.8;
  wheels(g, 0.86, [-1.5, 1.55], 0.4, 0.3);
  g.box(W, 2.0, 3.4, color, 0, 0.35, -0.7);
  g.box(W, 1.15, 1.4, color, 0, 0.35, 1.7);
  g.boxC(W * 0.96, 0.9, 0.12, GLASS, 0, 1.75, 1.45, -0.5, 0, 0);
  for (const s of [-1, 1]) g.box(0.05, 0.6, 0.8, GLASS, s * (W / 2 + 0.01), 1.3, 1.25);
  g.box(W + 0.02, 0.35, 3.42, 0xffffff, 0, 1.2, -0.7);
  g.box(W + 0.06, 0.22, 0.16, 0x2a2a2e, 0, 0.3, L / 2 + 0.02);
  for (const s of [-1, 1]) g.box(0.32, 0.16, 0.06, 0xfff3c0, s * 0.65, 0.85, L / 2 + 0.03);
  return g;
}
function truck(color) {
  const g = new GB(), W = 2.3;
  wheels(g, 0.98, [-2.4, -1.4, 2.0], 0.48, 0.34);
  g.box(W * 0.9, 0.3, 7.2, 0x2a2a2e, 0, 0.45, 0);
  g.box(W, 2.0, 1.8, color, 0, 0.6, 2.6);
  g.box(W * 0.95, 0.75, 0.1, GLASS, 0, 1.75, 3.51);
  for (const s of [-1, 1]) g.box(0.05, 0.7, 1.0, GLASS, s * (W / 2 + 0.01), 1.7, 2.8);
  g.box(W + 0.1, 3.0, 5.0, 0xf1f1ee, 0, 0.75, -0.95);
  g.box(W + 0.12, 0.6, 4.2, color, 0, 1.9, -0.95);
  g.box(W, 0.28, 0.2, 0x2a2a2e, 0, 0.45, 3.55);
  for (const s of [-1, 1]) g.box(0.4, 0.2, 0.06, 0xfff3c0, s * 0.8, 0.9, 3.52);
  return g;
}
function fireTruck() {
  const g = truck(0xd42a20);
  g.box(1.2, 0.2, 5.5, 0xd9d9d9, 0, 3.8, -0.8);
  for (let i = 0; i < 9; i++) g.box(1.2, 0.08, 0.1, 0xbdbdbd, 0, 4.0, -3.2 + i * 0.6);
  g.box(0.9, 0.18, 0.3, 0x2a6bff, 0, 2.62, 2.6);
  return g;
}
function bus(color) {
  const g = new GB(), W = 2.5, L = 10;
  wheels(g, 1.1, [-3.2, 3.2], 0.52, 0.36);
  g.box(W, 2.6, L, color, 0, 0.45, 0);
  g.box(W + 0.04, 1.0, L - 1.6, GLASS, 0, 1.6, -0.3);
  g.box(W * 0.9, 1.3, 0.06, GLASS, 0, 1.4, L / 2 + 0.01);
  g.box(W + 0.05, 0.25, L + 0.05, 0xffffff, 0, 1.3, 0);
  g.box(1.6, 0.4, 2.4, 0xd5d8dc, 0, 3.05, -1.5);
  g.box(1.6, 0.3, 0.1, 0x111111, 0, 2.6, L / 2 + 0.02);
  g.box(1.6, 0.18, 0.08, 0xffb300, 0, 2.66, L / 2 + 0.05);
  for (const s of [-1, 1]) { g.box(0.35, 0.18, 0.06, 0xfff3c0, s * 0.85, 0.75, L / 2 + 0.01); g.box(0.3, 0.3, 0.06, 0xe0302a, s * 0.95, 0.9, -L / 2 - 0.01); }
  return g;
}
function moto(color) {
  const g = new GB();
  g.cylC(0.3, 0.3, 0.12, WHEEL, 0, 0.3, 0.7, 0, 0, PI / 2, 10);
  g.cylC(0.3, 0.3, 0.12, WHEEL, 0, 0.3, -0.7, 0, 0, PI / 2, 10);
  g.box(0.3, 0.35, 1.1, color, 0, 0.45, 0);
  g.box(0.28, 0.12, 0.6, 0x222222, 0, 0.8, -0.2);
  g.box(0.7, 0.05, 0.05, 0x333333, 0, 1.0, 0.55);
  g.box(0.2, 0.15, 0.1, 0xfff3c0, 0, 0.75, 0.7);
  return g;
}

function person(shirt, pants, hair, skin) {
  const g = new GB();
  g.box(0.17, 0.78, 0.2, pants, -0.11, 0, 0);
  g.box(0.17, 0.78, 0.2, pants, 0.11, 0, 0);
  g.box(0.2, 0.08, 0.28, 0x2b2b2b, -0.11, 0, 0.03);
  g.box(0.2, 0.08, 0.28, 0x2b2b2b, 0.11, 0, 0.03);
  g.box(0.48, 0.62, 0.28, shirt, 0, 0.76, 0);
  g.box(0.13, 0.55, 0.16, shirt, -0.31, 0.8, 0);
  g.box(0.13, 0.55, 0.16, shirt, 0.31, 0.8, 0);
  g.box(0.12, 0.13, 0.14, skin, -0.31, 0.68, 0);
  g.box(0.12, 0.13, 0.14, skin, 0.31, 0.68, 0);
  g.box(0.14, 0.08, 0.14, skin, 0, 1.36, 0);
  g.box(0.34, 0.34, 0.32, skin, 0, 1.42, 0);
  g.box(0.37, 0.12, 0.35, hair, 0, 1.72, -0.01);
  g.box(0.37, 0.24, 0.1, hair, 0, 1.5, -0.14);
  g.box(0.05, 0.05, 0.02, 0x222222, -0.08, 1.6, 0.165);
  g.box(0.05, 0.05, 0.02, 0x222222, 0.08, 1.6, 0.165);
  return g;
}

function treeRound(leaf, leaf2) {
  const g = new GB();
  g.cyl(0.14, 0.2, 1.5, 0x7a5232, 0, 0, 0, 7);
  g.ico(1.05, leaf, 0, 2.2, 0, 1, 0.9, 1);
  g.ico(0.75, leaf2, 0.45, 2.75, 0.15);
  g.ico(0.7, leaf2, -0.45, 2.55, -0.3);
  g.ico(0.6, leaf, 0.1, 3.05, -0.25);
  return g;
}
function treePine(leaf) {
  const g = new GB();
  g.cyl(0.14, 0.18, 0.9, 0x6d4a2d, 0, 0, 0, 6);
  g.cone(1.15, 1.6, leaf, 0, 0.75, 0, 7);
  g.cone(0.9, 1.4, leaf, 0, 1.6, 0, 7, 0.4);
  g.cone(0.6, 1.2, leaf, 0, 2.4, 0, 7, 0.8);
  return g;
}
function palm() {
  const g = new GB();
  for (let i = 0; i < 5; i++) g.cylC(0.16 - i * 0.012, 0.17 - i * 0.012, 0.75, 0x8f6b43, i * 0.05, 0.38 + i * 0.72, 0, 0, 0, -0.04, 7);
  for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; g.boxC(0.45, 0.06, 1.7, 0x3f9b3f, Math.sin(a) * 0.75 + 0.25, 3.55, Math.cos(a) * 0.75, 0.35 * Math.cos(a), a, 0); }
  g.ico(0.25, 0x6b4b2b, 0.25, 3.6, 0);
  return g;
}
function bush(c) { const g = new GB(); g.ico(0.6, c, 0, 0.45, 0, 1.1, 0.8, 1); g.ico(0.4, c, 0.4, 0.4, 0.2); return g; }
function flowerBed() {
  const g = new GB();
  g.box(1.8, 0.35, 0.9, 0x9b8b7a, 0, 0, 0);
  g.box(1.6, 0.05, 0.7, 0x5a3b22, 0, 0.35, 0);
  const cs = [0xff4d6d, 0xffd23f, 0xff8fab, 0xffffff, 0xb983ff];
  for (let i = 0; i < 8; i++) g.ico(0.16, cs[i % 5], -0.65 + (i % 4) * 0.43, 0.48, i < 4 ? -0.15 : 0.18);
  return g;
}
function lamp() {
  const g = new GB();
  g.cyl(0.18, 0.2, 0.3, 0x2f3338, 0, 0, 0, 8);
  g.cyl(0.07, 0.09, 4.2, 0x3b4047, 0, 0.3, 0, 8);
  g.box(0.08, 0.08, 0.9, 0x3b4047, 0, 4.4, 0.4);
  g.box(0.3, 0.14, 0.5, 0x2f3338, 0, 4.32, 0.85);
  g.box(0.22, 0.04, 0.4, 0xfff2b0, 0, 4.29, 0.85);
  return g;
}
function bench() {
  const g = new GB(), W = 0x9c6636;
  for (const s of [-0.7, 0.7]) { g.box(0.08, 0.45, 0.5, 0x2e2e33, s, 0, 0); g.box(0.08, 0.5, 0.06, 0x2e2e33, s, 0.45, -0.24); }
  for (let i = 0; i < 3; i++) g.box(1.7, 0.05, 0.13, W, 0, 0.43, -0.15 + i * 0.15);
  for (let i = 0; i < 2; i++) g.box(1.7, 0.12, 0.05, W, 0, 0.62 + i * 0.2, -0.26);
  return g;
}
function hydrant() {
  const g = new GB(), R = 0xd8332a;
  g.cyl(0.2, 0.22, 0.08, 0x9a9a9a, 0, 0, 0, 8);
  g.cyl(0.15, 0.16, 0.55, R, 0, 0.08, 0, 10);
  g.cyl(0.19, 0.19, 0.07, R, 0, 0.6, 0, 10);
  g.sph(0.14, R, 0, 0.67, 0, 8, 5);
  g.cyl(0.04, 0.04, 0.1, 0xe8e8e8, 0, 0.78, 0, 6);
  g.cylC(0.06, 0.06, 0.42, 0xe8e8e8, 0, 0.42, 0, 0, 0, PI / 2, 6);
  g.cylC(0.07, 0.07, 0.12, R, 0, 0.42, 0.15, PI / 2, 0, 0, 6);
  return g;
}
function trashBin() {
  const g = new GB();
  g.cyl(0.26, 0.23, 0.82, 0x2f7d50, 0, 0, 0, 10);
  g.cyl(0.29, 0.29, 0.07, 0x23593a, 0, 0.82, 0, 10);
  g.cyl(0.08, 0.08, 0.06, 0x23593a, 0, 0.89, 0, 6);
  g.cyl(0.265, 0.265, 0.06, 0xd8d8d8, 0, 0.55, 0, 10);
  return g;
}
function cone() {
  const g = new GB();
  g.box(0.46, 0.05, 0.46, 0xff6d1a, 0, 0, 0);
  g.cone(0.19, 0.65, 0xff6d1a, 0, 0.05, 0, 10);
  g.cyl(0.125, 0.145, 0.1, 0xffffff, 0, 0.28, 0, 10);
  return g;
}
function mailbox() {
  const g = new GB();
  g.box(0.1, 0.6, 0.1, 0x333333, 0, 0, 0);
  g.box(0.5, 0.55, 0.45, 0x2457c5, 0, 0.6, 0);
  g.cylC(0.25, 0.25, 0.45, 0x2457c5, 0, 1.15, 0, PI / 2, 0, 0, 10);
  g.box(0.3, 0.04, 0.02, 0x111111, 0, 1.0, 0.23);
  return g;
}
function trafficLight() {
  const g = new GB();
  g.cyl(0.1, 0.12, 3.4, 0x34383e, 0, 0, 0, 8);
  g.box(0.1, 0.1, 2.0, 0x34383e, 0, 3.3, 0.95);
  g.box(0.36, 1.0, 0.3, 0x222326, 0, 2.6, 1.8);
  g.box(0.2, 0.2, 0.04, 0xff3b30, 0, 3.3, 1.96);
  g.box(0.2, 0.2, 0.04, 0xffcc00, 0, 3.0, 1.96);
  g.box(0.2, 0.2, 0.04, 0x34d058, 0, 2.7, 1.96);
  return g;
}
function busStop() {
  const g = new GB();
  for (const s of [-1.4, 1.4]) g.box(0.08, 2.4, 0.08, 0x9aa1aa, s, 0, -0.5);
  g.box(3.2, 0.1, 1.4, 0xe6e9ec, 0, 2.4, 0);
  g.box(2.8, 1.8, 0.05, 0xb9dbe8, 0, 0.45, -0.55);
  g.box(0.9, 1.6, 0.12, 0xff9e2c, 1.45, 0.5, 0);
  g.box(2.0, 0.08, 0.4, 0x9c6636, -0.2, 0.45, -0.3);
  return g;
}
function kiosk(c) {
  const g = new GB();
  g.box(2.0, 2.2, 1.8, 0xf3efe6, 0, 0, 0);
  g.box(1.7, 1.0, 0.05, GLASS, 0, 1.0, 0.91);
  g.box(2.0, 0.08, 0.6, 0xbbbbbb, 0, 0.95, 1.15);
  for (let i = 0; i < 5; i++) g.boxC(0.4, 0.06, 1.0, i % 2 ? 0xffffff : c, -0.8 + i * 0.4, 2.3, 1.2, 0.35, 0, 0);
  g.box(2.1, 0.25, 1.9, c, 0, 2.2, 0);
  return g;
}
function fountain() {
  const g = new GB(), ST = 0xcfc8b8;
  g.cyl(2.4, 2.5, 0.55, ST, 0, 0, 0, 16);
  g.cyl(2.1, 2.1, 0.05, 0x4fb6ea, 0, 0.52, 0, 16);
  g.cyl(0.35, 0.45, 1.3, ST, 0, 0.5, 0, 10);
  g.cyl(0.95, 0.4, 0.3, ST, 0, 1.75, 0, 12);
  g.cyl(0.8, 0.8, 0.05, 0x7fd0f5, 0, 2.02, 0, 12);
  g.cyl(0.08, 0.2, 0.7, 0xc3ecff, 0, 2.05, 0, 8);
  g.ico(0.18, 0xc3ecff, 0, 2.8, 0);
  return g;
}
function statue() {
  const g = new GB();
  g.box(2.0, 1.0, 2.0, 0xbfb8a8, 0, 0, 0);
  g.box(1.6, 0.25, 1.6, 0xa8a090, 0, 1.0, 0);
  const B = 0x6f8f7a;
  g.box(0.3, 1.0, 0.35, B, -0.2, 1.25, 0); g.box(0.3, 1.0, 0.35, B, 0.2, 1.25, 0);
  g.box(0.9, 1.1, 0.5, B, 0, 2.2, 0);
  g.boxC(0.25, 1.1, 0.25, B, 0.6, 3.4, 0, 0, 0, -0.3);
  g.box(0.5, 0.5, 0.5, B, 0, 3.3, 0);
  return g;
}
function bikeRack() {
  const g = new GB();
  for (let i = 0; i < 4; i++) g.add(new THREE.TorusGeometry(0.35, 0.04, 4, 10, PI), 0x9aa1aa, -0.9 + i * 0.6, 0, 0, 0, PI / 2, 0);
  return g;
}
function bicycle(c) {
  const g = new GB();
  for (const z of [-0.5, 0.5]) g.add(new THREE.TorusGeometry(0.32, 0.04, 4, 12), 0x222222, 0, 0.34, z, 0, PI / 2, 0);
  g.boxC(0.05, 0.05, 0.9, c, 0, 0.6, 0, -0.2, 0, 0);
  g.boxC(0.05, 0.5, 0.05, c, 0, 0.55, -0.2, 0.3, 0, 0);
  g.box(0.12, 0.05, 0.22, 0x222222, 0, 0.82, -0.25);
  g.box(0.5, 0.04, 0.04, 0x222222, 0, 0.9, 0.42);
  return g;
}
function umbrellaTable(c) {
  const g = new GB();
  g.cyl(0.5, 0.5, 0.05, 0xffffff, 0, 0.72, 0, 10); g.cyl(0.05, 0.05, 0.72, 0x888888, 0, 0, 0, 6);
  g.cyl(0.04, 0.04, 2.2, 0x888888, 0, 0.77, 0, 6);
  g.add(new THREE.ConeGeometry(1.2, 0.5, 8), c, 0, 2.75, 0);
  for (const a of [0, PI / 2, PI, PI * 1.5]) g.box(0.35, 0.45, 0.35, 0xffffff, Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85);
  return g;
}
function vending(c) {
  const g = new GB();
  g.box(1.0, 1.9, 0.8, c, 0, 0, 0);
  g.box(0.7, 1.1, 0.04, 0xdde8f2, -0.08, 0.6, 0.41);
  g.box(0.15, 0.5, 0.04, 0x222222, 0.36, 0.9, 0.41);
  return g;
}
function waterTower() {
  const g = new GB();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.box(0.15, 3, 0.15, 0x5a4a3a, x, 0, z);
  g.cyl(1.6, 1.6, 2.2, 0x8a6a4a, 0, 3, 0, 12);
  g.cone(1.75, 1.0, 0x5a5a5a, 0, 5.2, 0, 12);
  return g;
}

// ---------- 建筑 ----------
function house(wall, roof) {
  const g = new GB();
  g.box(6.4, 0.3, 6.4, 0x9a958c, 0, 0, 0);
  g.facade(6, 3.2, 6, wall, 0, 0.3, 0, 2.4, 3.2, 'house');
  g.box(6.3, 0.2, 6.3, 0xf2f2f2, 0, 3.5, 0);
  g.add(new THREE.ConeGeometry(4.75, 2.3, 4), roof, 0, 3.7 + 1.15, 0, 0, PI / 4, 0);
  g.box(0.7, 1.8, 0.7, 0x8a5a44, 1.6, 4.0, -1.0);
  g.box(1.1, 2.0, 0.1, 0x6b4226, 0, 0.3, 3.02);
  g.box(1.5, 0.12, 0.8, 0xbcb6aa, 0, 0.3, 3.4);
  g.boxC(1.8, 0.1, 1.0, roof, 0, 2.55, 3.4, 0.25, 0, 0);
  return g;
}
function shop(wall, aw, sign) {
  const g = new GB();
  g.facade(9, 3.4, 8, 0xe7eef5, 0, 0, 0, 3, 3.4, 'store');
  g.facade(9, 3.2, 8, wall, 0, 3.4, 0, 2.25, 3.2, 'apt');
  g.box(9.4, 0.5, 8.4, 0xf1f1f1, 0, 6.6, 0);
  g.box(9.2, 0.25, 8.2, 0xdedede, 0, 3.3, 0);
  for (let i = 0; i < 6; i++) g.boxC(1.5, 0.08, 1.4, i % 2 ? 0xffffff : aw, -3.75 + i * 1.5, 3.1, 4.55, 0.38, 0, 0);
  g.box(5.0, 1.0, 0.3, sign, 0, 5.4, 4.05);
  g.box(4.4, 0.5, 0.05, 0xffffff, 0, 5.65, 4.22);
  g.box(1.6, 0.9, 1.2, 0xb0b5bb, -2.5, 7.1, -1.5);
  g.box(1.2, 0.7, 1.2, 0xb0b5bb, 2.2, 7.1, -2);
  return g;
}
function apartment(wall, trim) {
  const g = new GB(), F = 5, FH = 3;
  g.box(11.6, 0.6, 11.6, 0x8d8d8d, 0, 0, 0);
  g.facade(11, F * FH, 11, wall, 0, 0.6, 0, 2.75, FH, 'apt');
  for (let f = 1; f < F; f++) g.box(11.25, 0.2, 11.25, trim, 0, 0.6 + f * FH - 0.1, 0);
  g.box(11.5, 0.8, 11.5, trim, 0, 0.6 + F * FH, 0);
  g.box(10.6, 0.1, 10.6, 0x7b7f86, 0, 1.4 + F * FH, 0);
  for (let f = 1; f < F; f++) for (const x of [-2.75, 2.75]) {
    g.box(2.4, 0.15, 1.0, trim, x, 0.6 + f * FH, 5.95);
    g.box(2.4, 0.8, 0.07, trim, x, 0.75 + f * FH, 6.42);
  }
  g.box(3, 0.2, 1.6, trim, 0, 3.2, 6.2);
  g.box(1.6, 2.4, 0.1, 0x4a3a2a, 0, 0.6, 5.52);
  const top = 1.5 + F * FH;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.box(0.12, 1.4, 0.12, 0x5a4a3a, 2.5 + x * 0.8, top, -2 + z * 0.8);
  g.cyl(1.2, 1.2, 1.8, 0x8a6a4a, 2.5, top + 1.4, -2, 10);
  g.cone(1.3, 0.7, 0x5a5a5a, 2.5, top + 3.2, -2, 10);
  g.box(1.4, 0.9, 1.4, 0xb0b5bb, -3, top, 2);
  return g;
}
function office(glass, trim) {
  const g = new GB(), H = 28;
  g.box(12.8, 1, 12.8, 0x9c9a94, 0, 0, 0);
  g.facade(12, H, 12, glass, 0, 1, 0, 3, 4, 'office');
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.box(0.7, H, 0.7, trim, x * 6, 1, z * 6);
  g.box(12.6, 1.3, 12.6, trim, 0, H + 1, 0);
  g.box(11.6, 0.1, 11.6, 0x6e7278, 0, H + 2.3, 0);
  g.cyl(3.4, 3.4, 0.2, 0x3a3d42, 0, H + 2.3, 0, 16);
  g.cyl(2.8, 2.8, 0.05, 0xffd23f, 0, H + 2.5, 0, 16);
  g.cyl(2.5, 2.5, 0.06, 0x3a3d42, 0, H + 2.5, 0, 16);
  g.box(0.4, 0.06, 2.0, 0xffffff, -0.6, H + 2.55, 0); g.box(0.4, 0.06, 2.0, 0xffffff, 0.6, H + 2.55, 0); g.box(0.9, 0.06, 0.35, 0xffffff, 0, H + 2.55, 0);
  g.box(2.4, 1.2, 1.6, 0xb0b5bb, -4.5, H + 2.3, -4.5);
  g.box(4, 0.3, 1.5, 0x9c9a94, 0, 1, 6.6);
  return g;
}
function skyscraper(glass, trim) {
  const g = new GB();
  g.facade(14, 8, 14, 0xd9d3c5, 0, 0, 0, 3.5, 4, 'store');
  g.box(14.4, 0.8, 14.4, trim, 0, 8, 0);
  g.facade(10, 36, 10, glass, 0, 8.8, 0, 2.5, 4, 'tower');
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.box(0.5, 36, 0.5, trim, x * 5, 8.8, z * 5);
  for (let i = 1; i < 3; i++) g.box(10.3, 0.5, 10.3, trim, 0, 8.8 + i * 12, 0);
  g.box(10.4, 1, 10.4, trim, 0, 44.8, 0);
  g.facade(6.5, 8, 6.5, glass, 0, 45.8, 0, 2.2, 4, 'tower');
  g.box(7, 0.8, 7, trim, 0, 53.8, 0);
  g.cyl(0.6, 1.0, 2, trim, 0, 54.6, 0, 8);
  g.cyl(0.08, 0.15, 6, 0xd0d0d0, 0, 56.6, 0, 6);
  g.sph(0.25, 0xff3b30, 0, 62.6, 0, 6, 4);
  g.box(6, 0.4, 1.4, trim, 0, 4, 7.4);
  return g;
}
function towerSlim(glass, trim) {
  const g = new GB();
  g.facade(9, 32, 9, glass, 0, 0, 0, 2.25, 4, 'tower');
  g.box(9.6, 4, 9.6, 0xd3cfc4, 0, 0, 0);
  for (let i = 1; i < 4; i++) g.box(9.2, 0.35, 9.2, trim, 0, i * 8, 0);
  g.box(9.4, 1.2, 9.4, trim, 0, 32, 0);
  g.box(5, 3, 5, 0xb5bcc4, 0, 33.2, 0);
  g.cyl(0.08, 0.12, 6, 0xd0d0d0, 2, 33.2, 2, 6);
  return g;
}
function gasStation() {
  const g = new GB();
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) g.box(0.4, 4, 0.4, 0xeaeaea, x, 0, z);
  g.box(8, 0.6, 6, 0xffffff, 0, 4, 0);
  g.box(8.05, 0.3, 6.05, 0x1f8f4f, 0, 4.1, 0);
  for (const x of [-1.5, 1.5]) { g.box(0.6, 0.15, 2.4, 0xbcbcbc, x, 0, 0); g.box(0.5, 1.4, 0.7, 0xe23b2e, x, 0.15, 0); g.box(0.4, 0.4, 0.05, 0x111111, x, 1.0, 0.36); }
  return g;
}
function parkingBooth() {
  const g = new GB();
  g.box(1.6, 2.4, 1.6, 0xf0f0f0, 0, 0, 0);
  g.box(1.3, 0.9, 0.05, GLASS, 0, 1.2, 0.81);
  g.box(1.9, 0.2, 1.9, 0x2457c5, 0, 2.4, 0);
  return g;
}

// ---------- 类型注册 ----------
export function buildTypes() {
  const T = [];
  const def = (name, gb, cat, opts = {}) => {
    const geos = gb.build();
    let bb = new THREE.Box3();
    for (const k in geos) bb.union(geos[k].boundingBox);
    const hw = Math.max(-bb.min.x, bb.max.x), hd = Math.max(-bb.min.z, bb.max.z);
    const fr = opts.fr ?? (Math.max(hw, hd) * 0.85 + Math.min(hw, hd) * 0.25);
    const h = bb.max.y;
    const value = opts.value ?? Math.max(1, Math.round(fr * fr * (1 + Math.min(h, 40) * 0.05) * 1.6));
    const t = { id: T.length, name, geos, cat, fr, h, value, shadow: opts.shadow ?? true };
    T.push(t); return t;
  };
  const carCols = [0xe23b2e, 0x2b6fd6, 0xf2f2f2, 0x2d2f33, 0x3fae5a, 0xff8a1f, 0x8a4fd1, 0x9aa3ad];
  const out = { cars: [], big: [], people: [], trees: [], houses: [], shops: [], apts: [], offices: [], skys: [], misc: {} };
  carCols.forEach(c => out.cars.push(def('sedan', sedan(c), 'car')));
  [0xe23b2e, 0x1f3a5f, 0xf2f2f2, 0x3fae5a].forEach(c => out.cars.push(def('suv', suv(c), 'car')));
  out.cars.push(def('taxi', taxi(), 'car'), def('taxi', taxi(), 'car'), def('police', police(), 'car'));
  out.big.push(def('van', van(0xf2f2f2), 'car'), def('van', van(0x2b6fd6), 'car'), def('truck', truck(0x2b6fd6), 'car'), def('truck', truck(0xe23b2e), 'car'),
    def('bus', bus(0xf2b705), 'car'), def('bus', bus(0x2a9d8f), 'car'), def('firetruck', fireTruck(), 'car'));
  out.misc.moto = [def('moto', moto(0xe23b2e), 'small'), def('moto', moto(0x2d2f33), 'small')];
  const shirts = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xffffff, 0x8338ec, 0xffbe0b, 0x3a86ff, 0xff006e, 0x6a994e];
  const pants = [0x1d3557, 0x333333, 0x6b705c, 0x264653, 0x7f5539];
  const hairs = [0x222222, 0x5a3825, 0xd9a441, 0x8c2f1a, 0x111111];
  const skins = [0xf1c27d, 0xe0ac69, 0xffdbac, 0xc68642, 0x8d5524];
  for (let i = 0; i < 10; i++) out.people.push(def('person', person(shirts[i], pants[i % 5], hairs[(i * 3) % 5], skins[(i * 7) % 5]), 'person', { value: 1 }));
  out.trees.push(def('tree', treeRound(0x4caf50, 0x66c35a), 'tree'), def('tree', treeRound(0x3d9a48, 0x58b04f), 'tree'),
    def('tree', treeRound(0x8bc34a, 0xa5d65a), 'tree'), def('pine', treePine(0x2e7d4f), 'tree'), def('pine', treePine(0x3b8c5a), 'tree'));
  out.misc.treeAutumn = def('tree', treeRound(0xf2a541, 0xf6c453), 'tree');
  out.misc.palm = def('palm', palm(), 'tree');
  out.misc.bush = [def('bush', bush(0x4f9d46), 'small', { value: 2 }), def('bush', bush(0x6bb34f), 'small', { value: 2 })];
  out.misc.flower = def('flower', flowerBed(), 'small', { value: 3 });
  out.misc.lamp = def('lamp', lamp(), 'small', { fr: 0.4, value: 2 });
  out.misc.bench = def('bench', bench(), 'small', { value: 3 });
  out.misc.hydrant = def('hydrant', hydrant(), 'small', { value: 1, shadow: false });
  out.misc.trash = def('trash', trashBin(), 'small', { value: 1 });
  out.misc.cone = def('cone', cone(), 'small', { value: 1, shadow: false });
  out.misc.mailbox = def('mailbox', mailbox(), 'small', { value: 1 });
  out.misc.tlight = def('tlight', trafficLight(), 'small', { fr: 0.6, value: 3 });
  out.misc.busStop = def('busstop', busStop(), 'mid');
  out.misc.kiosk = [def('kiosk', kiosk(0xe63946), 'mid'), def('kiosk', kiosk(0x2a9d8f), 'mid')];
  out.misc.fountain = def('fountain', fountain(), 'mid');
  out.misc.statue = def('statue', statue(), 'mid');
  out.misc.bikeRack = def('rack', bikeRack(), 'small', { value: 2 });
  out.misc.bicycle = [def('bike', bicycle(0x2b6fd6), 'small', { value: 1 }), def('bike', bicycle(0xe23b2e), 'small', { value: 1 })];
  out.misc.umbrella = [def('umbrella', umbrellaTable(0xe63946), 'small'), def('umbrella', umbrellaTable(0x2a9d8f), 'small')];
  out.misc.vending = [def('vending', vending(0xe23b2e), 'small'), def('vending', vending(0x2b6fd6), 'small')];
  out.misc.waterTower = def('watertower', waterTower(), 'mid');
  out.misc.gas = def('gas', gasStation(), 'big');
  out.misc.booth = def('booth', parkingBooth(), 'small');
  [[0xf6e7c1, 0xc0392b], [0xdfe9f3, 0x34495e], [0xf9d5c5, 0x7b4b3a], [0xe3f1dc, 0x8e5a3c], [0xfff3b0, 0x2e6f95]].forEach(([w, r]) => out.houses.push(def('house', house(w, r), 'bld')));
  [[0xf4d6a0, 0xe63946, 0x1d3557], [0xcde3f0, 0x2a9d8f, 0xe76f51], [0xf1e2f8, 0xff7f11, 0x3a0ca3], [0xe9edc9, 0x3a86ff, 0xd62828]].forEach(([w, a, s]) => out.shops.push(def('shop', shop(w, a, s), 'bld')));
  [[0xf2c6a0, 0xffffff], [0xc9dde8, 0xf3f3f3], [0xe8d8b8, 0xffffff], [0xd9b8a8, 0xf0e6dc]].forEach(([w, t]) => out.apts.push(def('apartment', apartment(w, t), 'bld')));
  [[0x7fb3d5, 0xe8e8e8], [0x8fd3c7, 0xdedede], [0xa9b7c6, 0x5d6d7e]].forEach(([g, t]) => out.offices.push(def('office', office(g, t), 'bld')));
  [[0x6fa8dc, 0xdcdcdc], [0x7ec8c8, 0xeeeeee], [0xd4b483, 0x6b5b45]].forEach(([g, t]) => out.skys.push(def('sky', skyscraper(g, t), 'bld')));
  [[0x9ec5e8, 0xf0f0f0], [0xa7d7c5, 0x4a4e69]].forEach(([g, t]) => out.skys.push(def('tower', towerSlim(g, t), 'bld')));
  return { list: T, groups: out };
}

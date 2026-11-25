// 城市生成：道路网格 + 街区 + 物件布置
import * as THREE from 'three';

export const N = 6, BLOCK = 30, SW = 3, ROAD = 12, CELL = BLOCK + 2 * SW + ROAD; // 48
export const HALF = N * CELL / 2;            // 道路中心外沿 = 144
export const BOUND = HALF + ROAD / 2 + 4;    // 黑洞活动边界
export const roadCenters = []; for (let k = 0; k <= N; k++) roadCenters.push(-HALF + k * CELL);
export const blockCenters = []; for (let k = 0; k < N; k++) blockCenters.push(-HALF + CELL / 2 + k * CELL);

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function generateCity(types, seed = (Math.random() * 1e9) | 0) {
  const R = rng(seed), G = types.groups;
  const pick = (a) => a[(R() * a.length) | 0];
  const objs = [];      // {t, x, z, yaw}
  const lanes = [];     // 车道（移动车辆）
  const walkers = [];   // 绕街区行走的行人 {t, cx, cz, p, dir, speed}
  const add = (t, x, z, yaw = 0) => { objs.push({ t, x, z, yaw }); };
  const blockKinds = [];

  // ---- 街区类型 ----
  const kinds = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = Math.max(Math.abs(i - 2.5), Math.abs(j - 2.5));
    let k;
    if (d < 1) k = 'downtown';
    else if (d < 2) k = pick(['mid', 'mid', 'mid', 'mid', 'plaza', 'park']);
    else k = pick(['suburb', 'suburb', 'suburb', 'suburb', 'park', 'parking', 'mid', 'suburb']);
    kinds.push(k);
  }
  const ensure = (k) => { if (!kinds.includes(k)) { const outer = []; kinds.forEach((v, idx) => { const i = (idx / N) | 0, j = idx % N; if (Math.max(Math.abs(i - 2.5), Math.abs(j - 2.5)) > 1 && v !== 'park' && v !== 'plaza' && v !== 'parking') outer.push(idx); }); kinds[pick(outer)] = k; } };
  ensure('park'); ensure('plaza'); ensure('parking');

  const rot4 = () => ((R() * 4) | 0) * Math.PI / 2;
  const faceOut = (lx, lz) => Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? Math.PI / 2 : -Math.PI / 2) : (lz > 0 ? 0 : Math.PI);

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = blockCenters[i], cz = blockCenters[j], kind = kinds[i * N + j];
    blockKinds.push({ cx, cz, kind });
    const P = (lx, lz) => [cx + lx, cz + lz];
    const put = (t, lx, lz, yaw = 0) => { const [x, z] = P(lx, lz); add(t, x, z, yaw); };
    const peopleIdle = (n, r = 13) => { for (let k = 0; k < n; k++) put(pick(G.people), (R() * 2 - 1) * r, (R() * 2 - 1) * r, R() * 6.28); };

    if (kind === 'downtown') {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) {
        const r = R();
        put(r < 0.45 ? pick(G.skys) : r < 0.85 ? pick(G.offices) : pick(G.apts), lx, lz, faceOut(lx, lz));
      }
      put(G.misc.flower, 0, 0, 0); peopleIdle(3, 2);
    } else if (kind === 'mid') {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) {
        const r = R(), yaw = faceOut(lx, lz);
        if (r < 0.45) put(pick(G.apts), lx, lz, yaw);
        else if (r < 0.65) put(pick(G.offices), lx, lz, yaw);
        else if (r < 0.88) { put(pick(G.shops), lx, lz, yaw); put(pick(G.misc.umbrella), lx + (lx > 0 ? -5 : 5), lz + (lz > 0 ? -5.5 : 5.5)); }
        else { put(G.misc.gas, lx, lz, yaw); put(pick(G.cars), lx - 1.5, lz + 3.5, 0); }
      }
      peopleIdle(2, 1.5);
    } else if (kind === 'suburb') {
      for (const lx of [-10, 0, 10]) for (const lz of [-10, 0, 10]) {
        if (lx === 0 && lz === 0) { put(pick(G.trees), -2, -2); put(pick(G.trees), 2, 2); put(G.misc.bench, 0, 0, R() * 6); continue; }
        const yaw = faceOut(lx, lz);
        if (R() < 0.8) {
          put(pick(G.houses), lx, lz, yaw);
          const ox = lx === 0 ? 4.2 : -Math.sign(lx) * 4.3, oz = lz === 0 ? 4.2 : -Math.sign(lz) * 4.3;
          if (R() < 0.6) put(pick(G.misc.bush), lx + ox, lz + (R() - 0.5) * 6);
          if (R() < 0.5) put(R() < 0.5 ? pick(G.trees) : G.misc.treeAutumn, lx + (R() - 0.5) * 6, lz + oz);
          if (R() < 0.3) put(pick(G.misc.bicycle), lx + ox * 0.8, lz + oz * 0.8, R() * 6);
        } else put(pick(G.shops), lx, lz, yaw);
      }
      peopleIdle(3, 13);
    } else if (kind === 'park') {
      put(G.misc.fountain, 0, 0);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; put(G.misc.bench, Math.cos(a) * 4.6, Math.sin(a) * 4.6, -a + Math.PI / 2 * 3 - Math.PI / 2); }
      for (let k = 0; k < 26; k++) {
        let lx = (R() * 2 - 1) * 13.5, lz = (R() * 2 - 1) * 13.5;
        if (Math.abs(lx) < 2.5 || Math.abs(lz) < 2.5 || Math.hypot(lx, lz) < 6) continue;
        const r = R(); put(r < 0.7 ? pick(G.trees) : r < 0.82 ? G.misc.treeAutumn : r < 0.92 ? pick(G.misc.bush) : G.misc.flower, lx, lz, R() * 6);
      }
      for (const s of [-1, 1]) { put(G.misc.lamp, s * 1.8, 9, 0); put(G.misc.lamp, 9, s * 1.8, Math.PI / 2); }
      put(pick(G.misc.kiosk), -9, -9, Math.PI / 4); put(pick(G.misc.vending), 9, -9, 0);
      for (let k = 0; k < 10; k++) { const a = R() * 6.28, d = 6 + R() * 5; put(pick(G.people), Math.cos(a) * d * (R() < 0.5 ? 0.2 : 1), Math.sin(a) * d, R() * 6.28); }
    } else if (kind === 'plaza') {
      put(G.misc.statue, 0, 0);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; put(pick(G.trees), Math.cos(a) * 11, Math.sin(a) * 11); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; put(G.misc.flower, Math.cos(a) * 5, Math.sin(a) * 5, -a); }
      put(G.misc.kiosk[0], -6, 8, 0); put(G.misc.kiosk[1], 6, -8, Math.PI);
      put(G.misc.umbrella[0], 7, 7); put(G.misc.umbrella[1], -7, -6); put(G.misc.bench, 0, -8, 0); put(G.misc.bench, 0, 8, Math.PI);
      put(G.misc.bikeRack, -9, 2, Math.PI / 2); put(pick(G.misc.bicycle), -9.6, 4, 0.2);
      peopleIdle(16, 12);
    } else if (kind === 'parking') {
      put(G.misc.booth, 12, 12, 0);
      for (const lz of [-10, -3.5, 3.5, 10]) for (let k = 0; k < 9; k++) {
        if (R() < 0.18) continue;
        put(R() < 0.12 ? pick(G.big.slice(0, 4)) : pick(G.cars), -12 + k * 2.9, lz, (lz < 0 ? 0 : Math.PI) + (R() - 0.5) * 0.1);
      }
      put(G.misc.waterTower, 12, -13); for (const lz of [-6.8, 6.8]) { put(G.misc.lamp, -6, lz, 0); put(G.misc.lamp, 6, lz, 0); }
      peopleIdle(3, 13);
    }

    // ---- 人行道物件 ----
    const S = 17.2; // 路沿侧
    for (let side = 0; side < 4; side++) {
      const yaw = side * Math.PI / 2;
      const at = (t, along, off) => { // side 0: +z 边
        let lx, lz;
        if (side === 0) { lx = along; lz = off; } else if (side === 1) { lx = off; lz = -along; } else if (side === 2) { lx = -along; lz = -off; } else { lx = -off; lz = along; }
        put(t, lx, lz, yaw);
      };
      for (const a of [-12, 0, 12]) at(G.misc.lamp, a, S);
      for (const a of [-6, 6]) if (R() < 0.85) at(R() < 0.9 ? pick(G.trees.slice(0, 3)) : G.misc.palm, a, S - 0.2);
      if (R() < 0.6) at(G.misc.hydrant, -9 + R() * 18, S);
      if (R() < 0.6) at(G.misc.trash, -3 + R() * 2, S - 0.4);
      if (R() < 0.35) at(G.misc.bench, 3 + R() * 2, 15.6);
      if (R() < 0.25) at(G.misc.mailbox, -14, 15.8);
      if (R() < 0.2) at(G.misc.busStop, 9, 16.3);
      if (R() < 0.25) for (let c = 0; c < 3; c++) at(G.misc.cone, -10 + c * 1.2, S + 1.6);
      if (R() < 0.3) at(pick(G.misc.moto), 15, S + 1.3);
    }
    for (const [sx, sz] of [[-1, -1], [1, 1]]) put(G.misc.tlight, sx * 17.4, sz * 17.4, sx > 0 ? 0 : Math.PI);
    // 行人绕街区
    const nW = 5 + ((R() * 4) | 0);
    for (let k = 0; k < nW; k++) walkers.push({ t: pick(G.people), cx, cz, p: R() * 132, dir: R() < 0.5 ? 1 : -1, speed: 1.1 + R() * 0.7, off: 16.2 + (R() - 0.5) * 1.2 });
  }

  // ---- 路边停车 ----
  for (let k = 0; k <= N; k++) for (let b = 0; b < N; b++) for (const s of [-1, 1]) {
    if (R() < 0.45) continue;
    const rc = roadCenters[k], bc = blockCenters[b];
    const cnt = 1 + ((R() * 3) | 0);
    for (let c = 0; c < cnt; c++) {
      const along = bc - 8 + c * 5.5 + R();
      const t = R() < 0.1 ? pick(G.big.slice(0, 4)) : pick(G.cars);
      if (R() < 0.5) add(t, along, rc + s * 4.6, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      else add(t, rc + s * 4.6, along, s > 0 ? Math.PI : 0);
    }
  }
  // ---- 车道 ----
  const L = 2 * HALF + 16;
  for (let k = 0; k <= N; k++) for (const axis of ['x', 'z']) for (const dir of [1, -1]) {
    const lane = { axis, dir, fixed: roadCenters[k] + (axis === 'x' ? dir * 1.6 : -dir * 1.6), cars: [], speed: 7 + R() * 3, L };
    const n = 3 + ((R() * 3) | 0);
    const off = R() * L;
    for (let c = 0; c < n; c++) {
      const r = R();
      const t = r < 0.18 ? pick(G.big) : r < 0.26 ? pick(G.misc.moto) : pick(G.cars);
      lane.cars.push({ t, s: ((off + c * L / n) % L) - L / 2, v: lane.speed });
    }
    lanes.push(lane);
  }
  // ---- 地图外圈树 ----
  for (let a = -HALF - 10; a <= HALF + 10; a += 7) for (const s of [-1, 1]) {
    add(pick(G.trees), a + R() * 2, s * (HALF + 10 + R() * 2));
    add(pick(G.trees), s * (HALF + 10 + R() * 2), a + R() * 2);
  }
  return { objs, lanes, walkers, blockKinds, seed };
}

// ---------- 地面：合并的顶点色几何体（清晰，无大贴图） ----------
export function buildGround(blockKinds) {
  const pos = [], col = [], uv = [];
  const c = new THREE.Color();
  const quad = (x0, z0, x1, z1, y, color) => {
    c.set(color);
    const v = [[x0, z0], [x1, z0], [x1, z1], [x0, z0], [x1, z1], [x0, z1]];
    // 逆时针（从上往下看）以保证法线朝上
    const order = [0, 2, 1, 3, 5, 4];
    for (const o of order) { const [x, z] = v[o]; pos.push(x, y, z); col.push(c.r, c.g, c.b); uv.push(x / 6, z / 6); }
  };
  const E = 400;
  quad(-E, -E, E, E, 0, 0x86c35e);
  const RW = ROAD / 2, ext = HALF + RW;
  const ASPH = 0x50555d, LINE = 0xf4f4f4, YEL = 0xf2c230;
  for (const rc of roadCenters) {
    quad(-ext, rc - RW, ext, rc + RW, 0.01, ASPH);
    quad(rc - RW, -ext, rc + RW, ext, 0.01, ASPH);
  }
  // 车道线（只在路段上，不进入路口）
  for (const rc of roadCenters) for (let b = 0; b < N; b++) {
    const a0 = blockCenters[b] - CELL / 2 + RW + 2.5, a1 = blockCenters[b] + CELL / 2 - RW - 2.5;
    quad(a0, rc - 0.22, a1, rc - 0.07, 0.02, YEL); quad(a0, rc + 0.07, a1, rc + 0.22, 0.02, YEL);
    quad(rc - 0.22, a0, rc - 0.07, a1, 0.02, YEL); quad(rc + 0.07, a0, rc + 0.22, a1, 0.02, YEL);
    for (let a = a0; a < a1 - 1.5; a += 4) for (const s of [-1, 1]) {
      quad(a, rc + s * 3.05 - 0.08, a + 2, rc + s * 3.05 + 0.08, 0.02, LINE);
      quad(rc + s * 3.05 - 0.08, a, rc + s * 3.05 + 0.08, a + 2, 0.02, LINE);
    }
    // 人行横道
    for (const e of [a0 - 2.2, a1 + 0.4]) for (let w = -RW + 0.6; w < RW - 0.5; w += 1.1) {
      quad(e, rc + w, e + 1.8, rc + w + 0.6, 0.02, LINE);
      quad(rc + w, e, rc + w + 0.6, e + 1.8, 0.02, LINE);
    }
  }
  const groundColor = { downtown: 0xd8d2c4, mid: 0xd3cdbf, suburb: 0x8ccb63, park: 0x7cc456, plaza: 0xe0d6c2, parking: 0x6b7078 };
  for (const b of blockKinds) {
    const { cx, cz, kind } = b, h = BLOCK / 2;
    quad(cx - h - SW, cz - h - SW, cx + h + SW, cz + h + SW, 0.03, 0xb9b4aa);       // 路沿
    quad(cx - h - SW + 0.3, cz - h - SW + 0.3, cx + h + SW - 0.3, cz + h + SW - 0.3, 0.04, 0xd9d5cc); // 人行道
    for (let a = -h - SW + 1.5; a < h + SW; a += 1.5) {   // 地砖缝
      quad(cx + a - 0.03, cz - h - SW + 0.3, cx + a + 0.03, cz - h, 0.045, 0xc6c1b7);
      quad(cx + a - 0.03, cz + h, cx + a + 0.03, cz + h + SW - 0.3, 0.045, 0xc6c1b7);
      quad(cx - h - SW + 0.3, cz + a - 0.03, cx - h, cz + a + 0.03, 0.045, 0xc6c1b7);
      quad(cx + h, cz + a - 0.03, cx + h + SW - 0.3, cz + a + 0.03, 0.045, 0xc6c1b7);
    }
    quad(cx - h, cz - h, cx + h, cz + h, 0.05, groundColor[kind]);
    if (kind === 'park') {
      quad(cx - 1.6, cz - h, cx + 1.6, cz + h, 0.06, 0xe3d3ad); quad(cx - h, cz - 1.6, cx + h, cz + 1.6, 0.06, 0xe3d3ad);
      const circ = 32; c.set(0xe3d3ad);
      for (let k = 0; k < circ; k++) { const a0 = k / circ * Math.PI * 2, a1 = (k + 1) / circ * Math.PI * 2, r = 6.2; for (const [x, z] of [[0, 0], [Math.cos(a1) * r, Math.sin(a1) * r], [Math.cos(a0) * r, Math.sin(a0) * r]]) { pos.push(cx + x, 0.065, cz + z); col.push(c.r, c.g, c.b); uv.push((cx + x) / 6, (cz + z) / 6); } }
    } else if (kind === 'parking') {
      for (const lz of [-10, -3.5, 3.5, 10]) for (let k = 0; k <= 9; k++) { const x = cx - 13.45 + k * 2.9; quad(x - 0.06, cz + lz - 2.4, x + 0.06, cz + lz + 2.4, 0.06, LINE); }
    } else if (kind === 'suburb') {
      for (const lx of [-10, 0, 10]) for (const lz of [-10, 0, 10]) if (lx || lz) quad(cx + lx - 3.6, cz + lz - 3.6, cx + lx + 3.6, cz + lz + 3.6, 0.06, 0xa7a196);
    } else if (kind === 'plaza') {
      for (let a = -h + 2; a < h; a += 2) { quad(cx + a - 0.04, cz - h, cx + a + 0.04, cz + h, 0.06, 0xcfc4ae); quad(cx - h, cz + a - 0.04, cx + h, cz + a + 0.04, 0.06, 0xcfc4ae); }
    } else {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) quad(cx + lx - 7, cz + lz - 7, cx + lx + 7, cz + lz + 7, 0.06, 0xbdb7ab);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function noiseTexture() {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = 228 + Math.random() * 27; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

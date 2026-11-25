// 城市生成：道路网格 + 街区 + 物件布置（v3：可变尺寸 + 主题，用于闯关）
import * as THREE from 'three';

export const BLOCK = 30, SW = 3, ROAD = 12, CELL = BLOCK + 2 * SW + ROAD; // 48
export let N = 6, HALF = 144, BOUND = 154;
export const roadCenters = [], blockCenters = [];
export function setLayout(n) {
  N = n; HALF = N * CELL / 2; BOUND = HALF + ROAD / 2 + 4;
  roadCenters.length = 0; blockCenters.length = 0;
  for (let k = 0; k <= N; k++) roadCenters.push(-HALF + k * CELL);
  for (let k = 0; k < N; k++) blockCenters.push(-HALF + CELL / 2 + k * CELL);
}
setLayout(6);

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function generateCity(types, seed = (Math.random() * 1e9) | 0, opts = null) {
  setLayout(opts ? opts.n : 6);
  const R = rng(seed), G = types.groups, TH = opts ? opts.theme : {}, TG = G.theme;
  const diff = opts ? opts.diff : 1;
  const pick = (a) => a[(R() * a.length) | 0];
  const objs = [], lanes = [], walkers = [], stacks = [], blockKinds = [];
  const add = (t, x, z, yaw = 0, col) => {
    const gold = t.cat !== 'bld' && t.cat !== 'seg' && t.cat !== 'coin' && R() < 0.025;
    if (col === undefined && TH.leaf && t.cat === 'tree' && (t.name === 'tree' || t.name === 'pine')) col = pick(TH.leaf);
    objs.push({ t, x, z, yaw, col: col ?? pick(t.pal), gold });
  };
  const addStack = (k, x, z, n) => { if (opts) n = Math.max(3, Math.min(n, Math.round(6 + diff * 48))); stacks.push({ k, x, z, n, yaw: ((R() * 4) | 0) * Math.PI / 2, c1: pick(G.segs ? types.groups.segs[k].a.pal : [0xffffff]), c2: pick(types.groups.segs[k].a.pal) }); };
  let kinds = [];
  if (opts) kinds = opts.kinds.slice();
  else {
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const d = Math.max(Math.abs(i - 2.5), Math.abs(j - 2.5));
      let k;
      if (d < 1) k = 'downtown';
      else if (d < 2) k = pick(['mid', 'mid', 'mid', 'plaza', 'park', 'stacks']);
      else k = pick(['suburb', 'suburb', 'suburb', 'suburb', 'park', 'parking', 'mid', 'stacks']);
      kinds.push(k);
    }
    const ensure = (k, n = 1) => { let have = kinds.filter(v => v === k).length; while (have < n) { const c = []; kinds.forEach((v, idx) => { const i = (idx / N) | 0, j = idx % N; if (Math.max(Math.abs(i - 2.5), Math.abs(j - 2.5)) > 1 && v !== 'park' && v !== 'plaza' && v !== 'parking' && v !== 'stacks') c.push(idx); }); kinds[pick(c)] = k; have++; } };
    ensure('park'); ensure('plaza'); ensure('parking'); ensure('stacks', 2);
  }
  const faceOut = (lx, lz) => Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? Math.PI / 2 : -Math.PI / 2) : (lz > 0 ? 0 : Math.PI);
  const M = G.misc;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = blockCenters[i], cz = blockCenters[j], kind = kinds[i * N + j];
    blockKinds.push({ cx, cz, kind });
    const put = (t, lx, lz, yaw = 0, col) => add(t, cx + lx, cz + lz, yaw, col);
    const peopleIdle = (n, r = 13) => { for (let k = 0; k < n; k++) put(pick(G.people), (R() * 2 - 1) * r, (R() * 2 - 1) * r, R() * 6.28); };
    const tree = (lx, lz) => { const t = pick(G.trees); put(t, lx, lz, R() * 6.28, t.name === 'tree' && R() < 0.2 ? pick(M.autumn) : undefined); };
    if (kind === 'downtown') {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) {
        const r = R();
        if (r < 0.4) addStack(R() < 0.5 ? 'L' : 'M', cx + lx, cz + lz, 22 + ((R() * 30) | 0));
        else put(r < 0.65 ? pick(G.skys) : r < 0.88 ? pick(G.offices) : pick(G.apts), lx, lz, faceOut(lx, lz));
      }
      put(M.flower, 0, 0); peopleIdle(3, 2);
    } else if (kind === 'stacks') {
      for (const lx of [-10, 0, 10]) for (const lz of [-10, 0, 10]) {
        if (lx === 0 && lz === 0) { addStack('M', cx, cz, 30 + ((R() * 25) | 0)); continue; }
        addStack(R() < 0.6 ? 'S' : 'M', cx + lx, cz + lz, 6 + ((R() * 22) | 0));
      }
      peopleIdle(6, 14);
    } else if (kind === 'mid') {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) {
        const r = R(), yaw = faceOut(lx, lz);
        if (r < 0.3) put(pick(G.apts), lx, lz, yaw);
        else if (r < 0.45) put(pick(G.offices), lx, lz, yaw);
        else if (r < 0.65) addStack(R() < 0.7 ? 'M' : 'S', cx + lx, cz + lz, 10 + ((R() * 16) | 0));
        else if (r < 0.9) { put(pick(G.shops), lx, lz, yaw); put(M.umbrella, lx + (lx > 0 ? -5 : 5), lz + (lz > 0 ? -5.5 : 5.5)); }
        else { put(M.gas, lx, lz, yaw); put(pick(G.cars), lx - 1.5, lz + 3.5, 0); }
      }
      peopleIdle(2, 1.5);
    } else if (kind === 'suburb') {
      for (const lx of [-10, 0, 10]) for (const lz of [-10, 0, 10]) {
        if (lx === 0 && lz === 0) { if (R() < 0.5) addStack('S', cx, cz, 5 + ((R() * 10) | 0)); else { tree(-2, -2); tree(2, 2); put(M.bench, 0, 0, R() * 6); } continue; }
        const yaw = faceOut(lx, lz);
        if (R() < 0.8) {
          put(pick(G.houses), lx, lz, yaw);
          const ox = lx === 0 ? 4.2 : -Math.sign(lx) * 4.3, oz = lz === 0 ? 4.2 : -Math.sign(lz) * 4.3;
          if (R() < 0.6) put(M.bush, lx + ox, lz + (R() - 0.5) * 6);
          if (R() < 0.5) tree(lx + (R() - 0.5) * 6, lz + oz);
          if (R() < 0.3) put(M.bicycle, lx + ox * 0.8, lz + oz * 0.8, R() * 6);
        } else put(pick(G.shops), lx, lz, yaw);
      }
      peopleIdle(3, 13);
    } else if (kind === 'park') {
      put(M.fountain, 0, 0);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; put(M.bench, Math.cos(a) * 4.6, Math.sin(a) * 4.6, Math.PI / 2 - a); }
      for (let k = 0; k < 24; k++) {
        const lx = (R() * 2 - 1) * 13.5, lz = (R() * 2 - 1) * 13.5;
        if (Math.abs(lx) < 2.5 || Math.abs(lz) < 2.5 || Math.hypot(lx, lz) < 6) continue;
        const r = R(); if (r < 0.75) tree(lx, lz); else if (r < 0.9) put(M.bush, lx, lz); else put(M.flower, lx, lz, R() * 6);
      }
      for (const s of [-1, 1]) { put(M.lamp, s * 1.8, 9); put(M.lamp, 9, s * 1.8); }
      put(M.kiosk, -9, -9, Math.PI / 4); put(M.vending, 9, -9);
      for (let k = 0; k < 10; k++) { const a = R() * 6.28, d = 6 + R() * 5; put(pick(G.people), Math.cos(a) * d, Math.sin(a) * d, R() * 6.28); }
    } else if (kind === 'plaza') {
      put(M.statue, 0, 0);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; tree(Math.cos(a) * 11, Math.sin(a) * 11); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; put(M.flower, Math.cos(a) * 5, Math.sin(a) * 5, -a); }
      put(M.kiosk, -6, 8, 0); put(M.kiosk, 6, -8, Math.PI);
      put(M.umbrella, 7, 7); put(M.umbrella, -7, -6); put(M.bench, 0, -8, 0); put(M.bench, 0, 8, Math.PI);
      peopleIdle(16, 12);
    } else if (kind === 'parking') {
      for (const lz of [-10, -3.5, 3.5, 10]) for (let k = 0; k < 9; k++) {
        if (R() < 0.18) continue;
        put(R() < 0.12 ? pick(G.big.slice(0, 2)) : pick(G.cars), -12 + k * 2.9, lz, (lz < 0 ? 0 : Math.PI) + (R() - 0.5) * 0.1);
      }
      put(M.waterTower, 12, -13); for (const lz of [-6.8, 6.8]) { put(M.lamp, -6, lz); put(M.lamp, 6, lz); }
      peopleIdle(3, 13);
    } else if (kind === 'farm') {
      put(G.barn, -8.5, -8.5, Math.PI / 4); put(M.waterTower, -12, 4);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) put(TG.crop, 2 + c * 3.2, -12 + r * 2.6, 0);
      for (let k = 0; k < 5; k++) put(TG.hay, -2 + R() * 14, 2 + R() * 4, R() * 6.28);
      for (let k = 0; k < 6; k++) put(TG.cow, -13 + R() * 26, 8 + R() * 5, R() * 6.28);
      put(TG.tractor, -3, -2, R() * 6.28); tree(-13, 13); tree(13, 13); peopleIdle(2, 10);
    } else if (kind === 'beach') {
      for (let k = 0; k < 5; k++) put(TG.palm, -13 + k * 6.5 + R() * 2, -12 + R() * 3, R() * 6.28);
      for (let k = 0; k < 6; k++) { const x = -11 + (k % 3) * 11 + R() * 2, z = -3 + ((k / 3) | 0) * 7; put(M.umbrella, x, z); put(pick(G.people), x + 1.5, z + 0.6, R() * 6.28); if (R() < 0.6) put(TG.ball, x - 1.6, z + 1.2); }
      for (let k = 0; k < 3; k++) put(TG.sandcastle, -9 + k * 9, 9, R());
      for (let k = 0; k < 2; k++) put(TG.boat, -7 + k * 14, 13, Math.PI / 2 + (R() - 0.5) * 0.4);
      peopleIdle(5, 12);
    } else if (kind === 'harbor') {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) put(TG.container, -12 + c * 3.2, -10 + r * 7, 0);
      put(TG.crane, 9, -6, Math.PI);
      for (let k = 0; k < 3; k++) put(TG.boat, -10 + k * 10, 9 + R() * 3, Math.PI / 2);
      put(pick(G.big.slice(0, 2)), 2, -2, Math.PI / 2); for (let c = 0; c < 4; c++) put(M.cone, -2 + c * 1.4, 3);
      peopleIdle(4, 12);
    } else if (kind === 'desert') {
      for (let k = 0; k < 9; k++) put(TG.cactus, (R() * 2 - 1) * 13, (R() * 2 - 1) * 13, R() * 6.28);
      for (let k = 0; k < 6; k++) put(TG.rock, (R() * 2 - 1) * 13, (R() * 2 - 1) * 13, R() * 6.28);
      put(G.houses[(R() * 3) | 0], -7, -7, faceOut(-7, -7), 0xffe8cc); if (R() < 0.6) put(M.gas, 7, 7, faceOut(7, 7)); else put(M.waterTower, 8, 8);
      peopleIdle(3, 12);
    } else if (kind === 'market') {
      for (const lx of [-9, 0, 9]) for (const lz of [-9, 0, 9]) { if (lx === 0 && lz === 0) { put(M.fountain, 0, 0); continue; } put(TG.stall, lx, lz, R() < 0.5 ? 0 : Math.PI); }
      for (let k = 0; k < 4; k++) put(M.umbrella, (R() * 2 - 1) * 12, (R() * 2 - 1) * 12);
      put(M.vending, -13, 4); put(M.vending, 13, -4); peopleIdle(18, 13);
    } else if (kind === 'industrial') {
      put(G.shops[(R() * 2) | 0], -7.5, -7.5, 0, 0xdee2e6); put(G.apts[0], 7.5, -7.5, 0, 0xe9ecef);
      for (let c = 0; c < 4; c++) put(TG.container, -12 + c * 3.2, 7, 0);
      put(M.waterTower, 9, 9); put(pick(G.big.slice(0, 2)), 3, 2, 0); for (let c = 0; c < 5; c++) put(M.cone, -4 + c * 1.6, 1);
      peopleIdle(3, 12);
    }
    if (TH.snow && (kind === 'suburb' || kind === 'park' || kind === 'plaza' || kind === 'mid')) { for (let k = 0; k < 2; k++) put(TG.snowman, (R() * 2 - 1) * 12, (R() * 2 - 1) * 12, R() * 6.28); if (kind === 'park') put(TG.igloo, 8, 8, -Math.PI * 0.75); }
    if (opts) {
      // v4：加密填充，吃起来更爽
      const D = opts.dense || 1, sc = (k) => Math.round(k * D);
      const scatter = (list, k, r = 13.5, keep = 0) => { for (let q = 0; q < sc(k); q++) { const lx = (R() * 2 - 1) * r, lz = (R() * 2 - 1) * r; if (keep && Math.abs(lx) < keep && Math.abs(lz) < keep) continue; put(pick(list), lx, lz, R() * 6.28); } };
      if (kind === 'park') scatter([M.bush, M.flower, G.trees[0], M.bench, ...G.people], 14, 13.5, 6.5);
      else if (kind === 'farm') { scatter([TG.hay, TG.cow, TG.crop, TG.crop], 10, 13); scatter(G.people, 3); }
      else if (kind === 'beach') { scatter([TG.ball, ...G.people, M.umbrella, TG.palm], 12, 13); }
      else if (kind === 'desert') scatter([TG.cactus, TG.rock, TG.cactus], 12, 13);
      else if (kind === 'plaza' || kind === 'market') scatter([...G.people, M.trash, M.flower, M.umbrella], 10, 13);
      else if (kind === 'parking') scatter(G.people, 6);
      else if (kind === 'harbor' || kind === 'industrial') { scatter([M.cone, M.trash, ...G.people], 8, 13); }
      else if (kind === 'stacks' || kind === 'downtown' || kind === 'mid') scatter([...G.people, M.trash, M.bench], 4, 2);
      else scatter([...G.people, M.bush, M.trash], 4, 1.5);
      for (let q = 0; q < sc(8); q++) { const a = R() * 4 | 0, along = (R() * 2 - 1) * 15, off = 15.8 + R() * 1.2; const lx = a === 0 ? along : a === 1 ? off : a === 2 ? -along : -off, lz = a === 0 ? off : a === 1 ? -along : a === 2 ? -off : along; put(pick(G.people), lx, lz, R() * 6.28); }
    }
    const S = 17.2;
    const street = TH.street !== false;
    for (let side = 0; side < 4; side++) {
      const yaw = side * Math.PI / 2;
      const at = (t, along, off, col) => {
        let lx, lz;
        if (side === 0) { lx = along; lz = off; } else if (side === 1) { lx = off; lz = -along; } else if (side === 2) { lx = -along; lz = -off; } else { lx = -off; lz = along; }
        put(t, lx, lz, yaw, col);
      };
      for (const a of [-12, 0, 12]) at(M.lamp, a, S);
      if (!street) { for (const a of [-6, 6]) if (R() < 0.6) at(TH.edge ? TG[TH.edge] : G.trees[0], a, S - 0.2); continue; }
      for (const a of [-6, 6]) if (R() < 0.85) at(G.trees[0], a, S - 0.2);
      if (R() < 0.6) at(M.hydrant, -9 + R() * 18, S);
      if (R() < 0.6) at(M.trash, -3 + R() * 2, S - 0.4);
      if (R() < 0.35) at(M.bench, 3 + R() * 2, 15.6);
      if (R() < 0.25) at(M.mailbox, -14, 15.8);
      if (R() < 0.2) at(M.busStop, 9, 16.3);
      if (R() < 0.25) for (let c = 0; c < 3; c++) at(M.cone, -10 + c * 1.2, S + 1.6);
      if (R() < 0.3) at(G.moto, 15, S + 1.3);
      if (R() < 0.15) at(M.gift, -4, 15.8);
    }
    if (street) for (const [sx, sz] of [[-1, -1], [1, 1]]) put(M.tlight, sx * 17.4, sz * 17.4, sx > 0 ? 0 : Math.PI);
    const nW = Math.round((5 + ((R() * 4) | 0)) * (TH.walk ?? 1));
    for (let k = 0; k < nW; k++) walkers.push({ t: pick(G.people), col: pick(PALS(G)), cx, cz, p: R() * 132, dir: R() < 0.5 ? 1 : -1, speed: 1.1 + R() * 0.7, off: 16.2 + (R() - 0.5) * 1.2 });
  }
  const named = { van: G.big[0], truck: G.big[1], bus: G.big[2], car: G.cars[0], suv: G.cars[2], taxi: G.cars[3] };
  const laneT = TH.laneTypes ? TH.laneTypes.map(k => TG[k] || named[k]).filter(Boolean) : null;
  for (let k = 0; k <= N; k++) for (let b = 0; b < N; b++) for (const s of [-1, 1]) {
    if (R() < 1 - (opts ? Math.max(0.7, TH.parked ?? 0.5) : 0.5)) continue;
    const rc = roadCenters[k], bc = blockCenters[b];
    const cnt = 1 + ((R() * 3) | 0);
    for (let c = 0; c < cnt; c++) {
      const along = bc - 8 + c * 5.5 + R();
      const t = laneT ? pick(laneT) : R() < 0.1 ? pick(G.big.slice(0, 2)) : pick(G.cars);
      if (R() < 0.5) add(t, along, rc + s * 4.6, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      else add(t, rc + s * 4.6, along, s > 0 ? Math.PI : 0);
    }
  }
  const L = 2 * HALF + 16;
  for (let k = 0; k <= N; k++) for (const axis of ['x', 'z']) for (const dir of [1, -1]) {
    const lane = { axis, dir, fixed: roadCenters[k] + (axis === 'x' ? dir * 1.6 : -dir * 1.6), cars: [], speed: 7 + R() * 3, L };
    if (opts && R() > (TH.traffic ?? 0.6)) continue;
    const n = opts ? 1 + ((R() * 2) | 0) : 2 + ((R() * 3) | 0), off = R() * L;
    for (let c = 0; c < n; c++) {
      const r = R();
      const t = laneT ? pick(laneT) : r < 0.18 ? pick(G.big) : r < 0.26 ? G.moto : pick(G.cars);
      lane.cars.push({ t, col: pick(t.pal), s: ((off + c * L / n) % L) - L / 2, v: lane.speed });
    }
    lanes.push(lane);
  }
  if (opts) {
    // 金币：放在道路上
    for (let k = 0; k < opts.coins; k++) { const rc = pick(roadCenters), a = (R() * 2 - 1) * (HALF - 4); if (R() < 0.5) add(TG.coin, a, rc + (R() - 0.5) * 6, 0); else add(TG.coin, rc + (R() - 0.5) * 6, a, 0); }
    return { objs, lanes, walkers, stacks, blockKinds, seed };
  }
  // 经典/单人/大逃杀：路上也有金币（攒钱买皮肤）
  for (let k = 0; k < 12; k++) { const rc = pick(roadCenters), a = (R() * 2 - 1) * (HALF - 4); if (R() < 0.5) add(TG.coin, a, rc + (R() - 0.5) * 6, 0); else add(TG.coin, rc + (R() - 0.5) * 6, a, 0); }
  for (let a = -HALF - 10; a <= HALF + 10; a += 8) for (const s of [-1, 1]) {
    add(pick(G.trees), a + R() * 2, s * (HALF + 10 + R() * 2));
    add(pick(G.trees), s * (HALF + 10 + R() * 2), a + R() * 2);
  }
  return { objs, lanes, walkers, stacks, blockKinds, seed };
}
const PALS = (G) => G.people[0].pal;

// ---------- 地面：合并的顶点色几何体（清晰，无大贴图） ----------
export function buildGround(blockKinds, TH = {}) {
  const GC = TH.ground || {};
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
  quad(-E, -E, E, E, 0, GC.outer ?? 0x9be39b);
  if (GC.rim !== undefined) { const e2 = HALF + ROAD / 2 + 3; quad(-e2, -e2, e2, e2, 0.005, GC.rim); }
  const RW = ROAD / 2, ext = HALF + RW;
  const ASPH = GC.road ?? 0x6b7385, LINE = GC.line ?? 0xffffff, YEL = GC.yel ?? 0xffd43b, LINES = GC.lines !== false;
  for (const rc of roadCenters) {
    quad(-ext, rc - RW, ext, rc + RW, 0.01, ASPH);
    quad(rc - RW, -ext, rc + RW, ext, 0.01, ASPH);
  }
  // 车道线（只在路段上，不进入路口）
  if (LINES) for (const rc of roadCenters) for (let b = 0; b < N; b++) {
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
  const groundColor = Object.assign({ downtown: 0xf1ece4, mid: 0xefe9e0, suburb: 0xa9e5a0, park: 0x96dd8e, plaza: 0xfbe7c6, parking: 0x7c8496, stacks: 0xffe3ec, farm: 0xb7e08a, beach: 0xffe8a3, harbor: 0xd5d9de, desert: 0xf3d9a4, market: 0xfbe7c6, industrial: 0xc9ced6 }, GC.kinds || {});
  for (const b of blockKinds) {
    const { cx, cz, kind } = b, h = BLOCK / 2;
    quad(cx - h - SW, cz - h - SW, cx + h + SW, cz + h + SW, 0.03, GC.curb ?? 0xd6d0c6);       // 路沿
    quad(cx - h - SW + 0.3, cz - h - SW + 0.3, cx + h + SW - 0.3, cz + h + SW - 0.3, 0.04, GC.side ?? 0xf4efe8); // 人行道
    quad(cx - h, cz - h, cx + h, cz + h, 0.05, groundColor[kind]);
    if (kind === 'farm') {
      for (let r = 0; r < 4; r++) quad(cx + 0.5, cz - 13 + r * 2.6 - 0.9, cx + 13.5, cz - 13 + r * 2.6 + 0.9, 0.06, 0x9c6b3e);
      quad(cx - 14.5, cz + 6, cx + 14.5, cz + 6.25, 0.06, 0xffffff); 
    } else if (kind === 'beach') {
      quad(cx - h, cz + 6.5, cx + h, cz + h, 0.06, 0x5ec8f2); quad(cx - h, cz + 6, cx + h, cz + 6.7, 0.065, 0xffffff);
    } else if (kind === 'harbor') {
      quad(cx - h, cz + 5.5, cx + h, cz + h, 0.06, 0x3ea6e0); quad(cx - h, cz + 5, cx + h, cz + 5.6, 0.065, 0x8d6e63);
    } else if (kind === 'desert') {
      for (let k = 0; k < 5; k++) quad(cx - h, cz - 12 + k * 6, cx + h, cz - 11.6 + k * 6, 0.06, 0xeacb8e);
    } else if (kind === 'park') {
      quad(cx - 1.6, cz - h, cx + 1.6, cz + h, 0.06, 0xffe8b0); quad(cx - h, cz - 1.6, cx + h, cz + 1.6, 0.06, 0xffe8b0);
      const circ = 32; c.set(0xffe8b0);
      for (let k = 0; k < circ; k++) { const a0 = k / circ * Math.PI * 2, a1 = (k + 1) / circ * Math.PI * 2, r = 6.2; for (const [x, z] of [[0, 0], [Math.cos(a1) * r, Math.sin(a1) * r], [Math.cos(a0) * r, Math.sin(a0) * r]]) { pos.push(cx + x, 0.065, cz + z); col.push(c.r, c.g, c.b); uv.push((cx + x) / 6, (cz + z) / 6); } }
    } else if (kind === 'parking') {
      for (const lz of [-10, -3.5, 3.5, 10]) for (let k = 0; k <= 9; k++) { const x = cx - 13.45 + k * 2.9; quad(x - 0.06, cz + lz - 2.4, x + 0.06, cz + lz + 2.4, 0.06, LINE); }
    } else if (kind === 'suburb') {
      for (const lx of [-10, 0, 10]) for (const lz of [-10, 0, 10]) if (lx || lz) quad(cx + lx - 3.6, cz + lz - 3.6, cx + lx + 3.6, cz + lz + 3.6, 0.06, 0xe9e2d6);
    } else if (kind === 'plaza') {
      for (let a = -h + 2; a < h; a += 2) { quad(cx + a - 0.04, cz - h, cx + a + 0.04, cz + h, 0.06, 0xf3d9ae); quad(cx - h, cz + a - 0.04, cx + h, cz + a + 0.04, 0.06, 0xf3d9ae); }
    } else if (kind === 'stacks') {
      for (let a = -h + 3; a < h; a += 3) { quad(cx + a - 0.05, cz - h, cx + a + 0.05, cz + h, 0.06, 0xffc9d9); quad(cx - h, cz + a - 0.05, cx + h, cz + a + 0.05, 0.06, 0xffc9d9); }
    } else {
      for (const lx of [-7.5, 7.5]) for (const lz of [-7.5, 7.5]) quad(cx + lx - 7, cz + lz - 7, cx + lx + 7, cz + lz + 7, 0.06, 0xe6e0d6);
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

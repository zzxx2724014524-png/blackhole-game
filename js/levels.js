// 闯关模式：50 关定义（主题 + 尺寸 + 难度 + 时间）
export const THEMES = {
  town: { name: '小镇', icon: '🏡', kinds: { suburb: 6, park: 1, mid: 1 }, traffic: 0.5, parked: 0.4,
    sky: ['#6ec6ff', '#bde7ff', '#e6f7ff'], fog: 0xd8f1ff, light: [0xffffff, 0xb8d4a0, 1.55, 0xfff1dc, 1.9] },
  park: { name: '公园', icon: '🌳', kinds: { park: 5, plaza: 2 }, traffic: 0.2, parked: 0.2, street: false, walk: 1.4,
    sky: ['#7ad7ff', '#c8f0ff', '#effbff'], fog: 0xe0f6ff, light: [0xffffff, 0xa8dca0, 1.6, 0xfff4d6, 1.9],
    ground: { outer: 0x8fdc8f, road: 0xe9d8b4, lines: false, curb: 0xd8c8a4, side: 0xf3e6c8 } },
  farm: { name: '农场', icon: '🐄', kinds: { farm: 6, suburb: 1 }, traffic: 0.35, parked: 0.15, street: false, edge: 'hay', walk: 0.4, laneTypes: ['tractor'],
    sky: ['#79c7ff', '#cdeeff', '#fff6dd'], fog: 0xf1f3dc, light: [0xfffbe8, 0xb5d48a, 1.6, 0xffe9c4, 2.0],
    ground: { outer: 0xa8dc7a, road: 0xc9a473, lines: false, curb: 0xb38b5c, side: 0xd9bb8c } },
  beach: { name: '海滩', icon: '🏖️', kinds: { beach: 6, plaza: 1 }, traffic: 0.3, parked: 0.3, street: false, edge: 'palm',
    sky: ['#3fb7ff', '#a5e4ff', '#fff3d1'], fog: 0xe6f7ff, light: [0xffffff, 0xf0d9a0, 1.65, 0xfff0d0, 2.0],
    ground: { outer: 0x5ec8f2, rim: 0xffe8a3, road: 0xd2b48c, lines: false, curb: 0xe0c48e, side: 0xffeab0 } },
  market: { name: '集市', icon: '🏮', kinds: { market: 5, plaza: 1, mid: 1 }, traffic: 0.3, parked: 0.4, walk: 1.5,
    sky: ['#ff9a8b', '#ffd3a5', '#fff1dc'], fog: 0xffe6d0, light: [0xfff3e0, 0xd8b89a, 1.6, 0xffd9a8, 1.9] },
  snow: { name: '雪国', icon: '☃️', kinds: { suburb: 4, park: 2, plaza: 1 }, traffic: 0.4, parked: 0.35, snow: true,
    leaf: [0xd8f3e8, 0xe7f5ff, 0xc3e6d1], sky: ['#a5c8ec', '#dbe9f7', '#f6fbff'], fog: 0xeef5fc, light: [0xf4f9ff, 0xcfdceb, 1.7, 0xeaf2ff, 1.6],
    ground: { outer: 0xf4f8fb, road: 0x9aa5b4, curb: 0xdfe7ef, side: 0xf8fbfd, kinds: { suburb: 0xf2f7fb, park: 0xeef6f8, plaza: 0xf6f1ea } } },
  harbor: { name: '海港', icon: '⚓', kinds: { harbor: 5, industrial: 1, mid: 1 }, traffic: 0.5, parked: 0.3, laneTypes: ['van', 'truck', 'car'],
    sky: ['#5aaee8', '#b5dcf5', '#e8f4fb'], fog: 0xdcebf5, light: [0xffffff, 0xa9c4d6, 1.6, 0xfff1dc, 1.8],
    ground: { outer: 0x3ea6e0, rim: 0xc9ced6 } },
  desert: { name: '沙漠', icon: '🌵', kinds: { desert: 6, suburb: 1 }, traffic: 0.35, parked: 0.2, street: false, edge: 'cactus', walk: 0.4,
    sky: ['#ffb36b', '#ffe0a8', '#fff4df'], fog: 0xfbe6c4, light: [0xfff3dc, 0xe8c28a, 1.6, 0xffe1b0, 2.1],
    ground: { outer: 0xf0d098, road: 0xc8a978, lines: false, curb: 0xd9b986, side: 0xeed5a6 } },
  tower: { name: '叠叠楼', icon: '🏢', kinds: { stacks: 5, mid: 1 }, traffic: 0.5, parked: 0.4,
    sky: ['#b197fc', '#e5dbff', '#fff0f6'], fog: 0xf3ecff, light: [0xffffff, 0xd8c8f0, 1.6, 0xfff0f6, 1.9] },
  night: { name: '夜之城', icon: '🌙', kinds: { downtown: 2, mid: 3, stacks: 1, plaza: 1 }, traffic: 0.7, parked: 0.5,
    sky: ['#0b1340', '#2b2f77', '#5b4b9a'], fog: 0x2a2f6a, light: [0x9fb0ff, 0x3a3f7a, 1.25, 0xc8c8ff, 0.9],
    ground: { outer: 0x2f5a46, road: 0x3b4157, curb: 0x8c8fa3, side: 0xb9bccc, kinds: { suburb: 0x3f7a5c, park: 0x3a7556 } } },
  industrial: { name: '工业区', icon: '🏭', kinds: { industrial: 5, parking: 2 }, traffic: 0.6, parked: 0.5, laneTypes: ['van', 'truck'],
    sky: ['#8fb3c9', '#cddde6', '#eef3f6'], fog: 0xe1e8ed, light: [0xffffff, 0xb0b8c0, 1.6, 0xfff1dc, 1.8] },
  downtown: { name: '市中心', icon: '🌆', kinds: { downtown: 3, mid: 3, plaza: 1, stacks: 1 }, traffic: 0.8, parked: 0.5,
    sky: ['#6ec6ff', '#bde7ff', '#e6f7ff'], fog: 0xd8f1ff, light: [0xffffff, 0xb8d4a0, 1.55, 0xfff1dc, 1.9] },
};
const ORDER = ['town', 'park', 'farm', 'beach', 'market', 'snow', 'harbor', 'desert', 'tower', 'night', 'industrial', 'downtown'];
const SUFFIX = ['', '·清晨', '·午后', '·黄昏', '·假日'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 由模拟标定的过关时间（秒，自动驾驶清图用时 × 宽裕系数；见 README）
export const LEVEL_TIME_V3 = [130, 115, 100, 90, 200, 165, 170, 230, 155, 180, 190, 180, 155, 150, 330, 235, 280, 265, 230, 270, 230, 290, 195, 265, 300, 200, 220, 205, 220, 180, 360, 270, 235, 275, 280, 290, 200, 325, 260, 190, 285, 200, 305, 355, 260, 235, 220, 235, 195, 255];

export const LEVEL_TIME = [120, 120, 120, 130, 155, 170, 185, 150, 165, 185, 155, 150, 160, 175, 125, 210, 125, 155, 190, 150, 175, 150, 180, 145, 155, 180, 195, 185, 150, 145, 175, 190, 205, 170, 230, 180, 205, 160, 200, 225, 170, 240, 160, 180, 195, 190, 195, 205, 240, 195];
export const LEVEL_COUNT = 50;
export function levelDef(i) {
  const R = rng(i * 7919 + 13);
  const themeKey = i <= 12 ? ORDER[i - 1] : ORDER[(i * 5 + ((i / 12) | 0)) % ORDER.length];
  const theme = THEMES[themeKey];
  const n = i <= 3 ? 2 : i <= 15 ? 3 : i <= 30 ? 4 : i <= 45 ? 5 : 6;
  const diff = Math.min(1, (i - 1) / 45);
  // 街区类型：按主题权重抽取；前期去掉高楼类
  const entries = Object.entries(theme.kinds);
  const kinds = [];
  for (let k = 0; k < n * n; k++) {
    let tot = 0; for (const [kk, w] of entries) tot += (kk === 'downtown' || kk === 'stacks') && i < 8 ? w * 0.3 : w;
    let r = R() * tot, pick = entries[0][0];
    for (const [kk, w0] of entries) { const w = (kk === 'downtown' || kk === 'stacks') && i < 8 ? w0 * 0.3 : w0; if ((r -= w) <= 0) { pick = kk; break; } }
    kinds.push(pick);
  }
  // 保证主题主街区至少出现一次
  const main = entries.slice().sort((a, b) => b[1] - a[1])[0][0];
  if (!kinds.includes(main)) kinds[(R() * kinds.length) | 0] = main;
  const target = Math.round(Math.min(90, 60 + i * 0.6));
  const coins = 4 + Math.min(8, Math.floor(i / 5));
  const time = LEVEL_TIME[i - 1] || 180;
  const name = `${theme.name}${i > 12 ? SUFFIX[(i / 12) | 0] || '' : ''}`;
  return { i, themeKey, theme, n, diff, kinds, dense: 1 + Math.min(0.6, i / 60), seed: i * 104729 + 7, target, coins, time, name };
}

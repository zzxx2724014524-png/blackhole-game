// 黑洞皮肤：20 款原创主题（着色器边缘 + 轻量粒子 + 小装饰），金币购买
import * as THREE from 'three';

export const SKINS = [
  { id: 'default', name: '经典', price: 0, kind: 0, c: [0x7b5cff, 0xffffff, 0x3b3170], desc: '使用所选颜色' },
  { id: 'rainbow', name: '彩虹', price: 80, kind: 1, c: [0xff6b6b, 0x4dabf7, 0xffd43b], p: { col: 0xffffff, n: 10, rise: 0.4 }, desc: '七彩流转' },
  { id: 'frost', name: '冰霜', price: 150, kind: 2, c: [0x9be7ff, 0xffffff, 0x3a86ff], p: { col: 0xe7f8ff, n: 14, rise: 0.25 }, desc: '寒气冰晶' },
  { id: 'lava', name: '熔岩', price: 200, kind: 3, c: [0xff3d00, 0xffb300, 0x5c0a00], p: { col: 0xffa040, n: 16, rise: 0.9 }, desc: '滚烫岩浆，火星四溅' },
  { id: 'sakura', name: '樱花', price: 250, kind: 4, c: [0xffc0d9, 0xff7eb6, 0xfff0f6], p: { col: 0xffb3d1, n: 14, rise: -0.35 }, desc: '花瓣飘落' },
  { id: 'melon', name: '大西瓜', price: 300, kind: 5, c: [0x2f9e44, 0x8ce99a, 0xff4d6d], desc: '夏天的味道' },
  { id: 'donut', name: '甜甜圈', price: 350, kind: 6, c: [0xff8cc6, 0xd9a066, 0xffffff], desc: '撒满糖针' },
  { id: 'cookie', name: '曲奇', price: 400, kind: 7, c: [0xd9a066, 0x5c3a21, 0xf3d19c], desc: '巧克力豆曲奇' },
  { id: 'pumpkin', name: '南瓜灯', price: 450, kind: 8, c: [0xff922b, 0xc2410c, 0xffe066], extra: 'stem', p: { col: 0xffd43b, n: 8, rise: 0.5 }, desc: '万圣夜发光' },
  { id: 'piggy', name: '小猪', price: 500, kind: 9, c: [0xffb3c6, 0xff8fab, 0xffe3ec], extra: 'ears', desc: '粉嘟嘟小猪' },
  { id: 'wave', name: '海浪', price: 600, kind: 10, c: [0x1c7ed6, 0x74c0fc, 0xffffff], p: { col: 0xd0ebff, n: 12, rise: 0.6 }, desc: '浪花翻涌' },
  { id: 'thunder', name: '雷电', price: 700, kind: 11, c: [0x3b0a6b, 0xb197fc, 0xfff3bf], p: { col: 0xe5dbff, n: 10, rise: 1.2 }, desc: '电光闪烁' },
  { id: 'chess', name: '象棋盘', price: 800, kind: 12, c: [0x212529, 0xf8f9fa, 0xffd43b], desc: '黑白格旋转' },
  { id: 'ghost', name: '幽灵', price: 900, kind: 13, c: [0xe7f5ff, 0xa5d8ff, 0x748ffc], p: { col: 0xffffff, n: 8, rise: 0.3 }, desc: '飘忽不定' },
  { id: 'crystal', name: '水晶', price: 1100, kind: 14, c: [0x99e9f2, 0xd0bfff, 0xffc9de], p: { col: 0xffffff, n: 12, rise: 0.2 }, desc: '折射七彩光' },
  { id: 'cyber', name: '赛博朋克', price: 1300, kind: 15, c: [0xff00c8, 0x00f0ff, 0x120024], p: { col: 0x00f0ff, n: 12, rise: 0.8 }, desc: '霓虹扫描线' },
  { id: 'galaxy', name: '星空银河', price: 1600, kind: 16, c: [0x0b0f3a, 0x9775fa, 0xffffff], p: { col: 0xffffff, n: 18, rise: 0.15 }, desc: '星河旋转' },
  { id: 'gold', name: '黄金', price: 2000, kind: 17, c: [0xffd43b, 0xfab005, 0xfff9db], p: { col: 0xfff3bf, n: 14, rise: 0.4 }, desc: '金光闪闪' },
  { id: 'angel', name: '光环天使', price: 2600, kind: 18, c: [0xffffff, 0xffe066, 0xfff9db], extra: 'halo', p: { col: 0xfff9db, n: 14, rise: 0.5 }, desc: '头顶光环' },
  { id: 'void', name: '虚空之王', price: 3200, kind: 19, c: [0x0a0a0a, 0xff1744, 0xff8a65], p: { col: 0xff5252, n: 18, rise: 1.0 }, desc: '终极皮肤：猩红日冕' },
];
export const skinById = (id) => SKINS.find(s => s.id === id) || SKINS[0];
export const swatch = (s) => { const h = (c) => '#' + c.toString(16).padStart(6, '0'); return `conic-gradient(from 0deg, ${h(s.c[0])}, ${h(s.c[1])}, ${h(s.c[2])}, ${h(s.c[0])})`; };

export const rimGeo = new THREE.RingGeometry(1, 1.13, 72, 1).rotateX(-Math.PI / 2);
const FRAG = `
uniform float t; uniform int kind; uniform vec3 c1, c2, c3; uniform float op;
varying vec2 p;
float h1(float n){ return fract(sin(n)*43758.5453); }
float h2(vec2 v){ return fract(sin(dot(v, vec2(12.9898,78.233)))*43758.5453); }
float nz(vec2 v){ vec2 i=floor(v), f=fract(v); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
vec3 hsv(float h){ return clamp(abs(mod(h*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); }
void main(){
  float len = length(p); float rr = clamp((len - 1.0) / 0.13, 0., 1.);
  float a = atan(p.y, p.x) / 6.2831853 + 0.5;
  vec3 col = c1; float al = 0.97;
  float edge = smoothstep(0.0, 0.12, rr) * smoothstep(1.0, 0.82, rr);
  if (kind == 0) { col = c1 * (0.85 + 0.35 * (1. - rr)); }
  else if (kind == 1) { col = hsv(fract(a * 2. + t * 0.25 + rr * 0.3)) * 0.9 + 0.1; }
  else if (kind == 2) { float n = nz(vec2(a * 40., rr * 3. + t * 0.3)); col = mix(c3, c1, n) + c2 * pow(h2(floor(vec2(a * 90., rr * 4.)) + floor(t * 3.)), 30.) * 1.5; col = mix(col, c2, smoothstep(0.6, 1.0, rr) * 0.6); }
  else if (kind == 3) { float n = nz(vec2(a * 30. + sin(rr * 3. + t) , rr * 2. - t * 0.8)); float f = smoothstep(0.3, 0.8, n); col = mix(c3, mix(c1, c2, f), 0.4 + 0.6 * (1. - rr)) * (1.2 + 0.3 * sin(t * 5. + a * 40.)); }
  else if (kind == 4) { vec2 g = vec2(a * 36., rr * 3. - t * 0.2); vec2 f = fract(g) - 0.5; float petal = smoothstep(0.32, 0.18, length(f * vec2(1., 1.7))) * step(0.45, h2(floor(g))); col = mix(c1, c3, rr * 0.5); col = mix(col, c2, petal); }
  else if (kind == 5) { if (rr > 0.55) { col = mix(c1, c2, step(0.5, fract(a * 28.))); } else if (rr > 0.42) { col = vec3(0.95, 1.0, 0.9); } else { col = c3; vec2 g = vec2(a * 22., rr * 3.); float s = smoothstep(0.22, 0.1, length((fract(g) - 0.5) * vec2(1., 2.5))) * step(0.5, h2(floor(g))); col = mix(col, vec3(0.1), s); } }
  else if (kind == 6) { col = rr > 0.8 ? c2 : c1; vec2 g = vec2(a * 60., rr * 4.); vec2 f = fract(g) - 0.5; float sp = step(abs(f.x * 0.4 + f.y), 0.12) * step(abs(f.x), 0.35) * step(abs(f.y), 0.35) * step(0.55, h2(floor(g))); vec3 sc = hsv(h2(floor(g) + 3.)); if (rr <= 0.8) col = mix(col, sc, sp); }
  else if (kind == 7) { float n = nz(vec2(a * 50., rr * 4.)); col = mix(c1, c3, n * 0.5); vec2 g = vec2(a * 30., rr * 2.5); float chip = smoothstep(0.25, 0.15, length(fract(g) - 0.5)) * step(0.55, h2(floor(g))); col = mix(col, c2, chip); }
  else if (kind == 8) { float r = abs(cos(a * 3.14159 * 20.)); col = mix(c2, c1, pow(r, 0.4)); col += c3 * smoothstep(0.5, 0.0, rr) * (0.5 + 0.3 * sin(t * 4.)); }
  else if (kind == 9) { col = c1; vec2 g = vec2(a * 18., rr * 2.); float sp = smoothstep(0.3, 0.2, length(fract(g) - 0.5)) * step(0.7, h2(floor(g))); col = mix(col, c2, sp); col = mix(col, c3, smoothstep(0.7, 1.0, rr) * 0.5); }
  else if (kind == 10) { float w = 0.5 + 0.22 * sin(a * 6.2831853 * 9. + t * 3.) + 0.1 * sin(a * 6.2831853 * 23. - t * 5.); col = mix(c1, c2, rr); col = mix(col, c3, smoothstep(w - 0.06, w, rr) * smoothstep(w + 0.12, w + 0.04, rr)); }
  else if (kind == 11) { col = mix(c1, c1 * 2., nz(vec2(a * 20., t))); float k = floor(t * 6.); float ba = h1(k) ; float zig = abs(fract((rr * 3. + h1(k + 1.) * 9.)) - 0.5) * 0.02; float bolt = smoothstep(0.012, 0.0, abs(a - ba - zig)) * step(0.4, h1(k + 7.)); col = mix(col, c3 * 1.6, bolt); col += c2 * 0.4 * smoothstep(0.7, 1., rr); }
  else if (kind == 12) { float ch = mod(floor(a * 32. + t * 0.6) + floor(rr * 2.), 2.); col = mix(c1, c2, ch); col = mix(col, c3, smoothstep(0.86, 1.0, rr)); }
  else if (kind == 13) { col = mix(c1, c2, rr); al = 0.55 + 0.35 * sin(a * 6.2831853 * 5. + t * 2. + rr * 4.); }
  else if (kind == 14) { float sec = floor(a * 24.); vec3 cc = mix(mix(c1, c2, h1(sec)), c3, h1(sec + 5.)); float sh = smoothstep(0.03, 0.0, abs(fract(a - t * 0.15) - 0.5) - 0.0); col = cc * (0.8 + 0.4 * h1(sec + 2.)) + sh * 0.8; }
  else if (kind == 15) { float sl = step(0.5, fract(rr * 6. - t * 2.)); col = mix(c1, c2, step(0.5, fract(a * 8. + t * 0.3))); col *= 0.55 + 0.45 * sl; col = mix(col, c3, 0.25); col += c2 * smoothstep(0.85, 1., rr); }
  else if (kind == 16) { float sw = 0.5 + 0.5 * sin(a * 6.2831853 * 3. + rr * 6. - t * 1.5); col = mix(c1, c2, sw * 0.6); vec2 g = vec2(a * 80., rr * 5.); float st = pow(h2(floor(g)), 40.) * (0.6 + 0.4 * sin(t * 4. + h2(floor(g)) * 20.)); col += c3 * st * 2.5; }
  else if (kind == 17) { float sw = pow(max(0., sin(a * 6.2831853 * 2. - t * 2.)), 12.); col = mix(c2, c1, 0.5 + 0.5 * sin(rr * 6.)) + c3 * sw; }
  else if (kind == 18) { col = mix(c1, c2, rr) + c3 * 0.3 * (0.5 + 0.5 * sin(t * 3. + a * 12.)); }
  else if (kind == 19) { float n = nz(vec2(a * 24., rr * 2. - t * 1.2)); float fl = smoothstep(0.35, 0.9, n + (1. - rr) * 0.3) ; col = mix(c1, mix(c2, c3, n), fl) * (1. + 0.4 * sin(t * 3.)); }
  al *= mix(0.9, 1.0, edge) * op;
  gl_FragColor = vec4(col, al);
}`;
const VERT = `varying vec2 p; void main(){ p = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const matCache = {};
export function skinMaterial(skin, color) {
  const key = skin.id + (skin.kind === 0 ? '_' + color : '');
  if (matCache[key]) return matCache[key];
  const c = skin.c.map(x => new THREE.Color(x)); if (skin.kind === 0) c[0] = new THREE.Color(color);
  return matCache[key] = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { t: { value: 0 }, kind: { value: skin.kind }, c1: { value: c[0] }, c2: { value: c[1] }, c3: { value: c[2] }, op: { value: 1 } }, vertexShader: VERT, fragmentShader: FRAG });
}
let dotTex = null;
function getDot() { if (dotTex) return dotTex; const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return dotTex = new THREE.CanvasTexture(cv); }
// 皮肤附件：粒子 + 装饰（全部放在洞的 group 里）
export class SkinFx {
  constructor(skin, group) {
    this.skin = skin; this.group = group; this.objs = [];
    if (skin.p) {
      const n = skin.p.n; this.n = n; this.pos = new Float32Array(n * 3); this.ph = Array.from({ length: n }, (_, i) => [Math.random() * 6.28, Math.random(), 0.6 + Math.random() * 0.8]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: getDot(), color: skin.p.col, size: 0.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      this.pts.frustumCulled = false; this.pts.renderOrder = 3; group.add(this.pts); this.objs.push(this.pts);
    }
    if (skin.extra === 'halo') { const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 6, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false })); this.halo = m; group.add(m); this.objs.push(m); }
    if (skin.extra === 'ears') { this.ears = []; for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 4), new THREE.MeshLambertMaterial({ color: 0xff8fab })); m.rotation.z = -s * 0.35; this.ears.push([m, s]); group.add(m); this.objs.push(m); } }
    if (skin.extra === 'stem') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.35, 6), new THREE.MeshLambertMaterial({ color: 0x2f9e44 })); m.rotation.z = 0.3; this.stem = m; group.add(m); this.objs.push(m); }
  }
  update(t, r) {
    if (this.pts) {
      const rise = this.skin.p.rise;
      for (let i = 0; i < this.n; i++) { const [a0, f0, sp] = this.ph[i]; const a = a0 + t * 0.6 * sp; let f = (f0 + t * Math.abs(rise) * 0.5 * sp) % 1; if (rise < 0) f = 1 - f; const rad = r * (1.04 + 0.22 * Math.sin(a * 3 + i)); this.pos[i * 3] = Math.cos(a) * rad; this.pos[i * 3 + 1] = 0.15 + f * r * 0.9; this.pos[i * 3 + 2] = Math.sin(a) * rad; }
      this.pts.geometry.attributes.position.needsUpdate = true; this.pts.material.size = 0.18 + r * 0.16; this.pts.material.opacity = 0.9;
    }
    if (this.halo) { this.halo.position.set(0, r * 0.9 + 0.4 + Math.sin(t * 2) * 0.1 * r, 0); this.halo.scale.setScalar(r * 0.9); }
    if (this.ears) for (const [m, s] of this.ears) { m.position.set(s * r * 0.62, r * 0.18, -r * 1.0); m.scale.setScalar(r); }
    if (this.stem) { this.stem.position.set(0, r * 0.15, -r * 1.12); this.stem.scale.setScalar(r); }
  }
  dispose() { for (const o of this.objs) { this.group.remove(o); o.geometry.dispose(); o.material.dispose(); } }
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Subject = 'wedding' | 'landscape' | 'school' | 'sampler' | 'drawing' | 'ancestor' | 'empty';

export default defineThing({
  questions: {
    outer: choice('What does the outermost frame show?', {
      wedding: 'A wedding portrait, black and white, the couple very young.',
      landscape: 'A faded landscape print of hills and a lake.',
      school: 'A school class photograph, rows of small faces.',
      sampler: 'A cross-stitched sampler: HOME SWEET HOME.',
      drawing: "A child's crayon drawing somebody thought worth framing.",
      empty: 'Nothing: an empty frame, the picture already taken out.',
    }),
    state: choice('How have they been left?', {
      careful: 'Carefully stacked, largest at the back, faces out.',
      claimed: 'Sorted, with a sticky note on each saying who it goes to.',
      turned: 'Turned to face the wall, only brown-paper backs and hanging wire showing.',
      fallen: 'The front one has slid flat on the floor and its glass has cracked.',
    }),
    mirror: choice('What mirror is among them?', {
      none: 'No mirror.',
      oval: 'An oval mirror in a gilt frame.',
      overmantel: 'A wide overmantel mirror with a dark wood frame.',
      sunburst: 'A round 1960s sunburst mirror.',
    }),
    wrapped: choice('Is one of them wrapped?', {
      blanket: 'Yes, in an old tartan blanket tied with string.',
      bubble: 'Yes, in bubble wrap and tape.',
      paper: 'Yes, in brown paper and string like a parcel.',
      none: 'No, all bare.',
    }),
    frames: choice('What are the frames like?', {
      gilt: 'Heavy gilt, chipped at the corners.',
      wood: 'Dark polished wood.',
      black: 'Thin black gallery frames.',
      mixed: 'A mismatched lot from three decades.',
    }),
    against: choice('What are they leaning against?', {
      wall: 'A stretch of wall, with the pale shape and nail where the biggest hung.',
      box: 'A packing box.',
      radiator: 'A cast-iron radiator.',
    }),
    amount: score('How many are there?', ['Three or four', 'Half a dozen', 'A whole wall of them']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const canvas = (w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };

    const paintSubject = (subject: Subject, cracked: boolean) => (c: Ctx, w: number, h: number) => {
      const person = (x: number, y: number, r: number, body: string, skin = '#d9c2a4') => { c.fillStyle = body; c.beginPath(); c.ellipse(x, y + r * 3.4, r * 1.5, r * 2.6, 0, 0, 7); c.fill(); c.fillStyle = skin; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
      if (subject === 'wedding') {
        c.fillStyle = '#b9b3a6'; c.fillRect(0, 0, w, h);
        const g = c.createRadialGradient(w / 2, h * 0.45, h * 0.1, w / 2, h * 0.45, h * 0.75); g.addColorStop(0, '#dedad0'); g.addColorStop(1, '#6f6a62'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        person(w * 0.38, h * 0.3, h * 0.085, '#26262a', '#cfc8ba'); 
        c.fillStyle = '#f6f4ee'; c.beginPath(); c.moveTo(w * 0.62, h * 0.38); c.lineTo(w * 0.86, h); c.lineTo(w * 0.42, h); c.fill();
        c.fillStyle = '#cfc8ba'; c.beginPath(); c.arc(w * 0.62, h * 0.33, h * 0.08, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(w * 0.66, h * 0.36, h * 0.11, h * 0.2, 0.3, 0, 7); c.fill();
        c.fillStyle = '#8a8f7a'; c.beginPath(); c.arc(w * 0.55, h * 0.66, h * 0.07, 0, 7); c.fill(); c.fillStyle = '#e9e4da'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w * 0.55 + Math.cos(i) * h * 0.04, h * 0.66 + Math.sin(i) * h * 0.04, h * 0.022, 0, 7); c.fill(); }
      } else if (subject === 'landscape') {
        const sky = c.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#9fbccb'); sky.addColorStop(1, '#e6dcc0'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f1e3b0'; c.beginPath(); c.arc(w * 0.72, h * 0.25, h * 0.07, 0, 7); c.fill();
        for (const [y, col] of [[0.5, '#8fa39a'], [0.58, '#6f8a6a'], [0.68, '#4f6f4a']] as const) { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += w / 8) c.lineTo(x, h * (y - 0.12 * Math.abs(Math.sin(x * 0.02 + y * 20)))); c.lineTo(w, h); c.fill(); }
        c.fillStyle = '#a9c4cc'; c.beginPath(); c.ellipse(w * 0.45, h * 0.84, w * 0.42, h * 0.1, 0, 0, 7); c.fill();
        c.fillStyle = '#3a4f34'; for (const x of [0.12, 0.18, 0.86]) { c.beginPath(); c.moveTo(w * x, h * 0.55); c.lineTo(w * (x + 0.05), h * 0.9); c.lineTo(w * (x - 0.05), h * 0.9); c.fill(); }
      } else if (subject === 'school') {
        c.fillStyle = '#6f8fae'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.arc(random() * w, random() * h, 20 + random() * 30, 0, 7); c.fill(); }
        const hair = ['#3a2a1c', '#1c1c1c', '#8a5a2c', '#c9a25a', '#5a3a22'];
        for (let row = 0; row < 3; row++) { const n = 7 - row; for (let i = 0; i < n; i++) { const x = w * (0.5 + (i - (n - 1) / 2) * 0.125), y = h * (0.3 + row * 0.2), r = h * 0.05; person(x, y, r, row === 1 ? '#7a2630' : '#2f3f5a', pick(['#e2c4a4', '#c99a74', '#8a5a3c', '#e9d2b8'])); c.fillStyle = hair[(i + row * 2) % 5]; c.beginPath(); c.arc(x, y - r * 0.35, r * 0.95, Math.PI, 0); c.fill(); } }
        c.fillStyle = '#f1eee4'; c.fillRect(0, h * 0.9, w, h * 0.1); c.fillStyle = '#33333a'; c.fillRect(w * 0.3, h * 0.94, w * 0.4, h * 0.015);
      } else if (subject === 'sampler') {
        c.fillStyle = '#e9e0c6'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 44; i++) { c.fillStyle = i % 2 ? '#b23a3a' : '#3f6a4a'; const t = i / 44; c.fillRect(w * (0.06 + t * 0.88), h * 0.07, w * 0.012, h * 0.025); c.fillRect(w * (0.06 + t * 0.88), h * 0.9, w * 0.012, h * 0.025); }
        c.fillStyle = '#2f4a7a'; c.textAlign = 'center'; c.font = `bold ${h * 0.13}px monospace`; c.fillText('HOME', w / 2, h * 0.3); c.fillText('SWEET', w / 2, h * 0.47); c.fillText('HOME', w / 2, h * 0.64);
        c.fillStyle = '#b23a3a'; c.fillRect(w * 0.42, h * 0.74, w * 0.16, h * 0.11); c.beginPath(); c.moveTo(w * 0.39, h * 0.74); c.lineTo(w * 0.5, h * 0.67); c.lineTo(w * 0.61, h * 0.74); c.fill();
      } else if (subject === 'drawing') {
        c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, w, h); c.lineWidth = Math.max(3, h * 0.022); c.lineCap = 'round';
        c.strokeStyle = '#e0b22a'; c.beginPath(); c.arc(w * 0.8, h * 0.2, h * 0.09, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(w * 0.8 + Math.cos(i * 0.785) * h * 0.12, h * 0.2 + Math.sin(i * 0.785) * h * 0.12); c.lineTo(w * 0.8 + Math.cos(i * 0.785) * h * 0.17, h * 0.2 + Math.sin(i * 0.785) * h * 0.17); c.stroke(); }
        c.strokeStyle = '#c9302b'; c.strokeRect(w * 0.1, h * 0.45, w * 0.34, h * 0.36); c.beginPath(); c.moveTo(w * 0.06, h * 0.45); c.lineTo(w * 0.27, h * 0.22); c.lineTo(w * 0.48, h * 0.45); c.stroke();
        c.strokeStyle = '#3aa655'; c.beginPath(); c.moveTo(0, h * 0.84); c.lineTo(w, h * 0.82); c.stroke();
        ['#2f6fb0', '#7a4fc9', '#e26aa8', '#2f6fb0'].forEach((col, i) => { const x = w * (0.56 + i * 0.1), top = h * (0.5 + (i > 1 ? 0.1 : 0)); c.strokeStyle = col; c.beginPath(); c.arc(x, top, h * 0.04, 0, 7); c.moveTo(x, top + h * 0.04); c.lineTo(x, h * 0.72); c.moveTo(x - w * 0.035, top + h * 0.1); c.lineTo(x + w * 0.035, top + h * 0.1); c.moveTo(x, h * 0.72); c.lineTo(x - w * 0.03, h * 0.81); c.moveTo(x, h * 0.72); c.lineTo(x + w * 0.03, h * 0.81); c.stroke(); });
      } else if (subject === 'ancestor') {
        c.fillStyle = '#e6dcc4'; c.fillRect(0, 0, w, h); c.save(); c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.38, h * 0.42, 0, 0, 7); c.clip();
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b39a72'); g.addColorStop(1, '#5a4630'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        person(w / 2, h * 0.36, h * 0.11, '#2a2018', '#d9c4a0'); c.fillStyle = '#3a2a1c'; c.beginPath(); c.arc(w / 2, h * 0.32, h * 0.11, Math.PI, 0); c.fill(); c.restore();
      }
      if (subject !== 'empty') {
        c.fillStyle = `rgba(190,170,120,${0.08 + mood.wear * 0.22})`; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(w * 0.05, 0); c.lineTo(w * 0.3, 0); c.lineTo(w * 0.05, h * 0.7); c.lineTo(0, h * 0.7); c.lineTo(0, h * 0.1); c.fill();
      }
      if (cracked) { c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; const cx = w * (0.3 + random() * 0.4), cy = h * (0.3 + random() * 0.4); for (let i = 0; i < 9; i++) { const ang = i * 0.7 + random() * 0.4; c.beginPath(); c.moveTo(cx, cy); let x = cx, y = cy; for (let k = 0; k < 4; k++) { x += Math.cos(ang + (random() - 0.5) * 0.6) * w * 0.14; y += Math.sin(ang + (random() - 0.5) * 0.6) * w * 0.14; c.lineTo(x, y); } c.stroke(); } }
    };
    const backTex = canvas(256, 256, (c, w, h) => {
      c.fillStyle = '#a98a5c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 20; i++) { c.fillStyle = 'rgba(70,50,25,0.1)'; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 50, 10 + random() * 30, random() * 3, 0, 7); c.fill(); }
      c.fillStyle = '#7a5a34'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h);
      c.strokeStyle = '#d9d2c0'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 70); c.quadraticCurveTo(w / 2, 40, w - 22, 70); c.stroke();
      c.fillStyle = '#c9a23f'; c.beginPath(); c.arc(22, 70, 7, 0, 7); c.arc(w - 22, 70, 7, 0, 7); c.fill();
      c.fillStyle = '#efe8d2'; c.fillRect(w * 0.55, h * 0.62, w * 0.3, h * 0.16); c.fillStyle = '#5a5248'; c.fillRect(w * 0.58, h * 0.67, w * 0.2, 3); c.fillRect(w * 0.58, h * 0.72, w * 0.14, 3);
    });
    const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.95 });
    const mirrorTex = canvas(128, 160, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e8eef0'); g.addColorStop(0.45, '#b9c7cc'); g.addColorStop(0.55, '#dfe7ea'); g.addColorStop(1, '#93a3aa'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(w * 0.15, 0); c.lineTo(w * 0.4, 0); c.lineTo(w * 0.1, h); c.lineTo(0, h); c.lineTo(0, h * 0.5); c.fill();
      for (let i = 0; i < mood.wear * 40; i++) { c.fillStyle = 'rgba(60,50,40,0.35)'; c.beginPath(); c.arc(random() < 0.5 ? random() * 12 : w - random() * 12, random() * h, 1 + random() * 3, 0, 7); c.fill(); }
    });
    const mirrorMat = new THREE.MeshStandardMaterial({ map: mirrorTex, roughness: 0.12, metalness: 0.25 });
    const styles = {
      gilt: { mat: s.material('#c39a3c', { metalness: 0.7, roughness: 0.38 }), bar: 0.058, t: 0.045 },
      wood: { mat: s.material('#4a2c18', { roughness: 0.4 }), bar: 0.05, t: 0.035 },
      black: { mat: s.material('#1b1b1d', { roughness: 0.5 }), bar: 0.022, t: 0.03 },
      white: { mat: s.material('#e9e6dc', { roughness: 0.6 }), bar: 0.04, t: 0.03 },
      teak: { mat: s.material('#a86a34', { roughness: 0.5 }), bar: 0.028, t: 0.03 },
    };
    type StyleKey = keyof typeof styles;
    const styleFor = (): StyleKey => a.frames === 'mixed' ? pick(['gilt', 'wood', 'black', 'white', 'teak'] as const) : a.frames;

    const part = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    type Item = { group: THREE.Group; w: number; h: number; t: number };
    const frame = (w: number, h: number, key: StyleKey, subject: Subject | 'mirror', cracked = false): Item => {
      const { mat, bar, t } = styles[key];
      const g = new THREE.Group();
      part(g, new THREE.BoxGeometry(w, bar, t), mat, 0, bar / 2, 0); part(g, new THREE.BoxGeometry(w, bar, t), mat, 0, h - bar / 2, 0);
      for (const side of [-1, 1]) part(g, new THREE.BoxGeometry(bar, h - bar * 2, t), mat, side * (w / 2 - bar / 2), h / 2, 0);
      if (key === 'gilt') for (const sx of [-1, 1]) for (const sy of [0, 1]) part(g, new THREE.SphereGeometry(bar * 0.42, 10, 8), mat, sx * (w / 2 - bar / 2), sy ? h - bar / 2 : bar / 2, 0.01).scale.z = 0.6;
      if (subject !== 'empty') {
        const iw = w - bar * 2, ih = h - bar * 2;
        const face = subject === 'mirror' ? mirrorMat : new THREE.MeshStandardMaterial({ map: canvas(Math.round(220 * Math.min(1.6, iw / ih)), 220, paintSubject(subject, cracked)), roughness: 0.3 });
        part(g, new THREE.PlaneGeometry(iw, ih), face, 0, h / 2, t * 0.2).castShadow = false;
        part(g, new THREE.BoxGeometry(iw + 0.01, ih + 0.01, 0.006), backMat, 0, h / 2, -t / 2 + 0.004);
      }
      return { group: g, w, h, t };
    };
    const round = (w: number, h: number, burst: boolean): Item => {
      const g = new THREE.Group(), mat = styles.gilt.mat;
      const ring = part(g, new THREE.TorusGeometry(0.5, 0.045, 10, 40), mat, 0, h / 2, 0); ring.scale.set(w, h, 0.5);
      const glass = part(g, new THREE.CircleGeometry(0.5, 40), mirrorMat, 0, h / 2, 0.006); glass.scale.set(w * 0.95, h * 0.95, 1); glass.castShadow = false;
      const back = part(g, new THREE.CircleGeometry(0.5, 40), backMat, 0, h / 2, -0.012); back.scale.set(w, h, 1); back.rotation.y = Math.PI;
      if (burst) { const rays = 28; for (let i = 0; i < rays; i++) { const ang = i / rays * 6.283, len = i % 2 ? 0.16 : 0.26, r = w / 2 + len / 2; const ray = part(g, new THREE.BoxGeometry(len, 0.014, 0.01), mat, Math.cos(ang) * r, h / 2 + len + Math.sin(ang) * r - len, -0.004); ray.rotation.z = ang; } g.children.forEach((m) => { m.position.y += 0.24; }); return { group: g, w: w + 0.5, h: h + 0.48, t: 0.03 }; }
      return { group: g, w, h, t: 0.04 };
    };
    const wrap = (w: number, h: number): Item => {
      const g = new THREE.Group(), t = 0.085;
      const tex = canvas(256, 256, (c, cw, ch) => {
        if (a.wrapped === 'blanket') { c.fillStyle = mood.warmth > 0.5 ? '#8a2f2a' : '#2f4f6a'; c.fillRect(0, 0, cw, ch); for (const [at, wd, col] of [[30, 30, 'rgba(20,40,30,0.6)'], [96, 8, 'rgba(240,225,150,0.8)'], [150, 40, 'rgba(15,15,30,0.55)'], [220, 8, 'rgba(255,255,255,0.7)']] as const) { c.fillStyle = col; c.fillRect(at, 0, wd, ch); c.fillRect(0, at, cw, wd); } }
        else if (a.wrapped === 'bubble') { c.fillStyle = '#cfdde2'; c.fillRect(0, 0, cw, ch); for (let y = 6; y < ch; y += 12) for (let x = (y / 12 % 2) * 6; x < cw; x += 12) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(x, y, 4.2, 0, 7); c.fill(); c.strokeStyle = 'rgba(110,140,150,0.5)'; c.lineWidth = 1; c.stroke(); } c.fillStyle = 'rgba(138,90,44,0.9)'; c.fillRect(0, 100, cw, 26); c.fillRect(110, 0, 26, ch); }
        else { c.fillStyle = '#b08a56'; c.fillRect(0, 0, cw, ch); c.strokeStyle = 'rgba(70,45,20,0.3)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(random() * cw, 0); c.lineTo(random() * cw, ch); c.stroke(); } c.strokeStyle = '#e6dcc0'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, ch * 0.4); c.lineTo(cw, ch * 0.42); c.moveTo(cw * 0.45, 0); c.lineTo(cw * 0.47, ch); c.stroke(); }
      });
      part(g, new RoundedBoxGeometry(w, h, t, 3, 0.035), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), 0, h / 2, 0);
      if (a.wrapped === 'blanket') { const str = s.material('#d9cdb0'); part(g, new THREE.BoxGeometry(w + 0.012, 0.012, t + 0.012), str, 0, h * 0.35, 0); part(g, new THREE.BoxGeometry(w + 0.012, 0.012, t + 0.012), str, 0, h * 0.7, 0); part(g, new THREE.BoxGeometry(0.012, h + 0.012, t + 0.012), str, w * 0.12, h / 2, 0); }
      return { group: g, w, h, t };
    };

    // Decide the stack, back to front.
    const count = 3 + Math.round(Math.min(1, a.amount * 0.8 + mood.density * 0.2) * 4);
    const pool: Subject[] = (['wedding', 'landscape', 'school', 'sampler', 'drawing', 'ancestor'] as Subject[]).filter((k) => k !== a.outer).sort(() => random() - 0.5);
    const subjects: Subject[] = [...pool, 'landscape', 'ancestor', ...pool];
    const sizes = Array.from({ length: count }, () => { const h = mix(0.32, 0.95, random()), w = h * pick([0.72, 0.8, 1.25, 1.4, 1]); return [Math.min(w, 1.1), h] as [number, number]; }).sort((p, q) => q[1] * q[0] - p[1] * p[0]);
    const wrapAt = a.wrapped === 'none' ? -1 : Math.min(count - 2, 1 + Math.floor(random() * 2));
    const mirrorAt = a.mirror === 'none' ? -1 : wrapAt === 0 ? 1 : 0;
    const fallen = a.state === 'fallen';
    const items: Item[] = sizes.map(([w, h], i) => {
      const last = i === count - 1;
      if (i === mirrorAt) return a.mirror === 'overmantel' ? frame(1.15, 0.72, 'wood', 'mirror') : a.mirror === 'oval' ? round(0.58, 0.82, false) : round(0.42, 0.42, true);
      if (i === wrapAt) return wrap(w + 0.06, h + 0.06);
      if (last) { const big = Math.max(h, 0.5); return frame(a.outer === 'landscape' || a.outer === 'school' ? big * 1.3 : big * 0.8, big, styleFor(), a.outer, fallen); }
      return frame(w, h, styleFor(), subjects[i % subjects.length]);
    });

    // The support.
    let supportH = 1.15;
    const span = Math.max(1.3, ...items.map((it) => it.w + 0.3));
    if (a.against === 'wall') {
      const wallTex = canvas(512, 420, (c, w, h) => {
        c.fillStyle = mood.warmth > 0.5 ? '#d9c9a0' : '#c3cdc4'; c.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 46) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(x, 0, 20, h); }
        c.fillStyle = `rgba(120,95,50,${0.1 + mood.wear * 0.2})`; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,248,0.55)'; c.fillRect(w * 0.3, h * 0.04, w * 0.42, h * 0.5); c.fillStyle = '#4a443c'; c.beginPath(); c.arc(w * 0.51, h * 0.08, 4, 0, 7); c.fill();
      });
      const plaster = s.material('#d9d2c2');
      supportH = 1.35;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(span, supportH, 0.07), [plaster, plaster, plaster, plaster, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), plaster]);
      slab.position.set(0, supportH / 2, -0.035); slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
      s.box([span, 0.12, 0.018], [0, 0.06, 0.009], s.material('#efeadb', { roughness: 0.5 }));
    } else if (a.against === 'box') {
      supportH = 0.52;
      s.box([0.7, supportH, 0.5], [0, supportH / 2, -0.25], s.material('#bd9460', { roughness: 0.95 }));
      s.box([0.7, 0.004, 0.07], [0, supportH + 0.002, -0.25], s.material('#8a5a2c', { roughness: 0.5 }));
      s.label('PICTURES', 0.4, 0.1, [0.37, supportH * 0.6, -0.25], '#17171a', '#bd9460').rotation.y = Math.PI / 2;
    } else {
      supportH = 0.72;
      const iron = s.material('#e4dfd0', { roughness: 0.45, metalness: 0.2 }), cols = 11, pts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < cols; i++) pts.push({ at: [(i - (cols - 1) / 2) * 0.085, supportH / 2 + 0.03, -0.1], size: 1 });
      const col = new THREE.CapsuleGeometry(0.035, supportH - 0.14, 4, 10); col.scale(1, 1, 2.2);
      s.scatter(col, iron, pts);
      for (const x of [-0.4, 0.4]) s.box([0.04, 0.08, 0.14], [x, 0.04, -0.1], iron);
      s.rod([0.47, 0.12, -0.1], [0.56, 0.12, -0.1], 0.014, s.material('#b9844a', { metalness: 0.8 })); s.rod([0.56, 0.12, -0.1], [0.56, 0, -0.1], 0.012, s.material('#b9844a', { metalness: 0.8 }));
      s.ball([0.03, 0.03, 0.03], [0.5, 0.14, -0.1], s.material('#f1eee4'), 10);
    }

    // Lean them.
    const theta = mix(0.2, 0.3, random());
    let z = 0, prevT = 0;
    const names = ['RUTH', 'TOM', 'ANNA', 'CHARITY', '?', 'TOM', 'RUTH'];
    items.forEach((it, i) => {
      const last = i === items.length - 1;
      if (i === 0) z = Math.min(it.h * Math.cos(theta), supportH) * Math.tan(theta) + it.t / 2;
      else z += (prevT / 2 + it.t / 2 + 0.008) / Math.cos(theta) + random() * 0.03;
      prevT = it.t;
      const x = (random() - 0.5) * Math.max(0.1, span - it.w - 0.25) * 0.8;
      if (last && fallen) {
        it.group.rotation.set(-Math.PI / 2, 0, 0);
        const holder = new THREE.Group(); holder.add(it.group); holder.position.set(x * 0.3 + 0.1, it.t / 2 + 0.002, z + it.h + 0.12); holder.rotation.y = (random() - 0.5) * 0.9; s.root.add(holder);
        const shards = Array.from({ length: 7 }, () => ({ at: [holder.position.x + (random() - 0.5) * it.w * 1.3, 0.004, holder.position.z - it.h * 0.5 + (random() - 0.5) * it.h * 1.4] as [number, number, number], size: 0.012 + random() * 0.02 }));
        s.scatter(new THREE.TetrahedronGeometry(1, 0).scale(1, 0.12, 1), new THREE.MeshStandardMaterial({ color: '#dfeaec', roughness: 0.1 }), shards);
        return;
      }
      const turned = a.state === 'turned' || (a.state === 'careful' && !last && random() < 0.18);
      const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.set(-theta, (random() - 0.5) * 0.05, 0);
      it.group.rotation.y = turned ? Math.PI : 0; it.group.rotation.z = (random() - 0.5) * 0.02;
      holder.add(it.group); s.root.add(holder);
      if (a.state === 'claimed') {
        const note = s.label(names[i % names.length], 0.11, 0.1, [0, 0, 0], '#27272c', pick(['#f7ef8a', '#f7ef8a', '#f5b8c6', '#b9e2c4']));
        holder.add(note); note.position.set(it.w / 2 - 0.1, it.h - 0.09, it.t / 2 + 0.012 + (i === wrapAt ? 0.03 : 0)); note.rotation.z = (random() - 0.5) * 0.3; note.castShadow = false;
      }
    });
    return s.finish();
  },
});

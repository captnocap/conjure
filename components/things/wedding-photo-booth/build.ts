import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { paint } from './helpers';

const TAU = Math.PI * 2;
type P3 = [number, number, number];
const COLOURS = {
  cream: { body: '#efe6d0', trim: '#b3202e', curtain: '#8e1b2a' },
  seafoam: { body: '#9fcfc0', trim: '#f4f1e6', curtain: '#2f5f6a' },
  black: { body: '#1f1f24', trim: '#d4ae52', curtain: '#c9a13f' },
  wood: { body: '#8a5a34', trim: '#e9dcc0', curtain: '#3f6a45' },
  pink: { body: '#ff6fa8', trim: '#ffffff', curtain: '#7a35c2' },
} as const;
const HEADER = { photos: 'PHOTOS', booth: 'PHOTO BOOTH', kiss: 'KISS ME', cheese: 'SAY CHEESE', poses: '4 POSES', memories: 'MEMORIES' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of photo booth is it?', {
      vintage: 'A vintage chemical booth: a tall enamelled cabin with a half curtain, a stool inside and a slot on the outside.',
      drape: 'An open-air set-up: a pleated backdrop on a pipe frame, a ring light and camera on a stand, a printer beside it.',
      cutout: 'A painted peep board of a bride and groom with holes for faces, and an instant camera on a tripod.',
      inflatable: 'A glowing inflatable cube with a curtained doorway.',
    }),
    strip: choice('What does the strip of photos show?', {
      grins: 'Two friends grinning, pulling a different face in each frame.',
      kiss: 'A couple leaning closer frame by frame until they kiss.',
      crowd: 'Far too many people crammed into every frame.',
      props: 'People in top hats, giant glasses and stick-on moustaches.',
      alone: 'One person alone, unsmiling, looking away in the last frame.',
      empty: 'Four frames of the empty curtain: nobody was in there.',
    }),
    feet: choice('Whose feet show under the curtain?', {
      nobody: 'Nobody: it is empty.',
      couple: 'Polished black shoes and white heels, close together.',
      kids: 'Several pairs of small bright trainers on tiptoe.',
      crowd: 'Too many feet: half a dozen people squeezed in.',
      loner: 'One pair of scuffed boots, standing very still.',
      barefoot: 'Bare feet, the heels kicked off outside.',
    }),
    state: choice('What is it doing right now?', {
      idle: 'Lit and waiting, props tidy in their box.',
      flashing: 'Mid-shoot: the flash is going off and light spills out.',
      ransacked: 'Late on: props strewn all over the floor, strips dropped and forgotten.',
      broken: 'Out of order: header dark, a paper notice taped across it.',
    }),
    colour: choice('What colours is it done up in?', {
      cream: 'Cream enamel with red trim and a red velvet curtain.',
      seafoam: 'Seafoam green with white trim and a teal curtain.',
      black: 'Gloss black with gold trim and gold sequins.',
      wood: 'Wood panelling with a forest-green curtain.',
      pink: 'Hot pink with a purple curtain.',
    }),
    header: choice('What does the header say?', {
      photos: 'PHOTOS',
      booth: 'PHOTO BOOTH',
      kiss: 'KISS ME',
      cheese: 'SAY CHEESE',
      poses: '4 POSES',
      memories: 'MEMORIES',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const col = COLOURS[a.colour];
    const body = s.material(col.body, { roughness: 0.4 }), trim = s.material(col.trim, { roughness: 0.45, metalness: a.colour === 'black' ? 0.7 : 0.1 });
    const dark = s.material('#17171b', { roughness: 0.7 }), steel = s.material('#b4b9bd', { metalness: 0.8, roughness: 0.35 });
    const broken = a.state === 'broken', flashing = a.state === 'flashing';
    const SKIN = ['#f0c9a4', '#c98f62', '#8a5a3a', '#f6dcc4', '#5c3a26'], HAIR = ['#2a1c14', '#6b4423', '#d9b45a', '#111111', '#8f3a1e', '#b9b9b9'];
    const group = (build: (t: Sculpture) => void, p: P3, r: P3 = [0, 0, 0], scale = 1) => { const t = new Sculpture(context); build(t); t.root.position.set(...p); t.root.rotation.set(r[0], r[1], r[2], 'YXZ'); t.root.scale.setScalar(scale); s.root.add(t.root); return t.root; };

    // The strip of four photos.
    const people = Array.from({ length: 6 }, () => ({ skin: pick(SKIN), hair: pick(HAIR) }));
    const stripTex = paint(96, 384, (ctx, w, h) => {
      ctx.fillStyle = '#fbfaf4'; ctx.fillRect(0, 0, w, h);
      const fh = (h - 20) / 4;
      const head = (cx: number, cy: number, r: number, who: number, mouth: 'smile' | 'open' | 'flat' | 'none', extra = '') => {
        const p = people[who % 6];
        ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 1.03, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
        ctx.fillStyle = '#1b1b1b';
        if (extra !== 'glasses') for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + e * r * 0.36, cy - r * 0.05, r * 0.09, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath();
        if (mouth === 'smile') ctx.arc(cx, cy + r * 0.2, r * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
        if (mouth === 'flat') { ctx.moveTo(cx - r * 0.3, cy + r * 0.5); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); }
        ctx.stroke();
        if (mouth === 'open') { ctx.fillStyle = '#7a1528'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.45, r * 0.25, r * 0.3, 0, 0, TAU); ctx.fill(); }
        if (extra === 'hat') { ctx.fillStyle = '#111'; ctx.fillRect(cx - r * 0.7, cy - r * 1.9, r * 1.4, r * 1.1); ctx.fillRect(cx - r * 1.2, cy - r * 0.95, r * 2.4, r * 0.22); }
        if (extra === 'tache') { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy + r * 0.3, r * 0.32, r * 0.14, -0.3, 0, TAU); ctx.ellipse(cx + r * 0.25, cy + r * 0.3, r * 0.32, r * 0.14, 0.3, 0, TAU); ctx.fill(); }
        if (extra === 'glasses') { ctx.strokeStyle = '#e23b6f'; ctx.lineWidth = r * 0.16; for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + e * r * 0.42, cy - r * 0.05, r * 0.32, 0, TAU); ctx.stroke(); } }
      };
      for (let f = 0; f < 4; f++) {
        const y0 = 6 + f * (fh + 3), cy = y0 + fh * 0.55;
        ctx.save(); ctx.beginPath(); ctx.rect(7, y0, w - 14, fh); ctx.clip();
        ctx.fillStyle = col.curtain; ctx.fillRect(7, y0, w - 14, fh);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 6; k++) ctx.fillRect(10 + k * 14, y0, 5, fh);
        if (a.strip === 'grins') { head(32, cy + (f % 2) * 4, 19, 0, f === 1 ? 'open' : 'smile'); head(64, cy - (f % 2) * 5, 19, 1, f === 2 ? 'open' : 'smile'); }
        if (a.strip === 'kiss') { const gap = [22, 17, 12, 8][f]; head(48 - gap, cy, 20, 0, f < 3 ? 'smile' : 'none'); head(48 + gap, cy, 20, 1, f < 3 ? 'smile' : 'none'); if (f === 3) { ctx.fillStyle = '#ff5c8a'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('♥', 38, y0 + 24); } }
        if (a.strip === 'crowd') for (let k = 0; k < 6; k++) head(18 + (k % 3) * 30 + random() * 6, y0 + 28 + Math.floor(k / 3) * 30 + random() * 8, 15, k + f, pick(['smile', 'open', 'smile']));
        if (a.strip === 'props') { head(31, cy + 6, 18, 0, 'smile', ['hat', 'glasses', 'tache', 'hat'][f]); head(65, cy + 6, 18, 1, f % 2 ? 'open' : 'smile', ['tache', 'hat', 'glasses', 'glasses'][f]); }
        if (a.strip === 'alone') head(f === 3 ? 70 : 48, cy + 4, 22, 0, f === 3 ? 'none' : 'flat');
        ctx.restore();
      }
    });
    const stripMat = new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.6, side: THREE.DoubleSide });
    const strip = (p: P3, r: P3, size = 0.1) => { const m = s.mesh(new THREE.PlaneGeometry(size, size * 4), stripMat, p); m.rotation.set(r[0], r[1], r[2], 'YXZ'); return m; };
    const sample = (p: P3, ry: number) => {
      const g = group((t) => { t.box([0.42, 1.5, 0.03], [0, 0, 0], trim); t.mesh(new THREE.PlaneGeometry(0.34, 1.36), stripMat, [0, 0, 0.017]); }, p, [0, ry, 0]);
      return g;
    };

    // Lit lettering.
    const headerMats: THREE.MeshStandardMaterial[] = [];
    const sign = (text: string, w: number, h: number, p: P3, ry = 0, ink = '#ffffff', paper: string = col.trim, lit = true) => {
      const tex = paint(512, Math.round(512 * h / w), (ctx, cw, ch) => {
        ctx.fillStyle = paper; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(ch * 0.7, 512 / text.length * 1.35)}px sans-serif`;
        ctx.fillText(text, cw / 2, ch / 2 + 2, cw - 30);
      });
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...(lit && !broken ? { emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: mix(0.45, 1.0, mood.cheer) } : {}) });
      if (lit && !broken) headerMats.push(mat);
      const m = s.mesh(new THREE.PlaneGeometry(w, h), mat, p);
      m.rotation.y = ry;
      return m;
    };
    const inkOn = a.colour === 'cream' || a.colour === 'pink' ? '#ffffff' : a.colour === 'black' ? '#1f1f24' : '#2a2a2a';
    const paperOn = a.colour === 'cream' ? '#b3202e' : a.colour === 'pink' ? '#7a35c2' : col.trim;
    const bulbMat = s.material('#fff1c9', { emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.6), emissiveIntensity: broken ? 0 : mix(0.9, 2.2, mood.cheer) });
    const bulbs = (from: P3, to: P3, count: number) => {
      const pts = []; for (let k = 0; k < count; k++) { const f = count === 1 ? 0.5 : k / (count - 1); pts.push({ at: [mix(from[0], to[0], f), mix(from[1], to[1], f), mix(from[2], to[2], f)] as P3, size: 0.028 }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbMat, pts).castShadow = false;
    };

    // A pleated curtain.
    const curtain = (w: number, h: number, p: P3, colour: string, gathered = 1) => {
      const geo = new THREE.PlaneGeometry(w, h, Math.max(12, Math.round(w / 0.03)), 1);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setZ(k, Math.sin(x / (0.11 * gathered) * TAU) * 0.028); }
      geo.computeVertexNormals();
      return s.mesh(geo, s.material(colour, { side: THREE.DoubleSide, roughness: a.colour === 'black' ? 0.35 : 0.9, metalness: a.colour === 'black' ? 0.6 : 0 }), p);
    };

    // Feet.
    const person = (x: number, z: number, y: number, kind: 'suit' | 'dress' | 'kid' | 'boots' | 'bare', top: number, ry = 0) => {
      group((t) => {
        const skin = t.material(pick(SKIN));
        for (const e of [-1, 1]) {
          const fx = e * (kind === 'kid' ? 0.055 : 0.085);
          if (kind === 'suit') { t.ball([0.05, 0.035, 0.12], [fx, 0.035, 0.04], t.material('#101012', { roughness: 0.2 })); t.cylinder(0.065, 0.075, top - 0.05, [fx, 0.05 + (top - 0.05) / 2, -0.02], t.material(pick(['#1f2a44', '#2a2a2e', '#55585c']))); }
          if (kind === 'dress') { const sh = t.material(pick(['#fbf9f2', '#d4ae52', '#e7b3b8'])); t.ball([0.04, 0.025, 0.1], [fx, 0.03, 0.05], sh); t.cylinder(0.01, 0.006, 0.07, [fx, 0.035, -0.04], sh, 6); t.cylinder(0.035, 0.03, top * 0.55, [fx, 0.06 + top * 0.275, -0.02], skin); }
          if (kind === 'kid') { const sh = t.material(pick(['#e23b3b', '#3a8fd9', '#f2c230', '#3fae5a', '#ff6fa8'])); const shoe = t.ball([0.04, 0.03, 0.08], [fx, 0.05, 0.035], sh); shoe.rotation.x = 0.5; t.cylinder(0.03, 0.028, 0.08, [fx, 0.12, -0.005], t.material('#ffffff')); t.cylinder(0.028, 0.026, Math.min(top, 0.42) - 0.16, [fx, 0.16 + (Math.min(top, 0.42) - 0.16) / 2, -0.005], skin); }
          if (kind === 'boots') { const bt = t.material('#4a3424', { roughness: 0.95 }); t.ball([0.055, 0.045, 0.13], [fx, 0.045, 0.04], bt); t.cylinder(0.055, 0.058, 0.2, [fx, 0.14, -0.02], bt); t.cylinder(0.06, 0.07, top - 0.22, [fx, 0.22 + (top - 0.22) / 2, -0.02], t.material('#3a5a80', { roughness: 0.9 })); }
          if (kind === 'bare') { t.ball([0.042, 0.025, 0.105], [fx, 0.025, 0.04], skin); t.cylinder(0.035, 0.03, top - 0.03, [fx, 0.03 + (top - 0.03) / 2, -0.02], skin); }
        }
        if (kind === 'dress') t.cylinder(0.12, 0.2, top * 0.42, [0, top - top * 0.21, -0.02], t.material(pick(['#fbf9f2', '#e7b3b8', '#3f6a8a', '#b3202e', '#2f5f4a'])), 16);
      }, [x, y, z], [0, ry, 0]);
    };
    const line = (cx: number, z: number, y: number, width: number, top: number) => {
      const kinds: ('suit' | 'dress' | 'kid' | 'boots' | 'bare')[] =
        a.feet === 'couple' ? ['suit', 'dress'] : a.feet === 'kids' ? Array.from({ length: 3 + Math.floor(random() * 2) }, () => 'kid' as const)
          : a.feet === 'crowd' ? Array.from({ length: 5 + Math.floor(random() * 2) }, () => pick(['suit', 'dress', 'dress', 'boots', 'suit'] as const)) : a.feet === 'loner' ? ['boots'] : a.feet === 'barefoot' ? ['bare', 'bare'].slice(0, 1 + Math.floor(random() * 2)) as 'bare'[] : [];
      const xs: number[] = [];
      kinds.forEach((kind, k) => {
        const spacing = Math.min(kind === 'kid' ? 0.2 : 0.27, width / Math.max(kinds.length, 1));
        const x = cx + (k - (kinds.length - 1) / 2) * spacing * (a.feet === 'couple' ? 0.85 : 1);
        xs.push(x);
        person(x, z - (k % 2) * (a.feet === 'crowd' ? 0.16 : 0.03), y, kind, top, (random() - 0.5) * 0.5);
      });
      return xs;
    };
    const heelsOutside = (x: number, z: number) => {
      const c = pick(['#c9203a', '#d4ae52', '#fbf9f2']);
      for (const e of [0, 1]) group((t) => { const m = t.material(c, { roughness: 0.3 }); t.box([0.08, 0.012, 0.16], [0, 0.065, -0.03], m).rotation.x = 0.5; t.box([0.085, 0.04, 0.09], [0, 0.03, 0.09], m); t.cylinder(0.011, 0.005, 0.1, [0, 0.05, -0.1], m, 8); }, [x + e * 0.22, e ? 0.045 : 0, z + e * 0.1], [0, random() * TAU, e ? Math.PI / 2 : 0], 1.3);
    };

    // Flash.
    const flashMats: THREE.MeshStandardMaterial[] = [];
    const burst = (p: P3, r: number) => {
      const core = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffbe8', emissiveIntensity: 3 });
      const halo = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fffbe8', emissiveIntensity: 1.5, transparent: true, opacity: 0.35, depthWrite: false });
      s.ball([r * 0.4, r * 0.4, r * 0.4], p, core).castShadow = false;
      s.ball([r, r, r], p, halo).castShadow = false;
      flashMats.push(core, halo);
    };
    const spill = (cx: number, z: number, w: number) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([cx - w / 2, 0.006, z, cx + w / 2, 0.006, z, cx + w * 1.1, 0.006, z + 1.5, cx - w * 1.1, 0.006, z + 1.5], 3));
      geo.setIndex([0, 2, 1, 0, 3, 2]);
      geo.computeVertexNormals();
      const m = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fffbe8', emissiveIntensity: 1.2, transparent: true, opacity: 0.4, depthWrite: false });
      s.mesh(geo, m).castShadow = false;
      flashMats.push(m);
    };

    // Each style places: where the strip comes out, where the prop box goes.
    let slot: P3 = [0, 1, 0], slotYaw = 0, boxAt: [number, number] = [-1.2, 0.9], extent = 1.2;
    if (a.style === 'vintage') {
      const Wd = 1.56, Dp = 0.9, Ht = 1.95, y0 = 0.1, mx = -0.5;
      s.box([Wd + 0.06, y0, Dp + 0.06], [0, y0 / 2, 0], dark);
      s.box([Wd, Ht, 0.04], [0, y0 + Ht / 2, -Dp / 2 + 0.02], body);
      for (const x of [-Wd / 2 + 0.02, Wd / 2 - 0.02]) s.box([0.04, Ht, Dp], [x, y0 + Ht / 2, 0], body);
      s.box([Wd, 0.05, Dp], [0, y0 + Ht + 0.025, 0], trim);
      // Machine cabinet on the left.
      s.box([0.56, Ht, Dp - 0.04], [mx, y0 + Ht / 2, 0], body);
      s.box([0.58, 0.05, Dp], [mx, y0 + 0.75, 0], trim);
      s.box([0.36, 0.3, 0.02], [mx, y0 + 1.4, Dp / 2 - 0.005], s.material('#b8c4cc', { metalness: 0.9, roughness: 0.1 }));
      s.cylinder(0.05, 0.05, 0.03, [mx, y0 + 1.15, Dp / 2], dark, 16).rotation.x = Math.PI / 2;
      s.box([0.09, 0.14, 0.02], [mx + 0.14, y0 + 0.95, Dp / 2], steel);
      s.box([0.14, 0.04, 0.03], [mx - 0.1, y0 + 0.5, Dp / 2], dark);
      slot = [mx - 0.1, y0 + 0.33, Dp / 2 + 0.03];
      // Stool and curtain.
      s.cylinder(0.16, 0.16, 0.05, [0.3, y0 + 0.48, -0.1], trim, 20);
      s.cylinder(0.03, 0.05, 0.46, [0.3, y0 + 0.23, -0.1], steel, 10);
      s.cylinder(0.012, 0.012, 1.0, [0.27, y0 + Ht - 0.12, Dp / 2 - 0.02], steel, 8).rotation.z = Math.PI / 2;
      const open = a.feet === 'nobody' && !flashing ? 0.55 : 1;
      curtain(0.98 * open, 1.22, [0.27 + 0.49 * (1 - open), y0 + Ht - 0.12 - 0.61, Dp / 2 - 0.02], col.curtain, open);
      s.box([Wd, 0.3, 0.1], [0, y0 + Ht + 0.2, Dp / 2 - 0.05], trim);
      sign(HEADER[a.header], Wd - 0.12, 0.24, [0, y0 + Ht + 0.2, Dp / 2 + 0.002], 0, inkOn, paperOn);
      bulbs([-Wd / 2 + 0.05, y0 + Ht + 0.38, Dp / 2 - 0.02], [Wd / 2 - 0.05, y0 + Ht + 0.38, Dp / 2 - 0.02], 11);
      sample([Wd / 2 + 0.017, y0 + 1.05, 0], Math.PI / 2);
      for (const yy of [0.25, 1.85]) s.box([0.02, 0.05, Dp], [Wd / 2 + 0.005, y0 + yy, 0], trim);
      line(0.27, Dp / 2 - 0.17, y0, 0.8, 0.75);
      if (flashing) { burst([0.27, y0 + 1.5, Dp / 2 - 0.3], 0.3); spill(0.27, Dp / 2, 0.9); }
      if (broken) { const note = sign('OUT OF ORDER', 0.62, 0.22, [0.27, y0 + 1.25, Dp / 2 + 0.03], 0, '#b3202e', '#fbfaf4', false); note.rotation.z = -0.12; }
      boxAt = [-1.25, 0.75]; extent = 1.0;
    } else if (a.style === 'drape') {
      const Wd = 2.5, Ht = 2.35, bz = -0.45;
      for (const e of [-1, 1]) { s.cylinder(0.025, 0.025, Ht, [e * Wd / 2, Ht / 2, bz], steel, 10); s.box([0.45, 0.02, 0.45], [e * Wd / 2, 0.01, bz], steel); }
      s.cylinder(0.022, 0.022, Wd, [0, Ht, bz], steel, 10).rotation.z = Math.PI / 2;
      curtain(Wd - 0.08, Ht - 0.42, [0, Ht - (Ht - 0.42) / 2, bz], col.curtain);
      s.box([Wd + 0.05, 0.3, 0.05], [0, Ht + 0.18, bz], trim);
      sign(HEADER[a.header], Wd - 0.1, 0.24, [0, Ht + 0.18, bz + 0.03], 0, inkOn, paperOn);
      bulbs([-Wd / 2, Ht + 0.36, bz], [Wd / 2, Ht + 0.36, bz], 15);
      const xs = line(0, bz - 0.14, 0, 2.0, 0.42);
      void xs;
      // A bench to pose on.
      s.box([1.3, 0.12, 0.42], [0, 0.42, 0.05], s.material(col.trim === '#ffffff' ? '#e7b3b8' : col.trim, { roughness: 0.9 }));
      for (const e of [-1, 1]) for (const f of [-1, 1]) s.cylinder(0.02, 0.015, 0.36, [e * 0.58, 0.18, 0.05 + f * 0.16], s.material('#c9a13f', { metalness: 0.8, roughness: 0.3 }), 8);
      // Camera stand with ring light.
      const kx = 0.2, kz = 2.1;
      for (let k = 0; k < 3; k++) { const th = k * TAU / 3 + 0.4; s.rod([kx, 0.7, kz], [kx + Math.sin(th) * 0.45, 0, kz + Math.cos(th) * 0.45], 0.014, dark); }
      s.cylinder(0.02, 0.02, 1.0, [kx, 1.15, kz], dark, 8);
      const ringMat = s.material('#fff6dc', { emissive: '#fff1c9', emissiveIntensity: broken ? 0 : flashing ? 3 : mix(1, 2, mood.cheer) });
      s.mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 40), ringMat, [kx, 1.72, kz]).castShadow = false;
      s.box([0.16, 0.11, 0.1], [kx, 1.72, kz], dark);
      s.cylinder(0.035, 0.04, 0.06, [kx, 1.72, kz - 0.07], dark, 12).rotation.x = Math.PI / 2;
      s.box([0.26, 0.36, 0.02], [kx, 1.3, kz + 0.03], dark).rotation.x = 0.25;
      if (flashing) burst([kx, 1.72, kz - 0.1], 0.42);
      // Printer on a stand.
      const px = 1.25, pz = 1.7;
      s.box([0.5, 0.8, 0.42], [px, 0.4, pz], body);
      s.box([0.52, 0.04, 0.44], [px, 0.82, pz], trim);
      s.box([0.36, 0.2, 0.34], [px, 0.94, pz], dark);
      s.box([0.16, 0.02, 0.03], [px, 0.9, pz + 0.18], steel);
      slot = [px, 0.72, pz + 0.215];
      sample([Wd / 2 + 0.05, 1.3, bz + 0.2], 0.5);
      if (broken) { const note = sign('OUT OF ORDER', 0.9, 0.3, [0, 1.35, bz + 0.06], 0, '#b3202e', '#fbfaf4', false); note.rotation.z = -0.1; }
      boxAt = [-1.3, 1.3]; extent = 1.5;
    } else if (a.style === 'cutout') {
      const Wd = 2.3, Ht = 1.75, lift = 0.38, holes: [number, number][] = [[0.72, 1.3], [1.52, 1.38]];
      const scene = paint(512, 400, (ctx, w, h) => {
        const X = (v: number) => v / Wd * w, Y = (v: number) => h - v / Ht * h;
        ctx.fillStyle = a.colour === 'black' ? '#27344f' : a.colour === 'pink' ? '#ffc4dc' : '#a9d4e6'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = a.colour === 'wood' ? '#8fae6a' : '#7fb56a'; ctx.fillRect(0, Y(0.5), w, h);
        ctx.fillStyle = '#fff7'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(random() * w, Y(1.2 + random() * 0.4), 46, 14, 0, 0, TAU); ctx.fill(); }
        // Bride.
        ctx.fillStyle = '#fbf9f2'; ctx.beginPath(); ctx.moveTo(X(0.72), Y(1.12)); ctx.lineTo(X(1.18), Y(0.05)); ctx.lineTo(X(0.22), Y(0.05)); ctx.closePath(); ctx.fill();
        ctx.fillRect(X(0.6), Y(1.18), X(0.24), Y(0.85) - Y(1.18));
        ctx.fillStyle = '#f3c6cc'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(X(0.95 + (k % 3) * 0.06), Y(0.86 - Math.floor(k / 3) * 0.07), 9, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#fbf9f2'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(X(0.72), Y(1.3), X(0.24), Math.PI * 0.95, Math.PI * 1.9); ctx.stroke();
        // Groom.
        ctx.fillStyle = '#20222b'; ctx.fillRect(X(1.3), Y(1.2), X(0.44), Y(0.5) - Y(1.2)); ctx.fillRect(X(1.33), Y(0.5), X(0.17), Y(0.05) - Y(0.5)); ctx.fillRect(X(1.55), Y(0.5), X(0.17), Y(0.05) - Y(0.5));
        ctx.fillStyle = '#fbf9f2'; ctx.beginPath(); ctx.moveTo(X(1.44), Y(1.2)); ctx.lineTo(X(1.6), Y(1.2)); ctx.lineTo(X(1.52), Y(0.85)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col.trim === '#ffffff' ? '#b3202e' : col.trim; ctx.beginPath(); ctx.ellipse(X(1.52), Y(1.15), 15, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.fillRect(X(1.35), Y(1.72), X(0.34), 22);
        // Banner.
        ctx.fillStyle = paperOn; ctx.fillRect(0, 0, w, 44);
        ctx.fillStyle = inkOn; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(HEADER[a.header], w / 2, 24);
      });
      scene.repeat.set(1 / Wd, 1 / Ht);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(Wd, 0); shape.lineTo(Wd, Ht - 0.3); shape.quadraticCurveTo(Wd / 2, Ht + 0.3, 0, Ht - 0.3); shape.closePath();
      for (const [hx, hy] of holes) { const hole = new THREE.Path(); hole.absellipse(hx, hy, 0.135, 0.16, 0, TAU, true); shape.holes.push(hole); }
      const board = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 20 }), [new THREE.MeshStandardMaterial({ map: scene, roughness: 0.8 }), s.material('#c9ad78')] as unknown as THREE.Material, [-Wd / 2, lift, -0.03]);
      void board;
      for (const e of [-1, 1]) { s.box([0.06, lift + 0.6, 0.05], [e * (Wd / 2 - 0.15), (lift + 0.6) / 2, -0.06], s.material('#a9794a')); s.rod([e * (Wd / 2 - 0.15), lift + 1.2, -0.05], [e * (Wd / 2 - 0.15), 0, -0.8], 0.025, s.material('#a9794a')); }
      bulbs([-Wd / 2 + 0.05, lift + Ht - 0.24, 0.02], [0, lift + Ht - 0.07, 0.02], 7);
      bulbs([Wd / 2 - 0.05, lift + Ht - 0.24, 0.02], [0.16, lift + Ht - 0.075, 0.02], 6);
      curtain(Wd - 0.5, 0.2, [0, lift - 0.08, -0.02], col.curtain);
      const xs = line(0, -0.25, 0, 1.5, 0.36);
      xs.slice(0, 2).forEach((_x, k) => {
        if (a.feet === 'kids') return;
        const [hx, hy] = holes[k];
        s.ball([0.125, 0.15, 0.12], [-Wd / 2 + hx, lift + hy, -0.14], s.material(pick(SKIN)));
        s.ball([0.135, 0.12, 0.13], [-Wd / 2 + hx, lift + hy + 0.07, -0.18], s.material(pick(HAIR)));
      });
      // Instant camera on a tripod.
      const kx = 0.1, kz = 2.0;
      for (let k = 0; k < 3; k++) { const th = k * TAU / 3 + 0.4; s.rod([kx, 1.15, kz], [kx + Math.sin(th) * 0.5, 0, kz + Math.cos(th) * 0.5], 0.016, s.material('#7a5230')); }
      s.box([0.24, 0.2, 0.2], [kx, 1.27, kz], body);
      s.box([0.24, 0.05, 0.2], [kx, 1.17, kz], dark);
      s.cylinder(0.06, 0.07, 0.07, [kx, 1.29, kz - 0.12], dark, 14).rotation.x = Math.PI / 2;
      s.box([0.07, 0.05, 0.03], [kx + 0.07, 1.4, kz - 0.06], steel);
      slot = [kx, 1.02, kz + 0.105];
      if (flashing) burst([kx + 0.07, 1.4, kz - 0.1], 0.36);
      sample([Wd / 2 + 0.45, 0.95, 0.1], -0.4);
      s.rod([Wd / 2 + 0.45, 0, 0.1], [Wd / 2 + 0.45, 0.4, 0.08], 0.02, s.material('#a9794a'));
      if (broken) { const note = sign('OUT OF ORDER', 0.9, 0.3, [0, lift + 0.7, 0.012], 0, '#b3202e', '#fbfaf4', false); note.rotation.z = 0.1; }
      boxAt = [-1.2, 1.2]; extent = 1.4;
    } else {
      const Wd = 2.3, Ht = 2.25, Dp = 2.0;
      const hue = a.colour === 'pink' ? 0.92 : a.colour === 'seafoam' ? 0.45 : a.colour === 'black' ? 0.13 : mix(0.6, 0.06, mood.warmth);
      const glowC = new THREE.Color().setHSL(hue, 0.75, 0.72);
      const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffffff').lerp(glowC, 0.35), emissive: glowC, emissiveIntensity: broken ? 0 : mix(0.35, 0.8, mood.cheer), roughness: 0.5 });
      if (!broken) headerMats.push(skinMat);
      s.mesh(new RoundedBoxGeometry(Wd, Ht * (broken ? 0.9 : 1), Dp, 5, 0.3), skinMat, [0, Ht * (broken ? 0.9 : 1) / 2, 0]);
      for (const e of [-1, 1]) for (const f of [-1, 1]) { s.rod([e * Wd / 2, 0.5, f * Dp / 2], [e * (Wd / 2 + 0.5), 0, f * (Dp / 2 + 0.5)], 0.006, dark); s.cylinder(0.015, 0.005, 0.12, [e * (Wd / 2 + 0.5), 0.04, f * (Dp / 2 + 0.5)], steel, 6); }
      s.box([1.0, 1.75, 0.04], [0, 0.875, Dp / 2 - 0.01], dark);
      curtain(1.0, 1.15, [0, 1.75 - 0.575, Dp / 2 + 0.03], col.curtain);
      sign(HEADER[a.header], 1.3, 0.24, [0, 1.95, Dp / 2 + 0.012], 0, inkOn, paperOn);
      s.box([0.5, 0.4, 0.4], [-Wd / 2 - 0.45, 0.2, -0.4], s.material('#3b4a5a'));
      s.tube([[-Wd / 2 - 0.2, 0.2, -0.4], [-Wd / 2 - 0.05, 0.22, -0.4], [-Wd / 2 + 0.1, 0.25, -0.4]], 0.11, s.material('#e9e6dc'));
      line(0, Dp / 2 - 0.12, 0, 0.9, 0.62);
      const px = Wd / 2 - 0.25, pz = Dp / 2 + 0.45;
      s.box([0.42, 1.0, 0.36], [px, 0.5, pz], body);
      s.box([0.44, 0.04, 0.38], [px, 1.02, pz], trim);
      s.box([0.3, 0.22, 0.02], [px, 0.8, pz + 0.185], dark);
      s.box([0.16, 0.025, 0.03], [px, 0.6, pz + 0.185], steel);
      slot = [px, 0.42, pz + 0.2];
      sample([-Wd / 2 + 0.38, 1.0, Dp / 2 + 0.02], 0);
      if (flashing) { burst([0, 1.2, Dp / 2 - 0.2], 0.3); spill(0, Dp / 2 + 0.03, 0.95); }
      if (broken) { const note = sign('OUT OF ORDER', 0.8, 0.26, [0, 1.3, Dp / 2 + 0.07], 0, '#b3202e', '#fbfaf4', false); note.rotation.z = -0.1; }
      boxAt = [-1.35, 1.55]; extent = 1.6;
    }
    if (a.feet === 'barefoot') heelsOutside(boxAt[0] + 1.1, boxAt[1] + 0.25);

    // The printed strip, and strays.
    if (!broken) strip([slot[0], slot[1] - 0.12, slot[2] + 0.035], [0.28, slotYaw, 0.03], 0.11);
    else strip([slot[0], slot[1] - 0.03, slot[2] + 0.02], [1.1, slotYaw, 0.4], 0.11);
    const strays = a.state === 'ransacked' ? 3 + Math.round(mood.density * 3) : mood.wear > 0.6 ? 1 : 0;
    for (let k = 0; k < strays; k++) strip([slot[0] + (random() - 0.5) * 1.6, 0.006 + k * 0.001, slot[2] + 0.3 + random() * 0.8], [-Math.PI / 2, random() * TAU, 0], 0.11);

    // Props.
    const prop = (kind: number, p: P3, r: P3) => group((t) => {
      const stick = t.material('#e2cfa0');
      if (kind === 0) { const c = pick(['#111114', '#111114', '#7a35c2', '#b3202e']); t.cylinder(0.085, 0.08, 0.15, [0, 0.085, 0], t.material(c), 18); t.cylinder(0.14, 0.14, 0.012, [0, 0.006, 0], t.material(c), 20); t.cylinder(0.087, 0.083, 0.03, [0, 0.03, 0], t.material(pick(['#d4ae52', '#e23b6f', '#ffffff'])), 18); return; }
      if (kind === 5) { t.cylinder(0.09, 0.09, 0.07, [0, 0.035, 0], t.material('#d4ae52', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), 14); for (let k = 0; k < 5; k++) { const th = k * TAU / 5; t.cylinder(0.001, 0.025, 0.06, [Math.sin(th) * 0.085, 0.1, Math.cos(th) * 0.085], t.material('#d4ae52', { metalness: 0.8, roughness: 0.3 }), 6); } return; }
      t.cylinder(0.006, 0.006, 0.32, [0, 0.16, 0], stick, 6);
      if (kind === 1) for (const e of [-1, 1]) t.ball([0.07, 0.028, 0.012], [e * 0.055, 0.34, 0], t.material('#141414')).rotation.z = e * 0.35;
      if (kind === 2) for (const e of [-1, 1]) t.ring(0.05, 0.012, [e * 0.06, 0.37, 0], t.material(pick(['#e23b6f', '#3a8fd9', '#f2c230', '#111114'])));
      if (kind === 3) for (const e of [-1, 1]) t.ball([0.075, 0.022, 0.012], [0, 0.345 + e * 0.014, 0], t.material('#d81e3a', { roughness: 0.3 }));
      if (kind === 4) t.label(pick(['I DO', 'OMG', 'CHEERS', 'TEAM BRIDE', 'TEAM GROOM', 'HITCHED']), 0.3, 0.14, [0, 0.4, 0], '#1b1b1f', pick(['#f2c230', '#ffffff', '#ffc4dc']));
    }, p, r, 1.25);
    const boa = (pts: P3[]) => {
      const c = pick(['#e23b6f', '#7a35c2', '#19b5a5', '#f2c230', '#ffffff']);
      s.tube(pts, 0.032, s.material(c, { roughness: 1 }));
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const fuzz = []; for (let k = 0; k < 46; k++) { const p = curve.getPoint(random()); fuzz.push({ at: [p.x + (random() - 0.5) * 0.06, p.y + (random() - 0.5) * 0.06, p.z + (random() - 0.5) * 0.06] as P3, size: 0.018 + random() * 0.02, color: c }); }
      s.scatter(new THREE.TetrahedronGeometry(1), s.material('#ffffff', { roughness: 1 }), fuzz);
    };
    const [bx, bz] = boxAt, wood = s.material(a.colour === 'wood' ? '#c9ad78' : '#8a5a34', { roughness: 0.9 });
    s.box([0.7, 0.03, 0.46], [bx, 0.015, bz], wood);
    for (const e of [-1, 1]) { s.box([0.7, 0.38, 0.03], [bx, 0.19, bz + e * 0.23], wood); s.box([0.03, 0.38, 0.46], [bx + e * 0.35, 0.19, bz], wood); }
    s.label('PROPS', 0.44, 0.16, [bx, 0.2, bz + 0.247], '#3a2a1a', '#f4ecd6');
    const ransacked = a.state === 'ransacked';
    const inBox = ransacked ? 2 : broken ? 3 : 5 + Math.round(mood.density * 4);
    for (let k = 0; k < inBox; k++) prop(1 + Math.floor(random() * 4), [bx + (random() - 0.5) * 0.5, 0.1 + random() * 0.08, bz + (random() - 0.5) * 0.3], [(random() - 0.5) * 0.5, random() * TAU, (random() - 0.5) * 0.5]);
    if (!ransacked) { prop(0, [bx - 0.18, 0.36, bz], [0.25, random(), 0.15]); if (mood.density > 0.4) prop(5, [bx + 0.2, 0.36, bz + 0.05], [-0.2, 0, 0.1]); }
    boa(ransacked
      ? [[bx + 0.2, 0.3, bz + 0.2], [bx + 0.4, 0.4, bz + 0.26], [bx + 0.55, 0.05, bz + 0.4], [bx + 0.9, 0.035, bz + 0.3], [bx + 1.3, 0.035, bz + 0.55], [bx + 1.7, 0.035, bz + 0.4]]
      : [[bx - 0.1, 0.3, bz + 0.1], [bx + 0.15, 0.42, bz + 0.2], [bx + 0.36, 0.4, bz + 0.12], [bx + 0.42, 0.2, bz + 0.2], [bx + 0.48, 0.05, bz + 0.3]]);
    if (ransacked) {
      const count = 7 + Math.round(mood.density * 7);
      for (let k = 0; k < count; k++) {
        const kind = Math.floor(random() * 6), x = bx + 0.3 + random() * (extent * 2 + 0.6), z = bz - 0.3 + random() * 1.3;
        prop(kind, [x, kind === 0 || kind === 5 ? (random() < 0.5 ? 0 : 0.11) : 0.02, z], kind === 0 || kind === 5 ? [random() < 0.5 ? 0 : Math.PI / 2, random() * TAU, 0] : [Math.PI / 2, random() * TAU, 0]);
      }
    }

    const baseHeader = headerMats.map((m) => m.emissiveIntensity), baseBulb = bulbMat.emissiveIntensity;
    const baseFlash = flashMats.map((m) => ({ e: m.emissiveIntensity, o: m.opacity }));
    return s.finish({
      update: (_dt, time) => {
        const e = mood.energy;
        headerMats.forEach((m, k) => { m.emissiveIntensity = baseHeader[k] * (1 + Math.sin(time * 3 + k) * 0.15 * e); });
        bulbMat.emissiveIntensity = baseBulb * (1 + Math.sin(time * 5) * 0.25 * e);
        const pulse = Math.pow(Math.max(0, Math.sin(time * mix(1.5, 5, e))), 6);
        flashMats.forEach((m, k) => { m.emissiveIntensity = baseFlash[k].e * (0.5 + pulse); if (m.transparent) m.opacity = baseFlash[k].o * (0.6 + pulse * 0.6); });
      },
    });
  },
});

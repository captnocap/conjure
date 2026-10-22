import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { painted, pick, taperTube } from './fx';

const STYLES = {
  classic: 'Classic vampire: two long elegant upper canines in an otherwise neat smile.',
  nosferatu: 'Nosferatu: a pair of long rat-like fangs at the very front, the rest small and crooked.',
  shark: 'Shark rows: every tooth a triangle, with a second row crowding behind the first.',
  tusks: 'Tusks: thick lower tusks curving up past the lip like a boar or orc.',
  'needle-maw': 'A needle maw: dozens of thin long spikes like a deep-sea fish.',
} as const;
type Style = keyof typeof STYLES;

const NAMES = ['VERA', 'MR KANE', 'STUNT 2', 'LEAD VAMP', 'EXTRA 7', 'DOLORES', 'COUNT', 'BRIDE B', 'LUPE', 'UNDERSTUDY', 'IGOR', 'TWIN A'];

export default defineThing({
  questions: {
    featured: choice('Which fang style is the featured set at the front?', STYLES),
    sets: score('How many sets are on the tray?', ['Just two', 'Four', 'Six', 'A full tray of eight']),
    colour: choice('What colour are the teeth?', {
      pearl: 'Clean pearl white, freshly polished.',
      yellowed: 'Yellowed ivory with brown gum lines, old and nicotine-stained.',
      bloodied: 'White with stage blood on the tips and drips on the tray.',
      chrome: 'Mirror chrome, a metal-mouthed henchman.',
      glow: 'Pale green glow-in-the-dark novelty plastic.',
    }),
    featuredBase: choice('How is the featured set presented?', {
      articulator: 'Mounted open on plaster jaw casts, like a dental model.',
      plate: 'Lying on its pink acrylic gum plate, mouth propped open.',
      closed: 'Bitten shut, fangs overlapping the lower teeth.',
    }),
    novelty: noul('Is one set a wind-up chattering novelty with little feet and a key?'),
    labels: choice('How are the sets labelled?', {
      none: 'No labels at all.',
      tape: 'Strips of masking tape with actor names in marker.',
      tags: 'Small numbered white card tags.',
    }),
    missing: choice('Is a set missing from its slot?', {
      no: 'No, every slot is accounted for.',
      'on-set': 'Yes: an empty outline with a note saying it is on set.',
      lost: 'Yes: an empty outline with a red question mark note.',
    }),
    tools: choice('What else is on the tray?', {
      nothing: 'Nothing but the teeth.',
      dental: 'A dental mirror and a pick.',
      mixing: 'A mixing cup of pink acrylic with a spatula, and a mirror.',
      loose: 'A scatter of loose single fangs waiting to be fitted.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const toothColour = { pearl: '#f6f2e6', yellowed: '#d8bf78', bloodied: '#f3ece0', chrome: '#e3e7ea', glow: '#c9f5a0' }[a.colour];
    const tooth = s.material(toothColour, a.colour === 'chrome' ? { metalness: 1, roughness: 0.12 } : a.colour === 'glow' ? { emissive: '#8dff5a', emissiveIntensity: 0.45, roughness: 0.4 } : { roughness: 0.25 });
    const gum = s.material(a.colour === 'yellowed' ? '#c9727a' : '#ee8f9c', { roughness: 0.35 });
    const noveltyGum = s.material('#e3202c', { roughness: 0.3 });
    const plaster = s.material('#ece6d6', { roughness: 0.95 });
    const steel = s.material('#c3c9cc', { metalness: 0.85, roughness: 0.28 });
    const blood = s.material('#9c0f18', { roughness: 0.15 });
    const brass = s.material('#d9b04a', { metalness: 0.8, roughness: 0.3 });

    const archPoint = (t: number, scale = 1) => {
      const angle = t * 1.8;
      return new THREE.Vector3(Math.sin(angle) * 0.027 * scale, 0, (Math.cos(angle) * 0.034 - 0.006) * scale);
    };
    const cone = new THREE.ConeGeometry(1, 1, 6); cone.translate(0, 0.5, 0);
    const block = new THREE.CylinderGeometry(0.72, 1, 1, 6); block.translate(0, 0.5, 0);
    const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();

    /** One jaw: gum arch plus merged teeth. Teeth grow along +y; the upper jaw is flipped by its parent. */
    const jaw = (style: Style, upper: boolean, novelty: boolean) => {
      const group = new THREE.Group();
      const arch = Array.from({ length: 15 }, (_u, i) => archPoint(i / 7 - 1));
      const gumMesh = new THREE.Mesh(taperTube(arch, (t) => 0.0052 * (0.8 + 0.3 * Math.sin(Math.PI * t)), 36, 8), novelty ? noveltyGum : gum);
      gumMesh.scale.y = 0.9;
      group.add(gumMesh);
      const parts: THREE.BufferGeometry[] = [], tips: THREE.BufferGeometry[] = [];
      const put = (geometry: THREE.BufferGeometry, t: number, width: number, length: number, thick: number, inner = 1, lean = 0) => {
        const at = archPoint(t, inner);
        euler.set(lean, t * 1.8, (random() - 0.5) * 0.12);
        matrix.compose(new THREE.Vector3(at.x, 0.002, at.z), quat.setFromEuler(euler), new THREE.Vector3(width, length, thick));
        parts.push(geometry.clone().applyMatrix4(matrix));
        if (a.colour === 'bloodied' && length > 0.012 && !novelty) {
          matrix.compose(new THREE.Vector3(at.x, 0.002 + length * 0.52, at.z), quat, new THREE.Vector3(width * 0.62, length * 0.5, thick * 0.62));
          tips.push(cone.clone().applyMatrix4(matrix));
        }
      };
      const count = style === 'needle-maw' && !novelty ? 22 : 14;
      for (let i = 0; i < count; i++) {
        const t = ((i + 0.5) / count) * 2 - 1;
        const k = Math.floor(Math.abs(i - (count - 1) / 2));
        const v = 0.85 + random() * 0.3;
        if (novelty) { put(block, t, 0.0052, 0.0105, 0.0032); continue; }
        if (style === 'needle-maw') { put(cone, t, 0.0017, (0.012 + random() * 0.014) * (k > 8 ? 0.5 : 1), 0.0017, 1, (random() - 0.5) * 0.3); continue; }
        if (style === 'shark') {
          put(cone, t, 0.0042, 0.0095 * v, 0.0018);
          if (i % 2 === 0) put(cone, t + 0.05, 0.0036, 0.0075 * v, 0.0016, 0.78);
          continue;
        }
        if (k <= 1) {
          if (style === 'nosferatu' && upper && k === 0) put(cone, t, 0.0032, 0.024 * v, 0.0028, 1, 0.08);
          else put(block, t, 0.0041, (style === 'nosferatu' ? 0.0055 : 0.0085) * v, 0.0021);
        } else if (k === 2) {
          const long = style === 'classic' ? (upper ? 0.023 : 0.012) : style === 'tusks' ? (upper ? 0.008 : 0) : 0.0085;
          if (long > 0) put(cone, t, 0.0036, long * v, 0.0034);
        } else put(block, t, 0.0044, 0.0066 * v, 0.0042);
      }
      if (style === 'tusks' && !upper && !novelty) {
        for (const side of [-1, 1]) {
          const from = archPoint(side * 0.36);
          const tusk = taperTube([[from.x, 0.001, from.z], [from.x + side * 0.006, 0.014, from.z + 0.006], [from.x + side * 0.013, 0.03, from.z + 0.004], [from.x + side * 0.014, 0.046, from.z - 0.004]], (t) => 0.0052 * (1 - t * 0.9), 14, 7);
          parts.push(tusk.toNonIndexed());
        }
      }
      const flat = parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; });
      const teeth = new THREE.Mesh(mergeGeometries(flat), tooth);
      group.add(teeth);
      if (tips.length) {
        const t2 = tips.map((g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n; });
        group.add(new THREE.Mesh(mergeGeometries(t2), blood));
      }
      group.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      return group;
    };

    const chatterers: { hinge: THREE.Group; key: THREE.Object3D; phase: number; rest: number }[] = [];
    const denture = (style: Style, open: number, mode: 'gum' | 'plaster' | 'novelty') => {
      const set = new THREE.Group();
      const novelty = mode === 'novelty';
      const lift = mode === 'plaster' ? 0.016 : novelty ? 0.012 : 0.005;
      const lower = jaw(style, false, novelty);
      lower.position.y = lift;
      set.add(lower);
      const hinge = new THREE.Group();
      hinge.position.set(0, lift + 0.011, -0.036);
      const upper = jaw(style, true, novelty);
      upper.rotation.z = Math.PI;
      upper.position.set(0, 0.011, 0.036);
      hinge.add(upper);
      hinge.rotation.x = -open;
      set.add(hinge);
      if (mode === 'gum' && style !== 'tusks') {
        const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gum);
        palate.scale.set(0.024, 0.008, 0.028);
        palate.position.set(0, 0.011, 0.036 - 0.01);
        hinge.add(palate);
      }
      if (mode === 'plaster') {
        const puck = new THREE.CylinderGeometry(0.035, 0.037, 0.014, 7);
        const low = new THREE.Mesh(puck, plaster); low.position.set(0, 0.007, -0.002); low.scale.z = 1.12;
        const top = new THREE.Mesh(puck, plaster); top.position.set(0, 0.011 + 0.012, 0.034); top.scale.z = 1.12;
        hinge.add(top); set.add(low);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 6), steel); post.position.set(0, 0.03, -0.042); set.add(post);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6), steel); bar.rotation.z = Math.PI / 2; bar.position.set(0, lift + 0.011, -0.04); set.add(bar);
      }
      if (novelty) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.03), noveltyGum); body.position.set(0, 0.014, -0.014); set.add(body);
        for (const side of [-1, 1]) {
          const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), brass);
          foot.scale.set(0.011, 0.005, 0.017); foot.position.set(side * 0.017, 0.005, 0.012); set.add(foot);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 6), brass); leg.position.set(side * 0.017, 0.009, 0); set.add(leg);
        }
        const key = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.022, 6), brass); stem.rotation.z = Math.PI / 2; stem.position.x = 0.011;
        const wingA = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0018, 5, 14), brass); wingA.position.set(0.024, 0.007, 0); wingA.rotation.y = Math.PI / 2;
        const wingB = wingA.clone(); wingB.position.y = -0.007;
        key.add(stem, wingA, wingB);
        key.position.set(0.016, 0.016, -0.016);
        set.add(key);
        chatterers.push({ hinge, key, phase: random() * 6, rest: open });
      }
      set.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      return set;
    };

    // Tray with a paper liner printed with slot outlines.
    const W = 0.42, D = 0.28, rim = 0.016;
    const cols = [-0.165, -0.085, -0.005, 0.075];
    const order: [number, number][] = [[1, 0.045], [2, 0.045], [0, 0.045], [3, 0.045], [1, -0.065], [2, -0.065], [0, -0.065], [3, -0.065]];
    const n = Math.round(mix(2, 8, a.sets));
    const hasMissing = a.missing !== 'no';
    s.box([W, 0.004, D], [0, 0.002, 0], steel);
    for (const [sx, sz, x, z] of [[W, 0.008, 0, D / 2 - 0.004], [W, 0.008, 0, -D / 2 + 0.004], [0.008, D, W / 2 - 0.004, 0], [0.008, D, -W / 2 + 0.004, 0]] as const) s.box([sx, rim, sz], [x, rim / 2, z], steel);
    for (const side of [-1, 1]) s.box([0.012, 0.004, 0.09], [side * (W / 2 + 0.004), rim - 0.002, 0], steel);
    const liner = painted(840, 560, (ctx, w, h) => {
      ctx.fillStyle = mood.wear > 0.6 ? '#b9cdd0' : '#c7e1e6';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + random() * 0.1})`; ctx.fillRect(random() * w, random() * h, 30, 2); }
      const stains = Math.round(mood.wear * 9);
      for (let i = 0; i < stains; i++) { ctx.strokeStyle = 'rgba(120,90,50,0.28)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(random() * w, random() * h, 22 + random() * 36, 0, 7); ctx.stroke(); }
      ctx.setLineDash([10, 8]); ctx.strokeStyle = '#4f7f8c'; ctx.lineWidth = 3;
      for (const [c, z] of order) {
        const px = (cols[c] / W + 0.5) * w, pz = (z / D + 0.5) * h;
        ctx.strokeRect(px - 72, pz - 78, 144, 150);
      }
      if (a.colour === 'bloodied') {
        ctx.fillStyle = '#8f0d16';
        for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * random() * 22, 0, 7); ctx.fill(); }
      }
    });
    const paper = s.mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), new THREE.MeshStandardMaterial({ map: liner, roughness: 0.9 }), [0, 0.0048, 0]);
    paper.rotation.x = -Math.PI / 2;

    const styles = Object.keys(STYLES) as Style[];
    const used = [...NAMES];
    const noveltyAt = a.novelty ? Math.min(n - 1, 1 + Math.floor(random() * Math.max(1, n - 1))) : -1;
    const missingAt = hasMissing ? (n >= 8 ? 7 : n) : -1;
    for (let i = 0; i < Math.min(8, n + (hasMissing && n < 8 ? 1 : 0)); i++) {
      const [c, z] = order[i];
      const x = cols[c];
      const labelZ = z + 0.058;
      if (i === missingAt) {
        const lost = a.missing === 'lost';
        const note = s.label(lost ? '?' : 'ON SET', 0.05, 0.034, [x, 0.0056, z], lost ? '#c22' : '#223', '#fff4a8');
        note.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.5);
        continue;
      }
      const featured = i === 0;
      const novelty = i === noveltyAt && !featured;
      const style = featured ? a.featured : pick(styles, random);
      const mode = novelty ? 'novelty' : featured ? (a.featuredBase === 'articulator' ? 'plaster' : 'gum') : random() < 0.3 ? 'plaster' : 'gum';
      const open = novelty ? 0.5 : featured ? (a.featuredBase === 'closed' ? 0.04 : 0.75) : mix(0.08, 0.6, random());
      const set = denture(style, open, mode);
      set.position.set(x + (random() - 0.5) * 0.008, 0.005, z + 0.006);
      set.rotation.y = (random() - 0.5) * (featured ? 0.1 : 0.5);
      set.scale.setScalar(featured ? 1.3 : novelty ? 1.1 : 1);
      s.root.add(set);
      if (a.labels !== 'none') {
        const name = a.labels === 'tape' ? used.splice(Math.floor(random() * used.length), 1)[0] : `No. ${i + 1 + Math.floor(random() * 3) * 10}`;
        const label = s.label(novelty && a.labels === 'tape' ? 'HA HA' : name, a.labels === 'tape' ? 0.066 : 0.04, 0.016, [x, 0.0058, labelZ + (featured ? 0.006 : 0)], '#2a2a33', a.labels === 'tape' ? '#e9d9a6' : '#ffffff');
        label.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.2);
      }
    }

    // Side strip of tools.
    const tx = 0.165;
    const mirror = (z: number, turn: number) => {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.13, 8), steel); handle.rotation.x = Math.PI / 2;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 16), steel); disc.position.set(0, 0.004, -0.074); disc.rotation.x = 0.4;
      g.add(handle, disc); g.position.set(tx, 0.009, z); g.rotation.y = turn;
      g.traverse((o) => { o.castShadow = true; });
      s.root.add(g);
    };
    if (a.tools === 'dental' || a.tools === 'mixing') mirror(0.02, 0.12 + (random() - 0.5) * 0.3);
    if (a.tools === 'dental') {
      s.mesh(taperTube([[tx - 0.022, 0.008, 0.09], [tx - 0.02, 0.008, -0.02], [tx - 0.019, 0.008, -0.05], [tx - 0.012, 0.012, -0.062]], (t) => 0.0028 * (1 - t * 0.85), 16, 6), steel);
    }
    if (a.tools === 'mixing') {
      s.lathe([[0, 0.005], [0.022, 0.005], [0.027, 0.04], [0.025, 0.04], [0.02, 0.009], [0, 0.009]], s.material('#3f8fb0', { roughness: 0.4 }), [tx - 0.005, 0, -0.085]);
      s.cylinder(0.023, 0.02, 0.022, [tx - 0.005, 0.02, -0.085], gum, 16);
      s.rod([tx - 0.005, 0.02, -0.085], [tx + 0.02, 0.075, -0.06], 0.0022, steel);
    }
    if (a.tools === 'loose' || mood.density > 0.7) {
      const loose = Math.round(mix(4, 16, mood.density));
      for (let i = 0; i < loose; i++) {
        const f = s.mesh(cone, tooth, [tx - 0.03 + random() * 0.05, 0.0075, -0.11 + random() * 0.22]);
        f.scale.set(0.0032, 0.014 + random() * 0.008, 0.0032);
        f.rotation.set(Math.PI / 2, 0, random() * 6.28);
      }
    }

    const speed = mix(6, 34, mood.energy), swing = mix(0.12, 0.5, mood.energy);
    return s.finish({
      update: chatterers.length ? (dt, time) => {
        for (const c of chatterers) {
          c.hinge.rotation.x = -Math.abs(Math.sin(time * speed + c.phase)) * swing - 0.03;
          c.key.rotation.x += dt * speed * 0.4;
        }
      } : undefined,
    });
  },
});

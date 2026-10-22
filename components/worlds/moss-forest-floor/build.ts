import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';
import { Bag, type V3, aim, at, ball, lumpy, painted, taper, water } from './bits';

const W = 14, D = 11;
const WEATHER = {
  dappled: { back: '#dfe7cd', hemi: 1.25, key: 3.0, text: 'Dappled green sunlight: bright flecks on the moss and pale shafts slanting down between the trunks.' },
  fog: { back: '#dfe5e3', hemi: 1.75, key: 1.5, text: 'Cold white fog: everything pale and flat, the trunks dissolving into nothing.' },
  rain: { back: '#cdd6c8', hemi: 1.2, key: 2.0, text: 'Just after rain: dark soaked ground, puddles, every shoot carrying a bead of water.' },
  overcast: { back: '#e2e3d8', hemi: 1.55, key: 2.1, text: 'An even grey-green overcast, soft and shadowless, a quiet ordinary day.' },
  dusk: { back: '#b3c0b4', hemi: 0.95, key: 1.7, text: 'Blue-green dusk with small fungi beginning to glow among the moss.' },
} as const;
type Weather = keyof typeof WEATHER;
const STAGES = {
  stump: 'The top of a rotting stump: soft wood with growth rings and cracks showing between the moss.',
  humus: 'Open forest floor: dark crumbly humus scattered with leaf fragments.',
  paving: 'A temple garden path: old grey flagstones with moss filling every joint.',
  roots: 'A hollow between great tree roots that cross the ground like fallen walls.',
} as const;
const MOSSES = {
  star: 'Star moss: upright shoots like a plantation of tiny conifers.',
  cushion: 'Smooth rounded pincushion hills, pale and velvety.',
  feather: 'A flat ferny feather-moss mat.',
  mixed: 'A patchwork of all of them.',
} as const;
const LITTER = {
  oak: 'Brown lobed oak leaves.',
  maple: 'Red and orange maple leaves, sharp-pointed.',
  beech: 'Copper oval beech leaves with straight ribs.',
  ginkgo: 'Yellow ginkgo fans.',
  pine: 'Pine needles lying like felled trunks, and a pine cone the size of a house.',
} as const;
const TRUNKS = {
  cedar: 'Straight red-brown cedar trunks.',
  birch: 'White birch trunks with dark eyes.',
  bamboo: 'Green jointed bamboo culms.',
  mossy: 'Dark old trunks furred green with moss.',
  none: 'Nothing: open pale sky behind.',
} as const;
const SPORES = {
  none: 'No stalks at all, only the moss.',
  capped: 'A young green stand, every capsule still under its pointed hood.',
  ripe: 'Red stalks with fat orange capsules nodding.',
  spent: 'Dark, dry, empty capsules on brown stalks.',
} as const;
const RELICS = {
  none: 'Nothing: only the forest.',
  feather: 'A dropped feather lying across the moss like a fallen tree.',
  mushrooms: 'A troop of thin-stemmed mushrooms towering like parasols.',
  marble: 'A lost glass marble, half buried, huge as a boulder.',
  coin: 'An old temple offering coin with a square hole, leaning half sunk in the moss.',
  shell: 'An empty snail shell, a spiral ruin.',
} as const;
const VIEWS = {
  ant: { pitch: 13, text: 'Ant height: almost level with the ground, everything looming.' },
  crouch: { pitch: 24, text: 'A crouching child\'s view, looking slightly down.' },
  above: { pitch: 40, text: 'A naturalist bending over it, looking down into the scene.' },
} as const;
type View = keyof typeof VIEWS;
const texts = <K extends string>(table: Record<K, { text: string }>) => Object.fromEntries(Object.entries<{ text: string }>(table).map(([key, value]) => [key, value.text])) as Record<K, string>;

function shootGeometry(form: 'star' | 'cushion' | 'feather') {
  const parts: THREE.BufferGeometry[] = [];
  const ring = (count: number, length: number, width: number, y: number, tilt: number, phase: number) => {
    for (let i = 0; i < count; i++) {
      const g = new THREE.ConeGeometry(width, length, 2, 1, true);
      g.rotateY(Math.PI / 2);
      g.translate(0, length / 2, 0);
      g.rotateX(tilt);
      g.rotateY(phase + (i / count) * Math.PI * 2);
      g.translate(0, y, 0);
      parts.push(g);
    }
  };
  if (form === 'star') { ring(4, 0.5, 0.09, 0.1, 1.25, 0); ring(4, 0.48, 0.09, 0.4, 1.05, 0.8); ring(4, 0.4, 0.08, 0.68, 0.75, 0.2); ring(1, 0.36, 0.08, 0.78, 0, 0); ring(1, 0.85, 0.07, 0, 0, 0); }
  else if (form === 'cushion') { ring(4, 1, 0.14, 0, 0.32, 0); ring(2, 1.1, 0.13, 0, 0.1, 0.7); }
  else { for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { const g = new THREE.ConeGeometry(0.08, 0.44 - i * 0.05, 2, 1, true); g.translate(0, 0.22 - i * 0.025, 0); g.rotateZ(side * 1.05); g.translate(0, 0.1 + i * 0.18, 0); parts.push(g); } ring(1, 1.1, 0.06, 0, 0, 0); }
  const merged = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return merged;
}

export default defineWorld({
  questions: {
    weather: choice('What is the light and weather down here?', texts(WEATHER)),
    stage: choice('What is the moss growing over?', STAGES),
    moss: choice('What kind of moss carpets it?', MOSSES),
    spores: choice('Is there a forest of spore stalks standing over the moss?', SPORES),
    litter: choice('What leaf litter rears up around the edges like cliffs?', LITTER),
    trunks: choice('What stands, huge and out of focus, in the distance?', TRUNKS),
    relic: choice('What has been dropped or left here, giant at this scale?', RELICS),
    view: choice('From how low do we see it?', texts(VIEWS)),
    depth: score('How deep and overgrown is the moss?', ['A thin young film', 'A good carpet', 'Deep ancient hummocks swallowing everything']),
  },

  build(a, context) {
    const { mood, random } = context;
    const weather = WEATHER[a.weather];
    const yawDegrees = 22, yaw = (yawDegrees * Math.PI) / 180;
    const slots: [number, number, number?, number?][] = [[0, 1.3], [-3.9, -0.7], [3.9, -0.5], [-3.3, 3.5, 0, 0.8], [3.5, 3.6, 0, 0.8], [0.4, -3.1, 0, 0.9]];
    const wetness = a.weather === 'rain' ? 1 : a.weather === 'fog' ? 0.4 : 0;
    const soil = new THREE.Color('#4a3828').lerp(new THREE.Color('#2a2019'), wetness * 0.6);
    const { art, world } = diorama(context, { background: weather.back, floor: '#' + soil.getHexString(), width: W, depth: D, maxHeight: 3.5, radius: 1.9, pitch: VIEWS[a.view as View].pitch, yaw: yawDegrees, slots });
    const root = art.root, back = new THREE.Color(weather.back);
    for (const child of root.children) {
      const light = child as THREE.Light;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = weather.hemi; (light as THREE.HemisphereLight).groundColor.set(a.weather === 'dusk' ? '#3f5a52' : '#6f7a58'); if (a.weather === 'dusk') light.color.set('#cfe0f0'); }
      else if ((light as THREE.DirectionalLight).isDirectionalLight && light.castShadow) { light.intensity = weather.key; if (a.weather === 'dappled') light.color.lerp(new THREE.Color('#f4f7c0'), 0.4); }
    }
    const bag = new Bag();
    const matte = art.material('#ffffff', { roughness: 0.95 });
    const sided = art.material('#ffffff', { roughness: 0.85, side: THREE.DoubleSide });
    const sheen = art.material('#ffffff', { roughness: 0.3 });
    const nearSlot = (x: number, z: number) => Math.min(...slots.map(([sx, sz]) => Math.hypot(x - sx, z - sz)));

    // Sun flecks: where the canopy lets light through. The hero always stands in one.
    const flecks: { x: number; z: number; r: number }[] = [];
    if (a.weather === 'dappled') {
      flecks.push({ x: 0.3, z: 1.6, r: 2.6 });
      for (let i = 0; i < 6 + Math.round(mood.cheer * 5); i++) flecks.push({ x: (random() - 0.5) * W, z: (random() - 0.5) * D, r: 0.8 + random() * 1.5 });
    }
    const sun = (x: number, z: number) => flecks.reduce((best, f) => Math.max(best, clamp01(1.25 - Math.hypot(x - f.x, (z - f.z) * 1.3) / f.r)), 0);

    // Hummocks: the terrain of the moss, kept clear of where the cast stands.
    const depth = clamp01(a.depth * 0.8 + mood.density * 0.2);
    const mounds: { x: number; z: number; r: number; h: number }[] = [];
    for (const [x, z] of [[-5.3, -3.9], [-2.3, -4.2], [1.9, -4.1], [5.2, -3.7], [-5.9, 1.2], [6, 1.6], [-5.8, 4.2], [5.9, 4.3], [0.2, 4.5], [-1.8, -1.3], [2.3, 1.9]]) {
      const mx = x + (random() - 0.5) * 0.8, mz = z + (random() - 0.5) * 0.6, clear = nearSlot(mx, mz);
      const r = Math.min(mix(1.2, 2.6, random()) * mix(0.75, 1.15, depth), clear - 1.25, W / 2 - Math.abs(mx) + 0.2, D / 2 - Math.abs(mz) + 0.2);
      if (r > 0.6) mounds.push({ x: mx, z: mz, r, h: r * mix(0.25, 0.62, depth) * mix(0.7, 1.1, random()) });
    }
    const height = (x: number, z: number) => mounds.reduce((best, m) => { const d = Math.hypot(x - m.x, z - m.z) / m.r; return d < 1 ? Math.max(best, m.h * Math.sqrt(1 - d * d)) : best; }, 0);

    const dry = clamp01(mood.wear * 0.7);
    const green = new THREE.Color().setHSL(mix(0.34, 0.23, mood.warmth), mix(0.36, 0.66, mood.cheer), 0.35).lerp(new THREE.Color('#8a7438'), dry * 0.45);
    if (a.weather === 'fog') green.lerp(back, 0.18);
    if (a.weather === 'dusk') green.offsetHSL(0.05, -0.05, -0.05);
    const sunny = new THREE.Color('#dfe86a');
    for (const m of mounds) bag.add(matte, lumpy(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0.07, 2.3, m.x), at([m.x, -0.02, m.z], [0, random() * 3, 0], [m.r, m.h * 0.96, m.r]), green.clone().multiplyScalar(0.45));

    // The ground itself, painted.
    const ground = painted(1024, 800, (ctx, w, h) => {
      const px = (x: number) => ((x + W / 2) / W) * w, pz = (z: number) => ((z + D / 2) / D) * h;
      ctx.fillStyle = '#' + soil.getHexString();
      ctx.fillRect(0, 0, w, h);
      if (a.stage === 'stump') {
        ctx.fillStyle = wetness ? '#6b5237' : '#927451';
        ctx.fillRect(0, 0, w, h);
        const cx = w * 0.46, cy = h * 0.55;
        for (let r = 10; r < w; r += 9 + random() * 12) {
          ctx.strokeStyle = random() < 0.5 ? 'rgba(60,38,20,0.5)' : 'rgba(190,160,115,0.4)';
          ctx.lineWidth = 2 + random() * 5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.86, 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#231710';
        for (let i = 0; i < 12; i++) {
          const t = random() * 6.3, r0 = 20 + random() * 120, r1 = r0 + 150 + random() * 500;
          ctx.lineWidth = 2 + random() * 6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0);
          ctx.lineTo(cx + Math.cos(t + 0.05) * r1, cy + Math.sin(t + 0.05) * r1);
          ctx.stroke();
        }
        for (let i = 0; i < 22; i++) { ctx.fillStyle = `rgba(35,22,14,${0.2 + random() * 0.35})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 70, 14 + random() * 40, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.stage === 'paving') {
        ctx.fillStyle = wetness ? '#62686a' : '#8f9492';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '40,45,48' : '200,205,200'},${random() * 0.12})`; ctx.fillRect(random() * w, random() * h, 2 + random() * 14, 2 + random() * 10); }
        ctx.strokeStyle = '#' + green.clone().multiplyScalar(0.75).getHexString();
        ctx.lineWidth = 16;
        for (const z of [-3.2, 0.1, 3.3]) { ctx.beginPath(); ctx.moveTo(0, pz(z)); ctx.lineTo(w, pz(z + 0.3)); ctx.stroke(); }
        for (const [x, z0, z1] of [[-4.6, -5.5, -3.1], [1.3, -5.5, -3.1], [-1.7, -3.1, 0.2], [4.9, -3.1, 0.2], [-5.2, 0.2, 3.4], [0.9, 0.2, 3.4], [-2.6, 3.4, 5.5], [3.9, 3.4, 5.5]]) { ctx.beginPath(); ctx.moveTo(px(x), pz(z0)); ctx.lineTo(px(x + 0.15), pz(z1)); ctx.stroke(); }
      } else {
        for (let i = 0; i < 1400; i++) { ctx.fillStyle = random() < 0.25 ? `rgba(150,110,60,${0.15 + random() * 0.3})` : `rgba(15,10,6,${random() * 0.3})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 2 + random() * 9, 2 + random() * 5, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      }
      // Moss stain under the shoots, so gaps in the carpet read green and not bare.
      for (let i = 0; i < 260 * mix(0.4, 1, depth); i++) {
        const x = (random() - 0.5) * W, z = (random() - 0.5) * D;
        if (a.stage === 'paving' && random() < 0.75) continue;
        ctx.fillStyle = `rgba(${Math.round(green.r * 200)},${Math.round(green.g * 255)},${Math.round(green.b * 200)},${0.25 + random() * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(px(x), pz(z), 16 + random() * 46, 12 + random() * 30, random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.weather === 'rain') for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(150,175,180,0.55)'; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 30 + random() * 60, 16 + random() * 30, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      for (const f of flecks) {
        const g = ctx.createRadialGradient(px(f.x), pz(f.z), 0, px(f.x), pz(f.z), (f.r / W) * w);
        g.addColorStop(0, 'rgba(255,250,170,0.6)');
        g.addColorStop(0.6, 'rgba(255,250,170,0.28)');
        g.addColorStop(1, 'rgba(255,250,170,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ground, roughness: mix(0.95, 0.45, wetness) }));
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = 0.012;
    sheet.receiveShadow = true;
    root.add(sheet);
    // A crumbling rim so the stage is a place and not a slab.
    for (let i = 0; i < 46; i++) {
      const along = random() * (W + D) * 2, side = along < W ? 0 : along < W + D ? 1 : along < 2 * W + D ? 2 : 3;
      const u = side === 0 ? along : side === 1 ? along - W : side === 2 ? along - W - D : along - 2 * W - D;
      const x = side === 0 || side === 2 ? u - W / 2 : side === 1 ? W / 2 : -W / 2, z = side === 0 ? -D / 2 : side === 2 ? D / 2 : u - D / 2;
      bag.add(matte, new THREE.DodecahedronGeometry(0.25 + random() * 0.45), at([x, -0.05 + random() * 0.15, z], [random() * 3, random() * 3, 0], [1.4, 0.8, 1.4]), a.stage === 'paving' ? '#7d8280' : a.stage === 'stump' ? '#5a4330' : '#3a2b1f');
    }
    if (a.stage === 'roots') {
      const bark = new THREE.Color('#5a4433');
      for (const path of [[[-7.4, 0.9, -3.2], [-6.3, 0.75, 0.4], [-6.9, 0.35, 3.4], [-7.6, 0.1, 5.4]], [[7.5, 1.1, -4.6], [6.4, 0.8, -1.2], [6.9, 0.45, 2.2], [7.4, 0.1, 5.2]], [[-7.2, 1.3, -4.9], [-3, 0.9, -5.2], [1.5, 0.7, -5], [7.3, 1.1, -5.3]]] as V3[][])
        bag.add(matte, lumpy(taper(path, (t) => mix(1.25, 0.6, t), 16, 9), 0.05, 0.6, path[0][0]), undefined, bark.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06));
    }

    // The moss carpet.
    const forms: ('star' | 'cushion' | 'feather')[] = a.moss === 'mixed' ? ['star', 'cushion', 'feather'] : [a.moss];
    const total = Math.round(mix(1100, 2600, depth) * (a.stage === 'paving' ? 0.75 : 1));
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), tint = new THREE.Color(), beads: V3[] = [];
    forms.forEach((form, which) => {
      const count = Math.round(total / forms.length);
      const carpet = new THREE.InstancedMesh(shootGeometry(form), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: mix(0.85, 0.5, wetness), side: THREE.DoubleSide }), count);
      const base = { star: 0.95, cushion: 0.42, feather: 0.85 }[form] * mix(0.7, 1.25, depth);
      const tone = green.clone().offsetHSL(0, form === 'cushion' ? -0.12 : 0, form === 'cushion' ? 0.14 : form === 'feather' ? 0.03 : 0);
      const patch = random() * 9;
      for (let i = 0; i < count; i++) {
        let x = 0, z = 0, tries = 0;
        do {
          x = (random() - 0.5) * (W - 0.2); z = (random() - 0.5) * (D - 0.2);
          const inPatch = forms.length === 1 || Math.sin(x * 0.7 + patch + which * 2.1) * Math.cos(z * 0.8 + patch * 1.3 + which) > -0.25;
          const onJoint = a.stage !== 'paving' || height(x, z) > 0 || Math.abs(((z + 6.3) % 3.3) - 0.2) < 0.5 || random() < 0.2;
          if (inPatch && onJoint) break;
        } while (tries++ < 6);
        const clear = nearSlot(x, z), y = height(x, z);
        const lawn = clamp01((clear - 0.7) / 1.7), size = base * mix(0.22, 1, lawn) * mix(0.65, 1.3, random()) * (y > 0 ? 1.1 : 1);
        dummy.position.set(x, y - 0.03, z);
        const lean = form === 'feather' ? 1.05 : 0.3;
        dummy.quaternion.setFromUnitVectors(up, new THREE.Vector3((random() - 0.5) * lean, 1, (random() - 0.5) * lean).normalize());
        dummy.rotateY(random() * 6.3);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        carpet.setMatrixAt(i, dummy.matrix);
        tint.copy(tone).offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.14).lerp(sunny, sun(x, z) * 0.55);
        if (random() < dry * 0.4) tint.lerp(new THREE.Color('#a8853f'), 0.6);
        carpet.setColorAt(i, tint);
        if (wetness === 1 && random() < 0.05 && beads.length < 90) beads.push([x, y + size * (form === 'feather' ? 0.35 : 0.8), z]);
      }
      carpet.instanceMatrix.needsUpdate = true;
      if (carpet.instanceColor) carpet.instanceColor.needsUpdate = true;
      carpet.receiveShadow = true;
      root.add(carpet);
    });

    // The spore-stalk forest: on the hummocks and along the back, never in front of the cast.
    const forest = new THREE.Group(), trees = new Bag();
    root.add(forest);
    if (a.spores !== 'none') {
      const wire = art.material('#ffffff', { roughness: 0.5, emissive: a.spores === 'ripe' ? '#6a0c06' : '#000000', emissiveIntensity: 0.5 });
      const stalkColour = new THREE.Color({ capped: '#b9c860', ripe: '#d4321f', spent: '#6a4a34' }[a.spores]);
      const capsuleColour = new THREE.Color({ capped: '#8fae42', ripe: '#d07e2c', spent: '#4a3526' }[a.spores]);
      const profile = [[0.03, 0], [0.16, 0.06], [0.28, 0.28], [0.3, 0.6], [0.24, 0.86], [0.17, 1]].map(([x, y]) => new THREE.Vector2(x, y));
      const count = Math.round(mix(14, 64, mood.density) * mix(0.7, 1.2, depth));
      for (let i = 0; i < count; i++) {
        let x = 0, z = 0;
        if (mounds.length && random() < 0.7) { const m = mounds[Math.floor(random() * mounds.length)], t = random() * 6.3, r = Math.sqrt(random()) * m.r * 0.75; x = m.x + Math.cos(t) * r; z = m.z + Math.sin(t) * r; }
        else { x = (random() - 0.5) * W * 0.96; z = -D / 2 + random() * 1.6; }
        if (nearSlot(x, z) < 1.9 || (z > 2.2 && Math.abs(x) < 5.4)) continue;
        const y = height(x, z), H = mix(2.2, 4.6, random()) * mix(0.75, 1.1, depth) * (z > 3 ? 0.55 : 1), lx = (random() - 0.5) * 0.5, lz = (random() - 0.5) * 0.5;
        const top: V3 = [x + lx * H * 0.35, y + H, z + lz * H * 0.35], nod = a.spores !== 'capped';
        const path: V3[] = [[x, y, z], [x + lx * H * 0.1, y + H * 0.5, z + lz * H * 0.1], top];
        const hang: V3 = nod ? [top[0] + lx * 0.5 + 0.18, top[1] - 0.1, top[2] + lz * 0.5] : top;
        if (nod) path.push([top[0] + lx * 0.25 + 0.09, top[1] + 0.07, top[2] + lz * 0.25], hang);
        trees.add(wire, taper(path, (t) => mix(0.05, 0.03, t), 12, 5), undefined, stalkColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08));
        const L = 0.5 + random() * 0.2, end: V3 = nod ? [hang[0] + lx * 0.4 + 0.1, hang[1] - L * 0.8, hang[2] + lz * 0.4] : [hang[0] + lx * 0.1, hang[1] + L, hang[2] + lz * 0.1];
        trees.add(sheen, new THREE.LatheGeometry(profile, 8), aim(hang, end, [L * (a.spores === 'spent' ? 0.7 : 1), L, L * (a.spores === 'spent' ? 0.7 : 1)]), capsuleColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08));
        if (a.spores === 'capped') trees.add(matte, new THREE.ConeGeometry(0.34, 1.25, 7), aim(hang, end, L).multiply(at([0, 1.05, 0])), '#e3d6a0');
        if (a.spores === 'ripe') trees.add(sheen, new THREE.ConeGeometry(0.2, 0.36, 7), aim(hang, end, L).multiply(at([0, 1.16, 0])), '#a82c18');
      }
    }
    trees.flush(forest);

    // Leaf litter: huge dead leaves propped up along the back and the left like cliffs.
    const leafTone = { oak: '#8c5e34', maple: '#c0452a', beech: '#b4703a', ginkgo: '#dcc04a', pine: '#a8823a' }[a.litter];
    const halfWidth = (y: number) => a.litter === 'oak'
      ? 0.3 * Math.sin(Math.PI * y ** 0.8) ** 0.8 * (0.5 + 0.5 * Math.abs(Math.sin(4.5 * Math.PI * y))) + 0.015
      : 0.3 * Math.sin(Math.PI * y ** 0.9) ** 0.7 * (1 + 0.05 * Math.sin(46 * y)) + 0.01;
    const outline = () => {
      const shape = new THREE.Shape(), points: [number, number][] = [];
      if (a.litter === 'maple') for (let i = 0; i <= 60; i++) { const t = mix(-2.7, 2.7, i / 60), r = 0.2 + 0.36 * Math.abs(Math.cos(2.5 * t / 2.7 * Math.PI / 2 * 2)) ** 0.7 * (1 - Math.abs(t) * 0.12); points.push([Math.sin(t) * r, 0.42 + Math.cos(t) * r]); }
      else if (a.litter === 'ginkgo') for (let i = 0; i <= 50; i++) { const t = mix(-0.95, 0.95, i / 50), r = 1 - 0.035 * Math.sin(t * 26) - 0.22 * Math.exp(-((t * 9) ** 2)); points.push([Math.sin(t) * r * 0.62, Math.cos(t) * r * 0.9 + 0.05]); }
      else { for (let i = 0; i <= 40; i++) points.push([halfWidth(i / 40), i / 40]); for (let i = 40; i >= 0; i--) points.push([-halfWidth(i / 40) * 0.93, i / 40]); }
      shape.moveTo(0, 0);
      for (const [x, y] of points) shape.lineTo(x, y);
      shape.closePath();
      return shape;
    };
    const addLeaf = (x: number, z: number, size: number, turn: number, lean: number, curl: number) => {
      const bend = (px: number, py: number): V3 => {
        const angle = py * curl, radius = 1 / Math.max(Math.abs(curl), 0.05);
        const y = Math.sin(Math.abs(angle)) * radius, zz = (1 - Math.cos(angle)) * radius * Math.sign(curl || 1) * 0.8;
        return [px * size, y * size, (zz + px * px * 1.2) * size];
      };
      const g = new THREE.ShapeGeometry(outline(), 6), p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const v = bend(p.getX(i), p.getY(i)); p.setXYZ(i, v[0], v[1], v[2]); }
      g.computeVertexNormals();
      const pose = new THREE.Matrix4().makeRotationY(turn).multiply(new THREE.Matrix4().makeRotationX(-lean)).setPosition(x, -0.1, z);
      const colour = new THREE.Color(leafTone).offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.12).lerp(new THREE.Color('#6f6657'), mood.wear * 0.4);
      if (a.weather === 'fog') colour.lerp(back, 0.2);
      bag.add(sided, g, pose, colour);
      const vein = colour.clone().offsetHSL(0, 0, 0.16), fan = a.litter === 'maple' || a.litter === 'ginkgo';
      bag.add(matte, taper([bend(0, -0.12), bend(0, 0.2), bend(0, fan ? 0.42 : 0.98)].map((v) => [v[0], v[1], v[2] + 0.02 * size] as V3), (t) => mix(0.022, 0.008, t) * size, 8, 4), pose, vein);
      const ribs = fan ? (a.litter === 'maple' ? 5 : 11) : 7;
      for (let i = 0; i < ribs; i++) {
        if (fan) {
          const t = mix(a.litter === 'maple' ? -2.1 : -0.85, a.litter === 'maple' ? 2.1 : 0.85, i / (ribs - 1)), reach = a.litter === 'maple' ? 0.5 : 0.8, oy = a.litter === 'maple' ? 0.42 : 0.05;
          bag.add(matte, taper([0.1, 0.55, 1].map((k) => { const v = bend(Math.sin(t) * reach * k * (a.litter === 'ginkgo' ? 0.62 : 1), oy + Math.cos(t) * reach * k); return [v[0], v[1], v[2] + 0.02 * size] as V3; }), () => 0.007 * size, 6, 4), pose, vein);
        } else for (const side of [-1, 1]) {
          const y0 = (i + 0.6) / (ribs + 0.6);
          bag.add(matte, taper([0, 0.5, 0.95].map((k) => { const v = bend(side * halfWidth(Math.min(1, y0 + 0.1 * k)) * k * 0.92, y0 + 0.1 * k); return [v[0], v[1], v[2] + 0.02 * size] as V3; }), () => 0.006 * size, 5, 4), pose, vein);
        }
      }
    };
    const leafCount = Math.round(mix(3, 6, mood.density));
    if (a.litter === 'pine') {
      const needle = new THREE.Color(leafTone).lerp(new THREE.Color('#6f6657'), mood.wear * 0.4);
      for (let i = 0; i < 5 + leafCount; i++) {
        const x = (random() - 0.5) * W * 0.9, z = -D / 2 + 0.3 + random() * 1.4, t = (random() - 0.5) * 1.4, len = 5 + random() * 4, rise = random() * 2.2;
        for (const side of [-1, 1]) bag.add(sheen, taper([[x - Math.cos(t) * len / 2, 0.1, z + Math.sin(t) * 0.8], [x, 0.15 + rise * 0.5 + side * 0.05, z + side * 0.12], [x + Math.cos(t) * len / 2, 0.1 + rise, z - Math.sin(t) * 0.8 + side * 0.3]], (u) => mix(0.11, 0.05, u), 10, 5), undefined, needle.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
      // The cone: a boulder of overlapping scales.
      const cx = -5.3, cz = -3.6, cone = new THREE.Color('#7a5638');
      bag.add(matte, ball(1, 14), at([cx, 1.25, cz], [0.5, 0.3, 0.9], [1.25, 2, 1.25]), cone.clone().multiplyScalar(0.6));
      for (let ring = 0; ring < 8; ring++) for (let k = 0; k < 9; k++) {
        const v = (ring + 0.5) / 8, t = (k / 9) * Math.PI * 2 + ring * 0.35, r = 1.25 * Math.sin(v * Math.PI) ** 0.7, yy = mix(-1.9, 1.9, v);
        const local = at([Math.cos(t) * r, yy, Math.sin(t) * r], [0.5 * Math.sin(t), -t, -0.9 * Math.cos(t) - 0.2 * Math.sign(Math.cos(t))], [0.62, 0.2, 0.5]);
        bag.add(matte, new THREE.CylinderGeometry(0.7, 1, 1, 5), at([cx, 1.25, cz], [0.5, 0.3, 0.9]).multiply(local), cone.clone().offsetHSL(0, 0, (random() - 0.4) * 0.12));
      }
    } else {
      const spots: [number, number, number][] = [[-4.6, -5.1, 0.25], [1.2, -5.3, -0.1], [5.3, -4.9, -0.45], [-6.9, -1.6, 1.15], [-6.8, 2.9, 1.3], [6.9, 0.5, -1.2]];
      for (let i = 0; i < Math.min(leafCount, spots.length); i++) {
        const [x, z, turn] = spots[i];
        addLeaf(x + (random() - 0.5), z, mix(6, 8.5, random()) * (i > 2 ? 0.72 : 1), turn + (random() - 0.5) * 0.5, mix(0.2, 0.75, random()), mix(-0.5, 1.2, random()));
      }
      // Fragments lying flat on the floor.
      for (let i = 0; i < 4 + Math.round(mood.wear * 6); i++) {
        const x = (random() - 0.5) * W * 0.95, z = (random() - 0.5) * D * 0.95;
        if (nearSlot(x, z) > 1.6) addLeaf(x, z, 1.2 + random() * 1.4, random() * 6.3, 1.45, mix(0.2, 0.9, random()));
      }
    }

    // Whatever was dropped here.
    const relicAt: V3 = [4.9, 0, -3.3];
    if (a.relic === 'feather') {
      const vane = new THREE.Color(mood.cheer > 0.6 ? '#f1ede2' : '#aab0b4'), from: V3 = [6.6, 0.25, -4.2], to: V3 = [-3.2, 1.5 + height(-3.2, -3.9), -3.9];
      bag.add(sheen, taper([from, [1.7, 1.3, -3.7], to], (t) => mix(0.12, 0.03, t), 14, 6), undefined, '#f4f0e6');
      for (const side of [-1, 1]) {
        const g = new THREE.PlaneGeometry(8.4, 1.25, 18, 3), p = g.getAttribute('position');
        for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 8.4 + 0.5, y = p.getY(i) / 1.25 + 0.5; p.setXYZ(i, mix(5.6, -3.2, x) + y * 0.5, mix(0.45, 1.5, x) + Math.sin(x * Math.PI) * 0.6 + y * side * 0.1 - y * y * 0.25, -4.1 + x * 0.25 + side * y * 1.2 * Math.sin(Math.min(1, x * 1.15) * Math.PI) ** 0.6 + (i % 3) * 0.015); }
        g.computeVertexNormals();
        bag.add(sided, g, undefined, vane.clone().offsetHSL(0, 0, side * 0.03));
      }
    } else if (a.relic === 'mushrooms') {
      const cap = new THREE.Color('#c79a62').lerp(new THREE.Color('#e9dcc2'), mood.cheer * 0.5);
      for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
        const x = relicAt[0] + (random() - 0.5) * 3.4, z = relicAt[2] + (random() - 0.6) * 2.4, H = 2.4 + random() * 2.6, lean = (random() - 0.5) * 0.9, r = 0.55 + random() * 0.45;
        bag.add(matte, taper([[x, 0, z], [x + lean * 0.3, H * 0.5, z], [x + lean, H, z]], (t) => mix(0.11, 0.07, t), 10, 6), undefined, '#ece3cf');
        bag.add(sheen, new THREE.LatheGeometry([[0.02, 0.5], [0.5, 0.42], [0.9, 0.12], [1, -0.08], [0.9, -0.1], [0.1, 0]].map(([px, py]) => new THREE.Vector2(px * r, py * r)), 14), at([x + lean, H, z], [0, 0, -lean * 0.3]), cap.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    } else if (a.relic === 'marble') {
      const swirl = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#7fc1c9';
        ctx.fillRect(0, 0, w, h);
        for (const [colour, phase] of [['#f4f1e4', 0], ['#2e5fa8', 1.4], ['#d94f3a', 2.9]] as const) { ctx.strokeStyle = colour; ctx.lineWidth = 12; ctx.beginPath(); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h / 2 + Math.sin(x / 26 + phase) * h * 0.3); ctx.stroke(); }
      });
      const marble = new THREE.Mesh(ball(1.45, 28), new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.06, metalness: 0.15, emissive: '#2f6f78', emissiveIntensity: 0.25 }));
      marble.position.set(relicAt[0], 0.85, relicAt[2]);
      marble.rotation.set(0.6, 0.4, 0.9);
      marble.castShadow = marble.receiveShadow = true;
      root.add(marble);
    } else if (a.relic === 'coin') {
      const disc = new THREE.Shape();
      disc.absarc(0, 0, 1.7, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.moveTo(-0.36, -0.36); hole.lineTo(-0.36, 0.36); hole.lineTo(0.36, 0.36); hole.lineTo(0.36, -0.36); hole.closePath();
      disc.holes.push(hole);
      const bronze = new THREE.Color('#b08a3c').lerp(new THREE.Color('#5f8f7a'), mood.wear * 0.7);
      const pose = at([relicAt[0], 0.95, relicAt[2]], [-0.45, -0.5, 0.2]);
      bag.add(art.material('#ffffff', { roughness: 0.4, metalness: 0.7 }), new THREE.ExtrudeGeometry(disc, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 28 }), pose, bronze);
      for (const r of [1.58, 0.62]) bag.add(art.material('#ffffff', { roughness: 0.4, metalness: 0.7 }), new THREE.TorusGeometry(r, 0.06, 5, r > 1 ? 36 : 4), pose.clone().multiply(at([0, 0, 0.2], [0, 0, r > 1 ? 0 : Math.PI / 4])), bronze.clone().offsetHSL(0, 0, 0.1));
    } else if (a.relic === 'shell') {
      const shellColour = new THREE.Color('#d9c8a2').lerp(new THREE.Color('#9a9484'), mood.wear * 0.5);
      for (let i = 0; i < 26; i++) {
        const t = i * 0.5, r = 0.14 * Math.exp(t * 0.185), size = 0.16 * Math.exp(t * 0.185);
        bag.add(sheen, ball(1, 10), at([relicAt[0] + Math.cos(t) * r, 1.25 + Math.sin(t) * r, relicAt[2] + 0.5 - i * 0.045], [0, 0, 0], size), shellColour.clone().offsetHSL(0, 0, i % 2 ? 0.04 : -0.05));
      }
      bag.add(matte, new THREE.CircleGeometry(0.72, 14), at([relicAt[0] + Math.cos(12.5) * 1.42 + 0.3, 1.25 + Math.sin(12.5) * 1.42 - 0.55, relicAt[2] - 0.1], [0, 0.9, 0]), '#1f1711');
    }
    // Small glowing fungi at dusk.
    if (a.weather === 'dusk') {
      const glow = new THREE.MeshStandardMaterial({ color: '#c8ffe0', emissive: '#5cffb0', emissiveIntensity: mix(1.1, 2.2, mood.cheer), roughness: 0.6 });
      for (let i = 0; i < 16; i++) {
        const x = (random() - 0.5) * W * 0.95, z = (random() - 0.5) * D * 0.95;
        if (nearSlot(x, z) < 1.5) continue;
        const y = height(x, z), H = 0.5 + random() * 0.9, r = 0.16 + random() * 0.14;
        bag.add(glow, taper([[x, y, z], [x + 0.05, y + H, z]], () => 0.035, 4, 5));
        bag.add(glow, new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), at([x + 0.05, y + H - 0.02, z]));
      }
    }
    for (const mesh of bag.flush(root)) if ((mesh.material as THREE.MeshStandardMaterial).emissiveIntensity > 1) (mesh.material as THREE.MeshStandardMaterial).vertexColors = false;

    // Water beads after rain: one instanced mesh, not measured.
    if (beads.length) {
      const drops = new THREE.InstancedMesh(ball(1, 10), water(), beads.length);
      const glints = new THREE.InstancedMesh(ball(1, 5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }), beads.length);
      beads.forEach((bead, i) => {
        const r = 0.09 + random() * 0.13;
        dummy.quaternion.identity();
        dummy.position.set(bead[0], bead[1], bead[2]); dummy.scale.setScalar(r); dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
        dummy.position.set(bead[0] - r * 0.3, bead[1] + r * 0.55, bead[2] + r * 0.5); dummy.scale.setScalar(r * 0.25); dummy.updateMatrix(); glints.setMatrixAt(i, dummy.matrix);
      });
      root.add(drops, glints);
    }

    // Far, soft and unmeasured: trunk walls, mist and light shafts. They crop at the frame edge.
    const far = new THREE.Group();
    root.add(far);
    const haze = a.weather === 'fog' ? 0.62 : a.weather === 'dusk' ? 0.45 : 0.36;
    if (a.trunks !== 'none') {
      const base = new THREE.Color({ cedar: '#8a5a44', birch: '#e9e6dc', bamboo: '#8fae5c', mossy: '#4f5a3c' }[a.trunks]);
      const count = a.trunks === 'bamboo' ? 9 : 5 + Math.round(mood.density * 2);
      for (let i = 0; i < count; i++) {
        const layer = i % 2, width = (a.trunks === 'bamboo' ? 1.5 : 3.6) * mix(0.7, 1.5, random()) * (layer ? 0.8 : 1.15);
        const tone = base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08).lerp(back, haze + layer * 0.18);
        const bark = painted(96, 512, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const edge = ctx.createLinearGradient(0, 0, w, 0), rgb = `${Math.round(Math.sqrt(tone.r) * 255)},${Math.round(Math.sqrt(tone.g) * 255)},${Math.round(Math.sqrt(tone.b) * 255)}`;
          edge.addColorStop(0, `rgba(${rgb},0)`); edge.addColorStop(0.22, `rgba(${rgb},0.95)`); edge.addColorStop(0.78, `rgba(${rgb},0.95)`); edge.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = edge;
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'source-atop';
          for (let k = 0; k < 26; k++) {
            ctx.fillStyle = `rgba(${a.trunks === 'birch' ? '40,40,38' : '20,14,8'},${0.05 + random() * 0.12})`;
            if (a.trunks === 'birch') { ctx.beginPath(); ctx.ellipse(w * (0.3 + random() * 0.4), random() * h, 6 + random() * 16, 2 + random() * 4, 0, 0, Math.PI * 2); ctx.fill(); }
            else if (a.trunks === 'bamboo') ctx.fillRect(0, (k / 26) * h * 4.2 % h, w, 5);
            else ctx.fillRect(w * (0.15 + random() * 0.7), 0, 2 + random() * 6, h);
          }
          const shade = ctx.createLinearGradient(0, 0, w, 0);
          shade.addColorStop(0, 'rgba(255,255,255,0.14)'); shade.addColorStop(1, 'rgba(0,0,0,0.16)');
          ctx.fillStyle = shade;
          ctx.fillRect(0, 0, w, h);
        });
        const trunk = new THREE.Mesh(new THREE.PlaneGeometry(width, 120), new THREE.MeshBasicMaterial({ map: bark, transparent: true, depthWrite: false, opacity: 0.999 }));
        const along = mix(-15, 15, (i + random() * 0.7) / count), away = 8.5 + layer * 5 + random() * 2;
        trunk.position.set(along * Math.cos(yaw) - away * Math.sin(yaw), 5, -along * Math.sin(yaw) - away * Math.cos(yaw));
        trunk.rotation.y = yaw;
        trunk.rotation.z = (random() - 0.5) * (a.trunks === 'bamboo' ? 0.16 : 0.06);
        trunk.renderOrder = -2 - layer;
        far.add(trunk);
      }
    }
    const veil = (opacity: number, away: number, tintColour: string, order: number) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: tintColour, transparent: true, opacity, depthWrite: false }));
      plane.position.set(-away * Math.sin(yaw), 5, -away * Math.cos(yaw));
      plane.rotation.y = yaw;
      plane.renderOrder = order;
      far.add(plane);
    };
    if (a.weather === 'fog') { veil(0.45, 7.2, weather.back, -1); veil(0.4, 11, weather.back, -2.5); }
    else if (a.weather === 'rain' || a.weather === 'dusk') veil(0.22, 7.2, weather.back, -1);
    if (a.weather === 'dappled') {
      const shaft = painted(64, 8, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      for (let i = 0; i < 4; i++) {
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + random() * 2.2, 120), new THREE.MeshBasicMaterial({ map: shaft, color: '#fbf6b8', transparent: true, opacity: mix(0.1, 0.2, mood.cheer), depthWrite: false, blending: THREE.AdditiveBlending }));
        const along = mix(-8, 9, (i + random() * 0.6) / 4), away = 6.6 + random() * 2;
        beam.position.set(along * Math.cos(yaw) - away * Math.sin(yaw), 5, -along * Math.sin(yaw) - away * Math.cos(yaw));
        beam.rotation.set(0, yaw, 0.42);
        beam.renderOrder = -0.5;
        far.add(beam);
      }
    }

    const pace = mix(0.3, 1.8, mood.energy), sway = mix(0.003, 0.025, mood.energy);
    world.update = (_dt, time) => {
      forest.rotation.x = Math.sin(time * pace) * sway;
      forest.rotation.z = Math.cos(time * pace * 0.7) * sway;
    };
    return world;
  },
});

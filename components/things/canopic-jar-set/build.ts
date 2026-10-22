import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Kind = 'man' | 'baboon' | 'jackal' | 'falcon' | 'dome';
type Fate = 'upright' | 'open' | 'lying' | 'broken';

const STONE = {
  alabaster: { base: '#ecdfc0', vein: '#c99f5e', ink: '#2f5d9c', rough: 0.32 },
  limestone: { base: '#e7e2d4', vein: '#cfc8b4', ink: '#1f1c1a', rough: 0.85 },
  faience: { base: '#2c9db2', vein: '#1f7f98', ink: '#12262c', rough: 0.2 },
  pottery: { base: '#b8683f', vein: '#9c5230', ink: '#f0e3c2', rough: 0.8 },
  wood: { base: '#241e1a', vein: '#3a2e25', ink: '#e2b84a', rough: 0.4 },
} as const;

export default defineThing({
  questions: {
    arrangement: choice('How are the four jars set out?', {
      row: 'A straight row, shoulder to shoulder, all facing forward.',
      block: 'A tight square of four, the back pair raised on a step so every head shows.',
      chest: 'Packed in the four compartments of a square chest on a sledge, heads rising above the rim.',
      steps: 'Spaced out on museum blocks of different heights, each with a small label.',
      circle: 'A ring facing outward around a small offering bowl.',
    }),
    material: choice('What are the jars made of?', {
      alabaster: 'Honey-veined translucent alabaster, the classic.',
      limestone: 'Chalk-white painted limestone, matte and crisp.',
      faience: 'Glossy turquoise-blue faience with black line work.',
      pottery: 'Cheap red pottery with a cream painted band: a poor burial doing its best.',
      wood: 'Black resin-coated wood with gilded bands.',
    }),
    heads: choice('What form do the stoppers take?', {
      sons: 'The four sons of Horus: a man, a baboon, a jackal and a falcon.',
      human: 'Four human heads in wigs, the older fashion.',
      mixed: 'A mismatched set: two jackals, a man and a falcon, gathered from different burials.',
      domes: 'Plain domed lids with no faces at all, very ancient or very humble.',
    }),
    painted: noul('Are the heads painted in colour (dark wigs, flesh tones, black jackal) rather than left as bare stone?'),
    inscription: choice('What is written on the front of each jar?', {
      panel: 'A framed panel of small hieroglyphs in ink.',
      column: 'A single bold column of signs from shoulder to foot.',
      band: 'Only a coloured band around the shoulder.',
      none: 'Nothing; the surface is bare.',
    }),
    state: choice('What state are they in?', {
      intact: 'Complete and in place, stoppers seated.',
      sealed: 'Still bound at the neck with linen strips and clay seals, never opened.',
      opened: 'One stopper has been lifted off and set down beside its jar, a linen bundle showing in the mouth.',
      toppled: 'Knocked over: jars lying on their sides, stoppers rolled away.',
      smashed: 'One jar shattered into sherds, another on its side, the rest left standing.',
    }),
    shape: score('What shape are the jars?', ['Squat and broad-shouldered', 'Classic shouldered jar', 'Tall and slender']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STONE[a.material];
    const R = mix(0.1, 0.07, a.shape), HJ = mix(0.2, 0.36, a.shape), HR = R * 0.9;

    // veined stone texture with the inscription painted at the front (u = 0.5)
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d')!;
    c.fillStyle = st.base; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = st.vein;
    for (let i = 0; i < 16; i++) {
      c.globalAlpha = 0.25 + random() * 0.4; c.lineWidth = 2 + random() * 9;
      const y = random() * 256, amp = 6 + random() * 14, ph = random() * 6;
      c.beginPath(); for (let x = 0; x <= 256; x += 16) c[x ? 'lineTo' : 'moveTo'](x, y + Math.sin(x / 256 * Math.PI * 2 + ph) * amp); c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = c.strokeStyle = st.ink;
    const mark = (x: number, y: number, z: number) => {
      const k = Math.floor(random() * 5); c.lineWidth = 2.5; c.beginPath();
      if (k === 0) { c.arc(x, y, z * 0.4, 0, 7); c.stroke(); } else if (k === 1) { c.fillRect(x - z * 0.4, y - z * 0.1, z * 0.8, z * 0.2); c.fillRect(x - z * 0.4, y + z * 0.2, z * 0.8, z * 0.12); }
      else if (k === 2) { c.ellipse(x, y, z * 0.38, z * 0.2, -0.3, 0, 7); c.fill(); c.fillRect(x + z * 0.15, y - z * 0.45, z * 0.14, z * 0.4); }
      else if (k === 3) { c.moveTo(x, y + z * 0.45); c.lineTo(x - z * 0.2, y - z * 0.4); c.lineTo(x + z * 0.2, y - z * 0.4); c.fill(); } else c.arc(x, y + z * 0.2, z * 0.4, Math.PI, 0), c.fill();
    };
    if (a.inscription === 'panel') { c.lineWidth = 4; c.strokeRect(94, 92, 68, 84); for (let x = 0; x < 3; x++) for (let y = 0; y < 4; y++) mark(107 + x * 21, 105 + y * 20, 15); }
    if (a.inscription === 'column') { c.lineWidth = 3; c.strokeRect(114, 70, 28, 150); for (let y = 0; y < 6; y++) mark(128, 84 + y * 24, 20); }
    if (a.inscription === 'band' || a.material === 'pottery' || a.material === 'wood') { c.fillStyle = a.material === 'pottery' ? '#eadfbf' : st.ink; c.fillRect(0, 56, 256, 11); c.fillRect(0, 74, 256, 4); }
    c.fillStyle = `rgba(70,52,34,${mood.wear * 0.4})`; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < mood.wear * 26; i++) { c.fillStyle = `rgba(58,42,28,${0.2 + random() * 0.4})`; c.beginPath(); c.ellipse(random() * 256, 150 + random() * 106, 5 + random() * 22, 4 + random() * 12, random() * 3, 0, 7); c.fill(); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping;
    const jarMat = new THREE.MeshStandardMaterial({ map, roughness: st.rough + mood.wear * 0.3, side: THREE.DoubleSide, emissive: a.material === 'alabaster' ? '#6b4a1c' : '#000000', emissiveIntensity: a.material === 'alabaster' ? mix(0.12, 0.3, mood.warmth) : 0 });
    const stone = s.material(st.base, { roughness: st.rough });
    const dark = s.material('#161311', { roughness: 0.5 });
    const gold = s.material('#dcae3e', { metalness: 0.6, roughness: 0.35 });
    const linen = s.material('#ddd0ab', { roughness: 0.95 });
    const col = (painted: string) => (a.painted ? s.material(painted, { roughness: 0.55 }) : stone);

    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const ball = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => { const m = put(parent, new THREE.SphereGeometry(1, 16, 12), material, x, y, z); m.scale.set(sx, sy, sz); return m; };

    const profile = (upTo = 1) => {
      const pts: [number, number][] = [[0, 0], [0.6, 0], [0.66, 0.03], [0.78, 0.22], [0.9, 0.45], [1, 0.7], [0.97, 0.82], [0.8, 0.92], [0.66, 0.97], [0.66, 1], [0.5, 1], [0.5, 0.95], [0, 0.95]];
      return pts.filter(([, y]) => y <= upTo).map(([x, y]) => new THREE.Vector2(x * R, y * HJ));
    };
    const jarBody = (whole: boolean) => {
      const g = new THREE.Group();
      put(g, new THREE.LatheGeometry(profile(whole ? 1 : 0.5), 28, Math.PI), jarMat);
      if (whole) put(g, new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.004, 16), dark, 0, HJ * 0.955, 0);
      return g;
    };

    const stopper = (kind: Kind) => {
      const g = new THREE.Group(), h = HR;
      put(g, new THREE.CylinderGeometry(R * 0.7, R * 0.68, h * 0.24, 20), stone, 0, h * 0.12, 0);
      if (kind === 'dome') { ball(g, stone, 0, h * 0.28, 0, R * 0.7, h * 0.7, R * 0.7); ball(g, stone, 0, h * 0.98, 0, h * 0.2); return g; }
      const wigMat = kind === 'baboon' ? col('#7f8667') : col(a.material === 'faience' ? '#15323a' : '#23335e');
      const eye = (cx: number, cy: number, cz: number, r: number, spread: number, up: number, size: number, ring = false) => {
        for (const side of [-1, 1]) {
          const d = new THREE.Vector3(side * spread, up, 0.9).normalize().multiplyScalar(r);
          if (ring || a.painted) ball(g, s.material('#f1ead8'), cx + d.x, cy + d.y, cz + d.z, size * 1.5, size * 1.1, size * 0.5);
          ball(g, dark, cx + d.x * 1.03, cy + d.y * 1.03, cz + d.z * 1.05, size, size, size * 0.6);
        }
      };
      if (kind !== 'baboon') {
        ball(g, wigMat, 0, h * 1.05, -h * 0.05, h * 1.12, h * 1.02, h * 1.05);
        ball(g, wigMat, 0, h * 0.5, -h * 0.5, h * 0.98, h * 0.75, h * 0.55);
        for (const side of [-1, 1]) { const lap = put(g, new THREE.CapsuleGeometry(h * 0.3, h * 0.8, 4, 10), wigMat, side * h * 0.62, h * 0.52, h * 0.55); lap.scale.z = 0.7; if (a.painted) put(g, new THREE.CylinderGeometry(h * 0.31, h * 0.31, h * 0.16, 12), gold, side * h * 0.62, h * 0.16, h * 0.55).scale.z = 0.72; }
      }
      if (kind === 'man') {
        const skin = col(['#a9583a', '#c98a52', '#e0c08a'][Math.floor(random() * 3)]);
        ball(g, skin, 0, h * 0.98, h * 0.48, h * 0.7, h * 0.78, h * 0.66);
        eye(0, h * 1.0, h * 0.48, h * 0.68, 0.42, 0.2, h * 0.1);
        put(g, new THREE.ConeGeometry(h * 0.1, h * 0.3, 8), skin, 0, h * 0.92, h * 1.14).rotation.x = 0.3;
        put(g, new THREE.BoxGeometry(h * 0.3, h * 0.045, h * 0.05), a.painted ? s.material('#7c2a20') : dark, 0, h * 0.62, h * 1.02);
        for (const side of [-1, 1]) ball(g, skin, side * h * 0.72, h * 0.98, h * 0.45, h * 0.1, h * 0.2, h * 0.14);
      } else if (kind === 'baboon') {
        const fur = wigMat, flesh = col('#c59873');
        ball(g, fur, 0, h * 1.0, -h * 0.05, h * 1.2, h * 1.12, h * 1.08);
        for (const side of [-1, 1]) ball(g, fur, side * h * 0.72, h * 0.42, h * 0.42, h * 0.52, h * 0.62, h * 0.5);
        ball(g, flesh, 0, h * 1.05, h * 0.72, h * 0.62, h * 0.56, h * 0.5);
        ball(g, flesh, 0, h * 0.8, h * 1.2, h * 0.36, h * 0.32, h * 0.52);
        ball(g, dark, 0, h * 0.84, h * 1.68, h * 0.2, h * 0.14, h * 0.08);
        put(g, new THREE.BoxGeometry(h * 0.95, h * 0.16, h * 0.28), fur, 0, h * 1.36, h * 1.0).rotation.x = 0.2;
        eye(0, h * 1.08, h * 0.7, h * 0.55, 0.3, 0.22, h * 0.085);
      } else if (kind === 'jackal') {
        const pelt = col('#1c1a1a');
        ball(g, pelt, 0, h * 1.2, h * 0.4, h * 0.6, h * 0.62, h * 0.66);
        const snout = put(g, new THREE.ConeGeometry(h * 0.33, h * 1.25, 12), pelt, 0, h * 1.05, h * 1.25); snout.rotation.x = Math.PI / 2 + 0.12; snout.scale.z = 0.8;
        ball(g, dark, 0, h * 0.99, h * 1.84, h * 0.09);
        for (const side of [-1, 1]) {
          const ear = put(g, new THREE.ConeGeometry(h * 0.27, h * 1.15, 4), pelt, side * h * 0.42, h * 2.2, h * 0.0); ear.rotation.set(-0.1, side * 0.5, -side * 0.14); ear.scale.z = 0.55;
          if (a.painted) { const inner = put(g, new THREE.ConeGeometry(h * 0.14, h * 0.8, 4), gold, side * h * 0.42, h * 2.12, h * 0.07); inner.rotation.copy(ear.rotation); inner.scale.z = 0.5; }
        }
        eye(0, h * 1.25, h * 0.4, h * 0.58, 0.5, 0.25, h * 0.085, a.painted);
      } else {
        const plume = col('#ece4cc');
        ball(g, plume, 0, h * 1.12, h * 0.42, h * 0.68, h * 0.7, h * 0.68);
        const beak = put(g, new THREE.ConeGeometry(h * 0.22, h * 0.6, 8), col('#3a342b'), 0, h * 0.95, h * 1.12); beak.rotation.x = Math.PI * 0.82; beak.scale.x = 0.7;
        eye(0, h * 1.18, h * 0.42, h * 0.66, 0.5, 0.22, h * 0.13, true);
        for (const side of [-1, 1]) { const cheek = put(g, new THREE.CapsuleGeometry(h * 0.055, h * 0.36, 3, 6), dark, side * h * 0.4, h * 0.9, h * 0.96); cheek.rotation.z = side * 0.35; }
      }
      return g;
    };

    const kinds: Kind[] = { sons: ['man', 'baboon', 'jackal', 'falcon'], human: ['man', 'man', 'man', 'man'], mixed: ['jackal', 'man', 'falcon', 'jackal'], domes: ['dome', 'dome', 'dome', 'dome'] }[a.heads] as Kind[];
    if (random() < 0.5) kinds.reverse();

    // where each jar stands: [x, z, lift, yaw]
    const pitch = R * 2 + 0.035;
    let slots: [number, number, number, number][];
    if (a.arrangement === 'row') slots = [0, 1, 2, 3].map((i) => [(i - 1.5) * pitch * 1.08, 0, 0, 0]);
    else if (a.arrangement === 'steps') slots = [0, 1, 2, 3].map((i) => [(i - 1.5) * pitch * 1.45, i % 2 ? -0.06 : 0.05, [0.1, 0.2, 0.14, 0.06][i], 0]);
    else if (a.arrangement === 'circle') slots = [0, 1, 2, 3].map((i) => { const an = -Math.PI / 4 + i * Math.PI / 2 + 0.25; return [Math.sin(an) * pitch * 1.25, Math.cos(an) * pitch * 1.25, 0, an]; });
    else slots = [[-pitch / 2, pitch / 2, 0, 0], [pitch / 2, pitch / 2, 0, 0], [-pitch / 2, -pitch / 2, a.arrangement === 'block' ? HJ * 0.45 : 0, 0], [pitch / 2, -pitch / 2, a.arrangement === 'block' ? HJ * 0.45 : 0, 0]];
    const chest = a.arrangement === 'chest';
    const chestH = HJ * 0.62, half = pitch + 0.03;
    if (chest) for (const slot of slots) slot[2] = 0.07;

    const fates: Fate[] = ['upright', 'upright', 'upright', 'upright'];
    const pick = Math.floor(random() * 4), other = (pick + 1 + Math.floor(random() * 3)) % 4;
    if (a.state === 'opened') fates[pick] = 'open';
    if (a.state === 'toppled') { fates.fill('lying'); fates[pick] = 'upright'; }
    if (a.state === 'smashed') { fates[pick] = 'broken'; fates[other] = 'lying'; }

    const spread = chest ? half + 0.16 : pitch * 0.9;
    slots.forEach(([x, z, lift, yaw], index) => {
      const fate = fates[index], kind = kinds[index];
      const out = (reach: number): [number, number] => {
        if (chest || a.arrangement === 'block' || a.arrangement === 'steps') { const an = (index - 1.5) * 0.95 + (random() - 0.5) * 0.3; return [Math.sin(an) * (spread + reach * 1.15 + (a.arrangement === 'steps' ? 0.08 : 0)), Math.abs(Math.cos(an)) * (spread + reach) + reach * 0.3 + (a.arrangement === 'steps' ? 0.08 : 0)]; }
        return [x + (random() - 0.5) * 0.08, z + pitch * 0.6 + reach + random() * 0.08];
      };
      const jar = new THREE.Group(), lid = stopper(kind);
      if (fate === 'upright' || fate === 'open') {
        jar.add(jarBody(true)); jar.position.set(x, lift, z); jar.rotation.y = yaw + (random() - 0.5) * 0.3 * mood.energy;
        if (fate === 'upright') {
          lid.position.y = HJ; jar.add(lid);
          if (a.state === 'sealed') {
            put(jar, new THREE.CylinderGeometry(R * 0.76, R * 0.84, HJ * 0.12, 18), linen, 0, HJ * 0.98, 0);
            for (let k = 0; k < 2; k++) { const an = random() * 6; ball(jar, s.material('#8a6a4c'), Math.sin(an) * R * 0.84, HJ * 0.97, Math.cos(an) * R * 0.84, 0.014, 0.014, 0.008).rotation.y = an; }
            put(jar, new THREE.TorusGeometry(R * 0.8, 0.004, 5, 20), s.material('#6d5536'), 0, HJ * 0.98, 0).rotation.x = Math.PI / 2;
          }
        } else {
          ball(jar, linen, 0, HJ * 0.98, 0, R * 0.42, R * 0.3, R * 0.42);
          const [ox, oz] = out(0.03); lid.position.set(ox, 0, oz); lid.rotation.y = (random() - 0.5) * 1.2; s.root.add(lid);
        }
      } else {
        const [jx, jz] = out(fate === 'broken' ? 0 : 0.03 + HJ * 0.2);
        const inner = jarBody(fate !== 'broken');
        if (fate === 'lying') { inner.rotation.z = Math.PI / 2 - 0.1; inner.position.y = R * 0.98; inner.position.x = HJ / 2; jar.rotation.y = random() * Math.PI * 2; jar.position.set(jx, 0, jz); }
        else {
          jar.position.set(chest ? jx : x, chest ? 0 : lift, chest ? jz : z);
          const sherds = Array.from({ length: 12 + Math.floor(random() * 8) }, () => { const an = random() * Math.PI * 2, r = R * (0.6 + random() * 2.2); return { at: [Math.cos(an) * r, 0.006 - (chest ? 0 : lift), Math.sin(an) * r + R] as [number, number, number], size: 0.02 + random() * 0.04 }; });
          const bits = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1), stone, sherds.length), mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
          sherds.forEach((sh, i) => { q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3)); mtx.compose(new THREE.Vector3(...sh.at), q, new THREE.Vector3(sh.size, sh.size * 0.3, sh.size)); bits.setMatrixAt(i, mtx); });
          bits.castShadow = bits.receiveShadow = true; jar.add(bits);
          ball(jar, linen, 0.01, HJ * 0.42, 0, R * 0.6, R * 0.45, R * 0.6);
        }
        jar.add(inner);
        const [ox, oz] = out(0.1 + HJ * 0.6 + random() * 0.06);
        const tip = new THREE.Group(); tip.add(lid); lid.rotation.x = Math.PI / 2 * (random() < 0.5 ? 1 : -1) ; lid.position.y = R * 0.7; lid.position.z = lid.rotation.x > 0 ? -HR * 0.6 : HR * 0.6;
        tip.position.set(ox + (random() - 0.5) * 0.1, 0, oz); tip.rotation.y = random() * 6; s.root.add(tip);
      }
      s.root.add(jar);
      if (a.arrangement === 'steps') {
        s.box([pitch * 1.15, lift, pitch * 1.15], [x, lift / 2, z], s.material('#d9d7d0', { roughness: 0.85 }));
        s.label(['I', 'II', 'III', 'IV'][index], 0.07, 0.04, [x, 0.025, z + pitch * 0.58 + 0.035], '#333', '#f5f2ea').rotation.x = -0.7;
      }
    });

    if (a.arrangement === 'block') s.box([pitch * 2.1, HJ * 0.45, pitch * 1.02], [0, HJ * 0.225, -pitch / 2], s.material('#cfc6b0', { roughness: 0.9 }));
    if (a.arrangement === 'circle') {
      s.lathe([[0, 0.006], [0.03, 0.006], [0.06, 0.03], [0.064, 0.032], [0.034, 0.0], [0, 0]], stone);
      s.ball([0.036, 0.012, 0.036], [0, 0.022, 0], s.material('#3b2a1e'));
    }
    if (chest) {
      const wall = a.material === 'alabaster' || a.material === 'limestone' ? stone : s.material('#d2a23a', { metalness: 0.5, roughness: 0.4 });
      const trim = s.material(a.material === 'alabaster' || a.material === 'limestone' ? '#2f5d9c' : '#1d3f7c');
      const t = 0.022;
      s.box([half * 2, 0.03, half * 2], [0, 0.055, 0], wall);
      for (const side of [-1, 1]) {
        s.box([t, chestH, half * 2], [side * half, 0.07 + chestH / 2, 0], wall);
        s.box([half * 2 + t, chestH, t], [0, 0.07 + chestH / 2, side * half], wall);
        s.box([half * 2 + 0.07, 0.022, 0.035], [0, 0.07 + chestH + 0.011, side * (half + 0.012)], wall);
        s.box([0.035, 0.022, half * 2 + 0.07], [side * (half + 0.012), 0.07 + chestH + 0.011, 0], wall);
        s.box([half * 2 + t, 0.012, 0.006], [0, 0.07 + chestH - 0.012, side * (half + t / 2)], trim);
        // sledge runner with an upturned nose
        s.box([0.03, 0.04, half * 2 + 0.14], [side * (half - 0.03), 0.02, 0], wall);
        s.rod([side * (half - 0.03), 0.02, half + 0.07], [side * (half - 0.03), 0.08, half + 0.13], 0.016, wall);
      }
      s.box([t * 0.7, chestH * 0.5, half * 2], [0, 0.07 + chestH * 0.75, 0], wall);
      s.box([half * 2, chestH * 0.5, t * 0.7], [0, 0.07 + chestH * 0.75, 0], wall);
      for (let i = 0; i < 4; i++) s.box([0.012, chestH * 0.7, 0.004], [(i - 1.5) * half * 0.42, 0.07 + chestH * 0.5, half + t / 2], trim);
      // the chest lid, set down leaning on the back
      const cover = s.box([half * 2 + 0.05, 0.035, half * 2 + 0.05], [0, half * 0.9, -half - 0.1 - half * 0.42], wall); cover.rotation.x = -1.15;
      const knob = s.cylinder(0.02, 0.028, 0.035, [0, half * 0.9 + 0.03, -half - 0.1 - half * 0.42 - 0.014], trim, 10); knob.rotation.x = -1.15;
    }
    // density: what else was left with them
    const extras = Math.floor(mood.density * 5);
    for (let i = 0; i < extras; i++) {
      const an = Math.PI * (0.15 + 0.7 * (i + random() * 0.6) / Math.max(extras, 1)) + Math.PI, r = (chest ? half + 0.2 : pitch * 2.3) + random() * 0.06;
      const x = Math.cos(an) * r * 1.2, z = -Math.sin(an) * r * 0.2 + (chest ? half + 0.16 : pitch * 0.95);
      if (i % 2) { const roll = s.cylinder(0.022, 0.022, 0.09, [x, 0.022, z], linen, 10); roll.rotation.set(Math.PI / 2, 0, random() * 3); }
      else s.lathe([[0, 0], [0.02, 0], [0.04, 0.025], [0.043, 0.027], [0.02, 0.006], [0, 0.006]], stone, [x, 0, z]);
    }
    return s.finish();
  },
});

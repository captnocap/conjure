import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    tradition: choice('Which tradition does the headdress come from?', {
      vegas: 'Vegas showgirl: a tall upright fan of drooping ostrich plumes over a jewelled cap.',
      samba: 'Carnival samba: a wide sunburst of long pheasant feathers in loud alternating colours.',
      ziegfeld: 'Ziegfeld halo: a flat beaded ring behind the head, rimmed with short feathers and star spikes.',
      crown: 'Ballroom crown: a tall rhinestone tiara of pointed spires with a feather trim behind.',
      peacock: 'Peacock fan: a spread of eyed tail feathers.',
    }),
    colour: choice('What colour are the feathers?', {
      white: 'Snow white.',
      pink: 'Flamingo pink.',
      redgold: 'Scarlet tipped with gold.',
      turquoise: 'Turquoise shading to violet.',
      black: 'Black with a grey sheen.',
      emerald: 'Emerald shading to lime.',
      rainbow: 'A different colour for every feather.',
    }),
    height: score('How tall does it stand?', ['A modest spray', 'Twice the head', 'Doorway-clearing', 'Enormous, a full backpiece']),
    jewels: choice('What is it jewelled with?', {
      rhinestone: 'White rhinestones that throw light.',
      gold: 'Gold sequins and coins.',
      pearl: 'Ropes of pearls.',
      ruby: 'Fat coloured glass gems.',
    }),
    shed: choice('Have feathers been shed around the base?', {
      none: 'None; it is freshly steamed and perfect.',
      few: 'Two or three have drifted down.',
      moult: 'It is moulting badly: a litter of feathers, and one plume snapped and hanging.',
    }),
    head: choice('What kind of head is it resting on?', {
      white: 'A blank white display head.',
      glam: 'A glossy head with painted red lips and heavy lashes.',
      gilt: 'A gold-leafed head.',
      block: 'A plain wooden hat block.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TAU = Math.PI * 2;
    const H = mix(0.32, 1.05, a.height);

    // ---- Head stand ----
    const hy = 0.27;
    const skin = {
      white: s.material('#f0eee8', { roughness: 0.6 }),
      glam: s.material('#e9c3ad', { roughness: 0.3 }),
      gilt: s.material('#c9a13c', { roughness: 0.3, metalness: 0.8 }),
      block: s.material('#a9794a', { roughness: 0.8 }),
    }[a.head];
    s.cylinder(0.1, 0.11, 0.02, [0, 0.01, 0], a.head === 'block' ? skin : s.material('#1c1b20', { roughness: 0.4 }), 28);
    s.cylinder(0.036, 0.05, 0.16, [0, 0.1, 0], skin, 16);
    if (a.head === 'block') s.ball([0.082, 0.1, 0.09], [0, hy, 0], skin, 20);
    else {
      s.ball([0.075, 0.1, 0.085], [0, hy, 0], skin, 24);
      s.ball([0.012, 0.02, 0.018], [0, hy - 0.012, 0.082], skin, 10);
      if (a.head === 'glam') {
        s.ball([0.02, 0.008, 0.008], [0, hy - 0.045, 0.074], s.material('#c8142c', { roughness: 0.25 }), 10);
        for (const sx of [-1, 1]) {
          const lash = s.ring(0.016, 0.003, [sx * 0.032, hy + 0.012, 0.073], s.material('#0d0d10'), Math.PI);
          lash.rotation.set(0.3, sx * 0.35, Math.PI);
        }
      }
    }

    // ---- Colours ----
    const pair = { white: ['#f6f3ea', '#d9d3c4'], pink: ['#ff5fa0', '#ffc6dc'], redgold: ['#d3172d', '#f2bd3c'], turquoise: ['#17c2c2', '#7a3fd0'], black: ['#18171d', '#6a6a78'], emerald: ['#0f9960', '#cfe04a'], rainbow: ['#ff5fa0', '#ffd23f'] }[a.colour];
    const dull = new THREE.Color('#8b8275');
    let hueIndex = 0;
    const tones = (): [THREE.Color, THREE.Color] => {
      if (a.colour === 'rainbow') { const h = (hueIndex++ * 0.13) % 1; return [new THREE.Color().setHSL(h, 0.85, 0.55).lerp(dull, mood.wear * 0.25), new THREE.Color().setHSL((h + 0.08) % 1, 0.9, 0.7).lerp(dull, mood.wear * 0.25)]; }
      return [new THREE.Color(pair[0]).lerp(dull, mood.wear * 0.25), new THREE.Color(pair[1]).lerp(dull, mood.wear * 0.25)];
    };
    const featherMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
    const featherGeo = (L: number, W: number, curl: number, kind: 'plume' | 'blade' | 'wisp', c0: THREE.Color, c1: THREE.Color) => {
      const seg = 10, pos: number[] = [], col: number[] = [], idx: number[] = [];
      let y = 0, z = 0;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        if (i > 0) { const th = curl * 1.9 * Math.pow((i - 0.5) / seg, 2); y += (L / seg) * Math.cos(th); z += (L / seg) * Math.sin(th); }
        let w = kind === 'plume' ? W * (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(t, 0.75))) : kind === 'blade' ? W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.03)), 0.6) : W * (0.25 + 0.6 * Math.sin(Math.PI * t));
        w *= 1 - mood.wear * random() * 0.55;
        const edge = c0.clone().lerp(c1, Math.pow(t, 1.4)), mid = edge.clone().lerp(new THREE.Color('#ffffff'), 0.3);
        pos.push(-w / 2, y, z - w * 0.18, 0, y, z, w / 2, y, z - w * 0.18);
        col.push(edge.r, edge.g, edge.b, mid.r, mid.g, mid.b, edge.r, edge.g, edge.b);
        if (i > 0) { const b = i * 3, p = b - 3; idx.push(p, p + 1, b, p + 1, b + 1, b, p + 1, p + 2, b + 1, p + 2, b + 2, b + 1); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return { geo, tip: new THREE.Vector3(0, y, z) };
    };
    const piece = new THREE.Group();
    s.root.add(piece);
    const swaying: { mesh: THREE.Mesh; base: number; phase: number; amp: number }[] = [];
    const plant = (geo: THREE.BufferGeometry, at: V3, angle: number, tilt: number, amp = 1) => {
      const mesh = new THREE.Mesh(geo, featherMat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(...at);
      mesh.rotation.set(tilt, 0, -angle);
      piece.add(mesh);
      swaying.push({ mesh, base: -angle, phase: random() * TAU, amp });
      return mesh;
    };
    const crownAt = (angle: number, back = -0.035): V3 => [Math.sin(angle) * 0.07, hy + 0.07 + Math.cos(angle) * 0.035, back];
    const jewelColour = { rhinestone: '#f4fbff', gold: '#e2b53c', pearl: '#f6f0e2', ruby: mood.warmth > 0.5 ? '#d3123a' : '#1c9a6a' }[a.jewels];
    const jewel = s.material(jewelColour, { roughness: a.jewels === 'pearl' ? 0.3 : 0.08, metalness: a.jewels === 'pearl' ? 0.2 : 0.6, emissive: jewelColour, emissiveIntensity: a.jewels === 'pearl' ? 0.08 : mix(0.2, 0.6, mood.cheer) });
    const gold = s.material(a.jewels === 'rhinestone' ? '#cfd3d6' : '#d0a63a', { metalness: 0.85, roughness: 0.25 });
    const gems: { at: V3; size: number }[] = [];

    // The cap every tradition shares.
    const cap = s.ball([0.082, 0.07, 0.092], [0, hy + 0.045, -0.006], gold, 20);
    piece.add(cap);
    for (let i = 0; i < 26; i++) { const ang = (i / 25 - 0.5) * 3.4; gems.push({ at: [Math.sin(ang) * 0.083, hy + 0.05 - Math.cos(ang) * 0.004, Math.cos(ang) * 0.093 - 0.006], size: i % 2 ? 0.8 : 1.2 }); }
    gems.push({ at: [0, hy + 0.075, 0.084], size: 2.6 });
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) gems.push({ at: [sx * 0.08, hy + 0.035 - i * 0.014, 0.02], size: i === 8 ? 1.8 : 0.9 });

    if (a.tradition === 'vegas') {
      const n = 9 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, [c0, c1] = tones();
        const { geo } = featherGeo(H * (1 - 0.3 * u * u) * (0.9 + random() * 0.15), mix(0.1, 0.16, a.height), 0.75 + random() * 0.3, 'plume', c0, c1);
        plant(geo, crownAt(u * 0.9), u * 0.95, -0.22 - random() * 0.08);
      }
      for (let i = 0; i < 6; i++) {
        const u = i / 5 * 2 - 1, [c0, c1] = tones();
        const { geo } = featherGeo(H * 0.42, 0.09, 1.1, 'plume', c1, c0);
        plant(geo, crownAt(u * 0.8, 0.0), u * 1.1, -0.05);
      }
    } else if (a.tradition === 'samba') {
      const n = 19 + Math.round(mood.density * 8);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, [c0, c1] = tones();
        const flip = i % 2 === 0;
        const { geo } = featherGeo(H * (flip ? 1 : 0.78) * (0.92 + random() * 0.12), 0.05, 0.18, 'blade', flip ? c0 : c1, flip ? c1 : c0);
        plant(geo, [Math.sin(u * 1.7) * 0.09, hy + 0.05 + Math.cos(u * 1.7) * 0.06, -0.06], u * 1.75, -0.1, 0.6);
      }
      for (let i = 0; i < 9; i++) {
        const u = i / 8 * 2 - 1, [c0, c1] = tones();
        const { geo } = featherGeo(H * 0.36, 0.11, 0.9, 'plume', c1, c0);
        plant(geo, crownAt(u * 1.2, -0.02), u * 1.4, -0.12);
      }
      const plate = new THREE.Shape();
      plate.moveTo(-0.1, 0); plate.lineTo(-0.085, 0.07); plate.lineTo(-0.045, 0.05); plate.lineTo(0, 0.13); plate.lineTo(0.045, 0.05); plate.lineTo(0.085, 0.07); plate.lineTo(0.1, 0); plate.lineTo(-0.1, 0);
      piece.add(s.mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.008, bevelEnabled: false }), gold, [0, hy + 0.07, 0.05]));
      for (const [x, y, k] of [[0, 0.085, 2.4], [-0.05, 0.035, 1.5], [0.05, 0.035, 1.5], [-0.082, 0.05, 1.1], [0.082, 0.05, 1.1], [0, 0.03, 1.4]]) gems.push({ at: [x, hy + 0.07 + y, 0.062], size: k });
    } else if (a.tradition === 'ziegfeld') {
      const r = mix(0.2, 0.42, a.height), centre: V3 = [0, hy + 0.06, -0.07];
      const hoop = s.ring(r, 0.01, centre, gold); piece.add(hoop);
      const innerHoop = s.ring(r * 0.55, 0.006, centre, gold); piece.add(innerHoop);
      const n = 30 + Math.round(mood.density * 10);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU, at: V3 = [centre[0] + Math.sin(ang) * r, centre[1] + Math.cos(ang) * r, centre[2]];
        if (at[1] < 0.1) continue;
        const [c0, c1] = tones();
        const { geo } = featherGeo(r * mix(0.45, 0.7, random()), 0.07, 0.35, 'plume', c0, c1);
        plant(geo, at, ang, 0, 0.5);
        if (i % 3 === 0) { const spike = s.rod(at, [centre[0] + Math.sin(ang) * r * 1.5, centre[1] + Math.cos(ang) * r * 1.5, centre[2] - 0.005], 0.006, gold, 0.0008); piece.add(spike); gems.push({ at: [centre[0] + Math.sin(ang) * r * 1.5, centre[1] + Math.cos(ang) * r * 1.5, centre[2] - 0.005], size: 1.3 }); }
      }
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * TAU;
        piece.add(s.rod([centre[0] + Math.sin(ang) * r * 0.55, centre[1] + Math.cos(ang) * r * 0.55, centre[2]], [centre[0] + Math.sin(ang) * r, centre[1] + Math.cos(ang) * r, centre[2]], 0.003, gold));
        for (let k = 1; k < 4; k++) gems.push({ at: [centre[0] + Math.sin(ang) * r * (0.55 + k * 0.11), centre[1] + Math.cos(ang) * r * (0.55 + k * 0.11), centre[2] + 0.006], size: 0.9 });
      }
    } else if (a.tradition === 'crown') {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, ang = u * 1.25, sh = H * 0.62 * (1 - 0.55 * Math.abs(u)) * (i % 2 ? 0.72 : 1);
        const spire = s.mesh(new THREE.ConeGeometry(0.022, sh, 4), jewel, [Math.sin(ang) * 0.085, hy + 0.08 + sh / 2, Math.cos(ang) * 0.085 - 0.01]);
        spire.rotation.y = ang + Math.PI / 4; spire.scale.z = 0.4;
        spire.rotation.z = -u * 0.28;
        piece.add(spire);
        const tipX = Math.sin(ang) * 0.085 + Math.sin(u * 0.28) * sh * 0.5, tipY = hy + 0.08 + sh / 2 + Math.cos(u * 0.28) * sh * 0.5;
        piece.add(s.ball([0.012, 0.012, 0.012], [tipX, tipY, Math.cos(ang) * 0.085 - 0.01], gold, 8));
        if (i < n - 1) { const u2 = (i + 1) / (n - 1) * 2 - 1, a2 = u2 * 1.25; piece.add(s.tube([[Math.sin(ang) * 0.086, hy + 0.1, Math.cos(ang) * 0.086 - 0.01], [Math.sin((ang + a2) / 2) * 0.09, hy + 0.1 + sh * 0.22, Math.cos((ang + a2) / 2) * 0.09 - 0.01], [Math.sin(a2) * 0.086, hy + 0.1, Math.cos(a2) * 0.086 - 0.01]], 0.004, gold)); }
        gems.push({ at: [Math.sin(ang) * 0.09, hy + 0.085, Math.cos(ang) * 0.09 - 0.008], size: 1.6 });
      }
      const m = 9 + Math.round(mood.density * 4);
      for (let i = 0; i < m; i++) {
        const u = i / (m - 1) * 2 - 1, [c0, c1] = tones();
        const { geo } = featherGeo(H * 0.5 * (1 - 0.3 * u * u), 0.1, 0.8, 'plume', c0, c1);
        plant(geo, crownAt(u * 1.1, -0.07), u * 1.2, -0.3);
      }
    } else {
      const n = 13 + Math.round(mood.density * 6);
      const eyeMats = ['#a9862c', '#17b5a5', '#1b2f9a', '#0d0d2a'].map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).lerp(dull, mood.wear * 0.25), side: THREE.DoubleSide, roughness: 0.5, emissive: c, emissiveIntensity: 0.12 }));
      const eyeGeo = new THREE.CircleGeometry(1, 18);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, L = H * (1 - 0.18 * u * u) * (i % 2 ? 0.8 : 1) * (0.94 + random() * 0.1), [c0] = tones();
        const green = a.colour === 'white' ? new THREE.Color('#e9efe4') : a.colour === 'emerald' || a.colour === 'turquoise' || a.colour === 'black' ? new THREE.Color('#1f8a55') : c0;
        const { geo, tip } = featherGeo(L, 0.045, 0.15 + random() * 0.1, 'wisp', new THREE.Color('#c9b98a'), green.lerp(dull, mood.wear * 0.25));
        const mesh = plant(geo, crownAt(u * 1.15), u * 1.45, -0.12, 0.7);
        [[0.05, 0.062], [0.036, 0.046], [0.024, 0.03], [0.012, 0.016]].forEach(([w, h], k) => {
          const eye = new THREE.Mesh(eyeGeo, eyeMats[k]);
          eye.scale.set(w, h, 1); eye.position.set(0, tip.y - 0.045 - k * 0.004, tip.z + 0.004 + k * 0.0015); eye.castShadow = true;
          mesh.add(eye);
        });
      }
      for (let i = 0; i < 7; i++) { const u = i / 6 * 2 - 1, [c0, c1] = tones(); const { geo } = featherGeo(H * 0.3, 0.09, 0.9, 'plume', c0, c1); plant(geo, crownAt(u, -0.01), u * 1.3, -0.1); }
    }
    piece.add(s.scatter(new THREE.OctahedronGeometry(0.0075, 0), jewel, gems));

    // ---- Shed feathers ----
    const fallen = a.shed === 'none' ? 0 : a.shed === 'few' ? 3 : 9 + Math.round(mood.density * 6);
    for (let i = 0; i < fallen; i++) {
      const [c0, c1] = tones(), ang = random() * TAU, r = 0.14 + random() * 0.22;
      const { geo } = featherGeo(0.12 + random() * 0.14, 0.05, 0.25, a.tradition === 'samba' ? 'blade' : 'plume', c0, c1);
      const mesh = new THREE.Mesh(geo, featherMat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(Math.sin(ang) * r, 0.004 + i * 0.0006, Math.cos(ang) * r);
      mesh.rotation.set(-Math.PI / 2 + 0.06, 0, random() * TAU);
      s.root.add(mesh);
    }
    if (a.shed === 'moult' && swaying.length > 3) {
      const victim = swaying[Math.floor(random() * Math.min(swaying.length, 8))];
      victim.base += (random() < 0.5 ? -1 : 1) * 1.5; victim.mesh.rotation.x = 0.5; victim.amp = 3;
      victim.mesh.rotation.z = victim.base;
      piece.rotation.z = (random() - 0.5) * 0.12;
    }

    const energy = mood.energy;
    return s.finish({
      footprint: 0.22,
      update: (_dt, time) => {
        const speed = mix(0.5, 2.2, energy), reach = mix(0.008, 0.04, energy);
        for (const f of swaying) f.mesh.rotation.z = f.base + Math.sin(time * speed + f.phase) * reach * f.amp;
      },
    });
  },
});

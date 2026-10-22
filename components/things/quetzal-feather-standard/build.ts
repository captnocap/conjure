import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { PAINT, bladeGeometry, glyph, lerpHex, paintCanvas, stone, stoneTone, textured, tuft, weather } from './maya';

const PLUMES = {
  quetzal: ['#12936a', '#1fb382', '#0f7d6e', '#2a8fb0'],
  macaw: ['#d23a26', '#e85a22', '#f2c230', '#2a62c9'],
  heron: ['#f3f0e6', '#e3e6e2', '#cfd8da', '#f3f0e6'],
  mixed: ['#12936a', '#1fb382', '#d23a26', '#f2c230'],
} as const;

export default defineThing({
  questions: {
    crest: choice('How are the plumes arranged?', {
      fan: 'A wide sunburst fan radiating around the disc like a halo.',
      cascade: 'A short fan above and a cascade of very long tail plumes streaming down behind.',
      tuft: 'A tight upright tuft bursting from the top like a torch.',
      wings: 'Two spread wings of plumes, left and right, like a butterfly.',
    }),
    emblem: choice('What is on the woven disc?', {
      sun: 'A sun: concentric rings and pointed rays.',
      jaguar: 'Jaguar pelt: tawny with black rosettes.',
      fret: 'A bold stepped-fret pattern in two colours.',
      ball: 'A black rubber ball on white: a ball team\'s badge.',
      skull: 'A white skull on red: a war standard.',
      spiral: 'A turquoise wind spiral, a cut conch shell.',
    }),
    plumes: choice('What feathers is it made from?', {
      quetzal: 'Iridescent emerald quetzal tail feathers with a few blue ones.',
      macaw: 'Scarlet macaw with flashes of yellow and blue.',
      heron: 'White heron plumes, pale and severe.',
      mixed: 'Green plumes mixed with red and gold.',
    }),
    height: score('How tall is the standard?', ['Chest high, a back-standard off its bearer', 'Half as tall again as a person', 'Tall as a house, visible across the plaza']),
    socket: choice('What holds the pole?', {
      drum: 'A carved stone drum with a band of glyphs.',
      bearer: 'A seated stone figure gripping the pole in its clasped hands, a standard bearer.',
      stepped: 'A small stepped stone plinth, three tiers.',
      block: 'A plain rough block with a hole bored through it.',
    }),
    state: choice('How does it stand right now?', {
      proud: 'Dead upright, freshly planted before the game.',
      leaning: 'Leaning badly, loosened in its socket, about to go over.',
      snapped: 'The shaft has been snapped: the crest lies on the ground. Captured, or defeated.',
      streaming: 'Whipped sideways by a hard wind, every plume streaming one way.',
    }),
    streamers: noul('Do cloth streamers and bells hang from a crossbar under the disc?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const base = stoneTone(wear);
    const H = mix(1.7, 5.4, a.height);
    const k = mix(0.75, 1.25, a.height);
    const palette = PLUMES[a.plumes].map((tint) => lerpHex(tint, '#8a876a', wear * 0.55));
    const wind = a.state === 'streaming' ? 1 : 0;

    // Socket.
    const plain = s.material(base, { roughness: 0.9 });
    let poleZ = 0, poleBase = 0.1;
    if (a.socket === 'drum') {
      const band = textured(paintCanvas(512, 128, (ctx, w, h) => {
        stone(ctx, w, h, random, { base: lerpHex(base, PAINT.red, fresh * 0.8), wear: 0 });
        for (let i = 0; i < 8; i++) glyph(ctx, i * 64 + 4, 30, 58, random, '#2a2320', fresh > 0.2 ? lerpHex(base, PAINT.cream, 0.7) : undefined);
        ctx.fillStyle = '#2a2320'; ctx.fillRect(0, 14, w, 6); ctx.fillRect(0, h - 22, w, 6);
        weather(ctx, w, h, random, wear);
      }), { bumpScale: 2 });
      s.cylinder(0.4, 0.44, 0.1, [0, 0.05, 0], plain, 28);
      s.cylinder(0.36, 0.36, 0.36, [0, 0.28, 0], band, 28);
      s.cylinder(0.4, 0.4, 0.08, [0, 0.5, 0], plain, 28);
      s.cylinder(0.09, 0.09, 0.03, [0, 0.555, 0], s.material('#3a332c'), 14);
      poleBase = 0.3;
    } else if (a.socket === 'stepped') {
      for (let i = 0; i < 3; i++) s.box([1 - i * 0.26, 0.2, 1 - i * 0.26], [0, 0.1 + i * 0.2, 0], i === 1 ? s.material(lerpHex(base, PAINT.red, fresh * 0.8), { roughness: 0.9 }) : plain);
      poleBase = 0.4;
    } else if (a.socket === 'block') {
      const block = s.mesh(new THREE.DodecahedronGeometry(0.42, 0), s.material(lerpHex(base, '#6f6a5e', 0.3), { roughness: 0.95, flatShading: true }), [0, 0.2, 0]);
      block.scale.set(1.1, 0.65, 1); block.rotation.y = random() * 3;
      poleBase = 0.15;
    } else {
      // The seated bearer: crossed legs, block torso, forearms forward, hands clasped round the shaft.
      const skin = s.material(lerpHex(base, '#b98a62', fresh * 0.5), { roughness: 0.9 });
      const trim = s.material(lerpHex(base, PAINT.blue, fresh * 0.85), { roughness: 0.9 });
      s.box([0.8, 0.12, 0.7], [0, 0.06, -0.05], plain);
      s.box([0.72, 0.2, 0.5], [0, 0.22, 0], skin);
      s.box([0.42, 0.5, 0.3], [0, 0.56, -0.08], skin);
      s.box([0.5, 0.12, 0.34], [0, 0.36, -0.08], trim);
      s.ball([0.16, 0.18, 0.16], [0, 0.97, -0.06], skin, 16);
      s.box([0.4, 0.14, 0.3], [0, 1.14, -0.08], trim);
      s.box([0.5, 0.06, 0.34], [0, 1.07, -0.08], plain);
      for (const side of [-1, 1]) {
        s.cylinder(0.05, 0.05, 0.04, [side * 0.17, 0.95, -0.04], trim, 10).rotation.z = Math.PI / 2;
        s.rod([side * 0.26, 0.74, -0.06], [side * 0.24, 0.5, 0.1], 0.06, skin);
        s.rod([side * 0.24, 0.5, 0.1], [side * 0.05, 0.56, 0.32], 0.055, skin);
        s.ball([0.03, 0.03, 0.03], [side * 0.06, 1.0, 0.085], s.material('#231d1a'), 8);
      }
      s.ball([0.1, 0.09, 0.1], [0, 0.57, 0.33], skin, 12);
      s.box([0.06, 0.03, 0.03], [0, 0.9, 0.09], s.material('#231d1a'));
      poleZ = 0.33; poleBase = 0.12;
    }

    // Shaft, in two parts so it can break.
    const wood = s.material(lerpHex('#7a5230', '#8f897c', wear * 0.6), { roughness: 0.8 });
    const bandA = s.material(lerpHex(base, PAINT.red, Math.max(0.3, fresh)), { roughness: 0.8 });
    const bandB = s.material(lerpHex(base, PAINT.cream, Math.max(0.3, fresh)), { roughness: 0.8 });
    const whole = new THREE.Group(); whole.position.set(0, poleBase, poleZ); s.root.add(whole);
    const L = H - poleBase, breakAt = L * (0.32 + random() * 0.12);
    const upper = new THREE.Group(); upper.position.y = breakAt; whole.add(upper);
    const stick = (parent: THREE.Object3D, from: number, to: number) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * k, 0.045 * k, to - from, 10), wood);
      mesh.position.y = (from + to) / 2; mesh.castShadow = true; parent.add(mesh);
    };
    stick(whole, 0, breakAt); stick(upper, 0, L - breakAt);
    for (let i = 0; i < Math.floor(L / 0.45); i++) {
      const y = 0.3 + i * 0.45, band = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * k, 0.05 * k, 0.12, 10), i % 2 ? bandA : bandB);
      band.castShadow = true;
      if (y < breakAt - 0.1) { band.position.y = y; whole.add(band); } else if (y > breakAt + 0.1 && y < L - 0.7 * k) { band.position.y = y - breakAt; upper.add(band); }
    }

    // Crest: disc, plumes, crossbar. Built around the top of the shaft.
    const top = new THREE.Group(); top.position.y = L - breakAt - 0.38 * k; upper.add(top);
    const R = 0.36 * k;
    const emblem = paintCanvas(256, 256, (ctx, w) => {
      const c = w / 2;
      const ring = (r: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c, c, r, 0, 7); ctx.fill(); };
      const ink = '#231d1a';
      if (a.emblem === 'sun') {
        ring(c, PAINT.red); ring(c * 0.8, PAINT.ochre);
        ctx.fillStyle = PAINT.red; for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i / 12 * Math.PI * 2); ctx.beginPath(); ctx.moveTo(-14, -c * 0.42); ctx.lineTo(0, -c * 0.78); ctx.lineTo(14, -c * 0.42); ctx.fill(); ctx.restore(); }
        ring(c * 0.42, PAINT.cream); ring(c * 0.2, PAINT.red);
      } else if (a.emblem === 'jaguar') {
        ring(c, '#d9a24a');
        for (let i = 0; i < 30; i++) { const t = random() * 7, r = Math.sqrt(random()) * c * 0.85, x = c + Math.cos(t) * r, y = c + Math.sin(t) * r; ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, 9 + random() * 5, random() * 3, random() * 3 + 4.5); ctx.stroke(); ctx.fillStyle = '#a8662a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      } else if (a.emblem === 'fret') {
        ring(c, PAINT.cream); ctx.save(); ctx.beginPath(); ctx.arc(c, c, c, 0, 7); ctx.clip();
        ctx.fillStyle = PAINT.blue; for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) { const x = col * 64, y = row * 64; ctx.fillRect(x, y + 44, 64, 20); ctx.fillRect(x, y + 12, 20, 40); ctx.fillRect(x + 20, y + 12, 26, 14); }
        ctx.restore();
      } else if (a.emblem === 'ball') {
        ring(c, PAINT.cream); ring(c * 0.58, '#1b1918'); ctx.strokeStyle = PAINT.red; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(c, c, c * 0.8, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(c - 20, c - 22, 14, 0, 7); ctx.fill();
      } else if (a.emblem === 'skull') {
        ring(c, PAINT.red); ctx.fillStyle = '#f1e8d2';
        ctx.beginPath(); ctx.arc(c, c - 14, c * 0.5, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(c + 36, c + 74); ctx.lineTo(c - 36, c + 74); ctx.fill();
        ctx.fillStyle = ink; for (const x of [-26, 26]) { ctx.beginPath(); ctx.arc(c + x, c - 12, 17, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(c, c + 8); ctx.lineTo(c - 9, c + 28); ctx.lineTo(c + 9, c + 28); ctx.fill();
        for (let i = -2; i <= 2; i++) ctx.fillRect(c + i * 14 - 2, c + 42, 4, 30);
      } else {
        ring(c, PAINT.cream); ctx.strokeStyle = PAINT.blue; ctx.lineWidth = 16; ctx.beginPath();
        for (let t = 0; t < 15; t += 0.1) { const r = 6 + t * 7.4; const x = c + Math.cos(t) * r, y = c + Math.sin(t) * r; if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // Woven texture and an outer binding.
      ctx.strokeStyle = 'rgba(40,30,20,0.16)'; ctx.lineWidth = 2;
      for (let r = 10; r < c; r += 9) { ctx.beginPath(); ctx.arc(c, c, r, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(c, c, c - 5, 0, 7); ctx.stroke();
      if (wear > 0.4) { ctx.fillStyle = `rgba(120,112,92,${(wear - 0.4) * 0.8})`; ctx.fillRect(0, 0, w, w); }
    });
    const discPaint = new THREE.MeshStandardMaterial({ map: emblem, roughness: 0.85, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.04 * k, 40), [s.material('#7a5a34'), discPaint, discPaint] as unknown as THREE.Material);
    disc.rotation.x = Math.PI / 2; disc.castShadow = true; top.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022 * k, 6, 40), s.material(lerpHex('#c9a24a', '#8a836f', wear * 0.6), { roughness: 0.5, metalness: 0.3 }));
    rim.castShadow = true; top.add(rim);

    const featherPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, side: THREE.DoubleSide });
    const swaying: { node: THREE.Object3D; axis: 'x' | 'z'; rest: number; phase: number; reach: number }[] = [];
    const keep = 1 - wear * 0.45;
    /** One bundle of plumes as an instanced mesh inside its own group, so the bundle can sway. */
    const bundle = (list: { angle: number; length: number; lean: number; width?: number }[], bend: number) => {
      const group = new THREE.Group();
      const kept = list.filter(() => random() < keep);
      const mesh = new THREE.InstancedMesh(bladeGeometry(1, 0.12, bend, 8), featherPaint, Math.max(1, kept.length));
      const dummy = new THREE.Object3D();
      kept.forEach((feather, index) => {
        dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0);
        dummy.rotateZ(-feather.angle); dummy.rotateX(feather.lean);
        dummy.scale.set((feather.width ?? 1) * k, feather.length, k);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, new THREE.Color(palette[random() < 0.7 ? Math.floor(random() * 2) : 2 + Math.floor(random() * 2)]));
      });
      mesh.count = kept.length;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true; mesh.frustumCulled = false;
      group.add(mesh);
      return group;
    };
    const droop = wear * 0.5;
    const add = (group: THREE.Group, at: [number, number, number], axis: 'x' | 'z', reach: number) => {
      group.position.set(...at); top.add(group);
      if (wind) group.rotation.z -= 0.5 * (axis === 'z' ? 1 : 0.4);
      swaying.push({ node: group, axis, rest: group.rotation[axis], phase: random() * 6, reach });
      return group;
    };
    const jitter = () => (random() - 0.5) * 0.12;
    if (a.crest === 'fan' || a.crest === 'cascade') {
      const n = a.crest === 'fan' ? 21 : 13, spread = a.crest === 'fan' ? 2.0 : 1.2;
      const len = (a.crest === 'fan' ? 1.15 : 0.8) * k;
      add(bundle(Array.from({ length: n }, (_unused, i) => ({ angle: (i / (n - 1) - 0.5) * 2 * spread + jitter(), length: len * (0.85 + random() * 0.3) + R, lean: -0.12 - droop * 0.5 })), -0.5 - droop), [0, 0, -0.03], 'z', 0.5);
      add(bundle(Array.from({ length: n - 1 }, (_unused, i) => ({ angle: ((i + 0.5) / (n - 1) - 0.5) * 2 * spread + jitter(), length: len * 0.62 + R, lean: -0.05, width: 1.3 })), -0.25), [0, 0, -0.025], 'z', 0.3);
      if (a.crest === 'cascade') {
        const tail = add(bundle(Array.from({ length: 7 }, (_unused, i) => ({ angle: (i - 3) * 0.1 + jitter(), length: Math.min(H * 0.75, (1.7 + random() * 0.9) * k), lean: 0, width: 0.9 })), 0.9), [0, R * 0.5, -0.05], 'x', 1);
        tail.rotation.x = -2.25 + droop * 0.2;
        swaying[swaying.length - 1].rest = tail.rotation.x;
      }
    } else if (a.crest === 'tuft') {
      add(bundle(Array.from({ length: 16 }, (_unused, i) => ({ angle: (i / 15 - 0.5) * 0.9 + jitter(), length: (1.3 + random() * 0.6) * k, lean: (random() - 0.5) * 0.5 })), -0.7 - droop), [0, R * 0.6, -0.03], 'z', 0.6);
      add(bundle(Array.from({ length: 10 }, (_unused, i) => ({ angle: (i / 9 - 0.5) * 1.6 + jitter(), length: 0.7 * k, lean: 0.2, width: 1.2 })), 0.8), [0, R * 0.6, 0.03], 'z', 0.4);
    } else {
      for (const side of [-1, 1]) {
        add(bundle(Array.from({ length: 9 }, (_unused, i) => ({ angle: side * (0.5 + i * 0.2) + jitter(), length: (1.25 - Math.abs(i - 3) * 0.1 + random() * 0.15) * k + R * 0.5, lean: -0.1 - droop * 0.4 })), -0.45 - droop), [side * R * 0.3, 0, -0.03], 'z', 0.5);
        add(bundle(Array.from({ length: 8 }, (_unused, i) => ({ angle: side * (0.6 + i * 0.2) + jitter(), length: 0.7 * k + R * 0.5, lean: -0.04, width: 1.35 })), -0.2), [side * R * 0.3, 0, -0.025], 'z', 0.3);
      }
      add(bundle(Array.from({ length: 5 }, (_unused, i) => ({ angle: (i - 2) * 0.16, length: 0.75 * k + R, lean: -0.1 })), -0.4), [0, 0, -0.03], 'z', 0.4);
    }

    if (a.streamers) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, R * 2.9, 8), wood);
      bar.rotation.z = Math.PI / 2; bar.position.y = -R - 0.08 * k; bar.castShadow = true; top.add(bar);
      const tints = [PAINT.red, PAINT.ochre, PAINT.blue, PAINT.cream, PAINT.green];
      const n = 4 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * R * 2.7, length = (0.5 + random() * 0.7) * k * (1 - wear * 0.4);
        const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.09 * k, length, 1, 6), new THREE.MeshStandardMaterial({ color: lerpHex(tints[i % tints.length], '#8f8a78', wear * 0.6), roughness: 0.85, side: THREE.DoubleSide }));
        ribbon.geometry.translate(0, -length / 2, 0); ribbon.castShadow = true;
        ribbon.position.set(x, -R - 0.08 * k, 0); ribbon.rotation.y = (random() - 0.5) * 0.8;
        if (wind) ribbon.rotation.z = -0.9;
        top.add(ribbon);
        swaying.push({ node: ribbon, axis: 'x', rest: 0, phase: random() * 6, reach: 2.4 });
        if (i % 2 === 0) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035 * k, 10, 8), s.material('#d8a93a', { metalness: 0.6, roughness: 0.35 })); bell.position.set(0, -length - 0.02, 0); bell.castShadow = true; ribbon.add(bell); }
      }
    }

    // How it stands.
    if (a.state === 'leaning') { whole.rotation.z = -(0.28 + random() * 0.12); whole.rotation.x = 0.1; }
    else if (a.state === 'snapped') {
      const Lu = L - breakAt;
      const fall = Math.acos(Math.max(-0.95, Math.min(0.2, (R * 0.55 - poleBase - breakAt) / Lu)));
      upper.rotation.set(0, 0, 0); upper.rotation.order = 'YXZ';
      upper.rotation.y = 0.5 + random() * 0.8; upper.rotation.x = fall;
      const splinter = s.material('#c9a97a', { roughness: 1 });
      for (let i = 0; i < 4; i++) { const spike = new THREE.Mesh(new THREE.ConeGeometry(0.012 * k, 0.12 + random() * 0.1, 4), splinter); spike.position.set((random() - 0.5) * 0.05, breakAt + 0.05, (random() - 0.5) * 0.05); spike.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5); whole.add(spike); }
    } else if (wind) { whole.rotation.z = -0.06; }
    else whole.rotation.z = (random() - 0.5) * 0.03;

    if (wear > 0.55) for (let i = 0; i < Math.round((wear - 0.5) * 10); i++) { const t = random() * 7; s.root.add(tuft(random, [Math.cos(t) * 0.55, 0, Math.sin(t) * 0.55], 0.25 + random() * 0.3, lerpHex('#3f7a3c', '#8aa648', random() * 0.6), 7)); }

    const speed = mix(0.5, 4.5, mood.energy) * (wind ? 1.8 : 1), amount = mix(0.015, 0.09, mood.energy) * (wind ? 1.5 : 1);
    return s.finish({
      footprint: a.state === 'snapped' ? undefined : 0.6,
      update: (_dt, time) => { for (const item of swaying) item.node.rotation[item.axis] = item.rest + Math.sin(time * speed + item.phase) * amount * item.reach; },
    });
  },
});

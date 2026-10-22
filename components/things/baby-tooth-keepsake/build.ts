import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { type ToothKind, crownGeometry, lump, paint, sweep } from './teeth';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const NAMES = ['Anna', 'Tom', 'Mia', 'Leo', 'Ruth', 'Sam', 'Ivy', 'Max', 'Nell', 'Joe', 'Ada', 'Ben'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default defineThing({
  questions: {
    container: choice('How is the tooth kept?', {
      matchbox: 'In a matchbox slid half open, on a bed of cotton wool.',
      envelope: 'In a tiny manila envelope with a name and date in pencil.',
      pillbox: 'In a round silver pillbox with a velvet lining, lid open.',
      pillow: 'Still on the bedsheet beside a pillow, waiting for the tooth fairy.',
      vial: 'In a small corked glass vial with a tied paper tag.',
    }),
    count: choice('How many teeth are there?', {
      one: 'A single tooth, the first one.',
      handful: 'A handful: four or five collected over a year or two.',
      set: 'A whole childhood set, all twenty, kept and counted.',
    }),
    tooth: choice('Which kind of milk tooth is it mostly?', {
      incisor: 'A little flat front tooth.',
      canine: 'A small pointed eye tooth.',
      molar: 'A squat baby molar.',
    }),
    exit: choice('How did it come out?', {
      clean: 'Cleanly, wobbled loose over days.',
      thread: 'Pulled with a thread: the bloody cotton is still tied round it.',
      swallowed: 'Swallowed by accident: a pencilled note of apology stands in for it.',
      tissue: 'In a rush: a crumpled tissue with a spot of blood lies beside it.',
    }),
    exchange: choice('What was left in exchange?', {
      coin: 'A shiny coin.',
      banknote: 'A folded banknote, a generous fairy.',
      glitter: 'A trail of fairy glitter.',
      letter: 'A tiny letter in curly handwriting from the tooth fairy.',
      nothing: 'Nothing: the fairy never came, or it is only a keepsake now.',
    }),
    age: score('How long ago was it lost?', ['Only last night, still fresh', 'A few years ago', 'A lifetime ago, the paper yellow and the child grown old']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = clamp01(a.age * 0.8 + mood.wear * 0.3);
    const paperTone = new THREE.Color('#f7f1df').lerp(new THREE.Color('#cdb27a'), old * 0.8);
    const paperHex = `#${paperTone.getHexString()}`;
    const name = NAMES[Math.floor(random() * NAMES.length)];
    const date = `${1 + Math.floor(random() * 28)} ${MONTHS[Math.floor(random() * 12)]} ${Math.round(mix(2024, 1931, a.age) - random() * 6)}`;
    const pencil = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, tilt = 0) => {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(tilt);
      ctx.font = `italic ${size}px "Segoe Script", "Comic Sans MS", cursive`;
      ctx.fillStyle = `rgba(60,58,62,${mix(0.9, 0.6, old)})`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    const sheet = (lines: string[], w: number, h: number, extra?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => new THREE.MeshStandardMaterial({
      map: paint(w, h, (ctx) => {
        ctx.fillStyle = paperHex; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < old * 12; i++) { ctx.fillStyle = `rgba(140,100,40,${0.05 + random() * 0.1})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 5 + random() * 20, 0, 7); ctx.fill(); }
        lines.forEach((line, index) => pencil(ctx, line, w / 2, h * (index + 1) / (lines.length + 1), Math.min(h / (lines.length + 0.6) * 0.62, w / Math.max(line.length, 4) * 1.5), (random() - 0.5) * 0.08));
        extra?.(ctx, w, h);
      }), roughness: 0.92,
    });

    // The teeth themselves.
    const size = { one: 2.3, handful: 1.75, set: 1.0 }[a.count];
    const total = { one: 1, handful: 4 + Math.floor(random() * 2), set: 20 }[a.count];
    const fresh = clamp01(1 - a.age * 2.5);
    const enamelTone = new THREE.Color('#fbfaf4').lerp(new THREE.Color('#d9c48e'), old * 0.7);
    const enamel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.18, 0.55, old) });
    const pulp = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9c1c20').lerp(new THREE.Color('#b08a5c'), 1 - fresh), roughness: mix(0.2, 0.8, 1 - fresh) });
    const DIMS: Record<string, [number, number, number]> = { incisor: [6, 6.6, 4.4], canine: [5.8, 7.4, 5], molar: [7.6, 5.2, 7] };
    const makeTooth = (kind: ToothKind, scale: number) => {
      const [w, h, d] = DIMS[kind].map((v) => v * scale * (0.9 + random() * 0.2));
      const group = new THREE.Group();
      const crown = new THREE.Mesh(crownGeometry(kind, w, h, d, { detail: 6, worn: 0.25, shade: (t) => enamelTone.clone().lerp(new THREE.Color('#c9a060'), clamp01((1 - t) * (0.25 + old * 0.4) - 0.1)) }), enamel);
      const stub = new THREE.Mesh(lump(Math.min(w, d) * 0.3, random, 0.3, 1), pulp);
      stub.scale.y = 0.45;
      stub.position.y = -h * 0.02;
      const inner = new THREE.Group();
      inner.add(crown, stub);
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(0, d / 2, h / 2);
      group.add(inner);
      group.rotation.y = random() * Math.PI * 2;
      return group;
    };
    const kinds: ToothKind[] = ['incisor', 'canine', 'molar'];
    const kindFor = (index: number): ToothKind => (index === 0 || a.count !== 'set' ? (index && random() > 0.6 ? kinds[Math.floor(random() * 3)] : a.tooth) : index < 8 ? 'incisor' : index < 12 ? 'canine' : 'molar');
    const rectSpots = (cx: number, y: number, cz: number, hx: number, hz: number, n: number) => {
      const cols = Math.max(1, Math.round(Math.sqrt(n * hx / hz))), rows = Math.ceil(n / cols);
      return Array.from({ length: n }, (_unused, i) => V(cx + (cols > 1 ? ((i % cols) / (cols - 1) - 0.5) * 2 * hx * 0.82 : 0) + (random() - 0.5) * hx * 0.12, y, cz + (rows > 1 ? (Math.floor(i / cols) / (rows - 1) - 0.5) * 2 * hz * 0.8 : 0) + (random() - 0.5) * hz * 0.12));
    };
    const absent = a.exit === 'swallowed' ? 1 : 0;
    let spots: THREE.Vector3[] = [];
    const box = new THREE.Box3();

    if (a.container === 'matchbox') {
      const out = a.count === 'set' ? 40 : 31;
      const hue = ['#c8102e', '#1f4f9a', '#1f7a4a', '#e0a020'][Math.floor(random() * 4)];
      const label = paint(256, 180, (ctx, w, h) => {
        ctx.fillStyle = hue; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = paperHex; ctx.fillRect(14, 14, w - 28, h - 28);
        ctx.fillStyle = '#e8b41c'; ctx.beginPath();
        for (let i = 0; i < 24; i++) { const r = i % 2 ? 26 : 62, t = i / 24 * Math.PI * 2; ctx.lineTo(w / 2 + Math.cos(t) * r, h * 0.46 + Math.sin(t) * r); }
        ctx.fill();
        ctx.fillStyle = hue; ctx.beginPath(); ctx.arc(w / 2, h * 0.46, 22, 0, 7); ctx.fill();
        ctx.font = 'bold 26px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('SAFETY MATCHES', w / 2, h - 26);
        for (let i = 0; i < old * 14; i++) { ctx.fillStyle = `rgba(90,70,40,${0.08 + random() * 0.12})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 4 + random() * 18, 0, 7); ctx.fill(); }
      });
      const card = s.material(hue, { roughness: 0.8 });
      s.box([52, 0.8, 36], [0, 16.6, 0], new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 }));
      s.box([52, 0.8, 36], [0, 0.4, 0], card);
      for (const z of [-1, 1]) s.box([52, 17, 0.8], [0, 8.5, z * 17.6], s.material('#4a3226', { roughness: 0.95 }));
      const tray = s.material(old > 0.5 ? '#c9b78e' : '#e9dfc6', { roughness: 0.9 });
      s.box([50, 0.8, 33.4], [out, 1.3, 0], tray);
      for (const z of [-1, 1]) s.box([50, 13, 0.8], [out, 7.5, z * 16.3], tray);
      for (const x of [-1, 1]) s.box([0.8, 13, 33.4], [out + x * 24.6, 7.5, 0], tray);
      const wool = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbfbf8').lerp(new THREE.Color('#d8cdb0'), old * 0.6), roughness: 1 });
      const exposed = out - 1;
      for (let i = 0; i < 3; i++) { const puff = s.mesh(lump(13, random, 0.14, 2), wool, [26 + exposed * (0.2 + i * 0.3), 6.5, (random() - 0.5) * 5]); puff.scale.set(0.9, 0.42, 1.15); }
      spots = rectSpots(26 + exposed / 2 + 1, 10.6, 0, exposed / 2 - 3, 12, total);
      box.set(V(-26, 0, -18), V(out + 25, 17, 18));
    } else if (a.container === 'envelope') {
      const front = sheet([name, date, a.count === 'one' ? '1st tooth' : `${total} teeth`], 256, 160);
      const body = s.box([50, 0.9, 32], [0, 0.5, 0], [front, front, front, front, front, front] as unknown as THREE.Material);
      body.material = [s.material(paperHex), s.material(paperHex), front, s.material(paperHex), s.material(paperHex), s.material(paperHex)] as unknown as THREE.Material;
      body.rotation.set(0.85, 0, 0);
      body.position.set(0, 12.4, 0);
      const block = s.box([22, 22, 22], [3, 11, -22.5], s.material(['#d8342a', '#2f6fd0', '#2f9e55', '#e6b422'][Math.floor(random() * 4)], { roughness: 0.6 }));
      block.rotation.y = (random() - 0.5) * 0.3;
      const face = s.label(name[0], 17, 17, [3, 22.15, -22.5], '#3a2c22', '#f1e2bc');
      face.rotation.set(-Math.PI / 2, 0, block.rotation.y);
      const flap = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 30), s.material(`#${paperTone.clone().offsetHSL(0, 0, -0.06).getHexString()}`, { roughness: 0.9 }));
      leaf.position.x = 7;
      flap.add(leaf);
      flap.position.set(25, 0.9, 0);
      flap.rotation.z = mix(0.5, 1.1, random());
      body.add(flap);
      spots = a.count === 'one' ? [V(-4 + random() * 8, 0, 20)] : rectSpots(0, 0, a.count === 'set' ? 26 : 22, a.count === 'set' ? 24 : 16, a.count === 'set' ? 12 : 7, total);
      box.set(V(-27, 0, -34), V(27, 26, a.count === 'set' ? 40 : 30));
    } else if (a.container === 'pillbox') {
      const silver = s.material('#d0d4d8', { metalness: 0.85, roughness: mix(0.18, 0.5, old), emissive: '#3a3f46', emissiveIntensity: 0.25 });
      const R = a.count === 'set' ? 23 : a.count === 'handful' ? 20 : 16;
      s.lathe([[0, 0], [R, 0], [R + 0.8, 1], [R + 0.8, 8], [R - 0.6, 8], [R - 0.6, 2.2], [0, 2.2]], silver);
      const velvet = s.material(mood.warmth > 0.5 ? '#7a1830' : '#1f2f6e', { roughness: 1 });
      s.cylinder(R - 0.8, R - 0.8, 1.6, [0, 3, 0], velvet, 32);
      const lid = new Sculpture(context);
      const engraved = new THREE.MeshStandardMaterial({ map: paint(128, 128, (ctx, w) => {
        ctx.fillStyle = '#c9cdd2'; ctx.fillRect(0, 0, w, w);
        ctx.strokeStyle = '#7d848c'; ctx.lineWidth = 3;
        for (const r of [56, 44]) { ctx.beginPath(); ctx.arc(w / 2, w / 2, r, 0, 7); ctx.stroke(); }
        for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(w / 2 + Math.cos(t) * 22, w / 2 + Math.sin(t) * 22, 16, 7, t, 0, 7); ctx.stroke(); }
      }), metalness: 0.8, roughness: mix(0.22, 0.5, old) });
      const cap = lid.cylinder(R + 1.2, R + 1.2, 3, [0, R + 1.2, 0], [silver, engraved, velvet] as unknown as THREE.Material, 32);
      cap.rotation.x = Math.PI / 2;
      lid.root.position.set(0, 8, -R - 0.5);
      lid.root.rotation.x = -mix(0.15, 0.5, random());
      s.root.add(lid.root);
      const n = total;
      spots = n === 1 ? [V(0, 3.8, 0)] : Array.from({ length: n }, (_unused, i) => { const ring = i === 0 ? 0 : i < 7 ? 0.42 : 0.8, t = i * 2.4 + random() * 0.3; return V(Math.cos(t) * ring * (R - 4), 3.8 + (i > 12 ? 1.5 : 0), Math.sin(t) * ring * (R - 4)); });
      box.set(V(-R - 2, 0, -R - 6), V(R + 2, 30, R + 2));
    } else if (a.container === 'pillow') {
      const ticking = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = old > 0.5 ? '#efe7d2' : '#fbfaf5'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = mood.warmth > 0.5 ? 'rgba(214,120,130,0.55)' : 'rgba(110,140,200,0.55)';
        for (let x = 8; x < w; x += 32) { ctx.fillRect(x, 0, 5, h); ctx.fillRect(x + 9, 0, 2, h); }
      });
      const geometry = new THREE.BoxGeometry(84, 26, 56, 16, 4, 12);
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) / 42, z = position.getZ(i) / 28;
        const puff = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x), 3.2)), 0.6) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z), 3.2)), 0.6);
        position.setY(i, position.getY(i) * (0.08 + 0.92 * puff) + Math.sin(x * 9) * Math.cos(z * 7) * 0.8 * puff);
        position.setX(i, position.getX(i) * (1 + 0.04 * (1 - Math.abs(z)))); position.setZ(i, position.getZ(i) * (1 + 0.04 * (1 - Math.abs(x))));
      }
      geometry.computeVertexNormals();
      const pillow = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: ticking, roughness: 0.95 }), [-10, 12, -26]);
      pillow.rotation.set(-0.1, 0.25 + (random() - 0.5) * 0.2, 0.04);
      const linen = s.box([112, 1.2, 104], [4, -0.6, -4], s.material(mood.warmth > 0.5 ? '#f3e6dc' : '#e3eaf2', { roughness: 0.98 }));
      linen.rotation.y = 0.04;
      spots = rectSpots(a.count === 'set' ? 8 : 16, 0, 24, a.count === 'set' ? 30 : 12, a.count === 'set' ? 14 : 10, total);
      box.set(V(-20, 0, 8), V(38, 20, 40));
    } else {
      const R = a.count === 'set' ? 16 : 12, tall = a.count === 'set' ? 50 : 38;
      const glass = new THREE.MeshStandardMaterial({ color: '#e6f3f2', transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide });
      const wall = s.mesh(new THREE.CylinderGeometry(R, R, tall, 28, 1, true), glass, [0, tall / 2, 0]);
      wall.renderOrder = 3;
      s.cylinder(R, R * 0.96, 2, [0, 1, 0], s.material('#d9e8e7', { roughness: 0.12 }), 28);
      s.ring(R, 0.8, [0, tall, 0], s.material('#eef6f5', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      s.cylinder(R * 1.02, R * 0.86, 10, [0, tall + 2, 0], s.material('#b98a54', { roughness: 0.95 }), 16);
      const tagPaint = sheet([name, date], 160, 96);
      const tag = s.box([22, 0.4, 13], [R + 16, 0.3, 10], tagPaint);
      tag.rotation.y = -0.4 + random() * 0.5;
      s.mesh(sweep([V(R * 0.9, tall - 5, 2), V(R + 6, tall * 0.4, 6), V(R + 8, 1, 9)], () => 0.35, { radial: 5 }), s.material('#b9a06a'));
      s.ring(R + 0.3, 0.4, [0, tall - 5, 0], s.material('#b9a06a')).rotation.x = Math.PI / 2;
      spots = Array.from({ length: total }, (_unused, i) => { const t = random() * 7, r = Math.sqrt(random()) * (R - 5); return V(Math.cos(t) * r, 2.2 + Math.floor(i / 3) * 4.5, Math.sin(t) * r); });
      box.set(V(-R, 0, -R), V(R + 28, tall + 7, R + 10));
    }

    const placed: THREE.Group[] = [];
    spots.forEach((at, index) => {
      if (index < absent) return;
      const tooth = makeTooth(kindFor(index), size * (a.container === 'vial' ? 0.7 : 1));
      tooth.position.copy(at);
      if (a.container === 'vial') tooth.rotation.x = (random() - 0.5) * 1.2;
      s.root.add(tooth);
      placed.push(tooth);
    });

    const blood = new THREE.Color('#8a0b14').lerp(new THREE.Color('#4a2a1a'), 1 - fresh);
    const right = box.max.x - 26, front = box.max.z + 32;
    if (a.exit === 'thread' && placed.length) {
      const from = placed[0].position.clone().add(V(0, 2.5 * size, 0));
      const end = V(right + 18, 0.4, front - 6);
      const path = [from, from.clone().add(V(4, 3, 4)), from.clone().lerp(end, 0.35).setY(a.container === 'vial' ? box.max.y + 4 : Math.max(0.5, from.y * 0.5 + 6)), from.clone().lerp(end, 0.7).add(V(-6, 0, 12)).setY(0.5), end, end.clone().add(V(-9, 0, -9)), end.clone().add(V(-3, 0, -15)), end.clone().add(V(6, 0, -8))];
      s.mesh(sweep(path, () => 0.42, { radial: 5, steps: 70, color: (t) => new THREE.Color('#f4f1e8').lerp(blood, clamp01(1 - t * 5)) }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
      s.ball([2.4 * size, 1.2 * size, 2.4 * size], [from.x, from.y - 1.2 * size, from.z], new THREE.MeshStandardMaterial({ color: blood, roughness: 0.3 }), 10);
    }
    if (a.exit === 'swallowed') {
      const note = s.box([34, 0.4, 24], [right + 16, 0.3, front - 22], sheet(['I swallowed', 'my tooth', 'SORRY'], 256, 176));
      note.rotation.y = -0.25 + random() * 0.3;
    }
    if (a.exit === 'tissue') {
      const r = 12;
      const tissue = s.mesh(lump(r, random, 0.28, 3, (v) => new THREE.Color('#fbfaf6').lerp(blood, clamp01(1.3 - Math.hypot(v.x - 4, v.z + 2) / 5.5))), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), [right + 11, 3.4, front - 16]);
      tissue.scale.set(1.15, 0.4, 0.9);
      tissue.rotation.y = random() * 3;
    }

    // What the fairy left.
    const left = box.min.x + 30;
    const sparkles: { mesh: THREE.InstancedMesh; data: { at: THREE.Vector3; size: number; phase: number; spin: number }[] } | null = a.exchange === 'glitter' ? { mesh: null as unknown as THREE.InstancedMesh, data: [] } : null;
    if (a.exchange === 'coin') {
      const coins = 1 + Math.round(mood.cheer * 1.4 + mood.density * 0.8);
      for (let i = 0; i < coins; i++) {
        const gold = random() > 0.5;
        const metal = s.material(gold ? '#d8a932' : '#c9ced3', { metalness: 0.85, roughness: mix(0.2, 0.55, old), emissive: gold ? '#7a5208' : '#3a3f46', emissiveIntensity: 0.3 });
        const r = 9 + random() * 3;
        const at: [number, number, number] = [left - r - i * 5 + random() * 4, 0.9 + i * 1.8, front - 18 + i * 7];
        s.cylinder(r, r, 1.8, at, metal, 28).rotation.y = random() * 3;
        s.ring(r * 0.78, 0.5, [at[0], at[1] + 0.9, at[2]], metal).rotation.x = Math.PI / 2;
      }
    } else if (a.exchange === 'banknote') {
      const note = paint(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#b9d2a4'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#2f5a35'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#4a7a4f'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 34, 44, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#2f5a35'; ctx.font = 'bold 40px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('5', 40, h / 2); ctx.fillText('5', w - 40, h / 2);
      });
      const money = new THREE.MeshStandardMaterial({ map: note, roughness: 0.85 });
      const lowerHalf = s.box([32, 0.6, 16], [left - 18, 0.4, front - 16], money);
      lowerHalf.rotation.y = 0.3;
      const upperHalf = s.box([32, 0.6, 16], [left - 18, 2.2, front - 15], money);
      upperHalf.rotation.set(0.14, 0.34, 0);
    } else if (a.exchange === 'letter') {
      const letter = s.box([26, 0.4, 34], [left - 15, 0.3, front - 20], sheet([`Dear ${name},`, 'thank you', 'for your tooth', '~ T.F. ~'], 200, 256, (ctx, w) => {
        ctx.fillStyle = '#d9a520'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 15, t = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(w - 30 + Math.cos(t) * r, 28 + Math.sin(t) * r); }
        ctx.fill();
      }));
      letter.rotation.y = 0.2 + random() * 0.3;
    } else if (sparkles) {
      const count = Math.round(50 + mood.cheer * 60 + mood.density * 40);
      const hues = ['#ffd94a', '#ff8ad0', '#8ad8ff', '#ffffff', '#c9a0ff'];
      const focus = placed[0]?.position ?? spots[0] ?? V(0, 0, 0);
      const mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0.3, emissive: '#ffe9a0', emissiveIntensity: mix(0.35, 0.9, mood.cheer), flatShading: true }), count);
      for (let i = 0; i < count; i++) {
        const t = Math.pow(random(), 0.7), sweepAngle = 2.4 + t * 2.2;
        const at = V(focus.x, 0, focus.z).add(V(Math.cos(sweepAngle) * t * 70 + (random() - 0.5) * 16 * (0.3 + t), 0, Math.sin(sweepAngle) * -t * 55 + 20 * t + (random() - 0.5) * 16 * (0.3 + t)));
        const inside = box.containsPoint(V(at.x, 1, at.z));
        at.y = inside ? focus.y + 1 + random() * 2 : 0.5 + random() * 0.4;
        if (inside && a.container !== 'pillow' && Math.hypot(at.x - focus.x, at.z - focus.z) > 8) at.set(left - random() * 40, 0.6, front - random() * 50);
        sparkles.data.push({ at, size: mix(0.6, 1.8, random() * random()), phase: random() * 6, spin: random() * 3 });
        mesh.setColorAt(i, new THREE.Color(hues[Math.floor(random() * hues.length)]));
      }
      mesh.instanceColor!.needsUpdate = true;
      sparkles.mesh = mesh;
      s.root.add(mesh);
    }

    s.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = ([mesh.material].flat()[0] as THREE.Material).depthWrite;
    });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const twinkle = (time: number) => {
      if (!sparkles) return;
      sparkles.data.forEach((spark, index) => {
        const pulse = 0.65 + 0.35 * Math.sin(time * mix(1, 6, mood.energy) + spark.phase);
        q.setFromEuler(new THREE.Euler(spark.spin, spark.spin * 2 + time * mood.energy, 0));
        m.compose(spark.at, q, V(spark.size * pulse, spark.size * pulse * 0.5, spark.size * pulse));
        sparkles.mesh.setMatrixAt(index, m);
      });
      sparkles.mesh.instanceMatrix.needsUpdate = true;
    };
    twinkle(0);
    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_babytooth_3';
    outer.add(thing.object);
    outer.scale.setScalar(0.001 * (({ macro: 1, tabletop: 1.2 } as Record<string, number>)[context.scale] ?? 6));
    return { object: outer, update: (_dt, time) => twinkle(time), dispose: thing.dispose };
  },
});

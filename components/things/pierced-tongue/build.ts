import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Mouth, mouthAt, mouthCurves, mouthOutline } from './lips';
import { blend, bump, paint, relief, stain, trace } from './relief';

const SKIN = { porcelain: '#f3d6c6', honey: '#deaa86', olive: '#bd8a62', deep: '#74462f' } as const;

interface Path { at(t: number): THREE.Vector3; up(t: number): THREE.Vector3; }

/** A tongue-like loft: flattened rings along a path, with a groove down the top and a rounded tip. */
function loft(path: Path, half: (t: number) => number, thick: (t: number) => number, groove: number, t0 = 0, t1 = 1, vSpan: readonly [number, number] = [0, 1]) {
  const rings = 44, around = 28;
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const side = new THREE.Vector3(1, 0, 0);
  for (let j = 0; j <= rings; j++) {
    const f = j / rings, t = mix(t0, t1, f);
    const centre = path.at(t), up = path.up(t), w = half(f), h = thick(f);
    for (let i = 0; i <= around; i++) {
      const phi = (i / around) * Math.PI * 2, c = Math.cos(phi), sn = Math.sin(phi);
      // Flat underside, fuller top, a soft channel down the middle.
      let lift = sn * h * (sn > 0 ? 1 : 0.7);
      if (sn > 0) lift -= groove * h * Math.exp(-((c / 0.28) ** 2)) * sn;
      const p = centre.clone().addScaledVector(side, c * w).addScaledVector(up, lift);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / around, mix(vSpan[0], vSpan[1], f));
    }
  }
  const stride = around + 1;
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < around; i++) {
      const a = j * stride + i, b = a + 1, c = a + stride + 1, d = a + stride;
      index.push(a, b, d, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    jewellery: choice('What is through the tongue?', {
      steel: 'One polished steel ball stud in the middle.',
      glow: 'A chunky acrylic ball that glows acid green.',
      double: 'Two studs side by side, like snake eyes.',
      ring: 'A ring through the very tip.',
      hole: 'Nothing yet: a fresh red hole with a bead of blood, the needle just out.',
    }),
    state: choice('What state is the tongue in?', {
      pink: 'Healthy wet pink.',
      swollen: 'Swollen and dark red around a new piercing, fat and sore.',
      candy: 'Stained bright blue down the middle by a sweet.',
      split: 'Split into a fork at the tip, each half moving apart.',
    }),
    attitude: choice('What is the tongue saying?', {
      cheeky: 'Cheeky: poked out and tilted to one side above a grin.',
      defiant: 'Defiant: thrust all the way down to the chin, mouth wide, rock-gig rude.',
      tasting: 'Tasting: reaching forward and curling up at the tip to catch something.',
      panting: 'Panting: hanging loose and long, dripping.',
    }),
    touching: choice('What is the tongue touching?', {
      nothing: 'Nothing but air.',
      lolly: 'A bright ice lolly on a stick, melting.',
      stamp: 'A postage stamp stuck to the tip, being licked.',
      snowflake: 'A big snowflake that has just landed on it, with more falling.',
    }),
    teeth: choice('What teeth show above the tongue?', {
      none: 'None, only the dark of the mouth.',
      neat: 'A neat white row of upper teeth.',
      braces: 'Teeth in train-track braces with coloured bands.',
      fangs: 'Two long pointed fangs.',
    }),
    skin: choice('What skin surrounds the mouth?', {
      porcelain: 'Pale porcelain pink.',
      honey: 'Warm honey beige.',
      olive: 'Olive tan.',
      deep: 'Deep brown.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = SKIN[a.skin];
    const lipTint = blend(skin, a.skin === 'deep' ? '#8a4a4a' : '#c9606a', 0.62);

    const m: Mouth = { W: 0.066, Hu: 0.019, Hl: 0.024, bow: 0.4, gap: 0.046, smile: mix(0, 0.1, mood.cheer), Du: 0.012, Dl: 0.015 };
    if (a.attitude === 'cheeky') { m.gap = 0.036; m.smile += 0.14; m.W = 0.072; }
    if (a.attitude === 'defiant') { m.gap = 0.062; m.W = 0.07; m.smile -= 0.04; }
    if (a.attitude === 'tasting') { m.gap = 0.04; m.W = 0.058; }
    if (a.attitude === 'panting') { m.gap = 0.052; m.smile += 0.05; }
    const curves = mouthCurves(m);
    const outline = mouthOutline(m);
    const lineY = (curves.upperEdge(0) + curves.lowerEdge(0)) / 2;

    const PW = 0.25, PH = 0.2, CY = -0.012;
    const skinZ = (x: number, y: number) => -1.5 * x * x - 0.9 * (y - CY) * (y - CY) + 0.014 * bump(Math.hypot(x, (y - CY) * 1.2), 0.08) + 0.007 * bump(Math.hypot(x, y - CY + 0.078), 0.035);
    const rim = (x: number, y: number) => 1 - Math.abs(x / 0.115) ** 2.6 - Math.abs((y - CY) / 0.094) ** 2.6;
    const plaque = relief(PW, PH, 110, (x, y) => {
      if (rim(x, y) < 0) return null;
      return skinZ(x, y) - (mouthAt(m, x, y).part === 'gap' ? 0.02 : 0);
    }, (x, y) => skinZ(x, y) - 0.024, rim);
    const skinMap = paint(PW, PH, 512, (ctx) => {
      ctx.fillStyle = skin;
      ctx.fillRect(-PW / 2, -PH / 2, PW, PH);
      for (let i = 0; i < 60; i++) stain(ctx, (random() - 0.5) * PW, (random() - 0.5) * PH, 0.012, 0.012, random() < 0.5 ? '#c96a5a' : '#fff1e0', 0.06);
      stain(ctx, 0, curves.bottom(0) - 0.014, 0.045, 0.012, '#5a2a22', 0.25);
      for (const side of [-1, 1]) stain(ctx, side * (m.W + 0.012), curves.upperEdge(side) + 0.004, 0.012, 0.02, '#5a2a22', 0.22);
      for (let i = 0; i < 40 * mood.wear; i++) stain(ctx, (random() - 0.5) * PW, (random() - 0.5) * PH, 0.006, 0.006, '#6f675a', 0.2);
      trace(ctx, outline);
      ctx.fillStyle = '#2a070c';
      ctx.fill();
      stain(ctx, 0, lineY - m.gap * 0.1, m.W * 0.7, m.gap * 0.5, '#8a1f2c', 0.6);
    });
    const form = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = form) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(plaque.front, new THREE.MeshStandardMaterial({ map: skinMap, roughness: 0.7 }));
    add(plaque.shell, s.material(blend(skin, '#5a3a30', 0.25), { roughness: 0.8 }));

    const LW = m.W * 2.06, LH = (curves.top(0.3) - curves.bottom(0)) * 1.2 + 0.012, LY = (curves.top(0.3) + curves.bottom(0)) / 2;
    const lips = relief(LW, LH, 130, (x, y) => {
      const q = mouthAt(m, x, y + LY);
      return q.part === 'upper' || q.part === 'lower' ? skinZ(x, y + LY) + q.z + 0.0006 : null;
    });
    const lipMap = paint(LW, LH, 512, (ctx) => {
      ctx.translate(0, -LY);
      ctx.fillStyle = lipTint;
      ctx.fillRect(-LW, -1, LW * 2, 2);
      ctx.lineWidth = 0.0006;
      for (let i = 0; i < 50; i++) {
        const u = (random() - 0.5) * 1.8, x = u * m.W, up = random() < 0.45;
        const from = up ? curves.upperEdge(u) : curves.lowerEdge(u), to = up ? curves.top(u) : curves.bottom(u);
        ctx.strokeStyle = `rgba(60,10,16,${0.12 + random() * 0.16})`;
        ctx.beginPath(); ctx.moveTo(x, from + (to - from) * 0.08); ctx.lineTo(x, from + (to - from) * mix(0.45, 0.95, random())); ctx.stroke();
      }
      for (const side of [-1, 1]) stain(ctx, side * m.W * 0.45, curves.lowerEdge(side * 0.45) - m.Hl * 0.5, m.W * 0.2, m.Hl * 0.18, '#ffffff', 0.4);
    });
    add(lips.front, new THREE.MeshPhysicalMaterial({ map: lipMap, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }));

    // Teeth, set back in the dark behind the upper lip.
    if (a.teeth !== 'none') {
      const enamel = s.material(blend('#f6f1e4', '#d8c48a', mood.wear * 0.6), { roughness: 0.25 });
      const steel = s.material('#cfd4d8', { metalness: 0.9, roughness: 0.25 });
      const bands = ['#ff4f9a', '#3ec7ff', '#8be04a', '#ffd23e'];
      const widths = [0.0095, 0.0095, 0.008, 0.0085, 0.008, 0.0085];
      let wire: [number, number, number][] = [];
      for (const side of [-1, 1]) {
        let x = 0;
        for (let i = 0; i < 3; i++) {
          const w = widths[i * 2], cx = side * (x + w / 2);
          x += w + 0.0006;
          if (Math.abs(cx) > m.W * 0.8) continue;
          const fang = i === 2;
          if (a.teeth === 'fangs' && !fang && i === 1) continue;
          const long = (a.teeth === 'fangs' && fang ? 0.03 : fang ? 0.014 : 0.015 - i * 0.0015) * mix(0.92, 1.05, random());
          const top = curves.upperEdge(cx / m.W) + 0.004, z = skinZ(cx, top) - 0.006 - Math.abs(cx) * 0.12;
          const geometry = a.teeth === 'fangs' && fang ? new THREE.ConeGeometry(w * 0.52, long, 12) : new THREE.CapsuleGeometry(w * 0.47, Math.max(long - w, 0.001), 4, 10);
          const tooth = add(geometry, enamel);
          tooth.position.set(cx, top - long / 2, z);
          tooth.scale.z = 0.55;
          if (a.teeth === 'fangs' && fang) tooth.rotation.x = Math.PI;
          if (a.teeth === 'braces') {
            const bracket = add(new THREE.BoxGeometry(0.0034, 0.0034, 0.002), steel);
            bracket.position.set(cx, top - long * 0.55, z + w * 0.3);
            const band = add(new THREE.TorusGeometry(0.0022, 0.0007, 6, 12), s.material(bands[Math.floor(random() * 4)], { roughness: 0.4 }));
            band.position.copy(bracket.position).add(new THREE.Vector3(0, 0, 0.001));
            wire.push([cx, top - long * 0.55, z + w * 0.3 + 0.001]);
          }
        }
      }
      if (wire.length > 2) { wire = wire.sort((p, q) => p[0] - q[0]); const tube = new Sculpture(context); tube.tube(wire, 0.0005, steel); form.add(tube.root); }
    }

    // The tongue: a path that leaves the mouth, clears the lower lip and bends.
    const L = { cheeky: 0.07, defiant: 0.118, tasting: 0.074, panting: 0.1 }[a.attitude] * (a.state === 'swollen' ? 0.92 : 1);
    const bend = { cheeky: 1.35, defiant: 1.75, tasting: -0.75, panting: 1.9 }[a.attitude];
    const lean = a.attitude === 'cheeky' ? (random() < 0.5 ? -1 : 1) * mix(0.25, 0.5, random()) : a.attitude === 'panting' ? (random() - 0.5) * 0.5 : (random() - 0.5) * 0.1;
    const rootY = curves.lowerEdge(0) + 0.011, rootZ = skinZ(0, rootY) - 0.014;
    const angle = (t: number) => -0.25 + (bend + 0.25) * (a.attitude === 'tasting' ? Math.max(0, (t - 0.45) / 0.55) ** 1.6 : Math.min(1, Math.max(0, (t - 0.2) / 0.55)) ** 1.3) + (a.attitude === 'cheeky' ? -0.9 * Math.max(0, (t - 0.8) / 0.2) : 0);
    const samples: THREE.Vector3[] = [new THREE.Vector3(0, rootY, rootZ)];
    const N = 80;
    for (let i = 1; i <= N; i++) {
      const t = (i - 0.5) / N, th = angle(t), prev = samples[i - 1];
      samples.push(new THREE.Vector3(prev.x + (L / N) * lean * t * 1.4, prev.y - (L / N) * Math.sin(th), prev.z + (L / N) * Math.cos(th)));
    }
    const path: Path = {
      at(t) { const f = Math.min(Math.max(t, 0), 1) * N, i = Math.min(Math.floor(f), N - 1); return samples[i].clone().lerp(samples[i + 1], f - i); },
      up(t) { const th = angle(t); return new THREE.Vector3(0, Math.cos(th), Math.sin(th)); },
    };
    const fat = a.state === 'swollen' ? 1.28 : 1;
    const HW = { cheeky: 0.027, defiant: 0.033, tasting: 0.025, panting: 0.03 }[a.attitude] * mix(1, 1.1, a.state === 'swollen' ? 1 : 0);
    const split = a.state === 'split';
    const bodyEnd = split ? 0.68 : 1;
    const round = (f: number, from: number) => (f < from ? 1 : Math.sqrt(Math.max(0, 1 - ((f - from) / (1 - from)) ** 2)));
    const half = (f: number) => HW * mix(0.86, 1, Math.sin(Math.min(f * 2.2, 1) * Math.PI * 0.5)) * mix(1, 0.8, f) * (split ? 1 : round(f, 0.72));
    const thick = (f: number) => 0.0082 * fat * mix(1.15, 0.72, f) * (split ? 1 : mix(0.35, 1, round(f, 0.8)));
    const tongueMap = paint(1, 1, 512, (ctx) => {
      // u runs round the tongue (top centre at 0.25), v from root to tip.
      const top = -0.25;
      const pink = a.state === 'swollen' ? '#c2374a' : '#e8707e';
      ctx.fillStyle = pink;
      ctx.fillRect(-0.5, -0.5, 1, 1);
      ctx.fillStyle = blend(pink, '#7a2a44', 0.45);
      ctx.fillRect(0, -0.5, 0.5, 1);
      for (let i = 0; i < 900; i++) {
        const x = top + (random() - 0.5) * 0.46, y = random() - 0.5;
        ctx.fillStyle = random() < 0.6 ? 'rgba(255,214,214,0.5)' : 'rgba(150,30,50,0.4)';
        ctx.beginPath(); ctx.ellipse(x, y, 0.004, 0.0035, 0, 0, 7); ctx.fill();
      }
      stain(ctx, top, -0.3, 0.2, 0.3, '#fff4ec', 0.3);
      if (a.state === 'candy') {
        const dye = ['#1c7cf0', '#1c7cf0', '#7a35e0', '#18b06a'][Math.floor(random() * 4)];
        ctx.globalAlpha = 0.9; ctx.fillStyle = dye; ctx.fillRect(top - 0.15, -0.5, 0.3, 0.9); ctx.globalAlpha = 1;
        for (let i = 0; i < 12; i++) stain(ctx, top + (random() < 0.5 ? -0.16 : 0.16), random() - 0.5, 0.07, 0.1, dye, 0.8);
      }
      if (a.state === 'swollen') { stain(ctx, top, 0.02, 0.2, 0.2, '#7a0f22', 0.6); for (let i = 0; i < 10; i++) stain(ctx, top + (random() - 0.5) * 0.3, random() - 0.5, 0.03, 0.03, '#f4c8c0', 0.25); }
      ctx.strokeStyle = 'rgba(120,20,40,0.55)'; ctx.lineWidth = 0.012;
      ctx.beginPath(); ctx.moveTo(top, -0.5); ctx.lineTo(top, 0.42); ctx.stroke();
      for (let i = 0; i < 26 * mood.wear; i++) stain(ctx, top + (random() - 0.5) * 0.4, random() - 0.5, 0.03, 0.02, '#e9e2c8', 0.35);
    });
    const wet = new THREE.MeshPhysicalMaterial({ map: tongueMap, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25 });
    const tongue = new THREE.Group();
    tongue.position.copy(samples[0]);
    const inner = new THREE.Group();
    inner.position.copy(samples[0]).negate();
    tongue.add(inner);
    form.add(tongue);
    add(loft(path, half, thick, 0.45, 0, bodyEnd, [0, bodyEnd]), wet, inner);
    if (split) for (const side of [-1, 1]) {
      const fork: Path = {
        at: (t) => { const f = (t - bodyEnd) / (1 - bodyEnd); return path.at(t).add(new THREE.Vector3(side * (HW * 0.5 * 0.8 + f * f * HW * 0.55), 0, 0)); },
        up: (t) => path.up(t),
      };
      const w0 = half(1) * 0.52;
      add(loft(fork, (f) => w0 * mix(1, 0.75, f) * round(f, 0.6), (f) => thick(1) * mix(1, 0.4, f * f), 0.1, bodyEnd, 1, [bodyEnd, 1]), wet, inner);
    }
    const surface = (t: number, across = 0) => path.at(t).addScaledVector(path.up(t), thick(Math.min(t / bodyEnd, 1)) * (1 - 0.45 * Math.exp(-((across / 0.28) ** 2)))).add(new THREE.Vector3(across * half(Math.min(t / bodyEnd, 1)), 0, 0));
    const under = (t: number, across = 0) => path.at(t).addScaledVector(path.up(t), -thick(Math.min(t / bodyEnd, 1)) * 0.7).add(new THREE.Vector3(across * half(Math.min(t / bodyEnd, 1)), 0, 0));

    // Jewellery.
    const steel = s.material('#e6e9ec', { metalness: 1, roughness: 0.12 });
    const glow = s.material('#b4ff3c', { emissive: '#9dff1e', emissiveIntensity: mix(0.7, 1.6, 1 - mood.daylight * 0.5), roughness: 0.25 });
    const studAt = a.attitude === 'defiant' ? 0.5 : a.attitude === 'tasting' ? 0.52 : 0.56;
    const stud = (across: number, material: THREE.Material, size: number) => {
      const top = surface(studAt, across), bottom = under(studAt, across), up = path.up(studAt);
      const ball = add(new THREE.SphereGeometry(size, 20, 14), material, inner);
      ball.position.copy(top).addScaledVector(up, size * 0.7);
      const post = new Sculpture(context);
      post.rod(top.toArray(), bottom.clone().addScaledVector(up, -0.003).toArray(), 0.0012, steel);
      inner.add(post.root);
      const lower = add(new THREE.SphereGeometry(size * 0.75, 14, 10), steel, inner);
      lower.position.copy(bottom).addScaledVector(up, -0.004);
    };
    const sore = (across: number, strength: number) => {
      const mark = add(new THREE.SphereGeometry(1, 14, 10), s.material(blend('#b01228', '#5a0a16', strength), { roughness: 0.4 }), inner);
      mark.position.copy(surface(studAt, across));
      mark.scale.set(0.0055, 0.0012, 0.0055);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), path.up(studAt));
    };
    if (a.jewellery === 'steel') stud(0, steel, 0.0082);
    if (a.jewellery === 'glow') stud(0, glow, 0.0105);
    if (a.jewellery === 'double') for (const side of [-0.42, 0.42]) stud(side, steel, 0.0062);
    if (a.state === 'swollen' && a.jewellery !== 'ring') for (const side of a.jewellery === 'double' ? [-0.42, 0.42] : [0]) sore(side, 0.2);
    if (a.jewellery === 'ring') {
      const t = split ? 0.6 : 0.9, c = path.at(t), ringMesh = add(new THREE.TorusGeometry(0.011, 0.0017, 8, 32), steel, inner);
      const th = angle(t);
      ringMesh.position.copy(c).add(new THREE.Vector3(0, -Math.sin(th), Math.cos(th)).multiplyScalar(0.008));
      ringMesh.rotation.set(th, Math.PI / 2, 0, 'XYZ');
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
      ringMesh.rotateY(0); ringMesh.rotateX(-th);
      const bead = add(new THREE.SphereGeometry(0.0036, 12, 8), steel, inner);
      bead.position.copy(ringMesh.position).add(new THREE.Vector3(0, -Math.sin(th), Math.cos(th)).multiplyScalar(0.011));
    }
    if (a.jewellery === 'hole') {
      sore(0, 0.9);
      const blood = s.material('#a80a1c', { roughness: 0.15 });
      const drop = add(new THREE.SphereGeometry(0.0028, 12, 8), blood, inner);
      drop.position.copy(surface(studAt + 0.06, 0.05));
      drop.scale.y = 0.6;
      // The piercing needle, laid across the stand beside it.
      const needle = new Sculpture(context);
      needle.rod([0.03, 0.007, 0.03], [0.085, 0.004, 0.012], 0.0011, steel, 0.0002);
      needle.rod([0.012, 0.008, 0.036], [0.03, 0.007, 0.03], 0.0032, s.material('#3fb6d8', { roughness: 0.4 }));
      s.root.add(needle.root);
    }

    // What the tip meets.
    const tipT = split ? 0.66 : 0.9;
    const flakes: THREE.Object3D[] = [];
    let lollyTip: THREE.Vector3 | null = null;
    if (a.touching === 'stamp') {
      const stamp = paint(0.024, 0.03, 128, (ctx) => {
        ctx.fillStyle = '#f5f0e0'; ctx.fillRect(-0.012, -0.015, 0.024, 0.03);
        ctx.fillStyle = ['#b8322e', '#2f5fa8', '#2f8a56', '#7a3f9a'][Math.floor(random() * 4)]; ctx.fillRect(-0.0095, -0.0125, 0.019, 0.025);
        ctx.fillStyle = '#f5f0e0'; ctx.beginPath(); ctx.arc(0, 0.002, 0.0055, 0, 7); ctx.fill(); ctx.fillRect(-0.004, -0.009, 0.008, 0.007);
        ctx.fillStyle = '#f5f0e0'; for (let i = 0; i < 9; i++) { for (const e of [-0.015, 0.015]) { ctx.beginPath(); ctx.arc(-0.012 + i * 0.003, e, 0.001, 0, 7); ctx.fill(); } }
      });
      const paper = add(new THREE.PlaneGeometry(0.024, 0.03, 4, 4), new THREE.MeshStandardMaterial({ map: stamp, roughness: 0.8, side: THREE.DoubleSide }), inner);
      const t = tipT - 0.12, up = path.up(t);
      paper.position.copy(surface(t, 0.1)).addScaledVector(up, 0.0012);
      paper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
      paper.rotateZ((random() - 0.5) * 0.8);
    }
    if (a.touching === 'snowflake') {
      const ice = s.material('#f4fbff', { emissive: '#bfe6ff', emissiveIntensity: 0.5, roughness: 0.3 });
      const flake = (size: number) => {
        const group = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(size * 2, size * 0.12, size * 0.1), ice);
          arm.rotation.z = (i * Math.PI) / 3; arm.castShadow = true; group.add(arm);
          for (const end of [-1, 1]) for (const tilt of [-1, 1]) {
            const twig = new THREE.Mesh(new THREE.BoxGeometry(size * 0.45, size * 0.1, size * 0.1), ice);
            const dir = (i * Math.PI) / 3;
            twig.position.set(Math.cos(dir) * end * size * 0.62, Math.sin(dir) * end * size * 0.62, 0);
            twig.rotation.z = dir + tilt * 0.9 * end; group.add(twig);
          }
        }
        return group;
      };
      const landed = flake(0.011), t = tipT - 0.16, up = path.up(t);
      landed.position.copy(surface(t, -0.1)).addScaledVector(up, 0.002);
      landed.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up.clone().add(new THREE.Vector3(0, 0.2, 0.4)).normalize());
      inner.add(landed);
      // More coming down, strung on fine wires from a hoop behind the plaque.
      const count = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const f = flake(mix(0.005, 0.009, random()));
        f.position.set((random() - 0.5) * 0.2, mix(0.0, 0.11, random()), 0.03 + random() * 0.07);
        f.rotation.set(random(), random(), random());
        form.add(f); flakes.push(f);
      }
    }
    if (a.touching === 'lolly') lollyTip = (a.attitude === 'tasting' ? surface(tipT, 0) : under(tipT - 0.05, 0)).clone();

    form.position.set(0, 0.158, 0);
    form.rotation.x = -0.26;
    s.root.add(form);
    s.root.updateMatrixWorld(true);

    const gold = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    s.lathe([[0, 0], [0.062, 0], [0.062, 0.006], [0.054, 0.012], [0.014, 0.016], [0.008, 0.03], [0, 0.03]], gold, [0, 0, -0.034]);
    s.rod([0, 0.02, -0.034], [0, 0.13, -0.034], 0.005, gold);
    s.rod([0, 0.13, -0.034], [0, 0.14, -0.012], 0.004, gold);

    const drips: THREE.Mesh[] = [];
    if (lollyTip) {
      // The lolly leans up from the counter on its stick, its top against the tongue.
      const touch = inner.localToWorld(lollyTip.clone());
      const lside = random() < 0.5 ? -1 : 1;
      const foot = new THREE.Vector3(touch.x + lside * mix(0.05, 0.075, random()), 0.002, touch.z + 0.055);
      const axis = touch.clone().sub(foot).normalize();
      const flavour = [['#ff3b4e', '#ff8a1e'], ['#ff7a1e', '#ffd23e'], ['#3ec7ff', '#f4f7ff'], ['#9a4be0', '#ff5aa8'], ['#63d43a', '#ffe94a']][Math.floor(random() * 5)];
      const lolly = new THREE.Group();
      const bar = (y0: number, y1: number, r: number, material: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(y1 - y0 - r, 0.001), 6, 16), material); mesh.position.y = (y0 + y1) / 2; mesh.scale.z = 0.55; mesh.castShadow = true; lolly.add(mesh); };
      const reach = touch.distanceTo(foot) - 0.014, body = Math.min(0.06, reach * 0.5);
      const stickWood = new THREE.Mesh(new THREE.BoxGeometry(0.009, reach - body + 0.01, 0.002), s.material('#e3c690', { roughness: 0.8 }));
      stickWood.position.y = (reach - body) / 2; stickWood.castShadow = true; lolly.add(stickWood);
      bar(reach - body, reach - body * 0.5, 0.017, s.material(flavour[0], { roughness: 0.2, emissive: flavour[0], emissiveIntensity: 0.12 }));
      bar(reach - body * 0.56, reach, 0.017, s.material(flavour[1], { roughness: 0.2, emissive: flavour[1], emissiveIntensity: 0.12 }));
      lolly.position.copy(foot);
      lolly.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      s.root.add(lolly);
      const melt = s.material(flavour[0], { roughness: 0.15 });
      s.cylinder(0.014 + mood.warmth * 0.012, 0.016 + mood.warmth * 0.012, 0.002, [foot.x + 0.012, 0.001, foot.z - 0.012], melt, 16);
      for (let i = 0; i < 2; i++) { const drop = s.ball([0.003, 0.0045, 0.003], [mix(foot.x, touch.x, 0.55 + i * 0.12), mix(foot.y, touch.y, 0.5 + i * 0.12) - 0.02, mix(foot.z, touch.z, 0.55 + i * 0.12)], melt, 8); drips.push(drop); }
    }
    if (a.attitude === 'panting') {
      const spit = new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', roughness: 0.05, clearcoat: 1, emissive: '#b8d8ee', emissiveIntensity: 0.25 });
      const tip = inner.localToWorld(path.at(0.97).clone());
      for (let i = 0; i < 2 + Math.floor(random() * 2); i++) { const drop = s.ball([0.0032, 0.0052, 0.0032], [tip.x + (random() - 0.5) * 0.012, tip.y - 0.012 - i * 0.022, tip.z + 0.002], spit, 10); drips.push(drop); }
    }

    const pace = mix(0.5, 5, mood.energy), start = drips.map((drop) => drop.position.y), still = a.touching === 'lolly' ? 0.25 : 1;
    return s.finish({
      update: (_dt, time) => {
        tongue.rotation.z = Math.sin(time * pace) * 0.05 * still * (a.attitude === 'cheeky' ? 2 : 1) * (0.3 + mood.energy);
        tongue.rotation.x = Math.sin(time * pace * (a.attitude === 'panting' ? 2.4 : 0.7)) * 0.035 * still;
        drips.forEach((drop, i) => { drop.position.y = Math.max(0.004, start[i] - ((time * pace * 0.006 + i * 0.01) % 0.03)); });
        flakes.forEach((flake, i) => { flake.rotation.z += 0.01 * pace * 0.2; flake.position.y += Math.sin(time * pace * 0.5 + i) * 0.00008; });
      },
    });
  },
});

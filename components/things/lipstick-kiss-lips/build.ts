import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Mouth, gapOutline, mouthAt, mouthCurves, mouthOutline } from './lips';
import { blend, bump, paint, relief, stain, trace } from './relief';

const SHADES = {
  red: 'Classic pillar-box red, the film-star mouth.',
  coral: 'Bright orange-pink coral, summery and young.',
  nude: 'A muted rosy beige barely darker than the skin.',
  plum: 'Deep wine plum, dramatic and autumnal.',
  black: 'Black, gothic and defiant.',
  glitter: 'Hot pink packed with glitter that sparkles.',
} as const;
const SHADE: Record<keyof typeof SHADES, string> = { red: '#c40f22', coral: '#ff6a4d', nude: '#b97f6c', plum: '#641a44', black: '#1b171c', glitter: '#e23c97' };
const SKIN = { porcelain: '#f3d6c6', honey: '#deaa86', olive: '#bd8a62', deep: '#74462f' } as const;

export default defineThing({
  questions: {
    shade: choice('What shade is the lipstick?', SHADES),
    state: choice('How far along is the make-up, and how well has it gone?', {
      half: 'Half painted: one side coloured, the other still bare lip.',
      perfect: 'Perfect, crisp edges, just finished.',
      smeared: 'Smeared off the corner of the mouth and across the cheek.',
      bitten: 'Bitten: front teeth pressing into the painted lower lip.',
      bare: 'Not started: bare natural lips with the lipstick poised.',
    }),
    action: choice('What are the lips doing?', {
      applying: 'Slightly parted and still while the lipstick bullet touches the lower lip.',
      pouting: 'Pushed out in a sulky, narrow pout.',
      kiss: 'Puckered tight, blowing a kiss with little hearts drifting off.',
      blotting: 'Pressed shut after blotting; the tissue with its kiss print lies in front.',
      smoking: 'Holding a lit cigarette at one corner, smoke curling up.',
    }),
    finish: choice('What is the surface of the lips like?', {
      matte: 'Flat velvety matte.',
      gloss: 'Wet high gloss with bright highlights.',
      cracked: 'Dry and cracked, the colour flaking in the creases.',
    }),
    fullness: choice('How full are the lips?', {
      thin: 'Thin, older lips with fine vertical lines.',
      cupid: 'A sharp cupid\'s bow over a neat lower lip.',
      full: 'Full, plush and rounded.',
      overdrawn: 'Overdrawn far past the natural lip line, huge and theatrical.',
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
    const shade = SHADE[a.shade];
    const skin = SKIN[a.skin];
    const bareLip = blend(skin, a.skin === 'deep' ? '#8a4a4a' : '#c9706f', 0.6);
    const painted = a.state !== 'bare';

    const base = { thin: [0.014, 0.018, 0.2, 0.007, 0.009], cupid: [0.021, 0.025, 0.5, 0.012, 0.015], full: [0.026, 0.033, 0.28, 0.016, 0.02], overdrawn: [0.034, 0.041, 0.36, 0.016, 0.021] }[a.fullness];
    const m: Mouth = { W: 0.076, Hu: base[0], Hl: base[1], bow: base[2], gap: 0, smile: mix(-0.03, 0.05, mood.cheer), Du: base[3], Dl: base[4] };
    if (a.action === 'applying') m.gap = 0.012;
    if (a.action === 'pouting') { m.W *= 0.78; m.Hu *= 1.15; m.Hl *= 1.2; m.Du *= 1.6; m.Dl *= 1.7; m.smile = -0.1; }
    if (a.action === 'kiss') { m.W *= 0.52; m.Hu *= 1.2; m.Hl *= 1.15; m.Du *= 2; m.Dl *= 2; m.gap = 0.007; m.smile = 0; }
    if (a.action === 'blotting') { m.Du *= 0.8; m.Dl *= 0.8; m.Hu *= 0.9; m.Hl *= 0.9; }
    if (a.action === 'smoking') m.gap = 0.006;
    if (a.state === 'bitten') m.gap = Math.max(m.gap, 0.011);
    const curves = mouthCurves(m);
    const outline = mouthOutline(m);

    // The skin plaque: the patch of face around a mouth, gently wrapped like a muzzle.
    const PW = 0.23, PH = 0.18;
    const skinZ = (x: number, y: number) => -1.5 * x * x - 0.9 * y * y + 0.014 * bump(Math.hypot(x, y * 1.2), 0.07) - 0.0035 * bump(x, 0.008) * bump(y - curves.top(0) - 0.016, 0.014) + 0.008 * bump(Math.hypot(x, y + 0.075), 0.035);
    const rim = (x: number, y: number) => 1 - Math.abs(x / 0.108) ** 2.6 - Math.abs((y + 0.004) / 0.084) ** 2.6;
    const plaque = relief(PW, PH, 110, (x, y) => {
      if (rim(x, y) < 0) return null;
      return skinZ(x, y) - (mouthAt(m, x, y).part === 'gap' ? 0.014 : 0);
    }, (x, y) => skinZ(x, y) - 0.016, rim);

    const smearPath: [number, number][] = [];
    if (a.state === 'smeared') {
      const side = random() < 0.5 ? -1 : 1;
      let x = side * m.W * 0.8, y = curves.top(side * 0.8) * 0.5;
      const rise = mix(0.2, 0.9, random());
      for (let i = 0; i < 14; i++) { smearPath.push([x, y]); x += side * 0.0045; y += 0.0045 * rise + (random() - 0.5) * 0.002; }
    }
    const skinMap = paint(PW, PH, 512, (ctx) => {
      ctx.fillStyle = skin;
      ctx.fillRect(-PW / 2, -PH / 2, PW, PH);
      for (let i = 0; i < 60; i++) stain(ctx, (random() - 0.5) * PW, (random() - 0.5) * PH, 0.012, 0.012, random() < 0.5 ? '#c96a5a' : '#fff1e0', 0.06);
      stain(ctx, 0, curves.bottom(0) - 0.012, 0.045, 0.012, '#5a2a22', 0.28);
      stain(ctx, 0, curves.top(0) + 0.014, 0.006, 0.014, '#5a2a22', 0.2);
      if (mood.wear > 0.5) for (let i = 0; i < 40 * mood.wear; i++) stain(ctx, (random() - 0.5) * PW, (random() - 0.5) * PH, 0.006, 0.006, '#6f675a', 0.18);
      if (painted) smearPath.forEach(([x, y], i) => stain(ctx, x, y, 0.011, 0.008 * (1 - i / 22), shade, 0.75 * (1 - i / 16)));
      trace(ctx, outline);
      ctx.fillStyle = '#2a0b10';
      ctx.fill();
    });
    const form = new THREE.Group();
    const skinPaint = new THREE.MeshStandardMaterial({ map: skinMap, roughness: 0.7 });
    const skinEdge = s.material(blend(skin, '#5a3a30', 0.25), { roughness: 0.8 });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      form.add(mesh);
      return mesh;
    };
    add(plaque.front, skinPaint);
    add(plaque.shell, skinEdge);

    // The lips themselves, sculpted above the skin and painted separately.
    const LW = m.W * 2.06, LH = (curves.top(0.3) - curves.bottom(0)) * 1.25 + 0.01, LY = (curves.top(0.3) + curves.bottom(0)) / 2;
    const lips = relief(LW, LH, 150, (x, y) => {
      const q = mouthAt(m, x, y + LY);
      return q.part === 'upper' || q.part === 'lower' ? skinZ(x, y + LY) + q.z + 0.0006 : null;
    });
    const halfEdge = m.W * mix(-0.15, 0.2, random());
    const lipMap = paint(LW, LH, 512, (ctx) => {
      ctx.translate(0, -LY);
      ctx.fillStyle = bareLip;
      ctx.fillRect(-LW, -1, LW * 2, 2);
      if (painted) {
        ctx.save();
        if (a.state === 'half') {
          ctx.beginPath();
          ctx.moveTo(-LW, -1); ctx.lineTo(halfEdge - 0.006, -1); ctx.lineTo(halfEdge + 0.004, LY - 0.01); ctx.lineTo(halfEdge - 0.003, LY + 0.01); ctx.lineTo(halfEdge + 0.006, 1); ctx.lineTo(-LW, 1);
          ctx.clip();
        }
        ctx.fillStyle = shade;
        ctx.fillRect(-LW, -1, LW * 2, 2);
        if (a.fullness === 'overdrawn') { trace(ctx, outline); ctx.lineWidth = 0.004; ctx.strokeStyle = blend(shade, '#1a0508', 0.5); ctx.stroke(); }
        if (a.shade === 'glitter') for (let i = 0; i < 700; i++) { ctx.fillStyle = ['#ffffff', '#ffd9f0', '#ffe9a8', '#b8f1ff'][i % 4]; ctx.fillRect((random() - 0.5) * LW, LY + (random() - 0.5) * LH, 0.0011, 0.0011); }
        // Worn colour fades in patches from the centre, where lips meet.
        for (let i = 0; i < 26 * mood.wear; i++) stain(ctx, (random() - 0.5) * m.W, curves.upperEdge(0) + (random() - 0.5) * 0.012, 0.01, 0.006, bareLip, 0.5);
        ctx.restore();
      }
      // Vertical creases fanning out from the mouth line.
      const lines = a.fullness === 'thin' ? 90 : 46;
      ctx.lineWidth = 0.0006;
      for (let i = 0; i < lines; i++) {
        const u = (random() - 0.5) * 1.8, x = u * m.W, up = random() < 0.45;
        const from = up ? curves.upperEdge(u) : curves.lowerEdge(u), to = up ? curves.top(u) : curves.bottom(u);
        ctx.strokeStyle = a.finish === 'cracked' ? `rgba(255,236,224,${0.35 + random() * 0.4})` : `rgba(40,5,10,${0.12 + random() * 0.16})`;
        ctx.lineWidth = a.finish === 'cracked' ? 0.0011 : 0.0006;
        ctx.beginPath();
        ctx.moveTo(x, from + (to - from) * 0.08);
        ctx.lineTo(x * (1 + 0.08 * random()), from + (to - from) * mix(0.45, 0.95, random()));
        ctx.stroke();
      }
      if (a.finish === 'cracked') for (let i = 0; i < 16; i++) stain(ctx, (random() - 0.5) * m.W * 1.5, curves.lowerEdge(0) - random() * m.Hl * 0.8, 0.004, 0.003, '#f6ddd0', 0.55);
      for (let i = -8; i <= 8; i++) stain(ctx, (i / 8) * m.W * 0.9, curves.upperEdge(i / 8) * 0.5 + curves.lowerEdge(i / 8) * 0.5, 0.01, 0.004 + m.gap * 0.5, '#1c0408', 0.3);
      if (a.finish === 'gloss') {
        stain(ctx, -m.W * 0.12, curves.lowerEdge(0) - m.Hl * 0.45, m.W * 0.42, m.Hl * 0.16, '#ffffff', 0.85);
        stain(ctx, m.W * 0.3, curves.lowerEdge(0.3) - m.Hl * 0.4, m.W * 0.1, m.Hl * 0.1, '#ffffff', 0.7);
        for (const side of [-1, 1]) stain(ctx, side * m.W * 0.22, curves.top(side * 0.22) - m.Hu * 0.35, m.W * 0.14, m.Hu * 0.12, '#ffffff', 0.6);
      } else stain(ctx, -m.W * 0.1, curves.lowerEdge(0) - m.Hl * 0.45, m.W * 0.4, m.Hl * 0.2, '#ffffff', a.finish === 'matte' ? 0.14 : 0.06);
    });
    add(lips.front, new THREE.MeshPhysicalMaterial({
      map: lipMap,
      roughness: { matte: 0.85, gloss: 0.14, cracked: 0.95 }[a.finish],
      clearcoat: a.finish === 'gloss' ? 1 : 0,
      clearcoatRoughness: 0.1,
      metalness: a.shade === 'glitter' && painted ? 0.25 : 0,
    }));

    const mid = (u: number) => (curves.upperEdge(u) + curves.lowerEdge(u)) / 2;
    const tooth = s.material('#f4efe2', { roughness: 0.3 });
    if (a.state === 'bitten') {
      // Upper incisors come down over the lower lip and dent it.
      [-1.5, -0.5, 0.5, 1.5].forEach((i) => {
        const wide = Math.abs(i) < 1 ? 0.0105 : 0.0085, x = i * 0.0105;
        const topY = curves.upperEdge(x / m.W) + 0.002, bottomY = curves.lowerEdge(0) - m.Hl * 0.32 + Math.abs(i) * 0.001;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(wide * 0.92, topY - bottomY, 0.004), tooth);
        mesh.position.set(x, (topY + bottomY) / 2, skinZ(x, bottomY) + m.Dl * 0.72);
        mesh.rotation.x = 0.25;
        mesh.castShadow = true;
        form.add(mesh);
      });
    } else if (m.gap > 0.009) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(m.W * 0.9, m.gap * 0.42, 0.003), tooth);
      mesh.position.set(0, curves.upperEdge(0) - m.gap * 0.2, skinZ(0, 0) - 0.006);
      form.add(mesh);
    }

    const gold = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    const silver = s.material('#e3e6e8', { metalness: 0.9, roughness: 0.2 });
    const wax = s.material(shade, { roughness: 0.45, metalness: a.shade === 'glitter' ? 0.3 : 0 });
    const lipstick = (capped: boolean) => {
      const tube = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.castShadow = true;
        tube.add(mesh);
      };
      if (!capped) {
        const bullet = new THREE.CylinderGeometry(0.0085, 0.0085, 0.03, 20);
        const p = bullet.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + p.getX(i) * 0.9 - 0.006);
        bullet.computeVertexNormals();
        part(bullet, wax, -0.017);
        part(new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 20), silver, -0.041);
      } else part(new THREE.CylinderGeometry(0.0135, 0.0135, 0.052, 20), gold, -0.026);
      part(new THREE.CylinderGeometry(0.0128, 0.0128, 0.05, 20), gold, -0.077);
      part(new THREE.CylinderGeometry(0.0138, 0.0138, 0.006, 20), silver, -0.054);
      return tube;
    };

    const extras: { node: THREE.Object3D; phase: number; kind: 'heart' | 'smoke' }[] = [];
    let wand: THREE.Group | null = null;
    if (a.action === 'applying' || a.action === 'pouting') {
      // The bullet rests on the lower lip, where the painted half ends.
      const x = a.state === 'half' ? halfEdge + 0.004 : m.W * 0.2, y = curves.lowerEdge(x / m.W) - m.Hl * 0.45;
      wand = lipstick(false);
      wand.position.set(x, y, skinZ(x, y) + m.Dl + 0.004);
      wand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.5, 0.42, -0.76).normalize());
      form.add(wand);
    }
    if (a.action === 'smoking') {
      const side = random() < 0.5 ? -1 : 1, u = side * 0.62;
      const from = new THREE.Vector3(u * m.W, mid(u), skinZ(u * m.W, 0) + m.Dl * 0.4);
      const to = from.clone().add(new THREE.Vector3(side * 0.03, -0.022, 0.085));
      const stick = new Sculpture(context);
      stick.rod(from.toArray(), from.clone().lerp(to, 0.3).toArray(), 0.0042, s.material('#c98a4b'));
      stick.rod(from.clone().lerp(to, 0.3).toArray(), from.clone().lerp(to, 0.93).toArray(), 0.0042, s.material('#f6f3ea'));
      stick.rod(from.clone().lerp(to, 0.93).toArray(), to.toArray(), 0.0042, s.material('#7a7570', { emissive: '#ff5a1e', emissiveIntensity: mix(0.6, 2.2, mood.energy) }));
      form.add(stick.root);
      const haze = new THREE.MeshStandardMaterial({ color: '#dfe3e6', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.008 + i * 0.003, 10, 8), haze);
        puff.position.copy(to).add(new THREE.Vector3((random() - 0.5) * 0.02 + Math.sin(i) * 0.008, 0.016 + i * 0.02, 0));
        form.add(puff);
        extras.push({ node: puff, phase: i, kind: 'smoke' });
      }
    }
    if (a.action === 'kiss') {
      const heart = new THREE.Shape();
      heart.moveTo(0, -0.9);
      heart.bezierCurveTo(-1.6, 0.1, -0.8, 1.2, 0, 0.45);
      heart.bezierCurveTo(0.8, 1.2, 1.6, 0.1, 0, -0.9);
      const geometry = new THREE.ExtrudeGeometry(heart, { depth: 0.4, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2 });
      const glow = s.material(painted ? shade : '#e8455f', { emissive: painted ? shade : '#e8455f', emissiveIntensity: 0.35, roughness: 0.35 });
      const count = 2 + Math.round(mood.cheer * 2 + random());
      const side = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geometry, glow);
        mesh.scale.setScalar(0.006 + i * 0.0035);
        mesh.position.set(side * (0.012 + i * 0.022 + random() * 0.008), 0.012 + i * 0.024, skinZ(0, 0) + m.Dl + 0.02 + i * 0.022);
        mesh.rotation.z = (random() - 0.5) * 0.7;
        mesh.castShadow = true;
        form.add(mesh);
        extras.push({ node: mesh, phase: i, kind: 'heart' });
      }
    }

    form.position.set(0, 0.142, 0);
    form.rotation.x = -0.3;
    s.root.add(form);

    // A little brass easel foot.
    s.lathe([[0, 0], [0.058, 0], [0.058, 0.006], [0.05, 0.012], [0.014, 0.016], [0.008, 0.03], [0, 0.03]], gold, [0, 0, -0.03]);
    s.rod([0, 0.02, -0.03], [0, 0.13, -0.03], 0.005, gold);
    s.ball([0.01, 0.01, 0.01], [0, 0.13, -0.03], gold, 12);

    // On the counter in front: the tissue, the cap, a spare.
    const kissed = a.action === 'blotting' || (painted && random() < 0.35);
    if (kissed || mood.density > 0.6) {
      const TW = 0.12;
      const print: Mouth = { ...m, W: 0.03, Hu: m.Hu * 0.5, Hl: m.Hl * 0.5, gap: 0.004, smile: 0 };
      const tissueMap = paint(TW, TW, 256, (ctx) => {
        ctx.fillStyle = blend('#fbf9f4', '#b9b09c', mood.wear * 0.5);
        ctx.fillRect(-TW, -TW, TW * 2, TW * 2);
        if (!kissed || !painted) return;
        ctx.rotate((random() - 0.5) * 0.8);
        ctx.save();
        trace(ctx, mouthOutline(print));
        ctx.clip();
        ctx.fillStyle = shade;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-TW, -TW, TW * 2, TW * 2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fbf9f4';
        ctx.lineWidth = 0.0009;
        for (let i = 0; i < 26; i++) { const x = (random() - 0.5) * 0.06; ctx.beginPath(); ctx.moveTo(x, -0.03); ctx.lineTo(x * 1.15, 0.03); ctx.stroke(); }
        ctx.restore();
        trace(ctx, gapOutline(print));
        ctx.fillStyle = '#fbf9f4';
        ctx.fill();
      });
      const sheet = new THREE.PlaneGeometry(TW, TW, 10, 10);
      const p = sheet.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, (random() - 0.5) * 0.008 + 0.012 * Math.abs(Math.sin(p.getX(i) * 40)) * 0.4);
      sheet.computeVertexNormals();
      const tissue = s.mesh(sheet, new THREE.MeshStandardMaterial({ map: tissueMap, roughness: 0.95, side: THREE.DoubleSide }), [-0.035, 0.006, 0.085]);
      tissue.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.6);
    }
    const cap = s.cylinder(0.0138, 0.0138, 0.05, [0.075, 0.0138, 0.05], gold, 20);
    cap.rotation.set(Math.PI / 2, 0, random() * Math.PI);
    if (!wand) {
      const spare = lipstick(false);
      spare.position.set(0.07 + random() * 0.015, 0.102, 0.085);
      s.root.add(spare);
    }
    for (let i = 0; i < Math.round(mood.density * 3); i++) {
      const wad = s.ball([0.016, 0.012, 0.015], [-0.1 + random() * 0.05, 0.011, 0.02 + random() * 0.1], s.material('#f7f4ec', { roughness: 1 }), 7);
      wad.rotation.set(random() * 3, random() * 3, random() * 3);
    }

    const speed = mix(0.3, 2, mood.energy);
    const home = extras.map((extra) => extra.node.position.clone());
    return s.finish({
      update: (_dt, time) => {
        extras.forEach((extra, i) => {
          const t = time * speed + extra.phase * 1.7;
          if (extra.kind === 'heart') extra.node.position.y = home[i].y + Math.sin(t) * 0.004;
          else extra.node.position.x = home[i].x + Math.sin(t * 0.6) * 0.006 * (1 + extra.phase * 0.3);
        });
      },
    });
  },
});

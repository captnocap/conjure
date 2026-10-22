import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
const SIN = Math.sin(1.5), COS = Math.cos(1.5);
/** A point on the dental arch: t = 0 at the front teeth, ±1 at the back molars. */
const arch = (t: number, k = 1): [number, number] => {
  const th = t * 1.5;
  return [(0.046 * k * Math.sin(th)) / SIN, (0.078 * k * (Math.cos(th) - COS)) / (1 - COS)];
};
const STAMP = {
  match: ['MATCH FOUND', '#2f7a3d'], unknown: ['NO RECORD', '#5a6068'], nothuman: ['NOT HUMAN', '#b3262c'], buried: ['BURIED 1962', '#7a3a8a'], blank: ['', '#000000'],
} as const;

/** Part of an ellipsoid shell, keeping only the triangles `keep` approves. */
function shell(radii: V3, keep: (d: THREE.Vector3) => boolean) {
  const g = new THREE.SphereGeometry(1, 44, 30);
  const p = g.attributes.position as THREE.BufferAttribute, index = g.index!.array, kept: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(p, index[i]); b.fromBufferAttribute(p, index[i + 1]); c.fromBufferAttribute(p, index[i + 2]);
    if (keep(a.add(b).add(c).normalize())) kept.push(index[i], index[i + 1], index[i + 2]);
  }
  g.setIndex(kept);
  g.scale(...radii);
  return g;
}

export default defineThing({
  questions: {
    teeth: choice('What condition are the teeth in?', {
      perfect: 'Perfect: white, even, expensive.',
      gold: 'Several gold caps catching the light.',
      gaps: 'Yellowed, with gaps where teeth are missing or broken.',
      braces: 'Steel braces still wired across both rows.',
      fangs: 'Long pointed canines that no dentist filed.',
    }),
    flesh: score('How much flesh remains on the face?', ['Clean bare bone', 'Chin and one cheek only', 'Most of the face, with one cheek torn away']),
    jaw: choice('How is the jaw set?', {
      clenched: 'Clenched shut, teeth together.',
      gaping: 'Hanging wide open.',
      grinning: 'A wide, lipless grin, slightly parted.',
      askew: 'Knocked sideways, dislocated and crooked.',
    }),
    chart: choice('What does the dental chart reveal?', {
      match: 'A green stamp: MATCH FOUND.',
      unknown: 'A grey stamp: NO RECORD.',
      nothuman: 'A red stamp: NOT HUMAN.',
      buried: 'A purple stamp: BURIED 1962.',
      blank: 'Nothing yet: the chart is still blank.',
    }),
    stand: choice('What holds the specimen?', {
      retort: 'A laboratory retort stand with a screw clamp.',
      articulator: 'A brass dental articulator, hinged plates above and below.',
      block: 'A brass rod on a varnished wooden block, like a museum piece.',
      dome: 'A turned base under a glass dome.',
    }),
    tools: choice('What was left on the base beside it?', {
      nothing: 'Nothing.',
      mirror: 'A dental mirror and a probe.',
      tooth: 'One pulled tooth with a paper tag.',
      magnifier: 'A magnifying lens on a bent arm, aimed at the teeth.',
      calipers: 'A pair of steel calipers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const S = 1.35, CX = -0.055;
    const bone = s.material(new THREE.Color('#e6dcc2').lerp(new THREE.Color('#b9a67c'), mood.wear * 0.6), { roughness: 0.6 });
    const marrow = s.material('#bfa98a', { roughness: 0.9 });
    const hollow = s.material('#241a18', { roughness: 0.9 });
    const enamelTint = a.teeth === 'perfect' ? '#fbf9f0' : a.teeth === 'gaps' ? '#cdb878' : '#ece4cc';
    const enamel = s.material(new THREE.Color(enamelTint).lerp(new THREE.Color('#b59a52'), mood.wear * 0.35), { roughness: 0.25 });
    const goldM = s.material('#e3b53a', { metalness: 0.9, roughness: 0.22, emissive: '#6a4a08', emissiveIntensity: 0.45 });
    const steel = s.material('#c2cacd', { metalness: 0.8, roughness: 0.3 });
    const brass = s.material('#b8934a', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#24282b', { roughness: 0.6 });
    const wood = s.material('#5b3a26', { roughness: 0.55 });
    const fleshTone = new THREE.Color('#b8a297').lerp(new THREE.Color('#8f9a82'), mix(0.1, 0.6, mood.wear)).lerp(new THREE.Color('#c9a99a'), mood.cheer * 0.25);
    const fleshM = s.material(fleshTone, { roughness: 0.75, side: THREE.DoubleSide });
    const rawM = s.material('#6b2a2c', { roughness: 0.6, side: THREE.DoubleSide });

    const y0 = { retort: 0.2, articulator: 0.15, block: 0.165, dome: 0.15 }[a.stand];
    const spec = new THREE.Group();
    spec.position.set(CX, y0, 0);
    spec.scale.setScalar(S);
    spec.rotation.y = (random() - 0.5) * 0.25;
    s.root.add(spec);
    const upper = new THREE.Group(), lower = new THREE.Group();
    const hinge = new THREE.Vector3(0, 0.035, -0.012);
    lower.position.copy(hinge);
    spec.add(upper, lower);
    const put = (group: THREE.Group, mesh: THREE.Mesh, at: V3, offset = false) => {
      mesh.position.set(at[0], at[1], at[2]);
      if (offset) mesh.position.sub(hinge);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const ballGeo = new THREE.SphereGeometry(1, 16, 12);
    const ball = (group: THREE.Group, size: V3, at: V3, m: THREE.Material, offset = false) => { const b = put(group, new THREE.Mesh(ballGeo, m), at, offset); b.scale.set(...size); return b; };
    const archTube = (k: number, y: number, r: number, m: THREE.Material) => {
      const pts = Array.from({ length: 15 }, (_u, i) => { const [x, z] = arch((i / 14) * 2 - 1, k); return new THREE.Vector3(x, y, z); });
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8), m);
    };

    // Upper jaw: the arch, the palate and a block of face sawn flat below the eyes.
    put(upper, archTube(1.04, 0.012, 0.0085, bone), [0, 0, 0]).scale.y = 1.5;
    ball(upper, [0.05, 0.034, 0.052], [0, 0.036, 0.03], bone);
    const cut = put(upper, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.004, 24), marrow), [0, 0.063, 0.028]);
    cut.scale.set(0.04, 1, 0.042);
    ball(upper, [0.011, 0.016, 0.008], [0, 0.043, 0.079], hollow);
    for (const sx of [-1, 1]) ball(upper, [0.014, 0.012, 0.022], [sx * 0.05, 0.045, 0.03], bone);

    // Lower jaw: body, chin and the two rami up to the hinge.
    put(lower, archTube(1, -0.0165, 0.009, bone), [0, 0, 0], true).scale.y = 1.7;
    lower.children[0].position.y = -hinge.y - 0.0165 * 0.7;
    ball(lower, [0.017, 0.013, 0.012], [0, -0.04, 0.074], bone, true);
    for (const sx of [-1, 1]) {
      const ramus = put(lower, new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.07, 0.03), bone), [sx * 0.049, 0.0, -0.012], true);
      ramus.rotation.x = -0.25;
      ball(lower, [0.007, 0.007, 0.009], [sx * 0.049, 0.036, -0.022], bone, true);
      ball(lower, [0.008, 0.014, 0.016], [sx * 0.048, -0.034, 0.0], bone, true);
    }

    // Teeth.
    const sizes: [number, number, number][] = [[0.0085, 0.012, 0.0042], [0.0078, 0.011, 0.0042], [0.0076, 0.0135, 0.0065], [0.0074, 0.0095, 0.0078], [0.0074, 0.009, 0.0082], [0.0105, 0.0085, 0.0105], [0.0105, 0.008, 0.0105]];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const fangGeo = new THREE.ConeGeometry(0.5, 1, 8);
    const capped = new Set<number>();
    if (a.teeth === 'gold') { const n = 3 + Math.floor(random() * 4); while (capped.size < n) capped.add(Math.floor(random() * 28)); }
    for (const row of [0, 1]) {
      const k = row === 0 ? 1.04 : 0.98, group = row === 0 ? upper : lower, dir = row === 0 ? -1 : 1;
      for (let i = 0; i < 14; i++) {
        const kind = i < 7 ? 6 - i : i - 7, id = row * 14 + i;
        if (a.teeth === 'gaps' && random() < 0.34) continue;
        const t = (i - 6.5) / 7.5;
        const [x, z] = arch(t, k), [x2, z2] = arch(t + 0.01, k);
        let [w, h, d] = sizes[kind];
        const fang = kind === 2 && a.teeth === 'fangs';
        if (fang) h = row === 0 ? 0.027 : 0.02;
        if (a.teeth === 'fangs' && kind !== 2) h *= 0.9;
        if (a.teeth === 'gaps' && random() < 0.3) h *= 0.45 + random() * 0.3;
        const pointed = fang || (a.teeth === 'fangs' && kind > 1 && kind < 5);
        const tooth = new THREE.Mesh(pointed ? fangGeo : boxGeo, capped.has(id) ? goldM : enamel);
        tooth.scale.set(w * (pointed ? 1.15 : 0.94), h, d * (pointed ? 1.15 : 1));
        // Upper teeth hang from y = 0.006 down; lower teeth rise to meet them.
        const yMid = row === 0 ? 0.006 - h / 2 : -0.0065 - 0.006 + h / 2 - (fang ? 0.004 : 0);
        tooth.rotation.y = Math.atan2(-(z2 - z), x2 - x) + (a.teeth === 'gaps' ? (random() - 0.5) * 0.3 : (random() - 0.5) * 0.06);
        if (pointed) tooth.rotation.x = dir === -1 ? Math.PI : 0;
        put(group, tooth, [x, yMid, z], row === 1);
        if (a.teeth === 'braces' && kind < 6) {
          const [bx, bz] = arch(t, k + 0.075);
          const bracket = put(group, new THREE.Mesh(boxGeo, steel), [bx, row === 0 ? 0.0 : -0.0065, bz], row === 1);
          bracket.scale.set(0.0042, 0.0042, 0.003); bracket.rotation.y = tooth.rotation.y;
        }
      }
      if (a.teeth === 'braces') {
        const wire = put(group, archTube(k + 0.085, 0, 0.0009, steel), [0, row === 0 ? 0.0 : -0.0065, 0], row === 1);
        void wire;
      }
    }

    // Flesh: an outer skin and a raw inner layer, with the right cheek torn out.
    if (a.flesh > 0.07) {
      const centre = new THREE.Vector3(0.8, -0.05, 0.6).normalize();
      const reach = mix(2.3, 0.62, Math.min(1, a.flesh * 1.05)), ph = random() * 6;
      const bared = a.flesh < 0.72 || a.jaw === 'grinning';
      const gone = (d: THREE.Vector3, extra: number) => d.angleTo(centre) < reach + extra + 0.1 * Math.sin(d.y * 9 + ph) + 0.07 * Math.sin(d.x * 13 + d.z * 7 + ph);
      const mouth = (d: THREE.Vector3) => bared && Math.abs(d.y + 0.02) < 0.13 && d.z > 0.45;
      const side = (d: THREE.Vector3) => d.z > -0.45 && d.y < 0.7 && d.y > -0.93;
      for (const [isUpper, group] of [[true, upper], [false, lower]] as const) {
        const part = (d: THREE.Vector3) => (isUpper ? d.y > -0.02 : d.y <= -0.02) && side(d) && !mouth(d);
        const origin: V3 = [0, 0.002, 0.016];
        put(group, new THREE.Mesh(shell([0.064, 0.078, 0.078], (d) => part(d) && !gone(d, 0)), fleshM), origin, !isUpper);
        put(group, new THREE.Mesh(shell([0.06, 0.074, 0.074], (d) => part(d) && !gone(d, -0.11)), rawM), origin, !isUpper);
      }
      if (a.flesh > 0.4) {
        ball(upper, [0.015, 0.014, 0.016], [-0.002, 0.036, 0.095], fleshM);
        for (const sx of [-1, 1]) if (sx < 0 || a.flesh > 0.9) ball(upper, [0.008, 0.008, 0.009], [sx * 0.012, 0.031, 0.089], fleshM);
      }
      if (!bared) {
        const lip = s.material(fleshTone.clone().lerp(new THREE.Color('#6d5560'), 0.5));
        for (const [group, y] of [[upper, 0.006], [lower, -0.01]] as const) {
          const pts = [-0.6, -0.3, 0, 0.3, 0.45].map((u) => new THREE.Vector3(Math.sin(u) * 0.064, y, 0.016 + Math.cos(u) * 0.078));
          put(group, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0045, 6), lip), [0, 0, 0], group === lower);
        }
      }
    }
    const open = { clenched: 0, gaping: 0.5, grinning: 0.09, askew: 0.2 }[a.jaw];
    lower.rotation.x = open;
    if (a.jaw === 'askew') { lower.rotation.z = 0.2 * (random() < 0.5 ? -1 : 1); lower.rotation.y = 0.14; lower.position.x += 0.006; }

    // Base and stand.
    const baseTop = 0.018;
    const woody = a.stand === 'block' || a.stand === 'dome';
    s.box([0.36, baseTop, 0.22], [0.02, baseTop / 2, 0], woody ? wood : s.material('#aeb7ba', { metalness: 0.6, roughness: 0.4 }));
    const top = y0 + 0.065 * S, chin = y0 - 0.1 * S;
    if (a.stand === 'retort') {
      const rx = CX - 0.1, rz = -0.075;
      s.box([0.11, 0.014, 0.08], [rx + 0.02, baseTop + 0.007, rz], dark);
      s.rod([rx, baseTop, rz], [rx, top + 0.1, rz], 0.006, steel);
      s.box([0.024, 0.024, 0.024], [rx, top + 0.035, rz], dark);
      s.rod([rx, top + 0.035, rz], [CX, top + 0.035, -0.03], 0.0045, steel);
      s.box([0.2 * 0.72, 0.012, 0.018], [CX, top + 0.035, -0.03 + 0.03], dark);
      for (const sx of [-1, 1]) {
        s.box([0.012, 0.085, 0.018], [CX + sx * 0.072, top - 0.004, 0], dark);
        s.rod([CX + sx * 0.1, y0 + 0.05 * S, 0.01], [CX + sx * 0.066, y0 + 0.05 * S, 0.01], 0.004, steel);
        s.cylinder(0.011, 0.011, 0.008, [CX + sx * 0.104, y0 + 0.05 * S, 0.01], brass, 10).rotation.z = Math.PI / 2;
      }
    } else if (a.stand === 'articulator') {
      s.box([0.15, 0.008, 0.13], [CX, top + 0.006, 0.02], brass);
      s.box([0.15, 0.008, 0.13], [CX, chin - 0.004, 0.02], brass);
      for (const sx of [-1, 1]) {
        s.rod([CX + sx * 0.065, baseTop, -0.06], [CX + sx * 0.065, top + 0.02, -0.06], 0.006, brass);
        s.cylinder(0.012, 0.012, 0.016, [CX + sx * 0.065, top + 0.006, -0.06], brass, 12).rotation.z = Math.PI / 2;
      }
      s.rod([CX, chin - 0.004, 0.02], [CX, baseTop, 0.02], 0.008, brass);
      s.rod([CX, top + 0.006, 0.03], [CX, top + 0.045, 0.03], 0.004, steel);
      s.cylinder(0.014, 0.014, 0.008, [CX, top + 0.047, 0.03], brass, 12);
    } else if (a.stand === 'block') {
      s.box([0.12, 0.035, 0.1], [CX, baseTop + 0.0175, -0.01], s.material('#3d2516', { roughness: 0.45 }));
      s.rod([CX, baseTop + 0.035, -0.035], [CX, y0 + 0.02, -0.035], 0.005, brass);
      s.rod([CX, y0 + 0.02, -0.035], [CX, y0 + 0.04, 0.01], 0.005, brass);
      s.label(`No. ${10 + Math.floor(random() * 89)}`, 0.07, 0.022, [CX, baseTop + 0.018, 0.0405], '#2a2018', '#d2b56a');
    } else {
      s.cylinder(0.105, 0.115, 0.022, [CX, baseTop + 0.011, 0], s.material('#3d2516', { roughness: 0.45 }), 32);
      s.rod([CX, baseTop + 0.02, -0.03], [CX, y0 + 0.03, -0.03], 0.005, brass);
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f4f4', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
      const domeH = top + 0.03 - baseTop - 0.022 - 0.1;
      const body = s.cylinder(0.1, 0.1, domeH, [CX, baseTop + 0.022 + domeH / 2, 0], glass, 32);
      body.castShadow = false;
      const cap = s.mesh(new THREE.SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, [CX, baseTop + 0.022 + domeH, 0]);
      cap.castShadow = false;
      s.ball([0.014, 0.014, 0.014], [CX, baseTop + 0.022 + domeH + 0.108, 0], brass, 12);
    }

    // The chart card on a wire easel.
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${new THREE.Color('#f3ecd6').lerp(new THREE.Color('#cdbb8c'), mood.wear * 0.6).getHexString()}`;
    ctx.fillRect(0, 0, 384, 512);
    ctx.fillStyle = '#243040'; ctx.textAlign = 'center'; ctx.font = 'bold 34px monospace';
    ctx.fillText('DENTAL RECORD', 192, 46);
    ctx.fillRect(24, 60, 336, 4);
    ctx.font = '20px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`CASE ${100 + Math.floor(random() * 899)}`, 28, 92);
    ctx.fillText(a.chart === 'blank' ? 'NAME ________' : a.chart === 'match' ? 'NAME ██████ ██' : 'NAME  ?', 190, 92);
    ctx.lineWidth = 3;
    for (const row of [0, 1]) for (let i = 0; i < 16; i++) {
      const u = (i - 7.5) / 8, ang = u * 1.45;
      const x = 192 + Math.sin(ang) * 130, y = row === 0 ? 300 - Math.cos(ang) * 150 : 330 + Math.cos(ang) * 110;
      ctx.strokeStyle = '#243040'; ctx.fillStyle = '#243040';
      ctx.beginPath(); ctx.ellipse(x, y, 13, 16, ang * (row ? -1 : 1), 0, 7); ctx.stroke();
      if (a.chart === 'blank') continue;
      const mark = random();
      if (a.teeth === 'gaps' ? mark < 0.4 : mark < 0.12) { ctx.strokeStyle = '#b3262c'; ctx.beginPath(); ctx.moveTo(x - 12, y - 14); ctx.lineTo(x + 12, y + 14); ctx.moveTo(x + 12, y - 14); ctx.lineTo(x - 12, y + 14); ctx.stroke(); }
      else if (mark > (a.teeth === 'gold' ? 0.65 : 0.85)) { ctx.fillStyle = a.teeth === 'gold' ? '#c9982a' : '#243040'; ctx.beginPath(); ctx.ellipse(x, y, 8, 10, 0, 0, 7); ctx.fill(); }
      if (a.teeth === 'fangs' && (i === 5 || i === 10)) { ctx.fillStyle = '#b3262c'; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + (row ? -40 : 40)); ctx.fill(); }
    }
    const [stamp, ink] = STAMP[a.chart];
    if (stamp) {
      ctx.save(); ctx.translate(192, 440); ctx.rotate(-0.13 + (random() - 0.5) * 0.15);
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 6; ctx.globalAlpha = 0.88;
      ctx.strokeRect(-170, -40, 340, 80);
      ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(stamp, 0, 2, 320);
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const easel = new THREE.Group();
    easel.position.set(0.125, baseTop, -0.015);
    easel.rotation.y = -0.38 + (random() - 0.5) * 0.15;
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.003), [dark, dark, dark, dark, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), s.material('#d8cfb4')]);
    card.position.set(0, 0.112, 0.0); card.rotation.x = -0.2;
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 6), steel);
    prop.position.set(0, 0.095, -0.05); prop.rotation.x = 0.28;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.02), woody ? brass : dark);
    ledge.position.set(0, 0.008, 0.022);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.012), steel);
    clip.position.set(0, 0.207, -0.02);
    easel.add(card, prop, ledge, clip);
    easel.traverse((m) => { m.castShadow = true; });
    s.root.add(easel);

    // Left on the base.
    const fy = baseTop + 0.004;
    if (a.tools === 'mirror') {
      s.rod([-0.01, fy, 0.09], [0.11, fy, 0.075], 0.003, steel);
      s.cylinder(0.012, 0.012, 0.003, [-0.02, fy + 0.002, 0.092], steel, 16).rotation.x = 0.3;
      s.rod([0.0, fy, 0.1], [0.12, fy, 0.094], 0.0025, steel, 0.0006);
    } else if (a.tools === 'tooth') {
      s.box([0.011, 0.01, 0.011], [0.03, fy + 0.003, 0.085], enamel).rotation.y = 0.4;
      s.cylinder(0.002, 0.004, 0.016, [0.039, fy + 0.002, 0.088], bone, 6).rotation.z = Math.PI / 2 - 0.2;
      const tag = s.label('?', 0.04, 0.022, [0.085, fy + 0.001, 0.088], '#2a2420', '#ead9a6');
      tag.rotation.set(-Math.PI / 2, 0, 0.3);
      s.rod([0.045, fy, 0.087], [0.067, fy, 0.088], 0.0008, s.material('#b3262c'));
    } else if (a.tools === 'magnifier') {
      const mx = CX + 0.11, mz = 0.085;
      s.cylinder(0.022, 0.026, 0.01, [mx, baseTop + 0.005, mz], dark, 16);
      s.tube([[mx, baseTop, mz], [mx + 0.02, y0 * 0.6, mz + 0.01], [mx - 0.02, y0 - 0.01, mz + 0.01], [CX + 0.02, y0 - 0.005, 0.125 + 0.03]], 0.003, steel);
      const rim = s.ring(0.034, 0.004, [CX + 0.02, y0 - 0.005, 0.125], brass);
      rim.rotation.y = 0.15;
      const lens = s.cylinder(0.033, 0.033, 0.003, [CX + 0.02, y0 - 0.005, 0.125], new THREE.MeshPhysicalMaterial({ color: '#dff3f6', transparent: true, opacity: 0.18, roughness: 0.02, depthWrite: false }), 24);
      lens.rotation.set(Math.PI / 2, 0, 0); lens.castShadow = false;
    } else if (a.tools === 'calipers') {
      s.rod([0.0, fy, 0.085], [0.1, fy, 0.09], 0.003, steel, 0.001);
      s.rod([0.0, fy, 0.085], [0.095, fy, 0.065], 0.003, steel, 0.001);
      s.cylinder(0.008, 0.008, 0.008, [0.0, fy + 0.002, 0.085], brass, 12);
    }
    // Dust, stains and flecks with wear.
    const flecks = Math.round(mood.wear * 10);
    const stain = s.material('#6a4a34', { roughness: 0.95 });
    for (let i = 0; i < flecks; i++) s.ball([0.004 + random() * 0.01, 0.0015, 0.004 + random() * 0.008], [0.02 + (random() - 0.5) * 0.32, baseTop, (random() - 0.5) * 0.19], stain, 6);

    const energy = mood.energy, phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const t = time * mix(1.5, 9, energy) + phase;
        // Chattering: quick bites in bursts, barely a tremor when calm.
        const burst = Math.max(0, Math.sin(time * mix(0.3, 1.1, energy) + phase));
        lower.rotation.x = open + Math.abs(Math.sin(t)) * 0.16 * energy * burst;
      },
    });
  },
});

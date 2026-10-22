import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { HEAD, at, brow, ears, eye, hairCap, mouth, nose, parts, shape, skin } from './head';

const W = 1.8, DEPTH = 0.78, ZC = -0.12, CHEST = 1.55;
/** Front surface of the torso (head units) at x, y. */
const torsoZ = (x: number, y: number) => {
  if (y > -2.1) return ZC + DEPTH * Math.sqrt(Math.max(0.0001, 1 - (x / W) ** 2 - ((y + 2.1) / 0.62) ** 2));
  const r = mix(1, 0.88, (-2.1 - y) / CHEST);
  return ZC + DEPTH * r * Math.sqrt(Math.max(0.0001, 1 - (x / (W * r)) ** 2));
};
const torsoPoint = (x: number, y: number) => {
  const p = new THREE.Vector3(x, y, torsoZ(x, y));
  const dx = torsoZ(x + 0.02, y) - torsoZ(x - 0.02, y), dy = torsoZ(x, y + 0.02) - torsoZ(x, y - 0.02);
  return { p, n: new THREE.Vector3(-dx / 0.04, -dy / 0.04, 1).normalize() };
};
type Path = { p: THREE.Vector3; n: THREE.Vector3 }[];

export default defineThing({
  questions: {
    stitch: choice('How was it closed?', {
      neat: 'Neat mortician work: small, even, dark stitches.',
      baseball: 'A hurried baseball stitch: big crossed loops of twine.',
      staples: 'A row of steel staples.',
      butcher: 'Thick red butcher string, widely spaced and uneven.',
    }),
    eyes: choice('What about the eyes?', {
      closed: 'Closed.',
      coins: 'Closed, with a coin laid on each lid.',
      one: 'One has come open.',
      staring: 'Both wide open, staring straight ahead.',
    }),
    hair: choice('What state is the hair in?', {
      shaved: 'Shaved to the scalp for the saw.',
      combed: 'Combed and parted neatly back over the stitch line.',
      regrown: 'Half regrown in uneven tufts.',
      wild: 'A shock of white hair standing on end.',
    }),
    expression: choice('What expression does the face hold?', {
      peace: 'At peace, the faintest upward turn.',
      disapproving: 'A set frown, as if disapproving of the paperwork.',
      smirk: 'A knowing smirk.',
      startled: 'Mouth open and brows up, startled.',
    }),
    pose: choice('Has it begun to sit up?', {
      flat: 'No: lying flat on the slab with a block under the head.',
      rising: 'Halfway, shoulders lifted off the slab.',
      upright: 'Sitting bolt upright.',
    }),
    tag: choice('What colour is the identity band and tag?', {
      manila: 'Plain manila card.',
      red: 'Red: hold for the coroner.',
      yellow: 'Yellow: unidentified.',
      blue: 'Hospital blue.',
      green: 'Green: released to the family.',
      black: 'Black, with no writing at all.',
    }),
    build: choice('What sort of body is it?', {
      slight: 'Slight and narrow-shouldered.',
      average: 'Average.',
      heavy: 'Broad and heavy.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(HEAD);
    const pivot = new THREE.Group();
    pivot.rotation.order = 'YXZ';
    s.root.add(g);
    g.add(pivot);
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 2.1 + CHEST, -ZC);
    pivot.add(bodyGroup);
    const body = parts(bodyGroup);
    const headGroup = new THREE.Group();
    bodyGroup.add(headGroup);
    const f = parts(headGroup);

    const tone = new THREE.Color('#ddd6c6').lerp(new THREE.Color('#b9c4c6'), mix(0.15, 0.7, (1 - mood.warmth) * 0.6 + mood.wear * 0.4));
    const fleshM = s.material(tone, { roughness: 0.75 });
    const lidM = s.material(tone.clone().multiplyScalar(0.86));
    const lipM = s.material(tone.clone().lerp(new THREE.Color('#7b7f95'), 0.45));
    const dark = s.material('#2a2226');
    const steel = s.material('#bfc7ca', { metalness: 0.75, roughness: 0.32 });
    const wide = { slight: 0.86, average: 1, heavy: 1.2 }[a.build];

    const expr = {
      peace: { curve: 0.25, jaw: 0, brow: 0.2 },
      disapproving: { curve: -1.1, jaw: 0, brow: -0.9 },
      smirk: { curve: 0.9, jaw: 0, brow: -0.2 },
      startled: { curve: -0.2, jaw: 0.6, brow: 1.1 },
    }[a.expression];
    f.add(new THREE.Mesh(skin({ jaw: expr.jaw }), fleshM));
    nose(f, fleshM, a.build === 'heavy' ? 1.15 : 1, expr.jaw * 0.2);
    ears(f, fleshM);
    const white = s.material('#e6e4da', { roughness: 0.25 }), iris = s.material('#8fa3a8'), pupil = s.material('#101012');
    const coin = s.material('#b9853a', { metalness: 0.85, roughness: 0.3 });
    for (const side of [-1, 1] as const) {
      const open = a.eyes === 'staring' || (a.eyes === 'one' && side === 1);
      eye(f, { side, lid: open ? 0.04 : 1, white, iris, pupil, lidMaterial: lidM, pupilSize: 0.2, look: [0, 0] });
      if (a.eyes === 'coins') {
        const c = at(side * 0.33, 0.1, 0, 0.0);
        const disc = f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 20), coin));
        disc.position.set(c.x, c.y, c.z + 0.085);
        disc.rotation.set(Math.PI / 2 - 0.1, 0, side * 0.1);
      }
    }
    mouth(f, { jaw: expr.jaw, curve: expr.curve, lip: lipM, dark, teeth: s.material('#e4dfcc') });
    if (a.expression === 'smirk') f.ball([0.03, 0.05, 0.02], at(0.31, -0.44, 0, 0.01), lidM);

    const hairTint = a.hair === 'wild' ? '#eeeeea' : '#3a3530';
    const hairM = s.material(hairTint, { roughness: 0.9 });
    brow(f, -1, hairM, expr.brow, 0.03);
    brow(f, 1, hairM, expr.brow + (a.expression === 'smirk' ? 0.9 : 0), 0.03);
    let lift = 0.012;
    if (a.hair === 'shaved') headGroup.add(hairCap(s.material(tone.clone().lerp(new THREE.Color('#6d6a66'), 0.28), { roughness: 0.95 }), 1.4, -0.58, 0.006));
    else if (a.hair === 'combed') {
      headGroup.add(hairCap(hairM, 1.42, -0.58, 0.06));
      f.tube([at(-0.3, 0.72, 0, 0.075), new THREE.Vector3(-0.34, 1.13, 0.05), new THREE.Vector3(-0.3, 0.9, -0.6)], 0.016, s.material('#8d8478'));
      lift = 0.075;
    } else {
      headGroup.add(hairCap(s.material(tone.clone().lerp(new THREE.Color(hairTint), 0.3), { roughness: 0.95 }), 1.4, -0.58, 0.006));
      const tufts: { at: [number, number, number]; size: number }[] = [];
      const d = new THREE.Vector3(), q = new THREE.Vector3();
      const n = a.hair === 'wild' ? 150 : 90;
      const tuft = new THREE.ConeGeometry(0.05, 1, 5);
      tuft.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(tuft, hairM, n);
      const m = new THREE.Matrix4(), quat = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < n; i++) {
        for (let tries = 0; tries < 12; tries++) {
          d.set(random() * 2 - 1, random() * 1.25 - 0.25, random() * 2 - 1).normalize();
          // Keep to the scalp: above a hairline that sits high on the forehead and low on the nape.
          const scalp = d.y > 0.72 - Math.max(0, -d.z) * 1.1 - Math.max(0, 0.35 - d.z) * 0.9;
          const patchy = a.hair === 'regrown' && Math.sin(d.x * 7 + 1) * Math.cos(d.z * 6) > 0.2;
          if (scalp && !patchy) break;
          if (tries === 11) d.set(0, 1, -0.3).normalize();
        }
        shape(d, 0, q);
        quat.setFromUnitVectors(up, d.clone().add(new THREE.Vector3((random() - 0.5) * 0.5, a.hair === 'wild' ? 0.5 : 0, (random() - 0.5) * 0.5)).normalize());
        const len = a.hair === 'wild' ? 0.35 + random() * 0.4 : 0.07 + random() * 0.12;
        m.compose(q, quat, new THREE.Vector3(a.hair === 'wild' ? 1.3 : 1.6, len, a.hair === 'wild' ? 1.3 : 1.6));
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = true;
      headGroup.add(mesh);
      void tufts;
    }

    // Torso: neck, shoulders and a length of chest, all bare.
    const neck = body.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4 * Math.sqrt(wide), 0.48 * wide, 0.95, 20), fleshM));
    neck.position.set(0, -1.25, ZC);
    const torso = new THREE.Group();
    torso.scale.set(wide, 1, mix(1, wide, 0.6));
    torso.position.z = ZC * (1 - mix(1, wide, 0.6));
    bodyGroup.add(torso);
    const t = parts(torso);
    const dome = t.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), fleshM));
    dome.scale.set(W, 0.62, DEPTH); dome.position.set(0, -2.1, ZC);
    const chest = t.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 0.88, CHEST, 32), fleshM));
    chest.scale.set(W, 1, DEPTH); chest.position.set(0, -2.1 - CHEST / 2, ZC);
    for (const sx of [-1, 1]) {
      const c = torsoPoint(sx * 0.55, -2.25);
      t.tube([torsoPoint(sx * 0.12, -1.98).p, torsoPoint(sx * 0.6, -1.9).p, torsoPoint(sx * 1.15, -1.82).p], 0.05, fleshM);
      t.ball([0.05, 0.05, 0.03], torsoPoint(sx * 0.82, -2.85).p, s.material(tone.clone().lerp(new THREE.Color('#8a6f72'), 0.6)));
      void c;
    }

    // Stitches along a path, in one instanced mesh.
    const threadTint = { neat: '#26262b', baseball: '#4a3b2a', staples: '#d5dadc', butcher: '#a3262c' }[a.stitch];
    const threadM = s.material(threadTint, a.stitch === 'staples' ? { metalness: 0.9, roughness: 0.25 } : { roughness: 0.8 });
    const scar = s.material(tone.clone().lerp(new THREE.Color('#8a4a55'), 0.55));
    const style = {
      neat: { gap: 0.1, len: 0.17, thick: 0.02, cross: 0, jitter: 0.03 },
      baseball: { gap: 0.17, len: 0.3, thick: 0.03, cross: 0.6, jitter: 0.18 },
      staples: { gap: 0.13, len: 0.17, thick: 0.03, cross: 0, jitter: 0.06 },
      butcher: { gap: 0.24, len: 0.34, thick: 0.04, cross: 0, jitter: 0.4 },
    }[a.stitch];
    const sew = (host: ReturnType<typeof parts>, path: Path, raise: number) => {
      host.tube(path.map(({ p, n }) => p.clone().addScaledVector(n, raise * 0.5)), 0.022, scar);
      const marks: THREE.Matrix4[] = [];
      let carried = style.gap * 0.5;
      const basis = new THREE.Matrix4(), side = new THREE.Vector3(), tangent = new THREE.Vector3();
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i], to = path[i + 1];
        const length = from.p.distanceTo(to.p);
        tangent.copy(to.p).sub(from.p).normalize();
        while (carried < length) {
          const p = from.p.clone().lerp(to.p, carried / length).addScaledVector(from.n, raise + style.thick * 0.3);
          for (const turn of style.cross ? [style.cross, -style.cross] : [0]) {
            const angle = turn + (random() - 0.5) * style.jitter * 2;
            side.crossVectors(from.n, tangent).normalize().applyAxisAngle(from.n, angle);
            const forward = new THREE.Vector3().crossVectors(side, from.n);
            basis.makeBasis(side, from.n, forward);
            basis.scale(new THREE.Vector3(style.len * (1 + (random() - 0.5) * style.jitter), style.thick, style.thick));
            basis.setPosition(p);
            marks.push(basis.clone());
          }
          carried += style.gap * (1 + (random() - 0.5) * style.jitter);
        }
        carried -= length;
      }
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), threadM, marks.length);
      marks.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      host.group.add(mesh);
    };
    const line = (x0: number, y0: number, x1: number, y1: number, steps = 12): Path =>
      Array.from({ length: steps + 1 }, (_u, i) => torsoPoint(mix(x0, x1, i / steps), mix(y0, y1, i / steps)));
    sew(t, line(-1.2, -1.82, 0, -2.62), 0.012);
    sew(t, line(1.2, -1.82, 0, -2.62), 0.012);
    sew(t, line(0, -2.62, 0, -2.1 - CHEST + 0.02), 0.012);
    const scalp: Path = Array.from({ length: 19 }, (_u, i) => {
      const th = mix(-1.32, 1.32, i / 18);
      const d = new THREE.Vector3(Math.sin(th), Math.cos(th), -0.08).normalize();
      return { p: shape(d).addScaledVector(d, lift - 0.012), n: d };
    });
    sew(f, scalp, 0.014);

    // Identity band round the neck and a tag on a string.
    const tagTint = { manila: '#d9c08a', red: '#c0342c', yellow: '#e6c930', blue: '#4f86c0', green: '#5a9a5c', black: '#1b1b1d' }[a.tag];
    const band = body.add(new THREE.Mesh(new THREE.TorusGeometry(0.47 * wide, 0.045, 6, 24), s.material(tagTint, { roughness: 0.5 })));
    band.rotation.x = Math.PI / 2; band.scale.z = 1.6; band.position.set(0, -1.38, ZC);

    headGroup.rotation.set(a.pose === 'flat' ? -0.1 : a.pose === 'rising' ? 0.25 : 0.02, a.pose === 'upright' ? (random() - 0.5) * 0.5 : 0, (random() - 0.5) * 0.12);
    const rise = { flat: 0, rising: 0.42, upright: 1 }[a.pose];
    pivot.rotation.set(-(Math.PI / 2) * (1 - rise), 0.95 * (1 - rise * 0.75), 0);

    // Slab sized to whatever the pose needs, with a sheet over the cut end.
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pivot);
    const inv = 1 / HEAD;
    const min = box.min.multiplyScalar(inv), max = box.max.multiplyScalar(inv);
    const cx = (min.x + max.x) / 2, cz = (min.z + max.z) / 2;
    const sw = (max.x - min.x) + 0.7, sd = (max.z - min.z) + 0.6;
    const base = parts(g);
    const slabTop = min.y + (a.pose === 'upright' ? 0.02 : 0.0);
    const slab = base.add(new THREE.Mesh(new THREE.BoxGeometry(sw, 0.12, sd), steel));
    slab.position.set(cx, slabTop - 0.06, cz);
    for (const [w, d, x, z] of [[sw, 0.1, 0, sd / 2], [sw, 0.1, 0, -sd / 2], [0.1, sd, sw / 2, 0], [0.1, sd, -sw / 2, 0]] as const) {
      const rim = base.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, d), steel));
      rim.position.set(cx + x, slabTop + 0.01, cz + z);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = base.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), steel));
      leg.position.set(cx + sx * (sw / 2 - 0.3), slabTop - 0.45, cz + sz * (sd / 2 - 0.3));
    }
    const sheetM = s.material(mood.wear > 0.6 ? '#d9d6c6' : '#f1f0ea', { roughness: 0.95 });
    const cut = new THREE.Vector3(0, 0, 0).applyEuler(pivot.rotation);
    const sheet = base.ball([W * wide * 1.15, 0.5 + rise * 0.25, a.pose === 'upright' ? 1.25 : 1.5], [cut.x, slabTop + 0.12, cut.z], sheetM, 16);
    sheet.rotation.y = pivot.rotation.y;
    if (a.pose !== 'upright') {
      const far = new THREE.Vector3(0, -1.1, 0).applyEuler(pivot.rotation);
      const more = base.ball([W * wide * 1.2, 0.42, 1.2], [far.x, slabTop + 0.05, far.z], sheetM, 16);
      more.rotation.y = pivot.rotation.y;
    }
    if (a.pose === 'flat') {
      const headAt = new THREE.Vector3(0, 2.1 + CHEST, -0.75).applyEuler(pivot.rotation);
      const block = base.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, Math.max(0.1, headAt.y - slabTop + 0.25), 0.8), s.material('#5b4a3a')));
      block.position.set(headAt.x, slabTop + block.geometry.parameters.height / 2, headAt.z);
      block.rotation.y = pivot.rotation.y;
    }
    // The tag hangs off the slab's front rim.
    const tag = s.label(a.tag === 'black' ? ' ' : a.tag === 'yellow' ? 'UNKNOWN' : a.tag === 'red' ? 'HOLD' : a.tag === 'green' ? 'RELEASED' : `No. ${10 + Math.floor(random() * 89)}`, 1.1, 0.55, [0, 0, 0], a.tag === 'black' ? '#1b1b1d' : '#1c1c22', tagTint);
    g.add(tag);
    tag.position.set(cx + sw * 0.28, slabTop - 0.42, cz + sd / 2 + 0.07);
    tag.rotation.z = (random() - 0.5) * 0.3;
    base.tube([new THREE.Vector3(cx + sw * 0.28, slabTop + 0.12, cz + sd / 2 + 0.05), new THREE.Vector3(cx + sw * 0.28, slabTop - 0.16, cz + sd / 2 + 0.07)], 0.012, s.material('#8b7a5a'));
    if (mood.wear > 0.4) for (let i = 0; i < Math.round(mood.wear * 6); i++)
      base.ball([0.12 + random() * 0.25, 0.008, 0.1 + random() * 0.2], [cx + (random() - 0.5) * sw * 0.8, slabTop + 0.004, cz + (random() - 0.5) * sd * 0.8], s.material('#7d6a55', { roughness: 0.5 }), 8);

    const rest = pivot.rotation.clone(), headRest = headGroup.rotation.clone(), energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (a.pose === 'rising') pivot.rotation.x = rest.x + Math.sin(time * mix(0.6, 9, energy)) * mix(0.004, 0.03, energy);
        if (a.pose !== 'flat') headGroup.rotation.y = headRest.y + Math.sin(time * mix(0.2, 1.4, energy)) * 0.25 * energy;
      },
    });
  },
});

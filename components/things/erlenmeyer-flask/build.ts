import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const COLOURS = {
  green: 'Acid green, the cartoon colour of something toxic.',
  blue: 'Clear copper-sulphate blue, the colour of a first chemistry lesson.',
  violet: 'Deep violet, permanganate or a witch\'s potion.',
  pink: 'Blushing pink, an indicator at its end point.',
  amber: 'Amber gold, like oil, honey or whisky.',
  red: 'Dark blood red.',
  black: 'Opaque tarry black.',
  clear: 'Almost colourless, barely tinted water.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  green: '#6fd12c', blue: '#2a8fe0', violet: '#7b2fc0', pink: '#f06aa8', amber: '#e0a020', red: '#a81c22', black: '#1d1a1f', clear: '#b9dbe6',
};
const LABELS = {
  none: 'No label at all.',
  formula: 'A neat formula: H2SO4.',
  sample: 'A numbered sample: No. 7.',
  poison: 'POISON, with a skull drawn above it.',
  query: 'Only a row of question marks.',
  hands: 'DO NOT TOUCH, underlined twice.',
  drink: 'DRINK ME, in a curling hand.',
} as const;

function handLabel(kind: Exclude<keyof typeof LABELS, 'none'>, wear: number, tilt: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 176;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = wear > 0.5 ? '#e6dcc0' : '#f6f1e2';
  ctx.fillRect(0, 0, 256, 176);
  ctx.strokeStyle = '#8f3d33'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 160);
  ctx.translate(128, 88); ctx.rotate(tilt); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1f2a44'; ctx.strokeStyle = '#1f2a44'; ctx.lineWidth = 4;
  const text = { formula: 'H₂SO₄', sample: 'No. 7', poison: 'POISON', query: '? ? ?', hands: 'DO NOT', drink: 'Drink' }[kind];
  ctx.font = 'italic bold 58px Georgia, serif';
  if (kind === 'poison') {
    ctx.font = 'italic bold 46px Georgia, serif';
    ctx.fillText(text, 0, 42);
    ctx.beginPath(); ctx.arc(0, -30, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-14, -12, 28, 18);
    ctx.fillStyle = '#f6f1e2';
    ctx.beginPath(); ctx.arc(-10, -32, 7, 0, Math.PI * 2); ctx.arc(10, -32, 7, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'hands') {
    ctx.font = 'italic bold 50px Georgia, serif';
    ctx.fillText('DO NOT', 0, -30); ctx.fillText('TOUCH', 0, 26);
    ctx.beginPath(); ctx.moveTo(-90, 58); ctx.lineTo(90, 54); ctx.moveTo(-86, 68); ctx.lineTo(88, 65); ctx.stroke();
  } else if (kind === 'drink') {
    ctx.fillText('Drink', 0, -28); ctx.fillText('me', 0, 30);
  } else ctx.fillText(text, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the liquid?', COLOURS),
    state: choice('What is the liquid doing right now?', {
      calm: 'Perfectly still, waiting.',
      bubbling: 'Fizzing steadily, bubbles climbing the glass.',
      foaming: 'Erupting: foam pushing up the neck and running down the outside.',
      smoking: 'Giving off a heavy curl of vapour from the mouth.',
      spilled: 'Knocked over on its side, the contents pooled across the bench.',
    }),
    fill: score('How full is the flask?', ['A shallow layer in the bottom', 'A third', 'Half', 'Nearly to the shoulder']),
    stopper: choice('What closes the neck?', {
      open: 'Nothing: an open mouth.',
      cork: 'A plain cork pushed in.',
      bung: 'A red rubber bung with a bent glass delivery tube through it.',
      wool: 'A loose plug of cotton wool.',
      funnel: 'A small glass funnel resting in the neck.',
    }),
    label: choice('What does the hand-written label say?', LABELS),
    glow: noul('Does the liquid glow faintly from within?'),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      rod: 'A glass stirring rod and a few drips.',
      dropper: 'A pipette dropper with a rubber teat.',
      spatula: 'A spatula and a small heap of the powder that went in.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = TINT[a.colour];
    const liquid = s.material(tint, { roughness: 0.15, emissive: tint, emissiveIntensity: a.glow ? 0.45 : 0.08, transparent: a.colour === 'clear', opacity: a.colour === 'clear' ? 0.75 : 1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8eef2', transparent: true, opacity: 0.17, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const rimMat = s.material('#eaf5f6', { roughness: 0.1 });
    const flask = new THREE.Group();
    s.root.add(flask);
    const add = <T extends THREE.Object3D>(o: T) => { flask.add(o); return o; };

    const R = 0.056, r = 0.017, yS = 0.012, yN = 0.132, yT = 0.178;
    const radiusAt = (y: number) => mix(R - 0.003, r - 0.002, Math.min(1, Math.max(0, (y - yS) / (yN - yS))));
    const spilled = a.state === 'spilled';
    const foaming = a.state === 'foaming';
    const level = spilled ? 0.022 : mix(0.03, 0.115, a.fill) + (foaming ? 0.01 : 0);

    add(s.lathe([[0, 0.002], [R - 0.006, 0.002], [R, 0.008], [R, yS], [r, yN], [r, yT - 0.004]], glass));
    add(s.ring(r + 0.0025, 0.0028, [0, yT - 0.002, 0], rimMat)).rotation.x = Math.PI / 2;
    add(s.ring(R - 0.001, 0.0016, [0, 0.006, 0], rimMat)).rotation.x = Math.PI / 2;
    if (!spilled) add(s.lathe([[0, 0.005], [R - 0.008, 0.005], [R - 0.003, yS], [radiusAt(level), level], [0, level]], liquid));
    // Graduation marks, as every school flask has.
    const white = s.material('#f5f5ee', { roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const y = 0.035 + i * 0.022;
      const mark = add(s.box([i % 2 ? 0.012 : 0.02, 0.0014, 0.0008], [-0.012, y, radiusAt(y) * 0.97 + 0.004], white));
      mark.rotation.y = -0.25; mark.position.x = -radiusAt(y) * 0.45; mark.position.z = radiusAt(y) * 0.92 + 0.003;
    }
    if (mood.wear > 0.45) add(s.ring(radiusAt(level + 0.012) + 0.0015, 0.0012, [0, level + 0.012, 0], s.material('#8d7f62', { roughness: 1 }))).rotation.x = Math.PI / 2;

    if (a.label !== 'none') {
      const y = 0.062, slope = Math.atan((R - r) / (yN - yS));
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.034), new THREE.MeshStandardMaterial({ map: handLabel(a.label, mood.wear, (random() - 0.5) * 0.12), roughness: 0.9, side: THREE.DoubleSide }));
      plate.position.set(0.006, y, radiusAt(y) + 0.0045);
      plate.rotation.set(-slope, 0.1, (random() - 0.5) * 0.14);
      plate.castShadow = true;
      add(plate);
    }

    // Activity inside and above.
    const moving: THREE.Object3D[] = [];
    if (a.state === 'bubbling' || foaming) {
      const bubbles: { at: P3; size: number }[] = [];
      for (let i = 0; i < Math.round(mix(18, 46, mood.energy)); i++) {
        const y = 0.012 + random() * (level - 0.012), t = random() * 6.28, rr = radiusAt(y) * (0.55 + random() * 0.42);
        bubbles.push({ at: [Math.cos(t) * rr, y, Math.sin(t) * rr], size: 0.002 + random() * 0.003 });
      }
      for (let i = 0; i < 14; i++) {
        const t = random() * 6.28, rr = radiusAt(level) * Math.sqrt(random()) * 0.9;
        bubbles.push({ at: [Math.cos(t) * rr, level + 0.001, Math.sin(t) * rr], size: 0.003 + random() * 0.003 });
      }
      add(s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.2, emissive: tint, emissiveIntensity: 0.15 }), bubbles));
    }
    const pale = new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.72);
    if (foaming) {
      const foam: { at: P3; size: number }[] = [];
      for (let y = level; y < yT; y += 0.006) foam.push({ at: [(random() - 0.5) * 0.008, y, (random() - 0.5) * 0.008], size: radiusAt(y) * 0.8 });
      for (let i = 0; i < 26; i++) foam.push({ at: [(random() - 0.5) * 0.04, yT + random() * 0.03, (random() - 0.5) * 0.04], size: 0.008 + random() * 0.008 });
      // A run of foam down one side and a puddle at the foot.
      const side = 0.5 + random() * 0.8;
      for (let y = yT; y > 0.004; y -= 0.007) {
        const rr = (y > yN ? r : mix(R, r, (y - yS) / (yN - yS))) + 0.004;
        const t = side + Math.sin(y * 40) * 0.12;
        foam.push({ at: [Math.cos(t) * rr, y, Math.sin(t) * rr], size: 0.006 + random() * 0.005 });
      }
      for (let i = 0; i < 22; i++) {
        const t = side + (random() - 0.5) * 1.5, rr = R + random() * 0.04;
        foam.push({ at: [Math.cos(t) * rr, 0.004, Math.sin(t) * rr], size: 0.005 + random() * 0.008 });
      }
      add(s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material(pale, { roughness: 0.6, emissive: tint, emissiveIntensity: 0.12 }), foam));
    }
    if (a.state === 'smoking') {
      const smoke = new THREE.Group();
      const haze = new THREE.MeshStandardMaterial({ color: pale.clone().lerp(new THREE.Color('#dcdcdc'), 0.5), transparent: true, opacity: 0.5, roughness: 1, depthWrite: false });
      let x = 0, z = 0;
      for (let i = 0; i < 8; i++) {
        x += (random() - 0.35) * 0.014; z += (random() - 0.5) * 0.01;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.011 + i * 0.0022, 12, 8), haze);
        puff.position.set(x, yT + 0.008 + i * 0.011, z);
        smoke.add(puff);
      }
      // A solid curl at the lip so the vapour still reads in line treatments.
      const lip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshStandardMaterial({ color: '#eef0ee', roughness: 1 }));
      lip.position.set(0, yT + 0.004, 0); lip.scale.set(1, 0.6, 1); lip.castShadow = true;
      smoke.add(lip);
      add(smoke);
      moving.push(smoke);
    }

    // Stopper. An eruption or a fall throws it clear.
    const thrown = foaming || spilled || a.state === 'smoking';
    const sx = thrown ? 0.085 + random() * 0.03 : 0, sz = thrown ? 0.05 + random() * 0.03 : 0, sy = thrown ? 0.012 : yT - 0.008;
    const loose = (o: THREE.Object3D) => { if (thrown) { s.root.add(o); o.rotation.z = Math.PI / 2 - 0.2; o.rotation.y = random() * 3; } else flask.add(o); return o; };
    if (a.stopper === 'cork') loose(s.cylinder(0.02, 0.0155, 0.026, [sx, sy + (thrown ? 0.005 : 0.006), sz], s.material('#b98a55', { roughness: 0.95 }), 16));
    else if (a.stopper === 'bung') {
      loose(s.cylinder(0.021, 0.0155, 0.026, [sx, sy + (thrown ? 0.006 : 0.006), sz], s.material('#a5382e', { roughness: 0.8 }), 16));
      if (!thrown) add(s.tube([[0, level + 0.02, 0], [0, yT + 0.03, 0], [0.006, yT + 0.046, 0], [0.03, yT + 0.05, 0], [0.07, yT + 0.036, 0]], 0.003, s.material('#dff1f4', { roughness: 0.08, transparent: true, opacity: 0.75 })));
    } else if (a.stopper === 'wool') loose(s.ball([0.021, 0.016, 0.021], [sx, sy + (thrown ? 0.004 : 0.012), sz], s.material('#f4f2ea', { roughness: 1 }), 10));
    else if (a.stopper === 'funnel') {
      const f = s.lathe([[0.004, -0.045], [0.005, 0], [0.036, 0.034], [0.037, 0.036]], new THREE.MeshPhysicalMaterial({ color: '#dff1f4', transparent: true, opacity: 0.6, roughness: 0.05, side: THREE.DoubleSide }), [sx, thrown ? 0.03 : yT + 0.004, sz]);
      if (thrown) { s.root.add(f); f.rotation.z = 1.25; f.rotation.y = random() * 3; } else flask.add(f);
    }

    if (spilled) {
      const slope = Math.atan((R - r) / (yN - yS));
      flask.rotation.z = -(Math.PI / 2 - slope);
      flask.rotation.y = (random() - 0.5) * 0.6;
      flask.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(flask);
      flask.position.y = -box.min.y;
      const mouth = new THREE.Vector3(0, yT, 0).applyMatrix4(flask.matrixWorld);
      const amount = mix(0.6, 1.3, a.fill);
      for (let i = 0; i < 7; i++) {
        const d = i * 0.02 * amount, w = (0.022 + random() * 0.03) * amount;
        const pool = s.cylinder(w, w, 0.0018, [mouth.x + d + (random() - 0.5) * 0.02, 0.001 + i * 0.00005, mouth.z + (random() - 0.5) * 0.05 * amount], liquid, 18);
        pool.scale.z = 0.7 + random() * 0.5;
      }
      for (let i = 0; i < 8; i++) s.cylinder(0.004, 0.004, 0.0015, [mouth.x + 0.05 + random() * 0.14 * amount, 0.001, mouth.z + (random() - 0.5) * 0.14], liquid, 8).scale.setScalar(0.5 + random());
    }

    const bx = -(R + 0.05);
    if (a.beside === 'rod') {
      s.rod([bx - 0.03, 0.003, 0.07], [bx + 0.07, 0.003, -0.05], 0.003, s.material('#e2f2f4', { roughness: 0.08 }));
      for (let i = 0; i < 4; i++) s.cylinder(0.005, 0.005, 0.0012, [bx - 0.03 + random() * 0.03, 0.001, 0.06 + random() * 0.03], liquid, 10).scale.setScalar(0.5 + random());
    } else if (a.beside === 'dropper') {
      s.rod([bx + 0.06, 0.005, -0.03], [bx - 0.01, 0.005, 0.045], 0.0045, s.material('#e2f2f4', { roughness: 0.08 }), 0.0045);
      s.rod([bx - 0.01, 0.005, 0.045], [bx - 0.03, 0.003, 0.07], 0.004, s.material('#e2f2f4', { roughness: 0.08 }), 0.001);
      s.ball([0.009, 0.009, 0.016], [bx + 0.07, 0.009, -0.042], s.material('#a5382e'), 12).rotation.y = -0.7;
      s.cylinder(0.006, 0.006, 0.0012, [bx - 0.035, 0.001, 0.078], liquid, 10);
    } else if (a.beside === 'spatula') {
      const steel = s.material('#c5cbcc', { metalness: 0.85, roughness: 0.25 });
      s.rod([bx + 0.07, 0.003, -0.02], [bx - 0.01, 0.003, 0.05], 0.002, steel);
      s.box([0.012, 0.0012, 0.03], [bx - 0.018, 0.003, 0.057], steel).rotation.y = -0.85;
      const heap = s.lathe([[0, 0.014], [0.008, 0.011], [0.017, 0.004], [0.024, 0]], s.material(new THREE.Color(tint).lerp(new THREE.Color('#f2f0e6'), 0.55), { roughness: 1 }), [bx - 0.03, 0, 0.085]);
      heap.scale.z = 0.8;
    }

    const speed = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const m of moving) { m.rotation.y = Math.sin(time * speed * 0.6) * 0.5; m.scale.y = 1 + Math.sin(time * speed) * 0.05; } },
    });
  },
});

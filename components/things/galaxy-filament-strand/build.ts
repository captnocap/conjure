import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Strand { curve: THREE.CatmullRomCurve3; thick: number; weight: number; beads: number; fray: boolean }

const GAS: Record<string, [string, string]> = {
  violet: ['#8f7fd0', '#5d4aa6'],
  gold: ['#e8b24a', '#b9792a'],
  teal: ['#5fb9b4', '#2f7f8c'],
  rose: ['#e58aa6', '#b4527a'],
  bone: ['#d9d2c0', '#9a947f'],
};

export default defineThing({
  questions: {
    habit: choice('How does the strand branch?', {
      single: 'One unbroken rope sagging between two unseen anchors.',
      forked: 'A rope that splits in two partway along, like a river delta or a Y of nerve.',
      braided: 'Three thinner strands twisted loosely round each other, touching at the beads.',
      rooted: 'A thick trunk that divides again and again into fine rootlets, like mycelium.',
      web: 'A main thread with short cross-threads hanging off it, a torn corner of a spiderweb.',
    }),
    beads: score('How closely are the bright beads strung along it?', ['Two or three far apart', 'A handful, unevenly spaced', 'Regular as a rosary', 'Crowded, nearly touching']),
    gas: choice('What colour is the faint gas sheathing it?', {
      violet: 'Soft violet, cool and distant.',
      gold: 'Warm gold, like lamplight through honey.',
      teal: 'Sea teal, wet and alive.',
      rose: 'Rose pink, tender and bodily.',
      bone: 'Bone grey, dry and old.',
    }),
    state: choice('What is happening to the strand right now?', {
      steady: 'Holding steady, a quiet finished thread.',
      feeding: 'Feeding: thin tributaries of matter stream in toward every bead and the rope is fat with it.',
      fraying: 'Fraying: the ends unravel into loose wisps and stray points drift off.',
      severed: 'Severed: a gap has opened in the middle and the two halves no longer meet.',
      sparking: 'Sparking: one bead has flared far brighter than the rest, a signal passing along.',
    }),
    fibre: choice('What is the strand made of at its core?', {
      points: 'Nothing but points of light: it is only a rope because of how they crowd together.',
      thread: 'A fine solid silk thread runs through it, with the points clinging like dew.',
      cord: 'A thick pale cord like a root or nerve fibre, with points dusted over it.',
    }),
    ends: choice('How do its ends finish?', {
      taper: 'Both ends thin away to nothing.',
      knot: 'One end arrives at a large bright knot, a destination.',
      bulbs: 'Each end swells into a small bulb, like a synapse or a root tip.',
    }),
    stragglers: noul('Is there a loose halo of stray points drifting around it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const [gasLight, gasDeep] = GAS[a.gas];
    const fat = a.state === 'feeding' ? 1.45 : a.state === 'fraying' ? 0.8 : 1;
    const curveOf = (points: P3[]) => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const beadCount = Math.round(mix(2, 9, a.beads));
    const strands: Strand[] = [];
    const wig = (amount: number) => (random() - 0.5) * amount;
    const sag = (x: number) => 0.7 + 3.3 * (x / 4.6) ** 2;

    if (a.habit === 'single' || a.habit === 'web') {
      const main: P3[] = [];
      for (let i = 0; i <= 8; i++) { const x = -4.6 + i * 1.15; main.push([x, sag(x) + wig(0.35), Math.sin(i * 0.9 + random()) * 0.55]); }
      strands.push({ curve: curveOf(main), thick: 0.2, weight: 1, beads: beadCount, fray: true });
      if (a.habit === 'web') {
        const hang = 3 + Math.floor(random() * 3);
        for (let i = 0; i < hang; i++) {
          const from = strands[0].curve.getPoint(0.12 + (i + random() * 0.6) / hang * 0.76);
          const reach = 1.4 + random() * 1.6, lean = wig(1.6);
          strands.push({ curve: curveOf([[from.x, from.y, from.z], [from.x + lean * 0.4, from.y + reach * 0.5, from.z + wig(0.8)], [from.x + lean, from.y + reach, from.z + wig(1.4)]]), thick: 0.09, weight: 0.3, beads: 1 + Math.floor(random() * 2), fray: true });
        }
      }
    } else if (a.habit === 'forked') {
      const split: P3 = [0.4 + wig(1), 0.8, wig(0.4)];
      strands.push({ curve: curveOf([[-4.4, 4.2 + wig(0.4), wig(0.6)], [-3, 2.3, 0.4], [-1.4, 1.2, -0.2], split]), thick: 0.24, weight: 0.55, beads: Math.ceil(beadCount / 2), fray: true });
      strands.push({ curve: curveOf([split, [1.7, 1.9, -0.6], [2.9, 3.5, -0.9], [4.0, 5.2 + wig(0.5), -1.2]]), thick: 0.16, weight: 0.4, beads: Math.ceil(beadCount / 2.5), fray: true });
      strands.push({ curve: curveOf([split, [1.9, 0.55, 0.7], [3.3, 0.5, 1.1], [4.5, 0.95 + wig(0.4), 1.5]]), thick: 0.14, weight: 0.4, beads: Math.ceil(beadCount / 2.5), fray: true });
    } else if (a.habit === 'braided') {
      for (let k = 0; k < 3; k++) {
        const pts: P3[] = [];
        for (let i = 0; i <= 12; i++) {
          const x = -4.6 + i * (9.2 / 12), turn = i * 1.05 + k * Math.PI * 2 / 3, spread = 0.42 * Math.abs(Math.sin(i * Math.PI / 4 + 0.4));
          pts.push([x, sag(x) + Math.cos(turn) * spread, Math.sin(turn) * spread]);
        }
        strands.push({ curve: curveOf(pts), thick: 0.1, weight: 0.42, beads: k === 0 ? beadCount : 0, fray: true });
      }
    } else {
      const grow = (from: THREE.Vector3, dir: THREE.Vector3, length: number, thick: number, depth: number) => {
        const mid = from.clone().addScaledVector(dir, length * 0.5).add(new THREE.Vector3(0, wig(0.3), wig(0.3)));
        const end = from.clone().addScaledVector(dir, length).add(new THREE.Vector3(0, wig(0.3), wig(0.3)));
        strands.push({ curve: curveOf([from.toArray() as P3, mid.toArray() as P3, end.toArray() as P3]), thick, weight: length * thick * 2.2, beads: depth === 0 ? Math.ceil(beadCount / 2) : beadCount > 4 || random() < 0.5 ? 1 : 0, fray: depth >= 2 });
        if (depth >= 3) return;
        const kids = depth === 0 ? 3 : 2;
        for (let k = 0; k < kids; k++) {
          const turned = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (k - (kids - 1) / 2) * mix(0.55, 0.8, random()) + wig(0.15)).applyAxisAngle(new THREE.Vector3(0, 1, 0), wig(0.7));
          grow(end, turned, length * mix(0.6, 0.78, random()), thick * 0.66, depth + 1);
        }
      };
      grow(new THREE.Vector3(-4.6, 1.9, 0), new THREE.Vector3(1, 0, 0), 3.1, 0.26, 0);
    }

    const cut = a.state === 'severed' ? 0.42 + random() * 0.16 : -1;
    const points: { at: P3; size: number; color: THREE.ColorRepresentation }[] = [];
    const star = [new THREE.Color('#e9ac28'), new THREE.Color('#c97a14'), new THREE.Color('#f6d470'), new THREE.Color(gasDeep), new THREE.Color('#a8620f')];
    const cool = new THREE.Color('#7d8fd6');
    const tint = () => {
      const colour = star[Math.floor(random() * star.length)].clone();
      colour.lerp(cool, (1 - mood.warmth) * 0.45 * random());
      colour.lerp(new THREE.Color('#6f6878'), (1 - mood.cheer) * 0.3 + mood.wear * 0.2);
      return colour;
    };
    const direction = () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()); return v.lengthSq() ? v.normalize() : v.set(0, 1, 0); };
    const dotGeometry = new THREE.IcosahedronGeometry(1, 0);
    const gasPaint = new THREE.MeshBasicMaterial({ color: gasDeep, transparent: true, opacity: mix(0.2, 0.34, mood.cheer) * (a.state === 'feeding' ? 1.25 : 1), depthWrite: false });
    const corePaint = s.material(a.fibre === 'cord' ? '#cdb98a' : '#e8dcc0', { emissive: gasDeep, emissiveIntensity: 0.3, roughness: 0.5 });
    const beadPaint = new THREE.MeshStandardMaterial({ color: '#ffd874', emissive: '#e89a18', emissiveIntensity: mix(0.5, 1.1, mood.cheer), roughness: 0.4 });
    const haloPaint = new THREE.MeshBasicMaterial({ color: '#f2b63a', transparent: true, opacity: 0.3, depthWrite: false });
    const beadMeshes: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    const beadSpots: THREE.Vector3[] = [];
    const perMetre = mix(110, 240, mood.density) * fat;
    let longest = strands[0];

    for (const strand of strands) {
      const length = strand.curve.getLength();
      if (length > longest.curve.getLength()) longest = strand;
      const taper = (t: number) => {
        const endFade = a.ends === 'taper' ? Math.min(1, Math.sin(Math.PI * Math.min(Math.max(t, 0.02), 0.98)) * 2.2 + 0.25) : 1;
        const gap = cut >= 0 && strand === strands[0] ? Math.min(1, Math.abs(t - cut) * 9) : 1;
        return endFade * gap;
      };
      const beadsAt: number[] = [];
      for (let i = 0; i < strand.beads; i++) {
        let t = (i + 0.5 + (a.beads > 0.55 && a.beads < 0.85 ? 0 : wig(0.7))) / strand.beads * 0.86 + 0.07;
        if (cut >= 0 && strand === strands[0] && Math.abs(t - cut) < 0.09) t += t < cut ? -0.1 : 0.1;
        beadsAt.push(Math.min(0.97, Math.max(0.03, t)));
      }
      const count = Math.round(length * perMetre * Math.sqrt(strand.thick / 0.2));
      for (let i = 0; i < count; i++) {
        const inBead = beadsAt.length > 0 && random() < 0.42;
        let t = random(), spread = strand.thick * fat;
        if (inBead) { t = beadsAt[Math.floor(random() * beadsAt.length)] + gauss() * 0.018 * (9 / length); spread *= 2.1; }
        t = Math.min(1, Math.max(0, t));
        const keep = taper(t);
        if (!inBead && random() > keep) continue;
        const at = strand.curve.getPoint(t).addScaledVector(direction(), Math.abs(gauss()) * spread * (inBead ? 1 : 0.5 + keep * 0.5));
        if (cut >= 0 && strand === strands[0] && Math.abs(t - cut) < 0.07) at.y -= (0.07 - Math.abs(t - cut)) * 14 * random();
        points.push({ at: at.toArray() as P3, size: (inBead ? 0.048 : 0.034) + random() * 0.046, color: tint() });
      }
      // Faint gas sheath and, when asked for, a solid fibre: both follow the same curve.
      const ranges: [number, number][] = cut >= 0 && strand === strands[0] ? [[0, cut - 0.07], [cut + 0.07, 1]] : [[0, 1]];
      for (const [from, to] of ranges) {
        const piece: P3[] = [];
        for (let i = 0; i <= 14; i++) piece.push(strand.curve.getPoint(mix(from, to, i / 14)).toArray() as P3);
        s.tube(piece, strand.thick * fat * 1.5, gasPaint).castShadow = false;
        if (a.fibre !== 'points') s.tube(piece, a.fibre === 'cord' ? strand.thick * 0.42 : 0.035, corePaint);
      }
      beadsAt.forEach((t, index) => {
        const at = strand.curve.getPoint(t);
        const radius = strand.thick * fat * mix(0.75, 1.25, random());
        const flare = a.state === 'sparking' && strand === strands[0] && index === Math.floor(strand.beads / 2);
        const mesh = s.ball([1, 1, 1], at.toArray() as P3, flare ? new THREE.MeshBasicMaterial({ color: '#fffbe6' }) : beadPaint, 14);
        const base = radius * (flare ? 1.7 : 0.8);
        mesh.scale.setScalar(base);
        beadMeshes.push({ mesh, base, phase: at.x });
        const halo = s.ball([1, 1, 1], at.toArray() as P3, haloPaint, 14);
        halo.scale.setScalar(radius * (flare ? 3.2 : 2.1));
        halo.castShadow = false;
        beadSpots.push(at);
        if (flare) for (let k = 0; k < 10; k++) {
          const out = direction();
          s.rod(at.clone().addScaledVector(out, radius * 2).toArray() as P3, at.clone().addScaledVector(out, radius * mix(4, 7, random())).toArray() as P3, 0.04, new THREE.MeshBasicMaterial({ color: '#ffe08a' }), 0.002);
        }
      });
      if (strand.fray && a.state === 'fraying') {
        for (const end of [0, 1]) for (let k = 0; k < 4; k++) {
          const from = strand.curve.getPoint(end ? 0.9 : 0.1), tangent = strand.curve.getTangent(end ? 0.95 : 0.05).multiplyScalar(end ? 1 : -1);
          const out = tangent.add(direction().multiplyScalar(0.9)).normalize(), reach = 0.7 + random() * 1.1;
          for (let i = 0; i < 46; i++) {
            const u = random();
            const at = from.clone().addScaledVector(out, u * reach).addScaledVector(direction(), 0.05 + u * 0.16);
            at.y -= u * u * 0.5;
            points.push({ at: at.toArray() as P3, size: 0.03 + random() * 0.03, color: tint() });
          }
        }
      }
    }

    if (a.state === 'feeding') {
      for (const spot of beadSpots) for (let k = 0; k < 3; k++) {
        const out = direction(); out.x *= 0.45; out.normalize();
        const reach = 0.9 + random() * 1.0, bend = direction().multiplyScalar(0.35);
        for (let i = 0; i < 34; i++) {
          const u = Math.sqrt(random());
          const at = spot.clone().addScaledVector(out, u * reach).addScaledVector(bend, Math.sin(u * Math.PI)).addScaledVector(direction(), 0.03 + u * 0.05);
          points.push({ at: at.toArray() as P3, size: 0.05 * (1.15 - u) + 0.014, color: tint() });
        }
      }
    }
    if (a.stragglers) for (let i = 0; i < 160; i++) {
      const at = longest.curve.getPoint(random()).addScaledVector(direction(), 0.5 + Math.abs(gauss()) * 1.1);
      points.push({ at: at.toArray() as P3, size: 0.028 + random() * 0.03, color: tint() });
    }

    const tips = [longest.curve.getPoint(0), longest.curve.getPoint(1)];
    if (a.ends === 'knot') {
      const at = tips[1];
      s.ball([0.34, 0.3, 0.34], at.toArray() as P3, beadPaint, 18);
      s.ball([0.95, 0.85, 0.95], at.toArray() as P3, haloPaint, 18).castShadow = false;
      for (let i = 0; i < 260; i++) points.push({ at: at.clone().addScaledVector(direction(), 0.3 + Math.abs(gauss()) * 0.55).toArray() as P3, size: 0.04 + random() * 0.045, color: tint() });
    } else if (a.ends === 'bulbs') {
      const ends = strands.length > 1 && a.habit !== 'braided' ? strands.filter((strand) => strand.fray).map((strand) => strand.curve.getPoint(1)).concat([strands[0].curve.getPoint(0)]) : tips;
      for (const at of ends.slice(0, 14)) s.ball([0.15, 0.15, 0.15], at.toArray() as P3, s.material(gasLight, { emissive: gasDeep, emissiveIntensity: 0.5, roughness: 0.35 }), 14);
    }

    s.scatter(dotGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff' }), points).castShadow = false;

    const speed = mix(0.4, 3.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const bead of beadMeshes) bead.mesh.scale.setScalar(bead.base * (1 + 0.16 * Math.sin(time * speed - bead.phase * 1.3)));
      },
    });
  },
});

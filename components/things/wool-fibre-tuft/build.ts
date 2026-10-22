import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Bag, V, WOOL, aim, crimp, dewMaterial, finish, flake, flakePlan, ice, matte, plied, tube, xf } from './bits';

const SECOND = { red: '#b5352f', cream: '#d9cdae', mustard: '#c4952f', sky: '#6f9fc8', grey: '#8a8d93', pink: '#c9778f' } as const;

export default defineThing({
  questions: {
    shape: choice('What has the wool done here?', {
      wisp: 'A wispy fan of loose fibres standing up from the knit like winter grass.',
      bobble: 'A pilled bobble: a tangled ball of fibres rolled up on a short stalk.',
      snag: 'A whole loop of yarn snagged and pulled out, standing in an arch.',
      darn: 'A darned patch: a neat woven square of different yarn laid over the knitting.',
      hole: 'A frayed hole with broken yarn ends curling up round a dark gap.',
    }),
    dye: choice('What colour is the wool?', {
      charcoal: 'Charcoal grey, a sensible school mitten.',
      navy: 'Navy blue.',
      oxblood: 'Deep oxblood red.',
      forest: 'Forest green.',
      mustard: 'Mustard yellow.',
      heather: 'Heathered grey-lilac, flecked.',
      cream: 'Undyed cream, straight off the sheep.',
      teal: 'Teal.',
    }),
    second: choice('If there is mending or a contrasting yarn, what colour is it?', {
      red: 'Bright red, mended to be seen.',
      cream: 'Cream.',
      mustard: 'Mustard.',
      sky: 'Sky blue.',
      grey: 'A grey that nearly matches but does not.',
      pink: 'Dusty pink.',
    }),
    crimp: score('How crimped are the fibres?', ['Nearly straight and hairy', 'Gently waved', 'Tightly kinked like a lamb']),
    knit: choice('What is the knitting under it like?', {
      stocking: 'Smooth stocking stitch: neat columns of little Vs.',
      garter: 'Garter stitch: bumpy ridges running across like a ploughed field.',
      felted: 'Felted flat by years of washing, the stitches gone.',
    }),
    holding: choice('What is caught in it?', {
      nothing: 'Nothing.',
      bead: 'A bead of meltwater sitting on the fibres.',
      flake: 'A tiny snowflake that has not melted yet.',
      frost: 'Frost: the fibre tips are white with rime.',
      burr: 'A seed burr and specks of grit from the hedge.',
      needle: 'A darning needle, left threaded through it mid-job.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), sway = new THREE.Group();
    const yarn = new Bag(), fine = new Bag(), loose = new Bag(), extra = new Bag(), white = new Bag();
    const dye = new THREE.Color(WOOL[a.dye]).offsetHSL((mood.warmth - 0.5) * 0.02, (mood.cheer - 0.5) * 0.18 - mood.wear * 0.08, mood.wear * 0.05);
    const other = new THREE.Color(SECOND[a.second]).offsetHSL(0, (mood.cheer - 0.5) * 0.15, 0);
    const shade = (c: THREE.Color, amount = 0.08) => c.clone().offsetHSL(a.dye === 'heather' ? (random() - 0.5) * 0.08 : 0, 0, (random() - 0.5) * amount);
    const half = 0.125, top = 0.03;
    const hole = a.shape === 'hole' ? 0.05 : 0;

    // The knitting it grew out of.
    yarn.add(new THREE.BoxGeometry(half * 2, 0.016, half * 2), dye.clone().multiplyScalar(0.6), xf(V(0, 0.008, 0)));
    if (a.knit === 'stocking') {
      const px = 0.05, pz = 0.046;
      for (let c = -2; c <= 2; c++) for (let r = -2; r <= 2; r++) {
        const x = c * px, z = r * pz;
        if (Math.hypot(x, z) < hole) continue;
        for (const side of [-1, 1]) {
          const from = V(x, 0.018, z + pz * 0.62), to = V(x + side * px * 0.44, 0.018, z - pz * 0.62);
          yarn.add(tube([from, from.clone().lerp(to, 0.5).add(V(side * 0.004, 0.016, 0)), to], 0.0125, { sides: 7, smooth: 8, colour: plied(shade(dye, 0.05), 3) }));
        }
      }
    } else if (a.knit === 'garter') {
      for (let r = -2; r <= 2; r++) {
        const z = r * 0.05, points: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) {
          const x = -half + 0.01 + (i / 40) * (half * 2 - 0.02);
          points.push(V(x, 0.02 + Math.abs(Math.sin((i / 40) * Math.PI * 5 + r * 1.5)) * 0.012, z + Math.sin((i / 40) * Math.PI * 10 + r) * 0.006));
        }
        if (!hole) yarn.add(tube(points, 0.015, { sides: 7, colour: plied(shade(dye, 0.05), 14) }));
        else for (const part of [points.filter((p) => p.x < -hole || Math.abs(z) > hole), points.filter((p) => p.x > hole && Math.abs(z) <= hole)]) if (part.length > 2) yarn.add(tube(part, 0.015, { sides: 7, colour: plied(shade(dye, 0.05), 8) }));
      }
    } else {
      // Matted felt: no stitches left, only lumps and fibres pressed flat.
      for (let i = 0; i < 40; i++) {
        const at = V((random() - 0.5) * half * 1.8, 0.015, (random() - 0.5) * half * 1.8);
        if (at.length() < hole) continue;
        yarn.add(new THREE.SphereGeometry(1, 10, 6), shade(dye, 0.07), xf(at, V(0.02 + random() * 0.02, 0.007 + random() * 0.006, 0.02 + random() * 0.02)));
      }
      for (let i = 0; i < 50; i++) {
        const from = V((random() - 0.5) * half * 1.8, 0.022, (random() - 0.5) * half * 1.8), to = from.clone().add(V((random() - 0.5) * 0.09, 0, (random() - 0.5) * 0.09));
        if (from.length() < hole * 1.2 || Math.max(Math.abs(to.x), Math.abs(to.z)) > half) continue;
        fine.add(tube(crimp(from, to, 0.004, 3, random), 0.0022, { sides: 4 }), shade(dye, 0.16).offsetHSL(0, 0, 0.05));
      }
    }

    // Halo: the fuzz every wool surface carries, thicker when worn.
    const fuzz = Math.round(mix(40, 110, mood.wear * 0.6 + mood.density * 0.4));
    for (let i = 0; i < fuzz; i++) {
      const from = V((random() - 0.5) * half * 1.9, top * 0.8, (random() - 0.5) * half * 1.9);
      if (from.length() < hole) continue;
      const to = from.clone().add(V((random() - 0.5) * 0.05, 0.025 + random() * 0.05, (random() - 0.5) * 0.05));
      fine.add(tube(crimp(from, to, 0.004, 2 + random() * 2, random, 0.2), 0.0016, { sides: 4 }), shade(dye, 0.16).offsetHSL(0, 0, 0.06));
    }
    for (let i = 0; i < Math.round(mood.wear * 7); i++) {
      const at = V((random() - 0.5) * half * 1.6, top + 0.004, (random() - 0.5) * half * 1.6);
      if (at.length() > 0.07) yarn.add(new THREE.IcosahedronGeometry(1, 1), shade(dye, 0.12).offsetHSL(0, 0, 0.05), xf(at, 0.009 + random() * 0.009));
    }

    const amp = mix(0.0015, 0.013, a.crimp), waves = mix(1.5, 9, a.crimp);
    const tips: THREE.Vector3[] = [];
    let crown = V(0, top, 0);
    /** One fibre; the thick ones show the scaly cuticle as ridges and pale bands. */
    const fibre = (bag: Bag, from: THREE.Vector3, to: THREE.Vector3, r: number, tint: THREE.Color, droop = 0.15) => {
      const scaly = r > 0.0045, points = crimp(from, to, amp * (scaly ? 1.4 : 1), waves, random, droop);
      bag.add(tube(points, (t) => mix(r, r * 0.45, t) * (scaly ? 1 + 0.22 * ((t * 22) % 1) : 1), { sides: scaly ? 7 : 5, smooth: scaly ? 44 : undefined, colour: scaly ? (t) => tint.clone().offsetHSL(0, 0, ((t * 22) % 1) * 0.1) : undefined }), scaly ? null : tint);
      tips.push(points[points.length - 1]);
    };

    if (a.shape === 'wisp') {
      const count = Math.round(mix(20, 44, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, lean = random() ** 0.7 * 0.7, length = 0.15 + random() * 0.19, hero = i < 5;
        const from = V(Math.cos(angle) * 0.02 * random(), top * 0.6, Math.sin(angle) * 0.02 * random());
        fibre(loose, from, from.clone().add(V(Math.sin(lean) * Math.cos(angle), Math.cos(lean), Math.sin(lean) * Math.sin(angle)).multiplyScalar(hero ? length * 1.1 : length)), hero ? 0.0062 : 0.0022 + random() * 0.0014, shade(dye, 0.14).offsetHSL(0, 0, hero ? 0.07 : 0.03));
      }
      crown = V(0, 0.22, 0);
    } else if (a.shape === 'bobble') {
      const centre = V(0.01, 0.15, 0), R = 0.07;
      for (let i = 0; i < 7; i++) fibre(loose, V((random() - 0.5) * 0.03, top * 0.6, (random() - 0.5) * 0.03), centre.clone().add(V((random() - 0.5) * 0.03, -R * 0.6, (random() - 0.5) * 0.03)), 0.004, shade(dye), 0);
      yarn.add(new THREE.IcosahedronGeometry(R * 0.86, 2), dye.clone().multiplyScalar(0.8), xf(centre));
      const strands = Math.round(mix(40, 70, mood.density));
      for (let i = 0; i < strands; i++) {
        const u = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), v = V(u.y, u.z, u.x).cross(u).normalize(), w = u.clone().cross(v);
        const start = random() * 6.3, span = 1.5 + random() * 3, rr = R * (0.9 + random() * 0.16), points: THREE.Vector3[] = [];
        for (let k = 0; k <= 14; k++) {
          const th = start + (k / 14) * span, wob = 1 + Math.sin(k * waves * 0.5) * amp * 3;
          points.push(centre.clone().addScaledVector(v, Math.cos(th) * rr * wob).addScaledVector(w, Math.sin(th) * rr * wob));
        }
        loose.add(tube(points, 0.0026 + random() * 0.002, { sides: 5 }), shade(dye, 0.2).offsetHSL(0, 0, 0.05));
      }
      for (let i = 0; i < 12; i++) {
        const dir = V(random() - 0.5, random() - 0.2, random() - 0.5).normalize();
        fibre(loose, centre.clone().addScaledVector(dir, R * 0.9), centre.clone().addScaledVector(dir, R * (1.4 + random() * 0.7)), 0.002, shade(dye, 0.2).offsetHSL(0, 0, 0.06), 0.3);
      }
      crown = centre.clone().add(V(0, R, 0));
    } else if (a.shape === 'snag') {
      const h = 0.21 + random() * 0.06, kink = (random() - 0.5) * 0.05;
      const path = [V(-0.045, 0.02, 0.01), V(-0.07, h * 0.5, 0.02), V(kink, h, 0), V(0.075, h * 0.55, -0.02), V(0.04, 0.02, -0.01)];
      loose.add(tube(path, 0.0175, { sides: 8, smooth: 40, colour: plied(dye.clone().offsetHSL(0, 0, 0.03), 11) }));
      const curve = new THREE.CatmullRomCurve3(path);
      for (let i = 0; i < 26; i++) {
        const p = curve.getPoint(0.08 + random() * 0.84);
        fibre(loose, p, p.clone().add(V((random() - 0.5) * 0.07, (random() - 0.3) * 0.06, (random() - 0.5) * 0.07)), 0.0018, shade(dye, 0.2).offsetHSL(0, 0, 0.07), 0.2);
      }
      // The row it was dragged from puckers toward the snag.
      for (const side of [-1, 1]) yarn.add(tube([V(side * 0.045, 0.03, 0), V(side * 0.1, 0.042, 0.004), V(side * 0.16, 0.03, 0)], 0.012, { sides: 6, smooth: 10 }), shade(dye));
      crown = V(kink, h + 0.0175, 0);
    } else if (a.shape === 'darn') {
      const n = 8, span = 0.078, y = top + 0.008;
      for (let i = 0; i < n; i++) {
        const o = mix(-span, span, i / (n - 1));
        for (const weft of [false, true]) {
          const points: THREE.Vector3[] = [];
          for (let k = 0; k <= 28; k++) {
            const s = mix(-span - 0.012, span + 0.012, k / 28), cell = ((s + span) / (2 * span)) * (n - 1);
            const lift = Math.cos(cell * Math.PI + (i % 2 ? Math.PI : 0)) * 0.0045 * (weft ? 1 : -1);
            points.push(weft ? V(s, y + lift, o) : V(o, y + lift, s));
          }
          yarn.add(tube(points, 0.0062, { sides: 6, colour: plied(shade(other, 0.09), 9) }));
        }
      }
      // Loose tails where the mender started and finished.
      fibre(loose, V(-span, y, span), V(-span - 0.04, y + 0.09, span + 0.03), 0.0055, other, 0.5);
      fibre(loose, V(span, y, -span), V(span + 0.04, y + 0.06, -span - 0.02), 0.0055, other, 0.6);
      crown = V(0, y + 0.012, 0);
    } else {
      yarn.add(new THREE.CylinderGeometry(hole * 1.1, hole * 1.1, 0.004, 20), '#14161a', xf(V(0, 0.0175, 0)));
      const ends = 10 + Math.floor(random() * 4);
      for (let i = 0; i < ends; i++) {
        const angle = (i / ends) * Math.PI * 2 + random() * 0.3, out = V(Math.cos(angle), 0, Math.sin(angle));
        const from = out.clone().multiplyScalar(hole * 1.3).setY(0.022), to = out.clone().multiplyScalar(hole * (0.95 + random() * 0.7)).setY(0.05 + random() * 0.06);
        loose.add(tube([from, from.clone().lerp(to, 0.5).add(V(0, 0.02, 0)).addScaledVector(out, 0.012), to], (t) => mix(0.011, 0.006, t), { sides: 6, smooth: 10, colour: plied(shade(dye, 0.06), 4) }));
        for (let k = 0; k < 4; k++) fibre(loose, to, to.clone().add(V((random() - 0.5) * 0.05, 0.02 + random() * 0.04, (random() - 0.5) * 0.05)), 0.002, shade(dye, 0.2).offsetHSL(0, 0, 0.06), 0.3);
      }
      // Ladder rungs: the strands still crossing the gap.
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * hole * 0.55 + (random() - 0.5) * 0.01;
        yarn.add(tube([V(-hole * 1.1, 0.024, z), V(0, 0.022, z + 0.004), V(hole * 1.1, 0.024, z)], 0.0035, { sides: 5, smooth: 8 }), shade(dye, 0.1).offsetHSL(0, 0, 0.05));
      }
      crown = V(0, 0.05, 0);
    }

    // What it has caught.
    const still = new THREE.Group();
    if (a.holding === 'bead') {
      const r = 0.034 + random() * 0.012;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), dewMaterial('#dfe6ec', dye.clone().lerp(new THREE.Color('#ffffff'), 0.25), 0.3));
      bead.scale.set(r, r * 0.92, r);
      bead.position.copy(crown).add(V(0, r * 0.75, 0));
      bead.castShadow = true;
      (a.shape === 'wisp' || a.shape === 'snag' ? sway : still).add(bead);
      if (a.shape === 'wisp') bead.position.set(0.012, 0.11, 0.012);
    } else if (a.holding === 'flake') {
      const r = 0.06, at = a.shape === 'wisp' ? V(0.01, 0.17, 0.02) : crown.clone().add(V(0, 0.012, 0.01));
      flake(extra, flakePlan(random() < 0.5 ? 'fern' : 'stellar', 0.6, random), { matrix: xf(at, r, new THREE.Euler(-1.15, 0.3, random())), tone: (depth) => ['#3f7fc0', '#7fb5e2', '#c2e0f5', '#2f6aa8'][depth], thick: 0.07, random });
    } else if (a.holding === 'frost') {
      for (const tip of tips) for (let k = 0; k < 3; k++) white.add(new THREE.IcosahedronGeometry(1, 0), '#f3f8fc', xf(tip.clone().add(V((random() - 0.5) * 0.008, -k * 0.006, (random() - 0.5) * 0.008)), 0.0035 + random() * 0.004));
      for (let i = 0; i < 40; i++) white.add(new THREE.IcosahedronGeometry(1, 0), '#f3f8fc', xf(V((random() - 0.5) * half * 1.8, top + 0.004, (random() - 0.5) * half * 1.8), 0.004 + random() * 0.004));
    } else if (a.holding === 'burr') {
      const at = crown.clone().add(V(0.03, a.shape === 'wisp' ? -0.09 : 0.012, 0.02));
      extra.add(new THREE.IcosahedronGeometry(0.02, 1), '#8a6a3c', xf(at));
      for (let i = 0; i < 26; i++) {
        const dir = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
        extra.add(new THREE.ConeGeometry(0.0022, 0.02, 4), '#b08a4e', aim(at.clone().addScaledVector(dir, 0.016), at.clone().addScaledVector(dir, 0.04)));
      }
      for (let i = 0; i < 9; i++) extra.add(new THREE.DodecahedronGeometry(1, 0), i % 2 ? '#5a4a38' : '#9a8a70', xf(V((random() - 0.5) * half * 1.5, top + 0.003, (random() - 0.5) * half * 1.5), 0.004 + random() * 0.005));
    } else if (a.holding === 'needle') {
      const from = V(-0.1, 0.028, 0.08), to = V(0.1, 0.14, -0.03);
      extra.add(new THREE.CylinderGeometry(0.001, 0.005, 1, 8).translate(0, 0.5, 0), '#c9ced3', aim(from, to, V(1, from.distanceTo(to), 1)));
      extra.add(new THREE.TorusGeometry(0.007, 0.0028, 6, 12), '#c9ced3', aim(from.clone().add(V(-0.008, -0.004, 0.005)), to, 1).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2).scale(V(0.8, 2.2, 1))));
      const thread = a.shape === 'darn' ? other : shade(other, 0);
      yarn.add(tube([from.clone().add(V(-0.012, -0.004, 0.008)), V(-0.14, 0.06, 0.1), V(-0.12, 0.03, 0.115), V(-0.06, 0.03, 0.118), V(0.0, 0.03, 0.112)], 0.006, { sides: 6, smooth: 24, colour: plied(thread, 10) }));
    }

    yarn.into(root, matte({ roughness: 0.95 }));
    fine.into(root, matte({ roughness: 1 }));
    loose.into(sway, matte({ roughness: 0.95 }));
    white.into(sway, matte({ roughness: 0.9, emissive: '#b9cbdc', emissiveIntensity: 0.25 }));
    const steel = extra.into(a.holding === 'flake' ? sway : still, a.holding === 'flake' ? ice(0.1) : matte({ roughness: a.holding === 'needle' ? 0.25 : 0.8, metalness: a.holding === 'needle' ? 0.8 : 0 }));
    void steel;
    root.add(sway, still);

    const moving = a.shape === 'wisp' || a.shape === 'snag' || a.shape === 'bobble';
    const pace = mix(0.4, 3, mood.energy), swing = mix(0.008, 0.09, mood.energy);
    return finish(root, moving ? (_dt, time) => { sway.rotation.z = Math.sin(time * pace) * swing; sway.rotation.x = Math.cos(time * pace * 0.7) * swing * 0.6; } : undefined, half);
  },
});

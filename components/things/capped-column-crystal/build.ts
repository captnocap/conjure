import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, V, bar, finish, flake, flakePlan, ice, matte, xf } from './bits';

export default defineThing({
  questions: {
    form: choice('What kind of crystal is it?', {
      spool: 'A stubby column with two broad plates, exactly like a cotton reel.',
      axle: 'A long thin column with a small wheel on each end, an axle from a toy cart.',
      triple: 'A column with three plates, one caught halfway along, like a stack of cake stands.',
      needles: 'A loose bundle of long needle crystals lying together like spilled pins.',
      rosette: 'A bullet rosette: several pointed columns grown out of one centre like a caltrop.',
      hollow: 'A plain column with no caps, its ends hollowed into funnels.',
    }),
    plates: choice('If it has end plates, what are they like?', {
      plain: 'Smooth clean hexagons.',
      sectored: 'Hexagons ridged from centre to each corner, like a cut gem.',
      sprouting: 'Small plates that have begun to sprout stubby star arms at the corners.',
      mismatched: 'One big plate and one small, so it sits askew.',
    }),
    pose: choice('How is it sitting?', {
      standing: 'Upright on one plate, a tiny pedestal table.',
      lying: 'On its side, resting on the rims like a dropped spool.',
      propped: 'Tipped over against a grain of snow, one end in the air.',
    }),
    core: choice('What can be seen inside the ice?', {
      clear: 'Nothing: flawless glass.',
      hourglass: 'A pale hourglass where two hollow cones meet in the middle.',
      bubbles: 'A string of tiny trapped air bubbles down the axis.',
      cloudy: 'A milky white core, frosted from within.',
    }),
    state: choice('What has happened to it?', {
      pristine: 'Nothing: edges like a new-cut prism.',
      rimed: 'Speckled with frozen droplets on its upper sides.',
      chipped: 'A wedge has broken out of one plate and lies beside it.',
      softened: 'Sublimating: its corners have rounded off and it has shrunk a little.',
    }),
    company: choice('Is it alone?', {
      single: 'A single specimen.',
      pair: 'Two, the second smaller and lying against the first.',
      litter: 'One specimen among a litter of tiny plates and columns.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), tilt = new THREE.Group();
    const shell = new Bag(), plate = new Bag(), inner = new Bag(), white = new Bag(), still = new Bag();
    const warm = (mood.warmth - 0.5) * 0.05;
    const tone = (hex: string, lift = 0) => new THREE.Color(hex).offsetHSL(warm, 0, lift);
    const sides = 6, shrink = a.state === 'softened' ? 0.86 : 1;
    const column = (bag: Bag, r: number, h: number, m: THREE.Matrix4, hex = '#5f9fd6', r2 = r) => bag.add(new THREE.CylinderGeometry(r2, r, h, sides), tone(hex, (random() - 0.5) * 0.04), m);

    /** A hexagonal plate lying in the XZ plane at height y, optionally with a wedge missing. */
    const cap = (y: number, R: number, t: number, up: number, wedge: boolean) => {
      const arc = wedge ? Math.PI * 2 * (5 / 6) : Math.PI * 2, n = wedge ? 5 : sides;
      plate.add(new THREE.CylinderGeometry(R, R * 0.96, t, n, 1, false, Math.PI / 6, arc), tone('#6fa9d8'), xf(V(0, y, 0)));
      plate.add(new THREE.CylinderGeometry(R * 0.45, R * 0.5, t * 1.5, sides), tone('#a9d2ee'), xf(V(0, y + up * t * 0.3, 0)));
      if (a.plates === 'sectored' || a.plates === 'sprouting')
        for (let k = 0; k < 6; k++) {
          if (wedge && k === 5) continue;
          const angle = Math.PI / 6 + (k / 6) * Math.PI * 2 + (wedge ? 0 : 0), dir = V(Math.sin(angle), 0, Math.cos(angle));
          plate.add(bar(V(0, y + up * t * 0.5, 0), dir.clone().multiplyScalar(R * 0.98).setY(y + up * t * 0.5), R * 0.07, R * 0.03, R * 0.07), tone('#c9e5f7'));
          if (a.plates === 'sprouting') {
            const tip = dir.clone().multiplyScalar(R * 1.32).setY(y);
            plate.add(bar(dir.clone().multiplyScalar(R * 0.9).setY(y), tip, R * 0.12, R * 0.04, t * 0.5), tone('#a9d2ee'));
            for (const s of [-1, 1]) {
              const from = dir.clone().multiplyScalar(R * 1.08).setY(y), side = V(dir.z * s, 0, -dir.x * s).multiplyScalar(0.8).add(dir.clone().multiplyScalar(0.5));
              plate.add(bar(from, from.clone().addScaledVector(side, R * 0.16), R * 0.06, R * 0.02, t * 0.4), tone('#c9e5f7'));
            }
          }
        }
      if (wedge) {
        const piece = new THREE.CylinderGeometry(R, R * 0.96, t, 1, 1, false, 0, Math.PI / 3);
        still.add(piece, tone('#6fa9d8'), xf(V(R * 1.5 + 0.02, t / 2, R * 0.9), 1, new THREE.Euler(0, 1 + random(), 0)));
        for (let i = 0; i < 4; i++) still.add(new THREE.OctahedronGeometry(1, 0), tone('#a9d2ee'), xf(V(R * (1.1 + random() * 0.6), 0.004, R * (0.4 + random() * 0.9)), 0.004 + random() * 0.006));
      }
    };

    let lowR = 0.1, highR = 0.1, length = 0.2, capT = 0.02;
    const capped = a.form === 'spool' || a.form === 'axle' || a.form === 'triple';
    if (capped) {
      const r = { spool: 0.05, axle: 0.028, triple: 0.036 }[a.form] * shrink;
      length = { spool: 0.16, axle: 0.3, triple: 0.26 }[a.form] * shrink;
      const R = { spool: 0.14, axle: 0.085, triple: 0.115 }[a.form] * shrink;
      capT = R * 0.16;
      lowR = R; highR = a.plates === 'mismatched' ? R * 0.52 : R * (0.9 + random() * 0.15);
      column(shell, r, length, xf(V(0, length / 2 + capT, 0)));
      cap(capT / 2, lowR, capT, -1, false);
      cap(length + capT * 1.5, highR, capT, 1, a.state === 'chipped');
      if (a.form === 'triple') cap(length * (0.45 + random() * 0.15) + capT, R * 0.7, capT * 0.8, 1, false);
      const y0 = capT, mid = y0 + length / 2;
      if (a.core === 'hourglass') {
        inner.add(new THREE.ConeGeometry(r * 0.7, length * 0.46, sides), '#f2f8fc', xf(V(0, mid + length * 0.25, 0), 1, new THREE.Euler(Math.PI, 0, 0)));
        inner.add(new THREE.ConeGeometry(r * 0.7, length * 0.46, sides), '#f2f8fc', xf(V(0, mid - length * 0.25, 0)));
      } else if (a.core === 'bubbles') {
        for (let i = 0; i < 9; i++) inner.add(new THREE.SphereGeometry(1, 8, 6), '#ffffff', xf(V((random() - 0.5) * r * 0.5, y0 + length * (0.08 + 0.84 * (i / 8)), (random() - 0.5) * r * 0.5), r * (0.12 + random() * 0.2)));
      } else if (a.core === 'cloudy') inner.add(new THREE.CylinderGeometry(r * 0.55, r * 0.55, length * 0.9, sides), '#eef5fa', xf(V(0, mid, 0)));
    } else if (a.form === 'hollow') {
      const r = 0.06 * shrink; length = 0.24 * shrink; lowR = highR = r;
      column(shell, r, length, xf(V(0, length / 2, 0)));
      for (const end of [0, 1]) {
        inner.add(new THREE.ConeGeometry(r * 0.8, length * 0.4, sides), a.core === 'cloudy' ? '#eef5fa' : '#3f78b0', xf(V(0, end ? length * 0.8 + 0.001 : length * 0.2 - 0.001, 0), 1, new THREE.Euler(end ? Math.PI : 0, 0, 0)));
        plate.add(new THREE.TorusGeometry(r * 0.92, r * 0.09, 4, sides), tone('#c9e5f7'), xf(V(0, end ? length : 0, 0), 1, new THREE.Euler(Math.PI / 2, 0, Math.PI / 6)));
      }
      if (a.core === 'bubbles') for (let i = 0; i < 6; i++) inner.add(new THREE.SphereGeometry(1, 8, 6), '#ffffff', xf(V(0, length * (0.42 + i * 0.03), 0), r * 0.1));
    } else if (a.form === 'needles') {
      const count = 7 + Math.round(mood.density * 7); length = 0.34 * shrink; lowR = highR = 0.03;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * 0.04, h = length * (0.55 + random() * 0.45), r = 0.01 + random() * 0.009;
        const m = xf(V(Math.cos(angle) * d, length / 2 + (random() - 0.5) * 0.06, Math.sin(angle) * d), 1, new THREE.Euler((random() - 0.5) * 0.16, 0, (random() - 0.5) * 0.16));
        column(shell, r, h, m, i % 3 ? '#5f9fd6' : '#9ccbec', r * (random() < 0.5 ? 0.25 : 1));
        if (a.core !== 'clear' && i % 2) inner.add(new THREE.CylinderGeometry(r * 0.4, r * 0.4, h * 0.8, 6), '#f2f8fc', m);
      }
    } else {
      const count = 4 + Math.floor(random() * 3); length = 0.2 * shrink; lowR = highR = 0.12;
      const dirs = [V(0, 1, 0.1), V(0.9, 0.35, 0.3), V(-0.85, 0.4, 0.35), V(0.2, 0.3, -0.95), V(-0.3, -0.5, 0.8), V(0.5, -0.55, -0.6)];
      for (let i = 0; i < count; i++) {
        const dir = dirs[i].clone().add(V((random() - 0.5) * 0.3, (random() - 0.5) * 0.3, (random() - 0.5) * 0.3)).normalize(), h = length * (0.7 + random() * 0.4), r = 0.03 + random() * 0.012;
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), m = xf(dir.clone().multiplyScalar(h / 2 + 0.005).add(V(0, length, 0)), 1, q);
        // A bullet: pointed at the centre, square-cut at the far end.
        column(shell, r * 0.12, h, m, '#5f9fd6', r);
        if (a.core !== 'clear') inner.add(new THREE.ConeGeometry(r * 0.6, h * 0.5, 6), a.core === 'cloudy' ? '#eef5fa' : '#f2f8fc', xf(dir.clone().multiplyScalar(h * 0.74).add(V(0, length, 0)), 1, q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)))));
        if (a.plates !== 'plain' && i < 3) plate.add(new THREE.CylinderGeometry(r * 2.1, r * 2.1, r * 0.35, 6), tone('#6fa9d8'), xf(dir.clone().multiplyScalar(h + 0.008).add(V(0, length, 0)), 1, q));
      }
      inner.add(new THREE.IcosahedronGeometry(0.03, 0), '#c9e5f7', xf(V(0, length, 0)));
    }

    const total = capped ? length + capT * 2 : a.form === 'rosette' ? length * 2 : length;
    if (a.state === 'rimed') {
      for (let i = 0; i < 70; i++) {
        const angle = random() * Math.PI * 2, top = random() < 0.4, R = top ? highR * Math.sqrt(random()) : Math.max(0.02, (capped ? lowR * 0.45 : lowR) * (0.9 + random() * 0.3));
        white.add(new THREE.IcosahedronGeometry(1, 0), '#f6fafd', xf(V(Math.cos(angle) * R, top ? total + 0.002 : random() * total, Math.sin(angle) * R), 0.004 + random() * 0.007));
      }
    }

    const glass = ice(mix(0.06, 0.22, mood.cheer), { transparent: true, opacity: a.core === 'clear' ? 0.86 : 0.58, roughness: a.state === 'softened' ? 0.4 : 0.12 });
    inner.into(tilt, matte({ roughness: 0.7, emissive: '#b9cfe2', emissiveIntensity: 0.35 }));
    shell.into(tilt, glass);
    plate.into(tilt, ice(mix(0.06, 0.22, mood.cheer), { roughness: a.state === 'softened' ? 0.45 : 0.2 }));
    white.into(tilt, matte({ roughness: 0.9, emissive: '#b9cbdc', emissiveIntensity: 0.25 }));
    root.add(tilt);

    // Pose the specimen. It is built upright along +y; whatever the pose, its lowest point sits on the ground.
    const propped = a.pose === 'propped' && a.form !== 'rosette' && a.form !== 'needles';
    if (a.form === 'needles' || (a.pose === 'lying' && a.form !== 'rosette')) {
      const lean = capped ? Math.atan2(lowR - highR, length + capT) : 0;
      tilt.rotation.z = Math.PI / 2 - lean;
      tilt.rotation.y = 0.5 + (random() - 0.5) * 0.4;
    } else if (propped) {
      tilt.rotation.z = 1.02;
      tilt.rotation.y = 0.45;
    }
    tilt.updateMatrixWorld(true);
    tilt.position.y = -new THREE.Box3().setFromObject(tilt).min.y;
    tilt.updateMatrixWorld(true);
    if (propped) {
      const up = V(0, total * 0.8, 0).applyMatrix4(tilt.matrixWorld);
      still.add(new THREE.IcosahedronGeometry(1, 2), '#eaf2f8', xf(V(up.x, up.y * 0.36, up.z), V(0.055, Math.max(0.025, up.y * 0.4), 0.05)));
    }

    if (a.company !== 'single') {
      const others = a.company === 'pair' ? 1 : 7 + Math.round(mood.density * 8);
      for (let i = 0; i < others; i++) {
        const big = a.company === 'pair', s = big ? 0.55 : 0.12 + random() * 0.14, angle = big ? 0.6 : random() * Math.PI * 2, d = big ? 0.2 : 0.09 + random() * 0.08;
        const at = V(Math.cos(angle) * d, 0, Math.sin(angle) * d + 0.05), turn = new THREE.Euler(0, random() * 3, Math.PI / 2);
        if (big || i % 2) {
          const h = 0.16 * s, r = 0.04 * s, R = 0.1 * s;
          at.y = R;
          still.add(new THREE.CylinderGeometry(r, r, h, 6), tone('#8fc0e6'), xf(at, 1, turn));
          for (const e of [-1, 1]) still.add(new THREE.CylinderGeometry(R, R, R * 0.18, 6), tone('#6fa9d8'), xf(at.clone().add(V(0, e * h / 2, 0).applyEuler(turn)), 1, turn));
        } else {
          at.y = 0.004;
          const plan = flakePlan(i % 4 ? 'sector' : 'stellar', 0.2, random);
          flake(still, plan, { matrix: xf(at, 0.03 + random() * 0.02, new THREE.Euler(-Math.PI / 2, 0, random())), tone: (depth) => tone(['#6fa9d8', '#a9d2ee', '#c9e5f7', '#5f97c8'][depth]), thick: 0.08, random });
        }
      }
    }
    still.into(root, ice(0.1, { roughness: 0.3 }));
    return finish(root);
  },
});

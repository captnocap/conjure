import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const ODD = {
  none: 'None: every one is the same clear plastic.',
  red: 'One bright red umbrella among the clear ones.',
  yellow: 'One small yellow child\'s umbrella.',
  black: 'One sober black business umbrella with a wooden crook.',
  navy: 'One navy umbrella, plain and well made.',
  pink: 'One pink umbrella with a frilled edge.',
} as const;
const ODD_TINT: Record<Exclude<keyof typeof ODD, 'none'>, string> = { red: '#d8322a', yellow: '#f2c62e', black: '#1e1e22', navy: '#22386e', pink: '#f08fb4' };

export default defineThing({
  questions: {
    holder: choice('What holds the umbrellas?', {
      wire: 'A low white wire rack with a grid of holes and a drip tray.',
      bucket: 'A blue plastic bucket pressed into service.',
      jar: 'A tall glazed ceramic umbrella jar, blue on white.',
      locker: 'A steel shop stand with numbered slots and little key tags.',
    }),
    remaining: score('How many umbrellas remain?', ['Just one', 'Two or three', 'Half a rack', 'Crammed full']),
    odd: choice('Is one of them different from the rest?', ODD),
    broken: choice('Is one broken?', {
      none: 'No, all intact.',
      jammed: 'One blown inside out and jammed in handle-first, a clear funnel of bent ribs.',
      dumped: 'One inside out and abandoned on the ground beside the stand.',
    }),
    water: choice('How wet is it?', {
      dry: 'Bone dry: they have been here since the last storm.',
      drips: 'Dripping, with dark spots under the stand.',
      pool: 'Streaming, in a wide puddle.',
    }),
    open: noul('Has one been left open on the ground to dry?'),
    note: choice('Is there a note on the stand?', {
      none: 'No note.',
      free: 'A card that says FREE: take one.',
      price: 'A price card for five hundred yen.',
      plea: 'A hand-written plea to bring them back.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const white = s.material('#f2f2ee', { roughness: 0.45 });
    const steel = s.material('#c5cacc', { metalness: 0.7, roughness: 0.3 });
    const clearTint = new THREE.Color('#e6f4fb').lerp(new THREE.Color('#e8dfb8'), mood.wear * 0.6);
    const film = new THREE.MeshStandardMaterial({ color: clearTint, transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
    const wet = a.water !== 'dry';

    /** An umbrella built tip-down at the origin, pointing up +y. `state`: closed, open, inverted. */
    const umbrella = (state: 'closed' | 'open' | 'inverted', tint: string | null, length = 0.86) => {
      const u = new Sculpture(context);
      const skin = tint ? s.material(tint, { roughness: 0.6, side: THREE.DoubleSide }) : film;
      const handle = tint === ODD_TINT.black ? s.material('#8a5a32', { roughness: 0.5 }) : tint ? s.material(tint, { roughness: 0.4 }) : white;
      u.rod([0, 0, 0], [0, length, 0], 0.006, steel);
      u.cylinder(0.008, 0.004, 0.05, [0, 0.025, 0], white, 8);
      const crook = u.tube([[0, length - 0.02, 0], [0, length + 0.06, 0], [0.025, length + 0.1, 0], [0.065, length + 0.085, 0], [0.075, length + 0.04, 0]], 0.012, handle);
      crook.rotation.y = random() * Math.PI * 2;
      if (state === 'closed') {
        const profile: [number, number][] = [[0.008, 0.05], [0.02, 0.09], [0.034, 0.3], [0.043, 0.5], [0.04, 0.62], [0.012, 0.66]];
        u.lathe(profile, skin);
        // Furled pleats and a strap so a clear one still reads against a pale wall.
        const pleat = tint ? s.material(new THREE.Color(tint).multiplyScalar(0.75)) : white;
        for (let i = 0; i < 4; i++) { const angle = i * Math.PI / 2 + random(); u.rod([Math.sin(angle) * 0.012, 0.07, Math.cos(angle) * 0.012], [Math.sin(angle + 0.9) * 0.042, 0.58, Math.cos(angle + 0.9) * 0.042], 0.003, pleat); }
        u.cylinder(0.041, 0.039, 0.022, [0, 0.4, 0], tint ? pleat : white, 12);
      } else {
        const flip = state === 'inverted' ? -1 : 1;
        const spread = 0.5, rise = state === 'inverted' ? 0.34 : 0.2, apex = 0.12;
        const dome = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopy = u.mesh(dome, skin, [0, apex, 0]);
        canopy.scale.set(spread, -rise * flip, spread);
        canopy.castShadow = false;
        // Tip-down means an open canopy hangs below the apex; inverted flips it into a funnel.
        const ribs = s.material('#eef0ee', { metalness: 0.4, roughness: 0.4 });
        const onDome = (angle: number, along: number, reach = 1): [number, number, number] => [
          Math.sin(angle) * spread * Math.sin(along * Math.PI / 2) * reach,
          apex - flip * rise * Math.cos(along * Math.PI / 2),
          Math.cos(angle) * spread * Math.sin(along * Math.PI / 2) * reach,
        ];
        for (let i = 0; i < 8; i++) {
          const angle = i / 8 * Math.PI * 2;
          const snapped = state === 'inverted' && random() > 0.6;
          const end = onDome(angle, 1, snapped ? mix(0.55, 0.8, random()) : 1);
          if (snapped) end[1] += flip * 0.12;
          u.tube([onDome(angle, 0), onDome(angle, 0.35), onDome(angle, 0.7), end], 0.004, ribs);
          u.rod([0, apex + 0.24, 0], onDome(angle, 0.55), 0.0025, ribs);
        }
      }
      return u.root;
    };
    /** Rest a group on the ground after it has been turned. */
    const settle = (group: THREE.Object3D, x: number, z: number) => {
      group.position.set(x, 0, z);
      s.root.add(group);
      const box = new THREE.Box3().setFromObject(group);
      group.position.y = -box.min.y + 0.002;
    };

    // The holder and the spots an umbrella tip can stand in.
    const spots: { x: number; z: number; rim: number }[] = [];
    let trayY = 0.03;
    if (a.holder === 'wire' || a.holder === 'locker') {
      const W = 0.64, D = 0.3, H = a.holder === 'wire' ? 0.5 : 0.62;
      const bar = a.holder === 'wire' ? white : steel;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * W / 2, 0, z * D / 2], [x * W / 2, H, z * D / 2], 0.009, bar);
      for (const y of [H, H * 0.55]) {
        for (const z of [-1, 0, 1]) s.rod([-W / 2, y, z * D / 2], [W / 2, y, z * D / 2], 0.007, bar);
        for (let i = 0; i <= 4; i++) s.rod([-W / 2 + i * W / 4, y, -D / 2], [-W / 2 + i * W / 4, y, D / 2], 0.007, bar);
      }
      s.box([W + 0.03, 0.035, D + 0.03], [0, 0.03, 0], s.material(a.holder === 'wire' ? '#4b4f55' : '#33373c', { roughness: 0.5 }));
      trayY = 0.05;
      for (let i = 0; i < 4; i++) for (const z of [-1, 1]) spots.push({ x: -W / 2 + (i + 0.5) * W / 4, z: z * D / 4, rim: H });
      if (a.holder === 'locker') {
        s.box([W + 0.02, 0.07, 0.02], [0, H + 0.03, D / 2 + 0.01], steel);
        for (let i = 0; i < 4; i++) {
          s.label(String(i + 1 + Math.floor(random() * 3) * 4), 0.06, 0.04, [-W / 2 + (i + 0.5) * W / 4, H + 0.035, D / 2 + 0.022], '#f2f2ee', '#2a2c30');
          if (random() > 0.45) s.box([0.03, 0.05, 0.006], [-W / 2 + (i + 0.5) * W / 4 + 0.05, H - 0.02, D / 2 + 0.024], s.material('#f2c62e')).rotation.z = (random() - 0.5) * 0.5;
        }
      }
    } else if (a.holder === 'bucket') {
      const plastic = s.material('#3f78c8', { roughness: 0.5, side: THREE.DoubleSide });
      s.lathe([[0, 0.01], [0.13, 0.01], [0.135, 0], [0.175, 0.33], [0.185, 0.33], [0.185, 0.345], [0.165, 0.345]], plastic);
      s.ring(0.185, 0.005, [0, 0.3, 0], steel, Math.PI).rotation.set(0.5, 0, Math.PI);
      for (let i = 0; i < 7; i++) { const angle = i / 7 * Math.PI * 2 + random(); spots.push({ x: Math.sin(angle) * 0.07 * (i ? 1 : 0), z: Math.cos(angle) * 0.07 * (i ? 1 : 0), rim: 0.34 }); }
    } else {
      const glaze = (() => {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
        const g = canvas.getContext('2d')!; g.fillStyle = '#f1efe6'; g.fillRect(0, 0, 256, 128);
        g.strokeStyle = '#2a4a9a'; g.lineWidth = 4; g.fillStyle = '#2a4a9a';
        g.fillRect(0, 8, 256, 6); g.fillRect(0, 112, 256, 6);
        for (let i = 0; i < 6; i++) { const x = i * 256 / 6 + 20; g.beginPath(); g.moveTo(x, 100); g.bezierCurveTo(x - 20, 70, x + 24, 60, x + 4, 28); g.stroke(); for (const [dx, dy] of [[-10, 62], [14, 50], [-2, 36]]) { g.beginPath(); g.ellipse(x + dx, dy, 9, 4, dx * 0.1, 0, Math.PI * 2); g.fill(); } }
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
      })();
      s.lathe([[0, 0.01], [0.12, 0.01], [0.13, 0], [0.15, 0.1], [0.14, 0.42], [0.16, 0.5], [0.17, 0.52], [0.15, 0.52]], new THREE.MeshStandardMaterial({ map: glaze, roughness: 0.2, side: THREE.DoubleSide }));
      for (let i = 0; i < 5; i++) { const angle = i / 5 * Math.PI * 2 + random(); spots.push({ x: Math.sin(angle) * 0.06 * (i ? 1 : 0), z: Math.cos(angle) * 0.06 * (i ? 1 : 0), rim: 0.52 }); }
    }

    // Fill the spots.
    const count = Math.min(spots.length, Math.max(1 + (a.odd === 'none' ? 0 : 1) + (a.broken === 'jammed' ? 1 : 0), Math.round(mix(1, spots.length, a.remaining))));
    const order = spots.map((spot) => ({ spot, key: random() })).sort((p, q) => p.key - q.key).map((entry) => entry.spot).slice(0, count);
    const oddIndex = a.odd === 'none' ? -1 : Math.floor(random() * count);
    const jamIndex = a.broken === 'jammed' ? (oddIndex + 1 + Math.floor(random() * Math.max(1, count - 1))) % count : -1;
    const tips: THREE.Vector3[] = [];
    order.forEach((spot, index) => {
      const tint = index === oddIndex && a.odd !== 'none' ? ODD_TINT[a.odd] : null;
      const loose = a.holder === 'bucket' || a.holder === 'jar' ? 0.22 : 0.07;
      if (index === jamIndex && jamIndex !== oddIndex) {
        const wreck = umbrella('inverted', null, 0.8);
        // Handle down: turn the whole thing over so the funnel sits above the rim.
        wreck.rotation.set(Math.PI + (random() - 0.5) * 0.3, random() * 6, (random() - 0.5) * 0.3);
        wreck.scale.setScalar(0.78);
        wreck.position.set(spot.x, trayY + 0.7, spot.z);
        s.root.add(wreck);
        return;
      }
      const size = a.odd === 'yellow' && tint ? 0.72 : 1;
      const one = umbrella('closed', tint);
      one.scale.setScalar(size * mix(0.96, 1.04, random()));
      one.rotation.set((random() - 0.5) * loose, random() * 6, (random() - 0.5) * loose);
      one.position.set(spot.x, trayY, spot.z);
      s.root.add(one);
      tips.push(new THREE.Vector3(spot.x, trayY, spot.z));
    });

    const reach = a.holder === 'wire' || a.holder === 'locker' ? 0.5 : 0.36;
    if (a.broken === 'dumped') {
      const wreck = umbrella('inverted', null, 0.8);
      wreck.rotation.set(Math.PI / 2 + 0.25, 0, 0.6 + random() * 0.5);
      wreck.scale.setScalar(0.85);
      settle(wreck, -reach - 0.3, 0.2);
    }
    if (a.open) {
      const drying = umbrella('open', a.odd !== 'none' && random() > 0.6 ? ODD_TINT[a.odd] : null);
      drying.rotation.set(Math.PI * 0.62, 0, -0.35 + random() * 0.3);
      settle(drying, reach + 0.4, 0.25);
    }
    if (a.note !== 'none') {
      const text = { free: 'FREE', price: '¥500', plea: 'PLEASE RETURN' }[a.note];
      const top = spots[0].rim;
      const card = s.label(text, a.note === 'plea' ? 0.3 : 0.2, 0.11, [0, top * 0.62, (a.holder === 'wire' || a.holder === 'locker' ? 0.165 : 0.2)], a.note === 'price' ? '#c8261e' : '#1e2a44', a.note === 'plea' ? '#f6efc8' : '#fbfaf5');
      card.rotation.z = (random() - 0.5) * 0.2;
      card.rotation.x = -0.08;
    }

    // Water: dark spots, a puddle, and drops that fall from the furled canopies.
    const drops: THREE.Mesh[] = [];
    if (wet) {
      const water = s.material('#5d6d7a', { roughness: 0.06, metalness: 0.35 });
      const pools = a.water === 'pool' ? 1 : 0;
      for (let i = 0; i < pools; i++) { const pool = s.cylinder(1, 1, 0.004, [(random() - 0.5) * 0.2, 0.002, 0.12], water, 28); pool.scale.set(reach + 0.25 + random() * 0.2, 1, 0.42 + random() * 0.15); pool.rotation.y = random(); pool.castShadow = false; }
      const spotsCount = a.water === 'pool' ? 9 : 6;
      for (let i = 0; i < spotsCount; i++) { const blot = s.cylinder(1, 1, 0.003, [(random() - 0.5) * (reach * 2 + 0.3), 0.0015, (random() - 0.3) * 0.6], water, 12); blot.scale.set(0.03 + random() * 0.07, 1, 0.03 + random() * 0.06); blot.castShadow = false; }
      const bead = new THREE.SphereGeometry(0.008, 6, 5);
      for (const tip of tips.slice(0, 5)) { const drop = new THREE.Mesh(bead, water); drop.position.copy(tip).setY(0.2); drop.userData.x = random(); s.root.add(drop); drops.push(drop); }
    }

    const speed = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => drops.forEach((drop) => { const t = (time * speed + drop.userData.x * 3) % 1; drop.position.y = 0.3 - t * t * 0.26; }),
    });
  },
});

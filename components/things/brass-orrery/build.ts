import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PLANETS = ['#9a8f86', '#d9b36a', '#3f7fb8', '#b5502f', '#d1a070', '#cdb98a', '#7fc0c4', '#3d55a8', '#8a6fb0', '#6d8a58', '#c9c9d2', '#a23f52'];

export default defineThing({
  questions: {
    cosmos: choice('Which cosmos does the orrery model?', {
      heliocentric: 'Ours: a sun in the middle, small worlds on arms, one with a ring, one blue with a moon.',
      geocentric: 'The old belief: a blue-green earth in the middle and the sun itself riding an arm around it.',
      flatworld: 'A flat disc world with a rim and a mountain at its hub, a tiny sun and moon circling over it.',
      manymoons: 'One huge banded planet with far too many moons crowding around it on short arms.',
      binary: 'Two suns waltzing on a short bar at the centre, with worlds on long looping arms.',
    }),
    count: score('How many worlds does it carry?', ['Three sparse worlds', 'Five or six', 'A crowded eight or more']),
    missing: choice('Is a planet missing?', {
      complete: 'Every arm carries its world; the set is whole.',
      empty: 'One arm ends in an empty brass cup: a world has been removed.',
      fallen: 'One arm is empty and its little globe lies on the table by the foot.',
      snapped: 'One arm is bent sharply downward, its world dangling out of plane.',
      dark: 'An extra, unlisted black world rides a crooked iron arm beyond the others.',
    }),
    metal: choice('What is the mechanism made of?', {
      brass: 'Warm polished yellow brass.',
      copper: 'Red copper gone green with verdigris at the joints.',
      silver: 'Cold bright silver and steel.',
      iron: 'Blackened iron with thin gold inlay.',
    }),
    sun: choice('What is the sun globe like?', {
      amber: 'An amber glass globe with a steady warm glow.',
      white: 'A cold white pearl, bright and clinical.',
      ember: 'A deep red ember, a dying star.',
      dead: 'A dark, unlit ball of dull glass: the light has gone out.',
    }),
    base: choice('What does it stand on?', {
      tripod: 'Three curved clawed legs under a turned column.',
      drum: 'A fat geared drum with a hand crank on the side.',
      plinth: 'A stepped dark marble plinth.',
    }),
    zodiac: noul('Is it ringed by an engraved band of signs and degree marks?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metalHex = { brass: '#c9a04a', copper: '#b8683e', silver: '#c3c8cc', iron: '#3a3a3e' }[a.metal];
    const metal = s.material(metalHex, { metalness: 0.75, roughness: mix(0.28, 0.6, mood.wear) });
    const trim = s.material(a.metal === 'iron' ? '#d8b24a' : a.metal === 'copper' ? '#5fa38c' : a.metal === 'silver' ? '#6f7880' : '#8a6426', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2622', { roughness: 0.7 });
    const sunHex = { amber: '#ffb648', white: '#f3f6ff', ember: '#e0452a', dead: '#4b4a52' }[a.sun];
    const sunMat = () => s.material(sunHex, { emissive: a.sun === 'dead' ? '#000000' : sunHex, emissiveIntensity: a.sun === 'dead' ? 0 : mix(0.7, 1.5, mood.cheer), roughness: 0.3 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };

    // Base.
    const top = 0.3;
    if (a.base === 'tripod') {
      for (let i = 0; i < 3; i++) {
        const t = i / 3 * Math.PI * 2 + 0.5, cx = Math.cos(t), cz = Math.sin(t);
        s.tube([[cx * 0.03, 0.2, cz * 0.03], [cx * 0.1, 0.17, cz * 0.1], [cx * 0.17, 0.07, cz * 0.17], [cx * 0.23, 0.02, cz * 0.23]], 0.014, metal);
        s.ball([0.03, 0.02, 0.03], [cx * 0.24, 0.02, cz * 0.24], trim, 12);
      }
      s.lathe([[0, 0.1], [0.03, 0.1], [0.045, 0.14], [0.025, 0.18], [0.04, 0.21], [0.018, 0.24], [0.022, top]], metal);
    } else if (a.base === 'drum') {
      s.cylinder(0.17, 0.19, 0.03, [0, 0.015, 0], dark, 32);
      s.cylinder(0.15, 0.15, 0.13, [0, 0.095, 0], metal, 32);
      const teeth = 28;
      for (let i = 0; i < teeth; i++) { const t = i / teeth * Math.PI * 2; const tooth = s.box([0.014, 0.022, 0.02], [Math.cos(t) * 0.158, 0.15, Math.sin(t) * 0.158], trim); tooth.rotation.y = -t; }
      s.rod([0.15, 0.09, 0], [0.22, 0.09, 0], 0.01, trim);
      s.rod([0.22, 0.09, 0], [0.22, 0.14, 0.03], 0.008, trim);
      s.ball([0.02, 0.02, 0.02], [0.22, 0.15, 0.035], dark, 10);
      s.lathe([[0, 0.16], [0.06, 0.16], [0.03, 0.2], [0.02, top]], metal);
    } else {
      const stone = s.material('#3b3f45', { roughness: 0.35 });
      s.box([0.36, 0.05, 0.36], [0, 0.025, 0], stone);
      s.box([0.28, 0.05, 0.28], [0, 0.075, 0], stone);
      s.cylinder(0.1, 0.12, 0.06, [0, 0.13, 0], stone, 8);
      s.lathe([[0, 0.16], [0.05, 0.16], [0.02, 0.2], [0.035, 0.24], [0.018, top]], metal);
    }

    // Worlds and arms.
    const total = Math.round(mix(3, 8, a.count)) + (mood.density > 0.7 ? 1 : 0);
    const many = a.cosmos === 'manymoons', flat = a.cosmos === 'flatworld';
    const n = many ? total + 4 : flat ? Math.max(2, Math.round(total * 0.6)) : total;
    const plane = 0.56;
    const maxR = many ? 0.3 : 0.44;
    const minR = many ? 0.13 : flat ? 0.16 : a.cosmos === 'binary' ? 0.17 : 0.12;
    const spinners: { group: THREE.Object3D; speed: number }[] = [];
    const lost = a.missing === 'empty' || a.missing === 'fallen' ? 1 + Math.floor(random() * Math.max(1, n - 2)) : -1;
    const bent = a.missing === 'snapped' ? 1 + Math.floor(random() * Math.max(1, n - 2)) : -1;
    const sunArm = a.cosmos === 'geocentric' ? Math.min(2, n - 1) : flat ? 0 : -1;
    let lostColour = PLANETS[0], lostSize = 0.02;

    s.cylinder(0.016, 0.02, plane - top - 0.06, [0, (plane + top - 0.06) / 2, 0], metal, 12);
    for (let i = 0; i < n; i++) {
      const group = new THREE.Group();
      const y = top + 0.012 + i * (plane - top - 0.1) / Math.max(n - 1, 1);
      const r = n === 1 ? minR : minR + (maxR - minR) * (i / (n - 1)) * mix(0.92, 1.05, random());
      const size = many ? mix(0.015, 0.028, random()) : i === sunArm ? 0.046 : flat ? 0.03 : mix(0.022, 0.046, random()) * (i > n * 0.45 && i < n - 1 ? 1.25 : 0.85);
      const colour = PLANETS[(i + Math.floor(random() * 3)) % PLANETS.length];
      const lift = many ? plane + (random() - 0.5) * 0.1 : flat ? plane + 0.08 + i * 0.03 : plane;
      into(group, s.cylinder(0.03 - i * 0.0015, 0.03 - i * 0.0015, 0.012, [0, y, 0], i % 2 ? trim : metal, 20));
      const arm = new THREE.Group();
      group.add(arm);
      into(arm, s.rod([0, y, 0], [r, y, 0], 0.008, metal));
      into(arm, s.rod([r, y, 0], [r, lift - size, 0], 0.0065, metal));
      into(arm, s.cylinder(0.016, 0.009, 0.016, [r, lift - size - 0.004, 0], trim, 10));
      if (i === lost) { lostColour = colour; lostSize = size; }
      else {
        const body = into(arm, s.ball([size, size, size], [r, lift, 0], i === sunArm ? sunMat() : s.material(colour, { roughness: 0.4, metalness: 0.15 }), 18));
        if (i !== sunArm && !many && !flat) {
          if (size > 0.036 && random() < 0.6) { const ring = into(arm, s.ring(size * 1.7, size * 0.14, [r, lift, 0], trim)); ring.rotation.x = Math.PI / 2 - 0.35; ring.scale.z = 0.25; }
          else if (random() < 0.5) { into(arm, s.rod([r, lift, 0], [r + size + 0.028, lift + 0.006, 0], 0.002, metal)); into(arm, s.ball([0.011, 0.011, 0.011], [r + size + 0.03, lift + 0.008, 0], s.material('#d8d6cf'), 8)); }
        }
        body.rotation.y = random() * 6;
      }
      if (i === bent) { arm.position.set(r * 0.45, y, 0); arm.rotation.z = -0.75; arm.position.sub(new THREE.Vector3(r * 0.45, y, 0).applyEuler(arm.rotation)); into(group, s.rod([0, y, 0], [r * 0.45, y, 0], 0.0082, metal)); }
      group.rotation.y = random() * Math.PI * 2;
      s.root.add(group);
      spinners.push({ group, speed: 1.6 / (0.6 + i * 0.7) * (many && i % 3 === 0 ? -1 : 1) });
    }
    if (a.missing === 'dark') {
      const group = new THREE.Group(), r = maxR + 0.05, y = top + 0.03;
      const iron = s.material('#1c1b1f', { roughness: 0.8 });
      into(group, s.tube([[0, y, 0], [r * 0.4, y - 0.03, 0.03], [r * 0.75, y + 0.05, -0.02], [r, plane - 0.09, 0]], 0.006, iron));
      into(group, s.ball([0.036, 0.036, 0.036], [r, plane - 0.06, 0], s.material('#0d0c12', { roughness: 0.25, emissive: '#3a1166', emissiveIntensity: 0.35 }), 18));
      group.rotation.y = random() * 6;
      s.root.add(group);
      spinners.push({ group, speed: -0.13 });
    }
    if (a.missing === 'fallen') {
      const t = random() * 6;
      s.ball([lostSize, lostSize, lostSize], [Math.cos(t) * 0.3, lostSize, Math.sin(t) * 0.3], s.material(lostColour, { roughness: 0.4 }), 16);
    }

    // The centre.
    const hub = new THREE.Group();
    s.root.add(hub);
    into(hub, s.cylinder(0.02, 0.012, 0.03, [0, plane - 0.075, 0], trim, 12));
    if (a.cosmos === 'heliocentric') {
      into(hub, s.ball([0.07, 0.07, 0.07], [0, plane, 0], sunMat(), 24));
      for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; into(hub, s.rod([Math.cos(t) * 0.068, plane, Math.sin(t) * 0.068], [Math.cos(t) * 0.098, plane, Math.sin(t) * 0.098], 0.006, metal, 0.001)); }
    } else if (a.cosmos === 'geocentric') {
      into(hub, s.ball([0.062, 0.062, 0.062], [0, plane, 0], s.material('#2f77a8', { roughness: 0.4 }), 24));
      for (let i = 0; i < 7; i++) { const u = random() * 6, v = (random() - 0.5) * 2; into(hub, s.ball([0.026, 0.006, 0.02], [Math.cos(u) * 0.058 * Math.cos(v), plane + Math.sin(v) * 0.058, Math.sin(u) * 0.058 * Math.cos(v)], s.material('#5d8a45'), 8)).lookAt(0, plane, 0); }
      const meridian = into(hub, s.ring(0.072, 0.004, [0, plane, 0], metal)); meridian.rotation.y = 0.5;
    } else if (flat) {
      into(hub, s.cylinder(0.15, 0.13, 0.016, [0, plane, 0], s.material('#4f8a52'), 40));
      into(hub, s.ring(0.15, 0.007, [0, plane + 0.006, 0], s.material('#3a78b0', { roughness: 0.3 }))).rotation.x = Math.PI / 2;
      into(hub, s.cylinder(0, 0.02, 0.07, [0, plane + 0.042, 0], s.material('#c9c4b8'), 8));
      for (let i = 0; i < 6; i++) { const t = random() * 6, d = 0.04 + random() * 0.08; into(hub, s.cylinder(0, 0.012, 0.022, [Math.cos(t) * d, plane + 0.018, Math.sin(t) * d], s.material('#7d8a5a'), 6)); }
      into(hub, s.ball([0.1, 0.045, 0.1], [0, plane - 0.03, 0], trim, 16));
    } else if (many) {
      into(hub, s.ball([0.085, 0.078, 0.085], [0, plane, 0], s.material('#d0a274', { roughness: 0.45 }), 28));
      for (const [y, c] of [[0.035, '#a8643f'], [-0.01, '#e8d2a8'], [-0.045, '#9a5a3a']] as const) into(hub, s.ring(Math.sqrt(0.085 ** 2 - (y * 1.09) ** 2) + 0.001, 0.008, [0, plane + y, 0], s.material(c))).rotation.x = Math.PI / 2;
      const ring = into(hub, s.ring(0.115, 0.008, [0, plane, 0], trim)); ring.rotation.x = Math.PI / 2 - 0.25; ring.scale.z = 0.3;
    } else {
      into(hub, s.rod([-0.05, plane, 0], [0.05, plane, 0], 0.005, metal));
      into(hub, s.ball([0.05, 0.05, 0.05], [-0.055, plane, 0], sunMat(), 20));
      into(hub, s.ball([0.034, 0.034, 0.034], [0.07, plane, 0], s.material('#9fd0ff', { emissive: a.sun === 'dead' ? '#000000' : '#9fd0ff', emissiveIntensity: 1, roughness: 0.3 }), 18));
    }
    spinners.push({ group: hub, speed: a.cosmos === 'binary' ? 2.2 : 0.25 });

    if (a.zodiac) {
      const R = maxR + 0.075;
      const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = metalHex; ctx.fillRect(0, 0, 2048, 64);
      ctx.fillStyle = ctx.strokeStyle = a.metal === 'iron' ? '#e6c25a' : '#2a2016';
      ctx.fillRect(0, 0, 2048, 5); ctx.fillRect(0, 59, 2048, 5);
      for (let i = 0; i < 144; i++) ctx.fillRect(i * 2048 / 144, 5, i % 12 === 0 ? 5 : 2, i % 12 === 0 ? 54 : i % 3 === 0 ? 16 : 9);
      ctx.font = 'bold 34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      '♈♉♊♋♌♍♎♏♐♑♒♓'.split('').forEach((glyph, i) => ctx.fillText(glyph + '︎', (i + 0.5) * 2048 / 12, 38));
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.CylinderGeometry(R, R, 0.07, 72, 1, true), new THREE.MeshStandardMaterial({ map, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), [0, plane - 0.05, 0]);
      for (const y of [-0.085, -0.015]) s.ring(R, 0.007, [0, plane + y, 0], trim).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 1.55; s.tube([[Math.cos(t) * 0.02, top - 0.03, Math.sin(t) * 0.02], [Math.cos(t) * R * 0.55, top - 0.07, Math.sin(t) * R * 0.55], [Math.cos(t) * R * 0.95, top + 0.05, Math.sin(t) * R * 0.95], [Math.cos(t) * R, plane - 0.07, Math.sin(t) * R]], 0.011, metal); }
    }

    // Keep the turning arms from shifting the measured centre: fix the frame to the full sweep.
    const reach = Math.max(maxR + 0.085, 0.27);
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(reach, reach, 0.002, 24), new THREE.MeshBasicMaterial({ visible: false }));
    frame.position.y = 0.001;
    s.root.add(frame);

    const rate = mix(0.03, 0.9, mood.energy);
    const thing = s.finish({ footprint: reach, update: (dt) => { for (const spin of spinners) spin.group.rotation.y += dt * rate * spin.speed; } });
    thing.object.position.x = 0; thing.object.position.z = 0;
    return thing;
  },
});

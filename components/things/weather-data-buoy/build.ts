import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

const TYPES = {
  discus: 'A broad flat discus hull three metres across carrying a tripod mast: the classic deep-ocean weather station.',
  pillar: 'A tall narrow pillar rising from a small float, swaying like a metronome.',
  waverider: 'A small yellow sphere barely a metre across with a single whip antenna, riding every wave.',
  tower: 'A heavy skirted float under a braced lattice cage, built to be seen from far off.',
  boat: 'A boat-shaped aluminium hull six metres long with two stubby masts, made for the worst seas.',
} as const;
const LIGHTS = {
  amber: 'Flashing amber yellow.',
  white: 'Hard white strobe.',
  red: 'Slow red.',
  green: 'Green.',
  blue: 'Cold blue, like something that should not be out here.',
  dead: 'Dark: the lamp has failed and the lens is cracked.',
} as const;
const LIGHT_COLOUR: Record<keyof typeof LIGHTS, string> = { amber: '#ffb31f', white: '#f4f8ff', red: '#ff3324', green: '#35e06a', blue: '#4c8dff', dead: '#3a3d3c' };
const NAMES = ['OLD FAITHFUL', 'BETTY', 'LONELY 9', 'THE HERMIT', 'WENDY', 'STILL HERE'];

export default defineThing({
  questions: {
    type: choice('What kind of buoy is it?', TYPES),
    light: choice('What colour is its light?', LIGHTS),
    rider: choice('What has made itself at home on it?', {
      nothing: 'Nothing: it is quite alone.',
      gull: 'A single gull standing on the highest point.',
      cormorant: 'A black cormorant holding its wings out to dry.',
      terns: 'A row of small white terns along the rail.',
      sealion: 'A fat brown sea lion hauled out and asleep on the hull.',
      nest: 'A messy nest of weed and sticks built into the mast, with a bird sitting on it.',
    }),
    marking: choice('What is painted on the hull?', {
      number: 'A five-digit station number in black block figures.',
      odas: 'The letters ODAS, the international mark for an ocean data station.',
      warning: 'KEEP OFF stencilled in red.',
      tsunami: 'TSUNAMI in heavy letters between hazard stripes.',
      nickname: 'A hand-painted nickname, as if its crew were fond of it.',
      blank: 'Nothing readable: bare patches where the paint has flaked away.',
    }),
    state: choice('What state is it in?', {
      working: 'On station and working, upright and trim.',
      bent: 'Storm-damaged: the mast knocked askew, a panel hanging loose.',
      adrift: 'Broken free: a length of snapped mooring chain trails over the side.',
      fouled: 'Fouled: a lost fishing net and rope are wrapped around it.',
      listing: 'Taking on water, heeled far over and low on one side.',
    }),
    kit: score('How heavily instrumented is it?', ['A bare pole and a lamp', 'The standard weather set', 'Bristling with antennas, domes and sensor booms']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context); // the buoy itself, so it can heel as one piece
    const m = new Sculpture(context); // the mast, so a storm can bend it
    s.root.add(b.root);
    b.root.add(m.root);
    const { mood, random } = context;
    const yellow = b.material(a.type === 'boat' ? '#e2aa00' : '#eeaa00', { roughness: 0.55 });
    const steel = b.material('#d9dcd8', { metalness: 0.35, roughness: 0.5 });
    const dark = b.material('#2b3033', { roughness: 0.7 });
    const cell = painted(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#16264f'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8fa6d8'; ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); }
    });
    const panelMaterial = new THREE.MeshStandardMaterial({ map: cell, roughness: 0.25, metalness: 0.3 });

    // Hull.
    let R = 1.5, deck = 0.45, footR = 1.05, mastTop = 3.3, poleTop = 4.2, mx = 0, panels = 4;
    const lathe = (profile: [number, number][]) => b.lathe(profile, yellow);
    if (a.type === 'discus') {
      lathe([[0, -0.5], [1.0, -0.45], [1.5, -0.1], [1.5, 0.25], [1.38, 0.42], [0, 0.45]]);
      b.ring(1.5, 0.05, [0, 0.25, 0], dark).rotation.x = Math.PI / 2;
    } else if (a.type === 'pillar') {
      R = 0.8; deck = 0.5; footR = 0.2; mastTop = 2.9; poleTop = 4.3; panels = 2;
      lathe([[0, -0.6], [0.6, -0.55], [0.8, -0.2], [0.8, 0.15], [0.5, 0.36], [0.2, 0.5], [0.2, 2.9], [0, 2.9]]);
      b.cylinder(0.21, 0.21, 0.5, [0, 1.9, 0], b.material('#1f2326'));
    } else if (a.type === 'waverider') {
      R = 0.45; deck = 0.5; footR = 0; mastTop = 0.5; poleTop = 2.1; panels = 0;
      b.ball([0.45, 0.45, 0.45], [0, 0.1, 0], yellow, 28);
      b.cylinder(0.2, 0.26, 0.1, [0, 0.52, 0], dark);
      for (let i = 0; i < 4; i++) b.ring(0.07, 0.012, [Math.cos(i * 1.57) * 0.36, 0.38, Math.sin(i * 1.57) * 0.36], steel).rotation.y = -i * 1.57 + 1.57;
    } else if (a.type === 'tower') {
      R = 1.3; deck = 0.55; footR = 0.95; mastTop = 3.6; poleTop = 4.6;
      lathe([[0, -0.7], [0.9, -0.7], [1.3, -0.1], [1.3, 0.3], [1.12, 0.5], [0, 0.55]]);
      b.ring(1.3, 0.06, [0, 0.3, 0], dark).rotation.x = Math.PI / 2;
    } else {
      R = 1.0; deck = 0.6; footR = 0; mastTop = 2.4; poleTop = 3.3; mx = -1.5; panels = 3;
      const outline = new THREE.Shape();
      outline.moveTo(-2.7, -0.85); outline.lineTo(0.6, -0.95); outline.quadraticCurveTo(2.2, -0.75, 3.0, 0);
      outline.quadraticCurveTo(2.2, 0.75, 0.6, 0.95); outline.lineTo(-2.7, 0.85); outline.closePath();
      const hull = new THREE.ExtrudeGeometry(outline, { depth: 0.95, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
      hull.rotateX(-Math.PI / 2);
      b.mesh(hull, yellow, [0, -0.4, 0]);
      b.box([4.4, 0.06, 0.1], [0.1, 0.36, 0.98], dark); b.box([4.4, 0.06, 0.1], [0.1, 0.36, -0.98], dark);
      for (const x of [-0.4, 0.5, 1.4]) b.box([0.75, 0.05, 1.0], [x, 0.66, 0], panelMaterial).rotation.z = 0.04;
      b.rod([1.9, 0.6, 0], [1.9, 2.0, 0], 0.05, steel);
      b.box([0.5, 0.3, 0.5], [-0.9, 0.78, 0], steel);
    }

    // Hull lettering, wrapped around the freeboard.
    const text = { number: String(40000 + Math.floor(random() * 9999)), odas: 'ODAS', warning: 'KEEP OFF', tsunami: 'TSUNAMI', nickname: NAMES[Math.floor(random() * NAMES.length)], blank: '' }[a.marking];
    const hullHex = `#${yellow.color.getHexString()}`;
    const band = painted(1024, 128, (ctx, w, h) => {
      ctx.fillStyle = hullHex; ctx.fillRect(0, 0, w, h);
      if (a.marking === 'tsunami') {
        ctx.fillStyle = '#1b1b1b';
        for (let x = -h; x < w; x += 56) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 28, h); ctx.lineTo(x + 28 + 24, h - 24); ctx.lineTo(x + 24, h - 24); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x + 28, 24); ctx.lineTo(x + 52, 0); ctx.lineTo(x + 24, 0); ctx.fill(); }
      }
      ctx.fillStyle = a.marking === 'warning' ? '#b3261c' : a.marking === 'nickname' ? '#1d3f8a' : '#161616';
      ctx.font = `${a.marking === 'nickname' ? 'italic ' : ''}bold ${a.marking === 'tsunami' ? 66 : 92}px ${a.marking === 'nickname' ? 'serif' : 'monospace'}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const x of [w * 0.25, w * 0.75]) ctx.fillText(text, x, h / 2 + 4, w * 0.42);
      if (a.marking === 'blank' || mood.wear > 0.5) {
        ctx.fillStyle = a.marking === 'blank' ? '#b9b3a0' : '#8a5a2b';
        for (let i = 0; i < (a.marking === 'blank' ? 26 : 10 * mood.wear); i++) { ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(10, 46, random()), mix(6, 22, random()), random() * 3, 0, 7); ctx.fill(); }
      }
    });
    band.wrapS = THREE.RepeatWrapping;
    const bandMaterial = new THREE.MeshStandardMaterial({ map: band, roughness: 0.6 });
    if (a.type === 'boat') {
      for (const side of [-1, 1]) {
        const plate = b.mesh(new THREE.PlaneGeometry(2.6, 0.42), bandMaterial, [-1.0, 0.22, side * 0.925]);
        (plate.geometry.attributes.uv as THREE.BufferAttribute).array.forEach((_v, i, uv) => { if (i % 2 === 0) (uv as Float32Array)[i] *= 0.5; });
        if (side < 0) plate.rotation.y = Math.PI;
        plate.castShadow = false;
      }
    } else if (a.type === 'waverider') {
      const hoop = b.mesh(new THREE.SphereGeometry(0.455, 32, 6, 0, Math.PI * 2, Math.PI * 0.36, Math.PI * 0.2), bandMaterial, [0, 0.1, 0]);
      hoop.rotation.y = -Math.PI / 2;
    } else {
      const top = a.type === 'pillar' ? 0.15 : a.type === 'tower' ? 0.3 : 0.25;
      const hoop = b.mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, top + 0.06, 48, 1, true), bandMaterial, [0, top / 2 - 0.02, 0]);
      hoop.rotation.y = -Math.PI / 2;
    }

    // Mast: built from the deck up, in its own group.
    m.root.position.set(mx, deck, 0);
    const top = mastTop - deck, tip = poleTop - deck;
    if (a.type === 'discus' || a.type === 'tower') {
      const legs = a.type === 'tower' ? 4 : 3, headR = a.type === 'tower' ? 0.42 : 0.2;
      for (let i = 0; i < legs; i++) {
        const angle = (i / legs) * Math.PI * 2 + 0.5, next = ((i + 1) / legs) * Math.PI * 2 + 0.5;
        const foot = [Math.cos(angle) * footR, 0, Math.sin(angle) * footR] as const, head = [Math.cos(angle) * headR, top, Math.sin(angle) * headR] as const;
        m.rod(foot, head, 0.045, steel);
        const levels = a.type === 'tower' ? [0.3, 0.62] : [0.45];
        let below: readonly [number, number, number] = foot, belowNext: readonly [number, number, number] = [Math.cos(next) * footR, 0, Math.sin(next) * footR];
        for (const f of levels) {
          const r = mix(footR, headR, f);
          const here = [Math.cos(angle) * r, top * f, Math.sin(angle) * r] as const, there = [Math.cos(next) * r, top * f, Math.sin(next) * r] as const;
          m.rod(here, there, 0.025, steel);
          if (a.type === 'tower') { m.rod(below, there, 0.016, steel); m.rod(belowNext, here, 0.016, steel); }
          below = here; belowNext = there;
        }
      }
      m.cylinder(headR + 0.12, headR + 0.12, 0.06, [0, top, 0], steel, legs * 6);
      if (a.type === 'tower') {
        // Day mark: a yellow X cage at the top.
        m.box([0.9, 0.9, 0.04], [0, top + 0.6, 0], yellow).rotation.y = 0.78;
        m.box([0.9, 0.9, 0.04], [0, top + 0.6, 0], yellow).rotation.y = -0.78;
      }
      m.cylinder(0.3, 0.3, 0.55, [0, 0.28, 0], steel, 16); // instrument well
    } else if (a.type === 'pillar') {
      m.cylinder(0.42, 0.42, 0.05, [0, top, 0], steel, 20);
      m.ring(0.42, 0.018, [0, top + 0.35, 0], steel).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) m.rod([Math.cos(i * 1.57) * 0.42, top, Math.sin(i * 1.57) * 0.42], [Math.cos(i * 1.57) * 0.42, top + 0.35, Math.sin(i * 1.57) * 0.42], 0.014, steel);
    } else if (a.type === 'boat') {
      m.cylinder(0.3, 0.34, 0.5, [0, 0.25, 0], steel, 14);
      m.rod([0, 0, 0.5], [0, top * 0.8, 0], 0.02, steel); m.rod([0, 0, -0.5], [0, top * 0.8, 0], 0.02, steel);
    }
    m.rod([0, a.type === 'waverider' ? 0 : top * 0.2, 0], [0, tip, 0], a.type === 'waverider' ? 0.012 : 0.04, steel, a.type === 'waverider' ? 0.006 : 0.03);

    // Solar panels, tilted outward around the mast.
    const loose = a.state === 'bent' ? Math.floor(random() * Math.max(panels, 1)) : -1;
    for (let i = 0; i < panels; i++) {
      const angle = (i / panels) * Math.PI * 2 + (a.type === 'boat' ? 10 : 0.5 + Math.PI / Math.max(panels, 1));
      if (a.type === 'boat') break;
      const r = a.type === 'pillar' ? 0.45 : mix(footR, 0.25, 0.32) + 0.1, y = a.type === 'pillar' ? top * 0.72 : top * 0.36;
      const holder = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.56, 0.035), [dark, dark, dark, dark, panelMaterial, dark]);
      panel.castShadow = true;
      panel.rotation.x = -0.6;
      holder.add(panel);
      holder.position.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
      holder.rotation.y = angle;
      if (i === loose) { holder.rotation.z = 0.9; holder.position.y -= 0.35; }
      m.root.add(holder);
    }

    // Instruments on the crossarm.
    const armY = tip - (a.type === 'waverider' ? 0.5 : 0.35);
    const cups = new THREE.Group();
    const vane = new THREE.Group();
    if (a.kit > 0.2 && a.type !== 'waverider') {
      m.rod([-0.55, armY, 0], [0.55, armY, 0], 0.02, steel);
      m.rod([-0.55, armY, 0], [-0.55, armY + 0.22, 0], 0.012, steel);
      m.rod([0.55, armY, 0], [0.55, armY + 0.22, 0], 0.012, steel);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), dark);
        arm.rotation.z = Math.PI / 2; arm.rotation.y = -angle; arm.position.set(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08);
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8, 0, Math.PI), dark);
        cup.position.set(Math.cos(angle) * 0.17, 0, Math.sin(angle) * 0.17); cup.rotation.y = -angle;
        cups.add(arm, cup);
      }
      cups.position.set(-0.55, armY + 0.24, 0);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.01), b.material('#e9e9e4'));
      fin.position.x = -0.2;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 8), dark);
      nose.rotation.z = -Math.PI / 2; nose.position.x = 0.18;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 5), dark);
      shaft.rotation.z = Math.PI / 2;
      vane.add(fin, nose, shaft);
      vane.position.set(0.55, armY + 0.24, 0);
      vane.rotation.y = random() * 6;
      m.root.add(cups, vane);
      m.cylinder(0.07, 0.07, 0.2, [0, armY - 0.3, 0.09], b.material('#f4f4f0'), 12); // louvred temperature shield
      for (let i = 0; i < 4; i++) m.cylinder(0.085, 0.085, 0.012, [0, armY - 0.38 + i * 0.05, 0.09], b.material('#f4f4f0'), 12);
    }
    if (a.kit > 0.55) {
      const extras = Math.round(mix(1, 6, (a.kit - 0.55) / 0.45));
      for (let i = 0; i < extras; i++) {
        const angle = random() * 6, r = mix(0.12, 0.4, random()), y0 = mix(tip * 0.55, tip * 0.85, random());
        if (i % 3 === 0) m.rod([Math.cos(angle) * r, y0, Math.sin(angle) * r], [Math.cos(angle) * r * 1.1, y0 + mix(0.7, 1.5, random()), Math.sin(angle) * r * 1.1], 0.01, dark, 0.004);
        else if (i % 3 === 1) { m.rod([0, y0, 0], [Math.cos(angle) * 0.5, y0, Math.sin(angle) * 0.5], 0.014, steel); m.ball([0.09, 0.07, 0.09], [Math.cos(angle) * 0.5, y0 + 0.07, Math.sin(angle) * 0.5], b.material('#f1f1ec'), 12); }
        else { m.rod([0, y0, 0], [Math.cos(angle) * 0.75, y0 - 0.15, Math.sin(angle) * 0.75], 0.012, steel); m.cylinder(0.035, 0.035, 0.22, [Math.cos(angle) * 0.75, y0 - 0.2, Math.sin(angle) * 0.75], dark, 8); }
      }
      // Radar reflector: three crossed plates.
      for (const turn of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, 0, Math.PI / 2]] as const) {
        const plate = m.mesh(new THREE.CircleGeometry(0.17, 4), new THREE.MeshStandardMaterial({ color: '#c9cfd0', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [0, tip - 0.75, -0.12]);
        plate.rotation.set(turn[0] + 0.6, turn[1] + 0.78, turn[2]);
      }
    }

    // The light.
    const lit = a.light !== 'dead';
    const glow = new THREE.Color(LIGHT_COLOUR[a.light]);
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const lens = new THREE.MeshStandardMaterial({ color: lit ? glow : '#4a4d4b', emissive: lit ? glow : '#000000', emissiveIntensity: 2.2, roughness: 0.3 });
    const lampR = a.type === 'waverider' ? 0.055 : 0.11;
    m.cylinder(lampR * 0.9, lampR * 1.1, lampR, [0, tip + lampR * 0.5, 0], dark, 12);
    m.mesh(new THREE.CapsuleGeometry(lampR * 0.8, lampR * 0.8, 4, 12), lens, [0, tip + lampR * 1.7, 0]);
    m.cylinder(lampR * 0.5, lampR * 0.9, lampR * 0.35, [0, tip + lampR * 2.8, 0], dark, 12);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(lampR * mix(2, 4.5, dusk), 16, 10), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: mix(0.05, 0.16, dusk), depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(0, tip + lampR * 1.7, 0);
    halo.visible = lit;
    m.root.add(halo);

    // Birds and beasts.
    const white = b.material('#f6f6f1'), grey = b.material('#9aa3aa'), black = b.material('#1d2022'), orange = b.material('#e9a01f');
    const bird = (kind: 'gull' | 'tern' | 'cormorant', size: number) => {
      const g = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1], turn: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...turn); mesh.castShadow = true;
        g.add(mesh);
      };
      const ball = new THREE.SphereGeometry(1, 12, 8);
      const dark2 = kind === 'cormorant';
      const bodyM = dark2 ? black : white, wingM = dark2 ? black : grey;
      const up = dark2 ? 0.9 : 0.25;
      part(ball, bodyM, [0, 0.2, 0], [0.11, dark2 ? 0.2 : 0.1, 0.19], [-up, 0, 0]);
      const headY = dark2 ? 0.52 : 0.33, headZ = dark2 ? 0.12 : 0.17;
      if (dark2) part(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8), black, [0, 0.42, 0.09], [1, 1, 1], [0.35, 0, 0]);
      part(ball, bodyM, [0, headY, headZ], [0.055, 0.055, 0.065]);
      part(new THREE.ConeGeometry(0.018, 0.1, 6), kind === 'tern' ? b.material('#d8432e') : orange, [0, headY - 0.005, headZ + 0.1], [1, 1, 1], [Math.PI / 2, 0, 0]);
      if (kind === 'tern') part(ball, black, [0, headY + 0.022, headZ - 0.01], [0.05, 0.035, 0.06]);
      for (const side of [-1, 1]) {
        if (dark2) part(ball, wingM, [side * 0.26, 0.3, -0.02], [0.2, 0.14, 0.02], [0, side * 0.3, side * 0.5]);
        else part(ball, wingM, [side * 0.085, 0.22, -0.04], [0.03, 0.07, 0.2], [-0.2, 0, 0]);
        part(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5), orange, [side * 0.04, 0.06, 0.02]);
      }
      part(ball, dark2 ? black : b.material('#30353a'), [0, dark2 ? 0.04 : 0.19, dark2 ? -0.1 : -0.24], [0.05, 0.015, 0.09], [dark2 ? 0.9 : 0.1, 0, 0]);
      g.scale.setScalar(size);
      return g;
    };
    const perch = (creature: THREE.Group, at: [number, number, number], turn = random() * 6) => { creature.position.set(...at); creature.rotation.y = turn; m.root.add(creature); };
    const rail = a.type === 'waverider' ? 0 : a.kit > 0.2 ? armY : top;
    if (a.rider === 'gull') perch(bird('gull', 1.3), [0, tip + lampR * 3, 0]);
    else if (a.rider === 'cormorant') perch(bird('cormorant', 1.4), a.type === 'waverider' ? [0, 0.1, 0] : a.kit > 0.2 ? [0.3, armY + 0.02, 0] : [0, tip + lampR * 3, 0], random() - 0.5);
    else if (a.rider === 'terns') {
      const count = a.type === 'waverider' ? 2 : 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) perch(bird('tern', 0.9), a.type === 'waverider' ? [(i - 0.5) * 0.3, 0.02, 0.1] : [(i - (count - 1) / 2) * 0.24, rail + 0.02, 0], (random() - 0.5) * 1.2);
    } else if (a.rider === 'nest') {
      const nestY = a.type === 'waverider' ? 0.04 : a.type === 'pillar' ? top + 0.05 : top + 0.04;
      const twig = b.material('#6d5a36', { roughness: 1 });
      m.cylinder(0.32, 0.22, 0.16, [0, nestY + 0.08, 0], twig, 10);
      for (let i = 0; i < 16; i++) {
        const angle = random() * 6, r = 0.28;
        m.rod([Math.cos(angle) * r, nestY + random() * 0.16, Math.sin(angle) * r], [Math.cos(angle + 1.2) * r * 1.3, nestY + random() * 0.2, Math.sin(angle + 1.2) * r * 1.3], 0.012, twig);
      }
      perch(bird('gull', 1.25), [0.05, nestY - 0.02, 0.05]);
    } else if (a.rider === 'sealion') {
      const fur = b.material('#7a5636', { roughness: 0.75 });
      const lion = new Sculpture(context);
      const onDeck = a.type !== 'waverider' && a.type !== 'pillar';
      const spine: [number, number, number, number][] = onDeck
        ? [[-0.75, 0.16, 0, 0.16], [-0.4, 0.24, 0.05, 0.27], [0, 0.3, 0.05, 0.33], [0.4, 0.34, 0, 0.28], [0.68, 0.5, -0.02, 0.19], [0.82, 0.72, -0.02, 0.14]]
        : [[-0.5, -0.1, 0, 0.2], [-0.15, -0.06, 0, 0.24], [0.2, 0.0, 0, 0.2], [0.42, 0.14, 0, 0.15], [0.52, 0.3, 0, 0.13]];
      for (let i = 0; i < spine.length; i++) {
        const [x, y, z, r] = spine[i];
        lion.ball([r * 1.15, r, r], [x, y, z], fur, 14);
        if (i + 1 < spine.length) { const n = spine[i + 1]; lion.ball([(r + n[3]) * 0.56, (r + n[3]) * 0.5, (r + n[3]) * 0.5], [(x + n[0]) / 2, (y + n[1]) / 2, (z + n[2]) / 2], fur, 14); }
      }
      const [hx, hy, hz] = spine.at(-1)!;
      lion.mesh(new THREE.ConeGeometry(0.08, 0.2, 10), fur, [hx + 0.14, hy + 0.02, hz]).rotation.z = -Math.PI / 2;
      lion.ball([0.03, 0.03, 0.03], [hx + 0.24, hy + 0.03, hz], black, 8);
      if (onDeck) {
        for (const side of [-1, 1]) lion.ball([0.2, 0.03, 0.1], [0.3, 0.06, side * 0.32], fur, 10).rotation.y = side * 0.5;
        lion.ball([0.2, 0.03, 0.12], [-0.9, 0.05, 0], fur, 10);
      }
      const angle = 1.2 + random() * 0.6;
      if (onDeck) { lion.root.position.set(a.type === 'boat' ? 1.7 : Math.cos(angle) * R * 0.55, 0, a.type === 'boat' ? 0 : Math.sin(angle) * R * 0.55); lion.root.rotation.y = -angle + Math.PI / 2 + (a.type === 'boat' ? angle + 1.57 : 0); m.root.parent!.add(lion.root); lion.root.position.y = deck; }
      else { lion.root.position.set(R * 0.3, 0, R + 0.5); lion.root.rotation.y = 0.4; s.root.add(lion.root); }
    }

    // What has happened to it.
    let heel = (random() - 0.5) * 0.08 + mix(0, 0.12, mood.energy) * (random() < 0.5 ? -1 : 1), sink = 0;
    if (a.state === 'bent') m.root.rotation.z = mix(0.25, 0.45, random()) * (random() < 0.5 ? -1 : 1);
    else if (a.state === 'listing') { heel = mix(0.4, 0.6, random()); sink = R * 0.28; }
    else if (a.state === 'adrift') {
      heel += 0.14;
      const link = new THREE.TorusGeometry(0.07, 0.02, 6, 10);
      const iron = b.material('#5c4433', { metalness: 0.4, roughness: 0.8 });
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, deck + 0.05, R * 0.2), new THREE.Vector3(0.1, deck + 0.04, R * 0.7), new THREE.Vector3(0, deck - 0.1, R + 0.06), new THREE.Vector3(-0.05, -0.2, R + 0.12), new THREE.Vector3(-0.3, -0.75, R + 0.35)]);
      const count = Math.round(path.getLength() / 0.1);
      const chain = new THREE.InstancedMesh(link, iron, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.copy(path.getPointAt(i / (count - 1)));
        dummy.lookAt(path.getPointAt(Math.min(1, i / (count - 1) + 0.01)));
        dummy.rotateZ(i % 2 ? Math.PI / 2 : 0); dummy.rotateY(Math.PI / 2);
        dummy.updateMatrix(); chain.setMatrixAt(i, dummy.matrix);
      }
      chain.castShadow = true;
      b.root.add(chain);
    } else if (a.state === 'fouled') {
      const mesh = painted(256, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#2f8f76'; ctx.lineWidth = 5;
        for (let i = -8; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + h, h); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 - h, h); ctx.stroke(); }
      });
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping; mesh.repeat.set(4, 2);
      const net = new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
      const reach = Math.min(poleTop * 0.6, 2.2);
      const drape = b.mesh(new THREE.ConeGeometry(R * 1.02, reach, 18, 4, true, random() * 6, Math.PI * mix(1.0, 1.6, random())), net, [mx, reach / 2 + 0.05, 0]);
      const p = drape.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * mix(0.9, 1.12, random()), p.getY(i), p.getZ(i) * mix(0.9, 1.12, random()));
      const rope = b.material('#d98a2b', { roughness: 0.9 });
      b.tube(Array.from({ length: 9 }, (_u, i) => [mx + Math.cos(i * 1.1) * mix(0.25, R, i / 8), mix(reach, 0.05, i / 8), Math.sin(i * 1.1) * mix(0.25, R, i / 8)] as const), 0.022, rope);
      for (let i = 0; i < 4; i++) { const angle = random() * 6; b.ball([0.11, 0.11, 0.11], [mx + Math.cos(angle) * R * 0.9, mix(0.2, 0.7, random()), Math.sin(angle) * R * 0.9], b.material(i % 2 ? '#e8582f' : '#f1efe6'), 12); }
    }

    // Weather on the paint: guano on top, rust and weed at the waterline.
    if (mood.wear > 0.3 || a.rider !== 'nothing') {
      const splat = new THREE.SphereGeometry(1, 8, 6);
      splat.scale(1, 0.12, 1);
      const count = Math.round(mix(4, 26, mood.wear));
      b.scatter(splat, b.material('#eeeee6', { roughness: 0.9 }), Array.from({ length: count }, () => {
        const angle = random() * 6, r = Math.sqrt(random()) * R * 0.9;
        return { at: [a.type === 'boat' ? mix(-2.4, 2.4, random()) : Math.cos(angle) * r, a.type === 'waverider' ? 0.1 + Math.sqrt(Math.max(0, 0.2 - r * r)) : deck + 0.005 - (a.type === 'boat' ? 0 : r / R * 0.03), a.type === 'boat' ? mix(-0.7, 0.7, random()) : Math.sin(angle) * r] as const, size: mix(0.03, 0.09, random()) };
      })).castShadow = false;
    }
    if (a.type !== 'boat') b.mesh(new THREE.CylinderGeometry(R + 0.015, R * 0.97, 0.16, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#3d5a34', roughness: 1, transparent: true, opacity: mix(0.25, 0.85, mood.wear) }), [0, -0.02, 0]).castShadow = false;

    const fore = a.type === 'boat';
    b.root.rotation[fore ? 'x' : 'z'] = heel;
    b.root.rotation.y = a.type === 'boat' ? 0.5 : random() * 0.6 - 0.3;
    b.root.position.y = -sink;
    const reach = a.type === 'boat' ? 3.5 : R * 1.55 + 0.3;
    waterPatch(s, reach, a.type === 'boat' ? 2.2 : reach * 0.9, { rings: 3, foam: 10 });

    const spin = mix(0.5, 14, mood.energy), sway = mix(0.01, 0.09, mood.energy), pace = mix(0.5, 1.6, mood.energy);
    const beat = mix(1.2, 4, mood.energy);
    return afloat(s, {
      footprint: reach * 0.8,
      update: (dt, time) => {
        cups.rotation.y += dt * spin;
        vane.rotation.y += Math.sin(time * 0.7) * dt * 0.3;
        b.root.rotation[fore ? 'x' : 'z'] = heel + Math.sin(time * pace) * sway;
        b.root.rotation[fore ? 'z' : 'x'] = Math.cos(time * pace * 0.8) * sway * 0.7;
        if (lit) {
          const on = (time * beat) % 4 < 2.6 ? 1 : 0.12;
          lens.emissiveIntensity = 2.2 * on;
          halo.visible = on > 0.5;
        }
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAINTS = {
  cherry: 'Candy-apple red metalflake.',
  grape: 'Deep purple metalflake.',
  teal: 'Teal green metalflake, a little seasick.',
  gold: 'Gold flake, a showman\'s jacket.',
  pink: 'Hot pink flake.',
  midnight: 'Midnight blue scattered with silver sparkle like a night sky.',
} as const;
const PAINT_COLOURS: Record<keyof typeof PAINTS, string> = { cherry: '#c2182b', grape: '#6a2a9c', teal: '#178f87', gold: '#d09a1e', pink: '#e83e8c', midnight: '#1b2a6e' };
const SEATS = {
  white: 'Cracked white vinyl.',
  black: 'Black vinyl, hot in the sun.',
  red: 'Red tuck-and-roll.',
  turquoise: 'Turquoise vinyl with white piping.',
} as const;
const SEAT_COLOURS: Record<keyof typeof SEATS, string> = { white: '#efe9dc', black: '#2a2a2e', red: '#b3262b', turquoise: '#3fb0aa' };

function flakeTexture(base: string, motif: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + random() * 0.6})`;
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 1.6, 1 + random() * 1.6);
  }
  // The motif sits at the middle of the back of the shell.
  ctx.save();
  ctx.translate(128, 150);
  ctx.fillStyle = '#fff4d0';
  ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 3;
  if (motif === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34, t = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(t) * r * 0.7, Math.sin(t) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (motif === 'bolt') {
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.moveTo(8, -38); ctx.lineTo(-12, 2); ctx.lineTo(0, 2); ctx.lineTo(-8, 38); ctx.lineTo(14, -8); ctx.lineTo(2, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (motif === 'flames') {
    for (const [c, k] of [['#ff7a1a', 1], ['#ffe14a', 0.6]] as const) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-40 * k, 36);
      for (let i = 0; i <= 6; i++) ctx.lineTo((-40 + i * 13.3) * k, i % 2 ? 36 - 70 * k : 36 - 26 * k);
      ctx.lineTo(40 * k, 36); ctx.closePath(); ctx.fill();
    }
  } else if (motif !== 'plain') {
    ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.scale(0.6, 1);
    ctx.strokeText(motif, 0, 0); ctx.fillText(motif, 0, 0);
  }
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    paint: choice('What colour is the glitter-flake shell?', PAINTS),
    state: choice('What is the car doing?', {
      spinning: 'Mid-ride: the deck tilted, the tub whipping round.',
      parked: 'Stopped level with the lap bar up, waiting for the next riders.',
      broken: 'Out of order: bar chained shut, a cone on the deck and a card taped to the shell.',
      tarped: 'Shut down under a roped blue tarp, only the shape of the shell showing.',
    }),
    hood: score('How far does the shell curl over the riders?', ['A low open scallop', 'A shoulder-high clamshell', 'A deep hood that swallows them']),
    seat: choice('What is the bench upholstered in?', SEATS),
    motif: choice('What is painted on the back of the shell?', {
      number: 'A big car number.',
      star: 'A cream five-pointed star.',
      bolt: 'A yellow lightning bolt.',
      flames: 'Hot-rod flames licking upward.',
      plain: 'Nothing, just flake.',
    }),
    bulbs: noul('Is the rim of the shell studded with bulbs?'),
    left: choice('What has been left behind on the seat or deck?', {
      nothing: 'Nothing.',
      flipflop: 'One lost flip-flop.',
      soda: 'A dropped soda cup and a spreading puddle.',
      plush: 'A small forgotten plush prize.',
      tickets: 'A curl of torn ride tickets.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = PAINT_COLOURS[a.paint];
    const number = String(1 + Math.floor(random() * 7));
    const flake = new THREE.MeshStandardMaterial({ map: flakeTexture(base, a.motif === 'number' ? number : a.motif, random), metalness: mix(0.6, 0.2, mood.wear), roughness: mix(0.22, 0.6, mood.wear), side: THREE.FrontSide });
    const inner = s.material('#e9e4d6', { side: THREE.BackSide, roughness: 0.6 });
    const chrome = s.material('#dfe3e6', { metalness: 0.9, roughness: 0.2 });
    const seatMat = s.material(SEAT_COLOURS[a.seat], { roughness: 0.55, side: THREE.DoubleSide });
    const steel = s.material('#7c8389', { metalness: 0.6, roughness: 0.5 });
    const deckPaint = s.material(mood.cheer > 0.5 ? '#e7c23c' : '#8f8a7c');
    const dark = s.material('#2a2b2e');

    const tilt = a.state === 'spinning' ? mix(0.1, 0.2, mood.energy) : a.state === 'broken' ? 0.05 : 0;
    const deckH = 0.75;
    const deck = new THREE.Group();
    deck.position.y = deckH;
    deck.rotation.z = tilt;
    s.root.add(deck);
    const on = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };

    // Deck segment: plank wedge with a painted edge and a steel hub plate.
    const wedge = new THREE.Shape();
    const r0 = 1.2, r1 = 4.6, half = 0.42;
    wedge.absarc(0, 0, r1, Math.PI / 2 - half, Math.PI / 2 + half, false);
    wedge.absarc(0, 0, r0, Math.PI / 2 + half, Math.PI / 2 - half, true);
    const wedgeGeo = new THREE.ExtrudeGeometry(wedge, { depth: 0.14, bevelEnabled: false, curveSegments: 16 });
    wedgeGeo.rotateX(Math.PI / 2);
    wedgeGeo.translate(0, 0, -(r0 + r1) / 2);
    on(deck, s.mesh(wedgeGeo, s.material('#8c6b48')));
    for (let i = 0; i < 6; i++) {
      const rr = r0 + 0.3 + i * 0.55;
      const line = on(deck, s.ring(rr, 0.012, [0, 0.005, -(r0 + r1) / 2], dark, half * 2));
      line.rotation.set(Math.PI / 2, 0, Math.PI / 2 - half);
      line.scale.z = 0.3;
    }
    const edge = on(deck, s.ring(r1, 0.06, [0, -0.05, -(r0 + r1) / 2], deckPaint, half * 2));
    edge.rotation.set(Math.PI / 2, 0, Math.PI / 2 - half);
    on(deck, s.cylinder(1.3, 1.3, 0.05, [0, 0.03, 0], steel, 36));
    on(deck, s.cylinder(0.28, 0.34, 0.2, [0, 0.14, 0], dark, 16));
    // Undercarriage: rails on the ground and posts reaching up to the tilted deck.
    for (const z of [-1.1, 1.1]) s.box([3.6, 0.1, 0.12], [0, 0.05, z], steel);
    for (const x of [-1.3, 1.3]) for (const z of [-1.1, 1.1]) {
      s.rod([x, 0.1, z], [x * Math.cos(tilt), deckH - 0.14 + x * Math.sin(tilt), z], 0.05, steel);
      s.cylinder(0.13, 0.13, 0.08, [x, 0.17, z + 0.1], dark, 12).rotation.x = Math.PI / 2;
    }
    s.rod([-1.3, 0.12, -1.1], [1.3 * Math.cos(tilt), deckH - 0.2 + 1.3 * Math.sin(tilt), 1.1], 0.025, steel);

    // The tub.
    const tub = new THREE.Group();
    tub.position.y = 0.24;
    tub.rotation.y = a.state === 'spinning' ? random() * Math.PI * 2 : (random() - 0.5) * 0.5;
    deck.add(tub);
    const hood = mix(0.36, 0.04, a.hood), ext = mix(-0.3, 0.3, a.hood);
    const shellGeo = new THREE.SphereGeometry(1.15, 28, 16, Math.PI - ext, Math.PI + ext * 2, hood * Math.PI, (0.62 - hood) * Math.PI);
    const cy = 0.98;
    on(tub, s.mesh(shellGeo, flake, [0, cy, 0]));
    on(tub, s.mesh(shellGeo, inner, [0, cy, 0]));
    const rimY = cy + 1.15 * Math.cos(0.62 * Math.PI), rimR = 1.15 * Math.sin(0.62 * Math.PI);
    on(tub, s.mesh(new THREE.CylinderGeometry(rimR, 0.82, rimY - 0.02, 28, 1, true), flake, [0, (rimY + 0.02) / 2, 0]));
    on(tub, s.mesh(new THREE.CylinderGeometry(rimR, 0.82, rimY - 0.02, 28, 1, true), inner, [0, (rimY + 0.02) / 2, 0]));
    on(tub, s.cylinder(0.84, 0.84, 0.05, [0, 0.05, 0], dark, 28));
    const rim = on(tub, s.ring(rimR, 0.03, [0, rimY, 0], chrome));
    rim.rotation.x = Math.PI / 2;
    // Bench and backrest follow the back of the tub.
    on(tub, s.mesh(new THREE.CylinderGeometry(rimR - 0.06, rimR - 0.1, 0.16, 24, 1, false, Math.PI * 0.5, Math.PI), seatMat, [0, rimY - 0.2, 0]));
    on(tub, s.mesh(new THREE.CylinderGeometry(rimR - 0.02, rimR - 0.08, 0.55, 24, 1, true, Math.PI * 0.55, Math.PI * 0.9), seatMat, [0, rimY + 0.16, 0]));
    for (let i = 0; i < 5; i++) {
      const t = Math.PI * (0.62 + i * 0.19);
      on(tub, s.box([0.02, 0.5, 0.03], [Math.sin(t) * (rimR - 0.07), rimY + 0.16, Math.cos(t) * (rimR - 0.07)], dark)).rotation.y = t;
    }
    // Lap bar: down across the laps, or swung up.
    const barUp = a.state === 'parked';
    const bar = new THREE.Group();
    bar.position.set(0, rimY + 0.05, -0.1);
    const barTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.92, 0, 0], [-0.8, 0.12, 0.5], [0, 0.18, 0.82], [0.8, 0.12, 0.5], [0.92, 0, 0]].map((p) => new THREE.Vector3(...p))), 32, 0.03, 8), chrome);
    barTube.castShadow = true;
    bar.add(barTube);
    bar.rotation.x = barUp ? -1.05 : 0;
    tub.add(bar);
    // Number plate on the front wall.
    const plate = on(tub, s.label(number, 0.26, 0.2, [0, rimY * 0.55, (rimR + 0.82) / 2 + 0.035], '#1c1c1c', '#fff4d0'));
    plate.rotation.x = -0.4;

    if (a.bulbs && a.state !== 'tarped') {
      const lit = a.state !== 'broken';
      const bm = new THREE.MeshStandardMaterial({ color: lit ? '#fff2c2' : '#8d897c', emissive: '#ffc15a', emissiveIntensity: lit ? 1.4 : 0 });
      const pts: { at: [number, number, number]; size: number }[] = [];
      const th0 = hood * Math.PI;
      for (let i = 0; i <= 14; i++) {
        // Along both open edges of the shell and over the top lip.
        const th = mix(th0, 0.62 * Math.PI, i / 14);
        for (const ph of [Math.PI - ext, 2 * Math.PI + ext]) if (random() > mood.wear * 0.4) pts.push({ at: [-1.17 * Math.cos(ph) * Math.sin(th), cy + 1.17 * Math.cos(th), 1.17 * Math.sin(ph) * Math.sin(th)], size: 0.035 });
      }
      for (let i = 1; i < 12; i++) { const ph = mix(Math.PI - ext, 2 * Math.PI + ext, i / 12); pts.push({ at: [-1.17 * Math.cos(ph) * Math.sin(th0), cy + 1.17 * Math.cos(th0), 1.17 * Math.sin(ph) * Math.sin(th0)], size: 0.035 }); }
      on(tub, s.scatter(new THREE.SphereGeometry(1, 8, 6), bm, pts));
    }

    if (a.state === 'broken') {
      on(tub, s.rod([-0.92, rimY + 0.05, -0.1], [-0.6, rimY - 0.25, 0.55], 0.015, dark));
      on(tub, s.label('OUT OF ORDER', 0.7, 0.2, [0.25, rimY * 0.55, (rimR + 0.82) / 2 + 0.05], '#b3262b', '#fbf6ee')).rotation.set(-0.4, 0, 0.12);
      on(deck, s.cylinder(0.03, 0.16, 0.5, [1.0, 0.3, 2.0], s.material('#f07a1c'), 12));
      on(deck, s.box([0.4, 0.03, 0.4], [1.0, 0.055, 2.0], s.material('#f07a1c')));
    }
    if (a.state === 'tarped') {
      const tarpGeo = new THREE.SphereGeometry(1.32, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const pos = tarpGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), front = Math.max(0, pos.getZ(i)) * (1 - hood) * 0.35;
        const k = 1 + (random() - 0.5) * 0.09;
        pos.setXYZ(i, pos.getX(i) * k, (y - front * Math.max(0, y)) * k, pos.getZ(i) * k);
      }
      tarpGeo.computeVertexNormals();
      const tarp = on(tub, s.mesh(tarpGeo, s.material(mood.warmth > 0.6 ? '#8a7a55' : '#2f66b8', { flatShading: true, roughness: 0.7, side: THREE.DoubleSide }), [0, cy - 0.05 + (0.36 - hood) * 0.9, 0]));
      tarp.scale.y = mix(0.75, 1.1, a.hood);
      for (const y of [0.25, 0.55]) on(tub, s.ring(1.26, 0.014, [0, y + 0.2, 0], s.material('#d8c9a0'))).rotation.x = Math.PI / 2;
      on(tub, s.mesh(new THREE.CylinderGeometry(1.27, 1.2, 0.75, 18, 1, true), tarp.material as THREE.Material, [0, 0.42, 0]));
    }

    // What was left behind.
    const seatY = rimY - 0.1;
    if (a.state !== 'tarped') {
      if (a.left === 'flipflop') {
        const f = on(deck, s.box([0.11, 0.025, 0.27], [0.8, 0.07, 1.9 + random() * 0.6], s.material('#2fb7d6')));
        f.rotation.y = random() * 3;
      } else if (a.left === 'soda') {
        const cup = on(deck, s.cylinder(0.05, 0.035, 0.16, [-0.7, 0.11, 1.8 + random() * 0.5], s.material('#d5283c'), 12));
        cup.rotation.z = Math.PI / 2;
        on(deck, s.cylinder(0.3, 0.3, 0.006, [-0.95, 0.063, cup.position.z + 0.05], s.material('#5a3320', { roughness: 0.1 }), 16)).scale.z = 0.6;
      } else if (a.left === 'plush') {
        const c = s.material('#e9a6b8', { roughness: 0.95 });
        on(tub, s.ball([0.12, 0.13, 0.11], [0.35, seatY + 0.11, -0.55], c));
        on(tub, s.ball([0.1, 0.1, 0.1], [0.35, seatY + 0.3, -0.53], c));
        for (const x of [-1, 1]) on(tub, s.ball([0.04, 0.04, 0.03], [0.35 + x * 0.08, seatY + 0.39, -0.53], c, 8));
      } else if (a.left === 'tickets') {
        const strip = on(deck, s.tube([[0.2, 0.07, 1.7], [0.45, 0.075, 1.9], [0.3, 0.07, 2.15], [0.55, 0.08, 2.35], [0.5, 0.11, 2.5]], 0.012, s.material('#e23b3b')));
        strip.scale.y = 1;
        for (let i = 0; i < 5; i++) on(deck, s.box([0.09, 0.006, 0.05], [0.2 + random() * 0.8, 0.066, 1.6 + random() * 1.2], s.material('#e23b3b'))).rotation.y = random() * 3;
      }
    }
    // Dents and rust patches come with wear.
    const scabs = Math.round(mood.wear * 7);
    for (let i = 0; i < scabs; i++) {
      const t = random() * Math.PI * 2;
      on(tub, s.ball([0.07 + random() * 0.06, 0.05 + random() * 0.05, 0.02], [Math.sin(t) * 0.97, 0.15 + random() * 0.25, Math.cos(t) * 0.97], s.material('#6f4a32'), 8)).rotation.y = t;
    }

    const spin = a.state === 'spinning' ? mix(0.6, 5, mood.energy) : 0;
    const wobble = tilt;
    return s.finish({
      footprint: 2.2,
      update: (dt, time) => {
        if (!spin) return;
        tub.rotation.y += dt * spin * (0.6 + 0.4 * Math.sin(time * 0.9));
        deck.rotation.z = wobble * Math.cos(time * 0.8);
        deck.rotation.x = wobble * 0.5 * Math.sin(time * 0.8);
      },
    });
  },
});

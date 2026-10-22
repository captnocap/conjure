import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const MESSAGES = {
  ticket: 'PRESS FOR TICKET, the ordinary welcome.',
  full: 'FULL, in red: no room, turn around.',
  insert: 'INSERT TICKET, the exit demanding proof.',
  thanks: 'THANK YOU, the release.',
  fault: 'OUT OF ORDER, a fault nobody has come to fix.',
  wait: 'PLEASE WAIT, stalled mid-thought.',
  blank: 'Nothing: the display is dark and dead.',
} as const;
const TEXT: Record<keyof typeof MESSAGES, [string, string, string]> = {
  ticket: ['PRESS FOR', 'TICKET', '#7dff9a'],
  full: ['CAR PARK', 'FULL', '#ff5a48'],
  insert: ['INSERT', 'TICKET', '#ffc34a'],
  thanks: ['THANK', 'YOU', '#7dff9a'],
  fault: ['OUT OF', 'ORDER', '#ff5a48'],
  wait: ['PLEASE', 'WAIT...', '#ffc34a'],
  blank: ['', '', '#222222'],
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    arm: choice('What is the boom arm doing?', {
      lowered: 'Down across the lane, level and final.',
      raised: 'Standing almost straight up: the way is open.',
      halfway: 'Stuck halfway at a slant, neither letting you in nor keeping you out.',
      snapped: 'Snapped off: a splintered stub on the hub and the rest lying on the ground where someone drove through it.',
    }),
    message: choice('What does the display on the cabinet say?', MESSAGES),
    cabinet: choice('What colour is the machine cabinet?', {
      yellow: 'Traffic yellow, the classic municipal machine.',
      steel: 'Brushed grey steel, anonymous and corporate.',
      orange: 'Safety orange, loud and a little dated.',
      green: 'Dark bottle green, an old private car park.',
      white: 'White with a blue stripe, hospital or airport.',
    }),
    stripes: choice('How is the boom arm striped?', {
      redwhite: 'Red and white bands.',
      yellowblack: 'Yellow and black hazard bands.',
      plain: 'Plain white aluminium with a few red reflectors.',
    }),
    ground: choice('What is painted or cut into the ground in the lane?', {
      loop: 'A rectangle of tar-sealed saw cuts: the buried loop sensor.',
      hatch: 'A yellow hatched box that says keep clear.',
      stop: 'A thick white stop line and the word STOP.',
      arrow: 'A big white arrow pointing the way through.',
    }),
    ticket: noul('Is a ticket sticking out of the slot, waiting to be taken?'),
    skirt: noul('Does a folding skirt of hanging bars drop below the boom arm?'),
    signal: noul('Is there a red and green signal lamp on top of the cabinet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = { yellow: '#e8b61f', steel: '#a9b0b3', orange: '#e2702a', green: '#2f5a44', white: '#e9ebe8' }[a.cabinet];
    const paintwork = s.material(body, { metalness: a.cabinet === 'steel' ? 0.6 : 0.15, roughness: 0.5 });
    const dark = s.material('#23282b');
    const steel = s.material('#b9c0c2', { metalness: 0.7, roughness: 0.35 });
    const concrete = s.material('#a6a59d', { roughness: 0.95 });
    const white = s.material('#f1f0ea');
    const lane = 1.45; // centre of the lane, x
    const length = 2.5;

    // Kerbed island with hazard-striped nose.
    const island = new THREE.Shape();
    island.absarc(0, 0.75, 0.42, 0, Math.PI, false);
    island.absarc(0, -0.75, 0.42, Math.PI, Math.PI * 2, false);
    const kerb = s.mesh(new THREE.ExtrudeGeometry(island, { depth: 0.14, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), concrete);
    kerb.rotation.x = -Math.PI / 2;
    const hazard = paint(256, 32, (ctx) => {
      ctx.fillStyle = '#e8c21f'; ctx.fillRect(0, 0, 256, 32);
      ctx.fillStyle = '#1d1d1d';
      for (let i = -1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 32); ctx.lineTo(i * 32 + 16, 32); ctx.lineTo(i * 32 + 48, 0); ctx.lineTo(i * 32 + 32, 0); ctx.fill(); }
    });
    const nose = s.mesh(new THREE.CylinderGeometry(0.445, 0.445, 0.13, 24, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.8 }), [0, 0.085, 0.75]);
    nose.rotation.y = 0;

    // Cabinet.
    const base = 0.16;
    s.box([0.46, 0.08, 0.46], [0, base + 0.04, 0], dark);
    s.box([0.42, 1.02, 0.42], [0, base + 0.59, 0], paintwork);
    const cap = s.box([0.5, 0.06, 0.5], [0, base + 1.13, 0], a.cabinet === 'white' ? s.material('#2b5fa5') : dark);
    cap.rotation.y = 0;
    if (a.cabinet === 'white') s.box([0.425, 0.08, 0.425], [0, base + 0.45, 0], s.material('#2b5fa5'));
    // Service door seam, lock and vents on the lane side.
    s.box([0.004, 0.86, 0.34], [0.212, base + 0.56, 0], dark);
    s.cylinder(0.018, 0.018, 0.01, [0.216, base + 0.6, 0.12], steel, 12).rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) s.box([0.006, 0.012, 0.2], [0.214, base + 0.2 + i * 0.03, 0], dark);

    // Fascia: display, ticket slot, button, intercom.
    const [line1, line2, ink] = TEXT[a.message];
    const flickering = a.message === 'wait' || a.message === 'fault';
    const displayMap = paint(256, 128, (ctx) => {
      ctx.fillStyle = '#0b0f0d'; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(line1, 128, 38, 236); ctx.fillText(line2, 128, 92, 236);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 256, 1);
    });
    const displayMat = new THREE.MeshStandardMaterial({ map: displayMap, emissiveMap: displayMap, emissive: '#ffffff', emissiveIntensity: a.message === 'blank' ? 0 : mix(0.9, 1.5, mood.cheer), roughness: 0.3 });
    s.box([0.36, 0.5, 0.03], [0, base + 0.82, 0.215], dark);
    s.mesh(new THREE.PlaneGeometry(0.3, 0.15), displayMat, [0, base + 0.96, 0.232]);
    const slotGlow = a.message === 'blank' ? '#30362f' : a.message === 'full' || a.message === 'fault' ? '#ff5a48' : '#8dffa6';
    const slotMat = new THREE.MeshStandardMaterial({ color: slotGlow, emissive: slotGlow, emissiveIntensity: a.message === 'blank' ? 0 : 1.6, roughness: 0.4 });
    s.box([0.2, 0.05, 0.02], [-0.03, base + 0.79, 0.232], slotMat);
    s.box([0.15, 0.012, 0.025], [-0.03, base + 0.79, 0.236], dark);
    if (a.ticket) {
      const ticket = s.box([0.12, 0.002, 0.09], [-0.03, base + 0.782, 0.275], white);
      ticket.rotation.x = 0.35 + random() * 0.25;
    }
    const button = s.cylinder(0.035, 0.035, 0.03, [0.12, base + 0.79, 0.235], new THREE.MeshStandardMaterial({ color: '#2fbf5a', emissive: '#2fbf5a', emissiveIntensity: a.message === 'blank' ? 0 : 0.9 }), 16);
    button.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) s.box([0.14, 0.008, 0.01], [0, base + 0.63 + i * 0.022, 0.232], steel);
    s.label('TICKETS', 0.2, 0.045, [0, base + 1.065, 0.232], '#f3f3ee', '#23282b');

    // Signal lamp.
    const open = a.arm === 'raised' || a.arm === 'snapped';
    if (a.signal) {
      s.cylinder(0.025, 0.025, 0.2, [-0.12, base + 1.26, 0], dark, 10);
      s.box([0.13, 0.26, 0.12], [-0.12, base + 1.46, 0], dark);
      for (const [y, tint, lit] of [[1.52, '#ff3b30', !open], [1.4, '#3be06a', open]] as const) {
        const lamp = s.cylinder(0.042, 0.042, 0.02, [-0.12, base + y, 0.062], new THREE.MeshStandardMaterial({ color: lit ? tint : '#3a2c2a', emissive: tint, emissiveIntensity: lit ? 2 : 0.04 }), 16);
        lamp.rotation.x = Math.PI / 2;
        const hood = s.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 14, 1, true, Math.PI / 2, Math.PI), dark, [-0.12, base + y, 0.09]);
        hood.rotation.x = Math.PI / 2;
      }
    }

    // Boom: hub on the back face, arm of banded segments, counterweight tail.
    const pivotY = base + 0.92;
    const pivot = new THREE.Group();
    pivot.position.set(0.06, pivotY, -0.27);
    s.root.add(pivot);
    const hub = s.cylinder(0.13, 0.13, 0.1, [0.06, pivotY, -0.25], dark, 20);
    hub.rotation.x = Math.PI / 2;
    const [bandA, bandB] = { redwhite: ['#d0281f', '#f1f0ea'], yellowblack: ['#e8c21f', '#1d1d1d'], plain: ["#c9ced0", "#c9ced0"] }[a.stripes];
    const matA = s.material(bandA), matB = s.material(bandB);
    const reflector = new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff2a1a', emissiveIntensity: 0.6 });
    const armLength = a.arm === 'snapped' ? mix(0.5, 0.9, random()) : length;
    const addArm = (group: THREE.Group, from: number, to: number) => {
      const seg = 0.25;
      for (let x = from, i = Math.round(from / seg); x < to - 0.001; x += seg, i++) {
        const w = Math.min(seg, to - x);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, 0.05), i % 2 ? matB : matA);
        m.position.set(x + w / 2, 0, 0);
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        if (a.stripes === 'plain' && i % 2 === 0 && w > 0.2) {
          const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.056), reflector);
          r.position.set(x + w / 2, 0, 0);
          group.add(r);
        }
      }
    };
    addArm(pivot, 0, armLength);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), dark);
    tail.position.set(-0.2, 0, 0); tail.castShadow = true;
    pivot.add(tail);
    const angle = { lowered: 0, raised: 1.42, halfway: mix(0.45, 0.85, random()), snapped: mix(-0.12, 0.2, random()) }[a.arm];
    pivot.rotation.z = angle + (a.arm === 'lowered' ? -mood.wear * 0.04 : 0);

    if (a.arm === 'snapped') {
      // Splinters on the stub and the broken length on the ground.
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12 + random() * 0.1, 4), matB);
        shard.position.set(armLength + 0.04, (i - 1.5) * 0.024, 0); shard.rotation.z = -Math.PI / 2 + (random() - 0.5) * 0.5;
        pivot.add(shard);
      }
      const fallen = new THREE.Group();
      addArm(fallen, 0, length - armLength);
      fallen.position.set(mix(0.9, 1.3, random()), 0.03, mix(0.5, 1.1, random()));
      fallen.rotation.set(Math.PI / 2, 0, mix(-0.5, 0.2, random()), 'YXZ');
      fallen.rotation.y = mix(-0.7, -0.2, random());
      s.root.add(fallen);
      for (let i = 0; i < 6; i++) s.box([0.05 + random() * 0.06, 0.008, 0.02 + random() * 0.03], [0.6 + random() * 1.4, 0.006, 0.2 + random() * 1.2], i % 2 ? matA : matB).rotation.y = random() * 3;
    } else if (a.skirt) {
      // Hanging bars stay vertical however the arm sits; a lower rail joins them.
      const count = 9;
      const drop = 0.55;
      const c = Math.cos(pivot.rotation.z), sn = Math.sin(pivot.rotation.z);
      let previous: [number, number, number] | null = null;
      for (let i = 0; i < count; i++) {
        const d = 0.5 + i * ((length - 0.7) / (count - 1));
        const top: [number, number, number] = [0.06 + c * d, pivotY + sn * d - 0.04, -0.27];
        const foot: [number, number, number] = [top[0], Math.max(0.12, top[1] - drop), -0.27];
        s.rod(top, foot, 0.012, steel);
        if (previous) s.rod(previous, foot, 0.01, steel);
        previous = foot;
      }
    }

    // Rest post across the lane.
    const restX = 0.06 + length - 0.12;
    s.cylinder(0.035, 0.04, pivotY - 0.09, [restX, (pivotY - 0.09) / 2, -0.27], steel, 12);
    s.box([0.14, 0.02, 0.1], [restX, pivotY - 0.08, -0.27], dark);
    for (const z of [-0.325, -0.215]) s.box([0.14, 0.12, 0.012], [restX, pivotY - 0.02, z], dark);
    s.cylinder(0.09, 0.09, 0.012, [restX, 0.006, -0.27], dark, 14);

    // Lane markings, a few millimetres proud of the ground.
    const tar = s.material('#26282a', { roughness: 0.7 });
    const yellow = s.material('#e3b922', { roughness: 0.85 });
    const mark = s.material('#edece4', { roughness: 0.85 });
    if (a.ground === 'loop') {
      for (const z of [-0.2, 1.3]) s.box([1.9, 0.005, 0.035], [lane, 0.003, z], tar);
      for (const x of [-0.95, 0.95]) s.box([0.035, 0.005, 1.5], [lane + x, 0.003, 0.55], tar);
      for (const [x, z] of [[-0.95, -0.2], [0.95, -0.2], [-0.95, 1.3], [0.95, 1.3]]) s.box([0.3, 0.005, 0.035], [lane + x * 0.87, 0.003, z + (z < 0 ? 0.1 : -0.1)], tar).rotation.y = (x * (z < 0 ? 1 : -1) > 0 ? 1 : -1) * 0.78;
      s.box([0.035, 0.005, 0.9], [lane - 1.25, 0.003, 1.2], tar).rotation.y = 0.5;
    } else if (a.ground === 'hatch') {
      for (const z of [-0.2, 1.4]) s.box([1.9, 0.005, 0.08], [lane, 0.003, z], yellow);
      for (const x of [-1.05, 1.05]) s.box([0.08, 0.005, 1.68], [lane + x * 0.905, 0.003, 0.6], yellow);
      for (let i = -2; i <= 2; i++) s.box([0.06, 0.005, 1.9], [lane + i * 0.38, 0.003, 0.6], yellow).rotation.y = 0.78;
    } else if (a.ground === 'stop') {
      s.box([2.0, 0.005, 0.22], [lane, 0.003, 0.25], mark);
      const word = s.label('STOP', 1.7, 0.75, [lane, 0.004, 1.0], '#edece4', '#8f8e87');
      word.rotation.x = -Math.PI / 2;
      (word.material as THREE.MeshStandardMaterial).transparent = true;
      (word.material as THREE.MeshStandardMaterial).alphaTest = 0.5;
      const m = word.material as THREE.MeshStandardMaterial;
      m.alphaMap = paint(256, 112, (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 112); ctx.fillStyle = '#fff'; ctx.font = 'bold 96px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOP', 128, 60, 240); });
      m.map?.dispose(); m.map = null; m.color.set('#edece4');
    } else {
      const arrow = new THREE.Shape();
      arrow.moveTo(-0.12, 0); arrow.lineTo(0.12, 0); arrow.lineTo(0.12, 0.9); arrow.lineTo(0.4, 0.9); arrow.lineTo(0, 1.6); arrow.lineTo(-0.4, 0.9); arrow.lineTo(-0.12, 0.9);
      const m = s.mesh(new THREE.ShapeGeometry(arrow), mark, [lane, 0.004, 1.5]);
      m.rotation.x = -Math.PI / 2;
    }

    // Mood: cones crowd in with density, tape and stains with wear.
    const cones = Math.round(mix(0, 3.4, mood.density) * (a.arm === 'snapped' || a.message === 'fault' ? 1 : 0.6));
    const coneMat = s.material('#f0641e');
    for (let i = 0; i < cones; i++) {
      const x = mix(0.7, 2.9, random()), z = mix(0.9, 1.5, random()) * (i % 2 ? 1 : -0.75) - 0.2;
      const tipped = mood.wear > 0.6 && random() < 0.4;
      const cone = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), dark); b.position.y = 0.015;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.11, 0.5, 14), coneMat); c.position.y = 0.28;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.082, 0.1, 14), white); band.position.y = 0.3;
      cone.add(b, c, band);
      cone.traverse((n) => { n.castShadow = true; });
      cone.position.set(x, tipped ? 0.13 : 0, z);
      if (tipped) cone.rotation.set(0, random() * 6, Math.PI / 2 - 0.2);
      s.root.add(cone);
    }
    if (mood.wear > 0.45) {
      const tape = s.material('#e8c21f');
      const wraps = Math.round(mix(0, 3, (mood.wear - 0.45) / 0.55));
      for (let i = 0; i < wraps; i++) s.box([0.435, 0.04, 0.435], [0, base + 0.25 + i * 0.13 + random() * 0.05, 0], tape).rotation.z = (random() - 0.5) * 0.08;
      const rust = s.material('#6b4630', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.box([0.05 + random() * 0.1, 0.1 + random() * 0.25, 0.003], [(random() - 0.5) * 0.34, base + 0.12 + random() * 0.2, 0.212], rust);
    }

    const sway = a.arm === 'halfway' ? mix(0.002, 0.05, mood.energy) : 0;
    const rest = pivot.rotation.z;
    const glow = displayMat.emissiveIntensity;
    return s.finish({
      footprint: 1.6,
      update: (_dt, time) => {
        if (sway && !a.skirt) pivot.rotation.z = rest + Math.sin(time * mix(2, 14, mood.energy)) * sway * (Math.sin(time * 0.9) > 0.2 ? 1 : 0.1);
        if (flickering) displayMat.emissiveIntensity = glow * (Math.sin(time * mix(2, 9, mood.energy)) > -0.3 ? 1 : 0.25);
      },
    });
  },
});

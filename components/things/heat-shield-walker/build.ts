import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIVERY = {
  ceramic: 'White ceramic tile, clean and clinical.',
  foil: 'Crinkled gold foil blankets.',
  titanium: 'Bare grey titanium, all rivets and plates.',
  hazard: 'Hazard orange with black chevrons.',
  scorched: 'Scorched black, the paint long burned off.',
} as const;
const HULL: Record<keyof typeof LIVERY, string> = { ceramic: '#e9e6dc', foil: '#d4a53a', titanium: '#8f969c', hazard: '#e8731c', scorched: '#35302e' };

export default defineThing({
  questions: {
    state: choice('What is the walker doing?', {
      striding: 'Striding steadily, legs swinging in threes.',
      probing: 'Paused with one foreleg raised, testing the ground ahead.',
      crouched: 'Crouched low under its shield, knees high, waiting out the heat.',
      melted: 'Limping: one leg has melted to a drooping stump and it lists to that side.',
      dead: 'Long dead: belly on the ground, legs splayed, the parasol fallen beside it.',
    }),
    shield: choice('What kind of sun shield does it carry?', {
      dish: 'A round mirrored dish like a polished parasol.',
      hex: 'A shallow six-sided umbrella with ribs.',
      petals: 'A flower of separate mirror petals with gaps between.',
      louvre: 'A flat rectangular rack of angled mirror slats.',
    }),
    livery: choice('What is its hull finished in?', LIVERY),
    fins: choice('Where are its radiator fins?', {
      dorsal: 'A row of upright fins along its spine, like a sail-backed lizard.',
      wings: 'Two fin panels angled out from its flanks like wings.',
      tail: 'A fan of fins behind it like a peacock tail.',
    }),
    payload: choice('What instrument does it carry?', {
      drill: 'A core drill slung under its belly.',
      arm: 'A jointed sampling arm with a claw out front.',
      mast: 'A tall camera mast with twin lenses, a periscope neck.',
      antenna: 'A small comms dish and whip aerial on its back.',
      panniers: 'Sample canisters strapped along both flanks.',
    }),
    marking: choice('What is painted on its side?', {
      number: 'A stencilled unit number.',
      name: 'A hand-painted name, somebody loved it.',
      tally: 'Tally marks, days survived.',
      plain: 'Nothing at all.',
    }),
    eye: choice('What is its sensor eye like?', {
      single: 'One large lens, cyclops calm.',
      cluster: 'A spider cluster of small lenses.',
      visor: 'A wide glowing visor strip.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context);
    const p = new Sculpture(context);
    s.root.add(b.root);
    const { mood, random } = context;
    const dead = a.state === 'dead';
    const up = new THREE.Vector3(0, 1, 0);

    const hull = b.material(HULL[a.livery], { roughness: a.livery === 'foil' ? 0.35 : 0.6, metalness: a.livery === 'foil' || a.livery === 'titanium' ? 0.45 : 0.05, flatShading: a.livery === 'foil' });
    const dark = b.material('#2b2c30', { roughness: 0.7 });
    const steel = b.material('#7c8389', { metalness: 0.5, roughness: 0.4 });
    const mirror = new THREE.MeshStandardMaterial({ color: '#eef3f6', metalness: 0.35, roughness: mix(0.1, 0.5, mood.wear), emissive: '#ffb47a', emissiveIntensity: dead ? 0 : mood.warmth * 0.22, side: THREE.DoubleSide, flatShading: a.shield !== 'dish' });
    const foil = new THREE.MeshStandardMaterial({ color: '#c9962e', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
    const heat = dead ? 0 : mix(0.25, 1.5, mood.warmth);
    const fin = new THREE.MeshStandardMaterial({ color: '#4a3a38', emissive: '#ff3c12', emissiveIntensity: heat, roughness: 0.7, side: THREE.DoubleSide });
    const eyeColour = dead ? '#1d1f22' : mood.cheer > 0.5 ? '#58e0d0' : '#ff9a2e';
    const eye = new THREE.MeshStandardMaterial({ color: eyeColour, emissive: eyeColour, emissiveIntensity: dead ? 0 : 1.6, roughness: 0.3 });

    // Hull: a flattened eight-sided prism lying along z.
    const shell = b.mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.6, 8).rotateX(Math.PI / 2).rotateZ(Math.PI / 8), hull);
    shell.scale.set(1, 0.62, 1);
    b.box([0.8, 0.08, 1.3], [0, -0.33, 0], dark);
    b.box([0.62, 0.16, 0.9], [0, 0.36, -0.1], steel);
    if (a.livery === 'hazard') for (let i = 0; i < 4; i++) for (const side of [-1, 1]) b.box([0.02, 0.3, 0.12], [side * 0.565, 0, -0.55 + i * 0.36], dark).rotation.x = 0.6;
    // Head and eye.
    b.box([0.5, 0.34, 0.36], [0, 0.08, 0.92], hull);
    b.box([0.3, 0.2, 0.2], [0, 0.06, 0.72], dark);
    if (a.eye === 'single') { b.cylinder(0.14, 0.16, 0.14, [0, 0.1, 1.12], dark, 16).rotation.x = Math.PI / 2; b.cylinder(0.1, 0.1, 0.03, [0, 0.1, 1.2], eye, 16).rotation.x = Math.PI / 2; }
    else if (a.eye === 'cluster') for (let i = 0; i < 7; i++) { const x = (i % 4 - 1.5) * 0.11 + (i > 3 ? 0.055 : 0), y = i > 3 ? 0.0 : 0.15; b.cylinder(0.04, 0.045, 0.08, [x, y, 1.12], dark, 10).rotation.x = Math.PI / 2; b.ball([0.032, 0.032, 0.02], [x, y, 1.165], eye, 8); }
    else { b.box([0.46, 0.09, 0.04], [0, 0.12, 1.11], eye); b.box([0.52, 0.03, 0.08], [0, 0.19, 1.11], dark); }

    // Markings on both flanks.
    const text = { number: `S-${10 + Math.floor(random() * 89)}`, name: ['MABEL', 'OLD SALT', 'TORTUGA', 'PILGRIM', 'DOROTHY'][Math.floor(random() * 5)], tally: '||||  ||||  |||', plain: '' }[a.marking];
    if (text) for (const side of [-1, 1]) {
      const label = b.label(text, 0.7, 0.2, [side * 0.575, 0.02, -0.05], a.livery === 'scorched' ? '#c9c2b2' : '#1f2226', HULL[a.livery]);
      label.rotation.y = side * Math.PI / 2;
      label.castShadow = false;
    }

    // Radiator fins.
    if (a.fins === 'dorsal') for (let i = 0; i < 7; i++) b.box([0.5, 0.42 - Math.abs(i - 3) * 0.05, 0.025], [0, 0.62 - Math.abs(i - 3) * 0.025, -0.6 + i * 0.16], fin);
    else if (a.fins === 'wings') for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const m = b.box([0.75, 0.02, 0.16], [side * 0.82, 0.42 + i * 0.012, -0.55 + i * 0.2], fin); m.rotation.set(0.5, 0, side * 0.45); }
    else for (let i = 0; i < 7; i++) { const angle = (i - 3) * 0.3; const m = b.box([0.03, 0.85, 0.3], [Math.sin(angle) * 0.45, 0.3 + Math.cos(angle) * 0.4, -0.95 - Math.cos(angle) * 0.1], fin); m.rotation.set(-0.5, 0, -angle); }

    // Payload.
    if (a.payload === 'drill') { b.cylinder(0.11, 0.11, 0.3, [0, -0.45, 0.15], steel, 12); b.cylinder(0.02, 0.06, 0.55, [0, -0.85, 0.15], dark, 8); for (let i = 0; i < 5; i++) b.ring(0.055 - i * 0.006, 0.012, [0, -0.66 - i * 0.09, 0.15], steel).rotation.x = Math.PI / 2 + 0.25; }
    else if (a.payload === 'arm') { b.rod([0.2, -0.1, 0.95], [0.3, 0.35, 1.45], 0.04, steel); b.rod([0.3, 0.35, 1.45], [0.25, -0.35, 1.85], 0.03, steel); b.ball([0.06, 0.06, 0.06], [0.3, 0.35, 1.45], dark, 10); for (const k of [-1, 1]) b.rod([0.25, -0.35, 1.85], [0.25 + k * 0.08, -0.55, 1.9], 0.018, dark, 0.006); }
    else if (a.payload === 'mast') { b.rod([-0.2, 0.2, 0.7], [-0.2, 1.25, 0.82], 0.03, steel); b.box([0.34, 0.12, 0.14], [-0.2, 1.3, 0.84], hull); for (const k of [-1, 1]) b.cylinder(0.04, 0.045, 0.06, [-0.2 + k * 0.1, 1.3, 0.93], eye, 10).rotation.x = Math.PI / 2; }
    else if (a.payload === 'antenna') { b.rod([0.3, 0.3, -0.6], [0.34, 0.8, -0.7], 0.02, steel); b.mesh(new THREE.SphereGeometry(0.24, 16, 6, 0, Math.PI * 2, 0, 1.1), foil, [0.36, 1.0, -0.78]).rotation.x = Math.PI + 0.9; b.rod([-0.3, 0.3, -0.65], [-0.36, 1.5, -0.8], 0.01, dark, 0.004); }
    else for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { b.cylinder(0.1, 0.1, 0.34, [side * 0.66, -0.02, -0.42 + i * 0.3], i % 2 ? steel : b.material('#c94f2a'), 10); b.box([0.03, 0.26, 0.04], [side * 0.72, -0.02, -0.42 + i * 0.3], dark); }

    // Parasol on its own stem, so it can fall off a dead machine.
    const span = 1.55 * (a.state === 'crouched' ? 1.12 : 1);
    if (a.shield === 'dish') {
      p.mesh(new THREE.LatheGeometry([[0.02, 0.3], [span * 0.35, 0.26], [span * 0.7, 0.16], [span, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28), mirror);
      p.mesh(new THREE.LatheGeometry([[0.02, 0.27], [span * 0.7, 0.13], [span * 0.98, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 20), foil);
      p.ring(span, 0.025, [0, 0, 0], steel).rotation.x = Math.PI / 2;
    } else if (a.shield === 'hex') {
      p.mesh(new THREE.ConeGeometry(span, 0.34, 6, 1, true), mirror, [0, 0.17, 0]);
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; p.rod([0, 0.34, 0], [Math.sin(t) * span, 0, Math.cos(t) * span], 0.02, steel); }
    } else if (a.shield === 'petals') {
      const missing = mood.wear > 0.6 ? Math.floor(random() * 8) : -1;
      for (let i = 0; i < 8; i++) {
        if (i === missing) continue;
        const t = (i / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.CircleGeometry(0.5, 5).scale(0.62, 1.25, 1).translate(0, 0.72, 0), mirror);
        petal.rotation.set(-Math.PI / 2 - 0.2, 0, 0);
        petal.castShadow = true;
        const hinge = new THREE.Group();
        hinge.rotation.y = t;
        hinge.position.y = 0.25;
        hinge.add(petal);
        p.root.add(hinge);
        p.rod([0, 0.25, 0], [Math.sin(t) * span * 0.8, 0.02, Math.cos(t) * span * 0.8], 0.015, steel);
      }
      p.ball([0.14, 0.1, 0.14], [0, 0.27, 0], steel, 12);
    } else {
      p.box([span * 1.9, 0.04, 0.05], [0, 0.1, span * 0.62], steel); p.box([span * 1.9, 0.04, 0.05], [0, 0.1, -span * 0.62], steel);
      for (let i = 0; i < 7; i++) p.box([span * 1.8, 0.02, 0.26], [0, 0.1, (i - 3) * span * 0.2], mirror).rotation.x = 0.5;
    }
    const stem = a.state === 'crouched' ? 0.5 : 1.25;
    if (dead) {
      b.rod([0, 0.4, -0.1], [0.1, 0.8, -0.2], 0.035, steel);
      const side = random() < 0.5 ? -1 : 1;
      p.root.position.set(side * 2.0, 0.55, -0.5 + random() * 0.8);
      p.root.rotation.set(0.3, random() * 3, side * 1.1);
      s.root.add(p.root);
    } else {
      b.rod([0, 0.4, -0.1], [0, 0.4 + stem, -0.25], 0.035, steel);
      b.ball([0.07, 0.07, 0.07], [0, 0.4 + stem, -0.25], dark, 10);
      p.root.position.set(0, 0.4 + stem, -0.25);
      p.root.rotation.x = -0.32;
      b.root.add(p.root);
    }

    // Legs: two segments each, solved from hip to foot.
    const L1 = 1.0, L2 = 1.3;
    const ride = { striding: 1.15, probing: 1.1, crouched: 0.5, melted: 1.0, dead: 0.33 }[a.state];
    const reach = { striding: 1.35, probing: 1.4, crouched: 1.05, melted: 1.35, dead: 2.55 }[a.state];
    b.root.position.y = ride;
    const meltedLeg = 1 + 2 * Math.floor(random() * 3);
    if (a.state === 'melted') { const side = meltedLeg % 2 ? 1 : -1; b.root.rotation.set(meltedLeg === 1 ? 0.1 : meltedLeg === 5 ? -0.1 : 0, 0, -side * 0.16); }
    if (dead) b.root.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.35);
    const legMaterial = s.material(a.livery === 'scorched' ? '#3a3634' : '#9aa0a4', { metalness: 0.45, roughness: 0.45 });
    const pad = s.material('#d9d2c0', { roughness: 0.9 });
    const unit = new THREE.CylinderGeometry(1, 1, 1, 8);
    const limb = (radius: number, material: THREE.Material) => { const m = new THREE.Mesh(unit, material); m.castShadow = true; m.userData.radius = radius; s.root.add(m); return m; };
    const stretch = (mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) => {
      const d = to.clone().sub(from), length = Math.max(d.length(), 0.001);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.scale.set(mesh.userData.radius, length, mesh.userData.radius);
      mesh.quaternion.setFromUnitVectors(up, d.divideScalar(length));
    };
    const legs = Array.from({ length: 6 }, (_u, i) => {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2) - 1;
      b.ball([0.11, 0.11, 0.11], [side * 0.55, -0.05, row * 0.55], dark, 10);
      const gone = dead && random() < 0.25;
      const leg = {
        side, row, group: (i + Math.floor(i / 2)) % 2, hip: new THREE.Vector3(side * 0.58, -0.05, row * 0.55),
        rest: new THREE.Vector3(side * reach * (1 + (dead ? (random() - 0.5) * 0.3 : 0)), 0, row * (dead ? 1.2 + random() * 0.6 : 0.95) + (dead ? (random() - 0.5) : 0)),
        upper: limb(0.06, legMaterial), lower: limb(0.042, legMaterial), knee: limb(0.085, dark), foot: limb(0.15, pad), melted: a.state === 'melted' && i === meltedLeg,
      };
      if (gone) for (const m of [leg.upper, leg.lower, leg.knee, leg.foot]) m.visible = false;
      return leg;
    });
    const stride = mix(0.35, 0.7, mood.energy);
    const hipWorld = new THREE.Vector3(), footAt = new THREE.Vector3(), knee = new THREE.Vector3(), bend = new THREE.Vector3(), dir = new THREE.Vector3();
    const pose = (phase: number) => {
      b.root.updateMatrixWorld(true);
      for (const leg of legs) {
        hipWorld.copy(leg.hip).applyMatrix4(b.root.matrix);
        footAt.copy(leg.rest);
        if (a.state === 'striding') {
          const u = (phase + leg.group * 0.5) % 1;
          if (u < 0.6) footAt.z += stride * (0.5 - u / 0.6);
          else { const w = (u - 0.6) / 0.4; footAt.z += stride * (w - 0.5); footAt.y = Math.sin(w * Math.PI) * 0.32; }
        } else if (a.state === 'probing' && leg.row === 1 && leg.side === 1) footAt.set(0.75, 0.55, 2.1);
        dir.copy(footAt).sub(hipWorld);
        const dist = Math.min(dir.length(), (L1 + L2) * 0.995);
        dir.normalize();
        const along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), rise = Math.sqrt(Math.max(0, L1 * L1 - along * along));
        bend.set(leg.side * 0.35, 1, 0).addScaledVector(dir, -bend.dot(dir)).normalize();
        knee.copy(hipWorld).addScaledVector(dir, along).addScaledVector(bend, rise);
        footAt.copy(hipWorld).addScaledVector(dir, dist);
        if (leg.melted) { knee.y -= 0.25; footAt.set(knee.x + leg.side * 0.12, knee.y - 0.5, knee.z + 0.05); }
        stretch(leg.upper, hipWorld, knee);
        stretch(leg.lower, knee, footAt);
        leg.knee.position.copy(knee); leg.knee.scale.setScalar(0.085);
        leg.foot.position.set(footAt.x, footAt.y + 0.03, footAt.z); leg.foot.scale.set(0.15, 0.06, 0.15);
      }
    };
    const start = random();
    pose(start);
    for (const leg of legs) if (leg.melted) {
      leg.foot.visible = false;
      const slag = new THREE.MeshStandardMaterial({ color: '#8a8c90', emissive: '#ff5a1a', emissiveIntensity: heat * 0.5, roughness: 0.35, metalness: 0.4 });
      const below = leg.lower.position;
      for (let i = 0; i < 3; i++) s.ball([0.035, 0.12 + i * 0.05, 0.035], [below.x + leg.side * 0.06 + (i - 1) * 0.05, below.y - 0.3 - i * 0.03, below.z + (i - 1) * 0.03], slag, 8);
      const puddle = s.ball([0.42, 0.05, 0.34], [below.x + leg.side * 0.1, 0.02, below.z], slag, 14);
      puddle.rotation.y = random() * 3;
    }
    if (dead) {
      // Ash has drifted against the wreck.
      const ash = s.material('#8a8179', { roughness: 1 });
      for (let i = 0; i < 4; i++) s.ball([0.7 + random() * 0.6, 0.14 + random() * 0.12, 0.5 + random() * 0.4], [(random() - 0.5) * 2.2, 0, (random() - 0.5) * 2], ash, 12);
    }

    const pace = mix(0.25, 1.1, mood.energy);
    const alive = !dead;
    return s.finish({
      footprint: 1.7,
      update: alive ? (_dt, time) => {
        if (a.state === 'striding') {
          b.root.position.y = ride + Math.sin(time * pace * Math.PI * 4) * 0.025;
          pose(start + time * pace);
        }
        if (a.state !== 'crouched') p.root.rotation.z = Math.sin(time * 0.5) * 0.04;
        fin.emissiveIntensity = heat * (1 + Math.sin(time * 1.3) * 0.15);
        eye.emissiveIntensity = Math.sin(time * 0.9) > 0.97 ? 0.2 : 1.6;
      } : undefined,
    });
  },
});

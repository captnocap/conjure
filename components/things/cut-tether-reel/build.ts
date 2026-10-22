import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    ending: choice('How did the tether end?', {
      clean: 'Cut clean: a flat bright end, done with a blade and on purpose.',
      snapped: 'Snapped under load: stretched thin, then a burst of frayed strands.',
      unclipped: 'Unclipped on purpose: the cable is whole and the clip hangs open.',
      burned: 'Burned through: a blackened, melted stub.',
    }),
    colour: choice('What colour is the cable?', {
      yellow: 'Safety yellow.',
      orange: 'Faded rescue orange.',
      white: 'White braid gone grey.',
      red: 'Emergency red.',
      steel: 'Bare braided steel.',
    }),
    reel: choice('What kind of reel is it?', {
      winch: 'A powered winch in a boxy housing with a status light.',
      crank: 'A hand-crank drum on a simple bracket, like a garden hose reel.',
      spool: 'A bare open spool with spoked flanges, torn off its mount.',
    }),
    clipped: choice('Is anything still clipped to the line?', {
      nothing: 'Nothing: an empty clip.',
      glove: 'A single empty glove.',
      wrench: 'A wrench on a lanyard.',
      tag: 'A stamped name tag.',
      clip: 'A second clip, locked onto a torn-off ring of someone else.',
    }),
    tangle: score('How tangled is the loose tether?', ['One clean slow spiral', 'Loose wandering loops', 'A knotted snarl']),
    wound: score('How much cable is still wound on the drum?', ['Nearly all paid out', 'Half a drum', 'Almost full']),
    blinking: noul('If it has a status light, is it still blinking?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const all = new THREE.Group();
    s.root.add(all);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const cableColour = { yellow: '#e8bd24', orange: '#d9742e', white: '#d9d7cf', red: '#c2302c', steel: '#9aa1a8' }[a.colour];
    const cable = s.material(cableColour, a.colour === 'steel' ? { metalness: 0.8, roughness: 0.4 } : { roughness: 0.75 });
    const rust = new THREE.Color('#7a4a2e');
    const painted = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => s.material(new THREE.Color(hex).lerp(rust, mood.wear * 0.4), extra);
    const housing = painted({ winch: '#d6d3c8', crank: '#3f6f8f', spool: '#6d7378' }[a.reel], { roughness: 0.6, metalness: 0.3 });
    const steel = painted('#aab0b6', { metalness: 0.85, roughness: 0.35 });
    const dark = s.material('#22262b', { roughness: 0.6 });

    // Drum: axis along x.
    const FR = 0.26, CR = 0.08, HALF = 0.13;
    const drum = new THREE.Group();
    all.add(drum);
    const across = (mesh: THREE.Mesh) => { mesh.rotation.z = Math.PI / 2; return mesh; };
    across(add(drum, new THREE.CylinderGeometry(CR, CR, HALF * 2, 20), steel));
    for (const side of [-1, 1]) {
      if (a.reel === 'spool') {
        across(add(drum, new THREE.TorusGeometry(FR, 0.014, 8, 40), steel, [side * HALF, 0, 0])).rotation.set(0, Math.PI / 2, 0);
        for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2; drum.add(s.rod([side * HALF, 0, 0], [side * HALF, Math.cos(ang) * FR, Math.sin(ang) * FR], 0.009, steel)); }
        across(add(drum, new THREE.CylinderGeometry(CR * 1.5, CR * 1.5, 0.012, 20), steel, [side * HALF, 0, 0]));
      } else {
        across(add(drum, new THREE.CylinderGeometry(FR, FR, 0.014, 40), a.reel === 'crank' ? painted('#d8d2c2') : steel, [side * HALF, 0, 0]));
        across(add(drum, new THREE.TorusGeometry(FR, 0.011, 8, 40), steel, [side * HALF, 0, 0])).rotation.set(0, Math.PI / 2, 0);
      }
    }
    // Wound cable: stacked turns, thinner as the drum empties.
    const woundR = mix(CR + 0.018, FR - 0.03, a.wound);
    const rows = 8;
    for (let layer = 0; CR + 0.012 + layer * 0.022 <= woundR; layer++)
      for (let i = 0; i < rows; i++) {
        const turn = add(drum, new THREE.TorusGeometry(CR + 0.012 + layer * 0.022, 0.0125, 6, 28), cable, [-HALF + 0.02 + (i + (layer % 2) * 0.5) * ((HALF * 2 - 0.04) / rows), 0, 0]);
        turn.rotation.y = Math.PI / 2;
      }

    // Mount.
    let lamp: THREE.MeshStandardMaterial | null = null;
    if (a.reel === 'winch') {
      add(all, new THREE.BoxGeometry(0.2, 0.5, 0.42), housing, [HALF + 0.115, -0.03, 0]);
      add(all, new THREE.BoxGeometry(0.56, 0.05, 0.5), housing, [0.03, -0.3, 0]);
      add(all, new THREE.BoxGeometry(0.03, 0.5, 0.34), housing, [-HALF - 0.03, -0.05, 0]);
      for (let i = 0; i < 5; i++) add(all, new THREE.BoxGeometry(0.006, 0.012, 0.22), dark, [HALF + 0.217, 0.08 - i * 0.03, 0]);
      add(all, new THREE.BoxGeometry(0.1, 0.07, 0.012), dark, [HALF + 0.12, 0.1, 0.212]);
      const lit = new THREE.Color(mood.cheer > 0.6 ? '#4fe07a' : mood.cheer > 0.3 ? '#ffb23a' : '#ff3b30');
      lamp = new THREE.MeshStandardMaterial({ color: lit, emissive: lit, emissiveIntensity: a.blinking ? 2.4 : 0.05, roughness: 0.4 });
      add(all, new THREE.SphereGeometry(0.02, 12, 8), lamp, [HALF + 0.15, 0.1, 0.22]);
      add(all, new THREE.BoxGeometry(0.16, 0.05, 0.004), painted('#e6b21c'), [HALF + 0.12, -0.06, 0.212]);
      for (let i = 0; i < 4; i++) add(all, new THREE.BoxGeometry(0.02, 0.052, 0.005), dark, [HALF + 0.06 + i * 0.04, -0.06, 0.213]).rotation.z = 0.5;
      // Torn mounting bolts along the base.
      for (const x of [-0.2, 0.26]) for (const z of [-0.2, 0.2]) if (random() > mood.wear * 0.5) add(all, new THREE.CylinderGeometry(0.014, 0.014, 0.05 + random() * 0.04, 8), steel, [x, -0.34, z]);
    } else if (a.reel === 'crank') {
      for (const side of [-1, 1]) {
        add(all, new THREE.BoxGeometry(0.016, 0.38, 0.07), housing, [side * (HALF + 0.03), -0.16, 0]);
        add(all, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), steel, [side * (HALF + 0.03), 0, 0]).rotation.z = Math.PI / 2;
      }
      add(all, new THREE.BoxGeometry(HALF * 2 + 0.2, 0.016, 0.3), housing, [0, -0.35, 0]);
      const handle = new THREE.Group();
      handle.position.set(HALF + 0.05, 0, 0);
      handle.rotation.x = random() * 6;
      all.add(handle);
      add(handle, new THREE.BoxGeometry(0.014, 0.17, 0.03), steel, [0, 0.075, 0]);
      add(handle, new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), dark, [0.055, 0.15, 0]).rotation.z = Math.PI / 2;
    } else {
      // A ripped stub of axle and a twisted scrap of bracket.
      add(all, new THREE.CylinderGeometry(0.022, 0.022, HALF * 2 + 0.16, 10), steel).rotation.z = Math.PI / 2;
      const scrap = add(all, new THREE.BoxGeometry(0.012, 0.2, 0.07), housing, [-HALF - 0.07, -0.08, 0.02]);
      scrap.rotation.set(0.5, 0.2, 0.35);
    }

    // The loose tether: leaves the drum at its top and spirals away.
    const start: V3 = [(random() - 0.5) * 0.1, woundR + 0.01, 0];
    const points: V3[] = [start];
    const turns = mix(2.1, 3.2, a.tangle) + random() * 0.5;
    const steps = 46;
    const phase = random() * 6, wobble = mix(0.01, 0.13, a.tangle);
    const along = new THREE.Vector3(-0.75 + (random() - 0.5) * 0.3, -0.1, 0.65).normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(along).normalize(), v = along.clone().cross(u);
    const reach = mix(0.95, 0.6, a.tangle);
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, ang = k * turns * Math.PI * 2 + Math.PI / 2;
      const r = mix(0.2, 0.3, k) * Math.min(1, k * 5);
      const p = new THREE.Vector3(start[0], start[1] + 0.03, 0.1).addScaledVector(along, k * reach)
        .addScaledVector(v, Math.sin(ang) * r - r * 0.6).addScaledVector(u, Math.cos(ang) * r);
      points.push([p.x + Math.sin(k * 31 + phase) * wobble, p.y + Math.cos(k * 37 + phase) * wobble, p.z + Math.sin(k * 23 + phase * 3) * wobble]);
    }
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    add(all, new THREE.TubeGeometry(curve, 420, 0.019, 7), cable);
    // Banding marks along the line so it reads as rope.
    const band = s.material(a.colour === 'steel' ? '#5c6268' : '#2b2e33', { roughness: 0.8 });
    for (let i = 1; i < 12; i++) {
      const at = curve.getPointAt(i / 12.5), tan = curve.getTangentAt(i / 12.5);
      const mark = add(all, new THREE.CylinderGeometry(0.0205, 0.0205, 0.035, 8), band, at.toArray() as V3);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    }
    const end = curve.getPointAt(1), out = curve.getTangentAt(1);
    const tip = new THREE.Group();
    tip.position.copy(end);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
    all.add(tip);

    const carabiner = (parent: THREE.Object3D, y: number, open: boolean) => {
      const clip = new THREE.Group();
      clip.position.y = y;
      clip.scale.setScalar(1.6);
      parent.add(clip);
      const loop = add(clip, new THREE.TorusGeometry(0.05, 0.011, 8, 24, open ? Math.PI * 1.55 : Math.PI * 2), steel, [0, 0.07, 0]);
      loop.scale.set(0.72, 1.25, 1);
      loop.rotation.z = open ? Math.PI * 0.6 : 0;
      add(clip, new THREE.CylinderGeometry(0.016, 0.016, 0.04, 10), dark, [0, 0.005, 0]);
      if (open) { const gate = add(clip, new THREE.CylinderGeometry(0.007, 0.007, 0.075, 6), steel, [0.05, 0.075, 0]); gate.rotation.z = -0.55; }
      return clip;
    };

    if (a.ending === 'unclipped') {
      const clip = carabiner(tip, 0, a.clipped === 'nothing');
      clip.rotation.y = random() * 3;
    } else if (a.ending === 'clean') {
      add(tip, new THREE.CylinderGeometry(0.021, 0.021, 0.006, 10), s.material('#f0ede4'), [0, 0.001, 0]);
      add(tip, new THREE.CylinderGeometry(0.01, 0.01, 0.009, 8), new THREE.MeshStandardMaterial({ color: '#d98a4a', metalness: 0.9, roughness: 0.3 }), [0, 0.002, 0]);
    } else if (a.ending === 'snapped') {
      const strand = s.material(new THREE.Color(cableColour).lerp(new THREE.Color('#ffffff'), 0.35), { roughness: 0.9 });
      for (let i = 0; i < 11; i++) {
        const tipAt: V3 = [(random() - 0.5) * 0.2, 0.07 + random() * 0.15, (random() - 0.5) * 0.2];
        const mid: V3 = [tipAt[0] * 0.3 + (random() - 0.5) * 0.03, tipAt[1] * 0.5, tipAt[2] * 0.3];
        add(tip, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.01, 0), new THREE.Vector3(...mid), new THREE.Vector3(...tipAt)]), 8, 0.0045, 4), i % 3 ? strand : steel);
      }
    } else {
      const char = s.material('#1b1a19', { roughness: 1 });
      add(tip, new THREE.CylinderGeometry(0.008, 0.021, 0.08, 8), char, [0, 0.03, 0]);
      add(tip, new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: '#3a1d12', emissive: '#ff5a1e', emissiveIntensity: mix(0.3, 1.6, mood.warmth) }), [0, 0.055, 0]);
      const scorch = add(all, new THREE.TubeGeometry(curve, 30, 0.0198, 7), char);
      scorch.geometry.setDrawRange(Math.floor(scorch.geometry.index!.count * 0.9), scorch.geometry.index!.count);
    }

    // Whatever is still on the line: clipped a little way back from the end unless the end clip holds it.
    if (a.clipped !== 'nothing') {
      let holder: THREE.Object3D;
      if (a.ending === 'unclipped') holder = tip;
      else {
        holder = new THREE.Group();
        const u = 0.86;
        holder.position.copy(curve.getPointAt(u));
        holder.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), curve.getTangentAt(u));
        all.add(holder);
        carabiner(holder, -0.01, false).rotation.y = Math.PI / 2;
      }
      const hang = new THREE.Group();
      hang.position.y = 0.2;
      hang.scale.setScalar(1.45);
      hang.rotation.set((random() - 0.5) * 0.8, random() * 3, (random() - 0.5) * 0.8);
      holder.add(hang);
      if (a.clipped === 'glove') {
        const skin = s.material('#e7e4da', { roughness: 0.85 });
        add(hang, new THREE.CylinderGeometry(0.05, 0.058, 0.07, 14), steel, [0, 0.03, 0]);
        add(hang, new THREE.CylinderGeometry(0.052, 0.046, 0.1, 14), skin, [0, 0.11, 0]);
        add(hang, new THREE.SphereGeometry(0.058, 14, 10), skin, [0, 0.19, 0]).scale.set(1, 1.05, 0.6);
        for (let i = 0; i < 4; i++) { const finger = add(hang, new THREE.CapsuleGeometry(0.015, 0.06 + (i === 1 ? 0.012 : 0), 4, 8), skin, [-0.04 + i * 0.027, 0.265, 0.004]); finger.rotation.set(0.25 + random() * 0.5, 0, (i - 1.5) * -0.1); }
        add(hang, new THREE.CapsuleGeometry(0.016, 0.045, 4, 8), skin, [0.068, 0.19, 0.01]).rotation.z = -0.9;
        add(hang, new THREE.BoxGeometry(0.07, 0.02, 0.003), s.material('#c2302c'), [0, 0.11, 0.05]);
      } else if (a.clipped === 'wrench') {
        add(hang, new THREE.CylinderGeometry(0.003, 0.003, 0.1, 5), dark, [0, 0.05, 0]);
        add(hang, new THREE.BoxGeometry(0.04, 0.26, 0.015), steel, [0, 0.23, 0]);
        for (const side of [-1, 1]) { const jaw = add(hang, new THREE.TorusGeometry(0.04, 0.016, 6, 14, Math.PI * 1.45), steel, [0, 0.23 + side * 0.155, 0]); jaw.rotation.z = side > 0 ? Math.PI * 0.78 : -Math.PI * 0.22; }
      } else if (a.clipped === 'tag') {
        const names = ['VANCE', 'OKAFOR', 'LINDQVIST', 'MORI', 'REYES', 'HALE'];
        const plate = s.label(names[Math.floor(random() * names.length)], 0.2, 0.07, [0, 0.07, 0], '#2b2e33', '#c9ccd0');
        hang.add(plate);
        add(hang, new THREE.BoxGeometry(0.21, 0.08, 0.004), steel, [0, 0.07, -0.003]);
        add(hang, new THREE.TorusGeometry(0.014, 0.003, 5, 12), steel, [0, 0.022, 0]);
      } else {
        const other = carabiner(hang, 0, false);
        other.rotation.x = Math.PI / 2;
        const torn = add(hang, new THREE.TorusGeometry(0.045, 0.012, 6, 18, Math.PI * 1.3), s.material('#e7e4da'), [0, 0.15, 0.03]);
        torn.rotation.y = 1.2;
        add(hang, new THREE.BoxGeometry(0.07, 0.09, 0.006), s.material('#e7e4da', { roughness: 0.95 }), [0.03, 0.2, 0.04]).rotation.set(0.3, 0.4, 0.5);
      }
    }

    all.rotation.set(0.25 + (random() - 0.5) * 0.3, 0.5 + (random() - 0.5) * 0.8, 0.3 + (random() - 0.5) * 0.4);
    const rate = mix(0.02, 0.3, mood.energy);
    const axis = new THREE.Vector3(0.3, 1, 0.2).normalize();
    let clock = random() * 3;
    return s.finish({
      update: (dt) => {
        all.rotateOnWorldAxis(axis, dt * rate);
        drum.rotation.x += dt * rate * 0.6;
        clock += dt;
        if (lamp && a.blinking) lamp.emissiveIntensity = clock % mix(2.4, 0.7, mood.energy) < 0.25 ? 3 : 0.12;
      },
    });
  },
});

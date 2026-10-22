import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type P3, coil, glowMaterial, painted, put, roundedBox, tubeThrough, write } from './lib';

const STATES = {
  hung: 'Hanging neatly on its cradle, ready for the next car.',
  dangling: 'Knocked off and swinging by its cord just above the gravel.',
  fallen: 'Lying face down in the gravel at the foot of the post, cord pooled around it.',
  missing: 'Gone: driven off with, leaving a short curl of torn cord.',
} as const;

export default defineThing({
  questions: {
    left: choice('What has become of the left speaker?', STATES),
    right: choice('What has become of the right speaker?', STATES),
    finish: choice('What are the speaker castings finished in?', {
      aluminium: 'Bare cast aluminium gone dull grey.',
      turquoise: 'Chipped turquoise enamel, pure 1957.',
      cream: 'Cream enamel with a red volume knob.',
      red: 'Fire-engine red, repainted every spring.',
      green: 'Hammered army-surplus green.',
    }),
    head: choice('What sits on top of the post?', {
      box: 'Only a plain cast junction box and crossbar.',
      lamp: 'A small mushroom-cap row lamp throwing an amber pool downward.',
      heater: 'A junction box plus a canister in-car heater on its own hose, for winter shows.',
    }),
    plate: choice('What does the plate on the post say?', {
      row: 'A row number.',
      letter: 'A letter-and-number stall code.',
      rules: 'A stern reminder to replace the speaker before driving off.',
      bare: 'Nothing: the plate is gone, leaving two bolt holes.',
    }),
    base: choice('What does the post stand in?', {
      concrete: 'A plain poured concrete footing.',
      curb: 'A whitewashed concrete block with a red-painted top, so bumpers can see it.',
      tyre: 'An old tyre filled with concrete.',
      weeds: 'A hump of gravel with grass and weeds coming up around it.',
    }),
    crackling: noul('Is a speaker still crackling with sound from the film?'),
    left_behind: choice('What was left behind at the post?', {
      nothing: 'Nothing at all.',
      cup: 'A paper soda cup with a straw, set down on the footing and forgotten.',
      scarf: 'A scarf knotted round the post, left by someone who meant to come back.',
      balloon: 'A balloon tied to the crossbar from a birthday carload.',
      flowers: 'A bunch of plastic flowers taped to the post like a small memorial.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = (colour: string, amount = 0.5) => new THREE.Color(colour).lerp(new THREE.Color('#7a4a2e'), mood.wear * amount);
    const steel = s.material(rust('#8d9396', 0.6), { metalness: 0.55, roughness: 0.5 });
    const dark = s.material('#23262a', { roughness: 0.7 });
    const cordMat = s.material('#1b1c1f', { roughness: 0.8 });
    const bodyColour = { aluminium: '#aeb3b4', turquoise: '#3fb5ac', cream: '#ece2c4', red: '#c8312b', green: '#5d7a5a' }[a.finish];
    const casting = s.material(rust(bodyColour, 0.35), { metalness: a.finish === 'aluminium' ? 0.7 : 0.25, roughness: 0.42 });
    const knobMat = s.material(a.finish === 'cream' ? '#c2302a' : '#e9e4d6', { roughness: 0.4 });

    // Everything above the footing leans a little as the place ages.
    const post = put(s.root, new THREE.Group());
    post.rotation.z = (random() - 0.5) * mix(0.01, 0.16, mood.wear);
    post.rotation.x = (random() - 0.5) * mix(0.0, 0.1, mood.wear);
    const top = 1.18;
    const add = <T extends THREE.Object3D>(mesh: T, at: P3 = [0, 0, 0]): T => put(post, mesh, at);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.03, top, 14), steel), [0, top / 2, 0]);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 14), steel), [0, 0.03, 0]);
    // Junction head and crossbar with two cradles.
    add(new THREE.Mesh(roundedBox(0.13, 0.11, 0.1, 0.025), steel), [0, top + 0.03, 0]);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 10), steel), [0, top + 0.02, 0]).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.05), steel), [side * 0.2, top + 0.005, 0.025]);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.008), steel), [side * 0.2, top + 0.02, 0.052]);
    }
    for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8), dark), [(i % 2 ? 1 : -1) * 0.045, top + 0.03 + (i < 2 ? 0.035 : -0.035), 0.051]).rotation.x = Math.PI / 2;

    let lampGlow: THREE.Mesh | null = null;
    if (a.head === 'lamp') {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), steel), [0, top + 0.17, 0]);
      const cap = s.material(rust('#3d6e52', 0.4), { roughness: 0.5, side: THREE.DoubleSide });
      add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), cap), [0, top + 0.2, 0]);
      const glow = mix(1.6, 0.5, Math.abs(mood.daylight - 0.5) < 0.2 ? 1 : 0) * mix(0.7, 1.2, mood.warmth);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb347', emissiveIntensity: glow })), [0, top + 0.22, 0]);
      lampGlow = add(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 20, 1, true), glowMaterial('#ffb84d', 0.16)), [0, top - 0.02, 0]);
    }
    if (a.head === 'heater') {
      const can = s.material(rust('#b7b0a0', 0.5), { metalness: 0.5, roughness: 0.45 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.17, 18), can), [0, top - 0.12, 0.09]).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.005, 18), new THREE.MeshStandardMaterial({ color: '#40160c', emissive: '#ff5a1e', emissiveIntensity: mix(0.3, 1.4, mood.warmth) })), [0, top - 0.12, 0.178]).rotation.x = Math.PI / 2;
      add(tubeThrough([[0, top - 0.01, 0.03], [0, top - 0.02, 0.09], [0, top - 0.06, 0.09]], 0.012, cordMat));
      add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), steel), [0, top - 0.06, 0.09]);
    }

    // Row plate.
    const plateY = 0.86;
    if (a.plate === 'bare') {
      for (const y of [-0.04, 0.04]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.01, 8), dark), [0, plateY + y, 0.03]).rotation.x = Math.PI / 2;
    } else {
      const number = 1 + Math.floor(random() * 24);
      const letter = 'ABCDEFGHJK'[Math.floor(random() * 10)];
      const enamel = mood.cheer > 0.5 ? '#f3ead0' : '#e2dccb', ink = mood.cheer > 0.5 ? '#b3271f' : '#26303a';
      const plate = add(painted(0.17, 0.12, (ctx, w, h) => {
        ctx.fillStyle = enamel; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = ink; ctx.lineWidth = w * 0.03; ctx.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88);
        if (a.plate === 'row') { write(ctx, 'ROW', w / 2, h * 0.27, h * 0.24, ink); write(ctx, String(number), w / 2, h * 0.65, h * 0.5, ink); }
        else if (a.plate === 'letter') write(ctx, `${letter}${number}`, w / 2, h * 0.52, h * 0.62, ink, { max: w * 0.8 });
        else { write(ctx, 'REPLACE', w / 2, h * 0.24, h * 0.2, ink, { max: w * 0.82 }); write(ctx, 'SPEAKER', w / 2, h * 0.5, h * 0.2, ink, { max: w * 0.82 }); write(ctx, 'BEFORE LEAVING', w / 2, h * 0.76, h * 0.14, ink, { max: w * 0.82 }); }
        const stains = Math.round(mood.wear * 26);
        for (let i = 0; i < stains; i++) { ctx.fillStyle = `rgba(122,74,46,${0.15 + random() * 0.4})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, (0.02 + random() * 0.07) * w, 0, 7); ctx.fill(); }
      }, { px: 256 }), [0, plateY, 0.036]);
      plate.rotation.z = (random() - 0.5) * mood.wear * 0.3;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.178, 0.128, 0.006), steel), [0, plateY, 0.031]).rotation.z = plate.rotation.z;
    }

    // One window speaker: rounded casting, slatted grille, volume knob and window hook.
    const speaker = () => {
      const g = new THREE.Group();
      put(g, new THREE.Mesh(roundedBox(0.125, 0.175, 0.075, 0.035), casting));
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 22), dark), [0, 0.022, 0.036]).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const half = Math.sqrt(Math.max(0.0001, 0.045 ** 2 - ((i - 2) * 0.018) ** 2));
        put(g, new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.008, 0.012), casting), [0, 0.022 + (i - 2) * 0.018, 0.04]);
      }
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.016, 14), knobMat), [0, -0.058, 0.044]).rotation.x = Math.PI / 2;
      put(g, tubeThrough([[0, 0.07, -0.03], [0, 0.11, -0.04], [0, 0.115, -0.065], [0, 0.07, -0.07]], 0.006, steel, 6, 5));
      g.scale.setScalar(1.3);
      return g;
    };

    const rings: THREE.Mesh[] = [];
    let crackleDone = false;
    for (const side of [-1, 1] as const) {
      const state = side < 0 ? a.left : a.right;
      const anchor: P3 = [side * 0.07, top + 0.0, 0.0];
      if (state === 'missing') {
        const end: P3 = [side * (0.1 + random() * 0.05), top - 0.2 - random() * 0.12, 0.03];
        add(tubeThrough(coil(anchor, end, 7, 0.013, -0.02), 0.0045, cordMat, 5, 2));
        for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 4), s.material('#c98a4b', { metalness: 0.8 })), [end[0] + (i - 1) * 0.006, end[1] - 0.012, end[2]]).rotation.z = (i - 1) * 0.5;
        continue;
      }
      const unit = speaker();
      let at: P3, parent: THREE.Object3D = post;
      if (state === 'hung') {
        at = [side * 0.2, top - 0.105, 0.08];
        unit.rotation.y = side * 0.25;
        unit.rotation.z = (random() - 0.5) * 0.12;
        add(tubeThrough(coil(anchor, [at[0] + side * 0.03, at[1] - 0.09, at[2] - 0.02], 16, 0.014, 0.3 + random() * 0.12), 0.0045, cordMat, 5, 2));
      } else if (state === 'dangling') {
        at = [side * (0.1 + random() * 0.05), 0.2 + random() * 0.15, 0.06];
        unit.rotation.set(Math.PI, random() * 3, (random() - 0.5) * 0.5);
        add(tubeThrough(coil(anchor, [at[0], at[1] + 0.09, at[2]], 26, 0.009, -0.0), 0.0045, cordMat, 5, 2));
      } else {
        parent = s.root;
        at = [side * (0.26 + random() * 0.12), 0.04, 0.2 + random() * 0.12];
        unit.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.2, 0, random() * 6);
        const mid: P3 = [side * 0.1, 0.03, 0.14];
        put(s.root, tubeThrough([...coil(anchor, [side * 0.05, 0.06, 0.06], 22, 0.011, 0), ...coil(mid, [at[0], 0.03, at[2] - 0.08], 8, 0.012, 0)], 0.0045, cordMat, 5, 2));
      }
      put(parent, unit, at);
      if (a.crackling && !crackleDone && state !== 'fallen') {
        crackleDone = true;
        const hot = new THREE.MeshStandardMaterial({ color: '#2a1b08', emissive: '#ffb23d', emissiveIntensity: 1.5 });
        put(unit, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 16), hot), [0, 0.022, 0.048]).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const ring = put(unit, new THREE.Mesh(new THREE.TorusGeometry(0.05 + i * 0.035, 0.005, 6, 28, Math.PI * 0.7), glowMaterial('#ffc861', 0.75 - i * 0.18)), [0, 0.022, 0.07 + i * 0.04]);
          ring.rotation.z = Math.PI * 0.15;
          ring.castShadow = false;
          rings.push(ring);
        }
      }
    }

    // Footing.
    const concrete = s.material(rust('#b9b5a8', 0.15), { roughness: 0.95 });
    if (a.base === 'concrete') s.cylinder(0.17, 0.2, 0.1, [0, 0.05, 0], concrete, 20);
    if (a.base === 'curb') {
      s.mesh(roundedBox(0.5, 0.2, 0.3, 0.03), s.material('#efece2', { roughness: 0.9 }), [0, 0.1, 0]);
      s.box([0.5, 0.012, 0.3], [0, 0.203, 0], s.material('#c2372e', { roughness: 0.8 }));
    }
    if (a.base === 'tyre') {
      const tyre = s.mesh(new THREE.TorusGeometry(0.21, 0.09, 10, 28), s.material('#1c1d1f', { roughness: 0.95 }), [0, 0.09, 0]);
      tyre.rotation.x = Math.PI / 2;
      s.cylinder(0.2, 0.2, 0.15, [0, 0.075, 0], concrete, 20);
    }
    if (a.base === 'weeds' || mood.wear > 0.6) {
      const hump = s.ball([0.34, 0.07, 0.3], [0, 0, 0], s.material('#9d968a', { roughness: 1 }), 14);
      hump.visible = a.base === 'weeds';
      const blades = Math.round(mix(10, 46, mood.density) * (a.base === 'weeds' ? 1 : 0.5));
      const grass = new THREE.ConeGeometry(0.012, 1, 4);
      grass.translate(0, 0.5, 0);
      const tuft = new THREE.InstancedMesh(grass, s.material(mood.wear > 0.5 ? '#9a9458' : '#5f8f4a', { roughness: 0.9 }), blades);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < blades; i++) {
        const r = 0.1 + random() * 0.24, t = random() * Math.PI * 2;
        e.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
        m.compose(new THREE.Vector3(Math.cos(t) * r, 0.02, Math.sin(t) * r * 0.85), q.setFromEuler(e), new THREE.Vector3(1, 0.1 + random() * 0.28, 1));
        tuft.setMatrixAt(i, m);
      }
      tuft.castShadow = true;
      s.root.add(tuft);
    }

    // What somebody left.
    const baseTop = { concrete: 0.1, curb: 0.21, tyre: 0.15, weeds: 0.06 }[a.base];
    let balloon: THREE.Group | null = null;
    if (a.left_behind === 'cup') {
      const cx = 0.11, cz = 0.09;
      s.cylinder(0.04, 0.03, 0.12, [cx, baseTop + 0.06, cz], s.material('#f1ede2'), 14);
      s.cylinder(0.041, 0.037, 0.03, [cx, baseTop + 0.075, cz], s.material(mood.cheer > 0.5 ? '#d6362c' : '#3566a8'), 14);
      s.cylinder(0.043, 0.043, 0.008, [cx, baseTop + 0.124, cz], s.material('#fbfbf8'), 14);
      s.rod([cx, baseTop + 0.12, cz], [cx + 0.03, baseTop + 0.2, cz + 0.01], 0.004, s.material('#d6362c'));
    }
    if (a.left_behind === 'scarf') {
      const wool = s.material(mood.cheer > 0.5 ? '#d9a13a' : '#7a2f3b', { roughness: 1 });
      add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.02, 8, 18), wool), [0, 0.62, 0]).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3 + random() * 0.12, 0.012), wool), [side * 0.03 + 0.03, 0.46, 0.04]);
        tail.rotation.z = side * 0.12 + 0.1;
      }
    }
    if (a.left_behind === 'balloon') {
      const bob = add(new THREE.Group(), [-0.2, top + 0.02, 0]);
      balloon = bob;
      const colour = ['#e23b4a', '#f2c230', '#3f9be0', '#e86fb0'][Math.floor(random() * 4)];
      const sagging = mood.cheer < 0.35;
      const height = sagging ? -0.75 : 0.55 + random() * 0.2;
      const lean = sagging ? 0.12 : 0.1 + mood.energy * 0.2;
      put(bob, tubeThrough([[0, 0, 0], [lean * 0.4, height * 0.5, 0.01], [lean, height, 0]], 0.0025, s.material('#e8e4da')));
      const skin = put(bob, new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), s.material(colour, { roughness: 0.25 })), [lean, height + (sagging ? -0.1 : 0.15), 0]);
      skin.scale.set(sagging ? 0.7 : 1, sagging ? 0.8 : 1.2, sagging ? 0.7 : 1);
    }
    if (a.left_behind === 'flowers') {
      const stems = s.material('#4f7a45');
      for (let i = 0; i < 6; i++) {
        const angle = -0.5 + i * 0.2 + (random() - 0.5) * 0.1;
        const tipX = Math.sin(angle) * 0.2, tipY = 0.55 + Math.cos(angle) * 0.22;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 5), stems), [tipX / 2, 0.55 + (tipY - 0.55) / 2, 0.04]).rotation.z = -angle;
        const bloom = add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), s.material(['#e9d94a', '#e85d75', '#f2f0e6', '#c56fd0'][i % 4], { roughness: 0.6 })), [tipX, tipY, 0.045]);
        bloom.scale.z = 0.6;
      }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 12), s.material('#cfc9b4', { roughness: 0.6 })), [0, 0.5, 0.01]);
    }

    const speed = mix(0.6, 3.2, mood.energy);
    return s.finish({
      footprint: 0.32,
      update: (_dt, time) => {
        rings.forEach((ring, index) => {
          const phase = (time * speed + index * 0.33) % 1;
          ring.scale.setScalar(0.8 + phase * 0.5);
          (ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.8;
        });
        if (balloon) balloon.rotation.z = Math.sin(time * speed * 0.5) * 0.06;
        if (lampGlow) (lampGlow.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(time * 9) * 0.03 * mood.wear;
      },
    });
  },
});

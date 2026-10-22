import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    load: choice('What lies in the left-hand pan?', {
      empty: 'Nothing: both pans hang empty.',
      powder: 'A small white heap of powder on a watch glass.',
      gold: 'Gold: rough nuggets and a few coins.',
      feather: 'A single white feather.',
      heart: 'A dark red heart.',
      crystals: 'A cluster of blue crystals.',
      letter: 'A folded letter closed with red sealing wax.',
      coins: 'A stack of silver coins.',
    }),
    tilt: choice('How does the beam sit?', {
      level: 'Perfectly level: balanced.',
      nearly: 'Almost level, the left pan a whisker low: one more grain to go.',
      heavy: 'Tipped hard to the left: what is being weighed far outweighs the weights.',
      light: 'Tipped hard to the right: the weights win, the thing weighed found wanting.',
    }),
    housing: choice('How is the balance housed?', {
      bare: 'Bare on its base, open to the air.',
      cased: 'Shut inside a glass case with a wooden frame.',
      open: 'In a glass case with the front sash lifted, someone at work.',
    }),
    style: choice('What kind of balance is it?', {
      laboratory: 'A laboratory balance: polished brass on a mahogany base with a small drawer.',
      jeweller: 'A jeweller\'s balance: gilt on a black marble slab.',
      grocer: 'A shop scale: green-painted cast iron with steel pans.',
    }),
    weights: choice('Where are the spare weights?', {
      block: 'Lined up by size in their wooden block, one or two holes empty.',
      scattered: 'Scattered on the table, some toppled, with the tweezers.',
      none: 'Nowhere to be seen.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cased = a.housing !== 'bare';
    const metalColour = { laboratory: '#c99a38', jeweller: '#d8b04a', grocer: '#b7bcbe' }[a.style];
    const metal = s.material(metalColour, { metalness: 0.85, roughness: mix(0.2, 0.5, mood.wear) });
    const brass = s.material('#c99a38', { metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
    const frame = a.style === 'grocer' ? s.material('#2f6b4a', { roughness: 0.5, metalness: 0.3 }) : metal;
    const baseMat = s.material({ laboratory: '#6a3520', jeweller: '#1e1f23', grocer: '#2f6b4a' }[a.style], { roughness: a.style === 'jeweller' ? 0.25 : 0.55 });
    const wood = s.material('#6a3520', { roughness: 0.55 });

    const bw = cased ? 0.46 : 0.36, bd = cased ? 0.24 : 0.17, bh = a.style === 'laboratory' ? 0.045 : 0.03;
    s.box([bw, bh, bd], [0, bh / 2, 0], baseMat);
    if (a.style === 'laboratory') {
      s.box([bw * 0.42, bh * 0.62, 0.004], [0, bh / 2, bd / 2 + 0.001], s.material('#7d4228', { roughness: 0.5 }));
      s.ball([0.007, 0.007, 0.007], [0, bh / 2, bd / 2 + 0.008], brass, 10);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.01, 0.012, 0.008, [x * (bw / 2 - 0.025), -0.004 + 0.008, z * (bd / 2 - 0.02)], brass, 10).position.y = 0.002;
    } else if (a.style === 'jeweller') s.box([bw + 0.012, 0.006, bd + 0.012], [0, 0.003, 0], metal);

    // Column and index plate.
    const pivotY = bh + 0.3, arm = 0.15;
    s.lathe([[0, 0], [0.03, 0], [0.032, 0.008], [0.018, 0.016], [0.012, 0.03], [0.009, 0.06], [0.0075, 0.25], [0.011, 0.262], [0.008, 0.275], [0.01, 0.288], [0.006, 0.3], [0, 0.3]], frame, [0, bh, 0]);
    s.box([0.07, 0.022, 0.003], [0, bh + 0.15, 0.011], s.material('#efe6cc', { roughness: 0.6 }));
    for (let i = -3; i <= 3; i++) s.box([0.0012, i === 0 ? 0.014 : 0.008, 0.001], [i * 0.009, bh + 0.152, 0.013], s.material('#2a2622'));

    // Beam with its pointer; it turns about the pivot.
    const beam = new THREE.Group();
    beam.position.set(0, pivotY, 0);
    s.root.add(beam);
    const onBeam = <T extends THREE.Object3D>(o: T) => { beam.add(o); return o; };
    onBeam(s.box([arm * 2, 0.012, 0.006], [0, 0, 0], metal));
    for (const side of [-1, 1]) {
      const brace = onBeam(s.box([arm * 0.98, 0.005, 0.005], [side * arm * 0.5, 0.012, 0], metal));
      brace.rotation.z = -side * 0.16;
      onBeam(s.ball([0.007, 0.007, 0.007], [side * arm, 0, 0], metal, 10));
      onBeam(s.ring(0.007, 0.0016, [side * arm, -0.009, 0], metal));
    }
    onBeam(s.cylinder(0.0001, 0.011, 0.02, [0, 0.016, 0], metal, 4));
    onBeam(s.rod([0, 0, 0.009], [0, -0.148, 0.009], 0.0022, s.material('#2a2622', { metalness: 0.5 }), 0.0006));

    // Pans on their chains.
    const drop = 0.2, panR = 0.058;
    const panMat = a.style === 'grocer' ? s.material('#c3c8ca', { metalness: 0.85, roughness: 0.3 }) : metal;
    const hangers = [-1, 1].map(() => {
      const g = new THREE.Group();
      s.root.add(g);
      const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
      add(s.lathe([[0, -drop], [panR * 0.5, -drop], [panR * 0.92, -drop + 0.008], [panR, -drop + 0.016], [panR * 0.96, -drop + 0.0165], [panR * 0.5, -drop + 0.004], [0, -drop + 0.003]], panMat));
      for (let i = 0; i < 3; i++) {
        const t = i * (Math.PI * 2) / 3 + Math.PI / 2;
        add(s.rod([0, -0.016, 0], [Math.cos(t) * panR * 0.97, -drop + 0.016, Math.sin(t) * panR * 0.97], 0.0014, panMat));
      }
      return g;
    });
    const [left, right] = hangers;
    const panY = -drop + 0.005;

    // The thing being weighed.
    const inLeft = <T extends THREE.Object3D>(o: T) => { left.add(o); return o; };
    if (a.load === 'powder') {
      inLeft(s.lathe([[0, 0], [0.03, 0.002], [0.042, 0.008], [0.04, 0.0085], [0, 0.003]], s.material('#e6f2f4', { roughness: 0.1 }), [0, panY, 0]));
      inLeft(s.lathe([[0, 0.022], [0.006, 0.02], [0.018, 0.009], [0.028, 0.002]], s.material('#f6f4ec', { roughness: 1 }), [0, panY + 0.002, 0]));
    } else if (a.load === 'gold') {
      const gold = s.material('#e0b020', { metalness: 0.9, roughness: 0.3 });
      for (let i = 0; i < 6; i++) {
        const k = 0.007 + random() * 0.008;
        const nugget = inLeft(s.mesh(new THREE.DodecahedronGeometry(k, 0), gold, [(random() - 0.5) * 0.05, panY + k * 0.8, (random() - 0.5) * 0.05]));
        nugget.rotation.set(random() * 3, random() * 3, 0); nugget.scale.y = 0.7;
      }
      for (let i = 0; i < 3; i++) inLeft(s.cylinder(0.012, 0.012, 0.002, [0.012 + i * 0.006, panY + 0.004 + i * 0.002, 0.026], gold, 16)).rotation.x = 0.1 * i;
    } else if (a.load === 'feather') {
      const shape = new THREE.Shape();
      shape.moveTo(-0.045, 0); shape.quadraticCurveTo(-0.01, 0.02, 0.04, 0.006); shape.lineTo(0.048, 0); shape.quadraticCurveTo(-0.005, -0.018, -0.045, 0);
      const vane = inLeft(s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.9, side: THREE.DoubleSide }), [0.004, panY + 0.012, 0]));
      vane.rotation.set(-Math.PI / 2 + 0.25, 0, 0.5);
      const quill = inLeft(s.rod([-0.06, 0, 0], [0.048, 0, 0], 0.0011, s.material('#e6dfc8')));
      quill.position.set(0.004, panY + 0.012, 0); quill.rotation.set(0, -0.5, 0);
    } else if (a.load === 'heart') {
      const h = new THREE.Shape();
      h.moveTo(0, -0.03); h.bezierCurveTo(-0.05, 0.004, -0.024, 0.04, 0, 0.016); h.bezierCurveTo(0.024, 0.04, 0.05, 0.004, 0, -0.03);
      const geo = new THREE.ExtrudeGeometry(h, { depth: 0.012, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.009, bevelSegments: 4 });
      geo.translate(0, 0, -0.006);
      const heart = inLeft(s.mesh(geo, s.material('#8e1420', { roughness: 0.35, emissive: '#3a0508', emissiveIntensity: 0.3 }), [0, panY + 0.04, 0]));
      heart.rotation.set(-0.35, 0.3, 0.12);
    } else if (a.load === 'crystals') {
      const blue = s.material('#3f9ae6', { roughness: 0.15, emissive: '#0f3f86', emissiveIntensity: 0.25 });
      for (let i = 0; i < 7; i++) {
        const c = inLeft(s.cylinder(0.0001, 0.006 + random() * 0.005, 0.018 + random() * 0.024, [(random() - 0.5) * 0.045, panY + 0.012, (random() - 0.5) * 0.045], blue, 5));
        c.rotation.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9);
      }
    } else if (a.load === 'letter') {
      const letter = inLeft(s.box([0.085, 0.004, 0.055], [0, panY + 0.012, 0], s.material('#efe6cc', { roughness: 0.9 })));
      letter.rotation.set(0.08, 0.5, 0.05);
      inLeft(s.cylinder(0.009, 0.01, 0.003, [0, panY + 0.016, 0], s.material('#a81c22', { roughness: 0.4 }), 12));
    } else if (a.load === 'coins') {
      const silver = s.material('#c9ccd0', { metalness: 0.9, roughness: 0.3 });
      const stack = 5 + Math.floor(random() * 5);
      for (let i = 0; i < stack; i++) inLeft(s.cylinder(0.013, 0.013, 0.0024, [(random() - 0.5) * 0.003 - 0.008, panY + 0.003 + i * 0.0025, (random() - 0.5) * 0.003], silver, 16));
      inLeft(s.cylinder(0.013, 0.013, 0.0024, [0.026, panY + 0.004, 0.012], silver, 16)).rotation.z = 0.12;
    }

    // Weights: a lathe-turned brass cylinder with a knob.
    const weight = (r: number): THREE.Mesh => s.lathe([[0, 0], [r, 0], [r, r * 1.5], [r * 0.5, r * 1.7], [r * 0.34, r * 1.95], [r * 0.56, r * 2.2], [r * 0.5, r * 2.5], [0, r * 2.6]], brass);
    const sizes = [0.019, 0.016, 0.0135, 0.0115, 0.0095, 0.008, 0.0065];
    const loaded = a.load !== 'empty';
    const inPan = !loaded ? (a.tilt === 'light' ? 2 : 0) : { level: 3, nearly: 3, heavy: 1, light: 5 }[a.tilt];
    for (let i = 0; i < inPan; i++) {
      const w = weight(sizes[Math.min(sizes.length - 1, i + (a.tilt === 'light' ? 0 : 2))]);
      const t = i * 2.2 + random(), r = i === 0 ? 0 : 0.026;
      w.position.set(Math.cos(t) * r, panY + 0.001, Math.sin(t) * r);
      right.add(w);
    }

    const z0 = bd / 2 + 0.05;
    if (a.weights === 'block') {
      s.box([0.22, 0.02, 0.045], [0, 0.01, z0], wood).rotation.y = 0;
      let x = -0.094;
      sizes.forEach((r, i) => {
        x += r + 0.006;
        const gone = i >= 2 && i < 2 + Math.min(inPan, 3);
        if (gone) s.cylinder(r + 0.001, r + 0.001, 0.002, [x, 0.0195, z0], s.material('#2a140c'), 14);
        else weight(r).position.set(x, 0.016, z0);
        x += r + 0.006;
      });
    } else if (a.weights === 'scattered') {
      sizes.slice(1).forEach((r, i) => {
        const w = weight(r);
        const x = -0.14 + i * 0.05 + (random() - 0.5) * 0.03, z = z0 + (random() - 0.5) * 0.06;
        if (random() < 0.4) { w.rotation.z = Math.PI / 2; w.rotation.y = random() * 3; w.position.set(x, r, z); } else w.position.set(x, 0, z);
      });
      const steel = s.material('#b9bec1', { metalness: 0.85, roughness: 0.3 });
      for (const k of [-1, 1]) s.rod([0.13, 0.003, z0 + 0.02], [0.2, 0.003 + (k > 0 ? 0.004 : 0), z0 - 0.02 + k * 0.004], 0.0016, steel);
    }

    // Glass case.
    if (cased) {
      const cw = bw - 0.02, cd = bd - 0.02, ch = 0.44, t = 0.012;
      const pane = new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.13, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([t, ch, t], [x * (cw / 2 - t / 2), bh + ch / 2, z * (cd / 2 - t / 2)], wood);
      for (const z of [-1, 1]) s.box([cw, t, t], [0, bh + ch - t / 2, z * (cd / 2 - t / 2)], wood);
      for (const x of [-1, 1]) s.box([t, t, cd], [x * (cw / 2 - t / 2), bh + ch - t / 2, 0], wood);
      s.box([cw - t, 0.002, cd - t], [0, bh + ch - 0.004, 0], pane);
      s.box([cw, ch, 0.002], [0, bh + ch / 2, -cd / 2 + 0.004], pane);
      for (const x of [-1, 1]) s.box([0.002, ch, cd], [x * (cw / 2 - 0.004), bh + ch / 2, 0], pane);
      const lifted = a.housing === 'open' ? ch * 0.55 : 0;
      s.box([cw - t * 2, ch - lifted, 0.002], [0, bh + lifted + (ch - lifted) / 2, cd / 2 - 0.004], pane);
      s.box([cw - t * 2, t, t * 0.8], [0, bh + lifted + t / 2, cd / 2 - 0.004], wood);
      s.ball([0.006, 0.006, 0.006], [0, bh + lifted + t / 2, cd / 2 + 0.006], brass, 10);
    }

    const theta0 = { level: 0, nearly: 0.05, heavy: 0.3, light: -0.3 }[a.tilt];
    const pose = (theta: number) => {
      beam.rotation.z = theta;
      left.position.set(-arm * Math.cos(theta), pivotY - 0.009 + -arm * Math.sin(theta), 0);
      right.position.set(arm * Math.cos(theta), pivotY - 0.009 + arm * Math.sin(theta), 0);
    };
    pose(theta0);
    left.rotation.y = random() * 0.6; right.rotation.y = random() * 0.6;
    const sway = (a.tilt === 'level' || a.tilt === 'nearly' ? 0.035 : 0.008) * mix(0.1, 1, mood.energy) * (cased && a.housing === 'cased' ? 0.3 : 1);
    const thing = s.finish({ update: (_dt, time) => pose(theta0 + Math.sin(time * 1.7) * sway) });
    return thing;
  },
});

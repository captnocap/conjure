import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Block, HALF_GAUGE, RAIL_TOP, blocks, canvasTexture, snowOf, track, weeds } from './rail';

const COLOURS = {
  red: 'Signal red: this road is set against you.',
  yellow: 'Chrome yellow, a yard switch that asks for caution.',
  green: 'Green, the main line and a clear road.',
  white: 'Plain white, an old company habit.',
  blue: 'Blue, the colour hung on track where men are working.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { red: '#c8281f', yellow: '#e2b21c', green: '#2f8a4c', white: '#eceae0', blue: '#2a5fae' };

export default defineThing({
  questions: {
    stand: choice('What kind of stand is it?', {
      column: 'A tall iron column stand: the target rides high on a mast, the handle swings low at its foot.',
      ball: 'A low ground throw with a heavy cast-iron ball on the lever arm.',
      drum: 'A stout continental stand: a half-white counterweight drum and a boxed arrow lantern.',
    }),
    target: choice('What shape is the painted target?', {
      disc: 'A round disc.',
      arrow: 'A fishtailed arrow blade pointing down the track.',
      diamond: 'A diamond standing on its point.',
      oval: 'A tall oval paddle.',
      square: 'A square board with a white border.',
    }),
    colour: choice('What colour is the target?', COLOURS),
    lantern: choice('What is the lantern doing?', {
      none: 'There is no lantern, only the painted target.',
      dark: 'An oil lantern sits on top, unlit, its lenses sooty.',
      amber: 'Lit, burning a steady kerosene amber.',
      red: 'Lit and showing red.',
      green: 'Lit and showing green.',
    }),
    position: choice('Which way are the points set?', {
      normal: 'Normal: lever laid over toward the left, target face-on, the straight road.',
      thrown: 'Thrown: lever heaved over to the right, target turned edge-on, the diverging road.',
      halfway: 'Left halfway, the lever standing upright mid-throw and the blades gaping.',
    }),
    lock: choice('Is it locked?', {
      free: 'Free: anyone could throw it.',
      padlocked: 'A fat brass padlock holds the lever in its latch.',
      chained: 'Wrapped in chain with a red out-of-service tag.',
      cut: 'The lock has been cut and lies on the timbers.',
    }),
    left: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      oilcan: 'A long-spouted oil can and a rag.',
      broom: 'A points broom and a shovel leaned against the stand, for clearing snow from the blades.',
      pail: 'A lunch pail and a flask on the head timbers.',
      heater: 'Small flames of a points heater burning along the blades to keep them from freezing.',
      flag: 'A red flag on a stick jammed upright in the ballast.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const length = 3.3;
    track(s, { length });

    const iron = s.material('#2b2c2e', { roughness: 0.7, metalness: 0.35 });
    const cast = s.material(new THREE.Color('#3a3d40').lerp(new THREE.Color('#6d4630'), mood.wear * 0.6), { roughness: 0.8, metalness: 0.2 });
    const white = s.material('#e9e6da');
    const SZ = 2.15; // where the stand sits, out beyond the sleeper ends

    // Head timbers, throw rod, stretcher bar and the two point blades.
    const throwSign = a.position === 'normal' ? -1 : a.position === 'thrown' ? 1 : 0;
    const parts: Block[] = [];
    for (const x of [-0.33, 0.33]) parts.push({ size: [0.27, 0.15, 2.5], at: [x - 0.6, 0.25, 1.95], color: '#46382c' });
    const shift = throwSign * 0.055;
    parts.push({ size: [0.05, 0.03, 1.7], at: [-0.6, 0.345, shift], color: '#2b2c2e' });
    parts.push({ size: [0.05, 0.05, SZ - 0.6], at: [-0.6, 0.36, (SZ + 0.75) / 2 + shift], color: '#2b2c2e' });
    for (const side of [-1, 1]) {
      const toe = side * (HALF_GAUGE - 0.11) + shift, heel = side * (HALF_GAUGE - 0.16);
      const run = length / 2 + 0.75;
      parts.push({ size: [Math.hypot(run, heel - toe), 0.13, 0.045], at: [-0.75 + run / 2, 0.39, (toe + heel) / 2], rot: [0, -Math.atan2(heel - toe, run), 0], color: mood.wear > 0.6 ? '#74492f' : '#8f9296' });
    }
    blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, metalness: 0.2 }), parts);

    // The stand itself, built in a group so age can lean it.
    const stand = new Sculpture(context);
    stand.root.position.set(-0.6, 0.325, SZ);
    stand.root.scale.setScalar(1.4);
    stand.root.rotation.z = (random() - 0.5) * mood.wear * 0.16;
    stand.root.rotation.x = (random() - 0.5) * mood.wear * 0.12;
    s.root.add(stand.root);
    stand.box([0.5, 0.1, 0.62], [0, 0.05, 0], cast);
    for (const x of [-0.19, 0.19]) for (const z of [-0.25, 0.25]) stand.cylinder(0.035, 0.035, 0.05, [x, 0.12, z], iron, 6);

    const mastTop = { column: 1.95, ball: 1.3, drum: 1.15 }[a.stand];
    const leverAngle = throwSign * (a.stand === 'column' ? 1.32 : 0.95); // from vertical, in the x-y plane
    const lever = new THREE.Group();
    stand.root.add(lever);
    const addToLever = (mesh: THREE.Mesh) => { lever.add(mesh); return mesh; };

    if (a.stand === 'column') {
      stand.lathe([[0.22, 0.1], [0.18, 0.18], [0.11, 0.3], [0.09, 0.55], [0.065, 0.62], [0.055, mastTop]], cast);
      lever.position.set(0, 0.32, 0.18);
      addToLever(stand.rod([0, 0, 0], [0, 1.0, 0], 0.04, iron));
      addToLever(stand.ring(0.07, 0.02, [0, 1.07, 0], iron));
      addToLever(stand.box([0.12, 0.2, 0.1], [0, 0.42, 0], white));
      stand.box([0.9, 0.05, 0.08], [0, 0.26, 0.26], cast);
      for (const x of [-0.42, 0.42]) stand.box([0.06, 0.16, 0.1], [x, 0.3, 0.26], cast);
    } else if (a.stand === 'ball') {
      stand.box([0.3, 0.3, 0.34], [0, 0.25, 0], cast);
      stand.cylinder(0.05, 0.06, mastTop - 0.4, [0, 0.4 + (mastTop - 0.4) / 2, -0.1], cast, 10);
      lever.position.set(0, 0.36, 0.2);
      addToLever(stand.rod([0, 0, 0], [0, 0.95, 0], 0.042, iron));
      addToLever(stand.ball([0.19, 0.19, 0.19], [0, 0.62, 0], white, 16));
      addToLever(stand.cylinder(0.035, 0.035, 0.2, [0, 1.02, 0], s.material('#7b5a3a'), 8));
    } else {
      stand.box([0.26, 0.9, 0.26], [0, 0.55, 0], cast);
      stand.box([0.34, 0.06, 0.34], [0, 1.0, 0], cast);
      lever.position.set(0, 0.4, 0.2);
      addToLever(stand.rod([0, 0, 0], [0, 1.05, 0], 0.042, iron));
      const drumTexture = canvasTexture(64, 64, (ctx) => { ctx.fillStyle = '#ebe8dd'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#19191b'; ctx.fillRect(0, 0, 32, 64); });
      const drum = addToLever(stand.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), new THREE.MeshStandardMaterial({ map: drumTexture, roughness: 0.7 }), [0, 0.6, 0]));
      drum.rotation.x = Math.PI / 2;
      addToLever(stand.cylinder(0.035, 0.035, 0.22, [0, 1.12, 0], s.material('#7b5a3a'), 8));
    }
    lever.rotation.z = -leverAngle;

    // Target: a main blade and a smaller white cross blade, turned a quarter when thrown.
    const shape = new THREE.Shape();
    const R = a.stand === 'column' ? 0.33 : 0.28;
    if (a.target === 'disc') shape.absarc(0, 0, R, 0, Math.PI * 2);
    else if (a.target === 'oval') shape.absellipse(0, 0, R * 0.62, R * 1.25, 0, Math.PI * 2);
    else if (a.target === 'diamond') shape.setFromPoints([[0, R * 1.3], [R * 1.1, 0], [0, -R * 1.3], [-R * 1.1, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    else if (a.target === 'square') shape.setFromPoints([[-R, -R], [R, -R], [R, R], [-R, R]].map(([x, y]) => new THREE.Vector2(x, y)));
    else shape.setFromPoints([[-R * 1.7, R * 0.5], [R * 0.7, R * 0.5], [R * 0.7, R * 0.95], [R * 1.8, 0], [R * 0.7, -R * 0.95], [R * 0.7, -R * 0.5], [-R * 1.7, -R * 0.5], [-R * 1.15, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const faded = new THREE.Color(HEX[a.colour]).lerp(new THREE.Color('#b9a79a'), mood.wear * 0.45);
    const targetPaint = new THREE.MeshStandardMaterial({ color: faded, roughness: 0.6, side: THREE.DoubleSide });
    const head = new THREE.Group();
    const targetY = mastTop - (a.stand === 'drum' ? -0.5 : 0.38);
    head.position.set(0, targetY, a.stand === 'ball' ? -0.1 : 0);
    stand.root.add(head);
    const main = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: false }), targetPaint);
    main.position.z = -0.008;
    main.castShadow = true;
    head.add(main);
    if (a.target === 'square' || a.target === 'disc') {
      const rim = new THREE.Mesh(a.target === 'disc' ? new THREE.RingGeometry(R * 0.72, R * 0.86, 28) : new THREE.RingGeometry(R * 0.85, R * 1.1, 4, 1, Math.PI / 4), new THREE.MeshStandardMaterial({ color: '#f2efe4', side: THREE.DoubleSide }));
      rim.position.z = 0.012;
      const back = rim.clone();
      back.position.z = -0.012;
      head.add(rim, back);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.014, R * 0.9, R * 1.5), new THREE.MeshStandardMaterial({ color: a.colour === 'white' ? '#c8281f' : '#eceae0', roughness: 0.6 }));
    cross.castShadow = true;
    head.add(cross);
    if (a.stand === 'drum') stand.rod([0, 1.4, 0], [0, targetY - R, 0], 0.025, cast);
    head.rotation.y = throwSign > 0 ? Math.PI / 2 : throwSign === 0 ? Math.PI / 4 : 0;

    // Lantern.
    let glow: THREE.MeshStandardMaterial | null = null;
    const lanternY = a.stand === 'drum' ? 1.03 : mastTop;
    if (a.stand === 'drum') {
      const lit = a.lantern !== 'none' && a.lantern !== 'dark';
      const tint = a.lantern === 'red' ? '#ff5a48' : a.lantern === 'green' ? '#7dffa6' : a.lantern === 'amber' ? '#ffd27a' : '#f1eee4';
      const face = canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = '#141416'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = tint;
        ctx.save(); ctx.translate(64, 64); ctx.rotate(throwSign > 0 ? -0.75 : 0);
        ctx.fillRect(-14, -44, 28, 88);
        if (throwSign > 0) { ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(0, -62); ctx.lineTo(30, -30); ctx.fill(); }
        ctx.restore();
      });
      glow = new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: '#ffffff', emissiveIntensity: lit ? 1.1 : 0, roughness: 0.6 });
      stand.box([0.36, 0.36, 0.36], [0, lanternY + 0.2, 0], glow);
      stand.mesh(new THREE.ConeGeometry(0.3, 0.14, 4), iron, [0, lanternY + 0.45, 0]).rotation.y = Math.PI / 4;
      stand.cylinder(0.05, 0.06, 0.12, [0, lanternY + 0.55, 0], iron, 8);
    } else if (a.lantern !== 'none') {
      const lit = a.lantern !== 'dark';
      const tint = a.lantern === 'red' ? '#ff3a28' : a.lantern === 'green' ? '#35e078' : a.lantern === 'amber' ? '#ffb53a' : '#4a4338';
      glow = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: lit ? 1.8 : 0, roughness: 0.3 });
      stand.cylinder(0.1, 0.12, 0.24, [head.position.x, lanternY + 0.14, head.position.z], iron, 12);
      for (const [x, z] of [[0.11, 0], [-0.11, 0], [0, 0.11], [0, -0.11]]) stand.ball([0.07, 0.07, 0.04 + Math.abs(x) * 0.3], [head.position.x + x, lanternY + 0.14, head.position.z + z], glow, 12).rotation.y = x ? Math.PI / 2 : 0;
      stand.mesh(new THREE.ConeGeometry(0.13, 0.1, 12), iron, [head.position.x, lanternY + 0.31, head.position.z]);
      stand.ring(0.06, 0.012, [head.position.x, lanternY + 0.4, head.position.z], iron);
    }

    // Lock.
    const brass = s.material('#c9a23a', { metalness: 0.6, roughness: 0.4 });
    if (a.lock === 'padlocked' || a.lock === 'cut') {
      const cut = a.lock === 'cut';
      const at: [number, number, number] = cut ? [0.45, 0.07, 0.1] : [throwSign * 0.38, 0.34, 0.33];
      const bodyMesh = stand.box([0.13, 0.11, 0.05], at, brass);
      const shackle = stand.ring(0.045, 0.014, [at[0], at[1] + 0.07, at[2]], iron, cut ? Math.PI * 1.4 : Math.PI * 2);
      if (cut) { bodyMesh.rotation.set(Math.PI / 2, 0, 0.6); shackle.rotation.x = Math.PI / 2; shackle.position.set(at[0] + 0.15, 0.06, at[2] + 0.05); }
    } else if (a.lock === 'chained') {
      for (let i = 0; i < 12; i++) {
        const t = i / 11, angle = t * Math.PI * 3;
        stand.ring(0.045, 0.014, [Math.cos(angle) * 0.2, 0.3 + t * 0.55, Math.sin(angle) * 0.22 + 0.08], iron).rotation.set(angle, i % 2 ? Math.PI / 2 : 0, 0);
      }
      const tag = stand.label('OUT OF SERVICE', 0.5, 0.2, [0.02, 0.72, 0.36], '#ffffff', '#c22a20');
      tag.rotation.z = -0.12;
      stand.box([0.13, 0.11, 0.05], [0.24, 0.5, 0.3], brass);
    }

    // What somebody left.
    const flames: THREE.Mesh[] = [];
    if (a.left === 'oilcan') {
      const tin = s.material('#8f3b2a', { metalness: 0.3 });
      s.cylinder(0.02, 0.11, 0.2, [0.25, 0.43, SZ + 0.25], tin, 14);
      s.cylinder(0.11, 0.11, 0.1, [0.25, 0.37, SZ + 0.25], tin, 14);
      s.rod([0.25, 0.5, SZ + 0.25], [0.6, 0.72, SZ + 0.3], 0.012, tin, 0.006);
      s.box([0.26, 0.03, 0.2], [0.0, 0.335, SZ + 0.55], s.material('#b9b0a0')).rotation.y = 0.5;
    } else if (a.left === 'broom') {
      s.rod([0.35, 0.05, SZ - 0.3], [-0.3, 1.5, SZ - 0.1], 0.022, s.material('#9a7a4c'));
      s.box([0.34, 0.2, 0.1], [0.4, 0.12, SZ - 0.32], s.material('#b89a52')).rotation.z = 0.4;
      s.rod([0.75, 0.04, SZ + 0.4], [0.1, 1.25, SZ + 0.15], 0.022, s.material('#9a7a4c'));
      s.box([0.26, 0.34, 0.03], [0.8, 0.14, SZ + 0.42], iron).rotation.z = 0.5;
      s.ball([0.5, 0.22, 0.45], [1.0, 0.05, SZ - 0.2], s.material('#f1f4f6'), 12);
    } else if (a.left === 'pail') {
      const tinPail = s.material('#8e979b', { metalness: 0.5, roughness: 0.4 });
      s.box([0.3, 0.16, 0.18], [-0.95, 0.41, SZ + 0.6], tinPail);
      const lid = s.cylinder(0.09, 0.09, 0.3, [-0.95, 0.5, SZ + 0.6], tinPail, 12);
      lid.rotation.z = Math.PI / 2;
      s.ring(0.1, 0.01, [-0.95, 0.58, SZ + 0.6], iron, Math.PI);
      s.cylinder(0.05, 0.055, 0.3, [-0.55, 0.48, SZ + 0.75], s.material('#3d6b4f'), 12);
      s.cylinder(0.04, 0.05, 0.06, [-0.55, 0.66, SZ + 0.75], tinPail, 12);
    } else if (a.left === 'heater') {
      const fire = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 2.2 });
      const blue = new THREE.MeshStandardMaterial({ color: '#8fc4ff', emissive: '#3f8dff', emissiveIntensity: 1.6 });
      for (const side of [-1, 1]) {
        s.box([2.0, 0.05, 0.06], [0.3, 0.3, side * (HALF_GAUGE + 0.12)], iron);
        for (let i = 0; i < 7; i++) {
          const x = -0.6 + i * 0.3 + (random() - 0.5) * 0.08;
          flames.push(s.mesh(new THREE.ConeGeometry(0.08, mix(0.25, 0.5, random()), 6), fire, [x, 0.5, side * (HALF_GAUGE - 0.07)]));
          s.mesh(new THREE.ConeGeometry(0.05, 0.07, 6), blue, [x, 0.34, side * (HALF_GAUGE - 0.07)]);
        }
      }
    } else if (a.left === 'flag') {
      s.rod([1.2, 0.1, SZ - 0.5], [1.28, 1.5, SZ - 0.46], 0.016, s.material('#b89a6c'));
      const cloth = s.mesh(new THREE.PlaneGeometry(0.5, 0.4, 6, 1), new THREE.MeshStandardMaterial({ color: '#d02a22', side: THREE.DoubleSide, roughness: 0.9 }), [1.53, 1.28, SZ - 0.46]);
      const p = cloth.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.05);
      cloth.geometry.computeVertexNormals();
    }

    if (snow > 0.35) {
      const caps = new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 });
      s.box([1.0, 0.05 + snow * 0.05, 1.5], [-0.6, 0.345, 2.3], caps);
      if (a.stand !== 'drum' && a.lantern === 'none') stand.ball([0.07, 0.04, 0.07], [0, mastTop + 0.02, head.position.z], caps, 8);
    }
    if (mood.wear > 0.45) weeds(s, Array.from({ length: Math.round(mood.wear * 14) }, () => ({ at: [(random() - 0.5) * 3, 0.05, mix(1.7, 2.9, random())] as const, size: mix(0.25, 0.7, random()) })));

    const flicker = mix(3, 14, mood.energy);
    const lit = glow !== null && glow.emissiveIntensity > 0;
    const baseGlow = glow?.emissiveIntensity ?? 0;
    return s.finish({
      update: (_dt, time) => {
        if (glow && lit) glow.emissiveIntensity = baseGlow * (0.85 + Math.sin(time * flicker) * 0.1 + Math.sin(time * flicker * 2.7) * 0.05);
        flames.forEach((flame, i) => { flame.scale.y = 0.8 + Math.sin(time * flicker + i * 1.7) * 0.3; });
      },
    });
  },
});

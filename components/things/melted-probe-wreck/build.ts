import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const FINISH = {
  foil: { say: 'Gold foil blanket, wrinkled and blackened at the edges.', hull: '#d0a03a', trim: '#8a8f94' },
  white: { say: 'White thermal paint, blistered and yellowing.', hull: '#e6e2d6', trim: '#70777d' },
  steel: { say: 'Bare brushed steel and titanium.', hull: '#9aa1a8', trim: '#5c6268' },
  olive: { say: 'Drab olive enamel from an older, heavier age of probes.', hull: '#6f7550', trim: '#b9b4a2' },
  orange: { say: 'High-visibility orange, meant to be found.', hull: '#e2702a', trim: '#3d4045' },
} as const;

export default defineThing({
  questions: {
    melt: score('How far gone is it?', ['Blistered but upright', 'Sagging at the edges', 'Slumped like a spent candle', 'Barely a puddle with shapes in it']),
    craft: choice('What kind of lander was it?', {
      drum: 'A squat drum on three legs with a wide ring around its waist.',
      box: 'A boxy bus with solar panel wings on four legs.',
      sphere: 'An armoured sphere on a crush ring, built for crushing heat.',
      tower: 'A tall thin tripod with a small body held high.',
    }),
    finish: choice('What was it finished in?', Object.fromEntries(Object.entries(FINISH).map(([k, v]) => [k, v.say])) as Record<keyof typeof FINISH, string>),
    dish: choice('What has become of its antenna dish?', {
      wilted: 'Drooped over one side like a wilted flower.',
      defiant: 'Somehow still upright and aimed at the sky.',
      folded: 'Collapsed face-down onto the body.',
      fallen: 'Fallen off and lying beside it.',
    }),
    signal: choice('Is it still transmitting?', {
      silent: 'No. It is silent.',
      beacon: 'A single red light still blinks, slowly.',
      sending: 'Yes: rings of signal still pulse out from the dish.',
      sparking: 'Only sparks and static from a torn cable.',
    }),
    gaze: choice('Where is its one intact lens looking?', {
      horizon: 'Straight ahead at the horizon, still on watch.',
      down: 'Down at its own melted feet.',
      up: 'Up at the sky, toward home.',
      viewer: 'Turned to look at whoever has come.',
    }),
    mark: choice('What survives on its hull?', {
      nothing: 'Nothing legible.',
      plaque: 'A name plate, still readable.',
      flag: 'A scorched painted flag of stripes.',
      disc: 'A small golden disc of messages.',
    }),
    ground: choice('What has the run-off metal done around it?', {
      puddle: 'A wide mirror puddle of resolidified metal.',
      glowing: 'A puddle still glowing at the edges.',
      ash: 'It is half drifted over with pale ash.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const m = clamp01(mix(0.1, 1, a.melt) + (mood.wear - 0.5) * 0.14);
    const seed = random() * 30;
    const leanAngle = random() * Math.PI * 2, leanX = Math.cos(leanAngle), leanZ = Math.sin(leanAngle);
    const finish = FINISH[a.finish];
    const gloss = mix(0.5, 0.25, m);
    const hull = s.material(finish.hull, { roughness: gloss, metalness: a.finish === 'white' || a.finish === 'olive' || a.finish === 'orange' ? 0.1 : 0.45 });
    const trim = s.material(finish.trim, { roughness: 0.45, metalness: 0.4 });
    const dark = s.material('#2c2d31', { roughness: 0.6 });
    const panel = s.material('#27365e', { roughness: 0.3, metalness: 0.3 });
    const white = s.material('#e8e6de', { roughness: 0.4, side: THREE.DoubleSide });

    /** Wax physics: squash, spread at the foot, lean, and droop with distance from the core. */
    const melt = (v: THREE.Vector3) => {
      const n = 0.5 + 0.5 * Math.sin(v.x * 2.1 + seed) * Math.cos(v.z * 1.7 + seed * 1.3);
      const d = Math.hypot(v.x, v.z);
      const squash = Math.pow(m, 1.25) * (0.42 + 0.42 * n);
      const y0 = v.y;
      let y = y0 * (1 - squash) - m * 0.3 * Math.pow(Math.max(0, d - 0.7), 1.4) * Math.min(1, y0);
      const spread = 1 + m * 0.5 * Math.pow(Math.max(0, 1 - y0 / 1.1), 2);
      v.x = v.x * spread + leanX * m * 0.22 * y0;
      v.z = v.z * spread + leanZ * m * 0.22 * y0;
      y = Math.max(y, 0.015 + 0.03 * n * (y0 > 0.1 ? 1 : 0));
      v.y = y;
      return v;
    };
    const soften = (mesh: THREE.Mesh) => {
      mesh.updateMatrix();
      const g = mesh.geometry;
      g.applyMatrix4(mesh.matrix);
      mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1);
      const p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { melt(v.fromBufferAttribute(p, i)); p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals();
      return mesh;
    };
    const at = (x: number, y: number, z: number) => melt(new THREE.Vector3(x, y, z));

    // Body.
    const legs = a.craft === 'box' ? 4 : 3;
    let top = 1.6, waist = 0.9, deck = 0.8;
    if (a.craft === 'drum') {
      s.mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.85, 24, 8), hull, [0, 1.15, 0]);
      s.mesh(new THREE.TorusGeometry(1.28, 0.09, 8, 40), trim, [0, 1.05, 0]).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; s.rod([Math.cos(t) * 0.95, 1.05, Math.sin(t) * 0.95], [Math.cos(t) * 1.25, 1.05, Math.sin(t) * 1.25], 0.025, trim); }
      s.mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4, 3, 3, 3), trim, [0.3, 1.72, 0.25]);
      s.mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 12, 3), dark, [-0.45, 1.72, -0.2]);
    } else if (a.craft === 'box') {
      top = 1.65; waist = 0.8; deck = 0.7;
      s.mesh(new THREE.BoxGeometry(1.5, 0.95, 1.5, 6, 5, 6), hull, [0, 1.15, 0]);
      for (const side of [-1, 1]) {
        s.mesh(new THREE.BoxGeometry(1.5, 0.05, 0.95, 10, 1, 4), panel, [side * 1.6, 1.4, 0]);
        s.mesh(new THREE.BoxGeometry(1.56, 0.03, 1.0, 10, 1, 4), trim, [side * 1.6, 1.37, 0]);
      }
      s.mesh(new THREE.BoxGeometry(0.5, 0.26, 0.5, 3, 3, 3), trim, [0.35, 1.75, -0.3]);
    } else if (a.craft === 'sphere') {
      top = 2.0; waist = 0.8; deck = 0.45;
      s.mesh(new THREE.SphereGeometry(0.85, 28, 20), hull, [0, 1.2, 0]);
      s.mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.22, 28, 2), trim, [0, 0.3, 0]);
      s.mesh(new THREE.CylinderGeometry(0.5, 1.1, 0.35, 20, 3, true), trim, [0, 0.55, 0]);
      s.mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.2, 20, 2), trim, [0, 2.02, 0]);
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; s.ball([0.08, 0.08, 0.08], [Math.cos(t) * 0.84, 1.3, Math.sin(t) * 0.84], dark, 8); }
    } else {
      top = 2.75; waist = 0.5; deck = 1.85;
      s.mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.9, 16, 8), hull, [0, 2.3, 0]);
      s.mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34, 2, 4, 2), trim, [0, 1.65, 0]);
      for (const side of [-1, 1]) s.mesh(new THREE.BoxGeometry(1.0, 0.04, 0.6, 8, 1, 3), panel, [side * 1.05, 2.5, 0]);
    }
    // Legs with footpads; tubes, so they buckle rather than snap.
    if (a.craft !== 'sphere') for (let i = 0; i < legs; i++) {
      const t = (i / legs) * Math.PI * 2 + 0.5, c = Math.cos(t), z = Math.sin(t);
      const hip = top - 0.85, foot = a.craft === 'tower' ? 1.5 : 1.65;
      s.tube([[c * waist * 0.9, hip, z * waist * 0.9], [c * (waist + foot) * 0.55, hip * 0.62 + 0.15, z * (waist + foot) * 0.55], [c * foot, 0.08, z * foot]], 0.05, trim);
      s.tube([[c * waist * 0.8, hip - 0.4, z * waist * 0.8], [c * foot * 0.9, 0.3, z * foot * 0.9]], 0.03, trim);
      s.mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 12, 1), dark, [c * foot, 0.04, z * foot]);
    }

    // Antenna dish, wilted in its own frame before the body melt takes it.
    const dishGeometry = new THREE.LatheGeometry([[0.03, 0], [0.3, 0.035], [0.55, 0.12], [0.78, 0.27]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
    const wilt = a.dish === 'wilted' ? mix(0.55, 1.2, m) : a.dish === 'defiant' ? 0 : 0.3 * m;
    const flop = random() * Math.PI * 2;
    const dp = dishGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i), z = dp.getZ(i), r = Math.hypot(x, z) / 0.78;
      const side = 0.5 + 0.5 * Math.cos(Math.atan2(z, x) - flop);
      dp.setY(i, dp.getY(i) - wilt * r * r * side * 0.95);
      dp.setX(i, x * (1 - wilt * side * r * 0.18)); dp.setZ(i, z * (1 - wilt * side * r * 0.18));
    }
    dishGeometry.computeVertexNormals();
    const dish = s.mesh(dishGeometry, white);
    const rest: THREE.Mesh[] = [];
    let feed = new THREE.Vector3();
    if (a.dish === 'fallen') {
      const t = random() * Math.PI * 2, d = 2.0 + random() * 0.4;
      dish.position.set(Math.cos(t) * d, 0.3, Math.sin(t) * d);
      dish.rotation.set(1.9 + random() * 0.4, random() * 3, 0.3);
      feed = dish.position.clone().setY(0.4);
      rest.push(dish);
      s.tube([[0.2, top, -0.2], [0.35, top + 0.4, -0.3], [0.6, top + 0.35, -0.5]], 0.04, trim);
    } else {
      const base: [number, number, number] = [0.15, top - 0.02, -0.25], head: [number, number, number] = a.dish === 'folded' ? [0.5, top + 0.2, 0.15] : [0.3, top + 0.75, -0.4];
      s.tube([base, [base[0] + 0.05, (base[1] + head[1]) / 2 + 0.1, base[2] - 0.05], head], 0.04, trim);
      dish.position.set(...head);
      if (a.dish === 'folded') dish.rotation.set(Math.PI * 0.92, 0, 0.2);
      else dish.rotation.set(-0.35, 0, a.dish === 'defiant' ? 0.1 : 0.3);
      if (a.dish !== 'folded') s.rod(head, [head[0], head[1] + 0.42, head[2] - 0.12], 0.015, trim);
      feed = at(head[0], head[1] + 0.42, head[2] - 0.12);
    }

    // Hull mark.
    const face = a.craft === 'box' ? 0.76 : a.craft === 'sphere' ? 0.86 : a.craft === 'tower' ? 0.56 : 0.97;
    const markY = a.craft === 'tower' ? 2.3 : 1.2;
    if (a.mark === 'plaque') s.label(['EMBER 7', 'CANDLE-1', 'HEARTH 3', 'VIGIL', 'LAST LIGHT'][Math.floor(random() * 5)], 0.72, 0.2, [0, markY, face + 0.012], '#1c1c1c', '#cfc9b6');
    else if (a.mark === 'flag') ['#b52a2a', '#e8e3d4', '#27458a'].forEach((colour, i) => s.box([0.5, 0.1, 0.02], [0, markY + 0.1 - i * 0.1, face + 0.012], s.material(colour)));
    else if (a.mark === 'disc') { s.cylinder(0.17, 0.17, 0.02, [0, markY, face + 0.015], s.material('#e0b040', { metalness: 0.6, roughness: 0.25 }), 20).rotation.x = Math.PI / 2; s.cylinder(0.03, 0.03, 0.03, [0, markY, face + 0.02], dark, 10).rotation.x = Math.PI / 2; }

    // Camera mast (melts) and its head (does not).
    const mastTop: [number, number, number] = [-0.45, top + 0.6, 0.45];
    s.tube([[-0.35, top - 0.05, 0.3], [-0.42, top + 0.3, 0.4], mastTop], 0.035, trim);

    // Everything so far is subject to the heat.
    const spared = new Set<THREE.Object3D>(rest);
    for (const child of [...s.root.children]) if ((child as THREE.Mesh).isMesh && !spared.has(child)) soften(child as THREE.Mesh);

    const mount = at(...mastTop);
    const head = new THREE.Group();
    head.position.copy(mount);
    const yaw = a.gaze === 'viewer' ? 0.5 : a.gaze === 'horizon' ? -0.2 : random() - 0.5;
    head.rotation.set({ horizon: 0, down: 0.95, up: -0.85, viewer: 0.1 }[a.gaze], yaw, m * 0.25 * (random() - 0.5), 'YXZ');
    const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => { mesh.position.set(x, y, z); mesh.castShadow = true; head.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.3), trim), 0, 0.08, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.2, 18).rotateX(Math.PI / 2), dark), 0, 0.08, 0.22);
    const live = a.signal !== 'silent';
    const glass = new THREE.MeshStandardMaterial({ color: '#3a7bd0', emissive: '#4aa0ff', emissiveIntensity: live ? 0.9 : 0.25, roughness: 0.05, metalness: 0.3 });
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), glass), 0, 0.08, 0.3).scale.z = 0.5;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1 })), 0.035, 0.115, 0.345);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.2), dark), 0, 0.225, 0.12);
    s.root.add(head);

    // Run-off: drips from the rim, rivulets, and the pool.
    const slagColour = new THREE.Color(finish.hull).lerp(new THREE.Color('#a9adb2'), 0.55);
    const hotEdge = a.ground === 'glowing' ? mix(0.5, 1.3, mood.warmth) : 0;
    const slag = new THREE.MeshStandardMaterial({ color: slagColour, roughness: 0.18, metalness: 0.55, emissive: '#ff4a12', emissiveIntensity: hotEdge * 0.08 });
    const drips = Math.round(m * 18);
    for (let i = 0; i < drips; i++) {
      const t = random() * Math.PI * 2, r = waist * (0.95 + random() * 0.25);
      const p = at(Math.cos(t) * r, deck + random() * 0.25, Math.sin(t) * r);
      const length = Math.min(p.y - 0.02, 0.12 + random() * 0.4 * m);
      if (length < 0.05) continue;
      s.ball([0.04 + random() * 0.03, length * 0.6, 0.04 + random() * 0.03], [p.x, p.y - length * 0.5, p.z], hull, 8);
      s.ball([0.055, 0.07, 0.055], [p.x, p.y - length, p.z], hull, 8);
    }
    const puddle = new THREE.Shape();
    const reach = 1.0 + m * 1.5;
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2, r = reach * (0.8 + 0.14 * Math.sin(t * 3 + seed) + 0.1 * Math.sin(t * 5 + seed * 2) + 0.08 * Math.sin(t * 9 + seed * 3));
      const x = Math.cos(t) * r + leanX * m * 0.4, y = Math.sin(t) * r - leanZ * m * 0.4;
      if (i === 0) puddle.moveTo(x, y); else puddle.lineTo(x, y);
    }
    const pool = s.mesh(new THREE.ExtrudeGeometry(puddle, { depth: 0.03, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.03, bevelSegments: 3 }), slag);
    pool.rotation.x = -Math.PI / 2;
    if (hotEdge > 0) {
      const rim = s.mesh(new THREE.ShapeGeometry(puddle), new THREE.MeshStandardMaterial({ color: '#ff7a24', emissive: '#ff4a10', emissiveIntensity: hotEdge, roughness: 0.6 }), [0, 0.012, 0]);
      rim.rotation.x = -Math.PI / 2;
      rim.scale.set(1.09, 1.09, 1);
    }
    for (let i = 0; i < Math.round(m * 7); i++) { const t = random() * Math.PI * 2, d = reach * (1 + random() * 0.4); s.ball([0.1 + random() * 0.18, 0.03, 0.08 + random() * 0.14], [Math.cos(t) * d, 0.02, Math.sin(t) * d], slag, 10); }
    if (a.ground === 'ash') {
      const ash = s.material('#8f867d', { roughness: 1 });
      for (let i = 0; i < 6; i++) { const t = random() * Math.PI * 2, d = 0.9 + random() * 1.3; s.ball([0.4 + random() * 0.45, 0.08 + random() * 0.12, 0.3 + random() * 0.3], [Math.cos(t) * d * 1.2, 0, Math.sin(t) * d * 1.2], ash, 12).rotation.y = random() * 3; }
    }

    // Signs of life.
    const rings: THREE.Mesh[] = [];
    let lamp: THREE.MeshStandardMaterial | null = null;
    const sparks: THREE.Mesh[] = [];
    if (a.signal === 'beacon') {
      lamp = new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2010', emissiveIntensity: 2.2 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lamp);
      bulb.position.set(0, 0.29, 0);
      head.add(bulb);
    } else if (a.signal === 'sending') {
      const wave = new THREE.MeshBasicMaterial({ color: mood.cheer > 0.5 ? '#7af0d8' : '#ffd27a', transparent: true, opacity: 0.55, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 40), wave.clone());
        ring.position.copy(feed);
        ring.rotation.x = Math.PI / 2 - 0.3;
        s.root.add(ring);
        rings.push(ring);
      }
    } else if (a.signal === 'sparking') {
      const from = at(0.5, deck + 0.5, 0.6);
      s.tube([[from.x, from.y, from.z], [from.x + 0.3, from.y - 0.1, from.z + 0.3], [from.x + 0.42, Math.max(0.3, from.y - 0.5), from.z + 0.38]], 0.022, dark);
      const flash = new THREE.MeshStandardMaterial({ color: '#fff3a0', emissive: '#ffd84a', emissiveIntensity: 2.5 });
      for (let i = 0; i < 7; i++) {
        const spark = s.mesh(new THREE.TetrahedronGeometry(0.035 + random() * 0.04), flash, [from.x + 0.42 + (random() - 0.5) * 0.4, Math.max(0.2, from.y - 0.5) + (random() - 0.3) * 0.4, from.z + 0.38 + (random() - 0.5) * 0.4]);
        sparks.push(spark);
      }
    }

    const pace = mix(0.4, 1.6, mood.energy);
    const pulse = (time: number) => {
      rings.forEach((ring, i) => {
        const u = (time * pace * 0.35 + i / rings.length) % 1;
        ring.scale.setScalar(0.25 + u * 1.5);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - u);
      });
    };
    pulse(0);
    return s.finish({
      footprint: 1.9,
      update: (_dt, time) => {
        pulse(time);
        if (lamp) lamp.emissiveIntensity = Math.sin(time * pace * 1.2) > 0.6 ? 2.4 : 0.05;
        sparks.forEach((spark, i) => { spark.visible = Math.sin(time * 23 * pace + i * 2.7) > 0.3; });
        glass.emissiveIntensity = live ? 0.9 + Math.sin(time * 0.7) * 0.2 : 0.25;
      },
    });
  },
});

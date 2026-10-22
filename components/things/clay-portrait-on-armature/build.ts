import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { headForm, paint, ramp } from './head';

export default defineThing({
  questions: {
    finish: choice('How far along is the portrait?', {
      rough: 'A rough egg of clay pellets with a ridge for a nose and two thumbed hollows for eyes.',
      arriving: 'The likeness is arriving: planes of brow, cheek and jaw blocked in but still soft.',
      half: 'One side detailed and smooth, the other still raw lumps, split down the middle.',
      detailed: 'Nearly done: crisp lids, lips and hair, only the neck unresolved.',
    }),
    sitter: choice('Who is it a portrait of?', {
      oldman: 'An old man: bald, heavy-browed, hollow-cheeked, with a long nose and a short beard.',
      child: 'A child: round-headed, small-nosed and soft.',
      self: 'The sculptor, a self-portrait with a mop of curls.',
      memory: 'A woman remembered rather than seen, eyes closed, hair parted, faintly smiling.',
    }),
    clay: choice('What clay is it?', {
      grey: 'Grey water clay.', terracotta: 'Red-brown terracotta.', plasteline: 'Olive-green oil clay that never dries.',
    }),
    state: choice('What state has it been left in?', {
      working: 'Mid-session: wet and dark, a tool still stuck in the cheek.',
      resting: 'Resting: a damp rag draped over the crown to keep it workable.',
      dried: 'Forgotten: dried pale and cracking all over.',
      slumped: 'Ruined: part of the face has slid off the armature and lies in a lump on the board.',
    }),
    beside: choice('What stands by it?', {
      chair: 'The sitter\'s empty chair.',
      photo: 'A photograph clipped to a thin stand at eye level.',
      mirror: 'A mirror on a stand, angled at the sculptor.',
      nothing: 'Nothing; the stand is alone.',
    }),
    stand: choice('What is it worked on?', {
      tripod: 'A three-legged studio modelling stand with a square turning top.',
      wheel: 'An iron banding wheel on an upturned wooden crate.',
    }),
    mood: choice('What expression is being caught?', {
      neutral: 'Composed and neutral.', smiling: 'The start of a smile.', grim: 'Set and grim.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = context.seed;
    const side = random() < 0.5 ? -1 : 1;
    const dried = a.state === 'dried' && a.clay !== 'plasteline';
    const child = a.sitter === 'child';
    const size = child ? 0.14 : 0.16;
    const wetTone = { grey: '#75695d', terracotta: '#95533a', plasteline: '#6f7350' }[a.clay];
    const dryTone = { grey: '#c2b7a4', terracotta: '#c98c68', plasteline: '#6f7350' }[a.clay];
    const tone = new THREE.Color(dried ? dryTone : wetTone);
    const dark = tone.clone().multiplyScalar(0.55), light = tone.clone().lerp(new THREE.Color('#ffffff'), 0.25);
    const wood = s.material('#a8845a', { roughness: 0.8 }), darkWood = s.material('#6f5438', { roughness: 0.8 });
    const iron = s.material('#3c3d40', { metalness: 0.6, roughness: 0.55 });
    const wire = s.material('#9a9a94', { metalness: 0.8, roughness: 0.35 });

    // The stand, up to the top of the turning board.
    let top = 0;
    if (a.stand === 'tripod') {
      top = 0.86;
      for (let i = 0; i < 3; i++) {
        const ang = i * Math.PI * 2 / 3 + 0.5;
        s.rod([Math.sin(ang) * 0.33, 0, Math.cos(ang) * 0.33], [Math.sin(ang) * 0.07, top - 0.16, Math.cos(ang) * 0.07], 0.022, wood, 0.02);
        s.rod([Math.sin(ang) * 0.2, top * 0.42, Math.cos(ang) * 0.2], [Math.sin(ang + 2.094) * 0.2, top * 0.42, Math.cos(ang + 2.094) * 0.2], 0.012, wood);
      }
      s.cylinder(0.1, 0.1, 0.05, [0, top - 0.17, 0], darkWood, 16);
      s.cylinder(0.024, 0.024, 0.2, [0, top - 0.09, 0], iron, 12);
      const wing = s.box([0.07, 0.018, 0.012], [0.1, top - 0.17, 0], iron); wing.rotation.y = 0.4;
      const board = s.box([0.42, 0.035, 0.42], [0, top - 0.0175, 0], wood); board.rotation.y = 0.2 * side;
    } else {
      const ch = 0.4;
      for (let i = 0; i < 4; i++) { s.box([0.5, 0.085, 0.016], [0, 0.05 + i * 0.1, 0.2], wood); s.box([0.5, 0.085, 0.016], [0, 0.05 + i * 0.1, -0.2], wood); s.box([0.016, 0.085, 0.39], [-0.25, 0.05 + i * 0.1, 0], wood); s.box([0.016, 0.085, 0.39], [0.25, 0.05 + i * 0.1, 0], wood); }
      s.box([0.54, 0.02, 0.44], [0, ch, 0], darkWood);
      s.lathe([[0, 0], [0.13, 0], [0.13, 0.015], [0.05, 0.03], [0.035, 0.08], [0.06, 0.095], [0.17, 0.1], [0.17, 0.118], [0, 0.118]], iron, [0, ch + 0.01, 0]);
      top = ch + 0.128;
    }
    // Armature: a base board, a pipe, a wire loop and a twist of binding wire.
    s.box([0.3, 0.02, 0.3], [0, top + 0.01, 0], s.material('#d8cfb8', { roughness: 0.85 }));
    const Y0 = top + 0.02 + 2.25 * size;
    s.cylinder(0.011, 0.011, 2.4 * size, [0, top + 0.02 + 1.2 * size, -0.012], iron, 10);
    s.cylinder(0.03, 0.035, 0.012, [0, top + 0.026, -0.012], iron, 12);
    const helix: [number, number, number][] = [];
    for (let i = 0; i < 26; i++) helix.push([Math.sin(i * 0.9) * 0.02, top + 0.04 + i * 0.011, -0.012 + Math.cos(i * 0.9) * 0.02]);
    s.tube(helix, 0.0028, wire);
    for (const sgn of [-1, 1]) s.tube([[0, top + 0.03 + 0.9 * size, -0.012], [sgn * 0.06, top + 0.05 + 0.75 * size, 0.01], [sgn * 0.075, top + 0.02 + 1.2 * size, 0.0], [sgn * 0.03, top + 0.02 + 1.6 * size, -0.01]], 0.003, wire);

    // The head.
    const sitter = {
      oldman: { jaw: 0.65, brow: 1.5, cheek: 1.7, nose: 1.3, long: 1.05, lips: 0.6, chin: 1.1, beard: 0.45, moustache: 0.6, hair: 'bald', eyes: 'open' },
      child: { jaw: 0.12, brow: 0.4, cheek: 0.3, nose: 0.62, long: 0.9, lips: 1.2, chin: 0.6, beard: 0, moustache: 0, hair: 'crop', eyes: 'open' },
      self: { jaw: 0.55, brow: 1.0, cheek: 1.0, nose: 1.05, long: 1, lips: 0.9, chin: 1, beard: 0, moustache: 0, hair: 'curls', eyes: 'open' },
      memory: { jaw: 0.28, brow: 0.6, cheek: 0.8, nose: 0.9, long: 1, lips: 1.15, chin: 0.85, beard: 0, moustache: 0, hair: 'parted', eyes: 'closed' },
    }[a.sitter];
    const stage = { rough: { crisp: 0.42, lumpy: 0.15 }, arriving: { crisp: 0.75, lumpy: 0.075 }, half: { crisp: 1, lumpy: 0.06 }, detailed: { crisp: 1, lumpy: 0.022 } }[a.finish];
    const cuts: { n: [number, number, number]; d: number }[] = [];
    if (a.state === 'slumped') { const l = Math.hypot(0.55, 0.45, 0.7); cuts.push({ n: [side * 0.55 / l, -0.45 / l, 0.7 / l], d: mix(0.42, 0.58, random()) }); }
    const head = headForm({
      size, seed, ...sitter, hair: a.finish === 'rough' ? 'bald' : sitter.hair as 'crop', eyes: a.finish === 'rough' ? 'hollow' : sitter.eyes as 'open',
      socket: a.finish === 'rough' ? 1.7 : 1.1, beard: a.finish === 'rough' ? 0 : sitter.beard,
      crisp: a.finish === 'half' ? (X) => mix(0.36, 1, ramp(-0.12, 0.12, X * side)) : stage.crisp,
      lumpy: stage.lumpy, lumpScale: a.finish === 'rough' ? 5.5 : 8, smile: { neutral: 0, smiling: 0.45, grim: -0.4 }[a.mood],
      base: tone, cavity: dark, cavityAmount: 1.1, mottle: light, mottleAmount: dried ? 0.5 : 0.2, hairTint: tone.clone().multiplyScalar(0.9), scar: dark.clone().lerp(tone, 0.4), cuts,
    });
    const cracks = dried ? paint(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,45,35,0.8)';
      for (let i = 0; i < Math.round(mix(40, 110, mood.wear)); i++) {
        let x = random() * w, y = random() * h, ang = random() * 6.28;
        ctx.lineWidth = 1 + random() * 2.2; ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 7; k++) { ang += (random() - 0.5) * 1.4; x += Math.cos(ang) * 13; y += Math.sin(ang) * 9; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }) : null;
    const clay = new THREE.MeshStandardMaterial({ vertexColors: true, map: cracks, roughness: dried ? 0.96 : a.clay === 'plasteline' ? 0.55 : 0.4 });
    const plainClay = new THREE.MeshStandardMaterial({ color: tone, roughness: clay.roughness });
    const group = new THREE.Group();
    group.position.set(0, Y0, 0);
    group.rotation.y = 0.2 * side;
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = group) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); parent.add(node); return node; };
    add(new THREE.Mesh(head.geometry, clay));
    // A neck of pressed-on clay that stops short of the board.
    const neck = new THREE.CylinderGeometry(0.47 * size, 0.56 * size, 0.95 * size, 18, 6);
    const np = neck.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < np.count; i++) {
      const y = np.getY(i), ang = Math.atan2(np.getX(i), np.getZ(i));
      const k = 1 + 0.12 * Math.sin(ang * 5 + y * 60) + (y < 0 ? 0.1 * Math.sin(ang * 3 + seed) : 0);
      np.setXYZ(i, np.getX(i) * k, y + (y < -0.3 * size ? 0.12 * size * Math.sin(ang * 4 + seed) : 0), np.getZ(i) * k);
    }
    neck.computeVertexNormals();
    add(new THREE.Mesh(neck, plainClay)).position.set(0, -1.02 * size, -0.09 * size);
    s.root.add(group);

    const boardY = top + 0.02;
    const pellets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.008, 1), plainClay, 9);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 9; i++) { const ang = random() * 6.28, r = 0.05 + random() * 0.09; m.makeScale(1 + random(), 0.5 + random() * 0.4, 1 + random()).setPosition(Math.sin(ang) * r, boardY + 0.005, Math.cos(ang) * r); pellets.setMatrixAt(i, m); }
    pellets.castShadow = true; s.root.add(pellets);
    if (a.state === 'slumped') {
      s.ball([0.075, 0.03, 0.06], [side * 0.06, boardY + 0.022, 0.1], plainClay, 14);
      s.ball([0.04, 0.022, 0.035], [side * 0.11, boardY + 0.016, 0.06], plainClay, 10);
    }
    // Tools.
    const loopTool = (from: [number, number, number], to: [number, number, number]) => {
      s.rod(from, to, 0.006, darkWood);
      const d = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
      const loop = s.ring(0.011, 0.0018, [to[0] + d.x * 0.012, to[1] + d.y * 0.012, to[2] + d.z * 0.012], wire);
      loop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(d.z, 0.3, -d.x).normalize());
      s.cylinder(0.0065, 0.0065, 0.014, [to[0] - d.x * 0.008, to[1] - d.y * 0.008, to[2] - d.z * 0.008], wire, 8).quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    };
    const edge = a.stand === 'tripod' ? 0.17 : 0.2;
    loopTool([-side * 0.02, boardY + 0.007, edge - 0.04], [-side * 0.13, boardY + 0.007, edge - 0.01]);
    if (mood.density > 0.3) loopTool([side * 0.13, boardY + 0.007, 0.03], [side * 0.11, boardY + 0.007, 0.14]);
    if (a.state === 'working') {
      const cheek = head.at(side * 0.5, -0.25);
      const p = cheek.p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y).add(group.position);
      const n = cheek.n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y).add(new THREE.Vector3(0, 0.35, 0)).normalize();
      const out = p.clone().addScaledVector(n, 0.14);
      s.rod([out.x, out.y, out.z], [p.x, p.y, p.z], 0.0065, darkWood, 0.004);
    }
    // Calipers hung on or laid by the stand.
    const cal = new THREE.Group();
    for (const sgn of [-1, 1]) add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sgn * 0.05, -0.05, 0), new THREE.Vector3(sgn * 0.065, -0.13, 0), new THREE.Vector3(sgn * 0.02, -0.21, 0)]), 16, 0.005, 6), wood), cal);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10), iron), cal).rotation.x = Math.PI / 2;
    if (a.stand === 'tripod') { cal.position.set(-side * 0.215, top - 0.04, 0.05); cal.rotation.y = Math.PI / 2 + 0.2 * side; }
    else { cal.position.set(-side * 0.17, top - 0.11, 0.09); cal.rotation.set(Math.PI / 2, 0, 0.6); }
    s.root.add(cal);
    // Rags.
    const ragTone = s.material(dried ? '#cfc7b4' : '#a9a595', { roughness: 0.95 });
    if (a.state === 'resting') {
      const rag = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
      const rp = rag.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < rp.count; i++) {
        const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), ang = Math.atan2(x, z);
        const hang = Math.max(0, 0.6 - y) * (0.6 + 0.4 * Math.sin(ang * 3 + seed)) * (z < -0.1 ? 1.5 : 0.15);
        const k = 1.22 + 0.04 * Math.sin(ang * 9 + y * 6);
        rp.setXYZ(i, x * 0.86 * k * size, (y * 1.08 * k - hang * 0.9) * size, (z * 0.98 * k - 0.04) * size);
      }
      rag.computeVertexNormals();
      add(new THREE.Mesh(rag, new THREE.MeshStandardMaterial({ color: '#b3ae9e', roughness: 0.95, side: THREE.DoubleSide })));
      // A spray bottle to keep it damp.
      const bx = a.stand === 'tripod' ? side * 0.16 : side * 0.21;
      s.cylinder(0.022, 0.026, 0.09, [bx, boardY + 0.045 - (a.stand === 'tripod' ? 0 : 0.128), -0.1], new THREE.MeshStandardMaterial({ color: '#7fb6c9', roughness: 0.2, transparent: true, opacity: 0.8 }), 12);
      s.box([0.02, 0.03, 0.045], [bx, boardY + 0.105 - (a.stand === 'tripod' ? 0 : 0.128), -0.09], s.material('#d9d6cc'));
    }
    const ragY = a.stand === 'tripod' ? boardY : top - 0.118;
    const ragX = a.stand === 'tripod' ? -side * 0.15 : -side * 0.2;
    const heap = s.ball([0.07, 0.022, 0.05], [ragX, ragY + 0.016, -0.1], ragTone, 12); heap.rotation.y = 0.5;
    s.ball([0.04, 0.02, 0.05], [ragX + 0.03, ragY + 0.02, -0.07], ragTone, 10);
    if (a.stand === 'wheel') {
      // Water bowl and sponge on the crate.
      s.lathe([[0, 0], [0.05, 0], [0.075, 0.045], [0.07, 0.045], [0.047, 0.008], [0, 0.008]], s.material('#e6e2d6', { roughness: 0.3 }), [side * 0.19, 0.4 + 0.01, 0.13]);
      s.cylinder(0.062, 0.062, 0.004, [side * 0.19, 0.4 + 0.04, 0.13], new THREE.MeshStandardMaterial({ color: dark.clone().lerp(new THREE.Color('#8a9aa0'), 0.5), roughness: 0.1 }), 16);
      s.box([0.07, 0.035, 0.05], [side * 0.07, 0.4 + 0.0275, 0.185], s.material('#e3c35a', { roughness: 0.95 })).rotation.y = 0.4;
    }

    // What stands by.
    const bx = -side * 0.72;
    if (a.beside === 'chair') {
      const chair = new THREE.Group();
      const part = (w: number, h: number, d: number, x: number, y: number, z: number) => { const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkWood), chair); mesh.position.set(x, y, z); return mesh; };
      part(0.42, 0.035, 0.42, 0, 0.46, 0);
      for (const x of [-1, 1]) { part(0.035, 0.46, 0.035, x * 0.185, 0.23, 0.185); part(0.035, 0.95, 0.035, x * 0.185, 0.475, -0.19).rotation.x = -0.06; }
      part(0.4, 0.07, 0.022, 0, 0.9, -0.215); part(0.4, 0.05, 0.022, 0, 0.72, -0.205);
      for (const z of [-0.185, 0.185]) part(0.37, 0.022, 0.022, 0, 0.2, z);
      if (mood.cheer < 0.45) { const coat = add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.05), s.material('#3c4350', { roughness: 0.95 })), chair); coat.position.set(0, 0.8, -0.235); coat.rotation.x = -0.06; }
      chair.position.set(bx, 0, 0.12); chair.rotation.y = side * 1.15;
      s.root.add(chair);
    } else if (a.beside === 'photo' || a.beside === 'mirror') {
      const h = Y0 + 0.02;
      s.cylinder(0.008, 0.008, h, [bx * 0.72, h / 2, 0.02], iron, 8);
      for (let i = 0; i < 3; i++) { const ang = i * 2.094; s.rod([bx * 0.72, 0.12, 0.02], [bx * 0.72 + Math.sin(ang) * 0.17, 0, 0.02 + Math.cos(ang) * 0.17], 0.007, iron); }
      if (a.beside === 'photo') {
        const picture = paint(200, 260, (ctx, w, hh) => {
          ctx.fillStyle = '#efe7d2'; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = '#b9a988'; ctx.fillRect(14, 14, w - 28, hh - 50);
          ctx.fillStyle = '#4a3c30'; ctx.beginPath(); ctx.ellipse(w / 2, 108, child ? 46 : 40, 52, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w / 2, 232, 78, 62, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#b9a988'; ctx.fillRect(14, hh - 36, w - 28, 40); ctx.fillStyle = '#efe7d2'; ctx.fillRect(0, hh - 36, w, 36);
        });
        const photo = s.mesh(new THREE.PlaneGeometry(0.16, 0.21), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.8, side: THREE.DoubleSide }), [bx * 0.72, h - 0.09, 0.03]);
        photo.rotation.y = side * 0.5; photo.rotation.z = (random() - 0.5) * 0.1;
        s.box([0.03, 0.02, 0.02], [bx * 0.72, h + 0.01, 0.03], iron);
      } else {
        const frame = s.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 28), darkWood, [bx * 0.72, h - 0.1, 0.02]);
        frame.rotation.set(Math.PI / 2, 0, 0); frame.rotation.z = -side * 0.5; frame.scale.set(1, 1, 1.3);
        const glass = s.mesh(new THREE.CircleGeometry(0.122, 28), new THREE.MeshStandardMaterial({ color: '#dfe9ee', metalness: 0.95, roughness: 0.08 }), [bx * 0.72 + side * 0.006, h - 0.1, 0.031]);
        glass.rotation.y = side * 0.5; glass.scale.y = 1.3;
      }
    }
    return s.finish();
  },
});

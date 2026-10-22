import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P3, glowMaterial, grime, paintTexture, painted, put, tubeThrough, write } from './lib';

export default defineThing({
  questions: {
    beam: choice('What is coming out of the port window?', {
      running: 'A strong flickering cone of light, the feature in full flow.',
      idle: 'A thin pale steady beam: lamp struck, film not yet rolling.',
      dark: 'Nothing. The port is dark, its little shutter dropped.',
    }),
    film: choice('What is the show tinting the light?', {
      newsreel: 'Silver-white, a black-and-white reel.',
      western: 'Dusty amber and gold.',
      monster: 'Sickly radioactive green.',
      romance: 'Rose and violet.',
    }),
    shell: choice('What is the booth built of?', {
      block: 'Painted cinder block sitting flat on the gravel.',
      raised: 'Block, lifted on a tall base with a steel stair to the door so it clears the car roofs.',
      tin: 'A corrugated tin shed with a lean-to roof, cheaper and hotter.',
    }),
    door: choice('How is the door?', {
      shut: 'Shut, with a KEEP OUT sign.',
      open: 'Propped open for air, warm light and the shape of the projector inside.',
      padlocked: 'Hasped and padlocked, a notice pasted over the sign.',
    }),
    waiting: choice('What is by the door?', {
      cans: 'A neat stack of film cans: tonight\'s double feature.',
      cases: 'Dented octagonal shipping cases waiting to go back to the exchange.',
      spilled: 'A reel that got away, unspooled in loops across the gravel.',
      nothing: 'Nothing.',
    }),
    projectionist: choice('Where is the projectionist?', {
      stepped_out: 'Stepped out: an empty stool with a thermos and a folded newspaper.',
      sitting: 'Sitting on the stool outside, cap pushed back, having a smoke between reels.',
      cat: 'Inside, presumably. A cat has taken the stool.',
      gone: 'Long gone. The stool lies on its side.',
    }),
    roof: choice('What sticks up from the roof?', {
      stack: 'A lamphouse exhaust stack with a rain cap.',
      horn: 'A horn loudspeaker for announcements.',
      aerial: 'A bent radio aerial, for the ball game.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const worn = (colour: string, amount = 0.35) => new THREE.Color(colour).lerp(new THREE.Color('#84735c'), mood.wear * amount);
    const W = 3.2, D = 2.8, H = 2.45;
    const baseY = a.shell === 'raised' ? 1.35 : 0;
    const front = D / 2;
    const paint = mood.cheer > 0.6 ? '#e6dcc0' : mood.warmth > 0.5 ? '#cfc3a4' : '#bfc7c2';
    const trimColour = mood.cheer > 0.5 ? '#a8342c' : '#35505c';
    const steel = s.material(worn('#9aa09f', 0.6), { metalness: 0.55, roughness: 0.45 });
    const dark = s.material('#1f2124', { roughness: 0.8 });
    const trim = s.material(worn(trimColour), { roughness: 0.6 });

    const skin = paintTexture(256, 256, (ctx, w, h) => {
      if (a.shell === 'tin') {
        ctx.fillStyle = `#${worn('#aeb4b2', 0.8).getHexString()}`; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 16) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, 0, 6, h); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x + 8, 0, 4, h); }
        grime(ctx, w, h, 0.2 + mood.wear * 0.8, random, '132,74,40');
      } else {
        ctx.fillStyle = `#${worn(paint).getHexString()}`; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(60,55,45,0.32)'; ctx.lineWidth = 2.5;
        for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) ctx.strokeRect((c + (r % 2) * 0.5) * (w / 4), r * (h / 8), w / 4, h / 8);
        ctx.fillStyle = `#${worn(trimColour).getHexString()}`; ctx.fillRect(0, h * 0.72, w, h * 0.05);
        grime(ctx, w, h, mood.wear * 0.8, random);
      }
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.92, metalness: a.shell === 'tin' ? 0.3 : 0 });
    s.box([W, H, D], [0, baseY + H / 2, 0], wallMat);
    if (baseY) {
      s.box([W + 0.3, baseY, D + 0.3], [0, baseY / 2, 0], s.material(worn('#a9a79c'), { roughness: 0.95 }));
      s.box([W + 0.4, 0.08, D + 0.4], [0, baseY, 0], trim);
    }
    // Roof.
    const slope = a.shell === 'tin' ? 0.16 : 0.03;
    const roof = s.box([W + 0.5, 0.12, D + 0.6], [0, baseY + H + 0.1, 0.05], a.shell === 'tin' ? wallMat : s.material(worn('#4f4c48'), { roughness: 1 }));
    roof.rotation.x = slope;
    s.box([W + 0.54, 0.16, 0.06], [0, baseY + H + 0.1 - slope * (D / 2 + 0.3), front + 0.36], trim);
    const top = baseY + H + 0.16;
    if (a.roof === 'stack') {
      s.cylinder(0.11, 0.11, 0.9, [0.7, top + 0.4, -0.5], steel, 12);
      s.mesh(new THREE.ConeGeometry(0.24, 0.16, 14), steel, [0.7, top + 0.98, -0.5]);
      for (let i = 0; i < 3; i++) s.rod([0.7 + Math.cos(i * 2.1) * 0.1, top + 0.82, -0.5 + Math.sin(i * 2.1) * 0.1], [0.7 + Math.cos(i * 2.1) * 0.16, top + 0.92, -0.5 + Math.sin(i * 2.1) * 0.16], 0.01, steel);
    }
    if (a.roof === 'horn') {
      s.rod([0.8, top - 0.05, 0.6], [0.8, top + 0.6, 0.6], 0.03, steel);
      const bell = s.mesh(new THREE.ConeGeometry(0.34, 0.6, 18, 1, true), s.material(worn('#b9b9ae', 0.5), { metalness: 0.5, side: THREE.DoubleSide }), [0.8, top + 0.66, 0.9]);
      bell.rotation.x = -Math.PI / 2 - 0.15;
      s.cylinder(0.08, 0.08, 0.2, [0.8, top + 0.62, 0.5], dark, 10).rotation.x = Math.PI / 2;
    }
    if (a.roof === 'aerial') {
      const bend = mix(0.05, 0.6, mood.wear);
      s.rod([0.9, top - 0.05, -0.7], [0.9 + bend * 0.3, top + 1.3, -0.7], 0.014, steel);
      s.rod([0.9 + bend * 0.3, top + 1.3, -0.7], [0.9 + bend, top + 2.1, -0.7 + bend * 0.4], 0.01, steel);
      for (const y of [0.9, 1.2]) s.rod([0.6 + bend * 0.2, top + y, -0.7], [1.25 + bend * 0.2, top + y + 0.05, -0.7], 0.008, steel);
    }

    // Ports in the front wall: a projection port and a smaller viewing port.
    const portY = baseY + 1.55, portX = -0.35;
    const lit = a.beam !== 'dark';
    const tint = { newsreel: '#eef3ff', western: '#ffc76a', monster: '#a6ff6a', romance: '#ff9ccf' }[a.film];
    const beamColour = a.beam === 'idle' ? '#f4f6ff' : tint;
    for (const [x, w, h] of [[portX, 0.4, 0.3], [portX + 0.75, 0.24, 0.24], [portX - 0.75, 0.24, 0.24]] as const) {
      s.box([w + 0.12, h + 0.12, 0.08], [x, portY, front + 0.01], steel);
      const hot = x === portX && lit;
      s.box([w, h, 0.02], [x, portY, front + 0.05], hot ? new THREE.MeshStandardMaterial({ color: beamColour, emissive: beamColour, emissiveIntensity: 2.2 }) : new THREE.MeshStandardMaterial({ color: lit ? '#3a3326' : '#15161a', emissive: '#ffb45a', emissiveIntensity: lit ? 0.35 : 0, roughness: 0.3 }));
      if (!lit && x === portX) s.box([w + 0.04, h * 0.7, 0.03], [x, portY + h * 0.2, front + 0.07], steel);
    }

    // The beam: a film-frame-shaped pyramid of dusty light, and motes drifting through it.
    const beams: THREE.Mesh[] = [];
    let motes: THREE.InstancedMesh | null = null;
    const moteSeeds: number[] = [];
    const length = 4.6;
    if (lit) {
      const strength = a.beam === 'running' ? 1 : 0.45;
      const rig = put(s.root, new THREE.Group(), [portX, portY, front + 0.06]);
      rig.rotation.x = -0.1;
      for (const [k, opacity] of [[1, 0.2], [0.55, 0.22]] as const) {
        const geometry = new THREE.CylinderGeometry(0.95 * k, 0.12 * k, length, 4, 1, true);
        geometry.rotateY(Math.PI / 4);
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, 0, length / 2);
        const cone = new THREE.Mesh(geometry, glowMaterial(beamColour, opacity * strength));
        cone.scale.set(1.25, 0.7, 1);
        rig.add(cone);
        beams.push(cone);
      }
      const count = Math.round(mix(30, 110, mood.density) * strength);
      motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 5, 4), glowMaterial('#fffbe6', 0.85), count);
      for (let i = 0; i < count * 3; i++) moteSeeds.push(random());
      rig.add(motes);
    }
    const placeMotes = (time: number) => {
      if (!motes) return;
      const m = new THREE.Matrix4();
      for (let i = 0; i < motes.count; i++) {
        const t = (moteSeeds[i * 3] + time * 0.02 * (0.5 + moteSeeds[i * 3 + 1])) % 1;
        const z = 0.3 + t * (length - 0.5), spread = (0.12 + (0.95 - 0.12) * (z / length)) * 0.62;
        m.makeTranslation((moteSeeds[i * 3 + 1] * 2 - 1) * spread * 1.25 + Math.sin(time * 0.7 + i) * 0.03, (moteSeeds[i * 3 + 2] * 2 - 1) * spread * 0.7 + Math.cos(time * 0.5 + i * 1.7) * 0.03, z);
        motes.setMatrixAt(i, m);
      }
      motes.instanceMatrix.needsUpdate = true;
    };
    placeMotes(0);

    // Door in the left wall, with its sign.
    const doorZ = 0.25, doorX = -W / 2;
    s.box([0.06, 2.06, 1.0], [doorX - 0.01, baseY + 1.03, doorZ], trim);
    if (a.door === 'open') {
      const inside = painted(0.86, 1.95, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd994'); g.addColorStop(1, '#c97b33');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#231a14';
        ctx.fillRect(w * 0.4, h * 0.62, w * 0.12, h * 0.38); ctx.fillRect(w * 0.2, h * 0.42, w * 0.6, h * 0.2);
        ctx.fillRect(w * 0.72, h * 0.47, w * 0.2, h * 0.08);
        for (const [cx, cy] of [[0.35, 0.3], [0.62, 0.36]]) { ctx.beginPath(); ctx.arc(w * cx, h * cy, w * 0.19, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#ffd994'; for (const [cx, cy] of [[0.35, 0.3], [0.62, 0.36]]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(w * cx + Math.cos(k * 2.1) * w * 0.09, h * cy + Math.sin(k * 2.1) * w * 0.09, w * 0.04, 0, 7); ctx.fill(); }
      }, { px: 256, glow: 0.9 });
      inside.rotation.y = -Math.PI / 2;
      put(s.root, inside, [doorX - 0.045, baseY + 1.0, doorZ]);
      const leaf = put(s.root, new THREE.Group(), [doorX - 0.05, baseY, doorZ + 0.45]);
      put(leaf, new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.95, 0.05), s.material(worn('#6d7477', 0.5), { metalness: 0.3 })), [-0.45, 1.0, 0]);
      leaf.rotation.y = -0.5 - random() * 0.5;
    } else {
      s.box([0.05, 1.95, 0.9], [doorX - 0.035, baseY + 1.0, doorZ], s.material(worn('#6d7477', 0.5), { metalness: 0.3 }));
      s.ball([0.04, 0.04, 0.04], [doorX - 0.08, baseY + 1.0, doorZ + 0.34], steel, 8);
      const sign = painted(0.6, 0.34, (ctx, w, h) => {
        ctx.fillStyle = a.door === 'padlocked' ? '#e9e2cb' : '#f3efe0'; ctx.fillRect(0, 0, w, h);
        if (a.door === 'padlocked') { write(ctx, 'NOTICE', w / 2, h * 0.25, h * 0.26, '#222'); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#555'; ctx.fillRect(w * 0.12, h * (0.48 + i * 0.11), w * (0.5 + random() * 0.26), h * 0.035); } }
        else { write(ctx, 'PROJECTION', w / 2, h * 0.3, h * 0.24, '#a8342c', { max: w * 0.88 }); write(ctx, 'KEEP OUT', w / 2, h * 0.7, h * 0.3, '#222', { max: w * 0.88 }); }
        grime(ctx, w, h, mood.wear * 0.6, random);
      }, { px: 256 });
      sign.rotation.y = -Math.PI / 2;
      sign.rotation.x = (random() - 0.5) * mood.wear * 0.3;
      put(s.root, sign, [doorX - 0.065, baseY + 1.55, doorZ]);
      if (a.door === 'padlocked') {
        s.box([0.03, 0.06, 0.22], [doorX - 0.07, baseY + 1.05, doorZ + 0.38], steel);
        s.box([0.04, 0.1, 0.08], [doorX - 0.09, baseY + 0.97, doorZ + 0.42], s.material('#c9a13a', { metalness: 0.7, roughness: 0.4 }));
      }
    }
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffe2ad', emissive: '#ffb04a', emissiveIntensity: a.door === 'padlocked' ? 0 : mix(0.8, 1.8, mood.warmth) });
    s.box([0.14, 0.05, 0.14], [doorX - 0.1, baseY + 2.25, doorZ], steel);
    s.ball([0.07, 0.08, 0.07], [doorX - 0.1, baseY + 2.18, doorZ], lamp, 10);

    if (baseY) {
      // Landing and a steep steel stair down toward the front.
      const lx = doorX - 0.5;
      s.box([0.9, 0.05, 1.2], [lx, baseY, doorZ], steel);
      const steps = 6;
      for (let i = 1; i <= steps; i++) s.box([0.8, 0.04, 0.24], [lx, baseY - (i / (steps + 1)) * baseY, doorZ + 0.6 + i * 0.26], steel);
      for (const side of [-1, 1]) {
        s.rod([lx + side * 0.42, baseY, doorZ + 0.6], [lx + side * 0.42, 0, doorZ + 0.6 + (steps + 1) * 0.26], 0.025, steel);
        if (side < 0) { s.rod([lx - 0.42, baseY + 0.9, doorZ - 0.6], [lx - 0.42, baseY + 0.9, doorZ + 0.6], 0.018, steel); s.rod([lx - 0.42, baseY + 0.9, doorZ + 0.6], [lx - 0.42, 0.9, doorZ + 0.6 + (steps + 1) * 0.26], 0.018, steel); for (const z of [-0.6, 0.6]) s.rod([lx - 0.42, baseY, doorZ + z], [lx - 0.42, baseY + 0.9, doorZ + z], 0.018, steel); }
      }
      for (const z of [-0.5, 0.5]) s.rod([lx - 0.4, 0, doorZ + z], [lx - 0.4, baseY, doorZ + z], 0.03, steel);
    }

    // By the door, on the ground at the front-left corner.
    const gx = -W / 2 - (baseY ? 1.6 : 0.75), gz = baseY ? -0.5 : front - 0.25;
    const tin = s.material(worn('#b4b9b8', 0.7), { metalness: 0.7, roughness: 0.35 });
    const can = (at: P3, tiltZ = 0, tiltX = 0) => {
      const g = put(s.root, new THREE.Group(), at);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), tin));
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.016, 20), steel), [0, 0.02, 0]);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.07), s.material(['#f1e7c4', '#e9c9a0', '#d8e2e6'][Math.floor(random() * 3)])), [0, 0.03, 0.05]);
      g.rotation.set(tiltX, random() * 3, tiltZ);
      return g;
    };
    if (a.waiting === 'cans') {
      const n = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < n; i++) can([gx + (random() - 0.5) * 0.04, 0.03 + i * 0.055, gz + (random() - 0.5) * 0.04]);
      can([gx + 0.42, 0.2, gz - 0.1], 1.25);
      if (mood.density > 0.5) for (let i = 0; i < 3; i++) can([gx - 0.45, 0.03 + i * 0.055, gz + 0.2]);
    }
    if (a.waiting === 'cases') {
      for (let i = 0; i < Math.round(mix(1, 3, mood.density)); i++) {
        const box = s.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 8), s.material(worn(i % 2 ? '#7f8a5a' : '#8b8f92', 0.5), { metalness: 0.4, roughness: 0.55 }), [gx + i * 0.3 * (i % 2 ? -1 : 1), 0.21 + (i === 2 ? 0.43 : 0), gz + (i === 1 ? 0.6 : 0)]);
        box.rotation.y = random() * 3;
        s.rod([box.position.x - 0.1, box.position.y + 0.22, box.position.z], [box.position.x + 0.1, box.position.y + 0.22, box.position.z], 0.012, steel);
        s.box([0.57, 0.04, 0.05], [box.position.x, box.position.y, box.position.z], dark).rotation.y = box.rotation.y;
      }
    }
    if (a.waiting === 'spilled') {
      const reel = put(s.root, new THREE.Group(), [gx, 0.2, gz]);
      for (const y of [-0.025, 0.025]) put(reel, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.006, 24), tin), [0, y, 0]);
      put(reel, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), dark));
      reel.rotation.z = Math.PI / 2 - 0.2;
      const film = s.material('#2a2019', { roughness: 0.25 });
      const pts: P3[] = [[gx, 0.06, gz]];
      let angle = random() * 6, x = gx, z = gz;
      const loops = Math.round(mix(14, 34, mood.energy));
      for (let i = 0; i < loops; i++) {
        angle += (random() - 0.35) * 1.9;
        x += Math.cos(angle) * 0.2; z += Math.sin(angle) * 0.2;
        x = Math.min(gx + 0.5, Math.max(gx - 1.1, x)); z = Math.min(front + 1.3, Math.max(gz - 0.6, z));
        pts.push([x, 0.015 + (i % 3 === 1 ? random() * 0.16 : 0), z]);
      }
      const ribbon = put(s.root, tubeThrough(pts, 0.016, film, 4, 4));
      ribbon.scale.y = 0.6;
      can([gx - 0.5, 0.03, gz - 0.4]);
    }

    // The stool and whoever is, or is not, on it.
    const sx = gx + (a.waiting === 'nothing' ? 0 : 0.2), sz = gz + (baseY ? 1.1 : 0.9);
    const stool = put(s.root, new THREE.Group(), [sx, 0, sz]);
    const wood = s.material(worn('#8a5e3b', 0.4), { roughness: 0.8 });
    put(stool, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 18), wood), [0, 0.64, 0]);
    put(stool, new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 6, 18), steel), [0, 0.28, 0]).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + 0.4;
      const leg = put(stool, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.66, 6), steel), [Math.cos(ang) * 0.15, 0.32, Math.sin(ang) * 0.15]);
      leg.rotation.set(Math.sin(ang) * 0.12, 0, -Math.cos(ang) * 0.12);
    }
    let ember: THREE.MeshStandardMaterial | null = null;
    if (a.projectionist === 'gone') { stool.rotation.z = Math.PI / 2; stool.position.y = 0.17; stool.rotation.y = random() * 3; }
    if (a.projectionist === 'stepped_out') {
      s.cylinder(0.045, 0.045, 0.26, [sx + 0.32, 0.13, sz + 0.1], s.material(mood.cheer > 0.5 ? '#c5372c' : '#3f6b57', { metalness: 0.3 }), 12);
      s.cylinder(0.035, 0.045, 0.05, [sx + 0.32, 0.285, sz + 0.1], steel, 12);
      const paper = s.box([0.24, 0.02, 0.17], [sx, 0.672, sz], s.material('#e6e1d0', { roughness: 1 }));
      paper.rotation.y = random();
    }
    if (a.projectionist === 'cat') {
      const fur = s.material(['#2a2a2c', '#d08a3c', '#a9a59c', '#f1ece0'][Math.floor(random() * 4)], { roughness: 1 });
      s.ball([0.14, 0.07, 0.11], [sx, 0.72, sz], fur, 14);
      s.ball([0.06, 0.055, 0.06], [sx + 0.1, 0.74, sz + 0.07], fur, 12);
      for (const k of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.02, 0.04, 4), fur, [sx + 0.1 + k * 0.03, 0.8, sz + 0.07]);
      put(s.root, tubeThrough([[sx - 0.12, 0.7, sz], [sx - 0.16, 0.68, sz + 0.1], [sx - 0.05, 0.68, sz + 0.15], [sx + 0.05, 0.69, sz + 0.14]], 0.018, fur));
    }
    if (a.projectionist === 'sitting') {
      const shirt = s.material(mood.cheer > 0.5 ? '#e6e0cf' : '#8f9a9e', { roughness: 0.9 }), trousers = s.material('#3b3f4a', { roughness: 0.9 }), skinTone = s.material('#d8a67e', { roughness: 0.8 });
      const p = put(s.root, new THREE.Group(), [sx, 0, sz]);
      put(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.36, 4, 10), shirt), [0, 1.0, -0.02]).rotation.x = 0.15;
      put(p, new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), skinTone), [0, 1.42, 0.04]);
      put(p, new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.06, 14), trousers), [0, 1.5, 0.03]);
      put(p, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.12), trousers), [0, 1.48, 0.15]);
      for (const k of [-1, 1]) {
        put(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.34, 3, 8), trousers), [k * 0.1, 0.7, 0.2]).rotation.x = Math.PI / 2 - 0.1;
        put(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 3, 8), trousers), [k * 0.1, 0.34, 0.42]).rotation.x = 0.12;
        put(p, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), dark), [k * 0.1, 0.03, 0.5]);
      }
      put(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.4, 3, 8), shirt), [-0.2, 0.98, 0.08]).rotation.x = -0.5;
      const arm = put(p, new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 3, 8), shirt), [0.2, 1.12, 0.14]);
      arm.rotation.x = -2.2;
      ember = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a1a', emissiveIntensity: 2 });
      put(p, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5), s.material('#f4f1e8')), [0.2, 1.33, 0.3]).rotation.x = Math.PI / 2;
      put(p, new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), ember), [0.2, 1.33, 0.34]);
      p.rotation.y = 0.5 + (random() - 0.5) * 0.6;
    }
    if (mood.wear > 0.5) {
      const tufts = Array.from({ length: Math.round(mood.wear * 22) }, () => ({ at: [(random() - 0.5) * (W + 0.5), 0.1, random() < 0.5 ? front + 0.12 : -front - 0.12] as P3, size: 0.2 + random() * 0.35, color: random() < 0.5 ? '#8c8a55' : '#657c48' }));
      s.scatter(new THREE.ConeGeometry(0.2, 1, 4), s.material('#ffffff', { roughness: 1 }), tufts);
    }

    const flicker = a.beam === 'running' ? mix(0.05, 0.3, mood.energy) : 0.02;
    const base = beams.map((beam) => (beam.material as THREE.MeshBasicMaterial).opacity);
    return s.finish({
      footprint: 2.6,
      update: (_dt, time) => {
        const pulse = 1 + Math.sin(time * 24) * flicker * 0.5 + Math.sin(time * 9.7) * flicker;
        beams.forEach((beam, i) => { (beam.material as THREE.MeshBasicMaterial).opacity = base[i] * pulse; });
        placeMotes(time * mix(0.5, 3, mood.energy));
        if (ember) ember.emissiveIntensity = 1.4 + Math.sin(time * 1.3) * 0.8;
      },
    });
  },
});

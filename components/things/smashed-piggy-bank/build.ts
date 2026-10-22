import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    shape: choice('What shape is the money box?', {
      pig: 'A classic standing pig with a snout and curly tail.',
      round: 'A fat round ball of a pig, nearly spherical, on stubby legs.',
      elephant: 'A little elephant with big ears and a raised trunk.',
      jar: 'A plain sealed clay pot with a coin slot, no face at all.',
    }),
    paint: choice('How is it painted?', {
      pink: 'Glossy bubblegum pink.',
      flowers: 'White glaze with hand-painted blue flowers.',
      terracotta: 'Unglazed red terracotta.',
      gold: 'Gilded all over, a lucky charm.',
      dots: 'Yellow with fat white polka dots.',
      black: 'Shiny black with red cheeks.',
    }),
    state: choice('What has happened to it?', {
      whole: 'Still whole and hopeful, a coin poised in the slot, the hammer lying unused.',
      cracked: 'Struck once: a chip knocked out, a few coins leaking, not yet committed.',
      halved: 'Broken clean in two, the face half still intact.',
      shattered: 'Smashed to shards, only the face recognisable.',
    }),
    inside: choice('If it has been opened, what was inside?', {
      pennies: 'A thin scatter of copper pennies. Not much.',
      savings: 'Years of mixed coins and a couple of folded notes.',
      fortune: 'A startling heap of gold coins and tight rolls of notes.',
      iou: 'A folded I.O.U. note and almost nothing else.',
      buttons: 'Buttons, washers and one foreign coin: someone got there first.',
    }),
    counting: choice('Is the money being counted?', {
      spill: 'No: it lies where it fell.',
      stacks: 'Yes: sorted into little stacks in a row.',
      tally: 'Yes: stacks, and a notepad of tally marks with a pencil stub.',
    }),
    hammer: choice('What was the tool?', {
      claw: 'A steel claw hammer from the toolbox.',
      mallet: 'A wooden mallet.',
      toy: 'A red and yellow toy hammer.',
      spoon: 'A heavy soup spoon, the only thing to hand.',
    }),
    cloth: choice('What is it sitting on?', {
      check: 'A red checked tea towel.',
      hanky: 'A white handkerchief.',
      news: 'A sheet of newspaper.',
      velvet: 'A square of dark blue velvet.',
      denim: 'A folded pair of worn jeans.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const baseHex = { pink: '#f29ab4', flowers: '#f4f2ea', terracotta: '#c0693f', gold: '#e2b23a', dots: '#f2c73a', black: '#1f1e22' }[a.paint];
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseHex; ctx.fillRect(0, 0, 256, 128);
    if (a.paint === 'flowers') for (let i = 0; i < 14; i++) {
      const x = random() * 256, y = 24 + random() * 80;
      ctx.fillStyle = '#2a4fb0';
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 5, 4.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#f0c030'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
    if (a.paint === 'dots') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse((i * 47) % 256, 16 + ((i * 31) % 96), 10, 7, 0, 0, 7); ctx.fill(); } }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const gloss = a.paint === 'terracotta' ? 0.9 : mix(0.15, 0.6, mood.wear);
    const glaze = new THREE.MeshStandardMaterial({ map, roughness: gloss, metalness: a.paint === 'gold' ? 0.6 : 0, side: THREE.DoubleSide });
    const plain = new THREE.MeshStandardMaterial({ color: baseHex, roughness: gloss, metalness: a.paint === 'gold' ? 0.6 : 0, side: THREE.DoubleSide });
    const darkPink = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseHex).multiplyScalar(0.78), roughness: gloss });
    const black = s.material('#141416', { roughness: 0.3 });

    // Cloth.
    const clothHex = { check: '#f3efe6', hanky: '#f6f5f0', news: '#dcd8cc', velvet: '#1f2a5c', denim: '#4a6690' }[a.cloth];
    const CW = 0.64, CDp = 0.52;
    const cc = document.createElement('canvas');
    cc.width = 256; cc.height = 200;
    const c2 = cc.getContext('2d')!;
    c2.fillStyle = clothHex; c2.fillRect(0, 0, 256, 200);
    if (a.cloth === 'check') { c2.fillStyle = 'rgba(200,40,50,0.55)'; for (let i = 0; i < 8; i++) { c2.fillRect(i * 32, 0, 16, 200); c2.fillRect(0, i * 32, 256, 16); } }
    if (a.cloth === 'news') { c2.fillStyle = '#2a2a2a'; c2.fillRect(12, 10, 150, 14); c2.fillStyle = '#77736a'; for (let col = 0; col < 4; col++) for (let r = 0; r < 26; r++) c2.fillRect(12 + col * 60, 34 + r * 6, 40 + ((r * 13 + col * 7) % 12), 2); c2.fillStyle = '#8d897e'; c2.fillRect(132, 34, 110, 60); }
    if (a.cloth === 'hanky') { c2.strokeStyle = '#9fb6d6'; c2.lineWidth = 4; c2.strokeRect(10, 10, 236, 180); }
    if (a.cloth === 'denim') { c2.strokeStyle = '#d9a23a'; c2.lineWidth = 2; c2.setLineDash([6, 4]); c2.strokeRect(14, 14, 228, 172); c2.beginPath(); c2.moveTo(128, 14); c2.lineTo(128, 186); c2.stroke(); }
    const clothTex = new THREE.CanvasTexture(cc);
    clothTex.colorSpace = THREE.SRGBColorSpace;
    const clothGeo = new THREE.PlaneGeometry(CW, CDp, 20, 16);
    const pos = clothGeo.attributes.position;
    const ph = random() * 6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const edge = Math.max(Math.abs(x) / (CW / 2), Math.abs(y) / (CDp / 2));
      pos.setZ(i, (Math.sin(x * 23 + ph) * Math.cos(y * 19 + ph) * 0.006 + 0.006) * (0.3 + edge * edge * (a.cloth === 'news' ? 0.4 : 1.4)));
    }
    clothGeo.computeVertexNormals();
    const cloth = s.mesh(clothGeo, new THREE.MeshStandardMaterial({ map: clothTex, roughness: 1, side: THREE.DoubleSide }), [0, 0.002, 0]);
    cloth.rotation.x = -Math.PI / 2;
    cloth.rotation.z = (random() - 0.5) * 0.3;
    if (a.cloth === 'denim') s.box([CW * 0.96, 0.02, CDp * 0.94], [0, -0.008, 0], s.material('#3f5a82', { roughness: 1 })).rotation.y = cloth.rotation.z;
    const G = 0.012;

    // The animal: an ellipsoid body whose long axis is local z, face toward +z.
    const upright = a.shape === 'jar';
    const rad: P3 = { pig: [0.08, 0.078, 0.115], round: [0.108, 0.104, 0.112], elephant: [0.085, 0.09, 0.11], jar: [0.095, 0.105, 0.095] }[a.shape] as P3;
    const legH = a.shape === 'jar' ? 0 : a.shape === 'round' ? 0.018 : 0.035;
    const shell = (start: number, length: number) => {
      const geo = new THREE.SphereGeometry(1, 30, 18, 0, Math.PI * 2, start, length);
      if (!upright) geo.rotateX(Math.PI / 2);
      const mesh = s.mesh(geo, glaze);
      mesh.scale.set(...rad);
      return mesh;
    };
    const faceParts = () => {
      const g = new THREE.Group();
      const add = <T extends THREE.Object3D>(m: T) => { g.add(m); return m; };
      if (a.shape === 'jar') {
        add(s.cylinder(0.03, 0.045, 0.03, [0, rad[1] + 0.005, 0], plain, 16));
        add(s.ball([0.022, 0.018, 0.022], [0, rad[1] + 0.03, 0], plain, 10));
        add(s.box([0.05, 0.008, 0.01], [0, rad[1] * 0.78, rad[2] * 0.62], black)).rotation.x = -0.65;
        return g;
      }
      const fz = rad[2];
      for (const x of [-1, 1]) {
        add(s.ball([0.011, 0.012, 0.008], [x * rad[0] * 0.42, rad[1] * 0.42, fz * 0.83], black, 8));
        if (a.paint === 'black' || a.paint === 'pink') add(s.ball([0.016, 0.012, 0.006], [x * rad[0] * 0.66, rad[1] * 0.08, fz * 0.72], s.material(a.paint === 'black' ? '#d8324a' : '#e0668a'), 8));
      }
      if (a.shape === 'elephant') {
        for (const x of [-1, 1]) { const ear = add(s.ball([0.06, 0.07, 0.012], [x * (rad[0] + 0.03), rad[1] * 0.35, fz * 0.35], plain, 14)); ear.rotation.y = x * 0.5; }
        add(s.tube([[0, -0.005, fz * 0.95], [0, -0.03, fz + 0.045], [0, 0.0, fz + 0.085], [0, 0.05, fz + 0.09], [0, 0.075, fz + 0.07]], 0.018, plain));
        for (const x of [-1, 1]) add(s.rod([x * 0.03, -0.02, fz * 0.9], [x * 0.036, -0.015, fz + 0.05], 0.007, s.material('#f6f1e0'), 0.002));
      } else {
        const snout = add(s.cylinder(0.034, 0.038, 0.035, [0, 0.0, fz + 0.008], darkPink, 16));
        snout.rotation.x = Math.PI / 2;
        for (const x of [-1, 1]) add(s.ball([0.007, 0.01, 0.004], [x * 0.013, 0, fz + 0.027], black, 6));
        for (const x of [-1, 1]) { const ear = add(s.mesh(new THREE.ConeGeometry(0.028, 0.05, 4), plain, [x * rad[0] * 0.55, rad[1] * 0.88, fz * 0.5])); ear.rotation.set(0.5, 0, -x * 0.4); ear.scale.z = 0.45; }
      }
      return g;
    };
    const legs = (zs: number[]) => {
      const g = new THREE.Group();
      if (!legH) return g;
      for (const z of zs) for (const x of [-1, 1]) g.add(s.cylinder(0.022, 0.018, legH + 0.03, [x * rad[0] * 0.55, -rad[1] * 0.82 - legH / 2 + 0.012, z * rad[2] * 0.5], plain, 10));
      return g;
    };
    const tail = () => {
      const g = new THREE.Group();
      if (a.shape === 'jar') return g;
      const pts: P3[] = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([Math.cos(t * 9) * 0.014, 0.02 + Math.sin(t * 9) * 0.014, -rad[2] - t * 0.03]); }
      g.add(s.tube(pts, 0.005, plain));
      return g;
    };
    const slot = () => upright ? new THREE.Group() : s.box([0.008, 0.006, 0.05], [0, rad[1] - 0.001, 0], black);

    const pig = new THREE.Group();
    const heading = 0.55 + (random() - 0.5) * 0.4;
    const px = -0.12, pz = -0.09, py = G + legH + rad[1];
    pig.position.set(px, py, pz);
    pig.rotation.y = heading;
    s.root.add(pig);
    const split = Math.PI * 0.52;
    const opened = a.state !== 'whole';
    const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const sideways = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    // Where the money falls: beside the animal, toward the viewer.
    const spill = new THREE.Vector3(0.06, 0, 0.07);
    void sideways;
    if (a.state === 'whole' || a.state === 'cracked') {
      pig.add(shell(0, Math.PI), faceParts(), legs([-1, 1]), tail(), slot());
      if (a.state === 'whole') {
        const coin = s.cylinder(0.014, 0.014, 0.003, [0, rad[1] + 0.008, upright ? rad[2] * 0.55 : 0], new THREE.MeshStandardMaterial({ color: '#e0b440', metalness: 0.6, roughness: 0.3 }), 14);
        coin.rotation.z = Math.PI / 2;
        if (upright) coin.rotation.set(0, Math.PI / 2, Math.PI / 2);
        pig.add(coin);
      } else {
        // A dark chipped hole in the flank and crack lines running from it.
        const hole = s.ball([0.012, 0.04, 0.045], [rad[0] * 0.93, -0.01, -0.01], black, 10);
        pig.add(hole);
        for (let i = 0; i < 5; i++) { const t = i * 1.3 + random(); pig.add(s.rod([rad[0] * 0.95, -0.01 + Math.sin(t) * 0.03, -0.01 + Math.cos(t) * 0.035], [rad[0] * (0.9 - random() * 0.3), -0.01 + Math.sin(t) * 0.075, -0.01 + Math.cos(t) * 0.09], 0.0025, black)); }
      }
    } else if (a.state === 'halved') {
      const front = new THREE.Group();
      front.add(shell(0, split), faceParts(), legs([1]));
      front.position.set(0, upright ? -rad[1] * 0.45 : -0.012, upright ? 0 : 0.03);
      front.rotation.x = upright ? 2.6 : 0.28;
      if (upright) front.position.set(0.02, -rad[1] * 0.55, 0.16);
      pig.add(front);
      const rear = new THREE.Group();
      rear.add(shell(split, Math.PI - split), legs([-1]), tail());
      if (upright) rear.position.set(0, 0, 0);
      else { rear.position.set(-0.03, -rad[1] + rad[0] * 0.75 - legH, -0.1); rear.rotation.set(0.2, -0.5, Math.PI / 2 + 0.2); }
      pig.add(rear);
    } else {
      const head = new THREE.Group();
      head.add(shell(0, Math.PI * 0.3), faceParts());
      if (upright) { head.position.set(0, -rad[1] * 1.7, 0.02); head.rotation.x = 0.5; }
      else { head.position.set(0, -rad[1] - legH + rad[2] * 0.22, -0.02); head.rotation.x = -1.15; head.rotation.z = 0.2; head.position.y -= rad[2] * 0.62; head.position.y += rad[2] * 0.62 * 0.0; }
      if (!upright) head.position.y = -rad[1] - legH - rad[2] * 0.42;
      pig.add(head);
    }
    if (a.state !== 'whole') {
      // Shards: patches of the same shell, lying where they fell.
      const n = a.state === 'cracked' ? 3 : a.state === 'halved' ? 7 : 16 + Math.round(mood.energy * 8);
      for (let i = 0; i < n; i++) {
        const geo = new THREE.SphereGeometry(1, 5, 4, random() * 6, 0.4 + random() * 0.8, 0.6 + random() * 1.4, 0.3 + random() * 0.6);
        geo.scale(rad[0], rad[1], rad[2]);
        geo.computeBoundingBox();
        const centre = geo.boundingBox!.getCenter(new THREE.Vector3());
        geo.translate(-centre.x, -centre.y, -centre.z);
        const far = a.state === 'shattered' ? 0.05 + random() * 0.2 : 0.08 + random() * 0.1;
        const t = random() * Math.PI * 2;
        const at = a.state === 'cracked' ? new THREE.Vector3(px + 0.13 + random() * 0.06, 0, pz + 0.06 + random() * 0.08) : new THREE.Vector3(px + Math.cos(t) * far * 1.2, 0, pz + Math.sin(t) * far);
        const shard = s.mesh(geo, glaze, [at.x, G + 0.012 + random() * 0.01, at.z]);
        shard.rotation.set(random() * 6, random() * 6, random() * 6);
      }
    }

    // Money.
    const gold = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.32, emissive: '#3a2600', emissiveIntensity: mix(0.1, 0.6, mood.cheer) });
    const coinHex = { pennies: ['#b8693a', '#a85a30', '#c27844'], savings: ['#b8693a', '#c9cdd0', '#d9b84a', '#c9cdd0'], fortune: ['#e9b93c', '#f2c94c', '#dba92c'], iou: ['#b8693a'], buttons: ['#b8693a'] }[a.inside];
    const amount = !opened ? 0 : Math.round({ pennies: 9, savings: 40, fortune: 90, iou: 2, buttons: 1 }[a.inside] * mix(0.6, 1.5, mood.density) * (a.state === 'cracked' ? 0.25 : 1));
    const counted = opened && a.counting !== 'spill' && a.state !== 'cracked';
    const loose = counted ? Math.ceil(amount * 0.35) : amount;
    const reach = a.inside === 'fortune' ? 0.13 : 0.1;
    const pts = Array.from({ length: loose }, () => {
      const r = Math.sqrt(random()) * reach, t = random() * Math.PI * 2;
      const heap = a.inside === 'fortune' ? Math.max(0, 0.05 - r * 0.4) * random() : random() * 0.006;
      return { at: [spill.x + Math.cos(t) * r * 1.3, G + 0.004 + heap, spill.z + Math.sin(t) * r] as P3, size: 0.75 + random() * 0.5, color: coinHex[Math.floor(random() * coinHex.length)] };
    });
    if (pts.length) s.scatter(new THREE.CylinderGeometry(0.017, 0.017, 0.004, 12), gold, pts);
    if (counted) {
      const stacks = Math.max(2, Math.min(9, Math.round((amount - loose) / 5)));
      for (let i = 0; i < stacks; i++) {
        const h = 0.008 + random() * 0.03 * (a.inside === 'fortune' ? 1.8 : 1);
        const x = -0.2 + (i % 5) * 0.045, z = 0.16 + Math.floor(i / 5) * 0.045;
        const stack = s.cylinder(0.017, 0.017, h * 1.3, [x + (random() - 0.5) * 0.004, G + h * 0.65, z], new THREE.MeshStandardMaterial({ color: coinHex[i % coinHex.length], metalness: 0.55, roughness: 0.35 }), 12);
        stack.rotation.y = random();
      }
    }
    if (opened && (a.inside === 'savings' || a.inside === 'fortune') && a.state !== 'cracked') {
      const note = s.material('#86a97c', { roughness: 1 });
      const k = a.inside === 'fortune' ? 4 + Math.round(mood.density * 3) : 2;
      for (let i = 0; i < k; i++) {
        if (a.inside === 'fortune') { const roll = s.cylinder(0.016, 0.016, 0.065, [spill.x + (random() - 0.5) * 0.2, G + 0.018, spill.z + 0.02 + (random() - 0.5) * 0.14], note, 10); roll.rotation.set(Math.PI / 2, 0, random() * 3); s.cylinder(0.0165, 0.0165, 0.012, roll.position.toArray() as P3, s.material('#c9482e'), 10).rotation.copy(roll.rotation); }
        else { const bill = s.box([0.075, 0.004, 0.034], [spill.x + (random() - 0.5) * 0.14, G + 0.012, spill.z + (random() - 0.5) * 0.1], note); bill.rotation.set((random() - 0.5) * 0.4, random() * 3, 0); }
      }
    }
    if (opened && a.inside === 'iou') {
      const iou = s.label('I.O.U.', 0.19, 0.11, [spill.x + 0.02, G + 0.016, spill.z + 0.02], '#1b2a6b', '#f3ecd6');
      iou.rotation.set(-Math.PI / 2 + 0.12, 0, (random() - 0.5) * 0.5);
    }
    if (opened && a.inside === 'buttons') {
      const hexes = ['#c8322c', '#2f5fb0', '#f1ead6', '#2c2c2c', '#3f8a55', '#e0a030'];
      for (let i = 0; i < 12 + Math.round(mood.density * 10); i++) {
        const r = Math.sqrt(random()) * 0.11, t = random() * 6.28;
        const at: P3 = [spill.x + Math.cos(t) * r * 1.3, G + 0.005, spill.z + Math.sin(t) * r];
        if (i % 4 === 0) s.ring(0.01, 0.0035, at, new THREE.MeshStandardMaterial({ color: '#b9bec2', metalness: 0.6, roughness: 0.35 })).rotation.x = Math.PI / 2;
        else s.cylinder(0.011 + random() * 0.006, 0.011, 0.004, at, s.material(hexes[i % 6], { roughness: 0.4 }), 12);
      }
    }
    if (counted && a.counting === 'tally') {
      const pad = s.label('|||| |||| ||', 0.11, 0.075, [0.22, G + 0.012, 0.17], '#2a2a2a', '#f6f0d8');
      pad.rotation.set(-Math.PI / 2, 0, -0.2);
      s.rod([0.1, G + 0.016, 0.21], [0.18, G + 0.016, 0.225], 0.005, s.material('#e0b030'), 0.005);
      s.rod([0.18, G + 0.016, 0.225], [0.192, G + 0.016, 0.227], 0.005, s.material('#2a2a2a'), 0.001);
    }

    // The tool.
    const tool = new THREE.Group();
    const used = a.state !== 'whole';
    tool.position.set(0.2, G + 0.02, used ? -0.12 : 0.04);
    tool.rotation.y = used ? 0.9 + random() * 0.5 : -0.25 + random() * 0.3;
    s.root.add(tool);
    const wood = s.material('#a5743e');
    if (a.hammer === 'claw') {
      tool.add(s.rod([0, 0, -0.14], [0, 0, 0.12], 0.012, wood, 0.01));
      const steel = new THREE.MeshStandardMaterial({ color: '#8f979c', metalness: 0.6, roughness: 0.35 });
      const head = s.cylinder(0.02, 0.02, 0.07, [0.012, 0, 0.12], steel, 12); head.rotation.z = Math.PI / 2; tool.add(head);
      const claw = s.mesh(new THREE.ConeGeometry(0.018, 0.06, 4), steel, [-0.05, 0.004, 0.125]); claw.rotation.z = Math.PI / 2 + 0.3; claw.scale.z = 0.5; tool.add(claw);
    } else if (a.hammer === 'mallet') {
      tool.add(s.rod([0, 0.012, -0.14], [0, 0.012, 0.12], 0.011, wood));
      const head = s.cylinder(0.034, 0.034, 0.1, [0, 0.014, 0.12], s.material('#c69a5c'), 14); head.rotation.z = Math.PI / 2; tool.add(head);
    } else if (a.hammer === 'toy') {
      tool.add(s.rod([0, 0.01, -0.1], [0, 0.01, 0.1], 0.012, s.material('#f0c020', { roughness: 0.4 })));
      const head = s.cylinder(0.036, 0.036, 0.1, [0, 0.016, 0.1], s.material('#e02a2a', { roughness: 0.35 }), 14); head.rotation.z = Math.PI / 2; tool.add(head);
      for (const x of [-0.052, 0.052]) { const cap = s.cylinder(0.039, 0.039, 0.012, [x, 0.016, 0.1], s.material('#f0c020'), 14); cap.rotation.z = Math.PI / 2; tool.add(cap); }
    } else {
      const silver = new THREE.MeshStandardMaterial({ color: '#d5dadd', metalness: 0.6, roughness: 0.25 });
      tool.add(s.rod([0, -0.008, -0.12], [0, -0.004, 0.06], 0.006, silver, 0.004));
      tool.add(s.ball([0.024, 0.008, 0.034], [0, -0.006, 0.09], silver, 12));
    }
    return s.finish();
  },
});

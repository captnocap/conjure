import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    state: choice('What is the cooker doing right now?', {
      cooking: 'Cooking: lid shut, red lamp on, steam jetting from the vent.',
      warm: 'Keeping warm: lid shut, orange lamp glowing, waiting for whoever is late.',
      open: 'Open: the lid stands up, steam rises from white rice and the paddle is stuck in it.',
      washed: 'Unplugged and washed: lid open, the inner pot upturned beside it to dry.',
    }),
    print: choice('What is printed round its body?', {
      poppies: 'Big orange and red poppies with brown centres, loudly 1970s.',
      roses: 'Small pink roses and trailing green leaves.',
      cornflowers: 'Blue cornflowers scattered on white.',
      daisies: 'Yellow and brown daisies in a tidy row.',
      ferns: 'Green fern fronds and tiny white blossoms.',
      plain: 'No print: plain enamel with a single coloured stripe.',
    }),
    trim: choice('What colour are the lid and base?', {
      white: 'White, clean and neutral.',
      orange: 'Burnt orange.',
      avocado: 'Avocado green.',
      brown: 'Chocolate brown.',
      pink: 'Powder pink.',
    }),
    amount: score('How much rice is in it?', ['Scraped down to a browned crust', 'A couple of servings left', 'Half a pot', 'Full and freshly fluffed']),
    beside: choice('What is beside it?', {
      nothing: 'Nothing.',
      bowl: 'One filled rice bowl with chopsticks laid across it.',
      stack: 'A stack of empty bowls waiting for the family.',
      onigiri: 'A plate of rice balls wrapped with strips of seaweed.',
      sack: 'A paper sack of rice and a measuring cup.',
    }),
    handle: noul('Is its wire carrying handle raised, as if it is about to be carried to the table?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.13, bodyTop = 0.2;
    const closed = a.state === 'cooking' || a.state === 'warm';
    const powered = a.state !== 'washed';
    const age = new THREE.Color('#ffffff').lerp(new THREE.Color('#e2d6b0'), mood.wear * 0.7);
    const trimColour = { white: '#f3f0e6', orange: '#d2691e', avocado: '#7d8a3c', brown: '#5a3a26', pink: '#eab4bd' }[a.trim];
    const trim = s.material(new THREE.Color(trimColour).multiply(age), { roughness: 0.38 });
    const dark = s.material('#24201e', { roughness: 0.5 });
    const chrome = s.material('#d5dadb', { metalness: 0.9, roughness: 0.2 });
    const alu = new THREE.MeshStandardMaterial({ color: '#c5c9c8', metalness: 0.75, roughness: 0.4, side: THREE.DoubleSide });

    // --- Printed body ------------------------------------------------------------------------------
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const c = canvas.getContext('2d') as Ctx;
    c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, 1024, 256);
    const leaf = (x: number, y: number, len: number, turn: number, colour: string) => { c.fillStyle = colour; c.beginPath(); c.ellipse(x + Math.cos(turn) * len * 0.5, y + Math.sin(turn) * len * 0.5, len * 0.5, len * 0.2, turn, 0, 7); c.fill(); };
    const bloom = (x: number, y: number, r: number, petals: number, colour: string, heart: string, round = 0.55) => {
      c.fillStyle = colour;
      for (let k = 0; k < petals; k++) { const ang = (k / petals) * 6.283; c.beginPath(); c.ellipse(x + Math.cos(ang) * r * 0.55, y + Math.sin(ang) * r * 0.55, r * 0.55, r * round * 0.6, ang, 0, 7); c.fill(); }
      c.fillStyle = heart; c.beginPath(); c.arc(x, y, r * 0.26, 0, 7); c.fill();
    };
    const repeats = 6;
    for (let k = 0; k < repeats; k++) {
      const x = (k + 0.5) * 1024 / repeats, y = 128 + (k % 2 ? 22 : -18);
      if (a.print === 'poppies') { leaf(x - 20, y + 40, 80, 0.5, '#5a7a2f'); leaf(x + 10, y + 50, 70, 2.4, '#6a8a3a'); bloom(x, y, 62, 5, k % 2 ? '#e8531c' : '#f08a1c', '#4a2a14', 0.9); bloom(x + 70, y + 46, 30, 5, '#d9381c', '#4a2a14', 0.9); }
      else if (a.print === 'roses') { for (let l = 0; l < 4; l++) leaf(x, y, 62, l * 1.6 + 0.4, '#5f8a4a'); for (const [dx, dy, r] of [[0, 0, 40], [48, 28, 26], [-44, 34, 22]]) { bloom(x + dx, y + dy, r, 6, '#e8809a', '#c0486a', 0.9); bloom(x + dx, y + dy, r * 0.55, 5, '#f2a9b8', '#c0486a', 0.9); } }
      else if (a.print === 'cornflowers') { for (const [dx, dy, r] of [[0, 0, 44], [60, -50, 28], [-50, 54, 30]]) { c.strokeStyle = '#4a7a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx + 10, y + dy + 70); c.stroke(); bloom(x + dx, y + dy, r, 12, '#3a5fc0', '#1f2f6a', 0.3); } }
      else if (a.print === 'daisies') { c.fillStyle = '#8a5a2c'; c.fillRect(x - 90, 196, 180, 10); c.fillRect(x - 90, 50, 180, 10); bloom(x, 128, 56, 12, k % 2 ? '#f2c21c' : '#8a5a2c', k % 2 ? '#8a5a2c' : '#f2c21c', 0.38); }
      else if (a.print === 'ferns') { for (let l = 0; l < 9; l++) { leaf(x - 40 + l * 10, y + 60 - l * 14, 44 - l * 3, -0.5, '#3f7a4a'); leaf(x - 40 + l * 10, y + 60 - l * 14, 44 - l * 3, -2.4, '#4f8a55'); } bloom(x + 56, y + 30, 14, 5, '#ffffff', '#e6c25a', 0.9); bloom(x + 74, y - 20, 11, 5, '#ffffff', '#e6c25a', 0.9); }
    }
    if (a.print === 'plain') { c.fillStyle = trimColour === '#f3f0e6' ? '#c0282c' : trimColour; c.fillRect(0, 170, 1024, 22); c.fillRect(0, 200, 1024, 6); }
    if (mood.wear > 0.3) { c.fillStyle = `rgba(226,214,176,${mood.wear * 0.45})`; c.fillRect(0, 0, 1024, 256); for (let k = 0; k < mood.wear * 30; k++) { c.fillStyle = 'rgba(110,80,40,0.25)'; c.fillRect(random() * 1024, random() * 256, 2 + random() * 26, 1.5); } }
    const printMap = new THREE.CanvasTexture(canvas); printMap.colorSpace = THREE.SRGBColorSpace; printMap.wrapS = THREE.RepeatWrapping;
    printMap.offset.x = random();
    const enamel = new THREE.MeshStandardMaterial({ map: printMap, color: age, roughness: 0.3 });
    for (let k = 0; k < 3; k++) s.cylinder(0.018, 0.02, 0.012, [Math.cos(k * 2.094 + 1.57) * 0.095, 0.006, Math.sin(k * 2.094 + 1.57) * 0.095], dark, 10);
    s.cylinder(R - 0.006, R - 0.012, 0.03, [0, 0.025, 0], trim, 40);
    s.mesh(new THREE.CylinderGeometry(R, R - 0.004, bodyTop - 0.05, 48, 1, true), enamel, [0, 0.04 + (bodyTop - 0.05) / 2, 0]);
    s.ring(R - 0.001, 0.006, [0, bodyTop - 0.008, 0], chrome).rotation.x = Math.PI / 2;
    s.ring(R - 0.004, 0.004, [0, 0.041, 0], chrome).rotation.x = Math.PI / 2;

    // --- Control panel ---------------------------------------------------------------------------
    s.box([0.094, 0.082, 0.02], [0, 0.098, R - 0.004], chrome);
    s.box([0.084, 0.072, 0.02], [0, 0.098, R - 0.001], dark);
    const lampOn = (colour: string, on: boolean) => new THREE.MeshStandardMaterial({ color: on ? colour : '#5a3a34', emissive: colour, emissiveIntensity: on ? mix(1.6, 3.2, mood.warmth) : 0, roughness: 0.4 });
    const cookLamp = lampOn('#ff3a1c', a.state === 'cooking');
    const warmLamp = lampOn('#ffa01c', a.state === 'warm' || a.state === 'open');
    s.cylinder(0.009, 0.009, 0.008, [-0.02, 0.118, R + 0.011], cookLamp, 12).rotation.x = Math.PI / 2;
    s.cylinder(0.009, 0.009, 0.008, [0.02, 0.118, R + 0.011], warmLamp, 12).rotation.x = Math.PI / 2;
    s.box([0.06, 0.004, 0.002], [0, 0.102, R + 0.01], s.material('#e9e4d2'));
    const lever = s.box([0.034, 0.016, 0.03], [0, a.state === 'cooking' ? 0.074 : 0.086, R + 0.016], s.material('#f1ebdc', { roughness: 0.4 }));
    lever.rotation.x = a.state === 'cooking' ? 0.5 : -0.2;
    // Side lugs, and the paddle in its holder.
    for (const x of [-1, 1]) s.box([0.03, 0.022, 0.07], [x * (R + 0.012), bodyTop - 0.04, 0], dark);
    const paddleWhite = s.material('#f6f3ea', { roughness: 0.5 });
    const paddle = (x: number, y: number, z: number, tilt: [number, number, number]) => {
      const group = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.007), paddleWhite); shaft.position.y = 0.05;
      const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), paddleWhite); blade.scale.set(0.034, 0.045, 0.005); blade.position.y = -0.03;
      for (const part of [shaft, blade]) { part.castShadow = true; group.add(part); }
      group.position.set(x, y, z); group.rotation.set(...tilt);
      s.root.add(group);
      return group;
    };
    s.box([0.012, 0.05, 0.05], [R + 0.03, 0.09, 0.045], s.material('#e9e4d2', { roughness: 0.3 }));
    s.box([0.026, 0.008, 0.05], [R + 0.018, 0.068, 0.045], s.material('#e9e4d2', { roughness: 0.3 }));
    if (a.state !== 'open') paddle(R + 0.018, 0.15, 0.045, [0, Math.PI / 2, 0.06]);

    // --- Lid on its hinge ------------------------------------------------------------------------
    s.box([0.07, 0.03, 0.03], [0, bodyTop - 0.005, -R - 0.008], dark);
    const hinge = new THREE.Group();
    hinge.position.set(0, bodyTop, -R);
    hinge.rotation.x = closed ? 0 : -mix(1.45, 1.75, random());
    s.root.add(hinge);
    const onLid = <T extends THREE.Object3D>(mesh: T) => { const p = mesh.position.clone(); hinge.add(mesh); mesh.position.set(p.x, p.y, p.z + R); return mesh; };
    onLid(s.lathe([[0, 0], [R + 0.002, 0], [R - 0.004, 0.012], [0.1, 0.034], [0.05, 0.05], [0, 0.052]], trim));
    onLid(s.cylinder(R - 0.012, R - 0.012, 0.004, [0, -0.002, 0], alu, 32));
    onLid(s.box([0.085, 0.014, 0.024], [0, 0.074, 0.01], dark));
    for (const x of [-1, 1]) onLid(s.box([0.012, 0.03, 0.02], [x * 0.034, 0.058, 0.01], dark));
    onLid(s.cylinder(0.02, 0.024, 0.016, [0, 0.05, -0.07], chrome, 14));
    onLid(s.cylinder(0.008, 0.008, 0.004, [0, 0.059, -0.07], dark, 10));
    onLid(s.box([0.05, 0.018, 0.012], [0, 0.012, R - 0.004], chrome));

    // Wire carrying handle.
    const bail = s.ring(R + 0.022, 0.0045, [0, bodyTop - 0.04, 0], chrome, Math.PI);
    bail.rotation.x = a.handle && closed ? (random() - 0.5) * 0.3 : Math.PI / 2 + 0.25;
    if (!(a.handle && closed)) bail.scale.y = 1.0;

    // --- Steam -----------------------------------------------------------------------------------
    const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.36, depthWrite: false });
    const puffs: { mesh: THREE.Mesh; from: [number, number, number]; offset: number; reach: number; spread: number }[] = [];
    const steam = (from: [number, number, number], count: number, reach: number, spread: number) => {
      for (let k = 0; k < count; k++) { const mesh = s.ball([0.02, 0.026, 0.02], from, vapour, 8); mesh.castShadow = mesh.receiveShadow = false; puffs.push({ mesh, from, offset: k / count + random() * 0.1, reach, spread }); }
    };
    if (a.state === 'cooking') steam([0, bodyTop + 0.07, -0.07], 6, 0.36, 0.035);
    else if (a.state === 'warm') steam([0, bodyTop + 0.07, -0.07], 2, 0.14, 0.02);

    // --- Inside, when the lid is up -----------------------------------------------------------------
    const riceWhite = new THREE.MeshStandardMaterial({ color: '#fbfaf4', roughness: 0.9, flatShading: true });
    const potR = R - 0.014;
    if (a.state === 'open') {
      s.mesh(new THREE.CylinderGeometry(potR, potR - 0.006, 0.15, 36, 1, true), alu, [0, bodyTop - 0.075, 0]);
      s.ring(potR + 0.002, 0.004, [0, bodyTop + 0.001, 0], alu).rotation.x = Math.PI / 2;
      const level = mix(0.075, bodyTop - 0.03, a.amount);
      const scooped = a.amount > 0.18;
      const sx = (random() - 0.5) * 0.06, sz = 0.03 + random() * 0.03;
      const surface = new THREE.RingGeometry(0.0001, potR - 0.003, 40, 9);
      const p = surface.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const x = p.getX(v), z = -p.getY(v);
        const edge = Math.hypot(x, z) / potR;
        let y = (random() - 0.5) * 0.008 + (1 - edge * edge) * 0.014 * a.amount;
        if (scooped) y -= 0.034 * Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / 0.0014);
        p.setXYZ(v, x, y, z);
      }
      surface.computeVertexNormals();
      const crust = a.amount < 0.18;
      s.mesh(surface, crust ? new THREE.MeshStandardMaterial({ color: '#d9b06a', roughness: 0.95, flatShading: true, side: THREE.DoubleSide }) : Object.assign(riceWhite, { side: THREE.DoubleSide }), [0, level, 0]);
      if (crust) for (let k = 0; k < 12; k++) s.ball([0.012, 0.006, 0.012], [Math.cos(k * 1.7) * potR * random() * 0.8, level + 0.004, Math.sin(k * 1.7) * potR * random() * 0.8], riceWhite, 5);
      const stuck = paddle(sx - 0.02, level + 0.075, sz - 0.03, [0.5, 0.4, -0.5]);
      for (let k = 0; k < 4; k++) { const grain = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), riceWhite); grain.position.set((random() - 0.5) * 0.04, -0.03 - random() * 0.03, 0.006); stuck.add(grain); }
      if (!crust) steam([0, level + 0.05, 0], 5, 0.3, 0.06);
    } else if (a.state === 'washed') {
      s.cylinder(potR - 0.004, potR - 0.004, 0.006, [0, 0.06, 0], dark, 28);
      s.cylinder(0.045, 0.045, 0.008, [0, 0.066, 0], chrome, 20);
      s.mesh(new THREE.CylinderGeometry(potR + 0.004, potR + 0.004, 0.14, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#3a3632', roughness: 0.8, side: THREE.BackSide }), [0, bodyTop - 0.07, 0]);
      // Inner pot upturned on a dish towel.
      const px = -(R + 0.2), pz = 0.06;
      const towel = document.createElement('canvas'); towel.width = towel.height = 64;
      const tc = towel.getContext('2d')!; tc.fillStyle = '#f3f1ea'; tc.fillRect(0, 0, 64, 64); tc.fillStyle = 'rgba(63,106,154,0.55)'; for (let k = 0; k < 4; k++) { tc.fillRect(k * 16, 0, 8, 64); tc.fillRect(0, k * 16, 64, 8); }
      const towelMap = new THREE.CanvasTexture(towel); towelMap.colorSpace = THREE.SRGBColorSpace; towelMap.wrapS = towelMap.wrapT = THREE.RepeatWrapping; towelMap.repeat.set(3, 3);
      s.mesh(new THREE.BoxGeometry(0.34, 0.005, 0.3), new THREE.MeshStandardMaterial({ map: towelMap, roughness: 1 }), [px, 0.0025, pz]).rotation.y = (random() - 0.5) * 0.5;
      s.lathe([[potR + 0.006, 0], [potR, 0.004], [potR - 0.004, 0.13], [potR - 0.03, 0.15], [0, 0.152]], alu, [px, 0.005, pz]);
      for (let k = 0; k < 5; k++) s.ball([0.005, 0.003, 0.005], [px + (random() - 0.5) * 0.14, 0.158, pz + (random() - 0.5) * 0.14], new THREE.MeshStandardMaterial({ color: '#dff0f4', roughness: 0.05, metalness: 0.3 }), 6);
    }

    // --- Cord ------------------------------------------------------------------------------------
    const flex = s.material('#2a2623', { roughness: 0.8 });
    if (powered) {
      const wander = (random() - 0.5) * 0.12;
      s.box([0.03, 0.022, 0.03], [0.05, 0.05, -R - 0.006], dark);
      s.tube([[0.05, 0.05, -R - 0.02], [0.07, 0.01, -R - 0.07], [0.15 + wander, 0.006, -R - 0.12], [0.24, 0.006, -R - 0.08 + wander], [0.32, 0.006, -R - 0.15]], 0.005, flex);
      s.box([0.03, 0.02, 0.04], [0.33, 0.01, -R - 0.165], s.material('#e9e4d2')).rotation.y = -0.4;
    } else {
      for (let k = 0; k < 3; k++) s.ring(0.045 + k * 0.004, 0.005, [R + 0.11, 0.006 + k * 0.009, -0.1], flex).rotation.x = Math.PI / 2;
      s.box([0.03, 0.02, 0.04], [R + 0.11, 0.035, -0.09], s.material('#e9e4d2')).rotation.y = 0.6;
    }

    // --- Beside it -------------------------------------------------------------------------------
    const bx = R + 0.18, bz = 0.12;
    const bowlGlaze = s.material(['#2f4a7a', '#8a1c16', '#eef0ea', '#5a7a5a'][Math.floor(random() * 4)], { roughness: 0.3, side: THREE.DoubleSide });
    const bowl = (x: number, y: number, z: number, glaze: THREE.Material = bowlGlaze) => s.lathe([[0, 0.008], [0.026, 0.008], [0.026, 0], [0.03, 0], [0.058, 0.05], [0.062, 0.062], [0.056, 0.05], [0.028, 0.014], [0, 0.014]], glaze, [x, y, z]);
    if (a.beside === 'bowl') {
      bowl(bx, 0, bz);
      s.ball([0.052, 0.03, 0.052], [bx, 0.058, bz], riceWhite, 9);
      for (const off of [-0.006, 0.006]) s.rod([bx - 0.1, 0.066, bz + 0.03 + off], [bx + 0.1, 0.066, bz - 0.02 + off], 0.003, s.material('#5a2a1c'));
    } else if (a.beside === 'stack') {
      const bowls = 3 + Math.floor(random() * 2 + mood.density * 2);
      for (let k = 0; k < bowls; k++) bowl(bx, k * 0.02, bz);
      for (let k = 0; k < 4; k++) s.rod([bx - 0.09 + k * 0.007, 0.004, bz + 0.085], [bx + 0.1 + k * 0.004, 0.004, bz + 0.105], 0.003, s.material('#5a2a1c'));
    } else if (a.beside === 'onigiri') {
      s.cylinder(0.12, 0.1, 0.012, [bx + 0.02, 0.006, bz], s.material('#3f5f8a', { roughness: 0.35 }), 28);
      const nori = s.material('#1a221c', { roughness: 0.8 });
      const balls = 2 + Math.floor(random() * 2 + mood.density);
      for (let k = 0; k < balls; k++) {
        const ang = k / balls * 6.283 + 0.4, ox = bx + 0.02 + Math.cos(ang) * 0.055, oz = bz + Math.sin(ang) * 0.055;
        const ball = s.mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 3), riceWhite, [ox, 0.012 + 0.036, oz]);
        ball.rotation.set(Math.PI / 2, 0, Math.PI, 'YXZ'); ball.rotation.y = -ang + 1.2;
        const wrap = s.box([0.03, 0.034, 0.034], [ox, 0.012 + 0.02, oz], nori); wrap.rotation.y = -ang + 1.2;
      }
    } else if (a.beside === 'sack') {
      const sack = s.box([0.17, 0.24, 0.09], [bx + 0.03, 0.12, bz - 0.06], s.material('#d9c9a0', { roughness: 0.95 })); sack.rotation.y = -0.3;
      const label = s.box([0.1, 0.1, 0.004], [bx + 0.03 + 0.013, 0.13, bz - 0.06 + 0.044], s.material('#b0242c', { roughness: 0.8 })); label.rotation.y = -0.3;
      s.box([0.18, 0.03, 0.03], [bx + 0.03, 0.25, bz - 0.06], s.material('#c9b88a', { roughness: 0.95 })).rotation.y = -0.3;
      s.mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.06, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#e9eef0', roughness: 0.3, side: THREE.DoubleSide }), [bx - 0.02, 0.03, bz + 0.1]);
      s.cylinder(0.034, 0.034, 0.03, [bx - 0.02, 0.016, bz + 0.1], riceWhite, 14);
      for (let k = 0; k < 14; k++) s.ball([0.004, 0.0025, 0.0025], [bx - 0.02 + (random() - 0.5) * 0.16, 0.003, bz + 0.12 + (random() - 0.5) * 0.1], riceWhite, 5).rotation.y = random() * 3;
    }
    if (mood.density > 0.6) {
      s.cylinder(0.022, 0.022, 0.07, [-R - 0.07, 0.035, 0.14], new THREE.MeshStandardMaterial({ color: '#7a5a2c', roughness: 0.4 }), 12);
      s.cylinder(0.024, 0.024, 0.016, [-R - 0.07, 0.078, 0.14], s.material('#c0282c', { roughness: 0.4 }), 12);
    }

    const pace = mix(0.25, 0.95, mood.energy);
    const lampBase = mix(1.6, 3.2, mood.warmth);
    return s.finish({
      update(_dt, time) {
        if (a.state === 'cooking') cookLamp.emissiveIntensity = lampBase;
        if (a.state === 'warm' || a.state === 'open') warmLamp.emissiveIntensity = lampBase * (0.9 + 0.1 * Math.sin(time * 1.5));
        for (const { mesh, from, offset, reach, spread } of puffs) {
          const k = (time * pace + offset) % 1;
          mesh.position.set(from[0] + Math.sin(k * 5 + offset * 9) * spread * (0.3 + k), from[1] + k * reach, from[2] + Math.cos(k * 4 + offset * 7) * spread * (0.3 + k));
          mesh.scale.setScalar(0.018 * (0.8 + k * 2.6));
        }
      },
    });
  },
});

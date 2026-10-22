import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { glow, paint, pick, pickSkin, rig } from './rig';

export default defineThing({
  questions: {
    size: choice('How big is the machine?', {
      bedroom: 'A small 400-watt box the size of a shoebox, a bedroom disco unit.',
      club: 'A mid-size club unit with a carry handle and a hanging bracket.',
      cannon: 'A big stage cannon on a tilting cradle, nozzle pointed up at the ceiling.',
    }),
    state: choice('What is it doing right now?', {
      firing: 'Firing: a thick cone of haze pouring from the nozzle.',
      cooling: 'Cooling down: a thin wisp, the heater light off.',
      ready: 'Heated and ready: a green light, nothing out yet.',
      empty: 'Run dry: the fluid light flashing red, the jug upended beside it.',
    }),
    casing: choice('What does the casing look like?', {
      black: 'Matt black steel.',
      red: 'Glossy red with a black front.',
      silver: 'Brushed aluminium.',
      battered: 'Black paint scuffed through to the metal, gaffer tape on the corners.',
    }),
    jug: choice('What fluid is beside it?', {
      blue: 'A blue five-litre jug of fog fluid.',
      clear: 'A clear jug half full of fluid.',
      drum: 'A white drum with a hand-written label.',
      none: 'No jug, just the machine.',
    }),
    lead: choice('What about the power lead?', {
      tangled: 'A long tangled lead with a wired remote on the end.',
      coiled: 'A neatly coiled lead.',
      extension: 'A four-way extension block with the lead plugged in.',
    }),
    co2: noul('Does a CO2 jet gun lean against it?'),
    crew: noul('Does a crew hand crouch beside it, refilling the tank from the jug?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dims = { bedroom: [0.32, 0.15, 0.22], club: [0.46, 0.2, 0.34], cannon: [0.62, 0.3, 0.52] }[a.size] as [number, number, number];
    const [W, H, D] = dims;
    const shellColour = { black: '#232427', red: '#b8252a', silver: '#b9bec3', battered: '#2a2b2e' }[a.casing];
    const shell = s.material(shellColour, { roughness: a.casing === 'red' ? 0.3 : a.casing === 'silver' ? 0.35 : 0.65, metalness: a.casing === 'silver' ? 0.7 : 0.25 });
    const dark = s.material('#111214', { roughness: 0.8 });
    const steel = s.material('#9ea3a8', { metalness: 0.7, roughness: 0.35 });
    const firing = a.state === 'firing';

    // The body, on a cradle when it is a cannon.
    const body = new THREE.Group();
    s.root.add(body);
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; body.add(mesh); return mesh; };
    let lift = 0.02;
    if (a.size === 'cannon') {
      lift = 0.14;
      for (const sx of [-1, 1]) {
        const plate = s.box([0.03, 0.26, 0.5], [sx * (W / 2 + 0.03), 0.13, -0.02], steel);
        void plate;
        s.cylinder(0.035, 0.035, 0.04, [sx * (W / 2 + 0.05), lift + H * 0.4, 0], dark, 12).rotation.z = Math.PI / 2;
      }
      s.box([W + 0.12, 0.03, 0.5], [0, 0.015, -0.02], steel);
      body.rotation.x = -0.5;
    } else for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.cylinder(0.015, 0.018, 0.02, [sx * (W / 2 - 0.03), 0.01, sz * (D / 2 - 0.03)], dark, 8);
    body.position.y = lift + H / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), shell));
    // A black front plate with the heat shield and nozzle, and a top panel with the lights.
    add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, H * 0.9, 0.012), dark)).position.z = D / 2 + 0.004;
    const nozzleR = W * 0.06;
    const shield = add(new THREE.Mesh(new THREE.CylinderGeometry(nozzleR * 2.6, nozzleR * 2.6, 0.02, 16), dark));
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0, H * 0.05, D / 2 + 0.02);
    const nozzle = add(new THREE.Mesh(new THREE.CylinderGeometry(nozzleR, nozzleR * 1.15, 0.05, 14), steel));
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, H * 0.05, D / 2 + 0.035);
    const hot = glow(firing ? '#ff8a2a' : a.state === 'cooling' ? '#8a3a1a' : '#2a1a14', firing ? 2.2 : a.state === 'cooling' ? 0.6 : 0);
    const throat = add(new THREE.Mesh(new THREE.CircleGeometry(nozzleR * 0.85, 12), hot));
    throat.position.set(0, H * 0.05, D / 2 + 0.061);
    // Vent slots down each side.
    const slots = paint(128, 64, (c, w, h) => { c.fillStyle = shellColour; c.fillRect(0, 0, w, h); c.fillStyle = '#0a0a0c'; for (let y = 8; y < h; y += 10) c.fillRect(10, y, w - 20, 4); });
    for (const sx of [-1, 1]) {
      const vent = add(new THREE.Mesh(new THREE.PlaneGeometry(D * 0.5, H * 0.5), new THREE.MeshStandardMaterial({ map: slots, roughness: 0.7 })));
      vent.position.set(sx * (W / 2 + 0.001), 0, -D * 0.1);
      vent.rotation.y = sx * Math.PI / 2;
    }
    // Top: tank cap, status lights, a handle on the club unit, a bracket on the back.
    add(new THREE.Mesh(new THREE.CylinderGeometry(W * 0.07, W * 0.07, 0.02, 12), s.material('#e6c21c', { roughness: 0.5 }))).position.set(-W * 0.3, H / 2 + 0.01, -D * 0.2);
    const heaterLed = glow(a.state === 'ready' || firing ? '#3dff5a' : '#1a2a1a', a.state === 'ready' || firing ? 2 : 0);
    const fluidLed = glow(a.state === 'empty' ? '#ff2a2a' : '#2a1a1a', a.state === 'empty' ? 2.5 : 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), heaterLed)).position.set(W * 0.3, H / 2 + 0.004, -D * 0.3);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), fluidLed)).position.set(W * 0.3 + 0.03, H / 2 + 0.004, -D * 0.3);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), s.material('#d8262c'))).position.set(W * 0.3 - 0.03, H / 2 + 0.006, -D * 0.3);
    if (a.size !== 'bedroom') {
      const handle = add(new THREE.Mesh(new THREE.TorusGeometry(W * 0.22, 0.01, 8, 20, Math.PI), dark));
      handle.position.set(0, H / 2, -D * 0.05);
      handle.rotation.y = Math.PI / 2;
      handle.rotation.x = 0;
    }
    if (a.casing === 'battered') {
      const tape = s.material('#5a5a5e', { roughness: 1 });
      for (let i = 0; i < 4; i++) { const t = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.08), tape)); t.position.set((random() - 0.5) * W, H / 2 + 0.002, (random() - 0.5) * D); t.rotation.y = random() * 3; }
      const scuff = add(new THREE.Mesh(new THREE.PlaneGeometry(W * 0.4, H * 0.3), steel)); scuff.position.set(-W * 0.2, -H * 0.2, D / 2 + 0.011); scuff.rotation.z = 0.2;
    }
    // Back: socket, fuse holder, the fluid line going into the tank.
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.012), dark)).position.set(W * 0.3, -H * 0.2, -D / 2 - 0.006);

    // Where the haze comes out, in the sculpture's frame.
    body.updateMatrixWorld(true);
    const mouth = throat.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()));
    // The haze: a cone of soft translucent puffs that never write depth, so they are not measured as solid.
    const puffs: THREE.Mesh[] = [];
    const puffCount = firing ? 9 : a.state === 'cooling' ? 3 : 0;
    const hazeMaterial = (opacity: number) => new THREE.MeshStandardMaterial({ color: '#d4d4da', transparent: true, opacity, depthWrite: false, roughness: 1 });
    for (let i = 0; i < puffCount; i++) {
      const t = (i + 0.6) / puffCount;
      const reach = firing ? mix(0.5, 1.5, mood.energy * 0.4 + 0.6) * (W / 0.46) : 0.35;
      const r = firing ? mix(0.03, 0.2, t) * (W / 0.46) : mix(0.02, 0.06, t);
      const at = mouth.clone().addScaledVector(dir, t * reach);
      at.y += t * t * 0.12;
      at.x += (random() - 0.5) * r * 0.6;
      const puff = s.ball([r, r * 0.85, r], at.toArray() as [number, number, number], hazeMaterial(firing ? mix(0.3, 0.06, t) : 0.12), 12);
      puff.castShadow = puff.receiveShadow = false;
      puff.userData.t = t;
      puff.userData.r = r;
      puffs.push(puff);
    }
    if (firing) {
      const bright = s.ball([nozzleR * 1.4, nozzleR * 1.4, nozzleR * 2.2], mouth.clone().addScaledVector(dir, 0.04).toArray() as [number, number, number], new THREE.MeshBasicMaterial({ color: '#fff0d8', transparent: true, opacity: 0.3, depthWrite: false }), 10);
      bright.castShadow = false;
    }

    // The lead.
    const cable = s.material('#1a1a1c', { roughness: 0.9 });
    const socket = new THREE.Vector3(W * 0.3, lift + H * 0.3, -D / 2 - 0.01);
    if (a.lead === 'tangled') {
      s.tube([socket.toArray() as [number, number, number], [W * 0.4, 0.015, -D / 2 - 0.15], [W * 0.1, 0.012, -D / 2 - 0.35], [-W * 0.4, 0.015, -D / 2 - 0.25], [-W * 0.7, 0.012, -D / 2 - 0.45], [-W * 0.2, 0.012, -D / 2 - 0.6], [W * 0.6, 0.012, -D / 2 - 0.5]], 0.006, cable);
      s.tube([[W * 0.3, lift + H * 0.3, -D / 2 - 0.01], [W * 0.5, 0.012, -D / 2 - 0.08], [W * 0.9, 0.012, -D / 2 + 0.2]], 0.004, cable);
      const remote = s.box([0.06, 0.025, 0.1], [W * 0.95, 0.0125, -D / 2 + 0.26], dark);
      remote.rotation.y = 0.4;
      s.box([0.03, 0.012, 0.03], [W * 0.95, 0.03, -D / 2 + 0.26], s.material('#d8262c'));
    } else if (a.lead === 'coiled') {
      const coil: [number, number, number][] = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 7; coil.push([-W * 0.9 + Math.cos(t) * 0.08, 0.012 + Math.floor(i / 6) * 0.004, -D / 2 - 0.2 + Math.sin(t) * 0.08]); }
      s.tube([socket.toArray() as [number, number, number], [W * 0.1, 0.02, -D / 2 - 0.1], ...coil], 0.006, cable);
    } else {
      s.tube([socket.toArray() as [number, number, number], [W * 0.5, 0.015, -D / 2 - 0.12], [W * 0.95, 0.012, -D / 2 - 0.3]], 0.006, cable);
      const block = s.box([0.28, 0.04, 0.06], [W * 1.1, 0.02, -D / 2 - 0.36], s.material('#f1ede4', { roughness: 0.6 }));
      block.rotation.y = -0.5;
      for (let i = 0; i < 4; i++) { const sock = s.box([0.035, 0.004, 0.035], [W * 1.1 - 0.09 + i * 0.06, 0.042, -D / 2 - 0.36], dark); sock.rotation.y = -0.5; sock.position.z += (i - 1.5) * 0.06 * Math.sin(0.5) * 0; }
      s.ball([0.008, 0.008, 0.008], [W * 1.1 + 0.12, 0.045, -D / 2 - 0.42], glow('#ff2a2a', 2), 6);
      s.tube([[W * 1.1 + 0.14, 0.02, -D / 2 - 0.3], [W * 1.4, 0.012, -D / 2 - 0.6]], 0.006, cable);
    }

    // The jug of fluid.
    if (a.jug !== 'none') {
      const jx = -(W / 2 + 0.2), jz = 0.1;
      const upended = a.state === 'empty';
      const jugGroup = new THREE.Group();
      s.root.add(jugGroup);
      const colour = a.jug === 'blue' ? '#2b6cc4' : a.jug === 'clear' ? '#d7e6f0' : '#eeeeea';
      const jugMat = a.jug === 'clear' ? new THREE.MeshPhysicalMaterial({ color: colour, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }) : s.material(colour, { roughness: 0.45 });
      const JH = a.jug === 'drum' ? 0.3 : 0.26, JW = a.jug === 'drum' ? 0.18 : 0.15;
      const jugBody = new THREE.Mesh(a.jug === 'drum' ? new THREE.CylinderGeometry(JW / 2, JW / 2, JH, 16) : new THREE.BoxGeometry(JW, JH, JW * 0.8), jugMat);
      jugBody.position.y = JH / 2;
      jugBody.castShadow = jugBody.receiveShadow = true;
      jugGroup.add(jugBody);
      if (a.jug === 'clear') {
        const fluid = new THREE.Mesh(new THREE.BoxGeometry(JW - 0.01, JH * 0.45, JW * 0.8 - 0.01), new THREE.MeshStandardMaterial({ color: '#cfe4f3', transparent: true, opacity: 0.7, roughness: 0.3 }));
        fluid.position.y = JH * 0.225 + 0.005;
        jugGroup.add(fluid);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), s.material(a.jug === 'blue' ? '#f4f1e8' : '#2b6cc4'));
      cap.position.set(0, JH + 0.015, 0);
      jugGroup.add(cap);
      if (a.jug !== 'drum') {
        const grip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14, Math.PI), jugMat);
        grip.position.set(0, JH - 0.03, -JW * 0.4);
        jugGroup.add(grip);
      }
      const label = paint(256, 128, (c, w, h) => {
        c.fillStyle = a.jug === 'drum' ? '#f4f1e8' : '#f4f1e8'; c.fillRect(0, 0, w, h);
        c.fillStyle = a.jug === 'drum' ? '#1d1d1f' : '#1f3f7a';
        c.font = `bold ${a.jug === 'drum' ? 30 : 38}px ${a.jug === 'drum' ? 'cursive' : 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(a.jug === 'drum' ? 'FOG JUICE' : 'FOG FLUID', w / 2, h * 0.4);
        c.font = '20px sans-serif'; c.fillText(a.jug === 'drum' ? 'do not drink' : '5 L', w / 2, h * 0.75);
      });
      const sticker = new THREE.Mesh(new THREE.PlaneGeometry(JW * 0.85, JH * 0.4), new THREE.MeshStandardMaterial({ map: label, roughness: 0.9 }));
      sticker.position.set(0, JH * 0.5, a.jug === 'drum' ? JW / 2 + 0.001 : JW * 0.4 + 0.001);
      jugGroup.add(sticker);
      jugGroup.position.set(jx, 0, jz);
      jugGroup.rotation.y = 0.4 + random() * 0.5;
      if (upended) { jugGroup.rotation.z = Math.PI / 2 - 0.1; jugGroup.position.set(jx + 0.02, JW / 2, jz); }
    }

    // The CO2 jet gun leaning against the machine.
    if (a.co2) {
      const gun = new THREE.Group();
      s.root.add(gun);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.5, 14), s.material('#2a2b2e', { roughness: 0.5 }));
      barrel.position.y = 0.3;
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.035, 0.12, 14, 1, true), steel);
      bell.position.y = 0.61;
      (bell.material as THREE.Material).side = THREE.DoubleSide;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.04), dark);
      grip.position.set(0, 0.16, 0.05);
      grip.rotation.x = -0.3;
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.015), steel);
      trigger.position.set(0, 0.25, 0.045);
      const hose = s.tube([[0, 0.1, 0], [0.05, 0.03, -0.1], [0.2, 0.012, -0.3], [0.15, 0.012, -0.55]], 0.008, s.material('#2a4a8a', { roughness: 0.8 }));
      void hose;
      for (const part of [barrel, bell, grip, trigger]) { part.castShadow = true; gun.add(part); }
      gun.position.set(W / 2 + 0.07, 0.02, D * 0.1);
      gun.rotation.z = -0.32;
      gun.rotation.x = 0.1;
    }

    // A crew hand crouched beside it, funnelling fluid in.
    let crew: ReturnType<typeof figure> | null = null;
    if (a.crew) {
      const skin = pickSkin(random);
      const Hc = mix(1.6, 1.85, random());
      crew = figure(s, {
        height: Hc, style: 'doll', skin, hair: pick(random, ['short', 'cap', 'hood', 'bun'] as const), hairColor: '#1d1d1f',
        pose: 'crouching', gaze: 'down', top: pick(random, ['#1d1d1f', '#3a3a3c', '#5a4a3a']), bottom: '#1d1d1f', shoes: '#2a2a2c', sleeves: 'short',
      });
      s.root.add(crew.root);
      const joints = rig(crew);
      joints.arm('left', { forward: 70, out: 20, bend: 70, across: 25 });
      joints.arm('right', { forward: 60, out: 25, bend: 90, across: 30 });
      joints.look(35, -25);
      joints.settle();
      crew.root.position.set(-(W / 2 + 0.42), 0, -0.12);
      crew.root.rotation.y = 1.25;
      crew.root.updateMatrixWorld(true);
      // A small funnel in the near hand.
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.008, 0.08, 12, 1, true), s.material('#d8262c', { side: THREE.DoubleSide }));
      funnel.position.y = -0.04;
      crew.hands.right.add(funnel);
    }

    const energy = mood.energy;
    const rate = mix(0.4, 1.6, energy);
    return s.finish({
      update: (dt, time) => {
        crew?.update(dt, time);
        for (const [i, puff] of puffs.entries()) {
          const t = puff.userData.t as number;
          const wobble = 1 + Math.sin(time * rate * 2 + i * 1.3) * 0.08 * t;
          const r = puff.userData.r as number;
          puff.scale.set(r * wobble, r * 0.85 * wobble, r * wobble);
          puff.position.y += Math.sin(time * rate + i) * dt * 0.01 * t;
        }
        if (firing) hot.emissiveIntensity = 1.8 + Math.sin(time * 6) * 0.4;
        if (a.state === 'empty') fluidLed.emissiveIntensity = (Math.floor(time * 2) % 2) * 2.5;
      },
    });
  },
});

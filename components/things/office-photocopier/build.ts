import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    model: choice('What sort of copier is it?', {
      console: 'A huge beige 1990s console copier, wide as a desk.',
      compact: 'A smaller copier perched on a wheeled cupboard stand.',
      modern: 'A white and charcoal multifunction machine with a tilted touchscreen.',
      ancient: 'A 1970s brown-and-cream brute with wood-grain trim and chunky dials.',
    }),
    state: choice('What is it doing right now?', {
      idle: 'Nothing. Warm, humming, ready.',
      jam: 'Jammed: the front door hangs open on its rollers and green levers, a crumpled sheet caught inside.',
      spitting: 'Running away with itself, spitting page after page onto the floor.',
      scanning: 'Mid-copy: a bar of green light is sweeping under the lid.',
      dead: 'Dead. Switched off, dark, not coming back.',
    }),
    lid: choice('How is the lid?', {
      closed: 'Shut flat.',
      open: 'Propped wide open, the glass exposed.',
      feeder: 'Shut, with a stack of originals waiting in the document feeder on top.',
    }),
    glass: choice('If the lid is open, what was left on the glass?', {
      nothing: 'Nothing, just fingerprints.',
      original: "Somebody's forgotten original, a single typed page.",
      book: 'A thick book splayed face down.',
      money: 'A sheet of banknotes laid out in rows.',
      photo: 'A snapshot, small and personal.',
    }),
    output: choice('Where do the copies come out?', {
      tray: 'A single sloping catch tray on the side.',
      sorter: 'A tall rack of sorter bins.',
      floor: 'There is no tray: they slide straight out.',
    }),
    note: choice('If a note is taped to it, what does it say?', {
      none: 'There is no note.',
      order: 'OUT OF ORDER',
      service: 'SERVICE CALLED',
      toner: 'NO TONER',
      kick: 'KICK HERE',
      private: 'NO PERSONAL COPIES',
    }),
    beside: choice('What is on the floor beside it?', {
      nothing: 'Nothing.',
      reams: 'Boxes and reams of fresh paper.',
      bin: 'A recycling bin overflowing with misprints.',
      toner: 'Spent toner cartridges and their cartons.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [W, D, lowerH, upperH] = { console: [1.05, 0.66, 0.5, 0.42], compact: [0.66, 0.56, 0.6, 0.3], modern: [0.72, 0.64, 0.62, 0.42], ancient: [1.0, 0.62, 0.55, 0.36] }[a.model];
    const [bodyHex, trimHex] = { console: ['#d8d0b8', '#b9b09a'], compact: ['#e3ddcd', '#8f948f'], modern: ['#eceeee', '#474c52'], ancient: ['#d9c9a0', '#6b4a30'] }[a.model];
    const aged = new THREE.Color(bodyHex).lerp(new THREE.Color('#c2a96a'), mood.wear * 0.3);
    const body = s.material(aged, { roughness: 0.6 });
    const trim = s.material(trimHex, { roughness: 0.55 });
    const dark = s.material('#24272a');
    const steel = s.material('#aeb3b4', { metalness: 0.5, roughness: 0.3 });
    const paper = s.material('#f6f4ec', { roughness: 0.95 });
    const on = a.state !== 'dead';
    const lamp = (hex: string, power: number) => new THREE.MeshStandardMaterial({ color: on ? hex : '#3b3f3c', emissive: hex, emissiveIntensity: on ? power : 0, roughness: 0.4 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const base = 0.05, deck = base + lowerH + upperH;

    // Stand with paper drawers, on castors.
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.03, 0.03, 0.05, [x * (W / 2 - 0.07), 0.025, z * (D / 2 - 0.07)], dark, 12);
    s.box([W - (a.model === 'compact' ? 0.06 : 0), lowerH, D - 0.02], [0, base + lowerH / 2, -0.01], a.model === 'ancient' ? trim : body);
    const drawers = a.model === 'compact' ? 1 : a.model === 'ancient' ? 0 : 3;
    const dh = (lowerH - 0.04) / Math.max(drawers, 1);
    for (let i = 0; i < drawers; i++) {
      const y = base + 0.02 + dh / 2 + i * dh;
      s.box([W * 0.88, dh - 0.015, 0.02], [0, y, D / 2 - 0.01], body);
      s.box([W * 0.3, 0.03, 0.012], [0, y + dh * 0.2, D / 2 + 0.002], dark);
      s.box([0.02, dh * 0.5, 0.006], [W * 0.38, y, D / 2 + 0.001], lamp('#e9e6d6', 0.1));
    }
    if (a.model === 'ancient') {
      s.box([W * 0.9, lowerH * 0.8, 0.012], [0, base + lowerH / 2, D / 2 - 0.002], s.material('#7c5636'));
      for (let i = 0; i < 6; i++) s.box([W * 0.5, 0.012, 0.006], [0, base + 0.1 + i * 0.035, D / 2 + 0.006], dark);
    }

    // Engine block. Its front panel is a door that swings open in a jam.
    const engineY = base + lowerH + upperH / 2;
    s.box([W, upperH, D], [0, engineY, 0], body);
    s.box([W + 0.006, 0.02, D + 0.006], [0, base + lowerH + 0.01, 0], trim);
    const door = new THREE.Group();
    const doorW = W * 0.82, doorH = upperH * 0.66;
    const doorY = base + lowerH + 0.04 + doorH / 2;
    door.position.set(-doorW / 2, doorY, D / 2);
    s.root.add(door);
    add(door, new THREE.BoxGeometry(doorW, doorH, 0.022), body, [doorW / 2, 0, 0.012]);
    add(door, new THREE.BoxGeometry(0.1, 0.02, 0.014), dark, [doorW - 0.09, doorH * 0.3, 0.024]);
    if (a.model === 'ancient') add(door, new THREE.BoxGeometry(doorW * 0.9, 0.05, 0.004), s.material('#7c5636'), [doorW / 2, -doorH * 0.2, 0.025]);
    const turners: THREE.Object3D[] = [];
    if (a.state === 'jam') {
      door.rotation.y = -mix(1.5, 2.1, random());
      s.box([doorW - 0.03, doorH - 0.03, 0.006], [0, doorY, D / 2 + 0.002], dark);
      const green = lamp('#3fdc6a', 0.7);
      for (let i = 0; i < 4; i++) {
        const roller = s.cylinder(0.022, 0.022, doorW * 0.8, [0, doorY - doorH * 0.32 + i * doorH * 0.2, D / 2 + 0.025 - (i % 2) * 0.012], i % 2 ? steel : dark, 12);
        roller.rotation.z = Math.PI / 2;
        turners.push(roller);
      }
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * doorW * 0.3 + (random() - 0.5) * 0.04;
        s.box([0.03, 0.07, 0.03], [x, doorY + doorH * 0.28, D / 2 + 0.04], green).rotation.z = (random() - 0.5) * 0.8;
        s.cylinder(0.022, 0.022, 0.02, [x + 0.07, doorY - doorH * 0.3, D / 2 + 0.04], green, 10).rotation.x = Math.PI / 2;
      }
      // The culprit: a sheet concertinaed between the rollers and hanging out.
      let px = -doorW * 0.1, py = doorY - 0.01, pz = D / 2 + 0.05;
      for (let i = 0; i < 7; i++) {
        const fold = s.box([0.21, 0.004, 0.05], [px, py, pz], paper);
        fold.rotation.x = (i % 2 ? 1 : -1) * mix(0.5, 1.1, random());
        fold.rotation.z = (random() - 0.5) * 0.3;
        pz += 0.025; py -= 0.022;
      }
      const tail = s.box([0.21, 0.004, 0.2], [px, py - 0.07, pz + 0.03], paper);
      tail.rotation.x = 1.1;
    }

    // Deck: glass, scale strip and the control panel along the front.
    const glassW = Math.min(0.5, W * 0.62), glassD = D * 0.6;
    const glassX = -W / 2 + 0.06 + glassW / 2;
    s.box([W, 0.03, D], [0, deck + 0.015, 0], trim);
    const top = deck + 0.03;
    s.box([glassW, 0.006, glassD], [glassX, top, -D * 0.12], new THREE.MeshStandardMaterial({ color: on ? '#3d5c5e' : '#2b3334', roughness: 0.08, metalness: 0.4 }));
    s.box([glassW, 0.008, 0.02], [glassX, top + 0.001, -D * 0.12 + glassD / 2 + 0.012], paper);
    const panelD = 0.16;
    const panel = new THREE.Group();
    panel.position.set(0, top, D / 2 - panelD / 2 + 0.03);
    panel.rotation.x = 0.3;
    s.root.add(panel);
    add(panel, new THREE.BoxGeometry(W, 0.04, panelD), a.model === 'modern' ? trim : body, [0, 0.01, 0]);
    const glow = a.state === 'jam' ? '#ff3b2f' : '#52e07a';
    add(panel, new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16), lamp(glow, mix(0.5, 1.4, mood.energy)), [W / 2 - 0.09, 0.035, 0]);
    add(panel, new THREE.CylinderGeometry(0.014, 0.014, 0.016, 12), lamp('#ff5a3c', 0.3), [W / 2 - 0.16, 0.035, 0.03]);
    const readout = { idle: '01', jam: 'E-7', spitting: '999', scanning: '14', dead: '' }[a.state];
    const display = s.label(readout, 0.12, 0.05, [0, 0, 0], on ? '#b8ff9a' : '#2a302a', on ? '#16301c' : '#2a302a');
    display.removeFromParent(); display.rotation.x = -Math.PI / 2; display.position.set(W / 2 - 0.3, 0.032, -0.02); display.castShadow = false;
    (display.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(on ? '#2c7a3a' : '#000000');
    panel.add(display);
    if (a.model === 'ancient') {
      for (let i = 0; i < 3; i++) add(panel, new THREE.CylinderGeometry(0.03, 0.034, 0.03, 14), dark, [-W / 2 + 0.1 + i * 0.1, 0.04, 0]);
    } else {
      const keys = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push({ at: [-0.02 + c * 0.03, 0.033, -0.045 + r * 0.03] as [number, number, number], size: 1 });
      const pad = s.scatter(new THREE.BoxGeometry(0.02, 0.008, 0.02), s.material('#6d7378'), keys);
      pad.removeFromParent(); panel.add(pad);
      for (let i = 0; i < 4; i++) add(panel, new THREE.BoxGeometry(0.05, 0.008, 0.02), s.material(['#8fa3b8', '#b8a98f', '#8fb89a', '#b88f8f'][i]), [-W / 2 + 0.07 + i * 0.065, 0.033, 0.01]);
    }
    if (a.model === 'modern') {
      const screen = new THREE.Group();
      screen.position.set(W / 2 - 0.2, top + 0.09, D / 2 - 0.02);
      screen.rotation.x = -0.6;
      s.root.add(screen);
      add(screen, new THREE.BoxGeometry(0.26, 0.17, 0.02), trim, [0, 0, 0]);
      add(screen, new THREE.BoxGeometry(0.23, 0.14, 0.004), lamp(a.state === 'jam' ? '#ff6a4f' : '#58b7ff', 0.8), [0, 0, 0.012]);
    }

    // Lid on a rear hinge.
    const lid = new THREE.Group();
    const lidD = glassD + 0.1, lidW = glassW + 0.08;
    lid.position.set(glassX, top + 0.004, -D * 0.12 - glassD / 2 - 0.05);
    s.root.add(lid);
    const feeder = a.lid === 'feeder';
    const lidT = feeder ? 0.1 : 0.045;
    add(lid, new THREE.BoxGeometry(lidW, lidT, lidD), body, [0, lidT / 2, lidD / 2]);
    add(lid, new THREE.BoxGeometry(lidW * 0.94, 0.004, lidD * 0.94), paper, [0, -0.001, lidD / 2]);
    add(lid, new THREE.BoxGeometry(lidW * 0.3, 0.012, 0.02), dark, [0, lidT * 0.5, lidD + 0.008]);
    if (feeder) {
      const chute = add(lid, new THREE.BoxGeometry(lidW * 0.62, 0.012, lidD * 0.7), trim, [lidW * 0.14, lidT + 0.04, lidD / 2]);
      chute.rotation.z = 0.22;
      const stack = Math.round(mix(3, 14, mood.density));
      for (let i = 0; i < stack; i++) {
        const page = add(lid, new THREE.BoxGeometry(0.297, 0.004, 0.21), paper, [lidW * 0.14 + (random() - 0.5) * 0.012, lidT + 0.052 + i * 0.004, lidD / 2 + (random() - 0.5) * 0.012]);
        page.rotation.z = 0.22; page.rotation.y = (random() - 0.5) * 0.08;
      }
      add(lid, new THREE.BoxGeometry(lidW * 0.3, 0.07, lidD * 0.8), trim, [-lidW * 0.33, lidT + 0.035, lidD / 2]);
    }
    const openLid = a.lid === 'open';
    lid.rotation.x = openLid ? -mix(1.0, 1.35, random()) : a.state === 'scanning' ? -0.22 : 0;
    if (openLid) {
      const gy = top + 0.006;
      const gz = -D * 0.12;
      if (a.glass === 'original') {
        const sheet = s.label('Dear Sir', 0.21, 0.297, [glassX - glassW / 2 + 0.13, gy, gz - 0.02], '#3a3a3a', '#f6f4ec');
        sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = (random() - 0.5) * 0.3;
        const ctx = ((sheet.material as THREE.MeshStandardMaterial).map as THREE.CanvasTexture).image.getContext('2d')!;
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#55595c';
        for (let i = 0; i < 26; i++) ctx.fillRect(cw * 0.12, ch * (0.1 + i * 0.03), cw * mix(0.4, 0.76, random()) * (i % 7 === 6 ? 0.3 : 1), ch * 0.008);
      } else if (a.glass === 'book') {
        const cover = s.material(['#7a2f38', '#2f4470', '#3f6b4a'][Math.floor(random() * 3)]);
        for (const side of [-1, 1]) {
          const half = s.box([0.17, 0.035, 0.24], [glassX + side * 0.085, gy + 0.03, gz], cover);
          half.rotation.z = -side * 0.14;
          s.box([0.16, 0.028, 0.23], [glassX + side * 0.085, gy + 0.018, gz], paper).rotation.z = -side * 0.14;
        }
      } else if (a.glass === 'money') {
        const note = s.material('#7fae7a');
        for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) s.box([0.15, 0.003, 0.065], [glassX - 0.09 + c * 0.18 + (random() - 0.5) * 0.02, gy, gz - 0.13 + r * 0.085], note).rotation.y = (random() - 0.5) * 0.12;
      } else if (a.glass === 'photo') {
        const snap = s.box([0.15, 0.003, 0.1], [glassX - 0.05, gy, gz + 0.03], paper);
        snap.rotation.y = 0.3;
        s.box([0.13, 0.004, 0.08], [glassX - 0.05, gy, gz + 0.03], s.material(mood.cheer > 0.5 ? '#e0a45a' : '#6d7f96')).rotation.y = 0.3;
      }
    }
    // Scan bar.
    let beam: THREE.Mesh | null = null;
    if (a.state === 'scanning') {
      beam = s.box([0.03, 0.03, glassD], [glassX, top + 0.02, -D * 0.12], new THREE.MeshStandardMaterial({ color: '#c8ffb0', emissive: '#7dff5a', emissiveIntensity: 2.2 }));
      beam.castShadow = false;
      const spill = s.box([glassW, 0.05, glassD + 0.06], [glassX, top + 0.03, -D * 0.12], new THREE.MeshBasicMaterial({ color: '#8dff6a', transparent: true, opacity: 0.22, depthWrite: false }));
      spill.castShadow = false;
    }

    // Output on the left.
    const outY = base + lowerH + upperH * 0.55;
    const leftX = -W / 2;
    s.box([0.012, 0.035, D * 0.6], [leftX - 0.004, outY + 0.02, 0], dark);
    const pile = (x: number, y: number, z: number, count: number, tilt: number, parent: THREE.Object3D = s.root) => {
      for (let i = 0; i < count; i++) {
        const page = add(parent, new THREE.BoxGeometry(0.21, 0.003, 0.297), paper, [x + (random() - 0.5) * 0.03, y + i * 0.003, z + (random() - 0.5) * 0.03]);
        page.rotation.z = tilt; page.rotation.y = (random() - 0.5) * 0.25;
      }
    };
    const busy = a.state === 'spitting';
    if (a.output === 'tray') {
      const tray = s.box([0.34, 0.012, D * 0.62], [leftX - 0.16, outY - 0.02, 0], trim);
      tray.rotation.z = -0.22;
      s.box([0.012, 0.05, D * 0.62], [leftX - 0.325, outY + 0.035, 0], trim);
      pile(leftX - 0.16, outY - 0.008, 0, Math.round(mix(1, 9, mood.density)) + (busy ? 8 : 0), -0.22);
    } else if (a.output === 'sorter') {
      const bins = 9;
      const sorterH = bins * 0.05 + 0.08;
      const sy = base + lowerH + upperH - sorterH + 0.02;
      for (const z of [-1, 1]) s.box([0.3, sorterH, 0.012], [leftX - 0.15, sy + sorterH / 2, z * D * 0.33], body);
      s.box([0.3, 0.015, D * 0.66 + 0.012], [leftX - 0.15, sy + sorterH, 0], body);
      s.box([0.06, sy - 0.02, 0.06], [leftX - 0.2, sy / 2, 0], trim);
      s.box([0.24, 0.02, 0.4], [leftX - 0.2, 0.01, 0], trim);
      for (let i = 0; i < bins; i++) {
        const y = sy + 0.04 + i * 0.05;
        const shelf = s.box([0.3, 0.005, D * 0.64], [leftX - 0.16, y, 0], steel);
        shelf.rotation.z = -0.2;
        if (random() < mix(0.15, 0.9, mood.density) || busy) pile(leftX - 0.16, y + 0.006, 0, 1 + Math.floor(random() * 3), -0.2);
      }
    }
    // Loose pages: flying when it is running away, and what has landed.
    const fliers: { mesh: THREE.Mesh; phase: number; side: number; spin: number }[] = [];
    if (busy || a.output === 'floor') {
      const landed = busy ? Math.round(mix(8, 26, mood.density)) : Math.round(mix(1, 5, mood.density));
      for (let i = 0; i < landed; i++) {
        const page = s.box([0.21, 0.003, 0.297], [leftX - mix(0.2, busy ? 0.62 : 0.4, random()), 0.003 + i * 0.002, mix(-0.3, 0.32, random())], paper);
        page.rotation.y = random() * Math.PI;
      }
    }
    if (busy) {
      for (let i = 0; i < 6; i++) {
        const mesh = s.box([0.21, 0.003, 0.297], [leftX - 0.3, outY, 0], paper);
        fliers.push({ mesh, phase: i / 6 + random() * 0.1, side: (random() - 0.5) * 0.5, spin: (random() - 0.5) * 4 });
      }
    }
    const fly = (time: number) => {
      for (const flier of fliers) {
        const t = (time + flier.phase) % 1;
        const reach = a.output === 'sorter' ? 0.36 : 0.12;
        flier.mesh.position.set(leftX - reach - t * 0.4, outY + (a.output === 'sorter' ? 0.2 : 0.05) + t * 0.5 - t * t * (outY + 0.45), flier.side * t);
        flier.mesh.rotation.set(flier.spin * t * 0.3, flier.spin * t, -0.3 - t * 1.2);
      }
    };
    fly(0.13);

    // Bypass tray on the right.
    const bypass = s.box([0.26, 0.01, D * 0.5], [W / 2 + 0.11, base + lowerH + upperH * 0.3, 0], trim);
    bypass.rotation.z = 0.35;

    // The note.
    if (a.note !== 'none') {
      const text = { order: 'OUT OF ORDER', service: 'SERVICE CALLED', toner: 'NO TONER', kick: 'KICK HERE', private: 'NO PERSONAL COPIES' }[a.note];
      const onLid = a.state === 'jam' && !openLid;
      const note = s.label(text, 0.3, 0.2, [0, 0, 0], '#b3261e', '#fbf8ec');
      note.castShadow = false;
      const tapeMat = s.material('#d9cf9a');
      if (onLid) {
        note.removeFromParent(); lid.add(note);
        note.rotation.x = -Math.PI / 2; note.rotation.z = (random() - 0.5) * 0.3;
        note.position.set(0, lidT + (feeder ? 0.075 : 0.003), lidD * 0.55);
        if (feeder) note.position.set(-lidW * 0.33, lidT + 0.073, lidD / 2), note.scale.setScalar(0.6);
      } else if (a.state === 'jam') {
        note.position.set(W * 0.2, base + lowerH * 0.55, D / 2 + 0.005);
        note.rotation.z = (random() - 0.5) * 0.25;
      } else {
        note.removeFromParent(); door.add(note);
        note.position.set(doorW * 0.42, 0, 0.026);
        note.scale.setScalar(Math.min(1, doorH / 0.24));
        note.rotation.z = (random() - 0.5) * 0.25;
        add(door, new THREE.BoxGeometry(0.07, 0.022, 0.002), tapeMat, [doorW * 0.42, 0.1 * Math.min(1, doorH / 0.24), 0.028]);
      }
    }

    // Beside it, on the right.
    const sideX = W / 2 + 0.3;
    if (a.beside === 'reams') {
      const carton = s.material('#c7a878', { roughness: 0.95 });
      const wrap = [s.material('#f1f1ee'), s.material('#4d7fc4'), s.material('#d9534a')];
      const cartons = 1 + Math.round(mix(0, 2, mood.density));
      for (let i = 0; i < cartons; i++) {
        const box = s.box([0.33, 0.25, 0.45], [sideX + (random() - 0.5) * 0.04, 0.125 + i * 0.25, 0.02], carton);
        box.rotation.y = (random() - 0.5) * 0.3;
      }
      const loose = Math.round(mix(1, 5, mood.density));
      for (let i = 0; i < loose; i++) {
        const ream = s.box([0.215, 0.055, 0.3], [sideX + (random() - 0.5) * 0.05, cartons * 0.25 + 0.03 + i * 0.056, 0.02 + (random() - 0.5) * 0.04], wrap[i % 3]);
        ream.rotation.y = (random() - 0.5) * 0.5;
      }
    } else if (a.beside === 'bin') {
      const blue = s.material('#3f6fb5');
      s.box([0.36, 0.02, 0.3], [sideX, 0.01, 0.05], blue);
      for (const [dx, dz, w, d] of [[-0.18, 0, 0.012, 0.3], [0.18, 0, 0.012, 0.3], [0, -0.15, 0.36, 0.012], [0, 0.15, 0.36, 0.012]] as const) s.box([w, 0.34, d], [sideX + dx, 0.17, 0.05 + dz], blue);
      const count = Math.round(mix(8, 24, mood.density));
      for (let i = 0; i < count; i++) {
        const crumpled = random() < 0.5;
        const over = i > count * 0.75;
        const at: [number, number, number] = [sideX + (random() - 0.5) * (over ? 0.4 : 0.28), over ? 0.02 : 0.1 + i * 0.016, 0.05 + (over ? 0.2 + random() * 0.14 : (random() - 0.5) * 0.22)];
        if (crumpled) { const wad = s.mesh(new THREE.IcosahedronGeometry(0.045, 0), paper, at); wad.rotation.set(random() * 3, random() * 3, 0); wad.scale.y = 0.7; }
        else { const page = s.box([0.21, 0.003, 0.297], at, paper); page.rotation.set((random() - 0.5) * (over ? 0 : 0.9), random() * 3, (random() - 0.5) * (over ? 0 : 0.9)); }
      }
    } else if (a.beside === 'toner') {
      const count = Math.round(mix(2, 6, mood.density));
      for (let i = 0; i < count; i++) {
        const boxed = random() < 0.4;
        if (boxed) s.box([0.14, 0.14, 0.42], [sideX + (random() - 0.5) * 0.3, 0.07, (random() - 0.5) * 0.3], s.material(['#e9e6da', '#2f5fa8'][i % 2])).rotation.y = random() * 3;
        else {
          const cart = s.cylinder(0.05, 0.05, 0.36, [sideX + (random() - 0.5) * 0.25, 0.05, (random() - 0.5) * 0.3], dark, 14);
          cart.rotation.set(Math.PI / 2, 0, random() * 3);
        }
      }
      const smear = s.cylinder(1, 1, 0.003, [sideX, 0.002, 0.1], new THREE.MeshStandardMaterial({ color: '#1c1c1e', transparent: true, opacity: 0.5, depthWrite: false }), 18);
      smear.scale.set(0.2, 1, 0.13); smear.castShadow = false;
    }
    // Toner smudges and scuffs with age.
    if (mood.wear > 0.5) {
      const smudge = new THREE.MeshStandardMaterial({ color: '#3a3a3c', transparent: true, opacity: mix(0, 0.16, mood.wear), depthWrite: false });
      for (let i = 0; i < 5; i++) s.box([mix(0.04, 0.12, random()), mix(0.015, 0.04, random()), 0.002], [(random() - 0.5) * W * 0.8, base + random() * lowerH, D / 2 + 0.012], smudge).castShadow = false;
    }

    const pace = mix(0.35, 1.6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        if (fliers.length) fly(time * pace);
        if (beam) beam.position.x = glassX + Math.sin(time * pace * 1.6) * (glassW / 2 - 0.03);
        for (const roller of turners) roller.rotation.x += dt * 0.0;
      },
    });
  },
});

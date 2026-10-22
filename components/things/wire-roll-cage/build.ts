import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    contents: choice('What is in the cage?', {
      parcels: 'A jumble of parcels and grey mail bags, a sorting office.',
      laundry: 'Bulging laundry sacks, white and blue, hospital linen.',
      returns: 'Customer returns: opened boxes with yellow stickers and loose bright goods.',
      cardboard: 'Flattened cardboard boxes standing on edge, waiting for the baler.',
      crates: 'Stacked plastic milk crates of white bottles.',
      totes: 'Lidded plastic tote boxes, pharmacy or store replenishment.',
      empty: 'Nothing but one forgotten parcel in the bottom.',
    }),
    fill: score('How full is it?', ['Barely a layer in the bottom', 'Half full', 'Full to the top rail', 'Heaped over the top']),
    front: choice('What closes the front?', {
      open: 'Nothing: the front is wide open.',
      straps: 'Two webbing straps clipped across.',
      half: 'A half-height wire gate.',
      gate: 'A full wire gate, latched shut.',
    }),
    finish: choice('What is the cage made of?', {
      zinc: 'Bright zinc-plated wire, the standard supermarket cage.',
      blue: 'Blue powder-coated wire with a plastic base.',
      red: 'Red painted wire, a postal cage.',
      green: 'Dark green wire with a timber base, an older laundry trolley.',
    }),
    placard: choice('What does the card clipped to it say?', {
      none: 'There is no card.',
      store: 'A route card: STORE 114.',
      returns: 'RETURNS.',
      linen: 'SOILED LINEN.',
      urgent: 'URGENT, in red.',
      keep: 'DO NOT TAKE.',
    }),
    story: choice('What has happened to it?', {
      waiting: 'Nothing: it stands loaded and waiting.',
      spilled: 'Some of the load has slid out onto the floor.',
      wonky: 'One castor has seized and the whole cage lists to one side.',
      taped: 'It is wound round with red and white tape: quarantined, do not use.',
      coat: 'Somebody has hung their coat and bag on the corner post.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    const keep = <T extends THREE.Object3D>(mesh: T): T => { g.add(mesh); return mesh; };
    const wireHex = { zinc: '#c2c8ca', blue: '#2e62a8', red: '#c23a30', green: '#2f5f48' }[a.finish];
    const wire = s.material(wireHex, { metalness: a.finish === 'zinc' ? 0.85 : 0.3, roughness: a.finish === 'zinc' ? 0.35 : 0.5 });
    const dark = s.material('#1e2023', { roughness: 0.7 });
    const W = 0.84, D = 0.7, base = 0.19, top = 1.72;
    const hw = W / 2, hd = D / 2;

    // Base and castors.
    const baseMat = a.finish === 'green' ? s.material('#a67c48', { roughness: 0.9 }) : a.finish === 'blue' ? s.material('#3b4046', { roughness: 0.6 }) : wire;
    keep(s.box([W, 0.035, D], [0, base - 0.018, 0], baseMat));
    keep(s.box([W + 0.02, 0.05, D + 0.02], [0, base - 0.05, 0], wire));
    const castorTurn = [0, 1, 2, 3].map(() => random() * Math.PI);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z], index) => {
      const cx = x * (hw - 0.07), cz = z * (hd - 0.07);
      keep(s.box([0.07, 0.012, 0.07], [cx, base - 0.08, cz], wire));
      const fork = keep(s.box([0.05, 0.08, 0.03], [cx, 0.085, cz], wire));
      const tyre = keep(s.cylinder(0.055, 0.055, 0.032, [cx, 0.055, cz], s.material(a.finish === 'blue' ? '#8d9296' : '#2a2c2f', { roughness: 0.6 }), 16));
      tyre.rotation.z = Math.PI / 2;
      tyre.rotation.y = fork.rotation.y = z > 0 ? castorTurn[index] : 0;
    });

    // Wire panels: thick frame tubes and a grid of thinner wires, all one instanced mesh.
    const bars: { from: P3; to: P3; r: number }[] = [];
    const panel = (corner: P3, across: P3, height: number, from = base) => {
      const width = Math.hypot(across[0], across[2]);
      const at = (u: number, y: number): P3 => [corner[0] + across[0] * u, y, corner[2] + across[2] * u];
      bars.push({ from: at(0, from), to: at(0, height), r: 0.013 }, { from: at(1, from), to: at(1, height), r: 0.013 }, { from: at(0, height), to: at(1, height), r: 0.013 }, { from: at(0, from + 0.02), to: at(1, from + 0.02), r: 0.009 });
      const nv = Math.round(width / 0.1);
      for (let i = 1; i < nv; i++) bars.push({ from: at(i / nv, from), to: at(i / nv, height), r: 0.0055 });
      const nh = Math.round((height - from) / 0.24);
      for (let i = 1; i < nh; i++) bars.push({ from: at(0, from + (height - from) * i / nh), to: at(1, from + (height - from) * i / nh), r: 0.0065 });
    };
    panel([-hw, 0, -hd], [0, 0, D], top);
    panel([hw, 0, -hd], [0, 0, D], top);
    panel([-hw, 0, -hd], [W, 0, 0], top);
    if (a.front === 'half') panel([-hw, 0, hd], [W, 0, 0], base + 0.75);
    if (a.front === 'gate') panel([-hw, 0, hd], [W, 0, 0], top - 0.03);
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), wire, bars.length);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    bars.forEach((bar, index) => {
      const from = new THREE.Vector3(...bar.from), to = new THREE.Vector3(...bar.to);
      const along = to.clone().sub(from);
      dummy.position.copy(from).add(to).multiplyScalar(0.5);
      dummy.scale.set(bar.r, along.length(), bar.r);
      dummy.quaternion.setFromUnitVectors(up, along.normalize());
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    if (a.front === 'straps') {
      const web = s.material(mood.cheer > 0.5 ? '#f0761c' : '#2a2c2f', { roughness: 0.8 });
      for (const y of [0.72, 1.25]) {
        const strap = keep(s.box([W, 0.045, 0.006], [0, y + (random() - 0.5) * 0.06, hd + 0.004], web));
        strap.rotation.z = (random() - 0.5) * 0.06;
        keep(s.box([0.05, 0.06, 0.02], [hw - 0.04, strap.position.y, hd + 0.012], dark));
      }
    }
    if (a.front === 'gate' || a.front === 'half') keep(s.box([0.04, 0.09, 0.03], [hw - 0.02, a.front === 'gate' ? 1.0 : 0.7, hd + 0.015], dark));

    // Contents.
    const spill: THREE.Object3D[] = [];
    const height = a.contents === 'empty' ? 0 : mix(0.2, 1.75, a.fill);
    const inX = hw - 0.04, inZ = hd - 0.04;
    const cardboardTones = ['#b98a55', '#c79a63', '#ad8250', '#bf9460'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    if (a.contents === 'parcels' || a.contents === 'returns' || a.contents === 'empty') {
      const returns = a.contents === 'returns';
      const tones = returns ? [...cardboardTones, '#e9e6dc', '#d8322c', '#2e9a57', '#f2c230', '#1f6fc2'] : [...cardboardTones, '#e9e6dc', '#3c4046', '#b98a55'];
      const bagTones = returns ? ['#e9e6dc', '#c22a78', '#1f6fc2'] : ['#9aa0a6', '#d9dcdf', '#3d6fb0'];
      const sticker = s.material('#f2d21e', { roughness: 0.6 });
      const tape = s.material('#dccba2', { roughness: 0.5 });
      let y = base;
      let guard = 0;
      while ((a.contents === 'empty' ? guard < 1 : y < base + height) && guard++ < 14) {
        let x = -inX;
        let layer = 0;
        while (x < inX - 0.12) {
          const w = Math.min(0.2 + random() * 0.3, inX - x), h = 0.14 + random() * 0.22, d = 0.25 + random() * 0.3;
          const item = new THREE.Group();
          if (random() < (returns ? 0.25 : 0.35)) item.add(s.ball([w / 2, h / 2, d / 2], [0, 0, 0], s.material(pick(bagTones), { roughness: 0.6 }), 12));
          else {
            item.add(s.box([w, h, d], [0, 0, 0], s.material(pick(tones), { roughness: 0.9 })));
            item.add(s.box([w * 1.004, h * 1.004, 0.04], [0, 0, 0], tape));
            if (returns && random() < 0.7) item.add(s.box([0.09, 0.06, 0.004], [(random() - 0.5) * w * 0.4, (random() - 0.5) * h * 0.3, d / 2 + 0.002], sticker));
            else if (random() < 0.6) item.add(s.box([0.1, 0.07, 0.004], [(random() - 0.5) * w * 0.4, 0, d / 2 + 0.002], s.material('#f6f3e8')));
          }
          item.position.set(a.contents === 'empty' ? (random() - 0.5) * 0.3 : x + w / 2, y + h / 2, (random() - 0.5) * Math.max(0, inZ * 2 - d));
          item.rotation.y = (random() - 0.5) * 0.3;
          item.rotation.z = (random() - 0.5) * 0.12;
          g.add(item);
          spill.push(item);
          x += w + 0.01;
          layer = Math.max(layer, h);
          if (a.contents === 'empty') break;
        }
        y += layer * 0.92;
      }
    } else if (a.contents === 'laundry') {
      const tones = mood.cheer > 0.6 ? ['#f1efe6', '#7fb2e0', '#f0d86a', '#e79aa8'] : ['#f1efe6', '#e6e2d6', '#5f8fc4', '#4f7f6a'];
      const n = Math.max(1, Math.round(height / 0.3));
      for (let i = 0; i < n; i++)
        for (let k = 0; k < 2; k++) {
          const sack = new THREE.Group();
          const cloth = s.material(pick(tones), { roughness: 0.95 });
          sack.add(s.ball([0.24, 0.2, 0.3], [0, 0, 0], cloth, 14));
          sack.add(s.cylinder(0.03, 0.07, 0.1, [0, 0.2, 0.05], cloth, 8));
          sack.add(s.ring(0.045, 0.01, [0, 0.19, 0.05], s.material('#c23a30')));
          (sack.children[2] as THREE.Mesh).rotation.x = Math.PI / 2;
          sack.position.set((k - 0.5) * 0.36 + (random() - 0.5) * 0.08, base + 0.19 + i * 0.3, (random() - 0.5) * 0.12);
          sack.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
          g.add(sack);
          spill.push(sack);
        }
    } else if (a.contents === 'cardboard') {
      const n = 5 + Math.round(a.fill * 9 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const h = Math.min(top + 0.35, 0.5 + height * (0.6 + random() * 0.5));
        const w = 0.45 + random() * 0.3, t = 0.012 + random() * 0.03;
        const sheet = keep(s.box([w, h, t], [(random() - 0.5) * (inX * 2 - w), base + h / 2, -inZ + 0.04 + i / n * (inZ * 2 - 0.08)], s.material(pick(cardboardTones), { roughness: 0.95 })));
        sheet.rotation.x = (random() - 0.5) * 0.12;
        sheet.rotation.z = (random() - 0.5) * 0.08;
        if (random() < 0.4) { const mark = s.box([w * 0.5, 0.1, t * 1.05], [sheet.position.x, base + h * (0.4 + random() * 0.3), sheet.position.z], s.material(pick(['#d8322c', '#1f6fc2', '#2e9a57', '#22252a']), { roughness: 0.9 })); mark.rotation.copy(sheet.rotation); g.add(mark); }
        if (i > n - 3) spill.push(sheet);
      }
    } else {
      const crates = a.contents === 'crates';
      const ch = crates ? 0.3 : 0.27;
      const rows = Math.max(1, Math.min(6, Math.round(height / ch)));
      const colours = crates ? ['#2e62a8', '#c23a30', '#2f8f57', '#e9b21a'] : ['#8d9296', '#2e62a8', '#3f9a8c'];
      const main = pick(colours);
      const white = s.material('#f4f3ee', { roughness: 0.4 });
      for (let row = 0; row < rows; row++)
        for (let k = 0; k < 2; k++) {
          if (row === rows - 1 && rows > 1 && k === 1 && random() < 0.4) continue;
          const tote = new THREE.Group();
          const plastic = s.material(random() < 0.75 ? main : pick(colours), { roughness: 0.5 });
          if (crates) {
            tote.add(s.box([0.36, 0.03, 0.56], [0, 0.015, 0], plastic));
            for (const y of [0.1, 0.27]) for (const z of [-0.27, 0.27]) tote.add(s.box([0.36, 0.05, 0.02], [0, y, z], plastic));
            for (const y of [0.1, 0.27]) for (const x of [-0.17, 0.17]) tote.add(s.box([0.02, 0.05, 0.56], [x, y, 0], plastic));
            for (const x of [-0.17, 0.17]) for (const z of [-0.27, 0, 0.27]) tote.add(s.box([0.022, 0.29, 0.022], [x, 0.145, z], plastic));
            const before = s.root.children.length;
            s.scatter(new THREE.CylinderGeometry(0.42, 0.5, 2.6, 8), white, Array.from({ length: 8 }, (_unused, i) => ({ at: [(i % 2 - 0.5) * 0.15, 0.15, (Math.floor(i / 2) - 1.5) * 0.125] as P3, size: 0.1 })));
            tote.add(s.root.children[before]);
          } else {
            tote.add(s.box([0.37, 0.24, 0.56], [0, 0.12, 0], plastic));
            tote.add(s.box([0.39, 0.03, 0.58], [0, 0.25, 0], s.material(pick(['#f2c230', '#c23a30', '#e9e6dc', '#2f8f57']), { roughness: 0.5 })));
            tote.add(s.box([0.12, 0.08, 0.004], [0, 0.13, 0.283], white));
          }
          tote.position.set((k - 0.5) * 0.4, base + row * ch, (random() - 0.5) * 0.03);
          tote.rotation.y = (random() - 0.5) * 0.05;
          g.add(tote);
          if (row === rows - 1) spill.push(tote);
        }
    }

    // Placard on the side panel.
    if (a.placard !== 'none') {
      const text = { store: 'STORE 114', returns: 'RETURNS', linen: 'SOILED LINEN', urgent: 'URGENT', keep: 'DO NOT TAKE' }[a.placard];
      const red = a.placard === 'urgent';
      for (const face of [0]) {
        const card = s.label(text, 0.36, 0.22, [0, 0, 0], red ? '#ffffff' : '#16181a', red ? '#c7261e' : a.placard === 'linen' ? '#f2d21e' : '#f6f3e8');
        if (face === 0) { card.position.set(hw + 0.016, 1.38, hd - 0.24); card.rotation.y = Math.PI / 2; }
        else { card.position.set(-hw + 0.24, 1.42, -hd - 0.016); card.rotation.y = Math.PI; }
        card.rotation.z = (random() - 0.5) * 0.12;
        g.add(card);
      }
    }

    // Stories.
    if (a.story === 'taped') {
      const tapeTexture = (() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 16;
        const c = canvas.getContext('2d')!;
        c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 256, 16);
        c.fillStyle = '#c7261e';
        for (let x = -16; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 16); c.lineTo(x + 16, 0); c.lineTo(x + 32, 0); c.lineTo(x + 16, 16); c.fill(); }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      })();
      const tape = new THREE.MeshStandardMaterial({ map: tapeTexture, roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const hoop = new THREE.Group();
        for (const z of [-1, 1]) hoop.add(s.box([W + 0.05, 0.075, 0.004], [0, 0, z * (hd + 0.022)], tape));
        for (const x of [-1, 1]) hoop.add(s.box([0.004, 0.075, D + 0.05], [x * (hw + 0.022), 0, 0], tape));
        hoop.position.y = 0.6 + i * 0.4 + (random() - 0.5) * 0.1;
        hoop.rotation.z = (random() - 0.5) * 0.18;
        hoop.rotation.x = (random() - 0.5) * 0.14;
        g.add(hoop);
      }
    } else if (a.story === 'coat') {
      const coat = s.material(mood.cheer > 0.5 ? '#eaf01e' : '#3b4a63', { roughness: 0.9 });
      const body = keep(s.box([0.1, 0.62, 0.42], [hw + 0.06, top - 0.33, hd - 0.2], coat));
      body.rotation.z = 0.04;
      keep(s.box([0.09, 0.5, 0.11], [hw + 0.065, top - 0.36, hd + 0.03], coat)).rotation.x = 0.1;
      keep(s.ball([0.07, 0.06, 0.2], [hw + 0.03, top + 0.0, hd - 0.2], coat, 10));
      if (mood.cheer > 0.5) for (const y of [0.42, 0.52]) keep(s.box([0.104, 0.035, 0.424], [hw + 0.06, top - y, hd - 0.2], s.material('#d5d8d6', { metalness: 0.5 })));
      const bag = s.material('#7a3f2c', { roughness: 0.8 });
      keep(s.box([0.08, 0.26, 0.3], [-hw - 0.05, top - 0.55, hd - 0.18], bag));
      keep(s.tube([[-hw - 0.05, top - 0.42, hd - 0.3], [-hw - 0.02, top + 0.0, hd - 0.2], [-hw - 0.05, top - 0.42, hd - 0.06]], 0.01, bag));
    }

    if (a.story === 'wonky') {
      g.rotation.z = 0.07;
      g.rotation.x = 0.03;
    }
    s.root.add(g);
    if (a.story === 'spilled') {
      const lost = spill.slice(-3);
      lost.forEach((item, index) => {
        g.remove(item);
        const flatHeight = a.contents === 'cardboard' ? 0.02 + index * 0.03 : a.contents === 'laundry' ? 0.19 : a.contents === 'crates' || a.contents === 'totes' ? 0 : 0.12;
        item.position.set((index - 1) * 0.42 + (random() - 0.5) * 0.15, flatHeight, hd + 0.35 + random() * 0.35);
        item.rotation.set(a.contents === 'cardboard' ? Math.PI / 2 : 0, random() * 3, 0);
        if (a.contents === 'crates' || a.contents === 'totes') { item.rotation.z = Math.PI / 2; item.position.y = 0.2; }
        s.root.add(item);
      });
    }

    s.root.rotation.y = -0.5 + (random() - 0.5) * 0.3;
    return s.finish();
  },
});

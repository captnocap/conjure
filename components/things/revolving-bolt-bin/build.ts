import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const BODY = {
  grey: '#8d949a', red: '#a8322a', green: '#3f6b4c', cream: '#d9cfae', blue: '#35557f', black: '#2c2d2f',
} as const;
const STOCK = { zinc: '#c9ced2', brass: '#c9a14a', black: '#3a3b3e', rusty: '#8a5a3a', mixed: '#b0b0a8' } as const;
const SIZES = ['1/4-20', '#8 x 1', 'M6', '3/8', '#10', 'M8', '5/16', 'NUTS', 'WASHER', '#6', 'M4', '1/2-13'];

function card(text: string, hand: boolean, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hand ? '#e9dfc0' : '#f3f1ea';
  ctx.fillRect(0, 0, 128, 64);
  if (wear > 0.4) { ctx.fillStyle = `rgba(120,90,50,${(wear - 0.4) * 0.5})`; ctx.fillRect(0, 0, 128, 64); }
  ctx.fillStyle = hand ? '#1d2c55' : '#161616';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = hand ? 'italic bold 34px cursive' : 'bold 30px monospace';
  if (hand) { ctx.translate(64, 32); ctx.rotate(-0.06); ctx.fillText(text, 0, 2, 118); }
  else { ctx.fillText(text, 64, 34, 118); ctx.fillRect(6, 6, 116, 4); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    tiers: choice('How tall is the cabinet?', {
      two: 'A squat two-tier bin that sits on the counter.',
      three: 'Three tiers on a short pedestal, waist high.',
      five: 'Five tiers, the full-size floor model at chest height.',
      seven: 'A seven-tier tower taller than the customers, hundreds of drawers.',
    }),
    finish: choice('What colour is the steel?', {
      grey: 'Plain industrial grey enamel.',
      red: 'Fire-engine red, a branded fastener display.',
      green: 'Deep machine green, like an old lathe.',
      cream: 'Chipped cream enamel from the 1930s.',
      blue: 'Workshop blue.',
      black: 'Black japanned steel with worn bright edges.',
    }),
    stock: choice('What are the fasteners mostly like?', {
      zinc: 'Bright zinc-plated bolts and nuts, silver and new.',
      brass: 'Brass wood screws and cup washers, warm yellow.',
      black: 'Black oxide machine screws, oily.',
      rusty: 'Brown rusty odds and ends nobody sorted.',
      mixed: 'A mixed jumble of silver, brass and black.',
    }),
    pulled: score('How many drawers are pulled out?', ['All pushed neatly shut', 'One left open', 'Several open mid-search', 'Half the cabinet rifled open']),
    top: choice('What sits on top of it?', {
      bare: 'Nothing, just the cap and finial.',
      scale: 'A dial scale with a brass scoop pan for weighing nails.',
      bags: 'A stack of brown paper bags and a tin scoop.',
      both: 'The scale, the scoop and the bags, ready for business.',
      boxes: 'Cardboard boxes of overstock waiting to be decanted.',
    }),
    spill: choice('Have any fasteners been spilled?', {
      none: 'None, the floor is swept.',
      few: 'A few strays have rolled out around the base.',
      handful: 'A dropped handful scattered on one side.',
      dumped: 'A whole drawer dumped out, lying upside down in a heap of bolts.',
    }),
    labels: choice('How are the drawers labelled?', {
      hand: 'Handwritten cards in fountain-pen blue.',
      printed: 'Printed size labels in card holders.',
      sample: 'A sample fastener wired to the front of each drawer.',
      none: 'Unlabelled, you have to know where things are.',
    }),
    stand: choice('What does it stand on?', {
      pedestal: 'A round weighted pedestal and a central post.',
      legs: 'Four splayed angle-iron legs.',
      crate: 'An old wooden crate turned on its end.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tiers = { two: 2, three: 3, five: 5, seven: 7 }[a.tiers];
    const R = 0.36, apothem = R * Math.cos(Math.PI / 8), faceW = 2 * R * Math.sin(Math.PI / 8);
    const tierH = 0.15;
    const baseH = { two: 0.1, three: 0.42, five: 0.3, seven: 0.2 }[a.tiers] + (a.stand === 'crate' ? 0.12 : 0);
    const rust = new THREE.Color('#7a4a2c');
    const bodyTint = new THREE.Color(BODY[a.finish]).lerp(rust, mood.wear * 0.35);
    const body = s.material(bodyTint, { metalness: 0.35, roughness: 0.5 });
    const front = s.material(bodyTint.clone().multiplyScalar(1.12), { metalness: 0.3, roughness: 0.45 });
    const dark = s.material('#1e1f21', { roughness: 0.8 });
    const steel = s.material('#b9bec2', { metalness: 0.8, roughness: 0.3 });
    const brass = s.material('#c9a14a', { metalness: 0.8, roughness: 0.35 });
    const wood = s.material('#8a6540');
    const paper = s.material('#b98f5c', { roughness: 0.95 });
    const stockColours = a.stock === 'mixed' ? ['#c9ced2', '#c9a14a', '#3a3b3e', '#8a5a3a'] : [STOCK[a.stock]];
    const pick = () => new THREE.Color(stockColours[Math.floor(random() * stockColours.length)]).lerp(rust, mood.wear * random() * 0.6);
    const bitsMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.7, roughness: 0.4 });

    // Loose fasteners are collected and drawn as two instanced meshes: hex nuts and bolts.
    type Bit = { parent: THREE.Object3D; at: THREE.Vector3; turn: THREE.Euler; size: number };
    const nuts: Bit[] = [], bolts: Bit[] = [];
    const bit = (parent: THREE.Object3D, x: number, y: number, z: number, size: number, flat = true) => {
      const isNut = random() < 0.55;
      (isNut ? nuts : bolts).push({
        parent, at: new THREE.Vector3(x, y, z), size,
        turn: isNut ? new THREE.Euler(flat ? 0 : random() * 3, random() * 6, flat ? 0 : random() * 3) : new THREE.Euler(Math.PI / 2, 0, random() * 6),
      });
    };

    // Stand.
    if (a.stand === 'pedestal') {
      s.lathe([[0, 0], [0.3, 0], [0.31, 0.025], [0.12, 0.06], [0.05, 0.1], [0.045, baseH]], dark);
    } else if (a.stand === 'legs') {
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2;
        s.rod([Math.cos(angle) * 0.34, 0, Math.sin(angle) * 0.34], [Math.cos(angle) * 0.2, baseH, Math.sin(angle) * 0.2], 0.018, dark);
      }
      s.ring(0.26, 0.012, [0, baseH * 0.45, 0], dark).rotation.x = Math.PI / 2;
      s.cylinder(0.04, 0.04, baseH * 0.5, [0, baseH * 0.75, 0], dark, 12);
    } else {
      const h = baseH - 0.04;
      s.box([0.5, h, 0.5], [0, h / 2, 0], wood);
      for (let i = 0; i < 4; i++) s.box([0.51, 0.012, 0.51], [0, h * (0.12 + i * 0.25), 0], s.material('#5e4329'));
      s.label('NAILS', 0.3, 0.09, [0, h * 0.5, 0.257], '#3a2a1c', '#9a7448');
      s.cylinder(0.05, 0.05, 0.04, [0, baseH - 0.02, 0], dark, 12);
    }

    const cards = a.labels === 'hand' || a.labels === 'printed'
      ? Array.from({ length: 5 }, () => new THREE.MeshStandardMaterial({ map: card(SIZES[Math.floor(random() * SIZES.length)], a.labels === 'hand', mood.wear), roughness: 0.9 }))
      : [];
    const frontGeometry = new THREE.BoxGeometry(faceW * 0.9, tierH * 0.84, 0.014);
    const cardGeometry = new THREE.PlaneGeometry(faceW * 0.5, tierH * 0.3);
    const pullGeometry = new THREE.BoxGeometry(faceW * 0.3, 0.014, 0.022);
    // A pie-slice drawer body seen from above, extruded to drawer height.
    const wedgeDepth = apothem * 0.82;
    const wedgeShape = new THREE.Shape([
      new THREE.Vector2(-faceW * 0.43, 0), new THREE.Vector2(faceW * 0.43, 0),
      new THREE.Vector2(faceW * 0.07, wedgeDepth), new THREE.Vector2(-faceW * 0.07, wedgeDepth),
    ]);
    const wedge = new THREE.ExtrudeGeometry(wedgeShape, { depth: tierH * 0.7, bevelEnabled: false });
    wedge.rotateX(Math.PI / 2); // now spans z 0..wedgeDepth (toward centre is +z), y -h..0
    const fillShape = new THREE.Shape([
      new THREE.Vector2(-faceW * 0.38, 0.012), new THREE.Vector2(faceW * 0.38, 0.012),
      new THREE.Vector2(faceW * 0.05, wedgeDepth - 0.012), new THREE.Vector2(-faceW * 0.05, wedgeDepth - 0.012),
    ]);
    const fill = new THREE.ShapeGeometry(fillShape);
    fill.rotateX(Math.PI / 2);

    const rings: THREE.Group[] = [];
    const openChance = [0, 0.03, 0.2, 0.5][Math.min(3, Math.floor(a.pulled * 3.999))];
    let opened = 0;
    const total = tiers * 8;
    const forced = a.pulled < 0.2 ? -1 : Math.floor(random() * 3); // one drawer facing the viewer is always open
    let dumpedTaken = false;
    for (let t = 0; t < tiers; t++) {
      const ring = new THREE.Group();
      const y0 = baseH + t * (tierH + 0.012);
      ring.position.y = y0;
      ring.rotation.y = Math.floor(random() * 8) * Math.PI / 4 + (random() - 0.5) * mix(0.02, 0.5, mood.energy);
      s.root.add(ring);
      rings.push(ring);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R, R, tierH, 8), body);
      core.rotation.y = Math.PI / 8;
      core.position.y = tierH / 2;
      core.castShadow = core.receiveShadow = true;
      ring.add(core);
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.012, 8), dark);
      lip.rotation.y = Math.PI / 8;
      lip.position.y = tierH + 0.006;
      lip.castShadow = true;
      ring.add(lip);
      for (let f = 0; f < 8; f++) {
        const face = new THREE.Group();
        face.rotation.y = f * Math.PI / 4;
        ring.add(face);
        const missing = a.spill === 'dumped' && !dumpedTaken && t === Math.min(tiers - 1, 1) && f === 1;
        if (missing) {
          dumpedTaken = true;
          const hole = new THREE.Mesh(new THREE.PlaneGeometry(faceW * 0.9, tierH * 0.84), dark);
          hole.position.set(0, tierH / 2, apothem + 0.002);
          face.add(hole);
          continue;
        }
        const viewer = t === Math.max(0, tiers - 2) && f === forced;
        const open = viewer || random() < openChance;
        const out = open ? mix(0.1, 0.24, random()) : mood.wear * random() * 0.012;
        if (open) opened++;
        const drawer = new THREE.Group();
        drawer.position.set(0, tierH / 2, apothem + out);
        face.add(drawer);
        const panel = new THREE.Mesh(frontGeometry, front);
        panel.position.z = 0.007;
        panel.castShadow = true;
        drawer.add(panel);
        const pull = new THREE.Mesh(pullGeometry, steel);
        pull.position.set(0, -tierH * 0.24, 0.024);
        drawer.add(pull);
        if (cards.length) {
          const label = new THREE.Mesh(cardGeometry, cards[Math.floor(random() * cards.length)]);
          label.position.set(0, tierH * 0.12, 0.0155);
          drawer.add(label);
        } else if (a.labels === 'sample') {
          bit(drawer, 0, tierH * 0.12, 0.02, 1.6, false);
        }
        if (open) {
          const tray = new THREE.Mesh(wedge, body);
          tray.rotation.y = Math.PI; // run back toward the centre
          tray.position.y = tierH * 0.3;
          tray.castShadow = true;
          drawer.add(tray);
          const contents = new THREE.Mesh(fill, new THREE.MeshStandardMaterial({ color: pick().multiplyScalar(0.55), roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }));
          contents.rotation.y = Math.PI;
          contents.position.y = tierH * 0.3 + 0.002;
          drawer.add(contents);
          const heap = 5 + Math.floor(random() * 6);
          for (let i = 0; i < heap; i++) {
            const depth = random() * Math.min(out, wedgeDepth) * 0.85 + 0.015;
            const half = faceW * 0.36 * (1 - depth / wedgeDepth * 0.8);
            bit(drawer, (random() * 2 - 1) * half, tierH * 0.3 + 0.008, -depth, 1.1, false);
          }
        }
      }
    }
    void opened; void total;

    // Cap and whatever lives on top.
    const topY = baseH + tiers * (tierH + 0.012);
    const cap = s.cylinder(R * 0.55, R + 0.02, 0.04, [0, topY + 0.02, 0], body, 8);
    cap.rotation.y = Math.PI / 8;
    const capY = topY + 0.04;
    const hasScale = a.top === 'scale' || a.top === 'both';
    const hasBags = a.top === 'bags' || a.top === 'both';
    if (a.top === 'bare') {
      s.cylinder(0.02, 0.03, 0.05, [0, capY + 0.025, 0], dark, 10);
      s.ball([0.03, 0.03, 0.03], [0, capY + 0.07, 0], steel, 12);
    }
    if (hasScale) {
      const x = hasBags ? -0.08 : 0;
      const white = s.material('#ece7d8', { roughness: 0.4 });
      s.box([0.2, 0.05, 0.16], [x, capY + 0.025, 0], s.material('#b3282a', { roughness: 0.4 }));
      s.cylinder(0.11, 0.11, 0.05, [x, capY + 0.17, 0.02], white, 28).rotation.x = Math.PI / 2;
      s.box([0.05, 0.08, 0.04], [x, capY + 0.08, 0], s.material('#b3282a'));
      s.rod([x, capY + 0.17, 0.047], [x + Math.sin(mix(-2, 2, random())) * 0.085, capY + 0.17 + Math.cos(mix(-2, 2, random())) * 0.085, 0.047], 0.005, s.material('#c0201c'));
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        s.box([0.006, 0.018, 0.002], [x + Math.sin(angle) * 0.09, capY + 0.17 + Math.cos(angle) * 0.09, 0.046], dark).rotation.z = -angle;
      }
      // Scoop pan on top of the dial.
      s.lathe([[0, 0], [0.09, 0.015], [0.14, 0.05], [0.145, 0.055]], brass, [x, capY + 0.29, 0.01]).scale.z = 0.7;
      s.cylinder(0.012, 0.012, 0.02, [x, capY + 0.285, 0.01], brass, 10);
      for (let i = 0; i < 9; i++) bit(s.root, x + (random() - 0.5) * 0.12, capY + 0.31 + random() * 0.012, 0.01 + (random() - 0.5) * 0.08, 1.2, false);
    }
    if (hasBags) {
      const x = hasScale ? 0.13 : -0.04;
      const stack = 5 + Math.floor(mix(2, 12, mood.density) * random() + 2);
      for (let i = 0; i < stack; i++) {
        const bag = s.box([0.13, 0.006, 0.2], [x + (random() - 0.5) * 0.012, capY + 0.003 + i * 0.006, (random() - 0.5) * 0.012], paper);
        bag.rotation.y = (random() - 0.5) * 0.2;
      }
      // A filled bag standing with its top folded over.
      if (!hasScale) {
        s.box([0.09, 0.14, 0.06], [x + 0.16, capY + 0.07, 0.03], paper);
        s.box([0.092, 0.025, 0.065], [x + 0.16, capY + 0.15, 0.036], paper).rotation.x = 0.5;
      }
      // Tin scoop lying on the bags.
      const scoop = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 14, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#c4c8ca', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }));
      bowl.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      bowl.castShadow = true;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.08, 10), wood);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, 0, -0.09);
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.035, 14, Math.PI, Math.PI), bowl.material);
      back.position.z = -0.05;
      scoop.add(bowl, handle, back);
      scoop.position.set(x, capY + stack * 0.006 + 0.036, 0.02);
      scoop.rotation.y = mix(-0.8, 0.8, random());
      s.root.add(scoop);
    }
    if (a.top === 'boxes') {
      const card2 = s.material('#b08a5a', { roughness: 0.95 });
      const n = 2 + Math.floor(mood.density * 3.5);
      let y = capY;
      for (let i = 0; i < n; i++) {
        const w = mix(0.16, 0.26, random()) * (1 - i * 0.08), h = mix(0.07, 0.12, random());
        const box = s.box([w, h, w * 0.75], [(random() - 0.5) * 0.06, y + h / 2, (random() - 0.5) * 0.05], card2);
        box.rotation.y = (random() - 0.5) * 0.7;
        s.box([w * 0.5, h * 0.5, 0.002], [box.position.x, y + h / 2, box.position.z + w * 0.38], s.material('#efe9d6')).rotation.y = box.rotation.y;
        y += h;
      }
    }

    // Spills on the floor (not part of the turning cabinet).
    const spillCount = { none: 0, few: 7, handful: 26, dumped: 70 }[a.spill] * mix(0.7, 1.4, mood.density);
    const side = random() * Math.PI * 0.6 + 0.3;
    for (let i = 0; i < spillCount; i++) {
      const spread = a.spill === 'few' ? random() * Math.PI * 2 : side + (random() - 0.5) * 1.3;
      const distance = a.spill === 'few' ? mix(0.2, 0.6, random()) : mix(0.33, 0.75, Math.pow(random(), 0.7));
      bit(s.root, Math.sin(spread) * distance, 0.006, Math.cos(spread) * distance, 1.9);
    }
    if (a.spill === 'dumped') {
      const tray = s.mesh(wedge, body, [Math.sin(side) * 0.52, tierH * 0.7, Math.cos(side) * 0.52]);
      tray.rotation.y = side + 0.6;
      tray.scale.z = 1;
      const face = s.box([faceW * 0.9, tierH * 0.84, 0.014], [Math.sin(side) * 0.52, tierH * 0.42, Math.cos(side) * 0.52], front);
      face.rotation.y = side + 0.6;
      face.rotateX(-0.25);
      for (let i = 0; i < 30; i++) bit(s.root, Math.sin(side) * 0.5 + (random() - 0.5) * 0.3, 0.012 + random() * 0.03, Math.cos(side) * 0.5 + (random() - 0.5) * 0.3, 1.9, false);
    }

    // Bake the loose fasteners.
    s.root.updateMatrixWorld(true);
    const dummy = new THREE.Object3D();
    const bake = (list: Bit[], geometry: THREE.BufferGeometry) => {
      if (!list.length) return;
      // Group by parent so drawers that turn carry their contents.
      const byParent = new Map<THREE.Object3D, Bit[]>();
      for (const item of list) byParent.set(item.parent, [...(byParent.get(item.parent) ?? []), item]);
      for (const [parent, items] of byParent) {
        const mesh = new THREE.InstancedMesh(geometry, bitsMaterial, items.length);
        items.forEach((item, index) => {
          dummy.position.copy(item.at);
          dummy.rotation.copy(item.turn);
          dummy.scale.setScalar(item.size);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
          mesh.setColorAt(index, pick());
        });
        mesh.castShadow = true;
        parent.add(mesh);
      }
    };
    bake(nuts, new THREE.CylinderGeometry(0.011, 0.011, 0.007, 6));
    const boltGeometry = new THREE.CylinderGeometry(0.004, 0.004, 0.035, 6);
    bake(bolts, boltGeometry);

    const speed = mix(0, 0.5, Math.max(0, mood.energy - 0.15));
    const thing = s.finish({
      footprint: 0.45,
      update: (dt) => { rings.forEach((ring, index) => { ring.rotation.y += dt * speed * (index % 2 ? -0.7 : 1); }); },
    });
    return thing;
  },
});

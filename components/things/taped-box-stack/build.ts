import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const LABELS = {
  kitchen: 'KITCHEN: plates and pans, the practical box.',
  books: 'BOOKS: heavy, overfilled, the one nobody wants to carry.',
  fragile: 'FRAGILE, underlined twice, with a wine-glass symbol.',
  mums: "MUM'S: a dead or absent parent's things, not yet sorted.",
  misc: 'MISC: the box of everything that had no category.',
  keep: 'KEEP, circled: what survived the cull.',
  charity: 'CHARITY SHOP: what did not.',
  blank: 'No label at all, anonymous cardboard.',
} as const;
const TEXT: Record<keyof typeof LABELS, string> = {
  kitchen: 'KITCHEN', books: 'BOOKS', fragile: 'FRAGILE', mums: "MUM'S", misc: 'MISC', keep: 'KEEP', charity: 'CHARITY', blank: '',
};
const OTHERS = ['KITCHEN', 'BOOKS', 'BEDROOM', 'BATH', 'MISC', 'WINTER', 'TOYS', 'PHOTOS', 'DESK', 'LINEN', 'SHOES', 'CABLES'];

export default defineThing({
  questions: {
    label: choice('What does the marker label on the top box say?', LABELS),
    packing: score('How carefully were they packed?', [
      'Thrown together in a panic: bulging, crooked, half taped',
      'Ordinary, a bit uneven',
      'Square, double taped, labelled on every side with arrows',
    ]),
    shape: choice('How are the boxes stacked?', {
      tower: 'One tall teetering column.',
      wall: 'A neat wall two boxes wide, like a removal firm did it.',
      heap: 'A low sprawl, boxes shoved together and one on its side.',
      pair: 'Just two or three: nearly everything has already gone.',
    }),
    open: choice('What is in the box left open on the floor?', {
      crockery: 'Plates and cups half wrapped in newspaper.',
      books: 'Paperbacks packed spine up.',
      keepsakes: 'A soft toy, a framed photo and a lamp shade: things with no proper box.',
      empty: 'Only crumpled newspaper, waiting to be filled.',
      none: 'Nothing: every box is sealed.',
    }),
    tape: choice('What tape seals them?', {
      brown: 'Ordinary brown parcel tape.',
      clear: 'Clear glossy tape that catches the light.',
      warning: 'Red and white FRAGILE tape.',
      duct: 'Silver duct tape, whatever was in the drawer.',
    }),
    hand: choice('Whose handwriting is on them?', {
      neat: 'Neat square capitals in black marker.',
      scrawl: 'A hurried slanting scrawl.',
      child: "A child's big wobbly letters in coloured pen.",
    }),
    topper: choice('What has been left on top of the stack?', {
      nothing: 'Nothing.',
      tapegun: 'A tape gun and a marker pen, mid-job.',
      plant: 'A houseplant in its pot, travelling last.',
      mug: 'A single mug of tea going cold.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const care = a.packing;
    const board = new THREE.Color('#b98d5c').lerp(new THREE.Color('#8f7450'), mood.wear * 0.6);
    const boardHex = `#${board.getHexString()}`;
    const inner = s.material('#a67d50');
    const tapeHex = { brown: '#8a5a2b', clear: '#e3d8bd', warning: '#d83a2e', duct: '#a9adb0' }[a.tape];
    const tapeMat = s.material(tapeHex, { roughness: a.tape === 'clear' || a.tape === 'duct' ? 0.25 : 0.5, metalness: a.tape === 'duct' ? 0.5 : 0 });
    const ink = a.hand === 'child' ? ['#c2262b', '#1f55b8', '#1d8a47', '#7a2aa8'] : ['#151515'];

    const face = (text: string, w: number, h: number, extra: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = Math.max(96, Math.round(256 * h / w));
      const ctx = canvas.getContext('2d')!;
      const H = canvas.height;
      ctx.fillStyle = boardHex; ctx.fillRect(0, 0, 256, H);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '70,45,20' : '255,235,200'},${0.03 + random() * 0.05})`; ctx.fillRect(0, random() * H, 256, 1 + random() * 2); }
      for (let i = 0; i < (mood.wear - 0.3) * 12; i++) { ctx.fillStyle = `rgba(60,40,25,${0.05 + random() * 0.08})`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * H, 6 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); ctx.fill(); }
      // tape running down from the top seam
      ctx.fillStyle = tapeHex; ctx.globalAlpha = a.tape === 'clear' ? 0.55 : 1;
      const tx = 128 + (random() - 0.5) * 30 * (1 - care);
      ctx.save(); ctx.translate(tx, 0); ctx.rotate((random() - 0.5) * 0.25 * (1 - care)); ctx.fillRect(-16, -4, 32, H * (0.2 + random() * 0.1));
      if (a.tape === 'warning') { ctx.fillStyle = '#fff'; for (let y = 2; y < H * 0.2; y += 12) ctx.fillRect(-16, y, 32, 4); }
      ctx.restore(); ctx.globalAlpha = 1;
      if (text) {
        const size = Math.min(H * 0.34, 215 / text.length * 1.45);
        const slant = a.hand === 'scrawl' ? -0.22 : 0;
        const jitter = a.hand === 'neat' ? 0.03 : a.hand === 'scrawl' ? 0.1 : 0.2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${a.hand === 'scrawl' ? 'italic ' : ''}bold ${size}px ${a.hand === 'neat' ? 'Arial, sans-serif' : '"Comic Sans MS", "Segoe Print", cursive, sans-serif'}`;
        const step = Math.min(size * 0.72, 215 / text.length);
        const tilt = (random() - 0.5) * (a.hand === 'neat' ? 0.05 : 0.22);
        ctx.save(); ctx.translate(128, H * 0.6); ctx.rotate(tilt);
        [...text].forEach((ch, i) => {
          ctx.save();
          ctx.translate((i - (text.length - 1) / 2) * step, (random() - 0.5) * size * jitter);
          ctx.transform(1, 0, slant, 1, 0, 0); ctx.rotate((random() - 0.5) * jitter * 1.6);
          ctx.fillStyle = ink[Math.floor(random() * ink.length)];
          const k = a.hand === 'child' ? 0.8 + random() * 0.45 : 1; ctx.scale(k, k);
          ctx.fillText(ch, 0, 0); ctx.restore();
        });
        ctx.strokeStyle = ink[0]; ctx.lineWidth = size * 0.09; ctx.lineCap = 'round';
        if (text === 'FRAGILE' || a.hand === 'scrawl') { for (const dy of text === 'FRAGILE' ? [0.62, 0.78] : [0.66]) { ctx.beginPath(); ctx.moveTo(-text.length * step * 0.5, size * dy); ctx.lineTo(text.length * step * 0.5, size * (dy - 0.06)); ctx.stroke(); } }
        if (text === 'KEEP') { ctx.beginPath(); ctx.ellipse(0, 0, text.length * step * 0.62, size * 0.75, 0.03, 0, 6.6); ctx.stroke(); }
        ctx.restore();
        if (extra) { // this-way-up arrows in the corner
          ctx.strokeStyle = ink[0]; ctx.lineWidth = 5;
          for (const x of [26, 48]) { ctx.beginPath(); ctx.moveTo(x, H * 0.42); ctx.lineTo(x, H * 0.12); ctx.moveTo(x - 8, H * 0.2); ctx.lineTo(x, H * 0.1); ctx.lineTo(x + 8, H * 0.2); ctx.stroke(); }
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    };
    const plain = new THREE.MeshStandardMaterial({ color: board, roughness: 0.92 });

    const carton = (w: number, h: number, d: number, text: string, opened: boolean) => {
      const g = new THREE.Group();
      const front = face(text, w, h, care > 0.6);
      const sideText = care > 0.66 ? text : '';
      const mats = [sideText ? face(sideText, d, h, false) : plain, plain, plain, plain, front, care > 0.4 && text ? face(text, w, h, false) : plain];
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      if (!opened) {
        add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)).position.y = h / 2;
        // top seam tape, and a bulge when overfilled
        const bulge = (1 - care) * 0.05 * random();
        for (const sign of [-1, 1]) {
          const flap = add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.995, 0.006, d / 2), plain));
          flap.position.set(0, h + 0.003 + bulge / 2, sign * d / 4); flap.rotation.x = sign * Math.atan2(bulge, d / 2);
        }
        const strips = care > 0.6 ? 2 : 1;
        for (let i = 0; i < strips; i++) {
          const t = add(new THREE.Mesh(new THREE.BoxGeometry(i ? 0.05 : w + 0.004, 0.004, i ? d + 0.004 : 0.05), tapeMat));
          t.position.set(i ? 0 : 0, h + 0.009 + bulge, 0); t.rotation.y = (random() - 0.5) * 0.3 * (1 - care);
        }
      } else {
        const t = 0.006;
        add(new THREE.Mesh(new THREE.BoxGeometry(w, t, d), plain)).position.y = t / 2;
        for (const sign of [-1, 1]) {
          add(new THREE.Mesh(new THREE.BoxGeometry(w, h, t), sign > 0 ? front : plain)).position.set(0, h / 2, sign * (d / 2 - t / 2));
          add(new THREE.Mesh(new THREE.BoxGeometry(t, h, d), plain)).position.set(sign * (w / 2 - t / 2), h / 2, 0);
          // four flaps folded outwards at different angles
          const fa = mix(0.5, 2.1, random());
          const f1 = new THREE.Group(); f1.position.set(0, h, sign * d / 2); f1.rotation.x = sign * fa;
          const m1 = add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, d / 2, t), inner)); f1.add(m1); m1.position.y = d / 4; g.add(f1);
          const fb = mix(0.6, 2.2, random());
          const f2 = new THREE.Group(); f2.position.set(sign * w / 2, h, 0); f2.rotation.z = -sign * fb;
          const m2 = add(new THREE.Mesh(new THREE.BoxGeometry(t, w * 0.42, d * 0.98), inner)); f2.add(m2); m2.position.y = w * 0.21; g.add(f2);
        }
      }
      return g;
    };

    // newsprint for wrapping
    const news = (() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#d9d5c8'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#55554f';
      for (let y = 6; y < 128; y += 5) for (let x = 4; x < 124; x += 30) if (random() > 0.12) ctx.fillRect(x, y, 22 + random() * 5, random() < 0.08 ? 4 : 1.6);
      ctx.fillRect(10, 40, 50, 30);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, flatShading: true });
    })();
    const crumple = (r: number) => {
      const geo = new THREE.IcosahedronGeometry(r, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.72 + ((Math.sin(p.getX(i) * 91.7 + p.getY(i) * 37.3 + p.getZ(i) * 53.1) + 1) / 2) * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, news); mesh.castShadow = mesh.receiveShadow = true; mesh.rotation.set(random() * 6, random() * 6, random() * 6);
      return mesh;
    };

    // --- lay out the stack
    const count = a.shape === 'pair' ? 2 + (mood.density > 0.6 ? 1 : 0) : Math.round(mix(4, 8, mood.density));
    const names = Array.from({ length: count }, () => OTHERS[Math.floor(random() * OTHERS.length)]);
    if (a.label === 'blank') names.fill('');
    names[count - 1] = TEXT[a.label];
    const size = () => [mix(0.4, 0.56, random()), mix(0.28, 0.42, random()), mix(0.34, 0.44, random())] as const;
    const skew = () => (random() - 0.5) * mix(0.7, 0.06, care);
    const slip = () => (random() - 0.5) * mix(0.16, 0.02, care);
    let top = new THREE.Vector3(0, 0, 0);
    const put = (index: number, x: number, y: number, z: number, dims: readonly [number, number, number]) => {
      const box = carton(dims[0], dims[1], dims[2], names[index], false);
      box.position.set(x + slip(), y, z + slip()); box.rotation.y = skew();
      s.root.add(box);
      if (index === count - 1) top = new THREE.Vector3(box.position.x, y + dims[1], box.position.z);
      return box;
    };
    if (a.shape === 'tower' || a.shape === 'pair') {
      let y = 0;
      const perColumn = a.shape === 'tower' ? Math.min(count, 5) : count;
      const base = [0.56, 0.4, 0.44] as const;
      const rest: number[] = [];
      for (let i = 0; i < count; i++) (i >= count - perColumn ? rest : rest).push(i);
      // spare boxes beside the tower first, then the column, so the labelled one ends on top
      const beside = count - perColumn;
      for (let i = 0; i < beside; i++) put(i, -0.62 - (i % 2) * 0.05, Math.floor(i / 2) * 0.36, (i % 2 ? -0.25 : 0.2), [0.5, 0.36, 0.4]);
      for (let i = beside; i < count; i++) {
        const k = (i - beside) / Math.max(1, perColumn - 1);
        const dims = [base[0] - k * 0.12 + random() * 0.03, mix(0.3, 0.4, random()), base[2] - k * 0.06] as const;
        put(i, 0, y, 0, dims); y += dims[1] + 0.012 + (1 - care) * 0.02;
      }
    } else if (a.shape === 'wall') {
      const heights = [0, 0];
      for (let i = 0; i < count; i++) {
        const col = i === count - 1 ? (heights[0] >= heights[1] ? 0 : 1) : i % 2;
        const dims = [0.52, mix(0.32, 0.38, random()), 0.42] as const;
        put(i, (col - 0.5) * 0.55, heights[col], 0, dims); heights[col] += dims[1] + 0.012;
      }
    } else {
      // heap: ground row, a few on top, one tipped on its side
      const ground = Math.ceil(count * 0.6);
      const tops: [number, number, number][] = [];
      for (let i = 0; i < ground; i++) {
        const dims = size();
        const x = ((i % 3) - Math.min(ground - 1, 2) / 2) * 0.6, z = -Math.floor(i / 3) * 0.5 + (i % 2 ? -0.08 : 0.08) + (random() - 0.5) * 0.1;
        const box = put(i, x, 0, z, dims);
        if (i === 0 && ground > 2) { box.rotation.z = Math.PI / 2; box.position.y = 0; box.position.x -= dims[1] / 2 - 0.1; box.position.y = dims[0] / 2; box.children.forEach((c) => (c.position.y -= dims[1] / 2)); }
        else tops.push([x, dims[1], z]);
      }
      for (let i = ground; i < count; i++) {
        const [x, y, z] = tops[(i - ground + 1) % tops.length];
        put(i, x, y + 0.012, z, [0.42, mix(0.26, 0.34, random()), 0.36]);
      }
    }

    // --- the open box on the floor in front
    if (a.open !== 'none') {
      const w = 0.5, h = 0.34, d = 0.42;
      const box = carton(w, h, d, a.open === 'crockery' ? 'FRAGILE' : '', true);
      const ox = a.shape === 'wall' ? 0.95 : a.shape === 'heap' ? 0.1 : 0.62, oz = a.shape === 'heap' ? 0.72 : 0.38;
      box.position.set(ox, 0, oz); box.rotation.y = -0.35 + skew();
      s.root.add(box);
      const fill = a.open === 'empty' ? 0.35 : 0.72;
      for (let i = 0; i < 9; i++) { const c = crumple(0.07 + random() * 0.04); c.position.set((random() - 0.5) * (w - 0.18), h * fill + random() * 0.05, (random() - 0.5) * (d - 0.18)); box.add(c); }
      if (a.open === 'crockery') {
        const china = s.material('#f1eee4', { roughness: 0.3 }), rim = s.material('#35629c', { roughness: 0.3 });
        for (let i = 0; i < 4; i++) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 24), china); plate.rotation.z = Math.PI / 2 - 0.15; plate.position.set(-0.12 + i * 0.035, h * 0.86, 0.06); plate.castShadow = true; box.add(plate);
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.006, 6, 24), rim); band.rotation.y = Math.PI / 2; band.rotation.z = 0; band.position.copy(plate.position); band.rotation.set(0, Math.PI / 2 , 0); box.add(band);
        }
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 16), china); cup.position.set(0.12, h + 0.03, -0.08); cup.rotation.z = 0.5; cup.castShadow = true; box.add(cup);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 14), china); handle.position.set(0.165, h + 0.045, -0.08); handle.rotation.z = 0.5; box.add(handle);
      } else if (a.open === 'books') {
        const colours = ['#b23b32', '#2f5d8c', '#d7a531', '#3c7a52', '#6d3f7d', '#e8e2d0', '#1f2a36', '#d2622a'];
        let x = -w / 2 + 0.05;
        while (x < w / 2 - 0.06) {
          const t = 0.018 + random() * 0.03, bh = 0.17 + random() * 0.05;
          const book = new THREE.Mesh(new THREE.BoxGeometry(t, bh, 0.12), s.material(colours[Math.floor(random() * colours.length)]));
          book.position.set(x + t / 2, h - bh / 2 + 0.05 + random() * 0.02, 0.07); book.rotation.z = (random() - 0.5) * 0.12; book.castShadow = true; box.add(book);
          x += t + 0.003;
        }
      } else if (a.open === 'keepsakes') {
        const fur = s.material('#b5834f', { roughness: 1 });
        const bear = new THREE.Group();
        const part = (r: number, x: number, y: number, z: number, m: THREE.Material = fur) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); b.position.set(x, y, z); b.castShadow = true; bear.add(b); };
        part(0.075, 0, 0, 0); part(0.06, 0, 0.11, 0); part(0.024, -0.045, 0.16, 0); part(0.024, 0.045, 0.16, 0); part(0.028, 0, 0.1, 0.05, s.material('#e2c9a0'));
        part(0.03, -0.085, 0.03, 0.02); part(0.03, 0.085, 0.03, 0.02); part(0.009, -0.022, 0.125, 0.052, s.material('#111')); part(0.009, 0.022, 0.125, 0.052, s.material('#111'));
        bear.position.set(-0.1, h + 0.02, 0.05); bear.rotation.z = 0.25; box.add(bear);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.16, 20, 1, true), s.material('#e9dcb8', { side: THREE.DoubleSide, emissive: '#e9c98a', emissiveIntensity: 0.15 }));
        shade.position.set(0.12, h + 0.04, -0.06); shade.rotation.z = -0.3; shade.castShadow = true; box.add(shade);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.015), s.material('#5b3b22')); frame.position.set(0.02, h + 0.02, 0.15); frame.rotation.x = -0.25; frame.castShadow = true; box.add(frame);
        const photo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.004), s.material('#cdd8dc')); photo.position.set(0.02, h + 0.022, 0.159); photo.rotation.x = -0.25; box.add(photo);
      }
      // spare sheets of newspaper on the floor
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.003, 0.24), news); sheet.position.set(ox + (random() - 0.5) * 0.5, 0.002 + i * 0.003, oz + 0.38 + random() * 0.15); sheet.rotation.y = random() * 3; sheet.receiveShadow = true; s.root.add(sheet);
      }
    }

    // --- something left on top
    if (a.topper === 'tapegun') {
      const red = s.material('#c93a2c'), steel = s.material('#9aa0a3', { metalness: 0.6, roughness: 0.3 });
      const g = new THREE.Group();
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 20), tapeMat); roll.rotation.x = Math.PI / 2; roll.position.set(0, 0.07, 0);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.054, 14), red); hub.rotation.x = Math.PI / 2; hub.position.copy(roll.position);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.056), red); arm.position.set(0.07, 0.06, 0);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.035), red); grip.position.set(0.02, 0.0, 0); grip.rotation.z = 0.35;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.035, 0.06), steel); blade.position.set(0.155, 0.075, 0);
      g.add(roll, hub, arm, grip, blade); g.children.forEach((c) => (c.castShadow = true));
      g.rotation.x = Math.PI / 2; g.rotation.z = 0; g.position.copy(top).add(new THREE.Vector3(-0.08, 0.03, 0.02)); s.root.add(g);
      const pen = s.rod([top.x + 0.08, top.y + 0.02, top.z + 0.1], [top.x + 0.2, top.y + 0.02, top.z + 0.05], 0.009, s.material('#1c1c1c'));
      pen.castShadow = true;
    } else if (a.topper === 'plant') {
      s.cylinder(0.075, 0.055, 0.12, [top.x, top.y + 0.07, top.z], s.material('#b5613f'), 18);
      const leaf = s.material(mood.wear > 0.7 ? '#8a8a4a' : '#3f8a4c', { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const ang = i * 2.4 + random(), len = 0.16 + random() * 0.14, droop = mix(0.2, 0.9, mood.wear * 0.7 + random() * 0.3);
        const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), leaf); blade.scale.set(0.035, len / 2, 0.006);
        const pivot = new THREE.Group(); pivot.position.set(top.x, top.y + 0.13, top.z); pivot.rotation.set(0, ang, 0);
        const tilt = new THREE.Group(); tilt.rotation.z = droop; blade.position.y = len / 2; blade.castShadow = true; tilt.add(blade); pivot.add(tilt); s.root.add(pivot);
      }
    } else if (a.topper === 'mug') {
      const mug = s.material(mood.cheer > 0.5 ? '#e0b02c' : '#e8e4da', { roughness: 0.35 });
      s.cylinder(0.042, 0.038, 0.095, [top.x + 0.05, top.y + 0.06, top.z + 0.04], mug, 18);
      s.cylinder(0.036, 0.036, 0.004, [top.x + 0.05, top.y + 0.105, top.z + 0.04], s.material('#6a4326'), 18);
      s.ring(0.028, 0.007, [top.x + 0.095, top.y + 0.06, top.z + 0.04], mug);
    }

    return s.finish();
  },
});

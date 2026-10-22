import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { beacon, crew, rbox, wheel } from './parts';

const CART = { grey: '#9ea5a6', yellow: '#eebb1a', blue: '#2a5ea8', red: '#c62d2a', green: '#2f7a55', cream: '#e6dcbc' } as const;
const HOLIDAY = ['#e2452f', '#f2b417', '#2f8fd0', '#35a06c', '#e86fa5', '#7a4fc0', '#f07c1f', '#22262b', '#1f9aa0'];
const BUSINESS = ['#1f2125', '#2a2d33', '#3a3d44', '#23262b', '#50545c'];
const LEATHER = ['#7a4a2a', '#9a6238', '#5a3520', '#b98a52', '#3f2a1c', '#c9b28a'];
const CARGO = ['#b9925e', '#c6a472', '#a8824f', '#8d8f8a', '#d0b98c'];

export default defineThing({
  questions: {
    carts: choice('How many carts is the tug pulling?', {
      one: 'A single cart: a quiet flight or the last run of the night.',
      two: 'Two carts.',
      three: 'Three carts, the usual train.',
      four: 'Four carts snaking behind, a full widebody load.',
    }),
    load: choice('What are the carts loaded with?', {
      holiday: 'Bright holiday suitcases in every colour, rucksacks, a beach parasol.',
      business: 'Identical black and grey wheeled cabin cases, stacked like bricks.',
      vintage: 'Tan leather trunks, strapped suitcases and round hat boxes from the 1960s.',
      mail: 'Grey and blue canvas mail sacks, slumped and tagged.',
      cargo: 'Cardboard cartons and wooden crates under a net.',
      empty: 'Nothing: the carts are running empty, curtains flapping.',
    }),
    special: choice('What one unusual item rides on the last cart?', {
      none: 'Nothing unusual.',
      pet: 'A pet crate with a wire door and a water bottle, something alive inside.',
      cello: 'A cello in a hard case, strapped upright.',
      coffin: 'A plain coffin riding alone, the rest of that cart left empty out of respect.',
      surfboard: 'A surfboard in a silver bag laid across the top.',
      bicycle: 'A bicycle box, flat and enormous, marked FRAGILE.',
    }),
    tug: choice('What era is the tug?', {
      fifties: 'A 1950s tractor with a rounded bonnet and an open sprung seat.',
      seventies: 'A boxy 1970s diesel tug with a flat bonnet and a tin roof on four posts.',
      electric: 'A smooth modern electric tug with a windscreen and a charging stripe.',
    }),
    driver: noul('Is there a driver at the wheel?'),
    curtains: choice('How are the cart sides?', {
      open: 'Curtains rolled up under the roof, the load on show.',
      half: 'Curtains half drawn, some carts closed, some open.',
      closed: 'Curtains pulled shut along the near side against the rain.',
      flat: 'No roofs at all: open flatbed dollies with low rails.',
    }),
    colour: choice('What colour are the carts?', {
      grey: 'Bare galvanised grey.', yellow: 'Ramp yellow.', blue: 'Airline blue.', red: 'Post-office red.', green: 'Dark green.', cream: 'Cream, with faded lettering.',
    }),
    fallen: choice('What has fallen on the concrete behind the train?', {
      nothing: 'Nothing has fallen.',
      case: 'One suitcase, lying on its side where it bounced off.',
      burst: 'A case that burst open, clothes strewn round it.',
      teddy: 'A small teddy bear, face down.',
      trail: 'A trail of three or four bags dropped one after another.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { one: 1, two: 2, three: 3, four: 4 }[a.carts];
    const cartPaint = s.material(CART[a.colour], { roughness: 0.55, metalness: a.colour === 'grey' ? 0.5 : 0.1 });
    const canvasPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(CART[a.colour]).lerp(new THREE.Color('#e8e2d0'), 0.55).lerp(new THREE.Color('#8b8275'), mood.wear * 0.3), roughness: 0.95, side: THREE.DoubleSide });
    const dark = s.material('#2a2d30', { roughness: 0.7 }), tyre = s.material('#1b1c1e', { roughness: 0.9 });
    const hub = s.material('#d9d8d0', { metalness: 0.3 }), steel = s.material('#9aa1a3', { metalness: 0.6, roughness: 0.4 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a6', emissiveIntensity: mix(0.3, 2.2, Math.abs(mood.daylight - 0.5) * 2) });
    const vest = s.material('#d8e62a', { emissive: '#8a9a00', emissiveIntensity: 0.25 }), cloth = s.material('#2b3550'), skin = s.material('#c9a58a');
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const tone = (hex: string, rough = 0.6) => { let m = mats.get(hex); if (!m) { m = s.material(hex, { roughness: rough }); mats.set(hex, m); } return m; };

    const CL = 2.9, CW = 1.5, GAP = 0.7, bed = 0.58, roofY = 2.05;
    const tugL = a.tug === 'electric' ? 2.5 : a.tug === 'fifties' ? 2.5 : 2.8;
    const total = tugL + n * (CL + GAP);
    const x0 = total / 2;                       // nose of the tug
    // A gentle snake so the train is not ruler straight.
    const sway = (x: number) => Math.sin((x0 - x) * 0.22 + random() * 0.0) * 0.0;
    void sway;

    // ---- Luggage pieces.
    const suitcase = (g: THREE.Group, size: [number, number, number], at: [number, number, number], hex: string, yaw = 0, style: 'hard' | 'leather' | 'box' = 'hard') => {
      const m = new THREE.Mesh(rcache(size, style === 'box' ? 0.015 : 0.05), tone(hex, style === 'hard' ? 0.45 : 0.8));
      m.position.set(...at); m.rotation.y = yaw; m.castShadow = m.receiveShadow = true; g.add(m);
      if (style === 'leather') for (const d of [-0.28, 0.28]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, size[1] + 0.012, size[2] + 0.012), tone('#3a2416')); strap.position.set(at[0] + Math.cos(yaw) * d * size[0], at[1], at[2] - Math.sin(yaw) * d * size[0]); strap.rotation.y = yaw; g.add(strap); }
      if (style === 'box') { const tape = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.01, 0.012, 0.06), tone('#d8c9a0')); tape.position.set(at[0], at[1] + size[1] / 2, at[2]); tape.rotation.y = yaw; g.add(tape); }
      return m;
    };
    const geos = new Map<string, THREE.BufferGeometry>();
    const rcache = (size: [number, number, number], r: number) => {
      const q = size.map((v) => Math.round(v * 10) / 10) as [number, number, number];
      const key = q.join('x') + r;
      let g = geos.get(key);
      if (!g) { const probe = rbox(s, q, [0, 0, 0], dark, r); g = probe.geometry; s.root.remove(probe); geos.set(key, g); }
      return g;
    };
    const sack = (g: THREE.Group, at: [number, number, number], hex: string) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), tone(hex, 0.95));
      m.scale.set(0.32 + random() * 0.1, 0.2 + random() * 0.08, 0.26 + random() * 0.08); m.position.set(...at); m.rotation.y = random() * 3; m.castShadow = true; g.add(m);
      const neck = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), tone(hex, 0.95)); neck.position.set(at[0] + 0.3, at[1] + 0.06, at[2]); neck.rotation.z = -1.2; g.add(neck);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.06), tone('#f2e9c8')); tag.position.set(at[0] + 0.3, at[1] + 0.13, at[2] + 0.05); g.add(tag);
    };
    const fill = (g: THREE.Group, amount: number, reserve = 0) => {
      if (a.load === 'empty') return;
      const cols = 4, rows = 2, layers = Math.max(1, Math.round(mix(1, 3.4, amount)));
      for (let c = reserve; c < cols; c++) for (let r = 0; r < rows; r++) {
        let y = bed + 0.03;
        const stack = Math.max(0, layers - (random() < 0.35 ? 1 : 0) + (random() < 0.2 ? 1 : 0));
        for (let l = 0; l < stack && y < roofY - 0.5; l++) {
          const x = -CL / 2 + 0.42 + c * 0.69 + (random() - 0.5) * 0.08, z = -0.36 + r * 0.72 + (random() - 0.5) * 0.08;
          if (a.load === 'mail') { sack(g, [x, y + 0.2, z], random() > 0.4 ? '#8f8f86' : '#4f6d8f'); y += 0.3; continue; }
          const h = a.load === 'cargo' ? 0.3 + random() * 0.25 : 0.22 + random() * 0.14;
          const size: [number, number, number] = a.load === 'cargo' ? [0.6, h, 0.6] : a.load === 'business' ? [0.6, 0.3, 0.4] : [0.5 + random() * 0.15, h, 0.4 + random() * 0.25];
          const hex = pick(a.load === 'holiday' ? HOLIDAY : a.load === 'business' ? BUSINESS : a.load === 'vintage' ? LEATHER : CARGO);
          if (a.load === 'vintage' && random() < 0.16) {
            const box = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 16), tone(pick(['#e9d9c0', '#c9506a', '#3c6b8a']))); box.position.set(x, y + 0.12, z); box.castShadow = true; g.add(box);
            const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.228, 0.05, 16), tone('#3a2416')); lid.position.set(x, y + 0.23, z); g.add(lid);
            y += 0.25; continue;
          }
          suitcase(g, size, [x, y + size[1] / 2, z], hex, (random() - 0.5) * 0.35 + (random() < 0.3 ? Math.PI / 2 : 0), a.load === 'cargo' ? 'box' : a.load === 'vintage' ? 'leather' : 'hard');
          y += size[1] + 0.005;
        }
        if (a.load === 'holiday' && random() < 0.12) { const para = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), tone(pick(['#f2b417', '#e2452f', '#2f8fd0']))); para.rotation.z = Math.PI / 2; para.position.set(0, y + 0.06, -0.36 + r * 0.72); para.castShadow = true; g.add(para); }
      }
      if (a.load === 'cargo') {
        const net = new THREE.Mesh(new THREE.BoxGeometry(CL - 0.3, 0.9, CW - 0.15, 6, 3, 3), new THREE.MeshBasicMaterial({ color: '#2f5f3a', wireframe: true }));
        net.position.set(0, bed + 0.48, 0); g.add(net);
      }
    };

    // ---- Carts.
    const amount = mix(0.25, 1, mood.density);
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const cx = x0 - tugL - GAP - CL / 2 - i * (CL + GAP);
      g.position.set(cx, 0, 0);
      g.rotation.y = (random() - 0.5) * 0.07 * (1 + mood.energy);
      s.root.add(g);
      const put = (m: THREE.Mesh, at: [number, number, number]) => { m.position.set(...at); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      put(new THREE.Mesh(new THREE.BoxGeometry(CL, 0.1, CW), cartPaint), [0, bed - 0.05, 0]);
      put(new THREE.Mesh(new THREE.BoxGeometry(CL - 0.4, 0.14, 0.7), dark), [0, bed - 0.18, 0]);
      for (const x of [-CL / 2 + 0.45, CL / 2 - 0.45]) for (const z of [-CW / 2 + 0.1, CW / 2 - 0.1]) {
        const t = put(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16), tyre), [x, 0.22, z]); t.rotation.x = Math.PI / 2;
        const h = put(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 10), hub), [x, 0.22, z]); h.rotation.x = Math.PI / 2;
      }
      // Drawbar forward to the next hitch.
      const bar = put(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, GAP + 0.5, 8), steel), [CL / 2 + GAP / 2 - 0.05, 0.36, 0]); bar.rotation.z = Math.PI / 2;
      put(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.16), dark), [-CL / 2 - 0.05, 0.36, 0]);
      const flat = a.curtains === 'flat';
      if (flat) {
        for (const z of [-CW / 2 + 0.03, CW / 2 - 0.03]) { put(new THREE.Mesh(new THREE.BoxGeometry(CL, 0.04, 0.04), cartPaint), [0, bed + 0.3, z]); for (const x of [-CL / 2 + 0.03, 0, CL / 2 - 0.03]) put(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), cartPaint), [x, bed + 0.15, z]); }
        for (const x of [-CL / 2 + 0.03, CL / 2 - 0.03]) put(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, CW), cartPaint), [x, bed + 0.25, 0]);
      } else {
        for (const x of [-CL / 2 + 0.04, CL / 2 - 0.04]) for (const z of [-CW / 2 + 0.04, CW / 2 - 0.04]) put(new THREE.Mesh(new THREE.BoxGeometry(0.06, roofY - bed, 0.06), cartPaint), [x, (roofY + bed) / 2, z]);
        put(new THREE.Mesh(rcache([CL + 0.1, 0.1, CW + 0.1], 0.04), cartPaint), [0, roofY + 0.03, 0]);
        put(new THREE.Mesh(new THREE.BoxGeometry(CL - 0.2, 0.06, CW * 0.55), cartPaint), [0, roofY + 0.1, 0]);
        // End panel behind the load, half height.
        put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, CW - 0.1), cartPaint), [-CL / 2 + 0.04, bed + 0.28, 0]);
        put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, CW - 0.1), cartPaint), [CL / 2 - 0.04, bed + 0.28, 0]);
        // Curtains: far side always down; near side per the answer.
        const drop = roofY - bed - 0.06;
        put(new THREE.Mesh(new THREE.PlaneGeometry(CL - 0.1, drop), canvasPaint), [0, bed + drop / 2, -CW / 2 + 0.03]);
        const near = a.curtains === 'closed' ? 1 : a.curtains === 'half' ? (random() < 0.5 ? 1 : 0.45 + random() * 0.2) : 0;
        if (near > 0) {
          const w = (CL - 0.1) * near;
          const c = put(new THREE.Mesh(new THREE.PlaneGeometry(w, drop, Math.max(2, Math.round(w * 6)), 1), canvasPaint), [-(CL - 0.1) / 2 + w / 2, bed + drop / 2, CW / 2 - 0.03]);
          const pos = c.geometry.attributes.position; for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getX(v) * 9) * 0.035); c.geometry.computeVertexNormals();
        } else { const roll = put(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, CL - 0.1, 10), canvasPaint), [0, roofY - 0.12, CW / 2 - 0.04]); roll.rotation.z = Math.PI / 2; }
        if (i === 0 && a.colour === 'cream') { /* lettering lives on the far curtain */ }
      }
      // Fleet number on the end.
      const last = i === n - 1;
      const special = last ? a.special : 'none';
      if (special === 'coffin') {
        const shape = new THREE.Shape([[-1.0, -0.2], [-0.45, -0.34], [1.0, -0.22], [1.0, 0.22], [-0.45, 0.34], [-1.0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)));
        const box = put(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), tone('#6a4428', 0.5)), [0, bed + 0.02, 0]);
        box.rotation.x = -Math.PI / 2;
        const lid = put(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1 }), tone('#7a5030', 0.4)), [0, bed + 0.46, 0]);
        lid.rotation.x = -Math.PI / 2;
        for (const x of [-0.5, 0.2, 0.75]) for (const z of [-1, 1]) put(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), tone('#c9a23a', 0.3)), [x, bed + 0.26, z * (0.3 - (x > 0 ? (x - 0.2) * 0.1 : 0) + 0.02)]);
        // A single wreath.
        if (mood.cheer < 0.75) { const w = put(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 16), tone('#f1efe6', 0.9)), [-0.35, bed + 0.56, 0]); w.rotation.x = Math.PI / 2; }
      } else {
        fill(g, amount * (0.7 + random() * 0.4), special === 'cello' || special === 'pet' || special === 'bicycle' ? 1 : 0);
        if (special === 'pet') {
          const base = bed + 0.03;
          put(new THREE.Mesh(rcache([0.6, 0.5, 0.5], 0.05), tone('#d8d2c2')), [-CL / 2 + 0.45, base + 0.25, 0.3]);
          put(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.52), tone('#7a8a96')), [-CL / 2 + 0.45, base + 0.26, 0.3]);
          const door = put(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.34, 5, 5), new THREE.MeshBasicMaterial({ color: '#30343a', wireframe: true })), [-CL / 2 + 0.45, base + 0.26, 0.556]); void door;
          put(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.34), tone('#1a1b1e')), [-CL / 2 + 0.45, base + 0.26, 0.552]);
          for (const dx of [-0.07, 0.07]) put(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: '#f6e7a0', emissive: '#f6d860', emissiveIntensity: 1.2 })), [-CL / 2 + 0.45 + dx, base + 0.3, 0.556]);
          put(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.05), dark), [-CL / 2 + 0.45, base + 0.53, 0.3]);
          put(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), tone('#e2452f')), [-CL / 2 + 0.45, base + 0.46, 0.558]);
        } else if (special === 'cello') {
          const outline = new THREE.Shape();
          outline.moveTo(0, 0); outline.bezierCurveTo(0.34, 0, 0.36, 0.45, 0.22, 0.58); outline.bezierCurveTo(0.2, 0.66, 0.3, 0.74, 0.27, 0.9);
          outline.bezierCurveTo(0.24, 1.05, 0.08, 1.05, 0.07, 1.12); outline.lineTo(0.07, 1.42); outline.lineTo(-0.07, 1.42); outline.lineTo(-0.07, 1.12);
          outline.bezierCurveTo(-0.08, 1.05, -0.24, 1.05, -0.27, 0.9); outline.bezierCurveTo(-0.3, 0.74, -0.2, 0.66, -0.22, 0.58); outline.bezierCurveTo(-0.36, 0.45, -0.34, 0, 0, 0);
          const c = put(new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), tone(mood.cheer > 0.5 ? '#b8242a' : '#1d1f24', 0.35)), [-CL / 2 + 0.5, bed + 0.06, 0.25]);
          c.rotation.set(-0.12, 0.25, 0.06);
          put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), tone('#f2b417')), [-CL / 2 + 0.5, bed + 0.75, 0.52]);
        } else if (special === 'surfboard') {
          const b = put(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshStandardMaterial({ color: '#cfd6da', metalness: 0.6, roughness: 0.35 })), [0, flat ? bed + 1.0 : roofY + 0.33, 0]);
          b.scale.set(1.25, 0.05, 0.3); b.rotation.y = 0.12;
        } else if (special === 'bicycle') {
          const b = put(new THREE.Mesh(rcache([0.25, 1.0, 1.4], 0.015), tone('#c6a472', 0.9)), [-CL / 2 + 0.35, bed + 0.53, 0]); b.rotation.z = -0.1;
          const lab = s.label('FRAGILE', 0.9, 0.22, [0, 0, 0], '#c62d2a', '#c6a472'); s.root.remove(lab); lab.position.set(-CL / 2 + 0.5, bed + 0.6, 0); lab.rotation.set(0, Math.PI / 2, -0.1); g.add(lab);
        }
      }
    }

    // ---- Tug.
    const tx = x0 - tugL / 2;
    const tugPaint = a.tug === 'electric' ? s.material('#f1f2ee', { roughness: 0.35 }) : a.tug === 'fifties' ? s.material(a.colour === 'red' ? '#2a5ea8' : '#c62d2a', { roughness: 0.5 }) : s.material('#eebb1a', { roughness: 0.55 });
    let seat: [number, number, number] = [tx - 0.5, 1.0, 0];
    let top = 1.6;
    if (a.tug === 'fifties') {
      s.box([tugL - 0.2, 0.2, 0.8], [tx, 0.55, 0], dark);
      rbox(s, [1.2, 0.62, 0.8], [tx + 0.55, 0.92, 0], tugPaint, 0.26);
      s.box([0.05, 0.45, 0.6], [tx + 1.17, 0.9, 0], steel);
      for (const z of [-0.3, 0.3]) s.ball([0.06, 0.09, 0.09], [tx + 1.19, 1.08, z], lamp, 10);
      for (const z of [-0.62, 0.62]) { wheel(s, 0.3, 0.2, [tx + 0.75, 0.3, z], tyre, hub); wheel(s, 0.45, 0.28, [tx - 0.65, 0.45, z], tyre, hub);
        const shell = tugPaint.clone(); shell.side = THREE.DoubleSide; const g = s.mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.34, 16, 1, true, -Math.PI / 2, Math.PI), shell, [tx - 0.65, 0.45, z]); g.rotation.x = -Math.PI / 2; }
      rbox(s, [0.5, 0.1, 0.8], [tx - 0.5, 0.86, 0], tone('#5a3a26'), 0.04); rbox(s, [0.08, 0.4, 0.8], [tx - 0.76, 1.08, 0], tone('#5a3a26'), 0.03);
      s.rod([tx + 0.1, 1.0, 0], [tx - 0.18, 1.32, 0], 0.018, steel); s.ring(0.17, 0.016, [tx - 0.2, 1.34, 0], dark).rotation.set(0, Math.PI / 2, 0.75);
      seat = [tx - 0.5, 0.96, 0]; top = 1.25;
    } else if (a.tug === 'seventies') {
      rbox(s, [tugL, 0.55, 1.35], [tx, 0.72, 0], tugPaint, 0.05);
      rbox(s, [1.1, 0.32, 1.2], [tx + 0.75, 1.12, 0], tugPaint, 0.05);
      for (let i = 0; i < 5; i++) s.box([0.04, 0.2, 0.9], [tx + 0.4 + i * 0.17, 1.2, 0], dark).rotation.z = 0.5;
      s.box([0.08, 0.3, 1.4], [tx + tugL / 2 + 0.02, 0.6, 0], dark);
      for (const z of [-0.45, 0.45]) s.box([0.04, 0.12, 0.2], [tx + tugL / 2 + 0.01, 0.9, z], lamp);
      for (const z of [-0.62, 0.62]) for (const x of [tx + 0.8, tx - 0.8]) wheel(s, 0.36, 0.24, [x, 0.36, z], tyre, hub);
      for (const [dx, dz] of [[0.15, -0.62], [0.15, 0.62], [-1.25, -0.62], [-1.25, 0.62]] as const) s.rod([tx + dx, 1.0, dz], [tx + dx + (dx > 0 ? -0.1 : 0), 2.05, dz], 0.025, dark);
      rbox(s, [1.6, 0.07, 1.45], [tx - 0.6, 2.08, 0], tone('#f1efe6'), 0.03);
      rbox(s, [0.5, 0.12, 0.9], [tx - 0.75, 1.06, 0], dark, 0.04); rbox(s, [0.1, 0.5, 0.9], [tx - 1.05, 1.3, 0], dark, 0.04);
      s.rod([tx + 0.15, 1.05, 0.2], [tx - 0.2, 1.42, 0.2], 0.018, steel); s.ring(0.17, 0.016, [tx - 0.22, 1.44, 0.2], dark).rotation.set(0, Math.PI / 2, 0.75);
      seat = [tx - 0.75, 1.14, 0.2]; top = 2.12;
    } else {
      rbox(s, [tugL, 0.6, 1.3], [tx, 0.68, 0], tugPaint, 0.16);
      s.box([tugL - 0.3, 0.1, 1.32], [tx, 0.62, 0], tone('#33b36b'));
      for (const z of [-0.6, 0.6]) for (const x of [tx + 0.75, tx - 0.75]) wheel(s, 0.3, 0.22, [x, 0.3, z], tyre, hub);
      const scr = s.box([0.03, 0.8, 1.15], [tx + 0.5, 1.4, 0], new THREE.MeshStandardMaterial({ color: '#2b3d4e', roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.5 })); scr.rotation.z = 0.25;
      for (const z of [-0.6, 0.6]) { s.rod([tx + 0.6, 0.98, z], [tx + 0.38, 1.85, z], 0.022, dark); s.rod([tx - 1.05, 0.98, z], [tx - 0.95, 1.85, z], 0.022, dark); }
      rbox(s, [1.55, 0.06, 1.36], [tx - 0.3, 1.88, 0], tugPaint, 0.03);
      rbox(s, [0.5, 0.1, 0.9], [tx - 0.55, 1.0, 0], dark, 0.04); rbox(s, [0.1, 0.5, 0.9], [tx - 0.85, 1.25, 0], dark, 0.04);
      for (const z of [-0.45, 0.45]) s.box([0.04, 0.06, 0.26], [tx + tugL / 2, 0.78, z], lamp);
      seat = [tx - 0.55, 1.08, 0]; top = 1.92;
    }
    s.box([0.16, 0.1, 0.16], [tx - tugL / 2 - 0.05, 0.36, 0], dark);
    const tick = beacon(s, [tx - (a.tug === 'fifties' ? -0.5 : 0.5), top - (a.tug === 'fifties' ? 0.02 : 0), a.tug === 'fifties' ? 0 : -0.4], '#ffa51a', a.driver, 1.2);
    if (a.driver) crew(s, seat, 0, vest, cloth, skin, true);

    // ---- What fell off.
    const fx = x0 - total - 0.2, fz = 0.3;
    const lost = new THREE.Group(); s.root.add(lost);
    const lostHex = a.load === 'vintage' ? '#9a6238' : a.load === 'business' ? '#2a2d33' : pick(HOLIDAY);
    const style = a.load === 'vintage' ? 'leather' as const : 'hard' as const;
    if (a.fallen === 'case') suitcase(lost, [0.65, 0.25, 0.45], [fx + 0.4, 0.125, fz + 1.3 + random() * 0.6], lostHex, random() * 3, style);
    else if (a.fallen === 'trail') for (let i = 0; i < 3 + Math.floor(random() * 2); i++) {
      if (a.load === 'mail') sack(lost, [fx + 0.9 - i * 1.0, 0.2, fz + (random() - 0.5) * 1.6], '#8f8f86');
      else suitcase(lost, [0.6, 0.25, 0.42], [fx + 0.9 - i * 1.0, 0.125, fz + (random() - 0.5) * 1.6], pick(a.load === 'business' ? BUSINESS : a.load === 'vintage' ? LEATHER : HOLIDAY), random() * 3, style);
    } else if (a.fallen === 'burst') {
      const cx = fx + 0.3, cz = fz + 1.2;
      suitcase(lost, [0.65, 0.12, 0.45], [cx, 0.06, cz], lostHex, 0.3, style);
      const lid = suitcase(lost, [0.65, 0.12, 0.45], [cx - 0.1, 0.25, cz - 0.42], lostHex, 0.3, style); lid.rotation.x = -1.1;
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), tone(pick(['#f1efe6', '#e86fa5', '#2f8fd0', '#f2b417', '#e2452f', '#8fc9a0']), 0.95)); c.scale.set(0.14 + random() * 0.12, 0.03, 0.1 + random() * 0.1); c.position.set(cx + (random() - 0.5) * 1.6, 0.03, cz + 0.2 + (random() - 0.3) * 1.3); c.rotation.y = random() * 3; lost.add(c); }
    } else if (a.fallen === 'teddy') {
      const fur = tone('#b98a52', 0.95); const bx = fx + 0.5, bz = fz + 1.2;
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), fur); body.scale.set(0.16, 0.09, 0.12); body.position.set(bx, 0.09, bz); body.castShadow = true; lost.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), fur); head.position.set(bx + 0.2, 0.08, bz); head.castShadow = true; lost.add(head);
      for (const z of [-0.07, 0.07]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), fur); ear.position.set(bx + 0.24, 0.13, bz + z); lost.add(ear); }
      for (const [dx, dz] of [[0.08, 0.16], [0.08, -0.16], [-0.16, 0.1], [-0.16, -0.1]]) { const limb = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), fur); limb.scale.set(0.08, 0.04, 0.05); limb.position.set(bx + dx, 0.04, bz + dz); limb.rotation.y = dz > 0 ? 0.6 : -0.6; lost.add(limb); }
    }
    lost.rotation.y = 0;

    const speed = mix(2.5, 9, mood.energy);
    return s.finish({ update: (_dt, time) => tick(time, speed) });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LEVELS = { p1: 'P1', p2: 'P2', p3: 'P3', b2: 'B2', g: 'G', roof: 'R', five: '5' } as const;
const ACCENTS = { green: '#3f9a6a', amber: '#e08a2a', blue: '#2f74c4', red: '#c8402c', purple: '#7a4fa8', yellow: '#e3c02e' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    doors: choice('What are the doors doing?', {
      shut: 'Shut tight, a seam of brushed steel.',
      ajar: 'Ajar by a hand\'s width, a blade of light spilling out across the floor.',
      open: 'Wide open on an empty, brightly lit car. Nobody steps out.',
      void: 'Open on darkness: no car, only cables in the shaft.',
      taped: 'Shut and crossed with barrier tape, out of service.',
    }),
    indicator: choice('What kind of floor indicator is above the doors?', {
      led: 'A red LED number with an arrow.',
      dial: 'An old brass half-dial with a pointer.',
      lamps: 'A row of round numbered lamps, one of them lit.',
    }),
    reading: choice('What does the indicator read?', {
      here: 'This floor: it has arrived.',
      coming: 'Another floor, with an arrow: it is on its way.',
      stuck: 'Stuck between floors, flickering.',
      top: 'The top floor, where it has been sitting all night.',
      dead: 'Nothing. The indicator is dark.',
    }),
    level: choice('What level does the big wall sign name?', { p1: 'P1, the first parking level.', p2: 'P2, a middle level.', p3: 'P3, high up and half empty.', b2: 'B2, a basement deep under the street.', g: 'G, ground level, nearly outside.', roof: 'R, the open roof.', five: 'A plain numeral 5, the fifth floor.' }),
    accent: choice('What colour is this level?', { green: 'Green.', amber: 'Amber orange.', blue: 'Blue.', red: 'Red.', purple: 'Purple.', yellow: 'Yellow.' }),
    wall: choice('What is the wall like?', {
      concrete: 'Bare board-marked concrete.',
      painted: 'Painted block, white above and the level colour below.',
      tile: 'Glazed white tile with dark grout, easy to hose down.',
      steel: 'Ribbed metal cladding.',
    }),
    called: noul('Has someone pressed the call button?'),
    beside: choice('What stands beside the doors?', {
      nothing: 'Nothing.',
      bin: 'A steel litter bin with an ashtray top.',
      cone: 'A yellow wet-floor sign.',
      stairs: 'A green running-man sign pointing to the stairs.',
      trolley: 'An abandoned shopping trolley.',
      puddle: 'A wide shallow puddle from a leak in the slab.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const accent = ACCENTS[a.accent];
    const level = LEVELS[a.level];
    const W = 3.3, H = 2.95, T = 0.24, front = T / 2;
    const ow = 1.14, oh = 2.12, ox = -0.35;
    const dark = s.material('#191b1d'), steel = s.material('#c1c7c9', { metalness: 0.75, roughness: 0.32 });

    // Wall surface.
    const wallMap = paint(512, 512, (ctx) => {
      if (a.wall === 'concrete') {
        ctx.fillStyle = '#b3b1a6'; ctx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 52) { ctx.fillStyle = `rgba(255,255,255,${random() * 0.07})`; ctx.fillRect(0, y, 512, 50); ctx.fillStyle = 'rgba(70,70,62,0.25)'; ctx.fillRect(0, y, 512, 2); }
        for (let x = 60; x < 512; x += 150) for (let y = 26; y < 512; y += 104) { ctx.fillStyle = 'rgba(60,60,54,0.5)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.wall === 'painted') {
        ctx.fillStyle = '#e6e4da'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = accent; ctx.fillRect(0, 322, 512, 190);
        ctx.fillStyle = '#2a2c2e'; ctx.fillRect(0, 316, 512, 8);
        ctx.strokeStyle = 'rgba(40,40,36,0.16)'; ctx.lineWidth = 2;
        for (let r = 0; r < 15; r++) { ctx.strokeRect(-2, r * 35, 516, 35); for (let c = 0; c < 8; c++) ctx.strokeRect(c * 70 + (r % 2 ? 35 : 0), r * 35, 0.5, 35); }
      } else if (a.wall === 'tile') {
        ctx.fillStyle = '#8f9390'; ctx.fillRect(0, 0, 512, 512);
        for (let r = 0; r < 20; r++) for (let c = 0; c < 20; c++) { ctx.fillStyle = r === 8 ? accent : random() < 0.04 + mood.wear * 0.1 ? '#cfcdc0' : '#eeeee8'; ctx.fillRect(c * 25.6 + 1.5, r * 25.6 + 1.5, 22.6, 22.6); }
      } else {
        ctx.fillStyle = '#9aa3a6'; ctx.fillRect(0, 0, 512, 512);
        for (let x = 0; x < 512; x += 16) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x, 0, 4, 512); ctx.fillStyle = 'rgba(30,34,36,0.3)'; ctx.fillRect(x + 9, 0, 4, 512); }
        ctx.fillStyle = accent; ctx.fillRect(0, 300, 512, 26);
      }
      // Damp, soot and trolley scuffs.
      for (let i = 0; i < 4 + mood.wear * 14; i++) { const x = random() * 512, w = 6 + random() * 26, g = ctx.createLinearGradient(0, 0, 0, 120 + random() * 330); g.addColorStop(0, `rgba(58,50,38,${0.1 + mood.wear * 0.35})`); g.addColorStop(1, 'rgba(58,50,38,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, w, 512); }
      ctx.fillStyle = `rgba(30,30,28,${0.15 + mood.wear * 0.3})`;
      for (let i = 0; i < 20 + mood.wear * 40; i++) ctx.fillRect(random() * 512, 400 + random() * 90, 10 + random() * 50, 2 + random() * 3);
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 });
    const side = s.material('#a5a399', { roughness: 0.95 });
    const piece = (x0: number, x1: number, y0: number, y1: number) => {
      const geometry = new THREE.BoxGeometry(x1 - x0, y1 - y0, T);
      const uv = geometry.attributes.uv, p = geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + (x0 + x1) / 2 + W / 2) / W, (p.getY(i) + (y0 + y1) / 2) / H);
      const mesh = new THREE.Mesh(geometry, [side, side, side, side, wallMat, side]);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    piece(-W / 2, ox - ow / 2, 0, H); piece(ox + ow / 2, W / 2, 0, H); piece(ox - ow / 2, ox + ow / 2, oh, H);
    // Kerb and yellow edge.
    s.box([W, 0.1, 0.06], [0, 0.05, front + 0.03], s.material('#2a2c2e'));
    // The lift core behind: enough shaft to hold a car.
    const cw = 1.7, cd = 1.55, cz = -T / 2 - cd / 2;
    s.box([0.14, H, cd], [ox - cw / 2 - 0.07, H / 2, cz], side); s.box([0.14, H, cd], [ox + cw / 2 + 0.07, H / 2, cz], side);
    s.box([cw + 0.28, H, 0.14], [ox, H / 2, -T / 2 - cd - 0.07], side); s.box([cw + 0.28, 0.14, cd + 0.14], [ox, H - 0.07, cz - 0.07], side);
    s.box([cw + 0.5, 0.5, 0.9], [ox, H + 0.25, cz - 0.2], side);
    for (let i = 0; i < 5; i++) s.box([0.5, 0.012, 0.02], [ox + 0.3, H + 0.1 + i * 0.07, cz + 0.255], dark);

    // Frame and doors.
    const frame = s.material('#9aa1a4', { metalness: 0.7, roughness: 0.4 });
    for (const x of [-1, 1]) s.box([0.09, oh + 0.09, T + 0.05], [ox + x * (ow / 2 + 0.045), (oh + 0.09) / 2, 0.005], frame);
    s.box([ow + 0.18, 0.1, T + 0.05], [ox, oh + 0.05, 0.005], frame);
    s.box([ow, 0.02, T + 0.06], [ox, 0.01, 0.01], steel);
    const gap = { shut: 0, taped: 0, ajar: mix(0.07, 0.14, random()), open: 0.98, void: mix(0.6, 0.98, random()) }[a.doors];
    const brushed = paint(64, 256, (ctx) => {
      ctx.fillStyle = '#b9bfc1'; ctx.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '60,66,70'},${0.04 + random() * 0.06})`; ctx.fillRect(random() * 64, 0, 1, 256); }
      ctx.fillStyle = `rgba(40,40,36,${0.2 + mood.wear * 0.4})`; for (let i = 0; i < 6 + mood.wear * 30; i++) ctx.fillRect(random() * 64, 150 + random() * 100, 2 + random() * 14, 1 + random() * 2);
      if (mood.wear > 0.55) { ctx.strokeStyle = 'rgba(20,20,24,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); let x = 8, y = 120; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 6; y += (k % 2 ? -1 : 1) * (10 + random() * 22); ctx.lineTo(x, y); } ctx.stroke(); }
    });
    const doorMat = new THREE.MeshStandardMaterial({ map: brushed, metalness: 0.7, roughness: 0.38 });
    const leaves: THREE.Mesh[] = [];
    for (const x of [-1, 1]) {
      const slide = gap * (ow / 2 - 0.02);
      const leaf = s.box([ow / 2, oh, 0.035], [ox + x * (ow / 4 + slide), oh / 2, -0.03], doorMat);
      leaves.push(leaf);
      s.box([0.012, oh, 0.04], [ox + x * (0.006 + slide), oh / 2, -0.028], dark);
    }

    // What is behind the doors.
    const lit = a.doors === 'open' || a.doors === 'ajar';
    const cabinLight = new THREE.Color().setHSL(mix(0.3, 0.11, mood.warmth), 0.55, 0.82);
    let pool: THREE.MeshStandardMaterial | null = null, ceiling: THREE.MeshStandardMaterial | null = null;
    const iw = 1.5, id = 1.3, ih = 2.25, iz = -T / 2 - 0.06 - id / 2;
    if (a.doors === 'void') {
      const black = new THREE.MeshStandardMaterial({ color: '#0b0c0d', roughness: 1, side: THREE.BackSide });
      s.box([cw, H - 0.3, cd - 0.02], [ox, (H - 0.3) / 2, cz], black);
      for (const x of [-0.25, -0.1, 0.12, 0.3]) s.rod([ox + x, 0, cz + 0.1], [ox + x + (random() - 0.5) * 0.04, oh + 0.3, cz + 0.1], 0.012, s.material('#4a4d50', { metalness: 0.6 }));
      s.box([0.1, 0.1, 0.06], [ox + 0.55, 1.5, cz - 0.4], new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff3a2a', emissiveIntensity: 1.6 }));
    } else {
      const panelTint = ['#b08a5a', '#8e9a9c', '#c9c2ae', '#6f7f8a'][Math.floor(random() * 4)];
      const inner = new THREE.MeshStandardMaterial({ color: panelTint, roughness: 0.6, side: THREE.BackSide, emissive: cabinLight, emissiveIntensity: lit ? 0.22 : 0 });
      s.box([iw, ih, id], [ox, ih / 2 + 0.01, iz], inner);
      ceiling = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: cabinLight, emissiveIntensity: lit ? mix(1.3, 2.2, mood.cheer) : 0.1 });
      s.box([iw * 0.7, 0.03, id * 0.6], [ox, ih - 0.02, iz], ceiling);
      const floorMap = paint(64, 64, (ctx) => { ctx.fillStyle = '#3a3d40'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#55595c'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.beginPath(); ctx.arc(4 + x * 8, 4 + y * 8, 2.4, 0, Math.PI * 2); ctx.fill(); } });
      s.box([iw - 0.02, 0.02, id - 0.02], [ox, 0.02, iz], new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.7, emissive: cabinLight, emissiveIntensity: lit ? 0.12 : 0, emissiveMap: floorMap }));
      // Handrail, mirror, button column.
      s.rod([ox - iw / 2 + 0.1, 0.95, iz - id / 2 + 0.07], [ox + iw / 2 - 0.1, 0.95, iz - id / 2 + 0.07], 0.02, steel);
      s.box([iw * 0.7, 0.9, 0.01], [ox, 1.6, iz - id / 2 + 0.012], new THREE.MeshStandardMaterial({ color: '#dfe8ea', metalness: 0.9, roughness: 0.08, emissive: cabinLight, emissiveIntensity: lit ? 0.35 : 0 }));
      s.box([0.012, 0.6, 0.16], [ox + iw / 2 - 0.012, 1.2, iz + 0.25], steel);
      for (let i = 0; i < 6; i++) s.box([0.014, 0.03, 0.03], [ox + iw / 2 - 0.02, 1.0 + i * 0.07, iz + 0.25], new THREE.MeshStandardMaterial({ color: '#fff3c0', emissive: '#ffd060', emissiveIntensity: lit && i === 2 ? 2 : 0.1 }));
      if (a.doors === 'open' && mood.density > 0.35) {
        // Something left behind in the car.
        const leftover = Math.floor(random() * 3);
        if (leftover === 0) { s.box([0.3, 0.36, 0.2], [ox - 0.35, 0.21, iz - 0.2], s.material('#b98a5a')); s.box([0.31, 0.02, 0.05], [ox - 0.35, 0.39, iz - 0.2], s.material('#d8cf9c')); }
        else if (leftover === 1) { s.cylinder(0.012, 0.012, 0.9, [ox + 0.4, 0.5, iz - 0.45], dark, 8).rotation.z = 0.25; s.ball([0.12, 0.05, 0.12], [ox + 0.3, 0.06, iz - 0.45], s.material('#2f74c4'), 12); }
        else { const g = s.ball([0.14, 0.17, 0.14], [ox - 0.3, 1.75, iz - 0.3], s.material(['#d8362a', '#e98ab0', '#e8c21f'][Math.floor(random() * 3)], { roughness: 0.25 }), 16); s.rod([ox - 0.3, 0.05, iz - 0.3], [g.position.x, 1.58, iz - 0.3], 0.004, s.material('#f2f2ea')); }
      }
    }
    if (lit) {
      // Light thrown across the floor through whatever gap there is.
      const near = Math.max(0.05, gap * ow) / 2, reach = a.doors === 'open' ? 1.5 : 1.9, far = near + reach * (a.doors === 'open' ? 0.35 : 0.22);
      const shape = new THREE.Shape(); shape.moveTo(-near, 0); shape.lineTo(near, 0); shape.lineTo(far, reach); shape.lineTo(-far, reach);
      pool = new THREE.MeshStandardMaterial({ color: cabinLight, emissive: cabinLight, emissiveIntensity: 1.1, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const spill = s.mesh(new THREE.ShapeGeometry(shape), pool, [ox, 0.006, front + 0.02]);
      spill.rotation.x = Math.PI / 2; spill.castShadow = false;
      if (a.doors === 'ajar') s.box([gap * ow, oh - 0.04, 0.01], [ox, oh / 2, -0.06], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: cabinLight, emissiveIntensity: 2.4 }));
    }
    if (a.doors === 'taped') {
      const tapeMap = paint(256, 16, (ctx) => { ctx.fillStyle = '#e8c21f'; ctx.fillRect(0, 0, 256, 16); ctx.fillStyle = '#151515'; for (let i = -1; i < 17; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 16); ctx.lineTo(i * 16 + 8, 16); ctx.lineTo(i * 16 + 16, 0); ctx.lineTo(i * 16 + 8, 0); ctx.fill(); } });
      const tapeMat = new THREE.MeshStandardMaterial({ map: tapeMap, roughness: 0.5, side: THREE.DoubleSide });
      const diag = Math.hypot(ow + 0.2, oh * 0.7);
      for (const dir of [-1, 1]) { const t = s.mesh(new THREE.PlaneGeometry(diag, 0.075), tapeMat, [ox, oh * 0.5, front + 0.04 + dir * 0.003]); t.rotation.z = dir * Math.atan2(oh * 0.7, ow + 0.2) + (random() - 0.5) * 0.1; }
      s.label('OUT OF SERVICE', 0.62, 0.2, [ox, oh * 0.5 + (random() - 0.5) * 0.2, front + 0.05], '#151515', '#f4f1e2').rotation.z = (random() - 0.5) * 0.2;
    }

    // Indicator above the doors.
    const dead = a.reading === 'dead';
    const others = ['P1', 'P2', 'P3', 'P4', 'G', 'B1', 'B2', '5', '7'].filter((f) => f !== level);
    const shown = a.reading === 'here' ? level : a.reading === 'top' ? 'R' : a.reading === 'stuck' ? '--' : others[Math.floor(random() * others.length)];
    const iy = oh + 0.32;
    let indicator: THREE.MeshStandardMaterial | null = null, pointer: THREE.Object3D | null = null;
    if (a.indicator === 'led') {
      const map = paint(192, 80, (ctx) => {
        ctx.fillStyle = '#120807'; ctx.fillRect(0, 0, 192, 80);
        if (!dead) { ctx.fillStyle = '#ff4a30'; ctx.font = 'bold 62px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(shown, a.reading === 'coming' ? 78 : 96, 43, 120);
          if (a.reading === 'coming') { const up = random() < 0.5; ctx.beginPath(); ctx.moveTo(150, up ? 62 : 18); ctx.lineTo(174, up ? 62 : 18); ctx.lineTo(162, up ? 18 : 62); ctx.fill(); } }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < 80; y += 4) ctx.fillRect(0, y, 192, 1); for (let x = 0; x < 192; x += 4) ctx.fillRect(x, 0, 1, 80);
      });
      indicator = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: dead ? 0 : 1.5, roughness: 0.3 });
      s.box([0.5, 0.24, 0.05], [ox, iy, front + 0.02], dark);
      s.mesh(new THREE.PlaneGeometry(0.44, 0.18), indicator, [ox, iy, front + 0.047]);
    } else if (a.indicator === 'dial') {
      const floors = ['B2', 'B1', 'G', 'P1', 'P2', 'P3', 'R'];
      const map = paint(256, 140, (ctx) => {
        ctx.fillStyle = '#b9944a'; ctx.beginPath(); ctx.arc(128, 132, 124, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#efe6cc'; ctx.beginPath(); ctx.arc(128, 132, 110, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#2a2420'; ctx.font = 'bold 22px serif'; ctx.textAlign = 'center';
        floors.forEach((f, i) => { const t = Math.PI - (i + 0.5) / floors.length * Math.PI; ctx.fillText(f, 128 + Math.cos(t) * 86, 136 - Math.sin(t) * 86); });
      });
      const face = s.mesh(new THREE.PlaneGeometry(0.62, 0.34), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.5, metalness: 0.2 }), [ox, iy + 0.05, front + 0.03]);
      face.castShadow = false;
      s.box([0.66, 0.04, 0.05], [ox, iy - 0.13, front + 0.02], s.material('#8a6a2e', { metalness: 0.6 }));
      const index = a.reading === 'stuck' ? floors.indexOf(level) + 0.5 : a.reading === 'top' ? 6 : a.reading === 'dead' ? 0 : Math.max(0, floors.indexOf(shown === level ? level : shown));
      const hand = new THREE.Group();
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.008), dark); needle.position.y = 0.12; hand.add(needle);
      hand.position.set(ox, iy - 0.105, front + 0.04);
      hand.rotation.z = Math.PI / 2 - (index + 0.5) / floors.length * Math.PI;
      s.root.add(hand); pointer = hand;
      s.cylinder(0.022, 0.022, 0.02, [ox, iy - 0.105, front + 0.045], s.material('#8a6a2e', { metalness: 0.7 }), 12).rotation.x = Math.PI / 2;
    } else {
      const floors = ['B1', 'G', 'P1', 'P2', 'P3'];
      const litAt = dead ? -1 : a.reading === 'stuck' ? -2 : a.reading === 'top' ? 4 : a.reading === 'here' ? Math.max(0, floors.indexOf(level)) : Math.floor(random() * 5);
      s.box([0.8, 0.17, 0.04], [ox, iy, front + 0.02], steel);
      floors.forEach((f, i) => {
        const on = i === litAt || (litAt === -2 && (i === 2 || i === 3));
        const map = paint(48, 48, (ctx) => { ctx.fillStyle = on ? '#ffd76a' : '#4a4436'; ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = on ? '#3a2a08' : '#9a927c'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f, 24, 26); });
        const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: on ? 1.5 : 0.05, transparent: true, alphaTest: 0.5 });
        if (on) indicator = m;
        s.mesh(new THREE.CircleGeometry(0.058, 20), m, [ox + (i - 2) * 0.15, iy, front + 0.042]).castShadow = false;
      });
    }

    // Call plate, level sign.
    const bx = ox + ow / 2 + 0.3;
    s.box([0.13, 0.3, 0.015], [bx, 1.12, front + 0.008], steel);
    const ring = new THREE.MeshStandardMaterial({ color: a.called ? '#ffb23a' : '#5a564c', emissive: '#ff9a1a', emissiveIntensity: a.called ? 2.2 : 0.02 });
    for (const y of [1.17, 1.07]) { const r = s.cylinder(0.03, 0.03, 0.012, [bx, y, front + 0.02], y > 1.1 && a.level !== 'roof' ? ring : (a.level === 'roof' ? ring : steel), 16); r.rotation.x = Math.PI / 2; s.cylinder(0.02, 0.02, 0.016, [bx, y, front + 0.022], dark, 12).rotation.x = Math.PI / 2; }
    const signMap = paint(256, 256, (ctx) => {
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = a.accent === 'yellow' ? '#1a1a1a' : '#f6f4ec'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${level.length > 1 ? 150 : 190}px sans-serif`; ctx.fillText(level, 128, 122, 230);
      ctx.font = 'bold 30px sans-serif'; ctx.fillText(a.level === 'roof' ? 'ROOF' : a.level === 'g' ? 'GROUND' : 'LEVEL', 128, 226);
      ctx.fillStyle = '#b3b1a6'; for (let i = 0; i < mood.wear * 200; i++) ctx.fillRect(random() * 256, random() * 256, 1 + random() * 7, 1 + random() * 7);
    });
    s.mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.8 }), [bx + 0.52, 1.85, front + 0.004]).castShadow = false;
    const liftSign = paint(128, 48, (ctx) => { ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, 128, 48); ctx.fillStyle = '#1c1e20'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LIFT', 64, 35); });
    s.mesh(new THREE.PlaneGeometry(0.32, 0.12), new THREE.MeshStandardMaterial({ map: liftSign, roughness: 0.6 }), [ox - ow / 2 - 0.38, 1.9, front + 0.004]).castShadow = false;

    // Beside the doors.
    const px = bx + 0.55, pz = front + 0.42;
    if (a.beside === 'bin') {
      s.cylinder(0.2, 0.18, 0.72, [px, 0.36, pz], steel, 20); s.cylinder(0.21, 0.21, 0.05, [px, 0.745, pz], dark, 20);
      s.cylinder(0.14, 0.14, 0.01, [px, 0.775, pz], s.material('#d8d2c0', { roughness: 1 }), 16);
      for (let i = 0; i < 4 + mood.density * 6; i++) s.cylinder(0.006, 0.006, 0.05, [px + (random() - 0.5) * 0.2, 0.785, pz + (random() - 0.5) * 0.2], s.material('#e8dcc0'), 5).rotation.set(Math.PI / 2, 0, random() * 3);
    } else if (a.beside === 'cone') {
      const yellow = new THREE.MeshStandardMaterial({ color: '#f0cc1f', roughness: 0.5, side: THREE.DoubleSide });
      for (const d of [-1, 1]) { const b = s.box([0.3, 0.62, 0.012], [px, 0.3, pz + d * 0.1], yellow); b.rotation.x = d * -0.33; }
      const tri = paint(64, 96, (ctx) => { ctx.fillStyle = '#f0cc1f'; ctx.fillRect(0, 0, 64, 96); ctx.strokeStyle = '#151515'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(32, 14); ctx.lineTo(56, 54); ctx.lineTo(8, 54); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#151515'; ctx.fillRect(30, 28, 4, 14); ctx.fillRect(30, 45, 4, 4); ctx.fillRect(10, 68, 44, 6); ctx.fillRect(16, 80, 32, 5); });
      const f = s.mesh(new THREE.PlaneGeometry(0.26, 0.4), new THREE.MeshStandardMaterial({ map: tri, roughness: 0.5 }), [px, 0.34, pz + 0.118]); f.rotation.x = -0.33;
    } else if (a.beside === 'stairs') {
      const map = paint(192, 96, (ctx) => { ctx.fillStyle = '#12a05a'; ctx.fillRect(0, 0, 192, 96); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(52, 22, 9, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, 36); ctx.lineTo(42, 58); ctx.lineTo(26, 78); ctx.moveTo(42, 58); ctx.lineTo(60, 68); ctx.lineTo(62, 86); ctx.moveTo(50, 40); ctx.lineTo(70, 46); ctx.moveTo(48, 40); ctx.lineTo(30, 44); ctx.stroke(); ctx.beginPath(); ctx.moveTo(100, 38); ctx.lineTo(140, 38); ctx.lineTo(140, 20); ctx.lineTo(176, 48); ctx.lineTo(140, 76); ctx.lineTo(140, 58); ctx.lineTo(100, 58); ctx.fill(); });
      const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: mix(0.6, 1.2, mood.cheer) });
      s.box([0.62, 0.32, 0.07], [px - 0.03, 2.5, front + 0.04], dark);
      s.mesh(new THREE.PlaneGeometry(0.58, 0.28), m, [px - 0.03, 2.5, front + 0.077]);
    } else if (a.beside === 'trolley') {
      const wire = s.material('#c9cfd1', { metalness: 0.8, roughness: 0.3 });
      const g = new THREE.Group();
      const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); return m; };
      for (let i = 0; i < 6; i++) { const y = 0.5 + i * 0.07; const r = add(new THREE.Mesh(new THREE.BoxGeometry(0.5 + i * 0.012, 0.008, 0.8 + i * 0.02), wire)); r.position.y = y; (r.material as THREE.MeshStandardMaterial).wireframe = false; r.scale.set(1, 1, 1); }
      const basket = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8, 5, 4, 8), new THREE.MeshStandardMaterial({ color: '#c9cfd1', wireframe: true, metalness: 0.7, roughness: 0.3 }))); basket.position.y = 0.68;
      for (const x of [-1, 1]) for (const z of [-1, 1]) { const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), wire)); leg.position.set(x * 0.22, 0.27, z * 0.33); const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), dark)); wheel.rotation.z = Math.PI / 2; wheel.position.set(x * 0.22, 0.05, z * 0.33); }
      const handle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 8), s.material(accent))); handle.rotation.z = Math.PI / 2; handle.position.set(0, 0.95, -0.46);
      g.position.set(px - 0.1, 0, pz + 0.25); g.rotation.y = mix(-1.2, 1.2, random());
      s.root.add(g);
    } else if (a.beside === 'puddle') {
      const water = new THREE.MeshStandardMaterial({ color: '#5d6a6e', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.8, depthWrite: false });
      for (let i = 0; i < 3; i++) { const m = s.mesh(new THREE.CircleGeometry(mix(0.25, 0.55, random()), 22), water, [px - 0.3 + (random() - 0.5) * 0.7, 0.004 + i * 0.001, pz + 0.2 + random() * 0.4]); m.rotation.x = -Math.PI / 2; m.scale.y = mix(0.5, 0.9, random()); m.castShadow = false; }
      s.rod([px - 0.2, H - 0.02, front + 0.02], [px - 0.2, H - 0.3, front + 0.02], 0.01, s.material('#6a5a40', { roughness: 1 }), 0.002);
    }
    // Conduit and a caged bulkhead light over the lobby.
    s.rod([-W / 2 + 0.2, H - 0.25, front + 0.02], [W / 2 - 0.1, H - 0.25, front + 0.02], 0.016, frame);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color().setHSL(mix(0.3, 0.1, mood.warmth), 0.7, 0.7), emissiveIntensity: mix(0.5, 1.4, mood.cheer) });
    s.box([0.34, 0.1, 0.1], [-W / 2 + 0.55, H - 0.25, front + 0.06], lampMat);
    s.box([0.38, 0.03, 0.12], [-W / 2 + 0.55, H - 0.18, front + 0.06], dark);

    const flicker = a.reading === 'stuck' && indicator;
    const shiver = a.reading === 'stuck' && pointer;
    const restAngle = pointer ? (pointer as THREE.Object3D).rotation.z : 0;
    const poolBase = pool ? (pool as THREE.MeshStandardMaterial).opacity : 0;
    return s.finish({
      footprint: 1.6,
      update: (_dt, time) => {
        const rate = mix(1, 10, mood.energy);
        if (flicker) (indicator as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * rate * 2.3) * Math.sin(time * rate * 0.7) > 0 ? 1.5 : 0.2;
        if (shiver) (pointer as THREE.Object3D).rotation.z = restAngle + Math.sin(time * rate * 3) * 0.04;
        if (a.called) ring.emissiveIntensity = 1.8 + Math.sin(time * rate) * 0.5;
        if (pool && mood.wear > 0.6) { const on = Math.sin(time * rate * 1.7) * Math.sin(time * rate * 0.31) > -0.5 ? 1 : 0.35; (pool as THREE.MeshStandardMaterial).opacity = poolBase * on; if (ceiling) ceiling.emissiveIntensity = 1.6 * on; }
        void leaves;
      },
    });
  },
});

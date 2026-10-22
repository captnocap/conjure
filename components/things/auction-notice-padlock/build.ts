import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const HEAD = {
  lien: ['NOTICE OF', 'LIEN SALE'], auction: ['PUBLIC', 'AUCTION'], pastdue: ['PAST DUE', 'SEE OFFICE'], final: ['FINAL', 'NOTICE'], sold: ['SOLD', 'LOT 14'], vacate: ['VACATE', 'BY FRIDAY'],
} as const;

export default defineThing({
  questions: {
    notice: choice('What does the taped notice say?', {
      lien: 'NOTICE OF LIEN SALE: the legal one, small print underneath.',
      auction: 'PUBLIC AUCTION with a date and a time.',
      pastdue: 'PAST DUE, SEE OFFICE: still a chance.',
      final: 'FINAL NOTICE in red.',
      sold: 'SOLD, with a lot number: it is over.',
      vacate: 'VACATE BY FRIDAY, written by hand.',
      none: 'No notice now, only four corners of old tape.',
    }),
    paper: choice('What state is the paper in?', {
      crisp: 'Put up this morning, flat and white.',
      curled: 'Rain-wrinkled and sun-yellowed, one corner peeling.',
      torn: 'Ripped across, half of it gone.',
      layered: 'A third notice taped over two older ones.',
    }),
    lock: choice('What is the tenant\'s own lock?', {
      disc: 'A round stainless disc lock.',
      brass: 'A cheap brass padlock with a long shackle.',
      dial: 'A black combination dial lock from a school locker.',
      puck: 'A heavy hidden-shackle puck lock, serious.',
      missing: 'Gone: the hasp hole is empty.',
    }),
    overlock: choice('What has the office added?', {
      red: 'A bright red overlock.',
      yellow: 'A yellow overlock with a number on it.',
      seal: 'A numbered plastic security seal looped through.',
      none: 'Nothing.',
    }),
    ground: choice('What lies on the ground below?', {
      cut: 'A padlock with its shackle bolt-cut, and the cut-off piece.',
      cutters: 'A pair of long bolt cutters, dropped.',
      keys: 'A ring of keys somebody could not use.',
      drill: 'Curls of drilled-out metal and a lock cylinder.',
      nothing: 'Bare concrete.',
    }),
    door: choice('What colour is the door it is on?', {
      orange: 'Safety orange.', blue: 'Royal blue.', green: 'Forest green.', cream: 'Chalky cream.', red: 'Faded barn red.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const PW = 0.58, PH = 0.62, Y0 = 0.03;
    const doorTint = new THREE.Color({ orange: '#e2702a', blue: '#2f5fa8', green: '#3d6b4a', cream: '#e3dcc6', red: '#a8463c' }[a.door]).lerp(new THREE.Color('#b9a999'), mood.wear * 0.3);
    const steel = s.material('#cdd2d4', { metalness: 0.85, roughness: 0.25 });
    const zinc = s.material('#a9b0ae', { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#1b1c1f', { roughness: 0.6 });

    // ---- A swatch of ribbed door and its jamb, standing on a strip of slab.
    const ribs = Math.round(PH / 0.075) * 4;
    const sheet = new THREE.PlaneGeometry(PW, PH, 1, ribs);
    const p = sheet.attributes.position;
    for (let i = 0; i < p.count; i++) { const ph = ((p.getY(i) + PH / 2) / 0.075) % 1; p.setZ(i, ph > 0.25 && ph < 0.75 ? 0.014 : 0); }
    sheet.computeVertexNormals();
    const skin = paint(256, 256, (ctx) => {
      ctx.fillStyle = `#${doorTint.getHexString()}`; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < mood.wear * 30; i++) {
        const x = random() * 256, y = random() * 200, len = 20 + random() * 120;
        const g = ctx.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, 'rgba(96,52,24,0.5)'); g.addColorStop(1, 'rgba(96,52,24,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y, 2 + random() * 6, len);
      }
    });
    s.mesh(sheet, new THREE.MeshStandardMaterial({ map: skin, roughness: mix(0.45, 0.85, mood.wear), metalness: 0.2 }), [-0.05, Y0 + PH / 2, 0]);
    s.box([PW, PH, 0.02], [-0.05, Y0 + PH / 2, -0.012], s.material(doorTint.clone().multiplyScalar(0.8)));
    const JX = PW / 2 - 0.05 + 0.05;
    s.box([0.1, PH + 0.02, 0.07], [JX, Y0 + PH / 2, 0.005], zinc);
    s.box([0.8, 0.06, 0.52], [0, 0, 0.14], s.material('#9a988f', { roughness: 0.95 }));

    // ---- Slide latch: back plate, bolt with a hasp eye, keeper on the jamb.
    const LY = Y0 + 0.4, LZ = 0.022;
    s.box([0.3, 0.1, 0.008], [0.12, LY, LZ], zinc);
    for (const x of [0.02, 0.2]) s.box([0.03, 0.12, 0.022], [x, LY, LZ + 0.012], zinc);
    s.box([0.34, 0.035, 0.012], [0.19, LY, LZ + 0.016], steel);
    s.box([0.012, 0.07, 0.03], [0.07, LY - 0.02, LZ + 0.03], steel);
    s.box([0.06, 0.14, 0.016], [JX, LY, 0.05], zinc);
    for (const y of [-0.05, 0.05]) for (const x of [-0.01, 0.25]) s.cylinder(0.007, 0.007, 0.006, [x, LY + y * 0.7, LZ + 0.008], steel, 8).rotation.x = Math.PI / 2;
    // Two eyes the locks hang from.
    const eyes: [number, number][] = [[0.11, LY - 0.045], [0.165, LY - 0.045]];
    for (const [x, y] of eyes) s.box([0.03, 0.05, 0.008], [x, y + 0.01, LZ + 0.026], steel);

    const shackle = (x: number, y: number, r: number, mat: THREE.Material, thick = 0.005) => { const g = s.ring(r, thick, [x, y, LZ + 0.036], mat, Math.PI); return g; };
    const lz = LZ + 0.036;
    if (a.lock === 'disc') {
      const [x, y] = eyes[0];
      s.cylinder(0.035, 0.035, 0.022, [x, y - 0.03, lz], steel, 28).rotation.x = Math.PI / 2;
      s.cylinder(0.03, 0.03, 0.026, [x, y - 0.03, lz], s.material('#b9bfc1', { metalness: 0.9, roughness: 0.4 }), 24).rotation.x = Math.PI / 2;
      shackle(x, y - 0.012, 0.02, steel);
      s.cylinder(0.008, 0.008, 0.028, [x, y - 0.042, lz], dark, 10).rotation.x = Math.PI / 2;
    } else if (a.lock === 'brass') {
      const [x, y] = eyes[0];
      const brass = s.material('#c2a14d', { metalness: 0.75, roughness: 0.35 });
      s.box([0.045, 0.04, 0.018], [x, y - 0.075, lz], brass);
      for (const dx of [-0.014, 0.014]) s.rod([x + dx, y - 0.055, lz], [x + dx, y - 0.005, lz], 0.004, steel);
      shackle(x, y - 0.005, 0.014, steel, 0.004);
      s.cylinder(0.005, 0.005, 0.02, [x, y - 0.082, lz], dark, 8).rotation.x = Math.PI / 2;
    } else if (a.lock === 'dial') {
      const [x, y] = eyes[0];
      s.cylinder(0.027, 0.027, 0.02, [x, y - 0.055, lz], steel, 24).rotation.x = Math.PI / 2;
      s.cylinder(0.021, 0.022, 0.03, [x, y - 0.055, lz + 0.004], dark, 24).rotation.x = Math.PI / 2;
      s.cylinder(0.009, 0.01, 0.04, [x, y - 0.055, lz + 0.004], steel, 12).rotation.x = Math.PI / 2;
      for (const dx of [-0.014, 0.014]) s.rod([x + dx, y - 0.04, lz], [x + dx, y - 0.005, lz], 0.004, steel);
      shackle(x, y - 0.005, 0.014, steel, 0.004);
    } else if (a.lock === 'puck') {
      s.cylinder(0.04, 0.04, 0.035, [eyes[0][0], eyes[0][1], lz + 0.004], s.material('#8f9597', { metalness: 0.8, roughness: 0.5 }), 28).rotation.x = Math.PI / 2;
      s.cylinder(0.009, 0.009, 0.04, [eyes[0][0] + 0.015, eyes[0][1] - 0.015, lz + 0.004], dark, 10).rotation.x = Math.PI / 2;
    }
    if (a.overlock === 'red' || a.overlock === 'yellow') {
      const tint = a.overlock === 'red' ? '#d4241f' : '#eebc1e';
      const [x, y] = eyes[1];
      const m = s.material(tint, { roughness: 0.35, emissive: tint, emissiveIntensity: 0.22 });
      s.cylinder(0.037, 0.037, 0.024, [x + 0.012, y - 0.034, lz + 0.006], m, 28).rotation.x = Math.PI / 2;
      shackle(x + 0.012, y - 0.014, 0.02, steel);
      s.cylinder(0.011, 0.011, 0.03, [x + 0.012, y - 0.044, lz + 0.006], steel, 12).rotation.x = Math.PI / 2;
      if (a.overlock === 'yellow') s.label(String(100 + Math.floor(random() * 899)), 0.04, 0.016, [x + 0.012, y - 0.02, lz + 0.0185], '#1b1b1b', tint);
    } else if (a.overlock === 'seal') {
      const [x, y] = eyes[1];
      const m = s.material('#2f78d0', { roughness: 0.5, emissive: '#2f78d0', emissiveIntensity: 0.15 });
      s.tube([[x - 0.01, y - 0.03, lz], [x - 0.016, y + 0.005, lz], [x, y + 0.022, lz + 0.004], [x + 0.016, y + 0.005, lz], [x + 0.008, y - 0.03, lz]], 0.0025, m);
      s.box([0.03, 0.055, 0.006], [x, y - 0.055, lz], m);
      s.label(String(100000 + Math.floor(random() * 899999)), 0.05, 0.014, [x, y - 0.055, lz + 0.0035], '#ffffff', '#2f78d0').rotation.z = Math.PI / 2;
    }

    // ---- The notice.
    const NX = -0.2, NY = Y0 + 0.37, NW = 0.216, NH = 0.279;
    const tapeMat = s.material('#d9cf9a', { roughness: 0.3, transparent: true, opacity: 0.85 });
    const sheetOf = (kind: Exclude<typeof a.notice, 'none'>, aged: number) => paint(432, 558, (ctx) => {
      const paper = new THREE.Color('#f7f5ee').lerp(new THREE.Color('#d9c890'), aged);
      ctx.fillStyle = `#${paper.getHexString()}`; ctx.fillRect(0, 0, 432, 558);
      const red = kind === 'final' || kind === 'lien' || kind === 'sold';
      const hand = kind === 'vacate';
      ctx.fillStyle = red ? '#c22a22' : '#1b1b1b';
      if (!hand) ctx.fillRect(24, 24, 384, 14);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = hand ? 'italic bold 78px serif' : 'bold 72px sans-serif';
      HEAD[kind].forEach((line, i) => ctx.fillText(line, 216, 100 + i * 82, 380));
      if (!hand) ctx.fillRect(24, 222, 384, 8);
      ctx.fillStyle = '#2a2a2a';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(`UNIT ${'ABCDEFG'[Math.floor(random() * 7)]}${10 + Math.floor(random() * 89)}`, 216, 268);
      if (kind === 'auction' || kind === 'lien') ctx.fillText('SAT 10:00 AM · CASH ONLY', 216, 308, 380);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(40,40,40,0.55)'; ctx.fillRect(40, 346 + i * 18, 352 * (i === 8 ? 0.5 : 0.85 + random() * 0.15), 7); }
      ctx.strokeStyle = '#2a2a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(240, 530);
      for (let i = 0; i < 8; i++) ctx.lineTo(250 + i * 18, 530 - (i % 2 ? 16 : -4) * random()); ctx.stroke();
      if (aged > 0.2) for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(120,96,50,${0.08 + aged * 0.15})`; ctx.beginPath(); ctx.ellipse(random() * 432, random() * 558, 20 + random() * 50, 10 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    });
    const tapeCorners = (x: number, y: number, tilt: number, which: number[] = [0, 1, 2, 3], z = 0.017) => {
      const corners = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
      for (const k of which) { const [cx, cy] = corners[k]; const t = s.box([0.06, 0.022, 0.0015], [x + cx * (NW / 2 - 0.012), y + cy * (NH / 2 - 0.008), z], tapeMat); t.rotation.z = tilt + cx * cy * -0.7; t.castShadow = false; }
    };
    const post = (kind: Exclude<typeof a.notice, 'none'>, x: number, y: number, tilt: number, aged: number, z: number, state: 'flat' | 'curled' | 'torn') => {
      const nv = 10, nu = 6;
      const g = new THREE.PlaneGeometry(NW, state === 'torn' ? NH * 0.56 : NH, nu, nv);
      const q = g.attributes.position;
      const h = state === 'torn' ? NH * 0.56 : NH;
      for (let i = 0; i < q.count; i++) {
        const u = q.getX(i) / NW + 0.5, v = q.getY(i) / h + 0.5;
        let dz = 0;
        if (state === 'curled') { const c = Math.max(0, u - 0.45) * Math.max(0, 0.55 - v) * 4; dz = c * c * 0.045 + Math.sin(u * 9) * Math.sin(v * 7) * 0.003; }
        if (state === 'torn' && v < 0.02) q.setY(i, q.getY(i) + (random() - 0.3) * 0.03);
        q.setZ(i, dz);
      }
      if (state === 'torn') { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.44 + uv.getY(i) * 0.56); }
      g.computeVertexNormals();
      const m = s.mesh(g, new THREE.MeshStandardMaterial({ map: sheetOf(kind, aged), roughness: 0.9, side: THREE.DoubleSide }), [x, y + (state === 'torn' ? NH * 0.22 : 0), z]);
      m.rotation.z = tilt;
      tapeCorners(x, y, tilt, state === 'torn' ? [0, 1] : state === 'curled' ? [0, 1, 2] : [0, 1, 2, 3], z + 0.002);
    };
    const tilt = (random() - 0.5) * 0.14;
    if (a.notice === 'none') tapeCorners(NX, NY, tilt);
    else if (a.paper === 'layered') {
      post('pastdue', NX - 0.03, NY + 0.02, tilt - 0.12, 0.8, 0.016, 'flat');
      post('final', NX + 0.02, NY - 0.015, tilt + 0.1, 0.4, 0.019, 'flat');
      post(a.notice, NX, NY, tilt, mood.wear * 0.2, 0.022, 'flat');
    } else post(a.notice, NX, NY, tilt, a.paper === 'crisp' ? mood.wear * 0.15 : 0.5 + mood.wear * 0.4, 0.017, a.paper === 'crisp' ? 'flat' : a.paper === 'curled' ? 'curled' : 'torn');
    if (a.paper === 'torn' && a.notice !== 'none') {
      const scrap = s.box([0.12, 0.001, 0.08], [NX + 0.05 + random() * 0.1, 0.032, 0.2 + random() * 0.1], s.material('#efe9d6', { roughness: 0.9 }));
      scrap.rotation.y = random() * 3;
    }

    // ---- The ground.
    const gy = 0.03, gx = 0.05 + (random() - 0.5) * 0.2, gz = 0.24 + random() * 0.08;
    if (a.ground === 'cut') {
      s.cylinder(0.035, 0.035, 0.022, [gx, gy + 0.011, gz], steel, 28);
      s.cylinder(0.008, 0.008, 0.024, [gx + 0.012, gy + 0.011, gz + 0.01], dark, 10);
      const stub = s.ring(0.02, 0.005, [gx - 0.02, gy + 0.005, gz - 0.03], steel, Math.PI * 0.45); stub.rotation.x = Math.PI / 2;
      const piece = s.ring(0.02, 0.005, [gx + 0.11, gy + 0.005, gz + 0.05], steel, Math.PI * 0.5); piece.rotation.set(Math.PI / 2, 0, random() * 3);
      const bright = s.material('#f4f6f6', { metalness: 1, roughness: 0.1, emissive: '#aab2b4', emissiveIntensity: 0.4 });
      s.ball([0.0055, 0.0055, 0.0055], [gx + 0.11 + 0.02, gy + 0.005, gz + 0.05], bright, 8);
      for (let i = 0; i < 6; i++) s.box([0.006, 0.001, 0.002], [gx + (random() - 0.5) * 0.2, gy + 0.001, gz + (random() - 0.5) * 0.12], bright).rotation.y = random() * 3;
    } else if (a.ground === 'cutters') {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { s.root.remove(m); g.add(m); };
      const grip = s.material('#c22a22', { roughness: 0.7 });
      for (const side of [-1, 1]) {
        add(s.rod([side * 0.012, 0, 0.06], [side * 0.05, 0, 0.5], 0.009, dark));
        add(s.rod([side * 0.038, 0, 0.36], [side * 0.05, 0, 0.5], 0.013, grip));
        add(s.box([0.022, 0.014, 0.085], [side * 0.012, 0, 0.015], zinc));
        add(s.box([0.012, 0.012, 0.05], [side * 0.008, 0, -0.05], steel));
      }
      add(s.cylinder(0.012, 0.012, 0.02, [0, 0, 0.055], steel, 10));
      g.position.set(gx - 0.2, gy + 0.013, gz - 0.12); g.rotation.y = 1.0 + random() * 0.6;
      s.root.add(g);
    } else if (a.ground === 'keys') {
      const brass = s.material('#c2a14d', { metalness: 0.8, roughness: 0.3 });
      const ring = s.ring(0.022, 0.0025, [gx, gy + 0.003, gz], steel); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const t = random() * 6.28, l = 0.045 + random() * 0.015;
        const key = s.box([0.008, 0.002, l], [gx + Math.cos(t) * (0.022 + l / 2), gy + 0.002 + i * 0.0015, gz + Math.sin(t) * (0.022 + l / 2)], i % 2 ? brass : steel);
        key.rotation.y = -t + Math.PI / 2;
        s.cylinder(0.011, 0.011, 0.002, [gx + Math.cos(t) * 0.03, gy + 0.002 + i * 0.0015, gz + Math.sin(t) * 0.03], i % 2 ? brass : steel, 10);
      }
      s.box([0.03, 0.004, 0.05], [gx + 0.06, gy + 0.002, gz + 0.05], s.material(mood.cheer > 0.5 ? '#3f9a7c' : '#30343a')).rotation.y = random() * 3;
    } else if (a.ground === 'drill') {
      const bright = s.material('#e6eaea', { metalness: 1, roughness: 0.15, emissive: '#8a9294', emissiveIntensity: 0.3 });
      for (let i = 0; i < 12; i++) { const c = s.ring(0.004 + random() * 0.005, 0.0012, [gx + (random() - 0.5) * 0.16, gy + 0.004, gz + (random() - 0.5) * 0.1], bright, Math.PI * (1 + random())); c.rotation.set(random() * 3, random() * 3, 0); }
      const cyl = s.cylinder(0.009, 0.009, 0.03, [gx + 0.08, gy + 0.009, gz + 0.02], s.material('#c2a14d', { metalness: 0.8 }), 12); cyl.rotation.set(Math.PI / 2, 0, random() * 3);
    }
    // Grit, and a weed where the slab meets the door on a tired row.
    for (let i = 0; i < 4 + mood.wear * 14; i++) s.box([0.006, 0.003, 0.006], [(random() - 0.5) * 0.7, gy + 0.0015, 0.03 + random() * 0.33], s.material('#6f6a5e')).rotation.y = random() * 3;
    if (mood.wear > 0.55) for (let i = 0; i < 5; i++) { const x = -0.34 + random() * 0.2; s.rod([x, gy, 0.02], [x + (random() - 0.5) * 0.06, gy + 0.04 + random() * 0.07, 0.03], 0.003, s.material('#6f8046'), 0.001); }

    return s.finish();
  },
});

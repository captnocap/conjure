import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const HANDLES = {
  bone: 'Yellowed bone, hairline-cracked with age.',
  tortoise: 'Mottled amber-and-brown tortoiseshell.',
  ebony: 'Plain black ebony with silver pins.',
  pearl: 'Pale shimmering mother-of-pearl, a wedding present.',
  horn: 'Streaked grey-green buffalo horn.',
  celluloid: 'Bright red celluloid, a cheap barber-supply razor.',
} as const;
const NAMES = { pop: 'POP', ed: 'ED', seven: 'No. 7', doc: 'DOC', sal: 'SAL', mayor: 'MAYOR' } as const;

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
    handle: choice('What are the razor’s handle scales made of?', HANDLES),
    blade: choice('How is the razor lying?', {
      folded: 'Folded shut in its handle, put away.',
      angled: 'Half open at a right angle, as it is held to shave.',
      open: 'Fully open and laid out straight, edge bare.',
      onMug: 'Open and balanced across the rim of the mug, mid-shave.',
    }),
    mug: choice('What style is the lather mug?', {
      plain: 'A plain thick white china mug.',
      guard: 'A moustache-guard cup with a ledge across half the mouth and a gilt rim.',
      personal: 'A regular’s personalised mug, his name lettered in gold between painted flowers.',
      enamel: 'A chipped speckled blue enamel tin mug.',
      scuttle: 'A stoneware shaving scuttle with a spout for hot water.',
    }),
    name: choice('If the mug is personalised, whose is it?', NAMES),
    lather: choice('What state is the lather in?', {
      dry: 'Dry: no lather, a hard puck of soap in the bottom and a clean dry brush.',
      whipped: 'Freshly whipped into stiff white peaks, brush loaded.',
      stubble: 'Used: slumping foam flecked with dark stubble, a smear on the towel.',
    }),
    towel: choice('What towel is it laid on?', {
      white: 'A plain white terry towel.',
      stripe: 'White with a blue barber stripe down each edge.',
      red: 'A faded red shop towel.',
      newspaper: 'No towel: a sheet of yesterday’s newspaper.',
    }),
    extra: choice('What else lies beside the razor?', {
      alum: 'A block of alum and a styptic pencil.',
      bayrum: 'A bottle of bay rum aftershave.',
      nick: 'A scrap of tissue with a single dot of blood.',
      talc: 'A tin of talcum powder, a little spilled.',
      nothing: 'Nothing else.',
    }),
    stropHung: noul('Is the strop hanging from its hook (rather than rolled up on the towel)?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const steel = s.material('#b4bec8', { metalness: 0.7, roughness: mix(0.12, 0.45, wear) });
    const brass = s.material('#c9a24a', { metalness: 0.8, roughness: 0.3 });
    const wood = s.material('#6d4526', { roughness: 0.6 });
    const cream = s.material('#f5f1e6', { roughness: 0.35 });
    const foam = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });

    // --- Towel (or newspaper).
    const TW = 0.34, TD = 0.25;
    let top = 0.014;
    if (a.towel === 'newspaper') {
      top = 0.003;
      const sheet = s.box([TW, 0.002, TD], [0, 0.001, 0], new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(512, 332, (ctx) => {
        ctx.fillStyle = '#e4dcc4'; ctx.fillRect(0, 0, 512, 332);
        ctx.fillStyle = '#2b2a27'; ctx.font = 'bold 34px serif'; ctx.fillText('THE DAILY LEDGER', 70, 44);
        ctx.fillRect(16, 54, 480, 3);
        for (let col = 0; col < 4; col++) for (let row = 0; row < 26; row++) ctx.fillRect(18 + col * 122, 70 + row * 10, 60 + ((row * 37 + col * 53) % 50), 3);
        ctx.fillStyle = '#8a8779'; ctx.fillRect(140, 120, 106, 80);
      }) }));
      sheet.rotation.y = (random() - 0.5) * 0.1;
    } else {
      const base = { white: '#f3f0e7', stripe: '#f3f0e7', red: '#b5483f' }[a.towel];
      const cloth = new THREE.MeshStandardMaterial({ roughness: 1, map: paint(256, 256, (ctx) => {
        ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let y = 0; y < 256; y += 4) for (let x = (y % 8) / 2; x < 256; x += 4) ctx.fillRect(x, y, 2, 2);
        if (a.towel === 'stripe') { ctx.fillStyle = '#2f5aa6'; ctx.fillRect(0, 18, 256, 12); ctx.fillRect(0, 226, 256, 12); ctx.fillRect(0, 36, 256, 3); ctx.fillRect(0, 217, 256, 3); }
        if (a.towel === 'red') { ctx.fillStyle = '#f0e6d6'; ctx.fillRect(0, 22, 256, 6); ctx.fillRect(0, 228, 256, 6); }
      }) });
      const lower = s.mesh(new THREE.BoxGeometry(TW, 0.007, TD, 24, 1, 16), cloth, [0, 0.0035, 0]);
      const upper = s.mesh(new THREE.BoxGeometry(TW * 0.97, 0.007, TD * 0.96, 24, 1, 16), cloth, [0.004, 0.0105, -0.003]);
      for (const mesh of [lower, upper]) {
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 40 + p.getZ(i) * 23) * 0.0012);
        mesh.geometry.computeVertexNormals();
      }
      upper.rotation.y = (random() - 0.5) * 0.06;
    }

    // --- Mug, back left.
    const mugX = -0.1, mugZ = -0.045, mugR = 0.046, mugH = a.mug === 'scuttle' ? 0.075 : 0.088;
    const mugTint = { plain: '#f5f1e6', guard: '#f7f3ea', personal: '#f6f1e4', enamel: '#3565a8', scuttle: '#b9a27c' }[a.mug];
    const china = s.material(mugTint, { roughness: a.mug === 'scuttle' ? 0.6 : 0.25, side: THREE.DoubleSide });
    const belly = a.mug === 'scuttle' ? 1.2 : a.mug === 'guard' ? 1.08 : 1;
    s.lathe([[0, 0.004], [mugR * 0.82, 0.004], [mugR * 0.86, 0], [mugR * belly, mugH * 0.35], [mugR * (a.mug === 'scuttle' ? 0.8 : 1), mugH], [mugR * (a.mug === 'scuttle' ? 0.8 : 1) - 0.004, mugH], [mugR * belly - 0.005, mugH * 0.35], [mugR * 0.78, 0.008], [0, 0.008]], china, [mugX, top, mugZ]);
    // Handle on the left.
    const grip = s.ring(0.026, 0.006, [mugX - mugR * belly - 0.012, top + mugH * 0.5, mugZ], china, Math.PI * 1.15);
    grip.rotation.z = Math.PI * 0.43;
    const rimR = mugR * (a.mug === 'scuttle' ? 0.8 : 1);
    if (a.mug === 'guard' || a.mug === 'personal') s.ring(rimR - 0.001, 0.0022, [mugX, top + mugH, mugZ], brass).rotation.x = Math.PI / 2;
    if (a.mug === 'guard') {
      const ledge = s.mesh(new THREE.CylinderGeometry(rimR - 0.003, rimR - 0.003, 0.004, 24, 1, false, Math.PI * 0.5, Math.PI), china, [mugX, top + mugH - 0.004, mugZ]);
      ledge.castShadow = true;
    }
    if (a.mug === 'enamel') {
      s.ring(rimR - 0.001, 0.0028, [mugX, top + mugH, mugZ], s.material('#151a2a')).rotation.x = Math.PI / 2;
      const flecks = Array.from({ length: 40 }, () => { const ang = random() * Math.PI * 2, y = random() * mugH * 0.9 + 0.005; return { at: [mugX + Math.cos(ang) * (mugR + 0.0005), top + y, mugZ + Math.sin(ang) * (mugR + 0.0005)] as [number, number, number], size: mix(0.0015, 0.004, random()), color: random() < 0.2 + wear * 0.4 ? '#1b1b1f' : '#f2f2f2' }; });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.4 }), flecks);
    }
    if (a.mug === 'scuttle') {
      const spout = s.cylinder(0.02, 0.012, 0.04, [mugX + mugR * 1.1, top + mugH * 0.55, mugZ], china, 14);
      spout.rotation.z = -0.9;
      for (const y of [0.3, 0.42]) s.ring(mugR * 1.19, 0.0015, [mugX, top + mugH * y, mugZ], s.material('#3e5a7a')).rotation.x = Math.PI / 2;
    }
    if (a.mug === 'personal') {
      const band = paint(512, 256, (ctx) => {
        ctx.clearRect(0, 0, 512, 256);
        ctx.fillStyle = '#b8902c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'italic bold 110px serif'; ctx.fillText(NAMES[a.name], 256, 120, 300);
        ctx.strokeStyle = '#b8902c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(130, 190); ctx.quadraticCurveTo(256, 215, 382, 190); ctx.stroke();
        for (const x of [60, 452]) {
          ctx.fillStyle = '#c2384a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.257) * 20, 120 + Math.sin(i * 1.257) * 20, 14, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#e6c545'; ctx.beginPath(); ctx.arc(x, 120, 9, 0, 7); ctx.fill();
          ctx.fillStyle = '#3f7d4a'; ctx.beginPath(); ctx.ellipse(x, 175, 9, 22, 0.5, 0, 7); ctx.fill();
        }
      });
      const wrap = s.mesh(new THREE.CylinderGeometry(mugR + 0.0008, mugR + 0.0008, mugH * 0.72, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84), new THREE.MeshStandardMaterial({ map: band, transparent: true, roughness: 0.3, depthWrite: false }), [mugX, top + mugH * 0.56, mugZ]);
      wrap.castShadow = false;
    }

    // Lather in the mug.
    const lip = top + mugH;
    if (a.lather === 'dry') {
      s.cylinder(rimR * 0.72, rimR * 0.76, 0.014, [mugX, top + 0.016, mugZ], s.material('#e9dfc0', { roughness: 0.7 }), 20);
    } else {
      const slump = a.lather === 'stubble' ? 0.55 : 1;
      s.cylinder(rimR - 0.005, rimR - 0.007, 0.01, [mugX, lip - 0.008, mugZ], foam, 20);
      const blobs = a.lather === 'stubble' ? 6 : 11;
      for (let i = 0; i < blobs; i++) {
        const ang = random() * Math.PI * 2, r = random() * rimR * 0.6, size = mix(0.014, 0.026, random());
        s.ball([size, size * mix(0.7, 1.5, random()) * slump, size], [mugX + Math.cos(ang) * r, lip + size * 0.3 * slump, mugZ + Math.sin(ang) * r], foam, 12);
      }
      if (a.lather === 'whipped') s.mesh(new THREE.ConeGeometry(0.014, 0.04, 12), foam, [mugX + 0.006, lip + 0.04, mugZ - 0.004]).rotation.z = -0.25;
      else {
        // A dribble over the rim and a smear on the towel.
        s.rod([mugX + rimR * 0.8, lip, mugZ + rimR * 0.5], [mugX + rimR * 0.95, lip - 0.045, mugZ + rimR * 0.6], 0.008, foam, 0.004);
        const smear = s.ball([0.045, 0.004, 0.022], [0.0, top + 0.002, 0.03], foam, 12);
        smear.rotation.y = 0.5;
        const specks = Array.from({ length: 70 }, (_unused, index) => {
          if (index < 40) { const ang = random() * Math.PI * 2, r = random() * rimR * 0.75; return { at: [mugX + Math.cos(ang) * r, lip + 0.008 + random() * 0.012, mugZ + Math.sin(ang) * r] as [number, number, number], size: mix(0.0008, 0.0018, random()) }; }
          return { at: [(random() - 0.5) * 0.07, top + 0.005, 0.03 + (random() - 0.5) * 0.035] as [number, number, number], size: mix(0.0008, 0.0018, random()) };
        });
        s.scatter(new THREE.BoxGeometry(1, 1, 3), s.material('#2a2422'), specks);
      }
    }

    // --- Badger brush, standing beside the mug (or lying when used).
    const brush = new Sculpture(context);
    s.root.add(brush.root);
    const handleTint = a.handle === 'ebony' ? '#1c1a1a' : a.handle === 'celluloid' ? '#c2262e' : '#e9dfc4';
    brush.lathe([[0, 0], [0.019, 0], [0.021, 0.004], [0.017, 0.014], [0.012, 0.024], [0.016, 0.036], [0.018, 0.044], [0.016, 0.05], [0, 0.05]], s.material(handleTint, { roughness: 0.3 }));
    brush.ring(0.0165, 0.0022, [0, 0.049, 0], brass).rotation.x = Math.PI / 2;
    brush.lathe([[0.014, 0.05], [0.017, 0.066], [0.022, 0.08], [0.0225, 0.081], [0, 0.081]], s.material('#b89c72', { roughness: 0.9 }));
    brush.lathe([[0.022, 0.08], [0.0265, 0.094], [0.027, 0.095], [0, 0.095]], s.material('#2e2823', { roughness: 0.95 }));
    brush.lathe([[0.0265, 0.094], [0.029, 0.104], [0.026, 0.111], [0.014, 0.116], [0, 0.117]], a.lather === 'dry' ? s.material('#ece6d6', { roughness: 0.95 }) : foam);
    if (a.lather !== 'dry') for (let i = 0; i < 5; i++) { const ang = random() * 6.3; brush.ball([0.012, 0.011, 0.012], [Math.cos(ang) * 0.016, 0.106 + random() * 0.012, Math.sin(ang) * 0.016], foam, 10); }
    if (a.lather === 'stubble') {
      brush.root.rotation.set(0, mix(-0.4, 0.4, random()), Math.PI / 2 - 0.12);
      brush.root.position.set(0.035, top + 0.021, -0.085);
    } else brush.root.position.set(-0.012, top, -0.07 + random() * 0.02);

    // --- The razor.
    const scaleTex = paint(256, 64, (ctx) => {
      const base = { bone: '#e6d9b4', tortoise: '#b3742a', ebony: '#17161a', pearl: '#eef0f2', horn: '#5d6152', celluloid: '#c8232d' }[a.handle];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 64);
      if (a.handle === 'tortoise') for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 3 ? 'rgba(52,24,8,0.75)' : 'rgba(230,170,60,0.7)'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 64, 8 + random() * 16, 5 + random() * 9, random() * 3, 0, 7); ctx.fill(); }
      if (a.handle === 'pearl') for (let i = 0; i < 30; i++) { ctx.fillStyle = ['rgba(180,220,235,0.6)', 'rgba(240,200,225,0.6)', 'rgba(215,235,200,0.6)'][i % 3]; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 64, 20, 5, random(), 0, 7); ctx.fill(); }
      if (a.handle === 'horn') for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? 'rgba(200,200,170,0.5)' : 'rgba(20,24,18,0.6)'; ctx.fillRect(0, random() * 64, 256, 2 + random() * 6); }
      if (a.handle === 'bone') { ctx.strokeStyle = 'rgba(90,70,40,0.5)'; for (let i = 0; i < 4 + wear * 8; i++) { ctx.beginPath(); const x = random() * 256; ctx.moveTo(x, random() * 64); ctx.lineTo(x + 30 + random() * 40, random() * 64); ctx.stroke(); } }
    });
    const scales = new THREE.MeshStandardMaterial({ map: scaleTex, roughness: a.handle === 'pearl' ? 0.15 : 0.35, emissive: a.handle === 'pearl' ? '#30383c' : '#000', emissiveIntensity: 0.4 });
    const razor = new Sculpture(context);
    s.root.add(razor.root);
    const L = 0.15;
    // Handle: two curved scales seen from above, pivot at the origin, running to +x.
    const outline = new THREE.Shape();
    outline.moveTo(-0.008, -0.007);
    outline.quadraticCurveTo(L * 0.5, -0.012, L - 0.006, -0.004);
    outline.quadraticCurveTo(L + 0.004, 0.003, L - 0.006, 0.009);
    outline.quadraticCurveTo(L * 0.5, 0.004, -0.008, 0.008);
    outline.quadraticCurveTo(-0.014, 0, -0.008, -0.007);
    for (const y of [0.0005, 0.0075]) {
      const slab = razor.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0008, bevelThickness: 0.0008, bevelSegments: 2, UVGenerator: undefined }), scales, [0, y + 0.003, 0]);
      slab.rotation.x = Math.PI / 2;
      const uv = slab.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.014) / (L + 0.02), (uv.getY(i) + 0.012) / 0.024);
    }
    for (const x of [0, L - 0.012]) razor.cylinder(0.0022, 0.0022, 0.0125, [x, 0.0058, x ? 0.002 : 0], brass, 8);
    // Blade: tang, tail and a hollow-ground blade, pivoting about the pin.
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.012, 0.006);        // tail curls back past the pivot
    bladeShape.quadraticCurveTo(0.03, 0.012, 0.034, 0.002);
    bladeShape.quadraticCurveTo(0.03, 0.006, 0.012, -0.001);
    bladeShape.lineTo(-0.03, -0.004);       // tang
    bladeShape.lineTo(-0.036, -0.012);      // heel drops to the edge
    bladeShape.lineTo(-0.108, -0.013);      // cutting edge
    bladeShape.quadraticCurveTo(-0.116, -0.004, -0.11, 0.005); // rounded point
    bladeShape.lineTo(-0.03, 0.005);        // spine
    bladeShape.lineTo(0.012, 0.006);
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.0022, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 1 }), steel);
    blade.rotation.x = Math.PI / 2;
    blade.position.y = 0.0068;
    blade.castShadow = true;
    const pivot = new THREE.Group();
    pivot.add(blade);
    razor.root.add(pivot);
    // Folded: blade lies inside the handle (pointing +x). The shape points -x, so 180° is shut.
    const openAngle = { folded: Math.PI, angled: Math.PI * 0.52, open: mix(-0.08, 0.08, random()), onMug: Math.PI * 0.42 }[a.blade];
    pivot.rotation.y = openAngle;
    if (wear > 0.6) { const rust = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), s.material('#8a4a22', { roughness: 1 })); rust.rotation.x = -Math.PI / 2; rust.position.set(-0.07, 0.0071, 0.004); pivot.add(rust); }
    if (a.blade === 'onMug') {
      razor.root.position.set(mugX + 0.012, lip + 0.006, mugZ + rimR * 0.5);
      razor.root.rotation.set(0.0, 0.25, -0.5);
      razor.root.position.x += 0.05; razor.root.position.y -= 0.03;
    } else {
      razor.root.position.set(a.blade === 'folded' ? -0.08 : -0.03, top + 0.001, 0.08);
      razor.root.rotation.y = mix(-0.25, 0.2, random());
    }

    razor.root.scale.setScalar(1.25);

    // --- The strop.
    const leather = s.material('#7b4524', { roughness: 0.55, side: THREE.DoubleSide });
    const canvasSide = s.material('#c9b98c', { roughness: 0.9 });
    if (a.stropHung) {
      const px = 0.115, pz = -TD / 2 - 0.012, ph = 0.42;
      s.box([0.09, ph, 0.016], [px, ph / 2, pz], wood);
      s.box([0.16, 0.014, 0.07], [px, 0.007, pz + 0.012], wood);
      s.cylinder(0.006, 0.006, 0.03, [px, ph - 0.05, pz + 0.02], brass, 8).rotation.x = Math.PI / 2;
      s.ring(0.012, 0.003, [px, ph - 0.062, pz + 0.034], brass, Math.PI).rotation.set(0, Math.PI / 2, Math.PI);
      s.ring(0.012, 0.0028, [px, ph - 0.08, pz + 0.036], steel).rotation.y = Math.PI / 2;
      const strapTop = ph - 0.092, strapLen = 0.29, sway = (random() - 0.5) * 0.05;
      s.box([0.05, 0.03, 0.008], [px, strapTop - 0.012, pz + 0.036], steel);
      const strap = s.box([0.05, strapLen, 0.004], [px + sway * 0.5, strapTop - 0.025 - strapLen / 2, pz + 0.038], leather);
      strap.rotation.z = sway * 0.5;
      const under = s.box([0.05, strapLen * 0.97, 0.003], [px + sway * 0.5, strapTop - 0.025 - strapLen / 2, pz + 0.033], canvasSide);
      under.rotation.z = sway * 0.5;
      // Handle grip at the bottom.
      s.ring(0.022, 0.006, [px + sway, strapTop - 0.045 - strapLen, pz + 0.038], leather);
      s.box([0.05, 0.02, 0.008], [px + sway, strapTop - 0.022 - strapLen, pz + 0.038], steel);
      s.label('SHELL', 0.036, 0.012, [px + sway * 0.2, strapTop - 0.08, pz + 0.0405], '#3a2010', '#7b4524');
    } else {
      // Rolled up on the towel, right side.
      const coil: [number, number, number][] = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40, ang = t * Math.PI * 5, r = mix(0.012, 0.036, t); coil.push([0.115 + Math.cos(ang) * r, top + 0.026, -0.06 + Math.sin(ang) * r]); }
      const curve = new THREE.CatmullRomCurve3(coil.map((p) => new THREE.Vector3(...p)));
      const pts = curve.getPoints(120);
      const verts: number[] = [], idx: number[] = [];
      pts.forEach((p, i) => { verts.push(p.x, top, p.z, p.x, top + 0.05, p.z); if (i < pts.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geometry.setIndex(idx); geometry.computeVertexNormals();
      s.mesh(geometry, leather);
      s.ring(0.012, 0.003, [0.115 + 0.045, top + 0.004, -0.06], steel).rotation.x = Math.PI / 2;
    }

    // --- Extras, front right.
    const ex = 0.1, ez = 0.05;
    if (a.extra === 'alum') {
      const alum = new THREE.MeshPhysicalMaterial({ color: '#eef4f6', roughness: 0.25, transparent: true, opacity: 0.8 });
      s.box([0.055, 0.02, 0.035], [ex, top + 0.01, ez], alum).rotation.y = 0.3;
      s.rod([ex - 0.03, top + 0.006, ez + 0.045], [ex + 0.035, top + 0.006, ez + 0.055], 0.005, cream);
      s.rod([ex + 0.012, top + 0.006, ez + 0.0515], [ex + 0.035, top + 0.006, ez + 0.055], 0.0056, s.material('#2d4f8c'));
    } else if (a.extra === 'bayrum') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#b9722a', roughness: 0.1, transparent: true, opacity: 0.85 });
      s.lathe([[0, 0], [0.022, 0], [0.024, 0.01], [0.024, 0.07], [0.01, 0.09], [0.009, 0.11], [0, 0.11]], glass, [ex + 0.01, top, ez - 0.02]);
      s.cylinder(0.011, 0.011, 0.016, [ex + 0.01, top + 0.116, ez - 0.02], s.material('#1d1d1f'), 12);
      const lab = s.label('BAY RUM', 0.04, 0.03, [ex + 0.01, top + 0.042, ez + 0.0045], '#2d4a2a', '#eadfb8');
      lab.castShadow = false;
    } else if (a.extra === 'nick') {
      const tissue = s.mesh(new THREE.CircleGeometry(0.02, 7), new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 1, side: THREE.DoubleSide }), [ex, top + 0.002, ez]);
      tissue.rotation.set(-Math.PI / 2 + 0.12, 0, random() * 3);
      s.mesh(new THREE.CircleGeometry(0.0045, 12), new THREE.MeshStandardMaterial({ color: '#b01220', roughness: 0.6, emissive: '#500', emissiveIntensity: 0.4 }), [ex + 0.002, top + 0.0045, ez]).rotation.x = -Math.PI / 2;
    } else if (a.extra === 'talc') {
      s.cylinder(0.022, 0.022, 0.085, [ex + 0.01, top + 0.0425, ez - 0.02], s.material('#d7e5ea', { metalness: 0.4, roughness: 0.35 }), 20);
      s.cylinder(0.015, 0.022, 0.012, [ex + 0.01, top + 0.091, ez - 0.02], brass, 20);
      s.label('TALC', 0.03, 0.02, [ex + 0.01, top + 0.05, ez + 0.0025], '#b03040', '#f4f0e2').castShadow = false;
      s.ball([0.03, 0.002, 0.022], [ex - 0.03, top + 0.001, ez + 0.03], foam, 12);
      s.scatter(new THREE.SphereGeometry(1, 5, 4), foam, Array.from({ length: 30 }, () => ({ at: [ex - 0.03 + (random() - 0.5) * 0.09, top + 0.001, ez + 0.03 + (random() - 0.5) * 0.07] as [number, number, number], size: mix(0.001, 0.003, random()) })));
    }

    return s.finish();
  },
});

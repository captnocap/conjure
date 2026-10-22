import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type P3, coil, grime, paintTexture, painted, put, roundedBox, tubeThrough } from './lib';

export default defineThing({
  questions: {
    paint: choice('What colour is the wagon?', {
      avocado: 'Avocado green.',
      gold: 'Harvest gold.',
      blue: 'Powder blue.',
      burgundy: 'Deep burgundy.',
      white: 'Refrigerator white.',
      brown: 'Root-beer brown.',
    }),
    wood: choice('What is the wood panelling like?', {
      walnut: 'Dark walnut-grain panels in pale ash frames, the full country-squire look.',
      faded: 'Sun-bleached vinyl woodgrain, peeling at the edges.',
      none: 'No wood at all, just a chrome spear down plain paint.',
    }),
    who: choice('Who was here, in the back?', {
      kids: 'Two kids in pyjamas asleep under the blanket before the second feature, a teddy bear between them.',
      couple: 'A couple sitting on the tailgate under one blanket, heads together.',
      dog: 'A dog, left to guard the blankets and watching the screen anyway.',
      nobody: 'Nobody left: a rumpled blanket, dented pillows, a tipped popcorn box and the cooler lid open.',
    }),
    bedding: choice('What is the blanket?', {
      plaid: 'A red tartan car rug.',
      quilt: 'A patchwork quilt from home.',
      army: 'An olive army-surplus blanket.',
      stripes: 'A striped beach blanket.',
    }),
    beside: choice('What is set up beside the car?', {
      nothing: 'Nothing.',
      chairs: 'Two webbed folding lawn chairs.',
      grill: 'A little kettle grill with coals still glowing.',
      radio: 'A transistor radio on the roof with its aerial up.',
    }),
    lights: choice('Which of its lights are on?', {
      off: 'None: it sits dark, lit only by the screen.',
      dome: 'The dome light, glowing warm over the bedding.',
      tail: 'The tail lights and parking lamps, somebody forgot or is about to leave.',
    }),
    speaker: noul('Is a drive-in speaker hooked on its window?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const worn = (colour: string, amount = 0.35) => new THREE.Color(colour).lerp(new THREE.Color('#8a7460'), mood.wear * amount);
    const colour = { avocado: '#7d8f4e', gold: '#d4a63c', blue: '#9cc3dc', burgundy: '#7c2634', white: '#eeeadf', brown: '#6b4630' }[a.paint];
    const body = s.material(worn(colour), { metalness: 0.35, roughness: mix(0.3, 0.7, mood.wear) });
    const chrome = s.material(worn('#dfe3e4', 0.5), { metalness: 0.9, roughness: 0.2 });
    const dark = s.material('#17181a', { roughness: 0.85 });
    const vinyl = s.material(a.paint === 'white' || a.paint === 'blue' ? '#a23a34' : '#d8c9a4', { roughness: 0.7 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc0c4', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const W = 1.95, zF = -2.7, zR = 2.5, floor = 0.78, belt = 0.92, roofY = 1.4;
    const hw = W / 2;

    // Lower tub, hood and front end.
    const tub = s.mesh(roundedBox(W, 0.52, zR - zF, 0.1), body, [0, 0.52, (zF + zR) / 2]);
    tub.castShadow = true;
    s.mesh(roundedBox(W - 0.04, 0.24, 1.75, 0.07), body, [0, 0.86, zF + 0.9]);
    s.box([W - 0.2, 0.03, 0.4], [0, 0.985, -1.15], dark);
    const grille = painted(W - 0.1, 0.34, (ctx, w, h) => {
      ctx.fillStyle = '#c9cdce'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) { ctx.fillStyle = '#2a2c2e'; ctx.fillRect(w * 0.2 + i * (w * 0.6 / 22), h * 0.15, w * 0.012, h * 0.7); }
      for (const x of [0.07, 0.15, 0.85, 0.93]) { ctx.fillStyle = a.lights === 'tail' ? '#fff3c4' : '#eef1ee'; ctx.beginPath(); ctx.arc(w * x, h * 0.5, h * 0.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke(); }
    }, { px: 256, glow: a.lights === 'tail' ? 0.5 : 0 });
    grille.rotation.y = Math.PI;
    put(s.root, grille, [0, 0.7, zF - 0.005]);
    for (const z of [zF - 0.06, zR + 0.06]) s.mesh(roundedBox(W + 0.06, 0.13, 0.14, 0.04), chrome, [0, 0.36, z]);

    // Cargo walls up to the belt, pillars, roof and glass.
    for (const side of [-1, 1]) {
      s.box([0.08, belt - floor + 0.02, zR + 0.95], [side * (hw - 0.04), (belt + floor) / 2, (zR - 0.95) / 2], body);
      for (const [z0, z1, t] of [[-0.95, -0.45, 0.07], [0.22, 0.22, 0.09], [1.32, 1.32, 0.07], [zR - 0.03, zR - 0.2, 0.09]] as const)
        s.rod([side * (hw - 0.05), belt, z0], [side * (hw - 0.1), roofY - 0.02, z1], t / 2, body);
      const pane = new THREE.Shape();
      pane.moveTo(-0.95, belt); pane.lineTo(zR - 0.03, belt); pane.lineTo(zR - 0.2, roofY - 0.04); pane.lineTo(-0.45, roofY - 0.04); pane.closePath();
      const window = s.mesh(new THREE.ShapeGeometry(pane), glass, [side * (hw - 0.07), 0, 0]);
      window.rotation.y = -Math.PI / 2;
      window.castShadow = false;
      s.box([0.012, 0.02, zR + 0.9], [side * (hw + 0.003), belt + 0.01, (zR - 0.95) / 2 + 0.02], chrome);
    }
    s.mesh(roundedBox(W - 0.14, 0.08, zR - 0.15 + 0.5, 0.035), body, [0, roofY, (zR - 0.15 - 0.5) / 2]);
    const screen = s.mesh(new THREE.PlaneGeometry(W - 0.24, 0.66), glass, [0, (belt + roofY) / 2 + 0.01, -0.7]);
    screen.rotation.x = 0.86; screen.castShadow = false;
    s.box([W - 0.2, 0.14, 0.3], [0, belt - 0.05, -0.8], dark);
    // Front bench seat and steering wheel, seen through the glass.
    s.mesh(roundedBox(W - 0.3, 0.5, 0.16, 0.06), vinyl, [0, floor + 0.25, -0.02]).rotation.x = -0.12;
    s.box([W - 0.3, 0.14, 0.5], [0, floor - 0.02, -0.3], vinyl);
    s.ring(0.17, 0.014, [-0.45, belt + 0.06, -0.62], dark).rotation.x = 1.1;
    s.box([W - 0.16, 0.04, zR - 0.2], [0, floor - 0.02, (zR + 0.2) / 2], s.material('#5b564e', { roughness: 1 }));

    // Wheels with whitewalls and dog-dish caps.
    const whitewall = mood.wear < 0.7;
    for (const z of [-1.72, 1.45]) for (const side of [-1, 1]) {
      const wheel = put(s.root, new THREE.Group(), [side * (hw - 0.09), 0.34, z]);
      put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 24), dark)).rotation.z = Math.PI / 2;
      if (whitewall) put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.012, 24), s.material('#efece2')), [side * 0.11, 0, 0]).rotation.z = Math.PI / 2;
      put(wheel, new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), chrome), [side * 0.105, 0, 0]).rotation.z = -side * Math.PI / 2;
      wheel.children[wheel.children.length - 1].scale.y = 0.25;
    }

    // Side panelling, with the wheel arches painted in.
    const arches = [-1.72, 1.45];
    for (const side of [-1, 1]) {
      const z0 = zF + 0.25, z1 = zR - 0.05, len = z1 - z0, y0 = 0.3, y1 = 0.76;
      const panel = painted(len, y1 - y0, (ctx, w, h) => {
        const Z = (z: number) => ((side > 0 ? z1 - z : z - z0) / len) * w;
        ctx.fillStyle = `#${worn(colour).getHexString()}`; ctx.fillRect(0, 0, w, h);
        if (a.wood !== 'none') {
          const grain = a.wood === 'walnut' ? ['#5a3a22', '#6b452a', '#4a2f1c'] : ['#a58a66', '#b59a76', '#8f7658'];
          const top = h * 0.1, bottom = h * 0.74;
          ctx.fillStyle = grain[0]; ctx.fillRect(w * 0.03, top, w * 0.94, bottom - top);
          for (let i = 0; i < 46; i++) { ctx.strokeStyle = grain[1 + (i % 2)]; ctx.lineWidth = 1 + random() * 2; const y = top + random() * (bottom - top); ctx.beginPath(); ctx.moveTo(w * 0.03, y); ctx.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 8, w * 0.6, y + (random() - 0.5) * 8, w * 0.97, y + (random() - 0.5) * 5); ctx.stroke(); }
          ctx.strokeStyle = a.wood === 'walnut' ? '#dcc79a' : '#cdbf9f'; ctx.lineWidth = h * 0.07; ctx.strokeRect(w * 0.03, top, w * 0.94, bottom - top);
          for (const z of [-0.95, 0.22, 1.32]) { ctx.beginPath(); ctx.moveTo(Z(z), top); ctx.lineTo(Z(z), bottom); ctx.lineWidth = h * 0.04; ctx.stroke(); }
          if (a.wood === 'faded') for (let i = 0; i < 9 + mood.wear * 16; i++) { ctx.fillStyle = `#${worn(colour).getHexString()}`; ctx.beginPath(); ctx.ellipse(random() * w, random() < 0.5 ? top + random() * 10 : bottom - random() * 10, 8 + random() * 26, 3 + random() * 8, 0, 0, 7); ctx.fill(); }
        } else { ctx.fillStyle = '#dfe3e4'; ctx.fillRect(0, h * 0.3, w, h * 0.05); }
        grime(ctx, w, h, mood.wear, random, '120,70,40');
        for (const z of arches) { ctx.fillStyle = `#${worn(colour).getHexString()}`; ctx.beginPath(); ctx.arc(Z(z), h * 0.93, h * 0.98, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#121314'; ctx.beginPath(); ctx.arc(Z(z), h * 0.93, h * 0.88, Math.PI, 0); ctx.fill(); }
      }, { px: 1024, roughness: 0.5 });
      panel.rotation.y = side * Math.PI / 2;
      put(s.root, panel, [side * (hw + 0.004), (y0 + y1) / 2, (z0 + z1) / 2]);
    }

    // Tail end: lamps, plate and the dropped gate on its stays.
    const tailOn = a.lights === 'tail';
    const lens = new THREE.MeshStandardMaterial({ color: '#b3231d', emissive: '#ff2a1a', emissiveIntensity: tailOn ? 2 : 0.08, roughness: 0.3 });
    for (const side of [-1, 1]) {
      s.mesh(roundedBox(0.14, 0.26, 0.05, 0.03), lens, [side * (hw - 0.1), 0.6, zR + 0.012]);
      s.box([0.12, 0.05, 0.03], [side * (hw - 0.2), 0.52, zF - 0.02], new THREE.MeshStandardMaterial({ color: '#e9a23a', emissive: '#ff9a2a', emissiveIntensity: tailOn ? 1.6 : 0.05 }));
    }
    const plate = painted(0.32, 0.16, (ctx, w, h) => { ctx.fillStyle = mood.cheer > 0.5 ? '#f3d54a' : '#e9eef0'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#1d2a4a'; ctx.font = `bold ${h * 0.6}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${'JKLMRSTV'[Math.floor(random() * 8)]}${'ABEHNP'[Math.floor(random() * 6)]} ${1000 + Math.floor(random() * 8999)}`, w / 2, h * 0.55, w * 0.9); }, { px: 128 });
    put(s.root, plate, [0, 0.36, zR + 0.135]);
    const gateLen = 0.56;
    s.mesh(roundedBox(W - 0.2, 0.07, gateLen, 0.02), body, [0, floor - 0.035, zR + gateLen / 2]);
    for (let i = 0; i < 5; i++) s.box([W - 0.4, 0.008, 0.02], [0, floor + 0.004, zR + 0.08 + i * 0.1], chrome);
    for (const side of [-1, 1]) s.rod([side * (hw - 0.08), belt + 0.15, zR - 0.05], [side * (hw - 0.14), floor, zR + gateLen - 0.06], 0.008, chrome);

    // Dome light.
    const domeOn = a.lights === 'dome';
    s.box([0.16, 0.025, 0.1], [0, roofY - 0.05, 1.1], new THREE.MeshStandardMaterial({ color: '#fff3d1', emissive: mood.warmth > 0.4 ? '#ffc56e' : '#fff1cf', emissiveIntensity: domeOn ? 2.4 : 0 }));

    // Bedding.
    const patterns = {
      plaid: (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.fillStyle = '#b52c2c'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(20,40,30,0.55)'; ctx.fillRect((i / 8) * w + w * 0.02, 0, w * 0.05, h); ctx.fillRect(0, (i / 8) * h + h * 0.02, w, h * 0.05); ctx.fillStyle = 'rgba(245,225,120,0.7)'; ctx.fillRect((i / 8) * w + w * 0.09, 0, w * 0.008, h); ctx.fillRect(0, (i / 8) * h + h * 0.09, w, h * 0.008); } },
      quilt: (ctx: CanvasRenderingContext2D, w: number, h: number) => { const c = ['#d98a7a', '#e9d28a', '#8fb7a6', '#6d86b0', '#f1e8d6', '#b56a8a']; for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) { ctx.fillStyle = c[Math.floor(random() * 6)]; ctx.fillRect((x / 6) * w, (y / 6) * h, w / 6 + 1, h / 6 + 1); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect((x / 6) * w + 3, (y / 6) * h + 3, w / 6 - 6, h / 6 - 6); } },
      army: (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.fillStyle = '#6a6f45'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#4c5033'; ctx.fillRect(0, h * 0.08, w, h * 0.04); ctx.fillRect(0, h * 0.88, w, h * 0.04); },
      stripes: (ctx: CanvasRenderingContext2D, w: number, h: number) => { const c = ['#f2efe2', '#2f8fb8', '#f2efe2', '#f0b33a', '#f2efe2', '#e2574a']; for (let i = 0; i < 12; i++) { ctx.fillStyle = c[i % 6]; ctx.fillRect((i / 12) * w, 0, w / 12 + 1, h); } },
    };
    const cloth = new THREE.MeshStandardMaterial({ map: paintTexture(256, 256, (ctx, w, h) => { patterns[a.bedding](ctx, w, h); grime(ctx, w, h, mood.wear * 0.5, random); }), roughness: 1, side: THREE.DoubleSide });
    const bedX = W - 0.36;
    // Lumps the blanket has to rise over.
    const lumps: [number, number, number, number, number][] = [];
    if (a.who === 'kids') for (const x of [-0.36, 0.34]) lumps.push([x + (random() - 0.5) * 0.08, 1.35, 0.2, 0.75, 0.2]);
    const rumple = a.who === 'nobody' ? 0.09 : 0.03;
    const blanketLen = a.who === 'couple' ? 1.3 : 1.9, blanketZ = a.who === 'couple' ? 0.95 : 1.55 + (a.who === 'nobody' ? 0.25 : 0);
    const blanket = s.mesh(new THREE.PlaneGeometry(bedX, blanketLen, 22, 26), cloth, [a.who === 'nobody' ? 0.12 : 0, floor + 0.035, blanketZ]);
    blanket.rotation.x = -Math.PI / 2;
    blanket.rotation.z = a.who === 'nobody' ? 0.18 : 0;
    const bp = blanket.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i);
      let lift = Math.sin(x * 9 + y * 4) * rumple * 0.5 + Math.sin(y * 13 - x * 5) * rumple * 0.5 + rumple;
      for (const [lx, lz, rx, rz, lh] of lumps) { const dx = (x - lx) / rx, dz = (blanketZ - y - lz) / rz; lift += lh * Math.exp(-(dx * dx + dz * dz) * 1.6); }
      bp.setZ(i, lift);
    }
    blanket.geometry.computeVertexNormals();

    const pillowMat = s.material('#f4f1e8', { roughness: 1 });
    const pillow = (at: P3, turn: number) => { const p = s.mesh(roundedBox(0.52, 0.13, 0.34, 0.06), pillowMat, at); p.rotation.y = turn; return p; };
    const pillows = a.who === 'couple' ? 1 : Math.max(2, Math.round(mix(2, 4, mood.density)));
    for (let i = 0; i < pillows; i++) pillow([(i % 2 ? 0.36 : -0.38) + (random() - 0.5) * 0.1, floor + 0.07 + (i > 1 ? 0.12 : 0), 0.42 + (i > 1 ? 0.06 : 0) + (a.who === 'nobody' ? random() * 0.5 : 0)], (random() - 0.5) * (a.who === 'nobody' ? 1.6 : 0.3));

    const skinTones = ['#e8bc98', '#c98f64', '#8e5d3d', '#f0cba8'];
    const head = (at: P3, size: number, hair: string) => {
      s.ball([size, size, size], at, s.material(skinTones[Math.floor(random() * 4)], { roughness: 0.8 }), 14);
      const cap = s.mesh(new THREE.SphereGeometry(size * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), s.material(hair, { roughness: 1 }), at);
      return cap;
    };
    if (a.who === 'kids') {
      for (const [lx] of lumps) head([lx, floor + 0.2, 0.5], 0.095, ['#3a2a1e', '#c9a25a', '#6b3f22', '#1c1a1a'][Math.floor(random() * 4)]).rotation.x = -1.2;
      const bear = s.material('#a8763f', { roughness: 1 });
      s.ball([0.07, 0.09, 0.06], [0, floor + 0.2, 0.86], bear, 10); s.ball([0.055, 0.055, 0.055], [0, floor + 0.3, 0.8], bear, 10);
      for (const k of [-1, 1]) s.ball([0.022, 0.022, 0.015], [k * 0.045, floor + 0.35, 0.8], bear, 6);
    }
    if (a.who === 'couple') {
      const edge = zR + gateLen - 0.12;
      const tilt = [0.16, -0.22];
      [-0.2, 0.2].forEach((x, i) => {
        const torso = s.mesh(new THREE.CapsuleGeometry(0.16, 0.34, 4, 10), cloth, [x, floor + 0.36, edge - 0.08]);
        torso.rotation.z = tilt[i] * 0.6;
        head([x + tilt[i] * 0.55, floor + 0.86, edge - 0.08], 0.11, i ? '#3a2a1e' : '#b9863f').rotation.x = -0.25;
        const legCloth = s.material(i ? '#3d4a66' : '#c9bfa6', { roughness: 0.9 });
        s.mesh(new THREE.CapsuleGeometry(0.06, 0.3, 3, 8), legCloth, [x - 0.07, floor + 0.05, edge + 0.08]).rotation.x = Math.PI / 2;
        s.mesh(new THREE.CapsuleGeometry(0.06, 0.3, 3, 8), legCloth, [x + 0.07, floor + 0.05, edge + 0.08]).rotation.x = Math.PI / 2;
        for (const k of [-0.07, 0.07]) { s.mesh(new THREE.CapsuleGeometry(0.05, 0.34, 3, 8), legCloth, [x + k, floor - 0.22, edge + 0.3]).rotation.x = 0.15 * (i ? 1 : -1); s.box([0.09, 0.07, 0.2], [x + k, floor - 0.47, edge + 0.36], dark); }
      });
      s.mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), cloth, [0, floor + 0.42, edge - 0.14]).rotation.z = Math.PI / 2;
    }
    if (a.who === 'dog') {
      const fur = s.material(['#c98f4a', '#3a2f28', '#e9e2d0', '#8a5a36'][Math.floor(random() * 4)], { roughness: 1 });
      const d = put(s.root, new THREE.Group(), [0.25, floor + 0.05, zR + 0.12]);
      const part = (size: P3, at: P3) => { const m = put(d, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), fur), at); m.scale.set(...size); return m; };
      part([0.17, 0.24, 0.2], [0, 0.25, -0.05]).rotation.x = -0.35;
      part([0.13, 0.15, 0.14], [0, 0.07, -0.15]);
      part([0.105, 0.105, 0.11], [0, 0.56, 0.08]);
      part([0.055, 0.05, 0.09], [0, 0.53, 0.19]);
      part([0.02, 0.018, 0.02], [0, 0.545, 0.275]).material = dark;
      for (const k of [-1, 1]) { part([0.035, 0.09, 0.05], [k * 0.095, 0.57, 0.03]).rotation.z = k * 0.5; part([0.04, 0.17, 0.045], [k * 0.08, 0.14, 0.12]); }
      put(d, tubeThrough([[0, 0.05, -0.28], [0.05, 0.1, -0.4], [0.1, 0.22, -0.44]], 0.022, fur));
      d.rotation.y = (random() - 0.5) * 0.5;
    }
    // Cooler, and what the evening left behind.
    const coolerAt: P3 = [a.who === 'dog' ? -0.55 : 0.58, floor + 0.17, a.who === 'couple' ? 1.9 : zR + 0.2];
    const coolerColour = mood.cheer > 0.5 ? '#c5372c' : '#2f6d8f';
    s.mesh(roundedBox(0.5, 0.3, 0.32, 0.03), s.material(worn(coolerColour), { roughness: 0.5 }), coolerAt);
    const lidOpen = a.who === 'nobody';
    const lid = s.mesh(roundedBox(0.52, 0.06, 0.34, 0.025), s.material('#f1eee4', { roughness: 0.5 }), [coolerAt[0], coolerAt[1] + 0.18, coolerAt[2]]);
    if (lidOpen) { lid.rotation.x = -1.3; lid.position.set(coolerAt[0], coolerAt[1] + 0.28, coolerAt[2] - 0.2); for (let i = 0; i < 3; i++) s.cylinder(0.032, 0.032, 0.11, [coolerAt[0] - 0.14 + i * 0.13, coolerAt[1] + 0.13, coolerAt[2] + (random() - 0.5) * 0.1], s.material(['#b02a22', '#2f8f4f', '#d9a13a'][i], { metalness: 0.6, roughness: 0.3 }), 10); }
    else s.ring(0.09, 0.008, [coolerAt[0], coolerAt[1] + 0.2, coolerAt[2]], chrome, Math.PI);
    if (a.who === 'nobody' || mood.density > 0.6) {
      const box = s.mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.2, 4), s.material('#d2392f'), [-0.5, floor + 0.07, zR + 0.3]);
      box.rotation.set(Math.PI / 2, 0, 0.8);
      const corn = Array.from({ length: 26 }, () => ({ at: [-0.42 + random() * 0.4, floor + 0.02, zR + 0.34 + random() * 0.22] as P3, size: 0.016 + random() * 0.01, color: random() < 0.5 ? '#fbf2cf' : '#f1dc92' }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), corn);
    }

    // Beside the car.
    const sideX = hw + 0.9;
    if (a.beside === 'chairs') {
      const web = paintTexture(64, 64, (ctx, w, h) => { const c = mood.cheer > 0.5 ? ['#3fa66a', '#f4f1e6'] : ['#a2764a', '#e6dcc0']; for (let i = 0; i < 6; i++) { ctx.fillStyle = c[i % 2]; ctx.fillRect((i / 6) * w, 0, w / 6 + 1, h); } for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, (i / 6) * h, w, 2); } });
      const webbing = new THREE.MeshStandardMaterial({ map: web, roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) {
        const c = put(s.root, new THREE.Group(), [sideX + i * 0.75, 0, zR - 0.2 + (random() - 0.5) * 0.3]);
        put(c, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.45), webbing), [0, 0.4, 0]);
        put(c, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.02), webbing), [0, 0.68, -0.25]).rotation.x = -0.25;
        for (const k of [-1, 1]) {
          put(c, tubeThrough([[k * 0.27, 0, 0.25], [k * 0.27, 0.42, 0.2], [k * 0.27, 0.6, -0.05], [k * 0.27, 0.58, -0.22]], 0.012, chrome, 5, 3));
          put(c, tubeThrough([[k * 0.27, 0, -0.3], [k * 0.27, 0.4, -0.2], [k * 0.27, 0.95, -0.34]], 0.012, chrome, 5, 3));
        }
        c.rotation.y = (i ? -0.25 : 0.2) + (random() - 0.5) * 0.3;
        if (mood.wear > 0.75 && i) { c.rotation.x = -Math.PI / 2.2; c.position.y = 0.25; }
      }
    }
    if (a.beside === 'grill') {
      const gz = zR + 0.1;
      const enamel = s.material(worn('#1e2022', 0.3), { metalness: 0.3, roughness: 0.4 });
      s.mesh(new THREE.SphereGeometry(0.26, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), enamel, [sideX, 0.62, gz]);
      s.cylinder(0.25, 0.25, 0.012, [sideX, 0.615, gz], new THREE.MeshStandardMaterial({ color: '#3a1a10', emissive: '#ff5a1a', emissiveIntensity: mix(0.6, 2, mood.warmth) }), 20);
      for (let i = 0; i < 3; i++) s.rod([sideX + Math.cos(i * 2.1) * 0.12, 0.42, gz + Math.sin(i * 2.1) * 0.12], [sideX + Math.cos(i * 2.1) * 0.26, 0, gz + Math.sin(i * 2.1) * 0.26], 0.012, chrome);
      const cap = s.mesh(new THREE.SphereGeometry(0.265, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), enamel, [sideX + 0.42, 0.02, gz + 0.2]);
      cap.rotation.z = 2.6;
      for (let i = 0; i < 3; i++) s.cylinder(0.022, 0.022, 0.12, [sideX - 0.1 + i * 0.09, 0.64, gz], s.material('#9a4a35', { roughness: 0.8 }), 8).rotation.x = Math.PI / 2;
    }
    if (a.beside === 'radio') {
      const rz = 1.6;
      s.mesh(roundedBox(0.26, 0.16, 0.08, 0.02), s.material(mood.cheer > 0.5 ? '#3fb5ac' : '#c9c2ae', { roughness: 0.4 }), [hw - 0.35, roofY + 0.12, rz]).rotation.y = Math.PI / 2;
      s.cylinder(0.045, 0.045, 0.005, [hw - 0.305, roofY + 0.12, rz + 0.05], dark, 14).rotation.z = Math.PI / 2;
      s.rod([hw - 0.35, roofY + 0.2, rz - 0.1], [hw - 0.2, roofY + 0.75, rz - 0.3], 0.004, chrome);
    }
    if (a.speaker) {
      const at: P3 = [-hw - 0.03, belt + 0.16, -0.2];
      const unit = s.mesh(roundedBox(0.13, 0.19, 0.08, 0.035), s.material(worn('#aeb3b4', 0.5), { metalness: 0.6, roughness: 0.4 }), at);
      unit.rotation.y = -Math.PI / 2;
      s.cylinder(0.045, 0.045, 0.01, [at[0] - 0.042, at[1] + 0.02, at[2]], dark, 14).rotation.z = Math.PI / 2;
      put(s.root, tubeThrough(coil([at[0], at[1] - 0.09, at[2]], [-hw - 0.75, 0.9, -0.35], 18, 0.014, 0.42), 0.005, dark, 5, 2));
      s.cylinder(0.025, 0.028, 1.0, [-hw - 0.75, 0.5, -0.35], chrome, 10);
      s.box([0.12, 0.1, 0.09], [-hw - 0.75, 1.02, -0.35], chrome);
    }
    if (mood.wear > 0.75) { s.root.rotation.z = 0.012; }

    return s.finish({
      footprint: 2.9,
      update: (_dt, time) => { if (tailOn) lens.emissiveIntensity = 2 + Math.sin(time * 2.1) * 0.15 * mood.energy; },
    });
  },
});

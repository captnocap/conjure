import * as THREE from 'three';
import { Sculpture, choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A pleated hanging cloth: a plane rippled in z. */
function pleated(width: number, height: number, folds: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, height, Math.max(8, Math.round(folds * 6)), 1);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / width + 0.5) * folds * Math.PI * 2) * depth);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    carpet: choice('What colour is the shag carpet?', {
      rust: 'Rust orange, deep enough to lose a sock in.',
      avocado: 'Avocado green.',
      gold: 'Harvest gold.',
      chocolate: 'Chocolate brown.',
      cream: 'Off-white shag that shows every footprint and spill.',
    }),
    hearth: choice('What is the fireplace wall built from?', {
      red: 'Plain red brick in neat courses.',
      used: 'Mottled reclaimed brick, dark and pale mixed, soot-streaked.',
      white: 'Brick painted white.',
      stone: 'Rounded fieldstone set in dark mortar.',
    }),
    fire: choice('What is happening in the fireplace?', {
      roaring: 'A full fire, bright and crackling.',
      embers: 'Orange embers under charred logs, burning down.',
      cold: 'Cold grey ash and one half-burnt log.',
      never: 'Never lit: a brass fan screen in the opening and dried pampas grass on the hearth.',
    }),
    outside: choice('What is outside the sliding glass door?', {
      sunset: 'An amber suburban sunset over a fence line and one tree.',
      pool: 'A lit swimming pool glowing turquoise at dusk.',
      snow: 'A blue snowy yard and a bare tree.',
      rain: 'Grey rain and a streetlamp.',
      night: 'Full dark, one yellow porch light.',
    }),
    door: choice('How is the glass door dressed?', {
      shut: 'Shut, with the drapes pulled back to the sides.',
      open: 'Slid half open to the evening air, drapes pulled back.',
      drawn: 'Drapes drawn right across, glowing where the light comes through.',
      blinds: 'Vertical blinds turned half open, light in stripes.',
    }),
    wall: choice('What hangs on the panelled wall?', {
      sunburst: 'A brass sunburst clock.',
      landscape: 'A heavy-framed landscape painting of mountains and a lake.',
      guns: 'A gun rack with two rifles.',
      beer: 'A lit-up beer sign from a bar.',
      portraits: 'A cluster of framed school portraits.',
    }),
    mantel: choice('What is on the mantel?', {
      clock: 'A mantel clock between two candlesticks, under a big painting of a sailing ship.',
      trophies: 'A row of trophies under a team pennant.',
      family: 'Family photographs, under one large oval portrait.',
      kitsch: 'Ceramic owls, a brandy snifter full of matchbooks and a ship in a bottle.',
      bare: 'Nearly nothing: one can, and a pale patch on the brick where something used to hang.',
    }),
    state: choice('What state is the room in?', {
      tidy: 'Tidy, with fresh vacuum stripes in the shag.',
      lived: 'Lived in: newspapers, slippers, floor cushions and a few cans.',
      party: 'The morning after a party: cups, bottles, balloons and record sleeves.',
      moving: 'Being packed up: cardboard boxes, a rolled rug, bare hooks on the walls.',
    }),
    ledge: choice('What is along the raised edge of the sunken floor?', {
      cushions: 'Conversation-pit cushions and throw pillows.',
      plants: 'Potted rubber plants and ferns in baskets.',
      shelf: 'A low run of books, encyclopedias and hi-fi speakers.',
      bare: 'Bare polished wood.',
    }),
    haze: noul('Is there cigarette haze hanging in the air?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const carpetTone = new THREE.Color({ rust: '#b05a2c', avocado: '#7c8438', gold: '#c99a32', chocolate: '#6a4630', cream: '#ddd2b8' }[a.carpet]).lerp(new THREE.Color('#8f887a'), mood.wear * 0.25);
    const glowTone = { sunset: '#ffae52', pool: '#58dccd', snow: '#b6cdee', rain: '#b4bec6', night: '#e6c45a' }[a.outside];
    const { art: s, world } = diorama(context, {
      background: { sunset: '#ead9bd', pool: '#d6e2dd', snow: '#dee4ea', rain: '#d8d9d4', night: '#d2cabb' }[a.outside],
      floor: `#${carpetTone.getHexString()}`,
      width: 14, depth: 11, maxHeight: 3.0, radius: 1.4, pitch: 30, yaw: 31,
      slots: [[-1.7, 0.4], [-5.1, 1.9], [2.7, -1.8], [-5.1, -1.9], [2.9, 2.3], [-0.3, 3.3]],
    });
    const multi = (size: P3, at: P3, materials: THREE.Material[]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options });

    // Materials: grooved panelling, masonry, trim.
    const panelTone = new THREE.Color('#6a472d').lerp(new THREE.Color('#8a7a66'), mood.wear * 0.25);
    const panelMap = (w: number) => paint(Math.round(w * 90), 512, (ctx, cw, ch) => {
      ctx.fillStyle = `#${panelTone.getHexString()}`;
      ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < cw * 0.5; i++) {
        ctx.strokeStyle = random() < 0.6 ? 'rgba(22,10,2,0.16)' : 'rgba(255,214,160,0.09)';
        ctx.lineWidth = 0.6 + random() * 1.8;
        const x = random() * cw, sway = (random() - 0.5) * 12;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + sway, ch * 0.3, x - sway, ch * 0.7, x + sway * 0.4, ch); ctx.stroke();
      }
      let x = 0;
      while (x < cw) { x += [30, 46, 62][Math.floor(random() * 3)]; ctx.fillStyle = 'rgba(14,6,0,0.7)'; ctx.fillRect(x, 0, 4, ch); ctx.fillStyle = 'rgba(255,225,180,0.16)'; ctx.fillRect(x + 4, 0, 2, ch); }
    });
    const panel = (w: number) => new THREE.MeshStandardMaterial({ map: panelMap(w), roughness: 0.55 });
    const trim = flat(panelTone.clone().multiplyScalar(0.62), { roughness: 0.5 });
    const plain = flat('#cfc4ad', { roughness: 0.95 });
    const brass = flat('#c9a04a', { metalness: 0.85, roughness: 0.3 });
    const black = flat('#1d1b1a', { roughness: 0.6 });
    const brickImage = paint(1024, 512, (ctx, w, h) => {
      const sooty = mood.wear;
      if (a.hearth === 'stone') {
        ctx.fillStyle = '#4a443c'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) { const tone = ['#9a9486', '#b3a68c', '#857c70', '#a08f78', '#6f6a62'][Math.floor(random() * 5)]; ctx.fillStyle = tone; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 16 + random() * 22, 11 + random() * 14, random() * 3, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(30,26,22,0.6)'; ctx.lineWidth = 3; ctx.stroke(); }
      } else {
        ctx.fillStyle = a.hearth === 'white' ? '#d8d2c4' : '#b5aa98'; ctx.fillRect(0, 0, w, h);
        const tones = a.hearth === 'red' ? ['#a04a34', '#a8523a', '#94412f', '#b05a40'] : a.hearth === 'used' ? ['#8f4532', '#5a3428', '#c9b49a', '#3d2a24', '#a8603f', '#d8cdb8'] : ['#efe9dc', '#e8e1d2', '#f3eee2'];
        for (let row = 0; row < h / 24; row++) for (let col = -1; col < w / 62 + 1; col++) {
          ctx.fillStyle = tones[Math.floor(random() * tones.length)];
          ctx.fillRect(col * 62 + (row % 2) * 31 + 2, row * 24 + 2, 58, 20);
        }
      }
      // Soot rising from the firebox, in the middle of the image.
      const grime = ctx.createRadialGradient(w * 0.385, h * 0.56, 10, w * 0.385, h * 0.4, 200);
      grime.addColorStop(0, `rgba(20,16,14,${0.25 + sooty * 0.5})`); grime.addColorStop(1, 'rgba(20,16,14,0)');
      ctx.fillStyle = grime; ctx.fillRect(0, 0, w, h);
    });
    // The masonry wall is 8.4 wide by 4.4 tall; each piece samples its own window of the image.
    const brick = (x0: number, x1: number, y0: number, y1: number) => {
      const map = brickImage.clone();
      map.needsUpdate = true;
      map.offset.set((x0 + 6.8) / 8.4, y0 / 4.4);
      map.repeat.set((x1 - x0) / 8.4, (y1 - y0) / 4.4);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    };
    const brickPlain = flat(a.hearth === 'white' ? '#e6dfd0' : a.hearth === 'stone' ? '#8f887a' : a.hearth === 'used' ? '#7a4a38' : '#9c4a36', { roughness: 0.9 });

    // Walls: brick behind the fireplace, panelling around the glass door, panelling down the side.
    const wallH = 4.4, backZ = -5.3, leftX = -6.8;
    multi([8.4, wallH, 0.3], [-2.6, wallH / 2, backZ - 0.15], [plain, plain, plain, plain, brick(-6.8, 1.6, 0, wallH), plain]);
    multi([0.3, wallH, 10.9], [leftX - 0.15, wallH / 2, 0], [panel(10.9), plain, plain, plain, plain, plain]);
    const doorL = 1.9, doorR = 5.9, doorH = 3.4;
    multi([doorL - 1.6, wallH, 0.3], [(doorL + 1.6) / 2, wallH / 2, backZ - 0.15], [plain, plain, plain, plain, panel(0.5), plain]);
    multi([7 - doorR, wallH, 0.3], [(7 + doorR) / 2, wallH / 2, backZ - 0.15], [plain, plain, plain, plain, panel(1.1), plain]);
    multi([doorR - doorL, wallH - doorH, 0.3], [(doorL + doorR) / 2, (wallH + doorH) / 2, backZ - 0.15], [plain, plain, plain, plain, panel(4), plain]);
    s.box([0.34, wallH, 0.34], [leftX - 0.13, wallH / 2, backZ - 0.13], trim);
    s.box([13.8, 0.14, 0.06], [0.1, 4.33, backZ + 0.03], trim);
    s.box([0.06, 0.14, 10.8], [leftX + 0.03, 4.33, 0.1], trim);
    s.box([0.05, 0.22, 10.6], [leftX + 0.025, 0.11, 0.1], trim);

    // Chimney breast with a real recess, raised hearth and mantel beam.
    const fx = -2.2, breastZ = backZ + 0.5, hearthH = 0.35, boxTop = 1.9;
    multi([1.6, wallH, 0.5], [fx - 1.8, wallH / 2, backZ + 0.25], [brickPlain, brickPlain, brickPlain, brickPlain, brick(fx - 2.6, fx - 1, 0, wallH), brickPlain]);
    multi([1.6, wallH, 0.5], [fx + 1.8, wallH / 2, backZ + 0.25], [brickPlain, brickPlain, brickPlain, brickPlain, brick(fx + 1, fx + 2.6, 0, wallH), brickPlain]);
    multi([2.0, wallH - boxTop, 0.5], [fx, (wallH + boxTop) / 2, backZ + 0.25], [brickPlain, brickPlain, brickPlain, brickPlain, brick(fx - 1, fx + 1, boxTop, wallH), brickPlain]);
    s.box([2.0, boxTop - hearthH, 0.02], [fx, (boxTop + hearthH) / 2, backZ + 0.012], flat('#171412', { roughness: 1 }));
    s.box([2.2, 0.1, 0.06], [fx, boxTop + 0.03, breastZ + 0.02], black);
    const slabTone = a.hearth === 'white' ? '#cfc8b8' : '#7a7268';
    s.box([5.8, hearthH, 1.6], [fx, hearthH / 2, backZ + 0.8], flat(slabTone, { roughness: 0.85 }));
    for (let i = 0; i < 6; i++) s.box([0.02, hearthH + 0.004, 1.602], [fx - 2.9 + (i + 0.5 + (random() - 0.5) * 0.4) * 5.8 / 6, hearthH / 2, backZ + 0.8], flat('#4a443c'));
    const mantelY = 2.55;
    s.box([4.6, 0.26, 0.62], [fx, mantelY - 0.13, breastZ + 0.26], flat('#4a2e1a', { roughness: 0.6 }));
    for (const x of [-1.7, 1.7]) s.box([0.26, 0.34, 0.4], [fx + x, mantelY - 0.42, breastZ + 0.18], flat('#3d2616', { roughness: 0.6 }));

    // Fire.
    const flames: THREE.Mesh[] = [];
    const hearthTop = hearthH, fireZ = backZ + 0.3;
    let fireLight: THREE.PointLight | null = null;
    if (a.fire !== 'never') {
      for (const x of [-0.45, 0.45]) { s.rod([fx + x, hearthTop, fireZ - 0.15], [fx + x, hearthTop + 0.16, fireZ + 0.42], 0.03, black); s.rod([fx + x, hearthTop, fireZ + 0.42], [fx + x, hearthTop + 0.62, fireZ + 0.42], 0.03, black); s.ball([0.075, 0.075, 0.075], [fx + x, hearthTop + 0.66, fireZ + 0.42], brass, 12); }
      const lit = a.fire === 'roaring' ? 1 : a.fire === 'embers' ? 0.45 : 0;
      const bark = flat(lit ? '#2a1a12' : '#3a2e26', { roughness: 1, emissive: '#ff4a12', emissiveIntensity: lit * 0.5 });
      const logs = a.fire === 'cold' ? 1 : 3;
      for (let i = 0; i < logs; i++) { const log = s.cylinder(0.13, 0.15, 1.3, [fx + (random() - 0.5) * 0.15, hearthTop + 0.3 + (i === 2 ? 0.22 : 0), fireZ + 0.06 + (i % 2) * 0.24 - (i === 2 ? 0.1 : 0)], bark, 10); log.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.2; log.rotation.y = (random() - 0.5) * 0.3; }
      s.ball([0.75, 0.1, 0.34], [fx, hearthTop + 0.04, fireZ + 0.14], flat(lit ? '#8a3a1a' : '#8d8a84', { roughness: 1, emissive: '#ff5a1a', emissiveIntensity: lit * 1.2 }), 14);
      if (lit) {
        const count = a.fire === 'roaring' ? 7 : 3;
        for (let i = 0; i < count; i++) {
          const tall = (a.fire === 'roaring' ? 0.95 : 0.3) * mix(0.6, 1.1, random());
          const flame = s.mesh(new THREE.ConeGeometry(0.2, tall, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffd45a' : '#ff8a2a', emissive: i % 2 ? '#ffc23a' : '#ff6a1a', emissiveIntensity: 2.2, transparent: true, opacity: 0.92 }), [fx - 0.5 + (i / Math.max(1, count - 1)) * 1.0 + (random() - 0.5) * 0.12, hearthTop + 0.42 + tall / 2, fireZ + 0.1 + (i % 3) * 0.1]);
          flame.geometry.translate(0, tall / 2, 0);
          flame.position.y -= tall / 2;
          flame.castShadow = false;
          flames.push(flame);
        }
        fireLight = new THREE.PointLight('#ff9a4a', a.fire === 'roaring' ? 16 : 5, 10, 1.6);
        fireLight.position.set(fx, 1.1, breastZ + 0.5);
        s.root.add(fireLight);
        const warm = s.mesh(new THREE.CircleGeometry(2.3, 28), new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: a.fire === 'roaring' ? 0.2 : 0.09, depthWrite: false }), [fx, 0.14, breastZ + 1.5]);
        warm.rotation.x = -Math.PI / 2;
        warm.scale.y = 0.7;
        warm.castShadow = false;
      }
      // Fire irons on the left of the hearth, logs on the right.
      s.cylinder(0.16, 0.18, 0.05, [fx - 2.35, hearthTop + 0.025, backZ + 1.1], black, 14);
      s.rod([fx - 2.35, hearthTop, backZ + 1.1], [fx - 2.35, hearthTop + 1.15, backZ + 1.1], 0.02, black);
      for (const [i, lean] of [-0.12, 0.02, 0.14].entries()) { s.rod([fx - 2.35 + lean, hearthTop + 0.08, backZ + 1.16], [fx - 2.35 + lean * 0.4, hearthTop + 1.0, backZ + 1.12], 0.014, black); s.ball([0.03, 0.03, 0.03], [fx - 2.35 + lean * 0.4, hearthTop + 1.02, backZ + 1.12], brass, 8); if (i === 0) s.box([0.12, 0.14, 0.02], [fx - 2.35 + lean, hearthTop + 0.12, backZ + 1.16], black); }
      const stack = 3 + Math.floor(mood.density * 4);
      for (let i = 0; i < stack; i++) { const row = i < 3 ? 0 : 1; s.cylinder(0.1, 0.11, 0.9, [fx + 2.0 + ((row ? i - 3 : i) - 1) * 0.22 + row * 0.11, hearthTop + 0.11 + row * 0.19, backZ + 1.05], flat(['#7a5a3c', '#6a4a30', '#8a6a48'][i % 3], { roughness: 1 }), 9).rotation.x = Math.PI / 2; }
    } else {
      const fan = s.mesh(new THREE.CircleGeometry(0.95, 18, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide, flatShading: true }), [fx, hearthTop, breastZ + 0.08]);
      const p = fan.geometry.attributes.position;
      for (let i = 1; i < p.count; i++) p.setZ(i, (i % 2) * 0.08);
      fan.geometry.computeVertexNormals();
      s.cylinder(0.2, 0.14, 0.42, [fx + 2.1, hearthTop + 0.21, backZ + 1.1], flat('#7a5a34', { roughness: 0.9 }), 14);
      for (let i = 0; i < 9; i++) { const lean = (random() - 0.5) * 0.7, tip: P3 = [fx + 2.1 + lean, hearthTop + 1.5 + random() * 0.5, backZ + 1.1 + (random() - 0.5) * 0.4]; s.rod([fx + 2.1, hearthTop + 0.4, backZ + 1.1], tip, 0.012, flat('#b9a070')); s.ball([0.07, 0.24, 0.07], [tip[0], tip[1], tip[2]], flat('#e6d8b4', { roughness: 1 }), 8).rotation.z = -lean * 0.6; }
    }

    // Mantel dressing and what hangs above it.
    const mz = breastZ + 0.28, wallFace = breastZ + 0.012, overY = 3.45;
    const framed = (parent: Sculpture, at: P3, w: number, h: number, map: THREE.Texture | null, frameTone: THREE.Material, tone = '#d9cdb4') => {
      parent.box([w + 0.16, h + 0.16, 0.07], [at[0], at[1], at[2] + 0.035], frameTone);
      parent.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, color: map ? '#ffffff' : tone, roughness: 0.6 }), [at[0], at[1], at[2] + 0.073]);
    };
    const gilt = flat('#a8843a', { metalness: 0.6, roughness: 0.4 });
    const portrait = (hue: number) => paint(96, 120, (ctx, w, h) => { ctx.fillStyle = `hsl(${hue},32%,62%)`; ctx.fillRect(0, 0, w, h); ctx.fillStyle = `hsl(${(hue + 150) % 360},35%,38%)`; ctx.beginPath(); ctx.ellipse(w / 2, h + 8, 36, 48, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e3bd96'; ctx.beginPath(); ctx.arc(w / 2, 48, 19, 0, 7); ctx.fill(); ctx.fillStyle = ['#5a3a22', '#2a1c14', '#c9a04a'][Math.floor(random() * 3)]; ctx.beginPath(); ctx.arc(w / 2, 40, 20, Math.PI, 0); ctx.fill(); });
    if (a.mantel === 'clock') {
      s.box([0.5, 0.42, 0.22], [fx, mantelY + 0.21, mz], flat('#5a3620', { roughness: 0.4 }));
      s.cylinder(0.16, 0.16, 0.03, [fx, mantelY + 0.24, mz + 0.115], flat('#efe6cc'), 20).rotation.x = Math.PI / 2;
      s.rod([fx, mantelY + 0.24, mz + 0.135], [fx + 0.07, mantelY + 0.32, mz + 0.135], 0.008, black);
      s.ring(0.165, 0.014, [fx, mantelY + 0.24, mz + 0.125], brass);
      for (const x of [-1.2, 1.2]) { s.lathe([[0, 0], [0.11, 0], [0.04, 0.05], [0.03, 0.3], [0.07, 0.34], [0, 0.34]], brass, [fx + x, mantelY, mz]); s.cylinder(0.025, 0.025, 0.36, [fx + x, mantelY + 0.52, mz], flat(mood.cheer > 0.5 ? '#c8452c' : '#efe6cc'), 8); }
      const ship = paint(192, 128, (ctx, w, h) => { const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6f8ea0'); sky.addColorStop(0.6, '#d9c08a'); sky.addColorStop(0.62, '#3f5a66'); sky.addColorStop(1, '#27404c'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#3a2618'; ctx.beginPath(); ctx.moveTo(60, 84); ctx.lineTo(136, 84); ctx.lineTo(126, 96); ctx.lineTo(70, 96); ctx.fill(); ctx.fillStyle = '#efe6cc'; for (const [x, t, b] of [[78, 30, 80], [100, 20, 80], [120, 34, 80]]) { ctx.beginPath(); ctx.moveTo(x, t); ctx.quadraticCurveTo(x + 22, (t + b) / 2, x, b); ctx.fill(); } });
      framed(s, [fx, overY, wallFace], 2.1, 1.3, ship, gilt);
    } else if (a.mantel === 'trophies') {
      const gold = flat('#e0b63c', { metalness: 0.85, roughness: 0.25 });
      const count = 4 + Math.floor(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const x = fx - 1.7 + i * 3.4 / (count - 1), tall = 0.3 + random() * 0.5;
        s.box([0.24, 0.1, 0.24], [x, mantelY + 0.05, mz], flat(i % 2 ? '#efe9dc' : '#2a2422', { roughness: 0.25 }));
        s.cylinder(0.045, 0.045, tall, [x, mantelY + 0.1 + tall / 2, mz], flat(['#b3202a', '#1f4a8a', '#e0b63c', '#2f7a4a'][i % 4], { metalness: 0.5, roughness: 0.3 }), 10);
        s.lathe([[0, 0], [0.05, 0.01], [0.03, 0.06], [0.1, 0.15], [0.12, 0.26], [0.1, 0.26], [0.02, 0.1]], gold, [x, mantelY + 0.1 + tall, mz]);
      }
      const pennant = new THREE.Shape(); pennant.moveTo(-1.2, 0.42); pennant.lineTo(1.3, 0); pennant.lineTo(-1.2, -0.42); pennant.closePath();
      s.mesh(new THREE.ShapeGeometry(pennant), flat(['#8f1f2a', '#1f3a6a', '#2f5a3a'][Math.floor(random() * 3)], { side: THREE.DoubleSide }), [fx, overY, wallFace + 0.01]);
      s.box([0.16, 0.86, 0.012], [fx - 1.14, overY, wallFace + 0.016], flat('#e6c95a'));
      s.label('STATE CHAMPS', 1.5, 0.2, [fx - 0.2, overY, wallFace + 0.02], '#e6c95a', '#8f1f2a').visible = false;
    } else if (a.mantel === 'family') {
      const count = 5 + Math.floor(mood.density * 3);
      for (let i = 0; i < count; i++) { const x = fx - 1.8 + i * 3.6 / (count - 1), w = 0.3 + random() * 0.14, h = w * 1.25; const group = new Sculpture(context); framed(group, [0, h / 2 + 0.08, 0], w, h, portrait(random() * 360), i % 2 ? gilt : trim); group.root.position.set(x, mantelY, mz - 0.05); group.root.rotation.set(-0.16, (random() - 0.5) * 0.4, 0); s.root.add(group.root); }
      const oval = s.mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshStandardMaterial({ map: portrait(30), roughness: 0.6 }), [fx, overY, wallFace + 0.05]);
      oval.scale.y = 1.2;
      const rim = s.ring(0.66, 0.07, [fx, overY, wallFace + 0.04], gilt);
      rim.scale.y = 1.2;
    } else if (a.mantel === 'kitsch') {
      for (const [i, x] of [-1.6, -1.2, -0.85].entries()) { const size = 1 - i * 0.22, tone = ['#b8642a', '#d9a43a', '#6f7a32'][i]; s.ball([0.14 * size, 0.2 * size, 0.12 * size], [fx + x, mantelY + 0.2 * size, mz], flat(tone, { roughness: 0.25 }), 12); s.ball([0.12 * size, 0.11 * size, 0.11 * size], [fx + x, mantelY + 0.42 * size, mz], flat(tone, { roughness: 0.25 }), 12); for (const e of [-1, 1]) { s.ball([0.04 * size, 0.04 * size, 0.02 * size], [fx + x + e * 0.05 * size, mantelY + 0.44 * size, mz + 0.1 * size], flat('#f1e6c8'), 8); s.ball([0.018 * size, 0.018 * size, 0.012 * size], [fx + x + e * 0.05 * size, mantelY + 0.44 * size, mz + 0.118 * size], black, 6); } }
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dcebef', transparent: true, opacity: 0.4, roughness: 0.05 });
      s.lathe([[0, 0], [0.1, 0], [0.02, 0.03], [0.02, 0.1], [0.2, 0.22], [0.22, 0.38], [0.17, 0.5]], glass, [fx + 0.2, mantelY, mz]);
      for (let i = 0; i < 14; i++) s.box([0.08, 0.012, 0.06], [fx + 0.2 + (random() - 0.5) * 0.2, mantelY + 0.16 + i * 0.014, mz + (random() - 0.5) * 0.16], flat(['#c2202f', '#1f4a8a', '#e2b23a', '#efe9dc', '#1d1d22'][i % 5])).rotation.y = random() * 3;
      const bottle = s.cylinder(0.14, 0.14, 0.6, [fx + 1.35, mantelY + 0.2, mz], glass, 16);
      bottle.rotation.z = Math.PI / 2;
      s.box([0.3, 0.05, 0.06], [fx + 1.35, mantelY + 0.14, mz], flat('#5a3620'));
      s.box([0.02, 0.16, 0.14], [fx + 1.35, mantelY + 0.24, mz], flat('#efe6cc'));
      for (const x of [1.15, 1.55]) s.box([0.06, 0.06, 0.26], [fx + x, mantelY + 0.03, mz], flat('#5a3620'));
      const peaks = paint(192, 128, (ctx, w, h) => { ctx.fillStyle = '#e39a4a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f3d27a'; ctx.beginPath(); ctx.arc(130, 46, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#5a3a5a'; ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(50, 40); ctx.lineTo(96, 96); ctx.lineTo(140, 56); ctx.lineTo(w, 100); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill(); ctx.fillStyle = '#2f5a5a'; ctx.fillRect(0, 100, w, 28); });
      framed(s, [fx, overY, wallFace], 2.0, 1.2, peaks, trim);
    } else {
      s.cylinder(0.1, 0.1, 0.36, [fx + 1.3 + random() * 0.4, mantelY + 0.18, mz + 0.1], flat('#c9ccd0', { metalness: 0.7, roughness: 0.3 }), 14);
      s.mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }), [fx, overY, wallFace + 0.004]);
      s.ball([0.02, 0.02, 0.02], [fx, overY + 0.5, wallFace + 0.02], black, 6);
    }

    // The sliding glass door and what is beyond it.
    const dusk = mix(0.75, 1.15, mood.daylight);
    const view = paint(256, 256, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
      const stops = { sunset: ['#7a5a86', '#f08a48', '#ffd590'], pool: ['#3f4f7a', '#8a7aa0', '#e8b48a'], snow: ['#6f84a6', '#a9bbd6', '#dfe6f0'], rain: ['#7f8a92', '#a3adb3', '#c2c8ca'], night: ['#1c2338', '#252d47', '#34385a'] }[a.outside];
      stops.forEach((tone, i) => sky.addColorStop(i / 2, tone));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      if (a.outside === 'sunset') { ctx.fillStyle = '#fff0b8'; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.66, 30, 0, 7); ctx.fill(); }
      const ground = { sunset: '#5a4030', pool: '#3a4a4a', snow: '#eef3f8', rain: '#5f6a62', night: '#161a22' }[a.outside];
      ctx.fillStyle = ground; ctx.fillRect(0, h * 0.72, w, h * 0.28);
      const dark = a.outside === 'snow' ? '#4a4f5a' : a.outside === 'night' ? '#0c0e14' : '#33241c';
      ctx.fillStyle = dark;
      for (let x = 0; x < w; x += 14) ctx.fillRect(x, h * 0.6, 11, h * 0.14);
      ctx.fillRect(0, h * 0.63, w, 4);
      // One tree.
      ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(52, h * 0.74); ctx.lineTo(56, h * 0.3); ctx.stroke();
      if (a.outside === 'snow' || a.outside === 'rain') { ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(55, h * (0.34 + i * 0.03)); ctx.lineTo(55 + (i % 2 ? -1 : 1) * (22 + random() * 26), h * (0.2 + i * 0.03)); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.arc(56, h * 0.26, 40, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(88, h * 0.34, 26, 0, 7); ctx.fill(); }
      if (a.outside === 'pool') { ctx.fillStyle = '#46e0d2'; ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.86, 92, 22, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c8fff6'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(w * 0.6 + (random() - 0.5) * 90, h * 0.86 + (random() - 0.5) * 20, 16, 3, 0, 0, 7); ctx.stroke(); } }
      if (a.outside === 'snow') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) ctx.fillRect(random() * w, random() * h, 2, 2); }
      if (a.outside === 'rain') { ctx.strokeStyle = 'rgba(230,236,240,0.5)'; ctx.lineWidth = 1; for (let i = 0; i < 120; i++) { const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); ctx.stroke(); } }
      if (a.outside === 'rain' || a.outside === 'night') { const halo = ctx.createRadialGradient(w * 0.74, h * 0.34, 2, w * 0.74, h * 0.34, 60); halo.addColorStop(0, 'rgba(255,224,120,0.95)'); halo.addColorStop(1, 'rgba(255,224,120,0)'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h); ctx.fillStyle = dark; ctx.fillRect(w * 0.74 - 2, h * 0.36, 4, h * 0.38); }
    });
    const doorW = doorR - doorL, doorX = (doorL + doorR) / 2;
    s.mesh(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshStandardMaterial({ map: view, emissiveMap: view, emissive: '#ffffff', emissiveIntensity: (a.outside === 'night' ? 0.55 : 0.95) * dusk, roughness: 1 }), [doorX, doorH / 2, backZ - 0.2]);
    const alu = flat('#b9bcbd', { metalness: 0.7, roughness: 0.35 });
    s.box([doorW + 0.16, 0.1, 0.34], [doorX, doorH + 0.05, backZ - 0.12], alu);
    s.box([doorW + 0.16, 0.06, 0.4], [doorX, 0.03, backZ - 0.1], alu);
    for (const x of [doorL - 0.04, doorR + 0.04]) s.box([0.08, doorH, 0.34], [x, doorH / 2, backZ - 0.12], alu);
    const pane = (x: number, z: number) => {
      const group = new Sculpture(context);
      const w = doorW / 2 + 0.06;
      for (const side of [-1, 1]) group.box([0.08, doorH - 0.08, 0.05], [side * (w / 2 - 0.04), doorH / 2, 0], alu);
      for (const y of [0.09, doorH - 0.09]) group.box([w, 0.08, 0.05], [0, y, 0], alu);
      const sheet = group.mesh(new THREE.PlaneGeometry(w - 0.14, doorH - 0.22), new THREE.MeshStandardMaterial({ color: '#cfe0e2', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), [0, doorH / 2, 0]);
      sheet.castShadow = false;
      group.box([0.03, 0.34, 0.07], [-w / 2 + 0.09, 1.55, 0.04], black);
      group.root.position.set(x, 0, z);
      s.root.add(group.root);
      return group.root;
    };
    pane(doorX + doorW / 4, backZ - 0.14);
    pane(doorX - doorW / 4 + (a.door === 'open' ? doorW * mix(0.3, 0.45, random()) : 0), backZ - 0.06);
    const drapeMap = paint(256, 64, (ctx, w, h) => { const bands = a.carpet === 'avocado' ? ['#c9a43a', '#8a8a3a', '#e6d8a8', '#6b5a2c'] : ['#d9772b', '#e2b23a', '#efe0b8', '#8a4a22']; for (let x = 0; x < w; x += 16) { ctx.fillStyle = bands[(x / 16) % bands.length]; ctx.fillRect(x, 0, 16, h); } });
    drapeMap.wrapS = THREE.RepeatWrapping;
    const drapeMat = (lit: number) => new THREE.MeshStandardMaterial({ map: drapeMap, roughness: 1, side: THREE.DoubleSide, emissive: glowTone, emissiveIntensity: lit });
    const drapeZ = backZ + 0.14, rodY = doorH + 0.3;
    if (a.door !== 'blinds') {
      s.rod([doorL - 0.5, rodY, drapeZ], [doorR + 0.5, rodY, drapeZ], 0.03, brass);
      for (const x of [doorL - 0.5, doorR + 0.5]) s.ball([0.07, 0.07, 0.07], [x, rodY, drapeZ], brass, 10);
      if (a.door === 'drawn') s.mesh(pleated(doorW + 0.7, rodY - 0.06, 16, 0.07), drapeMat(0.32 * dusk), [doorX, (rodY - 0.06) / 2 + 0.06, drapeZ]);
      else for (const [x, w] of [[doorL - 0.12, 0.62], [doorR + 0.12, 0.62]]) { const side = s.mesh(pleated(w, rodY - 0.06, 5, 0.07), drapeMat(0.05), [x, (rodY - 0.06) / 2 + 0.06, drapeZ]); side.geometry.scale(1, 1, 1); s.ring(w / 2 + 0.02, 0.02, [x, 1.5, drapeZ], brass).rotation.x = Math.PI / 2; }
    } else {
      s.box([doorW + 0.3, 0.12, 0.14], [doorX, doorH + 0.14, drapeZ], flat('#e6dfcc'));
      const slat = flat('#e9e2cf', { roughness: 0.8, emissive: glowTone, emissiveIntensity: 0.3 * dusk, side: THREE.DoubleSide });
      const turn = -mix(0.55, 0.85, random());
      for (let x = doorL - 0.05; x <= doorR + 0.06; x += 0.24) { const blind = s.box([0.17, doorH - 0.02, 0.012], [x, (doorH + 0.08) / 2, drapeZ], slat); blind.rotation.y = turn + (random() < mood.wear * 0.25 ? 0.6 : 0); }
    }
    // Light from the door lying across the carpet.
    const spill = new THREE.Shape();
    spill.moveTo(doorL, backZ + 0.2); spill.lineTo(doorR, backZ + 0.2); spill.lineTo(doorR - 1.6, backZ + 5.2); spill.lineTo(doorL - 2.4, backZ + 5.2); spill.closePath();
    const strength = { shut: 0.3, open: 0.34, drawn: 0.1, blinds: 0.2 }[a.door] * (a.outside === 'night' ? 0.4 : 1) * dusk;
    const light = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshBasicMaterial({ color: glowTone, transparent: true, opacity: strength, depthWrite: false, side: THREE.DoubleSide }), [0, 0.2, 0]);
    light.rotation.x = Math.PI / 2;
    light.castShadow = false;

    // The pit: shag tufts, and a raised wooden surround on the two open sides with a step down.
    const ledgeH = 0.5;
    const tufts = 3400, shag = new THREE.InstancedMesh(new THREE.ConeGeometry(0.075, 0.2, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    for (let i = 0; i < tufts; i++) {
      const x = -6.7 + random() * 12.7, z = -5.2 + random() * 9.7;
      dummy.position.set(x, 0.06, z);
      const stripe = a.state === 'tidy' ? (Math.floor((x + z * 0.35 + 20) / 1.1) % 2 ? 0.5 : -0.5) : 0;
      dummy.rotation.set((random() - 0.5) * 0.9 + stripe * 0.5, random() * 3, (random() - 0.5) * 0.9 + stripe);
      dummy.scale.setScalar(0.7 + random() * 0.7);
      dummy.updateMatrix();
      shag.setMatrixAt(i, dummy.matrix);
      shag.setColorAt(i, tint.copy(carpetTone).multiplyScalar(mix(0.78, 1.18, random()) * (1 + stripe * 0.16)));
    }
    shag.receiveShadow = true;
    s.root.add(shag);
    const parquet = flat('#8a5a34', { roughness: 0.45 });
    multi([14, ledgeH, 1.0], [0, ledgeH / 2, 5.0], [plain, plain, parquet, plain, plain, panel(14)]);
    multi([1.0, ledgeH, 10.0], [6.5, ledgeH / 2, -0.5], [plain, panel(10), parquet, plain, plain, plain]);
    s.box([14, 0.05, 0.08], [0, ledgeH + 0.01, 4.5], trim);
    s.box([0.08, 0.05, 10.0], [6.0, ledgeH + 0.01, -0.5], trim);
    s.box([2.0, ledgeH / 2, 0.7], [4.2, ledgeH / 4, 4.15], flat(carpetTone.clone().multiplyScalar(0.9), { roughness: 1 }));
    for (let i = 0; i < mood.wear * 7; i++) { const stain = s.mesh(new THREE.CircleGeometry(0.3 + random() * 0.5, 14), new THREE.MeshBasicMaterial({ color: '#2a1c12', transparent: true, opacity: 0.22, depthWrite: false }), [-5.5 + random() * 10.5, 0.19, -3 + random() * 7]); stain.rotation.x = -Math.PI / 2; stain.scale.y = 0.6 + random() * 0.5; stain.castShadow = false; }

    // The panelled wall: art, or the bare hooks left when it is being packed.
    const hang = new Sculpture(context);
    hang.root.position.set(leftX + 0.01, 3.3, 0.1);
    hang.root.rotation.y = Math.PI / 2;
    s.root.add(hang.root);
    if (a.state === 'moving') {
      hang.mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, depthWrite: false }), [0, 0, 0.004]).castShadow = false;
      for (const x of [-0.5, 0.5]) hang.ball([0.025, 0.025, 0.025], [x, 0.45, 0.02], black, 6);
    } else if (a.wall === 'sunburst') {
      hang.cylinder(0.3, 0.3, 0.08, [0, 0, 0.05], brass, 24).rotation.x = Math.PI / 2;
      hang.cylinder(0.24, 0.24, 0.085, [0, 0, 0.052], flat('#3a2618'), 24).rotation.x = Math.PI / 2;
      hang.rod([0, 0, 0.1], [0.1, 0.14, 0.1], 0.012, brass); hang.rod([0, 0, 0.1], [-0.16, 0.02, 0.1], 0.012, brass);
      for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2, reach = i % 2 ? 0.72 : 1.02; hang.rod([Math.cos(t) * 0.3, Math.sin(t) * 0.3, 0.04], [Math.cos(t) * reach, Math.sin(t) * reach, 0.04], i % 2 ? 0.012 : 0.02, i % 2 ? brass : flat('#5a3620'), 0.004); }
    } else if (a.wall === 'landscape') {
      const lake = paint(256, 144, (ctx, w, h) => { const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#8fb0c0'); sky.addColorStop(0.55, '#e9d2a0'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6a7a8a'; ctx.beginPath(); ctx.moveTo(0, 84); ctx.lineTo(60, 30); ctx.lineTo(110, 76); ctx.lineTo(160, 22); ctx.lineTo(w, 84); ctx.fill(); ctx.fillStyle = '#eef1f0'; ctx.beginPath(); ctx.moveTo(160, 22); ctx.lineTo(146, 40); ctx.lineTo(176, 40); ctx.fill(); ctx.fillStyle = '#4f7a86'; ctx.fillRect(0, 84, w, 30); ctx.fillStyle = '#3a4a2a'; ctx.fillRect(0, 112, w, 32); for (let i = 0; i < 10; i++) { const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 70 + random() * 20); ctx.lineTo(x - 9, 118); ctx.lineTo(x + 9, 118); ctx.fill(); } });
      framed(hang, [0, 0, 0], 2.2, 1.24, lake, gilt);
    } else if (a.wall === 'guns') {
      for (const x of [-0.8, 0.8]) { hang.box([0.12, 1.1, 0.06], [x, 0, 0.03], trim); for (const y of [0.3, -0.25]) hang.box([0.1, 0.05, 0.22], [x, y - 0.06, 0.12], trim); }
      for (const y of [0.3, -0.25]) { hang.rod([-1.2, y, 0.16], [-0.3, y + 0.04, 0.16], 0.05, flat('#5a3620', { roughness: 0.4 }), 0.035); hang.rod([-0.3, y + 0.04, 0.16], [1.35, y + 0.04, 0.16], 0.02, flat('#2a2a2e', { metalness: 0.7, roughness: 0.35 })); hang.box([0.3, 0.05, 0.05], [-0.15, y + 0.02, 0.16], flat('#2a2a2e', { metalness: 0.7 })); }
    } else if (a.wall === 'beer') {
      const sign = paint(256, 128, (ctx, w, h) => { ctx.fillStyle = '#1f3a6a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c2202f'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 110, 46, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6d8'; ctx.font = 'italic bold 44px serif'; ctx.textAlign = 'center'; ctx.fillText('Cold Beer', w / 2, h / 2 + 14); ctx.strokeStyle = '#e2b23a'; ctx.lineWidth = 5; ctx.strokeRect(5, 5, w - 10, h - 10); });
      hang.box([2.1, 1.1, 0.2], [0, 0, 0.1], black);
      hang.mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: sign, emissiveMap: sign, emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.4 }), [0, 0, 0.204]);
      hang.rod([0.9, -0.55, 0.1], [0.95, -1.5, 0.05], 0.012, black);
    } else {
      const spots: [number, number, number][] = [[-0.8, 0.3, 0.42], [-0.25, 0.42, 0.5], [0.4, 0.3, 0.44], [0.95, 0.38, 0.36], [-0.6, -0.36, 0.4], [0.05, -0.34, 0.46], [0.7, -0.36, 0.42]];
      for (const [i, [x, y, w]] of spots.entries()) framed(hang, [x + (random() - 0.5) * 0.06, y, 0], w, w * 1.25, portrait(random() * 360), i % 2 ? gilt : trim);
    }
    // A swag lamp on a chain in the near corner of the panelled wall.
    const lampAt: P3 = [leftX + 0.9, 2.9, 4.0];
    s.rod([leftX, 4.1, 4.0], [leftX + 0.9, 4.1, 4.0], 0.025, brass);
    s.rod([leftX + 0.9, 4.1, 4.0], [lampAt[0], lampAt[1] + 0.3, lampAt[2]], 0.012, brass);
    const shade = new THREE.Color().setHSL(mix(0.06, 0.12, mood.cheer), 0.85, 0.55);
    s.ball([0.38, 0.34, 0.38], lampAt, new THREE.MeshStandardMaterial({ color: shade, emissive: shade, emissiveIntensity: 1.1, roughness: 0.3 }), 18);
    s.cylinder(0.14, 0.2, 0.1, [lampAt[0], lampAt[1] + 0.32, lampAt[2]], brass, 14);
    s.cylinder(0.12, 0.08, 0.08, [lampAt[0], lampAt[1] - 0.34, lampAt[2]], brass, 14);

    // The raised surround.
    const rightX = 6.5;
    if (a.ledge === 'cushions') {
      const stripes = paint(64, 64, (ctx, w, h) => { ['#b8502a', '#e2a62a', '#6a3a20', '#e6d8b4'].forEach((tone, i) => { ctx.fillStyle = tone; ctx.fillRect(0, i * h / 4, w, h / 4); }); });
      const cloth = new THREE.MeshStandardMaterial({ map: stripes, roughness: 1 });
      for (let i = 0; i < 5; i++) { s.box([0.92, 0.2, 1.7], [rightX, ledgeH + 0.1, -4.4 + i * 1.8], cloth); if (random() < 0.75) { const pillow = s.ball([0.34, 0.2, 0.34], [rightX + 0.1, ledgeH + 0.38, -4.4 + i * 1.8 + (random() - 0.5) * 0.8], flat(['#b8502a', '#e2a62a', '#6f7a32', '#6a3a20'][i % 4], { roughness: 1 }), 12); pillow.rotation.z = (random() - 0.5) * 0.8; } }
      for (let i = 0; i < 3; i++) s.box([1.9, 0.2, 0.92], [-5.6 + i * 2.0, ledgeH + 0.1, 5.0], cloth);
    } else if (a.ledge === 'plants') {
      const leafy = flat(new THREE.Color('#3f7a36').lerp(new THREE.Color('#8a7a3a'), mood.wear * 0.6), { roughness: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) {
        const along = i < 3, x = along ? rightX : -5.2 + (i - 3) * 2.6 + random(), z = along ? -3.8 + i * 2.7 + random() * 0.6 : 5.0, size = mix(0.7, 1.15, random());
        s.cylinder(0.3 * size, 0.22 * size, 0.42 * size, [x, ledgeH + 0.21 * size, z], flat(['#a8643a', '#c9a878', '#5a3a24'][i % 3], { roughness: 0.8 }), 12);
        if (i % 2) for (let k = 0; k < 14; k++) { const t = k / 14 * 6.3, reach = (0.5 + random() * 0.4) * size; const frond = s.ball([reach * 0.5, 0.02, 0.09 * size], [x + Math.cos(t) * reach * 0.45, ledgeH + (0.5 + random() * 0.2) * size, z + Math.sin(t) * reach * 0.45], leafy, 6); frond.rotation.y = -t; frond.rotation.z = -0.5; }
        else { s.rod([x, ledgeH + 0.4 * size, z], [x + 0.05, ledgeH + 1.9 * size, z], 0.03, flat('#4a3a24')); for (let k = 0; k < 9; k++) { const t = k * 2.4, y = ledgeH + (0.7 + k * 0.14) * size; const blade = s.ball([0.3 * size, 0.02, 0.16 * size], [x + Math.cos(t) * 0.26 * size, y, z + Math.sin(t) * 0.26 * size], leafy, 8); blade.rotation.y = -t; blade.rotation.z = 0.5; } }
      }
    } else if (a.ledge === 'shelf') {
      const spine = ['#7a1f24', '#1f3a5a', '#2f5a3a', '#c9a04a', '#5a3a22', '#e6dcc0'];
      let z = -4.6;
      while (z < 3.8) { const w = 0.08 + random() * 0.1, tall = 0.5 + random() * 0.26, run = random() < 0.12; s.box([0.5, tall, w], [rightX + 0.1, ledgeH + tall / 2, z + w / 2], flat(run ? '#7a1f24' : spine[Math.floor(random() * spine.length)], { roughness: 0.6 })); z += w + 0.004 + (random() < 0.06 ? 0.5 : 0); }
      for (const z2 of [-5.2, 4.3]) { s.box([0.6, 0.95, 0.5], [rightX, ledgeH + 0.475, z2], flat('#5a3a22')); s.box([0.02, 0.8, 0.4], [rightX - 0.305, ledgeH + 0.475, z2], flat('#2a2622')); s.cylinder(0.14, 0.14, 0.02, [rightX - 0.32, ledgeH + 0.36, z2], flat('#4a4640'), 14).rotation.z = Math.PI / 2; }
    }

    // What the room has been through.
    const zoneF = (): [number, number] => [fx - 1.5 + random() * 3.6, backZ + 1.9 + random() * 0.9];
    if (a.state === 'lived') {
      const news = paint(128, 96, (ctx, w, h) => { ctx.fillStyle = '#e6e0cc'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2b2a28'; ctx.fillRect(8, 6, w - 16, 14); ctx.fillStyle = '#77736b'; ctx.fillRect(8, 28, 50, 34); for (let y = 28; y < h - 6; y += 6) ctx.fillRect(66, y, 54, 3); for (let y = 68; y < h - 6; y += 6) ctx.fillRect(8, y, 50, 3); });
      const paper = new THREE.MeshStandardMaterial({ map: news, roughness: 0.9 });
      for (let i = 0; i < 2 + Math.floor(mood.density * 3); i++) { const [x, z] = zoneF(); multi([0.9, 0.03, 0.66], [x, 0.2 + i * 0.03, z], [plain, plain, paper, plain, plain, plain]).rotation.y = random() * 3; }
      for (const side of [0, 1]) { const slipper = s.ball([0.14, 0.08, 0.3], [fx + 1.2 + side * 0.32, 0.24, backZ + 2.4 + side * 0.1], flat('#5a2a2a', { roughness: 1 }), 10); slipper.rotation.y = 0.3 + side * 0.25; }
      for (const [i, x] of [-3.2, 0.7].entries()) { const cushion = s.cylinder(0.7, 0.7, 0.26, [fx + x, 0.3, backZ + 2.5 + i * 0.3], flat(['#8a4a22', '#b8802a'][i], { roughness: 1 }), 18); cushion.rotation.z = (random() - 0.5) * 0.1; }
      for (let i = 0; i < 2 + Math.floor(mood.density * 5); i++) s.cylinder(0.09, 0.09, 0.32, [fx + 1.0 + random() * 0.7, hearthTop + 0.16, backZ + 1.3 + random() * 0.2], flat(['#c9ccd0', '#c2202f', '#e2b23a'][i % 3], { metalness: 0.6, roughness: 0.3 }), 10);
    } else if (a.state === 'party') {
      const cups = 10 + Math.floor(mood.density * 14);
      for (let i = 0; i < cups; i++) { const onRight = random() < 0.4, x = onRight ? rightX - 0.25 + random() * 0.2 : -6 + random() * 11.5, z = onRight ? -4 + random() * 8 : 4.7 + random() * 0.2, tipped = random() < 0.25; const cup = s.cylinder(0.11, 0.08, 0.26, [x, ledgeH + (tipped ? 0.1 : 0.13), z], flat(i % 3 ? '#c2202f' : '#efe9dc', { roughness: 0.5 }), 10); if (tipped) cup.rotation.z = Math.PI / 2; }
      for (let i = 0; i < 5; i++) s.lathe([[0, 0], [0.1, 0], [0.1, 0.42], [0.04, 0.58], [0.04, 0.74], [0, 0.74]], flat(['#2f4a22', '#5a3516', '#3a5a4a'][i % 3], { roughness: 0.2 }), [fx - 0.9 + i * 0.3 + random() * 0.1, hearthTop, backZ + 1.3 + random() * 0.15]);
      for (let i = 0; i < 4 + Math.floor(mood.cheer * 4); i++) { const [x, z] = i < 3 ? zoneF() : [4.6 + random() * 1.0, -4.4 + random() * 0.8]; const tone = ['#d9342a', '#e2b23a', '#3a7ac2', '#e86aa0', '#4aa85a'][i % 5]; s.ball([0.36, 0.42, 0.36], [x, 0.56, z], flat(tone, { roughness: 0.25, emissive: tone, emissiveIntensity: 0.12 }), 14); }
      for (let i = 0; i < 4; i++) { const [x, z] = zoneF(); const tone = ['#d9772b', '#3d2a4c', '#2f6f6a', '#e2b23a'][i]; const sleeve = s.box([0.9, 0.02, 0.9], [x, 0.21 + i * 0.02, z], flat(tone, { roughness: 0.6 })); sleeve.rotation.y = random() * 3; s.cylinder(0.3, 0.3, 0.004, [x, 0.224 + i * 0.02, z], flat(['#f0e3c0', '#c23b2a'][i % 2]), 18); }
      s.tube([[fx - 2.3, mantelY - 0.02, breastZ + 0.6], [fx - 1.1, mantelY - 0.5, breastZ + 0.66], [fx, mantelY - 0.06, breastZ + 0.6], [fx + 1.1, mantelY - 0.5, breastZ + 0.66], [fx + 2.3, mantelY - 0.02, breastZ + 0.6]], 0.035, flat('#e86aa0', { roughness: 0.8 }));
    } else if (a.state === 'moving') {
      const card = flat('#b08b5a', { roughness: 0.95 }), tape = flat('#d6c59a');
      const crate = (x: number, y: number, z: number, w: number, h: number, d: number) => { const turn = (random() - 0.5) * 0.4; s.box([w, h, d], [x, y + h / 2, z], card).rotation.y = turn; s.box([w + 0.01, 0.012, d * 0.2], [x, y + h + 0.004, z], tape).rotation.y = turn; };
      crate(5.0, 0, -4.2, 1.1, 0.8, 0.9); crate(5.05, 0.8, -4.2, 0.9, 0.6, 0.8); crate(4.9, 1.4, -4.25, 0.6, 0.45, 0.6);
      for (let i = 0; i < 2 + Math.floor(mood.density * 3); i++) crate(-5.5 + i * 2.2 + random() * 0.5, ledgeH, 5.0, 0.9 + random() * 0.3, 0.5 + random() * 0.3, 0.7);
      crate(rightX, ledgeH, 1.5 + random(), 0.7, 0.6, 1.0);
      const roll = s.cylinder(0.24, 0.24, 3.0, [fx + 0.6, 0.42, backZ + 2.3], flat('#8a5a3a', { roughness: 1 }), 14);
      roll.rotation.z = Math.PI / 2;
      roll.rotation.y = 0.12;
      for (const x of [-0.9, 0.9]) s.ring(0.25, 0.02, [fx + 0.6 + x, 0.42, backZ + 2.3 - x * 0.12], flat('#d6c59a')).rotation.y = Math.PI / 2 + 0.12;
    }

    // Haze in layers under where the ceiling would be.
    const hazes: THREE.Mesh[] = [];
    if (a.haze) {
      const cloud = paint(256, 256, (ctx, w, h) => { for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h, r = 30 + random() * 60; const puff = ctx.createRadialGradient(x, y, 2, x, y, r); puff.addColorStop(0, 'rgba(255,255,255,0.5)'); puff.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = puff; ctx.fillRect(0, 0, w, h); } });
      for (let i = 0; i < 3; i++) {
        const layer = s.mesh(new THREE.PlaneGeometry(11, 8.5), new THREE.MeshBasicMaterial({ map: cloud, color: '#cfd3dc', transparent: true, opacity: mix(0.1, 0.18, mood.wear), depthWrite: false, side: THREE.DoubleSide }), [-0.2 + i * 0.5, 2.7 + i * 0.45, -0.4]);
        layer.rotation.x = -Math.PI / 2;
        layer.rotation.z = i * 1.3;
        layer.castShadow = false;
        hazes.push(layer);
      }
    }

    const flicker = mix(5, 14, mood.energy), drift = mix(0.01, 0.06, mood.energy), base = fireLight ? fireLight.intensity : 0;
    world.update = (_dt, time) => {
      flames.forEach((flame, i) => { flame.scale.y = 1 + Math.sin(time * flicker + i * 1.7) * 0.22 + Math.sin(time * flicker * 0.43 + i) * 0.12; flame.scale.x = 1 + Math.sin(time * flicker * 0.7 + i * 2.3) * 0.15; });
      if (fireLight) fireLight.intensity = base * (1 + Math.sin(time * flicker * 0.8) * 0.12);
      hazes.forEach((layer, i) => { layer.rotation.z = i * 1.3 + time * drift * (i % 2 ? -1 : 1); });
    };
    return world;
  },
});

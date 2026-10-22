import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

function paint(w: number, h: number, draw: (c: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    door: choice('What kind of door is it?', {
      sectional: 'White insulated sectional panels with a row of small windows.',
      slatted: 'A galvanised steel roller shutter of narrow slats.',
      painted: 'A roller shutter painted in the company colour, streaked and chipped.',
      translucent: 'Ribbed fibreglass panels that glow faintly from the light inside.',
    }),
    opening: score('How far is the door raised?', ['Shut tight', 'Cracked open a hand, light under it', 'Half raised', 'Rolled fully open']),
    inside: choice('What is behind it?', {
      dark: 'Darkness: an unlit void.',
      warm: 'A warmly lit warehouse with stacked pallets.',
      cold: 'A cold blue-white chill store breathing mist.',
      figure: 'A lit bay with one person standing in it, waiting.',
      wall: 'Goods stacked right up to the threshold, floor to ceiling.',
    }),
    number: choice('What is the bay numbered?', {
      low: 'A single digit: one of the first few bays.',
      teens: 'A number in the teens or twenties, the middle of a long row.',
      high: 'A high number: bay sixty-something of a vast shed.',
      letter: 'A letter, not a number.',
      gone: 'Nothing readable: the number has been painted over.',
    }),
    signal: choice('What does the traffic light show?', {
      red: 'Red: do not pull away, the trailer is being worked.',
      green: 'Green: clear to go.',
      dead: 'Dead and dark, hanging slightly askew.',
    }),
    wall: choice('What is the wall made of?', {
      cladding: 'Ribbed metal cladding, a modern distribution shed.',
      brick: 'Red brick, an old depot or brewery.',
      block: 'Grey concrete block, cheap and blunt.',
      render: 'Painted render, the back of a supermarket.',
    }),
    gear: choice('What dock equipment does it have?', {
      bumpers: 'Only the two rubber bumpers.',
      shelter: 'A black padded dock shelter around the door to seal against trailers.',
      leveller: 'A steel dock leveller plate with its lip folded over the edge.',
      steps: 'A short steel stair with a yellow handrail up to the dock.',
    }),
    left: choice('What has been left here?', {
      nothing: 'Nothing.',
      notice: 'A paper notice taped up: NO DELIVERIES AFTER 4.',
      graffiti: 'A spray-paint tag across the dock face.',
      cones: 'Two traffic cones and a wheel chock on the apron.',
      pigeons: 'Pigeons roosting along the top of the wall.',
      vest: 'A mug and a hi-vis vest on the dock edge: someone on a break.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const WALL_W = 4.4, DOCK = 1.2, TOP = 5.0, HALF = 1.35, HEAD = DOCK + 3.0, T = 0.35;
    const dark = s.material('#1c1e21', { roughness: 0.8 });
    const steel = s.material('#868c8f', { metalness: 0.75, roughness: 0.4 });
    const yellow = s.material('#e9b21a', { roughness: 0.6 });

    // Wall.
    const tint = { cladding: mood.warmth > 0.6 ? '#c9c2ac' : mood.cheer > 0.6 ? '#8fb0c2' : '#929da5', brick: '#a8583f', block: '#a9a8a0', render: mood.cheer > 0.5 ? '#e6dcc2' : '#cbc6b8' }[a.wall];
    const wallTexture = paint(256, 256, (c) => {
      c.fillStyle = tint; c.fillRect(0, 0, 256, 256);
      if (a.wall === 'cladding') for (let x = 0; x < 256; x += 32) { c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x, 0, 5, 256); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x + 5, 0, 4, 256); c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(x + 16, 0, 2, 256); }
      else if (a.wall === 'brick') {
        for (let row = 0; row < 12; row++) for (let i = -1; i < 4; i++) {
          c.fillStyle = `rgba(${random() < 0.5 ? '60,20,10' : '255,200,160'},${random() * 0.22})`;
          c.fillRect(i * 64 + (row % 2) * 32 + 2, row * 21.33 + 2, 60, 18);
        }
        c.fillStyle = 'rgba(225,215,195,0.75)';
        for (let row = 0; row < 12; row++) { c.fillRect(0, row * 21.33, 256, 2.5); for (let i = 0; i < 5; i++) c.fillRect(i * 64 + (row % 2) * 32, row * 21.33, 2.5, 21.33); }
      } else if (a.wall === 'block') {
        c.fillStyle = 'rgba(60,60,55,0.5)';
        for (let row = 0; row < 4; row++) { c.fillRect(0, row * 64, 256, 3); for (let i = 0; i < 3; i++) c.fillRect(i * 128 + (row % 2) * 64, row * 64, 3, 64); }
        for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${random() * 0.07})`; c.fillRect(random() * 256, random() * 256, 20, 12); }
      } else for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${random() * 0.06})`; c.beginPath(); c.arc(random() * 256, random() * 256, 10 + random() * 30, 0, 7); c.fill(); }
      for (let i = 0; i < wear * 14; i++) { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `rgba(50,35,20,${0.1 + wear * 0.3})`); g.addColorStop(1, 'rgba(50,35,20,0)'); c.fillStyle = g; c.fillRect(random() * 256, 0, 3 + random() * 12, 256); }
    });
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    const tile = a.wall === 'block' ? 0.8 : 1;
    const wallPiece = (w: number, h: number, at: P3) => {
      const texture = wallTexture.clone();
      texture.repeat.set(w / tile, h / tile);
      texture.needsUpdate = true;
      return s.box([w, h, T], at, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: a.wall === 'cladding' ? 0.25 : 0 }));
    };
    const pierW = (WALL_W - HALF * 2) / 2;
    for (const x of [-1, 1]) wallPiece(pierW, TOP - DOCK, [x * (HALF + pierW / 2), (TOP + DOCK) / 2, -T / 2]);
    wallPiece(HALF * 2, TOP - HEAD, [0, (TOP + HEAD) / 2, -T / 2]);
    s.box([WALL_W + 0.08, 0.07, T + 0.1], [0, TOP + 0.035, -T / 2], s.material('#4a4f54', { metalness: 0.5, roughness: 0.5 }));
    if (a.wall === 'render') {
      const band = s.material(mood.cheer > 0.5 ? '#2a62ad' : '#5a6068', { roughness: 0.8 });
      for (const x of [-1, 1]) s.box([pierW + 0.006, 0.55, T + 0.006], [x * (HALF + pierW / 2 + 0.003), DOCK + 0.275, -T / 2], band);
    }
    // Stub of building behind, so the open door has somewhere to lead.
    const ROOM = 1.3;
    const shell = s.material('#3b3f44', { roughness: 0.9 });
    const zc = -T - ROOM / 2 + 0.02;
    s.box([HALF * 2 + 0.3, HEAD - DOCK + 0.15, 0.08], [0, (HEAD + DOCK) / 2 + 0.075, -T - ROOM + 0.06], shell);
    for (const x of [-1, 1]) s.box([0.15, HEAD - DOCK + 0.15, ROOM], [x * (HALF + 0.076), (HEAD + DOCK) / 2 + 0.075, zc], shell);
    s.box([HALF * 2 + 0.3, 0.15, ROOM], [0, HEAD + 0.076, zc], shell);
    s.box([WALL_W, DOCK, ROOM], [0, DOCK / 2, -T - ROOM / 2 + 0.02], s.material('#8f8c83', { roughness: 0.95 }));

    // Dock: concrete face, yellow-striped lip, rubber bumpers.
    const concrete = s.material('#aaa79d', { roughness: 0.95 });
    s.box([WALL_W, DOCK, T + 0.28], [0, DOCK / 2, -T / 2 + 0.14], concrete);
    for (const y of [0.4, 0.8]) s.box([WALL_W, 0.012, 0.004], [0, y, 0.281], s.material('#8f8c83'));
    const hazard = paint(256, 32, (c) => {
      c.fillStyle = '#eab71c'; c.fillRect(0, 0, 256, 32);
      c.fillStyle = '#1c1e21';
      for (let x = -32; x < 256; x += 64) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 32); c.fill(); }
      for (let i = 0; i < wear * 30; i++) { c.fillStyle = 'rgba(150,145,135,0.8)'; c.fillRect(random() * 256, random() * 32, 4 + random() * 14, 2 + random() * 5); }
    });
    hazard.wrapS = THREE.RepeatWrapping;
    hazard.repeat.set(5, 1);
    s.box([WALL_W + 0.01, 0.14, 0.03], [0, DOCK - 0.07, 0.29], new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.7 }));
    s.box([WALL_W, 0.012, 0.1], [0, DOCK + 0.004, 0.23], yellow);
    const rubber = s.material('#17181a', { roughness: 0.95 });
    for (const x of [-1.72, 1.72]) {
      s.box([0.3, 0.55, 0.13], [x, DOCK - 0.42, 0.345], rubber);
      for (let i = 0; i < 4; i++) s.box([0.31, 0.012, 0.135], [x, DOCK - 0.62 + i * 0.13, 0.345], s.material('#2c2e31'));
      for (const y of [-0.2, 0.2]) s.cylinder(0.02, 0.02, 0.02, [x, DOCK - 0.42 + y, 0.415], steel, 8).rotation.x = Math.PI / 2;
    }

    // Interior.
    const gap = 3.0 * (a.opening < 1 / 3 ? mix(0, 0.07, a.opening * 3) : a.opening < 2 / 3 ? mix(0.07, 0.5, a.opening * 3 - 1) : mix(0.5, 0.97, a.opening * 3 - 2));
    const glowHex = { dark: '#0d0e11', warm: '#f6c56c', cold: '#bfe4f2', figure: '#f3d089', wall: '#e9c98a' }[a.inside];
    const lit = a.inside !== 'dark';
    const inner = new THREE.MeshBasicMaterial({ color: glowHex, side: THREE.BackSide });
    s.mesh(new THREE.BoxGeometry(HALF * 2, 3.0, ROOM - 0.1), inner, [0, DOCK + 1.5, -T - (ROOM - 0.1) / 2 + 0.2]).castShadow = false;
    const floorIn = s.box([HALF * 2, 0.02, ROOM], [0, DOCK + 0.011, -T / 2 - ROOM / 2 + 0.3], new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color(glowHex).multiplyScalar(0.72) : new THREE.Color('#0d0e11') }));
    floorIn.castShadow = false;
    const shade = (hex: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(lit ? 1 : 0.18) });
    if (a.inside === 'warm' || a.inside === 'dark' || a.inside === 'cold') {
      const tones = a.inside === 'cold' ? ['#6f8fa3', '#8fb0c2', '#57778c'] : ['#8a6238', '#a67c48', '#6f4d2a'];
      for (const x of [-0.85, 0.85]) {
        const layers = 2 + Math.floor(random() * 4);
        for (let i = 0; i < layers; i++) s.box([0.85 - random() * 0.1, 0.42, 0.5], [x + (random() - 0.5) * 0.08, DOCK + 0.23 + i * 0.43, -T - 0.75], shade(tones[Math.floor(random() * 3)])).castShadow = false;
      }
    } else if (a.inside === 'wall') {
      const tones = ['#b98a55', '#c79a63', '#ad8250', '#9c7444', '#d2aa72'];
      for (let ix = 0; ix < 5; ix++) for (let iy = 0; iy < 7; iy++) s.box([0.5, 0.4, 0.3], [-1.08 + ix * 0.54 + (random() - 0.5) * 0.03, DOCK + 0.22 + iy * 0.415, -T - 0.12 + (random() - 0.5) * 0.05], shade(tones[Math.floor(random() * 5)])).castShadow = false;
    } else {
      const body = shade('#22201e');
      const px = (random() - 0.5) * 1.2;
      for (const x of [-0.09, 0.09]) s.cylinder(0.07, 0.06, 0.85, [px + x, DOCK + 0.44, -T - 0.25], body, 8).castShadow = false;
      s.cylinder(0.2, 0.17, 0.62, [px, DOCK + 1.16, -T - 0.25], body, 10).castShadow = false;
      s.ball([0.11, 0.125, 0.11], [px, DOCK + 1.62, -T - 0.25], body, 12).castShadow = false;
      for (const x of [-1, 1]) s.rod([px + x * 0.2, DOCK + 1.42, -T - 0.25], [px + x * 0.27, DOCK + 0.85, -T - 0.22], 0.045, body).castShadow = false;
      s.box([0.7, 0.5, 0.4], [px > 0 ? -0.9 : 0.9, DOCK + 0.27, -T - 0.7], shade('#8a6238')).castShadow = false;
    }
    // Light spilling out over the lip and the apron.
    if (lit && gap > 0.02) {
      const spillTexture = paint(64, 64, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 64, 64);
        const side = c.createLinearGradient(0, 0, 64, 0);
        side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.2, 'rgba(0,0,0,0)'); side.addColorStop(0.8, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
        c.globalCompositeOperation = 'destination-out'; c.fillStyle = side; c.fillRect(0, 0, 64, 64);
      });
      const strength = mix(0.25, 0.75, dusk) * Math.min(1, 0.45 + gap / 2);
      const spill = new THREE.MeshBasicMaterial({ map: spillTexture, color: glowHex, transparent: true, opacity: strength, depthWrite: false });
      const reach = 1.0 + gap * 0.6;
      const pool = s.mesh(new THREE.PlaneGeometry(HALF * 2 + 1, reach), spill, [0, 0.012, 0.28 + reach / 2]);
      pool.rotation.x = -Math.PI / 2;
      pool.castShadow = pool.receiveShadow = false;
      const lip = s.mesh(new THREE.PlaneGeometry(HALF * 2, 0.5), spill, [0, DOCK + 0.013, 0.03]);
      lip.rotation.x = -Math.PI / 2;
      lip.castShadow = lip.receiveShadow = false;
    }
    if (a.inside === 'cold' && gap > 0.05) {
      const mist = new THREE.MeshBasicMaterial({ color: '#eaf6fa', transparent: true, opacity: 0.2, depthWrite: false });
      for (let i = 0; i < 6; i++) {
        const puff = s.ball([0.5 + random() * 0.5, 0.18 + random() * 0.15, 0.3 + random() * 0.3], [(random() - 0.5) * 2.2, DOCK + 0.1 - random() * 0.5, 0.2 + random() * 0.5], mist, 12);
        puff.castShadow = puff.receiveShadow = false;
      }
    }

    // The door itself: a plane cropped from the top as it rolls up.
    const doorHex = { sectional: '#e4e3dc', slatted: '#aeb5b8', painted: mood.cheer > 0.6 ? '#2e7d5b' : mood.warmth > 0.5 ? '#a9372c' : '#2a62ad', translucent: '#d9d6b8' }[a.door];
    const doorTexture = paint(256, 512, (c) => {
      c.fillStyle = doorHex; c.fillRect(0, 0, 256, 512);
      if (a.door === 'sectional') {
        for (let i = 0; i < 5; i++) {
          const y = i * 102.4;
          c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(0, y, 256, 4);
          c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, y + 4, 256, 3);
          c.fillStyle = 'rgba(0,0,0,0.07)'; for (const r of [34, 68]) c.fillRect(0, y + r, 256, 2);
        }
        for (let i = 0; i < 4; i++) { c.fillStyle = '#2a2d31'; c.fillRect(22 + i * 58, 232, 40, 44); c.fillStyle = lit ? glowHex : '#3d5566'; c.fillRect(26 + i * 58, 236, 32, 36); }
      } else if (a.door === 'translucent') {
        for (let x = 0; x < 256; x += 16) { c.fillStyle = 'rgba(90,85,50,0.22)'; c.fillRect(x, 0, 4, 512); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 6, 0, 3, 512); }
        for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(70,75,80,0.8)'; c.fillRect(0, i * 102.4, 256, 7); }
      } else {
        for (let y = 0; y < 512; y += 16) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, 256, 3); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(0, y + 3, 256, 3); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, y + 11, 256, 5); }
      }
      const streaks = Math.round((a.door === 'painted' ? 6 : 1) + wear * (a.door === 'translucent' ? 6 : 22));
      for (let i = 0; i < streaks; i++) {
        const x = random() * 256, y = random() * 380, len = 40 + random() * 180;
        const g = c.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, `rgba(110,60,25,${0.25 + wear * 0.45})`); g.addColorStop(1, 'rgba(110,60,25,0)');
        c.fillStyle = g; c.fillRect(x, y, 3 + random() * 9, len);
      }
      if (a.door === 'painted') for (let i = 0; i < 16 + wear * 40; i++) { c.fillStyle = 'rgba(175,180,182,0.85)'; c.fillRect(random() * 256, 380 + random() * 132, 3 + random() * 16, 2 + random() * 6); }
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, 256, 3);
    });
    const shown = 3.0 - gap;
    doorTexture.repeat.set(1, shown / 3.0);
    doorTexture.offset.set(0, 0);
    const doorMaterial = new THREE.MeshStandardMaterial({ map: doorTexture, roughness: a.door === 'sectional' ? 0.5 : 0.6, metalness: a.door === 'slatted' ? 0.55 : 0.1 });
    if (a.door === 'translucent' && lit) { doorMaterial.emissive = new THREE.Color(glowHex); doorMaterial.emissiveMap = doorTexture; doorMaterial.emissiveIntensity = mix(0.25, 0.7, dusk); }
    const doorZ = -0.16;
    s.box([HALF * 2, shown, 0.04], [0, HEAD - shown / 2, doorZ], doorMaterial);
    s.box([HALF * 2, 0.07, 0.07], [0, DOCK + gap + 0.035, doorZ], dark);
    s.box([0.3, 0.03, 0.06], [0, DOCK + gap + 0.14, doorZ + 0.04], steel);
    // Guides, lintel trim and the roller hood.
    for (const x of [-1, 1]) {
      s.box([0.09, 3.0, 0.1], [x * (HALF - 0.02), DOCK + 1.5, doorZ + 0.02], steel);
      s.box([0.1, 1.0, 0.02], [x * (HALF + 0.07), DOCK + 0.5, 0.012], new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.7 })).rotation.z = 0;
    }
    if (a.door !== 'sectional') s.box([HALF * 2 + 0.3, 0.36, 0.3], [0, HEAD + 0.18, 0.0], s.material(a.door === 'painted' ? doorHex : '#9aa1a4', { metalness: 0.5, roughness: 0.5 }));
    else s.box([HALF * 2 + 0.16, 0.08, 0.05], [0, HEAD + 0.04, 0.02], steel);

    // Bay number.
    const numberText = a.number === 'low' ? String(1 + Math.floor(random() * 9)) : a.number === 'teens' ? String(10 + Math.floor(random() * 19)) : a.number === 'high' ? String(41 + Math.floor(random() * 58)) : a.number === 'letter' ? 'ABCDEFGH'[Math.floor(random() * 8)] : '';
    const round = random() < 0.4;
    const signTexture = paint(256, 256, (c) => {
      c.clearRect(0, 0, 256, 256);
      if (a.number === 'gone') {
        c.fillStyle = 'rgba(128,128,124,0.92)'; c.fillRect(20 + random() * 20, 40 + random() * 20, 190, 170);
        c.fillStyle = 'rgba(90,90,88,0.25)'; c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(1 + Math.floor(random() * 9)), 128, 136);
        return;
      }
      const ground = mood.cheer > 0.5 ? '#f2c230' : '#f1eee4', ink = '#16181b';
      c.fillStyle = ink;
      if (round) { c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.fillStyle = ground; c.beginPath(); c.arc(128, 128, 110, 0, 7); c.fill(); }
      else { c.fillRect(0, 20, 256, 216); c.fillStyle = ground; c.fillRect(12, 32, 232, 192); }
      c.fillStyle = ink; c.font = `bold ${numberText.length > 1 ? 150 : 180}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(numberText, 128, 138);
      for (let i = 0; i < wear * 26; i++) { c.fillStyle = `rgba(120,110,95,${0.3 + random() * 0.4})`; c.fillRect(random() * 256, random() * 256, 6 + random() * 26, 3 + random() * 8); }
    });
    const hoodOut = a.door !== 'sectional';
    const sign = s.mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshStandardMaterial({ map: signTexture, transparent: true, alphaTest: 0.3, roughness: 0.7 }), [0, hoodOut ? HEAD + 0.585 : HEAD + 0.42, 0.012]);
    if (hoodOut) sign.scale.setScalar(0.56);
    sign.castShadow = false;

    // Traffic light.
    const lightGroup = new THREE.Group();
    const housing = s.box([0.24, 0.52, 0.16], [0, 0, 0.08], dark);
    const lens = (on: boolean, hex: string, y: number) => {
      const material = new THREE.MeshStandardMaterial({ color: on ? hex : '#2b2422', emissive: hex, emissiveIntensity: on ? 2.2 : 0.02, roughness: 0.3 });
      const disc = s.cylinder(0.075, 0.075, 0.03, [0, y, 0.17], material, 18);
      disc.rotation.x = Math.PI / 2;
      const hood = s.cylinder(0.09, 0.09, 0.1, [0, y + 0.01, 0.2], dark, 14);
      hood.rotation.x = Math.PI / 2;
      hood.scale.set(1, 1, 0.25);
      hood.position.y = y + 0.085;
      lightGroup.add(disc, hood);
      return material;
    };
    lightGroup.add(housing);
    const redLens = lens(a.signal === 'red', '#ff2a1a', 0.12);
    const greenLens = lens(a.signal === 'green', '#22e06a', -0.12);
    lightGroup.position.set(-(HALF + pierW / 2) - 0.05, DOCK + 2.25, 0);
    if (a.signal === 'dead') lightGroup.rotation.z = 0.2 + random() * 0.2;
    s.root.add(lightGroup);

    // Sodium wall lamp with its pool of light on the wall.
    const sodium = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ff9d2e', emissiveIntensity: mix(0.5, 2.6, dusk), roughness: 0.4 });
    const lampX = HALF + pierW / 2 + 0.03, lampY = HEAD + 0.25;
    s.box([0.34, 0.2, 0.2], [lampX, lampY, 0.1], dark);
    s.box([0.3, 0.04, 0.17], [lampX, lampY - 0.11, 0.11], sodium);
    const haloTexture = paint(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.scale(1, 2); const g = c.createRadialGradient(32, 2, 1, 32, 2, 29); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 32); });
    const halo = new THREE.MeshBasicMaterial({ map: haloTexture, color: '#ffa53a', transparent: true, opacity: mix(0.12, 0.6, dusk), depthWrite: false });
    const wash = s.mesh(new THREE.PlaneGeometry(1.1, 2.6), halo, [lampX - 0.08, lampY - 1.38, 0.006]);
    wash.castShadow = wash.receiveShadow = false;

    // Dock equipment.
    if (a.gear === 'shelter') {
      const pad = s.material('#202225', { roughness: 1 });
      const front = 0.34;
      s.box([HALF * 2 + 0.8, 0.42, front], [0, HEAD + 0.21, front / 2], pad);
      for (const x of [-1, 1]) {
        s.box([0.36, 3.0, front], [x * (HALF + 0.2), DOCK + 1.5, front / 2], pad);
        s.box([0.09, 2.8, 0.006], [x * (HALF + 0.11), DOCK + 1.45, front + 0.004], yellow);
      }
      sign.position.set(0, HEAD + 0.21, front + 0.006);
      sign.scale.setScalar(0.5);
    } else if (a.gear === 'leveller') {
      const plate = s.material('#6f767a', { metalness: 0.7, roughness: 0.5 });
      s.box([2.1, 0.03, 0.56], [0, DOCK + 0.02, -0.0], plate);
      const lip = s.box([2.1, 0.02, 0.36], [0, DOCK - 0.08, 0.4], plate);
      lip.rotation.x = 0.72;
      for (let i = 0; i < 6; i++) s.box([0.012, 0.006, 0.5], [-0.9 + i * 0.36, DOCK + 0.037, 0], steel);
      for (const x of [-1.06, 1.06]) s.box([0.02, 0.04, 0.56], [x, DOCK + 0.025, 0], yellow);
    } else if (a.gear === 'steps') {
      const sx = WALL_W / 2 - 0.42, steps = 5;
      const tread = s.material('#6f767a', { metalness: 0.7, roughness: 0.5 });
      for (let i = 0; i < steps; i++) {
        const y = DOCK - (i + 1) * (DOCK / (steps + 1)) + 0.02;
        s.box([0.7, 0.03, 0.26], [sx, y, 0.42 + i * 0.25], tread);
      }
      for (const x of [-0.36, 0.36]) {
        s.rod([sx + x, DOCK - 0.1, 0.3], [sx + x, 0.06, 0.3 + steps * 0.25 + 0.1], 0.025, tread);
        if (x > 0) {
          s.rod([sx + x, DOCK + 0.95, 0.3], [sx + x, 1.0, 0.3 + steps * 0.25 + 0.1], 0.022, yellow);
          for (const z of [0.3, 0.3 + steps * 0.125 + 0.05, 0.3 + steps * 0.25 + 0.1]) s.rod([sx + x, mix(DOCK, 0.03, (z - 0.3) / (steps * 0.25 + 0.1)), z], [sx + x, mix(DOCK + 0.95, 1.0, (z - 0.3) / (steps * 0.25 + 0.1)), z], 0.018, yellow);
        }
      }
      s.rod([sx - 0.36, 0, 0.3 + steps * 0.25 + 0.1], [sx + 0.36, 0, 0.3 + steps * 0.25 + 0.1], 0.02, tread);
    }

    // What was left behind.
    if (a.left === 'notice') {
      const sheet = paint(256, 192, (c) => {
        c.fillStyle = '#f6f3e8'; c.fillRect(0, 0, 256, 192);
        c.fillStyle = '#b3201a'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center';
        c.fillText('NO DELIVERIES', 128, 66, 236); c.fillText('AFTER 4', 128, 116);
        c.fillStyle = '#333'; c.fillRect(40, 140, 176, 6); c.fillRect(70, 158, 116, 6);
        c.fillStyle = 'rgba(205,190,140,0.9)'; for (const x of [0, 216]) for (const y of [0, 172]) c.fillRect(x, y, 40, 20);
      });
      const onDoor = shown > 1.2;
      const note = s.mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.8 }), onDoor ? [0.3, HEAD - Math.min(shown - 0.5, 1.6), doorZ + 0.025] : [HALF + pierW / 2, DOCK + 1.35, 0.006]);
      note.rotation.z = (random() - 0.5) * 0.14;
      note.castShadow = false;
    } else if (a.left === 'graffiti') {
      const tag = paint(256, 96, (c) => {
        c.clearRect(0, 0, 256, 96);
        const hue = ['#e83a8c', '#27c7d4', '#f4f1e8', '#b6e21c', '#16181b'][Math.floor(random() * 5)];
        c.strokeStyle = hue; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        let x = 14, y = 60;
        c.moveTo(x, y);
        for (let i = 0; i < 16; i++) { x += 8 + random() * 14; y = 18 + random() * 62; c.quadraticCurveTo(x - 10 + random() * 20, random() * 96, x, y); }
        c.stroke();
        c.lineWidth = 5; c.beginPath(); c.moveTo(10, 86); c.lineTo(x, 80 + random() * 10); c.stroke();
      });
      const spray = s.mesh(new THREE.PlaneGeometry(2.0, 0.75), new THREE.MeshStandardMaterial({ map: tag, transparent: true, roughness: 0.8, depthWrite: false }), [(random() - 0.5) * 1.2, 0.6, 0.286]);
      spray.castShadow = false;
    } else if (a.left === 'cones') {
      const orange = s.material('#f0641c', { roughness: 0.6 });
      const white = s.material('#f1eee4', { roughness: 0.6 });
      for (let i = 0; i < 2; i++) {
        const x = -1.2 + i * 2.2 + (random() - 0.5) * 0.5, z = 0.9 + random() * 0.4;
        const fallen = i === 1 && wear > 0.6;
        const cone = new THREE.Group();
        cone.add(s.box([0.3, 0.03, 0.3], [0, 0.015, 0], orange), s.cylinder(0.025, 0.11, 0.5, [0, 0.28, 0], orange, 14), s.cylinder(0.058, 0.08, 0.13, [0, 0.3, 0], white, 14));
        cone.position.set(x, 0, z);
        if (fallen) { cone.rotation.z = Math.PI / 2 - 0.2; cone.position.y = 0.14; cone.rotation.y = random() * 3; }
        s.root.add(cone);
      }
      const chock = s.box([0.2, 0.16, 0.26], [0.2 + random() * 0.4, 0.07, 1.0], yellow);
      chock.rotation.x = 0.4;
    } else if (a.left === 'pigeons') {
      const feather = s.material('#7d8791', { roughness: 0.9 });
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const x = -1.9 + random() * 3.8, face = random() < 0.5 ? -1 : 1;
        s.ball([0.1, 0.075, 0.07], [x, TOP + 0.15, -0.12], feather, 10);
        s.ball([0.042, 0.045, 0.042], [x + face * 0.085, TOP + 0.23, -0.12], s.material('#5d6770'), 8);
        s.box([0.1, 0.015, 0.05], [x - face * 0.12, TOP + 0.13, -0.12], s.material('#4d555c')).rotation.z = face * 0.3;
      }
      const dropping = s.material('#e9e7de', { roughness: 0.9 });
      for (let i = 0; i < 5; i++) s.box([0.03 + random() * 0.03, 0.15 + random() * 0.4, 0.003], [-1.9 + random() * 3.8, TOP - 0.25 - random() * 0.3, 0.003], dropping);
    } else if (a.left === 'vest') {
      const vis = s.material(mood.cheer > 0.5 ? '#e4ee22' : '#f37a18', { roughness: 0.85, emissive: mood.cheer > 0.5 ? '#5f6400' : '#6e3000', emissiveIntensity: 0.4 });
      const vx = -0.6 + random() * 1.4;
      s.box([0.5, 0.025, 0.26], [vx, DOCK + 0.02, 0.15], vis);
      s.box([0.5, 0.42, 0.025], [vx, DOCK - 0.2, 0.3], vis);
      for (const y of [0.12, 0.26]) s.box([0.505, 0.045, 0.03], [vx, DOCK - y, 0.3], s.material('#d5d8d6', { metalness: 0.6, roughness: 0.3 }));
      const mug = s.material(['#f1eee4', '#2a62ad', '#c5302b'][Math.floor(random() * 3)], { roughness: 0.4 });
      s.cylinder(0.045, 0.04, 0.1, [vx + 0.5, DOCK + 0.06, 0.16], mug, 14);
      s.ring(0.03, 0.008, [vx + 0.555, DOCK + 0.06, 0.16], mug);
    }

    const blink = mix(1.2, 5, mood.energy);
    const seed = random() * 10;
    return s.finish({
      update: (_dt, time) => {
        sodium.emissiveIntensity = mix(0.5, 2.6, dusk) * (1 - wear * 0.35 * Math.max(0, Math.sin(time * 23 + seed) * Math.sin(time * 3.1)));
        if (a.signal === 'red' && mood.energy > 0.6) redLens.emissiveIntensity = Math.sin(time * blink) > -0.3 ? 2.2 : 0.2;
        if (a.signal === 'green' && mood.energy > 0.8) greenLens.emissiveIntensity = Math.sin(time * blink) > -0.3 ? 2.2 : 0.2;
      },
    });
  },
});

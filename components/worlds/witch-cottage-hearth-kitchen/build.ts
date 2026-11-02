import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const UP = new THREE.Vector3(0, 1, 0);

export default defineWorld({
  questions: {
    tonight: choice('What is happening in the kitchen tonight?', {
      brewing: 'A working night: something brewing over the fire, steam rising, ingredients spread over the table.',
      samhain: 'Samhain eve: carved turnip and pumpkin lanterns grinning on the sills, apples and nuts set out, a garland of autumn leaves on the mantel.',
      sleeping: 'Late and quiet: the fire banked to glowing embers, most candles out, a shawl over the chair.',
      abandoned: 'The witch is long gone: a cold hearth, cobwebs in the corners, dusty jars and a few knocked over.',
    }),
    walls: choice('What are the walls made of?', {
      stone: 'Rough grey fieldstone, the stones showing.',
      timber: 'Whitewashed plaster between dark oak timbers.',
      cob: 'Ochre limewashed cob, soft and lumpy.',
    }),
    floor: choice('What is underfoot?', {
      flags: 'Worn grey flagstones.',
      boards: 'Wide old oak floorboards.',
      earth: 'Beaten earth strewn with rushes and herbs.',
    }),
    hearth: choice('What hangs in the open hearth?', {
      cauldron: 'A great black cauldron on an iron crane over the flames.',
      kettle: 'A sooty iron kettle on a pot hook.',
      spit: 'A turnspit with apples roasting on it.',
      bare: 'Nothing: just the fire on its firedogs.',
    }),
    beams: choice('What hangs from the low beams?', {
      herbs: 'Bundles of drying herbs and flowers, lavender, sage and rosemary.',
      larder: 'Garlic braids, strings of red chillies and herb bundles together.',
      pans: 'Copper pans and ladles on hooks, between a few herb bundles.',
      bats: 'A few sleeping bats hanging upside down among the herb bundles.',
    }),
    shelf: choice('What fills the apothecary shelves?', {
      potions: 'Bottles of coloured potions that glow faintly in the dark.',
      jars: 'Dusty labelled jars of roots, seeds and powders, browns and greens.',
      curios: 'Jars crowded with skulls, bones, crystals and candle ends.',
      preserves: 'Homely preserves: jams, pickles and honey in glass jars.',
    }),
    window: choice('What are the windows like?', {
      leaded: 'Diamond leaded panes, a crescent moon in a violet night sky.',
      shutters: 'Small square panes with wooden shutters open, a full moon behind.',
      round: 'A round bottle-glass window glowing violet.',
    }),
    cat: choice('Where is the cat watching from?', {
      shelf: 'High on top of the apothecary shelf, eyes glowing down.',
      hearth: 'Curled up on the warm hearthstone by the fire.',
      sill: 'On the windowsill, a silhouette against the night.',
      none: 'No cat to be seen tonight.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 10, D = 8, HW = 4.5;
    const abandoned = a.tonight === 'abandoned', sleeping = a.tonight === 'sleeping', samhain = a.tonight === 'samhain', brewing = a.tonight === 'brewing';
    const tableH = 1.45;
    const { art: s, world } = diorama(context, {
      background: '#7a6e98', floor: '#4a4440', width: W, depth: D, maxHeight: 3.0, radius: 1.45, pitch: 31, yaw: 30,
      scale: [0.6, 1.9],
      slots: [[0.2, 1.0], [-2.0, -1.7, 0, 0.85], [3.1, 0.9, tableH + 0.06, 0.42], [-3.1, 2.5, 0, 0.7], [3.0, 3.0, 0, 0.7], [1.3, -2.2, 0, 0.7]],
    });
    const root = s.root;
    const paint = (w: number, h: number, draw: (ctx: Ctx) => void, repeat: [number, number] = [1, 1]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(...repeat);
      tex.anisotropy = 4;
      return tex;
    };
    const tone = (hex: string, j: number) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (random() - 0.5) * j); return `#${c.getHexString()}`; };
    const grime = mix(0, 0.35, mood.wear) + (abandoned ? 0.25 : 0);

    const oak = s.material('#3e2a1c', { roughness: 0.85 });
    const wood = s.material('#6b4a2e', { roughness: 0.8 });
    const iron = s.material('#1c1b1d', { roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide });
    const stoneMat = s.material('#7c766e', { roughness: 0.95 });
    const wax = s.material(abandoned ? '#b8ae98' : '#efe4c8', { roughness: 0.6 });
    const fireLevel = abandoned ? 0 : sleeping ? 0.25 : mix(0.7, 1, mood.energy);
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ff9a2a', emissive: '#ff6a10', emissiveIntensity: mix(1.4, 3, mood.energy), transparent: true, opacity: 0.9, depthWrite: false });
    const flameCore = new THREE.MeshStandardMaterial({ color: '#ffe080', emissive: '#ffc040', emissiveIntensity: mix(1.8, 3.4, mood.energy), transparent: true, opacity: 0.92, depthWrite: false });
    const candleFlame = s.material('#ffd070', { emissive: '#ffa030', emissiveIntensity: mix(1.5, 3.2, mood.energy * 0.5 + mood.daylight * 0.5) });

    // ---- floor ------------------------------------------------------------------------
    const floorTex = paint(256, 256, (ctx) => {
      if (a.floor === 'flags') {
        ctx.fillStyle = '#3a3633'; ctx.fillRect(0, 0, 256, 256);
        let y = 0;
        while (y < 256) {
          const h = 40 + random() * 30; let x = -random() * 40;
          while (x < 256) { const w = 50 + random() * 50; ctx.fillStyle = tone('#7a756e', 0.14); ctx.fillRect(x + 3, y + 3, w - 6, h - 6); x += w; }
          y += h;
        }
      } else if (a.floor === 'boards') {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = tone('#6a4a30', 0.1); ctx.fillRect(i * 32, 0, 32, 256); ctx.fillStyle = '#2a1c12'; ctx.fillRect(i * 32, 0, 2, 256); ctx.fillRect(i * 32, random() * 256, 32, 2); }
        for (let i = 0; i < 300; i++) { ctx.fillStyle = 'rgba(40,24,12,0.15)'; ctx.fillRect(random() * 256, random() * 256, 1, 8 + random() * 20); }
      } else {
        ctx.fillStyle = '#6a5640'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '40,30,20' : '140,120,80'},0.2)`; ctx.fillRect(random() * 256, random() * 256, 3, 3); }
        for (let i = 0; i < 160; i++) { ctx.strokeStyle = random() < 0.7 ? '#b09a58' : '#6a7a3a'; ctx.lineWidth = 1.5; const x = random() * 256, y = random() * 256, t = random() * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * 18, y + Math.sin(t) * 18); ctx.stroke(); }
      }
    }, [W / 4, D / 4]);
    const floorPlane = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }), [0, 0.003, 0]);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.castShadow = false;

    // ---- walls -------------------------------------------------------------------------
    const wallTex = paint(256, 256, (ctx) => {
      if (a.walls === 'stone') {
        ctx.fillStyle = '#4a4440'; ctx.fillRect(0, 0, 256, 256);
        let y = 0;
        while (y < 256) {
          const h = 22 + random() * 18; let x = -random() * 30;
          while (x < 256) { const w = 30 + random() * 40; ctx.fillStyle = tone('#8a837a', 0.18); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); ctx.fill(); x += w; }
          y += h;
        }
      } else {
        ctx.fillStyle = a.walls === 'cob' ? '#c89a5a' : '#e4dcc8'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,250,235' : '90,70,50'},${0.05 + random() * 0.07})`; ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 2 + random() * 8, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = `rgba(40,30,25,${grime * 0.5})`; ctx.fillRect(0, 0, 256, 256);
    }, [W / 3, HW / 3]);
    const wallTexL = wallTex.clone(); wallTexL.repeat.set(D / 3, HW / 3); wallTexL.needsUpdate = true;
    s.box([W + 0.3, HW, 0.3], [0, HW / 2, -D / 2 - 0.15], new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }));
    s.box([0.3, HW, D], [-W / 2 - 0.15, HW / 2, 0], new THREE.MeshStandardMaterial({ map: wallTexL, roughness: 0.95 }));
    if (a.walls === 'timber') {
      for (const x of [-4.6, 0.3, 1.0, 3.75, 4.85]) s.box([0.28, HW, 0.1], [x, HW / 2, -D / 2 + 0.04], oak);
      s.box([W, 0.24, 0.1], [0, 1.25, -D / 2 + 0.04], oak);
      for (const z of [-3.6, 1.35, 3.85]) s.box([0.1, HW, 0.28], [-W / 2 + 0.04, HW / 2, z], oak);
      
    }
    // Wall plates and low beams across the room.
    s.box([W + 0.3, 0.32, 0.36], [0, HW - 0.16, -D / 2 + 0.15], oak);
    s.box([0.36, 0.32, D], [-W / 2 + 0.15, HW - 0.16, 0], oak);
    const beamZ = [-2.9];
    for (const z of beamZ) s.box([W, 0.34, 0.36], [0, HW - 0.3, z], oak);

    // ---- the open hearth --------------------------------------------------------------
    const hx = -2.0, hz = -D / 2, hw = 4.0, openW = 2.8, openH = 2.4;
    const front = hz + 0.95;
    const stoneTex = paint(256, 256, (ctx) => {
      ctx.fillStyle = '#3a3532'; ctx.fillRect(0, 0, 256, 256);
      let y = 0;
      while (y < 256) {
        const h = 26 + random() * 16; let x = -random() * 30;
        while (x < 256) { const w = 34 + random() * 36; ctx.fillStyle = tone('#857d74', 0.16); ctx.fillRect(x + 3, y + 3, w - 6, h - 6); x += w; }
        y += h;
      }
      ctx.fillStyle = 'rgba(20,14,10,0.25)'; ctx.fillRect(0, 0, 256, 256);
    }, [1.4, 1.4]);
    const hearthStone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 });
    for (const side of [-1, 1]) s.box([(hw - openW) / 2, openH, 0.95], [hx + side * (openW / 2 + (hw - openW) / 4), openH / 2, hz + 0.475], hearthStone);
    s.box([hw + 0.2, 0.42, 1.05], [hx, openH + 0.21, hz + 0.5], oak);
    s.box([hw - 0.3, HW - openH - 0.42, 0.85], [hx, (HW + openH + 0.42) / 2, hz + 0.42], hearthStone);
    s.box([openW, openH, 0.08], [hx, openH / 2, hz + 0.06], s.material('#1a1614', { roughness: 1 }));
    for (const side of [-1, 1]) s.box([0.06, openH, 0.85], [hx + side * openW / 2, openH / 2, hz + 0.47], s.material('#2a2420', { roughness: 1 }));
    s.box([hw + 0.6, 0.14, 1.9], [hx, 0.07, hz + 1.0], s.material('#5a5652', { roughness: 0.9 }));
    // Mantel shelf.
    s.box([hw + 0.4, 0.1, 0.42], [hx, openH + 0.47, front - 0.05], wood);
    // Firedogs and logs, flames by the state of the fire.
    for (const side of [-1, 1]) {
      s.rod([hx + side * 0.6, 0.14, hz + 0.6], [hx + side * 0.6, 0.14, hz + 1.3], 0.04, iron);
      s.rod([hx + side * 0.6, 0.14, hz + 1.3], [hx + side * 0.6, 0.45, hz + 1.35], 0.04, iron);
    }
    const logMat = s.material('#4a3222', { roughness: 0.95 }), charMat = s.material('#1e1612', { roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const log = s.cylinder(0.14, 0.15, 1.7, [hx + (random() - 0.5) * 0.3, 0.3 + (i > 1 ? 0.2 : 0), hz + 0.7 + (i % 2) * 0.28], i % 2 ? logMat : charMat, 10);
      log.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.3; log.rotation.y = (random() - 0.5) * 0.3;
    }
    const emberMat = s.material('#ff5a14', { emissive: '#ff3a00', emissiveIntensity: abandoned ? 0 : mix(1, 2.4, fireLevel) });
    s.scatter(new THREE.DodecahedronGeometry(1, 0), abandoned ? s.material('#8a8580') : emberMat, Array.from({ length: 50 }, () => ({ at: [hx + (random() - 0.5) * 1.8, 0.16, hz + 0.6 + random() * 0.8] as P3, size: 0.04 + random() * 0.05 })));
    const flames: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (fireLevel > 0) {
      const count = Math.round(mix(4, 14, fireLevel));
      for (let i = 0; i < count; i++) {
        const h = mix(0.35, 1.5, random()) * fireLevel;
        const x = hx + (random() - 0.5) * 1.6, z = hz + 0.75 + (random() - 0.5) * 0.5;
        const outer = s.mesh(new THREE.ConeGeometry(mix(0.12, 0.22, random()), h, 8), flameMat, [x, 0.35 + h / 2, z]);
        const inner = s.mesh(new THREE.ConeGeometry(0.08, h * 0.6, 8), flameCore, [x, 0.35 + h * 0.3, z + 0.05]);
        outer.castShadow = inner.castShadow = false;
        flames.push({ mesh: outer, base: 1, phase: random() * 6 }, { mesh: inner, base: 1, phase: random() * 6 });
      }
    }
    const fireLight = new THREE.PointLight('#ff8a3a', abandoned ? 0 : mix(6, 26, fireLevel), 11, 1.4);
    fireLight.position.set(hx, 1.3, hz + 1.6);
    root.add(fireLight);
    // What hangs in the hearth.
    const steam: THREE.Mesh[] = [];
    if (a.hearth === 'cauldron' || a.hearth === 'kettle') {
      s.cylinder(0.05, 0.05, 2.3, [hx - openW / 2 + 0.2, 1.2, hz + 0.6], iron, 8);
      s.rod([hx - openW / 2 + 0.2, 2.2, hz + 0.6], [hx + 0.2, 2.2, hz + 0.85], 0.045, iron);
      s.rod([hx - openW / 2 + 0.2, 1.4, hz + 0.6], [hx - 0.6, 2.2, hz + 0.78], 0.035, iron);
      const potY = a.hearth === 'cauldron' ? 0.95 : 1.35;
      s.rod([hx, 2.2, hz + 0.83], [hx, potY + (a.hearth === 'cauldron' ? 0.9 : 0.55), hz + 0.83], 0.02, iron);
      if (a.hearth === 'cauldron') {
        s.lathe([[0.001, 0], [0.35, 0.05], [0.58, 0.3], [0.6, 0.55], [0.5, 0.82], [0.54, 0.86], [0.48, 0.86]], iron, [hx, potY, hz + 0.83]);
        const brewHex = brewing ? '#7ac03a' : samhain ? '#e0702a' : '#5a7a3a';
        s.cylinder(0.49, 0.49, 0.03, [hx, potY + 0.8, hz + 0.83], s.material(brewHex, { emissive: brewHex, emissiveIntensity: abandoned ? 0 : mix(0.4, 1.4, mood.energy) }), 24);
        s.ring(0.55, 0.025, [hx, potY + 0.55, hz + 0.83], iron, Math.PI).rotation.y = 0;
      } else {
        s.lathe([[0.001, 0], [0.32, 0.02], [0.38, 0.2], [0.3, 0.42], [0.12, 0.5], [0.001, 0.52]], iron, [hx, potY, hz + 0.83]);
        s.rod([hx + 0.3, potY + 0.2, hz + 0.83], [hx + 0.62, potY + 0.45, hz + 0.83], 0.04, iron, 0.025);
      }
      if (!abandoned && !sleeping) {
        const steamMat = new THREE.MeshStandardMaterial({ color: '#f0ece4', transparent: true, opacity: 0.22, depthWrite: false });
        for (let i = 0; i < 6; i++) { const p = s.mesh(new THREE.SphereGeometry(1, 10, 8), steamMat); p.castShadow = false; steam.push(p); }
      }
    } else if (a.hearth === 'spit') {
      for (const side of [-1, 1]) s.rod([hx + side * 1.2, 0.14, hz + 1.2], [hx + side * 1.2, 1.25, hz + 1.2], 0.04, iron);
      s.rod([hx - 1.35, 1.2, hz + 1.2], [hx + 1.45, 1.2, hz + 1.2], 0.03, iron);
      s.rod([hx + 1.45, 1.2, hz + 1.2], [hx + 1.45, 0.95, hz + 1.25], 0.03, iron);
      for (let i = 0; i < 5; i++) s.ball([0.15, 0.14, 0.15], [hx - 0.8 + i * 0.4, 1.2, hz + 1.2], s.material(i % 2 ? '#a8231c' : '#8a3a1a', { roughness: 0.4 }), 12);
    }

    // Mantel dressing: candle stubs, jars, a garland at Samhain.
    const candles: { at: THREE.Vector3; h: number }[] = [];
    const candleAt = (x: number, y: number, z: number, h = 0.15 + random() * 0.25) => candles.push({ at: new THREE.Vector3(x, y, z), h });
    for (let i = 0; i < 5; i++) candleAt(hx - 1.9 + i * 0.95 + (random() - 0.5) * 0.2, openH + 0.52, front - 0.05);
    for (let i = 0; i < 3; i++) s.lathe([[0.001, 0], [0.12, 0], [0.13, 0.22], [0.06, 0.3], [0.06, 0.36], [0.001, 0.36]], s.material(['#4a6a3a', '#6a3a2a', '#3a4a6a'][i]), [hx - 1.45 + i * 0.95, openH + 0.52, front - 0.1]);
    if (samhain) {
      const leaf = new THREE.CircleGeometry(0.09, 5);
      const pts: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 40; i++) { const t = i / 39; pts.push({ at: [hx - hw / 2 + t * hw, openH + 0.4 - Math.sin(t * Math.PI * 3) * 0.12 - 0.05, front + 0.03], size: 1, color: ['#c8641e', '#a8341a', '#d8a030', '#7a4a22'][i % 4] }); }
      const g = s.scatter(leaf, s.material('#ffffff', { side: THREE.DoubleSide }), pts);
      g.castShadow = false;
    }

    // ---- the window --------------------------------------------------------------------
    const wx = 2.4, wy = 2.6;
    const moonFull = a.window === 'shutters';
    const nightTex = paint(256, 256, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#5a4a8a'); grad.addColorStop(1, '#8a76b8');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,250,230,0.85)'; ctx.fillRect(random() * 256, random() * 160, 2, 2); }
      ctx.fillStyle = '#f2ead0'; ctx.beginPath(); ctx.arc(170, 70, 34, 0, 7); ctx.fill();
      if (!moonFull) { ctx.fillStyle = '#5e4e8e'; ctx.beginPath(); ctx.arc(186, 62, 32, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#3a3058';
      ctx.beginPath(); ctx.moveTo(0, 256); for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, 200 + Math.sin(x * 0.05) * 14 + random() * 10); ctx.lineTo(256, 256); ctx.fill();
      for (let i = 0; i < 4; i++) { const x = 30 + i * 60 + random() * 20; ctx.beginPath(); ctx.moveTo(x, 150 + random() * 20); ctx.lineTo(x - 16, 215); ctx.lineTo(x + 16, 215); ctx.fill(); }
      ctx.strokeStyle = '#2a2430'; ctx.lineWidth = 4;
      if (a.window === 'leaded') {
        for (let k = -256; k < 512; k += 42) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 256, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k, 256); ctx.lineTo(k + 256, 0); ctx.stroke(); }
      } else if (a.window === 'shutters') {
        ctx.lineWidth = 8; for (const k of [85, 170]) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(256, k); ctx.stroke(); }
      } else {
        for (let r = 30; r < 140; r += 30) { ctx.beginPath(); ctx.arc(128, 128, r, 0, 7); ctx.stroke(); }
      }
    });
    const paneMat = new THREE.MeshStandardMaterial({ map: nightTex, emissiveMap: nightTex, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.4 });
    const winW = a.window === 'round' ? 1.8 : 2.0, winH = a.window === 'round' ? 1.8 : 1.9;
    if (a.window === 'round') {
      s.mesh(new THREE.CircleGeometry(winW / 2, 40), paneMat, [wx, wy, -D / 2 + 0.02]);
      s.ring(winW / 2, 0.1, [wx, wy, -D / 2 + 0.06], oak);
    } else {
      s.mesh(new THREE.PlaneGeometry(winW, winH), paneMat, [wx, wy, -D / 2 + 0.02]);
      for (const side of [-1, 1]) s.box([0.14, winH + 0.28, 0.2], [wx + side * (winW / 2 + 0.07), wy, -D / 2 + 0.08], oak);
      s.box([winW + 0.28, 0.16, 0.2], [wx, wy + winH / 2 + 0.08, -D / 2 + 0.08], oak);
      if (a.window === 'shutters') for (const side of [-1, 1]) {
        const sh = s.box([winW / 2, winH, 0.06], [wx + side * (winW * 0.75 + 0.18), wy, -D / 2 + 0.4], wood);
        sh.rotation.y = side * 0.5;
      }
    }
    const sillY = wy - winH / 2 - 0.08;
    s.box([winW + 0.6, 0.12, 0.55], [wx, sillY, -D / 2 + 0.27], wood);
    candleAt(wx + 0.6, sillY + 0.06, -D / 2 + 0.3);
    // Lanterns on the sill at Samhain; a pot of herbs otherwise.
    const lanterns: THREE.Vector3[] = [];
    if (samhain) lanterns.push(new THREE.Vector3(wx - 0.5, sillY + 0.06, -D / 2 + 0.3), new THREE.Vector3(hx + 1.7, 0.14, hz + 1.55), new THREE.Vector3(-3.9, 0, 1.6));
    else s.lathe([[0.001, 0], [0.12, 0], [0.16, 0.22], [0.001, 0.22]], s.material('#a4471e'), [wx - 0.5, sillY + 0.06, -D / 2 + 0.3]);
    lanterns.forEach((p, i) => {
      const turnip = i === 0;
      const body = s.material(turnip ? '#e8dcc0' : '#d8661a', { roughness: 0.55 });
      const r = turnip ? 0.2 : 0.3;
      s.ball([r, r * 0.85, r], [p.x, p.y + r * 0.85, p.z], body, 16);
      if (turnip) s.ball([r * 0.95, r * 0.4, r * 0.95], [p.x, p.y + r * 1.2, p.z], s.material('#9a5a9a'), 12);
      const glow = s.material('#ffc040', { emissive: '#ff9a20', emissiveIntensity: mix(1.5, 3, mood.energy) });
      for (const sx of [-1, 1]) s.mesh(new THREE.ConeGeometry(r * 0.17, r * 0.25, 3), glow, [p.x + sx * r * 0.35, p.y + r * 1.0, p.z + r * 0.92]).rotation.x = Math.PI / 2;
      s.box([r * 0.75, r * 0.12, 0.02], [p.x, p.y + r * 0.55, p.z + r * 0.97], glow);
      s.rod([p.x, p.y + r * 1.65, p.z], [p.x + 0.03, p.y + r * 1.95, p.z], 0.03, s.material('#4a5a2a'));
    });

    // ---- apothecary shelves on the left wall -----------------------------------------
    const sx0 = -W / 2 + 0.36, z0 = -3.0, z1 = 1.0, shelfDepth = 0.62;
    const shelfYs = [0.5, 1.25, 2.0, 2.75, 3.45];
    for (const z of [z0, z1]) s.box([shelfDepth, 3.6, 0.1], [sx0, 1.8, z], wood);
    for (const y of shelfYs) s.box([shelfDepth, 0.08, z1 - z0], [sx0, y, (z0 + z1) / 2], wood);
    s.box([0.05, 3.6, z1 - z0], [-W / 2 + 0.06, 1.8, (z0 + z1) / 2], s.material('#2a1c12'));
    const shelfColours = {
      potions: ['#7b2fa8', '#2ec4c4', '#d6198a', '#9bd10f', '#f0a215', '#1f5fd1'],
      jars: ['#6b4428', '#77762f', '#a4471e', '#c8a77e', '#1f4a2b', '#5a4a3a'],
      curios: ['#6b4428', '#8a8f93', '#3b2a8a', '#c8a77e', '#1f4a2b', '#7e1828'],
      preserves: ['#c8102e', '#f0a215', '#77762f', '#7e1828', '#ee7a12', '#9bd10f'],
    }[a.shelf];
    const jarGeos = [
      new THREE.CylinderGeometry(0.11, 0.11, 0.26, 12).translate(0, 0.13, 0),
      new THREE.LatheGeometry([[0.001, 0], [0.1, 0], [0.11, 0.18], [0.04, 0.27], [0.035, 0.38], [0.001, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 10),
      new THREE.SphereGeometry(0.12, 12, 8).translate(0, 0.12, 0),
    ];
    const buckets = new Map<string, THREE.Matrix4[]>();
    const caps: THREE.Matrix4[] = [], labels: THREE.Matrix4[] = [], skulls: THREE.Matrix4[] = [];
    const fill = abandoned ? 0.55 : mix(0.65, 1, mood.density);
    for (let si = 0; si < shelfYs.length; si++) {
      const y = shelfYs[si] + 0.04;
      let z = z0 + 0.15;
      while (z < z1 - 0.15) {
        const g = Math.floor(random() * 3);
        const colour = Math.floor(random() * shelfColours.length);
        const sc = mix(0.85, 1.35, random());
        if (random() < fill) {
          const knocked = abandoned && random() < 0.15;
          const m = new THREE.Matrix4().compose(new THREE.Vector3(sx0 + (random() - 0.5) * 0.15, y + (knocked ? 0.1 : 0), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(knocked ? Math.PI / 2 : 0, random() * 6, 0)), new THREE.Vector3(sc, sc, sc));
          const key = `${g}:${colour}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(m);
          if (!knocked && g === 0) {
            caps.push(new THREE.Matrix4().compose(new THREE.Vector3(sx0, y + 0.27 * sc, z), new THREE.Quaternion(), new THREE.Vector3(sc, 1, sc)));
            labels.push(new THREE.Matrix4().compose(new THREE.Vector3(sx0 + 0.11 * sc + 0.005, y + 0.13 * sc, z), new THREE.Quaternion(), new THREE.Vector3(1, sc, sc)));
          }
          if (a.shelf === 'curios' && random() < 0.18) skulls.push(new THREE.Matrix4().makeTranslation(sx0, y + 0.13, z + 0.15));
        }
        z += 0.28 * sc;
      }
    }
    const glowPotion = a.shelf === 'potions' && !abandoned;
    for (const [key, list] of buckets) {
      const [g, c] = key.split(':').map(Number);
      const hex = shelfColours[c];
      const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: a.shelf === 'jars' ? 0.7 : 0.25, emissive: glowPotion ? hex : '#000000', emissiveIntensity: glowPotion ? mix(0.4, 1.4, mood.energy) : 0, transparent: false });
      const inst = new THREE.InstancedMesh(jarGeos[g], mat, list.length);
      list.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.castShadow = inst.receiveShadow = true;
      root.add(inst);
    }
    const instance = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[]) => {
      if (!list.length) return;
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.castShadow = true;
      root.add(inst);
    };
    instance(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), s.material('#8a6a4a'), caps);
    instance(new THREE.BoxGeometry(0.01, 0.1, 0.12), s.material('#ece2c6'), labels);
    instance(new THREE.SphereGeometry(0.12, 10, 8).scale(1, 0.95, 1.1), s.material('#e0d4b0'), skulls);

    // ---- beams: what hangs from them ------------------------------------------------
    const hung: { g: THREE.Group; phase: number }[] = [];
    const hangY = HW - 0.46;
    const bundle = (x: number, z: number, kind: 'herb' | 'garlic' | 'chilli' | 'pan' | 'bat') => {
      const g = new THREE.Group();
      g.position.set(x, hangY, z);
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P3, scale: P3 = [1, 1, 1], rot: P3 = [0, 0, 0]) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.scale.set(...scale); m.rotation.set(...rot); m.castShadow = true; g.add(m); return m;
      };
      const dry = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#7a6040'), abandoned ? 0.7 : mood.wear * 0.4).getHexString()}`;
      if (kind === 'herb') {
        const plant = Math.floor(random() * 5);
        const leafHex = dry(['#5a6a3a', '#8fa182', '#2f4a30', '#7a8a4a', '#4a6a2a'][plant]);
        const tipHex = dry(['#8a5ac8', '#a8b098', '#3a5a3a', '#e0c040', '#c8d0b0'][plant]);
        add(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), s.material('#b49a6a'), [0, -0.08, 0]);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8), s.material('#8a6a3a'), [0, -0.19, 0]);
        for (let k = 0; k < 9; k++) {
          const t = random() * Math.PI * 2, splay = mix(0.04, 0.2, random());
          add(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), s.material(dry('#4a5a2a')), [Math.cos(t) * splay * 0.4, -0.38, Math.sin(t) * splay * 0.4], [1, 1, 1], [Math.sin(t) * splay, 0, -Math.cos(t) * splay]);
          if (k > 4) continue;
          const len = mix(0.35, 0.6, random());
          add(new THREE.ConeGeometry(mix(0.07, 0.11, random()), len, 7), s.material(k % 2 ? leafHex : tipHex, { roughness: 0.95 }), [Math.cos(t) * 0.07, -0.3 - len / 2, Math.sin(t) * 0.07], [1, 1, 1], [Math.PI + Math.sin(t) * 0.25, 0, -Math.cos(t) * 0.25]);
        }
      } else if (kind === 'garlic' || kind === 'chilli') {
        const len = mix(0.7, 1.0, random());
        add(new THREE.CylinderGeometry(0.02, 0.02, len, 5), s.material('#c8b07a'), [0, -len / 2, 0]);
        const n = kind === 'garlic' ? 7 : 16;
        for (let i = 0; i < n; i++) {
          const t = i * 2.4, y = -0.1 - (i / n) * len;
          if (kind === 'garlic') add(new THREE.SphereGeometry(0.09, 10, 8), s.material('#efe6d4', { roughness: 0.6 }), [Math.cos(t) * 0.06, y, Math.sin(t) * 0.06], [1, 0.9, 1]);
          else add(new THREE.ConeGeometry(0.03, 0.17, 6), s.material(dry('#c0141a'), { roughness: 0.35 }), [Math.cos(t) * 0.05, y - 0.06, Math.sin(t) * 0.05], [1, 1, 1], [Math.PI + Math.cos(t) * 0.4, 0, Math.sin(t) * 0.4]);
        }
      } else if (kind === 'pan') {
        const copper = s.material(abandoned ? '#5a6a52' : '#b8643a', { metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide });
        add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), iron, [0, -0.1, 0]);
        const r = mix(0.2, 0.32, random());
        add(new THREE.BoxGeometry(0.05, 0.5, 0.02), copper, [0, -0.45, 0]);
        add(new THREE.CylinderGeometry(r, r * 0.85, 0.06, 18), copper, [0, -0.7 - r, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      } else {
        const body = s.material('#1c1a20', { roughness: 0.7 });
        add(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), body, [0, -0.03, 0]);
        add(new THREE.SphereGeometry(0.09, 10, 8), body, [0, -0.17, 0], [0.8, 1.4, 0.7]);
        add(new THREE.SphereGeometry(0.06, 10, 8), body, [0, -0.33, 0.02]);
        for (const sd of [-1, 1]) {
          add(new THREE.ConeGeometry(0.025, 0.07, 4), body, [sd * 0.035, -0.4, 0.02], [1, 1, 1], [Math.PI, 0, 0]);
          add(new THREE.BoxGeometry(0.05, 0.26, 0.02), body, [sd * 0.08, -0.18, 0], [1, 1, 1], [0, 0, sd * 0.25]);
          add(new THREE.SphereGeometry(0.012, 6, 4), s.material('#ffcf40', { emissive: '#ffa020', emissiveIntensity: mix(0.3, 1.8, mood.energy) }), [sd * 0.022, -0.33, 0.07]);
        }
      }
      g.rotation.y = random() * Math.PI * 2;
      g.scale.setScalar(kind === 'pan' ? 1.1 : 1.3);
      root.add(g);
      hung.push({ g, phase: random() * 6 });
    };
    for (const z of beamZ) {
      const step = mix(0.8, 0.5, mood.density);
      for (let x = -W / 2 + 0.7; x < W / 2 - 0.3; x += step * mix(0.8, 1.2, random())) {
        if (z > 0 && Math.abs(x - 0.4) < 1.4) continue; // keep the hero's light clear
        const r = random();
        let kind: 'herb' | 'garlic' | 'chilli' | 'pan' | 'bat' = 'herb';
        if (a.beams === 'larder') kind = r < 0.3 ? 'garlic' : r < 0.6 ? 'chilli' : 'herb';
        if (a.beams === 'pans') kind = r < 0.5 ? 'pan' : 'herb';
        if (a.beams === 'bats') kind = r < 0.3 ? 'bat' : 'herb';
        bundle(x, z + (random() - 0.5) * 0.1, kind);
      }
    }

    // ---- lectern with the spellbook -----------------------------------------------------
    const lx = 3.9, lz = -2.9;
    s.cylinder(0.5, 0.55, 0.12, [lx, 0.06, lz], wood, 16);
    s.lathe([[0.001, 0], [0.12, 0], [0.09, 0.2], [0.14, 0.5], [0.08, 0.8], [0.12, 1.2], [0.08, 1.5], [0.12, 1.75], [0.001, 1.75]], wood, [lx, 0.1, lz]);
    const desk = s.box([1.0, 0.08, 0.75], [lx, 1.95, lz], wood);
    desk.rotation.x = 0.45;
    const pageTex = paint(256, 128, (ctx) => {
      ctx.fillStyle = abandoned ? '#c8b890' : '#ece0c0'; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#4a2a1a'; ctx.fillRect(126, 0, 4, 128);
      ctx.strokeStyle = 'rgba(40,24,16,0.75)'; ctx.lineWidth = 2;
      for (const ox of [12, 140]) for (let i = 0; i < 9; i++) { if (ox === 140 && i > 1 && i < 7) continue; ctx.beginPath(); ctx.moveTo(ox, 14 + i * 12); for (let x = 0; x < 100; x += 6) ctx.lineTo(ox + x, 14 + i * 12 + (random() - 0.5) * 3); ctx.stroke(); }
      ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(192, 64, 30, 0, 7); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 5; i++) { const t = -Math.PI / 2 + i * Math.PI * 4 / 5; ctx.lineTo(192 + Math.cos(t) * 28, 64 + Math.sin(t) * 28); } ctx.stroke();
    });
    const book = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.72), s.material('#4a1a1e'));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.07, 0.66), new THREE.MeshStandardMaterial({ map: pageTex, emissiveMap: pageTex, emissive: '#ffd890', emissiveIntensity: abandoned ? 0 : mix(0.05, 0.4, mood.energy), roughness: 0.9 }));
    pages.position.y = 0.05;
    book.add(cover, pages);
    book.position.set(lx, 2.03, lz + 0.03);
    book.rotation.x = 0.45;
    book.traverse((c) => { c.castShadow = true; });
    root.add(book);
    candleAt(lx + 0.75, 0.0, lz + 0.4, 0.5);
    candleAt(lx + 0.95, 0.0, lz + 0.1, 0.32);

    // ---- work table with a tabletop slot ---------------------------------------------
    const tx = 3.1, tz = 0.9;
    s.box([2.1, 0.12, 1.2], [tx, tableH, tz], s.material('#7a5a3a', { roughness: 0.8 }));
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.box([0.12, tableH - 0.06, 0.12], [tx + dx * 0.9, (tableH - 0.06) / 2, tz + dz * 0.48], wood);
    s.box([1.8, 0.08, 0.08], [tx, 0.35, tz], wood);
    if (brewing) {
      s.lathe([[0.001, 0], [0.16, 0], [0.19, 0.14], [0.17, 0.18], [0.14, 0.18], [0.12, 0.06], [0.001, 0.06]], stoneMat, [tx - 0.8, tableH + 0.06, tz + 0.25]);
      s.rod([tx - 0.8, tableH + 0.15, tz + 0.25], [tx - 0.65, tableH + 0.38, tz + 0.15], 0.03, stoneMat);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#5a7a3a'), Array.from({ length: 16 }, () => ({ at: [tx + 0.75 + (random() - 0.5) * 0.4, tableH + 0.07, tz + (random() - 0.5) * 0.5] as P3, size: 0.04 })));
    }
    candleAt(tx + 0.95, tableH + 0.06, tz - 0.45);
    if (samhain) {
      for (let i = 0; i < 6; i++) s.ball([0.1, 0.09, 0.1], [tx - 0.85 + (i % 3) * 0.18, tableH + 0.15 + Math.floor(i / 3) * 0.12, tz + 0.35 + (i % 2) * 0.1], s.material(i % 3 ? '#a8231c' : '#7f9a2a', { roughness: 0.4 }), 12);
    }

    // Floor candle clusters.
    for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) candleAt(1.0 + (random() - 0.5) * 0.8, 0.0, -3.3 + (random() - 0.5) * 0.5, 0.15 + random() * 0.35);
    // Candles: wax stubs, drips and flames (unlit in an abandoned house, mostly out when asleep).
    const flickers: THREE.Mesh[] = [];
    for (const [i, c] of candles.entries()) {
      const r = 0.06 + random() * 0.04;
      s.cylinder(r * 1.6, r * 1.7, 0.03, [c.at.x, c.at.y + 0.015, c.at.z], iron, 10);
      s.cylinder(r, r * 1.05, c.h, [c.at.x, c.at.y + 0.03 + c.h / 2, c.at.z], wax, 10);
      s.ball([r * 0.35, r * 0.9, r * 0.35], [c.at.x + r, c.at.y + c.h * 0.8, c.at.z], wax, 6);
      const lit = !abandoned && (!sleeping || i % 4 === 0);
      if (lit) {
        const f = s.ball([0.035, 0.08, 0.035], [c.at.x, c.at.y + 0.03 + c.h + 0.08, c.at.z], candleFlame, 8);
        f.castShadow = false;
        flickers.push(f);
      }
    }

    // ---- a door with a broom by it, on the left wall ---------------------------------
    const dz = 2.7;
    for (let i = 0; i < 4; i++) s.box([0.08, 3.4, 0.42], [-W / 2 + 0.05, 1.7, dz - 0.63 + i * 0.42], s.material(tone('#4a3424', 0.08), { roughness: 0.85 }));
    s.box([0.16, 3.6, 0.16], [-W / 2 + 0.08, 1.8, dz - 0.95], oak);
    s.box([0.16, 3.6, 0.16], [-W / 2 + 0.08, 1.8, dz + 0.95], oak);
    s.box([0.16, 0.18, 2.06], [-W / 2 + 0.08, 3.55, dz], oak);
    for (const y of [0.7, 2.7]) s.box([0.04, 0.1, 1.4], [-W / 2 + 0.11, y, dz - 0.1], iron);
    s.rod([-W / 2 + 0.6, 0.0, dz + 1.45], [-W / 2 + 0.2, 3.0, dz + 1.25], 0.05, wood);
    s.mesh(new THREE.ConeGeometry(0.3, 0.9, 10, 1, true), s.material('#6f5f4f', { side: THREE.DoubleSide, roughness: 0.95 }), [-W / 2 + 0.58, 0.45, dz + 1.45]).rotation.z = -0.13;

    // ---- the cat ---------------------------------------------------------------------
    if (a.cat !== 'none') {
      const spot = { shelf: new THREE.Vector3(sx0, 3.5, -1.6), hearth: new THREE.Vector3(hx + 1.85, 0.14, hz + 1.55), sill: new THREE.Vector3(wx + 0.2, sillY + 0.06, -D / 2 + 0.3) }[a.cat];
      const cat = new THREE.Group();
      const fur = s.material('#141316', { roughness: 0.55 });
      const eye = s.material('#f0c020', { emissive: '#f0a215', emissiveIntensity: mix(0.8, 2.8, mood.energy * 0.5 + mood.daylight * 0.5) });
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P3, sc: P3 = [1, 1, 1], rot: P3 = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.scale.set(...sc); m.rotation.set(...rot); m.castShadow = true; cat.add(m); return m; };
      const ball = new THREE.SphereGeometry(1, 14, 10);
      if (a.cat === 'hearth') {
        part(ball, fur, [0, 0.16, 0], [0.38, 0.17, 0.3]);
        part(ball, fur, [0.28, 0.2, 0.12], [0.14, 0.13, 0.14]);
        for (const sd of [-1, 1]) part(new THREE.ConeGeometry(0.05, 0.1, 4), fur, [0.28 + sd * 0.07, 0.33, 0.12], [1, 1, 0.6], [0, 0, -sd * 0.3]);
        part(new THREE.TorusGeometry(0.3, 0.045, 6, 16, Math.PI), fur, [0, 0.06, 0.12], [1, 1, 1], [Math.PI / 2, 0, Math.PI]);
        for (const sd of [-1, 1]) part(new THREE.BoxGeometry(0.06, 0.01, 0.01), s.material('#050505'), [0.28 + sd * 0.05, 0.22, 0.25]);
      } else {
        part(ball, fur, [0, 0.22, 0], [0.2, 0.24, 0.24]);
        part(ball, fur, [0, 0.42, 0.08], [0.15, 0.2, 0.14]);
        part(ball, fur, [0, 0.66, 0.1], [0.13, 0.12, 0.12]);
        for (const sd of [-1, 1]) {
          part(new THREE.ConeGeometry(0.055, 0.12, 4), fur, [sd * 0.08, 0.79, 0.08], [1, 1, 0.6], [0, Math.PI / 4, -sd * 0.3]);
          part(ball, eye, [sd * 0.05, 0.68, 0.21], [0.03, 0.022, 0.015]);
        }
        part(new THREE.TorusGeometry(0.2, 0.035, 6, 16, Math.PI * 1.1), fur, [0, 0.04, 0.05], [1, 1, 1], [Math.PI / 2, 0, 0]);
      }
      cat.position.copy(spot);
      cat.rotation.y = a.cat === 'shelf' ? Math.PI / 2 : a.cat === 'sill' ? 0.4 : -0.5;
      cat.scale.setScalar(1.6);
      root.add(cat);
    }

    // ---- cobwebs in an abandoned house --------------------------------------------
    if (abandoned) {
      const webTex = paint(128, 128, (ctx) => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.strokeStyle = 'rgba(240,240,240,0.85)'; ctx.lineWidth = 1.5;
        for (let i = 0; i <= 6; i++) { const t = i / 6 * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t) * 128, Math.sin(t) * 128); ctx.stroke(); }
        for (let r = 16; r < 128; r += 16) { ctx.beginPath(); for (let i = 0; i <= 6; i++) { const t = i / 6 * Math.PI / 2; const rr = r * (i % 2 ? 0.92 : 1); ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); } ctx.stroke(); }
      });
      const webMat = new THREE.MeshStandardMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8 });
      const web1 = s.mesh(new THREE.PlaneGeometry(1.6, 1.6), webMat, [-W / 2 + 0.85, HW - 0.85, -D / 2 + 0.3]);
      web1.rotation.z = Math.PI; web1.rotation.y = 0.2; web1.castShadow = false;
      const web2 = s.mesh(new THREE.PlaneGeometry(1.2, 1.2), webMat, [lx + 0.6, 1.4, lz - 0.6]);
      web2.rotation.y = Math.PI; web2.castShadow = false;
    }

    // ---- motion ----------------------------------------------------------------------
    const base = fireLight.intensity;
    const speed = mix(0.4, 2.5, mood.energy);
    const setSteam = (time: number) => steam.forEach((p, i) => {
      const t = (i / steam.length + time * 0.12 * speed) % 1;
      p.position.set(hx + Math.sin(i * 2.3) * 0.25 * (1 + t), (a.hearth === 'cauldron' ? 1.8 : 1.9) + t * 1.2, hz + 0.95 + t * 0.4);
      p.scale.setScalar(0.18 + t * 0.35);
    });
    setSteam(0);
    world.update = (_dt, time) => {
      fireLight.intensity = base * (0.85 + 0.15 * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1));
      for (const f of flames) f.mesh.scale.y = f.base * (0.8 + 0.3 * Math.sin(time * 6 * speed + f.phase));
      for (const [i, f] of flickers.entries()) f.scale.y = 0.08 * (0.85 + 0.2 * Math.sin(time * 9 + i * 1.7));
      for (const h of hung) h.g.rotation.z = Math.sin(time * 0.8 * speed + h.phase) * 0.03 * mood.energy;
      setSteam(time);
    };
    return world;
  },
});

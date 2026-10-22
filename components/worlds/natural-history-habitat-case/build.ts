import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, visibleBounds } from '@conjure/kit';
import { type P3, canvasTexture, lump, taper } from './lib';

const HABITATS = {
  savanna: 'African plains: gold grass, flat-topped acacias, blue hills in haze, a termite mound.',
  rainforest: 'Rainforest floor: layered wet greens, buttress roots, hanging vines and big leaves.',
  arctic: 'Arctic pack ice: snow hummocks, pale blue ice blocks, a dark line of sea and painted bergs.',
  desert: 'Red desert: sandstone boulders, painted mesas, a dead branch and almost nothing growing.',
  woodland: 'Autumn birch wood: white trunks, orange leaf litter, low gold light through the trees.',
} as const;
const GROUND: Record<keyof typeof HABITATS, string> = { savanna: '#c5a55c', rainforest: '#56603a', arctic: '#e4ebef', desert: '#c4854f', woodland: '#a56f3c' };
const TITLES: Record<keyof typeof HABITATS, string> = { savanna: 'AFRICAN PLAINS', rainforest: 'FOREST FLOOR', arctic: 'THE POLAR ICE', desert: 'THE RED DESERT', woodland: 'A BIRCH WOOD IN AUTUMN' };
const LABELS = {
  group: 'HABITAT GROUP  No. 7', shot: 'COLLECTED 1911', touch: 'PLEASE DO NOT TAP THE GLASS', extinct: 'NOW EXTINCT IN THE WILD', gift: 'GIFT OF THE EXPEDITION', removed: 'SPECIMEN REMOVED FOR STUDY',
} as const;

export default defineWorld({
  questions: {
    habitat: choice('What landscape is built inside the case?', HABITATS),
    sky: choice('What sky is painted on the curved backdrop?', {
      noon: 'Clear pale blue with a few small clouds, flat midday.',
      sunset: 'A deep orange and violet sunset.',
      storm: 'Slate storm cloud with one bright break.',
      night: 'Blue night with a moon and stars.',
      mist: 'Pearly dawn mist, everything far away dissolving.',
    }),
    era: choice('When was the hall fitted out?', {
      victorian: 'Victorian: carved mahogany, brass, parquet and dark green walls.',
      deco: 'The 1930s: stepped black marble and bronze, terrazzo floor, stone-coloured walls.',
      seventies: 'A 1970s refit: pale laminate, aluminium trim, brown carpet and a backlit plastic title.',
    }),
    state: choice('What is going on in the hall?', {
      open: 'Open as usual: rope stanchions, polished floor, nobody about.',
      restoration: 'Closed for restoration: a stepladder, paint tins and a dust sheet over the bench.',
      abandoned: 'Shut for years: fallen plaster, dead leaves blown in, a bucket under a leak.',
      school: 'A school party has just left: little stools in a half circle, clipboards and a forgotten bag.',
      afterhours: 'After hours: the night guard’s chair, a torch on the floor, a yellow wet-floor sign.',
    }),
    glass: choice('What is the glass front like?', {
      clear: 'Clean and nearly invisible.',
      handprints: 'Smeared with small handprints at child height.',
      cracked: 'One pane starred with a long crack.',
      gone: 'Removed altogether: you could step straight in.',
    }),
    label: choice('What does the brass label on the rail say?', LABELS),
    bench: choice('What has been left on the bench?', {
      nothing: 'Nothing.',
      coat: 'A folded overcoat and an umbrella.',
      sketchbook: 'An open sketchbook and a tin of pencils.',
      balloon: 'A child’s balloon tied to the armrest.',
      flowers: 'A small bunch of flowers laid down like an offering.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const yaw = 18, pitch = 20;
    const wallColour = { victorian: '#66775f', deco: '#b3a78f', seventies: '#a99b68' }[a.era];
    const floorColour = { victorian: '#8a6540', deco: '#aaa496', seventies: '#96663f' }[a.era];
    const { art: s, world } = diorama(context, { background: '#d6d0c2', floor: floorColour, width: 12.6, depth: 9.6, yaw, pitch });
    const root = s.root;
    const hemisphere = root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (hemisphere) hemisphere.intensity = mix(0.85, 1.2, mood.cheer);
    if (world.keyLight) world.keyLight.intensity = mix(1.5, 2.3, mood.cheer);

    const frameColour = { victorian: '#4a2616', deco: '#2c2c30', seventies: '#d6d0c0' }[a.era];
    const frame = s.material(frameColour, { roughness: a.era === 'deco' ? 0.25 : 0.5 });
    const trimColour = { victorian: '#b9944a', deco: '#9a7b45', seventies: '#c5c9ca' }[a.era];
    const trim = s.material(trimColour, { metalness: 0.8, roughness: 0.3 });
    const wall = s.material(wallColour, { roughness: 0.9 });
    const dado = s.material(new THREE.Color(wallColour).multiplyScalar(0.72), { roughness: 0.8 });
    const dust = mood.wear;
    const quiet = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = false; return mesh; };

    // ---- Hall ------------------------------------------------------------------------------
    const backZ = -4.7, leftX = -6.2, wallH = 6.4;
    s.box([12.6, wallH, 0.2], [0, wallH / 2, backZ - 0.1], wall);
    s.box([0.2, wallH, 9.6], [leftX - 0.1, wallH / 2, 0], wall);
    s.box([12.6, 1.15, 0.06], [0, 0.575, backZ + 0.03], dado);
    s.box([0.06, 1.15, 9.6], [leftX + 0.03, 0.575, 0], dado);
    s.box([0.05, 0.08, 9.6], [leftX + 0.05, 1.19, 0], a.era === 'seventies' ? trim : frame);
    s.box([0.05, 0.1, 9.6], [leftX + 0.04, 5.2, 0], a.era === 'seventies' ? trim : frame);
    // Floor finish.
    const floorMap = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = floorColour; ctx.fillRect(0, 0, w, h);
      if (a.era === 'victorian') {
        for (let y = 0; y < h; y += 32) for (let x = -32; x < w; x += 64) {
          const tone = 0.85 + random() * 0.3;
          ctx.fillStyle = `rgb(${138 * tone},${101 * tone},${64 * tone})`;
          ctx.save(); ctx.translate(x + ((y / 32) % 2) * 32, y); ctx.rotate(((y / 32) % 2 ? 1 : -1) * Math.PI / 4); ctx.fillRect(0, 0, 44, 14); ctx.restore();
        }
      } else if (a.era === 'deco') {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = (x + y) % 2 ? '#6a6660' : '#bdb7a8'; ctx.fillRect(x * 64, y * 64, 64, 64); }
        for (let i = 0; i < 1500; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '40,40,40'},0.18)`; ctx.fillRect(random() * w, random() * h, 2, 2); }
      } else {
        for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '60,35,15' : '190,140,90'},0.22)`; ctx.fillRect(random() * w, random() * h, 2, 3); }
      }
      for (let i = 0; i < dust * 40; i++) { ctx.fillStyle = `rgba(215,205,185,${0.08 + random() * 0.14})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 10 + random() * 50, 8 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    });
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(a.era === 'deco' ? 2 : 3, a.era === 'deco' ? 1.5 : 2.3);
    const finish = s.mesh(new THREE.PlaneGeometry(12.6, 9.6), new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.era === 'seventies' ? 1 : mix(0.35, 0.8, dust) }), [0, 0.006, 0]);
    finish.rotation.x = -Math.PI / 2;
    finish.castShadow = false;

    // ---- The case --------------------------------------------------------------------------
    const half = 4.4, frontZ = -1.2, caseFloor = 0.7, openTop = 4.8, caseTop = 5.5;
    const ground = GROUND[a.habitat];
    // Plinth with panelled front.
    s.box([half * 2 + 0.3, caseFloor, backZ * -1 + frontZ + 0.1], [0, caseFloor / 2, (backZ + frontZ) / 2 + 0.05], frame);
    for (let i = 0; i < 6; i++) s.box([1.2, caseFloor * 0.55, 0.03], [-half + 0.73 + i * 1.47, caseFloor * 0.48, frontZ + 0.115], s.material(new THREE.Color(frameColour).multiplyScalar(a.era === 'seventies' ? 0.92 : 1.25), { roughness: 0.4 }));
    s.box([half * 2 + 0.36, 0.07, 0.14], [0, caseFloor + 0.005, frontZ + 0.1], a.era === 'victorian' ? frame : trim);
    // Corner posts, fascia and roof.
    for (const x of [-1, 1]) {
      s.box([0.24, openTop - caseFloor, 0.24], [x * (half + 0.03), (openTop + caseFloor) / 2, frontZ - 0.02], frame);
      if (a.era === 'victorian') { s.cylinder(0.09, 0.09, openTop - caseFloor - 0.4, [x * (half + 0.03), (openTop + caseFloor) / 2, frontZ + 0.12], frame, 12); s.box([0.3, 0.16, 0.3], [x * (half + 0.03), openTop - 0.1, frontZ + 0.02], trim); }
      if (a.era === 'deco') for (let i = 0; i < 3; i++) s.box([0.05, openTop - caseFloor, 0.03], [x * (half + 0.03) + (i - 1) * 0.08, (openTop + caseFloor) / 2, frontZ + 0.11], trim);
    }
    quiet(s.box([half * 2 + 0.3, caseTop - openTop, 0.34], [0, (caseTop + openTop) / 2, frontZ - 0.05], frame));
    quiet(s.box([half * 2 + 0.3, 0.12, frontZ - backZ], [0, caseTop - 0.06, (frontZ + backZ) / 2], frame));
    if (a.era === 'victorian') {
      quiet(s.box([half * 2 + 0.6, 0.14, 0.5], [0, caseTop + 0.07, frontZ - 0.02], frame));
      const crest = quiet(s.cylinder(1.3, 1.3, 0.14, [0, caseTop + 0.14, frontZ - 0.04], frame, 28));
      crest.rotation.x = Math.PI / 2; crest.scale.y = 1;
      quiet(s.ball([0.22, 0.22, 0.1], [0, caseTop + 0.75, frontZ + 0.06], trim, 14));
    } else if (a.era === 'deco') {
      quiet(s.box([half * 2 - 1, 0.3, 0.3], [0, caseTop + 0.15, frontZ - 0.05], frame));
      quiet(s.box([half * 2 - 3.4, 0.3, 0.3], [0, caseTop + 0.45, frontZ - 0.05], frame));
      for (const y of [openTop + 0.08, caseTop - 0.06]) quiet(s.box([half * 2 + 0.34, 0.04, 0.36], [0, y, frontZ - 0.05], trim));
    }
    const lit = a.era === 'seventies';
    const title = s.label(TITLES[a.habitat], a.era === 'seventies' ? 5.2 : 4.6, 0.44, [0, (caseTop + openTop) / 2, frontZ + 0.125], a.era === 'victorian' ? '#e6cf8a' : a.era === 'deco' ? '#d8b676' : '#3a3530', a.era === 'victorian' ? '#3a1d10' : a.era === 'deco' ? '#1e1e22' : '#f4ecd2');
    title.castShadow = false;
    if (lit) { const m = title.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#fff2cf'); m.emissiveMap = m.map; m.emissiveIntensity = mix(0.5, 0.2, dust); }

    // Curved painted backdrop.
    const backdropMap = canvasTexture(1024, 448, (ctx, w, h) => {
      const horizon = h * 0.62;
      const skies = { noon: ['#7fb0d6', '#dbe9e6'], sunset: ['#4d5a92', '#f3a659'], storm: ['#434b56', '#a2aaa6'], night: ['#16203f', '#48597c'], mist: ['#c6c4d2', '#f2decb'] }[a.sky];
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, skies[0]); sky.addColorStop(1, skies[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
      if (a.sky === 'sunset') { const glow = ctx.createRadialGradient(w * 0.62, horizon, 10, w * 0.62, horizon, 300); glow.addColorStop(0, 'rgba(255,236,170,0.95)'); glow.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, horizon); }
      if (a.sky === 'night') { ctx.fillStyle = '#f4f1dc'; for (let i = 0; i < 140; i++) ctx.fillRect(random() * w, random() * horizon * 0.9, 1.5 + random(), 1.5 + random()); ctx.beginPath(); ctx.arc(w * 0.7, horizon * 0.3, 20, 0, 7); ctx.fill(); }
      if (a.sky === 'storm') { const gap = ctx.createRadialGradient(w * 0.35, horizon * 0.55, 5, w * 0.35, horizon * 0.55, 170); gap.addColorStop(0, 'rgba(250,244,214,0.95)'); gap.addColorStop(1, 'rgba(250,244,214,0)'); ctx.fillStyle = gap; ctx.fillRect(0, 0, w, horizon); }
      const cloud = a.sky === 'storm' ? 'rgba(50,56,64,' : a.sky === 'night' ? 'rgba(90,105,140,' : a.sky === 'sunset' ? 'rgba(236,150,120,' : 'rgba(255,255,255,';
      for (let i = 0; i < (a.sky === 'storm' ? 26 : 10); i++) { const cx = random() * w, cy = random() * horizon * 0.75; for (let k = 0; k < 5; k++) { ctx.fillStyle = `${cloud}${0.25 + random() * 0.35})`; ctx.beginPath(); ctx.ellipse(cx + (random() - 0.5) * 90, cy + (random() - 0.5) * 14, 30 + random() * 50, 8 + random() * 12, 0, 0, 7); ctx.fill(); } }
      const haze = new THREE.Color(skies[1]);
      const tone = (hex: string, far: number) => `#${new THREE.Color(hex).lerp(haze, far).getHexString()}`;
      const ridge = (y: number, rough: number, colour: string, step = 28) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, h); let yy = y; for (let x = 0; x <= w + step; x += step) { yy += (random() - 0.5) * rough; yy = Math.min(Math.max(yy, y - rough * 2), y + rough * 2); ctx.lineTo(x, yy); } ctx.lineTo(w, h); ctx.closePath(); ctx.fill(); };
      if (a.habitat === 'savanna') {
        ridge(horizon - 36, 16, tone('#6f86a0', 0.45)); ridge(horizon - 12, 8, tone('#8a8a5a', 0.4));
        ridge(horizon + 4, 3, tone(ground, 0.25), 60);
        for (let i = 0; i < 14; i++) { const x = random() * w, depth = random(), y = horizon + 6 + depth * 60, k = 0.35 + depth * 1.1; ctx.strokeStyle = ctx.fillStyle = tone('#3d3a22', 0.5 - depth * 0.5); ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * k, y - 34 * k); ctx.moveTo(x + 3 * k, y - 22 * k); ctx.lineTo(x - 14 * k, y - 38 * k); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y - 40 * k, 34 * k, 8 * k, 0, 0, 7); ctx.fill(); }
      } else if (a.habitat === 'rainforest') {
        ridge(horizon - 150, 40, tone('#3c5a3c', 0.5), 40); ridge(horizon - 80, 50, tone('#2f4a2c', 0.3), 30);
        for (let i = 0; i < 30; i++) { const x = random() * w, wide = 6 + random() * 26; ctx.fillStyle = tone('#2a2a1c', random() * 0.5); ctx.fillRect(x, 0, wide, h); }
        for (let i = 0; i < 70; i++) { ctx.fillStyle = tone(['#3f6a34', '#56813c', '#294a2a'][i % 3], random() * 0.4); ctx.beginPath(); ctx.ellipse(random() * w, random() * h * 0.8, 20 + random() * 50, 8 + random() * 16, random() * 3, 0, 7); ctx.fill(); }
        for (let i = 0; i < 16; i++) { ctx.strokeStyle = '#26301c'; ctx.lineWidth = 2 + random() * 2; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 30, h * 0.3, x - 40, h * 0.5, x + (random() - 0.5) * 80, h * (0.5 + random() * 0.4)); ctx.stroke(); }
        for (let band = 0; band < 3; band++) { ctx.fillStyle = 'rgba(230,238,225,0.16)'; ctx.fillRect(0, horizon - 90 + band * 50, w, 26); }
      } else if (a.habitat === 'arctic') {
        ctx.fillStyle = tone('#2d4a66', 0.2); ctx.fillRect(0, horizon - 10, w, 22);
        for (let i = 0; i < 9; i++) { const x = random() * w, k = 0.5 + random() * 1.4; ctx.fillStyle = tone('#cfe6f2', random() * 0.4); ctx.beginPath(); ctx.moveTo(x - 50 * k, horizon + 4); ctx.lineTo(x - 30 * k, horizon - 30 * k); ctx.lineTo(x - 5 * k, horizon - 46 * k); ctx.lineTo(x + 24 * k, horizon - 22 * k); ctx.lineTo(x + 52 * k, horizon + 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(120,170,205,0.5)'; ctx.beginPath(); ctx.moveTo(x - 5 * k, horizon - 46 * k); ctx.lineTo(x + 24 * k, horizon - 22 * k); ctx.lineTo(x + 52 * k, horizon + 4); ctx.lineTo(x + 6 * k, horizon + 4); ctx.closePath(); ctx.fill(); }
        ridge(horizon + 14, 6, tone(ground, 0.1), 50);
      } else if (a.habitat === 'desert') {
        for (let i = 0; i < 7; i++) { const x = random() * w, k = 0.5 + random() * 1.3, far = random() * 0.5; ctx.fillStyle = tone('#a04e32', far); ctx.beginPath(); ctx.moveTo(x - 90 * k, horizon + 6); ctx.lineTo(x - 70 * k, horizon - 30 * k); ctx.lineTo(x - 60 * k, horizon - 70 * k); ctx.lineTo(x + 50 * k, horizon - 72 * k); ctx.lineTo(x + 62 * k, horizon - 30 * k); ctx.lineTo(x + 96 * k, horizon + 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(60,20,20,0.25)'; ctx.fillRect(x + 10 * k, horizon - 70 * k, 40 * k, 74 * k); }
        ridge(horizon + 6, 5, tone(ground, 0.2), 70);
      } else {
        ridge(horizon - 60, 30, tone('#b5662c', 0.45), 24); ridge(horizon - 26, 22, tone('#c9862f', 0.25), 20);
        for (let i = 0; i < 46; i++) { const x = random() * w, depth = random(), wide = 4 + depth * 12; ctx.fillStyle = tone('#e9e4d6', 0.5 - depth * 0.5); ctx.fillRect(x, 0, wide, horizon + 10 + depth * 70); ctx.fillStyle = 'rgba(40,36,30,0.6)'; for (let k = 0; k < 9; k++) ctx.fillRect(x, random() * (horizon + 40), wide * (0.3 + random() * 0.5), 2 + random() * 3); }
        for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(${200 + random() * 40},${120 + random() * 70},40,${0.3 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * horizon * 0.7, 12 + random() * 30, 6 + random() * 12, random() * 3, 0, 7); ctx.fill(); }
      }
      // Painted ground running forward to meet the real one.
      const land = ctx.createLinearGradient(0, horizon + 30, 0, h);
      land.addColorStop(0, `#${new THREE.Color(ground).lerp(haze, 0.3).getHexString()}00`); land.addColorStop(0.5, `#${new THREE.Color(ground).lerp(haze, 0.12).getHexString()}`); land.addColorStop(1, ground);
      ctx.fillStyle = land; ctx.fillRect(0, horizon + 30, w, h);
      // Age: fading, yellowed varnish, flaking and a water stain.
      ctx.fillStyle = `rgba(222,212,190,${dust * 0.3})`; ctx.fillRect(0, 0, w, h);
      if (dust > 0.45) {
        for (let i = 0; i < (dust - 0.45) * 60; i++) { ctx.fillStyle = `rgba(226,220,205,${0.5 + random() * 0.4})`; ctx.beginPath(); const x = random() * w, y = random() * h * 0.8; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) ctx.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 36); ctx.closePath(); ctx.fill(); }
        const sx = random() * w; const stain = ctx.createLinearGradient(sx, 0, sx + 60, 0); stain.addColorStop(0, 'rgba(110,85,50,0)'); stain.addColorStop(0.5, 'rgba(110,85,50,0.35)'); stain.addColorStop(1, 'rgba(110,85,50,0)'); ctx.fillStyle = stain; ctx.fillRect(sx, 0, 60, h * 0.8);
      }
    });
    const backdropGeometry = new THREE.PlaneGeometry(half * 2, openTop - caseFloor + 0.4, 40, 1);
    const bp = backdropGeometry.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setZ(i, 1.9 * Math.pow(Math.abs(bp.getX(i)) / half, 2.6));
    backdropGeometry.computeVertexNormals();
    const warmLight = new THREE.Color().setHSL(mix(0.58, 0.09, mood.warmth), 0.6, 0.8);
    const backdrop = s.mesh(backdropGeometry, new THREE.MeshStandardMaterial({ map: backdropMap, emissiveMap: backdropMap, emissive: new THREE.Color('#ffffff').lerp(warmLight, 0.5), emissiveIntensity: 0.3, roughness: 1 }), [0, (openTop + caseFloor) / 2 + 0.1, backZ + 0.15]);
    backdrop.castShadow = false;

    // Modelled ground and foreground dressing.
    const earth = s.material(ground, { roughness: 1 });
    s.box([half * 2, 0.06, frontZ - backZ - 0.1], [0, caseFloor + 0.03, (frontZ + backZ) / 2], earth);
    const groundY = caseFloor + 0.06;
    const amount = mix(0.35, 1, mood.density);
    const keepClear = (x: number, z: number) => Math.hypot(x, z + 2.7) < 1.6 || Math.hypot(x + 3, z + 3.2) < 1.0 || Math.hypot(x - 3, z + 2.9) < 1.0;
    const spot = (): [number, number] => { for (let i = 0; i < 20; i++) { const x = (random() - 0.5) * half * 1.9, z = backZ + 0.5 + random() * (frontZ - backZ - 0.8); if (!keepClear(x, z) && z > backZ + 0.3 + 1.9 * Math.pow(Math.abs(x) / half, 2.6)) return [x, z]; } return [half * 0.8 * (random() > 0.5 ? 1 : -1), frontZ - 0.7]; };
    for (let i = 0; i < 9; i++) { const [x, z] = spot(); const mound = s.mesh(lump(random, 0.2, 2), earth, [x, groundY - 0.05, z]); mound.position.x = Math.max(-half + 1.2, Math.min(half - 1.2, x)); mound.position.z = Math.min(frontZ - 0.9, Math.max(backZ + 1.4, z)); mound.scale.set(0.5 + random() * 0.6, 0.08 + random() * 0.14, 0.4 + random() * 0.4); }
    const rockColour = { savanna: '#8f8672', rainforest: '#4f5a48', arctic: '#b9d4e4', desert: '#a9583a', woodland: '#7a7468' }[a.habitat];
    const rock = s.material(rockColour, { roughness: a.habitat === 'arctic' ? 0.3 : 0.95, flatShading: true });
    for (let i = 0; i < Math.round(amount * (a.habitat === 'desert' || a.habitat === 'arctic' ? 12 : 6)); i++) {
      const [x, z] = spot(); const size = 0.18 + random() * (a.habitat === 'desert' ? 0.5 : 0.35);
      const stone = a.habitat === 'arctic' ? s.box([size * 2, size * 1.2, size * 1.5], [x, groundY + size * 0.4, z], rock) : s.mesh(lump(random, 0.22, 1), rock, [x, groundY + size * 0.3, z]);
      if (a.habitat === 'arctic') stone.rotation.set(random() * 0.4, random() * 3, random() * 0.4); else stone.scale.set(size * 1.3, size, size);
    }
    const blades: { at: P3; size: number; color: string }[] = [];
    const palette = { savanna: ['#d1b565', '#b89a4c', '#e2cd86'], rainforest: ['#3f6a34', '#5c8a3e', '#2c4f2c'], arctic: ['#f4f7f8', '#dfe9ee', '#ffffff'], desert: ['#b9a05c', '#8f8a52', '#c9b072'], woodland: ['#c9782c', '#d99a2f', '#9a5a26'] }[a.habitat];
    const tufts = Math.round(amount * { savanna: 150, rainforest: 90, arctic: 0, desert: 22, woodland: 60 }[a.habitat]);
    for (let i = 0; i < tufts; i++) { const [x, z] = spot(); for (let k = 0; k < 4; k++) blades.push({ at: [x + (random() - 0.5) * 0.16, groundY, z + (random() - 0.5) * 0.16], size: 0.5 + random() * 0.9, color: palette[Math.floor(random() * 3)] }); }
    if (blades.length) {
      const tall = a.habitat === 'rainforest' ? 0.5 : a.habitat === 'woodland' ? 0.3 : 0.62;
      const grass = s.scatter(new THREE.ConeGeometry(a.habitat === 'rainforest' ? 0.06 : 0.018, tall, 4), s.material('#ffffff', { roughness: 1 }), blades);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      blades.forEach((blade, i) => { q.setFromEuler(e.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7)); m.compose(new THREE.Vector3(blade.at[0], groundY + tall * blade.size * 0.45, blade.at[2]), q, new THREE.Vector3(1, blade.size, 1)); grass.setMatrixAt(i, m); });
      grass.castShadow = false;
    }
    if (a.habitat === 'savanna') {
      const [x, z] = [-half * 0.72, backZ + 1.9];
      s.mesh(lump(random, 0.16, 2), s.material('#a9794a', { roughness: 1 }), [x, groundY + 0.55, z]).scale.set(0.42, 1.0, 0.4);
      s.mesh(lump(random, 0.2, 2), s.material('#a9794a', { roughness: 1 }), [x + 0.35, groundY + 0.25, z + 0.2]).scale.set(0.3, 0.5, 0.3);
    } else if (a.habitat === 'rainforest') {
      const bark = s.material('#3c3324', { roughness: 1 });
      for (const [x, z] of [[-half * 0.8, backZ + 2.0], [half * 0.75, backZ + 1.7]] as const) { s.cylinder(0.24, 0.34, openTop - groundY, [x, (openTop + groundY) / 2, z], bark, 10); for (let k = 0; k < 4; k++) { const angle = k * 1.6 + random(); s.mesh(taper([[x, groundY + 1.0, z], [x + Math.cos(angle) * 0.4, groundY + 0.4, z + Math.sin(angle) * 0.4], [x + Math.cos(angle) * 0.85, groundY, z + Math.sin(angle) * 0.85]], (t) => 0.2 * (1 - t * 0.7), { segments: 8, sides: 6, flat: 0.35 }), bark); } }
      for (let i = 0; i < Math.round(amount * 8); i++) { const x = (random() - 0.5) * half * 1.8, z = backZ + 1.2 + random() * 2; quiet(s.tube([[x, openTop, z], [x + (random() - 0.5) * 0.4, openTop - 0.9, z + 0.1], [x + (random() - 0.5) * 0.6, openTop - 1.5 - random() * 1.2, z]], 0.02, s.material('#3a4a26'))); }
      for (let i = 0; i < Math.round(amount * 14); i++) { const [x, z] = spot(); const leaf = s.ball([0.34, 0.02, 0.15], [x, groundY + 0.25 + random() * 0.4, z], s.material(palette[i % 3], { roughness: 0.6 }), 8); leaf.rotation.set(random() - 0.5, random() * 6, random() - 0.5); }
    } else if (a.habitat === 'woodland') {
      const birch = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTexture(64, 256, (ctx, w, h) => { ctx.fillStyle = '#ece8dc'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2c2924'; for (let k = 0; k < 26; k++) ctx.fillRect(random() * w, random() * h, 6 + random() * 22, 2 + random() * 4); }) });
      for (let i = 0; i < 5; i++) { const x = (i - 2) * half * 0.42 + (random() - 0.5) * 0.5, z = backZ + 0.9 + random() * 0.9 + 1.9 * Math.pow(Math.abs(x) / half, 2.6); if (Math.abs(x) < 1.2) continue; const trunk = s.cylinder(0.07 + random() * 0.04, 0.1 + random() * 0.05, openTop - groundY, [x, (openTop + groundY) / 2, z], birch, 10); trunk.rotation.z = (random() - 0.5) * 0.08; }
      const litter = Array.from({ length: Math.round(amount * 260) }, () => { const [x, z] = spot(); return { at: [x + (random() - 0.5) * 0.5, groundY + 0.008, z + (random() - 0.5) * 0.5] as P3, size: 0.6 + random(), color: palette[Math.floor(random() * 3)] }; });
      s.scatter(new THREE.BoxGeometry(0.09, 0.006, 0.06), s.material('#ffffff', { roughness: 1 }), litter).castShadow = false;
    } else if (a.habitat === 'desert') {
      const dead = s.material('#b9ab94', { roughness: 1 });
      const x = half * 0.6, z = backZ + 2.3;
      s.mesh(taper([[x, groundY, z], [x + 0.2, groundY + 0.6, z + 0.05], [x + 0.75, groundY + 1.0, z - 0.1], [x + 1.2, groundY + 0.9, z + 0.1]], (t) => 0.09 * (1 - t * 0.8), { segments: 12, sides: 6 }), dead);
      s.mesh(taper([[x + 0.3, groundY + 0.75, z], [x + 0.2, groundY + 1.3, z - 0.2], [x - 0.1, groundY + 1.6, z - 0.25]], (t) => 0.05 * (1 - t * 0.8), { segments: 8, sides: 5 }), dead);
    } else {
      for (let i = 0; i < Math.round(amount * 7); i++) { const [x, z] = spot(); s.mesh(lump(random, 0.1, 2), s.material('#f6f9fa', { roughness: 0.8 }), [Math.max(-half + 1.1, Math.min(half - 1.1, x)), groundY, Math.min(frontZ - 0.8, Math.max(backZ + 1.4, z))]).scale.set(0.5 + random() * 0.5, 0.22 + random() * 0.2, 0.4 + random() * 0.35); }
    }

    // Glass.
    if (a.glass !== 'gone' && a.state !== 'restoration') {
      const pane = new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: mix(0.07, 0.16, dust), roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      quiet(s.mesh(new THREE.PlaneGeometry(half * 2, openTop - caseFloor), pane, [0, (openTop + caseFloor) / 2, frontZ]));
      for (const x of [-1, 1]) { const side = quiet(s.mesh(new THREE.PlaneGeometry(frontZ - backZ, openTop - caseFloor), pane, [x * half, (openTop + caseFloor) / 2, (frontZ + backZ) / 2])); side.rotation.y = Math.PI / 2; }
      for (const x of [-half / 3, half / 3]) quiet(s.box([0.05, openTop - caseFloor, 0.05], [x, (openTop + caseFloor) / 2, frontZ], a.era === 'victorian' ? frame : trim));
      const smear = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 3; i++) { const streak = quiet(s.mesh(new THREE.PlaneGeometry(0.25 + random() * 0.3, 3.6), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false }), [(random() - 0.5) * half * 1.6, (openTop + caseFloor) / 2, frontZ + 0.01])); streak.rotation.z = -0.35; }
      if (a.glass === 'handprints') for (let i = 0; i < 22; i++) { const x = (random() - 0.5) * half * 1.8, y = caseFloor + 0.25 + random() * 0.8; quiet(s.mesh(new THREE.CircleGeometry(0.05, 10), smear, [x, y, frontZ + 0.012])); for (let f = 0; f < 4; f++) quiet(s.mesh(new THREE.PlaneGeometry(0.018, 0.07), smear, [x - 0.035 + f * 0.024, y + 0.075, frontZ + 0.012])); }
      if (a.glass === 'cracked') {
        const line = new THREE.MeshStandardMaterial({ color: '#f6fbfb', transparent: true, opacity: 0.75, depthWrite: false });
        const cx = half * 0.62 * (random() > 0.5 ? 1 : -1), cy = caseFloor + 1.0 + random() * 1.2;
        for (let i = 0; i < 9; i++) { const angle = i * 0.7 + random() * 0.4, length = 0.5 + random() * 1.6; const crack = quiet(s.mesh(new THREE.PlaneGeometry(length, 0.014), line, [cx + Math.cos(angle) * length / 2, cy + Math.sin(angle) * length / 2, frontZ + 0.012])); crack.rotation.z = angle; }
        quiet(s.mesh(new THREE.CircleGeometry(0.07, 8), line, [cx, cy, frontZ + 0.013]));
      }
    }

    // Hidden strip light: a glowing tube behind the fascia and two soft lamps inside.
    const tube = quiet(s.box([half * 2 - 0.4, 0.07, 0.14], [0, openTop - 0.05, frontZ - 0.3], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: warmLight, emissiveIntensity: 1.4 })));
    const lamps = [-1, 1].map((x) => { const lamp = new THREE.PointLight(warmLight, 16, 11, 1.6); lamp.position.set(x * half * 0.45, openTop - 0.3, frontZ - 0.6); root.add(lamp); return lamp; });

    // ---- Label rail and bench --------------------------------------------------------------
    const railZ = frontZ + 0.55;
    for (const x of [-3.3, -1.1, 1.1, 3.3]) { s.cylinder(0.025, 0.03, 0.95, [x, 0.475, railZ], trim, 10); s.cylinder(0.07, 0.08, 0.03, [x, 0.015, railZ], trim, 14); }
    s.rod([-3.5, 0.95, railZ], [3.5, 0.95, railZ], 0.022, trim);
    const board = s.box([1.9, 0.03, 0.5], [0, 1.03, railZ + 0.02], frame);
    board.rotation.x = 0.7;
    const plate = s.label(LABELS[a.label], 1.75, 0.38, [0, 1.045, railZ + 0.035], '#2e2210', a.era === 'seventies' ? '#f1ecdc' : '#c9a54f');
    plate.rotation.x = -Math.PI / 2 + 0.7;
    if (a.state === 'abandoned') { plate.rotation.z = 0.22; plate.position.x = 0.15; }

    const benchZ = 2.0;
    const sheeted = a.state === 'restoration';
    if (a.era === 'seventies') for (const x of [-0.75, 0.75]) s.box([1.3, 0.42, 0.7], [x, 0.21, benchZ], s.material('#c8622a', { roughness: 0.6 }));
    else {
      s.box([2.8, 0.1, 0.62], [0, 0.46, benchZ], a.era === 'deco' ? s.material('#2a2422', { roughness: 0.4 }) : frame);
      for (const x of [-1.2, 1.2]) for (const z of [-0.22, 0.22]) s.cylinder(0.045, 0.035, 0.42, [x, 0.21, benchZ + z], a.era === 'deco' ? trim : frame, 10);
      if (a.era === 'victorian') for (const x of [-1.4, 1.4]) s.ring(0.16, 0.025, [x, 0.6, benchZ], frame, Math.PI).rotation.y = Math.PI / 2;
    }
    if (sheeted) { const sheet = s.mesh(lump(random, 0.05, 3), s.material('#e6e2d6', { roughness: 1 }), [0, 0.3, benchZ]); sheet.scale.set(1.65, 0.34, 0.5); }
    const seatY = a.era === 'seventies' ? 0.42 : 0.51;
    const bob: THREE.Object3D[] = [];
    if (!sheeted) {
      if (a.bench === 'coat') {
        s.box([0.6, 0.09, 0.42], [-0.7, seatY + 0.045, benchZ], s.material('#3a3d48', { roughness: 1 }));
        s.box([0.5, 0.05, 0.36], [-0.72, seatY + 0.11, benchZ + 0.01], s.material('#444856', { roughness: 1 }));
        s.rod([0.1, seatY + 0.03, benchZ + 0.25], [1.1, seatY + 0.03, benchZ + 0.1], 0.03, s.material('#1c1c20'), 0.012);
        s.ring(0.06, 0.012, [1.16, seatY + 0.03, benchZ + 0.09], s.material('#6a4526'), Math.PI).rotation.x = Math.PI / 2;
      } else if (a.bench === 'sketchbook') {
        const page = s.label('~ ~  ~', 0.5, 0.36, [0.5, seatY + 0.012, benchZ], '#6c6c6c', '#f4f0e2');
        page.rotation.set(-Math.PI / 2, 0, 0.2);
        s.box([0.2, 0.03, 0.09], [0.95, seatY + 0.015, benchZ + 0.1], s.material('#8a8f94', { metalness: 0.6 }));
        for (let i = 0; i < 4; i++) s.rod([0.1 + i * 0.03, seatY + 0.01, benchZ + 0.2], [0.26 + i * 0.03, seatY + 0.01, benchZ + 0.1 + i * 0.02], 0.006, s.material(['#c2202b', '#1f4fa3', '#2a2a2a', '#d9a521'][i]));
      } else if (a.bench === 'balloon') {
        const group = new THREE.Group();
        group.position.set(1.25, seatY, benchZ);
        const colour = mood.cheer > 0.5 ? '#e23b3b' : '#7c8aa8';
        const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.25 }));
        balloon.scale.y = 1.2; balloon.position.y = mix(0.35, 1.35, mood.cheer); balloon.castShadow = true;
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, balloon.position.y - 0.2, 4), new THREE.MeshStandardMaterial({ color: '#eeeeee' }));
        string.position.y = (balloon.position.y - 0.2) / 2;
        group.add(balloon, string); root.add(group); bob.push(group);
      } else if (a.bench === 'flowers') {
        for (let i = 0; i < 7; i++) { s.rod([-0.2, seatY + 0.02, benchZ + (i - 3) * 0.015], [0.25, seatY + 0.03 + random() * 0.03, benchZ + (i - 3) * 0.05], 0.006, s.material('#4f7a3a')); s.ball([0.045, 0.045, 0.045], [0.27, seatY + 0.04 + random() * 0.03, benchZ + (i - 3) * 0.05], s.material(mood.cheer > 0.5 ? ['#f2c230', '#e8663a', '#f1ece2'][i % 3] : ['#f1ece2', '#b9a9c9', '#e9e2d0'][i % 3]), 8); }
        s.box([0.16, 0.012, 0.1], [-0.12, seatY + 0.03, benchZ], s.material('#e9e2d0'));
      }
    }

    // ---- Walls: pictures, trophies, side cabinets ------------------------------------------
    const picture = (x: number, y: number, z: number, w: number, h: number, onLeft: boolean) => {
      const map = canvasTexture(128, 128, (ctx, cw, ch) => { ctx.fillStyle = '#e4dcc4'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#6a5a3c'; ctx.lineWidth = 1.5; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(random() * cw, random() * ch); ctx.bezierCurveTo(random() * cw, random() * ch, random() * cw, random() * ch, random() * cw, random() * ch); ctx.stroke(); } ctx.fillStyle = 'rgba(90,110,90,0.35)'; ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, 30, 22, random() * 3, 0, 7); ctx.fill(); });
      const frameMesh = s.box(onLeft ? [0.06, h + 0.16, w + 0.16] : [w + 0.16, h + 0.16, 0.06], [x, y, z], a.era === 'seventies' ? trim : frame);
      frameMesh.castShadow = false;
      const print = quiet(s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), onLeft ? [x + 0.035, y, z] : [x, y, z + 0.035]));
      if (onLeft) print.rotation.y = Math.PI / 2;
      if (a.state === 'abandoned') { frameMesh.rotation[onLeft ? 'x' : 'z'] = 0.12; print.rotation[onLeft ? 'x' : 'z'] = 0.12; }
    };
    picture(leftX + 0.04, 3.0, -2.4, 1.3, 1.0, true);
    picture(leftX + 0.04, 3.1, 0.2, 0.9, 1.3, true);
    if (mood.density > 0.3) picture(leftX + 0.04, 2.9, 2.6, 1.4, 0.9, true);
    for (const x of [-5.45, 5.45]) picture(x, 3.2, backZ + 0.04, 0.8, 1.1, false);
    if (mood.density > 0.45 && a.era !== 'seventies') {
      // A pair of antlers on a shield high on the left wall.
      const bone = s.material('#d9cdb0', { roughness: 0.8 });
      s.box([0.06, 0.6, 0.45], [leftX + 0.04, 4.5, 1.4], frame);
      for (const side of [-1, 1]) { s.mesh(taper([[leftX + 0.1, 4.6, 1.4 + side * 0.1], [leftX + 0.4, 4.9, 1.4 + side * 0.4], [leftX + 0.5, 5.4, 1.4 + side * 0.65], [leftX + 0.35, 5.8, 1.4 + side * 0.6]], (t) => 0.045 * (1 - t * 0.7), { segments: 12, sides: 6 }), bone); for (let k = 0; k < 3; k++) s.rod([leftX + 0.4 + k * 0.03, 4.95 + k * 0.25, 1.4 + side * (0.42 + k * 0.1)], [leftX + 0.75 + k * 0.02, 5.2 + k * 0.25, 1.4 + side * (0.45 + k * 0.1)], 0.028, bone, 0.008); }
    }
    if (a.era === 'seventies') { s.cylinder(0.09, 0.09, 0.5, [5.9, 1.4, backZ + 0.14], s.material('#c2202b', { roughness: 0.4 }), 12); s.label('EXIT', 0.7, 0.26, [-5.45, 5.0, backZ + 0.05], '#f4f4f4', '#2e7d4f'); }
    // Radiator under the left wall pictures.
    for (let i = 0; i < 9; i++) s.box([0.12, 0.7, 0.07], [leftX + 0.16, 0.45, -1.5 + i * 0.1], s.material(a.era === 'seventies' ? '#cfcabb' : '#7b7a70', { metalness: 0.3, roughness: 0.5 }));

    // ---- What is going on ------------------------------------------------------------------
    const stanchion = (x: number, z: number, fallen = false) => {
      const post = s.cylinder(0.03, 0.03, 0.95, fallen ? [x, 0.04, z] : [x, 0.475, z], trim, 10);
      if (fallen) post.rotation.z = Math.PI / 2;
      else { s.cylinder(0.16, 0.18, 0.04, [x, 0.02, z], trim, 16); s.ball([0.05, 0.05, 0.05], [x, 0.97, z], trim, 10); }
    };
    const rope = s.material(a.era === 'seventies' ? '#2b2b2b' : '#7a1f24', { roughness: 0.9 });
    if (a.state === 'open' || a.state === 'afterhours') {
      for (const x of [4.6, 5.9]) stanchion(x, 0.2);
      s.tube([[4.6, 0.92, 0.2], [5.25, 0.7, 0.2], [5.9, 0.92, 0.2]], 0.025, rope);
    }
    if (a.state === 'restoration') {
      const pine = s.material('#c2a36e', { roughness: 0.9 });
      const lx = -2.4, lz = frontZ + 1.3;
      for (const x of [-0.3, 0.3]) { s.rod([lx + x, 0, lz + 0.5], [lx + x * 0.6, 2.4, lz], 0.03, pine); s.rod([lx + x, 0, lz - 0.6], [lx + x * 0.6, 2.4, lz], 0.03, pine); }
      for (let i = 1; i < 7; i++) { const t = i / 7; s.box([0.6 - t * 0.22, 0.03, 0.12], [lx, 2.4 * t, lz + 0.5 * (1 - t)], pine); }
      for (let i = 0; i < 3; i++) { const x = lx + 1.0 + i * 0.35, z = lz + (random() - 0.5) * 0.6; s.cylinder(0.11, 0.11, 0.24, [x, 0.12, z], s.material('#c9ccce', { metalness: 0.7, roughness: 0.4 }), 14); s.cylinder(0.1, 0.1, 0.01, [x, 0.245, z], s.material([ground, '#7fb0d6', '#f2ede0'][i], { roughness: 0.3 }), 14); }
      const sheet = s.box([3.2, 0.01, 2.2], [-1.2, 0.012, lz + 0.2], s.material('#e3dfd2', { roughness: 1 }));
      sheet.rotation.y = 0.12;
      const sign = s.label('GALLERY CLOSED', 1.1, 0.3, [3.6, 1.05, 1.2], '#f4f1e6', '#8c1c13'); sign.rotation.y = -0.2;
      stanchion(3.6, 1.2);
    } else if (a.state === 'abandoned') {
      const debris = Array.from({ length: 90 }, () => ({ at: [(random() - 0.5) * 11.5, 0.012, backZ + 3.8 + random() * 5.4] as P3, size: 0.5 + random() * 1.5, color: random() > 0.45 ? '#8a6a3a' : '#d9d3c4' }));
      s.scatter(new THREE.BoxGeometry(0.1, 0.012, 0.07), s.material('#ffffff', { roughness: 1 }), debris).castShadow = false;
      for (let i = 0; i < 5; i++) { const chunk = s.mesh(lump(random, 0.3, 1), s.material('#d9d3c4', { roughness: 1, flatShading: true }), [leftX + 0.5 + random() * 1.6, 0.05, -2 + random() * 5]); chunk.scale.set(0.12 + random() * 0.2, 0.05, 0.1 + random() * 0.16); }
      s.cylinder(0.18, 0.14, 0.28, [2.6, 0.14, 0.9], s.material('#6a7f8c', { metalness: 0.5, roughness: 0.5 }), 14);
      s.cylinder(0.6, 0.6, 0.004, [2.5, 0.01, 1.0], new THREE.MeshStandardMaterial({ color: '#3d4a52', roughness: 0.08, transparent: true, opacity: 0.55, depthWrite: false }), 20);
      stanchion(4.8, 0.6, true); stanchion(5.6, 1.8);
      const patch = quiet(s.mesh(new THREE.PlaneGeometry(1.8, 1.3), s.material('#8f8a7c', { roughness: 1 }), [leftX + 0.012, 4.3, -0.6])); patch.rotation.y = Math.PI / 2;
    } else if (a.state === 'school') {
      const colours = ['#d9482b', '#2f6fb3', '#e8b82a', '#3f9a55', '#8a4fa8'];
      for (let i = 0; i < 6; i++) { const angle = -1.1 + i * 0.44, x = Math.sin(angle) * 2.6, z = 0.2 + Math.cos(angle) * 1.0 - 0.6; if (Math.abs(x) < 0.01) continue; s.cylinder(0.17, 0.15, 0.04, [x, 0.3, z], s.material(colours[i % 5], { roughness: 0.5 }), 14); for (let k = 0; k < 3; k++) s.rod([x + Math.cos(k * 2.1) * 0.12, 0, z + Math.sin(k * 2.1) * 0.12], [x + Math.cos(k * 2.1) * 0.08, 0.3, z + Math.sin(k * 2.1) * 0.08], 0.015, trim); }
      for (let i = 0; i < 4; i++) { const sheet = s.label('1.  2.  3.', 0.3, 0.4, [-3 + random() * 6, 0.02, 0.4 + random() * 1.2], '#55606c', '#f6f3ea'); sheet.rotation.set(-Math.PI / 2, 0, random() * 3); sheet.castShadow = false; }
      const bag = s.mesh(lump(random, 0.08, 2), s.material(colours[Math.floor(random() * 5)], { roughness: 0.8 }), [3.4, 0.2, 0.9]); bag.scale.set(0.2, 0.22, 0.13);
      for (let i = 0; i < 5; i++) s.rod([-1 + i * 0.07, 0.012, 0.9 + i * 0.05], [-0.9 + i * 0.07, 0.012, 1.0 + random() * 0.1], 0.008, s.material(colours[i]));
    }
    let torch: THREE.SpotLight | null = null;
    if (a.state === 'afterhours') {
      const steel = s.material('#3a3d42', { metalness: 0.5, roughness: 0.5 });
      const cx = 4.6, cz = 2.6;
      s.box([0.46, 0.05, 0.46], [cx, 0.46, cz], steel); s.box([0.46, 0.5, 0.04], [cx + 0.0, 0.74, cz + 0.22], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([cx + x * 0.2, 0, cz + z * 0.2], [cx + x * 0.2, 0.46, cz + z * 0.2], 0.015, steel);
      s.box([0.5, 0.36, 0.06], [cx, 0.78, cz + 0.26], s.material('#2a3a5a', { roughness: 1 }));
      const body = s.cylinder(0.035, 0.05, 0.26, [2.2, 0.05, 1.0], s.material('#1c1c1e', { roughness: 0.4 }), 10);
      body.rotation.set(0, 0.5, Math.PI / 2);
      const beam = quiet(s.mesh(new THREE.ConeGeometry(0.7, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), [0.75, 0.12, 0.2]));
      beam.rotation.set(0, 0.5, -Math.PI / 2 + 0.03);
      torch = new THREE.SpotLight('#fff0c0', 26, 9, 0.4, 0.6, 1.4);
      torch.position.set(2.1, 0.08, 0.95); torch.target.position.set(-1.0, 0.9, -1.2); root.add(torch, torch.target);
      const sign = new THREE.Group();
      for (const side of [-1, 1]) { const panel = s.box([0.34, 0.62, 0.02], [0, 0.3, side * 0.1], s.material('#f2c230', { roughness: 0.5 })); panel.rotation.x = side * -0.3; sign.add(panel); }
      sign.position.set(-3.6, 0, 2.6); sign.rotation.y = 0.5; root.add(sign);
      s.cylinder(0.8, 0.8, 0.003, [-3.3, 0.009, 1.7], new THREE.MeshStandardMaterial({ color: '#40464a', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }), 20);
    }

    // ---- Where the cast stands --------------------------------------------------------------
    const specs = [
      { x: 0, y: groundY, z: -2.7, h: 2.7, r: 1.45, turn: 0, plinth: false },
      { x: -3.0, y: groundY, z: -3.15, h: 1.9, r: 0.9, turn: 0.35, plinth: false },
      { x: 3.0, y: groundY, z: -2.85, h: 1.9, r: 0.9, turn: -0.3, plinth: false },
      { x: -5.1, y: 1.0, z: 0.7, h: 1.35, r: 0.5, turn: 0.5, plinth: true },
      { x: 5.25, y: 1.0, z: 2.9, h: 1.35, r: 0.5, turn: -0.2, plinth: true },
      { x: -3.4, y: 1.0, z: 3.6, h: 1.25, r: 0.5, turn: 0.3, plinth: true },
    ];
    const built = new Set<number>();
    world.capacity = specs.length;
    world.place = (items: readonly Placeable[]) => {
      const bounds = new THREE.Box3(new THREE.Vector3(leftX - 0.2, -0.3, backZ - 0.2), new THREE.Vector3(6.3, wallH, 4.8));
      items.forEach((item, index) => {
        const spec = specs[index % specs.length];
        const scale = Math.min(spec.h / Math.max(item.height, 0.05), spec.r / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(spec.x, spec.y, spec.z);
        item.holder.rotation.y = spec.turn + (random() - 0.5) * 0.2;
        item.holder.updateMatrixWorld(true);
        if (spec.plinth && !built.has(index % specs.length)) {
          built.add(index % specs.length);
          s.box([1.1, 0.12, 1.1], [spec.x, 0.06, spec.z], frame);
          s.box([0.96, 0.8, 0.96], [spec.x, 0.52, spec.z], a.era === 'seventies' ? s.material('#e2dccb') : frame);
          s.box([1.08, 0.08, 1.08], [spec.x, 0.96, spec.z], a.era === 'victorian' ? frame : trim);
          const tag = s.label(`No. ${12 + index * 7}`, 0.4, 0.14, [spec.x, 0.62, spec.z + 0.485], '#2e2210', a.era === 'seventies' ? '#f1ecdc' : '#c9a54f');
          tag.castShadow = false;
        }
        bounds.union(visibleBounds(item.holder));
      });
      root.updateMatrixWorld(true);
      const camera = world.camera as THREE.OrthographicCamera;
      const centre = bounds.getCenter(new THREE.Vector3());
      const yawR = yaw * Math.PI / 180, pitchR = pitch * Math.PI / 180;
      const direction = new THREE.Vector3(Math.sin(yawR) * Math.cos(pitchR), Math.sin(pitchR), Math.cos(yawR) * Math.cos(pitchR));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        projection.expandByPoint(new THREE.Vector2(p.x, p.y));
      }
      const middle = projection.getCenter(new THREE.Vector2()), size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.5;
      camera.translateX(middle.x); camera.translateY(middle.y);
      camera.left = camera.bottom = -extent; camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      const key = world.keyLight;
      if (key) {
        const span = bounds.getSize(new THREE.Vector3()).length();
        key.target.position.copy(centre);
        key.position.copy(centre).add(new THREE.Vector3(-6 + mood.daylight * 10, 12, 9).normalize().multiplyScalar(span * 1.5));
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -span * 0.6; shadow.right = shadow.top = span * 0.6;
        shadow.near = 0.1; shadow.far = span * 4;
        shadow.updateProjectionMatrix();
      }
    };

    const flicker = mix(0, 0.35, mood.energy) * (a.state === 'abandoned' ? 1.6 : 1);
    const tubePaint = tube.material as THREE.MeshStandardMaterial;
    world.update = (_dt, time) => {
      const dip = flicker * (Math.sin(time * 31) * Math.sin(time * 7.3) > 0.72 ? 1 : 0.08 * (1 + Math.sin(time * 2.3)));
      for (const lamp of lamps) lamp.intensity = 16 * (1 - dip);
      tubePaint.emissiveIntensity = 1.4 * (1 - dip);
      for (const item of bob) { item.rotation.z = Math.sin(time * 0.9) * 0.08; item.rotation.x = Math.sin(time * 0.7 + 1) * 0.06; }
      if (torch) torch.intensity = 26 * (1 - 0.1 * Math.sin(time * 5));
    };
    return world;
  },
});

import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

const WALLS = {
  magnolia: 'Landlord magnolia, scuffed at hip height.',
  teal: 'A deep teal someone painted themselves and never finished cutting in.',
  wallpaper: 'Old striped wallpaper lifting at the seams.',
  plaster: 'Bare pinkish plaster, half-stripped and left.',
  white: 'Fresh cheap white over woodchip.',
} as const;
const WALL_TONES: Record<keyof typeof WALLS, string> = { magnolia: '#cdbfa2', teal: '#4d7c82', wallpaper: '#b7a78c', plaster: '#b89d90', white: '#cfcec8' };

export default defineWorld({
  questions: {
    outside: choice('What is outside the window?', {
      neighbour: 'A dark block opposite with one neighbour’s window lit, and a sodium streetlight.',
      alone: 'Every window opposite is dark; only the streetlight is awake.',
      rain: 'Rain running down the glass, the streetlight smeared into streaks.',
      party: 'Several lit windows in party colours across the way, other people’s night.',
      snow: 'Snow falling through the cone of the streetlight.',
      predawn: 'The sky going pale behind the rooftops: it is nearly morning.',
    }),
    covering: choice('What covers the window?', {
      bare: 'Nothing: bare glass.',
      curtains: 'Thin curtains pushed halfway open.',
      blind: 'A venetian blind hanging crooked with a few bent slats.',
      sheet: 'A bedsheet pinned up over half of it.',
    }),
    bed: choice('What is the bed under the window like?', {
      lump: 'A mattress on the floor with someone under the duvet, turned to the wall.',
      empty: 'A mattress on the floor, duvet thrown back, nobody in it.',
      sofa: 'A sofa bed that never gets folded away.',
      bare: 'No bed yet: a sleeping bag and one pillow on the bare floor.',
    }),
    screen: choice('Where does the blue light come from?', {
      tv: 'A television on the floor asking if anyone is still watching.',
      phone: 'A phone glowing on the pillow.',
      monitor: 'A monitor left on at the end of the kitchen counter.',
      fishtank: 'A small fish tank humming on a crate.',
      none: 'Nowhere: only the lamp and the street.',
    }),
    kitchen: choice('What state is the kitchenette in?', {
      bare: 'Spotless and barely used, one plate on the rack.',
      tea: 'A kettle just boiled and one mug steaming on the counter.',
      dishes: 'A sink stacked with a week of dishes and bottles along the counter.',
      fridge: 'The fridge door standing open, its cold light across the floor.',
    }),
    walls: choice('What are the walls like?', WALLS),
    floor: choice('What is the floor?', {
      boards: 'Bare wooden floorboards.',
      laminate: 'Grey rental laminate.',
      carpet: 'Worn beige carpet with a history.',
      lino: 'Checked vinyl lino curling at the edges.',
    }),
    pinned: choice('What is on the walls?', {
      posters: 'A few band and film posters tacked up.',
      lights: 'A string of fairy lights and a row of instant photos.',
      notes: 'A calendar, takeaway menus and a wall clock.',
      nothing: 'Nothing but a nail and a paler rectangle where something used to hang.',
    }),
    belongings: choice('What else is in the corner?', {
      boxes: 'Moving boxes, still taped, weeks after the move.',
      suitcase: 'An open suitcase being lived out of.',
      rail: 'A clothes rail instead of a wardrobe.',
      bike: 'A bicycle leaning on the wall because there is nowhere else.',
      none: 'Nothing: the corner is empty.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const floorTone = { boards: '#8b6b4e', laminate: '#8f8d8b', carpet: '#8e8170', lino: '#9a968a' }[a.floor];
    const { art: s, world } = diorama(context, {
      background: '#8087ad', floor: floorTone, width: 13, depth: 10, maxHeight: 2.9, radius: 1.45, pitch: 31, yaw: 31,
      slots: [[1.3, 1.4, 0, 1.2], [-3.0, 0.5, 0, 0.8], [4.8, 0.5, 0, 0.85], [3.9, 3.6, 0, 0.7], [-0.9, 3.8, 0, 0.7], [-5.72, -0.15, 1.97, 0.42]],
    });
    const root = s.root;
    const predawn = a.outside === 'predawn';
    world.background.set(predawn ? '#9c9bb5' : '#7d84ab').lerp(new THREE.Color('#a08a9c'), mood.warmth * 0.35);

    // ----- Light: dusk-toned, never black -----
    root.traverse((node) => {
      const hemi = node as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.color.set('#a9b2ff'); hemi.groundColor.set('#4b4763'); hemi.intensity = predawn ? 0.98 : 0.84; }
      const dir = node as THREE.DirectionalLight;
      if (dir.isDirectionalLight && dir !== world.keyLight) { dir.color.set('#7f9cff'); dir.intensity = 0.36; }
    });
    const key = world.keyLight!;
    key.color.set('#a9b9ff').lerp(new THREE.Color('#ffb47a'), mix(0.15, 0.75, mood.warmth));
    key.intensity = 1.0;

    const flat = (hex: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(hex, options);
    const lit = (hex: string, intensity = 1) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: 0.6 });
    const spill = paint(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    /** A soft pool of coloured light laid on a surface. */
    const pool = (x: number, y: number, z: number, rx: number, rz: number, hex: THREE.ColorRepresentation, strength: number, upright = false) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: spill, color: hex, transparent: true, opacity: strength, depthWrite: false, blending: THREE.AdditiveBlending }));
      if (!upright) m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      root.add(m);
      return m;
    };
    const sodium = '#ff9a3c';
    const warmLamp = new THREE.Color().setHSL(mix(0.11, 0.07, mood.warmth), 0.95, 0.66);
    const screenBlue = new THREE.Color().setHSL(mix(0.6, 0.56, mood.warmth), 0.9, 0.62);

    // ----- Floor -----
    const HW = 6.5, HD = 5, WH = 5.4;
    const floorMap = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = floorTone; ctx.fillRect(0, 0, w, h);
      if (a.floor === 'boards' || a.floor === 'laminate') {
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `rgba(${a.floor === 'boards' ? '60,35,15' : '40,40,45'},${0.04 + random() * 0.16})`; ctx.fillRect(0, i * 32, w, 31);
          ctx.fillStyle = 'rgba(25,18,12,0.5)'; ctx.fillRect(0, i * 32 + 31, w, 1.5); ctx.fillRect(Math.floor(random() * w), i * 32, 2, 32);
        }
      } else if (a.floor === 'lino') {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(50,56,64,0.55)'; ctx.fillRect(i * 32, j * 32, 32, 32); }
      } else for (let i = 0; i < 2600; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(60,50,40,0.18)' : 'rgba(220,205,180,0.14)'; ctx.fillRect(random() * w, random() * h, 2, 2); }
      for (let i = 0; i < mood.wear * 9; i++) { ctx.fillStyle = `rgba(45,32,22,${0.08 + random() * 0.14})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 10 + random() * 30, 8 + random() * 22, random() * 3, 0, 7); ctx.fill(); }
    }, [a.floor === 'lino' ? 3 : 2.5, a.floor === 'lino' ? 2.3 : 3]);
    const floorSkin = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HD * 2), new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.floor === 'carpet' ? 1 : 0.7 }));
    floorSkin.rotation.x = -Math.PI / 2; floorSkin.position.y = 0.006; floorSkin.receiveShadow = true;
    root.add(floorSkin);

    // ----- Walls: back (with a window) and left -----
    const dusk = new THREE.Color('#5a5f8c');
    const wallTone = new THREE.Color(WALL_TONES[a.walls]).lerp(dusk, 0.45);
    const wallMap = a.walls === 'wallpaper'
      ? paint(128, 128, (ctx, w, h) => { ctx.fillStyle = '#b7a78c'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? 'rgba(110,70,60,0.5)' : 'rgba(80,95,80,0.35)'; ctx.fillRect(i * 16 + 3, 0, i % 2 ? 5 : 2, h); } })
      : a.walls === 'plaster' ? paint(128, 128, (ctx, w, h) => { ctx.fillStyle = '#b89d90'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '230,215,200' : '110,85,75'},${0.1 + random() * 0.18})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 8 + random() * 26, 6 + random() * 18, random() * 3, 0, 7); ctx.fill(); } })
      : null;
    const wall = (w: number, h: number, x: number, y: number, z: number, alongZ = false) => {
      let material: THREE.Material;
      if (wallMap) { const map = wallMap.clone(); map.needsUpdate = true; map.repeat.set(w / 1.6, h / 1.6); material = new THREE.MeshStandardMaterial({ map, color: new THREE.Color('#ffffff').lerp(dusk, 0.45), roughness: 0.95 }); }
      else material = new THREE.MeshStandardMaterial({ color: wallTone, roughness: 0.95 });
      return s.box(alongZ ? [0.25, h, w] : [w, h, 0.25], [x, y, z], material);
    };
    const WX0 = 1.3, WX1 = 4.7, WY0 = 2.0, WY1 = 4.5; // the window opening
    const backZ = -HD - 0.125;
    wall(WX0 + HW, WH, (WX0 - HW) / 2, WH / 2, backZ);
    wall(HW - WX1, WH, (HW + WX1) / 2, WH / 2, backZ);
    wall(WX1 - WX0, WY0, (WX0 + WX1) / 2, WY0 / 2, backZ);
    wall(WX1 - WX0, WH - WY1, (WX0 + WX1) / 2, (WH + WY1) / 2, backZ);
    wall(HD * 2 + 0.25, WH, -HW - 0.125, WH / 2, -0.125, true);
    const trim = flat('#aaa8b6', { roughness: 0.6 });
    s.box([HW * 2, 0.32, 0.07], [0, 0.16, -HD + 0.035], trim);
    s.box([0.07, 0.32, HD * 2], [-HW + 0.035, 0.16, 0], trim);
    // Scuffs, damp and cracks.
    const stain = paint(128, 128, (ctx, w, h) => {
      for (let i = 0; i < 9; i++) { const g = ctx.createRadialGradient(w / 2 + (random() - 0.5) * 50, h / 2 + (random() - 0.5) * 50, 2, w / 2, h / 2, 30 + random() * 30); g.addColorStop(0, 'rgba(40,45,30,0.5)'); g.addColorStop(1, 'rgba(40,45,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    });
    for (let i = 0; i < Math.floor(mood.wear * 5 + 0.3); i++) {
      const onBack = random() < 0.6;
      const sh = 1.0 + random() * 1.2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + random() * 1.2, sh), new THREE.MeshBasicMaterial({ map: stain, transparent: true, opacity: 0.25 + mood.wear * 0.35, depthWrite: false }));
      if (onBack) m.position.set(pick([-5.2, -0.6, 5.4, 0.2]) + random() * 0.6, WH - sh / 2 - 0.05 - random() * 0.5, -HD + 0.012);
      else { m.rotation.y = Math.PI / 2; m.position.set(-HW + 0.012, WH - sh / 2 - 0.05 - random() * 0.4, 1.4 + random() * 1.8); }
      root.add(m);
    }
    if (mood.wear > 0.45) {
      const crack = flat('#4a4038');
      let x = -1.4 + random() * 0.6, y = WH;
      const pts: [number, number, number][] = [[x, y, -HD + 0.015]];
      for (let i = 0; i < 6; i++) { x += (random() - 0.5) * 0.5; y -= 0.25 + random() * 0.4; pts.push([x, y, -HD + 0.015]); }
      s.tube(pts, 0.012, crack).castShadow = false;
    }

    // ----- Window, and the night behind it -----
    const clockText = pick(['3:07', '2:48', '3:33', '4:12', '3:19']);
    const night = paint(512, 384, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      if (predawn) { sky.addColorStop(0, '#39457a'); sky.addColorStop(0.6, '#8f7f9c'); sky.addColorStop(1, '#f0b890'); }
      else { sky.addColorStop(0, '#1b2048'); sky.addColorStop(1, a.outside === 'snow' ? '#5a5f86' : '#3b3764'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // The block opposite.
      const bx = 20, by = 70, bw = 330, bh = h - by;
      ctx.fillStyle = predawn ? '#2b2c48' : '#232544'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#1b1c36'; ctx.fillRect(bx + bw, by + 60, 170, bh);
      const cols = 5, rws = 4, litCol = Math.floor(random() * cols), litRow = 1 + Math.floor(random() * 2);
      for (let r = 0; r < rws; r++) for (let c = 0; c < cols; c++) {
        const x = bx + 22 + c * 62, y = by + 24 + r * 74;
        let fill = '#161830';
        if (a.outside === 'neighbour' && c === litCol && r === litRow) fill = '#ffd98a';
        else if (a.outside === 'party' && random() < 0.5) fill = pick(['#ff7ab8', '#7ad0ff', '#ffd98a', '#b48aff', '#ff9a5a']);
        else if (predawn && random() < 0.2) fill = '#ffe2a8';
        else if (a.outside === 'rain' && c === litCol && r === litRow) fill = '#c9d6ff';
        ctx.fillStyle = fill; ctx.fillRect(x, y, 38, 50);
        if (fill !== '#161830') { ctx.fillStyle = 'rgba(40,30,20,0.55)'; ctx.fillRect(x + 18, y, 2, 50); if (a.outside === 'neighbour') { ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(x + 12, y + 30, 6, 0, 7); ctx.fill(); ctx.fillRect(x + 6, y + 36, 12, 14); } }
      }
      // The streetlight.
      const lx = 430, ly = 150;
      ctx.fillStyle = '#12132a'; ctx.fillRect(lx + 26, ly, 7, h); ctx.fillRect(lx - 8, ly - 4, 40, 6);
      const glow = ctx.createRadialGradient(lx, ly + 8, 2, lx, ly + 8, 130);
      glow.addColorStop(0, 'rgba(255,190,90,1)'); glow.addColorStop(0.15, 'rgba(255,150,60,0.75)'); glow.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = glow; ctx.fillRect(lx - 140, ly - 130, 280, 280);
      const cone = ctx.createLinearGradient(0, ly, 0, h); cone.addColorStop(0, 'rgba(255,160,70,0.4)'); cone.addColorStop(1, 'rgba(255,160,70,0.05)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(lx - 6, ly + 8); ctx.lineTo(lx + 6, ly + 8); ctx.lineTo(lx + 110, h); ctx.lineTo(lx - 110, h); ctx.fill();
      if (a.outside === 'rain') { ctx.strokeStyle = 'rgba(210,220,255,0.5)'; ctx.lineWidth = 2; for (let i = 0; i < 90; i++) { const x = random() * w, y = random() * h, len = 20 + random() * 70; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 3, y + len * 0.3, x - 3, y + len * 0.6, x + 1, y + len); ctx.stroke(); } }
      if (a.outside === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 1.5 + random() * 2.5, 0, 7); ctx.fill(); } ctx.fillStyle = '#d9dcec'; ctx.fillRect(0, h - 16, w, 16); }
    });
    const view = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0 + 0.3, WY1 - WY0 + 0.3), new THREE.MeshStandardMaterial({ map: night, emissiveMap: night, emissive: '#ffffff', emissiveIntensity: 0.95, roughness: 1 }));
    view.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, -HD - 0.2);
    root.add(view);
    const frame = flat('#b3b1c0', { roughness: 0.5 });
    const wcx = (WX0 + WX1) / 2, wcy = (WY0 + WY1) / 2, fz = -HD + 0.02;
    s.box([WX1 - WX0 + 0.3, 0.14, 0.16], [wcx, WY1 + 0.02, fz], frame);
    s.box([WX1 - WX0 + 0.5, 0.12, 0.42], [wcx, WY0 - 0.03, -HD + 0.15], frame);
    for (const x of [WX0 - 0.03, WX1 + 0.03, wcx]) s.box([x === wcx ? 0.07 : 0.14, WY1 - WY0, 0.14], [x, wcy, fz], frame);
    s.box([WX1 - WX0, 0.07, 0.12], [wcx, wcy + 0.25, fz], frame);
    // Streetlight through the glass, laid across the floor in front of the bed.
    const shaft = new THREE.Shape();
    shaft.moveTo(WX0 - 0.6, -2.2); shaft.lineTo(WX1 - 0.9, -2.2); shaft.lineTo(WX1 - 3.2, 1.6); shaft.lineTo(WX0 - 3.0, 1.6); shaft.closePath();
    const shaftMesh = new THREE.Mesh(new THREE.ShapeGeometry(shaft), new THREE.MeshBasicMaterial({ color: sodium, transparent: true, opacity: mix(0.1, 0.24, mood.warmth) * (a.covering === 'sheet' ? 0.5 : 1), depthWrite: false, blending: THREE.AdditiveBlending }));
    shaftMesh.rotation.x = Math.PI / 2; shaftMesh.position.y = 0.014;
    root.add(shaftMesh);
    // Window coverings.
    if (a.covering === 'curtains') {
      const fabric = new THREE.MeshStandardMaterial({ color: new THREE.Color(pick(['#8a5a52', '#5a6a86', '#a89a7a', '#6a7a5a'])).lerp(new THREE.Color('#8b8275'), mood.wear * 0.3), roughness: 1, side: THREE.DoubleSide });
      s.rod([WX0 - 0.5, WY1 + 0.3, -HD + 0.3], [WX1 + 0.5, WY1 + 0.3, -HD + 0.3], 0.035, flat('#3a3a40'));
      for (const [x0, x1] of [[WX0 - 0.45, WX0 + 0.55 + random() * 0.4], [WX1 - 0.5 - random() * 0.5, WX1 + 0.45]]) {
        const g = new THREE.PlaneGeometry(x1 - x0, WY1 - WY0 + 0.75, 16, 4);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.07);
        g.computeVertexNormals();
        s.mesh(g, fabric, [(x0 + x1) / 2, wcy - 0.1, -HD + 0.3]);
      }
    } else if (a.covering === 'blind') {
      const slat = flat('#d5d3cc', { roughness: 0.5, side: THREE.DoubleSide });
      const drop = mix(0.45, 0.8, random());
      const n = Math.floor((WY1 - WY0) * drop / 0.13);
      const tilt = (random() - 0.5) * 0.08;
      s.box([WX1 - WX0 + 0.1, 0.1, 0.12], [wcx, WY1 - 0.02, -HD + 0.2], slat);
      for (let i = 0; i < n; i++) {
        const bent = random() < 0.12;
        const m = s.box([WX1 - WX0 - 0.06, 0.012, 0.11], [wcx, WY1 - 0.14 - i * 0.13, -HD + 0.2], slat);
        m.rotation.set(0.5, 0, tilt * (i / n) * 3 + (bent ? (random() - 0.5) * 0.12 : 0));
      }
      for (const x of [WX0 + 0.5, WX1 - 0.5]) s.rod([x, WY1, -HD + 0.26], [x, WY1 - n * 0.13 - 0.1, -HD + 0.26], 0.008, slat);
    } else if (a.covering === 'sheet') {
      const g = new THREE.PlaneGeometry((WX1 - WX0) * 0.72, WY1 - WY0 + 0.5, 14, 8);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / ((WX1 - WX0) * 0.72), v = p.getY(i) / (WY1 - WY0 + 0.5) + 0.5; p.setY(i, p.getY(i) - (0.25 - u * u) * 0.5 * v); p.setZ(i, Math.sin(u * 16) * 0.05 * (1 - v)); }
      g.computeVertexNormals();
      s.mesh(g, new THREE.MeshStandardMaterial({ color: pick(['#c9c2b0', '#a9b6c9', '#c9a9b0']), roughness: 1, side: THREE.DoubleSide, emissive: sodium, emissiveIntensity: 0.12 }), [WX0 + (WX1 - WX0) * 0.38, wcy, -HD + 0.22]);
      for (const x of [WX0 + 0.08, WX0 + (WX1 - WX0) * 0.72]) s.ball([0.035, 0.035, 0.02], [x, WY1 + 0.2, -HD + 0.24], flat('#c8302a'), 8);
    }

    // ----- The bed under the window -----
    const bedX = 3.1, bedZ = -3.72, bedW = 4.9, bedD = 2.35;
    const bedding = new THREE.Color().setHSL(random(), mix(0.12, 0.42, mood.cheer), 0.56);
    const duvetMaterial = new THREE.MeshStandardMaterial({ color: bedding, roughness: 1, side: THREE.DoubleSide });
    const linen = flat('#d9d5ca', { roughness: 1 });
    const cushion = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, turn = 0) => {
      const g = new THREE.SphereGeometry(1, 20, 12);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const px = Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** 0.55, pz = Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** 0.55; p.setXYZ(i, px, p.getY(i) * (1 - 0.6 * Math.max(Math.abs(px), Math.abs(pz)) ** 3), pz); }
      g.computeVertexNormals();
      const m = s.mesh(g, material, [x, y, z]); m.scale.set(w / 2, h / 2, d / 2); m.rotation.y = turn;
      return m;
    };
    const duvet = (cx: number, cz: number, w: number, d: number, baseY: number, shape: (u: number, v: number) => number, turn = 0) => {
      const g = new THREE.PlaneGeometry(w, d, 44, 24);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      const k = [random() * 6, random() * 6, random() * 6];
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / w, v = p.getZ(i) / d;
        const edge = Math.min(1, Math.min(0.5 - Math.abs(u), 0.5 - Math.abs(v)) / 0.06);
        const wrinkle = 0.05 * (Math.sin(u * 23 + k[0]) * Math.sin(v * 11 + k[1]) + Math.sin((u + v) * 17 + k[2]));
        p.setY(i, edge * (0.1 + wrinkle + shape(u, v)));
      }
      g.computeVertexNormals();
      const m = s.mesh(g, duvetMaterial, [cx, baseY, cz]); m.rotation.y = turn;
      return m;
    };
    const headLeft = random() < 0.5;
    const hx = headLeft ? -1 : 1;
    let pillowAt: [number, number, number] = [bedX + hx * (bedW / 2 - 0.65), 0.62, bedZ - 0.1];
    let breathing: THREE.Mesh | null = null;
    if (a.bed === 'lump' || a.bed === 'empty') {
      s.box([bedW, 0.42, bedD], [bedX, 0.21, bedZ], flat('#cfc8b6', { roughness: 1 }));
      s.box([bedW + 0.03, 0.2, bedD + 0.03], [bedX, 0.34, bedZ], linen);
      cushion(1.25, 0.34, 0.95, pillowAt[0], pillowAt[1], pillowAt[2], linen, (random() - 0.5) * 0.3);
      if (a.bed === 'lump') {
        const gauss = (du: number, dv: number, sg: number) => Math.exp(-(du * du + dv * dv) / (2 * sg * sg));
        breathing = duvet(bedX - hx * 0.45, bedZ + 0.05, bedW - 0.9, bedD + 0.2, 0.44, (u, v) => {
          const t = hx * u; // +0.5 at the head end
          return 0.62 * gauss(t - 0.36, v + 0.1, 0.13) + 0.5 * gauss(t - 0.12, v + 0.06, 0.13) + 0.6 * gauss(t + 0.08, v + 0.02, 0.12) + 0.42 * gauss(t + 0.26, v + 0.14, 0.11) + 0.28 * gauss(t + 0.42, v + 0.08, 0.08);
        });
        s.ball([0.3, 0.26, 0.34], [pillowAt[0] - hx * 0.15, 0.82, pillowAt[2] - 0.1], flat(pick(['#2a211c', '#4a3020', '#8a5a2c', '#16161a']), { roughness: 1 }), 14);
      } else {
        const gauss = (du: number, dv: number, sg: number) => Math.exp(-(du * du + dv * dv) / (2 * sg * sg));
        duvet(bedX - hx * 1.0, bedZ + 0.3, bedW * 0.62, bedD + 0.3, 0.44, (u, v) => 0.55 * gauss(u - hx * 0.25, v, 0.16) + 0.3 * gauss(u, v - 0.2, 0.2), hx * 0.16);
      }
    } else if (a.bed === 'sofa') {
      const cloth = flat(pick(['#6a7386', '#8a6a5a', '#6f7f6a', '#7a6a86']), { roughness: 1 });
      s.box([bedW, 0.5, bedD], [bedX, 0.6, bedZ], cloth);
      s.box([bedW, 1.2, 0.45], [bedX, 1.15, bedZ - bedD / 2 + 0.22], cloth);
      for (const k of [-1, 1]) s.box([0.4, 1.0, bedD], [bedX + k * (bedW / 2 + 0.2), 0.75, bedZ], cloth);
      for (const k of [-1, 1]) for (const z of [-1, 1]) s.box([0.14, 0.36, 0.14], [bedX + k * (bedW / 2), 0.18, bedZ + z * (bedD / 2 - 0.15)], flat('#2a2c30'));
      pillowAt = [bedX + hx * (bedW / 2 - 0.7), 1.04, bedZ + 0.1];
      cushion(1.2, 0.34, 0.9, pillowAt[0], pillowAt[1], pillowAt[2], linen, 0.2);
      const gauss = (du: number, dv: number, sg: number) => Math.exp(-(du * du + dv * dv) / (2 * sg * sg));
      duvet(bedX - hx * 0.7, bedZ + 0.35, bedW * 0.7, bedD * 0.9, 0.86, (u, v) => 0.4 * gauss(u, v, 0.2) + 0.25 * gauss(u + 0.3, v - 0.2, 0.12), hx * 0.1);
    } else {
      const bag = flat(pick(['#3f6f8a', '#8a3f3a', '#4f7a4a', '#5a4f8a']), { roughness: 0.8 });
      const roll = s.cylinder(0.5, 0.5, bedW * 0.74, [bedX - hx * 0.4, 0.3, bedZ + 0.2], bag, 20);
      roll.rotation.z = Math.PI / 2; roll.scale.set(0.5, 1, 1.5);
      pillowAt = [bedX + hx * (bedW / 2 - 0.7), 0.2, bedZ + 0.15];
      cushion(1.2, 0.34, 0.9, pillowAt[0], pillowAt[1], pillowAt[2], linen, (random() - 0.5) * 0.4);
      s.box([bedW * 0.9, 0.05, bedD * 0.75], [bedX, 0.03, bedZ + 0.15], flat('#9aa08a', { roughness: 1 }));
    }

    // ----- Kitchenette along the left wall -----
    const KX = -HW + 0.78, KD = 1.5, KH = 1.9, KZ0 = -4.9, KZ1 = 0.75;
    const unitTone = flat(pick(['#d9d2bd', '#a9b3b5', '#c9b99a', '#8fa39a']), { roughness: 0.6 });
    const steel = flat('#aeb4b8', { metalness: 0.7, roughness: 0.3 });
    const dark = flat('#2a2c30', { roughness: 0.5 });
    const frontX = -HW + KD;
    s.box([KD - 0.08, KH - 0.25, KZ1 - KZ0], [KX - 0.04, 0.25 + (KH - 0.25) / 2, (KZ0 + KZ1) / 2], unitTone);
    s.box([KD - 0.2, 0.25, KZ1 - KZ0], [KX - 0.1, 0.125, (KZ0 + KZ1) / 2], dark);
    s.box([KD + 0.06, 0.12, KZ1 - KZ0 + 0.06], [KX, KH + 0.01, (KZ0 + KZ1) / 2], flat(pick(['#5a5048', '#8a8a86', '#3a3c42', '#b9a888']), { roughness: 0.5 }));
    const fridgeZ0 = -0.75, fridgeZ1 = 0.7;
    for (let z = KZ0 + 1.04; z < fridgeZ0 - 0.2; z += 1.04) s.box([0.02, KH - 0.4, 0.03], [frontX - 0.03, 0.25 + (KH - 0.3) / 2, z], dark);
    for (let z = KZ0 + 0.52; z < fridgeZ0 - 0.2; z += 1.04) s.box([0.06, 0.05, 0.4], [frontX - 0.0, KH - 0.32, z], steel);
    s.box([0.3, 0.7, KZ1 - KZ0], [-HW + 0.02, KH + 0.45, (KZ0 + KZ1) / 2], flat('#d8d6cf', { roughness: 0.3 })); // tiles
    for (let z = KZ0 + 0.4; z < KZ1; z += 0.4) s.box([0.012, 0.7, 0.012], [-HW + 0.172, KH + 0.45, z], flat('#9a9890'));
    // Wall cupboards.
    s.box([0.85, 1.25, 3.5], [-HW + 0.43, 3.95, -3.1], unitTone);
    for (const z of [-4.25, -3.1, -1.95]) { s.box([0.02, 1.15, 0.03], [-HW + 0.865, 3.95, z + 0.57], dark); s.box([0.05, 0.3, 0.05], [-HW + 0.88, 3.55, z + 0.4], steel); }
    // Microwave with its clock.
    const mwZ = -4.3;
    s.box([1.0, 0.72, 1.05], [KX - 0.12, KH + 0.43, mwZ], flat('#d5d3cc', { roughness: 0.4 }));
    s.box([0.02, 0.56, 0.68], [KX + 0.385, KH + 0.43, mwZ - 0.13], dark);
    const mwClock = s.label(clockText, 0.26, 0.13, [KX + 0.392, KH + 0.6, mwZ + 0.37], '#5dff8a', '#07140a');
    mwClock.rotation.y = Math.PI / 2;
    const mwMat = mwClock.material as THREE.MeshStandardMaterial; mwMat.emissiveMap = mwMat.map; mwMat.emissive.set('#ffffff'); mwMat.emissiveIntensity = 1.3; mwClock.castShadow = false;
    // Sink and tap.
    const sinkZ = -2.95;
    s.box([0.95, 0.03, 1.25], [KX, KH + 0.075, sinkZ], steel);
    s.box([0.7, 0.02, 0.8], [KX + 0.02, KH + 0.082, sinkZ - 0.12], flat('#6f777c', { metalness: 0.6, roughness: 0.4 }));
    s.tube([[KX - 0.42, KH + 0.08, sinkZ - 0.1], [KX - 0.42, KH + 0.55, sinkZ - 0.1], [KX - 0.3, KH + 0.66, sinkZ - 0.1], [KX - 0.1, KH + 0.52, sinkZ - 0.1]], 0.035, steel);
    // Hob.
    const hobZ = -1.55;
    s.box([0.95, 0.03, 1.1], [KX, KH + 0.075, hobZ], dark);
    for (const z of [-0.26, 0.26]) s.ring(0.2, 0.025, [KX, KH + 0.1, hobZ + z], flat('#55585e', { metalness: 0.5 })).rotation.x = Math.PI / 2;
    // Kettle.
    const kettleZ = -2.22, kettleTone = flat(pick(['#ecebe4', '#c8302a', '#2a2c30', '#aeb4b8']), { roughness: 0.35 });
    s.lathe([[0.001, 0], [0.19, 0], [0.2, 0.1], [0.17, 0.36], [0.13, 0.44], [0.001, 0.45]], kettleTone, [KX - 0.2, KH + 0.07, kettleZ]);
    const kHandle = s.ring(0.15, 0.026, [KX - 0.2, KH + 0.3, kettleZ + 0.19], dark, Math.PI); kHandle.rotation.set(0, Math.PI / 2, -Math.PI / 2);
    const steam: THREE.Mesh[] = [];
    const wisp = (x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false })); m.userData = { x, y, z, phase: random() }; root.add(m); steam.push(m); };
    const cupTone = () => flat(new THREE.Color().setHSL(random(), mix(0.2, 0.6, mood.cheer), 0.58), { roughness: 0.4 });
    const mug = (x: number, y: number, z: number) => { const t = cupTone(); s.cylinder(0.1, 0.085, 0.22, [x, y + 0.11, z], t, 14); s.ring(0.065, 0.018, [x, y + 0.11, z + 0.11], t).rotation.y = Math.PI / 2; };
    if (a.kitchen === 'tea') {
      mug(KX + 0.3, KH + 0.07, kettleZ + 0.05);
      s.cylinder(0.085, 0.085, 0.01, [KX + 0.3, KH + 0.27, kettleZ + 0.05], flat('#7a4a22', { roughness: 0.2 }), 14);
      for (let i = 0; i < 3; i++) { wisp(KX + 0.3, KH + 0.36, kettleZ + 0.05); wisp(KX - 0.32, KH + 0.52, kettleZ - 0.06); }
      s.box([0.2, 0.14, 0.3], [KX + 0.25, KH + 0.14, kettleZ + 0.5], flat('#3f8a5a'));
    } else if (a.kitchen === 'bare') {
      s.cylinder(0.24, 0.16, 0.035, [KX + 0.05, KH + 0.11, sinkZ + 0.42], flat('#ecebe4', { roughness: 0.3 }), 20).rotation.z = 1.25;
    } else if (a.kitchen === 'dishes') {
      const china = flat('#e6e4dc', { roughness: 0.3 });
      for (let i = 0; i < 7 + Math.floor(mood.density * 6); i++) { const p = s.cylinder(0.22 + random() * 0.05, 0.14, 0.03, [KX + (random() - 0.5) * 0.3, KH + 0.11 + i * 0.035, sinkZ - 0.12 + (random() - 0.5) * 0.3], i % 4 === 3 ? cupTone() : china, 16); p.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3); }
      const pan = s.cylinder(0.24, 0.22, 0.12, [KX, KH + 0.16, hobZ + 0.26], dark, 18); void pan;
      s.rod([KX + 0.22, KH + 0.2, hobZ + 0.26], [KX + 0.68, KH + 0.24, hobZ + 0.36], 0.025, dark);
      for (let i = 0; i < 3 + Math.floor(mood.density * 5); i++) s.lathe([[0.001, 0], [0.07, 0], [0.072, 0.26], [0.03, 0.4], [0.028, 0.52], [0.001, 0.52]], flat(pick(['#3f6a3a', '#5a3a1a', '#8aa0a8']), { roughness: 0.2, transparent: true, opacity: 0.9 }), [KX - 0.45 + random() * 0.25, KH + 0.07, hobZ + 0.75 + i * 0.17]);
      for (let i = 0; i < 2; i++) mug(KX + 0.25, KH + 0.07, sinkZ + 0.75 + i * 0.26);
    }
    // Fridge, shut or standing open.
    const fridgeBody = flat('#dcdad2', { roughness: 0.35 });
    const fw = fridgeZ1 - fridgeZ0, fh = KH - 0.3;
    if (a.kitchen === 'fridge') {
      s.box([0.04, fh, fw - 0.06], [frontX - 0.5, 0.25 + fh / 2, (fridgeZ0 + fridgeZ1) / 2], lit('#e9f4ff', 1.2));
      for (const y of [0.75, 1.2]) s.box([0.5, 0.025, fw - 0.1], [frontX - 0.26, y, (fridgeZ0 + fridgeZ1) / 2], flat('#cfe0ea', { roughness: 0.2 }));
      s.box([0.16, 0.34, 0.16], [frontX - 0.2, 0.93, fridgeZ0 + 0.35], flat('#f1efe8'));
      s.cylinder(0.08, 0.08, 0.2, [frontX - 0.22, 1.31, fridgeZ1 - 0.4], flat('#b8482c'), 12);
      if (mood.density > 0.5) s.box([0.3, 0.1, 0.42], [frontX - 0.24, 0.31, (fridgeZ0 + fridgeZ1) / 2], flat('#b98d5c'));
      const hinge = new THREE.Group(); hinge.position.set(frontX, 0.25, fridgeZ1); hinge.rotation.y = mix(1.2, 1.9, random()); root.add(hinge);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.09, fh, fw), fridgeBody); door.position.set(0.045, fh / 2, -fw / 2); door.castShadow = true; hinge.add(door);
      const shelfLight = new THREE.Mesh(new THREE.BoxGeometry(0.02, fh * 0.9, fw * 0.9), flat('#eef3f6', { roughness: 0.3 })); shelfLight.position.set(-0.012, fh / 2, -fw / 2); hinge.add(shelfLight);
      pool(frontX + 1.7, 0.02, (fridgeZ0 + fridgeZ1) / 2 + 0.2, 2.3, 1.7, '#bcdcff', 0.32);
    } else {
      s.box([0.08, fh, fw - 0.04], [frontX - 0.0, 0.25 + fh / 2, (fridgeZ0 + fridgeZ1) / 2], fridgeBody);
      s.box([0.05, 0.5, 0.05], [frontX + 0.06, KH - 0.55, fridgeZ0 + 0.16], steel);
      const magnets = Math.floor(mood.density * 5 + random() * 2);
      for (let i = 0; i < magnets; i++) s.box([0.012, 0.12 + random() * 0.14, 0.12 + random() * 0.12], [frontX + 0.045, 0.6 + random() * 0.9, fridgeZ0 + 0.4 + random() * 0.8], flat(pick(['#f1efe8', '#e8c84a', '#c8302a', '#7ab0e8'])));
    }

    // ----- The front door, with the hallway light under it -----
    const doorX = -3.35, doorW = 1.95, doorH = 4.3;
    s.box([doorW + 0.3, doorH + 0.15, 0.08], [doorX, (doorH + 0.15) / 2, -HD + 0.04], trim);
    s.box([doorW, doorH, 0.1], [doorX, doorH / 2 + 0.03, -HD + 0.07], flat(pick(['#7a5a42', '#d5d3cc', '#4f6a72', '#8a3a34']), { roughness: 0.6 }));
    for (const y of [1.2, 3.1]) s.box([doorW - 0.5, y > 2 ? 1.6 : 1.5, 0.02], [doorX, y, -HD + 0.125], flat('#000000', { transparent: true, opacity: 0.12 }));
    s.ball([0.07, 0.07, 0.07], [doorX + doorW / 2 - 0.2, 2.1, -HD + 0.17], flat('#c9a23a', { metalness: 0.8, roughness: 0.3 }), 10);
    s.ball([0.03, 0.03, 0.02], [doorX, 3.3, -HD + 0.13], flat('#c9a23a', { metalness: 0.8, roughness: 0.3 }), 8);
    s.box([doorW - 0.1, 0.035, 0.03], [doorX, 0.03, -HD + 0.13], lit('#ffd9a0', 1.6));
    pool(doorX, 0.02, -HD + 0.75, 1.3, 0.75, '#ffb866', 0.3);
    s.tube([[doorX + doorW / 2 - 0.1, 2.9, -HD + 0.13], [doorX + doorW / 2 - 0.4, 2.72, -HD + 0.17], [doorX + doorW / 2 - 0.75, 2.86, -HD + 0.13]], 0.012, flat('#c9a23a', { metalness: 0.8 }));
    // Coat hooks.
    const hookX = -1.55;
    s.box([1.3, 0.12, 0.05], [hookX, 3.5, -HD + 0.03], flat('#6a4a30'));
    const coats = 1 + Math.floor(mood.density * 2.2);
    for (let i = 0; i < coats; i++) cushion(0.6, 1.9 - i * 0.3, 0.3, hookX - 0.4 + i * 0.42, 2.55 + i * 0.15, -HD + 0.2, flat(pick(['#3a4458', '#5a3a34', '#4a5a44', '#23262c', '#8a7a52']), { roughness: 1 }));

    // ----- The one warm lamp -----
    const lampX = -1.05, lampZ = -1.15;
    const tall = random() < 0.7;
    const shadeY = tall ? 3.7 : 1.75;
    const brass = flat('#3a3a40', { metalness: 0.5, roughness: 0.4 });
    if (tall) { s.cylinder(0.3, 0.34, 0.07, [lampX, 0.035, lampZ], brass, 20); s.rod([lampX, 0, lampZ], [lampX, shadeY - 0.3, lampZ], 0.035, brass); }
    else {
      s.box([0.95, 0.85, 0.85], [lampX, 0.425, lampZ], flat('#b98d5c', { roughness: 0.95 })).rotation.y = 0.2;
      s.box([0.12, 0.86, 0.86], [lampX, 0.426, lampZ], flat('#d7c08a', { roughness: 0.4 })).rotation.y = 0.2;
      s.cylinder(0.16, 0.2, 0.06, [lampX, 0.88, lampZ], brass, 16); s.rod([lampX, 0.88, lampZ], [lampX, shadeY - 0.25, lampZ], 0.03, brass);
    }
    const shadeMaterial = new THREE.MeshStandardMaterial({ color: warmLamp, emissive: warmLamp, emissiveIntensity: 1.25, roughness: 0.9, side: THREE.DoubleSide });
    s.mesh(new THREE.CylinderGeometry(0.3, 0.52, 0.62, 24, 1, true), shadeMaterial, [lampX, shadeY, lampZ]).castShadow = false;
    const lampLight = new THREE.PointLight(warmLamp, 11 * mix(0.75, 1.3, mood.warmth), 13, 1.7);
    lampLight.position.set(lampX + 0.2, shadeY - 0.1, lampZ + 0.3);
    root.add(lampLight);
    pool(lampX + 0.6, 0.022, lampZ + 0.9, 4.2, 3.6, '#ff9a3a', mix(0.14, 0.26, mood.warmth));
    pool(lampX, Math.min(shadeY + 0.2, WH - 1.3), -HD + 0.02, 2.2, 1.9, '#ff9a3a', 0.16, true);

    // ----- Where the blue comes from -----
    let screenMaterial: THREE.MeshStandardMaterial | null = null;
    let bluePool: THREE.Mesh | null = null;
    const blueAt = new THREE.Vector3();
    const tvFace = () => paint(256, 160, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#16224a'); g.addColorStop(1, '#2b4fa8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eaf0ff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('ARE YOU STILL', w / 2, 52); ctx.fillText('WATCHING?', w / 2, 80);
      ctx.fillStyle = '#eaf0ff'; ctx.fillRect(w / 2 - 70, 100, 62, 26); ctx.strokeStyle = '#eaf0ff'; ctx.lineWidth = 3; ctx.strokeRect(w / 2 + 8, 100, 62, 26);
    });
    const deskFace = () => paint(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#dfe8fb'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2b579a'; ctx.fillRect(0, 0, w, 18);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 30, w - 80, h); ctx.fillStyle = '#3a3f4a'; for (let i = 0; i < 3 + Math.floor(random() * 5); i++) ctx.fillRect(56, 46 + i * 14, 60 + random() * 90, 5);
    });
    if (a.screen === 'tv') {
      const tx = -4.55, tz = 2.75;
      s.box([0.9, 0.5, 1.9], [tx, 0.25, tz], flat('#b98d5c', { roughness: 0.95 }));
      s.box([0.12, 1.25, 2.1], [tx + 0.1, 1.2, tz], dark);
      s.box([0.3, 0.08, 0.7], [tx + 0.1, 0.54, tz], dark);
      const face = tvFace();
      screenMaterial = new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.3 });
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.12), screenMaterial); sc.rotation.y = Math.PI / 2; sc.position.set(tx + 0.165, 1.2, tz); root.add(sc);
      blueAt.set(tx + 1.2, 1.3, tz);
      bluePool = pool(tx + 2.6, 0.024, tz - 0.4, 3.6, 2.9, '#2f6dff', 0.3);
    } else if (a.screen === 'monitor') {
      const mz = 0.15, mx = KX - 0.1;
      s.box([0.3, 0.04, 0.5], [mx, KH + 0.09, mz], dark); s.box([0.06, 0.3, 0.08], [mx - 0.05, KH + 0.24, mz], dark);
      s.box([0.06, 0.78, 1.3], [mx, KH + 0.72, mz], dark);
      const face = deskFace();
      screenMaterial = new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: '#ffffff', emissiveIntensity: 1.05, roughness: 0.3 });
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.7), screenMaterial); sc.rotation.y = Math.PI / 2; sc.position.set(mx + 0.034, KH + 0.72, mz); root.add(sc);
      blueAt.set(mx + 1.3, KH + 0.6, mz);
      bluePool = pool(frontX + 2.3, 0.024, mz + 0.5, 3.4, 2.8, '#2f6dff', 0.3);
    } else if (a.screen === 'phone') {
      const py = pillowAt[1] + 0.2;
      screenMaterial = lit(screenBlue.getStyle(), 1.5);
      const phone = s.box([0.24, 0.03, 0.46], [pillowAt[0] - hx * 0.55, py, pillowAt[2] + 0.5], dark); phone.rotation.y = 0.5;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.42), screenMaterial); face.rotation.x = -Math.PI / 2; face.position.y = 0.017; phone.add(face);
      blueAt.set(phone.position.x, py + 0.7, phone.position.z + 0.3);
      bluePool = pool(phone.position.x, py + 0.3, phone.position.z + 0.2, 2.2, 1.8, '#2f6dff', 0.3);
      pool(phone.position.x, 2.2, -HD + 0.02, 1.9, 1.5, '#2f6dff', 0.2, true);
    } else if (a.screen === 'fishtank') {
      const fx = 5.75, fzz = -1.55;
      s.box([1.1, 0.8, 0.9], [fx, 0.4, fzz], flat('#2a4f8a', { roughness: 0.6 }));
      const aqua = new THREE.Color().setHSL(0.52, 0.8, 0.6);
      screenMaterial = new THREE.MeshStandardMaterial({ color: aqua, emissive: aqua, emissiveIntensity: 1, roughness: 0.2 });
      s.mesh(new THREE.BoxGeometry(1.0, 0.7, 0.75), screenMaterial, [fx, 1.17, fzz]).castShadow = false;
      s.box([1.06, 0.08, 0.8], [fx, 1.56, fzz], dark); s.box([1.06, 0.05, 0.8], [fx, 0.825, fzz], dark);
      for (let i = 0; i < 3 + Math.floor(mood.cheer * 4); i++) s.ball([0.07, 0.04, 0.02], [fx - 0.35 + random() * 0.7, 0.95 + random() * 0.45, fzz + 0.385], lit(pick(['#ff8a3c', '#ffd23c', '#ff5a7a']), 0.9), 8);
      blueAt.set(fx - 0.9, 1.3, fzz + 0.6);
      bluePool = pool(fx - 1.5, 0.024, fzz + 1.4, 3.2, 2.6, '#1fb8c8', 0.3);
      screenBlue.copy(aqua);
    }
    let blueLight: THREE.PointLight | null = null;
    if (a.screen !== 'none') {
      blueLight = new THREE.PointLight(screenBlue, 9 * mix(1.25, 0.8, mood.warmth), 12, 1.7);
      blueLight.position.copy(blueAt);
      root.add(blueLight);
    }

    // ----- On the walls -----
    const twinkle: THREE.MeshBasicMaterial[] = [];
    const twinkleBase: THREE.Color[] = [];
    const pinX0 = -0.9, pinX1 = 1.0; // clear back wall between the coats and the window
    if (a.pinned === 'posters') {
      const spots: [number, number, number, number][] = [[-0.1, 3.4, 1.4, 1.9], [5.6, 3.3, 1.2, 1.7], [-5.6, 3.6, 1.2, 1.6]];
      for (const [x, y, w, h] of spots) {
        const hue = random() * 360;
        const art = paint(128, 176, (ctx, cw, ch) => {
          ctx.fillStyle = `hsl(${hue},${mix(25, 65, mood.cheer)}%,${30 + random() * 25}%)`; ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = `hsl(${(hue + 140) % 360},${mix(30, 80, mood.cheer)}%,62%)`;
          const kind = Math.floor(random() * 3);
          if (kind === 0) { ctx.beginPath(); ctx.arc(cw / 2, ch * 0.42, cw * 0.3, 0, 7); ctx.fill(); }
          else if (kind === 1) { ctx.beginPath(); ctx.moveTo(cw * 0.15, ch * 0.7); ctx.lineTo(cw * 0.5, ch * 0.15); ctx.lineTo(cw * 0.85, ch * 0.7); ctx.fill(); }
          else for (let i = 0; i < 5; i++) ctx.fillRect(16, 24 + i * 20, cw - 32, 9);
          ctx.fillStyle = '#f1efe8'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText(pick(['LIVE', 'TOUR 09', 'NOISE', 'MIDNIGHT', 'FILM', 'SOLD OUT']), cw / 2, ch - 18, cw - 12);
        });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }));
        p.position.set(x, y, -HD + 0.012); p.rotation.z = (random() - 0.5) * 0.08; root.add(p);
      }
    } else if (a.pinned === 'lights') {
      const bulbs = 26;
      const tones = mood.cheer > 0.55 ? ['#ffd27a', '#ff8ab0', '#8ad0ff', '#b0ff9a'] : ['#ffd9a0'];
      const groups = tones.map((hex) => new THREE.MeshBasicMaterial({ color: hex }));
      twinkleBase.push(...tones.map((hex) => new THREE.Color(hex)));
      twinkle.push(...groups);
      const wirePts: [number, number, number][] = [];
      for (let i = 0; i <= bulbs; i++) {
        const u = i / bulbs, x = mix(-1.0, 6.3, u), y = WH - 0.45 - Math.abs(Math.sin(u * Math.PI * 3)) * 0.35;
        wirePts.push([x, y, -HD + 0.04]);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), groups[i % groups.length]); b.position.set(x, y - 0.06, -HD + 0.06); root.add(b);
      }
      s.tube(wirePts, 0.008, flat('#2a2c30')).castShadow = false;
      pool(2.6, WH - 0.7, -HD + 0.02, 4.2, 0.7, tones[0], 0.14, true);
      for (let i = 0; i < 5 + Math.floor(mood.density * 3); i++) {
        const x = pinX0 + (i % 4) * 0.5 + random() * 0.08, y = 3.6 - Math.floor(i / 4) * 0.62 + random() * 0.08;
        const snap = s.box([0.36, 0.44, 0.01], [x, y, -HD + 0.012], flat('#f1efe8', { roughness: 0.5 })); snap.rotation.z = (random() - 0.5) * 0.25; snap.castShadow = false;
        const img = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flat(new THREE.Color().setHSL(random(), 0.35, 0.4))); img.position.set(0, 0.04, 0.007); snap.add(img);
      }
    } else if (a.pinned === 'notes') {
      const cal = paint(128, 160, (ctx, w, h) => { ctx.fillStyle = '#f1efe8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c8302a'; ctx.fillRect(0, 0, w, 34); ctx.fillStyle = '#3a3f4a'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { ctx.fillRect(10 + c * 16, 46 + r * 22, 9, 9); if (random() < 0.3) { ctx.strokeStyle = '#c8302a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8 + c * 16, 44 + r * 22); ctx.lineTo(21 + c * 16, 57 + r * 22); ctx.stroke(); } } });
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.2), new THREE.MeshStandardMaterial({ map: cal, roughness: 0.8 })); c.position.set(-0.35, 3.3, -HD + 0.012); root.add(c);
      for (let i = 0; i < 2 + Math.floor(mood.density * 2); i++) { const menu = s.label(pick(['PIZZA', 'CURRY', 'WOK', 'KEBAB']), 0.45, 0.8, [0.6 + (i % 2) * 0.1, 3.6 - i * 0.5, -HD + 0.012 + i * 0.002], '#fff3c8', pick(['#c8302a', '#2f7a3a', '#d98a1a'])); menu.rotation.z = (random() - 0.5) * 0.2; menu.castShadow = false; }
      const cx = 5.6, cy = 4.3;
      s.cylinder(0.42, 0.42, 0.06, [cx, cy, -HD + 0.04], flat('#f1efe8'), 24).rotation.x = Math.PI / 2;
      s.ring(0.42, 0.03, [cx, cy, -HD + 0.07], dark);
      const hourAngle = -((3 + 7 / 60) / 12) * Math.PI * 2, minAngle = -(7 / 60) * Math.PI * 2;
      s.rod([cx, cy, -HD + 0.08], [cx - Math.sin(hourAngle) * 0.2, cy + Math.cos(hourAngle) * 0.2, -HD + 0.08], 0.018, dark);
      s.rod([cx, cy, -HD + 0.08], [cx - Math.sin(minAngle) * 0.32, cy + Math.cos(minAngle) * 0.32, -HD + 0.08], 0.012, dark);
    } else {
      const ghost = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, depthWrite: false })); ghost.position.set(0.05, 3.3, -HD + 0.012); root.add(ghost);
      s.rod([0.05, 4.2, -HD], [0.05, 4.22, -HD + 0.07], 0.012, dark);
    }

    // ----- Belongings in the near-left corner -----
    const cornerX = -5.35, cornerZ = 3.6;
    if (a.belongings === 'boxes') {
      const card = flat('#b98d5c', { roughness: 0.95 }), tape = flat('#d7c08a', { roughness: 0.4 });
      const n = 3 + Math.floor(mood.density * 3);
      const stackAt: [number, number, number][] = [[0, 0, 0], [0.1, 1.0, 0.05], [-1.2, 0, 0.5], [0.05, 0, -1.25], [-0.1, 1.0, -1.2], [0, 1.95, 0]];
      for (let i = 0; i < Math.min(n, stackAt.length); i++) {
        const [dx, y, dz] = stackAt[i]; const w = 1.0 + random() * 0.2, h = 0.9 + random() * 0.1;
        const b = s.box([w, h, 1.0], [cornerX + dx, y + h / 2, cornerZ + dz], card); b.rotation.y = (random() - 0.5) * 0.3;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, h + 0.01, 1.01), tape); b.add(strip);
        const tag = s.label(pick(['KITCHEN', 'BOOKS', 'MISC', 'BEDROOM', 'KEEP', 'FRAGILE']), 0.7, 0.3, [0, 0, 0], '#1d1d22', '#b98d5c'); root.remove(tag); tag.rotation.y = Math.PI / 2; tag.position.set(w / 2 + 0.006, 0.05, 0); tag.castShadow = false; b.add(tag);
      }
    } else if (a.belongings === 'suitcase') {
      const shell = flat(pick(['#3a4a6a', '#6a3a3a', '#3a3a3e', '#4a6a5a']), { roughness: 0.6 });
      s.box([1.5, 0.3, 1.0], [cornerX + 0.2, 0.15, cornerZ], shell).rotation.y = 0.3;
      const lid = s.box([1.5, 0.12, 1.0], [cornerX - 0.25, 0.62, cornerZ - 0.5], shell); lid.rotation.set(-1.2, 0.3, 0);
      for (let i = 0; i < 4 + Math.floor(mood.density * 4); i++) cushion(0.5 + random() * 0.3, 0.2, 0.45, cornerX + 0.2 + (random() - 0.5) * 0.9, 0.36 + random() * 0.1, cornerZ + (random() - 0.5) * 0.6, flat(new THREE.Color().setHSL(random(), 0.35, 0.45), { roughness: 1 }), random() * 3);
    } else if (a.belongings === 'rail') {
      const rx = -5.6;
      for (const z of [2.2, 4.4]) { s.rod([rx, 0, z], [rx, 3.6, z], 0.04, steel); s.rod([rx - 0.4, 0.04, z], [rx + 0.4, 0.04, z], 0.04, steel); }
      s.rod([rx, 3.6, 2.2], [rx, 3.6, 4.4], 0.04, steel);
      const n = 4 + Math.floor(mood.density * 6);
      for (let i = 0; i < n; i++) { const z = 2.4 + (i / Math.max(n - 1, 1)) * 1.8, len = 1.3 + random() * 1.1; s.box([0.85, len, 0.09], [rx, 3.45 - len / 2, z], flat(new THREE.Color().setHSL(random(), mix(0.1, 0.5, mood.cheer), 0.3 + random() * 0.3), { roughness: 1 })).rotation.y = (random() - 0.5) * 0.3; }
    } else if (a.belongings === 'bike') {
      const paintTone = flat(pick(['#c8302a', '#2f6fc8', '#e0a020', '#2a2c30', '#3aa86b']), { metalness: 0.4, roughness: 0.4 });
      const bx = -6.1, lean = 0.16;
      const g = new THREE.Group(); g.position.set(bx, 0, 3.2); g.rotation.z = -lean; root.add(g);
      const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); return m; };
      for (const z of [-1.05, 1.05]) { const w = add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 32), dark)); w.rotation.y = Math.PI / 2; w.position.set(0, 0.77, z); const hub = add(new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.012, 6, 32), steel)); hub.rotation.y = Math.PI / 2; hub.position.set(0, 0.77, z); }
      const tubeBetween = (p: [number, number, number], q: [number, number, number], r = 0.04, m: THREE.Material = paintTone) => { const from = new THREE.Vector3(...p), to = new THREE.Vector3(...q); const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 8), m)); mesh.position.copy(from).add(to).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize()); };
      tubeBetween([0, 0.77, -1.05], [0, 1.75, -0.6]); tubeBetween([0, 1.75, -0.6], [0, 1.8, 0.75]); tubeBetween([0, 0.8, 0.05], [0, 1.75, -0.6]); tubeBetween([0, 0.8, 0.05], [0, 1.8, 0.75]); tubeBetween([0, 0.77, -1.05], [0, 0.8, 0.05]); tubeBetween([0, 0.77, 1.05], [0, 2.1, 0.7]);
      tubeBetween([-0.35, 2.12, 0.7], [0.35, 2.12, 0.7], 0.03, dark); tubeBetween([0, 1.75, -0.6], [0, 2.0, -0.68], 0.03, steel);
      const saddle = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.5), dark)); saddle.position.set(0, 2.03, -0.7);
    }

    // ----- Floor clutter, kept to the edges so the cast has room -----
    const clutter = Math.floor(mood.density * 12 + random() * 2);
    const edges: [number, number, number, number][] = [[0.6, 5.5, -2.3, -1.9], [5.3, 6.2, -1.2, 2.2], [-4.8, -2.2, -4.5, -3.6], [-1.6, 0.4, -4.4, -2.6], [-4.7, -3.9, -1.5, 0.6]];
    for (let i = 0; i < clutter; i++) {
      const [x0, x1, z0, z1] = edges[i % edges.length];
      const x = mix(x0, x1, random()), z = mix(z0, z1, random());
      const kind = i % 4;
      if (kind === 0) cushion(0.7 + random() * 0.5, 0.18 + random() * 0.14, 0.6, x, 0.1, z, flat(new THREE.Color().setHSL(random(), mix(0.1, 0.45, mood.cheer), 0.3 + random() * 0.3), { roughness: 1 }), random() * 3);
      else if (kind === 1) { const can = s.cylinder(0.075, 0.075, 0.27, [x, random() < 0.5 ? 0.135 : 0.075, z], flat(pick(['#c2281f', '#c9ced2', '#2d8a4e', '#1f3f8c']), { metalness: 0.6, roughness: 0.35 }), 12); if (can.position.y < 0.1) { can.rotation.z = Math.PI / 2; can.rotation.y = random() * 3; } }
      else if (kind === 2) mug(x, 0, z);
      else { const pz = s.box([0.75, 0.09, 0.75], [x, 0.045 + (i % 3) * 0.09, z], flat('#b98d5c', { roughness: 0.95 })); pz.rotation.y = random(); }
    }
    // Shoes by the door, an extension lead to the lamp.
    for (let i = 0; i < 2; i++) { const shoe = s.ball([0.14, 0.09, 0.32], [doorX - 0.35 + i * 0.36, 0.09, -HD + 0.75 + random() * 0.15], flat(pick(['#2a2c30', '#e6e4dc', '#6a4a30'])), 10); shoe.rotation.y = (random() - 0.5) * 0.6; }
    s.tube([[lampX, 0.02, lampZ], [lampX + 0.4, 0.02, lampZ - 1.2], [lampX - 0.4, 0.02, lampZ - 2.4], [lampX + 0.3, 0.02, -HD + 0.55], [lampX + 0.4, 0.45, -HD + 0.12]], 0.022, flat('#e6e4dc')).castShadow = false;
    s.box([0.22, 0.3, 0.05], [lampX + 0.4, 0.55, -HD + 0.04], trim);

    // ----- Motion: the small things that stay awake -----
    const energy = mood.energy;
    const drift = (time: number) => {
      for (const m of steam) { const u = (time * mix(0.12, 0.4, energy) + m.userData.phase) % 1; m.position.set(m.userData.x + Math.sin(u * 5 + m.userData.phase * 9) * 0.08, m.userData.y + u * 0.9, m.userData.z); m.scale.setScalar(0.6 + u * 1.6); }
    };
    drift(0);
    const lampBase = lampLight.intensity, blueBase = blueLight?.intensity ?? 0;
    const breatheBase = breathing ? breathing.scale.y : 1;
    world.update = (_dt, time) => {
      drift(time);
      if (blueLight && (a.screen === 'tv' || a.screen === 'monitor')) {
        const f = 1 + (Math.sin(time * 7.3) * Math.sin(time * 3.1) * 0.5 + (Math.sin(time * 23) > 0.92 ? 0.3 : 0)) * mix(0.05, 0.3, energy);
        blueLight.intensity = blueBase * f;
        if (screenMaterial) screenMaterial.emissiveIntensity = 1.1 * f;
        if (bluePool) (bluePool.material as THREE.MeshBasicMaterial).opacity = 0.3 * f;
      }
      lampLight.intensity = lampBase * (1 + (mood.wear > 0.6 && Math.sin(time * 31) > 0.97 ? -0.35 : 0));
      twinkle.forEach((m, i) => { const v = 0.75 + 0.25 * Math.sin(time * mix(0.6, 4, energy) + i * 2.1); m.color.copy(twinkleBase[i]).multiplyScalar(v); });
      if (breathing) breathing.scale.y = breatheBase * (1 + Math.sin(time * 0.9) * 0.025);
    };
    return world;
  },
});

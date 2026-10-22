import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Slot = [number, number, number?, number?];

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

/** A hanging cloth rippled into folds. */
function pleated(width: number, height: number, folds: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, height, Math.max(8, Math.round(folds * 6)), 1);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / width + 0.5) * folds * Math.PI * 2) * depth);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    city: choice('What lies beyond the glass?', {
      towers: 'Dense office towers, grids of lit windows stacked to the top of the frame.',
      sprawl: 'A low city of scattered lights running to the horizon.',
      harbour: 'A dark harbour with a bridge of lights and towers on the far shore.',
      rain: 'Towers smeared by rain running down the glass.',
      neon: 'A neon sign across the street, pink and blue, buzzing on the ceiling.',
      fog: 'The city lost in fog, only the nearest lights showing.',
    }),
    curtain: choice('What is the curtain like?', {
      charcoal: 'Heavy charcoal grey.',
      wine: 'Dark wine red.',
      olive: 'Olive green.',
      gold: 'Gold brocade, an older grand hotel.',
      slate: 'Slate blue.',
    }),
    drawn: choice('How far is the curtain drawn?', {
      half: 'Drawn across half the window.',
      open: 'Pulled open and bunched at one end.',
      nearly: 'Drawn nearly shut, one tall gap of city light.',
    }),
    bed: choice('What state is the bed in?', {
      tight: 'Made tight and untouched, a runner across the foot.',
      turned: 'Turned down for the night, a chocolate on the pillow.',
      slept: 'Someone has lain on top of it in their clothes; the cover is creased, a pillow pushed aside.',
      laid: 'A suit, a shirt and a tie laid out flat on the cover, shoes at the foot.',
    }),
    desk: choice('What is on the desk?', {
      phone: 'The room phone, a notepad and a pen.',
      laptop: 'An open laptop glowing, a coffee cup beside it.',
      bottles: 'Minibar bottles and a used glass.',
      papers: 'Papers spread out under the lamp.',
      nothing: 'Nothing but the lamp and the folder of hotel information.',
    }),
    door: choice('What about the door to the corridor?', {
      closed: 'Closed.',
      chained: 'Closed with the security chain on.',
      ajar: 'Open a crack, corridor light across the carpet.',
      wedged: 'Closed with the desk chair wedged under the handle.',
    }),
    wardrobe: choice('What about the wardrobe?', {
      shut: 'Both doors shut, the mirror showing the room.',
      open: 'The mirrored door swung open on a hanging suit and the safe.',
      empty: 'Open and empty, hangers bare.',
    }),
    lamps: choice('Which lamps are on?', {
      bedside: 'Only the bedside lamp.',
      desk: 'Only the desk lamp.',
      both: 'The bedside lamp and the desk lamp.',
      none: 'None; only the city lights the room.',
    }),
    tv: choice('What is the television doing?', {
      off: 'Off, a black rectangle on the wall.',
      static: 'On, showing grey static.',
      news: 'On, rolling news on mute.',
      menu: 'On, stuck on the hotel welcome screen.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const RW = 6.4, RD = 5.6, HW = 2.7, T = 0.18;
    const xi = -RW / 2 + T, zi = -RD / 2 + T;
    const warm = mood.warmth;
    const glow = new THREE.Color('#ffb067').lerp(new THREE.Color('#ff8a3a'), warm);
    const cityGlow = new THREE.Color('#5c6f9a').lerp(new THREE.Color('#c26a2e'), warm);
    const slots: Slot[] = [[0.9, 1.1], [-1.2, -1.8], [xi + 0.33, -1.75, 0.76, 0.3], [-1.9, 0.6], [-2.0, 2.0], [1.6, -2.1]];
    const bedSlot: Slot = [2.0, -0.6, 0.59, 0.7];
    const { art: s, world } = diorama(context, {
      background: '#5c6478', floor: '#3b3741', width: RW + 0.8, depth: RD + 0.8, maxHeight: 2.2, radius: 1.2, pitch: 30, yaw: 32,
      slots, scale: [0.8, 1.35],
    });
    const root = s.root;
    // Night: the daylight rig is dimmed and tinted; the window and the lamps do the work.
    const key = world.keyLight;
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = 0.62; light.color.set('#8c97bd'); (light as THREE.HemisphereLight).groundColor.set('#5a3f32'); }
      else if (light.castShadow) { light.intensity = 1.25; light.color.copy(cityGlow).lerp(new THREE.Color('#ffffff'), 0.35); }
      else light.intensity = 0.3;
    });

    // ---- carpet, walls, trim ---------------------------------------------------------------
    const carpetMap = paint(512, 512, (g, w, h) => {
      g.fillStyle = '#4d4854'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(150,140,160,0.35)'; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = i * 64 + 32, y = j * 64 + 32; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 18, y); g.lineTo(x, y + 18); g.lineTo(x - 18, y); g.closePath(); g.stroke(); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(random() * w, random() * h, 2, 2); }
      for (let i = 0; i < Math.round(mood.wear * 9); i++) { g.fillStyle = 'rgba(20,15,10,0.25)'; g.beginPath(); g.ellipse(random() * w, random() * h, 14 + random() * 30, 10 + random() * 20, random() * 3, 0, 7); g.fill(); }
    }, [4, 3.5]);
    const carpet = s.mesh(new THREE.PlaneGeometry(RW - T, RD - T), new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1 }), [T / 2, 0.006, T / 2]);
    carpet.rotation.x = -Math.PI / 2; carpet.castShadow = false;
    const wallMap = paint(256, 256, (g, w, h) => {
      g.fillStyle = '#9a9188'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1200; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; g.fillRect(random() * w, random() * h, 3, 3); }
      for (let i = 0; i < Math.round(mood.wear * 6); i++) { g.fillStyle = 'rgba(40,30,20,0.18)'; g.fillRect(random() * w, h * 0.7 + random() * 60, 20 + random() * 40, 6 + random() * 10); }
    }, [2, 2]);
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.95 });
    const seg = (side: 'back' | 'left', a0: number, a1: number, y0: number, y1: number) => {
      const len = a1 - a0, hgt = y1 - y0, mid = (a0 + a1) / 2, cy = (y0 + y1) / 2;
      return side === 'back' ? s.box([len, hgt, T], [mid, cy, -RD / 2 + T / 2], wall) : s.box([T, hgt, len], [-RW / 2 + T / 2, cy, mid], wall);
    };
    const WX0 = xi, WX1 = 2.0, DZ0 = 1.5, DZ1 = 2.4, DH = 2.1;
    seg('back', -RW / 2, WX0, 0, HW); seg('back', WX1, RW / 2, 0, HW); seg('back', WX0, WX1, HW - 0.12, HW); seg('back', WX0, WX1, 0, 0.1);
    seg('left', -RD / 2, DZ0, 0, HW); seg('left', DZ1, RD / 2, 0, HW); seg('left', DZ0, DZ1, DH, HW);
    const trim = s.material('#e9e4d8', { roughness: 0.6 });
    const dark = s.material('#1e1f23', { roughness: 0.6 });
    const chrome = s.material('#cfd4d8', { metalness: 0.85, roughness: 0.25 });
    s.box([RW / 2 - WX1, 0.1, 0.02], [(WX1 + RW / 2) / 2, 0.05, zi + 0.01], trim);
    for (const [z0, z1] of [[zi, DZ0], [DZ1, RD / 2]]) s.box([0.02, 0.1, z1 - z0], [xi + 0.01, 0.05, (z0 + z1) / 2], trim);

    // ---- the city beyond the glass ------------------------------------------------------
    const cityMap = paint(1024, 448, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      const top = new THREE.Color('#1a2033').lerp(new THREE.Color('#2a2436'), warm), low = new THREE.Color('#3c5078').lerp(new THREE.Color('#b05a2a'), warm);
      sky.addColorStop(0, '#' + top.getHexString()); sky.addColorStop(0.75, '#' + low.getHexString()); sky.addColorStop(1, '#' + low.clone().lerp(new THREE.Color('#ffd49a'), 0.3).getHexString());
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const litColour = () => (random() < mix(0.35, 0.85, warm) ? `rgba(255,${200 + Math.round(random() * 40)},${120 + Math.round(random() * 60)},` : `rgba(${170 + Math.round(random() * 40)},${210 + Math.round(random() * 30)},255,`);
      const lit = mix(0.25, 0.6, mood.density) * (a.city === 'fog' ? 0.5 : 1);
      const tower = (x: number, width: number, height: number, tone: string, cell: number) => {
        g.fillStyle = tone; g.fillRect(x, h - height, width, height);
        for (let yy = h - height + 6; yy < h - 4; yy += cell) for (let xx = x + 4; xx < x + width - 4; xx += cell) {
          if (random() > lit) continue;
          g.fillStyle = litColour() + (0.55 + random() * 0.45) + ')';
          g.fillRect(xx, yy, cell * 0.55, cell * 0.45);
        }
      };
      const skyline = a.city === 'sprawl' ? 0.25 : 1;
      // A far row of grey towers, then nearer dark ones.
      for (let x = -20; x < w; x += 30 + random() * 50) tower(x, 20 + random() * 40, (60 + random() * 190) * skyline + 20, '#2f3448', 7);
      if (a.city === 'harbour') {
        g.fillStyle = '#121626'; g.fillRect(0, h * 0.6, w, h * 0.4);
        for (let i = 0; i < 120; i++) { g.fillStyle = litColour() + (0.1 + random() * 0.2) + ')'; g.fillRect(random() * w, h * 0.6 + random() * h * 0.4, 2, 14 + random() * 40); }
        for (let i = 0; i < 46; i++) { g.fillStyle = 'rgba(255,230,170,0.95)'; g.beginPath(); g.arc(60 + i * 20, h * 0.5 + Math.sin(i / 45 * Math.PI) * -40, 3, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(200,200,220,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, h * 0.55); g.quadraticCurveTo(w / 2, h * 0.42, w - 60, h * 0.55); g.stroke();
        for (let x = 0; x < w; x += 120 + random() * 160) tower(x, 40 + random() * 70, 120 + random() * 160, '#171a28', 10);
      } else {
        for (let x = -30; x < w; x += 70 + random() * 110) tower(x, 50 + random() * 90, (140 + random() * 260) * skyline + 30, '#171a28', 11);
      }
      if (a.city === 'sprawl') for (let i = 0; i < 900; i++) { g.fillStyle = litColour() + (0.4 + random() * 0.6) + ')'; const yy = h * 0.55 + random() * h * 0.45; g.fillRect(random() * w, yy, 2 + (yy - h * 0.55) / h * 6, 2); }
      if (a.city === 'neon') {
        g.fillStyle = '#0f1018'; g.fillRect(w * 0.55, h * 0.1, w * 0.45, h * 0.9);
        const pink = '#ff4fa3', blue = '#3fc8ff';
        g.shadowBlur = 40; g.shadowColor = pink; g.strokeStyle = pink; g.lineWidth = 8; g.strokeRect(w * 0.62, h * 0.22, w * 0.3, h * 0.26);
        g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.fillStyle = pink; g.fillText('HOTEL', w * 0.77, h * 0.4);
        g.shadowColor = blue; g.fillStyle = blue; g.font = 'bold 60px sans-serif'; g.fillText('VACANCY', w * 0.77, h * 0.62);
        g.shadowBlur = 0;
      }
      if (a.city === 'fog') { g.fillStyle = 'rgba(120,130,150,0.55)'; g.fillRect(0, 0, w, h); const haze = g.createLinearGradient(0, 0, 0, h); haze.addColorStop(0, 'rgba(110,120,140,0.6)'); haze.addColorStop(1, 'rgba(110,120,140,0)'); g.fillStyle = haze; g.fillRect(0, 0, w, h); }
      if (a.city === 'rain') { g.strokeStyle = 'rgba(200,215,235,0.35)'; g.lineWidth = 2; for (let i = 0; i < 180; i++) { const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 6, y + 30 + random() * 90); g.stroke(); } for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(230,240,255,0.5)'; g.beginPath(); g.arc(random() * w, random() * h, 1 + random() * 3, 0, 7); g.fill(); } }
    });
    // The backdrop is the farthest thing in the scene, so it needs no depth write; that also keeps it out of the frame fit.
    const cityMat = new THREE.MeshStandardMaterial({ map: cityMap, emissiveMap: cityMap, emissive: '#ffffff', emissiveIntensity: a.city === 'fog' ? 0.8 : 1.15, roughness: 0.9, depthWrite: false });
    const city = s.mesh(new THREE.PlaneGeometry(9.5, 3.7), cityMat, [-0.8, 1.55, -RD / 2 - 0.55]);
    city.castShadow = city.receiveShadow = false;
    city.renderOrder = -10;
    // The glass and its mullions.
    const glassW = WX1 - WX0;
    const pane = s.mesh(new THREE.PlaneGeometry(glassW, HW - 0.22), new THREE.MeshPhysicalMaterial({ color: '#9fb6c8', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.1, depthWrite: false }), [(WX0 + WX1) / 2, HW / 2 - 0.01, zi + 0.02]);
    pane.castShadow = false;
    for (let x = WX0; x <= WX1 + 0.01; x += glassW / 4) s.box([0.06, HW - 0.22, 0.1], [x, HW / 2 - 0.01, zi + 0.02], dark);
    s.box([glassW + 0.1, 0.06, 0.12], [(WX0 + WX1) / 2, HW - 0.15, zi + 0.02], dark);
    s.box([glassW + 0.1, 0.06, 0.14], [(WX0 + WX1) / 2, 0.13, zi + 0.03], dark);
    // The heavy curtain, on a rail under the ceiling.
    const curtainTone = { charcoal: '#3a3b40', wine: '#5c1f2a', olive: '#4a5236', gold: '#9c7a33', slate: '#44546a' }[a.curtain];
    const curtainMap = paint(256, 256, (g, w, h) => {
      g.fillStyle = curtainTone; g.fillRect(0, 0, w, h);
      if (a.curtain === 'gold') { g.strokeStyle = 'rgba(255,230,150,0.35)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.ellipse(i * 43 + 21, j * 43 + 21, 14, 18, 0, 0, 7); g.stroke(); } }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${random() * 0.12})`; g.fillRect(random() * w, 0, 3 + random() * 6, h); }
    }, [2, 1]);
    const curtainMat = new THREE.MeshStandardMaterial({ map: curtainMap, roughness: 1, side: THREE.DoubleSide });
    const cover = { half: 2.5, open: 0.7, nearly: 4.3 }[a.drawn];
    const curtain = s.mesh(pleated(cover, HW - 0.1, Math.round(cover * (a.drawn === 'open' ? 9 : 4)), a.drawn === 'open' ? 0.12 : 0.07), curtainMat, [WX0 + cover / 2, HW / 2 - 0.05, zi + 0.14]);
    void curtain;
    s.cylinder(0.015, 0.015, glassW + 0.1, [(WX0 + WX1) / 2, HW - 0.04, zi + 0.14], dark, 10).rotation.z = Math.PI / 2;

    // ---- the door to the corridor ---------------------------------------------------------
    const doorTone = s.material('#4a3426', { roughness: 0.45 });
    const swing = a.door === 'ajar' ? 0.32 : 0;
    const door = new THREE.Group();
    door.position.set(xi - 0.06, 0, DZ0);
    door.rotation.y = swing;
    root.add(door);
    const inDoor = (mesh: THREE.Mesh) => { door.add(mesh); return mesh; };
    inDoor(s.box([0.05, DH - 0.03, DZ1 - DZ0 - 0.02], [0, DH / 2, (DZ1 - DZ0) / 2], doorTone));
    inDoor(s.cylinder(0.018, 0.018, 0.012, [0.03, 1.55, (DZ1 - DZ0) / 2], chrome, 12)).rotation.z = Math.PI / 2;
    inDoor(s.box([0.012, 0.3, 0.22], [0.03, 1.25, (DZ1 - DZ0) / 2], trim));
    inDoor(s.box([0.012, 0.02, 0.18], [0.037, 1.36, (DZ1 - DZ0) / 2], s.material('#b8201c')));
    inDoor(s.box([0.03, 0.025, 0.14], [0.05, 1.0, DZ1 - DZ0 - 0.13], chrome));
    if (a.door === 'chained') { inDoor(s.box([0.02, 0.03, 0.05], [0.04, 1.4, DZ1 - DZ0 - 0.1], chrome)); s.box([0.02, 0.03, 0.09], [xi + 0.01, 1.4, DZ1 + 0.06], chrome); s.rod([xi + 0.04, 1.4, DZ1 + 0.06], [xi + 0.0, 1.38, DZ1 - 0.1], 0.006, chrome); }
    for (const z of [DZ0 - 0.04, DZ1 + 0.04]) s.box([0.04, DH + 0.08, 0.08], [xi + 0.01, (DH + 0.08) / 2, z], trim);
    s.box([0.04, 0.08, DZ1 - DZ0 + 0.16], [xi + 0.01, DH + 0.04, (DZ0 + DZ1) / 2], trim);
    if (a.door === 'ajar') {
      const hallMap = paint(128, 256, (g, w, h) => { g.fillStyle = '#e6d6b4'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a2a2e'; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = '#fff2d0'; g.fillRect(w * 0.3, 10, w * 0.4, 8); });
      const hall = s.mesh(new THREE.PlaneGeometry(DZ1 - DZ0, DH), new THREE.MeshStandardMaterial({ map: hallMap, emissiveMap: hallMap, emissive: '#ffffff', emissiveIntensity: 1.1 }), [-RW / 2 - 0.3, DH / 2, (DZ0 + DZ1) / 2]);
      hall.rotation.y = Math.PI / 2;
      const shape = new THREE.Shape(); shape.moveTo(0, DZ1 - 0.15); shape.lineTo(0, DZ1); shape.lineTo(2.4, DZ1 + 0.5); shape.lineTo(2.4, DZ1 - 0.9); shape.closePath();
      const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
      const spill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
      spill.position.set(xi, 0.012, 0); root.add(spill);
    }

    // ---- the wardrobe with a mirrored door -----------------------------------------------
    const laminate = s.material('#6b4b36', { roughness: 0.5 });
    const WZ0 = -0.3, WZ1 = 1.3, WD = 0.6, WH2 = 2.2;
    s.box([WD, WH2, WZ1 - WZ0], [xi + WD / 2, WH2 / 2, (WZ0 + WZ1) / 2], laminate);
    s.box([WD - 0.08, WH2 - 0.1, WZ1 - WZ0 - 0.08], [xi + WD / 2 + 0.03, WH2 / 2, (WZ0 + WZ1) / 2], s.material('#2a2024', { roughness: 0.9 }));
    const mirrorMap = paint(128, 320, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#5a5e6c'); grad.addColorStop(1, '#3a363e');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.fillStyle = '#' + cityGlow.clone().lerp(new THREE.Color('#ffd9a0'), 0.4).getHexString(); g.fillRect(w * 0.1, h * 0.05, w * 0.5, h * 0.8);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(w * 0.55, h * 0.6, w * 0.45, h * 0.12);
    });
    const mirrorMat = new THREE.MeshStandardMaterial({ map: mirrorMap, emissiveMap: mirrorMap, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.4 });
    const leafW = (WZ1 - WZ0) / 2 - 0.01;
    const mirrorDoor = new THREE.Group();
    mirrorDoor.position.set(xi + WD, 0, WZ0 + 0.005);
    mirrorDoor.rotation.y = a.wardrobe === 'shut' ? 0 : 1.35;
    root.add(mirrorDoor);
    const leaf = s.box([0.025, WH2 - 0.04, leafW], [0.0125, WH2 / 2, leafW / 2], laminate); mirrorDoor.add(leaf);
    const glassLeaf = s.mesh(new THREE.PlaneGeometry(leafW - 0.08, WH2 - 0.16), mirrorMat, [0.027, WH2 / 2, leafW / 2]); glassLeaf.rotation.y = Math.PI / 2; mirrorDoor.add(glassLeaf);
    const knob = s.cylinder(0.01, 0.01, 0.08, [0.06, 1.0, leafW - 0.08], chrome, 8); mirrorDoor.add(knob);
    s.box([0.025, WH2 - 0.04, leafW], [xi + WD + 0.0125, WH2 / 2, WZ1 - leafW / 2 - 0.005], laminate);
    s.cylinder(0.01, 0.01, 0.08, [xi + WD + 0.06, 1.0, WZ1 - leafW + 0.08], chrome, 8);
    if (a.wardrobe !== 'shut') {
      s.cylinder(0.012, 0.012, leafW - 0.1, [xi + 0.3, WH2 - 0.25, WZ0 + leafW / 2], chrome, 8).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.box([0.3, 0.01, 0.012], [xi + 0.3, WH2 - 0.28, WZ0 + 0.2 + i * 0.16], s.material('#8a6a3a'));
      if (a.wardrobe === 'open') {
        s.box([0.12, 0.7, 0.42], [xi + 0.3, WH2 - 0.64, WZ0 + 0.35], s.material('#23262e', { roughness: 0.9 }));
        s.box([0.1, 0.4, 0.3], [xi + 0.3, WH2 - 0.5, WZ0 + 0.55], s.material('#e9e6dc', { roughness: 0.9 }));
        s.box([0.36, 0.22, 0.42], [xi + 0.28, 0.5, WZ0 + 0.4], s.material('#3a3d42', { metalness: 0.6, roughness: 0.4 }));
        s.box([0.04, 0.06, 0.12], [xi + 0.47, 0.5, WZ0 + 0.4], new THREE.MeshStandardMaterial({ color: '#222', emissive: '#3ddc5a', emissiveIntensity: 0.9 }));
      }
    }

    // ---- the desk, its lamp and chair ----------------------------------------------------
    const DZ = -1.75, DL = 1.5, DDEEP = 0.65, DY = 0.75;
    s.box([DDEEP, 0.03, DL], [xi + DDEEP / 2, DY - 0.015, DZ], laminate);
    for (const z of [DZ - DL / 2 + 0.015, DZ + DL / 2 - 0.015]) s.box([DDEEP - 0.05, DY - 0.03, 0.03], [xi + DDEEP / 2, (DY - 0.03) / 2, z], laminate);
    s.box([0.45, 0.5, 0.45], [xi + 0.3, 0.25, DZ + 0.45], dark);
    s.box([0.3, 0.3, 0.02], [xi + 0.3, 0.25, DZ + 0.68], s.material('#2a2c31', { metalness: 0.4, roughness: 0.4 }));
    const deskLit = a.lamps === 'desk' || a.lamps === 'both';
    const bedLit = a.lamps === 'bedside' || a.lamps === 'both';
    const shade = (lit: boolean) => new THREE.MeshStandardMaterial({ color: '#f2e6c8', emissive: glow, emissiveIntensity: lit ? 1.3 : 0.05, roughness: 0.9, side: THREE.DoubleSide });
    s.cylinder(0.07, 0.08, 0.02, [xi + 0.25, DY + 0.01, DZ - 0.55], dark, 14);
    s.rod([xi + 0.25, DY + 0.02, DZ - 0.55], [xi + 0.35, DY + 0.42, DZ - 0.45], 0.008, dark);
    s.mesh(new THREE.ConeGeometry(0.11, 0.14, 18, 1, true), shade(deskLit), [xi + 0.38, DY + 0.44, DZ - 0.42]);
    if (deskLit) { const lamp = new THREE.PointLight(glow, 7, 4.5, 2); lamp.position.set(xi + 0.38, DY + 0.38, DZ - 0.42); root.add(lamp); }
    const chairAt: P3 = a.door === 'wedged' ? [xi + 0.33, 0, (DZ0 + DZ1) / 2] : [xi + DDEEP + 0.3, 0, DZ];
    const chair = new THREE.Group();
    chair.position.set(...chairAt);
    chair.rotation.y = a.door === 'wedged' ? Math.PI / 2 : -Math.PI / 2 + (random() - 0.5) * 0.5;
    if (a.door === 'wedged') { chair.rotation.z = 0.0; chair.rotation.x = -0.35; chair.position.y = 0.02; }
    root.add(chair);
    const seatMat = s.material('#3a3f4a', { roughness: 0.7 });
    const put = (mesh: THREE.Mesh, group: THREE.Group) => { group.add(mesh); return mesh; };
    put(s.box([0.44, 0.05, 0.44], [0, 0.46, 0], seatMat), chair);
    for (const x of [-0.19, 0.19]) for (const z of [-0.19, 0.19]) put(s.box([0.03, 0.44, 0.03], [x, 0.22, z], dark), chair);
    put(s.box([0.42, 0.42, 0.04], [0, 0.74, -0.2], seatMat), chair);
    // What is on the desk.
    const paperMat = s.material('#f1ede2', { roughness: 0.95 });
    if (a.desk === 'phone') {
      s.box([0.2, 0.06, 0.16], [xi + 0.4, DY + 0.03, DZ + 0.4], dark);
      s.box([0.06, 0.035, 0.2], [xi + 0.33, DY + 0.075, DZ + 0.4], dark);
      s.box([0.15, 0.004, 0.2], [xi + 0.3, DY + 0.002, DZ + 0.05], paperMat); s.cylinder(0.004, 0.004, 0.13, [xi + 0.35, DY + 0.006, DZ - 0.1], dark, 8).rotation.z = Math.PI / 2;
    } else if (a.desk === 'laptop') {
      s.box([0.24, 0.015, 0.33], [xi + 0.35, DY + 0.008, DZ], s.material('#a8acb0', { metalness: 0.7, roughness: 0.35 }));
      const screen = s.box([0.012, 0.23, 0.33], [xi + 0.24, DY + 0.13, DZ], s.material('#a8acb0', { metalness: 0.7, roughness: 0.35 }));
      screen.rotation.z = 0.2;
      const face = s.mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshStandardMaterial({ color: '#dfe9ff', emissive: '#8fb8ff', emissiveIntensity: 1.3 }), [xi + 0.252, DY + 0.13, DZ]);
      face.rotation.set(0, Math.PI / 2, 0.2, 'ZYX');
      const laptopLight = new THREE.PointLight('#8fb8ff', 2.5, 2.5, 2); laptopLight.position.set(xi + 0.45, DY + 0.25, DZ); root.add(laptopLight);
      s.cylinder(0.035, 0.03, 0.08, [xi + 0.4, DY + 0.04, DZ + 0.45], s.material('#f6f3ec', { roughness: 0.4 }), 14);
    } else if (a.desk === 'bottles') {
      for (let i = 0; i < 4; i++) s.cylinder(0.018, 0.02, 0.12 + random() * 0.04, [xi + 0.25 + random() * 0.3, DY + 0.07, DZ - 0.3 + i * 0.16], s.material(['#3a1a10', '#d9c38a', '#1f3d22', '#8a2a2a'][i], { roughness: 0.2 }), 10);
      s.cylinder(0.035, 0.03, 0.09, [xi + 0.45, DY + 0.045, DZ + 0.4], new THREE.MeshStandardMaterial({ color: '#eaf1f3', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 14);
      s.cylinder(0.1, 0.085, 0.14, [xi + 0.3, DY + 0.07, DZ + 0.1], chrome, 16);
    } else if (a.desk === 'papers') {
      const count = 5 + Math.round(mood.density * 6);
      for (let i = 0; i < count; i++) { const sheet = s.box([0.21, 0.002, 0.3], [xi + 0.15 + random() * 0.35, DY + 0.002 + i * 0.001, DZ - 0.5 + random() * 1.0], paperMat); sheet.rotation.y = (random() - 0.5) * 1.2; }
      s.cylinder(0.004, 0.004, 0.13, [xi + 0.35, DY + 0.008, DZ + 0.1], dark, 8).rotation.z = Math.PI / 2;
    } else {
      s.box([0.22, 0.02, 0.3], [xi + 0.33, DY + 0.01, DZ + 0.3], s.material('#5c2a2a', { roughness: 0.6 }));
    }
    // Hotel art above the desk.
    const artMap = paint(256, 160, (g, w, h) => { const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, '#c9b9a0'); grad.addColorStop(1, '#6a7a8a'); g.fillStyle = grad; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(w * 0.6, h * 0.45, 40, 0, 7); g.fill(); g.fillStyle = 'rgba(40,40,60,0.35)'; g.fillRect(0, h * 0.7, w, h * 0.3); });
    const art = s.mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshStandardMaterial({ map: artMap, roughness: 0.7 }), [xi + 0.035, 1.75, DZ]);
    art.rotation.y = Math.PI / 2;
    s.box([0.03, 0.68, 1.06], [xi + 0.02, 1.75, DZ], dark);

    // ---- the bed, bedside tables and lamp ----------------------------------------------
    const BX0 = 1.0, BX1 = 3.1, BZ0 = -1.6, BZ1 = 0.3, BX = (BX0 + BX1) / 2, BZ = (BZ0 + BZ1) / 2, BL = BX1 - BX0, BW = BZ1 - BZ0;
    const white = s.material('#f3f1ea', { roughness: 0.95 });
    const sheet = s.material('#e4e1d8', { roughness: 0.95 });
    s.box([BL, 0.3, BW], [BX, 0.15, BZ], s.material('#2f2a2e', { roughness: 0.9 }));
    s.box([BL, 0.25, BW], [BX, 0.425, BZ], sheet);
    s.box([BL + 0.04, 0.04, BW + 0.04], [BX, 0.57, BZ], white);
    s.box([0.08, 1.3, BW + 0.3], [BX1 + 0.02, 0.65, BZ], s.material('#5a4030', { roughness: 0.6 }));
    const pillow = (z: number, turn: number) => { const p = s.box([0.3, 0.12, 0.72], [BX1 - 0.2, 0.65, z], white); p.rotation.y = turn; return p; };
    if (a.bed === 'tight') { pillow(BZ - 0.45, 0); pillow(BZ + 0.45, 0); s.box([0.5, 0.012, BW + 0.06], [BX0 + 0.35, 0.596, BZ], s.material('#5c1f2a', { roughness: 0.8 })); }
    if (a.bed === 'turned') {
      pillow(BZ - 0.45, 0); pillow(BZ + 0.45, 0);
      const fold = s.box([0.9, 0.03, 0.7], [BX0 + 0.5, 0.6, BZ1 - 0.3], sheet); fold.rotation.y = 0.05;
      s.box([0.9, 0.02, 0.5], [BX0 + 0.5, 0.56, BZ1 - 0.6], s.material('#f6f4ee', { roughness: 0.95 }));
      s.box([0.05, 0.012, 0.05], [BX1 - 0.2, 0.72, BZ + 0.45], s.material('#3a1f14'));
    }
    if (a.bed === 'slept') {
      pillow(BZ - 0.4, 0.3).position.x = BX1 - 0.28; pillow(BZ + 0.55, -0.15);
      for (let i = 0; i < 7; i++) { const crease = s.ball([0.25 + random() * 0.3, 0.03, 0.12 + random() * 0.1], [BX0 + 0.3 + random() * (BL - 0.6), 0.59, BZ0 + 0.2 + random() * (BW - 0.4)], white, 10); crease.rotation.y = random() * 3; }
      const runner = s.box([0.5, 0.012, BW * 0.7], [BX0 + 0.2, 0.012, BZ1 + 0.45], s.material('#5c1f2a', { roughness: 0.8 })); runner.rotation.y = 0.6;
      s.ball([0.25, 0.07, 0.25], [BX0 + 1.0, 0.63, BZ + 0.3], s.material('#2a2f3a', { roughness: 0.9 }), 10);
    }
    if (a.bed === 'laid') {
      pillow(BZ - 0.45, 0); pillow(BZ + 0.45, 0);
      const suit = s.material('#23262e', { roughness: 0.7 });
      s.box([0.9, 0.035, 0.55], [BX - 0.1, 0.61, BZ - 0.35], suit);
      s.box([0.45, 0.04, 0.3], [BX - 0.1, 0.63, BZ - 0.35], s.material('#eeece4', { roughness: 0.9 }));
      s.box([0.5, 0.012, 0.06], [BX - 0.1, 0.655, BZ - 0.35], s.material('#8a1f2a', { roughness: 0.5 })).rotation.y = 0.1;
      s.box([1.1, 0.03, 0.4], [BX - 0.05, 0.61, BZ + 0.35], suit);
      for (const dz of [-0.08, 0.08]) { s.box([0.28, 0.05, 0.1], [BX0 - 0.25, 0.025, BZ1 - 0.2 + dz], s.material('#141416', { roughness: 0.25 })); }
    }
    for (const z of [BZ1 + 0.35, BZ0 - 0.35]) { s.box([0.5, 0.55, 0.45], [BX1 - 0.3, 0.275, z], laminate); s.box([0.5, 0.02, 0.45], [BX1 - 0.3, 0.56, z], chrome); }
    const lampAt: P3 = [BX1 - 0.3, 0.56, BZ1 + 0.35];
    s.cylinder(0.09, 0.1, 0.02, [lampAt[0], lampAt[1] + 0.01, lampAt[2]], dark, 16);
    s.cylinder(0.02, 0.025, 0.3, [lampAt[0], lampAt[1] + 0.17, lampAt[2]], dark, 10);
    s.mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.24, 20, 1, true), shade(bedLit), [lampAt[0], lampAt[1] + 0.42, lampAt[2]]);
    if (bedLit) { const lamp = new THREE.PointLight(glow, 16, 7, 2); lamp.position.set(lampAt[0], lampAt[1] + 0.42, lampAt[2]); root.add(lamp); }
    s.box([0.1, 0.03, 0.14], [BX1 - 0.3, 0.575, BZ0 - 0.35], s.material('#1e1f23', { roughness: 0.3 }));
    s.box([0.18, 0.15, 0.05], [BX1 - 0.2, 0.635, BZ0 - 0.4], s.material('#2a2c31', { roughness: 0.6 }));
    s.box([0.12, 0.05, 0.02], [BX1 - 0.2, 0.65, BZ0 - 0.37], new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff3a2a', emissiveIntensity: 1.6 }));

    // ---- the television on the solid piece of back wall ----------------------------------
    s.box([1.1, 0.64, 0.05], [2.6, 1.55, zi + 0.025], dark);
    const tvMap = paint(256, 144, (g, w, h) => {
      if (a.tv === 'static') { for (let i = 0; i < 9000; i++) { const v = Math.round(random() * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(random() * w, random() * h, 2, 2); } }
      else if (a.tv === 'news') { g.fillStyle = '#2a3a5a'; g.fillRect(0, 0, w, h); g.fillStyle = '#d6c7b0'; g.fillRect(20, 20, w - 40, h - 60); g.fillStyle = '#c8232a'; g.fillRect(0, h - 34, w, 24); g.fillStyle = '#fff'; g.fillRect(10, h - 28, 120, 10); g.fillStyle = '#3b3f44'; g.fillRect(40, 40, 60, 60); }
      else if (a.tv === 'menu') { g.fillStyle = '#1c3a5a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f0e6c8'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('WELCOME', w / 2, 60); g.font = '14px sans-serif'; g.fillText('GRAND CENTRAL HOTEL', w / 2, 90); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(40, 110, w - 80, 2); }
      else { g.fillStyle = '#0a0b0e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, w, h * 0.4); }
    });
    const tvMat = new THREE.MeshStandardMaterial({ map: tvMap, emissiveMap: tvMap, emissive: '#ffffff', emissiveIntensity: a.tv === 'off' ? 0.05 : 1.0, roughness: 0.2 });
    s.mesh(new THREE.PlaneGeometry(1.02, 0.57), tvMat, [2.6, 1.55, zi + 0.052]);
    if (a.tv !== 'off') { const tvLight = new THREE.PointLight(a.tv === 'static' ? '#cfd8e8' : '#8fb0d8', 3, 4, 2); tvLight.position.set(2.6, 1.55, zi + 0.4); root.add(tvLight); }

    // ---- placement: flat heroes lie on the bed, short supports take the desk ---------------
    const floorSlots: Slot[] = [slots[1], slots[3], slots[4], slots[5]];
    const deskSlot = slots[2], heroFloor = slots[0];
    const place = world.place;
    world.place = (items: readonly Placeable[]) => {
      const hero = items.find((item) => item.hero) ?? items[0];
      const flat = hero && hero.height < 0.45 && hero.radius < 0.6;
      const order: Slot[] = [flat ? bedSlot : heroFloor];
      const free = [...floorSlots];
      let deskTaken = false;
      for (const item of items) {
        if (item === hero || (item.relation && item.relation !== 'apart')) continue;
        if (!deskTaken && item.height < 0.9 && item.radius < 0.5) { order.push(deskSlot); deskTaken = true; }
        else order.push(free.shift() ?? deskSlot);
      }
      while (order.length < 6) order.push(free.shift() ?? deskSlot);
      slots.splice(0, slots.length, ...order);
      place(items);
      // The key light comes in through the window as the city's glow, low and from behind.
      if (key) {
        key.target.position.set(0.5, 0.8, 0.5);
        key.position.set(-2.5, 3.2, -9);
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -5; shadow.right = shadow.top = 5; shadow.near = 0.1; shadow.far = 30;
        shadow.updateProjectionMatrix();
      }
    };
    const flicker = a.tv === 'static' ? mix(0.3, 1.6, mood.energy) : 0;
    world.update = (_dt, time) => {
      if (flicker) tvMat.emissiveIntensity = 0.85 + Math.sin(time * 23) * 0.12 * flicker + Math.sin(time * 7.3) * 0.08;
    };
    return world;
  },
});

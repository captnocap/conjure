import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

const TIMES = {
  dusk: 'Dusk: a peach and violet sky, the sodium lights just come on, long soft shadows.',
  overcast: 'Flat overcast noon: no shadows, no colour, everything evenly grey and exposed.',
  bluehour: 'Blue hour after sunset: cool air, pools of amber light on the asphalt.',
  afternoon: 'Hard late-afternoon sun raking down the aisle, hot metal and deep shade.',
} as const;
const SKY: Record<keyof typeof TIMES, { top: string; low: string; ground: string; key: string; keyPower: number; hemi: number; lamps: number }> = {
  dusk: { top: '#b9a6c4', low: '#f2c49a', ground: '#7d7a7c', key: '#ffc79a', keyPower: 1.5, hemi: 1.15, lamps: 1 },
  overcast: { top: '#d5d8d8', low: '#e4e5e1', ground: '#8a8c8c', key: '#f4f6f8', keyPower: 0.9, hemi: 1.9, lamps: 0.12 },
  bluehour: { top: '#6f86b4', low: '#b9a9c0', ground: '#666b7a', key: '#aebfe6', keyPower: 0.6, hemi: 0.72, lamps: 1.3 },
  afternoon: { top: '#bcd3e4', low: '#f0e3c4', ground: '#8d8a84', key: '#ffe2b0', keyPower: 2.9, hemi: 1.0, lamps: 0 },
};
const DOORS = {
  orange: 'Safety orange doors on pale steel, the national chain.',
  blue: 'Royal blue doors, tidy and corporate.',
  green: 'Dark green doors on cream block, an old family-run yard.',
  red: 'Sun-faded red doors, a place off the frontage road.',
  mixed: 'Doors repainted one at a time over decades: no two quite the same colour.',
  bare: 'Unpainted galvanised doors, the cheapest rows at the back.',
} as const;
const DOOR_TINT: Record<Exclude<keyof typeof DOORS, 'mixed'>, string> = { orange: '#e2702a', blue: '#2f5fa8', green: '#3d6b4a', red: '#b0594c', bare: '#aab1b2' };

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function ribbed(width: number, height: number, pitch: number, depth: number) {
  const count = Math.round(height / pitch) * 4;
  const geometry = new THREE.PlaneGeometry(width, height, 1, count);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const ph = ((p.getY(i) + height / 2) / pitch) % 1; p.setZ(i, ph > 0.25 && ph < 0.75 ? depth : 0); }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    time: choice('What time and weather is it?', TIMES),
    doors: choice('What colour are the unit doors?', DOORS),
    open: choice('Which units are open?', {
      one: 'One unit stands open with its light on, things set out in front of it.',
      none: 'Every door is down and locked. Nobody is here.',
      half: 'One door is raised halfway on darkness.',
      auction: 'Several doors are up along the row: auction day, or a clear-out.',
    }),
    end: choice('What closes the far end of the aisle?', {
      razor: 'A chain-link fence topped with coiled razor wire.',
      gate: 'A sliding exit gate with a keypad glowing beside it.',
      wall: 'A blank block wall with barbed wire: a dead end.',
      more: 'Another row of units across the end, more doors.',
    }),
    beyond: choice('What can be seen over the fence?', {
      overpass: 'A highway overpass with a green sign gantry and light poles.',
      hills: 'Low bare hills, far off.',
      city: 'A distant skyline with lit windows.',
      pylons: 'Power pylons and a water tower.',
      flat: 'Nothing but flat scrub and one billboard.',
    }),
    ground: choice('What state is the asphalt in?', {
      dry: 'Dry and swept, a pale concrete drain line down the middle.',
      wet: 'Just rained: the drain line runs with water and puddles hold the sky.',
      stained: 'Oil spots, tar patches and tyre marks.',
      leaves: 'Dead leaves and litter blown into the drain and the door sills.',
    }),
    dressing: choice('What else has been left in the aisle?', {
      nothing: 'Nothing. The aisle is empty.',
      pile: 'A dumped pile by the fence: a mattress, a broken chair, bin bags.',
      cart: 'The manager\'s golf cart parked against the row.',
      pallets: 'A stack of pallets and two traffic cones.',
      car: 'A hatchback backed up to a unit with its boot open.',
    }),
    lamps: choice('What are the wall lights like?', {
      sodium: 'Old sodium wall packs, deep amber.',
      led: 'New cold-white LED fittings.',
      failing: 'Sodium, with dead fittings and one that buzzes and flickers.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const sky = SKY[a.time];
    const background = new THREE.Color(sky.top).lerp(new THREE.Color(sky.low), 0.35);
    const meshes: THREE.Mesh[] = [];
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = root) => { parent.add(object); return object; };
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });
    const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material, parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true;
      meshes.push(mesh);
      return add(mesh, parent);
    };
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, list: { at: [number, number, number]; scale?: [number, number, number]; turn?: number; color?: THREE.ColorRepresentation }[], parent: THREE.Object3D = root) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((item, i) => {
        m.compose(new THREE.Vector3(...item.at), q.setFromAxisAngle(up, item.turn ?? 0), new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
        mesh.setMatrixAt(i, m);
        if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      return add(mesh, parent);
    };

    // ---- Light.
    const lampsOn = sky.lamps;
    const lampTint = new THREE.Color(a.lamps === 'led' ? '#dfeaff' : '#ffb054').lerp(new THREE.Color('#ff8a3a'), a.lamps === 'led' ? 0 : mood.warmth * 0.35);
    root.add(new THREE.HemisphereLight(new THREE.Color(sky.top).lerp(new THREE.Color('#ffffff'), 0.5), '#6f6a64', sky.hemi));
    const key = new THREE.DirectionalLight(new THREE.Color(sky.key), sky.keyPower);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.05; key.shadow.bias = -0.0004;
    key.shadow.radius = a.time === 'overcast' ? 9 : 3;
    root.add(key, key.target);

    // ---- Sky board with whatever stands beyond the fence.
    const SW = 1024, SH = 683, HOR = Math.round(SH * 0.85), PPM = SH / 80;
    const skyMap = paint(SW, SH, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, HOR);
      g.addColorStop(0, sky.top); g.addColorStop(0.55, `#${new THREE.Color(sky.top).lerp(new THREE.Color(sky.low), 0.5).getHexString()}`); g.addColorStop(1, sky.low);
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
      const sunX = SW * mix(0.34, 0.66, mood.daylight);
      if (a.time === 'dusk' || a.time === 'afternoon') {
        const r = ctx.createRadialGradient(sunX, HOR - (a.time === 'dusk' ? 14 : 150), 4, sunX, HOR - (a.time === 'dusk' ? 14 : 150), 230);
        r.addColorStop(0, a.time === 'dusk' ? 'rgba(255,214,150,0.95)' : 'rgba(255,250,225,0.9)'); r.addColorStop(1, 'rgba(255,220,170,0)');
        ctx.fillStyle = r; ctx.fillRect(0, 0, SW, HOR);
      }
      // Cloud bars.
      for (let i = 0; i < (a.time === 'overcast' ? 46 : 14); i++) {
        const y = random() * HOR * 0.9, w = 120 + random() * 380, h = a.time === 'overcast' ? 26 + random() * 50 : 5 + random() * 12;
        ctx.fillStyle = a.time === 'overcast' ? `rgba(${random() < 0.5 ? '196,200,202' : '232,234,232'},0.28)` : a.time === 'dusk' ? 'rgba(150,110,150,0.32)' : a.time === 'bluehour' ? 'rgba(90,100,140,0.3)' : 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(random() * SW, y, w / 2, h / 2, 0, 0, 7); ctx.fill();
      }
      const far = `#${new THREE.Color(sky.low).lerp(new THREE.Color('#3f4760'), a.time === 'overcast' ? 0.34 : 0.55).getHexString()}`;
      const farther = `#${new THREE.Color(sky.low).lerp(new THREE.Color('#3f4760'), 0.28).getHexString()}`;
      const lit = lampsOn > 0.5;
      const m = (metres: number) => metres * PPM;
      ctx.fillStyle = farther;
      if (a.beyond === 'hills' || a.beyond === 'pylons' || a.beyond === 'flat') {
        ctx.beginPath(); ctx.moveTo(0, HOR);
        const tall = a.beyond === 'hills' ? 15 : 3;
        for (let x = 0; x <= SW; x += 16) ctx.lineTo(x, HOR - m(tall * (0.45 + 0.3 * Math.sin(x * 0.011 + random() * 0.3) + 0.25 * Math.sin(x * 0.031 + 2))));
        ctx.lineTo(SW, HOR); ctx.fill();
      }
      ctx.fillStyle = far; ctx.strokeStyle = far;
      if (a.beyond === 'overpass') {
        const deck = HOR - m(8);
        ctx.fillRect(0, deck, SW, m(1.3));
        ctx.fillRect(0, deck - m(1), SW, m(0.25));
        for (let x = 60; x < SW; x += 150) ctx.fillRect(x, deck, m(1.4), m(8));
        // Sign gantry.
        const gx = SW * 0.5 + (random() - 0.5) * 120;
        ctx.fillRect(gx - m(9), deck - m(7), m(0.5), m(7)); ctx.fillRect(gx + m(9), deck - m(7), m(0.5), m(7)); ctx.fillRect(gx - m(9), deck - m(7), m(18.5), m(0.5));
        ctx.fillStyle = '#2f7a55'; ctx.fillRect(gx - m(7.5), deck - m(6.6), m(7), m(3.6)); ctx.fillRect(gx + m(1), deck - m(6.6), m(7), m(3.6));
        ctx.fillStyle = '#e9efe8'; for (const ox of [-7, 1.5]) { ctx.fillRect(gx + m(ox + 0.4), deck - m(5.6), m(5), m(0.5)); ctx.fillRect(gx + m(ox + 0.4), deck - m(4.4), m(3.6), m(0.5)); }
        ctx.fillStyle = far;
        for (let x = 20; x < SW; x += 110) { ctx.fillRect(x, deck - m(10), m(0.25), m(10)); ctx.fillRect(x, deck - m(10), m(2), m(0.25)); if (lit) { ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(x + m(2), deck - m(9.7), 4, 0, 7); ctx.fill(); ctx.fillStyle = far; } }
        if (lit) for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#fff2c8' : '#ff5a48'; ctx.fillRect(random() * SW, deck - m(0.9), 5, 3); }
      } else if (a.beyond === 'city') {
        for (let x = 0; x < SW; ) {
          const w = 18 + random() * 46, h = m(6 + random() * random() * 34);
          ctx.fillStyle = random() < 0.4 ? farther : far; ctx.fillRect(x, HOR - h, w, h);
          ctx.fillStyle = lit ? '#ffd890' : `#${new THREE.Color(sky.low).lerp(new THREE.Color('#ffffff'), 0.4).getHexString()}`;
          for (let yy = HOR - h + 5; yy < HOR - 6; yy += 9) for (let xx = x + 4; xx < x + w - 5; xx += 8) if (random() < (lit ? 0.4 : 0.18)) ctx.fillRect(xx, yy, 4, 5);
          x += w + random() * 6;
        }
      } else if (a.beyond === 'pylons') {
        const tops: [number, number][] = [];
        for (let x = 90; x < SW; x += 240) {
          const h = m(24), top = HOR - h; tops.push([x, top]);
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - m(3.5), HOR); ctx.lineTo(x - m(0.8), top); ctx.lineTo(x + m(0.8), top); ctx.lineTo(x + m(3.5), HOR); ctx.stroke();
          for (const k of [0.1, 0.3]) { ctx.beginPath(); ctx.moveTo(x - m(6), top + h * k); ctx.lineTo(x + m(6), top + h * k); ctx.stroke(); }
          for (let k = 0.4; k < 1; k += 0.2) { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - m(0.8 + 2.7 * k), top + h * k); ctx.lineTo(x + m(0.8 + 2.7 * (k + 0.2)), top + h * (k + 0.2)); ctx.moveTo(x + m(0.8 + 2.7 * k), top + h * k); ctx.lineTo(x - m(0.8 + 2.7 * (k + 0.2)), top + h * (k + 0.2)); ctx.stroke(); }
        }
        ctx.lineWidth = 1.5;
        for (let i = 0; i < tops.length - 1; i++) for (const side of [-6, 6]) { ctx.beginPath(); ctx.moveTo(tops[i][0] + m(side), tops[i][1] + m(2.4)); ctx.quadraticCurveTo((tops[i][0] + tops[i + 1][0]) / 2 + m(side), tops[i][1] + m(8), tops[i + 1][0] + m(side), tops[i + 1][1] + m(2.4)); ctx.stroke(); }
        const wx = SW * (0.3 + random() * 0.4);
        ctx.beginPath(); ctx.ellipse(wx, HOR - m(17), m(5), m(3.4), 0, 0, 7); ctx.fill();
        for (const dx of [-3.5, 0, 3.5]) ctx.fillRect(wx + m(dx) - 2, HOR - m(15), 4, m(15));
      } else if (a.beyond === 'flat') {
        const bx = SW * (0.4 + random() * 0.25);
        ctx.fillRect(bx + m(5), HOR - m(8), m(0.7), m(8));
        ctx.fillRect(bx, HOR - m(13), m(11), m(5.5));
        ctx.fillStyle = `#${new THREE.Color(sky.low).lerp(new THREE.Color('#ffffff'), 0.5).getHexString()}`; ctx.fillRect(bx + m(0.5), HOR - m(12.5), m(10), m(4.5));
        ctx.fillStyle = far; ctx.font = `bold ${m(2.1)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1ST MONTH $1', bx + m(5.5), HOR - m(10.2), m(9.4));
      }
      ctx.fillStyle = sky.ground; ctx.fillRect(0, HOR, SW, SH - HOR);
    });
    const skyBoard = add(new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshBasicMaterial({ map: skyMap, fog: false })));
    skyBoard.position.set(0, 28, -120);

    // ---- Ground: an endless plain, and the detailed aisle laid over it.
    const HALF = 3.3, Z0 = 14, Z1 = -24, LEN = Z0 - Z1;
    const plain = add(new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(sky.ground, { roughness: 0.98 })));
    plain.rotation.x = -Math.PI / 2; plain.position.set(0, -0.01, -60); plain.receiveShadow = true;
    const wet = a.ground === 'wet';
    const asphalt = new THREE.Color(wet ? '#5f6268' : '#7c7d7e').lerp(new THREE.Color('#8d8a84'), mood.wear * 0.3);
    const aisleMap = paint(512, 2048, (ctx) => {
      ctx.fillStyle = `#${asphalt.getHexString()}`; ctx.fillRect(0, 0, 512, 2048);
      for (let i = 0; i < 5200; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'; ctx.fillRect(random() * 512, random() * 2048, 2 + random() * 3, 2 + random() * 3); }
      const px = 512 / (HALF * 2), pz = 2048 / LEN;
      // Door aprons: a concrete strip along each row.
      ctx.fillStyle = 'rgba(190,188,178,0.75)'; ctx.fillRect(0, 0, px * 0.55, 2048); ctx.fillRect(512 - px * 0.55, 0, px * 0.55, 2048);
      // Valley drain.
      const dw = px * 0.9;
      ctx.fillStyle = wet ? '#8f9498' : '#b3b1a8'; ctx.fillRect(256 - dw / 2, 0, dw, 2048);
      const shade = ctx.createLinearGradient(256 - dw / 2, 0, 256 + dw / 2, 0); shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(0.5, 'rgba(0,0,0,0.22)'); shade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shade; ctx.fillRect(256 - dw / 2, 0, dw, 2048);
      ctx.fillStyle = 'rgba(40,40,40,0.5)'; for (let z = 0; z < 2048; z += pz * 3) ctx.fillRect(256 - dw / 2, z, dw, 3);
      for (const gz of [0.33, 0.72]) { // grates
        const y = 2048 * gz; ctx.fillStyle = '#2c2d2f'; ctx.fillRect(256 - dw * 0.42, y, dw * 0.84, pz * 0.6);
        ctx.fillStyle = '#6d6f70'; for (let k = 0; k < 7; k++) ctx.fillRect(256 - dw * 0.42 + k * dw * 0.125, y, 3, pz * 0.6);
      }
      // Cracks.
      ctx.strokeStyle = 'rgba(30,30,32,0.45)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6 + mood.wear * 22; i++) {
        let x = random() * 512, y = random() * 2048;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 70; y += (random() - 0.5) * 90; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (a.ground === 'stained' || mood.wear > 0.6) {
        for (let i = 0; i < 26; i++) { const x = random() * 512, y = random() * 2048, r = 8 + random() * 26; const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, 'rgba(20,18,16,0.6)'); g.addColorStop(1, 'rgba(20,18,16,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r * 1.5, r * 2, r * 3); }
        for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(48,48,50,0.4)'; ctx.fillRect(random() * 440, random() * 2000, 30 + random() * 60, 40 + random() * 110); }
        ctx.strokeStyle = 'rgba(25,25,25,0.3)'; ctx.lineWidth = 12;
        for (const x of [150 + random() * 30, 330 + random() * 30]) { ctx.beginPath(); ctx.moveTo(x, 2048); ctx.bezierCurveTo(x, 1500, x + 60, 1200, x + 30, 600); ctx.stroke(); }
      }
      if (a.ground === 'leaves') for (let i = 0; i < 900; i++) {
        const edge = random(); const x = edge < 0.45 ? 256 + (random() - 0.5) * dw * 1.3 : edge < 0.8 ? (random() < 0.5 ? random() * px * 0.8 : 512 - random() * px * 0.8) : random() * 512;
        ctx.fillStyle = ['#8a5a2c', '#a8742f', '#6d4a26', '#b99a4a', '#d9d4c4'][Math.floor(random() * 5)];
        ctx.save(); ctx.translate(x, random() * 2048); ctx.rotate(random() * 3); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
      }
    });
    aisleMap.anisotropy = 4;
    const aisle = add(new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, LEN), std('#ffffff', { map: aisleMap, roughness: wet ? 0.45 : 0.95, metalness: wet ? 0.25 : 0 })));
    aisle.rotation.x = -Math.PI / 2; aisle.position.set(0, 0.005, (Z0 + Z1) / 2); aisle.receiveShadow = true;
    if (wet) {
      const water = new THREE.MeshStandardMaterial({ color: new THREE.Color(sky.low).lerp(new THREE.Color(sky.top), 0.4), roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.78, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const puddle = add(new THREE.Mesh(new THREE.CircleGeometry(1, 20), water));
        puddle.rotation.x = -Math.PI / 2; puddle.scale.set(0.4 + random() * 0.6, 0.8 + random() * 1.6, 1);
        puddle.position.set((random() - 0.5) * (i % 3 ? 0.5 : 4), 0.012, Z0 - 3 - i * 3.6 - random() * 2);
      }
    }

    // ---- The two rows.
    const BAY = 3.0, BAYS = 12, DW = 2.5, DH = 2.25, RH = 2.95, DEPTH = 2.5, ROWLEN = BAY * BAYS, ZC = Z1 + ROWLEN / 2 + 0.2;
    const block = a.doors === 'green';
    const wallMat = std(block ? '#d6cdb4' : '#d3d5cd', { roughness: 0.8, metalness: block ? 0 : 0.2 });
    const trimMat = std('#70777a', { metalness: 0.4, roughness: 0.55 });
    const innerDark = std('#3a3b3c', { roughness: 1 });
    const doorGeo = ribbed(DW, DH, 0.075, 0.018);
    const doorMat = std('#ffffff', { roughness: mix(0.5, 0.85, mood.wear), metalness: a.doors === 'bare' ? 0.55 : 0.2, side: THREE.DoubleSide });
    const mixedTints = ['#e2702a', '#2f5fa8', '#3d6b4a', '#b0594c', '#d9c9a0', '#8a8f92', '#c9a23a'];
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: lampTint, emissiveIntensity: 0.25 + lampsOn * 2.6 });
    const poolMat = new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: 0.3 * lampsOn, depthWrite: false, blending: THREE.AdditiveBlending });
    const flickerMat = lampMat.clone(), flickerPool = poolMat.clone();
    const poolGeo = (() => {
      const tex = paint(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
      poolMat.map = tex; poolMat.alphaMap = null; flickerPool.map = tex;
      return new THREE.PlaneGeometry(1, 1);
    })();
    // Right row, bay 7 sits beside the first supporting slot.
    const openBays = new Map<string, number>(); // key side:index → raise fraction
    if (a.open === 'one') openBays.set('1:7', 0.94);
    if (a.open === 'half') openBays.set('1:7', 0.5);
    if (a.open === 'auction') { openBays.set('1:7', 0.94); openBays.set('-1:5', 0.94); openBays.set('1:5', 0.6); openBays.set('-1:8', 0.94); openBays.set('1:3', 0.94); if (mood.density > 0.5) openBays.set('-1:3', 0.94); }
    const lightsToUpdate: { light: THREE.PointLight; base: number }[] = [];
    const cardboard = std('#b88f5c', { roughness: 0.92 });

    for (const side of [-1, 1]) {
      const row = new THREE.Group();
      row.position.set(side * HALF, 0, ZC);
      row.rotation.y = -side * Math.PI / 2;
      root.add(row);
      // In row space: bays run along x, the doors face +z, the units recede toward -z.
      const xOf = (i: number) => -ROWLEN / 2 + BAY * (i + 0.5);
      box([ROWLEN, RH - DH, 0.14], [0, DH + (RH - DH) / 2, -0.07], wallMat, row);
      box([ROWLEN + 0.3, 0.12, DEPTH + 6.6], [0, RH + 0.06, -(DEPTH + 6) / 2 + 0.3], trimMat, row);
      box([ROWLEN, 0.1, 0.12], [0, RH - 0.06, 0.3], trimMat, row);
      box([ROWLEN, RH, 0.1], [0, RH / 2, -DEPTH], innerDark, row);
      box([ROWLEN, RH, 6], [0, RH / 2, -DEPTH - 3.05], wallMat, row);
      for (const end of [-1, 1]) box([0.14, RH, DEPTH], [end * ROWLEN / 2, RH / 2, -DEPTH / 2], wallMat, row);
      const piers: { at: [number, number, number] }[] = [], walls: { at: [number, number, number] }[] = [];
      for (let i = 0; i <= BAYS; i++) { const x = -ROWLEN / 2 + BAY * i; piers.push({ at: [x, DH / 2, -0.06] }); if (i > 0 && i < BAYS) walls.push({ at: [x, RH / 2, -DEPTH / 2] }); }
      instances(block ? new THREE.BoxGeometry(BAY - DW, DH, 0.14) : (() => { const g = new THREE.BoxGeometry(BAY - DW, DH, 0.14, 4, 1, 1); return g; })(), wallMat, piers, row);
      instances(new THREE.BoxGeometry(0.08, RH, DEPTH), innerDark, walls, row);
      instances(new THREE.BoxGeometry(0.06, DH, 0.1), trimMat, piers.flatMap((pier) => [{ at: [pier.at[0] - (BAY - DW) / 2 + 0.03, DH / 2, 0.03] as [number, number, number] }, { at: [pier.at[0] + (BAY - DW) / 2 - 0.03, DH / 2, 0.03] as [number, number, number] }]), row);
      instances(new THREE.CylinderGeometry(0.035, 0.035, RH - 0.1, 8), trimMat, piers.filter((_p, i) => i % 3 === 1).map((pier) => ({ at: [pier.at[0], (RH - 0.1) / 2, 0.06] as [number, number, number] })), row);
      // Doors.
      const doorList: { at: [number, number, number]; scale: [number, number, number]; color: THREE.ColorRepresentation }[] = [];
      const bars: { at: [number, number, number] }[] = [], latches: { at: [number, number, number] }[] = [];
      for (let i = 0; i < BAYS; i++) {
        const raise = openBays.get(`${side}:${i}`) ?? 0;
        const tint = new THREE.Color(a.doors === 'mixed' ? mixedTints[Math.floor(random() * mixedTints.length)] : DOOR_TINT[a.doors]);
        tint.lerp(new THREE.Color('#c9bfb2'), mood.wear * (0.15 + random() * 0.35)).offsetHSL(0, mix(-0.12, 0.06, mood.cheer), (random() - 0.5) * 0.05);
        const h = 1 - raise;
        doorList.push({ at: [xOf(i), DH - (DH * h) / 2, -0.05], scale: [1, h, 1], color: tint });
        bars.push({ at: [xOf(i), DH - DH * h + 0.035, -0.04] });
        if (raise < 0.3) latches.push({ at: [xOf(i) + DW / 2 - 0.2, DH - DH * h + 0.85, -0.02] });
        if (raise > 0.3) {
          // An open unit: lit or dark, with something of a life in it.
          const litUnit = a.open !== 'half' && (i === 7 || random() < 0.5);
          const glow = new THREE.Color('#ffd9a0');
          const back = box([BAY - 0.12, RH - 0.1, 0.04], [xOf(i), RH / 2, -DEPTH + 0.08], std(litUnit ? '#9a917c' : '#333435', { roughness: 1, emissive: glow, emissiveIntensity: litUnit ? 0.32 : 0 }), row);
          back.castShadow = false;
          const fill = mix(0.3, 1, mood.density);
          for (let k = 0; k < 4 + fill * 10; k++) {
            const w = 0.42 + random() * 0.14, hh = 0.3 + random() * 0.14;
            const col = Math.floor(random() * 5), level = Math.floor(random() * (1 + fill * 4));
            const b = box([w, hh, 0.44], [xOf(i) - 1.08 + col * 0.54, 0.04 + level * 0.4 + hh / 2, -DEPTH + 0.45 + random() * 0.5], std(random() < 0.3 ? '#a67c4b' : '#b88f5c', { roughness: 0.92, emissive: glow, emissiveIntensity: litUnit ? 0.12 : 0 }), row);
            b.rotation.y = (random() - 0.5) * 0.2;
          }
          if (litUnit) {
            const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: glow, emissiveIntensity: 2.4 })), row);
            bulb.position.set(xOf(i), RH - 0.5, -DEPTH / 2);
            if (i === 7 && side === 1) {
              const inside = add(new THREE.PointLight(glow, 26, 9, 1.8), row);
              inside.position.set(xOf(i), 2.0, -0.4);
              lightsToUpdate.push({ light: inside, base: 26 });
            }
            const spill = add(new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ color: glow, map: poolMat.map, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })), row);
            spill.rotation.x = -Math.PI / 2; spill.scale.set(3.4, 3.2, 1); spill.position.set(xOf(i), 0.02, 0.9);
          }
        }
      }
      const doorMesh = instances(doorGeo, doorMat, doorList, row);
      void doorMesh;
      instances(new THREE.BoxGeometry(DW, 0.07, 0.05), trimMat, bars, row);
      instances(new THREE.BoxGeometry(0.24, 0.09, 0.03), std('#c9cfd1', { metalness: 0.8, roughness: 0.3 }), latches, row);
      instances(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14).rotateX(Math.PI / 2), std('#d4241f', { emissive: '#d4241f', emissiveIntensity: 0.2 }), latches.filter(() => random() < 0.08 + mood.wear * 0.25 + (a.open === 'auction' ? 0.2 : 0)).map((l) => ({ at: [l.at[0] + 0.08, l.at[1] - 0.04, l.at[2] + 0.03] as [number, number, number] })), row);
      // Unit numbers, painted once per row along the fascia.
      const start = side === 1 ? 100 : 200;
      const strip = paint(4096, 64, (ctx) => {
        ctx.fillStyle = `#${wallMat.color.getHexString()}`; ctx.fillRect(0, 0, 4096, 64);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 44px sans-serif';
        for (let i = 0; i < BAYS; i++) {
          const cx = (i + 0.5) * (4096 / BAYS);
          ctx.fillStyle = '#f1ecd8'; ctx.fillRect(cx - 62, 6, 124, 52);
          ctx.fillStyle = '#22262a'; ctx.fillText(String(start + (side === 1 ? i : BAYS - 1 - i) * 2 + (side === 1 ? 1 : 0)), cx, 34);
        }
      });
      const fascia = add(new THREE.Mesh(new THREE.PlaneGeometry(ROWLEN, 0.4), std('#ffffff', { map: strip, roughness: 0.8 })), row);
      fascia.position.set(0, DH + 0.3, 0.005);
      // Wall lights over every second pier.
      const fixtures: { at: [number, number, number] }[] = [], lenses: { at: [number, number, number] }[] = [], pools: { at: [number, number, number]; scale: [number, number, number] }[] = [];
      for (let i = 1; i < BAYS; i += 2) {
        const x = -ROWLEN / 2 + BAY * i;
        const dead = a.lamps === 'failing' && random() < 0.35 + mood.wear * 0.25;
        const flick = a.lamps === 'failing' && side === -1 && i === 5;
        fixtures.push({ at: [x, RH - 0.2, 0.1] });
        if (flick) {
          const lens = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.16), flickerMat), row); lens.position.set(x, RH - 0.3, 0.1);
          const pool = add(new THREE.Mesh(poolGeo, flickerPool), row); pool.rotation.x = -Math.PI / 2; pool.scale.set(4.6, 4.2, 1); pool.position.set(x, 0.022, 1.3);
        } else if (!dead) { lenses.push({ at: [x, RH - 0.3, 0.1] }); pools.push({ at: [x, 0.02, 1.3], scale: [4.6, 1, 4.2] }); }
      }
      instances(new THREE.BoxGeometry(0.32, 0.16, 0.2), trimMat, fixtures, row);
      instances(new THREE.BoxGeometry(0.26, 0.05, 0.16), lampMat, lenses, row).castShadow = false;
      const poolMesh = instances(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, pools, row);
      poolMesh.castShadow = poolMesh.receiveShadow = false;
      // Weeds at the foot of the wall.
      if (mood.wear > 0.3) {
        const blades: { at: [number, number, number]; scale: [number, number, number]; turn: number }[] = [];
        for (let i = 0; i < mood.wear * 130; i++) { const hgt = 0.08 + random() * 0.3; blades.push({ at: [(random() - 0.5) * ROWLEN, hgt / 2, 0.02 + random() * 0.12], scale: [1, hgt, 1], turn: random() * 3 }); }
        instances(new THREE.ConeGeometry(0.025, 1, 4), std('#74824a'), blades, row);
      }
    }
    // Real light from the lamps: a few points down the aisle.
    if (lampsOn > 0.3) for (const [x, z] of [[-HALF + 0.6, 0], [HALF - 0.6, -9]] as const) {
      const lamp = add(new THREE.PointLight(lampTint, 40 * lampsOn, 15, 1.6));
      lamp.position.set(x, 2.7, z);
    }

    // ---- The far end.
    const EZ = Z1 - 0.6;
    const galv = std('#a9b0ae', { metalness: 0.65, roughness: 0.45 });
    if (a.end === 'razor' || a.end === 'gate') {
      const link = paint(128, 128, (ctx) => {
        ctx.clearRect(0, 0, 128, 128); ctx.strokeStyle = '#b6bcba'; ctx.lineWidth = 5;
        for (let i = -4; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 32 + 128, 0); ctx.lineTo(i * 32, 128); ctx.stroke(); }
      });
      link.wrapS = link.wrapT = THREE.RepeatWrapping; link.repeat.set(40, 6);
      const fence = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 2.6), new THREE.MeshStandardMaterial({ map: link, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 })));
      fence.position.set(0, 1.3, EZ);
      const posts: { at: [number, number, number] }[] = [];
      for (let x = -9; x <= 9; x += 3) posts.push({ at: [x + 0.01, 1.4, EZ] });
      instances(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), galv, posts);
      box([20, 0.07, 0.07], [0, 2.6, EZ], galv);
      if (a.end === 'gate') {
        box([HALF * 2 - 0.4, 0.09, 0.09], [0, 0.2, EZ + 0.12], galv); box([HALF * 2 - 0.4, 0.09, 0.09], [0, 2.5, EZ + 0.12], galv);
        for (const x of [-HALF + 0.2, 0, HALF - 0.2]) box([0.09, 2.3, 0.09], [x, 1.35, EZ + 0.12], galv);
        const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), std('#ffffff', { map: paint(256, 102, (ctx) => { ctx.fillStyle = '#f2f0e6'; ctx.fillRect(0, 0, 256, 102); ctx.fillStyle = '#c22a22'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', 128, 54); }) })));
        sign.position.set(0, 1.5, EZ + 0.2);
        // Keypad post.
        box([0.08, 1.2, 0.08], [HALF - 0.9, 0.6, EZ + 2.2], std('#30363a'));
        box([0.22, 0.32, 0.12], [HALF - 0.9, 1.25, EZ + 2.25], std('#c5cacb', { metalness: 0.7 }));
        const pad = box([0.16, 0.2, 0.02], [HALF - 0.9, 1.25, EZ + 2.32], new THREE.MeshStandardMaterial({ color: '#58e08a', emissive: '#58e08a', emissiveIntensity: 1.6 })); pad.castShadow = false;
        const post = box([0.14, 1.0, 0.14], [HALF - 0.3, 0.5, EZ + 2.5], std('#e8b820')); post.rotation.z = -0.25;
      }
      // Razor coil.
      const points: THREE.Vector3[] = [];
      const loops = 44;
      for (let i = 0; i <= loops * 8; i++) { const t = i / 8; points.push(new THREE.Vector3(-10 + (t / loops) * 20, 2.86 + Math.cos(t * Math.PI * 2) * 0.24, EZ + Math.sin(t * Math.PI * 2) * 0.24)); }
      const coil = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), loops * 16, 0.012, 4), galv));
      coil.castShadow = true;
    } else if (a.end === 'wall') {
      box([20, 3.4, 0.3], [0, 1.7, EZ], std('#c2bba8'));
      const courses: { at: [number, number, number] }[] = [];
      for (let y = 0.2; y < 3.4; y += 0.2) courses.push({ at: [0, y, EZ + 0.155] });
      instances(new THREE.BoxGeometry(20, 0.014, 0.01), std('#9a9484'), courses);
      for (let x = -9; x <= 9; x += 2.25) { const arm = box([0.05, 0.5, 0.05], [x, 3.6, EZ + 0.1], galv); arm.rotation.x = 0.5; }
      for (let k = 0; k < 3; k++) box([20, 0.014, 0.014], [0, 3.5 + k * 0.14, EZ + 0.14 + k * 0.075], galv);
      const stain = add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: '#5a5448', transparent: true, opacity: 0.18 + mood.wear * 0.2, depthWrite: false })));
      stain.position.set(0.4, 1.3, EZ + 0.16);
    } else {
      // A cross row of more doors.
      box([20, RH, 0.2], [0, RH / 2, EZ - 0.1], wallMat);
      box([20.3, 0.12, 1], [0, RH + 0.06, EZ - 0.2], trimMat);
      const list: { at: [number, number, number]; color: THREE.ColorRepresentation }[] = [];
      for (let i = -3; i <= 3; i++) list.push({ at: [i * BAY, DH / 2, EZ + 0.02], color: new THREE.Color(a.doors === 'mixed' ? mixedTints[Math.floor(random() * mixedTints.length)] : DOOR_TINT[a.doors]).lerp(new THREE.Color('#c9bfb2'), mood.wear * 0.4) });
      instances(doorGeo, doorMat, list);
      const lens = box([0.26, 0.05, 0.16], [0, RH - 0.3, EZ + 0.1], lampMat); lens.castShadow = false;
    }

    // ---- What was left in the aisle. Everything keeps clear of the standing slots.
    const dark = std('#26282b', { roughness: 0.55 });
    if (a.dressing === 'pile') {
      const px = -HALF + 1.2, pz = Z1 + 2.2;
      const mattress = box([1.4, 1.9, 0.22], [px, 0.93, pz - 0.9], std('#d9d4c4')); mattress.rotation.x = -0.25; mattress.rotation.y = 0.3;
      for (let i = 0; i < 4 + mood.density * 5; i++) { const r = 0.22 + random() * 0.12; const bag = add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), dark)); bag.scale.y = 0.8; bag.position.set(px + (random() - 0.3) * 2.2, r * 0.75, pz + (random() - 0.5) * 1.4); bag.castShadow = true; }
      const seat = box([0.44, 0.05, 0.44], [px + 1.5, 0.25, pz + 0.6], std('#6d4a2c')); seat.rotation.z = 1.3;
      box([0.05, 0.9, 0.05], [px + 1.75, 0.2, pz + 0.45], std('#6d4a2c')).rotation.z = 1.25;
      for (let i = 0; i < 3; i++) box([0.5, 0.36, 0.42], [px + 0.4 + i * 0.3, 0.18 + (i % 2) * 0.36, pz + 0.9], cardboard).rotation.y = random();
    } else if (a.dressing === 'cart') {
      const cart = new THREE.Group();
      const body = std(mood.cheer > 0.5 ? '#f2f0e8' : '#5d7f6a', { roughness: 0.5 });
      box([1.15, 0.35, 2.2], [0, 0.5, 0], body, cart); box([1.15, 0.4, 0.5], [0, 0.85, -0.6], body, cart);
      box([1.05, 0.12, 0.5], [0, 0.72, 0.05], dark, cart); box([1.05, 0.5, 0.1], [0, 1.0, -0.2], dark, cart);
      for (const x of [-0.5, 0.5]) for (const z of [-0.95, 0.9]) box([0.04, 1.3, 0.04], [x, 1.3, z], dark, cart);
      box([1.25, 0.06, 2.2], [0, 1.95, 0], body, cart);
      for (const x of [-0.55, 0.55]) for (const z of [-0.75, 0.75]) { const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14), dark), cart); w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, z); w.castShadow = true; }
      cart.position.set(HALF - 1.0, 0, -9.5); cart.rotation.y = 0.06;
      root.add(cart);
    } else if (a.dressing === 'pallets') {
      const wood = std('#b59a6a', { roughness: 0.95 });
      const px = -HALF + 0.95, pz = -3.5;
      const n = 2 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) { const tw = (random() - 0.5) * 0.12; for (const y of [0, 0.11]) box([1.2, 0.025, 1.0], [px, i * 0.14 + y + 0.02, pz], wood).rotation.y = tw; for (const x of [-0.5, 0, 0.5]) box([0.1, 0.09, 1.0], [px + x, i * 0.14 + 0.065, pz], wood).rotation.y = tw; }
      const cone = std('#f0742a', { emissive: '#f0742a', emissiveIntensity: 0.15 });
      for (const [x, z, tip] of [[px + 1.0, pz + 1.3, 0], [px + 0.4, pz + 2.4, 1]] as const) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 12), cone)); c.position.set(x, tip ? 0.15 : 0.3, z); if (tip) c.rotation.z = 1.45; c.castShadow = true; }
    } else if (a.dressing === 'car') {
      const car = new THREE.Group();
      const paintCol = std(mood.cheer > 0.5 ? '#b7412c' : '#5d6a78', { roughness: 0.35, metalness: 0.3 });
      box([1.7, 0.6, 3.9], [0, 0.6, 0], paintCol, car); box([1.55, 0.55, 2.1], [0, 1.15, -0.3], paintCol, car);
      box([1.45, 0.4, 0.04], [0, 1.15, 0.77], std('#27333a', { roughness: 0.15 }), car);
      const hatch = box([1.5, 0.06, 1.0], [0, 1.7, -1.75], paintCol, car); hatch.rotation.x = -0.5;
      box([1.4, 0.45, 0.6], [0, 1.0, -1.5], innerDark, car);
      for (let i = 0; i < 3; i++) box([0.45, 0.32, 0.4], [-0.45 + i * 0.45, 1.05 + (i % 2) * 0.05, -1.6], cardboard, car);
      for (const x of [-0.82, 0.82]) for (const z of [-1.25, 1.25]) { const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16), dark), car); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); w.castShadow = true; }
      const tail = new THREE.MeshStandardMaterial({ color: '#b3261e', emissive: '#ff3a20', emissiveIntensity: 0.3 + lampsOn });
      for (const x of [-0.7, 0.7]) box([0.2, 0.12, 0.04], [x, 0.78, -1.96], tail, car);
      car.position.set(-HALF + 2.2, 0, -12.5); car.rotation.y = Math.PI / 2 + 0.12;
      root.add(car);
    }
    // Loose boxes outside the open unit, more of them on a crowded day.
    if (a.open === 'one' || a.open === 'auction') for (let i = 0; i < 1 + mood.density * 5; i++) {
      const b = box([0.5, 0.36, 0.42], [HALF - 0.7 - random() * 0.5, 0.18 + (i % 3 === 2 ? 0.36 : 0), ZC + (-ROWLEN / 2 + BAY * 7.5) + 1.2 + (random() - 0.5) * 0.9 + (i > 2 ? -3 : 0)], cardboard);
      b.rotation.y = (random() - 0.5) * 0.8;
    }
    // Yellow corner bollards where trucks swing in.
    for (const side of [-1, 1]) { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12), std('#e8b820'))); b.position.set(side * (HALF - 0.25), 0.5, Z1 + 0.5); b.castShadow = true; }

    // ---- Camera: standing in the aisle, looking down the row.
    const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 400);
    const slots: [number, number, number][] = [[-0.75, 4.2, 0.35], [1.75, -1.3, -0.5], [-1.9, -6.5, 0.6], [1.5, -13, -0.3]];

    const place = (items: readonly Placeable[]) => {
      let heroTop = 2;
      items.forEach((item, index) => {
        const [x, z, turn] = slots[index % slots.length];
        // True sizes, gently pulled toward what the aisle can hold.
        const natural = Math.max(item.height, item.radius * 1.6, 0.05);
        const shown = natural < 1.1 ? 1.1 * (natural / 1.1) ** 0.45 : natural > 3.2 ? 3.2 * (natural / 3.2) ** 0.25 : natural;
        const scale = Math.min(shown / natural, (index === 0 ? 2.3 : 1.5) / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = turn + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = Math.max(1.4, visibleBounds(item.holder).max.y);
      });
      camera.position.set(0.55, mix(1.55, 2.1, Math.min(1, heroTop / 3.2)), 14.2);
      camera.lookAt(-0.05, Math.min(1.9, 0.75 + heroTop * 0.3), -6);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      // Sun low along the aisle, from one side or the other as the day goes.
      const swing = mix(-1, 1, mood.daylight);
      const height = a.time === 'overcast' ? 30 : a.time === 'afternoon' ? 11 : a.time === 'dusk' ? 7 : 12;
      key.target.position.set(0, 0, -5);
      key.position.set(swing * 16 + (Math.abs(swing) < 0.15 ? 5 : 0), height, a.time === 'overcast' ? 4 : -5 - 22 * (a.time === 'dusk' ? 1 : 0.3));
      const shadow = key.shadow.camera;
      shadow.left = -24; shadow.right = 24; shadow.top = 24; shadow.bottom = -24;
      shadow.near = 0.5; shadow.far = 90;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const flickers = a.lamps === 'failing' && lampsOn > 0.3;
    const baseGlow = lampMat.emissiveIntensity, basePool = poolMat.opacity;
    return {
      object: root, camera, background, capacity: slots.length, ground: plain, keyLight: key, place,
      update: flickers ? (_dt, time) => {
        const speed = mix(6, 30, mood.energy);
        const on = Math.sin(time * speed) * Math.sin(time * speed * 0.37 + 1) > 0.25 ? 1 : 0.12;
        flickerMat.emissiveIntensity = baseGlow * on; flickerPool.opacity = basePool * on;
      } : undefined,
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});

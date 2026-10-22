import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(width: number, height: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const BARS = {
  pub: 'An old pub: dark oak, a brass rail, bottle-green walls and leather-topped stools.',
  dive: 'A dive: scuffed walnut with a red vinyl armrest, chrome stools, a checkerboard floor.',
  lounge: 'A hotel lounge: glossy mahogany with gilt trim, aubergine walls, velvet stools.',
  tiki: 'A tiki bar: honey-coloured wood edged in bamboo, teal walls, rattan stools.',
} as const;
const KIT: Record<keyof typeof BARS, { wood: string; trim: string; trimMetal: number; wall: string; dado: string; seat: string; leg: string; floor: string; shade: string }> = {
  pub: { wood: '#4c2d1b', trim: '#c9a03a', trimMetal: 0.9, wall: '#586b5c', dado: '#4a3324', seat: '#2f5a42', leg: '#3a2416', floor: '#5a4636', shade: '#2f6a4c' },
  dive: { wood: '#5c3b27', trim: '#c9ced1', trimMetal: 0.9, wall: '#6f5c62', dado: '#4c4046', seat: '#b3302c', leg: '#c9ced1', floor: '#6a6460', shade: '#b3302c' },
  lounge: { wood: '#3d1f1c', trim: '#d9b24a', trimMetal: 0.9, wall: '#5d4c6b', dado: '#3a2c3f', seat: '#2f7a7a', leg: '#d9b24a', floor: '#4f4250', shade: '#d9b24a' },
  tiki: { wood: '#6e4a2a', trim: '#cfa85e', trimMetal: 0.05, wall: '#4f6f68', dado: '#7a5a34', seat: '#d9a84e', leg: '#b98a48', floor: '#5d5240', shade: '#d98a3a' },
};
const NEON = { none: null, lastcall: ['LAST CALL', '#ff4a3a'], cocktails: ['COCKTAILS', '#ff5fb4'], closed: ['CLOSED', '#5fa8ff'], beer: ['COLD BEER', '#ffb23a'], bar: ['BAR', '#6dff9a'] } as const;

export default defineWorld({
  questions: {
    bar: choice('What kind of bar is it?', BARS),
    lamp: choice('What is the one lamp still lit over the bar?', {
      cone: 'An enamel cone pendant throwing a hard pool of light.',
      bulb: 'A bare bulb on a cord.',
      tiffany: 'A stained-glass dome in jewel colours.',
      globe: 'A milky opal glass globe.',
    }),
    backbar: choice('How is the back-bar lit?', {
      amber: 'Warm amber light glowing up through tiers of bottles.',
      cold: 'Cold blue-white strips under glass shelves.',
      dark: 'Switched off: bottles in silhouette against a dim mirror.',
      tv: 'Dark except for a television left on in the corner above it.',
    }),
    far: choice('What is at the far end of the room?', {
      exit: 'A door under a glowing red EXIT sign.',
      window: 'A window on to the street, blinds half down, a streetlamp outside.',
      jukebox: 'A jukebox still lit up, playing to nobody.',
      phone: 'A wall payphone under a little lamp, its handset left dangling.',
    }),
    neon: choice('Is there a neon sign on the far wall, and what does it say?', {
      none: 'No neon.',
      lastcall: 'LAST CALL in red.',
      cocktails: 'COCKTAILS in pink script.',
      closed: 'CLOSED in cold blue.',
      beer: 'COLD BEER in amber.',
      bar: 'Just BAR, in green.',
    }),
    left: choice('What has the night left on the bar?', {
      wiped: 'Nothing: wiped down clean, a folded towel and a spray bottle.',
      glasses: 'Uncollected glasses, empty bottles, crumpled napkins and an ashtray.',
      onedrink: "One unfinished drink on a coaster further down, and a coat left on the stool in front of it.",
      cashout: 'The till drawer out on the bar with stacked coins, banded notes and a spike of receipts.',
    }),
    stools: choice('How have the stools been left?', {
      far: 'Tidy: two upturned on the far end of the bar, the rest tucked in.',
      stacked: 'Nearly all of them upturned and crowded on the far end; one left standing at the near end.',
      askew: 'Shoved back at angles, one lying on its side on the floor.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const kit = KIT[a.bar];
    const TOP = 1.08, NEAR = 3.9, FAR = -3.6, WALL = -4.7, BACK = -1.62;
    const length = NEAR - FAR, midZ = (NEAR + FAR) / 2;

    const background = new THREE.Color('#5a6272').lerp(new THREE.Color('#7b6256'), mood.warmth).multiplyScalar(mix(0.92, 1.12, mood.cheer));
    const wallTint = new THREE.Color(kit.wall).lerp(background, 0.25);
    const wall = s.material(wallTint, { roughness: 0.95 });
    const dado = s.material(kit.dado, { roughness: 0.8 });
    const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.trim).lerp(new THREE.Color('#6d6250'), mood.wear * 0.35), metalness: kit.trimMetal, roughness: 0.28 + mood.wear * 0.3 });
    const dark = s.material('#1f1c1c', { roughness: 0.6 });

    // Light: a dim room, one warm pool.
    root.add(new THREE.HemisphereLight(new THREE.Color('#cfd3e6').lerp(new THREE.Color('#ecd6c0'), mood.warmth), '#5d4d44', mix(0.72, 1.02, mood.cheer)));
    const lampTint = new THREE.Color().setHSL(mix(0.13, 0.075, mood.warmth), 0.85, 0.72);
    const key = new THREE.DirectionalLight(lampTint, 1.25);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.02; key.shadow.bias = -0.0003; key.shadow.radius = 4;
    root.add(key, key.target);
    const LAMP_Z = 1.2, LAMP_Y = TOP + 0.8;
    const spot = new THREE.SpotLight(lampTint, 9, 4, 0.75, 0.8, 1.6);
    spot.position.set(0, LAMP_Y, LAMP_Z);
    spot.target.position.set(0, TOP, LAMP_Z);
    root.add(spot, spot.target);

    // Room shell.
    const floorMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = kit.floor; c.fillRect(0, 0, w, h);
      if (a.bar === 'dive') { c.fillStyle = 'rgba(20,18,20,0.5)'; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) if ((x + y) % 2) c.fillRect(x * 64, y * 64, 64, 64); }
      else { c.strokeStyle = 'rgba(20,14,10,0.45)'; c.lineWidth = 3; for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }
    });
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(5, 7);
    const floor = s.mesh(new THREE.PlaneGeometry(9, 12), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.8 }), [0.8, 0, -0.6]);
    floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    s.box([9, 4.6, 0.2], [0.8, 2.3, WALL - 0.1], wall);
    s.box([9, 1.0, 0.06], [0.8, 0.5, WALL + 0.03], dado);
    s.box([9, 0.06, 0.09], [0.8, 1.03, WALL + 0.04], dado);
    s.box([0.2, 4.6, 12], [3.6, 2.3, -0.6], wall);
    s.box([0.06, 1.0, 12], [3.47, 0.5, -0.6], dado);
    s.box([0.2, 4.6, 12], [BACK - 0.5, 2.3, -0.6], wall);
    for (const z of [2.2, 0, -2.2, -4.2]) s.box([6, 0.2, 0.16], [0.8, 3.75, z], dado);

    // The bar itself.
    const woodMap = paint(256, 1024, (c, w, h) => {
      c.fillStyle = kit.wood; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = random() * w, light = random() < 0.5;
        c.strokeStyle = light ? `rgba(255,190,130,${0.04 + random() * 0.08})` : `rgba(10,5,2,${0.08 + random() * 0.16})`;
        c.lineWidth = 1 + random() * 5;
        c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (random() - 0.5) * 30, h * 0.3, x + (random() - 0.5) * 30, h * 0.7, x + (random() - 0.5) * 20, h); c.stroke();
      }
      // Rings and scuffs worn in over the years.
      for (let i = 0; i < Math.round(mood.wear * 26); i++) { c.strokeStyle = `rgba(230,200,160,${0.1 + random() * 0.14})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(random() * w, random() * h, 20, 7, 0, 0, 7); c.stroke(); }
    });
    woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping; woodMap.repeat.set(1, 2);
    const topMat = new THREE.MeshStandardMaterial({ map: woodMap, roughness: mix(0.22, 0.6, mood.wear), metalness: 0.05 });
    const wood = s.material(kit.wood, { roughness: 0.5 });
    const barTop = s.box([0.88, 0.07, length], [0, TOP - 0.035, midZ], [wood, wood, topMat, wood, wood, wood] as unknown as THREE.Material);
    const railMat = a.bar === 'dive' ? s.material('#a82c2a', { roughness: 0.5 }) : a.bar === 'tiki' ? trim : wood;
    s.rod([0.45, TOP - 0.02, NEAR], [0.45, TOP - 0.02, FAR], 0.045, railMat);
    s.rod([-0.44, TOP - 0.03, NEAR], [-0.44, TOP - 0.03, FAR], 0.03, wood);
    s.box([0.07, TOP - 0.07, length], [0.36, (TOP - 0.07) / 2, midZ], wood);
    s.box([0.8, TOP - 0.07, 0.07], [0, (TOP - 0.07) / 2, FAR + 0.04], wood);
    for (let z = NEAR - 0.6; z > FAR; z -= 1.05) s.box([0.02, 0.62, 0.8], [0.4, 0.58, z], s.material(new THREE.Color(kit.wood).multiplyScalar(1.25), { roughness: 0.5 }));
    s.rod([0.62, 0.2, NEAR], [0.62, 0.2, FAR + 0.1], 0.024, trim);
    for (let z = NEAR - 0.3; z > FAR; z -= 1.3) s.rod([0.62, 0.2, z], [0.4, 0.26, z], 0.012, trim);
    if (a.bar === 'tiki') for (let z = NEAR - 0.2; z > FAR; z -= 0.42) s.rod([0.4, 0.05, z], [0.4, TOP - 0.1, z], 0.022, trim);

    // Back-bar: cabinet, mirror, shelves, bottles.
    const lit = a.backbar === 'amber' || a.backbar === 'cold';
    const glowTint = a.backbar === 'amber' ? new THREE.Color('#ffae45') : a.backbar === 'cold' ? new THREE.Color('#bfe2ff') : new THREE.Color('#40404a');
    const bbLen = NEAR - WALL - 0.5, bbMid = (NEAR + WALL + 0.5) / 2;
    s.box([0.5, 0.95, bbLen], [BACK + 0.05, 0.475, bbMid], wood);
    s.box([0.56, 0.05, bbLen], [BACK + 0.06, 0.975, bbMid], s.material(new THREE.Color(kit.wood).multiplyScalar(0.8), { roughness: 0.35 }));
    for (let z = NEAR - 0.5; z > WALL + 0.5; z -= 0.9) s.box([0.02, 0.6, 0.72], [BACK + 0.305, 0.5, z], s.material(new THREE.Color(kit.wood).multiplyScalar(1.25), { roughness: 0.5 }));
    const mirrorMap = paint(1024, 256, (c, w, h) => {
      const base = c.createLinearGradient(0, 0, 0, h);
      const hi = new THREE.Color('#aab6c2').lerp(new THREE.Color('#c9b9a4'), mood.warmth * 0.6), lo = new THREE.Color('#77828f').lerp(new THREE.Color('#8f7d6c'), mood.warmth * 0.6);
      base.addColorStop(0, `#${hi.getHexString()}`); base.addColorStop(1, `#${lo.getHexString()}`);
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      // The lit lamp and the room, smeared in the glass.
      const u = (NEAR - 0.25 - LAMP_Z) / bbLen * w;
      const glow = c.createRadialGradient(u, 70, 4, u, 70, 150);
      glow.addColorStop(0, 'rgba(255,225,160,0.95)'); glow.addColorStop(0.25, 'rgba(255,200,120,0.45)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = glow; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(40,36,40,0.22)';
      for (let i = 0; i < 46; i++) { const x = random() * w, bw = 8 + random() * 10, bh = 40 + random() * 60; c.fillRect(x, h - bh - 10 - (i % 3) * 60, bw, bh); }
      c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 26;
      for (let x = -200; x < w; x += 230) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 180, 0); c.stroke(); }
      c.fillStyle = 'rgba(60,50,40,0.3)';
      for (let i = 0; i < mood.wear * 160; i++) c.fillRect(random() * w, random() < 0.5 ? random() * 26 : h - random() * 26, 2 + random() * 5, 2 + random() * 5);
    });
    const mirror = s.mesh(new THREE.PlaneGeometry(bbLen - 0.3, 1.62), new THREE.MeshStandardMaterial({ map: mirrorMap, roughness: 0.18, metalness: 0.25, emissive: '#ffffff', emissiveMap: mirrorMap, emissiveIntensity: 0.22 }), [BACK - 0.17, 1.86, bbMid]);
    mirror.rotation.y = Math.PI / 2; mirror.castShadow = false;
    const frame = s.material(new THREE.Color(kit.wood).multiplyScalar(0.85), { roughness: 0.45 });
    s.box([0.3, 0.2, bbLen], [BACK - 0.06, 2.78, bbMid], frame);
    s.box([0.36, 0.06, bbLen + 0.06], [BACK - 0.03, 2.9, bbMid], frame);
    for (let z = NEAR - 0.3; z > WALL + 0.4; z -= 1.75) {
      s.box([0.14, 1.75, 0.14], [BACK - 0.1, 1.86, z], frame);
      s.box([0.18, 0.08, 0.18], [BACK - 0.1, 2.66, z], trim);
    }
    const shelfY = [1.38, 1.8, 2.2];
    const shelfMat = a.backbar === 'cold' ? new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.55, roughness: 0.1 }) : frame;
    const strip = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: lit ? 1.5 : 0.05 });
    for (const y of shelfY) {
      s.box([0.2, 0.025, bbLen - 0.4], [BACK - 0.05, y, bbMid], shelfMat);
      const light = s.box([0.025, lit ? 0.07 : 0.02, bbLen - 0.5], [BACK - 0.145, y + 0.05, bbMid], strip);
      light.castShadow = false;
    }
    if (lit) {
      const wash = s.mesh(new THREE.PlaneGeometry(bbLen - 0.4, 1.5), new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.2, depthWrite: false }), [BACK - 0.16, 1.85, bbMid]);
      wash.rotation.y = Math.PI / 2;
    }
    const bottleShape = new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.038, 0.01], [0.038, 0.17], [0.03, 0.2], [0.013, 0.235], [0.012, 0.29], [0.015, 0.292], [0.015, 0.305], [0, 0.305]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const bottleTints = ['#b5651d', '#2f6b3a', '#dfe9e4', '#8a2222', '#2a4f9a', '#e3bb55', '#1f1f26', '#c97a2a', '#5a8a5a'];
    const rows: { y: number; x: number }[] = [{ y: 1.0, x: BACK + 0.02 }, ...shelfY.map((y) => ({ y: y + 0.013, x: BACK - 0.05 }))];
    const stock: { at: THREE.Vector3; h: number; w: number; tint: string; lean: number }[] = [];
    for (const [r, row] of rows.entries()) for (let z = NEAR - 0.45; z > WALL + 0.55; z -= 0.105) {
      const gap = mix(0.5, 0.04, mood.density) + (r === 3 ? 0.1 : 0);
      if (random() < gap) continue;
      stock.push({ at: new THREE.Vector3(row.x + (random() - 0.5) * 0.05, row.y, z + (random() - 0.5) * 0.03), h: mix(0.78, 1.18, random()), w: mix(0.85, 1.25, random()), tint: bottleTints[Math.floor(random() * bottleTints.length)], lean: 0 });
    }
    const bottles = new THREE.InstancedMesh(bottleShape, new THREE.MeshStandardMaterial({ roughness: 0.22, emissive: glowTint, emissiveIntensity: a.backbar === 'amber' ? 0.38 : a.backbar === 'cold' ? 0.2 : 0.0 }), stock.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), tint = new THREE.Color();
    stock.forEach((b, i) => {
      m.compose(b.at, q.identity(), sc.set(b.w, b.h, b.w)); bottles.setMatrixAt(i, m);
      bottles.setColorAt(i, tint.set(b.tint).lerp(new THREE.Color('#2e2a30'), lit ? 0 : 0.72));
    });
    bottles.castShadow = true;
    root.add(bottles);
    if (mood.cheer > 0.62) {
      // Somebody strung fairy lights along the cornice and never took them down.
      const bulbs = Array.from({ length: 44 }, (_u, i) => ({ at: [BACK + 0.1, 2.72 - Math.abs(Math.sin(i * 0.9)) * 0.1, NEAR - 0.4 - i * (bbLen - 0.6) / 43] as const, size: 0.022, color: ['#ff5a4a', '#ffd24a', '#5ad8ff', '#7dff8a', '#ff8adf'][i % 5] }));
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial(), bulbs).castShadow = false;
    }
    let screen: THREE.MeshBasicMaterial | null = null;
    if (a.backbar === 'tv') {
      const tvMap = paint(128, 96, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe0ff'); g.addColorStop(1, '#6f9ae0');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '20,30,60'},${random() * 0.5})`; c.fillRect(random() * w, random() * h, 3, 1.5); }
        c.fillStyle = 'rgba(20,30,60,0.55)'; c.fillRect(0, h * 0.72, w, 9);
      });
      screen = new THREE.MeshBasicMaterial({ map: tvMap });
      const tv = new THREE.Group();
      tv.position.set(BACK + 0.45, 3.1, -4.1); tv.rotation.set(0.2, 0.55, 0, 'YXZ');
      root.add(tv);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.5), dark); shell.castShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.58), screen); face.position.z = 0.252;
      tv.add(shell, face);
      s.rod([BACK - 0.3, 3.5, -4.5], [BACK + 0.4, 3.2, -4.2], 0.03, dark);
    }

    // Pendant lamps over the bar: only the near one is on.
    const cones: THREE.Object3D[] = [];
    const glassMap = a.lamp === 'tiffany' ? paint(256, 128, (c, w, h) => {
      const jewels = ['#d9442e', '#e8a02e', '#3f9a5a', '#2f6fb8', '#b03a8a', '#e8d24a'];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { c.fillStyle = jewels[Math.floor(random() * jewels.length)]; c.fillRect(x * 16 + (y % 2) * 8 - 8, y * 32, 16, 32); }
      c.strokeStyle = '#1c1a18'; c.lineWidth = 3;
      for (let y = 0; y <= 4; y++) { c.beginPath(); c.moveTo(0, y * 32); c.lineTo(w, y * 32); c.stroke(); }
      for (let y = 0; y < 4; y++) for (let x = 0; x <= 16; x++) { c.beginPath(); c.moveTo(x * 16 + (y % 2) * 8 - 8, y * 32); c.lineTo(x * 16 + (y % 2) * 8 - 8, y * 32 + 32); c.stroke(); }
    }) : null;
    const lampAt = (z: number, on: boolean) => {
      const g = new THREE.Group();
      g.position.set(0, 4.0, z);
      root.add(g);
      const drop = 4.0 - LAMP_Y;
      const put = (mesh: THREE.Mesh, y: number) => { mesh.position.y = y; mesh.castShadow = false; g.add(mesh); return mesh; };
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, drop, 5), dark), -drop / 2);
      const glow = new THREE.MeshStandardMaterial({ color: on ? '#fff3d0' : '#8f8a80', emissive: lampTint, emissiveIntensity: on ? 2.2 : 0, roughness: 0.4 });
      if (a.lamp === 'cone') {
        const shade = new THREE.MeshStandardMaterial({ color: kit.shade, roughness: 0.35, metalness: kit.shade === '#d9b24a' ? 0.8 : 0.1, side: THREE.FrontSide });
        put(new THREE.Mesh(new THREE.LatheGeometry([[0.03, 0.2], [0.05, 0.17], [0.24, 0.02], [0.25, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28), shade), -drop);
        const inner = new THREE.MeshStandardMaterial({ color: '#f4efe0', emissive: lampTint, emissiveIntensity: on ? 1.1 : 0, side: THREE.BackSide });
        put(new THREE.Mesh(new THREE.LatheGeometry([[0.03, 0.195], [0.05, 0.165], [0.238, 0.018]].map(([x, y]) => new THREE.Vector2(x, y)), 28), inner), -drop);
        put(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), glow), -drop + 0.06);
      } else if (a.lamp === 'bulb') {
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.06, 10), dark), -drop + 0.16);
        put(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), glow), -drop + 0.07).scale.y = 1.25;
      } else if (a.lamp === 'tiffany') {
        const dome = new THREE.MeshStandardMaterial({ map: glassMap, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: on ? 0.9 : 0.05, roughness: 0.4, side: THREE.DoubleSide });
        put(new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), dome), -drop - 0.07).scale.y = 0.85;
        put(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), glow), -drop + 0.06);
      } else {
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.05, 12), trim), -drop + 0.21);
        put(new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 14), glow), -drop + 0.1);
      }
      if (on) {
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.5, LAMP_Y - TOP, 28, 1, true), new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        put(beam, -drop - (LAMP_Y - TOP) / 2 + 0.04);
      }
      cones.push(g);
      return g;
    };
    lampAt(LAMP_Z, true); lampAt(-0.9, false); lampAt(-3.0, false);
    const poolMap = paint(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,225,170,0.9)'); g.addColorStop(0.5, 'rgba(255,200,130,0.35)'); g.addColorStop(1, 'rgba(255,200,130,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    const pool = s.mesh(new THREE.PlaneGeometry(0.86, 1.5), new THREE.MeshBasicMaterial({ map: poolMap, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), [0, TOP + 0.002, LAMP_Z]);
    pool.rotation.x = -Math.PI / 2; pool.castShadow = false;

    // The far wall.
    const glowMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map });
    const fx = 0.15;
    if (a.far === 'exit') {
      s.box([1.1, 2.25, 0.08], [fx, 1.125, WALL + 0.05], dado);
      s.box([0.94, 2.1, 0.05], [fx, 1.08, WALL + 0.09], s.material(new THREE.Color(kit.wall).multiplyScalar(0.7), { roughness: 0.6 }));
      const pane = paint(64, 64, (c) => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, mood.daylight < 0.35 ? '#8fb0d8' : '#5a6ea0'); g.addColorStop(1, '#f0b070'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.fillStyle = '#1c1a1c'; c.fillRect(30, 0, 4, 64); c.fillRect(0, 30, 64, 4); });
      s.mesh(new THREE.PlaneGeometry(0.5, 0.5), glowMat(pane), [fx, 1.75, WALL + 0.12]).castShadow = false;
      s.ball([0.04, 0.04, 0.04], [fx + 0.36, 1.05, WALL + 0.14], trim);
      const sign = paint(256, 96, (c, w, h) => { c.fillStyle = '#2a0808'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3b2a'; c.shadowColor = '#ff3b2a'; c.shadowBlur = 14; c.font = 'bold 74px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h / 2 + 4); });
      s.box([0.72, 0.3, 0.1], [fx, 2.5, WALL + 0.08], dark);
      s.mesh(new THREE.PlaneGeometry(0.66, 0.25), glowMat(sign), [fx, 2.5, WALL + 0.135]).castShadow = false;
    } else if (a.far === 'window') {
      const street = paint(256, 192, (c, w, h) => {
        const dusk = mood.daylight;
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, dusk < 0.35 ? '#7f9cc8' : dusk > 0.7 ? '#6a5a9a' : '#4a5a8a'); g.addColorStop(1, dusk < 0.35 ? '#e8c9b0' : '#d98a5a');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(30,30,50,0.75)';
        for (let x = 0; x < w; x += 44) c.fillRect(x, h - 60 - random() * 60, 40, 140);
        c.fillStyle = '#ffd98a'; for (let i = 0; i < 16; i++) c.fillRect(random() * w, h - 20 - random() * 90, 6, 8);
        c.fillStyle = '#26242a'; c.fillRect(176, 40, 5, h);
        const lampGlow = c.createRadialGradient(178, 40, 2, 178, 40, 60); lampGlow.addColorStop(0, 'rgba(255,235,180,1)'); lampGlow.addColorStop(1, 'rgba(255,220,150,0)');
        c.fillStyle = lampGlow; c.fillRect(100, 0, 156, 120);
        c.strokeStyle = 'rgba(220,235,255,0.35)'; c.lineWidth = 1.5;
        for (let i = 0; i < 60; i++) { const x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5, y + 16); c.stroke(); }
      });
      s.box([2.0, 1.5, 0.08], [fx, 1.9, WALL + 0.04], dado);
      s.mesh(new THREE.PlaneGeometry(1.84, 1.34), glowMat(street), [fx, 1.9, WALL + 0.085]).castShadow = false;
      s.box([0.05, 1.34, 0.04], [fx, 1.9, WALL + 0.1], dado);
      const down = mix(0.3, 0.6, random());
      for (let i = 0; i < Math.round(down * 1.34 / 0.07); i++) s.box([1.84, 0.045, 0.012], [fx, 2.54 - i * 0.07, WALL + 0.12], s.material('#d8d0bc', { roughness: 0.7 })).rotation.x = 0.5;
    } else if (a.far === 'jukebox') {
      const jx = fx + 0.2, jz = WALL + 0.4;
      const face = paint(128, 256, (c, w, h) => {
        c.fillStyle = '#3a2416'; c.fillRect(0, 0, w, h);
        for (const [i, colour] of ['#ff5a3a', '#ffb23a', '#ffe85a', '#7dff8a', '#5ac8ff'].entries()) { c.strokeStyle = colour; c.lineWidth = 9; c.beginPath(); c.arc(64, 92, 60 - i * 10, Math.PI, 0); c.lineTo(64 + 60 - i * 10, 250); c.moveTo(64 - 60 + i * 10, 92); c.lineTo(64 - 60 + i * 10, 250); c.stroke(); }
        c.fillStyle = '#fff3c8'; c.fillRect(28, 120, 72, 40);
        c.fillStyle = '#2a1c14'; for (let i = 0; i < 6; i++) c.fillRect(32, 124 + i * 6, 64, 2);
        c.fillStyle = '#c9a03a'; c.fillRect(34, 178, 60, 60);
      });
      s.box([0.85, 1.25, 0.6], [jx, 0.625, jz], s.material('#5a3520', { roughness: 0.4 }));
      const arch = s.cylinder(0.425, 0.425, 0.6, [jx, 1.25, jz], s.material('#5a3520', { roughness: 0.4 }), 24);
      arch.rotation.x = Math.PI / 2;
      s.mesh(new THREE.PlaneGeometry(0.82, 1.64), glowMat(face), [jx, 0.84, jz + 0.305]).castShadow = false;
    } else {
      const px = fx + 0.1;
      s.box([0.5, 0.75, 0.06], [px, 1.75, WALL + 0.04], s.material('#3a3d44', { roughness: 0.5 }));
      s.box([0.36, 0.5, 0.16], [px, 1.72, WALL + 0.12], s.material('#22242a', { roughness: 0.4, metalness: 0.4 }));
      const dial = paint(64, 64, (c) => { c.fillStyle = '#c9ced1'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#22242a'; for (let i = 0; i < 12; i++) c.fillRect(8 + (i % 3) * 18, 6 + Math.floor(i / 3) * 14, 12, 9); });
      s.mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }), [px + 0.03, 1.68, WALL + 0.205]);
      s.tube([[px - 0.14, 1.9, WALL + 0.2], [px - 0.22, 1.5, WALL + 0.24], [px - 0.16, 1.2, WALL + 0.28], [px - 0.2, 1.02 + random() * 0.1, WALL + 0.3]], 0.012, dark);
      s.box([0.07, 0.24, 0.06], [px - 0.2, 0.9, WALL + 0.3], dark).rotation.z = 0.3;
      const phoneSign = paint(128, 48, (c, w, h) => { c.fillStyle = '#12306a'; c.fillRect(0, 0, w, h); c.fillStyle = '#cfe6ff'; c.shadowColor = '#9fd0ff'; c.shadowBlur = 8; c.font = 'bold 32px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PHONE', w / 2, h / 2 + 2); });
      s.mesh(new THREE.PlaneGeometry(0.55, 0.2), glowMat(phoneSign), [px, 2.35, WALL + 0.08]).castShadow = false;
      s.mesh(new THREE.ConeGeometry(0.5, 1.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [px, 1.65, WALL + 0.2]).castShadow = false;
    }
    let neonMat: THREE.MeshBasicMaterial | null = null;
    const neon = NEON[a.neon];
    if (neon) {
      const [text, colour] = neon;
      const dead = mood.wear > 0.55 ? Math.floor(random() * text.length) : -1;
      const map = paint(512, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.font = `${a.neon === 'cocktails' ? 'italic ' : ''}bold ${text.length > 7 ? 70 : 92}px ${a.neon === 'cocktails' ? 'cursive' : 'sans-serif'}`;
        c.textBaseline = 'middle'; c.lineJoin = 'round';
        const widths = [...text].map((ch) => c.measureText(ch).width + 5);
        let x = (w - widths.reduce((sum, v) => sum + v, 0)) / 2;
        [...text].forEach((ch, i) => {
          const off = i === dead;
          c.shadowColor = colour; c.shadowBlur = off ? 0 : 22;
          c.lineWidth = 7; c.strokeStyle = off ? 'rgba(90,80,90,0.9)' : colour; c.strokeText(ch, x, h / 2);
          if (!off) { c.shadowBlur = 0; c.lineWidth = 2.5; c.strokeStyle = '#ffffff'; c.strokeText(ch, x, h / 2); }
          x += widths[i];
        });
      });
      neonMat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
      const nx = a.far === 'window' ? -0.05 : fx, ny = a.far === 'window' ? 3.1 : a.far === 'jukebox' ? 2.6 : 3.15;
      s.box([2.3, 0.62, 0.03], [nx, ny, WALL + 0.02], s.material(wallTint.clone().multiplyScalar(0.55), { roughness: 0.9 }));
      s.mesh(new THREE.PlaneGeometry(2.3, 0.575), neonMat, [nx, ny, WALL + 0.045]).castShadow = false;
    }

    // Stools.
    const seatMat = s.material(kit.seat, { roughness: 0.55 });
    const legMat = a.bar === 'pub' || a.bar === 'tiki' ? s.material(kit.leg, { roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: kit.leg, metalness: 0.9, roughness: 0.3 });
    const stool = () => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const cushion = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.165, 0.07, 20), seatMat)); cushion.position.y = 0.745;
      const pan = add(new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.15, 0.03, 20), legMat)); pan.position.y = 0.695;
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + Math.PI / 4;
        const from = new THREE.Vector3(Math.cos(t) * 0.11, 0.69, Math.sin(t) * 0.11), to = new THREE.Vector3(Math.cos(t) * 0.2, 0, Math.sin(t) * 0.2);
        const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, from.distanceTo(to), 8), legMat));
        leg.position.copy(from).add(to).multiplyScalar(0.5);
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize());
      }
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.009, 6, 24), a.bar === 'pub' ? trim : legMat)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25;
      if (a.bar === 'lounge') { const back = add(new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.2, 16, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: seatMat.color, roughness: 0.6, side: THREE.DoubleSide }))); back.position.y = 0.88; }
      root.add(g);
      return g;
    };
    const upturned = (x: number, z: number) => { const g = stool(); g.rotation.set(Math.PI, random() * 6, 0); g.position.set(x, TOP + 0.78, z); return g; };
    const standing = (x: number, z: number, turn = 0) => { const g = stool(); g.position.set(x, 0, z); g.rotation.y = turn; return g; };
    const SX = 0.84;
    if (a.stools === 'far') {
      upturned(0.1, -2.75); upturned(-0.08, -3.25);
      for (const z of [2.0, 0.95, -0.1, -1.15]) standing(SX - 0.12, z, random());
    } else if (a.stools === 'stacked') {
      upturned(0.16, -2.5); upturned(-0.16, -2.72); upturned(0.14, -3.0); upturned(-0.14, -3.28);
      standing(SX + 0.12, 1.55, 0.5);
    } else {
      upturned(0.06, -3.0);
      standing(SX + 0.2, 1.9, 0.7); standing(SX - 0.05, 0.8, 0.2); standing(SX + 0.4, -0.5, 1.1);
      const fallen = stool(); fallen.rotation.set(0, 0.6 + random(), Math.PI / 2 + 0.05, 'YXZ'); fallen.position.set(SX + 0.5, 0.17, -1.6);
    }

    // What the night left on the bar, kept clear of the standing slots.
    const clearGlass = new THREE.MeshPhysicalMaterial({ color: '#e2f0f3', transparent: true, opacity: 0.38, roughness: 0.05, side: THREE.DoubleSide });
    const tumbler = (x: number, z: number, fill: number, colour: string) => {
      s.lathe([[0, 0], [0.034, 0], [0.04, 0.095], [0.038, 0.095], [0.032, 0.008], [0, 0.008]], clearGlass, [x, TOP, z]);
      if (fill > 0) s.cylinder(0.032 + fill * 0.004, 0.032, fill * 0.07, [x, TOP + 0.01 + fill * 0.035, z], new THREE.MeshStandardMaterial({ color: colour, roughness: 0.1, emissive: colour, emissiveIntensity: 0.25 }), 16);
    };
    const pint = (x: number, z: number, fill: number) => {
      s.lathe([[0, 0], [0.03, 0], [0.034, 0.1], [0.041, 0.12], [0.04, 0.15], [0.038, 0.15], [0.03, 0.006], [0, 0.006]], clearGlass, [x, TOP, z]);
      if (fill > 0) s.cylinder(0.031, 0.029, fill * 0.12, [x, TOP + 0.008 + fill * 0.06, z], new THREE.MeshStandardMaterial({ color: '#d99a2a', roughness: 0.15, emissive: '#d99a2a', emissiveIntensity: 0.2 }), 16);
    };
    const beerBottle = (x: number, z: number, down: boolean) => {
      const bottle = new THREE.Mesh(bottleShape, new THREE.MeshStandardMaterial({ color: random() < 0.5 ? '#5a3a16' : '#2f5a34', roughness: 0.2 }));
      bottle.scale.set(0.8, 0.8, 0.8); bottle.castShadow = true;
      if (down) { bottle.rotation.set(0, random() * 6, Math.PI / 2, 'YXZ'); bottle.position.set(x, TOP + 0.031, z); } else bottle.position.set(x, TOP, z);
      root.add(bottle);
    };
    const wad = (x: number, z: number) => {
      const g = new THREE.IcosahedronGeometry(0.035, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.7 + Math.abs(Math.sin(i * 3.7 + x * 50)) * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); }
      g.computeVertexNormals();
      s.mesh(g, new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 1, flatShading: true }), [x, TOP + 0.016, z]).rotation.y = random() * 6;
    };
    const rows2 = [0.45, -0.95, -2.1];
    if (a.left === 'wiped') {
      const cloth = s.material('#e9e3d2', { roughness: 1 });
      s.box([0.2, 0.03, 0.13], [-0.22, TOP + 0.015, 0.45], cloth).rotation.y = 0.2;
      s.box([0.2, 0.006, 0.02], [-0.22, TOP + 0.031, 0.47], s.material('#b3382e')).rotation.y = 0.2;
      s.lathe([[0, 0], [0.04, 0], [0.04, 0.13], [0.018, 0.16], [0.018, 0.19]], new THREE.MeshStandardMaterial({ color: '#6fc0e8', transparent: true, opacity: 0.6, roughness: 0.15 }), [0.27, TOP, -0.95]);
      s.box([0.035, 0.045, 0.09], [0.27, TOP + 0.21, -0.93], s.material('#f1ede2'));
    } else if (a.left === 'glasses') {
      const count = Math.round(mix(4, 12, mood.density));
      for (let i = 0; i < count; i++) {
        const z = rows2[i % rows2.length] + (random() - 0.5) * 0.3, x = (i % 2 ? 1 : -1) * mix(0.2, 0.32, random());
        const kind = Math.floor(random() * 5);
        if (kind === 0) tumbler(x, z, random() * 0.5, '#c87a2a');
        else if (kind === 1) pint(x, z, random() * 0.4);
        else if (kind === 2) beerBottle(x, z, random() < 0.3);
        else if (kind === 3) wad(x, z);
        else { tumbler(x, z, 0.15, '#d8c9a0'); s.rod([x, TOP + 0.01, z], [x + 0.03, TOP + 0.14, z + 0.01], 0.003, s.material(mood.cheer > 0.5 ? '#e8452e' : '#22242a')); }
      }
      s.lathe([[0, 0], [0.06, 0], [0.07, 0.025], [0.062, 0.025], [0.055, 0.008], [0, 0.008]], new THREE.MeshPhysicalMaterial({ color: '#d9a04a', transparent: true, opacity: 0.55, roughness: 0.05, side: THREE.DoubleSide }), [0.26, TOP, 0.42]);
      s.rod([0.24, TOP + 0.014, 0.42], [0.29, TOP + 0.03, 0.45], 0.005, s.material('#f1ede2'));
    } else if (a.left === 'onedrink') {
      s.cylinder(0.055, 0.055, 0.004, [0.24, TOP + 0.002, 0.45], s.material('#ece3cc', { roughness: 1 }), 24);
      tumbler(0.24, 0.45, 0.55, '#c8762a');
      const coat = s.material(mood.cheer > 0.5 ? '#a8443a' : '#3a3f4a', { roughness: 0.95 });
      const st = standing(SX + 0.06, 0.45, 0.3);
      s.box([0.36, 0.5, 0.1], [st.position.x + 0.14, 0.72, 0.45], coat).rotation.z = -0.12;
      s.box([0.34, 0.08, 0.34], [st.position.x, 0.8, 0.45], coat);
      for (const zz of [-0.2, 0.2]) s.box([0.09, 0.42, 0.08], [st.position.x + 0.2, 0.45, 0.45 + zz], coat).rotation.z = -0.18;
    } else {
      const steel = new THREE.MeshStandardMaterial({ color: '#8f9498', metalness: 0.7, roughness: 0.4 });
      const tx = -0.16, tz = -0.95;
      s.box([0.42, 0.012, 0.36], [tx, TOP + 0.006, tz], steel);
      for (const z of [-0.18, 0.18]) s.box([0.42, 0.06, 0.012], [tx, TOP + 0.03, tz + z], steel);
      for (const x of [-0.21, 0.21]) s.box([0.012, 0.06, 0.36], [tx + x, TOP + 0.03, tz], steel);
      const notes = ['#7fa27a', '#8fb489', '#b9a064', '#7fa27a'];
      for (let i = 0; i < 4; i++) { s.box([0.085, 0.02 + random() * 0.03, 0.16], [tx - 0.15 + i * 0.1, TOP + 0.03, tz - 0.08], s.material(notes[i], { roughness: 0.9 })); s.box([0.087, 0.005, 0.03], [tx - 0.15 + i * 0.1, TOP + 0.045, tz - 0.08], s.material('#f1ede2')); }
      const coinTints = ['#c9ccce', '#b87a4a', '#d9b548', '#c9ccce', '#d9b548'];
      for (let i = 0; i < 5; i++) s.cylinder(0.02, 0.02, 0.02 + random() * 0.05, [tx - 0.16 + i * 0.08, TOP + 0.035, tz + 0.09], new THREE.MeshStandardMaterial({ color: coinTints[i], metalness: 0.85, roughness: 0.35 }), 14);
      for (let i = 0; i < 4; i++) s.cylinder(0.02, 0.02, 0.012 + random() * 0.05, [0.2 + (i % 2) * 0.06, TOP + 0.015, 0.36 + Math.floor(i / 2) * 0.07], new THREE.MeshStandardMaterial({ color: coinTints[i + 1], metalness: 0.85, roughness: 0.35 }), 14);
      s.cylinder(0.04, 0.045, 0.012, [-0.26, TOP + 0.006, 0.45], s.material('#3a2416'), 16);
      s.rod([-0.26, TOP, 0.45], [-0.26, TOP + 0.2, 0.45], 0.003, steel);
      for (let i = 0; i < 7; i++) { const slip = s.box([0.075, 0.002, 0.12], [-0.26, TOP + 0.03 + i * 0.012, 0.45], s.material(i % 3 ? '#f4f0e2' : '#f2e3a8', { roughness: 1 })); slip.rotation.set((random() - 0.5) * 0.25, random() * 6, (random() - 0.5) * 0.25); }
    }

    // Camera: a narrow perspective run down the bar.
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    const slots: readonly (readonly [number, number, number])[] = [[0, LAMP_Z, 1], [-0.1, -0.3, 0.92], [0.1, -1.55, 0.92]];
    const place = (items: readonly Placeable[]) => {
      let heroTop = 0.4;
      items.forEach((item, index) => {
        const [x, z, size] = slots[index % slots.length];
        // Bar-top objects are shown generously large; whatever their true size, they fit the bar's width.
        const scale = Math.min(0.52 / Math.max(item.height, 0.01), 0.3 / Math.max(item.radius, 0.01)) * size;
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, TOP, z);
        item.holder.rotation.y = 0.35 + (random() - 0.5) * 0.5;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = Math.max(0.12, visibleBounds(item.holder).max.y - TOP);
      });
      camera.position.set(0.74, TOP + mix(0.5, 0.68, Math.min(1, heroTop / 0.52)), 3.3);
      camera.lookAt(-0.44, TOP + 0.02 + heroTop * 0.35, -1.5);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(0, TOP, LAMP_Z - 0.6);
      key.position.set(mix(-0.9, 0.9, mood.daylight), TOP + 4.2, LAMP_Z + 1.4);
      const shadow = key.shadow.camera;
      shadow.left = -3.2; shadow.right = 3.2; shadow.top = 4.5; shadow.bottom = -4.5;
      shadow.near = 0.5; shadow.far = 14;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const flicker = neonMat && mood.wear > 0.45;
    const sway = mix(0.004, 0.035, mood.energy);
    return {
      object: root, camera, background, capacity: slots.length, ground: barTop, keyLight: key, place,
      update: (_dt, time) => {
        cones.forEach((cone, i) => { cone.rotation.z = Math.sin(time * 0.9 + i * 1.7) * sway; });
        if (flicker) neonMat!.opacity = Math.sin(time * mix(5, 22, mood.energy)) * Math.sin(time * 3.1 + 1) > 0.8 ? 0.5 : 1;
        if (screen) screen.color.setScalar(0.82 + Math.sin(time * 9) * Math.sin(time * 2.3) * 0.18);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});

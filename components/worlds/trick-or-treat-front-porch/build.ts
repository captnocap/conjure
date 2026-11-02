import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

const tex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

const STYLES = {
  craftsman: { siding: '#6f7a58', trim: '#efe6d0', door: '#8a3a22', roof: '#4a3a34', accent: '#a0522d' },
  colonial: { siding: '#ece9e0', trim: '#fbfaf5', door: '#1e2a3a', roof: '#3a3c42', accent: '#1d1d22' },
  victorian: { siding: '#6a4a7a', trim: '#f2ead8', door: '#2a5a5a', roof: '#3a3040', accent: '#d8a040' },
} as const;

export default defineWorld({
  questions: {
    house: choice('What kind of house is it?', {
      craftsman: 'A Craftsman bungalow: sage siding, tapered columns on brick piers, a rust-red door.',
      colonial: 'A white clapboard colonial: slim white columns, black shutters, a navy door.',
      victorian: 'A painted Victorian: plum siding, turned posts, gingerbread brackets and a teal door.',
    }),
    door: choice('What is the front door doing?', {
      open: 'Thrown open, warm hallway light pouring out past a screen door: somebody is home and handing out candy.',
      closed: 'Closed with a wreath on it, its little windows glowing.',
      dark: 'Shut and dark, porch light off: no candy here, only the bowl left out.',
    }),
    bulb: choice('What colour is the porch bulb?', {
      orange: 'A glowing orange Halloween bulb.',
      purple: 'A purple party bulb.',
      green: 'A sickly green bulb.',
      yellow: 'An ordinary warm yellow bulb.',
    }),
    yard: choice('How is the yard dressed?', {
      graveyard: 'A foam graveyard: crooked tombstones and a little black picket fence among the leaves.',
      harvest: 'Harvest: hay bales, corn stalks tied to the columns and pots of mums.',
      inflatable: 'A huge glowing inflatable ghost swaying on the lawn.',
      leaves: 'Just drifts of fallen leaves and a raked pile.',
    }),
    fog: noul('Is a fog machine puffing low fog across the lawn and steps?'),
    moon: choice('What is in the sky?', {
      full: 'A big full moon rising over the rooftops.',
      crescent: 'A thin crescent moon and the first stars.',
      clouds: 'Long purple clouds, no moon.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const dark = 0.45 + 0.55 * Math.abs(mood.daylight - 0.5) * 2;
    const glow = clamp01(0.3 + 0.7 * (0.4 * mood.cheer + 0.35 * mood.warmth + 0.25 * mood.energy));
    const skyTop = new THREE.Color('#7088bc').lerp(new THREE.Color('#2f3b6c'), dark);
    const skyMid = new THREE.Color('#9aa6cc').lerp(new THREE.Color('#5a5a92'), dark);
    const skyLow = new THREE.Color('#f0c098').lerp(new THREE.Color('#b07890'), dark).lerp(new THREE.Color('#e89a6a'), mood.warmth * 0.25);
    const lawnHex = hex(new THREE.Color('#5d7448').lerp(new THREE.Color('#7a7a50'), mood.wear * 0.4).lerp(skyMid, 0.25));
    const { art: s, world } = diorama(context, {
      background: hex(skyMid), floor: lawnHex, width: 24, depth: 26, pitch: 16, yaw: 12, maxHeight: 2.2, radius: 1.0, scale: [0.85, 1.3],
      slots: [[0, 0.55], [-2.5, 1.3], [2.6, 1.0], [-2.4, -2.75, 0.72, 0.75], [2.4, -2.75, 0.72, 0.75], [1.15, 2.9]],
      viewBox: [[-4.1, 0, -3.4], [4.1, 4.3, 2.6]],
    });
    const style = STYLES[a.house];
    const m = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(c, o);
    const trim = m(style.trim, { roughness: 0.6 });
    const emissive = (c: string, k: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.5 });
    const box = (size: V3, at: V3, mat: THREE.Material) => s.box(size, at, mat);

    // ---- lights: blue dusk, warm accents ----
    const hemi = s.root.children.find((c) => (c as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (hemi) { hemi.color.copy(skyMid).lerp(new THREE.Color('#ffffff'), 0.35); hemi.groundColor.set('#3e3a4a'); hemi.intensity = mix(1.35, 0.95, dark); }
    if (world.keyLight) { world.keyLight.color.copy(skyTop).lerp(new THREE.Color('#d0d8ff'), 0.55); world.keyLight.intensity = mix(2.0, 1.25, dark); }
    const lit = a.door !== 'dark';
    const bulbHex = { orange: '#ff8a20', purple: '#b050ff', green: '#60ff50', yellow: '#ffd27a' }[a.bulb];

    // ---- sky and far neighbours ----
    {
      const map = tex(1024, 512, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, hex(skyTop)); g.addColorStop(0.55, hex(skyMid)); g.addColorStop(0.92, hex(skyLow)); g.addColorStop(1, hex(skyLow));
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
        for (let i = 0; i < (a.moon === 'crescent' ? 120 : 40) * dark; i++) { ctx.fillStyle = `rgba(255,255,240,${0.3 + random() * 0.6})`; ctx.fillRect(random() * 1024, random() * 260, 1.6, 1.6); }
        const mx = 700 + random() * 120, my = 150 + random() * 60;
        if (a.moon === 'full') {
          const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 130); halo.addColorStop(0, 'rgba(255,240,210,0.5)'); halo.addColorStop(1, 'rgba(255,240,210,0)');
          ctx.fillStyle = halo; ctx.fillRect(0, 0, 1024, 512);
          ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(mx, my, 42, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(200,190,170,0.35)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(mx + (random() - 0.5) * 50, my + (random() - 0.5) * 50, 5 + random() * 8, 0, 7); ctx.fill(); }
        } else if (a.moon === 'crescent') {
          ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(mx, my, 26, 0, 7); ctx.fill();
          ctx.fillStyle = hex(skyTop.clone().lerp(skyMid, 0.3)); ctx.beginPath(); ctx.arc(mx + 10, my - 6, 24, 0, 7); ctx.fill();
        }
        const clouds = a.moon === 'clouds' ? 14 : 5;
        for (let i = 0; i < clouds; i++) { ctx.fillStyle = `rgba(${a.moon === 'clouds' ? '90,70,120' : '200,170,200'},${0.25 + random() * 0.25})`; ctx.beginPath(); ctx.ellipse(random() * 1024, 120 + random() * 280, 80 + random() * 200, 6 + random() * 12, 0, 0, 7); ctx.fill(); }
      });
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(190, 70), new THREE.MeshBasicMaterial({ map, fog: false }));
      sky.position.set(0, 18, -48);
      s.root.add(sky);
      // A treeline and rooftops on the horizon.
      const ridge = new THREE.Shape(); ridge.moveTo(-90, -2); ridge.lineTo(-90, 3);
      for (let x = -90; x < 90; x += 2.5) ridge.lineTo(x + 1.25, 3 + random() * 3.5 + (random() < 0.15 ? 2 : 0));
      ridge.lineTo(90, 3); ridge.lineTo(90, -2); ridge.closePath();
      const line = new THREE.Mesh(new THREE.ShapeGeometry(ridge), new THREE.MeshBasicMaterial({ color: skyTop.clone().lerp(new THREE.Color('#1e2238'), 0.5) }));
      line.position.set(0, 0, -36); s.root.add(line);
    }
    const windowGlow = (w: number, h: number, at: V3, on: boolean, mat?: THREE.Material) => {
      box([w + 0.16, h + 0.16, 0.08], at, trim);
      const pane = box([w, h, 0.04], [at[0], at[1], at[2] + 0.04], mat ?? (on ? emissive(pick(['#ffcf7a', '#ffd896', '#ffb860']), mix(0.4, 1.4, glow)) : m('#2c3048', { roughness: 0.2, metalness: 0.3 })));
      box([0.05, h, 0.03], [at[0], at[1], at[2] + 0.07], trim);
      box([w, 0.05, 0.03], [at[0], at[1], at[2] + 0.07], trim);
      return pane;
    };
    for (const side of [-1, 1]) {
      // A neighbour's house on each side, set back, windows lit.
      const nx = side * 10.2, nz = -6.5;
      const tone = pick(['#8a8a9a', '#a08a70', '#7a8a8a', '#b0a090']);
      box([6.5, 5, 6], [nx, 2.5, nz - 3], m(tone, { roughness: 0.9 }));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.6, 2.4, 4, 1), m('#3a3a44'));
      roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); roof.position.set(nx, 6.2, nz - 3); roof.castShadow = true; s.root.add(roof);
      for (const wx of [-1.6, 1.6]) for (const wy of [1.6, 3.7]) windowGlow(1.0, 1.2, [nx + wx, wy, nz], random() < (0.4 + mood.cheer * 0.5));
      // Their own pumpkins and porch light.
      s.ball([0.2, 0.17, 0.2], [nx - side * 0.5, 0.17, nz + 0.6], emissive('#ff8a20', mix(0.2, 1.2, glow)), 12);
    }

    // ---- the house ----
    const W = 9.2, front = -4.0, deckY = 0.72;
    const sidingTone = new THREE.Color(style.siding).lerp(new THREE.Color('#8a8070'), mood.wear * 0.3).lerp(skyMid, 0.08);
    const siding = tex(256, 256, (ctx) => {
      ctx.fillStyle = hex(sidingTone); ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 16) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, y + 13, 256, 3); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, y, 256, 3); }
      if (mood.wear > 0.5) for (let i = 0; i < 40 * mood.wear; i++) { ctx.fillStyle = 'rgba(230,225,210,0.5)'; ctx.fillRect(random() * 256, random() * 256, 4 + random() * 14, 2 + random() * 3); }
    }, [W / 2.4, 5.4 / 2.4]);
    const wallMat = new THREE.MeshStandardMaterial({ map: siding, roughness: 0.85 });
    box([W, 5.4, 6], [0, 2.7, front - 3], wallMat);
    // Side-gabled roof.
    const roofMat = m(style.roof, { roughness: 0.9 });
    {
      const shape = new THREE.Shape(); shape.moveTo(-3.6, 0); shape.lineTo(3.6, 0); shape.lineTo(0, 2.6); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 0.6, bevelEnabled: false });
      const roof = new THREE.Mesh(geo, roofMat); roof.rotation.y = Math.PI / 2; roof.position.set(-(W + 0.6) / 2, 5.4, front - 3); roof.castShadow = roof.receiveShadow = true; s.root.add(roof);
      box([W + 0.7, 0.18, 0.2], [0, 5.42, front + 0.55], trim);
      if (a.house !== 'colonial') {
        // A front gable dormer.
        const g = new THREE.Shape(); g.moveTo(-1.4, 0); g.lineTo(1.4, 0); g.lineTo(0, 1.4); g.closePath();
        const dormer = new THREE.Mesh(new THREE.ExtrudeGeometry(g, { depth: 2.2, bevelEnabled: false }), roofMat);
        dormer.position.set(0, 6.6, front - 1.6); dormer.rotation.y = Math.PI; dormer.castShadow = true; s.root.add(dormer);
        box([2.4, 1.2, 1.6], [0, 6.0, front - 0.9], wallMat);
        windowGlow(0.9, 0.8, [0, 6.05, front - 0.08], random() < 0.7);
      }
    }
    // Upstairs windows, with shutters on the colonial.
    for (const wx of a.house === 'colonial' ? [-3, -1, 1, 3] : [-2.8, 2.8]) {
      windowGlow(1.0, 1.4, [wx, 4.0, front + 0.02], random() < 0.35 + mood.cheer * 0.5);
      if (a.house === 'colonial') for (const sx of [-1, 1]) box([0.32, 1.5, 0.05], [wx + sx * 0.72, 4.0, front + 0.05], m(style.accent));
    }
    // Ground-floor windows behind the porch.
    for (const wx of [-2.6, 2.6]) windowGlow(1.2, 1.5, [wx, deckY + 1.45, front + 0.02], lit && random() < 0.85);

    // ---- the door ----
    const doorAt: V3 = [0, deckY + 1.06, front + 0.02];
    box([1.25, 2.35, 0.1], [0, deckY + 1.17, front + 0.02], trim);
    if (a.door === 'open') {
      const hall = tex(128, 256, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#ffe2a8'); g.addColorStop(1, '#e8a050');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = 'rgba(120,60,20,0.45)';
        for (let i = 0; i < 8; i++) ctx.fillRect(70 + i * 7, 150 - i * 16, 60, 6);
        ctx.fillStyle = 'rgba(150,40,30,0.55)'; ctx.fillRect(20, 220, 90, 30);
        ctx.fillStyle = 'rgba(90,50,20,0.4)'; ctx.fillRect(0, 0, 14, 256);
      });
      const doorway = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.12), new THREE.MeshStandardMaterial({ map: hall, emissive: '#ffffff', emissiveMap: hall, emissiveIntensity: mix(0.5, 1.4, glow) }));
      doorway.position.set(0, deckY + 1.06, front + 0.075); s.root.add(doorway);
      // The screen door swung out on its hinge.
      const screen = new THREE.Group();
      const frame = m('#1d1d20', { roughness: 0.5 });
      const add = (size: V3, at: V3, mat: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); b.position.set(...at); b.castShadow = true; screen.add(b); };
      add([0.05, 2.1, 0.04], [0.025, 1.05, 0], frame); add([0.05, 2.1, 0.04], [0.92, 1.05, 0], frame);
      add([0.95, 0.06, 0.04], [0.47, 2.08, 0], frame); add([0.95, 0.06, 0.04], [0.47, 0.03, 0], frame); add([0.95, 0.08, 0.04], [0.47, 1.0, 0], frame);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.87, 2.0), new THREE.MeshStandardMaterial({ color: '#2a2a30', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      mesh.position.set(0.47, 1.05, 0); screen.add(mesh);
      screen.position.set(-0.48, deckY, front + 0.12); screen.rotation.y = -1.1;
      s.root.add(screen);
    } else {
      const doorMat = m(a.door === 'dark' ? hex(new THREE.Color(style.door).multiplyScalar(0.7)) : style.door, { roughness: 0.5 });
      box([0.95, 2.1, 0.06], [doorAt[0], doorAt[1], doorAt[2] + 0.05], doorMat);
      for (const py of [0.55, 0.15]) for (const px of [-0.22, 0.22]) box([0.3, 0.32, 0.03], [px, deckY + 1.06 - py * 1.6 + 0.3, front + 0.1], doorMat);
      for (let i = 0; i < 3; i++) box([0.18, 0.14, 0.02], [-0.25 + i * 0.25, deckY + 1.85, front + 0.1], a.door === 'closed' ? emissive('#ffd28a', mix(0.4, 1.4, glow)) : m('#22242e'));
      box([0.05, 0.05, 0.08], [0.36, deckY + 1.0, front + 0.13], m('#c9a44a', { metalness: 0.8, roughness: 0.3 }));
      if (a.door === 'closed') {
        const wreath = s.ring(0.22, 0.06, [0, deckY + 1.35, front + 0.16], m(pick(['#ee7a12', '#2a2a2a', '#7b2fa8']), { roughness: 0.9 }));
        wreath.scale.z = 0.6;
        s.box([0.12, 0.1, 0.02], [0, deckY + 1.13, front + 0.2], m('#141414'));
      } else {
        // A cardboard sign on the dark door.
        const sign = tex(256, 128, (ctx) => { ctx.fillStyle = '#c8a06a'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 30px "Comic Sans MS", cursive, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SORRY, NO ONE', 128, 52); ctx.fillText('HOME!', 128, 92); });
        const card = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.9 }));
        card.position.set(0, deckY + 1.35, front + 0.14); card.rotation.z = (random() - 0.5) * 0.12; s.root.add(card);
      }
    }
    // The porch lantern.
    const bulbOn = a.door !== 'dark';
    const lamp = emissive(bulbHex, bulbOn ? mix(1.2, 4.5, glow) : 0.0);
    if (!bulbOn) lamp.color.set('#4a4a50');
    for (const lx of a.house === 'colonial' ? [-0.9, 0.9] : [0.9]) {
      box([0.06, 0.3, 0.08], [lx, deckY + 1.95, front + 0.06], m('#1d1d20'));
      s.cylinder(0.08, 0.1, 0.3, [lx, deckY + 1.9, front + 0.2], new THREE.MeshStandardMaterial({ color: '#2a2a30', transparent: true, opacity: 0.4, depthWrite: false }), 6);
      s.ball([0.06, 0.08, 0.06], [lx, deckY + 1.9, front + 0.2], lamp, 12);
      s.cylinder(0.02, 0.13, 0.08, [lx, deckY + 2.08, front + 0.2], m('#1d1d20'), 6);
    }
    let porchLight: THREE.PointLight | null = null;
    if (bulbOn) {
      porchLight = new THREE.PointLight(bulbHex, mix(6, 22, glow), 9, 1.6);
      porchLight.position.set(0.7, deckY + 1.85, front + 0.6);
      s.root.add(porchLight);
    }
    if (a.door === 'open') {
      const hallLight = new THREE.PointLight('#ffc070', mix(4, 12, glow), 7, 1.6);
      hallLight.position.set(0, deckY + 1.2, front + 0.5); s.root.add(hallLight);
    }

    // ---- the porch ----
    const deckFront = -1.6, deckMat = m('#8a6a4e', { roughness: 0.85 });
    box([8.2, deckY, 2.4], [0, deckY / 2, front + 1.2], deckMat);
    box([8.3, 0.06, 2.5], [0, deckY - 0.03, front + 1.2], m(a.house === 'colonial' ? '#9a9890' : '#7a5a42', { roughness: 0.8 }));
    const lattice = tex(128, 128, (ctx) => { ctx.fillStyle = '#1e1a1c'; ctx.fillRect(0, 0, 128, 128); ctx.strokeStyle = style.trim; ctx.lineWidth = 9; for (let i = -128; i < 256; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke(); } }, [10, 1]);
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(8.2, deckY - 0.12), new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.9 }));
    skirt.position.set(0, (deckY - 0.12) / 2, deckFront + 0.01); s.root.add(skirt);
    // Steps.
    const treadMat = m('#7a5a42', { roughness: 0.8 }), riserMat = m(style.trim, { roughness: 0.7 });
    for (let k = 1; k <= 3; k++) {
      const top = deckY - k * 0.18, z0 = deckFront + (k - 1) * 0.3;
      box([1.9, top, 0.3], [0, top / 2, z0 + 0.15], riserMat);
      box([1.96, 0.04, 0.32], [0, top - 0.02, z0 + 0.16], treadMat);
    }
    for (const sx of [-1, 1]) box([0.14, deckY + 0.05, 1.0], [sx * 1.02, deckY / 2, deckFront + 0.45], riserMat);
    // Columns.
    const colXs = [-3.9, -1.15, 1.15, 3.9];
    const columnTop = 3.15;
    for (const cx of colXs) {
      const at: V3 = [cx, 0, deckFront - 0.15];
      if (a.house === 'craftsman') {
        box([0.55, 0.9, 0.55], [at[0], deckY + 0.45, at[2]], m('#8a4a32', { roughness: 0.95 }));
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * Math.SQRT2, 0.24 * Math.SQRT2, columnTop - deckY - 0.9, 4), trim);
        col.rotation.y = Math.PI / 4; col.position.set(at[0], deckY + 0.9 + (columnTop - deckY - 0.9) / 2, at[2]); col.castShadow = true; s.root.add(col);
      } else if (a.house === 'colonial') {
        s.cylinder(0.13, 0.15, columnTop - deckY, [at[0], deckY + (columnTop - deckY) / 2, at[2]], trim, 16);
        box([0.38, 0.1, 0.38], [at[0], deckY + 0.05, at[2]], trim); box([0.38, 0.1, 0.38], [at[0], columnTop - 0.05, at[2]], trim);
      } else {
        s.lathe([[0.12, 0], [0.12, 0.3], [0.08, 0.4], [0.13, 0.55], [0.07, 0.8], [0.07, 1.6], [0.11, 1.75], [0.06, 1.95], [0.06, columnTop - deckY - 0.2], [0.11, columnTop - deckY - 0.1], [0.11, columnTop - deckY]], trim, [at[0], deckY, at[2]]);
        // Gingerbread brackets.
        for (const sx of [-1, 1]) {
          const br = new THREE.Shape(); br.moveTo(0, 0); br.lineTo(0.5, 0); br.quadraticCurveTo(0.12, -0.08, 0, -0.5); br.closePath();
          const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(br, { depth: 0.04, bevelEnabled: false }), m(style.accent));
          mesh.position.set(at[0] + sx * 0.06, columnTop - 0.12, at[2] - 0.02); mesh.scale.x = sx; mesh.castShadow = true; s.root.add(mesh);
        }
      }
    }
    // Porch roof and frieze.
    box([8.6, 0.24, 0.24], [0, columnTop + 0.06, deckFront - 0.15], trim);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.14, 2.9), roofMat);
    porchRoof.position.set(0, columnTop + 0.3, front + 1.3); porchRoof.rotation.x = 0.12; porchRoof.castShadow = porchRoof.receiveShadow = true; s.root.add(porchRoof);
    box([8.6, 0.06, 2.4], [0, columnTop - 0.04, front + 1.2], m(a.house === 'victorian' ? '#8ab0b8' : '#e8e4d8'));
    if (a.house === 'victorian') for (let x = -3.7; x <= 3.7; x += 0.18) s.cylinder(0.018, 0.018, 0.22, [x, columnTop - 0.17, deckFront - 0.15], trim, 6);
    // Railings with instanced balusters.
    const railH = deckY + 0.86;
    const balusters: THREE.Matrix4[] = [];
    const railRun = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, len), trim); rail.position.set((x0 + x1) / 2, railH, (z0 + z1) / 2); rail.rotation.y = ang; rail.castShadow = true; s.root.add(rail);
      const low = rail.clone(); low.position.y = deckY + 0.1; low.scale.set(0.7, 0.8, 1); s.root.add(low);
      const n = Math.floor(len / 0.13);
      for (let i = 1; i < n; i++) { const t = i / n; balusters.push(new THREE.Matrix4().makeTranslation(mix(x0, x1, t), deckY + 0.48, mix(z0, z1, t))); }
    };
    const rz = deckFront - 0.15;
    railRun(-3.9, rz, -1.15, rz); railRun(1.15, rz, 3.9, rz);
    railRun(-3.95, rz, -3.95, front + 0.1); railRun(3.95, rz, 3.95, front + 0.1);
    {
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.72, 0.045), trim, balusters.length);
      balusters.forEach((mm, i) => inst.setMatrixAt(i, mm)); inst.castShadow = inst.receiveShadow = true; s.root.add(inst);
    }
    // Stretched fake cobweb across the railing and up into the corners.
    const web = tex(256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(245,245,250,0.85)';
      const cx = random() * 60, cy = random() * 60;
      for (let i = 0; i < 14; i++) { ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); ctx.moveTo(cx, cy); const ang = random() * Math.PI / 2; ctx.quadraticCurveTo(cx + Math.cos(ang) * 120 + (random() - 0.5) * 40, cy + Math.sin(ang) * 120, cx + Math.cos(ang) * 260, cy + Math.sin(ang) * 260); ctx.stroke(); }
      for (let r = 30; r < 260; r += 26 + random() * 14) { ctx.lineWidth = 1 + random() * 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0.05, Math.PI / 2 - 0.05); ctx.stroke(); }
      ctx.fillStyle = 'rgba(240,240,245,0.25)'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 10 + random() * 30, 4 + random() * 10, random() * 3, 0, 7); ctx.fill(); }
    });
    const webMat = new THREE.MeshStandardMaterial({ map: web, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1, emissive: '#d8d8ff', emissiveMap: web, emissiveIntensity: 0.15 });
    const webs = Math.round(mix(3, 8, mood.density));
    const webSpots: [number, number, number, number, number][] = [[-1.15, columnTop - 0.6, rz + 0.02, 1, 0], [1.15, columnTop - 0.6, rz + 0.02, -1, 0], [-3.9, columnTop - 0.6, rz + 0.02, 1, 0], [3.9, columnTop - 0.6, rz + 0.02, -1, 0], [-2.5, railH - 0.45, rz + 0.06, 1, 1], [2.5, railH - 0.45, rz + 0.06, -1, 1], [-1.6, railH - 0.4, rz + 0.06, 1, 1], [3.3, railH - 0.4, rz + 0.06, -1, 1]];
    for (let i = 0; i < webs; i++) {
      const [x, y, z, flip, low] = webSpots[i];
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(low ? 1.3 : 1.1, low ? 0.8 : 1.1), webMat);
      plane.position.set(x + flip * (low ? 0 : 0.5), y, z); plane.scale.x = flip; plane.rotation.z = (random() - 0.5) * 0.3;
      s.root.add(plane);
    }
    // A big plastic spider in one web.
    {
      const black = m('#141214', { roughness: 0.4 });
      const sx = pick([-1, 1]);
      const sp = new THREE.Group(); sp.position.set(sx * 1.55, columnTop - 0.75, rz + 0.08);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), black); body.scale.set(1, 1.25, 0.7); sp.add(body);
      for (let i = 0; i < 8; i++) { const sd = i < 4 ? -1 : 1, k = i % 4; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), black); leg.position.set(sd * 0.16, 0.12 - k * 0.08, 0); leg.rotation.z = sd * (1.1 - k * 0.35); sp.add(leg); }
      s.root.add(sp);
    }

    // ---- jack-o'-lanterns on the steps and porch ----
    const face = tex(256, 128, (ctx) => {
      ctx.fillStyle = '#e8781e'; ctx.fillRect(0, 0, 256, 128);
      for (let x = 8; x < 256; x += 32) { ctx.fillStyle = 'rgba(120,50,10,0.3)'; ctx.fillRect(x, 0, 5, 128); }
      ctx.fillStyle = '#ffd040';
      ctx.beginPath(); ctx.moveTo(44, 56); ctx.lineTo(58, 36); ctx.lineTo(62, 58); ctx.fill();
      ctx.beginPath(); ctx.moveTo(66, 58); ctx.lineTo(72, 36); ctx.lineTo(84, 56); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 70); ctx.quadraticCurveTo(64, 100, 88, 70); ctx.quadraticCurveTo(64, 84, 40, 70); ctx.fill();
    });
    const faceGlow = tex(256, 128, (ctx) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(44, 56); ctx.lineTo(58, 36); ctx.lineTo(62, 58); ctx.fill();
      ctx.beginPath(); ctx.moveTo(66, 58); ctx.lineTo(72, 36); ctx.lineTo(84, 56); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 70); ctx.quadraticCurveTo(64, 100, 88, 70); ctx.quadraticCurveTo(64, 84, 40, 70); ctx.fill();
    });
    const pumpkinMat = new THREE.MeshStandardMaterial({ map: face, emissive: '#ffa030', emissiveMap: faceGlow, emissiveIntensity: mix(0.3, 3.2, glow), roughness: 0.55 });
    const pumpkinGeo = new THREE.SphereGeometry(1, 24, 14);
    {
      const p = pumpkinGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const th = Math.atan2(z, x); const k = 1 - 0.07 * Math.pow(Math.abs(Math.cos(th * 5)), 0.5); p.setXYZ(i, x * k, y * 0.78 - (Math.abs(y) > 0.95 ? 0.08 * Math.sign(y) : 0), z * k); }
      pumpkinGeo.computeVertexNormals();
    }
    const stem = m('#5a5a2a');
    const pumpkin = (x: number, y: number, z: number, r: number) => {
      const p = new THREE.Mesh(pumpkinGeo, pumpkinMat); p.scale.setScalar(r); p.position.set(x, y + r * 0.76, z); p.rotation.y = (random() - 0.5) * 0.8 - 0.2; p.castShadow = p.receiveShadow = true; s.root.add(p);
      s.cylinder(r * 0.1, r * 0.14, r * 0.35, [x, y + r * 1.55, z], stem, 6);
    };
    const pumpkinCount = Math.round(mix(3, 9, mood.density));
    const spots: [number, number, number][] = [[-0.75, deckY - 0.18, deckFront + 0.14], [0.78, deckY - 0.36, deckFront + 0.44], [-0.8, deckY - 0.54, deckFront + 0.74], [0.82, deckY, deckFront - 0.35], [-0.5, deckY, front + 0.5], [-1.6, 0, deckFront + 0.4], [1.75, 0, deckFront + 0.35], [0.75, deckY - 0.54, deckFront + 0.74], [-0.75, deckY - 0.36, deckFront + 0.44]];
    for (let i = 0; i < Math.min(pumpkinCount, spots.length); i++) { const [x, y, z] = spots[i]; pumpkin(x, y, z, 0.13 + random() * 0.09); }
    const glowLight = new THREE.PointLight('#ff9030', mix(0.5, 5, glow), 4, 2);
    glowLight.position.set(0, deckY - 0.1, deckFront + 0.8); s.root.add(glowLight);

    // ---- the front walk, lawn and street ----
    const concrete = m('#a8a49a', { roughness: 0.95 });
    for (let z = -0.6; z < 5.2; z += 0.6) box([1.2, 0.04, 0.56], [0, 0.02, z + 0.3], concrete);
    for (let x = -12; x < 12; x += 1.2) box([1.16, 0.05, 1.2], [x + 0.6, 0.025, 5.9], concrete);
    box([24, 0.14, 0.18], [0, 0.07, 6.6], concrete);
    box([24, 0.02, 6], [0, 0.01, 9.7], m('#3a3c44', { roughness: 0.95 }));
    for (let x = -11; x < 12; x += 3) box([1.4, 0.022, 0.12], [x, 0.012, 9.6], m('#d8c060'));
    // Shrubs along the porch skirt.
    const shrub = m('#2f4a32', { roughness: 1 });
    for (const x of [-3.6, -2.7, -1.8, 1.9, 2.8, 3.7]) s.ball([0.45 + random() * 0.15, 0.4 + random() * 0.15, 0.4], [x, 0.3, deckFront + 0.35], shrub, 10);
    // Fallen leaves, more of them in a dense mood.
    {
      const leaf = new THREE.Shape(); leaf.moveTo(0, -0.06); leaf.quadraticCurveTo(0.05, 0, 0, 0.06); leaf.quadraticCurveTo(-0.05, 0, 0, -0.06);
      const geo = new THREE.ShapeGeometry(leaf); geo.rotateX(-Math.PI / 2);
      const count = Math.round(mix(220, 700, mood.density));
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), count);
      const cols = ['#c4501a', '#d98a1c', '#8e3a1c', '#b8892e', '#6a4424', '#d4b030', '#a03a1a'];
      const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < count; i++) {
        let x = (random() - 0.5) * 16, z = -1.5 + random() * 8;
        if (a.yard === 'leaves' && i < count * 0.3) { x = -3.8 + (random() - 0.5) * 1.4; z = 2.4 + (random() - 0.5) * 1.0; }
        const y = a.yard === 'leaves' && i < count * 0.3 ? 0.02 + random() * 0.35 * (1 - Math.hypot(x + 3.8, z - 2.4) / 0.9) : 0.03 + random() * 0.01;
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.6, random() * 6, (random() - 0.5) * 0.6));
        mm.compose(new THREE.Vector3(x, Math.max(0.02, y), z), q, new THREE.Vector3().setScalar(0.8 + random() * 0.9));
        inst.setMatrixAt(i, mm); inst.setColorAt(i, new THREE.Color(pick(cols)));
      }
      inst.receiveShadow = true; s.root.add(inst);
    }
    // A bare maple at the lawn's right front.
    {
      const bark = m('#3a2e2a', { roughness: 1 });
      const branch = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
        const to = from.clone().addScaledVector(dir, len);
        s.rod(from.toArray() as V3, to.toArray() as V3, r, bark, r * 0.7);
        if (depth === 0) return;
        for (let k = 0; k < 2 + (depth > 2 ? 1 : 0); k++) {
          const d = dir.clone().add(new THREE.Vector3((random() - 0.5) * 1.3, 0.35 + random() * 0.4, (random() - 0.5) * 1.0)).normalize();
          branch(to, d, len * (0.62 + random() * 0.15), r * 0.65, depth - 1);
        }
      };
      branch(new THREE.Vector3(5.2, 0, 2.8), new THREE.Vector3(0, 1, 0), 2.2, 0.17, 3);
    }

    // ---- yard dressing ----
    if (a.yard === 'graveyard') {
      const foam = ['#9a9a96', '#8a8a80', '#a8a090'];
      const engrave = tex(128, 128, (ctx) => { ctx.fillStyle = '#9a9a96'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#4a4a48'; ctx.font = 'bold 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('R.I.P.', 64, 70); });
      for (let i = 0; i < 4; i++) {
        const sh = new THREE.Shape(); sh.moveTo(-0.28, 0); sh.lineTo(0.28, 0); sh.lineTo(0.28, 0.42); sh.absarc(0, 0.42, 0.28, 0, Math.PI, false); sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 });
        const front = new THREE.MeshStandardMaterial({ map: engrave, roughness: 0.95 }); engrave.repeat.set(1 / 0.56, 1 / 0.7); engrave.offset.set(0.5, 0);
        const stone = new THREE.Mesh(geo, [front, m(pick(foam), { roughness: 0.95 })]);
        stone.position.set(-4.1 - (i % 2) * 1.2 + (random() - 0.5) * 0.3, -0.04, 0.2 + i * 0.8); stone.rotation.set(-0.06, 0.25 + (random() - 0.5) * 0.4, (random() - 0.5) * 0.25);
        stone.castShadow = stone.receiveShadow = true; s.root.add(stone);
      }
      const iron = m('#1a1a1c', { roughness: 0.5 });
      for (let z = -0.6; z < 3.8; z += 0.22) s.rod([-3.3, 0, z], [-3.3, 0.5, z], 0.012, iron);
      box([0.03, 0.03, 4.4], [-3.3, 0.42, 1.6], iron); box([0.03, 0.03, 4.4], [-3.3, 0.12, 1.6], iron);
    } else if (a.yard === 'harvest') {
      const straw = tex(64, 64, (ctx) => { ctx.fillStyle = '#c8a050'; ctx.fillRect(0, 0, 64, 64); for (let i = 0; i < 200; i++) { ctx.strokeStyle = random() < 0.5 ? '#a07a30' : '#e8c878'; ctx.beginPath(); const x = random() * 64, y = random() * 64; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 12, y + (random() - 0.5) * 4); ctx.stroke(); } });
      const hay = new THREE.MeshStandardMaterial({ map: straw, roughness: 1 });
      box([1.0, 0.42, 0.5], [-1.75, 0.21, deckFront + 0.95], hay); box([1.0, 0.42, 0.5], [1.8, 0.21, deckFront + 0.9], hay);
      box([1.0, 0.42, 0.5], [-1.75, 0.63, deckFront + 0.95], hay);
      const stalk = m('#b89a5a', { roughness: 1 });
      for (const cx of [-1.15, 1.15]) for (let k = 0; k < 7; k++) { const ang = k / 7 * Math.PI * 2; const r = s.rod([cx + Math.cos(ang) * 0.22, deckY, rz + 0.05 + Math.sin(ang) * 0.1], [cx + Math.cos(ang) * 0.4, deckY + 1.8 + random() * 0.3, rz + 0.08 + Math.sin(ang) * 0.2], 0.02, stalk); void r; }
      for (const cx of [-1.15, 1.15]) box([0.5, 0.05, 0.3], [cx, deckY + 1.0, rz + 0.12], m('#c8102e'));
      for (const [x, z, c] of [[-2.6, deckFront + 0.6, '#d0702a'], [2.7, deckFront + 0.6, '#8a3a9a'], [-0.7, deckY > 0 ? deckFront + 0.95 : 0, '#e0a020']] as [number, number, string][]) {
        s.cylinder(0.22, 0.16, 0.3, [x, 0.15, z], m('#8a4a32'), 12);
        s.ball([0.32, 0.22, 0.32], [x, 0.38, z], m(c, { roughness: 1 }), 12);
      }
    } else if (a.yard === 'inflatable') {
      const nylon = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.5, emissive: '#e8e8ff', emissiveIntensity: mix(0.2, 0.8, glow) });
      const ghost = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 2.6], [0.4, 2.55], [0.62, 2.3], [0.7, 1.9], [0.72, 1.2], [0.85, 0.4], [0.95, 0.05], [0.9, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28), nylon);
      body.castShadow = true; ghost.add(body);
      const eyeMat = m('#141414');
      for (const ex of [-0.2, 0.2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeMat); e.scale.set(0.8, 1.2, 0.4); e.position.set(ex, 2.05, 0.6); ghost.add(e); }
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeMat); mouth.scale.set(0.9, 1.2, 0.4); mouth.position.set(0, 1.7, 0.66); ghost.add(mouth);
      for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10), nylon); arm.position.set(sx * 0.82, 1.55, 0.1); arm.rotation.z = sx * 0.9; ghost.add(arm); }
      ghost.position.set(-3.7, 0, 0.6); ghost.rotation.y = 0.3;
      s.root.add(ghost);
      for (const [dx, dz] of [[-1, 0.6], [1, 0.6], [0, -1]]) s.rod([-3.7 + dx * 0.5, 1.3, 0.6 + dz * 0.4], [-3.7 + dx * 1.4, 0, 0.6 + dz * 1.2], 0.005, m('#202020'));
      world.update = (dt, time) => { ghost.rotation.z = Math.sin(time * (0.6 + mood.energy * 1.8)) * 0.04 * (0.3 + mood.energy); };
    } else {
      // A rake left against the raked pile.
      s.rod([-3.0, 0, 2.2], [-3.6, 1.5, 1.8], 0.02, m('#8a6a3a'));
      box([0.5, 0.04, 0.08], [-3.62, 1.55, 1.8], m('#2a8a3a'));
    }
    if (a.fog) {
      const fogMat = new THREE.MeshStandardMaterial({ color: '#dcdcf0', transparent: true, opacity: 0.14, depthWrite: false, roughness: 1, emissive: '#b8b8e0', emissiveIntensity: 0.2 });
      const puffs: THREE.Mesh[] = [];
      for (let i = 0; i < 18; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), fogMat);
        p.scale.set(0.9 + random() * 1.2, 0.18 + random() * 0.12, 0.6 + random() * 0.8);
        p.position.set((random() - 0.5) * 9, 0.1, -1 + random() * 5.5);
        s.root.add(p); puffs.push(p);
      }
      const prev = world.update;
      world.update = (dt, time) => { prev?.(dt, time); puffs.forEach((p, i) => { p.position.x += Math.sin(time * 0.2 + i) * dt * 0.05 * (0.3 + mood.energy); }); };
    }
    // The bulb flickers a little with the scene's energy.
    const prevUpdate = world.update;
    const baseLamp = lamp.emissiveIntensity, baseLight = porchLight?.intensity ?? 0, basePumpkin = pumpkinMat.emissiveIntensity;
    world.update = (dt, time) => {
      prevUpdate?.(dt, time);
      const f = 1 + Math.sin(time * 9.7) * Math.sin(time * 3.1) * 0.12 * mood.energy;
      lamp.emissiveIntensity = baseLamp * f;
      if (porchLight) porchLight.intensity = baseLight * f;
      pumpkinMat.emissiveIntensity = basePumpkin * (1 + Math.sin(time * 13.3 + 1) * 0.15 * mood.energy);
    };
    return world;
  },
});

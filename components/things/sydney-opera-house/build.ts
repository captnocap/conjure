import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** One shell in its own space: back foot at z = 0 on y = 0, mouth facing +z, tip overhanging the feet. */
interface ShellSpec { H: number; L: number; W: number; lean: number }
const shellPoint = (spec: ShellSpec, side: number, u: number, v: number, target: THREE.Vector3) => {
  const { H, L, W, lean } = spec;
  const zt = L * (1 + lean);
  const ridgeY = H * Math.sin(u * 1.35) / Math.sin(1.35);
  const ridgeZ = zt * Math.pow(u, 1.3);
  const groundZ = L * u;
  const width = W * Math.pow(u, 0.95);
  const t = v;
  return target.set(side * width * (2 * t - t * t), ridgeY * (1 - t), ridgeZ + (groundZ - ridgeZ) * t);
};

export default defineThing({
  questions: {
    era: choice('When is the Opera House seen?', {
      building: 'The 1960s building site: bare grey concrete ribs fanning up out of half-finished shells, tower cranes swinging over them, no glass yet.',
      opening: 'Opening day in October 1973: brand-new white tiles, bunting along the podium, flags and a sky full of released balloons.',
      today: 'Today: the finished icon, cream and white tiles, bronze glass, a harbour landmark half a century old.',
    }),
    lighting: choice('How are the shells lit?', {
      floodlit: 'Warm white floodlight washing the sails, the classic evening postcard.',
      vivid: 'Vivid festival projections: bold coloured patterns thrown across every shell.',
      cause: 'Lit one solid colour for a cause, the whole building glowing as a signal.',
      dark: 'No lights on the shells at all: they read by daylight or not at all.',
    }),
    projectionColour: paint('If the shells are lit by projection or for a cause, what colour leads?', ['red', 'magenta', 'orange', 'amber', 'turquoise', 'blue', 'purple', 'lime', 'pink', 'gold']),
    pattern: choice('If Vivid projections play on the shells, what do they show?', {
      waves: 'Rolling bands like ocean swell sweeping across the sails.',
      dots: 'Rings of dots and concentric circles in the manner of desert dot painting.',
      flowers: 'Giant blooms of waratah and wattle blossoming over the tiles.',
      stripes: 'Hard geometric stripes and chevrons, a graphic op-art pattern.',
    }),
    weather: choice('What is the weather doing on it?', {
      clear: 'Clear and crisp: hard shadows and brilliant white tiles.',
      glare: 'Fierce summer glare: the tiles blaze and the podium shimmers.',
      rain: 'Rain: the tiles slick and shining, the granite darkened, streaks of falling water.',
      fog: 'Sea fog rolling in around the podium, the shells rising out of it.',
    }),
    steps: choice('What is happening on the monumental steps?', {
      crowd: 'A concert crowd pouring up the steps and spreading across the forecourt.',
      empty: 'Empty at dawn: bare granite steps, not a soul.',
      wedding: 'A wedding photo: a bride in white and a groom posed mid-stair with a photographer and a few guests.',
      tourists: 'A scatter of tourists taking pictures, sitting on the steps in ones and twos.',
    }),
    turn: choice('From which side is it seen?', {
      city: 'From the city side, the shells overlapping toward the right like a fleet of sails.',
      harbour: 'From the harbour side, the glass mouths and the tallest tips toward the viewer.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const building = a.era === 'building';
    const wet = a.weather === 'rain';
    const P = 12;

    // Tiles: a chevron of glossy white and matte cream lids, stained with wear.
    const tileMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = building ? '#aaa69d' : '#ece4d0';
      c.fillRect(0, 0, 256, 256);
      if (!building) {
        const bands = 4;
        for (let b = 0; b < bands; b++) {
          c.fillStyle = b % 2 ? '#f7f5ee' : '#e4d9bf';
          for (const shift of [-256, 0, 256]) {
            const x0 = b * 256 / bands + shift;
            c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 256 / bands, 0); c.lineTo(x0 + 256 / bands + 256, 256); c.lineTo(x0 + 256, 256); c.closePath(); c.fill();
          }
        }
        c.strokeStyle = 'rgba(150,140,118,0.55)'; c.lineWidth = 1.2;
        for (let i = -256; i < 512; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 256, 256); c.stroke(); }
        for (let j = 0; j < 256; j += 32) { c.beginPath(); c.moveTo(0, j); c.lineTo(256, j); c.stroke(); }
      } else {
        c.strokeStyle = 'rgba(70,70,64,0.5)'; c.lineWidth = 2;
        for (let j = 0; j < 256; j += 26) { c.beginPath(); c.moveTo(0, j); c.lineTo(256, j); c.stroke(); }
        for (let i = 0; i < 256; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.stroke(); }
      }
      const stains = Math.round(mood.wear * 26);
      for (let k = 0; k < stains; k++) {
        const x = random() * 256, w = 3 + random() * 10;
        const g = c.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, 'rgba(95,88,70,0)'); g.addColorStop(1, `rgba(95,88,70,${0.15 + mood.wear * 0.3})`);
        c.fillStyle = g; c.fillRect(x, 0, w, 256);
      }
    });
    tileMap.repeat.set(9, 5);

    const lead = paintHex(a.projectionColour);
    let emissive = new THREE.Color('#000000');
    let emissiveMap: THREE.Texture | null = null;
    let emissiveIntensity = 0;
    if (!building && a.lighting === 'floodlit') { emissive = new THREE.Color('#ffe2b0'); emissiveIntensity = mix(0.04, 0.55, night); }
    if (!building && a.lighting === 'cause') { emissive = new THREE.Color(lead); emissiveIntensity = mix(0.8, 1.4, night); }
    if (!building && a.lighting === 'vivid') {
      const second = new THREE.Color(lead).offsetHSL(0.33, 0, 0.05).getStyle();
      const third = new THREE.Color(lead).offsetHSL(-0.2, 0, 0.1).getStyle();
      emissiveMap = canvasTexture(256, 256, (c) => {
        c.fillStyle = '#101010'; c.fillRect(0, 0, 256, 256);
        if (a.pattern === 'waves') {
          for (let k = 0; k < 7; k++) {
            c.strokeStyle = [lead, second, third][k % 3]; c.lineWidth = 16;
            c.beginPath();
            for (let x = 0; x <= 256; x += 8) c.lineTo(x, k * 38 + 10 + Math.sin(x / 256 * Math.PI * 2 * 2 + k) * 14);
            c.stroke();
          }
        } else if (a.pattern === 'dots') {
          c.fillStyle = '#2a1a10'; c.fillRect(0, 0, 256, 256);
          for (let k = 0; k < 5; k++) {
            const cx = random() * 256, cy = random() * 256;
            for (let r = 6; r < 48; r += 9) for (let q = 0; q < r * 0.9; q++) {
              const t = q / (r * 0.9) * Math.PI * 2;
              c.fillStyle = [lead, second, '#f2e6c8'][Math.floor(r / 9) % 3];
              c.beginPath(); c.arc(cx + Math.cos(t) * r, cy + Math.sin(t) * r, 2.6, 0, Math.PI * 2); c.fill();
            }
          }
          for (let q = 0; q < 300; q++) { c.fillStyle = q % 2 ? lead : '#f2e6c8'; c.beginPath(); c.arc(random() * 256, random() * 256, 1.8, 0, Math.PI * 2); c.fill(); }
        } else if (a.pattern === 'flowers') {
          c.fillStyle = new THREE.Color(second).multiplyScalar(0.35).getStyle(); c.fillRect(0, 0, 256, 256);
          for (let k = 0; k < 9; k++) {
            const cx = random() * 256, cy = random() * 256, r = 18 + random() * 22;
            c.fillStyle = k % 2 ? lead : third;
            for (let p = 0; p < 7; p++) { const t = p / 7 * Math.PI * 2; c.beginPath(); c.ellipse(cx + Math.cos(t) * r * 0.6, cy + Math.sin(t) * r * 0.6, r * 0.5, r * 0.22, t, 0, Math.PI * 2); c.fill(); }
            c.fillStyle = '#ffe36a'; c.beginPath(); c.arc(cx, cy, r * 0.25, 0, Math.PI * 2); c.fill();
          }
        } else {
          for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? lead : second; c.fillRect(0, k * 22, 256, 11); }
          c.fillStyle = third;
          for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(k * 48, 256); c.lineTo(k * 48 + 24, 180); c.lineTo(k * 48 + 48, 256); c.fill(); }
        }
      });
      emissiveMap.repeat.set(2, 1);
      emissive = new THREE.Color('#ffffff');
      emissiveIntensity = mix(1.0, 1.8, night);
    }
    const glare = a.weather === 'glare';
    const tiles = s.material('#ffffff', {
      map: tileMap, roughness: wet ? 0.08 : glare ? 0.18 : building ? 0.9 : 0.3, metalness: wet ? 0.18 : 0.02,
      emissive: glare && emissiveIntensity < 0.1 ? new THREE.Color('#fff4dc') : emissive, emissiveMap: emissiveMap ?? undefined,
      emissiveIntensity: glare && emissiveIntensity < 0.1 ? 0.22 : emissiveIntensity, side: THREE.DoubleSide,
    });
    const ribs = s.material(building ? '#8f8b82' : '#d8ccb0', { roughness: wet ? 0.15 : 0.55, side: THREE.DoubleSide });

    // Granite podium cladding: courses of pinkish-brown blocks.
    const graniteBase = building ? '#9a968c' : new THREE.Color('#b39478').lerp(new THREE.Color('#6f5a4a'), mood.wear * 0.35 + (wet ? 0.3 : 0)).getStyle();
    const graniteMap = canvasTexture(256, 128, (c) => {
      c.fillStyle = graniteBase; c.fillRect(0, 0, 256, 128);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
        c.fillStyle = new THREE.Color(graniteBase).offsetHSL(0, (random() - 0.5) * 0.05, (random() - 0.5) * 0.06).getStyle();
        c.fillRect(col * 44 + (row % 2) * 22 + 1, row * 32 + 1, 42, 30);
      }
    });
    graniteMap.repeat.set(10, 1);
    const granite = s.material('#ffffff', { map: graniteMap, roughness: wet ? 0.2 : 0.85, metalness: wet ? 0.15 : 0 });
    const paving = s.material(new THREE.Color(graniteBase).lerp(new THREE.Color('#d8cbb8'), 0.35), { roughness: wet ? 0.15 : 0.9 });
    const glass = new THREE.MeshStandardMaterial({
      color: '#7a5a34', transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.5, side: THREE.DoubleSide, depthWrite: false,
      emissive: '#ffbf6a', emissiveIntensity: mix(0.05, 0.9, night),
    });

    // ----- the podium, the harbour broadwalk and the monumental stair -----
    s.box([128, 3.4, 150], [-1, 1.7, -8], granite);
    s.box([116, P - 3.4, 118], [-3, 3.4 + (P - 3.4) / 2, 0], granite);
    s.box([116.4, 0.4, 118.4], [-3, P + 0.2, 0], paving);
    s.box([24, P - 3.4, 34], [-51, 3.4 + (P - 3.4) / 2, -76], granite);
    s.box([24.2, 0.4, 34.2], [-51, P + 0.2, -76], paving);
    const steps = 32, run = 34 / steps, rise = P / steps;
    const stair = new THREE.Shape();
    stair.moveTo(-59, 0);
    stair.lineTo(-59, P);
    for (let i = 0; i < steps; i++) { stair.lineTo(-59 - (i + 1) * run, P - i * rise); stair.lineTo(-59 - (i + 1) * run, P - (i + 1) * rise); }
    stair.lineTo(-59, 0);
    const stairGeo = new THREE.ExtrudeGeometry(stair, { depth: 82, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(43, 0, 0);
    s.mesh(stairGeo, paving);
    // Side walls of the stair.
    s.box([2.5, P + 1.2, 34], [44.2, (P + 1.2) / 2, -76], granite);

    // ----- shells -----
    const shellsGroup = new THREE.Group();
    s.root.add(shellsGroup);
    const add = (mesh: THREE.Object3D, parent: THREE.Object3D) => { s.root.remove(mesh); parent.add(mesh); return mesh; };
    const built = building ? [1, 0.55, 0.3] : [1, 1, 1];
    const buildShell = (spec: ShellSpec, at: P3, yaw: number, complete: number, withGlass: boolean) => {
      const g = new THREE.Group();
      g.position.set(...at);
      g.rotation.y = yaw;
      shellsGroup.add(g);
      for (const side of [-1, 1]) {
        add(s.surface((u, v, t) => shellPoint(spec, side, u * complete, v, t), tiles, { segments: [26, 12] }), g);
        // The ribbed edge of the mouth and the ridge, a little proud of the tiles.
        const edge: P3[] = [];
        if (complete >= 1) {
          for (let k = 0; k <= 10; k++) { const p = shellPoint(spec, side, 1, k / 10, new THREE.Vector3()); edge.push([p.x * 1.01, p.y + 0.15, p.z + 0.25]); }
          add(s.tube(edge, Math.max(0.35, spec.H * 0.012), ribs), g);
        } else {
          // Bare ribs fanning beyond the finished part.
          for (let u = complete + 0.08; u <= 1.001; u += 0.09) {
            const rib: P3[] = [];
            for (let k = 0; k <= 8; k++) { const p = shellPoint(spec, side, u, k / 8, new THREE.Vector3()); rib.push([p.x, p.y, p.z]); }
            add(s.tube(rib, spec.H * 0.012, ribs), g);
          }
        }
      }
      if (complete >= 1) {
        const ridge: P3[] = [];
        for (let k = 0; k <= 12; k++) { const p = shellPoint(spec, 1, k / 12, 0, new THREE.Vector3()); ridge.push([p.x, p.y + 0.2, p.z]); }
        add(s.tube(ridge, Math.max(0.3, spec.H * 0.01), ribs), g);
      }
      if (withGlass && complete >= 1 && !building) {
        // Bronze glass hung from the mouth, folding forward to the podium like a prow.
        const positions: number[] = [];
        const n = 10;
        for (const side of [-1, 1]) for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n;
          const a0 = shellPoint(spec, side, 1, t0, new THREE.Vector3()), a1 = shellPoint(spec, side, 1, t1, new THREE.Vector3());
          const b0 = new THREE.Vector3(a0.x * 0.92, 0, spec.L * (1 + spec.lean) + spec.H * 0.12 * (1 - t0) - 1);
          const b1 = new THREE.Vector3(a1.x * 0.92, 0, spec.L * (1 + spec.lean) + spec.H * 0.12 * (1 - t1) - 1);
          positions.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray());
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.computeVertexNormals();
        const mesh = add(s.mesh(geo, glass), g) as THREE.Mesh;
        mesh.castShadow = false;
      }
      return g;
    };
    const row = (cx: number, z0: number, yaw: number, heights: number[], lengths: number[], widths: number[]) => {
      let zb = z0;
      heights.forEach((H, i) => {
        const L = lengths[i];
        buildShell({ H, L, W: widths[i], lean: 0.2 }, [cx, P + 0.4, zb], yaw, built[heights.length - 1 - i] ?? 1, i === heights.length - 1);
        zb += L - L * 0.32;
      });
    };
    // The Concert Hall row (west) and the Joan Sutherland Theatre row (east), splayed a little.
    row(-27, -54, 0.03, [32, 46, 60], [28, 36, 44], [11, 14.5, 18]);
    row(23, -48, -0.06, [27, 38, 50], [25, 32, 39], [9.5, 12, 15]);
    // The small restaurant shells at the head of the stair, facing the city.
    const restaurant = { H: 15, L: 15, W: 8, lean: 0.12 };
    buildShell(restaurant, [-51, P + 0.4, -66], Math.PI, 1, true);
    buildShell({ ...restaurant, H: 11, L: 11, W: 6 }, [-51, P + 0.4, -78], Math.PI, building ? 0.5 : 1, false);

    // ----- the building site -----
    if (building) {
      const yellow = s.material('#c99a2a', { roughness: 0.6, metalness: 0.3 });
      const steel = s.material('#3a3a38');
      for (const [x, z, h, turn] of [[-6, -10, 72, 0.6], [2, 22, 66, -2.1], [-40, -40, 58, 1.4]] as const) {
        s.box([2.4, h, 2.4], [x, P + h / 2, z], yellow);
        const jib = new THREE.Group();
        jib.position.set(x, P + h, z);
        jib.rotation.y = turn;
        s.root.add(jib);
        add(s.box([46, 1.6, 1.6], [12, 0.8, 0], yellow), jib);
        add(s.box([4, 3.5, 3], [-11, 1, 0], steel), jib);
        add(s.box([3, 3, 2.6], [1.5, -1.5, 0], steel), jib);
        add(s.rod([28, 0, 0], [28, -h * 0.55, 0], 0.15, steel), jib);
      }
      // Scaffold and stacks of precast tile lids on the podium.
      const crate = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 1.6, 2), s.material('#7d7466'), 18);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 18; i++) { m.makeTranslation(-40 + random() * 80, P + 1.2, -40 + random() * 70); crate.setMatrixAt(i, m); }
      crate.castShadow = true;
      s.root.add(crate);
    }

    // ----- opening day: bunting, flags and balloons -----
    if (a.era === 'opening') {
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.7, 0, 0, 0.7, 0, 0, 0, -1.4, 0], 3));
      flagGeo.computeVertexNormals();
      const bunting = new THREE.InstancedMesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 220);
      const m = new THREE.Matrix4();
      const colours = ['#c8102e', '#1f5fd1', '#f4d40c', '#f4f2ec', '#2f9e44'];
      for (let i = 0; i < 220; i++) {
        const t = (i % 110) / 110;
        const x = i < 110 ? -40 + t * 84 : -59 + t * 0;
        const z = i < 110 ? -59.5 : -59 + t * 116;
        const sag = Math.sin(((i % 11) / 11) * Math.PI) * 1.2;
        m.makeTranslation(i < 110 ? x : -61.5, P + 5 - sag, i < 110 ? z : z);
        bunting.setMatrixAt(i, m);
        bunting.setColorAt(i, new THREE.Color(colours[i % colours.length]));
      }
      s.root.add(bunting);
      const balloons = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), 160);
      for (let i = 0; i < 160; i++) {
        m.makeTranslation(-60 + random() * 120, P + 20 + random() * 70, -70 + random() * 120);
        balloons.setMatrixAt(i, m);
        balloons.setColorAt(i, new THREE.Color(colours[Math.floor(random() * colours.length)]));
      }
      s.root.add(balloons);
      const pole = s.material('#d9d6cc', { metalness: 0.6 });
      for (let k = 0; k < 6; k++) {
        const x = -36 + k * 15;
        s.cylinder(0.2, 0.25, 14, [x, 7, -94], pole, 8);
        s.box([4.2, 2.6, 0.1], [x + 2.2, 12.4, -94], s.material(colours[k % 3]));
      }
    }

    // ----- people on the steps -----
    const stepY = (z: number) => P - Math.min(steps, Math.max(0, Math.ceil((-59 - z) / run))) * rise;
    const peopleCount = { crowd: 900, empty: 0, wedding: 14, tourists: 70 }[a.steps];
    if (peopleCount) {
      const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 2, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), peopleCount);
      const m = new THREE.Matrix4();
      const clothes = ['#1b2a55', '#34363a', '#c8102e', '#efe3c4', '#7ec3ef', '#f4f2ec', '#6b4428', '#2f9e44', '#f0a215'];
      for (let i = 0; i < peopleCount; i++) {
        let x: number, z: number;
        if (a.steps === 'wedding') {
          const k = i - 3;
          x = i === 0 ? 0 : i === 1 ? 1.2 : i === 2 ? 0.5 : -5 + (k % 6) * 1.8;
          z = i < 2 ? -76 : i === 2 ? -84 : -73 + Math.floor(k / 6) * 1.5;
        } else if (a.steps === 'crowd') {
          const onStair = random() < 0.7;
          x = -40 + random() * 82;
          z = onStair ? -93 + Math.pow(random(), 0.7) * 34 : -58 + random() * 10;
        } else { x = -40 + random() * 82; z = -93 + random() * 34; }
        const y = (z < -59 ? stepY(z) : P + 0.4) + 0.85;
        m.makeTranslation(x, y, z);
        people.setMatrixAt(i, m);
        const colour = a.steps === 'wedding' ? (i === 0 ? '#ffffff' : i === 1 ? '#1d1d22' : i === 2 ? '#5b6a7a' : clothes[i % clothes.length]) : clothes[Math.floor(random() * clothes.length)];
        people.setColorAt(i, new THREE.Color(colour));
      }
      people.castShadow = true;
      s.root.add(people);
      if (a.steps === 'wedding') s.cylinder(0.1, 1.6, 1.4, [0, stepY(-76) + 0.7, -75.6], s.material('#ffffff'), 12);
    }

    // ----- weather -----
    const veils: THREE.Mesh[] = [];
    if (a.weather === 'fog') {
      const puff = canvasTexture(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 6, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      }, false);
      const fog = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: 0.75, depthWrite: false, color: '#eef1f2' });
      for (let k = 0; k < 16; k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(60 + random() * 40, 22 + random() * 10), fog);
        mesh.position.set(-60 + random() * 120, 6 + random() * 14, -80 + random() * 150);
        mesh.rotation.y = 0.7 + (random() - 0.5) * 0.4;
        s.root.add(mesh);
        veils.push(mesh);
      }
    }
    let rain: THREE.InstancedMesh | null = null;
    if (wet) {
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 5, 0.08), new THREE.MeshBasicMaterial({ color: '#cfd8de', transparent: true, opacity: 0.4, depthWrite: false }), 700);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 700; i++) { m.makeTranslation(-65 + random() * 130, 8 + random() * 60, -95 + random() * 160); rain.setMatrixAt(i, m); }
      s.root.add(rain);
    }

    // Turn the whole building so both rows of shells overlap like sails.
    const all = new THREE.Group();
    for (const child of [...s.root.children]) all.add(child);
    s.root.add(all);
    all.rotation.y = a.turn === 'city' ? 1.36 : Math.PI + 0.75;

    const energy = 0.2 + mood.energy;
    return s.finish({
      update: (dt, time) => {
        if (emissiveMap) emissiveMap.offset.x += dt * 0.02 * energy;
        for (const [i, v] of veils.entries()) v.position.x += Math.sin(time * 0.1 + i) * 0.02 * energy;
        if (rain) rain.position.y = -((time * 30 * energy) % 10);
      },
    });
  },
});

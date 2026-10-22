import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Turn a lathe (radius as a 0..1 fraction) into a rounded rectangle with half-axes a and b. */
function tub(profile: readonly (readonly [number, number])[], a: number, b: number) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 44);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), radius = Math.hypot(x, z);
    if (radius < 1e-6) continue;
    const c = x / radius, s = z / radius;
    const k = radius / (Math.abs(c / a) ** 4 + Math.abs(s / b) ** 4) ** 0.25;
    position.setX(i, c * k); position.setZ(i, s * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const SPILL = {
  water: { colour: '#bfe3f0', opacity: 0.36 },
  slushie: { colour: '#1f8fe8', opacity: 0.82 },
  coffee: { colour: '#5a3520', opacity: 0.8 },
  unknown: { colour: '#8a9a2a', opacity: 0.85 },
} as const;
const SLUSH = ['#1f8fe8', '#e8263c', '#7fd62a', '#a04cf0'];

export default defineThing({
  questions: {
    spill: choice('What is being cleaned up?', {
      water: 'Plain water: a faint sheen, tracked-in rain or a leak.',
      slushie: 'A spilled slushie in a violently bright colour, the cup still lying there.',
      coffee: 'A dropped coffee, brown and spreading.',
      unknown: 'Something unidentifiable, greenish, with lumps.',
    }),
    mop: choice('Where is the mop?', {
      bucket: 'Standing in the bucket, head down in the water.',
      wringer: 'Propped in the wringer, strings draped over it.',
      dropped: 'Dropped on the floor in the puddle, handle flat.',
    }),
    progress: choice('How far along is the job?', {
      untouched: 'Not started: the spill is still spreading.',
      half: 'Half done: a clean swathe mopped through the mess.',
      done: 'Finished: only a damp sheen drying in arcs.',
      abandoned: 'Abandoned mid-shift, rubber gloves left on the rim.',
    }),
    sign: choice('What is the wet-floor sign?', {
      english: 'A yellow A-frame: CAUTION WET FLOOR with a slipping stick figure.',
      spanish: 'A yellow A-frame: CUIDADO PISO MOJADO with a slipping figure.',
      bilingual: 'A yellow A-frame in both languages under a warning triangle.',
      cone: 'A tall four-sided yellow cone with an exclamation mark.',
      cardboard: 'A torn piece of cardboard lettered WET!! in marker.',
    }),
    fallen: noul('Has the sign been knocked flat?'),
    bucket: choice('What colour is the bucket?', {
      yellow: 'Classic janitor yellow.',
      grey: 'Institutional grey.',
      blue: 'Hospital blue.',
      red: 'Red, for the dirty jobs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bucketColour = { yellow: '#f2c21a', grey: '#8f979a', blue: '#2f6fc0', red: '#c8302a' }[a.bucket];
    const plastic = s.material(bucketColour, { roughness: 0.45 });
    const plasticDark = s.material(new THREE.Color(bucketColour).multiplyScalar(0.72), { roughness: 0.5 });
    const steel = s.material('#b9bec0', { metalness: 0.8, roughness: 0.35 });
    const black = s.material('#1e2022', { roughness: 0.7 });
    const slushColour = SLUSH[Math.floor(random() * SLUSH.length)];
    const spillColour = a.spill === 'slushie' ? slushColour : SPILL[a.spill].colour;

    // Bucket on casters.
    const A = 0.27, B = 0.185;
    s.mesh(tub([[0.001, 0.1], [0.8, 0.1], [0.84, 0.12], [1, 0.46], [0.955, 0.46], [0.79, 0.125], [0.001, 0.125]], A, B), plastic);
    s.mesh(tub([[1, 0.435], [1.045, 0.44], [1.045, 0.475], [0.955, 0.475]], A, B), plasticDark);
    const dirty = a.progress === 'untouched' ? 0.12 : a.progress === 'done' ? 0.75 : 0.5;
    const waterColour = new THREE.Color('#7fa6a8').lerp(new THREE.Color(spillColour), dirty * 0.6).lerp(new THREE.Color('#4a4638'), mood.wear * 0.5);
    const waterY = mix(0.24, 0.36, random());
    const water = s.mesh(tub([[0.001, 0], [mix(0.79, 0.955, (waterY - 0.125) / 0.335) * 0.99, 0]], A, B), s.material(waterColour, { roughness: 0.08, metalness: 0.3 }), [0, waterY, 0]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.03, 0.05, 0.045], [x * 0.19, 0.085, z * 0.115], steel);
      s.cylinder(0.036, 0.036, 0.024, [x * 0.19 + 0.012, 0.036, z * 0.115], black, 16).rotation.x = Math.PI / 2;
    }
    const warn = paint(256, 96, (ctx) => {
      ctx.fillStyle = bucketColour; ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.moveTo(44, 14); ctx.lineTo(80, 80); ctx.lineTo(8, 80); ctx.fill();
      ctx.fillStyle = bucketColour; ctx.font = '900 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 44, 56);
      ctx.fillStyle = '#16181c'; ctx.font = '900 40px sans-serif'; ctx.fillText('CAUTION', 166, 50, 160);
    });
    const badge = s.mesh(new THREE.PlaneGeometry(0.22, 0.082), new THREE.MeshStandardMaterial({ map: warn, roughness: 0.6 }), [-0.03, 0.31, B * 0.93]);
    badge.rotation.x = -0.1;
    if (mood.wear > 0.35) for (let i = 0; i < Math.round(mood.wear * 8); i++) s.box([0.02 + random() * 0.06, 0.006, 0.003], [(random() - 0.5) * 0.36, 0.14 + random() * 0.1, B * 0.87 - 0.002], s.material('#5a5648', { roughness: 0.95 })).rotation.z = (random() - 0.5) * 0.4;

    // Side-press wringer on the +x end.
    const wx = 0.165, wy = 0.47;
    const holes = paint(64, 64, (ctx) => { ctx.fillStyle = `#${plasticDark.color.getHexString()}`; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let x = 8; x < 64; x += 16) for (let y = 8; y < 64; y += 16) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill(); } });
    holes.wrapS = holes.wrapT = THREE.RepeatWrapping; holes.repeat.set(3, 1);
    const funnel = s.mesh(new THREE.CylinderGeometry(0.15, 0.105, 0.2, 4, 1).rotateY(Math.PI / 4), new THREE.MeshStandardMaterial({ map: holes, roughness: 0.5 }), [wx, wy + 0.04, 0]);
    funnel.scale.set(0.95, 1, 1.45);
    s.box([0.16, 0.012, 0.26], [wx, wy + 0.136, 0], black);
    s.box([0.03, 0.19, 0.29], [wx + 0.095, wy + 0.05, 0], plasticDark);
    s.tube([[wx + 0.07, wy, 0.165], [wx + 0.08, wy + 0.2, 0.172], [wx + 0.03, wy + 0.4, 0.172], [wx - 0.02, wy + 0.47, 0.165]], 0.011, steel);
    s.cylinder(0.017, 0.017, 0.11, [wx - 0.03, wy + 0.475, 0.165], black, 12).rotation.z = Math.PI / 2 - 0.5;
    s.cylinder(0.022, 0.022, 0.03, [wx + 0.07, wy, 0.16], steel, 12).rotation.x = Math.PI / 2;

    // The puddle in front.
    const px = -0.02 + (random() - 0.5) * 0.2, pz = 0.78;
    const big = a.progress === 'done' ? 0.52 : a.progress === 'untouched' ? mix(0.42, 0.56, random()) : 0.46;
    const blob = (radius: number, gapAt: number | null, wobble = 0.3) => {
      const points: THREE.Vector2[] = [];
      const lobes = [random() * 6, random() * 6, random() * 6];
      for (let i = 0; i < 48; i++) {
        const t = i / 48 * Math.PI * 2;
        let r = radius * (1 + wobble * (Math.sin(t * 2 + lobes[0]) * 0.45 + Math.sin(t * 3 + lobes[1]) * 0.35 + Math.sin(t * 5 + lobes[2]) * 0.2));
        if (gapAt !== null) { const d = Math.abs(((t - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 0.8) r *= mix(0.12, 1, (d / 0.8) ** 2); }
        points.push(new THREE.Vector2(Math.cos(t) * r * 1.25, Math.sin(t) * r * 0.8));
      }
      return new THREE.ShapeGeometry(new THREE.Shape(points)).rotateX(-Math.PI / 2);
    };
    const sheenMaterial = new THREE.MeshStandardMaterial({ color: '#dff1f6', transparent: true, opacity: 0.3, roughness: 0.03, metalness: 0.4, depthWrite: false });
    const spec = SPILL[a.spill];
    const wet = new THREE.MeshStandardMaterial({ color: spillColour, transparent: true, opacity: a.progress === 'done' ? 0.16 : spec.opacity, roughness: 0.06, metalness: 0.15, depthWrite: false, emissive: spillColour, emissiveIntensity: a.spill === 'slushie' ? 0.25 : a.spill === 'unknown' ? 0.12 : 0 });
    const sheen = s.mesh(blob(big * 1.12, null, 0.2), sheenMaterial, [px, 0.002, pz]);
    sheen.castShadow = false;
    const pool = s.mesh(blob(big * (a.progress === 'done' ? 0.9 : 0.82), a.progress === 'half' ? Math.PI * (1 + random() * 0.5) : null), wet, [px, 0.004, pz]);
    pool.castShadow = false;
    if (a.progress === 'half' || a.progress === 'done') for (let i = 0; i < 4; i++) {
      const arc = s.mesh(new THREE.RingGeometry(0.2 + i * 0.075, 0.235 + i * 0.075, 24, 1, 3.6 + random() * 0.3, 1.5).rotateX(-Math.PI / 2), sheenMaterial, [px - 0.1, 0.006, pz + 0.3]);
      arc.castShadow = false;
    }
    if (a.spill === 'unknown') for (let i = 0; i < 9; i++) s.ball([0.015 + random() * 0.025, 0.008 + random() * 0.012, 0.015 + random() * 0.02], [px + (random() - 0.5) * big, 0.008, pz + (random() - 0.5) * big * 0.7], s.material(random() < 0.5 ? '#6a5a2a' : '#b0a03a', { roughness: 0.4 }), 8);
    if (a.spill === 'slushie' || a.spill === 'coffee') {
      // The culprit cup, on its side.
      const cup = new THREE.Group();
      const slush = a.spill === 'slushie';
      const wall = slush ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }) : s.material('#f1ebdc', { roughness: 0.8 });
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.14, 16, 1, !slush), wall);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.07, 14), s.material(spillColour, { roughness: 0.3, emissive: spillColour, emissiveIntensity: slush ? 0.25 : 0 }));
      inside.position.y = -0.03;
      const lid = new THREE.Mesh(slush ? new THREE.SphereGeometry(0.046, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.CylinderGeometry(0.048, 0.048, 0.012, 16), slush ? wall : s.material('#2a2a2e'));
      lid.position.y = 0.07;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.05, 16, 1, true), s.material(slush ? slushColour : '#8a5a2a', { roughness: 0.7 }));
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.21, 6), s.material(slush ? '#e8263c' : '#2a2a2e'));
      straw.position.set(0.01, 0.07, 0); straw.rotation.z = -0.15;
      cup.add(shell, inside, sleeve, lid);
      if (slush) cup.add(straw); else lid.position.set(0.09, -0.02, 0.06);
      cup.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = true; });
      cup.rotation.set(0, random() * 6, Math.PI / 2 - 0.09);
      cup.position.set(px + 0.3 + random() * 0.1, 0.044, pz - 0.05 + random() * 0.2);
      s.root.add(cup);
    }

    // The mop.
    const mop = new THREE.Group();
    const stringsDirty = new THREE.Color('#e9e4d4').lerp(new THREE.Color('#6a655a'), mood.wear * 0.7).lerp(new THREE.Color(spillColour), a.progress === 'untouched' ? 0 : 0.3);
    const flat = a.mop === 'dropped';
    const cords: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 30; i++) {
      const u = (i / 29 - 0.5) * 0.13, spread = (random() - 0.5);
      const reach = mix(0.26, 0.36, random());
      const points = flat
        ? [[u, 0, 0.01], [u * 2.2 + spread * 0.1, -reach * 0.4, 0.02 + random() * 0.02], [u * 3.4 + spread * 0.24, -reach * 0.75, 0.012], [u * 4.2 + spread * 0.4, -reach, 0.008]]
        : [[u, 0, 0], [u * 1.5 + spread * 0.04, -reach * 0.35, (random() - 0.5) * 0.09], [u * 1.7 + spread * 0.07, -reach * 0.7, (random() - 0.5) * 0.12], [u * 1.6 + spread * 0.09, -reach, (random() - 0.5) * 0.12]];
      cords.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 10, 0.0065, 5));
    }
    const strings = new THREE.Mesh(mergeGeometries(cords), s.material(stringsDirty, { roughness: 1 }));
    for (const cord of cords) cord.dispose();
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.035), s.material('#2f6fc0', { roughness: 0.5 }));
    const handleLength = 1.35;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, handleLength, 10), s.material(mood.wear > 0.5 ? '#b08a56' : '#d9c08a', { roughness: 0.6 }));
    handle.position.y = handleLength / 2;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), black);
    grip.position.y = handleLength - 0.06;
    mop.add(strings, clamp, handle, grip);
    mop.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true; });
    if (a.mop === 'bucket') { mop.position.set(-0.06, waterY + 0.14, -0.02); mop.rotation.set(-0.12, random() * 0.6, 0.3); }
    else if (a.mop === 'wringer') { mop.position.set(wx - 0.01, wy + 0.2, 0); mop.rotation.set(0.1, Math.PI / 2, -0.06, 'YXZ'); }
    else {
      const holder = new THREE.Group();
      holder.position.set(px + 0.05, 0.018, pz + 0.1);
      holder.rotation.y = Math.PI * mix(0.25, 0.75, random());
      mop.rotation.x = -Math.PI / 2;
      holder.add(mop);
      s.root.add(holder);
    }
    if (a.mop !== 'dropped') s.root.add(mop);

    // The wet-floor sign.
    const sign = new THREE.Group();
    const yellow = s.material('#f6cf1c', { roughness: 0.5 });
    const figure = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
      ctx.strokeStyle = '#16181c'; ctx.fillStyle = '#16181c'; ctx.lineWidth = size * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(cx - size * 0.28, cy - size * 0.42, size * 0.11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - size * 0.2, cy - size * 0.28); ctx.lineTo(cx + size * 0.05, cy + size * 0.08);
      ctx.moveTo(cx + size * 0.05, cy + size * 0.08); ctx.lineTo(cx + size * 0.4, cy - size * 0.1);
      ctx.moveTo(cx + size * 0.05, cy + size * 0.08); ctx.lineTo(cx + size * 0.32, cy + size * 0.3);
      ctx.moveTo(cx - size * 0.12, cy - size * 0.16); ctx.lineTo(cx - size * 0.46, cy - size * 0.02);
      ctx.moveTo(cx - size * 0.12, cy - size * 0.16); ctx.lineTo(cx + size * 0.14, cy - size * 0.38); ctx.stroke();
      ctx.lineWidth = size * 0.06; ctx.beginPath(); ctx.moveTo(cx - size * 0.5, cy + size * 0.44); ctx.lineTo(cx + size * 0.5, cy + size * 0.44); ctx.stroke();
    };
    const face = paint(192, 384, (ctx) => {
      ctx.fillStyle = a.sign === 'cardboard' ? '#b8936a' : '#f6cf1c'; ctx.fillRect(0, 0, 192, 384);
      ctx.fillStyle = '#16181c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const line = (value: string, y: number, size: number, font = 'sans-serif') => { ctx.fillStyle = '#16181c'; ctx.font = `900 ${size}px ${font}`; ctx.fillText(value, 96, y, 172); };
      const triangle = (cy: number, size: number) => { ctx.strokeStyle = '#16181c'; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(96, cy - size); ctx.lineTo(96 + size * 1.1, cy + size * 0.85); ctx.lineTo(96 - size * 1.1, cy + size * 0.85); ctx.closePath(); ctx.stroke(); };
      if (a.sign === 'cardboard') { ctx.save(); ctx.translate(96, 150); ctx.rotate(-0.08); ctx.font = 'bold 86px cursive'; ctx.fillText('WET!!', 0, 0, 176); ctx.restore(); ctx.font = 'italic 34px cursive'; ctx.fillText('sorry -mgmt', 100, 250, 170); return; }
      if (a.sign === 'cone') { triangle(150, 62); line('!', 160, 84); line('CAUTION', 290, 38); return; }
      ctx.fillRect(0, 0, 192, 12); ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 12, 192, 50);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 34px sans-serif'; ctx.fillText(a.sign === 'spanish' ? 'CUIDADO' : 'CAUTION', 96, 39, 176);
      if (a.sign === 'bilingual') { triangle(128, 46); line('!', 136, 60); line('WET FLOOR', 222, 32); line('CUIDADO', 276, 30); line('PISO MOJADO', 318, 28); return; }
      triangle(170, 78); figure(ctx, 96, 180, 86);
      const [first, second] = a.sign === 'spanish' ? ['PISO', 'MOJADO'] : ['WET', 'FLOOR'];
      line(first, 296, 46); line(second, 342, 46);
    });
    const art = new THREE.MeshStandardMaterial({ map: face, roughness: 0.55 });
    const knocked = a.fallen;
    if (a.sign === 'cone') {
      face.wrapS = THREE.RepeatWrapping; face.repeat.set(4, 1);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.17, 0.92, 4, 1).rotateY(Math.PI / 4).translate(0, 0.46, 0), art);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.07), black);
      cap.position.y = 0.93;
      sign.add(cone, cap);
      if (knocked) { sign.rotation.set(Math.PI / 2 - 0.13, 0, random() * 6, 'ZXY'); sign.position.y = 0.12; }
    } else if (a.sign === 'cardboard') {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.008), [yellow, yellow, yellow, yellow, art, s.material('#a8845c')].map((m, i) => (i < 4 ? s.material('#a8845c') : m)));
      face.repeat.set(1, 0.75); face.offset.set(0, 0.25);
      board.position.set(0, 0.245, 0); board.rotation.x = -0.28;
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.006), s.material('#a8845c'));
      prop.position.set(0, 0.19, -0.14); prop.rotation.x = 0.4;
      sign.add(board, prop);
      if (knocked) { board.rotation.x = -Math.PI / 2 + 0.03; board.position.set(0, 0.008, 0.1); prop.rotation.x = Math.PI / 2; prop.position.set(0.1, 0.004, -0.2); }
    } else {
      const open = knocked ? 0.03 : 0.27, h = 0.64;
      for (const side of [1, -1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.012).translate(0, -h / 2, 0), [yellow, yellow, yellow, yellow, side > 0 ? art : yellow, side > 0 ? yellow : art]);
        panel.position.y = h * Math.cos(open);
        panel.rotation.x = -side * open;
        sign.add(panel);
      }
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.04), s.material('#d9b010'));
      hinge.position.y = h * Math.cos(open) + 0.005;
      sign.add(hinge);
      if (knocked) { const lay = new THREE.Group(); lay.add(...sign.children); lay.rotation.x = -Math.PI / 2; lay.position.set(0, 0.012, -h / 2); sign.add(lay); }
    }
    sign.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true; });
    sign.position.x = -0.72 + (random() - 0.5) * 0.12;
    sign.position.z = 0.55 + (random() - 0.5) * 0.2;
    sign.rotation.y += knocked ? (random() - 0.5) * 1.6 : 0.25 + (random() - 0.5) * 0.4;
    s.root.add(sign);

    // Things left behind.
    if (a.progress === 'abandoned') for (const z of [-0.05, 0.06]) {
      const glove = s.material('#f2d21a', { roughness: 0.6 });
      s.box([0.09, 0.035, 0.012], [-A - 0.012, 0.44, z], glove).rotation.z = 0.12;
      s.box([0.012, 0.15, 0.09], [-A - 0.02, 0.375, z], glove).rotation.x = (random() - 0.5) * 0.4;
    }
    if (mood.density > 0.55) {
      const bx = 0.52, bz = -0.1 + random() * 0.2;
      s.cylinder(0.04, 0.045, 0.17, [bx, 0.085, bz], s.material('#3fa8c8', { roughness: 0.3 }), 14);
      s.cylinder(0.014, 0.02, 0.04, [bx, 0.19, bz], s.material('#f4f4f0'), 10);
      s.box([0.03, 0.035, 0.075], [bx, 0.225, bz + 0.015], s.material('#f4f4f0'));
      s.box([0.012, 0.05, 0.012], [bx, 0.19, bz + 0.045], s.material('#f4f4f0')).rotation.x = -0.3;
    }
    if (mood.density > 0.35) s.box([0.012, 0.11, 0.16], [0.05, 0.42, -B - 0.012], s.material('#c9d2d6', { roughness: 1 })).rotation.x = (random() - 0.5) * 0.2;

    const slosh = mix(0.002, 0.012, mood.energy);
    return s.finish({ footprint: 0.75, update: (_dt, time) => { water.position.y = waterY + Math.sin(time * 1.7) * slosh; water.rotation.z = Math.sin(time * 1.1) * slosh * 2; } });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Species = 'bass' | 'trout' | 'pike';
const PROFILE: Record<Species, [number, number][]> = {
  bass: [[0, 0.062], [0.08, 0.108], [0.25, 0.142], [0.45, 0.15], [0.7, 0.105], [0.9, 0.05], [1, 0.04]],
  trout: [[0, 0.03], [0.1, 0.075], [0.3, 0.1], [0.5, 0.105], [0.75, 0.075], [0.92, 0.04], [1, 0.035]],
  pike: [[0, 0.026], [0.12, 0.05], [0.3, 0.066], [0.6, 0.068], [0.8, 0.05], [0.93, 0.03], [1, 0.028]],
};
const SKIN: Record<Species, { back: string; flank: string; belly: string; band: string }> = {
  bass: { back: '#2f3d1c', flank: '#8d9744', belly: '#efe8cc', band: '#20260f' },
  trout: { back: '#46563a', flank: '#b5ad86', belly: '#f2edda', band: '#d2607a' },
  pike: { back: '#35452a', flank: '#6c7838', belly: '#efe9cf', band: '#d6d196' },
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    trophy: choice('What is mounted on the wall?', {
      bass: 'A largemouth bass, fat and green with its bucket mouth wide open.',
      trout: 'A rainbow trout, slim and silver with a pink stripe.',
      pike: 'A long, spotted northern pike with a flat snout.',
      antlers: 'A set of deer antlers on a shield.',
      bowling: 'A little shelf of bowling trophies with a pin and a ball.',
      gone: 'Nothing any more: a pale unfaded patch and two screws where a trophy hung for years.',
    }),
    size: score('How impressive is it?', ['Barely a keeper', 'Respectable', 'A real trophy', 'The one he still talks about']),
    plaque: choice('What shape is the plaque it is mounted on?', {
      oval: 'A routed oval.',
      shield: 'A heraldic shield.',
      rectangle: 'A rectangle with clipped corners.',
      slab: 'A rough slice of log with the bark edge left on.',
    }),
    plate: choice('What is engraved on the brass plate?', {
      record: 'LAKE RECORD 1974',
      weight: '8 LB 4 OZ',
      dad: 'DAD',
      first: 'FIRST PLACE',
      name: 'BIG ED',
      league: 'TUESDAY LEAGUE',
      blank: 'Nothing: tarnished blank.',
    }),
    wall: choice('What is the wall panelling?', {
      walnut: 'Dark grooved walnut-look sheet panelling.',
      pine: 'Orange knotty pine boards.',
      painted: 'Panelling painted over in avocado green.',
      birch: 'Pale blond birch.',
    }),
    beside: choice('What else hangs with it?', {
      nothing: 'Nothing else.',
      light: 'A brass picture light above, switched on.',
      rod: 'The rod and reel that did it, racked on two hooks above.',
      photo: 'A faded framed snapshot of the day.',
      calendar: 'A feed-store calendar, years out of date.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = mix(0.7, 1.22, a.size);
    const isFish = a.trophy === 'bass' || a.trophy === 'trout' || a.trophy === 'pike';
    const L = isFish ? { bass: 0.68, trout: 0.62, pike: 0.9 }[a.trophy as Species] * k : 0;
    const plaqueW = isFish ? L * 1.12 : a.trophy === 'antlers' ? 0.3 * mix(0.9, 1.1, a.size) : 0.52;
    const plaqueH = isFish ? Math.max(0.24, L * (a.trophy === 'pike' ? 0.34 : 0.5)) : a.trophy === 'antlers' ? 0.38 : 0.3;
    const tall = a.trophy === 'antlers' || a.trophy === 'bowling';
    const W = Math.max(0.9, plaqueW + 0.3), H = tall ? 1.6 : 1.3, thick = 0.07, mountY = tall ? 0.86 : 0.8;

    // The wall section, with trim and a pair of stage braces behind so it stands.
    const wallTone = { walnut: '#4b2f1d', pine: '#b9783a', painted: '#737a3c', birch: '#d2b47e' }[a.wall];
    const panel = paint(512, 512, (ctx, w, h) => {
      const base = new THREE.Color(wallTone).lerp(new THREE.Color('#8f8878'), mood.wear * 0.2);
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      if (a.wall !== 'painted') for (let i = 0; i < 260; i++) {
        ctx.strokeStyle = random() < 0.6 ? 'rgba(20,8,0,0.16)' : 'rgba(255,220,170,0.1)';
        ctx.lineWidth = 0.5 + random() * 1.5;
        const x = random() * w, sway = (random() - 0.5) * 14;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + sway, h * 0.3, x - sway, h * 0.7, x + sway * 0.3, h); ctx.stroke();
      }
      if (a.wall === 'pine') for (let i = 0; i < 16; i++) { const x = random() * w, y = random() * h; ctx.fillStyle = '#5a3216'; ctx.beginPath(); ctx.ellipse(x, y, 5 + random() * 5, 8 + random() * 8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(70,36,12,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 11 + random() * 5, 20 + random() * 8, 0, 0, 7); ctx.stroke(); }
      // Grooves at uneven plank widths.
      let x = 0;
      while (x < w) { x += a.wall === 'pine' ? 64 : [26, 44, 58][Math.floor(random() * 3)]; ctx.fillStyle = 'rgba(8,4,0,0.62)'; ctx.fillRect(x, 0, 3, h); ctx.fillStyle = 'rgba(255,230,190,0.14)'; ctx.fillRect(x + 3, 0, 1.5, h); }
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: panel, roughness: a.wall === 'painted' ? 0.6 : 0.5 });
    const backMat = s.material('#cfc6b2', { roughness: 0.95 });
    const stud = s.material('#c9a878', { roughness: 0.9 });
    const trim = s.material(new THREE.Color(wallTone).multiplyScalar(0.7), { roughness: 0.5 });
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a04a').lerp(new THREE.Color('#6b5a38'), mood.wear * 0.5), metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, thick), [backMat, backMat, backMat, backMat, wallMat, backMat]);
    wall.position.set(0, H / 2, -thick / 2);
    wall.castShadow = wall.receiveShadow = true;
    s.root.add(wall);
    s.box([W + 0.02, 0.09, 0.022], [0, 0.045, 0.011], trim);
    s.box([W + 0.03, 0.05, 0.035], [0, H - 0.025, 0.012], trim);
    s.box([W + 0.05, 0.02, 0.06], [0, H + 0.005, 0.0], trim);
    for (const x of [-1, 1]) {
      s.box([0.04, H, 0.09], [x * (W / 2 - 0.02), H / 2, -thick - 0.045], stud);
      s.rod([x * (W / 2 - 0.02), H * 0.72, -thick - 0.09], [x * (W / 2 - 0.02), 0.02, -thick - 0.5], 0.018, stud);
      s.box([0.04, 0.04, 0.52], [x * (W / 2 - 0.02), 0.02, -thick - 0.26], stud);
    }

    const front = 0;
    const mount = new Sculpture(context);
    mount.root.position.set(0, mountY, front);
    mount.root.rotation.z = (random() - 0.5) * mood.wear * 0.22;
    s.root.add(mount.root);

    // Plaque.
    const outline = (w: number, h: number) => {
      const shape = new THREE.Shape();
      if (a.plaque === 'oval') shape.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2);
      else if (a.plaque === 'shield') { shape.moveTo(-w / 2, h / 2); shape.quadraticCurveTo(0, h * 0.38, w / 2, h / 2); shape.lineTo(w / 2, 0); shape.quadraticCurveTo(w * 0.42, -h * 0.4, 0, -h / 2); shape.quadraticCurveTo(-w * 0.42, -h * 0.4, -w / 2, 0); shape.closePath(); }
      else if (a.plaque === 'rectangle') { const c = Math.min(w, h) * 0.14; shape.moveTo(-w / 2 + c, h / 2); shape.lineTo(w / 2 - c, h / 2); shape.lineTo(w / 2, h / 2 - c); shape.lineTo(w / 2, -h / 2 + c); shape.lineTo(w / 2 - c, -h / 2); shape.lineTo(-w / 2 + c, -h / 2); shape.lineTo(-w / 2, -h / 2 + c); shape.lineTo(-w / 2, h / 2 - c); shape.closePath(); }
      else for (let i = 0; i <= 28; i++) { const t = i / 28 * Math.PI * 2, r = 1 + Math.sin(t * 3 + 1) * 0.05 + (random() - 0.5) * 0.07; const x = Math.cos(t) * w / 2 * r, y = Math.sin(t) * h / 2 * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      return shape;
    };
    const plaqueTone = a.wall === 'walnut' || a.wall === 'painted' ? '#b9803c' : '#5a3620';
    const varnish = new THREE.MeshStandardMaterial({ color: plaqueTone, roughness: 0.28 });
    const plaqueT = 0.024;
    if (a.trophy === 'gone') {
      const ghost = mount.mesh(new THREE.ShapeGeometry(outline(0.5, 0.26)), new THREE.MeshStandardMaterial({ color: new THREE.Color(wallTone).lerp(new THREE.Color('#ffffff'), 0.2), roughness: 0.6, map: panel }), [0, 0, 0.002]);
      (ghost.material as THREE.MeshStandardMaterial).map = null;
      (ghost.material as THREE.MeshStandardMaterial).transparent = true;
      (ghost.material as THREE.MeshStandardMaterial).opacity = 0.55;
      ghost.castShadow = false;
      for (const x of [-0.12, 0.12]) { mount.cylinder(0.008, 0.008, 0.012, [x, 0.05, 0.006], brass, 8).rotation.x = Math.PI / 2; mount.cylinder(0.003, 0.003, 0.03, [x, 0.05, 0.015], brass, 6).rotation.x = Math.PI / 2; }
      mount.tube([[-0.12, 0.05, 0.02], [-0.06, -0.02, 0.022], [0.02, -0.05, 0.022], [0.07, -0.16, 0.02]], 0.0025, s.material('#8d8f90', { metalness: 0.7 }));
    } else if (a.trophy !== 'bowling') {
      const edge = a.plaque === 'slab' ? s.material('#3a2618', { roughness: 1 }) : varnish;
      const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(outline(plaqueW, plaqueH), { depth: plaqueT, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 28 }), [varnish, edge]);
      slab.position.z = 0.008;
      slab.castShadow = slab.receiveShadow = true;
      mount.root.add(slab);
    }
    const face = 0.008 + plaqueT + 0.008;

    // Brass plate.
    const text = { record: 'LAKE RECORD 1974', weight: '8 LB 4 OZ', dad: 'DAD', first: 'FIRST PLACE', name: 'BIG ED', league: 'TUESDAY LEAGUE', blank: ' ' }[a.plate];
    const plateAt: P3 = a.trophy === 'gone' ? [0, -0.2, 0.004] : a.trophy === 'bowling' ? [0, -0.045, 0.171] : a.trophy === 'antlers' ? [0, -plaqueH * 0.24, face + 0.002] : [0, -plaqueH / 2 + 0.035, face + 0.002];
    const plateW = a.trophy === 'antlers' ? 0.13 : 0.2;
    const plate = mount.label(text, plateW, 0.044, plateAt, '#3a2a10', a.plate === 'blank' || mood.wear > 0.75 ? '#8a7648' : '#d2ad55');
    (plate.material as THREE.MeshStandardMaterial).metalness = 0.6;
    (plate.material as THREE.MeshStandardMaterial).roughness = 0.35;
    for (const x of [-1, 1]) mount.ball([0.004, 0.004, 0.002], [plateAt[0] + x * (plateW / 2 - 0.008), plateAt[1], plateAt[2] + 0.001], brass, 6);

    if (isFish) {
      const species = a.trophy as Species, skin = SKIN[species], profile = PROFILE[species];
      const bodyL = L * 0.84, bend = mix(0.35, 0.75, random()) * (species === 'pike' ? 0.5 : 1), radius = bodyL / bend;
      const hh = (t: number) => { for (let i = 1; i < profile.length; i++) if (t <= profile[i][0]) { const [t0, h0] = profile[i - 1], [t1, h1] = profile[i], f = (t - t0) / (t1 - t0), e = f * f * (3 - 2 * f); return (h0 + (h1 - h0) * e) * L; } return profile[profile.length - 1][1] * L; };
      const flat = species === 'pike' ? 0.62 : 0.48;
      const centre = (t: number) => { const phi = (t - 0.5) * bend; return new THREE.Vector3(radius * Math.sin(phi), radius * (1 - Math.cos(phi)) - radius * (1 - Math.cos(bend / 2)) * 0.5, Math.max(0, t - 0.62) ** 2 * L * 0.9); };
      const up = (t: number) => { const phi = (t - 0.5) * bend; return new THREE.Vector3(-Math.sin(phi), Math.cos(phi), 0); };
      const fishGroup = new THREE.Group();
      const N = 30, M = 16, position: number[] = [], colour: number[] = [], index: number[] = [];
      const back = new THREE.Color(skin.back), flank = new THREE.Color(skin.flank), belly = new THREE.Color(skin.belly), band = new THREE.Color(skin.band);
      for (let i = 0; i <= N; i++) {
        const t = i / N, c = centre(t), u = up(t), h = hh(t), blotch = random();
        for (let j = 0; j < M; j++) {
          const theta = j / M * Math.PI * 2, cos = Math.cos(theta), sin = Math.sin(theta);
          position.push(c.x + u.x * h * cos, c.y + u.y * h * cos, c.z + h * flat * sin);
          const tone = cos > 0.35 ? back.clone().lerp(flank, (1 - cos) / 0.65 * 0.6) : cos > -0.35 ? flank.clone() : flank.clone().lerp(belly, Math.min(1, (-cos - 0.35) / 0.3));
          if (species === 'bass' && Math.abs(cos - 0.05) < 0.22 && t > 0.14 && blotch > 0.25) tone.lerp(band, 0.75);
          if (species === 'trout' && Math.abs(cos + 0.02) < 0.2 && t > 0.1) tone.lerp(band, 0.6);
          if (species === 'trout' && cos > 0 && random() < 0.3) tone.lerp(new THREE.Color('#1c2216'), 0.6);
          if (species === 'pike' && cos > -0.4 && random() < 0.4) tone.lerp(band, 0.7);
          colour.push(tone.r, tone.g, tone.b);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * M + j, q = i * M + (j + 1) % M; index.push(p, q, p + M, q, q + M, p + M); }
      // Mouth: a red-pink cap in the open end.
      const mouth = new THREE.Color('#a8343c'), nose = centre(0), cap = position.length / 3;
      position.push(nose.x + L * 0.02, nose.y, nose.z);
      colour.push(mouth.r, mouth.g, mouth.b);
      for (let j = 0; j < M; j++) index.push(cap, (j + 1) % M, j);
      const tailBase = centre(1), end = position.length / 3;
      position.push(tailBase.x, tailBase.y, tailBase.z);
      colour.push(flank.r, flank.g, flank.b);
      for (let j = 0; j < M; j++) index.push(end, N * M + j, N * M + (j + 1) % M);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.22, 0.6, mood.wear), side: THREE.DoubleSide }));
      body.castShadow = body.receiveShadow = true;
      fishGroup.add(body);
      const finMat = new THREE.MeshStandardMaterial({ color: species === 'trout' ? '#7a7a52' : '#3d4722', roughness: 0.4, side: THREE.DoubleSide });
      const fin = (points: [number, number][], t: number, lift: number, yaw = 0, pitch = 0, z = 0) => {
        const shape = new THREE.Shape();
        points.forEach(([x, y], i) => i ? shape.lineTo(x * L, y * L) : shape.moveTo(x * L, y * L));
        const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), finMat);
        const c = centre(t), u = up(t);
        mesh.position.set(c.x + u.x * hh(t) * lift, c.y + u.y * hh(t) * lift, c.z + z);
        mesh.rotation.set(pitch, yaw, (t - 0.5) * bend, 'ZYX');
        mesh.castShadow = true;
        fishGroup.add(mesh);
      };
      // Mouth opening tilts the jaw; lower jaw juts for a bass.
      const jawTone = new THREE.MeshStandardMaterial({ color: skin.belly, roughness: 0.3 });
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), jawTone);
      const j0 = centre(0.02), ju = up(0.02), gape = species === 'bass' ? 1 : 0.55;
      jaw.scale.set(hh(0) * 1.5, hh(0) * 0.5, hh(0) * flat * 1.1);
      jaw.position.set(j0.x - L * 0.012 * gape + ju.x * -hh(0) * 0.95, j0.y + ju.y * -hh(0) * (0.75 + 0.3 * gape), j0.z);
      jaw.rotation.z = -bend / 2 - 0.5 * gape;
      jaw.castShadow = true;
      fishGroup.add(jaw);
      const eyeAt = centre(0.1), eu = up(0.1), eyeR = L * 0.018;
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 8), new THREE.MeshStandardMaterial({ color: '#d9a82a', roughness: 0.15 }));
        eye.position.set(eyeAt.x + eu.x * hh(0.1) * 0.45, eyeAt.y + eu.y * hh(0.1) * 0.45, eyeAt.z + side * hh(0.1) * flat * 0.86);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 10, 6), new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.1 }));
        pupil.position.copy(eye.position).add(new THREE.Vector3(0, 0, side * eyeR * 0.6));
        fishGroup.add(eye, pupil);
      }
      // Gill cover.
      const gill = new THREE.Mesh(new THREE.TorusGeometry(hh(0.2) * 0.72, L * 0.006, 6, 16, Math.PI * 1.1), new THREE.MeshStandardMaterial({ color: skin.back, roughness: 0.4 }));
      const g0 = centre(0.19);
      gill.position.set(g0.x, g0.y, g0.z + hh(0.2) * flat * 0.86);
      gill.rotation.set(0, 0.3, -Math.PI * 0.55 + (0.19 - 0.5) * bend);
      fishGroup.add(gill);
      if (species === 'bass') {
        fin([[0, 0], [0.01, 0.06], [0.035, 0.035], [0.05, 0.085], [0.075, 0.05], [0.09, 0.09], [0.115, 0.05], [0.13, 0.075], [0.15, 0.03], [0.16, 0]], 0.3, 0.9);
        fin([[0, 0], [0.02, 0.07], [0.07, 0.085], [0.12, 0.05], [0.13, 0]], 0.58, 0.9);
        fin([[0, 0], [0.03, -0.07], [0.09, -0.06], [0.1, 0]], 0.66, -0.9);
      } else if (species === 'trout') {
        fin([[0, 0], [0.02, 0.06], [0.09, 0.05], [0.11, 0]], 0.4, 0.9);
        fin([[0, 0], [0.01, 0.025], [0.035, 0.02], [0.03, 0]], 0.8, 0.9);
        fin([[0, 0], [0.03, -0.055], [0.08, -0.04], [0.085, 0]], 0.7, -0.9);
      } else {
        fin([[0, 0], [0.02, 0.06], [0.08, 0.065], [0.1, 0]], 0.76, 0.9);
        fin([[0, 0], [0.02, -0.055], [0.08, -0.055], [0.09, 0]], 0.77, -0.9);
      }
      fin([[0, 0], [0.02, -0.06], [0.06, -0.05], [0.055, 0]], 0.36, -0.9, 0, 0.5);
      fin([[0, 0], [0.07, 0.03], [0.09, -0.01], [0.06, -0.04], [0, -0.012]], 0.22, -0.2, -0.75, 0, hh(0.22) * flat * 0.9);
      const tb = hh(1) / L;
      fin([[-0.01, -tb], [0.13, -0.11], [0.17, -0.1], [0.14, 0], [0.17, 0.1], [0.13, 0.11], [-0.01, tb]], 1, 0, -0.35);
      // Head up, standing proud of the plaque on two hidden posts.
      fishGroup.rotation.z = -mix(0.05, 0.22, random());
      fishGroup.position.set(L * 0.02, plaqueH * 0.06, face + hh(0.45) * flat + 0.012);
      mount.root.add(fishGroup);
    } else if (a.trophy === 'antlers') {
      const bone = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9c9a2').lerp(new THREE.Color('#8f8468'), mood.wear * 0.5), roughness: 0.55 });
      mount.ball([0.06, 0.045, 0.045], [0, plaqueH * 0.12, face + 0.03], s.material('#5a1f1c', { roughness: 0.9 }), 14);
      const points = 2 + Math.round(a.size * 3 + random() * 0.8);
      for (const side of [-1, 1]) {
        const beam: P3[] = ([[0.04, 0, 0.05], [0.13, 0.1, 0.1], [0.24, 0.27, 0.13], [0.25, 0.43, 0.2], [0.16, 0.54, 0.27], [0.08, 0.57, 0.3]] as P3[]).map(([x, y, z]) => [side * x * k * mix(0.9, 1.1, random()), plaqueH * 0.14 + y * k, face + 0.02 + z * k]);
        const curve = new THREE.CatmullRomCurve3(beam.map((p) => new THREE.Vector3(...p)));
        mount.tube(beam, 0.016 * k, bone);
        mount.ball([0.03 * k, 0.02 * k, 0.03 * k], beam[0], bone, 10);
        for (let i = 0; i < points; i++) {
          const at = curve.getPoint(mix(0.12, 0.86, i / Math.max(1, points - 1))), length = mix(0.2, 0.1, i / points) * k * mix(0.8, 1.2, random());
          mount.rod(at.toArray() as P3, [at.x - side * 0.03 * k, at.y + length, at.z + (i === 0 ? 0.1 * k : 0.03)], 0.012 * k, bone, 0.002);
        }
      }
    } else if (a.trophy === 'bowling') {
      const shelfW = 0.52 + a.size * 0.2;
      mount.box([shelfW, 0.026, 0.17], [0, -0.013, 0.085], varnish);
      for (const x of [-1, 1]) { const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.14, 0); shape.quadraticCurveTo(0.03, -0.03, 0, -0.14); shape.closePath(); const bracket = mount.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), varnish, [x * (shelfW / 2 - 0.06) + 0.01, -0.026, 0]); bracket.rotation.y = -Math.PI / 2; }
      const gold = new THREE.MeshStandardMaterial({ color: '#e0b63c', metalness: 0.85, roughness: 0.25 });
      const count = 2 + Math.round(a.size * 2 + mood.density);
      const spots = Array.from({ length: count }, (_u, i) => -shelfW / 2 + 0.07 + i * (shelfW - 0.3) / Math.max(1, count - 1));
      spots.forEach((x, i) => {
        const tall = mix(0.14, 0.34, a.size) * mix(0.6, 1.1, random()), z = 0.07 + (i % 2) * 0.03;
        mount.box([0.07, 0.03, 0.07], [x, 0.015, z], s.material(i % 2 ? '#efe9dc' : '#2a2422', { roughness: 0.2 }));
        mount.cylinder(0.014, 0.014, tall, [x, 0.03 + tall / 2, z], new THREE.MeshStandardMaterial({ color: ['#b3202a', '#1f4a8a', '#e0b63c', '#2f7a4a'][i % 4], metalness: 0.6, roughness: 0.3 }), 12);
        mount.cylinder(0.026, 0.018, 0.012, [x, 0.036 + tall, z], gold, 12);
        if (i % 3 === 1) mount.lathe([[0, 0], [0.012, 0.004], [0.008, 0.02], [0.028, 0.045], [0.034, 0.075], [0.03, 0.078], [0.006, 0.03]], gold, [x, 0.042 + tall, z]);
        else {
          // A little gilt bowler in mid-delivery.
          const y = 0.042 + tall;
          mount.rod([x - 0.012, y, z], [x, y + 0.035, z], 0.006, gold); mount.rod([x + 0.02, y, z], [x, y + 0.035, z], 0.006, gold);
          mount.rod([x, y + 0.035, z], [x - 0.008, y + 0.07, z], 0.009, gold);
          mount.ball([0.01, 0.011, 0.01], [x - 0.012, y + 0.084, z], gold, 8);
          mount.rod([x - 0.008, y + 0.065, z], [x - 0.038, y + 0.035, z], 0.004, gold);
          mount.ball([0.009, 0.009, 0.009], [x - 0.04, y + 0.03, z], gold, 8);
        }
      });
      const px = shelfW / 2 - 0.075;
      mount.lathe([[0, 0], [0.026, 0], [0.034, 0.03], [0.04, 0.08], [0.03, 0.14], [0.016, 0.18], [0.02, 0.21], [0.014, 0.235], [0, 0.24]], s.material('#f1ede2', { roughness: 0.25 }), [px - 0.11, 0, 0.09]);
      for (const y of [0.165, 0.18]) mount.ring(0.0185, 0.003, [px - 0.11, y, 0.09], s.material('#b3202a')).rotation.x = Math.PI / 2;
      const ballTone = ['#1c1c22', '#6a1f2a', '#1f3a6a', '#2f5a3a'][Math.floor(random() * 4)];
      mount.ball([0.075, 0.075, 0.075], [px + 0.01, 0.075, 0.09], s.material(ballTone, { roughness: 0.12 }), 22);
      for (const [x, y] of [[-0.012, 0.06], [0.012, 0.06], [0, 0.04]]) mount.ball([0.007, 0.007, 0.004], [px + 0.01 + x, 0.075 + y * 0.5 + 0.02, 0.09 + 0.068], s.material('#050505'), 6);
    }

    // What hangs with it (wall coordinates).
    if (a.beside === 'light') {
      const y = mountY + Math.max(plaqueH / 2, a.trophy === 'antlers' ? 0.5 * k + 0.1 : a.trophy === 'bowling' ? 0.46 : 0) + 0.12;
      s.cylinder(0.03, 0.03, 0.012, [0, y, 0.006], brass, 14).rotation.x = Math.PI / 2;
      s.tube([[0, y, 0.01], [0, y + 0.05, 0.08], [0, y + 0.03, 0.17]], 0.006, brass);
      s.cylinder(0.022, 0.022, 0.3, [0, y + 0.03, 0.17], brass, 14).rotation.z = Math.PI / 2;
      s.box([0.28, 0.006, 0.026], [0, y + 0.012, 0.17], new THREE.MeshStandardMaterial({ color: '#fff0c2', emissive: '#ffd27a', emissiveIntensity: 2 }));
      const pool = s.mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshStandardMaterial({ color: '#ffd89a', emissive: '#ffc56a', emissiveIntensity: 0.5, transparent: true, opacity: 0.1, depthWrite: false }), [0, mountY + 0.04, 0.003]);
      pool.castShadow = false;
    } else if (a.beside === 'rod') {
      const y = Math.min(H - 0.12, mountY + Math.max(plaqueH / 2, a.trophy === 'antlers' ? 0.6 * k : a.trophy === 'bowling' ? 0.48 : 0) + 0.12), half = W / 2 - 0.06;
      for (const x of [-half * 0.55, half * 0.55]) s.tube([[x, y - 0.01, 0], [x, y - 0.03, 0.04], [x, y - 0.01, 0.06], [x, y + 0.01, 0.055]], 0.004, brass);
      s.rod([-half, y, 0.04], [half * 0.3, y, 0.04], 0.007, s.material('#2a2a2e', { roughness: 0.3 }), 0.004);
      s.rod([half * 0.3, y, 0.04], [half, y, 0.04], 0.004, s.material('#2a2a2e', { roughness: 0.3 }), 0.0015);
      s.rod([-half, y, 0.04], [-half + 0.2, y, 0.04], 0.013, s.material('#b8905a', { roughness: 0.9 }));
      s.cylinder(0.032, 0.032, 0.03, [-half + 0.24, y - 0.04, 0.04], s.material('#8d1f1f', { metalness: 0.5, roughness: 0.3 }), 16).rotation.x = Math.PI / 2;
      s.rod([-half + 0.24, y - 0.04, 0.055], [-half + 0.27, y - 0.07, 0.07], 0.003, brass);
      for (let i = 0; i < 4; i++) s.ring(0.008, 0.0015, [mix(-half + 0.4, half, i / 3), y - 0.01, 0.04], brass).rotation.y = Math.PI / 2;
      s.rod([half, y - 0.01, 0.04], [half - 0.02, y - 0.2, 0.04], 0.0012, s.material('#e9e9e9'));
      s.ball([0.02, 0.024, 0.02], [half - 0.02, y - 0.22, 0.04], s.material('#d92a1c', { roughness: 0.3 }), 10);
      s.ball([0.0205, 0.012, 0.0205], [half - 0.02, y - 0.228, 0.04], s.material('#f4f1e8', { roughness: 0.3 }), 10);
    } else if (a.beside === 'photo') {
      const snap = paint(96, 120, (ctx, w, h) => {
        ctx.fillStyle = '#e9e2cc'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9fb3b0'; ctx.fillRect(8, 8, w - 16, 54); ctx.fillStyle = '#8a8f5a'; ctx.fillRect(8, 62, w - 16, 34);
        ctx.fillStyle = '#b5553a'; ctx.fillRect(38, 46, 20, 40); ctx.fillStyle = '#e3bd96'; ctx.beginPath(); ctx.arc(48, 38, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#4a5a2c'; ctx.beginPath(); ctx.ellipse(70, 62, 6, 16, 0.1, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(210,150,60,0.22)'; ctx.fillRect(0, 0, w, h);
      });
      const x = W / 2 - 0.15, y = 0.34 + random() * 0.06;
      const tilt = (random() - 0.5) * 0.12;
      s.box([0.2, 0.25, 0.018], [x, y, 0.009], trim).rotation.z = tilt;
      s.mesh(new THREE.PlaneGeometry(0.165, 0.21), new THREE.MeshStandardMaterial({ map: snap, roughness: 0.4 }), [x, y, 0.0185]).rotation.z = tilt;
    } else if (a.beside === 'calendar') {
      const page = paint(128, 192, (ctx, w, h) => {
        ctx.fillStyle = '#efe8d2'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7fa3b5'; ctx.fillRect(6, 6, w - 12, 78); ctx.fillStyle = '#5a7a3a'; ctx.fillRect(6, 56, w - 12, 28); ctx.fillStyle = '#b3202a'; ctx.fillRect(44, 36, 30, 26); ctx.fillStyle = '#efe8d2'; ctx.fillRect(52, 24, 12, 14);
        ctx.fillStyle = '#b3202a'; ctx.fillRect(6, 90, w - 12, 18);
        ctx.fillStyle = '#3a342c'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) ctx.fillRect(10 + c * 16.5, 116 + r * 14, 8, 6);
      });
      const x = -W / 2 + 0.15, y = 0.36;
      s.mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ map: page, roughness: 0.8, side: THREE.DoubleSide }), [x, y, 0.006]).rotation.set(0.02, 0, (random() - 0.5) * 0.08);
      s.ball([0.006, 0.006, 0.006], [x, y + 0.155, 0.006], brass, 6);
    }

    return s.finish();
  },
});

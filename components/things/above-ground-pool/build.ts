import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = readonly [number, number, number];
const TAU = Math.PI * 2;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('What state is the pool in?', {
      sparkling: 'Full to the brim and sparkling blue, ready for the afternoon.',
      filling: 'Being filled for the first day of summer: a third full, the hose running.',
      green: 'Neglected: the water has turned swamp green and is covered in leaves.',
      covered: 'Closed for winter under a sagging tarp weighed down with puddles.',
      collapsed: 'One side has buckled and folded flat; the water is gone and the liner lies in the mud.',
    }),
    wall: choice('What is printed on the steel wall?', {
      'blue-wave': 'White with a band of blue waves, the classic catalogue pool.',
      'faux-wood': 'Printed fake redwood planks.',
      pebble: 'A tan pebble-stone print.',
      plain: 'Plain cream enamel.',
      turquoise: 'Turquoise panels with white trim.',
    }),
    size: score('How big is the pool?', ['A waist-deep splash pool one stride across', 'A family pool', 'The biggest one the store sold']),
    floating: choice('What floats in it, or lies beside it if there is no water?', {
      ring: 'A red and white striped swim ring.',
      duck: 'A yellow duck ring.',
      lilo: 'A striped air mattress.',
      'beach-ball': 'A beach ball.',
      noodles: 'A few foam pool noodles.',
      nothing: 'Nothing.',
    }),
    access: choice('How do you get in?', {
      'a-frame': 'A steel A-frame ladder straddling the wall.',
      deck: 'A small home-built wooden deck with steps.',
      crate: 'No ladder, just a milk crate to step on.',
    }),
    beside: choice('What else stands beside it?', {
      pump: 'A filter pump tank with its hoses.',
      chemicals: 'A bucket of chlorine tablets and a leaf skimmer on a pole.',
      towels: 'Towels drying over the top rail.',
      nothing: 'Nothing else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = mix(1.25, 2.7, a.size), H = mix(0.72, 1.32, a.size);
    const collapsed = a.state === 'collapsed';
    const fallAt = 0.5; // the direction of the buckle, front right
    const collapse = (theta: number) => { if (!collapsed) return 0; let d = Math.abs(theta - fallAt) % TAU; if (d > Math.PI) d = TAU - d; return smooth(1 - d / 1.35); };
    const wallPoint = (theta: number, v: number, inset = 0): P => {
      const c = collapse(theta);
      const ripple = collapsed ? Math.sin(theta * 9) * 0.05 * smooth(c * 3) : 0;
      const r = R - inset + c * v * (0.75 + ripple * 3) + ripple * v;
      return [Math.cos(theta) * r, Math.max(0.012 + inset, H * v * (1 - 0.93 * c)) , Math.sin(theta) * r];
    };
    const wallGeometry = (inset: number) => {
      const seg = 72, rows = 5, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= seg; i++) for (let j = 0; j <= rows; j++) { positions.push(...wallPoint(i / seg * TAU, j / rows, inset)); uvs.push(i / seg, j / rows); }
      for (let i = 0; i < seg; i++) for (let j = 0; j < rows; j++) { const p = i * (rows + 1) + j, q = p + rows + 1; index.push(p, p + 1, q, q, p + 1, q + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    };

    const panels = Math.max(8, Math.round(R * TAU / 1.1));
    const skin = canvasTexture(1024, 256, (c) => {
      const base = { 'blue-wave': '#f1f0e8', 'faux-wood': '#9a5a34', pebble: '#c9b48e', plain: '#ebe5cf', turquoise: '#2fb0b4' }[a.wall];
      c.fillStyle = base; c.fillRect(0, 0, 1024, 256);
      if (a.wall === 'blue-wave') {
        c.fillStyle = '#2f79c2'; c.beginPath(); c.moveTo(0, 150);
        for (let x = 0; x <= 1024; x += 8) c.lineTo(x, 120 + Math.sin(x / 1024 * TAU * 16) * 22);
        c.lineTo(1024, 210); c.lineTo(0, 210); c.fill();
        c.fillStyle = '#7fc0ea'; c.beginPath(); c.moveTo(0, 190);
        for (let x = 0; x <= 1024; x += 8) c.lineTo(x, 172 + Math.sin(x / 1024 * TAU * 16 + 1.4) * 14);
        c.lineTo(1024, 215); c.lineTo(0, 215); c.fill();
      } else if (a.wall === 'faux-wood') {
        for (let x = 0; x < 1024; x += 32) { c.fillStyle = `hsl(${18 + random() * 8},${45 + random() * 10}%,${30 + random() * 12}%)`; c.fillRect(x, 0, 30, 256); }
      } else if (a.wall === 'pebble') {
        for (let i = 0; i < 900; i++) { c.fillStyle = `hsl(${28 + random() * 14},${18 + random() * 20}%,${48 + random() * 30}%)`; c.beginPath(); c.ellipse(random() * 1024, random() * 256, 6 + random() * 10, 5 + random() * 6, random() * 3, 0, 7); c.fill(); }
      } else if (a.wall === 'turquoise') {
        c.fillStyle = '#f1f0e8'; c.fillRect(0, 0, 1024, 26); c.fillRect(0, 230, 1024, 26);
        for (let x = 0; x < 1024; x += 1024 / panels / 2) c.fillRect(x, 0, 5, 256);
      }
      // Rust weeping down from the top rail and up from the ground.
      for (let i = 0; i < mood.wear * 140; i++) {
        const x = random() * 1024, top = random() < 0.5;
        const g = c.createLinearGradient(0, top ? 0 : 256, 0, top ? 60 + random() * 120 : 256 - 30 - random() * 60);
        g.addColorStop(0, 'rgba(122,62,24,0.75)'); g.addColorStop(1, 'rgba(122,62,24,0)');
        c.fillStyle = g; c.fillRect(x, 0, 4 + random() * 16, 256);
      }
      if (mood.wear > 0.3) { c.fillStyle = `rgba(90,110,60,${mood.wear * 0.3})`; c.fillRect(0, 225, 1024, 31); }
    });
    skin.repeat.set(1, -1); skin.offset.set(0, 1);
    const trimColour = { 'blue-wave': '#f4f2ea', 'faux-wood': '#c9b48a', pebble: '#e9e0c8', plain: '#d9d2bc', turquoise: '#f4f2ea' }[a.wall];
    const trim = s.material(trimColour, { roughness: 0.5, metalness: 0.2 });
    const linerColour = new THREE.Color('#3aa4d8').lerp(new THREE.Color('#9db8bd'), mood.wear * 0.5);
    const liner = new THREE.MeshStandardMaterial({ color: linerColour, roughness: 0.6, side: THREE.DoubleSide });
    s.mesh(wallGeometry(0), new THREE.MeshStandardMaterial({ map: skin, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide }));
    s.mesh(wallGeometry(0.02), liner);
    // Top rail, following the wall even where it has folded.
    const railPoints = Array.from({ length: 64 }, (_u, i) => { const p = wallPoint(i / 64 * TAU, 1); return [p[0] * (1 + 0.012), p[1] + 0.02, p[2] * (1 + 0.012)] as P; });
    const rail = s.tube(railPoints, 0.055, trim, true);

    // Uprights with caps; the ones in the buckle lie flat.
    for (let i = 0; i < panels; i++) {
      const theta = (i + 0.5) / panels * TAU, c = collapse(theta);
      const post = new Sculpture(context);
      post.box([0.13, H, 0.035], [0, H / 2, 0], trim);
      post.box([0.2, 0.05, 0.13], [0, H + 0.03, -0.03], trim);
      post.root.position.set(Math.cos(theta) * (R + 0.02), 0, Math.sin(theta) * (R + 0.02));
      post.root.rotation.y = -theta + Math.PI / 2;
      if (c > 0.12) post.root.rotateX(c * 1.5 + (random() - 0.5) * 0.2);
      else post.root.rotateX((random() - 0.5) * mood.wear * 0.08);
      s.root.add(post.root);
    }
    s.mesh(new THREE.CircleGeometry(R - 0.03, 48).rotateX(-Math.PI / 2), liner, [0, 0.015, 0]);

    // Water, tarp, or what is left.
    const bobbers: { node: THREE.Object3D; y: number; phase: number }[] = [];
    let level = 0;

    const leafColours = ['#8a5a22', '#b07a2a', '#6a4a1e', '#a34a22', '#c9a23a'];
    const strew = (count: number, y: number, radius: number, cx = 0, cz = 0) => {
      if (count <= 0) return;
      const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(random()) * radius, th = random() * TAU;
        e.set(-Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * TAU);
        const size = 0.7 + random() * 1.3;
        m.compose(new THREE.Vector3(cx + Math.cos(th) * r, y + random() * 0.006, cz + Math.sin(th) * r), q.setFromEuler(e), new THREE.Vector3(size, size * 0.6, size));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(leafColours[Math.floor(random() * leafColours.length)]));
      }
      mesh.receiveShadow = true;
      s.root.add(mesh);
    };

    if (a.state === 'sparkling' || a.state === 'filling' || a.state === 'green') {
      level = H * (a.state === 'filling' ? 0.36 : a.state === 'green' ? mix(0.8, 0.55, mood.wear) : 0.9);
      const colour = a.state === 'green' ? new THREE.Color('#5f7a2c').lerp(new THREE.Color('#3c4a1e'), mood.wear * 0.6) : new THREE.Color('#35b8e6').lerp(new THREE.Color('#58c4c8'), mood.wear * 0.4);
      const water = new THREE.MeshStandardMaterial({ color: colour, roughness: a.state === 'green' ? 0.45 : 0.06, metalness: 0.15, emissive: colour, emissiveIntensity: a.state === 'green' ? 0.02 : mix(0.08, 0.3, mood.cheer) });
      s.mesh(new THREE.CircleGeometry(R - 0.025, 48).rotateX(-Math.PI / 2), water, [0, level, 0]);
      if (a.state !== 'green') {
        // Sun glints: thin pale crescents riding the surface.
        const glints = Array.from({ length: Math.round(R * R * 5) }, () => { const r = Math.sqrt(random()) * (R - 0.25), th = random() * TAU; return { at: [Math.cos(th) * r, level + 0.004, Math.sin(th) * r] as P, size: 0.5 + random() }; });
        const glint = s.scatter(new THREE.BoxGeometry(0.22, 0.002, 0.03), new THREE.MeshStandardMaterial({ color: '#eaffff', emissive: '#c8f4ff', emissiveIntensity: 0.6, roughness: 0.1 }), glints);
        glint.castShadow = false;
        strew(Math.round(mood.wear * 14), level + 0.004, R - 0.2);
      } else {
        strew(Math.round(mix(30, 110, mood.density) * R / 2), level + 0.004, R - 0.12);
        // Scum collecting against the wall.
        s.ring(R - 0.09, 0.05, [0, level - 0.03, 0], s.material('#8a9a4a', { roughness: 1 })).rotation.x = Math.PI / 2;
      }
    } else if (a.state === 'covered') {
      const tarpColour = mood.cheer > 0.55 ? '#2f6fb8' : mood.cheer > 0.3 ? '#3f6f5a' : '#7d8388';
      const g = new THREE.CircleGeometry(R + 0.14, 48, 0, TAU);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i)) / R;
        p.setY(i, r > 1 ? -(r - 1) * 2.2 : -Math.cos(r * Math.PI / 2) * mix(0.18, 0.4, mood.wear));
      }
      // Rebuild as a finer disc so the sag reads.
      const fine = new THREE.RingGeometry(0.001, R + 0.16, 48, 8).rotateX(-Math.PI / 2);
      const fp = fine.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        const x = fp.getX(i), z = fp.getZ(i), r = Math.hypot(x, z) / R;
        fp.setY(i, r > 1 ? -(r - 1) * 2.4 : -Math.pow(Math.cos(r * Math.PI / 2), 0.8) * mix(0.16, 0.38, mood.wear) + Math.sin(x * 3.1) * Math.cos(z * 2.7) * 0.03);
      }
      fine.computeVertexNormals();
      g.dispose();
      s.mesh(fine, new THREE.MeshStandardMaterial({ color: tarpColour, roughness: 0.75, side: THREE.DoubleSide }), [0, H + 0.085, 0]);
      const puddleY = H + 0.085 - mix(0.16, 0.38, mood.wear) + 0.035;
      s.mesh(new THREE.CircleGeometry(R * 0.42, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#56664a', roughness: 0.1, metalness: 0.2 }), [0, puddleY, 0]);
      strew(Math.round(mix(8, 50, mood.density)), puddleY + 0.006, R * 0.42);
      // Water jugs hung round the edge to hold it down.
      const jugs = Array.from({ length: Math.round(panels * 0.6) }, (_u, i) => { const th = (i + random() * 0.4) / Math.round(panels * 0.6) * TAU; return { at: [Math.cos(th) * (R + 0.14), H * 0.62, Math.sin(th) * (R + 0.14)] as P, size: 1 }; });
      s.scatter(new THREE.CylinderGeometry(0.07, 0.08, 0.24, 10), s.material('#e9eef0', { roughness: 0.35 }), jugs);
      for (const jug of jugs) s.rod([jug.at[0] * 0.98, H + 0.02, jug.at[2] * 0.98], [jug.at[0], H * 0.62 + 0.12, jug.at[2]], 0.006, s.material('#d8c98a'));
    } else {
      // Collapsed: a puddle in the wrinkled liner and a fan of wet mud where it all went.
      s.mesh(new THREE.CircleGeometry(R * 0.5, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6f8a6a', roughness: 0.12, metalness: 0.2 }), [-R * 0.25, 0.03, -R * 0.1]);
      const mud = s.mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), s.material('#6a5238', { roughness: 0.5 }), [Math.cos(fallAt) * (R + 1.0), 0.008, Math.sin(fallAt) * (R + 1.0)]);
      mud.scale.set(R * 0.75, 1, R * 0.95);
      mud.rotation.y = -fallAt;
      mud.castShadow = false;
      strew(Math.round(mix(6, 30, mood.density)), 0.035, R * 0.8);
    }

    // The float.
    if (a.floating !== 'nothing' && a.state !== 'covered') {
      const f = new Sculpture(context);
      const limp = a.state === 'green' ? 0.55 : collapsed ? 0.4 : 1;
      if (a.floating === 'ring' || a.floating === 'duck') {
        const stripes = canvasTexture(64, 8, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = a.floating === 'duck' ? '#f6cf2a' : i % 2 ? '#f4f1e6' : '#d8322c'; c.fillRect(i * 8, 0, 8, 8); } });
        const ring = f.mesh(new THREE.TorusGeometry(0.3, 0.1, 10, 28), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.35 }));
        ring.rotation.x = Math.PI / 2;
        ring.scale.z = limp;
        if (a.floating === 'duck') {
          f.ball([0.11, 0.11, 0.11], [0, 0.22 * limp, 0.3], f.material('#f6cf2a', { roughness: 0.35 }), 14);
          f.mesh(new THREE.ConeGeometry(0.05, 0.12, 8).rotateX(Math.PI / 2), f.material('#f08a1e'), [0, 0.2 * limp, 0.43]);
          for (const x of [-0.05, 0.05]) f.ball([0.018, 0.018, 0.018], [x, 0.27 * limp, 0.38], f.material('#111111'), 8);
        }
      } else if (a.floating === 'lilo') {
        const cols = mood.cheer > 0.5 ? ['#f2c230', '#2fa6d8'] : ['#d8d4c4', '#5a7a9a'];
        for (let i = 0; i < 6; i++) { const tube = f.cylinder(0.065, 0.065, 1.7, [(i - 2.5) * 0.12, 0.02, 0], f.material(cols[i % 2], { roughness: 0.4 }), 10); tube.rotation.x = Math.PI / 2; tube.scale.y = 1; tube.scale.x = 1; tube.scale.z = limp; }
        f.cylinder(0.09, 0.09, 0.7, [0, 0.05 * limp, -0.8], f.material(cols[0], { roughness: 0.4 }), 10).rotation.z = Math.PI / 2;
      } else if (a.floating === 'beach-ball') {
        const gores = canvasTexture(96, 8, (c) => { ['#e8322c', '#f4f1e6', '#f2c230', '#f4f1e6', '#2f7fd8', '#f4f1e6'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 16, 0, 16, 8); }); });
        const ball = f.ball([0.24, 0.24 * mix(0.5, 1, limp), 0.24], [0, 0.17 * limp, 0], new THREE.MeshStandardMaterial({ map: gores, roughness: 0.3 }), 20);
        ball.rotation.set(0.5, random() * 3, 0.4);
      } else {
        ['#f04a8a', '#3fd0a0', '#f2c230', '#6a5ae0'].slice(0, 2 + Math.round(mood.density * 2)).forEach((col, i) => {
          const bend = (random() - 0.5) * 0.5;
          f.tube([[-0.7, 0.01, i * 0.2 - 0.2], [0, 0.01, i * 0.2 - 0.2 + bend], [0.7, 0.01, i * 0.2 - 0.2 - bend * 0.5]], 0.04, f.material(col, { roughness: 0.6 })).rotation.y = (random() - 0.5) * 1.4;
        });
      }
      const node = new THREE.Group();
      node.add(f.root);
      if (collapsed) node.position.set(Math.cos(fallAt + 0.25) * (R + 1.15), 0.06, Math.sin(fallAt + 0.25) * (R + 1.15));
      else { const r = R * 0.45 * random(), th = random() * TAU; node.position.set(Math.cos(th) * r, level + 0.02, Math.sin(th) * r); bobbers.push({ node, y: level + 0.02, phase: random() * 6 }); }
      node.rotation.y = random() * TAU;
      s.root.add(node);
    }

    // The way in, front left.
    const gate = 2.35;
    const way = new Sculpture(context);
    if (a.access === 'a-frame') {
      const steel = way.material('#e6e8e6', { metalness: 0.5, roughness: 0.4 });
      const topY = H + 0.42;
      for (const z of [-0.24, 0.24]) {
        way.rod([0.62, 0, z], [0.08, topY, z], 0.022, steel);
        way.rod([-0.55, 0.05, z], [-0.08, topY, z], 0.022, steel);
        way.tube([[0.2, topY - 0.3, z], [0.12, topY + 0.3, z], [-0.12, topY + 0.3, z], [-0.2, topY - 0.3, z]], 0.018, steel);
      }
      const steps = Math.max(2, Math.round(H / 0.3));
      for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 0.6);
        way.box([0.1, 0.03, 0.5], [0.62 - 0.54 * t, topY * t, 0], steel);
        way.box([0.1, 0.03, 0.5], [-0.55 + 0.47 * t, 0.05 + (topY - 0.05) * t, 0], steel);
      }
      way.box([0.3, 0.035, 0.5], [0, topY, 0], steel);
    } else if (a.access === 'deck') {
      const wood = way.material(mood.wear > 0.5 ? '#9a917c' : '#b0834e', { roughness: 0.95 });
      way.box([1.2, 0.06, 1.3], [0.68, H + 0.03, 0], wood);
      for (const x of [0.14, 1.22]) for (const z of [-0.6, 0.6]) way.box([0.09, H + 0.9, 0.09], [x, (H + 0.9) / 2, z], wood);
      for (const z of [-0.6, 0.6]) way.box([1.2, 0.06, 0.06], [0.68, H + 0.85, z], wood);
      const steps = Math.max(2, Math.round(H / 0.22));
      for (let i = 0; i < steps; i++) way.box([0.26, 0.05, 0.8], [1.4 + (steps - 1 - i) * 0.26, (i + 1) * H / (steps + 1), 0], wood);
      
    } else {
      const crate = way.material(mood.cheer > 0.5 ? '#2f6fd0' : '#c8342c', { roughness: 0.6 });
      way.box([0.36, 0.3, 0.36], [0.35, 0.15, 0], crate);
      for (let i = 0; i < 3; i++) way.box([0.37, 0.03, 0.37], [0.35, 0.06 + i * 0.09, 0], way.material('#1c1c1c'));
    }
    way.root.position.set(Math.cos(gate) * R, 0, Math.sin(gate) * R);
    way.root.rotation.y = -gate;
    s.root.add(way.root);

    // The hose: across the yard, up and over the rail.
    const hoseAt = 1.35, hx = Math.cos(hoseAt), hz = Math.sin(hoseAt);
    const top = wallPoint(hoseAt, 1);
    const hoseMaterial = s.material('#3f8a45', { roughness: 0.6 });
    s.tube([[hx * (R + 1.9) + 0.5, 0.025, hz * (R + 1.9)], [hx * (R + 1.5) - 0.4, 0.025, hz * (R + 1.5) + 0.2], [hx * (R + 1.0) + 0.3, 0.025, hz * (R + 1.0)], [hx * (R + 0.45), 0.025, hz * (R + 0.45)], [hx * (R + 0.13), Math.max(0.03, top[1] * 0.6), hz * (R + 0.13)], [top[0] * 1.02, top[1] + 0.1, top[2] * 1.02], [hx * (R - 0.14), Math.max(0.05, top[1] - 0.1), hz * (R - 0.14)], [hx * (R - 0.16), Math.max(0.03, top[1] - 0.32), hz * (R - 0.16)]], 0.021, hoseMaterial);
    s.cylinder(0.026, 0.03, 0.08, [hx * (R - 0.16), Math.max(0.03, top[1] - 0.36), hz * (R - 0.16)], s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), 10);
    // A coil at the far end.
    for (let i = 0; i < 3; i++) s.ring(0.2 + i * 0.012, 0.021, [hx * (R + 1.9) + 0.5 + 0.2, 0.025 + i * 0.04, hz * (R + 1.9)], hoseMaterial).rotation.x = Math.PI / 2;
    if (a.state === 'filling') s.rod([hx * (R - 0.16), top[1] - 0.4, hz * (R - 0.16)], [hx * (R - 0.2), level, hz * (R - 0.2)], 0.014, new THREE.MeshStandardMaterial({ color: '#d6f4ff', emissive: '#a8e4ff', emissiveIntensity: 0.5, roughness: 0.1 }));

    const sideAt = -0.55, sx = Math.cos(sideAt), sz = Math.sin(sideAt);
    if (a.beside === 'pump') {
      const tank = s.material('#3a5f9a', { roughness: 0.45 });
      s.cylinder(0.2, 0.2, 0.42, [sx * (R + 0.6), 0.27, sz * (R + 0.6)], tank, 18);
      s.ball([0.2, 0.09, 0.2], [sx * (R + 0.6), 0.48, sz * (R + 0.6)], s.material('#22262a'), 16);
      s.box([0.34, 0.06, 0.6], [sx * (R + 0.6), 0.03, sz * (R + 0.6) + 0.12], s.material('#22262a'));
      s.cylinder(0.09, 0.09, 0.26, [sx * (R + 0.6), 0.15, sz * (R + 0.6) + 0.34], s.material('#55595e', { metalness: 0.5 }), 12).rotation.x = Math.PI / 2;
      const pipe = s.material('#e9e6da', { roughness: 0.5 });
      for (const dy of [0.2, 0.42]) s.tube([[sx * (R + 0.42), dy, sz * (R + 0.6)], [sx * (R + 0.25), dy + 0.12, sz * (R + 0.35)], [sx * (R + 0.02), Math.min(H * 0.7, dy + 0.3), sz * (R + 0.02)]], 0.03, pipe);
    } else if (a.beside === 'chemicals') {
      s.cylinder(0.15, 0.13, 0.32, [sx * (R + 0.5), 0.16, sz * (R + 0.5)], s.material('#f1eee4', { roughness: 0.45 }), 16);
      s.cylinder(0.155, 0.155, 0.04, [sx * (R + 0.5), 0.33, sz * (R + 0.5)], s.material('#2f6fd0'), 16);
      s.rod([sx * (R + 0.9), 0.02, sz * (R + 0.9) + 0.3], [sx * (R + 0.06), H + 0.12, sz * (R + 0.06) - 0.4], 0.014, s.material('#c9ced0', { metalness: 0.7 }));
      const net = s.ring(0.19, 0.012, [sx * (R + 0.98), 0.03, sz * (R + 0.98) + 0.42], s.material('#2f6fd0'));
      net.rotation.x = Math.PI / 2;
    } else if (a.beside === 'towels') {
      const cols = ['#f2c230', '#e8572f', '#2fa6b8', '#f4f1e6', '#e86aa8'];
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const th = sideAt + i * 0.34;
        const pt = wallPoint(th, 1);
        if (collapse(th) > 0.1) continue;
        const towel = new Sculpture(context);
        const cloth = towel.material(cols[(i + Math.floor(random() * 5)) % cols.length], { roughness: 0.95 });
        towel.box([0.5, 0.03, 0.2], [0, 0.085, 0], cloth);
        towel.box([0.5, 0.5 + random() * 0.2, 0.025], [0, -0.2, 0.09], cloth);
        towel.box([0.5, 0.3, 0.025], [0, -0.08, -0.09], cloth);
        towel.root.position.set(pt[0], pt[1], pt[2]);
        towel.root.rotation.y = -th + Math.PI / 2;
        s.root.add(towel.root);
      }
    }
    // Leaves blown against the outside of the wall.
    strew(Math.round(mood.wear * mood.density * 40), 0.01, R + 0.7);

    const swell = mix(0.004, 0.035, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const b of bobbers) { b.node.position.y = b.y + Math.sin(time * 1.8 + b.phase) * swell; b.node.rotation.x = Math.sin(time * 1.3 + b.phase) * swell * 3; b.node.rotation.z = Math.cos(time * 1.1 + b.phase) * swell * 3; }
      },
    });
  },
});

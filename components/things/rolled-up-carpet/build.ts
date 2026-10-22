import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const PALETTES = {
  reds: ['#8f2a24', '#1f2e52', '#ead9b4', '#c48a3c'],
  blues: ['#2f4f7c', '#7c2f2c', '#e6e0cf', '#9fb3c4'],
  golds: ['#c2922f', '#4f6a3a', '#f0e4c0', '#8a4a22'],
  creams: ['#e2d7bd', '#8f7f66', '#f3ecda', '#b8a480'],
  browns: ['#8a4a1f', '#d98a2b', '#f0dfb4', '#3d2616'],
} as const;

export default defineThing({
  questions: {
    pattern: choice('What kind of carpet is it?', {
      persian: 'A Persian-style rug: a medallion on a dense field inside nested borders, with a fringe.',
      floral: 'A mid-century floral Axminster, cabbage roses on a soft ground.',
      shag: 'A plain deep shag pile, fat and lumpy when rolled.',
      plain: 'A plain wool carpet square with a bound edge.',
      seventies: 'Concentric rounded shapes in bold bands, straight from the 1970s.',
    }),
    colours: choice('What are its colours?', {
      reds: 'Deep red and navy with cream.',
      blues: 'Faded blue with brick and ivory.',
      golds: 'Old gold and moss green.',
      creams: 'Creams, oatmeal and stone.',
      browns: 'Brown, burnt orange and custard.',
    }),
    pose: choice('How has it been left?', {
      floor: 'Lying across the floor, rolled tight.',
      half: 'Half unrolled, the pattern lying open one last time.',
      standing: 'Stood on end, its top slumping over.',
      pair: 'Lying beside the grey roll of its underlay.',
    }),
    tie: choice('What holds it rolled?', {
      twine: 'Garden twine in three places, tied in bows.',
      tape: 'Bands of brown parcel tape.',
      straps: 'Two old leather luggage straps with buckles.',
      loose: 'Nothing: it is starting to relax and open.',
    }),
    facing: choice('Which side is outward?', {
      backing: 'Rolled pattern-in, so only the pale woven backing shows outside.',
      pattern: 'Rolled pattern-out, the colours wrapped round the outside.',
    }),
    ghost: choice('What did it leave on the floor where it lay?', {
      pale: 'A paler rectangle of clean boards the sun never reached.',
      dark: 'A darker, richer rectangle: the rest of the floor has bleached around it.',
      dust: 'Only an outline in dust and grit.',
      underlay: 'Its crumbling felt underlay, still lying there.',
      none: 'Nothing visible.',
    }),
    size: choice('How big is it?', {
      runner: 'A hallway runner, a short slim roll.',
      room: 'A living-room rug, as long as a person is tall.',
      grand: 'A huge heavy carpet that takes two to carry.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.colours];
    const L = { runner: 0.85, room: 1.75, grand: 2.5 }[a.size] * mix(0.94, 1.06, random());
    const R = { runner: 0.085, room: 0.13, grand: 0.185 }[a.size] * (a.pattern === 'shag' ? 1.35 : 1) * (a.tie === 'loose' ? 1.12 : 1);
    const span = L * (a.size === 'runner' ? 2.6 : 1.35);
    const backing = '#b9a27a';

    const canvas = (w: number, h: number, draw: (c: Ctx) => void) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };
    const drawRug = (c: Ctx, w: number, h: number) => {
      const [field, second, light, accent] = pal;
      c.fillStyle = field; c.fillRect(0, 0, w, h);
      if (a.pattern === 'persian') {
        const bands = [[second, 0.03], [light, 0.075], [accent, 0.095], [second, 0.11]] as const;
        c.fillStyle = second; c.fillRect(0, 0, w, h);
        c.fillStyle = light; c.fillRect(w * 0.025, h * 0.03, w * 0.95, h * 0.94);
        c.fillStyle = second; c.fillRect(w * 0.04, h * 0.05, w * 0.92, h * 0.9);
        for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? accent : light; const t = i / 40; c.fillRect(w * (0.05 + t * 0.9), h * 0.06, w * 0.012, h * 0.03); c.fillRect(w * (0.05 + t * 0.9), h * 0.91, w * 0.012, h * 0.03); }
        for (let i = 0; i < 28; i++) { c.fillStyle = i % 2 ? accent : light; const t = i / 28; c.fillRect(w * 0.05, h * (0.1 + t * 0.8), w * 0.022, h * 0.016); c.fillRect(w * 0.928, h * (0.1 + t * 0.8), w * 0.022, h * 0.016); }
        c.fillStyle = field; c.fillRect(w * 0.085, h * 0.11, w * 0.83, h * 0.78);
        for (let i = 0; i < 90; i++) { c.fillStyle = [second, light, accent][i % 3]; const x = w * (0.1 + random() * 0.8), y = h * (0.13 + random() * 0.74); c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 5, y); c.lineTo(x, y + 7); c.lineTo(x - 5, y); c.fill(); }
        const diamond = (rx: number, ry: number, col: string) => { c.fillStyle = col; c.beginPath(); c.moveTo(w / 2, h / 2 - ry); c.lineTo(w / 2 + rx, h / 2); c.lineTo(w / 2, h / 2 + ry); c.lineTo(w / 2 - rx, h / 2); c.fill(); };
        diamond(w * 0.26, h * 0.3, second); diamond(w * 0.21, h * 0.24, light); diamond(w * 0.16, h * 0.18, accent); diamond(w * 0.09, h * 0.1, field);
        for (const [cx, cy] of [[0.085, 0.11], [0.915, 0.11], [0.085, 0.89], [0.915, 0.89]]) { c.fillStyle = second; c.beginPath(); c.arc(w * cx, h * cy, w * 0.11, 0, 7); c.fill(); c.fillStyle = light; c.beginPath(); c.arc(w * cx, h * cy, w * 0.06, 0, 7); c.fill(); }
        void bands;
      } else if (a.pattern === 'floral') {
        c.fillStyle = light; c.fillRect(0, 0, w, h);
        c.fillStyle = second; c.fillRect(0, 0, w, h * 0.05); c.fillRect(0, h * 0.95, w, h * 0.05); c.fillRect(0, 0, w * 0.04, h); c.fillRect(w * 0.96, 0, w * 0.04, h);
        for (let i = 0; i < 46; i++) {
          const x = w * (0.08 + random() * 0.84), y = h * (0.1 + random() * 0.8), r = 14 + random() * 12;
          c.fillStyle = '#5d7a4a'; for (let p = 0; p < 3; p++) { c.beginPath(); c.ellipse(x + Math.cos(p * 2.1 + i) * r * 1.2, y + Math.sin(p * 2.1 + i) * r * 1.2, r * 0.8, r * 0.36, p * 2.1 + i, 0, 7); c.fill(); }
          c.fillStyle = i % 3 ? field : accent; for (let p = 0; p < 6; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.05) * r * 0.5, y + Math.sin(p * 1.05) * r * 0.5, r * 0.55, 0, 7); c.fill(); }
          c.fillStyle = 'rgba(40,10,10,0.3)'; c.beginPath(); c.arc(x, y, r * 0.35, 0, 7); c.fill();
        }
      } else if (a.pattern === 'seventies') {
        c.fillStyle = light; c.fillRect(0, 0, w, h);
        for (const [cx, cy, big] of [[0.3, 0.42, 0.34], [0.72, 0.6, 0.3]] as const)
          for (let k = 0; k < 5; k++) { c.fillStyle = [field, accent, second, light, field][k]; const r = w * big * (1 - k * 0.19); c.beginPath(); c.roundRect(w * cx - r, h * cy - r * 0.8, r * 2, r * 1.6, r * 0.6); c.fill(); }
      } else if (a.pattern === 'plain') {
        c.fillStyle = second; c.fillRect(0, 0, w, h); c.fillStyle = field; c.fillRect(w * 0.025, h * 0.035, w * 0.95, h * 0.93);
        for (let y = 0; y < h; y += 5) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(0, y, w, 2); }
      } else {
        for (let i = 0; i < 9000; i++) { c.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'; c.fillRect(random() * w, random() * h, 2, 5); }
      }
      for (let i = 0; i < mood.wear * 22; i++) { c.fillStyle = `rgba(70,60,45,${0.08 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 70, 12 + random() * 40, random() * 3, 0, 7); c.fill(); }
      c.fillStyle = `rgba(190,180,160,${mood.wear * 0.22})`; c.fillRect(0, 0, w, h);
    };
    const rugTex = canvas(640, 480, (c) => drawRug(c, 640, 480));
    const outerTex = a.facing === 'pattern' ? rugTex : canvas(512, 256, (c) => {
      c.fillStyle = backing; c.fillRect(0, 0, 512, 256);
      c.globalAlpha = 0.36; drawRug(c, 512, 256); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(80,60,30,0.28)'; c.lineWidth = 1;
      for (let x = 0; x < 512; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      for (let y = 0; y < 256; y += 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
      c.fillStyle = 'rgba(40,28,14,0.75)'; c.fillRect(0, 150, 512, 5);
      c.fillStyle = pal[0]; c.fillRect(0, 155, 512, 9);
      c.fillStyle = pal[2]; for (let x = 0; x < 512; x += 6) c.fillRect(x, 164, 3, 12);
    });
    const endTex = canvas(256, 256, (c) => {
      c.fillStyle = backing; c.beginPath(); c.arc(128, 128, 127, 0, 7); c.fill();
      const turns = a.pattern === 'shag' ? 2.5 : 3.6;
      for (const [col, lw, off] of [[pal[0], 124 / turns * 0.6, 0], [pal[1], 124 / turns * 0.16, 0.0], ['#3a2c1a', 124 / turns * 0.14, 124 / turns * 0.44]] as const) {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
        for (let t = 0; t <= turns * 6.283; t += 0.08) { const r = 8 + (t / (turns * 6.283)) * (118 - 8) + off; const x = 128 + Math.cos(t) * r, y = 128 + Math.sin(t) * r; if (t === 0) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke();
      }
      if (a.pattern !== 'plain' && a.pattern !== 'shag') for (let t = 0; t < turns * 6.283; t += 0.33) { const r = 8 + (t / (turns * 6.283)) * 110; c.fillStyle = pal[2 + (Math.floor(t * 3) % 2)]; c.beginPath(); c.arc(128 + Math.cos(t) * r, 128 + Math.sin(t) * r, 2.6, 0, 7); c.fill(); }
      c.fillStyle = '#2a2018'; c.beginPath(); c.arc(128, 128, 7, 0, 7); c.fill();
    });
    const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, side: THREE.DoubleSide });
    const outerMat = new THREE.MeshStandardMaterial({ map: outerTex, roughness: 1 });
    const endMat = new THREE.MeshStandardMaterial({ map: endTex, roughness: 1, side: THREE.DoubleSide });

    const makeRoll = (points: THREE.Vector3[], radius: number, skin: THREE.Material, cap: THREE.Material, squash = 1) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, points.length > 2 ? 48 : 8, radius, 24, false);
      if (a.pattern === 'shag' && skin === outerMat) {
        const p = geo.attributes.position, n = geo.attributes.normal;
        for (let i = 0; i < p.count; i++) { const j = 0.012 * Math.sin(i * 12.9898) * Math.cos(i * 4.1414); p.setXYZ(i, p.getX(i) + n.getX(i) * j, p.getY(i) + n.getY(i) * j, p.getZ(i) + n.getZ(i) * j); }
      }
      const group = new THREE.Group();
      const tube = new THREE.Mesh(geo, skin); tube.castShadow = tube.receiveShadow = true; group.add(tube);
      const frame = (t: number) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(t));
        return { at: curve.getPointAt(t), q };
      };
      for (const t of [0, 1]) {
        const { at, q } = frame(t);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.995, 28), cap);
        disc.position.copy(at).addScaledVector(curve.getTangentAt(t), t ? 0.002 : -0.002); disc.quaternion.copy(q); group.add(disc);
      }
      group.scale.y = squash;
      return { group, frame, curve };
    };

    const twine = s.material('#c9b27a', { roughness: 1 }), tape = s.material('#8a5a2c', { roughness: 0.5 }), leather = s.material('#5a3520', { roughness: 0.6 }), brass = s.material('#c9a23f', { metalness: 0.8, roughness: 0.3 });
    const bind = (roll: ReturnType<typeof makeRoll>, radius: number) => {
      if (a.tie === 'loose') return;
      const stops = a.tie === 'straps' ? [0.24, 0.76] : a.tie === 'twine' && a.size !== 'runner' ? [0.16, 0.5, 0.84] : [0.22, 0.78];
      for (const stop of stops) {
        const t = stop + (random() - 0.5) * 0.05;
        const { at, q } = roll.frame(t);
        const g = new THREE.Group(); g.position.copy(at); g.quaternion.copy(q); roll.group.add(g);
        const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); return m; };
        if (a.tie === 'twine') {
          add(new THREE.TorusGeometry(radius - 0.004, 0.007, 6, 28), twine);
          add(new THREE.TorusGeometry(radius - 0.004, 0.007, 6, 28), twine).position.z = 0.014;
          const ang = Math.PI / 2 - 0.5;
          for (const side of [-1, 1]) {
            const loop = add(new THREE.TorusGeometry(0.03, 0.005, 6, 14), twine);
            loop.position.set(Math.cos(ang) * (radius + 0.012), Math.sin(ang) * (radius + 0.012), side * 0.03); loop.rotation.set(Math.PI / 2, 0, ang);
            const tail = add(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5), twine);
            tail.position.set(Math.cos(ang - 0.35) * (radius + 0.004), Math.sin(ang - 0.35) * (radius + 0.004), side * 0.012); tail.rotation.z = ang - 0.35 + 0.2 * side;
          }
        } else if (a.tie === 'tape') {
          add(new THREE.CylinderGeometry(radius + 0.003, radius + 0.003, 0.05, 28, 1, true), tape).rotation.x = Math.PI / 2;
        } else {
          add(new THREE.CylinderGeometry(radius + 0.005, radius + 0.005, 0.035, 28, 1, true), leather).rotation.x = Math.PI / 2;
          const ang = Math.PI / 2 - 0.6;
          const buckle = add(new THREE.BoxGeometry(0.012, 0.05, 0.05), brass);
          buckle.position.set(Math.cos(ang) * (radius + 0.008), Math.sin(ang) * (radius + 0.008), 0); buckle.rotation.z = ang;
        }
      }
    };

    // --- what it left behind on the floor
    const gw = L * 1.02, gd = Math.min(span, L * 0.95, 1.9);
    if (a.ghost === 'pale' || a.ghost === 'dark') {
      const ghost = s.mesh(new THREE.PlaneGeometry(gw, gd), new THREE.MeshBasicMaterial({ color: a.ghost === 'pale' ? '#fff6dc' : '#3b2412', transparent: true, opacity: a.ghost === 'pale' ? 0.42 : 0.3, depthWrite: false }), [0, 0.004, 0]);
      ghost.rotation.x = -Math.PI / 2; ghost.castShadow = false;
    } else if (a.ghost === 'dust') {
      const dust = new THREE.MeshBasicMaterial({ color: '#6f675a', transparent: true, opacity: 0.45, depthWrite: false });
      for (const [w, d, x, z] of [[gw, 0.035, 0, gd / 2], [gw, 0.035, 0, -gd / 2], [0.035, gd, gw / 2, 0], [0.035, gd, -gw / 2, 0]] as const) { const m = s.mesh(new THREE.PlaneGeometry(w, d), dust, [x, 0.004, z]); m.rotation.x = -Math.PI / 2; m.castShadow = false; }
      const grit = Array.from({ length: 60 }, () => { const edge = Math.floor(random() * 4), t = random() - 0.5; return { at: (edge < 2 ? [t * gw, 0.003, (edge ? 1 : -1) * gd / 2 + (random() - 0.5) * 0.08] : [(edge === 2 ? 1 : -1) * gw / 2 + (random() - 0.5) * 0.08, 0.003, t * gd]) as [number, number, number], size: 0.005 + random() * 0.008 }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#7d7466'), grit);
    } else if (a.ghost === 'underlay') {
      const felt = canvas(256, 256, (c) => { c.fillStyle = '#8f8a80'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { c.fillStyle = ['#6f6a62', '#a9a498', '#7c6f5c', '#9a7f6a'][Math.floor(random() * 4)]; c.fillRect(random() * 256, random() * 256, 3, 2); } });
      const shape = new THREE.Shape();
      const pts: [number, number][] = [];
      for (let i = 0; i < 28; i++) { const t = i / 28, side = Math.floor(t * 4), u = t * 4 - side, w = gw * 0.96, d = gd * 0.96; const j = (random() - 0.5) * 0.07 * (0.4 + mood.wear); pts.push(side === 0 ? [-w / 2 + u * w, -d / 2 + j] : side === 1 ? [w / 2 + j, -d / 2 + u * d] : side === 2 ? [w / 2 - u * w, d / 2 + j] : [-w / 2 + j, d / 2 - u * d]); }
      pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const geo = new THREE.ShapeGeometry(shape); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / gw + 0.5, uv.getY(i) / gd + 0.5);
      const m = s.mesh(geo, new THREE.MeshStandardMaterial({ map: felt, roughness: 1, side: THREE.DoubleSide }), [0, 0.006, 0]); m.rotation.x = -Math.PI / 2; m.castShadow = false;
    }

    // --- the roll itself
    const fringe = (parent: THREE.Object3D, x0: number, x1: number, y: number, z: number, out: number) => {
      if (a.pattern !== 'persian') return;
      const count = Math.round((x1 - x0) / 0.022), geo = new THREE.BoxGeometry(0.006, 0.004, 0.07), mesh = new THREE.InstancedMesh(geo, s.material('#eadfc4'), count), m4 = new THREE.Matrix4();
      for (let i = 0; i < count; i++) { m4.makeRotationY((random() - 0.5) * 0.5); m4.setPosition(x0 + (i + 0.5) * (x1 - x0) / count, y, z + out * 0.035); mesh.setMatrixAt(i, m4); }
      mesh.castShadow = true; parent.add(mesh);
    };
    const yaw = (random() - 0.5) * 0.5;
    if (a.pose === 'standing') {
      const h = L, lean = mix(0.25, 0.5, random()) * Math.min(1, L / 1.4);
      const roll = makeRoll([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, h * 0.5, 0), new THREE.Vector3(0.1 * lean, h * 0.8, 0.03 * lean), new THREE.Vector3(0.36 * lean, h * 0.97, 0.12 * lean)], R, outerMat, endMat);
      bind(roll, R);
      roll.group.position.set(-gw * 0.25, 0, -gd * 0.2); roll.group.rotation.y = -0.5 + yaw;
      s.root.add(roll.group);
    } else {
      const unrolled = a.pose === 'half' ? Math.min(gd * 0.55, 1.1) : 0;
      const r = a.pose === 'half' ? R * 0.8 : R;
      const lay = new THREE.Group();
      const roll = makeRoll([new THREE.Vector3(-L / 2, 0, 0), new THREE.Vector3(L / 2, 0, 0)], r, outerMat, endMat, 0.93);
      roll.group.position.y = r * 0.93;
      bind(roll, r);
      lay.add(roll.group);
      if (unrolled) {
        const flat = new THREE.Mesh(new THREE.PlaneGeometry(L, unrolled), rugMat);
        flat.rotation.x = -Math.PI / 2; flat.position.set(0, 0.012, unrolled / 2); flat.receiveShadow = true; lay.add(flat);
        const uv = flat.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(L, 0.012, 0.012), s.material(backing)); edge.position.set(0, 0.006, unrolled); lay.add(edge);
        fringe(lay, -L / 2, L / 2, 0.006, unrolled, 1);
        lay.position.z = -unrolled / 2;
      } else {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(L, 0.014, a.tie === 'loose' ? 0.2 : 0.06), a.tie === 'loose' ? rugMat : outerMat);
        flap.position.set(0, a.tie === 'loose' ? 0.012 : r * 0.5, r * (a.tie === 'loose' ? 1.0 : 0.87) + (a.tie === 'loose' ? 0.08 : 0)); flap.rotation.x = a.tie === 'loose' ? 0.08 : 1.0; flap.castShadow = true; lay.add(flap);
        fringe(lay, -L / 2, L / 2, a.tie === 'loose' ? 0.006 : r * 0.42, r + (a.tie === 'loose' ? 0.18 : 0.0), 1);
      }
      lay.rotation.y = unrolled ? yaw * 0.3 : -0.5 + yaw * 0.6;
      s.root.add(lay);
      if (a.pose === 'pair') {
        const feltMat = s.material('#8d887d', { roughness: 1 });
        const under = makeRoll([new THREE.Vector3(-L * 0.46, 0, 0), new THREE.Vector3(L * 0.46, 0, 0)], R * 0.72, feltMat, s.material('#6f6a60', { roughness: 1 }), 0.9);
        under.group.position.set(0.1, R * 0.72 * 0.9, R * 2.4 + 0.08); under.group.rotation.y = -0.12;
        bind(under, R * 0.72);
        lay.add(under.group);
      }
    }
    return s.finish({ footprint: Math.max(L, 1) * 0.55 });
  },
});

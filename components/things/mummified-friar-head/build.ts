import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SKULL, SOCKET, buildSkull, painted, strands } from './skull';

const HABIT = { brown: '#6a4a33', grey: '#8d887d', black: '#2f2b2c', undyed: '#b9a98a' } as const;
const EXPRESSION = {
  singing: { gape: 0.5, lids: true, pitch: -0.14 },
  yawning: { gape: 0.78, lids: true, pitch: -0.22 },
  serene: { gape: 0.07, lids: true, pitch: 0.04 },
  aghast: { gape: 0.62, lids: false, pitch: 0 },
  muttering: { gape: 0.2, lids: false, pitch: 0.1 },
} as const;
const NAMES = ['FRA ANSELMO', 'FRA SILVESTRO', 'FRA BENEDETTO', 'FRA ROSARIO', 'FRA GIACOMO', 'FRA ILARIO'];

export default defineThing({
  questions: {
    expression: choice('What is the fallen-open face doing?', {
      singing: 'Singing: mouth a round O, eyes closed, chin lifted toward the choir.',
      yawning: 'An enormous yawn, jaw dropped as far as it goes, eyes shut.',
      serene: 'Serene: mouth barely parted, eyes closed, as if dozing after supper.',
      aghast: 'Aghast: jaw hanging, sockets wide and hollow.',
      muttering: 'Muttering a prayer, jaw a little open, sockets downcast.',
    }),
    skin: score('How much of the skin survives?', ['Mostly bare bone with a few scraps', 'Patchy, bone showing at brow and cheek', 'Most of it, tight and brown', 'All of it, dark smooth leather']),
    beard: choice('What is left of his beard?', {
      none: 'Nothing, a bare chin.',
      wisps: 'A few pale wisps on the chin.',
      full: 'A long full Capuchin beard, still on him.',
      forked: 'A two-pointed forked beard and a drooping moustache.',
    }),
    whiskers: choice('What colour is any hair?', {
      white: 'White.',
      grey: 'Iron grey.',
      ginger: 'Faded ginger.',
      black: 'Black.',
    }),
    hood: choice('What state is the hood in?', {
      up: 'Up over the head and whole, with its long point behind.',
      moth: 'Up, but moth-eaten into holes.',
      back: 'Slipped back onto the shoulders, leaving the head bare.',
      tatters: 'Rotted to a few tatters still clinging to the skull.',
    }),
    habit: choice('What colour is the cloth?', {
      brown: 'Capuchin brown.',
      grey: 'Dusty ash grey.',
      black: 'Black.',
      undyed: 'Pale undyed wool.',
    }),
    neck: choice('What hangs at his neck?', {
      nothing: 'Nothing.',
      rope: 'A knotted rope cord, its end hanging down the chest.',
      tag: 'A paper name tag on a string, with his name and the year.',
      both: 'Both the rope and a name tag.',
      cross: 'A plain wooden cross on a thong.',
    }),
    tilt: choice('How does the head sit?', {
      upright: 'Upright, facing the visitor.',
      bowed: 'Bowed forward, chin toward the chest.',
      lolling: 'Lolling over onto one shoulder.',
      back: 'Thrown back, face to the ceiling.',
    }),
    socket: choice('Does an eye socket hold anything?', {
      empty: 'No, both are empty.',
      glass: 'One staring blue glass eye, fitted by a later caretaker.',
      flower: 'A dried flower somebody tucked in.',
      web: 'A cobweb spun across one of them.',
      coin: 'A coin pressed into one.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(SKULL.unit);
    s.root.add(g);
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const look = EXPRESSION[a.expression];
    const leather = new THREE.Color('#7a5236').lerp(new THREE.Color(mood.warmth > 0.5 ? '#8a5a30' : '#6b5a4c'), Math.abs(mood.warmth - 0.5) * 0.8);
    const skinColour = new THREE.Color('#dccfae').lerp(leather, 0.25 + a.skin * 0.75);
    const skull = buildSkull({
      bone: skinColour, hollow: '#1d130e', stain: a.skin > 0.6 ? '#4d3322' : leather, blotch: mix(0.55, 1, mood.wear) * mix(1, 0.6, a.skin),
      random, jaw: 'open', gape: look.gape, flesh: a.skin, roughness: 0.9, tooth: '#cdbb8e',
      upper: () => random() < 0.5, lower: () => random() < 0.45,
    });

    // The head turns on the top of the neck.
    const pivot = new THREE.Vector3(0, -1.0, -0.2);
    const head = new THREE.Group();
    head.position.copy(pivot);
    skull.root.position.copy(pivot).negate();
    head.add(skull.root);
    g.add(head);
    const side = random() < 0.5 ? -1 : 1;
    const tilt = { upright: [0, 0], bowed: [0.36, 0], lolling: [0.1, 0.4 * side], back: [-0.42, 0] }[a.tilt];
    head.rotation.set(tilt[0] + look.pitch + jitter(0.03), jitter(0.12) + (a.tilt === 'lolling' ? side * 0.15 : 0), tilt[1] + jitter(0.04));

    // Closed lids for the sleepers and singers.
    const dark = new THREE.MeshStandardMaterial({ color: '#2a1b13', roughness: 0.9 });
    const occupied = a.socket === 'empty' ? 0 : side;
    if (look.lids && a.skin > 0.3) for (const eye of [-1, 1]) {
      if (eye === occupied) continue;
      const lid = mesh(skull.root, new THREE.TorusGeometry(0.13, 0.022, 5, 14, Math.PI), dark, [eye * SOCKET[0], SOCKET[1] + 0.04, SOCKET[2] - 0.2 + a.skin * 0.21]);
      lid.rotation.z = Math.PI;
    }

    // Something in a socket.
    const sx = occupied * SOCKET[0], sy = SOCKET[1], sz = SOCKET[2] - 0.1 + a.skin * 0.06;
    if (a.socket === 'glass') {
      mesh(skull.root, new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 0.15 }), [sx, sy, sz - 0.05]);
      mesh(skull.root, new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: '#3f7fc4', roughness: 0.2, emissive: '#16385f', emissiveIntensity: 0.5 }), [sx, sy, sz + 0.055]);
      mesh(skull.root, new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#0c0c10', roughness: 0.2 }), [sx, sy, sz + 0.105]);
    } else if (a.socket === 'flower') {
      const petal = new THREE.MeshStandardMaterial({ color: new THREE.Color(mood.cheer > 0.5 ? '#e8b23c' : '#b98aa8').lerp(new THREE.Color('#9a8a6a'), mood.wear * 0.5), roughness: 0.8 });
      for (let i = 0; i < 7; i++) {
        const angle = i * 0.9;
        mesh(skull.root, new THREE.SphereGeometry(1, 8, 6), petal, [sx + Math.cos(angle) * 0.12, sy + Math.sin(angle) * 0.12, sz + 0.04]).scale.set(0.085, 0.085, 0.03);
      }
      mesh(skull.root, new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: '#6b4a1c', roughness: 0.9 }), [sx, sy, sz + 0.06]);
      skull.root.add(strands([[new THREE.Vector3(sx, sy, sz), new THREE.Vector3(sx + occupied * 0.1, sy - 0.3, sz + 0.12), new THREE.Vector3(sx + occupied * 0.16, sy - 0.62, sz + 0.1)]], 0.016, new THREE.MeshStandardMaterial({ color: '#6f7a45', roughness: 0.9 }), 4));
    } else if (a.socket === 'web') {
      const web: THREE.Vector3[][] = [];
      for (let i = 0; i < 7; i++) { const angle = i * 0.9 + jitter(0.2); web.push([new THREE.Vector3(sx, sy, sz + 0.06), new THREE.Vector3(sx + Math.cos(angle) * 0.2, sy + Math.sin(angle) * 0.2, sz + 0.07)]); }
      for (const r of [0.07, 0.13, 0.18]) { const ring: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) ring.push(new THREE.Vector3(sx + Math.cos(i * 0.524) * r, sy + Math.sin(i * 0.524) * r, sz + 0.065)); web.push(ring); }
      skull.root.add(strands(web, 0.006, new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.6 }), 3));
    } else if (a.socket === 'coin') {
      const coin = mesh(skull.root, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 18), new THREE.MeshStandardMaterial({ color: '#d7ab45', metalness: 0.9, roughness: 0.3, emissive: '#5a4208', emissiveIntensity: 0.5 }), [sx, sy, sz + 0.04]);
      coin.rotation.x = Math.PI / 2;
    }

    // Beard and moustache ride on the jaw.
    const hairColour = new THREE.Color({ white: '#e9e4d6', grey: '#8e8a83', ginger: '#b06a35', black: '#231f1e' }[a.whiskers]).lerp(new THREE.Color('#8b8275'), mood.wear * 0.25);
    const hair = new THREE.MeshStandardMaterial({ color: hairColour, roughness: 0.95 });
    const jawSpace = skull.jaw ? skull.jaw.children[0] : skull.root;
    if (a.beard !== 'none') {
      const paths: THREE.Vector3[][] = [];
      const count = a.beard === 'wisps' ? 16 : 150;
      for (let i = 0; i < count; i++) {
        const phi = jitter(a.beard === 'wisps' ? 0.5 : 1.25);
        const root = new THREE.Vector3(Math.sin(phi) * 0.4, -1.3 - random() * 0.12 + Math.abs(phi) * 0.18, 0.38 + Math.cos(phi) * 0.42);
        let length = a.beard === 'wisps' ? mix(0.25, 0.6, random()) : mix(0.9, 1.7, random()) * (1 - Math.abs(phi) * 0.3);
        let drift = Math.sin(phi) * 0.12;
        if (a.beard === 'forked') { drift = (root.x > 0 ? 1 : -1) * 0.32 - root.x * 0.5; length *= 0.9; }
        const wave = jitter(0.08);
        paths.push([
          root,
          new THREE.Vector3(root.x + drift * 0.4 + wave, root.y - length * 0.45, root.z + 0.1),
          new THREE.Vector3(root.x + drift + jitter(0.06), root.y - length, root.z + 0.02 + jitter(0.06)),
        ]);
      }
      jawSpace.add(strands(paths, a.beard === 'wisps' ? 0.014 : 0.024, hair, 3));
      if (a.beard === 'forked') {
        const moustache: THREE.Vector3[][] = [];
        for (let i = 0; i < 36; i++) {
          const dir = i % 2 ? 1 : -1, x = dir * mix(0.04, 0.26, random());
          moustache.push([new THREE.Vector3(x, -0.9 + jitter(0.03), 0.8), new THREE.Vector3(x + dir * 0.2, -1.0, 0.76), new THREE.Vector3(x + dir * 0.34, -1.3 - random() * 0.2, 0.62)]);
        }
        skull.root.add(strands(moustache, 0.02, hair, 3));
      }
    }

    // Cloth.
    const clothColour = new THREE.Color(HABIT[a.habit]).lerp(new THREE.Color('#9a9080'), mood.wear * 0.35);
    const cloth = new THREE.MeshStandardMaterial({ color: clothColour, roughness: 1, side: THREE.DoubleSide });
    const clothDark = new THREE.MeshStandardMaterial({ color: clothColour.clone().multiplyScalar(0.72), roughness: 1 });

    // Neck and the short shoulder cape of the habit.
    mesh(g, new THREE.CylinderGeometry(0.36, 0.44, 1.0, 14), new THREE.MeshStandardMaterial({ color: skinColour.clone().multiplyScalar(0.85), roughness: 0.9 }), [0, -1.25, -0.18]);
    const capeProfile: [number, number][] = [[0.0, -1.2], [0.5, -1.22], [0.72, -1.36], [1.25, -1.72], [1.72, -2.15], [1.9, -2.6], [1.84, -2.72], [0, -2.72]];
    const cape = mesh(g, new THREE.LatheGeometry(capeProfile.map(([x, y]) => new THREE.Vector2(x, y)), 36), cloth, [0, 0, -0.15]);
    cape.scale.z = 0.76;
    // The hood: a shell around the head with the face cut out and a long point behind.
    const centre = new THREE.Vector3(0, -0.18, -0.08), tipDir = new THREE.Vector3(0, 0.5, -1).normalize();
    const hoodPoint = (d: THREE.Vector3, lift = 1) => {
      const k = Math.exp(-((d.angleTo(tipDir) / 0.5) ** 2));
      return new THREE.Vector3(d.x * 1.2, d.y * 1.34, d.z * 1.3).multiplyScalar(lift).addScaledVector(tipDir, 0.75 * k).add(centre);
    };
    const faceAxis = new THREE.Vector3(0, -0.22, 1).normalize(), opening = 0.98;
    if (a.hood !== 'back') {
      const rot = a.hood === 'up' ? mood.wear * 0.12 : a.hood === 'moth' ? 0.3 + mood.wear * 0.15 : 0.72;
      const o = [random() * 9, random() * 9, random() * 9];
      const source = new THREE.SphereGeometry(1, 44, 30).toNonIndexed();
      const position = source.attributes.position as THREE.BufferAttribute;
      const kept: number[] = [];
      const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), mid = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 3) {
        va.fromBufferAttribute(position, i); vb.fromBufferAttribute(position, i + 1); vc.fromBufferAttribute(position, i + 2);
        mid.copy(va).add(vb).add(vc).normalize();
        if (mid.angleTo(faceAxis) < opening) continue;
        const noise = 0.5 + 0.5 * Math.sin(mid.x * 6 + o[0]) * Math.sin(mid.y * 7 + o[1]) * Math.cos(mid.z * 5 + o[2]);
        const fray = a.hood === 'tatters' ? Math.max(0, mid.y) * 0.25 : 0;
        if (noise + fray < rot) continue;
        for (const v of [va, vb, vc]) { const p = hoodPoint(v); kept.push(p.x, p.y, p.z); }
      }
      source.dispose();
      const shell = new THREE.BufferGeometry();
      shell.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
      shell.computeVertexNormals();
      mesh(head, shell, cloth, [-pivot.x, -pivot.y, -pivot.z]);
      if (a.hood !== 'tatters') {
        // A rolled hem round the face.
        const u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3().crossVectors(faceAxis, u).normalize();
        const rim: THREE.Vector3[] = [];
        for (let i = 0; i < 28; i++) {
          const t = (i / 28) * Math.PI * 2;
          const d = faceAxis.clone().multiplyScalar(Math.cos(opening)).addScaledVector(u, Math.cos(t) * Math.sin(opening)).addScaledVector(v, Math.sin(t) * Math.sin(opening));
          rim.push(hoodPoint(d.normalize(), 1.01));
        }
        const hem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 56, 0.075, 6, true), clothDark);
        hem.position.copy(pivot).negate();
        hem.castShadow = true;
        head.add(hem);
      }
    } else {
      // Fallen hood heaped behind the neck.
      const heap = mesh(g, new THREE.SphereGeometry(1, 18, 12), cloth, [0, -1.28, -0.72]);
      heap.scale.set(1.15, 0.5, 0.75);
      const point = mesh(g, new THREE.ConeGeometry(0.42, 1.5, 10), cloth, [0, -1.75, -1.42]);
      point.rotation.x = -2.5;
      mesh(g, new THREE.TorusGeometry(0.62, 0.13, 8, 20, Math.PI), clothDark, [0, -1.22, -0.2]).rotation.set(Math.PI / 2, 0, Math.PI);
      // A fringe of tonsure hair on the bare head.
      const fringe: THREE.Vector3[][] = [];
      for (let i = 0; i < 70; i++) {
        const angle = 0.9 + random() * (Math.PI * 2 - 1.8);
        const x = Math.sin(angle) * 0.8, z = Math.cos(angle) * 1.02, y = mix(0.05, 0.3, random());
        fringe.push([new THREE.Vector3(x * 0.98, y, z * 0.98), new THREE.Vector3(x * 1.06, y - 0.2, z * 1.05), new THREE.Vector3(x * 1.04, y - 0.42, z * 1.02)]);
      }
      skull.root.add(strands(fringe, 0.018, hair, 3));
    }

    // Rope, tag, cross.
    const swing: THREE.Object3D[] = [];
    const chest = (y: number, x = 0) => {
      // Front surface of the cape at a height.
      let r = 1.9;
      for (let i = 1; i < capeProfile.length - 2; i++) {
        const [r0, y0] = capeProfile[i], [r1, y1] = capeProfile[i + 1];
        if (y <= y0 && y >= y1) r = r0 + ((r1 - r0) * (y0 - y)) / (y0 - y1);
      }
      return new THREE.Vector3(x, y, -0.15 + Math.sqrt(Math.max(0.01, r * r - x * x)) * 0.76 + 0.05);
    };
    if (a.neck === 'rope' || a.neck === 'both') {
      const hemp = new THREE.MeshStandardMaterial({ color: '#d8cfb4', roughness: 0.95 });
      const loop = mesh(g, new THREE.TorusGeometry(0.66, 0.06, 6, 24), hemp, [0, -1.4, -0.15]);
      loop.rotation.x = Math.PI / 2;
      loop.scale.y = 0.8;
      const x = 0.28;
      const points = [new THREE.Vector3(x * 0.6, -1.4, 0.36), chest(-1.75, x), chest(-2.15, x + 0.05), chest(-2.62, x + 0.08).add(new THREE.Vector3(0, 0, 0.03))];
      g.add(strands([points], 0.06, hemp, 6));
      mesh(g, new THREE.SphereGeometry(0.11, 8, 6), hemp, [x * 0.6, -1.42, 0.38]);
      for (const y of [-1.9, -2.2, -2.5]) mesh(g, new THREE.SphereGeometry(0.095, 8, 6), hemp, chest(y, x + 0.05).toArray() as [number, number, number]);
    }
    if (a.neck === 'tag' || a.neck === 'both') {
      const name = NAMES[Math.floor(random() * NAMES.length)], year = 1640 + Math.floor(random() * 220);
      const paper = new THREE.Color('#efe6cc').lerp(new THREE.Color('#b9a57c'), mood.wear * 0.6).getStyle();
      const texture = painted(384, 224, (ctx, w, h) => {
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#2c2119';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 54px serif';
        ctx.fillText(name, w / 2, h * 0.4, w - 40);
        ctx.font = 'bold 50px serif';
        ctx.fillText(`† ${year}`, w / 2, h * 0.74);
      });
      const tag = new THREE.Group();
      const card = mesh(tag, new THREE.PlaneGeometry(0.95, 0.55), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [0, -0.3, 0]);
      card.rotation.z = jitter(0.08);
      const at = chest(-1.78, -0.35);
      tag.position.copy(at).add(new THREE.Vector3(0, 0, 0.05));
      tag.rotation.x = -0.52;
      g.add(tag);
      swing.push(tag);
      const string = new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 0.9 });
      g.add(strands([[new THREE.Vector3(-0.45, -1.36, 0.3), at.clone().add(new THREE.Vector3(-0.2, 0, 0.05))], [new THREE.Vector3(0.2, -1.36, 0.42), at.clone().add(new THREE.Vector3(0.2, 0, 0.05))]], 0.014, string, 4));
    }
    if (a.neck === 'cross') {
      const wood = new THREE.MeshStandardMaterial({ color: '#4b3120', roughness: 0.8 });
      const cross = new THREE.Group();
      mesh(cross, new THREE.BoxGeometry(0.13, 0.78, 0.07), wood, [0, -0.39, 0]);
      mesh(cross, new THREE.BoxGeometry(0.5, 0.13, 0.07), wood, [0, -0.25, 0]);
      const at = chest(-1.8, 0);
      cross.position.copy(at).add(new THREE.Vector3(0, 0, 0.06));
      cross.rotation.x = -0.5;
      g.add(cross);
      swing.push(cross);
      g.add(strands([[new THREE.Vector3(-0.4, -1.36, 0.32), at.clone().add(new THREE.Vector3(0, 0, 0.06))], [new THREE.Vector3(0.4, -1.36, 0.32), at.clone().add(new THREE.Vector3(0, 0, 0.06))]], 0.016, wood, 4));
    }

    // A plain board to stand on, and dust if nobody tends him.
    const board = s.material('#7b6248', { roughness: 0.9 });
    mesh(g, new THREE.BoxGeometry(4.3, 0.24, 3.3), board, [0, -2.84, -0.1]);
    for (const x of [-1.5, 1.5]) mesh(g, new THREE.BoxGeometry(0.3, 0.3, 3.0), s.material('#5f4a36'), [x, -3.1, -0.1]);
    if (mood.wear > 0.55) {
      const web: THREE.Vector3[][] = [];
      const strandsCount = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < strandsCount; i++) {
        const from = new THREE.Vector3(jitter(0.5), 0.75 + random() * 0.2, -0.6 + jitter(0.3)), to = new THREE.Vector3((random() < 0.5 ? -1 : 1) * mix(1.3, 1.8, random()), -2.0 - random() * 0.5, -0.2 + jitter(0.5));
        const sag = from.clone().lerp(to, 0.5);
        sag.y -= 0.35;
        web.push([from, sag, to]);
      }
      g.add(strands(web, 0.007, new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.6 }), 3));
    }

    const jaw = skull.jaw;
    const tempo = mix(0.5, 3.2, mood.energy), reach = mix(0.01, 0.07, mood.energy);
    const sings = a.expression === 'singing' || a.expression === 'muttering';
    return s.finish({
      update: (_dt, time) => {
        if (jaw && sings) jaw.rotation.x = look.gape + Math.sin(time * tempo * 2) * reach;
        swing.forEach((item, i) => { item.rotation.z = Math.sin(time * tempo + i) * reach * 0.8; });
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { SKULL, buildSkull, strands, surface } from './skull';

const WAX = {
  tallow: ['#ece3c6'], beeswax: ['#d9a93a'], red: ['#a3272b'], black: ['#2b2729'], green: ['#4f7a4a'],
  layered: ['#ece3c6', '#a3272b', '#d9a93a', '#3e5f8a'],
} as const;

export default defineThing({
  questions: {
    wax: choice('What colour is the wax?', {
      tallow: 'Ivory-white tallow, the cheap household kind.',
      beeswax: 'Honey-yellow beeswax, church candles.',
      red: 'Deep red, like sealing wax.',
      black: 'Black wax, a sorcerer\'s desk.',
      green: 'Dull green.',
      layered: 'Many colours run together, layer over layer from different hands and years.',
    }),
    candles: choice('How many candles stand on it now?', {
      none: 'None; only burnt-down stubs in the wax.',
      one: 'A single candle on the crown.',
      three: 'Three of different heights.',
      many: 'A crowd of them, on the skull and all around it.',
    }),
    flames: choice('Are they burning?', {
      all: 'Every wick is lit.',
      one: 'Only one flame is left alight.',
      smoking: 'Just blown out, thin smoke still rising.',
      cold: 'Cold and unlit.',
    }),
    cover: choice('How much of the face has the wax covered?', {
      crown: 'Only the crown, with drips reaching the brow.',
      eye: 'It has run down one side and sealed one eye socket.',
      grin: 'It has poured over the cheeks and sealed the teeth.',
      all: 'Nearly everything; one eye socket peers out of a wax hood.',
    }),
    spread: score('How far has the wax run beyond the skull?', ['A few drips', 'A skirt around the base', 'A wide pool', 'Over the edge in long stalactites']),
    offerings: choice('What has been left around it?', {
      nothing: 'Nothing.',
      coins: 'A scatter of small coins.',
      flowers: 'Cut flowers, marigolds and roses.',
      notes: 'Folded paper notes, one tucked between its teeth.',
      cigarettes: 'Cigarettes, one stuck jauntily in its mouth.',
      beads: 'A looped string of beads and a saint\'s medal.',
    }),
    jawless: noul('Is the lower jaw missing?'),
    base: choice('What does it stand on?', {
      ledge: 'A stone ledge in a wall niche.',
      dish: 'A blackened iron dish on three legs.',
      books: 'A slumped stack of old books.',
      bracket: 'A wooden wall bracket with a painted plaque.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const U = SKULL.unit;
    const g = new THREE.Group();
    g.scale.setScalar(U);
    s.root.add(g);
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const palette = WAX[a.wax];
    const soot = mood.wear * 0.3;
    const waxMats = palette.map((hex) => {
      const colour = new THREE.Color(hex).lerp(new THREE.Color('#4a4038'), soot);
      return new THREE.MeshStandardMaterial({ color: colour, roughness: 0.38, emissive: colour, emissiveIntensity: 0.16 });
    });
    const wax = waxMats[0];
    const waxAt = (index: number) => waxMats[index % waxMats.length];
    const boneColour = new THREE.Color('#dfd2ae').lerp(new THREE.Color('#8f7a5c'), mood.wear * 0.5);
    const skull = buildSkull({
      bone: boneColour, hollow: '#231a15', stain: '#5c4630', blotch: mix(0.3, 1, mood.wear), random,
      jaw: a.jawless ? 'missing' : 'closed',
      upper: () => random() > 0.1 + mood.wear * 0.3, lower: () => random() > 0.1 + mood.wear * 0.3,
    });
    const head = new THREE.Group();
    head.add(skull.root);
    g.add(head);
    skull.root.rotation.x = a.jawless ? -0.3 : 0;
    head.rotation.y = jitter(0.2);

    // The wax hood: a shell that swells out of the bone wherever the wax has run.
    const side = random() < 0.5 ? -1 : 1;
    const phases = [random() * 6, random() * 6, random() * 6];
    const edgeAt = (phi: number) => {
      const lobes = 0.2 * Math.sin(phi * 3 + phases[0]) + 0.16 * Math.sin(phi * 7 + phases[1]) + 0.1 * Math.sin(phi * 13 + phases[2]);
      const base = { crown: 0.85, eye: 0.9, grin: 1.15, all: 2.3 }[a.cover];
      const eyePhi = side * 0.44;
      const lobe = a.cover === 'eye' ? 1.15 * Math.exp(-(((phi - eyePhi) / 0.42) ** 2)) : a.cover === 'grin' ? 0.9 * Math.exp(-(((Math.abs(phi) - 0.75) / 0.3) ** 2)) : 0;
      return base + lobes + lobe;
    };
    const windowDir = new THREE.Vector3(-side * 0.42, -0.2, 0.885).normalize();
    const shell = new THREE.SphereGeometry(1, 72, 44);
    const sp = shell.attributes.position as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    for (let i = 0; i < sp.count; i++) {
      d.fromBufferAttribute(sp, i).normalize();
      const theta = Math.acos(Math.min(1, Math.max(-1, d.y))), phi = Math.atan2(d.x, d.z);
      let c = 1 - Math.min(1, Math.max(0, (theta - edgeAt(phi) + 0.12) / 0.24));
      if (a.cover === 'all') c *= Math.min(1, Math.max(0, (d.angleTo(windowDir) - 0.3) / 0.14));
      c = c * c * (3 - 2 * c);
      const thick = 0.1 + 0.07 * Math.max(0, Math.cos(theta * 1.4)) + 0.03 * Math.sin(phi * 5 + theta * 9 + phases[1]);
      const p = surface(d, 0.93 + c * (0.07 + thick));
      sp.setXYZ(i, p.x, p.y, p.z);
    }
    shell.computeVertexNormals();
    mesh(skull.root, shell, wax);

    // Drips running down from the hood, each ending in a bead.
    const dripPaths: THREE.Vector3[][][] = waxMats.map(() => []);
    const beads: { at: THREE.Vector3; size: number; material: number }[] = [];
    const dripCount = Math.round(mix(10, 26, mood.wear * 0.5 + a.spread * 0.5));
    for (let i = 0; i < dripCount; i++) {
      const phi = (i / dripCount) * Math.PI * 2 + jitter(0.15);
      let theta = edgeAt(phi) - 0.1;
      const length = mix(0.15, 0.9, random());
      const points: THREE.Vector3[] = [];
      for (let t = 0; t <= length; t += 0.1) {
        const v = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
        if (a.cover !== 'all' && v.angleTo(windowDir) < 0.3) break;
        if (v.angleTo(new THREE.Vector3(side * 0.42, -0.2, 0.885).normalize()) < 0.3 && a.cover === 'crown') break;
        points.push(surface(v, 1.035));
        theta += 0.1;
        if (theta > 2.2) break;
      }
      if (points.length < 2) continue;
      const k = i % waxMats.length;
      dripPaths[k].push(points);
      beads.push({ at: points[points.length - 1], size: mix(0.05, 0.085, random()), material: k });
    }
    dripPaths.forEach((paths, k) => { if (paths.length) skull.root.add(strands(paths, 0.042, waxAt(k), 5)); });
    for (const bead of beads) mesh(skull.root, new THREE.SphereGeometry(bead.size, 8, 6), waxAt(bead.material), bead.at.toArray() as [number, number, number]).scale.y = 1.3;
    if (a.cover === 'grin' || a.cover === 'all') {
      mesh(skull.root, new THREE.SphereGeometry(1, 18, 12), wax, [0, -0.95, 0.42]).scale.set(0.52, 0.3, 0.46);
      for (let i = 0; i < 7; i++) {
        const x = -0.36 + i * 0.12 + jitter(0.03), len = mix(0.15, 0.5, random());
        const z = 0.42 + Math.sqrt(Math.max(0, 1 - (x / 0.52) ** 2)) * 0.42;
        mesh(skull.root, new THREE.CylinderGeometry(0.045, 0.02, len, 6), waxAt(i), [x, -1.05 - len / 2, z - 0.03]);
      }
    }

    // Seat the head, then build the base under it.
    s.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(skull.cranium);
    for (const child of skull.root.children) box.expandByObject(child);
    head.position.y = -box.min.y / U;
    const floor = 0;
    const stone = s.material('#a39d8f', { roughness: 0.95 });
    const iron = s.material('#3a3837', { roughness: 0.7, metalness: 0.5 });
    let rim = 2.4; // how far out the flat surface reaches, for pooling wax
    let frontEdge = 1.6;
    if (a.base === 'ledge') {
      mesh(g, new THREE.BoxGeometry(5.0, 0.5, 3.2), stone, [0, -0.25, 0]);
      mesh(g, new THREE.BoxGeometry(5.0, 0.3, 0.3), s.material('#8b8679'), [0, -0.62, 1.4]);
      mesh(g, new THREE.BoxGeometry(5.0, 3.4, 0.3), s.material('#96907f'), [0, 1.2, -1.75]);
    } else if (a.base === 'dish') {
      const dish = new THREE.LatheGeometry([[0, 0], [1.6, 0.02], [2.05, 0.2], [2.12, 0.34], [2.0, 0.3], [1.55, 0.12], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
      mesh(g, dish, iron, [0, -0.1, 0]);
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.5;
        const leg = mesh(g, new THREE.CylinderGeometry(0.07, 0.05, 1.0, 6), iron, [Math.sin(angle) * 1.5, -0.55, Math.cos(angle) * 1.5]);
        leg.rotation.set(Math.cos(angle) * 0.3, 0, -Math.sin(angle) * 0.3);
      }
      rim = 1.9; frontEdge = 2.05;
    } else if (a.base === 'books') {
      let y = 0;
      const covers = ['#5a2a22', '#263a33', '#3b3152', '#6a5330'];
      for (let i = 0; i < 3; i++) {
        const w = mix(3.0, 3.8, random()), dpt = mix(2.3, 2.8, random()), h = mix(0.35, 0.6, random());
        const book = new THREE.Group();
        mesh(book, new THREE.BoxGeometry(w, h, dpt), s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.75 }));
        mesh(book, new THREE.BoxGeometry(w * 0.96, h * 0.78, dpt * 0.96), s.material('#dccfa8'), [0.07, 0, 0.06]);
        y -= h / 2;
        book.position.set(jitter(0.2), y, jitter(0.15));
        book.rotation.set(0, jitter(0.35), i === 0 ? 0 : jitter(0.03));
        y -= h / 2;
        g.add(book);
      }
      rim = 1.5; frontEdge = 1.2;
    } else {
      const wood = s.material('#6a4c30', { roughness: 0.85 });
      mesh(g, new THREE.BoxGeometry(4.2, 0.22, 2.8), wood, [0, -0.11, 0]);
      mesh(g, new THREE.BoxGeometry(4.6, 5.2, 0.16), s.material('#b9b09a'), [0, 0.9, -1.48]);
      for (const x of [-1.5, 1.5]) {
        const brace = mesh(g, new THREE.BoxGeometry(0.22, 1.9, 0.22), wood, [x, -0.85, -0.6]);
        brace.rotation.x = -0.75;
      }
      const texts = ['ORA PRO NOBIS', 'MEMENTO MORI', 'GRAZIE', 'HODIE MIHI', 'PER GRAZIA RICEVUTA'];
      const plaque = s.label(texts[Math.floor(random() * texts.length)], 3.2 * U, 0.55 * U, [0, -0.75 * U, -1.38 * U], '#e9dcae', mood.cheer > 0.5 ? '#35507a' : '#3a2a22');
      plaque.castShadow = false;
      rim = 1.9; frontEdge = 1.4;
    }

    // Pooled wax and stalactites.
    const blobs = Math.round(mix(2, 16, a.spread));
    for (let i = 0; i < blobs; i++) {
      const angle = random() * Math.PI * 2, r = mix(0.5, Math.min(rim, mix(1.0, 2.2, a.spread)), random());
      const size = mix(0.25, 0.7, random());
      const blob = mesh(g, new THREE.SphereGeometry(1, 12, 8), waxAt(i), [Math.sin(angle) * r, floor + 0.01, Math.cos(angle) * r * 0.75 + 0.1]);
      blob.scale.set(size, mix(0.05, 0.14, random()), size * mix(0.7, 1.2, random()));
    }
    mesh(g, new THREE.SphereGeometry(1, 20, 10), wax, [0, floor, 0.1]).scale.set(mix(0.9, 1.5, a.spread), mix(0.12, 0.3, a.spread), mix(0.9, 1.35, a.spread));
    if (a.spread > 0.62) {
      const hang = Math.round(mix(3, 9, (a.spread - 0.62) / 0.38));
      for (let i = 0; i < hang; i++) {
        const x = jitter(1.5), len = mix(0.4, 1.7, random()) * (a.base === 'books' ? 0.6 : 1);
        const z = a.base === 'dish' ? Math.sqrt(Math.max(0.1, frontEdge * frontEdge - x * x)) : frontEdge;
        mesh(g, new THREE.SphereGeometry(1, 10, 8), waxAt(i), [x, floor + 0.02, z - 0.1]).scale.set(0.24, 0.07, 0.22);
        mesh(g, new THREE.CylinderGeometry(0.1, 0.02, len, 7), waxAt(i), [x, floor - len / 2 + 0.04, z + 0.03]);
      }
    }

    // Candles.
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: new THREE.Color('#ff9a2a').lerp(new THREE.Color('#fff0c0'), 1 - mood.warmth), emissiveIntensity: 2.6 });
    const halo = new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: 0.16, depthWrite: false });
    const wick = new THREE.MeshStandardMaterial({ color: '#1d1a18', roughness: 1 });
    let candleIndex = 0;
    const candle = (parent: THREE.Object3D, at: THREE.Vector3, tall: number, radius: number, tilt: number) => {
      const index = candleIndex++;
      const c = new THREE.Group();
      const material = waxAt(index);
      mesh(c, new THREE.CylinderGeometry(radius, radius * 1.08, tall, 12), material, [0, tall / 2, 0]);
      mesh(c, new THREE.SphereGeometry(1, 10, 6), material, [0, 0.02, 0]).scale.set(radius * 1.9, radius * 0.6, radius * 1.9);
      for (let i = 0; i < 2; i++) {
        const angle = random() * 6, len = Math.min(tall * 0.8, mix(0.1, 0.5, random()));
        mesh(c, new THREE.CylinderGeometry(radius * 0.28, radius * 0.18, len, 5), material, [Math.sin(angle) * radius, tall - len / 2, Math.cos(angle) * radius]);
      }
      mesh(c, new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), wick, [0, tall + 0.04, 0]).castShadow = false;
      const lit = a.flames === 'all' || (a.flames === 'one' && index === 0);
      if (lit) {
        const flame = mesh(c, new THREE.SphereGeometry(1, 10, 8), flameMat, [0, tall + 0.2, 0]);
        flame.scale.set(0.065, 0.17, 0.065);
        flame.castShadow = flame.receiveShadow = false;
        flames.push(flame);
        const glow = mesh(c, new THREE.SphereGeometry(0.34, 12, 8), halo, [0, tall + 0.2, 0]);
        glow.castShadow = glow.receiveShadow = false;
      } else if (a.flames === 'smoking') {
        const top = new THREE.Vector3(0, tall + 0.1, 0);
        const points = [top];
        for (let k = 1; k < 7; k++) points.push(new THREE.Vector3(Math.sin(k * 1.3 + index) * 0.07 * k, tall + 0.1 + k * 0.22, Math.cos(k * 0.9 + index) * 0.05 * k));
        const local = points.map((p) => p.clone());
        const smoke = strands([local], 0.02, new THREE.MeshBasicMaterial({ color: '#8d8a86', transparent: true, opacity: 0.35, depthWrite: false }), 4);
        smoke.castShadow = false;
        c.add(smoke);
      }
      c.position.copy(at);
      c.rotation.set(jitter(tilt), 0, jitter(tilt));
      parent.add(c);
    };
    const crownSpots = a.candles === 'one' ? [[0, 0]] : a.candles === 'three' ? [[0, -0.1], [-0.38, 0.12], [0.36, 0.2]] : a.candles === 'many' ? [[0, -0.15], [-0.4, 0.05], [0.4, 0.1], [0.05, 0.38], [-0.2, -0.5]] : [];
    crownSpots.forEach(([x, z], i) => {
      const v = new THREE.Vector3(x, 1, z).normalize();
      candle(skull.root, surface(v, 1.08), i === 0 ? mix(0.5, 1.5, random()) : mix(0.2, 1.0, random()), mix(0.1, 0.15, random()), 0.12);
    });
    if (a.candles === 'none') for (let i = 0; i < 3; i++) {
      const v = new THREE.Vector3(jitter(0.4), 1, jitter(0.4)).normalize();
      const stub = mesh(skull.root, new THREE.SphereGeometry(1, 10, 8), waxAt(i), surface(v, 1.1).toArray() as [number, number, number]);
      stub.scale.set(0.17, 0.1, 0.17);
      mesh(skull.root, new THREE.CylinderGeometry(0.012, 0.012, 0.09, 4), wick, surface(v, 1.2).toArray() as [number, number, number]);
    }
    if (a.candles === 'many') {
      const around = Math.round(mix(3, 7, mood.density));
      for (let i = 0; i < around; i++) {
        const angle = -1.9 + (i / (around - 1)) * 3.8 + jitter(0.15), r = Math.min(rim, mix(1.35, 1.9, random()));
        candle(g, new THREE.Vector3(Math.sin(angle) * r, floor, Math.cos(angle) * r * 0.7 - 0.2), mix(0.3, 1.5, random()), mix(0.1, 0.16, random()), 0.06);
      }
    }

    // Offerings.
    const front = (spreadX: number): [number, number, number] => [jitter(spreadX), floor + 0.03, Math.min(frontEdge - 0.2, mix(1.0, 1.5, random()))];
    const amount = Math.round(mix(3, 9, mood.density));
    const mouthAt = new THREE.Vector3(0.12, a.jawless ? -1.0 : -1.1, 0.8);
    if (a.offerings === 'coins') {
      const metals = ['#d2a640', '#a8a8a2', '#9a6238'].map((hex) => new THREE.MeshStandardMaterial({ color: hex, metalness: 0.85, roughness: 0.35 }));
      for (let i = 0; i < amount + 3; i++) {
        const at = front(1.5);
        const coin = mesh(g, new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), metals[i % 3], [at[0], at[1] + (i % 3) * 0.03, at[2]]);
        coin.rotation.x = jitter(0.2);
      }
    } else if (a.offerings === 'flowers') {
      const petals = (mood.cheer > 0.4 ? ['#f09a1c', '#d8344a', '#f4d03a'] : ['#b06a2a', '#7c2d3a', '#b9a25a']).map((hex) => s.material(hex, { roughness: 0.7 }));
      const stem = s.material('#4d7a3e');
      for (let i = 0; i < amount; i++) {
        const at = front(1.7);
        const flower = new THREE.Group();
        const bloom = mesh(flower, new THREE.IcosahedronGeometry(0.2, 0), petals[i % 3], [0, 0.12, 0]);
        bloom.scale.y = 0.7;
        const stalk = mesh(flower, new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5), stem, [0, 0.04, -0.5]);
        stalk.rotation.x = Math.PI / 2;
        flower.position.set(...at);
        flower.rotation.y = jitter(0.9);
        g.add(flower);
      }
    } else if (a.offerings === 'notes') {
      const paper = new THREE.MeshStandardMaterial({ color: '#efe8d2', roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < amount; i++) {
        const at = front(1.5);
        const note = new THREE.Group();
        for (const half of [-1, 1]) {
          const leaf = mesh(note, new THREE.BoxGeometry(0.34, 0.012, 0.46), paper, [half * 0.16, 0.05, 0]);
          leaf.rotation.z = half * -0.3;
        }
        note.position.set(...at);
        note.rotation.y = jitter(1.4);
        g.add(note);
      }
      const tucked = mesh(skull.root, new THREE.BoxGeometry(0.42, 0.03, 0.55), paper, mouthAt.toArray() as [number, number, number]);
      tucked.rotation.set(0.3, 0.2, 0.1);
    } else if (a.offerings === 'cigarettes') {
      const white = new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.8 }), filter = new THREE.MeshStandardMaterial({ color: '#c58a45', roughness: 0.8 });
      const cigarette = (parent: THREE.Object3D) => {
        const c = new THREE.Group();
        mesh(c, new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), white, [0, 0.12, 0]);
        mesh(c, new THREE.CylinderGeometry(0.041, 0.041, 0.24, 8), filter, [0, -0.3, 0]);
        parent.add(c);
        return c;
      };
      for (let i = 0; i < amount; i++) {
        const c = cigarette(g);
        const at = front(1.4);
        c.position.set(at[0], floor + 0.05, at[2]);
        c.rotation.set(Math.PI / 2, 0, jitter(1.2));
      }
      const smoked = cigarette(skull.root);
      smoked.position.copy(mouthAt).add(new THREE.Vector3(0.1, 0, 0.3));
      smoked.rotation.set(Math.PI / 2 - 0.25, 0, -0.3);
      mesh(smoked, new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff4a12', emissiveIntensity: 2 }), [0, 0.43, 0]);
    } else if (a.offerings === 'beads') {
      const colour = mood.cheer > 0.5 ? '#2f6fb0' : '#5a2f24';
      const n = 40;
      const string = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4 }), n);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        matrix.makeTranslation(Math.cos(angle) * 0.95 + 0.2, floor + 0.06, 1.05 + Math.sin(angle) * 0.32 + Math.sin(angle * 4) * 0.04);
        string.setMatrixAt(i, matrix);
      }
      string.castShadow = true;
      g.add(string);
      const medal = mesh(g, new THREE.CylinderGeometry(0.17, 0.17, 0.03, 14), new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.9, roughness: 0.3 }), [0.2, floor + 0.04, Math.min(frontEdge - 0.15, 1.5)]);
      medal.scale.z = 1.3;
    }

    const flicker = mix(1.2, 10, mood.energy), sway = mix(0.04, 0.3, mood.energy);
    return s.finish({
      update: flames.length ? (_dt, time) => {
        flames.forEach((flame, i) => {
          const f = 1 + Math.sin(time * flicker + i * 1.7) * 0.14 + Math.sin(time * flicker * 2.3 + i) * 0.08;
          flame.scale.set(0.065 * (2 - f), 0.17 * f, 0.065 * (2 - f));
          flame.rotation.z = Math.sin(time * flicker * 0.6 + i * 2.1) * sway;
        });
      } : undefined,
    });
  },
});

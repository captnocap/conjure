import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { instanced, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

type P3 = [number, number, number];

function taperedTube(points: P3[], r0: number, r1: number, material: THREE.Material, tubular = 14, radial = 9) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    curve.getPointAt(i / tubular, centre);
    const r = mix(r0, r1, i / tubular);
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      v.fromBufferAttribute(position, index).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(index, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return solid(geometry, material);
}

export default defineThing({
  questions: {
    form: choice('What shape is the figure?', {
      forked: 'A branch fork turned upside down: two straddled legs, a trunk body, a knob of a head.',
      arms: 'A post whose fork makes two arms flung up to the sky, the face carved below them.',
      plank: 'A flat plank cut to a silhouette: round head, notched neck, a body tapering to a point.',
      pole: 'A thin notched pole with a small head on a long neck.',
      twins: 'Two heads on two necks rising from one trunk.',
    }),
    stature: score('How big is it?', ['A figurine you could hold', 'The height of a child', 'Taller than a person']),
    eyes: choice('What are its eyes?', {
      quartz: 'Two white quartz pebbles, startlingly bright in the black wood.',
      'one-lost': 'One quartz eye; the other socket is empty.',
      hollow: 'Empty drilled sockets.',
      amber: 'Beads of amber that catch the light like something alive.',
      shell: 'Discs of pale shell with dark pupils, wide and staring.',
    }),
    face: choice('What expression was it given?', {
      blank: 'None: a straight slit of a mouth, unreadable.',
      howl: 'A round open mouth, calling or screaming.',
      smile: 'A faint upturned cut, which is worse.',
      grim: 'A down-turned gash and a heavy brow.',
    }),
    setting: choice('What is it standing in?', {
      cairn: 'A small cairn of stones heaped round its feet.',
      wicker: 'A ring of stakes and woven wickerwork, a little shrine or cage.',
      pool: 'A black peat pool, among cotton grass.',
      trackway: 'Beside a trackway of split logs laid across the bog.',
      museum: 'A museum mount: a dark plinth, a steel support and a small label.',
    }),
    offerings: choice('What has been left for it?', {
      nothing: 'Nothing.',
      butter: 'A wooden keg of bog butter and a pair of pots.',
      bones: 'Antlers and animal skulls.',
      weapons: 'A bent sword and spearheads, deliberately broken.',
      rods: 'Bundles of hazel rods and white pebbles.',
      rags: 'Fresh flowers and strips of cloth: someone still comes.',
    }),
    state: choice('What condition is it in?', {
      upright: 'Standing straight, as it was set up.',
      leaning: 'Leaning at a drunken angle, sinking.',
      toppled: 'Fallen and lying across its stones.',
      unearthed: 'Just dug out of the peat: wet, glistening, a spade and cut turves beside it.',
      cracked: 'Dried out and split along the grain, shrinking, pale cracks down its length.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(0.3, 2.2, a.stature) * mix(0.92, 1.08, random());
    const wet = a.state === 'unearthed' || a.setting === 'pool';
    const wood = new THREE.MeshStandardMaterial({
      color: new THREE.Color(a.state === 'cracked' ? '#4a3a2e' : '#33261e').lerp(new THREE.Color('#6a5a4c'), mood.wear * 0.15),
      roughness: wet ? 0.3 : 0.7,
    });
    const cut = new THREE.MeshStandardMaterial({ color: '#0c0908', roughness: 1 });
    const figure = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, at: P3 = [0, 0, 0]) => { node.position.set(...at); figure.add(node); return node; };
    const bend = (random() - 0.5) * 0.08 * H;

    interface Head { at: P3; w: number; h: number; d: number }
    const heads: Head[] = [];
    const head = (at: P3, w: number, h: number, d = w * 0.9) => {
      const mesh = add(solid(new THREE.SphereGeometry(1, 16, 12), wood), at);
      mesh.scale.set(w, h, d);
      heads.push({ at, w, h, d });
    };
    const notch = (y: number, r: number, x = 0) => { const ring = add(solid(new THREE.TorusGeometry(r, r * 0.12, 5, 16), cut), [x, y, 0]); ring.rotation.x = Math.PI / 2; };

    if (a.form === 'forked') {
      for (const side of [-1, 1]) add(taperedTube([[side * 0.15 * H, -0.05 * H, 0], [side * 0.11 * H, 0.2 * H, 0.01 * H], [side * 0.02 * H, 0.45 * H, 0]], 0.045 * H, 0.068 * H, wood));
      add(taperedTube([[0, 0.4 * H, 0], [bend, 0.6 * H, 0], [0, 0.8 * H, 0]], 0.09 * H, 0.055 * H, wood));
      head([0, 0.9 * H, 0], 0.105 * H, 0.135 * H);
      for (const y of [0.52, 0.58, 0.64]) notch(y * H, 0.083 * H - (y - 0.52) * 0.1 * H, bend * 0.8);
    } else if (a.form === 'arms') {
      add(taperedTube([[0, -0.05 * H, 0], [bend, 0.3 * H, 0], [0, 0.58 * H, 0]], 0.085 * H, 0.08 * H, wood));
      for (const side of [-1, 1]) add(taperedTube([[side * 0.02 * H, 0.52 * H, -0.02 * H], [side * 0.14 * H, 0.72 * H, -0.03 * H], [side * mix(0.2, 0.3, random()) * H, 1.0 * H, 0]], 0.06 * H, 0.025 * H, wood));
      head([0, 0.61 * H, 0.02 * H], 0.11 * H, 0.135 * H);
      for (const y of [0.3, 0.36]) notch(y * H, 0.088 * H, bend * 0.9);
    } else if (a.form === 'plank') {
      const u = H;
      const outline = new THREE.Shape();
      outline.moveTo(0, 0); outline.lineTo(0.09 * u, 0.2 * u); outline.lineTo(0.13 * u, 0.62 * u); outline.lineTo(0.12 * u, 0.7 * u);
      outline.lineTo(0.045 * u, 0.72 * u); outline.lineTo(0.045 * u, 0.76 * u);
      outline.absarc(0, 0.87 * u, 0.115 * u, -1.15, Math.PI + 1.15, false);
      outline.lineTo(-0.045 * u, 0.72 * u); outline.lineTo(-0.12 * u, 0.7 * u); outline.lineTo(-0.13 * u, 0.62 * u); outline.lineTo(-0.09 * u, 0.2 * u); outline.closePath();
      const plank = add(solid(new THREE.ExtrudeGeometry(outline, { depth: 0.05 * u, bevelEnabled: true, bevelSize: 0.008 * u, bevelThickness: 0.008 * u, bevelSegments: 2 }), wood), [0, -0.05 * H, -0.025 * u]);
      plank.castShadow = true;
      heads.push({ at: [0, 0.82 * H, 0.02 * u], w: 0.115 * u, h: 0.115 * u, d: 0.02 * u });
      for (const y of [0.36, 0.44, 0.52]) add(solid(new THREE.BoxGeometry(0.2 * u, 0.012 * u, 0.012 * u), cut), [0, y * H, 0.036 * u]);
    } else if (a.form === 'pole') {
      add(taperedTube([[0, -0.05 * H, 0], [bend, 0.4 * H, 0], [0, 0.82 * H, 0]], 0.05 * H, 0.03 * H, wood));
      head([0, 0.91 * H, 0], 0.075 * H, 0.115 * H);
      for (let i = 0; i < 9; i++) notch((0.12 + i * 0.07) * H, (0.05 - i * 0.002) * H, bend * Math.sin((i / 9) * Math.PI));
    } else {
      add(taperedTube([[0, -0.05 * H, 0], [bend, 0.25 * H, 0], [0, 0.5 * H, 0]], 0.095 * H, 0.085 * H, wood));
      for (const side of [-1, 1]) {
        const top = mix(0.74, 0.86, random());
        add(taperedTube([[side * 0.02 * H, 0.45 * H, 0], [side * 0.12 * H, 0.62 * H, 0], [side * 0.15 * H, (top - 0.06) * H, 0]], 0.06 * H, 0.04 * H, wood));
        head([side * 0.16 * H, top * H, 0], 0.085 * H, 0.11 * H);
      }
      for (const y of [0.2, 0.27, 0.34]) notch(y * H, 0.094 * H, bend * 0.8);
    }

    // Faces.
    const eyeTint = { quartz: '#f6f3ea', 'one-lost': '#f6f3ea', hollow: '#0c0908', amber: '#e08a1e', shell: '#efe6d2' }[a.eyes];
    const eyeGlow = a.eyes === 'amber' ? '#c8640a' : '#8a8880';
    const eyePaint = new THREE.MeshStandardMaterial({ color: eyeTint, roughness: 0.25, emissive: a.eyes === 'hollow' ? '#000000' : eyeGlow, emissiveIntensity: a.eyes === 'hollow' ? 0 : mix(0.75, 0.2, mood.cheer) });
    heads.forEach((hd, index) => {
      const [hx, hy, hz] = hd.at;
      const front = hz + hd.d * 0.86;
      for (const side of [-1, 1]) {
        const lost = a.eyes === 'hollow' || (a.eyes === 'one-lost' && side === (index % 2 ? -1 : 1));
        const r = hd.w * (a.eyes === 'shell' ? 0.36 : 0.29);
        const eye = add(solid(new THREE.SphereGeometry(1, 12, 8), lost ? cut : eyePaint), [hx + side * hd.w * 0.44, hy + hd.h * 0.16, front - hd.d * 0.06]);
        eye.scale.set(r, r, lost ? r * 0.3 : r * (a.eyes === 'shell' ? 0.35 : 0.7));
        if (a.eyes === 'shell' && !lost) add(solid(new THREE.SphereGeometry(r * 0.35, 8, 6), cut), [hx + side * hd.w * 0.42, hy + hd.h * 0.16, front + r * 0.22]);
      }
      const nose = add(solid(new THREE.BoxGeometry(hd.w * 0.16, hd.h * 0.42, hd.w * 0.2), wood), [hx, hy - hd.h * 0.02, front + hd.w * 0.04]);
      nose.rotation.x = -0.15;
      const my = hy - hd.h * 0.5, mz = front - hd.d * 0.1;
      if (a.face === 'howl') { const mouth = add(solid(new THREE.SphereGeometry(1, 10, 8), cut), [hx, my, mz]); mouth.scale.set(hd.w * 0.26, hd.h * 0.2, hd.w * 0.12); }
      else {
        const curve = a.face === 'smile' ? 1 : a.face === 'grim' ? -1 : 0;
        for (const part of [-1, 0, 1]) {
          const bit = add(solid(new THREE.BoxGeometry(hd.w * 0.26, hd.h * 0.06, hd.w * 0.08), cut), [hx + part * hd.w * 0.22, my + Math.abs(part) * curve * hd.h * 0.07, mz - Math.abs(part) * hd.w * 0.06]);
          bit.rotation.z = part * curve * 0.4;
          bit.rotation.y = part * 0.45;
        }
      }
      if (a.face === 'grim') { const brow = add(solid(new THREE.BoxGeometry(hd.w * 1.5, hd.h * 0.12, hd.w * 0.22), wood), [hx, hy + hd.h * 0.38, front - hd.d * 0.08]); brow.rotation.x = 0.2; }
    });

    // Drying cracks: pale splits running with the grain.
    if (a.state === 'cracked' || mood.wear > 0.7) {
      const split = new THREE.MeshStandardMaterial({ color: '#b39a78', roughness: 1 });
      const n = a.state === 'cracked' ? 9 : 4;
      for (let i = 0; i < n; i++) {
        const angle = mix(-1.1, 1.1, random()), y = mix(0.12, 0.75, random()) * H, len = mix(0.08, 0.22, random()) * H;
        const reach = (a.form === 'plank' ? 0.03 : a.form === 'pole' ? 0.045 : 0.085) * H;
        const crack = add(solid(new THREE.BoxGeometry(0.007 * H, len, 0.007 * H), split), [Math.sin(angle) * reach * (a.form === 'plank' ? 3 : 1), y, a.form === 'plank' ? reach : Math.cos(angle) * reach]);
        crack.castShadow = false;
      }
    }

    // How it stands.
    const lean = a.state === 'leaning' ? mix(0.25, 0.42, random()) * (random() < 0.5 ? -1 : 1) : (random() - 0.5) * 0.06 + (mood.wear - 0.5) * 0.05;
    const baseR = H * 0.34;
    if (a.state === 'toppled') {
      figure.rotation.set(-Math.PI / 2 + 0.16, 0, mix(-0.5, 0.5, random()), 'YXZ');
      figure.rotation.y = mix(-0.6, 0.6, random());
      figure.position.set(0, H * 0.2, -H * 0.1);
    } else { figure.rotation.z = lean; figure.rotation.x = (random() - 0.5) * 0.06; figure.position.y = a.setting === 'museum' ? H * 0.16 : H * 0.05; }
    s.root.add(figure);

    // Where it stands.
    const rockTint = new THREE.Color('#8f8a80');
    const stones = (count: number, radius: number, heap: number, size: number) => {
      const dabs: Dab[] = [];
      for (let i = 0; i < count; i++) {
        const angle = random() * 6.28, out = Math.sqrt(random());
        const u = size * mix(0.7, 1.3, random());
        dabs.push({ at: [Math.cos(angle) * out * radius, (1 - out) * heap + u * 0.1, Math.sin(angle) * out * radius], scale: [u, u * mix(0.5, 0.8, random()), u * mix(0.7, 1, random())], turn: [random() * 0.6, random() * 6, random() * 0.6], color: random() < 0.15 ? '#e9e5da' : undefined });
      }
      const mesh = instanced(stoneGeometry(random, { size: [1, 1, 1], round: 0.55, rough: 0.07, base: rockTint, patches: [{ color: '#b8bd9c', amount: 0.4, scale: 2 }], segments: 5 }), stoneMaterial(), dabs);
      s.root.add(mesh);
    };
    const ground: [number, number, number][] = [];
    if (a.setting === 'cairn') stones(Math.round(mix(22, 60, mood.density)), baseR, H * 0.17, H * 0.075);
    if (a.setting === 'wicker') {
      const stake = s.material('#6b5236'), withy = s.material('#8a6c44');
      const n = 11, rr = baseR * 1.05, hh = H * mix(0.3, 0.42, random());
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        if (Math.abs(angle - Math.PI / 2) < 0.5) continue;
        s.rod([Math.cos(angle) * rr, 0, Math.sin(angle) * rr], [Math.cos(angle) * rr * 1.03, hh * mix(0.95, 1.2, random()), Math.sin(angle) * rr * 1.03], H * 0.014, stake, H * 0.009);
      }
      for (let band = 0; band < 5; band++) {
        const weave = s.ring(rr * (band % 2 ? 1.03 : 0.98), H * 0.012, [0, hh * (0.15 + band * 0.17), 0], withy, Math.PI * 1.62);
        weave.rotation.set(Math.PI / 2, 0, Math.PI * 0.69 + band * 0.02);
      }
      stones(12, baseR * 0.5, H * 0.05, H * 0.06);
    }
    if (a.setting === 'pool') {
      const pool = s.cylinder(baseR * 1.25, baseR * 1.25, 0.012, [0, 0.008, 0], new THREE.MeshStandardMaterial({ color: mood.daylight > 0.8 ? '#5a3a2c' : '#20242a', roughness: 0.05, metalness: 0.6 }), 28);
      pool.scale.set(1.2, 1, 0.9);
      pool.castShadow = false;
      const peat = s.material('#2d231c', { roughness: 1 });
      for (let i = 0; i < 6; i++) { const angle = i * 1.05 + random() * 0.5; const hag = s.ball([baseR * mix(0.35, 0.6, random()), H * 0.05, baseR * mix(0.3, 0.5, random())], [Math.cos(angle) * baseR * 1.45, 0.01, Math.sin(angle) * baseR * 1.1], peat, 10); hag.rotation.y = random() * 3; ground.push([hag.position.x, H * 0.04, hag.position.z]); }
      stones(7, baseR * 0.4, H * 0.03, H * 0.05);
    }
    if (a.setting === 'trackway') {
      const timber = [s.material('#4a3b2d'), s.material('#5c4a38'), s.material('#3d3026')];
      const n = 9, len = baseR * 3.4;
      for (let i = 0; i < n; i++) {
        const z = baseR * 0.75 + i * H * 0.085;
        const log = s.cylinder(H * 0.04, H * 0.04, len * mix(0.85, 1, random()), [(random() - 0.5) * H * 0.1, H * 0.03, z], timber[i % 3], 8);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = (random() - 0.5) * 0.08;
        log.scale.z = 0.6;
      }
      for (const side of [-1, 1]) s.rod([side * len * 0.42, 0, baseR * 0.6], [side * len * 0.42, H * 0.16, baseR * 0.6], H * 0.018, timber[0]);
      stones(14, baseR * 0.55, H * 0.08, H * 0.06);
    }
    if (a.setting === 'museum') {
      s.box([baseR * 2.3, H * 0.16, baseR * 1.7], [0, H * 0.08, 0], new THREE.MeshStandardMaterial({ color: '#25272b', roughness: 0.5 }));
      const steel = s.material('#c0c4c8', { metalness: 0.85, roughness: 0.25 });
      if (a.state !== 'toppled') {
        s.rod([0, H * 0.16, -H * 0.12], [0, H * 0.62, -H * 0.12], H * 0.012, steel);
        const clasp = s.ring(H * 0.1, H * 0.008, [0, H * 0.62, 0], steel, Math.PI);
        clasp.rotation.set(Math.PI / 2, 0, Math.PI);
      }
      const card = s.label('IDOL · OAK · c. 600 BC', baseR * 1.1, baseR * 0.3, [baseR * 0.45, H * 0.165, baseR * 0.62], '#2a2a2a', '#f3f0e6');
      card.rotation.x = -Math.PI / 2 + 0.5;
      card.position.y += baseR * 0.1;
    }

    // Offerings.
    const oy = a.setting === 'museum' ? H * 0.16 : 0;
    const ox = baseR * 0.95, oz = baseR * 0.75;
    const u = Math.max(0.12, H * 0.28);
    if (a.offerings === 'butter') {
      const keg = s.material('#6a4f34'), butter = s.material('#e6d79a', { roughness: 0.5 });
      s.cylinder(u * 0.3, u * 0.26, u * 0.5, [ox, oy + u * 0.25, oz], keg, 14);
      s.cylinder(u * 0.27, u * 0.27, u * 0.04, [ox, oy + u * 0.5, oz], butter, 14);
      for (const y of [0.1, 0.38]) s.ring(u * 0.295, u * 0.014, [ox, oy + u * y, oz], s.material('#3a2c1f')).rotation.x = Math.PI / 2;
      const clay = s.material('#8a5a3c');
      for (const [px, pz, k] of [[-ox, oz, 1], [-ox * 0.6, oz * 1.5, 0.7]] as const) s.lathe([[0.001, 0], [0.14 * u * k, 0], [0.22 * u * k, 0.14 * u * k], [0.18 * u * k, 0.3 * u * k], [0.2 * u * k, 0.33 * u * k]], clay, [px, oy, pz]);
    } else if (a.offerings === 'bones') {
      const bone = s.material('#ddd0b4');
      for (const side of [-1, 1]) {
        const base: P3 = [side * ox, oy + u * 0.06, oz];
        const beam = taperedTube([base, [base[0] + side * u * 0.3, base[1] + u * 0.05, oz + u * 0.25], [base[0] + side * u * 0.7, base[1] + u * 0.1, oz + u * 0.2]], u * 0.045, u * 0.03, bone);
        s.root.add(beam);
        for (const t of [0.25, 0.55, 0.9]) s.root.add(taperedTube([[base[0] + side * u * 0.7 * t, base[1] + u * 0.05, oz + u * 0.2], [base[0] + side * u * (0.7 * t + 0.08), base[1] + u * 0.25, oz + u * 0.22], [base[0] + side * u * (0.7 * t + 0.14), base[1] + u * 0.42, oz + u * 0.16]], u * 0.03, u * 0.006, bone, 8));
      }
      const skull = s.ball([u * 0.16, u * 0.12, u * 0.24], [0, oy + u * 0.12, baseR * 1.2], bone, 12);
      skull.rotation.y = random() - 0.5;
      for (const side of [-1, 1]) s.ball([u * 0.035, u * 0.035, u * 0.035], [side * u * 0.09, oy + u * 0.16, baseR * 1.2 + u * 0.14], cut, 8);
    } else if (a.offerings === 'weapons') {
      const bronze = s.material('#a8873e', { metalness: 0.7, roughness: 0.4 });
      // A sword laid down and bent double so nobody could use it again.
      const flat = s.box([u * 0.75, u * 0.018, u * 0.085], [-ox * 0.35, oy + u * 0.02, oz * 1.45], bronze);
      flat.rotation.y = 0.2;
      const bent = s.box([u * 0.5, u * 0.018, u * 0.075], [ox * 0.2, oy + u * 0.19, oz * 1.36], bronze);
      bent.rotation.set(0, 0.2, 0.75, 'YXZ');
      s.box([u * 0.22, u * 0.04, u * 0.05], [-ox * 0.35 - u * 0.47, oy + u * 0.025, oz * 1.45 + u * 0.095], s.material('#3d3026')).rotation.y = 0.2;
      for (let i = 0; i < 3; i++) { const spear = s.mesh(new THREE.ConeGeometry(u * 0.06, u * 0.36, 4), bronze, [ox * (0.7 + i * 0.25), oy + u * 0.025, oz * (0.6 + i * 0.35)]); spear.rotation.set(Math.PI / 2, 0, random() * 3); spear.scale.z = 0.25; }
    } else if (a.offerings === 'rods') {
      const hazel = s.material('#9a7b4f');
      for (let b = 0; b < 2; b++) {
        const bx = (b ? -1 : 1) * ox, turn = random() * 0.8 - 0.4;
        for (let i = 0; i < 8; i++) s.rod([bx - Math.cos(turn) * u * 0.7, oy + u * 0.03 + (i % 3) * u * 0.03, oz + (i - 4) * u * 0.02 - Math.sin(turn) * u * 0.7], [bx + Math.cos(turn) * u * 0.7, oy + u * 0.03 + (i % 3) * u * 0.03, oz + (i - 4) * u * 0.02 + Math.sin(turn) * u * 0.7], u * 0.014, hazel);
        s.ring(u * 0.055, u * 0.01, [bx, oy + u * 0.05, oz], s.material('#3d3026')).rotation.y = Math.PI / 2 - turn;
      }
      const pebbles: Dab[] = [];
      for (let i = 0; i < 12; i++) pebbles.push({ at: [(random() - 0.5) * baseR * 1.6, oy + u * 0.03, baseR * mix(0.9, 1.4, random())], scale: [u * 0.05, u * 0.035, u * 0.045] });
      s.root.add(instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.35 }), pebbles));
    } else if (a.offerings === 'rags') {
      const petals: Dab[] = [];
      const tints = mood.cheer > 0.4 ? ['#e8c22a', '#d9486b', '#f1ede2', '#8a5bd0'] : ['#f1ede2', '#b9b4a6', '#7d5a8c'];
      for (let i = 0; i < Math.round(mix(14, 40, mood.density)); i++) petals.push({ at: [(random() - 0.5) * baseR * 2, oy + u * mix(0.04, 0.12, random()), baseR * mix(0.7, 1.4, random())], scale: u * mix(0.04, 0.07, random()), color: tints[Math.floor(random() * tints.length)] });
      s.root.add(instanced(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), petals));
      if (a.state !== 'toppled') {
        // Strips of cloth knotted round the neck or a limb.
        const cloths = ['#c8321f', '#f1ede2', '#3d6aa8', '#e8c22a'];
        for (let i = 0; i < 3; i++) {
          const strip = solid(new THREE.BoxGeometry(H * 0.03, H * mix(0.14, 0.24, random()), H * 0.004), new THREE.MeshStandardMaterial({ color: cloths[Math.floor(random() * cloths.length)], roughness: 0.9, side: THREE.DoubleSide }));
          const anchor = heads[0].at;
          add(strip, [anchor[0] + (i - 1) * H * 0.045, anchor[1] - heads[0].h - H * 0.09, anchor[2] + heads[0].d * 0.7 + H * 0.02]);
          strip.rotation.z = (i - 1) * 0.25;
        }
      }
    }

    if (a.state === 'unearthed') {
      const peat = s.material('#2a2019', { roughness: 0.6 });
      for (let i = 0; i < 5; i++) { const sod = s.box([u * 0.5, u * 0.22, u * 0.32], [-baseR * 1.5 + (i % 2) * u * 0.1, oy + u * 0.11 + Math.floor(i / 2) * u * 0.22, -baseR * 0.3 + (i % 2) * u * 0.36], peat); sod.rotation.y = (random() - 0.5) * 0.3; }
      const iron = s.material('#3b3d40', { metalness: 0.6, roughness: 0.5 }), handle = s.material('#8b6b45');
      const sx = baseR * 1.45, sz = -baseR * 0.2;
      s.rod([sx, oy + u * 0.2, sz], [sx + u * 0.25, oy + u * 1.5, sz - u * 0.1], u * 0.035, handle);
      s.box([u * 0.3, u * 0.42, u * 0.03], [sx - u * 0.035, oy + u * 0.12, sz + u * 0.015], iron).rotation.z = -0.18;
      s.box([u * 0.24, u * 0.05, u * 0.05], [sx + u * 0.25, oy + u * 1.5, sz - u * 0.1], handle);
    }

    if (a.setting !== 'museum') {
      const green = mood.warmth < 0.3 ? ['#a9bdb0', '#8fa894'] : ['#6b6a3a', '#7d7a45', '#4f5a34'];
      for (let i = 0; i < Math.round(mix(14, 44, mood.density)); i++) { const angle = random() * 6.28, d = baseR * mix(1.0, 1.7, random()); ground.push([Math.cos(angle) * d, 0, Math.sin(angle) * d]); }
      s.root.add(tufts(random, ground, green, Math.max(0.04, H * 0.075)));
      if (a.setting === 'pool') {
        const cotton: Dab[] = ground.slice(0, 14).map(([x, y, z]) => ({ at: [x + H * 0.02, y + H * 0.13, z] as const, scale: H * 0.022 }));
        s.root.add(instanced(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#f6f4ec', roughness: 1 }), cotton));
      }
    }

    // A marsh light keeps it company when the mood is low.
    let wisp: THREE.Mesh | null = null;
    if (mood.cheer < 0.4 && a.setting !== 'museum') {
      wisp = new THREE.Mesh(new THREE.SphereGeometry(H * 0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#c9f2d8', transparent: true, opacity: 0.85, depthWrite: false }));
      wisp.position.set(baseR * 1.3, H * 0.5, baseR * 0.4);
      s.root.add(wisp);
    }
    const speed = mix(0.4, 2, mood.energy);
    return s.finish({
      footprint: Math.max(baseR * 1.4, 0.2),
      update: wisp ? (_dt, time) => { wisp!.position.y = H * (0.5 + Math.sin(time * speed) * 0.06); wisp!.position.x = baseR * (1.3 + Math.sin(time * speed * 0.6) * 0.15); } : undefined,
    });
  },
});

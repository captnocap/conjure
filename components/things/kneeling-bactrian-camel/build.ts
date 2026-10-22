import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    doing: choice('What is the camel doing?', {
      chewing: 'Head up, gazing at nothing, jaw working sideways on its cud.',
      sleeping: 'Neck stretched flat along the ground, eyes shut, done for the day.',
      bellowing: 'Head thrown back, mouth open, roaring a complaint about the load.',
      watching: 'Neck curved round to look back at whoever is behind it.',
    }),
    load: choice('What is on its back?', {
      bare: 'Nothing at all: just the animal.',
      saddle: 'An empty wooden pack saddle on felt pads, the load already taken off.',
      laden: 'A full load: corded bales slung either side and a roll across the top.',
      towering: 'Loaded absurdly high: bales, a chest, tent poles, a kettle, a rolled carpet on the very top.',
      unloading: 'Half unloaded: one side still hangs heavy while the other side\'s bales stand on the ground beside it.',
      riding: 'A riding seat: cushions between the humps and a pair of saddlebags.',
    }),
    coat: choice('What is its coat like?', {
      sandy: 'Sandy tan with a darker shaggy mane, the usual camel.',
      dark: 'Dark chocolate brown, heavy winter wool.',
      white: 'Pale cream, almost white: a lucky animal, a chief\'s gift.',
      moulting: 'Mid-moult: wool hanging off in ragged dark mats over bare patches.',
    }),
    condition: choice('How well has the road treated it?', {
      fat: 'Fresh and well fed: both humps tall and firm.',
      worked: 'Hard worked: humps smaller and beginning to lean.',
      spent: 'Spent by the desert: both humps emptied and flopped over to one side.',
    }),
    cloth: choice('If it wears a saddle cloth, what is the cloth?', {
      stripes: 'Red, cream and black tribal stripes.',
      indigo: 'Indigo blue with white diamonds.',
      felt: 'Plain undyed felt with a dark bound edge.',
      crimson: 'Crimson with gold medallions and a fringe of tassels, a rich merchant\'s pride.',
    }),
    gear: choice('What is on its head and neck?', {
      none: 'Nothing.',
      peg: 'A nose peg with a lead rope running to a stake in the ground.',
      bell: 'A collar with a big brass caravan bell.',
      pompoms: 'A headstall and neck garland of bright wool pompoms.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const C = new THREE.Group();
    s.root.add(C);

    const coatHex = { sandy: '#c29a62', dark: '#5e4028', white: '#e6dcc4', moulting: '#b89466' }[a.coat];
    const furHex = { sandy: '#6e4a2a', dark: '#33221a', white: '#b9a784', moulting: '#4a3220' }[a.coat];
    const coat = s.material(coatHex, { roughness: 1 });
    const fur = s.material(furHex, { roughness: 1 });
    const darkSkin = s.material('#2a211b', { roughness: 0.8 });
    const wood = s.material('#8a6540');
    const ropeMat = s.material('#c2a56e');
    const brass = new THREE.MeshStandardMaterial({ color: '#d9aa3c', metalness: 0.55, roughness: 0.3, emissive: '#5a3d0c', emissiveIntensity: 0.4 });

    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0], parent: THREE.Object3D = C) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const unit = new THREE.SphereGeometry(1, 16, 12), rough = new THREE.DodecahedronGeometry(1, 1);
    const ball = (size: P3, at: P3, material: THREE.Material, parent: THREE.Object3D = C, geometry: THREE.BufferGeometry = unit) => {
      const mesh = put(geometry, material, at, parent);
      mesh.scale.set(...size);
      return mesh;
    };
    const rod = (from: P3, to: P3, r0: number, r1: number, material: THREE.Material, parent: THREE.Object3D = C) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = put(new THREE.CylinderGeometry(r1, r0, d.length(), 10), material, p.add(q).multiplyScalar(0.5).toArray() as P3, parent);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const tube = (points: P3[], radius: number, material: THREE.Material, parent: THREE.Object3D = C) =>
      put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 24, radius, 6), material, [0, 0, 0], parent);

    // Barrel of the body, lying along x with the chest at +x.
    const barrel = new THREE.LatheGeometry([[0, -1.0], [0.2, -0.97], [0.36, -0.75], [0.43, -0.35], [0.45, 0.1], [0.42, 0.5], [0.33, 0.8], [0.18, 0.96], [0, 1.0]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
    barrel.rotateZ(-Math.PI / 2);
    put(barrel, coat, [0, 0.56, 0]).scale.set(1, 1, 0.88);
    ball([0.3, 0.33, 0.3], [0.8, 0.6, 0], coat);

    // Humps.
    const humpH = { fat: 0.66, worked: 0.5, spent: 0.42 }[a.condition];
    const flopSide = random() < 0.5 ? -1 : 1;
    [-0.4, 0.28].forEach((x, index) => {
      const h = humpH * mix(0.9, 1.08, random()) * (index ? 1 : 0.94);
      const g = new THREE.Group();
      g.position.set(x, 0.9, 0);
      const profile: [number, number][] = [[0.31, -0.08], [0.3, h * 0.2], [0.24, h * 0.55], [0.15, h * 0.82], [0.06, h * 0.96], [0, h]];
      put(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14), coat, [0, 0, 0], g).scale.set(1.05, 1, 0.78);
      ball([0.13, 0.09, 0.11], [0, h * 0.95, 0], fur, g, rough);
      if (a.coat !== 'white') ball([0.2, 0.1, 0.16], [0, h * 0.72, 0], fur, g, rough);
      const lean = { fat: 0, worked: 0.28, spent: 1.15 }[a.condition];
      g.rotation.x = flopSide * lean * mix(0.8, 1.1, random());
      g.rotation.z = (random() - 0.5) * 0.12 + (index ? -0.06 : 0.06);
      if (a.condition === 'spent') g.scale.set(1, 1, 0.7);
      C.add(g);
    });

    // Folded legs: forearms forward to the knees, cannons tucked back; hind hocks out behind.
    const legMat = s.material(new THREE.Color(coatHex).multiplyScalar(0.9), { roughness: 1 });
    for (const side of [-1, 1]) {
      const z = side * 0.27;
      rod([0.66, 0.46, z], [1.04, 0.14, z * 1.08], 0.115, 0.08, legMat);
      ball([0.095, 0.095, 0.09], [1.05, 0.12, z * 1.08], legMat);
      ball([0.09, 0.05, 0.08], [1.07, 0.06, z * 1.08], darkSkin);
      rod([1.03, 0.08, z * 1.12], [0.6, 0.065, z * 1.3], 0.06, 0.05, legMat);
      ball([0.1, 0.05, 0.085], [0.56, 0.05, z * 1.32], legMat);
      ball([0.13, 0.1, 0.1], [0.72, 0.4, z * 1.05], fur, C, rough);
      ball([0.42, 0.36, 0.2], [-0.6, 0.5, side * 0.3], coat);
      rod([-0.3, 0.3, side * 0.4], [-1.0, 0.14, side * 0.43], 0.1, 0.065, legMat);
      ball([0.08, 0.08, 0.075], [-1.01, 0.13, side * 0.43], legMat);
      rod([-1.0, 0.09, side * 0.44], [-0.5, 0.06, side * 0.48], 0.055, 0.05, legMat);
      ball([0.1, 0.05, 0.085], [-0.46, 0.05, side * 0.49], legMat);
    }

    // Tail.
    const tail = new THREE.Group();
    tail.position.set(-0.97, 0.74, 0);
    rod([0, 0, 0], [-0.12, -0.36, 0], 0.035, 0.018, coat, tail);
    ball([0.045, 0.09, 0.045], [-0.14, -0.42, 0], fur, tail, rough);
    C.add(tail);

    // Neck and head by pose.
    const poses: Record<typeof a.doing, { neck: P3[]; yaw: number; pitch: number }> = {
      chewing: { neck: [[0.82, 0.68, 0], [1.16, 0.74, 0], [1.36, 1.1, 0], [1.3, 1.58, 0], [1.36, 1.82, 0]], yaw: (random() - 0.5) * 0.5, pitch: 0.06 },
      sleeping: { neck: [[0.82, 0.62, 0], [1.15, 0.46, 0.02], [1.55, 0.26, 0.06], [1.92, 0.2, 0.1]], yaw: -0.15, pitch: -0.04 },
      bellowing: { neck: [[0.82, 0.68, 0], [1.12, 0.82, 0], [1.26, 1.3, 0], [1.14, 1.74, 0], [1.1, 1.94, 0]], yaw: 0, pitch: 0.85 },
      watching: { neck: [[0.82, 0.68, 0], [1.16, 0.78, 0.06], [1.32, 1.2, 0.2], [1.2, 1.6, 0.42], [1.1, 1.74, 0.54]], yaw: -2.1, pitch: 0.02 },
    };
    const pose = poses[a.doing];
    const curve = new THREE.CatmullRomCurve3(pose.neck.map((p) => new THREE.Vector3(...p)));
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPoint(t), r = mix(0.215, 0.1, t ** 0.75);
      ball([r, r, r * 0.82], p.toArray() as P3, coat);
      // The Bactrian's throat mane.
      if (i > 4 && i < N - 1 && i % 2 === 0) {
        const tangent = curve.getTangent(t), under = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize();
        if (under.y > 0.3) under.negate();
        const shag = a.coat === 'dark' ? 1.25 : 1;
        ball([r * 0.7 * shag, r * 0.9 * shag, r * 0.5], p.clone().addScaledVector(under, r * 0.7).toArray() as P3, fur, C, rough);
      }
    }
    const head = new THREE.Group();
    head.position.copy(curve.getPoint(1));
    head.rotation.order = 'YZX';
    head.rotation.y = pose.yaw;
    head.rotation.z = pose.pitch;
    head.scale.setScalar(1.32);
    C.add(head);
    ball([0.17, 0.115, 0.105], [0.07, 0.02, 0], coat, head);
    ball([0.14, 0.085, 0.085], [0.24, -0.025, 0], coat, head);
    ball([0.06, 0.055, 0.08], [0.345, -0.04, 0], coat, head);
    for (const side of [-1, 1]) {
      ball([0.014, 0.01, 0.012], [0.385, -0.02, side * 0.035], darkSkin, head);
      const ear = put(new THREE.ConeGeometry(0.03, 0.08, 6), coat, [-0.05, 0.1, side * 0.09], head);
      ear.rotation.set(side * 0.5, 0, 0.5);
      ear.name = 'ear';
      if (a.doing === 'sleeping') ball([0.03, 0.006, 0.01], [0.1, 0.045, side * 0.098], darkSkin, head);
      else { ball([0.022, 0.022, 0.014], [0.1, 0.045, side * 0.092], darkSkin, head); ball([0.035, 0.018, 0.02], [0.1, 0.066, side * 0.09], coat, head); }
    }
    ball([0.07, 0.05, 0.07], [-0.02, 0.12, 0], fur, head, rough);
    const jaw = new THREE.Group();
    jaw.position.set(0.1, -0.075, 0);
    ball([0.13, 0.03, 0.06], [0.12, 0, 0], coat, jaw);
    head.add(jaw);
    if (a.doing === 'bellowing') { jaw.rotation.z = -0.5; ball([0.09, 0.03, 0.045], [0.24, -0.075, 0], s.material('#7a2a2a'), head); }

    // Moult: ragged dark mats hanging off the flanks.
    if (a.coat === 'moulting' || mood.wear > 0.8) for (let i = 0; i < 14; i++) {
      const x = -0.8 + random() * 1.5, angle = (random() - 0.5) * 2.4;
      ball([0.1 + random() * 0.12, 0.08 + random() * 0.1, 0.03], [x, 0.56 + Math.cos(angle) * 0.44, Math.sin(angle) * 0.4], fur, C, rough).rotation.x = -angle;
    }

    // Saddle cloth, pack saddle and load.
    const saddled = a.load !== 'bare';
    const clothTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      if (a.cloth === 'stripes') ['#a8281f', '#eadcb8', '#221c1a', '#a8281f', '#eadcb8', '#c98a2e', '#221c1a', '#a8281f'].forEach((colour, i) => { ctx.fillStyle = colour; ctx.fillRect(i * 32, 0, 32, 256); });
      else if (a.cloth === 'indigo') { ctx.fillStyle = '#243a78'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#efe8d4'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 32 + i * 64, y = 32 + j * 64; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 18, y); ctx.lineTo(x, y + 18); ctx.lineTo(x - 18, y); ctx.fill(); } }
      else if (a.cloth === 'felt') { ctx.fillStyle = '#b5a88c'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(0, 0, 14, 256); ctx.fillRect(242, 0, 14, 256); ctx.fillRect(0, 0, 256, 12); ctx.fillRect(0, 244, 256, 12); }
      else { ctx.fillStyle = '#a31c24'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#e8b93a'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 236, 236); ctx.fillStyle = '#e8b93a'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(56 + i * 72, 56 + j * 72, 17, 0, 7); ctx.fill(); } }
      for (let i = 0; i < mood.wear * 60; i++) { ctx.fillStyle = 'rgba(140,125,105,0.4)'; ctx.fillRect(random() * 256, random() * 256, 8 + random() * 30, 4 + random() * 12); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const wrap = s.material('#8d8980', { roughness: 1 }), cord = s.material('#4c3a26');
    const baleGeo = new RoundedBoxGeometry(0.8, 0.42, 0.34, 3, 0.08), strap = new RoundedBoxGeometry(0.035, 0.44, 0.36, 2, 0.05);
    const bale = (at: P3, tilt = 0, turn = 0, material: THREE.Material = wrap) => {
      const g = new THREE.Group();
      put(baleGeo, material, [0, 0, 0], g);
      for (const x of [-0.2, 0.2]) put(strap, cord, [x, 0, 0], g);
      g.position.set(...at);
      g.rotation.set(tilt, turn, 0);
      g.scale.setScalar(mix(0.92, 1.05, random()));
      C.add(g);
      return g;
    };
    if (saddled) {
      const cloth = new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 1, side: THREE.DoubleSide });
      const arc = a.load === 'riding' ? 2.5 : 2.9;
      const shell = new THREE.CylinderGeometry(0.47, 0.47, 1.25, 20, 1, true, Math.PI / 2 - arc / 2, arc);
      shell.rotateZ(Math.PI / 2);
      put(shell, cloth, [-0.08, 0.56, 0]).scale.set(1, 1, 0.9);
      if (a.cloth === 'crimson') for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
        const tassel = put(new THREE.ConeGeometry(0.022, 0.1, 6), brass, [-0.66 + i * 0.145, 0.56 + Math.sin(Math.PI / 2 - arc / 2) * 0.47 - 0.05, side * Math.cos(Math.PI / 2 - arc / 2) * 0.47 * 0.9]);
        tassel.rotation.x = Math.PI;
      }
      if (a.load !== 'riding') {
        // Pack saddle: side poles lashed to crossed sticks fore and aft of the humps.
        for (const side of [-1, 1]) rod([-0.85, 0.98, side * 0.37], [0.74, 0.98, side * 0.37], 0.028, 0.028, wood);
        for (const x of [-0.76, -0.06, 0.64]) for (const side of [-1, 1]) rod([x, 0.74, side * 0.44], [x, 1.16, side * -0.08], 0.022, 0.018, wood);
        for (const x of [-0.76, 0.64]) put(new THREE.TorusGeometry(0.04, 0.012, 5, 10), ropeMat, [x, 1.08, 0]).rotation.y = Math.PI / 2;
      }
    }
    const sides = a.load === 'laden' || a.load === 'towering' ? [-1, 1] : a.load === 'unloading' ? [-1] : [];
    for (const side of sides) {
      bale([-0.06, 0.72, side * 0.6], side * -0.22);
      rod([-0.06, 1.02, side * 0.38], [-0.06, 0.9, side * 0.56], 0.012, 0.012, ropeMat);
      if (a.load === 'towering' || mood.density > 0.6) bale([-0.06, 1.14, side * 0.5], side * 0.12);
    }
    if (a.load === 'laden' || a.load === 'towering') {
      const roll = put(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 14), s.material('#b5a88c', { roughness: 1 }), [-0.06, a.load === 'towering' ? 1.52 : 1.22, 0]);
      roll.rotation.x = Math.PI / 2;
      for (const z of [-0.3, 0.3]) put(new THREE.TorusGeometry(0.135, 0.012, 5, 14), cord, [-0.06, roll.position.y, z]);
    }
    if (a.load === 'towering') {
      put(new RoundedBoxGeometry(0.62, 0.32, 0.42, 2, 0.03), s.material('#7a3a26'), [-0.1, 1.8, 0]).rotation.y = 0.12;
      put(new THREE.BoxGeometry(0.64, 0.03, 0.05), brass, [-0.1, 1.86, 0.2]).rotation.y = 0.12;
      const carpet = put(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 12), s.material('#9c2a26', { roughness: 1 }), [-0.1, 2.07, 0]);
      carpet.rotation.set(Math.PI / 2, 0, 0.08);
      put(new THREE.CylinderGeometry(0.112, 0.112, 0.08, 12), s.material('#e6d3a0'), [-0.1, 2.07, 0.3]).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) rod([-1.25 - random() * 0.2, 1.2 + i * 0.03, 0.5 + i * 0.03], [0.85 + random() * 0.2, 1.42 + i * 0.03, 0.42 + i * 0.03], 0.016, 0.016, wood);
      // Kettle and a waterskin swinging off the back.
      put(new THREE.SphereGeometry(0.1, 12, 10), s.material('#2a2622', { metalness: 0.4, roughness: 0.5 }), [-0.82, 0.86, -0.5]);
      put(new THREE.TorusGeometry(0.07, 0.008, 5, 12, Math.PI), s.material('#2a2622'), [-0.82, 0.94, -0.5]);
      ball([0.12, 0.17, 0.09], [0.52, 0.8, -0.52], s.material('#7a5236', { roughness: 0.7 }));
    }
    if (a.load === 'unloading') {
      bale([0.0, 0.21, 1.15], 0, 0.15);
      bale([0.06, 0.62, 1.12], 0, -0.1);
      bale([-0.75, 0.21, 1.05], 0, 0.9);
      for (let i = 0; i < 3; i++) put(new THREE.TorusGeometry(0.15 - i * 0.012, 0.018, 6, 20), ropeMat, [0.8, 0.02 + i * 0.03, 1.05]).rotation.x = Math.PI / 2;
    }
    if (a.load === 'riding') {
      ball([0.26, 0.09, 0.26], [-0.06, 1.06, 0], s.material('#b02a2a', { roughness: 0.9 }));
      ball([0.2, 0.07, 0.22], [-0.06, 1.15, 0], s.material('#d9a441', { roughness: 0.9 }));
      for (const side of [-1, 1]) {
        put(new RoundedBoxGeometry(0.46, 0.36, 0.14, 2, 0.05), s.material('#7a5236', { roughness: 0.75 }), [-0.06, 0.66, side * 0.5]).rotation.x = side * -0.2;
        put(new THREE.BoxGeometry(0.48, 0.14, 0.02), s.material('#5a3a24'), [-0.06, 0.78, side * 0.565]).rotation.x = side * -0.2;
        put(new THREE.SphereGeometry(0.02, 8, 6), brass, [-0.06, 0.72, side * 0.585]);
      }
    }

    // Head gear.
    const mouth = new THREE.Vector3(0.36, -0.06, 0);
    head.updateMatrix();
    mouth.applyMatrix4(head.matrix);
    if (a.gear === 'peg') {
      const stake: P3 = [mouth.x + 0.45, 0, mouth.z + 0.55];
      rod([stake[0], -0.05, stake[2]], [stake[0] + 0.03, 0.3, stake[2]], 0.03, 0.025, wood);
      put(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 6), wood, [0.365, -0.03, 0], head).rotation.x = Math.PI / 2;
      tube([[mouth.x, mouth.y + 0.02, mouth.z + 0.03], [(mouth.x + stake[0]) / 2, Math.max(0.03, mouth.y * 0.3), (mouth.z + stake[2]) / 2], [stake[0] - 0.05, 0.05, stake[2] - 0.05], [stake[0] + 0.02, 0.22, stake[2]]], 0.012, ropeMat);
    } else if (a.gear === 'bell') {
      const at = curve.getPoint(0.3), tangent = curve.getTangent(0.3);
      const collar = put(new THREE.TorusGeometry(0.2, 0.02, 6, 18), s.material('#8e2a22'), at.toArray() as P3);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      collar.scale.y = 1;
      const hangs = at.clone().add(new THREE.Vector3(tangent.y, -tangent.x, 0).normalize().multiplyScalar(tangent.x >= 0 ? 0.2 : -0.2));
      if (hangs.y > at.y) hangs.y = at.y - 0.2;
      put(new THREE.LatheGeometry([[0.02, 0], [0.05, -0.02], [0.065, -0.12], [0.08, -0.15], [0.07, -0.15]].map(([r, y]) => new THREE.Vector2(r, y)), 12), brass, [hangs.x, hangs.y - 0.01, hangs.z]);
      put(new THREE.SphereGeometry(0.02, 8, 6), darkSkin, [hangs.x, hangs.y - 0.16, hangs.z]);
    } else if (a.gear === 'pompoms') {
      const wool = ['#d8262c', '#e8b21e', '#2a7fc8', '#2f9a5a', '#e06a9a', '#f1ead6'].map((hex) => s.material(hex, { roughness: 1 }));
      put(new THREE.TorusGeometry(0.09, 0.012, 5, 14), wool[0], [0.26, -0.02, 0], head).rotation.y = Math.PI / 2;
      put(new THREE.TorusGeometry(0.115, 0.012, 5, 14), wool[2], [0.04, 0.01, 0], head).rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) { ball([0.035, 0.035, 0.035], [0.05, 0.02, side * 0.12], wool[1], head, rough); ball([0.028, 0.028, 0.028], [0.06, -0.06, side * 0.115], wool[4], head, rough); }
      ball([0.045, 0.045, 0.045], [0.02, 0.15, 0], wool[0], head, rough);
      for (const t of [0.25, 0.32]) {
        const at = curve.getPoint(t), r = mix(0.215, 0.1, t ** 0.75) + 0.03;
        for (let i = 0; i < 9; i++) { const angle = (i / 9) * Math.PI * 2; ball([0.04, 0.04, 0.04], [at.x + Math.cos(angle) * 0.03, at.y + Math.cos(angle) * r, at.z + Math.sin(angle) * r * 0.85], wool[(i + (t > 0.3 ? 2 : 0)) % wool.length], C, rough); }
      }
    }

    C.rotation.y = -0.8 + (random() - 0.5) * 0.3;
    const ears = head.children.filter((child) => child.name === 'ear');
    const chew = a.doing === 'chewing' || a.doing === 'watching', pace = mix(0.5, 2.2, mood.energy), phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        if (chew) { jaw.position.z = Math.sin(time * 4.2 * pace + phase) * 0.014; jaw.rotation.z = -0.06 - Math.abs(Math.sin(time * 4.2 * pace + phase)) * 0.07; }
        if (a.doing === 'bellowing') head.rotation.z = pose.pitch + Math.sin(time * 3 * pace) * 0.05;
        tail.rotation.x = Math.sin(time * 1.7 * pace + phase) * 0.35 * mix(0.2, 1, mood.energy);
        ears.forEach((ear, index) => { ear.rotation.z = 0.5 + Math.max(0, Math.sin(time * 0.9 + index * 2 + phase) - 0.9) * 4; });
      },
    });
  },
});

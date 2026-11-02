import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

/** The statue is modelled at human scale and enlarged: heel to crown 34 m. */
const H = 1.7, K = 34 / H, PEDESTAL_TOP = 47;

export default defineThing({
  questions: {
    era: choice('When do we see her?', {
      unveiling: '1886, just unveiled: bright new copper, shining reddish brown like a penny.',
      turning: 'Around 1900: streaky, half brown and half green as the copper weathers.',
      today: 'Today: the soft full verdigris green everyone knows.',
      restoration: '1984 restoration: the statue wrapped in a cage of aluminium scaffolding.',
    }),
    torch: noul('Is the torch flame lit?'),
    weather: choice('What weather is around her?', {
      clear: 'A clear blue day, every fold of the robe sharp.',
      fog: 'Harbour fog rolling in up to her knees, the figure rising out of it.',
      snow: 'Snow lying on the crown rays, the shoulders and the pedestal ledges.',
      storm: 'A storm: dark air and a fork of lightning beside the torch.',
    }),
    base: choice('What is happening at the base?', {
      empty: 'An empty island: lawns and the star fort walls, nobody about.',
      ferry: 'A white tourist ferry docking at the island pier.',
      fourth: 'The Fourth of July: a crowd on the fort and fireworks bursting overhead.',
    }),
    tablet: choice('What does she hold in her left arm?', {
      tablet: 'The tablet inscribed JULY IV MDCCLXXVI, as she was made.',
      book: 'A plain closed book held the same way, a quieter variant.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));

    // Copper skin by era: penny brown, streaked, verdigris.
    const base = { unveiling: '#b0653a', turning: '#8f7a52', today: '#6fae98', restoration: '#6fae98' }[a.era];
    const skinMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      const streaks = a.era === 'turning' ? 120 : a.era === 'unveiling' ? 10 : 50;
      for (let i = 0; i < streaks; i++) {
        c.fillStyle = a.era === 'turning' ? `rgba(${random() < 0.5 ? '80,170,140' : '150,80,40'},${0.25 + random() * 0.35})` : `rgba(40,80,70,${0.08 + random() * 0.12})`;
        c.fillRect(random() * 256, random() * 256, 2 + random() * 10, 30 + random() * 120);
      }
      for (let i = 0; i < Math.round(mood.wear * 60); i++) { c.fillStyle = `rgba(30,40,35,${0.1 + random() * 0.15})`; c.fillRect(random() * 256, random() * 256, 2 + random() * 4, 20 + random() * 60); }
    });
    const copper = s.material(base, { map: skinMap, roughness: a.era === 'unveiling' ? 0.4 : 0.75, metalness: a.era === 'unveiling' ? 0.45 : 0.1 });
    const granite = s.material('#c9c1b2', { roughness: 0.9 });
    const graniteDark = s.material('#9e978a', { roughness: 0.9 });
    const concrete = s.material('#b5afa3', { roughness: 0.95 });
    const lawn = s.material('#6f8c4e', { roughness: 1 });
    const gold = s.material('#d8a93a', { metalness: 0.6, roughness: 0.3, emissive: '#ffb02a', emissiveIntensity: a.torch ? mix(0.6, 2.6, night) : 0.05 });

    // ---- The figure, at human scale.
    const statue = new THREE.Group();
    const person = figure(s, { height: H, build: 'average', pose: 'standing', style: 'doll', face: 'blank', hair: 'bun', gaze: 'ahead' });
    statue.add(person.root);
    statue.updateMatrixWorld(true);
    person.reach('right', new THREE.Vector3(-0.2, 2.02, -0.02), { space: statue });
    person.reach('left', new THREE.Vector3(0.24, 1.0, 0.1), { space: statue });
    person.root.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh) { (m.material as THREE.Material).dispose(); m.material = copper; } });

    // The torch in the raised hand: handle, cup, balcony ring and flame.
    const torch = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.2, 10), copper); handle.position.y = -0.08;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.022, 0.07, 14), copper); cup.position.y = -0.2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 20), gold); rim.rotation.x = Math.PI / 2; rim.position.y = -0.235;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 12), gold); flame.position.y = -0.29; flame.rotation.x = Math.PI;
    torch.add(handle, cup, rim, flame);
    person.hands.right.add(torch);

    // Tablet (or book) held against the left side.
    statue.updateMatrixWorld(true);
    const lh = person.hands.left.getWorldPosition(new THREE.Vector3());
    let tabletMesh: THREE.Mesh;
    if (a.tablet === 'tablet') {
      tabletMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.045), copper);
    } else {
      tabletMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.05), copper);
    }
    tabletMesh.position.set(lh.x + 0.03, lh.y + (a.tablet === 'tablet' ? 0.13 : 0.05), lh.z + 0.05);
    tabletMesh.rotation.set(0.25, -0.3, -0.18);
    statue.add(tabletMesh);

    // The stola: a lathe-like robe from shoulders to feet, its folds deepening toward the hem.
    const robe = s.surface((u, v, t) => {
      const th = u * Math.PI * 2;
      const profile = [[0, 0.31], [0.25, 0.255], [0.5, 0.2], [0.65, 0.172], [0.82, 0.182], [0.94, 0.16], [1, 0.08]];
      let r = profile[0][1];
      for (let i = 1; i < profile.length; i++) if (v <= profile[i][0]) { const [v0, r0] = profile[i - 1], [v1, r1] = profile[i]; r = r0 + (r1 - r0) * (v - v0) / (v1 - v0); break; }
      const fold = 1 + (0.13 * (1 - v) + 0.03) * Math.sin(11 * th + 2 * Math.sin(3 * th));
      t.set(Math.cos(th) * r * 1.15 * fold, 0.015 + v * 1.43, Math.sin(th) * r * 0.82 * fold - 0.03 * (1 - v));
    }, copper, { segments: [72, 28], wrap: true });
    statue.add(robe);
    // The mantle thrown over the left shoulder, draped and settled.
    const mantle = s.drape({
      size: [0.5, 0.42], at: [0.07, 1.62, 0.01], rumple: 0.5, stiffness: 0.25, detail: 26, floor: 0.6,
      over: [{ ball: 0.11, at: [0.18, 1.42, 0] }, { cylinder: [0.2, 0.5], at: [0, 1.16, 0] }],
    }, copper);
    statue.add(mantle);
    // The seven-ray crown as cones around a diadem.
    const head = person.head.getWorldPosition(new THREE.Vector3());
    const crown: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.115, 0.12, 0.05, 20).translate(head.x, head.y + 0.04, head.z)];
    for (let i = 0; i < 7; i++) {
      const az = (-72 + i * 24) * Math.PI / 180;
      const dir = new THREE.Vector3(Math.sin(az), 0.35, Math.cos(az)).normalize();
      const cone = new THREE.ConeGeometry(0.022, 0.2, 6).translate(0, 0.1, 0);
      cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      crown.push(cone.translate(head.x + dir.x * 0.1, head.y + 0.05 + dir.y * 0.1, head.z + dir.z * 0.1));
    }
    const crownMesh = new THREE.Mesh(mergeGeometries(crown.map(flat)), copper);
    statue.add(crownMesh);
    // Sandal and plinth block under her feet.
    const footing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.5), copper); footing.position.set(0, -0.03, -0.02); statue.add(footing);
    statue.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; });
    statue.scale.setScalar(K);
    statue.position.y = PEDESTAL_TOP + 0.6;

    // ---- Pedestal, foundation and the eleven-pointed star of Fort Wood, true metres.
    const g = new THREE.Group();
    g.add(statue);
    const add = (geos: THREE.BufferGeometry[], mat: THREE.Material) => { const m = new THREE.Mesh(mergeGeometries(geos.map(flat)), mat); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    add([
      new THREE.BoxGeometry(21, 6, 21).translate(0, 29, 0),
      new THREE.BoxGeometry(17.5, 12, 17.5).translate(0, 38, 0),
      new THREE.BoxGeometry(16, 1.6, 16).translate(0, 46.4, 0),
    ], granite);
    const trimGeos: THREE.BufferGeometry[] = [new THREE.BoxGeometry(20, 1.4, 20).translate(0, 44.9, 0), new THREE.BoxGeometry(22, 1, 22).translate(0, 32.4, 0)];
    // Loggias with columns on each face.
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Matrix4().makeRotationY(k * Math.PI / 2);
      trimGeos.push(new THREE.BoxGeometry(9, 7, 0.6).translate(0, 39, 8.6).applyMatrix4(m));
      for (let c = 0; c < 4; c++) trimGeos.push(new THREE.CylinderGeometry(0.45, 0.45, 6.5, 8).translate(-3.3 + c * 2.2, 39, 9.2).applyMatrix4(m));
      trimGeos.push(new THREE.BoxGeometry(10, 0.8, 1.2).translate(0, 42.6, 9.2).applyMatrix4(m));
      for (let d = 0; d < 6; d++) trimGeos.push(new THREE.BoxGeometry(0.9, 0.9, 0.3).translate(-6.5 + d * 2.6, 34.5, 10.8).applyMatrix4(m));
    }
    add(trimGeos, graniteDark);
    add([
      new THREE.BoxGeometry(30, 6, 30).translate(0, 11, 0),
      new THREE.BoxGeometry(27, 6, 27).translate(0, 17, 0),
      new THREE.BoxGeometry(24, 6, 24).translate(0, 23, 0),
    ], concrete);
    const star = new THREE.Shape();
    for (let i = 0; i < 22; i++) {
      const an = (i / 22) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 29 : 40;
      if (i === 0) star.moveTo(Math.cos(an) * r, Math.sin(an) * r); else star.lineTo(Math.cos(an) * r, Math.sin(an) * r);
    }
    star.closePath();
    add([new THREE.ExtrudeGeometry(star, { depth: 8, bevelEnabled: false }).rotateX(-Math.PI / 2)], granite);
    const terrace = add([new THREE.CylinderGeometry(27, 27, 0.3, 40).translate(0, 8.15, 0)], lawn);
    terrace.castShadow = false;

    // ---- Restoration scaffold around the figure.
    if (a.era === 'restoration') {
      const pipe = s.material('#c9ccce', { metalness: 0.5, roughness: 0.4 });
      const rods: THREE.Matrix4[] = [];
      const [w, d, y0, y1] = [15, 13, PEDESTAL_TOP, PEDESTAL_TOP + 40];
      for (let x = -w / 2; x <= w / 2 + 0.01; x += 2.5) for (const z of [-d / 2, d / 2]) rods.push(new THREE.Matrix4().makeScale(0.35, y1 - y0, 0.35).setPosition(x, (y0 + y1) / 2, z));
      for (let z = -d / 2 + 2.6; z < d / 2; z += 2.6) for (const x of [-w / 2, w / 2]) rods.push(new THREE.Matrix4().makeScale(0.35, y1 - y0, 0.35).setPosition(x, (y0 + y1) / 2, z));
      for (let y = y0 + 2; y <= y1; y += 3) {
        for (const z of [-d / 2, d / 2]) rods.push(new THREE.Matrix4().makeScale(w, 0.3, 0.3).setPosition(0, y, z));
        for (const x of [-w / 2, w / 2]) rods.push(new THREE.Matrix4().makeScale(0.3, 0.3, d).setPosition(x, y, 0));
      }
      // The tower around the raised arm.
      for (const [x, z] of [[-6.5, -2], [-1.5, -2], [-6.5, 2.5], [-1.5, 2.5]]) rods.push(new THREE.Matrix4().makeScale(0.35, 14, 0.35).setPosition(x, y1 + 7, z));
      for (let y = y1 + 2; y <= y1 + 14; y += 3) { rods.push(new THREE.Matrix4().makeScale(5, 0.3, 0.3).setPosition(-4, y, -2), new THREE.Matrix4().makeScale(5, 0.3, 0.3).setPosition(-4, y, 2.5)); }
      const cage = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pipe, rods.length);
      rods.forEach((m, i) => cage.setMatrixAt(i, m));
      cage.instanceMatrix.needsUpdate = true;
      cage.castShadow = true;
      g.add(cage);
    }

    const updates: ((time: number) => void)[] = [];
    if (a.weather === 'snow') {
      const snow = s.material('#f6f8fa', { roughness: 0.95 });
      add([
        new THREE.BoxGeometry(20.6, 0.6, 20.6).translate(0, 45.9, 0), new THREE.BoxGeometry(21.6, 0.6, 21.6).translate(0, 33.2, 0),
        new THREE.BoxGeometry(29.6, 0.6, 29.6).translate(0, 14.3, 0), new THREE.BoxGeometry(26.6, 0.6, 26.6).translate(0, 20.3, 0),
        new THREE.CylinderGeometry(27, 27, 0.4, 40).translate(0, 8.5, 0),
        new THREE.SphereGeometry(2.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.3, 1.1).translate(2.6, PEDESTAL_TOP + 0.6 + 1.43 * K, 0),
      ], snow);
      crownMesh.material = snow;
    }
    if (a.weather === 'fog') {
      const puff = new THREE.MeshStandardMaterial({ color: '#eef0f0', transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 });
      const n = 34;
      const fog = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8).scale(1.6, 0.5, 1), puff, n);
      for (let i = 0; i < n; i++) { const an = random() * Math.PI * 2, r = 12 + random() * 50, sz = 10 + random() * 10; fog.setMatrixAt(i, new THREE.Matrix4().makeScale(sz, sz * 0.8, sz).setPosition(Math.cos(an) * r, 8 + random() * 30, Math.sin(an) * r)); }
      fog.instanceMatrix.needsUpdate = true;
      g.add(fog);
      updates.push((time) => { fog.rotation.y = time * 0.01 * (0.3 + mood.energy); });
    }
    if (a.weather === 'storm') {
      const bolt = new THREE.MeshBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.95, depthWrite: false });
      const pts = [new THREE.Vector3(-34, 150, -6)];
      for (let i = 0; i < 9; i++) pts.push(pts[pts.length - 1].clone().add(new THREE.Vector3(2 + (random() - 0.5) * 8, -9 - random() * 3, (random() - 0.5) * 4)));
      const zig = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.8, 5), bolt);
      g.add(zig);
      updates.push((time) => { zig.visible = Math.sin(time * (3 + mood.energy * 8)) > -0.2; });
    }
    if (a.base === 'ferry') {
      const hull = s.material('#f2f0ea'), dark = s.material('#2b3944'), blue = s.material('#1f4f8a');
      const ferry = new THREE.Group();
      const piece = (geo: THREE.BufferGeometry, mat: THREE.Material, at: [number, number, number]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.castShadow = true; ferry.add(m); };
      piece(new THREE.BoxGeometry(34, 3, 9), hull, [0, 1.5, 0]);
      piece(new THREE.BoxGeometry(34.2, 0.8, 9.2), blue, [0, 0.4, 0]);
      piece(new THREE.BoxGeometry(28, 2.6, 8), hull, [-1, 4.3, 0]);
      piece(new THREE.BoxGeometry(28.2, 1, 8.2), dark, [-1, 4.4, 0]);
      piece(new THREE.BoxGeometry(18, 2.4, 7), hull, [-3, 6.8, 0]);
      piece(new THREE.BoxGeometry(4, 1.6, 5), dark, [5, 8.6, 0]);
      piece(new THREE.BoxGeometry(18, 0.6, 3), s.material('#c7c2b6'), [0, 0.3, 8]); // the pier
      ferry.position.set(8, 0, 50);
      ferry.rotation.y = 0.15;
      g.add(ferry);
      updates.push((time) => { ferry.children.slice(0, 6).forEach((m) => { m.position.y += Math.sin(time * 0.9) * 0.002; }); });
    }
    if (a.base === 'fourth') {
      const people: THREE.Matrix4[] = [], colours: THREE.Color[] = [];
      const palette = ['#c8102e', '#f4f2ec', '#1f5fd1', '#f4d40c', '#34363a', '#2f9e44'];
      const count = 260 + Math.round(mood.density * 300);
      for (let i = 0; i < count; i++) {
        const an = random() * Math.PI * 2, r = 15 + random() * 12;
        people.push(new THREE.Matrix4().makeScale(1, 1 + random() * 0.2, 1).setPosition(Math.cos(an) * r, 9.2, Math.sin(an) * r));
        colours.push(new THREE.Color(palette[Math.floor(random() * palette.length)]));
      }
      const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.35, 1, 2, 6), s.material('#ffffff'), count);
      people.forEach((m, i) => { crowd.setMatrixAt(i, m); crowd.setColorAt(i, colours[i]); });
      crowd.instanceMatrix.needsUpdate = true;
      if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
      g.add(crowd);
      const bursts: { mat: THREE.MeshBasicMaterial; mesh: THREE.InstancedMesh; phase: number; c: THREE.Vector3 }[] = [];
      const fire = ['#ff4b5c', '#ffffff', '#4f8bff', '#ffd24a'];
      for (let b = 0; b < 4 + Math.round(mood.energy * 3); b++) {
        const c = new THREE.Vector3((random() - 0.5) * 90, 100 + random() * 40, -20 - random() * 30);
        const mat = new THREE.MeshBasicMaterial({ color: fire[b % fire.length], transparent: true, opacity: 0.95, depthWrite: false });
        const n = 50, mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), mat, n);
        for (let i = 0; i < n; i++) { const th = random() * Math.PI * 2, ph = Math.acos(2 * random() - 1), r = 10 + random() * 3; mesh.setMatrixAt(i, new THREE.Matrix4().setPosition(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th) * 0.5)); }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.position.copy(c);
        g.add(mesh);
        bursts.push({ mat, mesh, phase: random() * 3, c });
      }
      updates.push((time) => { for (const b of bursts) { const t = ((time * 0.45 + b.phase) % 3) / 3; b.mat.opacity = Math.max(0, 1 - t * 1.2); b.mesh.scale.setScalar(0.5 + t * 0.8); } });
    }
    updates.push((time) => { if (a.torch) gold.emissiveIntensity = mix(0.6, 2.6, night) * (0.9 + Math.sin(time * 5) * 0.08 * (0.3 + mood.energy)); });

    g.rotation.y = 30 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 46, update: (dt, time) => { for (const fn of updates) fn(time); void dt; } });
  },
});

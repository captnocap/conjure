import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    tradition: choice('What kind of shrine holds the tooth?', {
      stupa: 'A golden Buddhist stupa casket on stepped tiers, with a crystal bell and a ringed spire.',
      monstrance: 'A Catholic sunburst monstrance on a tall foot, the tooth in the round glass at the heart of the rays.',
      jar: 'A folk shrine: a jam jar with a gingham-covered lid and a handwritten label, a holy card propped behind.',
      museum: 'A museum vitrine: glass cube on a grey plinth, a typed label, the tooth on a pin mount.',
    }),
    tooth: choice('What is the tooth like?', {
      molar: 'An ordinary human molar with its roots, small and yellowed.',
      canine: 'An improbably large curved canine, too big for any saint.',
      gold: 'A molar set in a gold band with prongs and a little ring, a jewel of bone.',
    }),
    open: choice('How open is it?', {
      sealed: 'Sealed shut, the tooth seen only through the glass.',
      lifted: 'The cover lifted off and set down beside it, the tooth bare to the air.',
      row: 'Fully unpacked: the cover off and all the nested caskets and boxes it travelled in laid out in a row.',
    }),
    glow: choice('Does the tooth give off light?', {
      none: 'No. It is only a tooth.',
      halo: 'A faint ring of light stands behind it.',
      rays: 'It shines: thin rays of light in every direction.',
    }),
    guard: choice('What guards it?', {
      nothing: 'Nothing at all.',
      lions: 'A pair of tiny seated lions, one each side.',
      padlock: 'A chain round the vessel and a heavy padlock.',
      garlands: 'Garlands of marigolds heaped round it.',
    }),
    bed: choice('What does the tooth rest on?', {
      lotus: 'An open pink lotus flower.',
      velvet: 'A tiny crimson velvet pillow with gold tassels.',
      cotton: 'A tuft of cotton wool.',
      dish: 'A small golden dish.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#6f6a5e'), mood.wear * 0.35);
    const metal = (hex: string) => new THREE.MeshStandardMaterial({ color: tone(hex), metalness: mix(0.5, 0.2, mood.wear), roughness: mix(0.25, 0.7, mood.wear), emissive: tone(hex), emissiveIntensity: mix(0.2, 0.04, mood.wear), side: THREE.DoubleSide });
    const gold = metal('#e3b23a'), silver = metal('#d5d9dc'), steel = metal('#6c7074');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8f4', transparent: true, opacity: 0.2, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    const glint = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5, transparent: true, opacity: 0.6, depthWrite: false });
    const matte = (hex: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color: tone(hex), roughness, side: THREE.DoubleSide });
    const glowing = a.glow !== 'none';
    const lightHue = new THREE.Color().setHSL(mix(0.55, 0.11, mood.warmth), 0.9, 0.72);
    const enamel = new THREE.MeshStandardMaterial({ color: tone('#efe6c8').lerp(new THREE.Color('#b99a55'), mood.wear * 0.4), roughness: 0.35, emissive: glowing ? lightHue : new THREE.Color('#efe6c8'), emissiveIntensity: glowing ? 0.45 : 0.1 });
    const rootMat = new THREE.MeshStandardMaterial({ color: tone('#d8c08a'), roughness: 0.6, emissive: glowing ? lightHue : new THREE.Color('#000000'), emissiveIntensity: glowing ? 0.25 : 0 });

    // The tooth, built 1 unit tall, standing crown up at the origin of its group.
    const tooth = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, parent: THREE.Object3D = tooth) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    if (a.tooth === 'canine') {
      const profile = [[0, 0], [0.07, 0.1], [0.15, 0.42], [0.19, 0.58], [0.18, 0.7], [0.1, 0.9], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y));
      const fang = new THREE.LatheGeometry(profile, 16);
      const position = fang.attributes.position;
      for (let i = 0; i < position.count; i++) position.setX(i, position.getX(i) + (position.getY(i) - 0.5) ** 2 * 0.5 - 0.12);
      fang.computeVertexNormals();
      add(fang, enamel, [0, 0, 0]);
      add(new THREE.CylinderGeometry(0.2, 0.17, 0.02, 14), rootMat, [-0.115, 0.56, 0]);
    } else {
      add(new THREE.SphereGeometry(1, 16, 12), enamel, [0, 0.72, 0]).scale.set(0.36, 0.26, 0.31);
      for (const [x, z] of [[-0.17, -0.13], [0.17, -0.13], [-0.17, 0.13], [0.17, 0.13]]) add(new THREE.SphereGeometry(0.12, 10, 8), enamel, [x, 0.9, z]).scale.y = 0.8;
      add(new THREE.CylinderGeometry(0.3, 0.24, 0.16, 14), rootMat, [0, 0.52, 0]).scale.z = 0.85;
      for (const [x, z, lean] of [[-0.14, 0, 0.22], [0.14, 0.06, -0.22], [0.1, -0.1, -0.1]] as const) {
        const root = add(new THREE.ConeGeometry(0.13, 0.5, 8), rootMat, [x * 1.2, 0.24, z]);
        root.rotation.set(Math.PI, 0, lean);
      }
      if (a.tooth === 'gold') {
        add(new THREE.TorusGeometry(0.32, 0.06, 8, 24), gold, [0, 0.56, 0]).rotation.x = Math.PI / 2;
        for (let i = 0; i < 6; i++) { const angle = i / 6 * 6.283; add(new THREE.ConeGeometry(0.05, 0.3, 5), gold, [Math.cos(angle) * 0.33, 0.7, Math.sin(angle) * 0.3]); }
        add(new THREE.ConeGeometry(0.3, 0.4, 12, 1, true), gold, [0, 0.22, 0]).rotation.x = Math.PI;
        add(new THREE.TorusGeometry(0.1, 0.03, 6, 16), gold, [0, 1.08, 0]);
        add(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.1, emissive: '#b3202a', emissiveIntensity: 0.3 }), [0, 0.56, 0.36]);
      }
    }

    // What it rests on, built to hold a tooth about 4 cm tall.
    const bed = new THREE.Group();
    if (a.bed === 'lotus') {
      const pink = matte('#e58aa6', 0.6);
      for (let ring = 0; ring < 2; ring++)
        for (let i = 0; i < 8; i++) {
          const angle = i / 8 * 6.283 + ring * 0.39;
          const petal = add(new THREE.SphereGeometry(1, 8, 6), pink, [Math.cos(angle) * (0.02 + ring * 0.012), 0.007 + (1 - ring) * 0.004, Math.sin(angle) * (0.02 + ring * 0.012)], bed);
          petal.scale.set(0.017, 0.004, 0.009);
          petal.rotation.set(0, -angle, 0.5 - ring * 0.3, 'YXZ');
        }
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12), matte('#e2b53b'), [0, 0.006, 0], bed);
    } else if (a.bed === 'velvet') {
      add(new THREE.SphereGeometry(1, 16, 10), matte('#8a1a28', 1), [0, 0.008, 0], bed).scale.set(0.034, 0.01, 0.028);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(0.004, 0.012, 6), gold, [sx * 0.03, 0.006, sz * 0.024], bed).rotation.set(sz * 1.2, 0, -sx * 1.2);
    } else if (a.bed === 'cotton') {
      const wool = matte('#f6f4ee', 1);
      for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.011 + random() * 0.006, 8, 6), wool, [(random() - 0.5) * 0.04, 0.006 + random() * 0.004, (random() - 0.5) * 0.035], bed);
    } else {
      const dish = add(new THREE.LatheGeometry([[0, 0.004], [0.02, 0.004], [0.034, 0.012], [0.036, 0.014], [0.02, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 20), gold, [0, 0, 0], bed);
      dish.castShadow = true;
    }

    let seat: P3 = [0, 0.1, 0], relicScale = 1, R = 0.15, chainY = 0.05, chainR = 0.12, coverTop = 0.4;
    const cover = new Sculpture(context); // the part that lifts off; its origin is where it sits
    let coverHome: P3 = [0, 0, 0], coverAway: P3 = [0.3, 0, 0];
    let hinged: THREE.Group | null = null;
    const shellStyle = a.tradition;

    if (a.tradition === 'stupa') {
      s.box([0.32, 0.03, 0.32], [0, 0.015, 0], gold);
      s.box([0.27, 0.03, 0.27], [0, 0.045, 0], matte('#a3202a', 0.5));
      s.box([0.275, 0.006, 0.275], [0, 0.062, 0], gold);
      s.cylinder(0.115, 0.125, 0.022, [0, 0.074, 0], gold, 32);
      for (let i = 0; i < 16; i++) { const angle = i / 16 * 6.283; const petal = s.mesh(new THREE.SphereGeometry(1, 8, 6), gold, [Math.cos(angle) * 0.12, 0.07, Math.sin(angle) * 0.12]); petal.scale.set(0.02, 0.012, 0.014); petal.rotation.y = -angle; }
      seat = [0, 0.085, 0]; R = 0.16; chainY = 0.074; chainR = 0.128; coverTop = 0.44;
      cover.lathe([[0.104, 0], [0.104, 0.02], [0.098, 0.08], [0.074, 0.13], [0.042, 0.156], [0.036, 0.162]], glass);
      cover.ring(0.105, 0.005, [0, 0.004, 0], gold).rotation.x = Math.PI / 2;
      cover.ring(0.101, 0.003, [0, 0.07, 0], gold).rotation.x = Math.PI / 2;
      cover.box([0.003, 0.11, 0.003], [0.06, 0.07, 0.082], glint).rotation.z = 0.1;
      cover.box([0.07, 0.036, 0.07], [0, 0.178, 0], gold);
      cover.lathe([[0.03, 0.196], [0.013, 0.3], [0.005, 0.335], [0, 0.34]], gold);
      for (let i = 0; i < 6; i++) cover.ring(0.031 - i * 0.004, 0.0035, [0, 0.205 + i * 0.019, 0], gold).rotation.x = Math.PI / 2;
      cover.ball([0.011, 0.014, 0.011], [0, 0.35, 0], new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.1, emissive: '#b3202a', emissiveIntensity: 0.35 }), 12);
      coverHome = [0, 0.085, 0]; coverAway = [0.29, 0, -0.02];
    } else if (a.tradition === 'monstrance') {
      s.lathe([[0, 0], [0.095, 0], [0.098, 0.01], [0.065, 0.024], [0.022, 0.052], [0.014, 0.1], [0.032, 0.116], [0.014, 0.132], [0.014, 0.2], [0.024, 0.212], [0, 0.218]], gold);
      const cy = 0.36;
      s.ring(0.088, 0.01, [0, cy, 0], gold);
      s.cylinder(0.088, 0.088, 0.006, [0, cy, -0.012], matte('#7a1522', 1), 28).rotation.x = Math.PI / 2;
      s.rod([0, 0.215, 0], [0, cy - 0.088, 0], 0.009, gold);
      for (let i = 0; i < 28; i++) {
        const angle = i / 28 * 6.283, long = i % 2 ? 0.075 : 0.12;
        const ray = s.mesh(new THREE.ConeGeometry(0.011, long, 4), i % 2 ? silver : gold, [Math.cos(angle) * (0.096 + long / 2), cy + Math.sin(angle) * (0.096 + long / 2), -0.004]);
        ray.rotation.z = angle - Math.PI / 2;
        ray.scale.z = 0.35;
      }
      s.box([0.009, 0.06, 0.009], [0, cy + 0.24, 0], gold);
      s.box([0.036, 0.009, 0.009], [0, cy + 0.247, 0], gold);
      s.ring(0.045, 0.004, [0, cy - 0.03, 0.002], gold, Math.PI).rotation.z = Math.PI;
      seat = [0, cy - 0.075, 0.004]; relicScale = 0.78; R = 0.2; chainY = 0.105; chainR = 0.02; coverTop = cy + 0.25;
      hinged = new THREE.Group();
      hinged.position.set(-0.085, cy, 0.016);
      const pane = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.003, 28), glass);
      pane.rotation.x = Math.PI / 2;
      pane.position.x = 0.085;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.004, 6, 32), gold);
      rim.position.x = 0.085;
      rim.castShadow = true;
      const shine = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.06, 0.002), glint);
      shine.position.set(0.12, 0.02, 0.003);
      shine.rotation.z = 0.5;
      hinged.add(pane, rim, shine);
      s.root.add(hinged);
      if (a.open !== 'sealed') hinged.rotation.y = -2 - random() * 0.4;
    } else if (a.tradition === 'jar') {
      s.cylinder(0.11, 0.11, 0.003, [0, 0.0015, 0], matte('#f1ecdc', 0.9), 24);
      for (let i = 0; i < 18; i++) s.ball([0.012, 0.002, 0.012], [Math.cos(i / 18 * 6.283) * 0.11, 0.002, Math.sin(i / 18 * 6.283) * 0.11], matte('#f1ecdc', 0.9), 8);
      s.lathe([[0.062, 0.003], [0.066, 0.008], [0.066, 0.105], [0.05, 0.12], [0.05, 0.132]], glass);
      s.box([0.003, 0.08, 0.003], [0.042, 0.06, 0.052], glint);
      s.ring(0.0505, 0.002, [0, 0.132, 0], matte('#bcd8e4', 0.2)).rotation.x = Math.PI / 2;
      const text = ['S. TOOTH', 'HOLY TOOTH', 'DENTE STO.', 'HER TOOTH'][Math.floor(random() * 4)];
      const label = s.label(text, 0.07, 0.026, [0, 0.022, 0.0675], '#2a2a5a', '#f1ecd6');
      label.rotation.z = (random() - 0.5) * 0.12;
      // a holy card propped behind
      const card = document.createElement('canvas');
      card.width = 128; card.height = 192;
      const ctx = card.getContext('2d')!;
      ctx.fillStyle = '#f0e4c4'; ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = '#7aa0c8'; ctx.fillRect(8, 8, 112, 176);
      ctx.fillStyle = '#f2cf5a'; ctx.beginPath(); ctx.arc(64, 62, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#e2b79a'; ctx.beginPath(); ctx.arc(64, 64, 17, 0, 7); ctx.fill();
      ctx.fillStyle = mood.cheer > 0.5 ? '#c0304a' : '#3a4a7a'; ctx.beginPath(); ctx.moveTo(64, 78); ctx.lineTo(108, 184); ctx.lineTo(20, 184); ctx.fill();
      const cardMap = new THREE.CanvasTexture(card);
      cardMap.colorSpace = THREE.SRGBColorSpace;
      const holy = s.mesh(new THREE.PlaneGeometry(0.09, 0.135), new THREE.MeshStandardMaterial({ map: cardMap, roughness: 0.7, side: THREE.DoubleSide }), [-0.075, 0.066, -0.075]);
      holy.rotation.set(-0.2, 0.35, 0);
      seat = [0, 0.03, 0]; relicScale = 0.85; R = 0.12; chainY = 0.06; chainR = 0.068; coverTop = 0.16;
      const lidTint = mood.cheer > 0.5 ? '#c0304a' : '#3a5a9a';
      const gingham = document.createElement('canvas');
      gingham.width = gingham.height = 64;
      const g = gingham.getContext('2d')!;
      g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = lidTint; g.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 8, 64); g.fillRect(0, i * 16, 64, 8); }
      const check = new THREE.CanvasTexture(gingham);
      check.colorSpace = THREE.SRGBColorSpace;
      check.wrapS = check.wrapT = THREE.RepeatWrapping;
      check.repeat.set(4, 1);
      const cloth = new THREE.MeshStandardMaterial({ map: check, roughness: 0.9, side: THREE.DoubleSide });
      cover.cylinder(0.053, 0.053, 0.012, [0, 0.006, 0], cloth, 20);
      cover.mesh(new THREE.CylinderGeometry(0.053, 0.078, 0.028, 20, 1, true), cloth, [0, -0.006, 0]);
      cover.ring(0.054, 0.0022, [0, 0.001, 0], matte('#b98d4a')).rotation.x = Math.PI / 2;
      coverHome = [0, 0.136, 0]; coverAway = [0.17, 0.02, 0.05];
    } else {
      s.box([0.3, 0.14, 0.3], [0, 0.07, 0], matte('#cfcdc6', 0.9));
      s.box([0.27, 0.006, 0.27], [0, 0.143, 0], matte('#2c2f33', 0.8));
      s.cylinder(0.003, 0.003, 0.05, [0, 0.171, 0], glint, 8);
      s.cylinder(0.03, 0.03, 0.004, [0, 0.196, 0], matte('#2c2f33', 0.6), 20);
      const card = s.label(['DENS · TOOTH', 'TOOTH, HUMAN?', 'RELIC · ACC. 1907.44', 'ATTRIB. UNCERTAIN'][Math.floor(random() * 4)], 0.12, 0.03, [0.03, 0.156, 0.11], '#2a2a2a', '#f4f1e8');
      card.rotation.x = -0.9;
      seat = [0, 0.198, 0]; R = 0.17; chainY = 0.1; chainR = 0.215; coverTop = 0.4;
      const size = 0.25, h = 0.24;
      cover.box([size, h, size], [0, h / 2, 0], glass);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cover.box([0.004, h, 0.004], [sx * size / 2, h / 2, sz * size / 2], silver);
      for (const y of [0, h]) for (const side of [-1, 1]) { cover.box([size, 0.004, 0.004], [0, y, side * size / 2], silver); cover.box([0.004, 0.004, size], [side * size / 2, y, 0], silver); }
      cover.box([0.003, 0.14, 0.002], [0.06, 0.12, size / 2 + 0.001], glint).rotation.z = 0.3;
      coverHome = [0, 0.146, 0]; coverAway = [0.3, 0, -0.03];
    }

    // Seat the bed and the tooth.
    const toothH = (a.tooth === 'canine' ? 0.13 : 0.075) * relicScale;
    bed.scale.setScalar(relicScale * 1.7);
    bed.position.set(...seat);
    tooth.scale.setScalar(toothH);
    tooth.position.set(seat[0], seat[1] + 0.012 * relicScale, seat[2]);
    tooth.rotation.set(0, random() * 0.8 - 0.4, a.tooth === 'canine' ? 0.12 : (random() - 0.5) * 0.3);
    if (a.tooth !== 'canine') tooth.position.y -= toothH * 0.12; // roots sink into the bed
    s.root.add(bed, tooth);

    // Light.
    const lights: THREE.Mesh[] = [];
    if (glowing) {
      const centre: P3 = [seat[0], seat[1] + toothH * 0.6, seat[2] - 0.006];
      const lightMat = new THREE.MeshStandardMaterial({ color: lightHue, emissive: lightHue, emissiveIntensity: 2, transparent: true, opacity: 0.85, depthWrite: false });
      const ringR = Math.max(toothH * 0.8, 0.03);
      const halo = s.ring(ringR, 0.0018, centre, lightMat);
      halo.castShadow = false;
      lights.push(halo);
      const disc = s.mesh(new THREE.CircleGeometry(ringR, 28), new THREE.MeshStandardMaterial({ color: lightHue, emissive: lightHue, emissiveIntensity: 1.2, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), centre);
      disc.castShadow = false;
      if (a.glow === 'rays')
        for (let i = 0; i < 16; i++) {
          const angle = i / 16 * 6.283 + 0.1, inner = ringR * 1.15, outer = ringR * (i % 2 ? 2.1 : 3);
          const ray = s.rod([centre[0] + Math.cos(angle) * inner, centre[1] + Math.sin(angle) * inner, centre[2]], [centre[0] + Math.cos(angle) * outer, centre[1] + Math.sin(angle) * outer, centre[2]], 0.0022, lightMat, 0.0004);
          ray.castShadow = false;
          lights.push(ray);
        }
    }

    // The cover, on or off.
    if (!hinged) {
      const at = a.open === 'sealed' ? coverHome : coverAway;
      cover.root.position.set(...at);
      if (a.open !== 'sealed') cover.root.rotation.y = random() * 0.6;
      s.root.add(cover.root);
    }

    // Everything it was packed in, largest to smallest.
    if (a.open === 'row') {
      const count = 3 + Math.floor(mood.density * 2.99);
      const sizes = Array.from({ length: count }, (_u, i) => mix(0.075, 0.034, i / Math.max(1, count - 1)));
      const span = sizes.reduce((sum, size) => sum + size * 2 + 0.014, 0);
      let x = span / 2;
      for (let i = 0; i < count; i++) {
        const size = sizes[i];
        x -= size;
        const z = (a.tradition === 'monstrance' ? 0.19 : a.tradition === 'jar' ? 0.2 : 0.27) + (random() - 0.5) * 0.012;
        if (shellStyle === 'stupa') {
          const k = size / 0.085;
          s.lathe([[0.085, 0], [0.085, 0.02], [0.078, 0.07], [0.055, 0.11], [0.03, 0.128], [0.03, 0.15], [0.012, 0.2], [0, 0.21]].map(([px, py]) => [px * k, py * k] as [number, number]), i % 2 ? silver : gold, [x, 0, z]);
          s.ball([0.012 * k, 0.014 * k, 0.012 * k], [x, 0.215 * k, z], matte(i % 2 ? '#2450a8' : '#b3202a', 0.15), 10);
        } else {
          const tint = shellStyle === 'monstrance' ? ['#7a1522', '#2a2a2e', '#5a3d28'][i % 3] : shellStyle === 'jar' ? ['#d9b23c', '#7fb4c8', '#d77f6a', '#e9e2cf'][i % 4] : '#b5b3aa';
          const body = matte(tint, 0.7), lining = matte(shellStyle === 'monstrance' ? '#e9dfc2' : shellStyle === 'museum' ? '#f4f1e8' : '#efe6d2', 1);
          const h = size * 0.7, w = size * 1.7, d = size * 1.3;
          s.box([w * 0.62, h, d], [x, h / 2, z], body);
          s.box([w * 0.54, 0.004, d * 0.86], [x, h + 0.001, z], lining);
          const lid = s.box([w * 0.65, h * 0.3, d * 1.04], [x + 0.004, h * 0.55, z - d * 0.72], body);
          lid.rotation.x = -1.15 + (random() - 0.5) * 0.2;
          if (shellStyle === 'museum') s.label(String(i + 1), 0.022, 0.016, [x, h * 0.5, z + d / 2 + 0.001], '#2a2a2a', '#f4f1e8');
          if (shellStyle === 'monstrance') for (const sx of [-1, 1]) s.box([0.004, h * 0.4, 0.002], [x + sx * w * 0.18, h * 0.6, z + d / 2 + 0.001], gold);
        }
        x -= size + 0.014;
      }
    }

    // Guards.
    if (a.guard === 'lions') {
      const body = a.tradition === 'stupa' ? gold : a.tradition === 'monstrance' ? silver : a.tradition === 'jar' ? matte('#e08a2c', 0.4) : matte('#9a978f', 0.9);
      const mane = a.tradition === 'jar' ? matte('#8a4a1c', 0.6) : body;
      for (const side of [-1, 1]) {
        const lion = new Sculpture(context);
        lion.ball([0.02, 0.026, 0.03], [0, 0.03, -0.008], body, 12).rotation.x = -0.5;
        lion.ball([0.026, 0.026, 0.022], [0, 0.062, 0.012], mane, 12);
        lion.ball([0.016, 0.017, 0.017], [0, 0.064, 0.026], body, 12);
        lion.ball([0.008, 0.007, 0.009], [0, 0.059, 0.042], body, 8);
        for (const ex of [-1, 1]) { lion.ball([0.005, 0.006, 0.004], [ex * 0.013, 0.083, 0.02], body, 6); lion.cylinder(0.006, 0.007, 0.045, [ex * 0.012, 0.0225, 0.018], body, 8); lion.ball([0.011, 0.012, 0.016], [ex * 0.017, 0.012, -0.012], body, 8); }
        lion.tube([[0, 0.012, -0.034], [0.012, 0.02, -0.05], [0.006, 0.045, -0.052]], 0.003, body);
        lion.box([0.07, 0.008, 0.085], [0, 0.004, -0.004], body);
        lion.root.position.set(side * (a.tradition === 'monstrance' ? 0.13 : R + 0.03), 0, 0.12);
        lion.root.rotation.y = side * 0.35;
        lion.root.scale.setScalar(a.tradition === 'jar' ? 0.9 : 1.25);
        s.root.add(lion.root);
      }
    } else if (a.guard === 'padlock') {
      const square = a.tradition === 'museum';
      if (square) {
        for (const side of [-1, 1]) { s.box([chainR * 2, 0.008, 0.006], [0, chainY, side * chainR * 0.72], steel); s.box([0.006, 0.008, chainR * 1.44], [side * chainR * 0.72, chainY, 0], steel); }
      } else {
        for (let i = 0; i < 2; i++) { const loop = s.ring(chainR + 0.004, 0.0035, [0, chainY + i * 0.007, 0], steel); loop.rotation.set(Math.PI / 2 + (i ? 0.08 : -0.06), 0, 0); }
      }
      const frontZ = square ? chainR * 0.72 + 0.008 : chainR + 0.012;
      const lock = s.box([0.04, 0.034, 0.014], [0.01, chainY - 0.028, frontZ], metal('#c79c48'));
      lock.rotation.z = 0.12;
      s.ring(0.012, 0.004, [0.008, chainY - 0.008, frontZ], steel, Math.PI).rotation.z = 0.12;
      s.cylinder(0.004, 0.004, 0.003, [0.012, chainY - 0.03, frontZ + 0.008], matte('#1d1a18'), 8).rotation.x = Math.PI / 2;
    } else if (a.guard === 'garlands') {
      const blooms: { at: P3; size: number; color: string }[] = [];
      const palette = mood.cheer > 0.4 ? ['#f28c1c', '#f2c21c', '#f2a81c'] : ['#f1ecdc', '#f2c21c', '#d9d2bf'];
      const ringAt = a.tradition === 'monstrance' ? 0.105 : R;
      const count = 30 + Math.floor(mood.density * 30);
      for (let i = 0; i < count; i++) {
        const angle = i / count * 6.283;
        blooms.push({ at: [Math.cos(angle) * ringAt * (a.tradition === 'stupa' || a.tradition === 'museum' ? 1.12 : 1) + (random() - 0.5) * 0.008, 0.012 + random() * 0.006, Math.sin(angle) * ringAt * (a.tradition === 'stupa' || a.tradition === 'museum' ? 1.12 : 1) + (random() - 0.5) * 0.008], size: 0.011 + random() * 0.004, color: palette[i % palette.length] });
      }
      // a swag hung across the front
      const swagY = a.tradition === 'monstrance' ? 0.2 : a.tradition === 'jar' ? 0.1 : a.tradition === 'stupa' ? 0.075 : 0.14;
      const swagR = a.tradition === 'monstrance' ? 0.03 : a.tradition === 'jar' ? 0.058 : a.tradition === 'stupa' ? 0.165 : 0.155;
      for (let i = 0; i <= 22; i++) {
        const t = i / 22, angle = mix(-1.5, 1.5, t) + Math.PI / 2;
        const square = a.tradition === 'stupa' || a.tradition === 'museum';
        const px = square ? mix(-swagR, swagR, t) : Math.cos(angle) * swagR, pz = square ? swagR + 0.004 : Math.sin(angle) * swagR;
        blooms.push({ at: [px, swagY - Math.sin(t * Math.PI) * Math.min(0.045, swagY * 0.5), pz + 0.004], size: 0.009, color: palette[(i + 1) % palette.length] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, emissive: '#f2a81c', emissiveIntensity: 0.12 }), blooms);
    }
    void coverTop;

    return s.finish({
      update: (_dt, time) => {
        const pulse = 1 + Math.sin(time * (1.2 + mood.energy * 3)) * 0.2 * (0.3 + mood.energy);
        for (const light of lights) (light.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 * pulse;
        if (glowing) enamel.emissiveIntensity = 0.45 * pulse;
      },
    });
  },
});

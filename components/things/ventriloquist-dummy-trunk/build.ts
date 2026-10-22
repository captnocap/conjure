import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    character: choice('Who is the dummy?', {
      schoolboy: 'A cheeky schoolboy: ginger hair, freckles, snub nose and a school cap.',
      toff: 'A toff: slick black hair, top hat, monocle on a chain and a thin moustache.',
      'old-man': 'A cantankerous old man: bald dome, white side tufts, bushy brows and a red nose.',
      sailor: 'A grinning sailor: blond fringe under a white sailor cap, rosy cheeks.',
    }),
    jaw: choice('How is the jaw?', {
      shut: 'Clamped shut in a painted smile.',
      slack: 'Hanging slack and half open, nobody working it.',
      wide: 'Dropped wide open mid-laugh, teeth showing.',
    }),
    eyes: choice('Where are the eyes looking?', {
      left: 'Swivelled hard to its left.',
      right: 'Swivelled hard to its right.',
      ahead: 'Straight out at whoever opened the trunk.',
      up: 'Rolled up toward the ceiling.',
      crossed: 'Crossed, the mechanism stuck.',
    }),
    outfit: choice('What is it dressed in?', {
      tuxedo: 'A black dinner jacket, white shirt front and bow tie.',
      check: 'A loud checked suit in mustard and brown with a red tie.',
      blazer: 'A striped school blazer with a badge and a crooked tie.',
      sailor: 'A navy sailor top with a white square collar and red neckerchief.',
      shirt: 'Shirt sleeves and braces, the jacket long gone.',
    }),
    era: choice('What era is the trunk from?', {
      vaudeville: 'A brown leather and wood-slat steamer trunk with brass corners and theatre circuit labels.',
      television: 'A powder-blue 1950s vinyl case with chrome trim and network stickers.',
      modern: 'A black flight case with aluminium edges and loud novelty-shop stickers.',
    }),
    state: choice('What is its situation?', {
      retired: 'Retired with honour: tidy, a rosette on its lapel, sitting proudly upright.',
      abandoned: 'Abandoned mid-tour: lid hanging crooked, head lolling, an arm trailing out over the side and streamers spilling.',
      waiting: 'Waiting for a partner who died: head bowed, a black armband, an empty white glove laid on the rim.',
      ready: 'Ready for tonight\'s show: sitting alert, head cocked, script pages beside it.',
    }),
    lining: choice('What lines the trunk?', {
      crimson: 'Crimson velvet.',
      ticking: 'Blue and cream striped mattress ticking.',
      satin: 'Pale quilted satin.',
      bare: 'Bare unvarnished wood with old newspaper pasted in.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = (parent: THREE.Object3D, material: THREE.Material, size: [number, number, number], at: [number, number, number], segments = 16) => {
      const mesh = put(parent, new THREE.SphereGeometry(1, segments, Math.max(8, segments / 2)), material, ...at);
      mesh.scale.set(...size);
      return mesh;
    };
    const limb = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, material: THREE.Material) => {
      const d = to.clone().sub(from);
      const mesh = put(parent, new THREE.CylinderGeometry(r1, r0, d.length(), 12), material);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    // ---- Trunk ----
    const W = 0.8, H = 0.36, D = 0.46, wall = 0.022;
    const era = {
      vaudeville: { body: '#6e4a2c', trim: '#3a2718', metal: '#b8963a' },
      television: { body: '#8fb9cc', trim: '#ece2c8', metal: '#d3d7da' },
      modern: { body: '#1d1d21', trim: '#c2c6ca', metal: '#c2c6ca' },
    }[a.era];
    const body = s.material(era.body, { roughness: a.era === 'television' ? 0.45 : 0.75 });
    const trim = s.material(era.trim, { roughness: 0.6, metalness: a.era === 'modern' ? 0.8 : 0 });
    const metal = s.material(era.metal, { metalness: 0.85, roughness: 0.3 });
    const liningColour = { crimson: '#7d1a2e', ticking: '#e6dcc4', satin: '#e9cfd6', bare: '#c2a172' }[a.lining];
    const liningCanvas = document.createElement('canvas');
    liningCanvas.width = liningCanvas.height = 128;
    const lc = liningCanvas.getContext('2d')!;
    lc.fillStyle = liningColour;
    lc.fillRect(0, 0, 128, 128);
    if (a.lining === 'ticking') { lc.fillStyle = '#4a6a9a'; for (let i = 0; i < 8; i++) lc.fillRect(i * 16 + 4, 0, 5, 128); }
    if (a.lining === 'satin') { lc.strokeStyle = '#c9a4b0'; lc.lineWidth = 2; for (let i = -4; i < 8; i++) { lc.beginPath(); lc.moveTo(i * 32, 0); lc.lineTo(i * 32 + 128, 128); lc.moveTo(i * 32 + 128, 0); lc.lineTo(i * 32, 128); lc.stroke(); } }
    if (a.lining === 'bare') { lc.fillStyle = '#d9d2bc'; for (let i = 0; i < 5; i++) lc.fillRect(random() * 90, random() * 90, 40, 30); lc.fillStyle = '#7a7466'; for (let i = 0; i < 60; i++) lc.fillRect(random() * 128, random() * 128, 14, 1.5); }
    const liningTexture = new THREE.CanvasTexture(liningCanvas);
    liningTexture.colorSpace = THREE.SRGBColorSpace;
    liningTexture.wrapS = liningTexture.wrapT = THREE.RepeatWrapping;
    liningTexture.repeat.set(3, 2);
    const lining = new THREE.MeshStandardMaterial({ map: liningTexture, roughness: 0.95 });

    s.box([W, wall, D], [0, wall / 2, 0], body);
    s.box([W - wall * 2, 0.004, D - wall * 2], [0, wall + 0.002, 0], lining);
    for (const side of [-1, 1]) {
      s.box([wall, H, D], [side * (W - wall) / 2, H / 2, 0], body);
      s.box([0.004, H - wall, D - wall * 2], [side * (W / 2 - wall - 0.002), H / 2 + wall / 2, 0], lining);
      s.box([W, H, wall], [0, H / 2, side * (D - wall) / 2], body);
    }
    s.box([W - wall * 2, H - wall, 0.004], [0, H / 2 + wall / 2, -D / 2 + wall + 0.002], lining);
    s.box([W - wall * 2, H - wall, 0.004], [0, H / 2 + wall / 2, D / 2 - wall - 0.002], lining);
    // Bands, corners, latches and handles.
    const bandXs = a.era === 'vaudeville' ? [-0.26, 0, 0.26] : a.era === 'modern' ? [-0.39, 0.39] : [-0.3, 0.3];
    for (const x of bandXs) s.box([a.era === 'vaudeville' ? 0.045 : 0.025, H + 0.004, 0.008], [x, H / 2, D / 2 + 0.004], trim);
    if (a.era !== 'vaudeville') {
      s.box([W + 0.006, 0.02, 0.008], [0, H - 0.01, D / 2 + 0.004], trim);
      s.box([W + 0.006, 0.02, 0.008], [0, 0.01, D / 2 + 0.004], trim);
    }
    for (const sx of [-1, 1]) for (const sy of [0, 1]) {
      const corner = s.ball([0.035, 0.035, 0.035], [sx * (W / 2 - 0.012), sy ? H - 0.014 : 0.014, D / 2 - 0.006], metal, 10);
      corner.scale.z = 0.02;
    }
    for (const x of [-0.17, 0.17]) {
      s.box([0.05, 0.04, 0.012], [x, H - 0.03, D / 2 + 0.008], metal);
      s.box([0.03, 0.045, 0.008], [x, H + 0.005, D / 2 + 0.012], metal).rotation.x = -0.5;
    }
    for (const side of [-1, 1]) {
      const handle = s.ring(0.05, 0.008, [side * (W / 2 + 0.006), H * 0.55, 0], trim, Math.PI);
      handle.rotation.set(0, Math.PI / 2, 0);
      handle.rotation.z = Math.PI;
    }

    // Lid, hinged open at the back.
    const crooked = a.state === 'abandoned';
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    lid.rotation.x = -(crooked ? 0.75 : 0.22 + random() * 0.08);
    lid.rotation.z = crooked ? (random() < 0.5 ? -1 : 1) * 0.13 : 0;
    s.root.add(lid);
    const lidDepth = 0.13;
    put(lid, new THREE.BoxGeometry(W, D, wall), body, 0, D / 2, -lidDepth);
    put(lid, new THREE.BoxGeometry(W - wall * 2, D - wall * 2, 0.004), lining, 0, D / 2, -lidDepth + wall / 2 + 0.002);
    for (const side of [-1, 1]) {
      put(lid, new THREE.BoxGeometry(wall, D, lidDepth), body, side * (W - wall) / 2, D / 2, -lidDepth / 2);
      put(lid, new THREE.BoxGeometry(W, wall, lidDepth), body, 0, side > 0 ? D - wall / 2 : wall / 2, -lidDepth / 2);
    }
    const poster = { vaudeville: ['THE GREAT ALFONSO', '& PIP'], television: ['UNCLE RAY & CHIPS', 'LIVE ON CHANNEL 7'], modern: ['LAUGH FACTORY', 'FRI + SAT 9PM'] }[a.era];
    const paper = new THREE.Color('#f0e3c0').lerp(new THREE.Color('#a8905c'), wear * 0.6).getStyle();
    const p1 = s.label(poster[0], 0.5, 0.09, [0, 0, 0], a.era === 'modern' ? '#e0206a' : '#7a1c1c', paper);
    const p2 = s.label(poster[1], 0.5, 0.07, [0, 0, 0], '#2a2420', paper);
    lid.add(p1, p2);
    p1.position.set(0, D * 0.72, -lidDepth + wall / 2 + 0.006);
    p2.position.set(0, D * 0.72 - 0.08, -lidDepth + wall / 2 + 0.006);
    p1.rotation.z = p2.rotation.z = (random() - 0.5) * 0.06;

    // Stickers across the front.
    const stickers = {
      vaudeville: [['ORPHEUM', '#f0e3c0', '#7a1c1c'], ['PALACE', '#d8b45a', '#2a2420'], ['S.S. AQUITANIA', '#c8d4d0', '#1f3d5a'], ['FRAGILE', '#c9442c', '#f6ecd4'], ['EMPIRE BLACKPOOL', '#e6d2a0', '#3a2a1a'], ['PARIS', '#9db8c4', '#7a1c1c']],
      television: [['CHANNEL 7', '#f4d03a', '#1f3d5a'], ['ON AIR', '#d8263c', '#ffffff'], ['VARIETY HOUR', '#ffffff', '#2a8a8a'], ['HOLLYWOOD', '#ff9a5a', '#2a2420'], ['NBC STUDIOS', '#2a2420', '#f4d03a'], ['LAS VEGAS', '#e8a0c0', '#5a1a5a']],
      modern: [['HA HA HA', '#ffe23a', '#111111'], ['COMEDY FEST', '#ff3d8a', '#ffffff'], ['FRAGILE', '#ff5a1f', '#ffffff'], ['I SPEAK FOR MYSELF', '#35d07f', '#111111'], ['LOL', '#3aa0ff', '#ffffff'], ['THIS SIDE UP', '#ffffff', '#111111']],
    }[a.era];
    const stickerCount = Math.round(mix(2, 6, mood.density));
    for (let i = 0; i < stickerCount; i++) {
      const [text, bg, ink] = stickers[(i + Math.floor(random() * 6)) % 6];
      const w = 0.12 + text.length * 0.008;
      const sticker = s.label(text, w, 0.055, [mix(-0.3, 0.3, (i + 0.5) / stickerCount) + (random() - 0.5) * 0.05, mix(0.07, 0.25, random()), D / 2 + 0.0095 + i * 0.0006], ink, new THREE.Color(bg).lerp(new THREE.Color('#9a8a6a'), wear * 0.45).getStyle());
      sticker.rotation.z = (random() - 0.5) * 0.7;
    }

    // ---- Dummy ----
    const skinColour = new THREE.Color('#f2c7a0').lerp(new THREE.Color('#b99a7a'), wear * 0.3);
    const skin = new THREE.MeshStandardMaterial({ color: skinColour, roughness: 0.32 + wear * 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 0.9 });
    const red = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c4222c').lerp(new THREE.Color('#8a6a5a'), wear * 0.4), roughness: 0.35 });
    const white = new THREE.MeshStandardMaterial({ color: '#f4f0e6', roughness: 0.2 });
    const outfit = {
      tuxedo: { jacket: '#17171b', shirt: '#f2efe6', tie: '#17171b', legs: '#17171b' },
      check: { jacket: '#c9a03a', shirt: '#f2efe6', tie: '#c4222c', legs: '#c9a03a' },
      blazer: { jacket: '#1f3d6a', shirt: '#f2efe6', tie: '#d8b02a', legs: '#6a6a70' },
      sailor: { jacket: '#22355c', shirt: '#22355c', tie: '#c4222c', legs: '#f2efe6' },
      shirt: { jacket: '#e9e2d0', shirt: '#e9e2d0', tie: '#5a3a2a', legs: '#4a4034' },
    }[a.outfit];
    const fadeTo = new THREE.Color('#9a9080');
    const mat = (hex: string, rough = 0.85) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(fadeTo, wear * 0.35), roughness: rough });
    let jacket: THREE.Material = mat(outfit.jacket);
    if (a.outfit === 'check' || a.outfit === 'blazer') {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.fillStyle = `#${new THREE.Color(outfit.jacket).lerp(fadeTo, wear * 0.35).getHexString()}`;
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = a.outfit === 'check' ? 'rgba(90,50,20,0.6)' : 'rgba(240,220,160,0.9)';
      for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, a.outfit === 'check' ? 6 : 4, 64); if (a.outfit === 'check') g.fillRect(0, i * 16, 64, 6); }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 2);
      jacket = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    }
    const shirt = mat(outfit.shirt), tie = mat(outfit.tie), trousers = mat(outfit.legs);

    const dummy = new THREE.Group();
    const sideLean = a.state === 'abandoned' ? (random() < 0.5 ? -1 : 1) : 0;
    dummy.position.set(0, 0.2, -0.03);
    dummy.rotation.z = sideLean * 0.2;
    dummy.rotation.y = (random() - 0.5) * 0.2;
    s.root.add(dummy);
    // Torso.
    const torso = put(dummy, new THREE.CylinderGeometry(0.135, 0.11, 0.38, 20), jacket, 0, 0.19, 0);
    torso.scale.z = 0.62;
    const front = put(dummy, new THREE.BoxGeometry(0.085, 0.3, 0.02), shirt, 0, 0.21, 0.074);
    front.rotation.x = -0.04;
    for (const side of [-1, 1]) ball(dummy, jacket, [0.055, 0.045, 0.055], [side * 0.125, 0.355, 0]);
    if (a.outfit === 'tuxedo') {
      for (const side of [-1, 1]) { const wing = put(dummy, new THREE.ConeGeometry(0.026, 0.05, 4), tie, side * 0.03, 0.365, 0.09); wing.rotation.z = side * Math.PI / 2; wing.scale.z = 0.4; }
      ball(dummy, tie, [0.012, 0.014, 0.01], [0, 0.365, 0.09]);
      for (let i = 0; i < 3; i++) ball(dummy, dark, [0.007, 0.007, 0.004], [0, 0.3 - i * 0.06, 0.086], 8);
    } else if (a.outfit === 'sailor') {
      put(dummy, new THREE.BoxGeometry(0.25, 0.1, 0.02), white, 0, 0.345, -0.07).rotation.x = 0.15;
      const v = put(dummy, new THREE.ConeGeometry(0.06, 0.12, 3), white, 0, 0.31, 0.08);
      v.rotation.x = Math.PI; v.scale.z = 0.2;
      const knot = put(dummy, new THREE.ConeGeometry(0.03, 0.09, 4), tie, 0, 0.25, 0.09);
      knot.rotation.x = Math.PI; knot.scale.z = 0.4;
    } else {
      const length = a.outfit === 'shirt' ? 0.14 : 0.2;
      const blade = put(dummy, new THREE.BoxGeometry(0.035, length, 0.008), tie, a.outfit === 'blazer' ? 0.012 : 0, 0.355 - length / 2, 0.088);
      blade.rotation.z = a.outfit === 'blazer' ? 0.14 : 0;
      ball(dummy, tie, [0.02, 0.016, 0.012], [0, 0.36, 0.088]);
      if (a.outfit === 'shirt') for (const side of [-1, 1]) put(dummy, new THREE.BoxGeometry(0.018, 0.34, 0.008), mat('#8a2a2a'), side * 0.06, 0.2, 0.086).rotation.x = -0.04;
      if (a.outfit === 'blazer') { const badge = put(dummy, new THREE.CylinderGeometry(0.022, 0.016, 0.006, 5), mat('#d8b02a', 0.4), -0.085, 0.27, 0.078); badge.rotation.x = Math.PI / 2; }
    }
    // Arms.
    const rim = H + 0.02 - 0.2;
    const trailing = sideLean;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.145, 0.345, 0);
      const out = trailing === side;
      const elbow = out ? new THREE.Vector3(side * 0.34, rim + 0.04, 0.06) : new THREE.Vector3(side * (0.2 + random() * 0.03), 0.2, 0.09);
      const hand = out ? new THREE.Vector3(side * 0.44, -0.16, 0.1) : new THREE.Vector3(side * (0.15 + random() * 0.06), rim + 0.012, D / 2 - 0.01 + 0.03);
      limb(dummy, shoulder, elbow, 0.04, 0.034, jacket);
      limb(dummy, elbow, hand, 0.034, 0.028, jacket);
      ball(dummy, jacket, [0.036, 0.036, 0.036], [elbow.x, elbow.y, elbow.z], 10);
      limb(dummy, hand.clone().lerp(elbow, 0.12), hand, 0.03, 0.03, shirt);
      const palm = ball(dummy, skin, [0.03, 0.02, 0.042], [hand.x, hand.y + (out ? -0.03 : 0.004), hand.z + (out ? 0 : 0.03)], 12);
      if (out) palm.scale.set(0.022, 0.042, 0.03);
      ball(dummy, skin, [0.01, 0.012, 0.02], [hand.x - side * 0.028, palm.position.y, palm.position.z - 0.005], 8);
      if (a.state === 'waiting' && side < 0) {
        const band = limb(dummy, shoulder.clone().lerp(elbow, 0.45), shoulder.clone().lerp(elbow, 0.7), 0.043, 0.041, new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.9 }));
        band.castShadow = false;
      }
    }
    // Legs flop over the front rim.
    for (const side of [-1, 1]) {
      const hip = new THREE.Vector3(side * 0.06, 0.03, 0.05);
      const knee = new THREE.Vector3(side * (0.075 + random() * 0.02), rim + 0.02, D / 2 + 0.03 + 0.03);
      const ankle = new THREE.Vector3(knee.x + (random() - 0.5) * 0.05, -0.2 + 0.14 + random() * 0.05, D / 2 + 0.06 + 0.03);
      limb(dummy, hip, knee, 0.038, 0.032, trousers);
      limb(dummy, knee, ankle, 0.032, 0.026, trousers);
      ball(dummy, trousers, [0.033, 0.033, 0.033], [knee.x, knee.y, knee.z], 10);
      const shoe = ball(dummy, mat('#2a1a12', 0.3), [0.034, 0.03, 0.062], [ankle.x, ankle.y - 0.02, ankle.z + 0.025], 12);
      shoe.rotation.x = 0.5;
      shoe.rotation.y = side * 0.25;
    }
    if (a.state === 'retired') {
      const gold = mat('#d8b02a', 0.3);
      const rosette = put(dummy, new THREE.CylinderGeometry(0.032, 0.032, 0.008, 12), red, 0.09, 0.29, 0.08);
      rosette.rotation.x = Math.PI / 2;
      put(dummy, new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), gold, 0.09, 0.29, 0.082).rotation.x = Math.PI / 2;
      for (const k of [-1, 1]) put(dummy, new THREE.BoxGeometry(0.016, 0.07, 0.004), red, 0.09 + k * 0.012, 0.235, 0.078).rotation.z = k * 0.2;
    }

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.39, 0);
    const bowed = a.state === 'waiting' ? 0.38 : a.state === 'abandoned' ? 0.25 : a.state === 'retired' ? -0.1 : -0.04;
    head.rotation.x = bowed;
    head.rotation.z = a.state === 'abandoned' ? sideLean * 0.45 : a.state === 'ready' ? 0.22 : (random() - 0.5) * 0.1;
    head.rotation.y = a.state === 'ready' ? -0.3 : (random() - 0.5) * 0.2;
    dummy.add(head);
    put(head, new THREE.CylinderGeometry(0.036, 0.042, 0.08, 14), skin, 0, 0.02, 0);
    ball(head, skin, [0.105, 0.118, 0.103], [0, 0.155, 0], 28);
    for (const side of [-1, 1]) {
      ball(head, skin, [0.036, 0.034, 0.03], [side * 0.055, 0.125, 0.073], 14);
      ball(head, new THREE.MeshStandardMaterial({ color: new THREE.Color('#e8626a').lerp(skinColour, wear * 0.6), roughness: 0.4 }), [0.024, 0.022, 0.01], [side * 0.06, 0.127, 0.099], 12).rotation.y = side * 0.5;
      const ear = ball(head, skin, [0.018, 0.034, 0.026], [side * 0.106, 0.16, 0], 12);
      ear.rotation.y = side * 0.4;
    }
    const noseSize: [number, number, number] = a.character === 'toff' ? [0.016, 0.03, 0.03] : a.character === 'old-man' ? [0.028, 0.027, 0.03] : [0.019, 0.017, 0.022];
    ball(head, a.character === 'old-man' ? new THREE.MeshStandardMaterial({ color: '#d8645a', roughness: 0.35 }) : skin, noseSize, [0, 0.152, 0.105], 14);
    // Eyes that swivel.
    const iris = new THREE.MeshStandardMaterial({ color: a.character === 'toff' ? '#5a7a4a' : a.character === 'old-man' ? '#7a8a9a' : '#3a6ab8', roughness: 0.15 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.1 });
    const lookers: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.04, 0.19, 0.076);
      head.add(eye);
      ball(eye, white, [0.027, 0.027, 0.027], [0, 0, 0], 18);
      const look = new THREE.Group();
      const yaw = { left: 0.62, right: -0.62, ahead: 0, up: 0, crossed: -side * 0.55 }[a.eyes];
      look.rotation.set(a.eyes === 'up' ? -0.6 : a.state === 'waiting' ? 0.3 : 0, yaw, 0);
      eye.add(look);
      lookers.push(look);
      ball(look, iris, [0.015, 0.015, 0.005], [0, 0, 0.0245], 14);
      ball(look, pupil, [0.0075, 0.0075, 0.004], [0, 0, 0.027], 10);
      const lidAmount = a.state === 'waiting' ? 0.55 : a.state === 'abandoned' ? 0.35 : a.character === 'toff' ? 0.3 : 0.16;
      const cover = put(eye, new THREE.SphereGeometry(0.0285, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin);
      cover.rotation.x = -Math.PI / 2 + lidAmount * Math.PI;
      // Brows.
      const browColour = a.character === 'old-man' ? '#ecebe6' : a.character === 'schoolboy' ? '#b8501c' : a.character === 'sailor' ? '#b8923a' : '#16120f';
      const brow = put(head, new THREE.BoxGeometry(0.04, a.character === 'old-man' ? 0.014 : 0.008, 0.01), new THREE.MeshStandardMaterial({ color: browColour, roughness: 0.6 }), side * 0.042, a.character === 'toff' && side > 0 ? 0.238 : 0.228, 0.088);
      brow.rotation.z = side * (a.character === 'old-man' ? 0.3 : a.state === 'waiting' ? -0.3 : -0.12);
      brow.rotation.y = side * 0.35;
    }
    // Mouth: a painted upper lip and the dropping jaw block in its slot.
    const open = { shut: 0, slack: 0.022, wide: 0.042 }[a.jaw];
    const slot = put(head, new THREE.BoxGeometry(0.074, 0.075, 0.03), dark, 0, 0.068, 0.08);
    slot.castShadow = false;
    const upperLip = ball(head, red, [0.036, 0.008, 0.012], [0, 0.108, 0.099], 12);
    upperLip.rotation.x = 0.2;
    put(head, new THREE.BoxGeometry(0.05, 0.012, 0.008), white, 0, 0.099, 0.09);
    const jaw = new THREE.Group();
    jaw.position.set(0, -open, 0);
    head.add(jaw);
    const chin = put(jaw, new THREE.BoxGeometry(0.066, 0.06, 0.04), skin, 0, 0.066, 0.079);
    chin.rotation.x = 0.12;
    ball(jaw, skin, [0.033, 0.024, 0.022], [0, 0.048, 0.094], 12);
    ball(jaw, red, [0.03, 0.008, 0.01], [0, 0.094, 0.1], 12);
    put(jaw, new THREE.BoxGeometry(0.046, 0.009, 0.006), white, 0, 0.097, 0.09);
    // Hair, hats and character marks.
    const hairColour = { schoolboy: '#c8541c', toff: '#141210', 'old-man': '#ecebe6', sailor: '#d8b24a' }[a.character];
    const hair = new THREE.MeshStandardMaterial({ color: hairColour, roughness: a.character === 'toff' ? 0.2 : 0.55 });
    if (a.character !== 'old-man') {
      const cap = put(head, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 0.16, -0.004);
      cap.scale.set(0.109, 0.121, 0.108);
      cap.rotation.x = -0.4;
      if (a.character === 'schoolboy' || a.character === 'sailor') for (let i = 0; i < 5; i++) ball(head, hair, [0.022, 0.016, 0.016], [-0.05 + i * 0.025, 0.243 - Math.abs(i - 2) * 0.006, 0.07], 10).rotation.z = (random() - 0.5) * 0.8;
    } else {
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) ball(head, hair, [0.022, 0.022, 0.022], [side * (0.1 - i * 0.004), 0.16 + (random() - 0.3) * 0.04, -0.01 - i * 0.016], 8);
      for (const side of [-1, 1]) ball(head, hair, [0.026, 0.011, 0.012], [side * 0.022, 0.119, 0.102], 10).rotation.z = side * -0.3;
    }
    if (a.character === 'schoolboy') {
      const capColour = mat(outfit.jacket === '#e9e2d0' ? '#7a1c1c' : outfit.jacket);
      const cap = put(head, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), capColour, 0, 0.215, -0.01);
      cap.scale.set(0.095, 0.075, 0.095);
      cap.rotation.z = 0.25;
      const peak = put(head, new THREE.CylinderGeometry(0.06, 0.06, 0.008, 16, 1, false, -1, 2), capColour, 0.015, 0.243, 0.06);
      peak.rotation.x = 0.25;
      for (let i = 0; i < 8; i++) ball(head, new THREE.MeshStandardMaterial({ color: '#a8643a', roughness: 0.5 }), [0.004, 0.004, 0.002], [(i < 4 ? -1 : 1) * (0.035 + random() * 0.035), 0.14 + random() * 0.02, 0.097 - random() * 0.004], 6);
    }
    if (a.character === 'toff') {
      const silk = new THREE.MeshStandardMaterial({ color: '#131316', roughness: 0.25 });
      const hat = new THREE.Group();
      hat.position.set(0, 0.26, -0.01);
      hat.rotation.set(-0.12, 0, 0.14);
      head.add(hat);
      put(hat, new THREE.CylinderGeometry(0.115, 0.115, 0.01, 24), silk);
      put(hat, new THREE.CylinderGeometry(0.078, 0.072, 0.15, 24), silk, 0, 0.078, 0);
      put(hat, new THREE.CylinderGeometry(0.0745, 0.0745, 0.024, 24), mat('#7a1c2c', 0.5), 0, 0.02, 0);
      const brass = new THREE.MeshStandardMaterial({ color: '#d8b24a', metalness: 0.85, roughness: 0.25 });
      const monocle = put(head, new THREE.TorusGeometry(0.03, 0.0035, 8, 24), brass, 0.04, 0.188, 0.104);
      monocle.rotation.y = 0.2;
      limb(head, new THREE.Vector3(0.068, 0.176, 0.098), new THREE.Vector3(0.09, 0.02, 0.07), 0.0015, 0.0015, brass);
      for (const side of [-1, 1]) ball(head, dark, [0.022, 0.004, 0.006], [side * 0.02, 0.123, 0.104], 8).rotation.z = side * 0.25;
    }
    if (a.character === 'sailor') {
      const capWhite = mat('#f4f1e8', 0.7);
      const hat = new THREE.Group();
      hat.position.set(0, 0.25, -0.015);
      hat.rotation.set(-0.2, 0, -0.2);
      head.add(hat);
      put(hat, new THREE.CylinderGeometry(0.075, 0.09, 0.05, 20), capWhite, 0, 0.025, 0);
      put(hat, new THREE.CylinderGeometry(0.1, 0.092, 0.03, 20), capWhite, 0, 0.012, 0);
    }

    // State dressing around the trunk.
    if (a.state === 'waiting') {
      const glove = mat('#f6f3ea', 0.8);
      const gx = 0.26, gz = D / 2 - 0.01;
      const palm = s.ball([0.045, 0.012, 0.055], [gx, H + 0.012, gz], glove, 12);
      palm.rotation.y = 0.4;
      for (let i = 0; i < 4; i++) s.rod([gx - 0.03 + i * 0.02, H + 0.01, gz + 0.04], [gx - 0.045 + i * 0.026, H - 0.07 + (i % 2) * 0.012, gz + 0.062], 0.009, glove, 0.007);
      const stem = mat('#5a6a3a');
      s.rod([-0.3, H + 0.005, D / 2 - 0.01], [-0.14, H + 0.012, D / 2 + 0.01], 0.004, stem);
      s.ball([0.03, 0.016, 0.03], [-0.13, H + 0.02, D / 2 + 0.012], mat('#e9e2d0'), 10);
    }
    if (a.state === 'abandoned') {
      const colours = ['#d8263c', '#f2c230', '#2f8fd0', '#35b06a'];
      for (let i = 0; i < 5; i++) {
        const x = -sideLean * (0.1 + random() * 0.22), top = H + 0.01;
        const pts: [number, number, number][] = [[x, top - 0.08, D / 2 - 0.06], [x + 0.01, top + 0.012, D / 2], [x + (random() - 0.5) * 0.08, top - 0.15, D / 2 + 0.035], [x + (random() - 0.5) * 0.16, 0.006, D / 2 + 0.08 + random() * 0.14], [x + (random() - 0.5) * 0.3, 0.004, D / 2 + 0.16 + random() * 0.2]];
        s.tube(pts, 0.006, mat(colours[i % 4], 0.7));
      }
    }
    if (a.state === 'ready') {
      const page = mat('#f2ecd8');
      for (let i = 0; i < 4; i++) {
        const sheet = s.box([0.21, 0.002, 0.29], [W / 2 + 0.16 + (random() - 0.5) * 0.04, 0.002 + i * 0.003, 0.1 + (random() - 0.5) * 0.05], page);
        sheet.rotation.y = (random() - 0.5) * 0.7;
      }
      const top = s.label('ACT ONE', 0.15, 0.04, [W / 2 + 0.16, 0.016, 0.06], '#2a2420', '#f2ecd8');
      top.rotation.x = -Math.PI / 2;
      top.rotation.z = 0.2;
    }

    const energy = mood.energy;
    const yaws = lookers.map((look) => look.rotation.y);
    return s.finish({
      update: (_dt, time) => {
        if (energy < 0.12) return;
        const beat = Math.max(0, Math.sin(time * mix(1.5, 9, energy)) * Math.sin(time * 0.9 + 1));
        jaw.position.y = -open - beat * 0.03 * energy;
        if (a.eyes !== 'crossed') lookers.forEach((look, i) => { look.rotation.y = yaws[i] + Math.sin(time * 0.8) * 0.18 * energy; });
      },
    });
  },
});

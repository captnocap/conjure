import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V = [number, number, number];

export default defineThing({
  questions: {
    holds: choice('What does the fox carry in its mouth?', {
      key: 'A golden key to the rice granary, hanging from its jaws.',
      jewel: 'A round wish-granting jewel with a flame-shaped tip.',
      scroll: 'A rolled scroll held crosswise, a message from the god.',
      rice: 'A sheaf of rice ears, drooping with grain.',
      nothing: 'Nothing; its mouth is closed in a thin smile.',
    }),
    pose: choice('How does it sit?', {
      alert: 'Bolt upright, facing straight ahead, tail raised like a flame.',
      turned: 'Head turned sharply to one side, watching whoever comes up the path.',
      paw: 'One forepaw resting on a stone ball.',
      cub: 'A fox cub tucked against its forelegs, looking up.',
      howl: 'Muzzle lifted high toward the sky, as if calling.',
    }),
    material: choice('What is the statue made of?', {
      granite: 'Grey carved granite, the ordinary shrine fox.',
      white: 'Glazed white porcelain with red ear linings and gilt details, a sacred white fox.',
      bronze: 'Cast bronze gone green and brown with verdigris.',
      basalt: 'Dark rough basalt, heavy, almost black.',
      sandstone: 'Soft tan sandstone, features worn round by rain.',
    }),
    bib: choice('What is tied round its neck?', {
      red: 'A bright red cloth bib, freshly tied.',
      faded: 'A bib bleached by sun to pale pink, fraying at the hem.',
      layered: 'Several bibs layered over each other, red on red on white, from many visitors.',
      patterned: 'A hand-sewn bib with a white dotted pattern and a small bell.',
      none: 'No bib; bare stone.',
    }),
    plinth: choice('What does it sit on?', {
      pedestal: 'A tall cut-stone pedestal with carved donor characters on the front.',
      stepped: 'A broad two-stepped stone base.',
      boulder: 'A rough natural boulder.',
      slab: 'Only a thin stone slab, as a small household or desk figure would have.',
    }),
    story: choice('What is its condition and story?', {
      tended: 'Clean and tended; people still come every week.',
      forgotten: 'Forgotten: blotched with moss and lichen, one ear broken off.',
      snow: 'Wearing a cap of snow on its head, back and plinth.',
      foxfire: 'Its eyes glow, and small pale flames hover near it: the spirit is at home.',
      cracked: 'Split by a great crack and mended with cord wound round its body.',
    }),
    offerings: choice('What has been left before it?', {
      none: 'Nothing.',
      tofu: 'A dish of fried tofu and a little cup of sake.',
      figurines: 'A crowd of tiny white ceramic foxes left by worshippers.',
      coins: 'A scatter of coins and a few knotted paper fortunes.',
      candles: 'Small votive candles burning in a row.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const forgotten = a.story === 'forgotten';
    const mossAmount = Math.min(1, (forgotten ? 0.9 : 0.1) + mood.wear * 0.35) * (a.material === 'white' ? 0.4 : 1);
    const mossColour = new THREE.Color().setHSL(mix(0.3, 0.24, mood.warmth), 0.5, 0.25);
    const baseHex = { granite: '#a09f97', white: '#f1efe9', bronze: '#5f7f6a', basalt: '#4b4b50', sandstone: '#c2a680' }[a.material];

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    const speckles = a.material === 'white' ? 80 : 1500;
    for (let i = 0; i < speckles; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    if (a.material === 'bronze') for (let i = 0; i < 70; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(96,60,30,0.35)' : 'rgba(130,200,170,0.3)';
      ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 4 + random() * 18, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 80 * mossAmount; i++) {
      const x = random() * 256, y = random() * 256, r = 5 + random() * 24 * mossAmount;
      const tone = (random() < 0.25 ? new THREE.Color('#c9c7a0') : mossColour.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.1));
      const rgb = `${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)}`;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, `rgba(${rgb},0.95)`);
      blot.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = skin.wrapT = THREE.RepeatWrapping;
    const body = new THREE.MeshStandardMaterial({
      map: skin, roughness: a.material === 'white' ? 0.25 : a.material === 'bronze' ? 0.5 : 0.95, metalness: a.material === 'bronze' ? 0.6 : 0,
    });
    const block = a.material === 'white' || a.material === 'bronze' ? new THREE.MeshStandardMaterial({ color: '#a19f96', roughness: 0.95 }) : new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95 });
    const gold = s.material('#d8ad3c', { metalness: 0.85, roughness: 0.3 });
    const red = s.material('#c8261f', { roughness: 0.8 });
    const snow = new THREE.MeshStandardMaterial({ color: '#f5f7f9', roughness: 0.85 });
    const glowEyes = a.story === 'foxfire';
    const eye = new THREE.MeshStandardMaterial({
      color: glowEyes ? '#fff2a8' : a.material === 'white' ? '#1c1a18' : '#2b2a28', emissive: glowEyes ? '#ffd24a' : '#000000', emissiveIntensity: glowEyes ? 2.2 : 0, roughness: 0.4,
    });

    const add = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V, scale: V = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const sphere = new THREE.SphereGeometry(1, 18, 12);
    const limb = (group: THREE.Object3D, from: V, to: V, r0: number, r1: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(group, new THREE.CylinderGeometry(r1, r0, d.length(), 14), material, p.clone().add(q).multiplyScalar(0.5).toArray() as V);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    /** One seated fox, about a metre tall to the ear tips, facing +z, sitting on y = 0. */
    const fox = (pose: typeof a.pose, carries: typeof a.holds, brokenEar: boolean) => {
      const g = new THREE.Group();
      add(g, sphere, body, [0, 0.2, -0.1], [0.19, 0.21, 0.24]);
      limb(g, [0, 0.2, -0.08], [0, 0.55, 0.09], 0.17, 0.115, body);
      add(g, sphere, body, [0, 0.52, 0.1], [0.125, 0.14, 0.125]);
      for (const side of [-1, 1]) {
        add(g, sphere, body, [side * 0.15, 0.05, 0.05], [0.055, 0.05, 0.13]);
        const lifted = pose === 'paw' && side === 1;
        limb(g, [side * 0.075, 0.5, 0.14], [side * 0.075, lifted ? 0.2 : 0.04, lifted ? 0.26 : 0.2], 0.05, 0.036, body);
        add(g, sphere, body, [side * 0.075, lifted ? 0.19 : 0.03, lifted ? 0.28 : 0.225], [0.045, 0.035, 0.06]);
        if (lifted) add(g, sphere, a.material === 'white' ? gold : body, [side * 0.075, 0.085, 0.3], [0.085, 0.085, 0.085]);
      }
      // Tail: a tall flame-shaped brush standing up behind the back.
      const tail = add(g, new THREE.LatheGeometry([[0, 0], [0.06, 0.05], [0.095, 0.3], [0.11, 0.5], [0.085, 0.72], [0.035, 0.9], [0, 0.98]].map(([x, y]) => new THREE.Vector2(x, y)), 16), body, [0, 0.06, -0.3]);
      tail.rotation.x = -0.16;
      tail.scale.z = 0.8;
      if (a.material === 'white') add(g, sphere, gold, [0, 1.0, -0.455], [0.04, 0.05, 0.04]);

      const head = new THREE.Group();
      head.position.set(0, 0.6, 0.11);
      g.add(head);
      limb(head, [0, -0.06, -0.01], [0, 0.14, 0.03], 0.1, 0.08, body);
      add(head, sphere, body, [0, 0.2, 0.05], [0.105, 0.098, 0.115]);
      const muzzle = limb(head, [0, 0.185, 0.12], [0, 0.165, 0.33], 0.062, 0.024, body);
      muzzle.scale.x = 0.85;
      add(head, sphere, eye, [0, 0.168, 0.335], [0.022, 0.018, 0.02]);
      for (const side of [-1, 1]) {
        // Cheek ruff, slanted eye, tall ear.
        const ruff = add(head, new THREE.ConeGeometry(0.05, 0.14, 8), body, [side * 0.1, 0.16, 0.03]);
        ruff.rotation.z = side * -2.0;
        ruff.scale.z = 0.5;
        const slit = add(head, sphere, eye, [side * 0.062, 0.225, 0.13], [0.03, 0.011, 0.012]);
        slit.rotation.set(0, side * 0.6, side * 0.45);
        if (brokenEar && side === 1) { add(head, new THREE.CylinderGeometry(0.03, 0.045, 0.04, 6), body, [side * 0.065, 0.3, 0.01]); continue; }
        const ear = add(head, new THREE.ConeGeometry(0.05, 0.16, 4), body, [side * 0.065, 0.35, 0.005]);
        ear.rotation.set(0, Math.PI / 4, side * -0.16, 'ZXY');
        ear.scale.z = 0.6;
        if (a.material === 'white') {
          const inner = add(head, new THREE.ConeGeometry(0.03, 0.11, 4), red, [side * 0.065, 0.34, 0.024]);
          inner.rotation.set(0, Math.PI / 4, side * -0.16, 'ZXY');
          inner.scale.z = 0.3;
        }
      }
      const tip: V = [0, 0.14, 0.32];
      if (carries === 'key') {
        limb(head, [0, 0.15, 0.31], [0, -0.04, 0.33], 0.011, 0.011, gold);
        const loop = add(head, new THREE.TorusGeometry(0.035, 0.01, 6, 14), gold, [0, 0.16, 0.345]);
        loop.rotation.y = Math.PI / 2;
        const spiral = add(head, new THREE.TorusGeometry(0.035, 0.011, 6, 14, Math.PI * 1.5), gold, [0, -0.05, 0.365]);
        spiral.rotation.y = Math.PI / 2;
      } else if (carries === 'jewel') {
        add(head, new THREE.LatheGeometry([[0, -0.05], [0.045, -0.035], [0.055, 0], [0.04, 0.035], [0.012, 0.07], [0, 0.095]].map(([x, y]) => new THREE.Vector2(x, y)), 14), gold, [tip[0], tip[1] + 0.02, tip[2] + 0.04]).rotation.x = 0.5;
      } else if (carries === 'scroll') {
        const paper = s.material('#efe6c8', { roughness: 0.8 });
        const roll = add(head, new THREE.CylinderGeometry(0.024, 0.024, 0.24, 12), paper, [0, 0.145, 0.3]);
        roll.rotation.z = Math.PI / 2;
        for (const side of [-1, 1]) add(head, new THREE.CylinderGeometry(0.028, 0.028, 0.02, 12), red, [side * 0.125, 0.145, 0.3]).rotation.z = Math.PI / 2;
      } else if (carries === 'rice') {
        const straw = s.material('#d9b85a', { roughness: 0.8 });
        for (let i = 0; i < 7; i++) {
          const ear = limb(head, [0, 0.15, 0.3], [(i - 3) * 0.035, -0.06 - random() * 0.05, 0.33 + random() * 0.06], 0.006, 0.016, straw);
          ear.castShadow = true;
        }
        limb(head, [-0.07, 0.15, 0.3], [0.07, 0.15, 0.3], 0.012, 0.012, straw);
      }
      if (pose === 'turned') head.rotation.y = (random() < 0.5 ? -1 : 1) * mix(0.6, 0.95, random());
      if (pose === 'howl') head.rotation.x = -0.75;
      if (pose === 'cub') head.rotation.x = 0.22;
      return { g, head };
    };

    // Plinth.
    let seat = 0;
    const inscribe = (w: number, h: number, at: V) => {
      const plate = document.createElement('canvas');
      plate.width = 128; plate.height = Math.round(128 * h / w);
      const p = plate.getContext('2d')!;
      p.fillStyle = '#8f8e86'; p.fillRect(0, 0, plate.width, plate.height);
      p.strokeStyle = '#3d3c38'; p.lineCap = 'round';
      const rows = Math.max(2, Math.floor(plate.height / 46));
      for (let r = 0; r < rows; r++) {
        const cx = 64, cy = 30 + r * (plate.height - 50) / Math.max(rows - 1, 1), size = 34;
        p.lineWidth = 4;
        for (let k = 0; k < 6; k++) {
          const u = cx + (random() - 0.5) * size, v = cy + (random() - 0.5) * size;
          p.beginPath();
          if (random() < 0.5) { p.moveTo(cx - size / 2, v); p.lineTo(cx + size / 2, v); } else { p.moveTo(u, cy - size / 2); p.lineTo(u, cy + size / 2); }
          p.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(plate);
      texture.colorSpace = THREE.SRGBColorSpace;
      add(s.root, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), at);
    };
    if (a.plinth === 'pedestal') {
      s.box([0.86, 0.14, 1.0], [0, 0.07, 0], block);
      s.box([0.62, 0.72, 0.78], [0, 0.5, 0], block);
      s.box([0.78, 0.1, 0.94], [0, 0.91, 0], block);
      inscribe(0.26, 0.6, [0, 0.5, 0.392]);
      seat = 0.96;
    } else if (a.plinth === 'stepped') {
      s.box([1.3, 0.2, 1.4], [0, 0.1, 0], block);
      s.box([0.9, 0.22, 1.0], [0, 0.31, 0], block);
      inscribe(0.5, 0.14, [0, 0.31, 0.502]);
      seat = 0.42;
    } else if (a.plinth === 'boulder') {
      const geometry = new THREE.SphereGeometry(1, 10, 8);
      const at = geometry.attributes.position, k = random() * 9;
      for (let i = 0; i < at.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(at, i);
        const bump = 1 + 0.14 * Math.sin(v.x * 3 + k) * Math.cos(v.z * 2.6 + k) + 0.08 * Math.sin(v.y * 5 + k);
        at.setXYZ(i, v.x * bump * 0.6, Math.min(v.y * bump, 0.72) * 0.42 + 0.26, v.z * bump * 0.66);
      }
      geometry.computeVertexNormals();
      add(s.root, geometry, block, [0, 0, 0]);
      seat = 0.56;
    } else {
      s.box([0.6, 0.06, 0.8], [0, 0.03, 0], block);
      seat = 0.06;
    }

    const main = fox(a.pose, a.holds, forgotten && random() < 0.85);
    main.g.position.y = seat;
    const big = a.plinth === 'slab' ? 1 : 1.22;
    main.g.scale.setScalar(big);
    main.g.position.z = 0.04;
    s.root.add(main.g);
    if (a.pose === 'cub') {
      const cub = fox('alert', 'nothing', false);
      cub.g.scale.setScalar(0.36);
      cub.g.position.set(0.02, seat, 0.33);
      cub.g.rotation.y = 0.5;
      cub.head.rotation.x = -0.5;
      s.root.add(cub.g);
    }

    // Bib: a curved apron over the chest and a tie round the neck.
    if (a.bib !== 'none') {
      const fade = a.bib === 'faded' ? 1 : mood.wear * 0.4;
      const cloth = (hex: string, r: number, drop: number) => {
        const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#e8c9c0'), fade * 0.75), roughness: 0.9, side: THREE.DoubleSide });
        if (a.bib === 'patterned') {
          const dots = document.createElement('canvas');
          dots.width = dots.height = 64;
          const d = dots.getContext('2d')!;
          d.fillStyle = '#c8261f'; d.fillRect(0, 0, 64, 64);
          d.fillStyle = '#ffffff';
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { d.beginPath(); d.arc(8 + i * 16 + (j % 2) * 8, 8 + j * 16, 3.2, 0, 7); d.fill(); }
          const texture = new THREE.CanvasTexture(dots);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(2, 2);
          material.map = texture; material.color.set('#ffffff');
        }
        const apron = add(main.g, new THREE.SphereGeometry(r, 16, 10, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.3, Math.PI * drop), material, [0, 0.52, 0.075], [0.95, 1.3, 0.98]);
        apron.rotation.x = -0.28;
        const tie = add(main.g, new THREE.TorusGeometry(0.098, 0.016, 6, 20), material, [0, 0.635, 0.105]);
        tie.rotation.x = Math.PI / 2 - 0.2;
        return apron;
      };
      if (a.bib === 'layered') { cloth('#f1ece2', 0.168, 0.5); cloth('#a81d1d', 0.174, 0.42); cloth('#d92b22', 0.18, 0.33); }
      else cloth(a.bib === 'faded' ? '#d98f86' : '#d12a20', 0.176, a.bib === 'faded' ? 0.36 : 0.42);
      if (a.bib === 'patterned') add(main.g, sphere, gold, [0, 0.4, 0.26], [0.025, 0.025, 0.025]);
    }

    if (a.story === 'snow') {
      add(main.head, sphere, snow, [0, 0.3, 0.03], [0.1, 0.05, 0.1]);
      add(main.g, sphere, snow, [0, 0.4, -0.12], [0.13, 0.05, 0.17]).rotation.x = 0.6;
      add(main.g, sphere, snow, [0, 1.0, -0.45], [0.06, 0.05, 0.06]);
      for (const [x, z, r] of [[-0.25, 0.3, 0.14], [0.26, -0.2, 0.16], [0.2, 0.35, 0.1], [-0.2, -0.3, 0.13]]) add(s.root, sphere, snow, [x, seat, z], [r, r * 0.35, r]);
    }
    if (a.story === 'cracked') {
      const rope = s.material('#b89a5a', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const wrap = add(main.g, new THREE.TorusGeometry(0.19 - i * 0.012, 0.012, 6, 22), rope, [0, 0.24 + i * 0.035, -0.04 + i * 0.012]);
        wrap.rotation.set(Math.PI / 2 - 0.42, 0, 0.1 * (i % 2 ? 1 : -1));
      }
      const dark = s.material('#1d1c1b', { roughness: 1 });
      const crack = [[0.1, 0.68, 0.19], [0.13, 0.55, 0.17], [0.09, 0.47, 0.18], [0.16, 0.36, 0.1], [0.12, 0.26, 0.12]] as V[];
      for (let i = 0; i < crack.length - 1; i++) limb(main.g, crack[i], crack[i + 1], 0.008, 0.008, dark).castShadow = false;
    }
    const flames: THREE.Mesh[] = [];
    if (a.story === 'foxfire') {
      const fire = new THREE.MeshStandardMaterial({ color: '#d6fff2', emissive: mood.warmth > 0.6 ? '#ffb347' : '#63f0d0', emissiveIntensity: 2.4, roughness: 0.6 });
      const n = 3 + Math.floor(random() * 3 + mood.density * 2);
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, r = 0.45 + random() * 0.3;
        const flame = add(s.root, new THREE.LatheGeometry([[0, -0.05], [0.04, -0.03], [0.05, 0.01], [0.02, 0.07], [0, 0.13]].map(([x, y]) => new THREE.Vector2(x, y)), 10), fire, [Math.sin(angle) * r, seat + 0.5 + random() * 0.7, Math.cos(angle) * r * 0.9]);
        flame.castShadow = false;
        flames.push(flame);
      }
    }

    // Offerings on the plinth edge or the ground in front.
    const shelf = a.plinth === 'stepped' ? 0.2 : 0, front = a.plinth === 'stepped' ? 0.6 : a.plinth === 'pedestal' ? 0.62 : a.plinth === 'boulder' ? 0.52 : 0.5;
    const white = s.material('#f3f1ea', { roughness: 0.3 });
    const candleFlames: THREE.Mesh[] = [];
    if (a.offerings === 'tofu') {
      s.cylinder(0.09, 0.06, 0.02, [-0.08, shelf + 0.01, front], white, 16);
      for (let i = 0; i < 3; i++) s.box([0.06, 0.02, 0.045], [-0.1 + i * 0.025, shelf + 0.03 + i * 0.012, front + (random() - 0.5) * 0.03], s.material('#cf9a45', { roughness: 0.8 })).rotation.y = random();
      s.cylinder(0.028, 0.02, 0.04, [0.1, shelf + 0.02, front + 0.02], white, 12);
    } else if (a.offerings === 'figurines') {
      const n = Math.round(mix(5, 16, mood.density));
      const tiny = new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.3 });
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * 0.7, z = front + (random() - 0.3) * 0.22, k = 0.6 + random() * 0.6;
        add(s.root, new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.032, 0.03], [0.02, 0.07], [0.022, 0.085], [0, 0.1]].map(([px, py]) => new THREE.Vector2(px * k, py * k)), 8), tiny, [x, shelf, z]);
        for (const side of [-1, 1]) add(s.root, new THREE.ConeGeometry(0.008 * k, 0.03 * k, 4), i % 3 ? tiny : red, [x + side * 0.012 * k, shelf + 0.108 * k, z]);
      }
    } else if (a.offerings === 'coins') {
      const n = Math.round(mix(5, 22, mood.density));
      for (let i = 0; i < n; i++) s.cylinder(0.013, 0.013, 0.003, [(random() - 0.5) * 0.5, shelf + 0.003 + i * 0.0004, front + (random() - 0.4) * 0.2], random() < 0.6 ? gold : s.material('#b9bcc0', { metalness: 0.8, roughness: 0.4 }), 10);
      for (let i = 0; i < 3; i++) s.box([0.09, 0.012, 0.02], [0.22 + i * 0.03, shelf + 0.01, front + i * 0.05], white).rotation.y = random() * 2;
    } else if (a.offerings === 'candles') {
      const n = 3 + Math.floor(random() * 4);
      const fire = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffae35', emissiveIntensity: 2.5 });
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.09, h = 0.05 + random() * 0.06;
        s.cylinder(0.014, 0.016, h, [x, shelf + h / 2, front], i % 2 ? white : red, 8);
        const flame = add(s.root, sphere, fire, [x, shelf + h + 0.02, front], [0.01, 0.02, 0.01]);
        flame.castShadow = false;
        candleFlames.push(flame);
      }
    }

    const speed = mix(0.5, 2.2, mood.energy);
    const phases = flames.map(() => random() * 6);
    const heights = flames.map((flame) => flame.position.y);
    const animated = flames.length + candleFlames.length > 0;
    return s.finish({
      update: animated ? (_dt, time) => {
        for (const [i, flame] of flames.entries()) {
          flame.position.y = heights[i] + Math.sin(time * speed + phases[i]) * 0.07;
          flame.rotation.z = Math.sin(time * speed * 1.7 + phases[i]) * 0.25;
        }
        for (const [i, flame] of candleFlames.entries()) flame.scale.y = 0.02 * (1 + 0.25 * Math.sin(time * 9 * speed + i * 2));
      } : undefined,
    });
  },
});

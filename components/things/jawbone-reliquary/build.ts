import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const LATIN = ['S. APOLLONIAE V.M.', 'EX OSSIBUS S. ANTONII', 'MANDIBVLA S. IOANNIS', 'S. BLASII EP. M.', 'DE MAXILLA S. LVCIAE'];
const GEMS = ['#b3202a', '#2450a8', '#1f7a4a', '#efe9dc', '#7a2f9a'];

export default defineThing({
  questions: {
    housing: choice('What kind of reliquary holds the jaw?', {
      cylinder: 'A crystal cylinder on a gilt chalice-like foot, capped with a dome and a cross: a little glazed tower.',
      bust: 'A silver bust of the lower face: collar and neck, the jaw under a crystal dome where the chin would be, a halo behind.',
      house: 'A gilt house-shaped shrine with a gabled roof, a crest and a glazed front.',
      box: 'A plain wooden box with a glass front, humble and parish-made.',
    }),
    bone: choice('How much of the jaw is there?', {
      complete: 'A complete lower jaw, both sides, a handful of teeth.',
      fragment: 'One broken half of the jaw with its hinge and two or three teeth.',
      teeth: 'Only teeth: a few loose molars laid on the cushion.',
    }),
    decoration: choice('How is it decorated?', {
      gems: 'Studded with cabochon gems: ruby, sapphire, emerald, pearl.',
      enamel: 'Bands and roundels of blue and green enamel.',
      bare: 'Bare metal or wood, no ornament.',
      label: 'A paper label in faded Latin naming the saint.',
    }),
    state: choice('What state is it in?', {
      polished: 'Polished for the feast day, gleaming.',
      dusty: 'Dusty and forgotten at the back of a sacristy cupboard, cobwebbed.',
      cracked: 'The glass is cracked across, the relic exposed to the air.',
    }),
    offerings: choice('What has been left at its foot?', {
      none: 'Nothing.',
      coins: 'A scatter of coins.',
      flowers: 'A small bunch of flowers laid down.',
      notes: 'Folded paper notes with petitions.',
      candles: 'Two small candles burning.',
    }),
    cushion: choice('What does the bone rest on?', {
      crimson: 'Crimson velvet.', gold: 'Cloth of gold.', white: 'White linen.', green: 'Faded green silk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusty = a.state === 'dusty';
    const shine = a.state === 'polished' ? 1 : dusty ? 0 : 0.5;
    const tone = (hex: string) => { const c = new THREE.Color(hex); if (dusty) c.lerp(new THREE.Color('#8c877c'), 0.5); return c.lerp(new THREE.Color('#6f6a60'), mood.wear * 0.25); };
    const metalOf = (hex: string) => new THREE.MeshStandardMaterial({ color: tone(hex), metalness: mix(0.15, 0.5, shine), roughness: mix(0.85, 0.24, shine), emissive: tone(hex), emissiveIntensity: mix(0.02, 0.2, shine), side: THREE.DoubleSide });
    const gilt = metalOf('#e0b03a'), silver = metalOf('#d8dcde');
    const wood = new THREE.MeshStandardMaterial({ color: tone('#5a3d28'), roughness: 0.85 });
    const glass = new THREE.MeshPhysicalMaterial({ color: dusty ? '#d8d2c0' : '#cfe6f2', transparent: true, opacity: dusty ? 0.36 : 0.22, roughness: dusty ? 0.6 : 0.03, depthWrite: false, side: THREE.DoubleSide });
    const glint = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5, transparent: true, opacity: 0.55, depthWrite: false });
    const bone = new THREE.MeshStandardMaterial({ color: tone('#c4a875').lerp(new THREE.Color('#7a5a34'), mood.wear * 0.35), roughness: 0.75 });
    const ivory = new THREE.MeshStandardMaterial({ color: tone('#fbf6e6'), roughness: 0.4, emissive: '#fbf6e6', emissiveIntensity: 0.12 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: tone({ crimson: '#8a1a28', gold: '#c99a33', white: '#eee8da', green: '#6f8a5c' }[a.cushion]), roughness: 0.95 });
    const enamelBlue = new THREE.MeshStandardMaterial({ color: tone('#1f4fb0'), roughness: 0.2, emissive: '#1f4fb0', emissiveIntensity: 0.15 });
    const enamelGreen = new THREE.MeshStandardMaterial({ color: tone('#1f8a5a'), roughness: 0.2, emissive: '#1f8a5a', emissiveIntensity: 0.15 });
    const trim = (m: THREE.Material) => (a.decoration === 'enamel' ? enamelBlue : m);

    /** The relic itself, sitting on y = 0 of its own group, chin toward +z. */
    const relic = new THREE.Group();
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, parent: THREE.Object3D = relic) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const tooth = (at: P3, molar: boolean, parent: THREE.Object3D) => {
      const crown = put(new THREE.CylinderGeometry(molar ? 0.0054 : 0.003, molar ? 0.0045 : 0.0034, 0.011, molar ? 5 : 6), ivory, at, parent);
      crown.rotation.y = random() * 3;
      return crown;
    };
    if (a.bone === 'teeth') {
      const count = 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const g = new THREE.Group();
        tooth([0, 0.006, 0], true, g).scale.setScalar(1.5);
        for (const side of [-1, 1]) {
          const root = put(new THREE.ConeGeometry(0.003, 0.014, 6), bone, [side * 0.003, -0.006, 0], g);
          root.rotation.z = Math.PI + side * 0.25;
        }
        g.position.set((i - (count - 1) / 2) * 0.03 + (random() - 0.5) * 0.006, 0.007, (random() - 0.5) * 0.02);
        g.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.4, random() * 6, 0);
        g.scale.setScalar(2);
        relic.add(g);
      }
    } else {
      const half = a.bone === 'fragment';
      const arch = (t: number): P3 => { // t -1..1 round the dental arch
        const k = Math.abs(t);
        return [Math.sign(t) * 0.046 * Math.sin(Math.min(k, 0.62) / 0.62 * Math.PI / 2) , 0, 0.03 - (k < 0.62 ? 0.034 * (1 - Math.cos(k / 0.62 * Math.PI / 2)) : 0.034 + (k - 0.62) / 0.38 * 0.062)];
      };
      const from = half ? 0.08 + random() * 0.2 : -1;
      const points: P3[] = [];
      for (let i = 0; i <= 28; i++) points.push(arch(mix(from, 1, i / 28)));
      const body = put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 56, 0.0075, 8, false), bone, [0, 0, 0]);
      body.scale.y = 1.9;
      body.position.y = 0.0145;
      if (!half) put(new THREE.SphereGeometry(0.011, 12, 8), bone, [0, 0.008, 0.031]).scale.set(1.3, 0.8, 0.7);
      else put(new THREE.ConeGeometry(0.008, 0.012, 5), bone, [points[0][0] - 0.004, 0.015, points[0][2] + 0.002]).rotation.z = 1.3;
      for (const side of half ? [1] : [-1, 1]) {
        const ramus = put(new THREE.BoxGeometry(0.007, 0.062, 0.03), bone, [side * 0.047, 0.04, -0.074]);
        ramus.rotation.x = -0.3;
        put(new THREE.SphereGeometry(0.0075, 10, 8), bone, [side * 0.047, 0.073, -0.094]).scale.set(1.5, 1, 1);
        put(new THREE.ConeGeometry(0.006, 0.022, 6), bone, [side * 0.047, 0.072, -0.066]).rotation.x = 0.2;
        put(new THREE.SphereGeometry(0.014, 10, 8), bone, [side * 0.047, 0.014, -0.066]).scale.set(0.3, 1, 1);
      }
      let kept = 0;
      for (let i = 0; i < 15; i++) {
        const t = mix(-0.84, 0.84, i / 14);
        if (t < from + 0.05) continue;
        const want = random() < 0.42 + (1 - mood.wear) * 0.2 || (kept < 2 && i > 9);
        const [x, , z] = arch(t);
        if (!want) { put(new THREE.CylinderGeometry(0.003, 0.003, 0.002, 6), new THREE.MeshStandardMaterial({ color: '#4a3a28', roughness: 1 }), [x, 0.029, z]); continue; }
        kept++;
        tooth([x, 0.032, z], Math.abs(t) > 0.42, relic);
      }
      relic.rotation.x = 0.5;
    }

    // Shared ornament hooks, filled in by each housing.
    const studs: P3[] = [];
    let labelAt: P3 = [0, 0.05, 0.1], labelW = 0.12;
    let front = 0.1, reachX = 0.1, top: P3 = [0, 0.4, 0];
    let pane: ((u: number, v: number) => P3) | null = null;
    const cushion = (at: P3, size: P3) => {
      const pad = s.ball(size, at, cushionMat, 20);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.ball([0.006, 0.006, 0.006], [at[0] + sx * size[0] * 0.78, at[1], at[2] + sz * size[2] * 0.78], gilt, 8);
      return pad;
    };

    if (a.housing === 'cylinder') {
      s.lathe([[0, 0], [0.092, 0], [0.096, 0.008], [0.07, 0.018], [0.03, 0.04], [0.017, 0.075], [0.036, 0.092], [0.017, 0.11], [0.02, 0.135], [0.06, 0.158], [0.078, 0.162], [0.078, 0.172], [0, 0.172]], gilt);
      s.cylinder(0.08, 0.08, 0.012, [0, 0.178, 0], trim(gilt), 32);
      s.cylinder(0.071, 0.071, 0.17, [0, 0.269, 0], glass, 32);
      for (const angle of [0.5, 2.3]) s.box([0.003, 0.15, 0.003], [Math.cos(angle) * 0.072, 0.269, Math.sin(angle) * 0.072], glint);
      for (let i = 0; i < 4; i++) s.rod([Math.cos(i * 1.571 + 0.785) * 0.075, 0.184, Math.sin(i * 1.571 + 0.785) * 0.075], [Math.cos(i * 1.571 + 0.785) * 0.075, 0.354, Math.sin(i * 1.571 + 0.785) * 0.075], 0.004, gilt);
      s.cylinder(0.08, 0.08, 0.012, [0, 0.36, 0], trim(gilt), 32);
      s.lathe([[0.078, 0.366], [0.07, 0.39], [0.045, 0.412], [0.014, 0.424], [0.014, 0.436], [0.022, 0.444], [0, 0.452]], gilt);
      s.box([0.008, 0.06, 0.008], [0, 0.48, 0], gilt);
      s.box([0.036, 0.008, 0.008], [0, 0.49, 0], gilt);
      cushion([0, 0.19, 0], [0.058, 0.01, 0.058]);
      relic.position.set(0, 0.198 + 0.013, a.bone === 'teeth' ? 0 : 0.036);
      relic.scale.setScalar(a.bone === 'teeth' ? 1.4 : 1.25);
      for (let i = 0; i < 10; i++) { studs.push([Math.cos(i * 0.628) * 0.081, 0.178, Math.sin(i * 0.628) * 0.081]); studs.push([Math.cos(i * 0.628 + 0.3) * 0.081, 0.36, Math.sin(i * 0.628 + 0.3) * 0.081]); }
      for (let i = 0; i < 6; i++) studs.push([Math.cos(i * 1.047) * 0.037, 0.092, Math.sin(i * 1.047) * 0.037]);
      labelAt = [0, 0.215, 0.074]; labelW = 0.1; front = 0.1; reachX = 0.1; top = [0, 0.51, 0];
      pane = (u, v) => { const angle = mix(-0.9, 0.9, u) + Math.PI / 2; return [Math.cos(angle) * 0.072, mix(0.19, 0.35, v), Math.sin(angle) * 0.072]; };
    } else if (a.housing === 'bust') {
      s.lathe([[0, 0], [0.11, 0], [0.115, 0.01], [0.105, 0.022], [0.108, 0.05], [0.085, 0.085], [0.06, 0.11], [0.056, 0.14], [0.07, 0.152], [0.07, 0.16], [0, 0.16]], silver).scale.z = 0.8;
      s.ring(0.108, 0.006, [0, 0.036, 0], trim(gilt)).rotation.x = Math.PI / 2;
      // lace-like collar points
      for (let i = 0; i < 12; i++) { const angle = i / 12 * 6.283; const p = s.mesh(new THREE.ConeGeometry(0.014, 0.03, 4), silver, [Math.cos(angle) * 0.075, 0.148, Math.sin(angle) * 0.06]); p.rotation.set(Math.sin(angle) * 1.2, 0, -Math.cos(angle) * 1.2); }
      cushion([0, 0.165, 0], [0.058, 0.008, 0.05]);
      relic.position.set(0, 0.172 + 0.011, a.bone === 'teeth' ? 0 : 0.034);
      relic.scale.setScalar(a.bone === 'teeth' ? 1.4 : 1.12);
      const dome = s.mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, 0.162, 0]);
      dome.scale.set(0.076, 0.125, 0.07);
      s.box([0.003, 0.09, 0.003], [0.045, 0.21, 0.052], glint).rotation.z = 0.2;
      s.box([0.002, 0.05, 0.002], [-0.05, 0.2, 0.045], glint).rotation.z = -0.25;
      // silver straps holding the crystal, and lips above the chin where the face would continue
      for (const turn of [0, Math.PI / 2]) { const strap = s.ring(1, 0.035, [0, 0.162, 0], silver, Math.PI); strap.scale.set(turn ? 0.07 : 0.076, 0.126, 0.07); strap.rotation.y = turn; }
      s.ball([0.016, 0.012, 0.016], [0, 0.292, 0], trim(gilt), 12);
      const halo = s.ring(0.085, 0.007, [0, 0.27, -0.05], gilt);
      for (let i = 0; i < 16; i++) { const angle = i / 16 * 6.283; s.rod([Math.cos(angle) * 0.085, 0.27 + Math.sin(angle) * 0.085, -0.05], [Math.cos(angle) * (i % 2 ? 0.125 : 0.108), 0.27 + Math.sin(angle) * (i % 2 ? 0.125 : 0.108), -0.05], 0.004, gilt, 0.001); }
      halo.castShadow = true;
      s.rod([0, 0.15, -0.058], [0, 0.2, -0.05], 0.005, gilt);
      for (let i = 0; i < 14; i++) studs.push([Math.cos(i / 14 * 6.283) * 0.109, 0.036, Math.sin(i / 14 * 6.283) * 0.088]);
      for (let i = 0; i < 8; i++) studs.push([Math.cos(i / 8 * 6.283) * 0.085, 0.27 + Math.sin(i / 8 * 6.283) * 0.085, -0.044]);
      labelAt = [0, 0.085, 0.073]; labelW = 0.11; front = 0.1; reachX = 0.12; top = [0, 0.4, -0.05];
      pane = (u, v) => { const angle = mix(-0.8, 0.8, u), lift = mix(0.15, 1.2, v); return [Math.sin(angle) * Math.cos(lift) * 0.077, 0.162 + Math.sin(lift) * 0.126, Math.cos(angle) * Math.cos(lift) * 0.071]; };
    } else if (a.housing === 'house') {
      const W = 0.32, D = 0.2, H = 0.2, y0 = 0.03;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.ball([0.016, 0.016, 0.016], [sx * (W / 2 - 0.02), 0.015, sz * (D / 2 - 0.02)], gilt, 12);
      s.box([W + 0.02, 0.012, D + 0.02], [0, y0 + 0.006, 0], trim(gilt));
      s.box([W, H, 0.008], [0, y0 + 0.012 + H / 2, -D / 2 + 0.004], gilt);
      for (const side of [-1, 1]) s.box([0.008, H, D], [side * (W / 2 - 0.004), y0 + 0.012 + H / 2, 0], gilt);
      for (const side of [-1, 1]) s.box([0.022, H, 0.012], [side * (W / 2 - 0.011), y0 + 0.012 + H / 2, D / 2 - 0.006], gilt);
      for (const y of [y0 + 0.022, y0 + H + 0.002]) s.box([W, 0.02, 0.012], [0, y, D / 2 - 0.006], trim(gilt));
      s.box([W - 0.04, H - 0.03, 0.002], [0, y0 + 0.012 + H / 2, D / 2 - 0.006], glass);
      s.box([0.003, H - 0.05, 0.002], [W * 0.3, y0 + 0.012 + H / 2, D / 2 - 0.004], glint).rotation.z = 0.25;
      const roof = new THREE.Shape();
      roof.moveTo(-D / 2 - 0.012, 0); roof.lineTo(D / 2 + 0.012, 0); roof.lineTo(0, 0.085); roof.closePath();
      const gable = s.mesh(new THREE.ExtrudeGeometry(roof, { depth: W + 0.024, bevelEnabled: false }), gilt, [-(W + 0.024) / 2, y0 + 0.012 + H, 0]);
      gable.rotation.y = Math.PI / 2;
      for (let i = 0; i < 9; i++) s.ball([0.008, 0.01, 0.008], [mix(-W / 2, W / 2, i / 8), y0 + H + 0.105, 0], i % 2 ? gilt : trim(gilt), 8);
      for (const side of [-1, 1]) { s.box([0.006, 0.05, 0.006], [side * W / 2, y0 + H + 0.125, 0], gilt); s.box([0.006, 0.006, 0.028], [side * W / 2, y0 + H + 0.134, 0], gilt); }
      // roof tiles as scored lines
      for (let i = 1; i < 4; i++) { const t = i / 4; s.box([W + 0.026, 0.003, 0.003], [0, y0 + 0.012 + H + 0.085 * t, (D / 2 + 0.012) * (1 - t) + 0.002], trim(gilt)); }
      cushion([0, y0 + 0.02, 0], [0.12, 0.012, 0.08]);
      relic.position.set(0, y0 + 0.03 + 0.02, a.bone === 'teeth' ? 0.02 : 0.055);
      relic.scale.setScalar(a.bone === 'teeth' ? 1.6 : 1.4);
      for (let i = 0; i < 9; i++) { studs.push([mix(-W / 2 + 0.015, W / 2 - 0.015, i / 8), y0 + 0.022, D / 2 + 0.001]); studs.push([mix(-W / 2 + 0.015, W / 2 - 0.015, i / 8), y0 + H + 0.002, D / 2 + 0.001]); }
      for (let i = 0; i < 5; i++) studs.push([mix(-W / 2 + 0.04, W / 2 - 0.04, i / 4), y0 + H + 0.012 + 0.04, (D / 2 + 0.012) * (1 - 0.04 / 0.085) + 0.003]);
      labelAt = [0.05, y0 + 0.05, D / 2 + 0.003]; labelW = 0.13; front = D / 2 + 0.02; reachX = W / 2; top = [W / 2, y0 + H + 0.15, 0];
      pane = (u, v) => [mix(-W / 2 + 0.03, W / 2 - 0.03, u), mix(y0 + 0.035, y0 + H - 0.01, v), D / 2 - 0.003];
    } else {
      const W = 0.28, D = 0.2, H = 0.2;
      s.box([W, 0.012, D], [0, 0.006, 0], wood);
      s.box([W, H, 0.01], [0, H / 2, -D / 2 + 0.005], wood);
      for (const side of [-1, 1]) s.box([0.01, H, D], [side * (W / 2 - 0.005), H / 2, 0], wood);
      s.box([W + 0.012, 0.01, D + 0.012], [0, H + 0.005, 0], wood);
      for (const side of [-1, 1]) s.box([0.012, H, 0.008], [side * (W / 2 - 0.006), H / 2, D / 2 - 0.004], wood);
      s.box([W, 0.014, 0.008], [0, 0.007, D / 2 - 0.004], wood);
      s.box([W - 0.02, H - 0.012, 0.002], [0, H / 2 + 0.006, D / 2 - 0.004], glass);
      s.box([0.003, H - 0.04, 0.002], [W * 0.28, H / 2, D / 2 - 0.002], glint).rotation.z = 0.25;
      s.box([W - 0.02, H - 0.012, 0.002], [0, H / 2 + 0.006, -D / 2 + 0.011], cushionMat);
      cushion([0, 0.018, 0], [0.11, 0.01, 0.08]);
      relic.position.set(0, 0.027 + 0.02, a.bone === 'teeth' ? 0.02 : 0.055);
      relic.scale.setScalar(a.bone === 'teeth' ? 1.6 : 1.4);
      const wax = s.cylinder(0.013, 0.015, 0.004, [W / 2 - 0.03, H + 0.012, 0.03], new THREE.MeshStandardMaterial({ color: tone('#a3202a'), roughness: 0.4 }), 12);
      wax.rotation.y = random();
      for (let i = 0; i < 6; i++) studs.push([mix(-W / 2 + 0.02, W / 2 - 0.02, i / 5), 0.007, D / 2 + 0.001]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) studs.push([sx * (W / 2 - 0.012), H + 0.011, sz * (D / 2 - 0.012)]);
      labelAt = [-0.03, 0.03, D / 2 + 0.002]; labelW = 0.12; front = D / 2 + 0.02; reachX = W / 2; top = [W / 2, H + 0.01, -D / 2];
      pane = (u, v) => [mix(-W / 2 + 0.015, W / 2 - 0.015, u), mix(0.016, H - 0.004, v), D / 2 - 0.002];
    }
    const K = a.housing === 'cylinder' || a.housing === 'bust' ? 1.4 : 1;
    if (K !== 1) {
      const shell = new THREE.Group();
      for (const child of [...s.root.children]) shell.add(child);
      shell.scale.setScalar(K);
      s.root.add(shell);
      for (const stud of studs) { stud[0] *= K; stud[1] *= K; stud[2] *= K; }
      labelAt = [labelAt[0] * K, labelAt[1] * K, labelAt[2] * K]; labelW *= K;
      top = [top[0] * K, top[1] * K, top[2] * K]; front *= K; reachX *= K;
      relic.position.multiplyScalar(K);
      const inner = pane!;
      pane = (u, v) => { const q = inner(u, v); return [q[0] * K, q[1] * K, q[2] * K]; };
    }
    s.root.add(relic);

    if (a.decoration === 'gems') studs.forEach((at, i) => { s.ball([0.008, 0.008, 0.008], at, new THREE.MeshStandardMaterial({ color: tone(GEMS[(i + Math.floor(random() * 2)) % GEMS.length]), roughness: 0.12, emissive: GEMS[i % GEMS.length], emissiveIntensity: 0.25 * shine + 0.05 }), 10); });
    else if (a.decoration === 'enamel') studs.forEach((at, i) => { if (i % 2 === 0) s.ball([0.0075, 0.0075, 0.004], at, i % 4 ? enamelGreen : gilt, 10); });
    else if (a.decoration === 'label') {
      const text = LATIN[Math.floor(random() * LATIN.length)];
      const label = s.label(text, labelW, labelW * 0.2, labelAt, '#4a3320', dusty ? '#cfc4a4' : '#e9dfc2');
      label.rotation.z = (random() - 0.5) * 0.16;
      if (a.housing === 'cylinder') label.position.z += 0.002;
    }

    if (a.state === 'cracked' && pane) {
      const line = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4 });
      const hub: [number, number] = [0.3 + random() * 0.4, 0.35 + random() * 0.4];
      for (let c = 0; c < 6; c++) {
        let [u, v] = hub;
        const angle = c / 6 * 6.283 + random() * 0.6;
        for (let k = 0; k < 4; k++) {
          const nu = Math.min(1, Math.max(0, u + Math.cos(angle + (random() - 0.5) * 0.7) * 0.16)), nv = Math.min(1, Math.max(0, v + Math.sin(angle + (random() - 0.5) * 0.7) * 0.2));
          const p = pane(u, v), q = pane(nu, nv);
          s.rod([p[0], p[1], p[2] + 0.0015], [q[0], q[1], q[2] + 0.0015], 0.0011, line).castShadow = false;
          u = nu; v = nv;
        }
      }
      const shard = s.mesh(new THREE.ConeGeometry(0.012, 0.03, 3), glass, [reachX * 0.5, 0.002, front + 0.03]);
      shard.rotation.set(Math.PI / 2, 0, random() * 3);
      shard.scale.z = 0.1;
    }
    if (dusty) {
      const web = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const angle = -0.6 + i * 0.3;
        s.rod(top, [top[0] + Math.cos(angle) * reachX * 1.05 * (top[0] > 0 ? -0.5 : 1), top[1] * (0.25 + random() * 0.3), top[2] + 0.02 + Math.sin(angle) * 0.04 + 0.03], 0.0007, web).castShadow = false;
      }
      const motes: { at: P3; size: number }[] = [];
      for (let i = 0; i < 18; i++) motes.push({ at: [(random() - 0.5) * reachX * 2.3, 0.001, (random() - 0.5) * front * 2.4], size: 0.003 + random() * 0.004 });
      const fluff = new THREE.SphereGeometry(1, 6, 4);
      fluff.scale(1, 0.3, 1);
      s.scatter(fluff, new THREE.MeshStandardMaterial({ color: '#a8a296', roughness: 1 }), motes);
    }

    const flames: THREE.Mesh[] = [];
    if (a.offerings === 'coins') {
      const count = 6 + Math.floor(mood.density * 12);
      for (let i = 0; i < count; i++) s.cylinder(0.009 + random() * 0.003, 0.011, 0.0018, [(random() - 0.5) * reachX * 2.2, 0.001 + (random() < 0.2 ? 0.002 : 0), front + 0.02 + random() * 0.07], random() < 0.6 ? metalOf('#c9983a') : metalOf('#c5c9cc'), 12);
    } else if (a.offerings === 'flowers') {
      const stemMat = s.material('#4d7a3a'), petal = mood.cheer > 0.5 ? ['#f2c84b', '#f6f1e4', '#e9869a'] : ['#f6f1e4', '#b3202a', '#7b4b8f'];
      const count = 5 + Math.floor(mood.density * 5);
      for (let i = 0; i < count; i++) {
        const spreadX = (i - (count - 1) / 2) * 0.014, hx = -0.02 + spreadX * 2.2 + (random() - 0.5) * 0.01, hz = front + 0.035 + random() * 0.03;
        s.rod([0.07 + spreadX * 0.3, 0.004, front + 0.085], [hx, 0.012, hz], 0.0018, stemMat);
        const colour = petal[Math.floor(random() * petal.length)];
        const head = s.material(colour, { roughness: 0.7 });
        for (let p = 0; p < 5; p++) s.ball([0.007, 0.004, 0.007], [hx + Math.cos(p * 1.257) * 0.008, 0.014, hz + Math.sin(p * 1.257) * 0.008], head, 8);
        s.ball([0.005, 0.005, 0.005], [hx, 0.017, hz], s.material('#e2a92f'), 8);
      }
      s.ring(0.007, 0.002, [0.068, 0.006, front + 0.08], s.material('#c0202c')).rotation.y = 0.8;
    } else if (a.offerings === 'notes') {
      const count = 4 + Math.floor(mood.density * 8);
      for (let i = 0; i < count; i++) {
        const paper = s.material(random() < 0.7 ? '#f1ecdc' : '#cfe0ee', { roughness: 0.9, side: THREE.DoubleSide });
        const x = (random() - 0.5) * reachX * 2, z = front + 0.02 + random() * 0.07, turn = random() * 3;
        const w = 0.03 + random() * 0.02;
        for (const side of [-1, 1]) {
          const leaf = s.box([w, 0.0008, 0.016], [x, 0.004 + side * 0.0, z], paper);
          leaf.rotation.set(side * 0.22, turn, 0);
          leaf.position.z += side * 0.0075 * Math.cos(turn);
          leaf.position.x += side * 0.0075 * Math.sin(turn);
        }
      }
    } else if (a.offerings === 'candles') {
      for (const side of [-1, 1]) {
        const h = 0.05 + random() * 0.05, x = side * (reachX + 0.035);
        s.cylinder(0.009, 0.01, h, [x, h / 2, front * 0.5], new THREE.MeshStandardMaterial({ color: '#f1e6c8', roughness: 0.45, emissive: '#e8b060', emissiveIntensity: 0.3 }), 10);
        s.cylinder(0.018, 0.02, 0.004, [x, 0.002, front * 0.5], gilt, 12);
        const flame = s.ball([0.005, 0.012, 0.005], [x, h + 0.013, front * 0.5], new THREE.MeshStandardMaterial({ color: '#ffe09a', emissive: '#ffae3a', emissiveIntensity: 2.4 }), 8);
        flame.castShadow = false;
        flames.push(flame);
      }
    }

    return s.finish({
      update: (_dt, time) => flames.forEach((flame, i) => { flame.scale.y = 0.012 * (1 + Math.sin(time * (7 + mood.energy * 12) + i * 2) * 0.18 * (0.4 + mood.energy)); }),
    });
  },
});

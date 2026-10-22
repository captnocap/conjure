import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is the bulb doing?', {
      on: 'Burning steadily, a hard bright point of light.',
      off: 'Off and cold, grey glass in the gloom.',
      flicker: 'Flickering on a bad connection, about to fail.',
      dying: 'Barely alive: a dull orange filament and no real light.',
      broken: 'Smashed: a jagged stump of glass in the socket and shards below.',
    }),
    bulb: choice('What kind of bulb is it?', {
      pear: 'An ordinary clear pear-shaped bulb.',
      frosted: 'A pearl-white frosted bulb, softer and more domestic.',
      edison: 'A long amber antique bulb with a looped cage filament.',
      globe: 'A fat round globe.',
      red: 'A red-dipped bulb, darkroom or warning light.',
    }),
    guard: choice('What is around the bulb?', {
      bare: 'Nothing: completely bare.',
      enamel: 'A green enamel cone shade, throwing the light straight down.',
      cage: 'A wire safety cage, workshop style.',
      paper: 'A scorched paper shade, improvised and crooked.',
    }),
    support: choice('What does it hang from?', {
      timber: 'A rough-sawn timber post and arm with a knee brace.',
      whitewashed: 'The same post and arm, whitewashed like a cellar.',
      rafters: 'A pair of rafters meeting at a ridge, the bulb hung from the collar tie.',
      pipe: 'A bent length of galvanised conduit on a floor flange.',
    }),
    pull: choice('What is on the end of the pull chain?', {
      bell: 'A small brass bell-shaped pull.',
      toggle: 'A wooden toggle worn smooth.',
      shoelace: 'A knotted shoelace tied on so a child could reach.',
      key: 'An old key, tied on for no reason anyone remembers.',
    }),
    cord: choice('What is the flex like?', {
      twisted: 'Brown twisted cloth flex.',
      gold: 'Braided gold silk flex, once smart.',
      black: 'Black rubber cable.',
      taped: 'Perished flex bound up with insulating tape.',
    }),
    drop: score('How low does it hang?', ['Snug under the beam', 'A short drop', 'Low enough to hit your head on']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.38;
    const lit = a.state === 'on' || a.state === 'flicker';
    const glowing = lit || a.state === 'dying';
    const broken = a.state === 'broken';
    const warm = new THREE.Color('#fff2d9').lerp(new THREE.Color('#ffb04a'), mood.warmth);
    if (a.bulb === 'red') warm.set('#ff2a1c'); else if (a.bulb === 'edison') warm.lerp(new THREE.Color('#ff9a2e'), 0.6);
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };

    // ---- the support
    const rust = new THREE.Color('#8f9698').lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.7);
    const steel = new THREE.MeshStandardMaterial({ color: rust, metalness: 0.6, roughness: mix(0.35, 0.8, mood.wear) });
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a046').lerp(new THREE.Color('#6b6a48'), mood.wear * 0.5), metalness: 0.8, roughness: 0.35 });
    const woodTexture = (() => {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 256; const ctx = canvas.getContext('2d')!;
      const white = a.support === 'whitewashed';
      ctx.fillStyle = white ? '#e6e2d6' : '#8a6238'; ctx.fillRect(0, 0, 64, 256);
      ctx.strokeStyle = white ? 'rgba(120,100,70,0.35)' : 'rgba(50,30,12,0.5)'; ctx.lineWidth = 1.5;
      for (let x = 3; x < 64; x += 5 + random() * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 6, 80, x - 6, 170, x + 2, 256); ctx.stroke(); }
      for (let i = 0; i < 3; i++) { ctx.fillStyle = white ? 'rgba(110,80,50,0.5)' : 'rgba(40,24,10,0.7)'; ctx.beginPath(); ctx.ellipse(random() * 64, random() * 256, 4, 7, 0, 0, 7); ctx.fill(); }
      if (white) for (let i = 0; i < mood.wear * 26; i++) { ctx.fillStyle = '#8a6238'; ctx.beginPath(); ctx.ellipse(random() * 64, random() * 256, 3 + random() * 7, 5 + random() * 16, 0, 0, 7); ctx.fill(); }
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.9 });
    const beam = (from: P3, to: P3, thick = 0.085) => {
      const av = new THREE.Vector3(...from), bv = new THREE.Vector3(...to), d = bv.clone().sub(av);
      const mesh = put(s.root, new THREE.BoxGeometry(thick, d.length(), thick), wood, av.clone().add(bv).multiplyScalar(0.5).toArray() as P3);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    let hookY = H - 0.09;
    const cableMaterial = s.material(a.cord === 'gold' ? '#b9923a' : a.cord === 'twisted' ? '#5a3d24' : '#1c1b1c', { roughness: 0.8 });
    if (a.support === 'timber' || a.support === 'whitewashed') {
      const px = -0.46;
      beam([px, 0, 0], [px, H, 0]);
      beam([px - 0.06, H - 0.045, 0], [0.2, H - 0.045, 0]);
      beam([px + 0.03, H - 0.42, 0], [-0.1, H - 0.07, 0], 0.07);
      beam([px - 0.26, 0.035, 0], [px + 0.3, 0.035, 0], 0.07);
      beam([px, 0.035, -0.28], [px, 0.035, 0.28], 0.07);
      beam([px + 0.24, 0.05, 0], [px + 0.03, 0.3, 0], 0.055);
      for (const [x, y] of [[px, H - 0.045], [-0.12, H - 0.06], [px + 0.04, H - 0.4]] as const) put(s.root, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), steel, [x, y, 0.046]).rotation.x = Math.PI / 2;
      // the supply stapled down the post
      s.tube([[0, H - 0.094, 0.02], [-0.2, H - 0.1, 0.045], [px + 0.05, H - 0.12, 0.047], [px + 0.046, H - 0.5, 0.047], [px + 0.047, 0.4, 0.046], [px + 0.05, 0.09, 0.05]], 0.007, cableMaterial);
      if (mood.wear > 0.4) {
        const web = new THREE.MeshStandardMaterial({ color: '#f1f1ec', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
        for (let i = 0; i < 6; i++) { const strand = s.rod([px + 0.045, H - 0.1 - i * 0.045, 0], [px + 0.06 + i * 0.05, H - 0.09, 0], 0.002, web); strand.castShadow = false; }
        for (let i = 1; i < 4; i++) { const strand = s.rod([px + 0.045, H - 0.09 - i * 0.07, 0], [px + 0.045 + i * 0.07, H - 0.09, 0], 0.002, web); strand.castShadow = false; }
      }
    } else if (a.support === 'rafters') {
      const foot = 0.56, apex = H + 0.12;
      beam([-foot, 0, 0], [0.02, apex, 0]); beam([foot, 0, 0], [-0.02, apex, 0]);
      const tieY = H - 0.22; hookY = tieY - 0.04;
      beam([-foot * (1 - tieY / apex) - 0.06, tieY, 0.05], [foot * (1 - tieY / apex) + 0.06, tieY, 0.05], 0.07);
      for (const x of [-foot, foot]) beam([x, 0.03, -0.26], [x, 0.03, 0.26], 0.06);
      beam([-foot - 0.04, 0.03, -0.2], [foot + 0.04, 0.03, -0.2], 0.05);
      put(s.root, new THREE.BoxGeometry(0.03, 0.16, 0.42), wood, [0, apex - 0.06, 0]);
      s.tube([[0, hookY, 0.05], [-0.12, tieY - 0.02, 0.09], [-0.3, tieY - 0.1, 0.05], [-0.42, 0.4, 0.05], [-0.52, 0.08, 0.05]], 0.007, cableMaterial);
    } else {
      s.cylinder(0.11, 0.11, 0.012, [-0.4, 0.006, 0], steel, 20);
      s.cylinder(0.035, 0.04, 0.05, [-0.4, 0.035, 0], steel, 12);
      s.tube([[-0.4, 0.04, 0], [-0.4, H - 0.22, 0], [-0.385, H - 0.1, 0], [-0.3, H - 0.03, 0], [-0.15, H - 0.02, 0], [0, H - 0.02, 0]], 0.018, steel);
      for (const y of [0.45, 0.95]) s.cylinder(0.024, 0.024, 0.04, [-0.4, y, 0], steel, 10);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.01, 0.01, 0.008, [-0.4 + x * 0.075, 0.014, z * 0.075], steel, 6);
      hookY = H - 0.04;
      s.cylinder(0.045, 0.045, 0.04, [0, H - 0.02, 0], steel, 14);
    }

    // ---- everything that swings
    const pend = new THREE.Group(); pend.position.set(0, hookY, 0); s.root.add(pend);
    const rose = s.material('#ece6d6', { roughness: 0.35 });
    if (a.support !== 'pipe') s.lathe([[0.0, 0], [0.05, 0], [0.055, -0.012], [0.035, -0.03], [0.014, -0.045]], rose, [0, hookY, 0]);
    const L = mix(0.1, 0.56, a.drop) + random() * 0.04;
    const cordPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; cordPoints.push(new THREE.Vector3(Math.sin(t * 9) * 0.004 * (a.cord === 'black' ? 0.3 : 1), -t * L, Math.cos(t * 7) * 0.004)); }
    put(pend, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints), 30, a.cord === 'black' ? 0.006 : 0.008, 6), cableMaterial);
    if (a.cord === 'twisted' || a.cord === 'gold') for (let i = 0; i < Math.round(L / 0.035); i++) { const ring = put(pend, new THREE.TorusGeometry(0.0085, 0.0025, 4, 8), s.material(a.cord === 'gold' ? '#8a6a22' : '#3a2616'), [0, -0.02 - i * 0.035, 0]); ring.rotation.x = Math.PI / 2 + 0.5; ring.castShadow = false; }
    if (a.cord === 'taped') for (let i = 0; i < 3; i++) put(pend, new THREE.CylinderGeometry(0.012, 0.012, 0.035 + random() * 0.03, 8), s.material(i % 2 ? '#1c1b1c' : '#b03a2e', { roughness: 0.5 }), [0, -L * (0.2 + i * 0.3), 0]);
    const socketTop = -L;
    put(pend, new THREE.CylinderGeometry(0.02, 0.03, 0.03, 16), s.material('#1e1c1c', { roughness: 0.4 }), [0, socketTop - 0.015, 0]);
    put(pend, new THREE.CylinderGeometry(0.031, 0.031, 0.05, 16), brass, [0, socketTop - 0.055, 0]);
    put(pend, new THREE.CylinderGeometry(0.034, 0.034, 0.012, 16), brass, [0, socketTop - 0.076, 0]);
    put(pend, new THREE.BoxGeometry(0.03, 0.016, 0.016), brass, [0.04, socketTop - 0.045, 0]);
    const neckY = socketTop - 0.082;

    // the bulb
    const k = 1.45;
    const profiles: Record<typeof a.bulb, [number, number][]> = {
      pear: [[0.019, 0], [0.02, -0.022], [0.027, -0.04], [0.036, -0.058], [0.04, -0.076], [0.036, -0.095], [0.024, -0.108], [0.0, -0.114]],
      frosted: [[0.019, 0], [0.02, -0.022], [0.027, -0.04], [0.036, -0.058], [0.04, -0.076], [0.036, -0.095], [0.024, -0.108], [0.0, -0.114]],
      edison: [[0.019, 0], [0.021, -0.03], [0.03, -0.07], [0.034, -0.11], [0.03, -0.14], [0.016, -0.158], [0.005, -0.166], [0.0, -0.174]],
      globe: [[0.019, 0], [0.021, -0.016], [0.04, -0.035], [0.052, -0.06], [0.055, -0.08], [0.05, -0.104], [0.034, -0.124], [0.0, -0.134]],
      red: [[0.019, 0], [0.02, -0.022], [0.027, -0.04], [0.036, -0.058], [0.04, -0.076], [0.036, -0.095], [0.024, -0.108], [0.0, -0.114]],
    };
    const profile = profiles[a.bulb].map(([r, y]) => [r * k, y * k] as [number, number]);
    const bulbLength = -profile[profile.length - 1][1], bulbRadius = Math.max(...profile.map(([r]) => r));
    const centreY = neckY - bulbLength * 0.62;
    const opaque = a.bulb === 'frosted' || a.bulb === 'red';
    const glassColour = a.bulb === 'red' ? '#b3160f' : a.bulb === 'frosted' ? '#f4f1e8' : a.bulb === 'edison' ? '#e9b86a' : '#eef4f2';
    const power = a.state === 'on' ? 1 : a.state === 'flicker' ? 1 : a.state === 'dying' ? 0.12 : 0;
    const glass = new THREE.MeshStandardMaterial({
      color: glassColour, roughness: opaque ? 0.5 : 0.05, side: THREE.DoubleSide,
      transparent: !opaque && !lit, opacity: opaque || lit ? 1 : mix(0.3, 0.55, mood.wear), depthWrite: opaque || lit,
      emissive: warm, emissiveIntensity: power * (opaque ? 1.6 : 2.2),
    });
    const shown = broken ? profile.slice(0, 4) : profile;
    const envelope = put(pend, new THREE.LatheGeometry(shown.map(([r, y]) => new THREE.Vector2(r, y)), 28), glass, [0, neckY, 0]);
    envelope.castShadow = opaque;
    const filamentMaterial = new THREE.MeshStandardMaterial({ color: '#3a3430', emissive: a.state === 'dying' ? '#ff5a10' : warm, emissiveIntensity: glowing ? (a.state === 'dying' ? 2.2 : 3) : 0, roughness: 0.4 });
    if (!opaque || broken) {
      put(pend, new THREE.CylinderGeometry(0.004 * k, 0.009 * k, bulbLength * 0.42, 8), new THREE.MeshStandardMaterial({ color: '#dfe8e6', transparent: true, opacity: 0.6, depthWrite: false }), [0, neckY - bulbLength * 0.21, 0]).castShadow = false;
      const fy = neckY - bulbLength * (a.bulb === 'edison' ? 0.5 : 0.58), span = bulbRadius * 0.5;
      const pts: THREE.Vector3[] = [];
      if (a.bulb === 'edison') for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(Math.cos(i * 1.05) * span * 0.75, fy + (i % 2 ? 0.045 : -0.05) * k * 0.9, Math.sin(i * 1.05) * span * 0.75));
      else for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(-span + i * span / 4 + (broken ? i * 0.002 : 0), fy + (i % 2 ? 0.006 : -0.006) - (broken ? i * i * 0.0012 : 0), 0));
      put(pend, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0028, 5), filamentMaterial).castShadow = false;
      for (const side of [-1, 1]) put(pend, new THREE.CylinderGeometry(0.0015, 0.0015, bulbLength * 0.32, 4), steel, [side * span * 0.8, neckY - bulbLength * 0.4, 0]).castShadow = false;
    }
    if (broken) {
      const shardMaterial = new THREE.MeshStandardMaterial({ color: glassColour, roughness: 0.1, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const angle = i / 9 * 6.283, r = profile[3][0]; const tooth = put(pend, new THREE.ConeGeometry(0.012, 0.02 + random() * 0.045, 3), shardMaterial, [Math.cos(angle) * r, neckY + profile[3][1] - 0.012, Math.sin(angle) * r]); tooth.rotation.x = Math.PI; }
      for (let i = 0; i < 12; i++) { const shard = put(s.root, new THREE.CircleGeometry(0.018 + random() * 0.03, 3), shardMaterial, [(random() - 0.5) * 0.4, 0.004 + i * 0.0006, (random() - 0.5) * 0.4]); shard.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.4, 0, random() * 6); shard.castShadow = false; }
    }
    if (mood.wear > 0.5 && !broken && !opaque) {
      // fly-specked and dusty on its upper shoulder
      const dust = put(pend, new THREE.LatheGeometry(profile.slice(0, 4).map(([r, y]) => new THREE.Vector2(r + 0.001, y)), 20), new THREE.MeshStandardMaterial({ color: '#8f8778', transparent: true, opacity: (mood.wear - 0.5) * 0.9, depthWrite: false }), [0, neckY, 0]); dust.castShadow = false;
    }
    const halos: { material: THREE.MeshBasicMaterial; base: number }[] = [];
    if (glowing) for (const [radius, opacity] of [[bulbRadius * 1.7, 0.5], [bulbRadius * 3.2, 0.22], [bulbRadius * 5.5, 0.09]] as const) {
      const material = new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: opacity * (a.state === 'dying' ? 0.35 : 1), depthWrite: false });
      const halo = put(pend, new THREE.SphereGeometry(radius, 20, 14), material, [0, centreY, 0]); halo.castShadow = halo.receiveShadow = false;
      halos.push({ material, base: material.opacity });
    }
    let lamp: THREE.PointLight | null = null;
    if (lit) { lamp = new THREE.PointLight(warm, 2.2, 6, 2); lamp.position.set(0, centreY, 0); pend.add(lamp); }

    // guard
    if (a.guard === 'enamel') {
      const outside = s.material('#1f5a44', { roughness: 0.3, side: THREE.DoubleSide });
      const shape = [[0.034, socketTop - 0.03], [0.05, socketTop - 0.06], [0.24, socketTop - 0.15], [0.25, socketTop - 0.165]].map(([r, y]) => new THREE.Vector2(r, y));
      put(pend, new THREE.LatheGeometry(shape, 32), outside);
      const inner = put(pend, new THREE.LatheGeometry(shape.map((v) => new THREE.Vector2(v.x - 0.004, v.y - 0.003)), 32), new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.4, side: THREE.BackSide, emissive: warm, emissiveIntensity: power * 0.7 })); inner.castShadow = false;
    } else if (a.guard === 'cage') {
      const top = neckY + 0.01, bottom = neckY - bulbLength - 0.035, r = bulbRadius + 0.03;
      for (let i = 0; i < 8; i++) { const angle = i / 8 * 6.283; const wire = put(pend, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.034, top], [r, top - 0.04], [r, bottom + 0.05], [r * 0.5, bottom + 0.005], [0, bottom]].map(([x, y]) => new THREE.Vector3(Math.cos(angle) * x, y, Math.sin(angle) * x))), 16, 0.0035, 5), steel); wire.castShadow = false; }
      for (const y of [top - 0.04, (top + bottom) / 2, bottom + 0.05]) { const hoop = put(pend, new THREE.TorusGeometry(r, 0.0035, 5, 28), steel, [0, y, 0]); hoop.rotation.x = Math.PI / 2; }
      put(pend, new THREE.CylinderGeometry(0.036, 0.036, 0.02, 14), steel, [0, top, 0]);
    } else if (a.guard === 'paper') {
      const shade = put(pend, new THREE.CylinderGeometry(0.06, 0.17, 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: new THREE.Color('#e6d7ae').lerp(new THREE.Color('#8a6a3a'), mood.wear * 0.5), roughness: 0.95, side: THREE.DoubleSide, emissive: warm, emissiveIntensity: power * 0.45 }), [0.01, socketTop - 0.13, 0]);
      shade.rotation.z = 0.14 + random() * 0.1;
      const scorch = put(pend, new THREE.CylinderGeometry(0.078, 0.12, 0.07, 20, 1, true, 0.4, 1.3), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1, side: THREE.DoubleSide }), [0.01, socketTop - 0.1, 0]); scorch.rotation.z = shade.rotation.z; scorch.castShadow = false;
    }

    // pull chain
    const chain = new THREE.Group(); chain.position.set(0.052, socketTop - 0.045, 0); pend.add(chain);
    const below = neckY - bulbLength - (0.07 + random() * 0.16) - (a.guard === 'cage' ? 0.03 : 0);
    const beadCount = Math.max(8, Math.round((chain.position.y - below) / 0.014));
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0062, 8, 6), brass, beadCount);
    const matrix = new THREE.Matrix4();
    const out = a.guard === 'enamel' ? 0.2 : a.guard === 'paper' ? 0.14 : a.guard === 'cage' ? bulbRadius + 0.0 : Math.max(0, bulbRadius - 0.035);
    let endX = 0, endY = 0;
    for (let i = 0; i < beadCount; i++) { endX = out * (1 - Math.exp(-i / 5)); endY = -i * 0.014; matrix.makeTranslation(endX, endY, 0); beads.setMatrixAt(i, matrix); }
    beads.castShadow = true; chain.add(beads);
    if (a.pull === 'bell') put(chain, new THREE.LatheGeometry([[0.003, 0], [0.006, -0.012], [0.013, -0.03], [0.015, -0.04], [0.0, -0.042]].map(([r, y]) => new THREE.Vector2(r, y)), 12), brass, [endX, endY, 0]);
    else if (a.pull === 'toggle') { const toggle = put(chain, new THREE.CapsuleGeometry(0.011, 0.045, 4, 10), s.material('#a8743c', { roughness: 0.5 }), [endX, endY - 0.018, 0]); toggle.rotation.z = Math.PI / 2 + 0.2; }
    else if (a.pull === 'shoelace') {
      const lace = s.material('#efe9da', { roughness: 0.9 }), extra = 0.22 + random() * 0.2;
      put(chain, new THREE.SphereGeometry(0.013, 8, 6), lace, [endX, endY - 0.008, 0]);
      put(chain, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[endX, endY - 0.01, 0], [endX + 0.012, endY - extra * 0.5, 0.004], [endX - 0.004, endY - extra, 0]].map((p) => new THREE.Vector3(...p))), 16, 0.0045, 5), lace);
      put(chain, new THREE.SphereGeometry(0.011, 8, 6), lace, [endX - 0.004, endY - extra, 0]);
      put(chain, new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), s.material('#2a2622'), [endX - 0.004, endY - extra - 0.022, 0]);
    } else {
      const key = new THREE.Group(); key.position.set(endX, endY - 0.012, 0); key.rotation.z = 0.15; chain.add(key);
      put(key, new THREE.TorusGeometry(0.014, 0.004, 5, 14), steel, [0, -0.012, 0]);
      put(key, new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 6), steel, [0, -0.056, 0]);
      put(key, new THREE.BoxGeometry(0.016, 0.014, 0.004), steel, [0.008, -0.078, 0]);
    }

    // moths come to a burning bulb
    const mothCount = lit ? Math.round(mood.density * 6) : 0;
    const moths = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.016), s.material('#c9c0a8', { roughness: 1 }), mothCount);
    const mothSeeds = Array.from({ length: mothCount }, () => [random() * 6.283, 0.09 + random() * 0.14, 0.6 + random() * 1.4, random() * 6.283]);
    const placeMoths = (time: number) => {
      const q = new THREE.Quaternion(), e = new THREE.Euler(), scale = new THREE.Vector3(1.6, 0.25, 0.9), at = new THREE.Vector3();
      mothSeeds.forEach(([phase, radius, speed, tiltPhase], index) => {
        const t = phase + time * speed * mix(0.6, 3, mood.energy);
        at.set(Math.cos(t) * radius, centreY + Math.sin(t * 1.7 + tiltPhase) * 0.07, Math.sin(t) * radius);
        e.set(Math.sin(t * 9) * 0.6, -t, 0.4); q.setFromEuler(e);
        matrix.compose(at, q, scale); moths.setMatrixAt(index, matrix);
      });
      moths.instanceMatrix.needsUpdate = true;
    };
    if (mothCount) { placeMoths(0); moths.castShadow = true; pend.add(moths); }

    // ---- motion
    const swing = mix(0.006, 0.11, mood.energy), phase = random() * 6.283, rate = Math.sqrt(9.8 / Math.max(L + 0.15, 0.2)) * 0.7;
    const pose = (time: number) => {
      const angle = swing * Math.sin(phase + time * rate);
      pend.rotation.z = angle; pend.rotation.x = swing * 0.4 * Math.sin(phase * 1.7 + time * rate * 0.93);
      chain.rotation.z = -angle * 1.6 + swing * 0.5 * Math.sin(phase + time * rate * 2.3);
    };
    pose(0);
    const flick = (time: number) => (Math.sin(time * 37.1) + Math.sin(time * 61.7 + 1.3) + Math.sin(time * 13.3 + phase) > 0.35 - mood.energy ? 1 : 0.12);
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        pose(time);
        if (mothCount) placeMoths(time);
        if (a.state === 'flicker' || a.state === 'dying') {
          const level = a.state === 'flicker' ? flick(time) : 0.75 + 0.25 * Math.sin(time * 5.3);
          glass.emissiveIntensity = power * (opaque ? 1.6 : 2.2) * level;
          filamentMaterial.emissiveIntensity = (a.state === 'dying' ? 2.2 : 3) * level;
          for (const halo of halos) halo.material.opacity = halo.base * level;
          if (lamp) lamp.intensity = 2.2 * level;
        }
      },
    });
  },
});

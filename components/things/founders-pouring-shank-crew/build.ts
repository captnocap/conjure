import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureHair, type FigureStyle, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const RAD = Math.PI / 180;

/** A soft canvas of rising wavy streaks for heat haze. */
function hazeTexture(random: () => number, colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 22; i++) {
    const x = random() * 128, w = 6 + random() * 16;
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, colour);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) c.lineTo(x + Math.sin(y / 23 + i) * 9, y);
    for (let y = 256; y >= 0; y -= 16) c.lineTo(x + w + Math.sin(y / 23 + i) * 9, y);
    c.closePath();
    c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    action: choice('What are the founders doing?', {
      carrying: 'Shuffling sideways across the floor with the crucible level between them, eyes on the mould ahead.',
      pouring: 'Stopped over the mould, the shank twisted so the crucible tips and a bright stream runs into the pour cup.',
      drained: 'The crucible tipped right over and nearly empty, the last trickle falling, the pour done.',
    }),
    fill: score('How full is the crucible?', ['A shallow puddle in the bottom', 'Half full', 'Brimming, the metal near the lip']),
    shields: choice('Where are their face shields?', {
      down: 'Both shields down over their faces, gold-tinted.',
      up: 'Both shields flipped up onto their foreheads.',
      mixed: 'The lead founder has his shield down, the other has his pushed up.',
    }),
    apron: choice('What are their aprons made of?', {
      tan: 'Natural tan split leather, scorched at the hem.',
      brown: 'Dark oiled brown leather.',
      green: 'Green flame-resistant cotton.',
      silver: 'Silver aluminised heat suits, shiny as foil.',
    }),
    gloves: choice('What gauntlets do they wear?', {
      yellow: 'Yellow kevlar gauntlets to the elbow.',
      grey: 'Grey leather gauntlets.',
      green: 'Green welders\' gauntlets.',
    }),
    target: choice('What stands on the floor in front of them?', {
      shell: 'A white ceramic-shell mould buried in a sand mound, its cup and vents sticking up.',
      flask: 'A steel sand flask weighted with a plate, a funnel cup set in its top.',
      ingots: 'A row of open iron ingot moulds on the floor for the leftover metal.',
      nothing: 'Nothing yet: bare scorched floor, the mould is further on.',
    }),
    style: choice('What kind of figures are they?', {
      person: 'Simplified clothed people with dot eyes.',
      mannequin: 'Jointed wooden artist mannequins.',
      silhouette: 'Dark cut-out silhouettes against the glow.',
      toy: 'Blocky toy figures with square limbs.',
    }),
    heads: choice('What is under the shield headbands?', {
      caps: 'Flat caps.',
      bare: 'Bare heads with short hair.',
      hoods: 'The hoods of their welding jackets, up.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pouring = a.action !== 'carrying';
    const drained = a.action === 'drained';
    const fill = drained ? 0.1 : mix(0.2, 0.95, a.fill);
    const style: FigureStyle = ({ person: 'doll', mannequin: 'mannequin', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const dark = style === 'silhouette';
    const hair: FigureHair = ({ caps: 'cap', bare: 'short', hoods: 'hood' } as const)[a.heads];
    const target = a.target === 'nothing' && pouring ? 'flask' : a.target;

    const apronHex = dark ? '#26282c' : { tan: '#b8865a', brown: '#5a3a24', green: '#4d6b3f', silver: '#cfd3d6' }[a.apron];
    const apron = s.material(apronHex, {
      roughness: a.apron === 'silver' ? 0.3 : 0.75, metalness: a.apron === 'silver' ? 0.6 : 0,
      emissive: '#ff6a10', emissiveIntensity: pouring && !dark ? 0.14 : 0,
    });
    const glove = s.material(dark ? '#1f2024' : { yellow: '#d9b23a', grey: '#7d7b76', green: '#4f7a4a' }[a.gloves], { roughness: 0.8 });
    const steel = s.material('#55585c', { metalness: 0.7, roughness: 0.5 });
    const black = s.material('#1c1b1e', { roughness: 0.85 });
    const glowTone = new THREE.Color().setHSL(mix(0.1, 0.05, mood.warmth), 1, 0.55);
    const melt = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: glowTone, emissiveIntensity: 1.7, roughness: 0.4 });
    const stream = new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: glowTone, emissiveIntensity: 2.4, roughness: 0.3 });
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: dark ? '#55524a' : '#e0b84a', transparent: true, opacity: dark ? 0.55 : 0.45, roughness: 0.12, metalness: 0.4, depthWrite: false, side: THREE.DoubleSide,
    });

    // ---- The two founders, facing each other across the shank, the mould toward +z between them.
    const heights = [1.74 + (random() - 0.5) * 0.1, 1.82 + (random() - 0.5) * 0.12];
    const skins = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'];
    const founders = [0, 1].map((i) => {
      const side = i === 0 ? -1 : 1;
      const H = heights[i];
      const build = i === 1 ? 'heavy' : 'average';
      const p = figure(s, {
        height: H, build, style, hair, skin: skins[Math.floor(random() * skins.length)], hairColor: ['#2a2320', '#5a3a22', '#8a8a86'][Math.floor(random() * 3)],
        top: dark ? undefined : hair === 'hood' ? '#4a4d55' : '#5f6b74', bottom: dark ? undefined : '#2f3338', shoes: '#1d1c1a', sleeves: 'long',
      });
      const { joints } = p;
      for (const sd of ['left', 'right'] as const) {
        // Arms nearly straight down and a little forward: the shank is heavy and held at the thighs.
        joints.shoulders[sd].rotation.x = -24 * RAD;
        joints.shoulders[sd].rotation.z = (sd === 'left' ? 1 : -1) * 5 * RAD;
        joints.elbows[sd].rotation.x = -12 * RAD;
        joints.elbows[sd].rotation.y = 0;
        joints.hips[sd].rotation.x = -6 * RAD;
        joints.knees[sd].rotation.x = 12 * RAD;
        joints.ankles[sd].rotation.x = -6 * RAD;
        // A sideways shuffle toward the mould when carrying: both legs swing the same way, one more than the other.
        if (!pouring) joints.hips[sd].rotation.z = side * (sd === 'left' ? 13 : 3) * RAD;
      }
      joints.spine.rotation.x = (pouring ? 10 : 6) * RAD;
      joints.body.rotation.x = 4 * RAD;
      // Both watch the mould, which lies to founder A's right and founder B's left.
      joints.neck.rotation.x = (pouring ? 28 : 12) * RAD;
      joints.neck.rotation.y = side * 42 * RAD;
      p.settle();
      p.root.position.x = side * (0.95 + 0.2 * H);
      p.root.rotation.y = -side * Math.PI / 2;
      s.root.add(p.root);

      const wide = build === 'heavy' ? 1.3 : 1;
      const limb = H * 0.036 * wide, headR = H * 0.064, torsoL = H * 0.28, pelvisL = H * 0.07, thighL = H * 0.24, foreL = H * 0.15, handL = H * 0.055;
      const shoulderW = H * 0.115 * wide, hipW = H * 0.075 * wide;
      const add = (parent: THREE.Object3D, mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };

      // Leather apron: a bib over the chest and a skirt from the hips to the knees.
      const bib = add(joints.spine, new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.55, limb * 1.55, torsoL * 0.92, 14, 1, true, -Math.PI * 0.55, Math.PI * 1.1), apron));
      bib.position.y = torsoL * 0.48;
      bib.scale.x = (shoulderW * 0.92) / (limb * 1.55);
      const skirtTop = pelvisL * 0.55, skirtBottom = -thighL * 0.95;
      const skirt = add(joints.pelvis, new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.5, limb * 1.62, skirtTop - skirtBottom, 14, 1, true, -Math.PI * 0.55, Math.PI * 1.1), apron));
      skirt.position.y = (skirtTop + skirtBottom) / 2;
      skirt.scale.x = (hipW * 1.4) / (limb * 1.5);
      // Neck straps.
      for (const sx of [-1, 1]) {
        const strap = add(joints.spine, new THREE.Mesh(new THREE.BoxGeometry(limb * 0.35, torsoL * 0.3, limb * 0.2), apron));
        strap.position.set(sx * shoulderW * 0.4, torsoL * 0.92, limb * 1.2);
        strap.rotation.x = 0.35;
      }
      // Gauntlets over the hands and lower forearms, with a flared cuff.
      for (const sd of ['left', 'right'] as const) {
        const length = handL + foreL * 0.5 + 0.01;
        const cuff = add(p.hands[sd], new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.5, limb * 1.05, length, 10), glove));
        cuff.position.y = length / 2 - 0.01;
      }
      // Face shield: a headband at the brow and a curved visor, down over the face or flipped up.
      const shield = new THREE.Group();
      shield.position.y = headR * 0.55;
      p.head.add(shield);
      const band = add(shield, new THREE.Mesh(new THREE.TorusGeometry(headR * 1.12, headR * 0.07, 6, 20), black));
      band.rotation.x = Math.PI / 2;
      const crown = add(shield, new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.1, headR * 1.3), black));
      crown.position.set(0, headR * 0.3, -headR * 0.45);
      crown.rotation.x = 0.5;
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.32, headR * 1.28, headR * 1.75, 18, 1, true, -Math.PI * 0.5, Math.PI), visorMat);
      visor.position.y = -headR * 0.5;
      visor.castShadow = visor.receiveShadow = false;
      shield.add(visor);
      const frame = add(shield, new THREE.Mesh(new THREE.TorusGeometry(headR * 1.3, headR * 0.05, 5, 18, Math.PI), black));
      frame.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
      frame.position.y = headR * 0.35;
      const up = a.shields === 'up' || (a.shields === 'mixed' && i === 1);
      if (up) shield.rotation.x = -1.25;
      return p;
    });

    // ---- The shank: a bar through the founders' hands, a T-handle at each end, a ring in the middle holding the crucible.
    s.root.updateMatrixWorld(true);
    const at = (object: THREE.Object3D) => object.getWorldPosition(new THREE.Vector3());
    const grips = founders.map((p) => ({ l: at(p.hands.left), r: at(p.hands.right) }));
    const mids = grips.map((g) => g.l.clone().add(g.r).multiplyScalar(0.5));
    const barY = (mids[0].y + mids[1].y) / 2;
    const v3 = (v: THREE.Vector3): P3 => [v.x, v.y, v.z];
    s.rod(v3(mids[0]), v3(mids[1]), 0.02, steel);
    for (const g of grips) {
      const dir = g.r.clone().sub(g.l).normalize().multiplyScalar(0.07);
      s.rod(v3(g.l.clone().sub(dir)), v3(g.r.clone().add(dir)), 0.016, steel);
      for (const end of [g.l.clone().sub(dir), g.r.clone().add(dir)]) s.ball([0.022, 0.022, 0.022], v3(end), black, 8);
    }
    const tip = new THREE.Group();
    tip.position.set(0, barY, 0);
    s.root.add(tip);
    const inTip = (mesh: THREE.Mesh) => { s.root.remove(mesh); mesh.position.y -= barY; tip.add(mesh); return mesh; };
    inTip(s.ring(0.235, 0.022, [0, barY - 0.02, 0], steel)).rotation.x = Math.PI / 2;
    for (const z of [-0.235, 0.235]) inTip(s.box([0.05, 0.06, 0.03], [0, barY - 0.01, z], steel));
    inTip(s.box([0.56, 0.04, 0.05], [0, barY, 0], steel));
    // The crucible: graphite, glowing dull red on the outside, bright inside.
    const crucibleMat = new THREE.MeshStandardMaterial({ color: '#2b2724', roughness: 0.85, emissive: glowTone, emissiveIntensity: mix(0.08, 0.45, fill) });
    const base = barY - 0.32;
    inTip(s.lathe([[0.1, 0], [0.16, 0.02], [0.2, 0.16], [0.215, 0.3], [0.2, 0.42], [0.18, 0.42], [0.19, 0.3], [0.17, 0.08], [0.08, 0.06]], crucibleMat, [0, base, 0]));
    const innerMat = new THREE.MeshStandardMaterial({ color: '#ff8a30', emissive: glowTone, emissiveIntensity: mix(0.9, 1.8, fill), roughness: 0.6, side: THREE.BackSide });
    inTip(s.mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.34, 20, 1, true), innerMat, [0, base + 0.24, 0]));
    const meltY = pouring ? base + 0.405 : base + 0.07 + fill * 0.33;
    inTip(s.cylinder(pouring ? 0.178 : 0.15 + fill * 0.03, 0.1, 0.012, [0, meltY, 0], melt, 20));
    tip.rotation.x = drained ? 95 * RAD : pouring ? 62 * RAD : 0;
    tip.updateMatrixWorld(true);

    // ---- What they are pouring into, under the lip, toward +z.
    let cupTop: P3 = [0, 0.36, 0.3];
    if (target === 'shell') {
      const sand = s.material(mood.warmth > 0.5 ? '#c7ad80' : '#b9ab8c', { roughness: 1 });
      s.lathe([[0.62, 0], [0.56, 0.04], [0.42, 0.14], [0.25, 0.2], [0, 0.22]], sand, [0, 0, 0.42]);
      const shell = s.material('#ebe6dc', { roughness: 0.95 });
      s.cylinder(0.07, 0.09, 0.16, [0, 0.28, 0.3], shell, 14);
      s.mesh(new THREE.CylinderGeometry(0.14, 0.07, 0.12, 16, 1, true), shell, [0, 0.4, 0.3]);
      s.cylinder(0.065, 0.065, 0.012, [0, pouring ? 0.44 : 0.36, 0.3], pouring ? melt : black, 14);
      for (const [dx, dz] of [[-0.2, 0.55], [0.22, 0.5]]) {
        s.rod([dx * 0.5, 0.18, dz - 0.1], [dx, 0.42, dz], 0.025, shell);
        s.cylinder(0.045, 0.028, 0.05, [dx, 0.44, dz], shell, 10);
      }
      cupTop = [0, 0.45, 0.3];
    } else if (target === 'flask') {
      const sand = s.material('#8f8577', { roughness: 1 });
      s.box([0.62, 0.3, 0.62], [0, 0.15, 0.4], steel);
      s.box([0.56, 0.02, 0.56], [0, 0.3, 0.4], sand);
      for (const [x, z] of [[0.31, 0.4], [-0.31, 0.4], [0, 0.71], [0, 0.09]]) s.box([x ? 0.03 : 0.66, 0.34, x ? 0.66 : 0.03], [x, 0.17, z], steel);
      s.box([0.5, 0.05, 0.3], [0.04, 0.335, 0.5], steel);
      s.mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.1, 14, 1, true), s.material('#3a3632', { roughness: 0.9 }), [0, 0.35, 0.28]);
      s.cylinder(0.045, 0.045, 0.012, [0, pouring ? 0.39 : 0.32, 0.28], pouring ? melt : black, 12);
      s.cylinder(0.02, 0.02, 0.14, [0.2, 0.37, 0.25], s.material('#3a3632', { roughness: 0.9 }), 8);
      cupTop = [0, 0.4, 0.28];
    } else if (target === 'ingots') {
      const iron = s.material('#3c3d40', { metalness: 0.6, roughness: 0.7 });
      for (let i = 0; i < 3; i++) {
        const z = 0.28 + i * 0.2;
        s.box([0.6, 0.1, 0.16], [0, 0.05, z], iron);
        s.box([0.5, 0.02, 0.1], [0, 0.095, z], i === 0 && pouring ? melt : i < 2 && drained ? s.material('#6a4a2a', { metalness: 0.7, emissive: '#5a1a00', emissiveIntensity: 0.4 }) : black);
      }
      cupTop = [0, 0.1, 0.28];
    } else {
      const scorch = s.mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshStandardMaterial({ color: '#2a2622', transparent: true, opacity: mix(0.1, 0.4, mood.wear), depthWrite: false, roughness: 1 }), [0, 0.004, 0.5]);
      scorch.rotation.x = -Math.PI / 2;
      scorch.receiveShadow = false;
    }

    // ---- The stream, its splash and the sparks.
    if (pouring) {
      const lip = tip.localToWorld(new THREE.Vector3(0, base + 0.42 - barY, 0.19));
      const radius = drained ? 0.008 : mix(0.012, 0.03, fill);
      const mid: P3 = [lip.x, mix(lip.y, cupTop[1], 0.5), mix(lip.z, cupTop[2], 0.55)];
      s.tube([[lip.x, lip.y + 0.02, lip.z - 0.02], [lip.x, lip.y, lip.z + 0.02], mid, [cupTop[0], cupTop[1] + 0.01, cupTop[2]]], radius, stream);
      s.ball([0.07 + radius, 0.02, 0.07 + radius], [cupTop[0], cupTop[1] + 0.012, cupTop[2]], stream, 10);
      const sparks: { at: P3; size: number }[] = [];
      for (let i = 0; i < (drained ? 6 : 16); i++) {
        const angle = random() * Math.PI * 2, r = 0.08 + random() * 0.3;
        sparks.push({ at: [cupTop[0] + Math.cos(angle) * r, cupTop[1] + random() * 0.25, cupTop[2] + Math.sin(angle) * r], size: 0.006 + random() * 0.01 });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), stream, sparks);
    }
    // Light thrown on the floor by the melt: a see-through warm disc under the crucible and the cup.
    const pool = new THREE.Mesh(new THREE.CircleGeometry(pouring ? 0.7 : 0.5, 28), new THREE.MeshBasicMaterial({ color: glowTone, transparent: true, opacity: mix(0.08, 0.2, fill) * (pouring ? 1.2 : 1), depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.006, pouring ? 0.25 : 0);
    pool.castShadow = pool.receiveShadow = false;
    s.root.add(pool);
    // Frozen spatter from this pour and older ones.
    const drips: { at: P3; size: number }[] = [];
    const dripCount = Math.round(mix(4, 20, mood.wear)) + (pouring ? 10 : 0);
    for (let i = 0; i < dripCount; i++) {
      const angle = random() * Math.PI * 2, r = 0.2 + random() * 0.9;
      drips.push({ at: [Math.cos(angle) * r, 0.005, 0.3 + Math.sin(angle) * r], size: 0.012 + random() * 0.03 });
    }
    s.scatter(new THREE.SphereGeometry(1, 7, 4), s.material('#4a3526', { metalness: 0.5, roughness: 0.6, emissive: '#7a2a00', emissiveIntensity: pouring ? 0.4 : 0 }), drips).scale.y = 0.25;

    // ---- Heat shimmer above the crucible.
    const risers: THREE.Mesh[] = [];
    const hazeMat = new THREE.MeshBasicMaterial({ map: hazeTexture(random, 'rgba(255,214,170,0.9)'), transparent: true, opacity: mix(0.15, 0.35, fill), depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const h = 0.8 + random() * 0.5;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.08 + random() * 0.1, h), hazeMat);
      plane.position.set((random() - 0.5) * 0.3, barY + 0.2 + h / 2, (random() - 0.5) * 0.3 + (pouring ? 0.15 : 0));
      plane.rotation.y = random() * Math.PI;
      plane.castShadow = plane.receiveShadow = false;
      s.root.add(plane);
      risers.push(plane);
    }

    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const p of founders) p.update(dt, time);
        hazeMat.map!.offset.y = -time * 0.3 * energy;
        risers.forEach((mesh, i) => { mesh.rotation.z = Math.sin(time * 1.3 * energy + i) * 0.08; });
        stream.emissiveIntensity = 2.4 + Math.sin(time * 14 * energy) * 0.4;
      },
    });
  },
});

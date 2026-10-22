import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';
import { crownGeometry, lump, paint, sweep } from './teeth';

const METALS = {
  gold: { color: '#e0ae2e', ink: '#6b4708', rough: 0.22 },
  silver: { color: '#d3d8dc', ink: '#4a5258', rough: 0.2 },
  steel: { color: '#8e979d', ink: '#30373c', rough: 0.42 },
  rose: { color: '#d98f6c', ink: '#6a2f1c', rough: 0.25 },
  grill: { color: '#f0c23a', ink: '#6b4708', rough: 0.15 },
} as const;

export default defineThing({
  questions: {
    metal: choice('What is the cap made of?', {
      gold: 'Rich yellow gold, the classic gold tooth.',
      silver: 'Bright white silver.',
      steel: 'Dull grey steel, a cheap institutional crown.',
      rose: 'Warm pinkish rose gold.',
      grill: 'Showy polished gold studded with tiny coloured gems, a grill.',
    }),
    tooth: choice('Which tooth is it?', {
      incisor: 'A flat front incisor, the one everybody sees.',
      canine: 'A pointed canine, a fang of gold.',
      molar: 'A broad back molar with a cusped top.',
    }),
    coverage: choice('How much of the tooth does the metal cover?', {
      full: 'The whole crown is metal, gum line to edge.',
      half: 'A cap over the biting half, enamel showing below.',
      tip: 'Just a tipped edge of metal on an otherwise natural tooth.',
    }),
    engraving: choice('What is engraved on the face of the cap?', {
      plain: 'Nothing: smooth polished metal.',
      star: 'A five-pointed star.',
      initial: 'A single ornate capital initial.',
      dollar: 'A dollar sign.',
      heart: 'A small heart.',
      gem: 'No engraving, but one cut diamond set in the middle.',
    }),
    setting: choice('How is it presented?', {
      loose: 'Loose, lying on its side with the root attached.',
      gum: 'Still in the mouth: a section of pink gum with three teeth, the middle one capped.',
      tag: 'Loose with a pawn-shop price tag tied round it.',
      box: 'Standing in a small open velvet ring box, a kept treasure.',
    }),
    owner: choice('Whose tooth was it?', {
      boxer: 'A boxer: a neighbour knocked out, blood about.',
      grandmother: 'A grandmother: neat, tea-stained, worn smooth, well looked after.',
      gangster: 'A gangster: immaculate, flashy, everything polished.',
      pirate: 'A pirate: blackened neighbours, rough hammered metal, a coin beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metal = METALS[a.metal];
    const dims = { incisor: [0.0086, 0.0108, 0.0068], canine: [0.0078, 0.0115, 0.008], molar: [0.0106, 0.0078, 0.01] }[a.tooth] as [number, number, number];
    const [W, H, D] = dims;
    const pirate = a.owner === 'pirate', boxer = a.owner === 'boxer', granny = a.owner === 'grandmother';
    const tarnish = clamp01(mood.wear * 0.7 + (pirate ? 0.3 : 0) - (a.owner === 'gangster' ? 0.3 : 0));
    const enamelBase = new THREE.Color(granny ? '#e2cf9c' : pirate ? '#a39680' : a.owner === 'gangster' ? '#f7f4ec' : '#efe8d6');
    const stain = new THREE.Color(pirate ? '#1d1712' : '#96702f');
    const shade = (amount: number) => (t: number) => enamelBase.clone().lerp(stain, clamp01(amount * (pirate ? 0.5 + random() * 0.5 : Math.pow(1 - t, 1.3)) + mood.wear * 0.25 * (1 - t)));
    const enamel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.22, 0.55, mood.wear) });
    const blood = new THREE.MeshStandardMaterial({ color: '#7d0a10', roughness: 0.12 });

    const initial = 'ABDEGHJKLMRSTVW'[Math.floor(random() * 15)];
    const face = paint(256, 256, (ctx, w, h) => {
      const base = new THREE.Color(metal.color).lerp(new THREE.Color('#4d4a36'), tarnish * 0.45);
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40 * tarnish + (pirate ? 26 : 0); i++) {
        ctx.fillStyle = `rgba(40,30,10,${0.08 + random() * 0.2})`;
        ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * 14, 0, 7); ctx.fill();
      }
      const cy = h * (a.coverage === 'full' ? 0.5 : a.coverage === 'half' ? 0.34 : 0.2), size = a.coverage === 'tip' ? 34 : 62;
      ctx.strokeStyle = ctx.fillStyle = metal.ink;
      ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.engraving === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? size * 0.42 : size, t = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(w / 2 + Math.cos(t) * r, cy + Math.sin(t) * r); }
        ctx.closePath(); ctx.stroke();
      } else if (a.engraving === 'initial' || a.engraving === 'dollar') {
        ctx.font = `bold ${size * 2.3}px Georgia, serif`;
        ctx.fillText(a.engraving === 'dollar' ? '$' : initial, w / 2, cy + size * 0.1);
      } else if (a.engraving === 'heart') {
        ctx.beginPath();
        ctx.moveTo(w / 2, cy + size * 0.85);
        ctx.bezierCurveTo(w / 2 - size * 1.6, cy - size * 0.2, w / 2 - size * 0.5, cy - size * 1.2, w / 2, cy - size * 0.35);
        ctx.bezierCurveTo(w / 2 + size * 0.5, cy - size * 1.2, w / 2 + size * 1.6, cy - size * 0.2, w / 2, cy + size * 0.85);
        ctx.fill();
      }
    });
    const capPaint = new THREE.MeshStandardMaterial({ map: face, metalness: 0.8, roughness: metal.rough + tarnish * 0.35, emissive: metal.color, emissiveIntensity: mix(0.14, 0.32, mood.cheer) * (1 - tarnish * 0.5) });
    const cut = { full: 0, half: 0.42, tip: 0.72 }[a.coverage];
    const glints: THREE.Object3D[] = [];

    /** One tooth with its neck at y = 0: crown up, root down. `capped` wraps it in metal. */
    const makeTooth = (kind: typeof a.tooth, size: [number, number, number], capped: boolean, staining: number, rootLength: number) => {
      const group = new THREE.Group();
      const [w, h, d] = size;
      const worn = granny ? 0.6 : 0;
      if (!capped || cut > 0) group.add(new THREE.Mesh(crownGeometry(kind, w, h, d, { detail: 8, worn, shade: shade(staining) }), enamel));
      if (capped) {
        const geometry = crownGeometry(kind, w * 1.07, h * 1.03, d * 1.09, { detail: 9, worn: pirate ? 0.5 : worn * 0.5, shade: () => '#ffffff' });
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < position.count; i++) {
          if (position.getY(i) < cut * h) position.setY(i, cut * h);
          if (pirate) position.setXYZ(i, position.getX(i) + (random() - 0.5) * w * 0.03, position.getY(i), position.getZ(i) + (random() - 0.5) * w * 0.03);
        }
        geometry.computeVertexNormals();
        const cap = new THREE.Mesh(geometry, capPaint);
        group.add(cap);
        const front = d * 1.09 * 0.5 * (kind === 'molar' ? 0.98 : mix(1, 0.5, (1 + cut) / 2));
        const cy = h * mix(cut, 1, kind === 'molar' ? 0.45 : 0.42);
        if (a.engraving === 'gem' || a.metal === 'grill') {
          const gemPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.02, metalness: 0.3, emissive: '#bfe9ff', emissiveIntensity: 0.6, flatShading: true });
          const gems = a.metal === 'grill' ? (a.coverage === 'tip' ? 3 : 7) : 0;
          const hues = ['#ff4b6e', '#52e0ff', '#7dff8a', '#ffffff', '#ffd94a', '#c98bff'];
          for (let i = 0; i < gems; i++) {
            const gx = (i % 4 - (i < 4 ? 1.5 : 1)) * w * 0.2, gy = cy + (i < 4 ? 0.14 : -0.12) * h * (1 - cut);
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(w * 0.055, 0), new THREE.MeshStandardMaterial({ color: hues[i % 6], roughness: 0.05, emissive: hues[i % 6], emissiveIntensity: 0.55, flatShading: true }));
            gem.position.set(gx, gy, front * (1 - Math.abs(gx / w) * 0.5));
            gem.scale.z = 0.5;
            group.add(gem);
          }
          if (a.engraving === 'gem') {
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(w * 0.16, 0), gemPaint);
            gem.position.set(0, cy, front * 0.97);
            gem.scale.z = 0.55;
            gem.rotation.z = Math.PI / 4;
            group.add(gem);
            const bezel = new THREE.Mesh(new THREE.TorusGeometry(w * 0.15, w * 0.03, 6, 20), capPaint);
            bezel.position.set(0, cy, front * 0.96);
            group.add(bezel);
          }
        }
        // The glint: a little four-point star of light at the shoulder of the cap.
        const star = new THREE.Group();
        const flare = new THREE.MeshBasicMaterial({ color: '#fffbe6', transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
        const ray = new THREE.Shape();
        const R = w * mix(0.5, 0.8, mood.cheer) * (1 - tarnish * 0.5), r = R * 0.1;
        for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2, q = i % 2 ? r : R; if (i) ray.lineTo(Math.cos(t) * q, Math.sin(t) * q); else ray.moveTo(q, 0); }
        for (const turn of [0, Math.PI / 2]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(ray), flare); m.rotation.y = turn; star.add(m); }
        const flat = new THREE.Mesh(new THREE.ShapeGeometry(ray), flare); flat.rotation.x = Math.PI / 2; star.add(flat);
        star.position.set(w * 0.3, h * 0.95, front * 0.6);
        group.add(star);
        glints.push(star);
      }
      if (rootLength > 0) {
        const rootBase = new THREE.Color(pirate ? '#5a4326' : granny ? '#d6bf86' : '#e4d2a2');
        const tint = (t: number) => { const c = rootBase.clone().lerp(new THREE.Color('#8a6a3c'), t * 0.5); if (boxer) c.lerp(new THREE.Color('#7d0a10'), clamp01(t * 1.5 - 0.2 + random() * 0.3)); return c; };
        const rootPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: boxer ? 0.3 : 0.75 });
        const roots = kind === 'molar' ? [-0.27, 0.27] : [0];
        for (const x of roots) {
          const bend = (random() - 0.5) * 0.25;
          const points = [new THREE.Vector3(x * w * 0.6, h * 0.12, 0), new THREE.Vector3(x * w, -rootLength * 0.3, 0), new THREE.Vector3(x * w * 1.3 + bend * rootLength * 0.3, -rootLength * 0.7, 0), new THREE.Vector3(x * w * 1.4 + bend * rootLength, -rootLength, 0)];
          const r0 = kind === 'molar' ? w * 0.22 : Math.min(w, d) * 0.4;
          group.add(new THREE.Mesh(sweep(points, (t) => [r0 * mix(1, 0.14, Math.pow(t, 1.3)) * (kind === 'molar' ? 1 : d / w), r0 * mix(1, 0.14, Math.pow(t, 1.3))], { radial: 12, steps: 24, normal: new THREE.Vector3(0, 0, 1), color: tint }), rootPaint));
        }
        if (kind === 'molar') group.add(new THREE.Mesh(sweep([new THREE.Vector3(0, h * 0.12, 0), new THREE.Vector3(0, -rootLength * 0.28, 0)], (t) => [d * mix(0.43, 0.32, t), w * mix(0.43, 0.36, t)], { normal: new THREE.Vector3(0, 0, 1), radial: 14, steps: 6, color: () => rootBase }), rootPaint));
      }
      return group;
    };

    const rootLength = (a.tooth === 'molar' ? 0.013 : a.tooth === 'canine' ? 0.017 : 0.0135) * (0.9 + random() * 0.2);
    const stand = new THREE.Group();
    s.root.add(stand);

    if (a.setting === 'gum') {
      const gumPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38 });
      const gumTint = new THREE.Color(pirate ? '#a8545a' : boxer ? '#c9505c' : '#dc7f88');
      const neighbour = { incisor: 'incisor', canine: 'premolar', molar: 'molar' }[a.tooth] as typeof a.tooth;
      const span = W * 3.7;
      stand.add(new THREE.Mesh(sweep([new THREE.Vector3(-span / 2, -H * 0.3, -D * 0.12), new THREE.Vector3(0, -H * 0.34, D * 0.08), new THREE.Vector3(span / 2, -H * 0.3, -D * 0.12)], (t) => [H * 0.46 * (1 - 0.3 * Math.pow(Math.abs(t - 0.5) * 2, 4)) * (1 + 0.07 * Math.cos(t * Math.PI * 6)), D * 0.66], { radial: 18, steps: 20, color: (t) => gumTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03 - Math.abs(t - 0.5) * 0.05) }), gumPaint));
      const lost = boxer ? (random() > 0.5 ? -1 : 1) : pirate ? -1 : 0;
      for (const side of [-1, 0, 1]) {
        if (side !== 0 && side === lost) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(W * 0.3, 14, 10), new THREE.MeshStandardMaterial({ color: boxer ? '#5a070c' : '#3a1418', roughness: boxer ? 0.15 : 0.8 }));
          socket.scale.set(1, 0.35, 0.8);
          socket.position.set(side * W * 1.08, H * 0.16, 0);
          stand.add(socket);
          continue;
        }
        const tooth = side === 0 ? makeTooth(a.tooth, dims, true, 0.4, 0) : makeTooth(neighbour, [W * 0.96, H * (0.9 + random() * 0.08), D * 0.95], false, pirate ? 1 : granny ? 0.75 : 0.25, 0);
        tooth.position.set(side * W * 1.08, 0, 0);
        tooth.rotation.set(0, (random() - 0.5) * 0.12, (random() - 0.5) * (pirate ? 0.2 : 0.05));
        stand.add(tooth);
      }
      stand.rotation.x = -0.12;
    } else if (a.setting === 'box') {
      const velvet = s.material(mood.warmth > 0.5 ? '#6e1425' : '#1c2a5c', { roughness: 0.95 });
      const shell = s.material(pirate ? '#3b2a1c' : '#20222b', { roughness: 0.55 });
      const B = Math.max(W, D) * 2.6, T = B * 0.42;
      s.box([B, T, B], [0, T / 2, 0], shell);
      s.box([B * 0.88, T * 0.2, B * 0.88], [0, T * 0.98, 0], velvet);
      for (const z of [-1, 1]) s.box([B * 0.8, T * 0.24, B * 0.3], [0, T * 1.08, z * B * 0.2], velvet);
      const lid = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(B, T * 0.75, B), shell);
      top.position.set(0, T * 0.375, B / 2);
      const lining = new THREE.Mesh(new THREE.BoxGeometry(B * 0.88, T * 0.1, B * 0.88), s.material('#efe6d2', { roughness: 0.9 }));
      lining.position.set(0, -T * 0.01, B / 2);
      lid.add(top, lining);
      lid.position.set(0, T, -B / 2);
      lid.rotation.x = -Math.PI * mix(0.52, 0.62, random());
      lid.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(lid);
      s.box([B * 0.2, T * 0.14, B * 0.03], [0, T * 0.8, B * 0.51], s.material('#b8923e', { metalness: 0.8, roughness: 0.3 }));
      const tooth = makeTooth(a.tooth, dims, true, granny ? 0.6 : 0.3, 0);
      tooth.position.y = T * 1.12;
      tooth.rotation.y = (random() - 0.5) * 0.4;
      stand.add(tooth);
    } else {
      const tooth = makeTooth(a.tooth, dims, true, pirate ? 0.9 : granny ? 0.6 : 0.3, rootLength);
      tooth.rotation.set(-Math.PI / 2 + 0.1, 0, -Math.PI / 2 + (random() - 0.5) * 0.3, 'YXZ');
      stand.add(tooth);
      stand.rotation.y = 0.35 + (random() - 0.5) * 0.4;
    }
    stand.traverse((node) => { if ((node as THREE.Mesh).isMesh && !((node as THREE.Mesh).material as THREE.Material).transparent) node.castShadow = node.receiveShadow = true; });
    stand.updateMatrixWorld(true);
    const box = new THREE.Box3();
    stand.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh && (mesh.material as THREE.Material).depthWrite) box.expandByObject(mesh); });
    const loose = a.setting === 'loose' || a.setting === 'tag';
    if (loose) stand.position.y = -box.min.y;
    const floor = 0, right = box.max.x, front = box.max.z;

    if (a.setting === 'tag') {
      const thread = s.material('#b9a06a', { roughness: 0.9 });
      const tagAt = new THREE.Vector3(right + W * 1.3, floor + 0.0009, front + W * 0.2);
      const neck = new THREE.Vector3((box.min.x + box.max.x) / 2, stand.position.y + (box.min.y + box.max.y) / 2 + D * 0.5, (box.min.z + box.max.z) / 2);
      s.mesh(sweep([neck, neck.clone().lerp(tagAt, 0.45).setY(floor + W * 0.12), tagAt.clone().add(new THREE.Vector3(-W * 0.95, 0.0004, 0))], () => W * 0.03, { radial: 6 }), thread);
      const price = pirate ? '8 REALES' : `$${[12, 25, 40, 65, 90, 150][Math.floor(random() * 6)]}`;
      const tag = s.label(price, W * 2.3, W * 1.15, [tagAt.x, tagAt.y, tagAt.z], '#7a1d14', mood.wear > 0.5 ? '#d8c9a0' : '#f1e7c6');
      tag.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.5);
      s.ring(W * 0.09, W * 0.035, [tagAt.x - W * 0.92, tagAt.y + 0.0003, tagAt.z], s.material('#b8923e', { metalness: 0.8 })).rotation.x = Math.PI / 2;
    }
    if (boxer) {
      const drops = 3 + Math.round(mix(1, 6, 1 - mood.cheer));
      for (let i = 0; i < drops; i++) {
        const r = W * mix(0.08, 0.3, random() * random());
        const drop = s.mesh(lump(r, random, 0.12, 1), blood, [mix(box.min.x, box.max.x, random()), floor + r * 0.1, front + (random() - 0.2) * W * 1.2]);
        drop.scale.y = 0.16;
      }
    }
    if (pirate) {
      const coin = s.cylinder(W * 0.75, W * 0.75, W * 0.1, [box.min.x - W * 0.6, floor + W * 0.05, front + W * 0.5], s.material('#c79a2c', { metalness: 0.8, roughness: 0.4 + tarnish * 0.3 }), 28);
      coin.rotation.y = random() * 3;
      s.ring(W * 0.5, W * 0.035, [coin.position.x, floor + W * 0.1, coin.position.z], s.material('#8a6a1c', { metalness: 0.7 })).rotation.x = Math.PI / 2;
    }
    if (granny && a.setting !== 'box') {
      const R = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.72;
      const doily = paint(256, 256, (ctx, w) => {
        ctx.clearRect(0, 0, w, w);
        ctx.fillStyle = '#f4efe2';
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) { const t = i / 96 * Math.PI * 2, r = w * 0.46 + Math.sin(t * 16) * w * 0.035; ctx.lineTo(w / 2 + Math.cos(t) * r, w / 2 + Math.sin(t) * r); }
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        for (const [ring, count, size] of [[0.37, 16, 0.03], [0.26, 12, 0.035], [0.14, 8, 0.03]] as const)
          for (let i = 0; i < count; i++) { const t = i / count * Math.PI * 2; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(t) * ring * w, w / 2 + Math.sin(t) * ring * w, size * w, 0, 7); ctx.fill(); }
      });
      const mat = s.mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ map: doily, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }), [(box.min.x + box.max.x) / 2, 0.00012, (box.min.z + box.max.z) / 2]);
      mat.rotation.x = -Math.PI / 2;
      mat.castShadow = false;
    }

    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_gold_4';
    outer.add(thing.object);
    outer.scale.setScalar(({ macro: 1, tabletop: 1.6, room: 14, street: 60 } as Record<string, number>)[context.scale] ?? 14);
    const speed = mix(0.4, 3.2, mood.energy);
    return {
      object: outer,
      update: (_dt, time) => { glints.forEach((glint, index) => { glint.scale.setScalar(0.72 + 0.28 * Math.sin(time * speed + index * 1.7)); glint.rotation.z = time * speed * 0.12; }); },
      dispose: thing.dispose,
    };
  },
});

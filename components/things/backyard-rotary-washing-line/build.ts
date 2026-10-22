import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Garment = 'sheet' | 'pillowcase' | 'towel' | 'tee' | 'shorts' | 'trousers' | 'dress' | 'sock' | 'shirt';

export default defineThing({
  questions: {
    load: choice('If it is open, what hangs on the line?', {
      whites: 'White sheets, pillowcases and towels, a full wash of bed linen.',
      'childs-outfit': 'One small outfit: a striped T-shirt, shorts, a pair of tiny socks.',
      'single-dress': 'A single summer dress, alone on the outer line.',
      'family-wash': 'A mixed family wash in every colour, crowded peg to peg.',
      'work-shirts': 'A row of identical blue work shirts.',
      nothing: 'Nothing; bare lines and a few pegs left clipped on.',
    }),
    state: choice('What state is the line in?', {
      drying: 'Open in the sun, turning lazily, washing stirring.',
      windy: 'A stiff breeze: washing streaming out sideways, the whole head spinning.',
      rained: 'Left out in the rain: washing hanging dark and heavy over a puddle.',
      folded: 'Folded shut like a closed umbrella, lines hanging in slack loops.',
    }),
    pegs: choice('Where are the pegs kept?', {
      bag: 'A flowered cloth peg bag on a little hanger, hooked to an arm.',
      basket: 'A washing basket left on the grass beneath.',
      scattered: 'Scattered in the grass where they were dropped.',
      none: 'Nowhere to be seen.',
    }),
    pegKind: choice('What are the pegs like?', {
      wooden: 'Plain wooden sprung pegs.',
      bright: 'Plastic pegs in red, blue, yellow and green.',
    }),
    post: choice('What is the frame made of?', {
      aluminium: 'Bright silver aluminium tube.',
      green: 'Dark green plastic-coated steel.',
      white: 'White enamelled steel with rust at the joints.',
    }),
    base: choice('What is around the foot of the pole?', {
      lawn: 'Just the pole going into the grass.',
      slab: 'A concrete paving slab with the socket through it.',
      worn: 'A bare ring of earth trodden by walking round and round.',
      daisies: 'A patch of long grass and daisies the mower cannot reach.',
    }),
    bent: noul('Is one arm bent so the whole head sits crooked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const rustTint = new THREE.Color('#7a4526');
    const frameColour = { aluminium: '#c9ced0', green: '#2f5a42', white: '#ecebe4' }[a.post];
    const frame = s.material(new THREE.Color(frameColour).lerp(rustTint, wear * (a.post === 'white' ? 0.5 : 0.25)), { metalness: a.post === 'aluminium' ? 0.75 : 0.15, roughness: mix(0.3, 0.8, wear) });
    const joint = s.material(a.post === 'white' ? new THREE.Color('#8a8f92').lerp(rustTint, mix(0.3, 0.9, wear)) : '#3a3d40', { roughness: 0.7 });
    const cord = s.material(a.post === 'green' ? '#e9e6da' : '#4f8f5a', { roughness: 0.9 });
    const folded = a.state === 'folded';
    const hubY = folded ? 1.05 : 1.5, reach = 1.22, rise = 0.34;
    const top = new THREE.Group();
    s.root.add(top);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };

    // Pole, ground socket, collars.
    s.cylinder(0.022, 0.024, 2.02, [0, 1.01, 0], frame, 12);
    s.cylinder(0.03, 0.03, 0.05, [0, 2.03, 0], joint, 10);
    s.cylinder(0.034, 0.034, 0.5, [0, 0.25, 0], frame, 12);
    into(top, s.cylinder(0.045, 0.045, 0.09, [0, hubY, 0], joint, 12));
    into(top, s.cylinder(0.04, 0.04, 0.07, [0, folded ? 0.62 : 1.02, 0], joint, 12));

    const arms: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + Math.PI / 4;
      const droop = a.bent && i === 1 ? 0.22 : 0;
      const tip = folded ? new THREE.Vector3(Math.cos(ang) * 0.17, hubY + 1.2, Math.sin(ang) * 0.17) : new THREE.Vector3(Math.cos(ang) * reach, hubY + rise - droop, Math.sin(ang) * reach);
      arms.push(tip);
      into(top, s.rod([Math.cos(ang) * 0.04, hubY, Math.sin(ang) * 0.04], tip.toArray() as [number, number, number], 0.014, frame));
      into(top, s.ball([0.02, 0.02, 0.02], tip.toArray() as [number, number, number], joint, 8));
      const mid = new THREE.Vector3(Math.cos(ang) * 0.04, hubY, Math.sin(ang) * 0.04).lerp(tip, 0.42);
      into(top, s.rod([Math.cos(ang) * 0.04, folded ? 0.62 : 1.02, Math.sin(ang) * 0.04], mid.toArray() as [number, number, number], 0.009, frame));
    }
    const armPoint = (i: number, t: number) => new THREE.Vector3(Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.04, hubY, Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.04).lerp(arms[i % 4], t);

    // Lines: concentric squares when open, slack loops when folded.
    const rings = [1, 0.82, 0.64, 0.46];
    if (folded) {
      for (let i = 0; i < 4; i++) for (const t of [0.95, 0.7, 0.45]) {
        const p = armPoint(i, t), q = armPoint(i + 1, t), sag = 0.25 + random() * 0.35;
        const mid = p.clone().lerp(q, 0.5); mid.y -= sag; mid.x *= 1.5; mid.z *= 1.5;
        into(top, s.tube([p.toArray() as [number, number, number], mid.toArray() as [number, number, number], q.toArray() as [number, number, number]], 0.005, cord));
      }
      into(top, s.ring(0.19, 0.012, [0, hubY + 0.75, 0], s.material('#b23a2e'))).rotation.x = Math.PI / 2;
    } else {
      for (let i = 0; i < 4; i++) for (const t of rings) {
        const p = armPoint(i, t), q = armPoint(i + 1, t);
        into(top, s.rod(p.toArray() as [number, number, number], q.toArray() as [number, number, number], 0.0045, cord));
      }
    }

    // Washing.
    const wet = a.state === 'rained';
    const cloth = (hex: string, map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(wet ? 0.72 : 1).lerp(new THREE.Color('#b9b3a4'), wear * 0.2), map: map ?? null, roughness: 1, side: THREE.DoubleSide });
    const stripes = (c1: string, c2: string) => {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 64; const g = canvas.getContext('2d')!;
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(0, i * 8, 8, 8); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapT = THREE.RepeatWrapping; return texture;
    };
    const flat = (points: [number, number][]) => { const shape = new THREE.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); return new THREE.ShapeGeometry(shape); };
    const garment = (kind: Garment, scale: number): { geo: THREE.BufferGeometry; width: number } => {
      const k = scale;
      if (kind === 'sheet' || kind === 'pillowcase' || kind === 'towel') {
        const [w, h] = kind === 'sheet' ? [1.05 + random() * 0.35, 0.95] : kind === 'towel' ? [0.5, 0.75] : [0.48, 0.36];
        const geo = new THREE.PlaneGeometry(w, h, 8, 5); geo.translate(0, -h / 2, 0);
        const pos = geo.attributes.position, phase = random() * 6;
        for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getX(v) * 7 + phase) * 0.035 * Math.min(1, -pos.getY(v) * 2.5));
        geo.computeVertexNormals();
        return { geo, width: w };
      }
      if (kind === 'tee' || kind === 'shirt') {
        if (kind === 'shirt') {
          const w = 0.2 * k, h = 0.7 * k;
          return { geo: flat([[-w * 0.4, 0], [-w * 0.15, -0.07 * k], [0, -0.02 * k], [w * 0.15, -0.07 * k], [w * 0.4, 0], [w, -0.04 * k], [w + 0.17 * k, -0.5 * k], [w + 0.06 * k, -0.54 * k], [w, -0.26 * k], [w * 0.95, -h], [-w * 0.95, -h], [-w, -0.26 * k], [-w - 0.06 * k, -0.54 * k], [-w - 0.17 * k, -0.5 * k], [-w, -0.04 * k]]), width: w * 2 };
        }
        const w = 0.24 * k, h = 0.56 * k, arm = 0.24;
        return { geo: flat([[-w * 0.35, 0], [0, -0.05 * k], [w * 0.35, 0], [w, -0.05 * k], [w + arm * k * 0.9, -arm * k * 0.75], [w + arm * k * 0.55, -arm * k * 1.05], [w, -0.3 * k], [w * 0.95, -h], [-w * 0.95, -h], [-w, -0.3 * k], [-w - arm * k * 0.55, -arm * k * 1.05], [-w - arm * k * 0.9, -arm * k * 0.75], [-w, -0.05 * k]]), width: (w + arm * k * 0.9) * 2 };
      }
      if (kind === 'shorts' || kind === 'trousers') {
        const w = 0.21 * k, h = (kind === 'shorts' ? 0.34 : 0.92) * k;
        return { geo: flat([[-w, 0], [w, 0], [w * 1.12, -h], [w * 0.15, -h], [0, -0.2 * k], [-w * 0.15, -h], [-w * 1.12, -h]]), width: w * 2.2 };
      }
      if (kind === 'dress') {
        const w = 0.17 * k, h = 0.98 * k;
        return { geo: flat([[-w, 0], [-w * 0.7, 0], [-w * 0.45, -0.13 * k], [w * 0.45, -0.13 * k], [w * 0.7, 0], [w, 0], [w * 1.1, -0.2 * k], [w * 0.85, -0.36 * k], [w * 2.3, -h], [-w * 2.3, -h], [-w * 0.85, -0.36 * k], [-w * 1.1, -0.2 * k]]), width: w * 3.6 };
      }
      const w = 0.045 * k;
      return { geo: flat([[-w, 0], [w, 0], [w, -0.17 * k], [w * 3.2, -0.2 * k], [w * 3.2, -0.27 * k], [-w, -0.27 * k]]), width: w * 3.4 };
    };

    const pegColours = a.pegKind === 'wooden' ? ['#d1b07a'] : ['#e2412f', '#2f86d6', '#f4c62c', '#3aa66a'];
    const pegGeo = new THREE.BoxGeometry(0.014, 0.075, 0.02);
    const peg = (group: THREE.Object3D, x: number, y = 0.01) => { const m = new THREE.Mesh(pegGeo, s.material(pegColours[Math.floor(random() * pegColours.length)], { roughness: 0.6 })); m.position.set(x, y, 0); m.rotation.z = (random() - 0.5) * 0.3; m.castShadow = true; group.add(m); };

    const hung: { swing: THREE.Group; phase: number; reach: number; facing: number }[] = [];
    const blow = a.state === 'windy' ? mix(0.5, 1.0, mood.energy) : 0;
    const hang = (seg: number, ring: number, along: number, kind: Garment, material: THREE.Material, scale = 1) => {
      const p = armPoint(seg, rings[ring]), q = armPoint(seg + 1, rings[ring]);
      const at = p.clone().lerp(q, along), dir = q.clone().sub(p);
      const holder = new THREE.Group();
      holder.position.copy(at); holder.rotation.y = -Math.atan2(dir.z, dir.x); holder.rotation.z = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
      top.add(holder);
      const swing = new THREE.Group(); holder.add(swing);
      const { geo, width } = garment(kind, scale);
      const mesh = new THREE.Mesh(geo, material); mesh.castShadow = mesh.receiveShadow = true; swing.add(mesh);
      const grip = Math.min(width * 0.4, kind === 'tee' || kind === 'shirt' ? 0.2 * scale : 10);
      if (kind === 'sock') peg(swing, 0); else { peg(swing, -grip); peg(swing, grip); if (kind === 'sheet') peg(swing, 0); }
      hung.push({ swing, phase: random() * 6, reach: (wet ? 0.25 : 1) * (kind === 'sheet' ? 0.6 : 1), facing: holder.rotation.y });
      return width;
    };

    if (!folded) {
      const whites = ['#fbfaf5', '#f3f1e8', '#eef2f4', '#f6efe2'];
      const brights = ['#e2412f', '#f4c62c', '#2f86d6', '#3aa66a', '#f08a2a', '#e56d9c', '#8f5fd0'];
      const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
      const full = Math.round(mix(1, 4, mood.density));
      if (a.load === 'whites') {
        for (let seg = 0; seg < Math.max(2, full); seg++) hang(seg, 0, 0.5, 'sheet', cloth(pick(whites)));
        for (let seg = 0; seg < 4; seg++) {
          if (random() < 0.3 + mood.density * 0.6) { hang(seg, 1, 0.3, 'pillowcase', cloth(pick(whites))); hang(seg, 1, 0.72, 'pillowcase', cloth(pick(whites))); }
          if (random() < mood.density) hang(seg, 2, 0.5, 'towel', cloth(pick(whites)));
        }
      } else if (a.load === 'childs-outfit') {
        const seg = Math.floor(random() * 4);
        hang(seg, 0, 0.28, 'tee', cloth('#ffffff', stripes(pick(brights), '#fbfaf5')), 1.15);
        hang(seg, 0, 0.6, 'shorts', cloth(pick(['#2f86d6', '#3aa66a', '#e2412f'])), 1.15);
        hang(seg, 0, 0.8, 'sock', cloth('#fbfaf5'), 1.2); hang(seg, 0, 0.9, 'sock', cloth('#fbfaf5'), 1.2);
        if (mood.density > 0.6) hang((seg + 1) % 4, 0, 0.5, 'dress', cloth(pick(brights)), 0.6);
      } else if (a.load === 'single-dress') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const g = canvas.getContext('2d')!;
        const base = mood.cheer > 0.5 ? pick(['#f4c62c', '#e2412f', '#58b4e6']) : pick(['#6f86a8', '#8a6f7f', '#e9e4d6']);
        g.fillStyle = base; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#fbfaf5' : '#f6d0d8'; g.beginPath(); g.arc(random() * 64, random() * 64, 3 + random() * 3, 0, Math.PI * 2); g.fill(); }
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(6, 6);
        hang(Math.floor(random() * 4), 0, 0.4 + random() * 0.2, 'dress', cloth('#ffffff', texture), 1.25);
      } else if (a.load === 'work-shirts') {
        for (let seg = 0; seg < Math.max(1, full - 1) + 1; seg++) for (const t of [0.28, 0.72]) hang(seg, 0, t, 'shirt', cloth(pick(['#3f6fb0', '#4a7bbd', '#3a639f'])), 1.1);
      } else if (a.load === 'family-wash') {
        const kinds: Garment[] = ['tee', 'trousers', 'towel', 'shirt', 'dress', 'shorts', 'tee', 'pillowcase'];
        for (let seg = 0; seg < 4; seg++) {
          for (const [ring, slots] of [[0, [0.22, 0.52, 0.8]], [2, [0.5]]] as const) for (const t of slots) {
            if (random() > 0.45 + mood.density * 0.55) continue;
            const kind = pick(kinds);
            hang(seg, ring, t, kind, kind === 'tee' && random() > 0.5 ? cloth('#ffffff', stripes(pick(brights), '#fbfaf5')) : cloth(random() > 0.3 ? pick(brights) : pick(whites)), kind === 'tee' || kind === 'dress' ? 0.7 + random() * 0.5 : 0.9);
          }
          for (let k = 0; k < 3; k++) if (random() < 0.5) hang(seg, 1, 0.2 + k * 0.28, 'sock', cloth(pick(brights)), 1.3);
        }
      } else {
        for (let i = 0; i < 3 + Math.round(random() * 5); i++) {
          const seg = Math.floor(random() * 4), ring = Math.floor(random() * 3);
          const p = armPoint(seg, rings[ring]).lerp(armPoint(seg + 1, rings[ring]), 0.1 + random() * 0.8);
          const holder = new THREE.Group(); holder.position.copy(p); holder.rotation.y = random() * 3; top.add(holder); peg(holder, 0, -0.02);
        }
      }
    }

    // Pegs and their keeping.
    if (a.pegs === 'bag') {
      const hook = armPoint(2, folded ? 0.5 : 0.72);
      const bag = new THREE.Group(); bag.position.copy(hook); top.add(bag);
      into(bag, s.ring(0.03, 0.005, [0, -0.03, 0], joint));
      into(bag, s.rod([-0.13, -0.07, 0], [0.13, -0.07, 0], 0.007, s.material('#c9a56a')));
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const g = canvas.getContext('2d')!;
      g.fillStyle = mood.cheer > 0.4 ? '#f1d7d0' : '#c9c6b6'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 14; i++) { g.fillStyle = ['#d8452f', '#3f8f6a', '#e9a12c', '#5a7fc0'][i % 4]; g.beginPath(); g.arc(random() * 64, random() * 64, 4 + random() * 3, 0, Math.PI * 2); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const pouch = into(bag, new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })));
      pouch.scale.set(1, 1.15, 0.5); pouch.position.y = -0.22; pouch.castShadow = true;
      const mouth = into(bag, new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), s.material('#3a2f2a')));
      mouth.scale.set(1.3, 0.7, 1); mouth.position.set(0, -0.15, 0.072);
      hung.push({ swing: bag, phase: 1, reach: 0.5, facing: 0 });
    } else if (a.pegs === 'basket') {
      const bx = 0.75 + random() * 0.2, bz = 0.55 + random() * 0.3;
      const basket = s.mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.26, 18, 1, true), new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#c79a55' : '#e9ecec', roughness: 0.8, side: THREE.DoubleSide }), [bx, 0.13, bz]);
      basket.scale.z = 0.72;
      s.cylinder(0.23, 0.23, 0.02, [bx, 0.012, bz], basket.material as THREE.Material, 18).scale.z = 0.72;
      s.ring(0.3, 0.014, [bx, 0.26, bz], basket.material as THREE.Material).rotation.x = Math.PI / 2;
      const heap = a.load === 'nothing' || folded ? 4 : 2;
      for (let i = 0; i < heap; i++) s.ball([0.13 + random() * 0.06, 0.08, 0.1], [bx + (random() - 0.5) * 0.22, 0.12 + i * 0.045, bz + (random() - 0.5) * 0.12], cloth(['#fbfaf5', '#e2412f', '#2f86d6', '#f4c62c'][i % 4]), 10);
    } else if (a.pegs === 'scattered') {
      for (let i = 0; i < 9; i++) { const m = s.mesh(pegGeo, s.material(pegColours[i % pegColours.length]), [(random() - 0.5) * 1.6, 0.01, (random() - 0.5) * 1.6]); m.rotation.set(Math.PI / 2, 0, random() * 3); }
    }

    // Foot of the pole.
    if (a.base === 'slab') s.box([0.6, 0.05, 0.6], [0, 0.02, 0], s.material('#b9b6aa', { roughness: 1 })).rotation.y = random() * 0.3;
    else if (a.base === 'worn') { const ring = s.mesh(new THREE.RingGeometry(0.55, 0.95, 40), s.material('#7d6040', { roughness: 1 }), [0, 0.004, 0]); ring.rotation.x = -Math.PI / 2; ring.castShadow = false; }
    else if (a.base === 'daisies') {
      const blades: { at: [number, number, number]; size: number; color: string }[] = [];
      const heads: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 70; i++) { const ang = random() * Math.PI * 2, rad = 0.04 + random() * random() * 0.5; blades.push({ at: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad], size: 0.6 + random() * 1.2, color: ['#6f9a3c', '#89ad45', '#5b8a3a'][i % 3] }); }
      for (let i = 0; i < 14; i++) { const ang = random() * Math.PI * 2, rad = 0.1 + random() * 0.45; heads.push({ at: [Math.cos(ang) * rad, 0.1 + random() * 0.12, Math.sin(ang) * rad], size: 0.022 + random() * 0.012, color: i % 4 ? '#fbfaf5' : '#f4c62c' }); }
      const blade = new THREE.ConeGeometry(0.014, 0.2, 4); blade.translate(0, 0.1, 0);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
      s.scatter(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ roughness: 0.8 }), heads);
    }
    if (wet) { const puddle = s.mesh(new THREE.CircleGeometry(1, 30), s.material('#6d8794', { roughness: 0.06, metalness: 0.3 }), [0.3, 0.006, 0.2]); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(0.7, 0.5, 1); puddle.castShadow = false; }

    if (a.bent || wear > 0.8) top.rotation.z = a.bent ? 0.05 : 0.02;
    const turn = folded ? 0 : { drying: 0.14, windy: 0.7, rained: 0.02, folded: 0 }[a.state] * mix(0.4, 1.6, mood.energy);
    const sway = mix(0.5, 1.5, mood.energy);
    const pose = (time: number) => {
      for (const h of hung) h.swing.rotation.x = (-blow * 0.9 * Math.sin(h.facing + top.rotation.y) + Math.sin(time * (1.4 + blow * 3) * sway + h.phase) * (0.09 + blow * 0.12) * sway) * h.reach;
    };
    top.rotation.y = random() * Math.PI / 2;
    pose(0);
    return s.finish({ footprint: 1.25, update: (dt, time) => { top.rotation.y += dt * turn; pose(time); } });
  },
});

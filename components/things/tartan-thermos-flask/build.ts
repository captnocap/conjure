import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Band = [at: number, width: number, colour: string];
const TARTANS: Record<string, { base: string; bands: Band[]; cup: string }> = {
  stewart: { base: '#b5202b', bands: [[0.12, 0.14, '#16314f'], [0.34, 0.03, '#f1c62b'], [0.5, 0.12, '#17472f'], [0.66, 0.03, '#f4efe2'], [0.86, 0.1, '#15151a']], cup: '#c22b2b' },
  blackwatch: { base: '#1f4a36', bands: [[0.1, 0.22, '#15234a'], [0.42, 0.05, '#0d0f12'], [0.6, 0.22, '#15234a'], [0.9, 0.05, '#0d0f12']], cup: '#22382c' },
  buttercup: { base: '#e6bf2a', bands: [[0.15, 0.2, '#191919'], [0.5, 0.04, '#c2272d'], [0.65, 0.2, '#191919'], [0.93, 0.03, '#f6f0df']], cup: '#191919' },
  dressblue: { base: '#2c4f95', bands: [[0.1, 0.16, '#f2efe6'], [0.34, 0.04, '#c2272d'], [0.52, 0.2, '#13254f'], [0.84, 0.04, '#f2efe6']], cup: '#f2efe6' },
  camel: { base: '#c9a36c', bands: [[0.14, 0.09, '#1c1917'], [0.3, 0.09, '#f3ecdb'], [0.47, 0.09, '#1c1917'], [0.72, 0.025, '#b3242b']], cup: '#7a4a2a' },
};

function tartanTexture(key: keyof typeof TARTANS, wear: number, random: () => number) {
  const tartan = TARTANS[key];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = tartan.base;
  ctx.fillRect(0, 0, 256, 256);
  for (const horizontal of [false, true])
    for (const [at, width, colour] of tartan.bands) {
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.58;
      if (horizontal) ctx.fillRect(0, at * 256, 256, width * 256);
      else ctx.fillRect(at * 256, 0, width * 256, 256);
    }
  // A faint diagonal twill so it reads as woven cloth printed on tin.
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#000';
  for (let i = -256; i < 256; i += 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < wear * 70; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(190,190,180,0.7)' : 'rgba(90,60,40,0.45)';
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 14, 1 + random() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    pattern: choice('What is printed on the flask?', {
      stewart: 'Red Royal Stewart tartan with green, navy and yellow lines: the classic picnic flask.',
      blackwatch: 'Dark green and navy Black Watch tartan, sober and military.',
      buttercup: 'Loud yellow and black tartan, cheerful and a bit seventies.',
      dressblue: 'Blue and white dress tartan, seaside and fresh.',
      camel: 'Camel check with black, white and a red line, a commuter\'s flask.',
      enamel: 'No tartan: plain hammered green enamel, a workman\'s flask.',
      steel: 'No tartan: bare brushed stainless steel, modern and efficient.',
    }),
    state: choice('Is it open?', {
      shut: 'Screwed tight with the cup on top, not yet needed.',
      poured: 'Open, the stopper out and the cup poured full beside it.',
      shared: 'Open with two cups poured, one for each of them.',
      toppled: 'Knocked over on its side with the stopper out, leaking what was left.',
    }),
    contents: choice('What is in the flask?', {
      tea: 'Milky tea.',
      coffee: 'Black coffee.',
      soup: 'Tomato soup, bright orange-red.',
      cocoa: 'Hot chocolate with marshmallows.',
      empty: 'Nothing left: it has gone cold and empty.',
    }),
    build: score('What shape is the flask?', ['Short and stout, a wide soup flask', 'Ordinary', 'Tall and slim']),
    carry: choice('How is it carried?', {
      bare: 'No handle: it rides in a bag.',
      handle: 'A folding plastic handle on the side.',
      strap: 'A leather shoulder strap buckled round it.',
    }),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      mittens: 'A pair of woollen mittens, taken off to pour.',
      tackle: 'A fishing float and a coil of line in an open tin.',
      biscuits: 'A short stack of biscuits on a square of paper.',
      mug: 'A chipped white enamel mug with a blue rim.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const R = mix(0.058, 0.042, a.build), B = mix(0.17, 0.27, a.build);
    const steel = s.material('#c5c9c8', { metalness: 0.85, roughness: 0.3 });
    const tartan = a.pattern in TARTANS ? TARTANS[a.pattern] : null;
    const cupColour = tartan ? tartan.cup : a.pattern === 'enamel' ? '#e9e2c8' : '#c5c9c8';
    const cupPaint = s.material(cupColour, a.pattern === 'steel' ? { metalness: 0.85, roughness: 0.3 } : { roughness: 0.45 });
    let wrap: THREE.Material;
    if (tartan) {
      const map = tartanTexture(a.pattern as keyof typeof TARTANS, mood.wear, random);
      map.repeat.set(Math.max(2, Math.round((R * 6.283) / 0.085)), Math.max(1, Math.round(B / 0.085)));
      wrap = new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.15 });
    } else wrap = a.pattern === 'enamel' ? s.material('#3f6b4c', { roughness: 0.35, metalness: 0.3 }) : s.material('#b9bfbf', { metalness: 0.9, roughness: 0.38 });
    const hot = a.contents !== 'empty';
    const drinkColour = { tea: '#b9793f', coffee: '#2c1a10', soup: '#d6492a', cocoa: '#6b3d24', empty: '#2c1a10' }[a.contents];
    const drink = new THREE.MeshStandardMaterial({ color: drinkColour, roughness: 0.12 });
    const open = a.state !== 'shut';

    const flask = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.002, R - 0.003, 0.022, 36), steel), flask).position.y = 0.011;
    add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, B - 0.022, 40), wrap), flask).position.y = 0.022 + (B - 0.022) / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.002, R + 0.002, 0.014, 36), steel), flask).position.y = B + 0.007;
    if (a.pattern === 'enamel') for (const y of [0.3, 0.72]) add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, 0.008, 36), s.material('#e9e2c8')), flask).position.y = B * y;
    if (a.pattern === 'steel') add(s.label('HOT', R * 1.1, R * 0.5, [0, B * 0.55, R + 0.0006], '#30363a', '#c9cdcc'), flask);
    const neckTop = B + 0.058;
    // Shoulder and threaded neck: hidden by the cup when shut.
    add(new THREE.Mesh(new THREE.LatheGeometry([[R, B + 0.014], [R * 0.92, B + 0.024], [R * 0.66, B + 0.036], [R * 0.6, B + 0.04], [R * 0.6, neckTop]].map(([x, y]) => new THREE.Vector2(x, y)), 32), cupPaint), flask);
    for (let i = 0; i < 3; i++) { const thread = add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.6, 0.0016, 5, 28), cupPaint), flask); thread.rotation.x = Math.PI / 2; thread.position.y = B + 0.044 + i * 0.005; }
    const stopper = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.52, R * 0.46, 0.03, 20), s.material(a.pattern === 'steel' ? '#2a2d30' : '#c9a777', { roughness: 0.8 })), stopper);
    add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.008, 20), s.material(a.pattern === 'steel' ? '#2a2d30' : '#8a5a34', { roughness: 0.7 })), stopper).position.y = 0.018;
    const cup = (filled: boolean) => {
      const g = new THREE.Group();
      const h = 0.066, r0 = R * 0.78, r1 = R + 0.004;
      add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0.004], [r0, 0.004], [r0, 0], [r1, h], [r1 - 0.004, h], [r0 - 0.003, 0.006], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y)), 32), cupPaint), g);
      const grip = add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 6, 16, Math.PI), cupPaint), g);
      grip.rotation.z = -Math.PI / 2; grip.position.set(mix(r0, r1, 0.55), h * 0.55, 0);
      if (filled) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(r1 - 0.007, r1 - 0.009, 0.004, 28), drink), g).position.y = h * 0.86;
        if (a.contents === 'cocoa') for (let i = 0; i < 5; i++) {
          const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.007, 10), new THREE.MeshStandardMaterial({ color: i % 2 ? '#fbf3ee' : '#f6c9d2', roughness: 0.8 })), g);
          m.position.set((random() - 0.5) * r0 * 1.1, h * 0.86 + 0.004, (random() - 0.5) * r0 * 1.1);
          m.rotation.set(random(), random(), random());
        }
      }
      return g;
    };

    const steamSources: THREE.Vector3[] = [];
    const lid = cup(false);
    if (!open) {
      // The cup turned over and screwed down over the neck.
      lid.rotation.x = Math.PI;
      lid.position.y = B + 0.014 + 0.066;
      lid.rotation.y = random() * 6;
      flask.add(lid);
    } else {
      add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.003, 20), new THREE.MeshStandardMaterial({ color: hot ? drinkColour : '#15110e', roughness: 0.3 })), flask).position.y = neckTop - 0.004;
      const lipRing = add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.6, 0.003, 6, 28), steel), flask);
      lipRing.rotation.x = Math.PI / 2; lipRing.position.y = neckTop;
    }

    if (a.carry === 'handle') {
      const plastic = s.material('#27292b', { roughness: 0.5 });
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-R, B * 0.82, 0], [-R - 0.04, B * 0.8, 0], [-R - 0.042, B * 0.4, 0], [-R, B * 0.36, 0]].map((p) => new THREE.Vector3(...p))), 20, 0.006, 8), plastic), flask);
      for (const y of [0.82, 0.36]) add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.012, 32), plastic), flask).position.y = B * y;
    } else if (a.carry === 'strap') {
      const leather = s.material('#6e4526', { roughness: 0.7 });
      for (const y of [0.22, 0.8]) add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.016, 32), leather), flask).position.y = B * y;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.016, B * 0.6, 0.004), leather), flask).position.set(0, B * 0.51, R + 0.003);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.005), steel), flask).position.set(0, B * 0.6, R + 0.006);
    }

    const side: THREE.Object3D[] = [];
    if (a.state === 'toppled') {
      flask.rotation.set(0, 0, -Math.PI / 2);
      flask.rotation.order = 'YZX';
      flask.rotation.y = 0.35 + random() * 0.4;
      flask.position.set(-B / 2, R + 0.002, 0);
      const mouth = new THREE.Vector3(neckTop, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), flask.rotation.y).add(new THREE.Vector3(-B / 2, 0, 0));
      if (hot) for (let i = 0; i < 6; i++) {
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.002, 20), drink);
        pool.scale.set(0.02 + random() * 0.035, 1, 0.018 + random() * 0.03);
        pool.position.set(mouth.x + 0.01 + i * 0.012 + random() * 0.01, 0.001 + i * 0.0002, mouth.z + (random() - 0.5) * 0.05);
        pool.receiveShadow = true;
        s.root.add(pool);
      }
      if (hot) steamSources.push(new THREE.Vector3(mouth.x + 0.04, 0.01, mouth.z));
      stopper.position.set(mouth.x + 0.06 + random() * 0.03, R * 0.5, mouth.z + 0.07);
      stopper.rotation.set(Math.PI / 2, 0, random() * 3);
      lid.position.set(mouth.x - 0.03, R + 0.006, mouth.z - 0.11 - random() * 0.02);
      lid.rotation.set(Math.PI / 2 + 0.1, 0, random() * 3);
      s.root.add(stopper, lid);
    } else if (open) {
      stopper.position.set(-R - 0.04, 0.015, 0.07 + random() * 0.02);
      stopper.rotation.set(Math.PI, random(), 0);
      s.root.add(stopper);
      const poured = cup(hot);
      poured.position.set(R + 0.07, 0, 0.06 + random() * 0.02);
      poured.rotation.y = -0.6 + random() * 0.5;
      s.root.add(poured);
      if (hot) steamSources.push(new THREE.Vector3(poured.position.x, 0.07, poured.position.z), new THREE.Vector3(0, neckTop, 0));
      if (a.state === 'shared') {
        const second = cup(hot);
        second.scale.setScalar(0.86);
        second.position.set(R + 0.03, 0, 0.16 + random() * 0.02);
        second.rotation.y = 2.4 + random() * 0.6;
        s.root.add(second);
        if (hot) steamSources.push(new THREE.Vector3(second.position.x, 0.06, second.position.z));
      }
    }
    s.root.add(flask);

    const at = new THREE.Vector3(-R - 0.1, 0, a.state === 'toppled' ? 0.16 : -0.02);
    if (a.state === 'toppled') at.x = -B / 2 - 0.02;
    if (a.beside === 'mittens') {
      const wool = s.material(tartan ? tartan.base : '#b5452b', { roughness: 0.95 });
      const cuff = s.material('#efe7d2', { roughness: 0.95 });
      for (let i = 0; i < 2; i++) {
        const mitt = new THREE.Group();
        const hand = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), wool), mitt); hand.scale.set(0.042, 0.016, 0.06);
        const thumb = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), wool), mitt); thumb.scale.set(0.014, 0.012, 0.028); thumb.position.set((i ? -1 : 1) * 0.042, 0, 0.01); thumb.rotation.y = (i ? -1 : 1) * 0.5;
        const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.036, 0.03, 14), cuff), mitt); band.rotation.x = Math.PI / 2; band.scale.y = 1; band.scale.z = 0.45; band.position.z = 0.062;
        mitt.position.set(at.x + i * 0.035, 0.016 + i * 0.016, at.z + 0.02 + i * 0.045);
        mitt.rotation.y = 0.5 + i * 0.9 + random() * 0.3;
        mitt.rotation.z = i * 0.2;
        side.push(mitt);
      }
    } else if (a.beside === 'tackle') {
      const tin = new THREE.Group();
      const tinPaint = s.material('#5f7f8a', { metalness: 0.6, roughness: 0.45 });
      add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.075), tinPaint), tin).position.y = 0.002;
      for (const [w, d, x, z] of [[0.11, 0.004, 0, 0.0375], [0.11, 0.004, 0, -0.0375], [0.004, 0.075, 0.055, 0], [0.004, 0.075, -0.055, 0]]) add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.022, d), tinPaint), tin).position.set(x, 0.011, z);
      const lidPanel = add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.004), tinPaint), tin); lidPanel.position.set(0, 0.052, -0.05); lidPanel.rotation.x = -0.35;
      const line = add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 5, 20), s.material('#e8e6d8')), tin); line.rotation.x = Math.PI / 2; line.position.set(-0.025, 0.008, 0);
      const float = new THREE.Group();
      add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, 6.3, 0, Math.PI / 2), s.material('#d8262c', { roughness: 0.3 })), float);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), s.material('#f4f0e6', { roughness: 0.3 })), float);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.07, 6), s.material('#e3a81f')), float);
      float.rotation.z = 1.2; float.position.set(0.025, 0.02, 0.005);
      tin.add(float);
      tin.position.set(at.x - 0.01, 0, at.z + 0.03);
      tin.rotation.y = 0.4 + random() * 0.4;
      side.push(tin);
    } else if (a.beside === 'biscuits') {
      const stack = new THREE.Group();
      add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.0015, 0.11), s.material('#efe9d6')), stack).rotation.y = 0.3;
      const count = 3 + Math.floor(mood.density * 5);
      for (let i = 0; i < count; i++) {
        const biscuit = add(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.007, 20), s.material(i === count - 1 && mood.cheer > 0.5 ? '#4a2a1a' : '#cf9a4f', { roughness: 0.9 })), stack);
        biscuit.position.set((random() - 0.5) * 0.008, 0.005 + i * 0.0075, (random() - 0.5) * 0.008);
      }
      const loose = add(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.007, 20, 1, false, 0, 4.3), s.material('#cf9a4f', { roughness: 0.9 })), stack);
      loose.position.set(0.02, 0.005, 0.05);
      stack.position.set(at.x, 0, at.z + 0.03);
      side.push(stack);
    } else if (a.beside === 'mug') {
      const mug = new THREE.Group();
      const enamel = s.material('#f1eee4', { roughness: 0.3 });
      add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0.003], [0.036, 0.003], [0.036, 0], [0.04, 0.075], [0.037, 0.075], [0.034, 0.006], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y)), 28), enamel), mug);
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0028, 6, 28), s.material('#25407c', { roughness: 0.3 })), mug); rim.rotation.x = Math.PI / 2; rim.position.y = 0.075;
      const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 16, Math.PI), enamel), mug); handle.rotation.z = -Math.PI / 2; handle.position.set(0.038, 0.04, 0);
      if (mood.wear > 0.3) add(new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), s.material('#1a1a1c')), mug).position.set(0.022, 0.07, 0.031);
      if (hot && open) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.003, 24), drink), mug).position.y = 0.06; steamSources.push(new THREE.Vector3(at.x, 0.075, at.z + 0.03)); }
      mug.position.set(at.x, 0, at.z + 0.03);
      mug.rotation.y = 2.2 + random();
      side.push(mug);
    }
    for (const item of side) s.root.add(item);

    // Steam: see-through, so it is not measured as part of the object.
    const puffs: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
    const steamPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.34, 0.14, mood.warmth), depthWrite: false, roughness: 1 });
    for (const base of steamSources) {
      const count = Math.round(mix(7, 3, mood.warmth));
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steamPaint);
        s.root.add(mesh);
        puffs.push({ mesh, base, phase: i / count + random() * 0.1 });
      }
    }
    const reach = mix(0.2, 0.1, mood.warmth);
    const waft = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * mix(0.08, 0.3, mood.energy)) % 1;
        puff.mesh.position.set(puff.base.x + Math.sin(t * 7 + puff.phase * 20) * 0.012 * (0.4 + t * 2), puff.base.y + t * reach, puff.base.z + Math.cos(t * 5 + puff.phase * 9) * 0.01 * (0.4 + t * 2));
        puff.mesh.scale.setScalar(0.008 + t * 0.022);
      }
    };
    waft(0);
    return s.finish({ update: (_dt, time) => waft(time) });
  },
});

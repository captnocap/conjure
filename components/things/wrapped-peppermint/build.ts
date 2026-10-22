import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FLAVOURS = {
  peppermint: 'Red and white, the classic starlight peppermint.',
  spearmint: 'Green and white spearmint.',
  wintergreen: 'Pink and white wintergreen.',
  butterscotch: 'A clear golden butterscotch disc with no stripes.',
  cinnamon: 'Solid hot red cinnamon with a thin white pinwheel.',
  humbug: 'Black and white striped humbug.',
} as const;
const STRIPES: Record<keyof typeof FLAVOURS, [string, string, number]> = {
  peppermint: ['#f6f1ea', '#d31f2e', 0.45], spearmint: ['#f4f3ea', '#2e9d58', 0.45], wintergreen: ['#fbf2f3', '#ee6f9c', 0.45],
  butterscotch: ['#e2a23a', '#d08d24', 0.2], cinnamon: ['#c81d28', '#f6e9e6', 0.16], humbug: ['#f0ece2', '#1d1b1c', 0.5],
};

export default defineThing({
  questions: {
    flavour: choice('What kind of mint is it?', FLAVOURS),
    state: choice('What state is the sweet in?', {
      whole: 'Whole and sealed, never opened.',
      cracked: 'Cracked into three or four pieces inside its wrapper.',
      unwrapped: 'Unwrapped and sitting on its flattened cellophane.',
      sucked: 'Half sucked to a thin glossy sliver and put back on its wrapper.',
      melted: 'Half melted, slumped into a sticky puddle and furred with pocket fluff.',
      empty: 'Gone: only the empty twisted wrapper is left.',
    }),
    wrapper: choice('What is the wrapper like?', {
      clear: 'Clear crackly cellophane.',
      frosted: 'Frosted white waxed paper.',
      striped: 'Clear cellophane with red printed bands on the twisted ends.',
      gold: 'Shiny gold foil ends, a posher mint.',
    }),
    ends: choice('How are the twisted ends?', {
      tight: 'Both ends twisted tight, factory neat.',
      one: 'One end has been untwisted: someone started to open it and stopped.',
      loose: 'Both ends have relaxed into wide crumpled fans.',
    }),
    company: choice('Is it alone?', {
      alone: 'A single sweet.',
      few: 'Two or three more mints lie around it.',
      wrappers: 'It is the last one: empty wrappers of the others lie around it.',
      crumbs: 'A scatter of sugary shards and dust around it.',
    }),
    size: score('How big is the sweet?', ['A small thin disc', 'An ordinary mint', 'A fat old-fashioned one']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const [baseHex, stripeHex, share] = STRIPES[a.flavour];
    const R = mix(8, 12.5, a.size), H = mix(5, 8.5, a.size);

    // The pinwheel is painted in (angle, profile) space, so slanted bands become a swirl.
    const candyPaint = (bleed: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = baseHex;
      g.fillRect(0, 0, 512, 256);
      const bands = a.flavour === 'butterscotch' ? 0 : 8;
      if (bleed > 0) { g.shadowColor = stripeHex; g.shadowBlur = 18 * bleed; }
      g.fillStyle = stripeHex;
      for (let i = -2; i < bands + 2; i++) {
        const x = (i / bands) * 512, w = (512 / bands) * share;
        g.beginPath();
        // v = 0 bottom centre, 0.5 the rim, 1 top centre: wedges are widest at the rim.
        g.moveTo(x + 70, 0);
        g.lineTo(x + w * 0.2 + 70, 0);
        g.lineTo(x + w, 128);
        g.lineTo(x + w * 0.2 + 70, 256);
        g.lineTo(x + 70, 256);
        g.lineTo(x, 128);
        g.closePath();
        g.fill();
      }
      g.shadowBlur = 0;
      g.fillStyle = `rgba(255,255,255,${0.12 + mood.wear * 0.25})`;
      for (let i = 0; i < 60 + mood.wear * 200; i++) g.fillRect(random() * 512, random() * 256, 1 + random() * 3, 1 + random() * 3);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      return texture;
    };
    const puckProfile = (r: number, h: number) => {
      const points: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
      for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + (i / 10) * Math.PI; points.push(new THREE.Vector2(r - h * 0.42 + Math.cos(t) * h * 0.42, h / 2 + Math.sin(t) * h / 2)); }
      points.push(new THREE.Vector2(0.001, h));
      return points;
    };
    const candy = (bleed = 0, gloss = 0.25) => new THREE.MeshPhysicalMaterial({
      map: candyPaint(bleed), roughness: mix(gloss, 0.6, mood.wear * 0.6), clearcoat: 0.5, side: THREE.DoubleSide,
      transparent: a.flavour === 'butterscotch', opacity: a.flavour === 'butterscotch' ? 0.9 : 1,
      emissive: a.flavour === 'butterscotch' ? '#b86a10' : '#000000', emissiveIntensity: a.flavour === 'butterscotch' ? 0.25 : 0,
    });

    // Cellophane: crease lines painted into the alpha so the film reads without hiding the sweet.
    const filmPaint = (opaque: number, tint: string, banded: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = tint;
      g.globalAlpha = opaque;
      g.fillRect(0, 0, 256, 256);
      g.globalAlpha = 1;
      if (banded) { g.fillStyle = 'rgba(205,35,45,0.85)'; for (const y of [150, 196]) g.fillRect(0, y, 256, 22); }
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = i % 3 ? 'rgba(255,255,255,0.85)' : 'rgba(120,130,140,0.45)';
        g.lineWidth = 1 + random() * 2.5;
        g.beginPath();
        const x = random() * 256;
        g.moveTo(x, 0);
        g.lineTo(x + (random() - 0.5) * 50, 256);
        g.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      return texture;
    };
    const frosted = a.wrapper === 'frosted', foil = a.wrapper === 'gold';
    const endFilm = new THREE.MeshStandardMaterial({
      map: filmPaint(foil ? 1 : frosted ? 0.92 : 0.38, foil ? '#e4b84a' : frosted ? '#f6f4ee' : '#eef6fb', a.wrapper === 'striped'),
      transparent: !foil, alphaTest: 0.2, side: THREE.DoubleSide, roughness: foil ? 0.3 : 0.2, metalness: foil ? 0.8 : 0.1,
      emissive: foil ? '#7a5a10' : '#ffffff', emissiveIntensity: foil ? 0.2 : 0.06,
    });
    const bodyFilm = new THREE.MeshStandardMaterial({ map: filmPaint(frosted ? 0.55 : 0.1, frosted ? '#f6f4ee' : '#f2f8fc', false), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.1, opacity: frosted ? 0.85 : 0.75 });

    // A twisted end: pinched at the sweet, flaring into a crumpled fan that rests on the ground.
    const twist = (parent: THREE.Object3D, sign: number, open: number, r: number, h: number) => {
      const reach = r * mix(1.05, 1.5, open), flare = r * mix(0.72, 1.05, open);
      const profile = [[h * 0.42, 0], [h * 0.2, r * 0.22], [h * mix(0.1, 0.3, open), r * 0.34], [flare * 0.45, r * 0.62], [flare * 0.8, reach * 0.8], [flare, reach]].map(([x, y]) => new THREE.Vector2(x, y));
      const geometry = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(14), 28);
      const position = geometry.getAttribute('position');
      const spin = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const angle = Math.atan2(z, x), out = y / reach;
        const crinkle = 1 + Math.sin(angle * 7 + spin + out * mix(6, 1.5, open)) * 0.22 * out + Math.sin(angle * 13 + spin * 2) * 0.1 * out;
        position.setXYZ(i, x * crinkle, y, z * crinkle * 0.62);
      }
      geometry.rotateZ(-sign * Math.PI / 2);
      geometry.translate(sign * r * 0.9, h / 2, 0);
      const moved = geometry.getAttribute('position');
      for (let i = 0; i < moved.count; i++) if (moved.getY(i) < 0.12) moved.setY(i, 0.12 + random() * 0.1);
      geometry.computeVertexNormals();
      add(parent, geometry, endFilm);
    };

    const sweet = (state: typeof a.state, r: number, h: number, ends: typeof a.ends) => {
      const group = new THREE.Group();
      const wrapped = state === 'whole' || state === 'cracked' || state === 'empty';
      if (state === 'whole' || state === 'unwrapped') add(group, new THREE.LatheGeometry(puckProfile(r, h), 40), candy());
      if (state === 'cracked') {
        const pieces = 3 + Math.floor(random() * 2);
        let from = random() * 6;
        for (let i = 0; i < pieces; i++) {
          const arc = (Math.PI * 2) / pieces * (0.75 + random() * 0.4);
          const shard = add(group, new THREE.LatheGeometry(puckProfile(r, h), 14, from, arc * 0.93), candy());
          const mid = from + arc / 2;
          shard.position.set(Math.sin(mid) * r * 0.13, 0, Math.cos(mid) * r * 0.13);
          shard.rotation.set((random() - 0.5) * 0.25, (random() - 0.5) * 0.3, (random() - 0.5) * 0.25);
          shard.position.y = 0.4;
          // The broken faces are chalk white.
          for (const edge of [from, from + arc * 0.93]) {
            const wall = add(group, new THREE.PlaneGeometry(r * 0.96, h * 0.92), new THREE.MeshStandardMaterial({ color: baseHex, roughness: 0.9, side: THREE.DoubleSide }));
            wall.position.set(shard.position.x + Math.sin(edge) * r * 0.48, h / 2 + 0.4, shard.position.z + Math.cos(edge) * r * 0.48);
            wall.rotation.y = edge - Math.PI / 2;
          }
          from += arc;
        }
      }
      if (state === 'sucked') {
        const sliver = add(group, new THREE.LatheGeometry(puckProfile(r * 0.74, h * 0.34), 36), candy(1, 0.05));
        sliver.position.set(r * 0.1, 0.25, 0);
        sliver.rotation.z = 0.05;
      }
      if (state === 'melted') {
        const slump = new THREE.LatheGeometry(puckProfile(r, h * 0.62), 40);
        const position = slump.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i), y = position.getY(i), z = position.getZ(i), sag = Math.max(0, x / r);
          position.setXYZ(i, x * (1 + sag * 0.35), y * (1 - sag * 0.75), z * 1.05);
        }
        slump.computeVertexNormals();
        add(group, slump, candy(1, 0.05));
        const syrup = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(stripeHex).lerp(new THREE.Color(baseHex), 0.45), roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
        for (let i = 0; i < 5; i++) {
          const pool = add(group, new THREE.SphereGeometry(1, 18, 10), syrup);
          const t = (random() - 0.5) * 1.6, far = r * (0.75 + random() * 0.55);
          pool.scale.set(r * (0.3 + random() * 0.3), 0.5 + random() * 0.5, r * (0.25 + random() * 0.25));
          pool.position.set(Math.cos(t) * far, 0.1, Math.sin(t) * far);
        }
        // Fluff stuck in the sugar.
        const lint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8f9bb0').lerp(new THREE.Color('#6d675d'), mood.wear * 0.6), roughness: 1 });
        for (let i = 0; i < 26 + mood.wear * 30; i++) {
          const t = random() * Math.PI * 2, far = r * (0.2 + random() * 1.0), y = far < r ? h * 0.5 * (1 - Math.max(0, Math.cos(t) * far / r) * 0.7) + 0.3 : 0.5;
          const p = new THREE.Vector3(Math.cos(t) * far, y, Math.sin(t) * far);
          const points = [p, p.clone().add(new THREE.Vector3((random() - 0.5) * 4, 0.6 + random() * 1.6, (random() - 0.5) * 4)), p.clone().add(new THREE.Vector3((random() - 0.5) * 7, 0.2 + random(), (random() - 0.5) * 7))];
          add(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, 0.1 + random() * 0.08, 3), lint);
        }
      }
      if (wrapped) {
        const flat = state === 'empty';
        const shell = new THREE.LatheGeometry(puckProfile(r * 1.06, (flat ? h * 0.3 : h) * 1.08), 32);
        if (flat) {
          const position = shell.getAttribute('position');
          for (let i = 0; i < position.count; i++) position.setY(i, Math.max(0.1, position.getY(i) + Math.sin(position.getX(i) * 0.9 + position.getZ(i) * 1.3) * 0.5));
          shell.computeVertexNormals();
        }
        add(group, shell, flat ? endFilm : bodyFilm).position.y = flat ? 0 : -h * 0.02;
        const hh = flat ? h * 0.42 : h;
        twist(group, 1, ends === 'tight' ? 0.1 + random() * 0.2 : ends === 'one' ? 1 : 0.7 + random() * 0.3, r, hh);
        twist(group, -1, ends === 'loose' ? 0.7 + random() * 0.3 : 0.1 + random() * 0.2, r, hh);
      } else {
        // The opened wrapper, pressed flat under the sweet.
        const sheet = new THREE.PlaneGeometry(r * 4.6, r * 2.9, 22, 14);
        sheet.rotateX(-Math.PI / 2);
        const position = sheet.getAttribute('position');
        const p1 = random() * 6, p2 = random() * 6;
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i), z = position.getZ(i), calm = Math.min(1, Math.max(0, (Math.hypot(x, z) - r * 0.8) / r));
          position.setY(i, 0.12 + calm * (0.5 + 0.5 * Math.sin(x * 0.55 + p1) * Math.sin(z * 0.7 + p2)) * r * 0.34 + Math.max(0, Math.abs(x) - r * 1.6) * 0.3);
        }
        sheet.computeVertexNormals();
        add(group, sheet, endFilm).rotation.y = (random() - 0.5) * 0.6;
        for (const child of group.children) if ((child as THREE.Mesh).material !== endFilm) child.position.y += 0.45;
      }
      return group;
    };

    const main = sweet(a.state, R, H, a.ends);
    main.rotation.y = (random() - 0.5) * 0.7;
    s.root.add(main);
    if (a.company === 'few' || a.company === 'wrappers') {
      const n = 2 + Math.round(mood.density * 2 + random() * 0.8);
      for (let i = 0; i < n; i++) {
        const other = sweet(a.company === 'few' ? 'whole' : 'empty', R * (0.92 + random() * 0.12), H, random() > 0.5 ? 'tight' : 'loose');
        const angle = (i / n) * Math.PI * 2 + random() * 0.8, far = R * (3.3 + random() * 1.2);
        other.position.set(Math.cos(angle) * far, 0, Math.sin(angle) * far * 0.8);
        other.rotation.y = random() * Math.PI * 2;
        s.root.add(other);
      }
    }
    if (a.company === 'crumbs' || a.state === 'cracked') {
      const shards = Array.from({ length: Math.round((a.company === 'crumbs' ? 46 : 14) * mix(0.6, 1.4, mood.density)) }, (_unused, i) => {
        const angle = random() * Math.PI * 2, far = R * (a.state === 'cracked' && a.company !== 'crumbs' ? 0.2 + random() * 0.7 : 1.2 + random() * 2.6);
        return { at: [Math.cos(angle) * far, 0.3 + (far < R ? H * 0.2 : 0), Math.sin(angle) * far] as [number, number, number], size: 0.25 + random() * (i % 7 === 0 ? 1.5 : 0.6), color: i % 3 ? baseHex : stripeHex };
      });
      s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), shards);
    }
    return s.finish();
  },
});

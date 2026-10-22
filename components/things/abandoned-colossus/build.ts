import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const STONE = {
  marble: 'Coarse white island marble, grey where the weather has reached it.',
  granite: 'Rose-red granite, the stone of obelisks.',
  sandstone: 'Golden sandstone, soft-edged.',
  basalt: 'Dark grey volcanic stone.',
  limestone: 'Pale honey limestone full of shells.',
} as const;
const TINT: Record<keyof typeof STONE, [string, string]> = {
  marble: ['#efede6', '#b9b8ae'], granite: ['#c98f7c', '#96695c'], sandstone: ['#dcb97a', '#b08f58'], basalt: ['#6d7074', '#4c4e52'], limestone: ['#e6d8b4', '#b9aa86'],
};

export default defineThing({
  questions: {
    subject: choice('What were they carving?', {
      kouros: 'A colossal standing youth, lying on his back in the trench they cut round him.',
      obelisk: 'An obelisk, lying full length in its bed, three sides freed.',
      drums: 'Column drums for a temple, standing in ring trenches, one after another.',
      lion: 'A recumbent lion, its head and paws out of the rock and its back still inside it.',
    }),
    progress: score('How far did the carving get?', ['Only outlined: trenches scored round a shape', 'Blocked out in rough planes', 'Limbs and masses rounded', 'Nearly finished, features cut, almost ready to move']),
    stopped: choice('Why did the work stop?', {
      crack: 'A crack opened right across it. Nothing to be done.',
      war: 'War came: tools dropped where the men stood, a cart overturned.',
      money: 'The money ran out: scaffold poles and survey strings left neatly for a return that never came.',
      death: 'The master died: his mallet lies on the stone and a small cross stands at its head.',
    }),
    stone: choice('What stone is it?', STONE),
    since: choice('What has gathered on it since?', {
      bare: 'Nothing. It lies bare in the sun as if left yesterday.',
      moss: 'Moss, lichen and ferns in every hollow.',
      tree: 'A fig tree has rooted in the trench and ivy crawls over one end.',
      offerings: 'Offerings: candle stubs, flowers and coins left by people who half believe in it.',
      visitors: 'A rope barrier, a little sign and a path worn by visitors.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stage = a.progress;
    const [fresh, weathered] = TINT[a.stone];
    const age = clamp01(mood.wear * 0.7 + (a.since === 'bare' ? 0 : 0.3));
    const textures: THREE.Texture[] = [];

    // Point-chisel furrows for every surface that was left rough.
    const furrows = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = -8; i < 16; i++) {
        ctx.strokeStyle = `rgba(60,55,50,${0.25 + random() * 0.3})`;
        ctx.lineWidth = 2 + random() * 3;
        ctx.beginPath();
        ctx.moveTo(i * 16 + random() * 4, 0);
        ctx.lineTo(i * 16 + 64, 128);
        ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return texture;
    })();
    const carved = s.material(new THREE.Color(fresh).lerp(new THREE.Color('#ffffff'), 0.3).lerp(new THREE.Color(weathered), age * 0.25), { roughness: 0.8, flatShading: true });
    const rough = s.material(new THREE.Color(fresh).lerp(new THREE.Color(weathered), 0.1 + age * 0.3), { roughness: 0.95, map: furrows });
    const bedrock = s.material(new THREE.Color(weathered).multiplyScalar(0.86).lerp(new THREE.Color('#7d7a6c'), age * 0.4), { roughness: 1, flatShading: true });
    const pitMat = s.material(new THREE.Color(fresh).lerp(new THREE.Color(weathered), 0.85), { roughness: 1 });
    const crackMat = new THREE.MeshStandardMaterial({ color: '#1a1917', roughness: 1 });
    const wood = s.material('#8a623c', { roughness: 0.9 });
    const iron = s.material('#3f4245', { metalness: 0.5, roughness: 0.6 });

    const TOP = 2.0; // bench top
    /** A jittered bench outline with holes, extruded from y0 to y1. */
    const outline = (hx: number, hz: number) => {
      const shape = new THREE.Shape();
      const pts: [number, number][] = [];
      const n = 14;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const sq = 1 / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
        const r = Math.min(sq, 1.32) * mix(0.93, 1.06, random());
        pts.push([Math.cos(ang) * hx * r, Math.sin(ang) * hz * r]);
      }
      pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      return shape;
    };
    const slab = (shape: THREE.Shape, y0: number, y1: number, material: THREE.Material) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 20 });
      geometry.rotateX(-Math.PI / 2);
      return s.mesh(geometry, material, [0, y0, 0]);
    };
    const part = (group: THREE.Group, round: boolean, kind: 'ball' | 'limb', size: P3, at: P3, axis: 'x' | 'y' = 'y') => {
      let mesh: THREE.Mesh;
      if (!round) mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), rough);
      else if (kind === 'ball') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 7), carved);
        mesh.scale.set(size[0] * 1.12, size[1] * 1.08, size[2] * 1.12);
      } else {
        const long = axis === 'y' ? size[1] : size[0];
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, long, 9), carved);
        if (axis === 'y') mesh.scale.set(size[0], 1, size[2]);
        else { mesh.rotation.z = -Math.PI / 2; mesh.scale.set(size[1], 1, size[2]); }
      }
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    let L = 12, Wd = 6.4; // bench half-extents are L/2, Wd/2
    let chest: P3 = [0, TOP, 0]; // where something laid on the figure goes
    let headEnd: P3 = [0, TOP, 0];
    let crackX = 0, crackTop = TOP;
    let pitPoint: P3 = [0, 0, 0];

    if (a.subject === 'kouros') {
      const Hf = 9.3;
      L = Hf + 3.0; Wd = 6.6;
      const D = mix(0.3, 1.55, stage);
      const fd = D + mix(0.12, 0.45, stage);
      const floorY = TOP - D;
      const bench = outline(L / 2, Wd / 2);
      const hole = new THREE.Path();
      // The trench hugs the figure: wide at the shoulders, narrow at the feet.
      const half = (x: number) => (x > 2.6 ? 1.5 : x > -0.6 ? 2.5 : 1.9);
      const xs = [-5.3, -0.6, -0.6, 2.6, 2.6, 5.3];
      xs.forEach((x, i) => { const z = half(i % 2 ? x - 0.01 : x + 0.01) + 0.25; i ? hole.lineTo(x, z) : hole.moveTo(x, z); });
      [...xs].reverse().forEach((x, i) => hole.lineTo(x, -(half(i % 2 ? x + 0.01 : x - 0.01) + 0.25)));
      hole.closePath();
      bench.holes.push(hole);
      slab(bench, floorY, TOP, bedrock);
      slab(outline(L / 2, Wd / 2), 0, floorY, pitMat);

      const outer = new THREE.Group(), inner = new THREE.Group(), std = new THREE.Group();
      outer.add(inner); inner.add(std);
      outer.position.set(0, floorY, 0);
      outer.rotation.y = -Math.PI / 2;
      inner.rotation.x = -Math.PI / 2;
      std.position.y = -Hf / 2;
      std.scale.z = fd / 1.4;
      s.root.add(outer);
      const r = (t: number) => stage > t;
      part(std, false, 'ball', [2.4, 0.5, 1.4], [0, 0.25, 0.7]);                                   // foot plinth
      for (const side of [-1, 1]) {
        part(std, r(0.72), 'limb', [0.85, 3.7, 1.0], [side * 0.5, 2.35, 0.6 + (side < 0 ? 0.2 : 0)]); // legs
        part(std, r(0.5), 'limb', [0.6, 3.1, 0.85], [side * 1.6, 5.9, 0.55]);                       // arms
        if (r(0.62)) part(std, true, 'ball', [0.55, 0.6, 0.7], [side * 1.6, 4.25, 0.6]);           // fists
        if (r(0.85)) part(std, true, 'ball', [0.5, 0.5, 0.4], [side * 0.5, 2.6, 1.05 + (side < 0 ? 0.2 : 0)]); // knees
        if (r(0.9)) part(std, true, 'ball', [0.75, 0.35, 1.3], [side * 0.5, 0.65, 0.85]);          // feet
      }
      part(std, r(0.55), 'ball', [2.3, 1.7, 1.25], [0, 4.9, 0.62]);                                // hips
      part(std, r(0.4), 'ball', [2.8, 2.2, 1.35], [0, 6.6, 0.68]);                                 // chest
      part(std, r(0.4), 'limb', [0.9, 0.6, 0.9], [0, 7.75, 0.6]);                                  // neck
      part(std, r(0.3), 'ball', [1.35, 1.6, 1.4], [0, 8.5, 0.7]);                                  // head
      part(std, false, 'ball', [1.9, 2.0, 0.55], [0, 8.2, 0.28]);                                  // hair mass
      if (r(0.6)) {
        part(std, true, 'ball', [0.26, 0.5, 0.3], [0, 8.45, 1.42]).material = carved;               // nose
        part(std, false, 'ball', [0.9, 0.12, 0.14], [0, 8.75, 1.36]).material = carved;             // brow
        part(std, false, 'ball', [0.5, 0.08, 0.1], [0, 8.12, 1.36]).material = carved;              // mouth
        for (let i = 0; i < 5; i++) part(std, false, 'ball', [1.7, 0.12, 0.2], [0, 9.2 - i * 0.22, 0.75 - i * 0.03]).material = carved; // hair bands
      }
      if (r(0.8)) for (const side of [-1, 1]) part(std, true, 'ball', [1.05, 0.8, 0.3], [side * 0.62, 7.0, 1.28]); // pectorals
      chest = [6.6 - Hf / 2, floorY + fd + 0.05, 0];
      headEnd = [Hf / 2 + 1.1, TOP, 0];
      crackX = -1.2; crackTop = floorY + fd * 0.8;
      pitPoint = [-2.2, floorY, 2.1];
    } else if (a.subject === 'obelisk') {
      L = 15; Wd = 6;
      const D = mix(0.35, 2.0, stage);
      const floorY = TOP - D;
      const Lo = 11.6;
      const bench = outline(L / 2, Wd / 2);
      const hole = new THREE.Path();
      // Early on only two side trenches exist; later the whole bed is opened.
      hole.moveTo(-Lo / 2 - 0.5, 1.9); hole.lineTo(Lo / 2 + 0.9, 1.5); hole.lineTo(Lo / 2 + 0.9, -1.5); hole.lineTo(-Lo / 2 - 0.5, -1.9);
      hole.closePath();
      bench.holes.push(hole);
      slab(bench, floorY, TOP, bedrock);
      slab(outline(L / 2, Wd / 2), 0, floorY, pitMat);
      const geo = new THREE.BoxGeometry(Lo, 1, 1, 6, 1, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = pos.getX(i) / Lo + 0.5;
        const w = mix(2.3, 1.45, t);
        pos.setZ(i, pos.getZ(i) * w);
        pos.setY(i, (pos.getY(i) - 0.5) * w);
      }
      geo.computeVertexNormals();
      const lift = mix(0.03, 0.35, stage);
      s.mesh(geo, stage > 0.55 ? carved : rough, [0, TOP + lift, 0]);
      if (stage > 0.45) {
        const tipGeo = new THREE.ConeGeometry(1.45 / Math.SQRT2, 1.5, 4);
        tipGeo.rotateY(Math.PI / 4);
        tipGeo.rotateZ(-Math.PI / 2);
        s.mesh(tipGeo, carved, [Lo / 2 + 0.75, TOP + lift - 0.725, 0]);
      } else s.box([0.9, 1.45, 1.6], [Lo / 2 + 0.45, TOP + lift - 0.73, 0], rough);
      if (stage > 0.8) {
        // A column of signs begun on the upper face.
        for (let i = 0; i < 16; i++) {
          const x = -Lo / 2 + 0.7 + i * 0.62;
          if (x > 1.5 && random() < 0.5) continue;
          s.box([0.3 + random() * 0.2, 0.02, 0.25 + random() * 0.5], [x, TOP + lift + 0.012, (random() - 0.5) * 0.3], pitMat);
        }
        for (const z of [-0.62, 0.62]) s.box([Lo * 0.8, 0.02, 0.05], [-Lo * 0.08, TOP + lift + 0.012, z], pitMat);
      }
      // Dolerite pounding balls left in the trench.
      for (let i = 0; i < 7; i++) s.ball([0.22, 0.2, 0.22], [-Lo / 2 + random() * Lo, floorY + 0.18, (random() < 0.5 ? -1 : 1) * (1.45 + random() * 0.15)], s.material('#3f4a44', { roughness: 0.7 }), 10);
      chest = [-1.5, TOP + lift + 0.03, 0];
      headEnd = [-Lo / 2 - 1.3, TOP, 0];
      crackX = 1.6; crackTop = TOP + lift;
      pitPoint = [0.5, floorY, 1.5];
    } else if (a.subject === 'drums') {
      L = 14.5; Wd = 6.6;
      const D = mix(0.4, 2.7, stage);
      const floorY = Math.max(0.3, TOP + 0.7 - D);
      const top = TOP + 0.7;
      const R = 1.75;
      const bench = outline(L / 2, Wd / 2);
      const started = [0, 1, 2].map((i) => stage > i * 0.3 - 0.01 || i === 0);
      [-4.5, 0, 4.5].forEach((x, i) => {
        if (started[i]) {
          const hole = new THREE.Path();
          hole.absarc(x, 0, R + 0.6, 0, Math.PI * 2, true);
          bench.holes.push(hole);
        }
      });
      slab(bench, floorY, top, bedrock);
      slab(outline(L / 2, Wd / 2), 0, floorY, pitMat);
      [-4.5, 0, 4.5].forEach((x, i) => {
        if (!started[i]) {
          // Only scribed: a compass circle and a centre mark.
          const scribe = s.ring(R, 0.05, [x, top + 0.01, 0], crackMat);
          scribe.rotation.x = Math.PI / 2;
          s.cylinder(0.08, 0.08, 0.03, [x, top + 0.01, 0], crackMat, 8);
          return;
        }
        const local = clamp01(stage - i * 0.3);
        const h = top - floorY + 0.04;
        s.cylinder(R, R, h, [x, floorY + h / 2, 0], local > 0.45 ? carved : rough, local > 0.45 ? 28 : 12);
        if (local > 0.7) for (let k = 0; k < 20; k++) s.box([0.16, h - 0.2, 0.08], [x + Math.cos(k / 20 * 6.283) * (R + 0.01), floorY + h / 2, Math.sin(k / 20 * 6.283) * (R + 0.01)], pitMat).rotation.y = -k / 20 * 6.283 + Math.PI / 2;
        if (local > 0.25) for (const zz of [-1, 1]) s.box([0.5, 0.45, 0.35], [x, floorY + h * 0.55, zz * (R + 0.12)], rough); // lifting bosses
      });
      chest = [-4.5, top + 0.08, 0];
      headEnd = [-4.5, top, -Wd / 2 + 0.7];
      crackX = -4.3; crackTop = top + 0.05;
      pitPoint = [-4.5 + R + 0.3, floorY, 0.4];
    } else {
      L = 11.5; Wd = 6.2;
      slab(outline(L / 2, Wd / 2), 0, 1.5, bedrock);
      const lion = new THREE.Group();
      lion.position.set(0.2, 1.5, 0);
      s.root.add(lion);
      const r = (t: number) => stage > t;
      part(lion, r(0.45), 'ball', [4.6, 1.9, 2.1], [-0.5, 1.05, 0]);                        // body
      part(lion, r(0.7), 'ball', [2.2, 2.0, 2.7], [-2.3, 1.0, 0]);                          // haunches
      part(lion, r(0.35), 'ball', [2.4, 2.9, 2.7], [1.5, 1.75, 0]);                         // mane and chest
      part(lion, r(0.3), 'ball', [1.5, 1.5, 1.6], [2.5, 2.85, 0]);                          // head
      part(lion, r(0.5), 'ball', [0.9, 0.75, 0.95], [3.25, 2.55, 0]);                       // muzzle
      for (const side of [-1, 1]) {
        part(lion, r(0.6), 'limb', [2.8, 0.75, 0.75], [3.0, 0.38, side * 0.8], 'x');        // forelegs
        if (r(0.8)) part(lion, true, 'ball', [0.8, 0.6, 0.95], [4.35, 0.3, side * 0.8]);    // paws
        if (r(0.55)) part(lion, true, 'ball', [0.3, 0.45, 0.4], [2.2, 3.65, side * 0.55]);  // ears
        if (r(0.7)) part(lion, false, 'ball', [0.1, 0.16, 0.26], [3.2, 3.02, side * 0.38]).material = crackMat; // eyes
      }
      if (r(0.7)) part(lion, false, 'ball', [0.16, 0.2, 0.44], [3.72, 2.68, 0]).material = pitMat; // nose
      if (r(0.85)) {
        const tail = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 6, 14, Math.PI * 0.9), carved);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(-2.4, 0.2, 1.15);
        tail.castShadow = true;
        lion.add(tail);
      }
      // The raw block the back half is still inside: it retreats as the work advances.
      const rawFront = mix(2.2, -4.6, clamp01(stage * 1.1));
      const rawLen = rawFront + 4.4;
      if (rawLen > 0.4) {
        const raw = part(lion, false, 'ball', [rawLen, mix(3.9, 2.6, stage), 3.6], [-4.4 + rawLen / 2, mix(3.9, 2.6, stage) / 2, 0]);
        raw.material = rough;
      }
      part(lion, false, 'ball', [8.6, 0.5, 3.5], [0.0, 0.0, 0]).material = pitMat;
      chest = [1.0, 1.5 + (stage > 0.5 ? 3.2 : 4.0), 0];
      if (rawFront > 0.4) chest = [-1.5, 1.5 + mix(3.9, 2.6, stage) + 0.05, 0];
      headEnd = [L / 2 - 0.9, 1.5, 2.2];
      crackX = 0.7; crackTop = 1.5 + 3.3;
      pitPoint = [3.4, 1.5, 2.2];
    }

    // ---- Why it stopped ----------------------------------------------------------------------
    if (a.stopped === 'crack') {
      let z = -Wd / 2 - 0.1, x = crackX + (random() - 0.5) * 0.4;
      while (z < Wd / 2) {
        const dz = 0.5 + random() * 0.6, dx = (random() - 0.5) * 0.7;
        const onFigure = Math.abs(z + dz / 2) < (a.subject === 'lion' ? 1.4 : 1.6);
        const h = onFigure ? crackTop + 0.03 : (a.subject === 'lion' ? 1.5 : a.subject === 'drums' ? TOP + 0.7 : TOP) + 0.03;
        const seg = s.box([0.09, h, Math.hypot(dx, dz) + 0.05], [x + dx / 2, h / 2, z + dz / 2], crackMat);
        seg.rotation.y = Math.atan2(dx, dz);
        x += dx; z += dz;
      }
    } else if (a.stopped === 'war') {
      const cart = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { cart.add(mesh); return mesh; };
      add(s.box([1.6, 0.5, 1.0], [0, 0.45, 0], wood));
      for (const z of [-0.6, 0.6]) { add(s.ring(0.5, 0.06, [0, 0.5, z], iron)); for (let k = 0; k < 3; k++) add(s.box([0.96, 0.05, 0.04], [0, 0.5, z], wood)).rotation.z = k * Math.PI / 3; }
      for (const z of [-0.4, 0.4]) add(s.rod([0.8, 0.5, z], [2.2, 0.6, z], 0.04, wood));
      cart.position.set(-L / 2 + 2.0, headEnd[1] + 0.55, Wd / 2 - 1.2);
      cart.rotation.set(1.9, random() * 3, 0.2);
      s.root.add(cart);
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * (L - 3), z = (random() < 0.5 ? -1 : 1) * (Wd / 2 - 0.4 - random() * 0.5), y = headEnd[1] + 0.05;
        const ang = random() * 6.283;
        s.rod([x, y, z], [x + Math.cos(ang) * 0.9, y, z + Math.sin(ang) * 0.9], 0.03, i % 3 ? wood : iron);
        if (i % 3 === 0) s.box([0.14, 0.14, 0.34], [x + Math.cos(ang) * 0.9, y + 0.04, z + Math.sin(ang) * 0.9], iron).rotation.y = -ang;
      }
      // A helmet somebody put down.
      s.ball([0.2, 0.15, 0.24], [chest[0] + 0.4, chest[1] + 0.1, chest[2] + 0.2], s.material('#4f5a44', { metalness: 0.3 }), 10);
    } else if (a.stopped === 'money') {
      const y0 = pitPoint[1];
      const cx = chest[0];
      const high = Math.max(chest[1], TOP) + 1.9;
      for (const dx of [-1.6, 1.6]) for (const dz of [-2.9, 2.9]) s.rod([cx + dx, y0 + (Math.abs(dz) > Wd / 2 - 1 ? 0 : 0), dz], [cx + dx, high, dz], 0.07, wood);
      for (const dz of [-2.9, 2.9]) { s.rod([cx - 1.9, high - 0.4, dz], [cx + 1.9, high - 0.4, dz], 0.06, wood); s.rod([cx - 1.6, y0 + 1.2, dz], [cx + 1.6, high - 0.5, dz], 0.045, wood); }
      for (const dx of [-1.6, 1.6]) s.rod([cx + dx, high - 0.3, -3.1], [cx + dx, high - 0.3, 3.1], 0.06, wood);
      s.box([1.2, 0.07, 5.6], [cx, high - 0.2, 0], wood);
      // Survey stakes and red string round the bench.
      const stake = new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.8 });
      const corners: P3[] = [[-L / 2 + 0.8, headEnd[1], -Wd / 2 + 0.7], [L / 2 - 0.8, headEnd[1], -Wd / 2 + 0.7], [L / 2 - 0.8, headEnd[1], Wd / 2 - 0.7], [-L / 2 + 0.8, headEnd[1], Wd / 2 - 0.7]];
      corners.forEach((c, i) => {
        s.box([0.08, 0.7, 0.08], [c[0], c[1] + 0.35, c[2]], wood);
        const n = corners[(i + 1) % 4];
        s.rod([c[0], c[1] + 0.6, c[2]], [n[0], n[1] + 0.6, n[2]], 0.02, stake);
      });
      for (let i = 0; i < 5; i++) s.box([2.4, 0.12, 0.2], [-L / 2 + 2.2, headEnd[1] + 0.06 + Math.floor(i / 2) * 0.12, -Wd / 2 + 1.3 + (i % 2) * 0.25], wood);
    } else {
      // The master's mallet and chisel laid on the stone, and a cross at its head.
      const mat = s.material('#6b4a2d', { roughness: 0.85 });
      s.cylinder(0.2, 0.26, 0.4, [chest[0], chest[1] + 0.2, chest[2]], mat, 10).rotation.z = Math.PI / 2;
      s.rod([chest[0], chest[1] + 0.2, chest[2]], [chest[0], chest[1] + 0.12, chest[2] + 0.75], 0.05, mat);
      s.rod([chest[0] + 0.5, chest[1] + 0.05, chest[2] - 0.3], [chest[0] + 0.6, chest[1] + 0.05, chest[2] + 0.5], 0.03, iron);
      const cy = headEnd[1];
      s.box([0.16, 1.5, 0.16], [headEnd[0], cy + 0.75, headEnd[2]], wood);
      s.box([0.9, 0.16, 0.16], [headEnd[0], cy + 1.1, headEnd[2]], wood).rotation.y = Math.PI / 2;
      for (let i = 0; i < 7; i++) s.mesh(new THREE.DodecahedronGeometry(0.16 + random() * 0.12, 0), bedrock, [headEnd[0] + (random() - 0.5) * 0.7, cy + 0.1, headEnd[2] + (random() - 0.5) * 0.7]);
      const wreath = s.ring(0.3, 0.07, [headEnd[0] - 0.12, cy + 1.1, headEnd[2]], s.material(mood.cheer > 0.5 ? '#5c8a3c' : '#6b6a4a', { roughness: 1 }));
      wreath.rotation.y = Math.PI / 2;
    }

    // ---- What has gathered since -------------------------------------------------------------
    const benchY = headEnd[1];
    const edgePoint = (): P3 => {
      const along = (random() - 0.5) * (L - 2.5);
      return [along, benchY, (random() < 0.5 ? -1 : 1) * (Wd / 2 - 0.4 - random() * 0.7)];
    };
    if (a.since === 'moss' || a.since === 'tree' || age > 0.75) {
      const mossMat = s.material('#647c3a', { roughness: 1 });
      const blobs: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 34; i++) {
        const p = random() < 0.35 ? ([pitPoint[0] + (random() - 0.5) * 6, pitPoint[1], pitPoint[2] * (random() < 0.5 ? 1 : -1)] as P3) : edgePoint();
        blobs.push({ at: [p[0], p[1] + 0.03, p[2]], size: 0.12 + random() * 0.24, color: ['#566e34', '#6d7f3d', '#465f2c', '#9a9040', '#b57a34'][Math.floor(random() * 5)] });
      }
      const blobGeo = new THREE.SphereGeometry(1, 7, 5);
      blobGeo.scale(1, 0.3, 1);
      s.scatter(blobGeo, s.material('#ffffff', { roughness: 1 }), blobs);
      s.ball([0.5, 0.05, 0.35], [chest[0] - 0.9, chest[1] - 0.0, chest[2] + 0.2], mossMat, 10);
      const ferns: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const p = edgePoint(); ferns.push({ at: p, size: 0.3 + random() * 0.5, color: ['#5f8a3c', '#7fa04a', '#4a7030'][Math.floor(random() * 3)] }); }
      const blade = new THREE.ConeGeometry(0.28, 1, 5);
      blade.translate(0, 0.5, 0);
      s.scatter(blade, s.material('#ffffff', { roughness: 1 }), ferns);
    }
    if (a.since === 'tree') {
      const bark = s.material('#8a8273', { roughness: 1 });
      const leaf = s.material(mood.warmth > 0.6 ? '#8a9a3a' : '#4f7d3a', { roughness: 1, flatShading: true });
      const [tx, ty, tz] = [-L / 2 + 1.3, benchY - 0.2, -Wd / 2 + 1.0];
      s.tube([[tx, ty, tz], [tx + 0.2, ty + 1.2, tz + 0.2], [tx - 0.3, ty + 2.4, tz + 0.5], [tx - 0.1, ty + 3.6, tz + 0.3]], 0.16, bark);
      s.tube([[tx + 0.1, ty + 1.0, tz + 0.2], [tx + 0.9, ty + 2.2, tz + 0.7], [tx + 1.6, ty + 2.9, tz + 0.6]], 0.1, bark);
      for (let i = 0; i < 9; i++) s.mesh(new THREE.DodecahedronGeometry(0.55 + random() * 0.45, 0), leaf, [tx - 0.2 + (random() - 0.5) * 2.2, ty + 3.0 + random() * 1.3, tz + 0.4 + (random() - 0.5) * 1.8]);
      const ivy: { at: P3; size: number }[] = [];
      for (let i = 0; i < 60; i++) ivy.push({ at: [-L / 2 + 0.5 + random() * 3.2, benchY * random() + 0.1, Wd / 2 * (0.7 + random() * 0.32) * (random() < 0.7 ? 1 : -1)], size: 0.14 + random() * 0.18 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#3f6a34', { roughness: 1, flatShading: true }), ivy);
    }
    if (a.since === 'offerings') {
      const wax = s.material('#f1ead2', { roughness: 0.6 });
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd36a', emissive: '#ffb22e', emissiveIntensity: 1.6 });
      for (let i = 0; i < 9; i++) {
        const x = chest[0] + (random() - 0.5) * 1.6, z = chest[2] + (random() - 0.5) * 1.3, h = 0.1 + random() * 0.25;
        s.cylinder(0.06, 0.07, h, [x, chest[1] + h / 2, z], i % 4 === 0 ? s.material('#c8281e') : wax, 8);
        if (random() < 0.3 + mood.cheer * 0.6) s.ball([0.04, 0.07, 0.04], [x, chest[1] + h + 0.07, z], flame, 6);
      }
      const petals: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 40; i++) petals.push({ at: [chest[0] + (random() - 0.5) * 2.6, chest[1] + 0.03, chest[2] + (random() - 0.5) * 1.8], size: 0.05 + random() * 0.08, color: ['#e8452c', '#f2b12a', '#f4f0e6', '#d94a8c', '#e8c61a'][Math.floor(random() * 5)] });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff', { roughness: 0.8 }), petals);
      // A string of faded ribbons on sticks.
      const sticks: P3[] = [[chest[0] - 1.6, benchY, Wd / 2 - 0.5], [chest[0] + 1.6, benchY, Wd / 2 - 0.5]];
      for (const st of sticks) s.rod(st, [st[0], st[1] + 1.5, st[2]], 0.03, wood);
      s.rod([sticks[0][0], benchY + 1.45, sticks[0][2]], [sticks[1][0], benchY + 1.45, sticks[1][2]], 0.012, iron);
      for (let i = 0; i < 9; i++) s.box([0.2, 0.26, 0.01], [sticks[0][0] + 0.3 + i * 0.33, benchY + 1.3, sticks[0][2]], new THREE.MeshStandardMaterial({ color: ['#d9452c', '#f2c12a', '#2f7fb8', '#f4f0e6', '#3f9a5a'][i % 5], roughness: 0.9, side: THREE.DoubleSide }));
    }
    if (a.since === 'visitors') {
      const post = s.material('#6d5a3f');
      const rope = s.material('#c9b27a', { roughness: 1 });
      const z = Wd / 2 - 0.45;
      const xs = [-L / 2 + 1.2, -L / 6, L / 6, L / 2 - 1.2];
      xs.forEach((x, i) => {
        s.cylinder(0.05, 0.06, 1.0, [x, benchY + 0.5, z], post, 8);
        if (i) s.tube([[xs[i - 1], benchY + 0.92, z], [(xs[i - 1] + x) / 2, benchY + 0.7, z], [x, benchY + 0.92, z]], 0.025, rope);
      });
      s.rod([L / 2 - 2.2, benchY, z - 0.5], [L / 2 - 2.2, benchY + 0.9, z - 0.5], 0.04, iron);
      const sign = s.label(a.subject === 'obelisk' ? 'UNFINISHED OBELISK' : a.subject === 'kouros' ? 'KOUROS  6c. BC' : a.subject === 'drums' ? 'ANCIENT QUARRY' : 'LION  UNFINISHED', 1.3, 0.6, [L / 2 - 2.2, benchY + 1.1, z - 0.48], '#f4f1e4', '#5d4a34');
      sign.rotation.x = -0.35;
      // A plastic bottle someone left.
      s.cylinder(0.05, 0.05, 0.24, [xs[1] + 0.6, benchY + 0.05, z - 0.4], new THREE.MeshStandardMaterial({ color: '#7fc4e8', roughness: 0.2 }), 8).rotation.z = Math.PI / 2;
    }

    // Spoil: chips heaped off the bench edge, and a ladder for scale.
    const chips: { at: P3; size: number }[] = [];
    for (let i = 0; i < 20 + mood.density * 40; i++) {
      const ang = random() * 6.283, rr = 0.9 * random();
      chips.push({ at: [-L / 2 - 0.6 + Math.cos(ang) * rr * 1.2, 0.1 + (0.9 - rr) * 0.7 * random(), -Wd / 4 + Math.sin(ang) * rr * 2.2], size: 0.1 + random() * 0.24 });
    }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(fresh, { roughness: 1, flatShading: true }), chips);
    const lz = Wd / 2 + 0.75, lx = L / 4;
    for (const dx of [-0.25, 0.25]) s.rod([lx + dx, 0, lz + 0.5], [lx + dx, benchY + 0.7, lz - 0.7], 0.04, wood);
    for (let i = 1; i < 8; i++) { const t = i / 8; s.rod([lx - 0.25, t * (benchY + 0.7), lz + 0.5 - t * 1.2], [lx + 0.25, t * (benchY + 0.7), lz + 0.5 - t * 1.2], 0.03, wood); }

    const thing = s.finish();
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { textures.forEach((texture) => texture.dispose()); dispose(); } };
  },
});

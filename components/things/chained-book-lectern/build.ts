import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Rand = () => number;
type P3 = [number, number, number];

const PAGES = {
  text: 'Two dense columns of black script with red headings.',
  illuminated: 'A painted miniature in a gold frame above a few lines of text.',
  diagram: 'Circles within circles, a chart of spheres and signs: the kind of page that gets a book locked up.',
  music: 'Four-line staves with square black notes, a choir book.',
  blank: 'Empty vellum: ruled, never written, or scraped clean.',
} as const;

function pageTexture(random: Rand, kind: keyof typeof PAGES, wear: number, left: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 352;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#eadfbe';
  g.fillRect(0, 0, 256, 352);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(140,110,60,${0.03 + random() * 0.06 * (0.4 + wear)})`;
    g.beginPath();
    g.ellipse(random() * 256, random() * 352, 10 + random() * 40, 8 + random() * 30, random() * 3, 0, 7);
    g.fill();
  }
  const script = (x0: number, x1: number, y0: number, y1: number, step = 12) => {
    for (let y = y0; y < y1; y += step) {
      let x = x0;
      const red = random() < 0.1;
      while (x < x1 - 6) {
        const w = Math.min(5 + random() * 16, x1 - x);
        g.fillStyle = red ? '#a3281c' : '#261d16';
        for (let k = 0; k < w; k += 3) g.fillRect(x + k, y, 2, 6.5);
        x += w + 4;
      }
    }
  };
  if (kind === 'text') {
    script(24, 120, 30, 320);
    script(136, 232, 30, 320);
    g.fillStyle = '#1f3f8c';
    g.fillRect(24, 28, 30, 34);
    g.fillStyle = '#d5a62c';
    g.fillRect(30, 34, 18, 22);
  } else if (kind === 'illuminated') {
    if (left) script(24, 232, 30, 320);
    else {
      g.fillStyle = '#d5a62c';
      g.fillRect(24, 26, 208, 180);
      g.fillStyle = '#23428f';
      g.fillRect(36, 38, 184, 156);
      g.fillStyle = '#b0271d';
      g.beginPath();
      g.arc(128, 150, 62, Math.PI, 0);
      g.fill();
      g.fillStyle = '#e8c9a0';
      g.beginPath();
      g.arc(128, 96, 20, 0, 7);
      g.fill();
      g.fillStyle = '#d5a62c';
      g.beginPath();
      g.arc(128, 96, 30, 0, 7);
      g.arc(128, 96, 22, 0, 7, true);
      g.fill();
      g.fillStyle = '#2f6b3e';
      g.fillRect(36, 170, 184, 24);
      script(24, 232, 222, 320);
    }
  } else if (kind === 'diagram') {
    if (left) script(24, 232, 30, 320);
    else {
      g.strokeStyle = '#261d16';
      g.lineWidth = 3;
      for (const r of [96, 76, 56, 36, 16]) {
        g.strokeStyle = r === 56 ? '#a3281c' : '#261d16';
        g.beginPath();
        g.arc(128, 150, r, 0, 7);
        g.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(128 + Math.cos(angle) * 56, 150 + Math.sin(angle) * 56);
        g.lineTo(128 + Math.cos(angle) * 96, 150 + Math.sin(angle) * 96);
        g.stroke();
        g.fillStyle = i % 3 ? '#261d16' : '#a3281c';
        g.fillRect(128 + Math.cos(angle + 0.26) * 86 - 4, 150 + Math.sin(angle + 0.26) * 86 - 4, 8, 8);
      }
      script(24, 232, 268, 326);
    }
  } else if (kind === 'music') {
    for (let stave = 0; stave < 5; stave++) {
      const y = 36 + stave * 60;
      g.fillStyle = '#a3281c';
      for (let line = 0; line < 4; line++) g.fillRect(24, y + line * 9, 208, 1.6);
      g.fillStyle = '#1c1612';
      let x = 34;
      let pitch = 2;
      while (x < 224) {
        pitch = Math.max(0, Math.min(6, pitch + Math.round((random() - 0.5) * 3)));
        g.fillRect(x, y + pitch * 4.5 - 4, 8, 8);
        x += 12 + random() * 12;
      }
      script(24, 232, y + 38, y + 46);
    }
  } else {
    g.fillStyle = 'rgba(120,90,60,0.3)';
    for (let y = 34; y < 320; y += 13) g.fillRect(26, y, 204, 0.8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Oval links alternately turned, strung along a curve, in one draw call. */
function chain(s: Sculpture, points: P3[], size: number, material: THREE.Material) {
  if (points.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const count = Math.max(2, Math.round(curve.getLength() / (size * 2.5)));
  const geometry = new THREE.TorusGeometry(size, size * 0.3, 6, 12);
  geometry.scale(0.72, 1.5, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const tangent = curve.getTangentAt(t);
    q.setFromUnitVectors(up, tangent);
    roll.setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0);
    m.compose(curve.getPointAt(t), q.multiply(roll), one);
    mesh.setMatrixAt(i, m);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
}

export default defineThing({
  questions: {
    stand: choice('What does the book rest on?', {
      oak: 'A turned oak pedestal lectern with an iron rail above the book rest.',
      stone: 'A carved stone pier with a sloped slab, cold and permanent, with an iron rail let into it.',
      eagle: 'A brass eagle lectern: the book lies on the spread wings, the bird stands on a globe atop a column.',
      folding: 'A folding X-frame of iron with a leather sling, portable, chained to a ring block on the floor.',
    }),
    state: choice('What has become of the book?', {
      open: 'Lying open to be read, chain slack.',
      shut: 'Clasped shut, chained, not for you.',
      cut: 'Still there and shut, but the chain has been cut: someone was interrupted.',
      stolen: 'Gone. The cut chain hangs and a few torn leaves remain on the rest.',
      fallen: 'Dragged off the stand and lying on the floor at the full length of its chain.',
    }),
    binding: choice('How is the book bound?', {
      oxblood: 'Dark red calf over boards with five brass bosses.',
      pigskin: 'Pale blind-stamped pigskin, plain and scholarly.',
      black: 'Black hide with iron corners, severe and ominous.',
      green: 'Green velvet with silver clasps, a rich donor\'s gift.',
      treasure: 'A treasure binding plated in gold and set with coloured stones.',
    }),
    pages: choice('If it lies open, what do the pages show?', PAGES),
    bulk: score('How big is the volume?', ['A stout handbook', 'A large folio', 'A giant choir book one person can barely lift']),
    links: score('How heavy is the chain?', ['Fine links like a watch chain', 'Ordinary forged links', 'Massive links fit for a prisoner']),
    extra: choice('What else belongs to the stand?', {
      none: 'Nothing else.',
      padlock: 'A fist-sized padlock where the chain meets its anchor.',
      candle: 'An iron arm holding a candle stub to read by.',
      curse: 'A parchment notice nailed up: a curse on whoever takes the book.',
      cloth: 'An embroidered cloth laid under the book, hanging over the front.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = mood.wear;
    const iron = s.material(new THREE.Color('#34312f').lerp(new THREE.Color('#6b3f26'), rust * 0.6), { metalness: 0.55 - rust * 0.3, roughness: 0.5 });
    const brass = s.material('#b8892c', { metalness: 0.75, roughness: 0.32 });
    const oakTone = new THREE.Color('#8a6639').lerp(new THREE.Color('#4a3625'), mood.wear * 0.7);
    const oak = (shift = 0) => s.material(oakTone.clone().offsetHSL(0, 0, shift), { roughness: 0.8 });
    const stone = (shift = 0) => s.material(new THREE.Color('#b5ae9d').offsetHSL(0.02 * (mood.warmth - 0.5), 0, shift), { roughness: 0.95 });
    const vellum = s.material('#dccfa8', { roughness: 0.9 });

    const size = mix(0.72, 1.3, a.bulk);
    const pw = 0.23 * size, ph = 0.33 * size, th = mix(0.06, 0.11, a.bulk);
    const restW = Math.max(0.56, pw * 2 + 0.12), restL = Math.max(0.44, ph + 0.1);
    const H = a.stand === 'folding' ? 0.95 : 1.12;
    const theta = a.stand === 'folding' ? 0.32 : 0.55;
    const world = (x: number, y: number, z: number): P3 => [x, H + y * Math.cos(theta) - z * Math.sin(theta), y * Math.sin(theta) + z * Math.cos(theta)];

    const top = new Sculpture(context);
    top.root.position.set(0, H, 0);
    top.root.rotation.x = theta;
    s.root.add(top.root);

    // ---- stands ----
    let anchor: P3;
    let restY = 0.02;
    if (a.stand === 'oak') {
      top.box([restW, 0.035, restL], [0, 0, 0], oak(0.02));
      top.box([restW, 0.045, 0.03], [0, 0.03, restL / 2], oak(-0.04));
      s.box([0.52, 0.05, 0.14], [0, 0.025, 0], oak(-0.05));
      s.box([0.14, 0.05, 0.52], [0, 0.025, 0], oak(-0.05));
      s.box([0.22, 0.07, 0.22], [0, 0.085, 0], oak(-0.02));
      s.lathe([[0.075, 0.12], [0.05, 0.2], [0.045, 0.42], [0.075, 0.47], [0.075, 0.5], [0.04, 0.55], [0.04, 0.86], [0.07, 0.9], [0.05, 0.95], [0.09, H - 0.04]], oak());
      s.box([0.3, 0.05, 0.26], [0, H - 0.05, -0.02], oak(-0.03));
    } else if (a.stand === 'stone') {
      top.box([restW + 0.04, 0.07, restL + 0.02], [0, -0.015, 0], stone(0.03));
      top.box([restW + 0.04, 0.05, 0.04], [0, 0.04, restL / 2 - 0.01], stone(-0.02));
      s.box([0.6, 0.1, 0.5], [0, 0.05, 0], stone(-0.05));
      s.box([0.48, 0.07, 0.4], [0, 0.135, 0], stone(-0.02));
      const pier = s.mesh(new THREE.CylinderGeometry(0.15, 0.19, H - 0.36, 8), stone(), [0, 0.17 + (H - 0.36) / 2, 0]);
      pier.rotation.y = Math.PI / 8;
      s.box([0.44, 0.07, 0.36], [0, H - 0.17, 0], stone(0.02));
      s.box([0.5, 0.08, 0.3], [0, H - 0.1, -0.03], stone(-0.01));
    } else if (a.stand === 'eagle') {
      s.lathe([[0.26, 0], [0.26, 0.03], [0.17, 0.07], [0.07, 0.12], [0.05, 0.2], [0.085, 0.26], [0.05, 0.32], [0.04, 0.62], [0.08, 0.68], [0.04, 0.74], [0.035, 0.84], [0.06, 0.86]], brass);
      for (let i = 0; i < 3; i++) s.ball([0.045, 0.03, 0.06], [Math.cos(i * 2.094 + 0.52) * 0.25, 0.02, Math.sin(i * 2.094 + 0.52) * 0.25], brass, 10);
      s.ball([0.1, 0.1, 0.1], [0, 0.94, 0], brass, 20);
      // The bird: body under the wings, head rising behind the book and looking away over the reader's shoulder.
      s.ball([0.1, 0.17, 0.12], [0, H - 0.06, -0.04], brass, 16).rotation.x = -0.5;
      const headY = H + restL * 0.36 + 0.07, headZ = -restL * 0.4;
      s.rod([0, H, -0.1], [0, headY - 0.02, headZ], 0.06, brass, 0.045);
      s.ball([0.062, 0.07, 0.085], [0, headY, headZ - 0.01], brass, 14);
      const beak = s.mesh(new THREE.ConeGeometry(0.03, 0.11, 8), brass, [0, headY - 0.03, headZ - 0.11]);
      beak.rotation.x = -Math.PI / 2 - 0.7;
      for (const side of [-1, 1]) s.ball([0.012, 0.012, 0.012], [side * 0.05, headY + 0.015, headZ - 0.04], s.material('#1b1510'), 8);
      for (const side of [-1, 1]) {
        s.rod([side * 0.035, 0.98, 0.02], [side * 0.04, H - 0.14, 0.0], 0.016, brass);
        const shape = new THREE.Shape();
        shape.moveTo(0, -restL / 2);
        const feathers = 6;
        for (let i = 0; i <= feathers; i++) {
          const u = i / feathers;
          const reach = restW * mix(0.5, 0.64, Math.sin(u * Math.PI * 0.9));
          shape.lineTo(reach, -restL / 2 + u * restL);
          if (i < feathers) shape.lineTo(reach - 0.035, -restL / 2 + (u + 0.5 / feathers) * restL);
        }
        shape.lineTo(0, restL / 2);
        const wing = top.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false }), brass);
        wing.rotation.x = Math.PI / 2;
        wing.scale.x = side;
        wing.position.y = 0.012;
      }
      top.box([restW * 0.8, 0.04, 0.025], [0, 0.03, restL / 2 - 0.01], brass);
      // Tail fanned down the front.
      for (let i = -2; i <= 2; i++) top.box([0.03, 0.012, 0.16], [i * 0.032, -0.03, restL / 2 + 0.06], brass).rotation.y = i * 0.12;
    } else {
      // Folding X-frame with a leather sling.
      const halfW = restW / 2 + 0.02;
      const front = world(0, 0, restL / 2), back = world(0, 0, -restL / 2);
      for (const side of [-1, 1]) {
        s.rod([side * halfW, 0, 0.3], [side * halfW, back[1], back[2]], 0.014, iron);
        s.rod([side * halfW * 0.92, 0, -0.3], [side * halfW * 0.92, front[1], front[2]], 0.014, iron);
        s.ball([0.022, 0.022, 0.022], [side * halfW, (back[1] + 0) / 2, 0], iron, 8);
      }
      for (const [y, z] of [[back[1], back[2]], [front[1], front[2]]] as const) {
        s.rod([-halfW - 0.03, y, z], [halfW + 0.03, y, z], 0.014, iron);
        for (const side of [-1, 1]) s.ball([0.026, 0.026, 0.026], [side * (halfW + 0.04), y, z], brass, 10);
      }
      for (const z of [0.3, -0.3]) s.rod([-halfW, 0.012, z], [halfW, 0.012, z], 0.012, iron);
      const sling = top.mesh(new THREE.PlaneGeometry(restW, restL, 1, 8), s.material('#5c3d28', { roughness: 0.85, side: THREE.DoubleSide }));
      sling.rotation.x = -Math.PI / 2;
      const sp = sling.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setZ(i, -0.035 * Math.cos((sp.getY(i) / restL) * Math.PI));
      sling.geometry.computeVertexNormals();
      restY = -0.03;
    }

    // ---- where the chain is made fast ----
    if (a.stand === 'oak' || a.stand === 'stone') {
      const railY = 0.34;
      const railZ = -restL / 2 + 0.02;
      for (const side of [-1, 1]) {
        top.rod([side * (restW / 2 - 0.03), 0, railZ], [side * (restW / 2 - 0.03), railY, railZ], 0.011, iron);
        top.ring(0.022, 0.007, [side * (restW / 2 - 0.03), railY + 0.03, railZ], iron);
      }
      top.rod([-restW / 2 - 0.02, railY, railZ], [restW / 2 + 0.02, railY, railZ], 0.009, iron);
      const ringX = restW * 0.28;
      top.ring(0.024, 0.006, [ringX, railY - 0.016, railZ], iron).rotation.y = Math.PI / 2;
      anchor = world(ringX, railY - 0.04, railZ);
    } else if (a.stand === 'eagle') {
      s.ring(0.03, 0.007, [0.075, 0.7, 0], iron).rotation.y = Math.PI / 2;
      anchor = [0.085, 0.68, 0];
    } else {
      s.box([0.24, 0.12, 0.24], [restW / 2 + 0.26, 0.06, -0.1], stone(-0.03));
      s.ring(0.035, 0.009, [restW / 2 + 0.26, 0.15, -0.1], iron);
      anchor = [restW / 2 + 0.26, 0.17, -0.1];
    }

    // ---- the book ----
    const leatherColour = { oxblood: '#6e2219', pigskin: '#cdbd98', black: '#1f1c1b', green: '#2f5a3a', treasure: '#c69a2e' }[a.binding];
    const leather = s.material(leatherColour, a.binding === 'treasure' ? { metalness: 0.8, roughness: 0.3 } : { roughness: 0.7 });
    const fitting = a.binding === 'black' ? iron : a.binding === 'green' ? s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }) : brass;
    const linkSize = mix(0.009, 0.026, a.links);

    const closedBook = (b: Sculpture) => {
      b.box([pw + 0.02, th, ph + 0.03], [0, th / 2, 0], leather);
      b.box([pw, th - 0.024, ph + 0.005], [0.014, th / 2, 0], vellum);
      b.cylinder(th / 2, th / 2, ph + 0.03, [-pw / 2 - 0.008, th / 2, 0], leather, 12).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) b.box([0.012, th + 0.006, 0.012], [-pw / 2 - 0.012, th / 2, -ph * 0.36 + i * ph * 0.24], leather).scale.x = 2.2;
      if (a.binding !== 'pigskin') {
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) b.ball([0.022 * size, 0.014, 0.022 * size], [x * pw * 0.36, th, z * ph * 0.38], fitting, 10);
      } else {
        b.box([pw * 0.7, 0.002, ph * 0.72], [0, th + 0.001, 0], s.material('#b7a67f'));
        b.box([pw * 0.5, 0.003, ph * 0.52], [0, th + 0.001, 0], s.material('#cdbd98'));
      }
      if (a.binding === 'treasure') {
        b.box([pw * 0.5, 0.008, ph * 0.56], [0, th + 0.003, 0], s.material('#f1ecdf', { roughness: 0.4 }));
        const gems = ['#b3202a', '#1f4fa8', '#1f8a4c', '#b3202a', '#6a2fa0', '#1f4fa8'];
        gems.forEach((gem, i) => b.ball([0.016, 0.012, 0.016], [Math.cos(i * 1.047) * pw * 0.36, th + 0.006, Math.sin(i * 1.047) * ph * 0.4], s.material(gem, { roughness: 0.15, emissive: gem, emissiveIntensity: 0.25 }), 8));
      }
      for (const z of [-ph * 0.24, ph * 0.24]) {
        b.box([0.05, 0.008, 0.03], [pw / 2 - 0.01, th + 0.003, z], fitting);
        b.box([0.008, th * 0.8, 0.03], [pw / 2 + 0.012, th * 0.6, z], fitting);
      }
    };
    const openBook = (b: Sculpture) => {
      b.box([pw * 2 + 0.04, 0.014, ph + 0.03], [0, 0.007, 0], leather);
      const split = mix(0.25, 0.75, random());
      for (const side of [-1, 1]) {
        const thick = Math.max(0.012, (th - 0.02) * (side < 0 ? split : 1 - split));
        const geometry = new THREE.BoxGeometry(pw, thick, ph, 10, 1, 1);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const u = side < 0 ? 0.5 - p.getX(i) / pw : 0.5 + p.getX(i) / pw; // 0 at the gutter, 1 at the fore edge
          if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(Math.min(1, u * 1.25) * Math.PI) * 0.014 - u * thick * 0.25);
        }
        geometry.computeVertexNormals();
        const face = new THREE.MeshStandardMaterial({ map: pageTexture(random, a.pages, mood.wear, side < 0), roughness: 0.9 });
        const mesh = b.mesh(geometry, [vellum, vellum, face, vellum, vellum, vellum] as unknown as THREE.Material, [side * (pw / 2 + 0.002), 0.014 + thick / 2, 0]);
        mesh.castShadow = true;
      }
      // A ribbon marker trailing out of the gutter.
      b.box([0.012, 0.003, ph * 0.5], [0.004, 0.02 + th * 0.4, ph * 0.3], s.material('#a3281c'));
      b.box([0.012, 0.003, 0.09], [0.004, 0.012, ph / 2 + 0.05], s.material('#a3281c'));
    };

    const book = new Sculpture(context);
    let hasp: P3 | null = null;
    const present = a.state !== 'stolen';
    if (a.extra === 'cloth' && a.state !== 'fallen') {
      const cloth = s.material(mood.cheer > 0.5 ? '#7a1f2b' : '#2c3a5a', { roughness: 0.95 });
      top.box([restW * 0.86, 0.008, restL * 0.96], [0, restY + 0.006, 0], cloth);
      const fall = top.box([restW * 0.86, 0.008, 0.22], [0, restY + 0.06 - 0.11 * Math.cos(theta), restL / 2 + 0.035 + 0.11 * Math.sin(theta)], cloth);
      fall.rotation.x = Math.PI / 2 - theta;
      const fringe = top.box([restW * 0.86, 0.01, 0.02], [0, restY + 0.06 - 0.22 * Math.cos(theta), restL / 2 + 0.035 + 0.22 * Math.sin(theta)], s.material('#c9a23a'));
      fringe.rotation.x = Math.PI / 2 - theta;
    }
    if (a.state === 'fallen') {
      closedBook(book);
      const bx = 0.34 + random() * 0.12, bz = 0.42 + random() * 0.1, turn = random() * 2 - 1;
      book.root.position.set(bx, 0, bz);
      book.root.rotation.y = turn;
      s.root.add(book.root);
      hasp = [bx, th * 0.7, bz - ph * 0.3];
      for (let i = 0; i < 3; i++) {
        const leaf = s.box([pw * 0.9, 0.002, ph * 0.9], [bx - 0.3 - random() * 0.2, 0.002 + i * 0.002, bz + (random() - 0.5) * 0.3], vellum);
        leaf.rotation.y = random() * 3;
      }
    } else if (present) {
      const lift = restY + 0.018;
      if (a.state === 'open') {
        openBook(book);
        book.root.position.set(0, lift, -0.01);
        hasp = world(pw + 0.01, lift + 0.012, -ph / 2);
      } else {
        closedBook(book);
        book.root.position.set(0.01, lift, -0.01);
        book.root.rotation.y = (random() - 0.5) * 0.12;
        hasp = world(pw / 2 - 0.02, lift + th, -ph / 2);
      }
      top.root.add(book.root);
    } else {
      // Torn leaves left behind.
      for (let i = 0; i < 2 + Math.floor(random() * 3); i++) {
        const leaf = top.box([pw * (0.5 + random() * 0.5), 0.002, ph * (0.3 + random() * 0.5)], [(random() - 0.5) * restW * 0.6, restY + 0.02 + i * 0.002, (random() - 0.5) * restL * 0.5], vellum);
        leaf.rotation.y = random() * 3;
      }
    }

    // ---- the chain ----
    const drop = (from: P3, length: number): P3[] => {
      const floor = linkSize;
      const hang = Math.min(length, from[1] - floor);
      const pts: P3[] = [from, [from[0] + 0.004, from[1] - hang, from[2] + 0.004]];
      if (length > hang) pts.push([from[0] + 0.05, floor, from[2] + (length - hang) * 0.7], [from[0] + (length - hang) * 0.5, floor, from[2] + (length - hang)]);
      return pts;
    };
    if (hasp && (a.state === 'open' || a.state === 'shut' || a.state === 'fallen')) {
      s.ring(linkSize * 1.2, linkSize * 0.35, hasp, fitting);
      const mid: P3 = a.state === 'fallen'
        ? [(hasp[0] + anchor[0]) / 2, Math.max(0.03, anchor[1] * 0.3), (hasp[2] + anchor[2]) / 2]
        : a.stand === 'eagle'
          ? [restW / 2 + 0.07, Math.min(hasp[1], anchor[1]) - 0.1, 0.02]
          : a.stand === 'folding'
            ? [restW / 2 + 0.12, 0.3, -0.12]
            : [restW / 2 + 0.07, hasp[1] - 0.22 - random() * 0.1, hasp[2] + 0.06];
      const pts: P3[] = a.stand === 'eagle' && a.state !== 'fallen' ? [hasp, [restW / 2 + 0.05, hasp[1] - 0.05, hasp[2] + 0.03], mid, anchor] : [hasp, mid, anchor];
      chain(s, pts, linkSize, iron);
    } else {
      // Cut: a length left hanging from the anchor, and a short tail on the book if it is still there.
      chain(s, drop([anchor[0], anchor[1] - 0.01, anchor[2]], 0.35 + random() * 0.4), linkSize, iron);
      if (hasp) {
        s.ring(linkSize * 1.2, linkSize * 0.35, hasp, fitting);
        chain(s, [hasp, [hasp[0] + 0.08, hasp[1] - 0.03, hasp[2] + 0.02], [hasp[0] + 0.14, hasp[1] - 0.09, hasp[2] + 0.07]], linkSize, iron);
      }
      // The broken link and the file that did it, on the floor.
      s.ring(linkSize, linkSize * 0.3, [anchor[0] + 0.1, linkSize * 0.3, 0.35], iron, Math.PI * 1.4).rotation.x = Math.PI / 2;
      const file = s.box([0.02, 0.006, 0.22], [anchor[0] - 0.12, 0.004, 0.42], s.material('#8c9094', { metalness: 0.7, roughness: 0.4 }));
      file.rotation.y = random() * 2;
    }

    // ---- extras ----
    if (a.extra === 'padlock') {
      const lock = new Sculpture(context);
      lock.box([0.085, 0.08, 0.035], [0, -0.075, 0], iron);
      lock.ring(0.03, 0.008, [0, -0.03, 0], iron, Math.PI).rotation.z = 0;
      lock.cylinder(0.008, 0.008, 0.04, [0, -0.08, 0.012], s.material('#141210'), 8).rotation.x = Math.PI / 2;
      lock.root.position.set(anchor[0], anchor[1] + 0.01, anchor[2] + 0.025);
      lock.root.rotation.z = (random() - 0.5) * 0.5;
      s.root.add(lock.root);
    }
    let flame: THREE.Mesh | null = null;
    if (a.extra === 'candle') {
      const from: P3 = a.stand === 'eagle' ? [-0.04, 0.72, 0] : a.stand === 'folding' ? [-restW / 2 - 0.05, world(0, 0, -restL / 2)[1], world(0, 0, -restL / 2)[2]] : world(-restW / 2 + 0.03, 0.2, -restL / 2 + 0.02);
      const tip: P3 = [from[0] - 0.2, from[1] + 0.08, from[2] + 0.06];
      s.tube([from, [from[0] - 0.1, from[1] - 0.03, from[2] + 0.03], tip], 0.008, iron);
      s.cylinder(0.045, 0.02, 0.02, [tip[0], tip[1] + 0.01, tip[2]], iron, 12);
      const tall = 0.05 + random() * 0.09;
      s.cylinder(0.014, 0.017, tall, [tip[0], tip[1] + 0.02 + tall / 2, tip[2]], s.material('#e9dcb2', { emissive: '#f2c56b', emissiveIntensity: 0.2 }), 10);
      flame = s.ball([0.01, 0.026, 0.01], [tip[0], tip[1] + tall + 0.05, tip[2]], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.4 }), 10);
    }
    if (a.extra === 'curse') {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 160;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#e6d9b4';
      g.fillRect(0, 0, 128, 160);
      g.fillStyle = '#a3281c';
      g.fillRect(14, 14, 100, 12);
      g.fillStyle = '#261d16';
      for (let y = 38; y < 120; y += 12) for (let x = 14; x < 108; x += 4) if (random() > 0.18) g.fillRect(x, y, 2.6, 7);
      g.fillStyle = '#7a1414';
      g.beginPath();
      g.arc(64, 138, 13, 0, 7);
      g.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const noteY = a.stand === 'folding' ? 0.4 : H - 0.42;
      const noteZ = a.stand === 'stone' ? 0.19 : a.stand === 'folding' ? 0.2 : 0.09;
      const note = s.mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [0.01, noteY, noteZ]);
      note.rotation.z = (random() - 0.5) * 0.2;
      if (a.stand === 'folding') s.rod([0, 0.52, 0.2], [0, 0.6, 0.12], 0.004, iron);
      s.ball([0.008, 0.008, 0.008], [0.01, noteY + 0.085, noteZ + 0.004], iron, 6);
    }
    // More books waiting at the foot when the room is crowded.
    const pile = Math.floor(mood.density * 3.2);
    let py = 0;
    for (let i = 0; i < pile; i++) {
      const w = 0.2 + random() * 0.08, t = 0.04 + random() * 0.04;
      const volume = s.box([w, t, w * 1.35], [-0.42, py + t / 2, -0.12], s.material(['#5a2a20', '#2f4638', '#4a3a26', '#2a3552'][Math.floor(random() * 4)]));
      volume.rotation.y = (random() - 0.5) * 0.5;
      s.box([w - 0.02, t - 0.016, w * 1.35 - 0.01], [-0.42 + 0.012, py + t / 2, -0.12], vellum).rotation.y = volume.rotation.y;
      py += t;
    }

    const flicker = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (flame) flame.scale.set(0.01, 0.026 * (1 + Math.sin(time * 9 * flicker) * 0.12 + Math.sin(time * 23) * 0.05), 0.01);
      },
    });
  },
});

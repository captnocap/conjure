import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, paintIsMetal } from '@conjure/kit';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** A square-section bar from a to b, its depth axis along `out`, as a geometry ready to merge. */
const barGeometry = (a: V, b: V, width: number, depth: number, out: V) => {
  const dir = b.clone().sub(a);
  const length = dir.length();
  const y = dir.normalize();
  const z = out.clone().sub(y.clone().multiplyScalar(out.dot(y))).normalize();
  const x = y.clone().cross(z).normalize();
  const g = new THREE.BoxGeometry(width, length + width * 0.6, depth);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(a.clone().add(b).multiplyScalar(0.5)));
  return g;
};

/** Triangles with flat normals; each triangle is turned to face `out`. */
class Mesher {
  pos: number[] = [];
  uv: number[] = [];
  tri(a: V, b: V, c: V, out: V, ua: number[], ub: number[], uc: number[]) {
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.dot(out) < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; }
    for (const p of [a, b, c]) this.pos.push(p.x, p.y, p.z);
    this.uv.push(...ua, ...ub, ...uc);
  }
  quad(a: V, b: V, c: V, d: V, out: V, uvs: number[][]) {
    this.tri(a, b, c, out, uvs[0], uvs[1], uvs[2]);
    this.tri(a, c, d, out, uvs[0], uvs[2], uvs[3]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    return g;
  }
}

export default defineThing({
  questions: {
    glass: paint('What colour is the glass curtain wall?', ['navy', 'charcoal', 'teal', 'sky', 'silver', 'indigo', 'gold', 'black', 'magenta']),
    bracing: paint('What colour is the X-bracing trim on the facade?', ['white', 'silver', 'cream', 'gold', 'red', 'charcoal', 'pink']),
    outline: choice('Are lines of light traced along the bracing?', {
      none: 'No lit lines: the white diamonds stand out on their own against the glass.',
      diamonds: 'Every diamond and edge traced in bright tube light, the tower drawn as a glowing wireframe.',
      edges: 'Only the corners and the slanted roof edges traced in light, a thin lit outline.',
    }),
    tube: paint('If the bracing is traced in light, what colour is the light?', ['white', 'turquoise', 'magenta', 'amber', 'red', 'lime', 'sky', 'lavender', 'gold']),
    masts: choice('What are the twin masts at the top doing?', {
      dark: 'Dark steel needles against the sky.',
      beacons: 'Red aviation beacons blinking at their tips and midpoints.',
      lit: 'Lit white from base to tip, two glowing needles.',
    }),
    crown: choice('What is the slanted glass summit doing?', {
      dark: 'Dark glass like the rest of the tower.',
      lantern: 'Glowing from within like a lantern on top of the city.',
      blade: 'Catching the light as a hard white blade of reflection.',
    }),
    signal: choice('Is a typhoon signal hoisted on the masts?', {
      none: 'No signal: an ordinary day.',
      t1: 'Standby signal No. 1: a black T. A storm somewhere out at sea.',
      t3: 'Strong wind signal No. 3: an upside-down black T.',
      t8: 'Gale signal No. 8: a black triangle. Offices empty, everyone sent home.',
      t10: 'Hurricane signal No. 10: a black cross. The worst of it, direct hit.',
    }),
    stage: choice('When is the photograph from?', {
      complete: 'The finished tower, as it has stood since 1990.',
      topping: '1988, topping out: the glass stops short of the top, the upper tiers are bare steel frame with a tower crane on the summit.',
      early: '1987: only the lower shafts are clad, the frame climbs a little above them, a crane on the stump.',
    }),
    cradle: noul('Is a window-cleaning cradle hanging on its cables halfway down one face?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 52, hf = L / 2, t = 52;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));

    // Glass: a pale mullion grid tinted by the glass colour, lit offices as an emissive map.
    const tileW = 26, tileH = 32;
    const grime = mood.wear;
    const gridMap = canvasTexture(208, 256, (c) => {
      c.fillStyle = '#e8edf2'; c.fillRect(0, 0, 208, 256);
      for (let row = 0; row < 8; row++) for (let col = 0; col < 13; col++) {
        const shade = 200 + Math.floor(random() * 50);
        c.fillStyle = `rgb(${shade - 10},${shade},${Math.min(255, shade + 12)})`;
        c.fillRect(col * 16 + 1, row * 32 + 4, 14, 26);
      }
      c.fillStyle = 'rgba(30,36,44,0.75)';
      for (let row = 0; row < 8; row++) c.fillRect(0, row * 32, 208, 4);
      for (let i = 0; i < Math.round(grime * 40); i++) { c.fillStyle = `rgba(70,60,50,${0.1 + random() * 0.2})`; c.fillRect(random() * 208, random() * 256, 2 + random() * 3, 20 + random() * 60); }
    });
    const lit = 0.22 + mood.density * 0.45;
    const litMap = canvasTexture(208, 256, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 208, 256);
      for (let row = 0; row < 8; row++) {
        let run = random() < lit;
        for (let col = 0; col < 13; col++) {
          if (random() < 0.3) run = random() < lit;
          if (!run) continue;
          c.fillStyle = random() < 0.8 ? '#ffe2a6' : '#d8ecff';
          c.fillRect(col * 16 + 3, row * 32 + 9, 10, 17);
        }
      }
    });
    gridMap.repeat.set(1 / tileW, 1 / tileH);
    litMap.repeat.set(1 / tileW, 1 / tileH);
    const glassHex = paintHex(a.glass);
    const glass = s.material(glassHex, {
      map: gridMap, emissive: '#ffd9a0', emissiveMap: litMap, emissiveIntensity: mix(0, 1.5, night),
      metalness: paintIsMetal(a.glass) ? 0.8 : 0.55, roughness: 0.22 + grime * 0.25,
    });
    const crownGlass = s.material(glassHex, {
      metalness: 0.6, roughness: 0.18,
      emissive: a.crown === 'lantern' ? '#fff1cf' : a.crown === 'blade' ? '#ffffff' : '#000000',
      emissiveIntensity: a.crown === 'lantern' ? mix(0.7, 1.6, night) : a.crown === 'blade' ? mix(0.9, 0.4, night) : 0,
    });
    const braceHex = paintHex(a.bracing);
    const brace = s.material(braceHex, { metalness: paintIsMetal(a.bracing) ? 0.8 : 0.1, roughness: 0.45 });
    const steel = s.material('#7a4a35', { metalness: 0.3, roughness: 0.7 });
    const concrete = s.material('#a9a69d', { roughness: 0.9 });
    const granite = s.material('#8e8a84', { roughness: 0.85 });
    const dark = s.material('#2a2d31', { metalness: 0.5, roughness: 0.5 });

    // Four triangular shafts: front lowest, stepping up clockwise to the tallest at the back.
    const tiers = { complete: [2, 3, 4, 5], topping: [2, 3, 4, 5], early: [2, 3, 3, 3] }[a.stage];
    const roofs = { complete: [true, true, true, true], topping: [true, true, true, true], early: [true, false, false, false] }[a.stage];
    const glassCap = { complete: 99, topping: 3, early: 2 }[a.stage] * t;
    const facings = [0, Math.PI / 2, -Math.PI / 2, Math.PI];
    const glassMesh = new Mesher(), crownMesh = new Mesher(), roofMesh = new Mesher();
    const clad: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = [], tubes: THREE.BufferGeometry[] = [], slabs: THREE.BufferGeometry[] = [];
    const bw = 3.2, bd = 1.6;
    const bar = (p: V, q: V, out: V, edge = false) => {
      const g = barGeometry(p, q, bw, bd, out);
      ((Math.min(p.y, q.y) + Math.max(p.y, q.y)) / 2 > glassCap ? frame : clad).push(g);
      if (a.outline === 'diamonds' || (a.outline === 'edges' && edge)) tubes.push(barGeometry(p.clone().addScaledVector(out, bd * 0.55), q.clone().addScaledVector(out, bd * 0.55), 0.9, 0.5, out));
    };
    let apexTop = 0;
    facings.forEach((angle, q) => {
      const k = tiers[q], sloped = roofs[q];
      const outer = k * t, apex = sloped ? outer + t : outer;
      const rot = new THREE.Matrix4().makeRotationY(angle);
      const P = (x: number, y: number, z: number) => v(x, y, z).applyMatrix4(rot);
      const O = (x: number, y: number, z: number) => v(x, y, z).transformDirection(rot);
      const roofAt = (z: number) => (sloped ? apex - t * (z / hf) : outer);
      const cap = (y: number) => Math.min(y, glassCap);
      // Glass walls, capped where the cladding stops.
      const outN = O(0, 0, 1), leftN = O(-1, 0, -1), rightN = O(1, 0, -1);
      const gOuter = cap(outer), gApex = cap(apex);
      glassMesh.quad(P(-hf, 0, hf), P(hf, 0, hf), P(hf, gOuter, hf), P(-hf, gOuter, hf), outN, [[0, 0], [L, 0], [L, gOuter], [0, gOuter]]);
      const diag = L / Math.SQRT2;
      for (const [side, n] of [[-1, leftN], [1, rightN]] as const) {
        const cY = glassCap < outer ? gOuter : gApex;
        glassMesh.quad(P(0, 0, 0), P(side * hf, 0, hf), P(side * hf, gOuter, hf), P(0, cY, 0), n, [[0, 0], [diag, 0], [diag, gOuter], [0, cY]]);
      }
      const roof = glassCap < outer ? glassMesh : q === 3 ? crownMesh : roofMesh;
      const rC = glassCap < outer ? gOuter : gApex;
      roof.tri(P(0, rC, 0), P(-hf, gOuter, hf), P(hf, gOuter, hf), v(0, 1, 0), [0, 0], [1, 0], [1, 1]);
      if (q === 3) apexTop = apex;
      // Bracing: corner posts, a belt at every tier and an X in every tier, on all three faces.
      const faces: [number, number, number, number, V][] = [[-hf, hf, hf, hf, outN], [0, 0, -hf, hf, leftN], [0, 0, hf, hf, rightN]];
      for (const [x0, z0, x1, z1, n] of faces) {
        const yTop0 = x0 === 0 && z0 === 0 ? apex : outer;
        bar(P(x0, 0, z0), P(x0, yTop0, z0), n, true);
        bar(P(x1, 0, z1), P(x1, outer, z1), n, true);
        for (let j = 0; j < k; j++) {
          const y0 = j * t, y1 = y0 + t;
          bar(P(x0, y0, z0), P(x1, y1, z1), n);
          bar(P(x1, y0, z1), P(x0, y1, z0), n);
          bar(P(x0, y1, z0), P(x1, y1, z1), n, y1 === outer);
        }
        if (sloped && x0 === 0) bar(P(0, apex, 0), P(x1, outer, z1), n, true);
      }
      // Bare frame floors where the glass has not reached yet.
      for (let y = glassCap + 8; y < outer; y += 8) {
        const slab = new Mesher();
        slab.tri(P(0, y, 0), P(-hf, y, hf), P(hf, y, hf), v(0, 1, 0), [0, 0], [1, 0], [1, 1]);
        slab.tri(P(0, y - 0.8, 0), P(-hf, y - 0.8, hf), P(hf, y - 0.8, hf), v(0, -1, 0), [0, 0], [1, 0], [1, 1]);
        slabs.push(slab.geometry());
      }
      void roofAt;
    });
    s.mesh(glassMesh.geometry(), glass);
    if (crownMesh.pos.length) s.mesh(crownMesh.geometry(), crownGlass);
    if (roofMesh.pos.length) s.mesh(roofMesh.geometry(), s.material(new THREE.Color(glassHex).lerp(new THREE.Color('#dfe8ee'), 0.35), { metalness: 0.7, roughness: 0.15 }));
    s.mesh(mergeGeometries(clad.map((g) => g.toNonIndexed())), brace);
    if (frame.length) s.mesh(mergeGeometries(frame.map((g) => g.toNonIndexed())), steel);
    if (slabs.length) s.mesh(mergeGeometries(slabs), concrete);
    const tubeHex = paintHex(a.tube);
    const tubeMat = new THREE.MeshStandardMaterial({ color: tubeHex, emissive: tubeHex, emissiveIntensity: mix(0.8, 2.4, night), roughness: 0.4 });
    let tubeMesh: THREE.Mesh | null = null;
    if (tubes.length) { tubeMesh = s.mesh(mergeGeometries(tubes.map((g) => g.toNonIndexed())), tubeMat); tubeMesh.castShadow = false; }

    // The granite podium the shafts rise from, with a band of dark doors.
    s.box([L + 18, 14, L + 18], [0, 7, 0], granite);
    s.box([L + 19, 1.6, L + 19], [0, 14.6, 0], s.material('#a39e96'));
    s.box([L * 0.6, 6, 0.6], [0, 3, hf + 9.1], dark);
    for (let i = 0; i < 9; i++) s.box([0.8, 13, 1.2], [-hf - 8 + i * ((L + 16) / 8), 6.5, hf + 9.2], s.material('#7f7b75'));

    // Masts or a crane at the summit.
    const update: ((time: number) => void)[] = [];
    const sumZ = -3;
    const sumY = apexTop - t * (3 / hf);
    if (a.stage === 'complete') {
      const mastLit = a.masts === 'lit';
      const mast = mastLit ? new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f6ff', emissiveIntensity: mix(0.8, 2, night) }) : s.material('#9ea3a8', { metalness: 0.7, roughness: 0.35 });
      for (const x of [-4.5, 4.5]) {
        s.cylinder(0.35, 1.3, 52, [x, sumY + 26, sumZ], mast, 10);
        s.cylinder(1.8, 1.8, 3, [x, sumY + 1.5, sumZ], dark, 10);
        if (a.masts === 'beacons') {
          for (const h of [52, 30]) {
            const red = new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff1a0a', emissiveIntensity: 2.4 });
            s.ball([1.6, 1.6, 1.6], [x, sumY + h, sumZ], red, 10).castShadow = false;
            const phase = random() * 6;
            update.push((time) => { red.emissiveIntensity = Math.sin(time * mix(1.5, 5, mood.energy) + phase) > 0 ? 2.6 : 0.2; });
          }
        }
      }
      if (a.signal !== 'none') {
        // A signal hoisted on a yard between the masts.
        const black = s.material('#141414', { roughness: 0.8, side: THREE.DoubleSide });
        const y = sumY + 38;
        s.box([12, 0.6, 0.6], [0, y + 6, sumZ], dark);
        const shape = new THREE.Shape();
        if (a.signal === 't8') { shape.moveTo(-4.5, -4.5); shape.lineTo(4.5, -4.5); shape.lineTo(0, 4.5); shape.closePath(); }
        else {
          const T = (pts: number[][]) => { shape.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) shape.lineTo(p[0], p[1]); shape.closePath(); };
          if (a.signal === 't1') T([[-4.5, 4.5], [4.5, 4.5], [4.5, 2.6], [1, 2.6], [1, -4.5], [-1, -4.5], [-1, 2.6], [-4.5, 2.6]]);
          else if (a.signal === 't3') T([[-4.5, -4.5], [4.5, -4.5], [4.5, -2.6], [1, -2.6], [1, 4.5], [-1, 4.5], [-1, -2.6], [-4.5, -2.6]]);
          else T([[-1, 4.5], [1, 4.5], [1, 1], [4.5, 1], [4.5, -1], [1, -1], [1, -4.5], [-1, -4.5], [-1, -1], [-4.5, -1], [-4.5, 1], [-1, 1]]);
        }
        const flag = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }), black, [0, y, sumZ + 1]);
        if (a.signal === 't10') flag.rotation.z = Math.PI / 4;
        s.rod([0, y + 6, sumZ + 1.3], [0, y + 4.5, sumZ + 1.3], 0.15, dark);
      }
    } else {
      // Tower crane on the stump.
      const yellow = s.material('#e0a81c', { roughness: 0.6 });
      const top = Math.max(...tiers.map((k, i) => (roofs[i] ? (k + 1) * t : k * t)));
      const base = a.stage === 'early' ? 3 * t : apexTop - 12;
      const cx = a.stage === 'early' ? 0 : 0, cz = a.stage === 'early' ? -10 : -6;
      const mastH = top - base + 30;
      for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) s.box([0.5, mastH, 0.5], [cx + dx, base + mastH / 2, cz + dz], yellow);
      for (let y = base; y < base + mastH; y += 4) s.box([3.4, 0.4, 3.4], [cx, y, cz], yellow);
      const jib = new THREE.Group();
      jib.position.set(cx, base + mastH, cz);
      const jy = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 2), yellow); jy.position.x = 18; jy.castShadow = true; jib.add(jy);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), concrete); counter.position.set(-10, -1, 0); jib.add(counter);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), s.material('#e8e4da')); cab.position.set(2, -2.5, 0); jib.add(cab);
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 24, 6), dark); hook.position.set(36, -12, 0); jib.add(hook);
      jib.rotation.y = 0.6 + random() * 1.4;
      s.root.add(jib);
      update.push((time) => { jib.rotation.y += Math.sin(time * 0.2) * 0.0005 * mood.energy; });
    }

    // A cleaning cradle on the front-right face, hanging on two cables.
    if (a.cradle) {
      const y = mix(70, 140, random());
      const x = 4 + random() * 8;
      const z = hf + 2.2;
      s.box([12, 2.2, 1.8], [x, y, z], s.material('#d8d6cf', { metalness: 0.4 }));
      s.box([12.2, 0.3, 2], [x, y - 1.2, z], dark);
      for (const dx of [-5, 5]) s.rod([x + dx, y + 1.1, z], [x + dx, 2 * t, z], 0.12, dark);
    }

    const tubeBase = tubeMat.emissiveIntensity;
    return s.finish({
      footprint: (L + 18) / 2,
      update: (_dt, time) => {
        for (const fn of update) fn(time);
        if (tubeMesh && mood.wear > 0.6) tubeMat.emissiveIntensity = tubeBase * (Math.sin(time * 13) > 0.6 ? 0.3 : 1);
      },
    });
  },
});

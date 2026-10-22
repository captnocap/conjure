import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Pt, ell, horn, human, painted, shell, type ShellSpec } from './face';

const PAIRS = {
  'silver-black': ['#c9ccd3', '#17171b', 'Silver with black trim.'],
  'blue-silver': ['#1d49c4', '#cfd3da', 'Royal blue with silver trim.'],
  'red-gold': ['#c81d25', '#e3b23c', 'Blood red with gold trim.'],
  'green-white': ['#128a4a', '#f2efe6', 'Emerald green with white trim.'],
  'black-red': ['#19181c', '#d8232f', 'Black with red trim, a rudo\'s colours.'],
  'purple-yellow': ['#6a2aa6', '#f4d23a', 'Purple with canary yellow trim.'],
  'pink-teal': ['#e8479a', '#18b3a7', 'Hot pink with teal trim, an exotico\'s flash.'],
} as const;
type Pair = keyof typeof PAIRS;

export default defineThing({
  questions: {
    design: choice('What is the design on the mask?', {
      saint: 'El Santo style: plain shining silver with clean outlined eyes, nose and mouth.',
      demon: 'Blue Demon style: one solid colour with a bold contrasting band around the eyes that runs down the nose to circle the mouth.',
      flames: 'Applique flames licking up from the jaw and flaring off the eyes.',
      eagle: 'Eagle: spread feathered wings sweeping over the eyes to the temples and a golden beak down the nose.',
      skull: 'Skull: bone-white face with black sockets, nose hollow and rows of teeth across the jaw.',
      jaguar: 'Jaguar: rosette spots, a pink nose, whisker dots and two small ears on top.',
    }),
    colours: choice('What colour pair is the lycra?', Object.fromEntries(Object.entries(PAIRS).map(([k, v]) => [k, v[2]])) as Record<Pair, string>),
    holes: choice('How are the eye and mouth holes cut?', {
      classic: 'Almond eyes and an open oval mouth.',
      teardrop: 'Big teardrop eyes and a small round mouth.',
      fierce: 'Slanted angry slits and a wide snarling mouth.',
      sealed: 'Round eyes and no mouth opening at all, only a stitched outline.',
    }),
    lacing: choice('How is the back?', {
      laced: 'Laced up tight with a bow at the nape.',
      unlaced: 'Unlaced, the long laces hanging loose down to the table.',
    }),
    state: choice('What state is it in?', {
      fresh: 'Ring-fresh, never worn in a match.',
      signed: 'Signed across the forehead in marker, a fan\'s trophy.',
      torn: 'Torn open across the face after losing a mask-versus-mask match.',
    }),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      cape: 'A satin cape with a sequinned edge, dropped in a heap.',
      belt: 'A championship belt with a big gold plate.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [mainColour, trimColour] = PAIRS[a.colours as Pair];
    const base = a.design === 'saint' ? '#cdd0d6' : a.design === 'skull' ? '#18171a' : mainColour;
    const trim = a.design === 'skull' ? '#efe9da' : a.design === 'saint' ? (a.colours === 'silver-black' ? '#17171b' : mainColour) : trimColour;
    const shiny = a.design === 'saint' ? 0.55 : 0.12;
    const tearSide = random() < 0.5 ? -1 : 1;

    const eyes = (au: number, v: number, grow = 1): boolean => {
      if (a.holes === 'classic') return ell(au, v, 0.4, 0.17, 0.17 * grow, 0.075 * grow, 0.2) < 1;
      if (a.holes === 'teardrop') return ell(au, v, 0.36, 0.15, 0.15 * grow, 0.075 * grow) < 1 || ell(au, v, 0.5, 0.2, 0.11 * grow, 0.1 * grow) < 1;
      if (a.holes === 'fierce') return ell(au, v, 0.41, 0.18, 0.2 * grow, 0.045 * grow + (grow - 1) * 0.03, 0.38) < 1;
      return ell(au, v, 0.4, 0.17, 0.12 * grow, 0.09 * grow) < 1;
    };
    const mouth = (u: number, v: number, grow = 1): boolean => {
      if (a.holes === 'classic') return ell(u, v, 0, -0.5, 0.24 * grow, 0.07 * grow) < 1;
      if (a.holes === 'teardrop') return ell(u, v, 0, -0.5, 0.13 * grow, 0.07 * grow) < 1;
      if (a.holes === 'fierce') { const m = u / (0.36 * grow); return Math.abs(m) < 1 && v < -0.43 + (grow - 1) * 0.1 - 0.1 * m * m && v > -0.6 - (grow - 1) * 0.1 + 0.07 * m * m; }
      return grow > 1 && ell(u, v, 0, -0.5, 0.2 * grow, 0.05 * grow) < 1;
    };
    const rip = (u: number, v: number) => a.state === 'torn' && Math.abs(tearSide * u * 0.75 - v * 0.62 - 0.14) < (0.085 + 0.035 * Math.sin(v * 27) + 0.02 * Math.sin(u * 41)) * Math.min(1, (0.95 - Math.abs(v)) * 4) && tearSide * u > -0.25;

    const relief = human({ nose: 0.9, brow: 0.6, cheek: 0.7, lips: 0.5, chin: 0.8, socket: 0.6 });
    const spec: ShellSpec = {
      w: 0.178, h: 0.234, d: 0.102, taper: 0.14, crown: 0, round: 2, segU: 96, segV: 120,
      relief: (u, v) => relief(u, v) * 0.5,
      hole: (u, v) => eyes(Math.abs(u), v) || mouth(u, v) || rip(u, v),
    };

    const texture = painted(768, 1024, (ctx, X, Y, W, H) => {
      const N = 150;
      // Fill any region given as a predicate, sampled on a grid: outlines stay true to the cut holes.
      const region = (test: (u: number, v: number) => boolean, colour: string) => {
        ctx.fillStyle = colour;
        for (let j = 0; j < N * 1.3; j++) for (let i = 0; i < N; i++) {
          const u = (i + 0.5) / N * 2 - 1, v = (j + 0.5) / (N * 1.3) * 2 - 1;
          if (test(u, v)) ctx.fillRect(X(u) - W / N / 2 - 0.5, Y(v) - H / (N * 1.3) / 2 - 0.5, W / N + 1, H / (N * 1.3) + 1);
        }
      };
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      const gold = '#e2b23a';
      if (a.design === 'demon') {
        region((u, v) => eyes(Math.abs(u), v, 1.75) || (Math.abs(u) < 0.13 + 0.05 * Math.max(0, -v) && v < 0.3 && v > -0.4) || ell(u, v, 0, -0.5, 0.42, 0.2) < 1, trim);
        region((u, v) => Math.abs(u) < 0.05 && v > 0.36 && v < 0.9, trim);
      } else if (a.design === 'flames') {
        for (const [colour, scale] of [[trim, 1], ['#ffe27a', 0.55]] as const) {
          ctx.fillStyle = colour;
          for (let k = -4; k <= 4; k++) {
            const u = k * 0.22 + (random() - 0.5) * 0.05, top = (-0.28 + 0.12 * Math.cos(k * 1.9) + Math.abs(k) * 0.1) * scale - (1 - scale) * 0.8;
            ctx.beginPath(); ctx.moveTo(X(u - 0.14 * scale), Y(-1));
            ctx.bezierCurveTo(X(u - 0.2 * scale), Y(-0.6), X(u + 0.02), Y(top - 0.3), X(u - 0.05), Y(top));
            ctx.bezierCurveTo(X(u + 0.14 * scale), Y(top - 0.25), X(u + 0.2 * scale), Y(-0.7), X(u + 0.14 * scale), Y(-1)); ctx.fill();
          }
          for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
            ctx.beginPath(); ctx.moveTo(X(side * 0.5), Y(0.22));
            ctx.quadraticCurveTo(X(side * (0.7 + k * 0.08)), Y(0.3 + k * 0.1), X(side * (0.6 + k * 0.14 * scale)), Y(0.42 + k * 0.17 * scale));
            ctx.quadraticCurveTo(X(side * (0.5 + k * 0.08)), Y(0.36 + k * 0.06), X(side * 0.36), Y(0.27)); ctx.fill();
          }
        }
      } else if (a.design === 'eagle') {
        for (const side of [-1, 1]) for (let f = 0; f < 7; f++) {
          ctx.fillStyle = f % 2 ? trim : '#f4f1e8';
          const ang = 0.15 + f * 0.2;
          ctx.beginPath(); ctx.moveTo(X(side * 0.08), Y(0.3));
          ctx.quadraticCurveTo(X(side * (0.3 + Math.cos(ang) * 0.3)), Y(0.36 + Math.sin(ang) * 0.34), X(side * (0.12 + Math.cos(ang) * 0.86)), Y(0.26 + Math.sin(ang) * 0.66));
          ctx.quadraticCurveTo(X(side * (0.2 + Math.cos(ang - 0.2) * 0.4)), Y(0.26 + Math.sin(ang - 0.2) * 0.3), X(side * 0.08), Y(0.22)); ctx.fill();
        }
        ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(X(-0.15), Y(0.3)); ctx.lineTo(X(0.15), Y(0.3)); ctx.quadraticCurveTo(X(0.12), Y(-0.1), X(0), Y(-0.3)); ctx.quadraticCurveTo(X(-0.12), Y(-0.1), X(-0.15), Y(0.3)); ctx.fill();
        region((u, v) => eyes(Math.abs(u), v, 1.35), '#17171b');
      } else if (a.design === 'skull') {
        region((u, v) => ell(u, v, 0, 0.18, 0.86, 0.72) < 1 || (Math.abs(u) < 0.56 && v < 0 && v > -0.86), trim);
        region((u, v) => eyes(Math.abs(u), v, 1.9), '#0f0e10');
        ctx.fillStyle = '#0f0e10'; ctx.beginPath(); ctx.moveTo(X(0), Y(-0.04)); ctx.lineTo(X(0.1), Y(-0.26)); ctx.lineTo(X(-0.1), Y(-0.26)); ctx.fill();
        ctx.strokeStyle = '#0f0e10'; ctx.lineWidth = 7;
        for (let k = -5; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(X(k * 0.1), Y(-0.36)); ctx.lineTo(X(k * 0.1), Y(-0.66)); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(X(-0.56), Y(-0.51)); ctx.lineTo(X(0.56), Y(-0.51)); ctx.stroke();
      } else if (a.design === 'jaguar') {
        const spot = new THREE.Color(base).getHSL({ h: 0, s: 0, l: 0 }).l < 0.3 ? trim : '#17120e';
        for (let i = 0; i < 60; i++) {
          const x = random() * W, y = random() * H, r = 22 + random() * 20;
          ctx.strokeStyle = spot; ctx.lineWidth = 12; ctx.setLineDash([r * 0.9, r * 0.5]);
          ctx.beginPath(); ctx.arc(x, y, r, random() * 6, random() * 6 + 5.4); ctx.stroke();
          ctx.fillStyle = spot === trim ? '#3a3238' : trim; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.setLineDash([]);
        region((u, v) => ell(u, v, 0, -0.42, 0.44, 0.24) < 1, '#f1e7d2');
        ctx.fillStyle = '#e58b9a'; ctx.beginPath(); ctx.moveTo(X(-0.13), Y(-0.1)); ctx.lineTo(X(0.13), Y(-0.1)); ctx.lineTo(X(0), Y(-0.25)); ctx.fill();
        ctx.fillStyle = '#17120e'; for (const side of [-1, 1]) for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(X(side * (0.16 + (k % 3) * 0.09)), Y(-0.34 - Math.floor(k / 3) * 0.07), 5, 0, Math.PI * 2); ctx.fill(); }
        region((u, v) => eyes(Math.abs(u), v, 1.4), '#17120e');
      }
      // Stitched leatherette trim around every opening.
      const outline = a.design === 'skull' ? '#0f0e10' : a.design === 'demon' ? base : trim;
      region((u, v) => (eyes(Math.abs(u), v, 1.28) && !eyes(Math.abs(u), v, 1.02)) || (mouth(u, v, 1.3) && !mouth(u, v, 1.02)), outline);
      if (a.design === 'saint' || a.design === 'demon') region((u, v) => Math.abs(Math.abs(u) - 0.1 - 0.06 * Math.max(0, -v)) < 0.016 && v < 0.12 && v > -0.24, outline);
      if (a.state === 'torn') { ctx.strokeStyle = 'rgba(10,8,8,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 40; i++) { const v = random() * 1.6 - 0.8, u = tearSide * (v * 0.62 + 0.14 + (random() < 0.5 ? 0.11 : -0.11)) / 0.75; ctx.beginPath(); ctx.moveTo(X(u), Y(v)); ctx.lineTo(X(u + (random() - 0.5) * 0.12), Y(v + (random() - 0.5) * 0.06)); ctx.stroke(); } }
      if (a.state === 'signed') {
        const dark = new THREE.Color(base).getHSL({ h: 0, s: 0, l: 0 }).l < 0.45;
        ctx.strokeStyle = dark ? '#e9eaee' : '#111114'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); let x = X(-0.5), y = Y(0.66); ctx.moveTo(x, y);
        for (let k = 0; k < 16; k++) { x += W * 0.033; y = Y(0.66) + Math.sin(k * 1.7 + random() * 2) * H * (0.02 + random() * 0.035); ctx.quadraticCurveTo(x - W * 0.03, y - H * 0.05 * (random() - 0.3), x, y); }
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(-0.45), Y(0.52)); ctx.quadraticCurveTo(X(0), Y(0.46), X(0.5), Y(0.56)); ctx.stroke();
      }
      for (let i = 0; i < mood.wear * 300; i++) { ctx.fillStyle = `rgba(60,50,40,${random() * 0.25})`; ctx.fillRect(random() * W, random() * H, 3 + random() * 14, 2 + random() * 5); }
    });

    const head = new THREE.Group();
    const add = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
    const foam = new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.95 });
    const lycra = s.material(base, { roughness: 0.42, metalness: shiny, side: THREE.DoubleSide });
    const trimSkin = s.material(trim, { roughness: 0.4, metalness: 0.2 });
    const headY = 0.262, rx = 0.086, ry = 0.114, rz = 0.098;
    add(new THREE.Mesh(new THREE.LatheGeometry([[0.085, 0], [0.085, 0.012], [0.052, 0.04], [0.042, 0.09], [0.048, 0.17]].map(([x, y]) => new THREE.Vector2(x, y)), 28), foam));
    const skull = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), foam));
    skull.scale.set(rx - 0.004, ry - 0.004, rz - 0.006); skull.position.y = headY;
    const back = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI - 0.12, Math.PI + 0.24), lycra));
    back.scale.set(rx, ry, rz); back.position.y = headY;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.047, 0.05, 24, 1, true), lycra)).position.y = 0.15;
    const face = shell(spec, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: shiny, side: THREE.DoubleSide }));
    face.position.set(0, headY, -0.012);
    head.add(face);

    if (a.design === 'jaguar')
      for (const side of [-1, 1]) { const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.045, 12), lycra)); ear.position.set(side * 0.052, headY + 0.108, 0.01); ear.rotation.z = -side * 0.35; ear.scale.z = 0.5; const inner = add(new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 10), trimSkin)); inner.position.set(side * 0.052, headY + 0.106, 0.017); inner.rotation.z = -side * 0.35; inner.scale.z = 0.4; }
    if (a.state === 'torn') {
      const u = tearSide * 0.55;
      head.add(horn([[u * 0.09, headY - 0.03, 0.085], [u * 0.12, headY - 0.07, 0.1], [u * 0.14, headY - 0.12 - random() * 0.03, 0.085]], (t) => 0.016 * (1 - t * 0.6), lycra, { sides: 6, steps: 10, squash: 0.12, side: [1, 0, 0] }));
    }

    // Lacing down the back of the skull.
    const lace = s.material(a.design === 'saint' ? '#f3f1ea' : trim, { roughness: 0.6 });
    const backPoint = (off: number, dy: number, lift = 0.003): Pt => { const k = Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)); return [(rx + lift) * k * Math.sin(off), headY + dy, -(rz + lift) * k * Math.cos(off)]; };
    const rows = 7, gap = a.lacing === 'laced' ? 0.13 : 0.34;
    for (let r = 0; r < rows; r++) {
      const dy = 0.07 - r * 0.026;
      for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), s.material('#d9dbe0', { metalness: 0.8, roughness: 0.3 }))).position.set(...backPoint(side * gap, dy));
      if (a.lacing === 'laced' && r < rows - 1) for (const side of [-1, 1]) {
        const p = backPoint(side * gap, dy), q = backPoint(-side * gap, dy - 0.026);
        const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 5), lace));
        const A = new THREE.Vector3(...p), B = new THREE.Vector3(...q);
        rod.position.copy(A).add(B).multiplyScalar(0.5); rod.scale.y = A.distanceTo(B); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
      }
    }
    if (a.lacing === 'unlaced') add(new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.17), foam)).position.set(0, headY - 0.01, -rz - 0.001);
    for (const side of [-1, 1]) {
      const from = backPoint(side * gap, a.lacing === 'laced' ? -0.086 : 0.07);
      const reach = a.lacing === 'laced' ? 0.07 : 0.12 + random() * 0.08;
      const path: Pt[] = a.lacing === 'laced'
        ? [from, [from[0] + side * 0.03, from[1] - 0.012, from[2] - 0.014], [from[0] + side * 0.05, from[1] - 0.05, from[2] - 0.012], [from[0] + side * 0.04, from[1] - 0.1, from[2] - 0.004]]
        : [from, [from[0] + side * 0.012, from[1] - 0.09, from[2] - 0.012], [from[0] + side * 0.03, 0.05, from[2] + 0.0], [from[0] + side * reach * 0.6, 0.005, from[2] + 0.05], [from[0] + side * reach, 0.004, from[2] + 0.1 + random() * 0.08]];
      head.add(horn(path, () => 0.0024, lace, { sides: 5, steps: 24 }));
    }
    head.rotation.y = (random() < 0.5 ? -1 : 1) * (0.18 + random() * 0.2);
    s.root.add(head);

    if (a.beside === 'cape') {
      const satin = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide });
      const geometry = new THREE.PlaneGeometry(0.36, 0.3, 30, 24);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      const phase = random() * 6;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, 0.022 + 0.018 * Math.sin(x * 38 + phase + z * 9) + 0.012 * Math.sin(z * 31 + phase * 2) ); pos.setX(i, x * (0.8 + 0.2 * Math.cos(z * 9))); }
      geometry.computeVertexNormals();
      const cape = s.mesh(geometry, satin, [0.27, 0, 0.06]);
      cape.rotation.y = 0.3 + random() * 0.5;
      const sequin = s.material(a.design === 'saint' ? '#d9dbe0' : mainColour, { metalness: 0.7, roughness: 0.25 });
      const edge = s.tube([[0.13, 0.03, 0.2], [0.22, 0.045, 0.23], [0.32, 0.03, 0.2], [0.41, 0.04, 0.14]], 0.007, sequin);
      edge.rotation.y = 0.1;
    } else if (a.beside === 'belt') {
      const leather = s.material(mood.cheer > 0.45 ? '#16151a' : '#4b1717', { roughness: 0.5, side: THREE.DoubleSide });
      const gold = s.material('#e0b23a', { metalness: 0.85, roughness: 0.25 });
      s.root.add(horn([[-0.2, 0.034, 0.1], [-0.14, 0.034, 0.19], [0, 0.034, 0.235], [0.14, 0.034, 0.19], [0.2, 0.034, 0.1], [0.17, 0.034, 0.02]], () => 0.0045, leather, { sides: 8, steps: 36, squash: 7, side: [0, 0, 1] }));
      const plate = s.cylinder(0.05, 0.05, 0.008, [0, 0.045, 0.243], gold, 28); plate.rotation.x = Math.PI / 2; plate.scale.y = 1; plate.scale.x = 1.25;
      s.ball([0.016, 0.016, 0.008], [0, 0.045, 0.25], s.material(mainColour === '#c9ccd3' ? '#c81d25' : mainColour, { roughness: 0.2, emissive: mainColour, emissiveIntensity: 0.2 }), 14);
      for (const side of [-1, 1]) { const small = s.cylinder(0.026, 0.026, 0.006, [side * 0.115, 0.036, 0.206], gold, 20); small.rotation.x = Math.PI / 2; small.rotation.z = -side * 0.55; }
      s.ring(0.06, 0.004, [0, 0.045, 0.247], gold).scale.x = 1.25;
    }
    void mix;
    return s.finish();
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { TAU, agarPad, dome, gloss, painted, wobble } from './plate';

type P2 = [number, number];
const STAINS = {
  violet: 'Crystal violet, a deep purple.',
  pink: 'Eosin pink.',
  blue: 'Methylene blue.',
  brown: 'Iodine brown, like weak tea.',
  red: 'Safranin red.',
  salt: 'No stain: a white crust of dried salt.',
} as const;
const STAIN_COLOUR: Record<keyof typeof STAINS, string> = { violet: '#5b2a9c', pink: '#e8588c', blue: '#2a5fc4', brown: '#9a5a1c', red: '#c7263a', salt: '#f4f4ee' };

export default defineThing({
  questions: {
    glass: choice('What has happened to the cover slip?', {
      intact: 'Nothing: it is whole and square.',
      cracked: 'Cracked clean across from corner to corner.',
      shattered: 'Crushed by the objective lens: cracks radiate from one point like a star.',
      chipped: 'One corner has snapped off and lies beside it.',
      doubled: 'Two slips have stuck together and slid askew.',
    }),
    mount: choice('What is it resting on?', {
      slide: 'A glass microscope slide with a frosted, hand-labelled end.',
      roof: 'A slide, but raised on four dabs of wax so it stands over the sample like a glass roof.',
      agar: 'Pressed straight onto the gel of a culture plate.',
    }),
    stain: choice('What colour is the stain beneath it?', STAINS),
    sample: choice('What is trapped under the glass?', {
      ring: 'Only a dried tide-mark ring where the drop evaporated.',
      cells: 'A sheet of brick-like cells, the classic onion skin.',
      smear: 'A streaky smear dragged across in one direction.',
      specks: 'Scattered round blobs, like cheek cells or pond life.',
      thread: 'A single tangled fibre or hair.',
    }),
    bubble: choice('Is there air trapped under it?', {
      none: 'No bubbles: lowered perfectly.',
      one: 'One large round bubble with a thick dark rim.',
      many: 'A scatter of small bubbles.',
    }),
    mishap: choice('What else went wrong, or right?', {
      nothing: 'Nothing else.',
      fingerprint: 'A greasy fingerprint on top of the glass.',
      oil: 'A golden bead of immersion oil left sitting on it.',
      sealed: 'Sealed all round with red nail varnish: someone wanted to keep this one.',
      leaked: 'Too much liquid: stain has flooded out from under one edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const SIDE = 22, HALF = SIDE / 2, THICK = 0.4;
    const stain = new THREE.Color(STAIN_COLOUR[a.stain]).lerp(new THREE.Color('#b9b3a0'), mood.wear * 0.3);
    const css = (colour: THREE.Color, alpha: number) => `rgba(${Math.round(colour.r * 255)},${Math.round(colour.g * 255)},${Math.round(colour.b * 255)},${alpha})`;
    const shown = stain.clone().convertLinearToSRGB();
    const bright = s.material('#f4fbfc', { roughness: 0.15, emissive: '#d5eef2', emissiveIntensity: 0.4 });
    const rim = s.material('#8db4ba', { roughness: 0.2 });
    const pane = new THREE.MeshPhysicalMaterial({ color: '#e6f6f8', transparent: true, opacity: 0.22, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });

    // What it rests on.
    let deck = 0;
    if (a.mount === 'agar') deck = agarPad(s, 21, random() < 0.5 ? 'pale' : 'amber');
    else {
      const L = 75, W = 25, T = 1.2;
      s.box([L, T, W], [-9, T / 2, 0], new THREE.MeshPhysicalMaterial({ color: '#cfe7ea', transparent: true, opacity: 0.5, roughness: 0.05 }));
      for (const z of [-W / 2, W / 2]) s.box([L, 0.22, 0.22], [-9, T, z], rim);
      for (const x of [-9 - L / 2, -9 + L / 2]) s.box([0.22, 0.22, W], [x, T, 0], rim);
      s.box([19, T + 0.06, W], [-9 - L / 2 + 9.5, T / 2 + 0.03, 0], s.material('#f1f1ec', { roughness: 1 }));
      const note = s.label(['onion x40', 'cheek', 'pond 12/5', '#3 again', 'mine', 'gram +'][Math.floor(random() * 6)], 16, 9, [-9 - L / 2 + 9.5, T + 0.1, 0], '#4a4d55', '#f1f1ec');
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.12;
      note.castShadow = false;
      for (let i = 0; i < mood.wear * 9; i++) { const x = -9 + (random() - 0.5) * L * 0.9, z = (random() - 0.5) * W * 0.8, angle = random() * Math.PI; s.rod([x, T + 0.03, z], [x + Math.cos(angle) * 5, T + 0.03, z + Math.sin(angle) * 5], 0.05, bright).castShadow = false; }
      deck = T;
    }
    const lift = a.mount === 'roof' ? 4.2 : 0.06;
    const turn = a.mount === 'agar' ? random() * 0.8 : (random() - 0.5) * 0.14;
    const slip = new THREE.Group();
    slip.position.set(a.mount === 'agar' ? 0 : 6, deck, 0);
    slip.rotation.y = turn;
    s.root.add(slip);
    const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = slip) => { parent.add(node); return node; };

    // The sample: painted on a clear sheet lying under the glass.
    const bubbles: { x: number; z: number; r: number }[] = [];
    if (a.bubble === 'one') bubbles.push({ x: (random() - 0.5) * 9, z: (random() - 0.5) * 9, r: 2.6 + random() * 1.6 });
    if (a.bubble === 'many') for (let i = 0; i < 5 + Math.floor(random() * 6); i++) bubbles.push({ x: (random() - 0.5) * 17, z: (random() - 0.5) * 17, r: 0.6 + random() * 1.3 });
    const sheet = painted(512, 512, (ctx, w, h) => {
      const px = (v: number) => (0.5 + v / (SIDE * 1.5)) * w, mm = (v: number) => (v / (SIDE * 1.5)) * w;
      const edge = wobble(random, 4, 2);
      const blob = (scale: number) => { ctx.beginPath(); for (let i = 0; i <= 72; i++) { const angle = (i / 72) * TAU, r = mm(8.2 * scale * (1 + 0.1 * edge(angle))); ctx.lineTo(w / 2 + Math.cos(angle) * r, h / 2 + Math.sin(angle) * r); } ctx.closePath(); };
      blob(1);
      ctx.fillStyle = css(shown, a.stain === 'salt' ? 0.4 : 0.52);
      ctx.fill();
      ctx.save();
      blob(1);
      ctx.clip();
      ctx.strokeStyle = ctx.fillStyle = css(shown, 0.85);
      ctx.lineCap = 'round';
      if (a.sample === 'cells') {
        ctx.lineWidth = 3;
        const rowH = mm(2.1);
        for (let row = 0, y = 0; y < h; row++, y += rowH) {
          ctx.beginPath(); ctx.moveTo(0, y + Math.sin(row) * 3); ctx.lineTo(w, y + Math.cos(row) * 3); ctx.stroke();
          for (let x = (row % 2) * mm(2.4) + random() * 8; x < w; x += mm(4.4 + random() * 1.4)) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 6, y + rowH); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + mm(1.6 + random()), y + rowH * (0.3 + random() * 0.4), mm(0.42), 0, TAU); ctx.fill();
          }
        }
      } else if (a.sample === 'smear') {
        const angle = random() * Math.PI;
        ctx.translate(w / 2, h / 2); ctx.rotate(angle);
        for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.2 + random() * 0.5; ctx.lineWidth = 2 + random() * 9; const y = (random() - 0.5) * h * 0.7, x = (random() - 0.6) * w * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + random() * 220, y + (random() - 0.5) * 14); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (a.sample === 'specks') {
        for (let i = 0; i < 46; i++) { const x = random() * w, y = random() * h, r = mm(0.5 + random() * 0.9); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + random() * 0.4), random() * 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x + r * 0.2, y, r * 0.3, 0, TAU); ctx.fill(); }
      } else if (a.sample === 'thread') {
        ctx.lineWidth = mm(0.5);
        ctx.strokeStyle = a.stain === 'salt' ? 'rgba(60,50,40,0.9)' : css(shown.clone().multiplyScalar(0.55), 0.95);
        ctx.beginPath();
        let x = w * 0.3, y = h * 0.35, angle = random() * TAU;
        ctx.moveTo(x, y);
        for (let i = 0; i < 26; i++) { angle += (random() - 0.5) * 1.7; x = Math.min(w * 0.72, Math.max(w * 0.28, x + Math.cos(angle) * 30)); y = Math.min(h * 0.72, Math.max(h * 0.28, y + Math.sin(angle) * 30)); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      // The tide mark: evaporation leaves the pigment at the edge.
      for (let k = 0; k < (a.sample === 'ring' ? 3 : 1); k++) { blob(1 - k * 0.17); ctx.strokeStyle = css(shown, 0.95 - k * 0.3); ctx.lineWidth = mm(0.75 - k * 0.2); ctx.stroke(); }
      for (const bubble of bubbles) {
        const x = px(bubble.x), y = px(bubble.z), r = mm(bubble.r);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(20,24,30,0.9)';
        ctx.lineWidth = Math.max(3, r * 0.22);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.beginPath(); ctx.arc(x, y, r * 0.62, 3.6, 4.9); ctx.stroke();
      }
    });
    const under = put(new THREE.Mesh(new THREE.PlaneGeometry(SIDE * 1.5, SIDE * 1.5), new THREE.MeshStandardMaterial({ map: sheet, transparent: true, depthWrite: false, roughness: 0.4 })));
    under.rotation.x = -Math.PI / 2;
    under.position.y = 0.04;
    if (a.mount === 'roof') put(new THREE.Mesh(dome((angle) => 5.5, (t) => 1.6 * Math.sqrt(1 - t * t), 8, 32), gloss(stain, { transparent: true, opacity: 0.8 }))).position.y = 0.05;

    // Glass: a clear pane you read by its bright edges.
    const plate = (points: P2[], parent: THREE.Object3D, y: number) => {
      const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
      const glass = put(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false }), pane), parent);
      glass.rotation.x = -Math.PI / 2;
      glass.position.y = y;
      points.forEach(([x, z], i) => { const [nx, nz] = points[(i + 1) % points.length]; put(s.rod([x, y + THICK, z], [nx, y + THICK, nz], 0.16, bright), parent); put(s.rod([x, y, z], [nx, y, nz], 0.1, rim), parent).castShadow = false; });
    };
    const shade = s.material('#33454b', { roughness: 0.6 });
    const crack = (points: P2[], y: number, width = 0.13) => points.slice(1).forEach(([x, z], i) => {
      put(s.rod([points[i][0], y, points[i][1]], [x, y, z], width * 1.25, bright)).castShadow = false;
      put(s.rod([points[i][0] + 0.22, y - 0.12, points[i][1] + 0.22], [x + 0.22, y - 0.12, z + 0.22], width * 1.5, shade)).castShadow = false;
    });
    const jagged = (from: P2, to: P2, steps: number, sway: number): P2[] => Array.from({ length: steps + 1 }, (_unused, i) => { const t = i / steps, off = i === 0 || i === steps ? 0 : (random() - 0.5) * sway; return [mix(from[0], to[0], t) - (to[1] - from[1]) * off, mix(from[1], to[1], t) + (to[0] - from[0]) * off] as P2; });
    const square: P2[] = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]];
    const top = lift + THICK + 0.05;

    if (a.glass === 'chipped') {
      const cut = 5 + random() * 4;
      plate([[-HALF, -HALF], [HALF, -HALF], [HALF, HALF - cut], [HALF - cut * 0.9, HALF], [-HALF, HALF]], slip, lift);
      const shard = new THREE.Group();
      plate([[0, -cut * 0.5], [cut * 0.5, cut * 0.5], [-cut * 0.45, cut * 0.5]], shard, 0);
      shard.position.set(HALF + 2 + random() * 3, a.mount === 'agar' ? 0.05 : lift * (a.mount === 'roof' ? 0 : 1) + 0.02, HALF - 1 + random() * 2);
      shard.rotation.y = random() * TAU;
      put(shard);
    } else plate(square, slip, lift);
    if (a.glass === 'cracked') {
      const flip = random() < 0.5 ? 1 : -1;
      const main = jagged([-HALF, -HALF * flip], [HALF, HALF * flip], 7, 0.07);
      crack(main, top, 0.17);
      for (let i = 0; i < 2; i++) { const from = main[2 + Math.floor(random() * 4)]; const angle = random() * TAU, reach = 3 + random() * 5; crack(jagged(from, [Math.max(-HALF, Math.min(HALF, from[0] + Math.cos(angle) * reach)), Math.max(-HALF, Math.min(HALF, from[1] + Math.sin(angle) * reach))], 3, 0.12), top, 0.1); }
    } else if (a.glass === 'shattered') {
      const hit: P2 = [(random() - 0.5) * 8, (random() - 0.5) * 8];
      const rays = 7 + Math.floor(random() * 4);
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * TAU + random() * 0.4, cos = Math.cos(angle), sin = Math.sin(angle);
        const reach = Math.min(cos > 0 ? (HALF - hit[0]) / cos : (-HALF - hit[0]) / cos, sin > 0 ? (HALF - hit[1]) / sin : (-HALF - hit[1]) / sin);
        const far = Math.abs(reach) * (random() < 0.7 ? 1 : 0.6);
        crack(jagged(hit, [hit[0] + cos * far, hit[1] + sin * far], 4, 0.08), top, 0.14);
      }
      for (const ring of [1.6, 3.4]) crack(Array.from({ length: 13 }, (_unused, i) => { const angle = (i / 12) * TAU * 0.8 + ring; return [hit[0] + Math.cos(angle) * ring * (0.9 + random() * 0.2), hit[1] + Math.sin(angle) * ring * (0.9 + random() * 0.2)] as P2; }), top, 0.09);
      put(s.scatter(new THREE.TetrahedronGeometry(1), bright, Array.from({ length: 12 }, () => ({ at: [hit[0] + (random() - 0.5) * 5, top, hit[1] + (random() - 0.5) * 5] as [number, number, number], size: 0.18 + random() * 0.25 }))));
    } else if (a.glass === 'doubled') {
      const second = new THREE.Group();
      plate(square, second, 0);
      second.position.set(3 + random() * 3, lift + THICK + 0.05, -2 - random() * 3);
      second.rotation.y = 0.25 + random() * 0.5;
      put(second);
    }

    if (a.mount === 'roof') for (const [x, z] of square) put(s.ball([1.7, lift / 2, 1.7], [x * 0.86, lift / 2, z * 0.86], s.material('#e7c26a', { roughness: 0.6 }), 12));
    if (a.mishap === 'sealed') square.forEach(([x, z], i) => { const [nx, nz] = square[(i + 1) % 4]; put(s.rod([x, lift + THICK * 0.6, z], [nx, lift + THICK * 0.6, nz], 0.5, gloss(mood.cheer > 0.5 ? '#d1174a' : '#7a1026'))).scale.x = 1 + random() * 0.3; });
    if (a.mishap === 'oil') put(s.ball([2.6, 1.1, 2.6], [(random() - 0.5) * 8, top + 0.3, (random() - 0.5) * 8], gloss('#e9b53a', { transparent: true, opacity: 0.85, emissive: '#b9781a', emissiveIntensity: 0.3 }), 18));
    if (a.mishap === 'fingerprint') {
      const print = painted(256, 256, (ctx, w, h) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3.2;
        for (let i = 1; i < 13; i++) { ctx.beginPath(); ctx.ellipse(w / 2 + Math.sin(i) * 4, h / 2 + i * 2.5, i * 8.5, i * 10.5, 0.15, Math.PI * (i < 5 ? 0 : 0.92), Math.PI * (i < 5 ? 2 : 2.08)); ctx.stroke(); }
      });
      const smudge = put(new THREE.Mesh(new THREE.PlaneGeometry(12, 14), new THREE.MeshStandardMaterial({ map: print, transparent: true, depthWrite: false, roughness: 0.9 })));
      smudge.rotation.x = -Math.PI / 2;
      smudge.rotation.z = random() * TAU;
      smudge.position.set((random() - 0.5) * 6, top + 0.06, (random() - 0.5) * 6);
    }
    if (a.mishap === 'leaked') {
      const spill = wobble(random, 4, 2);
      const side = Math.floor(random() * 4) * (Math.PI / 2);
      const pool = put(new THREE.Mesh(dome((angle) => 6.5 * (1 + 0.28 * spill(angle)), (t) => 0.5 * (1 - t ** 4), 6, 40), gloss(stain, { transparent: true, opacity: 0.82 })));
      pool.position.set(Math.cos(side) * (HALF + 2.5), 0.02, Math.sin(side) * (HALF + 2.5));
      pool.castShadow = false;
    }

    s.root.scale.setScalar(0.01);
    return s.finish();
  },
});

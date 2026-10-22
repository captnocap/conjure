import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P3, along, canvasTexture, card, lump, taper } from './lib';

const GESTURES = {
  hanging: 'Hanging straight down and still, the tip just curled, at rest or mourning.',
  trumpet: 'Flung up and back over the forehead in a full trumpeting blast.',
  mouth: 'Curled under to the mouth, feeding itself a twist of grass.',
  reach: 'Stretched out level toward the viewer, the tip open and asking.',
  periscope: 'Raised in an S with the tip turned forward like a periscope, sniffing the air.',
  coiled: 'Rolled up tight under the chin in a spiral, the way a nervous or sleeping elephant holds it.',
} as const;
// Trunk paths in units of trunk length, from the root between the eyes.
const PATHS: Record<keyof typeof GESTURES, [number, number][]> = {
  hanging: [[0, 0], [-0.22, 0.14], [-0.5, 0.17], [-0.78, 0.13], [-0.97, 0.12], [-1.0, 0.2]],
  trumpet: [[0, 0], [-0.16, 0.2], [-0.12, 0.44], [0.14, 0.58], [0.5, 0.58], [0.8, 0.44], [0.93, 0.24]],
  mouth: [[0, 0], [-0.25, 0.16], [-0.52, 0.2], [-0.68, 0.08], [-0.6, -0.08], [-0.42, -0.06], [-0.36, 0.02]],
  reach: [[0, 0], [-0.2, 0.16], [-0.3, 0.4], [-0.3, 0.68], [-0.24, 0.9], [-0.16, 1.04]],
  periscope: [[0, 0], [-0.22, 0.14], [-0.42, 0.3], [-0.36, 0.52], [-0.1, 0.6], [0.14, 0.58], [0.22, 0.7]],
  coiled: [[0, 0], [-0.22, 0.15], [-0.45, 0.2], [-0.6, 0.1], [-0.56, -0.03], [-0.43, -0.02], [-0.4, 0.08], [-0.47, 0.11]],
};

export default defineThing({
  questions: {
    trunk: choice('What is the trunk doing?', GESTURES),
    species: choice('Which elephant is it?', {
      african: 'African: enormous ears shaped like the continent, a single smooth dome of forehead, heavily wrinkled grey skin.',
      asian: 'Asian: smaller rounded ears with pink freckled edges, a twin-domed forehead, pink mottling down the trunk.',
      mammoth: 'A woolly mammoth reconstruction: small fur-edged ears, a high peaked crown and shaggy red-brown hair.',
    }),
    age: choice('How old is it?', {
      calf: 'A calf: small, big-headed, covered in wiry fuzz, the trunk short and not yet under control.',
      adult: 'A full-grown adult in its prime.',
      matriarch: 'A very old matriarch: sunken temples, a bony ridge of brow, ears frayed at the edge.',
    }),
    ears: choice('How are the ears held?', {
      fanned: 'Both spread wide like sails: a warning or a hot afternoon.',
      pinned: 'Both folded back flat against the neck.',
      relaxed: 'Hanging half open, easy.',
      torn: 'Spread, and one has a big old notch torn out of its edge and a ragged hem.',
      uneven: 'One fanned out and one folded back, mid flap.',
    }),
    tusks: choice('Does it have tusks?', {
      none: 'None at all.',
      short: 'Short stubby tushes barely past the lip.',
      long: 'A long matched pair curving forward and up.',
      broken: 'One long tusk and one snapped off to a stump.',
      sawn: 'Both sawn off flat near the root, with clean pale cut faces.',
    }),
    form: choice('What kind of object is it?', {
      mount: 'A taxidermy half-mount on a tall dark museum wall panel with a brass plate.',
      living: 'A living animal, shoulders and forelegs coming forward out of tall dry grass.',
      plaster: 'An unpainted white plaster cast on a timber trestle, sculptor’s reference.',
      bronze: 'A dark bronze casting on a stone block, a memorial.',
    }),
    holding: choice('Is the trunk holding anything?', {
      nothing: 'Nothing.',
      grass: 'A torn-up bundle of grass.',
      branch: 'A leafy branch.',
      bone: 'A long pale bone, the way elephants handle their dead.',
      hat: 'A stolen straw hat.',
      flower: 'A single flower, offered.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const calf = a.age === 'calf', old = a.age === 'matriarch';
    const mammoth = a.species === 'mammoth';
    const K = calf ? 0.5 : 1; // overall size
    const L = (calf ? 1.25 : 1.75) * K; // trunk length
    const made = a.form === 'plaster' || a.form === 'bronze';
    const lowest = Math.min(...PATHS[a.trunk].map((p) => p[0]));
    const H = Math.max(a.form === 'living' ? 2.3 * K : 0, -lowest * L + (a.form === 'living' ? 0.25 * K : 0.75 * K)) + 0.25 * K; // height of the trunk root

    // ---- Skin ------------------------------------------------------------------------------
    const greyBase = { african: '#7e7872', asian: '#76706c', mammoth: '#6b4a32' }[a.species];
    const base = a.form === 'plaster' ? '#e9e6dd' : a.form === 'bronze' ? '#7a6642' : `#${new THREE.Color(greyBase).lerp(new THREE.Color('#9a8566'), mood.wear * 0.35 + mood.warmth * 0.12).getHexString()}`;
    const wrinkle = a.form === 'plaster' ? 'rgba(120,115,100,' : a.form === 'bronze' ? 'rgba(30,40,25,' : 'rgba(35,30,28,';
    const skinMap = canvasTexture(256, 512, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      // Cross wrinkles: rings on the trunk, creases on the head.
      const rings = old ? 95 : calf ? 40 : 70;
      for (let i = 0; i < rings; i++) {
        const y = (i + random() * 0.6) * (h / rings);
        ctx.strokeStyle = `${wrinkle}${0.25 + random() * 0.35})`; ctx.lineWidth = 1 + random() * 2.2;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + (random() - 0.5) * 5);
        ctx.stroke();
      }
      for (let i = 0; i < 160; i++) { ctx.strokeStyle = `${wrinkle}${0.1 + random() * 0.15})`; const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 12, y + 10 + random() * 16); ctx.stroke(); }
      if (a.species === 'asian' && !made) for (let i = 0; i < 180; i++) {
        // Pink depigmentation, densest toward the trunk tip (top of the canvas).
        const y = Math.pow(random(), 2.2) * h * 0.75;
        ctx.fillStyle = `rgba(214,160,150,${0.3 + random() * 0.4})`; ctx.beginPath(); ctx.arc(random() * w, y, 2 + random() * 5, 0, 7); ctx.fill();
      }
      if (a.form === 'bronze') for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(90,150,120,${0.05 + random() * 0.14 * (0.4 + mood.wear)})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 6 + random() * 20, 12 + random() * 40, 0, 0, 7); ctx.fill(); }
    });
    const skin = new THREE.MeshStandardMaterial({ map: skinMap, roughness: a.form === 'bronze' ? 0.45 : 0.9, metalness: a.form === 'bronze' ? 0.35 : 0 });
    const plain = new THREE.MeshStandardMaterial({ color: base, roughness: skin.roughness, metalness: skin.metalness });
    const dark = s.material(a.form === 'plaster' ? '#8f8b80' : '#14100e', { roughness: 0.5 });
    const ivory = made ? plain : s.material('#efe4c6', { roughness: 0.35 });
    const hair = s.material(mammoth ? '#6d3b1e' : calf ? '#5a3a2a' : '#3d3531', { roughness: 1 });

    const body = new THREE.Group();
    s.root.add(body);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = body) => { parent.add(node); return node; };

    // ---- Head ------------------------------------------------------------------------------
    const hw = 0.5 * K * (calf ? 1.12 : 1), hh = 0.62 * K, hd = 0.55 * K;
    const headY = H + 0.3 * K;
    const skull = add(s.mesh(lump(random, 0.05, 3), skin, [0, headY, 0]));
    skull.scale.set(hw, hh, hd);
    // Forehead: one dome, twin domes, or the mammoth's peak.
    if (a.species === 'african') add(s.ball([hw * 0.78, hh * 0.5, hd * 0.6], [0, headY + hh * 0.55, hd * 0.25], plain, 18));
    else if (a.species === 'asian') for (const side of [-1, 1]) add(s.ball([hw * 0.47, hh * 0.42, hd * 0.52], [side * hw * 0.34, headY + hh * 0.72, hd * 0.02], plain, 16));
    else add(s.ball([hw * 0.6, hh * 0.7, hd * 0.6], [0, headY + hh * 0.72, hd * 0.05], plain, 16));
    // Cheeks and the swelling the trunk grows from.
    add(s.ball([hw * 0.62, hh * 0.5, hd * 0.6], [0, H + 0.02 * K, hd * 0.6], plain, 16));
    for (const side of [-1, 1]) {
      add(s.ball([hw * 0.4, hh * 0.55, hd * 0.55], [side * hw * 0.52, H - 0.05 * K, hd * 0.35], plain, 14));
      // Eye in a nest of lids.
      const ex = side * hw * 0.74, ey = H + 0.2 * K, ez = hd * 0.62;
      add(s.ball([0.05 * K, 0.04 * K, 0.035 * K], [ex, ey, ez], plain, 10));
      add(s.ball([0.026 * K, 0.022 * K, 0.02 * K], [ex + side * 0.01 * K, ey, ez + 0.026 * K], made ? dark : s.material('#6b4520', { roughness: 0.2 }), 10));
      if (!made) add(s.ball([0.012 * K, 0.012 * K, 0.01 * K], [ex + side * 0.012 * K, ey, ez + 0.04 * K], dark, 8));
      const lid = add(s.ball([0.05 * K, 0.022 * K, 0.04 * K], [ex, ey + (old ? 0.018 : 0.028) * K, ez + 0.012 * K], plain, 10));
      lid.rotation.z = side * -0.25;
      if (old) {
        // Sunken temples and a bony brow.
        add(s.ball([0.1 * K, 0.13 * K, 0.05 * K], [side * hw * 0.66, headY + 0.12 * K, hd * 0.6], s.material(new THREE.Color(base).multiplyScalar(0.72), { roughness: 1 }), 10));
        add(s.tube([[side * hw * 0.9, H + 0.3 * K, hd * 0.45], [side * hw * 0.62, H + 0.36 * K, hd * 0.82], [side * hw * 0.25, H + 0.34 * K, hd * 0.98]], 0.035 * K, plain));
      }
    }
    // Lower lip: a pointed pink-grey scoop under the trunk.
    add(s.ball([hw * 0.26, hh * 0.2, hd * 0.42], [0, H - 0.42 * K, hd * 0.42], made ? plain : s.material('#8f6f6a', { roughness: 0.8 }), 12)).rotation.x = 0.5;

    // ---- Trunk -----------------------------------------------------------------------------
    const root: P3 = [0, H, hd * 0.86];
    const wobble = calf ? 0.12 : 0.04;
    const path = PATHS[a.trunk].map(([y, z], i): P3 => [i < 2 ? 0 : (random() - 0.5) * wobble * L, root[1] + y * L, root[2] + z * L]);
    const r0 = 0.2 * K, r1 = 0.058 * K;
    const radius = (t: number) => mix(r0, r1, Math.pow(t, 0.8)) * (1 + 0.035 * Math.sin(t * 80));
    const trunkGroup = new THREE.Group();
    trunkGroup.position.set(...root);
    body.add(trunkGroup);
    const local = path.map((p): P3 => [p[0] - root[0], p[1] - root[1], p[2] - root[2]]);
    add(s.mesh(taper(local, radius, { segments: 90, sides: 16 }), skin), trunkGroup);
    const tip = along(local, 1), before = along(local, 0.95);
    const aim = new THREE.Vector3(tip[0] - before[0], tip[1] - before[1], tip[2] - before[2]).normalize();
    const tipGroup = new THREE.Group();
    tipGroup.position.set(...tip);
    tipGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
    trunkGroup.add(tipGroup);
    // The fingers and nostrils at the tip.
    add(s.ball([r1 * 0.75, r1 * 0.75, r1 * 0.3], [0, 0, r1 * 0.1], made ? dark : s.material('#b98a84', { roughness: 0.7 }), 10), tipGroup);
    add(s.ball([r1 * 0.5, r1 * 0.45, r1 * 0.7], [0, r1 * 0.7, r1 * 0.3], plain, 8), tipGroup);
    if (a.species !== 'asian') add(s.ball([r1 * 0.5, r1 * 0.4, r1 * 0.6], [0, -r1 * 0.7, r1 * 0.25], plain, 8), tipGroup);

    // Something held: gripped in the last curl.
    if (a.holding !== 'nothing') {
      const item = new THREE.Group();
      const grip = along(local, 0.9);
      item.position.set(grip[0], grip[1], grip[2]);
      item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
      trunkGroup.add(item);
      const u = 0.1 * Math.sqrt(K) * (calf ? 0.8 : 1);
      if (a.holding === 'grass') {
        for (let i = 0; i < 14; i++) add(s.rod([(random() - 0.5) * u * 0.5, -r1 * 1.2, (random() - 0.5) * u * 0.5], [(random() - 0.5) * u * 3, -r1 * 1.2 + (random() - 0.5) * u * 6, (random() - 0.5) * u * 3], u * 0.06, s.material(random() > 0.4 ? '#c9b36a' : '#93a05a'), u * 0.02), item);
      } else if (a.holding === 'branch') {
        add(s.rod([-u * 4, -r1 * 1.3, 0], [u * 5, -r1 * 1.1, u], u * 0.16, s.material('#5c4630'), u * 0.08), item);
        for (let i = 0; i < 16; i++) { const leaf = add(s.ball([u * 0.7, u * 0.08, u * 0.35], [-u * 4 + random() * u * 9, -r1 * 1.2 + (random() - 0.5) * u * 2.4, (random() - 0.5) * u * 2.4], s.material(random() > 0.5 ? '#4f7a3a' : '#6c9444'), 6), item); leaf.rotation.set(random() * 3, random() * 3, random() * 3); }
      } else if (a.holding === 'bone') {
        const bone = s.material('#e9e1cb', { roughness: 0.7 });
        add(s.rod([-u * 4.5, -r1 * 1.4, 0], [u * 4.5, -r1 * 1.4, 0], u * 0.35, bone, u * 0.3), item);
        for (const x of [-1, 1]) for (const z of [-1, 1]) add(s.ball([u * 0.5, u * 0.45, u * 0.5], [x * u * 4.6, -r1 * 1.4, z * u * 0.3], bone, 8), item);
      } else if (a.holding === 'hat') {
        const straw = s.material('#d9bf7a', { roughness: 0.9 });
        add(s.cylinder(u * 2.6, u * 2.6, u * 0.12, [0, -r1 * 1.6, u], straw, 20), item);
        add(s.cylinder(u * 1.3, u * 1.5, u * 1.2, [0, -r1 * 1.6 - u * 0.6, u], straw, 18), item);
        add(s.cylinder(u * 1.53, u * 1.53, u * 0.3, [0, -r1 * 1.6 - u * 0.2, u], s.material('#8c1f2a'), 18), item);
      } else {
        add(s.rod([0, -r1 * 1.2, 0], [0, -r1 * 1.2, u * 5], u * 0.1, s.material('#4f7a3a')), item);
        const petal = s.material(mood.cheer > 0.5 ? '#f2c230' : '#f1ece2', { roughness: 0.7 });
        for (let i = 0; i < 9; i++) add(s.ball([u * 0.35, u * 0.9, u * 0.12], [Math.cos(i * 0.7) * u * 0.9, -r1 * 1.2 + Math.sin(i * 0.7) * u * 0.9, u * 5], petal, 6), item).rotation.z = i * 0.7 + Math.PI / 2;
        add(s.ball([u * 0.5, u * 0.5, u * 0.3], [0, -r1 * 1.2, u * 5.1], s.material('#7a4a1c'), 8), item);
      }
    }

    // ---- Ears ------------------------------------------------------------------------------
    const big = a.species === 'african';
    const ew = (big ? 1.05 : mammoth ? 0.38 : 0.62) * K * (calf ? 1.15 : 1), eh = (big ? 1.45 : mammoth ? 0.5 : 0.9) * K * (calf ? 1.1 : 1);
    const earMap = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      if (!made) {
        // Veins branching from the root (left middle of the canvas).
        ctx.strokeStyle = 'rgba(60,40,45,0.5)';
        const branch = (x: number, y: number, angle: number, length: number, width: number) => {
          if (width < 0.6 || length < 8) return;
          const nx = x + Math.cos(angle) * length, ny = y + Math.sin(angle) * length;
          ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + nx) / 2 + (random() - 0.5) * 14, (y + ny) / 2 + (random() - 0.5) * 14, nx, ny); ctx.stroke();
          branch(nx, ny, angle + 0.3 + random() * 0.4, length * 0.72, width * 0.7);
          branch(nx, ny, angle - 0.3 - random() * 0.4, length * 0.72, width * 0.7);
        };
        for (const angle of [-0.9, -0.3, 0.3, 0.9, 1.4]) branch(8, h * 0.4, angle, 60, 5);
        if (a.species === 'asian') for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(222,165,155,${0.35 + random() * 0.5})`; ctx.beginPath(); ctx.arc(w * (0.2 + random() * 0.8), h * (0.55 + Math.pow(random(), 0.6) * 0.45), 2 + random() * 5, 0, 7); ctx.fill(); }
        if (mammoth) for (let i = 0; i < 300; i++) { ctx.strokeStyle = `rgba(60,28,10,${0.3 + random() * 0.4})`; ctx.lineWidth = 2; const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 14); ctx.stroke(); }
      }
      const shade = ctx.createLinearGradient(0, 0, w, 0);
      shade.addColorStop(0, 'rgba(0,0,0,0.25)'); shade.addColorStop(0.3, 'rgba(0,0,0,0)');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    });
    const earPaint = new THREE.MeshStandardMaterial({ map: earMap, roughness: skin.roughness, metalness: skin.metalness, side: THREE.DoubleSide });
    const tornSide = random() > 0.5 ? 1 : -1;
    const earGroups: { group: THREE.Group; rest: number; side: number }[] = [];
    for (const side of [-1, 1]) {
      const torn = a.ears === 'torn' && side === tornSide;
      const outline: [number, number][] = big
        ? [[0, 0.3], [0.2, 0.47], [0.55, 0.5], [0.88, 0.36], [1, 0.05], ...(torn ? [[0.97, -0.08], [0.66, -0.14], [0.72, -0.2], [0.93, -0.26]] as [number, number][] : []), [0.9, -0.38], [0.62, -0.5], [0.34, -0.46], [0.12, -0.36], [0, -0.22]]
        : [[0, 0.32], [0.3, 0.5], [0.72, 0.44], [1, 0.16], ...(torn ? [[0.98, 0.02], [0.62, -0.04], [0.7, -0.12], [0.94, -0.16]] as [number, number][] : []), [0.9, -0.28], [0.62, -0.5], [0.3, -0.42], [0, -0.3]];
      const frayed = old || torn;
      const shape = new THREE.Shape();
      const pts = outline.map(([x, y]) => new THREE.Vector2(x * ew, y * eh));
      shape.moveTo(pts[0].x, pts[0].y);
      if (frayed) {
        // A ragged hem: walk the smooth outline and nick it.
        const smooth = new THREE.SplineCurve(pts).getPoints(60);
        smooth.forEach((p, i) => { const nick = i > 8 && i < 54 && i % 4 === 0 ? 1 - random() * 0.05 : 1; shape.lineTo(p.x * nick, p.y * nick); });
      } else shape.splineThru(pts.slice(1));
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape, 10);
      const p = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) / ew, y = p.getY(i) / eh;
        uv.setXY(i, x, 0.5 - y);
        // A soft cup and a curl at the rim so it is not a flat card.
        p.setZ(i, (-0.16 * x * x + 0.05 * Math.sin(x * 5 + y * 4)) * ew);
      }
      geometry.computeVertexNormals();
      const ear = new THREE.Mesh(geometry, earPaint);
      ear.castShadow = ear.receiveShadow = true;
      ear.scale.x = side;
      const group = new THREE.Group();
      group.position.set(side * hw * 0.82, headY + hh * 0.25, -hd * 0.1);
      const folded = a.ears === 'pinned' || (a.ears === 'uneven' && side === tornSide);
      const rest = side * (folded ? 1.3 : a.ears === 'relaxed' ? 0.75 : 0.2);
      group.rotation.set(0, rest, side * (folded ? 0.05 : -0.06));
      group.add(ear);
      body.add(group);
      earGroups.push({ group, rest, side });
    }

    // ---- Tusks -----------------------------------------------------------------------------
    const tusks = calf && a.tusks !== 'none' ? 'short' : a.tusks;
    if (tusks !== 'none') {
      const brokenSide = random() > 0.5 ? 1 : -1;
      for (const side of [-1, 1]) {
        const long = tusks === 'long' || tusks === 'broken';
        const reach = (long ? (mammoth ? 1.5 : 1.05) : 0.32) * K;
        const pathTusk: P3[] = [[side * hw * 0.5, H - 0.12 * K, hd * 0.55], [side * hw * 0.62, H - 0.5 * K, hd * 0.95], [side * (hw * 0.7 + reach * 0.12), H - 0.5 * K - reach * 0.42, hd * 0.95 + reach * 0.45], [side * (hw * 0.62 + reach * (mammoth ? -0.1 : 0.1)), H - 0.5 * K - reach * 0.4, hd * 0.95 + reach * 0.85], [side * (hw * 0.5 - (mammoth ? reach * 0.3 : 0)), H - 0.5 * K - reach * 0.12, hd * 0.95 + reach * 1.05]];
        const until = tusks === 'sawn' ? 0.42 : tusks === 'broken' && side === brokenSide ? 0.4 + random() * 0.1 : 1;
        const thick = (long ? 0.075 : 0.05) * K;
        add(s.mesh(taper(pathTusk, (t) => thick * Math.max(0.08, Math.pow(1 - t * (long ? 1 : 0.6), 0.6)), { segments: 36, sides: 12, until: tusks === 'short' ? 0.5 : until }), ivory));
        if (until < 1 && !made) add(s.ball([thick * 0.8, thick * 0.8, thick * 0.3], along(pathTusk, until), s.material(tusks === 'sawn' ? '#f6efdc' : '#a58a62', { roughness: 0.9 }), 8));
      }
    }

    // ---- Hair ------------------------------------------------------------------------------
    if ((calf || mammoth || old) && !made) {
      const strands: { at: P3; size: number }[] = [];
      const count = mammoth ? 260 : calf ? 110 : 30;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, up = mammoth ? random() * 1.6 - 0.6 : 0.3 + random() * 0.7;
        const r = Math.sqrt(Math.max(0, 1 - Math.min(1, up) ** 2));
        strands.push({ at: [Math.cos(angle) * r * hw * 1.02, headY + up * hh * 1.25, Math.sin(angle) * r * hd * 1.02], size: (mammoth ? 2.2 : 1) * (0.6 + random()) });
      }
      const fuzz = s.scatter(new THREE.CylinderGeometry(0.004 * K, 0.008 * K, 0.11 * K, 4), hair, strands);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      strands.forEach((strand, i) => { q.setFromEuler(e.set((random() - 0.5) * (mammoth ? 0.5 : 1.4), 0, (random() - 0.5) * (mammoth ? 0.5 : 1.4))); m.compose(new THREE.Vector3(strand.at[0], strand.at[1] - (mammoth ? 0.08 * K * strand.size : 0), strand.at[2]), q, new THREE.Vector3(strand.size, strand.size, strand.size)); fuzz.setMatrixAt(i, m); });
      body.add(fuzz);
      if (mammoth) for (let i = 0; i < 26; i++) { const angle = -0.4 + random() * (Math.PI + 0.8); add(s.mesh(taper([[Math.cos(angle) * hw * 0.95, H - 0.1 * K, Math.sin(angle) * hd * 0.8], [Math.cos(angle) * hw * 1.05, H - 0.5 * K, Math.sin(angle) * hd * 0.9], [Math.cos(angle) * hw, H - (0.8 + random() * 0.3) * K, Math.sin(angle) * hd * 0.85]], (t) => 0.06 * K * (1 - t * 0.8), { segments: 6, sides: 5 }), hair)); }
    }

    // ---- What it is attached to ------------------------------------------------------------
    if (a.form === 'mount') {
      const wood = s.material('#3f2618', { roughness: 0.5 });
      const panelW = Math.max(1.5 * K, hw * 2.6), panelH = headY + hh + 0.5 * K;
      s.box([panelW, panelH, 0.08 * K], [0, panelH / 2, -hd * 1.5], wood);
      s.box([panelW + 0.12 * K, 0.1 * K, 0.14 * K], [0, panelH, -hd * 1.5], wood);
      s.box([panelW + 0.12 * K, 0.22 * K, 0.6 * K], [0, 0.11 * K, -hd * 1.5 + 0.2 * K], wood);
      // Neck collar where the skin meets the shield.
      const collar = add(s.mesh(lump(random, 0.04, 2), skin, [0, headY - 0.05 * K, -hd * 0.75]));
      collar.scale.set(hw * 1.05, hh * 1.05, hd * 0.9);
      s.cylinder(hw * 1.3, hw * 1.3, 0.06 * K, [0, headY - 0.05 * K, -hd * 1.42], s.material('#2c1a10', { roughness: 0.4 }), 28).rotation.x = Math.PI / 2;
      const year = 1890 + Math.floor(random() * 40);
      const plate = card([mammoth ? 'Mammuthus primigenius' : a.species === 'african' ? 'Loxodonta africana' : 'Elephas maximus', mammoth ? 'reconstruction' : `collected ${year}`], 0.7 * K, 0.2 * K, '#3a2a10', '#c9a54f');
      plate.position.set(0, 0.45 * K, -hd * 1.5 + 0.045 * K);
      (plate.material as THREE.MeshStandardMaterial).metalness = 0.5;
      s.root.add(plate);
    } else if (a.form === 'living') {
      const mass = add(s.mesh(lump(random, 0.06, 3), skin, [0, headY - 0.35 * K, -hd * 1.5]));
      mass.scale.set(hw * 1.5, hh * 1.5, hd * 1.6);
      for (const side of [-1, 1]) {
        const legTop = headY - 0.9 * K;
        add(s.cylinder(0.2 * K, 0.23 * K, legTop, [side * hw * 0.85, legTop / 2, -hd * 1.1], skin, 14));
        for (let i = 0; i < 4; i++) add(s.ball([0.05 * K, 0.04 * K, 0.04 * K], [side * hw * 0.85 + (i - 1.5) * 0.09 * K, 0.035 * K, -hd * 1.1 + 0.2 * K], s.material('#b9ad98'), 6));
      }
      // Tall dry grass it is walking out of.
      const blades: { at: P3; size: number; color: string }[] = [];
      const count = Math.round(mix(120, 420, mood.density));
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * 3.4 * K, z = -hd * 2.6 + random() * 2.8 * K;
        if (Math.abs(x) < hw * 0.7 && z > -hd * 0.4) continue;
        blades.push({ at: [x, 0, z], size: 0.5 + random() * 0.9, color: random() > mix(0.8, 0.2, mood.warmth) ? '#c9b36a' : '#8c9a55' });
      }
      const grass = s.scatter(new THREE.ConeGeometry(0.022 * K, 1.3 * K, 4), s.material('#ffffff', { roughness: 1 }), blades);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      blades.forEach((blade, i) => { q.setFromEuler(e.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5)); m.compose(new THREE.Vector3(blade.at[0], 0.6 * K * blade.size, blade.at[2]), q, new THREE.Vector3(1, blade.size, 1)); grass.setMatrixAt(i, m); });
    } else if (a.form === 'plaster') {
      const pine = s.material('#b99a6a', { roughness: 0.9 });
      const top = headY - hh * 0.9;
      add(s.mesh(lump(random, 0.04, 2), plain, [0, headY - 0.1 * K, -hd * 0.8])).scale.set(hw * 0.95, hh * 0.95, hd * 0.9);
      s.box([hw * 2.2, 0.06 * K, hd * 1.6], [0, top, -hd * 1.0], pine);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * hw * 1.25, 0, -hd * 1.0 + z * hd * 0.9], [x * hw * 0.9, top, -hd * 1.0 + z * hd * 0.6], 0.035 * K, pine);
      for (const x of [-1, 1]) s.rod([x * hw * 1.15, top * 0.35, -hd * 1.0 - hd * 0.8], [x * hw * 1.15, top * 0.35, -hd * 1.0 + hd * 0.8], 0.025 * K, pine);
      // Armature iron showing at the neck and drips on the floor.
      s.rod([0, top, -hd * 1.4], [0, headY, -hd * 1.0], 0.03 * K, s.material('#5a4a3a', { metalness: 0.5 }));
      for (let i = 0; i < 8; i++) s.cylinder(0.03 * K + random() * 0.05 * K, 0.04 * K + random() * 0.05 * K, 0.006, [(random() - 0.5) * hw * 2.4, 0.003, (random() - 0.3) * hd * 2.4], plain, 10);
    } else {
      const stone = s.material('#8f8c84', { roughness: 0.95 });
      const top = Math.max(0.3 * K, H + lowest * L - 0.35 * K);
      add(s.mesh(lump(random, 0.04, 2), plain, [0, headY - 0.2 * K, -hd * 0.9])).scale.set(hw * 1.1, hh * 1.2, hd * 1.1);
      s.cylinder(hw * 0.75, hw * 0.95, headY - hh - top + 0.3 * K, [0, (headY - hh + top + 0.3 * K) / 2, -hd * 0.9], plain, 18);
      s.box([hw * 2.6, top, hd * 2.6], [0, top / 2, -hd * 0.9], stone);
      s.box([hw * 2.8, top * 0.25, hd * 2.8], [0, top * 0.125, -hd * 0.9], stone);
      const plate = card(['IN MEMORY', 'she remembered us'], hw * 1.5, Math.min(top * 0.5, 0.26 * K), '#d9d3c0', '#33342c');
      plate.position.set(0, top * 0.6, -hd * 0.9 + hd * 1.3 + 0.004);
      s.root.add(plate);
    }

    const life = a.form === 'living' ? mix(0.15, 1, mood.energy) : 0;
    const phase = random() * 6;
    return s.finish({
      footprint: Math.max(0.9 * K, hw * 1.6),
      update: life > 0 ? (_dt, time) => {
        for (const ear of earGroups) ear.group.rotation.y = ear.rest + ear.side * Math.sin(time * 1.4 * life + phase) * 0.22 * life;
        trunkGroup.rotation.z = Math.sin(time * 0.8 + phase) * 0.05 * life;
        trunkGroup.rotation.x = Math.sin(time * 0.6 + phase * 2) * 0.03 * life;
      } : undefined,
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { SAND, bed, lump, rest, strew, type Speck } from './grains';

const COLOURS = {
  purple: 'Deep violet purple.',
  green: 'Olive green fading to a pale tip.',
  rose: 'Dusty brick rose, like a slate-pencil urchin.',
  black: 'Glossy black, the long needle of a tropical reef urchin.',
  bone: 'Bleached bone white, long dead.',
  lilac: 'Pale lilac with a white tip.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = { purple: '#6a3d9a', green: '#7d9a4a', rose: '#b8604f', black: '#2c2a33', bone: '#e9e3d3', lilac: '#b9a3d8' };
const FORMS = {
  column: { length: 5.2, flute: 0.11, flutes: 14, radius: (u: number) => 0.36 * (1 - 0.22 * u) },
  needle: { length: 7, flute: 0.07, flutes: 10, radius: (u: number) => 0.3 * Math.pow(1 - u, 0.8) + 0.012 },
  club: { length: 4.4, flute: 0.035, flutes: 18, radius: (u: number) => 0.24 + 0.24 * Math.pow(Math.sin(Math.min(1, u * 1.08) * Math.PI * 0.86), 0.8) },
  paddle: { length: 4.6, flute: 0.05, flutes: 12, radius: (u: number) => 0.2 + 0.2 * u * u },
  thorny: { length: 5.6, flute: 0.05, flutes: 8, radius: (u: number) => 0.26 * (1 - 0.55 * u) },
} as const;

function skin(random: () => number, banded: boolean, fadeTip: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, 64, 256);
  if (banded) {
    let y = 14 + random() * 20;
    while (y < 250) { const h = 10 + random() * 18; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y, 64, h); ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, y + h, 64, 5); y += h + 16 + random() * 26; }
  }
  if (fadeTip) { const fade = ctx.createLinearGradient(0, 0, 0, 90); fade.addColorStop(0, 'rgba(255,255,255,0.95)'); fade.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 90); }
  ctx.fillStyle = '#7a7a7a';
  for (let i = 0; i < 160; i++) { ctx.globalAlpha = 0.25; ctx.fillRect(random() * 64, random() * 256, 1.5, 2 + random() * 8); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What kind of spine is it?', {
      column: 'A stout fluted shaft with a blunt top, a Doric column in miniature.',
      needle: 'A long fine needle tapering to a point.',
      club: 'A thick blunt club, swollen in the middle, from a pencil urchin.',
      paddle: 'A shaft that widens and flattens into an oar blade.',
      thorny: 'A shaft ringed with whorls of small thorns.',
    }),
    colour: choice('What colour is it?', COLOURS),
    banded: noul('Is it ringed with pale bands along its length?'),
    state: choice('What condition is it in?', {
      whole: 'Whole from joint to tip.',
      snapped: 'Snapped in two, the tip lying just beyond the shaft.',
      drums: 'Broken into four drums lying in a row, a toppled colonnade.',
      stub: 'Only the base and a short stump: the rest is gone.',
    }),
    shell: choice('Is any of the urchin still with it?', {
      none: 'No: the spine is on its own.',
      seated: 'Yes: it still stands seated on a domed shard of the shell, among knobs where its neighbours were.',
      beside: 'A shard of the knobbly shell lies beside it, the socket empty.',
    }),
    pose: choice('How does it lie?', {
      fallen: 'Flat on the ground like a fallen column.',
      leaning: 'Propped at a slant on a grain, tip in the air.',
      standing: 'Upright on its joint, a lone pillar still standing.',
    }),
    company: choice('What surrounds it?', {
      alone: 'Nothing.',
      sand: 'A patch of sand.',
      ruin: 'A patch of sand strewn with smaller fallen spines, a whole temple down.',
      weed: 'A patch of sand with a few dark shreds of dried weed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // modelled in millimetres (a 15 mm spine), shown magnified
    const form = FORMS[a.form];
    const L = form.length;
    const tint = new THREE.Color(TINT[a.colour]).lerp(new THREE.Color('#d9d2c2'), mood.wear * 0.2).offsetHSL(0, 0, mix(-0.03, 0.04, mood.cheer));
    const map = skin(random, a.banded, a.colour === 'green' || a.colour === 'lilac');
    const hide = new THREE.MeshStandardMaterial({ color: tint, map, roughness: mix(0.3, 0.75, mood.wear), emissive: tint, emissiveIntensity: 0.05 });
    const core = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color('#f4efe2'), 0.72), roughness: 0.6 });
    const jointPaint = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color('#f4efe2'), 0.45), roughness: 0.4 });
    const r0 = form.radius(0);

    /** The stretch of shaft between two fractions of its length, standing on y = 0. */
    const shaft = (from: number, to: number) => {
      const g = new THREE.CylinderGeometry(1, 1, (to - from) * L, 44, Math.max(4, Math.round((to - from) * 40)));
      g.translate(0, ((to - from) * L) / 2, 0);
      const pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      const sideCount = 45 * (Math.max(4, Math.round((to - from) * 40)) + 1);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
        const u = from + y / L, flat = Math.hypot(x, z);
        if (flat < 1e-6) continue;
        const angle = Math.atan2(z, x);
        let r = form.radius(u) * (1 + form.flute * Math.cos(angle * form.flutes));
        if (a.form === 'thorny') r *= 1 + 0.75 * Math.pow(Math.max(0, Math.sin(u * 30)), 8) * Math.pow(Math.max(0, Math.cos(angle * 6 + Math.floor((u * 30) / Math.PI) * 0.5)), 3);
        const squash = a.form === 'paddle' ? mix(1, 0.32, u * u) : 1;
        pos.setXYZ(i, Math.cos(angle) * r * flat, y, Math.sin(angle) * r * flat * squash);
        if (i < sideCount) uv.setY(i, 1 - u);
      }
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, [hide, to >= 1 ? hide : core, core]);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    /** Milled ring, neck and the cup that sat on the shell's knob. */
    const joint = () => {
      const k = Math.max(r0, 0.26);
      const profile = [[0.001, -0.5], [0.45, -0.52], [0.72, -0.42], [0.78, -0.26], [0.62, -0.14], [1.32, -0.08], [1.4, 0.02], [1.32, 0.12], [1, 0.2], [0.98, 0.3]];
      const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * k, y * k * 1.5)), 40);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
        if (Math.abs(y) < 0.2 * k) { const m = 1 + 0.045 * Math.cos(Math.atan2(z, x) * 28); pos.setXYZ(i, x * m, y, z * m); }
      }
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, jointPaint);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const jointDrop = Math.max(r0, 0.26) * 0.78;

    const cut = a.state === 'snapped' ? 0.45 + random() * 0.22 : 0;
    const pieces: [number, number][] = { whole: [[0, 1]], snapped: [[0, cut], [cut, 1]], drums: [[0, 0.3], [0.3, 0.55], [0.55, 0.78], [0.78, 1]], stub: [[0, 0.24 + random() * 0.1]] }[a.state] as [number, number][];
    const seated = a.shell === 'seated';
    const upright = a.pose === 'standing' || seated;
    const palette = SAND.tan;

    // The main piece carries the joint.
    const main = new THREE.Group();
    main.add(shaft(...pieces[0]), joint());
    const mainLength = (pieces[0][1] - pieces[0][0]) * L;
    const lean = seated ? (a.pose === 'standing' ? 0.12 : a.pose === 'leaning' ? 0.55 : 0.95) : a.pose === 'standing' ? (random() - 0.5) * 0.08 : a.pose === 'leaning' ? Math.PI / 2 - 0.36 : Math.PI / 2;
    main.rotation.z = -lean;
    const whole = new THREE.Group();
    whole.add(main);
    const rowLength = upright ? mainLength * Math.sin(lean) : L + (pieces.length - 1) * 0.3;
    main.position.x = upright ? -rowLength * 0.5 : -rowLength / 2;
    const domeR = 2.7, domeArc = 0.52, domeHeight = domeR * (1 - Math.cos(domeArc));
    if (seated) main.position.y = domeHeight + jointDrop * 0.9;
    else if (a.pose === 'standing') main.position.y = jointDrop;
    else rest(main);
    if (a.pose === 'leaning' && !seated) {
      const prop = new THREE.Mesh(lump(random, { detail: 2, amp: 0.2, chips: 3 }), new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.5 }));
      const at = mainLength * 0.55, size = Math.max(0.3, at * Math.cos(lean) * 0.5);
      prop.scale.set(size * 1.2, size, size * 1.1);
      prop.position.set(main.position.x + at * Math.sin(lean), size * 0.75, 0);
      prop.castShadow = prop.receiveShadow = true;
      whole.add(prop);
      main.position.y += 0.05;
    }

    // Everything that has broken off lies on the ground beyond it, in order, like column drums.
    let x = upright ? main.position.x + 0.8 : main.position.x + mainLength * Math.sin(lean) + 0.3;
    pieces.slice(1).forEach(([from, to], i) => {
      const drum = new THREE.Group();
      drum.add(shaft(from, to));
      drum.rotation.z = -Math.PI / 2;
      drum.rotation.y = (random() - 0.5) * 0.5;
      drum.rotation.x = random() * 6;
      drum.position.set(x, 0, upright ? 1 + i * 0.12 : (random() - 0.5) * 0.3);
      whole.add(drum);
      rest(drum);
      x += (to - from) * L + 0.3;
    });

    // The shard of test: a dome of plates studded with the knobs spines pivot on.
    if (a.shell !== 'none') {
      const plate = new THREE.Group();
      const shellTint = tint.clone().lerp(new THREE.Color('#e8e0cf'), 0.62);
      const g = new THREE.SphereGeometry(domeR, 40, 10, 0, Math.PI * 2, 0, domeArc);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const k1 = random() * 6, k2 = random() * 6;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), pz = pos.getZ(i), flat = Math.hypot(px, pz) / (domeR * Math.sin(domeArc));
        if (flat > 0.75) { const angle = Math.atan2(pz, px), bite = 1 - (flat - 0.75) * 4 * (0.22 + 0.2 * Math.sin(angle * 3 + k1) + 0.14 * Math.sin(angle * 7 + k2)); pos.setX(i, px * bite); pos.setZ(i, pz * bite); }
      }
      g.translate(0, -domeR * Math.cos(domeArc), 0);
      g.computeVertexNormals();
      const dome = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: shellTint, roughness: 0.7, side: THREE.DoubleSide }));
      dome.castShadow = dome.receiveShadow = true;
      plate.add(dome);
      const knob = new THREE.SphereGeometry(1, 12, 8);
      const knobPaint = new THREE.MeshStandardMaterial({ color: shellTint.clone().lerp(new THREE.Color('#ffffff'), 0.4), roughness: 0.4 });
      const on = (polar: number, angle: number) => new THREE.Vector3(Math.sin(polar) * Math.cos(angle) * domeR, domeR * Math.cos(polar) - domeR * Math.cos(domeArc), Math.sin(polar) * Math.sin(angle) * domeR);
      const boss = (polar: number, angle: number, size: number) => {
        const p = on(polar, angle);
        const mound = new THREE.Mesh(knob, knobPaint); mound.position.copy(p); mound.scale.set(size, size * 0.55, size); plate.add(mound);
        const nipple = new THREE.Mesh(knob, knobPaint); nipple.position.copy(p).y += size * 0.5; nipple.scale.setScalar(size * 0.42); plate.add(nipple);
      };
      boss(0, 0, 0.36);
      for (let i = 0; i < 6; i++) boss(0.27, i * 1.047 + 0.4, 0.24);
      for (let i = 0; i < 16; i++) boss(0.13 + random() * 0.26, random() * 6.283, 0.07 + random() * 0.05);
      if (seated) plate.position.x = main.position.x;
      else { plate.position.set(upright ? 1.3 : 0.2, 0, upright ? -1.4 : -1.75); plate.scale.setScalar(0.7); plate.rotation.y = random() * 6; }
      whole.add(plate);
    }

    whole.rotation.y = (random() - 0.5) * 0.5 + (a.pose === 'fallen' && !seated ? 0.25 : 0);
    s.root.add(whole);
    whole.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(whole, true);
    const centre = box.getCenter(new THREE.Vector3());
    whole.position.x -= centre.x;
    whole.position.z -= centre.z;
    const reach = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5 + 0.5;

    if (a.company !== 'alone') s.root.add(bed(random, { radius: reach, grain: 0.2, count: 380 + Math.round(mood.density * 320), palette, specks: SAND.dark, speckShare: 0.05 }));
    if (a.company === 'ruin') {
      const n = 3 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) {
        const small = shaft(0, 1);
        const angle = i * (6.283 / n) + random() * 0.7, r = reach * (0.55 + random() * 0.3), size = 0.22 + random() * 0.14;
        small.scale.setScalar(size);
        small.rotation.set(random() * 6, 0, -Math.PI / 2);
        const turn = new THREE.Group();
        turn.add(small);
        turn.rotation.y = angle + 1.2 + random();
        turn.position.set(Math.cos(angle) * r, form.radius(0.3) * size + 0.02, Math.sin(angle) * r);
        s.root.add(turn);
      }
    }
    if (a.company === 'weed') {
      const weed = s.material('#3a3524', { roughness: 0.5 });
      const scraps: Speck[] = [];
      for (let i = 0; i < 5 + Math.round(mood.density * 6); i++) {
        const angle = random() * 6.283, r = reach * (0.5 + random() * 0.4), cx = Math.cos(angle) * r, cz = Math.sin(angle) * r, turn = random() * 6;
        s.tube([[cx, 0.06, cz], [cx + Math.cos(turn) * 0.4, 0.14, cz + Math.sin(turn) * 0.4], [cx + Math.cos(turn + 0.8) * 0.8, 0.06, cz + Math.sin(turn + 0.8) * 0.8]], 0.05, weed);
        scraps.push({ x: cx, y: 0.08, z: cz, size: 0.09, color: '#4a4228' });
      }
      s.root.add(strew(random, scraps, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 })));
    }

    return s.finish({ footprint: reach * 0.03 * 0.75 });
  },
});

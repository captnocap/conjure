import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type Expression, dollHead } from './doll';

const TONES = {
  pale: ['#f3dccd', '#f1d2c0', '#f6e2d6'],
  mixed: ['#f3dccd', '#d9a67e', '#8a5a3c', '#5e3d2a', '#eac4a6', '#b97f5c'],
  brown: ['#8a5a3c', '#6b4430', '#a8734e', '#5e3d2a'],
  blank: ['#f2eee6', '#efeae0'],
} as const;

export default defineThing({
  questions: {
    material: choice('What are the heads made of?', {
      bisque: 'Matte unglazed bisque porcelain, fine and fragile.',
      composition: 'Composition: pressed sawdust and glue, yellowed, its surface crazed and lifting.',
      celluloid: 'Thin glossy celluloid, shiny as a ping-pong ball.',
      vinyl: 'Soft modern vinyl, even and slightly rubbery.',
    }),
    count: choice('How many heads are on the rack?', {
      three: 'Three, a small job.',
      five: 'Five in a single row.',
      seven: 'Seven in a long single row.',
      nine: 'Nine on two stepped tiers, like a choir.',
    }),
    tones: choice('What skin tones are they?', {
      pale: 'All pale pink-white.',
      mixed: 'A real mix, from pale pink through tan to deep brown.',
      brown: 'All warm browns.',
      blank: 'Unfired-looking chalk white blanks with no flesh tint at all.',
    }),
    state: choice('What state are they in?', {
      fresh: 'Freshly painted and eyed: bright lips, pink cheeks, everything but hair.',
      eyeless: 'Painted but eyeless: every socket an empty black hole.',
      half: 'Half-repainted: one finished rosy cheek and brow, the other half bare, one eye set.',
      progress: 'A production line: from bare blanks at one end to finished faces at the other.',
      stripped: 'Stripped back for restoration: ghost-pale traces of old faces, no eyes.',
    }),
    expression: choice('What expression do the painted faces have?', {
      sweet: 'Identical sweet rosebud smiles.',
      blank: 'Level, closed, neutral faces.',
      startled: 'Round mouths and raised brows, a row of small gasps.',
      sly: 'Side-glancing eyes and smirks, as if sharing a joke.',
      assorted: 'Each one different.',
    }),
    facing: choice('Which way do they face?', {
      forward: 'All straight ahead, staring at the viewer.',
      aside: 'All turned the same way, looking at something off to one side.',
      inward: 'Turned in toward the middle of the row, as if conferring.',
      away: 'All turned to the wall, showing the backs of their bald heads.',
      scattered: 'Every which way, as they were put down.',
    }),
    wig: noul('Has one of them already had its wig pinned on?'),
    tags: noul('Does a paper number tag hang from each peg?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const n = { three: 3, five: 5, seven: 7, nine: 9 }[a.count];
    const tiers = n === 9 ? [5, 4] : [n];
    const hh = 0.1, pitch = 0.115, pegH = 0.085;
    const wood = s.material('#a67b4d', { roughness: 0.75 });
    const peg = s.material('#c49a62', { roughness: 0.7 });
    const roughness = { bisque: 0.7, composition: 0.6, celluloid: 0.12, vinyl: 0.5 }[a.material];
    const tones = TONES[a.tones];
    const expressions: Expression[] = ['sweet', 'blank', 'startled', 'sly'];
    const wigged = a.wig ? Math.floor(random() * n) : -1;
    const aside = random() < 0.5 ? -1 : 1;
    let index = 0;
    tiers.forEach((countInTier, tier) => {
      const z = tier === 0 && tiers.length > 1 ? -0.07 : tiers.length > 1 ? 0.07 : 0;
      const lift = tier === 0 && tiers.length > 1 ? 0.11 : 0;
      const width = countInTier * pitch + 0.03;
      s.box([width, 0.022, 0.12], [0, lift + 0.011, z], wood);
      if (lift) s.box([width, lift, 0.1], [0, lift / 2, z - 0.01], wood);
      for (let i = 0; i < countInTier; i++, index++) {
        const x = (i - (countInTier - 1) / 2) * pitch;
        const t = n > 1 ? index / (n - 1) : 1;
        s.cylinder(0.011, 0.013, pegH, [x, lift + 0.022 + pegH / 2, z], peg, 12);
        let paint = 1, half = false, left = true, right = true;
        if (a.state === 'eyeless') left = right = false;
        if (a.state === 'half') { half = true; left = false; }
        if (a.state === 'stripped') { paint = 0.16; left = right = false; }
        if (a.state === 'progress') {
          if (t < 0.3) { paint = 0; left = right = false; }
          else if (t < 0.62) { half = true; left = false; right = t > 0.45; }
        }
        if (a.tones === 'blank' && a.state !== 'fresh' && a.state !== 'progress') paint *= 0.75;
        // A few sockets are simply empty on any well-used bench.
        if (left && right && random() < wear * 0.3) (random() < 0.5 ? (left = false) : (right = false));
        const hasWig = index === wigged;
        const damage = [] as ('cheek' | 'forehead')[];
        if (a.material === 'composition' && random() < 0.3 + wear * 0.6) damage.push(random() < 0.5 ? 'cheek' : 'forehead');
        else if (random() < wear * 0.35) damage.push('cheek');
        const expression = a.expression === 'assorted' ? expressions[Math.floor(random() * 4)] : a.expression;
        const tone = new THREE.Color(tones[a.tones === 'mixed' ? (index * 2 + Math.floor(random() * 2)) % tones.length : Math.floor(random() * tones.length)]);
        if (a.material === 'composition') tone.lerp(new THREE.Color('#c9a56a'), 0.28);
        if (a.material === 'celluloid') tone.lerp(new THREE.Color('#ffb9a8'), 0.25);
        const head = dollHead({
          h: hh, skin: tone.getStyle(), roughness, expression, leftEye: left, rightEye: right,
          iris: ['#2f6fd0', '#6b3d1c', '#5f8f6a', '#2f6fd0'][Math.floor(random() * 4)],
          lid: 0, crown: hasWig ? 'closed' : 'open', paint, halfPaint: half, damage,
          wear: Math.min(1, wear * (a.material === 'composition' ? 1.3 : 0.8) + (a.state === 'stripped' ? 0.3 : 0)), random,
        });
        head.group.position.set(x, lift + 0.022 + pegH - 0.012, z);
        const turn = { forward: 0, aside: aside * 0.75, inward: -Math.sign(x) * 0.7, away: Math.PI, scattered: (random() - 0.5) * 3.4 }[a.facing];
        head.group.rotation.y = turn + (random() - 0.5) * 0.22;
        head.group.rotation.z = (random() - 0.5) * (0.06 + wear * 0.2);
        head.group.rotation.x = -0.08;
        s.root.add(head.group);
        if (hasWig) {
          const hair = new THREE.MeshStandardMaterial({ color: ['#e3c779', '#96421f', '#4d2f1c', '#1c1816'][Math.floor(random() * 4)], roughness: 0.95 });
          const curls: { at: [number, number, number]; size: number }[] = [];
          for (let k = 0; k < 150; k++) {
            const angle = random() * Math.PI * 2, elevation = mix(-0.5, 1.5, random());
            const face = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
            if (face < 0.95 && elevation < 0.7) continue;
            const rr = 0.044 * Math.cos(Math.min(elevation, 1.5));
            curls.push({ at: [Math.sin(angle) * rr, head.centre + Math.sin(elevation) * 0.055, Math.cos(angle) * rr], size: 0.0095 + random() * 0.005 });
          }
          const wig = s.scatter(new THREE.SphereGeometry(1, 8, 6), hair, curls);
          head.group.add(wig);
          const pinMaterial = s.material('#e8e8ec', { metalness: 0.8, roughness: 0.2 });
          for (let k = 0; k < 5; k++) {
            const angle = 1.2 + k * 0.95, pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshStandardMaterial({ color: ['#d8263c', '#f2c230', '#2f6fd0'][k % 3], roughness: 0.3 }));
            pinHead.position.set(Math.sin(angle) * 0.062, head.centre + 0.03, Math.cos(angle) * 0.062);
            head.group.add(pinHead);
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.02, 5), pinMaterial);
            shaft.position.set(Math.sin(angle) * 0.053, head.centre + 0.028, Math.cos(angle) * 0.053);
            shaft.rotation.set(Math.cos(angle) * 1.4, 0, -Math.sin(angle) * 1.4);
            head.group.add(shaft);
          }
        }
        if (a.tags) {
          const tag = s.label(String(index + 1 + (a.state === 'stripped' ? 40 : 0)), 0.03, 0.026, [x + 0.004, lift + 0.05, z + 0.062], '#3b2c20', '#f0e4c4');
          tag.rotation.z = (random() - 0.5) * 0.4;
          tag.rotation.x = -0.12;
          s.rod([x, lift + 0.085, z + 0.012], [x + 0.004, lift + 0.062, z + 0.061], 0.0008, s.material('#8a2a2a'));
        }
      }
    });
    // Paint pot and brush wherever painting is under way.
    if (a.state === 'half' || a.state === 'progress') {
      const px = (tiers[tiers.length - 1] * pitch) / 2 - 0.02, pz = (tiers.length > 1 ? 0.07 : 0) + 0.11;
      s.cylinder(0.02, 0.018, 0.03, [px, 0.015, pz], s.material('#e9e4d8', { roughness: 0.3 }), 18);
      s.cylinder(0.017, 0.017, 0.003, [px, 0.03, pz], s.material('#d86a78', { roughness: 0.3 }), 18);
      s.rod([px - 0.012, 0.03, pz], [px + 0.05, 0.075, pz - 0.02], 0.0022, s.material('#2d2a26'), 0.003);
      s.rod([px - 0.022, 0.024, pz + 0.004], [px - 0.012, 0.03, pz], 0.0035, s.material('#d86a78'), 0.001);
    }
    return s.finish();
  },
});

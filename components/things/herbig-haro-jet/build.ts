import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, glow, hazePaint, hull, limb, makeNoise, rimPaint, star, tint, vec } from './cosmos';

const COLOURS = {
  green: 'Sulphur green-teal, eerie and chemical.',
  red: 'Hydrogen red-orange, hot and angry.',
  violet: 'Violet-magenta, theatrical and strange.',
  ice: 'Blue-white, cold and surgical.',
  doppler: 'Two-tone: one jet blue, the other red, as if one comes toward you and one flees.',
} as const;
const TONE: Record<keyof typeof COLOURS, [string, string]> = {
  green: ['#2fe0a8', '#2fe0a8'], red: ['#ff5a36', '#ff5a36'], violet: ['#c95cff', '#c95cff'], ice: ['#4f9dff', '#4f9dff'], doppler: ['#3f8dff', '#ff4a38'],
};

export default defineThing({
  questions: {
    colour: choice('What colour are the jets?', COLOURS),
    path: choice('What path do the beams take?', {
      straight: 'Ruler-straight needles.',
      corkscrew: 'A widening corkscrew, twisting as it goes.',
      wobbling: 'A lazy S-shaped wobble, as if the source were swaying.',
      kinked: 'Straight, then knocked aside at a sharp angle where it glanced off something.',
    }),
    knots: choice('How many bright knots ride along each beam?', {
      none: 'None: a clean unbroken beam.',
      few: 'Two or three well-spaced pulses.',
      many: 'A dense string of beads, a stutter.',
    }),
    sides: choice('How balanced are the two jets?', {
      symmetric: 'Evenly matched, a perfect mirror.',
      lopsided: 'One long and strong, the other short and stunted.',
      single: 'One-sided: a single jet, the other hidden or never fired.',
    }),
    aim: choice('How is the outflow aimed?', {
      upright: 'Straight up and down, a fountain.',
      leaning: 'Tilted, like a thrown spear in flight.',
      level: 'Lying level, a lance across the sky.',
    }),
    source: choice('What hides the young star at the centre?', {
      disc: 'A dark dusty disc seen edge-on, the jets leaving its poles.',
      cocoon: 'A lumpy dark cocoon the jets have punched through.',
      naked: 'Nothing: the small bright star itself is visible.',
    }),
    hitting: choice('What are the jets running into?', {
      void: 'Thin gas: each ends in one clean small bow.',
      cloud: 'A dense dark cloud bank: a big ragged splash with sparks thrown off.',
      shells: 'Their own earlier outbursts: two or three nested bows, one behind another.',
      fading: 'Nothing: they peter out into a dotted trail.',
    }),
    force: score('How hard is it firing?', ['A thin sputter', 'A steady stream', 'A furious blast, fat and blinding']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const white = new THREE.Color('#ffffff');
    const force = a.force;
    const fat = mix(0.7, 1.5, force);
    const tilt = { upright: 0.04, leaning: 0.55, level: Math.PI / 2 - 0.08 }[a.aim] + (random() - 0.5) * 0.08;
    const lean = random() < 0.5 ? -1 : 1;
    const axis = vec(Math.sin(tilt) * lean, Math.cos(tilt), 0).normalize();
    const p = vec(Math.cos(tilt) * lean, -Math.sin(tilt), 0).normalize();
    const q = vec(0, 0, 1);
    const turns = mix(2, 3.5, random()), phase = random() * 6.28, kinkAt = mix(0.45, 0.65, random());
    const kinkTo = axis.clone().applyAxisAngle(q, mix(0.5, 0.8, random()) * (random() < 0.5 ? -1 : 1));
    const sway = mix(0.25, 0.6, mood.energy);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const shade = new THREE.Color();
    const dustLow = new THREE.Color('#0e0d1b').lerp(new THREE.Color('#1b0e09'), mood.warmth);
    const dustHigh = new THREE.Color('#2f3154').lerp(new THREE.Color('#57331f'), mood.warmth);
    const darkLump = (radius: number, at: THREE.Vector3, squash: THREE.Vector3, rimColour: THREE.Color) => {
      const geometry = blob(radius, (d) => 1 + 0.3 * noise(d.x * 1.8 + at.x, d.y * 1.8 + at.y, d.z * 1.8, 4), 12);
      geometry.scale(squash.x, squash.y, squash.z);
      geometry.computeVertexNormals();
      tint(geometry, (v) => shade.copy(dustLow).lerp(dustHigh, 0.5 + 0.5 * noise(v.x * 1.4, v.y * 1.4, v.z * 1.4, 3)));
      const group = new THREE.Group();
      const body = new THREE.Mesh(geometry, dust);
      body.castShadow = body.receiveShadow = true;
      group.add(body, new THREE.Mesh(hull(geometry, () => radius * 0.06), rimPaint(rimColour)));
      group.position.copy(at);
      s.root.add(group);
      return group;
    };

    const travellers: { node: THREE.Object3D; u: number; at: (u: number) => THREE.Vector3; size: number; end: number }[] = [];
    const jets = a.sides === 'single' ? [1] : [1, -1];
    jets.forEach((sign, index) => {
      const tone = new THREE.Color(TONE[a.colour][index]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb070' : '#a0c8ff'), Math.abs(mood.warmth - 0.5) * 0.3);
      const hot = tone.clone().lerp(white, mix(0.2, 0.45, mood.cheer));
      const length = (a.sides === 'lopsided' && sign < 0 ? 2 : a.sides === 'single' ? 6.6 : a.sides === 'lopsided' ? 5.2 : 4.4) * mix(0.85, 1.1, random()) * mix(0.85, 1.1, force);
      const at = (u: number) => {
        const point = axis.clone().multiplyScalar(sign * u * length);
        if (a.path === 'corkscrew') {
          const angle = u * turns * Math.PI * 2 + phase;
          point.addScaledVector(p, Math.cos(angle) * 0.42 * u * sign).addScaledVector(q, Math.sin(angle) * 0.42 * u);
        } else if (a.path === 'wobbling') point.addScaledVector(p, sign * sway * Math.sin(u * Math.PI * 2.3) * u).addScaledVector(q, sway * 0.4 * Math.sin(u * Math.PI * 1.4) * u);
        else if (a.path === 'kinked' && u > kinkAt) point.copy(axis).multiplyScalar(sign * kinkAt * length).addScaledVector(kinkTo, sign * (u - kinkAt) * length);
        return point;
      };
      const reach = a.hitting === 'fading' ? 0.72 : 1;
      const samples = Array.from({ length: 49 }, (_unused, i) => at((i / 48) * reach));
      const core = new THREE.Mesh(limb(samples, { rings: 96, sides: 8, radius: (t) => fat * mix(0.085, 0.05, t) }), new THREE.MeshBasicMaterial({ color: hot }));
      const sheath = new THREE.Mesh(limb(samples, { rings: 96, sides: 10, radius: (t) => fat * mix(0.13, 0.2, t) }), hazePaint(tone, 0.4));
      s.root.add(core, sheath);

      const end = at(1);
      const heading = end.clone().sub(at(0.96)).normalize();
      const bow = (centre: THREE.Vector3, width: number, opacity: number, ragged: number) => {
        const profile: THREE.Vector2[] = [];
        for (let i = 0; i <= 14; i++) profile.push(new THREE.Vector2(width * Math.sqrt(i / 14) + 0.001, -width * 1.15 * (i / 14)));
        const geometry = new THREE.LatheGeometry(profile, 28);
        if (ragged > 0) {
          const position = geometry.getAttribute('position') as THREE.BufferAttribute;
          const v = new THREE.Vector3();
          for (let i = 0; i < position.count; i++) {
            v.fromBufferAttribute(position, i);
            // Sample on the angle so the lathe seam stays closed.
            const angle = Math.atan2(v.z, v.x), depth = -v.y / width;
            const push = 1 + ragged * depth * noise(Math.cos(angle) * 2.2 + centre.x, Math.sin(angle) * 2.2, depth * 2.5 + centre.y, 3);
            position.setXYZ(i, v.x * push, v.y * (1 + ragged * 0.6 * noise(Math.cos(angle) * 3, Math.sin(angle) * 3, 7 + centre.y, 2) * depth), v.z * push);
          }
          geometry.computeVertexNormals();
        }
        const shell = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: tone.clone().lerp(white, 0.15), transparent: true, opacity, side: THREE.DoubleSide }));
        const crest = new THREE.Mesh(new THREE.SphereGeometry(width * 0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: hot }));
        crest.scale.y = 0.6;
        crest.position.y = -width * 0.05;
        const group = new THREE.Group();
        group.add(shell, crest);
        group.position.copy(centre);
        group.quaternion.setFromUnitVectors(vec(0, 1, 0), heading);
        s.root.add(group);
        const flare = glow(width * 1.15, tone, 0.6, 3);
        flare.position.copy(centre);
        s.root.add(flare);
      };
      const wear = mix(0.1, 0.45, mood.wear);
      if (a.hitting === 'void') bow(end, 0.5 * fat, 0.7, wear);
      if (a.hitting === 'shells') {
        const count = 2 + Math.floor(random() * 2);
        for (let i = 0; i < count; i++) bow(at(1 - i * 0.2), 0.62 * fat * (1 - i * 0.24), 0.7 - i * 0.12, wear);
      }
      if (a.hitting === 'cloud') {
        bow(end, 0.62 * mix(0.9, 1.2, force), 0.75, 0.75);
        darkLump(0.75, end.clone().addScaledVector(heading, 0.5), vec(1.5, 0.45, 1.35), tone).quaternion.setFromUnitVectors(vec(0, 1, 0), heading);
        const sparks = 6 + Math.floor(random() * 5 + mood.density * 5);
        const paint = new THREE.MeshBasicMaterial({ color: hot });
        for (let i = 0; i < sparks; i++) {
          const out = vec(random() - 0.5, random() - 0.5, random() - 0.5).normalize().addScaledVector(heading, -0.5).normalize();
          const spark = new THREE.Mesh(new THREE.OctahedronGeometry(mix(0.04, 0.11, random()), 0), paint);
          spark.position.copy(end).addScaledVector(out, fat * mix(0.7, 1.7, random()));
          spark.scale.y = 2.2;
          spark.quaternion.setFromUnitVectors(vec(0, 1, 0), out);
          s.root.add(spark);
        }
      }
      if (a.hitting === 'fading') {
        const paint = new THREE.MeshBasicMaterial({ color: tone });
        for (let i = 0; i < 6; i++) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(fat * mix(0.07, 0.02, i / 5), 10, 8), paint);
          dot.position.copy(at(mix(0.76, 1, i / 5)));
          s.root.add(dot);
        }
      }

      // Pulses: bright beads that run out along the beam and are born again at the source.
      const beads = { none: 0, few: 2 + Math.floor(random() * 2), many: 6 + Math.floor(random() * 3 + mood.density * 2) }[a.knots];
      const beadPaint = new THREE.MeshBasicMaterial({ color: hot });
      const beadHalo = hazePaint(tone, 0.4);
      for (let i = 0; i < beads; i++) {
        const node = new THREE.Group();
        const size = fat * mix(0.13, 0.2, random());
        const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), beadPaint);
        bead.scale.set(size, size * 1.7, size);
        const veil = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), beadHalo);
        veil.scale.set(size * 1.8, size * 2.6, size * 1.8);
        node.add(bead, veil);
        s.root.add(node);
        travellers.push({ node, u: (i + random() * 0.6) / beads, at, size, end: reach * 0.96 });
      }
    });

    const settle = () => {
      for (const bead of travellers) {
        const u = 0.06 + (bead.u % 1) * (bead.end - 0.06);
        const here = bead.at(u), next = bead.at(u + 0.01);
        bead.node.position.copy(here);
        bead.node.quaternion.setFromUnitVectors(vec(0, 1, 0), next.sub(here).normalize());
        bead.node.scale.setScalar(0.45 + 0.75 * Math.sin(Math.PI * (bead.u % 1)) ** 0.6);
      }
    };
    settle();

    const amber = new THREE.Color('#ffb24a');
    if (a.source === 'disc') {
      const disc = new THREE.Group();
      const profile = [[0.16, 0.02], [0.5, 0.06], [0.95, 0.13], [1.3, 0.16], [1.42, 0.08], [1.44, 0], [1.42, -0.08], [1.3, -0.16], [0.95, -0.13], [0.5, -0.06], [0.16, -0.02]].map(([x, y]) => new THREE.Vector2(x * 0.68, y * 0.68));
      const plate = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), new THREE.MeshStandardMaterial({ color: dustHigh.clone().lerp(dustLow, 0.5), roughness: 0.95 }));
      plate.castShadow = true;
      const lit = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: amber }));
      lit.rotation.x = Math.PI / 2;
      const edge = new THREE.Mesh(new THREE.TorusGeometry(0.985, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: amber.clone().lerp(dustHigh, 0.4) }));
      edge.rotation.x = Math.PI / 2;
      disc.add(plate, lit, edge);
      disc.quaternion.setFromUnitVectors(vec(0, 1, 0), axis);
      s.root.add(disc, glow(0.5, amber, 0.9, 4));
    } else if (a.source === 'cocoon') {
      darkLump(0.55, vec(0, 0, 0), vec(1.15, 0.85, 1.1), amber).quaternion.setFromUnitVectors(vec(0, 1, 0), axis);
      for (const sign of jets) {
        const vent = glow(0.3, amber, 1.2, 3);
        vent.position.copy(axis).multiplyScalar(sign * 0.5);
        s.root.add(vent);
      }
    } else {
      s.root.add(star(0.2, '#ffb347', 2.6, 1.2, 4.5));
    }

    const speed = mix(0.04, 0.3, mood.energy) * mix(0.7, 1.4, force);
    return s.finish({
      update: (dt) => {
        for (const bead of travellers) bead.u = (bead.u + dt * speed) % 1;
        settle();
      },
    });
  },
});

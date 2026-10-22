import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { limb, monkeyHead, tufts, type Mouth, type V3 } from './primate';

const EXPRESSIONS = {
  bliss: 'Eyes shut, face tipped up, the bliss of hot water in cold air.',
  drowsy: 'A slow heavy-lidded blink, half asleep.',
  grumpy: 'A flat grumpy stare under a heavy brow, mouth turned down.',
  grooming: 'Wide-eyed concentration, lips pushed forward, one hand up picking through fur.',
} as const;

export default defineThing({
  questions: {
    expression: choice('What is its face doing?', EXPRESSIONS),
    snow: score('How much snow has settled on its head?', ['None', 'A dusting of flakes', 'A white skullcap', 'A full heaped cap it has not bothered to shake off']),
    steam: score('How much steam is rising?', ['Clear cold air', 'Thin wisps', 'Rolling steam', 'A dense bank of vapour']),
    age: choice('Who is bathing?', {
      adult: 'An adult in its prime, grey-brown and plush.',
      elder: 'A pale silver elder with a deep crimson face and thin fur.',
      mother: 'A mother with a dark-furred infant riding on her shoulder.',
    }),
    wet: score('How far up has the fur been soaked and slicked down?', ['Dry and fluffed to the waterline', 'Dark and wet to the shoulders', 'Slicked to the chin', 'Just surfaced: plastered flat to the crown']),
    company: choice('Is it alone?', {
      alone: 'Alone in the pool.',
      pair: 'Two pressed together shoulder to shoulder for warmth.',
    }),
    pool: choice('What holds the water?', {
      rocks: 'A natural pool ringed with dark boulders.',
      tub: 'A round cedar soaking tub bound with copper bands.',
      snowbank: 'A melt-hole in deep smooth snow, no edge but the drift.',
    }),
    floating: choice('What is floating in the water with it?', {
      nothing: 'Nothing but ripples.',
      yuzu: 'Bright yellow yuzu fruit bobbing, a midwinter bath.',
      bucket: 'A small wooden wash bucket drifting on its side.',
      leaves: 'A few red maple leaves left over from autumn.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const radius = a.company === 'pair' ? 0.5 : 0.44;
    const level = 0.16;
    const snowWhite = s.material('#f6f8fb', { roughness: 0.9 });
    const water = s.material(new THREE.Color('#5f9ea0').lerp(new THREE.Color('#8fa9a0'), mood.warmth * 0.5), { roughness: 0.12, metalness: 0.1 });
    s.cylinder(radius, radius, level, [0, level / 2, 0], water, 40);

    // The edge.
    if (a.pool === 'rocks') {
      const rock = s.material('#55565a', { roughness: 1 });
      const count = 11;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2 + random() * 0.2, size = 0.1 + random() * 0.07;
        const x = Math.cos(t) * (radius + size * 0.5), z = Math.sin(t) * (radius + size * 0.5);
        const boulder = s.mesh(new THREE.DodecahedronGeometry(size, 1), rock, [x, size * 0.55, z]);
        boulder.scale.set(1.2, 0.8 + random() * 0.4, 1);
        boulder.rotation.set(random() * 3, random() * 3, random() * 3);
        if (a.snow > 0.15) s.ball([size * 0.95, size * (0.15 + a.snow * 0.35), size * 0.85], [x, size * 1.1 + 0.02, z], snowWhite, 10);
      }
    } else if (a.pool === 'tub') {
      const cedar = s.material('#b98350', { roughness: 0.8 }), copper = s.material('#b9673a', { metalness: 0.8, roughness: 0.35 });
      s.lathe([[radius, 0], [radius + 0.045, 0], [radius + 0.045, level + 0.09], [radius, level + 0.09], [radius, level]], cedar);
      for (let i = 0; i < 26; i++) {
        const t = (i / 26) * Math.PI * 2;
        s.box([0.006, level + 0.09, 0.004], [Math.cos(t) * (radius + 0.046), (level + 0.09) / 2, Math.sin(t) * (radius + 0.046)], s.material('#7d5630')).rotation.y = -t + Math.PI / 2;
      }
      for (const y of [0.05, level + 0.03]) s.ring(radius + 0.048, 0.008, [0, y, 0], copper).rotation.x = Math.PI / 2;
      if (a.snow > 0.2) for (let i = 0; i < 12; i++) {
        const t = random() * Math.PI * 2;
        s.ball([0.07, 0.02 + a.snow * 0.03, 0.035], [Math.cos(t) * (radius + 0.022), level + 0.095, Math.sin(t) * (radius + 0.022)], snowWhite, 8).rotation.y = -t + Math.PI / 2;
      }
    } else {
      s.lathe([[radius - 0.01, level - 0.02], [radius + 0.05, level + 0.07], [radius + 0.16, level + 0.1], [radius + 0.3, level + 0.06], [radius + 0.4, 0]], snowWhite);
      for (let i = 0; i < 7; i++) {
        const t = random() * Math.PI * 2, size = 0.07 + random() * 0.08;
        s.ball([size, size * 0.6, size], [Math.cos(t) * (radius + 0.2), level + 0.06, Math.sin(t) * (radius + 0.2)], snowWhite, 10);
      }
    }

    // A bather: shoulders breaking the surface, and the head.
    const wetTone = '#4f463d';
    const bather = (x: number, z: number, turn: number, size: number, expression: keyof typeof EXPRESSIONS, elder: boolean) => {
      const m = new Sculpture(context);
      const fur = elder ? '#b3aca0' : '#8a7c6a', tip = elder ? '#f4f2ee' : '#e9e4da';
      const skin = elder ? '#b8262b' : '#d8433c';
      const slick = a.wet;
      const shoulderY = 0.07 * size;
      m.ball([0.2 * size, 0.15 * size, 0.165 * size], [0, shoulderY - 0.03 * size, -0.02 * size], m.material(slick > 0.2 ? wetTone : fur, { roughness: slick > 0.2 ? 0.45 : 0.95 }), 18);
      if (slick < 0.45) tufts(m, {
        centre: [0, shoulderY - 0.03 * size, -0.02 * size], radii: [0.2 * size, 0.15 * size, 0.165 * size], count: 200, colour: fur, tip, length: 0.07 * size, width: 0.014 * size,
        comb: [0, -1, 0], combAmount: 0.45, keep: (d) => d.y > mix(-0.1, 0.75, slick / 0.45), ragged: 0.3 + mood.wear * 0.3,
      });
      const soaked = slick > 0.8;
      const mouth: Mouth = ({ bliss: 'closed', drowsy: 'closed', grumpy: 'frown', grooming: 'pout' } as const)[expression];
      const head = monkeyHead(context, {
        skin, fur: soaked ? wetTone : fur, tip: soaked ? '#7a7064' : tip, iris: '#a8691c', ear: 0.7, muzzle: 0.85, brow: expression === 'grumpy' ? 1 : 0.5,
        eyeOpen: { bliss: 0, drowsy: 0.38, grumpy: 0.75, grooming: 1.15 }[expression], mouth, cheek: 0,
        furLength: soaked ? 0.12 : mix(0.5, 0.3, slick) * (elder ? 0.8 : 1), furCount: soaked ? 160 : 420,
        ruff: soaked ? 0 : mix(0.75, 0.3, slick), ragged: 0.25 + mood.wear * 0.35,
      });
      const R = 0.105 * size;
      head.scale.setScalar(R);
      head.position.set(0, shoulderY + 0.11 * size + R * 0.75, 0.03 * size);
      head.rotation.set(expression === 'bliss' ? -0.32 : expression === 'grooming' ? 0.12 : -0.08, (random() - 0.5) * 0.3, (random() - 0.5) * 0.16);
      m.root.add(head);
      if (a.snow > 0.12) {
        const pile = m.ball([R * mix(0.5, 0.86, a.snow), R * mix(0.08, 0.5, a.snow), R * mix(0.5, 0.84, a.snow)], [0, head.position.y + R * mix(0.9, 1.05, a.snow), 0.0], snowWhite, 16);
        pile.rotation.x = head.rotation.x;
        for (const side of [-1, 1]) m.ball([0.05 * size, 0.012 + a.snow * 0.02, 0.04 * size], [side * 0.13 * size, shoulderY + 0.085 * size, -0.02], snowWhite, 10);
      }
      // Ripples where it breaks the surface.
      const ripple = new THREE.MeshStandardMaterial({ color: '#dff1f0', roughness: 0.2, emissive: '#bfe3e0', emissiveIntensity: 0.25 });
      for (let i = 0; i < 2; i++) m.ring(0.24 * size + i * 0.055, 0.004, [0, 0.003, -0.02], ripple).rotation.x = Math.PI / 2;
      m.root.position.set(x, level, z);
      m.root.rotation.y = turn;
      s.root.add(m.root);
      return { m, head, R, skin, fur: slick > 0.2 ? wetTone : fur, size };
    };

    const pair = a.company === 'pair';
    const elder = a.age === 'elder';
    const main = bather(pair ? 0.115 : 0, 0, pair ? -0.22 : 0, 1, a.expression, elder);
    const heads = [main.head];
    let partner: ReturnType<typeof bather> | null = null;
    if (pair) {
      partner = bather(-0.125, 0.01, 0.25, 0.88, a.expression === 'bliss' ? 'drowsy' : 'bliss', false);
      heads.push(partner.head);
    }
    if (a.expression === 'grooming') {
      // One hand out of the water, picking.
      const target: V3 = pair ? [-0.19, 0.25, 0.04] : [-0.1, 0.1, 0.17];
      limb(main.m, [[0.15, 0.08, 0.05], [0.08, 0.01, 0.2], target], 0.04, 0.028, main.m.material(main.fur));
      main.m.ball([0.03, 0.025, 0.03], target, main.m.material(main.skin), 10);
      if (!pair) limb(main.m, [[-0.15, 0.08, 0.05], [-0.2, 0.0, 0.18], [-0.07, 0.07, 0.19]], 0.04, 0.03, main.m.material(main.fur));
    }
    if (a.age === 'mother') {
      const infant = monkeyHead(context, { skin: '#e58f84', fur: '#3d3028', tip: '#5a483b', iris: '#3a2412', ear: 1.5, muzzle: 0.5, brow: 0.1, eyeOpen: 1.1, eyeSize: 1.3, mouth: 'closed', cheek: 0, furLength: 0.3, furCount: 200 });
      infant.scale.setScalar(0.058);
      infant.position.set(0.15, 0.2, -0.0);
      infant.rotation.set(-0.1, 0.25, -0.2);
      main.m.root.add(infant);
      main.m.ball([0.06, 0.07, 0.055], [0.16, 0.12, -0.03], main.m.material('#3d3028', { roughness: 0.95 }), 12);
      limb(main.m, [[0.14, 0.14, 0.0], [0.1, 0.13, 0.08], [0.04, 0.16, 0.1]], 0.017, 0.013, main.m.material('#3d3028'));
      heads.push(infant);
    }

    // Floating things.
    const spot = (): V3 => {
      const t = mix(0.15, 0.85, random()) * Math.PI + (random() < 0.3 ? Math.PI : 0), r = radius * mix(0.62, 0.86, random());
      return [Math.cos(t) * r, level, Math.sin(t) * r];
    };
    const bobbing: THREE.Object3D[] = [];
    if (a.floating === 'yuzu') {
      const peel = s.material('#f4c61f', { roughness: 0.55, emissive: '#a87a00', emissiveIntensity: 0.25 });
      for (let i = 0; i < 4 + Math.round(mood.density * 7); i++) {
        const [x, y, z] = spot();
        bobbing.push(s.ball([0.04, 0.035, 0.04], [x, y + 0.008, z], peel, 12));
        s.ball([0.006, 0.006, 0.006], [x, y + 0.043, z], s.material('#4d6b2a'), 6);
      }
    } else if (a.floating === 'bucket') {
      const wood = s.material('#c79a62'), band = s.material('#3b3b3b', { metalness: 0.6 });
      const bucket = new Sculpture(context);
      bucket.lathe([[0.075, 0], [0.09, 0.13], [0.08, 0.13], [0.066, 0.01], [0, 0.01]], wood);
      for (const y of [0.03, 0.1]) bucket.ring(0.079 + y * 0.11, 0.005, [0, y, 0], band).rotation.x = Math.PI / 2;
      const [x, , z] = spot();
      bucket.root.position.set(x, level + 0.045, Math.abs(z));
      bucket.root.rotation.set(1.15, random() * 6, 0.3);
      s.root.add(bucket.root);
      bobbing.push(bucket.root);
    } else if (a.floating === 'leaves') {
      for (let i = 0; i < 5 + Math.round(mood.density * 8); i++) {
        const [x, y, z] = spot();
        const leaf = s.mesh(new THREE.CircleGeometry(0.035, 5), new THREE.MeshStandardMaterial({ color: ['#c62c1e', '#e0561b', '#a81f2b'][i % 3], side: THREE.DoubleSide, roughness: 0.7 }), [x, y + 0.004, z]);
        leaf.rotation.set(-Math.PI / 2, 0, random() * 6);
      }
    }

    // Snow in the fur and steam off the water.
    if (a.snow > 0.05) {
      const flakes = Array.from({ length: Math.round(a.snow * 40) + 6 }, () => {
        const t = random() * Math.PI * 2, r = random() * radius * 0.5;
        return { at: [Math.cos(t) * r, level + 0.12 + random() * 0.5, Math.sin(t) * r] as const, size: 0.006 + random() * 0.006 };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5, transparent: true, opacity: 0.95, depthWrite: false }), flakes);
    }
    const puffs: { mesh: THREE.Mesh; base: number; drift: number; phase: number }[] = [];
    const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.1, 0.2, a.steam), depthWrite: false, roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25 });
    for (let i = 0; i < Math.round(a.steam * 16); i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * radius * 0.95, size = mix(0.06, 0.16, random());
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), vapour);
      mesh.scale.set(size, size * 1.3, size);
      mesh.position.set(Math.cos(t) * r, level + 0.08 + random() * 0.5, Math.sin(t) * r);
      s.root.add(mesh);
      puffs.push({ mesh, base: mesh.position.x, drift: (random() - 0.5) * 0.06, phase: random() });
    }

    const pace = mix(0.15, 1.2, mood.energy);
    const yaws = heads.map((head) => head.rotation.y);
    return s.finish({
      footprint: radius + 0.15,
      update: (_dt, time) => {
        for (const puff of puffs) {
          const rise = (time * pace * 0.25 + puff.phase) % 1;
          puff.mesh.position.y = level + 0.06 + rise * 0.6;
          puff.mesh.position.x = puff.base + Math.sin(time * pace + puff.phase * 9) * 0.03 + puff.drift * rise;
        }
        heads.forEach((head, i) => { head.rotation.y = yaws[i] + Math.sin(time * pace * 0.8 + i * 2) * 0.06 * mood.energy; });
        bobbing.forEach((thing, i) => { thing.position.y += Math.sin(time * pace * 2 + i) * 0.00015; });
      },
    });
  },
});

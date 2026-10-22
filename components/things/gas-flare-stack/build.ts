import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FLAMES = {
  orange: 'Rich dirty orange with yellow heart, the ordinary flare.',
  yellow: 'Clean bright yellow-white, hot and almost smokeless.',
  red: 'Deep sooty red, starved of air and heavy.',
  blue: 'Lean blue with pale tips, nearly invisible by day and eerie at night.',
  green: 'A sickly chemical green, something in the gas that should not be there.',
} as const;
const TONES: Record<keyof typeof FLAMES, [string, string, string]> = {
  orange: ['#fff3a6', '#ffae2b', '#ff5a16'],
  yellow: ['#ffffff', '#fff2a0', '#ffcf3a'],
  red: ['#ffd28a', '#ff5a2a', '#c21d18'],
  blue: ['#eef8ff', '#74bbff', '#2f6fe2'],
  green: ['#f3ffd2', '#93ea5c', '#2dac4c'],
};

export default defineThing({
  questions: {
    kind: choice('What kind of flare is it?', {
      stack: 'A tall slender pipe stack held up by guy wires, its flame far overhead.',
      candle: 'A short lease candlestick flare on a braced stand, flame just above head height.',
      pit: 'A ground pit flare: a pipe laid to an earth-bermed pit where the flame roars sideways.',
      twin: 'Twin stacks side by side on one base, one high-pressure and one low.',
    }),
    flame: score('How big is the flame?', ['A pilot light barely alive', 'A steady working flame', 'A roaring upset flare that lights the whole lease']),
    colour: choice('What colour does it burn?', FLAMES),
    wind: score('How hard is the wind pushing the flame?', ['Dead still: it stands straight up', 'A steady breeze leans it over', 'A gale tears it out flat']),
    smoke: choice('What smoke does it make?', {
      none: 'None: a clean burn.',
      wisps: 'Thin grey wisps trailing off the tip.',
      black: 'A rolling black plume of unburnt oil carried downwind.',
    }),
    state: choice('What is its story right now?', {
      burning: 'Burning as it does every hour of every day.',
      sputtering: 'Sputtering: the flame breaks into ragged separate tongues, about to go out.',
      out: 'Out and cold: a blackened tip on a played-out lease, one guy wire snapped.',
    }),
    ground: choice('What is the ground like around it?', {
      scorched: 'A wide circle baked black and glassy.',
      gravel: 'A neat pale gravel pad inside a low berm.',
      burnt_grass: 'Dry grass burned back in a ragged ring, ash at the middle.',
    }),
    kit: choice('What stands at its base?', {
      bare: 'Nothing but the pipe coming out of the ground.',
      knockout: 'A knockout drum: a horizontal steel vessel on saddles piped into the flare.',
      igniter: 'An igniter panel on a post with a small solar panel.',
      both: 'A knockout drum and an igniter panel, a properly permitted flare.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.state !== 'out';
    const tones = TONES[a.colour];
    const rust = mood.wear * 0.5 + (a.state === 'out' ? 0.3 : 0);
    const metal = (hex: string, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#7a4528'), rust), roughness: 0.6 + rust * 0.3, metalness: 0.35, ...options });
    const pipe = metal('#8d9496'), burnt = metal('#2a2523', { metalness: 0.1 }), safety = metal('#e3b81f', { metalness: 0 }), dark = metal('#35393b');
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };
    const size = mix(0.25, 1, a.flame) * (a.state === 'sputtering' ? 0.7 : 1);
    const lean = a.kind === 'pit' ? mix(0.75, 1.3, a.wind) : a.wind * 1.25;

    // Ground: an irregular disc coloured from the heart outward.
    const reach = a.kind === 'pit' ? 7.5 : a.kind === 'stack' || a.kind === 'twin' ? 6.5 : 4.2;
    {
      const disc = new THREE.CircleGeometry(reach, 40, 0, Math.PI * 2);
      const position = disc.attributes.position as THREE.BufferAttribute;
      const colours = new Float32Array(position.count * 3);
      const heart = new THREE.Color(a.ground === 'gravel' ? '#8f8a7c' : '#17120f');
      const edge = new THREE.Color({ scorched: '#4a372a', gravel: '#d2cbb8', burnt_grass: '#b59a56' }[a.ground]);
      const glow = new THREE.Color(tones[2]);
      const wobble = Array.from({ length: 41 }, () => (a.ground === 'gravel' ? 0.98 : 0.8 + random() * 0.25));
      wobble[40] = wobble[0];
      for (let i = 0; i < position.count; i++) {
        const scale = i === 0 ? 0 : wobble[(i - 1) % 41];
        position.setXY(i, position.getX(i) * scale, position.getY(i) * scale);
        const colour = i === 0 ? heart.clone() : edge.clone();
        if (i === 0 && lit) colour.lerp(glow, 0.25 + size * 0.3);
        colour.toArray(colours, i * 3);
      }
      disc.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      disc.rotateX(-Math.PI / 2);
      const pad = s.mesh(disc, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.ground === 'scorched' ? 0.45 : 0.95 }), [a.kind === 'pit' ? 1 : 0, 0.02, 0]);
      pad.castShadow = false;
      if (a.ground !== 'gravel') {
        // A hard dark core so the scorch reads at any size.
        const core = s.mesh(new THREE.CircleGeometry(reach * 0.42, 9), new THREE.MeshStandardMaterial({ color: heart, roughness: 0.5 }), [a.kind === 'pit' ? 1 : 0, 0.035, 0]);
        core.rotation.x = -Math.PI / 2; core.rotation.z = random() * 3; core.castShadow = false;
      }
      if (a.ground === 'gravel') {
        const berm = s.ring(reach * 0.97, 0.3, [a.kind === 'pit' ? 1 : 0, 0, 0], s.material('#b9ad92', { roughness: 1 }));
        berm.rotation.x = Math.PI / 2; berm.scale.z = 1.3;
      }
      if (a.ground === 'burnt_grass') {
        const tuft = new THREE.ConeGeometry(0.22, 0.7, 5);
        tuft.translate(0, 0.35, 0);
        s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Array.from({ length: 70 + Math.round(mood.density * 60) }, () => {
          const angle = random() * Math.PI * 2, radius = reach * mix(0.6, 1.02, random());
          const charred = radius < reach * 0.78;
          return { at: [Math.cos(angle) * radius + (a.kind === 'pit' ? 1 : 0), 0, Math.sin(angle) * radius] as [number, number, number], size: charred ? 0.5 + random() * 0.4 : 0.8 + random() * 0.8, color: charred ? '#2a2019' : new THREE.Color().setHSL(0.12 + random() * 0.05, 0.5, 0.45 + random() * 0.15) };
        }));
      }
    }

    // The pipework. `tips` are where flame comes out, with the direction it leaves.
    const tips: { at: THREE.Vector3; scale: number }[] = [];
    const stack = (x: number, z: number, tall: number, radius: number, guyed: boolean) => {
      s.box([radius * 7, 0.35, radius * 7], [x, 0.17, z], s.material('#b5b0a2', { roughness: 1 }));
      s.cylinder(radius, radius * 1.15, tall, [x, tall / 2, z], pipe, 14);
      for (let y = 3; y < tall - 1; y += 3.4) s.cylinder(radius * 1.7, radius * 1.7, 0.1, [x, y, z], dark, 14);
      // Flare tip: a wider burner with a wind shroud, blackened.
      s.cylinder(radius * 1.5, radius * 1.05, tall * 0.06, [x, tall + tall * 0.03, z], burnt, 14);
      s.cylinder(radius * 2.1, radius * 2.1, tall * 0.07, [x, tall + tall * 0.085, z], burnt, 14);
      s.cylinder(radius * 1.2, radius * 1.2, tall * 0.2, [x, tall * 0.9, z], burnt, 14).scale.set(1.02, 1, 1.02);
      // Pilot gas line clipped up the side.
      s.rod([x + radius * 1.6, 0.4, z], [x + radius * 1.6, tall + tall * 0.1, z], radius * 0.18, safety);
      if (guyed) {
        const anchor = tall * 0.42;
        for (let i = 0; i < 3; i++) {
          const angle = Math.PI / 2 + i * Math.PI * 2 / 3 + 0.2;
          const ax = x + Math.cos(angle) * anchor, az = z + Math.sin(angle) * anchor;
          const snapped = a.state === 'out' && i === 1;
          s.box([0.5, 0.3, 0.5], [ax, 0.15, az], s.material('#b5b0a2', { roughness: 1 }));
          for (const level of [0.55, 0.9]) {
            if (snapped && level > 0.6) { s.tube([[x, tall * level, z], [x + Math.cos(angle) * 0.6, tall * level * 0.6, z + Math.sin(angle) * 0.6], [x + Math.cos(angle) * 0.4, tall * level * 0.3, z + Math.sin(angle) * 0.5]], 0.035, dark); continue; }
            s.rod([ax, 0.3, az], [x, tall * level, z], 0.035, dark);
          }
          s.rod([ax, 0.3, az], [mix(ax, x, 0.16), mix(0.3, tall * 0.9, 0.16), mix(az, z, 0.16)], 0.09, safety);
        }
        s.cylinder(radius * 1.9, radius * 1.9, 0.14, [x, tall * 0.55, z], dark, 12);
      } else {
        for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3 + 0.5; s.rod([x + Math.cos(angle) * tall * 0.3, 0.1, z + Math.sin(angle) * tall * 0.3], [x, tall * 0.55, z], radius * 0.4, dark); }
      }
      tips.push({ at: new THREE.Vector3(x, tall * 1.12, z), scale: 1 });
    };
    let inlet: [number, number, number] = [0, 0.5, 0];
    if (a.kind === 'stack') { const tall = mix(13, 16, random()); stack(0, 0, tall, 0.17, true); }
    if (a.kind === 'candle') { stack(0, 0, mix(4, 5, random()), 0.14, false); }
    if (a.kind === 'twin') {
      const tall = mix(12, 14, random());
      stack(-0.6, 0, tall, 0.17, true);
      stack(0.6, 0, tall * 0.72, 0.11, false);
      tips[1].scale = 0.5;
      for (const y of [0.25, 0.45, 0.62]) s.rod([-0.6, tall * y, 0], [0.6, tall * y, 0], 0.05, dark);
      inlet = [-0.6, 0.5, 0];
    }
    if (a.kind === 'pit') {
      const earth = s.material(a.ground === 'gravel' ? '#b9ad92' : '#6b5440', { roughness: 1, flatShading: true });
      for (let i = 0; i < 11; i++) {
        const angle = -Math.PI * 0.72 + i / 10 * Math.PI * 1.44, radius = 4.2 + random() * 0.4;
        const mound = s.mesh(new THREE.IcosahedronGeometry(1, 1), earth, [1 + Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
        mound.scale.set(1.5 + random() * 0.5, 0.9 + random() * 0.6 + Math.cos(angle) * 0.5, 1.5 + random() * 0.5);
        mound.rotation.y = random() * 3;
      }
      s.rod([-7, 0.55, 0], [-1.2, 0.55, 0], 0.16, pipe);
      s.rod([-1.2, 0.55, 0], [-0.3, 0.95, 0], 0.2, burnt);
      for (const x of [-6, -4, -2]) { s.box([0.3, 0.42, 0.5], [x, 0.21, 0], dark); s.cylinder(0.24, 0.24, 0.08, [x + 0.6, 0.55, 0], dark, 12).rotation.z = Math.PI / 2; }
      s.rod([-7, 0.78, 0], [-0.5, 1.08, 0.1], 0.03, safety);
      tips.push({ at: new THREE.Vector3(-0.15, 1.0, 0), scale: 1.25 });
      inlet = [-7, 0.55, 0];
    }

    const wantsDrum = a.kit === 'knockout' || a.kit === 'both', wantsPanel = a.kit === 'igniter' || a.kit === 'both';
    if (wantsDrum) {
      const dx = a.kind === 'pit' ? -8.8 : -3.6, dz = a.kind === 'pit' ? 0 : 1.2;
      const vessel = s.mesh(new THREE.CapsuleGeometry(0.62, 2.2, 6, 18), metal('#c9cdc6'), [dx, 1.15, dz]);
      vessel.rotation.z = Math.PI / 2;
      for (const x of [-0.8, 0.8]) s.box([0.25, 0.75, 1.0], [dx + x, 0.37, dz], s.material('#b5b0a2', { roughness: 1 }));
      s.cylinder(0.1, 0.1, 0.5, [dx - 0.6, 1.95, dz], dark, 10);
      s.cylinder(0.16, 0.16, 0.06, [dx - 0.6, 2.2, dz], dark, 10);
      s.box([0.1, 0.8, 0.04], [dx + 0.3, 1.2, dz + 0.63], safety);
      s.tube([[dx + 1.4, 1.15, dz], [dx + 2.0, 1.0, dz], [mix(dx + 2, inlet[0], 0.6), 0.5, mix(dz, inlet[2], 0.6)], inlet], 0.13, pipe);
      s.tube([[dx - 1.4, 1.15, dz], [dx - 2.2, 0.9, dz], [dx - 2.8, 0.05, dz]], 0.13, pipe);
    } else if (a.kind !== 'pit') s.tube([[inlet[0] - 2.2, 0.02, 0.6], [inlet[0] - 1.6, 0.4, 0.4], inlet], 0.12, pipe);
    if (wantsPanel) {
      const px = a.kind === 'pit' ? -4.5 : 2.2, pz = a.kind === 'pit' ? 2.2 : 2.0;
      s.cylinder(0.05, 0.05, 2.5, [px, 1.25, pz], dark, 8);
      s.box([0.6, 0.75, 0.25], [px, 1.35, pz + 0.12], metal('#d7d9d2'));
      s.box([0.12, 0.12, 0.03], [px - 0.12, 1.5, pz + 0.26], metal(lit ? '#3fbf5a' : '#b3282a', { emissive: lit ? '#3fbf5a' : '#b3282a', emissiveIntensity: 0.6 }));
      const panel = s.box([0.95, 0.04, 0.6], [px, 2.55, pz], metal('#1c2a4a', { metalness: 0.6, roughness: 0.25 }));
      panel.rotation.x = 0.6;
      s.tube([[px, 0.6, pz], [px - 0.3, 0.05, pz - 0.3], [inlet[0] + 0.4, 0.3, inlet[2] + 0.3]], 0.025, safety);
    }

    // Flame: a cluster of teardrop tongues, each a pale solid heart inside two glowing shells.
    const profile = [[0, 0], [0.2, 0.05], [0.34, 0.2], [0.36, 0.38], [0.27, 0.6], [0.14, 0.82], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y));
    const drop = new THREE.LatheGeometry(profile, 14);
    const heart = new THREE.MeshBasicMaterial({ color: tones[0] });
    const middle = new THREE.MeshBasicMaterial({ color: tones[1], transparent: true, opacity: 0.9, depthWrite: false });
    const shell = new THREE.MeshBasicMaterial({ color: tones[2], transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const tongues: { node: THREE.Group; tall: number; wide: number; phase: number; rate: number; tilt: number }[] = [];
    const smokeStarts: THREE.Vector3[] = [];
    for (const tip of tips) {
      const fire = into(s.root, new THREE.Group());
      fire.position.copy(tip.at);
      fire.rotation.z = -lean;
      fire.visible = lit;
      const tall = mix(a.kind === 'candle' ? 1.2 : 2.2, a.kind === 'candle' ? 4.2 : 9, a.flame) * tip.scale * (a.state === 'sputtering' ? 0.7 : 1);
      const count = a.state === 'sputtering' ? 6 : 4 + Math.round(a.flame * 3);
      for (let i = 0; i < count; i++) {
        const main = i === 0;
        const node = into(fire, new THREE.Group());
        const h = main ? tall : tall * mix(0.35, 0.7, random()), w = (main ? tall * 0.7 : h * 0.7) * (a.state === 'sputtering' ? 0.75 : 1);
        const angle = random() * Math.PI * 2, out = main ? 0 : tall * (a.state === 'sputtering' ? 0.3 : 0.16);
        node.position.set(Math.cos(angle) * out, main ? 0 : random() * tall * (a.state === 'sputtering' ? 0.6 : 0.25), Math.sin(angle) * out);
        const tilt = main ? 0 : (random() - 0.5) * 0.7;
        for (const [material, k] of [[shell, 1], [middle, 0.78], [heart, 0.55]] as const) {
          const mesh = into(node, new THREE.Mesh(drop, material));
          mesh.scale.set(k, k, k);
          mesh.castShadow = false;
        }
        tongues.push({ node, tall: h, wide: w, phase: random() * 6.28, rate: 5 + random() * 7, tilt });
      }
      smokeStarts.push(tip.at.clone().add(new THREE.Vector3(Math.sin(lean) * tall * 0.85, Math.cos(lean) * tall * 0.85, 0)));
    }
    const flicker = (time: number) => {
      for (const tongue of tongues) {
        const wave = Math.sin(time * tongue.rate + tongue.phase), wave2 = Math.sin(time * tongue.rate * 1.7 + tongue.phase * 2);
        const amount = mix(0.06, 0.3, mood.energy);
        tongue.node.scale.set(tongue.wide * (1 - wave * amount * 0.5), tongue.tall * (1 + wave * amount), tongue.wide * (1 - wave2 * amount * 0.5));
        tongue.node.rotation.z = tongue.tilt + wave2 * amount * 0.5;
      }
    };
    flicker(random() * 10);

    // Smoke: low-polygon puffs growing as they rise and drift downwind.
    const puffs: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number }[] = [];
    if (a.smoke !== 'none' && lit || a.state === 'sputtering') {
      const heavy = a.smoke === 'black';
      const soot = new THREE.MeshStandardMaterial({ color: heavy ? '#1d1b1c' : '#8e8a88', roughness: 1, flatShading: true, transparent: !heavy, opacity: heavy ? 1 : 0.6, depthWrite: heavy });
      const puff = new THREE.IcosahedronGeometry(1, 1);
      const drift = 0.25 + a.wind * 1.5;
      for (const [index, start] of smokeStarts.entries()) {
        const count = heavy ? 13 : 6, scale = (heavy ? 1 : 0.55) * mix(0.7, 1.3, a.flame) * tips[index].scale;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1), along = (0.3 + i * (heavy ? 0.85 : 1.25)) * scale;
          const home = new THREE.Vector3(start.x + along * drift / Math.hypot(drift, 1) * 1.6 + (random() - 0.5) * 0.5 * scale, start.y + along / Math.hypot(drift, 1) * 1.1, start.z + (random() - 0.5) * 0.8 * scale);
          const mesh = s.mesh(puff, soot, home.toArray() as [number, number, number]);
          mesh.scale.setScalar(scale * mix(heavy ? 0.75 : 0.5, heavy ? 2.1 : 1.7, t) * (0.85 + random() * 0.3));
          mesh.rotation.set(random() * 3, random() * 3, 0);
          mesh.castShadow = false;
          puffs.push({ mesh, home, phase: random() * 6.28 });
        }
      }
    }

    return s.finish({
      update: (_dt, time) => {
        if (lit) flicker(time);
        for (const puff of puffs) { puff.mesh.position.y = puff.home.y + Math.sin(time * 0.8 + puff.phase) * 0.12; puff.mesh.rotation.y = time * 0.3 + puff.phase; }
      },
    });
  },
});

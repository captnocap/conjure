import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { MEDIA, TAU, agarPad, dome, gloss, painted, wobble } from './plate';

const HUES = {
  'blue-green': 'The classic dusty blue-green of bread mould.',
  'grey-green': 'A dull sage grey-green, like old lichen.',
  olive: 'Yellowish olive green, sulphurous.',
  soot: 'Sooty black-brown, like a scorch mark.',
  salmon: 'An unexpected powdery salmon pink.',
} as const;
const HUE_COLOUR: Record<keyof typeof HUES, string> = {
  'blue-green': '#3f8f88', 'grey-green': '#84a082', olive: '#a3a544', soot: '#34322c', salmon: '#dd9a8c',
};

export default defineThing({
  questions: {
    substrate: choice('What is the mould growing on?', {
      agar: 'A patch of agar in a culture dish: the laboratory specimen.',
      bread: 'A slice of white bread, the forgotten sandwich.',
      orange: 'An orange gone soft at the bottom of the fruit bowl.',
      cheese: 'A wedge of pale cheese from the back of the fridge.',
    }),
    hue: choice('What colour is the spore felt?', HUES),
    stage: choice('How far along is the colony?', {
      tuft: 'Young: a small white cottony tuft only just turning green at its heart.',
      ringed: 'Mature: a neat disc with clear concentric rings and a white felt border.',
      old: 'Old: dusty and dark, wrinkled with radial furrows, its centre collapsed into a crater.',
    }),
    extent: choice('How much of the surface has it taken?', {
      spot: 'One modest spot with clean surface around it.',
      bloom: 'One large bloom dominating the surface.',
      twin: 'Two colonies that have grown into each other, with a ridge where they meet.',
      takeover: 'Nearly everything: a main bloom and daughter colonies wherever spores landed.',
    }),
    brushes: score('How prominent are the brush-like spore heads standing up from it?', ['None, only flat felt', 'A fine stubble', 'A scattering of tall brushes', 'A dense forest of brushes']),
    story: choice('What else is going on around it?', {
      plain: 'Nothing else. Just the mould.',
      fleming: 'Bacterial colonies dot the surface but shrink and vanish in a clear ring around the mould.',
      exudate: 'Golden droplets of liquid have beaded on its surface.',
      spores: 'A faint cloud of spores is lifting off it and drifting away.',
      marked: 'Someone has drawn an arrow and a question mark beside it in marker.',
    }),
    medium: choice('If it is on agar, what kind?', MEDIA),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    let reach = 24;
    let surface: (x: number, z: number) => number = () => 0;

    if (a.substrate === 'agar') {
      const top = agarPad(s, reach, a.medium);
      surface = () => top;
    } else if (a.substrate === 'bread') {
      const shape = new THREE.Shape();
      const w = 23, h = 21;
      shape.moveTo(-w, -h);
      shape.lineTo(w, -h);
      shape.lineTo(w, h * 0.45);
      shape.bezierCurveTo(w * 1.18, h * 0.6, w * 1.05, h * 1.25, w * 0.45, h * 1.12);
      shape.bezierCurveTo(w * 0.2, h * 1.28, -w * 0.2, h * 1.28, -w * 0.45, h * 1.12);
      shape.bezierCurveTo(-w * 1.05, h * 1.25, -w * 1.18, h * 0.6, -w, h * 0.45);
      shape.closePath();
      const crumb = painted(256, 256, (ctx, cw, ch) => {
        ctx.fillStyle = '#efe2c2';
        ctx.fillRect(0, 0, cw, ch);
        for (let i = 0; i < 520; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(170,140,95,0.4)' : 'rgba(255,250,232,0.6)';
          ctx.beginPath();
          ctx.ellipse(random() * cw, random() * ch, 1 + random() * 4, 1 + random() * 3, random() * 3, 0, TAU);
          ctx.fill();
        }
      });
      crumb.wrapS = crumb.wrapT = THREE.RepeatWrapping;
      crumb.repeat.set(0.02, 0.02);
      const slice = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelSize: 0.7, bevelThickness: 0.7, bevelSegments: 2, curveSegments: 10 }),
        [s.material('#ffffff', { map: crumb, roughness: 0.95 }), s.material('#a9682f', { roughness: 0.85 })]);
      slice.castShadow = slice.receiveShadow = true;
      s.root.add(slice);
      slice.rotation.x = -Math.PI / 2;
      slice.position.set(0, 0.7, 1);
      surface = () => 7.4;
      reach = 21;
    } else if (a.substrate === 'orange') {
      const peel = painted(256, 256, (ctx, cw, ch) => {
        ctx.fillStyle = '#ee8a1d';
        ctx.fillRect(0, 0, cw, ch);
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(190,90,10,0.5)' : 'rgba(255,190,90,0.5)';
          ctx.beginPath();
          ctx.arc(random() * cw, random() * ch, 0.8 + random() * 1.6, 0, TAU);
          ctx.fill();
        }
      });
      const fruit = s.ball([20, 18.5, 20], [0, 16, 0], s.material('#ffffff', { map: peel, roughness: 0.55 }), 40);
      fruit.rotation.set(0.25, random() * TAU, 0.1);
      s.cylinder(0.9, 1.3, 1, [3.4, 34.1, 0.6], s.material('#4f5a2a'), 8).rotation.z = -0.25;
      surface = (x, z) => 16 + 18.5 * Math.sqrt(Math.max(0.02, 1 - (x * x + z * z) / 400));
      reach = 15;
    } else {
      const wedge = new THREE.Shape();
      wedge.moveTo(-22, -21);
      wedge.lineTo(22, -6);
      wedge.lineTo(22, 6);
      wedge.lineTo(-22, 21);
      wedge.closePath();
      const block = new THREE.Mesh(new THREE.ExtrudeGeometry(wedge, { depth: 13, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 2 }),
        [s.material('#f0d98c', { roughness: 0.6 }), s.material('#e3c56a', { roughness: 0.7 })]);
      block.castShadow = block.receiveShadow = true;
      s.root.add(block);
      block.rotation.x = -Math.PI / 2;
      block.position.y = 0.8;
      const holes = Array.from({ length: 7 }, () => ({ at: [-20 + random() * 40, 14.55, (random() - 0.5) * 10] as [number, number, number], size: 0.8 + random() * 1.4 }));
      const pits = s.scatter(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), s.material('#b99536', { roughness: 0.9 }), holes);
      pits.castShadow = false;
      surface = () => 14.5;
      reach = 15;
      s.root.children.forEach((child) => { child.position.x += 5; });
    }

    const base = new THREE.Color(HUE_COLOUR[a.hue]);
    base.offsetHSL(0, (mood.cheer - 0.5) * 0.15, a.stage === 'old' ? -0.08 : 0);
    const white = new THREE.Color('#f4f3ea').lerp(new THREE.Color('#bdb8a4'), mood.wear * 0.5);
    const felt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const blooms: { x: number; z: number; r: number; green: number }[] = [];

    const bloom = (cx: number, cz: number, r: number, stage: typeof a.stage, detail = 1) => {
      const edge = wobble(random, 4, 3), furrow = wobble(random, 2, 11);
      const rings = stage === 'tuft' ? 1 : 3 + Math.floor(random() * 3);
      const green = stage === 'tuft' ? 0.38 : stage === 'old' ? 0.9 : 0.8;
      const outline = (angle: number) => r * (1 + 0.05 * edge(angle));
      const height = (t: number, angle: number) => {
        const lift = stage === 'tuft' ? 1.4 * (1 - t * t) ** 0.7 : 0.75 * (1 - t ** 6) * (1 + 0.22 * Math.cos(t * rings * TAU));
        const crater = stage === 'old' ? -0.55 * Math.exp(-((t / 0.22) ** 2)) - 0.22 * Math.abs(furrow(angle)) * t * (1 - t ** 4) * 2 : 0;
        return Math.max(0.03, lift + crater);
      };
      const tint = (t: number, angle: number) => {
        if (t > green + 0.05 * edge(angle * 2)) return white;
        const c = base.clone();
        c.offsetHSL(0, 0, 0.07 * Math.cos(t * rings * TAU) + (stage === 'old' ? -0.1 * Math.exp(-((t / 0.25) ** 2)) : 0));
        if (stage !== 'tuft' && t < 0.1) c.lerp(white, 0.5);
        return c.lerp(white, Math.max(0, (t - green + 0.12) / 0.12) * 0.6);
      };
      const mesh = s.mesh(
        dome(outline, (t, angle) => { const d = outline(angle) * t; return surface(cx + Math.cos(angle) * d, cz + Math.sin(angle) * d) + height(t, angle); }, Math.round(mix(8, 22, detail)), Math.round(mix(24, 64, detail)), tint),
        felt, [cx, 0, cz]);
      mesh.userData.height = height;
      blooms.push({ x: cx, z: cz, r, green });
      return height;
    };

    const size = { spot: 0.42, bloom: 0.68, twin: 0.44, takeover: 0.6 }[a.extent] * (a.stage === 'tuft' ? 0.75 : 1);
    const mainR = reach * size;
    const heights: ((t: number, angle: number) => number)[] = [];
    if (a.extent === 'twin') {
      const angle = random() * TAU, d = mainR * 0.88;
      heights.push(bloom(Math.cos(angle) * d, Math.sin(angle) * d, mainR, a.stage));
      heights.push(bloom(-Math.cos(angle) * d, -Math.sin(angle) * d, mainR * (0.8 + random() * 0.3), a.stage));
      const ridge = s.rod([Math.sin(angle) * mainR * 0.55, surface(0, 0) + 0.7, -Math.cos(angle) * mainR * 0.55], [-Math.sin(angle) * mainR * 0.55, surface(0, 0) + 0.7, Math.cos(angle) * mainR * 0.55], 0.55, s.material(white, { roughness: 1 }), 0.3);
      ridge.scale.z = 0.8;
    } else {
      const off = a.extent === 'spot' ? reach * 0.2 : reach * 0.08, angle = random() * TAU;
      heights.push(bloom(Math.cos(angle) * off, Math.sin(angle) * off, mainR, a.stage));
    }
    if (a.extent === 'takeover') {
      const want = Math.round(mix(5, 13, mood.density));
      for (let i = 0, tries = 0; i < want && tries < 300; tries++) {
        const angle = random() * TAU, d = reach * (0.5 + random() * 0.45), r = reach * (0.06 + random() * 0.13);
        const x = Math.cos(angle) * d, z = Math.sin(angle) * d;
        if (d + r > reach * 1.02 || blooms.some((b) => Math.hypot(b.x - x, b.z - z) < (b.r + r) * 0.85)) continue;
        heights.push(bloom(x, z, r, random() < 0.5 ? 'tuft' : a.stage, 0.35));
        i++;
      }
    }

    // Conidiophores: a stalk that forks into a little broom, each bristle a chain of spores.
    if (a.brushes > 0.12) {
      const stalks: THREE.BufferGeometry[] = [], chains: THREE.BufferGeometry[] = [];
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      stalks.push(new THREE.CylinderGeometry(0.035, 0.055, 1, 5).translate(0, 0.5, 0));
      const forks = 4;
      for (let i = 0; i < forks; i++) {
        const angle = (i / forks) * TAU + 0.4, direction = new THREE.Vector3(Math.cos(angle) * 0.42, 1, Math.sin(angle) * 0.42).normalize();
        q.setFromUnitVectors(up, direction);
        const tip = new THREE.Vector3(0, 1, 0).addScaledVector(direction, 0.26);
        stalks.push(new THREE.CylinderGeometry(0.03, 0.035, 0.26, 4).applyMatrix4(m.compose(new THREE.Vector3(0, 1, 0).addScaledVector(direction, 0.13), q, new THREE.Vector3(1, 1, 1))));
        for (let k = 0; k < 4; k++) chains.push(new THREE.IcosahedronGeometry(0.075 - k * 0.006, 0).translate(tip.x + direction.x * 0.05 * k, tip.y + 0.07 + k * 0.13, tip.z + direction.z * 0.05 * k));
      }
      const stalkGeometry = mergeGeometries(stalks)!, chainGeometry = mergeGeometries(chains)!;
      stalks.concat(chains).forEach((g) => g.dispose());
      const total = Math.round(mix(8, 80, a.brushes) * mix(0.7, 1.2, mood.density));
      const stalkMesh = new THREE.InstancedMesh(stalkGeometry, s.material('#e8ead9', { roughness: 0.8 }), total);
      const chainMesh = new THREE.InstancedMesh(chainGeometry, s.material(base.clone().offsetHSL(0, 0.05, -0.06), { roughness: 0.9, flatShading: true }), total);
      const tall = mix(1.6, 5.2, a.brushes);
      const euler = new THREE.Euler(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < total; i++) {
        const b = blooms[i < total * 0.75 ? Math.floor(random() * Math.min(2, blooms.length)) : Math.floor(random() * blooms.length)];
        const angle = random() * TAU, t = Math.sqrt(random()) * b.green * mix(0.5, 0.8, a.brushes), d = b.r * t;
        const x = b.x + Math.cos(angle) * d, z = b.z + Math.sin(angle) * d;
        const hgt = tall * (0.55 + random() * 0.6) * Math.min(1, b.r / 5 + 0.35);
        at.set(x, surface(x, z) + 0.25, z);
        euler.set((random() - 0.5) * 0.5 + Math.sin(angle) * t * 0.35, random() * TAU, (random() - 0.5) * 0.5 - Math.cos(angle) * t * 0.35);
        scale.set(hgt * 0.75, hgt, hgt * 0.75);
        m.compose(at, q.setFromEuler(euler), scale);
        stalkMesh.setMatrixAt(i, m);
        chainMesh.setMatrixAt(i, m);
      }
      stalkMesh.castShadow = chainMesh.castShadow = true;
      s.root.add(stalkMesh, chainMesh);
    }

    const main = blooms[0];
    const drifting: THREE.InstancedMesh[] = [];
    if (a.story === 'exudate') {
      const amber = gloss('#e9a92a', { transparent: true, opacity: 0.85, emissive: '#c77a10', emissiveIntensity: 0.35 });
      const beads = blooms.slice(0, 2).flatMap((b) => Array.from({ length: 9 + Math.floor(random() * 8) }, () => {
        const angle = random() * TAU, t = 0.2 + random() * 0.5, x = b.x + Math.cos(angle) * b.r * t, z = b.z + Math.sin(angle) * b.r * t;
        return { at: [x, surface(x, z) + 0.75, z] as [number, number, number], size: (0.35 + random() * 0.6) * Math.min(1, b.r / 8) };
      }));
      s.scatter(new THREE.SphereGeometry(1, 10, 8), amber, beads);
    } else if (a.story === 'spores') {
      const dust = s.material(base.clone().offsetHSL(0, 0, 0.12), { roughness: 1, transparent: true, opacity: 0.7 });
      const motes = Array.from({ length: 150 }, () => {
        const rise = random() ** 1.4, angle = random() * TAU, d = main.r * (0.2 + rise * 0.9) * random();
        return { at: [main.x + Math.cos(angle) * d + rise * 7, surface(main.x, main.z) + 2 + rise * 16, main.z + Math.sin(angle) * d - rise * 3] as [number, number, number], size: 0.1 + random() * 0.16 };
      });
      drifting.push(s.scatter(new THREE.IcosahedronGeometry(1, 0), dust, motes));
    } else if (a.story === 'fleming') {
      const colour = ['#ecd9a0', '#f0c53a', '#efe6cf'][Math.floor(random() * 3)];
      const live = gloss(colour), ghost = gloss(colour, { transparent: true, opacity: 0.3, depthWrite: false, clearcoat: 0 });
      const alive: { at: [number, number, number]; size: number }[] = [], dying: typeof alive = [];
      const outer = a.substrate === 'agar' ? reach * 0.95 : reach;
      for (let i = 0, tries = 0; i < 46 && tries < 600; tries++) {
        const angle = random() * TAU, d = Math.sqrt(random()) * outer, x = Math.cos(angle) * d, z = Math.sin(angle) * d;
        const gap = Math.min(...blooms.map((b) => Math.hypot(b.x - x, b.z - z) - b.r));
        if (gap < 1.2) continue;
        const zone = mainR * 0.55 + 3;
        if (gap < zone * 0.5 && random() < 0.75) continue;
        (gap < zone ? dying : alive).push({ at: [x, surface(x, z), z], size: gap < zone ? 0.5 + random() * 0.5 : 0.9 + random() * 1.1 });
        i++;
      }
      s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.55, 1), live, alive);
      s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.3, 1), ghost, dying).castShadow = false;
    } else if (a.story === 'marked') {
      const y = surface(reach * 0.7, 0) + 0.12;
      const angle = random() * TAU, from = main.r + 7, to = main.r + 1.6;
      const ink = s.material(['#c11f2b', '#1c2f8a', '#17181b'][Math.floor(random() * 3)], { roughness: 0.6 });
      const p = (d: number, turn = 0): [number, number, number] => { const x = main.x + Math.cos(angle + turn) * d, z = main.z + Math.sin(angle + turn) * d; return [x, a.substrate === 'orange' ? surface(x, z) + 0.15 : y, z]; };
      if (a.substrate !== 'orange' || from < 17) {
        s.rod(p(from), p(to), 0.28, ink).castShadow = false;
        s.rod(p(to), p(to + 2.6, 0.12), 0.28, ink).castShadow = false;
        s.rod(p(to), p(to + 2.6, -0.12), 0.28, ink).castShadow = false;
      }
      const note = s.label('?', 4, 5, [0, 0, 0], '#c11f2b', '#fbf7e4');
      note.position.set(...p(from + 3.2));
      note.position.y += a.substrate === 'orange' ? 1.2 : 0;
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = (random() - 0.5) * 0.6;
    }

    s.root.scale.setScalar(0.01);
    const speed = mix(0.1, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const cloud of drifting) { cloud.position.y = ((time * speed * 0.6) % 3); cloud.rotation.y = Math.sin(time * speed * 0.3) * 0.08; } },
    });
  },
});

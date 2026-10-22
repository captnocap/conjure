import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SOURCES = {
  denim: 'Grey-blue jeans-pocket lint, the classic.',
  dryer: 'Pale lavender-grey felt peeled off a tumble-dryer filter.',
  wool: 'Dusty rose fuzz shed by a red wool jumper.',
  coat: 'Charcoal, nearly black, from the bottom of a winter coat pocket.',
  towel: 'Off-white towel fluff flecked with bright confetti specks of colour.',
  dust: 'Beige-brown dust bunny from under a bed.',
} as const;
const TONES: Record<keyof typeof SOURCES, [string, string]> = {
  denim: ['#7f8fa6', '#5d6f8c'], dryer: ['#b3adc0', '#8f8aa3'], wool: ['#c58a90', '#a25c68'], coat: ['#4a4a52', '#2f3038'], towel: ['#dcd8cc', '#b9b4a6'], dust: ['#a89a84', '#857763'],
};

export default defineThing({
  questions: {
    source: choice('What is the lint made of, by where it came from?', SOURCES),
    form: choice('What shape has it felted into?', {
      tumbleweed: 'A round airy ball, a tumbleweed.',
      clump: 'A low matted pad, flattened by a wallet.',
      wisp: 'A long drawn-out wisp, a stretched cloud.',
      pellet: 'A tight little pellet rolled between finger and thumb.',
      bush: 'A lumpy upright heap, like a shabby bush.',
    }),
    size: score('How big is it?', ['A pea-sized pill', 'A marble', 'A walnut', 'A fist-sized dust bunny']),
    hair: choice('Is there a hair caught in it?', {
      none: 'No hair.',
      dark: 'One long dark hair looping out and trailing away.',
      blond: 'A long fair hair curling out of it.',
      grey: 'A wiry grey hair.',
      pet: 'A bristle of short white pet hairs.',
    }),
    glint: choice('What small bright thing is caught in it?', {
      none: 'Nothing bright at all.',
      foil: 'A crumpled glint of silver gum-wrapper foil.',
      gold: 'A scrap of gold chocolate foil.',
      sequin: 'A single pink sequin.',
      bead: 'A tiny red glass bead.',
      staple: 'A bent staple.',
    }),
    crumbs: score('How much grit and crumb is caught in it?', ['Clean soft fluff', 'One toast crumb', 'Several crumbs and some sand', 'Gritty with crumbs, tobacco and sand']),
    shedding: choice('What has it left around itself?', {
      alone: 'Nothing: a single self-contained tuft.',
      satellites: 'Two or three smaller tufts shed beside it.',
      dragged: 'A streak of fibres drawn out along the ground, as if it rolled or was dragged.',
      picked: 'It has been pulled in two, a bridge of stretched fibres between the halves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const R = mix(3.5, 26, a.size ** 1.3);
    const [light, dark] = TONES[a.source].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#77726a'), mood.wear * 0.35).lerp(new THREE.Color('#e9c9a0'), (mood.warmth - 0.5) * 0.12));
    const accents = a.source === 'towel' ? ['#e94f64', '#3f8fe0', '#f2c230', '#46b877', '#f08a2c'] : a.source === 'denim' ? ['#e8e6de', '#33456b', '#b83a3a'] : a.source === 'wool' ? ['#d22d3a', '#f0d8d8'] : ['#e8e6de', '#6b6558'];
    const form = { tumbleweed: [1, 0.86, 1, 0.3], clump: [1.35, 0.36, 1.15, 0.2], wisp: [2.1, 0.46, 0.75, 0.3], pellet: [0.8, 0.6, 0.66, 0.1], bush: [0.95, 1.15, 0.9, 0.34] }[a.form];
    const fuzz = form[3];
    const felt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const tumble = new THREE.Group();
    s.root.add(tumble);

    const fibreParts: THREE.BufferGeometry[] = [];
    const tint = (geometry: THREE.BufferGeometry, colour: THREE.Color, vary = 0) => {
      const count = geometry.getAttribute('position').count, data = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const c = vary ? colour.clone().offsetHSL(0, 0, (random() - 0.5) * vary) : colour;
        data.set([c.r, c.g, c.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
      return geometry;
    };
    const fibre = (points: THREE.Vector3[], radius: number, colour: THREE.Color) => {
      const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, radius, 3);
      geometry.deleteAttribute('uv');
      fibreParts.push(tint(geometry, colour));
    };

    // One tuft: lumpy felt lobes wrapped in loose curling fibres.
    const tuft = (centre: THREE.Vector3, r: number, shape: readonly number[], fibres: number) => {
      const [sx, sy, sz] = shape;
      const lobes = 4 + Math.floor(random() * 4);
      const p1 = random() * 9, p2 = random() * 9;
      for (let l = 0; l < lobes; l++) {
        const geometry = new THREE.SphereGeometry(1, 22, 16);
        const lr = r * (l === 0 ? 0.78 : 0.42 + random() * 0.3);
        const offset = l === 0 ? new THREE.Vector3() : new THREE.Vector3((random() - 0.5) * sx, (random() - 0.5) * sy * 0.9, (random() - 0.5) * sz).multiplyScalar(r * 0.95);
        const position = geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(position, i);
          const bump = 1 + 0.16 * Math.sin(v.x * 5 + p1 + l) * Math.sin(v.y * 6 + p2) + 0.1 * Math.sin(v.z * 11 + p1 * 2 + v.x * 7);
          v.multiplyScalar(lr * bump).multiply(new THREE.Vector3(sx, sy, sz)).add(offset).add(centre);
          v.y = Math.max(v.y, 0.02 * r);
          position.setXYZ(i, v.x, v.y, v.z);
        }
        geometry.computeVertexNormals();
        geometry.deleteAttribute('uv');
        fibreParts.push(tint(geometry, light.clone().lerp(dark, 0.25 + random() * 0.5), 0.1));
      }
      const onSurface = (dir: THREE.Vector3, reach: number) => new THREE.Vector3(dir.x * sx, dir.y * sy, dir.z * sz).multiplyScalar(r * reach).add(centre);
      for (let f = 0; f < fibres; f++) {
        const dir = new THREE.Vector3(random() - 0.5, random() - 0.35, random() - 0.5).normalize();
        const points: THREE.Vector3[] = [];
        const steps = 4 + Math.floor(random() * 4), stride = 0.3 + random() * 0.4;
        let reach = 0.88 + random() * 0.14;
        for (let i = 0; i < steps; i++) {
          const p = onSurface(dir, reach);
          p.y = Math.max(p.y, r * 0.03);
          points.push(p);
          dir.add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(stride)).normalize();
          reach = 0.92 + random() * (0.14 + fuzz * 1.1);
        }
        const special = random();
        const colour = special < 0.08 + mood.cheer * 0.08 ? new THREE.Color(accents[Math.floor(random() * accents.length)]) : light.clone().lerp(dark, random()).offsetHSL(0, 0, (random() - 0.5) * 0.12);
        fibre(points, r * (0.009 + random() * 0.009), colour);
      }
    };

    const count = Math.round(mix(280, 500, mood.density) * (a.form === 'pellet' ? 0.6 : 1));
    const centre = new THREE.Vector3(0, R * form[1] * 0.92, 0);
    const split = a.shedding === 'picked';
    if (split) {
      const gap = R * form[0] * 0.95;
      const left = new THREE.Vector3(-gap, R * form[1] * 0.75, 0), right = new THREE.Vector3(gap * 0.9, R * form[1] * 0.6, R * 0.2);
      tuft(left, R * 0.8, form, Math.round(count * 0.6));
      tuft(right, R * 0.65, form, Math.round(count * 0.45));
      for (let i = 0; i < 26; i++) {
        const lift = R * form[1] * (0.3 + random() * 0.9), sag = (random() - 0.5) * R * 0.5;
        const from = left.clone().add(new THREE.Vector3(R * 0.3, (random() - 0.5) * R * form[1] * 0.8, (random() - 0.5) * R * 0.7));
        const to = right.clone().add(new THREE.Vector3(-R * 0.25, (random() - 0.5) * R * form[1] * 0.7, (random() - 0.5) * R * 0.6));
        const mid = from.clone().lerp(to, 0.35 + random() * 0.3);
        mid.y = Math.max(lift * 0.7 + sag * 0.3, R * 0.04);
        mid.z += sag;
        fibre([from, mid, to], R * (0.007 + random() * 0.007), light.clone().lerp(dark, random()));
      }
    } else tuft(centre, R, form, count);

    if (a.shedding === 'satellites') {
      const n = 2 + Math.floor(random() * 2 + mood.density);
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, far = R * (form[0] + 0.55 + random() * 0.9), r = R * (0.16 + random() * 0.2);
        tuft(new THREE.Vector3(Math.cos(angle) * far, r * 0.7, Math.sin(angle) * far * 0.9), r, [1, 0.8, 1, 0.3], 26);
      }
    }
    if (a.shedding === 'dragged') {
      const angle = Math.PI + (random() - 0.5) * 0.8;
      for (let i = 0; i < 40; i++) {
        const far = R * (form[0] * 0.7 + random() * 2.6), side = (random() - 0.5) * R * 0.9 * (1 - far / (R * 4.2));
        const at = new THREE.Vector3(Math.cos(angle) * far - Math.sin(angle) * side, R * 0.02, Math.sin(angle) * far + Math.cos(angle) * side);
        const along = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(R * (0.3 + random() * 0.5));
        fibre([at, at.clone().addScaledVector(along, 0.5).add(new THREE.Vector3((random() - 0.5) * R * 0.2, R * random() * 0.12, (random() - 0.5) * R * 0.2)), at.clone().add(along)], R * (0.01 + random() * 0.012), light.clone().lerp(dark, random()));
      }
    }
    const fluff = new THREE.Mesh(mergeGeometries(fibreParts.map((part) => (part.index ? part.toNonIndexed() : part)))!, felt);
    for (const part of fibreParts) part.dispose();
    fluff.castShadow = fluff.receiveShadow = true;
    tumble.add(fluff);

    const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      tumble.add(mesh);
      return mesh;
    };
    const top = split ? new THREE.Vector3(-R * form[0] * 0.95, R * form[1] * 0.75, 0) : centre;
    const topR = split ? R * 0.8 : R;
    const perch = (yaw: number, up: number, reach = 1) => {
      const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(up), Math.sin(up), Math.cos(yaw) * Math.cos(up));
      return new THREE.Vector3(dir.x * form[0], dir.y * form[1], dir.z * form[2]).multiplyScalar(topR * reach).add(top);
    };

    // The hair: thin, long, and far more deliberate in its curve than the fluff.
    if (a.hair !== 'none') {
      const colour = { dark: '#1d1512', blond: '#d9b86a', grey: '#b9bcc0', pet: '#f4f2ec' }[a.hair];
      const strand = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4 });
      const hairs = a.hair === 'pet' ? 9 + Math.floor(random() * 6) : 1;
      for (let i = 0; i < hairs; i++) {
        const yaw = a.hair === 'pet' ? random() * Math.PI * 2 : 0.5 + random() * 1.2, sign = random() > 0.5 ? 1 : -1;
        const points = a.hair === 'pet'
          ? [perch(yaw, 0.2 + random() * 0.9, 0.8), perch(yaw + 0.15, 0.3 + random() * 0.9, 1.35 + random() * 0.3)]
          : [perch(yaw - 1.5 * sign, 0.5, 0.7), perch(yaw - 0.8 * sign, 0.9, 1.1), perch(yaw, 0.75, 1.45), perch(yaw + 0.5 * sign, 0.25, 1.5),
              perch(yaw + 0.7 * sign, 0, 1.7).setY(topR * 0.03), perch(yaw + 1.1 * sign, 0, 2.3).setY(topR * 0.03), perch(yaw + (a.hair === 'blond' ? 2 : 1.25) * sign, 0, a.hair === 'blond' ? 2.1 : 3).setY(topR * 0.03),
              ...(a.hair === 'blond' ? [perch(yaw + 2.6 * sign, 0, 2.5).setY(topR * 0.03)] : [])];
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, topR * (a.hair === 'grey' ? 0.016 : 0.012) + 0.02, 5), strand);
      }
    }

    // The glint.
    if (a.glint === 'foil' || a.glint === 'gold') {
      const foil = new THREE.PlaneGeometry(topR * 0.62, topR * 0.5, 5, 4);
      const position = foil.getAttribute('position');
      for (let i = 0; i < position.count; i++) position.setZ(i, (random() - 0.5) * topR * 0.2);
      foil.computeVertexNormals();
      const tone = a.glint === 'foil' ? '#e9edf2' : '#f1c453';
      const scrap = add(foil, new THREE.MeshStandardMaterial({ color: tone, metalness: 0.9, roughness: 0.22, emissive: tone, emissiveIntensity: 0.3, side: THREE.DoubleSide, flatShading: true }));
      scrap.position.copy(perch(0.5 + random() * 0.5, 0.5 + random() * 0.3, 1.02));
      scrap.rotation.set(-0.7 + random() * 0.4, 0.5 + random() * 0.6, random());
    } else if (a.glint === 'sequin') {
      const sequin = add(new THREE.CylinderGeometry(topR * 0.22, topR * 0.22, topR * 0.02, 20), new THREE.MeshStandardMaterial({ color: '#ff5fa8', metalness: 0.85, roughness: 0.2, emissive: '#ff3f96', emissiveIntensity: 0.35 }));
      sequin.position.copy(perch(0.6, 0.6, 1.05));
      sequin.rotation.set(1.0, 0.4, 0.3);
    } else if (a.glint === 'bead') {
      add(new THREE.SphereGeometry(topR * 0.15, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#c8102e', roughness: 0.08, clearcoat: 1, emissive: '#7a0010', emissiveIntensity: 0.4 })).position.copy(perch(0.7, 0.55, 1.05));
    } else if (a.glint === 'staple') {
      const w = topR * 0.5, leg = topR * 0.22;
      const staple = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-w / 2 + leg * 0.5, -leg, 0), new THREE.Vector3(-w / 2, 0, 0), new THREE.Vector3(0, 0.02 * w, 0), new THREE.Vector3(w / 2, 0, 0), new THREE.Vector3(w / 2 + leg * 0.3, -leg, leg * 0.4)], false, 'catmullrom', 0.05), 24, topR * 0.025, 6), new THREE.MeshStandardMaterial({ color: '#d5d9dd', metalness: 0.9, roughness: 0.25 }));
      staple.position.copy(perch(0.6, 0.65, 1.12));
      staple.rotation.set(-0.5, 0.6, 0.4);
    }

    // Crumbs caught in the felt, and grit shaken out around it.
    const crumbCount = a.crumbs < 0.17 ? 0 : Math.round(mix(1, 9, (a.crumbs - 0.17) / 0.83));
    const toast = ['#c98f45', '#a8672a', '#e2b877', '#5b3a22'];
    for (let i = 0; i < crumbCount; i++) {
      const crumb = new THREE.DodecahedronGeometry(topR * (i === 0 ? 0.17 : 0.06 + random() * 0.09), 0);
      const position = crumb.getAttribute('position');
      for (let v = 0; v < position.count; v++) position.setXYZ(v, position.getX(v) * (0.8 + ((v * 7) % 5) * 0.09), position.getY(v) * (0.7 + ((v * 3) % 4) * 0.1), position.getZ(v));
      crumb.computeVertexNormals();
      const mesh = add(crumb, new THREE.MeshStandardMaterial({ color: toast[i === 0 ? 0 : Math.floor(random() * toast.length)], roughness: 0.9, flatShading: true }));
      mesh.position.copy(i === 0 ? perch(-0.35, 0.5, 1.02) : perch(random() * Math.PI * 2 - Math.PI, 0.1 + random() * 1.1, 0.98));
      mesh.position.y = Math.max(mesh.position.y, topR * 0.08);
      mesh.rotation.set(random() * 3, random() * 3, random() * 3);
    }
    if (a.crumbs > 0.45) {
      const grains = Array.from({ length: Math.round(mix(10, 60, a.crumbs) * mix(0.6, 1.3, mood.wear)) }, () => {
        const angle = random() * Math.PI * 2, far = R * (0.5 + random() * 1.9);
        return { at: [Math.cos(angle) * far * form[0], R * 0.015, Math.sin(angle) * far * Math.max(form[2], 0.9)] as [number, number, number], size: R * (0.015 + random() * 0.03), color: random() > 0.55 ? '#d8c8a0' : random() > 0.4 ? '#4a3524' : '#8c7c68' };
      });
      const sand = s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), grains);
      tumble.add(sand);
    }

    const sway = a.form === 'pellet' ? 0.3 : 1;
    return s.finish({
      update: (_dt, time) => {
        tumble.rotation.z = Math.sin(time * mix(0.5, 2.6, mood.energy)) * 0.05 * mood.energy * sway;
        tumble.rotation.x = Math.sin(time * mix(0.35, 1.9, mood.energy) + 1.3) * 0.035 * mood.energy * sway;
      },
    });
  },
});

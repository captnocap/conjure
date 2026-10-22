import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { makeEye } from './eye';
import { SKIN_COLOUR, SKIN_TONES, almond, crease, makeSocket, skinPlate } from './face';

const IRIS = {
  brown: 'Warm dark brown.',
  blue: 'Pale clear blue, bluer for the red around it.',
  green: 'Green, vivid against the reddened rim.',
  hazel: 'Hazel, amber into olive.',
  grey: 'Cool rain grey.',
  black: 'Nearly black, shining wet.',
} as const;
const IRIS_COLOUR: Record<keyof typeof IRIS, string> = {
  brown: '#6b3d1c', blue: '#5b9bd0', green: '#4f9a48', hazel: '#9a7a30', grey: '#8794a0', black: '#20140e',
};
type P = [number, number, number];

export default defineThing({
  questions: {
    falling: choice('What is falling from it?', {
      one: 'A single clear tear, one bead on the cheek and one in the air.',
      stream: 'Clear tears streaming freely down both sides.',
      mascara: 'Mascara running: sooty black streaks down the cheek from a smudged lid.',
      blood: 'Tears of blood, thick and red, like a weeping statue.',
      glitter: 'Glitter: a trail of gold sparkle instead of water.',
    }),
    why: choice('Why is it crying?', {
      grief: 'Grief: the brow pulled up in the middle, the gaze dropped.',
      laughing: 'Laughing until it hurts: the eye crinkled up from below, lines at the corner.',
      onion: 'Onion sting: a red-rimmed flinch, nothing sad about it.',
      smoke: 'Smoke: bloodshot, sooty skin, the brow clamped down.',
      joy: 'Joy or relief: brow lifted, the eye bright and looking up.',
    }),
    lids: choice('How are the lids?', {
      wide: 'Wide open, brimming.',
      squeezed: 'Squeezed nearly shut, tears forced out of the corners.',
      swollen: 'Swollen and puffy from hours of crying, half open.',
    }),
    iris: choice('What colour is the eye?', IRIS),
    skin: choice('What is the skin tone?', SKIN_TONES),
    landing: choice('What do the tears land in?', {
      nothing: 'Nothing, they just fall.',
      pool: 'A small spreading pool on the ground beneath.',
      handkerchief: 'A crumpled white handkerchief laid under the drip.',
      vial: 'A little glass tear-vial catching each drop, a lachrymatory, with its cork beside it.',
      bowl: 'A shallow brass offering bowl, half full.',
    }),
    brow: choice('Is there an eyebrow above it?', {
      dark: 'A dark, full brow that carries the feeling.',
      fine: 'A fine, thin brow.',
      none: 'None: only the eye and the cheek.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 0.013;
    const tone = new THREE.Color(SKIN_COLOUR[a.skin]);
    const skin = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.62 });
    const shade = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.6), roughness: 0.8 });
    const flush = new THREE.MeshStandardMaterial({ color: tone.clone().lerp(new THREE.Color('#c8463f'), 0.3), roughness: 0.6 });
    const puff = new THREE.MeshStandardMaterial({ color: tone.clone().lerp(new THREE.Color('#c8565a'), 0.16), roughness: 0.55 });
    const face = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T) => { face.add(node); return node; };
    const pad = (paint: THREE.Material, size: P, at: P, turn = 0) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), paint);
      mesh.scale.set(...size);
      mesh.position.set(...at);
      mesh.rotation.z = turn;
      mesh.castShadow = true;
      return add(mesh);
    };

    // A tall slip of skin: the eye near the top, a long cheek for the tears to run down.
    const bottom = -r * 5.2;
    const outline = new THREE.Shape();
    outline.moveTo(-r * 2.6, r * 1.2);
    outline.bezierCurveTo(-r * 2.6, r * 3.4, r * 3.0, r * 3.4, r * 3.0, r * 1.2);
    outline.bezierCurveTo(r * 3.0, -r * 2.4, r * 2.0, bottom, r * 0.2, bottom);
    outline.bezierCurveTo(-r * 1.6, bottom, -r * 2.6, -r * 2.4, -r * 2.6, r * 1.2);
    outline.holes.push(almond(0, 0, r * 1.2, r * 0.74, r * 0.6));
    add(skinPlate(outline, 0.004, skin));

    const feel = {
      grief: { tilt: -0.3, browY: 1.95, browTilt: -0.3, arch: 0.15, veins: 0.5, lift: 0.05, red: 0.6 },
      laughing: { tilt: -0.1, browY: 2.05, browTilt: -0.05, arch: 0.5, veins: 0.25, lift: 0.3, red: 0.35 },
      onion: { tilt: 0.12, browY: 1.6, browTilt: 0.12, arch: 0.1, veins: 0.7, lift: 0.25, red: 0.9 },
      smoke: { tilt: 0.25, browY: 1.45, browTilt: 0.26, arch: 0.05, veins: 1, lift: 0.25, red: 1 },
      joy: { tilt: -0.14, browY: 2.35, browTilt: -0.1, arch: 0.6, veins: 0.2, lift: 0.5, red: 0.3 },
    }[a.why];
    const lids = {
      wide: [-0.58, 0.52],
      squeezed: [-0.04, 0.12],
      swollen: [-0.2, 0.3],
    }[a.lids];
    const crinkle = a.why === 'laughing' ? 0.16 : 0;

    const eye = makeEye({
      r,
      iris: IRIS_COLOUR[a.iris],
      pupil: a.why === 'joy' ? 'blown' : 'normal',
      sclera: '#f6ece6',
      veins: Math.min(1, feel.veins + mood.wear * 0.2 + (a.lids === 'swollen' ? 0.2 : 0)),
      rough: 0.06,
      random,
    });
    eye.ball.rotation.set(-feel.lift, (random() - 0.5) * 0.3, 0, 'YXZ');
    const rimColour = new THREE.Color('#c98a80').lerp(new THREE.Color('#b8262c'), feel.red * 0.8);
    const sooty = a.falling === 'mascara';
    const socket = makeSocket({
      r,
      skin: a.lids === 'swollen' ? puff : skin,
      lid: sooty ? new THREE.MeshStandardMaterial({ color: '#3b3340', roughness: 0.7 }) : a.lids === 'swollen' ? puff : skin,
      eye,
      upper: lids[0],
      lower: lids[1] - crinkle,
      tilt: -feel.tilt,
      lash: { count: sooty ? 30 : 22, length: sooty ? 0.6 : 0.38, colour: '#17100d', curl: 0.5, clump: sooty ? 0.8 : 0.5, thick: sooty ? 0.05 : 0.034 },
      lowerLash: { count: 10, length: 0.2, colour: '#17100d', curl: 0.1, clump: 0.6 },
      rim: `#${rimColour.getHexString()}`,
      rimThick: 0.085,
      nose: -1,
      random,
    });
    add(socket.group);

    // Sore skin round the eye, the crease above it, puffiness.
    pad(flush, [r * 1.75, r * 1.25, r * 0.06], [r * 0.05, -r * 0.05, 0]);
    add(crease([[-r * 1.15, r * 0.6 + r * feel.tilt, r * 0.04], [-r * 0.3, r * 1.05, r * 0.3], [r * 0.5, r * 1.05, r * 0.3], [r * 1.4, r * 0.55 - r * feel.tilt, r * 0.04]], r * 0.05, shade));
    if (a.lids === 'swollen') {
      pad(puff, [r * 1.45, r * 0.5, r * 0.16], [r * 0.05, -r * 1.15, 0]);
      pad(puff, [r * 1.5, r * 0.4, r * 0.15], [r * 0.05, r * 1.2, 0], feel.tilt * 0.6);
    } else add(crease([[-r * 0.95, -r * 1.0, r * 0.05], [0, -r * 1.4, r * 0.1], [r * 1.0, -r * 0.95, r * 0.05]], r * 0.05, shade));
    if (a.why === 'laughing' || a.lids === 'squeezed') {
      for (let i = 0; i < 3; i++) {
        const fan = (i - 1) * 0.5 + 0.1;
        add(crease([[r * 1.25, r * fan * 0.3, r * 0.03], [r * 1.8, r * fan * 1.0, r * 0.05], [r * 2.4, r * fan * 1.9, r * 0.02]], r * 0.05, shade));
      }
    }
    if (a.why === 'smoke') for (let i = 0; i < 5; i++) pad(new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.95 }), [r * (0.5 + random() * 0.6), r * (0.3 + random() * 0.4), r * 0.04], [r * (-1.8 + random() * 4), r * (-3.5 + random() * 5.5), 0], random() * 3);
    if (sooty) pad(new THREE.MeshStandardMaterial({ color: '#2a252d', roughness: 0.9 }), [r * 1.6, r * 0.7, r * 0.07], [r * 0.1, -r * 0.75, 0], 0.05);

    if (a.brow !== 'none') {
      const dark = a.skin === 'porcelain' || a.skin === 'fair' ? '#5a3c26' : '#1a1210';
      const hairPaint = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.6 });
      const at = (t: number): P => {
        const x = mix(-1.3, 1.8, t);
        return [r * x, r * (feel.browY + Math.sin(t * Math.PI) * feel.arch - (x - 0.25) * Math.tan(feel.browTilt) - (t > 0.7 ? (t - 0.7) * 1.0 : 0)), r * 0.06];
      };
      if (a.brow === 'fine') add(crease([at(0), at(0.3), at(0.6), at(1)], r * 0.07, hairPaint));
      else {
        const count = 130;
        const hair = new THREE.ConeGeometry(r * 0.035, r * 0.5, 4);
        hair.translate(0, r * 0.25, 0);
        const hairs = new THREE.InstancedMesh(hair, hairPaint, count);
        const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), size = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          const t = random();
          const [x, y, z] = at(t);
          const band = r * 0.32 * (1 - t * 0.7);
          const grow = new THREE.Vector3(1, mix(1.1, -0.25, Math.min(1, t * 1.6)) + (random() - 0.5) * 0.3, 0.12).normalize();
          matrix.compose(new THREE.Vector3(x, y + (random() - 0.5) * 2 * band, z), turn.setFromUnitVectors(up, grow), size.setScalar(0.7 + random() * 0.6));
          hairs.setMatrixAt(i, matrix);
        }
        hairs.castShadow = true;
        add(hairs);
      }
    }

    // Tears.
    const wet = {
      one: new THREE.MeshStandardMaterial({ color: '#a9d8ee', roughness: 0.04, metalness: 0.15 }),
      stream: new THREE.MeshStandardMaterial({ color: '#a9d8ee', roughness: 0.04, metalness: 0.15 }),
      mascara: new THREE.MeshStandardMaterial({ color: '#141216', roughness: 0.25 }),
      blood: new THREE.MeshStandardMaterial({ color: '#a80f14', roughness: 0.15 }),
      glitter: new THREE.MeshStandardMaterial({ color: '#f2c24a', emissive: '#e0a020', emissiveIntensity: 0.7, metalness: 0.8, roughness: 0.25 }),
    }[a.falling];
    const heavy = a.falling === 'one' ? 0 : a.falling === 'stream' || a.falling === 'blood' ? 1 : 0.8;
    const lowerY = -r * (a.lids === 'squeezed' ? 0.25 : 0.6);
    const tracks: { x: number; end: number; wide: number }[] = [];
    if (a.falling === 'one') tracks.push({ x: r * 0.45, end: -r * 2.3, wide: 0.09 });
    else {
      tracks.push({ x: r * 0.75, end: bottom * 0.97, wide: 0.11 }, { x: -r * 0.7, end: bottom * 0.8, wide: 0.1 });
      if (a.falling !== 'stream') tracks.push({ x: r * 0.1, end: bottom * (0.55 + random() * 0.3), wide: 0.085 });
      if (a.falling === 'mascara') tracks.push({ x: r * 1.05, end: bottom * 0.6, wide: 0.07 });
    }
    const drips: P[] = [];
    for (const track of tracks) {
      const sway = (random() - 0.5) * r * 0.5;
      const lean = (r * 0.2 - track.x) * 0.45;
      const path: P[] = [
        [track.x, lowerY, r * 0.34],
        [track.x + sway * 0.3, lowerY - r * 0.55, r * 0.14],
        [track.x + sway, mix(lowerY, track.end, 0.4), r * 0.07],
        [track.x + sway * 0.4 + lean * 0.6, mix(lowerY, track.end, 0.75), r * 0.07],
        [track.x + lean, track.end, r * 0.07],
      ];
      const stream = crease(path, r * track.wide, wet);
      stream.scale.z = 1;
      stream.castShadow = true;
      add(stream);
      // A fat bead hangs at the end of each run, and one wells on the lid.
      pad(wet, [r * track.wide * 2.0, r * track.wide * 2.7, r * track.wide * 1.7], [track.x + lean, track.end, r * 0.12]);
      pad(wet, [r * 0.17, r * 0.14, r * 0.14], [track.x, lowerY + r * 0.02, r * 0.42]);
      if (track.end < bottom * 0.75) drips.push([track.x + lean, track.end, r * 0.12]);
    }
    if (a.falling === 'one') drips.push([r * 0.2, bottom, r * 0.1]);
    if (a.falling === 'glitter') {
      const flecks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(r * 0.07), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd45e', emissiveIntensity: 1, metalness: 0.8, roughness: 0.2 }), 90);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 90; i++) {
        const track = tracks[i % tracks.length];
        const t = random();
        matrix.makeRotationZ(random() * 3).setPosition(track.x + (random() - 0.5) * r * (0.4 + t * 0.9), mix(lowerY, track.end, t), r * 0.1);
        flecks.setMatrixAt(i, matrix);
      }
      add(flecks);
    }

    const brass = s.material('#a8873f', { metalness: 0.8, roughness: 0.35 });
    const high = r * 7.2;
    face.position.y = high;
    face.rotation.x = -0.2;
    const flip = random() < 0.5 ? -1 : 1;
    face.scale.x = flip;
    s.root.add(face);
    s.lathe([[0, 0], [r * 2.0, 0], [r * 2.0, r * 0.18], [r * 0.5, r * 0.4], [r * 0.2, r * 0.6], [0, r * 0.6]], brass, [0, 0, -r * 2.6]);
    s.rod([0, r * 0.4, -r * 2.6], [0, high + r * 0.5, -r * 0.5], r * 0.14, brass);

    // Where the drops come off the cheek, in the thing's own space.
    face.updateMatrix();
    const starts = drips.map((drip) => new THREE.Vector3(...drip).applyMatrix4(face.matrix));
    const under = starts[0].clone().setY(0);
    const liquid = a.falling === 'glitter' ? wet : new THREE.MeshStandardMaterial({ color: (wet.color as THREE.Color).clone(), roughness: 0.04, metalness: 0.2 });
    let floor = 0;
    if (a.landing === 'pool') {
      for (let i = 0; i < 6; i++) {
        const turn = random() * Math.PI * 2, far = i === 0 ? 0 : r * (0.8 + random() * 1.6), size = i === 0 ? r * 1.8 : r * (0.3 + random() * 0.8);
        s.cylinder(size, size, r * 0.04, [under.x + Math.cos(turn) * far, r * 0.02, under.z + Math.sin(turn) * far * 0.7], liquid, 24);
      }
    } else if (a.landing === 'handkerchief') {
      const cloth = new THREE.PlaneGeometry(r * 5.2, r * 5.2, 14, 14);
      cloth.rotateX(-Math.PI / 2);
      const bumps = Array.from({ length: 7 }, () => [(random() - 0.5) * r * 5, (random() - 0.5) * r * 5, r * (0.3 + random() * 0.7)]);
      const spot = cloth.attributes.position;
      for (let i = 0; i < spot.count; i++) {
        const x = spot.getX(i), z = spot.getZ(i);
        let y = r * 0.06;
        for (const [bx, bz, bh] of bumps) y += bh * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (r * r * 1.3));
        spot.setXYZ(i, x * (1 - y / r * 0.12), y, z * (1 - y / r * 0.12));
      }
      cloth.computeVertexNormals();
      const linen = s.mesh(cloth, s.material('#f4f1ea', { roughness: 0.9, side: THREE.DoubleSide }), [under.x, 0, under.z + r * 0.5]);
      linen.rotation.y = random() * 1.5;
      s.cylinder(r * 0.75, r * 0.75, r * 0.5, [under.x, r * 0.3, under.z], liquid, 20).scale.set(1, 0.3, 0.8);
      const stitch = s.material(mood.warmth > 0.5 ? '#b23a4a' : '#3a5fa8', { roughness: 0.8 });
      s.ring(r * 0.4, r * 0.05, [under.x + r * 1.6, r * 0.2, under.z + r * 1.9], stitch).rotation.x = Math.PI / 2;
    } else if (a.landing === 'vial') {
      const tall = r * 2.6, wide = r * 0.62;
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d7ecea', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      s.lathe([[0, 0], [wide, 0], [wide, tall * 0.78], [wide * 0.55, tall * 0.9], [wide * 0.55, tall]], glass, [under.x, 0, under.z]);
      const lip = s.ring(wide * 0.6, r * 0.07, [under.x, tall, under.z], s.material('#b9d6d2', { roughness: 0.1 }));
      lip.rotation.x = Math.PI / 2;
      s.cylinder(wide, wide, r * 0.08, [under.x, r * 0.04, under.z], s.material('#b9d6d2', { roughness: 0.1 }), 20);
      const fill = tall * mix(0.2, 0.7, mood.density);
      s.cylinder(wide * 0.9, wide * 0.9, fill, [under.x, fill / 2 + r * 0.06, under.z], liquid, 20);
      const cork = s.cylinder(wide * 0.6, wide * 0.5, r * 0.6, [under.x + r * 1.7, wide * 0.55, under.z + r * 0.6], s.material('#b08a58', { roughness: 0.9 }), 12);
      cork.rotation.z = Math.PI / 2;
      floor = fill;
    } else if (a.landing === 'bowl') {
      s.lathe([[0, 0], [r * 0.9, 0], [r * 1.0, r * 0.15], [r * 2.2, r * 0.75], [r * 2.3, r * 0.75], [r * 2.3, r * 0.85], [r * 2.1, r * 0.85], [r * 0.9, r * 0.25], [0, r * 0.25]], s.material('#b58a3a', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), [under.x, 0, under.z]);
      s.cylinder(r * 1.75, r * 1.75, r * 0.04, [under.x, r * 0.62, under.z], liquid, 28);
      floor = r * 0.62;
    }

    // Drops in the air, each a teardrop that falls and starts again.
    const profile: [number, number][] = [[0, -1], [0.55, -0.8], [0.8, -0.3], [0.62, 0.3], [0.25, 1.0], [0, 1.5]];
    const dropShape = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const perStart = a.falling === 'one' ? 1 : 1 + Math.round(heavy * (1 + mood.energy * 2));
    const drops = starts.flatMap((start, index) => Array.from({ length: perStart }, (_, n) => {
      const mesh = s.mesh(dropShape, wet);
      const size = r * (0.16 + random() * 0.07);
      mesh.scale.setScalar(size);
      const to = index === 0 ? floor + size : size;
      return { mesh, start, to, phase: (n + 0.35 + random() * 0.4) / perStart, size };
    }));
    const pose = (time: number) => {
      for (const drop of drops) {
        const t = (time + drop.phase) % 1;
        // It swells on the edge for the first part, then lets go.
        const fall = t < 0.25 ? 0 : ((t - 0.25) / 0.75) ** 2;
        const grow = t < 0.25 ? 0.4 + t * 2.4 : 1;
        drop.mesh.position.set(drop.start.x, mix(drop.start.y - drop.size, drop.to, fall), drop.start.z);
        drop.mesh.scale.setScalar(drop.size * grow);
      }
    };
    pose(0.3);
    const pace = mix(0.35, 1.5, mood.energy) * (a.falling === 'one' ? 0.5 : 1);
    return s.finish({ update: (_dt, time) => pose(time * pace) });
  },
});

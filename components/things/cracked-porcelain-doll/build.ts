import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Damage, cloth, dollHead } from './doll';

const ERAS = {
  victorian: 'A long dark jewel-toned gown with a lace collar and a wide hem that hides the legs, 1880s.',
  edwardian: 'A white lawn frock with a broad coloured sash and a big hair bow, 1905.',
  twenties: 'A short straight drop-waisted dress in mustard with spots and a headband, 1920s.',
  fifties: 'A red gingham dress with puffed sleeves, a white pinafore and ankle socks, 1950s.',
  sailor: 'A navy sailor dress with a white square collar and striped trim.',
} as const;

export default defineThing({
  questions: {
    expression: choice('What expression is painted on its face?', {
      sweet: 'A small rosebud smile and soft arched brows, sweet and trusting.',
      blank: 'A straight closed mouth and level brows, giving nothing away.',
      startled: 'A round open mouth, wide eyes and brows lifted high, permanently startled.',
      sly: 'Heavy lids, eyes slid to one side, one brow raised and a crooked smirk.',
    }),
    damage: choice('Where is the damage?', {
      cheek: 'A single dark hairline crack running down one cheek from the eye.',
      'missing-eye': 'One glass eye has fallen in, leaving a black chipped socket.',
      'caved-crown': 'The top of the skull is smashed in, a jagged open bowl with nothing inside.',
      'gold-seam': 'Broken and lovingly repaired: a bright gold seam crosses the face from brow to jaw.',
      shattered: 'A whole shard is gone from the jaw and cheek, leaving a black hole with cracks radiating.',
      forehead: 'A star of cracks spreading from one impact point in the middle of the forehead.',
    }),
    hair: choice('What hair does it have?', {
      curls: 'A full wig of tight mohair curls.',
      braids: 'Two plaits hanging over the shoulders, tied with ribbon.',
      ringlets: 'Long sausage ringlets falling either side of the face.',
      bald: 'No wig at all: a bald head with the round pate hole open on top.',
    }),
    haircolour: choice('What colour is the hair?', {
      blonde: 'Pale flaxen blonde.',
      auburn: 'Red-brown auburn.',
      brown: 'Dark chestnut brown.',
      black: 'Raven black.',
    }),
    iris: choice('What colour are the glass eyes?', {
      blue: 'Bright paperweight blue.',
      brown: 'Warm brown.',
      green: 'Grey-green.',
      violet: 'An unnatural violet.',
    }),
    era: choice('What is it wearing?', ERAS),
    story: choice('What happened to it?', {
      dropped: 'Dropped a moment ago: slumped sideways with fresh white shards on the ground around it.',
      'loved-bald': 'Loved nearly to pieces: paint rubbed off the cheeks, hair worn to tufts, a shoe lost, a patch on the dress.',
      burned: 'Pulled from a fire: one side blackened with soot, the hem and hair singed.',
      'never-played': 'Never played with: still in its open box with tissue paper and a tag on the wrist.',
      mended: 'Mended again and again: a mismatched replacement arm and a sticking plaster.',
    }),
    posture: score('How does it sit?', ['Primly upright', 'Leaning a little', 'Slumped right over to one side']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const hh = 0.125, hk = hh / 0.1;
    const { mood, random } = context;
    const boxed = a.story === 'never-played';
    const wear = Math.min(1, mood.wear * (boxed ? 0.35 : 1) + (a.story === 'loved-bald' ? 0.25 : 0));
    const soot = a.story === 'burned' ? mix(0.6, 0.95, random()) : 0;
    const skinColour = new THREE.Color('#f3dccd').lerp(new THREE.Color('#f7cdb8'), mood.warmth * 0.6);
    const skin = new THREE.MeshStandardMaterial({ color: skinColour.clone().lerp(new THREE.Color('#40342a'), wear * 0.2 + soot * 0.35), roughness: 0.42 });
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#b9ad9a'), 0.12 + wear * 0.5).getStyle();
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const limb = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, material: THREE.Material) => {
      const d = to.clone().sub(from);
      const mesh = put(parent, new THREE.CylinderGeometry(r1, r0, d.length(), 12), material);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    const dress = {
      victorian: { colour: ['#5a2348', '#1f4a3c', '#6b1f2a'][Math.floor(random() * 3)], accent: '#e9e0cc', pattern: 'plain', hem: 0.155, sleeve: 0.024 },
      edwardian: { colour: '#f1ece0', accent: ['#5d86b8', '#d07a94', '#7ea66a'][Math.floor(random() * 3)], pattern: 'plain', hem: 0.125, sleeve: 0.03 },
      twenties: { colour: '#cfa23a', accent: '#2f5d62', pattern: 'dots', hem: 0.085, sleeve: 0.016 },
      fifties: { colour: '#f3ede2', accent: '#c93131', pattern: 'gingham', hem: 0.115, sleeve: 0.034 },
      sailor: { colour: '#22355c', accent: '#f1ece0', pattern: 'stripe', hem: 0.105, sleeve: 0.022 },
    }[a.era] as { colour: string; accent: string; pattern: 'plain' | 'gingham' | 'stripe' | 'dots'; hem: number; sleeve: number };
    const fabric = cloth(fade(dress.colour), dress.pattern, fade(dress.accent), wear, random, soot);
    fabric.repeat.set(6, 2);
    const dressMaterial = new THREE.MeshStandardMaterial({ map: fabric, roughness: 0.9, side: THREE.DoubleSide });
    const plain = new THREE.MeshStandardMaterial({ color: fade(dress.colour), roughness: 0.9 });
    const trim = new THREE.MeshStandardMaterial({ color: fade(dress.accent), roughness: 0.85 });
    const leather = new THREE.MeshStandardMaterial({ color: a.era === 'fifties' ? '#16110f' : a.era === 'edwardian' ? '#efe8d8' : '#3a2318', roughness: 0.4 });
    const stocking = new THREE.MeshStandardMaterial({ color: a.era === 'victorian' || a.era === 'sailor' ? '#2a2a2e' : '#efe9dc', roughness: 0.9 });

    // Legs straight out in front, toes up.
    const lower = new THREE.Group();
    s.root.add(lower);
    for (const side of [-1, 1]) {
      const hip = new THREE.Vector3(side * 0.028, 0.024, 0.02);
      const foot = new THREE.Vector3(side * (0.04 + random() * 0.012), 0.02, 0.2 + random() * 0.012);
      limb(lower, hip, foot, 0.022, 0.016, a.era === 'fifties' || a.era === 'twenties' ? skin : stocking);
      if (a.era === 'fifties') limb(lower, foot.clone().add(new THREE.Vector3(0, 0, -0.035)), foot, 0.0185, 0.0185, stocking);
      const bare = a.story === 'loved-bald' && side > 0;
      const shoe = put(lower, new THREE.SphereGeometry(1, 14, 10), bare ? skin : leather, foot.x, 0.034, foot.z + 0.008);
      shoe.scale.set(0.02, 0.036, 0.022);
      shoe.rotation.z = side * -0.25;
      if (!bare) put(lower, new THREE.BoxGeometry(0.036, 0.008, 0.004), leather, foot.x, 0.03, foot.z + 0.03);
    }

    // Skirt: a rippled bell spread on the ground.
    const hem = dress.hem;
    const skirtProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      skirtProfile.push(new THREE.Vector2(mix(0.042, hem, Math.sin(t * Math.PI / 2) ** 0.8), mix(0.105, 0.006, t ** 1.6)));
    }
    const skirtGeometry = new THREE.LatheGeometry(skirtProfile, 48);
    const sp = skirtGeometry.getAttribute('position') as THREE.BufferAttribute;
    const folds = 9 + Math.floor(random() * 4), phase = random() * 6;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
      const t = 1 - y / 0.105, angle = Math.atan2(x, z);
      const k = 1 + t * t * 0.13 * Math.sin(angle * folds + phase);
      sp.setXYZ(i, x * k, y + t * t * 0.006 * Math.cos(angle * folds + phase), z * k * (z > 0 ? 1.3 : 0.85));
    }
    skirtGeometry.computeVertexNormals();
    put(lower, skirtGeometry, dressMaterial, 0, 0, 0.012);
    if (a.era === 'victorian' || a.era === 'edwardian') {
      // A lace frill at the hem.
      const frill = put(lower, new THREE.TorusGeometry(hem * 0.98, 0.006, 6, 48), trim, 0, 0.008, 0.012);
      frill.rotation.x = Math.PI / 2;
      frill.scale.set(1.02, 1.12, 1);
      frill.position.z = 0.03;
    }

    // Everything above the hips leans together.
    const upper = new THREE.Group();
    upper.position.set(0, 0.03, 0);
    const lean = a.posture + (a.story === 'dropped' ? 0.35 : 0);
    const leanSide = random() < 0.5 ? -1 : 1;
    upper.rotation.z = leanSide * Math.min(lean, 1.2) * 0.42;
    upper.rotation.x = -0.06;
    s.root.add(upper);
    const dropWaist = a.era === 'twenties';
    put(upper, new THREE.CylinderGeometry(0.036, dropWaist ? 0.044 : 0.04, 0.125, 18), plain, 0, 0.06, 0).scale.z = 0.8;
    // Waist sash or belt.
    const sash = put(upper, new THREE.CylinderGeometry(0.0415, 0.0425, a.era === 'edwardian' ? 0.026 : 0.012, 18), trim, 0, dropWaist ? 0.012 : 0.05, 0);
    sash.scale.z = 0.82;
    if (a.era === 'fifties') {
      const bib = put(upper, new THREE.BoxGeometry(0.046, 0.06, 0.004), new THREE.MeshStandardMaterial({ color: fade('#f6f1e6'), roughness: 0.9 }), 0, 0.08, 0.031);
      bib.rotation.x = -0.05;
    }
    if (a.era === 'sailor') {
      const collar = put(upper, new THREE.BoxGeometry(0.086, 0.05, 0.012), trim, 0, 0.105, -0.026);
      collar.rotation.x = 0.1;
      const knot = put(upper, new THREE.ConeGeometry(0.014, 0.04, 4), new THREE.MeshStandardMaterial({ color: fade('#b8242c'), roughness: 0.8 }), 0, 0.085, 0.034);
      knot.rotation.x = Math.PI;
    }
    // Lace collar.
    const collar = put(upper, new THREE.TorusGeometry(0.026, a.era === 'victorian' ? 0.011 : 0.006, 8, 24), a.era === 'sailor' ? trim : new THREE.MeshStandardMaterial({ color: fade('#f4efe2'), roughness: 0.9 }), 0, 0.122, 0);
    collar.rotation.x = Math.PI / 2;
    if (a.story === 'loved-bald') {
      const patch = put(upper, new THREE.BoxGeometry(0.03, 0.028, 0.004), new THREE.MeshStandardMaterial({ color: fade('#3f6f8f'), roughness: 0.95 }), 0.012, 0.04, 0.034);
      patch.rotation.z = 0.3;
    }

    // Arms hang from puffed sleeves to bisque hands resting by the hips.
    const mismatch = new THREE.MeshStandardMaterial({ color: '#b97f5c', roughness: 0.6 });
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.047, 0.108, 0);
      const elbow = new THREE.Vector3(side * (0.068 + random() * 0.01), 0.05, 0.012);
      const hand = new THREE.Vector3(side * (0.072 + random() * 0.012), 0.004 + random() * 0.01, 0.05 + random() * 0.02);
      const armSkin = a.story === 'mended' && side > 0 ? mismatch : skin;
      const puff = put(upper, new THREE.SphereGeometry(1, 14, 10), plain, shoulder.x, shoulder.y, 0);
      puff.scale.set(dress.sleeve, dress.sleeve * 1.1, dress.sleeve);
      limb(upper, shoulder, elbow, 0.014, 0.013, a.era === 'victorian' || a.era === 'sailor' ? plain : armSkin);
      limb(upper, elbow, hand, 0.0125, 0.01, armSkin);
      const palm = put(upper, new THREE.SphereGeometry(1, 12, 8), armSkin, hand.x, hand.y, hand.z + 0.006);
      palm.scale.set(0.012, 0.009, 0.017);
      if (a.story === 'mended' && side > 0) {
        const wire = put(upper, new THREE.TorusGeometry(0.0145, 0.0025, 6, 16), new THREE.MeshStandardMaterial({ color: '#8a8a86', metalness: 0.7, roughness: 0.4 }), elbow.x, elbow.y, elbow.z);
        wire.rotation.x = Math.PI / 2;
      }
      if (boxed && side < 0) {
        const tag = s.label('No. ' + (100 + Math.floor(random() * 880)), 0.05, 0.028, [0, 0, 0], '#5a4632', '#efe2c0');
        upper.add(tag);
        tag.position.set(hand.x - 0.02, 0.022, hand.z + 0.03);
        tag.rotation.set(-0.5, 0.4, 0.2);
        limb(upper, hand, new THREE.Vector3(hand.x - 0.012, 0.03, hand.z + 0.026), 0.0012, 0.0012, trim);
      }
    }

    // Head.
    const damage: Damage[] = [];
    const lostEye = a.damage === 'missing-eye' ? (random() < 0.5 ? 'left' : 'right') : null;
    if (a.damage === 'cheek') damage.push('cheek');
    if (a.damage === 'gold-seam') damage.push('gold');
    if (a.damage === 'shattered') damage.push('shatter');
    if (a.damage === 'forehead') damage.push('forehead');
    if (a.damage === 'caved-crown') damage.push('forehead');
    if (lostEye) damage.push(lostEye === 'left' ? 'socket-left' : 'socket-right', 'cheek');
    if (mood.wear > 0.75 && a.damage !== 'cheek') damage.push('cheek');
    const caved = a.damage === 'caved-crown';
    const bald = a.hair === 'bald';
    const head = dollHead({
      h: hh, skin: skinColour.getStyle(), roughness: 0.3 + wear * 0.3, expression: a.expression,
      leftEye: lostEye !== 'left', rightEye: lostEye !== 'right',
      iris: { blue: '#2f6fd0', brown: '#6b3d1c', green: '#5f8f6a', violet: '#7a4fc8' }[a.iris],
      lid: 0, crown: caved ? 'caved' : bald ? 'open' : 'closed', paint: 1, damage, wear, soot,
      rub: a.story === 'loved-bald' ? 0.9 : wear * 0.3, random,
    });
    head.group.position.set(0, 0.118, 0);
    head.group.rotation.z = leanSide * Math.min(lean, 1) * 0.18;
    head.group.rotation.x = -0.2;
    upper.add(head.group);
    if (a.story === 'mended') {
      const plaster = put(head.group, new THREE.BoxGeometry(0.03, 0.011, 0.004), new THREE.MeshStandardMaterial({ color: '#e7c49c', roughness: 0.9 }), -0.025, 0.115, head.radius(0.115) * 0.93);
      plaster.rotation.set(-0.35, -0.45, 0.5);
    }

    // Hair.
    const hairBase = new THREE.Color({ blonde: '#e3c779', auburn: '#96421f', brown: '#4d2f1c', black: '#1c1816' }[a.haircolour]);
    hairBase.lerp(new THREE.Color('#1a1512'), soot * 0.75).lerp(new THREE.Color('#8f8676'), wear * 0.25);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairBase, roughness: 0.95 });
    const sparse = a.story === 'loved-bald' ? 0.28 : a.story === 'burned' ? 0.55 : 1;
    if (!bald) {
      const curls: { at: [number, number, number]; size: number }[] = [];
      const yc = head.centre, r = 0.042 * hk, count = a.hair === 'curls' ? 150 : 70;
      if (!caved && sparse > 0.5) {
        const cap = put(head.group, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMaterial, 0, yc + 0.004, -0.003);
        cap.scale.set(r * 1.04, 0.056 * hk, r * 1.06);
        cap.rotation.x = -0.42;
      }
      for (let i = 0; i < count; i++) {
        if (random() > sparse) continue;
        const angle = random() * Math.PI * 2, up = random();
        const elevation = caved ? mix(-0.5, 0.25, up) : mix(-0.45, 1.5, up);
        const face = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
        if (face < 0.95 && elevation < 0.72) continue;
        const rr = r * 1.06 * Math.cos(Math.min(elevation, 1.5));
        const size = (a.hair === 'curls' ? 0.0095 + random() * 0.006 : 0.007 + random() * 0.004) * hk;
        curls.push({ at: [Math.sin(angle) * rr, yc + Math.sin(elevation) * 0.055 * hk, Math.cos(angle) * rr], size });
      }
      if (a.hair === 'braids' || a.hair === 'ringlets') {
        for (const side of [-1, 1]) {
          if (sparse < 0.5 && side * leanSide > 0) continue;
          const strands = a.hair === 'braids' ? 1 : 3;
          for (let k = 0; k < strands; k++) {
            const length = Math.round((a.hair === 'braids' ? 13 : 9 + random() * 3) * (a.story === 'burned' ? 0.55 : 1));
            const bx = side * (0.043 * hk + (a.hair === 'braids' ? 0.004 : 0)), bz = a.hair === 'braids' ? 0.012 : -0.022 + k * 0.02;
            for (let j = 0; j < length; j++) {
              const twist = j * 1.9;
              curls.push({
                at: [bx + side * j * 0.0009 + Math.sin(twist) * 0.003, yc - 0.005 - j * 0.0078, bz + Math.cos(twist) * 0.003 + j * 0.0012],
                size: a.hair === 'braids' ? 0.0085 - j * 0.0002 : 0.0075,
              });
            }
            if (a.hair === 'braids') {
              const end = yc - 0.005 - length * 0.0078;
              const bow = put(head.group, new THREE.SphereGeometry(1, 10, 8), trim, bx + side * length * 0.0009, end + 0.006, bz + length * 0.0012 + 0.004);
              bow.scale.set(0.014, 0.006, 0.006);
            }
          }
        }
      }
      if (curls.length) {
        const mesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), hairMaterial, curls);
        head.group.add(mesh);
      }
      if ((a.era === 'edwardian' || a.era === 'twenties') && !caved && sparse > 0.5) {
        if (a.era === 'edwardian') {
          for (const side of [-1, 1]) {
            const loop = put(head.group, new THREE.SphereGeometry(1, 12, 8), trim, side * 0.022, head.top + 0.012, -0.004);
            loop.scale.set(0.022, 0.013, 0.008);
            loop.rotation.z = side * 0.35;
          }
        } else {
          const band = put(head.group, new THREE.TorusGeometry(0.0445 * hk, 0.0055, 6, 32), trim, 0, yc + 0.036, -0.002);
          band.rotation.x = Math.PI / 2 - 0.3;
        }
      }
    }

    // Shards on the ground.
    const shardCount = a.story === 'dropped' ? 14 : a.damage === 'shattered' || caved ? 6 : 0;
    if (shardCount) {
      const shard = new THREE.TetrahedronGeometry(1);
      shard.scale(1, 0.25, 0.8);
      s.scatter(shard, new THREE.MeshStandardMaterial({ color: skinColour, roughness: 0.3 }), Array.from({ length: shardCount }, () => {
        const angle = random() * Math.PI * 2, d = 0.13 + random() * 0.09;
        return { at: [Math.sin(angle) * d * 0.9 + leanSide * 0.05, 0.003, 0.03 + Math.cos(angle) * d] as [number, number, number], size: 0.006 + random() * 0.012 };
      }));
    }

    // The box it never left.
    if (boxed) {
      const card = new THREE.MeshStandardMaterial({ color: fade('#b98f5e'), roughness: 0.95 });
      const liner = new THREE.MeshStandardMaterial({ color: fade('#e9d8dc'), roughness: 0.95 });
      s.box([0.34, 0.012, 0.3], [0, -0.006, 0.07], card);
      s.box([0.34, 0.38, 0.012], [0, 0.19, -0.085], card);
      s.box([0.316, 0.356, 0.004], [0, 0.19, -0.077], liner);
      for (const side of [-1, 1]) s.box([0.012, 0.09, 0.3], [side * 0.17, 0.045, 0.07], card);
      s.box([0.34, 0.06, 0.012], [0, 0.03, 0.214], card);
      s.label('BEBE', 0.12, 0.04, [0, 0.345, -0.073], '#7a2a2a', '#f3e7c8');
      const tissue = new THREE.MeshStandardMaterial({ color: '#f6f2ea', roughness: 0.9, flatShading: true });
      for (let i = 0; i < 9; i++) {
        const wad = s.mesh(new THREE.IcosahedronGeometry(0.03 + random() * 0.02, 0), tissue, [(random() - 0.5) * 0.28, 0.012, -0.05 + random() * 0.05 + (i % 3) * 0.08]);
        wad.scale.y = 0.4;
        wad.rotation.y = random() * 3;
        if (Math.abs(wad.position.x) < 0.08) wad.position.x += Math.sign(wad.position.x || 1) * 0.09;
      }
    }

    return s.finish();
  },
});

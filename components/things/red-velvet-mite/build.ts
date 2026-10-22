import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, at, ball, lumpy, taper, water } from './bits';

const POSES = {
  striding: 'Mid-stride, legs staggered, going somewhere with great purpose.',
  feeling: 'Paused with its long front legs raised and waving, feeling the air ahead.',
  climbing: 'Hauling itself up and over a pebble in its way.',
  drinking: 'Head down at a bead of water bigger than its own face.',
  huddled: 'Legs tucked in tight, sitting dead still like a dropped button.',
} as const;
const SHADES = {
  scarlet: { hex: '#d81f1f', text: 'Pure signal scarlet.' },
  crimson: { hex: '#b4132c', text: 'Deep crimson, like theatre curtains.' },
  vermilion: { hex: '#ea4a1c', text: 'Hot orange-red vermilion.' },
  carmine: { hex: '#8c1026', text: 'Dark carmine, almost wine.' },
  coral: { hex: '#ef6c5e', text: 'Soft coral pink-red, sun-faded.' },
} as const;
type Shade = keyof typeof SHADES;
const GROUNDS = {
  soil: 'Dark damp crumbly soil.',
  sand: 'Pale rippled sand, the mite blazing against it.',
  moss: 'A cushion of green moss.',
  stone: 'A smooth grey stone.',
  leaf: 'A dead brown leaf.',
} as const;
const COMPANY = {
  alone: 'Alone: a single red dot.',
  pair: 'Two of them, one following the other.',
  procession: 'A scattered procession of them, out all at once after the rain.',
} as const;

export default defineThing({
  questions: {
    pose: choice('What is the mite doing?', POSES),
    shade: choice('What red is it?', Object.fromEntries(Object.entries(SHADES).map(([key, value]) => [key, value.text])) as Record<Shade, string>),
    plush: score('How deep is its velvet?', ['Short smooth nap', 'Plush velvet', 'Shaggy, like a tiny red bear']),
    plump: score('How plump is it?', ['Lean and flat', 'Rounded', 'Swollen fat like a ripe berry']),
    ground: choice('What is it walking on?', GROUNDS),
    company: choice('Is it alone?', COMPANY),
    trail: noul('Has it left a dotted trail of footprints behind it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const red = new THREE.Color(SHADES[a.shade].hex).lerp(new THREE.Color('#8b8275'), mood.wear * 0.15);
    const velvet = new THREE.MeshPhysicalMaterial({ color: red, roughness: 0.95, sheen: 1, sheenRoughness: 0.45, sheenColor: red.clone().lerp(new THREE.Color('#ffd0c0'), 0.6), emissive: red, emissiveIntensity: mix(0.08, 0.3, mood.cheer) });
    const limb = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: '#ffc0b0', emissive: red, emissiveIntensity: mix(0.05, 0.2, mood.cheer) });
    const fur = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: red, emissiveIntensity: mix(0.5, 0.8, mood.cheer) });
    const wet = water();

    const makeMite = (pose: keyof typeof POSES, detail: number) => {
      const mite = new THREE.Group(), bag = new Bag();
      const fat = mix(0.78, 1.2, a.plump);
      const body = new THREE.SphereGeometry(1, 30, 22);
      const position = body.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        // Broad shoulders in front, a waist, a narrower rounded rear, and a groove down the back.
        const width = 0.86 + 0.2 * z - 0.09 * Math.cos(z * 3.2) + 0.05 * Math.sin(z * 7);
        const groove = y > 0 ? 1 - 0.07 * Math.exp(-((x * 5) ** 2)) * (1 - z * z) : 1;
        position.setXYZ(i, x * 1.32 * width * mix(0.92, 1.08, a.plump), (y > 0 ? y * 0.8 * fat * groove : y * 0.45) * (0.92 + 0.12 * z), z * 1.75 - 0.25);
      }
      lumpy(body, 0.035, 3.6, random() * 9);
      const torso = new THREE.Mesh(body, velvet);
      torso.position.y = 0.85;
      torso.castShadow = torso.receiveShadow = true;
      const trunk = new THREE.Group();
      trunk.add(torso);
      if (pose === 'climbing') { trunk.rotation.x = -0.3; trunk.position.set(0, 0.2, 0.1); }
      mite.add(trunk);

      // The pile: short hairs standing off the hide.
      const hairs = Math.round(mix(700, 1900, a.plush) * detail);
      const pile = new THREE.InstancedMesh(new THREE.ConeGeometry(0.022, 1, 3, 1, true).translate(0, 0.5, 0), fur, hairs);
      const normals = body.getAttribute('normal'), dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), tint = new THREE.Color();
      for (let i = 0; i < hairs; i++) {
        let index = Math.floor(random() * position.count);
        if (position.getY(index) < -0.1) index = Math.floor(random() * position.count);
        n.set(normals.getX(index) + (random() - 0.5) * 0.7, normals.getY(index) + (random() - 0.5) * 0.7, normals.getZ(index) + (random() - 0.5) * 0.7 - 0.25).normalize();
        dummy.position.set(position.getX(index) + (random() - 0.5) * 0.12, 0.85 + position.getY(index), position.getZ(index) + (random() - 0.5) * 0.12);
        dummy.quaternion.setFromUnitVectors(up, n);
        const length = mix(0.09, 0.34, a.plush) * mix(0.6, 1.3, random());
        dummy.scale.set(1.4, length, 1.4);
        dummy.updateMatrix();
        pile.setMatrixAt(i, dummy.matrix);
        pile.setColorAt(i, tint.copy(red).offsetHSL((random() - 0.5) * 0.02, 0, 0.06 + random() * 0.16));
      }
      pile.instanceMatrix.needsUpdate = true;
      if (pile.instanceColor) pile.instanceColor.needsUpdate = true;
      trunk.add(pile);

      // Mouthparts and eyes.
      const dark = red.clone().multiplyScalar(0.55);
      bag.add(limb, new THREE.ConeGeometry(0.2, 0.5, 8), at([0, 0.52, 1.52], [1.75, 0, 0]), red.clone().offsetHSL(0, 0, 0.06));
      for (const side of [-1, 1]) {
        bag.add(limb, taper([[side * 0.14, 0.55, 1.45], [side * 0.26, 0.5, 1.75], [side * 0.14, 0.34, 1.9]], (t) => mix(0.07, 0.035, t), 6, 5), undefined, red.clone().offsetHSL(0, 0, 0.08));
        bag.add(limb, taper([[side * 0.36, 0.95, 1.2], [side * 0.42, 1.12, 1.3]], () => 0.045, 3, 5), undefined, dark);
        bag.add(limb, ball(0.075, 8), at([side * 0.43, 1.15, 1.31]), '#1a0508');
        // Eight legs, all springing from the front half.
        const angles = [0.42, 1.0, 1.95, 2.6], roots = [1.0, 0.72, 0.25, -0.05], reach = [1.7, 1.2, 1.15, 1.45];
        for (let leg = 0; leg < 4; leg++) {
          const swing = pose === 'striding' ? (leg % 2 === (side > 0 ? 0 : 1) ? 0.22 : -0.22) : (random() - 0.5) * 0.12;
          const angle = angles[leg] + swing, tuck = pose === 'huddled' ? 0.55 : 1;
          const dx = Math.sin(angle) * side, dz = Math.cos(angle), r = reach[leg] * tuck;
          const root: V3 = [side * 0.62, 0.5, roots[leg]];
          let knee: V3 = [root[0] + dx * r * 0.55, pose === 'huddled' ? 0.45 : 0.8, root[2] + dz * r * 0.55];
          let foot: V3 = [root[0] + dx * r, pose === 'climbing' ? [0.85, 0.5, 0, 0][leg] : 0, root[2] + dz * r];
          if (pose === 'climbing' && leg < 2) knee = [knee[0], knee[1] + 0.75 - leg * 0.3, knee[2]];
          if (leg === 0 && (pose === 'feeling' || pose === 'drinking')) {
            const high = pose === 'feeling' ? 1.5 + random() * 0.5 : 0.9;
            knee = [root[0] + dx * r * 0.45, 1.0 + high * 0.3, root[2] + dz * r * 0.5];
            foot = [root[0] + dx * r * 0.9 + side * 0.2, high, root[2] + dz * r * 1.05];
          }
          bag.add(limb, taper([root, knee, foot], (t) => mix(0.18, 0.07, t) * mix(0.9, 1.15, a.plump), 10, 6), undefined, red.clone().offsetHSL(0, 0, leg === 0 ? 0.05 : -0.02));
          if (detail > 0.5) for (let h = 0; h < 5; h++) {
            const t = 0.25 + h * 0.15, x = mix(knee[0], foot[0], t), y = mix(knee[1], foot[1], t), z = mix(knee[2], foot[2], t);
            bag.add(fur, new THREE.ConeGeometry(0.02, mix(0.12, 0.26, a.plush), 3, 1, true), at([x, y + 0.08, z], [(random() - 0.5) * 1.2, 0, (random() - 0.5) * 1.2]), red.clone().offsetHSL(0, 0, 0.1));
          }
        }
      }
      bag.flush(mite);
      return mite;
    };
    const ground = (object: THREE.Object3D, height = 0) => {
      object.updateMatrixWorld(true);
      object.position.y += height - new THREE.Box3().setFromObject(object).min.y;
      object.updateMatrixWorld(true);
    };

    // The ground patch.
    const bag = new Bag(), matte = s.material('#ffffff', { roughness: 0.95 });
    const R = a.company === 'procession' ? 7.5 : a.company === 'pair' ? 5 : 3.5;
    let top = 0.3;
    if (a.ground === 'soil') {
      bag.add(matte, lumpy(ball(1, 18), 0.1, 3.2, random() * 9), at([0, -0.15, 0], [0, 0, 0], [R, 0.5, R * 0.9]), '#35271d');
      for (let i = 0; i < 40; i++) {
        const t = random() * 6.3, r = R * (0.75 + random() * 0.3);
        bag.add(matte, new THREE.DodecahedronGeometry(0.15 + random() * 0.4), at([Math.cos(t) * r, 0.15, Math.sin(t) * r * 0.9], [random() * 3, random() * 3, 0]), random() < 0.3 ? '#6a5139' : '#2c2018');
      }
      top = 0.33;
    } else if (a.ground === 'sand') {
      bag.add(matte, new THREE.CylinderGeometry(R, R * 1.03, 0.3, 28), at([0, 0.15, 0], [0, 0, 0], [1, 1, 0.9]), '#e2cfa2');
      for (let i = 0; i < 9; i++) bag.add(matte, taper([[-R * 0.85, 0.3, -R * 0.75 + i * R * 0.19], [0, 0.32, -R * 0.7 + i * R * 0.19 + Math.sin(i) * 0.3], [R * 0.85, 0.3, -R * 0.75 + i * R * 0.19]], () => 0.11, 10, 4), at([0, 0, 0], [0, 0, 0], [Math.sqrt(Math.max(0.1, 1 - ((i - 4) / 5.2) ** 2)), 1, 1]), '#cdb886');
      top = 0.34;
    } else if (a.ground === 'moss') {
      bag.add(matte, ball(1, 18), at([0, 0, 0], [0, 0, 0], [R, 0.7, R * 0.9]), '#3a5524');
      const green = new THREE.Color().setHSL(mix(0.33, 0.24, mood.warmth), mix(0.45, 0.72, mood.cheer), 0.36);
      const tufts = Math.round(R * R * 12);
      for (let i = 0; i < tufts; i++) {
        const t = random() * 6.3, r = Math.sqrt(random()) * R * 0.96;
        bag.add(matte, new THREE.ConeGeometry(0.14, 0.5 + random() * 0.5, 4, 1, true), at([Math.cos(t) * r, 0.7 * Math.sqrt(1 - (r / R) ** 2) + 0.2, Math.sin(t) * r * 0.9], [(random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.8]), green.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.14));
      }
      top = 0.78;
    } else if (a.ground === 'stone') {
      bag.add(s.material('#ffffff', { roughness: 0.55 }), lumpy(ball(1, 20), 0.05, 2.2, random() * 9), at([0, 0.2, 0], [0, 0, 0], [R, 1.3, R * 0.88]), '#8e9294');
      top = 1.42;
    } else {
      const leaf = new THREE.CircleGeometry(R, 30), position = leaf.getAttribute('position'), wobble = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), r = Math.hypot(x, y) / R, t = Math.atan2(y, x);
        position.setXYZ(i, x * (1 + 0.16 * Math.sin(t * 7 + wobble) * r) * 1.15, y * (1 + 0.16 * Math.sin(t * 7 + wobble) * r) * 0.82, r * r * r * 1.1 * Math.max(0, Math.sin(t * 2 + wobble)));
      }
      leaf.computeVertexNormals();
      bag.add(s.material('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), leaf, at([0, 0.18, 0], [-Math.PI / 2, 0, 0]), new THREE.Color('#7d5732').lerp(new THREE.Color('#a8742e'), mood.warmth * 0.6));
      bag.add(matte, taper([[-R * 1.25, 0.2, 0], [0, 0.26, 0], [R * 1.25, 0.2, 0]], () => 0.09, 6, 4), undefined, '#c59d68');
      for (let i = -3; i <= 3; i++) if (i) bag.add(matte, taper([[i * R * 0.25, 0.24, 0], [i * R * 0.3, 0.24, Math.sign(i) * 0 + R * 0.4], [i * R * 0.36, 0.22, R * 0.68]], () => 0.05, 5, 4), at([0, 0, 0], [0, i % 2 ? Math.PI : 0, 0]), '#c59d68');
      top = 0.24;
    }

    const hero = makeMite(a.pose, 1), holder = new THREE.Group();
    holder.add(hero);
    s.root.add(holder);
    const heroZ = a.company === 'alone' ? 0 : R * 0.42;
    holder.position.set(a.company === 'alone' ? 0 : R * 0.12, 0, heroZ);
    if (a.pose === 'climbing') {
      bag.add(s.material('#ffffff', { roughness: 0.6 }), lumpy(ball(1, 12), 0.08, 2.4, 5), at([holder.position.x, top + 0.05, heroZ + 1.55], [0, 0.4, 0], [1.45, 0.82, 1.0]), a.ground === 'stone' ? '#5d5148' : '#8e9294');
      ground(hero, top - 0.03);
    } else {
      if (a.pose === 'feeling') hero.rotation.x = -0.16;
      if (a.pose === 'drinking') hero.rotation.x = 0.12;
      ground(hero, top - 0.03);
    }
    if (a.pose === 'drinking') {
      const bead = new THREE.Mesh(ball(0.85, 16), wet);
      bead.scale.y = 0.8;
      bead.position.set(holder.position.x, top + 0.62, heroZ + 2.7);
      const glint = new THREE.Mesh(ball(0.16, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
      glint.position.set(holder.position.x - 0.3, top + 1.1, heroZ + 3);
      s.root.add(bead, glint);
      bag.add(matte, new THREE.CircleGeometry(0.8, 14), at([holder.position.x, top + 0.02, heroZ + 2.7], [-Math.PI / 2, 0, 0]), '#55666a');
    }
    const others: THREE.Group[] = [];
    const followers = a.company === 'pair' ? 1 : a.company === 'procession' ? 4 + Math.round(mood.density * 3) : 0;
    for (let i = 0; i < followers; i++) {
      const mite = makeMite(random() < 0.6 ? 'striding' : 'feeling', 0.4), wrap = new THREE.Group();
      wrap.add(mite);
      wrap.scale.setScalar(a.company === 'pair' ? 0.72 : 0.42 + random() * 0.25);
      const back = a.company === 'pair' ? 4.2 : 2.6 + i * 1.7;
      wrap.position.set(holder.position.x + Math.sin(i * 1.9 + 1) * R * 0.38, 0, Math.max(-R * 0.72, heroZ - back));
      wrap.rotation.y = (random() - 0.5) * 0.9;
      s.root.add(wrap);
      ground(mite, (top - 0.03) / wrap.scale.y);
      others.push(wrap);
    }
    if (a.trail) {
      const pit = a.ground === 'sand' ? '#a8935f' : a.ground === 'stone' ? '#5c6062' : '#1c140f';
      for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
        const z = heroZ - 1.6 - i * 0.55 - (side > 0 ? 0.27 : 0), x = holder.position.x + side * 1.2 + Math.sin(i * 0.5) * 0.4;
        if (Math.hypot(x, z) < R * 0.86) bag.add(matte, new THREE.CircleGeometry(0.11, 6), at([x, top + 0.02, z], [-Math.PI / 2, 0, 0]), pit);
      }
    }
    bag.flush(s.root);

    s.root.scale.setScalar(0.011);
    const pace = mix(0.8, 6, mood.energy), amount = mix(0.008, 0.05, mood.energy), baseTilt = hero.rotation.x;
    return s.finish({
      update: (_dt, time) => {
        hero.rotation.x = baseTilt + Math.sin(time * pace) * amount;
        hero.rotation.z = Math.sin(time * pace * 0.5) * amount * (a.pose === 'huddled' ? 0.1 : 1);
        others.forEach((wrap, index) => { wrap.rotation.z = Math.sin(time * pace * 0.6 + index * 1.7) * amount; });
      },
    });
  },
});

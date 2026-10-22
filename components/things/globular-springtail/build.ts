import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, at, ball, lumpy, painted, taper, water } from './bits';

const POSES = {
  grazing: 'Head down, nose to the ground, placidly grazing a film of algae like a cow at pasture.',
  alert: 'Stopped and reared up a little, antennae high, staring straight out with huge eyes.',
  leaping: 'Flung into the air mid-leap, tail-spring snapped straight, legs trailing, crumbs kicked up below.',
  tumbled: 'Landed on its back after a jump, legs waving at the sky.',
} as const;
const PATTERNS = {
  plain: 'No markings, one soft colour fading paler on the belly.',
  mottled: 'Irregular dark tortoiseshell blotches.',
  banded: 'Bold dark bands across the back like a bumblebee.',
  striped: 'Fine lengthwise pinstripes from head to tail.',
  spotted: 'Neat round polka dots.',
  saddle: 'A single pale saddle patch outlined in dark, like a painted mask on its back.',
} as const;
const COATS = {
  amber: { base: '#e2a03f', mark: '#5a2e12', text: 'Warm amber-orange with brown markings.' },
  plum: { base: '#7b4b8a', mark: '#f1cf63', text: 'Plum purple with yellow markings.' },
  mustard: { base: '#d8c24c', mark: '#463a1c', text: 'Mustard yellow with dark markings.' },
  slate: { base: '#6f8199', mark: '#1e2836', text: 'Slate blue-grey with inky markings.' },
  rose: { base: '#eab5a8', mark: '#8c3b3d', text: 'Soft pink with rust-red markings.' },
  olive: { base: '#a1b55c', mark: '#3e4a20', text: 'Moss green with dark olive markings.' },
} as const;
type Coat = keyof typeof COATS;
const PERCHES = {
  leaf: 'A curled scrap of dead brown leaf with raised veins.',
  moss: 'A tuft of green moss.',
  mushroom: 'The domed cap of a tiny brown mushroom, like a hilltop.',
  humus: 'A few dark crumbs of soil.',
  lichen: 'A pale grey-green crust of lichen flakes.',
} as const;

export default defineThing({
  questions: {
    pose: choice('What is the springtail doing?', POSES),
    pattern: choice('What pattern is on its back?', PATTERNS),
    coat: choice('What colour is it?', Object.fromEntries(Object.entries(COATS).map(([key, value]) => [key, value.text])) as Record<Coat, string>),
    eyes: score('How big are its eyes?', ['Small dark beads', 'Large and glossy', 'Enormous, taking up half its face']),
    perch: choice('What is it standing on, or has it just left?', PERCHES),
    young: noul('Is a smaller, paler young one following it?'),
    dew: noul('Is a bead of water balanced on its back?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const coat = COATS[a.coat];
    const base = new THREE.Color(coat.base).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2);
    const mark = new THREE.Color(coat.mark);
    const wet = water();

    const backTexture = (pale: number) =>
      painted(256, 128, (ctx, w, h) => {
        const body = base.clone().lerp(new THREE.Color('#ffffff'), pale);
        const belly = body.clone().lerp(new THREE.Color('#fff4dc'), 0.55);
        // u = 0.75 is the spine, u = 0.25 the belly; paint twice so the seam wraps.
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#' + body.clone().lerp(belly, 0.5).getHexString());
        gradient.addColorStop(0.25, '#' + belly.getHexString());
        gradient.addColorStop(0.5, '#' + body.clone().lerp(belly, 0.5).getHexString());
        gradient.addColorStop(0.75, '#' + body.getHexString());
        gradient.addColorStop(1, '#' + body.clone().lerp(belly, 0.5).getHexString());
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ctx.strokeStyle = '#' + mark.clone().lerp(body, pale * 0.6).getHexString();
        const spine = w * 0.75;
        const both = (dx: number, y: number, rx: number, ry: number) => {
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(spine + side * dx, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        };
        if (a.pattern === 'mottled') for (let i = 0; i < 22; i++) both(random() * w * 0.2, h * (0.15 + random() * 0.7), 4 + random() * 9, 3 + random() * 7);
        if (a.pattern === 'banded') for (const v of [0.3, 0.5, 0.7]) { ctx.fillRect(w * 0.5, h * v - 6, w * 0.5, 12); ctx.fillRect(0, h * v - 6, w * 0.05, 12); }
        if (a.pattern === 'striped') for (let i = 0; i < 5; i++) both(i * w * 0.045, h * 0.5, 2.6, h * 0.36);
        if (a.pattern === 'spotted') for (let row = 0; row < 5; row++) for (let i = 0; i < 4; i++) both((i + (row % 2) * 0.5) * w * 0.06 + 3, h * (0.2 + row * 0.15), 5, 5);
        if (a.pattern === 'saddle') {
          both(0, h * 0.5, w * 0.17, h * 0.3);
          ctx.fillStyle = '#' + belly.getHexString();
          both(0, h * 0.5, w * 0.13, h * 0.22);
          ctx.fillStyle = '#' + mark.getHexString();
          both(w * 0.05, h * 0.42, 5, 5);
          both(0, h * 0.86, w * 0.2, h * 0.1);
        }
      });

    const makeBug = (pose: keyof typeof POSES, pale: number, eyeScale: number) => {
      const bug = new THREE.Group();
      const bag = new Bag();
      const skin = s.material('#ffffff', { roughness: 0.55 });
      const skinColour = base.clone().lerp(new THREE.Color('#ffffff'), pale);
      const dark = mark.clone().lerp(new THREE.Color('#2a1c14'), 0.4).lerp(skinColour, pale * 0.5);
      const flying = pose === 'leaping' || pose === 'tumbled';

      const abdomen = new THREE.SphereGeometry(1, 28, 20);
      abdomen.rotateX(Math.PI / 2);
      const back = new THREE.Mesh(abdomen, s.material('#ffffff', { map: backTexture(pale), roughness: 0.5 }));
      back.scale.set(1, 0.96, 1.2);
      back.position.set(0, 1.3, -0.4);
      back.castShadow = back.receiveShadow = true;
      bug.add(back);

      bag.add(skin, ball(1, 18), at([0, 1.0, 1.02], [0, 0, 0], [0.64, 0.62, 0.58]), skinColour.clone().lerp(new THREE.Color('#fff4dc'), 0.18));
      bag.add(skin, ball(0.5, 12), at([0, 0.92, 0.55]), skinColour);
      bag.add(skin, new THREE.ConeGeometry(0.2, 0.42, 8), at([0, 0.62, 1.42], [2.5, 0, 0]), skinColour.clone().lerp(new THREE.Color('#fff4dc'), 0.3));
      // Antennae: stubby, elbowed, a little club at the end.
      const lift = pose === 'alert' ? 0.35 : pose === 'grazing' ? -0.1 : 0.1;
      for (const side of [-1, 1]) {
        const tip: V3 = [side * 0.92, 1.55 + lift, 2.2 - lift * 0.5];
        bag.add(skin, taper([[side * 0.22, 1.42, 1.3], [side * 0.42, 1.95 + lift, 1.55], [side * 0.75, 1.9 + lift, 2.0 - lift * 0.4], tip], (t) => mix(0.11, 0.065, t), 12, 6), undefined, dark);
        bag.add(skin, ball(0.09, 8), at(tip), dark);
        // Legs.
        for (let leg = 0; leg < 3; leg++) {
          const z = 0.75 - leg * 0.36, dz = (1 - leg) * 0.42, jitter = (random() - 0.5) * 0.15;
          const path: V3[] = flying
            ? [[side * 0.36, 0.72, z], [side * (0.95 + jitter), 0.55, z + dz * 0.4 - 0.15], [side * (1.05 + jitter * 2), -0.12 + random() * 0.3, z + dz * 0.5 - 0.5]]
            : [[side * 0.36, 0.72, z], [side * 1.02, 0.78, z + dz + jitter], [side * 1.18, 0, z + dz * 1.5 + jitter]];
          bag.add(skin, taper(path, (t) => mix(0.12, 0.05, t), 10, 5), undefined, skinColour.clone().lerp(dark, 0.35));
        }
        // The spring: folded under the belly, or snapped out behind in flight.
        const spring: V3[] = flying
          ? [[side * 0.12, 0.5, -0.9], [side * 0.24, -0.2, -1.45], [side * 0.4, -0.85, -1.35]]
          : [[side * 0.12, 0.5, -1.0], [side * 0.14, 0.28, -0.45], [side * 0.16, 0.3, 0.15]];
        bag.add(skin, taper(spring, (t) => mix(0.13, 0.05, t), 10, 5), undefined, skinColour.clone().lerp(new THREE.Color('#fff4dc'), 0.5));
      }
      // A sparse pelt of bristles.
      for (let i = 0; i < 16; i++) {
        const u = (random() - 0.5) * 2.2, v = random() * 2.4 - 1.6;
        const n = new THREE.Vector3(Math.sin(u), Math.cos(u) * 0.96, v * 0.5).normalize();
        bag.add(skin, new THREE.ConeGeometry(0.022, 0.34, 3), at([n.x, 1.3 + n.y * 0.96, -0.4 + n.z * 1.2], [n.z * 0.9 - 0.3, 0, -n.x * 0.9]), dark);
      }
      bag.flush(bug);
      // Eyes are separate so they can be glossy.
      const eyeR = mix(0.15, 0.36, eyeScale);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#0d0b10', roughness: 0.08, metalness: 0.3 });
      const glintMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(ball(eyeR, 14), eyeMaterial);
        eye.position.set(side * 0.38, 1.2, 1.4);
        eye.castShadow = true;
        const glint = new THREE.Mesh(ball(eyeR * 0.3, 6), glintMaterial);
        glint.position.set(side * 0.38 - eyeR * 0.3, 1.2 + eyeR * 0.5, 1.4 + eyeR * 0.72);
        bug.add(eye, glint);
      }
      if (a.dew && pale === 0) {
        const bead = new THREE.Mesh(ball(0.42, 14), wet);
        bead.position.set(0.1, 2.52, -0.5);
        bug.add(bead);
      }
      bug.rotation.x = pose === 'grazing' ? 0.3 : pose === 'alert' ? -0.24 : pose === 'leaping' ? -0.75 : 0;
      if (pose === 'tumbled') bug.rotation.set(0.25, 0, Math.PI * 0.93);
      if (pose === 'leaping') bug.rotation.z = 0.3;
      return bug;
    };

    // The perch.
    const bag = new Bag();
    const matte = s.material('#ffffff', { roughness: 0.9 });
    let top = 0.5;
    const R = 2.8;
    if (a.perch === 'leaf') {
      const leaf = new THREE.CircleGeometry(R, 24);
      const position = leaf.getAttribute('position');
      const lobes = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), r = Math.hypot(x, y) / R, t = Math.atan2(y, x);
        const k = 1 + 0.2 * Math.sin(t * 5 + lobes) * r;
        position.setXYZ(i, x * k * 1.25, y * k, r * r * 1.3 * Math.max(0, Math.sin(t * 2 + lobes)));
      }
      leaf.computeVertexNormals();
      bag.add(s.material('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), leaf, at([0, 0.25, 0], [-Math.PI / 2, 0, 0]), mood.warmth > 0.5 ? '#9a5a2a' : '#7a5a3a');
      for (let i = -3; i <= 3; i++) bag.add(matte, taper([[0, 0.3, 0], [i * 0.9, 0.34, R * 0.55], [i * 1.5, 0.3 + Math.abs(i) * 0.05, R * 0.9]], (t) => mix(0.1, 0.03, t), 6, 4), at([0, 0, 0], [0, i % 2 ? Math.PI : 0, 0]), '#c79a62');
      bag.add(matte, taper([[-R * 1.3, 0.3, 0], [0, 0.36, 0], [R * 1.3, 0.3, 0]], () => 0.12, 6, 4), undefined, '#c79a62');
      top = 0.34;
    } else if (a.perch === 'moss') {
      bag.add(matte, lumpy(ball(1, 16), 0.1, 3, random() * 9), at([0, 0.2, 0], [0, 0, 0], [R, 1.1, R * 0.9]), '#3f5a26');
      const green = new THREE.Color().setHSL(mix(0.33, 0.22, mood.warmth), mix(0.4, 0.7, mood.cheer), 0.38);
      for (let i = 0; i < 110; i++) {
        const t = random() * 6.3, r = Math.sqrt(random()) * R * 0.95, centre = r < 1.5;
        bag.add(matte, new THREE.ConeGeometry(0.13, centre ? 0.4 : 0.8 + random() * 0.8, 4, 1, true), at([Math.cos(t) * r, 1.2, Math.sin(t) * r * 0.9], [(random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7]), green.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.14));
      }
      top = 1.25;
    } else if (a.perch === 'mushroom') {
      const capColour = new THREE.Color('#a9683a').lerp(new THREE.Color('#d8b48a'), mood.cheer * 0.4);
      const cap = new THREE.LatheGeometry([[0, 5.6], [1.2, 5.5], [2.6, 5.0], [3.6, 4.1], [4.0, 3.3], [3.7, 3.1], [0.5, 3.4]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
      bag.add(s.material('#ffffff', { roughness: 0.45 }), cap, at([0, 0, 0], [0, 0, 0], 0.7), capColour);
      for (let i = 0; i < 20; i++) bag.add(matte, new THREE.BoxGeometry(0.04, 0.2, 2.1), at([0, 2.24, 0], [0, (i / 20) * Math.PI, 0]), '#ead9bd');
      bag.add(matte, taper([[0.3, 0, 0.15], [0.1, 1.2, 0], [0, 2.45, 0]], (t) => mix(0.55, 0.36, t), 8, 8), undefined, '#e8dcc6');
      for (let i = 0; i < 9; i++) bag.add(matte, new THREE.DodecahedronGeometry(0.3 + random() * 0.4), at([(random() - 0.5) * 4, 0.25, (random() - 0.5) * 4]), '#3a2b1f');
      top = 3.88;
    } else if (a.perch === 'humus') {
      for (let i = 0; i < 30; i++) {
        const t = random() * 6.3, r = Math.sqrt(random()) * R, size = 0.3 + random() * 0.5;
        bag.add(matte, new THREE.DodecahedronGeometry(size), at([Math.cos(t) * r, size * 0.3 - (r < 2 ? 0.25 : 0), Math.sin(t) * r], [random() * 3, random() * 3, 0]), random() < 0.25 ? '#6d5338' : '#3a2b20');
      }
      bag.add(matte, ball(1, 14), at([0, 0, 0], [0, 0, 0], [R * 0.9, 0.55, R * 0.9]), '#33261c');
      top = 0.55;
    } else {
      const crust = new THREE.Color('#b9c7a8').lerp(new THREE.Color('#d9d2a0'), mood.warmth * 0.5);
      for (let i = 0; i < 26; i++) {
        const t = random() * 6.3, r = Math.sqrt(random()) * R * 0.85, size = 0.55 + random() * 0.7;
        bag.add(matte, lumpy(new THREE.CylinderGeometry(size, size * 0.8, 0.22, 9), 0.18, 2, i), at([Math.cos(t) * r, 0.12 + i * 0.012, Math.sin(t) * r], [(random() - 0.5) * 0.25, random() * 3, (random() - 0.5) * 0.25]), crust.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12));
      }
      bag.add(matte, new THREE.CylinderGeometry(R, R * 1.05, 0.12, 14), at([0, 0.06, 0]), '#6a5a48');
      top = 0.42;
    }
    if (a.pose === 'grazing' && a.perch !== 'mushroom') bag.add(matte, new THREE.CylinderGeometry(1.1, 1.2, 0.05, 12), at([0.1, top + 0.03, 1.9], [0, 0, 0], [0.9, 1, 0.6]), '#6f9a2e');
    if (a.pose === 'leaping') for (let i = 0; i < 9; i++) bag.add(matte, new THREE.DodecahedronGeometry(0.1 + random() * 0.14), at([(random() - 0.5) * 1.6, top + 0.3 + random() * 1.6, -0.6 + (random() - 0.5) * 1.6], [random() * 3, random() * 3, 0]), '#5a4532');
    bag.flush(s.root);

    const ground = (bug: THREE.Group, height: number) => {
      bug.updateMatrixWorld(true);
      bug.position.y += height - new THREE.Box3().setFromObject(bug).min.y;
    };
    const hero = makeBug(a.pose, 0, a.eyes);
    s.root.add(hero);
    ground(hero, a.pose === 'leaping' ? top + 2.3 : top - 0.03);
    let calf: THREE.Group | null = null;
    if (a.young) {
      calf = makeBug(a.pose === 'tumbled' ? 'alert' : 'grazing', 0.4, Math.min(1, a.eyes + 0.25));
      calf.scale.setScalar(0.45);
      calf.position.set(a.perch === 'mushroom' ? 2.6 : 1.9, 0, a.perch === 'mushroom' ? 2.2 : -0.5);
      calf.rotation.y = -0.7 + random() * 0.5;
      s.root.add(calf);
      ground(calf, a.perch === 'mushroom' ? 0 : top - 0.02);
    }
    if (a.dew) for (let i = 0; i < 4; i++) {
      const bead = new THREE.Mesh(ball(0.3 + random() * 0.35, 12), wet);
      const t = random() * 6.3, r = R * (0.45 + random() * 0.4);
      bead.position.set(Math.cos(t) * r, (a.perch === 'mushroom' ? 0 : top) + 0.3, Math.sin(t) * r);
      s.root.add(bead);
    }

    // Modelled about twelve times life size: at true size (2 mm) it is an unreadable speck on any stand.
    s.root.scale.setScalar(0.012);
    const baseY = hero.position.y, baseTilt = hero.rotation.x, pace = mix(0.8, 5, mood.energy), amount = mix(0.01, 0.06, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (a.pose === 'leaping') {
          hero.position.y = baseY + Math.sin(time * pace * 0.6) * 0.25;
          hero.rotation.x = baseTilt + Math.sin(time * pace * 0.4) * 0.2;
        } else {
          hero.rotation.x = baseTilt + Math.sin(time * pace) * amount;
          if (calf) calf.rotation.y += Math.sin(time * pace * 0.7) * amount * 0.02;
        }
      },
    });
  },
});

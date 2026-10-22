import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const HEADS = {
  ion: 'Pale electric cyan, cold and ionised.',
  ember: 'Ember orange with dull red tails, sparks off a fire.',
  rose: 'Rose pink and salmon, soft and bodily.',
  bone: 'Bone white with grey tails, like seeds or ash.',
  sulphur: 'Acid yellow-green, faintly poisonous.',
  ink: 'Nearly black heads with a thin bright rim, tadpoles in silhouette.',
} as const;
const TONES: Record<keyof typeof HEADS, [string, string]> = {
  ion: ['#58d6e6', '#2a8fb5'],
  ember: ['#ff8a2e', '#b5321f'],
  rose: ['#f27a9a', '#c2506c'],
  bone: ['#efe6d2', '#8d8a86'],
  sulphur: ['#cfdc3a', '#7d9a2a'],
  ink: ['#2a2530', '#4a4458'],
};

export default defineThing({
  questions: {
    crowd: score('How many knots are there?', ['A few dozen stragglers', 'A hundred or so', 'Several hundred', 'A dense swarm beyond counting']),
    tails: score('How long are their tails?', ['Stubby commas', 'As long as a tadpole tail', 'Long streamers', 'Very long fine threads']),
    heads: choice('What colour are the heads?', HEADS),
    arrangement: choice('How are they arranged?', {
      ring: 'A broad flat ring around an empty middle, tails pointing outward like the iris of an eye.',
      shoal: 'A loose shoal all swimming the same way, away from something off to one side.',
      file: 'A single file curving round in an arc, evenly spaced, like a procession or iron filings on a line.',
      burst: 'A round ball of them pointing out in every direction, a dandelion clock or a sea urchin.',
      spiral: 'Two spiral arms unwinding from the middle, like water flung off a spinning wheel.',
    }),
    sizes: choice('Are they all alike?', {
      alike: 'All the same size, an anonymous crowd.',
      mixed: 'Mostly small fry with a handful of big ones leading or lagging.',
      family: 'They come in close pairs and little clusters, big with small.',
    }),
    behaviour: choice('What are they doing right now?', {
      fleeing: 'Fleeing in good order: every tail perfectly straight and radial.',
      buffeted: 'Being buffeted: tails bent sideways and wavering as if in a crosswind.',
      defiant: 'Mostly fleeing, but a few have turned round and face back the way they came.',
      evaporating: 'Evaporating: the heads have shrunk to dots and the tails are wide and faint, nearly gone.',
    }),
    source: choice('Can we see what they are streaming away from?', {
      unseen: 'No. The centre is empty or out of sight.',
      star: 'Yes: a tiny, fierce white star.',
      dark: 'Yes: a small dark sphere with a thin glowing edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [headHex, tailHex] = TONES[a.heads];
    const count = Math.round(mix(36, 620, a.crowd ** 1.4) * mix(0.75, 1.25, mood.density));
    const baseSize = mix(0.1, 0.038, a.crowd) * (a.behaviour === 'evaporating' ? 0.6 : 1);
    const tailLength = mix(0.34, 1.2, a.tails) * (a.behaviour === 'evaporating' ? 1.3 : 1);
    const swarm = new THREE.Group();
    s.root.add(swarm);

    // Where each knot is. `centre` is what they all point away from.
    const centre = new THREE.Vector3();
    const spots: THREE.Vector3[] = [];
    const gauss = () => (random() + random() + random() - 1.5) / 1.5;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3();
      if (a.arrangement === 'ring') {
        const angle = random() * Math.PI * 2, r = 1.15 + random() ** 0.8 * 1.25;
        p.set(Math.cos(angle) * r, gauss() * 0.16, Math.sin(angle) * r);
      } else if (a.arrangement === 'shoal') {
        p.set(gauss() * 1.9 + 0.3, gauss() * 0.55, gauss() * 1.05);
        p.z *= 1 + (p.x + 2) * 0.12;
        centre.set(-3.6, 0, 0);
      } else if (a.arrangement === 'file') {
        const angle = -0.35 + (i / count) * Math.PI * 1.25 + gauss() * 0.01;
        p.set(Math.cos(angle) * 2.1, Math.sin(angle * 2) * 0.12, Math.sin(angle) * 2.1);
      } else if (a.arrangement === 'burst') {
        const y = random() * 2 - 1, t = random() * Math.PI * 2, w = Math.sqrt(1 - y * y), r = 0.75 + random() * 0.75;
        p.set(Math.cos(t) * w * r, y * r, Math.sin(t) * w * r);
      } else {
        const along = random(), arm = i % 2 ? Math.PI : 0, angle = arm + along * Math.PI * 1.7;
        const r = 0.45 + along * 1.9;
        p.set(Math.cos(angle) * r + gauss() * 0.14, gauss() * 0.1, Math.sin(angle) * r + gauss() * 0.14);
      }
      spots.push(p);
    }
    if (a.sizes === 'family') for (let i = 1; i < spots.length; i += 3) spots[i].copy(spots[i - 1]).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(baseSize * 3.2));

    const head = new THREE.IcosahedronGeometry(1, 1);
    const headColours: number[] = [];
    const hp = head.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      // The side facing the centre is lit: a bright cusp on every head.
      const lit = hp.getX(i) < -0.25 ? 1 : 0.5;
      headColours.push(lit, lit, lit);
    }
    head.setAttribute('color', new THREE.Float32BufferAttribute(headColours, 3));
    const tail = new THREE.ConeGeometry(1, 1, 7, 3, true);
    tail.rotateZ(-Math.PI / 2);
    tail.translate(0.5, 0, 0);
    const tp = tail.attributes.position;
    const tailColours: number[] = [];
    for (let i = 0; i < tp.count; i++) tailColours.push(1, 1, 1, 0.8 * (1 - tp.getX(i)) ** 0.9);
    tail.setAttribute('color', new THREE.Float32BufferAttribute(tailColours, 4));

    const glow = mix(0.25, 0.6, mood.cheer);
    const dark = a.heads === 'ink';
    const heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: dark ? '#000000' : headHex, emissiveIntensity: glow }), count);
    const tails = new THREE.InstancedMesh(tail, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }), count);
    const rims = dark ? new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), count) : null;
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), forward = new THREE.Vector3(1, 0, 0);
    const headColour = new THREE.Color(headHex), tailColour = new THREE.Color(tailHex), tint = new THREE.Color();
    const wind = new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.3, random() - 0.5).normalize();
    let lowest = 0, lowestHead = Infinity;
    spots.forEach((p, i) => {
      const away = p.clone().sub(centre).normalize();
      if (a.behaviour === 'buffeted') away.addScaledVector(wind, 0.55 + Math.sin(p.x * 2.1 + p.z * 1.7) * 0.35).add(new THREE.Vector3(gauss(), gauss() * 0.4, gauss()).multiplyScalar(0.25)).normalize();
      else away.add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.04 + mood.wear * 0.08)).normalize();
      if (a.behaviour === 'defiant' && random() < 0.09) away.negate();
      turn.setFromUnitVectors(forward, away);
      let size = baseSize * (0.75 + random() * 0.5);
      if (a.sizes === 'mixed') size = baseSize * (0.55 + random() ** 5 * 3.2);
      if (a.sizes === 'family') size = baseSize * (i % 3 === 0 ? 1.7 : 0.7);
      const length = tailLength * (0.6 + random() * 0.8) * Math.sqrt(size / baseSize);
      const girth = size * (a.behaviour === 'evaporating' ? 1.9 : 0.8);
      matrix.compose(p, turn, new THREE.Vector3(size * 1.15, size, size));
      heads.setMatrixAt(i, matrix);
      heads.setColorAt(i, tint.copy(headColour).offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.12).multiplyScalar(dark ? 1 : 1.7));
      matrix.compose(p, turn, new THREE.Vector3(length, girth, girth));
      tails.setMatrixAt(i, matrix);
      tails.setColorAt(i, tint.copy(tailColour).offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.1));
      if (rims) {
        matrix.compose(p.clone().addScaledVector(away, -size * 0.42), turn, new THREE.Vector3(size * 0.8, size * 0.94, size * 0.94));
        rims.setMatrixAt(i, matrix);
      }
      lowest = Math.min(lowest, p.y + away.y * length * 0.7);
      lowestHead = Math.min(lowestHead, p.y - size);
    });
    heads.castShadow = true;
    swarm.add(tails, heads);
    if (rims) swarm.add(rims);

    if (a.source !== 'unseen') {
      const core = new THREE.Group();
      core.position.copy(centre);
      const size = a.arrangement === 'burst' ? 0.2 : 0.16;
      core.add(new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), a.source === 'star'
        ? new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eaf6ff', emissiveIntensity: 1.2 })
        : new THREE.MeshStandardMaterial({ color: '#17141c', roughness: 0.8 })));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(size * (a.source === 'star' ? 2.4 : 1.25), 20, 14), new THREE.MeshBasicMaterial({ color: a.source === 'star' ? '#bfe6ff' : '#ffb060', transparent: true, opacity: a.source === 'star' ? 0.3 : 0.6, depthWrite: false, side: THREE.BackSide }));
      core.add(halo);
      if (a.source === 'star') for (let i = 0; i < 4; i++) {
        const ray = new THREE.Mesh(new THREE.ConeGeometry(size * 0.16, size * 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
        ray.rotation.z = (i * Math.PI) / 2;
        ray.translateY(size * 2.5);
        core.add(ray);
      }
      swarm.add(core);
    }

    if (a.arrangement !== 'burst' && a.arrangement !== 'shoal') swarm.rotation.x = 0.1 + random() * 0.12;
    const turnRate = mix(0.01, 0.12, mood.energy) * (a.arrangement === 'shoal' ? 0 : 1);
    const thing = s.finish({
      update: (dt, time) => {
        swarm.rotation.y += dt * turnRate;
        if (a.arrangement === 'shoal') swarm.position.y = Math.sin(time * mix(0.3, 1.4, mood.energy)) * 0.05;
      },
    });
    // Tails are see-through and unmeasured; lift the swarm so none of them is buried.
    s.root.position.y += Math.min(Math.max(0, lowestHead - lowest), 0.28) + 0.02;
    return thing;
  },
});

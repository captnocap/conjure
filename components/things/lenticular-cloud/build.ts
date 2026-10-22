import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const RIMS = {
  gold: 'Molten gold, the first or last sun catching the edge.',
  rose: 'Rose pink, soft alpenglow.',
  ember: 'Deep ember red-orange, like a coal.',
  silver: 'Cold bright silver-white, moonlit or midday.',
  pearl: 'Iridescent mother-of-pearl, bands of green, pink and violet.',
  green: 'An eerie pale green that no sun explains.',
} as const;
const RIM_COLOURS: Record<keyof typeof RIMS, string> = { gold: '#ffc23a', rose: '#ff8fa8', ember: '#ff5a26', silver: '#f6fbff', pearl: '#b8f0d0', green: '#8dffb0' };

export default defineThing({
  questions: {
    layers: score('How many stacked layers does it have?', ['A single lens', 'Two or three', 'A pile of five plates', 'A towering stack of eight']),
    form: choice('What is the overall shape of the stack?', {
      plates: 'An even pile of plates, each much like the last.',
      saucer: 'A flying saucer: one broad disc with a smaller dome on top.',
      top: 'A spinning top: widest at the crown and tapering to a small disc below.',
      cap: 'A hood draped right over the summit like a cap pulled down.',
      train: 'A wave train: the main stack and smaller echoes of it repeating downwind.',
    }),
    rim: choice('What colour is the light along its rim?', RIMS),
    edge: choice('How well is it holding its shape?', {
      crisp: 'Knife-crisp, as if turned on a lathe.',
      soft: 'Smooth but soft-edged, like risen dough.',
      fraying: 'Fraying downwind: streamers and wisps tearing off one side.',
      dissolving: 'Breaking up: ragged, lumpy, with fragments drifting loose.',
    }),
    size: score('How big is it against the mountain?', ['A small cap no wider than the summit', 'As wide as the mountain', 'A vast disc that dwarfs the peak']),
    over: choice('What does it hang above?', {
      volcano: 'A lone symmetrical snow-capped volcano.',
      crag: 'A jagged rock peak.',
      ridge: 'A long snowy ridge.',
      nothing: 'Nothing: the cloud alone, low over open ground.',
    }),
    lights: noul('Does it carry a ring of small lights under its rim, as if it were not a cloud at all?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = mix(110, 400, a.size);
    const count = Math.max(1, Math.round(mix(1, 8, a.layers)));
    const rimColour = new THREE.Color(RIM_COLOURS[a.rim]);
    const lit = new THREE.Color('#eef1f5').lerp(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.5, 0.92), 0.5);
    const shade = new THREE.Color().setHSL(mix(0.62, 0.74, mood.warmth), mix(0.16, 0.34, mood.cheer), mix(0.4, 0.58, mood.cheer));
    const p = [random() * 7, random() * 7, random() * 7, random() * 7];
    const noise = (angle: number, y: number) => Math.sin(angle * 3 + p[0]) * 0.45 + Math.sin(angle * 7 + p[1] + y * 0.02) * 0.3 + Math.sin(angle * 13 + p[2] - y * 0.05) * 0.25;
    const cloud = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: rimColour, emissiveIntensity: 0.05 });
    const glow = new THREE.MeshBasicMaterial({ color: rimColour, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const stack = new THREE.Group();
    s.root.add(stack);
    const ragged = a.edge === 'fraying' ? 0.5 : a.edge === 'dissolving' ? 0.7 : 0;

    /** One lens: a lathe with a domed top, a flatter base and a rim that takes the light. */
    const lens = (radius: number, thick: number, x: number, y: number, z: number, parent: THREE.Object3D = stack, hood = 0) => {
      const up = a.edge === 'crisp' ? 0.75 : 0.5, down = a.edge === 'crisp' ? 0.9 : 0.55;
      const profile: THREE.Vector2[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) { const f = i / steps; profile.push(new THREE.Vector2(Math.max(radius * f, 0.01), -thick * 0.32 * Math.pow(1 - f * f, down) - hood * radius * f * f)); }
      for (let i = steps - 1; i >= 0; i--) { const f = i / steps; profile.push(new THREE.Vector2(Math.max(radius * f, 0.01), thick * 0.68 * Math.pow(1 - f * f, up) - hood * radius * f * f)); }
      const geometry = new THREE.LatheGeometry(profile, 56);
      const position = geometry.attributes.position;
      const colours = new Float32Array(position.count * 3);
      const tint = new THREE.Color(), hue = new THREE.Color();
      const q = random() * 7;
      for (let i = 0; i < position.count; i++) {
        let px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
        const rho = Math.hypot(px, pz) / radius, angle = Math.atan2(pz, px);
        const row = i % (steps * 2 + 1), top = row > steps;
        if (ragged) {
          const n = noise(angle + q, py);
          const tear = Math.pow(rho, 3) * ragged;
          const downwind = Math.max(0, Math.cos(angle));
          px += radius * tear * (a.edge === 'fraying' ? downwind * (0.25 + 0.45 * Math.max(0, n + 0.2)) : n * 0.22);
          pz += radius * tear * n * (a.edge === 'fraying' ? 0.05 : 0.2);
          py += thick * tear * n * 0.5 + (a.edge === 'dissolving' ? thick * 0.25 * Math.sin(px * 0.03 + q) * Math.sin(pz * 0.04 + q) : 0);
          position.setXYZ(i, px, py, pz);
        }
        tint.copy(top ? lit : shade);
        if (top) tint.lerp(shade, Math.max(0, 0.42 * (1 - rho) + 0.1 * Math.sin(rho * 34 + q)));
        if (a.rim === 'pearl') hue.setHSL((angle / (Math.PI * 2) + rho * 1.5 + q) % 1, 0.75, 0.74); else hue.copy(rimColour);
        tint.lerp(hue, Math.pow(Math.min(rho, 1), top ? 6 : 2.2) * (top ? 0.7 : 0.95));
        colours.set([tint.r, tint.g, tint.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, cloud);
      mesh.position.set(x, y, z);
      mesh.scale.z = 0.78;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      if (!ragged) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.992, thick * 0.07, 6, 56), glow);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(x, y - hood * radius, z);
        halo.scale.y = 0.78;
        parent.add(halo);
      }
      return mesh;
    };

    /** A whole stack, returning its height. Layers lean a little downwind as they rise. */
    const pile = (radius: number, layers: number, parent: THREE.Object3D) => {
      let y = 0, widest = { radius: 0, y: 0, x: 0 };
      const lean = (random() - 0.3) * 0.08;
      for (let i = 0; i < layers; i++) {
        const f = layers === 1 ? 1 : i / (layers - 1);
        let r = radius * mix(0.78, 1, random()), thick = radius * mix(0.13, 0.19, random()), hood = 0;
        if (a.form === 'saucer') { r = i === 0 ? radius : i === layers - 1 && layers > 1 ? radius * 0.42 : radius * mix(0.55, 0.8, random()) * (1 - f * 0.3); thick = i === layers - 1 && layers > 1 ? radius * 0.3 : radius * 0.12; if (layers === 1) thick = radius * 0.24; }
        else if (a.form === 'top') r = radius * mix(0.28, 1, Math.pow(f, 0.8));
        else if (a.form === 'cap' && i === 0) { r = radius; thick = radius * 0.2; hood = a.over === 'nothing' ? 0.1 : 0.3; }
        const x = lean * radius * i + (random() - 0.5) * radius * 0.05;
        y += thick * 0.32;
        lens(r, thick, x, y, (random() - 0.5) * radius * 0.05, parent, hood);
        if (r >= widest.radius) widest = { radius: r, y: y - thick * 0.3, x };
        y += thick * (a.form === 'saucer' && i === 0 ? 0.3 : mix(0.42, 0.62, random()));
      }
      return { height: y, widest };
    };
    const main = pile(R, count, stack);
    if (a.form === 'train') {
      let x = R * 1.5;
      for (const k of [0.56, 0.34]) {
        const echo = new THREE.Group();
        echo.position.set(x, R * 0.06 * (1 - k), (random() - 0.5) * R * 0.3);
        stack.add(echo);
        pile(R * k, Math.max(1, Math.round(count * k)), echo);
        x += R * k * 2.1;
      }
    }
    if (a.edge === 'dissolving' || a.edge === 'fraying') {
      const scraps = a.edge === 'dissolving' ? 9 : 5;
      for (let i = 0; i < scraps; i++) {
        const angle = a.edge === 'fraying' ? (random() - 0.5) * 1.4 : random() * 7, d = R * mix(1.0, 1.55, random());
        lens(R * mix(0.07, 0.18, random()), R * mix(0.03, 0.06, random()), Math.cos(angle) * d, random() * main.height, Math.sin(angle) * d * 0.8);
      }
    }
    let lamps: THREE.Object3D | null = null;
    if (a.lights) {
      const ring = new THREE.Group();
      ring.position.set(main.widest.x, main.widest.y, 0);
      const lamp = new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: a.rim === 'green' ? '#7dffa0' : '#ffe9a0', emissiveIntensity: 2 });
      const bulb = new THREE.SphereGeometry(R * 0.022, 10, 8);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(bulb, lamp);
        const angle = i / n * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * main.widest.radius * 0.8, -R * 0.035, Math.sin(angle) * main.widest.radius * 0.8 * 0.78);
        ring.add(mesh);
      }
      stack.add(ring);
      lamps = ring;
    }

    // The ground it stands over.
    let summit = 0;
    if (a.over !== 'nothing') {
      const base = 230, height = a.over === 'ridge' ? 210 : a.over === 'crag' ? 330 : 300;
      const points: THREE.Vector2[] = [];
      const crater = a.over === 'volcano' ? 0.1 : 0.012;
      for (let i = 0; i <= 18; i++) {
        const f = i / 18;
        const slope = a.over === 'volcano' ? Math.pow(1 - f, 1.45) : Math.pow(1 - f, 1.1);
        points.push(new THREE.Vector2(Math.max(base * (crater + (1 - crater) * slope), 0.5), height * f));
      }
      if (a.over === 'volcano') points.push(new THREE.Vector2(base * crater * 0.6, height * 0.95), new THREE.Vector2(0.5, height * 0.93));
      const geometry = new THREE.LatheGeometry(points, 48);
      const position = geometry.attributes.position;
      const colours = new Float32Array(position.count * 3);
      const rock = new THREE.Color(a.over === 'volcano' ? '#4a4650' : '#5d5a58').offsetHSL(0, 0, (mood.cheer - 0.5) * 0.08), snow = new THREE.Color('#f4f7fa'), tint = new THREE.Color();
      const rough = a.over === 'volcano' ? 0.05 : a.over === 'crag' ? 0.3 : 0.16;
      const snowline = mix(0.75, 0.3, 1 - mood.warmth);
      for (let i = 0; i < position.count; i++) {
        const px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
        const angle = Math.atan2(pz, px), f = py / height;
        const n = noise(angle, py * 4);
        const k = 1 + n * rough * (0.4 + f);
        position.setXYZ(i, px * k * (a.over === 'ridge' ? 2.3 : 1), py * (1 + (a.over === 'volcano' ? 0 : n * rough * 0.5 * f)) * (a.over === 'ridge' ? 1 + 0.25 * Math.sin(px * 0.011 + p[3]) : 1), pz * k * (a.over === 'ridge' ? 0.7 : 1));
        tint.copy(rock).offsetHSL(0, 0, n * 0.05);
        if (f + n * 0.12 > snowline) tint.lerp(snow, 0.95);
        colours.set([tint.r, tint.g, tint.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: a.over !== 'volcano' }));
      summit = new THREE.Box3().setFromBufferAttribute(position as THREE.BufferAttribute).max.y;
    }
    stack.position.y = a.over === 'nothing' ? R * 0.1 : a.form === 'cap' ? summit - R * 0.22 : summit + mix(18, 50, random());
    stack.position.x = a.over === 'nothing' ? 0 : (random() - 0.4) * R * 0.2;
    stack.rotation.y = (random() - 0.5) * 0.5;

    const spin = mix(0.05, 0.5, mood.energy);
    return s.finish({ footprint: a.over === 'nothing' ? R * 0.5 : 250, update: (dt) => { if (lamps) lamps.rotation.y += dt * spin; } });
  },
});

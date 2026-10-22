import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FINISHES = {
  steel: 'Bright bare steel wire.',
  brass: 'Gold-coloured brass plating.',
  red: 'Red vinyl-coated wire.',
  blue: 'Blue vinyl-coated wire.',
  green: 'Green vinyl-coated wire.',
  pink: 'Pastel pink vinyl-coated wire.',
  black: 'Black enamelled wire.',
} as const;
const TINTS: Record<keyof typeof FINISHES, string> = { steel: '#cdd3d8', brass: '#d6ae4f', red: '#d3262f', blue: '#2a63c9', green: '#2f9e56', pink: '#f29cc0', black: '#26272b' };

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    shape: choice('What has been done to the paperclip?', {
      pristine: 'Nothing: a perfect flat triple-loop clip straight from the box.',
      pried: 'One loop has been pried up out of flat, the way a clip looks after holding too many pages.',
      hook: 'It has been unfolded into an S-shaped hook.',
      straightened: 'It has been pulled almost straight, a kinked wire with one stubborn curl left at the end.',
      spiral: 'It has been wound into a tight coil around a pen, with two straight tails.',
      heart: 'It has been bent into a small lopsided heart.',
      tangle: 'It has been twisted into an anxious three-dimensional knot.',
      stand: 'It has been bent into an upright zigzag that stands on its own like a tiny sculpture.',
    }),
    finish: choice('What is the wire like?', FINISHES),
    size: score('How big is the clip?', ['A small clip', 'A standard clip', 'A jumbo clip']),
    company: choice('What is with it?', {
      alone: 'Nothing: it lies alone.',
      paper: 'If it is still a clip, it is holding the torn-off corner of a sheet of paper.',
      linked: 'A second, untouched paperclip is hooked through it.',
      chain: 'It ends a short chain of linked paperclips, a daisy chain made in a meeting.',
      scatter: 'A few other loose paperclips lie scattered around it.',
    }),
    paper: choice('If it holds paper, what kind?', {
      memo: 'White office paper with grey lines of typing.',
      yellow: 'Yellow legal pad with blue rules.',
      receipt: 'A thin curling receipt.',
      pink: 'A pink carbon-copy slip.',
    }),
    tension: choice('How was it bent?', {
      careful: 'Slowly and neatly, every bend deliberate.',
      idle: 'Idly, with soft uneven curves.',
      nervous: 'Nervously, with tight kinks and wobbles all along the wire.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const k = mix(0.75, 1.5, a.size);
    const r = 0.5 * Math.sqrt(k);
    const jitter = { careful: 0, idle: 0.35, nervous: 0.9 }[a.tension] * k;

    // Wire paint: plating or vinyl, with rust breaking through as the scene wears.
    const paint = (hex: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 16;
      const g = canvas.getContext('2d')!;
      g.fillStyle = hex;
      g.fillRect(0, 0, 512, 16);
      const coated = !(a.finish === 'steel' || a.finish === 'brass');
      const blotches = Math.round(mood.wear ** 2 * 90);
      for (let i = 0; i < blotches; i++) {
        g.fillStyle = coated && random() > 0.5 ? 'rgba(150,150,150,0.8)' : ['rgba(146,72,28,0.85)', 'rgba(98,44,18,0.85)', 'rgba(196,110,40,0.7)'][i % 3];
        g.fillRect(random() * 512, random() * 16, 2 + random() * 9 * mood.wear, 2 + random() * 6);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const metal = a.finish === 'steel' || a.finish === 'brass';
      return new THREE.MeshStandardMaterial({ map: texture, metalness: metal ? mix(0.85, 0.35, mood.wear) : 0.05, roughness: metal ? mix(0.22, 0.7, mood.wear) : mix(0.35, 0.7, mood.wear) });
    };
    const wire = paint(TINTS[a.finish]);

    const arc = (cx: number, cz: number, radius: number, from: number, to: number, y = 0) => {
      const points: V[] = [];
      const steps = Math.max(4, Math.round(Math.abs(to - from) / 0.2));
      for (let i = 0; i <= steps; i++) {
        const t = mix(from, to, i / steps);
        points.push(v(cx + Math.cos(t) * radius, y, cz + Math.sin(t) * radius));
      }
      return points;
    };
    // The classic Gem clip in the xz plane, long axis along z, as three runs so each can be moved.
    const gem = () => {
      const outer = [v(-4.2, 0, -9), v(-4.2, 0, 2), ...arc(0, 12, 4.2, Math.PI, 0).map((p) => p), v(4.2, 0, 0)];
      const bottom = arc(0.7, -12.5, 3.5, 0, -Math.PI);
      const inner = [v(-2.8, 0, -2), ...arc(-0.2, 8.5, 2.6, Math.PI, 0), v(2.4, 0, 1), v(2.4, 0, -6)];
      for (const p of [...outer, ...bottom, ...inner]) p.z *= -1; // arcs were written with z up the page
      return { outer, bottom, inner };
    };
    const tube = (parent: THREE.Object3D, points: V[], material: THREE.Material = wire, tension = 0) => {
      const scaled = points.map((p) => p.clone().multiplyScalar(k));
      const curve = tension ? new THREE.CatmullRomCurve3(scaled, false, 'catmullrom', tension) : new THREE.CatmullRomCurve3(scaled, false, 'centripetal');
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(480, points.length * 7), r, 8), material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      for (const end of [scaled[0], scaled.at(-1)!]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material);
        cap.position.copy(end);
        cap.castShadow = true;
        parent.add(cap);
      }
      return mesh;
    };
    const wobble = (points: V[], amount = jitter) => points.map((p, i) => (i === 0 || amount === 0 ? p : p.clone().add(v((random() - 0.5) * amount, 0, (random() - 0.5) * amount))));
    const plainClip = (material: THREE.Material = wire) => {
      const group = new THREE.Group();
      const { outer, bottom, inner } = gem();
      tube(group, [...outer, ...bottom, ...inner], material);
      group.position.y = r;
      s.root.add(group);
      return group;
    };

    const hero = new THREE.Group();
    s.root.add(hero);
    const flat = a.shape === 'pristine' || a.shape === 'pried' || a.shape === 'hook';
    let heroLength = 33 * k, tail = v(0, r, -16 * k);
    if (flat) {
      const { outer, bottom, inner } = gem();
      const hinge = bottom[Math.floor(bottom.length / 2)].clone();
      const holding = a.company === 'paper' && a.shape !== 'hook';
      let rest: V[] = [...bottom.slice(Math.floor(bottom.length / 2) + 1), ...inner];
      if (a.shape === 'pried' || holding) {
        const lift = a.shape === 'pried' ? 0.25 + random() * 0.25 : 0.09;
        rest = rest.map((p) => p.clone().sub(hinge).applyAxisAngle(v(1, 0, 0), -lift).add(hinge));
      }
      if (a.shape === 'hook') {
        const swing = Math.PI * (0.9 + random() * 0.2);
        rest = rest.map((p) => p.clone().sub(hinge).applyAxisAngle(v(0, 1, 0), swing).add(hinge));
        outer.splice(0, 1, v(-4.2 - random() * 2, 0, 9));
        heroLength = 52 * k;
      }
      tube(hero, wobble([...outer, ...bottom.slice(0, Math.floor(bottom.length / 2) + 1), ...rest], jitter * 0.5));
      hero.position.y = r;
      if (a.shape === 'hook') hero.position.z = -10 * k;
      if (holding) {
        // A torn corner of paper pinched between the loops.
        const sheet = document.createElement('canvas');
        sheet.width = sheet.height = 256;
        const g = sheet.getContext('2d')!;
        const tone = { memo: '#f6f4ee', yellow: '#f5e58c', receipt: '#f1efe9', pink: '#f4b9cb' }[a.paper];
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(256, 0);
        g.lineTo(256, 150);
        for (let i = 0; i <= 14; i++) g.lineTo(256 - i * 18.3, 150 + i * 7.5 + (random() - 0.5) * 16);
        g.closePath();
        g.clip();
        g.fillStyle = tone;
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = `rgba(140,110,60,${mood.wear * 0.35})`;
        g.fillRect(0, 0, 256, 256);
        for (let y = 26; y < 256; y += a.paper === 'receipt' ? 14 : 22) {
          g.fillStyle = a.paper === 'yellow' ? '#6f8fd0' : a.paper === 'pink' ? '#8a5a78' : '#5a5f66';
          if (a.paper === 'yellow') g.fillRect(0, y, 256, 1.5);
          else for (let x = 14; x < 236;) { const w = 8 + random() * 34; g.fillRect(x, y, w, a.paper === 'receipt' ? 4 : 5); x += w + 7; }
        }
        const texture = new THREE.CanvasTexture(sheet);
        texture.colorSpace = THREE.SRGBColorSpace;
        const size = (a.paper === 'receipt' ? 26 : 38) * k;
        const page = new THREE.PlaneGeometry(size, size, 8, 8);
        page.rotateX(-Math.PI / 2);
        const position = page.getAttribute('position');
        for (let i = 0; i < position.count; i++) position.setY(i, Math.max(0, position.getX(i) + size * 0.2) ** 2 * 0.012 * mix(0.3, 1.4, mood.wear) / k);
        page.computeVertexNormals();
        const mesh = new THREE.Mesh(page, new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.position.set(size * 0.5 - 9 * k, r * 1.1, size * 0.5 - 2 * k);
        s.root.add(mesh);
        hero.position.y = r * 1.2;
      }
      tail = v(0, r, 16 * k);
    } else if (a.shape === 'straightened') {
      const points: V[] = [];
      let z = 0, y = 0;
      for (let i = 0; i <= 16; i++) {
        const x = -44 + i * 5;
        if (i % 4 === 2) { z += (random() - 0.5) * 5; y = random() * 1.2; }
        points.push(v(x, i > 13 ? (i - 13) * 1.2 + y : y * (i % 2), z + (random() - 0.5) * jitter * 1.6));
      }
      points.push(...arc(36, z + 3, 3, -Math.PI / 2, Math.PI * 0.7, 4.6).map((p, i) => p.setY(4.6 + i * 0.45)));
      tube(hero, points);
      hero.position.y = r;
      heroLength = 90 * k;
      tail = v(-44 * k, r, 0);
    } else if (a.shape === 'spiral') {
      const points: V[] = [v(-24, 0, 3.2), v(-14, 0, 3.2)];
      const turns = 4.5 + Math.floor(random() * 2);
      for (let i = 0; i <= turns * 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        points.push(v(-9 + (i / 12) * 2.6 + (random() - 0.5) * jitter * 0.3, 3.2 - Math.cos(t) * 3.2, Math.sin(t) * 3.2 + 0 * i));
      }
      const end = points.at(-1)!;
      points.push(v(end.x + 6, end.y + (end.y > 3 ? 1.5 : 0), end.z + 2), v(end.x + 15, end.y > 3 ? 8 : 0.3, end.z + 5));
      tube(hero, points, wire, 0.5);
      hero.position.y = r;
      heroLength = 44 * k;
      tail = v(-24 * k, r, 3.2 * k);
    } else if (a.shape === 'heart') {
      const points: V[] = [];
      const lop = (random() - 0.5) * 0.3;
      for (let i = 2; i <= 46; i++) {
        const t = (i / 48) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3, z = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push(v(x * 0.8 * (x > 0 ? 1 + lop : 1 - lop) + (random() - 0.5) * jitter * 0.6, i > 44 ? 1.1 : 0, z * 0.8 + (random() - 0.5) * jitter * 0.6));
      }
      points.unshift(v(-3.5, 0, 17));
      points.push(v(4, 1.1, 18));
      tube(hero, points, wire, 0.5);
      hero.position.y = r;
      heroLength = 30 * k;
      tail = v(-3.5 * k, r, 17 * k);
    } else if (a.shape === 'tangle') {
      const points: V[] = [v(-17, 0, 2)];
      for (let i = 0; i < 11; i++) {
        const t = i * 2.1 + random();
        points.push(v(Math.cos(t) * (4 + random() * 7), i % 3 === 0 ? 0.2 : 2 + random() * 9, Math.sin(t) * (3 + random() * 6)));
      }
      points.push(v(12, 0, -8), v(19, 0.3, -11));
      tube(hero, points, wire, 0.5);
      hero.position.y = r;
      heroLength = 36 * k;
      tail = v(-17 * k, r, 2 * k);
    } else {
      // A standing zigzag on a triangular foot.
      const points: V[] = [v(-7, 0, 5), v(7, 0, 6), v(1, 0, -6), v(-6, 0, 3), v(-3, 0.2, 1)];
      const levels = 5;
      for (let i = 1; i <= levels; i++) points.push(v((i % 2 ? 5 : -5) + (random() - 0.5) * jitter * 2, i * 6.5, (random() - 0.5) * (1 + jitter * 2)));
      points.push(...arc(points.at(-1)!.x * 0.4, 0, 3, 0, Math.PI * 1.5).map((p) => v(p.x, levels * 6.5 + 4 + p.z, 0)));
      tube(hero, points, wire, 0.25);
      hero.position.y = r;
      heroLength = 14 * k;
      tail = v(-7 * k, r, 5 * k);
    }

    // Company.
    const spare = () => {
      const keys = Object.keys(TINTS) as (keyof typeof TINTS)[];
      return paint(a.finish === 'steel' || a.finish === 'brass' ? TINTS[a.finish] : TINTS[keys[2 + Math.floor(random() * 4)]]);
    };
    if (a.company === 'linked' || a.company === 'chain') {
      const links = a.company === 'linked' ? 1 : 2 + Math.round(mood.density * 2);
      const at = tail.clone();
      let heading = flat ? 0 : Math.atan2(tail.z, tail.x) - Math.PI / 2 + Math.PI;
      if (!flat) heading = Math.atan2(-tail.x, -tail.z) + Math.PI;
      for (let i = 0; i < links; i++) {
        heading += (random() - 0.5) * 0.9;
        const clip = plainClip(spare());
        const dir = v(Math.sin(heading), 0, Math.cos(heading));
        clip.rotation.y = heading;
        clip.rotation.z = (i % 2 ? -1 : 1) * 0.14;
        clip.position.copy(at).addScaledVector(dir, 13.5 * k);
        clip.position.y = r * 1.9;
        at.addScaledVector(dir, 26 * k);
      }
    }
    if (a.company === 'scatter') {
      const n = 2 + Math.round(mood.density * 3 + random());
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random(), far = heroLength * 0.5 + (22 + random() * 16) * k;
        const clip = plainClip(spare());
        clip.position.set(Math.cos(angle) * far, r, Math.sin(angle) * far * 0.8);
        clip.rotation.y = random() * Math.PI * 2;
      }
    }
    return s.finish();
  },
});

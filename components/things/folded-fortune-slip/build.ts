import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const FORTUNES = {
  hope: 'Hopeful: "A pleasant surprise is waiting for you."',
  love: 'Romantic: "Someone is thinking of you tonight."',
  money: 'About money: "Your pockets will soon be heavy."',
  warning: 'A warning: "Do not mistake temptation for opportunity."',
  journey: 'About travel: "You will go far and come home changed."',
  cryptic: 'Cryptic: "The door you seek was never locked."',
  advice: 'Plain advice: "Now is the time to try something new."',
  blank: 'Blank: the slip came out with nothing printed on it at all, only the numbers.',
} as const;
const LINES: Record<keyof typeof FORTUNES, string> = {
  hope: 'A pleasant surprise is waiting for you.', love: 'Someone is thinking of you tonight.', money: 'Your pockets will soon be heavy.',
  warning: 'Do not mistake temptation for opportunity.', journey: 'You will go far and come home changed.', cryptic: 'The door you seek was never locked.',
  advice: 'Now is the time to try something new.', blank: '',
};

export default defineThing({
  questions: {
    fortune: choice('What does the fortune say?', FORTUNES),
    numbers: choice('What are the lucky numbers?', {
      lucky: 'Sevens and eights: 7, 8, 18, 28, 38, 88.',
      unlucky: 'All the wrong ones: 4, 13, 14, 44, 49.',
      ordinary: 'Six unremarkable lottery numbers.',
      sequence: '1, 2, 3, 4, 5, 6.',
      none: 'No numbers at all.',
    }),
    ink: choice('What colour are the paper and ink?', {
      red: 'White paper with red ink.',
      blue: 'White paper with blue ink.',
      black: 'Cream paper with black ink.',
      pink: 'Pale pink paper with dark red ink.',
      gold: 'Red paper printed in gold, for a new year.',
    }),
    fold: choice('How has it been folded or handled?', {
      fresh: 'Just pulled from the cookie: a gentle springy arch.',
      half: 'Folded once in half and standing like a tent.',
      pleated: 'Pleated into a zigzag by idle fingers.',
      rolled: 'Rolled into a small tight scroll at one end.',
      wallet: 'Nearly flat with two soft old creases, carried in a wallet for years.',
      torn: 'Torn in two, the pieces lying a little apart.',
    }),
    beside: choice('What is beside it?', {
      nothing: 'Nothing.',
      cookie: 'The two cracked halves of its fortune cookie.',
      crumbs: 'Only a few golden cookie crumbs.',
      tape: 'A strip of yellowed tape still stuck to one end, from a fridge or a monitor.',
      second: 'A second slip from someone else\'s cookie.',
    }),
    emphasis: choice('Has anyone marked it?', {
      none: 'No.',
      underlined: 'The line is underlined in biro.',
      circled: 'One lucky number is circled in biro.',
      crossed: 'The fortune has been crossed out.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const L = 58, W = 14;
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const tones = { red: ['#f6f3ea', '#c8202c'], blue: ['#f4f4ee', '#2343a8'], black: ['#efe6cc', '#22201e'], pink: ['#f6d5dc', '#8e1c2e'], gold: ['#c62a2a', '#f1d06a'] }[a.ink];
    const paper = new THREE.Color(tones[0]).lerp(new THREE.Color('#b9a67c'), mood.wear * (a.ink === 'gold' ? 0.15 : 0.4));

    const paint = (words: string, digits: string, creases: number[], back: boolean, tornAt: number | null, marked: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 248;
      const g = canvas.getContext('2d')!;
      if (tornAt !== null) {
        g.beginPath();
        g.moveTo(0, 0);
        const x0 = tornAt * 1024;
        for (let i = 0; i <= 10; i++) g.lineTo(x0 + (random() - 0.5) * 26 + (i - 5) * 5, i * 24.8);
        g.lineTo(0, 248);
        g.closePath();
        const edge = new Path2D();
        edge.rect(0, 0, 1024, 248);
        g.save();
        g.clip();
      }
      const fill = () => {
        g.fillStyle = `#${paper.getHexString()}`;
        g.fillRect(0, 0, 1024, 248);
        g.fillStyle = tones[1];
        g.globalAlpha = back ? 0.16 : mix(1, 0.6, mood.wear);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (back) {
          g.font = '40px sans-serif';
          g.fillText('☺   Learn a word:  home   ☺', 512, 124, 900);
        } else {
          g.font = 'bold 60px sans-serif';
          g.fillText(words, 512, digits ? 92 : 124, 940);
          if (digits) { g.font = '40px sans-serif'; g.fillText(`Lucky Numbers  ${digits}`, 512, 184, 900); }
          if (marked) {
            g.globalAlpha = 0.85;
            g.strokeStyle = '#1f3bb0';
            g.lineWidth = 5;
            g.beginPath();
            const width = Math.min(940, g.measureText(words).width * 1.5 + 60);
            if (a.emphasis === 'underlined') { g.moveTo(512 - width / 2, 132); g.quadraticCurveTo(512, 122 + random() * 14, 512 + width / 2, 128); g.moveTo(512 - width / 2 + 30, 142); g.lineTo(512 + width / 3, 139); }
            if (a.emphasis === 'crossed') { g.moveTo(512 - width / 2, 100); g.lineTo(512 + width / 2, 84); g.moveTo(512 - width / 2, 82); g.lineTo(512 + width / 2, 102); }
            if (a.emphasis === 'circled' && digits) g.ellipse(560 + random() * 240, 184, 46, 30, -0.1, 0, 7);
            g.stroke();
          }
        }
        g.globalAlpha = 1;
        for (const at of creases) {
          g.fillStyle = 'rgba(70,50,30,0.22)';
          g.fillRect(at * 1024 - 2, 0, 4, 248);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(at * 1024 + 2, 0, 3, 248);
        }
        g.fillStyle = `rgba(150,110,50,${mood.wear * 0.2})`;
        for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(random() * 1024, random() * 248, 30 + random() * 120, 20 + random() * 60, random() * 3, 0, 7); g.fill(); }
        if (mood.wear > 0.55) { g.strokeStyle = 'rgba(120,80,30,0.4)'; g.lineWidth = 3; g.beginPath(); g.arc(200 + random() * 600, 124, 90 + random() * 40, 0, 7); g.stroke(); }
      };
      fill();
      if (tornAt !== null) g.restore();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    };

    // A strip bent along its length: creases are sudden turns, curls are steady ones.
    const strip = (options: { fold: typeof a.fold; words: string; digits: string; from?: number; to?: number; marked: boolean }) => {
      const group = new THREE.Group();
      const from = options.from ?? 0, to = options.to ?? 1;
      const n = 96;
      const creases: number[] = [];
      const turn = new Array<number>(n + 1).fill(0);
      let start = 0;
      const lean = (random() - 0.5) * 0.2;
      if (options.fold === 'fresh') { const total = 1.5 + random() * 0.8; start = total / 2; turn.fill(-total / n); }
      if (options.fold === 'half') { start = 0.62 + lean; turn[Math.round(n / 2)] = -(1.24 + lean * 0.5); creases.push(0.5); turn.forEach((_v, i) => { turn[i] += (i < n / 2 ? 0.25 : -0.25) / n; }); }
      if (options.fold === 'pleated') {
        const panels = 5 + Math.floor(random() * 3), angle = 0.75 + random() * 0.3;
        start = angle;
        for (let p = 1; p < panels; p++) { turn[Math.round((p / panels) * n)] = (p % 2 ? -1 : 1) * angle * 2 * (0.85 + random() * 0.3); creases.push(p / panels); }
      }
      if (options.fold === 'rolled') { start = -0.05; for (let i = 0; i <= n; i++) { const t = i / n; turn[i] = t > 0.4 ? 0.02 + ((t - 0.4) / 0.6) ** 2 * 0.3 : 0.012 * Math.sin(t * 9); } }
      if (options.fold === 'wallet' || options.fold === 'torn') {
        start = 0.14;
        for (const [at, angle] of [[0.33, -0.34], [0.67, 0.3]] as const) { turn[Math.round(at * n)] = angle * (0.7 + random() * 0.6); creases.push(at); }
        turn.forEach((_v, i) => { turn[i] += Math.sin((i / n) * 7 + lean * 20) * 0.006; });
      }
      const xs: number[] = [], ys: number[] = [];
      let x = 0, y = 0, theta = start;
      for (let i = 0; i <= n; i++) {
        xs.push(x);
        ys.push(y);
        theta += turn[i];
        x += (Math.cos(theta) * L) / n;
        y += (Math.sin(theta) * L) / n;
      }
      const cells = Math.max(4, Math.round(n * (to - from)));
      const geometry = new THREE.PlaneGeometry(L * (to - from), W, cells, 4);
      const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      const twist = (random() - 0.5) * (options.fold === 'fresh' ? 0.5 : options.fold === 'wallet' || options.fold === 'torn' ? 0.12 : 0.05);
      for (let i = 0; i < position.count; i++) {
        const u = from + (position.getX(i) / (L * (to - from)) + 0.5) * (to - from), w = position.getY(i);
        const f = u * n, i0 = Math.min(n - 1, Math.floor(f)), frac = f - i0;
        uv.setX(i, u);
        position.setXYZ(i, mix(xs[i0], xs[i0 + 1], frac), mix(ys[i0], ys[i0 + 1], frac) + w * Math.sin((u - 0.5) * twist * 2), -w);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y + 0.08, 0);
      const torn = options.from !== undefined || options.to !== undefined;
      const common = { roughness: 0.95, alphaTest: 0.5 } as const;
      const edge = torn ? (to < 1 ? to : null) : null;
      const cut = (texture: THREE.CanvasTexture) => texture;
      add(group, geometry, new THREE.MeshStandardMaterial({ ...common, map: cut(paint(options.words, options.digits, creases, false, edge, options.marked)), side: THREE.FrontSide, shadowSide: THREE.DoubleSide }));
      add(group, geometry, new THREE.MeshStandardMaterial({ ...common, map: cut(paint(options.words, options.digits, creases, true, edge, false)), side: THREE.BackSide }));
      return group;
    };

    const picks = () => Array.from({ length: 6 }, () => 1 + Math.floor(random() * 59)).sort((p, q) => p - q).join(', ');
    const digits = { lucky: '7, 8, 18, 28, 38, 88', unlucky: '4, 13, 14, 44, 49', ordinary: picks(), sequence: '1, 2, 3, 4, 5, 6', none: '' }[a.numbers];
    const words = LINES[a.fortune];
    const marked = a.emphasis !== 'none';
    if (a.fold === 'torn') {
      const at = 0.4 + random() * 0.2;
      const left = strip({ fold: 'torn', words, digits, to: at, marked }), right = strip({ fold: 'torn', words, digits, from: at - 0.012, marked });
      left.position.set(-L * (1 - at) * 0.5 - 2, 0, 0);
      right.position.set(L * at * 0.5 + 3 + random() * 4, 0, (random() - 0.5) * 8);
      right.rotation.y = (random() - 0.5) * 0.7;
      s.root.add(left, right);
    } else {
      const main = strip({ fold: a.fold, words, digits, marked });
      main.rotation.y = (random() - 0.5) * 0.3;
      s.root.add(main);
    }

    if (a.beside === 'second') {
      const keys = Object.keys(LINES) as (keyof typeof LINES)[];
      const other = strip({ fold: a.fold === 'wallet' ? 'fresh' : 'wallet', words: LINES[keys[Math.floor(random() * (keys.length - 1))]], digits: picks(), marked: false });
      other.position.set((random() - 0.5) * 14, 0, W * 1.9);
      other.rotation.y = 0.25 + random() * 0.5;
      s.root.add(other);
    }
    if (a.beside === 'tape') {
      const tape = add(s.root, new THREE.PlaneGeometry(13, 17, 4, 4), new THREE.MeshStandardMaterial({ color: '#d8c783', roughness: 0.25, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      tape.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.4);
      s.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(s.root.children[0]);
      tape.position.set(box.min.x + 3, 0.5, 2);
    }
    if (a.beside === 'cookie' || a.beside === 'crumbs') {
      const biscuit = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9a657').lerp(new THREE.Color('#a8763a'), mood.wear * 0.5), roughness: 0.8, side: THREE.DoubleSide });
      if (a.beside === 'cookie') {
        // Each half is one horn of the crescent: hollow, pinched at the tip, open at the break.
        for (const side of [-1, 1]) {
          const ring = 11, tube = 6.2, arc = Math.PI * 0.72;
          const shell = new THREE.TorusGeometry(ring, tube, 10, 16, arc);
          const position = shell.getAttribute('position');
          for (let i = 0; i < position.count; i++) {
            const px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
            const along = Math.atan2(py, px) / arc, cx = Math.cos(along * arc) * ring, cy = Math.sin(along * arc) * ring;
            const swell = 0.22 + 0.78 * Math.sin(Math.min(1, along * 1.1) * Math.PI / 2);
            position.setXYZ(i, cx + (px - cx) * swell, cy + (py - cy) * swell, pz * swell * 0.7);
          }
          shell.computeVertexNormals();
          shell.rotateX(-Math.PI / 2);
          const half = add(s.root, shell, biscuit);
          half.rotation.y = random() * 6.3;
          half.rotation.z = (random() - 0.5) * 0.3;
          half.position.set(side * (L * 0.2 + 8 + random() * 8), tube * 0.7, -W * 1.5 - 12 - random() * 6);
        }
      }
      const crumbs = Array.from({ length: Math.round(mix(8, 34, mood.density) * (a.beside === 'cookie' ? 0.6 : 1)) }, () => {
        const angle = random() * Math.PI * 2, far = 8 + random() * 30;
        return { at: [Math.cos(angle) * far, 0.5, Math.sin(angle) * far * 0.6 - (a.beside === 'cookie' ? W * 1.2 : 0)] as [number, number, number], size: 0.5 + random() * 1.6, color: random() > 0.5 ? '#dcae62' : '#b98443' };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), crumbs);
    }
    return s.finish();
  },
});

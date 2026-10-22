import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { flood } from './flood';

type V3 = readonly [number, number, number];
const ART = {
  peacock: 'A peacock with its tail fanned in blues and greens.',
  lotus: 'Pink lotus flowers on a teal pond.',
  domes: 'White domes and minarets against a sunset.',
  tiger: 'A tiger\'s face, orange and staring.',
  village: 'A village scene: fields, a hut, a river with a boat and a huge sun.',
  filmstar: 'A film star\'s face in lurid pink with hearts and stars.',
  blessing: 'Bold lettering asking for a mother\'s blessing, framed in flowers.',
} as const;
const HOODS = {
  applique: 'Red vinyl covered in appliqué medallions and gold studs.',
  stripes: 'Broad candy stripes, a different colour between each bow.',
  blue: 'Plain blue tarpaulin with white piping, a working rickshaw.',
  floral: 'Green with big painted flowers.',
  patchwork: 'A patchwork of diamonds in every colour.',
  bleached: 'Sun-bleached to pale pink and grey, patterns almost gone.',
} as const;
const FRAMES = { red: '#b3261f', green: '#2f7a4a', blue: '#2a56a8', yellow: '#e2b21f', black: '#232427', pink: '#d8468a' } as const;

function paintArt(ctx: CanvasRenderingContext2D, motif: keyof typeof ART, w: number, h: number, word: string) {
  const disc = (x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); ctx.fill(); };
  if (motif === 'peacock') {
    ctx.fillStyle = '#f3e3a0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 11; i++) { const t = Math.PI * (0.08 + 0.84 * i / 10); const x = w / 2 - Math.cos(t) * w * 0.4, y = h * 0.8 - Math.sin(t) * h * 0.62; disc(x, y, w * 0.07, h * 0.16, '#1f8a5a', t - Math.PI / 2); disc(x, y, w * 0.03, h * 0.06, '#2a56c8'); disc(x, y, w * 0.012, h * 0.025, '#f0c22e'); }
    disc(w / 2, h * 0.68, w * 0.07, h * 0.24, '#2146b8'); disc(w / 2, h * 0.38, w * 0.04, h * 0.08, '#2146b8');
  } else if (motif === 'lotus') {
    ctx.fillStyle = '#1f8f8a'; ctx.fillRect(0, 0, w, h);
    for (const [cx, cy, k] of [[0.5, 0.55, 1], [0.2, 0.7, 0.6], [0.8, 0.7, 0.6]]) { disc(cx * w, cy * h + h * 0.14 * k, w * 0.16 * k, h * 0.07 * k, '#2f6f3a'); for (let i = -2; i <= 2; i++) disc(cx * w + i * w * 0.035 * k, cy * h - Math.abs(i) * -h * 0.02, w * 0.035 * k, h * 0.2 * k, i % 2 ? '#f4a6c0' : '#e8588f', i * 0.35); }
  } else if (motif === 'domes') {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f2a53a'); sky.addColorStop(1, '#d8436a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    disc(w / 2, h * 0.3, w * 0.09, w * 0.09, '#fff0a8');
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.45); disc(w / 2, h * 0.55, w * 0.13, h * 0.26, '#f6f3ea');
    for (const x of [0.16, 0.84]) { ctx.fillRect(w * x - w * 0.02, h * 0.3, w * 0.04, h * 0.7); disc(w * x, h * 0.3, w * 0.03, h * 0.07, '#f6f3ea'); }
  } else if (motif === 'tiger') {
    ctx.fillStyle = '#1f6f4a'; ctx.fillRect(0, 0, w, h);
    disc(w / 2, h * 0.55, w * 0.26, h * 0.42, '#f08a1f'); for (const side of [-1, 1]) { disc(w / 2 + side * w * 0.2, h * 0.18, w * 0.07, h * 0.12, '#f08a1f'); disc(w / 2 + side * w * 0.1, h * 0.45, w * 0.04, h * 0.05, '#f6f3d0'); disc(w / 2 + side * w * 0.1, h * 0.45, w * 0.015, h * 0.04, '#141210'); }
    ctx.strokeStyle = '#141210'; ctx.lineWidth = w * 0.02; for (let i = 0; i < 4; i++) for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2 + side * w * 0.26, h * (0.3 + i * 0.14)); ctx.lineTo(w / 2 + side * w * 0.14, h * (0.36 + i * 0.14)); ctx.stroke(); }
    disc(w / 2, h * 0.7, w * 0.09, h * 0.1, '#f6f3d0'); disc(w / 2, h * 0.64, w * 0.03, h * 0.035, '#141210');
  } else if (motif === 'village') {
    ctx.fillStyle = '#6fc3e8'; ctx.fillRect(0, 0, w, h); disc(w * 0.75, h * 0.28, w * 0.1, w * 0.1, '#f2c21f');
    ctx.fillStyle = '#4fa53a'; ctx.fillRect(0, h * 0.5, w, h * 0.5); ctx.fillStyle = '#2f7fc8'; ctx.fillRect(0, h * 0.72, w, h * 0.16);
    ctx.fillStyle = '#c98a3a'; ctx.fillRect(w * 0.14, h * 0.4, w * 0.2, h * 0.2); ctx.fillStyle = '#8a4a2a'; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.42); ctx.lineTo(w * 0.24, h * 0.22); ctx.lineTo(w * 0.38, h * 0.42); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.8, w * 0.14, h * 0.07, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#f6f3ea'; ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.8); ctx.lineTo(w * 0.6, h * 0.52); ctx.lineTo(w * 0.7, h * 0.76); ctx.fill();
  } else if (motif === 'filmstar') {
    ctx.fillStyle = '#e8388a'; ctx.fillRect(0, 0, w, h);
    disc(w / 2, h * 0.55, w * 0.17, h * 0.36, '#f2c9a0'); disc(w / 2, h * 0.28, w * 0.2, h * 0.2, '#16120f'); for (const side of [-1, 1]) { disc(w / 2 + side * w * 0.07, h * 0.5, w * 0.03, h * 0.035, '#16120f'); disc(w * (0.5 + side * 0.36), h * 0.3, w * 0.05, h * 0.08, '#f6e23a'); disc(w * (0.5 + side * 0.36), h * 0.72, w * 0.045, h * 0.07, '#c7261f'); }
    disc(w / 2, h * 0.72, w * 0.06, h * 0.035, '#c7261f');
  } else {
    ctx.fillStyle = '#1f3f8f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) { disc(w * (0.06 + i * 0.098), h * 0.12, w * 0.035, h * 0.07, i % 2 ? '#f2c21f' : '#e8588f'); disc(w * (0.06 + i * 0.098), h * 0.88, w * 0.035, h * 0.07, i % 2 ? '#e8588f' : '#f2c21f'); }
    ctx.fillStyle = '#fff3b0'; ctx.font = `bold ${h * 0.3}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(word.split(' ')[0], w / 2, h * 0.36, w * 0.9); ctx.fillText(word.split(' ').slice(1).join(' '), w / 2, h * 0.66, w * 0.9);
  }
  ctx.strokeStyle = '#f2c21f'; ctx.lineWidth = w * 0.035; ctx.strokeRect(w * 0.017, w * 0.017, w - w * 0.034, h - w * 0.034);
  ctx.strokeStyle = '#b3261f'; ctx.lineWidth = w * 0.012; ctx.strokeRect(w * 0.045, w * 0.045, w - w * 0.09, h - w * 0.09);
}

export default defineThing({
  questions: {
    hood: choice('What does the folding hood look like?', HOODS),
    hoodState: choice('How is the hood set?', {
      up: 'Raised fully against the rain.',
      half: 'Pushed half back.',
      folded: 'Folded right down behind the seat, bows bunched together.',
      torn: 'Raised but torn, a flap hanging and bare bows showing.',
    }),
    panel: choice('What is painted on the back panel and sides?', ART),
    frame: choice('What colour are the frame and tub?', { red: 'Signal red.', green: 'Parrot green.', blue: 'Royal blue.', yellow: 'Mustard yellow.', black: 'Old black enamel.', pink: 'Hot pink.' }),
    seat: choice('What is on the passenger seat?', {
      empty: 'Nothing, the wet seat is empty.',
      puller: 'The rickshaw puller himself, curled up asleep with a cloth over his face.',
      sacks: 'Sacks of rice he was delivering, stacked above the water.',
      school: 'Two school bags and a tiffin carrier, the children carried home on shoulders.',
      chickens: 'A wicker cage of live chickens.',
      vegetables: 'Baskets of vegetables for a market that did not open.',
      passenger: 'A passenger still sitting there under an umbrella, refusing to get wet.',
    }),
    stance: choice('How is it standing?', {
      upright: 'Square and upright, as if parked.',
      turned: 'Front wheel twisted hard to one side.',
      leaning: 'Leaning over, one back wheel sunk in a pothole.',
      chained: 'Chained to a leaning signpost so it will not float away.',
    }),
    tinsel: score('How much tinsel, streamers and plastic flowers does it carry?', ['None, stripped bare', 'A few handlebar streamers', 'Streamers, flowers and a fringe', 'Dripping with tinsel and pinwheels']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paint = s.material(FRAMES[a.frame], { roughness: 0.45, metalness: 0.2 });
    const steel = s.material('#aeb4b7', { metalness: 0.75, roughness: 0.35 });
    const tyre = s.material('#1b1b1d', { roughness: 0.9 });
    const dark = s.material('#1d1c1b', { roughness: 0.8 });
    const rig = new THREE.Group();
    s.root.add(rig);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = rig) => { object.traverse((node) => { node.castShadow = node.receiveShadow = true; }); parent.add(object); return object; };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], parent: THREE.Object3D = rig) => { const m = add(new THREE.Mesh(geometry, material), parent); m.position.set(...at); m.scale.set(...scale); return m; };
    const rod = (from: V3, to: V3, radius: number, material: THREE.Material, parent: THREE.Object3D = rig) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, [0, 0, 0], [1, 1, 1], parent);
      m.position.copy(p.add(q).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    const cube = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 14, 10);
    const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    // ---- wheels ----
    const WR = 0.34;
    const wheel = (parent: THREE.Object3D, at: V3) => {
      const w = new THREE.Group();
      mesh(new THREE.TorusGeometry(WR - 0.022, 0.024, 8, 28), tyre, [0, 0, 0], [1, 1, 1], w);
      mesh(new THREE.TorusGeometry(WR - 0.05, 0.01, 5, 28), steel, [0, 0, 0], [1, 1, 1], w);
      for (let i = 0; i < 7; i++) mesh(new THREE.CylinderGeometry(0.0035, 0.0035, (WR - 0.05) * 2, 4), steel, [0, 0, (i % 2 ? 0.012 : -0.012)], [1, 1, 1], w).rotation.z = (i / 7) * Math.PI + 0.1;
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), steel, [0, 0, 0], [1, 1, 1], w).rotation.x = Math.PI / 2;
      w.rotation.y = Math.PI / 2;
      w.position.set(...at);
      w.rotation.x = random() * 3;
      add(w, parent);
      return w;
    };
    const rearZ = -0.62, track = 0.5;
    wheel(rig, [-track, WR, rearZ]);
    wheel(rig, [track, WR, rearZ]);
    rod([-track, WR, rearZ], [track, WR, rearZ], 0.018, steel);
    // Steering assembly: fork, front wheel, handlebars.
    const steer = new THREE.Group();
    steer.position.set(0, 0, 0.98);
    add(steer);
    wheel(steer, [0, WR, 0.12]);
    for (const side of [-1, 1]) rod([side * 0.045, WR, 0.12], [side * 0.03, 0.9, -0.08], 0.014, paint, steer);
    rod([0, 0.86, -0.07], [0, 1.1, -0.15], 0.02, steel, steer);
    const bar = mesh(new THREE.TorusGeometry(0.3, 0.014, 6, 16, Math.PI * 0.75), steel, [0, 1.1, -0.36], [1, 1, 0.7], steer);
    bar.rotation.set(Math.PI / 2, 0, Math.PI * 0.125);
    for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.11, 8), dark, [side * 0.27, 1.1, -0.32], [1, 1, 1], steer).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.035, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, [0.14, 1.125, -0.16], [1, 1, 1], steer);
    const guard = mesh(new THREE.TorusGeometry(WR + 0.03, 0.012, 4, 14, Math.PI * 0.7), paint, [0, WR, 0.12], [1, 1, 3.4], steer);
    guard.rotation.set(0, Math.PI / 2, 0); guard.rotateZ(Math.PI * 0.25);
    // Frame, saddle, drivetrain.
    rod([0, 0.9, 0.9], [0, 0.88, 0.2], 0.02, paint);
    rod([0, 0.78, 0.92], [0, 0.32, 0.26], 0.02, paint);
    rod([0, 0.92, 0.18], [0, 0.32, 0.26], 0.018, paint);
    rod([0, 0.32, 0.26], [0, WR, rearZ], 0.016, paint);
    rod([0, 0.88, 0.2], [0, 0.56, -0.2], 0.016, paint);
    mesh(sphere, s.material('#2a2320', { roughness: 0.6 }), [0, 0.98, 0.15], [0.1, 0.035, 0.15]);
    rod([0, 0.9, 0.18], [0, 0.97, 0.16], 0.012, steel);
    const ringDisc = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 18), steel, [0.04, 0.32, 0.26]);
    ringDisc.rotation.z = Math.PI / 2;
    const crankAngle = random() * 3;
    for (const side of [-1, 1]) {
      const cy = Math.sin(crankAngle) * 0.16 * side, cz = Math.cos(crankAngle) * 0.16 * side;
      rod([side * 0.06, 0.32, 0.26], [side * 0.08, 0.32 + cy, 0.26 + cz], 0.01, steel);
      mesh(cube, dark, [side * 0.14, 0.32 + cy, 0.26 + cz], [0.1, 0.02, 0.07]);
    }
    // Tub: footboard, seat box, cushion, backrest, arm panels and mudguards.
    mesh(cube, paint, [0, 0.52, -0.3], [0.74, 0.03, 0.5]);
    mesh(cube, paint, [0, 0.62, -0.76], [0.84, 0.3, 0.52]);
    const vinyl = s.material(mood.cheer > 0.5 ? '#c7261f' : '#7a2a26', { roughness: 0.5 });
    mesh(cube, vinyl, [0, 0.81, -0.74], [0.8, 0.1, 0.5]);
    const backrest = mesh(cube, vinyl, [0, 1.06, -1.0], [0.8, 0.46, 0.07]);
    backrest.rotation.x = -0.14;
    for (let i = 0; i < 5; i++) mesh(sphere, steel, [-0.3 + i * 0.15, 1.06, -0.955 + 0.0], [0.014, 0.014, 0.01]).position.z = -0.962 + 0.0;
    for (const side of [-1, 1]) {
      const arm = new THREE.Shape();
      arm.moveTo(-0.3, 0); arm.lineTo(0.28, 0); arm.lineTo(0.28, 0.1); arm.quadraticCurveTo(0.2, 0.3, -0.05, 0.34); arm.lineTo(-0.3, 0.42); arm.closePath();
      const panelMesh = mesh(new THREE.ExtrudeGeometry(arm, { depth: 0.03, bevelEnabled: false }), paint, [side * 0.42 + (side > 0 ? 0.0 : 0.03), 0.77, -0.76]);
      panelMesh.rotation.y = -Math.PI / 2;
      const mud = mesh(new THREE.TorusGeometry(WR + 0.04, 0.014, 4, 14, Math.PI), paint, [side * track, WR, rearZ], [1, 1, 4]);
      mud.rotation.y = Math.PI / 2;
    }
    // Painted art on the rear plate and both side panels.
    const word = ['MAA BLESSING', 'MA ER DOA', 'GOD SPEED', 'LUCKY STAR'][Math.floor(random() * 4)];
    const art = new THREE.MeshStandardMaterial({ map: canvasTexture(256, 128, (ctx) => paintArt(ctx, a.panel, 256, 128, word)), roughness: 0.55, side: THREE.DoubleSide });
    const plate = mesh(new THREE.PlaneGeometry(0.84, 0.42), art, [0, 0.66, -1.03]);
    plate.rotation.y = Math.PI;
    mesh(cube, paint, [0, 0.66, -1.022], [0.88, 0.46, 0.012]);
    for (const side of [-1, 1]) mesh(new THREE.PlaneGeometry(0.5, 0.25), art, [side * 0.425, 0.62, -0.76]).rotation.y = side * Math.PI / 2;
    const front = mesh(new THREE.PlaneGeometry(0.72, 0.24), art, [0, 0.63, -0.495]);
    front.rotation.y = 0;

    // ---- hood: arches swinging round a pivot behind the seat ----
    const hoodTints: Record<keyof typeof HOODS, string[]> = {
      applique: ['#c7261f', '#c7261f', '#b01f2a', '#c7261f'], stripes: ['#e8388a', '#f2c21f', '#2f9fd8', '#3fa55a', '#e8651c'], blue: ['#2a66c8', '#2a66c8'], floral: ['#2f8a5a', '#2f8a5a'], patchwork: ['#e8388a', '#2f9fd8', '#f2c21f', '#3fa55a', '#c7261f', '#7a3fb0'], bleached: ['#d9b9b4', '#c9c2bc', '#d6c7b8'],
    };
    const hoodMap = canvasTexture(256, 128, (ctx) => {
      const tints = hoodTints[a.hood];
      for (let i = 0; i < 5; i++) { ctx.fillStyle = tints[i % tints.length]; ctx.fillRect(i * 51.2, 0, 52, 128); }
      const dot = (x: number, y: number, r: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); };
      if (a.hood === 'applique') for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { dot(i * 51.2 + 25, 22 + j * 42, 15, '#f2c21f'); dot(i * 51.2 + 25, 22 + j * 42, 9, '#2a66c8'); dot(i * 51.2 + 25, 22 + j * 42, 4, '#f6f3ea'); }
      if (a.hood === 'floral') for (let i = 0; i < 12; i++) { const x = (i * 67) % 256, y = (i * 41) % 128; for (let p = 0; p < 6; p++) dot(x + Math.cos(p) * 9, y + Math.sin(p) * 9, 6, i % 2 ? '#f4a6c0' : '#f6f3ea'); dot(x, y, 5, '#f2c21f'); }
      if (a.hood === 'patchwork') for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = tints[(i * 3 + j * 5) % tints.length]; ctx.beginPath(); ctx.moveTo(i * 32 + 16, j * 32); ctx.lineTo(i * 32 + 32, j * 32 + 16); ctx.lineTo(i * 32 + 16, j * 32 + 32); ctx.lineTo(i * 32, j * 32 + 16); ctx.fill(); }
      if (a.hood === 'blue' || a.hood === 'applique') { ctx.fillStyle = a.hood === 'blue' ? '#f6f3ea' : '#f2c21f'; for (let i = 0; i <= 5; i++) ctx.fillRect(i * 51.2 - 2, 0, 4, 128); }
      if (a.hood === 'bleached') { ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 37) % 256, (i * 53) % 128, 30, 6); }
    });
    const hoodMat = new THREE.MeshStandardMaterial({ map: hoodMap, roughness: 0.6, side: THREE.DoubleSide });
    const pivot: V3 = [0, 0.98, -0.92], hw = 0.47, hr = 0.84;
    const a0 = THREE.MathUtils.degToRad(12);
    const a1 = THREE.MathUtils.degToRad({ up: 138, half: 96, folded: 46, torn: 138 }[a.hoodState]);
    const N = 16, M = 16;
    const verts: number[] = [], uvs: number[] = [], index: number[] = [];
    const bows = 5;
    for (let i = 0; i <= N; i++) {
      const t = i / N, alpha = mix(a0, a1, t);
      const dip = 1 - Math.abs(Math.sin(t * (bows - 1) * Math.PI)) * 0.035;
      for (let j = 0; j <= M; j++) {
        const beta = (j / M) * Math.PI, h = Math.sin(beta) ** 0.75 * hr * dip;
        verts.push(pivot[0] + Math.cos(beta) * hw, pivot[1] + h * Math.sin(alpha), pivot[2] - h * Math.cos(alpha));
        uvs.push(t, j / M);
      }
    }
    const tornFrom = a.hoodState === 'torn' ? Math.floor(N * 0.55) : N + 1;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      if (i >= tornFrom && j > M * 0.3 && j < M * 0.95 && i < N - 1) continue;
      const p = i * (M + 1) + j;
      index.push(p, p + M + 1, p + 1, p + 1, p + M + 1, p + M + 2);
    }
    const hoodGeometry = new THREE.BufferGeometry();
    hoodGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    hoodGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    hoodGeometry.setIndex(index);
    hoodGeometry.computeVertexNormals();
    mesh(hoodGeometry, hoodMat);
    for (let i = 0; i < bows; i++) {
      const alpha = mix(a0, a1, i / (bows - 1));
      const bow = mesh(new THREE.TorusGeometry(hr + 0.004, 0.012, 5, 22, Math.PI), steel, pivot, [hw / hr, 1, 1]);
      bow.rotation.x = alpha - Math.PI / 2;
    }
    if (a.hoodState === 'torn') {
      const flap = mesh(new THREE.PlaneGeometry(0.4, 0.5, 4, 4), hoodMat, [0.12, pivot[1] + hr * 0.62, pivot[2] + hr * 0.5]);
      const pos = flap.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getY(i) * 7) * 0.05);
      flap.geometry.computeVertexNormals();
      flap.rotation.set(0.3, 0.4, 0.2);
    }
    for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), steel, [side * hw, pivot[1], pivot[2]]).rotation.z = Math.PI / 2;

    // ---- tinsel, streamers, flowers ----
    const glitter = ['#e9c23a', '#d8368a', '#3fb0c9', '#e04a30', '#6fd04a', '#f1f1ec'];
    const bits: { at: [number, number, number]; size: number; color: string }[] = [];
    if (a.tinsel > 0.15) {
      const strands = Math.round(mix(3, 9, a.tinsel));
      for (const side of [-1, 1]) for (let i = 0; i < strands; i++) {
        const cloth = mesh(new THREE.PlaneGeometry(0.014, 0.2 + random() * 0.22), s.material(glitter[Math.floor(random() * glitter.length)], { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.3 }), [side * 0.27 + (random() - 0.5) * 0.03, 0.96, -0.3 + (random() - 0.5) * 0.08], [1, 1, 1], steer);
        cloth.rotation.set((random() - 0.5) * 0.5, random() * 3, side * (0.15 + random() * 0.4));
        cloth.position.y = 1.08 - (cloth.geometry as THREE.PlaneGeometry).parameters.height / 2;
      }
    }
    if (a.tinsel > 0.4) {
      const edge = a1;
      for (let j = 0; j <= 26; j++) { const beta = (j / 26) * Math.PI, h = Math.sin(beta) ** 0.75 * hr; bits.push({ at: [pivot[0] + Math.cos(beta) * hw, pivot[1] + h * Math.sin(edge) - 0.02, pivot[2] - h * Math.cos(edge) + 0.01], size: 0.022, color: glitter[j % 3] }); }
      for (let i = 0; i < 5; i++) bits.push({ at: [-0.14 + i * 0.07, 1.13, 0.64], size: 0.03, color: ['#e8388a', '#f2c21f', '#f6f3ea'][i % 3] });
      for (let i = 0; i < 9; i++) bits.push({ at: [-0.4 + i * 0.1, 0.86, -1.045], size: 0.018, color: glitter[i % glitter.length] });
    }
    if (a.tinsel > 0.75) {
      for (const side of [-1, 1]) {
        const wheelToy = new THREE.Group();
        for (let i = 0; i < 4; i++) { const vane = mesh(new THREE.CircleGeometry(0.07, 3), s.material(glitter[(i + (side > 0 ? 0 : 2)) % glitter.length], { side: THREE.DoubleSide, metalness: 0.5, roughness: 0.3 }), [Math.cos(i * 1.57) * 0.05, Math.sin(i * 1.57) * 0.05, 0], [1, 1, 1], wheelToy); vane.rotation.z = i * 1.57; }
        wheelToy.position.set(side * 0.3, 1.32, 0.66);
        add(wheelToy, steer.parent === rig ? rig : rig);
        rod([side * 0.3, 1.1, 0.66], [side * 0.3, 1.32, 0.655], 0.005, steel);
        rig.userData[side > 0 ? 'spinA' : 'spinB'] = wheelToy;
      }
      for (let j = 0; j <= 20; j++) { const t = j / 20; bits.push({ at: [mix(-hw, hw, t), pivot[1] + 0.02 - Math.sin(t * Math.PI) * 0.12, pivot[2] - hr * Math.cos(a0) - 0.02], size: 0.02, color: glitter[(j + 2) % glitter.length] }); }
    }
    if (bits.length) rig.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.5, flatShading: true }), bits));

    // ---- what is on the seat ----
    const seatY = 0.86;
    const load = new THREE.Group();
    load.position.set(0, seatY, -0.74);
    add(load);
    const figure = (cloth: THREE.Material, skinTint: string) => ({ cloth, skin: s.material(skinTint, { roughness: 0.8 }) });
    if (a.seat === 'puller') {
      const { cloth, skin } = figure(s.material('#e9e4d2', { roughness: 0.95 }), '#7a4f34');
      const lungi = new THREE.MeshStandardMaterial({ map: canvasTexture(64, 64, (ctx) => { ctx.fillStyle = '#2f5f9a'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 64; i += 16) { ctx.fillRect(i, 0, 5, 64); ctx.fillRect(0, i, 64, 5); } }), roughness: 0.95 });
      mesh(sphere, cloth, [-0.08, 0.1, 0], [0.24, 0.11, 0.17], load);
      mesh(sphere, lungi, [0.2, 0.12, 0.04], [0.2, 0.12, 0.18], load);
      rod([0.26, 0.12, 0.08], [0.36, 0.34, 0.26], 0.05, lungi, load);
      rod([0.36, 0.34, 0.26], [0.3, 0.02, 0.44], 0.04, skin, load);
      mesh(sphere, skin, [-0.34, 0.16, -0.02], [0.09, 0.1, 0.1], load);
      mesh(cube, s.material(mood.cheer > 0.5 ? '#c7261f' : '#8a5a4a', { roughness: 1 }), [-0.34, 0.24, 0], [0.2, 0.02, 0.22], load).rotation.z = 0.2;
      rod([-0.1, 0.16, 0.12], [0.08, 0.2, 0.02], 0.035, skin, load);
    } else if (a.seat === 'sacks') {
      const sack = s.material('#d9cdaa', { roughness: 1 });
      for (let i = 0; i < 5; i++) { const b = mesh(sphere, sack, [(i % 2 ? 0.17 : -0.17) * (i === 4 ? 0 : 1), 0.08 + Math.floor(i / 2) * 0.15, (random() - 0.5) * 0.06], [0.2, 0.085, 0.24], load); b.rotation.y = (random() - 0.5) * 0.5; }
      mesh(cube, s.material('#b3261f'), [0.17, 0.09, 0.2], [0.14, 0.08, 0.004], load);
      for (let i = 0; i < 2; i++) mesh(sphere, sack, [(i ? 0.14 : -0.14), 0.02, 0.5], [0.2, 0.085, 0.22], load).position.y = -0.24;
    } else if (a.seat === 'school') {
      for (const [x, tint] of [[-0.2, '#2f6fc0'], [0.14, '#e8388a']] as const) {
        mesh(sphere, s.material(tint, { roughness: 0.9 }), [x, 0.17, -0.04], [0.14, 0.18, 0.1], load).rotation.x = -0.2;
        mesh(sphere, s.material('#f2c21f', { roughness: 0.9 }), [x, 0.12, 0.06], [0.09, 0.08, 0.05], load);
      }
      for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 14), steel, [0.32, 0.04 + i * 0.075, 0.1], [1, 1, 1], load);
      mesh(new THREE.TorusGeometry(0.07, 0.008, 5, 12, Math.PI), steel, [0.32, 0.23, 0.1], [1, 1.4, 1], load);
      mesh(sphere, s.material('#3f9fd8'), [-0.02, 0.05, 0.14], [0.035, 0.05, 0.035], load);
    } else if (a.seat === 'chickens') {
      const cane = s.material('#c9a35a', { roughness: 0.9 });
      const dome = mesh(new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c9a35a', wireframe: true }), [0, 0, 0], [1, 1.1, 0.75], load);
      dome.castShadow = false;
      mesh(new THREE.TorusGeometry(0.3, 0.014, 5, 20), cane, [0, 0.01, 0], [1, 0.75, 1], load).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const x = -0.14 + i * 0.14, tint = ['#f1ece0', '#a8642a', '#2e2622'][i];
        mesh(sphere, s.material(tint, { roughness: 1 }), [x, 0.09, (i % 2) * 0.06 - 0.03], [0.07, 0.075, 0.09], load);
        mesh(sphere, s.material(tint, { roughness: 1 }), [x, 0.17, (i % 2) * 0.06 + 0.04], [0.035, 0.04, 0.035], load);
        mesh(new THREE.ConeGeometry(0.012, 0.03, 4), s.material('#e2a21f'), [x, 0.165, (i % 2) * 0.06 + 0.085], [1, 1, 1], load).rotation.x = Math.PI / 2;
        mesh(sphere, s.material('#c7261f'), [x, 0.21, (i % 2) * 0.06 + 0.04], [0.008, 0.02, 0.02], load);
      }
    } else if (a.seat === 'vegetables') {
      const cane = s.material('#b88f4a', { roughness: 0.9 });
      const veg = [['#c7261f', '#d8432f'], ['#5fa03a', '#3f7a2a'], ['#7a3fa0', '#5a2f7a'], ['#e9b02a', '#e08a1f']];
      [-0.2, 0.2].forEach((x, k) => {
        mesh(new THREE.CylinderGeometry(0.19, 0.13, 0.16, 14), cane, [x, 0.08, 0], [1, 1, 1], load);
        const pair = veg[Math.floor(random() * veg.length)];
        for (let i = 0; i < 12; i++) { const t = random() * 6.28, r = random() * 0.14; mesh(sphere, s.material(pair[i % 2], { roughness: 0.6 }), [x + Math.cos(t) * r, 0.17 + random() * 0.05 + (0.14 - r) * 0.4, Math.sin(t) * r], [0.04, 0.04 + k * 0.01, 0.04], load); }
      });
      for (let i = 0; i < 5; i++) mesh(sphere, s.material('#6fae3a', { roughness: 0.8 }), [0, 0.06 + i * 0.01, 0.16], [0.03, 0.03, 0.14], load).rotation.y = (i - 2) * 0.25;
    } else if (a.seat === 'passenger') {
      const { cloth, skin } = figure(s.material(mood.cheer > 0.5 ? '#e0a02a' : '#7f8a8f', { roughness: 0.9 }), '#8a5a3c');
      mesh(sphere, cloth, [0, 0.3, -0.04], [0.19, 0.3, 0.15], load);
      mesh(sphere, skin, [0, 0.68, 0], [0.1, 0.115, 0.105], load);
      mesh(sphere, s.material('#16130f'), [0, 0.72, -0.025], [0.105, 0.09, 0.105], load);
      for (const side of [-1, 1]) { rod([side * 0.1, 0.1, 0.02], [side * 0.11, 0.12, 0.34], 0.065, cloth, load); rod([side * 0.11, 0.12, 0.34], [side * 0.11, -0.22, 0.4], 0.05, cloth, load); }
      if (a.hoodState !== 'up') {
        rod([0.16, 0.3, 0.14], [0.2, 1.05, 0.06], 0.012, dark, load);
        mesh(new THREE.ConeGeometry(0.5, 0.18, 10, 1, true), s.material('#1b1b1f', { side: THREE.DoubleSide, roughness: 0.6 }), [0.2, 1.04, 0.06], [1, 1, 1], load).rotation.z = -0.1;
      } else mesh(cube, s.material('#e9e6da'), [0, 0.34, 0.16], [0.26, 0.2, 0.02], load).rotation.x = -0.5;
    }

    // ---- stance and water ----
    const level = mix(0.33, 0.42, random());
    const f = flood(s, 1.2, 1.9, level);
    rig.position.z = 0.1;
    if (a.stance === 'turned') steer.rotation.y = (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.25);
    else steer.rotation.y = (random() - 0.5) * 0.25;
    if (a.stance === 'leaning') { rig.rotation.z = -0.17; rig.rotation.x = 0.03; rig.position.set(0.05, 0.02, 0.1); }
    rig.rotation.y = (random() - 0.5) * 0.2;
    for (const [x, z] of [[-track, rearZ], [track, rearZ], [0, 1.1]]) f.ripple(x, z + 0.1, 0.18, 1, 2.1);
    f.ripple(0, 0.1, 0.58, 1, 2.1);
    if (a.stance === 'chained') {
      const post = s.material('#7d8386', { metalness: 0.5, roughness: 0.6 });
      const px = -0.8, pz = 0.55;
      s.rod([px, 0, pz], [px - 0.14, 2.1, pz + 0.05], 0.035, post);
      const board = s.label(['NO PARKING', 'STAND', 'ONE WAY'][Math.floor(random() * 3)], 0.5, 0.2, [px - 0.14, 1.95, pz + 0.09], '#f6f3ea', '#1f4f9a');
      board.rotation.z = 0.07;
      const links = Array.from({ length: 16 }, (_unused, i) => { const t = i / 15; return { at: [mix(px - 0.05, 0, t), mix(0.9, 0.86, t) - Math.sin(t * Math.PI) * 0.3, mix(pz, 0.55, t)] as [number, number, number], size: 0.02, color: '#8d9093' }; });
      s.scatter(new THREE.TorusGeometry(1, 0.3, 4, 8), s.material('#8d9093', { metalness: 0.8, roughness: 0.4 }), links);
      s.box([0.07, 0.09, 0.03], [px * 0.5, 0.56, 0.55], s.material('#c9a23a', { metalness: 0.7 }));
      f.ripple(px, pz, 0.1, 2);
    }

    const spin = mix(0.5, 6, mood.energy);
    return s.finish({
      footprint: 1.6,
      update: (dt, time) => {
        f.update(dt, time);
        for (const key of ['spinA', 'spinB']) { const toy = rig.userData[key] as THREE.Object3D | undefined; if (toy) toy.rotation.z += dt * spin; }
      },
    });
  },
});

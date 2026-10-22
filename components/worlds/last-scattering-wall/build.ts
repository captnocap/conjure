import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

const WALLS = {
  eggshell: 'A speckled eggshell: warm cream flecked with rust and slate blue.',
  plaster: 'Old plaster: chalky grey-white with water stains and a few hairline cracks.',
  thermal: 'The survey map itself, softened: clear orange hot spots and blue cold spots.',
  ember: 'Still glowing: peach and rose, as if the fire behind it had only just gone out.',
  print: 'A pale monochrome print, blue-grey ink stippled on white paper.',
} as const;
const TONES: Record<keyof typeof WALLS, { base: string; warm: string; cool: string; speck: string; sky: string }> = {
  eggshell: { base: '#eadfca', warm: '#c9743c', cool: '#6f8fae', speck: '#6b4a34', sky: '#e6dcc8' },
  plaster: { base: '#e2e0d8', warm: '#b9a58a', cool: '#9aa7b0', speck: '#77736a', sky: '#dfddd6' },
  thermal: { base: '#f0e2c0', warm: '#e2622b', cool: '#3f7fc8', speck: '#a8362a', sky: '#ecdfc4' },
  ember: { base: '#f2cfb4', warm: '#e0553a', cool: '#b98aa8', speck: '#8a2f2a', sky: '#efcdb6' },
  print: { base: '#eef0ee', warm: '#5d7896', cool: '#b9c6d2', speck: '#34485e', sky: '#e9ecec' },
};

export default defineWorld({
  questions: {
    wall: choice('What is the wall of first light like?', WALLS),
    grain: score('How fine is its mottling?', ['A few huge soft blotches, an early blurred survey', 'Hand-sized patches', 'Fine speckle, sharp as sand']),
    mark: choice('What marks the wall?', {
      unmarked: 'Nothing. It is seamless in every direction.',
      grid: 'A faint ruled grid of latitude and longitude, bending with the curve.',
      coldspot: 'One great cold spot, a bruise-blue patch larger than anything should be.',
      mask: 'A blank grey band across it where our own galaxy was cut out of the map.',
      leak: 'Bright cracks, as if something earlier were leaking through.',
    }),
    galaxies: choice('What hangs in front of the wall?', {
      none: 'Nothing yet: the dark ages, before any star.',
      few: 'A handful of faint red smudges, the very first galaxies.',
      scatter: 'A thin even scatter of small early galaxies.',
      clusters: 'Galaxies already gathering into knots and strings.',
    }),
    fog: choice('What fills the space between?', {
      clear: 'Clear, empty distance.',
      haze: 'Soft pearl-grey banks of untouched gas.',
      motes: 'Fine drifting motes catching the light.',
    }),
    plate: choice('Is the limit labelled?', {
      none: 'No label.',
      redshift: 'A small plate reading z = 1100.',
      age: 'A small plate reading 380,000 YEARS.',
      end: 'A small plate reading NO EARLIER LIGHT.',
    }),
    view: choice('Where do we stand?', {
      facing: 'Square on, the wall filling everything behind.',
      below: 'Low down looking up, the wall looming overhead.',
      along: 'At a slant, looking along the curve as it bends away.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tone = TONES[a.wall];
    const lerpHex = (from: string, to: string, t: number) => new THREE.Color(from).lerp(new THREE.Color(to), t);
    const balance = mood.warmth; // more warm blotches or more cool ones
    const css = (c: THREE.Color, alpha: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
    const srgb = (hex: string) => new THREE.Color(hex).convertLinearToSRGB();

    // ---- The wall: the inside of a great sphere, painted with mottling that tiles. ----
    const SIZE = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = tone.base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const blob = (x: number, y: number, r: number, colour: string, alpha: number, squash = 1) => {
      const c = srgb(colour);
      for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) {
        if (x + dx < -r * 2 || x + dx > SIZE + r * 2 || y + dy < -r * 2 || y + dy > SIZE + r * 2) continue;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, css(c, alpha)); g.addColorStop(0.6, css(c, alpha * 0.5)); g.addColorStop(1, css(c, 0));
        ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(1, squash); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.restore();
      }
    };
    const strength = mix(0.75, 1.15, mood.cheer) * (a.wall === 'thermal' ? 1.25 : a.wall === 'plaster' ? 0.7 : 1);
    // Octaves from broad to fine; the grain answer decides which carry the weight.
    const octaves = [{ r: 150, n: 26 }, { r: 70, n: 110 }, { r: 32, n: 420 }, { r: 14, n: 1500 }, { r: 6, n: 3600 }];
    octaves.forEach((octave, index) => {
      const weight = Math.max(0, 1 - Math.abs(index / 4 - mix(0.12, 0.95, a.grain)) * 1.7);
      const count = Math.round(octave.n * mix(0.25, 1, weight));
      for (let i = 0; i < count; i++) blob(random() * SIZE, random() * SIZE, octave.r * mix(0.6, 1.4, random()), random() < mix(0.38, 0.62, balance) ? tone.warm : tone.cool, mix(0.05, 0.34, weight) * strength, mix(0.6, 1, random()));
    });
    const specks = Math.round(mix(300, 1500, a.grain) * (a.wall === 'print' ? 2.5 : 1));
    ctx.fillStyle = css(srgb(tone.speck), 0.45);
    for (let i = 0; i < specks; i++) { const r = 0.8 + random() ** 3 * 3; ctx.beginPath(); ctx.arc(random() * SIZE, random() * SIZE, r, 0, 6.3); ctx.fill(); }
    if (a.wall === 'plaster' || mood.wear > 0.6) {
      // Stains and hairline cracks.
      for (let i = 0; i < 8 + mood.wear * 14; i++) blob(random() * SIZE, random() * SIZE, 40 + random() * 90, '#8a7a5c', 0.1 + mood.wear * 0.1, 0.5);
      ctx.strokeStyle = css(srgb('#5d584e'), 0.55); ctx.lineWidth = 1.3;
      for (let i = 0; i < 5 + mood.wear * 14; i++) {
        let x = random() * SIZE, y = random() * SIZE;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 14; k++) { x += (random() - 0.5) * 60; y += random() * 34; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 3);
    texture.anisotropy = 8;
    const R = 26, centre = new THREE.Vector3(0, 0, 5);
    const wall = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, toneMapped: false }));
    wall.position.copy(centre);
    wall.rotation.y = random() * 6.28;
    root.add(wall);
    // A point on the wall, by angles measured from the direction the camera looks.
    const onWall = (yaw: number, pitch: number, inset = 0.25) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(R - inset).add(centre);
    const ink = lerpHex(tone.speck, tone.base, 0.35);

    if (a.mark === 'grid') {
      const line = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.6 });
      for (let i = -3; i <= 3; i++) {
        const lat = i * 0.2;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry((R - 0.2) * Math.cos(lat), 0.035, 5, 160), line);
        hoop.rotation.x = Math.PI / 2; hoop.position.copy(centre).y += (R - 0.2) * Math.sin(lat);
        root.add(hoop);
      }
      for (let i = -5; i <= 5; i++) {
        const meridian = new THREE.Mesh(new THREE.TorusGeometry(R - 0.2, 0.035, 5, 160), line);
        meridian.rotation.y = Math.PI / 2 + i * 0.2; meridian.position.copy(centre);
        root.add(meridian);
      }
    }
    const patch = (yaw: number, pitch: number, size: number, colour: string, alpha: number, squash = 1) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const p = c.getContext('2d')!, g = p.createRadialGradient(64, 64, 0, 64, 64, 64), col = srgb(colour);
      g.addColorStop(0, css(col, alpha)); g.addColorStop(0.55, css(col, alpha * 0.7)); g.addColorStop(1, css(col, 0));
      p.fillStyle = g; p.fillRect(0, 0, 128, 128);
      const map = new THREE.CanvasTexture(c);
      map.colorSpace = THREE.SRGBColorSpace;
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(size, size * squash), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
      disc.position.copy(onWall(yaw, pitch, 0.5));
      disc.lookAt(centre);
      root.add(disc);
      return disc;
    };
    if (a.mark === 'coldspot') {
      const side = random() < 0.5 ? -1 : 1;
      patch(side * mix(0.12, 0.22, random()), mix(0.05, 0.16, random()), 9, a.wall === 'print' ? '#34485e' : '#3a5f9a', 0.72, 0.8);
      patch(side * 0.2, 0.12, 4, '#22386a', 0.5);
    }
    if (a.mark === 'mask') {
      const band = new THREE.Mesh(new THREE.SphereGeometry(R - 0.3, 72, 6, 0, Math.PI * 2, Math.PI / 2 - 0.032, 0.064), new THREE.MeshBasicMaterial({ color: lerpHex('#b4b2ad', tone.base, 0.35), side: THREE.BackSide, toneMapped: false }));
      band.position.copy(centre);
      band.rotation.z = mix(0.06, 0.2, random()) * (random() < 0.5 ? -1 : 1);
      band.rotation.x = (random() < 0.5 ? -1 : 1) * mix(0.13, 0.2, random());
      root.add(band);
    }
    if (a.mark === 'leak') {
      const glow = new THREE.MeshBasicMaterial({ color: '#fff6d8', toneMapped: false });
      const rim = new THREE.MeshBasicMaterial({ color: lerpHex(tone.warm, '#6b2a1c', 0.4), toneMapped: false });
      for (let i = 0; i < 4; i++) {
        let yaw = (random() - 0.5) * 0.7, pitch = (random() - 0.2) * 0.4;
        const points: THREE.Vector3[] = [];
        for (let k = 0; k < 9; k++) { points.push(onWall(yaw, pitch, 0.4)); yaw += (random() - 0.5) * 0.07; pitch -= 0.02 + random() * 0.03; }
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
        root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.11, 5), rim));
        const bright = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 5), glow);
        bright.position.z += 0.12;
        root.add(bright);
      }
    }

    // ---- The first galaxies, hanging between us and the wall. ----
    const count = { none: 0, few: 7, scatter: 60, clusters: 130 }[a.galaxies] * (a.galaxies === 'few' ? 1 : mix(0.6, 1.5, mood.density));
    const tints = [lerpHex('#c2452e', tone.base, 0.15), lerpHex('#d9862f', tone.base, 0.2), lerpHex('#8a3a4a', tone.base, 0.1), lerpHex('#5d7fb8', tone.base, 0.2)];
    const drift = new THREE.Group();
    root.add(drift);
    const n = Math.round(count);
    if (n) {
      const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), n);
      const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.42, depthWrite: false }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const knots = Array.from({ length: 6 }, () => new THREE.Vector3((random() - 0.5) * 24, (random() - 0.5) * 13, mix(-15, -8, random())));
      for (let i = 0; i < n; i++) {
        const at = new THREE.Vector3((random() - 0.5) * 30, (random() - 0.5) * 17, mix(-16, -7, random()));
        if (a.galaxies === 'clusters' && i % 4) at.copy(knots[i % knots.length]).add(new THREE.Vector3((random() - 0.5) * 5, (random() - 0.5) * 2.2, (random() - 0.5) * 2));
        const size = a.galaxies === 'few' ? mix(0.14, 0.26, random()) : mix(0.06, 0.2, random() ** 2);
        e.set(random() * 3, random() * 3, random() * 3); q.setFromEuler(e);
        const flat = mix(0.3, 0.8, random()), tint = tints[a.galaxies === 'few' ? i % 2 * 2 : Math.floor(random() * tints.length)];
        cloud.setMatrixAt(i, m.compose(at, q, new THREE.Vector3(size * 1.1, size * flat * 0.7, size * 0.8)));
        cloud.setColorAt(i, tint.clone().lerp(new THREE.Color('#ffe2b0'), 0.5));
        glow.setMatrixAt(i, m.compose(at, q, new THREE.Vector3(size * 3.6, size * flat * 2.4, size * 2.6)));
        glow.setColorAt(i, tint);
      }
      cloud.frustumCulled = glow.frustumCulled = false;
      drift.add(cloud, glow);
    }
    const hazes: THREE.Mesh[] = [];
    if (a.fog === 'haze') for (let i = 0; i < 7; i++) {
      const bank = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ color: lerpHex('#d2d0cc', tone.base, 0.3), transparent: true, opacity: mix(0.14, 0.26, random()), depthWrite: false, toneMapped: false }));
      bank.scale.set(mix(4, 9, random()), mix(0.9, 2, random()), 2);
      bank.position.set((random() - 0.5) * 24, (i % 2 ? -1 : 1) * mix(2.5, 7, random()), mix(-12, -6, random()));
      root.add(bank); hazes.push(bank);
    }
    if (a.fog === 'motes') {
      const k = Math.round(mix(120, 420, mood.density));
      const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: lerpHex('#ffffff', tone.warm, 0.25), toneMapped: false }), k);
      const m = new THREE.Matrix4();
      for (let i = 0; i < k; i++) { const size = 0.02 + random() ** 2 * 0.05; motes.setMatrixAt(i, m.makeScale(size, size, size).setPosition((random() - 0.5) * 26, (random() - 0.5) * 16, mix(-12, 6, random()))); }
      motes.frustumCulled = false;
      drift.add(motes);
    }

    let card: THREE.Mesh | null = null;
    if (a.plate !== 'none') {
      const words = { redshift: 'z = 1100', age: '380,000 YEARS', end: 'NO EARLIER LIGHT' }[a.plate];
      const c = document.createElement('canvas');
      c.width = 512; c.height = 112;
      const p = c.getContext('2d')!;
      p.fillStyle = '#f4efe2'; p.fillRect(0, 0, 512, 112);
      p.strokeStyle = '#3a3f48'; p.lineWidth = 5; p.strokeRect(6, 6, 500, 100);
      p.fillStyle = '#2a2f38'; p.textAlign = 'center'; p.textBaseline = 'middle';
      p.font = `bold ${Math.min(58, 760 / words.length)}px Georgia, serif`;
      p.fillText(words, 256, 58, 470);
      const map = new THREE.CanvasTexture(c);
      map.colorSpace = THREE.SRGBColorSpace;
      const side = random() < 0.5 ? -1 : 1;
      card = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
      card.userData.side = side;
      root.add(card);
    }

    // ---- Light: soft and frontal, as if lit by the wall's own glow reflected back. ----
    root.add(new THREE.HemisphereLight(lerpHex('#ffffff', tone.base, 0.4), lerpHex('#8a8f9a', tone.cool, 0.3), 1.25));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.4, 0.9), 2.3);
    key.position.set(mix(-12, 12, mood.daylight), 10, 14);
    root.add(key, key.target);
    const back = new THREE.DirectionalLight(tone.warm, 0.7);
    back.position.set(0, 2, -14);
    root.add(back);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);
    const yaw = a.view === 'along' ? (random() < 0.5 ? -1 : 1) * 0.42 : (random() - 0.5) * 0.08;
    const pitch = a.view === 'below' ? -0.3 : a.view === 'along' ? 0.06 : 0.03;
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    // A shallow arc bowed toward the viewer: the hero nearest, the rest falling back toward the wall.
    const SPOTS: [number, number, number, number][] = [[0, -0.2, 1.6, 2.9], [-4.6, 0.5, -1.5, 2.1], [4.6, -0.1, -1.5, 2.1], [-8.3, -0.6, -5, 1.7], [8.3, 0.7, -5, 1.7], [-2.6, 4.2, -6.5, 1.4], [2.9, -4.4, -6.5, 1.4]];

    const place = (items: readonly Placeable[]) => {
      let need = 8;
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      items.forEach((item, index) => {
        const [x, y, z, fit] = SPOTS[index % SPOTS.length];
        const scale = Math.min(fit * 2 / Math.max(item.height, 0.05), fit / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        const bob = (context.random() - 0.5) * 0.5;
        item.holder.position.set(x, y + bob - item.height * scale / 2, z);
        item.holder.rotation.y = yaw * 0.8 - x * 0.03 + (context.random() - 0.5) * 0.5;
        item.holder.updateMatrixWorld(true);
        // The camera must stand far enough back that this spot, with margin, is inside the frame.
        need = Math.max(need, (Math.abs(x) + fit * 1.1) / half + z, (Math.abs(y) + fit * 1.2) / half + z);
      });
      const distance = need * (a.view === 'along' ? 1.12 : 1.02);
      camera.position.copy(toCamera).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      camera.far = distance + 80;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(0, 0, 0);
      if (card) {
        // Pin the plate into a lower corner of the frame, well behind the cast.
        const depth = distance + 6, reach = half * depth;
        card.position.set(card.userData.side * (reach - 2.3), -(reach - 1.1), -depth).applyMatrix4(camera.matrixWorld);
        card.quaternion.copy(camera.quaternion);
      }
    };

    const speed = mix(0.02, 0.3, mood.energy);
    return {
      object: root,
      camera,
      background: new THREE.Color(tone.sky),
      capacity: SPOTS.length,
      ground: null,
      keyLight: key,
      place,
      update(_dt, time) {
        drift.position.x = Math.sin(time * speed) * 0.5;
        drift.position.y = Math.cos(time * speed * 0.7) * 0.3;
        hazes.forEach((bank, i) => { bank.position.x += Math.sin(time * speed + i) * 0.002; });
      },
      dispose() { disposeTree(root); },
    };
  },
});

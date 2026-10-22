import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, blend, paint, type P3 } from './tundra';

/** A wooden herders' sledge, nose toward +x, standing on y = 0. */
function sledge(b: Batch, m: THREE.Matrix4, wood: THREE.Color, dark: THREE.Color, length = 2.8, width = 0.72) {
  const local = new Batch();
  const h = 0.52, L = length;
  for (const side of [-1, 1]) {
    const z = side * width / 2;
    local.tube([[-L / 2, 0.04, z], [0, 0.04, z], [L / 2 - 0.55, 0.04, z], [L / 2 - 0.12, 0.2, z], [L / 2 + 0.08, 0.56, z]], () => 0.038, wood, 5, 16);
    local.rod([-L / 2 + 0.1, h, z * 0.82], [L / 2 - 0.5, h, z * 0.82], 0.03, 0.03, wood, 5);
    local.rod([L / 2 - 0.5, h, z * 0.82], [L / 2 + 0.08, 0.56, z], 0.025, 0.02, wood, 5);
    for (let i = 0; i < 4; i++) {
      const x = -L / 2 + 0.3 + i * (L - 1.1) / 3;
      local.rod([x + 0.14, 0.05, z], [x, h, z * 0.82], 0.028, 0.024, dark, 5);
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = -L / 2 + 0.3 + i * (L - 1.1) / 3;
    local.rod([x, h, -width * 0.41], [x, h, width * 0.41], 0.024, 0.024, dark, 5);
  }
  for (let i = -1; i <= 1; i++) local.box([L - 0.75, 0.025, width * 0.22], [-0.2, h + 0.03, i * width * 0.25], wood);
  local.rod([L / 2 + 0.08, 0.56, -width / 2], [L / 2 + 0.08, 0.56, width / 2], 0.022, 0.022, dark, 5);
  b.adopt(local.geometry(), m);
}

function coverTexture(kind: 'hide' | 'canvas' | 'patched' | 'bark', wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const palette = {
    hide: ['#7d5d42', '#6c4f38', '#8a6a4c', '#5d4433', '#94775a'],
    canvas: ['#d2c8ab', '#c5b996', '#dcd3ba', '#b9ad8c'],
    patched: ['#7d5d42', '#6c4f38', '#3f6f9c', '#8a6a4c', '#b65a2e', '#8e8c84', '#5d4433'],
    bark: ['#d9d3c3', '#c9c0aa', '#e6e1d2', '#b3a78e'],
  }[kind];
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 1024, 512);
  const rows = kind === 'bark' ? 7 : 4;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * 512, hgt = 512 / rows;
    let x = -random() * 80;
    while (x < 1024) {
      const w = (kind === 'bark' ? 60 : 110) + random() * 150;
      ctx.fillStyle = palette[Math.floor(random() * palette.length)];
      ctx.fillRect(x, y, w, hgt + 2);
      ctx.strokeStyle = 'rgba(30,20,12,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, hgt + 2);
      ctx.strokeStyle = 'rgba(240,225,200,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 9]);
      ctx.strokeRect(x + 5, y + 5, w - 10, hgt - 8);
      ctx.setLineDash([]);
      x += w;
    }
  }
  if (kind === 'hide' || kind === 'patched') {
    ctx.strokeStyle = 'rgba(40,26,16,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 900; i++) { const x = random() * 1024, y = random() * 512; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 6, y + 10 + random() * 14); ctx.stroke(); }
  }
  for (let i = 0; i < 20 + wear * 60; i++) {
    ctx.fillStyle = `rgba(40,30,22,${0.05 + random() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 512, 20 + random() * 60, 30 + random() * 90, 0, 0, 7); ctx.fill();
  }
  const soot = ctx.createLinearGradient(0, 0, 0, 512);
  soot.addColorStop(0, `rgba(20,16,14,${0.75 + wear * 0.2})`);
  soot.addColorStop(0.28 + wear * 0.15, 'rgba(20,16,14,0.12)');
  soot.addColorStop(1, 'rgba(20,16,14,0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, 1024, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    cover: choice('What is the tent covered with?', {
      hide: 'Dark brown reindeer hides, fur out, stitched in big panels: the winter cover.',
      canvas: 'Pale sun-bleached canvas, the light summer cover.',
      patched: 'Old hides patched with blue tarpaulin, orange cloth and grey felt.',
      bark: 'Pale strips of boiled birch bark sewn in overlapping bands.',
    }),
    state: choice('What stage of its life is the camp at?', {
      lived: 'Fully pitched and lived in, cover tight to the ground.',
      pitching: 'Half pitched: the cover reaches only partway up the bare poles.',
      frame: 'Only the bare cone of poles stands, covers rolled on the ground, arriving or leaving.',
    }),
    smoke: choice('What comes out of the stovepipe?', {
      none: 'Nothing. The stove is cold.',
      thread: 'A thin thread of smoke.',
      plume: 'A steady grey plume, dinner is on.',
      billow: 'Thick white billows from damp wood.',
    }),
    door: choice('How is the door flap?', {
      shut: 'Laced shut against the wind.',
      open: 'Tied back, an orange stove glow showing inside.',
      ajar: 'Hanging half open, someone just stepped out.',
    }),
    sledge: choice('Where is the sledge?', {
      leaning: 'Tipped up on its tail and leaning against the tent wall.',
      parked: 'Parked on its runners alongside.',
      pair: 'Two of them, one leaning and one parked.',
      gone: 'Gone: everyone is out with the herd.',
    }),
    yard: choice('What else stands outside?', {
      nothing: 'Nothing, only the tent.',
      firewood: 'A stack of split wood with an axe in the block.',
      rack: 'A drying rack hung with fish and strips of meat.',
      antlers: 'A heap of shed antlers bleaching.',
      dish: 'A satellite dish and a small generator: the present day.',
    }),
    size: score('How big is the tent?', ['A small two-person hunting tent', 'A family tent', 'A great tent for three generations']),
    snow: noul('Is snow banked around its base?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = mix(2.0, 3.5, a.size), H = R * 1.55;
    const wood = blend('#9a7a55', '#8d8a80', mood.wear * 0.8), woodDark = blend('#6e553b', '#66635b', mood.wear * 0.8);
    const frame = new Batch();
    const coverTop = a.state === 'lived' ? 0.87 : a.state === 'pitching' ? mix(0.38, 0.55, random()) : 0;

    // The cone of poles: each leans from the ground ring through the apex and sticks out beyond.
    const poles = Math.round(mix(16, 26, a.size));
    for (let i = 0; i < poles; i++) {
      const angle = (i / poles) * Math.PI * 2 + (random() - 0.5) * 0.08;
      const base = new THREE.Vector3(Math.cos(angle) * R * 0.99, 0, Math.sin(angle) * R * 0.99);
      const apex = new THREE.Vector3((random() - 0.5) * 0.16, H, (random() - 0.5) * 0.16);
      const tip = apex.clone().add(apex.clone().sub(base).normalize().multiplyScalar(mix(0.8, 1.7, random())));
      frame.rod(base.toArray() as P3, tip.toArray() as P3, 0.045, 0.022, i % 3 ? wood : woodDark, 5);
    }
    frame.add(new THREE.TorusGeometry(0.2, 0.03, 5, 12), '#3a2f25', new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, H * 0.985, 0));

    const radiusAt = (y: number) => R * (1 - y / H);
    let coverTexMap: THREE.Texture | null = null;
    if (coverTop > 0) {
      const top = H * coverTop;
      const geometry = new THREE.CylinderGeometry(radiusAt(top) + 0.06, R + 0.06, top, poles, 5, true);
      const pos = geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const sag = 1 + (random() - 0.5) * 0.025;
        pos.setXYZ(i, pos.getX(i) * sag, pos.getY(i), pos.getZ(i) * sag);
      }
      geometry.computeVertexNormals();
      coverTexMap = coverTexture(a.cover, mood.wear, random);
            const cover = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: coverTexMap, roughness: 0.95, side: THREE.DoubleSide, flatShading: true }), [0, top / 2, 0]);
      cover.rotation.y = random() * 6;
      // Ropes cinched round the cover.
      for (const f of a.state === 'lived' ? [0.3, 0.58] : [0.25]) {
        const y = H * f * (a.state === 'lived' ? 1 : coverTop / 0.87);
        frame.add(new THREE.TorusGeometry(radiusAt(y) + 0.08, 0.016, 5, poles), '#b9a47c', new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, y, 0));
      }
      // Door on the +z side: a trapezoid lying on the cone.
      const doorTop = Math.min(1.75, top * 0.9), half = 0.2;
      const on = (angle: number, y: number, out: number): P3 => [Math.sin(angle) * (radiusAt(y) + out), y, Math.cos(angle) * (radiusAt(y) + out)];
      const quad = (corners: P3[], material: THREE.Material) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
        g.setIndex([0, 1, 2, 0, 2, 3]);
        g.computeVertexNormals();
        return s.mesh(g, material);
      };
      const flapColour = { hide: '#a48562', canvas: '#a89872', patched: '#b65a2e', bark: '#8c7a5c' }[a.cover];
      const flap = s.material(flapColour, { side: THREE.DoubleSide, roughness: 0.95 });
      if (a.door === 'shut') {
        quad([on(-half, 0, 0.16), on(half, 0, 0.16), on(half * 0.8, doorTop, 0.12), on(-half * 0.8, doorTop, 0.12)], flap);
        for (let i = 0; i < 4; i++) frame.rod(on(-0.03, 0.3 + i * 0.36, 0.2), on(0.03, 0.42 + i * 0.36, 0.2), 0.012, 0.012, '#e6dcc2', 4);
      } else {
        const glow = new THREE.MeshStandardMaterial({ color: '#2a1508', emissive: '#ff8a2a', emissiveIntensity: mix(0.5, 1.5, mood.warmth) * (a.smoke === 'none' ? 0.15 : 1), side: THREE.DoubleSide });
        const open = a.door === 'open' ? 1 : 0.45;
        quad([on(-half * open, 0, 0.13), on(half, 0, 0.13), on(half * 0.8, doorTop, 0.1), on(-half * 0.8 * open, doorTop, 0.1)], glow);
        quad([on(-half * open - 0.02, 0, 0.2), on(-half * open - 0.16, 0, 0.3), on(-half * open - 0.12, doorTop, 0.16), on(-half * open * 0.8, doorTop, 0.13)], flap);
      }
    }
    if (a.state !== 'lived') {
      // Rolled covers waiting on the ground.
      const roll = s.material({ hide: '#7d5d42', canvas: '#cfc4a6', patched: '#3f6f9c', bark: '#d6cfbd' }[a.cover]);
      for (let i = 0; i < (a.state === 'frame' ? 3 : 1); i++) {
        const m = s.cylinder(0.28, 0.3, 1.9 + random(), [-R - 0.6 + i * 0.15, 0.3 + (i === 2 ? 0.5 : 0), -0.6 + i * 0.62 - (i === 2 ? 0.9 : 0)], roll, 10);
        m.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.5);
      }
    }

    // Stove and pipe: visible through bare poles, otherwise only the pipe shows above the cover.
    const iron = '#2c2a28';
    const pipeTop: P3 = [0.28, H + 1.0, 0.1];
    frame.rod([0.2, 0.9, 0.05], pipeTop, 0.07, 0.07, iron, 7);
    frame.drum(0.14, 0.1, [pipeTop[0], pipeTop[1] + 0.05, pipeTop[2]], iron, undefined, 7, 0.04);
    if (a.state !== 'lived') { frame.box([0.7, 0.5, 0.45], [0.2, 0.55, 0.05], iron); for (const x of [-0.1, 0.5]) for (const z of [-0.12, 0.22]) frame.rod([x, 0, z], [x, 0.3, z], 0.02, 0.02, iron, 4); }

    const place = (x: number, z: number, yaw: number, tilt = 0, lift = 0) => {
      const m = new THREE.Matrix4().makeRotationY(yaw);
      if (tilt) m.multiply(new THREE.Matrix4().makeRotationZ(tilt));
      return m.setPosition(x, lift, z);
    };
    const lean = () => {
      // Standing on its tail with the runners against the cone, bed facing out.
      const angle = 0.2 + random() * 0.3, beta = Math.atan2(H, R) + 0.03;
      const u = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const nose = u.clone().multiplyScalar(-Math.cos(beta)).setY(Math.sin(beta));
      const out = u.clone().multiplyScalar(Math.sin(beta)).setY(Math.cos(beta));
      const m = new THREE.Matrix4().makeBasis(nose, out, nose.clone().cross(out));
      m.setPosition(u.clone().multiplyScalar(R + 0.3).setY(0.03).addScaledVector(nose, 1.4));
      sledge(frame, m, wood, woodDark);
    };
    if (a.sledge === 'leaning' || a.sledge === 'pair') lean();
    if (a.sledge === 'parked' || a.sledge === 'pair') sledge(frame, place((R + 1.9) * 0.5, (R + 1.9) * 0.87, 0.2 + random() * 0.5), wood, woodDark);

    const yardAt: P3 = [-R * 0.55 - 0.9, 0, R * 0.8 + 0.6];
    if (a.yard === 'firewood') {
      for (let row = 0; row < 4; row++) for (let i = 0; i < 7 - row; i++)
        frame.rod([yardAt[0] - 0.5, 0.1 + row * 0.17, yardAt[2] - 0.6 + i * 0.19 + row * 0.09], [yardAt[0] + 0.45 + random() * 0.1, 0.1 + row * 0.17, yardAt[2] - 0.6 + i * 0.19 + row * 0.09], 0.085, 0.085, random() < 0.5 ? '#c8a97a' : '#8a6d4c', 6);
      frame.drum(0.26, 0.42, [yardAt[0] + 1.1, 0.21, yardAt[2] + 0.2], '#86694a', undefined, 9);
      frame.rod([yardAt[0] + 1.1, 0.42, yardAt[2] + 0.2], [yardAt[0] + 1.55, 0.95, yardAt[2] + 0.3], 0.022, 0.022, '#b8946a', 5);
      frame.box([0.07, 0.2, 0.16], [yardAt[0] + 1.14, 0.48, yardAt[2] + 0.21], '#5c6166', [0, 0, -0.7]);
    } else if (a.yard === 'rack') {
      const [x, , z] = yardAt;
      for (const dx of [-1.1, 1.1]) { frame.rod([x + dx - 0.25, 0, z - 0.2], [x + dx + 0.05, 1.9, z], 0.035, 0.03, wood, 5); frame.rod([x + dx + 0.25, 0, z + 0.2], [x + dx - 0.05, 1.9, z], 0.035, 0.03, wood, 5); }
      frame.rod([x - 1.4, 1.82, z], [x + 1.4, 1.82, z], 0.03, 0.03, woodDark, 5);
      for (let i = 0; i < 11; i++) {
        const fx = x - 1.0 + i * 0.2, len = 0.35 + random() * 0.35;
        frame.box([0.07, len, 0.025], [fx, 1.8 - len / 2, z], i % 3 ? '#b4543a' : '#c9b79a', [0, random(), 0]);
      }
    } else if (a.yard === 'antlers') {
      for (let i = 0; i < 9; i++) {
        const bx = yardAt[0] + (random() - 0.5) * 1.2, bz = yardAt[2] + (random() - 0.5) * 1.0, turn = random() * 6, up = 0.25 + random() * 0.5;
        const pts: P3[] = [[bx, 0.05, bz], [bx + Math.cos(turn) * 0.4, up, bz + Math.sin(turn) * 0.4], [bx + Math.cos(turn + 0.6) * 0.8, up + 0.25, bz + Math.sin(turn + 0.6) * 0.8], [bx + Math.cos(turn + 1.3) * 0.9, up + 0.55, bz + Math.sin(turn + 1.3) * 0.9]];
        frame.tube(pts, (t) => 0.035 * (1 - t * 0.6), '#e2d8c2', 5, 10);
        for (const p of [pts[1], pts[2]]) frame.rod(p, [p[0] + (random() - 0.5) * 0.4, p[1] + 0.3, p[2] + (random() - 0.5) * 0.4], 0.022, 0.008, '#e2d8c2', 4);
      }
    } else if (a.yard === 'dish') {
      const [x, , z] = yardAt;
      frame.rod([x, 0, z], [x, 1.5, z], 0.035, 0.035, '#7c8083', 6);
      const dish = new THREE.SphereGeometry(0.55, 14, 5, 0, Math.PI * 2, 0, 0.75);
      frame.add(dish, '#d9dcdc', new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(2.2, 0.5, 0)).setPosition(x - 0.1, 1.95, z + 0.3));
      frame.rod([x - 0.03, 1.55, z + 0.1], [x - 0.2, 1.8, z + 0.75], 0.012, 0.012, '#5c6166', 4);
      frame.box([0.6, 0.42, 0.4], [x + 1.0, 0.27, z + 0.1], '#c5372d');
      frame.box([0.5, 0.1, 0.3], [x + 1.0, 0.53, z + 0.1], '#2c2a28');
      frame.rod([x + 0.7, 0.06, z - 0.1], [x + 1.3, 0.06, z - 0.1], 0.02, 0.02, '#2c2a28', 4);
      frame.rod([x + 0.7, 0.06, z + 0.3], [x + 1.3, 0.06, z + 0.3], 0.02, 0.02, '#2c2a28', 4);
    }
    s.root.add(frame.mesh(paint(mood.wear, { side: THREE.DoubleSide })));

    if (a.snow) {
      const snow = s.material('#f1f3f2', { roughness: 0.9 });
      const drifts = 9 + Math.floor(random() * 4);
      for (let i = 0; i < drifts; i++) {
        const angle = (i / drifts) * Math.PI * 2 + random() * 0.3;
        if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)) - Math.PI / 2) < 0.4 && coverTop > 0) continue;
        s.ball([0.6 + random() * 0.5, 0.12 + random() * 0.14, 0.3 + random() * 0.2], [Math.cos(angle) * (R + 0.15), 0, Math.sin(angle) * (R + 0.15)], snow, 10).rotation.y = -angle + Math.PI / 2;
      }
    }

    // Smoke: soft puffs that rise and drift downwind.
    const puffs: { mesh: THREE.Mesh; offset: number }[] = [];
    const amount = { none: 0, thread: 5, plume: 9, billow: 13 }[a.smoke];
    const smokeColour = a.smoke === 'billow' ? '#f2f2ee' : blend('#9a9a98', '#d8d6d0', mood.cheer);
    const smokeMaterial = new THREE.MeshStandardMaterial({ color: smokeColour, transparent: true, opacity: a.smoke === 'thread' ? 0.4 : 0.6, depthWrite: false, roughness: 1 });
    const fat = { none: 0, thread: 0.13, plume: 0.3, billow: 0.36 }[a.smoke];
    const wind = mix(0.35, 1.1, mood.energy), rise = H * 0.55;
    const pose = (puff: { mesh: THREE.Mesh; offset: number }, t: number) => {
      const f = (t + puff.offset) % 1;
      puff.mesh.position.set(pipeTop[0] - f * f * rise * wind * 1.3 + Math.sin(f * 9 + puff.offset * 20) * 0.12, pipeTop[1] + 0.15 + f * rise, pipeTop[2] + Math.cos(f * 7 + puff.offset * 30) * 0.12);
      puff.mesh.scale.setScalar(fat * (0.55 + f * 1.5));
    };
    for (let i = 0; i < amount; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), smokeMaterial);
      s.root.add(mesh);
      const puff = { mesh, offset: i / amount + random() * 0.04 };
      puffs.push(puff);
      pose(puff, 0);
    }
    const speed = mix(0.05, 0.22, mood.energy);
    const thing = s.finish({ footprint: R + 1.2, update: (_dt, time) => { for (const puff of puffs) pose(puff, time * speed); } });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { coverTexMap?.dispose(); dispose(); } };
  },
});

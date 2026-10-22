import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('What is the water doing?', {
      boiling: 'At a rolling boil: the bottle glows orange from inside, bubbles churn and steam pours off the taps.',
      red: 'Glowing a deep ember red, perfectly still, too hot to look at.',
      ordinary: 'Ordinary pale water, nearly empty, a sad last inch at the bottom.',
      full: 'Freshly changed: a full bottle of clear cool water, the one decent thing here.',
      empty: 'No bottle at all. The empty cooler with a note taped to it asking who will change it.',
    }),
    cracked: noul('Is the bottle cracked, with a trickle running down the side?'),
    labels: choice('What do the tap labels say?', {
      hotter: 'HOT and HOTTER instead of hot and cold.',
      normal: 'The usual red HOT and blue COLD.',
      brimstone: 'FIRE and BRIMSTONE.',
      none: 'No labels; both taps are the same red.',
    }),
    cones: choice('What about the paper cones?', {
      sleeve: 'A full sleeve of paper cones clipped to the side.',
      melted: 'The sleeve is there and one cone has melted into a white smear on the floor.',
      scattered: 'Cones everywhere: on the floor, crumpled, stepped on.',
      gone: 'The cone holder is empty. Drink from your hands.',
    }),
    sheet: noul('Is there a sign-up sheet for refills hanging on the side?'),
    cabinet: choice('What is the cabinet like?', {
      beige: 'Beige plastic, yellowed with age.',
      white: 'Clean white and chrome, modern.',
      grey: 'Grey steel, institutional.',
      woodgrain: 'Fake woodgrain vinyl, 1970s.',
    }),
    puddle: score('How much has leaked onto the floor?', ['Dry', 'A damp ring', 'A proper puddle', 'A spreading flood with a wet-floor sign']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hot = a.state === 'boiling' || a.state === 'red';
    const shellTint = { beige: '#e3d7b4', white: '#f4f4f0', grey: '#8d9397', woodgrain: '#7a4e2e' }[a.cabinet];
    const shell = s.material(shellTint, { roughness: a.cabinet === 'white' ? 0.35 : 0.6, metalness: a.cabinet === 'grey' ? 0.4 : 0 });
    const trim = s.material(a.cabinet === 'white' ? '#d8dcdf' : '#2b2d30', { metalness: a.cabinet === 'white' ? 0.8 : 0.2, roughness: 0.4 });
    const dark = s.material('#202224', { roughness: 0.5 });
    const chrome = s.material('#d3d7da', { metalness: 0.9, roughness: 0.2 });

    // ---- Cabinet ----
    const W = 0.34, D = 0.36, H = 0.96;
    s.box([W, H - 0.04, D], [0, H / 2 + 0.02, 0], shell);
    s.box([W + 0.02, 0.04, D + 0.02], [0, 0.02, 0], trim);
    s.box([W + 0.01, 0.03, D + 0.01], [0, H - 0.015, 0], trim);
    if (a.cabinet === 'woodgrain') {
      for (let i = 0; i < 12; i++) s.box([W + 0.002, 0.004, D + 0.002], [0, 0.1 + i * 0.07, 0], s.material('#5a3419'));
    }
    // Tap recess, taps, drip tray.
    s.box([W - 0.08, 0.16, 0.08], [0, 0.8, D / 2 - 0.03], dark);
    const tapY = 0.83;
    const tapColour = (i: number) => a.labels === 'none' || a.labels === 'hotter' || a.labels === 'brimstone' ? (i === 0 ? '#c8242a' : '#8a1016') : i === 0 ? '#c8242a' : '#2258b8';
    const tapTips: P[] = [];
    for (const [i, x] of [-0.06, 0.06].entries()) {
      s.box([0.03, 0.03, 0.05], [x, tapY, D / 2 - 0.0], chrome);
      s.cylinder(0.008, 0.01, 0.04, [x, tapY - 0.035, D / 2 + 0.02], chrome, 10);
      s.box([0.035, 0.012, 0.045], [x, tapY + 0.025, D / 2 + 0.02], s.material(tapColour(i), { roughness: 0.4 }));
      tapTips.push([x, tapY - 0.055, D / 2 + 0.02]);
    }
    if (a.labels !== 'none') {
      const words = { hotter: ['HOT', 'HOTTER'], normal: ['HOT', 'COLD'], brimstone: ['FIRE', 'BRIMSTONE'], none: ['', ''] }[a.labels];
      for (const [i, x] of [-0.06, 0.06].entries()) s.label(words[i], 0.085, 0.022, [x, tapY + 0.055, D / 2 + 0.012], i === 0 || a.labels !== 'normal' ? '#9c1414' : '#1f3f9c', '#f3efe2');
    }
    s.box([W - 0.08, 0.02, 0.1], [0, 0.69, D / 2 + 0.03], trim);
    for (let i = 0; i < 9; i++) s.box([0.006, 0.006, 0.09], [-0.11 + i * 0.0275, 0.701, D / 2 + 0.03], dark);

    // ---- Bottle ----
    const glowTint = a.state === 'red' ? new THREE.Color('#ff2a08') : new THREE.Color('#ff7a1a').lerp(new THREE.Color('#ffb060'), mood.warmth * 0.3);
    let waterMat: THREE.MeshStandardMaterial | null = null;
    let bubbleMesh: THREE.InstancedMesh | null = null;
    const bubbleSeeds: number[] = [];
    const bottleBase = H + 0.005;
    if (a.state !== 'empty') {
      s.cylinder(0.075, 0.09, 0.05, [0, H + 0.02, 0], trim, 20);
      const profile: [number, number][] = [[0.045, 0.0], [0.045, 0.05], [0.09, 0.09], [0.13, 0.15], [0.14, 0.22], [0.14, 0.5], [0.13, 0.55], [0.1, 0.58], [0.0, 0.59]];
      const bottleMat = new THREE.MeshPhysicalMaterial({ color: hot ? '#ffd6b0' : '#cfe6ee', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const bottle = s.lathe(profile, bottleMat, [0, bottleBase + 0.03, 0]);
      bottle.castShadow = false;
      const level = { boiling: 0.45, red: 0.4, ordinary: 0.1, full: 0.52, empty: 0 }[a.state] * mix(0.92, 1, random());
      const inner = profile.filter(([, y]) => y < level).map(([r, y]) => [Math.max(0.01, r - 0.008), y] as [number, number]);
      const rAt = (y: number) => { for (let i = 1; i < profile.length; i++) if (profile[i][1] >= y) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; return mix(r0, r1, (y - y0) / Math.max(1e-6, y1 - y0)) - 0.008; } return 0.01; };
      inner.push([rAt(level), level], [0, level]);
      waterMat = hot
        ? new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: a.state === 'red' ? 1.3 : 1.0, transparent: true, opacity: 0.9, roughness: 0.3 })
        : new THREE.MeshStandardMaterial({ color: '#9fd0e4', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
      const water = s.lathe(inner, waterMat, [0, bottleBase + 0.03, 0]);
      water.castShadow = hot;
      if (hot) {
        const haze = s.ball([0.2, 0.3, 0.2], [0, bottleBase + 0.3, 0], new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: mix(0.08, 0.2, mood.cheer * 0.3 + 0.5), depthWrite: false, blending: THREE.AdditiveBlending }), 12);
        haze.castShadow = false;
      }
      if (a.state === 'boiling') {
        const n = 70;
        bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd080', emissiveIntensity: 0.8, transparent: true, opacity: 0.8, depthWrite: false }), n);
        for (let i = 0; i < n; i++) bubbleSeeds.push(random(), random(), random(), random());
        bubbleMesh.castShadow = false;
        bubbleMesh.userData.level = level;
        bubbleMesh.position.y = bottleBase + 0.03;
        s.root.add(bubbleMesh);
      }
      if (a.cracked) {
        const crack = s.material('#3a2a20', { roughness: 0.8 });
        let x = 0.12, y = bottleBase + 0.4, z = 0.08;
        for (let i = 0; i < 7; i++) {
          const t = Math.atan2(z, x) + (random() - 0.5) * 0.4;
          const ny = y - 0.03 - random() * 0.04, r = rAt(ny - bottleBase - 0.03) + 0.01;
          const nx = Math.cos(t) * r, nz = Math.sin(t) * r;
          s.rod([x, y, z], [nx, ny, nz], 0.0025, crack);
          x = nx; y = ny; z = nz;
        }
        const drip = s.material(hot ? glowTint : '#9fd0e4', { emissive: hot ? glowTint : '#000000', emissiveIntensity: hot ? 0.8 : 0, roughness: 0.2 });
        s.rod([x, y, z], [x * 1.0, bottleBase + 0.1, z * 1.0], 0.005, drip, 0.003);
        s.rod([x * 0.9, bottleBase + 0.1, z * 0.9], [x * 1.1, H - 0.02, z * 1.1], 0.004, drip, 0.006);
        s.ball([0.03, 0.006, 0.03], [x * 1.1, H + 0.002, z * 1.1], drip, 10);
      }
    } else {
      s.cylinder(0.075, 0.09, 0.05, [0, H + 0.02, 0], trim, 20);
      s.cylinder(0.04, 0.04, 0.03, [0, H + 0.03, 0], dark, 16);
      const note = s.label('WHO CHANGES THIS?', 0.22, 0.09, [0.02, H - 0.14, D / 2 + 0.003], '#1a3a8c', '#fff6b5');
      note.rotation.z = (random() - 0.5) * 0.25;
      for (const x of [-0.08, 0.08]) s.box([0.035, 0.018, 0.002], [0.02 + x, H - 0.095 - x * 0.1, D / 2 + 0.005], s.material('#d8d0b8', { transparent: true, opacity: 0.75 }));
    }

    // ---- Steam from the taps ----
    const steamMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.4, depthWrite: false });
    const steam: { mesh: THREE.Mesh; base: P; seed: number; size: number }[] = [];
    if (a.state === 'boiling' || (a.state === 'red' && mood.energy > 0.4)) {
      for (const tip of tapTips) for (let i = 0; i < 5; i++) {
        const size = 0.018 + i * 0.008;
        const puff = s.ball([size, size, size], [tip[0], tip[1] + 0.05 + i * 0.06, tip[2] + 0.03 + i * 0.015], steamMat.clone(), 8);
        puff.castShadow = false;
        steam.push({ mesh: puff, base: [tip[0], tip[1] + 0.05, tip[2] + 0.03], seed: random() * 6, size });
      }
    }

    // ---- Cones ----
    const paper = s.material('#f6f3ea', { roughness: 0.9 });
    const sideX = W / 2 + 0.04;
    if (a.cones !== 'gone') {
      s.cylinder(0.04, 0.04, 0.3, [sideX, 0.75, 0.02], new THREE.MeshPhysicalMaterial({ color: '#dfe7ea', transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false }), 16).castShadow = false;
      s.box([0.03, 0.04, 0.06], [sideX - 0.035, 0.85, 0.02], trim);
      s.box([0.03, 0.04, 0.06], [sideX - 0.035, 0.65, 0.02], trim);
      const count = a.cones === 'scattered' ? 3 : 9 + Math.floor(random() * 6);
      for (let i = 0; i < count; i++) s.mesh(new THREE.ConeGeometry(0.035, 0.1, 14, 1, true), paper, [sideX, 0.64 + i * 0.016, 0.02]).rotation.x = Math.PI;
    } else {
      s.box([0.03, 0.04, 0.06], [sideX - 0.035, 0.85, 0.02], trim);
      s.box([0.03, 0.04, 0.06], [sideX - 0.035, 0.65, 0.02], trim);
    }
    if (a.cones === 'melted') {
      const melt = s.material('#f4f0e6', { roughness: 0.4 });
      s.ball([0.07, 0.008, 0.06], [0.2, 0.004, 0.25], melt, 12);
      const stub = s.mesh(new THREE.ConeGeometry(0.03, 0.05, 12), melt, [0.2, 0.02, 0.25]); stub.rotation.z = 1.2; stub.scale.y = 0.5;
    }
    if (a.cones === 'scattered') {
      for (let i = 0; i < 7; i++) {
        const t = random() * Math.PI * 2, r = 0.22 + random() * 0.3;
        const cone = s.mesh(new THREE.ConeGeometry(0.035, 0.1, 10, 1, true), paper, [Math.sin(t) * r, 0.03, 0.1 + Math.cos(t) * r]);
        cone.rotation.set(random() * 3, random() * 3, Math.PI / 2 + (random() - 0.5));
        cone.scale.y = 0.6 + random() * 0.4;
      }
    }

    // ---- Sign-up sheet ----
    if (a.sheet) {
      const board = paint(256, 340, (c, w, h) => {
        c.fillStyle = '#f7f3e6'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1f1f24'; c.textAlign = 'center'; c.font = 'bold 26px sans-serif'; c.fillText('REFILL ROTA', w / 2, 40);
        c.font = '16px sans-serif'; c.fillText('sign up below', w / 2, 64);
        c.strokeStyle = '#8a8a90'; c.lineWidth = 2;
        const names = ['', '', '', '', '', '', '', '', ''];
        const filled = Math.round(mood.density * 4);
        for (let i = 0; i < names.length; i++) {
          const y = 96 + i * 26;
          c.beginPath(); c.moveTo(20, y); c.lineTo(w - 20, y); c.stroke();
          if (i < filled) { c.fillStyle = '#2a3a8c'; c.font = 'italic 18px serif'; c.textAlign = 'left'; c.fillText(['not me', 'someone else', 'NO', 'ask Barb'][i % 4], 26, y - 5); c.textAlign = 'center'; }
        }
      });
      const clip = new THREE.Group();
      clip.position.set(-W / 2 - 0.012, 0.62, 0.02);
      clip.rotation.y = -Math.PI / 2;
      const backing = s.mesh(new THREE.BoxGeometry(0.17, 0.24, 0.008), s.material('#6b4a2a'), [0, 0, 0]);
      const sheet = s.mesh(new THREE.PlaneGeometry(0.15, 0.2), new THREE.MeshStandardMaterial({ map: board, roughness: 0.9 }), [0, -0.01, 0.0045]);
      const clamp = s.box([0.08, 0.025, 0.02], [0, 0.11, 0.006], chrome);
      clip.add(backing, sheet, clamp);
      s.root.add(clip);
      s.rod([-W / 2 - 0.012, 0.74, 0.02], [-W / 2 - 0.012, 0.8, 0.02], 0.004, chrome);
    }

    // ---- Puddle ----
    if (a.puddle > 0.12) {
      const radius = mix(0.12, 0.55, a.puddle);
      const wet = new THREE.MeshStandardMaterial({ color: hot ? '#ffb070' : '#a9c8d8', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, depthWrite: false, emissive: hot ? glowTint : '#000000', emissiveIntensity: hot ? 0.25 : 0 });
      const puddle = s.mesh(new THREE.CircleGeometry(radius, 36), wet, [0.05 + (random() - 0.5) * 0.1, 0.004, 0.12 + random() * 0.1]);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.x = 1.3; puddle.castShadow = false;
      if (a.puddle > 0.7) {
        const face = paint(256, 460, (c, w, h) => {
          c.fillStyle = '#f2c71b'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#1f1f24'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'bold 54px sans-serif'; c.fillText('CAUTION', w / 2, 60);
          c.font = 'bold 48px sans-serif'; c.fillText('WET', w / 2, 330); c.fillText('FLOOR', w / 2, 385);
          // The slipping figure.
          c.lineWidth = 12; c.strokeStyle = '#1f1f24'; c.lineCap = 'round';
          c.beginPath(); c.arc(150, 130, 18, 0, 7); c.fillStyle = '#1f1f24'; c.fill();
          c.beginPath(); c.moveTo(140, 150); c.lineTo(110, 200); c.lineTo(60, 240); c.moveTo(110, 200); c.lineTo(170, 230); c.moveTo(140, 150); c.lineTo(190, 170); c.lineTo(225, 140); c.stroke();
          c.beginPath(); c.moveTo(40, 262); c.quadraticCurveTo(128, 240, 216, 262); c.stroke();
        });
        const leafMat = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 });
        const sign = new THREE.Group();
        sign.position.set(0.5, 0, 0.3); sign.rotation.y = -0.5;
        for (const side of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.008), [leafMat, leafMat, leafMat, leafMat, leafMat, leafMat]);
          leaf.position.set(0, 0.25, side * 0.1);
          leaf.rotation.x = side * 0.38;
          if (side < 0) leaf.rotation.y = Math.PI;
          leaf.castShadow = leaf.receiveShadow = true;
          sign.add(leaf);
        }
        s.root.add(sign);
      }
    }

    const rate = mix(0.5, 2.2, mood.energy);
    const matrix = new THREE.Matrix4();
    return s.finish({
      footprint: 0.3,
      update: (_dt, time) => {
        const t = time * rate;
        if (waterMat && hot) waterMat.emissiveIntensity = (a.state === 'red' ? 1.3 : 1.0) * (0.85 + 0.15 * Math.sin(t * 2.7) * Math.sin(t * 1.3));
        if (bubbleMesh) {
          const level = bubbleMesh.userData.level as number;
          for (let i = 0; i < bubbleMesh.count; i++) {
            const [sx, sz, speed, size] = [bubbleSeeds[i * 4], bubbleSeeds[i * 4 + 1], bubbleSeeds[i * 4 + 2], bubbleSeeds[i * 4 + 3]];
            const y = 0.06 + ((t * (0.08 + speed * 0.12) + sx * 3) % (level - 0.07));
            const r = Math.min(0.12, 0.03 + (y - 0.05) * 0.3) * 0.9;
            const ang = sx * 6.28 + y * 2;
            const radius = 0.004 + size * 0.009 + y * 0.008;
            matrix.makeScale(radius, radius, radius).setPosition(Math.cos(ang) * r * sz, y, Math.sin(ang) * r * sz);
            bubbleMesh.setMatrixAt(i, matrix);
          }
          bubbleMesh.instanceMatrix.needsUpdate = true;
        }
        for (const [i, puff] of steam.entries()) {
          const u = ((t * 0.25 + puff.seed) % 1);
          puff.mesh.position.set(puff.base[0] + Math.sin(t + puff.seed) * 0.02 + u * 0.02, puff.base[1] + u * 0.32, puff.base[2] + u * 0.06);
          puff.mesh.scale.setScalar(puff.size * (0.6 + u * 1.8));
          (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.35 * (1 - u);
          void i;
        }
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const FLASH = {
  violet: { core: '#f1ecff', mid: '#b6a0ff', vein: '#ffffff' },
  amber: { core: '#fff0d0', mid: '#ff9e48', vein: '#fff6e0' },
  green: { core: '#eeffe6', mid: '#86f59a', vein: '#f4fff0' },
  rose: { core: '#fff0f6', mid: '#ff86b6', vein: '#fff4f8' },
} as const;
const CLOUDS = {
  sulfur: { top: '#e0c36c', base: '#9c7d3a' },
  storm: { top: '#9d95aa', base: '#544c60' },
  amber: { top: '#dfa45c', base: '#93602f' },
  mammatus: { top: '#b9a07a', base: '#6a5440' },
} as const;

/** A repeatable flicker: a fresh random value each beat, from the beat number alone. */
const beat = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export default defineThing({
  questions: {
    flash: choice('What does the lightning look like?', {
      spider: 'Spider lightning: bright branching veins crawling outward across a glowing patch of cloud.',
      sheet: 'A broad soft sheet of light, no channel visible, the whole cloud lit from inside.',
      ring: 'A ring of light spreading outward through the deck like a ripple.',
      cluster: 'Several small flashes popping at once in different places, a nervous crackle.',
    }),
    colour: choice('What colour is the light?', {
      violet: 'Cold white-violet, electric.',
      amber: 'Warm amber, filtered through sulphur haze.',
      green: 'A sickly green-white.',
      rose: 'A strange rose pink.',
    }),
    cloud: choice('What is the overcast like?', {
      sulfur: 'A thick sulphur-yellow deck, Venus\'s permanent lid.',
      storm: 'Bruised grey-violet storm cloud.',
      amber: 'A smooth amber deck, heavy and low.',
      mammatus: 'Brown-grey with pouches sagging from its underside.',
    }),
    below: choice('What lies below the cloud?', {
      basalt: 'A dark plain of basalt slabs, untouched by the light.',
      haze: 'Another lower layer of haze: we are high in the cloud world, no ground in sight.',
      ridge: 'A dark ridge line running under the storm.',
      lander: 'A tiny lander on the plain, glinting, alone under the storm.',
    }),
    falling: choice('Is anything falling from the cloud base?', {
      nothing: 'Nothing: dry, silent air below.',
      virga: 'Streaks of acid rain that evaporate halfway down and never land.',
    }),
    height: choice('How high is the cloud base?', {
      low: 'Low and oppressive, a ceiling pressing down on the land.',
      high: 'High above, a far lid on the world.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const flash = FLASH[a.colour], cloud = CLOUDS[a.cloud];
    const Hc = a.height === 'low' ? 260 : 470;
    const groundW = 650, groundD = 480;

    // ---- Below ---------------------------------------------------------------------------------
    const plateH = 14;
    const outline = new THREE.Shape();
    const bumps = [random() * 6, random() * 6];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const wobble = 1 + 0.05 * Math.sin(t * 3 + bumps[0]) + 0.03 * Math.sin(t * 7 + bumps[1]);
      const x = Math.sign(c) * Math.abs(c) ** 0.7 * groundW * wobble, z = Math.sign(sn) * Math.abs(sn) ** 0.7 * groundD * wobble;
      i ? outline.lineTo(x, -z) : outline.moveTo(x, -z);
    }
    outline.closePath();
    const plate = new THREE.ExtrudeGeometry(outline, { depth: plateH, bevelEnabled: false });
    plate.rotateX(-Math.PI / 2);
    const haze = a.below === 'haze';
    const groundTone = haze ? new THREE.Color(cloud.base).lerp(new THREE.Color('#d8c08a'), 0.35) : new THREE.Color('#3e342c').lerp(new THREE.Color('#5a4030'), mood.warmth * 0.5);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const g = canvas.getContext('2d')!;
    g.fillStyle = groundTone.getStyle();
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = random() < 0.5 ? 'rgba(255,240,210,0.06)' : 'rgba(0,0,0,0.1)';
      const w = 4 + random() * 22;
      g.fillRect(random() * 512, random() * 512, w, w * (haze ? 0.3 : 0.6));
    }
    if (!haze) {
      g.strokeStyle = 'rgba(10,8,6,0.5)';
      for (let i = 0; i < 40; i++) { g.lineWidth = 1 + random() * 2; g.beginPath(); let x = random() * 512, y = random() * 512; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    }
    const groundMap = new THREE.CanvasTexture(canvas);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping;
    groundMap.repeat.set(1 / 650, 1 / 650);
    s.mesh(plate, [new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }), new THREE.MeshStandardMaterial({ color: groundTone.clone().multiplyScalar(0.6), roughness: 1 })] as unknown as THREE.Material);
    if (haze) {
      const puffs = Array.from({ length: 70 }, () => {
        const t = random() * Math.PI * 2, r = Math.sqrt(random());
        return { at: [Math.cos(t) * r * groundW * 0.85, plateH + 4, Math.sin(t) * r * groundD * 0.85] as P3, size: mix(70, 130, random()) };
      });
      const lower = s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material(groundTone.clone().offsetHSL(0, -0.05, 0.08), { roughness: 1 }), puffs);
      const matrix = new THREE.Matrix4();
      puffs.forEach((puff, i) => lower.setMatrixAt(i, matrix.makeScale(puff.size, puff.size * 0.22, puff.size * 0.85).setPosition(...puff.at)));
      lower.instanceMatrix.needsUpdate = true;
    } else if (a.below === 'ridge') {
      const rock = s.material('#2c2520', { roughness: 0.95, flatShading: true });
      const peaks = Array.from({ length: 22 }, (_unused, i) => {
        const x = -groundW * 0.85 + (i / 21) * groundW * 1.7, z = -groundD * 0.15 + Math.sin(i * 0.5) * 60;
        return { at: [x, plateH, z] as P3, size: mix(45, 110, random()) * (1 - Math.abs(i - 10.5) / 16) };
      });
      const ridge = s.scatter(new THREE.ConeGeometry(1, 1.2, 5), rock, peaks);
      ridge.castShadow = true;
    } else if (a.below === 'lander') {
      const white = s.material('#e8e4d8', { metalness: 0.3, roughness: 0.5 });
      const at: P3 = [groundW * 0.28, plateH, groundD * 0.55];
      s.ring(9, 2.2, [at[0], at[1] + 2.2, at[2]], white).rotation.x = Math.PI / 2;
      s.ball([5.5, 5.5, 5.5], [at[0], at[1] + 9, at[2]], white, 14);
      s.cylinder(9, 9, 1.4, [at[0], at[1] + 15, at[2]], white, 18);
      s.cylinder(3, 3, 5, [at[0], at[1] + 18.5, at[2]], white, 10);
    }

    // ---- The flash centres --------------------------------------------------------------------------
    const centres: { x: number; z: number; r: number }[] = [];
    if (a.flash === 'cluster') {
      for (let i = 0; i < 3 + Math.floor(random() * 2); i++) centres.push({ x: (random() - 0.5) * 760, z: -80 + (random() - 0.5) * 380, r: mix(110, 170, random()) });
    } else {
      centres.push({ x: (random() - 0.5) * 160, z: -70 + (random() - 0.5) * 80, r: a.flash === 'sheet' ? 380 : a.flash === 'ring' ? 330 : 270 });
    }
    const nearness = (x: number, z: number) => {
      let best = Infinity;
      for (const c of centres) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        best = Math.min(best, a.flash === 'ring' ? Math.abs(d - 0.75) * 2.2 : d);
      }
      return best;
    };

    // ---- Cloud deck: lumps sorted into tiers by how close they sit to the flash ---------------------------
    const tiers = [
      { mat: new THREE.MeshStandardMaterial({ color: flash.core, emissive: flash.core, emissiveIntensity: 1, roughness: 1 }), peak: 1.15, items: [] as THREE.Matrix4[] },
      { mat: new THREE.MeshStandardMaterial({ color: new THREE.Color(cloud.top).lerp(new THREE.Color(flash.mid), 0.5), emissive: flash.mid, emissiveIntensity: 0.6, roughness: 1 }), peak: 0.7, items: [] as THREE.Matrix4[] },
      { mat: new THREE.MeshStandardMaterial({ color: new THREE.Color(cloud.top).lerp(new THREE.Color(flash.mid), 0.2), emissive: flash.mid, emissiveIntensity: 0.22, roughness: 1 }), peak: 0.28, items: [] as THREE.Matrix4[] },
      { mat: new THREE.MeshStandardMaterial({ color: cloud.top, roughness: 1 }), peak: 0, items: [] as THREE.Matrix4[] },
      { mat: new THREE.MeshStandardMaterial({ color: new THREE.Color(cloud.top).lerp(new THREE.Color(cloud.base), 0.55), roughness: 1 }), peak: 0, items: [] as THREE.Matrix4[] },
    ];
    const quaternion = new THREE.Quaternion();
    const tops: { x: number; z: number; y: number }[] = [];
    const addLump = (x: number, y: number, z: number, r: number, squash: number, belly = false) => {
      const sy = r * squash;
      tops.push({ x, z, y: y + sy * 0.9 });
      const near = nearness(x, z);
      const tier = near < 0.45 ? 0 : near < 0.8 ? 1 : near < 1.2 ? 2 : belly ? 4 : 3;
      tiers[tier].items.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), quaternion.setFromEuler(new THREE.Euler(0, random() * 6, 0)), new THREE.Vector3(r, sy, r * mix(0.8, 1, random()))));
    };
    // A dense base layer reaching past the deck's dark underside, then billows heaped toward the middle.
    const baseCount = Math.round(mix(90, 130, mood.density));
    for (let i = 0; i < baseCount; i++) {
      const t = random() * Math.PI * 2, rr = Math.sqrt(random()) * 1.02;
      const r = mix(55, 105, random());
      addLump(Math.cos(t) * rr * 600, Hc + r * 0.18, -60 + Math.sin(t) * rr * 380, r, mix(0.5, 0.65, random()), true);
    }
    const heapCount = Math.round(mix(40, 75, mood.density));
    for (let i = 0; i < heapCount; i++) {
      const t = random() * Math.PI * 2, rr = Math.sqrt(random()) * 0.78;
      const r = mix(80, 150, random()) * (1 - rr * 0.4);
      addLump(Math.cos(t) * rr * 600, Hc + 50 + random() * 70 * (1 - rr), -60 + Math.sin(t) * rr * 380, r, mix(0.6, 0.8, random()));
    }
    const lump = new THREE.IcosahedronGeometry(1, 2);
    for (const tier of tiers) {
      if (!tier.items.length) continue;
      const mesh = new THREE.InstancedMesh(lump, tier.mat, tier.items.length);
      tier.items.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    // The flat dark underside of the deck.
    const underside = s.ball([520, 30, 320], [0, Hc - 2, -60], s.material(cloud.base, { roughness: 1 }), 36);
    underside.castShadow = true;
    if (a.cloud === 'mammatus') {
      const pouches = Array.from({ length: 40 }, () => {
        const t = random() * Math.PI * 2, rr = Math.sqrt(random()) * 0.92;
        return { at: [Math.cos(t) * rr * 560, Hc - 10, -60 + Math.sin(t) * rr * 370] as P3, size: mix(30, 55, random()) };
      });
      s.scatter(new THREE.SphereGeometry(1, 12, 8), s.material(cloud.base, { roughness: 1 }), pouches);
    }

    // ---- Veins crawling across the lit cloud top -------------------------------------------------------------
    const veinMat = new THREE.MeshStandardMaterial({ color: flash.vein, emissive: flash.vein, emissiveIntensity: 2.2, roughness: 1 });
    const topAt = (x: number, z: number) => {
      let best = Hc + 40, weight = 0;
      for (const top of tops) {
        const d = Math.hypot(top.x - x, top.z - z);
        if (d < 110) { const w = 1 - d / 110; best = weight ? Math.max(best, top.y * w + (Hc + 40) * (1 - w)) : top.y * w + (Hc + 40) * (1 - w); weight += w; }
      }
      return best + 6;
    };
    const vein = (from: [number, number], angle: number, length: number, depth: number, radius: number) => {
      const points: P3[] = [];
      let [x, z] = from, heading = angle;
      const steps = 7;
      for (let i = 0; i <= steps; i++) {
        points.push([x, topAt(x, z), z]);
        heading += (random() - 0.5) * 0.9;
        x += Math.cos(heading) * length / steps; z += Math.sin(heading) * length / steps;
      }
      s.tube(points, radius, veinMat).castShadow = false;
      if (depth > 0) for (let k = 0; k < 2; k++) {
        const p = points[2 + Math.floor(random() * 4)];
        vein([p[0], p[2]], heading + (random() - 0.5) * 2, length * 0.5, depth - 1, radius * 0.6);
      }
    };
    if (a.flash === 'spider') {
      const c = centres[0];
      for (let i = 0; i < 5; i++) vein([c.x, c.z], (i / 5) * Math.PI * 2 + random(), c.r * mix(1.1, 1.6, random()), 2, 11);
    } else if (a.flash === 'cluster') {
      for (const c of centres) for (let i = 0; i < 2; i++) vein([c.x, c.z], random() * 6, c.r * 0.9, 1, 8);
    } else if (a.flash === 'ring') {
      const c = centres[0];
      for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2; vein([c.x + Math.cos(t) * c.r * 0.7, c.z + Math.sin(t) * c.r * 0.7], t + Math.PI / 2, c.r * 0.55, 0, 8); }
    }
    // A soft bloom over each centre and a faint wash on what lies below, never a channel to it.
    const bloomTexture = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const b = c.getContext('2d')!;
      const gradient = b.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(a.flash === 'ring' ? 0.55 : 0.3, `rgba(255,255,255,${a.flash === 'ring' ? 0.25 : 0.55})`);
      if (a.flash === 'ring') gradient.addColorStop(0.75, 'rgba(255,255,255,0.7)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      b.fillStyle = gradient;
      b.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const bloom = new THREE.MeshBasicMaterial({ map: bloomTexture, color: flash.mid, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const c of centres) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(c.r * 1.25, 40), bloom);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(c.x, topAt(c.x, c.z) + 30, c.z);
      s.root.add(disc);
    }
    const wash = new THREE.MeshBasicMaterial({ map: bloomTexture, color: flash.mid, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
    const washDisc = new THREE.Mesh(new THREE.CircleGeometry(groundW * 0.75, 40), wash);
    washDisc.rotation.x = -Math.PI / 2;
    washDisc.position.set(centres[0].x * 0.5, plateH + (haze ? 40 : 1.5), groundD * 0.35);
    s.root.add(washDisc);

    // ---- Virga: streaks that give up halfway --------------------------------------------------------------------
    if (a.falling === 'virga') {
      const streak = new THREE.MeshStandardMaterial({ color: new THREE.Color(cloud.base).lerp(new THREE.Color('#ffffff'), 0.25), transparent: true, opacity: 0.35, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 26; i++) {
        const x = (random() - 0.5) * 1000, z = 120 + random() * 160, length = Hc * mix(0.25, 0.5, random());
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4, 9, length, 6, 1, true), streak);
        shaft.position.set(x, Hc - length / 2, z);
        shaft.rotation.z = 0.12;
        s.root.add(shaft);
      }
    }

    // ---- Flicker, quicker and harder with energy -----------------------------------------------------------------
    const rate = mix(1.2, 7, mood.energy);
    const bases = tiers.map((tier) => tier.peak);
    const setLight = (time: number) => {
      const n = Math.floor(time * rate), phase = time * rate - n;
      const strike = beat(n) > 0.45 ? Math.exp(-phase * 5) : 0.15 * beat(n + 7);
      const level = 0.55 + 0.75 * strike;
      tiers.forEach((tier, i) => { if (bases[i]) tier.mat.emissiveIntensity = bases[i] * level; });
      veinMat.emissiveIntensity = 0.6 + 2.6 * strike;
      bloom.opacity = 0.3 + 0.45 * strike;
      wash.opacity = 0.08 + 0.2 * strike;
    };
    setLight(0.05);
    return s.finish({
      footprint: groundW * 0.8,
      update(_dt, time) { setLight(time); },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STONES = {
  carrara: 'White marble with soft grey veins, clean and imperial.',
  porphyry: 'Deep purple-red porphyry flecked with pale crystals, an emperor\'s stone.',
  granite: 'Speckled grey granite, heavy and plain, hauled from Egypt.',
  serpentine: 'Dark green serpentine with pale threads, cool and mossy looking.',
  giallo: 'Honey-yellow Numidian marble with rust veins, sunny and expensive.',
  travertine: 'Pitted cream travertine, the cheap local stone of a provincial bath.',
} as const;
const STONE_PAINT: Record<keyof typeof STONES, [string, string]> = {
  carrara: ['#e9e6de', '#8f9299'], porphyry: ['#7a3048', '#d9b7c0'], granite: ['#9a9a97', '#3d3f42'],
  serpentine: ['#3f6a52', '#b9d3bd'], giallo: ['#dcb061', '#a4552c'], travertine: ['#d9cdb2', '#9c8a68'],
};

function stoneTexture(random: () => number, base: string, vein: string, speckled: boolean, grime: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  if (speckled) {
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = random() < 0.6 ? vein : '#ffffff';
      ctx.globalAlpha = 0.25 + random() * 0.45;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2.5, 1 + random() * 2.5);
    }
  } else {
    ctx.strokeStyle = vein;
    for (let i = 0; i < 16; i++) {
      ctx.globalAlpha = 0.18 + random() * 0.4;
      ctx.lineWidth = 0.6 + random() * 2.2;
      ctx.beginPath();
      let x = random() * 256, y = -10;
      ctx.moveTo(x, y);
      while (y < 266) { x += (random() - 0.5) * 46; y += 12 + random() * 26; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < grime * 46; i++) {
    const x = random() * 256, y = random() * 256, r = 10 + random() * 34;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = random() < 0.5 ? '70,84,48' : '74,58,40';
    stain.addColorStop(0, `rgba(${tone},${0.3 + grime * 0.35})`);
    stain.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = stain;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

/** A column drum with concave flutes cut round it. */
function fluted(top: number, bottom: number, height: number, flutes: number, depth: number, twist = 0) {
  const geometry = new THREE.CylinderGeometry(top, bottom, height, flutes * 6, 8);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const angle = Math.atan2(z, x) + twist * (y / height);
    const k = 1 - depth * Math.abs(Math.sin(angle * flutes / 2)) ** 0.7;
    p.setXYZ(i, x * k, y, z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    stone: choice('What stone is the basin cut from?', STONES),
    water: choice('What is in the basin right now?', {
      full: 'Filled with clear still water nearly to the rim.',
      brimming: 'Brimming over: water sheets off the rim in thin streams and pools round the foot.',
      low: 'A shallow stagnant green puddle left in the bottom.',
      dry: 'Bone dry, a bare stone bowl.',
      leaves: 'Dry and filled with drifted dead leaves and grit.',
    }),
    pedestal: choice('What does the bowl stand on?', {
      fluted: 'A slender fluted column shaft with a moulded base.',
      spiral: 'A column with flutes that twist round it like rope.',
      baluster: 'A swelling vase-shaped baluster, turned like a chess piece.',
      drum: 'A squat thick drum, low and heavy, the bowl at hip height.',
      block: 'A square block plinth with a recessed inscription panel.',
    }),
    centre: choice('What rises from the middle of the bowl?', {
      plain: 'Nothing; a smooth empty bowl.',
      boss: 'A low rounded stone boss, like the navel of a shield.',
      jet: 'A short bronze pipe bubbling a low dome of water.',
      pinecone: 'A bronze pine cone fountain finial, green with age.',
    }),
    rim: choice('How is the rim finished?', {
      rolled: 'A plain fat rolled lip.',
      beaded: 'A row of carved beads running round the lip.',
      gadrooned: 'Fat lobes fluting the underside of the bowl like a scallop shell.',
    }),
    story: choice('What has happened to it?', {
      tended: 'In daily use and looked after; nothing out of place.',
      bather: 'Someone was just here: a bronze dipper rests on the rim and a towel hangs over it.',
      offerings: 'People have thrown coins into it for luck.',
      mended: 'It split long ago and was stitched back together with iron clamps.',
      broken: 'A wedge has broken out of the bowl and lies in pieces at its foot.',
      overgrown: 'Left outdoors for centuries: ivy climbs the pedestal and moss furs the rim.',
    }),
    size: score('How big is it?', ['A modest washstand', 'A public bath basin a few people can share', 'A monumental bowl wider than a person is tall']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const [base, vein] = STONE_PAINT[a.stone];
    const grime = Math.min(1, wear * 0.8 + (a.story === 'overgrown' ? 0.45 : 0));
    const map = stoneTexture(random, base, vein, a.stone === 'granite' || a.stone === 'porphyry' || a.stone === 'travertine', grime);
    const stone = new THREE.MeshStandardMaterial({ map, roughness: mix(0.28, 0.85, wear), side: THREE.DoubleSide });
    const bronze = s.material(mix(0xb07a3a, 0x4f8a72, Math.min(1, wear * 1.2)) | 0, { metalness: 0.7, roughness: 0.4 });
    bronze.color.set(new THREE.Color('#b9823c').lerp(new THREE.Color('#4f8f78'), Math.min(1, wear * 1.1)));
    const iron = s.material('#3a2e28', { metalness: 0.5, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 });
    const waterTint = new THREE.Color(a.water === 'low' ? '#6f8a4a' : '#8fc4c9').lerp(new THREE.Color('#7f8f5a'), wear * 0.5);
    const water = new THREE.MeshStandardMaterial({ color: waterTint, roughness: 0.08, metalness: 0.15, transparent: true, opacity: a.water === 'low' ? 0.92 : 0.8 });
    const moss = s.material('#5d7a3a', { roughness: 1 });

    const R = mix(0.45, 1.15, a.size);
    const low = a.pedestal === 'drum';
    const rimY = low ? mix(0.7, 0.85, a.size) : mix(0.9, 1.15, a.size);
    const D = R * 0.3;
    const broken = a.story === 'broken';
    const gapAt = 0.5 + random() * 1.2, gap = broken ? 0.55 + random() * 0.4 : 0;

    // The bowl: a closed profile turned on the lathe, with a wedge left out when broken.
    const profile: [number, number][] = [
      [0.001, -0.78], [0.2, -0.78], [0.24, -0.7], [0.5, -0.62], [0.82, -0.36], [0.97, -0.12], [1.03, -0.05], [1.045, 0],
      [1.02, 0.045], [0.97, 0.03], [0.93, -0.03], [0.8, -0.22], [0.5, -0.44], [0.2, -0.52], [0.001, -0.53],
    ];
    const pts = profile.map(([x, y]) => new THREE.Vector2(x * R, rimY + y * D));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 56, gapAt + gap, Math.PI * 2 - gap), stone);
    bowl.castShadow = bowl.receiveShadow = true;
    s.root.add(bowl);
    if (broken) {
      const raw = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).lerp(new THREE.Color('#ffffff'), 0.25), roughness: 1, side: THREE.DoubleSide });
      for (const phi of [gapAt, gapAt + gap]) {
        const cap = s.mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), raw);
        cap.rotation.y = phi - Math.PI / 2;
      }
      for (let i = 0; i < 4; i++) {
        const angle = gapAt + gap * (0.1 + 0.8 * random()), d = R * (0.75 + random() * 0.55);
        const shard = s.mesh(new THREE.DodecahedronGeometry(R * (0.06 + random() * 0.09), 0), stone, [Math.sin(angle) * d, 0.03, Math.cos(angle) * d]);
        shard.scale.set(1.5, 0.45, 1); shard.rotation.set(random(), random() * 3, random() * 0.6);
      }
    }
    const inner = (t: number): [number, number] => { // radius and height on the inside of the bowl
      const r = t * 0.93;
      return [r * R, rimY + D * (-0.53 + 0.5 * Math.max(0, (r - 0.2) / 0.73) ** 1.7)];
    };
    const polar = (angle: number, r: number, y: number): [number, number, number] => [Math.sin(angle) * r, y, Math.cos(angle) * r];

    if (a.rim === 'beaded') {
      const beads = Math.round(R * 60);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), stone, Array.from({ length: beads }, (_u, i) => i / beads * Math.PI * 2)
        .filter((angle) => !broken || ((angle - gapAt + Math.PI * 4) % (Math.PI * 2)) > gap)
        .map((angle) => ({ at: polar(angle, R * 1.045, rimY), size: R * 0.034 })));
    } else if (a.rim === 'gadrooned') {
      const lobes = 22;
      for (let i = 0; i < lobes; i++) {
        const angle = i / lobes * Math.PI * 2;
        if (broken && ((angle - gapAt + Math.PI * 4) % (Math.PI * 2)) < gap) continue;
        const lobe = s.ball([R * 0.085, D * 0.3, R * 0.3], polar(angle, R * 0.68, rimY - D * 0.43), stone, 10);
        lobe.rotation.order = 'YXZ'; lobe.rotation.y = angle; lobe.rotation.x = -0.62;
      }
    }

    // Pedestal.
    const neck = rimY - D * 0.78;
    const foot = Math.max(0.2, R * 0.42);
    if (a.pedestal === 'fluted' || a.pedestal === 'spiral') {
      const h = neck - 0.16;
      s.mesh(fluted(foot * 0.42, foot * 0.52, h, 14, 0.12, a.pedestal === 'spiral' ? 2.6 : 0), stone, [0, 0.16 + h / 2, 0]);
      s.cylinder(foot * 0.95, foot, 0.07, [0, 0.035, 0], stone, 32);
      s.ring(foot * 0.62, 0.05, [0, 0.11, 0], stone).rotation.x = Math.PI / 2;
      s.ring(foot * 0.46, 0.035, [0, neck - 0.02, 0], stone).rotation.x = Math.PI / 2;
    } else if (a.pedestal === 'baluster') {
      const h = neck;
      s.lathe([[foot, 0], [foot, 0.05], [foot * 0.6, 0.09], [foot * 0.35, h * 0.2], [foot * 0.7, h * 0.42], [foot * 0.72, h * 0.52], [foot * 0.3, h * 0.82], [foot * 0.34, h * 0.9], [foot * 0.55, h]], stone);
    } else if (a.pedestal === 'drum') {
      s.mesh(fluted(R * 0.5, R * 0.56, neck - 0.08, 20, 0.07), stone, [0, 0.08 + (neck - 0.08) / 2, 0]);
      s.cylinder(R * 0.62, R * 0.66, 0.08, [0, 0.04, 0], stone, 36);
      s.ring(R * 0.53, 0.04, [0, neck - 0.03, 0], stone).rotation.x = Math.PI / 2;
    } else {
      const w = foot * 1.25;
      s.box([w * 1.25, 0.1, w * 1.25], [0, 0.05, 0], stone);
      s.box([w, neck - 0.16, w], [0, 0.1 + (neck - 0.16) / 2, 0], stone);
      s.box([w * 1.2, 0.06, w * 1.2], [0, neck - 0.03, 0], stone);
      const plate = s.label(['AQVA', 'SALVE', 'BENE LAVA', 'D M'][Math.floor(random() * 4)], w * 0.78, (neck - 0.2) * 0.4, [0, neck * 0.55, w / 2 + 0.004], '#4a4039', base);
      plate.castShadow = false;
    }

    // Water and what is in the bowl.
    const wet = a.water === 'full' || a.water === 'brimming' || a.water === 'low';
    const level = a.water === 'brimming' ? 0.99 : a.water === 'full' ? 0.9 : 0.42;
    const [surfaceR, surfaceY] = inner(level);
    const ripples: THREE.Mesh[] = [];
    if (wet) {
      const disc = s.mesh(new THREE.CircleGeometry(surfaceR, 48, gapAt + gap + Math.PI / 2, Math.PI * 2 - gap), water, [0, surfaceY - (a.water === 'brimming' ? -0.012 : 0.004), 0]);
      disc.rotation.x = -Math.PI / 2;
      disc.castShadow = false;
      if (broken) disc.visible = a.water === 'low';
      if (disc.visible && a.water !== 'low') {
        const pale = new THREE.MeshBasicMaterial({ color: '#eefaf9', transparent: true, opacity: 0.55, depthWrite: false });
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 48), pale);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, surfaceY + 0.018, 0);
          ring.userData.phase = i / 3;
          s.root.add(ring);
          ripples.push(ring);
        }
      }
    }
    if (a.water === 'brimming' && !broken) {
      const streams = 5 + Math.floor(random() * 5);
      for (let i = 0; i < streams; i++) {
        const angle = random() * Math.PI * 2, r = R * 1.05;
        s.tube([polar(angle, r * 0.97, rimY + 0.03), polar(angle, r * 1.02, rimY - 0.02), polar(angle, r * 1.03, rimY * 0.5), polar(angle, r * 1.03, 0.01)], 0.008 + random() * 0.012, water);
        s.cylinder(0.1 + random() * 0.12, 0.12, 0.008, polar(angle, r * 1.03, 0.004), water, 18).castShadow = false;
      }
      const pool = s.cylinder(R * 1.25, R * 1.3, 0.006, [0, 0.003, 0], water, 40);
      pool.scale.z = 0.86 + random() * 0.2; pool.castShadow = false;
    }
    if (a.water === 'leaves' || (a.water === 'dry' && wear > 0.55)) {
      const litter = Math.round(mix(14, 60, mood.density));
      s.scatter(new THREE.CircleGeometry(1, 5), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), Array.from({ length: a.water === 'leaves' ? litter : 8 }, () => {
        const t = Math.sqrt(random()) * 0.8, angle = random() * Math.PI * 2;
        const [r, y] = inner(t);
        return { at: polar(angle, r, y + 0.012 + random() * 0.03), size: R * (0.03 + random() * 0.035), color: ['#8a5a2b', '#a9772f', '#5e4526', '#b08c3e'][Math.floor(random() * 4)] };
      })).rotation.x = 0;
      if (a.water === 'leaves') { const [r, y] = inner(0.55); const bed = s.cylinder(r, r * 0.3, 0.02, [0, y - 0.01, 0], s.material('#6a5334', { roughness: 1 }), 28); bed.castShadow = false; }
    }

    if (a.centre === 'boss') s.ball([R * 0.16, D * 0.28, R * 0.16], [0, rimY - D * 0.53, 0], stone);
    if (a.centre === 'jet') {
      s.cylinder(0.018, 0.026, D * 0.75, [0, rimY - D * 0.53 + D * 0.37, 0], bronze, 12);
      if (wet) { const dome = s.ball([0.07, 0.05, 0.07], [0, rimY + D * 0.25, 0], water, 12); dome.userData.phase = 0.5; ripples.push(dome); dome.userData.dome = true; }
    }
    if (a.centre === 'pinecone') {
      const y0 = rimY - D * 0.53, h = R * 0.36;
      s.cylinder(R * 0.05, R * 0.09, D * 0.5, [0, y0 + D * 0.25, 0], bronze, 12);
      s.lathe([[0.001, 0], [R * 0.1, h * 0.12], [R * 0.115, h * 0.38], [R * 0.08, h * 0.75], [0.001, h]], bronze, [0, y0 + D * 0.45, 0]);
      const scales: { at: [number, number, number]; size: number }[] = [];
      for (let row = 0; row < 6; row++) for (let i = 0; i < 9; i++) {
        const t = (row + 0.5) / 6.5, rr = R * 0.115 * Math.sin(Math.PI * (0.15 + t * 0.8)) ** 0.8;
        scales.push({ at: polar(i / 9 * Math.PI * 2 + row * 0.35, rr, y0 + D * 0.45 + h * t), size: R * 0.026 });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), bronze, scales);
    }

    // The story.
    if (a.story === 'bather') {
      const angle = 0.6 + random() * 0.8;
      const at = polar(angle, R * 0.99, rimY + 0.055);
      const pan = s.lathe([[0.001, 0], [0.07, 0], [0.1, 0.035], [0.105, 0.035], [0.074, 0.006]], bronze, at);
      pan.material = new THREE.MeshStandardMaterial({ color: bronze.color, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
      s.rod(polar(angle, R * 0.99 + 0.09, rimY + 0.08), polar(angle, R * 0.99 + 0.3, rimY + 0.07), 0.012, bronze, 0.016);
      const cloth = s.material(mood.cheer > 0.5 ? '#e8dcc0' : '#b9b0a0', { roughness: 1, side: THREE.DoubleSide });
      const ta = angle - 1.7 - random() * 0.6, w = 0.34;
      const towel = new THREE.PlaneGeometry(w, R * 0.34 + 0.5, 6, 10);
      const tp = towel.attributes.position;
      for (let i = 0; i < tp.count; i++) {
        const v = tp.getY(i) / (R * 0.34 + 0.5) + 0.5; // 0 hanging end, 1 inside the bowl
        const u = tp.getX(i);
        const out = v < 0.6 ? R * 1.07 + 0.01 * Math.sin(u * 30) : R * (1.07 - (v - 0.6) * 0.5);
        const y = v < 0.6 ? rimY + 0.05 - (0.6 - v) * 0.85 : rimY + 0.05 - (v - 0.6) * D * 0.4;
        tp.setXYZ(i, u, y, out);
      }
      towel.computeVertexNormals();
      s.mesh(towel, cloth).rotation.y = ta;
    }
    if (a.story === 'offerings') {
      const coins = Math.round(mix(12, 55, mood.density));
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 10), s.material('#c9a24a', { metalness: 0.8, roughness: 0.35 }), Array.from({ length: coins }, () => {
        const [r, y] = inner(Math.sqrt(random()) * 0.6);
        return { at: polar(random() * Math.PI * 2, r, y + 0.006), size: 0.014 + random() * 0.008, color: random() < 0.3 ? '#9aa3a0' : random() < 0.5 ? '#a8733a' : '#d6b04e' };
      }));
      for (let i = 0; i < 4; i++) s.cylinder(0.018, 0.018, 0.004, polar(random() * 6.3, R * (1.15 + random() * 0.4), 0.002), bronze, 10);
    }
    const crackCount = (a.story === 'mended' ? 2 : 0) + (broken ? 2 : 0) + Math.floor(wear * 3.2);
    for (let c = 0; c < crackCount; c++) {
      let angle = random() * Math.PI * 2;
      if (broken) angle = gapAt + gap + 0.3 + random() * (Math.PI * 2 - gap - 0.6);
      const insidePath: [number, number, number][] = [], outsidePath: [number, number, number][] = [];
      const reach = 0.35 + random() * 0.5;
      for (let i = 0; i <= 7; i++) {
        const t = 1.07 - (i / 7) * reach;
        const wander = angle + Math.sin(i * 1.7 + c) * 0.05 + (random() - 0.5) * 0.04;
        const [r, y] = inner(Math.min(t, 1.0));
        insidePath.push(polar(wander, r + (i === 0 ? R * 0.06 : 0), y + 0.004 + (i < 2 ? D * 0.06 : 0)));
        const ot = 1.045 - (i / 7) * reach * 0.8;
        outsidePath.push(polar(wander, R * ot + 0.004, rimY + D * (-0.78 + 0.78 * Math.max(0, (ot - 0.2) / 0.845) ** 2.2)));
      }
      s.tube(insidePath, R * 0.006, dark).castShadow = false;
      s.tube(outsidePath, R * 0.006, dark).castShadow = false;
      if (a.story === 'mended' && c < 2) for (const k of [1, 3, 5]) {
        const [x, y, z] = outsidePath[k];
        const clamp = s.box([R * 0.16, R * 0.022, R * 0.03], [x * 1.012, y, z * 1.012], iron);
        clamp.lookAt(x * 3, y - R * 0.9, z * 3); clamp.rotateZ(0);
        const rust = s.ball([R * 0.05, R * 0.11, R * 0.02], [x * 1.005, y - R * 0.07, z * 1.005], s.material('#8a4a25', { roughness: 1 }), 8);
        rust.lookAt(x * 3, y - R * 0.9, z * 3);
      }
    }
    const green = (a.story === 'overgrown' ? 0.7 : 0) + Math.max(0, wear - 0.45) * 1.1;
    if (green > 0.05) {
      const tufts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < green * 70; i++) {
        const angle = random() * Math.PI * 2;
        const where = random();
        const at = where < 0.5 ? polar(angle, R * (0.98 + random() * 0.07), rimY + 0.02 - random() * 0.05) : polar(angle, foot * (0.6 + random() * 0.5), random() * 0.14);
        tufts.push({ at, size: 0.02 + random() * 0.035, color: random() < 0.5 ? '#5f7d36' : '#7f8f3a' });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), moss, tufts);
    }
    if (a.story === 'overgrown') {
      const leaf = new THREE.MeshStandardMaterial({ color: '#3f6b33', roughness: 0.9, side: THREE.DoubleSide });
      const leaves: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let vine = 0; vine < 3; vine++) {
        const start = random() * Math.PI * 2, path: [number, number, number][] = [];
        const top = neck * (0.6 + random() * 0.4);
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, angle = start + t * (1.5 + random() * 0.4);
          const r = (a.pedestal === 'drum' ? R * 0.57 : a.pedestal === 'block' ? foot * 0.92 : foot * (0.56 - 0.1 * t)) + 0.012;
          path.push(polar(angle, r, t * top));
          for (let k = 0; k < 2; k++) leaves.push({ at: polar(angle + (random() - 0.5) * 0.3, r + 0.02, t * top + (random() - 0.5) * 0.08), size: 0.035 + random() * 0.03, color: random() < 0.5 ? '#3f6b33' : '#58803a' });
        }
        s.tube(path, 0.008, s.material('#4a3a26'));
      }
      s.scatter(new THREE.TetrahedronGeometry(1, 0), leaf, leaves);
    }

    const pace = mix(0.08, 0.7, mood.energy);
    return s.finish({
      update: ripples.length ? (_dt, time) => {
        for (const ring of ripples) {
          const t = (time * pace + ring.userData.phase) % 1;
          if (ring.userData.dome) ring.scale.set(0.07 * (1 + 0.15 * Math.sin(time * 9)), 0.05 * (1 + 0.3 * Math.sin(time * 13)), 0.07);
          else ring.scale.setScalar(Math.max(0.02, t * surfaceR * 0.92));
        }
      } : undefined,
    });
  },
});

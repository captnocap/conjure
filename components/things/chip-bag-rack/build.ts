import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const FAMILIES = {
  fiery: 'Fiery reds and flame orange: extra-hot chili, tongue-staining dust.',
  ranch: 'Cool ranch blues and icy teal.',
  lime: 'Lime greens and acid yellow-green: chili-lime, jalapeno.',
  plain: 'Plain salted yellows and gold, the honest original.',
  smoke: 'Barbecue browns, burnt orange and a sweet-heat purple.',
  rainbow: 'Every colour at once, a clashing wall of everything.',
} as const;
type Family = Exclude<keyof typeof FAMILIES, 'rainbow'>;
interface Brand { name: string; tag: string; base: string; deep: string; ink: string }
const BRANDS: Record<Family, Brand[]> = {
  fiery: [
    { name: 'BLAZO', tag: 'XTRA HOT', base: '#e01b22', deep: '#7c0a12', ink: '#ffe21a' },
    { name: 'INFERNOHS', tag: 'FLAMIN', base: '#f4601c', deep: '#b32208', ink: '#fff3c9' },
    { name: 'HOT TAKES', tag: 'GHOST CHILI', base: '#2a0d10', deep: '#b3121c', ink: '#ff5a1f' },
  ],
  ranch: [
    { name: 'RANCHEROS', tag: 'COOL RANCH', base: '#1d5fd0', deep: '#0c2c7a', ink: '#ffffff' },
    { name: 'COOL HAND', tag: 'SOUR CREAM', base: '#2bb0de', deep: '#126a9c', ink: '#fdfde6' },
    { name: 'BLU MOON', tag: 'ZESTY', base: '#1b2f8a', deep: '#0a123f', ink: '#9fe6ff' },
  ],
  lime: [
    { name: 'LIME-O', tag: 'CHILI LIME', base: '#5cc21f', deep: '#1f7a17', ink: '#fff36b' },
    { name: 'VERDES', tag: 'JALAPENO', base: '#1f8f3a', deep: '#0b4a20', ink: '#e8ff7a' },
    { name: 'ZESTAS', tag: 'SALSA VERDE', base: '#bfe01e', deep: '#5d9b0f', ink: '#16431a' },
  ],
  plain: [
    { name: 'OL SALTY', tag: 'ORIGINAL', base: '#f5cb1c', deep: '#d18a0a', ink: '#c2201a' },
    { name: 'SUNCRISP', tag: 'LIGHTLY SALTED', base: '#f9e163', deep: '#e5a81c', ink: '#1c4fa3' },
    { name: 'KETTLE KIN', tag: 'SEA SALT', base: '#e8dcc0', deep: '#b98f4a', ink: '#5a3216' },
  ],
  smoke: [
    { name: 'SMOKEPIT', tag: 'MESQUITE BBQ', base: '#7a2d14', deep: '#3a1208', ink: '#ffb52e' },
    { name: 'HICKORY JAX', tag: 'HONEY BBQ', base: '#c8591c', deep: '#7c2d0c', ink: '#fff1c2' },
    { name: 'SWEET HEAT', tag: 'CHILI MANGO', base: '#8a1f6c', deep: '#4a0d3c', ink: '#ffcf3a' },
  ],
};
const PROMOS = {
  twofor: ['2 FOR $4', 'MIX & MATCH'],
  crunch: ['NEW!', 'BIGGER CRUNCH'],
  bogo: ['BUY 1 GET 1', 'THIS WEEK ONLY'],
  road: ['ROAD TRIP', 'FUEL'],
  cash: ['CHIPS 50¢', 'cash only'],
  brand: ['', ''],
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A sealed foil bag: fat in the middle, crimped flat at top and bottom. Stands on y = 0. */
function pillow(width: number, height: number, thickness: number) {
  const geometry = new THREE.BoxGeometry(width, height, thickness, 6, 12, 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / (width / 2), v = position.getY(i) / (height / 2);
    const body = Math.abs(v) > 0.88 ? 0.05 : Math.max(0.05, Math.cos((v / 0.88) * Math.PI / 2) ** 0.55 * (1 - 0.4 * u * u));
    position.setZ(i, position.getZ(i) * body);
    position.setX(i, position.getX(i) * (1 - 0.05 * (1 - v * v)));
  }
  geometry.computeVertexNormals();
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function bagArt(brand: Brand, random: () => number) {
  return paint(128, 176, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 176);
    g.addColorStop(0, brand.base); g.addColorStop(1, brand.deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 176);
    // A burst behind the logo.
    ctx.save(); ctx.translate(64, 70); ctx.fillStyle = brand.deep; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -90); ctx.lineTo(9, -90); ctx.fill(); }
    ctx.restore();
    // Crimped seals.
    ctx.fillStyle = '#d9dde0'; ctx.fillRect(0, 0, 128, 11); ctx.fillRect(0, 165, 128, 11);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 2; x < 128; x += 5) { ctx.fillRect(x, 0, 1.5, 11); ctx.fillRect(x, 165, 1.5, 11); }
    // Logo on a tilted banner.
    ctx.save(); ctx.translate(64, 56); ctx.rotate(-0.12 + random() * 0.08);
    ctx.fillStyle = brand.ink; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'italic 900 34px sans-serif';
    ctx.strokeText(brand.name, 0, 0, 116); ctx.fillText(brand.name, 0, 0, 116);
    ctx.restore();
    // The chip itself.
    ctx.save(); ctx.translate(64, 112); ctx.rotate(0.3);
    ctx.fillStyle = '#f6d264'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e3a93a'; ctx.beginPath(); ctx.ellipse(4, 3, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = brand.base; for (let i = 0; i < 9; i++) ctx.fillRect(-22 + random() * 44, -12 + random() * 24, 2.5, 2.5);
    ctx.restore();
    ctx.fillStyle = brand.ink; ctx.fillRect(0, 142, 128, 20);
    ctx.fillStyle = brand.deep; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(brand.tag, 64, 153, 120);
  });
}

export default defineThing({
  questions: {
    family: choice('What flavour family, and so what colour, are the bags?', FAMILIES),
    form: choice('What kind of rack is it?', {
      single: 'A narrow single-sided wire floor rack, bags facing the aisle.',
      wide: 'A double-wide merchandiser with a solid coloured backboard and side wings.',
      spinner: 'A four-sided spinner tower on a round base that slowly turns.',
    }),
    size: choice('How big are the bags?', {
      snack: 'Small single-serve bags, many to a row.',
      regular: 'Ordinary grab bags.',
      family: 'Huge puffy family-size bags, only a few to a shelf.',
    }),
    stock: score('How well stocked is it?', ['Stripped: a few bags left at the back', 'Picked over with gaps', 'Mostly full', 'Freshly faced, packed to the lip']),
    floor: choice('What is on the floor in front of it?', {
      nothing: 'Nothing; the floor is clear.',
      fallen: 'One bag has slid off and lies flat on the floor.',
      torn: 'A bag torn open, chips scattered and trodden around it.',
      avalanche: 'Several bags knocked down in a heap.',
    }),
    header: choice('What does the header card promote?', {
      twofor: '2 FOR $4, mix and match.',
      crunch: 'NEW! BIGGER CRUNCH.',
      bogo: 'BUY 1 GET 1, this week only.',
      road: 'ROAD TRIP FUEL.',
      cash: 'A hand-lettered cardboard sign: CHIPS 50¢, cash only.',
      brand: 'Just the lead brand name, huge.',
    }),
    stray: noul('Has one bag from a completely different flavour been shoved back in the wrong place?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const families = Object.keys(BRANDS) as Family[];
    const brands: Brand[] = a.family === 'rainbow' ? families.map((family) => BRANDS[family][Math.floor(random() * 3)]) : [...BRANDS[a.family]];
    const strayBrand = BRANDS[families.filter((family) => family !== a.family)[Math.floor(random() * (a.family === 'rainbow' ? 5 : 4))] ?? 'plain'][0];
    if (a.stray) brands.push(strayBrand);
    const lead = brands[0];

    const [bw, bh] = { snack: [0.14, 0.19], regular: [0.2, 0.27], family: [0.27, 0.37] }[a.size];
    const bt = bw * 0.42;
    const tiers = { snack: 5, regular: 4, family: 4 }[a.size];
    const spinner = a.form === 'spinner';
    const faceWidth = spinner ? Math.max(0.44, bw * 2 + 0.06) : a.form === 'wide' ? 1.25 : 0.68;
    const shelfDepth = spinner ? bt * 1.5 + 0.03 : a.form === 'wide' ? 0.4 : 0.34;
    const baseY = spinner ? 0.3 : 0.22;
    const pitch = bh + 0.075;
    const top = baseY + tiers * pitch;

    const wire = s.material(mood.wear > 0.6 ? '#7a6a58' : '#d5d8d6', { metalness: 0.7, roughness: 0.35 + mood.wear * 0.4 });
    const rods: THREE.BufferGeometry[] = [];
    const rod = (matrix: THREE.Matrix4, from: [number, number, number], to: [number, number, number], radius = 0.005) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const geometry = new THREE.CylinderGeometry(radius, radius, d.length(), 5, 1);
      const m = new THREE.Matrix4().compose(p.add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
      rods.push(geometry.applyMatrix4(m).applyMatrix4(matrix));
    };

    const perBrand = brands.map(() => [] as THREE.Matrix4[]);
    const dummy = new THREE.Object3D();
    const columns = Math.max(1, Math.floor((faceWidth - 0.03) / (bw + 0.012)));
    const rows = Math.max(1, Math.floor((shelfDepth - 0.02) / (bt * 0.72)));
    const fill = mix(0.08, 1, a.stock) * mix(0.85, 1, mood.density);
    const strayAt = a.stray ? Math.floor(random() * 1000) : -1;
    let slot = 0;

    const face = (matrix: THREE.Matrix4, index: number) => {
      const hw = faceWidth / 2;
      for (const x of [-hw, hw]) {
        rod(matrix, [x, spinner ? baseY - 0.02 : 0, 0], [x, top + 0.02, 0], 0.008);
        if (!spinner) rod(matrix, [x, 0, shelfDepth], [x, baseY + (tiers - 1) * pitch + 0.09, shelfDepth], 0.008);
      }
      for (let tier = 0; tier < tiers; tier++) {
        const y = baseY + tier * pitch;
        rod(matrix, [-hw, y, 0], [hw, y, 0]); rod(matrix, [-hw, y, shelfDepth], [hw, y, shelfDepth]);
        rod(matrix, [-hw, y + 0.07, shelfDepth], [hw, y + 0.07, shelfDepth]);
        rod(matrix, [-hw, y + bh * 0.8, 0], [hw, y + bh * 0.8, 0], 0.004);
        const ribs = Math.max(3, Math.round(faceWidth / 0.11));
        for (let i = 0; i <= ribs; i++) {
          const x = -hw + (i / ribs) * faceWidth;
          rod(matrix, [x, y, 0], [x, y, shelfDepth], 0.0035);
          if (i === 0 || i === ribs) rod(matrix, [x, y, shelfDepth], [x, y + 0.07, shelfDepth], 0.004);
        }
        // One brand per tier, shifted per face so a spinner shows something new as it turns.
        const brandIndex = (tier + index) % (brands.length - (a.stray ? 1 : 0));
        for (let column = 0; column < columns; column++) {
          const x = (column - (columns - 1) / 2) * (faceWidth - 0.03) / columns;
          const here = Math.round(rows * Math.min(1, Math.max(0, fill + (random() - 0.5) * (1.1 - a.stock) * 0.9)));
          for (let row = 0; row < here; row++) {
            const messy = mix(0.03, 0.28, mood.wear) * (1.2 - a.stock);
            dummy.position.set(x + (random() - 0.5) * 0.012, y + 0.006, 0.03 + bt * 0.45 + row * bt * 0.72);
            dummy.rotation.set(-0.1 + (random() - 0.5) * messy, (random() - 0.5) * messy * 1.5, (random() - 0.5) * messy);
            dummy.scale.set(1, mix(0.96, 1.03, random()), mix(0.85, 1.1, random()));
            dummy.updateMatrix();
            const isStray = slot++ === strayAt % Math.max(1, tiers * columns * rows * (spinner ? 4 : 1) * fill * 0.6) && row === here - 1;
            perBrand[isStray ? brands.length - 1 : brandIndex].push(matrix.clone().multiply(dummy.matrix));
          }
        }
      }
    };

    const turning = new THREE.Group();
    s.root.add(turning);
    const identity = new THREE.Matrix4();
    const headerArt = paint(512, 192, (ctx) => {
      const [big, small] = PROMOS[a.header];
      if (a.header === 'cash') {
        ctx.fillStyle = '#b8936a'; ctx.fillRect(0, 0, 512, 192);
        ctx.fillStyle = '#16181c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(256, 80); ctx.rotate(-0.03); ctx.font = 'bold 86px cursive'; ctx.fillText(big, 0, 0, 480); ctx.restore();
        ctx.font = 'italic 44px cursive'; ctx.fillText(small, 270, 152, 480);
        return;
      }
      const g = ctx.createLinearGradient(0, 0, 0, 192);
      g.addColorStop(0, lead.base); g.addColorStop(1, lead.deep);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 192);
      ctx.strokeStyle = lead.ink; ctx.lineWidth = 10; ctx.strokeRect(8, 8, 496, 176);
      ctx.fillStyle = lead.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 8;
      if (a.header === 'brand') { ctx.font = 'italic 900 120px sans-serif'; ctx.strokeText(lead.name, 256, 100, 470); ctx.fillText(lead.name, 256, 100, 470); return; }
      ctx.font = 'italic 900 92px sans-serif'; ctx.strokeText(big, 256, 74, 470); ctx.fillText(big, 256, 74, 470);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif'; ctx.fillText(small, 256, 148, 470);
    });
    const headerMaterial = new THREE.MeshStandardMaterial({ map: headerArt, roughness: 0.6, emissive: '#ffffff', emissiveMap: headerArt, emissiveIntensity: mix(0.08, 0.3, mood.cheer) });

    if (spinner) {
      const half = faceWidth / 2 - shelfDepth * 0.2;
      for (let i = 0; i < 4; i++) face(new THREE.Matrix4().makeRotationY(i * Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(0, 0, half)), i);
      const core = new THREE.Mesh(new THREE.BoxGeometry(half * 2 - 0.01, top - baseY + 0.06, half * 2 - 0.01), s.material('#34383c'));
      core.position.y = (top + baseY) / 2;
      core.castShadow = core.receiveShadow = true;
      turning.add(core);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(faceWidth * 0.95, faceWidth * 0.95 * 0.375, faceWidth * 0.95), [headerMaterial, headerMaterial, wire, wire, headerMaterial, headerMaterial]);
      cap.position.y = top + 0.06 + faceWidth * 0.18;
      cap.castShadow = true;
      turning.add(cap);
      s.cylinder(0.03, 0.03, baseY, [0, baseY / 2, 0], wire, 12);
      s.cylinder(0.3, 0.34, 0.045, [0, 0.0225, 0], s.material('#2b2e31', { metalness: 0.5 }), 28);
    } else {
      face(identity, 0);
      const hw = faceWidth / 2;
      for (const x of [-hw, hw]) {
        rod(identity, [x, 0.01, -0.06], [x, 0.01, shelfDepth + 0.08], 0.01);
        rod(identity, [x, top, 0], [x, top + 0.3, 0], 0.008);
      }
      rod(identity, [-hw, 0.1, 0], [hw, 0.1, 0], 0.008);
      const cardHeight = (faceWidth + 0.02) * 0.375 * (a.form === 'wide' ? 0.6 : 1);
      const card = new THREE.Mesh(new THREE.BoxGeometry(faceWidth + 0.02, cardHeight, 0.012), [wire, wire, wire, wire, headerMaterial, wire]);
      card.position.set(0, top + 0.06 + cardHeight / 2, 0);
      card.castShadow = true;
      s.root.add(card);
      if (a.header === 'cash') card.rotation.z = (random() - 0.5) * 0.08;
      if (a.form === 'wide') {
        const board = s.material(lead.deep, { roughness: 0.7 });
        s.box([faceWidth + 0.02, top - 0.04, 0.02], [0, (top + 0.04) / 2, -0.016], board);
        for (const x of [-1, 1]) s.box([0.02, top - 0.04, shelfDepth * 0.7], [x * (hw + 0.012), (top + 0.04) / 2, shelfDepth * 0.35 - 0.02], board);
        s.box([faceWidth + 0.04, 0.1, shelfDepth + 0.04], [0, 0.05, shelfDepth / 2 - 0.02], s.material('#2b2e31'));
      }
    }
    const cage = new THREE.Mesh(mergeGeometries(rods), wire);
    cage.castShadow = cage.receiveShadow = true;
    turning.add(cage);
    for (const geometry of rods) geometry.dispose();

    const bag = pillow(bw, bh, bt);
    const foils = brands.map((brand) => {
      const map = bagArt(brand, random);
      return new THREE.MeshStandardMaterial({ map, metalness: 0.25, roughness: 0.38, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.04, 0.22, mood.cheer) });
    });
    perBrand.forEach((matrices, index) => {
      if (!matrices.length) return;
      const mesh = new THREE.InstancedMesh(bag, foils[index], matrices.length);
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      turning.add(mesh);
    });

    // What ended up on the floor.
    const reach = spinner ? faceWidth / 2 + shelfDepth + 0.12 : shelfDepth + 0.14;
    const drop = (x: number, z: number, brandIndex: number, flat = true) => {
      const mesh = new THREE.Mesh(bag, foils[brandIndex]);
      mesh.position.set(x, flat ? bt * 0.3 : 0.004, z);
      mesh.rotation.set(flat ? -Math.PI / 2 + (random() - 0.5) * 0.2 : -0.15, 0, (random() - 0.5) * 2.6);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    if (a.floor === 'fallen') drop((random() - 0.5) * 0.4, reach + random() * 0.12, Math.floor(random() * foils.length));
    if (a.floor === 'avalanche') {
      const count = 4 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) drop((random() - 0.5) * faceWidth * 0.9, reach - 0.06 + random() * 0.32, Math.floor(random() * foils.length)).position.y += i * 0.012;
    }
    if (a.floor === 'torn') {
      const x = (random() - 0.5) * 0.3, z = reach + 0.08;
      const torn = drop(x, z, 0);
      torn.scale.set(1, 0.8, 0.45);
      const chips = Array.from({ length: 26 + Math.floor(random() * 14) }, () => {
        const angle = random() * Math.PI * 2, distance = 0.05 + random() ** 1.6 * 0.33;
        return { at: [x + Math.cos(angle) * distance, 0.004 + random() * 0.006, z + 0.05 + Math.sin(angle) * distance * 0.7] as [number, number, number], size: mix(0.6, 1.2, random()), color: random() < 0.25 ? '#b98a2a' : '#f0c95a' };
      });
      const flake = new THREE.CylinderGeometry(0.02, 0.018, 0.004, 7);
      s.scatter(flake, s.material('#ffffff', { roughness: 0.8 }), chips);
    }

    const speed = spinner ? mix(0.05, 0.6, mood.energy) : 0;
    turning.rotation.y = spinner ? random() * Math.PI / 2 : 0;
    return s.finish({ update: spinner ? (dt) => { turning.rotation.y += dt * speed; } : undefined });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const HEADINGS = { shift: 'LOST ON SHIFT', remember: 'WE REMEMBER', crew: 'B CREW', yard: 'YARD 7', arc: 'THEY HELD THE ARC', blank: '' } as const;

function plaqueTexture(heading: string, names: number, columns: number, tone: { plate: string; ink: string }, fresh: boolean, worn: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = tone.plate;
  ctx.fillRect(0, 0, 512, 640);
  // Brushed metal: faint horizontal streaks.
  for (let y = 0; y < 640; y += 2) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + random() * 0.05})`; ctx.fillRect(0, y, 512, 1 + random() * 2); }
  ctx.strokeStyle = tone.ink; ctx.lineWidth = 6; ctx.strokeRect(22, 22, 468, 596);
  ctx.lineWidth = 2; ctx.strokeRect(34, 34, 444, 572);
  ctx.fillStyle = tone.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let top = 70;
  if (heading) {
    ctx.font = 'bold 38px monospace';
    ctx.fillText(heading, 256, 84, 410);
    ctx.fillRect(110, 116, 292, 4);
    top = 150;
  }
  // Names are etched as lines of uneven dashes: at this size they read as lettering.
  const rows = Math.ceil(names / columns);
  const rowHeight = Math.min(52, (590 - top) / Math.max(rows, 1));
  const colWidth = 400 / columns;
  for (let n = 0; n < names; n++) {
    const row = Math.floor(n / columns), col = n % columns;
    const cx = 56 + colWidth * (col + 0.5), y = top + rowHeight * (row + 0.5);
    const width = colWidth * mix(0.5, 0.86, random());
    const thick = Math.max(5, Math.min(20, rowHeight * 0.42));
    let x = cx - width / 2;
    const last = fresh && n === names - 1;
    ctx.fillStyle = last ? '#fff6d8' : tone.ink;
    while (x < cx + width / 2) {
      const w = Math.min(mix(5, 20, random()), cx + width / 2 - x);
      ctx.fillRect(x, y - thick / 2, w, thick);
      x += w + mix(3, 9, random());
    }
  }
  ctx.fillStyle = tone.ink;
  if (names === 0) { ctx.font = 'italic 30px serif'; ctx.fillText('no names yet', 256, 360); }
  for (let k = 0, n = Math.round(worn * 26); k < n; k++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? '70,50,30' : '30,50,45'},${0.12 + random() * 0.2})`;
    ctx.beginPath(); ctx.ellipse(random() * 512, random() * 640, 10 + random() * 60, 6 + random() * 26, random() * 3, 0, 7); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    names: choice('How many names are etched on it?', {
      one: 'One name, alone in the middle of the plate.',
      few: 'Three or four names with room left beneath.',
      crew: 'A whole crew, a dozen names in two columns.',
      many: 'So many names, in three tight columns, that extra strips have been riveted on below.',
      none: 'No names yet: a blank plate put up in readiness.',
    }),
    heading: choice('What is stamped across the top?', {
      shift: 'LOST ON SHIFT', remember: 'WE REMEMBER', crew: 'B CREW', yard: 'YARD 7', arc: 'THEY HELD THE ARC', blank: 'Nothing; only the names.',
    }),
    metal: choice('What is the plaque made of?', {
      brass: 'Polished brass, bought with a collection.',
      steel: 'A piece of hull plate, hand-stamped.',
      copper: 'Copper gone green at the edges.',
      black: 'Black anodised plate with bright silver lettering.',
    }),
    helmet: choice('What headgear is wired beside it?', {
      welding: 'A welding mask with a dark rectangular lens, scorched along the bottom.',
      vacuum: 'A round vacuum-suit helmet with a gold visor.',
      hardhat: 'A dented yellow hard hat.',
      none: 'No helmet, only an empty hook.',
    }),
    offering: choice('What was left with it?', {
      flower: 'A single dried flower wired to the truss.',
      wreath: 'A small wreath of dried flowers and ribbon.',
      gloves: 'A pair of work gloves tucked behind the plate.',
      torch: 'A welding torch hung up by its hose, never used again.',
      candle: 'A row of little electric candles, still lit.',
      nothing: 'Nothing at all.',
    }),
    recent: noul('Was the last name added recently, still bright, with a fresh ribbon tied on?'),
    mount: choice('What is it bolted to?', {
      stub: 'A short sawn-off stub of lattice truss standing on a foot plate.',
      beam: 'A plain I-beam post.',
      rail: 'A length of bent handrail between two posts.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const girder = s.material(new THREE.Color('#7b838b').lerp(new THREE.Color('#7a5236'), mood.wear * 0.5), { metalness: 0.45, roughness: 0.5 });
    const dark = s.material('#2a2e33', { roughness: 0.6 });
    const wire = s.material('#b9bec4', { metalness: 0.6, roughness: 0.35 });
    const tone = { brass: { plate: '#c9a04a', ink: '#3b2a12' }, steel: { plate: '#9aa3ab', ink: '#22282e' }, copper: { plate: '#b8744a', ink: '#27433c' }, black: { plate: '#23272c', ink: '#dfe5ea' } }[a.metal];
    const count = { one: 1, few: 3 + Math.floor(random() * 2), crew: 12, many: 30, none: 0 }[a.names];
    const columns = { one: 1, few: 1, crew: 2, many: 3, none: 1 }[a.names];

    // ---- the mount: plate centre ends up about chest high ------------------------------
    const plateW = 0.6, plateH = 0.75, plateY = 1.22;
    let faceZ = 0.16;
    if (a.mount === 'stub') {
      const w = 0.15, top = 1.78;
      for (const x of [-w, w]) for (const z of [-w, w]) s.box([0.035, top, 0.035], [x, top / 2, z], girder);
      for (let y = 0.12; y < top; y += 0.33) {
        for (const z of [-w, w]) { s.box([w * 2, 0.025, 0.025], [0, y, z], girder); s.rod([-w, y, z], [w, Math.min(y + 0.33, top), z], 0.012, girder); }
        for (const x of [-w, w]) { s.box([0.025, 0.025, w * 2], [x, y, 0], girder); s.rod([x, y, -w], [x, Math.min(y + 0.33, top), w], 0.012, girder); }
      }
      // The sawn top: uneven stumps.
      for (const x of [-w, w]) for (const z of [-w, w]) s.box([0.035, mix(0.04, 0.2, random()), 0.035], [x, top + 0.06, z], dark).rotation.z = (random() - 0.5) * 0.5;
      s.box([0.62, 0.03, 0.62], [0, 0.015, 0], girder);
      for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) s.cylinder(0.022, 0.022, 0.03, [x, 0.045, z], dark, 6);
      faceZ = w + 0.03;
    } else if (a.mount === 'beam') {
      s.box([0.2, 1.85, 0.02], [0, 0.925, 0], girder);
      for (const z of [-0.09, 0.09]) s.box([0.2, 1.85, 0.02], [0, 0.925, z], girder);
      s.box([0.02, 1.85, 0.18], [0, 0.925, 0], girder);
      s.box([0.5, 0.03, 0.42], [0, 0.015, 0], girder);
      faceZ = 0.115;
    } else {
      for (const x of [-0.42, 0.42]) { s.cylinder(0.025, 0.025, 1.6, [x, 0.8, 0], girder, 10); s.cylinder(0.07, 0.07, 0.02, [x, 0.01, 0], girder, 12); }
      s.tube([[-0.42, 1.6, 0], [-0.2, 1.63, 0.03], [0.1, 1.58, -0.02], [0.42, 1.6, 0]], 0.025, girder);
      s.rod([-0.42, 0.95, 0], [0.42, 0.95, 0], 0.02, girder);
      faceZ = 0.04;
    }

    // ---- the plaque --------------------------------------------------------------------
    const plaque = new THREE.Group();
    plaque.position.set(0, plateY, faceZ);
    plaque.rotation.z = (random() - 0.5) * mix(0.01, 0.09, mood.wear);
    s.root.add(plaque);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      plaque.add(mesh);
      return mesh;
    };
    const texture = plaqueTexture(HEADINGS[a.heading], count, columns, tone, a.recent, mood.wear, random);
    const metalness = a.metal === 'black' ? 0.2 : 0.45;
    add(new THREE.BoxGeometry(plateW, plateH, 0.014), new THREE.MeshStandardMaterial({ color: tone.plate, metalness, roughness: 0.45 }), [0, 0, 0]);
    add(new THREE.PlaneGeometry(plateW * 0.97, plateH * 0.97), new THREE.MeshStandardMaterial({ map: texture, metalness: metalness * 0.6, roughness: 0.5, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.14 }), [0, 0, 0.0075]).castShadow = false;
    for (const x of [-1, 1]) for (const y of [-1, 1]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6).rotateX(Math.PI / 2), dark, [x * (plateW / 2 - 0.028), y * (plateH / 2 - 0.028), 0.012]);
    if (a.names === 'many') {
      // Extra strips riveted on below when the plate ran out.
      for (let k = 0; k < 3; k++) {
        const strip = add(new THREE.BoxGeometry(plateW * mix(0.7, 0.98, random()), 0.07, 0.01), new THREE.MeshStandardMaterial({ color: new THREE.Color(tone.plate).offsetHSL(0, 0, (random() - 0.5) * 0.12), metalness, roughness: 0.5 }), [(random() - 0.5) * 0.04, -plateH / 2 - 0.05 - k * 0.082, 0]);
        strip.rotation.z = (random() - 0.5) * 0.06;
        for (let n = 0; n < 3; n++) add(new THREE.BoxGeometry(mix(0.05, 0.1, random()), 0.014, 0.004), new THREE.MeshStandardMaterial({ color: tone.ink }), [(n - 1) * 0.12, strip.position.y, 0.007]);
      }
    }

    // ---- the helmet, wired to the right of the plate -------------------------------------
    const hx = plateW / 2 + 0.2, hy = plateY + 0.12, hz = faceZ + 0.04;
    s.rod([plateW / 2 - 0.04, hy + 0.2, faceZ], [hx, hy + 0.22, hz], 0.008, wire);
    s.rod([hx, hy + 0.22, hz], [hx, hy + 0.15, hz], 0.008, wire);
    if (a.helmet === 'welding') {
      const shell = s.material('#3b3f45', { roughness: 0.55 });
      const mask = s.mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.3, 14, 1, false, -1.25, 2.5), shell, [hx, hy - 0.02, hz - 0.03]);
      mask.material.side = THREE.DoubleSide;
      s.ball([0.12, 0.09, 0.12], [hx, hy + 0.12, hz - 0.04], shell, 14);
      s.box([0.13, 0.06, 0.02], [hx, hy + 0.03, hz + 0.1], dark);
      s.box([0.105, 0.04, 0.022], [hx, hy + 0.03, hz + 0.102], new THREE.MeshStandardMaterial({ color: '#12301f', roughness: 0.1, metalness: 0.6, emissive: '#1f6b3f', emissiveIntensity: 0.35 }));
      s.mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.06, 14, 1, true, -1.25, 2.5), s.material('#17191c', { roughness: 0.95, side: THREE.DoubleSide }), [hx, hy - 0.145, hz - 0.03]);
      s.mesh(new THREE.TorusGeometry(0.1, 0.012, 5, 14, Math.PI).rotateX(-Math.PI / 2), dark, [hx, hy + 0.06, hz - 0.05]);
    } else if (a.helmet === 'vacuum') {
      s.ball([0.15, 0.15, 0.15], [hx, hy, hz], s.material('#eceee9', { roughness: 0.5 }), 20);
      s.ball([0.115, 0.1, 0.07], [hx, hy + 0.01, hz + 0.1], new THREE.MeshStandardMaterial({ color: '#c58f24', metalness: 0.7, roughness: 0.15, emissive: '#5a3a08', emissiveIntensity: 0.5 }), 16);
      s.cylinder(0.11, 0.12, 0.05, [hx, hy - 0.15, hz], dark, 16);
      s.box([0.05, 0.04, 0.03], [hx - 0.13, hy - 0.03, hz + 0.04], s.material('#c0392b'));
    } else if (a.helmet === 'hardhat') {
      const hat = s.material('#e7b81f', { roughness: 0.5 });
      const dome = s.mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hat, [hx, hy - 0.06, hz]);
      dome.scale.set(1, 0.85, 1.15);
      s.mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.014, 18), hat, [hx, hy - 0.06, hz + 0.02]).scale.z = 1.25;
      s.box([0.03, 0.02, 0.26], [hx, hy + 0.045, hz], hat);
      s.ball([0.045, 0.03, 0.045], [hx + 0.06, hy + 0.0, hz + 0.09], s.material('#8a7320', { roughness: 0.9 }), 8);
      dome.rotation.z = -0.25;
    } else {
      s.mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 12, Math.PI * 1.4), wire, [hx, hy + 0.12, hz]);
    }

    // ---- what was left -------------------------------------------------------------------
    const ox = -(plateW / 2 + 0.12), oy = plateY - 0.02, oz = faceZ + 0.03;
    const petal = new THREE.Color().setHSL(mix(0.95, 0.09, mood.warmth), mix(0.18, 0.5, mood.cheer), mix(0.42, 0.62, mood.cheer));
    const dried = s.material(petal, { roughness: 0.95 });
    const stemPaint = s.material('#7a6a42', { roughness: 0.95 });
    const candles: THREE.MeshStandardMaterial[] = [];
    if (a.offering === 'flower') {
      s.tube([[ox + 0.02, oy - 0.36, oz], [ox - 0.01, oy - 0.1, oz + 0.015], [ox + 0.03, oy + 0.16, oz + 0.02], [ox + 0.07, oy + 0.3, oz + 0.05]], 0.006, stemPaint);
      const head: P = [ox + 0.075, oy + 0.31, oz + 0.055];
      for (let k = 0; k < 9; k++) {
        const t = (k / 9) * Math.PI * 2;
        const leaf = s.ball([0.03, 0.008, 0.016], [head[0] + Math.cos(t) * 0.03, head[1] - 0.012 - random() * 0.012, head[2] + Math.sin(t) * 0.03], dried, 8);
        leaf.rotation.set(0, -t, -0.7 - random() * 0.5);
      }
      s.ball([0.02, 0.016, 0.02], head, s.material('#5a4420', { roughness: 0.9 }), 8);
      for (const [y, side] of [[-0.05, 1], [0.08, -1]] as const) s.ball([0.04, 0.006, 0.014], [ox + side * 0.03, oy + y, oz + 0.02], stemPaint, 8).rotation.z = side * 0.9;
      for (const y of [-0.22, 0.05]) s.mesh(new THREE.TorusGeometry(0.016, 0.004, 4, 10), wire, [ox + 0.005, oy + y, oz + 0.01]).rotation.x = Math.PI / 2;
    } else if (a.offering === 'wreath') {
      const centre: P = [ox - 0.02, oy + 0.02, oz + 0.02];
      s.mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 22), stemPaint, centre);
      for (let k = 0; k < 16; k++) {
        const t = (k / 16) * Math.PI * 2 + random() * 0.2;
        s.ball([0.03, 0.03, 0.02], [centre[0] + Math.cos(t) * 0.13, centre[1] + Math.sin(t) * 0.13, centre[2] + 0.02], k % 3 ? dried : s.material(petal.clone().offsetHSL(0.08, 0, 0.1), { roughness: 0.95 }), 7);
      }
      const ribbon = s.material(mood.cheer > 0.5 ? '#c8402c' : '#2a2e33', { roughness: 0.8, side: THREE.DoubleSide });
      for (const side of [-1, 1]) s.box([0.035, 0.2, 0.004], [centre[0] + side * 0.03, centre[1] - 0.22, centre[2] + 0.02], ribbon).rotation.z = side * 0.2;
    } else if (a.offering === 'gloves') {
      const leather = s.material('#a8763c', { roughness: 0.9 });
      for (const [dx, tilt] of [[0, 0.25], [0.07, -0.2]] as const) {
        const gx = ox + 0.02 + dx, gy = oy + 0.1;
        const palm = s.box([0.085, 0.12, 0.035], [gx, gy, oz], leather);
        palm.rotation.z = tilt;
        const cuff = s.box([0.1, 0.07, 0.04], [gx + Math.sin(tilt) * 0.09, gy - 0.09, oz], s.material('#6b4a26', { roughness: 0.9 }));
        cuff.rotation.z = tilt;
        for (let f = 0; f < 4; f++) s.rod([gx - 0.03 + f * 0.022 - Math.sin(tilt) * 0.06, gy + 0.055, oz], [gx - 0.035 + f * 0.026 - Math.sin(tilt) * 0.15, gy + 0.14 - (f % 3) * 0.012, oz + 0.02], 0.011, leather);
      }
    } else if (a.offering === 'torch') {
      s.rod([ox, oy + 0.2, oz], [ox + 0.03, oy - 0.04, oz + 0.02], 0.016, s.material('#c98a1e', { metalness: 0.6, roughness: 0.3 }));
      s.rod([ox + 0.03, oy - 0.04, oz + 0.02], [ox + 0.1, oy - 0.12, oz + 0.05], 0.009, wire, 0.005);
      s.cylinder(0.02, 0.02, 0.04, [ox + 0.01, oy + 0.1, oz + 0.01], dark, 8);
      s.tube([[ox, oy + 0.2, oz], [ox - 0.07, oy + 0.32, oz], [ox - 0.11, oy + 0.1, oz + 0.02], [ox - 0.08, oy - 0.3, oz], [ox - 0.02, oy - 0.62, oz - 0.02], [ox + 0.05, oy - 0.9, oz - 0.05]], 0.011, s.material('#b3261e', { roughness: 0.8 }));
      s.mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 12), wire, [ox - 0.03, oy + 0.3, oz]);
    } else if (a.offering === 'candle') {
      const shelfY = plateY - plateH / 2 - (a.names === 'many' ? 0.34 : 0.08);
      s.box([0.5, 0.012, 0.09], [0, shelfY, faceZ + 0.045], girder);
      for (let k = 0, n = 4 + Math.floor(random() * 3); k < n; k++) {
        const x = (k - (n - 1) / 2) * 0.075;
        const height = mix(0.035, 0.07, random());
        s.cylinder(0.016, 0.017, height, [x, shelfY + 0.006 + height / 2, faceZ + 0.05], s.material('#efe9d8', { roughness: 0.8 }), 10);
        const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 1, 0.6), emissiveIntensity: 2.6 });
        candles.push(flame);
        const bulb = s.ball([0.008, 0.016, 0.008], [x, shelfY + 0.02 + height, faceZ + 0.05], flame, 8);
        bulb.castShadow = false;
      }
    }
    if (a.recent) {
      const ribbon = s.material('#f1ede2', { roughness: 0.85, side: THREE.DoubleSide });
      const rx = plateW / 2 - 0.03, ry = plateY - plateH / 2 + 0.03;
      s.ball([0.02, 0.02, 0.012], [rx, ry, faceZ + 0.02], ribbon, 8);
      for (const [dx, tilt, length] of [[-0.02, 0.35, 0.2], [0.025, -0.3, 0.26]] as const) s.box([0.028, length, 0.003], [rx + dx - Math.sin(tilt) * length * 0.5, ry - length * 0.47, faceZ + 0.022], ribbon).rotation.z = -tilt;
      for (const side of [-1, 1]) s.ball([0.03, 0.016, 0.01], [rx + side * 0.03, ry + 0.012, faceZ + 0.022], ribbon, 8).rotation.z = side * 0.4;
    }
    // Soot, weld spatter and old tape on the mount as the years go by.
    if (a.mount === 'beam') for (let k = 0, n = Math.round(mood.wear * 7); k < n; k++) s.ball([0.012 + random() * 0.02, 0.02 + random() * 0.04, 0.004], [(random() - 0.5) * 0.15, mix(0.1, 0.75, random()), faceZ - 0.014], s.material('#2b2826', { roughness: 1 }), 6).castShadow = false;

    const rate = mix(2, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => { candles.forEach((flame, index) => { flame.emissiveIntensity = 2.2 + Math.sin(time * rate + index * 1.7) * 0.6 + Math.sin(time * rate * 2.3 + index) * 0.3; }); },
    });
  },
});

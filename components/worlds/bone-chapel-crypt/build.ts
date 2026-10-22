import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** One low skull, about one unit across, facing +z, darkened in its sockets by vertex colour. */
function skullGeometry() {
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colours = new Float32Array(position.count * 3);
  const d = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize();
    const p = new THREE.Vector3(d.x * 0.8, d.y * 0.9, d.z * 0.95);
    let dark = 0;
    for (const side of [-1, 1]) {
      const k = 1 - smooth(0.2, 0.42, d.angleTo(c.set(side * 0.42, -0.12, 0.88).normalize()));
      p.z -= 0.3 * k;
      dark = Math.max(dark, k);
    }
    const nose = 1 - smooth(0.08, 0.2, d.angleTo(c.set(0, -0.52, 0.85).normalize()));
    dark = Math.max(dark, nose);
    if (d.y < -0.45) { p.x *= 0.62; p.y = -0.45 * 0.9 + (d.y + 0.45) * 1.5; if (d.z > 0) p.z = Math.max(p.z, 0.62); else p.z *= 0.5; }
    const teeth = d.y < -0.72 && d.z > 0.2 ? 0.55 : 0;
    position.setXYZ(i, p.x, p.y, p.z);
    const shade = 1 - Math.max(dark * 0.86, teeth);
    colours.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const INSCRIPTION = { memento: 'MEMENTO MORI', were: 'WHAT YOU ARE WE WERE', pax: 'PAX VOBIS', hodie: 'HODIE MIHI CRAS TIBI' } as const;

export default defineWorld({
  questions: {
    pattern: choice('How are the skulls set into the walls of stacked bones?', {
      courses: 'In long level courses, a row of skulls every few rows of bone ends.',
      lozenge: 'In a diamond lattice, lozenges of skulls across the whole wall.',
      crosses: 'As a repeat of crosses, each one made of skulls.',
      scallops: 'In swags and scallops, garlands of skulls looping along the wall.',
      sparse: 'Hardly at all: plain stacked bone ends with only a skull here and there.',
    }),
    candles: score('How many of the candles still burn?', ['None; cold wicks', 'One or two', 'About half', 'Every one, the niches glowing']),
    floor: choice('What is the floor like?', {
      swept: 'Dry swept flagstones.',
      dust: 'Thick pale dust in drifts along the walls.',
      flooded: 'Flooded ankle-deep with still dark water, the plinths standing out of it.',
      petals: 'Strewn with fallen flower petals.',
    }),
    care: choice('Who keeps this place?', {
      tended: 'A sacristan: fresh flowers in jars, a kneeler set before the central plinth.',
      pilgrims: 'Pilgrims: coins and folded notes heaped everywhere, a rack of little votive lights.',
      forgotten: 'Nobody: cobwebs between the arches, skulls fallen from the walls onto the floor.',
      visitors: 'A heritage office: a rope barrier on brass posts and a small sign asking for silence.',
    }),
    inscription: choice('What is lettered on the tablet under the grating?', {
      memento: 'MEMENTO MORI.',
      were: 'WHAT YOU ARE WE WERE.',
      pax: 'PAX VOBIS.',
      hodie: 'HODIE MIHI CRAS TIBI: today me, tomorrow you.',
    }),
    grating: choice('What comes down through the grating?', {
      shaft: 'A clean hard shaft of light, dust turning in it.',
      ivy: 'Ivy, hanging in long tendrils, and a softer greenish light.',
      leaves: 'Dead leaves, a drift of them gathered on the floor beneath.',
      drip: 'Water, a slow drip that has left a dark stain and a puddle.',
    }),
    heap: noul('Is there a loose heap of skulls piled in the corner, not yet built into the wall?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const W = 10.5, D = 9, H = 4.7, backZ = -D / 2, leftX = -W / 2;
    const dusk = new THREE.Color('#a59a94').lerp(new THREE.Color('#c79558'), mix(0.25, 1, mood.warmth)).lerp(new THREE.Color('#e6d3ae'), mood.cheer * 0.25);
    const plinthHeight = [0.6, 0.42, 0.42, 0.36, 0.36];
    const slots: [number, number][] = [[0.4, 0.5], [-3.0, -1.7], [3.3, -1.6], [-2.8, 2.7], [3.1, 2.7]];
    const { art: s, world } = diorama(context, { background: `#${dusk.getHexString()}`, floor: '#6f6557', width: W, depth: D, maxHeight: 2.5, radius: 1.08, pitch: 31, yaw: 27, slots });
    const root = s.root;
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: readonly [number, number, number] = [0, 0, 0], parent: THREE.Object3D = root) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    // Light: amber, mid-tone, with the key as the daylight from the grating.
    const amber = new THREE.Color('#ffd9a0').lerp(new THREE.Color('#dfe4ee'), (1 - mood.warmth) * 0.6);
    for (const child of root.children) {
      if (child instanceof THREE.HemisphereLight) { child.color.copy(amber); child.groundColor.set('#6f573f'); child.intensity = mix(1.0, 1.4, mood.cheer); }
    }
    const key = world.keyLight!;
    key.color.lerp(amber, 0.5);
    key.intensity = mix(1.7, 2.6, 1 - Math.abs(mood.daylight - 0.5) * 2);

    // Materials.
    const age = mood.wear;
    const boneColour = new THREE.Color('#e3d6b2').lerp(new THREE.Color('#a8926a'), age * 0.6).lerp(new THREE.Color(mood.warmth > 0.5 ? '#e0b77c' : '#c9cbc4'), Math.abs(mood.warmth - 0.5) * 0.35);
    const stoneColour = new THREE.Color('#8f8473').lerp(new THREE.Color('#6f6a5e'), age * 0.5);
    const stone = new THREE.MeshStandardMaterial({ color: stoneColour, roughness: 0.95 });
    const stoneDark = new THREE.MeshStandardMaterial({ color: stoneColour.clone().multiplyScalar(0.72), roughness: 0.95 });
    const iron = new THREE.MeshStandardMaterial({ color: '#2c2a29', roughness: 0.6, metalness: 0.6 });
    const stacked = paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#3b2c1f';
      ctx.fillRect(0, 0, w, h);
      const rowHeight = 46;
      for (let row = 0; row < h / rowHeight; row++) {
        const y = row * rowHeight + rowHeight / 2;
        for (let x = (row % 2) * 29 - 29; x < w + 58; x += 58 + jitter(4)) {
          const tone = boneColour.clone().multiplyScalar(mix(0.72, 1.05, random()));
          ctx.fillStyle = tone.getStyle();
          for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(x + dx, y + jitter(2), 16.5, 0, 7); ctx.fill(); }
          ctx.fillStyle = 'rgba(40,26,14,0.45)';
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
        }
      }
      for (let i = 0; i < age * 26; i++) {
        ctx.fillStyle = `rgba(${mood.warmth > 0.5 ? '40,28,14' : '52,66,40'},${mix(0.12, 0.36, random())})`;
        ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(20, 110, random()), mix(14, 60, random()), 0, 0, 7); ctx.fill();
      }
    });
    const wallFace = (repeatX: number) => {
      const map = stacked.clone();
      map.needsUpdate = true;
      map.repeat.set(repeatX, H / 2.3);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    };

    // Walls: the back and the left, as a cutaway.
    const backFace = backZ + 0.02, leftFace = leftX + 0.02;
    add(new THREE.BoxGeometry(W + 0.5, H, 0.5), [stone, stone, stone, stone, wallFace(W / 4.4), stone], [-0.25, H / 2, backZ - 0.23]);
    add(new THREE.BoxGeometry(0.5, H, D), [wallFace(D / 4.4), stone, stone, stone, stone, stone], [leftX - 0.23, H / 2, 0]);
    add(new THREE.BoxGeometry(W + 0.6, 0.16, 0.66), stoneDark, [-0.25, H + 0.08, backZ - 0.2]);
    add(new THREE.BoxGeometry(0.66, 0.16, D + 0.1), stoneDark, [leftX - 0.2, H + 0.08, 0]);
    add(new THREE.BoxGeometry(W, 0.3, 0.2), stone, [0, 0.15, backZ + 0.1]);
    add(new THREE.BoxGeometry(0.2, 0.3, D), stone, [leftX + 0.1, 0.15, 0]);

    // Flagstones.
    const flags = paint(512, 512, (ctx, w, h) => {
      const base = new THREE.Color(a.floor === 'dust' ? '#a99e88' : '#74695a').lerp(new THREE.Color('#6b6558'), age * 0.35);
      ctx.fillStyle = base.clone().multiplyScalar(0.6).getStyle();
      ctx.fillRect(0, 0, w, h);
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        let x = -random() * 60;
        while (x < w) {
          const wide = mix(60, 120, random());
          ctx.fillStyle = base.clone().multiplyScalar(mix(0.88, 1.1, random())).getStyle();
          ctx.fillRect(x + 2, (r * h) / rows + 2, wide - 4, h / rows - 4);
          x += wide;
        }
      }
    });
    if (world.ground) ((world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial) = new THREE.MeshStandardMaterial({ map: flags, roughness: 0.95 });

    // Everything made of skulls goes in one instanced mesh.
    const skulls: THREE.Matrix4[] = [];
    const euler = new THREE.Euler(), quat = new THREE.Quaternion();
    const skull = (x: number, y: number, z: number, yaw: number, size = 0.135, pitch = 0, roll = 0) => {
      quat.setFromEuler(euler.set(pitch, yaw, roll, 'YXZ'));
      skulls.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), quat, new THREE.Vector3(size, size, size)));
    };
    const cell = 0.37, big = 0.175;
    const wanted = (ui: number, vi: number) => {
      switch (a.pattern) {
        case 'courses': return vi % 3 === 1;
        case 'lozenge': return Math.abs((ui % 8) - 4) + Math.abs((vi % 8) - 4) === 3 || (ui % 8 === 4 && vi % 8 === 4);
        case 'crosses': { const u = ui % 7, v = vi % 7; return (u === 3 && v >= 1 && v <= 6) || (v === 4 && u >= 1 && u <= 5); }
        case 'scallops': return vi === 11 || vi === Math.round(9.5 - 3 * Math.abs(Math.sin((ui * Math.PI) / 8))) || vi === Math.round(4 - 3 * Math.abs(Math.sin((ui * Math.PI) / 8)));
        default: return random() < 0.06 + mood.density * 0.06;
      }
    };
    const backNiches = [-3.95, -1.95, 1.95, 3.95], leftNiches = [-1.7, 1.3];
    const blockedBack = (x: number, y: number) => backNiches.some((n) => Math.abs(x - n) < 0.72 && y > 0.95 && y < 2.75) || (Math.abs(x) < 1.75 && y > 2.5);
    const blockedLeft = (z: number, y: number) => leftNiches.some((n) => Math.abs(z - n) < 0.72 && y > 0.95 && y < 2.75);
    const fallen: [number, number][] = [];
    const gone = age * 0.22 + (a.care === 'forgotten' ? 0.14 : 0);
    for (let vi = 0; vi < 12; vi++) {
      const y = 0.52 + vi * cell;
      for (let ui = 0; ui < 28; ui++) {
        const x = leftX + 0.3 + ui * cell;
        if (!wanted(ui, vi) || blockedBack(x, y)) continue;
        if (random() < gone) { if (vi > 2) fallen.push([x, backZ + mix(0.5, 1.6, random())]); continue; }
        skull(x, y, backFace + 0.09, jitter(0.2), big * mix(0.92, 1.06, random()), jitter(0.12), jitter(0.1));
      }
      for (let ui = 0; ui < 24; ui++) {
        const z = backZ + 0.35 + ui * cell;
        if (!wanted(ui + 5, vi) || blockedLeft(z, y)) continue;
        if (random() < gone) { if (vi > 2) fallen.push([leftX + mix(0.5, 1.5, random()), z]); continue; }
        skull(leftFace + 0.09, y, z, Math.PI / 2 + jitter(0.2), big * mix(0.92, 1.06, random()), jitter(0.12), jitter(0.1));
      }
    }

    // Blind arches of skulls on engaged piers, with the stubs of the vault ribs above.
    const archOn = (centre: number, half: number, onBack: boolean) => {
      const spring = 2.5, rise = 1.85;
      const at = (along: number, y: number, out: number): [number, number, number] => onBack ? [centre + along, y, backFace + out] : [leftFace + out, y, centre + along];
      const yaw = onBack ? 0 : Math.PI / 2;
      for (const end of [-1, 1]) {
        const pier = add(new THREE.CylinderGeometry(0.26, 0.3, spring, 14), stone, at(end * half, spring / 2, 0.08));
        pier.rotation.y = yaw;
        add(new THREE.BoxGeometry(0.72, 0.16, 0.72), stoneDark, at(end * half, spring + 0.08, 0.1));
        add(new THREE.BoxGeometry(0.7, 0.24, 0.7), stoneDark, at(end * half, 0.12, 0.1));
        for (let i = 0; i < 4; i++) skull(...at(end * half, 0.62 + i * 0.5, 0.38), yaw, 0.17, jitter(0.08), jitter(0.08));
        // Rib stub leaning out into the room.
        const from = new THREE.Vector3(...at(end * half, spring + 0.16, 0.12)), mid = new THREE.Vector3(...at(end * half * 0.94, spring + 1.0, 0.5)), to = new THREE.Vector3(...at(end * half * 0.82, spring + 1.75, 1.35));
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 12, 0.13, 7), stone);
        add(new THREE.SphereGeometry(0.15, 7, 5), stoneDark, [to.x, to.y, to.z]);
      }
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) { const t = (i / 20) * Math.PI; points.push(new THREE.Vector3(...at(-Math.cos(t) * half, spring + 0.16 + Math.sin(t) * rise, 0.1))); }
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.17, 8), stone);
      const count = Math.round(half * 3.9);
      for (let i = 1; i < count; i++) { const t = (i / count) * Math.PI; skull(...at(-Math.cos(t) * half, spring + 0.16 + Math.sin(t) * rise, 0.34), yaw, 0.19, jitter(0.1), (onBack ? 1 : 0) * (Math.cos(t) * 0.5) + jitter(0.08)); }
    };
    archOn(0, 2.95, true);
    archOn(-0.2, 2.85, false);

    // The grating, the tablet under it, and what comes down.
    const day = mix(0.55, 1, 1 - Math.abs(mood.daylight - 0.5) * 2);
    const sky = new THREE.Color(a.grating === 'ivy' ? '#e3f0c4' : '#fff1cf').lerp(new THREE.Color('#cfe0f5'), (1 - mood.warmth) * 0.5);
    const window = new THREE.Vector3(0, 3.95, backFace + 0.03);
    add(new THREE.BoxGeometry(1.5, 1.1, 0.12), stoneDark, [window.x, window.y, window.z - 0.02]);
    const pane = add(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: 1.1 * day, roughness: 1 }), [window.x, window.y, window.z + 0.05]);
    pane.castShadow = false;
    for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.022, 0.022, 0.84, 6), iron, [window.x - 0.48 + i * 0.24, window.y, window.z + 0.08]);
    for (const y of [-0.2, 0.2]) add(new THREE.BoxGeometry(1.22, 0.035, 0.03), iron, [window.x, window.y + y, window.z + 0.09]);
    const tablet = s.label(INSCRIPTION[a.inscription], 2.6, 0.5, [0, 3.0, backFace + 0.09], '#3a2d22', `#${stoneColour.clone().lerp(new THREE.Color('#e8dfc8'), 0.55).getHexString()}`);
    tablet.castShadow = false;
    add(new THREE.BoxGeometry(2.8, 0.66, 0.08), stoneDark, [0, 3.0, backFace + 0.03]);

    const hero = new THREE.Vector3(slots[0][0], 0, slots[0][1]);
    const beamStrength = (a.grating === 'shaft' ? 0.3 : 0.17) * day;
    const beamMaterial = new THREE.MeshBasicMaterial({ color: sky, transparent: true, opacity: beamStrength, depthWrite: false, side: THREE.DoubleSide });
    const along = hero.clone().sub(window), length = along.length();
    const beam = add(new THREE.CylinderGeometry(0.5, 1.5, length, 20, 1, true), beamMaterial, window.clone().add(hero).multiplyScalar(0.5).toArray() as [number, number, number]);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), along.normalize());
    beam.castShadow = beam.receiveShadow = false;
    const pool = add(new THREE.CircleGeometry(1.9, 28), new THREE.MeshBasicMaterial({ color: sky, transparent: true, opacity: beamStrength * 1.1, depthWrite: false }), [hero.x, a.floor === 'flooded' ? 0.14 : 0.02, hero.z + 0.3]);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    const motes: THREE.Mesh | null = a.grating === 'shaft' ? (() => {
      const dots: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 40; i++) { const t = random(), p = window.clone().lerp(hero, t); dots.push({ at: [p.x + jitter(0.3 + t), p.y + jitter(0.3), p.z + jitter(0.3 + t)], size: mix(0.012, 0.03, random()) }); }
      const mesh = s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0.8, depthWrite: false }), dots);
      mesh.castShadow = false;
      return mesh;
    })() : null;
    if (a.grating === 'ivy') {
      const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#587a3a').lerp(new THREE.Color('#8a7a3c'), age * 0.5), roughness: 0.9 });
      const leaves: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const x = window.x - 0.55 + i * 0.18 + jitter(0.05), drop = mix(0.8, 2.6, random());
        const path: [number, number, number][] = [];
        for (let k = 0; k <= 5; k++) { const y = window.y - 0.3 - (drop * k) / 5; path.push([x + Math.sin(k * 1.3 + i) * 0.12, y, window.z + 0.12 + k * 0.03]); if (k) for (let l = 0; l < 3; l++) leaves.push({ at: [path[k][0] + jitter(0.14), y + jitter(0.14), path[k][2] + 0.04], size: mix(0.05, 0.1, random()) }); }
        s.tube(path, 0.015, leaf);
      }
      const leafGeometry = new THREE.SphereGeometry(1, 6, 4);
      leafGeometry.scale(1, 1, 0.25);
      s.scatter(leafGeometry, leaf, leaves);
    } else if (a.grating === 'leaves') {
      const colours = ['#a0672c', '#c08a34', '#7a4a22', '#b8762e'];
      const leaves: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 90; i++) { const r = Math.abs(jitter(1)) * 1.7, t = random() * 6.3; leaves.push({ at: [Math.cos(t) * r * 1.3, 0.03 + (1.7 - r) * 0.08 * random(), backZ + 0.9 + Math.abs(Math.sin(t)) * r], size: mix(0.05, 0.1, random()), color: colours[i % 4] }); }
      const leafGeometry = new THREE.SphereGeometry(1, 6, 4);
      leafGeometry.scale(1, 0.2, 0.7);
      s.scatter(leafGeometry, new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
    } else if (a.grating === 'drip') {
      const stain = add(new THREE.PlaneGeometry(0.9, 2.3), new THREE.MeshBasicMaterial({ color: '#2a2a22', transparent: true, opacity: 0.2, depthWrite: false }), [0.2, 2.35 - 1.2, backFace + 0.12]);
      stain.castShadow = false;
      const puddle = add(new THREE.CircleGeometry(1.0, 24), new THREE.MeshStandardMaterial({ color: '#4d5a58', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.2, depthWrite: false }), [0.2, 0.025, backZ + 1.3]);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = 0.7;
    }

    // Candle niches.
    const candles: { at: THREE.Vector3; tall: number; lit: boolean }[] = [];
    const wax = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efe6c8').lerp(new THREE.Color('#bfae84'), age * 0.5), roughness: 0.6, emissive: '#5a4016', emissiveIntensity: 0.35 });
    const lit = () => a.candles > 0.02 && random() < Math.min(1, a.candles * 1.15);
    const nicheShape = new THREE.Shape();
    nicheShape.moveTo(-0.45, 0);
    nicheShape.lineTo(-0.45, 0.85);
    nicheShape.absarc(0, 0.85, 0.45, Math.PI, 0, true);
    nicheShape.lineTo(0.45, 0);
    const flowerColours = mood.cheer > 0.5 ? ['#f3ecd8', '#f0c84a', '#e58aa0'] : ['#f3ecd8', '#b9a6c9', '#8a2f38'];
    const flowers: { at: [number, number, number]; size: number; color: string }[] = [];
    const coins: { at: [number, number, number]; size: number; color: string }[] = [];
    const jar = (x: number, y: number, z: number) => {
      add(new THREE.CylinderGeometry(0.07, 0.055, 0.2, 10), new THREE.MeshStandardMaterial({ color: '#7fa0a8', roughness: 0.25, transparent: true, opacity: 0.85 }), [x, y + 0.1, z]);
      const colour = flowerColours[Math.floor(random() * 3)];
      for (let i = 0; i < 6; i++) flowers.push({ at: [x + jitter(0.11), y + 0.3 + random() * 0.16, z + jitter(0.11)], size: mix(0.045, 0.07, random()), color: colour });
      s.rod([x, y + 0.1, z], [x, y + 0.32, z], 0.012, new THREE.MeshStandardMaterial({ color: '#56703c' }));
    };
    const offerings = (x: number, y: number, z: number, spread: number, count: number) => {
      for (let i = 0; i < count; i++) coins.push({ at: [x + jitter(spread), y + 0.012 + random() * 0.02, z + jitter(spread * 0.6)], size: mix(0.03, 0.05, random()), color: random() < 0.45 ? '#f1ead4' : random() < 0.5 ? '#d8aa3c' : '#b9793a' });
    };
    const glowMaterials: THREE.MeshStandardMaterial[] = [];
    const niche = (along: number, onBack: boolean) => {
      const group = new THREE.Group();
      const sill = 1.2;
      if (onBack) group.position.set(along, sill, backFace); else { group.position.set(leftFace, sill, along); group.rotation.y = Math.PI / 2; }
      root.add(group);
      const mine: boolean[] = [];
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) mine.push(lit());
      const burning = mine.filter(Boolean).length;
      const backing = new THREE.MeshStandardMaterial({ color: '#35281e', emissive: '#ff8a2a', emissiveIntensity: burning ? 0.35 + burning * 0.3 : 0, roughness: 1 });
      if (burning) glowMaterials.push(backing);
      add(new THREE.ShapeGeometry(nicheShape, 10), backing, [0, 0, 0.1], group).castShadow = false;
      add(new THREE.TorusGeometry(0.5, 0.08, 6, 16, Math.PI), stone, [0, 0.85, 0.12], group);
      for (const x of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.14, 0.9, 0.16), stone, [x, 0.43, 0.12], group);
      add(new THREE.BoxGeometry(1.25, 0.1, 0.5), stoneDark, [0, -0.05, 0.3], group);
      const local = (x: number, y: number, z: number) => group.localToWorld(new THREE.Vector3(x, y, z));
      group.updateMatrixWorld(true);
      const withSkull = random() < 0.55;
      for (let i = 0; i < count; i++) {
        const tall = mix(0.12, 0.42, random());
        candles.push({ at: local((withSkull ? 0.12 : -0.2) + i * 0.15 + jitter(0.03), 0, 0.34 + jitter(0.07)), tall, lit: mine[i] });
      }
      if (withSkull) { const p = local(-0.25, 0.14, 0.32); skull(p.x, p.y + 0.03, p.z, group.rotation.y + jitter(0.4), 0.18); }
      if (a.care === 'tended' && random() < 0.6) { const p = local(0.42, 0, 0.36); jar(p.x, p.y, p.z); }
      if (a.care === 'pilgrims') { const p = local(0, 0, 0.36); offerings(p.x, p.y, p.z, onBack ? 0.5 : 0.18, 10 + Math.round(mood.density * 12)); }
    };
    backNiches.forEach((x) => niche(x, true));
    leftNiches.forEach((z) => niche(z, false));

    // Plinths.
    add(new THREE.CylinderGeometry(1.5, 1.58, 0.2, 28), stoneDark, [hero.x, 0.1, hero.z]);
    add(new THREE.CylinderGeometry(1.22, 1.3, plinthHeight[0] - 0.2, 28), stone, [hero.x, 0.2 + (plinthHeight[0] - 0.2) / 2, hero.z]);
    for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2 + 0.3; skull(hero.x + Math.sin(t) * 1.31, 0.4, hero.z + Math.cos(t) * 1.31, t, 0.13); }
    for (let i = 1; i < slots.length; i++) {
      const [x, z] = slots[i], h = plinthHeight[i];
      const block = add(new THREE.BoxGeometry(2.1, h - 0.08, 2.1), stone, [x, (h - 0.08) / 2, z]);
      block.rotation.y = jitter(0.06);
      add(new THREE.BoxGeometry(2.26, 0.08, 2.26), stoneDark, [x, h - 0.04, z]).rotation.y = block.rotation.y;
    }

    // Who keeps it.
    const ring = (count: number, r: number, y: number) => { for (let i = 0; i < count; i++) { const t = random() * 6.3; candles.push({ at: new THREE.Vector3(hero.x + Math.sin(t) * r, y, hero.z + Math.cos(t) * r), tall: mix(0.1, 0.3, random()), lit: lit() }); } };
    ring(2 + Math.round(mood.density * 4), 1.4, 0.2);
    if (a.care === 'tended') {
      const wood = new THREE.MeshStandardMaterial({ color: '#5a3d28', roughness: 0.7 });
      const kx = hero.x - 0.2, kz = 3.0;
      add(new THREE.BoxGeometry(0.8, 0.12, 0.34), wood, [kx, 0.2, kz + 0.2]);
      add(new THREE.BoxGeometry(0.8, 0.07, 0.3), new THREE.MeshStandardMaterial({ color: '#7d2630', roughness: 0.9 }), [kx, 0.29, kz + 0.2]);
      add(new THREE.BoxGeometry(0.8, 0.8, 0.07), wood, [kx, 0.4, kz - 0.12]);
      add(new THREE.BoxGeometry(0.86, 0.06, 0.3), wood, [kx, 0.83, kz - 0.14]).rotation.x = 0.25;
      for (const side of [-1, 1]) jar(hero.x + side * 1.38, 0.2, hero.z + 0.35);
      for (let i = 1; i < slots.length; i++) if (random() < 0.5) jar(slots[i][0] + 0.85, plinthHeight[i], slots[i][1] + 0.85);
    } else if (a.care === 'pilgrims') {
      offerings(hero.x, 0.2, hero.z + 1.38, 0.5, 26 + Math.round(mood.density * 30));
      for (let i = 1; i < slots.length; i++) offerings(slots[i][0], plinthHeight[i], slots[i][1] + 0.95, 0.5, 8 + Math.round(mood.density * 10));
      const rx = 4.75, rz = 0.55;
      for (let tier = 0; tier < 3; tier++) {
        add(new THREE.BoxGeometry(0.4, 0.03, 1.5), iron, [rx - tier * 0.26, 0.6 + tier * 0.2, rz]);
        for (let i = 0; i < 6; i++) candles.push({ at: new THREE.Vector3(rx - tier * 0.26, 0.615 + tier * 0.2, rz - 0.62 + i * 0.25), tall: mix(0.06, 0.16, random()), lit: lit() });
      }
      for (const z of [-0.7, 0.7]) for (const dx of [0.15, -0.6]) s.rod([rx + dx, 0, rz + z], [rx + dx, dx > 0 ? 0.6 : 1.0, rz + z], 0.022, iron);
    } else if (a.care === 'forgotten') {
      const web = new THREE.MeshBasicMaterial({ color: '#f1ede3', transparent: true, opacity: 0.55, depthWrite: false });
      const corner = new THREE.Vector3(leftFace, H - 0.2, backFace);
      for (let i = 0; i < 7 + mood.density * 8; i++) {
        const u = mix(0.6, 3.2, random()), v = mix(0.6, 3.2, random()), drop = mix(0.2, 2.2, random());
        s.rod([corner.x + u, corner.y - drop * random(), corner.z + 0.08], [corner.x + 0.08, corner.y - drop, corner.z + v], 0.008, web).castShadow = false;
      }
      for (let i = 0; i < 5; i++) { const [x, z] = slots[1 + (i % 4)]; s.rod([x - 1.0, plinthHeight[1], z + jitter(0.9)], [x - 1.0 - mix(0.3, 0.9, random()), 0.02, z + jitter(1.2)], 0.007, web).castShadow = false; }
    } else {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a04a', roughness: 0.3, metalness: 0.8 });
      const rope = new THREE.MeshStandardMaterial({ color: '#8a1f2a', roughness: 0.9 });
      const posts = [-4.4, -2.1, 0.2, 2.5, 4.8].map((x) => [x, 4.1] as const);
      posts.forEach(([x, z], i) => {
        add(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), brass, [x, 0.475, z]);
        add(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14), brass, [x, 0.02, z]);
        add(new THREE.SphereGeometry(0.06, 8, 6), brass, [x, 0.98, z]);
        if (i) { const [px] = posts[i - 1]; s.tube([[px, 0.9, z], [(px + x) / 2, 0.68, z], [x, 0.9, z]], 0.028, rope); }
      });
      const sign = s.label('SILENZIO', 0.7, 0.22, [4.6, 1.2, 3.4], '#f1e8c9', '#3a2d22');
      sign.rotation.y = -0.3;
      s.rod([4.6, 0, 3.38], [4.6, 1.1, 3.38], 0.02, brass);
    }
    for (const [x, z] of fallen.slice(0, 26)) skull(x, 0.13, z, random() * 6.3, big, jitter(1.2), jitter(1.4));

    // The loose heap.
    if (a.heap) {
      const cx = leftX + 1.25, cz = backZ + 1.2;
      for (let layer = 0; layer < 5; layer++) {
        const r = 1.05 - layer * 0.21, n = Math.max(1, Math.round(r * 11));
        for (let i = 0; i < n; i++) { const t = (i / n) * 6.3 + layer; const rr = r * mix(0.5, 1, random()); skull(cx + Math.cos(t) * rr, 0.16 + layer * 0.23, cz + Math.sin(t) * rr, random() * 6.3, 0.17, jitter(0.7), jitter(0.7)); }
      }
      const longBone = new THREE.MeshStandardMaterial({ color: boneColour, roughness: 0.85 });
      for (let i = 0; i < 9; i++) { const x = cx + jitter(1.2), z = cz + jitter(1.2) + 0.5, t = random() * 3; s.rod([x, 0.05, z], [x + Math.cos(t) * 0.5, 0.05 + random() * 0.25, z + Math.sin(t) * 0.5], 0.03, longBone); }
    }

    // The floor's state.
    let water: THREE.MeshStandardMaterial | null = null;
    if (a.floor === 'dust') {
      const dust = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d2c7ae').lerp(dusk, 0.2), roughness: 1 });
      for (let i = 0; i < 14 + mood.density * 10; i++) {
        const onBack = random() < 0.55;
        const drift = add(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), dust, onBack ? [jitter(4.9), 0, backZ + 0.3 + random() * 0.3] : [leftX + 0.3 + random() * 0.3, 0, jitter(4.1)]);
        drift.scale.set(mix(0.5, 1.3, random()), mix(0.12, 0.34, random()), mix(0.5, 1.2, random()));
        drift.castShadow = false;
      }
    } else if (a.floor === 'flooded') {
      water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2f4743').lerp(dusk, 0.12), roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.84, depthWrite: false, emissive: '#3a6a66', emissiveIntensity: 0.25 });
      const sheet = add(new THREE.PlaneGeometry(W - 0.05, D - 0.05), water, [0, 0.13, 0]);
      sheet.rotation.x = -Math.PI / 2;
      sheet.castShadow = false;
      const shine = new THREE.MeshBasicMaterial({ color: '#ffb45a', transparent: true, opacity: 0.4, depthWrite: false });
      for (const candle of candles) if (candle.lit && random() < 0.6) {
        const streak = add(new THREE.CircleGeometry(0.22, 12), shine, [candle.at.x + (candle.at.x < leftX + 1 ? 0.9 : 0), 0.135, candle.at.z + (candle.at.z < backZ + 1 ? 1.0 : 0)]);
        streak.rotation.x = -Math.PI / 2;
        streak.scale.set(1, 2.6, 1);
        streak.castShadow = false;
      }
    } else if (a.floor === 'petals') {
      const tones = mood.cheer > 0.5 ? ['#e8798f', '#f3c7cf', '#f6e7c4'] : ['#8e2a36', '#c4576a', '#e9dcc4'];
      const petals: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 260 + mood.density * 260; i++) {
        const nearHero = random() < 0.5, r = Math.sqrt(random()) * 2.6, t = random() * 6.3;
        petals.push({ at: nearHero ? [hero.x + Math.cos(t) * r, 0.015, hero.z + Math.sin(t) * r] : [jitter(4.9), 0.015, jitter(4.1)], size: mix(0.035, 0.07, random()), color: tones[i % 3] });
      }
      const petal = new THREE.SphereGeometry(1, 6, 4);
      petal.scale(1, 0.12, 0.7);
      s.scatter(petal, new THREE.MeshStandardMaterial({ roughness: 0.8 }), petals).castShadow = false;
    }

    // Instanced dressing.
    if (flowers.length) s.scatter(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.7 }), flowers);
    if (coins.length) { const disc = new THREE.CylinderGeometry(1, 1, 0.25, 8); s.scatter(disc, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), coins); }
    const skullMesh = new THREE.InstancedMesh(skullGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), skulls.length);
    const tint = new THREE.Color();
    skulls.forEach((matrix, i) => { skullMesh.setMatrixAt(i, matrix); skullMesh.setColorAt(i, tint.copy(boneColour).multiplyScalar(mix(0.8, 1.08, random()))); });
    skullMesh.castShadow = skullMesh.receiveShadow = true;
    root.add(skullMesh);

    const body = new THREE.CylinderGeometry(0.028, 0.032, 1, 8);
    body.translate(0, 0.5, 0);
    const bodies = new THREE.InstancedMesh(body, wax, candles.length);
    const burning = candles.filter((candle) => candle.lit);
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ffe6a8', emissive: '#ff9a2e', emissiveIntensity: 2.6 });
    const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), flameMaterial, Math.max(1, burning.length));
    const halos = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb85a', transparent: true, opacity: 0.16, depthWrite: false }), Math.max(1, burning.length));
    const matrix = new THREE.Matrix4();
    candles.forEach((candle, i) => bodies.setMatrixAt(i, matrix.makeScale(1, candle.tall, 1).setPosition(candle.at.x, candle.at.y, candle.at.z)));
    burning.forEach((candle, i) => {
      flames.setMatrixAt(i, matrix.makeScale(0.03, 0.075, 0.03).setPosition(candle.at.x, candle.at.y + candle.tall + 0.08, candle.at.z));
      halos.setMatrixAt(i, matrix.makeScale(0.24, 0.24, 0.24).setPosition(candle.at.x, candle.at.y + candle.tall + 0.08, candle.at.z));
    });
    flames.count = halos.count = burning.length;
    bodies.castShadow = true;
    root.add(bodies, flames, halos);
    let glow: THREE.PointLight | null = null;
    if (burning.length) {
      glow = new THREE.PointLight('#ff9a3c', 6 + Math.min(30, burning.length * 2.2), 0, 2);
      glow.position.set(-1.2, 1.9, -2.6);
      root.add(glow);
    }

    // Things stand on the plinths, not the floor.
    const settle = world.place.bind(world);
    world.place = (items) => {
      settle(items);
      items.forEach((item, index) => { item.holder.position.y += plinthHeight[index % slots.length]; item.holder.updateMatrixWorld(true); });
    };

    const tempo = mix(1.5, 10, mood.energy), depth = mix(0.08, 0.35, mood.energy);
    const baseGlow = glow ? glow.intensity : 0;
    const backings = glowMaterials.map((material) => material.emissiveIntensity);
    world.update = (_dt, time) => {
      const f = 1 + Math.sin(time * tempo) * depth * 0.6 + Math.sin(time * tempo * 2.3 + 1) * depth * 0.4;
      flameMaterial.emissiveIntensity = 2.6 * f;
      if (glow) glow.intensity = baseGlow * f;
      glowMaterials.forEach((material, i) => { material.emissiveIntensity = backings[i] * f; });
      if (motes) motes.rotation.y = Math.sin(time * 0.2 * (0.4 + mood.energy)) * 0.05;
      if (water) water.opacity = 0.84 + Math.sin(time * 0.7) * 0.03;
    };
    return world;
  },
});

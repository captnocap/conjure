import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, paintIsMetal } from '@conjure/kit';

type P = [number, number, number];

/** Many copies of one shape in one draw call: buttresses, pinnacles, windows, scaffold poles. */
class Batch {
  readonly list: THREE.Matrix4[] = [];
  constructor(readonly geometry: THREE.BufferGeometry, readonly material: THREE.Material) {}
  add(at: P, scale: P, turn = 0) {
    this.list.push(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(...scale)));
  }
  flush(s: Sculpture, shadow = true) {
    if (!this.list.length) { this.geometry.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.list.length);
    this.list.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    s.root.add(mesh);
    return mesh;
  }
}

const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const unitCone = (sides = 6) => new THREE.ConeGeometry(1, 1, sides).translate(0, 0.5, 0);

/** A gable roof as a triangular prism: ridge along x (or along z). */
function gable(s: Sculpture, length: number, width: number, rise: number, at: P, material: THREE.Material, alongX = true) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }).translate(0, 0, -length / 2);
  if (alongX) geometry.rotateY(Math.PI / 2);
  return s.mesh(geometry, material, at);
}

/** A steep four-sided hipped roof of width w (x), depth d (z) and height rise. */
function hip(s: Sculpture, w: number, d: number, rise: number, at: P, material: THREE.Material) {
  const geometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const mesh = s.mesh(geometry, material, at);
  mesh.scale.set(w, rise, d);
  return mesh;
}

function flagMap(kind: 'tricolour' | 'mourning') {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 64;
  const g = canvas.getContext('2d')!;
  if (kind === 'tricolour') {
    g.fillStyle = '#c8102e'; g.fillRect(0, 0, 96, 22);
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 21, 96, 22);
    g.fillStyle = '#2f7a3a'; g.fillRect(0, 42, 96, 22);
  } else { g.fillStyle = '#141414'; g.fillRect(0, 0, 96, 64); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** The building doubled in still water: a painted, rippled, upside-down silhouette. */
function reflectionMap(stone: string, roof: string, water: string, lit: number, random: () => number) {
  const W = 1024, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.fillStyle = water; g.fillRect(0, 0, W, H);
  const xOf = (x: number) => (x / 300 + 0.5) * W;
  g.globalAlpha = 0.75;
  // Wing band, the dome dropping deepest, then the needle towers and pinnacles.
  g.fillStyle = stone; g.fillRect(xOf(-134), 0, xOf(134) - xOf(-134), H * 0.3);
  g.fillStyle = roof; g.fillRect(xOf(-134), H * 0.3, xOf(134) - xOf(-134), H * 0.12);
  g.beginPath(); g.ellipse(xOf(0), H * 0.42, (xOf(19) - xOf(0)), H * 0.38, 0, 0, Math.PI); g.fill();
  g.fillStyle = stone;
  g.fillRect(xOf(-1.5), H * 0.42, xOf(1.5) - xOf(-1.5), H * 0.55);
  for (const x of [-46, -38, 38, 46]) g.fillRect(xOf(x - 2), H * 0.3, xOf(2) - xOf(0), H * 0.38);
  for (let x = -130; x <= 130; x += 6) g.fillRect(xOf(x - 0.5), H * 0.3, 2, H * 0.06);
  if (lit > 0) {
    g.globalAlpha = 0.55 * lit;
    g.fillStyle = '#ffcf6a';
    for (let i = 0; i < 120; i++) g.fillRect(xOf(-134 + random() * 268), random() * H * 0.25, 2, 8 + random() * 30);
  }
  // Ripples break the reflection into horizontal bands.
  g.globalAlpha = 1;
  for (let y = 0; y < H; y += 3 + Math.floor(random() * 5)) {
    g.fillStyle = water;
    g.globalAlpha = 0.25 + (y / H) * 0.6;
    g.fillRect(0, y, W, 1 + random() * 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    lighting: choice('How is the Parliament lit?', {
      floodlit: 'Floodlit gold from below, every pinnacle glowing against the dusk, windows lit.',
      dome: 'Only the dome and the needle towers are lit; the long wings stay in shadow.',
      unlit: 'Unlit: pale stone in plain daylight or grey dusk, dark windows.',
      blackout: 'Blacked out: no lights at all, a dark hulk on the river as in wartime or a power cut.',
    }),
    era: choice('When is it?', {
      '1904': '1904, just finished: crisp cream stone with the first soot of coal smoke, bright new red tiles.',
      wartime: '1945, war-damaged: the dome holed to its ribs, roofs torn open, pinnacles snapped, rubble on the terrace.',
      today: 'Today: restored, cleaned pale stone, the familiar postcard.',
    }),
    scaffolding: choice('Is any of it under restoration?', {
      none: 'No scaffolding: the whole facade is clear.',
      wing: 'One wing of the river facade is wrapped in scaffolding and pale sheeting.',
      dome: 'The dome is caged in scaffolding rings up to the spire.',
      tower: 'One pair of needle towers is boxed in scaffolding.',
    }),
    flag: choice('What flies from the dome?', {
      tricolour: 'The red, white and green Hungarian tricolour.',
      mourning: 'A black mourning flag.',
      banner: 'A plain banner in a single colour.',
      none: 'No flag: the spire stands bare.',
    }),
    banner: paint('If a plain banner flies from the dome, what colour is it?', ['red', 'crimson', 'white', 'black', 'gold', 'navy', 'green', 'purple', 'orange']),
    happening: choice('What is happening on the riverfront terrace?', {
      quiet: 'Nothing: an empty terrace, the building alone with the river.',
      ceremony: 'A state ceremony: a row of flagpoles along the terrace, a guard drawn up.',
      crowd: 'A crowd packs the square and the terrace: a protest, a vigil, a celebration.',
      fireworks: 'Fireworks bursting over the river, a national holiday night.',
    }),
    snow: noul('Is there snow on the roofs and the terrace?'),
    reflection: noul('Is it doubled in still river water at its feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const war = a.era === 'wartime';
    const lightsOn = a.lighting === 'floodlit' || a.lighting === 'dome';
    // Stone: fresh cream in 1904, soot-grey in the war, cleaned today; wear adds soot either way.
    const stoneBase = new THREE.Color({ '1904': '#efe2c2', wartime: '#a39a88', today: '#e7dcc4' }[a.era]).lerp(new THREE.Color('#6b6558'), mood.wear * 0.45);
    const roofBase = new THREE.Color(a.era === '1904' ? '#b8432c' : war ? '#7a3a2c' : '#a2412f').lerp(new THREE.Color('#5a4a42'), mood.wear * 0.3);
    if (a.snow) roofBase.lerp(new THREE.Color('#f2f2ee'), 0.4);
    if (a.lighting === 'floodlit') stoneBase.lerp(new THREE.Color('#e2a94e'), mix(0.3, 0.55, lowSun));
    const floodColour = new THREE.Color().setHSL(mix(0.1, 0.07, mood.warmth), 0.9, 0.42);
    const flood = a.lighting === 'floodlit' ? mix(0.18, 0.4, lowSun) : 0;
    const domeFlood = lightsOn ? mix(0.25, 0.5, lowSun) : 0;
    const domeBase = lightsOn ? stoneBase.clone().lerp(new THREE.Color('#e2a94e'), 0.45) : stoneBase;
    const stone = s.material(stoneBase, { roughness: 0.85, emissive: floodColour, emissiveIntensity: flood });
    const domeStone = s.material(domeBase, { roughness: 0.85, emissive: floodColour, emissiveIntensity: domeFlood });
    const roof = s.material(roofBase, { roughness: 0.75 });
    const domeRoof = s.material(roofBase.clone().lerp(new THREE.Color('#5a3a30'), 0.15), { roughness: 0.7, emissive: floodColour, emissiveIntensity: domeFlood * 0.25 });
    const trim = s.material('#2e2b28', { roughness: 0.7 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd889', emissive: '#ffc25a', emissiveIntensity: mix(0.9, 1.8, lowSun), roughness: 0.6 });
    const base = s.material(stoneBase.clone().lerp(new THREE.Color('#8a826f'), 0.35), { roughness: 0.92 });

    const buttress = new Batch(unitBox(), stone);
    const pinnacle = new Batch(unitCone(6), stone);
    const domePinnacle = new Batch(unitCone(6), domeStone);
    const windowDark = new Batch(unitBox(), trim);
    const windowLit = new Batch(unitBox(), glow);
    const litShare = a.lighting === 'blackout' || war ? 0 : a.lighting === 'floodlit' ? mix(0.35, 0.8, lowSun) : a.lighting === 'dome' ? 0.2 : mix(0.02, 0.25, lowSun);
    const snap = war ? 0.3 : 0;

    // The terrace the whole building stands on, its river edge a low wall.
    s.box([290, 4, 112], [0, 2, 0], base);
    s.box([290, 1.6, 1.4], [0, 4.8, 55.3], base);
    const top = 4;

    type Face = '+z' | '-z' | '+x' | '-x';
    /** One block of the building: walls, roof, buttresses with pinnacles, two rows of windows on its outer faces. */
    const block = (cx: number, cz: number, w: number, d: number, h: number, roofKind: 'x' | 'z' | 'hip', rise: number, faces: Face[], bay = 6) => {
      s.box([w, h, d], [cx, top + h / 2, cz], stone);
      // Roofs come in sections so a war can tear some away.
      if (roofKind === 'hip') hip(s, w + 1, d + 1, rise, [cx, top + h, cz], roof);
      else {
        const length = roofKind === 'x' ? w : d, width = roofKind === 'x' ? d : w;
        const sections = Math.max(1, Math.round(length / 34));
        for (let i = 0; i < sections; i++) {
          const along = -length / 2 + (i + 0.5) * length / sections;
          const at: P = roofKind === 'x' ? [cx + along, top + h, cz] : [cx, top + h, cz + along];
          if (war && random() < 0.35) {
            // Torn open: bare rafters against the sky.
            for (let r = 0; r < 6; r++) {
              const offset = -length / sections / 2 + (r + 0.5) * length / sections / 6;
              const p: P = roofKind === 'x' ? [at[0] + offset, at[1], at[2]] : [at[0], at[1], at[2] + offset];
              const rafter = s.box([0.5, rise * 1.15, 0.5], [p[0], p[1] + rise * 0.45, p[2]], trim);
              rafter.rotation[roofKind === 'x' ? 'x' : 'z'] = (r % 2 ? 1 : -1) * 0.75;
            }
            continue;
          }
          gable(s, length / sections + 0.2, width + 1, rise, at, roof, roofKind === 'x');
        }
        // Small spikes along the ridge.
        for (let t = 4; t < length - 3; t += 9) {
          const p: P = roofKind === 'x' ? [cx - length / 2 + t, top + h + rise - 0.6, cz] : [cx, top + h + rise - 0.6, cz - length / 2 + t];
          if (random() > snap) pinnacle.add(p, [0.35, 4.5, 0.35]);
        }
      }
      for (const face of faces) {
        const alongX = face === '+z' || face === '-z';
        const length = alongX ? w : d;
        const sign = face[0] === '+' ? 1 : -1;
        const out = (alongX ? d : w) / 2;
        const bays = Math.max(1, Math.round(length / bay));
        const step = length / bays;
        for (let i = 0; i <= bays; i++) {
          const t = -length / 2 + i * step;
          const p = (offset: number, y: number): P => (alongX ? [cx + t + offset, y, cz + sign * (out + offset * 0)] : [cx + sign * out, y, cz + t + offset]);
          const [bx, , bz] = p(0, 0);
          const corner = i === 0 || i === bays;
          buttress.add([bx + (alongX ? 0 : sign * 0.5), top, bz + (alongX ? sign * 0.5 : 0)], [corner ? 2.4 : 1.1, h + 1.5, corner ? 2.4 : 1.1]);
          if (random() > snap) pinnacle.add([bx + (alongX ? 0 : sign * 0.6), top + h + 1.5, bz + (alongX ? sign * 0.6 : 0)], corner ? [1.4, 12, 1.4] : [0.7, 6.5 + random() * 1.5, 0.7]);
          if (i === bays) continue;
          for (const [y, tall] of [[top + h * 0.2, h * 0.24], [top + h * 0.56, h * 0.28]] as const) {
            const [wx, , wz] = alongX ? [cx + t + step / 2, 0, cz + sign * (out + 0.15)] : [cx + sign * (out + 0.15), 0, cz + t + step / 2];
            const lit = random() < litShare;
            (lit ? windowLit : windowDark).add([wx, y, wz], alongX ? [step * 0.42, tall, 0.5] : [0.5, tall, step * 0.42]);
          }
        }
      }
    };

    // River wing, the long rear wing and the cross wings that close the courtyards.
    block(0, 32, 268, 20, 24, 'x', 13, ['+z']);
    block(0, -30, 224, 20, 22, 'x', 12, ['-z']);
    for (const x of [-100, -54, 54, 100]) block(x, 1, 16, 42, 22, 'z', 10, []);
    // Pavilions: the end blocks, the two projecting ones, and the centre front under the dome.
    for (const x of [-126, 126]) block(x, 30, 18, 30, 28, 'hip', 16, ['+z', x < 0 ? '-x' : '+x'], 5);
    for (const x of [-82, 82]) block(x, 38, 22, 18, 28, 'hip', 15, ['+z', '+x', '-x'], 5.5);
    block(0, 40, 44, 16, 30, 'z', 14, ['+z', '+x', '-x'], 5.5);
    block(0, 0, 56, 50, 28, 'x', 10, []);

    // Two pairs of needle towers either side of the dome, over the old chambers.
    const towers: P[] = [];
    for (const x of [-44, 44]) for (const z of [-8, 8]) towers.push([x, top, z]);
    const towerScaffold = a.scaffolding === 'tower' ? 1 : 0;
    for (const [x, y, z] of towers) {
      s.box([6, 52, 6], [x, y + 26, z], domeStone);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) domePinnacle.add([x + dx * 3, y + 50, z + dz * 3], [0.6, 7, 0.6]);
      for (const k of [0, 1, 2]) windowDark.add([x, y + 30 + k * 6, z + 3.1], [1.6, 4, 0.4]);
      const spire = s.mesh(new THREE.ConeGeometry(3.4, 24, 8).translate(0, 12, 0), domeRoof, [x, y + 52, z]);
      spire.rotation.y = Math.PI / 8;
      if (random() > snap * 0.5) s.cylinder(0.15, 0.3, 4, [x, y + 78, z], trim, 6);
    }

    // The dome: a sixteen-sided drum, a pointed ribbed shell, a lantern and a needle spire.
    const drumBottom = top + 30, drumTop = top + 50, apex = top + 80;
    const R = 19;
    s.cylinder(R, R, drumTop - drumBottom, [0, (drumBottom + drumTop) / 2, 0], domeStone, 16).rotation.y = Math.PI / 16;
    s.cylinder(R + 1.2, R + 1.2, 1.6, [0, drumTop, 0], domeStone, 16).rotation.y = Math.PI / 16;
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      const at = (r: number, y: number): P => [Math.sin(t) * r, y, Math.cos(t) * r];
      windowDark.add(at(R + 0.1, drumBottom + 5), [3.6, 10, 0.6], t);
      domePinnacle.add(at(R + 1.2, drumTop + 0.8), [0.8, 8, 0.8]);
      buttress.add(at(R + 0.6, drumBottom), [1.4, drumTop - drumBottom, 1.4], t);
    }
    const shell = (v: number) => R * Math.sqrt(Math.max(0, 1 - v)) ** 0.85;
    const profile: THREE.Vector2[] = [];
    for (let k = 0; k <= 14; k++) { const v = k / 14; profile.push(new THREE.Vector2(Math.max(shell(v), 2.6), drumTop + 0.8 + v * (apex - drumTop - 0.8))); }
    const dome = s.mesh(new THREE.LatheGeometry(profile, 16, war ? 0.9 : 0, war ? Math.PI * 1.55 : Math.PI * 2), domeRoof);
    dome.rotation.y = Math.PI / 16;
    (dome.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      const points = profile.filter((_p, k) => k % 2 === 0).map((p) => new THREE.Vector3(Math.sin(t) * (p.x + 0.3), p.y, Math.cos(t) * (p.x + 0.3)));
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.45, 5), domeStone);
    }
    s.cylinder(2.6, 3.2, 7, [0, apex + 3.5, 0], domeStone, 16);
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; windowDark.add([Math.sin(t) * 3, apex + 2, Math.cos(t) * 3], [0.9, 3, 0.4], t); }
    if (!war || random() > 0.4) s.mesh(new THREE.ConeGeometry(2.4, 14, 8).translate(0, 7, 0), domeRoof, [0, apex + 7, 0]);
    const finial = s.cylinder(0.1, 0.25, 4, [0, apex + 22.5, 0], trim, 6);
    void finial;

    // A flag from the dome lantern.
    let flag: THREE.Mesh | null = null;
    if (a.flag !== 'none') {
      s.rod([2.6, apex + 5, 0], [2.6, apex + 18, 0], 0.18, trim);
      const material = a.flag === 'banner'
        ? s.material(paintHex(a.banner), { side: THREE.DoubleSide, roughness: 0.8, metalness: paintIsMetal(a.banner) ? 0.7 : 0 })
        : new THREE.MeshStandardMaterial({ map: flagMap(a.flag), side: THREE.DoubleSide, roughness: 0.85 });
      const geometry = new THREE.PlaneGeometry(8, 5, 8, 1).translate(4, 0, 0);
      flag = s.mesh(geometry, material, [2.6, apex + 15.5, 0]);
    }

    // Scaffolding: pole grids with pale sheeting.
    const poles = new Batch(new THREE.CylinderGeometry(0.12, 0.12, 1, 4).translate(0, 0.5, 0), s.material('#6d6a64', { metalness: 0.4 }));
    const sheet = new THREE.MeshStandardMaterial({ color: '#e6e2d6', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, roughness: 0.95 });
    if (a.scaffolding === 'wing') {
      const x0 = 30 + random() * 20, x1 = x0 + 46, z = 43.5, h = 36;
      for (let x = x0; x <= x1; x += 2.5) poles.add([x, top, z], [1, h, 1]);
      for (let y = top + 2; y <= top + h; y += 2.2) { const r = s.rod([x0, y, z], [x1, y, z], 0.1, poles.material); r.castShadow = false; }
      s.mesh(new THREE.PlaneGeometry(x1 - x0, h * 0.7), sheet, [(x0 + x1) / 2, top + h * 0.45, z + 0.4]).castShadow = false;
    }
    if (a.scaffolding === 'dome') {
      for (let i = 0; i < 32; i++) { const t = (i / 32) * Math.PI * 2; poles.add([Math.sin(t) * (R + 3), drumBottom, Math.cos(t) * (R + 3)], [1, apex - drumBottom - 4 - Math.max(0, Math.cos(t * 0)) * 0, 1]); }
      for (let y = drumBottom + 3; y < apex - 4; y += 4) s.ring(R + 3, 0.12, [0, y, 0], poles.material).rotation.x = Math.PI / 2;
      for (let y = drumBottom + 4; y < apex - 8; y += 8) s.mesh(new THREE.CylinderGeometry(R + 3.2, R + 3.2, 3.5, 32, 1, true), sheet, [0, y, 0]).castShadow = false;
    }
    if (towerScaffold) {
      for (const [x, y, z] of towers.filter(([x]) => x > 0)) {
        for (const dx of [-4.5, -1.5, 1.5, 4.5]) for (const dz of [-4.5, 4.5]) { poles.add([x + dx, y + 22, z + dz], [1, 34, 1]); poles.add([x + dz, y + 22, z + dx], [1, 34, 1]); }
        for (let k = 0; k < 6; k++) s.mesh(new THREE.BoxGeometry(9.6, 4, 9.6), sheet, [x, y + 26 + k * 5.6, z]).castShadow = false;
      }
    }

    // What happens on the terrace in front.
    const sparks: { mesh: THREE.InstancedMesh; phase: number }[] = [];
    if (a.happening === 'ceremony') {
      const red = new THREE.MeshStandardMaterial({ map: flagMap('tricolour'), side: THREE.DoubleSide, roughness: 0.85 });
      for (let x = -110; x <= 110; x += 20) {
        s.rod([x, top, 51], [x, top + 16, 51], 0.15, trim);
        s.mesh(new THREE.PlaneGeometry(4, 2.6), red, [x + 2, top + 14.6, 51]);
      }
      const guard = new Batch(new THREE.CapsuleGeometry(0.3, 1.1, 2, 6).translate(0, 0.85, 0), s.material('#2d3a2c'));
      for (let x = -24; x <= 24; x += 1.6) guard.add([x, top, 49], [1, 1, 1]);
      guard.flush(s);
    }
    if (a.happening === 'crowd') {
      const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.32, 1, 2, 5).translate(0, 0.82, 0), s.material('#ffffff', { roughness: 0.9 }), 900);
      const matrix = new THREE.Matrix4();
      const tones = ['#3a3a42', '#5a4636', '#7a2a2a', '#2c3d55', '#6b6b62', '#8a7a5a'];
      for (let i = 0; i < 900; i++) {
        matrix.makeTranslation((random() - 0.5) * 240, top, 44 + random() * 10);
        people.setMatrixAt(i, matrix);
        people.setColorAt(i, new THREE.Color(tones[i % tones.length]));
      }
      people.castShadow = true;
      s.root.add(people);
      if (lowSun > 0.5) for (let i = 0; i < 40; i++) s.ball([0.25, 0.25, 0.25], [(random() - 0.5) * 220, top + 1.4, 46 + random() * 8], glow, 6);
    }
    if (a.happening === 'fireworks') {
      const colours = ['#ffd24a', '#ff5a5a', '#f4f2ec', '#5ad16a', '#ff9a3a'];
      for (let b = 0; b < 6; b++) {
        const centre = new THREE.Vector3((random() - 0.5) * 220, 110 + random() * 50, 70 + random() * 20);
        const material = new THREE.MeshBasicMaterial({ color: colours[b % colours.length], transparent: true, opacity: 0.95, depthWrite: false });
        const burst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 5, 4), material, 60);
        const matrix = new THREE.Matrix4();
        const radius = 14 + random() * 10;
        for (let i = 0; i < 60; i++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(radius * (0.8 + random() * 0.2));
          matrix.makeTranslation(centre.x + dir.x, centre.y + dir.y, centre.z + dir.z);
          burst.setMatrixAt(i, matrix);
        }
        burst.castShadow = false;
        s.root.add(burst);
        sparks.push({ mesh: burst, phase: random() * 6 });
      }
    }
    if (war) {
      const rubble = new Batch(new THREE.DodecahedronGeometry(1, 0), base);
      for (let i = 0; i < 70; i++) rubble.add([(random() - 0.5) * 250, top + 0.3, 44 + random() * 9], [1 + random() * 2.2, 0.6 + random() * 1.4, 1 + random() * 2]);
      rubble.flush(s);
    }
    if (a.snow) {
      const snow = s.material('#f3f3ef', { roughness: 0.95 });
      s.box([288, 0.3, 14], [0, top + 0.15, 49], snow);
      s.cylinder(R + 1.25, R + 1.25, 0.4, [0, drumTop + 0.9, 0], snow, 16).rotation.y = Math.PI / 16;
    }

    for (const batch of [buttress, pinnacle, domePinnacle, windowDark, windowLit, poles]) batch.flush(s);

    // Still water at its feet, the silhouette doubled.
    if (a.reflection) {
      const map = reflectionMap(`#${stoneBase.getHexString()}`, `#${roofBase.getHexString()}`, lowSun > 0.6 ? '#4a5a62' : '#7d8f8c', lightsOn ? 1 : 0, random);
      const water = s.mesh(new THREE.PlaneGeometry(300, 70), new THREE.MeshStandardMaterial({ map, roughness: 0.2, metalness: 0.1, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.25 }), [0, 0.05, 91]);
      water.rotation.x = -Math.PI / 2;
      water.castShadow = false;
    }

    const wave = mix(0.4, 3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (flag) {
          const position = flag.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < position.count; i++) { const x = position.getX(i); position.setZ(i, Math.sin(x * 0.7 - time * wave) * x * 0.08); }
          position.needsUpdate = true;
        }
        for (const { mesh, phase } of sparks) (mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.5 * Math.abs(Math.sin(time * (0.6 + mood.energy) + phase));
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const BEERS = {
  lager: 'Pale straw-gold lager with a thin white head.',
  amber: 'Copper-amber ale with an off-white head.',
  stout: 'Black stout under a thick cream head.',
  hazy: 'Cloudy orange wheat beer with a tall fluffy head.',
} as const;
const BEER_TINT: Record<keyof typeof BEERS, [string, string]> = {
  lager: ['#e9b93a', '#fbf7ea'], amber: ['#b8601f', '#f3e6c8'], stout: ['#1c120e', '#e6cfa3'], hazy: ['#e39a2c', '#fff6e0'],
};
const NAMES = [['OLD', 'ANCHOR'], ['RED', 'HEN'], ['NORTH', 'STAR'], ['BLACK', 'DOG'], ['GOLDEN', 'MILE'], ['IRON', 'HORSE'], ['HARE', '& HOP'], ['LAST', 'ORDERS'], ['NO. 7', 'BITTER']] as const;
const INKS = [['#9c2b23', '#f5e9c8'], ['#1f3f6e', '#f2f0e4'], ['#1f5a3a', '#f3e7b8'], ['#16181c', '#e2b23a'], ['#e0a12a', '#2a1a10'], ['#6a2a6e', '#f2e6ee']] as const;

function badge(lines: readonly string[], ink: string, paper: string, round: boolean, grime: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = ink; c.lineWidth = 7;
  if (round) { c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke(); } else c.strokeRect(10, 10, 108, 108);
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 30px sans-serif';
  c.fillText(lines[0], 64, 46, 92); c.fillText(lines[1], 64, 82, 92);
  c.beginPath(); c.arc(64, 108, 5, 0, 7); c.fill(); c.beginPath(); c.arc(64, 20, 5, 0, 7); c.fill();
  if (grime > 0.05) { c.fillStyle = `rgba(90,75,55,${grime * 0.45})`; c.fillRect(0, 0, 128, 128); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    spacing: score('How widely spaced are the taps?', ['A close packed row', 'Compact', 'Room to pull a pint', 'A broad generous row']),
    nozzle: choice('What kind of outlet does each tap have?', { short: 'A short standard downspout.', long: 'A long straight serving spout.', stout: 'A broad black stout nozzle.', hooked: 'A curved hooked spout.' }),
    grille: choice('What covers the drip pan?', { bars: 'Parallel steel slats.', grid: 'A square mesh grille.', rods: 'Thin round rods.', open: 'An open pan with its drain exposed.' }),
    chill: score('How cold does the font look?', ['Dry metal', 'A few beads of condensation', 'Covered with droplets', 'Pale frosted sleeves around the tap bodies']),
    marker: choice('How are the taps identified below their handles?', { none: 'Only the handle badges.', numbers: 'Small numbered plates fixed under each outlet.', chalk: 'Dark chalk labels on little metal brackets.', tags: 'Cream paper tags tied around the stems.' }),
    rinser: choice('Is there a glass rinser next to the tray?', { none: 'No rinser.', star: 'A star-shaped push plate over a round drain cup.', ring: 'A ridged round push plate in a square drain pan.', brush: 'A short washing brush standing in a drain cup.' }),
    tower: choice('What shape is the font?', {
      tbar: 'A single stout column with a crossbar on top: the classic T-bar.',
      bridge: 'A long rail carried on two legs, a bridge font spanning the bar.',
      cobra: 'Separate swan-neck pipes rising and curling forward, one per tap.',
      ceramic: 'A fat glazed ceramic barrel with painted bands, a continental beer hall font.',
    }),
    finish: choice('What is the metalwork?', {
      brass: 'Warm polished brass.',
      chrome: 'Cold mirror chrome.',
      copper: 'Copper gone brown, with green in the joints.',
      iron: 'Black enamelled iron.',
    }),
    taps: choice('How many taps?', { two: 'Two: a small place with little choice.', three: 'Three, the usual.', five: 'Five, a crowded row for a place proud of its range.' }),
    handles: choice('What are the tap handles like?', {
      shield: 'Enamel shield badges on short stems, each a different brewery.',
      paddle: 'Tall painted wooden paddles, American style.',
      roundel: 'Round pump-clip discs facing the drinker.',
      novelty: 'Novelty sculpted handles: a hop cone, an eight ball, a star, a little barrel.',
      knob: 'Plain black knobs with no badges at all.',
    }),
    doing: choice('What is one of the taps doing?', {
      dribble: 'Shut but dribbling: blobs of foam fall from the spout.',
      pouring: 'Pulled open with beer streaming out.',
      shut: 'Nothing: every tap is closed and dry.',
      out: 'Off sale: an upturned cup sits over one handle because the keg has run out.',
    }),
    pint: choice('What stands on the drip tray?', {
      half: 'A half-pulled pint left waiting under the tap.',
      full: 'A full pint with the head running over the rim.',
      none: 'Nothing.',
      empties: 'A couple of drained glasses laced with dried foam.',
    }),
    beer: choice('If any beer is showing, what kind?', BEERS),
    tray: score('How full is the drip tray?', ['Wiped dry', 'A film in the bottom', 'Half full of slops', 'Brimming over on to the bar']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { two: 2, three: 3, five: 5 }[a.taps];
    const pitch = (a.tower === 'cobra' ? 0.105 : 0.092) * mix(0.94, 1.3, a.spacing);
    const span = (count - 1) * pitch;
    const tone = { brass: '#d0a13a', chrome: '#d6dcdf', copper: '#a9603a', iron: '#26282c' }[a.finish];
    const metal = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tone).lerp(new THREE.Color(a.finish === 'copper' ? '#5d7a62' : '#6d6452'), mood.wear * 0.35),
      metalness: a.finish === 'iron' ? 0.4 : 0.92, roughness: (a.finish === 'iron' ? 0.45 : 0.22) + mood.wear * 0.3,
    });
    const steel = new THREE.MeshStandardMaterial({ color: '#c3c9cc', metalness: 0.85, roughness: 0.3 + mood.wear * 0.25, side: THREE.DoubleSide });
    const dark = s.material('#1b1c1f', { roughness: 0.5 });
    const [beerTint, headTint] = BEER_TINT[a.beer];
    const beer = new THREE.MeshStandardMaterial({ color: beerTint, roughness: 0.15, emissive: beerTint, emissiveIntensity: a.beer === 'stout' ? 0 : 0.18 });
    const foam = new THREE.MeshStandardMaterial({ color: headTint, roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#eaf4f6', transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide });
    const tapY = 0.4, tapZ = 0.0;
    const active = a.doing === 'shut' ? -1 : Math.min(count - 1, Math.floor(random() * count));
    const xOf = (i: number) => (i - (count - 1) / 2) * pitch;

    // The font itself.
    if (a.tower === 'tbar') {
      s.lathe([[0, 0], [0.075, 0], [0.078, 0.012], [0.05, 0.03], [0.04, 0.05], [0.04, 0.34], [0.046, 0.35], [0.046, tapY + 0.02], [0, tapY + 0.02]], metal, [0, 0, -0.045]);
      const bar = s.cylinder(0.036, 0.036, span + 0.11, [0, tapY, -0.045], metal, 24);
      bar.rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) s.ball([0.02, 0.04, 0.04], [x * (span / 2 + 0.058), tapY, -0.045], metal);
      s.ball([0.022, 0.03, 0.022], [0, tapY + 0.05, -0.045], metal);
    } else if (a.tower === 'bridge') {
      const bar = s.cylinder(0.034, 0.034, span + 0.2, [0, tapY, -0.045], metal, 24);
      bar.rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) {
        s.lathe([[0, 0], [0.055, 0], [0.057, 0.012], [0.032, 0.03], [0.028, 0.06], [0.028, tapY - 0.02], [0.036, tapY]], metal, [x * (span / 2 + 0.085), 0, -0.045]);
        s.ball([0.036, 0.036, 0.036], [x * (span / 2 + 0.085), tapY, -0.045], metal);
      }
    } else if (a.tower === 'cobra') {
      s.box([span + 0.14, 0.03, 0.11], [0, 0.015, -0.07], metal);
      for (let i = 0; i < count; i++) {
        const x = xOf(i);
        s.tube([[x, 0.02, -0.08], [x, 0.25, -0.085], [x, tapY + 0.02, -0.07], [x, tapY + 0.035, -0.035], [x, tapY, -0.012]], 0.019, metal);
        s.cylinder(0.027, 0.03, 0.03, [x, 0.045, -0.08], metal, 16);
      }
    } else {
      const glaze = new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.18 + mood.wear * 0.3 });
      const band = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#8a2f2a' : '#274b86', roughness: 0.2 });
      const w = Math.max(0.085, span / 2 + 0.05);
      const body = s.lathe([[0, 0], [0.07, 0], [0.074, 0.02], [0.06, 0.05], [0.085, 0.17], [0.09, 0.3], [0.08, 0.41], [0.06, 0.455], [0.03, 0.47], [0, 0.472]], glaze, [0, 0, -0.06]);
      body.scale.x = w / 0.09;
      for (const [y, r] of [[0.1, 0.071], [0.34, 0.088], [0.43, 0.073]] as const) {
        const ring = s.ring(r, 0.006, [0, y, -0.06], band);
        ring.rotation.x = Math.PI / 2; ring.scale.x = w / 0.09;
      }
      s.ball([0.022, 0.028, 0.022], [0, 0.49, -0.06], metal);
    }

    // Taps: a body pointing forward, a spout turned down, a handle on a pivot.
    const frontZ = a.tower === 'ceramic' ? 0.025 : tapZ;
    const spouts: [number, number, number][] = [];
    const picks = NAMES.map((_n, i) => i).sort(() => random() - 0.5);
    const novelty = ['hop', 'ball', 'star', 'barrel', 'hop'];
    for (let i = 0; i < count; i++) {
      const x = xOf(i), y = a.tower === 'ceramic' ? 0.33 : tapY;
      s.rod([x, y, frontZ - 0.05], [x, y, frontZ + 0.05], 0.014, metal);
      s.cylinder(0.019, 0.019, 0.022, [x, y, frontZ + 0.035], metal, 14).rotation.x = Math.PI / 2;
      const nozzleDrop = a.nozzle === 'long' ? 0.115 : a.nozzle === 'short' ? 0.065 : 0.085;
      const nozzleZ = frontZ + (a.nozzle === 'hooked' ? 0.09 : 0.066);
      if (a.nozzle === 'hooked') s.tube([[x, y - 0.005, frontZ + 0.048], [x, y - 0.025, frontZ + 0.081], [x, y - 0.06, nozzleZ], [x, y - nozzleDrop, nozzleZ]], 0.009, metal);
      else s.rod([x, y - 0.005, frontZ + 0.048], [x, y - nozzleDrop, nozzleZ], a.nozzle === 'stout' ? 0.014 : 0.011, a.nozzle === 'stout' ? dark : metal, a.nozzle === 'stout' ? 0.012 : 0.008);
      spouts.push([x, y - nozzleDrop - 0.003, nozzleZ]);
      if (a.chill > 0.05) {
        const ice = s.material('#e5edf0', { roughness: 0.25, metalness: 0.15 });
        for (let k = 0; k < Math.round(a.chill * 22); k++) {
          const t = k * 2.4, z = frontZ - 0.025 + random() * 0.06;
          s.ball([0.0014, 0.0023, 0.0014], [x + Math.cos(t) * 0.014, y + Math.sin(t) * 0.014, z], ice, 6);
        }
        if (a.chill > 0.72) s.rod([x, y, frontZ - 0.015], [x, y, frontZ + 0.02], 0.0145, ice);
      }
      if (a.marker !== 'none') {
        const labelZ = frontZ + 0.02, labelY = y - 0.035;
        const labelMat = s.material(a.marker === 'chalk' ? '#28322e' : a.marker === 'tags' ? '#ddd0aa' : '#bfa665', { roughness: 0.8 });
        if (a.marker === 'tags') { const cord = s.material('#ac9270'); s.ring(0.017, 0.001, [x, y, labelZ], cord).rotation.x = Math.PI / 2; s.rod([x, y, labelZ + 0.017], [x, labelY + 0.008, labelZ], 0.001, cord); }
        else s.rod([x, y - 0.01, labelZ], [x, labelY + 0.008, labelZ], 0.002, steel);
        s.box([0.038, 0.019, 0.002], [x, labelY, labelZ], labelMat);
        const map = badge([a.marker === 'chalk' ? 'TAP' : '', String(i + 1)], a.marker === 'chalk' ? '#ede9d9' : '#30291e', a.marker === 'chalk' ? '#28322e' : a.marker === 'tags' ? '#ddd0aa' : '#bfa665', false, mood.wear * 0.3);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.017), new THREE.MeshStandardMaterial({ map, roughness: 0.8 })); face.position.set(x, labelY, labelZ + 0.0012); s.root.add(face);
      }

      const open = i === active && a.doing === 'pouring';
      const handle = new THREE.Group();
      handle.position.set(x, y + 0.012, frontZ + 0.035);
      handle.rotation.x = open ? 0.75 : -0.16 + (random() - 0.5) * 0.06;
      s.root.add(handle);
      const add = (mesh: THREE.Mesh, at: [number, number, number]) => { mesh.position.set(...at); mesh.castShadow = true; handle.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.05, 10), metal), [0, 0.025, 0]);
      const [ink, paper] = INKS[(picks[i % picks.length] + i) % INKS.length];
      const face = () => new THREE.MeshStandardMaterial({ map: badge(NAMES[picks[i % picks.length]], ink, paper, a.handles === 'roundel', mood.wear), roughness: 0.35 });
      if (a.handles === 'shield') {
        const outline = new THREE.Shape();
        outline.moveTo(-0.03, 0.04); outline.lineTo(0.03, 0.04); outline.lineTo(0.03, 0); outline.quadraticCurveTo(0.028, -0.03, 0, -0.045); outline.quadraticCurveTo(-0.028, -0.03, -0.03, 0); outline.closePath();
        add(new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.4 })), [0, 0.095, -0.006]);
        add(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), face()), [0, 0.105, 0.0068]);
      } else if (a.handles === 'paddle') {
        const tall = 0.17 + (i % 2) * 0.025;
        const paddle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.017, tall, 4), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.5 })), [0, 0.05 + tall / 2, 0]);
        paddle.rotation.y = Math.PI / 4; paddle.scale.z = 0.45;
        add(new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.062), face()), [0, 0.05 + tall * 0.66, 0.0108]);
      } else if (a.handles === 'roundel') {
        const disc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.01, 28), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.4 })), [0, 0.088, 0]);
        disc.rotation.x = Math.PI / 2;
        add(new THREE.Mesh(new THREE.CircleGeometry(0.033, 28), face()), [0, 0.088, 0.0056]);
      } else if (a.handles === 'knob') {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.011, 0.085, 14), dark), [0, 0.09, 0]);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 8), dark), [0, 0.133, 0]);
      } else {
        const kind = novelty[(i + picks[0]) % novelty.length];
        if (kind === 'hop') {
          const green = new THREE.MeshStandardMaterial({ color: '#7fae3c', roughness: 0.7, flatShading: true });
          const cone = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), green), [0, 0.1, 0]);
          cone.scale.set(0.85, 1.6, 0.85);
          add(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.02, 5), new THREE.MeshStandardMaterial({ color: '#4d7d2c' })), [0, 0.155, 0]);
        } else if (kind === 'ball') {
          add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 12), new THREE.MeshStandardMaterial({ color: '#131416', roughness: 0.12 })), [0, 0.085, 0]);
          add(new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), new THREE.MeshStandardMaterial({ color: '#f5f2ea' })), [0, 0.085, 0.0345]);
        } else if (kind === 'star') {
          const star = new THREE.Shape();
          for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.018 : 0.042, t = k / 10 * Math.PI * 2 + Math.PI / 2; if (k) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
          add(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.014, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#e3b22e', metalness: 0.5, roughness: 0.3 })), [0, 0.09, -0.007]);
        } else {
          const cask = add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.022, 0], [0.03, 0.035], [0.022, 0.07], [0, 0.07]].map(([px, py]) => new THREE.Vector2(px, py)), 16), new THREE.MeshStandardMaterial({ color: '#8a5a30', roughness: 0.6 })), [0, 0.05, 0]);
          for (const hy of [0.012, 0.058]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0028, 6, 20), dark); hoop.rotation.x = Math.PI / 2; hoop.position.y = hy; cask.add(hoop); }
        }
      }
      if (i === active && a.doing === 'out') {
        // The universal sign for an empty keg.
        const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.043, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d8352e' : '#f2efe6', roughness: 0.5, side: THREE.DoubleSide })), [0, 0.12, 0]);
        const lid = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), cup.material); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.05; cup.add(lid);
        cup.rotation.z = (random() - 0.5) * 0.3;
      }
    }

    // Drip tray: a steel pan, a slotted grille and whatever has collected in it.
    const trayW = Math.max(0.3, span + 0.2), trayD = 0.17, trayZ = 0.1, trayH = 0.028;
    s.box([trayW, 0.004, trayD], [0, 0.002, trayZ], steel);
    for (const z of [-1, 1]) s.box([trayW, trayH, 0.005], [0, trayH / 2, trayZ + z * trayD / 2], steel);
    for (const x of [-1, 1]) s.box([0.005, trayH, trayD], [x * trayW / 2, trayH / 2, trayZ], steel);
    const slats = Math.floor(trayW / 0.016);
    if (a.grille === 'bars' || a.grille === 'grid') s.scatter(new THREE.BoxGeometry(a.grille === 'grid' ? 0.003 : 0.007, 0.004, trayD - 0.012), steel, Array.from({ length: slats }, (_u, i) => ({ at: [(i - (slats - 1) / 2) * 0.016, trayH - 0.004, trayZ] as const, size: 1 })));
    if (a.grille === 'grid') for (let k = 0; k < 8; k++) s.box([trayW - 0.01, 0.003, 0.003], [0, trayH - 0.003, trayZ - 0.063 + k * 0.018], steel);
    if (a.grille === 'rods') for (let k = 0; k < slats; k++) { const x = (k - (slats - 1) / 2) * 0.016; s.rod([x, trayH - 0.004, trayZ - trayD / 2 + 0.006], [x, trayH - 0.004, trayZ + trayD / 2 - 0.006], 0.0025, steel); }
    if (a.grille === 'open') { s.cylinder(0.021, 0.021, 0.001, [0, 0.005, trayZ], dark, 20); for (let k = -2; k <= 2; k++) s.box([0.032, 0.001, 0.002], [0, 0.006, trayZ + k * 0.006], steel); }
    if (a.rinser !== 'none') {
      const rx = trayW / 2 + 0.067, rz = trayZ;
      if (a.rinser === 'ring') {
        s.box([0.105, 0.006, 0.105], [rx, 0.003, rz], steel);
        for (const dz of [-0.05, 0.05]) s.box([0.105, 0.023, 0.005], [rx, 0.014, rz + dz], steel);
        for (const dx of [-0.05, 0.05]) s.box([0.005, 0.023, 0.105], [rx + dx, 0.014, rz], steel);
      } else s.lathe([[0, 0], [0.05, 0], [0.052, 0.025], [0.047, 0.025], [0.045, 0.006], [0, 0.006]], steel, [rx, 0, rz]);
      s.cylinder(0.008, 0.012, 0.027, [rx, 0.0195, rz], steel, 12);
      if (a.rinser === 'brush') {
        s.cylinder(0.015, 0.015, 0.08, [rx, 0.07, rz], dark, 12);
        for (let k = 0; k < 12; k++) { const t = k / 12 * Math.PI * 2; s.rod([rx + Math.cos(t) * 0.013, 0.035, rz + Math.sin(t) * 0.013], [rx + Math.cos(t) * 0.025, 0.11, rz + Math.sin(t) * 0.025], 0.002, s.material('#bfae8b')); }
      } else if (a.rinser === 'ring') { s.ring(0.031, 0.004, [rx, 0.032, rz], dark).rotation.x = Math.PI / 2; for (const t of [0, Math.PI / 2]) s.box([0.066, 0.005, 0.008], [rx, 0.032, rz], dark).rotation.y = t; }
      else for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2; s.rod([rx, 0.032, rz], [rx + Math.cos(t) * 0.038, 0.032, rz + Math.sin(t) * 0.038], 0.004, dark); }
    }
    const slops = new THREE.MeshStandardMaterial({ color: new THREE.Color(beerTint).lerp(new THREE.Color('#5e4a2c'), 0.6), roughness: 0.08 });
    if (a.tray > 0.12) s.box([trayW - 0.012, 0.003, trayD - 0.012], [0, mix(0.005, trayH - 0.003, Math.min(1, a.tray * 1.15)), trayZ], slops);
    if (a.tray > 0.8) {
      for (let i = 0; i < 4 + Math.floor(random() * 3); i++) {
        const blot = s.cylinder(1, 1, 0.002, [mix(-trayW / 2, trayW / 2, random()), 0.001, trayZ + trayD / 2 + random() * 0.035], slops, 16);
        blot.scale.set(0.03 + random() * 0.04, 1, 0.018 + random() * 0.02);
      }
      for (let i = 0; i < 5; i++) s.ball([0.012, 0.006, 0.012], [mix(-trayW / 2, trayW / 2, random()), trayH, trayZ + (random() - 0.5) * trayD * 0.8], foam, 8);
    }

    // Glasses rest on the pan floor when the grille is removed.
    const servingY = a.grille === 'open' ? 0.006 : trayH;
    const pintProfile = [[0, 0], [0.03, 0], [0.031, 0.004], [0.034, 0.1], [0.041, 0.118], [0.04, 0.15]] as const;
    const radiusAt = (y: number) => { for (let i = 1; i < pintProfile.length; i++) if (y <= pintProfile[i][1]) { const [r0, y0] = pintProfile[i - 1], [r1, y1] = pintProfile[i]; return mix(r0, r1, (y - y0) / (y1 - y0)); } return 0.04; };
    const pintAt = (x: number, z: number, fill: number, head: number, lace: boolean) => {
      s.lathe(pintProfile, glass, [x, servingY, z]);
      if (fill > 0.02) {
        const top = 0.006 + fill * 0.14;
        s.lathe([[0, 0.006], [0.028, 0.006], ...Array.from({ length: 8 }, (_u, k) => { const y = 0.006 + (top - 0.006) * (k + 1) / 8; return [radiusAt(y) - 0.002, y] as const; }), [0, top]], beer, [x, servingY, z]);
        if (head > 0) s.cylinder(radiusAt(top + head) - 0.002, radiusAt(top) - 0.002, head, [x, servingY + top + head / 2, z], foam, 20);
      }
      if (lace) for (let k = 0; k < 4; k++) s.ring(radiusAt(0.03 + k * 0.03) - 0.001, 0.0016, [x, servingY + 0.03 + k * 0.03 + random() * 0.008, z], foam, Math.PI * (0.6 + random())).rotation.set(Math.PI / 2, 0, random() * 6);
    };
    const spout = spouts[Math.max(0, active)];
    const underZ = trayZ - 0.02;
    if (a.pint === 'half') pintAt(spout[0], Math.max(underZ, spout[2] - 0.004), mix(0.4, 0.6, random()), 0.014, false);
    else if (a.pint === 'full') {
      pintAt(spout[0], Math.max(underZ, spout[2] - 0.004), 0.93, 0.018, false);
      s.ball([0.043, 0.012, 0.043], [spout[0], servingY + 0.154, Math.max(underZ, spout[2] - 0.004)], foam, 16);
      for (let k = 0; k < 3; k++) { const t = random() * 6; s.rod([spout[0] + Math.cos(t) * 0.041, servingY + 0.15, Math.max(underZ, spout[2] - 0.004) + Math.sin(t) * 0.041], [spout[0] + Math.cos(t) * 0.036, servingY + 0.15 - 0.03 - random() * 0.07, Math.max(underZ, spout[2] - 0.004) + Math.sin(t) * 0.036], 0.005, foam, 0.003); }
    } else if (a.pint === 'empties') {
      const n = 2 + (mood.density > 0.6 ? 1 : 0);
      for (let k = 0; k < n; k++) pintAt(mix(-trayW / 2 + 0.05, trayW / 2 - 0.05, n === 1 ? 0.5 : k / (n - 1)) + (random() - 0.5) * 0.02, trayZ + 0.02 + (random() - 0.5) * 0.04, k === 0 ? 0.06 : 0, 0, true);
    }

    // What the live tap is doing.
    const drops: THREE.Mesh[] = [];
    const landing = a.pint === 'half' ? servingY + 0.08 : a.pint === 'full' ? servingY + 0.16 : servingY;
    if (active >= 0 && a.doing === 'dribble') {
      s.ball([0.012, 0.01, 0.012], [spout[0], spout[1] - 0.004, spout[2]], foam, 10);
      for (let k = 0; k < 3; k++) drops.push(s.ball([0.007, 0.01, 0.007], [spout[0], mix(spout[1], landing, (k + 0.5) / 3), spout[2]], foam, 8));
      if (a.pint !== 'half' && a.pint !== 'full') s.ball([0.022, 0.008, 0.02], [spout[0], servingY + 0.003, spout[2]], foam, 10);
    } else if (active >= 0 && a.doing === 'pouring') {
      s.rod([spout[0], spout[1], spout[2]], [spout[0], landing, spout[2]], 0.005, beer, 0.004);
      if (a.pint !== 'half' && a.pint !== 'full') s.ball([0.03, 0.008, 0.026], [spout[0], servingY + 0.003, spout[2]], foam, 10);
    }

    const speed = mix(0.08, 0.5, mood.energy);
    const fall = spout[1] - landing;
    const starts = drops.map((_d, k) => (k + 0.5) / 3);
    return s.finish(drops.length ? {
      update: (_dt, time) => drops.forEach((d, k) => { const t = (starts[k] + time * speed / Math.max(fall, 0.05)) % 1; d.position.y = spout[1] - t * t * fall - (1 - t) * t * 0; }),
    } : {});
  },
});

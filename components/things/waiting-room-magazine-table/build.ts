import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const TITLES = {
  gossip: ['HELLO!', '#d5202a', '#ffe14a'],
  country: ['COUNTRY', '#2f6b3f', '#f3ecd2'],
  garden: ['GARDEN', '#6aa23a', '#fff7dc'],
  motor: ['MOTOR', '#1d2b3a', '#ff8a1e'],
  puzzle: ['PUZZLER', '#2a62b8', '#ffffff'],
  comic: ['WHIZZ!', '#f2c21a', '#d5202a'],
  geographic: ['WORLD', '#f2c81a', '#1a1a1a'],
  parish: ['PARISH NEWS', '#e9e4d2', '#3a3a52'],
} as const;
type Title = keyof typeof TITLES;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    table: choice('What kind of table is it?', {
      coffee: 'A long rectangular coffee table on four square legs.',
      round: 'A round pedestal table.',
      square: 'A squat square corner table on a plinth base.',
      shelved: 'A rectangular table with a lower shelf holding the overflow.',
    }),
    surface: choice('What is the laminate?', {
      beech: 'Pale beech-effect with a darker edge strip.',
      white: 'White speckled melamine, chipped at the corners.',
      teak: 'Dark teak-effect from the seventies.',
      grey: 'Office grey with a black edge.',
    }),
    topmost: choice('Which magazine is on top of the pile?', {
      gossip: 'A celebrity weekly, red masthead and yellow shouting.',
      country: 'A glossy country-house monthly, green and cream.',
      garden: 'A gardening magazine with a cover full of flowers.',
      motor: 'A car magazine, dark with an orange flash.',
      puzzle: 'A puzzle book, half the grids already filled in by strangers.',
      comic: 'A children\'s comic in primary colours.',
      geographic: 'A yellow-bordered geography magazine from years ago.',
      parish: 'A photocopied parish newsletter.',
    }),
    disturbed: score('How disturbed is the pile?', ['Squared into one neat stack by the cleaner', 'Fanned out in a tidy arc for display', 'Riffled through and left crooked', 'Scattered across the table, some slid to the floor']),
    abandoned: noul('Has someone left a magazine open face-down, called away mid-article?'),
    leaflets: choice('What holds the leaflets?', {
      acrylic: 'A clear three-tier acrylic rack of health leaflets.',
      spinner: 'A small wire carousel, half its pockets empty.',
      single: 'One cardboard dispenser with a single kind of leaflet.',
      none: 'There are no leaflets.',
    }),
    comfort: choice('What small kindness is on the table?', {
      tissues: 'A box of tissues with one pulled half out.',
      sanitiser: 'A pump bottle of hand sanitiser.',
      water: 'A jug of water and a short stack of plastic cups.',
      nothing: 'Nothing.',
    }),
    toys: choice('What is there for children?', {
      tub: 'A tub of big worn plastic bricks.',
      tower: 'A wobbly brick tower somebody small left standing.',
      spilled: 'Bricks tipped out across the table and onto the floor.',
      beads: 'A bead-maze toy: coloured beads on looping wires on a wooden base.',
      none: 'Nothing; this is not a place for children.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fade = mood.wear * 0.38;
    const aged = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d8cfae'), fade);

    // ---- Table -----------------------------------------------------------------------------
    const [topHex, edgeHex] = { beech: ['#dcc49a', '#a8854f'], white: ['#ecebe4', '#cfcdc2'], teak: ['#7a4e2c', '#4a2d18'], grey: ['#b9bdbd', '#1f2224'] }[a.surface];
    const grain = paint(256, 128, (ctx) => {
      ctx.fillStyle = topHex; ctx.fillRect(0, 0, 256, 128);
      if (a.surface === 'white' || a.surface === 'grey') {
        for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(60,60,60,${0.08 + random() * 0.18})`; ctx.fillRect(random() * 256, random() * 128, 1.5, 1.5); }
      } else {
        ctx.strokeStyle = 'rgba(70,40,10,0.18)';
        for (let y = 2; y < 128; y += 3 + random() * 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + random() * 6 - 3, 170, y + random() * 6 - 3, 256, y); ctx.stroke(); }
      }
      // Cup rings and a biro scribble as it wears.
      ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < mood.wear * 7; i++) { ctx.beginPath(); ctx.arc(random() * 256, random() * 128, 9, 0, 7); ctx.stroke(); }
    });
    const top = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.35 + mood.wear * 0.3 });
    const edge = s.material(edgeHex, { roughness: 0.5 });
    const H = a.table === 'round' ? 0.48 : 0.4;
    let hx: number, hz: number;
    const shelfY = 0.14;
    if (a.table === 'round') {
      hx = hz = 0.31;
      s.cylinder(0.44, 0.44, 0.03, [0, H - 0.015, 0], [edge, top, edge] as unknown as THREE.Material, 40);
      s.cylinder(0.04, 0.05, H - 0.07, [0, (H - 0.07) / 2 + 0.04, 0], edge, 16);
      s.lathe([[0, 0], [0.26, 0], [0.26, 0.02], [0.08, 0.05], [0.05, 0.06], [0, 0.06]], edge);
    } else {
      const W = a.table === 'square' ? 0.72 : 1.15, D = a.table === 'square' ? 0.72 : 0.56;
      hx = W / 2 - 0.06; hz = D / 2 - 0.05;
      s.mesh(new RoundedBoxGeometry(W, 0.035, D, 2, 0.008), edge, [0, H - 0.0185, 0]);
      const face = s.mesh(new THREE.PlaneGeometry(W - 0.012, D - 0.012), top, [0, H + 0.0006, 0]);
      face.rotation.x = -Math.PI / 2;
      if (a.table === 'square') {
        s.box([W - 0.16, H - 0.035, D - 0.16], [0, (H - 0.035) / 2, 0], s.material(edgeHex, { roughness: 0.6 }));
        s.box([W - 0.12, 0.04, D - 0.12], [0, 0.02, 0], s.material('#2a2c2e'));
      } else {
        const leg = a.surface === 'grey' || a.surface === 'white' ? s.material('#c7cccd', { metalness: 0.8, roughness: 0.25 }) : edge;
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, H - 0.035, 0.045], [x * (W / 2 - 0.05), (H - 0.035) / 2, z * (D / 2 - 0.05)], leg);
        s.box([W - 0.1, 0.05, 0.02], [0, H - 0.06, D / 2 - 0.05], edge);
        s.box([W - 0.1, 0.05, 0.02], [0, H - 0.06, -D / 2 + 0.05], edge);
        if (a.table === 'shelved') {
          s.box([W - 0.08, 0.02, D - 0.08], [0, shelfY - 0.01, 0], edge);
          const lower = s.mesh(new THREE.PlaneGeometry(W - 0.09, D - 0.09), top, [0, shelfY + 0.0006, 0]);
          lower.rotation.x = -Math.PI / 2;
        }
      }
      // A chipped corner showing chipboard.
      if (mood.wear > 0.35) s.box([0.05, 0.036, 0.05], [W / 2 - 0.02, H - 0.018, D / 2 - 0.02], s.material('#b89a6a', { roughness: 0.95 })).rotation.y = Math.PI / 4;
    }

    // ---- Magazines -------------------------------------------------------------------------
    const kinds = Object.keys(TITLES) as Title[];
    const covers = new Map<Title, THREE.MeshStandardMaterial>();
    const cover = (kind: Title) => {
      let material = covers.get(kind);
      if (material) return material;
      const [title, band, ink] = TITLES[kind];
      material = new THREE.MeshStandardMaterial({ roughness: kind === 'parish' ? 0.9 : 0.35, map: paint(160, 216, (ctx) => {
        const base = kind === 'parish' ? '#e9e4d2' : kind === 'geographic' ? '#f2c81a' : ['#d9d2c0', '#9cc0d8', '#e6b7a8', '#c9d9a8'][Math.floor(random() * 4)];
        ctx.fillStyle = base; ctx.fillRect(0, 0, 160, 216);
        if (kind !== 'parish') {
          // A blurry cover photograph: a face, a car, a border of flowers, a house.
          const photo = ctx.createLinearGradient(0, 40, 160, 216);
          photo.addColorStop(0, ['#f1d2b8', '#7f9a6a', '#e58fa6', '#3a4656', '#f6f3e6', '#59c0e8', '#6a8fb0'][kinds.indexOf(kind) % 7]);
          photo.addColorStop(1, ['#b0764f', '#d8cfa0', '#7fb04a', '#8a94a0', '#dfe6ee', '#f26a3a', '#2f4a3a'][kinds.indexOf(kind) % 7]);
          ctx.fillStyle = photo;
          ctx.fillRect(kind === 'geographic' ? 12 : 0, kind === 'geographic' ? 12 : 44, kind === 'geographic' ? 136 : 160, kind === 'geographic' ? 192 : 172);
          if (kind === 'gossip' || kind === 'country') { ctx.fillStyle = kind === 'gossip' ? '#e9bfa0' : '#c9b08a'; ctx.beginPath(); ctx.ellipse(80, 126, 34, 44, 0, 0, 7); ctx.fill(); ctx.fillStyle = kind === 'gossip' ? '#5a3a1e' : '#7a3a2a'; ctx.beginPath(); ctx.ellipse(80, 100, 38, 26, 0, Math.PI, 0); ctx.fill(); }
          if (kind === 'motor') { ctx.fillStyle = '#c2261d'; ctx.fillRect(22, 130, 116, 26); ctx.fillRect(48, 110, 62, 22); ctx.fillStyle = '#111'; for (const x of [46, 114]) { ctx.beginPath(); ctx.arc(x, 158, 13, 0, 7); ctx.fill(); } }
          if (kind === 'garden') for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#e8457a', '#f2c81a', '#ffffff', '#b04ad0'][i % 4]; ctx.beginPath(); ctx.arc(random() * 160, 60 + random() * 150, 6 + random() * 8, 0, 7); ctx.fill(); }
          if (kind === 'puzzle') { ctx.fillStyle = '#fff'; ctx.fillRect(22, 64, 116, 116); ctx.fillStyle = '#111'; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (random() < 0.3) ctx.fillRect(22 + c * 14.5, 64 + r * 14.5, 14.5, 14.5); ctx.strokeStyle = '#111'; ctx.strokeRect(22, 64, 116, 116); }
          if (kind === 'comic') { for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#d5202a', '#2a62b8', '#3aa64a', '#ffffff'][i % 4]; ctx.beginPath(); ctx.arc(30 + random() * 100, 80 + random() * 110, 16 + random() * 14, 0, 7); ctx.fill(); } }
        }
        ctx.fillStyle = band;
        if (kind !== 'geographic') ctx.fillRect(0, 0, 160, kind === 'parish' ? 0 : 46);
        ctx.fillStyle = kind === 'geographic' ? '#1a1a1a' : ink;
        ctx.font = `bold ${Math.min(38, 250 / title.length)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(title, 80, kind === 'geographic' ? 34 : 25, 146);
        if (kind === 'parish') { ctx.fillStyle = '#555'; for (let line = 0; line < 18; line++) ctx.fillRect(14, 52 + line * 8.5, 80 + random() * 52, 3); }
        else { ctx.fillStyle = kind === 'gossip' ? '#ffe14a' : '#ffffff'; for (let line = 0; line < 3; line++) ctx.fillRect(8, 176 + line * 11, 50 + random() * 60, 6); }
        // Sun fade.
        ctx.fillStyle = `rgba(226,214,176,${fade})`; ctx.fillRect(0, 0, 160, 216);
      }) });
      covers.set(kind, material);
      return material;
    };
    const pages = s.material(aged('#f4f1e6'), { roughness: 0.9 });
    const MW = 0.21, MD = 0.285;
    const magazine = (kind: Title, at: P3, turn: number, thick = 0.007) => {
      const mesh = s.mesh(new THREE.BoxGeometry(MW, thick, MD), [pages, pages, cover(kind), pages, pages, pages] as unknown as THREE.Material, at);
      mesh.rotation.y = turn;
      return mesh;
    };
    const count = 5 + Math.round(mood.density * 7);
    const mess = a.disturbed;
    const cx = a.table === 'round' ? -0.02 : -hx * 0.12, cz = a.table === 'round' ? 0.06 : 0.02;
    const pick = () => kinds[Math.floor(random() * kinds.length)];
    const onFloor = mess > 0.8 ? Math.min(3, Math.round((mess - 0.7) * 8)) : 0;
    const reach = a.table === 'round' ? 0.2 : hx * 0.5;
    for (let i = 0; i < count; i++) {
      const kind = i === count - 1 ? a.topmost : pick();
      const t = count > 1 ? i / (count - 1) - 0.5 : 0;
      if (i < onFloor) {
        const side = random() < 0.5 ? -1 : 1;
        const m = magazine(kind, [side * (hx + 0.1 + random() * 0.2) * (a.table === 'round' ? 1.6 : 1), 0.006, hz + 0.18 + random() * 0.2], random() * 6);
        m.rotation.x = (random() - 0.5) * 0.04;
        continue;
      }
      // Blend from a square stack, through a fan, to a scatter.
      const fan = Math.max(0, 1 - Math.abs(mess - 0.4) * 3);
      const scatter = Math.max(0, (mess - 0.5) * 2);
      const x = cx + t * reach * 2 * (fan * 0.8 + scatter * 0.2) + (random() - 0.5) * (0.02 + scatter * reach * 1.6);
      const z = cz + (random() - 0.5) * (0.012 + scatter * hz * 1.1) - Math.abs(t) * fan * 0.05;
      const turn = t * -1.1 * fan + (random() - 0.5) * (0.05 + mess * 0.7 + scatter * 2);
      magazine(kind, [x, H + 0.005 + i * 0.0075, z], turn);
    }
    if (a.table === 'shelved') {
      const extra = 3 + Math.round(mood.density * 6);
      for (let i = 0; i < extra; i++) magazine(pick(), [hx * 0.45 + (random() - 0.5) * 0.04 * (1 + mess * 3), shelfY + 0.005 + i * 0.0075, (random() - 0.5) * 0.03 * (1 + mess * 3)], (random() - 0.5) * (0.06 + mess * 0.8));
    }
    if (a.abandoned) {
      // Tented open, spine up, where the reader put it down.
      const g = new THREE.Group();
      s.root.add(g);
      const where: P3 = a.table === 'round' ? [0.2, H, 0.22] : [hx * 0.55, H, hz * 0.45];
      g.position.set(...where);
      g.rotation.y = 0.4 + random() * 0.8;
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(MW, 0.006, MD), [pages, pages, cover(side < 0 ? a.topmost : pick()), pages, pages, pages]);
        leaf.position.set(side * MW * 0.47, 0.035, 0);
        leaf.rotation.z = side * -0.33;
        leaf.castShadow = true;
        g.add(leaf);
      }
    }

    // ---- Leaflets --------------------------------------------------------------------------
    const leafletHues = ['#2a8fb8', '#d5622a', '#3aa66a', '#8b4a9c', '#d5202a', '#e0a526'];
    const leaflet = (at: P3, tilt: number, hue: string, parent: THREE.Object3D = s.root) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.006), [pages, pages, pages, pages, new THREE.MeshStandardMaterial({ roughness: 0.5, map: paint(48, 96, (ctx) => {
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, 48, 96);
        ctx.fillStyle = hue; ctx.fillRect(0, 0, 48, 34);
        ctx.fillStyle = '#fff'; ctx.fillRect(6, 10, 30, 5); ctx.fillRect(6, 20, 22, 4);
        ctx.fillStyle = '#666'; for (let line = 0; line < 6; line++) ctx.fillRect(6, 44 + line * 8, 20 + random() * 18, 3);
        ctx.fillStyle = `rgba(226,214,176,${fade})`; ctx.fillRect(0, 0, 48, 96);
      }) }), pages]);
      mesh.position.set(...at);
      mesh.rotation.x = tilt;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rackAt: P3 = a.table === 'round' ? [0.02, H, -0.26] : [hx * 0.62, H, -hz * 0.55];
    if (a.leaflets === 'acrylic') {
      const clear = new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.32, roughness: 0.08 });
      const g = new THREE.Group();
      s.root.add(g);
      g.position.set(...rackAt);
      g.rotation.y = (random() - 0.5) * 0.3;
      const tiers = 3, pockets = a.table === 'round' ? 2 : 3;
      for (let tier = 0; tier < tiers; tier++) {
        const y = 0.02 + tier * 0.075, z = 0.06 - tier * 0.045;
        const lip = new THREE.Mesh(new THREE.BoxGeometry(pockets * 0.112, 0.09, 0.004), clear);
        lip.position.set(0, y + 0.045, z + 0.014);
        lip.rotation.x = -0.2;
        g.add(lip);
        for (let p = 0; p < pockets; p++) {
          if (random() < mood.wear * 0.45) continue;
          const hue = leafletHues[(tier * pockets + p) % leafletHues.length];
          const stock = 1 + Math.floor(random() * 3);
          for (let k = 0; k < stock; k++) leaflet([(p - (pockets - 1) / 2) * 0.112, y + 0.1 - k * 0.004, z - k * 0.007], -0.2, hue, g);
        }
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(pockets * 0.112 + 0.01, 0.36, 0.005), clear);
      back.position.set(0, 0.18, -0.07);
      back.rotation.x = -0.2;
      g.add(back);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(pockets * 0.112 + 0.01, 0.005, 0.17), clear);
      foot.position.set(0, 0.003, 0);
      g.add(foot);
    } else if (a.leaflets === 'spinner') {
      const wire = s.material('#2b2e31', { metalness: 0.5, roughness: 0.4 });
      const [x, y, z] = rackAt;
      s.cylinder(0.07, 0.08, 0.015, [x, y + 0.008, z], wire, 16);
      s.cylinder(0.006, 0.006, 0.5, [x, y + 0.25, z], wire, 8);
      s.ball([0.012, 0.012, 0.012], [x, y + 0.505, z], wire, 8);
      const spin = random() * 6;
      for (let level = 0; level < 2; level++) for (let k = 0; k < 4; k++) {
        const angle = spin + (k / 4) * Math.PI * 2 + level * 0.4;
        const px = x + Math.sin(angle) * 0.075, pz = z + Math.cos(angle) * 0.075, py = y + 0.07 + level * 0.22;
        s.ring(0.052, 0.003, [px, py, pz], wire, Math.PI).rotation.set(Math.PI / 2, 0, -angle + Math.PI, 'YXZ');
        s.rod([x, py + 0.02, z], [px, py, pz], 0.003, wire);
        if (random() < 0.55 + (1 - mood.wear) * 0.4) {
          const sheet = leaflet([px, py + 0.09, pz], 0, leafletHues[(level * 4 + k) % leafletHues.length]);
          sheet.rotation.set(-0.12, angle, 0, 'YXZ');
        }
      }
    } else if (a.leaflets === 'single') {
      const [x, y, z] = rackAt;
      const card = s.material('#f1eee2', { roughness: 0.85 });
      const hue = leafletHues[Math.floor(random() * leafletHues.length)];
      s.box([0.125, 0.09, 0.07], [x, y + 0.045, z], card);
      s.box([0.125, 0.22, 0.006], [x, y + 0.11, z - 0.04], card).rotation.x = -0.12;
      s.label('TAKE ONE', 0.11, 0.045, [x, y + 0.045, z + 0.0355], '#ffffff', hue);
      const stock = Math.max(1, Math.round((1 - mood.wear) * 5));
      for (let k = 0; k < stock; k++) leaflet([x, y + 0.13 - k * 0.002, z - 0.02 + k * 0.008], -0.12, hue);
    }

    // ---- Comfort ---------------------------------------------------------------------------
    const comfortAt: P3 = a.table === 'round' ? [0.28, H, -0.05] : [hx * 0.72, H, hz * (a.abandoned ? -0.05 : 0.35)];
    if (a.comfort === 'tissues') {
      const [x, y, z] = comfortAt;
      const card = s.mesh(new RoundedBoxGeometry(0.23, 0.08, 0.12, 2, 0.008), s.material(aged(mood.cheer > 0.5 ? '#7fc0d8' : '#a9b8c2'), { roughness: 0.7 }), [x, y + 0.04, z]);
      card.rotation.y = (random() - 0.5) * 0.8;
      s.box([0.1, 0.002, 0.03], [x, y + 0.081, z], s.material('#f8f8f4')).rotation.y = card.rotation.y;
      const tissue = s.mesh(new THREE.ConeGeometry(0.045, 0.1, 5), s.material('#fbfbf8', { roughness: 0.95 }), [x, y + 0.115, z]);
      tissue.rotation.set(0.15, random() * 3, 0.3);
      for (let i = 0; i < Math.round((1 - mood.cheer) * 3); i++) s.mesh(new THREE.IcosahedronGeometry(0.026, 0), s.material('#f4f3ee', { roughness: 0.95 }), [x - 0.12 - random() * 0.12, y + 0.02, z + (random() - 0.5) * 0.14]).rotation.set(random() * 3, random() * 3, 0);
    } else if (a.comfort === 'sanitiser') {
      const [x, y, z] = comfortAt;
      s.cylinder(0.035, 0.038, 0.14, [x, y + 0.07, z], new THREE.MeshStandardMaterial({ color: '#cfeef2', transparent: true, opacity: 0.75, roughness: 0.15 }), 16);
      s.cylinder(0.03, 0.03, 0.08 * mix(1, 0.3, mood.wear), [x, y + 0.01 + 0.04 * mix(1, 0.3, mood.wear), z], s.material('#8fd6e0', { roughness: 0.2 }), 14);
      s.cylinder(0.018, 0.022, 0.03, [x, y + 0.155, z], s.material('#f4f4f0'), 12);
      s.cylinder(0.005, 0.005, 0.045, [x, y + 0.19, z], s.material('#f4f4f0'), 8);
      s.box([0.014, 0.012, 0.06], [x, y + 0.215, z + 0.022], s.material('#f4f4f0'));
      s.label('HANDS', 0.055, 0.04, [x, y + 0.07, z + 0.039], '#ffffff', '#2a8fb8');
    } else if (a.comfort === 'water') {
      const [x, y, z] = comfortAt;
      const glass = new THREE.MeshStandardMaterial({ color: '#dff3f6', transparent: true, opacity: 0.45, roughness: 0.06 });
      s.cylinder(0.055, 0.05, 0.2, [x, y + 0.1, z], glass, 18);
      s.cylinder(0.048, 0.045, 0.12 * mix(1, 0.4, mood.wear) + 0.01, [x, y + 0.012 + (0.12 * mix(1, 0.4, mood.wear)) / 2, z], new THREE.MeshStandardMaterial({ color: '#a9d8e6', roughness: 0.1, transparent: true, opacity: 0.85 }), 16);
      s.ring(0.035, 0.006, [x + 0.065, y + 0.11, z], glass, Math.PI).rotation.z = -Math.PI / 2;
      const cups = 2 + Math.floor(random() * 5);
      for (let i = 0; i < cups; i++) s.cylinder(0.034, 0.025, 0.08, [x - 0.11, y + 0.04 + i * 0.012, z + 0.03], s.material('#f8f8f4', { roughness: 0.5 }), 14);
    }

    // ---- Toys ------------------------------------------------------------------------------
    const toyAt: P3 = a.table === 'round' ? [-0.26, H, -0.1] : [-hx * 0.72, H, -hz * 0.3];
    const brickHues = ['#d5202a', '#2a62b8', '#f2c21a', '#3aa64a', '#f08a1e', '#f4f4ee'];
    const brickGeo = (studsX: number) => {
      const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(studsX * 0.032, 0.038, 0.064).translate(0, 0.019, 0)];
      for (let i = 0; i < studsX; i++) for (const dz of [-0.016, 0.016]) parts.push(new THREE.CylinderGeometry(0.0105, 0.0105, 0.009, 10).translate((i - (studsX - 1) / 2) * 0.032, 0.0425, dz));
      const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
      for (const part of parts) part.dispose();
      return merged;
    };
    const bricks = [brickGeo(2), brickGeo(4)];
    const brickPaint = brickHues.map((hue) => s.material(aged(hue).lerp(new THREE.Color(hue), 0.45), { roughness: 0.4 + mood.wear * 0.4 }));
    const brick = (at: P3, rotation: P3, size = Math.floor(random() * 2)) => {
      const mesh = s.mesh(bricks[size], brickPaint[Math.floor(random() * brickPaint.length)], at);
      mesh.rotation.set(...rotation);
      return mesh;
    };
    const tub = (x: number, y: number, z: number, lying: boolean) => {
      const plastic = s.material(aged(['#2a62b8', '#d5202a', '#3aa64a', '#f2c21a'][Math.floor(random() * 4)]), { roughness: 0.45, side: THREE.DoubleSide });
      const bucket = s.mesh(new THREE.CylinderGeometry(0.115, 0.095, 0.17, 20, 1, true), plastic, [x, y + 0.085, z]);
      const floor = s.cylinder(0.095, 0.095, 0.008, [x, y + 0.004, z], plastic, 20);
      const rim = s.ring(0.116, 0.006, [x, y + 0.17, z], plastic);
      rim.rotation.x = Math.PI / 2;
      if (lying) {
        for (const part of [bucket, floor, rim]) {
          const offset = part.position.y - y - 0.085;
          part.rotation.z = Math.PI / 2 - 0.06;
          if (part === rim) part.rotation.set(0, Math.PI / 2, 0);
          part.position.set(x - offset, y + 0.108, z);
        }
      }
    };
    if (a.toys === 'tub') {
      const [x, y, z] = toyAt;
      tub(x, y, z, false);
      const heap = 7 + Math.round(mood.density * 6);
      for (let i = 0; i < heap; i++) {
        const r = random() * 0.065, angle = random() * 6;
        brick([x + Math.cos(angle) * r, y + 0.1 + random() * 0.06, z + Math.sin(angle) * r], [random() * 1.2 - 0.6, random() * 6, random() * 1.2 - 0.6]);
      }
      brick([x + 0.17, y, z + 0.1], [0, random() * 6, 0]);
    } else if (a.toys === 'tower') {
      const [x, y, z] = toyAt;
      const floors = 5 + Math.floor(random() * 5);
      let lean = 0;
      for (let i = 0; i < floors; i++) {
        lean += (random() - 0.5) * 0.012;
        brick([x + lean, y + i * 0.038, z + (random() - 0.5) * 0.008], [0, (random() < 0.5 ? 0 : Math.PI / 2) + (random() - 0.5) * 0.15, 0], i < 2 ? 1 : Math.floor(random() * 2));
      }
      for (let i = 0; i < 3; i++) brick([x + 0.12 + random() * 0.1, y, z + 0.06 + random() * 0.12], [0, random() * 6, 0]);
    } else if (a.toys === 'spilled') {
      const [x, y, z] = toyAt;
      tub(x, y, z, true);
      const loose = 9 + Math.round(mood.density * 7);
      for (let i = 0; i < loose; i++) {
        const far = random();
        const bx = x + 0.12 + far * hx * 0.9, bz = z + (random() - 0.2) * hz * 1.4;
        const off = Math.abs(bz) > hz + 0.04 || random() < 0.25;
        if (off) brick([x - 0.1 + random() * 0.5, 0, (hz + 0.12 + random() * 0.3) * (random() < 0.8 ? 1 : -1)], [random() < 0.3 ? Math.PI / 2 : 0, random() * 6, 0]);
        else brick([bx, y + 0.008, bz], [0, random() * 6, random() < 0.25 ? Math.PI / 2 : 0]);
      }
    } else if (a.toys === 'beads') {
      const [x, y, z] = toyAt;
      const wood = s.material('#d9b47a', { roughness: 0.6 });
      s.mesh(new RoundedBoxGeometry(0.26, 0.03, 0.2, 2, 0.01), wood, [x, y + 0.015, z]);
      const wires = ['#d5202a', '#2a62b8', '#f2c21a'];
      wires.forEach((hue, index) => {
        const z0 = z + (index - 1) * 0.06;
        const high = 0.2 + random() * 0.1;
        const pts: P3[] = [[x - 0.1, y + 0.03, z0], [x - 0.09, y + high * 0.7, z0 + 0.03], [x - 0.02, y + high, z0 - 0.02], [x + 0.03, y + high * 0.55, z0 + 0.04], [x + 0.08, y + high * 0.85, z0], [x + 0.105, y + 0.03, z0 - (index - 1) * 0.02]];
        s.tube(pts, 0.004, s.material(hue, { roughness: 0.4 }));
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const beads = 3 + Math.floor(random() * 3);
        for (let b = 0; b < beads; b++) {
          const p = curve.getPoint(0.06 + (b / beads) * 0.16 + (random() < 0.3 ? 0.7 : 0));
          const bead = s.ball([0.017, 0.017, 0.017], [p.x, p.y, p.z], brickPaint[(index + b) % 5], 10);
          if (b % 2) bead.scale.set(0.02, 0.014, 0.02);
        }
      });
    }

    return s.finish();
  },
});

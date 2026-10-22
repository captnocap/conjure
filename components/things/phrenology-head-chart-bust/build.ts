import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bustForm, headForm, paint } from './head';

const FACULTIES = ['Causality', 'Mirth', 'Benevolence', 'Veneration', 'Firmness', 'Self Esteem', 'Parental Love', 'Amativeness', 'Time', 'Tune', 'Order', 'Ideality', 'Hope', 'Wonder', 'Caution', 'Sublimity', 'Conscience', 'Acquisitive', 'Secretive', 'Destructive', 'Combative', 'Friendship', 'Approbation', 'Constancy', 'Inhabitive', 'Vitality', 'Language', 'Calculation', 'Imitation', 'Locality', 'Form', 'Weight'];
const JOKES = ['SNACKS', 'WIFI PASSWORD', 'NAPS', 'MY EX', 'ONE SONG, 1998', 'DOOM', 'REGRET', 'KEYS?', 'CATS', 'TAXES', 'MEMES', 'COFFEE', 'DREAD', 'LATER', 'PIZZA', 'EMAIL', 'THAT ONE THING', 'OLD PIN CODES', 'TV QUOTES', 'WHY I CAME IN HERE', 'SHAME', 'DOGS', 'PLOT HOLES', 'BEES', 'MONDAY', 'LUNCH', 'IDK', 'VIBES', 'SPITE', 'ERROR 404', 'TABS', 'SOCKS'];
const SEEDS: readonly (readonly [number, number, boolean])[] = [
  [0, 40, false], [0, 60, false], [0, 82, false], [180, 68, false], [180, 44, false], [180, 20, false], [180, -8, false],
  [24, 37, true], [47, 31, true], [68, 23, true], [30, 58, true], [60, 51, true], [86, 39, true], [101, 15, true], [42, 75, true], [84, 65, true],
  [113, 44, true], [129, 17, true], [121, -12, true], [141, 57, true], [151, 29, true], [156, 1, true], [165, -22, true], [33, 13, true],
];
const toDir = (azDeg: number, latDeg: number) => {
  const az = azDeg * Math.PI / 180, lat = latDeg * Math.PI / 180;
  return [Math.sin(az) * Math.cos(lat), Math.sin(lat), Math.cos(az) * Math.cos(lat)] as const;
};
const mapped = (X: number, Y: number, Z: number) => Y - (Z > 0 ? 0.5 * Math.pow(Z, 0.8) - 0.03 : -0.42 * Math.pow(-Z, 0.8) - 0.03) + (Z > 0.2 && Y > 0 && Y < 0.3 && Math.abs(X) > 0.3 ? 0.2 : 0);

export default defineThing({
  questions: {
    labels: choice('How is the skull labelled?', {
      script: 'Victorian black copperplate: each region named in small slanting script.',
      numbered: 'Numbered zones only, bold blue numerals keyed to a chart somewhere else.',
      washed: 'Each region tinted a different pale colour wash, with small numbers.',
      parody: 'A modern parody: block capitals with joke labels like SNACKS and WIFI PASSWORD in bright marker.',
      unfinished: 'Half done: the lines are drawn but most regions are still empty.',
    }),
    circled: choice('Which region has someone circled in red?', {
      none: 'None; it is unmarked.',
      brow: 'The middle of the forehead: reason and causality.',
      temple: 'Above the ear: destructiveness and secrecy.',
      crown: 'The crown: self-esteem and firmness.',
      eye: 'Just beside the eye: language.',
    }),
    role: choice('How does it sit in the room?', {
      instrument: 'As a serious instrument, squared up with brass calipers and a measuring tape at its base.',
      curiosity: 'As a curiosity under a tall glass dome with a price tag.',
      hatstand: 'As a hat stand: someone has put a hat on it.',
      bookend: 'As a bookend, shoved up against a leaning row of old books.',
    }),
    hat: choice('If it wears a hat, which?', {
      bowler: 'A black bowler.', cap: 'A tweed flat cap pulled low.', headphones: 'A pair of big modern headphones.', party: 'A paper party hat with a pom-pom.',
    }),
    glaze: choice('What colour is the ceramic?', {
      white: 'Bright white glaze.', cream: 'Warm cream, the old-teapot colour.', blue: 'Pale duck-egg blue.', black: 'Glossy black with the chart in pale slip.',
    }),
    happened: choice('What has happened to it?', {
      nothing: 'Nothing; it is whole.',
      chipped: 'A chunk is chipped out of the crown and the nose tip is gone, showing red-brown clay.',
      cracked: 'A dark crack runs down across the forehead, glued long ago.',
      stained: 'A brown tide-mark of old tea or damp has soaked up from the base.',
    }),
    face: choice('What expression does the blank face have?', {
      serene: 'Serene and symmetrical.', stern: 'Stern: heavy brow and a downturned mouth.', smirk: 'A faint knowing smile.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const size = 0.115, seed = context.seed;
    const side = random() < 0.5 ? -1 : 1;
    const black = a.glaze === 'black';
    const body = { white: '#f4f2ec', cream: '#eee1bf', blue: '#cfe0df', black: '#222126' }[a.glaze];
    const ink = black ? '#efe8d4' : a.labels === 'numbered' ? '#1f3f9a' : a.labels === 'parody' ? '#1d1d22' : '#27231f';

    const seeds: { dir: readonly [number, number, number]; az: number; lat: number; name: string }[] = [];
    const names = (a.labels === 'parody' ? JOKES : FACULTIES).slice();
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    for (const [az, lat, pair] of SEEDS)
      for (const sgn of pair ? [1, -1] : [1]) {
        const jaz = az * sgn + (random() - 0.5) * 7, jl = lat + (random() - 0.5) * 6;
        seeds.push({ dir: toDir(jaz, jl), az: jaz, lat: jl, name: names[seeds.length % names.length] });
      }
    const nearest = (X: number, Y: number, Z: number) => {
      let best = -2, second = -2, id = 0;
      for (let i = 0; i < seeds.length; i++) {
        const d = seeds[i].dir, dot = d[0] * X + d[1] * Y + d[2] * Z;
        if (dot > best) { second = best; best = dot; id = i; } else if (dot > second) second = dot;
      }
      return { id, edge: Math.acos(Math.min(1, second)) - Math.acos(Math.min(1, best)) };
    };
    const target = { none: null, brow: toDir(0, 42), temple: toDir(side * 86, 36), crown: toDir(side * 20, 72), eye: toDir(side * 33, 13) }[a.circled];
    const circledId = target ? nearest(target[0], target[1], target[2]).id : -1;
    const washes = ['#f2c9c2', '#f3e2a8', '#cfe3bd', '#bfdbe6', '#d9c8e6', '#f1cfa6', '#c4e2d4'].map((hex) => new THREE.Color(hex));

    const map = paint(1024, 512, (ctx, W, H) => {
      const w = 512, h = 256;
      const image = ctx.createImageData(w, h);
      const base = new THREE.Color(body), line = new THREE.Color(ink), c = new THREE.Color();
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const az = (x / w - 0.5) * Math.PI * 2, th = (y + 0.5) / h * Math.PI;
          const X = Math.sin(az) * Math.sin(th), Y = Math.cos(th), Z = Math.cos(az) * Math.sin(th);
          const m = mapped(X, Y, Z);
          c.copy(base);
          if (m > 0) {
            const hit = nearest(X, Y, Z);
            if (a.labels === 'washed') c.lerp(washes[hit.id % washes.length], black ? 0.35 : 0.85);
            if (hit.id === circledId) c.lerp(new THREE.Color('#e8483a'), 0.12);
            if (hit.edge < 0.036 || m < 0.028) c.copy(line);
          }
          const k = (y * w + x) * 4;
          image.data[k] = c.r ** (1 / 2.2) * 255; image.data[k + 1] = c.g ** (1 / 2.2) * 255; image.data[k + 2] = c.b ** (1 / 2.2) * 255; image.data[k + 3] = 255;
        }
      const small = document.createElement('canvas');
      small.width = w; small.height = h;
      small.getContext('2d')!.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, 0, 0, W, H);

      const spot = (az: number, lat: number) => [((az / 360 + 0.5) % 1 + 1) % 1 * W, (90 - lat) / 180 * H, Math.max(0.3, Math.cos(lat * Math.PI / 180))] as const;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink;
      seeds.forEach((region, index) => {
        if (a.labels === 'unfinished' && random() < 0.7) return;
        const [x, y, squeeze] = spot(region.az, region.lat);
        ctx.save();
        ctx.translate(x, y); ctx.scale(1 / squeeze, 1); ctx.rotate((random() - 0.5) * 0.3);
        if (a.labels === 'numbered' || a.labels === 'washed') {
          ctx.font = `bold ${a.labels === 'numbered' ? 32 : 22}px Georgia, serif`;
          ctx.fillText(String(index + 1), 0, 0);
        } else {
          const parts = region.name.split(' ');
          const linesOut = parts.length > 2 ? [parts.slice(0, Math.ceil(parts.length / 2)).join(' '), parts.slice(Math.ceil(parts.length / 2)).join(' ')] : parts;
          ctx.font = a.labels === 'parody' ? 'bold 15px Arial, sans-serif' : 'italic bold 16px Georgia, serif';
          if (a.labels === 'parody') ctx.fillStyle = ['#1d1d22', '#c2262e', '#1c56b3', '#1f7a3d'][index % 4];
          linesOut.forEach((text, i) => ctx.fillText(text, 0, (i - (linesOut.length - 1) / 2) * 16, 62 * squeeze + 20));
        }
        ctx.restore();
      });
      if (circledId >= 0) {
        const [x, y, squeeze] = spot(seeds[circledId].az, seeds[circledId].lat);
        ctx.strokeStyle = '#d3202a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i <= 40; i++) {
            const t = (i / 40) * Math.PI * 2.15 + pass;
            const r = 30 + pass * 4 + Math.sin(t * 3 + pass) * 2.5;
            const px = x + Math.cos(t) * r / squeeze, py = y + Math.sin(t) * r * 0.92;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.save(); ctx.translate(x + 48 / squeeze, y - 30); ctx.scale(1 / squeeze, 1);
        ctx.fillStyle = '#d3202a'; ctx.font = 'bold 30px Georgia, serif'; ctx.fillText('!', 0, 0); ctx.restore();
      }
      // Eyebrows and lids inked on the blank face.
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      for (const sgn of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(W / 2 + sgn * 22, H * 0.405); ctx.quadraticCurveTo(W / 2 + sgn * 50, H * 0.385, W / 2 + sgn * 78, H * 0.41); ctx.stroke();
      }
      // Crazing: a web of fine cracks in the glaze that thickens with age.
      ctx.strokeStyle = black ? 'rgba(240,230,210,0.22)' : 'rgba(70,55,35,0.3)'; ctx.lineWidth = 1;
      const cracks = Math.round(mix(20, 520, mood.wear));
      for (let i = 0; i < cracks; i++) {
        let x = random() * W, y = random() * H, ang = random() * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { ang += (random() - 0.5) * 1.6; x += Math.cos(ang) * 16; y += Math.sin(ang) * 11; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (a.happened === 'cracked') {
        ctx.strokeStyle = black ? '#d9cfb5' : '#2e241a'; ctx.lineWidth = 4;
        let x = W / 2 + side * 60, y = 6;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (y < H * 0.62) { x += (random() - 0.5) * 26 - side * 3; y += 8 + random() * 14; ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(190,150,60,0.5)'; ctx.lineWidth = 9; ctx.stroke();
      }
      if (a.happened === 'stained') {
        const edge = H * mix(0.76, 0.66, mood.wear);
        const grad = ctx.createLinearGradient(0, edge - 40, 0, H);
        grad.addColorStop(0, 'rgba(122,84,38,0)'); grad.addColorStop(0.12, 'rgba(122,84,38,0.55)'); grad.addColorStop(0.2, 'rgba(150,110,60,0.3)'); grad.addColorStop(1, 'rgba(120,84,40,0.5)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, edge - 40 + Math.sin(x * 0.031 + seed) * 16 + Math.sin(x * 0.011) * 22);
        ctx.lineTo(W, H); ctx.fill();
      }
    });

    const cuts: { n: [number, number, number]; d: number }[] = [];
    if (a.happened === 'chipped') { const l = Math.hypot(0.45, 0.8, 0.3); cuts.push({ n: [side * 0.45 / l, 0.8 / l, 0.3 / l], d: 0.83 }); }
    const expr = { serene: { brow: 0.8, smile: 0 }, stern: { brow: 1.5, smile: -0.35 }, smirk: { brow: 0.7, smile: 0.4 } }[a.face];
    const head = headForm({
      size, seed, base: '#ffffff', cavity: '#b9b3a6', cavityAmount: 0.5, scar: '#a85c3c', eyes: 'blank', ...expr,
      noseBreak: a.happened === 'chipped' ? 0.55 : 0, cuts, crisp: 0.92, jaw: 0.55,
    });
    const glaze = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: mix(0.14, 0.4, mood.wear), metalness: 0.02 });
    const plain = new THREE.MeshStandardMaterial({ color: body, roughness: mix(0.14, 0.4, mood.wear) });
    const Y0 = 0.07 + 2.85 * size;
    const group = new THREE.Group();
    group.position.y = Y0;
    const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = group) => { const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    add(head.geometry, glaze);
    const chest = bustForm({ size, seed, base: body, cavity: black ? '#0f0f12' : '#b9b3a6', cavityAmount: 0.3, broad: 0.72, drape: 0.12 });
    chest.deleteAttribute('uv');
    add(chest, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.14, 0.4, mood.wear) }));
    s.root.add(group);
    const title = s.label(a.labels === 'parody' ? 'MY BRAIN' : 'PHRENOLOGY', 0.15, 0.036, [0, Y0 - 2.1 * size, 0.092], ink, body);
    title.rotation.x = -0.1;

    // Turned base.
    const baseMaterial = black ? s.material('#3a2c22', { roughness: 0.5 }) : plain;
    s.lathe([[0, 0], [0.1, 0], [0.105, 0.012], [0.098, 0.03], [0.07, 0.045], [0.062, 0.062], [0.075, 0.072], [0.04, 0.076], [0, 0.076]], baseMaterial, [0, 0, -0.012]);

    const brass = s.material('#c9a240', { metalness: 0.85, roughness: 0.28 });
    if (a.role === 'instrument') {
      // Outside calipers: two bowed legs on a pivot, laid at the foot of the base.
      const cal = new THREE.Group();
      for (const sgn of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sgn * 0.07, 0, 0.05), new THREE.Vector3(sgn * 0.105, 0, 0.13), new THREE.Vector3(sgn * 0.09, 0, 0.2), new THREE.Vector3(sgn * 0.04, 0, 0.25)]);
        add(new THREE.TubeGeometry(curve, 24, 0.007, 6), brass, cal);
      }
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 14), brass, cal);
      cal.position.set(side * 0.2, 0.008, 0.02); cal.rotation.y = side * 0.5;
      s.root.add(cal);
      const tape = s.material('#e7d9a8');
      s.cylinder(0.028, 0.028, 0.016, [-side * 0.17, 0.008, 0.09], s.material('#7a2f2a', { roughness: 0.5 }), 20);
      s.tube([[-side * 0.17 + 0.028, 0.004, 0.09], [-side * 0.1, 0.003, 0.15], [-side * 0.02, 0.003, 0.17], [side * 0.05, 0.003, 0.2]], 0.004, tape);
    } else if (a.role === 'curiosity') {
      const clear = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
      const r = 0.2, hDome = Y0 + size * 1.25;
      const dome = add(new THREE.LatheGeometry([...Array.from({ length: 2 }, (_u, i) => new THREE.Vector2(r, i * (hDome - r))), ...Array.from({ length: 12 }, (_u, i) => new THREE.Vector2(Math.cos((i + 1) / 12 * Math.PI / 2) * r, hDome - r + Math.sin((i + 1) / 12 * Math.PI / 2) * r))], 36), clear, s.root);
      dome.castShadow = false;
      s.cylinder(r + 0.02, r + 0.025, 0.03, [0, -0.015, 0], s.material('#3a2c22', { roughness: 0.5 }), 36);
      s.cylinder(r + 0.004, r + 0.004, 0.006, [0, 0.003, 0], s.material('#2f5a3e', { roughness: 0.95 }), 36);
      s.ball([0.014, 0.014, 0.014], [0, hDome + 0.01, 0], brass, 10);
      const tag = s.label('£' + (3 + Math.floor(random() * 40)), 0.07, 0.04, [side * 0.12, 0.05, r + 0.012], '#2d2a26', '#e9d9ae'); tag.rotation.z = side * 0.25;
      s.rod([side * 0.12, 0.07, r + 0.012], [side * 0.03, hDome + 0.01, 0.01], 0.0012, s.material('#8a7a5a'));
    } else if (a.role === 'bookend') {
      let x = side * 0.115;
      const covers = ['#6b2a2a', '#2f4a3a', '#2a3554', '#7a5a2a', '#3a2a3f', '#8a7a5f'];
      const n = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) {
        const w = 0.028 + random() * 0.03, hBook = 0.2 + random() * 0.09, lean = -side * (0.05 + i * 0.045);
        const book = s.box([w, hBook, 0.16], [x + side * (w / 2 + Math.sin(-lean * side) * hBook * 0.5), hBook / 2 * Math.cos(lean), -0.02], s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.8 }));
        book.rotation.z = lean;
        const pages = s.box([w * 0.78, hBook * 0.96, 0.004], [book.position.x, book.position.y, 0.061], s.material('#e9dfc4')); pages.rotation.z = lean;
        x += side * (w + 0.004 + Math.sin(0.045) * hBook * 0.6);
      }
    }
    const hatted = a.role === 'hatstand';
    if (hatted) {
      const hat = new THREE.Group();
      hat.position.set(0, Y0, 0);
      if (a.hat === 'bowler') {
        const felt = s.material('#18181b', { roughness: 0.75 });
        const crown = add(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), felt, hat);
        crown.scale.set(0.82 * size, 0.78 * size, 0.98 * size); crown.position.set(0, 0.66 * size, -0.05 * size);
        const brim = add(new THREE.TorusGeometry(1.02 * size, 0.07 * size, 8, 36), felt, hat); brim.rotation.x = Math.PI / 2; brim.scale.set(0.94, 1.1, 0.5); brim.position.set(0, 0.66 * size, -0.05 * size);
        const band = add(new THREE.CylinderGeometry(0.83 * size, 0.83 * size, 0.14 * size, 24, 1, true), s.material('#3c3c44', { roughness: 0.4 }), hat); band.scale.z = 1.19; band.position.set(0, 0.74 * size, -0.05 * size);
        hat.rotation.set(-0.12, 0, side * 0.12);
      } else if (a.hat === 'cap') {
        const tweed = s.material('#6f6248', { roughness: 0.95 });
        const crown = add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tweed, hat);
        crown.scale.set(0.9 * size, 0.42 * size, 1.12 * size); crown.position.set(0, 0.6 * size, 0.02 * size); crown.rotation.x = 0.22;
        const peak = add(new THREE.CylinderGeometry(0.6 * size, 0.6 * size, 0.04 * size, 20, 1, false, -1.1, 2.2), tweed, hat); peak.position.set(0, 0.42 * size, 0.62 * size); peak.rotation.x = 0.35;
        add(new THREE.SphereGeometry(0.07 * size, 8, 6), tweed, hat).position.set(0, 1.02 * size, -0.1 * size);
      } else if (a.hat === 'headphones') {
        const dark = s.material('#1f2024', { roughness: 0.5 });
        const bandGeometry = new THREE.TorusGeometry(0.98 * size, 0.055 * size, 8, 30, Math.PI);
        add(bandGeometry, dark, hat).position.set(0, 0.05 * size, -0.1 * size);
        for (const sgn of [-1, 1]) {
          const cup = add(new THREE.CylinderGeometry(0.3 * size, 0.34 * size, 0.2 * size, 20), s.material(mood.cheer > 0.5 ? '#e0483a' : '#3b6ea8', { roughness: 0.45 }), hat);
          cup.rotation.z = Math.PI / 2; cup.position.set(sgn * 0.9 * size, -0.02 * size, -0.1 * size);
          add(new THREE.TorusGeometry(0.31 * size, 0.07 * size, 8, 20), dark, hat).position.set(sgn * 0.8 * size, -0.02 * size, -0.1 * size);
          hat.children[hat.children.length - 1].rotation.y = Math.PI / 2;
        }
      } else {
        const cone = add(new THREE.ConeGeometry(0.45 * size, 1.1 * size, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.6, side: THREE.DoubleSide }), hat);
        cone.position.set(side * 0.2 * size, 1.4 * size, 0); cone.rotation.z = -side * 0.22;
        for (let i = 0; i < 4; i++) { const stripe = add(new THREE.TorusGeometry((0.4 - i * 0.095) * size, 0.022 * size, 6, 20), s.material(['#d9304a', '#2f7fd1'][i % 2]), hat); stripe.rotation.set(Math.PI / 2, -side * 0.22, 0); stripe.position.set(side * (0.1 + i * 0.058) * size, (0.98 + i * 0.25) * size, 0); }
        add(new THREE.SphereGeometry(0.1 * size, 10, 8), s.material('#d9304a'), hat).position.set(side * 0.33 * size, 1.98 * size, 0);
      }
      s.root.add(hat);
    }
    return s.finish();
  },
});

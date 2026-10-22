import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

interface Item { matrix: THREE.Matrix4; color: THREE.ColorRepresentation }
type Sort = 'flat4' | 'flat2' | 'dome' | 'star' | 'flower';
interface Button { sort: Sort; radius: number; color: string }

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const KINDS = {
  pearl: 'Small mother-of-pearl shirt buttons, white and faintly rainbowed.',
  military: 'Domed brass and silver uniform buttons, cut from tunics and greatcoats.',
  toy: 'Big bright plastic novelty buttons: stars, flowers and primary colours from children\'s cardigans.',
  coat: 'Large dark horn and tortoiseshell coat buttons in browns, navy and black.',
  jet: 'Glossy black glass mourning buttons.',
  mixed: 'Everything together, no two alike.',
} as const;
type Kind = keyof typeof KINDS;

export default defineThing({
  questions: {
    tin: choice('What tin is it?', {
      royal: 'An oval royal souvenir tin, blue and gold with a portrait medallion on the lid.',
      floral: 'A rounded rectangular tin of pink roses on cream.',
      toffee: 'An octagonal toffee tin in dark green with a gold lattice.',
      plain: 'A tall bare steel canister with a paper label that says BUTTONS.',
      tartan: 'A round shortbread tin in red tartan.',
    }),
    state: choice('How was it left?', {
      shut: 'Lid pressed on, only a few stray buttons outside it.',
      sorted: 'Open, with buttons laid out in rows on the table by someone hunting for a match.',
      tipped: 'Knocked over on its side, buttons pouring out in a fan.',
      open: 'Lid off beside it, heaped to the brim and overflowing onto the table.',
    }),
    kinds: choice('What kind of buttons are they mostly?', KINDS),
    amount: score('How many buttons are there?', ['A thin scatter, the tin nearly used up', 'A good handful', 'Hundreds, generations of them']),
    keepsake: choice('What else turns up among the buttons?', {
      none: 'Nothing, only buttons.',
      card: 'A shop card with six matching buttons still sewn to it, never used.',
      ring: 'A plain gold wedding ring.',
      medal: 'A service medal on a striped ribbon.',
      key: 'A small key nobody can place.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    // Cross-section of each tin as a radius for every angle, so dents and lids work on any shape.
    const form = {
      tartan: { H: 0.06, r: () => 0.088 },
      royal: { H: 0.058, r: (t: number) => 1 / Math.hypot(Math.cos(t) / 0.108, Math.sin(t) / 0.076) },
      floral: { H: 0.07, r: (t: number) => (Math.abs(Math.cos(t) / 0.1) ** 5 + Math.abs(Math.sin(t) / 0.07) ** 5) ** (-1 / 5) },
      toffee: { H: 0.075, r: (t: number) => 0.082 * Math.cos(Math.PI / 8) / Math.cos(((t % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4) - Math.PI / 8) },
      plain: { H: 0.105, r: () => 0.066 },
    }[a.tin];
    const { H } = form;
    const ax = form.r(0), az = form.r(Math.PI / 2);
    const dents = Array.from({ length: 2 + Math.floor(wear * 6) }, () => ({ t: random() * Math.PI * 2, y: mix(0.15, 0.85, random()) * H, depth: mix(0.002, 0.007, random()) * mix(0.5, 1.4, wear) }));
    const shapeIt = (geometry: THREE.BufferGeometry, grow: number, dented: boolean) => {
      const pos = geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
        const t = Math.atan2(z, x), rad = Math.hypot(x, z);
        let r = form.r(t < 0 ? t + Math.PI * 2 : t) + grow;
        if (dented) for (const dent of dents) {
          const dt = Math.atan2(Math.sin(t - dent.t), Math.cos(t - dent.t));
          r -= dent.depth * Math.exp(-(dt * dt) / 0.05 - ((y - dent.y) ** 2) / 0.0004);
        }
        pos.setXYZ(v, Math.cos(t) * rad * r, y, Math.sin(t) * rad * r);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    const blemish = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = 0; i < Math.floor(wear * 46); i++) {
        ctx.fillStyle = `rgba(${110 + random() * 40},${60 + random() * 25},30,${0.25 + random() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(random() * w, random() * h, 3 + random() * w * 0.03, 2 + random() * h * 0.08, random() * 3, 0, 7);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(225,225,220,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < Math.floor(4 + wear * 40); i++) {
        const x = random() * w, y = random() * h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * w * 0.08, y + (random() - 0.5) * h * 0.3); ctx.stroke();
      }
    };
    const rose = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      ctx.fillStyle = '#5f8f4c';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + side * r * 1.2, y + r * 0.5, r * 0.75, r * 0.35, side * 0.5, 0, 7); ctx.fill(); }
      for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#c9486a', '#e27f9a', '#f2b2c2', '#c9486a'][i]; ctx.beginPath(); ctx.arc(x + (i % 2) * r * 0.12, y - i * r * 0.04, r * (1 - i * 0.23), 0, 7); ctx.fill(); }
    };
    const design = (ctx: CanvasRenderingContext2D, w: number, h: number, lid: boolean) => {
      if (a.tin === 'tartan') {
        ctx.fillStyle = '#b3202a'; ctx.fillRect(0, 0, w, h);
        const step = lid ? w / 4 : h;
        for (let pass = 0; pass < 2; pass++) {
          const span = pass ? h : w;
          for (let p = 0; p < span + step; p += step) {
            const bar = (offset: number, size: number, tint: string) => { ctx.fillStyle = tint; if (pass) ctx.fillRect(0, p + offset * step, w, size * step); else ctx.fillRect(p + offset * step, 0, size * step, h); };
            bar(0.1, 0.3, 'rgba(20,70,45,0.6)'); bar(0.55, 0.12, 'rgba(22,30,80,0.6)'); bar(0.24, 0.025, 'rgba(240,210,60,0.9)'); bar(0.8, 0.02, 'rgba(245,245,240,0.85)');
          }
        }
      } else if (a.tin === 'royal') {
        ctx.fillStyle = '#1f3f8a'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = ctx.fillStyle = '#d9b24a'; ctx.lineWidth = h * 0.05;
        if (lid) {
          ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.27, h * 0.3, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(w / 2, h * 0.43, h * 0.1, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w / 2, h * 0.68, w * 0.14, h * 0.14, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#d9b24a'; ctx.fillRect(w * 0.44, h * 0.3, w * 0.12, h * 0.035);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(w * (0.455 + i * 0.045), h * 0.29, h * 0.022, 0, 7); ctx.fill(); }
        } else {
          ctx.fillRect(0, h * 0.06, w, h * 0.07); ctx.fillRect(0, h * 0.87, w, h * 0.07);
          for (let x = w / 16; x < w; x += w / 8) {
            ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.ellipse(x, h / 2, h * 0.3, h * 0.24, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#d9b24a'; ctx.fillRect(x - h * 0.14, h * 0.5, h * 0.28, h * 0.08);
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * h * 0.1, h * 0.44, h * 0.055, 0, 7); ctx.fill(); }
          }
        }
      } else if (a.tin === 'floral') {
        ctx.fillStyle = '#f1e6cc'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#d98aa0'; ctx.fillRect(0, 0, w, h * 0.07); ctx.fillRect(0, h * 0.93, w, h * 0.07);
        if (lid) for (let i = 0; i < 9; i++) rose(ctx, w / 2 + Math.cos(i * 2.4) * w * 0.05 * Math.sqrt(i) * 1.6, h / 2 + Math.sin(i * 2.4) * h * 0.05 * Math.sqrt(i) * 1.6, w * 0.075);
        else for (let x = w / 20; x < w; x += w / 10) rose(ctx, x, h * (0.42 + ((x * 7) % 3) * 0.08), h * 0.2);
      } else if (a.tin === 'toffee') {
        ctx.fillStyle = '#1f4a3a'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#d2a94a'; ctx.lineWidth = Math.max(2, h * 0.02);
        const step = lid ? w / 7 : h / 2;
        for (let p = -h; p < w + h; p += step) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p + h, h); ctx.moveTo(p + h, 0); ctx.lineTo(p, h); ctx.stroke(); }
        if (lid) {
          ctx.fillStyle = '#d2a94a'; ctx.fillRect(w * 0.14, h * 0.38, w * 0.72, h * 0.24);
          ctx.fillStyle = '#1f4a3a'; ctx.font = `bold ${h * 0.17}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('TOFFEE', w / 2, h * 0.51, w * 0.66);
        } else { ctx.fillStyle = '#d2a94a'; ctx.fillRect(0, 0, w, h * 0.08); ctx.fillRect(0, h * 0.92, w, h * 0.08); }
      } else {
        ctx.fillStyle = '#a9adaf'; ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 3) { ctx.fillStyle = `rgba(255,255,255,${random() * 0.12})`; ctx.fillRect(0, y, w, 1.5); }
        ctx.fillStyle = '#efe6cf';
        const lx = lid ? w * 0.2 : w * 0.02, ly = lid ? h * 0.36 : h * 0.3, lw = lid ? w * 0.6 : w * 0.17, lh = lid ? h * 0.28 : h * 0.36;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = '#8d2a2a'; ctx.lineWidth = 2; ctx.strokeRect(lx + 4, ly + 4, lw - 8, lh - 8);
        ctx.fillStyle = '#2a2f55'; ctx.font = `italic bold ${lh * 0.52}px cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Buttons', lx + lw / 2, ly + lh / 2, lw * 0.85);
      }
      blemish(ctx, w, h);
    };

    const wallMap = paint(1024, 128, (ctx, w, h) => design(ctx, w, h, false));
    const lidMap = paint(512, 512, (ctx, w, h) => design(ctx, w, h, true));
    const shine = { metalness: 0.45, roughness: mix(0.3, 0.7, wear) };
    const inside = new THREE.MeshStandardMaterial({ color: '#c8b98e', metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide });
    const edgeTint = { tartan: '#8f1a22', royal: '#d9b24a', floral: '#d98aa0', toffee: '#d2a94a', plain: '#a9adaf' }[a.tin];
    const edge = new THREE.MeshStandardMaterial({ color: edgeTint, ...shine });

    const tin = new THREE.Group();
    const add = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], y = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const wall = new THREE.CylinderGeometry(1, 1, H, 96, 12, true);
    wall.translate(0, H / 2, 0);
    add(tin, shapeIt(wall, 0, true), new THREE.MeshStandardMaterial({ map: wallMap, ...shine }));
    const liner = new THREE.CylinderGeometry(1, 1, H, 96, 12, true);
    liner.translate(0, H / 2, 0);
    add(tin, shapeIt(liner, -0.0018, true), inside);
    const lip = new THREE.RingGeometry(0.975, 1.02, 96);
    lip.rotateX(-Math.PI / 2);
    add(tin, shapeIt(lip, 0, false), inside, H);
    const floor = new THREE.CircleGeometry(1, 96);
    floor.rotateX(-Math.PI / 2);
    add(tin, shapeIt(floor, 0, false), inside, 0.002);
    s.root.add(tin);

    const lid = new THREE.Group();
    const cap = new THREE.CylinderGeometry(1, 1, 0.014, 96);
    cap.translate(0, 0.007, 0);
    add(lid, shapeIt(cap, 0.003, false), [edge, new THREE.MeshStandardMaterial({ map: lidMap, ...shine }), inside]);
    s.root.add(lid);

    // The buttons themselves.
    const pools: Record<Exclude<Kind, 'mixed'>, () => Button> = {
      pearl: () => ({ sort: random() < 0.5 ? 'flat4' : 'flat2', radius: mix(0.0048, 0.008, random()), color: ['#f4f1e8', '#ece4d6', '#e9eef0', '#f0e2e4', '#dfe7e2'][Math.floor(random() * 5)] }),
      military: () => ({ sort: 'dome', radius: mix(0.007, 0.0115, random()), color: ['#c9a13c', '#d4b14a', '#b98f30', '#c4c7c9', '#2a2b2e'][Math.floor(random() * 5)] }),
      toy: () => ({ sort: (['star', 'flower', 'flat2', 'flat4', 'flower'] as const)[Math.floor(random() * 5)], radius: mix(0.0075, 0.013, random()), color: ['#e2332e', '#f2c21d', '#2c7fd1', '#2fa35a', '#e563a5', '#ef7d22', '#8a4fd0'][Math.floor(random() * 7)] }),
      coat: () => ({ sort: random() < 0.6 ? 'flat4' : 'flat2', radius: mix(0.0095, 0.015, random()), color: ['#3d2a1c', '#6b4526', '#1f2740', '#19181a', '#8a6a3c', '#4a4038'][Math.floor(random() * 6)] }),
      jet: () => ({ sort: random() < 0.6 ? 'dome' : 'flat2', radius: mix(0.0055, 0.011, random()), color: ['#121114', '#1b1a1f', '#0d0d10'][Math.floor(random() * 3)] }),
    };
    const pools5 = Object.values(pools);
    const draw = (): Button => (a.kinds === 'mixed' ? pools5[Math.floor(random() * pools5.length)]() : random() < 0.12 ? pools5[Math.floor(random() * pools5.length)]() : pools[a.kinds]());
    const lists: Record<Sort, Item[]> = { flat4: [], flat2: [], dome: [], star: [], flower: [] };
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    const put = (button: Button, at: THREE.Vector3, tilt: number, into?: THREE.Matrix4) => {
      q.setFromEuler(e.set((random() - 0.5) * 2 * tilt, random() * Math.PI * 2, (random() - 0.5) * 2 * tilt));
      const thick = button.sort === 'dome' ? 0.55 : 1;
      const matrix = new THREE.Matrix4().compose(at, q, new THREE.Vector3(button.radius, button.radius * thick, button.radius));
      if (into) matrix.premultiply(into);
      lists[button.sort].push({ matrix, color: button.color });
    };

    const total = Math.round(mix(26, 300, a.amount) * mix(0.7, 1.25, mood.density));
    const tipped = a.state === 'tipped';
    const reach = mix(0.05, 0.13, a.amount);
    let tinMatrix: THREE.Matrix4 | undefined;
    if (tipped) {
      tin.rotation.z = -Math.PI / 2;
      tin.rotation.x = (random() - 0.5) * 0.3;
      tin.position.set(-H, ax, 0);
      tin.updateMatrix();
      tinMatrix = tin.matrix.clone();
    }

    // Heap inside the tin.
    const insideCount = a.state === 'shut' ? 0 : Math.round(total * (tipped ? 0.2 : a.state === 'open' ? 0.45 : 0.3));
    const level = a.state === 'open' ? mix(0.3, 0.97, a.amount) * H : mix(0.15, 0.6, a.amount) * H;
    if (insideCount) {
      const bed = new THREE.CylinderGeometry(1, 1, tipped ? 0.012 : level, 48);
      bed.translate(0, tipped ? H * 0.55 : level / 2, 0);
      const filler = add(tin, shapeIt(bed, tipped ? -0.02 : -0.003, false), new THREE.MeshStandardMaterial({ color: a.kinds === 'pearl' ? '#b9b3a6' : a.kinds === 'military' ? '#7d6a3a' : '#4a433d', roughness: 0.9 }), 0.001);
      filler.castShadow = false;
      if (tipped) { filler.rotation.z = 0.5; filler.position.x = -ax * 0.45; }
      for (let i = 0; i < insideCount; i++) {
        const t = random() * Math.PI * 2, rad = Math.sqrt(random()) * 0.88;
        const r = form.r(t) * rad;
        const local = tipped
          ? new THREE.Vector3(-ax * mix(0.2, 0.95, random()) , H * mix(0.35, 1, random()), Math.sin(t) * r * 0.7)
          : new THREE.Vector3(Math.cos(t) * r, level + 0.002 + random() * 0.006 + (a.state === 'open' ? (1 - rad) * 0.012 : 0), Math.sin(t) * r);
        put(draw(), local, 0.5, tinMatrix);
      }
    }

    // Buttons on the table.
    const outside = a.state === 'shut' ? Math.max(4, Math.round(total * 0.06)) : total - insideCount;
    const rows: { button: Button; count: number }[] = [];
    let loose = outside;
    if (a.state === 'sorted') {
      const n = 3 + Math.floor(a.amount * 3);
      for (let r = 0; r < n; r++) rows.push({ button: draw(), count: 5 + Math.floor(random() * 5) });
      rows.sort((p, r) => new THREE.Color(p.button.color).getHSL({ h: 0, s: 0, l: 0 }).l - new THREE.Color(r.button.color).getHSL({ h: 0, s: 0, l: 0 }).l);
      rows.forEach((row, r) => {
        const pitch = row.button.radius * 2.35;
        for (let c = 0; c < row.count; c++)
          put({ ...row.button, radius: row.button.radius * mix(0.94, 1.06, random()) }, new THREE.Vector3(-ax * 0.9 + c * pitch + (random() - 0.5) * 0.003, 0.0015, az + 0.03 + r * 0.032 + (random() - 0.5) * 0.003), 0.03);
        loose -= row.count;
      });
      loose = Math.max(8, Math.round(loose * 0.5));
    }
    for (let i = 0; i < loose; i++) {
      const button = draw();
      let at: THREE.Vector3;
      if (tipped) {
        const far = Math.abs(random() + random() - 1) * reach * 1.7 + 0.004, side = (random() - 0.5) * (az * 1.2 + far * 1.5);
        at = new THREE.Vector3(far, 0.0015 + Math.max(0, 0.03 - far) * random() * 0.7 + (i % 4) * 0.0012, side);
      } else if (a.state === 'sorted') {
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.045;
        at = new THREE.Vector3(ax + 0.06 + Math.cos(t) * r, 0.0015 + (i % 5) * 0.0015, 0.02 + Math.sin(t) * r);
      } else {
        const t = mix(-0.5, 2.3, random()), far = Math.abs(random() + random() - 1) * reach * (a.state === 'shut' ? 0.8 : 1.5) + 0.006;
        at = new THREE.Vector3(Math.cos(t) * (form.r(t < 0 ? t + Math.PI * 2 : t) + far), 0.0015 + (i % 4) * 0.0012, Math.sin(t) * (form.r(t < 0 ? t + Math.PI * 2 : t) + far));
      }
      put(button, at, 0.06);
    }

    // Where the lid went.
    if (a.state === 'shut') { lid.position.y = H - 0.008; lid.rotation.y = (random() - 0.5) * 0.3; if (wear > 0.6) lid.rotation.z = 0.03; }
    else {
      const side = tipped ? -1 : -1;
      lid.position.set(side * (ax * 1.55 + 0.03) + (tipped ? -H * 0.6 : 0), 0.0005, tipped ? az * 1.5 + 0.05 : az * 0.9 + 0.03);
      lid.rotation.set(0.05, (random() - 0.5) * 1.2, 0.04);
      lid.position.y = 0.008;
    }

    // Button meshes: one draw call per shape, holes painted on the faces.
    const face = (holes: number) => paint(128, 128, (ctx, w) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = '#b8b8b8'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(w / 2, w / 2, w * 0.36, 0, 7); ctx.stroke();
      ctx.fillStyle = '#3a3632';
      for (let i = 0; i < holes; i++) { const t = i / holes * Math.PI * 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(t) * w * 0.11, w / 2 + Math.sin(t) * w * 0.11, w * 0.055, 0, 7); ctx.fill(); }
    });
    const gloss = a.kinds === 'pearl' || a.kinds === 'jet' ? 0.18 : 0.42;
    const instance = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], items: Item[]) => {
      if (!items.length) { geometry.dispose(); for (const m of [material].flat()) { const map = (m as THREE.MeshStandardMaterial).map; map?.dispose(); m.dispose(); } return; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, index) => { mesh.setMatrixAt(index, item.matrix); mesh.setColorAt(index, new THREE.Color(item.color)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    for (const [sort, holes] of [['flat4', 4], ['flat2', 2]] as const) {
      const side = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: gloss });
      const top = new THREE.MeshStandardMaterial({ map: face(holes), roughness: gloss });
      instance(new THREE.CylinderGeometry(1, 1, 0.3, 18), [side, top, top], lists[sort]);
    }
    const dome = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    instance(dome, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: a.kinds === 'jet' ? 0.2 : 0.8, roughness: a.kinds === 'jet' ? 0.12 : 0.36 }), lists.dome);
    const outline = (points: number, inner: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i <= points * 12; i++) {
        const t = i / (points * 12) * Math.PI * 2;
        const r = inner < 0.6 ? (i % 12 === 0 ? 1 : i % 12 === 6 ? inner : NaN) : mix(inner, 1, Math.abs(Math.cos(t * points / 2)) ** 0.7);
        if (Number.isNaN(r)) continue;
        if (i === 0) shape.moveTo(r, 0); else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, -0.15, 0);
      return geometry;
    };
    instance(outline(5, 0.48), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), lists.star);
    instance(outline(6, 0.7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), lists.flower);

    // Something that is not a button.
    const spot = tipped ? new THREE.Vector3(reach * 0.7, 0, az * 0.5) : new THREE.Vector3(ax * 0.4 + 0.02, 0, az + 0.04 + (a.state === 'sorted' ? rows.length * 0.032 + 0.01 : 0));
    const gold = s.material('#d9b04a', { metalness: 0.9, roughness: 0.25 });
    if (a.keepsake === 'ring') {
      const ring = s.mesh(new THREE.TorusGeometry(0.0095, 0.0017, 8, 28), gold, [spot.x, 0.004, spot.z]);
      ring.rotation.x = Math.PI / 2 - 0.25;
    } else if (a.keepsake === 'card') {
      const card = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.001, 0.072), s.material('#ece2c6', { roughness: 0.95 }));
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0012, 0.012), s.material('#7d2b3a'));
      stripe.position.z = -0.028;
      card.add(board, stripe);
      const tintOf = ['#2c7fd1', '#f4f1e8', '#3d2a1c', '#e2332e', '#2fa35a'][Math.floor(random() * 5)];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.002, 16), s.material(tintOf, { roughness: 0.3 }));
        b.position.set((i % 2 - 0.5) * 0.022, 0.0015, -0.01 + Math.floor(i / 2) * 0.018);
        card.add(b);
      }
      card.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      card.position.set(spot.x + 0.01, 0.0045, spot.z + 0.025);
      card.rotation.set(0.04, 0.4 + random() * 0.5, 0);
      s.root.add(card);
    } else if (a.keepsake === 'medal') {
      const ribbon = paint(64, 64, (ctx) => { ['#1f3f8a', '#f1ede0', '#b3202a', '#f1ede0', '#1f3f8a'].forEach((tint, i) => { ctx.fillStyle = tint; ctx.fillRect(i * 12.8, 0, 13, 64); }); });
      const band = s.mesh(new THREE.BoxGeometry(0.03, 0.001, 0.045), new THREE.MeshStandardMaterial({ map: ribbon, roughness: 0.8 }), [spot.x, 0.004, spot.z]);
      band.rotation.y = 0.5;
      const disc = s.cylinder(0.017, 0.017, 0.003, [spot.x + 0.018, 0.0045, spot.z + 0.033], s.material('#9c6b3a', { metalness: 0.85, roughness: 0.4 }), 24);
      disc.rotation.x = 0.05;
      s.ball([0.008, 0.0015, 0.008], [spot.x + 0.018, 0.006, spot.z + 0.033], gold, 12);
    } else if (a.keepsake === 'key') {
      const iron = s.material('#6f6a62', { metalness: 0.8, roughness: 0.5 });
      const key = new THREE.Group();
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0018, 6, 20), iron);
      bow.rotation.x = Math.PI / 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.04, 8), iron);
      stem.rotation.z = Math.PI / 2;
      stem.position.x = 0.028;
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0018, 0.009), iron);
      bit.position.set(0.043, 0, 0.005);
      key.add(bow, stem, bit);
      key.traverse((node) => { node.castShadow = true; });
      key.position.set(spot.x, 0.004, spot.z);
      key.rotation.y = random() * 3;
      s.root.add(key);
    }

    if (tipped) s.root.rotation.y = -0.75 - random() * 0.3;
    return s.finish();
  },
});

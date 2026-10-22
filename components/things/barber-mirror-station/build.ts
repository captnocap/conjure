import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

const CABINETS = {
  walnut: 'Dark carved walnut with a white marble top, a century old.',
  white: 'White enamel and chrome with a black glass top, 1950s sanitary-modern.',
  pastel: 'Mint-green laminate with a speckled counter, cheerful and a little cheap.',
  bright: 'Hand-painted plywood in hot turquoise and yellow, a Caribbean shop.',
  steel: 'A black steel tool chest with red drawers, a new-school fade shop.',
  hinoki: 'Pale blond wood with a white counter, neat and modest, a Japanese tokoya.',
} as const;
const CAB: Record<keyof typeof CABINETS, { body: string; top: string; trim: string; frame: string; handle: string }> = {
  walnut: { body: '#4a2e1f', top: '#e9e6df', trim: '#35200f', frame: '#3b2414', handle: '#c9a24c' },
  white: { body: '#ece9df', top: '#1e2022', trim: '#cfd3d4', frame: '#d7dbdc', handle: '#d7dbdc' },
  pastel: { body: '#a9d6c0', top: '#d9d2c2', trim: '#f0ead8', frame: '#f0ead8', handle: '#d7dbdc' },
  bright: { body: '#16a6a8', top: '#f0c93a', trim: '#f0c93a', frame: '#e8563a', handle: '#f4efe0' },
  steel: { body: '#1f2123', top: '#3a3d40', trim: '#b3232a', frame: '#1f2123', handle: '#c9cdce' },
  hinoki: { body: '#d9b98a', top: '#f1eee6', trim: '#c4a070', frame: '#c9a878', handle: '#5a4632' },
};

export default defineThing({
  questions: {
    mirror: choice('What shape is the mirror?', {
      arched: 'A tall mirror with a rounded arch top, like a chapel window.',
      round: 'A big round porthole of a mirror.',
      rect: 'A plain wide rectangle with softly rounded corners.',
      oval: 'A tall upright oval, vain and old-fashioned.',
      octagon: 'An eight-sided mirror with bevelled deco corners.',
    }),
    cabinet: choice('What is the cabinet like?', CABINETS),
    tucked: choice('What is tucked into the edge of the mirror frame?', {
      nothing: 'Nothing: the frame is clean.',
      family: 'Family snapshots: children, a wedding, a school portrait.',
      pennant: 'A felt team pennant and a couple of ticket stubs.',
      saints: 'Prayer cards of saints with gold halos, and a rosary hung on the corner.',
      banknotes: 'Banknotes: the first dollar earned and notes from the old country.',
      memorial: 'A black-bordered memorial card and a single dried flower.',
    }),
    state: choice('What state is the counter in?', {
      tidy: 'Tidy: tools squared up in a row, towels folded, ready to open.',
      midcut: 'Mid-cut: clippers down with the cord trailing, a tin open, a towel thrown, a drawer left out.',
      cleared: 'Cleared out: bare shelf, an open empty drawer, one thing forgotten.',
      shrine: 'Kept as a shrine: a lit candle and flowers set among his tools.',
    }),
    licence: noul('Is a framed barber’s licence hanging beside the mirror?'),
    drink: choice('What is the barber drinking, if anything?', {
      none: 'Nothing on the counter.',
      tea: 'A tulip glass of amber Turkish tea on a saucer.',
      espresso: 'A tiny white espresso cup and saucer.',
      rum: 'A bottle of dark rum and a small glass.',
      can: 'A can of vending-machine coffee.',
      soda: 'A glass bottle of bright orange soda with a straw.',
    }),
    sconces: noul('Are there lamps on either side of the mirror?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const c = CAB[a.cabinet];
    const body = s.material(c.body, { roughness: a.cabinet === 'steel' || a.cabinet === 'white' ? 0.35 : 0.6, metalness: a.cabinet === 'steel' ? 0.5 : 0 });
    const top = s.material(c.top, { roughness: 0.3 });
    const trim = s.material(c.trim, { roughness: 0.5 });
    const frameMat = s.material(c.frame, { roughness: 0.45, metalness: a.cabinet === 'white' ? 0.8 : 0.1 });
    const handle = s.material(c.handle, { metalness: 0.8, roughness: 0.3 });
    const chrome = s.material('#dfe3e4', { metalness: 0.9, roughness: 0.2 });
    const dark = s.material('#1d1d1e', { roughness: 0.5 });
    const W = 1.42, D = 0.46, H = 0.86, topY = H + 0.04, backZ = -D / 2 + 0.03, wallZ = backZ + 0.03;
    const cleared = a.state === 'cleared';

    // Cabinet: plinth, carcass, drawers in two banks with a knee gap doors below.
    s.box([W - 0.06, 0.08, D - 0.06], [0, 0.04, 0], trim);
    s.box([W, H - 0.08, D], [0, 0.08 + (H - 0.08) / 2, 0], body);
    s.box([W + 0.06, 0.04, D + 0.05], [0, H + 0.02, 0.01], top);
    const openDrawer = a.state === 'midcut' || cleared ? Math.floor(random() * 4) : -1;
    const rows = a.cabinet === 'steel' ? 5 : 3;
    const dh = (H - 0.2) / rows;
    for (let col = 0; col < 2; col++) for (let row = 0; row < rows; row++) {
      const x = (col - 0.5) * (W / 2 - 0.01), y = 0.14 + dh * (row + 0.5);
      const out = col * rows + row === openDrawer ? 0.16 + random() * 0.1 : 0;
      s.box([W / 2 - 0.07, dh - 0.03, 0.025], [x, y, D / 2 + 0.01 + out], a.cabinet === 'steel' ? trim : a.cabinet === 'bright' ? trim : body);
      if (out) {
        s.box([W / 2 - 0.1, dh - 0.06, out], [x, y - 0.012, D / 2 + out / 2], s.material('#b89c74'));
        if (!cleared) s.box([0.2, 0.03, out * 0.6], [x - 0.08, y + dh / 2 - 0.035, D / 2 + out / 2], s.material('#ece8dc'));
      }
      if (a.cabinet === 'walnut' || a.cabinet === 'hinoki') s.ball([0.02, 0.02, 0.014], [x, y, D / 2 + 0.03 + out], handle, 10);
      else s.box([0.18, 0.016, 0.02], [x, y + (a.cabinet === 'steel' ? dh / 2 - 0.03 : 0), D / 2 + 0.03 + out], handle);
    }
    if (a.cabinet === 'walnut') for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) s.cylinder(0.03, 0.03, H - 0.1, [x, H / 2 + 0.04, D / 2 - 0.01], trim, 12);

    // Backboard and mirror.
    const boardH = 1.3;
    s.box([W, boardH, 0.05], [0, topY + boardH / 2, backZ], body);
    s.box([W + 0.08, 0.07, 0.11], [0, topY + boardH + 0.035, backZ + 0.02], trim);
    if (a.cabinet === 'walnut') {
      s.box([W * 0.5, 0.12, 0.06], [0, topY + boardH + 0.13, backZ], trim);
      s.ball([0.07, 0.07, 0.04], [0, topY + boardH + 0.2, backZ], trim, 14);
    }
    const mw = { arched: 0.74, round: 0.86, rect: 0.9, oval: 0.68, octagon: 0.82 }[a.mirror];
    const mh = { arched: 1.04, round: 0.86, rect: 0.8, oval: 1.02, octagon: 0.92 }[a.mirror];
    const outline = (w: number, h: number) => {
      const shape = new THREE.Shape();
      if (a.mirror === 'round' || a.mirror === 'oval') shape.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
      else if (a.mirror === 'arched') {
        shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2 - w / 2);
        shape.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); shape.lineTo(-w / 2, -h / 2);
      } else {
        const k = a.mirror === 'octagon' ? Math.min(w, h) * 0.26 : 0.045;
        const pts: [number, number][] = [[-w / 2 + k, -h / 2], [w / 2 - k, -h / 2], [w / 2, -h / 2 + k], [w / 2, h / 2 - k], [w / 2 - k, h / 2], [-w / 2 + k, h / 2], [-w / 2, h / 2 - k], [-w / 2, -h / 2 + k]];
        shape.moveTo(...pts[0]);
        for (const p of pts.slice(1)) shape.lineTo(...p);
        shape.closePath();
      }
      return shape;
    };
    const my = topY + 0.14 + mh / 2;
    const border = a.cabinet === 'walnut' ? 0.07 : a.cabinet === 'steel' ? 0.03 : 0.05;
    const rim = outline(mw + border * 2, mh + border * 2);
    rim.holes.push(new THREE.Path(outline(mw, mh).getPoints(40).reverse()));
    s.mesh(new THREE.ExtrudeGeometry(rim, { depth: 0.035, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 40 }), frameMat, [0, my, wallZ]);

    const glassCanvas = document.createElement('canvas');
    glassCanvas.width = glassCanvas.height = 256;
    const g = glassCanvas.getContext('2d')!;
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#e6f0f1'); sky.addColorStop(1, '#a9bfc8');
    g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
    // The street window, reflected: a pale warm rectangle with glazing bars.
    g.fillStyle = `rgba(255,${Math.round(mix(250, 228, mood.warmth))},${Math.round(mix(255, 190, mood.warmth))},0.75)`;
    g.fillRect(70, 50, 120, 90);
    g.fillStyle = '#94aab3';
    g.fillRect(128, 50, 4, 90); g.fillRect(70, 92, 120, 4);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [x, w] of [[30, 26], [70, 8], [190, 14]] as const) {
      g.beginPath(); g.moveTo(x, 256); g.lineTo(x + w, 256); g.lineTo(x + w + 120, 0); g.lineTo(x + 120, 0); g.fill();
    }
    const spots = Math.floor(mood.wear * 60);
    for (let i = 0; i < spots; i++) {
      const edge = random() < 0.5;
      g.fillStyle = `rgba(70,62,50,${0.25 + random() * 0.4})`;
      g.beginPath();
      g.arc(edge ? (random() < 0.5 ? random() * 30 : 256 - random() * 30) : random() * 256, edge ? random() * 256 : 256 - random() * 36, 2 + random() * 6, 0, 6.3);
      g.fill();
    }
    const glassMap = new THREE.CanvasTexture(glassCanvas);
    glassMap.colorSpace = THREE.SRGBColorSpace;
    glassMap.repeat.set(1 / mw, 1 / mh);
    glassMap.offset.set(0.5, 0.5);
    s.mesh(new THREE.ShapeGeometry(outline(mw, mh), 40), new THREE.MeshStandardMaterial({ map: glassMap, roughness: 0.18, metalness: 0.25, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: 0.22 }), [0, my, wallZ + 0.012]);

    // Paper things tucked into the frame, each painted on its own small canvas.
    const card = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = Math.round((96 * h) / w);
      const ctx = canvas.getContext('2d')!;
      paint(ctx, canvas.width, canvas.height);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide }));
    };
    const head = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, skin: string, hair: string) => {
      ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 1.1, 0, 6.3); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
      ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - r * 0.55, r * 0.95, Math.PI, 0); ctx.fill();
    };
    const SKIN = ['#8a5a3c', '#c98f62', '#5d3a26', '#e0b48c', '#a8714a'];
    const photo = (w: number, h: number, people: number) => card(w, h, (ctx, cw, ch) => {
      ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = ['#7fa6b8', '#c6a16a', '#8fae7c', '#b98a8a'][Math.floor(random() * 4)]; ctx.fillRect(6, 6, cw - 12, ch - 18);
      for (let i = 0; i < people; i++) {
        const x = cw * (i + 1) / (people + 1), r = cw * (people > 1 ? 0.14 : 0.2);
        ctx.fillStyle = ['#2b3a55', '#f4f0e4', '#8c2a2a', '#333'][Math.floor(random() * 4)];
        ctx.fillRect(x - r * 1.3, ch * 0.6, r * 2.6, ch * 0.4 - 12);
        head(ctx, x, ch * 0.45, r, SKIN[Math.floor(random() * SKIN.length)], random() < 0.3 ? '#8a8a88' : '#1c1613');
      }
    });
    const rimPoints = outline(mw + border, mh + border).getSpacedPoints(60);
    const tuck = (mesh: THREE.Mesh, at: number, inward = 0.82) => {
      const p = rimPoints[Math.floor(at * 60) % 60];
      mesh.position.set(p.x * inward, my + p.y * inward, wallZ + 0.05 + random() * 0.006);
      mesh.rotation.z = (random() - 0.5) * 0.5;
      mesh.rotation.x = -0.06;
      return mesh;
    };
    const spotsAt = [0.02, 0.1, 0.4, 0.47, 0.55, 0.93, 0.6, 0.86].sort(() => random() - 0.5);
    if (a.tucked === 'family') {
      const n = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) tuck(random() < 0.5 ? photo(0.13, 0.16, 1) : photo(0.18, 0.14, 2 + Math.floor(random() * 2)), spotsAt[i % 8]);
    }
    if (a.tucked === 'pennant') {
      const tint = ['#1f3f8a', '#b3232a', '#1f6a45', '#e08a1e'][Math.floor(random() * 4)];
      const flag = new THREE.Shape();
      flag.moveTo(0, 0.08); flag.lineTo(0.5, 0); flag.lineTo(0, -0.08); flag.closePath();
      const pennant = s.mesh(new THREE.ShapeGeometry(flag), s.material(tint, { roughness: 0.95, side: THREE.DoubleSide }), [-mw / 2 - border * 0.4, my + mh * 0.34, wallZ + 0.052]);
      pennant.rotation.z = -0.18 + random() * 0.2;
      s.box([0.02, 0.165, 0.004], [-mw / 2 - border * 0.4, my + mh * 0.34, wallZ + 0.054], s.material('#f4efdc')).rotation.z = pennant.rotation.z;
      for (let i = 0; i < 3; i++) s.box([0.035, 0.035, 0.003], [-mw / 2 - border * 0.4 + 0.1 + i * 0.07, my + mh * 0.34 - (0.1 + i * 0.07) * Math.tan(-pennant.rotation.z) * 1, wallZ + 0.055], s.material('#f4efdc'));
      for (let i = 0; i < 3; i++) tuck(card(0.1, 0.045, (ctx, cw, ch) => {
        ctx.fillStyle = '#efe2b8'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = tint; ctx.fillRect(0, 0, cw * 0.28, ch);
        ctx.fillStyle = '#333'; for (let k = 0; k < 3; k++) ctx.fillRect(cw * 0.34, 8 + k * 11, cw * 0.55, 4);
      }), spotsAt[i]);
    }
    if (a.tucked === 'saints') {
      for (let i = 0; i < 4; i++) tuck(card(0.09, 0.15, (ctx, cw, ch) => {
        ctx.fillStyle = '#f1e3b6'; ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = '#c59a2c'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, cw - 8, ch - 8);
        ctx.fillStyle = '#e8b92e'; ctx.beginPath(); ctx.arc(cw / 2, ch * 0.33, cw * 0.27, 0, 6.3); ctx.fill();
        const robe = ['#2f5fae', '#a8262c', '#3d7a4a', '#6b3f8c'][i % 4];
        ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(cw / 2, ch * 0.38); ctx.lineTo(cw * 0.85, ch * 0.92); ctx.lineTo(cw * 0.15, ch * 0.92); ctx.fill();
        ctx.fillStyle = SKIN[i % 5]; ctx.beginPath(); ctx.arc(cw / 2, ch * 0.33, cw * 0.15, 0, 6.3); ctx.fill();
      }), spotsAt[i]);
      const beads = Array.from({ length: 22 }, (_u, i) => {
        const t = i / 21, x = mw / 2 + border * 0.5 - 0.05 + Math.sin(t * Math.PI) * 0.1;
        return { at: [x - Math.sin(t * Math.PI * 2) * 0.012, my + mh * 0.36 - Math.sin(t * Math.PI) * 0.26 + Math.abs(t - 0.5) * 0.1, wallZ + 0.058] as V3, size: 0.008 };
      });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#3a2418', { roughness: 0.4 }), beads);
      const cy = my + mh * 0.36 - 0.3;
      s.box([0.012, 0.07, 0.006], [mw / 2 + border * 0.5 + 0.05, cy, wallZ + 0.058], handle);
      s.box([0.04, 0.012, 0.006], [mw / 2 + border * 0.5 + 0.05, cy + 0.015, wallZ + 0.058], handle);
    }
    if (a.tucked === 'banknotes') {
      const n = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) tuck(card(0.17, 0.075, (ctx, cw, ch) => {
        const tint = ['#7fa886', '#c9b27a', '#b98aa6', '#86a6c4', '#7fa886'][i % 5];
        ctx.fillStyle = tint; ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = '#f2ecd6'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, cw - 8, ch - 8);
        ctx.fillStyle = '#f2ecd6'; ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, ch * 0.3, ch * 0.36, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#35503c'; ctx.font = 'bold 13px monospace'; ctx.fillText(['1', '5', '20', '100', '10'][i % 5], 9, 18); ctx.fillText(['1', '5', '20', '100', '10'][i % 5], cw - 28, ch - 9);
      }), spotsAt[i % 8]);
    }
    if (a.tucked === 'memorial') {
      tuck(card(0.15, 0.2, (ctx, cw, ch) => {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#f3efe2'; ctx.fillRect(8, 8, cw - 16, ch - 16);
        ctx.fillStyle = '#c9c4b4'; ctx.fillRect(22, 18, cw - 44, ch * 0.5);
        head(ctx, cw / 2, ch * 0.36, cw * 0.17, SKIN[Math.floor(random() * 5)], '#8a8a88');
        ctx.fillStyle = '#222'; ctx.fillRect(22, ch * 0.72, cw - 44, 5); ctx.fillRect(32, ch * 0.82, cw - 64, 4);
      }), 0.03, 0.9).rotation.z = 0.05;
      const p = rimPoints[2];
      s.rod([p.x * 0.9 - 0.02, my + p.y * 0.9 - 0.16, wallZ + 0.058], [p.x * 0.9 + 0.03, my + p.y * 0.9 + 0.1, wallZ + 0.058], 0.004, s.material('#6f6a3c'));
      s.ball([0.028, 0.03, 0.015], [p.x * 0.9 + 0.035, my + p.y * 0.9 + 0.12, wallZ + 0.058], s.material('#8a4a4a', { roughness: 1 }), 8);
    }

    // Licence, or the pale patch and nail where it hung.
    const lx = -(W / 2 - 0.13), ly = topY + boardH - 0.22;
    const sideFree = W / 2 - mw / 2 - border > 0.2;
    const licY = sideFree ? ly : topY + boardH + 0.24;
    if (a.licence) {
      const tilt = (random() - 0.5) * mix(0.03, 0.3, mood.wear);
      if (cleared) {
        s.box([0.17, 0.22, 0.004], [lx, ly, backZ + 0.028], s.material('#f6f1e2', { roughness: 0.9 }));
        s.cylinder(0.004, 0.004, 0.02, [lx, ly + 0.09, backZ + 0.035], dark, 6).rotation.x = Math.PI / 2;
      } else {
        const paper = card(0.15, 0.2, (ctx, cw, ch) => {
          ctx.fillStyle = mood.wear > 0.5 ? '#e6d8a8' : '#f6f1e2'; ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = '#3a5a8c'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, cw - 12, ch - 12);
          ctx.fillStyle = '#222'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('LICENSED', cw / 2, 28); ctx.fillText('BARBER', cw / 2, 42);
          for (let k = 0; k < 4; k++) ctx.fillRect(18, 56 + k * 10, cw - 36, 3);
          ctx.fillStyle = '#c8a22c'; ctx.beginPath(); ctx.arc(cw * 0.72, ch * 0.82, 11, 0, 6.3); ctx.fill();
        });
        const lz = sideFree ? backZ + 0.045 : backZ + 0.02;
        paper.position.set(lx * (sideFree ? 1 : 0), licY, lz + 0.012);
        paper.rotation.z = tilt;
        s.box([0.19, 0.24, 0.02], [lx * (sideFree ? 1 : 0), licY, lz], dark).rotation.z = tilt;
        if (!sideFree) s.box([0.03, 0.2, 0.02], [0, topY + boardH + 0.12, backZ], dark);
      }
    }
    if (a.sconces) {
      const shade = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffe2a0', emissiveIntensity: mix(0.4, 1, mood.cheer), roughness: 0.4 });
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.02), y = my + 0.1;
        s.box([0.06, 0.1, 0.03], [x, y - 0.08, backZ + 0.04], handle);
        s.rod([x, y - 0.08, backZ + 0.04], [x, y - 0.03, backZ + 0.14], 0.01, handle);
        s.lathe([[0.03, 0], [0.055, 0.03], [0.05, 0.12], [0.03, 0.15], [0, 0.155]], shade, [x, y - 0.03, backZ + 0.14]);
      }
    }

    // A narrow bottle shelf under the mirror, and the counter below it.
    const shelfY = topY + 0.1;
    s.box([W * 0.9, 0.018, 0.12], [0, shelfY, backZ + 0.085], a.cabinet === 'white' || a.cabinet === 'steel' ? chrome : trim);
    const bottle = (x: number, y: number, z: number, tint: string, tall: number, fat: number) => {
      const liquid = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.15, transparent: true, opacity: 0.85 });
      s.lathe([[0, 0], [fat, 0], [fat, tall * 0.6], [fat * 0.4, tall * 0.78], [fat * 0.36, tall], [0, tall]], liquid, [x, y, z]);
      s.cylinder(fat * 0.42, fat * 0.42, tall * 0.08, [x, y + tall * 1.03, z], random() < 0.5 ? dark : chrome, 10);
      s.box([fat * 1.5, tall * 0.25, 0.002], [x, y + tall * 0.33, z + fat * 0.98], s.material('#f1ead2'));
    };
    const spray = (x: number, y: number, z: number, tint: string, down = false) => {
      const grp = new THREE.Group();
      const add = (m: THREE.Object3D) => { grp.add(m); return m; };
      add(s.cylinder(0.032, 0.034, 0.15, [0, 0.075, 0], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.2, transparent: true, opacity: 0.8 }), 14));
      add(s.cylinder(0.014, 0.03, 0.03, [0, 0.165, 0], dark, 10));
      add(s.box([0.03, 0.035, 0.07], [0, 0.195, 0.012], dark));
      add(s.box([0.012, 0.045, 0.012], [0, 0.165, 0.035], dark));
      grp.position.set(x, y + (down ? 0.034 : 0), z);
      if (down) grp.rotation.set(0, random() * 3, Math.PI / 2);
      else grp.rotation.y = (random() - 0.5) * 2;
      s.root.add(grp);
    };
    const clippers = (x: number, z: number, turn: number, cord: boolean) => {
      const grp = new THREE.Group();
      const add = (m: THREE.Object3D) => { grp.add(m); return m; };
      const shell = s.material(['#1f2022', '#b3232a', '#c9a24c', '#d9dcdc'][Math.floor(random() * 4)], { roughness: 0.35, metalness: 0.3 });
      add(s.box([0.05, 0.04, 0.15], [0, 0.02, 0], shell));
      add(s.box([0.042, 0.03, 0.03], [0, 0.018, 0.088], chrome));
      add(s.box([0.046, 0.006, 0.012], [0, 0.008, 0.108], dark));
      add(s.box([0.012, 0.006, 0.03], [0, 0.043, 0.02], dark));
      grp.position.set(x, topY, z);
      grp.rotation.y = turn;
      s.root.add(grp);
      if (cord) {
        const bx = x - Math.sin(turn) * 0.08, bz = z - Math.cos(turn) * 0.08;
        const pts: V3[] = [[bx, topY + 0.02, bz]];
        for (let i = 1; i <= 5; i++) pts.push([bx - i * 0.05 + Math.sin(i * 2.1) * 0.03, topY + 0.006 + (i % 2) * 0.012, bz + Math.sin(i * 1.7) * 0.05 + i * 0.02]);
        const last = pts[pts.length - 1];
        pts.push([last[0] - 0.03, topY + 0.005, D / 2 + 0.035], [last[0] - 0.04, topY - 0.2, D / 2 + 0.05], [last[0] - 0.02, topY - 0.42, D / 2 + 0.045]);
        s.tube(pts, 0.005, dark);
      }
    };
    const duster = (x: number, z: number, lying: boolean) => {
      const grp = new THREE.Group();
      const add = (m: THREE.Object3D) => { grp.add(m); return m; };
      add(s.lathe([[0, 0], [0.016, 0], [0.012, 0.05], [0.02, 0.09], [0, 0.095]], s.material('#7a4a2a', { roughness: 0.4 })));
      add(s.lathe([[0.016, 0.09], [0.04, 0.14], [0.045, 0.19], [0.02, 0.215], [0, 0.22]], s.material('#f1ead8', { roughness: 1 })));
      grp.position.set(x, topY + (lying ? 0.04 : 0), z);
      if (lying) grp.rotation.set(Math.PI / 2 - 0.1, 0, random() * 2 - 1);
      else { grp.rotation.x = Math.PI; grp.position.y = topY + 0.22; }
      s.root.add(grp);
    };
    const TONICS = ['#2f9a6a', '#d08a1e', '#2f6fc0', '#b3232a', '#e6d8a0', '#6b3f8c', '#3aa9a0'];
    if (!cleared) {
      const bottles = 3 + Math.round(mood.density * 5);
      const tidy = a.state !== 'midcut';
      for (let i = 0; i < bottles; i++) {
        const x = (i - (bottles - 1) / 2) * (W * 0.8 / Math.max(bottles, 5)) + (tidy ? 0 : (random() - 0.5) * 0.05);
        if (Math.abs(x) < 0.1 && a.state === 'shrine') continue;
        bottle(x, shelfY + 0.009, backZ + 0.085, TONICS[Math.floor(random() * TONICS.length)], 0.1 + random() * 0.1, 0.022 + random() * 0.014);
      }
      const z0 = 0.02;
      if (a.state === 'midcut') {
        clippers(-0.2 + random() * 0.1, z0 + 0.04, 0.6 + random() * 1.4, true);
        clippers(0.18 + random() * 0.1, z0 - 0.02, random() * 3, false);
        spray(-0.5, topY, z0 - 0.04, '#7fc4e8', random() < 0.5);
        duster(0.02, z0 + 0.1, true);
        // Open talc tin, lid beside it, and a thrown towel.
        s.cylinder(0.04, 0.04, 0.035, [0.42, topY + 0.018, z0 + 0.05], s.material('#e7d9a8', { metalness: 0.4 }), 16);
        s.cylinder(0.036, 0.036, 0.004, [0.42, topY + 0.034, z0 + 0.05], s.material('#f8f6ef', { roughness: 1 }), 16);
        s.cylinder(0.042, 0.042, 0.01, [0.5, topY + 0.006, z0 + 0.12], s.material('#b3232a', { metalness: 0.4 }), 16);
        const towel = s.ball([0.12, 0.045, 0.09], [-0.42 + random() * 0.1, topY + 0.035, z0 + 0.1], s.material('#f1eee4', { roughness: 1 }), 10);
        towel.rotation.y = random() * 3;
        s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.25, 0.5), s.material('#2a1f18', { roughness: 1 }),
          Array.from({ length: 26 }, () => ({ at: [(random() - 0.5) * W * 0.8, topY + 0.003, z0 + (random() - 0.3) * 0.26] as V3, size: 0.008 + random() * 0.012 })));
        s.box([0.16, 0.006, 0.025], [0.1 + random() * 0.1, topY + 0.004, z0 + 0.16], dark).rotation.y = random() * 2;
      } else {
        const shift = a.state === 'shrine' ? 0.14 : 0;
        clippers(-0.36 - shift, z0 + 0.02, 0, false);
        clippers(-0.27 - shift, z0 + 0.02, 0, false);
        spray(-0.56, topY, z0, '#7fc4e8');
        duster(0.52, z0 - 0.02, false);
        for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) s.box([0.2, 0.022, 0.13], [0.36 + shift * 0.3, topY + 0.012 + i * 0.023, z0 + 0.03], s.material(i % 2 ? '#f4f1e8' : '#e9e5d8', { roughness: 1 }));
        s.box([0.17, 0.006, 0.028], [-0.14 - shift, topY + 0.004, z0 + 0.06], dark);
        s.box([0.14, 0.006, 0.012], [-0.14 - shift, topY + 0.004, z0 + 0.11], chrome);
      }
      if (a.state === 'shrine') {
        const flame = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffb030', emissiveIntensity: 1.6 });
        s.cylinder(0.035, 0.035, 0.17, [0, topY + 0.085, z0 + 0.03], new THREE.MeshStandardMaterial({ color: '#c8262c', roughness: 0.2, emissive: '#c8262c', emissiveIntensity: 0.35 }), 16);
        s.ball([0.012, 0.024, 0.012], [0, topY + 0.19, z0 + 0.03], flame, 8);
        const ph = photo(0.14, 0.18, 1);
        ph.position.set(-0.14, topY + 0.095, z0 - 0.02); ph.rotation.x = -0.25;
        s.box([0.16, 0.2, 0.012], [-0.14, topY + 0.094, z0 - 0.03], dark).rotation.x = -0.25;
        s.cylinder(0.03, 0.022, 0.1, [0.15, topY + 0.05, z0], s.material('#e9e6df', { roughness: 0.3 }), 12);
        const blooms = mood.cheer > 0.5 ? ['#f2c230', '#e8663a', '#f4f0e6'] : ['#f4f0e6', '#e7e2d2', '#c9b7d8'];
        for (let i = 0; i < 6; i++) {
          const bx = 0.15 + (random() - 0.5) * 0.12, by = topY + 0.17 + random() * 0.08, bz = z0 + (random() - 0.5) * 0.08;
          s.rod([0.15, topY + 0.09, z0], [bx, by, bz], 0.003, s.material('#3f7a3c'));
          s.ball([0.024, 0.02, 0.024], [bx, by, bz], s.material(blooms[i % 3], { roughness: 0.9 }), 8);
        }
      }
    } else {
      // One forgotten thing and a ring where a bottle stood.
      s.box([0.17, 0.006, 0.028], [0.1 + random() * 0.3, topY + 0.004, 0.08], dark).rotation.y = random() * 2;
      s.ring(0.03, 0.003, [-0.3, topY + 0.002, 0.04], s.material('#8a7a5c')).rotation.x = Math.PI / 2;
      bottle(-0.5, shelfY + 0.009, backZ + 0.085, '#d6d2c2', 0.14, 0.026);
    }

    // The drink.
    const dx = a.state === 'midcut' ? 0.58 : -0.02 + (a.state === 'shrine' ? 0.5 : 0), dz = 0.14;
    if (a.drink === 'tea') {
      s.cylinder(0.045, 0.045, 0.006, [dx, topY + 0.003, dz], s.material('#f4f1e8', { roughness: 0.3 }), 16);
      s.lathe([[0, 0.006], [0.02, 0.006], [0.017, 0.035], [0.024, 0.07], [0.026, 0.085]], new THREE.MeshStandardMaterial({ color: '#b5501c', roughness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), [dx, topY, dz]);
    } else if (a.drink === 'espresso') {
      s.cylinder(0.04, 0.04, 0.006, [dx, topY + 0.003, dz], s.material('#f4f1e8', { roughness: 0.3 }), 16);
      s.cylinder(0.025, 0.018, 0.04, [dx, topY + 0.026, dz], s.material('#f4f1e8', { roughness: 0.3 }), 14);
      s.cylinder(0.021, 0.021, 0.002, [dx, topY + 0.046, dz], s.material('#2a1408'), 14);
      s.ring(0.012, 0.004, [dx + 0.028, topY + 0.028, dz], s.material('#f4f1e8')).rotation.y = 0;
    } else if (a.drink === 'rum') {
      bottle(dx, topY, dz, '#5a2a10', 0.24, 0.036);
      s.cylinder(0.02, 0.016, 0.045, [dx + 0.08, topY + 0.023, dz + 0.03], new THREE.MeshStandardMaterial({ color: '#b8743a', roughness: 0.1, transparent: true, opacity: 0.8 }), 12);
    } else if (a.drink === 'can') {
      s.cylinder(0.026, 0.026, 0.105, [dx, topY + 0.053, dz], s.material('#7a4a1e', { metalness: 0.6, roughness: 0.3 }), 16);
      s.cylinder(0.0265, 0.0265, 0.03, [dx, topY + 0.05, dz], s.material('#e8c23a', { metalness: 0.5 }), 16);
      s.cylinder(0.024, 0.024, 0.004, [dx, topY + 0.107, dz], chrome, 16);
    } else if (a.drink === 'soda') {
      bottle(dx, topY, dz, '#f08a1e', 0.2, 0.028);
      s.rod([dx, topY + 0.15, dz], [dx + 0.03, topY + 0.27, dz + 0.01], 0.003, s.material('#f4f1e8'));
    }

    return s.finish();
  },
});

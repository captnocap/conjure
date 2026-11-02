import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type P = [number, number];

const CLOTHS = {
  satin: 'Ivory bridal satin, yards of it, cold and shining.',
  floral: 'Flowered cotton lawn for a summer dress.',
  suiting: 'Charcoal chalk-stripe suiting wool.',
  uniform: 'Bottle-green school uniform serge, bought with room to grow.',
  velvet: 'Deep red velvet for a party frock.',
  crepe: 'Black crepe for a funeral.',
  flannel: 'Pale yellow checked flannel for a baby.',
} as const;
type Cloth = keyof typeof CLOTHS;
const CLOTH_BASE: Record<Cloth, string> = { satin: '#efe8d8', floral: '#efe3c6', suiting: '#4a4c53', uniform: '#2f5a44', velvet: '#8e1a2b', crepe: '#2c2a2f', flannel: '#f2e6a4' };

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

/** Pattern piece outlines in table units, roughly centred on the origin. */
function piece(kind: 'bodice' | 'sleeve' | 'skirt' | 'collar' | 'pocket' | 'cuff', k: number, long = 1) {
  const shape = new THREE.Shape();
  if (kind === 'bodice') {
    shape.moveTo(-0.8 * k, -1.1 * k); shape.lineTo(0.75 * k, -1.1 * k); shape.lineTo(0.85 * k, 0.1 * k);
    shape.quadraticCurveTo(0.45 * k, 0.3 * k, 0.5 * k, 0.95 * k); shape.lineTo(0.05 * k, 1.15 * k);
    shape.quadraticCurveTo(-0.3 * k, 0.75 * k, -0.8 * k, 0.75 * k); shape.closePath();
  } else if (kind === 'sleeve') {
    shape.moveTo(-0.7 * k, -0.9 * k); shape.lineTo(0.7 * k, -0.9 * k); shape.lineTo(0.95 * k, 0.35 * k);
    shape.bezierCurveTo(0.5 * k, 0.5 * k, 0.4 * k, 1.05 * k, 0, 1.05 * k); shape.bezierCurveTo(-0.4 * k, 1.05 * k, -0.5 * k, 0.5 * k, -0.95 * k, 0.35 * k); shape.closePath();
  } else if (kind === 'skirt') {
    const h = 1.5 * k * long;
    shape.moveTo(-0.45 * k, h); shape.lineTo(0.45 * k, h); shape.lineTo(1.0 * k, -h);
    shape.quadraticCurveTo(0, -h - 0.25 * k, -1.0 * k, -h); shape.closePath();
  } else if (kind === 'collar') {
    shape.moveTo(-0.9 * k, 0); shape.quadraticCurveTo(0, 0.75 * k, 0.9 * k, 0); shape.lineTo(0.75 * k, -0.3 * k); shape.quadraticCurveTo(0, 0.3 * k, -0.75 * k, -0.3 * k); shape.closePath();
  } else if (kind === 'pocket') {
    shape.moveTo(-0.4 * k, 0.45 * k); shape.lineTo(0.4 * k, 0.45 * k); shape.lineTo(0.4 * k, -0.25 * k); shape.quadraticCurveTo(0, -0.6 * k, -0.4 * k, -0.25 * k); shape.closePath();
  } else {
    shape.moveTo(-0.8 * k, -0.24 * k); shape.lineTo(0.8 * k, -0.24 * k); shape.lineTo(0.8 * k, 0.24 * k); shape.lineTo(-0.8 * k, 0.24 * k); shape.closePath();
  }
  return shape;
}

export default defineWorld({
  questions: {
    cloth: choice('What cloth is spread on the table?', CLOTHS),
    garment: choice('What is being made?', {
      wedding: 'A wedding dress: long skirt panels, a fitted bodice.',
      child: 'A small child\'s dress, every piece tiny.',
      jacket: 'A man\'s jacket: fronts, sleeves, collar and pockets.',
      christening: 'A christening gown, absurdly long for its little bodice.',
      skirt: 'A plain everyday skirt, two panels and a waistband.',
    }),
    stage: choice('How far has the work got?', {
      cut: 'The pieces are cut out and stacked, offcuts everywhere, half the cloth gone.',
      abandoned: 'It was pinned out long ago and never cut: the tissue has yellowed and a dust sheet is thrown half over it.',
      packed: 'It has all been folded away: the cloth in a pile, the pattern back in its envelope, the table nearly bare.',
      laid: 'The pattern is pinned to the cloth and nothing has been cut yet.',
    }),
    window: choice('What is at the window behind the table?', {
      gingham: 'A red gingham half-curtain on a brass rod, a tree outside above it.',
      blind: 'A cream roller blind pulled most of the way down.',
      washing: 'A bare sash looking onto a washing line of white sheets and shirts.',
      rain: 'A bare sash streaked with rain, grey rooftops beyond.',
      lace: 'Net curtains across the whole sash, the garden a blur behind them.',
    }),
    pegboard: choice('What hangs on the pegboard?', {
      crowded: 'Crammed: every hook doubled up with scissors, hoops, rulers, reels and ribbon.',
      outlines: 'Mostly bare hooks and painted outlines where the tools used to hang.',
      tidy: 'Each tool on its own hook: shears, a hoop, a tape, a set square, a shelf of reels.',
    }),
    wall: choice('What are the walls like?', {
      stripes: 'Faded regency-stripe wallpaper.',
      paint: 'Plain cream distemper.',
      boards: 'Pale green tongue-and-groove boarding.',
      floral: 'Small-sprig floral wallpaper.',
    }),
    occasion: choice('What is pinned to the wall between the pegboard and the window?', {
      none: 'Nothing.',
      sketch: 'A pencil sketch of the finished dress with a swatch pinned to it.',
      invitation: 'A cream invitation card with a silver border.',
      photograph: 'A framed photograph of the person it is for.',
      calendar: 'A calendar with one date ringed in red.',
    }),
    surface: choice('What covers the worktable beneath the garment?', {
      wood: 'The original scarred wooden tabletop.',
      grid: 'A green cutting surface ruled with a large square grid.',
      canvas: 'A pale woven canvas work cover.',
      leather: 'A dark leather cutting pad with a stitched perimeter.',
    }),
    stock: choice('How are small notions stored along the back edge?', {
      clear: 'The back edge is clear.',
      cubbies: 'Open wooden cubbies sort small packets and reels.',
      drawers: 'A tiny chest of shallow drawers with label holders.',
      jars: 'Three glass jars hold buttons, snaps and hooks.',
    }),
    paperwork: choice('What paperwork is clipped below the window?', {
      none: 'No additional paperwork.',
      orders: 'An order sheet lists garments and fitting dates.',
      measurements: 'A measurement chart records chest, waist and sleeve lengths.',
      receipt: 'A receipt and a small fabric shop envelope.',
    }),
    samples: choice('How are cloth samples kept for comparison?', {
      none: 'No extra swatches.',
      fan: 'A fan of swatch cards lies along the back edge.',
      chain: 'Small fabric squares hang from a short supported sample rail.',
      wall: 'A wall board displays four contrasting cloth swatches.',
    }),
    pressing: choice('What pressing aid stands at the far right of the table?', {
      none: 'No pressing aid.',
      sleeve: 'A narrow padded sleeve board on two low supports.',
      ham: 'A rounded tailor’s pressing ham on a small cradle.',
      clapper: 'A hardwood clapper and seam roll share a small support board.',
    }),
    offcuts: choice('How are the saved offcuts collected?', {
      none: 'No collection at the edge.',
      basket: 'A shallow slatted basket holds folded useful scraps.',
      tray: 'A metal sorting tray holds small folded remnants.',
      bundle: 'A stack of fabric offcuts is tied with a ribbon.',
    }),
    lamp: noul('Is a work lamp switched on over the table?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = mood.wear;
    const tableTint = new THREE.Color('#b08a5c').lerp(new THREE.Color('#8f7a62'), wear * 0.6);
    const wallBase = new THREE.Color({ stripes: '#ddd3bd', paint: '#e9e1cb', boards: '#c5d6c2', floral: '#ebe2cc' }[a.wall]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f0dcc0' : '#d5dde0'), Math.abs(mood.warmth - 0.5) * 0.4);
    const { art: s, world } = diorama(context, {
      background: '#' + wallBase.clone().lerp(new THREE.Color('#ecebe4'), 0.6).getHexString(),
      floor: '#' + tableTint.getHexString(),
      width: 12, depth: 8, maxHeight: 3.1, radius: 1.55, pitch: 40, yaw: 16,
      slots: [[0.2, 0.9], [-3.5, -0.8, 0, 0.9], [3.7, -0.6, 0, 0.9], [-3.1, 2.4, 0, 0.8], [3.4, 2.5, 0, 0.8], [0.3, -2.3, 0, 0.7]],
    });
    const stuff = (tint: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(tint, options);
    const add = <T extends THREE.Object3D>(object: T) => { object.traverse((node) => { node.castShadow = node.receiveShadow = true; }); s.root.add(object); return object; };

    // The table: planks, scars, an apron, and a brass yard rule let into the front edge.
    const dark = stuff('#6f5438');
    for (let i = 1; i < 6; i++) s.box([12, 0.006, 0.02], [0, 0.004, -4 + i * 1.33 + (random() - 0.5) * 0.1], dark);
    s.box([12, 0.7, 0.16], [0, -0.59, 3.9], dark);
    s.box([0.16, 0.7, 8], [5.9, -0.59, 0], dark);
    for (const x of [-5.6, 5.6]) s.box([0.5, 1.5, 0.5], [x, -0.99, 3.7], dark);
    s.box([2.6, 0.42, 0.05], [-2.5, -0.6, 3.99], stuff('#8a6a45'));
    s.ball([0.09, 0.09, 0.09], [-2.5, -0.6, 4.05], stuff('#c79a3e', { metalness: 0.8, roughness: 0.3 }), 10);
    const rule = paint(2048, 32, (ctx, w, h) => {
      ctx.fillStyle = '#c9a550'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3a2c12';
      for (let i = 0; i <= 144; i++) ctx.fillRect(i * w / 144, 0, i % 4 ? 2 : 4, i % 12 === 0 ? h : i % 4 === 0 ? h * 0.6 : h * 0.3);
    });
    const brassRule = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.012, 0.16), new THREE.MeshStandardMaterial({ map: rule, metalness: 0.5, roughness: 0.45 }));
    brassRule.position.set(0, 0.008, 3.82);
    add(brassRule);
    const scars: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 20 + wear * 120; i++) scars.push({ at: [(random() - 0.5) * 11.6, 0.003, (random() - 0.5) * 7.4], size: 0.4 + random() * 1.2 });
    const scarMesh = s.scatter(new THREE.BoxGeometry(0.3, 0.004, 0.012), stuff('#7d6444'), scars);
    scarMesh.castShadow = false;
    scarMesh.rotation.y = 0.2;

    if (a.surface !== 'wood') {
      const map = paint(1024, 768, (c, w, h) => {
        c.fillStyle = a.surface === 'grid' ? '#406d58' : a.surface === 'canvas' ? '#ded2b8' : '#634a3a'; c.fillRect(0, 0, w, h);
        if (a.surface === 'grid') { c.strokeStyle = '#b4cdb0'; c.lineWidth = 2; for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
        else if (a.surface === 'canvas') { c.fillStyle = '#b7a98b'; for (let x = 0; x < w; x += 7) c.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 7) c.fillRect(0, y, w, 1); }
        else { c.strokeStyle = '#d6bc8d'; c.lineWidth = 3; c.setLineDash([14, 10]); c.strokeRect(18, 18, w - 36, h - 36); }
      });
      const pad = s.mesh(new THREE.PlaneGeometry(11.6, 7.55), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), [0, 0.008, 0]); pad.rotation.x = -Math.PI / 2;
    }

    // Back wall.
    const wallMap = paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#' + wallBase.getHexString(); ctx.fillRect(0, 0, w, h);
      if (a.wall === 'stripes') { ctx.fillStyle = 'rgba(150,120,110,0.35)'; for (let x = 0; x < w; x += 44) { ctx.fillRect(x, 0, 18, h); ctx.fillRect(x + 26, 0, 3, h); } }
      else if (a.wall === 'boards') { ctx.fillStyle = 'rgba(60,90,70,0.4)'; for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 3, h); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 4; x < w; x += 40) ctx.fillRect(x, 0, 3, h); }
      else if (a.wall === 'floral') for (let y = 20; y < h; y += 56) for (let x = (y / 56 % 2) * 34 + 16; x < w; x += 68) {
        ctx.fillStyle = '#7c9a6c'; ctx.fillRect(x - 1, y, 3, 16); ctx.beginPath(); ctx.ellipse(x + 7, y + 9, 7, 3, 0.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#c76a7a'; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 6, y + Math.sin(p * 1.257) * 6, 4.6, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#e8c45a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      }
      // Damp, sun-fade and the ghosts of old pictures.
      for (let i = 0; i < wear * 26; i++) {
        const x = random() * w, y = random() * h * 0.6, r = 30 + random() * 110;
        const stain = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        stain.addColorStop(0, 'rgba(120,100,70,0)'); stain.addColorStop(0.85, 'rgba(120,100,70,0.22)'); stain.addColorStop(1, 'rgba(120,100,70,0)');
        ctx.fillStyle = stain; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.8, 0.2), wallMat);
    wall.position.set(0, 2.5, -4.1);
    add(wall);
    const trim = stuff('#efe9da', { roughness: 0.6 });
    s.box([12.4, 0.16, 0.06], [0, 1.25, -3.97], trim);

    // Window.
    const wx = 3.05, wy = 3.15, ww = 3.3, wh = 3.1;
    const day = mood.daylight;
    const sky = new THREE.Color().lerpColors(new THREE.Color('#f4d6c6'), new THREE.Color('#dcecf8'), Math.min(1, day * 2));
    if (day > 0.5) sky.lerp(new THREE.Color('#f0b488'), (day - 0.5) * 2);
    if (a.window === 'rain') sky.lerp(new THREE.Color('#aab3b8'), 0.75);
    const view = paint(512, 480, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#' + sky.getHexString()); g.addColorStop(1, '#' + sky.clone().lerp(new THREE.Color('#ffffff'), 0.5).getHexString());
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (a.window === 'washing') {
        ctx.fillStyle = '#7f9a6a'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
        ctx.strokeStyle = '#5a5248'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h * 0.3); ctx.quadraticCurveTo(w / 2, h * 0.4, w, h * 0.3); ctx.stroke();
        let x = 20;
        while (x < w - 60) {
          const wide = 40 + random() * 70, tall = 60 + random() * 110, y = h * 0.3 + Math.sin(x / w * Math.PI) * h * 0.05;
          ctx.fillStyle = ['#fbfaf5', '#f3f1ea', '#dfe9f3', '#f6e3e3'][Math.floor(random() * 4)];
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wide, y + 3); ctx.lineTo(x + wide - 5, y + tall); ctx.lineTo(x + 6, y + tall + 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#8a6a45'; ctx.fillRect(x + 4, y - 6, 5, 14); ctx.fillRect(x + wide - 9, y - 4, 5, 14);
          x += wide + 12 + random() * 20;
        }
      } else if (a.window === 'rain') {
        ctx.fillStyle = '#7c8388';
        for (let x = 0; x < w; x += 90) { const top = h * (0.5 + random() * 0.2); ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, top + 30); ctx.lineTo(x + 45, top); ctx.lineTo(x + 90, top + 30); ctx.lineTo(x + 90, h); ctx.fill(); ctx.fillRect(x + 60, top - 30, 14, 50); }
        ctx.strokeStyle = 'rgba(240,246,250,0.75)'; ctx.lineWidth = 2;
        for (let i = 0; i < 90; i++) { const x = random() * w, y = random() * h, len = 20 + random() * 70; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + len); ctx.stroke(); }
      } else {
        ctx.fillStyle = '#86a474'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
        ctx.fillStyle = '#6b5136'; ctx.fillRect(w * 0.62, h * 0.3, 18, h * 0.5);
        ctx.fillStyle = '#6f9660'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc(w * 0.64 + (random() - 0.5) * 190, h * 0.28 + (random() - 0.5) * 130, 34 + random() * 30, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#a9b59a'; ctx.fillRect(0, h * 0.62, w, 14);
      }
    });
    const glow = mix(0.75, 0.4, Math.abs(day - 0.5) * 2) * (a.window === 'rain' ? 0.7 : 1);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshStandardMaterial({ map: view, emissive: '#ffffff', emissiveMap: view, emissiveIntensity: glow, roughness: 0.2 }));
    glass.position.set(wx, wy, -3.985);
    s.root.add(glass);
    for (const [w, h, x, y] of [[ww + 0.36, 0.18, 0, wh / 2 + 0.09], [0.18, wh, -ww / 2 - 0.09, 0], [0.18, wh, ww / 2 + 0.09, 0], [ww, 0.12, 0, 0.05], [0.07, wh / 2, 0, wh / 4 + 0.05], [0.07, wh / 2, 0, -wh / 4 + 0.05]] as const)
      s.box([w, h, 0.14], [wx + x, wy + y, -3.93], trim);
    s.box([ww + 0.6, 0.12, 0.5], [wx, wy - wh / 2 - 0.06, -3.76], trim);
    const sillY = wy - wh / 2;
    if (a.window === 'lace') {
      const lace = paint(512, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#fbfaf4';
        for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 7); ctx.fill(); }
        for (let x = 0; x < w; x += 64) { ctx.fillRect(x, 0, 12, h); for (let y = 30; y < h; y += 120) { ctx.beginPath(); ctx.arc(x + 38, y, 24, 0, 7); ctx.fill(); } }
        ctx.fillRect(0, 0, w, 26); ctx.fillRect(0, h - 40, w, 40);
      });
      const net = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.1, wh - 0.05, 40, 1), new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
      const pos = net.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getX(v) * 9) * 0.05);
      net.geometry.computeVertexNormals();
      net.position.set(wx, wy, -3.78);
      add(net);
    } else if (a.window === 'gingham') {
      const gingham = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f6f1e7'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(196,40,50,0.55)';
        for (let i = 0; i < 8; i += 2) { ctx.fillRect(i * 32, 0, 32, h); ctx.fillRect(0, i * 32, w, 32); }
      }, [3, 1.5]);
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.2, wh * 0.5, 48, 1), new THREE.MeshStandardMaterial({ map: gingham, side: THREE.DoubleSide, roughness: 0.9 }));
      const pos = curtain.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getX(v) * 11) * 0.07);
      curtain.geometry.computeVertexNormals();
      curtain.position.set(wx, sillY + wh * 0.25 + 0.04, -3.74);
      add(curtain);
      s.rod([wx - ww / 2 - 0.2, sillY + wh * 0.5 + 0.05, -3.74], [wx + ww / 2 + 0.2, sillY + wh * 0.5 + 0.05, -3.74], 0.03, stuff('#c79a3e', { metalness: 0.8, roughness: 0.3 }));
    } else if (a.window === 'blind') {
      const drop = wh * mix(0.55, 0.85, random());
      s.box([ww + 0.05, drop, 0.03], [wx, wy + wh / 2 - drop / 2, -3.82], stuff('#eadfc4', { roughness: 0.9 }));
      s.cylinder(0.07, 0.07, ww + 0.15, [wx, wy + wh / 2 - 0.02, -3.8], stuff('#d9cdb0'), 12).rotation.z = Math.PI / 2;
      s.rod([wx, wy + wh / 2 - drop, -3.8], [wx, wy + wh / 2 - drop - 0.35, -3.8], 0.008, stuff('#8a7a5a'));
      s.ring(0.06, 0.012, [wx, wy + wh / 2 - drop - 0.41, -3.8], stuff('#c79a3e', { metalness: 0.8 }));
    }
    // A plant on the sill, alive or not.
    if (mood.density > 0.25 || a.stage === 'abandoned') {
      const px = wx + ww / 2 - 0.5, alive = a.stage !== 'abandoned' && wear < 0.8;
      s.cylinder(0.2, 0.15, 0.3, [px, sillY + 0.15, -3.72], stuff('#b5633f'), 14);
      const leaf = stuff(alive ? '#4f8a48' : '#8a7a4e'), bloom = stuff('#d5303a');
      for (let i = 0; i < 7; i++) {
        const t = i / 7 * Math.PI * 2, r = 0.12 + random() * 0.14, y = alive ? 0.42 + random() * 0.3 : 0.3 + random() * 0.12;
        s.ball([0.12, alive ? 0.09 : 0.04, 0.1], [px + Math.cos(t) * r, sillY + y, -3.72 + Math.sin(t) * r * 0.5], leaf, 8);
        if (alive && i % 3 === 0) s.ball([0.07, 0.07, 0.07], [px + Math.cos(t) * r * 0.6, sillY + y + 0.16, -3.7 + Math.sin(t) * r * 0.4], bloom, 8);
      }
    }

    // Pegboard of notions.
    const bx = -2.95, by = 3.15, bw = 5, bh = 3;
    const toCanvas = (x: number, y: number): P => [(x - (bx - bw / 2)) / bw * 1024, (by + bh / 2 - y) / bh * 614];
    const tools: { kind: 'shears' | 'hoop' | 'tape' | 'square'; x: number; y: number; k: number }[] = [
      { kind: 'shears', x: -4.85, y: 4.2, k: 1 }, { kind: 'hoop', x: -3.7, y: 3.75, k: 1 }, { kind: 'tape', x: -2.55, y: 4.25, k: 1 }, { kind: 'square', x: -1.5, y: 4.25, k: 1 },
    ];
    if (a.pegboard === 'crowded') tools.push({ kind: 'shears', x: -0.85, y: 2.9, k: 0.7 }, { kind: 'hoop', x: -3.6, y: 3.7, k: 0.62 }, { kind: 'tape', x: -4.75, y: 2.75, k: 0.7 }, { kind: 'shears', x: -4.3, y: 4.25, k: 0.6 });
    const boardMap = paint(1024, 614, (ctx, w, h) => {
      ctx.fillStyle = '#a9855a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#5c4630';
      for (let y = 14; y < h; y += 26) for (let x = 14; x < w; x += 26) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill(); }
      if (a.pegboard === 'outlines') {
        ctx.strokeStyle = 'rgba(245,240,225,0.9)'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
        for (const tool of tools) {
          const [x, y] = toCanvas(tool.x, tool.y), u = 1024 / bw;
          ctx.beginPath();
          if (tool.kind === 'hoop') ctx.arc(x, y, 0.48 * u, 0, 7);
          else if (tool.kind === 'shears') { ctx.arc(x - 0.16 * u, y + 0.05 * u, 0.15 * u, 0, 7); ctx.moveTo(x + 0.31 * u, y + 0.05 * u); ctx.arc(x + 0.16 * u, y + 0.05 * u, 0.15 * u, 0, 7); ctx.moveTo(x - 0.1 * u, y + 0.2 * u); ctx.lineTo(x + 0.06 * u, y + 1.15 * u); ctx.lineTo(x + 0.1 * u, y + 0.2 * u); }
          else if (tool.kind === 'tape') { ctx.moveTo(x - 0.3 * u, y); ctx.bezierCurveTo(x - 0.3 * u, y + 1.5 * u, x + 0.3 * u, y + 1.5 * u, x + 0.3 * u, y); }
          else { ctx.rect(x - 0.08 * u, y - 0.05 * u, 0.16 * u, 1.3 * u); ctx.rect(x - 0.08 * u, y + 1.1 * u, 0.9 * u, 0.16 * u); }
          ctx.stroke();
        }
      }
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.08), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.9 }));
    board.position.set(bx, by, -3.95);
    add(board);
    const frame = stuff('#7b5c3c');
    for (const [w, h, x, y] of [[bw + 0.2, 0.1, 0, bh / 2 + 0.05], [bw + 0.2, 0.1, 0, -bh / 2 - 0.05], [0.1, bh, -bw / 2 - 0.05, 0], [0.1, bh, bw / 2 + 0.05, 0]] as const) s.box([w, h, 0.12], [bx + x, by + y, -3.94], frame);
    const steel = stuff('#c9cdd0', { metalness: 0.85, roughness: 0.3 }), black = stuff('#1a1a1d', { roughness: 0.4 }), woodLight = stuff('#c9a06a');
    const pz = -3.84;
    tools.forEach((tool, index) => {
      s.rod([tool.x, tool.y + 0.02, -3.92], [tool.x, tool.y + 0.06, pz + 0.06], 0.02, steel);
      if (a.pegboard === 'outlines' && (index % 3 !== Math.floor(random() * 3) || index === 0)) return;
      const k = tool.k, z = pz + index * 0.012;
      if (tool.kind === 'hoop') s.ring(0.46 * k, 0.035, [tool.x, tool.y - 0.44 * k, z], woodLight);
      else if (tool.kind === 'shears') {
        for (const side of [-1, 1]) {
          s.ring(0.14 * k, 0.035 * k, [tool.x + side * 0.15 * k, tool.y - 0.06 * k, z], black);
          const blade = s.box([0.1 * k, 0.95 * k, 0.02], [tool.x + side * 0.025 * k, tool.y - 0.68 * k, z + side * 0.012], steel);
          blade.rotation.z = side * 0.09;
        }
      } else if (tool.kind === 'tape') {
        const tape = s.tube([[tool.x - 0.28 * k, tool.y, z], [tool.x - 0.3 * k, tool.y - 0.8 * k, z], [tool.x, tool.y - 1.3 * k, z + 0.02], [tool.x + 0.3 * k, tool.y - 0.8 * k, z], [tool.x + 0.28 * k, tool.y, z], [tool.x + 0.36 * k, tool.y - 0.5 * k, z + 0.03]], 0.045, stuff('#f2c81e'));
        tape.scale.z = 0.3;
        tape.position.z = z * 0.7;
      } else {
        s.box([0.16 * k, 1.3 * k, 0.02], [tool.x, tool.y - 0.6 * k, z], steel);
        s.box([0.9 * k, 0.16 * k, 0.02], [tool.x + 0.37 * k, tool.y - 1.17 * k, z], steel);
      }
    });
    // Shelf of reels and a dowel of ribbon.
    const reelTints = ['#c8202b', '#22386e', '#f1ede0', '#1c1b1d', '#c99a2c', '#2f8f6a', '#d9788f', '#7d4fc9', '#ef7d22'];
    const shelves = a.pegboard === 'crowded' ? [[-3.9, 2.0, 2.4], [-1.5, 2.05, 1.5]] : [[-3.9, 2.0, 2.2]];
    const reels: { at: [number, number, number]; size: number; color: string }[] = [], flanges: { at: [number, number, number]; size: number }[] = [];
    for (const [x, y, w] of shelves) {
      s.box([w, 0.06, 0.34], [x, y, -3.74], frame);
      const count = a.pegboard === 'outlines' ? 2 + Math.floor(random() * 2) : Math.floor(w / 0.3);
      for (let i = 0; i < count; i++) {
        const rx = a.pegboard === 'outlines' ? x - w / 2 + 0.2 + random() * (w - 0.4) : x - w / 2 + 0.17 + i * 0.3;
        reels.push({ at: [rx, y + 0.2, -3.72], size: 1, color: reelTints[Math.floor(random() * reelTints.length)] });
        flanges.push({ at: [rx, y + 0.05, -3.72], size: 1 }, { at: [rx, y + 0.35, -3.72], size: 1 });
      }
    }
    s.scatter(new THREE.CylinderGeometry(0.105, 0.105, 0.26, 14), stuff('#ffffff', { roughness: 0.85 }), reels);
    s.scatter(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), stuff('#d6b98a'), flanges);
    if (a.pegboard !== 'outlines') {
      for (const x of [-2.3, -0.7]) s.rod([x, 2.75, -3.92], [x, 2.75, pz + 0.12], 0.025, woodLight);
      s.rod([-2.3, 2.75, pz + 0.12], [-0.7, 2.75, pz + 0.12], 0.025, woodLight);
      for (let i = 0; i < 4; i++) {
        const tint = stuff(['#d9788f', '#2c7fd1', '#f1ede0', '#c8202b', '#2f8f6a'][Math.floor(random() * 5)], { roughness: 0.5 });
        s.cylinder(0.15, 0.15, 0.16, [-2.05 + i * 0.36, 2.75, pz + 0.12], tint, 16).rotation.z = Math.PI / 2;
        if (i % 2 === 0) s.box([0.14, 0.4 + random() * 0.4, 0.012], [-2.05 + i * 0.36, 2.42, pz + 0.26], tint);
      }
    }

    // What the garment is for.
    if (a.occasion !== 'none') {
      const map = paint(256, 320, (ctx, w, h) => {
        ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, w, h);
        if (a.occasion === 'calendar') {
          ctx.fillStyle = '#b3202a'; ctx.fillRect(0, 0, w, 70);
          ctx.fillStyle = '#f4efe0'; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center';
          ctx.fillText(['MAY', 'JUNE', 'SEPT', 'DEC', 'APRIL'][Math.floor(random() * 5)], w / 2, 50);
          ctx.fillStyle = '#4a4338';
          const ring = 6 + Math.floor(random() * 24);
          for (let i = 0; i < 35; i++) {
            const x = 22 + (i % 7) * 31, y = 100 + Math.floor(i / 7) * 42;
            if (i < 31) ctx.fillRect(x, y, 14, 14);
            if (i < ring && wear > 0.3) { ctx.strokeStyle = '#4a4338'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y + 18); ctx.lineTo(x + 18, y - 4); ctx.stroke(); }
            if (i === ring) { ctx.strokeStyle = '#d5202a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x + 7, y + 7, 19, 0, 7); ctx.stroke(); }
          }
        } else if (a.occasion === 'sketch') {
          ctx.strokeStyle = '#5a5a60'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(w / 2, 46, 20, 0, 7); ctx.moveTo(w / 2 - 30, 80); ctx.lineTo(w / 2 + 30, 80); ctx.lineTo(w / 2 + 18, 150); ctx.lineTo(w / 2 + 80, 300); ctx.lineTo(w / 2 - 80, 300); ctx.lineTo(w / 2 - 18, 150); ctx.closePath(); ctx.stroke();
          ctx.fillStyle = CLOTH_BASE[a.cloth]; ctx.fillRect(w - 78, 16, 60, 60); ctx.strokeRect(w - 78, 16, 60, 60);
        } else if (a.occasion === 'invitation') {
          ctx.strokeStyle = '#a9adb3'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, w - 28, h - 28);
          ctx.fillStyle = '#6a6a70'; ctx.textAlign = 'center'; ctx.font = 'italic 30px serif';
          ctx.fillText('request the', w / 2, 110); ctx.fillText('pleasure of', w / 2, 150); ctx.fillText('your company', w / 2, 190);
          for (const y of [230, 252, 274]) ctx.fillRect(60, y, w - 120, 3);
        } else {
          ctx.fillStyle = '#5c4630'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#b79c74'; ctx.fillRect(22, 22, w - 44, h - 44);
          ctx.fillStyle = '#4b3a28'; ctx.beginPath(); ctx.arc(w / 2, 130, 44, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(w / 2 - 80, h - 22); ctx.quadraticCurveTo(w / 2, 130, w / 2 + 80, h - 22); ctx.fill();
        }
      });
      const note = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.12, 0.03), [0, 1, 2, 3, 4, 5].map((face) => face === 4 ? new THREE.MeshStandardMaterial({ map, roughness: 0.9 }) : stuff('#e9e2d0')));
      note.position.set(0.45, 3.5, -3.97);
      note.rotation.z = (random() - 0.5) * 0.12;
      add(note);
      if (a.occasion !== 'photograph') s.ball([0.05, 0.05, 0.05], [0.45, 3.98, -3.93], stuff('#c8202b', { roughness: 0.3 }), 10);
    }

    // Cloth.
    const clothMap = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = CLOTH_BASE[a.cloth]; ctx.fillRect(0, 0, w, h);
      if (a.cloth === 'floral') for (let i = 0; i < 26; i++) {
        const x = random() * w, y = random() * h;
        ctx.fillStyle = ['#c7323d', '#3a5fa8', '#d9788f'][i % 3];
        for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 11, y + Math.sin(p * 1.257) * 11, 8, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#e6b53a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#5c8a4a'; ctx.fillRect(x + 12, y + 12, 9, 5);
      } else if (a.cloth === 'suiting') { ctx.fillStyle = 'rgba(225,225,232,0.55)'; for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 3, h); }
      else if (a.cloth === 'flannel') { ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 8; i += 2) { ctx.fillRect(i * 32, 0, 32, h); ctx.fillRect(0, i * 32, w, 32); } }
      else if (a.cloth === 'satin') for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.4)' : 'rgba(180,165,135,0.2)'; ctx.fillRect(0, i * 32 + random() * 10, w, 10 + random() * 12); }
      else { ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2; for (let i = -h; i < w; i += 9) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); } }
    }, [5, 4]);
    const clothMat = new THREE.MeshStandardMaterial({ map: clothMap, side: THREE.DoubleSide, roughness: a.cloth === 'satin' ? 0.35 : a.cloth === 'velvet' ? 1 : 0.9, metalness: a.cloth === 'satin' ? 0.12 : 0 });
    clothMat.color.lerp(new THREE.Color('#8b8275'), wear * 0.22);
    const sheet = (x0: number, x1: number, z0: number, z1: number, material: THREE.Material, lift: number, bumps: number, humps: [number, number, number, number][] = []) => {
      const geometry = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) * 7), Math.ceil((z1 - z0) * 7));
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position, f1 = random() * 6, f2 = random() * 6;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v) + (x0 + x1) / 2, z = pos.getZ(v) + (z0 + z1) / 2;
        let y = lift + bumps * (1 + 0.5 * Math.sin(x * 2.1 + z * 1.3 + f1) + 0.5 * Math.sin(z * 3.3 - x * 0.9 + f2));
        for (const [hx, hz, r, h] of humps) y += h * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
        const over = z - 3.96;
        if (over > 0) pos.setXYZ(v, x, lift - over * 0.96 + Math.sin(x * 5 + f1) * 0.03, 3.98 + 0.07 * (1 - Math.exp(-over * 5)) + Math.sin(x * 5 + f1) * 0.03 * Math.min(1, over * 3));
        else pos.setXYZ(v, x, y, z);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      return add(mesh);
    };
    const tissueMap = paint(512, 512, (ctx, w, h) => {
      ctx.fillStyle = a.stage === 'abandoned' ? '#cdb47c' : '#e6d6ad'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ctx.fillStyle = '#4a4030'; ctx.lineWidth = 3;
      ctx.setLineDash([16, 10]);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 60 + i * 128); ctx.bezierCurveTo(w * 0.3, 20 + i * 128, w * 0.6, 110 + i * 128, w, 60 + i * 128); ctx.stroke(); }
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const x = 90 + i * 160, y = 150 + i * 110;
        ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.lineTo(x, y + 70); ctx.moveTo(x - 12, y - 50); ctx.lineTo(x, y - 72); ctx.lineTo(x + 12, y - 50); ctx.moveTo(x - 12, y + 50); ctx.lineTo(x, y + 72); ctx.lineTo(x + 12, y + 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 60, y); ctx.lineTo(x + 76, y + 22); ctx.lineTo(x + 92, y); ctx.fill();
        ctx.font = 'bold 34px sans-serif'; ctx.fillText(String(i + 1 + Math.floor(random() * 5)), x + 30, y - 30);
      }
    }, [0.4, 0.4]);
    const tissue = new THREE.MeshStandardMaterial({ map: tissueMap, side: THREE.DoubleSide, roughness: 0.95 });

    const kits = {
      wedding: [['skirt', 1.1, 1.25], ['skirt', 1.1, 1.25], ['bodice', 0.95, 1], ['sleeve', 0.9, 1], ['sleeve', 0.9, 1]],
      child: [['bodice', 0.5, 1], ['bodice', 0.5, 1], ['skirt', 0.6, 0.7], ['sleeve', 0.42, 1], ['sleeve', 0.42, 1], ['collar', 0.5, 1], ['pocket', 0.6, 1]],
      jacket: [['bodice', 1.15, 1], ['bodice', 1.15, 1], ['sleeve', 1.05, 1], ['sleeve', 1.05, 1], ['collar', 0.9, 1], ['pocket', 0.9, 1], ['pocket', 0.9, 1]],
      christening: [['skirt', 0.85, 1.9], ['skirt', 0.85, 1.9], ['bodice', 0.36, 1], ['sleeve', 0.32, 1], ['sleeve', 0.32, 1]],
      skirt: [['skirt', 1.15, 0.9], ['skirt', 1.15, 0.9], ['cuff', 1.3, 1], ['pocket', 0.8, 1]],
    } as const;
    const spots: P[] = [[-2.6, -0.5], [1.7, -1.2], [-0.5, 1.6], [2.5, 1.5], [-3.6, 2.2], [0.2, -1.6], [3.4, -0.2]];
    const pinAt: { at: [number, number, number]; size: number; color: string }[] = [];
    const pinTints = ['#e2332e', '#f2c21d', '#f4f1ea', '#2c7fd1', '#2fa35a'];
    const layPieces = (stacked: boolean) => {
      kits[a.garment].forEach(([kind, k, long], index) => {
        const shape = piece(kind, k, long);
        const geometry = new THREE.ShapeGeometry(shape, 10);
        geometry.rotateX(Math.PI / 2);
        const group = new THREE.Group();
        const paper = new THREE.Mesh(geometry, tissue);
        paper.position.y = stacked ? 0.016 : 0;
        group.add(paper);
        if (stacked) {
          const under = new THREE.Mesh(geometry, clothMat);
          under.scale.set(1.03, 1, 1.03);
          group.add(under);
        }
        const [x, z] = stacked ? [1.2 + (index % 3) * 1.55 + (random() - 0.5) * 0.3, -1.6 + Math.floor(index / 3) * 2.0 + (random() - 0.5) * 0.3] as P : spots[index % spots.length];
        group.position.set(x, stacked ? 0.02 + index * 0.012 : 0.075 + index * 0.002, z);
        group.rotation.y = (kind === 'skirt' ? Math.PI / 2 : Math.round(random() * 3) * Math.PI / 2) + (random() - 0.5) * 0.3;
        add(group);
        if (!stacked) {
          group.updateMatrixWorld(true);
          const points = shape.getPoints(3);
          for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 7))) {
            const at = group.localToWorld(new THREE.Vector3(points[i].x * 0.9, 0.03, points[i].y * 0.9));
            pinAt.push({ at: [at.x, at.y, at.z], size: 1, color: pinTints[Math.floor(random() * pinTints.length)] });
          }
        }
      });
    };

    const bolt = (x: number, z: number, turns: number) => {
      const roll = s.box([0.95, 0.12 + turns * 0.05, 3.3], [x, 0.06 + turns * 0.025, z], clothMat);
      roll.rotation.y = (random() - 0.5) * 0.08;
      for (const end of [-1, 1]) s.box([0.8, 0.05, 0.05], [x, 0.06 + turns * 0.025, z + end * 1.66], stuff('#cdbb95'));
    };
    if (a.stage === 'laid' || a.stage === 'abandoned') {
      sheet(-4.9, 4.2, -2.6, 4.9, clothMat, 0.02, 0.018);
      bolt(-5.25, -1.0, 5);
      layPieces(false);
      if (a.stage === 'abandoned') {
        const dust = new THREE.MeshStandardMaterial({ color: '#cfcabd', side: THREE.DoubleSide, roughness: 1 });
        sheet(-6.1, -3.6, -3.7, 3.2, dust, 0.09, 0.03, [[-5.25, -1.0, 1.2, 0.42], [-4.4, 1.6, 0.8, 0.12]]);
      }
    } else if (a.stage === 'cut') {
      sheet(-4.9, -0.4, -2.6, 4.7, clothMat, 0.02, 0.018);
      bolt(-5.25, -1.0, 2);
      layPieces(true);
      const scraps: THREE.Matrix4[] = [];
      const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 40 + mood.density * 110; i++) {
        q.setFromAxisAngle(up, random() * 6);
        scraps.push(new THREE.Matrix4().compose(new THREE.Vector3(mix(-1, 5.6, random()), 0.012 + (i % 5) * 0.003, mix(-3.4, 3.6, random())), q, new THREE.Vector3(mix(0.08, 0.5, random() * random()), 1, mix(0.04, 0.14, random()))));
      }
      const offcuts = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.01, 3), clothMat, scraps.length);
      scraps.forEach((matrix, index) => offcuts.setMatrixAt(index, matrix));
      add(offcuts);
    } else {
      // Folded away, the last length still lying where it was smoothed out.
      sheet(-4.9, -1.2, -1.4, 4.7, clothMat, 0.02, 0.018);
      for (let i = 0; i < 5; i++) s.box([2.3 - i * 0.05, 0.11, 1.7 - i * 0.04], [-4.4 + (random() - 0.5) * 0.06, 0.06 + i * 0.115, -2.6 + (random() - 0.5) * 0.06], clothMat).rotation.y = (random() - 0.5) * 0.06;
      const envelope = paint(256, 340, (ctx, w, h) => {
        ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8e2a3a'; ctx.fillRect(0, 0, w, 54);
        ctx.fillStyle = '#efe6cf'; ctx.font = 'bold 30px serif'; ctx.fillText('PATTERN', 14, 38);
        ctx.fillStyle = '#4a4338'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(String(1000 + Math.floor(random() * 8999)), 150, 86);
        for (const x of [78, 172]) {
          ctx.fillStyle = '#e7c9b0'; ctx.beginPath(); ctx.arc(x, 120, 16, 0, 7); ctx.fill();
          ctx.fillStyle = x < 100 ? CLOTH_BASE[a.cloth] : '#7c93b8';
          ctx.beginPath(); ctx.moveTo(x - 20, 140); ctx.lineTo(x + 20, 140); ctx.lineTo(x + 12, 190); ctx.lineTo(x + 46, 320); ctx.lineTo(x - 46, 320); ctx.lineTo(x - 12, 190); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#4a4338'; ctx.lineWidth = 2; ctx.stroke();
        }
      });
      const packet = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 1.65), [0, 1, 2, 3, 4, 5].map((face) => face === 2 ? new THREE.MeshStandardMaterial({ map: envelope, roughness: 0.9 }) : stuff('#e6dcc2')));
      packet.position.set(-4.3, 0.66, -2.55);
      packet.rotation.y = 0.25 + random() * 0.3;
      add(packet);
      // Chalk ghosts of the last job still on the wood.
      const ghost = new THREE.MeshStandardMaterial({ color: '#efe9da', transparent: true, opacity: 0.6, depthWrite: false, roughness: 1 });
      kits[a.garment].slice(0, 4).forEach(([kind, k, long], index) => {
        const outline = piece(kind, k, long).getPoints(6);
        if (spots[index][0] < -1) return;
        const dashes: THREE.Matrix4[] = [];
        const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), turn = random() * 6, [cx, cz] = spots[index];
        outline.forEach((p, i) => {
          const n = outline[(i + 1) % outline.length], mx = (p.x + n.x) / 2, mz = (p.y + n.y) / 2, len = Math.hypot(n.x - p.x, n.y - p.y);
          const ang = Math.atan2(n.y - p.y, n.x - p.x);
          q.setFromAxisAngle(up, -(ang + turn));
          dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(cx + mx * Math.cos(turn) - mz * Math.sin(turn), 0.004, cz + mx * Math.sin(turn) + mz * Math.cos(turn)), q, new THREE.Vector3(len * 0.7, 1, 1)));
        });
        const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.002, 0.045), ghost, dashes.length);
        dashes.forEach((matrix, i) => marks.setMatrixAt(i, matrix));
        s.root.add(marks);
      });
    }
    if (pinAt.length) {
      s.scatter(new THREE.SphereGeometry(0.035, 8, 6), stuff('#ffffff', { roughness: 0.3 }), pinAt);
      const shafts = s.scatter(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 4), steel, pinAt.map((pin) => ({ at: [pin.at[0], pin.at[1] - 0.03, pin.at[2]] as [number, number, number], size: 1 })));
      shafts.castShadow = false;
    }

    // Standing kit along the back and edges, out of the cast's way.
    const stick = paint(1024, 32, (ctx, w, h) => {
      ctx.fillStyle = '#d9b676'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3a2c12';
      for (let i = 0; i <= 36; i++) ctx.fillRect(i * w / 36, 0, i % 12 === 0 ? 5 : 2.5, i % 3 === 0 ? h * 0.7 : h * 0.4);
    });
    const yard = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.035, 0.2), [0, 1, 2, 3, 4, 5].map((face) => face === 2 ? new THREE.MeshStandardMaterial({ map: stick, roughness: 0.6 }) : stuff('#c9a563')));
    yard.position.set(2.6, -0.15, 4.025);
    yard.rotation.set(Math.PI / 2, 0, 0);
    for (const x of [0.1, 5.1]) s.rod([x, -0.15, 3.9], [x, -0.15, 4.05], 0.022, steel);
    add(yard);
    if (mood.density > 0.3) {
      // A cup of tea gone cold, and a dish of pins.
      s.cylinder(0.2, 0.15, 0.3, [5.3, 0.15, -3.1], stuff('#e9e4d6', { roughness: 0.4 }), 16);
      s.cylinder(0.17, 0.17, 0.01, [5.3, 0.285, -3.1], stuff('#6b4a2c', { roughness: 0.3 }), 16);
      s.ring(0.1, 0.022, [5.52, 0.16, -3.1], stuff('#e9e4d6'));
      s.cylinder(0.3, 0.22, 0.07, [5.2, 0.035, 3.2], stuff('#8fa7b8', { metalness: 0.4, roughness: 0.4 }), 18);
      const dish: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 22; i++) { const t = random() * 6, r = random() * 0.22; dish.push({ at: [5.2 + Math.cos(t) * r, 0.09, 3.2 + Math.sin(t) * r], size: 1, color: pinTints[i % 5] }); }
      s.scatter(new THREE.SphereGeometry(0.03, 6, 5), stuff('#ffffff', { roughness: 0.3 }), dish);
    }
    if (mood.density > 0.6) {
      for (let i = 0; i < 3; i++) s.box([0.34, 0.07, 0.3], [-5.4 + i * 0.4, 0.04, 3.3 + (random() - 0.5) * 0.2], stuff(['#f4f2ea', '#4f7fc4', '#b5553f'][i], { roughness: 1 })).rotation.y = random() * 3;
      for (let i = 0; i < 4; i++) { s.cylinder(0.13, 0.13, 0.26, [4.3 + i * 0.34, 0.13, -3.75], stuff(reelTints[Math.floor(random() * reelTints.length)]), 12); }
    }

    // Work lamp clamped to the back corner.
    const lampMetal = stuff(mood.cheer > 0.5 ? '#c9b25a' : '#4f5a57', { metalness: 0.5, roughness: 0.4 });
    s.cylinder(0.3, 0.34, 0.08, [-5.4, 0.04, -3.4], lampMetal, 18);
    s.rod([-5.4, 0.05, -3.4], [-5.55, 1.7, -3.5], 0.035, lampMetal);
    s.rod([-5.55, 1.7, -3.5], [-4.5, 2.5, -2.9], 0.035, lampMetal);
    s.ball([0.07, 0.07, 0.07], [-5.55, 1.7, -3.5], lampMetal, 10);
    const head = new THREE.Vector3(-4.35, 2.45, -2.8);
    const shade = s.mesh(new THREE.ConeGeometry(0.42, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ color: lampMetal.color, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), [head.x, head.y, head.z]);
    shade.rotation.set(0.35, 0, -0.55);
    const lit = a.lamp;
    const bulb = s.ball([0.14, 0.14, 0.14], [head.x + 0.08, head.y - 0.14, head.z + 0.05], new THREE.MeshStandardMaterial({ color: lit ? '#fff3c8' : '#d8d4c8', emissive: lit ? '#ffd98a' : '#000000', emissiveIntensity: lit ? 1.6 : 0 }), 12);
    bulb.castShadow = false;
    let lampLight: THREE.PointLight | null = null;
    if (lit) {
      lampLight = new THREE.PointLight('#ffd9a0', mix(9, 26, Math.abs(day - 0.5) * 2), 9, 1.6);
      lampLight.position.set(head.x + 0.2, head.y - 0.3, head.z + 0.2);
      s.root.add(lampLight);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshBasicMaterial({ color: '#ffe2a8', transparent: true, opacity: 0.16, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-3.3, 0.13, -1.6);
      s.root.add(pool);
    }

    // Compact edge stations leave the six cast slots free.
    if (a.stock !== 'clear') {
      const x = 0.15, z = -3.62, w = 1.6;
      if (a.stock === 'jars') for (let k = 0; k < 3; k++) {
        const cx = x - 0.52 + k * 0.52;
        s.cylinder(0.2, 0.19, 0.44, [cx, 0.22, z], stuff('#cee0de', { transparent: true, opacity: 0.24, depthWrite: false }), 18);
        s.cylinder(0.21, 0.21, 0.06, [cx, 0.47, z], steel, 18);
        for (let n = 0; n < 10; n++) s.cylinder(0.035, 0.035, 0.018, [cx + (random() - 0.5) * 0.2, 0.04 + Math.floor(n / 3) * 0.07, z + (random() - 0.5) * 0.2], stuff(reelTints[(k * 3 + n) % reelTints.length]), 8);
      } else {
        for (const y of [0.035, 0.34, 0.65]) s.box([w, 0.07, 0.48], [x, y, z], frame);
        for (const cx of [x - w / 2 + 0.035, x, x + w / 2 - 0.035]) s.box([0.07, 0.62, 0.48], [cx, 0.34, z], frame);
        s.box([w, 0.65, 0.04], [x, 0.325, z - 0.22], frame);
        for (let k = 0; k < 4; k++) {
          const cx = x + (k % 2 ? 0.39 : -0.39), y = 0.185 + Math.floor(k / 2) * 0.31;
          if (a.stock === 'drawers') { s.box([0.69, 0.23, 0.03], [cx, y, z + 0.24], woodLight); s.box([0.24, 0.09, 0.015], [cx, y, z + 0.26], trim); s.ball([0.035, 0.035, 0.035], [cx + 0.22, y, z + 0.28], steel, 8); }
          else for (let n = 0; n < 3; n++) s.box([0.14, 0.12, 0.25], [cx - 0.2 + n * 0.2, y - 0.06, z], stuff(reelTints[k + n]));
        }
      }
    }
    if (a.paperwork !== 'none') {
      const map = paint(512, 256, (c, w, h) => {
        c.fillStyle = '#efe5cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#514739'; c.font = 'bold 32px serif'; c.fillText(a.paperwork === 'orders' ? 'FITTING ORDERS' : a.paperwork === 'measurements' ? 'MEASUREMENTS' : 'CLOTH RECEIPT', 20, 44);
        c.font = '25px monospace'; const rows = a.paperwork === 'orders' ? ['DRESS    MON 10', 'JACKET   WED 14', 'HEM      FRI 09'] : a.paperwork === 'measurements' ? ['CHEST  92 cm', 'WAIST  74 cm', 'SLEEVE 58 cm'] : ['COTTON    4 m', 'LINING    2 m', 'THREAD    3 reels'];
        rows.forEach((r, k) => c.fillText(r, 20, 100 + k * 55));
      });
      s.mesh(new THREE.PlaneGeometry(1.45, 0.7), new THREE.MeshStandardMaterial({ map }), [3.1, 0.77, -3.975]);
      s.box([0.15, 0.08, 0.03], [3.1, 1.11, -3.95], steel);
      if (a.paperwork === 'receipt') s.box([0.7, 0.4, 0.018], [4.3, 0.7, -3.975], stuff('#c5ac81'));
    }
    if (a.samples !== 'none') {
      const colors = ['#8d4559', '#d4bc91', '#4b7092', '#728c63'];
      if (a.samples === 'fan') for (let k = 0; k < 4; k++) {
        const swatch = s.box([0.55, 0.018, 0.42], [1.5 + k * 0.17, (a.surface === 'wood' ? 0 : 0.008) + 0.009 + k * 0.018, -3.05], stuff(colors[k])); swatch.rotation.y = (k - 1.5) * 0.22;
      } else if (a.samples === 'chain') {
        for (const x of [4.65, 5.7]) s.rod([x, 0, -2.55], [x, 1.1, -2.55], 0.025, woodLight);
        s.rod([4.65, 1.1, -2.55], [5.7, 1.1, -2.55], 0.025, woodLight);
        for (let k = 0; k < 4; k++) { const x = 4.8 + k * 0.25; s.rod([x, 1.1, -2.55], [x, 0.91, -2.55], 0.012, steel); s.box([0.22, 0.38, 0.015], [x, 0.73, -2.55], stuff(colors[k])); }
      } else {
        s.box([1.3, 1.05, 0.04], [5.55, 3.8, -3.98], frame);
        for (let k = 0; k < 4; k++) s.box([0.5, 0.38, 0.018], [5.25 + k % 2 * 0.6, 3.57 + Math.floor(k / 2) * 0.48, -3.951], stuff(colors[k]));
      }
    }
    if (a.pressing !== 'none') {
      const x = 5.45, z = 0.75, wood = stuff('#bc9968'), padding = stuff('#e5dbc4', { roughness: 1 });
      if (a.pressing === 'sleeve') {
        for (const dz of [-0.58, 0.58]) s.box([0.38, 0.26, 0.12], [x, 0.13, z + dz], wood);
        s.box([0.6, 0.11, 1.55], [x, 0.315, z], padding);
      } else {
        s.box([0.65, 0.08, 1.15], [x, 0.04, z], wood);
        if (a.pressing === 'ham') s.ball([0.28, 0.23, 0.47], [x, 0.31, z], padding, 20);
        else { s.box([0.3, 0.12, 0.65], [x - 0.12, 0.14, z - 0.1], wood); s.cylinder(0.12, 0.12, 0.7, [x + 0.18, 0.2, z + 0.1], padding, 16).rotation.x = Math.PI / 2; }
      }
    }
    if (a.offcuts !== 'none') {
      const x = -5.45, z = 2.55, w = 0.95, d = 1.2, bottom = a.offcuts === 'bundle' ? 0.01 : 0.06;
      const rim = a.offcuts === 'tray' ? steel : frame;
      if (a.offcuts !== 'bundle') {
        s.box([w, 0.06, d], [x, 0.03, z], rim);
        for (const side of [-1, 1]) { s.box([w, 0.2, 0.04], [x, 0.16, z + side * d / 2], rim); s.box([0.04, 0.2, d], [x + side * w / 2, 0.16, z], rim); }
        if (a.offcuts === 'basket') for (let k = 0; k < 5; k++) for (const side of [-1, 1]) s.box([0.04, 0.3, 0.04], [x - w * 0.42 + k * w * 0.21, 0.2, z + side * d / 2], woodLight);
      }
      for (let k = 0; k < 4; k++) s.box([0.73 - k * 0.04, 0.075, 0.86 - k * 0.04], [x, bottom + 0.0375 + k * 0.077, z], stuff(reelTints[k + 1]));
      if (a.offcuts === 'bundle') { s.box([0.07, 0.008, 0.9], [x, bottom + 0.316, z], trim); for (const side of [-1, 1]) s.box([0.07, 0.31, 0.008], [x, bottom + 0.155, z + side * 0.43], trim); }
    }

    const base = lampLight?.intensity ?? 0;
    const flicker = mood.wear > 0.7 ? mood.energy : 0;
    if (lampLight && flicker > 0.05) world.update = (_dt, time) => { lampLight!.intensity = base * (1 - flicker * 0.25 * Math.max(0, Math.sin(time * 13) * Math.sin(time * 5.3))); };
    return world;
  },
});

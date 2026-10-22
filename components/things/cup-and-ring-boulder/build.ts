import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { instanced, makeNoise, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

const ROCK = {
  sandstone: 'Buff-grey fell sandstone, fine-grained and smooth.',
  gritstone: 'Honey-brown millstone grit, coarse and warm.',
  schist: 'Dark silvery schist with a sheen.',
  granite: 'Pinkish granite, speckled.',
  whin: 'Near-black whinstone, the carvings pale against it.',
} as const;
const ROCK_TINT: Record<keyof typeof ROCK, string> = { sandstone: '#aaa290', gritstone: '#b4935f', schist: '#6a7076', granite: '#b99c92', whin: '#4b4a49' };

interface Motif { x: number; z: number; r: number; kind: 'cup' | 'rings' | 'spiral' | 'rosette' | 'keyhole'; rings: number; tail: number }

export default defineThing({
  questions: {
    rock: choice('What rock is it?', ROCK),
    form: choice('What shape is the outcrop?', {
      whaleback: 'A smooth domed whaleback rising out of the turf.',
      slab: 'A flat table of rock, tilted a little to one side.',
      split: 'A dome split by a deep natural crack that the carvings respect.',
      flush: 'A sheet of rock barely proud of the ground, easily walked past.',
    }),
    extent: score('How big is it?', ['A stone you could carry', 'A boulder the size of a table', 'An outcrop as long as a car']),
    motif: choice('What is the main design?', {
      rings: 'Cups ringed by concentric circles, each with a channel running out.',
      cups: 'Plain round cups scattered like a constellation.',
      spirals: 'Tight spirals coiling outward.',
      rosettes: 'Rosettes: a central cup circled by smaller cups.',
      keyholes: 'Keyhole and horseshoe shapes open on one side.',
    }),
    crowding: score('How much of the surface is carved?', ['One lone motif', 'A handful', 'Every inch crowded and linked by channels']),
    holding: choice('What do the cups hold?', {
      dry: 'Nothing; the rock is dry.',
      rain: 'Rainwater, each cup a small mirror.',
      milk: 'Milk poured out as an offering.',
      coins: 'Coins left by visitors.',
      berries: 'Rowan berries and flower heads.',
      quartz: 'White quartz pebbles.',
      candles: 'Candle stubs, some still burning.',
    }),
    chalked: noul('Have the carvings been filled in with white chalk to show them up?'),
    around: choice('What surrounds the rock?', {
      turf: 'Short turf creeping over its edges.',
      heather: 'Heather and bilberry crowding in.',
      bracken: 'Bracken fronds hanging over it.',
      excavation: 'It has just been uncovered: bare soil, a string grid on pegs, a ranging pole and a trowel.',
      peat: 'Dark wet peat with a pool at its foot.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(random);
    const R0 = mix(0.3, 1.25, a.extent) * mix(0.9, 1.1, random());
    const sx = mix(1.15, 1.55, random());
    const H = R0 * { whaleback: 0.55, slab: 0.4, split: 0.6, flush: 0.16 }[a.form];
    const power = { whaleback: 2.2, slab: 7, split: 2.6, flush: 3 }[a.form];
    const slope = a.form === 'slab' ? mix(0.25, 0.5, random()) * (random() < 0.5 ? -1 : 1) : 0;
    const ph = [random() * 6.3, random() * 6.3, random() * 6.3];
    const Rof = (angle: number) => R0 * (1 + 0.11 * Math.sin(2 * angle + ph[0]) + 0.07 * Math.sin(3 * angle + ph[1]) + 0.04 * Math.sin(5 * angle + ph[2]));
    const crackSlope = (random() - 0.5) * 0.8, crackAt = (random() - 0.5) * R0 * 0.3, crackW = R0 * 0.06;
    const skirtH = R0 * 0.07;
    const quotient = (x: number, z: number) => { const xe = x / sx; return Math.hypot(xe, z) / Rof(Math.atan2(z, xe)); };
    const heightAt = (x: number, z: number) => {
      const q = quotient(x, z);
      if (q >= 1) return skirtH * Math.max(0, 1 - (q - 1) / 0.3);
      let h = H * Math.pow(1 - Math.pow(q, power), 0.6);
      h += noise(x / R0 * 1.6, 0, z / R0 * 1.6, 2) * H * 0.16 * (1 - q * q);
      h += (x / R0) * slope * H * (1 - Math.pow(q, 4));
      if (a.form === 'split') {
        const off = Math.abs(z - (x * crackSlope + crackAt));
        if (off < crackW) h *= 0.2 + 0.8 * (off / crackW) ** 0.7;
      }
      return Math.max(h, 0) + skirtH;
    };

    // Motifs, kept clear of each other, the edge and the crack.
    const motifKind = { rings: 'rings', cups: 'cup', spirals: 'spiral', rosettes: 'rosette', keyholes: 'keyhole' }[a.motif] as Motif['kind'];
    const wanted = Math.round(mix(1, 14, a.crowding) + mood.density * 2);
    const motifs: Motif[] = [];
    for (let attempt = 0; attempt < 500 && motifs.length < wanted; attempt++) {
      const first = motifs.length === 0;
      const angle = random() * Math.PI * 2, reach = first && attempt < 60 ? (a.form === 'split' ? mix(0.28, 0.45, random()) : random() * 0.2) : Math.sqrt(random()) * 0.74;
      const x = Math.cos(angle) * reach * Rof(angle) * sx, z = Math.sin(angle) * reach * Rof(angle);
      const lesser = !first && random() < 0.35;
      const kind: Motif['kind'] = lesser ? 'cup' : motifKind;
      const r = R0 * (kind === 'cup' ? mix(0.05, 0.08, random()) : mix(0.2, 0.33, random()) * (first ? (a.form === 'split' ? 0.95 : mix(1.5, 1.1, a.crowding)) : 1) * mix(1, 0.62, a.crowding));
      if (quotient(x, z) + (r / R0) * 0.85 > 0.9) continue;
      if (a.form === 'split' && Math.abs(z - (x * crackSlope + crackAt)) < crackW + r) continue;
      if (motifs.some((other) => Math.hypot(other.x - x, other.z - z) < other.r + r + R0 * 0.02)) continue;
      motifs.push({ x, z, r, kind, rings: 2 + Math.floor(random() * 3), tail: random() * Math.PI * 2 });
    }

    // Paint the top-down picture: turf, rock, lichen, then the pecked lines.
    const E = R0 * sx * 1.5;
    const size = 1024, scale = size / (2 * E);
    const px = (x: number) => (x + E) * scale, pz = (z: number) => (z + E) * scale;
    const frost = mood.warmth < 0.3 ? mix(0.8, 0, mood.warmth / 0.3) : 0;
    const groundTint = a.around === 'excavation' ? '#6a5136' : a.around === 'peat' ? '#33291f' : frost > 0.3 ? '#9fb3a3' : mood.warmth > 0.65 ? '#8a8a4a' : '#55733a';
    const rock = new THREE.Color(ROCK_TINT[a.rock]);
    const canvas = document.createElement('canvas'), bump = document.createElement('canvas');
    canvas.width = canvas.height = bump.width = bump.height = size;
    const ctx = canvas.getContext('2d')!, btx = bump.getContext('2d')!;
    ctx.fillStyle = groundTint;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${random() < 0.5 ? '20,30,10' : '230,235,190'},${0.05 + random() * 0.08})`;
      ctx.fillRect(random() * size, random() * size, 3 + random() * 6, 3 + random() * 6);
    }
    const outline = (grow: number) => {
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const angle = (i / 96) * Math.PI * 2;
        const creep = 1 + grow + 0.012 * Math.sin(angle * 11 + ph[0]) + 0.01 * Math.sin(angle * 17 + ph[1]);
        ctx.lineTo(px(Math.cos(angle) * Rof(angle) * sx * creep), pz(Math.sin(angle) * Rof(angle) * creep));
      }
      ctx.closePath();
    };
    ctx.save();
    outline(a.around === 'excavation' ? 0.03 : 0.005);
    ctx.fillStyle = `#${rock.getHexString()}`;
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 520; i++) {
      const light = random() < 0.5;
      ctx.fillStyle = `rgba(${light ? '255,250,235' : '30,25,20'},${0.03 + random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(random() * size, random() * size, 6 + random() * 40, 4 + random() * 22, random() * 3, 0, 7);
      ctx.fill();
    }
    const lichen = ['#cfd4b4', '#d9a43a', '#8d9a78', '#e8e3cf'];
    for (let i = 0; i < Math.round(mix(12, 70, mood.wear)); i++) {
      ctx.fillStyle = lichen[Math.floor(random() * lichen.length)];
      ctx.globalAlpha = 0.35 + random() * 0.4;
      const cx = random() * size, cy = random() * size, rr = 5 + random() * 20;
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(cx + (random() - 0.5) * rr * 1.5, cy + (random() - 0.5) * rr * 1.5, rr * (0.3 + random() * 0.5), 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (a.form === 'split') {
      ctx.strokeStyle = 'rgba(15,12,10,0.85)';
      ctx.lineWidth = crackW * scale * 0.9;
      ctx.beginPath(); ctx.moveTo(px(-E), pz(-E * crackSlope + crackAt)); ctx.lineTo(px(E), pz(E * crackSlope + crackAt)); ctx.stroke();
    }
    btx.fillStyle = '#808080';
    btx.fillRect(0, 0, size, size);
    const groove = Math.max(7, R0 * 0.034 * scale);
    const dark = a.rock === 'whin' || a.rock === 'schist';
    const ink = a.chalked ? 'rgba(248,246,238,0.95)' : dark ? 'rgba(226,220,206,0.92)' : a.holding === 'rain' ? 'rgba(20,26,36,0.92)' : 'rgba(32,24,18,0.9)';
    const pecked = (draw: (c: CanvasRenderingContext2D) => void) => {
      if (!a.chalked) { ctx.save(); ctx.translate(groove * 0.3, groove * 0.3); ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,250,235,0.5)'; draw(ctx); ctx.restore(); }
      ctx.strokeStyle = ctx.fillStyle = ink;
      draw(ctx);
      btx.strokeStyle = btx.fillStyle = '#101010';
      draw(btx);
    };
    ctx.lineCap = btx.lineCap = 'round';
    ctx.lineWidth = btx.lineWidth = groove;
    const wobble = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, bend: number) => {
      c.beginPath(); c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend, x1, y1);
      c.stroke();
    };
    for (const m of motifs) {
      const cx = px(m.x), cy = pz(m.z), r = m.r * scale;
      const tx = Math.cos(m.tail), ty = Math.sin(m.tail), bend = (random() - 0.5) * 0.5;
      const rosetteTurn = random() * 6.28;
      pecked((c) => {
        if (m.kind === 'cup') { c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); return; }
        const cup = r * 0.2;
        c.beginPath(); c.arc(cx, cy, cup, 0, 7); c.fill();
        if (m.kind === 'rings') {
          for (let ring = 1; ring <= m.rings; ring++) { c.beginPath(); c.arc(cx, cy, cup + ((r - cup) * ring) / m.rings, m.tail + 0.32 / ring, m.tail + Math.PI * 2 - 0.32 / ring); c.stroke(); }
          wobble(c, cx, cy, cx + tx * r * 1.75, cy + ty * r * 1.75, bend);
        } else if (m.kind === 'spiral') {
          c.beginPath();
          const turns = 2.2 + m.rings * 0.5;
          for (let t = 0; t <= turns * Math.PI * 2; t += 0.15) c.lineTo(cx + Math.cos(t + m.tail) * r * (t / (turns * Math.PI * 2)), cy + Math.sin(t + m.tail) * r * (t / (turns * Math.PI * 2)));
          c.stroke();
        } else if (m.kind === 'rosette') {
          const n = 6 + m.rings;
          for (let i = 0; i < n; i++) { c.beginPath(); c.arc(cx + Math.cos(rosetteTurn + (i / n) * 6.283) * r * 0.62, cy + Math.sin(rosetteTurn + (i / n) * 6.283) * r * 0.62, cup * 0.7, 0, 7); c.fill(); }
          c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
        } else {
          for (let ring = 1; ring <= 2; ring++) {
            const rr = cup + ((r - cup) * ring) / 2;
            c.beginPath(); c.arc(cx, cy, rr, m.tail + 0.6, m.tail + Math.PI * 2 - 0.6); c.stroke();
            for (const side of [-1, 1]) { c.beginPath(); c.moveTo(cx + Math.cos(m.tail + side * 0.6) * rr, cy + Math.sin(m.tail + side * 0.6) * rr); c.lineTo(cx + Math.cos(m.tail + side * 0.6) * rr + tx * r * 0.6, cy + Math.sin(m.tail + side * 0.6) * rr + ty * r * 0.6); c.stroke(); }
          }
        }
      });
    }
    // On a crowded rock, channels wander from motif to motif.
    if (a.crowding > 0.55) for (let i = 1; i < motifs.length; i++) {
      const from = motifs[i], to = motifs[Math.floor(random() * i)];
      if (Math.hypot(from.x - to.x, from.z - to.z) > R0 * 0.8 || random() < 0.4) continue;
      const bend = (random() - 0.5) * 0.6;
      pecked((c) => wobble(c, px(from.x), pz(from.z), px(to.x), pz(to.z), bend));
    }
    ctx.restore();

    const map = new THREE.CanvasTexture(canvas), relief = new THREE.CanvasTexture(bump);
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = relief.flipY = false;
    map.anisotropy = 4;

    // The rock and its skirt of ground as one height field.
    const rings = 30, spokes = 72;
    const positions: number[] = [0, heightAt(0, 0), 0], uvs: number[] = [0.5, 0.5], index: number[] = [];
    for (let ring = 1; ring <= rings; ring++) for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = (spoke / spokes) * Math.PI * 2;
      const q = Math.pow(ring / rings, 0.8) * 1.3;
      const x = Math.cos(angle) * Rof(angle) * sx * q, z = Math.sin(angle) * Rof(angle) * q;
      positions.push(x, heightAt(x, z), z);
      uvs.push((x + E) / (2 * E), (z + E) / (2 * E));
    }
    for (let spoke = 0; spoke < spokes; spoke++) index.push(0, 1 + ((spoke + 1) % spokes), 1 + spoke);
    for (let ring = 1; ring < rings; ring++) for (let spoke = 0; spoke < spokes; spoke++) {
      const p0 = 1 + (ring - 1) * spokes + spoke, p1 = 1 + (ring - 1) * spokes + ((spoke + 1) % spokes), p2 = p0 + spokes, p3 = p1 + spokes;
      index.push(p0, p1, p2, p1, p3, p2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const wet = a.holding === 'rain' || a.around === 'peat';
    s.mesh(geometry, new THREE.MeshStandardMaterial({ map, bumpMap: relief, bumpScale: 6, roughness: wet ? 0.75 : 0.95 }));

    // What the cups hold.
    const cupOf = (m: Motif) => (m.kind === 'cup' ? m.r : m.r * 0.2);
    const top = (m: Motif) => heightAt(m.x, m.z);
    if (a.holding === 'rain' || a.holding === 'milk') {
      const liquid = a.holding === 'rain'
        ? new THREE.MeshStandardMaterial({ color: mood.daylight > 0.78 ? '#e0a877' : '#a9cbe0', roughness: 0.05, metalness: 0.5 })
        : new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.3 });
      const disc = new THREE.CylinderGeometry(1, 1, 1, 16);
      const mesh = instanced(disc, liquid, motifs.map((m) => ({ at: [m.x, top(m) + R0 * 0.004, m.z] as const, scale: [cupOf(m) * 1.05, R0 * 0.006, cupOf(m) * 1.05] as const })));
      mesh.castShadow = false;
      s.root.add(mesh);
    } else if (a.holding === 'coins') {
      const dabs: Dab[] = [];
      const metals = ['#c9a23a', '#b9773a', '#c9ccd0'];
      for (const m of motifs) for (let i = 0; i < 1 + Math.floor(random() * 4 * (0.4 + mood.density)); i++)
        dabs.push({ at: [m.x + (random() - 0.5) * cupOf(m), top(m) + R0 * 0.004 * (i + 1), m.z + (random() - 0.5) * cupOf(m)], scale: [R0 * 0.02, R0 * 0.003, R0 * 0.02], turn: [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], color: metals[Math.floor(random() * 3)] });
      s.root.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.85 }), dabs));
    } else if (a.holding === 'berries' || a.holding === 'quartz') {
      const dabs: Dab[] = [];
      const tints = a.holding === 'quartz' ? ['#f4f1ea', '#e7e2d8', '#fbf9f4'] : mood.cheer > 0.4 ? ['#c8321f', '#d9482b', '#e8c22a', '#f1ede2', '#8a5bd0'] : ['#7a2a1f', '#5b3a2a', '#8d8672'];
      for (const m of motifs) for (let i = 0; i < 2 + Math.floor(random() * 4 * (0.5 + mood.density)); i++) {
        const u = R0 * (a.holding === 'quartz' ? mix(0.02, 0.035, random()) : mix(0.012, 0.022, random()));
        dabs.push({ at: [m.x + (random() - 0.5) * cupOf(m) * 1.3, top(m) + u * 0.8, m.z + (random() - 0.5) * cupOf(m) * 1.3], scale: [u, u * (a.holding === 'quartz' ? 0.7 : 1), u], color: tints[Math.floor(random() * tints.length)] });
      }
      s.root.add(instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.holding === 'quartz' ? 0.35 : 0.6 }), dabs));
    } else if (a.holding === 'candles') {
      const wax: Dab[] = [], flames: Dab[] = [];
      for (const m of motifs) {
        const u = R0 * 0.022, h = u * mix(1.2, 4.5, random());
        wax.push({ at: [m.x, top(m) + h / 2, m.z], scale: [u, h, u], color: random() < 0.3 ? '#b23a2e' : '#efe6cf' });
        if (random() < mix(0.35, 1, mood.warmth)) flames.push({ at: [m.x, top(m) + h + u * 1.1, m.z], scale: [u * 0.6, u * 1.6, u * 0.6] });
      }
      s.root.add(instanced(new THREE.CylinderGeometry(1, 1.1, 1, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), wax));
      const glow = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9d2e', emissiveIntensity: 2.2 }), flames);
      glow.castShadow = false;
      s.root.add(glow);
    }

    // The surroundings.
    const rim = (spread = 1.08) => { const angle = random() * Math.PI * 2, q = spread + random() * 0.2; const x = Math.cos(angle) * Rof(angle) * sx * q, z = Math.sin(angle) * Rof(angle) * q; return [x, heightAt(x, z) * 0.6, z] as [number, number, number]; };
    const green = frost > 0.3 ? ['#a9bdb0', '#8fa894', '#c3d2cc'] : mood.warmth > 0.65 ? ['#a7a25a', '#8c9450', '#c2b56b'] : ['#5f7d3c', '#6f8a45', '#4d6b35'];
    if (a.around !== 'excavation' && a.around !== 'peat') {
      const blades: [number, number, number][] = [];
      for (let i = 0; i < Math.round(mix(50, 130, mood.density)); i++) blades.push(rim(1 + random() * 0.05));
      s.root.add(tufts(random, blades, green, R0 * 0.12));
    }
    if (a.around === 'heather') {
      const dabs: Dab[] = [];
      const bloom = mood.warmth > 0.45 ? ['#6d4a66', '#7b5573', '#5e4a3c', '#59613a'] : ['#5a4638', '#6b5340', '#4d4034'];
      for (let i = 0; i < Math.round(mix(9, 22, mood.density)); i++) {
        const [x, , z] = rim(1.1);
        const u = R0 * mix(0.09, 0.17, random());
        for (let j = 0; j < 4; j++) dabs.push({ at: [x + (random() - 0.5) * u * 1.5, u * 0.45, z + (random() - 0.5) * u * 1.5], scale: [u, u * 0.7, u], color: bloom[Math.floor(random() * bloom.length)] });
      }
      s.root.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), dabs));
    }
    if (a.around === 'bracken') {
      const fronds: [number, number, number][] = [];
      for (let i = 0; i < Math.round(mix(12, 30, mood.density)); i++) fronds.push(rim(1.08));
      s.root.add(tufts(random, fronds, ['#9a6a3a', '#84552c', '#a27a40', '#6f7a34'], R0 * 0.42));
    }
    if (a.around === 'peat') {
      const angle = random() * Math.PI * 2;
      const pool = s.cylinder(R0 * 0.5, R0 * 0.5, 0.012, [Math.cos(angle) * Rof(angle) * sx * 1.12, skirtH * 0.62, Math.sin(angle) * Rof(angle) * 1.12], new THREE.MeshStandardMaterial({ color: '#2f3a40', roughness: 0.05, metalness: 0.5 }), 20);
      pool.scale.set(1.3, 1, 0.7);
      pool.rotation.y = -angle + Math.PI / 2;
      pool.castShadow = false;
      const rushes: [number, number, number][] = [];
      for (let i = 0; i < 26; i++) rushes.push(rim(1.1));
      s.root.add(tufts(random, rushes, ['#6f6a3a', '#8a7a45', '#4f5a34'], R0 * 0.22));
    }
    if (a.around === 'excavation') {
      const peg = s.material('#d8c9a0'), string = s.material('#f4f1e6'), steel = s.material('#b8bcc0', { metalness: 0.7, roughness: 0.35 });
      const gx = R0 * sx * 1.22, gz = R0 * 1.22, ph2 = R0 * 0.16;
      const corners: [number, number][] = [[-gx, -gz], [gx, -gz], [gx, gz], [-gx, gz]];
      corners.forEach(([x, z], i) => {
        s.cylinder(R0 * 0.018, R0 * 0.012, ph2 * 1.3, [x, ph2 * 0.65, z], peg, 6);
        const [nx, nz] = corners[(i + 1) % 4];
        s.rod([x, ph2, z], [nx, ph2, nz], R0 * 0.005, string);
      });
      for (const t of [-1 / 3, 1 / 3]) { s.rod([gx * t * 3 * 0.333 * 1, ph2, -gz], [gx * t, ph2, gz], R0 * 0.004, string); s.rod([-gx, ph2, gz * t], [gx, ph2, gz * t], R0 * 0.004, string); }
      // A red and white ranging pole laid along one side, a trowel and a bucket.
      const segments = 5, poleL = gx * 1.4;
      for (let i = 0; i < segments; i++) s.rod([-poleL / 2 + (poleL * i) / segments, R0 * 0.03, gz * 1.12], [-poleL / 2 + (poleL * (i + 1)) / segments, R0 * 0.03, gz * 1.12], R0 * 0.016, s.material(i % 2 ? '#f1ede2' : '#c8321f'));
      const tx = gx * 0.75, tz = gz * 0.9;
      s.rod([tx, R0 * 0.03, tz], [tx + R0 * 0.1, R0 * 0.03, tz + R0 * 0.04], R0 * 0.014, s.material('#8b5a34'));
      const blade = s.mesh(new THREE.ConeGeometry(R0 * 0.035, R0 * 0.1, 3), steel, [tx - R0 * 0.05, R0 * 0.025, tz - R0 * 0.02]);
      blade.rotation.set(0, -0.4, Math.PI / 2);
      blade.scale.z = 0.2;
      s.cylinder(R0 * 0.1, R0 * 0.08, R0 * 0.17, [-gx * 0.9, R0 * 0.085, gz * 0.88], s.material('#2f3033'), 14);
      const heap = stoneGeometry(random, { size: [R0 * 0.7, R0 * 0.22, R0 * 0.45], round: 0.8, rough: R0 * 0.02, base: '#5c452e', segments: 6 });
      s.mesh(heap, stoneMaterial(1), [gx * 0.8, 0, -gz * 1.05]);
    }

    return s.finish();
  },
});

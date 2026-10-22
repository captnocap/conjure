import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { labelWrap, paint } from './lab';
import { type HeadShape, type Surf, cord, eyeTexture, headForm, makeEar, makeEye, mountEar, ticks } from './head';

const SPECIES: Record<string, { shape: Partial<HeadShape>; title: string; key: string; words: string[] }> = {
  vampire: { shape: { jaw: 0.65, brow: 0.5, nose: 0.8, socket: 0.7, cheek: 0.7, chin: 0.6, lips: 0.5 }, title: 'VAMPYRE', key: 'THIRST', words: ['DREAD OF DAWN', 'CHARM', 'PATIENCE', 'OLD GRUDGES', 'COUNTING', 'VANITY', 'INVITATION', 'APPETITE'] },
  werewolf: { shape: { jaw: 0.3, brow: 0.8, nose: 0.15, socket: 0.7, cheek: 0.5, chin: 0.1, lips: 0.2, muzzle: 0.85 }, title: 'LYCANTHROPE', key: 'MOON-MADNESS', words: ['HOWL', 'PACK LOYALTY', 'SCENT', 'REGRET', 'THE CHASE', 'HUNGER', 'SHAME AT DAWN', 'TERRITORY'] },
  ghoul: { shape: { jaw: 0.75, brow: 0.6, nose: 0.05, socket: 1.2, cheek: 0.05, chin: 0.3, lips: 0.1 }, title: 'GHOUL', key: 'GRAVE-LONGING', words: ['HUNGER', 'DIGGING', 'PATIENCE', 'LOVE OF DAMP', 'MEMORY OF LIFE', 'THRIFT', 'NIGHT SIGHT', 'MANNERS'] },
  fishman: { shape: { jaw: 0.15, brow: 0.2, nose: 0.08, socket: 0.2, cheek: 0.3, chin: 0, lips: 1.5, crest: 0.4, muzzle: 0.2 }, title: 'FISH-MAN', key: 'TIDE-CALL', words: ['DEPTH', 'COLD BLOOD', 'SHOALING', 'LURE', 'SALT HUNGER', 'DROWNED SONGS', 'PRESSURE', 'ENVY OF LEGS'] },
  demon: { shape: { jaw: 0.85, brow: 1.1, nose: 0.75, socket: 0.8, cheek: 0.8, chin: 1.1, lips: 0.5 }, title: 'DAEMON', key: 'PRIDE', words: ['BARGAINS', 'SPITE', 'FINE PRINT', 'WRATH', 'TEMPTING', 'TRUE NAMES', 'PUNCTUALITY', 'MISCHIEF'] },
};
const GLAZE = {
  white: { body: '#f3efe4', ink: '#1d3a7c', tints: ['#f2c9c2', '#cfe0f2', '#f3e6b4', '#d2ebd0', '#e4d2ee'] },
  celadon: { body: '#b9d2bd', ink: '#1c3324', tints: ['#a7c7ae', '#c9dcc0', '#b4cdc4'] },
  ivory: { body: '#eadfbf', ink: '#5a3418', tints: ['#e2cfa0', '#efdcae', '#dcc9a0', '#e9d7b7'] },
  basalt: { body: '#232326', ink: '#dcb44a', tints: ['#2c2c31', '#26262b', '#313036'] },
} as const;

export default defineThing({
  questions: {
    species: choice('Which monster is the head modelled on?', {
      vampire: 'A vampire: narrow face, pointed ears, two fangs and a high collar.',
      werewolf: 'A werewolf: a pushed-out muzzle, upright wolf ears and a ruff of fur.',
      ghoul: 'A ghoul: sunken cheeks, no nose, bared teeth and drooping bat ears.',
      fishman: 'A fish-man: bulging round eyes, thick lips, fin ears and a crest.',
      demon: 'A demon: heavy brow, pointed chin and two sawn-off horn stubs.',
    }),
    labelling: choice('How are the regions labelled?', {
      copperplate: 'Neat sloping copperplate, a published and respectable chart.',
      scrawl: 'Frantic scrawl with underlinings, blots and second thoughts.',
      numbers: 'Numbers only, the key lost or kept somewhere else.',
      capitals: 'Heavy printed capitals, like a shop sign.',
    }),
    glaze: choice('What glaze is it?', {
      white: 'Glossy white with cobalt-blue lines and soft washes of colour.',
      celadon: 'Pale celadon green with dark lines.',
      ivory: 'Yellowed ivory with sepia ink.',
      basalt: 'Black basalt ware lettered in gold.',
    }),
    eyes: choice('How are the eyes finished?', {
      blank: 'Blank glazed eyeballs, like a classical bust.',
      painted: 'Painted in, pupils and all, staring.',
      closed: 'Sculpted shut.',
      glass: 'Set with red glass that catches the light.',
    }),
    damage: choice('What has happened to it?', {
      pristine: 'Nothing: it is perfect.',
      trepanned: 'Someone has drilled a neat round hole in the crown to see inside.',
      glued: 'It was dropped and glued back together, with one shard never found.',
      riveted: 'A long crack was mended the old way, with a row of metal rivets.',
    }),
    sits: choice('What sits on top of it?', {
      nothing: 'Nothing.',
      calipers: 'A pair of brass calipers gripping the temples.',
      hat: 'A silk top hat somebody hung there.',
      raven: 'A raven, perched on the crown.',
      candle: 'A candle stub burned down over the labels.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = SPECIES[a.species];
    const glaze = GLAZE[a.glaze];
    const W = 0.076, H = 0.115, D = 0.092;
    const head = headForm({ w: W, h: H, d: D, ...kind.shape });
    const side = random() < 0.5 ? 1 : -1;
    const crackAt = (t: number): [number, number] => [side * (0.55 + 0.22 * Math.sin(t * 5.3) + 0.08 * Math.sin(t * 17)), mix(0.12, 1.75, t)];
    const hole = { az: -side * 0.75, theta: 0.6, r: 0.24 };
    const shard = { az: side * 1.25, theta: 0.95, r: 0.2 };
    const inHole = (az: number, theta: number, h: typeof hole) => Math.hypot((az - h.az) * Math.sin(h.theta), theta - h.theta) < h.r;

    const words = [...kind.words].sort(() => random() - 0.5);
    const map = paint(1536, 768, (ctx, w, h) => {
      ctx.fillStyle = glaze.body; ctx.fillRect(0, 0, w, h);
      const X = (az: number) => (az / (Math.PI * 2) + 0.5) * w, Y = (theta: number) => (theta / Math.PI) * h;
      ctx.strokeStyle = glaze.ink; ctx.fillStyle = glaze.ink; ctx.lineJoin = 'round';
      let serial = 1;
      const write = (text: string, az: number, theta: number, size: number) => {
        ctx.save();
        ctx.translate(X(az), Y(theta));
        ctx.scale(Math.min(2.4, 1 / Math.sin(theta)) * 0.5, 1);
        const lines = a.labelling === 'numbers' ? [String(serial++)] : text.includes(' ') || text.includes('-') ? text.replace('-', '- ').split(' ').reduce<string[]>((rows, word) => { if (rows.length && (rows[rows.length - 1] + word).length < 9) rows[rows.length - 1] += ` ${word}`; else rows.push(word); return rows; }, []) : [text];
        const px = a.labelling === 'numbers' ? size * 2.1 : size * (lines.length > 2 ? 0.8 : 1);
        ctx.font = { copperplate: `italic 600 ${px}px Georgia, serif`, scrawl: `italic 800 ${px * 1.1}px Georgia, serif`, numbers: `700 ${px}px Georgia, serif`, capitals: `900 ${px * 0.92}px Georgia, serif` }[a.labelling];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = glaze.ink;
        if (a.labelling === 'scrawl') ctx.rotate((random() - 0.5) * 0.35);
        lines.forEach((line, i) => {
          const y = (i - (lines.length - 1) / 2) * px * 1.02;
          const shown = a.labelling === 'copperplate' ? line.charAt(0) + line.slice(1).toLowerCase() : a.labelling === 'scrawl' ? line.toLowerCase() + (random() < 0.3 ? '!' : '') : line;
          ctx.fillText(shown, 0, y);
          if (a.labelling === 'scrawl' && random() < 0.5) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-px * 2, y + px * 0.55); ctx.lineTo(px * 2, y + px * 0.5 + (random() - 0.5) * 6); ctx.stroke(); }
        });
        ctx.restore();
      };
      // The vault of the skull divided into organs, each with its faculty.
      const rows = [{ t0: 0.34, t1: 0.74, n: 5 }, { t0: 0.74, t1: 1.17, n: 7 }, { t0: 1.17, t1: 1.66, n: 9 }];
      ctx.lineWidth = a.labelling === 'capitals' ? 9 : 6.5;
      rows.forEach((row, r) => {
        const edges = Array.from({ length: row.n + 1 }, (_u, i) => -Math.PI + (i / row.n) * Math.PI * 2 + (i > 0 && i < row.n ? (random() - 0.5) * 0.1 : 0));
        for (let i = 0; i < row.n; i++) {
          const mid = (edges[i] + edges[i + 1]) / 2;
          if (r === 2 && Math.abs(mid) < 1.2) continue;
          ctx.fillStyle = glaze.tints[Math.floor(random() * glaze.tints.length)];
          ctx.globalAlpha = 0.95; ctx.fillRect(X(edges[i]), Y(row.t0), X(edges[i + 1]) - X(edges[i]), Y(row.t1) - Y(row.t0)); ctx.globalAlpha = 1;
          ctx.strokeRect(X(edges[i]), Y(row.t0), X(edges[i + 1]) - X(edges[i]), Y(row.t1) - Y(row.t0));
          const front = Math.abs(mid) < 0.2 && r === 1;
          write(front ? kind.key : words[(i + r * 3) % words.length], mid, (row.t0 + row.t1) / 2 + 0.02, front ? 40 : 35);
        }
      });
      ctx.beginPath(); ctx.moveTo(0, Y(0.34)); ctx.lineTo(w, Y(0.34)); ctx.stroke();
      // A few organs on the face itself.
      const ring = (fx: number, fy: number, rx: number, ry: number, text: string) => {
        const [u, v] = head.uv(fx, fy);
        ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.ellipse(u * w, v * h, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        write(text, (u - 0.5) * Math.PI * 2, v * Math.PI, 24);
      };
      ring(0.52, -0.3, 44, 42, 'BITE'); ring(-0.52, -0.3, 44, 42, 'GUILE');
      ring(0, -0.82, 40, 26, 'OATHS');
      if (a.labelling === 'scrawl') for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(random() * w, h * (0.15 + random() * 0.5), 3 + random() * 9, 0, Math.PI * 2); ctx.fill(); }
      // Crazing and stains come with age; cracks with accidents.
      ctx.strokeStyle = a.glaze === 'basalt' ? 'rgba(160,160,170,0.35)' : 'rgba(90,70,40,0.4)'; ctx.lineWidth = 1;
      for (let i = 0; i < mood.wear * 260; i++) { let x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < mood.wear * 30; i++) { const x = random() * w, y = random() * h, r = 20 + random() * 60; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(120,90,40,0.22)'); g.addColorStop(1, 'rgba(120,90,40,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      if (a.damage === 'glued' || a.damage === 'riveted') {
        ctx.strokeStyle = a.damage === 'glued' ? '#8a5a14' : '#1c1814'; ctx.lineWidth = a.damage === 'glued' ? 7 : 3.5;
        ctx.beginPath(); for (let i = 0; i <= 40; i++) { const [az, theta] = crackAt(i / 40); if (i === 0) ctx.moveTo(X(az), Y(theta)); else ctx.lineTo(X(az), Y(theta)); } ctx.stroke();
        if (a.damage === 'glued') { ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 2; ctx.stroke(); for (let b = 0; b < 3; b++) { let [az, theta] = crackAt(0.25 + b * 0.25); ctx.beginPath(); ctx.moveTo(X(az), Y(theta)); for (let j = 0; j < 6; j++) { az += (b % 2 ? -1 : 1) * (0.1 + random() * 0.12); theta += (random() - 0.4) * 0.12; ctx.lineTo(X(az), Y(theta)); } ctx.stroke(); } }
      }
    });
    const gloss = a.glaze === 'basalt' ? 0.45 : 0.16;
    const ceramic = new THREE.MeshStandardMaterial({ map, roughness: mix(gloss, gloss + 0.25, mood.wear) });
    const plain = (factor = 1, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(glaze.body).multiplyScalar(factor), roughness: gloss + 0.05, ...options });
    const inkTone = new THREE.MeshStandardMaterial({ color: glaze.ink, roughness: 0.4, metalness: a.glaze === 'basalt' ? 0.7 : 0 });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...options });

    const skull = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = skull) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const skip = a.damage === 'trepanned' ? (_x: number, _y: number, az: number, theta: number) => inHole(az, theta, hole) : a.damage === 'glued' ? (_x: number, _y: number, az: number, theta: number) => inHole(az, theta, shard) : undefined;
    add(new THREE.Mesh(head.grid({ nu: 96, nv: 64, skip }), ceramic));
    if (skip) {
      skull.add(new THREE.Mesh(head.grid({ nu: 48, nv: 32, lift: -0.005 }), flat(a.glaze === 'basalt' ? '#4a3a30' : '#5a4632', { side: THREE.BackSide, roughness: 1 })));
      const h = a.damage === 'trepanned' ? hole : shard;
      if (a.damage === 'trepanned') add(cord(Array.from({ length: 20 }, (_u, i) => { const ang = (i / 20) * Math.PI * 2; return head.surf(h.az + (Math.cos(ang) * h.r) / Math.sin(h.theta), h.theta + Math.sin(ang) * h.r, 0.0005); }), 0.0028, plain(0.85), 0, true));
    }
    if (a.damage === 'riveted') {
      const path: Surf[] = [];
      for (let i = 1; i < 14; i++) { const [az, theta] = crackAt(i / 14); path.push(head.surf(az, theta)); }
      add(ticks(path, flat('#8d9296', { metalness: 0.85, roughness: 0.35 }), [0.017, 0.003, 0.004], 0.0012));
    } else if (a.damage === 'glued') {
      const path: Surf[] = [];
      for (let i = 1; i < 22; i++) { if (random() < 0.5) continue; const [az, theta] = crackAt(i / 22); path.push(head.surf(az, theta)); }
      add(ticks(path, new THREE.MeshStandardMaterial({ color: '#c98a1c', roughness: 0.15, emissive: '#7a4a08', emissiveIntensity: 0.4 }), [0.006, 0.004, 0.007], 0.001));
    }

    // Sculpted features, all in the same glaze.
    const species = a.species;
    const half = species === 'fishman' ? 0.4 : species === 'werewolf' ? 0.3 : 0.28;
    const mouthY = species === 'werewolf' ? -0.52 : -0.5;
    const curve = species === 'fishman' ? -0.7 : species === 'ghoul' ? 0.2 : -0.25;
    const gap = species === 'ghoul' ? 0.16 : species === 'werewolf' ? 0.08 : 0;
    const lipY = (x: number, sign: number) => mouthY + curve * 0.08 * (x / half) ** 2 + sign * (0.014 + gap * 0.5 * (1 - (x / half) ** 2));
    const lipPath = (sign: number) => Array.from({ length: 11 }, (_u, i) => { const x = mix(-half, half, i / 10); return head.face(x, lipY(x, sign), 0.001); });
    const lipR = species === 'fishman' ? 0.0085 : 0.0048;
    add(cord(lipPath(1), lipR, plain(0.93)));
    add(cord(lipPath(-1), lipR * 1.1, plain(0.93)));
    if (gap) {
      const xOf = (az: number) => THREE.MathUtils.clamp(Math.sin(az) * 0.86, -half, half);
      add(new THREE.Mesh(head.grid({ az: [-0.36, 0.36], nu: 12, nv: 3, lift: 0.0006, top: (az) => Math.acos(lipY(xOf(az), 1)), bottom: (az) => Math.acos(lipY(xOf(az), -1)) }), inkTone));
      if (species === 'ghoul') add(ticks(Array.from({ length: 9 }, (_u, i) => { const x = mix(-half * 0.7, half * 0.7, i / 8); return head.face(x, lipY(x, 0), 0.0014); }), plain(1.05), [0.016, 0.004, 0.0058]));
    }
    if (species === 'vampire' || species === 'werewolf') for (const sx of [-1, 1]) {
      const root = head.face(sx * (species === 'werewolf' ? 0.2 : 0.12), lipY(sx * 0.12, 1) - 0.02, 0.003);
      const fang = add(new THREE.Mesh(new THREE.ConeGeometry(0.0045, species === 'werewolf' ? 0.028 : 0.022, 6), plain(1.05)));
      fang.position.copy(root.p).add(new THREE.Vector3(0, -0.011, 0)); fang.rotation.x = Math.PI;
    }
    if (species === 'werewolf') {
      const tip = head.face(0, -0.3, 0.002);
      const nose = add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), inkTone)); nose.position.copy(tip.p); nose.scale.set(1.3, 0.9, 0.8);
      const tuft = new THREE.ConeGeometry(0.011, 0.04, 5);
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const spot = head.surf(sx * (1.15 + i * 0.12), 1.95 + i * 0.07); const fur = add(new THREE.Mesh(tuft, plain(0.97))); fur.position.copy(spot.p); fur.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.n.clone().add(new THREE.Vector3(sx * 0.4, -0.9, 0)).normalize()); }
    }
    if (species === 'ghoul') for (const sx of [-1, 1]) add(cord([head.face(sx * 0.05, -0.16, 0.001), head.face(sx * 0.075, -0.24, 0.001)], 0.004, inkTone));
    for (const sx of [-1, 1]) add(cord([0.14, 0.28, 0.42, 0.55].map((x, i) => head.face(sx * x, 0.235 + (species === 'demon' || species === 'werewolf' ? 0.07 * (i / 3) - 0.02 : Math.sin((i / 3) * Math.PI) * 0.03) - (i === 3 ? 0.03 : 0), 0.002)), species === 'fishman' ? 0.002 : 0.0046, plain(0.95)));

    const lid = plain(0.96);
    const eyeR = species === 'fishman' ? 0.021 : 0.0165;
    const eyeMap = a.eyes === 'painted' ? eyeTexture(species === 'werewolf' || species === 'demon' || species === 'fishman' ? 'slit' : 'round', a.glaze === 'basalt' ? '#f2d98a' : '#9cc0ee', glaze.ink, 0, random, a.glaze === 'basalt' ? '#3a3a40' : glaze.body) : null;
    [-1, 1].forEach((sx) => {
      const spot = head.face(sx * (species === 'fishman' ? 0.46 : 0.36), species === 'fishman' ? 0.12 : 0.07);
      const eye = makeEye(eyeR, eyeMap, lid, a.eyes === 'closed' ? 0 : species === 'fishman' ? 1 : 0.7, 0, a.eyes === 'glass' ? '#b3141c' : new THREE.Color(glaze.body).multiplyScalar(1.03));
      const material = eye.globe.material as THREE.MeshStandardMaterial;
      material.roughness = 0.1;
      if (a.eyes === 'glass') { material.emissive.set('#ff2a1a'); material.emissiveIntensity = mix(0.5, 1.4, mood.energy); }
      eye.group.position.copy(spot.p).addScaledVector(spot.n, species === 'fishman' ? -0.002 : -0.0085);
      eye.group.rotation.y = sx * (species === 'fishman' ? 0.5 : 0.14);
      add(eye.group);
    });

    const earSpot = (sx: number) => head.surf(sx * 1.58, 1.5);
    if (species === 'werewolf') {
      for (const sx of [-1, 1]) { const spot = head.surf(sx * 1.2, 0.55); const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.062, 4), plain(1))); ear.scale.z = 0.5; ear.position.copy(spot.p).addScaledVector(spot.n, 0.022); ear.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.n.clone().add(new THREE.Vector3(0, 0.6, 0)).normalize()); }
    } else {
      const pointed = { vampire: 0.9, ghoul: 0.5, fishman: 1.2, demon: 0.7 }[species as 'vampire'] ?? 0;
      for (const sx of [-1, 1]) { const spot = earSpot(sx); const ear = makeEar(species === 'ghoul' || species === 'fishman' ? 0.075 : 0.055, plain(1), plain(0.8), pointed); const mount = add(mountEar(ear, spot.p.addScaledVector(spot.n, -0.004), sx, species === 'ghoul' ? 0.15 : species === 'fishman' ? 0.2 : 0.5)); if (species === 'ghoul') mount.rotation.z = -sx * 0.5; }
    }
    if (species === 'demon') {
      for (const sx of [-1, 1]) { const spot = head.surf(sx * 0.75, 0.62); const stub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.018, 0.032, 12), plain(0.97))); stub.position.copy(spot.p).addScaledVector(spot.n, 0.012); stub.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.n.clone().add(new THREE.Vector3(0, 0.5, 0)).normalize()); const top = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.002, 12), inkTone), stub); top.position.y = 0.0165; }
      const chin = head.face(0, -0.93); const beard = add(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), plain(0.97))); beard.position.copy(chin.p).add(new THREE.Vector3(0, -0.02, 0.004)); beard.rotation.x = Math.PI - 0.25;
    }
    if (species === 'fishman') {
      const fin = new THREE.Shape();
      fin.moveTo(-0.07, 0); fin.quadraticCurveTo(-0.02, 0.07, 0.05, 0.06); fin.lineTo(0.035, 0.035); fin.lineTo(0.065, 0.03); fin.lineTo(0.05, 0.008); fin.lineTo(0.08, 0); fin.closePath();
      const crest = add(new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.004, bevelEnabled: false }), plain(0.95)));
      crest.rotation.y = Math.PI / 2; crest.position.set(0.002, H * 1.02, -0.012);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add(cord([head.surf(sx * 1.05, 2.25 + i * 0.1, 0.001), head.surf(sx * 1.35, 2.2 + i * 0.1, 0.002), head.surf(sx * 1.65, 2.28 + i * 0.1, 0.001)], 0.0028, inkTone));
    }

    // Neck and moulded base with the title band.
    const baseH = 0.034, headY = baseH + 0.165;
    skull.position.y = headY;
    s.root.add(skull);
    const body = plain(1);
    s.lathe([[0, 0], [0.083, 0], [0.086, 0.004], [0.086, baseH - 0.004], [0.08, baseH], [0.07, baseH + 0.008], [0.052, baseH + 0.02], [0.04, baseH + 0.045], [0.037, baseH + 0.08], [0.038, baseH + 0.1]], body);
    const title = labelWrap([kind.title], 0.0868, 0.15, baseH * 0.72, { hand: 'caps', paper: glaze.body, ink: glaze.ink, wear: a.glaze === 'basalt' ? 0 : mood.wear * 0.5, random });
    title.position.y = baseH / 2;
    s.root.add(title);
    if (species === 'vampire') {
      const collar = s.mesh(new THREE.CylinderGeometry(0.105, 0.06, 0.13, 28, 1, true, Math.PI * 0.42, Math.PI * 1.16), plain(0.97, { side: THREE.DoubleSide }), [0, baseH + 0.075, -0.012]);
      collar.castShadow = true;
      s.mesh(new THREE.CylinderGeometry(0.1035, 0.0585, 0.128, 28, 1, true, Math.PI * 0.44, Math.PI * 1.12), new THREE.MeshStandardMaterial({ color: a.glaze === 'basalt' ? '#7a1420' : '#a3202c', roughness: 0.3, side: THREE.BackSide }), [0, baseH + 0.085, -0.012]);
    }

    // Whatever has been left on top.
    const crownY = headY + H * (1 + (kind.shape.crest ?? 0) * 0.3);
    const flames: THREE.Mesh[] = [];
    let raven: THREE.Group | null = null;
    if (a.sits === 'calipers') {
      const brass = s.material('#c39a3c', { metalness: 0.85, roughness: 0.3 });
      const pivot: [number, number, number] = [0, crownY + 0.075, 0];
      for (const sx of [-1, 1]) s.tube([pivot, [sx * (W + 0.03), crownY + 0.03, 0], [sx * (W + 0.045), headY + 0.04, 0], [sx * (W + 0.012), headY + 0.012, 0.004]], 0.003, brass);
      s.cylinder(0.009, 0.009, 0.012, pivot, brass, 14).rotation.x = Math.PI / 2;
      s.tube([[-(W + 0.04), crownY + 0.0, 0.004], [0, crownY + 0.035, 0.012], [W + 0.04, crownY + 0.0, 0.004]], 0.0016, brass);
    } else if (a.sits === 'hat') {
      const silk = s.material('#17171b', { roughness: 0.35 });
      const hat = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y; mesh.castShadow = true; hat.add(mesh); };
      part(new THREE.CylinderGeometry(0.078, 0.078, 0.005, 28), silk, 0);
      part(new THREE.CylinderGeometry(0.052, 0.048, 0.085, 28), silk, 0.045);
      part(new THREE.CylinderGeometry(0.0495, 0.0495, 0.014, 28), s.material(mood.cheer > 0.5 ? '#a3243a' : '#5a5a66'), 0.011);
      hat.position.set(side * 0.012, crownY - 0.012, -0.006); hat.rotation.set(-0.1, 0, side * 0.22); hat.scale.setScalar(0.8);
      s.root.add(hat);
    } else if (a.sits === 'raven') {
      raven = new THREE.Group();
      const black = s.material('#141418', { roughness: 0.45 }), ball = new THREE.SphereGeometry(1, 14, 10);
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number], rx = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.x = rx; mesh.castShadow = true; raven!.add(mesh); return mesh; };
      part(ball, black, [0, 0.038, -0.004], [0.022, 0.024, 0.036], -0.5);
      const noggin = new THREE.Group(); noggin.position.set(0, 0.066, 0.02); raven.add(noggin);
      const skullcap = new THREE.Mesh(ball, black); skullcap.scale.setScalar(0.015); skullcap.castShadow = true; noggin.add(skullcap);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0055, 0.026, 6), s.material('#2c2c30', { roughness: 0.3 })); beak.rotation.x = Math.PI / 2 + 0.25; beak.position.set(0, -0.003, 0.024); beak.castShadow = true; noggin.add(beak);
      for (const sx of [-1, 1]) { const bead = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.1 })); bead.scale.setScalar(0.0026); bead.position.set(sx * 0.011, 0.004, 0.009); noggin.add(bead); }
      part(new THREE.BoxGeometry(1, 1, 1), black, [0, 0.022, -0.04], [0.02, 0.004, 0.05], 0.6);
      for (const sx of [-1, 1]) part(new THREE.CylinderGeometry(1, 1, 1, 5), s.material('#2c2c30'), [sx * 0.008, 0.008, 0.002], [0.0016, 0.022, 0.0016]);
      raven.userData.noggin = noggin;
      raven.position.set(side * 0.01, crownY - 0.006, -0.01); raven.rotation.y = side * 0.5;
      s.root.add(raven);
    } else if (a.sits === 'candle') {
      const wax = s.material('#efe6c8', { roughness: 0.4, emissive: '#ffb04a', emissiveIntensity: 0.2 });
      s.cylinder(0.012, 0.014, 0.03, [0, crownY + 0.01, 0], wax, 12);
      s.cylinder(0.03, 0.036, 0.006, [0, crownY - 0.003, 0], wax, 16);
      for (let i = 0; i < 7; i++) { const az = random() * Math.PI * 2, reach = 0.25 + random() * 0.6; add(cord([head.surf(az, 0.05, 0.002), head.surf(az + (random() - 0.5) * 0.2, reach * 0.5, 0.003), head.surf(az + (random() - 0.5) * 0.3, reach, 0.002)], 0.0036, wax)); }
      const flame = s.mesh(new THREE.ConeGeometry(0.007, 0.028, 8), new THREE.MeshBasicMaterial({ color: '#ffcf5a' }), [0, crownY + 0.042, 0]); flame.castShadow = false; flames.push(flame);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.3, depthWrite: false })); halo.position.set(0, crownY + 0.042, 0); s.root.add(halo); flames.push(halo);
    }
    if (a.damage === 'trepanned') {
      const plug = s.cylinder(0.021, 0.021, 0.005, [side * 0.12, 0.0025, 0.07], body, 18);
      plug.rotation.y = random();
      const brace = s.material('#6a6f73', { metalness: 0.8, roughness: 0.4 });
      s.rod([-side * 0.11, 0.004, 0.08], [-side * 0.17, 0.004, 0.03], 0.003, brace);
      s.cylinder(0.009, 0.009, 0.008, [-side * 0.105, 0.004, 0.084], brace, 12);
      s.rod([-side * 0.17, 0.004, 0.03], [-side * 0.19, 0.004, 0.012], 0.006, s.material('#5a351f'));
    } else if (a.damage === 'glued') {
      const pot = s.cylinder(0.014, 0.016, 0.022, [-side * 0.125, 0.011, 0.06], s.material('#6b4a2a'), 14);
      void pot;
      s.rod([-side * 0.125, 0.02, 0.06], [-side * 0.145, 0.05, 0.075], 0.0018, s.material('#caa46a'));
    }

    const energy = mix(0.2, 1, mood.energy);
    return s.finish({
      update(_dt, time) {
        flames.forEach((flame, i) => flame.scale.set(1, 1 + Math.sin(time * 17 + i) * 0.14 * energy, 1));
        if (raven) { const noggin = raven.userData.noggin as THREE.Group; noggin.rotation.y = Math.round(Math.sin(time * mix(0.5, 2, mood.energy)) * 1.4) * 0.6; noggin.rotation.z = Math.sin(time * 0.9) * 0.2 * energy; }
      },
    });
  },
});

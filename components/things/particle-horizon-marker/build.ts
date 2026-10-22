import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const WORDS = {
  map: 'HERE ENDS THE MAP.',
  nodata: 'NO DATA BEYOND THIS POINT.',
  back: 'TURN BACK.',
  date: 'A date: 13.8 billion years, and nothing else.',
  dragons: 'HIC SUNT DRACONES, here be dragons.',
  horizon: 'PARTICLE HORIZON, with a small survey number.',
  worn: 'Whatever it said has worn away to a few strokes.',
} as const;
const LINES: Record<keyof typeof WORDS, string[]> = {
  map: ['HERE', 'ENDS', 'THE MAP'], nodata: ['NO DATA', 'BEYOND', 'THIS POINT'], back: ['TURN', 'BACK'], date: ['13.8', 'Gyr'],
  dragons: ['HIC SUNT', 'DRACONES'], horizon: ['PARTICLE', 'HORIZON', 'No. 0001'], worn: ['H  R', ' N S', 'T    M'],
};

export default defineThing({
  questions: {
    form: choice('What form does the marker take?', {
      stone: 'A squat boundary stone with a rounded top and a carved face, like an old parish or milestone.',
      obelisk: 'A slim four-sided obelisk on a stepped base, pointed like a needle.',
      barrier: 'A striped barrier post, red and white, with a reflector band, as at the end of a closed road.',
      plaque: 'A brass plaque angled on a slender pole, like a heritage marker or a trig point.',
      sign: 'A hand-painted wooden board nailed to a stake, lettered by someone in a hurry.',
      pillar: 'A plain concrete survey pillar with a metal plate on top.',
    }),
    words: choice('What does it say?', WORDS),
    height: score('How tall is it?', ['A knee-high stub', 'Chest high', 'Taller than a person', 'A towering needle']),
    visitors: choice('Who still comes here?', {
      nobody: 'Nobody. It leans, half sunk, forgotten.',
      keeper: 'A keeper: a lantern stands beside it and the ground is ringed with tidy stones.',
      pilgrims: 'Passers-by: a cairn of pebbles has grown at its foot and ribbons are tied to it.',
      surveyors: 'Surveyors: a brass benchmark is set in the ground and a pin flag flutters nearby.',
      one: 'Someone, once: a single pair of footprints walks up to it and stops.',
    }),
    edge: choice('How is the limit itself shown?', {
      line: 'A painted line across the ground: stars scattered on the near side, none beyond.',
      chain: 'A chain slung between two low posts, barring the way.',
      arrows: 'Finger-post arrows that all point back the way you came.',
      bare: 'Nothing but the marker itself.',
    }),
    ground: choice('What does it stand on?', {
      slab: 'A neat round paved slab.',
      rough: 'A ragged patch of bare rock.',
      none: 'Nothing: it is planted straight into whatever is there.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const H = mix(0.75, 4.2, a.height ** 1.5) * ({ stone: 0.7, obelisk: 1.25, barrier: 0.85, plaque: 0.9, sign: 0.95, pillar: 0.75 }[a.form]);
    const marker = new THREE.Group();
    s.root.add(marker);
    const add = <T extends THREE.Object3D>(mesh: T, to: THREE.Object3D = marker) => { to.add(mesh); mesh.traverse((m) => { m.castShadow = m.receiveShadow = true; }); return mesh; };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); return add(m); };

    const plate = (lines: string[], w: number, h: number, ink: string, paper: string, hand = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = Math.round(384 * h / w);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const size = Math.min(canvas.height / (lines.length + 0.5) * 0.9, 384 / Math.max(...lines.map((l) => l.length)) * 1.5);
      ctx.font = `${hand ? 'italic ' : ''}bold ${size}px ${hand ? 'cursive, ' : ''}Georgia, serif`;
      lines.forEach((line, i) => {
        ctx.save();
        ctx.translate(192 + (hand ? (random() - 0.5) * 16 : 0), canvas.height / 2 + (i - (lines.length - 1) / 2) * size * 1.08);
        if (hand) ctx.rotate((random() - 0.5) * 0.08);
        ctx.fillText(line, 0, 0, 350);
        ctx.restore();
      });
      ctx.fillStyle = paper; ctx.globalAlpha = 0.75;
      for (let i = 0; i < wear * 26; i++) ctx.fillRect(random() * 384, random() * canvas.height, 10 + random() * 46, 3 + random() * 9);
      ctx.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
    };
    const lines = LINES[a.words];
    const stoneTone = new THREE.Color('#a39e92').lerp(new THREE.Color('#7f8a70'), wear * 0.4);
    const stone = new THREE.MeshStandardMaterial({ color: stoneTone, roughness: 0.95, flatShading: true });
    const brass = s.material('#c39a3c', { metalness: 0.8, roughness: 0.35 });
    const iron = s.material('#3c4045', { metalness: 0.6, roughness: 0.5 });
    const roughen = (geometry: THREE.BufferGeometry, amount: number) => {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = Math.sin(p.getX(i) * 37.1 + p.getY(i) * 21.7 + p.getZ(i) * 53.3) * amount;
        p.setXYZ(i, p.getX(i) * (1 + k), p.getY(i) + k * 0.2, p.getZ(i) * (1 + k));
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    let top = H, faceZ = 0.1, girth = 0.2;

    if (a.form === 'stone') {
      const w = 0.62, d = 0.26;
      const outline = new THREE.Shape();
      outline.moveTo(-w / 2, 0); outline.lineTo(-w / 2, H - w / 2); outline.absarc(0, H - w / 2, w / 2, Math.PI, 0, true); outline.lineTo(w / 2, 0); outline.closePath();
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: d, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
      geometry.translate(0, 0, -d / 2);
      mesh(roughen(geometry, 0.02 + wear * 0.03), stone);
      const face = plate(lines, w * 0.8, Math.min(H * 0.5, 0.62), '#4a463e', `#${stoneTone.clone().multiplyScalar(1.08).getHexString()}`);
      face.position.set(0, Math.max(H - w / 2 - face.geometry.parameters.height / 2 + 0.08, face.geometry.parameters.height / 2 + 0.05), d / 2 + 0.034);
      add(face); faceZ = d / 2; girth = w / 2;
    }
    if (a.form === 'obelisk') {
      const b = 0.2 + H * 0.045;
      mesh(new THREE.BoxGeometry(b * 3.4, 0.14, b * 3.4), stone, [0, 0.07, 0]);
      mesh(new THREE.BoxGeometry(b * 2.5, 0.16, b * 2.5), stone, [0, 0.22, 0]);
      const shaft = mesh(roughen(new THREE.CylinderGeometry(b * 0.55, b, H - 0.3 - b, 4, 6), wear * 0.02), stone, [0, 0.3 + (H - 0.3 - b) / 2, 0]);
      shaft.rotation.y = Math.PI / 4;
      const point = mesh(new THREE.ConeGeometry(b * 0.55, b, 4), a.words === 'date' ? brass : stone, [0, H - b / 2, 0]);
      point.rotation.y = Math.PI / 4;
      const pw = b * 1.25, ph = Math.min(0.5, H * 0.22);
      const face = plate(lines, pw, ph, '#33240c', '#c9a548');
      face.position.set(0, 0.42 + ph / 2 + H * 0.08, b * 0.7 + 0.012); face.rotation.x = -0.04;
      add(face);
      mesh(new THREE.BoxGeometry(pw + 0.05, ph + 0.05, 0.02), brass, [0, face.position.y, b * 0.7]);
      faceZ = b * 0.75; girth = b * 1.7;
    }
    if (a.form === 'barrier') {
      const r = 0.085, bands = Math.max(4, Math.round(H / 0.22));
      const red = s.material(mood.cheer > 0.5 ? '#d83a2b' : '#a8372e'), white = s.material('#ece8dc');
      for (let i = 0; i < bands; i++) mesh(new THREE.CylinderGeometry(r, r, H / bands, 16), i % 2 ? white : red, [0, (i + 0.5) * H / bands, 0]);
      mesh(new THREE.SphereGeometry(r * 1.05, 14, 8, 0, 6.3, 0, 1.57), red, [0, H, 0]);
      mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.07, 16), new THREE.MeshStandardMaterial({ color: '#f2c63a', emissive: '#f2c63a', emissiveIntensity: 0.4, metalness: 0.3 }), [0, H * 0.82, 0]);
      mesh(new THREE.CylinderGeometry(r * 2, r * 2.2, 0.04, 16), iron, [0, 0.02, 0]);
      const pw = 0.62, ph = 0.34, py = Math.max(0.5, H * 0.62);
      const face = plate(lines, pw, ph, '#b3261e', '#f1eee4');
      face.position.set(0, py, r + 0.03); add(face);
      mesh(new THREE.BoxGeometry(pw + 0.04, ph + 0.04, 0.02), iron, [0, py, r + 0.015]);
      faceZ = r + 0.03; girth = 0.3;
    }
    if (a.form === 'plaque') {
      mesh(new THREE.CylinderGeometry(0.03, 0.04, H, 12), iron, [0, H / 2, 0]);
      mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.05, 16), iron, [0, 0.025, 0]);
      const pw = 0.78, ph = 0.5;
      const holder = add(new THREE.Group());
      holder.position.set(0, H, 0.02); holder.rotation.x = -0.5;
      holder.add(new THREE.Mesh(new THREE.BoxGeometry(pw + 0.07, ph + 0.07, 0.035), brass));
      const face = plate(lines, pw, ph, '#33240c', '#c9a548');
      face.position.z = 0.02; holder.add(face);
      holder.traverse((m) => { m.castShadow = true; });
      top = H + 0.25; faceZ = 0.3; girth = 0.4;
    }
    if (a.form === 'sign') {
      const wood = s.material('#8a6a44', { roughness: 0.9 });
      const stake = mesh(new THREE.BoxGeometry(0.075, H, 0.05), wood, [0, H / 2, 0]);
      stake.rotation.y = 0.1;
      const pw = 0.95, ph = 0.52, py = H - ph * 0.45;
      const holder = add(new THREE.Group());
      holder.position.set(0.03, py, 0.04); holder.rotation.z = (random() - 0.5) * 0.24;
      holder.add(new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.03), wood));
      const face = plate(lines, pw * 0.97, ph * 0.94, mood.cheer > 0.5 ? '#1f3f7a' : '#2a2622', wear > 0.5 ? '#cdbd98' : '#efe7d0', true);
      face.position.z = 0.017; holder.add(face);
      for (const y of [0.12, -0.12]) { const nail = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), iron); nail.position.set(-0.03, y, 0.02); holder.add(nail); }
      holder.traverse((m) => { m.castShadow = true; });
      top = H + ph * 0.1; faceZ = 0.06; girth = 0.48;
    }
    if (a.form === 'pillar') {
      const w = 0.34;
      const concrete = new THREE.MeshStandardMaterial({ color: '#b5b2a8', roughness: 1 });
      mesh(roughen(new THREE.CylinderGeometry(w * 0.56, w * 0.74, H, 4, 4), 0.012), concrete, [0, H / 2, 0]).rotation.y = Math.PI / 4;
      mesh(new THREE.BoxGeometry(w * 1.5, 0.12, w * 1.5), concrete, [0, 0.06, 0]);
      mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16), brass, [0, H + 0.01, 0]);
      for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.14, 0.012, 0.02), brass, [Math.cos(i * 2.094) * 0.07, H + 0.022, Math.sin(i * 2.094) * 0.07]).rotation.y = -i * 2.094;
      const pw = w * 0.82, ph = Math.min(0.34, H * 0.4);
      const face = plate(lines, pw, ph, '#23272c', '#d9d6cb');
      face.position.set(0, H * 0.62, w * 0.5 + 0.012); face.rotation.x = -Math.atan((w * 0.74 - w * 0.56) * 0.707 / H);
      add(face);
      faceZ = w * 0.5; girth = w;
    }

    // Lean and sink with neglect.
    const neglect = a.visitors === 'nobody' ? 1 : wear * 0.4;
    marker.rotation.z = (random() < 0.5 ? -1 : 1) * neglect * mix(0.08, 0.2, random());
    marker.rotation.x = -neglect * 0.07;
    marker.position.y = -neglect * Math.min(0.25, H * 0.12);

    // ---- Ground ----
    const reach = Math.max(1.25, girth + 0.95);
    const groundTone = new THREE.Color('#8f8d88').lerp(new THREE.Color('#77786a'), wear * 0.5);
    if (a.ground === 'slab') {
      s.cylinder(reach, reach * 1.03, 0.08, [0, 0.04, 0], new THREE.MeshStandardMaterial({ color: groundTone, roughness: 0.9 }), 40);
      for (let i = 0; i < 4; i++) s.ring(reach * (0.3 + i * 0.22), 0.008, [0, 0.082, 0], s.material('#6f6d68')).rotation.x = Math.PI / 2;
    }
    if (a.ground === 'rough') {
      const rock = new THREE.CylinderGeometry(reach * 0.95, reach * 1.1, 0.14, 11, 1);
      const p = rock.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(i * 12.9898) * 0.16; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      rock.computeVertexNormals();
      s.mesh(rock, new THREE.MeshStandardMaterial({ color: groundTone, roughness: 1, flatShading: true }), [0, 0.07, 0]);
    }
    const floor = a.ground === 'none' ? 0 : a.ground === 'slab' ? 0.08 : 0.14;
    marker.position.y += floor;

    // ---- The limit itself ----
    const lineZ = -(faceZ + 0.28);
    if (a.edge === 'line') {
      s.box([reach * 1.9, 0.012, 0.09], [0, floor + 0.006, lineZ], new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f2c63a' : '#c8402e', roughness: 0.7 }));
      // Stars on the near side only. Beyond the line, nothing.
      const n = Math.round(mix(10, 34, mood.density));
      const studs = Array.from({ length: n }, () => {
        const ang = random() * Math.PI, d = Math.sqrt(random()) * reach * 0.95;
        return { at: [Math.cos(ang) * d, floor + 0.03, lineZ + 0.15 + Math.abs(Math.sin(ang)) * d * 0.8] as P, size: 0.03 + random() ** 2 * 0.05, color: ['#e9c14a', '#6fa0e8', '#f1ecdd'][Math.floor(random() * 3)] };
      }).filter((p) => Math.hypot(p.at[0], p.at[2]) > girth * 0.7 + 0.1 && Math.hypot(p.at[0], p.at[2]) < reach);
      s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.15 }), studs);
    }
    if (a.edge === 'chain') {
      const px = reach * 0.85, ph = Math.min(0.75, Math.max(0.45, H * 0.4));
      for (const x of [-px, px]) { s.cylinder(0.04, 0.05, ph, [x, floor + ph / 2, lineZ], iron, 10); s.ball([0.06, 0.06, 0.06], [x, floor + ph, lineZ], iron, 10); }
      const links = 26;
      const pts = Array.from({ length: links }, (_u, i) => { const t = i / (links - 1); return { at: [mix(-px, px, t), floor + ph - 0.03 - Math.sin(t * Math.PI) * ph * 0.42, lineZ] as P, size: 0.03 }; });
      s.scatter(new THREE.TorusGeometry(1, 0.32, 5, 10), iron, pts);
    }
    if (a.edge === 'arrows') {
      const y0 = a.form === 'sign' || a.form === 'plaque' ? H * 0.45 : top * 0.5;
      const paint = s.material(mood.cheer > 0.5 ? '#e9b82e' : '#2f4a5c');
      for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Shape();
        arrow.moveTo(0, -0.07); arrow.lineTo(0.5, -0.07); arrow.lineTo(0.64, 0); arrow.lineTo(0.5, 0.07); arrow.lineTo(0, 0.07); arrow.closePath();
        const board = add(new THREE.Mesh(new THREE.ExtrudeGeometry(arrow, { depth: 0.02, bevelEnabled: false }), paint));
        board.position.set(0, Math.max(0.3, y0 - i * 0.19), girth * 0.2 + 0.03);
        // All of them point back toward the viewer's side, fanned a little.
        board.rotation.y = -Math.PI / 2 + (i - 1) * 0.55 + (random() - 0.5) * 0.2;
      }
    }

    // ---- Who still comes here ----
    if (a.visitors === 'keeper') {
      const lx = girth + 0.35, lz = 0.35;
      s.cylinder(0.09, 0.1, 0.03, [lx, floor + 0.015, lz], iron, 12);
      s.cylinder(0.07, 0.07, 0.2, [lx, floor + 0.13, lz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb648', emissiveIntensity: 1.1, transparent: true, opacity: 0.9 }), 12);
      s.cylinder(0.03, 0.095, 0.07, [lx, floor + 0.265, lz], iron, 12);
      s.ring(0.05, 0.008, [lx, floor + 0.34, lz], iron);
      const n = 14;
      for (let i = 0; i < n; i++) { const ang = i / n * 6.28; s.ball([0.08, 0.05, 0.065], [Math.cos(ang) * (girth + 0.3), floor + 0.03, Math.sin(ang) * (girth + 0.3)], new THREE.MeshStandardMaterial({ color: '#d9d6cb', roughness: 1 }), 8).rotation.y = ang; }
    }
    if (a.visitors === 'pilgrims') {
      const n = Math.round(mix(9, 24, mood.density));
      for (let i = 0; i < n; i++) {
        const layer = Math.floor(Math.sqrt(i)), ang = i * 2.4, d = Math.max(0, 0.26 - layer * 0.055) * (0.5 + random() * 0.6);
        s.ball([0.09 - layer * 0.008, 0.045, 0.07], [girth * 0.6 + 0.45 + Math.cos(ang) * d, floor + 0.035 + layer * 0.055, 0.35 + Math.sin(ang) * d], new THREE.MeshStandardMaterial({ color: new THREE.Color('#9d9a92').offsetHSL(0, 0, (random() - 0.5) * 0.2), roughness: 1 }), 8).rotation.y = random() * 3;
      }
      const tones = ['#d83a2b', '#2c6fd8', '#f2c63a', '#f1eee4'];
      for (let i = 0; i < 4; i++) {
        const y = top * mix(0.45, 0.8, random());
        const ribbon = add(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.34 + random() * 0.3, 1, 5), new THREE.MeshStandardMaterial({ color: tones[i], side: THREE.DoubleSide, roughness: 0.8 })));
        const p = ribbon.geometry.attributes.position;
        for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getY(k) * 14 + i) * 0.03);
        ribbon.position.set((i % 2 ? 1 : -1) * girth * 0.5, y, faceZ * 0.2 + (i % 3) * 0.03);
        ribbon.rotation.z = (i % 2 ? -1 : 1) * (0.5 + random() * 0.5);
        ribbon.geometry.translate(0, -0.2, 0);
      }
    }
    if (a.visitors === 'surveyors') {
      s.cylinder(0.09, 0.09, 0.02, [girth * 0.5 + 0.4, floor + 0.01, 0.5], brass, 16);
      s.box([0.12, 0.006, 0.012], [girth * 0.5 + 0.4, floor + 0.023, 0.5], iron);
      s.box([0.012, 0.006, 0.12], [girth * 0.5 + 0.4, floor + 0.023, 0.5], iron);
      const fx = -(girth + 0.4), fh = 0.75;
      s.rod([fx, floor, 0.4], [fx + 0.04, floor + fh, 0.4], 0.009, iron);
      const flag = new THREE.Shape(); flag.moveTo(0, 0); flag.lineTo(0.26, -0.07); flag.lineTo(0, -0.15); flag.closePath();
      const pennant = s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: '#f2622b', side: THREE.DoubleSide, emissive: '#f2622b', emissiveIntensity: 0.25 }), [fx + 0.04, floor + fh, 0.4]);
      pennant.rotation.y = -0.4;
    }
    if (a.visitors === 'one') {
      const print = new THREE.MeshStandardMaterial({ color: groundTone.clone().multiplyScalar(0.55), roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const z = faceZ + 0.25 + i * 0.3, x = (i % 2 ? 0.1 : -0.1) + 0.05;
        if (z > reach && a.ground !== 'none') break;
        const sole = s.cylinder(0.055, 0.055, 0.008, [x, floor + 0.004, z], print, 12); sole.scale.z = 1.9;
        const heel = s.cylinder(0.045, 0.045, 0.008, [x, floor + 0.004, z + 0.13], print, 10); heel.scale.z = 1.1;
      }
    }

    return s.finish({ footprint: a.ground === 'none' ? Math.max(0.5, girth + 0.3) : reach });
  },
});

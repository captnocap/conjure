import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const METALS = {
  titanium: { base: '#a9aaa3', light: '#e4e3dc', dark: '#55554f', metal: 0.75, rough: 0.38 },
  gilt: { base: '#c9a14a', light: '#f6e29a', dark: '#6e5220', metal: 0.85, rough: 0.3 },
  enamel: { base: '#b3261e', light: '#f2cf6a', dark: '#5e100c', metal: 0.25, rough: 0.35 },
  blued: { base: '#6f6a98', light: '#d7c38c', dark: '#2f2b4c', metal: 0.8, rough: 0.32 },
} as const;

/** A regular pentagon outline; `start` is the angle of the first corner. */
function pentagon(r: number, start = Math.PI / 2) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 5; i++) {
    const t = start + (i / 5) * Math.PI * 2;
    i ? shape.lineTo(Math.cos(t) * r, Math.sin(t) * r) : shape.moveTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  shape.closePath();
  return shape;
}

export default defineThing({
  questions: {
    setting: choice('Where is the pennant now?', {
      dust: 'Lying face up in rust-brown dust on a flake of basalt, one corner buried, exactly where it fell.',
      drawer: 'In an open presentation box lined with worn red velvet, the way a medal waits in a drawer.',
      ribbon: 'Hung from a striped Soviet ribbon block like a decoration, laid on a dark cloth.',
      stand: 'Propped upright on a small varnished desk stand, an office souvenir of a glorious year.',
      sphere: 'One face of a ball of pentagonal pennants that burst open on impact, the rest scattered around.',
    }),
    emblem: choice('What is embossed in the middle?', {
      sickle: 'The hammer and sickle, bold and simple.',
      star: 'A five-pointed star with ridged rays.',
      globe: 'A small globe crossed by an orbit and an arrow.',
      lander: 'A tiny relief of the lander itself, sphere on its ring.',
    }),
    lettering: choice('What does the lettering say?', {
      cccp: 'CCCP, the four letters of the Union.',
      venera: 'BEHEPA, the probe\'s name, with the year.',
      year: 'Just a year, 1975, in raised numerals.',
      none: 'No lettering: only the emblem and the rim.',
    }),
    metal: choice('What is it made of?', {
      titanium: 'Bare titanium, grey with a soft sheen.',
      gilt: 'Gilded, warm and ceremonial.',
      enamel: 'Red enamel with the relief picked out in gold.',
      blued: 'Heat-blued metal, violet and bronze, as if it came through fire.',
    }),
    count: choice('If they lie loose, how many are there?', {
      one: 'Just the one.',
      pair: 'Two, one overlapping the other.',
      handful: 'A handful strewn about, five or six.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metal = METALS[a.metal];
    const scorch = mix(0, 0.75, mood.wear) * (a.setting === 'dust' || a.setting === 'sphere' ? 1 : 0.35);
    const ochre = new THREE.Color('#a87c46');

    // ---- The embossed face, painted with a cast highlight and shadow so the relief prints ----
    const face = (() => {
      const size = 512, c = size / 2;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const g = canvas.getContext('2d')!;
      const base = new THREE.Color(metal.base).lerp(new THREE.Color('#3a2a1c'), scorch * 0.5).lerp(ochre, scorch * 0.2);
      g.fillStyle = base.getStyle();
      g.fillRect(0, 0, size, size);
      // Brushed grain.
      for (let i = 0; i < 1500; i++) {
        g.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + random() * 0.05})`;
        g.fillRect(random() * size, random() * size, 20 + random() * 60, 1);
      }
      const relief = (draw: () => void) => {
        for (const [dx, dy, colour] of [[5, 6, metal.dark], [-3, -3, metal.light], [0, 0, a.metal === 'enamel' ? '#e0b456' : new THREE.Color(metal.base).offsetHSL(0, 0, 0.1).getStyle()]] as const) {
          g.save();
          g.translate(dx, dy);
          g.fillStyle = colour;
          g.strokeStyle = colour;
          draw();
          g.restore();
        }
      };
      const emblemY = a.lettering === 'none' ? c - 10 : c - 40;
      g.lineCap = 'round';
      if (a.emblem === 'sickle') {
        relief(() => {
          g.save();
          g.translate(c, emblemY);
          // Sickle: a crescent blade opening up and to the right, with its handle down-left.
          g.beginPath();
          g.arc(0, 0, 92, -0.2 * Math.PI, 0.95 * Math.PI, false);
          g.arc(10, -14, 74, 0.93 * Math.PI, -0.22 * Math.PI, true);
          g.closePath();
          g.fill();
          g.lineWidth = 20;
          g.beginPath(); g.moveTo(-70, 66); g.lineTo(-104, 104); g.stroke();
          // Hammer: handle from bottom right to top left, head across its top.
          g.lineWidth = 18;
          g.beginPath(); g.moveTo(84, 92); g.lineTo(-22, -16); g.stroke();
          g.rotate(-Math.PI / 4);
          g.fillRect(-46, -52, 92, 34);
          g.restore();
        });
      } else if (a.emblem === 'star') {
        relief(() => {
          g.beginPath();
          for (let i = 0; i < 10; i++) {
            const t = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 46 : 118;
            i ? g.lineTo(c + Math.cos(t) * r, emblemY + Math.sin(t) * r) : g.moveTo(c + Math.cos(t) * r, emblemY + Math.sin(t) * r);
          }
          g.closePath();
          g.fill();
        });
        g.strokeStyle = metal.dark;
        g.lineWidth = 3;
        for (let i = 0; i < 5; i++) { const t = -Math.PI / 2 + (i / 5) * Math.PI * 2; g.beginPath(); g.moveTo(c, emblemY); g.lineTo(c + Math.cos(t) * 112, emblemY + Math.sin(t) * 112); g.stroke(); }
      } else if (a.emblem === 'globe') {
        relief(() => {
          g.beginPath(); g.arc(c, emblemY, 70, 0, Math.PI * 2); g.fill();
        });
        g.strokeStyle = metal.dark; g.lineWidth = 4;
        for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(c, emblemY, 70 * Math.cos(k * 1.2), 70, 0, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.moveTo(c - 70, emblemY); g.lineTo(c + 70, emblemY); g.stroke();
        relief(() => {
          g.lineWidth = 10;
          g.beginPath(); g.ellipse(c, emblemY, 132, 44, -0.4, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(c + 112, emblemY - 70); g.lineTo(c + 142, emblemY - 104); g.lineTo(c + 102, emblemY - 98); g.closePath(); g.fill();
        });
      } else {
        relief(() => {
          g.beginPath(); g.arc(c, emblemY - 10, 56, 0, Math.PI * 2); g.fill();
          g.fillRect(c - 26, emblemY - 96, 52, 30);
          g.fillRect(c - 72, emblemY - 70, 144, 12);
          g.lineWidth = 12;
          g.beginPath(); g.ellipse(c, emblemY + 66, 110, 22, 0, 0, Math.PI * 2); g.stroke();
          for (const x of [-60, -20, 20, 60]) { g.beginPath(); g.moveTo(c + x * 0.6, emblemY + 30); g.lineTo(c + x * 1.5, emblemY + 62); g.stroke(); }
        });
      }
      if (a.lettering !== 'none') {
        const text = a.lettering === 'cccp' ? 'CCCP' : a.lettering === 'venera' ? 'BEHEPA' : `19${['75', '72', '82', '70', '67', '81'][Math.floor(random() * 6)]}`;
        relief(() => {
          g.font = `bold ${a.lettering === 'venera' ? 58 : 72}px sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(text, c, c + 120);
        });
        if (a.lettering === 'venera') relief(() => { g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.fillText('1975', c, c + 176); });
      }
      // Scorch from the bottom edge and pitting.
      if (scorch > 0.02) {
        const burn = g.createLinearGradient(0, size, 0, size * 0.2);
        burn.addColorStop(0, `rgba(25,14,6,${scorch})`);
        burn.addColorStop(1, 'rgba(25,14,6,0)');
        g.fillStyle = burn;
        g.fillRect(0, 0, size, size);
        for (let i = 0; i < scorch * 300; i++) { g.fillStyle = `rgba(20,12,6,${random() * 0.5})`; g.beginPath(); g.arc(random() * size, random() * size, 1 + random() * 3, 0, Math.PI * 2); g.fill(); }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    })();

    const R = 0.08, thick = 0.006;
    face.repeat.set(1 / (2 * R), 1 / (2 * R));
    face.offset.set(0.5, 0.5);
    const faceMat = new THREE.MeshStandardMaterial({ map: face, bumpMap: face, bumpScale: 2.5, metalness: metal.metal * (1 - scorch * 0.6), roughness: metal.rough + scorch * 0.4, emissive: '#ffffff', emissiveIntensity: 0 });
    const plateMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(metal.base).lerp(new THREE.Color('#3a2a1c'), scorch * 0.5), metalness: metal.metal, roughness: metal.rough + 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.metal === 'enamel' ? '#d9ae4e' : metal.light).lerp(new THREE.Color('#3a2a1c'), scorch * 0.5), metalness: Math.max(0.6, metal.metal), roughness: 0.3 + scorch * 0.3 });

    /** One pennant: face along +z, its first corner at `start`. */
    const pennant = (r = R, start = Math.PI / 2) => {
      const group = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(pentagon(r, start), { depth: thick, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.002, bevelSegments: 1 }), plateMat);
      plate.position.z = -thick;
      const top = new THREE.Mesh(new THREE.ShapeGeometry(pentagon(r * 0.92, start)), faceMat);
      top.position.z = 0.0016;
      const rimShape = pentagon(r * 0.98, start);
      rimShape.holes.push(pentagon(r * 0.86, start) as unknown as THREE.Path);
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, { depth: 0.002, bevelEnabled: false }), rimMat);
      rim.position.z = 0.0005;
      for (const mesh of [plate, top, rim]) { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
      return group;
    };
    const lay = (group: THREE.Group, at: P3, turn: number, tip = 0) => {
      group.rotation.set(-Math.PI / 2 + tip, turn, 0, 'YXZ');
      group.position.set(...at);
      s.root.add(group);
      return group;
    };

    const dustMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6e4630').lerp(new THREE.Color('#8e5e38'), mood.warmth * 0.5), roughness: 1 });
    const basalt = s.material('#3f3730', { roughness: 0.95 });
    const loose = { one: 1, pair: 2, handful: 5 + Math.floor(random() * 2) }[a.count];

    if (a.setting === 'dust') {
      const flake = new THREE.Shape();
      for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2, r = 0.15 + random() * 0.05; i ? flake.lineTo(Math.cos(t) * r, Math.sin(t) * r * 0.8) : flake.moveTo(Math.cos(t) * r, Math.sin(t) * r * 0.8); }
      const slab = s.mesh(new THREE.ExtrudeGeometry(flake, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 1 }), basalt);
      slab.rotation.x = -Math.PI / 2;
      slab.position.y = 0.004;
      s.ball([0.24, 0.012, 0.2], [0, 0, 0], dustMat, 24);
      for (let i = 0; i < loose; i++) {
        const spread = i === 0 ? 0 : 0.06 + random() * 0.07, angle = random() * Math.PI * 2;
        const scale = i === 0 ? 1 : 0.8;
        lay(pennant(R * scale), [Math.cos(angle) * spread, 0.032 + i * 0.004, Math.sin(angle) * spread * 0.8], random() * Math.PI * 2, (random() - 0.5) * 0.12);
      }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), basalt, Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * 0.4, 0.03, (random() - 0.5) * 0.32] as P3, size: 0.004 + random() * 0.008 })));
    } else if (a.setting === 'drawer') {
      const wood = s.material('#4a2a1c', { roughness: 0.5 });
      const velvet = s.material('#7a1622', { roughness: 1 });
      const W = 0.26, D = 0.22, H = 0.04;
      s.box([W, 0.008, D], [0, 0.004, 0], wood);
      s.box([W, H, 0.012], [0, H / 2, D / 2 - 0.006], wood);
      s.box([W, H, 0.012], [0, H / 2, -D / 2 + 0.006], wood);
      s.box([0.012, H, D], [W / 2 - 0.006, H / 2, 0], wood);
      s.box([0.012, H, D], [-W / 2 + 0.006, H / 2, 0], wood);
      s.box([W - 0.024, H - 0.012, D - 0.024], [0, (H - 0.012) / 2 + 0.004, 0], velvet);
      // The lid stands open behind, velvet inside facing us.
      const lid = new THREE.Group();
      lid.position.set(0, H, -D / 2);
      lid.rotation.x = -0.25;
      const shellLid = s.box([W, D, 0.014], [0, D / 2, -0.007], wood);
      const padLid = s.box([W - 0.024, D - 0.024, 0.006], [0, D / 2, 0.003], velvet);
      lid.add(shellLid, padLid);
      s.root.add(lid);
      s.box([0.03, 0.006, 0.01], [0, H * 0.6, D / 2 + 0.004], s.material('#c9a75a', { metalness: 0.8, roughness: 0.3 }));
      const pair = a.count !== 'one';
      for (let i = 0; i < (pair ? 2 : 1); i++) lay(pennant(R * (pair ? 0.76 : 1)), [pair ? (i - 0.5) * 0.12 : 0, H + 0.002, 0.005], 0, 0);
    } else if (a.setting === 'ribbon') {
      const cloth = s.material('#24392e', { roughness: 1 });
      s.box([0.24, 0.006, 0.3], [0, 0.003, -0.01], cloth);
      // Soviet ribbon blocks are themselves pentagons: red with white edge stripes.
      const stripes = document.createElement('canvas');
      stripes.width = 256; stripes.height = 256;
      const sg = stripes.getContext('2d')!;
      sg.fillStyle = '#b8201c'; sg.fillRect(0, 0, 256, 256);
      sg.fillStyle = '#f1ece0'; sg.fillRect(40, 0, 18, 256); sg.fillRect(198, 0, 18, 256);
      sg.fillStyle = '#2a4ea0'; sg.fillRect(122, 0, 12, 256);
      const ribbonMap = new THREE.CanvasTexture(stripes);
      ribbonMap.colorSpace = THREE.SRGBColorSpace;
      ribbonMap.repeat.set(1 / 0.1, 1 / 0.1);
      ribbonMap.offset.set(0.5, 0.5);
      const ribbonShape = new THREE.Shape();
      ribbonShape.moveTo(-0.05, 0.055); ribbonShape.lineTo(0.05, 0.055); ribbonShape.lineTo(0.05, -0.02); ribbonShape.lineTo(0, -0.055); ribbonShape.lineTo(-0.05, -0.02); ribbonShape.closePath();
      const ribbon = new THREE.Mesh(new THREE.ExtrudeGeometry(ribbonShape, { depth: 0.004, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map: ribbonMap, roughness: 0.85 }));
      ribbon.castShadow = ribbon.receiveShadow = true;
      lay(new THREE.Group().add(ribbon) as THREE.Group, [0, 0.007, -0.1], 0, 0);
      s.ring(0.01, 0.0025, [0, 0.012, -0.036], rimMat).rotation.x = Math.PI / 2;
      lay(pennant(), [0, 0.009, 0.04], Math.PI, 0);
      s.box([0.035, 0.003, 0.014], [0.04, 0.008, -0.14], s.material('#9a9a92', { metalness: 0.8 }));
    } else if (a.setting === 'stand') {
      const wood = s.material('#5b3420', { roughness: 0.35 });
      s.box([0.18, 0.025, 0.1], [0, 0.0125, 0], wood);
      s.box([0.16, 0.008, 0.08], [0, 0.029, 0], s.material('#6e4128', { roughness: 0.3 }));
      s.label('1975', 0.07, 0.016, [0, 0.0125, 0.0505], '#d8c27a', '#2c1a10');
      const upright = pennant(R * 1.1);
      upright.position.set(0, 0.033 + R * 1.1 * 0.85, 0.005);
      upright.rotation.x = -0.18;
      s.root.add(upright);
      s.rod([0, 0.03, -0.035], [0, 0.03 + R * 1.2, -0.01], 0.003, s.material('#c9a75a', { metalness: 0.8, roughness: 0.3 }));
      s.box([0.1, 0.006, 0.01], [0, 0.036, 0.018], s.material('#c9a75a', { metalness: 0.8, roughness: 0.3 }));
    } else {
      // A dodecahedral ball of pennants, burst open where it hit.
      s.ball([0.34, 0.012, 0.28], [0, 0, 0], dustMat, 24);
      const ball = new THREE.DodecahedronGeometry(0.13, 0).toNonIndexed();
      const position = ball.attributes.position;
      const faces = new Map<string, THREE.Vector3[]>();
      const normal = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 3) {
        const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, i + k));
        normal.crossVectors(ab.subVectors(p[1], p[0]), ac.subVectors(p[2], p[0])).normalize();
        const key = normal.toArray().map((v) => v.toFixed(2)).join();
        const list = faces.get(key) ?? [];
        for (const v of p) if (!list.some((w) => w.distanceTo(v) < 1e-4)) list.push(v);
        faces.set(key, list);
      }
      ball.dispose();
      const shell = new THREE.Group();
      let index = 0;
      const missing = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort(() => random() - 0.5).slice(0, 3));
      const scattered: number[] = [];
      for (const list of faces.values()) {
        const centre = list.reduce((sum, v) => sum.add(v), new THREE.Vector3()).multiplyScalar(1 / list.length);
        const n = centre.clone().normalize();
        const x = list[0].clone().sub(centre);
        const r = x.length() * 0.95;
        x.normalize();
        const y = new THREE.Vector3().crossVectors(n, x);
        const piece = pennant(r, 0);
        piece.matrix.makeBasis(x, y, n).setPosition(centre);
        piece.matrix.decompose(piece.position, piece.quaternion, piece.scale);
        if (missing.has(index)) scattered.push(r);
        else shell.add(piece);
        index++;
      }
      // Its insides: a dark core and spokes that held the pennants.
      shell.add(new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 12), s.material('#2a2622', { metalness: 0.4 })));
      shell.position.y = 0.125;
      shell.rotation.set(random() * 6, random() * 6, random() * 6);
      s.root.add(shell);
      scattered.forEach((r, i) => {
        const angle = (i / scattered.length) * Math.PI * 2 + random(), spread = 0.2 + random() * 0.07;
        lay(pennant(r, 0), [Math.cos(angle) * spread, 0.012, Math.sin(angle) * spread * 0.85], random() * 6, (random() - 0.5) * 0.15);
      });
    }

    // A slow glint crossing the relief, quicker with energy.
    const pace = mix(0.25, 1.4, mood.energy), shine = a.setting === 'dust' || a.setting === 'sphere' ? 0.06 : 0.12;
    return s.finish({
      update(_dt, time) {
        faceMat.emissiveIntensity = Math.max(0, Math.sin(time * pace)) ** 8 * shine;
      },
    });
  },
});

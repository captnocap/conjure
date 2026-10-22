import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const KINDS = {
  seville: 'Seville orange marmalade, amber with dark shreds of peel.',
  strawberry: 'Strawberry jam, bright red with seeds and lumps of fruit.',
  blackcurrant: 'Blackcurrant jam, purple so dark it is nearly black.',
  curd: 'Lemon curd, opaque primrose yellow.',
  honey: 'Clear golden honey.',
  gooseberry: 'Gooseberry jam, cloudy green.',
  damson: 'Damson jam, deep plum red.',
} as const;
type Kind = keyof typeof KINDS;
const TINT: Record<Kind, string> = { seville: '#e0841a', strawberry: '#c3212a', blackcurrant: '#3a1238', curd: '#f2d95c', honey: '#e2a52a', gooseberry: '#a9b356', damson: '#7a1f3a' };
const NAME: Record<Kind, string> = { seville: 'Marmalade', strawberry: 'Strawberry', blackcurrant: 'Blackcurrant', curd: 'Lemon Curd', honey: 'Honey', gooseberry: 'Gooseberry', damson: 'Damson' };

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    kind: choice('What preserve is in the jar?', KINDS),
    fill: score('How full is the jar?', ['Scraped out, a smear at the bottom', 'A third left', 'Half', 'Just opened', 'Sealed and full to the neck']),
    label: choice('What does the handwritten label say?', {
      dated: 'The name of the preserve and the year it was made, in careful ink.',
      gran: 'Just “Gran’s”.',
      plain: 'Only the name, in capitals.',
      warning: 'A possessive warning: “DAD’S. HANDS OFF”.',
      gift: 'A gift tag: “For Margaret, with love”.',
      faded: 'An old label, faded and water-stained until it cannot be read.',
      fete: 'A price in pencil from a church fete stall.',
    }),
    cover: choice('How is the jar covered?', {
      cloth: 'A circle of checked cloth tied round the neck with string.',
      wax: 'A waxed paper disc held with a red rubber band.',
      lid: 'A gold screw-top lid, the jar reused from a shop.',
      off: 'Uncovered, the lid or cloth lying beside it.',
    }),
    jar: choice('What shape is the jar?', {
      round: 'An ordinary round one-pound jam jar.',
      hex: 'A six-sided jar, the kind sold at farm shops.',
      squat: 'A short wide jar with a heavy shoulder.',
      tall: 'A tall narrow jar.',
    }),
    knife: choice('Where is the knife?', {
      across: 'Resting across the top of the jar, sticky.',
      stuck: 'Standing in the open jar, left in.',
      table: 'Lying on the table beside a smear.',
      spoon: 'There is a teaspoon instead, propped against the jar.',
      none: 'No knife; nobody has started on it.',
    }),
    spill: noul('Has some run down the side of the jar and pooled?'),
    company: choice('What stands with it?', {
      alone: 'Nothing. One jar.',
      pantry: 'Two more sealed jars from the same batch, behind it.',
      fruit: 'The raw ingredient beside it: the fruit it was made from.',
      toast: 'A slice of toast on a plate, thickly spread.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const [R, H] = { round: [0.036, 0.095], hex: [0.037, 0.09], squat: [0.044, 0.07], tall: [0.03, 0.122] }[a.jar];
    const sides = a.jar === 'hex' ? 6 : 32;
    const tint = TINT[a.kind];
    const open = a.cover === 'off' || a.knife === 'stuck';

    const glass = new THREE.MeshPhysicalMaterial({ color: '#e9f3f0', transparent: true, opacity: 0.21, roughness: 0.06, side: THREE.DoubleSide, flatShading: a.jar === 'hex' });
    const preserveTexture = paint(256, 256, (g, w, h) => {
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      const marks = a.kind === 'seville' ? 70 : a.kind === 'strawberry' ? 120 : a.kind === 'curd' || a.kind === 'honey' ? 0 : 40;
      for (let i = 0; i < marks; i++) {
        const x = random() * w, y = random() * h;
        if (a.kind === 'seville') {
          g.strokeStyle = random() > 0.4 ? 'rgba(120,50,5,0.75)' : 'rgba(255,190,90,0.7)';
          g.lineWidth = 3 + random() * 3;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + wobble(20), y + wobble(20), x + wobble(34), y + wobble(34)); g.stroke();
        } else {
          g.fillStyle = a.kind === 'strawberry' && random() > 0.7 ? 'rgba(250,220,150,0.7)' : 'rgba(30,5,10,0.4)';
          g.beginPath(); g.arc(x, y, a.kind === 'strawberry' ? 1.6 + random() * 7 * (random() > 0.8 ? 1 : 0.2) : 4 + random() * 8, 0, Math.PI * 2); g.fill();
        }
      }
      const shade = g.createLinearGradient(0, 0, 0, h);
      shade.addColorStop(0, 'rgba(255,230,160,0.08)');
      shade.addColorStop(1, 'rgba(20,0,0,0.25)');
      g.fillStyle = shade;
      g.fillRect(0, 0, w, h);
    });
    const preserve = new THREE.MeshStandardMaterial({ color: '#b4b4b4', map: preserveTexture, roughness: 0.3, emissive: tint, emissiveIntensity: 0.04, flatShading: a.jar === 'hex' });
    const sticky = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.75), roughness: 0.12, emissive: tint, emissiveIntensity: 0.05 });
    const steel = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.22 });
    const twine = s.material('#b89a62', { roughness: 1 });

    const wall = (y: number, r: number) => {
      const t = y / H;
      if (t < 0.06) return r * mix(0.9, 1, t / 0.06);
      if (t < 0.78) return r;
      if (t < 0.9) return r * mix(1, 0.83, (t - 0.78) / 0.12);
      return r * 0.83;
    };
    const profile = (r: number, to: number, cap: boolean) => {
      const points = [new THREE.Vector2(0.0001, 0.001)];
      for (let i = 0; i <= 16; i++) { const y = (i / 16) * to; points.push(new THREE.Vector2(wall(y, r), Math.max(y, 0.001))); }
      if (cap) points.push(new THREE.Vector2(0.0001, to));
      return points;
    };
    const cloth = (hues: readonly [string, string]) => paint(128, 128, (g) => {
      g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = hues[0]; g.globalAlpha = 0.55;
      for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 16, 128); g.fillRect(0, i, 128, 16); }
      g.globalAlpha = 1;
    });
    const clothHue: readonly [string, string] = mood.cheer > 0.5 ? ['#c8322c', '#fff'] : ['#3b5f9a', '#fff'];

    const coverOn = (group: Sculpture, kind: 'cloth' | 'wax' | 'lid', r: number, h: number) => {
      const neck = r * 0.83;
      if (kind === 'lid') {
        group.cylinder(neck + 0.002, neck + 0.002, 0.013, [0, h - 0.004, 0], group.material('#c9a544', { metalness: 0.85, roughness: 0.3 }), 32);
        return h + 0.0025;
      }
      const texture = kind === 'cloth' ? cloth(clothHue) : null;
      if (texture) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(6, 2); }
      const skin = new THREE.MeshStandardMaterial({ color: kind === 'cloth' ? '#ffffff' : '#efe6c8', map: texture, roughness: 1, side: THREE.DoubleSide });
      const flare = kind === 'cloth' ? 1.5 : 1.22, drop = kind === 'cloth' ? 0.034 : 0.022;
      const skirt = new THREE.LatheGeometry([[0.0001, h + 0.004], [neck * 0.9, h + 0.0035], [neck + 0.002, h - 0.001], [neck + 0.0015, h - 0.011], [neck * 1.12, h - 0.018], [neck * flare, h - drop]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
      const position = skirt.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i), rad = Math.hypot(x, z);
        if (rad < neck * 1.05) continue;
        const frill = 1 + Math.sin(Math.atan2(z, x) * 9) * 0.1 * ((rad - neck) / (neck * (flare - 1)));
        position.setX(i, x * frill); position.setZ(i, z * frill);
      }
      skirt.computeVertexNormals();
      group.mesh(skirt, skin);
      const band = group.ring(neck + 0.0025, 0.0014, [0, h - 0.011, 0], kind === 'cloth' ? twine : group.material('#c22a22', { roughness: 0.6 }));
      band.rotation.x = Math.PI / 2;
      if (kind === 'cloth') for (const side of [-1, 1]) group.ring(0.007, 0.001, [side * 0.007, h - 0.013, neck + 0.004], twine).rotation.z = side * 0.5;
      return h + 0.0045;
    };

    const jarAt = (x: number, z: number, level: number, text: readonly string[] | null, covered: 'cloth' | 'wax' | 'lid' | null, turn: number) => {
      const group = new Sculpture(context);
      const body = group.mesh(new THREE.LatheGeometry(profile(R, H, false), sides), glass);
      body.castShadow = true;
      body.renderOrder = 2;
      group.ring(R * 0.83 + 0.001, 0.0022, [0, H - 0.002, 0], glass).rotation.x = Math.PI / 2;
      const fillTop = Math.max(0.004, H * 0.88 * level);
      group.mesh(new THREE.LatheGeometry(profile(R - 0.0028, fillTop, true), sides), preserve);
      if (level < 0.4) {
        // Smears left clinging to the inside of an emptying jar.
        for (let i = 0; i < 5; i++) {
          const angle = random() * Math.PI * 2, y = fillTop + random() * H * 0.45;
          const smear = group.ball([0.008 + random() * 0.006, 0.006 + random() * 0.012, 0.0012], [Math.sin(angle) * (R - 0.003), y, Math.cos(angle) * (R - 0.003)], sticky, 10);
          smear.rotation.y = angle;
          smear.castShadow = false;
        }
      }
      if (text) {
        const arc = a.jar === 'hex' ? 0 : 1.5;
        const lw = a.jar === 'hex' ? R * 0.92 : R * arc, lh = Math.min(0.04, H * 0.42);
        const texture = paint(512, Math.round(512 * lh / lw), (g, w, h) => {
          const old = a.label === 'faded' ? 1 : mood.wear;
          g.fillStyle = `rgb(${245 - old * 30},${238 - old * 40},${218 - old * 60})`;
          g.fillRect(0, 0, w, h);
          g.strokeStyle = a.label === 'fete' ? '#b03a30' : '#2b4a8a';
          g.lineWidth = 8;
          g.strokeRect(12, 12, w - 24, h - 24);
          g.lineWidth = 2;
          g.strokeRect(24, 24, w - 48, h - 48);
          g.fillStyle = a.label === 'fete' ? '#444' : a.label === 'warning' ? '#a01818' : '#1c2a55';
          g.globalAlpha = a.label === 'faded' ? 0.22 : 0.92;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          const capitals = a.label === 'plain' || a.label === 'warning';
          text.forEach((line, i) => {
            const size = Math.min(h * (text.length > 1 ? 0.3 : 0.42), (w - 70) / Math.max(line.length, 4) * (capitals ? 1.5 : 1.9));
            g.font = `${capitals ? 'bold' : 'italic'} ${size}px ${capitals ? '"Arial Narrow", sans-serif' : '"Brush Script MT", "Segoe Script", cursive'}`;
            g.save();
            g.translate(w / 2, h * (text.length > 1 ? 0.34 + i * 0.34 : 0.5));
            g.rotate(wobble(0.03) - 0.02);
            g.fillText(line, 0, 0, w - 60);
            g.restore();
          });
          g.globalAlpha = 1;
          if (old > 0.5) for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(120,90,40,${0.1 + random() * 0.15})`; g.beginPath(); g.ellipse(random() * w, random() * h, 30 + random() * 60, 20 + random() * 40, random() * 3, 0, Math.PI * 2); g.fill(); }
        });
        const paper = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
        const y = H * 0.42;
        if (a.jar === 'hex') {
          const flat = group.mesh(new THREE.PlaneGeometry(lw, lh), paper, [0, y, R * Math.cos(Math.PI / 6) + 0.0006]);
          flat.castShadow = false;
        } else {
          const curved = group.mesh(new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, lh, 24, 1, true, -arc / 2, arc), paper, [0, y, 0]);
          curved.castShadow = false;
        }
      }
      const topY = covered ? coverOn(group, covered, R, H) : H;
      group.root.position.set(x, 0, z);
      group.root.rotation.y = turn;
      s.root.add(group.root);
      return topY;
    };

    const year = 1958 + Math.floor(random() * 40);
    const words: readonly string[] = {
      dated: [NAME[a.kind], `${['Jan', 'July', 'Aug', 'Sept'][Math.floor(random() * 4)]} ${year}`],
      gran: ['Gran’s'],
      plain: [NAME[a.kind].toUpperCase()],
      warning: ['DAD’S', 'HANDS OFF'],
      gift: ['For Margaret', 'with love x'],
      faded: [NAME[a.kind], `${year - 20}`],
      fete: [NAME[a.kind], `${15 + Math.floor(random() * 8) * 5}p`],
    }[a.label];
    const level = open ? Math.min(a.fill, 0.92) : a.fill;
    const onTop = open ? null : a.cover as 'cloth' | 'wax' | 'lid';
    const topY = jarAt(0, 0, level, words, onTop, wobble(0.25));
    const surface = Math.max(0.004, H * 0.88 * level);

    // The cover, taken off.
    if (open) {
      const kind = a.cover === 'off' ? (random() > 0.5 ? 'cloth' : 'lid') : a.cover;
      const lx = -R - 0.05, lz = 0.05;
      if (kind === 'lid') {
        const lid = s.cylinder(R * 0.83 + 0.002, R * 0.83 + 0.002, 0.012, [lx, 0.006, lz], s.material('#c9a544', { metalness: 0.85, roughness: 0.3 }), 32);
        lid.rotation.z = 0;
        s.cylinder(R * 0.78, R * 0.78, 0.001, [lx, 0.0125, lz], s.material('#f1ecd9', { roughness: 0.5 }), 24);
      } else {
        const texture = kind === 'cloth' ? cloth(clothHue) : null;
        if (texture) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3); }
        const flat = s.mesh(new THREE.CircleGeometry(R * 1.35, 28), new THREE.MeshStandardMaterial({ color: kind === 'cloth' ? '#ffffff' : '#efe6c8', map: texture, roughness: 1, side: THREE.DoubleSide }), [lx, 0.0025, lz]);
        flat.rotation.x = -Math.PI / 2;
        const position = flat.geometry.getAttribute('position');
        for (let i = 1; i < position.count; i++) position.setZ(i, Math.sin(i * 1.7) * 0.0022);
        flat.geometry.computeVertexNormals();
        const loose = s.ring(0.014, 0.0012, [lx + 0.02, 0.006, lz + 0.012], kind === 'cloth' ? twine : s.material('#c22a22', { roughness: 0.6 }));
        loose.rotation.x = Math.PI / 2;
        loose.scale.set(1.3, 0.7, 1);
      }
    }

    // Knife or spoon.
    const knife = () => {
      const group = new Sculpture(context);
      group.box([0.095, 0.0014, 0.016], [0.045, 0, 0], steel);
      group.cylinder(0.008, 0.008, 0.0014, [0.0925, 0, 0], steel, 16);
      const handleSkin = group.material(mood.wear > 0.5 ? '#e5d9b6' : '#f1ead6', { roughness: 0.4 });
      group.box([0.08, 0.008, 0.013], [-0.042, 0, 0], handleSkin);
      group.ball([0.03, 0.0028, 0.0085], [0.062, 0.0015, 0], sticky, 12);
      return group;
    };
    if (a.knife === 'across') {
      const k = knife();
      k.root.position.set(-0.012, topY + 0.002, 0.004);
      k.root.rotation.set(0, 0.5 + wobble(0.4), 0.02);
      s.root.add(k.root);
      if (!open) s.ball([0.008, 0.002, 0.006], [0.03, topY + 0.0005, -0.012], sticky, 10);
    } else if (a.knife === 'stuck') {
      const k = knife();
      const lean = 0.34;
      k.root.position.set(Math.sin(lean) * 0.02 - 0.012, surface + 0.07, 0);
      k.root.rotation.set(0.3, 0, Math.PI / 2 + lean);
      k.root.scale.x = -1;
      s.root.add(k.root);
    } else if (a.knife === 'table') {
      const k = knife();
      k.root.position.set(R + 0.03, 0.005, 0.07);
      k.root.rotation.set(0, 0.9 + wobble(0.3), 0);
      s.root.add(k.root);
      s.ball([0.02, 0.0018, 0.012], [R + 0.062, 0.001, 0.02], sticky, 14).rotation.y = 0.9;
    } else if (a.knife === 'spoon') {
      const group = new Sculpture(context);
      group.ball([0.011, 0.0035, 0.016], [0, 0, 0], steel, 14);
      group.ball([0.008, 0.0038, 0.012], [0, 0.0015, 0], sticky, 12);
      group.rod([0, 0, 0.014], [0, 0, 0.11], 0.0026, steel, 0.0018);
      group.ball([0.005, 0.002, 0.008], [0, 0, 0.112], steel, 10);
      group.root.position.set(R + 0.03, 0.004, 0.055);
      group.root.rotation.set(0, -0.5 + wobble(0.3), 0);
      s.root.add(group.root);
    }

    if (a.spill) {
      for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
        const angle = 0.5 + i * 0.75 + wobble(0.25), from = H * 0.9, reach = H * (0.3 + random() * 0.55);
        const points: [number, number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const y = from - reach * (k / 6), r = wall(y, R) + 0.001, drift = angle + Math.sin(k * 0.9 + i) * 0.04;
          points.push([Math.sin(drift) * r, y, Math.cos(drift) * r]);
        }
        s.tube(points, 0.0026, sticky);
        s.ball([0.004, 0.0055, 0.004], points[6], sticky, 10);
      }
      s.ball([0.03, 0.0016, 0.022], [R * 0.8, 0.0008, R * 0.9], sticky, 16).rotation.y = 0.6;
    }

    // Company.
    if (a.company === 'pantry') {
      const other: 'cloth' | 'wax' | 'lid' = a.cover === 'off' ? 'cloth' : a.cover;
      jarAt(-R * 1.5, -R * 2.6, 1, null, other, 0);
      jarAt(R * 1.3, -R * 2.9, 1, null, other, 0);
    } else if (a.company === 'fruit') {
      const fx = -R - 0.055, fz = -0.03;
      if (a.kind === 'honey') {
        const wood = s.material('#b8864a', { roughness: 0.8 });
        const dip = new Sculpture(context);
        dip.rod([0, 0, 0], [0, 0, 0.12], 0.004, wood);
        for (let i = 0; i < 5; i++) dip.cylinder(0.012 - Math.abs(i - 2) * 0.002, 0.012 - Math.abs(i - 2) * 0.002, 0.004, [0, 0, -0.006 - i * 0.007], wood, 16).rotation.x = Math.PI / 2;
        dip.root.position.set(fx, 0.012, fz + 0.03);
        dip.root.rotation.y = 0.7;
        s.root.add(dip.root);
        s.ball([0.02, 0.0015, 0.016], [fx - 0.02, 0.0008, fz + 0.005], sticky, 14);
      } else {
        const spec = {
          seville: { tint: '#e8861c', size: [0.034, 0.032, 0.034], n: 2 }, curd: { tint: '#f0d23a', size: [0.026, 0.026, 0.036], n: 2 },
          strawberry: { tint: '#cf2a2e', size: [0.014, 0.017, 0.014], n: 6 }, blackcurrant: { tint: '#2a0f2c', size: [0.006, 0.006, 0.006], n: 26 },
          gooseberry: { tint: '#a8ba5c', size: [0.01, 0.011, 0.01], n: 10 }, damson: { tint: '#4a1c44', size: [0.014, 0.014, 0.018], n: 6 },
        }[a.kind];
        const skin = s.material(spec.tint, { roughness: 0.5 });
        const leaf = s.material('#4f7a3a', { roughness: 0.8 });
        for (let i = 0; i < spec.n; i++) {
          const spread = Math.sqrt(spec.n) * spec.size[0] * 1.1;
          const x = fx + wobble(spread), z = fz + wobble(spread);
          const fruit = s.ball(spec.size as unknown as [number, number, number], [x, spec.size[1], z], skin, 16);
          fruit.rotation.y = random() * 3;
          if (spec.n <= 6) s.ball([spec.size[0] * 0.35, 0.0015, spec.size[0] * 0.2], [x, spec.size[1] * 2, z], leaf, 8);
        }
      }
    } else if (a.company === 'toast') {
      const px = -R - 0.08, pz = 0.02;
      s.lathe([[0, 0.005], [0.055, 0.005], [0.08, 0.012], [0.082, 0.0105], [0.056, 0], [0, 0]], s.material('#f4f1e8', { roughness: 0.3, side: THREE.DoubleSide }), [px, 0, pz]);
      const toast = s.box([0.085, 0.011, 0.09], [px, 0.011, pz], s.material('#b97a34', { roughness: 0.95 }));
      toast.rotation.y = 0.4;
      const spread = s.box([0.07, 0.004, 0.074], [px, 0.0175, pz], sticky);
      spread.rotation.y = 0.4;
    }

    return s.finish();
  },
});

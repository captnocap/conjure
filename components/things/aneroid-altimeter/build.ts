import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const UNITS = {
  metres: { marks: ['0', '1', '2', '3', '4', '5', '6'], legend: 'METRES x 1000', title: 'ALTITUDE' },
  feet: { marks: ['0', '3', '6', '9', '12', '15', '18'], legend: 'FEET x 1000', title: 'ALTITUDE' },
  hectopascals: { marks: ['1050', '950', '850', '750', '650', '550', '450'], legend: 'hPa', title: 'PRESSURE' },
  mercury: { marks: ['31', '29', '27', '25', '23', '21', '19'], legend: 'INCHES Hg', title: 'BAROMETER' },
  weather: { marks: ['STORMY', 'RAIN', 'CHANGE', 'FAIR', 'VERY DRY'], legend: 'COMPENSATED', title: 'ANEROID' },
} as const;

export default defineThing({
  questions: {
    reading: choice('What does the needle read?', {
      ground: 'Zero: resting at the start of the scale, still on the ground.',
      climbing: 'A modest height, low on the scale and rising.',
      high: 'Halfway round the dial: properly high, thin air.',
      danger: 'Deep in the red arc near the end of the scale: too high.',
      pinned: 'Hard against the stop, past the last mark on the dial.',
      dead: 'Nothing: the needle has snapped off and lies loose at the bottom of the dial.',
    }),
    glass: choice('What state is the glass in?', {
      clear: 'Clean and whole.',
      hairline: 'A single hairline crack running across it.',
      shattered: 'Starred from a hard knock, a web of cracks spreading from one point.',
      fogged: 'Misted on the inside with condensation.',
      gone: 'Missing entirely: the needle is bare to the air.',
    }),
    casing: choice('What style of case does it have?', {
      pocket: 'A brass pocket-watch case with a stem and a bow ring at the top.',
      marine: 'A heavy lacquered brass case with a broad knurled bezel and screw lugs, off a ship or an airship gondola.',
      military: 'A black-enamelled service case with a grey bezel and a fat setting knob.',
      nickel: 'A nickel-silver surveyor\'s case with a rotating outer ring of fine graduations.',
    }),
    dial: choice('What is the dial face like?', {
      enamel: 'White enamel with crisp black numerals.',
      silvered: 'Silvered brass with engraved numerals.',
      black: 'Matt black with pale luminous numerals.',
      paper: 'Yellowed printed paper, foxed at the edges.',
    }),
    units: choice('What is the scale marked in?', {
      metres: 'Thousands of metres of altitude.',
      feet: 'Thousands of feet of altitude.',
      hectopascals: 'Hectopascals of pressure, falling as it climbs.',
      mercury: 'Inches of mercury.',
      weather: 'Weather words: STORMY, RAIN, CHANGE, FAIR, VERY DRY.',
    }),
    cradle: choice('How is it carried or kept?', {
      strapped: 'Buckled into a leather wrist cradle and propped up, the strap trailing either side.',
      hung: 'Hanging by a leather loop from a small brass hook stand.',
      boxed: 'Lying in its open velvet-lined travelling box.',
    }),
    marker: noul('Is there a second red marker hand left at the highest point reached?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = { pocket: 0.045, marine: 0.058, military: 0.05, nickel: 0.048 }[a.casing];
    const depth = a.casing === 'marine' ? 0.034 : 0.024;
    const tarnish = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#5d5a3c'), mood.wear * 0.45);
    const metalColour = { pocket: '#d2a640', marine: '#c89a34', military: '#1d1f22', nickel: '#c9ccd0' }[a.casing];
    const metal = new THREE.MeshStandardMaterial({ color: tarnish(metalColour), metalness: a.casing === 'military' ? 0.35 : 0.9, roughness: mix(0.22, 0.6, mood.wear) + (a.casing === 'military' ? 0.25 : 0) });
    const trim = new THREE.MeshStandardMaterial({ color: tarnish(a.casing === 'military' ? '#8d9296' : metalColour), metalness: 0.9, roughness: mix(0.2, 0.55, mood.wear) });
    const leatherTone = new THREE.Color('#7a4a26').lerp(new THREE.Color('#3a2616'), mood.wear * 0.6).offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0);
    const leather = new THREE.MeshStandardMaterial({ color: leatherTone, roughness: 0.78, side: THREE.DoubleSide });
    const steel = new THREE.MeshStandardMaterial({ color: '#27375e', metalness: 0.85, roughness: 0.3 });
    const red = new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.5 });

    // The dial, painted. Angles run clockwise from twelve o'clock; the scale sweeps 270 degrees.
    const S = 512, C = S / 2;
    const face = document.createElement('canvas');
    face.width = face.height = S;
    const g = face.getContext('2d')!;
    const paper = { enamel: '#f4f1e6', silvered: '#c9cbc8', black: '#17191b', paper: '#e6d6a6' }[a.dial];
    const ink = a.dial === 'black' ? '#d6ecc0' : '#1c1a17';
    g.fillStyle = paper; g.fillRect(0, 0, S, S);
    if (a.dial === 'silvered') for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,255,255,${random() * 0.2})`; g.beginPath(); g.arc(C, C, random() * C, 0, 7); g.stroke(); }
    const sweep = (fraction: number) => (-135 + 270 * fraction) * Math.PI / 180;
    const at = (angle: number, radius: number): [number, number] => [C + Math.sin(angle) * radius, C - Math.cos(angle) * radius];
    const unit = UNITS[a.units];
    g.strokeStyle = '#c8281e'; g.lineWidth = 16;
    g.beginPath(); g.arc(C, C, 218, sweep(0.8) - Math.PI / 2, sweep(1) - Math.PI / 2); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.arc(C, C, 230, sweep(0) - Math.PI / 2, sweep(1) - Math.PI / 2); g.stroke();
    const divisions = (unit.marks.length - 1) * 10;
    for (let i = 0; i <= divisions; i++) {
      const angle = sweep(i / divisions), long = i % 10 === 0, mid = i % 5 === 0;
      g.lineWidth = long ? 5 : mid ? 3 : 1.5;
      g.beginPath(); g.moveTo(...at(angle, 230)); g.lineTo(...at(angle, long ? 196 : mid ? 206 : 214)); g.stroke();
    }
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    unit.marks.forEach((mark, index) => {
      const angle = sweep(index / (unit.marks.length - 1));
      g.font = `bold ${mark.length > 4 ? 22 : mark.length > 2 ? 30 : 46}px serif`;
      const [x, y] = at(angle, mark.length > 4 ? 150 : 160);
      g.save(); g.translate(x, y); if (mark.length > 4) g.rotate(angle); g.fillText(mark, 0, 0); g.restore();
    });
    // An inner ring of fine graduations, the maker's lines and the legend.
    g.lineWidth = 1.5; g.beginPath(); g.arc(C, C, 112, 0, 7); g.stroke();
    for (let i = 0; i < 72; i++) { const angle = i * Math.PI / 36; g.beginPath(); g.moveTo(...at(angle, 112)); g.lineTo(...at(angle, i % 6 ? 104 : 96)); g.stroke(); }
    g.font = 'bold 26px serif'; g.fillText(unit.title, C, C - 62);
    g.font = '19px serif'; g.fillText(unit.legend, C, C + 58);
    g.font = 'italic 15px serif'; g.fillText(`No ${1000 + Math.floor(random() * 8999)}`, C, C + 82);
    for (let i = 0; i < mood.wear * 26; i++) {
      g.fillStyle = `rgba(${90 + random() * 40},${60 + random() * 30},20,${0.06 + random() * 0.16})`;
      const angle = random() * 7, radius = 120 + random() * 130;
      g.beginPath(); g.ellipse(C + Math.cos(angle) * radius, C + Math.sin(angle) * radius, 8 + random() * 36, 6 + random() * 22, random() * 3, 0, 7); g.fill();
    }
    const dialMap = new THREE.CanvasTexture(face);
    dialMap.colorSpace = THREE.SRGBColorSpace;
    dialMap.anisotropy = 8;
    const dialMaterial = new THREE.MeshStandardMaterial({ map: dialMap, roughness: a.dial === 'silvered' ? 0.35 : 0.7, metalness: a.dial === 'silvered' ? 0.5 : 0 });
    if (a.dial === 'black') { dialMaterial.emissive = new THREE.Color('#9fd68a'); dialMaterial.emissiveMap = dialMap; dialMaterial.emissiveIntensity = 0.5; }

    // The instrument is built upright facing +z around its own centre, then set into its cradle.
    const inst = new THREE.Group();
    s.root.add(inst);
    const part = <T extends THREE.Object3D>(node: T) => { inst.add(node); return node; };
    const disc = (radius: number, thick: number, z: number, material: THREE.Material, segments = 48) => {
      const mesh = part(s.cylinder(radius, radius, thick, [0, 0, z], material, segments));
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    };
    disc(r, depth, 0, metal);
    const dialZ = depth / 2 + 0.0006;
    part(s.mesh(new THREE.CircleGeometry(r * 0.93, 64), dialMaterial, [0, 0, dialZ])).castShadow = false;
    const bezelTube = a.casing === 'marine' ? r * 0.13 : r * 0.07;
    part(s.mesh(new THREE.TorusGeometry(r * 0.95, bezelTube, 12, 64), trim, [0, 0, depth / 2]));
    part(s.mesh(new THREE.TorusGeometry(r * 0.97, r * 0.05, 8, 48), trim, [0, 0, -depth / 2]));
    if (a.casing === 'marine') {
      const knurl = part(s.mesh(new THREE.CylinderGeometry(r * 1.09, r * 1.09, 0.008, 60, 1), new THREE.MeshStandardMaterial({ color: tarnish(metalColour), metalness: 0.9, roughness: 0.4, flatShading: true }), [0, 0, depth / 2 - 0.004]));
      knurl.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3 + Math.PI / 3;
        part(s.box([0.022, 0.022, 0.005], [Math.sin(angle) * r * 1.16, Math.cos(angle) * r * 1.16, -depth / 2 + 0.003], metal)).rotation.z = -angle;
        const screw = part(s.cylinder(0.005, 0.005, 0.004, [Math.sin(angle) * r * 1.2, Math.cos(angle) * r * 1.2, -depth / 2 + 0.007], steel, 10));
        screw.rotation.x = Math.PI / 2;
      }
    }
    if (a.casing === 'nickel') {
      const ringMap = document.createElement('canvas');
      ringMap.width = 512; ringMap.height = 16;
      const rg = ringMap.getContext('2d')!;
      rg.fillStyle = '#d7dadc'; rg.fillRect(0, 0, 512, 16);
      rg.fillStyle = '#1c1a17'; for (let i = 0; i < 128; i++) rg.fillRect(i * 4, 0, 1, i % 8 ? 7 : 16);
      const ringTexture = new THREE.CanvasTexture(ringMap);
      ringTexture.colorSpace = THREE.SRGBColorSpace;
      part(s.mesh(new THREE.RingGeometry(r * 0.99, r * 1.14, 64, 1), new THREE.MeshStandardMaterial({ color: '#d7dadc', metalness: 0.7, roughness: 0.35 }), [0, 0, depth / 2 - 0.002]));
      const edge = part(s.mesh(new THREE.CylinderGeometry(r * 1.14, r * 1.14, 0.007, 64, 1, true), new THREE.MeshStandardMaterial({ map: ringTexture, metalness: 0.6, roughness: 0.4 }), [0, 0, depth / 2 - 0.0055]));
      edge.rotation.x = Math.PI / 2;
      for (let i = 0; i < 36; i++) { const angle = i * Math.PI / 18; part(s.box([0.0012, i % 3 ? 0.004 : 0.007, 0.0006], [Math.sin(angle) * r * 1.08, Math.cos(angle) * r * 1.08, depth / 2 - 0.0016], steel)).rotation.z = -angle; }
    }
    // Stem, bow or setting knob.
    const bowY = r + 0.02;
    if (a.casing === 'military') {
      const knob = part(s.cylinder(0.011, 0.011, 0.012, [r + 0.007, 0, 0], new THREE.MeshStandardMaterial({ color: '#8d9296', metalness: 0.8, roughness: 0.45, flatShading: true }), 14));
      knob.rotation.z = Math.PI / 2;
    }
    part(s.cylinder(0.005, 0.006, 0.012, [0, r + 0.005, 0], trim, 12));
    part(s.mesh(new THREE.TorusGeometry(0.011, 0.0022, 8, 28), trim, [0, bowY, 0]));
    part(s.ball([0.006, 0.004, 0.006], [0, r + 0.011, 0], trim, 12));

    // Hands.
    const hand = (fraction: number, length: number, material: THREE.Material, z: number, wide: number) => {
      const group = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(wide, length, 0.0008), material);
      blade.position.y = length / 2 - r * 0.16;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(wide * 1.6, r * 0.1, 4), material);
      tip.position.y = length - r * 0.16 + r * 0.03; tip.scale.z = 0.25;
      const tail = new THREE.Mesh(new THREE.CircleGeometry(r * 0.045, 16), material);
      tail.position.set(0, -r * 0.17, 0.0003);
      for (const mesh of [blade, tip, tail]) mesh.castShadow = true;
      group.add(blade, tip, tail);
      group.position.z = z;
      group.rotation.z = -sweep(fraction);
      inst.add(group);
      return group;
    };
    const jitter = (random() - 0.5) * 0.04;
    const reading = { ground: 0.0, climbing: 0.2, high: 0.5, danger: 0.9, pinned: 1.045, dead: 0 }[a.reading] + (a.reading === 'pinned' ? 0 : jitter * (a.reading === 'ground' ? 0.2 : 1));
    let needle: THREE.Group | null = null;
    if (a.reading === 'dead') {
      const loose = hand(0, r * 0.62, steel, dialZ + 0.0015, r * 0.022);
      loose.position.set((random() - 0.5) * r * 0.5, -r * 0.62, dialZ + 0.0015);
      loose.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.7;
    } else needle = hand(reading, r * 0.86, steel, dialZ + 0.003, r * 0.02);
    if (a.marker) hand(Math.max(reading, 0) + (1 - Math.min(reading, 1)) * mix(0.25, 0.8, random()), r * 0.8, red, dialZ + 0.0018, r * 0.014);
    disc(r * 0.05, 0.004, dialZ + 0.003, trim, 16);
    // The stop pin at the end of the scale.
    disc(r * 0.018, 0.004, dialZ + 0.002, trim, 8).position.set(Math.sin(sweep(1.06)) * r * 0.7, Math.cos(sweep(1.06)) * r * 0.7, dialZ + 0.002);

    // Glass: see-through layers, never measured as solid.
    if (a.glass !== 'gone') {
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 48), new THREE.MeshPhysicalMaterial({ color: '#eaf4f6', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }));
      pane.position.z = depth / 2 + 0.0065;
      inst.add(pane);
      if (a.glass !== 'clear') {
        const flaw = document.createElement('canvas');
        flaw.width = flaw.height = 256;
        const f = flaw.getContext('2d')!;
        if (a.glass === 'fogged') {
          const haze = f.createRadialGradient(128, 128, 20, 128, 128, 128);
          haze.addColorStop(0, 'rgba(245,248,250,0.25)'); haze.addColorStop(0.7, 'rgba(245,248,250,0.7)'); haze.addColorStop(1, 'rgba(245,248,250,0.9)');
          f.fillStyle = haze; f.fillRect(0, 0, 256, 256);
          f.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 16; i++) { f.beginPath(); f.arc(random() * 256, random() * 256, 3 + random() * 9, 0, 7); f.fill(); }
          f.beginPath(); f.ellipse(100 + random() * 60, 110 + random() * 50, 44, 22, random() * 3, 0, 7); f.fill();
        } else {
          f.strokeStyle = 'rgba(255,255,255,0.95)'; f.lineCap = 'round';
          const crack = (x: number, y: number, angle: number, length: number, width: number) => {
            f.lineWidth = width; f.beginPath(); f.moveTo(x, y);
            for (let step = 0; step < length; step += 14) { angle += (random() - 0.5) * 0.5; x += Math.cos(angle) * 14; y += Math.sin(angle) * 14; f.lineTo(x, y); if (width > 1.6 && random() < 0.16) crack(x, y, angle + (random() - 0.5) * 1.6, length * 0.3, width * 0.6); }
            f.stroke();
          };
          if (a.glass === 'hairline') { const angle = random() * 7; crack(128 - Math.cos(angle) * 125, 128 - Math.sin(angle) * 125, angle, 250, 2.2); }
          else {
            const hx = 70 + random() * 110, hy = 70 + random() * 110;
            for (let i = 0; i < 11; i++) crack(hx, hy, i * 0.571 + random() * 0.3, 240, 3);
            f.lineWidth = 1.6;
            for (const radius of [16, 34, 60]) { f.beginPath(); for (let i = 0; i <= 11; i++) { const angle = i * 0.571, d = radius * (0.8 + random() * 0.4); f.lineTo(hx + Math.cos(angle) * d, hy + Math.sin(angle) * d); } f.stroke(); }
            f.fillStyle = 'rgba(255,255,255,0.4)'; f.beginPath(); f.arc(hx, hy, 12, 0, 7); f.fill();
          }
        }
        const flawMap = new THREE.CanvasTexture(flaw);
        flawMap.colorSpace = THREE.SRGBColorSpace;
        const overlay = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 48), new THREE.MeshBasicMaterial({ map: flawMap, transparent: true, depthWrite: false }));
        overlay.position.z = depth / 2 + 0.007;
        inst.add(overlay);
      }
    }

    /** A flat strap along a path; each point carries its own width direction so it can twist. */
    const ribbon = (points: [THREE.Vector3, THREE.Vector3][], material: THREE.Material) => {
      const path = new THREE.CatmullRomCurve3(points.map(([p]) => p));
      const widths = new THREE.CatmullRomCurve3(points.map(([, w]) => w));
      const steps = 48, vertices: number[] = [], index: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const p = path.getPoint(i / steps), w = widths.getPoint(i / steps).multiplyScalar(0.5);
        vertices.push(p.x - w.x, p.y - w.y, p.z - w.z, p.x + w.x, p.y + w.y, p.z + w.z);
        if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return s.mesh(geometry, material);
    };
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const backPlate = () => {
      disc(r * 1.06, 0.004, -depth / 2 - 0.003, leather);
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2;
        const tab = part(s.box([0.012, 0.006, depth + 0.012], [Math.sin(angle) * (r + 0.004), Math.cos(angle) * (r + 0.004), 0.001], leather));
        tab.rotation.z = -angle + Math.PI / 2;
        part(s.box([0.012, 0.01, 0.003], [Math.sin(angle) * (r - 0.001), Math.cos(angle) * (r - 0.001), depth / 2 + bezelTube + 0.001], leather)).rotation.z = -angle + Math.PI / 2;
      }
    };

    if (a.cradle === 'strapped') {
      const tilt = mix(0.5, 0.68, random());
      backPlate();
      inst.rotation.x = -tilt;
      inst.position.set(0, r * Math.cos(tilt) + (depth / 2 + 0.006) * Math.sin(tilt) + 0.002, 0);
      const up = v(0, Math.cos(tilt), -Math.sin(tilt)), back = v(0, -Math.sin(tilt), -Math.cos(tilt));
      const behind = inst.position.clone().addScaledVector(back, depth / 2 + 0.007);
      const wide = r * 0.62, flat = v(0, 0, wide), end = r * 3.1;
      const side = (sign: number): [THREE.Vector3, THREE.Vector3][] => [
        [behind.clone().add(v(sign * r * 0.9, 0, 0)), up.clone().multiplyScalar(wide)],
        [v(sign * r * 1.7, 0.012, behind.z + 0.012), v(0, 0.3, 0.9).normalize().multiplyScalar(wide)],
        [v(sign * r * 2.2, 0.004 + random() * 0.012, behind.z + 0.03 + random() * 0.02), flat],
        [v(sign * end, 0.002, behind.z + 0.02 + random() * 0.05), flat],
      ];
      const left = side(-1), right = side(1);
      ribbon([...left.reverse(), [behind.clone(), up.clone().multiplyScalar(wide)], ...right], leather);
      // A buckle at one end and a prop behind.
      const tipL = left[0][0];
      for (const [dx, dz, sx, sz] of [[-0.004, -wide / 2, 0.02, 0.003], [-0.004, wide / 2, 0.02, 0.003], [-0.014, 0, 0.003, wide + 0.003], [0.006, 0, 0.003, wide + 0.003]] as const) s.box([sx, 0.003, sz], [tipL.x + dx, 0.005, tipL.z + dz], trim);
      s.box([0.02, 0.002, 0.002], [tipL.x - 0.004, 0.007, tipL.z], trim);
      s.rod(behind.toArray() as [number, number, number], [0, 0.002, behind.z - r * 0.9], 0.006, leather, 0.004);
    } else if (a.cradle === 'hung') {
      const top = r * 2 + 0.085;
      s.cylinder(r * 0.95, r * 1.05, 0.008, [0, 0.004, -0.02], trim, 32);
      s.cylinder(r * 0.6, r * 0.9, 0.006, [0, 0.011, -0.02], trim, 32);
      s.tube([[0, 0.012, -0.03], [0, top * 0.6, -0.03], [0, top, -0.028], [0, top + 0.012, -0.012], [0, top + 0.002, 0.002], [0, top - 0.012, -0.004]], 0.0035, trim);
      s.ball([0.006, 0.006, 0.006], [0, top - 0.013, -0.004], trim, 10);
      inst.rotation.z = (random() - 0.5) * 0.16;
      inst.position.set(0, top - 0.03 - bowY, 0);
      const bow = v(Math.sin(-inst.rotation.z) * bowY, inst.position.y + Math.cos(inst.rotation.z) * bowY, 0);
      const w = v(0.012, 0, 0);
      ribbon([[bow.clone().add(v(0, -0.008, 0.004)), w], [v(bow.x * 0.5, top - 0.012, 0.008), w], [v(0, top + 0.004, 0.001), w], [v(bow.x * 0.5, top - 0.012, -0.006), w], [bow.clone().add(v(0, -0.008, -0.004)), w]], leather);
    } else {
      // An open travelling box: velvet well, lid standing behind on its hinges.
      const box = r * 2 + 0.036, tall = depth + 0.02;
      const timber = s.material(['#5a3520', '#2c2724', '#6f4a2a'][Math.floor(random() * 3)], { roughness: 0.6 });
      const velvet = s.material(['#5a1a2a', '#1f3a5a', '#24452f', '#3a2550'][Math.floor(random() * 4)], { roughness: 1 });
      s.box([box, tall, box], [0, tall / 2, 0], timber);
      s.box([box - 0.012, 0.004, box - 0.012], [0, tall + 0.001, 0], velvet);
      const lid = new THREE.Group();
      lid.position.set(0, tall, -box / 2);
      lid.rotation.x = -mix(1.75, 2.0, random());
      s.root.add(lid);
      const lidWood = s.box([box, 0.014, box], [0, 0.007, box / 2], timber); lid.add(lidWood);
      const lining = s.box([box - 0.012, 0.003, box - 0.012], [0, -0.001, box / 2], velvet); lid.add(lining);
      for (const x of [-1, 1]) s.cylinder(0.004, 0.004, 0.02, [x * box * 0.3, tall, -box / 2], trim, 8).rotation.z = Math.PI / 2;
      s.box([0.016, 0.012, 0.004], [0, tall - 0.008, box / 2 + 0.002], trim);
      const tilt = 0.98;
      inst.rotation.x = -tilt;
      inst.position.set(0, tall + r * Math.cos(tilt) + depth / 2 * Math.sin(tilt) + 0.004, 0.012);
      s.box([box * 0.5, r * 0.8, 0.02], [0, tall + r * 0.25, -r * 0.62], velvet).rotation.x = -0.5;
    }

    const tremble = mix(0, 0.02, mood.energy) * (a.reading === 'pinned' ? 0.2 : 1);
    const rest = needle ? needle.rotation.z : 0;
    return s.finish({ update: (_dt, time) => { if (needle) needle.rotation.z = rest + Math.sin(time * 7.3) * tremble + Math.sin(time * 1.1) * tremble * 1.5; } });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const PASTELS = ['#9fd8cb', '#f4b6c2', '#f7e08c', '#a9cdf0', '#f9c9a0', '#c9b8e8'];

export default defineThing({
  questions: {
    count: choice('How many cubicles are in the row?', {
      two: 'Just a pair, squeezed into a corner.',
      three: 'Three in a short row.',
      four: 'Four, a proper run.',
      six: 'Six, a long terrace of doors.',
    }),
    doors: choice('How are the doors painted?', {
      'pastel-blue': 'All one seaside pastel: a soft sky blue with white frames.',
      'pastel-mix': 'Each door a different ice-cream pastel: mint, pink, lemon, lilac.',
      stripes: 'Alternating red and white deckchair stripes.',
      'municipal-green': 'Dark municipal green over cream, flaking in patches.',
      varnish: 'Bare varnished timber, honey brown, with white frames.',
      'beach-hut': 'Bold beach-hut primaries: red, yellow and blue.',
    }),
    open: choice('Which doors stand open?', {
      shut: 'Every door is shut and bolted.',
      'one-ajar': 'One door hangs ajar.',
      alternate: 'Every other door stands open.',
      all: 'All the doors are flung wide: the row is empty.',
    }),
    beneath: choice('What shows beneath or on the doors?', {
      footprints: 'A trail of wet footprints leads away across the paving.',
      sandals: 'A pair of sandals is parked neatly outside one door.',
      swimsuit: 'A forgotten swimsuit drips from a hook.',
      occupied: 'A towel is slung over one door and bare feet show in the gap beneath it.',
      nothing: 'Nothing: swept and anonymous.',
    }),
    roof: choice('What tops the row?', {
      flat: 'A flat white Art Deco roof with a stepped parapet.',
      scallop: 'A striped canvas valance with a scalloped edge.',
      pitched: 'A low pitched felt roof with a wooden finial at each end.',
    }),
    beside: choice('What stands at the end of the row?', {
      bench: 'A slatted bench with wire clothes baskets on it.',
      baskets: 'A teetering stack of empty wire baskets.',
      shower: 'A cold shower post over a drain.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { two: 2, three: 3, four: 4, six: 6 }[a.count];
    const w = 0.96, d = 1.2, h = 2.12, floorH = 0.1;
    const width = n * w;
    const green = a.doors === 'municipal-green';
    const frameColour = green ? '#e9dfc0' : a.doors === 'stripes' ? '#f6f2e8' : '#f4f1e8';
    const frame = s.material(frameColour);
    const brass = s.material('#c9a13c', { metalness: 0.75, roughness: 0.3 });
    const dark = s.material('#2a2d30');
    const flake = mood.wear * (green ? 1.6 : 1) + (green ? 0.25 : 0);

    const doorColour = (i: number) => {
      switch (a.doors) {
        case 'pastel-blue': return '#a9d3ee';
        case 'pastel-mix': return PASTELS[(i + Math.floor(context.seed % 6)) % PASTELS.length];
        case 'stripes': return i % 2 ? '#f4f0e6' : '#d8382f';
        case 'municipal-green': return '#2f6a4a';
        case 'varnish': return '#b9803f';
        default: return ['#d8322c', '#f2c21c', '#2468b8'][i % 3];
      }
    };
    const planks = (colour: string, striped: boolean) => paint(128, 256, (c) => {
      c.fillStyle = colour; c.fillRect(0, 0, 128, 256);
      if (striped) { c.fillStyle = '#d8382f'; for (let i = 0; i < 4; i++) c.fillRect(i * 32, 0, 16, 256); }
      c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2;
      for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * 21.3, 0); c.lineTo(i * 21.3, 256); c.stroke(); }
      // Flaking paint: undercoat and bare wood showing through.
      const patches = Math.round(flake * 70);
      for (let i = 0; i < patches; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(228,217,184,0.9)' : 'rgba(140,115,85,0.9)';
        const x = random() * 128, y = 256 * Math.pow(random(), 0.6), r = 1.2 + random() * 3.2;
        c.beginPath(); c.ellipse(x, y, r, r * (0.6 + random() * 1.4), random() * 3, 0, 7); c.fill();
      }
      c.fillStyle = `rgba(60,50,40,${0.08 + mood.wear * 0.3})`; c.fillRect(0, 226, 128, 30);
    });
    const wallMap = planks(frameColour, false);
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.8 });
    const inside = s.material('#d9d2bd');

    // Slatted floor, back wall, partitions, corner posts.
    const slatMap = paint(64, 64, (c) => {
      c.fillStyle = '#3a3329'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = mood.wear > 0.5 ? '#9c8a6c' : '#c2a878'; for (let i = 0; i < 4; i++) c.fillRect(0, i * 16 + 2, 64, 12);
    });
    slatMap.wrapS = slatMap.wrapT = THREE.RepeatWrapping; slatMap.repeat.set(1, 6);
    const slats = new THREE.MeshStandardMaterial({ map: slatMap, roughness: 0.8 });
    s.box([width + 0.1, floorH, d + 0.25], [0, floorH / 2, 0.08], slats);
    s.box([width + 0.06, h, 0.05], [0, floorH + h / 2, -d / 2], wall);
    for (let i = 0; i <= n; i++) {
      const x = -width / 2 + i * w;
      s.box([0.05, h, d], [x, floorH + h / 2, 0], i === 0 || i === n ? wall : inside);
      s.box([0.09, h, 0.09], [x, floorH + h / 2, d / 2], frame);
    }
    s.box([width + 0.09, 0.1, 0.09], [0, floorH + h - 0.05, d / 2], frame);

    // Which doors are open.
    const order = Array.from({ length: n }, (_u, i) => i).sort(() => random() - 0.5);
    const special = order[0];
    const openness = (i: number) => {
      if (a.beneath === 'occupied' && i === special) return 0;
      if (a.open === 'all') return mix(1.2, 2.0, random());
      if (a.open === 'alternate') return i % 2 === special % 2 ? mix(0.9, 1.7, random()) : 0;
      if (a.open === 'one-ajar') return i === order[n > 1 ? 1 : 0] ? mix(0.35, 0.8, random()) : 0;
      return 0;
    };
    const first = 1 + Math.floor(random() * 40);
    const doorH = 1.25, doorY = floorH + 0.32, doorW = w - 0.14;
    let openDoor = -1;
    for (let i = 0; i < n; i++) {
      const x0 = -width / 2 + i * w;
      const colour = doorColour(i);
      const leaf = new THREE.Group();
      leaf.position.set(x0 + 0.07, doorY, d / 2 + 0.01);
      const angle = openness(i);
      if (angle > 0 && openDoor < 0) openDoor = i;
      leaf.rotation.y = -angle;
      s.root.add(leaf);
      const material = new THREE.MeshStandardMaterial({ map: planks(colour, false), roughness: 0.7 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.035), material);
      panel.position.set(doorW / 2, doorH / 2, 0); panel.castShadow = panel.receiveShadow = true;
      leaf.add(panel);
      for (const y of [0.12, doorH - 0.12]) {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.09, 0.02), material);
        ledge.position.set(doorW / 2, y, 0.027); leaf.add(ledge);
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.012), dark);
        hinge.position.set(0.07, y, 0.04); leaf.add(hinge);
      }
      // Numbered brass plate and a bolt.
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 20), brass);
      plate.rotation.x = Math.PI / 2; plate.position.set(doorW / 2, doorH * 0.68, 0.022); leaf.add(plate);
      const numberMap = paint(64, 64, (c) => {
        c.fillStyle = '#d8b24a'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#2a2114'; c.font = 'bold 40px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(first + i), 32, 34);
      });
      const number = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20), new THREE.MeshStandardMaterial({ map: numberMap, metalness: 0.5, roughness: 0.35 }));
      number.position.set(doorW / 2, doorH * 0.68, 0.03); leaf.add(number);
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), brass);
      bolt.position.set(doorW - 0.07, doorH * 0.5, 0.03); leaf.add(bolt);

      // Inside: bench, a high shelf with a wire basket, a coat hook.
      const cx = x0 + w / 2;
      s.box([w - 0.08, 0.04, 0.3], [cx, floorH + 0.45, -d / 2 + 0.19], slats);
      s.box([w - 0.08, 0.03, 0.26], [cx, floorH + 1.62, -d / 2 + 0.16], frame);
      s.rod([cx + 0.3, floorH + 1.35, -d / 2 + 0.03], [cx + 0.3, floorH + 1.33, -d / 2 + 0.1], 0.012, brass);
      if (random() < 0.35 + mood.density * 0.5) basket(cx + (random() - 0.5) * 0.1, floorH + 1.635, -d / 2 + 0.17, angle === 0 && random() < 0.5 + mood.density * 0.4);

      if (a.beneath === 'occupied' && i === special) {
        const towel = new THREE.MeshStandardMaterial({ map: paint(64, 64, (c) => {
          const pair = mood.cheer > 0.45 ? ['#f2a51c', '#fbf3df'] : ['#52718c', '#e2ddd0'];
          for (let k = 0; k < 8; k++) { c.fillStyle = pair[k % 2]; c.fillRect(0, k * 8, 64, 8); }
        }), roughness: 0.95 });
        s.box([0.4, 0.5, 0.02], [cx + 0.05, doorY + doorH - 0.24, d / 2 + 0.045], towel);
        s.box([0.4, 0.04, 0.09], [cx + 0.05, doorY + doorH + 0.012, d / 2 + 0.01], towel);
        s.box([0.4, 0.34, 0.02], [cx + 0.05, doorY + doorH - 0.16, d / 2 - 0.03], towel);
        const skin = s.material(['#e8b48c', '#c98d62', '#8a5a3c', '#f0c7a8'][Math.floor(random() * 4)], { roughness: 0.7 });
        for (const sx of [-1, 1]) {
          s.ball([0.05, 0.035, 0.11], [cx + sx * 0.1, floorH + 0.035, d / 2 - 0.12], skin, 12).rotation.y = sx * 0.2;
          s.cylinder(0.04, 0.035, 0.26, [cx + sx * 0.1, floorH + 0.16, d / 2 - 0.19], skin, 10);
        }
      }
    }

    function basket(x: number, y: number, z: number, full: boolean) {
      const mesh = paint(64, 64, (c) => {
        c.clearRect(0, 0, 64, 64); c.strokeStyle = '#8f979b'; c.lineWidth = 5;
        for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * 16, 0); c.lineTo(k * 16, 64); c.stroke(); c.beginPath(); c.moveTo(0, k * 16); c.lineTo(64, k * 16); c.stroke(); }
      });
      const wire = new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
      s.box([0.42, 0.2, 0.3], [x, y + 0.1, z], wire);
      if (full) {
        const cloth = s.material(['#c94f3d', '#3f6fa8', '#e8e0cc', '#6c8f5a', '#d9a23a'][Math.floor(random() * 5)], { roughness: 0.95 });
        s.ball([0.18, 0.09, 0.12], [x, y + 0.12, z], cloth, 10);
        s.ball([0.1, 0.07, 0.1], [x + 0.08, y + 0.19, z - 0.02], s.material('#e9e4d4', { roughness: 0.95 }), 10);
      }
    }

    // Roof.
    const top = floorH + h;
    if (a.roof === 'flat') {
      s.box([width + 0.3, 0.1, d + 0.36], [0, top + 0.05, 0.06], frame);
      s.box([width + 0.2, 0.16, 0.1], [0, top + 0.18, d / 2 + 0.15], frame);
      s.box([Math.min(width * 0.5, 1.4), 0.16, 0.1], [0, top + 0.34, d / 2 + 0.15], frame);
      s.box([width + 0.32, 0.04, d + 0.38], [0, top + 0.02, 0.06], s.material(green ? '#2f6a4a' : doorColour(0)));
      s.label(n > 2 ? 'CHANGING ROOMS' : 'BATHERS', Math.min(width * 0.46, 1.3), 0.11, [0, top + 0.34, d / 2 + 0.202], green ? '#2f6a4a' : '#2a4a6b', frameColour);
    } else if (a.roof === 'scallop') {
      s.box([width + 0.3, 0.06, d + 0.5], [0, top + 0.03, 0.1], frame);
      const tints = green ? ['#2f6a4a', '#e9dfc0'] : a.doors === 'pastel-blue' ? ['#6fb0dc', '#fbf7ec'] : a.doors === 'varnish' ? ['#e8a528', '#fbf7ec'] : ['#d8382f', '#fbf7ec'];
      const valanceMap = paint(256, 64, (c) => {
        c.clearRect(0, 0, 256, 64);
        for (let k = 0; k < 8; k++) {
          c.fillStyle = tints[k % 2]; c.fillRect(k * 32, 0, 32, 40);
          c.beginPath(); c.arc(k * 32 + 16, 40, 16, 0, Math.PI); c.fill();
        }
      });
      valanceMap.wrapS = THREE.RepeatWrapping; valanceMap.repeat.x = n * 0.75;
      const valance = new THREE.MeshStandardMaterial({ map: valanceMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
      valance.color.lerp(new THREE.Color('#a39d90'), mood.wear * 0.4);
      s.mesh(new THREE.PlaneGeometry(width + 0.3, 0.34), valance, [0, top - 0.11, d / 2 + 0.36]);
      const sideMap = valanceMap.clone(); sideMap.repeat.x = 1.2; sideMap.needsUpdate = true;
      const sideMaterial = valance.clone(); sideMaterial.map = sideMap;
      for (const sx of [-1, 1]) s.mesh(new THREE.PlaneGeometry(d + 0.5, 0.34), sideMaterial, [sx * (width / 2 + 0.15), top - 0.11, 0.1]).rotation.y = Math.PI / 2;
    } else {
      const felt = s.material('#4d5357', { roughness: 0.95 });
      const gable = new THREE.Shape();
      gable.moveTo(-(d / 2 + 0.3), 0); gable.lineTo(d / 2 + 0.3, 0); gable.lineTo(0, 0.42); gable.lineTo(-(d / 2 + 0.3), 0);
      const roof = s.mesh(new THREE.ExtrudeGeometry(gable, { depth: width + 0.3, bevelEnabled: false }), felt, [-(width + 0.3) / 2, top, 0.05]);
      roof.rotation.y = Math.PI / 2;
      s.box([width + 0.34, 0.07, d + 0.66], [0, top, 0.05], frame);
      for (const sx of [-1, 1]) {
        s.cylinder(0.02, 0.035, 0.3, [sx * (width / 2 + 0.1), top + 0.55, 0.05], frame, 8);
        s.ball([0.05, 0.05, 0.05], [sx * (width / 2 + 0.1), top + 0.72, 0.05], frame, 10);
      }
    }

    // Stories on and under the doors.
    const frontZ = d / 2 + 0.2;
    const at = (openDoor >= 0 ? openDoor : special);
    const ax = -width / 2 + at * w + w / 2;
    if (a.beneath === 'footprints') {
      const steps = 9 + Math.floor(random() * 4);
      const veer = (random() - 0.5) * 0.5;
      const printMap = paint(256, 512, (c) => {
        c.clearRect(0, 0, 256, 512);
        for (let k = 0; k < steps; k++) {
          const y = 30 + k * (460 / steps), x = 128 + (k % 2 ? 26 : -26) + veer * k * 14;
          c.fillStyle = `rgba(70,84,92,${0.85 - k * 0.055})`;
          c.beginPath(); c.ellipse(x, y, 13, 22, veer * 0.5, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x, y + 26, 9, 9, 0, 0, 7); c.fill();
          for (let t = -2; t <= 2; t++) { c.beginPath(); c.arc(x + t * 5.5, y + 40 - Math.abs(t) * 1.5, 3, 0, 7); c.fill(); }
        }
      });
      const prints = s.mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshStandardMaterial({ map: printMap, transparent: true, depthWrite: false, roughness: 0.2 }), [ax, 0.004, frontZ + 1.05]);
      prints.rotation.x = -Math.PI / 2; prints.castShadow = false;
      const wet = s.cylinder(0.3, 0.3, 0.004, [ax, floorH + 0.003, d / 2 - 0.1], new THREE.MeshStandardMaterial({ color: '#46545c', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.1 }), 18);
      wet.castShadow = false;
    } else if (a.beneath === 'sandals') {
      const leather = s.material(mood.cheer > 0.5 ? '#d8452f' : '#7a5231', { roughness: 0.7 });
      const yaw = (random() - 0.5) * 0.5;
      for (const sx of [-1, 1]) {
        const sole = s.box([0.1, 0.02, 0.26], [ax + sx * 0.08, 0.01, frontZ + 0.22 + sx * 0.02], leather);
        sole.rotation.y = yaw + sx * 0.06;
        const strap = s.ring(0.05, 0.012, [ax + sx * 0.08, 0.03, frontZ + 0.26 + sx * 0.02], leather, Math.PI);
        strap.rotation.y = yaw;
      }
    } else if (a.beneath === 'swimsuit') {
      const tint = ['#1f4f9c', '#d8322c', '#1c1c20', '#e8a528'][Math.floor(random() * 4)];
      const suitMap = paint(64, 128, (c) => {
        c.clearRect(0, 0, 64, 128); c.fillStyle = tint;
        c.beginPath(); c.moveTo(14, 0); c.lineTo(20, 0); c.lineTo(24, 34); c.lineTo(40, 34); c.lineTo(44, 0); c.lineTo(50, 0);
        c.lineTo(58, 60); c.lineTo(52, 100); c.lineTo(40, 126); c.lineTo(24, 126); c.lineTo(12, 100); c.lineTo(6, 60); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(8, 62, 48, 6);
      });
      const px = -width / 2 + special * w + 0.045 * (special === 0 ? -1 : 1);
      const hookX = -width / 2 + special * w;
      s.rod([hookX, floorH + 1.72, d / 2 + 0.04], [hookX, floorH + 1.7, d / 2 + 0.13], 0.012, brass);
      s.mesh(new THREE.PlaneGeometry(0.34, 0.62), new THREE.MeshStandardMaterial({ map: suitMap, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }), [hookX, floorH + 1.4, d / 2 + 0.12]).rotation.z = (random() - 0.5) * 0.15;
      void px;
      const drip = new THREE.MeshStandardMaterial({ color: '#46545c', transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.1 });
      s.cylinder(0.16, 0.16, 0.004, [hookX, floorH + 0.003, d / 2 + 0.13], drip, 16).castShadow = false;
    }

    // What stands at the end of the row.
    const ex = width / 2 + 0.75;
    if (a.beside === 'bench') {
      for (let i = 0; i < 4; i++) s.box([1.1, 0.035, 0.085], [ex, 0.45, -0.18 + i * 0.11], frame);
      for (const sx of [-1, 1]) { s.box([0.06, 0.45, 0.4], [ex + sx * 0.45, 0.225, -0.02], frame); }
      basket(ex - 0.25, 0.47, -0.02, true);
      if (mood.density > 0.3) basket(ex + 0.27, 0.47, -0.02, random() < 0.5);
    } else if (a.beside === 'baskets') {
      const stack = 4 + Math.round(mood.density * 5);
      for (let i = 0; i < stack; i++) basket(ex - 0.2 + (random() - 0.5) * 0.07, i * 0.1, 0.1 + (random() - 0.5) * 0.07, false);
    } else if (a.beside === 'shower') {
      const pipe = s.material('#c9cfd2', { metalness: 0.8, roughness: 0.3 });
      s.cylinder(0.3, 0.3, 0.02, [ex - 0.2, 0.01, 0.2], s.material('#8f979b', { metalness: 0.5 }), 20);
      s.tube([[ex - 0.2, 0, -0.1], [ex - 0.2, 2.0, -0.1], [ex - 0.2, 2.25, 0], [ex - 0.2, 2.2, 0.2]], 0.025, pipe);
      s.cylinder(0.1, 0.03, 0.07, [ex - 0.2, 2.16, 0.2], pipe, 16);
      s.ring(0.05, 0.012, [ex - 0.2, 1.15, -0.06], brass);
      s.rod([ex - 0.2, 1.9, -0.07], [ex - 0.2, 1.3, -0.04], 0.004, dark);
    }
    return s.finish();
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const STATIONS = {
  abbesses: 'ABBESSES, up on the hill of Montmartre.',
  bastille: 'BASTILLE, crowds and demonstrations.',
  chatelet: 'CHATELET, the tangled heart of the network.',
  'pere-lachaise': 'PERE LACHAISE, beside the great cemetery.',
  'porte-dauphine': 'PORTE DAUPHINE, the leafy end of the line.',
} as const;
const STATION_TEXT: Record<keyof typeof STATIONS, string> = {
  abbesses: 'ABBESSES', bastille: 'BASTILLE', chatelet: 'CHATELET', 'pere-lachaise': 'PERE LACHAISE', 'porte-dauphine': 'PORTE DAUPHINE',
};

export default defineThing({
  questions: {
    sign: choice('What sign hangs between the two stalks?', {
      metropolitain: 'A cream enamel panel lettered METROPOLITAIN in swaying green Art Nouveau capitals, the classic.',
      metro: 'A shorter red enamel plaque reading METRO in white, a later and blunter replacement.',
      station: 'A dark green panel naming the station in pale letters.',
      missing: 'An empty iron frame: the sign has been taken down or stolen.',
    }),
    station: choice('If the sign names the station, which one?', STATIONS),
    iron: choice('What colour is the cast iron?', {
      verdigris: 'Soft grey-green verdigris, like weathered bronze.',
      bottle: 'Deep glossy bottle green, freshly repainted.',
      black: 'Black iron with touches of dull gold.',
      teal: 'A blue-leaning teal, theatrical under lamps.',
    }),
    lamps: choice('What are the lamp buds like?', {
      amber: 'Amber glass, warm as honey.',
      red: 'Red-orange glass like two watchful eyes.',
      milk: 'Milk-white frosted glass, pale and moonlike.',
    }),
    lit: noul('Are the lamps lit?'),
    gate: choice('What state is the gate at the top of the stairs in?', {
      open: 'Both leaves folded back, the stair open to anyone.',
      half: 'One leaf pulled across, the station closing or just opening.',
      chained: 'Shut and chained with a padlock for the night: the last train has gone.',
      barred: 'Shut with a board reading FERME hung on it: strike, works or flood.',
    }),
    canopy: noul('Does it have a fan-shaped glass canopy over the stair, like a dragonfly wing?'),
    left: choice('What has been left at the top of the stairs?', {
      nothing: 'Nothing; the pavement is clear.',
      umbrella: 'A black umbrella leaning forgotten against the railing.',
      bouquet: 'A bouquet in paper lying on the ground, dropped or abandoned.',
      suitcase: 'A small leather suitcase standing by a stalk, its owner arriving or leaving.',
      newspapers: 'A tied bundle of newspapers waiting for the morning.',
    }),
    map: noul('Is there a network map board standing beside the entrance?'),
    railInfill: choice('What ornaments fill the railing panels?', { scroll: 'The original open organic scrolls.', seed: 'A seed-shaped medallion in each panel.', fan: 'Three slender fan ribs in each panel.', leaf: 'A pointed leaf hanging at the centre.' }),
    curbDetail: choice('How is the stone curb finished?', { plain: 'Plain cut stone.', grooves: 'Long shallow grooves on its outer face.', caps: 'Square cap blocks under the posts.', brick: 'A band of red brick along the base.' }),
    signCrest: choice('What rises above the sign frame?', { none: 'No extra crest.', bud: 'A central closed flower bud.', leaves: 'Two long leaves curling away from the centre.', rosette: 'A small round floral rosette.' }),
    lampCage: choice('How is the glass protected?', { bare: 'Uncovered glass buds.', ribs: 'Four thin iron ribs around each bud.', band: 'A narrow brass collar around each bud.', petals: 'Three cast metal petals cupping the glass.' }),
    entryPaving: choice('What paving marks the top of the stair?', { bare: 'No separate paving apron.', stone: 'Broad pale stone slabs.', mosaic: 'Cream and charcoal mosaic.', cobbles: 'A short band of rounded grey setts.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color({ verdigris: '#5f9179', bottle: '#1f5a3c', black: '#22272a', teal: '#1f6d74' }[a.iron]);
    base.lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.3);
    const iron = s.material(base, { metalness: 0.35, roughness: a.iron === 'bottle' ? 0.35 : 0.55 });
    const accent = a.iron === 'black' ? s.material('#b8963e', { metalness: 0.6, roughness: 0.4 }) : iron;
    const stone = s.material('#b9b3a4', { roughness: 0.9 });
    const W = 1.5, Z0 = -2.4, Z1 = 2.4;

    // The stair mouth: a dark well painted with steps sinking out of the light.
    const well = paint(256, 512, (g, w, h) => {
      const steps = 11;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const y0 = h - (i + 1) * (h / steps);
        const shade = Math.round(mix(150, 14, t ** 0.7));
        g.fillStyle = `rgb(${shade},${Math.round(shade * 0.96)},${Math.round(shade * 0.9)})`;
        g.fillRect(0, y0, w, h / steps);
        g.fillStyle = `rgba(0,0,0,${0.55})`;
        g.fillRect(0, y0, w, 6);
        g.fillStyle = `rgba(255,240,200,${0.35 * (1 - t)})`;
        g.fillRect(0, y0 + h / steps - 5, w, 5);
      }
      const side = g.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(0,0,0,0.6)'); side.addColorStop(0.18, 'rgba(0,0,0,0)');
      side.addColorStop(0.82, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = side; g.fillRect(0, 0, w, h);
    });
    const mouth = s.mesh(new THREE.PlaneGeometry(W * 2 - 0.3, Z1 - Z0 - 0.15), new THREE.MeshStandardMaterial({ map: well, roughness: 0.9 }), [0, 0.012, 0]);
    mouth.rotation.x = -Math.PI / 2;
    mouth.castShadow = false;

    // Stone curb on three sides.
    s.box([0.3, 0.22, Z1 - Z0 + 0.3], [-W, 0.11, 0], stone);
    s.box([0.3, 0.22, Z1 - Z0 + 0.3], [W, 0.11, 0], stone);
    s.box([W * 2 + 0.3, 0.22, 0.3], [0, 0.11, Z0], stone);

    // Railings: posts, rails and a shield cartouche in every panel.
    const panel = (ax: number, az: number, bx: number, bz: number) => {
      const dx = bx - ax, dz = bz - az;
      const at = (u: number, v: number): [number, number, number] => [ax + dx * (u + 0.5), 0.22 + v, az + dz * (u + 0.5)];
      s.tube([at(0, 0.12), at(0.3, 0.42), at(0.36, 0.86), at(0, 0.7), at(-0.36, 0.86), at(-0.3, 0.42)], 0.022, iron, true);
      s.tube([at(-0.46, 0.1), at(-0.2, 0.3), at(0, 0.58), at(0.2, 0.3), at(0.46, 0.1)], 0.016, accent);
      if(a.railInfill==='seed')s.ball([.11,.19,.055],at(0,.46),accent,14);
      else if(a.railInfill==='fan')for(const u of[-.28,0,.28])s.rod(at(0,.13),at(u,.72),.009,accent);
      else if(a.railInfill==='leaf')s.tube([at(0,.72),at(.15,.42),at(0,.2),at(-.15,.42),at(0,.72)],.014,accent);
      s.rod(at(-0.5, 0.95), at(0.5, 0.95), 0.03, iron);
      s.rod(at(-0.5, 0.06), at(0.5, 0.06), 0.02, iron);
    };
    const post = (x: number, z: number) => {
      s.lathe([[0.05, 0], [0.06, 0.1], [0.035, 0.25], [0.035, 0.95], [0.06, 1.02], [0.03, 1.12], [0, 1.16]], iron, [x, 0.22, z]);
    };
    const sidePanels = 5;
    for (const sx of [-1, 1]) {
      for (let i = 0; i <= sidePanels; i++) {
        const z = mix(Z0, Z1, i / sidePanels);
        if (i < sidePanels) { post(sx * W, z); panel(sx * W, z, sx * W, mix(Z0, Z1, (i + 1) / sidePanels)); }
      }
    }
    for (let i = 0; i < 3; i++) {
      panel(mix(-W, W, i / 3), Z0, mix(-W, W, (i + 1) / 3), Z0);
      if (i > 0) post(mix(-W, W, i / 3), Z0);
    }

    // The two great stalks, their lamp buds and the sign frame.
    const glassColour = { amber: '#ffab2e', red: '#ff4a1c', milk: '#f4efe0' }[a.lamps];
    const glow = a.lit ? 1.8 * mix(0.8, 1.2, mood.warmth) : 0.04;
    const glass = new THREE.MeshStandardMaterial({ color: a.lit ? glassColour : new THREE.Color(glassColour).multiplyScalar(0.55), emissive: glassColour, emissiveIntensity: glow, roughness: 0.25 });
    for (const sx of [-1, 1]) {
      s.lathe([[0.2, 0], [0.22, 0.12], [0.13, 0.35], [0.1, 0.7], [0.09, 0.9]], iron, [sx * W, 0, Z1]);
      s.tube([[sx * W, 0.8, Z1], [sx * (W + 0.1), 1.6, Z1], [sx * (W - 0.02), 2.5, Z1], [sx * (W + 0.16), 3.3, Z1], [sx * (W + 0.05), 4.0, Z1], [sx * (W - 0.4), 4.42, Z1], [sx * (W - 0.72), 4.2, Z1]], 0.075, iron);
      // A side shoot that reaches in to carry the sign.
      s.tube([[sx * (W - 0.01), 2.4, Z1], [sx * (W - 0.12), 2.75, Z1], [sx * (W - 0.1), 3.2, Z1], [sx * (W - 0.3), 3.52, Z1]], 0.05, iron);
      s.tube([[sx * (W + 0.1), 3.1, Z1], [sx * (W + 0.42), 3.5, Z1], [sx * (W + 0.36), 3.85, Z1], [sx * (W + 0.14), 3.8, Z1]], 0.035, accent);
      // Calyx and bud.
      const lx = sx * (W - 0.76), ly = 3.86;
      s.lathe([[0.03, 0.34], [0.1, 0.26], [0.17, 0.1], [0.13, 0.0], [0.15, -0.06]], iron, [lx, ly, Z1]);
      const bud = s.ball([0.2, 0.3, 0.2], [lx, ly - 0.17, Z1], glass, 18);
      bud.castShadow = false;
      s.cylinder(0.0, 0.03, 0.1, [lx, ly - 0.5, Z1], iron, 8).rotation.x = Math.PI;
    }
    const signY = 2.98, signW = 2.5, signH = 0.62;
    s.tube([[-signW / 2 - 0.06, signY - signH / 2 - 0.05, Z1], [0, signY - signH / 2 - 0.12, Z1], [signW / 2 + 0.06, signY - signH / 2 - 0.05, Z1], [signW / 2 + 0.12, signY, Z1], [signW / 2 + 0.04, signY + signH / 2 + 0.05, Z1], [0, signY + signH / 2 + 0.16, Z1], [-signW / 2 - 0.04, signY + signH / 2 + 0.05, Z1], [-signW / 2 - 0.12, signY, Z1]], 0.045, iron, true);
    if (a.sign !== 'missing') {
      const text = a.sign === 'metropolitain' ? 'METROPOLITAIN' : a.sign === 'metro' ? 'METRO' : STATION_TEXT[a.station];
      const [paper, ink] = a.sign === 'metropolitain' ? ['#ecd98f', '#1f4f2c'] : a.sign === 'metro' ? ['#b3231f', '#f6efe0'] : ['#1c3a2c', '#ecdfae'];
      const board = paint(1024, 256, (g, w, h) => {
        g.fillStyle = paper; g.fillRect(0, 0, w, h);
        g.strokeStyle = ink; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
        g.fillStyle = ink; g.textBaseline = 'middle'; g.textAlign = 'center';
        const size = Math.min(170, (w - 90) / text.length * 1.45);
        // Letters sway in height like hand-drawn Guimard capitals.
        const step = (w - 110) / text.length;
        [...text].forEach((letter, index) => {
          const sway = a.sign === 'metropolitain' ? Math.sin(index * 1.7) * 0.12 : 0;
          g.font = `bold ${Math.round(size * (1 + sway))}px Georgia, 'Times New Roman', serif`;
          g.fillText(letter, 55 + step * (index + 0.5), h / 2 + 6 + sway * 30, step * 1.05);
        });
        if (mood.wear > 0.45) {
          g.fillStyle = `rgba(110,70,40,${(mood.wear - 0.45) * 0.9})`;
          for (let i = 0; i < 26; i++) g.fillRect(random() * w, random() * h, 6 + random() * 50, 3 + random() * 9);
        }
      });
      const plate = s.mesh(new THREE.PlaneGeometry(signW, signH), new THREE.MeshStandardMaterial({ map: board, roughness: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: board, emissiveIntensity: a.lit ? 0.12 : 0.03 }), [0, signY, Z1]);
      plate.castShadow = true;
    } else {
      s.rod([-0.9, signY + 0.3, Z1], [-0.5, signY - 0.28, Z1], 0.012, iron);
      s.rod([0.7, signY + 0.3, Z1], [0.75, signY - 0.1, Z1], 0.012, iron);
    }

    // Gate leaves.
    const leaf = (side: number, closed: boolean) => {
      const group = new THREE.Group();
      const width = W - 0.12;
      for (let i = 0; i <= 6; i++) {
        const bar = s.rod([side * -1 * (i / 6) * width, 0.05, 0], [side * -1 * (i / 6) * width, 1.15 + (i % 2) * 0.08, 0], 0.018, iron);
        group.add(bar);
      }
      for (const y of [0.15, 1.0]) group.add(s.rod([0, y, 0], [side * -1 * width, y, 0], 0.02, iron));
      group.add(s.tube([[0, 0.2, 0], [side * -0.5 * width, 0.75, 0], [side * -1 * width, 0.2, 0]], 0.014, accent));
      group.position.set(side * (W - 0.1), 0, Z1 - 0.05);
      group.rotation.y = closed ? 0 : side * (Math.PI / 2 - 0.12 - random() * 0.15);
      s.root.add(group);
    };
    const shut = a.gate === 'chained' || a.gate === 'barred';
    leaf(-1, shut || a.gate === 'half');
    leaf(1, shut);
    if (a.gate === 'chained') {
      const steel = s.material('#8d9296', { metalness: 0.8, roughness: 0.35 });
      s.tube([[-0.55, 1.0, Z1], [-0.3, 0.72, Z1 + 0.05], [0, 0.6, Z1 + 0.06], [0.3, 0.72, Z1 + 0.05], [0.55, 1.0, Z1]], 0.022, steel);
      s.tube([[-0.5, 0.7, Z1 + 0.03], [0, 0.95, Z1 + 0.07], [0.5, 0.7, Z1 + 0.03]], 0.02, steel);
      s.box([0.13, 0.11, 0.05], [0, 0.5, Z1 + 0.07], s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }));
      s.ring(0.045, 0.012, [0, 0.58, Z1 + 0.07], steel);
    }
    if (a.gate === 'barred') {
      s.label('FERME', 1.1, 0.34, [0, 0.72, Z1 + 0.03], '#f4efe2', '#a3241f').rotation.z = (random() - 0.5) * 0.14;
      s.rod([-0.4, 0.88, Z1 + 0.02], [-0.3, 1.02, Z1 - 0.03], 0.006, iron);
      s.rod([0.4, 0.88, Z1 + 0.02], [0.3, 1.02, Z1 - 0.03], 0.006, iron);
    }

    // A dragonfly-wing canopy.
    if (a.canopy) {
      const pane = new THREE.MeshStandardMaterial({ color: '#dfe9d8', transparent: true, opacity: 0.38, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const apexZ = Z0 + 0.1;
      for (const sx of [-1, 1]) {
        s.tube([[sx * W, 1.3, Z0], [sx * (W + 0.05), 2.3, Z0], [sx * (W - 0.1), 2.75, Z0 + 0.2]], 0.055, iron);
        s.rod([sx * (W + 0.25), 3.55, Z1 - 0.1], [sx * (W - 0.1), 2.75, Z0 + 0.2], 0.04, iron);
        const shape = new THREE.BufferGeometry();
        shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.9, apexZ, sx * (W + 0.25), 3.55, Z1 - 0.1, sx * (W - 0.1), 2.75, Z0 + 0.2, 0, 2.9, apexZ, 0, 3.25, Z1 - 0.3, sx * (W + 0.25), 3.55, Z1 - 0.1], 3));
        shape.computeVertexNormals();
        const wing = s.mesh(shape, pane);
        wing.castShadow = false;
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          s.rod([0, mix(2.9, 3.25, t), mix(apexZ, Z1 - 0.3, t)], [sx * mix(W - 0.1, W + 0.25, t), mix(2.75, 3.55, t), mix(Z0 + 0.2, Z1 - 0.1, t)], 0.018, iron);
        }
      }
      s.rod([0, 2.9, apexZ], [0, 3.25, Z1 - 0.3], 0.045, iron);
      s.rod([0, 3.25, Z1 - 0.3], [0, signY + signH / 2 + 0.16, Z1], 0.03, iron);
    }

    // Something left behind.
    if (a.left === 'umbrella') {
      const cloth = s.material('#17181c', { roughness: 0.7 });
      s.rod([W + 0.38, 0.02, 1.3], [W + 0.14, 1.02, 1.2], 0.035, cloth, 0.012);
      s.ring(0.05, 0.012, [W + 0.12, 1.07, 1.2], s.material('#7a4a22'), Math.PI * 1.2).rotation.y = 0.4;
    } else if (a.left === 'bouquet') {
      const group = new THREE.Group();
      const wrap = s.cylinder(0.14, 0.03, 0.42, [0, 0, 0], s.material('#e9dfc8'), 12);
      group.add(wrap);
      const petals = ['#c8283c', '#e8a8b4', '#f4e9d2', '#d4476a'];
      for (let i = 0; i < 9; i++) group.add(s.ball([0.05, 0.05, 0.05], [(random() - 0.5) * 0.2, 0.22 + random() * 0.06, (random() - 0.5) * 0.2], s.material(petals[Math.floor(random() * petals.length)]), 8));
      group.rotation.z = Math.PI / 2 - 0.15;
      group.rotation.y = random() * 2;
      group.position.set(-0.3 + random() * 0.7, 0.1, Z1 + 0.55);
      s.root.add(group);
    } else if (a.left === 'suitcase') {
      const leather = s.material('#7b4a26', { roughness: 0.6 });
      const cx = -W - 0.5;
      s.box([0.62, 0.42, 0.2], [cx, 0.21, Z1 + 0.1], leather).rotation.y = 0.3;
      s.ring(0.07, 0.014, [cx, 0.44, Z1 + 0.1], s.material('#3a2414'), Math.PI).rotation.y = 0.3;
      for (const dx of [-0.2, 0.2]) s.box([0.04, 0.44, 0.21], [cx + dx * Math.cos(0.3), 0.21, Z1 + 0.1 - dx * Math.sin(0.3)], s.material('#3a2414')).rotation.y = 0.3;
    } else if (a.left === 'newspapers') {
      const paper = s.material('#d9d3c0');
      const cx = W + 0.55;
      for (let i = 0; i < 7; i++) s.box([0.42, 0.035, 0.3], [cx + (random() - 0.5) * 0.03, 0.02 + i * 0.036, Z1 + 0.2 + (random() - 0.5) * 0.03], paper).rotation.y = (random() - 0.5) * 0.12;
      s.box([0.02, 0.27, 0.31], [cx, 0.135, Z1 + 0.2], s.material('#8a6a3a'));
    }

    if (a.map) {
      const mx = -W - 0.75, mz = 0.9;
      for (const dx of [-0.42, 0.42]) s.lathe([[0.05, 0], [0.03, 0.2], [0.028, 2.2], [0.05, 2.26], [0, 2.34]], iron, [mx + dx, 0, mz]);
      const chart = paint(256, 320, (g, w, h) => {
        g.fillStyle = '#efe8d2'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#1f4a34'; g.fillRect(0, 0, w, 44);
        g.fillStyle = '#efe8d2'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.fillText('PLAN', w / 2, 31);
        g.strokeStyle = '#7fb2d6'; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 220); g.bezierCurveTo(80, 120, 170, 260, w, 150); g.stroke();
        const lines = ['#d8302a', '#2a62b8', '#e8a21c', '#2f8c4a', '#8a3c9c', '#c56a1e'];
        g.lineWidth = 5;
        for (const colour of lines) {
          g.strokeStyle = colour; g.beginPath();
          g.moveTo(20 + random() * 60, 70 + random() * 220);
          g.lineTo(90 + random() * 80, 80 + random() * 200);
          g.lineTo(180 + random() * 60, 70 + random() * 220);
          g.stroke();
        }
      });
      s.box([0.9, 1.12, 0.06], [mx, 1.55, mz], iron);
      s.mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: chart, roughness: 0.6 }), [mx, 1.55, mz + 0.032]);
    }

    // Fallen plane-tree leaves gather with neglect.
    const leaves = Math.round(mood.wear * mood.wear * 60 + mood.density * 8);
    if (leaves > 0) {
      const tones = ['#b0832e', '#8b5a24', '#c9a13c', '#6f6a2c'];
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.08, 5), s.material('#ffffff'), Array.from({ length: leaves }, () => {
        const outside = random() < 0.7;
        return { at: [(random() - 0.5) * (outside ? 5 : 2.4), 0.012, outside ? Z1 + 0.2 + random() * 1.1 : mix(Z0, Z1, random())] as [number, number, number], size: 0.05 + random() * 0.05, color: tones[Math.floor(random() * tones.length)] };
      })).castShadow = false;
    }

    if(a.curbDetail==='grooves')for(const side of[-1,1])for(const y of[.06,.12,.18])s.box([.008,.012,Z1-Z0],[side*(W+.154),y,0],s.material('#8a867c'));
    else if(a.curbDetail==='caps')for(const side of[-1,1])for(let i=0;i<sidePanels;i++)s.box([.38,.035,.32],[side*W,.2375,mix(Z0,Z1,i/sidePanels)],stone);
    else if(a.curbDetail==='brick')for(const side of[-1,1])for(let i=0;i<16;i++)s.box([.31,.07,.284],[side*W,.035,Z0+.15+i*.3],s.material(i%3?'#a1755e':'#8e6453'));
    const crestY=signY+signH/2+.16;
    if(a.signCrest==='bud'){s.rod([0,crestY,Z1],[0,crestY+.22,Z1],.025,iron);s.ball([.11,.16,.065],[0,crestY+.31,Z1],accent,16);}
    else if(a.signCrest==='leaves')for(const side of[-1,1])s.tube([[0,crestY,Z1],[side*.13,crestY+.21,Z1],[side*.37,crestY+.27,Z1],[side*.27,crestY+.13,Z1],[0,crestY,Z1]],.018,accent);
    else if(a.signCrest==='rosette'){s.rod([0,crestY,Z1],[0,crestY+.19,Z1],.018,iron);for(let i=0;i<7;i++){const t=i*Math.PI*2/7;s.ball([.045,.045,.025],[Math.cos(t)*.09,crestY+.22+Math.sin(t)*.09,Z1],accent,10);}}
    if(a.lampCage!=='bare')for(const side of[-1,1]) {
      const x=side*(W-.76),y=3.69;
      if(a.lampCage==='band')s.ring(.202,.012,[x,y,Z1],s.material('#b79a56',{metalness:.6})).rotation.x=Math.PI/2;
      else for(let i=0;i<(a.lampCage==='ribs'?4:3);i++){const t=i*Math.PI*2/(a.lampCage==='ribs'?4:3),dx=Math.cos(t),dz=Math.sin(t);s.tube([[x,y-.3,Z1],[x+dx*.2,y-.14,Z1+dz*.2],[x+dx*.2,y+.1,Z1+dz*.2],[x,y+.3,Z1]],a.lampCage==='ribs'?.009:.025,iron);}
    }
    if(a.entryPaving!=='bare') {
      const mat=s.material('#bbb5a7');s.box([4.5,.04,1.15],[0,-.027,Z1+.65],mat);
      const count=a.entryPaving==='stone'?6:a.entryPaving==='mosaic'?24:16,rows=a.entryPaving==='stone'?2:5;
      for(let x=0;x<count;x++)for(let z=0;z<rows;z++){const colour=a.entryPaving==='mosaic'?((x+z)%3?'#d9cfb7':'#626864'):a.entryPaving==='cobbles'?(x%3?'#999b93':'#b4b3a7'):'#d2cabc';s.box([4.5/count-.012,.006,1.15/rows-.012],[-2.25+(x+.5)*4.5/count,-.003,Z1+.075+(z+.5)*1.15/rows],s.material(colour));}
    }

    const flicker = mix(0.02, 0.22, mood.energy);
    const phase = random() * 10;
    return s.finish({
      footprint: 3,
      update: (_dt, time) => {
        if (a.lit) glass.emissiveIntensity = glow * (1 + Math.sin(time * 7 + phase) * Math.sin(time * 2.3) * flicker);
      },
    });
  },
});

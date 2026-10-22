import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const WORDS = {
  abc: 'A B C running on down the alphabet: the lesson done properly.',
  home: 'HOME, spelled carefully.',
  love: 'LOVE, a message left for someone.',
  play: 'PLAY, an invitation.',
  help: 'HELP, funny or not funny at all.',
  mine: 'MINE, a territorial claim.',
  oops: 'OOPS, the builder knows what is coming.',
  baby: 'BABY, for a new arrival.',
  numbers: '1 2 3 counting down the tower.',
  jumble: 'No word at all, just whatever letters came to hand.',
} as const;

const PALETTES = {
  primary: { wood: '#e3c28d', paints: ['#cf3a2e', '#2b62b4', '#2f8f4e', '#e2a51f'], style: 'frame' },
  pastel: { wood: '#ead9b8', paints: ['#f2a7b5', '#9fc9e8', '#b6dfb0', '#f6dd94', '#cdb4e6'], style: 'solid' },
  natural: { wood: '#dcbd8a', paints: ['#5a3a22'], style: 'frame' },
  circus: { wood: '#e8cf9d', paints: ['#d2332c', '#16365c', '#e9b92b', '#1f7a6c'], style: 'solid' },
} as const;

export default defineThing({
  questions: {
    state: choice('What state is the tower in right now?', {
      standing: 'Standing straight and proud, just finished.',
      leaning: 'Leaning badly, each block further out than the last, one breath from going.',
      toppling: 'Caught in the very act of falling: the top half tipping off into the air.',
      fallen: 'Already down: a stump of one block and a fan of blocks spilled across the floor.',
    }),
    word: choice('What do the letters spell, reading down from the top?', WORDS),
    height: score('How high did the builder dare to go?', ['Three blocks', 'Five or six', 'Nine blocks, taller than is wise']),
    stacking: score('How carefully were the blocks stacked?', ['Squared up edge to edge', 'A little off', 'Every block twisted and overhanging']),
    palette: choice('How are the blocks painted?', {
      primary: 'Bare wood with a coloured border and letter in red, blue, green and yellow: the classic.',
      pastel: 'Soft nursery pastels all over, with white letters.',
      natural: 'Plain unpainted wood with dark burned-in letters, handmade and serious.',
      circus: 'Glossy saturated enamel, loud as a fairground, with cream letters.',
    }),
    topper: choice('What is balanced on the very top?', {
      none: 'Nothing: the last letter block is the top.',
      roof: 'A red triangular roof block, so it is a house or a steeple.',
      arch: 'A wide arch block, overhanging both sides like a bridge.',
      pillar: 'A round column with a ball on it, a finial.',
      peg: 'A little wooden peg person standing at the summit.',
      flag: 'A stick with a paper flag: the peak has been claimed.',
    }),
    base: choice('What is it built on?', {
      floor: 'Straight on the floor.',
      book: 'On a closed picture book, for a level start.',
      wagon: 'On a little wooden pull-along wagon with a string, which is asking for trouble.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const S = 0.05;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const palette = PALETTES[a.palette];
    const dull = (hex: string) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s * mix(0.55, 1, mood.cheer), hsl.l * mix(0.92, 1, mood.cheer));
      return `#${c.getHexString()}`;
    };
    const paints = palette.paints.map(dull);

    // The letters, listed from the top block downward.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const word = a.word === 'abc' ? 'ABC' : a.word === 'numbers' ? '123' : a.word === 'jumble' ? '' : a.word.toUpperCase();
    const count = Math.max(word.length, Math.round(mix(3, 9, a.height)));
    const fromTop: string[] = [];
    for (let i = 0; i < count; i++) {
      if (a.word === 'abc') fromTop.push(alphabet[i]);
      else if (a.word === 'numbers') fromTop.push(String(i + 1));
      else fromTop.push(i < word.length ? word[i] : alphabet[Math.floor(random() * 26)]);
    }

    const cube = new RoundedBoxGeometry(S, S, S, 2, S * 0.07);
    const paintOffset = Math.floor(random() * paints.length);
    const face = (letter: string, index: number) => {
      const paint = paints[(index + paintOffset) % paints.length];
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const solid = palette.style === 'solid';
      g.fillStyle = solid ? paint : palette.wood;
      g.fillRect(0, 0, 128, 128);
      if (!solid) {
        g.strokeStyle = 'rgba(120,80,40,0.16)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) {
          const y = random() * 128;
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(40, y + jit(8), 90, y + jit(8), 128, y + jit(5));
          g.stroke();
        }
      }
      const ink = solid ? '#fbf3dc' : paint;
      g.strokeStyle = ink;
      g.lineWidth = solid ? 5 : 10;
      g.strokeRect(13, 13, 102, 102);
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 82px Georgia, serif';
      if (solid) { g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(40,30,30,0.42)'; g.strokeText(letter, 64, 70); }
      g.fillText(letter, 64, 70);
      // Chipped paint and grime follow the mood's wear.
      const chips = Math.round(mood.wear * 34);
      for (let i = 0; i < chips; i++) {
        const edge = random() < 0.6;
        const x = edge ? (random() < 0.5 ? random() * 20 : 108 + random() * 20) : random() * 128;
        const y = edge ? random() * 128 : random() < 0.5 ? random() * 20 : 108 + random() * 20;
        g.fillStyle = random() < 0.5 ? palette.wood : '#b9976a';
        g.beginPath();
        g.ellipse(random() < 0.5 ? x : y, random() < 0.5 ? y : x, 3 + random() * 9, 2 + random() * 6, random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = `rgba(70,50,30,${mood.wear * 0.22})`;
      g.fillRect(0, 0, 128, 128);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: a.palette === 'circus' ? 0.32 : mix(0.55, 0.9, mood.wear) });
    };
    const shadowed = <T extends THREE.Object3D>(node: T) => {
      node.traverse((child) => { child.castShadow = child.receiveShadow = true; });
      return node;
    };
    const letterBlock = (letter: string, index: number) => shadowed(new THREE.Mesh(cube, face(letter, index)));
    const plain = (hex: string) => s.material(dull(hex), { roughness: a.palette === 'circus' ? 0.35 : 0.65 });

    // Every topper lives in one block-sized cell, standing on the cell floor.
    const toppers: Record<Exclude<typeof a.topper, 'none'>, () => { node: THREE.Object3D; lying: number }> = {
      roof: () => {
        const shape = new THREE.Shape([new THREE.Vector2(-S * 0.55, 0), new THREE.Vector2(S * 0.55, 0), new THREE.Vector2(0, S * 0.75)]);
        const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: S, bevelEnabled: false }), plain('#c9362c'));
        mesh.position.set(0, -S / 2, -S / 2);
        return { node: new THREE.Group().add(mesh), lying: S * 0.5 };
      },
      arch: () => {
        const shape = new THREE.Shape();
        shape.moveTo(-S, 0); shape.lineTo(-S * 0.55, 0);
        shape.absarc(0, 0, S * 0.55, Math.PI, 0, true);
        shape.lineTo(S, 0); shape.lineTo(S, S * 0.9); shape.lineTo(-S, S * 0.9); shape.closePath();
        const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: S, bevelEnabled: false, curveSegments: 16 }), plain('#2b62b4'));
        mesh.position.set(0, -S / 2, -S / 2);
        return { node: new THREE.Group().add(mesh), lying: S * 0.5 };
      },
      pillar: () => {
        const group = new THREE.Group();
        const column = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.36, S * 0.36, S * 1.2, 20), plain('#e2a51f'));
        column.position.y = S * 0.1;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(S * 0.4, 20, 14), plain('#cf3a2e'));
        ball.position.y = S * 1.05;
        return { node: group.add(column, ball), lying: S * 0.38 };
      },
      peg: () => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.26, S * 0.36, S * 0.95, 18), plain('#2f8f4e'));
        body.position.y = -S * 0.025;
        const head = new THREE.Mesh(new THREE.SphereGeometry(S * 0.3, 18, 12), s.material('#e9c9a0'));
        head.position.y = S * 0.68;
        return { node: group.add(body, head), lying: S * 0.34 };
      },
      flag: () => {
        const group = new THREE.Group();
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.045, S * 0.045, S * 2.2, 8), s.material('#c9a877'));
        stick.position.y = S * 0.6;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.3, S * 0.34, S * 0.22, 16), plain('#2b62b4'));
        foot.position.y = -S * 0.39;
        const pennant = new THREE.Mesh(
          new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(S * 1.1, S * 0.3), new THREE.Vector2(0, S * 0.6)]), { depth: 0.0015, bevelEnabled: false }),
          plain(mood.cheer > 0.4 ? '#d2332c' : '#f3efe2'),
        );
        pennant.position.set(S * 0.04, S * 1.08, 0);
        return { node: group.add(stick, foot, pennant), lying: S * 0.33 };
      },
    };

    // What it stands on.
    let baseY = 0;
    let baseHalf = S * 0.5;
    if (a.base === 'book') {
      const cover = plain(['#2e5d8a', '#a23b33', '#3b7a52', '#d9a23a'][Math.floor(random() * 4)]);
      const turn = jit(0.4);
      const book = new THREE.Group();
      const boards = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.024, 0.15), cover);
      boards.position.y = 0.012;
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.192, 0.017, 0.143), s.material('#f3ecd8'));
      pages.position.set(0.005, 0.012, 0);
      const title = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.001, 0.03), s.material('#f6e7b6'));
      title.position.set(0, 0.0245, -0.035);
      book.add(boards, pages, title);
      book.rotation.y = turn;
      s.root.add(shadowed(book));
      baseY = 0.0245;
      baseHalf = 0.12;
    } else if (a.base === 'wagon') {
      const bed = plain('#c9362c');
      const wood = s.material('#d9b983');
      s.box([0.2, 0.012, 0.1], [0, 0.036, 0], wood);
      for (const z of [-1, 1]) s.box([0.2, 0.014, 0.008], [0, 0.049, z * 0.046], bed);
      for (const x of [-1, 1]) s.box([0.008, 0.014, 0.1], [x * 0.096, 0.049, 0], bed);
      for (const x of [-0.065, 0.065]) for (const z of [-1, 1]) {
        const wheel = s.cylinder(0.024, 0.024, 0.012, [x, 0.024, z * 0.058], plain('#16365c'), 20);
        wheel.rotation.x = Math.PI / 2;
        const hub = s.cylinder(0.007, 0.007, 0.016, [x, 0.024, z * 0.058], s.material('#e9b92b'), 10);
        hub.rotation.x = Math.PI / 2;
      }
      const string: [number, number, number][] = [[-0.1, 0.04, 0], [-0.14, 0.012, 0.01], [-0.19, 0.004, 0.05 + jit(0.02)], [-0.22, 0.004, 0.01 + jit(0.03)], [-0.26, 0.004, 0.04 + jit(0.03)]];
      s.tube(string, 0.0022, s.material('#efe6d0'));
      s.ball([0.011, 0.011, 0.011], [string[4][0], 0.011, string[4][2]], plain('#e9b92b'), 14);
      baseY = 0.042;
      baseHalf = 0.11;
    }

    const stack = new THREE.Group();
    stack.position.y = baseY;
    s.root.add(stack);
    const sloppy = mix(0.03, 0.75, a.stacking);
    const pieces: { node: THREE.Object3D; lying: number }[] = fromTop.slice().reverse().map((letter, index) => ({ node: letterBlock(letter, index), lying: S / 2 }));
    if (a.topper !== 'none') {
      const top = toppers[a.topper]();
      shadowed(top.node);
      pieces.push(top);
    }

    const state = a.state;
    const upright = (node: THREE.Object3D, index: number, x: number, z: number) => {
      node.position.set(x + jit(S * 0.12 * sloppy), (index + 0.5) * S, z + jit(S * 0.12 * sloppy));
      node.rotation.y = jit(sloppy * 0.6);
      stack.add(node);
    };

    let lean = 0;
    if (state === 'standing') {
      pieces.forEach((piece, index) => upright(piece.node, index, 0, 0));
    } else if (state === 'leaning') {
      const reach = S * mix(0.75, 1.15, random());
      lean = -mix(0.035, 0.07, random());
      pieces.forEach((piece, index) => upright(piece.node, index, reach * (index / Math.max(pieces.length - 1, 1)) ** 1.5, 0));
      stack.rotation.z = lean;
    } else if (state === 'toppling') {
      const kept = Math.max(1, Math.floor(pieces.length * 0.38));
      const tip = mix(0.5, 0.85, random());
      pieces.forEach((piece, index) => {
        if (index < kept) return upright(piece.node, index, 0, 0);
        const j = index - kept;
        const angle = Math.min(tip * (1 + j * 0.09), 1.3);
        const along = (j + 0.5) * S + j * j * S * 0.07;
        piece.node.position.set(S * 0.5 + Math.sin(angle) * along + Math.cos(angle) * S * 0.2, Math.max(kept * S + Math.cos(angle) * along - Math.sin(angle) * S * 0.2, S * 0.75), jit(S * 0.25) + j * S * 0.06);
        piece.node.rotation.set(jit(0.25) * j * 0.4, jit(0.5), -angle * (1 + j * 0.1));
        stack.add(piece.node);
      });
    } else {
      const kept = random() < 0.35 && pieces.length > 4 ? 2 : 1;
      const placed: [number, number][] = [];
      const heading = jit(0.35);
      pieces.forEach((piece, index) => {
        if (index < kept) return upright(piece.node, index, 0, 0);
        const j = index - kept;
        let x = 0, z = 0, gap = S * 1.45;
        for (let attempt = 0; attempt < 60; attempt++) {
          const distance = baseHalf + S * (0.9 + j * 0.62 + random() * 0.9);
          const angle = heading + jit(0.75);
          x = Math.cos(angle) * distance;
          z = Math.sin(angle) * distance * 0.9 + S * 0.3;
          if (placed.every(([px, pz]) => Math.hypot(px - x, pz - z) > gap)) break;
          gap *= 0.985;
        }
        placed.push([x, z]);
        const isTopper = a.topper !== 'none' && index === pieces.length - 1;
        // Fallen pieces lie on the floor itself, whatever the tower was built on.
        piece.node.position.set(x, piece.lying - baseY, z);
        if (isTopper) piece.node.rotation.set(0, random() * Math.PI * 2, Math.PI / 2);
        else piece.node.rotation.set(Math.floor(random() * 4) * Math.PI / 2, random() * Math.PI * 2, Math.floor(random() * 4) * Math.PI / 2, 'YXZ');
        stack.add(piece.node);
      });
    }

    // Spare blocks left around the site: more of them in a denser scene.
    const spares = Math.floor(mix(0, 6.5, mood.density) + random() * 0.8);
    const sites: [number, number][] = [];
    for (let i = 0; i < spares; i++) {
      let x = 0, z = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const angle = mix(1.5, Math.PI * 2 - 1.2, random());
        const distance = baseHalf + S * mix(1.1, 3.2, random());
        x = Math.cos(angle) * distance;
        z = -Math.sin(angle) * distance;
        if (sites.every(([px, pz]) => Math.hypot(px - x, pz - z) > S * 1.5)) break;
      }
      sites.push([x, z]);
      const kind = random();
      if (kind < 0.5) {
        const block = letterBlock(alphabet[Math.floor(random() * 26)], i + 2);
        block.position.set(x, S / 2, z);
        block.rotation.y = random() * Math.PI;
        s.root.add(block);
      } else if (kind < 0.78) {
        const log = s.cylinder(S * 0.36, S * 0.36, S * 1.3, [x, S * 0.36, z], plain(palette.paints[i % palette.paints.length]), 18);
        log.rotation.set(Math.PI / 2, 0, random() * Math.PI);
      } else {
        const roof = toppers.roof().node;
        roof.position.set(x, S / 2, z);
        roof.rotation.y = random() * Math.PI;
        s.root.add(shadowed(roof));
      }
    }

    const sway = state === 'leaning' ? 1 : state === 'standing' ? 0.3 : 0;
    const amplitude = mix(0.002, 0.022, mood.energy) * sway;
    const speed = mix(1.2, 4.5, mood.energy);
    return s.finish({
      update: sway > 0 ? (_dt, time) => { stack.rotation.z = lean + Math.sin(time * speed) * amplitude; } : undefined,
    });
  },
});

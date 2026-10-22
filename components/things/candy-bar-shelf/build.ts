import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

interface Design { name: string; bg: string; ink: string }
const KINDS = {
  chocolate: 'Chocolate bars shingled in open cartons: browns, reds, golds and one loud blue.',
  gummies: 'Sour gummies in neon peg bags hanging from hooks on a pegboard.',
  gum: 'Gum and mints: tiny pastel packs in tight rows and little stacked tins.',
  penny: 'Retro penny candy: open bins heaped with loose sweets and jars of lollipops.',
} as const;
const DESIGNS: Record<Exclude<keyof typeof KINDS, 'penny'>, Design[]> = {
  chocolate: [
    { name: 'NUTTO', bg: '#6b3a1f', ink: '#ffd21f' }, { name: 'KARAMEL', bg: '#c8102e', ink: '#ffffff' },
    { name: 'MOOBAR', bg: '#f4f1e6', ink: '#1c3f9c' }, { name: 'CRISPO', bg: '#f28c1e', ink: '#3a1a08' },
    { name: 'BIG FUDGE', bg: '#2a1a14', ink: '#f2b632' }, { name: 'TWIGS', bg: '#1f4fa8', ink: '#ffe14a' },
    { name: 'GOLDIE', bg: '#f6d21f', ink: '#b3121c' }, { name: 'MINT-O', bg: '#1f8a4a', ink: '#eafff0' },
  ],
  gummies: [
    { name: 'SOUR WORMZ', bg: '#ff3fa4', ink: '#fff200' }, { name: 'ZAPS', bg: '#b6f01e', ink: '#7a12c8' },
    { name: 'FIZZ BELTS', bg: '#1fd0f0', ink: '#ff2a6a' }, { name: 'GUMMI BEARS', bg: '#ff8a1f', ink: '#ffffff' },
    { name: 'PUCKERS', bg: '#a04cf0', ink: '#b6f01e' }, { name: 'COLA BOTTLES', bg: '#ffe81f', ink: '#7a2a0c' },
  ],
  gum: [
    { name: 'MINTZ', bg: '#49c7b0', ink: '#ffffff' }, { name: 'BUBBLO', bg: '#f47ab0', ink: '#ffffff' },
    { name: 'ICE 9', bg: '#3aa0e8', ink: '#eaffff' }, { name: 'CHICLE', bg: '#f4f4f4', ink: '#d3201c' },
    { name: 'SPEARO', bg: '#8ed14a', ink: '#12451c' }, { name: 'CINNABLAST', bg: '#c8102e', ink: '#ffd21f' },
    { name: 'GRAPE POP', bg: '#6a4fc8', ink: '#ffe6ff' },
  ],
};
const SWEETS = [['#e8232e', '#ffffff'], ['#ffd21f', '#ffb000'], ['#ff7ab0', '#ff4f90'], ['#1c1a1c', '#3a2a2a'], ['#6fd14a', '#2f9e3a'], ['#ff8a1f', '#ffc04a'], ['#7ad0ff', '#ffffff'], ['#a04cf0', '#ffe81f']];
const TAGS = {
  twofor: ['2 FOR', '$3'], isnew: ['NEW', 'TRY ME'], sale: ['SALE', '79¢'], manager: ["MANAGER'S", 'SPECIAL'], last: ['LAST', 'CHANCE'], king: ['KING', 'SIZE'],
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    kind: choice('What kind of candy does it sell?', KINDS),
    stock: score('How full are the rows?', ['Nearly sold through', 'Gappy', 'Well stocked', 'Crammed, every facing full']),
    neat: score('How neat is it?', ['Ransacked, things in the wrong boxes', 'Rummaged', 'Tidy', 'Faced up with a ruler by someone who cares']),
    soldout: noul('Is there one conspicuously empty row where the favourite sold out?'),
    raided: noul('Has the child-height bottom shelf been raided, with sweets pulled out onto the floor?'),
    tag: choice('What does the dangling wobbler tag say?', {
      twofor: '2 FOR $3.', isnew: 'NEW, TRY ME.', sale: 'SALE 79¢.', manager: "MANAGER'S SPECIAL.", last: 'LAST CHANCE.', king: 'KING SIZE.',
    }),
    body: choice('What is the shelving unit like?', {
      cream: 'Standard cream-enamel store gondola.',
      red: 'A bright red branded candy fixture.',
      wood: 'Dark varnished wood, an old general store.',
      black: 'Matte black modern shelving with crisp white edges.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.92, H = 1.36, backZ = -0.22;
    const bodyColour = { cream: '#e6dfcd', red: '#c9201c', wood: '#5d3a22', black: '#26282b' }[a.body];
    const body = s.material(bodyColour, { roughness: a.body === 'wood' ? 0.55 : 0.45, metalness: a.body === 'wood' ? 0 : 0.2 });
    const trim = s.material(a.body === 'black' ? '#eeeeee' : a.body === 'wood' ? '#3a2416' : '#9aa0a0', { metalness: 0.4 });
    const fill = mix(0.1, 1, a.stock) * mix(0.85, 1, mood.density);
    const mess = (1 - a.neat) * mix(0.7, 1.2, mood.wear);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // The gondola: kick base, back panel, uprights, fascia.
    s.box([W, 0.14, 0.5], [0, 0.07, 0.03], body);
    const pegs = a.kind === 'gummies';
    const backArt = paint(128, 128, (ctx) => {
      ctx.fillStyle = pegs ? '#d9cdb0' : bodyColour; ctx.fillRect(0, 0, 128, 128);
      if (pegs) { ctx.fillStyle = '#6a5a40'; for (let x = 8; x < 128; x += 16) for (let y = 8; y < 128; y += 16) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); } }
      else { ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < 128; y += 32) ctx.fillRect(0, y, 128, 2); }
    });
    backArt.wrapS = backArt.wrapT = THREE.RepeatWrapping; backArt.repeat.set(4, 5);
    s.box([W, H - 0.14, 0.03], [0, (H + 0.14) / 2, backZ], new THREE.MeshStandardMaterial({ map: backArt, roughness: 0.7 }));
    for (const x of [-1, 1]) s.box([0.035, H, 0.05], [x * (W / 2 + 0.0175), H / 2, backZ + 0.005], trim);
    const fasciaText = { chocolate: 'CHOCOLATE', gummies: 'SOUR!', gum: 'GUM & MINTS', penny: 'PENNY CANDY' }[a.kind];
    const fascia = paint(512, 96, (ctx) => {
      const [bg, ink] = { chocolate: ['#3a1f12', '#f2b632'], gummies: ['#b6f01e', '#ff2a8a'], gum: ['#dff6ee', '#1f8a7a'], penny: ['#f6efdc', '#c8102e'] }[a.kind];
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 96);
      if (a.kind === 'penny') { ctx.fillStyle = '#e8232e'; for (let x = 0; x < 512; x += 48) ctx.fillRect(x, 0, 24, 14), ctx.fillRect(x, 82, 24, 14); }
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${a.kind === 'penny' ? 'bold 58px serif' : 'italic 900 64px sans-serif'}`; ctx.fillText(fasciaText, 256, 50, 480);
    });
    s.mesh(new THREE.BoxGeometry(W + 0.07, 0.16, 0.05), new THREE.MeshStandardMaterial({ map: fascia, roughness: 0.6, emissive: '#ffffff', emissiveMap: fascia, emissiveIntensity: mix(0.05, 0.25, mood.cheer) }), [0, H + 0.08, backZ + 0.02]);

    // Instance lists.
    const designs = a.kind === 'penny' ? [] : DESIGNS[a.kind];
    const wrapped = designs.map(() => [] as THREE.Matrix4[]);
    const trays: { matrix: THREE.Matrix4; colour: string }[] = [];
    const balls: { matrix: THREE.Matrix4; colour: string }[] = [];
    const dummy = new THREE.Object3D();
    const stamp = (frame: THREE.Matrix4, at: [number, number, number], turn: [number, number, number], size: [number, number, number]) => {
      dummy.position.set(...at); dummy.rotation.set(...turn); dummy.scale.set(...size); dummy.updateMatrix();
      return frame.clone().multiply(dummy.matrix);
    };
    const railArt = paint(256, 32, (ctx) => {
      ctx.fillStyle = '#ffd21f'; ctx.fillRect(0, 0, 256, 32);
      ctx.font = 'bold 15px sans-serif'; ctx.textBaseline = 'middle';
      for (let x = 6; x < 256; x += 42) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 5, 34, 22); ctx.fillStyle = '#16181c'; ctx.fillText(`${Math.floor(random() * 2)}.${Math.floor(random() * 9)}9`, x + 3, 17); }
    });
    railArt.wrapS = THREE.RepeatWrapping; railArt.repeat.set(2, 1);
    const rail = new THREE.MeshStandardMaterial({ map: railArt, roughness: 0.5, emissive: '#ffd21f', emissiveIntensity: 0.12 });

    const itemSize: [number, number, number] = a.kind === 'gum' ? [0.075, 0.03, 0.013] : a.kind === 'gummies' ? [0.105, 0.15, 0.012] : [0.118, 0.048, 0.016];
    const shelves = a.kind === 'gummies' ? 1 : 4;
    const frames: { frame: THREE.Matrix4; depth: number; y: number }[] = [];
    for (let i = 0; i < shelves; i++) {
      const depth = 0.44 - i * 0.05, y = 0.16 + i * 0.29, tilt = i === 0 ? 0.05 : 0.2;
      const group = new THREE.Group();
      group.position.set(0, y, backZ + 0.015);
      group.rotation.x = tilt;
      const board = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, depth).translate(0, -0.01, depth / 2), body);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(W, 0.045, 0.008), rail);
      strip.position.set(0, 0.008, depth + 0.004);
      board.castShadow = board.receiveShadow = strip.castShadow = true;
      group.add(board, strip);
      s.root.add(group);
      group.updateMatrix();
      frames.push({ frame: group.matrix.clone(), depth, y });
    }

    const soldRow = a.soldout ? { shelf: Math.min(shelves - 1, 2), column: 1 + Math.floor(random() * 3) } : null;
    const floorFrame = new THREE.Matrix4();
    const strew = (drop: (x: number, z: number) => void, count: number) => {
      for (let i = 0; i < count; i++) drop((random() - 0.5) * W * 0.9, 0.3 + random() ** 1.4 * 0.42);
    };

    if (a.kind === 'penny') {
      const sweet = () => pick(pick(SWEETS));
      frames.forEach(({ frame, depth }, index) => {
        if (index === 3) return;
        const bins = 5;
        for (let column = 0; column < bins; column++) {
          const x = (column - (bins - 1) / 2) * (W - 0.02) / bins, bw = (W - 0.02) / bins - 0.012;
          trays.push({ matrix: stamp(frame, [x, 0.03, depth / 2], [0, 0, 0], [bw, 0.06, depth - 0.03]), colour: a.body === 'wood' ? '#7a5232' : '#c9b48a' });
          const palette = SWEETS[(column + index * 3) % SWEETS.length];
          const empty = soldRow?.shelf === index && soldRow.column === column;
          const level = empty ? 0 : fill * (a.raided && index === 0 ? 0.3 : 1) * mix(0.7, 1.1, random());
          const count = Math.round(level * 46);
          for (let k = 0; k < count; k++) {
            const r = mix(0.011, 0.015, random());
            const spill = mess > 0.5 && random() < (mess - 0.5) * 0.12;
            balls.push({ matrix: stamp(frame, [x + (random() - 0.5) * (bw - 0.03) + (spill ? (random() - 0.5) * 0.2 : 0), 0.062 + random() * 0.03 * level + (1 - (Math.abs(random() - 0.5) * 2)) * 0.02, 0.03 + random() * (depth - 0.07)], [0, 0, 0], [r, r * mix(0.7, 1, random()), r]), colour: spill ? sweet() : pick(palette) });
          }
        }
      });
      // Lollipop jars on the top shelf.
      const { frame, depth } = frames[3];
      const glass = new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
      const stick = s.material('#f4f1e6');
      for (let j = 0; j < 4; j++) {
        const x = (j - 1.5) * 0.21, origin = new THREE.Vector3(x, 0, depth / 2).applyMatrix4(frame);
        const jar = s.lathe([[0.001, 0], [0.065, 0], [0.075, 0.03], [0.075, 0.13], [0.055, 0.16], [0.06, 0.175]], glass, origin.toArray() as [number, number, number]);
        jar.castShadow = false;
        s.cylinder(0.068, 0.068, 0.012, [origin.x, origin.y + 0.006, origin.z], trim, 18);
        const pops = Math.round(mix(1, 9, fill) * mix(0.6, 1, random()));
        const palette = SWEETS[(j * 2 + 1) % SWEETS.length];
        for (let k = 0; k < pops; k++) {
          const lean = new THREE.Vector3((random() - 0.5) * 0.11, 0.2 + random() * 0.07, (random() - 0.5) * 0.11);
          const tip = origin.clone().add(lean);
          s.rod([origin.x + lean.x * 0.2, origin.y + 0.02, origin.z + lean.z * 0.2], tip.toArray() as [number, number, number], 0.003, stick);
          balls.push({ matrix: stamp(floorFrame, tip.toArray() as [number, number, number], [random(), random(), 0], [0.022, 0.022, 0.009]), colour: pick(palette) });
        }
      }
      if (a.raided) strew((x, z) => { const r = 0.013; balls.push({ matrix: stamp(floorFrame, [x, r, z], [0, 0, 0], [r, r, r]), colour: sweet() }); }, 14 + Math.floor(random() * 10));
    } else if (a.kind === 'gummies') {
      // Peg hooks in rows, bags hanging face out.
      const hook = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 });
      const rows = 4, columns = 6;
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const x = (column - (columns - 1) / 2) * 0.145, y = 0.62 + row * 0.2, z0 = backZ + 0.015;
        const length = 0.2;
        s.rod([x, y, z0], [x, y + 0.012, z0 + length], 0.003, hook);
        const design = (row * 2 + column + (mess > 0.6 && random() < 0.3 ? 1 : 0)) % designs.length;
        const empty = soldRow && row === 2 && column === soldRow.column;
        const count = empty ? 0 : Math.round(8 * Math.min(1, Math.max(0, fill + (random() - 0.5) * 0.5)));
        for (let k = 0; k < count; k++) {
          const z = z0 + 0.025 + k * 0.021;
          wrapped[design].push(stamp(floorFrame, [x + (random() - 0.5) * 0.008, y - itemSize[1] / 2 + 0.012, z], [0.04 + random() * 0.05, (random() - 0.5) * mess * 0.5, (random() - 0.5) * (0.04 + mess * 0.25)], itemSize));
        }
      }
      // A base shelf of tubs.
      const { frame, depth } = frames[0];
      for (let column = 0; column < 6; column++) {
        const x = (column - 2.5) * 0.148;
        const count = a.raided ? Math.floor(random() * 2) : Math.round(mix(1, 3, fill));
        for (let k = 0; k < count; k++) {
          const palette = SWEETS[(column + 2) % SWEETS.length];
          const z = depth - 0.09 - k * 0.11, origin = new THREE.Vector3(x, 0, z).applyMatrix4(frame);
          s.cylinder(0.05, 0.045, 0.09, [origin.x, origin.y + 0.045, origin.z], s.material(palette[0], { roughness: 0.4 }), 14);
          s.cylinder(0.052, 0.052, 0.012, [origin.x, origin.y + 0.096, origin.z], s.material(palette[1]), 14);
        }
      }
      if (a.raided) strew((x, z) => wrapped[Math.floor(random() * designs.length)].push(stamp(floorFrame, [x, 0.008, z], [-Math.PI / 2, 0, random() * 6], itemSize)), 4 + Math.floor(random() * 4));
    } else {
      const columns = a.kind === 'gum' ? 9 : 6;
      frames.forEach(({ frame, depth }, index) => {
        for (let column = 0; column < columns; column++) {
          const span = (W - 0.02) / columns, x = (column - (columns - 1) / 2) * span;
          const design = (column * 3 + index * 5) % designs.length;
          const skew = (random() - 0.5) * mess * 0.25;
          trays.push({ matrix: stamp(frame, [x, 0.013, depth / 2 + 0.005], [0, skew, 0], [span - 0.012, 0.026, depth - 0.03]), colour: designs[design].bg });
          const empty = soldRow?.shelf === index && soldRow.column === column;
          const tins = a.kind === 'gum' && index === 3;
          const spacing = tins ? 0.062 : itemSize[2] * 1.55;
          const most = Math.floor((depth - 0.06) / spacing);
          const raid = a.raided && index === 0;
          const count = empty ? 0 : Math.round(most * Math.min(1, Math.max(0, fill * (raid ? 0.35 : 1) + (random() - 0.5) * (0.25 + mess * 0.4))));
          for (let k = 0; k < count; k++) {
            const z = 0.035 + k * spacing;
            if (tins) {
              const stack = 1 + Math.floor(random() * 4);
              for (let t = 0; t < stack; t++) balls.push({ matrix: stamp(frame, [x + (random() - 0.5) * 0.006, 0.035 + t * 0.016, z + 0.02], [0, 0, 0], [0.027, 0.008, 0.027]), colour: t % 2 ? '#e8eaec' : designs[design].bg });
              continue;
            }
            const wrong = mess > 0.45 && random() < (mess - 0.45) * 0.3;
            const flat = mess > 0.3 && random() < (mess - 0.3) * 0.35;
            wrapped[wrong ? Math.floor(random() * designs.length) : design].push(stamp(frame, [x + (random() - 0.5) * 0.008, flat ? 0.05 : 0.026 + itemSize[1] * 0.42, z], flat ? [-1.5, random() * 3, 0] : [-0.62 + (random() - 0.5) * mess * 0.5, skew + (random() - 0.5) * mess * 0.4, 0], itemSize));
          }
        }
      });
      if (a.raided) strew((x, z) => wrapped[Math.floor(random() * designs.length)].push(stamp(floorFrame, [x, itemSize[2] / 2, z], [-Math.PI / 2, 0, random() * 6], itemSize)), 6 + Math.floor(random() * 6));
    }

    // Realise the instances.
    const unit = new THREE.BoxGeometry(1, 1, 1);
    designs.forEach((design, index) => {
      if (!wrapped[index].length) return;
      const tall = a.kind === 'gummies';
      const map = paint(128, tall ? 176 : 48, (ctx) => {
        const h = tall ? 176 : 48;
        ctx.fillStyle = design.bg; ctx.fillRect(0, 0, 128, h);
        ctx.fillStyle = design.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (tall) {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 30); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(64, 12, 6, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(14, 84, 100, 78);
          for (let i = 0; i < 26; i++) { ctx.fillStyle = pick(pick(SWEETS)); ctx.beginPath(); ctx.arc(22 + random() * 84, 92 + random() * 62, 7, 0, 7); ctx.fill(); }
          ctx.fillStyle = design.ink; ctx.font = 'italic 900 26px sans-serif';
          const [first, second] = design.name.split(' ');
          ctx.fillText(first, 64, 48, 118); if (second) ctx.fillText(second, 64, 70, 118);
        } else {
          ctx.fillRect(0, 0, 128, 5); ctx.fillRect(0, 43, 128, 5);
          ctx.font = 'italic 900 30px sans-serif'; ctx.fillText(design.name, 64, 25, 118);
        }
      });
      const mesh = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ map, roughness: 0.68, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.03, 0.14, mood.cheer) }), wrapped[index].length);
      wrapped[index].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });
    const coloured = (geometry: THREE.BufferGeometry, list: { matrix: THREE.Matrix4; colour: string }[], roughness: number) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness }), list.length);
      const tint = new THREE.Color();
      list.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); mesh.setColorAt(i, tint.set(entry.colour)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    coloured(unit, trays.map((tray) => ({ ...tray, colour: `#${new THREE.Color(tray.colour).multiplyScalar(0.62).getHexString()}` })), 0.8);
    coloured(a.kind === 'gum' ? new THREE.CylinderGeometry(1, 1, 2, 12) : new THREE.SphereGeometry(1, 8, 6), balls, 0.35);

    // The wobbler: a springy arm off a price rail with a starburst tag on the end.
    const [first, second] = TAGS[a.tag];
    const tagArt = paint(160, 160, (ctx) => {
      ctx.translate(80, 80);
      ctx.fillStyle = a.tag === 'manager' || a.tag === 'last' ? '#ff5a1f' : '#e8232e';
      ctx.beginPath();
      for (let i = 0; i < 32; i++) { const r = i % 2 ? 62 : 78, t = i * Math.PI / 16; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.fill();
      ctx.fillStyle = '#fff200'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 26px sans-serif'; ctx.fillText(first, 0, -20, 104);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 36px sans-serif'; ctx.fillText(second, 0, 16, 108);
    });
    const from = frames[Math.min(shelves - 1, 2)];
    const root = new THREE.Vector3((random() - 0.5) * 0.5, 0.01, from.depth + 0.008).applyMatrix4(from.frame);
    const wobble = new THREE.Group();
    wobble.position.copy(root);
    s.root.add(wobble);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.13).translate(0, 0, 0.065), new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.55, roughness: 0.1 }));
    const tag = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ map: tagArt, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, emissive: '#ffffff', emissiveMap: tagArt, emissiveIntensity: 0.2 }));
    tag.position.set(0, -0.055, 0.13);
    tag.castShadow = true;
    wobble.add(arm, tag);
    const droop = 0.25 + mood.wear * 0.5;
    wobble.rotation.set(droop, (random() - 0.5) * 0.5, 0);

    const pace = mix(0.4, 3, mood.energy), swing = mix(0.02, 0.14, mood.energy);
    return s.finish({ update: (_dt, time) => { wobble.rotation.x = droop + Math.sin(time * pace) * swing; tag.rotation.z = Math.sin(time * pace * 1.3) * swing; } });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const R = 0.0195;
const H = 0.0034;

const SCHEMES = {
  casino: 'The classic casino set: white, red, blue, green and black with pale stripes.',
  highroller: 'High-roller plaques of the cage: black, purple, gold-yellow and burnt orange.',
  homegame: 'A cheap home-game set in faded pastels: mint, pink, baby blue, cream.',
  oxblood: 'A severe two-tone set: bone white and oxblood red only, like an old private club.',
  neon: 'Loud arcade colours: hot pink, lime, cyan and electric orange.',
} as const;
const PALETTES: Record<keyof typeof SCHEMES, [string, string][]> = {
  casino: [['#ece6d6', '#3b5a9a'], ['#b32a2a', '#f1ead8'], ['#27468f', '#f1ead8'], ['#2f7a48', '#f1ead8'], ['#1d1d20', '#d8b548']],
  highroller: [['#26232a', '#d8b548'], ['#6a3a95', '#f0e4c6'], ['#d9a928', '#2a2420'], ['#c9602a', '#f0e4c6'], ['#8c1f3a', '#d8b548']],
  homegame: [['#f0e8d2', '#d98a9c'], ['#a9d6bd', '#fbf6e8'], ['#e7a5b6', '#fbf6e8'], ['#a6c4e4', '#fbf6e8'], ['#e6cf8c', '#7c6a4a']],
  oxblood: [['#eae2cf', '#6e1c22'], ['#6e1c22', '#eae2cf'], ['#eae2cf', '#2a2422'], ['#6e1c22', '#d8b548'], ['#2a2422', '#eae2cf']],
  neon: [['#ff3f9a', '#fff5d6'], ['#9be22a', '#20242a'], ['#22cfe0', '#20242a'], ['#ff7a1c', '#fff5d6'], ['#20242a', '#ff3f9a']],
};
const VALUES = ['1', '5', '25', '100', '500'];

type ChipDetails={finish:string;inlay:string;edgeStyle:string};
function chipMaterials(base: string, stripe: string, value: string, wear: number, detail: ChipDetails) {
  const grime = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#6d6455'), wear * 0.35).getHexString();
  const b = grime(base), st = grime(stripe);
  const side = document.createElement('canvas');
  side.width = 384; side.height = 8;
  let ctx = side.getContext('2d')!;
  ctx.fillStyle = b; ctx.fillRect(0, 0, 384, 8);
  ctx.fillStyle = st;
  const spots=detail.edgeStyle==='six'?6:detail.edgeStyle==='eight'?8:detail.edgeStyle==='triple'?12:4;
  for(let i=0;i<spots;i++){const x=i*384/spots;ctx.fillRect(x+3,0,detail.edgeStyle==='thin'?5:384/spots*.4,8);if(detail.edgeStyle==='triple'){ctx.fillStyle=b;ctx.fillRect(x+9,0,2,8);ctx.fillStyle=st;}}
  const top = document.createElement('canvas');
  top.width = top.height = 128;
  ctx = top.getContext('2d')!;
  ctx.fillStyle = b; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = st;
  for (let i = 0; i < spots; i++) {
    const a = (i / spots) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.arc(64, 64, 66, a, a + (detail.edgeStyle==='thin'?.09:2.6/spots)); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = b; ctx.beginPath(); ctx.arc(64, 64, 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = st; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(64, 64, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = st; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${value.length > 2 ? 26 : 36}px sans-serif`;
  if(detail.inlay==='value')ctx.fillText(value,64,66);
  if(detail.inlay==='suit'){ctx.font='bold 45px serif';ctx.fillText('♠',64,66);}
  if(detail.inlay==='star'){ctx.beginPath();for(let i=0;i<10;i++){const t=i*Math.PI/5-Math.PI/2,r=i%2?10:23;ctx.lineTo(64+Math.cos(t)*r,64+Math.sin(t)*r);}ctx.closePath();ctx.fill();}
  if(detail.inlay==='ring'){ctx.lineWidth=3;ctx.beginPath();ctx.arc(64,64,21,0,7);ctx.stroke();}
  const make = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: detail.finish==='gloss'?.16:detail.finish==='metal'?.3:detail.finish==='ceramic'?.4:.7+wear*.2, metalness:detail.finish==='metal'?.7:0 });
  };
  const sideMat = make(side), topMat = make(top);
  return [sideMat, topMat, topMat];
}

export default defineThing({
  questions: {
    profile: choice('What shape is each chip?', { round: 'Ordinary round chips.', scalloped: 'Round chips with shallow scalloped edges.', octagon: 'Eight-sided gaming tokens.', square: 'Square gaming plaques.' }),
    thickness: choice('How thick are the chips?', { thin: 'Thin light counters.', usual: 'Standard gaming-chip thickness.', thick: 'Thick heavy chips.', deep: 'Extra-deep chunky tokens.' }),
    finish: choice('What finish do the chips have?', { clay: 'Matte clay-composite surfaces.', gloss: 'Glossy coloured plastic.', ceramic: 'Smooth ceramic surfaces.', metal: 'Metallic enamelled counters.' }),
    inlay: choice('What is on the centre inlay?', { value: 'A printed denomination.', suit: 'A large spade emblem.', star: 'A five-point star.', ring: 'A simple concentric ring.' }),
    edgeStyle: choice('How are the coloured edge spots arranged?', { six: 'Six broad edge spots.', eight: 'Eight evenly spaced spots.', triple: 'Twelve narrow split spots.', thin: 'Four thin contrasting markers.' }),
    marker: choice('What counting aid is nearby?', { tally: 'A small handwritten tally card.', pencil: 'A short yellow counting pencil.', counter: 'A brass numbered counter.', beads: 'A short string of wooden counting beads.' }),
    stake: score('How big is the stake?', ['A loser\'s last three chips', 'A short stack', 'A decent buy-in', 'A healthy pile', 'A fortune in towers']),
    state: choice('What state are the chips in?', {
      tidy: 'Squared-off towers of equal height, counted and recounted by a careful player.',
      uneven: 'Ragged towers of different heights, leaning, colours mixed, stacked in a hurry.',
      toppled: 'A tower has been knocked over and lies shingled across the felt like fallen dominoes.',
      splashed: 'Shoved all in: a loose heap splashed forward, only a couple of stacks still standing.',
      abandoned: 'Scattered flat and far apart, a few on edge, as if the table was bumped when everyone ran.',
    }),
    scheme: choice('What colours are the chips?', SCHEMES),
    layout: choice('How are the standing stacks arranged?', {
      rows: 'Tight ranks, like a dealer\'s rack.',
      cluster: 'An irregular huddle, a private little city.',
      crescent: 'A curved wall, guarding the player\'s cards.',
    }),
    extra: choice('What has been thrown in with the chips?', {
      nothing: 'Nothing, only chips.',
      button: 'A white dealer button.',
      cash: 'A rubber-banded roll of banknotes.',
      keys: 'A set of car keys, the last thing left to bet.',
      ring: 'A gold wedding ring set on top of a stack.',
    }),
    winner: score('Whose chips are these?', ['A loser: almost all low-value chips', 'An even mix', 'A winner: mostly the high-value colours']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const H={thin:.0023,usual:.0034,thick:.0046,deep:.006}[a.thickness];
    const { mood, random } = context;
    const palette = PALETTES[a.scheme];
    const lists: THREE.Matrix4[][] = palette.map(() => []);
    const colourPick = () => {
      const bias = mix(2.6, 0.45, a.winner);
      return Math.min(palette.length - 1, Math.floor(Math.pow(random(), bias) * palette.length));
    };
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const put = (colour: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, order: THREE.EulerOrder = 'YXZ') => {
      q.setFromEuler(e.set(rx, ry, rz, order));
      lists[colour].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one));
    };

    const messy = { tidy: 0, uneven: 1, toppled: 0.6, splashed: 0.8, abandoned: 1 }[a.state];
    const crowd = mix(0.8, 1.25, mood.density);
    let stackCount = Math.max(1, Math.round(mix(1, 13, a.stake) * crowd));
    const tall = Math.max(3, Math.round(mix(3, 20, a.stake)));
    let loose = 0;
    if (a.state === 'splashed') { loose = Math.round(stackCount * tall * 0.6) + 3; stackCount = Math.max(1, Math.round(stackCount * 0.3)); }
    if (a.state === 'abandoned') { loose = Math.round(stackCount * tall * 0.3) + 3; stackCount = Math.max(1, Math.round(stackCount * 0.6)); }
    if (a.state === 'toppled') loose = 2 + Math.round(a.stake * 6);
    if (a.state === 'uneven') loose = Math.round(a.stake * 4 * mood.energy);

    // Where the stacks stand.
    const spots: [number, number][] = [];
    const pitch = R * 2 + 0.003;
    if (a.layout === 'rows') {
      const columns = Math.max(1, Math.ceil(Math.sqrt(stackCount * 1.8)));
      for (let i = 0; i < stackCount; i++) spots.push([(i % columns - (Math.min(columns, stackCount) - 1) / 2) * pitch, -Math.floor(i / columns) * pitch]);
    } else if (a.layout === 'crescent') {
      const arc = 0.15;
      for (let i = 0; i < stackCount; i++) {
        const row = i % 9 === i ? 0 : 1, k = row ? i - 9 : i, n = row ? stackCount - 9 : Math.min(stackCount, 9);
        const radius = arc + row * pitch, angle = (k - (n - 1) / 2) * (pitch / radius);
        spots.push([Math.sin(angle) * radius, -Math.cos(angle) * radius + arc]);
      }
    } else {
      let reach = 0.02;
      while (spots.length < stackCount) {
        const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * reach;
        const x = Math.cos(angle) * d, z = Math.sin(angle) * d * 0.7;
        if (spots.every(([px, pz]) => Math.hypot(px - x, pz - z) > pitch)) spots.push([x, z]); else reach += 0.004;
      }
    }

    // Build the towers; in the toppled state the front ones fall forward.
    let front = -Infinity, tallest: [number, number, number] = [0, 0, 0];
    const order = spots.map((_spot, index) => index).sort((i, j) => spots[j][1] - spots[i][1]);
    const fallen = a.state === 'toppled' ? order.slice(0, Math.max(1, Math.round(stackCount * 0.35))) : [];
    spots.forEach(([x, z], index) => {
      const jitter = messy * 0.004;
      const px = x + (random() - 0.5) * jitter * 2, pz = z + (random() - 0.5) * jitter * 2;
      const count = Math.max(1, Math.round(tall * (messy ? mix(0.3, 1.15, random()) : 1)));
      const colour = a.state === 'tidy' && a.layout === 'rows' ? Math.min(palette.length - 1, Math.floor(mix(index / Math.max(1, stackCount), random(), 0.3) * palette.length * mix(0.5, 1.2, a.winner))) : colourPick();
      const standing = fallen.includes(index) ? Math.floor(random() * 3) : count;
      const drift = messy * mix(0.0002, 0.0011, mood.energy), heading = random() * Math.PI * 2;
      let ox = 0, oz = 0;
      for (let i = 0; i < standing; i++) {
        ox += Math.cos(heading) * drift + (random() - 0.5) * messy * 0.0014;
        oz += Math.sin(heading) * drift + (random() - 0.5) * messy * 0.0014;
        put(random() < messy * 0.25 ? colourPick() : colour, px + ox, H / 2 + i * H, pz + oz, 0, random() * 6.28, 0);
      }
      if (standing * H > tallest[1]) tallest = [px + ox, standing * H, pz + oz];
      front = Math.max(front, pz + R);
      if (standing < count) {
        // Shingled spill: each chip leans on the last.
        const turn = (random() - 0.5) * 1.3, step = 0.0085, lean = Math.asin(H / step) * 1.2;
        const dx = Math.sin(turn), dz = Math.cos(turn);
        for (let i = 0; i < count - standing; i++) {
          const d = R * 1.1 + i * step;
          const flat = i === count - standing - 1;
          put(random() < 0.2 ? colourPick() : colour, px + dx * d + (random() - 0.5) * 0.003, flat ? H / 2 : R * Math.sin(lean) + H / 2, pz + dz * d,
            flat ? 0 : -lean, turn, 0);
          front = Math.max(front, pz + dz * d + R);
        }
      }
    });
    if (!Number.isFinite(front)) front = 0;

    // Loose chips settle on a height map so a heap really piles.
    const cell = 0.006, size = 128, heights = new Float32Array(size * size);
    const spread = a.state === 'abandoned' ? mix(0.09, 0.2, a.stake) : a.state === 'splashed' ? R * Math.sqrt(loose) * 0.62 + 0.02 : mix(0.03, 0.085, Math.sqrt(a.stake));
    const centreZ = a.state === 'abandoned' ? 0.02 : front + spread * 0.8 + 0.01;
    for (let i = 0; i < loose; i++) {
      const angle = random() * Math.PI * 2;
      const d = (a.state === 'toppled' || a.state === 'uneven' ? (random() + random()) / 2 : Math.pow(random(), 0.6)) * spread;
      const x = Math.cos(angle) * d * 1.3, z = centreZ + Math.sin(angle) * d;
      if (a.state === 'abandoned' && spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < pitch)) continue;
      if (a.state !== 'splashed' && random() < 0.12) { put(colourPick(), x, R, z, 0, random() * 3.1, Math.PI / 2); continue; }
      const gx = Math.round(x / cell) + size / 2, gz = Math.round((z - centreZ) / cell) + size / 2, reach = Math.ceil(R / cell);
      let floor = 0;
      for (let u = -reach; u <= reach; u++) for (let v = -reach; v <= reach; v++) {
        if (u * u + v * v > reach * reach) continue;
        const cx = gx + u, cz = gz + v;
        if (cx >= 0 && cz >= 0 && cx < size && cz < size) floor = Math.max(floor, heights[cz * size + cx]);
      }
      for (let u = -reach; u <= reach; u++) for (let v = -reach; v <= reach; v++) {
        if (u * u + v * v > reach * reach) continue;
        const cx = gx + u, cz = gz + v;
        if (cx >= 0 && cz >= 0 && cx < size && cz < size) heights[cz * size + cx] = floor + H;
      }
      const tilt = floor > 0 ? 0.16 : 0;
      put(colourPick(), x, floor + H / 2 + (floor > 0 ? 0.0012 : 0), z, (random() - 0.5) * tilt, random() * 6.28, (random() - 0.5) * tilt);
    }

    const geometry = new THREE.CylinderGeometry(R, R, H, a.profile==='square'?4:a.profile==='octagon'?8:40);
    if(a.profile==='square')geometry.rotateY(Math.PI/4);
    if(a.profile==='scalloped'){const pos=geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);if(r>R*.8){const factor=.96+.04*Math.cos(Math.atan2(z,x)*10);pos.setX(i,x*factor);pos.setZ(i,z*factor);}}geometry.computeVertexNormals();}
    lists.forEach((list, index) => {
      if (!list.length) return;
      const [base, stripe] = palette[index];
      const mesh = new THREE.InstancedMesh(geometry, chipMaterials(base, stripe, VALUES[index], mood.wear, a), list.length);
      list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    // Whatever else was wagered.
    const sideX = Math.max(...spots.map(([x]) => x)) + R + 0.035;
    if (a.extra === 'button') {
      const white = s.material('#f3efe2', { roughness: 0.35 });
      s.cylinder(0.026, 0.026, 0.007, [sideX, 0.0035, 0.005], white, 32);
      const label = s.label('DEALER', 0.04, 0.012, [sideX, 0.0072, 0.005], '#1d1d20', '#f3efe2');
      label.rotation.x = -Math.PI / 2;
      label.rotation.z = (random() - 0.5) * 1.2;
    } else if (a.extra === 'cash') {
      const bill = s.material('#7f9a72', { roughness: 0.9 });
      const roll = s.cylinder(0.017, 0.017, 0.066, [sideX, 0.017, 0.005], bill, 20);
      roll.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.9, 'YXZ');
      roll.rotation.y = (random() - 0.5) * 1.4;
      const inner = s.cylinder(0.0172, 0.0172, 0.02, [0, 0, 0], s.material('#e9e4cf'), 20);
      const band = s.ring(0.0175, 0.0016, [0, 0, 0], s.material('#b3392f'));
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.014;
      roll.add(inner, band);
    } else if (a.extra === 'keys') {
      const steel = s.material('#c9ccd0', { metalness: 0.85, roughness: 0.3 });
      const keys = new THREE.Group();
      keys.position.set(sideX + 0.01, 0, 0.01);
      keys.rotation.y = random() * 6.28;
      s.root.add(keys);
      const hoop = s.ring(0.013, 0.0011, [0, 0.0012, 0], steel);
      hoop.rotation.x = Math.PI / 2;
      keys.add(hoop);
      [-0.5, 0.2, 0.9].forEach((angle, index) => {
        const key = new THREE.Group();
        key.rotation.y = angle;
        key.position.y = 0.0015 + index * 0.0012;
        const bow = s.cylinder(0.009, 0.009, 0.002, [0.02, 0, 0], index === 0 ? s.material('#1c1c1f', { roughness: 0.5 }) : steel, 16);
        const blade = s.box([0.034, 0.0018, 0.006], [0.044, 0, 0], steel);
        key.add(bow, blade);
        keys.add(key);
      });
      const fob = s.box([0.03, 0.006, 0.02], [-0.026, 0.003, 0.004], s.material('#8a2f26', { roughness: 0.6 }));
      keys.add(fob);
    } else if (a.extra === 'ring') {
      const gold = s.material('#e0b445', { metalness: 0.95, roughness: 0.22, emissive: '#5a3c08', emissiveIntensity: 0.35 });
      const band = s.mesh(new THREE.TorusGeometry(0.0095, 0.0016, 10, 40), gold, [tallest[0], tallest[1] + 0.0016, tallest[2]]);
      band.rotation.x = Math.PI / 2;
    }

    const mx=Math.min(...spots.map(([x])=>x))-R-.045,mz=-.045;
    if(a.marker==='tally'){s.box([.055,.001,.07],[mx,.0005,mz],s.material('#eee5cc'));const label=s.label('||||  |||',.046,.029,[mx,.0012,mz],'#35352e','#eee5cc');label.rotation.x=-Math.PI/2;}
    if(a.marker==='pencil'){s.rod([mx-.035,.003,mz],[mx+.032,.003,mz],.003,s.material('#d5a52d'));s.rod([mx+.032,.003,mz],[mx+.042,.003,mz],.003,s.material('#dabd8e'),.0005);}
    if(a.marker==='counter'){s.cylinder(.017,.017,.004,[mx,.002,mz],s.material('#b89847',{metalness:.7,roughness:.35}),24);const label=s.label('20',.021,.015,[mx,.0042,mz],'#453824','#b89847');label.rotation.x=-Math.PI/2;}
    if(a.marker==='beads'){s.rod([mx-.04,.004,mz],[mx+.04,.004,mz],.001,s.material('#b5a47f'));for(let i=0;i<8;i++)s.ball([.0045,.0045,.0045],[mx-.034+i*.009,.0045,mz],s.material(i<4?'#a06634':'#65452b'),8);}
    return s.finish();
  },
});

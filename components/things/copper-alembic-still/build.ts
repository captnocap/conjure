import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function metalTexture(random: () => number, base: string, verdigris: number, soot: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // Hammer marks.
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(255,225,190,0.10)' : 'rgba(40,15,5,0.10)';
    ctx.beginPath();
    ctx.arc(random() * 256, random() * 256, 4 + random() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Verdigris weeping down from the top (v = 1 is the top of a lathe, canvas y = 0).
  for (let i = 0; i < verdigris * 46; i++) {
    const x = random() * 256, len = 30 + random() * 150, w = 4 + random() * 16;
    const gradient = ctx.createLinearGradient(0, 0, 0, len);
    gradient.addColorStop(0, `rgba(96,170,150,${0.35 + random() * 0.4})`);
    gradient.addColorStop(1, 'rgba(96,170,150,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, w, len);
    if (x + w > 256) ctx.fillRect(x - 256, 0, w, len);
  }
  // Soot licking up from the fire.
  if (soot > 0) {
    const gradient = ctx.createLinearGradient(0, 256, 0, 256 - 150 * soot);
    gradient.addColorStop(0, 'rgba(18,14,12,0.9)');
    gradient.addColorStop(1, 'rgba(18,14,12,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

const SPIRITS = {
  clear: 'Water-clear spirit, moonshine or aqua vitae.',
  rose: 'Pale pink rose water, a perfumer\'s run.',
  green: 'Sharp green herbal liquor, wormwood and anise.',
  amber: 'Golden amber essence, honeyed and expensive.',
  tar: 'Black tarry oil, a foul medicinal extract.',
  blue: 'An unnatural glowing blue that nothing natural yields.',
} as const;
const TINT: Record<keyof typeof SPIRITS, string> = { clear: '#dfeef2', rose: '#eba3b6', green: '#7fb83c', amber: '#d99a2b', tar: '#2a1c14', blue: '#3aa0ff' };

export default defineThing({
  questions: {
    head: choice('What kind of head sits on the pot?', {
      onion: 'A fat onion-shaped Moor\'s head, the classic alembic bulb.',
      helmet: 'A plain cone helmet, tinker-made.',
      column: 'A tall column with a ball on top, a serious spirit still.',
      glass: 'A blown-glass head so the vapour can be watched condensing.',
    }),
    metal: choice('What is the still made of?', {
      bright: 'Bright rosy copper, polished weekly.',
      dark: 'Old brown copper gone dull and dark.',
      brass: 'Yellow brass with a harder shine.',
      tinned: 'Grey tinned iron, a poor man\'s still.',
    }),
    spirit: choice('What is coming over into the receiver?', SPIRITS),
    heat: choice('What heats it?', {
      stove: 'A small round brick stove with an arched fire mouth.',
      brazier: 'An iron tripod brazier of glowing charcoal.',
      lamp: 'A little spirit lamp under a trivet, gentle heat.',
      none: 'Nothing: it sits on bare trivet legs, unlit.',
    }),
    receiver: choice('What catches the distillate?', {
      flask: 'A round glass receiver flask on a wooden stool.',
      jug: 'A stoneware jug with a handle.',
      bottles: 'A row of small corked bottles, one under the spout and the rest filled and waiting.',
      bucket: 'A wooden pail on the floor, quantity over quality.',
    }),
    state: choice('What is it doing right now?', {
      waiting: 'Charged and sealed but not yet lit, everything laid ready.',
      running: 'Running sweetly, a slow steady drip.',
      boiling: 'Boiling over: steam hissing from the joints, the luting failing.',
      neglected: 'Long unused, green with verdigris and cobwebbed.',
      raided: 'Knocked askew, the neck pulled off its seat and the receiver tipped over.',
    }),
    worm: noul('Does the neck pass through a wooden cooling tub (a worm tub) before the spout?'),
    botanicals: noul('Is there a heap of herbs, petals or fruit waiting beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.heat !== 'none' && (a.state === 'running' || a.state === 'boiling');
    const base = { bright: '#c8703f', dark: '#7d4a2c', brass: '#c4a044', tinned: '#8f9496' }[a.metal];
    const verd = a.metal === 'tinned' ? 0 : Math.min(1, mood.wear * 0.6 + (a.state === 'neglected' ? 0.9 : 0.08));
    const potMap = metalTexture(random, base, verd, a.heat === 'none' ? 0 : mix(0.3, 0.9, mood.wear));
    const headMap = metalTexture(random, base, verd, 0);
    const shine = { metalness: a.metal === 'tinned' ? 0.55 : 0.75, roughness: mix(0.3, 0.6, mood.wear) + (a.metal === 'dark' ? 0.12 : 0) };
    const potMetal = new THREE.MeshStandardMaterial({ map: potMap, ...shine });
    const headMetal = new THREE.MeshStandardMaterial({ map: headMap, ...shine });
    const plain = new THREE.MeshStandardMaterial({ color: base, ...shine });
    const iron = s.material('#2b2a2c', { metalness: 0.5, roughness: 0.6 });
    const wood = s.material('#7a5632'), darkWood = s.material('#553a22');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8ece6', transparent: true, opacity: 0.4, roughness: 0.06, side: THREE.DoubleSide });
    const tint = TINT[a.spirit];
    const liquid = s.material(tint, { roughness: 0.25, emissive: tint, emissiveIntensity: a.spirit === 'blue' ? 0.8 : 0.12 });
    const fire = new THREE.MeshStandardMaterial({ color: lit ? '#ff8a2a' : '#3a3532', emissive: '#ff5a10', emissiveIntensity: lit ? mix(0.7, 1.3, mood.warmth) : 0 });

    // Heat source; y0 is where the pot's bottom sits.
    let y0 = 0.3;
    if (a.heat === 'stove') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#cbbfa8'; ctx.fillRect(0, 0, 256, 256);
      const c = new THREE.Color();
      for (let r = 0; r < 6; r++) for (let i = -1; i < 9; i++) { c.set('#99503a').offsetHSL(0, (random() - 0.5) * 0.1, (random() - 0.5) * 0.14); ctx.fillStyle = c.getStyle(); ctx.fillRect((i + (r % 2) / 2) * 28.4 + 2, r * 42.7 + 2, 24.5, 38.7); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping;
      s.cylinder(0.33, 0.36, 0.34, [0, 0.17, 0], new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), 24);
      s.box([0.17, 0.17, 0.04], [0, 0.11, 0.345], s.material('#141110'));
      s.cylinder(0.085, 0.085, 0.04, [0, 0.195, 0.345], s.material('#141110'), 16).rotation.x = Math.PI / 2;
      s.box([0.13, 0.08, 0.02], [0, 0.075, 0.362], fire);
      y0 = 0.3;
    } else if (a.heat === 'brazier') {
      for (let i = 0; i < 3; i++) { const g = i * 2.094 + 0.5; s.rod([Math.sin(g) * 0.33, 0, Math.cos(g) * 0.33], [Math.sin(g) * 0.24, 0.36, Math.cos(g) * 0.24], 0.014, iron); }
      s.lathe([[0, 0.12], [0.17, 0.13], [0.24, 0.22], [0.25, 0.23]], iron).material.side = THREE.DoubleSide;
      s.ring(0.25, 0.012, [0, 0.36, 0], iron).rotation.x = Math.PI / 2;
      const coals = [];
      for (let i = 0; i < 16; i++) { const r = Math.sqrt(random()) * 0.19, g = random() * 6.28; coals.push({ at: [Math.cos(g) * r, 0.2 + random() * 0.04, Math.sin(g) * r] as const, size: 0.03 + random() * 0.02, color: lit && random() < 0.6 ? '#ff7a2a' : '#2a2422' }); }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ emissive: '#ff4a10', emissiveIntensity: lit ? 0.7 : 0, roughness: 0.9 }), coals);
      y0 = 0.33;
    } else {
      for (let i = 0; i < 3; i++) { const g = i * 2.094 + 0.5; s.rod([Math.sin(g) * 0.27, 0, Math.cos(g) * 0.27], [Math.sin(g) * 0.2, 0.26, Math.cos(g) * 0.2], 0.012, iron); }
      s.ring(0.2, 0.012, [0, 0.26, 0], iron).rotation.x = Math.PI / 2;
      y0 = 0.24;
      if (a.heat === 'lamp') {
        s.lathe([[0, 0], [0.07, 0.005], [0.085, 0.04], [0.05, 0.085], [0.02, 0.095], [0.02, 0.115]], plain);
        if (lit) { const flame = s.mesh(new THREE.ConeGeometry(0.022, 0.09, 8), fire, [0, 0.165, 0]); flame.castShadow = false; }
      }
    }

    // Everything above the heat can be knocked askew.
    const rig = new THREE.Group();
    s.root.add(rig);
    const into = <T extends THREE.Object3D>(node: T) => { rig.add(node); return node; };
    into(s.lathe([[0, 0], [0.16, 0.005], [0.26, 0.05], [0.31, 0.17], [0.3, 0.28], [0.22, 0.4], [0.145, 0.45], [0.155, 0.47]], potMetal, [0, y0, 0]));
    for (const y of [0.17, 0.455]) into(s.ring(y < 0.3 ? 0.312 : 0.15, 0.009, [0, y0 + y, 0], plain)).rotation.x = Math.PI / 2;
    const rivets = [];
    for (let i = 0; i < 20; i++) { const g = (i / 20) * 6.283; rivets.push({ at: [Math.cos(g) * 0.314, y0 + 0.2, Math.sin(g) * 0.314] as const, size: 0.009 }); }
    into(s.scatter(new THREE.SphereGeometry(1, 6, 4), plain, rivets));
    for (const side of [-1, 1]) { const h = into(s.ring(0.06, 0.012, [0, y0 + 0.3, side * 0.3], plain, Math.PI)); h.rotation.set(0, Math.PI / 2, 0); h.rotation.x = side * 0.5; }

    const hy = y0 + 0.46;
    const headGroup = new THREE.Group();
    rig.add(headGroup);
    const inHead = <T extends THREE.Object3D>(node: T) => { headGroup.add(node); return node; };
    let neckFrom: [number, number, number];
    if (a.head === 'onion') {
      inHead(s.lathe([[0.15, 0], [0.165, 0.02], [0.24, 0.1], [0.23, 0.2], [0.13, 0.3], [0.045, 0.35], [0.035, 0.4], [0.055, 0.42], [0, 0.45]], headMetal, [0, hy, 0]));
      neckFrom = [0.16, hy + 0.2, 0];
    } else if (a.head === 'helmet') {
      inHead(s.lathe([[0.155, 0], [0.165, 0.03], [0.15, 0.1], [0.05, 0.36], [0, 0.4]], headMetal, [0, hy, 0]));
      inHead(s.ring(0.165, 0.014, [0, hy + 0.03, 0], plain)).rotation.x = Math.PI / 2;
      neckFrom = [0.08, hy + 0.2, 0];
    } else if (a.head === 'column') {
      inHead(s.lathe([[0.155, 0], [0.16, 0.03], [0.09, 0.09], [0.085, 0.42], [0.1, 0.44], [0.16, 0.52], [0.16, 0.6], [0.08, 0.68], [0, 0.7]], headMetal, [0, hy, 0]));
      for (const y of [0.16, 0.3]) inHead(s.ring(0.09, 0.008, [0, hy + y, 0], plain)).rotation.x = Math.PI / 2;
      neckFrom = [0.12, hy + 0.58, 0];
    } else {
      inHead(s.lathe([[0.15, 0], [0.16, 0.02], [0.22, 0.1], [0.21, 0.2], [0.12, 0.3], [0.04, 0.34], [0, 0.35]], glass, [0, hy, 0]));
      inHead(s.ring(0.155, 0.016, [0, hy + 0.01, 0], s.material('#b9a480', { roughness: 1 }))).rotation.x = Math.PI / 2; // luting clay
      if (lit) { const fog = s.ball([0.15, 0.1, 0.15], [0, hy + 0.15, 0], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })); fog.castShadow = false; inHead(fog); }
      neckFrom = [0.15, hy + 0.2, 0];
    }

    // Swan neck out to the spout.
    const spoutX = a.worm ? 0.72 : 0.78;
    const receiverTop = a.receiver === 'bucket' ? 0.3 : a.receiver === 'jug' ? 0.42 : a.receiver === 'bottles' ? 0.5 : 0.6;
    const spoutY = a.worm ? 0.84 : receiverTop + 0.06;
    const neckMaterial = a.head === 'glass' ? glass : plain;
    const peak = neckFrom[1] + 0.13;
    inHead(s.tube([neckFrom, [neckFrom[0] + 0.12, peak - 0.03, 0], [neckFrom[0] + 0.26, peak, 0], [spoutX - 0.12, mix(peak, spoutY, 0.45), 0], [spoutX, spoutY + 0.05, 0], [spoutX + 0.015, spoutY, 0]], 0.028, neckMaterial));
    inHead(s.ring(0.034, 0.008, [neckFrom[0] + 0.02, neckFrom[1] + 0.01, 0], plain)).rotation.y = Math.PI / 2;

    let dripX = spoutX + 0.015, dripY = spoutY;
    if (a.worm) {
      // Coopered tub; the worm emerges low on the far side.
      const tubX = spoutX + 0.02;
      s.cylinder(0.2, 0.17, 0.56, [tubX, 0.58, 0], wood, 18);
      for (const y of [0.16, 0.36, 0.58]) s.ring(0.176 + (y - 0.08) * 0.053, 0.008, [tubX, y + 0.22, 0], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const g = i * 2.094; s.box([0.07, 0.3, 0.07], [tubX + Math.sin(g) * 0.13, 0.15, Math.cos(g) * 0.13], darkWood); }
      s.cylinder(0.185, 0.185, 0.01, [tubX, 0.845, 0], s.material('#7fa3a8', { roughness: 0.15 }), 18);
      dripX = tubX + 0.3; dripY = 0.42;
      s.rod([tubX + 0.16, 0.47, 0], [dripX, dripY, 0], 0.016, plain);
    }

    // Receiver.
    const rx = dripX, level = mix(0.15, 0.85, random()) * (a.state === 'waiting' ? 0.05 : 1);
    const tipped = a.state === 'raided';
    const vessel = new THREE.Group();
    s.root.add(vessel);
    const add = <T extends THREE.Object3D>(mesh: T) => { vessel.add(mesh); return mesh; };
    let standH = 0;
    const lowSpout = a.worm;
    if (a.receiver === 'flask') {
      standH = lowSpout ? 0 : 0.28;
      if (standH) {
        s.cylinder(0.13, 0.13, 0.03, [rx, standH - 0.015, 0], wood, 14);
        for (let i = 0; i < 3; i++) { const g = i * 2.094 + 1; s.rod([rx + Math.sin(g) * 0.14, 0, Math.cos(g) * 0.14], [rx + Math.sin(g) * 0.08, standH - 0.02, Math.cos(g) * 0.08], 0.014, darkWood); }
      }
      const k = 1;
      add(s.lathe([[0, 0], [0.06, 0.005], [0.115, 0.07], [0.11, 0.16], [0.04, 0.24], [0.032, 0.31], [0.042, 0.32]].map(([x, y]) => [x * k, y * k] as const), glass));
      const fill = add(s.ball([0.1 * k, 0.085 * k * level + 0.008, 0.1 * k], [0, (0.02 + 0.07 * level) * k + 0.006, 0], liquid, 14));
      fill.castShadow = false;
    } else if (a.receiver === 'jug') {
      const k = lowSpout ? 0.9 : 1;
      const clay = s.material('#a58e68', { roughness: 0.7 });
      add(s.lathe([[0, 0], [0.1, 0], [0.15, 0.12], [0.13, 0.28], [0.06, 0.36], [0.07, 0.41]].map(([x, y]) => [x * k, y * k] as const), clay)).material.side = THREE.DoubleSide;
      const handle = add(s.ring(0.07 * k, 0.014 * k, [-0.13 * k, 0.27 * k, 0], clay, Math.PI)); handle.rotation.z = Math.PI / 2;
      add(s.cylinder(0.055 * k, 0.055 * k, 0.01, [0, 0.36 * k, 0], liquid, 12));
    } else if (a.receiver === 'bottles') {
      standH = lowSpout ? 0 : 0.3;
      if (standH) { s.box([0.62, 0.03, 0.2], [rx + 0.2, standH - 0.015, 0], wood); for (const dx of [-0.07, 0.47]) s.box([0.035, standH - 0.03, 0.18], [rx + dx, (standH - 0.03) / 2, 0], darkWood); }
      const n = 3 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const bottle = i === 0 ? vessel : new THREE.Group();
        if (i) { bottle.position.set(rx + 0.11 * i + 0.01, standH, (random() - 0.5) * 0.04); s.root.add(bottle); }
        const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0.003], [0.042, 0.1], [0.016, 0.14], [0.016, 0.18], [0.021, 0.185]].map(([x, y]) => new THREE.Vector2(x, y)), 14), glass);
        const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.09 * (i ? 0.95 : level) + 0.004, 12), liquid);
        fill.position.y = 0.006 + (0.09 * (i ? 0.95 : level) + 0.004) / 2;
        bottle.add(body, fill);
        if (i) { const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 0.03, 8), s.material('#b08a5a')); cork.position.y = 0.19; bottle.add(cork); }
      }
    } else {
      add(s.cylinder(0.17, 0.14, 0.26, [0, 0.13, 0], wood, 16));
      for (const y of [0.06, 0.2]) add(s.ring(0.15 + y * 0.1, 0.007, [0, y, 0], iron)).rotation.x = Math.PI / 2;
      add(s.cylinder(0.155, 0.155, 0.01, [0, 0.255 * Math.max(level, 0.3), 0], liquid, 16)).position.y = 0.05 + 0.2 * level;
      add(s.ring(0.16, 0.008, [0, 0.27, 0], iron, Math.PI));
    }
    vessel.position.set(rx, standH, 0);
    if (tipped) {
      vessel.rotation.z = -1.45; vessel.position.set(rx + 0.2, (a.receiver === 'bucket' ? 0.15 : 0.1), 0.22);
      const puddle = s.cylinder(0.26, 0.26, 0.006, [rx + 0.42, 0.003, 0.25], liquid, 20); puddle.scale.z = 0.6; puddle.castShadow = false;
      headGroup.position.set(-0.03, 0.02, 0.05); headGroup.rotation.set(0.14, 0.5, -0.13);
      rig.rotation.z = 0.06;
    }

    // Botanicals: a heaped basket on the far side from the receiver.
    if (a.botanicals) {
      const bx = -0.62, colours = { clear: ['#c9b46a', '#a88f4a'], rose: ['#d94a6a', '#f0a0b0'], green: ['#4f8a3a', '#7aa84a'], amber: ['#e09a2a', '#c8641e'], tar: ['#4a3a2a', '#6a5a3a'], blue: ['#4a5ad0', '#8a6ad8'] }[a.spirit];
      s.lathe([[0, 0], [0.14, 0], [0.2, 0.13], [0.21, 0.14]], s.material('#a8824a', { roughness: 1 }), [bx, 0, 0.1]).material.side = THREE.DoubleSide;
      for (const y of [0.04, 0.09]) s.ring(0.16 + y * 0.45, 0.008, [bx, y, 0.1], s.material('#8a6a3a')).rotation.x = Math.PI / 2;
      const bits = [];
      for (let i = 0; i < Math.round(mix(24, 60, mood.density)); i++) { const r = Math.sqrt(random()) * 0.18, g = random() * 6.28; bits.push({ at: [bx + Math.cos(g) * r, 0.1 + (0.19 - r) * 0.5 + random() * 0.02, 0.1 + Math.sin(g) * r] as const, size: 0.022 + random() * 0.018, color: colours[Math.floor(random() * 2)] }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), bits);
    }
    if (a.state === 'neglected') {
      const web = new THREE.MeshStandardMaterial({ color: '#e8e8e2', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.5, 0.02); shape.quadraticCurveTo(0.2, 0.08, 0.02, 0.36); shape.lineTo(0, 0);
      const sheet = s.mesh(new THREE.ShapeGeometry(shape), web, [0.14, hy + 0.02, 0]); sheet.castShadow = false;
    }

    // Drip and steam.
    const drop = s.ball([0.012, 0.018, 0.012], [dripX, dripY - 0.03, 0], liquid, 8);
    drop.visible = a.state === 'running' || a.state === 'boiling';
    const fallTo = tipped ? 0 : standH + 0.1;
    const puffs: THREE.Mesh[] = [];
    if (a.state === 'boiling') {
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const g = random() * 6.28;
        const puff = s.ball([1, 1, 1], [0, 0, 0], steam, 10); puff.castShadow = puff.receiveShadow = false;
        puff.userData = { phase: i / 9, x: Math.cos(g) * 0.16, z: Math.sin(g) * 0.16, y: hy + (i % 3 === 0 ? 0.4 : 0) };
        puffs.push(puff);
      }
    }
    const pose = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * 0.35) % 1;
        puff.position.set(puff.userData.x * (1 + t * 1.2), puff.userData.y + t * 0.4, puff.userData.z * (1 + t * 1.2));
        puff.scale.setScalar(0.03 + t * 0.09);
      }
      const t = (time * (a.state === 'boiling' ? 1.6 : 0.5)) % 1;
      drop.position.y = mix(dripY - 0.02, Math.min(fallTo, dripY - 0.05), t * t);
    };
    pose(0.3);
    const speed = mix(0.5, 2, mood.energy);
    return s.finish({ update: (_dt, time) => pose(time * speed) });
  },
});

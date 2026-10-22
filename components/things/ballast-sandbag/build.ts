import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const CANVAS = {
  ecru: 'Natural unbleached canvas, the honest default.',
  olive: 'Olive drab army canvas.',
  oxide: 'Red-oxide tarred canvas, like a barge sail.',
  navy: 'Dark navy duck cloth.',
  ticking: 'Blue-and-cream striped mattress ticking, sewn from whatever was at home.',
  burlap: 'Coarse brown hessian sacking.',
} as const;
const CLOTH: Record<keyof typeof CANVAS, { base: string; ink: string }> = {
  ecru: { base: '#d6c8a4', ink: '#2b2a26' },
  olive: { base: '#6f7448', ink: '#f0ead2' },
  oxide: { base: '#9a4a32', ink: '#f3e6cc' },
  navy: { base: '#2c3a58', ink: '#f1ecdc' },
  ticking: { base: '#e6dfcc', ink: '#8a1f1a' },
  burlap: { base: '#a07c4c', ink: '#2a1c10' },
};
const STENCILS = {
  kg: 'Its weight in kilograms: 15 KG.',
  lbs: 'Its weight in pounds: 30 LBS.',
  ballast: 'The plain word BALLAST.',
  number: 'A bag number, one of a counted set.',
  home: 'The word HOME, as if that were what is being carried.',
  regrets: 'The word REGRETS.',
  fragile: 'DO NOT DROP, which is the whole point of it.',
  blank: 'Nothing at all: bare cloth.',
} as const;
const SAND = { pale: '#e3d3a4', river: '#8f8062', red: '#b9623a', black: '#3a3a3e', shot: '#8d9296', gold: '#e2b23c' } as const;

export default defineThing({
  questions: {
    arrangement: choice('How is the ballast arranged?', {
      resting: 'A single bag slumped on the ground with its rope and hook lying beside it.',
      hanging: 'A single bag hooked over the rim of a balloon basket.',
      string: 'A string of bags hooked in a row along the basket rim.',
      heap: 'A heap of bags piled on the ground, waiting to be loaded.',
    }),
    leak: choice('What state is the bag in?', {
      sealed: 'Sealed and whole, nothing escaping.',
      trickle: 'A thin steady trickle of sand runs from a corner seam onto a small cone below.',
      slit: 'Slashed open with a knife and pouring out fast.',
      burst: 'One bag has been cut loose and lies burst on the ground in a fan of sand.',
    }),
    fill: score('How full is it?', ['A limp, nearly empty sack', 'Half full and sagging', 'Packed tight and bulging']),
    stencil: choice('What is stencilled on the side?', STENCILS),
    canvas: choice('What cloth is it made of?', CANVAS),
    rigging: choice('What does it hang by?', {
      hemp: 'Tarred hemp rope and a forged iron hook.',
      brass: 'White cotton cord and a polished brass snap hook.',
      webbing: 'Orange nylon webbing and an aluminium carabiner.',
    }),
    sand: choice('What is it filled with?', {
      pale: 'Pale dry beach sand.',
      river: 'Damp grey-brown river sand.',
      red: 'Red desert sand.',
      black: 'Black volcanic sand.',
      shot: 'Dull grey lead shot.',
      gold: 'Gold dust, absurdly.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cloth = CLOTH[a.canvas];
    const number = 1 + Math.floor(random() * 23);
    const words: string[] = {
      kg: ['BALLAST', '15 KG'], lbs: ['BALLAST', '30 LBS'], ballast: ['BALLAST'], number: ['No.', String(number)],
      home: ['HOME'], regrets: ['REGRETS'], fragile: ['DO NOT', 'DROP'], blank: [],
    }[a.stencil];

    // Painted cloth: u runs around the bag with the front at u = 0.5, v runs from the base to the collar.
    const W = 512, H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d')!;
    g.fillStyle = cloth.base; g.fillRect(0, 0, W, H);
    if (a.canvas === 'ticking') { g.fillStyle = '#4a6a9a'; for (let x = 0; x < W; x += 32) { g.fillRect(x, 0, 9, H); g.fillRect(x + 13, 0, 2, H); } }
    const coarse = a.canvas === 'burlap' ? 0.22 : 0.09;
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = random() < 0.5 ? `rgba(255,255,255,${coarse})` : `rgba(0,0,0,${coarse})`;
      if (random() < 0.5) g.fillRect(random() * W, random() * H, 10, 1); else g.fillRect(random() * W, random() * H, 1, 8);
    }
    if (words.length) {
      g.fillStyle = cloth.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = words.length, big = lines === 1 ? 52 : 46;
      words.forEach((word, index) => {
        const size = lines === 2 && index === 0 && word === 'BALLAST' ? 26 : Math.min(big, 150 / Math.max(word.length, 2) * 1.6);
        g.font = `bold ${size}px monospace`;
        g.globalAlpha = 0.9;
        g.fillText(word, W / 2, H * (lines === 1 ? 0.55 : 0.42 + index * 0.2), 150);
      });
      g.globalAlpha = 1;
      // Stencil bridges and patchy paint.
      g.fillStyle = cloth.base;
      for (let x = W / 2 - 100; x < W / 2 + 100; x += 13) g.fillRect(x, H * 0.3, 2, H * 0.48);
      for (let i = 0; i < 90 + mood.wear * 500; i++) g.fillRect(W / 2 - 100 + random() * 200, H * 0.3 + random() * H * 0.45, 3 + random() * 5, 1.5);
    }
    // Side seam with stitches, hem line, then dirt.
    g.strokeStyle = 'rgba(30,24,16,0.55)'; g.lineWidth = 2; g.setLineDash([6, 5]);
    for (const x of [6, W - 6]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.beginPath(); g.moveTo(0, H * 0.9); g.lineTo(W, H * 0.9); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 6 + mood.wear * 40; i++) {
      g.fillStyle = `rgba(${50 + random() * 40},${40 + random() * 30},30,${0.08 + mood.wear * 0.2})`;
      g.beginPath(); g.ellipse(random() * W, H * (0.5 + random() * 0.5), 10 + random() * 50, 6 + random() * 26, random() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < mood.wear * 5; i++) {
      const x = random() * W, y = 40 + random() * 150, w = 30 + random() * 40, h = 24 + random() * 30;
      g.fillStyle = ['#b9ae8c', '#7c8a94', '#a4573c'][Math.floor(random() * 3)]; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(20,16,10,0.7)'; g.setLineDash([4, 3]); g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.setLineDash([]);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const fabric = new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });

    const rig = {
      hemp: { rope: '#6b5234', hook: '#3a3c40', metal: 0.6, thick: 0.011 },
      brass: { rope: '#ece6d6', hook: '#c9a03c', metal: 0.9, thick: 0.009 },
      webbing: { rope: '#e8641e', hook: '#4a8ac8', metal: 0.8, thick: 0.008 },
    }[a.rigging];
    const rope = s.material(rig.rope, { roughness: 0.9 });
    const iron = s.material(rig.hook, { metalness: rig.metal, roughness: 0.35 });
    const sand = s.material(SAND[a.sand], a.sand === 'gold' ? { metalness: 0.7, roughness: 0.35, emissive: '#7a5a10', emissiveIntensity: 0.3 } : a.sand === 'shot' ? { metalness: 0.5, roughness: 0.5 } : { roughness: 1 });
    const wood = s.material('#7d5a36', { roughness: 0.8 });
    const leather = s.material('#5a3a22', { roughness: 0.75 });

    const PROFILE: [number, number][] = [[0.004, 0], [0.07, 0.002], [0.125, 0.018], [0.152, 0.06], [0.158, 0.12], [0.15, 0.19], [0.13, 0.26], [0.095, 0.32], [0.055, 0.36], [0.034, 0.385], [0.034, 0.4], [0.055, 0.425], [0.085, 0.46]];
    const NECK = 0.392;
    /** One bag with its base at the group's origin. Fullness fattens it; an empty sack hangs flat. */
    const bag = (fullness: number) => {
      const group = new THREE.Group();
      const lathe = new THREE.LatheGeometry(PROFILE.map(([x, y]) => new THREE.Vector2(x * (y < 0.3 ? mix(0.62, 1, fullness) : 1), y)), 28);
      const position = lathe.attributes.position;
      const phase = random() * 6, folds = 4 + Math.floor(random() * 3);
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const phi = Math.atan2(x, z);
        let k = 1 + (0.035 + (1 - fullness) * 0.07) * Math.sin(phi * folds + y * 22 + phase) * Math.min(1, y * 12);
        if (y > 0.36) k *= 1 + 0.2 * Math.sin(phi * 9 + phase) * Math.min(1, (y - 0.36) * 20);
        position.setX(i, x * k); position.setZ(i, z * k * mix(0.5, 1, fullness));
      }
      lathe.computeVertexNormals();
      const skin = new THREE.Mesh(lathe, fabric);
      skin.rotation.y = Math.PI;
      skin.castShadow = skin.receiveShadow = true;
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.011, 8, 20), rope);
      tie.rotation.x = Math.PI / 2; tie.position.y = NECK; tie.castShadow = true;
      group.add(skin, tie);
      s.root.add(group);
      return group;
    };
    const hook = (x: number, y: number, z: number, flat = false) => {
      const curl = s.ring(0.045, 0.009, [x, y, z], iron, Math.PI * 1.25);
      if (flat) { curl.rotation.x = Math.PI / 2; curl.position.y = 0.012; }
      else { curl.rotation.y = Math.PI / 2; curl.rotation.x = 0; curl.rotation.z = 0; curl.rotateZ(-0.3); }
      if (a.rigging !== 'hemp' && !flat) s.box([0.012, 0.075, 0.012], [x, y - 0.01, z + 0.043], iron);
      return curl;
    };
    const pile = (x: number, z: number, radius: number) => {
      s.mesh(new THREE.ConeGeometry(radius, radius * 0.62, 20), sand, [x, radius * 0.31, z]);
      const grains: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 40; i++) { const t = random() * 7, d = radius * (0.9 + random() * 1.3); grains.push({ at: [x + Math.cos(t) * d, 0.004, z + Math.sin(t) * d], size: 0.003 + random() * 0.006 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), sand, grains);
    };
    const gash = (group: THREE.Group, height: number) => {
      const cut = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#1a140e', roughness: 1 }));
      cut.scale.set(0.009, 0.06, 0.012); cut.position.set(0.02, height, 0.146 * mix(0.5, 1, a.fill)); cut.rotation.z = 0.5;
      const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), sand);
      tongue.scale.set(0.03, 0.05, 0.03); tongue.position.set(0.035, height - 0.04, 0.15 * mix(0.5, 1, a.fill)); tongue.castShadow = true;
      group.add(cut, tongue);
    };
    const burstBag = (x: number, z: number) => {
      const flat = bag(0.25);
      flat.rotation.set(Math.PI / 2 - 0.12, 0, 0.5 + random());
      flat.rotation.order = 'ZXY';
      flat.position.set(x, 0.07, z);
      const fan = s.ball([0.34, 0.035, 0.26], [x + 0.08, 0.012, z + 0.22], sand, 18);
      fan.rotation.y = random() * 3;
      pile(x - 0.05, z + 0.12, 0.1);
    };

    const fullness = mix(0.12, 1, a.fill) * (a.leak === 'slit' ? 0.75 : 1);
    const hung = a.arrangement === 'hanging' || a.arrangement === 'string';
    if (hung) {
      // A cut-away length of basket: cane uprights, a wicker panel and a leather-bound rim.
      const count = a.arrangement === 'string' ? 3 + Math.round(mood.density * 3) : 1;
      const pitch = 0.4, railY = 0.84, width = Math.max(0.7, count * pitch + 0.3);
      const weave = document.createElement('canvas');
      weave.width = weave.height = 128;
      const w2 = weave.getContext('2d')!;
      w2.fillStyle = '#8a5d30'; w2.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) { w2.fillStyle = (x + y) % 2 ? '#b98a4e' : '#754c24'; w2.fillRect(x * 16 + (y % 2) * 8, y * 8 + 1, 14, 6); }
      const weaveMap = new THREE.CanvasTexture(weave);
      weaveMap.colorSpace = THREE.SRGBColorSpace;
      weaveMap.wrapS = weaveMap.wrapT = THREE.RepeatWrapping;
      weaveMap.repeat.set(width * 3.2, 2.6);
      s.mesh(new THREE.BoxGeometry(width, railY - 0.04, 0.05), new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.9 }), [0, (railY - 0.04) / 2 + 0.02, 0]);
      s.rod([-width / 2 - 0.02, railY, 0], [width / 2 + 0.02, railY, 0], 0.04, leather);
      s.box([width + 0.04, 0.05, 0.09], [0, 0.025, 0], leather);
      for (const x of [-1, 1]) s.rod([x * width / 2, 0, 0], [x * width / 2, railY + 0.1, 0], 0.022, wood);
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * pitch + (random() - 0.5) * 0.04;
        const lost = a.leak === 'burst' && i === Math.floor(count / 2);
        const drop = 0.1 + random() * 0.08;
        hook(x, railY + 0.012, 0.012);
        if (lost) {
          // The cut rope still swings from its hook.
          s.rod([x, railY - 0.02, 0.055], [x + 0.02, railY - 0.02 - drop, 0.06], rig.thick, rope);
          for (let k = 0; k < 4; k++) s.rod([x + 0.02, railY - 0.02 - drop, 0.06], [x + 0.02 + (random() - 0.5) * 0.05, railY - 0.07 - drop, 0.06 + (random() - 0.5) * 0.05], rig.thick * 0.4, rope);
          burstBag(x + 0.05, 0.42);
          continue;
        }
        const each = i === 0 || count === 1 ? fullness : fullness * mix(0.75, 1, random());
        const one = bag(each);
        const base = railY - 0.03 - drop - NECK - 0.03;
        one.position.set(x, Math.max(base, 0.12), 0.05 + 0.158 * mix(0.5, 1, each) * 0.92);
        one.rotation.set(-0.05, (random() - 0.5) * 0.5, (random() - 0.5) * 0.08);
        s.rod([x, railY - 0.03, 0.055], [x, one.position.y + NECK, one.position.z - 0.005], rig.thick, rope);
        const leaking = i === 0 && (a.leak === 'trickle' || a.leak === 'slit');
        if (leaking) {
          const slit = a.leak === 'slit';
          const from: [number, number, number] = slit ? [x + 0.04, one.position.y + 0.1, one.position.z + 0.15 * mix(0.5, 1, each)] : [x + 0.06, one.position.y + 0.012, one.position.z + 0.03];
          if (slit) gash(one, 0.16);
          s.rod(from, [from[0] + 0.01, 0.02, from[2] + 0.02], slit ? 0.02 : 0.006, sand, slit ? 0.028 : 0.008);
          pile(from[0] + 0.01, from[2] + 0.02, slit ? 0.17 : 0.075);
        }
      }
    } else if (a.arrangement === 'resting') {
      const burst = a.leak === 'burst';
      if (burst) burstBag(0, 0);
      else {
        const one = bag(fullness);
        one.scale.set(1.12, 0.86, 1.12);
        one.rotation.set((random() - 0.5) * 0.12, (random() - 0.5) * 0.4, (random() - 0.5) * 0.12);
        if (a.leak === 'slit') { gash(one, 0.15); s.rod([0.05, 0.08, 0.17 * mix(0.5, 1, fullness)], [0.09, 0.02, 0.3], 0.03, sand, 0.02); pile(0.1, 0.33, 0.14); }
        if (a.leak === 'trickle') { s.rod([0.15, 0.03, 0.05], [0.2, 0.01, 0.08], 0.008, sand); pile(0.22, 0.09, 0.06); }
      }
      // The rope snakes away across the ground to its hook.
      const top: [number, number, number] = burst ? [-0.22, 0.02, -0.12] : [0.01, NECK * 0.86 + 0.02, 0];
      const side = random() < 0.5 ? -1 : 1;
      s.tube([top, burst ? [-0.3, 0.012, -0.05] : [side * 0.1, 0.3, -0.06], [side * 0.24, 0.02, -0.02], [side * 0.36, 0.012, 0.12], [side * 0.3, 0.012, 0.27], [side * 0.42, 0.012, 0.36]], rig.thick, rope);
      hook(side * 0.455, 0.012, 0.385, true);
    } else {
      // A heap: a bottom row, a second tier lying across it, and one propped upright on top.
      const total = 4 + Math.round(mood.density * 5);
      const row = Math.min(4, Math.ceil(total / 2));
      let placed = 0;
      for (let i = 0; i < row && placed < total; i++, placed++) {
        const one = bag(fullness * mix(0.8, 1, random()));
        one.scale.set(1.1, 0.88, 1.1);
        one.position.set((i - (row - 1) / 2) * 0.29, 0, (random() - 0.5) * 0.08 - 0.05);
        one.rotation.set((random() - 0.5) * 0.15, (random() - 0.5) * 0.7, (random() - 0.5) * 0.2);
        if (i === 0 && a.leak === 'slit') { gash(one, 0.15); pile(one.position.x + 0.05, 0.3, 0.13); }
        if (i === 0 && a.leak === 'trickle') pile(one.position.x - 0.14, 0.14, 0.06);
      }
      for (let i = 0; placed < total; i++, placed++) {
        const one = bag(fullness * mix(0.8, 1, random()));
        const tier = Math.floor(i / 3), across = i % 3;
        one.rotation.order = 'YXZ';
        one.rotation.set(Math.PI / 2 - 0.1, (random() - 0.5) * 0.9 + (tier ? 1.4 : 0), 0);
        const lean = new THREE.Vector3(0, 0, -0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), one.rotation.y);
        one.position.set((across - 1) * 0.3 + lean.x, tier * 0.25 + 0.14, 0.33 + tier * -0.3 + lean.z);
      }
      if (a.leak === 'burst') burstBag(row * 0.2 + 0.2, 0.3);
      s.tube([[-row * 0.17, NECK * 0.88, -0.05], [-row * 0.17 - 0.12, 0.2, 0.02], [-row * 0.17 - 0.2, 0.014, 0.16], [-row * 0.17 - 0.12, 0.014, 0.3]], rig.thick, rope);
      hook(-row * 0.17 - 0.09, 0.012, 0.33, true);
    }
    return s.finish();
  },
});

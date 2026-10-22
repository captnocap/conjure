import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const BOWS = {
  round: 'A plain round bow, the commonest house key.',
  clover: 'A three-lobed clover bow.',
  square: 'A squared bow with rounded corners.',
  hex: 'A six-sided bow.',
  oval: 'A long oval bow, an older lock.',
} as const;
const METALS = {
  brass: 'Yellow brass, bright where thumbs have polished it.',
  nickel: 'Silvery nickel plate, brass showing through at the edges.',
  bronze: 'Dark reddish old bronze.',
  painted: 'A novelty copy enamelled in bright colour, cut at a kiosk.',
} as const;
const TAGS = {
  spare: 'SPARE',
  mum: "MUM'S",
  flat: 'FLAT 3B',
  shed: 'SHED',
  home: 'HOME',
  back: 'BACK DOOR',
  query: 'A single question mark: nobody remembers what it opens.',
  blank: 'Nothing: the tag was never filled in.',
} as const;

export default defineThing({
  questions: {
    bow: choice('What shape is the bow, the part you hold?', BOWS),
    metal: choice('What is the key made of?', METALS),
    carrying: choice('What is the key on?', {
      bare: 'Nothing: a single loose key.',
      ring: 'A plain steel split ring.',
      tag: 'A split ring with a handwritten paper tag.',
      string: 'A loop of grubby string, to wear round a child\'s neck.',
      bunch: 'A split ring shared with two smaller keys.',
    }),
    label: choice('If it has a paper tag, what is written on it?', TAGS),
    cap: choice('Is there a plastic cap over the bow?', {
      none: 'No cap, bare metal.',
      red: 'A red rubber cap.',
      blue: 'A blue rubber cap.',
      yellow: 'A yellow rubber cap.',
      green: 'A green rubber cap.',
    }),
    state: choice('What condition is the blade in?', {
      cut: 'Cut and straight: it works.',
      shallow: 'The cuts are worn nearly smooth from decades of use.',
      blank: 'An uncut blank, never made into a key for any door.',
      bent: 'The blade is bent upward, forced in the wrong lock.',
      snapped: 'The blade has snapped off; the broken tip lies beside it.',
    }),
    pose: choice('If it is a single loose key, how does it rest?', {
      flat: 'Lying flat on its side.',
      upright: 'Standing on its bow with the blade pointing straight up, like a small brass monument.',
      leaning: 'Leaning at a slant, bow down and blade raised.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const steel = new THREE.MeshStandardMaterial({ color: '#c9ced2', metalness: 0.9, roughness: mix(0.22, 0.6, mood.wear) });

    // A key in the xy plane, bow hole at the origin, blade running along +x, thickness along z.
    const makeKey = (options: { bow: keyof typeof BOWS; metal: keyof typeof METALS; state: typeof a.state; scale: number; cap: typeof a.cap; stamp: string }) => {
      const group = new THREE.Group();
      const k = options.scale;
      const bowR = 11 * k, holeR = 2.7 * k, hole = -bowR * 0.45; // the bow centre sits at x = -hole
      const cx = bowR * 0.45;
      const tone = new THREE.Color({ brass: '#c9a23f', nickel: '#c6c9c6', bronze: '#8a5a34', painted: ['#d83a6a', '#2f8fd6', '#7a4fc9', '#27a57a'][Math.floor(random() * 4)] }[options.metal]);
      const tarnish = new THREE.Color(options.metal === 'nickel' ? '#7b7868' : '#4d3b22');
      // Face paint: stamped lettering, scratches, thumb polish and tarnish.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = `#${tone.clone().lerp(tarnish, mood.wear * 0.5).getHexString()}`;
      g.fillRect(0, 0, 256, 256);
      const glow = g.createRadialGradient(128, 128, 10, 128, 128, 120);
      glow.addColorStop(0, `rgba(255,236,170,${options.metal === 'painted' ? 0.1 : 0.45})`);
      glow.addColorStop(1, 'rgba(255,236,170,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 30 + mood.wear * 120; i++) {
        g.strokeStyle = random() > 0.5 ? 'rgba(255,245,210,0.3)' : `rgba(50,35,15,${0.15 + mood.wear * 0.3})`;
        g.lineWidth = 0.6 + random() * 1.2;
        g.beginPath();
        const x = random() * 256, y = random() * 256, t = random() * 6.3, l = 8 + random() * 50;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l);
        g.stroke();
      }
      for (let i = 0; i < mood.wear * 26; i++) {
        g.fillStyle = options.metal === 'painted' ? 'rgba(200,170,90,0.8)' : ['rgba(60,90,70,0.4)', 'rgba(40,28,14,0.45)'][i % 2];
        g.beginPath();
        g.ellipse(random() * 256, random() * 256, 4 + random() * 18, 3 + random() * 10, random() * 3, 0, 7);
        g.fill();
      }
      g.fillStyle = 'rgba(40,26,8,0.6)';
      g.textAlign = 'center';
      g.font = 'bold 30px sans-serif';
      g.fillText(options.stamp, 128, 92, 150);
      g.font = '16px sans-serif';
      g.fillText('DO NOT COPY', 128, 196, 150);
      const face = new THREE.CanvasTexture(canvas);
      face.colorSpace = THREE.SRGBColorSpace;
      face.repeat.set(0.5 / bowR, 0.5 / bowR);
      face.offset.set(0.5 - cx * (0.5 / bowR), 0.5);
      const metal = new THREE.MeshStandardMaterial({ map: face, metalness: options.metal === 'painted' ? 0.35 : mix(0.9, 0.55, mood.wear), roughness: mix(0.25, 0.65, mood.wear) });
      const edge = new THREE.MeshStandardMaterial({ color: tone.clone().lerp(tarnish, 0.25 + mood.wear * 0.5), metalness: 0.85, roughness: mix(0.3, 0.7, mood.wear) });

      const bowOutline = (t: number) => {
        const c = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t));
        if (options.bow === 'clover') return bowR * (0.82 + 0.2 * Math.cos(3 * (t - Math.PI)));
        if (options.bow === 'square') return (bowR * 0.95) / Math.pow(c ** 6 + sn ** 6, 1 / 6);
        if (options.bow === 'hex') return (bowR * 0.9) / Math.cos(((t + Math.PI * 4) % (Math.PI / 3)) - Math.PI / 6);
        if (options.bow === 'oval') return (bowR * 0.82) / Math.sqrt((c / 1.25) ** 2 + sn ** 2);
        return bowR;
      };
      const bowShape = (grow: number) => {
        const points: THREE.Vector2[] = [];
        for (let i = 0; i < 72; i++) { const t = (i / 72) * Math.PI * 2; points.push(new THREE.Vector2(cx + Math.cos(t) * bowOutline(t) * grow, Math.sin(t) * bowOutline(t) * grow)); }
        const shape = new THREE.Shape(points);
        shape.holes.push(new THREE.Path().absarc(hole + cx - bowR * 0.0 + (options.bow === 'oval' ? -2 * k : 0), 0, holeR, 0, Math.PI * 2, true));
        return shape;
      };
      const thick = 2.1 * k;
      const slab = (shape: THREE.Shape, depth: number, bevel: number) => {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
        geometry.translate(0, 0, -depth / 2 + bevel);
        return geometry;
      };
      add(group, slab(bowShape(1), thick, 0.35 * k), [metal, edge]);
      // Collar where the bow meets the blade.
      const neck = bowR + cx - 1.5 * k;
      // The blade: a straight spine on one side, the cuts on the other, a pointed tip.
      const length = 31 * k, half = 4.1 * k, tipX = neck + length;
      const snapAt = options.state === 'snapped' ? neck + length * (0.3 + random() * 0.25) : Infinity;
      const cuts: [number, number][] = [];
      const slots = 6;
      for (let i = 0; i < slots; i++) {
        const depth = options.state === 'blank' ? 0 : (0.6 + random() * 2.9) * k * (options.state === 'shallow' ? 0.3 : 1);
        cuts.push([neck + length * (0.24 + (i / slots) * 0.62), depth]);
      }
      const profile = (from: number, to: number, jagFrom: boolean, jagTo: boolean) => {
        const points: THREE.Vector2[] = [];
        const lower: [number, number][] = [[neck - 3 * k, -half - 1.4 * k], [neck + length * 0.14, -half - 1.4 * k], [neck + length * 0.16, -half]];
        const pitch = (length * 0.62) / slots;
        for (const [x, depth] of cuts) lower.push([x - pitch * 0.42, -half], [x - pitch * 0.12, -half + depth], [x + pitch * 0.12, -half + depth], [x + pitch * 0.42, -half]);
        lower.push([tipX - 4.5 * k, -half], [tipX, -half * 0.1], [tipX - 2.2 * k, half]);
        const upper: [number, number][] = [];
        for (let i = 0; i <= 10; i++) upper.push([mix(tipX - 2.2 * k, neck - 3 * k, i / 10), half]);
        const all = [...lower, ...upper.slice(1)];
        const yAt = (x: number, top: boolean) => {
          if (top) return half;
          for (let i = 0; i < lower.length - 1; i++) if (x >= lower[i][0] && x <= lower[i + 1][0]) return mix(lower[i][1], lower[i + 1][1], (x - lower[i][0]) / Math.max(lower[i + 1][0] - lower[i][0], 1e-6));
          return -half;
        };
        const kept = all.filter(([x]) => x >= from && x <= to);
        const bottom = kept.filter(([, y], i) => i < kept.length && all.indexOf(kept[i]) < lower.length && y <= half);
        const top = kept.filter((point) => all.indexOf(point) >= lower.length);
        const jag = (x: number, upward: boolean) => {
          const yb = yAt(x, false), list: [number, number][] = [];
          for (let i = 0; i <= 4; i++) list.push([x + (i % 4 ? (random() - 0.5) * 1.6 * k : 0), mix(yb, half, i / 4)]);
          return upward ? list : list.reverse();
        };
        if (jagFrom) points.push(...jag(from, false).map(([x, y]) => new THREE.Vector2(x, y)));
        points.push(...bottom.map(([x, y]) => new THREE.Vector2(x, y)));
        if (jagTo) points.push(...jag(to, true).map(([x, y]) => new THREE.Vector2(x, y)));
        points.push(...top.map(([x, y]) => new THREE.Vector2(x, y)));
        return new THREE.Shape(points);
      };
      const bladeThick = thick * 0.82;
      const bend = options.state === 'bent' ? { at: neck + length * (0.3 + random() * 0.2), angle: 0.35 + random() * 0.4 } : null;
      const warp = (geometry: THREE.BufferGeometry) => {
        if (!bend) return geometry;
        const position = geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i) - bend.at, z = position.getZ(i);
          if (x <= 0) continue;
          position.setX(i, bend.at + x * Math.cos(bend.angle) - z * Math.sin(bend.angle));
          position.setZ(i, x * Math.sin(bend.angle) + z * Math.cos(bend.angle));
        }
        geometry.computeVertexNormals();
        return geometry;
      };
      const groove = (from: number, to: number, parent: THREE.Object3D) => {
        const geometry = new THREE.BoxGeometry(to - from, 1.3 * k, bladeThick + 0.08 * k, 14, 1, 1);
        geometry.translate((from + to) / 2, 1.1 * k, 0);
        add(parent, warp(geometry), edge);
      };
      if (options.state === 'snapped') {
        add(group, slab(profile(-Infinity, snapAt, false, true), bladeThick, 0.25 * k), [metal, edge]);
        groove(neck + 1, snapAt - 1.2 * k, group);
        const tip = new THREE.Group();
        add(tip, slab(profile(snapAt, Infinity, true, false), bladeThick, 0.25 * k), [metal, edge]);
        groove(snapAt + 1.2 * k, tipX - 5 * k, tip);
        const pivot = new THREE.Group();
        tip.position.set(-(snapAt + tipX) / 2, 0, 0);
        pivot.add(tip);
        pivot.position.set((snapAt + tipX) / 2 + (3 + random() * 4) * k, -(4 + random() * 6) * k * (random() > 0.5 ? 1 : -1), 0);
        pivot.rotation.z = (random() - 0.5) * 1.6;
        group.add(pivot);
      } else {
        add(group, warp(slab(profile(-Infinity, Infinity, false, false), bladeThick, 0.25 * k)), [metal, edge]);
        groove(neck + 1, tipX - 5 * k, group);
      }
      if (options.cap !== 'none') {
        const rubber = new THREE.Color({ red: '#d6343a', blue: '#2f6fd0', yellow: '#efc52e', green: '#33a561' }[options.cap]).lerp(new THREE.Color('#b9b3a4'), mood.wear * 0.4);
        add(group, slab(bowShape(1.07), thick * 1.9, 0.8 * k), new THREE.MeshStandardMaterial({ color: rubber, roughness: mix(0.55, 0.95, mood.wear) }));
      }
      return { group, bowR, cx, thick, tipX, reach: tipX };
    };

    const stamps = ['SC1', 'KW1', 'Y1', 'UL050', 'M1', '1A'];
    const hero = makeKey({ bow: a.bow, metal: a.metal, state: a.state, scale: 1, cap: a.cap, stamp: stamps[Math.floor(random() * stamps.length)] });
    const holder = new THREE.Group();
    holder.add(hero.group);
    s.root.add(holder);
    const capLift = a.cap === 'none' ? hero.thick / 2 : hero.thick * 1.05;
    const loose = a.carrying === 'bare';

    if (loose && a.pose === 'upright') {
      hero.group.rotation.z = Math.PI / 2;
      holder.rotation.y = (random() - 0.5) * 0.4;
    } else if (loose && a.pose === 'leaning') {
      // Bow edge down, blade raised, the whole thing tipped back.
      hero.group.rotation.z = Math.PI / 2;
      holder.rotation.x = -(0.75 + random() * 0.25);
      holder.rotation.y = (random() - 0.5) * 0.6;
    } else {
      hero.group.rotation.x = -Math.PI / 2;
      holder.position.y = capLift;
      holder.rotation.y = loose ? (random() - 0.5) * 0.7 : 0;
    }

    if (!loose) {
      const ringR = 9.5, wireR = 0.75, tilt = 0.42;
      // Key tips up from its point so the ring can pass through the bow hole.
      const rise = ringR * Math.sin(tilt) + wireR;
      const slope = Math.asin(Math.min(0.9, (rise - capLift) / hero.tipX));
      holder.rotation.z = -slope;
      holder.position.set(0, rise, 0);
      const hoop = new THREE.Group();
      hoop.position.set(-ringR * 0.98, rise, 0);
      hoop.rotation.x = Math.PI / 2 - tilt;
      s.root.add(hoop);
      if (a.carrying === 'string') {
        const points: THREE.Vector3[] = [new THREE.Vector3(0, rise + 0.6, 0)];
        const loops = 12;
        for (let i = 1; i < loops; i++) {
          const t = (i / loops) * Math.PI * 2;
          points.push(new THREE.Vector3(-28 + Math.cos(t) * 28 * (1 + (random() - 0.5) * 0.25), 0.7 + (i === 1 || i === loops - 1 ? rise * 0.5 : 0), Math.sin(t) * 20 * (1 + (random() - 0.5) * 0.3)));
        }
        points.push(new THREE.Vector3(0, rise - 0.6, 0));
        const cord = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e6dcc2').lerp(new THREE.Color('#7d6f55'), mood.wear * 0.7), roughness: 1 });
        add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 120, 0.7, 6, true), cord);
        const knot = add(s.root, new THREE.SphereGeometry(1.5, 10, 8), cord);
        knot.position.copy(points[6]).setY(1.3);
        knot.scale.set(1.3, 0.9, 1);
        hoop.removeFromParent();
      } else {
        for (const shift of [-0.55, 0.55]) add(hoop, new THREE.TorusGeometry(ringR, wireR, 8, 56), steel).position.z = shift;
      }
      if (a.carrying === 'bunch') {
        for (const [i, turn] of [2.1, -2.3].entries()) {
          const extra = makeKey({ bow: (['square', 'round', 'hex', 'oval'] as const)[Math.floor(random() * 4)], metal: i ? 'nickel' : 'brass', state: 'cut', scale: 0.68 + random() * 0.16, cap: 'none', stamp: stamps[i] });
          const arm = new THREE.Group();
          extra.group.rotation.x = -Math.PI / 2;
          arm.add(extra.group);
          arm.rotation.y = turn + (random() - 0.5) * 0.5;
          arm.position.set(-ringR * 0.98 + Math.cos(-arm.rotation.y) * ringR * 0.9, extra.thick / 2 + (i ? 0 : 0.2), Math.sin(-arm.rotation.y) * ringR * 0.75);
          s.root.add(arm);
        }
      }
      if (a.carrying === 'tag') {
        // A manila luggage tag on a short twist of string.
        const w = 38, h = 20;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 270;
        const g = canvas.getContext('2d')!;
        g.beginPath();
        g.moveTo(70, 0); g.lineTo(512, 0); g.lineTo(512, 270); g.lineTo(70, 270); g.lineTo(0, 200); g.lineTo(0, 70);
        g.closePath();
        g.clip();
        g.fillStyle = `#${new THREE.Color('#ead9ae').lerp(new THREE.Color('#a8926a'), mood.wear * 0.6).getHexString()}`;
        g.fillRect(0, 0, 512, 270);
        g.strokeStyle = '#b5483c';
        g.lineWidth = 5;
        g.strokeRect(96, 22, 394, 226);
        g.fillStyle = '#c9b68a';
        g.beginPath(); g.arc(54, 135, 30, 0, 7); g.fill();
        const words = { spare: 'SPARE', mum: "MUM'S", flat: 'FLAT 3B', shed: 'SHED', home: 'HOME', back: 'BACK DOOR', query: '?', blank: '' }[a.label];
        g.fillStyle = `rgba(28,44,140,${mix(0.95, 0.45, mood.wear)})`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `italic bold ${words.length > 6 ? 78 : 118}px cursive`;
        g.save();
        g.translate(294, 138);
        g.rotate(Math.PI - 0.06 + random() * 0.1); // the tag trails back from the ring, so this reads upright
        g.fillText(words, 0, 0, 360);
        g.restore();
        g.fillStyle = `rgba(110,80,30,${mood.wear * 0.3})`;
        for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(random() * 512, random() * 270, 20 + random() * 60, 14 + random() * 40, random() * 3, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(54, 135, 15, 0, 7); g.fill();
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const geometry = new THREE.PlaneGeometry(w, h, 10, 4);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.getAttribute('position');
        const wave = random() * 6;
        for (let i = 0; i < position.count; i++) position.setY(i, 0.5 + (Math.sin(position.getX(i) * 0.16 + wave) * 0.5 + 0.5) * mix(0.6, 2.4, mood.wear) + Math.max(0, position.getX(i) - 8) * 0.06);
        geometry.computeVertexNormals();
        const tag = add(new THREE.Group(), geometry, new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
        const swing = new THREE.Group();
        const turn = Math.PI * (0.62 + random() * 0.2) * (random() > 0.5 ? 1 : -1);
        tag.position.set(w / 2 + 9, 0, 0);
        swing.add(tag);
        swing.rotation.y = turn;
        swing.position.set(-ringR * 0.98 + Math.cos(-turn) * ringR * 0.8, 0, Math.sin(-turn) * ringR * 0.6);
        s.root.add(swing);
        swing.updateMatrixWorld(true);
        const eyelet = swing.localToWorld(new THREE.Vector3(9 + w * (54 / 512), 1.2, 0));
        const ringEdge = new THREE.Vector3(swing.position.x, rise * 0.6, swing.position.z);
        const mid = eyelet.clone().lerp(ringEdge, 0.5).add(new THREE.Vector3(0, 2.5, 0));
        add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([eyelet.clone().setY(0.4), eyelet, mid, ringEdge, mid.clone().add(new THREE.Vector3(1.2, -1.5, 1.2)), eyelet.clone().add(new THREE.Vector3(0.8, -0.6, 0.8))]), 40, 0.4, 5), new THREE.MeshStandardMaterial({ color: '#e8e0cb', roughness: 1 }));
      }
    }
    return s.finish();
  },
});

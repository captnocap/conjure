import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Style = 'widebrim' | 'halo' | 'pillbox' | 'cloche' | 'fascinator';
type Trim = 'flowers' | 'feathers' | 'bows' | 'stones' | 'plain';

const PALETTES = {
  pastels: { hats: ['#f4b8cb', '#bcd9f2', '#f5e79e', '#bfe6c8', '#dcc4f0', '#fbcfae'], accents: ['#ffffff', '#f06a9a', '#6a9ad8', '#e8c63a'] },
  jewel: { hats: ['#7a1f8f', '#0f6d6a', '#b3124a', '#1f3fa8', '#d18a10', '#0f7a3a'], accents: ['#f2c230', '#17161a', '#f5efe2', '#e0407a'] },
  black: { hats: ['#17161a', '#1f1d22', '#26232b', '#141318', '#2b2a30'], accents: ['#17161a', '#3a2a44', '#5a5a62', '#f5efe2'] },
  ivory: { hats: ['#f5efe2', '#ece2cf', '#f8f4ec', '#e6d6bf', '#dcc6a6'], accents: ['#d6b56a', '#f5efe2', '#e8b8c0', '#b9c8d8'] },
  red: { hats: ['#b3121f', '#d01c2a', '#8f0f1c', '#e2333f', '#a81530'], accents: ['#17161a', '#f5efe2', '#f2c230', '#b3121f'] },
  mixed: { hats: ['#f4b8cb', '#17161a', '#0f6d6a', '#f5efe2', '#d01c2a', '#f5e79e', '#1f3fa8'], accents: ['#f2c230', '#17161a', '#f5efe2', '#e0407a'] },
} as const;

function weave(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 16; i++) {
    const shade = 175 + Math.floor(random() * 80);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, i * 4 + 2); ctx.lineTo(64, i * 4 + 2); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(i * 4 + 2, 0); ctx.lineTo(i * 4 + 2, 64); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 8);
  return texture;
}

function netting(dark: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = dark ? '#1a181d' : '#fbf8f0';
  ctx.lineWidth = 3.4;
  for (let i = -8; i < 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16 + 128, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 16 + 128, 0); ctx.lineTo(i * 16, 128); ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) if ((x + y) % 2 === 0) { ctx.beginPath(); ctx.arc(x * 32 + 8, y * 32 + 8, 4.5, 0, Math.PI * 2); ctx.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    occasion: choice('What occasion are the hats for?', {
      easter: 'Easter service: flowers on everything, a basket of eggs at the foot.',
      races: 'A day at the races: feathers, fascinators, a rosette and a betting slip.',
      funeral: 'A funeral: sober shapes, gloves and an order of service laid at the foot.',
      wedding: 'A wedding: bows and wide brims, confetti scattered round the base.',
      sunday: 'An ordinary Sunday: the regular rotation of good church hats.',
    }),
    colours: choice('What colour family are the hats?', {
      pastels: 'Sugar-almond pastels: pink, powder blue, lemon, mint.',
      jewel: 'Jewel tones: purple, teal, magenta, royal blue.',
      black: 'All black, differing only in texture and trim.',
      ivory: 'Ivory, cream and champagne.',
      red: 'Reds, from cherry to oxblood.',
      mixed: 'A lifetime of hats in every colour.',
    }),
    extravagance: score('How extravagant are the hats?', ['Modest and close-fitting', 'Respectable', 'Showy', 'Enormous: brims like cartwheels and trim a foot high']),
    hero: choice('What is the hat in pride of place?', {
      widebrim: 'A wide downswept brim that shades the whole face.',
      halo: 'An upturned halo brim that frames the face like a crown.',
      pillbox: 'A neat pillbox worn straight on the head.',
      cloche: 'A deep bell-shaped cloche pulled low.',
      fascinator: 'A fascinator: a small tilted disc that is nearly all trim.',
    }),
    trim: choice('What trims the best hat?', {
      flowers: 'Silk flowers clustered at the band.',
      feathers: 'A spray of tall feathers.',
      bows: 'One huge stiff bow.',
      stones: 'A glittering band of rhinestones.',
      plain: 'Nothing but a ribbon band.',
    }),
    veil: choice('Do the hats have veils?', {
      none: 'No veils.',
      up: 'The best hat has a net veil, folded up over the crown.',
      down: 'The best hat has a net veil hanging down where the face would be.',
      all: 'Every hat has a veil down, a row of hidden faces.',
    }),
    stand: choice('What do the hats sit on?', {
      tree: 'A tall brass hat tree with curved arms, one hat at the top.',
      risers: 'A stepped shop display: wire stalks of different heights on tiered risers.',
      boxes: 'A stack of round hatboxes, the best hat on top and others on stalks beside it.',
    }),
    story: choice('What has happened here?', {
      ready: 'Every hat is in its place, waiting for Sunday.',
      chosen: 'One rest is empty: that hat is being worn today. A hatpin lies where it was.',
      fallen: 'One hat has fallen and lies upside down on the floor.',
      boxed: 'One hat is being put away: an open hatbox with tissue paper sits at the foot.',
      tagged: 'They are for sale: a price tag dangles from every hat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const ex = a.extravagance;
    const palette = PALETTES[a.colours];
    const tone = (hex: string) => {
      const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s * mix(0.65, 1.05, mood.cheer), hsl.l * mix(1, 0.9, mood.wear)).lerp(new THREE.Color('#8f8676'), mood.wear * 0.2);
    };
    const straw = weave(random);
    const darkNet = a.colours === 'black' || a.occasion === 'funeral' || a.colours === 'jewel' || a.colours === 'red';
    const net = netting(darkNet);
    const netMaterial = (repeatX: number, repeatY: number) => {
      const map = net.clone();
      map.repeat.set(repeatX, repeatY);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, roughness: 0.9 });
    };
    const swayers: { node: THREE.Object3D; rest: number; phase: number; amount: number }[] = [];

    const makeHat = (style: Style, trim: Trim, veil: 'none' | 'up' | 'down', tagged: boolean, isHero: boolean) => {
      const g = new THREE.Group();
      const add = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const colour = tone(pick(palette.hats));
      const accent = tone(pick(palette.accents));
      const felt = style === 'pillbox' || style === 'cloche';
      const body = new THREE.MeshStandardMaterial({ color: colour, map: felt ? null : straw, roughness: felt ? 0.95 : 0.7, side: THREE.DoubleSide });
      const trimMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45, side: THREE.DoubleSide });
      const CR = 0.088;
      let crownH = 0.09, brimR = CR, bandY = 0.014;
      const lathe = (profile: [number, number][], wave = 0, waves = 2) => {
        const geo = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40);
        if (wave) {
          const p = geo.attributes.position;
          const phase = random() * 6;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
            if (r > CR * 1.05) p.setY(i, p.getY(i) + Math.sin(Math.atan2(z, x) * waves + phase) * wave * (r - CR) / (brimR - CR));
          }
          geo.computeVertexNormals();
        }
        return add(new THREE.Mesh(geo, body));
      };
      if (style === 'widebrim') {
        brimR = mix(0.17, 0.36, ex) * mix(0.92, 1.08, random());
        crownH = mix(0.075, 0.1, random());
        const droop = mix(0.015, 0.06, random());
        lathe([[brimR, -droop], [brimR * 0.75, -droop * 0.35], [CR + 0.01, 0], [CR, 0.012], [CR * 0.98, crownH * 0.75], [CR * 0.8, crownH], [0.001, crownH * 1.04]], mix(0.008, 0.04, ex), 2 + Math.floor(random() * 2));
      } else if (style === 'halo') {
        brimR = mix(0.15, 0.3, ex) * mix(0.92, 1.08, random());
        crownH = 0.07;
        const lift = brimR * mix(0.45, 0.8, random());
        lathe([[brimR, lift], [brimR * 0.8, lift * 0.55], [CR + 0.012, 0.004], [CR, 0.012], [CR * 0.97, crownH * 0.8], [CR * 0.75, crownH], [0.001, crownH * 1.03]], mix(0.004, 0.02, ex), 3);
      } else if (style === 'pillbox') {
        crownH = mix(0.06, 0.085, ex);
        lathe([[CR * 1.02, 0], [CR * 1.04, crownH * 0.85], [CR * 0.96, crownH], [0.001, crownH]]);
        bandY = crownH * 0.5;
      } else if (style === 'cloche') {
        crownH = 0.13;
        brimR = CR * mix(1.25, 1.5, ex);
        lathe([[brimR, -0.035], [CR * 1.12, -0.012], [CR * 1.04, 0.03], [CR * 1.02, 0.08], [CR * 0.78, 0.12], [0.001, crownH]]);
        bandY = 0.03;
      } else {
        crownH = 0.022;
        brimR = mix(0.06, 0.1, ex);
        const disc = lathe([[brimR, 0], [brimR * 0.96, 0.012], [brimR * 0.5, 0.02], [0.001, crownH]]);
        disc.position.y = 0.05;
        const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(CR * 0.95, 0.003, 6, 24, Math.PI), trimMaterial));
        hoop.position.y = -0.03;
      }
      const top = style === 'fascinator' ? 0.07 : crownH;
      const sideX = style === 'fascinator' ? 0 : CR * 0.9;
      const baseY = style === 'fascinator' ? 0.068 : bandY;
      // ribbon band
      if (style !== 'fascinator') {
        const band = add(new THREE.Mesh(new THREE.CylinderGeometry(CR * (style === 'cloche' ? 1.06 : 1.03), CR * (style === 'cloche' ? 1.08 : 1.045), 0.022, 32, 1, true), trimMaterial));
        band.position.y = bandY + 0.008;
      }
      // trims sit at the side-front of the crown
      const at = new THREE.Group();
      at.position.set(sideX * 0.8, baseY + 0.012, sideX * 0.55);
      g.add(at);
      const put = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = true; at.add(mesh); return mesh; };
      const big = mix(0.7, 1.9, ex) * (isHero ? 1.15 : 0.9);
      if (trim === 'flowers') {
        const count = Math.round(mix(2, 7, ex));
        const petals: THREE.BufferGeometry[] = [];
        for (let k = 0; k < 6; k++) petals.push(new THREE.SphereGeometry(0.011, 6, 5).scale(1, 0.5, 1.5).translate(0, 0, 0.013).rotateY(k / 6 * Math.PI * 2));
        const flower = mergeGeometries(petals)!;
        petals.forEach((geo) => geo.dispose());
        const centre = new THREE.SphereGeometry(0.007, 6, 5);
        const heart = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.6 });
        for (let i = 0; i < count; i++) {
          const material = new THREE.MeshStandardMaterial({ color: tone(pick(palette.accents)), roughness: 0.6 });
          const size = big * mix(0.8, 1.3, random());
          const t = (i - count / 2) * 0.42;
          const m = put(new THREE.Mesh(i ? flower.clone() : flower, material));
          m.scale.setScalar(size);
          m.position.set(Math.cos(t) * 0.02 - Math.abs(t) * 0.03, 0.006 + random() * 0.02 * big, -Math.sin(t) * CR * 0.9);
          m.rotation.set(jitter(0.6), random() * 6, jitter(0.6) - 0.5);
          const c = put(new THREE.Mesh(centre, heart));
          c.position.copy(m.position).add(new THREE.Vector3(0, 0.006 * size, 0));
        }
      } else if (trim === 'feathers') {
        const count = Math.round(mix(2, 6, ex));
        const quill = new THREE.Shape();
        quill.moveTo(0, 0);
        quill.bezierCurveTo(0.03, 0.05, 0.028, 0.16, 0, 0.22);
        quill.bezierCurveTo(-0.022, 0.16, -0.02, 0.05, 0, 0);
        const geo = new THREE.ShapeGeometry(quill, 8);
        const spray = new THREE.Group();
        for (let i = 0; i < count; i++) {
          const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: tone(pick(palette.accents)), roughness: 0.8, side: THREE.DoubleSide }));
          m.castShadow = true;
          m.scale.set(big * 0.9, big * mix(0.7, 1.15, random()), 1);
          m.rotation.set(jitter(0.25) - 0.15, jitter(0.6), (i - (count - 1) / 2) * 0.3 - 0.25);
          spray.add(m);
          const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.22, 4).translate(0, 0.11, 0), trimMaterial);
          m.add(spine);
        }
        at.add(spray);
        swayers.push({ node: spray, rest: 0, phase: random() * 6, amount: 0.05 });
      } else if (trim === 'bows') {
        const w = 0.05 * big;
        for (const side of [-1, 1]) {
          const loop = put(new THREE.Mesh(new THREE.TorusGeometry(w * 0.62, w * 0.3, 6, 16), trimMaterial));
          loop.scale.set(1.5, 0.9, 0.55);
          loop.position.set(0, w * 0.5, side * w * 0.95);
          loop.rotation.set(0, Math.PI / 2, side * 0.25);
          const tail = put(new THREE.Mesh(new THREE.BoxGeometry(0.002, w * 1.5, w * 0.6), trimMaterial));
          tail.position.set(0.004, -w * 0.3, side * w * 0.5);
          tail.rotation.x = side * 0.5;
        }
        put(new THREE.Mesh(new THREE.SphereGeometry(w * 0.34, 8, 6), trimMaterial)).position.set(0, w * 0.5, 0);
      } else if (trim === 'stones') {
        const gems: { at: [number, number, number]; size: number; color: string }[] = [];
        const rows = 1 + Math.round(ex * 2);
        const r = style === 'fascinator' ? brimR * 0.9 : CR * (style === 'cloche' ? 1.09 : 1.06);
        for (let row = 0; row < rows; row++) for (let k = 0; k < 30; k++) {
          const t = (k + row * 0.5) / 30 * Math.PI * 2;
          gems.push({ at: [Math.cos(t) * r, baseY + 0.004 + row * 0.011, Math.sin(t) * r], size: 1, color: k % 5 === 0 ? '#ffe9a8' : '#ffffff' });
        }
        const stones = s.scatter(new THREE.SphereGeometry(0.0048, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.9, roughness: 0.12, emissive: '#b8c8ff', emissiveIntensity: 0.25 }), gems);
        g.add(stones);
        const brooch = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.014 * big), new THREE.MeshStandardMaterial({ color: accent, metalness: 0.6, roughness: 0.1 })));
        brooch.position.set(0.01, 0.01, 0);
      }
      // veil
      if (veil === 'down') {
        const r = Math.max(CR * 1.15, Math.min(brimR * 0.9, CR * 2));
        const drop = mix(0.14, 0.2, random());
        const veilTop = style === 'fascinator' ? 0.05 : style === 'cloche' ? -0.02 : 0.004;
        const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, drop, 28, 1, true, -1.25, 2.5), netMaterial(6, 3)));
        mesh.position.y = veilTop - drop / 2;
      } else if (veil === 'up') {
        const mesh = add(new THREE.Mesh(new THREE.TorusGeometry(CR * 0.95, 0.03, 8, 28), netMaterial(10, 2)));
        mesh.rotation.x = Math.PI / 2;
        mesh.scale.z = 0.8;
        mesh.position.y = style === 'fascinator' ? 0.075 : Math.min(top, bandY + 0.05);
      }
      if (tagged) {
        const tag = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.001), new THREE.MeshStandardMaterial({ color: '#f6f0dc', roughness: 0.9 })));
        const reach = Math.max(brimR, CR) * 0.98;
        tag.position.set(-reach * 0.7, style === 'halo' ? -0.03 : -0.065, reach * 0.7);
        tag.rotation.set(0, -0.7, jitter(0.4));
        const string = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.06, 4), new THREE.MeshStandardMaterial({ color: '#d8ccb0' })));
        string.position.set(-reach * 0.7, tag.position.y + 0.04, reach * 0.7);
      }
      g.scale.z = 1.08;
      return { group: g, brimR, style };
    };

    // ---- the stand and its rests
    const brass = s.material({ tree: '#b9923c', risers: '#e9e9ec', boxes: '#b9923c' }[a.stand], { metalness: 0.85, roughness: 0.3 });
    const restMaterial = s.material(a.stand === 'risers' ? '#f3f1ec' : '#3b2f2a', { roughness: 0.8 });
    const rests: { x: number; y: number; z: number; yaw: number }[] = [];
    const rest = (x: number, y: number, z: number, yaw = 0) => {
      s.ball([0.08, 0.055, 0.086], [x, y, z], restMaterial, 18);
      rests.push({ x, y: y + 0.012, z, yaw });
    };
    const want = 4 + Math.round(mix(0, 3, mood.density * 0.7 + ex * 0.3));
    let floorSpot: [number, number] = [0.45, 0.4];
    if (a.stand === 'tree') {
      const H = 0.95;
      s.lathe([[0.001, 0], [0.24, 0], [0.245, 0.02], [0.2, 0.04], [0.06, 0.06], [0.03, 0.1], [0.018, 0.16], [0.001, 0.16]], brass);
      s.cylinder(0.014, 0.018, H, [0, H / 2, 0], brass, 12);
      for (const y of [0.3, 0.6]) s.ball([0.03, 0.03, 0.03], [0, y, 0], brass, 12);
      rest(0, H + 0.03, 0);
      const tiers = [{ y: 0.72, n: 3, r: 0.33, off: 0.5 }, { y: 0.42, n: 3, r: 0.4, off: 1.55 }];
      for (const tier of tiers) for (let i = 0; i < tier.n; i++) {
        if (rests.length >= want) break;
        const t = tier.off + i / tier.n * Math.PI * 2;
        const x = Math.sin(t) * tier.r, z = Math.cos(t) * tier.r;
        s.tube([[0, tier.y - 0.14, 0], [x * 0.45, tier.y - 0.16, z * 0.45], [x * 0.9, tier.y - 0.1, z * 0.9], [x, tier.y - 0.02, z]], 0.008, brass);
        rest(x, tier.y, z, t);
      }
      floorSpot = [0.42, 0.42];
    } else if (a.stand === 'risers') {
      const riser = s.material(a.colours === 'black' || a.occasion === 'funeral' ? '#4a4650' : '#efe9df', { roughness: 0.7 });
      const steps = [{ y: 0.12, z: 0.3, d: 0.3 }, { y: 0.3, z: 0, d: 0.3 }, { y: 0.48, z: -0.3, d: 0.3 }];
      for (const step of steps) s.box([1.3, step.y, step.d], [0, step.y / 2, step.z], riser);
      const spots: [number, number, number][] = [[0, 2, 0.5], [-0.42, 1, 0.3], [0.42, 1, 0.34], [-0.4, 0, 0.2], [0.02, 0, 0.16], [0.44, 0, 0.22], [-0.45, 2, 0.26]];
      for (const [x, stepIndex, stalk] of spots) {
        if (rests.length >= want) break;
        const step = steps[stepIndex];
        s.cylinder(0.05, 0.055, 0.012, [x, step.y + 0.006, step.z], brass, 16);
        s.cylinder(0.005, 0.005, stalk, [x, step.y + stalk / 2, step.z], brass, 8);
        rest(x, step.y + stalk + 0.03, step.z);
      }
      floorSpot = [0.3, 0.62];
    } else {
      const sizes = [0.26, 0.22, 0.18];
      let y = 0;
      const stripes = palette.hats;
      sizes.forEach((r, i) => {
        const h = 0.2 - i * 0.02;
        const x = jitter(0.03), z = jitter(0.03);
        s.cylinder(r, r, h, [x, y + h / 2, z], s.material(tone(stripes[i % stripes.length]), { roughness: 0.75 }), 32);
        s.cylinder(r + 0.008, r + 0.008, 0.045, [x, y + h - 0.02, z], s.material(tone(stripes[(i + 2) % stripes.length]).multiplyScalar(0.8), { roughness: 0.7 }), 32);
        s.ring(r * 0.5, 0.004, [x + r + 0.004, y + h * 0.55, z], brass, Math.PI).rotation.set(0, Math.PI / 2, Math.PI);
        y += h;
      });
      s.cylinder(0.005, 0.005, 0.12, [0, y + 0.06, 0], brass, 8);
      rest(0, y + 0.15, 0);
      const spots: [number, number, number][] = [[-0.42, 0.1, 0.38], [0.42, 0.14, 0.52], [-0.3, 0.34, 0.24], [0.34, 0.36, 0.3], [0.02, 0.4, 0.2], [-0.52, -0.2, 0.6]];
      for (const [x, z, stalk] of spots) {
        if (rests.length >= want) break;
        s.cylinder(0.06, 0.065, 0.014, [x, 0.007, z], brass, 16);
        s.cylinder(0.005, 0.005, stalk, [x, stalk / 2, z], brass, 8);
        rest(x, stalk + 0.03, z);
      }
      floorSpot = [0.1, 0.62];
    }

    // ---- hats
    const mixByOccasion: Record<typeof a.occasion, Style[]> = {
      easter: ['widebrim', 'widebrim', 'halo', 'cloche', 'pillbox'],
      races: ['fascinator', 'fascinator', 'widebrim', 'halo', 'pillbox'],
      funeral: ['pillbox', 'cloche', 'widebrim', 'pillbox', 'halo'],
      wedding: ['widebrim', 'halo', 'fascinator', 'widebrim', 'pillbox'],
      sunday: ['halo', 'widebrim', 'pillbox', 'cloche', 'halo'],
    };
    const trimByOccasion: Record<typeof a.occasion, Trim[]> = {
      easter: ['flowers', 'flowers', 'bows', 'plain'],
      races: ['feathers', 'feathers', 'flowers', 'bows'],
      funeral: ['plain', 'bows', 'feathers', 'plain'],
      wedding: ['bows', 'flowers', 'stones', 'feathers'],
      sunday: ['bows', 'flowers', 'stones', 'feathers', 'plain'],
    };
    const tagged = a.story === 'tagged';
    const skip = a.story === 'chosen' || a.story === 'fallen' || a.story === 'boxed' ? Math.min(1, rests.length - 1) : -1;
    rests.forEach((spot, index) => {
      const isHero = index === 0;
      const style = isHero ? a.hero : pick(mixByOccasion[a.occasion]);
      const trim = isHero ? a.trim : pick(trimByOccasion[a.occasion]);
      const veil = a.veil === 'all' ? 'down' : isHero && a.veil !== 'none' ? a.veil : 'none';
      const hat = makeHat(style, trim, veil, tagged, isHero);
      if (index === skip) {
        if (a.story === 'chosen') {
          // the hatpin left behind
          s.rod([spot.x - 0.05, spot.y + 0.05, spot.z + 0.03], [spot.x + 0.06, spot.y + 0.047, spot.z + 0.05], 0.0012, s.material('#d8d8dc', { metalness: 0.9, roughness: 0.2 }));
          s.ball([0.008, 0.008, 0.008], [spot.x + 0.065, spot.y + 0.047, spot.z + 0.051], s.material('#f5efe2', { roughness: 0.2 }), 8);
          hat.group.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } });
          return;
        }
        if (a.story === 'fallen') {
          hat.group.position.set(floorSpot[0] + jitter(0.05), 0.1, floorSpot[1] + jitter(0.05));
          hat.group.rotation.set(Math.PI - 0.25 + jitter(0.1), random() * 6, jitter(0.15));
          s.root.add(hat.group);
          return;
        }
        // boxed: the hat sits in an open hatbox
        const [bx, bz] = floorSpot;
        const boxColour = tone(pick(palette.hats));
        const card = s.material(boxColour, { roughness: 0.8, side: THREE.DoubleSide });
        s.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.17, 32, 1, true), card, [bx, 0.085, bz]);
        s.cylinder(0.2, 0.2, 0.01, [bx, 0.005, bz], card, 32);
        const tissue = s.material('#fbf8f0', { roughness: 0.95, side: THREE.DoubleSide });
        for (let i = 0; i < 5; i++) {
          const t = i / 5 * Math.PI * 2 + jitter(0.4);
          const sheet = s.mesh(new THREE.ConeGeometry(0.1, 0.12, 4, 1, true), tissue, [bx + Math.cos(t) * 0.13, 0.17, bz + Math.sin(t) * 0.13]);
          sheet.rotation.set(Math.PI + jitter(0.4), t, jitter(0.4));
        }
        const lid = s.cylinder(0.21, 0.21, 0.04, [bx + 0.3, 0.2, bz - 0.06], s.material(boxColour.clone().multiplyScalar(0.8), { roughness: 0.8 }), 32);
        lid.rotation.z = Math.PI / 2 - 0.35;
        lid.position.y = 0.2;
        const fit = Math.min(1, 0.19 / Math.max(hat.brimR, 0.09));
        hat.group.scale.multiplyScalar(fit);
        hat.group.position.set(bx, 0.15, bz);
        hat.group.rotation.set(jitter(0.12), random() * 6, jitter(0.12));
        s.root.add(hat.group);
        return;
      }
      hat.group.position.set(spot.x, spot.y, spot.z);
      const slump = mood.wear * 0.2 + mood.energy * 0.06;
      hat.group.rotation.set(jitter(0.08 + slump) + (hat.style === 'fascinator' ? 0.3 : 0.04), spot.yaw + jitter(0.5), jitter(0.1 + slump) + (hat.style === 'fascinator' ? 0.25 : 0));
      s.root.add(hat.group);
    });

    // ---- what the occasion leaves at the foot
    const [fx, fz] = [-floorSpot[0], floorSpot[1]];
    if (a.occasion === 'easter') {
      const wicker = s.material('#b98a48', { roughness: 0.9 });
      s.lathe([[0.001, 0], [0.09, 0], [0.13, 0.09], [0.135, 0.1], [0.12, 0.1], [0.085, 0.015], [0.001, 0.015]], wicker, [fx, 0, fz]);
      s.ring(0.125, 0.007, [fx, 0.1, fz], wicker, Math.PI);
      const eggs = Array.from({ length: 5 + Math.floor(random() * 4) }, () => ({
        at: [fx + jitter(0.07), 0.07 + random() * 0.03, fz + jitter(0.07)] as [number, number, number], size: 1, color: tone(pick(PALETTES.pastels.hats)),
      }));
      s.scatter(new THREE.SphereGeometry(0.028, 10, 8).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), eggs);
    } else if (a.occasion === 'races') {
      const ribbon = s.material(tone(pick(['#1f3fa8', '#b3121f', '#0f7a3a'])), { roughness: 0.5, side: THREE.DoubleSide });
      const ry = a.stand === 'tree' ? 0.3 : 0.06, rz = a.stand === 'tree' ? 0.03 : fz;
      const rx = a.stand === 'tree' ? 0 : fx;
      const lie = a.stand === 'tree' ? 0 : -Math.PI / 2 + 0.2;
      const rosette = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 18).rotateX(Math.PI / 2), ribbon);
      const middle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 18).rotateX(Math.PI / 2), s.material('#f2c230', { metalness: 0.6, roughness: 0.3 }));
      rosette.add(disc, middle);
      for (const side of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.002), ribbon);
        tail.position.set(side * 0.022, -0.11, -0.002); tail.rotation.z = side * 0.18;
        rosette.add(tail);
      }
      rosette.traverse((node) => { node.castShadow = true; });
      rosette.position.set(rx, ry, rz); rosette.rotation.x = lie;
      s.root.add(rosette);
      s.box([0.08, 0.002, 0.14], [fx + 0.16, 0.002, fz + 0.04], s.material('#f3e9c8')).rotation.y = jitter(0.8);
    } else if (a.occasion === 'funeral') {
      const card = s.label('IN LOVING MEMORY', 0.2, 0.14, [fx, 0.004, fz], '#26232b', '#f6f2e6');
      card.rotation.set(-Math.PI / 2, 0, jitter(0.5));
      const glove = s.material('#17161a', { roughness: 0.9 });
      for (const side of [0, 1]) {
        const gx = fx + 0.2 + side * 0.03, gz = fz - 0.05 + side * 0.05;
        s.ball([0.04, 0.012, 0.075], [gx, 0.012 + side * 0.012, gz], glove, 10).rotation.y = 0.4 + side * 0.5;
        for (let f = 0; f < 4; f++) s.ball([0.009, 0.008, 0.035], [gx - 0.05 + f * 0.016 + side * 0.03, 0.01 + side * 0.012, gz + 0.085 - side * 0.03], glove, 6).rotation.y = 0.4 + side * 0.5;
      }
      const lily = s.material('#f8f5ec', { roughness: 0.6 });
      s.rod([fx - 0.14, 0.006, fz - 0.1], [fx + 0.1, 0.006, fz - 0.22], 0.004, s.material('#3f6a3a'));
      s.mesh(new THREE.ConeGeometry(0.035, 0.08, 6, 1, true), lily, [fx + 0.13, 0.018, fz - 0.235]).rotation.set(0, 0.45, -Math.PI / 2);
    } else if (a.occasion === 'wedding') {
      const count = Math.round(mix(40, 160, mood.density * 0.5 + mood.cheer * 0.5));
      const bits = Array.from({ length: count }, () => {
        const t = random() * Math.PI * 2, r = 0.2 + random() * 0.55;
        return { at: [Math.cos(t) * r, 0.002 + random() * 0.002, Math.sin(t) * r * 0.9 + 0.1] as [number, number, number], size: mix(0.6, 1.3, random()), color: tone(pick(['#f4b8cb', '#ffffff', '#f5e79e', '#bcd9f2', '#f6d7e0'])) };
      });
      s.scatter(new THREE.CylinderGeometry(0.008, 0.008, 0.001, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), bits);
    } else {
      // an ordinary Sunday: a hymn book and a paper fan
      s.box([0.11, 0.03, 0.16], [fx, 0.015, fz], s.material('#3a1f2a', { roughness: 0.7 })).rotation.y = jitter(0.6);
      s.box([0.1, 0.004, 0.15], [fx, 0.031, fz], s.material('#d6b56a', { metalness: 0.6, roughness: 0.4 })).rotation.y = 0.2;
      const fan = s.mesh(new THREE.CircleGeometry(0.1, 16, 0.3, 2.5), s.material('#f3e9c8', { side: THREE.DoubleSide }), [fx + 0.22, 0.004, fz - 0.02]);
      fan.rotation.set(-Math.PI / 2, 0, jitter(1));
      s.box([0.012, 0.003, 0.14], [fx + 0.22, 0.003, fz + 0.03], s.material('#b98a48'));
    }

    const energy = mix(0.15, 1.2, mood.energy);
    return s.finish({
      footprint: a.stand === 'tree' ? 0.5 : 0.7,
      update: (_dt, time) => { for (const item of swayers) item.node.rotation.z = item.rest + Math.sin(time * 1.3 * energy + item.phase) * item.amount * energy; },
    });
  },
});

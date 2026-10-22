import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drapeRound, into } from './helpers';

const TAU = Math.PI * 2;
const ACCENT = {
  blush: ['#e9a9b4', '#f6d9d6', '#c9707f'],
  gold: ['#d9ad4c', '#f3dc9a', '#b8872a'],
  burgundy: ['#7c1f36', '#b0445a', '#4f1022'],
  blue: ['#7fa6dc', '#cfe0f5', '#4f73b3'],
  wild: ['#f1c232', '#d9548a', '#6f58c9'],
} as const;
const CLOTH = { ivory: '#f2ebdb', blush: '#eccac6', sage: '#a8b79a', navy: '#2e3c5e', gold: '#cdb078' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of wedding cake is it?', {
      royal: 'Stiff white royal icing, tiers held apart on little columns, piped bead borders: formal and old-fashioned.',
      naked: 'Bare sponge layers with cream showing between them and fresh berries tumbling down: rustic, barn-wedding.',
      croquembouche: 'A towering cone of caramel-glazed choux buns wrapped in threads of spun sugar: French, showy.',
      cheese: 'A stack of whole cheese wheels in wax and rind with grapes and figs: savoury, a little ironic.',
    }),
    tiers: score('How tall is it?', ['Two modest tiers', 'Three tiers', 'Four tiers', 'Five tiers, towering']),
    topper: choice('What stands on top?', {
      'bride-groom': 'A tiny bride in white and a groom in black, side by side.',
      'two-grooms': 'Two tiny grooms in dark suits.',
      'two-brides': 'Two tiny brides in white dresses.',
      fallen: 'The little couple has toppled and lies on its side on the table below.',
      flowers: 'No figures, just a posy of flowers.',
      bare: 'Nothing at all; the top is plain.',
    }),
    state: choice('What state is the cake in?', {
      pristine: 'Untouched and perfect, waiting for the couple.',
      'first-slice': 'One clean wedge cut from the bottom tier, the slice sitting on a plate.',
      demolished: 'Eaten: the upper tiers gone, a ragged stump, crumbs, smeared plates.',
      slumping: 'The upper tiers have slid and lean badly; it is about to go.',
    }),
    accent: choice('What colour are the flowers and trimmings?', {
      blush: 'Pale blush-pink roses.',
      gold: 'Gold leaf and champagne tones.',
      burgundy: 'Deep wine-red blooms.',
      blue: 'Soft forget-me-not blue.',
      wild: 'Bright mixed wildflowers: yellow, pink, violet.',
    }),
    cloth: choice('What is the table draped in?', {
      ivory: 'Ivory linen.',
      blush: 'Dusty pink.',
      sage: 'Sage green.',
      navy: 'Midnight navy.',
      gold: 'Champagne gold satin.',
    }),
    plates: noul('Is there a stack of plates and forks waiting beside it?'),
    candles: noul('Are there tealights burning around the stand?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = 0.75;
    const accent = ACCENT[a.accent];
    const silver = s.material('#d9dcdc', { metalness: 0.85, roughness: 0.25 });
    const leaf = '#5f7f4c';

    // Table: pleated cloth to the floor.
    const clothMat = s.material(CLOTH[a.cloth], { side: THREE.DoubleSide, roughness: 0.8 });
    s.mesh(drapeRound(0.52, 0.62, T, 13, 0.07), clothMat, [0, T / 2, 0]);
    s.cylinder(0.52, 0.52, 0.012, [0, T - 0.006, 0], clothMat, 64);

    // Stand.
    const K = 1.28;
    const cake = new THREE.Group();
    cake.scale.setScalar(K);
    cake.position.y = T * (1 - K);
    s.root.add(cake);
    const standTop = T + 0.135;
    into(cake, s.lathe([[0, 0], [0.14, 0], [0.15, 0.012], [0.06, 0.03], [0.035, 0.07], [0.06, 0.112], [0.27, 0.122], [0.275, 0.135], [0, 0.135]], silver, [0, T, 0]));

    const n = a.state === 'demolished' ? 1 : 2 + Math.round(a.tiers * 3);
    const R = a.style === 'croquembouche' ? 0.2 : 0.23;
    const step = Math.min(0.045, (R - 0.07) / Math.max(n - 1, 1));
    const gapCentre = 0.55, gapLen = a.state === 'first-slice' ? 0.55 : a.state === 'demolished' ? 3.4 + random() * 0.8 : 0;

    const icing = s.material('#fbf7ee', { roughness: 0.55 });
    const fruit = s.material('#4a2a1c', { side: THREE.DoubleSide });
    const sponge = s.material('#dcb376', { roughness: 0.9 });
    const spongeIn = s.material('#edd29a', { side: THREE.DoubleSide, roughness: 0.9 });
    const cream = s.material('#fff7e8', { roughness: 0.6 });
    const inner = a.style === 'royal' ? fruit : spongeIn;

    const solid = (r: number, h: number, mat: THREE.Material, inside: THREE.Material, gap = 0, rTop = r) => {
      const g = new THREE.Group();
      const start = gapCentre + gap / 2, len = TAU - gap;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, 48, 1, false, start, len), mat);
      body.position.y = h / 2;
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      if (gap > 0.01) for (const th of [start, start + len]) {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(r, h), inside);
        face.position.set(Math.sin(th) * r / 2, h / 2, Math.cos(th) * r / 2);
        face.rotation.y = th - Math.PI / 2;
        g.add(face);
      }
      return g;
    };
    const inGap = (th: number, gap: number) => {
      if (gap <= 0) return false;
      const d = Math.atan2(Math.sin(th - gapCentre), Math.cos(th - gapCentre));
      return Math.abs(d) < gap / 2 + 0.06;
    };
    const dots = (g: THREE.Object3D, pts: { at: [number, number, number]; size: number; color?: THREE.ColorRepresentation }[], mat: THREE.Material, seg = 8) => {
      if (pts.length) into(g, s.scatter(new THREE.SphereGeometry(1, seg, 6), mat, pts));
    };
    const white = s.material('#ffffff', { roughness: 0.5 });

    // Height of each tier and the gap under it.
    const CHEESE = [
      { c: '#e6c35a', h: 0.12, inside: '#f0d880' },
      { c: '#f4eedd', h: 0.07, inside: '#f7efcf' },
      { c: '#a8322a', h: 0.1, inside: '#efd27a' },
      { c: '#d8d2b6', h: 0.11, inside: '#e9e4c8' },
      { c: '#e09a36', h: 0.07, inside: '#f2c46a' },
    ];
    const heightOf = (i: number) => a.style === 'royal' ? 0.13 : a.style === 'naked' ? 0.15 : a.style === 'croquembouche' ? 0.17 : CHEESE[i % 5].h;
    const gapUnder = (i: number) => (a.style === 'royal' && i > 0 ? 0.07 : 0);
    const radiusOf = (i: number) => a.style === 'croquembouche' ? mix(R, 0.035, i / n) : R - i * step;

    const drawTier = (g: THREE.Group, i: number) => {
      const r = radiusOf(i), h = heightOf(i), gap = i === 0 ? gapLen : 0;
      const short = a.state === 'demolished' ? 0.75 : 1;
      if (a.style === 'royal') {
        g.add(solid(r, h * short, icing, inner, gap));
        const beads: { at: [number, number, number]; size: number }[] = [];
        const count = Math.round(r * TAU / 0.022);
        for (let k = 0; k < count; k++) {
          const th = k / count * TAU;
          if (inGap(th, gap)) continue;
          beads.push({ at: [Math.sin(th) * (r + 0.004), 0.008, Math.cos(th) * (r + 0.004)], size: 0.011 });
          if (a.state !== 'demolished') beads.push({ at: [Math.sin(th) * (r - 0.004), h, Math.cos(th) * (r - 0.004)], size: 0.008 });
          if (k % 4 === 0 && a.state !== 'demolished') for (let d = 1; d < 4; d++) {
            const t2 = th + (d - 2) * 0.3 / count * TAU * 1.6;
            beads.push({ at: [Math.sin(t2) * (r + 0.003), h * 0.72 - Math.abs(2 - d) * -0.012 - 0.02, Math.cos(t2) * (r + 0.003)], size: 0.007 });
          }
        }
        dots(g, beads, white);
        if (i > 0) {
          const pr = radiusOf(i) * 0.7, pillars = 5;
          for (let k = 0; k < pillars; k++) {
            const th = k / pillars * TAU + 0.3;
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.07, 10), icing);
            col.position.set(Math.sin(th) * pr, -0.035, Math.cos(th) * pr);
            col.castShadow = true;
            g.add(col);
            for (const yy of [-0.004, -0.066]) {
              const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 10), icing);
              cap.position.set(Math.sin(th) * pr, yy, Math.cos(th) * pr);
              g.add(cap);
            }
          }
        }
      } else if (a.style === 'naked') {
        const layers = 3, lh = h * short / layers;
        for (let k = 0; k < layers; k++) {
          const layer = solid(r, lh - 0.012, sponge, inner, gap);
          layer.position.y = k * lh;
          g.add(layer);
          const fill = solid(r + 0.004, 0.014, cream, cream, gap);
          fill.position.y = k * lh + lh - 0.013;
          g.add(fill);
        }
        const berries: { at: [number, number, number]; size: number; color: string }[] = [];
        const count = Math.round(r * TAU / 0.035);
        for (let k = 0; k < count; k++) {
          const th = k / count * TAU + random() * 0.1;
          if (inGap(th, gap) || random() < 0.25) continue;
          const rr = r - 0.02 - random() * 0.02;
          berries.push({ at: [Math.sin(th) * rr, h * short + 0.012, Math.cos(th) * rr], size: 0.012 + random() * 0.008, color: ['#b3202e', '#d23a3a', '#2f3f7a', '#4a1230'][Math.floor(random() * 4)] });
        }
        dots(g, berries, s.material('#ffffff', { roughness: 0.4 }));
      } else if (a.style === 'croquembouche') {
        const r2 = mix(R, 0.035, (i + 1) / n);
        const buns: { at: [number, number, number]; size: number; color: string }[] = [];
        const rows = Math.round(h / 0.043);
        for (let row = 0; row < rows; row++) {
          const t = (row + 0.5) / rows;
          if (a.state === 'demolished' && t > 0.55) continue;
          const rr = mix(r, r2, t), count = Math.max(3, Math.round(rr * TAU / 0.05));
          for (let k = 0; k < count; k++) {
            const th = (k + (row % 2) * 0.5) / count * TAU + i;
            if (inGap(th, gap * (a.state === 'demolished' ? 1 : 1.6))) continue;
            const flower = random() < 0.07;
            buns.push({ at: [Math.sin(th) * rr, t * h, Math.cos(th) * rr], size: flower ? 0.017 : 0.027 + random() * 0.004, color: flower ? accent[Math.floor(random() * 3)] : ['#d9a04a', '#c98a35', '#e3b565', '#b87428'][Math.floor(random() * 4)] });
          }
        }
        dots(g, buns, s.material('#ffffff', { roughness: 0.35 }), 10);
        g.add(solid(r - 0.03, h * (a.state === 'demolished' ? 0.4 : 1), s.material('#c9933f'), spongeIn, 0, Math.max(r2 - 0.03, 0.005)));
        if (a.state !== 'demolished') {
          const thread = new THREE.MeshStandardMaterial({ color: '#f6d98a', transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.2 });
          for (let k = 0; k < 2; k++) {
            const halo = new THREE.Mesh(new THREE.TorusGeometry(mix(r, r2, 0.5) + 0.035, 0.0025, 5, 40), thread);
            halo.position.y = h * (0.3 + k * 0.4);
            halo.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.5, (random() - 0.5) * 0.5, 0);
            g.add(halo);
          }
        }
      } else {
        const spec = CHEESE[i % 5];
        const wheel = solid(r, h * short, s.material(spec.c, { roughness: 0.5 }), s.material(spec.inside, { side: THREE.DoubleSide }), gap);
        g.add(wheel);
        if (i % 5 === 3) {
          const veins: { at: [number, number, number]; size: number }[] = [];
          for (let k = 0; k < 40; k++) { const th = random() * TAU; veins.push({ at: [Math.sin(th) * r, random() * h, Math.cos(th) * r], size: 0.006 }); }
          dots(g, veins, s.material('#5d7a86'));
        }
        if (i % 5 === 2 || i % 5 === 0) {
          const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, 0.022, 48, 1, true, gapCentre + gap / 2, TAU - gap), s.material(accent[0], { side: THREE.DoubleSide }));
          band.position.y = h * short / 2;
          g.add(band);
        }
        const grapes: { at: [number, number, number]; size: number; color: string }[] = [];
        const bunches = 1 + Math.floor(random() * 2 + mood.density);
        for (let b = 0; b < bunches; b++) {
          const th = random() * TAU;
          if (inGap(th, gap)) continue;
          const green = random() < 0.4;
          for (let k = 0; k < 9; k++) grapes.push({ at: [Math.sin(th + (random() - 0.5) * 0.35) * (r - 0.012 + random() * 0.02), h * short + 0.01 + random() * 0.012 - (k > 5 ? 0.03 : 0), Math.cos(th + (random() - 0.5) * 0.35) * (r - 0.012 + (k > 5 ? 0.025 : 0))], size: 0.012, color: green ? '#9db54a' : '#4b2458' });
        }
        dots(g, grapes, s.material('#ffffff', { roughness: 0.3 }));
      }
      // Flower clusters cascading round the tiers.
      if (a.style !== 'croquembouche' && a.state !== 'demolished') {
        const blooms: { at: [number, number, number]; size: number; color: string }[] = [];
        const clusters = 1 + Math.round(mood.density * 2);
        for (let c = 0; c < clusters; c++) {
          const th = -0.5 + i * 0.85 + c * TAU / clusters + random() * 0.3;
          if (inGap(th, gap)) continue;
          const rr = r - 0.005;
          for (let k = 0; k < 5; k++) {
            const t2 = th + (random() - 0.5) * 0.5;
            blooms.push({ at: [Math.sin(t2) * rr, h + 0.012 + random() * 0.012, Math.cos(t2) * rr], size: k > 3 ? 0.012 : 0.018 + random() * 0.012, color: k > 3 ? leaf : accent[Math.floor(random() * 3)] });
          }
        }
        dots(g, blooms, s.material('#ffffff', { roughness: 0.7 }));
      }
    };

    // Stack the tiers; when slumping, everything above the break leans on one pivot.
    const breakAt = a.state === 'slumping' ? Math.max(1, Math.floor(n / 2)) : n;
    const turn = new THREE.Group(), lean = new THREE.Group();
    turn.add(lean);
    cake.add(turn);
    let y = standTop, topGroup: THREE.Group | null = null, topY = 0;
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      if (i === breakAt) {
        turn.position.set(0, y, 0);
        turn.rotation.y = random() * TAU;
        lean.rotation.z = -(0.3 + random() * 0.14);
        lean.position.x = 0.05;
      }
      y += gapUnder(i);
      if (i >= breakAt) { g.position.y = y - turn.position.y; g.position.x = (i - breakAt) * 0.03; lean.add(g); }
      else { g.position.y = y; cake.add(g); }
      drawTier(g, i);
      y += heightOf(i);
      topGroup = g; topY = heightOf(i);
    }

    // Topper.
    const skins = ['#f0c9a4', '#c98f62', '#8a5a3a', '#f6dcc4', '#5c3a26'];
    const hairs = ['#2a1c14', '#6b4423', '#d9b45a', '#111111', '#8f3a1e'];
    const figure = (bride: boolean) => {
      const f = new THREE.Group();
      const skin = s.material(skins[Math.floor(random() * skins.length)]);
      const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, yy: number, z = 0) => { const m = new THREE.Mesh(geometry, mat); m.position.set(0, yy, z); m.castShadow = true; f.add(m); return m; };
      if (bride) {
        add(new THREE.CylinderGeometry(0.008, 0.032, 0.07, 14), white, 0.035);
        add(new THREE.CylinderGeometry(0.009, 0.008, 0.022, 10), white, 0.08);
        add(new THREE.CylinderGeometry(0.006, 0.026, 0.07, 10, 1, true, Math.PI * 0.6, Math.PI * 0.8), s.material('#ffffff', { transparent: true, opacity: 0.7, side: THREE.DoubleSide }), 0.075);
      } else {
        add(new THREE.CylinderGeometry(0.012, 0.014, 0.09, 10), s.material(random() < 0.7 ? '#1c1c22' : '#3b4a6b'), 0.045);
        add(new THREE.BoxGeometry(0.008, 0.03, 0.004), white, 0.07, 0.012);
      }
      add(new THREE.SphereGeometry(0.014, 12, 8), skin, 0.105);
      add(new THREE.SphereGeometry(0.0155, 12, 8, 0, TAU, 0, Math.PI * 0.55), s.material(hairs[Math.floor(random() * hairs.length)]), 0.107).rotation.x = -0.3;
      return f;
    };
    const couple = (first: boolean, second: boolean) => {
      const c = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.008, 20), white);
      base.position.y = 0.004;
      c.add(base);
      const f1 = figure(first), f2 = figure(second);
      f1.position.set(-0.022, 0.008, 0); f2.position.set(0.022, 0.008, 0);
      c.add(f1, f2);
      c.scale.setScalar(1.25);
      return c;
    };
    const fallen = a.topper === 'fallen' || (a.state === 'demolished' && a.topper !== 'flowers' && a.topper !== 'bare');
    if (a.topper !== 'bare' && topGroup) {
      if (a.topper === 'flowers') {
        if (a.state !== 'demolished') {
          const posy: { at: [number, number, number]; size: number; color: string }[] = [];
          for (let k = 0; k < 14; k++) { const th = random() * TAU, rr = random() * 0.045; posy.push({ at: [Math.sin(th) * rr, topY + 0.02 + (0.045 - rr) * 0.9, Math.cos(th) * rr], size: 0.02 + random() * 0.012, color: k % 5 === 4 ? leaf : accent[Math.floor(random() * 3)] }); }
          dots(topGroup, posy, s.material('#ffffff', { roughness: 0.7 }));
        }
      } else {
        const kinds: Record<string, [boolean, boolean]> = { 'bride-groom': [true, false], 'two-grooms': [false, false], 'two-brides': [true, true] };
        const [k1, k2] = kinds[a.topper] ?? [[true, false], [false, false], [true, true]][Math.floor(random() * 3)] as [boolean, boolean];
        const c = couple(k1, k2);
        if (fallen) {
          const th = -0.9 - random() * 0.6;
          c.rotation.set(0, th, Math.PI / 2 - 0.05);
          c.position.set(Math.sin(th) * 0.425, T + 0.062, Math.cos(th) * 0.425);
          s.root.add(c);
        } else { c.position.y = topY; topGroup.add(c); }
      }
    }

    // Knife, and what the cutting left.
    const used = a.state === 'first-slice' || a.state === 'demolished';
    const knife = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.003, 0.026), silver);
    blade.position.x = 0.06;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.11, 10), s.material('#f3ead2', { roughness: 0.4 }));
    handle.rotation.z = Math.PI / 2; handle.position.x = -0.095;
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 6), s.material(accent[0]));
    bow.position.set(-0.04, 0.008, 0); bow.scale.set(1, 0.6, 1.6);
    knife.add(blade, handle, bow);
    if (used) { const smear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.022), a.style === 'cheese' ? s.material('#f0d880') : cream); smear.position.set(0.1, 0.004, 0); knife.add(smear); }
    knife.traverse((m) => { m.castShadow = true; });
    const kth = 0.05 + random() * 0.25;
    knife.position.set(Math.sin(kth) * 0.425, T + 0.006, Math.cos(kth) * 0.425);
    knife.rotation.y = kth + (used ? 0.5 + random() * 0.6 : 0);
    s.root.add(knife);

    const china = s.material('#fbfaf5', { roughness: 0.3 });
    const plate = (th: number, rr: number, yy = T) => { s.cylinder(0.075, 0.05, 0.012, [Math.sin(th) * rr, yy + 0.006, Math.cos(th) * rr], china, 24); };
    const sliceMat = a.style === 'royal' ? icing : a.style === 'cheese' ? s.material(CHEESE[0].c) : sponge;
    const sliceIn = a.style === 'cheese' ? s.material(CHEESE[0].inside, { side: THREE.DoubleSide }) : inner;
    const slice = (th: number, rr: number, tipped: boolean) => {
      plate(th, rr);
      if (a.style === 'croquembouche') {
        const pts: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let k = 0; k < 3; k++) pts.push({ at: [Math.sin(th) * rr + (random() - 0.5) * 0.06, T + 0.035, Math.cos(th) * rr + (random() - 0.5) * 0.06], size: 0.027, color: '#d9a04a' });
        dots(s.root, pts, s.material('#ffffff', { roughness: 0.35 }), 10);
        return;
      }
      const wedge = solid(0.12, 0.09, sliceMat, sliceIn, TAU - 0.5);
      wedge.rotation.set(tipped ? Math.PI / 2 : 0, random() * TAU, 0);
      wedge.position.set(Math.sin(th) * rr - 0.03, T + (tipped ? 0.04 : 0.012), Math.cos(th) * rr);
      s.root.add(wedge);
    };
    if (a.state === 'first-slice') slice(0.95, 0.425, false);
    if (a.state === 'demolished') {
      const left = 2 + Math.round(mood.density * 2);
      for (let k = 0; k < left; k++) { const th = 1.2 + k * 1.15 + random() * 0.3; if (random() < 0.6) slice(th, 0.425, random() < 0.5); else plate(th, 0.425); }
    }
    if (a.plates) {
      const th = -0.75, count = 5 + Math.floor(random() * 6);
      for (let k = 0; k < count; k++) plate(th, 0.425, T + k * 0.011);
      for (let k = 0; k < 4; k++) s.box([0.012, 0.003, 0.13], [Math.sin(th - 0.33) * 0.43 + k * 0.016, T + 0.003, Math.cos(th - 0.33) * 0.43], silver).rotation.y = 0.2;
    }

    // Crumbs and petals: wear and aftermath leave more.
    const mess = Math.round((a.state === 'demolished' ? 70 : a.state === 'first-slice' ? 14 : a.state === 'slumping' ? 20 : 0) + mood.wear * 30);
    const crumbs: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let k = 0; k < mess; k++) {
      const th = random() * TAU, onStand = random() < 0.45, rr = onStand ? random() * 0.33 : 0.36 + random() * 0.14;
      crumbs.push({ at: [Math.sin(th) * rr, (onStand ? T + 0.135 * K : T) + 0.004, Math.cos(th) * rr], size: 0.005 + random() * 0.009, color: a.style === 'royal' ? (random() < 0.5 ? '#4a2a1c' : '#fbf7ee') : a.style === 'cheese' ? '#f0d880' : '#dcb376' });
    }
    dots(s.root, crumbs, s.material('#ffffff', { roughness: 0.9 }), 6);
    const petalGeometry = new THREE.SphereGeometry(1, 8, 4);
    petalGeometry.scale(1, 0.12, 0.7);
    const petals: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let k = 0; k < Math.round(mood.density * 26 + 4); k++) { const th = random() * TAU, rr = 0.37 + random() * 0.14; petals.push({ at: [Math.sin(th) * rr, T + 0.003, Math.cos(th) * rr], size: 0.014 + random() * 0.008, color: accent[Math.floor(random() * 3)] }); }
    s.scatter(petalGeometry, s.material('#ffffff'), petals);

    // Tealights.
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.candles) {
      const glass = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false, roughness: 0.1 });
      const count = 3 + Math.round(mood.density * 3);
      for (let k = 0; k < count; k++) {
        const th = 2.2 + k * (TAU - 3.2) / count + random() * 0.2, x = Math.sin(th) * 0.46, z = Math.cos(th) * 0.46;
        s.cylinder(0.026, 0.022, 0.05, [x, T + 0.025, z], glass, 14);
        s.cylinder(0.02, 0.02, 0.018, [x, T + 0.009, z], cream, 12);
        const flame = s.material(new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.6), { emissive: new THREE.Color().setHSL(mix(0.12, 0.06, mood.warmth), 1, 0.5), emissiveIntensity: 1.5 });
        s.ball([0.007, 0.015, 0.007], [x, T + 0.034, z], flame, 8).castShadow = false;
        flames.push(flame);
      }
    }
    const phases = flames.map(() => random() * 10);
    return s.finish({
      update: (_dt, time) => { flames.forEach((flame, k) => { flame.emissiveIntensity = 1.5 + Math.sin(time * (6 + k) + phases[k]) * 0.6 * mood.energy; }); },
    });
  },
});

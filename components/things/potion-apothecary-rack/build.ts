import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
const BREWS = { healing: '#e8323a', poison: '#6fdc3a', love: '#ff7ab8', sleep: '#5a4ad8', luck: '#f5c22e', shadow: '#2a2438', frost: '#7fe0f0' } as const;

export default defineThing({
  questions: {
    brew: choice('Which brew dominates the rack?', {
      healing: 'Healing draughts: bright ruby red.',
      poison: 'Poisons: acid green.',
      love: 'Love philtres: glowing pink.',
      sleep: 'Sleeping draughts: deep indigo.',
      luck: 'Liquid luck: molten gold.',
      shadow: 'Bottled shadow: near-black with a violet edge.',
      frost: 'Bottled frost: pale icy cyan.',
      mixed: 'No one brew: every bottle a different colour.',
    }),
    incident: choice('What has happened to one of the bottles?', {
      complete: 'Nothing: every bottle is in its place.',
      taken: 'One has been taken, leaving a gap and a clean ring in the dust.',
      spilled: 'One has tipped over on its shelf and is dripping down the rack into a puddle.',
      smashed: 'One has fallen and smashed on the floor in a glowing splash.',
      raided: 'The rack has been raided: most bottles are gone and a few lie toppled.',
    }),
    rack: choice('What kind of rack is it?', {
      plank: 'A crooked plank bookcase leaning to one side, one foot propped on a book.',
      ladder: 'A stepped A-frame stand, narrow at the top and deep at the bottom.',
      pigeonhole: 'A heavy grid of pigeonholes, like a wine merchant\'s wall.',
    }),
    shapes: score('How odd are the bottle shapes?', ['Plain matching phials', 'A mix of flasks and jugs', 'Bizarre: gourds, skulls, cones and teardrops']),
    labels: choice('How are the bottles labelled?', {
      inked: 'Cream paper labels in cramped brown handwriting.',
      skull: 'Warning labels with a skull and crossed bones.',
      charm: 'Cheerful labels with hearts and stars.',
      none: 'Not labelled at all; only the maker knows.',
    }),
    wax: choice('What seals the corks?', {
      red: 'Dripping red sealing wax.',
      black: 'Black wax.',
      gold: 'Gold wax.',
      bare: 'Bare corks, no wax.',
    }),
    activity: choice('Is anything on the rack active?', {
      still: 'No, the liquids sit quietly.',
      fuming: 'One bottle stands uncorked and fumes coloured vapour.',
      pulsing: 'The liquids pulse slowly with light, as if breathing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material('#6b4a2e'), darkWood = s.material('#4a3320');
    const neckMat = s.material('#cfe0da', { roughness: 0.15 });
    const cork = s.material('#b08a58');
    const waxMat = a.wax === 'bare' ? null : s.material({ red: '#b0202a', black: '#1c1a1e', gold: '#d8a830' }[a.wax], { roughness: 0.4, metalness: a.wax === 'gold' ? 0.5 : 0 });
    const keys = Object.keys(BREWS) as (keyof typeof BREWS)[];
    const glow = mix(0.35, 0.9, mood.cheer);
    const liquids = new Map<string, THREE.MeshStandardMaterial>();
    const liquid = (hex: string) => { if (!liquids.has(hex)) liquids.set(hex, s.material(hex, { emissive: hex === BREWS.shadow ? '#7a3ad8' : hex, emissiveIntensity: hex === BREWS.shadow ? glow * 0.35 : glow, roughness: 0.15 })); return liquids.get(hex)!; };
    const pick = () => a.brew !== 'mixed' && random() < 0.72 ? BREWS[a.brew] : BREWS[keys[Math.floor(random() * keys.length)]];

    const labelMat = a.labels === 'none' ? null : (() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const g = canvas.getContext('2d')!;
      g.fillStyle = '#eee2c0'; g.fillRect(0, 0, 128, 128); g.strokeStyle = g.fillStyle = '#2b2118'; g.lineWidth = 6;
      if (a.labels === 'inked') { for (let y = 28; y < 110; y += 24) { g.beginPath(); g.moveTo(16, y); for (let x = 16; x < 112; x += 12) g.lineTo(x, y + (random() - 0.5) * 12); g.stroke(); } }
      else if (a.labels === 'skull') { g.beginPath(); g.arc(64, 52, 32, 0, 7); g.fill(); g.fillRect(44, 70, 40, 26); g.fillStyle = '#eee2c0'; g.beginPath(); g.arc(51, 52, 9, 0, 7); g.arc(77, 52, 9, 0, 7); g.fill(); g.lineWidth = 9; g.beginPath(); g.moveTo(16, 92); g.lineTo(112, 122); g.moveTo(112, 92); g.lineTo(16, 122); g.stroke(); }
      else { g.fillStyle = '#d8285a'; g.beginPath(); g.moveTo(64, 104); g.bezierCurveTo(-10, 50, 40, 6, 64, 42); g.bezierCurveTo(88, 6, 138, 50, 64, 104); g.fill(); g.fillStyle = '#e8a820'; for (const [x, y] of [[20, 22], [108, 24], [22, 106], [106, 104]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, t = i * Math.PI / 5; g.lineTo(x + Math.sin(t) * r, y - Math.cos(t) * r); } g.fill(); } }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    })();

    // One bottle, standing on its own origin.
    const bottle = (hex: string, corked = true) => {
      const g = new THREE.Group(), body = liquid(hex);
      const add = <T extends THREE.Object3D>(m: T) => { g.add(m); return m; };
      const kind = Math.floor(random() * (1 + Math.round(a.shapes * 7.4)));
      const k = 0.85 + random() * 0.35;
      let r = 0.04 * k, h = 0.15 * k, nr = 0.014;
      if (kind === 0) { r = 0.03 * k; h = 0.15 * k; add(s.lathe([[0, 0], [r, 0], [r, h * 0.85], [nr, h], [0, h]], body)); }
      else if (kind === 1) { r = 0.055 * k; h = r * 1.9; add(s.ball([r, r * 0.95, r], [0, r * 0.95, 0], body, 16)); }
      else if (kind === 2) { r = 0.06 * k; h = 0.14 * k; add(s.lathe([[0, 0], [r, 0], [r, 0.012], [nr, h], [0, h]], body)); }
      else if (kind === 3) { r = 0.065 * k; h = 0.09 * k; add(s.lathe([[0, 0], [r * 0.8, 0], [r, h * 0.35], [r * 0.9, h * 0.75], [nr * 1.6, h], [0, h]], body)); nr = 0.02; }
      else if (kind === 4) { r = 0.045 * k; h = 0.2 * k; add(s.lathe([[0, 0], [r * 0.5, 0], [r, h * 0.22], [r * 0.75, h * 0.5], [nr * 1.2, h * 0.85], [nr, h], [0, h]], body)); }
      else if (kind === 5) { r = 0.05 * k; h = 0.17 * k; add(s.ball([r, r * 0.9, r], [0, r * 0.9, 0], body, 14)); add(s.ball([r * 0.62, r * 0.62, r * 0.62], [0, r * 1.9 + r * 0.3, 0], body, 12)); h = r * 2.75; }
      else if (kind === 6) { r = 0.04 * k; h = 0.13 * k; add(s.box([r * 1.8, h, r * 1.8], [0, h / 2, 0], body)); r *= 0.9; }
      else { r = 0.052 * k; h = r * 2.1; add(s.ball([r, r, r * 1.05], [0, r * 1.15, 0], body, 14)); add(s.box([r * 1.1, r * 0.6, r * 0.9], [0, r * 0.3, r * 0.3], body)); for (const side of [-1, 1]) add(s.ball([r * 0.26, r * 0.3, r * 0.15], [side * r * 0.4, r * 1.2, r * 0.95], s.material('#14101a'), 8)); }
      const neck = 0.03 + random() * 0.04;
      add(s.cylinder(nr, nr, neck, [0, h + neck / 2 - 0.004, 0], neckMat, 10));
      add(s.cylinder(nr * 1.35, nr * 1.35, 0.008, [0, h + neck - 0.004, 0], neckMat, 10));
      if (corked) {
        add(s.cylinder(nr * 1.1, nr * 0.9, 0.022, [0, h + neck + 0.008, 0], cork, 8));
        if (waxMat) { add(s.ball([nr * 1.7, 0.014, nr * 1.7], [0, h + neck + 0.016, 0], waxMat, 8)); for (let i = 0; i < 3; i++) { const t = random() * 6.283; add(s.rod([Math.cos(t) * nr * 1.2, h + neck + 0.012, Math.sin(t) * nr * 1.2], [Math.cos(t) * nr * 1.2, h + neck - 0.01 - random() * neck * 0.8, Math.sin(t) * nr * 1.2], 0.004, waxMat, 0.006)); } }
      }
      if (labelMat && kind !== 7) { const size = Math.min(r * 1.25, 0.06); const tag = add(s.mesh(new THREE.PlaneGeometry(size, size), labelMat, [0, Math.min(h * 0.45, r * 0.95), r * (kind === 6 ? 0.91 : kind === 2 ? 0.75 : 1.005)])); if (kind === 2) tag.rotation.x = -0.4; }
      g.userData = { r, top: h + neck, hex };
      return g;
    };

    // The rack frame.
    const rack = new THREE.Group(); s.root.add(rack);
    const inRack = <T extends THREE.Object3D>(m: T) => { rack.add(m); return m; };
    const W = 0.95, levels = [0.14, 0.5, 0.86, 1.22];
    const depth = (i: number) => a.rack === 'ladder' ? 0.36 - i * 0.07 : 0.26;
    const zFront = (i: number) => a.rack === 'ladder' ? 0.18 : 0.13;
    if (a.rack === 'plank') {
      for (const x of [-1, 1]) inRack(s.box([0.04, 1.62, 0.27], [x * (W / 2 + 0.02), 0.81, 0], darkWood));
      for (const y of [0.3, 0.7, 1.1, 1.5]) inRack(s.box([W + 0.02, 0.06, 0.015], [0, y, -0.128], wood));
      inRack(s.box([W + 0.14, 0.035, 0.3], [0, 1.635, 0], darkWood));
    } else if (a.rack === 'ladder') {
      for (const x of [-1, 1]) { inRack(s.rod([x * (W / 2 + 0.02), 0, 0.2], [x * (W / 2 + 0.02), 1.5, -0.12], 0.028, darkWood)); inRack(s.rod([x * (W / 2 + 0.02), 0, -0.22], [x * (W / 2 + 0.02), 1.5, -0.12], 0.024, darkWood)); }
      inRack(s.rod([-W / 2 - 0.05, 1.5, -0.12], [W / 2 + 0.05, 1.5, -0.12], 0.024, darkWood));
    } else {
      for (const x of [-1, -1 / 3, 1 / 3, 1]) inRack(s.box([0.045, 1.6, 0.28], [x * (W / 2 + 0.02), 0.8, 0], darkWood));
      inRack(s.box([W + 0.09, 0.05, 0.28], [0, 1.6, 0], darkWood)); inRack(s.box([W + 0.09, 1.6, 0.02], [0, 0.8, -0.135], wood));
    }
    levels.forEach((y, i) => { inRack(s.box([W, 0.03, depth(i)], [0, y - 0.015, zFront(i) - depth(i) / 2], wood)); inRack(s.box([W, 0.035, 0.012], [0, y + 0.012, zFront(i) - 0.006], darkWood)); });
    const lean = a.rack === 'plank' ? (random() < 0.5 ? -1 : 1) * mix(0.035, 0.1, mood.wear) : 0;
    if (lean) {
      rack.rotation.z = lean; const low = lean > 0 ? -1 : 1;
      rack.position.y = Math.abs(Math.sin(lean)) * (W / 2 + 0.04);
      s.box([0.2, Math.abs(Math.sin(lean)) * (W + 0.08) - 0.004, 0.16], [-low * (W / 2 + 0.02) * Math.cos(lean), Math.abs(Math.sin(lean)) * (W + 0.08) / 2, 0.02], s.material('#6a2a2a')).rotation.y = 0.3;
    }

    // Fill the shelves.
    const perShelf = Math.round(mix(4, 7, mood.density));
    const special = { level: 1 + Math.floor(random() * 3), slot: Math.floor(random() * perShelf) };
    const fumers: THREE.Mesh[] = [];
    let spillHex: string = BREWS.healing, specialX = 0;
    levels.forEach((y, li) => {
      for (let i = 0; i < perShelf; i++) {
        const x = -W / 2 + 0.07 + (i + 0.5) * (W - 0.14) / perShelf + (random() - 0.5) * 0.02, z = zFront(li) - 0.085 - random() * 0.02;
        const isSpecial = li === special.level && i === special.slot;
        const hex = pick();
        if (isSpecial) { spillHex = a.brew === 'mixed' ? hex : BREWS[a.brew]; specialX = x; }
        if (a.incident === 'raided' && !isSpecial && random() < 0.72) { if (random() < 0.3) inRack(s.cylinder(0.035, 0.035, 0.002, [x, y + 0.002, z], s.material('#8a6a48'), 12)); continue; }
        if (isSpecial && (a.incident === 'taken' || a.incident === 'smashed')) { inRack(s.ring(0.04, 0.006, [x, y + 0.002, z], s.material('#9a8466'))).rotation.x = Math.PI / 2; continue; }
        const tipped = (isSpecial && a.incident === 'spilled') || (a.incident === 'raided' && random() < 0.35);
        const fuming = a.activity === 'fuming' && li === levels.length - 1 && i === Math.floor(perShelf / 2);
        const b = bottle(isSpecial ? spillHex : hex, !(tipped && isSpecial) && !fuming);
        if (tipped) { b.rotation.set(Math.PI / 2, 0, 0.25 + random() * 0.4); b.position.set(x, y + b.userData.r, z - 0.03); }
        else { b.position.set(x, y, z); b.rotation.y = (random() - 0.5) * 0.6; }
        rack.add(b);
        if (fuming) for (let k = 0; k < 5; k++) { const puff = inRack(s.ball([0.03 + k * 0.012, 0.03 + k * 0.012, 0.03 + k * 0.012], [x + (random() - 0.5) * 0.05, y + b.userData.top + 0.05 + k * 0.075, z], s.material(hex, { emissive: hex, emissiveIntensity: 0.6, transparent: true, opacity: 0.4, depthWrite: false }), 10)); puff.userData.base = puff.position.y; fumers.push(puff); }
      }
    });

    const spillMat = liquid(spillHex);
    if (a.incident === 'spilled') {
      const y = levels[special.level], zf = zFront(special.level);
      inRack(s.cylinder(0.11, 0.11, 0.006, [specialX, y + 0.003, zf - 0.07], spillMat, 14)).scale.z = 0.6;
      inRack(s.box([0.2, 0.04, 0.008], [specialX, y - 0.004, zf + 0.004], spillMat));
      for (let i = 0; i < 6; i++) { const x = specialX - 0.09 + i * 0.036 + random() * 0.01; inRack(s.rod([x, y - 0.02, zf + 0.006], [x, y - 0.08 - random() * (y - 0.1), zf + 0.006], 0.007, spillMat, 0.004)); }
      s.cylinder(0.18, 0.18, 0.006, [specialX + lean * 1, 0.003, 0.3], spillMat, 16).scale.z = 0.6;
    }
    if (a.incident === 'smashed') {
      const fx = specialX * 0.7, fz = 0.36;
      s.cylinder(0.2, 0.2, 0.006, [fx, 0.003, fz], spillMat, 9).scale.z = 0.7;
      for (let i = 0; i < 7; i++) { const t = random() * 6.283; s.cylinder(0.02 + random() * 0.03, 0.03, 0.005, [fx + Math.cos(t) * (0.2 + random() * 0.14), 0.003, fz + Math.sin(t) * (0.14 + random() * 0.1)], spillMat, 8); }
      s.scatter(new THREE.TetrahedronGeometry(1), s.material('#d8ece6', { roughness: 0.1 }), Array.from({ length: 22 }, () => { const t = random() * 6.283, d = random() * 0.26; return { at: [fx + Math.cos(t) * d, 0.012, fz + Math.sin(t) * d * 0.7] as P3, size: 0.012 + random() * 0.022 }; }));
      const neck = s.cylinder(0.016, 0.03, 0.07, [fx + 0.1, 0.02, fz + 0.05], neckMat, 10); neck.rotation.set(Math.PI / 2, 0, 0.7);
      s.cylinder(0.017, 0.014, 0.024, [fx + 0.24, 0.012, fz + 0.12], cork, 8).rotation.x = Math.PI / 2;
    }
    if (a.incident === 'raided') for (let i = 0; i < 5; i++) s.cylinder(0.016, 0.013, 0.022, [(random() - 0.5) * 0.8, 0.008, 0.25 + random() * 0.25], cork, 8).rotation.set(Math.PI / 2, 0, random() * 3);
    // A hanging bunch of herbs and a cobweb corner as the place wears.
    if (a.rack !== 'ladder') for (let i = 0; i < 3; i++) { const x = -0.3 + i * 0.3; inRack(s.rod([W / 2 + 0.07, 1.5 - i * 0.02, 0.05 - i * 0.05], [W / 2 + 0.09, 1.3 - i * 0.03, 0.05 - i * 0.05], 0.004, s.material('#c9b88a'))); inRack(s.mesh(new THREE.ConeGeometry(0.04, 0.2, 7), s.material(['#6a8a4a', '#8a7a4a', '#7a5a8a'][i]), [W / 2 + 0.09, 1.2 - i * 0.03, 0.05 - i * 0.05])); void x; }

    const speed = mix(0.3, 1.5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const [i, puff] of fumers.entries()) { const t = (time * 0.25 * speed + i * 0.2) % 1; puff.position.y = puff.userData.base + t * 0.12; puff.scale.setScalar((0.03 + i * 0.012) * (1 + t * 0.5)); }
        if (a.activity === 'pulsing') for (const [hex, m] of liquids) m.emissiveIntensity = (hex === BREWS.shadow ? 0.35 : 1) * glow * (1 + Math.sin(time * 1.6 * speed) * 0.45);
      },
    });
  },
});

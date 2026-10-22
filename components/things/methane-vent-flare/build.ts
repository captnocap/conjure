import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SIGNS = {
  danger: ['DANGER', 'METHANE GAS'], smoking: ['NO SMOKING', 'NO NAKED FLAME'], well: ['GAS WELL', 'GW-14'],
  keepout: ['KEEP OUT', 'LANDFILL GAS'], explosive: ['WARNING', 'EXPLOSIVE'], none: ['', ''],
} as const;

export default defineThing({
  questions: {
    type: choice('What kind of gas vent is it?', {
      cane: 'A white plastic candy-cane vent: a riser pipe with a U-bend gooseneck at head height.',
      wellhead: 'A black wellhead with a red valve wheel and an orange flex hose running off to a collector pipe.',
      cowl: 'A riser topped with a spinning wind-driven turbine cowl.',
      candlestick: 'A slender guyed flare pipe several metres tall with an open flame at its tip.',
      enclosed: 'A fat enclosed flare stack on a skid, louvred at the base, the flame hidden inside its shroud.',
    }),
    flame: choice('Is a flame visible?', {
      none: 'No flame: only the gas, unseen.',
      ghost: 'A pale blue flame you could miss in daylight.',
      lazy: 'A soft orange flame wavering at the mouth.',
      roaring: 'A tall roaring yellow flame with a hot core.',
    }),
    sign: choice('What does the warning sign say, if there is one?', {
      danger: 'DANGER / METHANE GAS', smoking: 'NO SMOKING / NO NAKED FLAME', well: 'GAS WELL / GW-14, a plain asset tag.',
      keepout: 'KEEP OUT / LANDFILL GAS', explosive: 'WARNING / EXPLOSIVE', none: 'There is no sign.',
    }),
    ground: choice('What is the ground around it like?', {
      grass: 'Rough grass growing thick around the pipe, the cap greened over.',
      clay: 'Raw cracked clay capping, nothing growing yet.',
      gravel: 'A tidy gravel pad with a concrete kerb.',
      flowers: 'Grass full of daisies and dandelions, nature unbothered.',
      rubbish: 'Thin soil with old rubbish working its way back to the surface.',
    }),
    box: choice('What monitors it?', {
      cabinet: 'A grey steel cabinet on a post with a status light.',
      solar: 'A small logger box with a solar panel and a whip aerial.',
      none: 'Nothing: nobody is measuring.',
    }),
    story: choice('What has happened to it?', {
      maintained: 'Maintained: upright, taped and tagged, recently inspected.',
      settled: 'The waste beneath has settled and the whole thing leans.',
      forgotten: 'Forgotten: rust streaks, a bird nest on top, the sign hanging by one bolt.',
    }),
    guarded: noul('Is it ringed by bollards or a low guard rail?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = new THREE.Color('#7c4a2d');
    const worn = (hex: string, amount = 0.5) => new THREE.Color(hex).lerp(rust, mood.wear * amount * (a.story === 'forgotten' ? 1.5 : 1));
    const white = s.material(worn('#ece9df', 0.25), { roughness: 0.45 });
    const black = s.material('#232527', { roughness: 0.6 });
    const steel = s.material(worn('#9aa0a2'), { metalness: 0.6, roughness: 0.45 });
    const red = s.material('#c5342b');
    const yellow = s.material('#e8bd24');
    const concrete = s.material('#b3b0a6', { roughness: 0.95 });

    // Ground patch.
    const G = 2.0;
    const groundHex = { grass: '#6e8c48', clay: '#a9805b', gravel: '#9d998e', flowers: '#779a4c', rubbish: '#8a7a5e' }[a.ground];
    const dry = new THREE.Color(groundHex).lerp(new THREE.Color('#b29a62'), a.ground === 'grass' || a.ground === 'flowers' ? mood.warmth * 0.4 * (1 - mood.cheer) : 0);
    s.cylinder(G, G + 0.1, 0.08, [0, 0.04, 0], s.material(dry, { roughness: 1 }), 28);
    const spot = (min = 0.35, max = G - 0.1): [number, number] => { const t = random() * 6.28, r = mix(min, max, Math.sqrt(random())); return [Math.cos(t) * r, Math.sin(t) * r]; };
    if (a.ground === 'grass' || a.ground === 'flowers') {
      const blades = Array.from({ length: Math.round(mix(120, 320, mood.density)) }, () => { const [x, z] = spot(0.2); return { at: [x, 0.08, z] as const, size: 0.5 + random() * 0.9, color: new THREE.Color().setHSL(mix(0.2, 0.3, random()), 0.55, mix(0.16, 0.3, random())) }; });
      s.scatter(new THREE.ConeGeometry(0.04, 0.3, 4).translate(0, 0.15, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
      if (a.ground === 'flowers') {
        const blooms = Array.from({ length: 34 }, () => { const [x, z] = spot(0.4); return { at: [x, 0.2 + random() * 0.14, z] as const, size: 0.5 + random() * 0.6, color: random() < 0.55 ? '#f6f3e6' : '#f0c92a' }; });
        s.scatter(new THREE.CylinderGeometry(0.07, 0.03, 0.03, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), blooms);
      }
    }
    if (a.ground === 'clay') for (let i = 0; i < 16; i++) {
      const [x, z] = spot(0.5, G - 0.3);
      s.box([0.4 + random() * 0.8, 0.012, 0.025], [x, 0.083, z], s.material('#6e5038')).rotation.y = random() * 3;
    }
    if (a.ground === 'gravel') {
      s.ring(G - 0.05, 0.07, [0, 0.09, 0], concrete).rotation.x = Math.PI / 2;
      s.scatter(new THREE.DodecahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), Array.from({ length: 200 }, () => { const [x, z] = spot(0.3, G - 0.2); return { at: [x, 0.09, z] as const, size: 0.6 + random(), color: new THREE.Color().setHSL(0.1, 0.06, mix(0.45, 0.75, random())) }; }));
    }
    if (a.ground === 'rubbish') {
      s.scatter(new THREE.DodecahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: Math.round(mix(25, 60, mood.density)) }, () => { const [x, z] = spot(0.5); return { at: [x, 0.07, z] as const, size: 0.5 + random() * 1.2, color: new THREE.Color(['#e8e4d8', '#3f7ab5', '#c8473a', '#222326', '#d8be4a', '#8f9498'][Math.floor(random() * 6)]).lerp(new THREE.Color('#8a7a5e'), 0.25 + mood.wear * 0.4) }; }));
      for (let i = 0; i < 3; i++) { const [x, z] = spot(0.7, 1.5); s.ring(0.28, 0.09, [x, 0.06, z], black).rotation.set(Math.PI / 2 + 0.2, 0, random()); }
    }

    // The vent itself, built in a rig that can lean.
    const rig = new Sculpture(context);
    s.root.add(rig.root);
    rig.cylinder(0.3, 0.34, 0.16, [0, 0.12, 0], concrete, 16);
    let mouth = new THREE.Vector3(0, 1.8, 0), mouthSize = 1, top = 1.8;
    let spinner: THREE.Object3D | null = null;
    if (a.type === 'cane') {
      rig.cylinder(0.075, 0.075, 1.7, [0, 1.0, 0], white, 14);
      rig.cylinder(0.095, 0.095, 0.12, [0, 0.55, 0], white, 14);
      rig.ring(0.2, 0.075, [0.2, 1.85, 0], white, Math.PI);
      rig.cylinder(0.075, 0.075, 0.25, [0.4, 1.73, 0], white, 14);
      rig.cylinder(0.085, 0.085, 0.04, [0.4, 1.6, 0], black, 14);
      rig.rod([0, 0.75, 0.07], [0, 0.75, 0.2], 0.02, steel);
      rig.box([0.03, 0.03, 0.12], [0, 0.8, 0.2], red);
      mouth.set(0.4, 1.56, 0); mouthSize = -0.6; top = 2.13;
    } else if (a.type === 'wellhead') {
      rig.cylinder(0.11, 0.11, 1.0, [0, 0.65, 0], black, 14);
      for (const y of [0.55, 1.15]) rig.cylinder(0.18, 0.18, 0.05, [0, y, 0], steel, 14);
      rig.cylinder(0.08, 0.08, 0.35, [0, 1.35, 0], black, 12);
      rig.ring(0.13, 0.018, [0, 1.56, 0], red).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) rig.rod([0, 1.56, 0], [Math.cos(i * 2.09) * 0.13, 1.56, Math.sin(i * 2.09) * 0.13], 0.012, red);
      rig.rod([0, 1.4, 0], [0, 1.56, 0], 0.02, steel);
      rig.tube([[0.1, 0.9, 0], [0.5, 1.0, 0.1], [0.85, 0.6, 0.25], [1.0, 0.2, 0.3]], 0.05, s.material('#e07a22', { roughness: 0.7 }));
      rig.rod([1.0, 0.16, -1.7], [1.0, 0.16, 1.7], 0.09, black);
      for (const y of [0.75, 0.95]) { rig.rod([0, y, 0.1], [0, y, 0.22], 0.015, yellow); }
      mouth.set(0, 1.62, 0); mouthSize = 0.6; top = 1.6;
    } else if (a.type === 'cowl') {
      rig.cylinder(0.09, 0.09, 1.9, [0, 1.1, 0], steel, 14);
      const cowl = new Sculpture(context);
      for (let i = 0; i < 14; i++) {
        const fin = cowl.ball([0.02, 0.2, 0.09], [Math.cos(i / 14 * 6.28) * 0.2, 0, Math.sin(i / 14 * 6.28) * 0.2], steel, 8);
        fin.rotation.y = -i / 14 * 6.28 + 0.7;
      }
      cowl.cylinder(0.12, 0.2, 0.05, [0, 0.2, 0], steel, 14);
      cowl.cylinder(0.2, 0.12, 0.05, [0, -0.2, 0], steel, 14);
      cowl.root.position.set(0, 2.25, 0);
      rig.root.add(cowl.root);
      spinner = cowl.root;
      mouth.set(0, 2.5, 0); mouthSize = 0.7; top = 2.5;
    } else if (a.type === 'candlestick') {
      rig.cylinder(0.07, 0.1, 4.6, [0, 2.4, 0], steel, 12);
      rig.cylinder(0.2, 0.1, 0.4, [0, 4.85, 0], steel, 14);
      rig.cylinder(0.16, 0.16, 0.3, [0, 0.9, 0], red, 12);
      for (let i = 0; i < 3; i++) rig.rod([0, 3.4, 0], [Math.cos(i * 2.09 + 0.5) * 1.7, 0.08, Math.sin(i * 2.09 + 0.5) * 1.7], 0.012, steel);
      rig.rod([0.3, 0.3, 0], [0.3, 4.7, 0], 0.015, yellow);
      mouth.set(0, 5.05, 0); mouthSize = 1.5; top = 5.05;
    } else {
      rig.box([2.2, 0.16, 1.5], [0.4, 0.16, 0], steel);
      rig.cylinder(0.5, 0.5, 4.4, [0, 2.45, 0], s.material(worn('#c9ccc8', 0.6), { metalness: 0.5, roughness: 0.4 }), 24);
      rig.cylinder(0.53, 0.53, 0.7, [0, 0.75, 0], black, 24);
      for (let i = 0; i < 5; i++) rig.ring(0.535, 0.02, [0, 0.48 + i * 0.13, 0], steel).rotation.x = Math.PI / 2;
      for (const y of [2.2, 3.6, 4.62]) rig.ring(0.51, 0.03, [0, y, 0], steel).rotation.x = Math.PI / 2;
      rig.box([0.6, 0.7, 0.6], [1.1, 0.6, 0], s.material('#3d6e8c'));
      rig.rod([0.8, 0.7, 0], [0.45, 0.7, 0], 0.09, black);
      rig.cylinder(0.14, 0.14, 0.3, [0.62, 0.7, 0], yellow, 12).rotation.z = Math.PI / 2;
      rig.rod([0.56, 0.3, 0.5], [0.56, 4.6, 0.5], 0.02, steel);
      for (let i = 0; i < 12; i++) rig.box([0.03, 0.02, 0.3], [0.52, 0.5 + i * 0.36, 0.4], steel).rotation.y = 0.9;
      mouth.set(0, 4.5, 0); mouthSize = 2.6; top = 4.65;
    }

    // Flame: a faint emissive teardrop, flickering.
    const flames: THREE.Mesh[] = [];
    if (a.flame !== 'none') {
      const [core, outer, size] = { ghost: ['#bfe3ff', '#5fa8f0', 0.55], lazy: ['#ffd27a', '#f08a2c', 0.8], roaring: ['#fff3b0', '#ffb01f', 1.35] }[a.flame] as [string, string, number];
      const scale = Math.abs(mouthSize) * size, dir = Math.sign(mouthSize);
      const profile: [number, number][] = [[0, 0], [0.09, 0.05], [0.13, 0.18], [0.1, 0.38], [0.04, 0.6], [0, 0.75]];
      for (const [hex, k, opacity] of [[outer, 1, a.flame === 'ghost' ? 0.35 : 0.7], [core, 0.55, 0.9]] as const) {
        const flame = rig.lathe(profile, new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: mix(1.2, 2.4, mood.energy), transparent: true, opacity, depthWrite: k < 1, roughness: 1 }));
        flame.castShadow = false;
        flame.position.copy(mouth);
        flame.scale.set(scale * k, scale * k * (a.type === 'enclosed' ? 0.5 : 1), scale * k);
        if (dir < 0) { flame.rotation.z = 2.3; }
        flames.push(flame);
      }
    }
    if (a.story === 'forgotten') {
      const nestAt: [number, number, number] = a.type === 'cane' ? [0.2, 2.13, 0] : [0, top + 0.02, 0];
      if (a.flame === 'none' || a.type === 'cane') {
        rig.ring(a.type === 'enclosed' ? 0.4 : 0.15, 0.06, nestAt, s.material('#7a6240', { roughness: 1 })).rotation.x = Math.PI / 2;
        for (let i = 0; i < 12; i++) rig.rod([nestAt[0] + (random() - 0.5) * 0.3, nestAt[1], (random() - 0.5) * 0.3], [nestAt[0] + (random() - 0.5) * 0.6, nestAt[1] + random() * 0.12, (random() - 0.5) * 0.6], 0.008, s.material('#8d744c'));
        for (let i = 0; i < 2; i++) rig.ball([0.035, 0.045, 0.035], [nestAt[0] + i * 0.06 - 0.03, nestAt[1] + 0.06, 0], s.material('#cfe0d8'), 8);
      }
      for (let i = 0; i < 5; i++) rig.box([0.02, 0.3 + random() * 0.5, 0.004], [(random() - 0.5) * 0.1, top * mix(0.3, 0.8, random()), a.type === 'enclosed' ? 0.502 : 0.08], s.material('#7c4a2d'));
    }
    if (a.story === 'maintained') {
      rig.cylinder(a.type === 'enclosed' ? 0.505 : 0.1, a.type === 'enclosed' ? 0.505 : 0.1, 0.06, [0, a.type === 'enclosed' ? 1.6 : 0.4, 0], yellow, 20);
      rig.box([0.1, 0.14, 0.005], [0.03, a.type === 'enclosed' ? 1.45 : 0.3, a.type === 'enclosed' ? 0.51 : 0.11], s.material('#f2efe2')).rotation.z = 0.2;
    }
    if (a.story === 'settled') { rig.root.rotation.set((random() - 0.5) * 0.2, 0, (a.type === 'enclosed' ? 0.07 : 0.2) * (random() < 0.5 ? -1 : 1)); rig.root.position.y = -0.05; }

    // Sign.
    const [line1, line2] = SIGNS[a.sign];
    if (line1) {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 288;
      const ctx = canvas.getContext('2d')!;
      const alarm = a.sign === 'danger' || a.sign === 'explosive';
      ctx.fillStyle = a.sign === 'well' ? '#f1efe4' : '#f1c81e'; ctx.fillRect(0, 0, 384, 288);
      ctx.fillStyle = alarm ? '#c22a22' : '#1b1b1b'; ctx.fillRect(0, 0, 384, 110);
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, 372, 276);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px sans-serif'; ctx.fillText(line1, 192, 58, 340);
      ctx.fillStyle = '#1b1b1b'; ctx.font = 'bold 54px sans-serif';
      const words = line2.split(' ');
      if (words.length > 1 && line2.length > 9) { ctx.fillText(words.slice(0, -1).join(' '), 192, 160, 340); ctx.fillText(words.at(-1)!, 192, 228, 340); }
      else ctx.fillText(line2, 192, 195, 340);
      ctx.fillStyle = `rgba(110,70,40,${mood.wear * 0.35})`; ctx.fillRect(0, 0, 384, 288);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const post = new THREE.Group();
      const plate = s.box([0.72, 0.54, 0.02], [0, 1.25, 0.03], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }));
      const pole = s.cylinder(0.025, 0.025, 1.6, [0, 0.8, 0], steel, 8);
      post.add(plate, pole);
      if (a.story === 'forgotten') { plate.rotation.z = -0.5 - random() * 0.4; plate.position.set(0.18, 1.05, 0.03); }
      post.position.set(-1.15, 0, 0.95);
      post.rotation.set(0, 0.3, a.story === 'settled' ? -0.12 : (random() - 0.5) * 0.06);
      s.root.add(post);
    }

    // Monitoring box.
    let led: THREE.MeshStandardMaterial | null = null;
    if (a.box !== 'none') {
      const bx = 1.2, bz = 0.85;
      s.cylinder(0.035, 0.035, 1.2, [bx, 0.6, bz], steel, 8);
      const cabinet = s.material(worn('#b9bdb9', 0.35), { metalness: 0.3 });
      const big = a.box === 'cabinet';
      s.box(big ? [0.5, 0.65, 0.28] : [0.3, 0.36, 0.2], [bx, big ? 1.25 : 1.1, bz], cabinet);
      s.box(big ? [0.56, 0.04, 0.34] : [0.34, 0.03, 0.24], [bx, big ? 1.59 : 1.3, bz], cabinet);
      s.box([0.03, 0.1, 0.02], [bx + (big ? 0.18 : 0.1), big ? 1.25 : 1.1, bz + (big ? 0.15 : 0.11)], black);
      led = s.material(mood.cheer > 0.4 ? '#4be06a' : '#ff4a36', { emissive: mood.cheer > 0.4 ? '#39e05c' : '#ff3a22', emissiveIntensity: 1.6 });
      s.ball([0.03, 0.03, 0.02], [bx - (big ? 0.15 : 0.08), big ? 1.45 : 1.2, bz + (big ? 0.145 : 0.105)], led, 8);
      s.tube([[bx, 0.9, bz - 0.05], [bx - 0.4, 0.5, bz - 0.4], [0.15, 0.3, 0.1]], 0.012, black);
      if (a.box === 'solar') {
        s.cylinder(0.02, 0.02, 0.6, [bx, 1.6, bz], steel, 6);
        const panel = s.box([0.6, 0.03, 0.4], [bx, 1.9, bz], s.material('#1d2c4a', { metalness: 0.5, roughness: 0.25 }));
        panel.rotation.x = 0.6;
        s.rod([bx + 0.12, 1.3, bz - 0.08], [bx + 0.16, 2.4, bz - 0.1], 0.006, black);
      }
    }
    if (a.guarded) {
      const stripe = s.material('#1f1f1f');
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(t) * 1.55, z = Math.sin(t) * 1.55;
        s.cylinder(0.07, 0.07, 0.95, [x, 0.5, z], yellow, 10);
        s.cylinder(0.073, 0.073, 0.12, [x, 0.7, z], stripe, 10);
        s.ball([0.07, 0.04, 0.07], [x, 0.975, z], yellow, 10);
        if (i !== 0) { const u = t - Math.PI / 2; s.rod([x, 0.82, z], [Math.cos(u) * 1.55, 0.82, Math.sin(u) * 1.55], 0.025, yellow); }
      }
    }

    const flicker = mix(0.04, 0.22, mood.energy), spin = mix(0.4, 7, mood.energy);
    const base = flames.map((flame) => flame.scale.clone());
    return s.finish({
      update: (dt, time) => {
        flames.forEach((flame, i) => {
          const n = Math.sin(time * 9 + i) * 0.5 + Math.sin(time * 23.7 + i * 2) * 0.5;
          flame.scale.set(base[i].x * (1 - n * flicker * 0.5), base[i].y * (1 + n * flicker), base[i].z * (1 - n * flicker * 0.5));
        });
        if (spinner) spinner.rotation.y += dt * spin;
        if (led) led.emissiveIntensity = 1 + Math.max(0, Math.sin(time * 3)) * 1.5;
      },
    });
  },
});

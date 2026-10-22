import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const LIQUIDS = {
  blue: 'The classic clear electric blue.',
  green: 'A minty hospital green.',
  cloudy: 'Cloudy grey-blue and old, not changed in weeks, with sediment at the bottom.',
  violet: 'A deep violet, a salon’s own brand.',
  amber: 'Amber like weak tea, an old-fashioned antiseptic.',
} as const;
const LIQUID_TINT: Record<keyof typeof LIQUIDS, string> = { blue: '#1b7fe8', green: '#2fc48c', cloudy: '#7f9aa3', violet: '#7b3fd6', amber: '#d8922a' };

function comb(length: number, teeth: number, tall: number) {
  const parts: THREE.BufferGeometry[] = [];
  const spine = new THREE.BoxGeometry(tall * 0.32, length, 0.0035);
  spine.translate(tall * 0.34, length / 2, 0);
  parts.push(spine);
  for (let i = 0; i < teeth; i++) {
    const fine = i > teeth / 2;
    const tooth = new THREE.BoxGeometry(tall * 0.7, length / teeth * (fine ? 0.35 : 0.55), 0.0025);
    tooth.translate(-tall * 0.15, (i + 0.5) * length / teeth, 0);
    parts.push(tooth);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return merged;
}

export default defineThing({
  questions: {
    liquid: choice('What colour is the disinfectant?', LIQUIDS),
    level: score('How full is the jar?', ['A couple of fingers at the bottom', 'Half', 'Topped up to the shoulder']),
    contents: choice('What stands in the jar?', {
      combs: 'A crowd of combs: black, tortoiseshell and one pink.',
      mixed: 'Combs and a pair of scissors, handles up.',
      scissors: 'Only scissors and thinning shears, fanned like a bouquet.',
      single: 'One lone black comb.',
      empty: 'Nothing: just the liquid.',
    }),
    jar: choice('What kind of jar is it?', {
      classic: 'The tall straight glass cylinder with a chrome base and domed chrome lid.',
      mason: 'A squat mason jar with a screw band, improvised.',
      apothecary: 'A footed apothecary jar with a glass ball stopper.',
    }),
    lid: noul('Is the lid on (rather than set down beside the jar)?'),
    tidy: score('How tidy are the tools around it?', ['Scattered among clippings and loose guards', 'Roughly grouped', 'Lined up square like a surgeon’s tray']),
    beside: choice('What else sits beside the jar, guards and duster?', {
      clippers: 'Electric clippers with a coiled cord.',
      spray: 'A water spray bottle.',
      talc: 'A talc shaker.',
      nothing: 'Nothing more.',
    }),
    mat: choice('What is everything standing on?', {
      towel: 'A folded white towel.',
      rubber: 'A black ribbed rubber mat.',
      steel: 'A stainless steel tray.',
      glass: 'A pale green glass shelf.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#dfe4e8', { metalness: 0.85, roughness: mix(0.15, 0.5, mood.wear) });
    const dark = s.material('#1e1f22', { roughness: 0.6 });
    const tidy = a.tidy;

    // --- Mat.
    const MW = 0.46, MD = 0.3;
    let top = 0.012;
    if (a.mat === 'towel') { s.box([MW, 0.012, MD], [0, 0.006, 0], s.material('#f1eee6', { roughness: 1 })); s.box([MW * 0.98, 0.002, 0.012], [0, 0.0125, MD / 2 - 0.03], s.material('#3b62a8')); }
    else if (a.mat === 'rubber') { s.box([MW, 0.008, MD], [0, 0.004, 0], dark); top = 0.008; for (let i = 0; i < 22; i++) s.box([MW * 0.96, 0.002, 0.004], [0, 0.009, -MD / 2 + 0.012 + i * 0.01], dark); top = 0.01; }
    else if (a.mat === 'steel') { s.box([MW, 0.004, MD], [0, 0.002, 0], chrome); top = 0.004; for (const z of [-1, 1]) s.box([MW, 0.012, 0.004], [0, 0.006, z * MD / 2], chrome); for (const x of [-1, 1]) s.box([0.004, 0.012, MD], [x * MW / 2, 0.006, 0], chrome); }
    else { s.box([MW, 0.01, MD], [0, 0.005, 0], s.material('#bfe0d2', { roughness: 0.1, metalness: 0.1 })); top = 0.01; }

    // --- Jar.
    const jx = -0.11, jz = -0.06;
    const R = a.jar === 'mason' ? 0.07 : 0.062, H = a.jar === 'classic' ? 0.3 : a.jar === 'mason' ? 0.2 : 0.26;
    const foot = a.jar === 'classic' ? 0.022 : a.jar === 'apothecary' ? 0.03 : 0.004;
    const tint = new THREE.Color(LIQUID_TINT[a.liquid]);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#eaf6fb', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const fluid = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: a.liquid === 'cloudy' ? 0.9 : 0.74, roughness: 0.15, emissive: tint, emissiveIntensity: mix(0.35, 0.8, mood.cheer) * (a.liquid === 'cloudy' ? 0.4 : 1) });
    if (a.jar === 'classic') {
      s.cylinder(R + 0.007, R + 0.01, foot, [jx, top + foot / 2, jz], chrome, 32);
      s.ring(R + 0.006, 0.003, [jx, top + foot, jz], chrome).rotation.x = Math.PI / 2;
    } else if (a.jar === 'apothecary') {
      s.lathe([[0, 0], [R * 0.9, 0], [R * 0.9, 0.006], [R * 0.3, 0.018], [R * 0.3, foot - 0.004], [R * 0.7, foot], [0, foot]], s.material('#dcecf0', { roughness: 0.1 }), [jx, top, jz]);
    } else s.cylinder(R, R, foot, [jx, top + foot / 2, jz], s.material('#dcecf0', { roughness: 0.1 }), 32);
    const y0 = top + foot;
    const shoulder = a.jar === 'classic' ? 1 : 0.86;
    s.lathe([[0, 0], [R, 0], [R, H * 0.84], [R * shoulder, H], [R * shoulder - 0.003, H]], glass, [jx, y0, jz]);
    // A solid rim so the jar has an outline in every pass.
    s.ring(R * shoulder, 0.005, [jx, y0 + H, jz], a.jar === 'mason' ? s.material('#b8a468', { metalness: 0.8, roughness: 0.35 }) : s.material('#cfe6ee', { roughness: 0.1 })).rotation.x = Math.PI / 2;
    if (a.jar === 'mason') s.cylinder(R * shoulder + 0.003, R * shoulder + 0.003, 0.016, [jx, y0 + H - 0.008, jz], s.material('#b8a468', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), 32).geometry = new THREE.CylinderGeometry(R * shoulder + 0.003, R * shoulder + 0.003, 0.016, 32, 1, true);
    // Glints down the glass and a base ring, so the clear jar still has a body.
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    for (const [from, arc] of [[0.35, 0.16], [0.62, 0.05], [-0.9, 0.08]] as const) s.mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, H * 0.74, 5, 1, true, from, arc), glint, [jx, y0 + H * 0.45, jz]).castShadow = false;
    s.ring(R, 0.003, [jx, y0 + 0.003, jz], s.material('#cfe6ee', { roughness: 0.1 })).rotation.x = Math.PI / 2;
    const level = mix(0.42, 0.86, a.level) * H;
    const liquid = s.cylinder(R - 0.004, R - 0.004, level, [jx, y0 + level / 2 + 0.002, jz], fluid, 32);
    liquid.castShadow = false;
    // Meniscus line: a thin bright ring that sells the liquid surface.
    s.ring(R - 0.004, 0.0015, [jx, y0 + level + 0.002, jz], new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color('#ffffff'), 0.5), emissive: tint, emissiveIntensity: 0.6 })).rotation.x = Math.PI / 2;
    if (a.liquid === 'cloudy') {
      s.cylinder(R - 0.006, R - 0.006, 0.01, [jx, y0 + 0.007, jz], s.material('#4f5548', { roughness: 1 }), 24);
      const motes = Array.from({ length: 30 }, () => { const ang = random() * 6.3, r = random() * (R - 0.012); return { at: [jx + Math.cos(ang) * r, y0 + 0.01 + random() * level * 0.9, jz + Math.sin(ang) * r] as [number, number, number], size: mix(0.001, 0.003, random()) }; });
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#3d4238'), motes);
    }
    // Label band on the front.
    const labelText = { blue: 'DISINFECTANT', green: 'SANI-COMB', cloudy: 'DISINFECT', violet: 'SALON CLEAR', amber: 'ANTISEPTIC' }[a.liquid];
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = LIQUID_TINT[a.liquid]; ctx.fillRect(0, 0, 256, 22); ctx.fillRect(0, 106, 256, 22);
    ctx.fillStyle = '#b3202a'; ctx.beginPath(); ctx.moveTo(128, 30); ctx.lineTo(146, 48); ctx.lineTo(128, 66); ctx.lineTo(110, 48); ctx.fill();
    ctx.fillStyle = '#1c2540'; ctx.textAlign = 'center'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(labelText, 128, 96, 236);
    if (mood.wear > 0.5) { ctx.fillStyle = 'rgba(120,110,80,0.35)'; ctx.fillRect(0, 0, 256, 128); }
    const labelMap = new THREE.CanvasTexture(canvas);
    labelMap.colorSpace = THREE.SRGBColorSpace;
    if (a.jar !== 'apothecary') s.mesh(new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, 0.055, 24, 1, true, -0.6, 1.2), new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.6 }), [jx, y0 + H * 0.36, jz]).castShadow = false;

    // --- What stands in the jar.
    const combTints = ['#17171a', '#7a4318', '#17171a', '#e85b95', '#f2ecd8', '#17171a', '#2a6fb8'];
    const combCount = { combs: 5 + Math.round(mood.density * 2), mixed: 3, scissors: 0, single: 1, empty: 0 }[a.contents];
    const scissorCount = { combs: 0, mixed: 1, scissors: 2 + Math.round(mood.density), single: 0, empty: 0 }[a.contents];
    const stems = combCount + scissorCount;
    let slot = 0;
    const place = (group: THREE.Object3D) => {
      const ang = (slot / Math.max(stems, 1)) * Math.PI * 2 + random() * 0.5, r = stems === 1 ? 0.01 : (R - 0.02) * mix(0.5, 0.95, random());
      group.position.set(jx + Math.cos(ang) * r * 0.5, y0 + 0.006, jz + Math.sin(ang) * r * 0.5);
      group.rotation.set(Math.sin(ang) * -0.16 * (r / R) * 2, random() * Math.PI, Math.cos(ang) * 0.16 * (r / R) * 2, 'YXZ');
      // lean outward
      group.rotation.set(0, 0, 0);
      group.rotateOnWorldAxis(new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang)), -mix(0.06, 0.2, random()) * (a.lid ? 0.35 : 1));
      group.rotateY(random() * Math.PI);
      s.root.add(group);
      slot++;
    };
    for (let i = 0; i < combCount; i++) {
      const length = a.lid ? H - mix(0.03, 0.07, random()) : Math.min(mix(0.2, 0.26, random()), H + 0.07);
      const mesh = new THREE.Mesh(comb(length, 34, 0.036), s.material(combTints[i % combTints.length], { roughness: 0.35 }));
      mesh.castShadow = true;
      const g = new THREE.Group(); g.add(mesh);
      place(g);
    }
    for (let i = 0; i < scissorCount; i++) {
      const g = new THREE.Group();
      const length = Math.min(0.2, H - 0.035), open = mix(0.08, 0.22, random());
      for (const side of [-1, 1]) {
        const half = new THREE.Group();
        const bladeGeo = new THREE.CylinderGeometry(0.0045, 0.0012, length * 0.6, 4);
        const blade = new THREE.Mesh(bladeGeo, chrome); blade.position.y = length * 0.3; blade.scale.z = 0.35;
        const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.004, length * 0.38, 6), chrome); shank.position.set(side * 0.004, length * 0.6 + length * 0.19, 0); shank.rotation.z = -side * 0.12;
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 20), i % 2 ? s.material('#c4a03c', { metalness: 0.8, roughness: 0.3 }) : chrome); bow.position.set(side * 0.017, length + 0.012, 0);
        half.add(blade, shank, bow);
        half.rotation.z = side * open * 0.5;
        half.position.y = 0;
        half.traverse((node) => { (node as THREE.Mesh).castShadow = true; });
        // Pivot the pair about the screw at 60% height.
        const arm = new THREE.Group(); arm.position.y = length * 0.6; half.position.y = -length * 0.6; arm.add(half); arm.rotation.z = side * open * 0.5; half.rotation.z = 0;
        g.add(arm);
      }
      const screw = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), chrome); screw.position.y = length * 0.6; g.add(screw);
      place(g);
    }

    // --- Lid.
    const lid = new Sculpture(context);
    s.root.add(lid.root);
    if (a.jar === 'classic') {
      lid.lathe([[R + 0.006, 0], [R + 0.006, 0.012], [R * 0.8, 0.026], [R * 0.3, 0.034], [0.012, 0.036], [0.012, 0.044], [0.018, 0.05], [0.014, 0.058], [0, 0.06]], chrome);
    } else if (a.jar === 'mason') {
      lid.cylinder(R * shoulder + 0.004, R * shoulder + 0.004, 0.004, [0, 0.002, 0], s.material('#b8a468', { metalness: 0.8, roughness: 0.35 }), 28);
    } else {
      lid.cylinder(R * shoulder * 0.8, R * shoulder * 0.7, 0.012, [0, 0.006, 0], s.material('#dcecf0', { roughness: 0.1 }), 24);
      lid.ball([0.024, 0.024, 0.024], [0, 0.034, 0], s.material('#dcecf0', { roughness: 0.08 }), 16);
    }
    // With the lid on, the tools are cut short enough to sit submerged under it.
    if (a.lid) lid.root.position.set(jx, y0 + H, jz);
    else { lid.root.position.set(jx - 0.02, top, 0.075); lid.root.rotation.y = random() * 3; }

    // --- Clipper guards: a row of coloured snap-on combs.
    const guardTints = ['#d9342b', '#f08a1c', '#f2d21f', '#3fa64a', '#2f6fd0', '#7a3fb8'];
    const guards = 3 + Math.round(mood.density * 3);
    for (let i = 0; i < guards; i++) {
      const g = new Sculpture(context);
      s.root.add(g.root);
      const m = s.material(guardTints[i % guardTints.length], { roughness: 0.4 });
      const h = 0.012 + i * 0.004;
      g.box([0.044, 0.006, 0.03], [0, h, -0.012], m);
      g.box([0.044, h, 0.004], [0, h / 2, -0.027], m);
      for (let t = 0; t < 7; t++) { const tooth = g.box([0.0035, h * 0.9, 0.04], [-0.018 + t * 0.006, h * 0.5, 0.012], m); tooth.rotation.x = 0.12; }
      const rowX = 0.02 + i * mix(0.05, 0.05, tidy), rowZ = 0.07;
      g.root.position.set(mix(0.0 + random() * 0.2, rowX * 0.78 + 0.0, tidy), top, mix(0.02 + random() * 0.08, rowZ, tidy));
      g.root.rotation.y = mix((random() - 0.5) * 3, 0, tidy);
      if (tidy < 0.35 && random() < 0.4) { g.root.rotation.x = Math.PI / 2; g.root.position.y = top + 0.03; }
    }

    // --- Neck duster.
    const duster = new Sculpture(context);
    s.root.add(duster.root);
    duster.lathe([[0, 0], [0.02, 0], [0.022, 0.006], [0.012, 0.03], [0.014, 0.07], [0.019, 0.085], [0.017, 0.092], [0, 0.092]], s.material('#8a5328', { roughness: 0.45 }));
    duster.ring(0.0175, 0.003, [0, 0.091, 0], chrome).rotation.x = Math.PI / 2;
    duster.lathe([[0.016, 0.09], [0.03, 0.12], [0.046, 0.16], [0.05, 0.185], [0.04, 0.2], [0.02, 0.208], [0, 0.21]], s.material('#f4f0e4', { roughness: 1 }));
    if (mood.wear > 0.4) duster.lathe([[0.049, 0.18], [0.041, 0.2], [0.02, 0.209], [0, 0.211]], s.material('#b9b3a8', { roughness: 1 }));
    if (tidy > 0.45) duster.root.position.set(0.04, top, -0.07);
    else { duster.root.rotation.set(0, mix(0.4, 1.2, random()), Math.PI / 2 - 0.2); duster.root.position.set(0.14, top + 0.03, -0.07); }

    // --- The extra.
    const ex = 0.15, ez = tidy > 0.45 ? -0.05 : -0.02;
    if (a.beside === 'clippers') {
      const body = new Sculpture(context);
      s.root.add(body.root);
      body.box([0.045, 0.04, 0.15], [0, 0.02, 0], s.material(mood.cheer > 0.5 ? '#b3262d' : '#22252a', { roughness: 0.35 }));
      body.box([0.04, 0.03, 0.03], [0, 0.017, 0.09], chrome);
      for (let t = 0; t < 9; t++) body.box([0.002, 0.004, 0.014], [-0.016 + t * 0.004, 0.006, 0.11], chrome);
      body.box([0.012, 0.006, 0.03], [0, 0.043, 0.02], s.material('#d9d9d9'));
      const cord: [number, number, number][] = [];
      for (let i = 0; i <= 36; i++) cord.push([Math.sin(i * 1.3) * 0.008 + i * 0.002, 0.012 + Math.cos(i * 1.3) * 0.008, -0.08 - i * 0.0035]);
      body.tube(cord, 0.0025, dark);
      body.root.position.set(ex, top, ez + 0.03);
      body.root.rotation.y = mix(random() * 2 - 1, 0, tidy);
    } else if (a.beside === 'spray') {
      const clear = new THREE.MeshPhysicalMaterial({ color: '#e6f3f6', transparent: true, opacity: 0.45, roughness: 0.1 });
      s.lathe([[0, 0], [0.03, 0], [0.032, 0.01], [0.032, 0.1], [0.014, 0.125], [0.014, 0.135], [0, 0.135]], clear, [ex, top, ez]);
      s.cylinder(0.016, 0.016, 0.018, [ex, top + 0.143, ez], s.material('#e9e9e9'), 16);
      s.box([0.02, 0.022, 0.05], [ex, top + 0.163, ez + 0.012], s.material('#e9e9e9'));
      s.box([0.008, 0.035, 0.008], [ex, top + 0.138, ez + 0.026], s.material('#d0342c')).rotation.x = 0.3;
    } else if (a.beside === 'talc') {
      s.cylinder(0.024, 0.024, 0.1, [ex, top + 0.05, ez], s.material('#e8dcc0', { roughness: 0.4 }), 20);
      s.ball([0.024, 0.012, 0.024], [ex, top + 0.1, ez], chrome, 16);
      s.label('TALC', 0.032, 0.022, [ex, top + 0.055, ez + 0.0245], '#8a2b2b', '#f6efdc').castShadow = false;
    }

    // --- Mess: clippings and drips when untidy.
    if (tidy < 0.5) {
      const bits = Array.from({ length: Math.round(mix(120, 10, tidy * 2)) }, () => ({ at: [(random() - 0.5) * MW * 0.95, top + 0.002, (random() - 0.5) * MD * 0.95] as [number, number, number], size: mix(0.002, 0.006, random()), color: new THREE.Color().setHSL(0.07, 0.4, random() * 0.3) }));
      s.scatter(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), bits);
      const drip = s.cylinder(0.03, 0.03, 0.0015, [jx + R + 0.04, top + 0.001, jz + 0.07], fluid, 16);
      drip.scale.z = 0.6;
    }

    return s.finish();
  },
});

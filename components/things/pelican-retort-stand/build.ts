import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIQUIDS = {
  quicksilver: 'Heavy mirror-bright mercury.',
  blood: 'Deep blood red, the rubedo.',
  emerald: 'Vivid emerald green, vitriol or the green lion.',
  gold: 'Glowing liquid gold.',
  black: 'Tar black, the nigredo, putrefaction.',
  milk: 'Opaque milk white, the albedo.',
  violet: 'Luminous violet, faintly wrong.',
  azure: 'Clear sky blue.',
} as const;
type Liquid = keyof typeof LIQUIDS;
const TINT: Record<Liquid, string> = { quicksilver: '#c9d0d4', blood: '#a3121c', emerald: '#1fa35a', gold: '#f0b21e', black: '#1b1718', milk: '#f1ede2', violet: '#8a3fe0', azure: '#3f9be8' };

type Profile = (readonly [number, number])[];
/** The part of a vessel profile below `cut`, shrunk a little: the liquid inside it. */
function fillOf(profile: Profile, cut: number): Profile {
  const out: [number, number][] = [];
  for (let i = 0; i < profile.length; i++) {
    const [r, y] = profile[i];
    if (y <= cut) { out.push([r * 0.9, y + 0.004]); continue; }
    const [pr, py] = profile[i - 1];
    const t = (cut - py) / (y - py);
    out.push([(pr + (r - pr) * t) * 0.9, cut]);
    break;
  }
  out.push([0, cut]);
  return out;
}

export default defineThing({
  questions: {
    vessel: choice('Which vessel sits over the flame?', {
      pelican: 'A pelican: a fat body, a narrow neck, and two glass arms curving from the head back into the belly.',
      twins: 'Twin vessels side by side, each one\'s neck bent over into the other.',
      stork: 'A single tall vessel whose long neck loops over and plunges back into its own side.',
      egg: 'A sealed philosopher\'s egg: a plain glass ovoid drawn to a melted point.',
    }),
    liquid: choice('What colour is the liquid in the main vessel?', LIQUIDS),
    second: choice('If there are retorts beside it, what colour is in them?', LIQUIDS),
    retorts: choice('How many long-necked retorts stand beside it?', {
      none: 'None: the one vessel alone.',
      one: 'One retort on a rod stand, dripping into a vial.',
      two: 'Two retorts, one each side, necks pointing outwards.',
    }),
    stage: choice('What is happening in the glass right now?', {
      cold: 'Nothing: the lamp is out and the liquid has settled.',
      circulating: 'A gentle simmer, vapour rising and running back down the arms.',
      violent: 'A violent boil, the vessel full of bubbles and dense vapour.',
      leaking: 'A crack has opened and the liquid is weeping down onto the board.',
      shattered: 'It has burst: a jagged stump, shards and a spreading spill.',
    }),
    stand: choice('What holds the vessel?', {
      tripod: 'A black iron tripod with a ring.',
      ringstand: 'A brass rod stand with a ring clamp.',
      rack: 'A turned wooden rack with a crossbar.',
      bricks: 'Two stacks of loose bricks with iron bars laid across.',
    }),
    lamp: choice('What kind of lamp heats it?', {
      oil: 'A squat brass oil lamp with a yellow flame.',
      candle: 'A fat tallow candle stub, guttered with drips.',
      spirit: 'A glass spirit burner with a small blue flame.',
    }),
    glass: choice('What is the glass like?', {
      clear: 'Fine clear crystal.',
      forest: 'Greenish forest glass, bubbled and uneven.',
      amber: 'Amber-brown glass.',
      smoky: 'Grey smoky glass, sooted at the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.stage === 'circulating' || a.stage === 'violent' || a.stage === 'leaking';
    const glassTint = { clear: '#e3f1ee', forest: '#8fc79a', amber: '#d9a85a', smoky: '#9c9c9a' }[a.glass];
    const glass = new THREE.MeshPhysicalMaterial({ color: glassTint, transparent: true, opacity: a.glass === 'clear' ? 0.32 : 0.45, roughness: 0.05, side: THREE.DoubleSide });
    const liquidOf = (key: Liquid) => new THREE.MeshStandardMaterial({
      color: TINT[key], roughness: key === 'quicksilver' ? 0.12 : 0.3, metalness: key === 'quicksilver' ? 0.9 : 0,
      emissive: TINT[key], emissiveIntensity: key === 'gold' || key === 'violet' ? 0.55 : key === 'black' ? 0 : 0.18,
    });
    const main = liquidOf(a.liquid), side = liquidOf(a.second);
    const iron = s.material('#27262a', { metalness: 0.5, roughness: 0.6 });
    const brass = s.material('#b8963e', { metalness: 0.8, roughness: 0.35 });
    const wood = s.material('#74512f'), darkWood = s.material('#4d3520');
    const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false });

    // Board everything stands on.
    const nRetorts = { none: 0, one: 1, two: 2 }[a.retorts];
    const boardW = nRetorts === 2 ? 1.16 : nRetorts === 1 ? 0.86 : 0.5;
    const boardX = nRetorts === 1 ? 0.18 : 0;
    s.box([boardW, 0.03, 0.42], [boardX, 0.015, 0], wood);
    for (const x of [-1, 1]) s.box([0.04, 0.02, 0.42], [boardX + x * (boardW / 2 - 0.05), -0.01 + 0.01, 0], darkWood);
    const T = 0.03, R = 0.27; // board top, support height

    // Support.
    if (a.stand === 'tripod') {
      for (let i = 0; i < 3; i++) { const g = i * 2.094 + 0.52; s.rod([Math.sin(g) * 0.15, T, Math.cos(g) * 0.15], [Math.sin(g) * 0.105, R, Math.cos(g) * 0.105], 0.008, iron); }
      s.ring(0.105, 0.008, [0, R, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.stand === 'ringstand') {
      s.box([0.2, 0.025, 0.14], [0, T + 0.0125, -0.14], brass);
      s.rod([0, T, -0.16], [0, 0.82, -0.16], 0.009, brass);
      s.ring(0.105, 0.007, [0, R, 0], brass).rotation.x = Math.PI / 2;
      s.rod([0, R, -0.105], [0, R, -0.17], 0.007, brass);
      s.box([0.03, 0.035, 0.03], [0, R, -0.16], brass);
      s.ring(0.03, 0.006, [0, 0.62, -0.02], brass).rotation.x = Math.PI / 2; // neck steady
      s.rod([0, 0.62, -0.05], [0, 0.62, -0.17], 0.006, brass);
    } else if (a.stand === 'rack') {
      for (const x of [-0.17, 0.17]) { s.cylinder(0.014, 0.018, R + 0.03 - T, [x, (R + 0.03 + T) / 2, 0], darkWood, 10); s.ball([0.022, 0.022, 0.022], [x, R + 0.045, 0], darkWood, 10); s.box([0.06, 0.02, 0.2], [x, T + 0.01, 0], darkWood); }
      for (const z of [-0.085, 0.085]) s.box([0.36, 0.016, 0.022], [0, R - 0.008, z], wood);
    } else {
      const brick = s.material('#9a4d38', { roughness: 0.95 });
      for (const x of [-0.16, 0.16]) for (let i = 0; i < 4; i++) { const b = s.box([0.1, 0.057, 0.2], [x + (random() - 0.5) * 0.012, T + 0.03 + i * 0.059, (random() - 0.5) * 0.02], brick); b.rotation.y = (random() - 0.5) * 0.12; }
      for (const z of [-0.07, 0.07]) s.rod([-0.2, R - 0.006, z], [0.2, R - 0.006, z], 0.007, iron);
    }

    // Lamp.
    const flameColour = a.lamp === 'spirit' ? '#5aa8ff' : new THREE.Color('#ffb040').lerp(new THREE.Color('#ff7a20'), mood.warmth).getStyle();
    const flameMat = new THREE.MeshStandardMaterial({ color: flameColour, emissive: flameColour, emissiveIntensity: 1.1, transparent: true, opacity: 0.92 });
    let wickY = T + 0.1;
    if (a.lamp === 'oil') { s.lathe([[0, 0], [0.055, 0.004], [0.07, 0.035], [0.045, 0.07], [0.014, 0.08], [0.012, 0.1]], brass, [0, T, 0]); const h = s.ring(0.022, 0.005, [0.07, T + 0.04, 0], brass); h.rotation.y = 0; }
    else if (a.lamp === 'candle') { wickY = T + 0.085 + random() * 0.05; s.cylinder(0.028, 0.03, wickY - T, [0, (wickY + T) / 2, 0], s.material('#e8dcb8'), 12); s.cylinder(0.05, 0.055, 0.008, [0, T + 0.004, 0], s.material('#e8dcb8'), 12); for (let i = 0; i < 3; i++) { const g = random() * 6.28; s.ball([0.008, 0.03, 0.008], [Math.cos(g) * 0.029, wickY - 0.03 - random() * 0.02, Math.sin(g) * 0.029], s.material('#e8dcb8'), 6); } }
    else { s.lathe([[0, 0], [0.05, 0.004], [0.06, 0.03], [0.03, 0.07], [0.015, 0.08]], glass, [0, T, 0]); s.cylinder(0.045, 0.045, 0.025, [0, T + 0.02, 0], s.material('#cfe0f0', { roughness: 0.2 }), 12); s.cylinder(0.016, 0.016, 0.02, [0, T + 0.088, 0], brass, 8); wickY = T + 0.098; }
    const flame = s.mesh(new THREE.SphereGeometry(1, 10, 8), flameMat, [0, wickY + 0.035, 0]);
    flame.scale.set(0.014, 0.035, 0.014); flame.castShadow = false; flame.visible = lit;
    if (a.glass === 'smoky' || mood.wear > 0.6) { const soot = s.cylinder(0.07, 0.07, 0.004, [0, R + 0.012, 0], s.material('#1a1716'), 14); soot.castShadow = false; }

    // The main vessel.
    const burst = a.stage === 'shattered';
    const fillLevel = burst ? 0.3 : mix(0.4, 0.75, random());
    const bubbleHome: [number, number, number][] = [];
    const vesselAt = (profile: Profile, x: number, bodyTop: number, liquid: THREE.Material) => {
      const used = burst ? [...fillOf(profile, bodyTop * (0.45 + random() * 0.2)).slice(0, -1).map(([r, y]) => [r / 0.9, y] as const)] : profile;
      s.lathe(used, glass, [x, R, 0]);
      const fill = s.lathe(fillOf(profile, bodyTop * fillLevel), liquid, [x, R, 0]); fill.castShadow = false;
      bubbleHome.push([x, R + 0.02, bodyTop * fillLevel]);
    };
    const arm = (points: [number, number, number][], r = 0.011) => { if (!burst) s.tube(points.map(([x, y, z]) => [x, R + y, z] as const), r, glass); };
    let headY = 0.4;
    if (a.vessel === 'pelican') {
      vesselAt([[0, 0], [0.05, 0.004], [0.1, 0.05], [0.108, 0.1], [0.085, 0.17], [0.036, 0.23], [0.026, 0.3], [0.032, 0.33], [0.062, 0.37], [0.058, 0.42], [0.022, 0.455], [0.012, 0.48], [0, 0.486]], 0, 0.2, main);
      for (const d of [-1, 1]) arm([[d * 0.05, 0.4, 0], [d * 0.11, 0.41, 0], [d * 0.17, 0.34, 0], [d * 0.175, 0.22, 0], [d * 0.14, 0.15, 0], [d * 0.095, 0.13, 0]]);
      headY = 0.39;
    } else if (a.vessel === 'twins') {
      for (const d of [-1, 1]) {
        vesselAt([[0, 0], [0.04, 0.004], [0.07, 0.045], [0.072, 0.09], [0.05, 0.15], [0.02, 0.19], [0.016, 0.22]], d * 0.078, 0.17, d < 0 ? main : side);
        arm([[d * 0.078, 0.21, 0], [d * 0.075, 0.33, d * 0.012], [d * 0.01, 0.4, d * 0.03], [-d * 0.08, 0.33, d * 0.035], [-d * 0.115, 0.2, d * 0.03], [-d * 0.1, 0.14, d * 0.02]], 0.014);
      }
      headY = 0.36;
    } else if (a.vessel === 'stork') {
      vesselAt([[0, 0], [0.05, 0.004], [0.095, 0.05], [0.1, 0.11], [0.07, 0.19], [0.03, 0.25], [0.022, 0.3]], 0, 0.22, main);
      arm([[0, 0.29, 0], [0, 0.44, 0], [0.04, 0.53, 0], [0.12, 0.54, 0], [0.18, 0.45, 0], [0.18, 0.28, 0], [0.14, 0.16, 0], [0.09, 0.13, 0]], 0.018);
      headY = 0.5;
    } else {
      vesselAt([[0, 0], [0.045, 0.006], [0.095, 0.07], [0.105, 0.15], [0.085, 0.25], [0.045, 0.33], [0.014, 0.38], [0.006, 0.43], [0, 0.44]], 0, 0.33, main);
      if (!burst) s.ring(0.03, 0.006, [0, R + 0.365, 0], s.material('#8a1f1f')).rotation.x = Math.PI / 2; // wax seal
      headY = 0.3;
    }
    if (lit && a.stage !== 'leaking') { const fog = s.ball([0.045, 0.04, 0.045], [0, R + headY, 0], vapour, 10); fog.castShadow = false; if (a.stage === 'violent') fog.scale.set(0.07, 0.09, 0.07); }

    // Leak or burst.
    const spill = (x: number, z: number, r: number, material: THREE.Material) => { const p = s.cylinder(r, r, 0.004, [x, T + 0.002, z], material, 20); p.scale.z = 0.6 + random() * 0.3; p.castShadow = false; };
    if (a.stage === 'leaking') {
      const cx = 0.06, cz = 0.085;
      s.tube([[cx - 0.02, R + 0.17, cz - 0.02], [cx, R + 0.13, cz], [cx - 0.015, R + 0.1, cz + 0.008], [cx + 0.01, R + 0.06, cz]], 0.003, s.material('#f7ffff', { emissive: '#ffffff', emissiveIntensity: 0.3 }));
      s.tube([[cx + 0.01, R + 0.06, cz + 0.004], [cx + 0.015, R + 0.02, cz - 0.015], [cx + 0.02, R - 0.1, cz], [cx + 0.02, T, cz + 0.01]], 0.005, main);
      spill(cx + 0.04, cz + 0.03, 0.09 + random() * 0.04, main);
    }
    if (burst) {
      spill(0.02, 0.05, 0.17, main);
      const shards = [];
      for (let i = 0; i < Math.round(mix(14, 30, mood.density)); i++) { const g = random() * 6.28, r = 0.08 + random() * 0.2; shards.push({ at: [Math.cos(g) * r * 1.3, T + 0.008, Math.sin(g) * r * 0.75] as const, size: 0.012 + random() * 0.022 }); }
      s.scatter(new THREE.TetrahedronGeometry(1, 0), glass, shards);
    }

    // Retorts on rod stands.
    for (let i = 0; i < nRetorts; i++) {
      const d = nRetorts === 2 ? (i ? 1 : -1) : 1;
      const x = d * 0.3, by = 0.33 + random() * 0.06, z = 0.02;
      s.cylinder(0.055, 0.06, 0.02, [x, T + 0.01, -0.1], iron, 14);
      s.rod([x, T, -0.1], [x, by + 0.2, -0.1], 0.007, iron);
      s.rod([x, by - 0.07, -0.1], [x, by - 0.07, z], 0.006, iron);
      s.ring(0.045, 0.006, [x, by - 0.07, z], iron).rotation.x = Math.PI / 2;
      s.ball([0.066, 0.066, 0.066], [x, by, z], glass, 18).castShadow = false;
      const depth = mix(0.028, 0.042, random());
      s.ball([0.054, depth, 0.054], [x, by - 0.06 + depth, z], side, 14).castShadow = false;
      const tipX = x + d * 0.2, tipY = by - 0.1;
      s.tube([[x, by + 0.05, z], [x + d * 0.02, by + 0.085, z], [x + d * 0.07, by + 0.08, z], [tipX, tipY, z]], 0.015, glass);
      // Receiving vial.
      s.lathe([[0, 0], [0.03, 0.003], [0.034, 0.08], [0.014, 0.12], [0.014, 0.16], [0.019, 0.165]], glass, [tipX + d * 0.012, T, z]);
      const h = 0.02 + random() * 0.05;
      s.cylinder(0.028, 0.028, h, [tipX + d * 0.012, T + 0.005 + h / 2, z], side, 10).castShadow = false;
    }

    // Bubbles.
    const bubbles: THREE.Mesh[] = [];
    if (lit) {
      const bubbleMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, roughness: 0.1 });
      const n = a.stage === 'violent' ? 12 : 4;
      for (let i = 0; i < n; i++) {
        const home = bubbleHome[i % bubbleHome.length];
        const b = s.ball([1, 1, 1], [0, 0, 0], bubbleMat, 6); b.castShadow = false;
        b.userData = { x: home[0] + (random() - 0.5) * 0.09, z: (random() - 0.5) * 0.09, y: home[1], h: home[2], phase: random(), size: 0.006 + random() * (a.stage === 'violent' ? 0.012 : 0.005) };
        bubbles.push(b);
      }
    }
    const pose = (time: number) => {
      for (const b of bubbles) { const t = (b.userData.phase + time) % 1; b.position.set(b.userData.x, b.userData.y + t * b.userData.h, b.userData.z); b.scale.setScalar(b.userData.size * (0.6 + t * 0.6)); }
      flame.scale.y = 0.035 * (1 + 0.18 * Math.sin(time * 9));
    };
    pose(0);
    const speed = mix(0.4, 2.2, mood.energy) * (a.stage === 'violent' ? 1.6 : 1);
    return s.finish({ update: (_dt, time) => pose(time * speed) });
  },
});

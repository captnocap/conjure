import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, paint, rod, seg, stencil, tube } from './h';

const LIVERY = {
  olive: '#5f6d47', desert: '#b99b69', arctic: '#d6dbdd', navy: '#4c5b6c', hazard: '#d88a1f', crimson: '#8f302b',
} as const;
const SHAPE = {
  scout: { hipY: 2.7, hipX: 0.85, limb: 0.4, w: 1.9, h: 1.25, d: 2.3, digit: true, arms: false },
  heavy: { hipY: 2.9, hipX: 1.25, limb: 0.78, w: 3.0, h: 2.0, d: 2.0, digit: false, arms: true },
  salvaged: { hipY: 2.9, hipX: 1.0, limb: 0.56, w: 2.3, h: 1.7, d: 1.7, digit: false, arms: true },
  ceremonial: { hipY: 3.5, hipX: 0.85, limb: 0.44, w: 2.0, h: 1.8, d: 1.4, digit: false, arms: true },
} as const;

export default defineThing({
  questions: {
    chassis: choice('What class of walker is it?', {
      scout: 'A light scout: a long cockpit pod on backward-bending bird legs, no arms, guns slung under the chin.',
      heavy: 'A heavy assault frame: squat, broad, slab shoulders and thick legs, built to be hit.',
      salvaged: 'A salvaged mongrel: mismatched panels from three machines, weld patches, one arm that does not belong.',
      ceremonial: 'A tall slender parade frame with gilded trim, a head crest and banners hung from the shoulders.',
    }),
    state: choice('What state is it in?', {
      pristine: 'Fresh from overhaul: clean paint, every panel fitted, ready on the line.',
      scarred: 'Back from the fight: scorch marks, a shoulder plate torn away, red primer over field repairs.',
      stripped: 'A hangar queen being stripped for parts: an arm gone, panels off, the hull propped on jack stands.',
      undeployed: 'Never deployed: still on its shipping skid with red tags hanging from the joints and wrap on the hands.',
    }),
    livery: choice('What colour is its armour?', {
      olive: 'Flat olive drab.', desert: 'Sand tan.', arctic: 'Winter white-grey.', navy: 'Blue-grey naval paint.',
      hazard: 'Industrial hazard orange, a working machine.', crimson: 'Deep ace red.',
    }),
    marking: choice('What unit marking does it carry?', {
      numeral: 'A big two-digit number in white stencil.',
      chevrons: 'Three stacked rank chevrons.',
      roundel: 'A ringed roundel like an air force insignia.',
      band: 'A plain white invasion stripe and nothing else.',
      none: 'No markings at all; anonymous.',
    }),
    armament: choice('What does it carry?', {
      hands: 'Nothing: bare manipulators, a working or unarmed machine.',
      autocannon: 'A long-barrelled autocannon with a drum magazine.',
      missiles: 'A boxy missile rack on the shoulder.',
      shield: 'A slab shield on one arm, taller than a door.',
      cutter: 'An industrial claw and cutting arm.',
    }),
    hatch: score('How far open is the cockpit hatch?', ['Sealed shut', 'Cracked open', 'Raised halfway', 'Thrown wide open']),
    powered: noul('Are the cockpit and sensor eye lit?'),
    ladder: noul('Is a boarding ladder hooked to the cockpit?'),
    umbilical: noul('Is a thick power umbilical plugged into its back?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const c = SHAPE[a.chassis];
    const R = s.root;
    const base = LIVERY[a.livery];
    const gloss = a.state === 'pristine' || a.state === 'undeployed' || a.chassis === 'ceremonial';
    const armour = s.material(base, { roughness: gloss ? 0.42 : 0.75, metalness: 0.15 });
    const frame = s.material('#33373a', { roughness: 0.55, metalness: 0.5 });
    const steel = s.material('#8b9296', { roughness: 0.35, metalness: 0.8 });
    const chrome = s.material('#d3d8da', { roughness: 0.2, metalness: 0.9 });
    const trim = s.material(a.chassis === 'ceremonial' ? '#c9a23a' : '#2b2e30', { roughness: a.chassis === 'ceremonial' ? 0.3 : 0.6, metalness: a.chassis === 'ceremonial' ? 0.8 : 0.3 });
    const primer = s.material('#9c4a35', { roughness: 0.9 });
    const scorch = new THREE.MeshStandardMaterial({ color: '#1b1917', roughness: 1 });
    const red = new THREE.MeshStandardMaterial({ color: '#d5281f', roughness: 0.7, side: THREE.DoubleSide });
    const odd = Object.values(LIVERY).filter((v) => v !== base).map((v) => s.material(v, { roughness: 0.85 }));
    /** Which paint a given plate wears: salvage draws from other machines, repairs are primer. */
    const plate = () => {
      if (a.chassis === 'salvaged' && random() < 0.55) return random() < 0.3 ? primer : odd[Math.floor(random() * odd.length)];
      if (a.state === 'scarred' && random() < 0.22) return primer;
      return armour;
    };
    const missing = (chance: number) => a.state === 'stripped' && random() < chance;
    const L = c.limb;
    const eyeColour = new THREE.Color().setHSL(mix(0.52, 0.04, mood.warmth), 0.9, 0.55);
    const glow = new THREE.MeshStandardMaterial({ color: a.powered ? eyeColour : '#20262a', emissive: a.powered ? eyeColour : '#000000', emissiveIntensity: 1.6, roughness: 0.3 });
    const scorchSpots: V[] = [];

    // Legs: dark frame, bolt-on armour, a drum at every joint and a chrome piston behind.
    for (const sx of [-1, 1]) {
      const x = sx * c.hipX;
      const hip: V = [x, c.hipY, 0];
      const knee: V = c.digit ? [x, c.hipY * 0.6, -0.85] : [x, c.hipY * 0.52, 0.38];
      const ankle: V = c.digit ? [x, 0.75, 0.25] : [x, 0.5, -0.08];
      const lerp = (p: V, q: V, t: number): V => [mix(p[0], q[0], t), mix(p[1], q[1], t), mix(p[2], q[2], t)];
      seg(R, hip, knee, L * 0.5, L * 0.55, frame);
      seg(R, knee, ankle, L * 0.45, L * 0.5, frame);
      if (!missing(0.55)) seg(R, lerp(hip, knee, 0.14), lerp(hip, knee, 0.84), L * 1.05, L * 1.25, plate());
      if (!missing(0.55)) {
        seg(R, lerp(knee, ankle, 0.1), lerp(knee, ankle, 0.9), L * 0.95, L * 1.1, plate());
        box(R, [L * 0.8, L * 0.7, 0.12], [x, knee[1] + L * 0.1, knee[2] + L * 0.7], trim, [-0.25, 0, 0]);
      }
      for (const j of [hip, knee, ankle]) cyl(R, L * 0.46, L * 0.46, L * 1.2, j, steel, [0, 0, Math.PI / 2], 14);
      const back = c.digit ? 0.55 : -0.5;
      rod(R, [x, mix(hip[1], knee[1], 0.3), mix(hip[2], knee[2], 0.3) + back * L], [x, mix(knee[1], ankle[1], 0.55), mix(knee[2], ankle[2], 0.55) + back * L], L * 0.1, chrome);
      rod(R, [x, mix(hip[1], knee[1], 0.3), mix(hip[2], knee[2], 0.3) + back * L], [x, mix(hip[1], knee[1], 0.75), mix(hip[2], knee[2], 0.75) + back * L], L * 0.17, frame);
      // Foot: a long sole, a sloped toe cap and a heel spur.
      const footL = c.digit ? L * 3.6 : L * 2.7;
      box(R, [L * 1.5, 0.3, footL], [x, 0.15, ankle[2] + footL * 0.18], frame);
      box(R, [L * 1.55, 0.3, footL * 0.5], [x, 0.36, ankle[2] + footL * 0.36], plate(), [0.28, 0, 0]);
      box(R, [L * 0.9, 0.24, L * 0.9], [x, 0.3, ankle[2] - footL * 0.3], trim, [-0.3, 0, 0]);
      if (c.digit) for (const t of [-1, 1]) box(R, [L * 0.4, 0.22, L * 1.6], [x + t * L * 0.75, 0.11, ankle[2] + footL * 0.5], frame, [0, -t * 0.35, 0]);
      scorchSpots.push([x, mix(knee[1], ankle[1], 0.4), mix(knee[2], ankle[2], 0.4) + L * 0.58]);
      if (a.state === 'undeployed') for (const j of [knee, hip]) box(R, [0.14, 0.75, 0.01], [x + sx * L * 0.63, j[1] - 0.45, j[2] + 0.05], red, [0, 0, sx * (0.05 + random() * 0.15)]);
    }

    // Pelvis and waist ring.
    box(R, [c.hipX * 2 - L * 0.3, 0.62, c.digit ? 1.2 : 0.95], [0, c.hipY + 0.05, 0], frame);
    box(R, [c.hipX * 1.1, 0.7, 0.14], [0, c.hipY - 0.15, (c.digit ? 0.6 : 0.5)], plate(), [0.2, 0, 0]);
    cyl(R, L * 0.9, L * 0.9, 0.5, [0, c.hipY + 0.55, 0], steel, [0, 0, 0], 20);
    const crotch: V = [0, c.hipY - 0.15, (c.digit ? 0.6 : 0.5) + 0.085];
    for (let i = 0; i < 4; i++) rod(R, [(i - 1.5) * 0.16, c.hipY + 0.3, -0.42], [(i - 1.5) * 0.2, c.hipY + 0.9, -0.5], 0.035, frame);

    // Torso: a faceted hull extruded from its side profile, nose forward.
    const ty = c.hipY + 0.8 + c.h / 2;
    const { w: W, h: H, d: D } = c;
    const tz = c.digit ? 0.25 : 0;
    const profile: [number, number][] = c.digit
      ? [[-D / 2, -H * 0.3], [-D / 2, H * 0.35], [-D * 0.25, H / 2], [D * 0.12, H / 2], [D / 2, -H * 0.05], [D * 0.42, -H / 2], [-D * 0.3, -H / 2]]
      : [[-D / 2, -H / 2], [-D / 2, H * 0.38], [-D * 0.28, H / 2], [D * 0.18, H / 2], [D / 2, H * 0.08], [D * 0.36, -H / 2]];
    const hullShape = new THREE.Shape(profile.map(([px, py]) => new THREE.Vector2(px, py)));
    const hullGeometry = new THREE.ExtrudeGeometry(hullShape, { depth: W, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
    hullGeometry.translate(0, 0, -W / 2);
    const hull = group(R, [0, ty, tz], [0, -Math.PI / 2, 0]);
    add(hull, hullGeometry, armour);
    // Side skirts and a chin plate so the hull reads as armour over a frame.
    for (const sx of [-1, 1]) {
      box(R, [0.1, H * 0.55, D * 0.6], [sx * (W / 2 + 0.07), ty - H * 0.1, tz - D * 0.05], plate());
      for (let i = 0; i < 4; i++) box(R, [0.04, 0.05, D * 0.3], [sx * (W / 2 + 0.13), ty + H * 0.02 - i * 0.11, tz - D * 0.12], frame);
    }
    box(R, [W * 0.5, 0.12, D * 0.3], [0, ty - H / 2 - 0.04, tz + D * 0.2], trim);
    scorchSpots.push([W * 0.3, ty + H * 0.05, tz + D * 0.47], [-W * 0.36, ty - H * 0.2, tz + D * 0.42]);

    // Cockpit: a dark well on the sloped glacis with a seat and instruments, and the hatch hinged above it.
    const hingeAt: V = [0, ty + H / 2 + 0.03, tz + D * (c.digit ? 0.12 : 0.18)];
    const slope: V = [0, -H * (c.digit ? 0.55 : 0.42), D * (c.digit ? 0.38 : 0.32)];
    const well = group(R, hingeAt);
    const cw = W * (c.digit ? 0.62 : 0.44);
    seg(well, [0, 0.02, 0.04], [slope[0], slope[1] + 0.02, slope[2] + 0.04], cw, 0.06, new THREE.MeshStandardMaterial({ color: '#131517', roughness: 0.9 }));
    box(well, [cw * 0.5, 0.5, 0.14], [0, slope[1] * 0.35 + 0.05, slope[2] * 0.3 + 0.1], s.material('#6b4b33'), [-0.5, 0, 0]);
    for (let i = 0; i < 5; i++) box(well, [cw * 0.12, 0.07, 0.05], [(i - 2) * cw * 0.17, slope[1] * 0.82, slope[2] * 0.86 + 0.09], i % 2 ? glow : s.material('#c98a1e', { emissive: a.powered ? '#c98a1e' : '#000000', emissiveIntensity: 1 }));
    const open = a.state === 'stripped' ? -1 : a.hatch;
    if (open >= 0) {
      const lid = group(R, hingeAt, [-open * 1.75, 0, 0]);
      seg(lid, [0, 0.07, 0.1], [0, slope[1] + 0.07, slope[2] + 0.1], cw * 1.08, 0.12, plate());
      const glass = new THREE.MeshStandardMaterial({ color: a.state === 'undeployed' ? '#3d7fd0' : '#2f4a55', roughness: 0.15, metalness: 0.6, emissive: a.powered ? eyeColour : '#000000', emissiveIntensity: 0.15 });
      seg(lid, [0, slope[1] * 0.18 + 0.13, slope[2] * 0.18 + 0.16], [0, slope[1] * 0.8 + 0.13, slope[2] * 0.8 + 0.16], cw * 0.8, 0.05, glass);
      for (const sx of [-1, 1]) rod(R, [sx * cw * 0.5, hingeAt[1] + slope[1] * 0.5, hingeAt[2] + slope[2] * 0.5], [sx * cw * 0.5, hingeAt[1] + slope[1] * 0.5 + Math.sin(open * 1.75) * 0.9 * open + 0.02, hingeAt[2] + slope[2] * 0.5 + 0.25 * open], 0.035, chrome);
    }
    cyl(R, 0.07, 0.07, cw * 1.15, hingeAt, steel, [0, 0, Math.PI / 2], 8);

    // Head or sensor.
    const head = group(R, [0, ty + H / 2, tz - D * 0.12]);
    if (a.state === 'stripped' && random() < 0.5) {
      cyl(head, 0.22, 0.26, 0.15, [0, 0.07, 0], steel);
      for (let i = 0; i < 4; i++) tube(head, [[0, 0.1, 0], [(random() - 0.5) * 0.4, 0.45, (random() - 0.5) * 0.4], [(random() - 0.5) * 0.8, 0.2 + random() * 0.2, (random() - 0.5) * 0.8]], 0.025, i % 2 ? red : frame);
    } else if (c.digit) {
      cyl(head, 0.2, 0.2, 0.3, [0, 0.15, 0], steel);
      box(head, [0.9, 0.22, 0.35], [0, 0.4, 0], armour);
      for (const sx of [-1, 1]) cyl(head, 0.11, 0.11, 0.1, [sx * 0.28, 0.4, 0.2], glow, [Math.PI / 2, 0, 0]);
    } else {
      const hs = a.chassis === 'heavy' ? 1.25 : 1;
      cyl(head, 0.2 * hs, 0.26 * hs, 0.2, [0, 0.1, 0], steel);
      box(head, [0.62 * hs, 0.46 * hs, 0.72 * hs], [0, 0.2 + 0.23 * hs, 0.02], plate());
      box(head, [0.5 * hs, 0.1 * hs, 0.06], [0, 0.2 + 0.26 * hs, 0.38 * hs], glow);
      box(head, [0.66 * hs, 0.12 * hs, 0.5 * hs], [0, 0.2 + 0.47 * hs, 0.14 * hs], trim, [0.12, 0, 0]);
      if (a.chassis === 'ceremonial') {
        const fin = new THREE.Shape([new THREE.Vector2(-0.45, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0.15, 0.55), new THREE.Vector2(-0.7, 1.0)]);
        const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.06, bevelEnabled: false });
        fg.translate(0, 0, -0.03);
        add(head, fg, trim, [0, 0.66, 0], [0, -Math.PI / 2, 0]);
      }
    }
    const headTurns = head;

    // Markings painted on a canvas: number, chevrons, roundel or band.
    const pale = a.livery === 'arctic' ? '#22262a' : '#f1efe6';
    const digits = `${Math.floor(random() * 9)}${1 + Math.floor(random() * 9)}`;
    const mark = a.marking === 'none' || a.state === 'undeployed' ? null : paint(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ctx.strokeStyle = pale;
      if (a.marking === 'numeral') stencil(ctx, digits, w / 2, h / 2 + 8, 200, pale);
      else if (a.marking === 'chevrons') {
        ctx.lineWidth = 26;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(40, 60 + i * 62); ctx.lineTo(w / 2, 110 + i * 62); ctx.lineTo(w - 40, 60 + i * 62); ctx.stroke(); }
      } else if (a.marking === 'roundel') {
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 110, 0, 7); ctx.fill();
        ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 76, 0, 7); ctx.fill();
        ctx.fillStyle = pale; ctx.beginPath(); ctx.arc(w / 2, h / 2, 34, 0, 7); ctx.fill();
      } else ctx.fillRect(0, 70, w, 116);
    });

    // Shoulders and arms.
    const shoulderY = ty + H * 0.22;
    const gone = a.state === 'stripped' ? (random() < 0.5 ? -1 : 1) : 0;
    const torn = a.state === 'scarred' ? (random() < 0.5 ? -1 : 1) : 0;
    const muzzles: V[] = [];
    if (c.arms) for (const sx of [-1, 1]) {
      const x = sx * (W / 2 + L * 0.75);
      cyl(R, L * 0.62, L * 0.62, L * 1.3, [x - sx * L * 0.2, shoulderY, 0], steel, [0, 0, Math.PI / 2], 16);
      if (sx !== torn && !(sx === gone)) {
        const ps = a.chassis === 'heavy' ? 1.25 : 1;
        const pad = group(R, [x + sx * L * 0.15, shoulderY + L * 0.55, 0], [0, 0, -sx * 0.22]);
        box(pad, [L * 1.55 * ps, L * 0.5, L * 2.1 * ps], [0, 0.1, 0], plate());
        box(pad, [0.12, L * 1.5 * ps, L * 2.0 * ps], [sx * L * 0.78 * ps, -L * 0.55, 0], plate());
        box(pad, [L * 1.6 * ps, 0.08, L * 2.16 * ps], [0, L * 0.38, 0], trim);
        if (mark) decal(pad, mark, L * 1.25 * ps, L * 1.25 * ps, [sx * (L * 0.78 * ps + 0.07), -L * 0.55, 0], [0, sx * Math.PI / 2, 0]);
        if (a.chassis === 'ceremonial') {
          const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.62, 0.0, mood.cheer), 0.6, 0.38), roughness: 0.95, side: THREE.DoubleSide });
          const bg = new THREE.PlaneGeometry(L * 1.7, 2.3, 4, 8);
          const pos = bg.attributes.position;
          for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 5 + pos.getY(i) * 2.5) * 0.07);
          bg.computeVertexNormals();
          add(pad, bg, cloth, [sx * (L * 0.78 + 0.16), -L * 1.2 - 1.0, 0], [0, sx * Math.PI / 2, 0]);
          box(pad, [0.05, 0.06, L * 1.9], [sx * (L * 0.78 + 0.16), -L * 1.25 + 0.15, 0], trim);
        }
      } else if (sx === torn) box(R, [L * 0.9, 0.1, L * 1.2], [x, shoulderY + L * 0.66, 0], primer, [0.1, 0, -sx * 0.5]);
      const elbow: V = [x, shoulderY - H * 0.62, 0.05];
      const wrist: V = [x, c.hipY - 0.35, 0.55];
      if (sx === gone) {
        for (let i = 0; i < 5; i++) tube(R, [[x, shoulderY - L * 0.3, (i - 2) * 0.08], [x + sx * 0.1, shoulderY - 0.8 - random() * 0.5, (i - 2) * 0.12 + (random() - 0.5) * 0.2], [x + sx * (random() - 0.3) * 0.3, shoulderY - 1.3 - random() * 0.7, (random() - 0.5) * 0.4]], 0.03, i % 2 ? red : frame);
        continue;
      }
      seg(R, [x, shoulderY, 0], elbow, L * 0.45, L * 0.5, frame);
      if (!missing(0.4)) seg(R, [x, shoulderY - L * 0.7, 0], [x, elbow[1] + L * 0.3, 0.04], L * 0.9, L * 1.0, plate());
      cyl(R, L * 0.4, L * 0.4, L * 1.05, elbow, steel, [0, 0, Math.PI / 2], 12);
      const right = sx === 1;
      const kit = right ? a.armament : a.armament === 'shield' ? 'shield-arm' : 'hands';
      if (kit === 'autocannon') {
        const gz = elbow[2] + 0.4, gy = elbow[1] - L * 0.5;
        box(R, [L * 0.8, L * 0.9, 1.5], [x, gy, gz + 0.2], frame);
        cyl(R, L * 0.5, L * 0.5, L * 0.6, [x + sx * L * 0.3, gy - L * 0.2, gz], steel, [0, 0, Math.PI / 2]);
        cyl(R, 0.09, 0.09, 2.0, [x, gy, gz + 1.9], steel, [Math.PI / 2, 0, 0], 10);
        cyl(R, 0.15, 0.15, 0.4, [x, gy, gz + 2.8], frame, [Math.PI / 2, 0, 0], 10);
        box(R, [L * 0.95, L * 0.5, 0.9], [x, gy + L * 0.5, gz + 0.15], plate());
        muzzles.push([x, gy, gz + 3.02]);
      } else if (kit === 'cutter') {
        seg(R, elbow, [x, wrist[1] + 0.2, wrist[2] + 0.3], L * 0.6, L * 0.6, s.material('#d8a21c'));
        for (const t of [-1, 1]) {
          seg(R, [x + t * 0.1, wrist[1] + 0.25, wrist[2] + 0.3], [x + t * 0.38, wrist[1] - 0.25, wrist[2] + 0.75], 0.12, 0.2, steel);
          seg(R, [x + t * 0.38, wrist[1] - 0.25, wrist[2] + 0.75], [x + t * 0.06, wrist[1] - 0.75, wrist[2] + 0.95], 0.1, 0.16, steel);
        }
        cyl(R, 0.2, 0.2, 0.5, [x, wrist[1] + 0.2, wrist[2] + 0.3], frame, [0, 0, Math.PI / 2]);
      } else {
        seg(R, elbow, wrist, L * 0.4, L * 0.45, frame);
        if (!missing(0.4)) seg(R, [x, mix(elbow[1], wrist[1], 0.15), mix(elbow[2], wrist[2], 0.15)], [x, mix(elbow[1], wrist[1], 0.9), mix(elbow[2], wrist[2], 0.9)], L * 0.85, L * 0.95, plate());
        // A fist: palm block and three knuckled fingers.
        box(R, [L * 0.75, L * 0.6, L * 0.75], [x, wrist[1] - L * 0.3, wrist[2] + 0.1], steel);
        for (let f = 0; f < 3; f++) box(R, [L * 0.2, L * 0.6, L * 0.24], [x + (f - 1) * L * 0.26, wrist[1] - L * 0.85, wrist[2] + 0.22], frame, [-0.35, 0, 0]);
        if (a.state === 'undeployed') ball(R, [L * 0.62, L * 0.8, L * 0.62], [x, wrist[1] - L * 0.6, wrist[2] + 0.15], new THREE.MeshStandardMaterial({ color: '#e9ecec', roughness: 0.35 }), 10);
        if (kit === 'shield-arm') {
          const sh = group(R, [x + sx * L * 0.75, mix(elbow[1], wrist[1], 0.5) - 0.2, 0.35], [0, sx * 0.25, 0]);
          box(sh, [0.14, 3.2, 1.7], [0, 0, 0], plate());
          box(sh, [0.16, 3.2, 0.14], [0, 0, 0.78], trim);
          box(sh, [0.16, 0.16, 1.7], [0, 1.52, 0], trim);
          if (mark) decal(sh, mark, 1.1, 1.1, [sx * 0.085, 0.5, 0], [0, sx * Math.PI / 2, 0]);
        }
      }
      if (right && a.armament === 'missiles') {
        const rack = group(R, [x - sx * 0.1, shoulderY + L * 1.4 + 0.3, -0.15], [-0.18, 0, 0]);
        box(rack, [1.0, 0.75, 1.4], [0, 0, 0], frame);
        for (let i = 0; i < 6; i++) cyl(rack, 0.12, 0.12, 0.05, [(i % 3 - 1) * 0.3, (i < 3 ? 0.17 : -0.17), 0.71], i === 4 && a.state !== 'pristine' ? scorch : red, [Math.PI / 2, 0, 0], 10);
      }
    }
    if (!c.arms) {
      // Scouts carry their kit on the cheeks of the pod.
      for (const sx of [-1, 1]) {
        const x = sx * (W / 2 + 0.3), y = ty - H * 0.25, z = tz + D * 0.05;
        if (sx === gone) { cyl(R, 0.18, 0.18, 0.2, [x - sx * 0.1, y, z], steel, [0, 0, Math.PI / 2]); continue; }
        if (a.armament === 'autocannon') { box(R, [0.4, 0.45, 1.3], [x, y, z], frame); cyl(R, 0.07, 0.07, 1.7, [x, y, z + 1.4], steel, [Math.PI / 2, 0, 0], 10); cyl(R, 0.12, 0.12, 0.3, [x, y, z + 2.2], frame, [Math.PI / 2, 0, 0], 10); muzzles.push([x, y, z + 2.36]); }
        else if (a.armament === 'missiles') { box(R, [0.5, 0.7, 1.2], [x, y, z], frame); for (let i = 0; i < 4; i++) cyl(R, 0.1, 0.1, 0.05, [x + (i % 2 - 0.5) * 0.22, y + (i < 2 ? 0.16 : -0.16), z + 0.61], red, [Math.PI / 2, 0, 0], 10); }
        else if (a.armament === 'shield') box(R, [0.12, 1.6, 2.2], [x + sx * 0.1, y, z], plate());
        else if (a.armament === 'cutter') { box(R, [0.3, 0.3, 0.8], [x, y, z + 0.3], s.material('#d8a21c')); seg(R, [x, y, z + 0.7], [x - sx * 0.25, y - 0.5, z + 1.6], 0.1, 0.16, steel); seg(R, [x, y, z + 0.7], [x + sx * 0.2, y - 0.2, z + 1.7], 0.1, 0.16, steel); }
        else { cyl(R, 0.16, 0.16, 0.25, [x - sx * 0.12, y, z + 0.4], glow, [0, 0, Math.PI / 2]); box(R, [0.2, 0.5, 0.9], [x - sx * 0.1, y, z - 0.3], plate()); }
        if (mark && sx === -1) decal(R, mark, 0.75, 0.75, [-(W / 2 + 0.13), ty + H * 0.02, tz - D * 0.3], [0, -Math.PI / 2, 0]);
      }
    }
    if (mark) decal(R, mark, 0.52, 0.52, crotch, [-0.2, 0, 0]);
    if (mark && !c.digit) decal(R, mark, 0.5, 0.5, [c.hipX, c.hipY * 0.3, 0.05 + L * 0.57], [0.02, 0, 0]);

    // Backpack: reactor box, exhaust stacks, whip antenna.
    const bz = tz - D / 2 - 0.35;
    box(R, [W * 0.7, H * 0.75, 0.7], [0, ty + H * 0.05, bz], frame);
    for (let i = 0; i < 5; i++) box(R, [W * 0.6, 0.05, 0.06], [0, ty - H * 0.2 + i * 0.13, bz - 0.36], steel);
    for (const sx of [-1, 1]) {
      cyl(R, 0.13, 0.16, 0.9, [sx * W * 0.25, ty + H * 0.55, bz], steel, [-0.2, 0, 0], 12);
      cyl(R, 0.1, 0.1, 0.03, [sx * W * 0.25, ty + H * 0.55 + 0.45, bz - 0.09], scorch, [-0.2, 0, 0], 12);
    }
    const bend = a.state === 'scarred' ? 0.9 : 0.08;
    tube(R, [[W * 0.33, ty + H * 0.4, bz], [W * 0.33, ty + H * 0.4 + 1.0, bz], [W * 0.33 + bend * 0.5, ty + H * 0.4 + 1.9 - bend * 0.5, bz - bend * 0.7]], 0.02, frame);

    // What happened to it.
    if (a.state === 'scarred' || mood.wear > 0.75) {
      for (const p of scorchSpots) if (random() < 0.85) ball(R, [0.14 + random() * 0.14, 0.18 + random() * 0.2, 0.03], p, scorch, 10).rotation.z = random() * 3;
      for (let i = 0; i < 7; i++) ball(R, [0.06, 0.06, 0.04], [(random() - 0.5) * W * 0.8, ty + (random() - 0.6) * H * 0.6, tz + D * 0.43], scorch, 6);
    }
    if (a.state === 'stripped') {
      const stand = s.material('#d8a21c');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(R, [sx * c.hipX * 0.35, c.hipY - 0.2, sz * 0.2], [sx * (c.hipX * 0.35 + 0.25), 0, sz * 1.5], 0.07, stand);
      box(R, [c.hipX * 1.3, 0.12, 0.7], [0, c.hipY - 0.3, 0], stand);
      for (let i = 0; i < 3; i++) box(R, [L * 0.9, 0.1, L * 1.6], [(random() - 0.5) * 1.2, 0.06 + i * 0.11, 1.9 + (random() - 0.5) * 0.3], i === 1 ? primer : armour, [0, random() * 0.6, 0]);
    }
    if (a.state === 'undeployed') {
      const wood = s.material('#b08a55', { roughness: 0.95 });
      for (const z of [-1.1, 0.2, 1.5]) box(R, [c.hipX * 2 + 2.0, 0.12, 0.3], [0, -0.06, z + (c.digit ? 0.3 : 0)], wood);
      for (const sx of [-1, 1]) box(R, [0.3, 0.14, 3.4], [sx * (c.hipX + 0.75), -0.19, 0.2 + (c.digit ? 0.3 : 0)], wood);
      for (const m of muzzles) cyl(R, 0.19, 0.19, 0.2, [m[0], m[1], m[2] - 0.05], red, [Math.PI / 2, 0, 0], 10);
      box(R, [0.14, 0.9, 0.01], [W * 0.2, ty + H * 0.1, tz + D / 2 + 0.06], red, [0.3, 0, 0.1]);
    }
    if (a.ladder) {
      const lz = hingeAt[2] + slope[2] + 0.35, top = hingeAt[1] + slope[1] + 0.25;
      const lx = W * 0.14;
      for (const sx of [-1, 1]) rod(R, [lx + sx * 0.22, 0, lz + 0.9], [lx + sx * 0.22, top, lz], 0.03, s.material('#d8a21c'));
      for (let y = 0.35; y < top; y += 0.38) rod(R, [lx - 0.22, y, lz + 0.9 * (1 - y / top)], [lx + 0.22, y, lz + 0.9 * (1 - y / top)], 0.022, steel, 6);
    }
    if (a.umbilical) {
      const ux = -W * 0.2;
      tube(R, [[ux, ty - H * 0.2, bz - 0.35], [ux - 0.1, ty - H * 0.5, bz - 0.9], [ux - 0.2, 0.6, bz - 1.0], [ux - 0.3, 0.09, bz - 0.5], [ux + 0.4, 0.09, bz - 0.2], [ux + 0.9, 0.09, bz - 0.8]], 0.09, s.material('#1f2022', { roughness: 0.8 }));
      cyl(R, 0.16, 0.16, 0.25, [ux, ty - H * 0.2, bz - 0.38], s.material('#d8a21c'), [Math.PI / 2, 0, 0], 10);
    }

    const sway = mix(0, 0.5, mood.energy) * (a.powered ? 1 : 0);
    return s.finish({
      footprint: Math.max(c.hipX + L * 1.2, 1.4),
      update: (_dt, time) => {
        headTurns.rotation.y = Math.sin(time * 0.7) * sway;
        glow.emissiveIntensity = a.powered ? 1.3 + Math.sin(time * 3) * 0.5 * mood.energy : 0;
      },
    });
  },
});

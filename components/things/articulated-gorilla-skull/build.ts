import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type P3, type Section, canvasTexture, card, loft, taper } from './lib';

type Kind = 'gorilla' | 'chimp' | 'baboon' | 'human';
interface Form {
  size: number; cranium: P3; craniumAt: P3; crest: number; brow: number;
  muzzle: Section[]; tooth: number; arcW: number; arcD: number; canine: number; nasal: P3; chin: number; latin: string;
}
const S = (z: number, y: number, w: number, h: number): Section => ({ z, y, w, h });
const FORMS: Record<Kind, Form> = {
  gorilla: { size: 1, cranium: [0.066, 0.06, 0.088], craniumAt: [0, 0.012, -0.07], crest: 0.045, brow: 0.014,
    muzzle: [S(0.0, -0.045, 0.062, 0.046), S(0.05, -0.058, 0.054, 0.044), S(0.1, -0.068, 0.046, 0.038), S(0.128, -0.074, 0.032, 0.026)], tooth: -0.108, arcW: 0.04, arcD: 0.085, canine: 0.034, nasal: [0, -0.04, 0.088], chin: 0, latin: 'Gorilla gorilla' },
  chimp: { size: 0.74, cranium: [0.07, 0.064, 0.086], craniumAt: [0, 0.018, -0.068], crest: 0, brow: 0.011,
    muzzle: [S(0.0, -0.042, 0.06, 0.044), S(0.05, -0.054, 0.052, 0.04), S(0.095, -0.064, 0.044, 0.034), S(0.118, -0.07, 0.03, 0.024)], tooth: -0.1, arcW: 0.038, arcD: 0.075, canine: 0.022, nasal: [0, -0.038, 0.08], chin: 0, latin: 'Pan troglodytes' },
  baboon: { size: 0.7, cranium: [0.058, 0.05, 0.075], craniumAt: [0, 0.012, -0.068], crest: 0.012, brow: 0.012,
    muzzle: [S(0.0, -0.04, 0.05, 0.04), S(0.07, -0.05, 0.04, 0.036), S(0.15, -0.06, 0.036, 0.03), S(0.2, -0.066, 0.033, 0.027), S(0.222, -0.07, 0.024, 0.02)], tooth: -0.094, arcW: 0.03, arcD: 0.15, canine: 0.05, nasal: [0, -0.036, 0.19], chin: 0, latin: 'Papio anubis' },
  human: { size: 0.86, cranium: [0.082, 0.086, 0.104], craniumAt: [0, 0.05, -0.062], crest: 0, brow: 0.004,
    muzzle: [S(0.0, -0.05, 0.058, 0.05), S(0.035, -0.058, 0.046, 0.044), S(0.058, -0.064, 0.036, 0.036)], tooth: -0.104, arcW: 0.03, arcD: 0.046, canine: 0.011, nasal: [0, -0.05, 0.05], chin: 1, latin: 'Homo sapiens' },
};

export default defineThing({
  questions: {
    which: choice('Whose skull is it?', {
      gorilla: 'A male gorilla: a blade of bone standing up along the crown, a heavy brow bar, a long jaw and canines like thumbs.',
      chimp: 'A chimpanzee: smaller and rounder, no crest, a jutting muzzle and modest fangs.',
      baboon: 'A baboon: a long dog-like snout and enormous dagger canines on a small braincase.',
      human: 'A human: a tall smooth globe of braincase, flat face, small even teeth and a chin.',
      row: 'Three in a row on one stand, baboon, gorilla and human, set up for comparison.',
    }),
    jaw: choice('How is the lower jaw set?', {
      shut: 'Wired shut, teeth meeting.',
      open: 'Held open on a little brass spring, mid roar or mid word.',
      detached: 'Unhooked and lying on the base beside the stand.',
      missing: 'Missing altogether; only the upper skull is here.',
    }),
    condition: choice('What has happened to the bone?', {
      clean: 'Clean, white, professionally prepared.',
      inked: 'A catalogue number and a place name hand-inked across the forehead.',
      bullet: 'A round bullet hole in the forehead with cracks running from it.',
      glued: 'Broken once and glued: dark zigzag joins and yellowed glue runs.',
      earth: 'Brown and stained from the ground, with dirt still in the hollows.',
    }),
    label: choice('How is it labelled?', {
      brass: 'An engraved brass plate screwed to the base.',
      tag: 'A handwritten card tied on with string.',
      typed: 'A typed card standing in a little holder.',
      tape: 'A strip of red embossed label tape stuck on crooked.',
      evidence: 'A yellow evidence tag: seized, not collected.',
      none: 'No label.',
    }),
    facing: choice('Which way is it turned?', {
      front: 'Square on, staring straight out of the sockets.',
      quarter: 'Three-quarter view.',
      profile: 'In profile, showing the line of jaw and crown.',
    }),
    hand: noul('Is a small skeleton hand mounted beside it?'),
    extra: choice('What else is on the stand?', {
      nothing: 'Nothing else.',
      calipers: 'A pair of brass measuring calipers left lying open.',
      candle: 'A burnt-down candle stub, a vanitas still life.',
      banana: 'A single banana, somebody’s joke.',
      loose: 'A few teeth that have dropped out, in a row.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const earth = a.condition === 'earth';
    const boneColour = new THREE.Color(earth ? '#a88962' : '#efe8d6').lerp(new THREE.Color('#b59c72'), mood.wear * (earth ? 0.2 : 0.45));
    const hollow = new THREE.MeshStandardMaterial({ color: earth ? '#3a2a1c' : '#1d1815', roughness: 1 });
    const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbf7ea').lerp(new THREE.Color('#c7a769'), mood.wear * 0.5 + (earth ? 0.3 : 0)), roughness: 0.3 });
    const bone = new THREE.MeshStandardMaterial({ color: boneColour, roughness: 0.75 });
    const brass = s.material('#b9944a', { metalness: 0.8, roughness: 0.3 });
    const wood = s.material('#3f2718', { roughness: 0.45 });

    const craniumPaint = (kind: Kind, marked: boolean) => new THREE.MeshStandardMaterial({
      roughness: 0.72,
      map: canvasTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = `#${boneColour.getHexString()}`; ctx.fillRect(0, 0, w, h);
        const fx = w * 0.25; // the forehead faces +z at u = 0.25
        // Sutures.
        ctx.strokeStyle = 'rgba(90,70,45,0.55)'; ctx.lineWidth = 1.5;
        const wiggle = (x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 1; i <= 30; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / 30 + (random() - 0.5) * 5, y0 + ((y1 - y0) * i) / 30 + (random() - 0.5) * 5); ctx.stroke(); };
        wiggle(0, h * 0.22, w, h * 0.22); wiggle(fx + w * 0.5, 0, fx + w * 0.5, h * 0.6);
        for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(${earth ? '70,45,20' : '120,95,60'},${0.04 + random() * (earth ? 0.25 : 0.1)})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 5 + random() * 30, 4 + random() * 16, random() * 3, 0, 7); ctx.fill(); }
        if (!marked) return;
        if (a.condition === 'inked') {
          ctx.fillStyle = '#231d18'; ctx.textAlign = 'center';
          ctx.font = 'bold 22px monospace'; ctx.fillText(`${kind === 'human' ? 'H' : 'P'}.${100 + Math.floor(random() * 899)}`, fx, h * 0.36);
          ctx.font = 'italic 15px serif'; ctx.fillText(['Gaboon 1897', 'Congo 1903', 'ex coll. R.', 'Kivu 1921'][Math.floor(random() * 4)], fx, h * 0.44);
        } else if (a.condition === 'bullet') {
          const bx = fx + (random() - 0.5) * 30, by = h * 0.36;
          ctx.strokeStyle = '#2a211b'; ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) { let x = bx, y = by; const angle = i * 0.9 + random() * 0.5; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.cos(angle + (random() - 0.5)) * 9; y += Math.sin(angle + (random() - 0.5)) * 7; ctx.lineTo(x, y); } ctx.stroke(); }
          ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill();
        } else if (a.condition === 'glued') {
          for (let line = 0; line < 3; line++) {
            let x = fx - 70 + line * 60 + random() * 20, y = h * 0.12;
            ctx.strokeStyle = '#3b2b1c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y);
            for (let k = 0; k < 9; k++) { x += (random() - 0.5) * 26; y += 10 + random() * 8; ctx.lineTo(x, y); if (random() > 0.6) { ctx.fillStyle = 'rgba(196,150,50,0.6)'; ctx.fillRect(x - 3, y, 5, 12 + random() * 14); } }
            ctx.stroke();
          }
        }
      }),
    });

    // One skull, built around the point between the orbits. Returns its group and how far down it reaches.
    const skull = (kind: Kind, marked: boolean) => {
      const f = FORMS[kind];
      const group = new THREE.Group();
      const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = group) => { parent.add(node); return node; };
      const cranium = put(s.ball(f.cranium, f.craniumAt, craniumPaint(kind, marked), 24));
      cranium.rotation.x = kind === 'human' ? 0 : -0.12;
      // Orbit bar, sockets and brow ridge.
      put(s.ball([0.07, 0.036, 0.04], [0, -0.006, 0.012], bone, 14));
      for (const side of [-1, 1]) {
        put(s.ball([0.021, 0.022, 0.014], [side * 0.033, -0.004, 0.044], hollow, 12));
        put(s.ring(0.0235, 0.0055, [side * 0.033, -0.004, 0.047], bone));
        put(s.tube([[side * 0.064, -0.02, 0.03], [side * 0.082, -0.03, -0.005], [side * 0.076, -0.028, -0.05], [side * 0.06, -0.02, -0.075]], 0.0065, bone));
        if (earth) put(s.ball([0.014, 0.008, 0.008], [side * 0.033, -0.018, 0.046], s.material('#5a3f26', { roughness: 1 }), 6));
      }
      put(s.tube([[-0.072, 0.012, 0.022], [-0.034, 0.027, 0.05], [0, 0.021, 0.052], [0.034, 0.027, 0.05], [0.072, 0.012, 0.022]], f.brow, bone));
      // Muzzle with the nasal opening.
      put(s.mesh(loft(f.muzzle, { sides: 16 }), bone));
      const nose = put(s.ball([0.014, 0.019, 0.014], f.nasal, hollow, 10));
      nose.rotation.x = kind === 'human' ? 0.2 : -0.6;
      // Crest: a fin of bone along the crown, and the shelf at the back.
      if (f.crest > 0) {
        const fin = new THREE.Shape();
        const top = f.craniumAt[1] + f.cranium[1];
        fin.moveTo(0.0, top - 0.02); fin.quadraticCurveTo(-0.06, top + f.crest * 0.8, -0.11, top + f.crest); fin.quadraticCurveTo(-0.15, top + f.crest * 0.6, -0.165, top - 0.05); fin.lineTo(-0.1, top - 0.03); fin.closePath();
        const crest = put(s.mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.007, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }), bone, [0.0035, 0, 0]));
        crest.rotation.y = -Math.PI / 2;
        put(s.tube([[-0.055, 0.0, -0.13], [-0.03, 0.035, -0.155], [0, 0.05, -0.162], [0.03, 0.035, -0.155], [0.055, 0.0, -0.13]], 0.006, bone));
      }
      // Teeth along a U-shaped arcade.
      const tip = f.muzzle[f.muzzle.length - 1].z - 0.006;
      const arcade = (parent: THREE.Object3D, y: number, up: boolean, shift: P3 = [0, 0, 0], shrink = 1) => {
        const lost = a.extra === 'loose' ? Math.floor(random() * 4) + 5 : -1;
        for (let i = 0; i < 16; i++) {
          if (i === lost || (mood.wear > 0.7 && random() > 0.8)) continue;
          const t = (i + 0.5) / 16, angle = (t - 0.5) * Math.PI * 1.12;
          const flat = Math.abs(t - 0.5) > 0.2;
          const x = Math.sin(angle) * f.arcW * shrink * (flat ? 1 : 1), z = tip - f.arcD * (1 - Math.cos(angle)) * (flat ? 1.0 : 1);
          const canine = i === 5 || i === 10;
          const height = canine ? f.canine * (up ? 0.8 : 1) : flat ? 0.008 : 0.01;
          const tooth = new THREE.Mesh(canine ? new THREE.ConeGeometry(0.0062, height, 8) : new THREE.BoxGeometry(flat ? 0.0085 : 0.0062, height, flat ? 0.0095 : 0.005), enamel);
          tooth.position.set(x - shift[0], y + (up ? 1 : -1) * height / 2 - shift[1], z - shift[2] + (canine && up ? -0.006 : 0));
          if (!up && canine) tooth.rotation.x = Math.PI;
          if (!canine) tooth.rotation.y = angle;
          tooth.castShadow = true;
          parent.add(tooth);
        }
      };
      arcade(group, f.tooth, false);
      // Lower jaw: body, rami and its own teeth, hinged just under the cheekbones.
      const hinge: P3 = [0, -0.035, -0.045];
      const jaw = new THREE.Group();
      jaw.position.set(...hinge);
      const rel = (p: P3): P3 => [p[0] - hinge[0], p[1] - hinge[1], p[2] - hinge[2]];
      const gap = 0.012, bodyY = f.tooth - gap - 0.012;
      for (const side of [-1, 1]) {
        put(s.mesh(taper([rel([side * 0.066, -0.03, -0.045]), rel([side * 0.064, bodyY + 0.02, -0.04]), rel([side * 0.058, bodyY - 0.008, -0.02]), rel([side * f.arcW * 1.05, bodyY, tip - f.arcD * 0.75]), rel([side * f.arcW * 0.8, bodyY - 0.002, tip - f.arcD * 0.25]), rel([0, bodyY - 0.004 - f.chin * 0.004, tip - 0.004 + f.chin * 0.004])], (t) => 0.0125 - t * 0.002, { segments: 26, sides: 8 }), bone), jaw);
        put(s.ball([0.006, Math.abs(bodyY + 0.03) * 0.62, 0.022], rel([side * 0.066, (bodyY - 0.03) / 2, -0.036]), bone, 10), jaw);
      }
      if (f.chin) put(s.ball([0.016, 0.012, 0.01], rel([0, bodyY - 0.012, tip]), bone, 8), jaw);
      arcade(jaw, f.tooth - gap, true, hinge, 0.96);
      group.scale.setScalar(f.size);
      return { group, jaw, depth: (Math.abs(bodyY) + 0.02) * f.size, upperDepth: Math.abs(f.tooth - 0.012) * f.size, length: (tip + 0.17) * f.size, form: f };
    };

    // ---- Stand -----------------------------------------------------------------------------
    const kinds: Kind[] = a.which === 'row' ? ['baboon', 'gorilla', 'human'] : [a.which];
    const pitch = 0.3;
    const baseW = kinds.length > 1 ? pitch * 2 + 0.3 : 0.3, baseD = a.jaw === 'detached' ? 0.36 : 0.27, baseH = 0.032;
    s.box([baseW, baseH, baseD], [0, baseH / 2, 0], wood);
    s.box([baseW - 0.025, 0.008, baseD - 0.025], [0, baseH + 0.004, 0], wood);
    const top = baseH + 0.008;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.ball([0.014, 0.008, 0.014], [x * (baseW / 2 - 0.025), 0.004, z * (baseD / 2 - 0.025)], brass, 8);
    const turn = { front: 0, quarter: 0.6, profile: 1.25 }[a.facing] * (random() > 0.5 ? 1 : -1);
    const jaws: THREE.Group[] = [];
    kinds.forEach((kind, index) => {
      const x = (index - (kinds.length - 1) / 2) * pitch;
      const built = skull(kind, kinds.length === 1 || kind === 'gorilla');
      const lift = top + 0.11 + built.depth + (a.jaw === 'open' ? 0.05 * built.form.size : 0);
      built.group.position.set(x, lift, a.jaw === 'detached' ? -0.07 : -0.02);
      built.group.rotation.y = turn + (random() - 0.5) * 0.12;
      built.group.rotation.x = -0.06;
      s.root.add(built.group);
      // Rod and a little cradle under the braincase.
      const rz = a.jaw === 'detached' ? -0.11 : -0.06;
      s.rod([x, top, rz], [x, lift - 0.045 * built.form.size, rz], 0.0045, brass);
      s.cylinder(0.014, 0.018, 0.012, [x, top + 0.006, rz], brass, 14);
      s.ball([0.012, 0.006, 0.012], [x, lift - 0.045 * built.form.size, rz], brass, 8);
      if (a.jaw === 'missing') { /* nothing */ }
      else if (a.jaw === 'detached') {
        const loose = new THREE.Group();
        loose.add(built.jaw);
        built.jaw.position.set(0, 0, 0);
        loose.scale.setScalar(built.form.size);
        loose.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
        loose.position.set(x - (built.length - 0.12 * built.form.size) / 2, top + Math.abs(built.form.tooth) * built.form.size, 0.095);
        s.root.add(loose);
      } else {
        built.group.add(built.jaw);
        built.jaw.rotation.x = a.jaw === 'open' ? 0.42 + random() * 0.14 : 0.02;
        if (a.jaw === 'open') {
          jaws.push(built.jaw);
          // The spring: a small coil at each hinge.
          for (const side of [-1, 1]) {
            const coil: P3[] = [];
            for (let i = 0; i <= 28; i++) coil.push([side * 0.07 + Math.cos(i * 0.9) * 0.004, -0.035 - i * 0.0011, -0.05 + Math.sin(i * 0.9) * 0.004]);
            built.group.add(s.tube(coil, 0.0009, brass));
          }
        }
      }
      if (kinds.length > 1) {
        const tag = card([built.form.latin], 0.2, 0.035, '#231d18', '#efe6cc');
        tag.position.set(x, baseH * 0.5, baseD / 2 + 0.002);
        s.root.add(tag);
      }
    });

    // ---- Label -----------------------------------------------------------------------------
    const latin = a.which === 'row' ? 'Comparative series' : FORMS[a.which].latin;
    const number = `No. ${100 + Math.floor(random() * 8999)}`;
    const lx = kinds.length > 1 ? baseW / 2 - 0.12 : 0.04;
    if (a.label === 'brass' && kinds.length === 1) {
      const plate = card([latin, number], 0.19, 0.026, '#3a2a10', '#c9a54f');
      (plate.material as THREE.MeshStandardMaterial).metalness = 0.5;
      plate.position.set(0, baseH * 0.5, baseD / 2 + 0.002);
      s.root.add(plate);
    } else if (a.label === 'tag' || a.label === 'evidence') {
      const evidence = a.label === 'evidence';
      const tag = card(evidence ? ['EVIDENCE', number] : [latin, 'adult, old collection'], 0.1, 0.05, '#231d18', evidence ? '#f2c230' : '#eadfc2', evidence ? 'monospace' : 'serif');
      tag.position.set(lx + 0.06, top + 0.004, 0.09);
      tag.rotation.set(-Math.PI / 2 + 0.05, 0, 0.3 + random() * 0.4);
      s.root.add(tag);
      s.tube([[lx + 0.02, top + 0.004, 0.08], [lx - 0.02, top + 0.03, 0.04], [lx - 0.045, top + 0.08, -0.03], [lx - 0.04, top + 0.1, -0.055]], 0.0012, s.material('#8a7a5c'));
    } else if (a.label === 'typed') {
      const tag = card([latin, number], 0.12, 0.05, '#1e1b16', '#f4f1e6', 'monospace');
      tag.position.set(lx + 0.04, top + 0.03, 0.105);
      tag.rotation.x = -0.35;
      s.root.add(tag);
      s.box([0.06, 0.008, 0.02], [lx + 0.04, top + 0.004, 0.11], brass);
    } else if (a.label === 'tape') {
      const tag = card([latin.toUpperCase()], 0.16, 0.016, '#f5efe6', '#b3202a', 'monospace');
      tag.position.set(0.01, baseH * 0.55, baseD / 2 + 0.002);
      tag.rotation.z = -0.07;
      s.root.add(tag);
    }

    // ---- Companions ------------------------------------------------------------------------
    const leftX = -(baseW / 2) + 0.05;
    if (a.hand) {
      // A hand skeleton upright on its own pin, fingers slightly curled.
      const hx = kinds.length > 1 ? leftX + 0.02 : -0.1, hz = 0.06, wrist = top + 0.05;
      s.rod([hx, top, hz], [hx, wrist, hz], 0.003, brass);
      for (let i = 0; i < 6; i++) s.ball([0.007, 0.006, 0.006], [hx + ((i % 3) - 1) * 0.011, wrist + Math.floor(i / 3) * 0.011, hz], bone, 6);
      for (let finger = 0; finger < 5; finger++) {
        const thumb = finger === 0;
        let p = new THREE.Vector3(hx + (finger - 2) * 0.011, wrist + 0.018, hz);
        const spread = (finger - 2) * 0.1 + (thumb ? -0.6 : 0);
        let curl = thumb ? 0.1 : 0.08;
        const lengths = thumb ? [0.03, 0.02, 0.016] : [0.045, 0.03 - Math.abs(finger - 2.5) * 0.003, 0.02, 0.014];
        lengths.forEach((length, joint) => {
          const dir = new THREE.Vector3(Math.sin(spread), Math.cos(spread) * Math.cos(curl), Math.sin(curl));
          const q = p.clone().addScaledVector(dir, length);
          s.rod(p.toArray() as unknown as P3, q.toArray() as unknown as P3, 0.0034 - joint * 0.0004, bone, 0.0028 - joint * 0.0004);
          s.ball([0.004, 0.004, 0.004], q.toArray() as unknown as P3, bone, 6);
          p = q; curl += 0.22 + random() * 0.15;
        });
      }
    }
    const ex = kinds.length > 1 ? 0.15 : 0.085, ez = 0.085;
    if (a.extra === 'calipers') {
      for (const side of [-1, 1]) s.tube([[ex, top + 0.004, ez - 0.03], [ex + side * 0.03, top + 0.004, ez], [ex + side * 0.035, top + 0.004, ez + 0.03], [ex + side * 0.012, top + 0.004, ez + 0.05]], 0.0025, brass);
      s.cylinder(0.006, 0.006, 0.006, [ex, top + 0.005, ez - 0.03], brass, 10);
    } else if (a.extra === 'candle') {
      const wax = s.material('#e9dfc2', { roughness: 0.5 });
      s.cylinder(0.022, 0.026, 0.006, [ex, top + 0.003, ez], brass, 16);
      s.cylinder(0.011, 0.013, 0.03, [ex, top + 0.02, ez], wax, 12);
      for (let i = 0; i < 4; i++) s.ball([0.005, 0.012, 0.005], [ex + Math.cos(i * 1.7) * 0.012, top + 0.012, ez + Math.sin(i * 1.7) * 0.012], wax, 6);
      s.rod([ex, top + 0.035, ez], [ex + 0.002, top + 0.042, ez], 0.001, s.material('#1b1714'));
      if (mood.cheer > 0.3) s.ball([0.004, 0.009, 0.004], [ex + 0.002, top + 0.05, ez], new THREE.MeshStandardMaterial({ color: '#ffd06b', emissive: '#ffb030', emissiveIntensity: 1.6 }), 8);
    } else if (a.extra === 'banana') {
      const yellow = s.material(mood.wear > 0.6 ? '#8a6a25' : '#e9c531', { roughness: 0.6 });
      s.mesh(taper([[ex - 0.06, top + 0.016, ez], [ex - 0.02, top + 0.013, ez + 0.022], [ex + 0.03, top + 0.014, ez + 0.012], [ex + 0.06, top + 0.022, ez - 0.012]], (t) => 0.004 + 0.01 * Math.sin(Math.min(1, t * 1.1) * Math.PI), { segments: 16, sides: 6 }), yellow);
    } else if (a.extra === 'loose') {
      for (let i = 0; i < 4; i++) { const tooth = s.mesh(new THREE.BoxGeometry(0.008, 0.016, 0.008), enamel, [ex - 0.03 + i * 0.02, top + 0.005, ez + (random() - 0.5) * 0.01]); tooth.rotation.set(Math.PI / 2, 0, random() * 3); }
    }

    const chatter = mix(0, 0.06, mood.energy), rest = jaws.map((jaw) => jaw.rotation.x), phase = random() * 6;
    return s.finish({ update: jaws.length && chatter > 0 ? (_dt, time) => jaws.forEach((jaw, i) => { jaw.rotation.x = rest[i] + Math.sin(time * 3 + phase + i) * chatter; }) : undefined });
  },
});

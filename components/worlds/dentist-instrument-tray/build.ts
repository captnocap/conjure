import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';
import { lump, paint, sweep } from './teeth';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const W = 14, D = 10;
const ERAS = {
  enamel: { tray: '#f4f1e6', rim: '#1f2f5a', metal: 0.05, rough: 0.25, chair: '#9cc7b2', back: '#e9ebe2', lamp: '#f1eee2' },
  stainless: { tray: '#b9c0c4', rim: '#9aa2a7', metal: 0.55, rough: 0.32, chair: '#c9a878', back: '#e3e4dc', lamp: '#c3c9cc' },
  modern: { tray: '#bfe0de', rim: '#8fc6c3', metal: 0, rough: 0.5, chair: '#9fb3c8', back: '#e8ecee', lamp: '#f2f4f5' },
  travelling: { tray: '#8a5a36', rim: '#5e3a20', metal: 0, rough: 0.6, chair: '#9a3d32', back: '#e6dfcf', lamp: '#b8923e' },
} as const;
type Tool = 'mirror' | 'explorer' | 'probe' | 'excavator' | 'tweezers' | 'forceps' | 'syringe' | 'drill' | 'scaler';
const SETS: Record<string, Tool[]> = {
  checkup: ['mirror', 'explorer', 'probe', 'tweezers'],
  filling: ['mirror', 'explorer', 'excavator', 'drill', 'syringe', 'probe'],
  extraction: ['mirror', 'syringe', 'forceps', 'excavator', 'tweezers'],
  cleaning: ['mirror', 'scaler', 'scaler', 'probe', 'explorer'],
  impression: ['mirror', 'probe', 'excavator', 'tweezers'],
};

export default defineWorld({
  questions: {
    era: choice('What kind of practice is it?', {
      enamel: 'A 1950s surgery: white enamel tray with a navy rim, mint-green chair, a bell-shaded lamp.',
      stainless: 'A 1970s small-town practice: stainless steel tray, tan vinyl chair, chrome dish lamp.',
      modern: 'A modern clinic: pale teal plastic tray, grey-blue chair, a flat LED lamp with handles.',
      travelling: 'An itinerant dentist: a wooden tray, oxblood leather chair, a brass lamp.',
    }),
    liner: choice('What lines the tray?', {
      paper: 'Crinkled white paper.',
      bib: 'A pale blue paper bib with an embossed border.',
      towel: 'A folded green surgical cloth.',
      bare: 'Nothing: bare tray.',
    }),
    procedure: choice('What is the tray laid out for?', {
      checkup: 'A check-up: just mirror, probe and tweezers.',
      filling: 'A filling: the drill handpiece, a syringe, an amalgam capsule.',
      extraction: 'An extraction: forceps, a syringe, a stack of gauze.',
      cleaning: 'A scale and polish: scalers, a pot of pink paste, floss.',
      impression: 'An impression: a metal tray of pink alginate and a rubber mixing bowl.',
    }),
    moment: choice('What moment is it?', {
      before: 'Before: everything laid out parallel and untouched.',
      during: 'During: instruments missing from the row, others set down askew.',
      after: 'After: used and disordered, stained cotton, the worst over.',
    }),
    cup: choice('What is the rinse cup?', {
      cone: 'A paper cone in a steel holder.',
      glass: 'A glass tumbler of pink mouthwash.',
      plastic: 'A pink plastic cup.',
      dish: 'A steel kidney dish.',
    }),
    comfort: choice('What small kindness has been left on the tray?', {
      none: 'None.',
      lollipop: 'A bright spiral lollipop for afterwards.',
      sticker: 'A sheet of gold star stickers.',
      toy: 'A plastic toy ring with a huge gem.',
    }),
    behind: choice('What waits, soft and out of focus, behind the tray?', {
      chair: 'The headrest and back of the dental chair.',
      sink: 'The round porcelain spit-sink.',
      both: 'Both the chair and the spit-sink.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.era];
    const hero: [number, number] = [0.4, 1.0];
    const { art: s, world } = diorama(context, {
      background: era.back, floor: era.tray, width: W, depth: D, maxHeight: 3.3, radius: 2.3, pitch: 46, yaw: 15,
      slots: [hero, [-4.4, 3.0], [4.5, 2.9], [4.2, -0.5], [-4.7, 0.3]],
    });
    const used = a.moment === 'after', busy = a.moment !== 'before';
    const grim = clamp01((1 - mood.cheer) * 0.6 + mood.wear * 0.4);
    for (const child of s.root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = 1.1;

    const trayPaint = s.material(era.tray, { metalness: era.metal, roughness: era.rough });
    const rimPaint = s.material(era.rim, { metalness: era.metal, roughness: era.rough });
    const steel = s.material('#c5cbce', { metalness: 0.55, roughness: mix(0.25, 0.55, mood.wear) });
    const darkSteel = s.material('#8d969b', { metalness: 0.6, roughness: 0.4 });
    const white = s.material('#f7f6f0', { roughness: 0.9 });
    const blood = new THREE.Color('#8a0b14');

    // Tray rim and the bracket arm that carries it.
    for (const z of [-1, 1]) { s.box([W + 0.5, 0.62, 0.3], [0, 0.07, z * (D / 2 + 0.1)], trayPaint); s.box([W + 0.56, 0.08, 0.36], [0, 0.4, z * (D / 2 + 0.1)], rimPaint); }
    for (const x of [-1, 1]) { s.box([0.3, 0.62, D + 0.5], [x * (W / 2 + 0.1), 0.07, 0], trayPaint); s.box([0.36, 0.08, D + 0.56], [x * (W / 2 + 0.1), 0.4, 0], rimPaint); }
    s.cylinder(0.7, 0.9, 1.2, [0, -0.8, 0], darkSteel, 16);
    s.rod([0, -1.2, 0], [-7.6, -1.2, -2.4], 0.36, darkSteel);

    // Liner, with the lamp pool and the day's stains painted in.
    const linerTone = { paper: '#fbfaf5', bib: '#cfe3f2', towel: '#6fa58c', bare: era.tray }[a.liner];
    const liner = paint(1024, 732, (ctx, w, h) => {
      const px = (x: number) => (x + W / 2) / W * w, pz = (z: number) => (z + D / 2) / D * h;
      ctx.fillStyle = linerTone; ctx.fillRect(0, 0, w, h);
      if (a.liner === 'paper' || a.liner === 'bib') {
        ctx.strokeStyle = 'rgba(90,110,130,0.13)'; ctx.lineWidth = 2;
        for (let i = 0; i < 46; i++) { const x = random() * w, y = random() * h, t = random() * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * (60 + random() * 200), y + Math.sin(t) * (60 + random() * 200)); ctx.stroke(); }
        if (a.liner === 'bib') { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 20; x < w; x += 26) for (const y of [18, 44, h - 18, h - 44]) { ctx.beginPath(); ctx.arc(x + (y % 3) * 6, y, 5, 0, 7); ctx.fill(); } }
      } else if (a.liner === 'towel') {
        ctx.strokeStyle = 'rgba(20,60,40,0.22)'; ctx.lineWidth = 5;
        for (const x of [w / 3, w * 2 / 3]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 2600; i++) ctx.fillRect(random() * w, random() * h, 3, 1);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        for (let i = 0; i < 160; i++) { const y = random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (random() - 0.5) * 8); ctx.stroke(); }
      }
      const pool = ctx.createRadialGradient(px(hero[0]), pz(hero[1]), 40, px(hero[0]), pz(hero[1]), 430);
      pool.addColorStop(0, 'rgba(255,255,250,0.5)'); pool.addColorStop(0.5, 'rgba(255,255,250,0.12)'); pool.addColorStop(0.56, 'rgba(40,50,70,0.05)'); pool.addColorStop(1, 'rgba(40,50,70,0.3)');
      ctx.fillStyle = pool; ctx.fillRect(0, 0, w, h);
      const rings = Math.round(mood.wear * 3 + (busy ? 1 : 0));
      for (let i = 0; i < rings; i++) { ctx.strokeStyle = `rgba(120,150,170,${0.2 + random() * 0.2})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px(4.2 + random() * 1.6), pz(-2.2 - random() * 1.2), 44 + random() * 8, 0, 7); ctx.stroke(); }
      for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = `rgba(120,80,30,${0.06 + random() * 0.12})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * 16, 0, 7); ctx.fill(); }
      const spots = Math.round(grim * 7 + (used ? 6 : 0) + (a.procedure === 'extraction' && busy ? 5 : 0) - (a.moment === 'before' ? 3 : 0));
      for (let i = 0; i < spots; i++) {
        const x = px(mix(-5.5, 5.5, random())), y = pz(mix(-1.2, 4.4, random())), r = 3 + random() * random() * 20;
        ctx.fillStyle = `rgba(${120 + random() * 40},8,16,${0.55 + random() * 0.35})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x + (random() - 0.5) * r * 4, y + (random() - 0.5) * r * 4, r * 0.25, 0, 7); ctx.fill(); }
      }
    });
    const sheet = s.mesh(new THREE.PlaneGeometry(W - 0.5, D - 0.5), new THREE.MeshStandardMaterial({ map: liner, roughness: a.liner === 'bare' ? era.rough : 0.95, metalness: a.liner === 'bare' ? era.metal : 0 }), [0, 0.012, 0]);
    sheet.rotation.x = -Math.PI / 2;
    sheet.castShadow = false;

    // Instruments, each laid along z with its working end toward the patient.
    const makeTool = (kind: Tool) => {
      const t = new Sculpture(context);
      const handle = (from: number, to: number, r = 0.085) => {
        t.rod([0, 0.1, from], [0, 0.1, to], r, steel);
        for (let z = from + 0.3; z < to - 0.2; z += 0.28) t.rod([0, 0.1, z], [0, 0.1, z + 0.1], r + 0.012, darkSteel);
      };
      if (kind === 'forceps') {
        for (const x of [-1, 1]) {
          t.mesh(sweep([V(x * 0.34, 0.12, -1.7), V(x * 0.3, 0.12, -0.6), V(x * 0.08, 0.12, 0.25), V(-x * 0.09, 0.12, 0.8), V(-x * 0.06, 0.16, 1.5), V(-x * 0.02, 0.1, 1.75)], (u) => mix(0.1, 0.06, u), { radial: 8 }), steel);
        }
        t.cylinder(0.14, 0.14, 0.2, [0, 0.12, 0.42], darkSteel, 12);
      } else if (kind === 'syringe') {
        t.rod([0, 0.17, -0.5], [0, 0.17, 0.9], 0.16, steel);
        t.rod([0, 0.17, -0.2], [0, 0.17, 0.6], 0.165, s.material('#d9f0ee', { roughness: 0.1, emissive: '#9fd6d0', emissiveIntensity: 0.25 }));
        t.rod([0, 0.17, 0.9], [0, 0.17, 1.7], 0.022, steel, 0.008);
        t.rod([0, 0.17, -1.35], [0, 0.17, -0.5], 0.045, steel);
        t.ring(0.17, 0.035, [0, 0.17, -1.52], steel).rotation.x = Math.PI / 2;
        for (const x of [-1, 1]) t.ring(0.15, 0.035, [x * 0.3, 0.17, -0.5], steel).rotation.x = Math.PI / 2;
      } else if (kind === 'drill') {
        t.mesh(sweep([V(0, 0.16, -1.6), V(0, 0.16, 0.4), V(0, 0.2, 1.3), V(0, 0.24, 1.55)], (u) => mix(0.17, 0.09, u), { radial: 10 }), steel);
        t.cylinder(0.13, 0.13, 0.22, [0, 0.2, 1.6], darkSteel, 12);
        t.rod([0, 0.1, 1.6], [0, -0.0, 1.6], 0.02, darkSteel, 0.01);
        t.mesh(sweep([V(0, 0.16, -1.6), V(0.3, 0.1, -2.6), V(0.2, 0.1, -3.6), V(-0.6, -0.4, -5.2)], () => 0.1, { radial: 8 }), s.material('#5a6268', { roughness: 0.7 }));
      } else if (kind === 'tweezers') {
        for (const x of [-1, 1]) t.mesh(sweep([V(0, 0.08, -1.6), V(x * 0.16, 0.08, -0.4), V(x * 0.1, 0.08, 0.9), V(x * 0.015, 0.06, 1.65)], () => [0.03, 0.07], { radial: 6 }), steel);
      } else {
        handle(-1.65, 0.45);
        t.rod([0, 0.1, 0.45], [0, 0.1, 1.2], 0.05, steel, 0.03);
        if (kind === 'mirror') {
          const head = t.cylinder(0.36, 0.36, 0.06, [0, 0.14, 1.5], steel, 24);
          head.rotation.x = 0.25;
          const glass = t.cylinder(0.31, 0.31, 0.065, [0, 0.146, 1.5], s.material('#e8f4f6', { roughness: 0.05, emissive: '#cfeaf0', emissiveIntensity: 0.4 }), 24);
          glass.rotation.x = 0.25;
        } else if (kind === 'explorer') t.mesh(sweep([V(0, 0.1, 1.2), V(0, 0.1, 1.5), V(0.14, 0.1, 1.7), V(0.26, 0.1, 1.6), V(0.26, 0.1, 1.45)], (u) => mix(0.03, 0.006, u), { radial: 6 }), steel);
        else if (kind === 'probe') { t.rod([0, 0.1, 1.2], [0.1, 0.1, 1.75], 0.028, steel, 0.012); for (const z of [1.4, 1.55]) t.rod([0.035 + (z - 1.4) * 0.2, 0.1, z], [0.04 + (z - 1.4) * 0.2, 0.1, z + 0.04], 0.034, darkSteel); }
        else if (kind === 'scaler') t.mesh(sweep([V(0, 0.1, 1.2), V(0, 0.1, 1.45), V(-0.12, 0.1, 1.6), V(-0.05, 0.1, 1.78), V(0.12, 0.1, 1.72)], (u) => [0.02, mix(0.04, 0.015, u)], { radial: 6 }), steel);
        else t.box([0.16, 0.03, 0.34], [0.03, 0.1, 1.38], steel).rotation.y = 0.25;
      }
      t.root.scale.setScalar(0.96);
      return t.root;
    };
    const tools = [...SETS[a.procedure]];
    const spare: Tool[] = ['explorer', 'probe', 'excavator', 'scaler', 'mirror'];
    for (let i = 0; i < Math.round(mood.density * 4); i++) tools.push(spare[Math.floor(random() * spare.length)]);
    const start = -6.0, step = Math.min(0.95, 7.4 / tools.length);
    tools.forEach((kind, index) => {
      const inUse = a.moment === 'during' && index > 0 && random() < 0.3;
      if (inUse) return;
      const tool = makeTool(kind);
      const askew = busy ? (random() < (used ? 0.6 : 0.3) ? 1 : 0.15) : 0.03;
      tool.position.set(start + index * step + (random() - 0.5) * 0.3 * askew, 0.02, -2.95 + (random() - 0.5) * 0.9 * askew);
      tool.rotation.y = (random() - 0.5) * 0.9 * askew;
      s.root.add(tool);
    });

    // Rinse cup.
    const cupAt: [number, number] = [5.5, -3.6];
    const wash = s.material(mood.warmth > 0.5 ? '#f08fb0' : '#8fd0e8', { roughness: 0.1, emissive: mood.warmth > 0.5 ? '#c0507a' : '#4a9ac0', emissiveIntensity: 0.3 });
    const fill = a.moment === 'before' ? 0.82 : a.moment === 'during' ? 0.5 : 0.18;
    if (a.cup === 'cone') {
      s.lathe([[0.05, 0.5], [0.62, 1.75], [0.6, 1.75], [0, 0.42]], s.material('#fbfaf3', { roughness: 0.9, side: THREE.DoubleSide }), [cupAt[0], 0, cupAt[1]]);
      s.cylinder(0.5 * fill + 0.08, 0.5 * fill + 0.08, 0.03, [cupAt[0], 0.5 + 1.2 * fill, cupAt[1]], wash, 20);
      s.lathe([[0.55, 0], [0.6, 0.06], [0.2, 0.14], [0.14, 0.9], [0.34, 1.1], [0.36, 1.2], [0.3, 1.2], [0.1, 0.95], [0, 0.95]], steel, [cupAt[0], 0, cupAt[1]]);
    } else if (a.cup === 'dish') {
      const dish = s.lathe([[0, 0.05], [0.7, 0.05], [0.95, 0.5], [1.0, 0.5], [0.76, 0], [0, 0]], s.material('#c5cbce', { metalness: 0.55, roughness: 0.3, side: THREE.DoubleSide }), [cupAt[0] - 0.3, 0.02, cupAt[1] + 0.1]);
      dish.scale.set(1.45, 1, 0.85);
      dish.rotation.y = 0.3;
      const pool = s.cylinder(0.6, 0.6, 0.03, [cupAt[0] - 0.3, 0.12 + fill * 0.2, cupAt[1] + 0.1], wash, 20);
      pool.scale.set(1.45, 1, 0.85);
    } else {
      const glassy = a.cup === 'glass';
      const body = glassy
        ? new THREE.MeshStandardMaterial({ color: '#e4f3f5', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide })
        : s.material('#f29ab8', { roughness: 0.5, side: THREE.DoubleSide });
      const wall = s.mesh(new THREE.CylinderGeometry(0.62, 0.5, 1.5, 28, 1, true), body, [cupAt[0], 0.77, cupAt[1]]);
      wall.renderOrder = 3;
      wall.castShadow = !glassy;
      s.cylinder(0.5, 0.5, 0.06, [cupAt[0], 0.05, cupAt[1]], glassy ? s.material('#d5e6e8', { roughness: 0.15 }) : s.material('#f29ab8'), 28);
      s.ring(0.62, 0.03, [cupAt[0], 1.52, cupAt[1]], s.material(glassy ? '#f1f8f9' : '#f7b6cc')).rotation.x = Math.PI / 2;
      s.cylinder(0.5 + 0.1 * fill, 0.5, 1.3 * fill, [cupAt[0], 0.09 + 0.65 * fill, cupAt[1]], wash, 24);
    }

    // Cotton rolls and gauze.
    const cotton = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const rollCount = 3 + Math.round(mood.density * 5);
    for (let i = 0; i < rollCount; i++) {
      const stained = used && random() < 0.6 || (a.moment === 'during' && random() < 0.2);
      const stray = stained || (busy && random() < 0.3);
      const geometry = sweep([V(-0.36, 0, 0), V(0, 0, 0.02), V(0.36, 0, 0)], () => 0.15, { radial: 10, steps: 6, color: (u) => new THREE.Color('#fbfaf6').lerp(blood, stained ? clamp01(1.2 - u * 1.6 + random() * 0.3) : 0) });
      const roll = s.mesh(geometry, cotton, stray ? [mix(-2.6, 3.2, random()), 0.16, mix(2.6, 4.3, random())] : [2.3 + (i % 3) * 0.36 + random() * 0.1, 0.16 + Math.floor(i / 3) * 0.27, -4.1 + (i % 2) * 0.1]);
      roll.rotation.y = stray ? random() * 3 : Math.PI / 2 + (random() - 0.5) * 0.2;
    }
    const props = new Sculpture(context);
    if (a.procedure === 'extraction') {
      for (let i = 0; i < 4; i++) props.box([0.9, 0.05, 0.9], [0, 0.03 + i * 0.05, 0], white).rotation.y = (random() - 0.5) * 0.3;
      if (busy) {
        const r = 0.42;
        const wad = props.mesh(lump(r, random, 0.2, 2, (v) => new THREE.Color('#f6f4ee').lerp(blood, clamp01(0.5 - v.x / r + random() * 0.3))), cotton, [-0.3, 0.14, 1.4]);
        wad.scale.set(1.2, 0.4, 1);
      }
    } else if (a.procedure === 'filling') {
      props.cylinder(0.14, 0.14, 0.34, [-0.2, 0.14, 0.5], s.material('#2f6fd0'), 12).rotation.z = Math.PI / 2;
      props.cylinder(0.14, 0.14, 0.3, [0.12, 0.14, 0.5], s.material('#f2f2ee'), 12).rotation.z = Math.PI / 2;
      props.lathe([[0, 0.12], [0.3, 0.14], [0.42, 0.3], [0.46, 0.3], [0.4, 0], [0, 0]], s.material('#dfeef0', { roughness: 0.1, side: THREE.DoubleSide }), [0.1, 0, -0.5]);
      props.ball([0.2, 0.08, 0.2], [0.1, 0.18, -0.5], s.material('#9aa1a6', { metalness: 0.8, roughness: 0.3 }), 12);
    } else if (a.procedure === 'cleaning') {
      props.cylinder(0.42, 0.38, 0.3, [0, 0.15, -0.3], white, 20);
      props.cylinder(0.36, 0.36, 0.05, [0, 0.3, -0.3], s.material('#f08fb0', { roughness: 0.4 }), 20);
      props.box([0.7, 0.26, 0.5], [0.1, 0.13, 0.7], s.material('#f4f6f8', { roughness: 0.4 })).rotation.y = 0.3;
      props.mesh(sweep([V(0.3, 0.2, 0.85), V(0.7, 0.05, 1.2), V(0.5, 0.03, 1.7), V(1.0, 0.03, 1.9)], () => 0.012, { radial: 4 }), white);
    } else if (a.procedure === 'impression') {
      const pink = s.material('#f29aa6', { roughness: 0.6 });
      const u = [V(-0.55, 0.12, -0.5), V(-0.6, 0.12, 0.1), V(-0.35, 0.12, 0.55), V(0, 0.12, 0.7), V(0.35, 0.12, 0.55), V(0.6, 0.12, 0.1), V(0.55, 0.12, -0.5)];
      props.mesh(sweep(u, () => [0.1, 0.24], { radial: 10 }), steel);
      props.mesh(sweep(u.map((p) => p.clone().setY(0.2)), () => [0.07, 0.19], { radial: 10 }), pink);
      props.box([0.26, 0.05, 0.8], [0, 0.1, 1.15], steel);
      props.lathe([[0, 0.08], [0.5, 0.1], [0.72, 0.6], [0.78, 0.6], [0.56, 0], [0, 0]], s.material('#3f6f5f', { roughness: 0.7, side: THREE.DoubleSide }), [0.9, 0, -1.3]);
      props.ball([0.45, 0.12, 0.45], [0.9, 0.2, -1.3], pink, 14);
    } else {
      props.box([1.3, 0.02, 0.9], [0, 0.02, 0], s.material('#f1ead2', { roughness: 0.9 })).rotation.y = 0.2;
      for (let i = 0; i < 3; i++) props.box([0.8, 0.012, 0.03], [-0.05, 0.035, -0.2 + i * 0.2], s.material('#5a6a8a')).rotation.y = 0.2;
    }
    props.root.position.set(3.3, 0.02, -2.9);
    s.root.add(props.root);

    // A small kindness in the corner.
    const treat = new Sculpture(context);
    if (a.comfort === 'lollipop') {
      const swirl = paint(128, 128, (ctx, w) => {
        const hues = ['#ff4b6e', '#ffd94a', '#52c8ff', '#7dff8a', '#ffffff', '#c98bff'];
        for (let i = 0; i < 12; i++) { ctx.fillStyle = hues[i % 6]; ctx.beginPath(); ctx.moveTo(w / 2, w / 2); ctx.arc(w / 2, w / 2, w, i / 12 * Math.PI * 2, (i + 1) / 12 * Math.PI * 2); ctx.fill(); }
      });
      const candy = treat.cylinder(0.5, 0.5, 0.14, [0, 0.09, 0], [s.material('#ff4b6e'), new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.25, emissive: '#402020', emissiveIntensity: 0.4 }), s.material('#ff4b6e')] as unknown as THREE.Material, 28);
      candy.rotation.y = random() * 3;
      treat.rod([0, 0.07, 0.4], [0.2, 0.07, 1.7], 0.035, white);
    } else if (a.comfort === 'sticker') {
      const stars = paint(160, 200, (ctx, w, h) => {
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
          if (busy && random() < 0.25) continue;
          ctx.fillStyle = ['#e6b422', '#e6b422', '#d8342a', '#2f8fd0'][Math.floor(random() * 4)];
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 20, t = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(30 + col * 50 + Math.cos(t) * r, 28 + row * 48 + Math.sin(t) * r); }
          ctx.fill();
        }
      });
      treat.box([1.1, 0.02, 1.4], [0, 0.02, 0.2], [white, white, new THREE.MeshStandardMaterial({ map: stars, roughness: 0.6 }), white, white, white] as unknown as THREE.Material);
    } else if (a.comfort === 'toy') {
      const hue = ['#ff4b9a', '#52c8ff', '#7dff8a', '#ffd94a'][Math.floor(random() * 4)];
      treat.ring(0.3, 0.07, [0, 0.32, 0], s.material('#ffd94a', { roughness: 0.3 }));
      treat.mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: hue, roughness: 0.05, emissive: hue, emissiveIntensity: 0.5, flatShading: true }), [0, 0.78, 0]);
    }
    treat.root.position.set(6.0, 0.02, 4.0);
    treat.root.rotation.y = -0.4 + random() * 0.4;
    s.root.add(treat.root);

    // The lamp: its head leans in from the back corner and throws a hard pool at the hero slot.
    const lampAt = V(-5.4, 5.6, -5.6), aim = V(hero[0], 0, hero[1]);
    const lamp = new Sculpture(context);
    const shade = s.material(era.lamp, { metalness: a.era === 'enamel' || a.era === 'modern' ? 0.05 : 0.6, roughness: 0.35 });
    const glow = new THREE.MeshStandardMaterial({ color: '#fffdf0', emissive: '#fff6d8', emissiveIntensity: mix(0.9, 1.6, mood.energy) });
    if (a.era === 'modern') {
      lamp.box([2.6, 0.35, 1.3], [0, 0, 0], shade);
      for (let i = 0; i < 3; i++) lamp.box([0.6, 0.04, 0.9], [-0.8 + i * 0.8, -0.19, 0], glow);
      for (const x of [-1, 1]) lamp.mesh(sweep([V(x * 1.3, 0, -0.4), V(x * 1.8, -0.15, 0), V(x * 1.3, 0, 0.4)], () => 0.07, { radial: 6 }), darkSteel);
    } else {
      lamp.lathe([[0.25, 0.7], [0.5, 0.55], [1.15, 0.05], [1.3, -0.25], [1.24, -0.25], [1.05, 0], [0.4, 0.45], [0, 0.5]], shade);
      lamp.cylinder(1.02, 1.02, 0.04, [0, -0.05, 0], glow, 28);
      lamp.rod([1.3, -0.2, 0], [1.75, -0.3, 0], 0.06, darkSteel);
    }
    lamp.root.position.copy(lampAt);
    lamp.root.scale.setScalar(1.4);
    lamp.root.quaternion.setFromUnitVectors(V(0, -1, 0), aim.clone().sub(lampAt).normalize());
    s.root.add(lamp.root);
    s.mesh(sweep([lampAt.clone().add(V(-0.2, 0.5, -0.2)), V(-6.6, 6.9, -6.4), V(-7.6, 6.5, -7.0), V(-8.0, 5.2, -7.3)], () => 0.14, { radial: 8 }), darkSteel);
    const spot = new THREE.SpotLight(new THREE.Color('#fffaf0').lerp(new THREE.Color('#ffe2b0'), mood.warmth * 0.5), 2.6, 0, 0.4, 0.22, 0);
    spot.position.copy(lampAt);
    spot.target.position.copy(aim);
    s.root.add(spot, spot.target);

    // Behind and below, out of focus: the chair and the spit-sink.
    const soft = (color: string, opacity = 0.5) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(era.back), 0.35), transparent: true, opacity, depthWrite: false, roughness: 0.9 });
    const ghost = (mesh: THREE.Mesh, order = 0) => { mesh.castShadow = mesh.receiveShadow = false; mesh.renderOrder = -5 + order; return mesh; };
    if (a.behind !== 'sink') {
      const x = a.behind === 'both' ? -2.6 : 0.6;
      const vinyl = soft(era.chair, 0.62);
      const back = ghost(s.ball([3.4, 0.9, 5.2], [x, -3.2, -12.5], vinyl, 24), 0);
      back.rotation.x = 0.25;
      ghost(s.ball([1.7, 0.7, 1.3], [x, -1.6, -18.4], vinyl, 20), 1);
      ghost(s.ball([3.6, 0.8, 2.6], [x, -4.4, -6.6], vinyl, 20), 0);
      for (const side of [-1, 1]) ghost(s.ball([0.5, 0.4, 2.6], [x + side * 3.9, -2.9, -9], soft('#b9c0c4', 0.5), 12), 1);
    }
    if (a.behind !== 'chair') {
      const x = a.behind === 'both' ? 6.4 : 4.6;
      const porcelain = new THREE.MeshStandardMaterial({ color: '#f4f6f4', transparent: true, opacity: 0.66, depthWrite: false, roughness: 0.3, side: THREE.DoubleSide });
      ghost(s.lathe([[0.3, -0.9], [1.6, -0.6], [2.5, 0.2], [2.7, 0.2], [1.8, -1.0], [0.4, -1.3]], porcelain, [x, -2.2, -12.6]), 1);
      ghost(s.cylinder(0.35, 0.35, 0.05, [x, -3.05, -12.6], soft('#5a6268', 0.7), 16), 2);
      ghost(s.cylinder(0.5, 0.7, 3.2, [x, -4.9, -12.6], soft('#d9dcd8', 0.5), 16), 0);
      ghost(s.mesh(sweep([V(x - 2.6, -2.0, -13.4), V(x - 2.5, -0.6, -13.3), V(x - 1.6, -0.3, -12.9), V(x - 1.1, -1.2, -12.7)], () => 0.12, { radial: 8 }), soft('#b9c0c4', 0.75)), 2);
      if (grim > 0.5) ghost(s.cylinder(0.9, 0.9, 0.02, [x + 0.3, -2.95, -12.4], soft('#c04a5a', 0.35), 16), 3);
    }

    const place = world.place.bind(world);
    world.place = (items) => {
      place(items);
      for (const item of items) if (!item.hero) item.holder.scale.multiplyScalar(0.6);
    };
    if (mood.wear > 0.6) {
      const base = spot.intensity;
      world.update = (_dt, time) => {
        const dip = Math.sin(time * 23) * Math.sin(time * 7.3) > 0.82 ? 0.55 : 1;
        spot.intensity = base * dip;
        glow.emissiveIntensity = 1.2 * dip;
      };
    }
    return world;
  },
});

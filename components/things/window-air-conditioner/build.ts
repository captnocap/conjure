import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    setting: choice('What is the unit doing right now?', {
      cold: 'Blasting cold: frost on the grille, icicles, ribbons streaming straight out.',
      rattling: 'Rattling and shuddering, a loose panel buzzing, about to give up.',
      off: 'Off and silent, the ribbons hanging limp.',
      heating: 'Heating: an orange glow deep in the vent, ribbons lifting in warm air.',
    }),
    style: choice('What kind of cabinet is it?', {
      ptac: 'A long low beige cabinet under the window, the standard motel unit of the 1980s.',
      deco: 'A 1960s two-tone unit in turquoise and chrome with one big round dial.',
      'window-box': 'A boxy window unit jammed into the sash with accordion side panels.',
    }),
    resting: choice('What is drying or resting on top of it?', {
      nothing: 'Nothing.',
      socks: 'A pair of socks draped over the edge to dry.',
      swimsuit: 'A wet swimsuit from the motel pool, dripping.',
      bag: 'A crumpled paper takeaway bag with a grease spot.',
      keys: 'A set of car keys and loose change, put down on arrival.',
    }),
    louvres: choice('What condition are the louvres in?', {
      straight: 'All straight and evenly spaced.',
      bent: 'Bent and splayed by years of fingers and luggage.',
      missing: 'Several missing, leaving a dark gap, one hanging loose.',
    }),
    puddle: noul('Has it dripped a puddle onto the floor?'),
    curtain: choice('What hangs in the window above it?', {
      heavy: 'Heavy blackout drapes almost closed, one bright slit between them.',
      sheer: 'Thin sheers glowing with daylight.',
      blinds: 'Dusty horizontal blinds, a few slats kinked.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const box = a.style === 'window-box';
    const wallW = 1.75, sillY = box ? 0.95 : 0.78, wallT = 0.14;
    const winH = 1.0, top = sillY + winH + 0.16;
    const wall = s.material(mood.warmth > 0.5 ? '#d8c39a' : '#c3cbc2', { roughness: 0.95 });
    const trim = s.material('#efe9da');
    const body = s.material(a.style === 'deco' ? '#3fb3ac' : mix(0, 1, mood.wear) > 0.6 ? '#cdbd95' : '#d9cfb4', { roughness: 0.55 });
    const panel = s.material(a.style === 'deco' ? '#e9e4d2' : '#c9bea0', { roughness: 0.6 });
    const dark = s.material('#2c2a27');
    const chrome = s.material('#d5d9dc', { metalness: 0.85, roughness: 0.25 });

    // The wall with its window opening.
    const winW = 1.25;
    s.box([wallW, sillY, wallT], [0, sillY / 2, -wallT / 2], wall);
    for (const x of [-1, 1]) s.box([(wallW - winW) / 2, winH, wallT], [x * (winW + (wallW - winW) / 2) / 2, sillY + winH / 2, -wallT / 2], wall);
    s.box([wallW, 0.16, wallT], [0, sillY + winH + 0.08, -wallT / 2], wall);
    s.box([winW + 0.1, 0.035, wallT + 0.07], [0, sillY + 0.017, -wallT / 2 + 0.03], trim);
    for (const x of [-1, 1]) s.box([0.04, winH, 0.05], [x * (winW / 2 - 0.02), sillY + winH / 2, -0.03], trim);
    s.box([winW, 0.04, 0.05], [0, sillY + winH - 0.02, -0.03], trim);
    s.box([wallW, 0.09, 0.02], [0, 0.045, 0.01], s.material('#5a4a3a'));
    const day = 1 - Math.abs(mood.daylight - 0.5) * 1.3;
    const sky = new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.55, mix(0.45, 0.82, day));
    s.box([winW, winH, 0.01], [0, sillY + winH / 2, -wallT + 0.02], new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: 0.7, roughness: 0.2 }));

    // Curtains or blinds.
    const cz = 0.015;
    if (a.curtain === 'blinds') {
      const slat = s.material('#e3dcc6');
      for (let i = 0; i < 22; i++) {
        const m = s.box([winW - 0.1, 0.004, 0.035], [0, sillY + 0.08 + i * (winH - 0.1) / 22, cz - 0.03], slat);
        m.rotation.x = 0.5; if (random() < mood.wear * 0.3) m.rotation.z = (random() - 0.5) * 0.12;
      }
      s.box([winW - 0.06, 0.04, 0.05], [0, sillY + winH - 0.04, cz - 0.03], trim);
    } else {
      const sheer = a.curtain === 'sheer';
      const fabric = sheer
        ? new THREE.MeshStandardMaterial({ color: '#f4efe0', emissive: sky, emissiveIntensity: 0.35, roughness: 1, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.5, 0.05, mood.warmth), mix(0.25, 0.55, mood.cheer), 0.34), roughness: 1, side: THREE.DoubleSide });
      const slit = sheer ? 0 : 0.05 + random() * 0.12;
      for (const side of [-1, 1]) {
        const w = winW / 2 + 0.08 - slit / 2;
        const geo = new THREE.PlaneGeometry(w, winH + 0.04, 26, 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 34 + side) * 0.022);
        geo.computeVertexNormals();
        s.mesh(geo, fabric, [side * (slit / 2 + w / 2), sillY + winH / 2 + 0.03, cz]);
      }
      s.rod([-winW / 2 - 0.1, sillY + winH + 0.06, cz], [winW / 2 + 0.1, sillY + winH + 0.06, cz], 0.012, chrome);
    }

    // The unit.
    const unit = new THREE.Group();
    s.root.add(unit);
    const u = (m: THREE.Mesh) => { unit.add(m); return m; };
    const uw = box ? 0.62 : 1.12, uh = box ? 0.4 : 0.46, ud = box ? 0.34 : 0.24;
    const uy = box ? sillY + 0.035 : 0.06;
    unit.position.set(0, uy, box ? 0.04 : ud / 2 + 0.01);
    u(s.box([uw, uh, ud], [0, uh / 2, 0], body));
    if (!box) u(s.box([uw - 0.06, 0.06, ud - 0.04], [0, -0.03, 0], dark));
    const front = ud / 2;
    // Intake panel with horizontal slats.
    const ih = box ? uh * 0.5 : uh * 0.52;
    u(s.box([uw - (box ? 0.2 : 0.08), ih, 0.012], [box ? -0.07 : 0, ih / 2 + 0.04, front + 0.004], panel));
    const nSlat = 9;
    for (let i = 0; i < nSlat; i++) u(s.box([uw - (box ? 0.24 : 0.14), 0.006, 0.012], [box ? -0.07 : 0, 0.06 + i * (ih - 0.04) / nSlat, front + 0.012], dark));
    // Discharge slot with vertical louvres along the upper front.
    const slotY = uh - 0.085, slotW = uw - (box ? 0.08 : 0.34), slotX = box ? 0 : -0.13;
    const air = a.setting === 'cold' ? '#bfe6ff' : a.setting === 'heating' ? '#ff7a2a' : '#141414';
    u(s.box([slotW, 0.1, 0.02], [slotX, slotY, front - 0.004], new THREE.MeshStandardMaterial({ color: air, emissive: air, emissiveIntensity: a.setting === 'cold' ? 0.5 : a.setting === 'heating' ? 1.1 : 0, roughness: 0.6 })));
    const fins = Math.round(slotW / 0.045);
    const gapStart = 3 + Math.floor(random() * (fins - 9)), gapLen = 3 + Math.floor(random() * 3);
    for (let i = 0; i < fins; i++) {
      const x = slotX - slotW / 2 + (i + 0.5) * slotW / fins;
      const gone = a.louvres === 'missing' && i >= gapStart && i < gapStart + gapLen;
      if (gone && i !== gapStart) continue;
      const fin = u(s.box([0.008, 0.1, 0.03], [x, slotY, front + 0.012], panel));
      fin.rotation.y = 0.35;
      if (a.louvres === 'bent') { fin.rotation.y = 0.35 + (random() - 0.5) * 1.5; fin.rotation.z = (random() - 0.5) * 0.5; }
      if (gone) { fin.rotation.z = 0.9; fin.position.y -= 0.05; fin.position.z += 0.02; }
    }
    // Control flap and knobs.
    if (a.style === 'deco') {
      u(s.box([uw + 0.012, 0.02, ud + 0.012], [0, uh - 0.16, 0], chrome));
      u(s.box([uw + 0.012, 0.02, ud + 0.012], [0, 0.03, 0], chrome));
      const dial = u(s.cylinder(0.065, 0.07, 0.03, [uw / 2 - 0.12, slotY, front + 0.015], chrome, 24)); dial.rotation.x = Math.PI / 2;
      const cap = u(s.cylinder(0.04, 0.04, 0.02, [uw / 2 - 0.12, slotY, front + 0.035], s.material('#e94f37'), 20)); cap.rotation.x = Math.PI / 2;
      const p = u(s.box([0.008, 0.05, 0.01], [uw / 2 - 0.12, slotY, front + 0.046], trim)); p.rotation.z = { cold: -1.2, rattling: 0.4, off: 0, heating: 1.2 }[a.setting];
    } else {
      const cx = box ? uw / 2 - 0.07 : uw / 2 - 0.12, cy = box ? ih / 2 + 0.04 : slotY;
      u(s.box(box ? [0.11, ih, 0.012] : [0.19, 0.1, 0.012], [cx, cy, front + 0.004], s.material('#4a4640')));
      for (const k of [-1, 1]) {
        const at: [number, number, number] = box ? [cx, cy + k * 0.045, front + 0.02] : [cx + k * 0.045, cy, front + 0.02];
        const knob = u(s.cylinder(0.022, 0.026, 0.03, at, s.material('#e8e2d0'), 14)); knob.rotation.x = Math.PI / 2;
        const p = u(s.box([0.005, 0.03, 0.006], [at[0], at[1], at[2] + 0.017], dark)); p.rotation.z = random() * 6;
      }
      if (!box) { const flap = u(s.box([0.2, 0.012, 0.11], [cx, cy + 0.09, front + 0.03], body)); flap.rotation.x = -1.0; }
    }
    if (box) {
      // Accordion panels fill the sash each side, and the sash comes down on top.
      for (const side of [-1, 1]) {
        const w = (winW - uw) / 2 - 0.02;
        for (let i = 0; i < 9; i++) { const pleat = s.box([w / 9 + 0.004, uh - 0.02, 0.012], [side * (uw / 2 + (i + 0.5) * w / 9), uy + uh / 2, -0.03 + (i % 2 ? 0.012 : 0)], trim); pleat.rotation.y = i % 2 ? 0.5 : -0.5; }
      }
      s.box([winW, 0.05, 0.05], [0, uy + uh + 0.025, -0.03], trim);
      s.box([0.04, 0.012, ud], [-uw / 2 + 0.1, uy - 0.02, 0.04], dark);
    }

    // Frost and icicles.
    if (a.setting === 'cold') {
      const ice = s.material('#eef8ff', { roughness: 0.25, emissive: '#9fd0ff', emissiveIntensity: 0.25 });
      const flakes = [];
      for (let i = 0; i < 70; i++) flakes.push({ at: [slotX + (random() - 0.5) * (slotW + 0.1), slotY + (random() - 0.5) * 0.17, front + 0.02 + random() * 0.012] as const, size: 0.008 + random() * 0.016 });
      u(s.scatter(new THREE.IcosahedronGeometry(1, 0), ice, flakes));
      for (let i = 0; i < 7; i++) { const len = 0.04 + random() * 0.09; const c = u(s.cylinder(0.011, 0.001, len, [slotX + (random() - 0.5) * slotW, slotY - 0.055 - len / 2, front + 0.024], ice, 6)); void c; }
    }

    // Ribbons tied to the grille.
    const ribbons: { geo: THREE.BufferGeometry; len: number; phase: number; x: number }[] = [];
    const ribbonMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.02, 0.0, mood.cheer), 0.8, 0.5), roughness: 0.9, side: THREE.DoubleSide });
    const nRib = 2 + Math.round(mood.density * 2);
    const blow = { cold: 1, rattling: 0.55, off: 0, heating: 0.6 }[a.setting];
    for (let i = 0; i < nRib; i++) {
      const len = 0.22 + random() * 0.16;
      const geo = new THREE.PlaneGeometry(0.022, len, 1, 12);
      const mesh = u(s.mesh(geo, i % 2 ? ribbonMat : new THREE.MeshStandardMaterial({ color: '#f0ead8', roughness: 0.9, side: THREE.DoubleSide })));
      mesh.frustumCulled = false;
      ribbons.push({ geo, len, phase: random() * 6, x: slotX + (random() - 0.5) * slotW * 0.8 });
    }
    const pose = (time: number) => {
      for (const r of ribbons) {
        const pos = r.geo.attributes.position;
        for (let row = 0; row <= 12; row++) {
          const t = row / 12;
          const flutter = Math.sin(time * 9 * (0.5 + mood.energy) + r.phase + t * 7) * 0.035 * t * blow * (a.setting === 'rattling' ? 1.8 : 1);
          const out = blow * r.len * t * 0.92;
          const lift = a.setting === 'heating' ? 0.45 : 0.12;
          const y = slotY + 0.03 - (1 - blow * 0.9) * r.len * t + blow * lift * r.len * t * (1 - t * 0.4) + flutter;
          const z = front + 0.03 + out + (1 - blow) * 0.01;
          const x = r.x + Math.sin(time * 6 + r.phase * 2 + t * 5) * 0.02 * t * blow;
          pos.setXYZ(row * 2, x - 0.011, y, z); pos.setXYZ(row * 2 + 1, x + 0.011, y, z);
        }
        pos.needsUpdate = true;
        r.geo.computeVertexNormals();
      }
    };
    pose(0);

    // On top.
    const ty = uh, tz = box ? 0.05 : 0.02, tx = box ? 0 : -0.18 + random() * 0.3;
    if (a.resting === 'socks') {
      for (const k of [0, 1]) {
        const sock = s.material(k && mood.wear > 0.5 ? '#8a8f96' : '#ecebe4', { roughness: 1 });
        const sx = tx + k * 0.13;
        u(s.box([0.08, 0.018, ud * 0.6], [sx, ty + 0.009, tz + 0.02], sock));
        const leg = u(s.box([0.08, 0.2, 0.018], [sx, ty - 0.09, front + 0.026], sock)); leg.rotation.z = (random() - 0.5) * 0.2;
        u(s.box([0.082, 0.03, 0.02], [sx, ty - 0.03, front + 0.027], s.material(k ? '#c22a2a' : '#2a55c2')));
      }
    } else if (a.resting === 'swimsuit') {
      const lycra = s.material(new THREE.Color().setHSL(random(), 0.75, 0.5), { roughness: 0.5 });
      u(s.box([0.3, 0.02, ud * 0.7], [tx, ty + 0.01, tz], lycra));
      u(s.box([0.3, 0.16, 0.02], [tx, ty - 0.07, front + 0.027], lycra));
      for (const k of [-1, 1]) u(s.box([0.11, 0.1, 0.02], [tx + k * 0.095, ty - 0.19, front + 0.027], lycra));
      u(s.box([0.3, 0.02, 0.022], [tx, ty - 0.005, front + 0.028], trim));
      for (let i = 0; i < 3; i++) u(s.ball([0.006, 0.012, 0.006], [tx + (random() - 0.5) * 0.26, ty - 0.27 - random() * 0.08, front + 0.03], s.material('#7fc4e8', { roughness: 0.1 }), 8));
    } else if (a.resting === 'bag') {
      const paper = s.material('#b98d55', { roughness: 1, flatShading: true });
      const geo = new THREE.BoxGeometry(0.17, 0.22, 0.11, 3, 4, 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) / 0.22 + 0.5); pos.setX(i, pos.getX(i) * (1 - k * 0.35) + (random() - 0.5) * 0.012); pos.setZ(i, pos.getZ(i) * (1 - k * 0.5) + (random() - 0.5) * 0.012); }
      geo.computeVertexNormals();
      const bag = u(s.mesh(geo, paper, [tx, ty + 0.11, tz])); bag.rotation.y = random() - 0.5;
      u(s.box([0.13, 0.03, 0.03], [tx, ty + 0.225, tz], paper));
      u(s.cylinder(0.03, 0.03, 0.002, [tx + 0.02, ty + 0.06, tz + 0.052], s.material('#7a5a30'), 10)).rotation.x = Math.PI / 2;
    } else if (a.resting === 'keys') {
      const ring = u(s.ring(0.022, 0.003, [tx, ty + 0.004, tz], chrome)); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const key = u(s.box([0.012, 0.003, 0.06], [tx + Math.sin(i * 1.1 + 0.4) * 0.045, ty + 0.004, tz + Math.cos(i * 1.1 + 0.4) * 0.045], s.material('#c9a24a', { metalness: 0.8, roughness: 0.3 }))); key.rotation.y = i * 1.1 + 0.4; }
      const fob = u(s.box([0.04, 0.012, 0.06], [tx - 0.06, ty + 0.006, tz - 0.01], dark)); fob.rotation.y = 0.8;
      for (let i = 0; i < 5; i++) u(s.cylinder(0.011, 0.011, 0.002, [tx + 0.1 + random() * 0.1, ty + 0.002 + i * 0.0005, tz + (random() - 0.5) * 0.08], i % 2 ? chrome : s.material('#b87333', { metalness: 0.7 }), 12));
    }

    // Drip stain and puddle.
    const stain = new THREE.MeshStandardMaterial({ color: '#6b5a3a', transparent: true, opacity: mix(0.25, 0.75, mood.wear), roughness: 1 });
    const dripX = (random() - 0.5) * uw * 0.6;
    if (box) for (let i = 0; i < 3; i++) { const h = 0.2 + random() * 0.5; s.box([0.02 + random() * 0.03, h, 0.004], [dripX + i * 0.05, sillY - h / 2, 0.004], stain); }
    else s.box([0.3, 0.004, 0.2], [dripX, 0.004, ud + 0.1], stain);
    if (a.puddle) {
      const water = s.material('#5f7f8f', { roughness: 0.05, metalness: 0.3 });
      const pz = box ? 0.3 : ud + 0.16;
      for (let i = 0; i < 3; i++) s.cylinder(0.07 + random() * 0.1, 0.07 + random() * 0.1, 0.004, [dripX + (random() - 0.5) * 0.2, 0.004, pz + (random() - 0.5) * 0.12], water, 18).scale.z = 0.7;
    }
    // Carpet strip so the puddle and stain have a floor.
    s.box([wallW, 0.02, 0.62], [0, -0.01, 0.31], s.material(mood.warmth > 0.5 ? '#8a4f2c' : '#3f6a66', { roughness: 1 }));
    if (a.setting === 'rattling') { const screw = s.cylinder(0.006, 0.003, 0.03, [uw / 2 - 0.1, 0.008, ud + 0.2], chrome, 8); screw.rotation.z = 1.5; }

    const shake = a.setting === 'rattling' ? mix(0.004, 0.012, mood.energy) : a.setting === 'off' ? 0 : 0.001;
    if (a.setting === 'rattling') unit.rotation.z = 0.02;
    return s.finish({
      update: (_dt, time) => {
        pose(time);
        if (shake) { unit.rotation.z = (a.setting === 'rattling' ? 0.02 : 0) + Math.sin(time * 61) * shake; unit.position.x = Math.sin(time * 47) * shake * 0.3; }
      },
    });
  },
});

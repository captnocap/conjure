import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    form: choice('What kind of vent is it?', {
      mound: 'A cone of crusted rock with a dark throat at the top, a little volcano.',
      mudpot: 'A wide shallow crater of grey boiling mud, plopping with fat bubbles.',
      crack: 'A jagged fissure across flat ground, steaming along its whole length.',
      piped: 'A tamed vent: a stone curb, a wooden steaming box set over it and a bamboo chimney.',
    }),
    vigour: score('How hard is it venting?', ['Barely breathing, a wisp', 'A lazy drifting plume', 'A steady tall column', 'Roaring, a tower of steam']),
    staining: choice('What colour have the minerals stained it?', {
      sulphur: 'Bright sulphur yellow, crystals crusting the rim.',
      rust: 'Blood-red and rust orange iron.',
      white: 'Chalk white and pale grey clay.',
      copper: 'Turquoise and copper green.',
    }),
    eggs: choice('Is anything cooking in the runoff pool?', {
      none: 'No, the pool is empty.',
      white: 'A bamboo basket of white eggs lowered in on a pole.',
      black: 'A wire basket of eggs boiled black by the minerals.',
      corn: 'A basket of corn cobs and sweet potatoes.',
    }),
    fence: choice('Is it fenced off?', {
      open: 'No: you could walk straight up to it.',
      rope: 'Short posts and a sagging rope.',
      rail: 'A sturdy wooden rail fence.',
      chain: 'Yellow and black striped posts with a chain.',
    }),
    sign: choice('What does the sign beside it say, if there is one?', {
      none: 'There is no sign.',
      danger: 'DANGER',
      hot: 'HOT 98°C',
      out: 'KEEP OUT',
      eggs: 'EGGS 500',
    }),
    left: choice('What has someone left here?', {
      nothing: 'Nothing.',
      coins: 'Coins tossed toward the vent, some turned black.',
      shells: 'Broken eggshells and a pair of tongs: somebody ate right here.',
      jizo: 'A small stone guardian figure in a red bib and cap.',
      kettle: 'An iron kettle set on a rock at the edge to boil.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    const stainTone = new THREE.Color({ sulphur: '#e6cb2c', rust: '#b84a26', white: '#e9e5d9', copper: '#4fb09f' }[a.staining]);
    const stainPale = stainTone.clone().lerp(new THREE.Color('#fff6d8'), 0.45);
    const rockTone = new THREE.Color('#7c746a').lerp(new THREE.Color('#5b5650'), mood.wear * 0.5);
    const rock = new THREE.MeshStandardMaterial({ color: rockTone, roughness: 1, flatShading: true });
    const crust = new THREE.MeshStandardMaterial({ color: stainTone, roughness: 0.9 });
    const crustPale = new THREE.MeshStandardMaterial({ color: stainPale, roughness: 0.9 });
    const throat = new THREE.MeshStandardMaterial({ color: '#1d1a17', roughness: 1 });
    const poolTone = { sulphur: '#b9d6b0', rust: '#b5694a', white: '#bfe0e6', copper: '#5fc8c0' }[a.staining];
    const water = new THREE.MeshStandardMaterial({ color: poolTone, roughness: 0.12, emissive: poolTone, emissiveIntensity: 0.2 });
    const wood = s.material('#8a6a48', { roughness: 0.85 });
    const k1 = r(0, 6), k2 = r(0, 6), k3 = r(0, 6);

    /** A hill of rock with mineral colour bleeding out from its middle. */
    const hill = (radius: number, height: number, crater: number, depth: number, at: P3 = [0, 0, 0]) => {
      const profile: [number, number][] = [];
      for (let i = 0; i <= 8; i++) { const u = 1 - i / 8, x = crater + (radius - crater) * u; profile.push([x, height * (1 - u) ** 1.35]); }
      profile.push([crater * 0.72, height - depth * 0.5], [crater * 0.4, height - depth], [0, height - depth]);
      const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 34).toNonIndexed();
      const pos = g.attributes.position, colours = new Float32Array(pos.count * 3), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), t = Math.atan2(z, x), d = Math.hypot(x, z);
        const out = Math.min(1, Math.max(0, (d - crater) / (radius - crater)));
        const f = 1 + out * (0.14 * Math.sin(t * 3 + k1) + 0.09 * Math.sin(t * 7 + k2));
        pos.setXYZ(i, x * f, y * (1 + 0.16 * Math.sin(t * 5 + k3) * out) + (out > 0.05 && out < 0.95 ? 0.03 * Math.sin(t * 11 + d * 14 + k1) : 0), z * f);
        const w = Math.min(1, Math.max(0, 1.15 - out * 1.5 + 0.3 * Math.sin(t * 4 + k2 + d * 5)));
        if (d < crater * 0.75) c.set('#2a2420'); else c.copy(rockTone).lerp(w > 0.75 ? stainPale : stainTone, Math.min(1, w * 1.2));
        colours.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      g.computeVertexNormals();
      return s.mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), at);
    };
    const boulder = (size: P3, at: P3) => { const m = s.mesh(new THREE.IcosahedronGeometry(1, 1), rock, at); m.scale.set(...size); m.rotation.set(r(0, 3), r(0, 3), r(0, 3)); return m; };
    const crystals = (at: P3, spread: number, count: number) => {
      const pts = Array.from({ length: count }, () => { const t = r(0, 6.3), d = spread * r(0.7, 1.15); return { at: [at[0] + Math.cos(t) * d, at[1] - 0.015, at[2] + Math.sin(t) * d] as P3, size: r(0.5, 1.2) }; });
      s.scatter(new THREE.ConeGeometry(0.03, 0.09, 5).translate(0, 0.045, 0), a.staining === 'white' || a.staining === 'sulphur' ? crustPale : crust, pts);
    };

    // The vent itself. Each form lists where steam leaves the ground.
    const vents: { at: THREE.Vector3; r: number }[] = [];
    let reach = 0.8; // how far the ground it owns extends
    if (a.form === 'mound') {
      const H = r(0.42, 0.58);
      hill(0.78, H, 0.13, 0.2);
      vents.push({ at: new THREE.Vector3(0, H - 0.06, 0), r: 0.11 });
      crystals([0, H, 0], 0.16, 16);
      for (let i = 0; i < 2; i++) { const t = r(2.5, 5.5), d = r(0.3, 0.5); const h = H * (1 - (d / 0.78)) ** 1.35 * 0.9; s.ball([0.03, 0.02, 0.03], [Math.cos(t) * d, h + 0.02, Math.sin(t) * d], throat, 8); vents.push({ at: new THREE.Vector3(Math.cos(t) * d, h, Math.sin(t) * d), r: 0.03 }); }
    } else if (a.form === 'mudpot') {
      hill(0.85, 0.17, 0.46, 0.09);
      const mudTone = new THREE.Color('#9b968b').lerp(stainTone, 0.25);
      const mud = new THREE.MeshStandardMaterial({ color: mudTone, roughness: 0.35 });
      s.cylinder(0.44, 0.44, 0.02, [0, 0.11, 0], mud, 30);
      for (let i = 0, n = 6 + Math.round(a.vigour * 8); i < n; i++) {
        const t = r(0, 6.3), d = Math.sqrt(random()) * 0.36, size = r(0.03, 0.09);
        if (i % 3) s.mesh(new THREE.SphereGeometry(size, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mud, [Math.cos(t) * d, 0.118, Math.sin(t) * d]);
        else { const ringlet = s.ring(size, 0.008, [Math.cos(t) * d, 0.122, Math.sin(t) * d], mud); ringlet.rotation.x = Math.PI / 2; }
      }
      for (let i = 0; i < 3; i++) { const t = (i / 3) * 6.3 + k1; vents.push({ at: new THREE.Vector3(Math.cos(t) * 0.18, 0.12, Math.sin(t) * 0.18), r: 0.13 }); }
      reach = 0.88;
    } else if (a.form === 'crack') {
      hill(0.95, 0.09, 0.02, 0.0);
      let x = -0.62, z = r(-0.05, 0.05);
      for (let i = 0; i < 9; i++) {
        const nx = x + r(0.1, 0.17), nz = z + r(-0.11, 0.11) * (i % 2 ? 1 : -1);
        const mid: P3 = [(x + nx) / 2, 0.085, (z + nz) / 2], len = Math.hypot(nx - x, nz - z), wide = r(0.035, 0.075) * (1 - Math.abs(i - 4) / 7);
        const seg = s.box([len + 0.02, 0.05, wide], mid, throat);
        seg.rotation.y = -Math.atan2(nz - z, nx - x);
        for (const side of [-1, 1]) s.ball([len * 0.6, 0.02, 0.035], [mid[0], 0.1, mid[2] + side * (wide / 2 + 0.035)], i % 2 ? crust : crustPale, 8).rotation.y = seg.rotation.y;
        if (i % 2 === 0) vents.push({ at: new THREE.Vector3(mid[0], 0.09, mid[2]), r: 0.06 });
        x = nx; z = nz;
      }
      reach = 0.95;
    } else {
      hill(0.8, 0.1, 0.02, 0.0);
      const curb = s.material('#8d8a84', { roughness: 0.95 });
      for (const side of [-1, 1]) { s.box([0.74, 0.2, 0.14], [0, 0.18, side * 0.3], curb); s.box([0.14, 0.2, 0.46], [side * 0.3, 0.18, 0], curb); }
      // The steaming box: slatted cedar with a lifting lid, and a bamboo chimney beside it.
      s.box([0.56, 0.26, 0.56], [0, 0.41, 0], wood);
      for (let i = 0; i < 5; i++) s.box([0.58, 0.02, 0.012], [0, 0.32 + i * 0.045, 0.282], s.material('#5b432c'));
      const lid = s.box([0.62, 0.035, 0.62], [0, 0.56, 0], s.material('#a78558'));
      lid.rotation.z = a.vigour > 0.6 ? 0.1 : 0;
      for (const x of [-0.18, 0.18]) s.box([0.05, 0.035, 0.5], [x, 0.59, 0], wood);
      const cane = s.material('#b9a45c', { roughness: 0.5 });
      s.cylinder(0.045, 0.045, 0.95, [-0.36, 0.57, -0.3], cane, 12);
      for (let i = 0; i < 4; i++) s.ring(0.047, 0.006, [-0.36, 0.2 + i * 0.24, -0.3], s.material('#7c6a35')).rotation.x = Math.PI / 2;
      vents.push({ at: new THREE.Vector3(-0.36, 1.04, -0.3), r: 0.05 }, { at: new THREE.Vector3(0.2, 0.58, 0.2), r: 0.05 });
      crystals([0.33, 0.1, 0.36], 0.08, 8);
      reach = 0.82;
    }
    // Crusted rocks and deposits around it.
    for (let i = 0, n = Math.round(mix(4, 9, mood.density)); i < n; i++) {
      const t = r(0, 6.3), d = reach * r(0.82, 1.08), size = r(0.07, 0.17);
      if (Math.abs(t - 0.7) < 0.5) continue; // keep the pool side clear
      boulder([size, size * r(0.6, 0.9), size * r(0.7, 1)], [Math.cos(t) * d, size * 0.3, Math.sin(t) * d]);
      s.ball([size * 0.7, size * 0.25, size * 0.6], [Math.cos(t) * d, size * 0.78, Math.sin(t) * d], i % 2 ? crust : crustPale, 8);
    }

    // The runoff: a trickle to a little pool at the front, where the cooking happens.
    const px = reach * 0.78, pz = reach * 0.66, PR = 0.27;
    s.cylinder(PR, PR * 0.9, 0.06, [px, 0.03, pz], water, 26).castShadow = false;
    for (let i = 0; i < 11; i++) {
      const t = (i / 11) * Math.PI * 2 + r(-0.1, 0.1), size = r(0.05, 0.085);
      boulder([size, size * 0.7, size], [px + Math.cos(t) * (PR + 0.03), 0.04, pz + Math.sin(t) * (PR + 0.03)]);
      if (i % 2) s.ball([size * 0.8, 0.015, size * 0.7], [px + Math.cos(t) * (PR + 0.02), 0.04 + size * 0.68, pz + Math.sin(t) * (PR + 0.02)], crustPale, 8);
    }
    const trickle = new THREE.MeshStandardMaterial({ color: poolTone, roughness: 0.1, emissive: poolTone, emissiveIntensity: 0.25 });
    const from = vents[0].at;
    s.tube([[from.x * 0.5 + px * 0.18, Math.min(from.y, 0.5) * 0.75, from.z * 0.5 + pz * 0.18], [px * 0.5, a.form === 'mound' ? 0.2 : 0.1, pz * 0.5], [px * 0.78, 0.075, pz * 0.78], [px * 0.95, 0.06, pz * 0.95]], 0.016, trickle).castShadow = false;

    if (a.eggs !== 'none') {
      const wire = a.eggs === 'black';
      const weave = new THREE.MeshStandardMaterial({ color: wire ? '#55585c' : '#b8985a', roughness: wire ? 0.4 : 0.8, metalness: wire ? 0.7 : 0, side: THREE.DoubleSide });
      const bx = px - 0.02, bz = pz + 0.02, by = 0.05;
      s.mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.14, 0.09], [0.146, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 18), weave, [bx, by, bz]);
      s.ring(0.146, 0.008, [bx, by + 0.1, bz], weave).rotation.x = Math.PI / 2;
      const arc = s.ring(0.146, 0.006, [bx, by + 0.1, bz], weave, Math.PI);
      arc.rotation.y = 0.8;
      const pole = s.rod([bx, by + 0.245, bz], [bx + 0.5, by + 0.5, bz + 0.34], 0.011, wood);
      pole.castShadow = true;
      s.rod([bx, by + 0.245, bz], [bx, by + 0.3, bz], 0.008, wood);
      if (a.eggs === 'corn') {
        const cob = new THREE.MeshStandardMaterial({ color: '#f0c33a', roughness: 0.6 }), husk = new THREE.MeshStandardMaterial({ color: '#8fae4e', roughness: 0.8 }), potato = new THREE.MeshStandardMaterial({ color: '#8b3f63', roughness: 0.8 });
        for (let i = 0; i < 3; i++) { const c = s.mesh(new THREE.CapsuleGeometry(0.026, 0.13, 4, 10), cob, [bx - 0.05 + i * 0.05, by + 0.1, bz + r(-0.03, 0.03)]); c.rotation.set(Math.PI / 2 + r(-0.3, 0.3), 0, r(-0.4, 0.4)); s.ball([0.022, 0.03, 0.022], [c.position.x, by + 0.11, c.position.z - 0.09], husk, 6); }
        for (let i = 0; i < 2; i++) s.ball([0.05, 0.035, 0.035], [bx + r(-0.05, 0.05), by + 0.14, bz + 0.03 + i * 0.05], potato, 10).rotation.y = r(0, 3);
      } else {
        const shell = new THREE.MeshStandardMaterial({ color: a.eggs === 'black' ? '#2b2826' : '#f5efe3', roughness: a.eggs === 'black' ? 0.35 : 0.6 });
        for (let i = 0, n = 6 + Math.round(mood.density * 4); i < n; i++) {
          const t = r(0, 6.3), d = Math.sqrt(random()) * 0.085, top = i > 5;
          s.ball([0.03, 0.039, 0.03], [bx + Math.cos(t) * d, by + (top ? 0.115 : 0.08), bz + Math.sin(t) * d], shell, 10).rotation.set(r(-1, 1), 0, r(-1, 1));
        }
      }
    }

    // Fence around the front, sign at the corner.
    const FR = reach + 0.5;
    if (a.fence !== 'open') {
      const posts: P3[] = [];
      const count = a.fence === 'rail' ? 5 : 6;
      for (let i = 0; i < count; i++) { const t = mix(-0.55, 2.15, i / (count - 1)); posts.push([Math.cos(t) * FR, 0, Math.sin(t) * FR]); }
      const postWood = a.fence === 'chain' ? new THREE.MeshStandardMaterial({ color: '#f2c51c', roughness: 0.5 }) : wood;
      const PH = a.fence === 'rail' ? 0.62 : 0.5;
      posts.forEach((p, i) => {
        const lean = mood.wear > 0.6 ? r(-0.12, 0.12) : 0;
        const post = a.fence === 'rail' ? s.box([0.07, PH, 0.07], [p[0], PH / 2, p[2]], postWood) : s.cylinder(0.03, 0.035, PH, [p[0], PH / 2, p[2]], postWood, 10);
        post.rotation.z = lean;
        if (a.fence === 'chain') for (const y of [0.14, 0.3]) s.cylinder(0.032, 0.034, 0.06, [p[0], y, p[2]], throat, 10);
        if (a.fence === 'rope') s.ball([0.038, 0.03, 0.038], [p[0], PH, p[2]], wood, 8);
        const q = posts[i + 1];
        if (!q) return;
        if (a.fence === 'rail') for (const y of [0.28, 0.52]) s.rod([p[0], y, p[2]], [q[0], y, q[2]], 0.022, wood);
        else {
          const sag = a.fence === 'chain' ? 0.1 : 0.07 + mood.wear * 0.08;
          const line = s.tube([[p[0], PH - 0.05, p[2]], [(p[0] + q[0]) / 2, PH - 0.05 - sag, (p[2] + q[2]) / 2], [q[0], PH - 0.05, q[2]]], a.fence === 'chain' ? 0.009 : 0.012, a.fence === 'chain' ? new THREE.MeshStandardMaterial({ color: '#3c3f44', metalness: 0.7, roughness: 0.4 }) : new THREE.MeshStandardMaterial({ color: '#d9c79a', roughness: 1 }));
          line.castShadow = true;
        }
      });
    }
    if (a.sign !== 'none') {
      const t = 2.5, d = FR + 0.02, x = Math.cos(t) * d, z = Math.sin(t) * d + 0.06;
      s.box([0.05, 0.95, 0.05], [x, 0.475, z - 0.03], wood);
      const text = { danger: 'DANGER', hot: 'HOT 98°C', out: 'KEEP OUT', eggs: 'EGGS 500' }[a.sign];
      const warn = a.sign !== 'eggs';
      s.box([0.6, 0.3, 0.03], [x, 0.78, z], warn ? s.material('#f1ece0') : wood);
      const board = s.label(text, 0.54, 0.24, [x, 0.78, z + 0.017], warn ? '#c3261f' : '#2a2018', warn ? '#f6f1e4' : '#e8d9b0');
      board.castShadow = false;
      if (mood.wear > 0.65) { board.rotation.z = r(-0.12, 0.12); }
    }

    // What somebody left.
    const lx = -reach * 0.72, lz = reach * 0.78;
    if (a.left === 'coins') {
      const brass = new THREE.MeshStandardMaterial({ color: '#d2a53c', metalness: 0.8, roughness: 0.3, emissive: '#6b4e10', emissiveIntensity: 0.4 });
      const black = new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.5, roughness: 0.5 });
      for (let i = 0; i < 12; i++) { const t = r(0.6, 2.8), d = reach * r(0.45, 0.95); s.cylinder(0.02, 0.02, 0.005, [Math.cos(t) * d, a.form === 'mound' ? 0.5 * (1 - d / 0.78) ** 1.35 + 0.035 : 0.1, Math.sin(t) * d], i % 3 ? brass : black, 10).rotation.set(r(-0.4, 0.4), 0, r(-0.4, 0.4)); }
    } else if (a.left === 'shells') {
      const shell = new THREE.MeshStandardMaterial({ color: '#f5efe3', roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) { const m = s.mesh(new THREE.SphereGeometry(0.03, 8, 5, 0, Math.PI * 2, 0, Math.PI * r(0.3, 0.5)), shell, [lx + r(-0.14, 0.14), 0.035, lz + r(-0.1, 0.1)]); m.rotation.set(r(0, 3), r(0, 3), r(0, 3)); }
      const steel = new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.8, roughness: 0.3 });
      s.rod([lx + 0.2, 0.02, lz - 0.05], [lx + 0.02, 0.02, lz + 0.14], 0.008, steel);
      s.rod([lx + 0.2, 0.02, lz - 0.05], [lx + 0.06, 0.02, lz + 0.17], 0.008, steel);
    } else if (a.left === 'jizo') {
      const grey = s.material('#9a9a95', { roughness: 0.95 });
      s.lathe([[0, 0], [0.09, 0], [0.1, 0.03], [0.075, 0.2], [0.05, 0.27], [0, 0.28]], grey, [lx, 0, lz]);
      s.ball([0.065, 0.07, 0.065], [lx, 0.33, lz], grey, 14);
      const red = new THREE.MeshStandardMaterial({ color: '#c8262b', roughness: 0.9 });
      s.ball([0.075, 0.06, 0.03], [lx, 0.22, lz + 0.06], red, 10);
      s.mesh(new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), red, [lx, 0.345, lz]);
      for (const side of [-1, 1]) s.ball([0.008, 0.004, 0.004], [lx + side * 0.025, 0.33, lz + 0.062], throat, 6);
      s.cylinder(0.035, 0.03, 0.03, [lx + 0.16, 0.015, lz + 0.05], s.material('#e8e4d8'), 10);
    } else if (a.left === 'kettle') {
      boulder([0.16, 0.08, 0.14], [lx + 0.3, 0.05, lz - 0.28]).rotation.set(0, r(0, 3), 0);
      const iron = new THREE.MeshStandardMaterial({ color: '#2c2d30', metalness: 0.5, roughness: 0.6 });
      const kx = lx + 0.3, ky = 0.13, kz = lz - 0.28;
      s.ball([0.1, 0.075, 0.1], [kx, ky + 0.07, kz], iron, 14);
      s.cylinder(0.045, 0.05, 0.02, [kx, ky + 0.145, kz], iron, 12);
      s.ball([0.014, 0.014, 0.014], [kx, ky + 0.165, kz], iron, 8);
      s.rod([kx + 0.08, ky + 0.07, kz], [kx + 0.16, ky + 0.13, kz], 0.016, iron, 0.01);
      const handle = s.ring(0.085, 0.007, [kx, ky + 0.13, kz], iron, Math.PI);
      handle.rotation.y = Math.PI / 2;
      vents.push({ at: new THREE.Vector3(kx + 0.16, ky + 0.13, kz), r: 0.015 });
    }

    // Steam: opaque rolling puffs so the column prints as a shape.
    const main = a.form === 'mudpot' ? 3 : a.form === 'crack' ? vents.length : 1;
    const plumeH = mix(0.5, 2.6, a.vigour) * (a.form === 'mudpot' || a.form === 'crack' ? 0.7 : 1);
    const spec: { vent: number; phase: number; side: number; size: number; tall: number }[] = [];
    vents.forEach((v, index) => {
      const big = index < main, n = big ? Math.round(mix(5, 20, a.vigour) / Math.sqrt(main)) : 4;
      for (let i = 0; i < n; i++) spec.push({ vent: index, phase: (i + random() * 0.6) / n, side: r(0, 6.3), size: r(0.8, 1.25), tall: big ? plumeH : 0.3 });
    });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const puffs = new THREE.InstancedMesh(puffGeometry, new THREE.MeshStandardMaterial({ color: '#f0f2f1', roughness: 1, emissive: '#8f9aa3', emissiveIntensity: 0.25 }), spec.length);
    puffs.castShadow = false;
    s.root.add(puffs);
    const drift = new THREE.Vector3(r(-1, 1), 0, r(-1, 0.2)).normalize().multiplyScalar(mix(0.05, 0.5, mood.energy));
    const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
    const pose = (time: number) => {
      spec.forEach((p, i) => {
        const v = vents[p.vent], t = (p.phase + time) % 1;
        const swell = (v.r * 1.05 + t * p.tall * mix(0.1, 0.17, a.vigour)) * p.size * Math.min(1, (1 - t) * 2.4 + 0.2);
        const wob = (v.r * 0.5 + t * p.tall * 0.06);
        p3.copy(v.at).addScaledVector(drift, t * t * p.tall * 0.5).add(sc.set(Math.cos(p.side + t * 3) * wob, t * p.tall + v.r * 0.3, Math.sin(p.side + t * 3) * wob));
        puffs.setMatrixAt(i, m4.compose(p3, quat, sc.setScalar(Math.max(swell, 1e-3))));
      });
      puffs.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    const speed = mix(0.03, 0.14, mood.energy) * mix(0.6, 1.6, a.vigour);
    // Centre on the ground it owns, not on wherever the plume has drifted.
    puffs.visible = false;
    const thing = s.finish({ footprint: FR, update: (_dt, time) => pose(time * speed) });
    puffs.visible = true;
    return thing;
  },
});

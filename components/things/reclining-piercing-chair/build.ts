import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    upholstery: choice('What is the chair upholstered in?', {
      black: 'Plain black vinyl, the standard studio chair.',
      oxblood: 'Deep oxblood red, button-tufted like a biker parlour or old barber chair.',
      clinical: 'Wipe-clean white with pale mint piping, dental and sterile.',
      teal: 'Sixties teal with cream side panels and plenty of chrome.',
      leopard: 'Loud leopard-print vinyl, rockabilly and proud of it.',
      taped: 'Cracked brown vinyl patched with strips of silver duct tape, a back-room hand-me-down.',
    }),
    position: choice('How is the chair set?', {
      upright: 'Bolt upright with the leg rest hanging down, set for a nose or ear.',
      reclined: 'Leaned halfway back with the legs raised, set for a navel or collarbone.',
      flat: 'Cranked completely flat like a table, set for a long tattoo or someone who fainted.',
    }),
    trace: choice('What trace did the last client leave?', {
      fresh: 'Nothing. A fresh sheet of paper pulled down tight, waiting.',
      crumpled: 'The paper sheet torn and crumpled, a balled-up wad dropped on the floor.',
      earring: 'A single gold hoop earring dropped on the seat.',
      stressball: 'A bright yellow stress ball, squeezed out of shape, left on the seat.',
      lollipop: 'A red lollipop given for bravery, abandoned half eaten on the paper.',
      jacket: 'A denim jacket slung over the headrest, forgotten in the rush to leave.',
    }),
    tray: choice('What is on the armrest tray?', {
      empty: 'Nothing, wiped clean.',
      tools: 'A steel kidney dish with clamps and a needle laid out in a row.',
      gloves: 'A box of blue nitrile gloves and a spray bottle.',
      mirror: 'A hand mirror lying face up, for the big reveal.',
    }),
    base: choice('What does it stand on?', {
      pedestal: 'A round chrome hydraulic pedestal with a foot pump.',
      cabinet: 'A boxy enamelled motor cabinet, a retired dentist chair.',
      folding: 'Crossed tubular folding legs, portable and slightly wobbly.',
    }),
    stool: noul("Is the piercer's rolling stool pulled up beside it?"),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = {
      black: ['#1d1e22', '#2c2d33'], oxblood: ['#6e1420', '#3d0a12'], clinical: ['#eef0ec', '#9fd6c2'],
      teal: ['#1f8d8a', '#efe3c4'], leopard: ['#c98a3a', '#1a1410'], taped: ['#6b4a32', '#4a3120'],
    }[a.upholstery];
    let vinylMap: THREE.Texture | null = null;
    if (a.upholstery === 'leopard') {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      g.fillStyle = '#cf9440'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) {
        const x = random() * 256, y = random() * 256, r = 7 + random() * 9;
        g.fillStyle = '#8a5318'; g.beginPath(); g.ellipse(x, y, r * 0.7, r * 0.55, random() * 3, 0, 7); g.fill();
        g.strokeStyle = '#1a1410'; g.lineWidth = 4.5; g.beginPath(); g.ellipse(x, y, r, r * 0.8, random() * 3, random() * 2, 3.6 + random() * 2); g.stroke();
      }
      vinylMap = new THREE.CanvasTexture(c); vinylMap.colorSpace = THREE.SRGBColorSpace;
      vinylMap.wrapS = vinylMap.wrapT = THREE.RepeatWrapping;
    }
    const vinyl = s.material(vinylMap ? '#ffffff' : pal[0], { roughness: mix(0.32, 0.7, mood.wear), map: vinylMap });
    const trim = s.material(pal[1], { roughness: 0.5 });
    const chrome = s.material('#d5dade', { metalness: 0.9, roughness: mix(0.18, 0.5, mood.wear) });
    const dark = s.material('#24262a', { roughness: 0.7 });
    const paper = s.material(new THREE.Color('#fbfaf4').lerp(new THREE.Color('#d9cfae'), mood.wear * 0.6), { roughness: 0.95, side: THREE.DoubleSide });
    const tape = s.material('#b9bdc0', { metalness: 0.5, roughness: 0.45 });

    const pad = (g: THREE.Object3D, size: [number, number, number], at: [number, number, number], m: THREE.Material = vinyl) => {
      const mesh = s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(size[0], size[1], size[2]) * 0.42), m, at);
      g.add(mesh);
      return mesh;
    };
    const into = <T extends THREE.Object3D>(g: THREE.Object3D, o: T) => { g.add(o); return o; };
    const W = 0.6, H = 0.62, T = 0.11;
    const backAngle = { upright: 1.28, reclined: 0.62, flat: 0.03 }[a.position];
    const legAngle = { upright: 1.15, reclined: 0.3, flat: 0 }[a.position];

    // Base.
    if (a.base === 'pedestal') {
      s.lathe([[0, 0], [0.34, 0], [0.34, 0.03], [0.22, 0.07], [0.1, 0.1], [0.085, 0.14], [0, 0.14]], chrome);
      s.cylinder(0.055, 0.055, 0.36, [0, 0.3, 0], chrome);
      for (let i = 0; i < 5; i++) s.cylinder(0.085 - (i % 2) * 0.012, 0.085 - (i % 2) * 0.012, 0.035, [0, 0.16 + i * 0.035, 0], dark);
      s.rod([0.1, 0.1, -0.05], [0.42, 0.06, -0.12], 0.014, chrome);
      s.box([0.1, 0.02, 0.06], [0.44, 0.06, -0.125], dark);
    } else if (a.base === 'cabinet') {
      const enamel = s.material(a.upholstery === 'clinical' ? '#dfe5e2' : '#cfc7ae', { roughness: 0.4 });
      s.mesh(new RoundedBoxGeometry(0.5, 0.06, 0.7, 2, 0.02), dark, [0, 0.03, 0]);
      s.mesh(new RoundedBoxGeometry(0.36, 0.4, 0.5, 3, 0.05), enamel, [0, 0.26, -0.02]);
      for (let i = 0; i < 5; i++) s.box([0.2, 0.012, 0.004], [0, 0.16 + i * 0.035, 0.232], dark);
      s.box([0.14, 0.03, 0.09], [0.2, 0.045, 0.3], chrome);
    } else {
      for (const x of [-1, 1]) {
        s.rod([x * 0.29, 0, -0.34], [x * 0.29, H - T / 2, 0.24], 0.016, chrome);
        s.rod([x * 0.29, 0, 0.34], [x * 0.29, H - T / 2, -0.24], 0.016, chrome);
        for (const z of [-0.34, 0.34]) s.ball([0.022, 0.014, 0.022], [x * 0.29, 0.012, z], dark, 10);
      }
      for (const z of [-0.34, 0.34]) s.rod([-0.29, 0.02, z], [0.29, 0.02, z], 0.013, chrome);
      s.rod([-0.29, (H - T / 2) / 2, 0], [0.29, (H - T / 2) / 2, 0], 0.012, dark);
    }
    s.box([W * 0.82, 0.04, 0.5], [0, H - T / 2 - 0.02, 0], dark);

    // Seat, back and leg rest.
    const seat = new THREE.Group(); seat.position.set(0, H, 0); s.root.add(seat);
    pad(seat, [W, T, 0.56], [0, 0, 0]);
    const back = new THREE.Group(); back.position.set(0, H + 0.01, -0.27); back.rotation.x = backAngle; s.root.add(back);
    pad(back, [W * 0.96, T * 0.9, 0.78], [0, 0, -0.4]);
    for (const x of [-0.1, 0.1]) into(back, s.rod([x, -0.01, -0.76], [x, -0.01, -0.9], 0.011, chrome));
    pad(back, [0.3, 0.09, 0.2], [0, 0.005, -0.96]);
    const leg = new THREE.Group(); leg.position.set(0, H, 0.28); leg.rotation.x = legAngle; s.root.add(leg);
    pad(leg, [W * 0.92, T * 0.8, 0.56], [0, 0, 0.3]);
    pad(leg, [W * 0.7, 0.03, 0.16], [0, 0.05, 0.6], dark).rotation.x = -0.5;
    for (const x of [-1, 1]) {
      s.cylinder(0.035, 0.035, 0.05, [x * (W / 2 + 0.01), H - 0.01, -0.27], chrome, 16).rotation.z = Math.PI / 2;
      s.cylinder(0.03, 0.03, 0.05, [x * (W / 2 + 0.005), H - 0.01, 0.28], chrome, 16).rotation.z = Math.PI / 2;
    }
    // Side panels or piping in the trim colour.
    for (const x of [-1, 1]) {
      pad(seat, [0.015, T * 0.5, 0.5], [x * (W / 2 + 0.002), 0, 0], trim);
      pad(back, [0.015, T * 0.45, 0.7], [x * (W * 0.48 + 0.002), 0, -0.4], trim);
    }
    if (a.upholstery === 'oxblood' || a.upholstery === 'teal') {
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3 + (r % 2); c++)
        pts.push({ at: [(c - (2 + (r % 2)) / 2) * 0.15, T * 0.45 + 0.002, -0.12 - r * 0.14], size: 0.014 });
      into(back, s.scatter(new THREE.SphereGeometry(1, 8, 6), a.upholstery === 'teal' ? chrome : trim, pts));
    }
    if (a.upholstery === 'taped' || mood.wear > 0.7) {
      const n = a.upholstery === 'taped' ? 5 : 2;
      for (let i = 0; i < n; i++) {
        const g = [seat, back, leg][i % 3];
        const strip = into(g, s.box([0.05, 0.004, 0.2 + random() * 0.14], [(random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.06), T * 0.42, g === seat ? (random() - 0.5) * 0.2 : g === back ? -0.2 - random() * 0.4 : 0.15 + random() * 0.25], tape));
        strip.rotation.y = (random() - 0.5) * 1.2;
      }
    }

    // Paper sheet off a roll behind the headrest.
    const torn = a.trace === 'crumpled';
    const sheet = (g: THREE.Object3D, len: number, z: number, y: number, wrinkle: number) => {
      const geo = new THREE.PlaneGeometry(0.4, len, 8, 12);
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, (random() - 0.3) * wrinkle);
      geo.computeVertexNormals();
      const m = into(g, s.mesh(geo, paper, [0, y, z]));
      return m;
    };
    sheet(back, 0.98, -0.52, T * 0.45 + 0.004, 0.003);
    const seatSheet = sheet(seat, torn ? 0.42 : 0.56, torn ? -0.06 : 0, T / 2 + 0.004, torn ? 0.03 : 0.003);
    if (torn) { seatSheet.rotation.y = 0.22 + random() * 0.2; seatSheet.position.x = 0.05; }
    else sheet(leg, 0.52, 0.28, T * 0.4 + 0.004, 0.003);
    into(back, s.cylinder(0.05, 0.05, 0.42, [0, -0.085, -0.93], paper, 18)).rotation.z = Math.PI / 2;
    for (const x of [-0.22, 0.22]) into(back, s.rod([x, -0.02, -0.82], [x, -0.085, -0.93], 0.008, chrome));
    if (torn) {
      const wad = s.mesh(new THREE.IcosahedronGeometry(0.075, 1), paper, [0.42 + random() * 0.15, 0.06, 0.45 + random() * 0.2]);
      const p = wad.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.75 + random() * 0.5), p.getY(i) * (0.6 + random() * 0.5), p.getZ(i) * (0.75 + random() * 0.5));
      wad.geometry.computeVertexNormals();
      (wad.material as THREE.MeshStandardMaterial).flatShading = true;
    }

    // Armrests and the swing tray.
    for (const x of [-1, 1]) {
      const ax = x * (W / 2 + 0.07);
      s.rod([ax, H - 0.06, -0.12], [ax, H + 0.2, -0.12], 0.014, chrome);
      s.rod([x * W * 0.4, H - 0.06, -0.12], [ax, H - 0.06, -0.12], 0.014, chrome);
      pad(s.root, [0.085, 0.045, 0.4], [ax, H + 0.215, 0.0]);
    }
    const tx = W / 2 + 0.27, ty = H + 0.25;
    s.rod([W / 2 + 0.07, H + 0.2, 0.16], [tx, ty - 0.012, 0.16], 0.01, chrome);
    s.mesh(new RoundedBoxGeometry(0.3, 0.014, 0.24, 2, 0.006), chrome, [tx, ty, 0.16]);
    for (const [dx, dz, w, d] of [[0, 0.118, 0.3, 0.006], [0, -0.118, 0.3, 0.006], [0.148, 0, 0.006, 0.24]] as const) s.box([w, 0.02, d], [tx + dx, ty + 0.012, 0.16 + dz], chrome);
    if (a.tray === 'tools') {
      s.mesh(new RoundedBoxGeometry(0.2, 0.025, 0.11, 2, 0.012), s.material('#aeb6ba', { metalness: 0.8, roughness: 0.3 }), [tx - 0.02, ty + 0.02, 0.18]);
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) s.rod([tx - 0.1 + i * 0.035, ty + 0.038, 0.14], [tx - 0.09 + i * 0.035, ty + 0.038, 0.23], 0.004, chrome);
      s.cylinder(0.02, 0.02, 0.05, [tx + 0.1, ty + 0.032, 0.09], s.material('#f3f3ee'), 12);
    } else if (a.tray === 'gloves') {
      s.box([0.2, 0.07, 0.11], [tx - 0.03, ty + 0.042, 0.19], s.material('#2f6fd0'));
      s.box([0.1, 0.004, 0.05], [tx - 0.03, ty + 0.079, 0.19], s.material('#7fb4f5'));
      s.cylinder(0.025, 0.03, 0.11, [tx + 0.1, ty + 0.062, 0.1], s.material('#e8f1ee', { roughness: 0.3 }), 12);
      s.cylinder(0.012, 0.02, 0.04, [tx + 0.1, ty + 0.135, 0.1], s.material('#d43a3a'), 10);
    } else if (a.tray === 'mirror') {
      s.cylinder(0.075, 0.075, 0.012, [tx - 0.03, ty + 0.014, 0.17], s.material('#c9507a'), 24);
      s.cylinder(0.064, 0.064, 0.013, [tx - 0.03, ty + 0.016, 0.17], s.material('#dff1fb', { metalness: 0.95, roughness: 0.05, emissive: '#bfe2ff', emissiveIntensity: 0.35 }), 24);
      s.box([0.03, 0.012, 0.1], [tx + 0.07, ty + 0.014, 0.17], s.material('#c9507a')).rotation.y = Math.PI / 2;
    }

    // What the last client left.
    const top = T / 2 + 0.01;
    if (a.trace === 'earring') {
      const gold = s.material('#f2c230', { metalness: 0.9, roughness: 0.2, emissive: '#ffb300', emissiveIntensity: 0.55 });
      const hoop = into(seat, s.ring(0.045, 0.007, [0.06 + random() * 0.08, top + 0.006, 0.08 + random() * 0.1], gold));
      hoop.rotation.x = Math.PI / 2;
    } else if (a.trace === 'stressball') {
      const ball = into(seat, s.ball([0.06, 0.042, 0.055], [-0.1 + random() * 0.2, top + 0.04, 0.05 + random() * 0.1], s.material('#ffd21f', { emissive: '#ffb800', emissiveIntensity: 0.35, roughness: 0.6 })));
      ball.rotation.z = 0.3;
      for (const dx of [-0.018, 0.018]) into(seat, s.ball([0.007, 0.01, 0.004], [ball.position.x + dx, top + 0.055, ball.position.z + 0.05], dark, 8));
    } else if (a.trace === 'lollipop') {
      const lx = -0.08 + random() * 0.16, lz = 0.05 + random() * 0.12;
      into(seat, s.ball([0.035, 0.035, 0.035], [lx, top + 0.035, lz], s.material('#e8203a', { roughness: 0.15, emissive: '#b80020', emissiveIntensity: 0.4 })));
      into(seat, s.rod([lx, top + 0.03, lz], [lx + 0.13, top + 0.006, lz + 0.05], 0.005, s.material('#ffffff')));
    } else if (a.trace === 'jacket') {
      const denim = s.material('#3f6aa0', { roughness: 0.9, side: THREE.DoubleSide });
      const geo = new THREE.CylinderGeometry(0.2, 0.26, 0.5, 14, 6, true, 0, Math.PI);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + (random() - 0.5) * 0.03);
      geo.computeVertexNormals();
      const body = into(back, s.mesh(geo, denim, [0, -0.02, -0.96]));
      body.rotation.set(0, Math.PI / 2, Math.PI / 2); body.scale.set(0.6, 1.3, 1);
      for (const x of [-1, 1]) into(back, s.rod([x * 0.3, 0.02, -0.98], [x * (0.36 + random() * 0.05), -0.1, -0.5 - random() * 0.15], 0.05, denim, 0.04));
    }

    if (a.stool) {
      const sx = -(W / 2 + 0.5), sz = 0.25 + random() * 0.2;
      const turn = random() * Math.PI;
      for (let i = 0; i < 5; i++) {
        const an = turn + i * Math.PI * 2 / 5;
        s.rod([sx, 0.07, sz], [sx + Math.cos(an) * 0.24, 0.045, sz + Math.sin(an) * 0.24], 0.016, chrome);
        s.ball([0.025, 0.025, 0.025], [sx + Math.cos(an) * 0.24, 0.025, sz + Math.sin(an) * 0.24], dark, 10);
      }
      s.cylinder(0.022, 0.03, 0.4, [sx, 0.26, sz], chrome, 12);
      s.mesh(new RoundedBoxGeometry(0.36, 0.08, 0.36, 4, 0.036), vinyl, [sx, 0.5, sz]).rotation.y = turn;
    }
    return s.finish();
  },
});

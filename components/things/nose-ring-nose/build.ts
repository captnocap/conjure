import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { blend, bump, paint, relief, smax, smooth, stain } from './relief';

const SHAPES = {
  button: { root: 0.007, tip: 0.04, curve: 2, bw: 0.012, ty: -0.02, tr: 0.02, ax: 0.024, ay: -0.028, ah: 0.025, ar: 0.013 },
  strong: { root: 0.017, tip: 0.062, curve: 1.1, bw: 0.012, ty: -0.034, tr: 0.019, ax: 0.027, ay: -0.037, ah: 0.03, ar: 0.0135 },
  broad: { root: 0.009, tip: 0.045, curve: 1.5, bw: 0.018, ty: -0.03, tr: 0.025, ax: 0.037, ay: -0.034, ah: 0.035, ar: 0.018 },
  crooked: { root: 0.014, tip: 0.054, curve: 1.2, bw: 0.013, ty: -0.032, tr: 0.02, ax: 0.027, ay: -0.036, ah: 0.029, ar: 0.014 },
} as const;

export default defineThing({
  questions: {
    piercing: choice('What piercing does the nose carry?', {
      stud: 'A tiny bright stud on one nostril.',
      hoop: 'A hoop hugging the rim of one nostril.',
      septum: 'A horseshoe ring hanging from the septum between the nostrils.',
      bridge: 'A barbell across the bridge, a bead either side between the eyes.',
      chain: 'A nostril stud with a fine chain running off sideways toward an ear.',
    }),
    shape: choice('What shape is the nose?', {
      button: 'A small upturned button nose with a scooped bridge.',
      strong: 'A strong high-bridged nose with a hooked profile.',
      broad: 'A broad nose with wide flared nostrils.',
      crooked: 'A crooked nose, broken once and set badly.',
    }),
    finish: choice('What is the display nose made of?', {
      pale: 'Pale flesh-toned silicone.',
      brown: 'Brown flesh-toned silicone.',
      chrome: 'Mirror chrome, a mannequin fragment.',
      gold: 'Gold-plated all over, a trophy.',
      plaster: 'Matte white plaster, a cast from an art room.',
    }),
    state: choice('What state is the piercing in?', {
      healed: 'Long healed and settled.',
      fresh: 'Fresh: red, swollen and sore around the hole.',
      torn: 'Torn out: the jewellery lies on the plinth beside a drop of blood.',
    }),
    ornament: choice('How is the jewellery finished?', {
      plain: 'Plain polished metal.',
      jewelled: 'Set with a cluster of coloured gems.',
      bull: 'Thick and heavy like a bull ring.',
      bone: 'Carved from white bone or horn rather than metal.',
    }),
    metal: choice('What metal is the jewellery?', {
      gold: 'Yellow gold.',
      silver: 'Silver steel.',
      black: 'Black.',
      rose: 'Rose gold.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = SHAPES[a.shape];
    const side = random() < 0.5 ? -1 : 1;
    const bendTo = random() < 0.5 ? -1 : 1;
    const bend = (y: number) => (a.shape === 'crooked' ? bendTo * 0.011 * bump(y - 0.022, 0.03) : 0);
    const alaSite: [number, number] = [side * (P.ax + P.ar * 0.55), P.ay - 0.003];
    const pierced = a.piercing === 'stud' || a.piercing === 'hoop' || a.piercing === 'chain';
    const sore: [number, number][] = pierced ? [alaSite] : a.piercing === 'bridge' ? [[-0.017, 0.058], [0.017, 0.058]] : [[0, P.ty - P.tr * 0.9]];

    const W = 0.15, H = 0.19;
    const nose = (x: number, y: number) => {
      const xr = x - bend(y), ax = Math.abs(xr);
      const t = Math.min(1, Math.max(0, (0.082 - y) / (0.082 - P.ty)));
      let hb = P.root + (P.tip - P.root) * t ** P.curve;
      if (a.shape === 'strong' || a.shape === 'crooked') hb += 0.009 * bump(y - 0.03, 0.022);
      const ridge = hb * bump(xr, P.bw * (0.85 + 0.9 * t)) * smooth(P.ty - P.tr * 1.5, P.ty + 0.004, y);
      const tip = P.tip * bump(Math.hypot(xr, (y - P.ty) * 1.05), P.tr);
      const ala = P.ah * bump(Math.hypot(ax - P.ax, (y - P.ay) * 1.15), P.ar);
      let z = smax(smax(ridge, tip, 0.012), ala, 0.01);
      if (a.state === 'fresh') for (const [sx, sy] of sore) z += 0.005 * bump(Math.hypot(x - sx, y - sy), 0.011);
      return z;
    };
    const skinZ = (x: number, y: number) => -1.4 * x * x - 0.5 * y * y - 0.003 * bump(x, 0.007) * smooth(P.ty - 0.02, P.ty - 0.04, y);
    const zAt = (x: number, y: number) => skinZ(x, y) + nose(x, y);
    const rim = (x: number, y: number) => {
      const rx = 0.03 + 0.036 * smooth(0.09, -0.02, y);
      return (1 - Math.abs(x / rx) ** 2.4 - Math.abs((y - 0.006) / 0.088) ** 2.8) * 0.03;
    };
    const cast = relief(W, H, 110, (x, y) => (rim(x, y) > 0 ? zAt(x, y) : null), (x, y) => skinZ(x, y) - 0.014, rim);

    const fleshy = a.finish === 'pale' || a.finish === 'brown';
    const tone = { pale: '#efc7b4', brown: '#8a5a40', chrome: '#e9edf0', gold: '#f0c75a', plaster: '#f1eee6' }[a.finish];
    const nostrils: [number, number][] = [[-P.ax * 0.52, P.ay - 0.014], [P.ax * 0.52, P.ay - 0.014]];
    const map = paint(W, H, 512, (ctx) => {
      ctx.fillStyle = tone;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      if (fleshy) {
        for (let i = 0; i < 40; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.01, 0.01, random() < 0.5 ? '#b8554a' : '#fff0e2', 0.05);
        stain(ctx, 0, P.ty, 0.024, 0.022, '#e0605a', 0.22 + (a.state === 'fresh' ? 0.15 : 0));
        for (const sx of [-1, 1]) stain(ctx, sx * (P.ax + P.ar * 1.1), P.ay + 0.006, 0.006, 0.02, '#5a2a22', 0.3);
      }
      const dark = a.finish === 'chrome' ? '#20242a' : a.finish === 'gold' ? '#4a3208' : a.finish === 'plaster' ? '#77736c' : '#2a0d0c';
      for (const [x, y] of nostrils) {
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(x + bend(y), y, P.ar * 0.5, 0.0075, 0, 0, 7); ctx.fill();
        stain(ctx, x + bend(y), y, P.ar * 0.9, 0.012, dark, 0.5);
      }
      if (fleshy && a.state !== 'healed') for (const [x, y] of sore) { stain(ctx, x, y, 0.016, 0.016, '#d0202e', 0.75); stain(ctx, x, y, 0.007, 0.007, '#8a0f18', 0.8); }
      if (a.state === 'torn' && pierced) {
        ctx.strokeStyle = fleshy ? '#8a0f18' : dark; ctx.lineWidth = 0.003; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(alaSite[0], alaSite[1]); ctx.lineTo(alaSite[0] + side * 0.003, alaSite[1] - 0.016); ctx.stroke();
        if (fleshy) { ctx.lineWidth = 0.0016; ctx.beginPath(); ctx.moveTo(alaSite[0] + side * 0.003, alaSite[1] - 0.016); ctx.lineTo(alaSite[0] + side * 0.004, alaSite[1] - 0.04); ctx.stroke(); }
      }
      for (let i = 0; i < 45 * mood.wear; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.006, 0.006, '#5f594e', 0.22);
      if (a.finish === 'plaster' && mood.wear > 0.4) { ctx.strokeStyle = 'rgba(80,76,70,0.7)'; ctx.lineWidth = 0.0007; ctx.beginPath(); ctx.moveTo(-0.03, 0.08); ctx.lineTo(-0.012, 0.04); ctx.lineTo(-0.02, 0.01); ctx.lineTo(-0.004, -0.02); ctx.stroke(); }
    });
    const form = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = form) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const metallic = a.finish === 'chrome' || a.finish === 'gold';
    add(cast.front, new THREE.MeshStandardMaterial({ map, metalness: metallic ? 0.85 : 0, roughness: { pale: 0.5, brown: 0.5, chrome: 0.16, gold: 0.24, plaster: 0.95 }[a.finish] }));
    add(cast.shell, s.material(blend(tone, '#3a2a24', 0.3), { metalness: metallic ? 0.7 : 0, roughness: 0.6 }));

    // Jewellery.
    const bone = a.ornament === 'bone', bull = a.ornament === 'bull';
    const metal = new THREE.MeshStandardMaterial(bone
      ? { color: '#efe7d2', roughness: 0.6 }
      : { color: { gold: '#e6b84c', silver: '#e2e6e9', black: '#232328', rose: '#e0a08c' }[a.metal], metalness: a.metal === 'black' ? 0.6 : 0.95, roughness: a.metal === 'black' ? 0.4 : 0.2 });
    const gemColours = ['#ff4f7a', '#42d6c0', '#ffd24a', '#7a8cff', '#ffffff'];
    const gemAt = (parent: THREE.Object3D, at: THREE.Vector3, size: number, colour = '#eaf8ff') => {
      const gem = add(new THREE.OctahedronGeometry(size, 0), new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.05, metalness: 0.2, emissive: colour, emissiveIntensity: 0.35, flatShading: true }), parent);
      gem.position.copy(at);
      return gem;
    };
    const cluster = (parent: THREE.Object3D, at: THREE.Vector3, size: number) => {
      gemAt(parent, at, size, gemColours[Math.floor(random() * 4)]);
      for (let i = 0; i < 5; i++) gemAt(parent, at.clone().add(new THREE.Vector3(Math.cos(i * 1.257) * size * 1.5, Math.sin(i * 1.257) * size * 1.5, -size * 0.3)), size * 0.6, gemColours[(i + Math.floor(random() * 4)) % 5]);
    };
    const loose = new THREE.Group();
    const piece = a.state === 'torn' ? loose : form;
    const thick = bull ? 2.1 : 1, wide = bull ? 1.35 : 1;
    const alaPoint = new THREE.Vector3(alaSite[0], alaSite[1], zAt(alaSite[0], alaSite[1]));
    if (a.piercing === 'stud' || a.piercing === 'chain') {
      const stud = new THREE.Group();
      const r = (bull ? 0.0075 : 0.0045) * (bone ? 1.2 : 1);
      add(new THREE.SphereGeometry(r, 14, 10), metal, stud);
      if (a.ornament === 'jewelled') cluster(stud, new THREE.Vector3(0, 0, r * 0.8), 0.004);
      else if (!bone && !bull) gemAt(stud, new THREE.Vector3(0, 0, r * 0.9), 0.0042);
      stud.position.copy(alaPoint).add(new THREE.Vector3(side * 0.001, 0, r * 0.5));
      if (a.state !== 'torn') { stud.rotation.y = side * 0.6; form.add(stud); } else { stud.position.set(0, 0, 0); loose.add(stud); }
    }
    if (a.piercing === 'hoop') {
      const r = 0.016 * wide;
      const hoop = new THREE.Group();
      add(new THREE.TorusGeometry(r, 0.0021 * thick, 8, 30, bone ? Math.PI * 1.5 : Math.PI * 2), metal, hoop);
      if (a.ornament === 'jewelled') cluster(hoop, new THREE.Vector3(0, r, 0), 0.0034);
      else add(new THREE.SphereGeometry(0.0034 * thick, 10, 8), metal, hoop).position.set(r, 0, 0);
      if (a.state !== 'torn') {
        const y = P.ay - P.ar * 0.95;
        hoop.position.set(alaSite[0] * 0.9, y, zAt(alaSite[0] * 0.9, y) * 0.8);
        hoop.rotation.set(0.3, side * 0.75, 0);
        form.add(hoop);
      } else loose.add(hoop);
    }
    if (a.piercing === 'septum') {
      const r = 0.015 * wide;
      const ring = new THREE.Group();
      if (bone) {
        const tusk = add(new THREE.CylinderGeometry(0.0022, 0.004, 0.07, 10), metal, ring);
        tusk.rotation.z = Math.PI / 2;
        for (const x of [-0.035, 0.035]) add(new THREE.SphereGeometry(x < 0 ? 0.003 : 0.0055, 10, 8), metal, ring).position.x = x;
      } else {
        const gap = bull ? 0.001 : 1.1;
        const arc = add(new THREE.TorusGeometry(r, 0.0018 * thick, 8, 32, Math.PI * 2 - gap), metal, ring);
        arc.rotation.z = Math.PI / 2 + gap / 2;
        arc.position.y = -r * 0.75;
        if (!bull) for (const sx of [-1, 1]) {
          const end = new THREE.Vector3(sx * Math.sin(gap / 2) * r, Math.cos(gap / 2) * r - r * 0.75, 0);
          if (a.ornament === 'jewelled') gemAt(ring, end, 0.0045, gemColours[sx < 0 ? 0 : 1]);
          else add(new THREE.SphereGeometry(0.0036, 10, 8), metal, ring).position.copy(end);
        }
        if (a.ornament === 'jewelled') cluster(ring, new THREE.Vector3(0, -r * 1.75, 0.002), 0.0032);
      }
      if (a.state !== 'torn') {
        const y = P.ty - P.tr * 0.95;
        ring.position.set(bend(y), y, zAt(bend(y), y) * 0.82);
        ring.rotation.x = 0.35;
        form.add(ring);
      } else loose.add(ring);
    }
    if (a.piercing === 'bridge') {
      const y = 0.058, r = (bull ? 0.0075 : 0.005);
      const barbell = new THREE.Group();
      for (const sx of [-1, 1]) {
        const x = sx * (P.bw + 0.008) + bend(y) * (a.state === 'torn' ? 0 : 1);
        const z = a.state === 'torn' ? 0 : zAt(x, y);
        if (a.ornament === 'jewelled') gemAt(barbell, new THREE.Vector3(x, a.state === 'torn' ? 0 : y, z + 0.003), 0.0055, gemColours[sx < 0 ? 2 : 3]);
        else add(new THREE.SphereGeometry(r, 12, 10), metal, barbell).position.set(x, a.state === 'torn' ? 0 : y, z + r * 0.5);
      }
      if (a.state === 'torn') { const rod = add(new THREE.CylinderGeometry(0.0016, 0.0016, (P.bw + 0.008) * 2, 8), metal, barbell); rod.rotation.z = Math.PI / 2; }
      piece.add(barbell);
    }

    const lift = 0.19;
    form.position.set(0, lift, 0.01);
    form.rotation.x = -0.34;
    s.root.add(form);

    // The plinth: a stepped block with a brass plate naming the piercing.
    const stone = s.material(mood.cheer > 0.5 ? '#ece6da' : '#25232a', { roughness: mix(0.25, 0.8, mood.wear) });
    const brass = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    s.box([0.17, 0.014, 0.13], [0, 0.007, 0], stone);
    s.box([0.15, 0.05, 0.11], [0, 0.039, 0], stone);
    s.rod([0, 0.064, -0.028], [0, lift - 0.02, -0.028], 0.005, brass);
    s.rod([0, lift - 0.02, -0.028], [0, lift - 0.012, -0.008], 0.004, brass);
    const plate = s.label({ stud: 'NOSTRIL', hoop: 'HOOP', septum: 'SEPTUM', bridge: 'BRIDGE', chain: 'NOSE CHAIN' }[a.piercing], 0.085, 0.026, [0, 0.038, 0.0556], '#3a2a08', '#d9b860');
    plate.rotation.z = (random() - 0.5) * 0.1 * mood.wear;

    form.updateMatrixWorld(true);
    if (a.piercing === 'chain') {
      // The chain leaves the nostril and loops to a little ear-hook post at the side.
      const post: [number, number, number] = [side * 0.1, 0.064, 0.02];
      const top = new THREE.Vector3(post[0], lift + 0.035, post[2]);
      s.rod(post, [post[0], top.y, post[2]], 0.0035, brass);
      s.cylinder(0.014, 0.016, 0.006, [post[0], 0.067, post[2]], brass, 16);
      s.ring(0.008, 0.0014, [post[0], top.y + 0.008, post[2]], brass);
      s.box([0.02 + 0.06, 0.012, 0.05], [side * 0.105, 0.058, 0.02], stone);
      const from = a.state === 'torn' ? new THREE.Vector3(side * 0.045, 0.068, 0.04) : form.localToWorld(alaPoint.clone().add(new THREE.Vector3(0, 0, 0.004)));
      const beads: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, sag = Math.sin(Math.PI * t);
        const p = from.clone().lerp(top, t).add(new THREE.Vector3(0, -0.03 * sag * (a.state === 'torn' ? 0.2 : 1), 0.012 * sag));
        if (a.state === 'torn') p.y = Math.max(p.y, 0.066);
        beads.push({ at: p.toArray() as [number, number, number], size: 0.0017 });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), metal, beads);
      if (a.state === 'torn') loose.position.set(from.x, 0.069, from.z);
    }
    if (a.state === 'torn') {
      if (a.piercing !== 'chain') loose.position.set(side * (0.035 + random() * 0.02), 0.066 + (a.piercing === 'bridge' ? 0.005 : 0.003), 0.03 + random() * 0.012);
      if (a.piercing === 'hoop' || a.piercing === 'septum') loose.rotation.set(-Math.PI / 2 + 0.08, 0, random() * 3);
      else loose.rotation.y = random() * 3;
      s.root.add(loose);
      if (fleshy) {
        const blood = s.material('#9a1420', { roughness: 0.25 });
        for (let i = 0; i < 2 + Math.floor(random() * 3); i++) s.cylinder(0.004 + random() * 0.004, 0.005, 0.001, [side * (0.02 + random() * 0.03), 0.0645, 0.035 + random() * 0.015], blood, 12);
      }
    }

    const glint = mix(0.2, 1.6, mood.energy);
    return s.finish({ update: (_dt, time) => { if (a.state !== 'torn' && (a.piercing === 'septum' || a.piercing === 'hoop')) form.children.at(-1)!.rotation.z = Math.sin(time * glint) * 0.06 * mood.energy; } });
  },
});

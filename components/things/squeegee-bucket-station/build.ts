import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { grime, painted, scrawl, write } from './paint';

type P = [number, number, number];

export default defineThing({
  questions: {
    style: choice('What kind of station is it?', {
      tower: 'A moulded plastic all-in-one tower: trash base, fluid bin, towel box and sign in one column.',
      post: 'A steel post with separate bolted-on parts and a round drum bin beside it.',
      bucket: 'Improvised: a five-gallon bucket zip-tied to a yellow bollard, a towel roll on a wire and an oil drum for rubbish.',
    }),
    fluid: choice('What is in the washer-fluid bin?', {
      fresh: 'Fresh bright blue fluid, filled this morning.',
      sludge: 'Grey-brown sludge with dead bugs floating in it.',
      dry: 'Nothing: bone dry with a crust in the bottom.',
      frozen: 'A frozen pale block with the squeegee locked in the ice.',
    }),
    squeegee: choice('What about the squeegee?', {
      standing: 'Standing in the bin, handle leaning out.',
      pair: 'Two of them crossed in the bin.',
      missing: 'Missing altogether.',
      broken: 'Snapped: the stub in the bin and the head lying on the concrete.',
      balanced: 'Laid neatly across the top of the bin by a careful driver.',
    }),
    towels: choice('What state is the towel dispenser in?', {
      full: 'Full, one blue towel poking out ready.',
      streamer: 'Trailing a long streamer of towel that flaps in the wind.',
      empty: 'Empty, its front hanging open.',
    }),
    trash: choice('What overflows from the trash?', {
      nothing: 'Nothing, freshly emptied.',
      cups: 'Paper coffee cups and lids.',
      bags: 'Crumpled fast-food bags and a drink cup with a straw.',
      bouquet: 'The cellophane wrapper of a bouquet and a few dropped stems.',
      drawing: 'A child\'s crayon drawing, face up.',
      tickets: 'A drift of losing scratch-off lottery tickets.',
    }),
    sign: choice('What does the little sign on top say?', {
      cards: 'PAY AT PUMP with card logos.',
      rewards: 'A loyalty offer: SAVE 5¢ A GALLON.',
      safety: 'NO SMOKING · STOP ENGINE.',
      truckers: 'WE ♥ TRUCKERS, free coffee with fill-up.',
      note: 'A handwritten card: NO TOWELS ASK INSIDE.',
    }),
    colour: choice('What colour is the station?', {
      blue: 'Fuel-brand blue.',
      red: 'Red.',
      green: 'Forest green.',
      grey: 'Anonymous grey.',
      black: 'Black with a yellow stripe.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const tint = { blue: '#1f5fb4', red: '#c42a20', green: '#2c6e47', grey: '#8d9396', black: '#26292c' }[a.colour];
    const body = s.material(tint, { roughness: 0.55 });
    const dark = s.material('#1c1f22', { roughness: 0.75 });
    const steel = s.material('#aab0b2', { metalness: 0.8, roughness: 0.35 });
    const concrete = s.material('#b2aea2', { roughness: 0.95 });
    const paperMat = s.material('#f1eee4', { roughness: 0.9 });
    const towelBlue = s.material('#7fb4dc', { roughness: 0.95, side: THREE.DoubleSide });

    // A slice of pump island: raised kerb with a yellow nose.
    s.box([1.3, 0.16, 0.8], [0, 0.08, 0], concrete);
    s.box([1.32, 0.1, 0.82], [0, 0.05, 0], s.material('#e3b414', { roughness: 0.7 }));
    const G = 0.16;

    let bin: P, binSize: [number, number, number], round = false, disp: P, signAt: P, trashTop: P, trashR: number;
    if (a.style === 'tower') {
      s.box([0.5, 0.82, 0.46], [0, G + 0.41, 0], body);
      s.box([0.54, 0.05, 0.5], [0, G + 0.845, 0], dark);
      s.box([0.34, 0.2, 0.02], [0, G + 0.6, 0.232], dark);
      const label = painted(0.3, 0.08, (ctx, w, h) => { ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); write(ctx, 'TRASH', w / 2, h / 2, h * 0.8, '#ffffff'); }, { px: 128 });
      label.position.set(0, G + 0.76, 0.232); s.root.add(label);
      s.box([0.5, 1.05, 0.1], [0, G + 1.39, -0.18], body);
      bin = [0, G + 1.02, 0.06]; binSize = [0.5, 0.28, 0.36];
      disp = [0, G + 1.52, -0.02]; signAt = [0, G + 2.08, -0.18];
      s.box([0.06, 0.2, 0.04], [0, G + 1.96, -0.18], dark);
      trashTop = [0, G + 0.6, 0.25]; trashR = 0.14;
      if (a.colour === 'black') s.box([0.505, 0.06, 0.465], [0, G + 0.3, 0], s.material('#e7b512'));
    } else if (a.style === 'post') {
      s.box([0.07, 2.0, 0.07], [0, G + 1.0, -0.1], steel);
      s.box([0.24, 0.02, 0.24], [0, G + 0.01, -0.1], steel);
      bin = [0, G + 0.95, 0.12]; binSize = [0.5, 0.3, 0.36];
      s.box([0.1, 0.05, 0.12], [0, G + 0.9, -0.05], steel);
      disp = [0, G + 1.5, 0.03]; signAt = [0, G + 2.12, -0.1];
      // Drum bin with a domed swing lid.
      s.cylinder(0.24, 0.22, 0.8, [0.42, G + 0.4, -0.05], body, 22);
      for (const y of [0.2, 0.6]) s.ring(0.235, 0.012, [0.42, G + y, -0.05], dark).rotation.x = Math.PI / 2;
      s.lathe([[0.25, 0], [0.25, 0.05], [0.2, 0.16], [0.13, 0.2]], dark, [0.42, G + 0.8, -0.05]);
      trashTop = [0.42, G + 1.0, -0.05]; trashR = 0.13;
    } else {
      s.cylinder(0.075, 0.075, 1.1, [0, G + 0.55, -0.1], s.material('#e7b512', { roughness: 0.55 }), 16);
      s.ball([0.075, 0.04, 0.075], [0, G + 1.1, -0.1], s.material('#e7b512', { roughness: 0.55 }), 14);
      bin = [0, G + 0.62, 0.12]; binSize = [0.3, 0.37, 0.3]; round = true;
      for (const y of [0.52, 0.72]) s.ring(0.17, 0.005, [0, G + y, 0.03], s.material('#f2f2ee'), Math.PI * 2).rotation.x = Math.PI / 2;
      disp = [0, G + 1.25, -0.1]; signAt = [0, G + 1.62, -0.1];
      s.rod([0, G + 1.1, -0.1], [0, G + 1.8, -0.1], 0.012, steel);
      // Oil drum with a bin liner.
      s.cylinder(0.29, 0.29, 0.88, [0.5, 0.44, 0.05], s.material(a.colour === 'grey' ? '#5d6a70' : tint, { roughness: 0.6, metalness: 0.3 }), 22);
      for (const y of [0.02, 0.3, 0.6, 0.87]) s.ring(0.292, 0.012, [0.5, y, 0.05], dark).rotation.x = Math.PI / 2;
      s.cylinder(0.3, 0.295, 0.1, [0.5, 0.85, 0.05], s.material('#17191b', { roughness: 0.4 }), 22);
      trashTop = [0.5, 0.9, 0.05]; trashR = 0.24;
    }

    // Fluid bin.
    const [bx, by, bz] = bin, [bw, bh, bd] = binSize;
    const binMat = a.style === 'bucket' ? s.material('#e9e6dc', { roughness: 0.5, side: THREE.DoubleSide }) : s.material(a.style === 'tower' ? tint : '#2a2d30', { roughness: 0.5 });
    const surfaceY = by + bh / 2 - (a.fluid === 'dry' ? bh - 0.03 : a.fluid === 'frozen' ? 0.02 : 0.06 + random() * 0.05);
    if (round) {
      s.mesh(new THREE.CylinderGeometry(0.155, 0.13, bh, 20, 1, true), binMat, [bx, by, bz]);
      s.cylinder(0.13, 0.13, 0.01, [bx, by - bh / 2 + 0.005, bz], binMat, 20);
      s.ring(0.157, 0.01, [bx, by + bh / 2, bz], binMat).rotation.x = Math.PI / 2;
      s.ring(0.17, 0.005, [bx, by + bh / 2 - 0.05, bz], steel, Math.PI).rotation.z = Math.PI;
    } else {
      const t = 0.02;
      s.box([bw, t, bd], [bx, by - bh / 2 + t / 2, bz], binMat);
      for (const x of [-1, 1]) s.box([t, bh, bd], [bx + x * (bw / 2 - t / 2), by, bz], binMat);
      for (const z of [-1, 1]) s.box([bw, bh, t], [bx, by, bz + z * (bd / 2 - t / 2)], binMat);
      s.box([bw + 0.03, 0.02, 0.03], [bx, by + bh / 2, bz + bd / 2], binMat);
    }
    const fluidColour = { fresh: '#2aa0f0', sludge: '#6b6a5c', dry: '#8d8672', frozen: '#dcefF7' }[a.fluid];
    const fluidMat = s.material(fluidColour, { roughness: a.fluid === 'fresh' ? 0.08 : a.fluid === 'frozen' ? 0.3 : 0.8, emissive: a.fluid === 'fresh' ? '#1470c8' : '#000000', emissiveIntensity: a.fluid === 'fresh' ? 0.45 : 0 });
    const surface = round ? s.cylinder(0.145, 0.145, 0.012, [bx, surfaceY, bz], fluidMat, 20) : s.box([bw - 0.04, 0.012, bd - 0.04], [bx, surfaceY, bz], fluidMat);
    if (a.fluid === 'sludge') for (let i = 0; i < 7; i++) s.ball([0.012, 0.004, 0.008], [bx + (random() - 0.5) * (bw - 0.1), surfaceY + 0.008, bz + (random() - 0.5) * (bd - 0.1)], dark, 6);
    if (a.fluid === 'frozen') for (let i = 0; i < 6; i++) s.ball([0.04 + random() * 0.04, 0.015, 0.04], [bx + (random() - 0.5) * (bw - 0.12), surfaceY + 0.008, bz + (random() - 0.5) * (bd - 0.12)], s.material('#ffffff', { roughness: 0.9 }), 8);
    if (a.fluid === 'fresh' || a.fluid === 'sludge') for (let i = 0; i < 3; i++) s.rod([bx - bw / 2 + 0.05 + i * 0.1, by + bh / 2 - 0.02, bz + bd / 2 + 0.012], [bx - bw / 2 + 0.05 + i * 0.1, by - 0.05 - random() * 0.1, bz + bd / 2 + 0.012], 0.006, fluidMat, 0.002);

    // Squeegees.
    const handleMat = s.material(random() < 0.5 ? '#f0c22e' : '#e8e4d6', { roughness: 0.5 });
    const squeegee = (foot: P, tip: P, headAt: 'tip' | 'none' = 'tip') => {
      s.rod(foot, tip, 0.017, handleMat);
      if (headAt === 'none') return;
      const head = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.016), dark); blade.position.z = 0.026;
      const sponge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.04), s.material('#f0c22e', { roughness: 1 })); sponge.position.z = -0.012;
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), dark); neck.position.y = -0.03;
      head.add(blade, sponge, neck); head.traverse((n) => { n.castShadow = true; });
      head.position.set(...tip);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(tip[0] - foot[0], tip[1] - foot[1], tip[2] - foot[2]).normalize());
      s.root.add(head);
      return head;
    };
    const floorY = by - bh / 2 + 0.03;
    // The head goes down into the fluid; the handle sticks out. Draw handle-up: grip at the high end.
    const dunk = (lean: number, yaw: number) => {
      const len = 0.85;
      squeegee([bx, floorY, bz], [bx + Math.sin(yaw) * Math.sin(lean) * len, floorY + Math.cos(lean) * len, bz + Math.cos(yaw) * Math.sin(lean) * len]);
    };
    if (a.squeegee === 'standing') dunk(0.35 + random() * 0.15, (random() < 0.5 ? 1 : -1) * (0.9 + random() * 0.5));
    else if (a.squeegee === 'pair') { dunk(0.42, 1.2 + random() * 0.3); dunk(0.38, -1.2 - random() * 0.3); }
    else if (a.squeegee === 'broken') {
      s.rod([bx, floorY, bz], [bx + 0.06, floorY + 0.3, bz + 0.08], 0.012, handleMat);
      const gx = -0.4 - random() * 0.1, gz = 0.5 + random() * 0.15;
      squeegee([gx, 0.015, gz], [gx + 0.3, 0.02, gz + 0.12]);
    } else if (a.squeegee === 'balanced') squeegee([bx - 0.36, by + bh / 2 + 0.025, bz + 0.02], [bx + 0.26, by + bh / 2 + 0.025, bz - 0.02]);
    void surface;

    // Towel dispenser.
    const [dx, dy, dz] = disp;
    const flaps: THREE.Mesh[] = [];
    if (a.style === 'bucket') {
      // A roll of blue shop towels on a bent wire.
      const roll = s.cylinder(a.towels === 'empty' ? 0.025 : 0.075, a.towels === 'empty' ? 0.025 : 0.075, 0.26, [dx, dy, dz + 0.12], a.towels === 'empty' ? s.material('#b08d5e') : towelBlue, 18); roll.rotation.z = Math.PI / 2;
      s.rod([dx - 0.16, dy, dz + 0.12], [dx - 0.16, dy + 0.12, dz], 0.005, steel); s.rod([dx + 0.16, dy, dz + 0.12], [dx + 0.16, dy + 0.12, dz], 0.005, steel); s.rod([dx - 0.16, dy, dz + 0.12], [dx + 0.16, dy, dz + 0.12], 0.005, steel);
    } else {
      s.box([0.36, 0.3, 0.2], [dx, dy, dz + 0.1], a.style === 'tower' ? dark : body);
      if (a.towels === 'empty') {
        const door = s.box([0.34, 0.28, 0.015], [dx, dy - 0.28, dz + 0.215], a.style === 'tower' ? dark : body); door.rotation.x = 0.12;
        s.box([0.32, 0.26, 0.01], [dx, dy, dz + 0.196], s.material('#0e0f10'));
      } else {
        s.box([0.2, 0.2, 0.012], [dx, dy + 0.01, dz + 0.203], s.material('#cfe3ee', { roughness: 0.2 }));
        s.box([0.18, a.towels === 'full' ? 0.17 : 0.05, 0.012], [dx, dy - 0.085 + (a.towels === 'full' ? 0.085 : 0.025), dz + 0.206], towelBlue);
      }
    }
    if (a.towels !== 'empty') {
      const length = a.towels === 'streamer' ? 0.75 + random() * 0.4 : 0.1;
      const segments = a.towels === 'streamer' ? 8 : 1;
      const top: P = a.style === 'bucket' ? [dx, dy - 0.07, dz + 0.14] : [dx, dy - 0.15, dz + 0.215];
      for (let i = 0; i < segments; i++) {
        const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.2, length / segments), towelBlue);
        const out = Math.sqrt(i / segments) * 0.16;
        flap.position.set(top[0], top[1] - (i + 0.5) * (length / segments), top[2] + out);
        flap.rotation.x = i === 0 ? 0 : 0.18;
        flap.userData = { i, x: top[0], z: top[2] + out };
        flap.castShadow = true; s.root.add(flap); flaps.push(flap);
      }
    }

    // Sign on top.
    const sw = a.style === 'bucket' ? 0.34 : 0.46, sh = a.style === 'bucket' ? 0.26 : 0.34;
    s.box([sw + 0.03, sh + 0.03, 0.025], signAt, a.style === 'bucket' ? paperMat : body);
    const sign = painted(sw, sh, (ctx, w, h) => {
      if (a.sign === 'note') { ctx.fillStyle = '#efe7cf'; ctx.fillRect(0, 0, w, h); scrawl(ctx, ['NO TOWELS', 'ASK', 'INSIDE'], w, h, '#1c1a17', random); }
      else if (a.sign === 'cards') {
        ctx.fillStyle = '#f5f5f0'; ctx.fillRect(0, 0, w, h); write(ctx, 'PAY AT PUMP', w / 2, h * 0.22, h * 0.2, tint === '#8d9396' ? '#1c1f22' : tint, { max: w * 0.9 });
        const cards = ['#1a3f8f', '#d9342b', '#e9a51c', '#2c7a47'];
        cards.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(w * (0.08 + i * 0.22), h * 0.45, w * 0.18, h * 0.26); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(w * (0.08 + i * 0.22), h * 0.52, w * 0.18, h * 0.04); });
        write(ctx, 'CREDIT · DEBIT · FLEET', w / 2, h * 0.86, h * 0.09, '#3b3f42', { max: w * 0.9 });
      } else if (a.sign === 'rewards') {
        ctx.fillStyle = '#ffd92e'; ctx.fillRect(0, 0, w, h); write(ctx, 'SAVE', w / 2, h * 0.2, h * 0.22, '#c2201b'); write(ctx, '5¢', w / 2, h * 0.52, h * 0.4, '#c2201b'); write(ctx, 'A GALLON · REWARDS', w / 2, h * 0.86, h * 0.1, '#16181a', { max: w * 0.9 });
      } else if (a.sign === 'safety') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d2201c'; ctx.fillRect(0, 0, w, h * 0.3); write(ctx, 'WARNING', w / 2, h * 0.16, h * 0.2, '#ffffff');
        write(ctx, 'NO SMOKING', w / 2, h * 0.5, h * 0.17, '#16181a', { max: w * 0.9 }); write(ctx, 'STOP ENGINE', w / 2, h * 0.76, h * 0.17, '#16181a', { max: w * 0.9 });
      } else {
        ctx.fillStyle = '#1c2a4a'; ctx.fillRect(0, 0, w, h); write(ctx, 'WE', w * 0.2, h * 0.3, h * 0.26, '#ffffff');
        ctx.fillStyle = '#e2362b'; const hx = w * 0.5, hy = h * 0.28, r = h * 0.11;
        ctx.beginPath(); ctx.arc(hx - r * 0.6, hy - r * 0.3, r * 0.7, 0, 7); ctx.arc(hx + r * 0.6, hy - r * 0.3, r * 0.7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx - r * 1.25, hy); ctx.lineTo(hx, hy + r * 1.5); ctx.lineTo(hx + r * 1.25, hy); ctx.fill();
        write(ctx, 'TRUCKERS', w / 2, h * 0.6, h * 0.2, '#ffd92e', { max: w * 0.9 }); write(ctx, 'FREE COFFEE W/ FILL', w / 2, h * 0.86, h * 0.09, '#ffffff', { max: w * 0.9 });
      }
      grime(ctx, w, h, random, wear * 0.6);
    }, { px: 320, glow: a.sign === 'note' ? 0 : mix(0, 0.25, Math.abs(mood.daylight - 0.5) * 2) });
    sign.position.set(signAt[0], signAt[1], signAt[2] + 0.015); sign.rotation.z = a.sign === 'note' ? (random() - 0.5) * 0.12 : 0; s.root.add(sign);

    // What the trash is doing.
    const [tx, ty, tz] = trashTop;
    const ground = (spread = 0.45): P => [tx + (random() - 0.5) * spread * 2, tx > 0.3 ? 0.0 : G, tz + 0.2 + random() * spread];
    const onIsland = (p: P): P => [p[0], Math.abs(p[0]) < 0.65 && Math.abs(p[2]) < 0.4 ? G : 0, p[2]];
    const cup = (at: P, lying: boolean) => {
      const c = s.cylinder(0.04, 0.03, 0.11, [at[0], at[1] + (lying ? 0.04 : 0.055), at[2]], paperMat, 12);
      const lid = s.cylinder(0.042, 0.042, 0.012, [at[0], at[1] + 0.115, at[2]], s.material(random() < 0.5 ? '#3a2a20' : '#f4f1ea'), 12);
      const sleeve = s.cylinder(0.039, 0.034, 0.045, [at[0], at[1] + 0.055, at[2]], s.material('#9c6a3c', { roughness: 0.9 }), 12);
      if (lying) { const r = random() * 3; for (const part of [c, sleeve]) { part.rotation.z = Math.PI / 2; part.rotation.y = r; part.position.y = at[1] + 0.04; } lid.position.set(at[0] + 0.12 * Math.cos(r + 1), at[1] + 0.006, at[2] + 0.12 * Math.sin(r + 1)); }
    };
    if (a.trash === 'cups') {
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        if (i < 2) cup([tx + (i - 0.5) * 0.09, ty - 0.03 + i * 0.02, tz + (a.style === 'tower' ? 0.02 : 0)], false);
        else cup(onIsland(ground(0.4)), random() < 0.7);
      }
    } else if (a.trash === 'bags') {
      const bagMat = s.material('#b98958', { roughness: 0.95 }), red = s.material('#d2301f');
      const n = 2 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const at: P = i === 0 ? [tx, ty + 0.03, tz] : onIsland(ground(0.4));
        const bag = s.ball([0.1 + random() * 0.03, 0.08 + random() * 0.04, 0.08], [at[0], at[1] + 0.07, at[2]], bagMat, 7); bag.rotation.set(random(), random() * 3, random());
        s.ball([0.035, 0.035, 0.01], [at[0], at[1] + 0.09, at[2] + 0.075], red, 8);
      }
      const at = onIsland(ground(0.3));
      s.cylinder(0.05, 0.036, 0.17, [at[0], at[1] + 0.085, at[2]], s.material('#f1eee4'), 12);
      s.cylinder(0.052, 0.052, 0.012, [at[0], at[1] + 0.175, at[2]], s.material('#f8f8f8', { transparent: true, opacity: 0.9 }), 12);
      s.rod([at[0], at[1] + 0.17, at[2]], [at[0] + 0.03, at[1] + 0.3, at[2] + 0.01], 0.004, red);
    } else if (a.trash === 'bouquet') {
      const cello = new THREE.MeshStandardMaterial({ color: '#f6fbff', transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide });
      const cone = s.mesh(new THREE.ConeGeometry(0.2, 0.62, 9, 1, true), cello, [tx + 0.02, ty + 0.26, tz + 0.03]); cone.rotation.set(Math.PI + 0.45, 0, 0.35);
      const paper = s.mesh(new THREE.ConeGeometry(0.16, 0.5, 9, 1, true), s.material('#e58fb0', { side: THREE.DoubleSide, roughness: 0.8 }), [tx + 0.02, ty + 0.22, tz + 0.03]); paper.rotation.copy(cone.rotation);
      const stem = s.material('#4d7a3c'), petal = s.material(mix(0, 1, mood.cheer) > 0.5 ? '#e9c53a' : '#9a3b55');
      for (let i = 0; i < 4; i++) {
        const g = onIsland(ground(0.25)), r = random() * 6;
        s.rod([g[0], g[1] + 0.012, g[2]], [g[0] + Math.cos(r) * 0.22, g[1] + 0.012, g[2] + Math.sin(r) * 0.22], 0.009, stem);
        s.ball([0.06, 0.03, 0.06], [g[0] + Math.cos(r) * 0.22, g[1] + 0.03, g[2] + Math.sin(r) * 0.22], petal, 8);
      }
      for (let i = 0; i < 9; i++) { const g = onIsland(ground(0.4)); s.ball([0.022, 0.004, 0.016], [g[0], g[1] + 0.004, g[2]], petal, 6).rotation.y = random() * 3; }
    } else if (a.trash === 'drawing') {
      const sheet = painted(0.42, 0.32, (ctx, w, h) => {
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, w, h); ctx.lineCap = 'round'; ctx.lineWidth = h * 0.03;
        ctx.strokeStyle = '#f2b61b'; ctx.beginPath(); ctx.arc(w * 0.84, h * 0.2, h * 0.1, 0, 7); ctx.stroke(); for (let i = 0; i < 8; i++) { const t = i * 0.785; ctx.beginPath(); ctx.moveTo(w * 0.84 + Math.cos(t) * h * 0.14, h * 0.2 + Math.sin(t) * h * 0.14); ctx.lineTo(w * 0.84 + Math.cos(t) * h * 0.2, h * 0.2 + Math.sin(t) * h * 0.2); ctx.stroke(); }
        ctx.strokeStyle = '#2f9a48'; ctx.beginPath(); ctx.moveTo(0, h * 0.86); for (let x = 0; x <= w; x += w / 14) ctx.lineTo(x, h * (0.84 + random() * 0.06)); ctx.stroke();
        ctx.strokeStyle = '#d2342b'; ctx.strokeRect(w * 0.1, h * 0.45, w * 0.26, h * 0.38); ctx.beginPath(); ctx.moveTo(w * 0.07, h * 0.46); ctx.lineTo(w * 0.23, h * 0.24); ctx.lineTo(w * 0.39, h * 0.46); ctx.stroke();
        // A truck, because that is where a parent is.
        ctx.strokeStyle = '#2a5fc2'; ctx.strokeRect(w * 0.46, h * 0.5, w * 0.26, h * 0.2); ctx.strokeRect(w * 0.72, h * 0.58, w * 0.1, h * 0.12);
        ctx.strokeStyle = '#1c1c1c'; for (const x of [0.52, 0.66, 0.78]) { ctx.beginPath(); ctx.arc(w * x, h * 0.75, h * 0.05, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = '#7b3fa0'; ctx.beginPath(); ctx.arc(w * 0.56, h * 0.24, h * 0.06, 0, 7); ctx.moveTo(w * 0.56, h * 0.3); ctx.lineTo(w * 0.56, h * 0.44); ctx.moveTo(w * 0.5, h * 0.36); ctx.lineTo(w * 0.62, h * 0.36); ctx.stroke();
        grime(ctx, w, h, random, wear * 0.4, '#6b5a44');
      }, { px: 384 });
      const yaw = (random() - 0.5) * 1.2;
      sheet.rotation.set(-Math.PI / 2 + 0.03, 0, yaw); sheet.position.set(-0.3 + random() * 0.2, 0.012, 0.6 + random() * 0.04); s.root.add(sheet);
      const corner = s.ball([0.05, 0.035, 0.05], [tx, ty + 0.02, tz], paperMat, 7); corner.rotation.set(1, 2, 0.5);
    } else if (a.trash === 'tickets') {
      const hues = ['#e9c53a', '#d2342b', '#2f9a48', '#2a8fd0', '#e7742a', '#c23a8f'];
      const pts: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const g = i < 5 ? [tx + (random() - 0.5) * 0.15, ty + 0.01 + i * 0.004, tz + (random() - 0.5) * 0.08] as P : onIsland(ground(0.55)); pts.push({ at: [g[0], g[1] + 0.006 + i * 0.0004, g[2]], size: 1, color: hues[Math.floor(random() * hues.length)] }); }
      const tickets = s.scatter(new THREE.BoxGeometry(0.1, 0.004, 0.06), s.material('#ffffff', { roughness: 0.5 }), pts);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      pts.forEach((p, i) => { q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.2, random() * 6, 0)); tickets.setMatrixAt(i, m.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(1, 1, 1))); });
    }
    void trashR;

    // Oil drips and gum on the kerb when worn.
    if (wear > 0.35) for (let i = 0; i < 5; i++) s.cylinder(0.03 + random() * 0.06, 0.03, 0.004, [(random() - 0.5) * 1.1, G + 0.002, (random() - 0.5) * 0.6], s.material('#3a3832', { roughness: 0.4, transparent: true, opacity: 0.35 + wear * 0.3 }), 10);

    const wind = mix(0.15, 1.3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const flap of flaps) {
          const i = flap.userData.i as number;
          const wave = Math.sin(time * 3.1 * wind - i * 0.7) * 0.008 * (i + 1) * wind;
          flap.position.x = (flap.userData.x as number) + wave;
          flap.position.z = (flap.userData.z as number) + Math.cos(time * 2.3 * wind - i * 0.6) * 0.006 * (i + 1) * wind;
          flap.rotation.y = wave * 2;
        }
      },
    });
  },
});

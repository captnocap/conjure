import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type P3, ball, box, card, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, woodMaterial } from './parts';

type Rack = 'spike' | 'fork' | 'eight' | 'nontypical' | 'palmate';

export default defineThing({
  questions: {
    amount: choice('How much of the animal is on the plaque?', {
      shoulder: 'A full shoulder mount: furred neck and head reaching out from the wall.',
      european: 'A bleached bare skull with antlers, clean and severe.',
      skullcap: 'Only the antlers on a small felt-covered skull plate.',
      shed: 'A single shed antler strapped to a board, found not hunted.',
    }),
    rack: choice('What are the antlers like?', {
      spike: 'Two short plain spikes of a yearling, almost embarrassing.',
      fork: 'Small forked antlers, a modest first deer.',
      eight: 'A balanced eight-point rack, the classic trophy.',
      nontypical: 'A huge tangled non-typical rack with drop tines and stickers, a legend.',
      palmate: 'Broad flat palmate moose paddles edged with points.',
    }),
    velvet: noul('Are the antlers still covered in fuzzy brown velvet?'),
    eyes: choice('If it has a face, what do the glass eyes say?', {
      noble: 'Dark, calm and noble, gazing past you.',
      startled: 'Wide and startled with white showing, caught in headlights forever.',
      crosseyed: 'Cross-eyed: a bad mount that makes everyone laugh.',
      sleepy: 'Heavy-lidded and sleepy, almost stoned.',
      missing: 'One eye has fallen out, leaving an empty socket.',
    }),
    turn: choice('If it has a neck, which way does it turn?', {
      left: 'Turned to its right, looking down the wall.',
      straight: 'Straight out at the room.',
      right: 'Turned to its left, as if hearing something.',
      up: 'Chin lifted, mid-bellow.',
    }),
    coat: choice('If it has fur, what colour is the coat?', {
      whitetail: 'Tan-grey whitetail with a white throat.',
      red: 'Rich russet red deer.',
      dark: 'Dark chocolate elk or moose brown.',
      pale: 'A pale, almost white piebald rarity.',
    }),
    hanging: choice('What has someone hung on the antlers or plaque?', {
      nothing: 'Nothing: it is kept with respect.',
      cap: 'A trucker cap hooked on one tine.',
      tinsel: 'A garland of Christmas tinsel wound through the rack.',
      lights: 'A string of coloured fairy lights.',
      keys: 'A ring of car keys dangling from the brow tine.',
      rosette: 'A prize rosette ribbon pinned to the plaque.',
    }),
    inscription: choice('What does the brass plate on the plaque say?', {
      blank: 'Nothing: no plate at all.',
      date: 'Just a month and year.',
      first: 'FIRST BUCK and a year.',
      record: 'A county record with a score.',
      joke: 'A joke: HE STARTED IT.',
      memorial: "A memorial: DAD'S LAST HUNT.",
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear;
    const wood = woodMaterial(random, mix(0, 1, mood.warmth) > 0.5 ? '#7a4a26' : '#5b3b25', 1 - wear);
    const coat = { whitetail: '#9c7d5c', red: '#a2562c', dark: '#4e3626', pale: '#ddd0b8' }[a.coat];
    const hide = furMaterial(random, coat, { bald: Math.max(0, wear - 0.5) * 1.8, dust: wear });
    const pale = furMaterial(random, a.coat === 'dark' ? '#8a7460' : '#efe6d4', { dust: wear, streak: 0.1 });
    const bone = s.material('#e4d9bd', { roughness: 0.7 });
    const horn = a.velvet ? s.material('#6a4a34', { roughness: 1 }) : s.material('#cdb78c', { roughness: 0.55 });
    const black = s.material('#17120f', { roughness: 0.35 });
    const brass = '#c8a24a';
    const fat = a.velvet ? 1.55 : 1;
    const tips: THREE.Vector3[] = [];
    const groups: THREE.Object3D[] = [];
    const rack = a.rack as Rack;

    const antler = (parent: THREE.Object3D, sx: number, k: number, cut = 1) => {
      const g = group(parent);
      groups.push(g);
      const f = fat * Math.max(k, 0.8);
      const P = (x: number, y: number, z: number): P3 => [sx * x * k, y * k, z * k];
      const mark = (p: P3) => tips.push(g.localToWorld(new THREE.Vector3(...p)));
      const tine = (o: THREE.Vector3, d: P3, r: number) => {
        const tip: P3 = [o.x + d[0], o.y + d[1], o.z + d[2]];
        taper(g, [[o.x, o.y, o.z], [o.x + d[0] * 0.4 + sx * 0.012 * k, o.y + d[1] * 0.5, o.z + d[2] * 0.6], tip], r * f, (a.velvet ? 0.006 : 0.002) * f, horn, 7);
        return tip;
      };
      if (rack === 'spike') {
        const tip = P(0.06, 0.24 * cut, -0.01);
        taper(g, [P(0, 0, 0), P(0.035, 0.11 * cut, -0.02), tip], 0.012 * f, cut < 1 ? 0.009 : 0.003 * f, horn, 7);
        return [tip];
      }
      if (rack === 'palmate') {
        taper(g, [P(0, 0, 0), P(0.12, 0.02, -0.02), P(0.25, 0.07, -0.03)], 0.024 * f, 0.022 * f, horn, 8);
        const c = new THREE.Vector3(...P(0.44, 0.19, -0.04));
        ball(g, [0.2 * k * cut, 0.15 * k, 0.016 * k * f], [c.x, c.y, c.z], horn, [0.25, sx * 0.25, sx * -0.55], 16);
        const out: P3[] = [];
        const n = Math.round(7 * cut);
        for (let i = 0; i < n; i++) {
          const ang = mix(-0.3, 2.3, i / 6) + (random() - 0.5) * 0.15;
          const o = new THREE.Vector3(c.x + sx * Math.cos(ang) * 0.15 * k, c.y + Math.sin(ang) * 0.13 * k, c.z);
          out.push(tine(o, [sx * Math.cos(ang) * 0.11 * k, Math.sin(ang) * 0.12 * k + 0.03 * k, 0.03 * k], 0.014));
        }
        for (const f of [0.5, 0.8]) out.push(tine(new THREE.Vector3(...P(0.2 * f + 0.05, 0.04, 0)), [sx * 0.05 * k, 0.07 * k, 0.13 * k], 0.013));
        return out;
      }
      const big = rack === 'nontypical';
      const { curve } = taper(g, [P(0, 0, 0), P(0.09, 0.09, -0.06), P(0.24, 0.24, -0.09), P(0.33, 0.42, -0.01), P(0.27, 0.56, 0.12)].slice(0, cut < 1 ? 3 : 5), 0.021 * f, cut < 1 ? 0.013 : 0.005 * f, horn, 8);
      const out: P3[] = [curve.getPointAt(1).toArray() as [number, number, number]];
      const spots = rack === 'fork' ? [0.5] : big ? [0.07, 0.24, 0.38, 0.52, 0.66, 0.82] : [0.07, 0.4, 0.66];
      for (const [i, t] of spots.entries()) {
        const o = curve.getPointAt(Math.min(t / (cut < 1 ? 0.5 : 1), 0.98));
        if (cut < 1 && t > 0.45) continue;
        const len = (i === 0 ? 0.13 : mix(0.24, 0.12, t)) * k * (big ? mix(0.8, 1.5, random()) : mix(0.9, 1.1, random()));
        out.push(tine(o, i === 0 ? [sx * 0.02 * k, len * 0.7, len * 0.9] : [sx * (random() - 0.6) * 0.06 * k, len, (random() - 0.3) * 0.05 * k], 0.012));
      }
      if (big) {
        for (let i = 0; i < 4; i++) {
          const o = curve.getPointAt(mix(0.2, 0.9, random()));
          const down = i < 2;
          out.push(tine(o, [sx * mix(0.02, 0.12, random()) * k, (down ? -1 : 0.4) * mix(0.08, 0.16, random()) * k, (random() - 0.5) * 0.1 * k], 0.011));
        }
      }
      return out;
    };
    const rackScale = { spike: 0.9, fork: 0.6, eight: 1, nontypical: 1.3, palmate: 1.15 }[rack];
    const broken = wear > 0.72 && random() < 0.7 ? (random() < 0.5 ? -1 : 1) : 0;
    const pair = (parent: THREE.Object3D, at: P3, spread: number) => {
      for (const sx of [-1, 1]) {
        const g = group(parent, [at[0] + sx * spread, at[1], at[2]], [0, 0, sx * (random() - 0.5) * 0.1]);
        const list = antler(g, sx, rackScale * mix(0.94, 1.06, random()), broken === sx ? 0.5 : 1);
        root.updateMatrixWorld(true);
        for (const p of list) tips.push(g.localToWorld(new THREE.Vector3(...p)));
      }
    };

    let plateY = -0.2, plateZ = 0.03, pinAt: P3 = [0.13, -0.05, 0.035];
    if (a.amount === 'shoulder') {
      plaque(root, 'shield', 0.44, 0.62, wood, 0.03);
      const yaw = { left: -0.55, straight: 0, right: 0.55, up: 0.15 }[a.turn] + (random() - 0.5) * 0.12;
      const lift = a.turn === 'up' ? -0.5 : 0.08;
      const hx = Math.sin(yaw) * 0.16, hy = 0.13 + (a.turn === 'up' ? 0.05 : 0), hz = 0.36;
      taper(root, [[0, -0.07, 0.0], [hx * 0.25, -0.03, 0.17], [hx * 0.8, hy - 0.04, hz - 0.1], [hx, hy - 0.01, hz - 0.02]], 0.17, 0.085, hide, 14);
      ball(root, [0.1, 0.13, 0.06], [hx * 0.3, -0.1, 0.19], pale, [0.5, 0, 0]);
      const H = group(root, [hx, hy, hz], [lift, yaw, wear > 0.6 ? (random() - 0.5) * 0.3 : 0]);
      ball(H, [0.078, 0.086, 0.1], [0, 0, 0], hide);
      limb(H, [0, -0.015, 0.05], [0, -0.07, 0.245], 0.062, 0.034, hide, 0.85);
      limb(H, [0, -0.07, 0.0], [0, -0.103, 0.215], 0.04, 0.022, pale, 0.9);
      ball(H, [0.03, 0.024, 0.02], [0, -0.062, 0.275], black);
      ball(H, [0.04, 0.02, 0.03], [0, -0.085, 0.25], pale);
      for (const sx of [-1, 1]) {
        const ear = group(H, [sx * 0.072, 0.06, -0.045], [0.1, 0, -sx * (1.05 + (wear > 0.6 && sx === 1 ? 0.7 : 0) + (random() - 0.5) * 0.2)]);
        ball(ear, [0.036, 0.085, 0.014], [0, 0.085, 0], hide);
        ball(ear, [0.022, 0.065, 0.008], [0, 0.085, 0.01], s.material('#d9a79a'));
        ball(H, [0.03, 0.026, 0.02], [sx * 0.058, 0.022, 0.05], pale, [0, sx * 0.9, 0]);
        // Eyes: the mood of the whole mount.
        const sideLook: [number, number] = [sx * 1.05, 0];
        const at: P3 = [sx * 0.064, 0.022, 0.055];
        if (a.eyes === 'missing' && sx === 1) {
          ball(H, [0.016, 0.016, 0.012], [at[0] + 0.004, at[1], at[2]], black, [0, 0.9, 0]);
          ball(H, [0.011, 0.014, 0.012], [at[0] + 0.01, at[1] - 0.006, at[2]], s.material('#e9dfc0', { roughness: 1 }));
        } else if (a.eyes === 'startled') eye(H, at, 0.025, eyeMaterial('#5a3414', 'wide', true), sideLook);
        else if (a.eyes === 'crosseyed') eye(H, [sx * 0.058, 0.024, 0.07], 0.024, eyeMaterial('#7a4a1c', 'round', true), [-sx * 0.25 + sx * 0.6, sx === 1 ? 0.25 : -0.2]);
        else {
          eye(H, at, 0.018, eyeMaterial('#3a230f', 'dark'), sideLook);
          if (a.eyes === 'sleepy') ball(H, [0.021, 0.014, 0.021], [at[0], at[1] + 0.009, at[2]], hide, [0, 0, sx * -0.2]);
        }
      }
      if (a.turn === 'up') ball(H, [0.022, 0.012, 0.03], [0, -0.09, 0.2], s.material('#b0565a'));
      // Loose stitching shows when the mount has gone to seed.
      if (wear > 0.55) for (let i = 0; i < 7; i++) box(H, [0.004, 0.012, 0.004], [0.004 * (i % 2 ? 1 : -1), 0.085 - i * 0.004, -0.02 + i * 0.012], black, [0.3, 0, (i % 2 ? 1 : -1) * 0.8]);
      for (const sx of [-1, 1]) ball(H, [0.02, 0.02, 0.02], [sx * 0.038, 0.082, -0.012], horn);
      pair(H, [0, 0.09, -0.012], 0.038);
      plateY = -0.255; plateZ = 0.034; pinAt = [0.15, 0.2, 0.035];
    } else if (a.amount === 'european') {
      plaque(root, 'arch', 0.3, 0.5, wood, 0.028);
      const H = group(root, [0, 0.07, 0.07], [1.0, 0, 0]);
      ball(H, [0.06, 0.055, 0.075], [0, 0, 0], bone);
      limb(H, [0, -0.01, 0.04], [0, -0.035, 0.25], 0.045, 0.018, bone, 0.8);
      for (const sx of [-1, 1]) {
        ball(H, [0.022, 0.02, 0.014], [sx * 0.045, 0.0, 0.055], black, [0, sx * 0.9, 0]);
        ball(H, [0.008, 0.006, 0.03], [sx * 0.012, -0.012, 0.2], black);
        ball(H, [0.018, 0.02, 0.018], [sx * 0.035, 0.05, -0.01], bone);
      }
      for (let i = 0; i < 6; i++) box(H, [0.05 - i * 0.004, 0.008, 0.012], [0, -0.055 - i * 0.002, 0.07 + i * 0.022], bone);
      pair(group(H, [0, 0.06, -0.01], [-0.8, 0, 0]), [0, 0, 0], 0.035);
      plateY = -0.2; plateZ = 0.032; pinAt = [0.09, -0.1, 0.033];
    } else if (a.amount === 'skullcap') {
      plaque(root, 'shield', 0.3, 0.38, wood, 0.028);
      const felt = s.material(mood.cheer > 0.5 ? '#8a2f2a' : '#3e5a3a', { roughness: 1 });
      ball(root, [0.075, 0.05, 0.05], [0, 0.03, 0.04], felt);
      part(root, new THREE.TorusGeometry(0.06, 0.006, 6, 24), s.material(brass, { metalness: 0.7, roughness: 0.4 }), [0, 0.03, 0.045], [1.25, 0.83, 1]);
      const H = group(root, [0, 0.05, 0.06], [0.25, 0, 0]);
      pair(H, [0, 0, 0], 0.04);
      plateY = -0.105; plateZ = 0.032; pinAt = [0.09, -0.02, 0.033];
    } else {
      plaque(root, 'slab', 0.72 * rackScale + 0.1, 0.2, wood, 0.028);
      const H = group(root, [-0.3 * rackScale, -0.03, 0.05], [0, 0, -Math.PI / 2 + 0.25]);
      const list = antler(H, -1, rackScale);
      ball(H, [0.03, 0.014, 0.03], [0, 0, 0], bone);
      root.updateMatrixWorld(true);
      for (const p of list) tips.push(groups[0].localToWorld(new THREE.Vector3(...p)));
      const strap = s.material('#3b2a1d', { roughness: 0.9 });
      for (const x of [-0.22, 0.02]) part(root, new THREE.TorusGeometry(0.03, 0.007, 6, 16, Math.PI), strap, [x * rackScale, -0.02, 0.03], [1, 1, 1.4], [Math.PI / 2, 0, Math.PI / 2]);
      plateY = -0.06; plateZ = 0.03; pinAt = [0.25 * rackScale, 0.04, 0.03];
    }

    // The brass plate.
    const year = 1958 + Math.floor(random() * 60);
    const month = ['OCT', 'NOV', 'DEC', 'SEPT'][Math.floor(random() * 4)];
    const text: Record<typeof a.inscription, string[]> = {
      blank: [], date: [`${month} ${year}`], first: ['FIRST BUCK', `${year}`], record: ['COUNTY RECORD', `${150 + Math.floor(random() * 80)} PTS  ${year}`],
      joke: ['HE STARTED IT'], memorial: ["DAD'S LAST HUNT", `${year}`],
    };
    if (text[a.inscription].length) {
      const big = a.amount === 'shoulder' ? 1 : 0.75;
      card(root, text[a.inscription], 0.17 * big, 0.06 * big, [a.amount === 'shed' ? 0.2 * rackScale : 0, plateY + (a.amount === 'shoulder' ? 0.02 : 0), plateZ], { paper: wear > 0.6 ? '#8f7a45' : brass, ink: '#2e210c', metal: true, border: true, rot: [0, 0, (random() - 0.5) * wear * 0.2] });
    }

    // What people hang on it.
    root.updateMatrixWorld(true);
    const high = tips.slice().sort((p, q) => q.y - p.y);
    if (a.hanging === 'cap' && high.length) {
      const p = high[Math.min(1, high.length - 1)];
      const cap = group(root, [p.x, p.y - 0.035, p.z], [0.25, random() * 2, (random() - 0.5) * 0.6]);
      const colour = s.material(['#b3271f', '#1f5f3a', '#e08a1e', '#23408f'][Math.floor(random() * 4)]);
      part(cap, new THREE.SphereGeometry(0.085, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), colour, [0, 0, 0], [1, 0.8, 1.05]);
      box(cap, [0.13, 0.008, 0.09], [0, 0.004, 0.12], colour, [0.12, 0, 0]);
      ball(cap, [0.06, 0.04, 0.02], [0, 0.03, 0.075], s.material('#f1ede0'));
    } else if ((a.hanging === 'tinsel' || a.hanging === 'lights') && high.length > 1) {
      const order = tips.slice().sort((p, q) => p.x - q.x).filter((_p, i, all) => all.length < 7 || i % 2 === 0);
      const pts: P3[] = [];
      order.forEach((p, i) => {
        if (i) { const q = order[i - 1]; pts.push([(p.x + q.x) / 2, Math.min(p.y, q.y) - 0.06 - random() * 0.05, (p.z + q.z) / 2 + 0.02]); }
        pts.push([p.x, p.y - 0.01, p.z]);
      });
      const path = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      if (a.hanging === 'tinsel') {
        const colour = ['#d8b13a', '#c9342c', '#b9c4cf', '#2f9e58'][Math.floor(random() * 4)];
        part(root, new THREE.TubeGeometry(path, 80, 0.014, 6), s.material(colour, { metalness: 0.8, roughness: 0.3 }));
        const n = 140, fr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.07, 0.004), s.material(colour, { metalness: 0.9, roughness: 0.2, emissive: colour, emissiveIntensity: 0.25 }), n);
        const m = new THREE.Matrix4(), e = new THREE.Euler();
        for (let i = 0; i < n; i++) { const p = path.getPointAt(i / (n - 1)); m.makeRotationFromEuler(e.set(random() * 6, random() * 6, random() * 6)).setPosition(p); fr.setMatrixAt(i, m); }
        fr.castShadow = true;
        root.add(fr);
      } else {
        part(root, new THREE.TubeGeometry(path, 80, 0.003, 5), s.material('#1d3a22'));
        const hues = ['#ff3b30', '#ffd23b', '#35c759', '#3b82ff', '#ff7bd0'];
        for (let i = 0; i < 16; i++) {
          const p = path.getPointAt((i + 0.5) / 16), c = hues[i % hues.length];
          ball(root, [0.011, 0.017, 0.011], [p.x, p.y - 0.014, p.z], new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: mix(0.5, 1.6, mood.energy), roughness: 0.3 }), [0, 0, 0], 8);
        }
      }
    } else if (a.hanging === 'keys' && tips.length) {
      const p = tips.slice().sort((p, q) => q.z - p.z)[0];
      const steel = s.material('#c9ced2', { metalness: 0.9, roughness: 0.25 });
      part(root, new THREE.TorusGeometry(0.022, 0.0025, 6, 20), steel, [p.x, p.y - 0.03, p.z], 1, [0, 0.6, 0]);
      for (let i = 0; i < 3; i++) {
        const k = group(root, [p.x + (i - 1) * 0.008, p.y - 0.052, p.z + (i - 1) * 0.006], [0, 0.5, (i - 1) * 0.35]);
        box(k, [0.007, 0.05, 0.002], [0, -0.025, 0], steel);
        part(k, new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), i === 0 ? s.material('#1c1c1e') : steel, [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
      }
      box(root, [0.03, 0.045, 0.006], [p.x + 0.02, p.y - 0.085, p.z], s.material('#c0392b'), [0, 0.5, 0.2]);
    } else if (a.hanging === 'rosette') {
      const colour = s.material(mood.cheer > 0.4 ? '#2449b0' : '#a3261f', { roughness: 0.6 });
      const R = group(root, pinAt, [0, 0, (random() - 0.5) * 0.4]);
      for (let i = 0; i < 12; i++) ball(R, [0.014, 0.026, 0.005], [Math.sin(i * 0.5236) * 0.03, Math.cos(i * 0.5236) * 0.03, 0.004], colour, [0, 0, -i * 0.5236], 8);
      part(R, new THREE.CylinderGeometry(0.022, 0.022, 0.008, 16), s.material('#f0d35a', { metalness: 0.6, roughness: 0.35 }), [0, 0, 0.008], 1, [Math.PI / 2, 0, 0]);
      for (const sx of [-1, 1]) box(R, [0.02, 0.11, 0.003], [sx * 0.014, -0.075, 0.002], colour, [0, 0, sx * 0.12]);
    }

    // Dust and cobweb when neglected.
    if (wear > 0.65 && high.length > 1) {
      const web = new THREE.MeshStandardMaterial({ color: '#e8e6dc', transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 3; i++) { const p = high[Math.floor(random() * high.length)], q = high[Math.floor(random() * high.length)]; if (p !== q) s.rod([p.x, p.y, p.z], [q.x, q.y, q.z], 0.0015, web); }
    }
    return s.finish();
  },
});

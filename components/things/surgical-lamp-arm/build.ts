import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    head: choice('What kind of lamp head is it?', {
      bare: 'A bare bulb in a dented metal cone shade, an interrogation room.',
      petals: 'A modern LED light: four flat petals of tiny diodes around a hub.',
      reflector: 'One big polished parabolic reflector with a single bulb, 1930s surgery.',
      dental: 'A small rectangular dentist\'s lamp with a handle on each side.',
      cluster: 'A wide shallow saucer with seven round lenses, the classic operating theatre light.',
    }),
    mount: choice('What carries it?', {
      mobile: 'A tall pole on a five-legged castor base that can be wheeled about.',
      column: 'A heavy enamelled floor column, bolted down, with a counterweighted arm.',
      ceiling: 'A floor-to-ceiling pole with a round ceiling plate and a long boom, a fitted theatre.',
      tripod: 'A spindly tripod with its cable taped to one leg, improvised and temporary.',
    }),
    state: choice('What is the light doing?', {
      blazing: 'Blazing at full power, a hard white cone you can see in the air.',
      dimmed: 'Turned right down to a dull glow.',
      dead: 'On, but one bulb is dead and dark among the others.',
      flicker: 'Flickering and buzzing, about to fail.',
      off: 'Switched off, cold glass.',
    }),
    aim: choice('Where is it pointed?', {
      down: 'Angled down at whatever lies beneath it, the working position.',
      forward: 'Swung round and tilted straight at you, into your eyes.',
      aside: 'Pushed up and aside out of the way, work finished.',
    }),
    finish: choice('What is it made of?', {
      white: 'White enamel, clean and clinical.',
      steel: 'Bare brushed steel and chrome.',
      green: 'Pale institutional green paint.',
      black: 'Black crackle paint, military or police.',
    }),
    satellite: noul('Does a second, smaller lamp hang from its own arm beside the main one?'),
    extras: choice('What else hangs on it?', {
      nothing: 'Nothing.',
      cable: 'A long power cable trailing across the floor to a plug.',
      camera: 'A camera or monitor on a side arm, the procedure is being recorded.',
      drape: 'A cloth thrown over part of the head, hastily covered.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paintColour = { white: '#ecece4', steel: '#b9c1c3', green: '#a9c2b2', black: '#26292b' }[a.finish];
    const paint = s.material(paintColour, { metalness: a.finish === 'steel' ? 0.55 : 0.05, roughness: a.finish === 'black' ? 0.75 : 0.35 });
    const chrome = s.material('#dfe4e5', { metalness: 0.75, roughness: 0.2 });
    const dark = s.material('#1c1f21', { roughness: 0.6 });
    const glow = new THREE.Color('#e4f2ff').lerp(new THREE.Color('#ffe1a6'), mood.warmth);
    const power = { blazing: 1.6, dimmed: 0.28, dead: 1.3, flicker: 1.0, off: 0 }[a.state];
    const lit: THREE.MeshStandardMaterial[] = [];
    const lens = (dead = false) => {
      const on = !dead && power > 0;
      const material = new THREE.MeshStandardMaterial({ color: on ? glow : '#5d676b', emissive: on ? glow : '#000000', emissiveIntensity: on ? power : 0, roughness: 0.2 });
      if (on) lit.push(material);
      return material;
    };

    // Mount. The arm ends at the elbow; the lamp hangs from it.
    const px = -0.78, pz = -0.3;
    let top = 2.1;
    if (a.mount === 'mobile') {
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.257 + 0.3, ex = px + Math.cos(angle) * 0.36, ez = pz + Math.sin(angle) * 0.36;
        s.rod([px, 0.12, pz], [ex, 0.08, ez], 0.022, chrome);
        s.cylinder(0.035, 0.035, 0.03, [ex, 0.035, ez], dark, 12).rotation.x = Math.PI / 2;
      }
      s.cylinder(0.05, 0.07, 0.14, [px, 0.15, pz], paint, 14);
      s.rod([px, 0.15, pz], [px, top, pz], 0.022, chrome);
      s.box([0.12, 0.2, 0.1], [px, 0.75, pz], paint);
    } else if (a.mount === 'column') {
      s.cylinder(0.26, 0.3, 0.07, [px, 0.035, pz], paint, 26);
      s.lathe([[0.001, 0.07], [0.16, 0.07], [0.12, 0.3], [0.09, 1.2], [0.07, top], [0.001, top]], paint, [px, 0, pz]);
      s.cylinder(0.1, 0.1, 0.08, [px, 1.25, pz], chrome, 18);
      s.rod([px, top - 0.05, pz], [px - 0.35, top + 0.04, pz - 0.14], 0.03, paint);
      s.cylinder(0.09, 0.09, 0.2, [px - 0.4, top + 0.05, pz - 0.16], dark, 14).rotation.z = Math.PI / 2;
    } else if (a.mount === 'ceiling') {
      top = 2.3;
      s.cylinder(0.2, 0.2, 0.04, [px, 0.02, pz], paint, 22);
      s.rod([px, 0, pz], [px, 2.75, pz], 0.035, paint);
      s.cylinder(0.26, 0.26, 0.05, [px, 2.76, pz], paint, 24);
      s.cylinder(0.07, 0.07, 0.14, [px, top, pz], chrome, 16);
    } else {
      top = 1.95;
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.5;
        s.rod([px + Math.cos(angle) * 0.5, 0, pz + Math.sin(angle) * 0.5], [px, 1.0, pz], 0.016, dark);
        s.rod([px + Math.cos(angle) * 0.25, 0.5, pz + Math.sin(angle) * 0.25], [px, 0.62, pz], 0.008, chrome);
      }
      s.rod([px, 0.6, pz], [px, top, pz], 0.016, chrome);
      s.cylinder(0.035, 0.035, 0.07, [px, 1.0, pz], dark, 12);
      for (let i = 0; i < 3; i++) s.cylinder(0.02, 0.02, 0.03, [px + Math.cos(0.5) * 0.5 * (0.3 + i * 0.25), 0.72 - i * 0.25, pz + Math.sin(0.5) * 0.5 * (0.3 + i * 0.25)], s.material('#c9c2a8'), 8);
    }

    // Boom, elbow and the spring arm down to the yoke.
    const aside = a.aim === 'aside';
    const elbow: [number, number, number] = [-0.12, top + (a.mount === 'tripod' ? 0 : 0.06), -0.08];
    const hub: [number, number, number] = aside ? [0.5, top + 0.28, 0.02] : a.aim === 'forward' ? [0.16, top - 0.42, 0.22] : [0.16, top - 0.38, 0.05];
    s.ball([0.05, 0.05, 0.05], [px, top, pz], chrome, 12);
    s.rod([px, top, pz], elbow, 0.026, paint);
    s.ball([0.055, 0.055, 0.055], elbow, chrome, 12);
    s.rod(elbow, hub, 0.022, paint);
    const mid: [number, number, number] = [(elbow[0] + hub[0]) / 2, (elbow[1] + hub[1]) / 2 + 0.07, (elbow[2] + hub[2]) / 2];
    s.rod([elbow[0], elbow[1] + 0.07, elbow[2]], mid, 0.008, chrome);
    s.ball([0.045, 0.045, 0.045], hub, chrome, 12);

    // The head, built pointing down (-y) around its own origin, then aimed.
    const head = new THREE.Group();
    head.position.set(hub[0], hub[1] - 0.1, hub[2]);
    s.root.add(head);
    const h = new Sculpture(context);
    head.add(h.root);
    let reach = 0.4, beamR = 0.36;
    const deadIndex = a.state === 'dead' ? Math.floor(random() * 7) : -1;
    if (a.head === 'cluster') {
      reach = 0.44;
      h.lathe([[0.001, 0.05], [0.12, 0.045], [0.3, 0.0], [0.42, -0.07], [0.44, -0.1], [0.42, -0.115], [0.001, -0.115]], paint);
      h.ring(0.43, 0.014, [0, -0.1, 0], chrome).rotation.x = Math.PI / 2;
      h.ring(0.445, 0.012, [0, -0.118, 0], lens()).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) {
        const angle = i * 1.047, r = i === 6 ? 0 : 0.27;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        h.cylinder(0.105, 0.105, 0.02, [x, -0.122, z], dark, 20);
        h.cylinder(0.075, 0.1, 0.07, [x, i === 6 ? 0.07 : -0.005, z], paint, 16);
        h.cylinder(0.09, 0.09, 0.022, [x, -0.128, z], lens(i === deadIndex), 20);
      }
      h.cylinder(0.018, 0.022, 0.13, [0.14, -0.19, 0.0], chrome, 10);
      beamR = 0.42;
    } else if (a.head === 'petals') {
      reach = 0.46;
      h.cylinder(0.13, 0.13, 0.07, [0, -0.035, 0], paint, 20);
      h.cylinder(0.09, 0.09, 0.02, [0, -0.08, 0], lens(deadIndex === 0), 18);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const petal = new Sculpture(context);
        const body = petal.cylinder(0.17, 0.17, 0.045, [0, 0, 0], paint, 22);
        body.scale.set(1, 1, 0.72);
        const face = petal.cylinder(0.15, 0.15, 0.012, [0, -0.024, 0], lens(deadIndex === i + 1), 22);
        face.scale.set(1, 1, 0.7);
        for (let k = 0; k < 3; k++) petal.box([0.24 - Math.abs(k - 1) * 0.06, 0.004, 0.006], [0, -0.032, (k - 1) * 0.055], dark);
        petal.root.position.set(Math.cos(angle) * 0.29, -0.03, Math.sin(angle) * 0.29);
        petal.root.rotation.y = -angle;
        petal.root.rotation.z = 0;
        h.root.add(petal.root);
      }
      h.cylinder(0.018, 0.022, 0.12, [0, -0.15, 0], chrome, 10);
      beamR = 0.44;
    } else if (a.head === 'reflector') {
      reach = 0.42;
      const dish = h.lathe([[0.001, 0.1], [0.1, 0.09], [0.24, 0.03], [0.36, -0.08], [0.41, -0.17], [0.42, -0.19]], paint);
      (dish.material as THREE.Material).side = THREE.DoubleSide;
      const inner = h.lathe([[0.001, 0.085], [0.1, 0.075], [0.235, 0.018], [0.35, -0.085], [0.4, -0.17]], new THREE.MeshStandardMaterial({ color: '#f1f1ea', emissive: glow, emissiveIntensity: power * 0.45, roughness: 0.2, side: THREE.BackSide }));
      if (power > 0) lit.push(inner.material as THREE.MeshStandardMaterial);
      h.ring(0.42, 0.012, [0, -0.19, 0], chrome).rotation.x = Math.PI / 2;
      h.cylinder(0.03, 0.03, 0.08, [0, 0.03, 0], dark, 10);
      h.ball([0.055, 0.07, 0.055], [0, -0.06, 0], lens(a.state === 'dead'), 14);
      for (let i = 0; i < 3; i++) h.rod([Math.cos(i * 2.094) * 0.41, -0.19, Math.sin(i * 2.094) * 0.41], [0, -0.2, 0], 0.004, chrome);
      beamR = 0.4;
    } else if (a.head === 'dental') {
      reach = 0.22;
      h.box([0.34, 0.1, 0.2], [0, -0.03, 0], paint);
      h.box([0.28, 0.02, 0.15], [0, -0.085, 0], lens(a.state === 'dead' && random() < 0.0));
      if (a.state === 'dead') h.box([0.12, 0.022, 0.15], [0.08, -0.086, 0], lens(true));
      for (const x of [-1, 1]) h.ring(0.06, 0.012, [x * 0.21, -0.03, 0], chrome, Math.PI).rotation.set(Math.PI / 2, 0, x * -Math.PI / 2);
      beamR = 0.18;
    } else {
      reach = 0.24;
      const shade = h.lathe([[0.03, 0.1], [0.05, 0.04], [0.2, -0.12], [0.23, -0.14]], paint);
      (shade.material as THREE.Material).side = THREE.DoubleSide;
      shade.rotation.z = mood.wear * 0.12;
      h.cylinder(0.03, 0.03, 0.08, [0, 0.07, 0], dark, 10);
      h.ball([0.05, 0.065, 0.05], [0, -0.06, 0], lens(a.state === 'dead'), 14);
      beamR = 0.2;
    }
    // Yoke around the head.
    const yoke = s.ring(reach + 0.03, 0.014, [head.position.x, head.position.y + 0.02, head.position.z], chrome, Math.PI);
    yoke.rotation.y = Math.PI / 2;
    yoke.scale.y = (0.12 + 0.1) / (reach + 0.03);

    const tilt = a.aim === 'forward' ? mix(0.95, 1.2, random()) : aside ? -0.9 : mix(0.4, 0.6, random());
    if (aside) head.rotation.z = 0.95; else head.rotation.x = -tilt;
    head.rotation.y = aside ? 0 : (random() - 0.5) * 0.2;

    // The visible beam and its pool on the floor.
    if (power >= 1 && !aside) {
      const length = a.aim === 'forward' ? 1.5 : (head.position.y - 0.2) / Math.cos(tilt);
      const spread = beamR * (a.aim === 'forward' ? 1.9 : 2.1);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(beamR * 0.8, spread, length, 28, 1, true), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: a.state === 'blazing' ? 0.16 : 0.09, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = -0.14 - length / 2;
      h.root.add(beam);
      if (a.aim === 'down') {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(spread, 32), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.4, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(head.position.x, 0.004, head.position.z + Math.tan(tilt) * head.position.y);
        pool.scale.y = 1 / Math.cos(tilt);
        s.root.add(pool);
      }
    }

    if (a.satellite) {
      const e2: [number, number, number] = [-0.5, top + 0.02, 0.25], h2: [number, number, number] = [-0.42, top - 0.5, 0.55];
      s.rod([px, top - 0.08, pz], e2, 0.02, paint);
      s.ball([0.04, 0.04, 0.04], e2, chrome, 10);
      s.rod(e2, h2, 0.016, paint);
      const small = new Sculpture(context);
      small.lathe([[0.001, 0.03], [0.08, 0.025], [0.2, -0.03], [0.21, -0.06], [0.001, -0.06]], paint);
      for (let i = 0; i < 3; i++) small.cylinder(0.062, 0.062, 0.016, [Math.cos(i * 2.094) * 0.1, -0.066, Math.sin(i * 2.094) * 0.1], lens(a.state === 'dead' && i === 0 && deadIndex > 3), 14);
      small.root.position.set(h2[0], h2[1] - 0.04, h2[2]);
      small.root.rotation.set(-0.5, 0, 0.25);
      s.root.add(small.root);
    }
    if (a.extras === 'cable') {
      const sway = random() - 0.5;
      s.tube([[px, 0.5, pz - 0.03], [px - 0.08, 0.1, pz - 0.1], [px - 0.3, 0.012, pz + 0.2 + sway * 0.2], [px + 0.2, 0.012, pz + 0.7], [px + 0.8 + sway * 0.4, 0.012, pz + 0.9], [px + 1.3, 0.012, pz + 0.6 + sway * 0.3]], 0.012, dark);
      s.box([0.06, 0.035, 0.04], [px + 1.33, 0.018, pz + 0.6 + sway * 0.3], s.material('#e9e9e2'));
    }
    if (a.extras === 'camera') {
      const c: [number, number, number] = [px + 0.3, top - 0.5, pz + 0.35];
      s.rod([px, top - 0.4, pz], c, 0.014, chrome);
      s.box([0.16, 0.12, 0.2], [c[0], c[1] - 0.05, c[2] + 0.05], dark).rotation.set(0.5, -0.5, 0);
      s.cylinder(0.045, 0.05, 0.08, [c[0] + 0.06, c[1] - 0.11, c[2] + 0.15], chrome, 14).rotation.set(1.05, 0, -0.45);
      s.ball([0.012, 0.012, 0.012], [c[0] - 0.02, c[1] + 0.03, c[2] + 0.12], s.material('#ff3b2f', { emissive: '#ff3b2f', emissiveIntensity: 1.5 }), 8);
    }
    if (a.extras === 'drape') {
      const cloth = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#b9d6c6' : '#d9d6c6', roughness: 0.95, side: THREE.DoubleSide });
      const drape = new THREE.Mesh(new THREE.SphereGeometry(reach * 1.06, 18, 10, 0, Math.PI * 1.1, 0, Math.PI * 0.62), cloth);
      drape.scale.y = 0.5;
      drape.position.y = -0.05;
      drape.rotation.y = random() * 6;
      drape.castShadow = true;
      h.root.add(drape);
    }

    const base = lit.map((material) => material.emissiveIntensity);
    const rate = mix(4, 19, mood.energy), phase = random() * 10;
    return s.finish({
      footprint: 0.9,
      update: (_dt, time) => {
        if (a.state !== 'flicker') return;
        const wave = Math.sin(time * rate + phase) * Math.sin(time * rate * 0.37 + 1) > -0.25 ? 1 : 0.12;
        lit.forEach((material, index) => { material.emissiveIntensity = base[index] * wave; });
      },
    });
  },
});

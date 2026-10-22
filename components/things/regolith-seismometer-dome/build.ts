import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    shield: choice('What kind of shield covers the instrument?', {
      silver: 'A smooth silver dome with a grapple knob on top, like an upturned mixing bowl.',
      white: 'A white hard-shell dome with a red stripe.',
      gold: 'A dome wrapped in crinkled gold foil.',
      faceted: 'A low faceted dome of flat copper panels.',
      drum: 'A squat drum with a flat lid, older and plainer.',
    }),
    skirt: choice('What seals it to the ground?', {
      pleated: 'A pleated metal skirt that drapes to the dust like chain mail.',
      blanket: 'A wide silver thermal blanket spread flat around it like a picnic rug.',
      bare: 'Nothing: it just sits on three small feet.',
    }),
    state: choice('How is it sitting?', {
      level: 'Dead level, exactly as placed.',
      sinking: 'Tilted, settling into a soft hollow.',
      buried: 'Half buried under a slump of dust.',
      unshielded: 'The dome has been lifted off and set beside it, the gold instrument exposed on its tripod.',
    }),
    hearing: choice('What is it hearing right now?', {
      silence: 'Nothing. Years of nothing.',
      quake: 'A moonquake: the ground is ringing, rings of disturbed dust spreading out around it.',
      impact: 'A meteorite has just struck close by, leaving a small fresh crater.',
      footsteps: 'Footsteps: a line of bootprints comes up to it and stops.',
    }),
    cable: choice('What is its tether like?', {
      ribbon: 'A flat gold ribbon cable, wide as a hand.',
      round: 'A thick black round cable with a white stripe.',
      braided: 'A pale braided umbilical with pull-loops along it.',
    }),
    end: choice('Where does the tether go?', {
      away: 'It runs off toward the lander and out of sight, pinned down along the way.',
      relay: 'To a small relay box with a whip antenna and a solar cell.',
      spool: 'To the spool it was unreeled from, left lying on its side.',
      cut: 'Nowhere: it has been cut, and the frayed end lies in the dust.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = Math.min(0.75, (a.state === 'buried' ? 0.35 : 0.04) + mood.wear * 0.5);
    const grime = new THREE.Color('#8d8982');
    const tone = (hex: string, extra = 1) => new THREE.Color(hex).lerp(grime, Math.min(0.85, dust * extra));
    const mat = (hex: string, metalness = 0, roughness = 0.5, more: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: tone(hex), metalness: metalness * (1 - dust * 0.9), roughness: mix(roughness, 0.95, dust), ...more });
    const ground = new THREE.MeshStandardMaterial({ color: '#8d8982', roughness: 1 });
    const paleGround = new THREE.MeshStandardMaterial({ color: '#b3afa6', roughness: 1 });
    const steel = mat('#c9ced1', 0.8, 0.3), dark = mat('#1d1f22', 0.2, 0.8), gold = mat('#d6a53a', 0.85, 0.32);

    // --- The dome ---------------------------------------------------------------------------------
    const shieldHex = { silver: '#d5dadd', white: '#eeece6', gold: '#d6a53a', faceted: '#b9703c', drum: '#c3c6c2' }[a.shield];
    const shellMaterial = mat(shieldHex, a.shield === 'white' ? 0.05 : 0.8, a.shield === 'silver' ? 0.22 : 0.4, { side: THREE.DoubleSide, flatShading: a.shield === 'faceted' || a.shield === 'gold' });
    const dome = new Sculpture(context);
    const D = dome.root;
    const R = 0.36;
    if (a.shield === 'drum') {
      dome.cylinder(R * 0.86, R * 0.86, 0.3, [0, 0.19, 0], shellMaterial, 28);
      dome.cylinder(R * 0.92, R * 0.92, 0.035, [0, 0.355, 0], steel, 28);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; dome.box([0.05, 0.03, 0.03], [Math.cos(t) * R * 0.9, 0.34, Math.sin(t) * R * 0.9], dark).rotation.y = -t; }
    } else if (a.shield === 'faceted') {
      const shell = dome.mesh(new THREE.SphereGeometry(R, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), shellMaterial, [0, 0.04, 0]);
      shell.scale.y = 0.9;
      dome.cylinder(R, R, 0.045, [0, 0.04, 0], steel, 8).rotation.y = Math.PI / 8;
      shell.rotation.y = Math.PI / 8 + Math.PI / 2;
    } else {
      const shellGeometry = new THREE.SphereGeometry(R, a.shield === 'gold' ? 14 : 36, a.shield === 'gold' ? 6 : 14, 0, Math.PI * 2, 0, Math.PI / 2);
      if (a.shield === 'gold') {
        const p = shellGeometry.attributes.position as THREE.BufferAttribute;
        const seen = new Map<string, number>();
        for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!seen.has(key)) seen.set(key, mix(0.965, 1.035, random())); const k = p.getY(i) < 0.01 ? 1 : seen.get(key)!; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
        shellGeometry.computeVertexNormals();
      }
      const shell = dome.mesh(shellGeometry, shellMaterial, [0, 0.06, 0]);
      shell.scale.y = 0.92;
      dome.cylinder(R + 0.004, R + 0.004, 0.06, [0, 0.05, 0], a.shield === 'white' ? mat('#c8242b', 0, 0.6) : steel, 36);
      if (a.shield === 'white') { const stripe = dome.ring(R * 0.81, 0.012, [0, 0.06 + R * 0.92 * 0.585, 0], mat('#c8242b', 0, 0.6)); stripe.rotation.x = Math.PI / 2; }
    }
    // Grapple knob so an arm (or a glove) can lift it.
    const crown = a.shield === 'drum' ? 0.37 : a.shield === 'faceted' ? 0.04 + R * 0.9 : 0.06 + R * 0.92;
    dome.cylinder(0.018, 0.024, 0.07, [0, crown + 0.03, 0], steel, 10);
    dome.ball([0.04, 0.032, 0.04], [0, crown + 0.08, 0], steel, 12);
    // Thermal skirt.
    if (a.skirt === 'pleated') {
      const pleats = new THREE.CylinderGeometry(R * (a.shield === 'drum' ? 0.88 : 1.0), R * 1.3, 0.11, 60, 2, true);
      const p = pleats.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const low = (0.055 - p.getY(i)) / 0.11, angle = Math.atan2(p.getZ(i), p.getX(i));
        const push = 1 + Math.sin(angle * 30) * 0.045 * low + Math.sin(angle * 5 + 1) * 0.03 * low;
        p.setXYZ(i, p.getX(i) * push, p.getY(i), p.getZ(i) * push);
      }
      pleats.computeVertexNormals();
      dome.mesh(pleats, mat('#b9bec2', 0.75, 0.4, { side: THREE.DoubleSide, flatShading: true }), [0, 0.055, 0]);
    } else if (a.skirt === 'bare') {
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.3; dome.cylinder(0.035, 0.04, 0.03, [Math.cos(t) * R * 0.92, 0.015, Math.sin(t) * R * 0.92], dark, 10); }
    }
    // Connector box where the tether leaves, with a status lamp.
    const lamp = new THREE.MeshStandardMaterial({ color: '#12240f', emissive: mood.cheer > 0.35 ? '#4dff6a' : '#ff5a2a', emissiveIntensity: 1.3 });
    const port: P3 = [R + 0.05, 0.05, 0];

    // --- The instrument underneath ---------------------------------------------------------------------
    const exposed = a.state === 'unshielded';
    const site = new THREE.Group(); // everything that tilts or sinks together
    s.root.add(site);
    const instrument = new Sculpture(context);
    if (exposed) {
      const hex = instrument.cylinder(0.14, 0.14, 0.15, [0, 0.16, 0], gold, 6);
      hex.rotation.y = 0.2;
      instrument.cylinder(0.15, 0.15, 0.02, [0, 0.245, 0], steel, 6).rotation.y = 0.2;
      const cradle = instrument.ring(0.19, 0.012, [0, 0.1, 0], steel);
      cradle.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.7;
        instrument.rod([Math.cos(t) * 0.19, 0.1, Math.sin(t) * 0.19], [Math.cos(t) * 0.25, 0.012, Math.sin(t) * 0.25], 0.012, steel);
        instrument.cylinder(0.03, 0.045, 0.02, [Math.cos(t) * 0.25, 0.01, Math.sin(t) * 0.25], gold, 10);
        instrument.ball([0.05, 0.05, 0.05], [Math.cos(t + 1.05) * 0.115, 0.29, Math.sin(t + 1.05) * 0.115], steel, 12);
      }
      site.add(instrument.root);
      // The dome set down beside it, tipped on its rim.
      D.position.set(-0.72, 0.05, 0.25 + random() * 0.2);
      D.rotation.set(0.1, random() * 3, mix(0.25, 0.5, random()));
      s.root.add(D);
    } else site.add(D);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.14), dark);
    box.position.set(exposed ? 0.2 : port[0], 0.045, 0);
    box.castShadow = true;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), lamp);
    bulb.position.set(box.position.x, 0.088, 0.04);
    site.add(box, bulb);

    if (a.skirt === 'blanket') {
      const rug = new THREE.CircleGeometry(0.82, 28);
      const p = rug.attributes.position as THREE.BufferAttribute;
      for (let i = 1; i < p.count; i++) { const k = mix(0.86, 1.08, random()); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, 0); }
      rug.rotateX(-Math.PI / 2);
      const blanket = new THREE.Mesh(rug, mat('#c9ced1', 0.7, 0.35, { side: THREE.DoubleSide, flatShading: true }));
      blanket.position.y = 0.012;
      blanket.receiveShadow = true;
      site.add(blanket);
      for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2 + 0.4; const peg = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: '#6f6b65', roughness: 1, flatShading: true })); peg.position.set(Math.cos(t) * 0.72, 0.03, Math.sin(t) * 0.72); peg.castShadow = true; site.add(peg); }
    }

    if (a.state === 'sinking') {
      site.rotation.set(mix(-0.1, 0.1, random()), 0, -mix(0.16, 0.3, random()));
      site.position.y = -0.05;
      const hollow = s.ring(0.53, 0.05, [0.04, -0.012, 0], ground);
      hollow.rotation.x = Math.PI / 2; hollow.scale.z = 0.5;
      s.cylinder(0.5, 0.5, 0.01, [0.04, 0.004, 0], new THREE.MeshStandardMaterial({ color: '#827e77', roughness: 1 }), 28).castShadow = false;
    } else if (a.state === 'buried') {
      for (let i = 0; i < 5; i++) {
        const t = Math.PI + (i - 2) * 0.42 + (random() - 0.5) * 0.2;
        s.ball([mix(0.35, 0.55, random()), mix(0.16, 0.3, random()), mix(0.3, 0.45, random())], [Math.cos(t) * 0.42, 0, Math.sin(t) * 0.42], ground, 14);
      }
      s.ball([0.9, 0.1, 0.7], [-0.75, 0, 0], ground, 16).castShadow = false;
    }
    if (dust > 0.3 && !exposed) {
      // A cap of settled dust on the crown.
      const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.005, 20, 5, 0, Math.PI * 2, 0, mix(0.3, 0.75, dust)), new THREE.MeshStandardMaterial({ color: '#959189', roughness: 1 }));
      cap.position.y = a.shield === 'drum' ? 0.375 - R * 0.9 : 0.062; cap.scale.y = a.shield === 'drum' ? 0.9 : 0.925;
      if (a.shield !== 'drum' && a.shield !== 'faceted') D.add(cap); else cap.geometry.dispose();
    }

    // --- Tether ---------------------------------------------------------------------------------------
    // A quiet, low-energy scene leaves it lying in slack loops; a tense one pulls it straight.
    const slack = mix(1, 0.08, mood.energy), reach = 1.85, heading = mix(-0.5, 0.2, random());
    const start = new THREE.Vector3(box.position.x + 0.05, 0.04, 0).applyEuler(site.rotation).add(site.position);
    const cut = a.end === 'cut' ? mix(0.45, 0.7, random()) : 1;
    const curve: THREE.Vector3[] = [start.clone()];
    const n = 16;
    for (let i = 1; i <= n; i++) {
      const f = (i / n) * cut, along = f * reach, wave = Math.sin(f * Math.PI * mix(2, 5, slack) + heading * 7) * 0.26 * slack * Math.sin(Math.min(1, f * 1.4) * Math.PI * 0.5);
      const hump = Math.max(0, Math.sin(f * 9 + 2)) * 0.035 * slack;
      curve.push(new THREE.Vector3(start.x + 0.08 + Math.cos(heading) * along - Math.sin(heading) * wave, 0.012 + hump + (i < 2 ? 0.02 : 0), Math.sin(heading) * along + Math.cos(heading) * wave));
    }
    const path = new THREE.CatmullRomCurve3(curve);
    const tip = curve[curve.length - 1];
    if (a.cable === 'ribbon') {
      const steps = 80, half = 0.045, positions: number[] = [], indices: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const p = path.getPoint(i / steps), t = path.getTangent(i / steps), side = new THREE.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(half);
        positions.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y + 0.004, p.z + side.z);
        if (i < steps) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
      }
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      ribbon.setIndex(indices);
      ribbon.computeVertexNormals();
      s.mesh(ribbon, mat('#c98f2c', 0.6, 0.45, { side: THREE.DoubleSide }));
      for (let i = 1; i < 7; i++) { const p = path.getPoint(i / 7), t = path.getTangent(i / 7); const bar = s.box([0.012, 0.006, 0.1], [p.x, p.y + 0.004, p.z], dark); bar.rotation.y = Math.atan2(-t.z, t.x); bar.castShadow = false; }
    } else {
      s.mesh(new THREE.TubeGeometry(path, 80, a.cable === 'round' ? 0.022 : 0.018, 8), a.cable === 'round' ? dark : mat('#e4dfd0', 0, 0.8));
      for (let i = 1; i < 8; i++) {
        const p = path.getPoint(i / 8), t = path.getTangent(i / 8);
        if (a.cable === 'round') { const mark = s.cylinder(0.024, 0.024, 0.03, [p.x, p.y, p.z], mat('#ecebe5'), 8); mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t); }
        else { const loop = s.ring(0.03, 0.006, [p.x, p.y + 0.03, p.z], mat('#d9532c', 0, 0.7)); loop.rotation.y = Math.atan2(-t.z, t.x) + Math.PI / 2; }
      }
    }
    if (a.end === 'away') {
      for (const f of [0.35, 0.72]) { const p = path.getPoint(f); s.rod([p.x, 0.1, p.z], [p.x, -0.02, p.z], 0.007, steel); s.box([0.13, 0.008, 0.02], [p.x, 0.035, p.z], steel).rotation.y = Math.atan2(-path.getTangent(f).z, path.getTangent(f).x) + Math.PI / 2; }
    } else if (a.end === 'relay') {
      s.box([0.28, 0.2, 0.22], [tip.x + 0.12, 0.13, tip.z], mat('#e7e4da', 0.1, 0.6));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.cylinder(0.014, 0.014, 0.04, [tip.x + 0.12 + sx * 0.11, 0.02, tip.z + sz * 0.08], dark, 6);
      const cell = s.box([0.34, 0.012, 0.26], [tip.x + 0.12, 0.3, tip.z - 0.04], mat('#1f3f8f', 0.5, 0.3));
      cell.rotation.x = -0.5;
      s.rod([tip.x + 0.12, 0.23, tip.z - 0.02], [tip.x + 0.12, 0.29, tip.z - 0.03], 0.012, steel);
      s.rod([tip.x + 0.23, 0.23, tip.z + 0.08], [tip.x + 0.27, 0.78, tip.z + 0.1], 0.006, steel, 0.003);
    } else if (a.end === 'spool') {
      const drum = new Sculpture(context);
      drum.cylinder(0.07, 0.07, 0.16, [0, 0, 0], a.cable === 'ribbon' ? mat('#c98f2c', 0.6, 0.45) : dark, 14);
      for (const side of [-1, 1]) drum.cylinder(0.16, 0.16, 0.012, [0, side * 0.085, 0], mat('#d9532c', 0.2, 0.6), 20);
      drum.root.rotation.set(Math.PI / 2 - 0.08, 0, 0.5 + random());
      drum.root.position.set(tip.x + 0.1, 0.1, tip.z + 0.05);
      s.root.add(drum.root);
    } else {
      for (let i = 0; i < 6; i++) s.rod([tip.x, tip.y + 0.005, tip.z], [tip.x + mix(0.03, 0.09, random()), tip.y + mix(0, 0.05, random()), tip.z + (random() - 0.5) * 0.1], 0.004, i % 2 ? gold : mat('#b3202c'));
    }

    // --- What it hears ------------------------------------------------------------------------------
    const ripples: THREE.Mesh[] = [];
    if (a.hearing === 'quake') {
      for (let i = 0; i < 4; i++) {
        const ring = s.ring(1, 0.014, [0, 0.004, 0], paleGround);
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = false;
        ring.userData.offset = i / 4;
        ripples.push(ring);
      }
      const shaken = Array.from({ length: Math.round(mix(20, 60, mood.density)) }, () => { const t = random() * Math.PI * 2, r = mix(0.55, 1.5, random()); return { at: [Math.cos(t) * r, mix(0.01, 0.05, random()), Math.sin(t) * r] as P3, size: mix(0.008, 0.026, random()) }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), ground, shaken);
    } else if (a.hearing === 'impact') {
      const t = mix(1.6, 2.6, random()), cx = Math.cos(t) * 0.95, cz = Math.sin(t) * 0.95;
      const rim = s.ring(0.24, 0.05, [cx, 0, cz], paleGround);
      rim.rotation.x = Math.PI / 2; rim.scale.z = 0.7;
      s.cylinder(0.22, 0.22, 0.008, [cx, 0.004, cz], new THREE.MeshStandardMaterial({ color: '#4c4945', roughness: 1 }), 18).castShadow = false;
      for (let i = 0; i < 14; i++) { const d = random() * Math.PI * 2, len = mix(0.1, 0.38, random()); const ray = s.box([0.014, 0.005, len], [cx + Math.sin(d) * (0.3 + len / 2), 0.003, cz + Math.cos(d) * (0.3 + len / 2)], paleGround); ray.rotation.y = d; ray.castShadow = false; }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#6f6b65', roughness: 1, flatShading: true }), Array.from({ length: 16 }, () => { const d = random() * Math.PI * 2, r = mix(0.3, 0.8, random()); return { at: [cx + Math.cos(d) * r, 0.015, cz + Math.sin(d) * r] as P3, size: mix(0.012, 0.04, random()) }; }));
    } else if (a.hearing === 'footsteps') {
      const from = mix(1.9, 2.5, random());
      const prints = Array.from({ length: 7 }, (_unused, i) => { const r = 0.72 + i * 0.3, t = from + Math.sin(i * 0.7) * 0.08; const side = i % 2 ? 0.1 : -0.1; return { at: [Math.cos(t) * r - Math.sin(t) * side, 0.004, Math.sin(t) * r + Math.cos(t) * side] as P3, turn: -t - Math.PI / 2 }; });
      const tread = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.17, 2, 8).rotateX(Math.PI / 2).scale(1, 0.08, 1), new THREE.MeshStandardMaterial({ color: '#4d4a46', roughness: 1 }), prints.length);
      const matrix = new THREE.Matrix4();
      prints.forEach((print, i) => tread.setMatrixAt(i, matrix.makeRotationY(print.turn).setPosition(...print.at)));
      s.root.add(tread);
    }

    const ringing = a.hearing === 'quake' ? mix(0.4, 1.6, mood.energy) : 0;
    const home = site.position.clone();
    const place = (time: number) => { for (const ring of ripples) { const f = (time * ringing * 0.35 + ring.userData.offset) % 1, r = mix(0.6, 1.6, f); ring.scale.set(r, r, 1 - f * 0.6); } };
    place(0);
    return s.finish({
      footprint: 1.25,
      update: (_dt, time) => {
        lamp.emissiveIntensity = a.hearing === 'silence' ? (Math.sin(time * mix(0.6, 2, mood.energy)) > 0.9 ? 2.2 : 0.25) : (Math.sin(time * 14) > 0 ? 2.6 : 0.4);
        if (ringing) { place(time); site.position.set(home.x + Math.sin(time * 37) * 0.003 * ringing, home.y, home.z + Math.cos(time * 31) * 0.003 * ringing); }
      },
    });
  },
});

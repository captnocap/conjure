import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const FROGS = {
  green: { skin: '#4f9a3c', belly: '#d9e3a8', spots: null },
  brown: { skin: '#7a5a34', belly: '#d8c8a0', spots: '#4a3520' },
  spotted: { skin: '#b8b63a', belly: '#f0ecc0', spots: '#2a2a1e' },
  blue: { skin: '#2c6fd6', belly: '#8fc0f0', spots: '#102a60' },
  albino: { skin: '#f0d6cc', belly: '#fbeee8', spots: null },
} as const;

export default defineThing({
  questions: {
    subject: choice('What is levitating in the tube?', {
      frog: 'A small frog, limbs splayed, looking faintly surprised.',
      strawberry: 'A fat red strawberry with its green crown.',
      drop: 'A wobbling drop of water.',
      mouse: 'A small grey mouse, tail hanging.',
    }),
    colour: choice('If it is a frog, what colour is it?', {
      green: 'Plain pond green with a pale belly.',
      brown: 'Mottled brown, a garden toad.',
      spotted: 'Yellow with dark spots.',
      blue: 'Bright poison-dart blue.',
      albino: 'A pale pinkish albino.',
    }),
    field: choice('What is the field doing?', {
      off: 'Off: the subject sits on the coil at the bottom of the tube, readout dark.',
      on: 'On: the subject hovers mid-tube, turning slowly.',
      max: 'Full field: the subject floats high in the tube, spinning and bobbing, readout lit.',
    }),
    tube: score('How tall is the glass tube?', ['A short jar', 'A hand span', 'A forearm', 'A long column']),
    mount: choice('What is the apparatus mounted on?', {
      bench: 'A black bench plate with a small digital readout.',
      bore: 'A bolted steel bore flange, as if sitting on top of a magnet.',
      stand: 'A lab stand with a clamp arm gripping the tube.',
    }),
    ruler: noul('Is a yellow ruler clipped alongside the tube?'),
    card: choice('What does the propped card say?', {
      tesla: '16 T', touch: 'DO NOT TOUCH', frog: 'FROG 1997', nothing: 'There is no card.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const copper = s.material('#c0773c', { metalness: 0.85, roughness: 0.3 });
    const steel = s.material('#8a9096', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#24272b', { roughness: 0.7 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8ecff', transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });

    // Mount.
    let baseTop = 0.03;
    if (a.mount === 'bench') {
      s.box([0.36, 0.03, 0.3], [0, 0.015, 0], dark);
      s.box([0.11, 0.06, 0.07], [0.13, 0.06, 0.1], s.material('#3a3f46', { roughness: 0.6 }));
      const lit = a.field !== 'off';
      const text = a.field === 'off' ? '--.- T' : a.field === 'on' ? '12.4 T' : '16.0 T';
      const readout = s.label(text, 0.09, 0.032, [0.13, 0.065, 0.1355], lit ? '#ff5a3a' : '#3a2a26', '#17191c');
      if (lit) {
        (readout.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ff3a1a');
        (readout.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
      }
    } else if (a.mount === 'bore') {
      baseTop = 0.05;
      s.cylinder(0.21, 0.21, 0.05, [0, 0.025, 0], steel, 36);
      for (let i = 0; i < 8; i++) s.cylinder(0.014, 0.014, 0.02, [Math.sin(i * 0.785) * 0.18, 0.058, Math.cos(i * 0.785) * 0.18], dark, 6);
    } else {
      s.box([0.22, 0.025, 0.16], [-0.17, 0.0125, 0], s.material('#2f3236', { roughness: 0.6 }));
      s.cylinder(0.0075, 0.0075, 0.72, [-0.24, 0.36, 0], steel, 10);
      baseTop = 0.025;
      s.cylinder(0.1, 0.1, 0.025, [0, 0.0125, 0], dark, 28);
    }

    // The coil ring: two stacked copper tori round a dark bore.
    const coilY = baseTop + 0.035;
    s.ring(0.095, 0.032, [0, coilY, 0], copper).rotation.x = Math.PI / 2;
    s.ring(0.095, 0.03, [0, coilY + 0.058, 0], copper).rotation.x = Math.PI / 2;
    s.cylinder(0.065, 0.065, 0.1, [0, coilY + 0.03, 0], dark, 24);
    for (const side of [-1, 1]) s.box([0.03, 0.02, 0.03], [side * 0.125, coilY, 0.04], brass);
    s.tube([[0.13, coilY, 0.04], [0.19, coilY - 0.01, 0.08], [0.2, baseTop + 0.01, 0.16]], 0.006, s.material('#b3261e', { roughness: 0.8 }));
    s.tube([[-0.13, coilY, 0.04], [-0.19, coilY - 0.01, 0.08], [-0.2, baseTop + 0.01, 0.16]], 0.006, s.material('#1f3a8a', { roughness: 0.8 }));

    // Glass tube between two uprights.
    const T = mix(0.22, 0.62, a.tube);
    const tubeBottom = coilY + 0.09;
    const tubeTop = tubeBottom + T;
    s.cylinder(0.07, 0.07, T, [0, tubeBottom + T / 2, 0], glass, 28);
    s.ring(0.072, 0.009, [0, tubeBottom + 0.012, 0], brass).rotation.x = Math.PI / 2;
    s.ring(0.072, 0.009, [0, tubeTop - 0.012, 0], brass).rotation.x = Math.PI / 2;
    if (a.mount === 'stand') {
      s.box([0.2, 0.014, 0.02], [-0.14, tubeTop - 0.03, 0], steel);
      s.box([0.03, 0.03, 0.04], [-0.24, tubeTop - 0.03, 0], dark);
      const clamp = s.ring(0.085, 0.008, [0, tubeTop - 0.03, 0], dark, Math.PI * 1.3);
      clamp.rotation.x = Math.PI / 2;
      clamp.rotation.z = Math.PI * 0.85;
    } else {
      for (const x of [-0.13, 0.13]) s.cylinder(0.006, 0.006, tubeTop + 0.02 - baseTop, [x, (tubeTop + 0.02 + baseTop) / 2, 0], steel, 8);
      s.box([0.29, 0.012, 0.018], [0, tubeTop + 0.02, 0], steel);
    }
    if (a.ruler) {
      const ticks = paint(64, 512, (ctx) => {
        ctx.fillStyle = '#f0c419';
        ctx.fillRect(0, 0, 64, 512);
        ctx.fillStyle = '#1d1d1f';
        for (let i = 0; i <= 50; i++) {
          const y = 6 + (i / 50) * 500;
          ctx.fillRect(0, y, i % 10 === 0 ? 40 : i % 5 === 0 ? 26 : 14, 2);
        }
        ctx.font = 'bold 20px monospace';
        for (let i = 0; i <= 5; i++) ctx.fillText(String(i * 10), 40, 14 + (i / 5) * 500);
      });
      const ruler = s.mesh(new THREE.PlaneGeometry(0.022, T * 0.9), new THREE.MeshStandardMaterial({ map: ticks, roughness: 0.6, side: THREE.DoubleSide }), [0.083, tubeBottom + T * 0.5, 0.03]);
      ruler.rotation.y = 0.35;
      for (const y of [tubeBottom + T * 0.15, tubeBottom + T * 0.85]) s.box([0.02, 0.012, 0.02], [0.082, y, 0.02], dark);
    }

    // The subject, in a group that hovers and turns.
    const hover = new THREE.Group();
    let subjectHalf = 0.02;
    if (a.subject === 'frog') {
      const frog = FROGS[a.colour];
      const skin = s.material(frog.skin, { roughness: 0.45 });
      const belly = s.material(frog.belly, { roughness: 0.5 });
      const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); hover.add(mesh); return mesh; };
      add(s.ball([0.03, 0.021, 0.037], [0, 0, 0], skin, 16));
      add(s.ball([0.026, 0.015, 0.03], [0, -0.008, 0.004], belly, 12));
      add(s.ball([0.024, 0.016, 0.022], [0, 0.005, 0.027], skin, 14));
      for (const side of [-1, 1]) {
        add(s.ball([0.009, 0.009, 0.009], [side * 0.013, 0.016, 0.034], skin, 10));
        add(s.ball([0.0045, 0.0045, 0.0045], [side * 0.014, 0.017, 0.041], s.material('#101010', { roughness: 0.3 }), 8));
        // Back legs folded and splayed, front legs reaching down.
        add(s.ball([0.012, 0.009, 0.02], [side * 0.03, -0.006, -0.012], skin, 10)).rotation.y = side * 0.5;
        add(s.rod([side * 0.036, -0.01, -0.02], [side * 0.05, -0.02, 0.005], 0.004, skin));
        add(s.ball([0.009, 0.004, 0.012], [side * 0.052, -0.022, 0.01], skin, 8));
        add(s.rod([side * 0.02, -0.004, 0.02], [side * 0.034, -0.022, 0.03], 0.0035, skin));
        add(s.ball([0.008, 0.003, 0.009], [side * 0.036, -0.024, 0.032], skin, 8));
      }
      if (frog.spots) {
        const spot = s.material(frog.spots, { roughness: 0.5 });
        for (let i = 0; i < 9; i++) {
          const u = random() * Math.PI * 2, v = random() * 0.9 + 0.2;
          add(s.ball([0.005, 0.003, 0.005], [Math.sin(u) * 0.027 * Math.sin(v), 0.021 * Math.cos(v), Math.cos(u) * 0.034 * Math.sin(v)], spot, 6));
        }
      }
      subjectHalf = 0.028;
    } else if (a.subject === 'strawberry') {
      const red = s.material('#d8242e', { roughness: 0.4 });
      const berry = s.lathe([[0, 0], [0.018, 0.004], [0.028, 0.022], [0.027, 0.042], [0.016, 0.06], [0, 0.066]], red, [0, -0.033, 0]);
      s.root.remove(berry); hover.add(berry);
      const seeds: { at: P3; size: number }[] = [];
      for (let i = 0; i < 40; i++) {
        const t = 0.1 + random() * 0.85, u = random() * Math.PI * 2;
        const r = t < 0.35 ? 0.018 + t * 0.03 : t < 0.65 ? 0.028 : 0.028 - (t - 0.65) * 0.04;
        seeds.push({ at: [Math.sin(u) * r, -0.033 + t * 0.066, Math.cos(u) * r], size: 0.0022 });
      }
      const seedMesh = s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#f0d060', { roughness: 0.5 }), seeds);
      s.root.remove(seedMesh); hover.add(seedMesh);
      const leaf = s.material('#3f8a2e', { roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const l = s.ball([0.006, 0.002, 0.016], [Math.sin(i * 1.047) * 0.012, 0.033, Math.cos(i * 1.047) * 0.012], leaf, 8);
        l.rotation.y = i * 1.047;
        l.rotation.x = -0.4;
        s.root.remove(l); hover.add(l);
      }
      const stem = s.cylinder(0.002, 0.002, 0.02, [0, 0.042, 0], leaf, 6);
      s.root.remove(stem); hover.add(stem);
      subjectHalf = 0.034;
    } else if (a.subject === 'drop') {
      const water = new THREE.MeshPhysicalMaterial({ color: '#9fd0f0', transparent: true, opacity: 0.6, roughness: 0.02, metalness: 0.1, depthWrite: false });
      const drop = s.ball([0.022, 0.024, 0.022], [0, 0, 0], water, 20);
      s.root.remove(drop); hover.add(drop);
      const highlight = s.ball([0.005, 0.004, 0.005], [-0.007, 0.012, 0.012], s.material('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 6);
      s.root.remove(highlight); hover.add(highlight);
      subjectHalf = 0.024;
    } else {
      const fur = s.material('#8c8a86', { roughness: 0.75 });
      const pink = s.material('#e8a0b0', { roughness: 0.6 });
      const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); hover.add(mesh); return mesh; };
      add(s.ball([0.02, 0.018, 0.034], [0, 0, -0.004], fur, 14));
      add(s.ball([0.013, 0.012, 0.017], [0, 0.003, 0.028], fur, 12));
      add(s.ball([0.003, 0.003, 0.003], [0, 0.002, 0.044], pink, 6));
      for (const side of [-1, 1]) {
        add(s.ball([0.008, 0.008, 0.003], [side * 0.01, 0.015, 0.024], pink, 10));
        add(s.ball([0.002, 0.002, 0.002], [side * 0.007, 0.007, 0.04], s.material('#101010'), 6));
        add(s.rod([side * 0.012, -0.008, 0.012], [side * 0.016, -0.026, 0.018], 0.0025, pink));
        add(s.rod([side * 0.014, -0.008, -0.014], [side * 0.02, -0.028, -0.01], 0.003, pink));
      }
      add(s.tube([[0, -0.004, -0.036], [0.01, -0.02, -0.05], [-0.01, -0.045, -0.04]], 0.002, pink));
      subjectHalf = 0.03;
    }
    const restY = a.field === 'off' ? tubeBottom + 0.02 + subjectHalf * 1.3 : a.field === 'on' ? tubeBottom + T * 0.5 : tubeBottom + T * 0.72;
    hover.position.set(0, restY, 0);
    hover.scale.setScalar(1.3);
    hover.rotation.y = random() * Math.PI * 2;
    if (a.field !== 'off') hover.rotation.z = (random() - 0.5) * 0.4;
    s.root.add(hover);

    if (a.card !== 'nothing') {
      const text = { tesla: '16 T', touch: 'DO NOT TOUCH', frog: 'FROG 1997' }[a.card];
      const card = s.label(text, 0.12, 0.06, [-0.15, 0.035, 0.11], '#2a2a2c', '#f2eee2');
      card.rotation.set(-0.25, -0.3, 0);
      card.position.y += a.mount === 'bench' ? 0.03 : 0;
    }

    const spin = a.field === 'off' ? 0 : a.field === 'on' ? 0.6 : 1.6;
    const bobAmp = a.field === 'off' ? 0 : a.field === 'on' ? 0.006 : 0.012;
    const energy = 0.4 + mood.energy;
    return s.finish({
      update: (dt, time) => {
        hover.rotation.y += dt * spin * energy;
        hover.position.y = restY + Math.sin(time * 1.4 * energy) * bobAmp;
        if (a.field !== 'off') hover.rotation.x = Math.sin(time * 0.9) * 0.12;
        if (a.subject === 'drop') hover.scale.set(1 + Math.sin(time * 5) * 0.06, 1 - Math.sin(time * 5) * 0.06, 1 + Math.cos(time * 4) * 0.05);
      },
    });
  },
});

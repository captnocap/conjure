import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex, paintIsMetal } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    style: choice('What kind of hat is it?', {
      crisp: 'A crisp storybook cone, tall and straight with a flat stiff brim.',
      crumpled: 'A crumpled old hat, the tall crown creased and bent over at the tip.',
      floppy: 'A wide floppy brim that droops in waves, a soft crown with a lazy lean.',
    }),
    colour: paint('What colour is the hat?', ['black', 'purple', 'forest', 'navy', 'crimson', 'charcoal', 'brown', 'indigo']),
    band: choice('What goes round the crown?', {
      buckle: 'A band with a big square metal buckle at the front.',
      ribbon: 'A bright orange ribbon band.',
      cord: 'A plaited cord band, knotted at the side.',
      none: 'No band, just the felt.',
    }),
    tucked: choice('What is tucked into the band?', {
      nothing: 'Nothing tucked in.',
      feather: 'A long black crow feather.',
      herbs: 'A sprig of fresh herbs and a few berries.',
      card: 'A playing card, the ace of hearts.',
      rose: 'A dried red rose.',
    }),
    under: choice('What hangs under the hat?', {
      nothing: 'Nothing: the hat hangs alone.',
      cloak: 'A long dark cloak hanging in heavy folds to near the floor.',
      apron: 'A worn linen apron with its ties dangling.',
      shawl: 'A knitted shawl in autumn colours.',
    }),
    mount: choice('What is the peg on?', {
      wall: 'A peg rail on a whitewashed cottage wall between dark timbers.',
      stand: 'A branching wooden hat stand on three feet.',
      door: 'The back of an old plank door.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hatHex = paintHex(a.colour);
    const felt = s.material(hatHex, { roughness: 0.92, metalness: paintIsMetal(a.colour) ? 0.6 : 0, side: THREE.DoubleSide });
    const wood = s.material('#6b4a2e', { roughness: 0.8 });
    const dark = s.material('#3a281a', { roughness: 0.85 });

    // The mount: a peg at pegY sticking out of a surface at wallZ.
    const pegY = 1.62;
    let wallZ = 0;
    let pegTip = new THREE.Vector3();
    const stand = a.mount === 'stand';
    if (a.mount === 'wall') {
      s.box([1.3, 2.2, 0.12], [0, 1.1, -0.06], s.material('#d6c9ad', { roughness: 0.95 }));
      const stoneMat = s.material('#8a8278', { roughness: 0.95 });
      for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
        const w = mix(0.2, 0.28, random());
        s.ball([w / 2, 0.07, 0.025], [-0.5 + i * 0.25 + (row % 2) * 0.12 + (random() - 0.5) * 0.04, 0.16 + row * 0.14, 0.0], stoneMat, 8);
      }
      for (const x of [-0.6, 0.6]) s.box([0.12, 2.2, 0.15], [x, 1.1, -0.05], dark);
      s.box([1.3, 0.12, 0.15], [0, 0.06, -0.05], dark);
      s.box([1.3, 0.14, 0.16], [0, 2.14, -0.05], dark);
      s.rod([0.36, 0.12, -0.02], [0.58, 0.75, -0.02], 0.05, dark).scale.z = 0.6;
      s.rod([-0.58, 1.75, -0.02], [-0.3, 2.1, -0.02], 0.05, dark).scale.z = 0.6;
      s.box([1.08, 0.1, 0.03], [0, pegY, 0.015], wood);
      for (const x of [-0.32, 0, 0.32]) {
        s.cylinder(0.018, 0.022, 0.12, [x, pegY, 0.09], wood, 10).rotation.x = Math.PI / 2 - 0.25;
        s.ball([0.026, 0.026, 0.026], [x, pegY + 0.015, 0.15], wood, 10);
      }
      wallZ = 0.03;
      pegTip = new THREE.Vector3(0, pegY + 0.02, 0.15);
    } else if (a.mount === 'door') {
      const plank = s.material('#4a3424', { roughness: 0.85 });
      for (let i = 0; i < 5; i++) s.box([0.18 - 0.006, 2.05, 0.05], [-0.36 + i * 0.18, 1.025, -0.025], plank);
      for (const y of [0.35, 1.25]) s.box([0.88, 0.14, 0.03], [0, y, 0.015], plank);
      s.rod([-0.38, 0.42, 0.02], [0.38, 1.18, 0.02], 0.035, plank).scale.z = 0.4;
      s.box([0.12, 0.05, 0.03], [0.32, 1.0, 0.02], s.material('#1c1b1a', { metalness: 0.5, roughness: 0.5 }));
      s.cylinder(0.02, 0.024, 0.13, [0, pegY, 0.07], wood, 10).rotation.x = Math.PI / 2 - 0.25;
      wallZ = 0.03;
      pegTip = new THREE.Vector3(0, pegY + 0.02, 0.13);
    } else {
      s.cylinder(0.03, 0.035, pegY + 0.1, [0, (pegY + 0.1) / 2, 0], wood, 12);
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3;
        s.rod([0, 0.14, 0], [Math.sin(t) * 0.32, 0.01, Math.cos(t) * 0.32], 0.022, wood);
      }
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + 0.4;
        s.rod([0, pegY - 0.12, 0], [Math.sin(t) * 0.17, pegY - 0.02, Math.cos(t) * 0.17], 0.016, wood);
        s.ball([0.022, 0.022, 0.022], [Math.sin(t) * 0.17, pegY - 0.02, Math.cos(t) * 0.17], wood, 8);
      }
      s.ball([0.04, 0.04, 0.04], [0, pegY + 0.1, 0], wood, 10);
      pegTip = new THREE.Vector3(0, pegY + 0.12, 0);
    }

    // What hangs beneath: gathered cloth falling from the peg.
    if (a.under !== 'nothing') {
      const len = { cloak: pegY - 0.12, apron: 0.75, shawl: 0.55 }[a.under];
      const hex = a.under === 'cloak' ? new THREE.Color(hatHex).lerp(new THREE.Color('#1a1418'), 0.5) : a.under === 'apron' ? new THREE.Color('#d9ccb0') : new THREE.Color('#b8622a');
      const cloth = s.material(hex, { roughness: 0.95, side: THREE.DoubleSide });
      const wide = { cloak: 0.4, apron: 0.28, shawl: 0.36 }[a.under];
      const top = pegY - 0.02;
      const phase = random() * 6;
      const folds = a.under === 'shawl' ? 6 : 9;
      s.surface((u, v, target) => {
        const t = stand ? u * Math.PI * 2 : u * Math.PI;
        const r = mix(0.04, wide, Math.pow(v, 0.55)) * (1 + 0.1 * Math.sin(t * folds + phase) * Math.min(1, v * 2));
        const z = stand ? Math.sin(t) * r * 0.75 : wallZ + 0.015 + Math.sin(t) * r * (a.under === 'apron' ? 0.25 : 0.5);
        target.set(Math.cos(t) * r, top - v * len + (a.under === 'shawl' ? Math.sin(t) * 0.15 * v * v : 0), stand ? z + pegTip.z : z);
      }, cloth, { segments: [40, 20], wrap: stand });
      if (a.under === 'cloak') {
        s.ring(0.06, 0.025, [0, top - 0.04, stand ? 0 : wallZ + 0.05], cloth).rotation.x = Math.PI / 2;
        s.ball([0.022, 0.022, 0.012], [0, top - 0.08, stand ? 0.1 : wallZ + 0.11], s.material('#c9ccd1', { metalness: 0.8, roughness: 0.3 }), 10);
      }
      if (a.under === 'apron') {
        for (const side of [-1, 1]) s.rod([side * 0.08, top - 0.12, wallZ + 0.06], [side * 0.14, top - 0.55, wallZ + 0.07], 0.01, cloth);
        s.box([0.24, 0.16, 0.01], [0, top - 0.48, wallZ + 0.14], s.material('#c4b494', { side: THREE.DoubleSide }));
      }
      if (a.under === 'shawl') {
        const fringe = Array.from({ length: 18 }, (_u, i) => ({ at: [-0.32 + i * 0.038, top - len - 0.02 + Math.sin(i) * 0.02, wallZ + 0.1] as P3, size: 0.02 }));
        s.scatter(new THREE.BoxGeometry(0.3, 2.4, 0.3), cloth, fringe);
      }
    }

    // The hat, built with its brim at y = 0 and the crown up +y, then hung on the peg.
    const hat = new THREE.Group();
    const add = (m: THREE.Mesh) => { m.castShadow = m.receiveShadow = true; hat.add(m); return m; };
    const surf = (fn: (u: number, v: number, t: THREE.Vector3) => void, mat: THREE.Material, seg: [number, number] = [36, 24]) => {
      const m = s.surface(fn, mat, { segments: seg, wrap: true });
      s.root.remove(m);
      return add(m);
    };
    const R0 = 0.115, H = a.style === 'floppy' ? 0.38 : 0.47;
    const bend = { crisp: 0.02, crumpled: 0.2, floppy: 0.09 }[a.style];
    const dir = random() < 0.5 ? -1 : 1;
    const centre = (v: number) => {
      const fold = a.style === 'crumpled' ? Math.max(0, v - 0.55) : 0;
      return new THREE.Vector3(dir * bend * Math.pow(v, 2.4), H * v - fold * fold * 0.5, -bend * 0.3 * Math.pow(v, 2));
    };
    const radius = (v: number, t: number) => {
      let r = R0 * Math.pow(1 - v, 1.1);
      if (a.style === 'crumpled') r *= 1 + 0.07 * Math.sin(v * 22 + t * 2) * (1 - v);
      if (a.style === 'floppy') r *= 1 + 0.12 * Math.sin(v * Math.PI);
      return r;
    };
    surf((u, v, target) => {
      const t = u * Math.PI * 2;
      const c = centre(v), r = radius(v, t);
      target.set(c.x + Math.cos(t) * r, c.y, c.z + Math.sin(t) * r);
    }, felt);
    // The brim: flat and crisp, or drooping in waves.
    const Rb = a.style === 'floppy' ? 0.34 : a.style === 'crisp' ? 0.25 : 0.23;
    const droop = a.style === 'floppy' ? 0.1 : a.style === 'crumpled' ? 0.03 : 0;
    const wave = random() * 6;
    surf((u, v, target) => {
      const t = u * Math.PI * 2;
      const r = mix(R0 * 0.98, Rb, v);
      const y = (a.style === 'crisp' ? 0.012 * v * v : -droop * v * v * (1 + 0.5 * Math.sin(t * 3 + wave))) + (a.style === 'crumpled' ? 0.02 * Math.sin(t * 2 + wave) * v : 0);
      target.set(Math.cos(t) * r, y, Math.sin(t) * r);
    }, felt, [48, 6]);
    // Band and buckle.
    if (a.band !== 'none') {
      const bandHex = { buckle: '#1c1a1c', ribbon: '#e0701c', cord: '#8a6a3a' }[a.band];
      const band = add(new THREE.Mesh(new THREE.CylinderGeometry(R0 * 0.93, R0 * 1.01, 0.045, 32, 1, true), s.material(bandHex, { roughness: 0.6, side: THREE.DoubleSide })));
      band.position.y = 0.025;
      if (a.band === 'buckle') {
        const metal = s.material(mood.cheer > 0.5 ? '#d4a537' : '#c9ccd1', { metalness: 0.85, roughness: 0.25 });
        for (const [w, h, x, y] of [[0.06, 0.01, 0, 0.05], [0.06, 0.01, 0, 0.0], [0.01, 0.06, -0.025, 0.025], [0.01, 0.06, 0.025, 0.025]] as const) {
          const bar = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), metal));
          bar.position.set(x, y, R0 * 1.0);
        }
      }
      if (a.band === 'cord') for (const side of [-1, 1]) {
        const tail = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 5), s.material(bandHex)));
        tail.position.set(R0 * 1.02, -0.03, side * 0.015); tail.rotation.z = side * 0.2;
      }
    }
    // What is tucked into the band, at the side.
    const side = new THREE.Vector3(R0 * 1.0 * -dir, 0.03, 0.03);
    if (a.tucked === 'feather') {
      const vane = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), s.material('#141418', { roughness: 0.4 })));
      vane.scale.set(0.022, 0.16, 0.004);
      vane.position.copy(side).add(new THREE.Vector3(-dir * 0.02, 0.14, -0.03));
      vane.rotation.set(-0.35, 0, dir * 0.35);
      const quill = add(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.34, 4), s.material('#d8d0c0')));
      quill.position.copy(vane.position); quill.rotation.copy(vane.rotation);
    } else if (a.tucked === 'herbs') {
      for (let i = 0; i < 4; i++) {
        const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 4), s.material('#3a5a2a')));
        stem.position.copy(side).add(new THREE.Vector3(-dir * 0.03, 0.06, -0.02 + i * 0.01));
        stem.rotation.set(-0.3 + i * 0.1, 0, dir * (0.4 + i * 0.12));
        for (let j = 0; j < 4; j++) {
          const leaf = add(new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), s.material('#4f7a3a')));
          leaf.scale.set(0.012, 0.022, 0.004);
          leaf.position.copy(stem.position).add(new THREE.Vector3(-dir * 0.02 * (j - 1.5), 0.03 * (j - 1.5), 0.005));
        }
      }
      for (let i = 0; i < 3; i++) {
        const berry = add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), s.material('#a0141e', { roughness: 0.3 })));
        berry.position.copy(side).add(new THREE.Vector3(-dir * 0.01, 0.03 + i * 0.012, 0.02 + i * 0.006));
      }
    } else if (a.tucked === 'card') {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f5f0e4'; ctx.fillRect(0, 0, 64, 96);
      ctx.fillStyle = '#c0141e';
      ctx.font = 'bold 16px serif'; ctx.fillText('A', 5, 18);
      ctx.beginPath(); ctx.moveTo(32, 66); ctx.bezierCurveTo(6, 46, 14, 26, 32, 40); ctx.bezierCurveTo(50, 26, 58, 46, 32, 66); ctx.fill();
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const card = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.09), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.6 })));
      card.position.copy(side).add(new THREE.Vector3(-dir * 0.004, 0.06, 0.05));
      card.rotation.set(0, -dir * 1.1, dir * 0.25);
    } else if (a.tucked === 'rose') {
      const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.15, 4), s.material('#4a4a2a')));
      stem.position.copy(side).add(new THREE.Vector3(-dir * 0.02, 0.05, 0.02)); stem.rotation.z = dir * 0.5;
      const bloom = add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.028, 1), s.material('#7e1828', { roughness: 0.7 })));
      bloom.position.copy(side).add(new THREE.Vector3(-dir * 0.06, 0.12, 0.02));
    }

    // Hang the hat: crown over the peg, tipped forward off the wall (or upright on the stand).
    hat.position.copy(pegTip);
    if (!stand) {
      hat.scale.setScalar(1.25);
      hat.rotation.x = -0.12;
      hat.position.z = wallZ + Rb * 1.25 + 0.02;
      hat.position.y = pegTip.y - 0.05;
    } else {
      hat.scale.setScalar(1.25);
      hat.rotation.set(0.08, random() * 0.6, 0.06);
      hat.position.y = pegTip.y - 0.08;
    }
    s.root.add(hat);
    hat.rotation.z += (random() - 0.5) * 0.15;

    const sway = mix(0.002, 0.03, mood.energy);
    const baseZ = hat.rotation.z;
    return s.finish({ update: (_dt, time) => { hat.rotation.z = baseZ + Math.sin(time * 1.3) * sway; } });
  },
});

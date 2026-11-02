import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const INSIDE = {
  bao: 'Char siu bao: fat white buns split open at the top, red showing.',
  hargow: 'Har gow: translucent pleated prawn dumplings, pink through the skin.',
  siumai: 'Siu mai: yellow open-topped dumplings, each with an orange dot.',
  custard: 'Custard buns, smooth and yellow, one torn open and running gold.',
  lotus: 'Lotus leaf rice: two dark green parcels tied shut.',
  feet: 'Phoenix claws: red-brown braised chicken feet in a little dish.',
} as const;

export default defineThing({
  questions: {
    height: score('How tall is the stack of steamers?', ['Two baskets', 'A short stack of four', 'Chest high', 'Head high', 'A swaying tower taller than the cook']),
    towers: choice('How many towers stand on the boiler?', {
      one: 'One tower and one empty hole breathing steam.',
      two: 'Two towers, one tall and one short.',
      matched: 'Two towers the same height, a busy teahouse.',
    }),
    inside: choice('The top lid is lifted. What is inside?', INSIDE),
    aside: choice('Is one basket set aside for someone?', {
      none: 'No. Everything is for whoever comes.',
      tied: 'Yes: lid on, tied with red string and a paper slip with a name, on a plastic stool.',
      eating: 'Yes: open on the stool with a tea bowl and chopsticks, someone is mid-breakfast.',
      bag: 'Yes: knotted into a red plastic bag to take away, waiting on the stool.',
      offering: 'Yes: left open with three sticks of incense beside it, for someone who is not here.',
    }),
    stove: choice('What heats it?', {
      cart: 'A steel cart on casters with a gas bottle underneath.',
      drum: 'An old oil drum stove with a coal glow at the mouth.',
      table: 'A folding table with a blue gas ring on top.',
    }),
    lid: choice('Where is the lifted lid?', {
      held: 'Tipped up on the back rim as if a hand has just raised it.',
      leaning: 'Leaning against the side of the boiler.',
      stacked: 'Set down on top of the neighbouring pile.',
    }),
    bottle: choice('If there is a gas bottle, what colour is it?', {
      blue: 'Chalky blue.',
      red: 'Fire red.',
      grey: 'Scuffed bare grey steel.',
    }),
    binding: choice('How are the bamboo baskets bound?', { plain: 'Plain dark bamboo hoops.', red: 'Red cord hoops around both rims.', cross: 'Two crossed cane stitches on each side.', brass: 'Small brass repair clips around the rims.' }),
    lidHandle: choice('What handle is on each basket lid?', { none: 'The lid is gripped by its rim.', loop: 'An upright bamboo loop.', peg: 'A short turned wooden knob.', wrapped: 'A red cloth grip over a raised crossbar.' }),
    boilerDrain: choice('How is the boiler drained?', { plug: 'A small capped drain.', tap: 'A brass tap over a catch cup.', hose: 'A rubber hose running into a bucket.', trough: 'A little open metal drip trough.' }),
    waterGauge: choice('How is the boiler water level checked?', { bare: 'A plain boiler front.', glass: 'A vertical sight glass with a blue water column.', dial: 'A round pressure dial.', both: 'A sight glass beside a pressure dial.' }),
    servingShelf: choice('What serving ledge is fitted to the boiler front?', { none: 'No ledge.', narrow: 'A narrow steel ledge on brackets.', broad: 'A broad slatted bamboo ledge.', divided: 'A steel ledge divided into three tray spaces.' }),
    utensilRack: choice('What hangs from the boiler side?', { none: 'No extra utensils.', tongs: 'A pair of long bamboo tongs.', ladle: 'A deep steel ladle.', brushes: 'Two bundled bamboo cleaning brushes.' }),
    paving: choice('What is immediately under the steaming station?', { bare: 'Bare ground.', tile: 'Cream square kitchen tiles.', brick: 'Red brick paving.', grating: 'A dark drainage grate in a concrete surround.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const R = 0.225, BH = 0.085;
    const age = mood.wear;
    const bamboo = new THREE.Color('#d2ac6c').lerp(new THREE.Color('#7e5a34'), age * 0.75);

    const sideTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 64);
      for (let x = 0; x < 512; x += 2) { ctx.fillStyle = `rgba(90,60,20,${random() * 0.14})`; ctx.fillRect(x, 0, 2, 64); }
      ctx.fillStyle = 'rgba(80,50,20,0.5)';
      for (let x = 20; x < 512; x += 128) { ctx.fillRect(x, 6, 3, 52); for (let k = 0; k < 5; k++) ctx.fillRect(x - 5, 10 + k * 11, 13, 3); }
      for (let i = 0; i < age * 30; i++) { ctx.fillStyle = `rgba(40,25,10,${random() * 0.25})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 64, 6 + random() * 20, 4 + random() * 10, 0, 0, 7); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const weaveTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? 'rgba(90,60,20,0.3)' : 'rgba(255,240,200,0.3)';
        ctx.fillRect(x * 16, y * 16, 16, 16);
        ctx.fillStyle = 'rgba(60,40,10,0.35)';
        if ((x + y) % 2) ctx.fillRect(x * 16, y * 16, 16, 1.5); else ctx.fillRect(x * 16, y * 16, 1.5, 16);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 2);
      return texture;
    })();
    const wall = new THREE.MeshStandardMaterial({ color: bamboo, map: sideTexture, roughness: 0.8 });
    const rim = new THREE.MeshStandardMaterial({ color: bamboo.clone().multiplyScalar(0.72), roughness: 0.75 });
    const woven = new THREE.MeshStandardMaterial({ color: bamboo.clone().lerp(new THREE.Color('#f0d8a0'), 0.25), map: weaveTexture, roughness: 0.85, side: THREE.DoubleSide });
    const steel = s.material('#c2c8ca', { metalness: 0.7, roughness: mix(0.25, 0.55, age) });
    const dark = s.material('#2c2f31', { roughness: 0.7 });
    const paper = s.material('#f6f1e2', { roughness: 0.95 });

    const redBinding=s.material('#b72f2a'),clipMat=s.material('#b78c40',{metalness:.65,roughness:.4});
    const bodyGeometry = new THREE.CylinderGeometry(R, R, BH - 0.004, 28, 1, true);
    const rimGeometry = new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.02, 28);
    const lidGeometry = new THREE.LatheGeometry([[0.001, 0.058], [0.1, 0.052], [0.19, 0.03], [R + 0.004, 0], [R + 0.01, 0], [R + 0.01, -0.028], [R + 0.002, -0.028]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const basket = (parent: THREE.Object3D, floor = false) => {
      const g = new THREE.Group();
      part(g, bodyGeometry, wall, [0, BH / 2, 0]).material = wall;
      part(g, rimGeometry, rim, [0, 0.011, 0]);
      part(g, rimGeometry, rim, [0, BH - 0.011, 0]).scale.set(1, 0.8, 1);
      if (floor) part(g, new THREE.CylinderGeometry(R - 0.008, R - 0.008, 0.008, 24), paper, [0, 0.03, 0]);
      if(a.binding==='red')for(const y of[.012,BH-.012])part(g,new THREE.TorusGeometry(R+.012,.005,6,28),redBinding,[0,y,0]).rotation.x=Math.PI/2;
      else if(a.binding==='cross')for(let i=0;i<4;i++)for(const turn of[-.7,.7]) {const m=part(g,new THREE.BoxGeometry(.045,.005,.005),rim,[Math.cos(i*Math.PI/2)*(R+.006),BH/2,Math.sin(i*Math.PI/2)*(R+.006)]);m.rotation.set(0,-i*Math.PI/2-Math.PI/2,turn);}
      else if(a.binding==='brass')for(let i=0;i<4;i++){const t=i*Math.PI/2;part(g,new THREE.BoxGeometry(.018,BH,.009),clipMat,[Math.sin(t)*(R+.01),BH/2,Math.cos(t)*(R+.01)]).rotation.y=t;}
      parent.add(g);
      return g;
    };
    const lid = (parent: THREE.Object3D) => {
      const g = new THREE.Group();
      part(g, lidGeometry, woven, [0, 0.03, 0]);
      part(g, new THREE.TorusGeometry(R + 0.008, 0.008, 6, 28), rim, [0, 0.03, 0]).rotation.x = Math.PI / 2;
      if(a.lidHandle==='loop')part(g,new THREE.TorusGeometry(.04,.007,6,16,Math.PI),rim,[0,.087,0]);
      else if(a.lidHandle==='peg')part(g,new THREE.CylinderGeometry(.018,.025,.035,12),rim,[0,.105,0]);
      else if(a.lidHandle==='wrapped') {for(const x of[-.04,.04])part(g,new THREE.BoxGeometry(.012,.035,.012),rim,[x,.105,0]);part(g,new THREE.BoxGeometry(.1,.02,.025),redBinding,[0,.127,0]);}
      parent.add(g);
      return g;
    };

    const unitBall = new THREE.SphereGeometry(1, 14, 10);
    const food = (g: THREE.Object3D, what: keyof typeof INSIDE) => {
      const y = 0.036;
      const ring = (count: number, radius: number, each: (x: number, z: number, index: number) => void) => {
        for (let i = 0; i < count; i++) { const t = (i / count) * Math.PI * 2 + random(); each(Math.cos(t) * radius, Math.sin(t) * radius, i); }
      };
      if (what === 'bao') {
        const dough = s.material('#fbf7ec', { roughness: 0.9 }), filling = s.material('#a8321e', { roughness: 0.5 });
        ring(3, 0.105, (x, z) => {
          part(g, unitBall, dough, [x, y + 0.04, z], [0.085, 0.062, 0.085]);
          for (let k = 0; k < 3; k++) part(g, unitBall, dough, [x + Math.cos(k * 2.1) * 0.03, y + 0.085, z + Math.sin(k * 2.1) * 0.03], [0.035, 0.028, 0.035]);
          part(g, unitBall, filling, [x, y + 0.088, z], [0.022, 0.016, 0.022]);
        });
      } else if (what === 'hargow') {
        const skin = s.material('#f4e2da', { roughness: 0.25, emissive: '#e88a7a', emissiveIntensity: 0.18 }), pleat = s.material('#fbf4ee', { roughness: 0.4 });
        ring(4, 0.11, (x, z, i) => {
          const d = part(g, unitBall, skin, [x, y + 0.026, z], [0.07, 0.04, 0.048]);
          d.rotation.y = i * 1.3;
          const crest = part(g, new THREE.TorusGeometry(0.05, 0.009, 5, 12, Math.PI), pleat, [x, y + 0.026, z], [1, 0.75, 1]);
          crest.rotation.y = i * 1.3;
        });
      } else if (what === 'siumai') {
        const wrap = s.material('#e9c23c', { roughness: 0.6 }), meat = s.material('#d9a98a', { roughness: 0.6 }), roe = s.material('#f0661e', { roughness: 0.3, emissive: '#c03a08', emissiveIntensity: 0.3 });
        const cup = new THREE.CylinderGeometry(0.046, 0.038, 0.062, 10);
        const all = (x: number, z: number) => { part(g, cup, wrap, [x, y + 0.031, z]); part(g, unitBall, meat, [x, y + 0.06, z], [0.04, 0.016, 0.04]); part(g, unitBall, roe, [x, y + 0.074, z], [0.014, 0.012, 0.014]); };
        ring(4, 0.115, all); all(0, 0);
      } else if (what === 'custard') {
        const bun = s.material('#f3d24a', { roughness: 0.6 }), gold = s.material('#f6a81a', { roughness: 0.2, emissive: '#e07a00', emissiveIntensity: 0.4 });
        ring(3, 0.105, (x, z, i) => {
          part(g, unitBall, bun, [x, y + 0.04, z], [0.078, 0.06, 0.078]);
          if (i === 0) { part(g, unitBall, gold, [x * 0.55, y + 0.045, z * 0.55], [0.045, 0.04, 0.045]); part(g, unitBall, gold, [x * 0.2, y + 0.006, z * 0.2], [0.07, 0.006, 0.05]); }
        });
      } else if (what === 'lotus') {
        const leaf = s.material('#4d5f2c', { roughness: 0.7 }), tie = s.material('#d8c48c');
        for (const side of [-1, 1]) {
          const parcel = part(g, new THREE.BoxGeometry(0.19, 0.07, 0.13), leaf, [side * 0.03, y + 0.035, side * 0.085]);
          parcel.rotation.y = 0.3 + (random() - 0.5) * 0.3;
          const band = part(g, new THREE.BoxGeometry(0.012, 0.074, 0.134), tie, [side * 0.03, y + 0.035, side * 0.085]);
          band.rotation.y = parcel.rotation.y;
        }
      } else {
        part(g, new THREE.CylinderGeometry(0.15, 0.1, 0.03, 20), s.material('#f2f0e8', { roughness: 0.3 }), [0, y + 0.015, 0]);
        const glaze = s.material('#a8421c', { roughness: 0.25 });
        for (let i = 0; i < 5; i++) {
          const foot = new THREE.Group();
          foot.position.set((random() - 0.5) * 0.16, y + 0.04 + random() * 0.02, (random() - 0.5) * 0.16);
          foot.rotation.set((random() - 0.5) * 0.6, random() * 6, 0);
          part(foot, new THREE.CapsuleGeometry(0.012, 0.05, 3, 6), glaze, [0, 0, -0.03]).rotation.x = Math.PI / 2;
          for (const k of [-1, 0, 1]) part(foot, new THREE.CapsuleGeometry(0.007, 0.045, 3, 6), glaze, [k * 0.02, 0.005, 0.03]).rotation.set(Math.PI / 2 - 0.3, k * 0.5, 0);
          g.add(foot);
        }
      }
    };

    // Stove and boiler.
    const boilerW = 1.08, boilerD = 0.56;
    let top = 0.72;
    if (a.stove === 'cart') {
      s.box([boilerW + 0.1, 0.04, boilerD + 0.1], [0, top - 0.02, 0], steel);
      s.box([boilerW + 0.06, 0.03, boilerD + 0.06], [0, 0.2, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.box([0.04, top - 0.1, 0.04], [x * (boilerW / 2 + 0.02), (top + 0.1) / 2, z * (boilerD / 2 + 0.02)], steel);
        s.cylinder(0.05, 0.05, 0.03, [x * (boilerW / 2 + 0.02), 0.05, z * (boilerD / 2 + 0.02)], dark, 12).rotation.x = Math.PI / 2;
      }
      s.box([boilerW + 0.1, 0.3, 0.012], [0, top - 0.19, -boilerD / 2 - 0.04], steel);
      s.rod([boilerW / 2 + 0.05, top - 0.06, -0.2], [boilerW / 2 + 0.17, top - 0.06, -0.2], 0.012, steel);
      s.rod([boilerW / 2 + 0.05, top - 0.06, 0.2], [boilerW / 2 + 0.17, top - 0.06, 0.2], 0.012, steel);
      s.rod([boilerW / 2 + 0.17, top - 0.06, -0.2], [boilerW / 2 + 0.17, top - 0.06, 0.2], 0.014, steel);
    } else if (a.stove === 'drum') {
      const drum = s.material(pick(['#3f6f6a', '#7a4a2c', '#4a5a78']), { roughness: 0.8, metalness: 0.3 });
      for (const x of [-0.27, 0.27]) {
        s.cylinder(0.26, 0.26, top, [x, top / 2, 0], drum, 24);
        for (const y of [0.24, 0.48]) s.cylinder(0.266, 0.266, 0.02, [x, y, 0], drum, 24);
        s.box([0.2, 0.15, 0.02], [x, 0.17, 0.252], dark);
        s.box([0.16, 0.1, 0.02], [x, 0.16, 0.258], new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: mix(1, 2.5, mood.energy) }));
      }
    } else {
      top = 0.74;
      s.box([boilerW + 0.3, 0.03, boilerD + 0.14], [0, top - 0.015, 0], s.material('#d8d2c0', { roughness: 0.6 }));
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.6, 0, z * 0.3], [x * 0.5, top - 0.03, z * 0.24], 0.014, steel);
      for (const x of [-1, 1]) s.rod([x * 0.6, 0.02, -0.3], [x * 0.6, 0.02, 0.3], 0.012, steel);
      for (const x of [-0.27, 0.27]) s.ring(0.13, 0.012, [x, top + 0.02, 0], new THREE.MeshStandardMaterial({ color: '#4a8cff', emissive: '#2a6cff', emissiveIntensity: 2 })).rotation.x = Math.PI / 2;
      top += 0.03;
    }
    if (a.stove !== 'drum') {
      const colour = { blue: '#4f86c6', red: '#c92a24', grey: '#8f9698' }[a.bottle];
      const tank = s.material(colour, { roughness: 0.5, metalness: 0.2 });
      const bx = a.stove === 'cart' ? -0.22 : -boilerW / 2 - 0.42, bz = a.stove === 'cart' ? 0.02 : -0.1, by = a.stove === 'cart' ? 0.215 : 0;
      const tall = a.stove === 'cart' ? 0.3 : 0.42;
      s.cylinder(0.15, 0.15, tall, [bx, by + tall / 2 + 0.02, bz], tank, 20);
      s.ball([0.15, 0.07, 0.15], [bx, by + tall + 0.02, bz], tank, 16);
      s.cylinder(0.09, 0.09, 0.06, [bx, by + tall + 0.1, bz], tank, 14);
      s.cylinder(0.16, 0.16, 0.025, [bx, by + 0.012, bz], dark, 16);
      s.tube([[bx, by + tall + 0.12, bz], [bx + 0.12, by + tall + 0.2, bz + 0.08], [bx + 0.3, top - 0.12, 0.05], [bx + 0.4, top - 0.03, 0.02]], 0.01, s.material('#e0742a'));
    }
    // The boiler: a steel box of water with two round holes.
    const boilerH = 0.2;
    s.box([boilerW, boilerH, boilerD], [0, top + boilerH / 2, 0], steel);
    s.box([boilerW + 0.02, 0.015, boilerD + 0.02], [0, top + boilerH, 0], steel);
    for (const x of [-1, 1]) s.rod([x * (boilerW / 2), top + 0.14, -0.08], [x * (boilerW / 2), top + 0.14, 0.08], 0.012, dark);
    const deck = top + boilerH + 0.008;
    const holes = [-0.27, 0.27];
    for (const x of holes) s.cylinder(R + 0.02, R + 0.02, 0.03, [x, deck, 0], steel, 28);

    const tallCount = Math.max(2, Math.round(mix(2, 14, a.height) + (random() - 0.5)));
    const counts = a.towers === 'one' ? [tallCount] : a.towers === 'two' ? [tallCount, Math.max(1, Math.round(tallCount * mix(0.3, 0.55, random())))] : [tallCount, Math.max(2, tallCount - Math.round(random()))];
    const mainAt = random() < 0.5 ? 0 : 1;
    const tops: { x: number; y: number; z: number }[] = [];
    const steamSources: [number, number, number][] = [];
    counts.forEach((count, tower) => {
      const x0 = holes[tower === 0 ? mainAt : 1 - mainAt];
      let x = x0, z = 0;
      const drift = mix(0.002, 0.006, a.height) * (random() < 0.5 ? -1 : 1);
      for (let i = 0; i < count; i++) {
        const g = basket(s.root, i === count - 1);
        x += drift * random() * 1.6 + (random() - 0.5) * 0.008; z += (random() - 0.5) * 0.012;
        g.position.set(x, deck + 0.015 + i * BH, z);
        g.rotation.y = random() * 6;
        if (i % 2 === 0) steamSources.push([x, deck + 0.015 + i * BH, z]);
      }
      const y = deck + 0.015 + count * BH;
      tops.push({ x, y, z });
      if (tower === 0) {
        const open = s.root.children.at(-1)!;
        open.rotation.y = 0;
        food(open, a.inside);
        steamSources.push([x, y, z], [x, y, z], [x, y, z]);
      } else lid(s.root).position.set(x, y, z);
    });
    if (counts.length === 1) {
      // The spare hole: dark water and steam.
      const x = holes[1 - mainAt];
      s.cylinder(R - 0.01, R - 0.01, 0.01, [x, deck + 0.012, 0], s.material('#56707a', { roughness: 0.1, metalness: 0.4 }), 24);
      steamSources.push([x, deck, 0], [x, deck, 0]);
      tops.push({ x, y: deck + 0.02, z: 0 });
    }
    // The lifted lid.
    const main = tops[0], other = tops[1];
    const lifted = lid(s.root);
    if (a.lid === 'held') { lifted.position.set(main.x, main.y + R * Math.sin(0.75) - 0.01, main.z - R + R * Math.cos(0.75) - 0.02); lifted.rotation.x = -0.75; }
    else if (a.lid === 'stacked' && counts.length > 1) { lifted.position.set(other.x + 0.02, other.y + 0.062, other.z + 0.015); lifted.rotation.set(0.05, 1, 0.04); }
    else if (a.lid === 'stacked') { lifted.position.set(other.x, other.y + 0.01, other.z); lifted.rotation.set(0.04, 1, 0); }
    else { lifted.position.set(holes[mainAt] + (mainAt ? 0.1 : -0.1), top + R + 0.0, boilerD / 2 + 0.05); lifted.rotation.set(Math.PI / 2 - 0.2, 0, 0); if (a.stove === 'table') lifted.position.y = top + R - 0.02; }

    // A pile of empties when the place is busy.
    if (mood.density > 0.6) {
      const ex = -boilerW / 2 - 0.42, ez = a.stove === 'table' ? 0.35 : 0.1;
      const n = 2 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) { const g = basket(s.root, i === n - 1); g.position.set(ex + (random() - 0.5) * 0.03, i * BH, ez + (random() - 0.5) * 0.03); g.rotation.y = random() * 6; }
    }

    // The one set aside, on a plastic stool.
    if (a.aside !== 'none') {
      const sx = boilerW / 2 + (a.stove === 'cart' ? 0.5 : 0.42), sz = 0.22;
      const stool = s.material(pick(['#d6322c', '#2f6fc2', '#e88a2a', '#3f9a5a']), { roughness: 0.45 });
      s.cylinder(0.15, 0.19, 0.03, [sx, 0.44, sz], stool, 4).rotation.y = Math.PI / 4;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([sx + x * 0.14, 0, sz + z * 0.14], [sx + x * 0.1, 0.43, sz + z * 0.1], 0.02, stool, 0.016);
      s.box([0.25, 0.03, 0.25], [sx, 0.43, sz], stool);
      const g = basket(s.root, true);
      g.position.set(sx, 0.455, sz);
      const string = s.material('#d8262c', { roughness: 0.5 });
      if (a.aside === 'tied') {
        lid(s.root).position.set(sx, 0.455 + BH, sz);
        for (const turn of [0, Math.PI / 2]) { const band = s.box([0.012, BH + 0.085, R * 2 + 0.03], [sx, 0.455 + BH / 2 + 0.03, sz], string); band.rotation.y = turn; band.scale.y = 1; }
        s.ball([0.02, 0.014, 0.02], [sx, 0.455 + BH + 0.09, sz], string, 8);
        const slip = s.label(pick(['MRS LAM', 'NO. 14', 'UNCLE 7', 'AH MA']), 0.16, 0.06, [sx + 0.05, 0.455 + BH + 0.075, sz + 0.09], '#1c1e22', '#f8f3dc');
        slip.rotation.set(-0.9, 0.3, 0);
      } else if (a.aside === 'eating') {
        food(g, a.inside === 'bao' ? 'siumai' : 'bao');
        s.cylinder(0.05, 0.03, 0.045, [sx - 0.2, 0.02, sz + 0.26], s.material('#f2f0e8', { roughness: 0.3 }), 14);
        s.cylinder(0.044, 0.044, 0.004, [sx - 0.2, 0.038, sz + 0.26], s.material('#8a5a1e', { roughness: 0.2 }), 12);
        for (const k of [0, 1]) s.rod([sx - 0.1, 0.455 + BH + 0.004, sz + 0.2], [sx + 0.12 + k * 0.012, 0.455 + BH + 0.004, sz - 0.16 + k * 0.02], 0.004, s.material('#6a3a1e'));
      } else if (a.aside === 'bag') {
        const bag = s.material('#dc2a30', { roughness: 0.3, transparent: true, opacity: 0.85 });
        s.cylinder(R + 0.03, R + 0.02, BH + 0.03, [sx, 0.455 + BH / 2, sz], bag, 18);
        s.cylinder(0.05, R + 0.03, 0.1, [sx, 0.455 + BH + 0.065, sz], bag, 18);
        for (const side of [-1, 1]) s.rod([sx, 0.455 + BH + 0.11, sz], [sx + side * 0.07, 0.455 + BH + 0.2, sz + side * 0.02], 0.014, s.material('#dc2a30'), 0.005);
      } else {
        food(g, 'bao');
        const pot = s.material('#a83a2a', { roughness: 0.7 });
        s.cylinder(0.04, 0.03, 0.06, [sx + 0.02, 0.03, sz + 0.34], pot, 12);
        for (let i = 0; i < 3; i++) {
          const tipX = sx + 0.02 + (i - 1) * 0.02, tipY = 0.34 + random() * 0.04;
          s.rod([sx + 0.02 + (i - 1) * 0.008, 0.06, sz + 0.34], [tipX, tipY, sz + 0.34], 0.003, s.material('#b8442a'));
          s.ball([0.006, 0.008, 0.006], [tipX, tipY, sz + 0.34], new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff5a10', emissiveIntensity: 3 }), 6);
          steamSources.push([tipX, tipY, sz + 0.34]);
        }
      }
    }

    const brass = s.material('#b78c40', {metalness:.65, roughness:.4});
    const redCord = s.material('#b72f2a');
    const drainX=.42, drainY=top+.075, drainZ=boilerD/2+.025;
    s.cylinder(.022,.022,.04,[drainX,drainY,drainZ],brass,12).rotation.x=Math.PI/2;
    if(a.boilerDrain==='tap') {
      s.tube([[drainX,drainY,drainZ],[drainX,drainY,drainZ+.08],[drainX,drainY-.06,drainZ+.08]],.012,brass);
      s.rod([drainX-.035,drainY+.025,drainZ+.03],[drainX+.035,drainY+.025,drainZ+.03],.008,brass);
      s.lathe([[.03,0],[.035,.003],[.05,.08]],steel,[drainX,0,drainZ+.08]);
    } else if(a.boilerDrain==='hose') {
      s.tube([[drainX,drainY,drainZ],[drainX+.18,drainY-.1,drainZ+.07],[.76,.22,.5],[.76,.06,.5]],.013,dark);
      s.lathe([[0,0],[.09,0],[.12,.2]],steel,[.76,0,.5]);
      s.ring(.115,.007,[.76,.2,.5],steel).rotation.x=Math.PI/2;
    } else if(a.boilerDrain==='trough') {
      s.box([.22,.012,.15],[drainX,drainY-.055,drainZ+.07],steel);
      for(const side of[-1,1]) s.box([.012,.05,.15],[drainX+side*.105,drainY-.03,drainZ+.07],steel);
      s.rod([drainX,top+.02,drainZ],[drainX,drainY-.06,drainZ+.12],.008,steel);
    }
    if(a.waterGauge==='glass'||a.waterGauge==='both') {
      s.box([.065,.15,.025],[-.42,top+.1,drainZ],dark);
      s.cylinder(.012,.012,.13,[-.42,top+.1,drainZ+.025],s.material('#8eb9c3'),12);
      for(const y of[top+.02,top+.18])s.box([.06,.018,.04],[-.42,y,drainZ+.015],brass);
    }
    if(a.waterGauge==='dial'||a.waterGauge==='both') {
      s.cylinder(.052,.052,.03,[-.22,top+.105,drainZ+.01],steel,20).rotation.x=Math.PI/2;
      s.cylinder(.044,.044,.008,[-.22,top+.105,drainZ+.03],paper,20).rotation.x=Math.PI/2;
      s.rod([-.22,top+.105,drainZ+.037],[-.245,top+.13,drainZ+.037],.003,dark);
    }
    if(a.servingShelf!=='none') {
      const sy=top-.18, depth=a.servingShelf==='narrow'?.11:.21;
      if(a.servingShelf==='broad')for(let i=0;i<7;i++)s.box([.105,.025,depth],[-.36+i*.12,sy,.3+depth/2],wall);
      else s.box([.84,.025,depth],[0,sy,.3+depth/2],steel);
      for(const x of[-.32,.32])s.rod([x,sy-.14,.29],[x,sy-.012,.3+depth-.02],.009,steel);
      if(a.servingShelf==='divided')for(const x of[-.14,.14])s.box([.015,.055,depth],[x,sy+.04,.3+depth/2],steel);
    }
    if(a.utensilRack!=='none') {
      const ux=-boilerW/2-.07;
      s.rod([ux,top+.14,-.18],[ux,top+.14,.1],.009,steel);
      s.rod([ux,top+.14,-.1],[-boilerW/2,top+.14,-.1],.009,steel);
      if(a.utensilRack==='tongs') for(const dz of[-.015,.015])s.rod([ux,top+.14,-.05],[ux-.025,top-.16,-.05+dz],.008,wall);
      else if(a.utensilRack==='ladle') {
        s.rod([ux,top+.14,-.05],[ux,top-.13,-.05],.007,steel);
        s.ball([.045,.022,.045],[ux,top-.15,-.05],steel,12);
      } else for(const z of[-.12,.04]) {
        s.rod([ux,top+.14,z],[ux,top-.05,z],.01,wall);
        for(let k=0;k<7;k++)s.rod([ux,top-.03,z],[ux+(k-3)*.007,top-.18,z+.01],.004,wall);
      }
    }
    if(a.paving!=='bare') {
      const floor=s.material(a.paving==='brick'?'#9c6a53':'#aaa99e');
      s.box([2.65,.04,1.3],[0,-.027,.1],floor);
      if(a.paving==='tile')for(let x=0;x<10;x++)for(let z=0;z<5;z++)s.box([.261,.005,.256],[-1.1925+x*.265,-.0025,-.42+z*.26],paper);
      else if(a.paving==='brick')for(let x=0;x<8;x++)for(let z=0;z<6;z++)s.box([.316,.005,.2],[-1.12+x*.32,-.0025,-.425+z*.21],s.material((x+z)%3?'#b78265':'#a9755a'));
      else for(let i=0;i<20;i++)s.box([.11,.006,1.1],[-1.1875+i*.125,-.003,.1],dark);
    }

    // Steam: more when the morning is cold and the kitchen is busy.
    const volume = mix(0.25, 1, mood.energy * 0.6 + (1 - mood.warmth) * 0.4);
    const steamMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.1, 0.2, volume), depthWrite: false, roughness: 1 });
    const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
    const puffs: { mesh: THREE.Mesh; from: [number, number, number]; age: number; life: number; drift: number; size: number }[] = [];
    const puffCount = Math.round(mix(8, 46, volume));
    for (let i = 0; i < puffCount; i++) {
      const from = steamSources[i % steamSources.length];
      const mesh = new THREE.Mesh(puffGeometry, steamMaterial);
      const t = random() * Math.PI * 2;
      const start: [number, number, number] = [from[0] + Math.cos(t) * R * 0.9, from[1], from[2] + Math.sin(t) * R * 0.9];
      const puff = { mesh, from: start, age: random(), life: mix(2.5, 5, random()), drift: (random() - 0.5) * 0.3, size: mix(0.05, 0.13, random()) * mix(0.7, 1.3, volume) };
      s.root.add(mesh);
      puffs.push(puff);
    }
    const pose = () => {
      for (const p of puffs) {
        const k = p.age;
        p.mesh.position.set(p.from[0] + p.drift * k + Math.sin(k * 5 + p.life) * 0.03, p.from[1] + k * mix(0.35, 0.9, volume), p.from[2] + Math.cos(k * 4 + p.life) * 0.03);
        p.mesh.scale.setScalar(p.size * (0.35 + k * 1.5));
      }
    };
    pose();

    const pace = mix(0.4, 1.4, mood.energy);
    return s.finish({
      footprint: 0.85,
      update(dt) {
        for (const p of puffs) { p.age += (dt * pace) / p.life; if (p.age > 1) p.age -= 1; }
        pose();
      },
    });
  },
});

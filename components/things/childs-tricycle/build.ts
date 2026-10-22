import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const COLOURS = {
  'fire-red': ['#cf2a22', '#f3efe2'],
  'cream-turquoise': ['#2fa3a0', '#f1e8cf'],
  'candy-pink': ['#e56d9c', '#fbf3f0'],
  'royal-blue': ['#2552b5', '#f0c12e'],
  'school-yellow': ['#eeb81e', '#2a2a2a'],
} as const;

export default defineThing({
  questions: {
    colour: choice('What colour is the tricycle?', {
      'fire-red': 'Fire-engine red with white trim, the archetype.',
      'cream-turquoise': 'Turquoise frame with cream mudguard and saddle, 1950s.',
      'candy-pink': 'Pink with white tyres.',
      'royal-blue': 'Royal blue with yellow trim.',
      'school-yellow': 'Yellow and black like a toy digger.',
    }),
    pose: choice('How is it lying?', {
      parked: 'Upright, handlebars straight, parked with care.',
      turned: 'Upright with the front wheel cranked hard to one side.',
      tipped: 'Tipped over on its side where it was dropped.',
      upturned: 'Upside down on its saddle and handlebars, wheels in the air to be spun by hand.',
    }),
    why: choice('Why was it left here?', {
      'called-in': 'Its rider was called in for dinner seconds ago; the front wheel is still spinning.',
      outgrown: 'Outgrown: a flat tyre, grass grown up through the spokes.',
      rain: 'It started to rain; it stands in a puddle.',
      gift: 'It has not been ridden yet: a ribbon bow and a tag on the handlebars.',
      broken: 'A back wheel came off and lies beside it.',
    }),
    streamers: choice('What hangs from the handlebar grips?', {
      rainbow: 'Long rainbow tinsel streamers from both grips.',
      ribbons: 'A few pink and white ribbons.',
      'one-side': 'Streamers on one grip only; the other was pulled out.',
      none: 'Nothing, just white rubber grips.',
    }),
    cargo: choice('What rides on the back step?', {
      nothing: 'Nothing.',
      teddy: 'A teddy bear passenger.',
      basket: 'A wicker basket of picked flowers.',
      stones: 'A toy bucket full of stones.',
    }),
    wheels: choice('What are the wheels like?', {
      spoked: 'Wire-spoked wheels with thin white tyres.',
      solid: 'Solid pressed-steel discs with black rubber tyres.',
      chunky: 'Chunky moulded plastic wheels.',
    }),
    extra: choice('What is fixed to the handlebars?', {
      bell: 'A chrome thumb bell.',
      horn: 'A rubber bulb horn.',
      plate: 'A little name plate on the front.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = a.why === 'gift' ? mood.wear * 0.2 : a.why === 'outgrown' ? mix(0.5, 1, mood.wear) : mood.wear;
    const [main, trim] = COLOURS[a.colour];
    const rustTint = new THREE.Color('#7a4526');
    const paint = s.material(new THREE.Color(main).lerp(rustTint, wear * 0.45), { roughness: mix(0.25, 0.85, wear), metalness: 0.25 });
    const trimPaint = s.material(new THREE.Color(trim).lerp(rustTint, wear * 0.3), { roughness: mix(0.3, 0.85, wear) });
    const chrome = s.material(new THREE.Color('#d9dee0').lerp(rustTint, wear * 0.6), { metalness: mix(0.9, 0.4, wear), roughness: mix(0.18, 0.7, wear) });
    const rubberDark = s.material('#1e1f22', { roughness: 0.9 });
    const tyreMat = a.wheels === 'spoked' ? s.material('#efece2', { roughness: 0.8 }) : rubberDark;
    const rust = s.material('#6f3d1f', { roughness: 1 });

    const trike = new THREE.Group();
    s.root.add(trike);
    const into = (group: THREE.Object3D, mesh: THREE.Object3D) => { group.add(mesh); return mesh; };
    const rodIn = (group: THREE.Object3D, from: [number, number, number], to: [number, number, number], radius: number, mat: THREE.Material) => into(group, s.rod(from, to, radius, mat));

    const wheel = (radius: number, width: number, flat = false) => {
      const group = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(radius - width, width, 10, 28), tyreMat);
      tyre.rotation.y = Math.PI / 2; tyre.castShadow = true; if (flat) tyre.scale.set(1, 1, 1.5);
      group.add(tyre);
      const inner = radius - width * 1.8;
      const disc = (mat: THREE.Material, w: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, w, 20), mat); m.rotation.z = Math.PI / 2; m.castShadow = true; group.add(m); return m; };
      if (a.wheels === 'spoked') {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(inner, 0.008, 6, 24), chrome); rim.rotation.y = Math.PI / 2; group.add(rim);
        for (let i = 0; i < 10; i++) { const ang = i / 10 * Math.PI * 2; const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, inner * 2, 4), chrome); spoke.rotation.x = ang; spoke.position.x = (i % 2 ? 1 : -1) * 0.006; group.add(spoke); }
      } else if (a.wheels === 'solid') {
        disc(trimPaint, 0.02);
        for (let i = 0; i < 5; i++) { const ang = i / 5 * Math.PI * 2; const hole = new THREE.Mesh(new THREE.CylinderGeometry(inner * 0.2, inner * 0.2, 0.024, 10), rubberDark); hole.rotation.z = Math.PI / 2; hole.position.set(0, Math.cos(ang) * inner * 0.6, Math.sin(ang) * inner * 0.6); group.add(hole); }
      } else {
        disc(paint, width * 1.6);
        for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; const rib = new THREE.Mesh(new THREE.BoxGeometry(width * 1.9, inner * 0.9, 0.02), trimPaint); rib.rotation.x = ang; rib.position.set(0, Math.cos(ang) * inner * 0.5, Math.sin(ang) * inner * 0.5); group.add(rib); }
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, width * 2.4 + 0.02, 10), chrome); hub.rotation.z = Math.PI / 2; group.add(hub);
      return group;
    };

    const chunky = a.wheels === 'chunky';
    const FR = 0.17, RR = 0.115, FW = chunky ? 0.034 : 0.02, RW = chunky ? 0.03 : 0.017;
    const frontZ = 0.3, rearZ = -0.27, track = 0.21;

    // Frame: one swept backbone tube, rear axle, step plate.
    into(trike, s.tube([[0, 0.47, 0.2], [0, 0.44, 0.1], [0, 0.3, -0.08], [0, 0.17, -0.22], [0, RR, rearZ]], 0.028, paint));
    rodIn(trike, [-track - 0.02, RR, rearZ], [track + 0.02, RR, rearZ], 0.012, chrome);
    into(trike, s.box([track * 2 - 0.08, 0.012, 0.11], [0, RR + 0.035, rearZ - 0.01], trimPaint));
    for (let i = 0; i < 5; i++) into(trike, s.box([track * 2 - 0.1, 0.004, 0.008], [0, RR + 0.043, rearZ - 0.05 + i * 0.02], rubberDark));
    // Saddle on a sprung post.
    rodIn(trike, [0, 0.33, -0.05], [0, 0.42, -0.07], 0.012, chrome);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) into(trike, s.ring(0.018, 0.004, [sx * 0.035, 0.405 + i * 0.012, -0.12], chrome)).rotation.x = Math.PI / 2;
    const saddle = into(trike, s.ball([0.075, 0.03, 0.105], [0, 0.45, -0.07], a.colour === 'school-yellow' ? rubberDark : trimPaint, 16)) as THREE.Mesh;
    saddle.rotation.x = 0.06;

    // Rear wheels.
    const rearWheels: THREE.Group[] = [];
    for (const sx of [-1, 1]) {
      const w = wheel(RR, RW, a.why === 'outgrown' && sx === 1);
      w.position.set(sx * track, RR, rearZ);
      if (a.why === 'outgrown' && sx === 1) w.position.y -= 0.012;
      rearWheels.push(w);
      if (a.why === 'broken' && sx === 1) {
        // The loose wheel lies flat beside it; the axle end is bare.
        w.position.set(track + 0.22 + random() * 0.1, RW, rearZ + 0.15 + random() * 0.1); w.rotation.z = Math.PI / 2; w.rotation.y = random() * 3;
        s.root.add(w);
        const nut = s.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 6), chrome, [track + 0.1, 0.006, rearZ + 0.32]);
        nut.rotation.y = random();
      } else trike.add(w);
    }

    // Steering assembly: fork, front wheel, cranks, mudguard, bars. Turns about the head tube.
    const steer = new THREE.Group();
    steer.position.set(0, 0, 0.22);
    trike.add(steer);
    const dz = frontZ - 0.22;
    into(steer, s.cylinder(0.027, 0.027, 0.11, [0, 0.45, 0], paint, 12));
    for (const sx of [-1, 1]) rodIn(steer, [sx * (FW + 0.028), FR, dz], [sx * 0.03, 0.41, 0.005], 0.015, paint);
    rodIn(steer, [-0.045, 0.41, 0.005], [0.045, 0.41, 0.005], 0.016, paint);
    rodIn(steer, [0, 0.4, 0], [0, 0.62, -0.02], 0.013, chrome);
    const spin = new THREE.Group();
    spin.position.set(0, FR, dz);
    steer.add(spin);
    spin.add(wheel(FR, FW));
    // Cranks and block pedals.
    for (const sx of [-1, 1]) {
      const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.085, 6), chrome); crank.position.set(sx * (FW + 0.045), sx * 0.04, 0); spin.add(crank);
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.05), a.wheels === 'spoked' ? s.material('#efece2') : rubberDark); pedal.position.set(sx * (FW + 0.09), sx * 0.082, 0); pedal.castShadow = true; spin.add(pedal);
    }
    spin.rotation.x = random() * Math.PI * 2;
    const guard = into(steer, s.mesh(new THREE.TorusGeometry(FR + 0.022, 0.02, 6, 20, Math.PI * 0.62), trimPaint)) as THREE.Mesh;
    guard.rotation.set(0, -Math.PI / 2, 0); guard.rotation.order = 'YXZ'; guard.rotation.x = 0; guard.rotation.z = Math.PI * 0.14;
    guard.scale.set(1, 1, (FW + 0.016) / 0.02); guard.position.set(0, FR, dz);
    // Handlebars.
    const barY = 0.63;
    into(steer, s.tube([[-0.21, barY + 0.03, -0.1], [-0.19, barY + 0.03, -0.05], [-0.1, barY, -0.01], [0, barY - 0.015, -0.02], [0.1, barY, -0.01], [0.19, barY + 0.03, -0.05], [0.21, barY + 0.03, -0.1]], 0.011, chrome));
    const streamerGroups: THREE.Group[] = [];
    const tinsel = ['#e2412f', '#f4c62c', '#3aa66a', '#2f86d6', '#8f5fd0', '#f08a2a'];
    for (const sx of [-1, 1]) {
      const grip = into(steer, s.cylinder(0.017, 0.017, 0.085, [sx * 0.215, barY + 0.03, -0.13], s.material('#f1eee4', { roughness: 0.8 }), 10)) as THREE.Mesh;
      grip.rotation.x = Math.PI / 2;
      const has = a.streamers === 'rainbow' || a.streamers === 'ribbons' || (a.streamers === 'one-side' && sx === 1);
      if (!has) continue;
      const tuft = new THREE.Group();
      tuft.position.set(sx * 0.215, barY + 0.03, -0.175);
      steer.add(tuft);
      streamerGroups.push(tuft);
      const strands = a.streamers === 'ribbons' ? 4 : 9;
      for (let i = 0; i < strands; i++) {
        const length = (a.streamers === 'ribbons' ? 0.2 : 0.16) * (0.7 + random() * 0.6);
        const colour = a.streamers === 'ribbons' ? (i % 2 ? '#fbf3f0' : '#e56d9c') : tinsel[i % tinsel.length];
        const strand = new THREE.Mesh(new THREE.BoxGeometry(a.streamers === 'ribbons' ? 0.016 : 0.008, length, 0.002), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: a.streamers === 'ribbons' ? 0 : 0.5, emissive: colour, emissiveIntensity: 0.12 }));
        strand.geometry.translate(0, -length / 2, 0);
        strand.rotation.set((random() - 0.3) * 0.9, random() * 3, (random() - 0.5) * 0.9);
        strand.castShadow = true;
        tuft.add(strand);
      }
    }
    if (a.extra === 'bell') {
      into(steer, s.ball([0.03, 0.022, 0.03], [0.12, barY + 0.03, -0.015], chrome, 14));
      into(steer, s.box([0.012, 0.006, 0.02], [0.15, barY + 0.03, -0.015], rubberDark));
    } else if (a.extra === 'horn') {
      into(steer, s.ball([0.035, 0.035, 0.045], [-0.12, barY + 0.035, -0.07], rubberDark, 14));
      const bell = into(steer, s.cylinder(0.045, 0.012, 0.09, [-0.12, barY + 0.035, 0.01], chrome, 14)) as THREE.Mesh; bell.rotation.x = Math.PI / 2;
    } else if (a.extra === 'plate') {
      const names = ['SAM', 'LUCY', 'BEN', 'ANNA', 'JOE', 'MAY'];
      const plate = into(steer, s.label(names[Math.floor(random() * names.length)], 0.15, 0.06, [0, 0.52, 0.03], '#f6f2e6', main)) as THREE.Mesh;
      plate.rotation.x = -0.15;
    }

    // Cargo on the step.
    const stepY = RR + 0.045;
    if (a.cargo === 'teddy') {
      const fur = s.material('#b9853f', { roughness: 1 });
      const bear = new THREE.Group(); bear.position.set(0.02, stepY, rearZ - 0.01); bear.rotation.y = (random() - 0.5) * 0.6; bear.rotation.x = -0.12; trike.add(bear);
      into(bear, s.ball([0.06, 0.07, 0.055], [0, 0.07, 0], fur, 12));
      into(bear, s.ball([0.05, 0.048, 0.048], [0, 0.175, 0.005], fur, 12));
      into(bear, s.ball([0.022, 0.018, 0.022], [0, 0.165, 0.048], s.material('#e3c690'), 8));
      for (const sx of [-1, 1]) {
        into(bear, s.ball([0.02, 0.02, 0.012], [sx * 0.04, 0.215, 0], fur, 8));
        into(bear, s.ball([0.022, 0.045, 0.022], [sx * 0.07, 0.09, 0.02], fur, 8)).rotation.z = sx * 0.6;
        into(bear, s.ball([0.026, 0.026, 0.05], [sx * 0.035, 0.02, 0.06], fur, 8));
        into(bear, s.ball([0.007, 0.007, 0.007], [sx * 0.018, 0.19, 0.045], rubberDark, 6));
      }
    } else if (a.cargo === 'basket') {
      const wicker = s.material('#c49a55', { roughness: 1 });
      const basket = into(trike, s.cylinder(0.085, 0.065, 0.09, [0, stepY + 0.045, rearZ - 0.01], wicker, 14)) as THREE.Mesh; basket.scale.z = 0.7;
      into(trike, s.ring(0.085, 0.007, [0, stepY + 0.09, rearZ - 0.01], wicker, Math.PI)).scale.set(1, 1.1, 1);
      const petals = ['#f4c62c', '#fbfaf2', '#e56d9c', '#8f5fd0'];
      for (let i = 0; i < 7; i++) {
        const x = (random() - 0.5) * 0.12, z = rearZ - 0.01 + (random() - 0.5) * 0.07, h = 0.05 + random() * 0.06;
        rodIn(trike, [x, stepY + 0.07, z], [x * 1.3, stepY + 0.09 + h, z], 0.003, s.material('#4f8a3c'));
        into(trike, s.ball([0.018, 0.012, 0.018], [x * 1.3, stepY + 0.095 + h, z], s.material(petals[i % 4]), 8));
      }
    } else if (a.cargo === 'stones') {
      const bucket = into(trike, s.cylinder(0.07, 0.05, 0.1, [0.02, stepY + 0.05, rearZ - 0.01], s.material('#2f86d6', { roughness: 0.4 }), 14));
      void bucket;
      for (let i = 0; i < 9; i++) into(trike, s.ball([0.02 + random() * 0.012, 0.014 + random() * 0.008, 0.02 + random() * 0.01], [0.02 + (random() - 0.5) * 0.08, stepY + 0.1 + random() * 0.012, rearZ - 0.01 + (random() - 0.5) * 0.08], s.material(['#8f8c84', '#a9a294', '#6f6d68'][i % 3]), 8));
      into(trike, s.ring(0.07, 0.004, [0.02, stepY + 0.1, rearZ - 0.01], s.material('#f4f4ee'), Math.PI));
    }

    if (a.why === 'gift') {
      const ribbon = s.material('#d8352f', { roughness: 0.4 });
      for (const sx of [-1, 1]) { const loop = into(steer, s.ring(0.045, 0.014, [sx * 0.05, barY + 0.04, 0.01], ribbon)) as THREE.Mesh; loop.scale.set(1.2, 0.8, 1); loop.rotation.z = sx * 0.4; }
      into(steer, s.ball([0.022, 0.022, 0.022], [0, barY + 0.03, 0.012], ribbon, 8));
      for (const sx of [-1, 1]) into(steer, s.box([0.022, 0.13, 0.003], [sx * 0.03, barY - 0.05, 0.015], ribbon)).rotation.z = sx * 0.3;
      const tag = into(steer, s.box([0.06, 0.085, 0.002], [0.09, barY - 0.08, 0.02], s.material('#f1e7c9'))) as THREE.Mesh; tag.rotation.z = 0.25;
    }
    if (wear > 0.45) {
      // Rust flowers where the paint has gone.
      const spots = Math.round((wear - 0.45) * 22);
      const path = new THREE.CatmullRomCurve3([[0, 0.47, 0.2], [0, 0.44, 0.1], [0, 0.3, -0.08], [0, 0.17, -0.22], [0, RR, rearZ]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      for (let i = 0; i < spots; i++) { const p = path.getPoint(random()); into(trike, s.ball([0.024, 0.024, 0.03 + random() * 0.03], [p.x, p.y, p.z], rust, 6)); }
    }

    // Pose.
    const steerAngle = a.pose === 'turned' ? (random() > 0.5 ? 1 : -1) * mix(0.6, 1.0, random()) : a.pose === 'parked' ? (random() - 0.5) * 0.08 : (random() - 0.5) * 1.2;
    steer.rotation.y = steerAngle;
    if (a.pose === 'tipped') { trike.rotation.z = (random() > 0.5 ? 1 : -1) * 1.32; trike.rotation.y = (random() - 0.5) * 0.8; trike.rotation.order = 'YZX'; }
    else if (a.pose === 'upturned') { trike.rotation.z = Math.PI; trike.rotation.x = 0.04; trike.rotation.y = (random() - 0.5) * 0.5; trike.rotation.order = 'YZX'; }
    else trike.rotation.y = (random() - 0.5) * 0.3;
    // Stand the posed trike on the ground before adding what lies around it.
    trike.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(trike);
    trike.position.y -= box.min.y;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;

    if (a.why === 'outgrown') {
      const blades: { at: [number, number, number]; size: number; color: string }[] = [];
      const n = Math.round(mix(40, 110, mood.density));
      for (let i = 0; i < n; i++) {
        const near = i % 3 === 0;
        const x = near ? cx + (random() - 0.5) * 0.14 : mix(box.min.x - 0.08, box.max.x + 0.08, random());
        const z = near ? box.max.z - 0.17 + (random() - 0.5) * 0.25 : mix(box.min.z - 0.08, box.max.z + 0.08, random());
        blades.push({ at: [x, 0, z], size: 0.5 + random() * (near ? 1.5 : 0.9), color: ['#6f9a3c', '#89ad45', '#a8a84a', '#5b8a3a'][i % 4] });
      }
      const blade = new THREE.ConeGeometry(0.012, 0.16, 4); blade.translate(0, 0.08, 0);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    } else if (a.why === 'rain') {
      const puddle = s.mesh(new THREE.CircleGeometry(1, 30), s.material('#6d8794', { roughness: 0.06, metalness: 0.3 }), [cx + 0.05, 0.003, cz]);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(0.42 + random() * 0.1, 0.55 + random() * 0.12, 1); puddle.rotation.z = random() * 3; puddle.castShadow = false;
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 26; i++) drops.push({ at: [cx + (random() - 0.5) * 0.9, 0.006, cz + (random() - 0.5) * 1.1], size: 0.012 + random() * 0.02 });
      const ripple = new THREE.TorusGeometry(1, 0.12, 4, 12); ripple.rotateX(Math.PI / 2);
      s.scatter(ripple, s.material('#c9d9df', { roughness: 0.2 }), drops).castShadow = false;
    }

    const spinning = a.why === 'called-in' ? mix(2.5, 9, mood.energy) : a.pose === 'upturned' ? mix(0.3, 1.5, mood.energy) : 0;
    const flutter = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (dt, time) => {
        spin.rotation.x += dt * spinning;
        streamerGroups.forEach((tuft, i) => { tuft.rotation.x = Math.sin(time * 2.1 * flutter + i) * 0.12 * flutter; tuft.rotation.z = Math.cos(time * 1.6 * flutter + i * 2) * 0.1 * flutter; });
      },
    });
  },
});

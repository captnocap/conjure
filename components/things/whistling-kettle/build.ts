import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[];

const SHAPES: Record<'squat' | 'cone' | 'belly', { profile: Profile; top: number; neck: number; reach: number }> = {
  squat: { profile: [[0, 0], [0.1, 0], [0.114, 0.012], [0.122, 0.05], [0.114, 0.09], [0.088, 0.122], [0.058, 0.136], [0.052, 0.142]], top: 0.142, neck: 0.052, reach: 0.118 },
  cone: { profile: [[0, 0], [0.118, 0], [0.126, 0.01], [0.118, 0.04], [0.098, 0.09], [0.074, 0.14], [0.056, 0.168], [0.052, 0.174]], top: 0.174, neck: 0.052, reach: 0.11 },
  belly: { profile: [[0, 0], [0.078, 0], [0.098, 0.016], [0.126, 0.066], [0.12, 0.108], [0.086, 0.146], [0.06, 0.166], [0.055, 0.176]], top: 0.176, neck: 0.055, reach: 0.122 },
};

const FINISH: Record<string, { base: string; rim: string; metal: number; rough: number }> = {
  'cream-green': { base: '#efe6c8', rim: '#3f7a4d', metal: 0.05, rough: 0.32 },
  'red-dots': { base: '#c2302b', rim: '#27201d', metal: 0.05, rough: 0.3 },
  'blue-speckle': { base: '#2f5f9e', rim: '#1b2a45', metal: 0.05, rough: 0.34 },
  'white-floral': { base: '#f4f1e8', rim: '#2c4f8a', metal: 0.05, rough: 0.3 },
  aluminium: { base: '#b9bcba', rim: '#9a9d9b', metal: 0.75, rough: 0.42 },
  copper: { base: '#c0723f', rim: '#d9c9a8', metal: 0.85, rough: 0.3 },
};

export default defineThing({
  questions: {
    state: choice('What is the kettle doing right now?', {
      cold: 'Cold and silent on an unlit ring, waiting for someone to come home.',
      warming: 'Just lit: a low blue flame and the first thin wisp from the spout.',
      boiling: 'At a full rolling boil, shrieking a tall plume of steam with the lid rattling.',
      dry: 'Forgotten and boiled dry: flame still roaring, no steam left, the base scorched black.',
    }),
    shape: choice('What shape is the kettle body?', {
      squat: 'A low rounded dome, the classic enamel farmhouse kettle.',
      cone: 'A wide-based cone tapering to a small lid, light and utilitarian.',
      belly: 'A pot-bellied body swelling out above a narrow foot, old and generous.',
    }),
    finish: choice('What is the kettle made of and what colour?', {
      'cream-green': 'Cream enamel with a green rim, pre-war and thrifty.',
      'red-dots': 'Glossy red enamel with white polka dots, cheerful and loud.',
      'blue-speckle': 'Blue graniteware speckled with white, camp and countryside.',
      'white-floral': 'White enamel with a hand-painted band of blue flowers, kept for best.',
      aluminium: 'Bare dull aluminium, plain, institutional, bought once and never replaced.',
      copper: 'Polished copper with a pale lid, a wedding present still shined on Sundays.',
    }),
    whistle: choice('What sits on the end of the spout?', {
      cap: 'A plain flip cap with a small hole, the ordinary whistle.',
      bird: 'A little bird that sings when the water boils.',
      flipped: 'The whistle cap flipped up and open, silenced by someone who hates the noise.',
      lost: 'Nothing: the whistle was lost years ago and the spout is bare.',
    }),
    handle: choice('What kind of handle does it have?', {
      bakelite: 'A fixed high arch with a thick black heatproof grip.',
      bail: 'A thin wire bail with a turned wooden grip, flopped a little to one side.',
      strap: 'A flat metal strap riveted front and back, wrapped in a scrap of cloth.',
    }),
    stand: choice('What is the single gas ring it sits on?', {
      ring: 'A squat cast-iron tabletop burner with a rubber hose trailing away.',
      stove: 'A cut corner of a white enamel cooker top with one burner and one knob.',
      camp: 'A small camping stove screwed onto a blue gas canister.',
    }),
    beside: choice('What waits beside it?', {
      nothing: 'Nothing at all, only the kettle.',
      cup: 'A cup and saucer with a spoon, ready for one.',
      matches: 'A box of matches and a few spent ones.',
      caddy: 'A tea caddy tin with its lid beside it.',
      pair: 'Two mismatched mugs, because someone is expected.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = SHAPES[a.shape];
    const finish = FINISH[a.finish];
    const metalBody = a.finish === 'aluminium' || a.finish === 'copper';
    const lit = a.state !== 'cold';
    const dry = a.state === 'dry';

    const iron = s.material('#2b2c2e', { roughness: 0.8, metalness: 0.3 });
    const steel = s.material('#c9cdcf', { metalness: 0.8, roughness: 0.3 });
    const black = s.material('#17181a', { roughness: 0.45 });

    // ---- the gas ring -------------------------------------------------------------------
    let hob = 0.1; // height of the pan supports, where the kettle base rests
    if (a.stand === 'ring') {
      s.lathe([[0, 0.02], [0.15, 0.02], [0.16, 0.035], [0.15, 0.06], [0.1, 0.07], [0.06, 0.075], [0, 0.075]], iron);
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.5;
        s.cylinder(0.014, 0.02, 0.022, [Math.cos(t) * 0.13, 0.011, Math.sin(t) * 0.13], iron, 10);
      }
      s.cylinder(0.05, 0.055, 0.02, [0, 0.083, 0], s.material('#8d7a55', { metalness: 0.6, roughness: 0.4 }));
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const arm = s.box([0.14, 0.03, 0.014], [Math.cos(t) * 0.1, 0.086, Math.sin(t) * 0.1], iron);
        arm.rotation.y = -t;
      }
      // tap, knob and the hose that wanders off across the table
      s.rod([0.1, 0.045, 0.1], [0.17, 0.045, 0.17], 0.012, steel);
      const knob = s.cylinder(0.024, 0.024, 0.016, [0.178, 0.045, 0.178], s.material('#b8322c'), 14);
      knob.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
      const bend = 0.04 + random() * 0.08;
      s.tube([[-0.14, 0.045, -0.05], [-0.2, 0.03, -0.07], [-0.26, 0.014, -0.05 + bend], [-0.31, 0.012, 0.02 + bend], [-0.36, 0.012, -0.02]], 0.011, s.material('#b5683a', { roughness: 0.7 }));
    } else if (a.stand === 'stove') {
      hob = 0.115;
      const enamel = s.material('#f1eee4', { roughness: 0.3 });
      s.box([0.42, 0.07, 0.4], [0, 0.035, 0], enamel);
      s.box([0.42, 0.012, 0.4], [0, 0.076, 0], s.material('#dcd8cb', { roughness: 0.35 }));
      s.cylinder(0.12, 0.12, 0.012, [0, 0.086, 0], iron, 28);
      s.cylinder(0.048, 0.052, 0.022, [0, 0.096, 0], s.material('#8d7a55', { metalness: 0.6, roughness: 0.4 }));
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2;
        const arm = s.box([0.15, 0.022, 0.014], [Math.cos(t) * 0.1, 0.104, Math.sin(t) * 0.1], iron);
        arm.rotation.y = -t;
      }
      const dial = s.cylinder(0.026, 0.03, 0.03, [0.13, 0.035, 0.212], black, 16);
      dial.rotation.x = Math.PI / 2;
      s.box([0.006, 0.03, 0.006], [0.13, 0.04, 0.229], s.material('#e9e4d4'));
      s.box([0.3, 0.012, 0.012], [-0.04, 0.05, 0.212], steel);
    } else {
      hob = 0.2;
      s.lathe([[0, 0], [0.08, 0], [0.09, 0.012], [0.09, 0.085], [0.07, 0.105], [0.03, 0.112], [0.018, 0.13], [0, 0.13]], s.material('#2c63a8', { roughness: 0.4, metalness: 0.3 }));
      s.cylinder(0.091, 0.091, 0.03, [0, 0.05, 0], s.material('#f1ead8'), 28);
      s.cylinder(0.02, 0.02, 0.04, [0, 0.145, 0], steel, 12);
      s.cylinder(0.042, 0.03, 0.022, [0, 0.172, 0], s.material('#8d7a55', { metalness: 0.6, roughness: 0.4 }));
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.3;
        s.rod([Math.cos(t) * 0.03, 0.16, Math.sin(t) * 0.03], [Math.cos(t) * 0.12, 0.194, Math.sin(t) * 0.12], 0.007, steel);
        s.box([0.02, 0.012, 0.02], [Math.cos(t) * 0.115, 0.194, Math.sin(t) * 0.115], steel);
      }
      s.rod([0.02, 0.15, 0], [0.075, 0.15, 0.03], 0.006, steel);
      s.cylinder(0.014, 0.014, 0.012, [0.08, 0.15, 0.033], s.material('#b8322c'), 12);
    }

    // ---- flame --------------------------------------------------------------------------
    const flames: THREE.Mesh[] = [];
    if (lit) {
      const strength = { warming: 0.45, boiling: 0.85, dry: 1.15 }[a.state as 'warming' | 'boiling' | 'dry'];
      const blue = new THREE.MeshStandardMaterial({ color: '#3f8dff', emissive: '#2f7dff', emissiveIntensity: 1.6, roughness: 0.6 });
      const tip = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff8a1e', emissiveIntensity: 1.8, roughness: 0.6 });
      const jets = 14;
      for (let i = 0; i < jets; i++) {
        const t = (i / jets) * Math.PI * 2;
        const h = 0.03 * strength * mix(0.8, 1.2, random());
        const flame = s.mesh(new THREE.ConeGeometry(0.009, h, 6), dry && i % 3 === 0 ? tip : blue, [Math.cos(t) * 0.062, hob - 0.014 + h / 2, Math.sin(t) * 0.062]);
        flame.rotation.set(Math.sin(t) * 0.5, 0, -Math.cos(t) * 0.5);
        flame.castShadow = false;
        flames.push(flame);
      }
      if (dry) {
        // flame licking up round the base, and the base itself glowing
        for (let i = 0; i < 7; i++) {
          const t = random() * Math.PI * 2, h = 0.04 + random() * 0.04;
          const lick = s.mesh(new THREE.ConeGeometry(0.01, h, 6), tip, [Math.cos(t) * (shape.profile[1][0] + 0.012), hob + h / 2 - 0.005, Math.sin(t) * (shape.profile[1][0] + 0.012)]);
          lick.castShadow = false;
          flames.push(lick);
        }
      }
    }

    // ---- kettle body with painted enamel and real dents ---------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = finish.base;
    ctx.fillRect(0, 0, 512, 256);
    if (a.finish === 'red-dots') {
      ctx.fillStyle = '#f6f1e6';
      for (let row = 0; row < 4; row++) for (let i = 0; i < 12; i++) {
        ctx.beginPath(); ctx.arc((i + (row % 2) * 0.5) * (512 / 12), 60 + row * 40, 9, 0, 7); ctx.fill();
      }
    } else if (a.finish === 'blue-speckle') {
      ctx.fillStyle = '#eef2f6';
      for (let i = 0; i < 900; i++) { ctx.beginPath(); ctx.arc(random() * 512, random() * 256, 0.6 + random() * 2.2, 0, 7); ctx.fill(); }
    } else if (a.finish === 'white-floral') {
      for (let i = 0; i < 10; i++) {
        const x = i * 51.2 + 25, y = 122;
        ctx.strokeStyle = '#3f7a4d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 25, y + 14); ctx.quadraticCurveTo(x, y + 30, x + 25, y + 14); ctx.stroke();
        ctx.fillStyle = '#2c4f8a';
        for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 9, y + Math.sin(p * 1.257) * 9, 6.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#e8b93c'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#2c4f8a'; ctx.fillRect(0, 84, 512, 4); ctx.fillRect(0, 166, 512, 4);
    } else if (metalBody) {
      // brushed rings
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + random() * 0.06})`; ctx.fillRect(0, random() * 256, 512, 1 + random() * 2); }
    }
    // rim band at the neck (top of the canvas is the top of the profile)
    ctx.fillStyle = finish.rim; ctx.fillRect(0, 0, 512, 22);
    // chips, soot and scorch read from the mood
    const chips = Math.round(mood.wear * 26);
    for (let i = 0; i < chips; i++) {
      const x = random() * 512, y = 20 + random() * 220, r = 3 + random() * 9 * mood.wear;
      ctx.fillStyle = metalBody ? 'rgba(60,55,50,0.45)' : '#221f1d';
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + random() * 0.6), random() * 3, 0, 7); ctx.fill();
      if (!metalBody) { ctx.fillStyle = '#7b4a2a'; ctx.beginPath(); ctx.arc(x + 1, y + 1, r * 0.45, 0, 7); ctx.fill(); }
    }
    const scorch = ctx.createLinearGradient(0, 256, 0, dry ? 70 : 256 - 40 - mood.wear * 70);
    scorch.addColorStop(0, dry ? 'rgba(12,10,9,0.98)' : `rgba(30,24,20,${0.35 + mood.wear * 0.5})`);
    scorch.addColorStop(dry ? 0.55 : 0.4, dry ? 'rgba(40,24,14,0.8)' : `rgba(60,44,30,${0.15 + mood.wear * 0.3})`);
    scorch.addColorStop(1, 'rgba(60,40,20,0)');
    ctx.fillStyle = scorch; ctx.fillRect(0, 0, 512, 256);
    if (dry) for (let i = 0; i < 16; i++) {
      const x = random() * 512;
      const streak = ctx.createLinearGradient(0, 256, 0, 40 + random() * 80);
      streak.addColorStop(0, 'rgba(10,8,8,0.9)'); streak.addColorStop(1, 'rgba(10,8,8,0)');
      ctx.fillStyle = streak; ctx.fillRect(x, 0, 8 + random() * 22, 256);
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = THREE.RepeatWrapping;
    const bodyMaterial = new THREE.MeshStandardMaterial({ map: skin, metalness: finish.metal, roughness: finish.rough + mood.wear * 0.25 });
    if (dry) { bodyMaterial.emissive = new THREE.Color('#ff3b0a'); bodyMaterial.emissiveIntensity = 0.12; }

    const kettle = new THREE.Group();
    kettle.position.y = hob;
    s.root.add(kettle);
    const add = <T extends THREE.Object3D>(node: T) => { kettle.add(node); return node; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      return add(mesh);
    };

    // smooth the profile so the body is round rather than faceted
    const curve = new THREE.SplineCurve(shape.profile.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
    const points = [new THREE.Vector2(0, 0), ...curve.getPoints(22)];
    const bodyGeometry = new THREE.LatheGeometry(points, 48);
    const position = bodyGeometry.attributes.position;
    const dents = Math.round(mood.wear * 5 + random() * 1.4);
    const v = new THREE.Vector3();
    for (let d = 0; d < dents; d++) {
      const t = random() * Math.PI * 2, y = mix(0.03, shape.top * 0.75, random());
      const radius = 0.03 + random() * 0.035, depth = (0.012 + random() * 0.02) * mix(0.6, 1.3, mood.wear);
      const centre = new THREE.Vector3(Math.cos(t) * 0.115, y, Math.sin(t) * 0.115);
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        const distance = v.distanceTo(centre);
        if (distance >= radius || v.y < 0.004) continue;
        const push = depth * (1 - distance / radius) ** 2;
        const r = Math.hypot(v.x, v.z) || 1;
        position.setXYZ(i, v.x - (v.x / r) * push, v.y, v.z - (v.z / r) * push);
      }
    }
    bodyGeometry.computeVertexNormals();
    solid(bodyGeometry, bodyMaterial);

    // lid, lifted and tilted when it rattles or was knocked askew
    const trim = metalBody ? new THREE.MeshStandardMaterial({ color: a.finish === 'copper' ? '#d9cfb4' : finish.base, metalness: 0.75, roughness: 0.35 })
      : new THREE.MeshStandardMaterial({ color: finish.base, roughness: finish.rough });
    const rimPaint = new THREE.MeshStandardMaterial({ color: finish.rim, roughness: 0.4, metalness: metalBody ? 0.7 : 0.05 });
    const lid = add(new THREE.Group());
    lid.position.y = shape.top;
    const dome = new THREE.Mesh(new THREE.LatheGeometry([[shape.neck + 0.004, 0], [shape.neck + 0.003, 0.006], [shape.neck * 0.7, 0.018], [shape.neck * 0.3, 0.025], [0, 0.026]].map(([x, y]) => new THREE.Vector2(x, y)), 32), trim);
    const lidRim = new THREE.Mesh(new THREE.TorusGeometry(shape.neck + 0.003, 0.004, 8, 32), rimPaint);
    lidRim.rotation.x = Math.PI / 2;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), black);
    knob.position.y = 0.036;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.012, 8), black);
    stem.position.y = 0.027;
    for (const part of [dome, lidRim, knob, stem]) { part.castShadow = true; lid.add(part); }
    const lidRest = dry ? 0.16 + random() * 0.1 : mood.wear * 0.05;
    lid.rotation.z = lidRest;
    if (dry) lid.position.x = 0.012;

    // spout: tapering, rising from the shoulder toward +x
    const spoutBase = new THREE.Vector3(shape.reach * 0.86, shape.top * 0.42, 0);
    const spoutMid = new THREE.Vector3(shape.reach + 0.045, shape.top * 0.6, 0);
    const spoutTip = new THREE.Vector3(shape.reach + 0.085, shape.top * 0.98, 0);
    const spoutCurve = new THREE.QuadraticBezierCurve3(spoutBase, spoutMid, spoutTip);
    const spoutMaterial = metalBody ? trim : new THREE.MeshStandardMaterial({ color: finish.base, roughness: finish.rough });
    const segments = 7;
    for (let i = 0; i < segments; i++) {
      const p = spoutCurve.getPoint(i / segments), q = spoutCurve.getPoint((i + 1) / segments);
      const r0 = mix(0.03, 0.012, i / segments), r1 = mix(0.03, 0.012, (i + 1) / segments);
      const direction = q.clone().sub(p);
      const piece = solid(new THREE.CylinderGeometry(r1, r0, direction.length() * 1.08, 14), spoutMaterial);
      piece.position.copy(p).add(q).multiplyScalar(0.5);
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }
    const tipDirection = spoutCurve.getTangent(1).normalize();
    const capMount = add(new THREE.Group());
    capMount.position.copy(spoutTip);
    capMount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDirection);
    if (a.whistle !== 'lost') {
      const cap = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.018, 14), a.whistle === 'bird' ? new THREE.MeshStandardMaterial({ color: '#d7a72c', metalness: 0.6, roughness: 0.35 }) : black);
      shell.position.y = 0.009; shell.castShadow = true; cap.add(shell);
      if (a.whistle === 'bird') {
        const gold = shell.material;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), gold); body.scale.set(1.3, 1, 0.9); body.position.set(0, 0.03, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), gold); head.position.set(0.018, 0.042, 0);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 6), new THREE.MeshStandardMaterial({ color: '#c0392b' })); beak.position.set(0.031, 0.042, 0); beak.rotation.z = -Math.PI / 2;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.014), gold); tail.position.set(-0.026, 0.038, 0); tail.rotation.z = -0.5;
        for (const part of [body, head, beak, tail]) { part.castShadow = true; cap.add(part); }
      } else {
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 8), steel); hole.position.y = 0.019; cap.add(hole);
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.008), black); lever.position.set(-0.024, 0.012, 0); lever.castShadow = true; cap.add(lever);
      }
      if (a.whistle === 'flipped') { cap.position.set(-0.016, 0.002, 0); cap.rotation.z = 1.9; }
      capMount.add(cap);
    }

    // handle
    const handleTop = shape.top + 0.115;
    if (a.handle === 'bakelite') {
      const arch = new THREE.CatmullRomCurve3([[-0.085, shape.top - 0.035, 0], [-0.088, shape.top + 0.05, 0], [-0.05, handleTop, 0], [0.05, handleTop, 0], [0.088, shape.top + 0.05, 0], [0.085, shape.top - 0.035, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      solid(new THREE.TubeGeometry(arch, 40, 0.006, 8), steel);
      const grip = new THREE.CatmullRomCurve3([[-0.058, handleTop - 0.006, 0], [-0.03, handleTop + 0.003, 0], [0.03, handleTop + 0.003, 0], [0.058, handleTop - 0.006, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      solid(new THREE.TubeGeometry(grip, 20, 0.014, 10), black);
    } else if (a.handle === 'bail') {
      const bail = add(new THREE.Group());
      bail.position.y = shape.top - 0.03;
      const span = 0.092;
      const arch = new THREE.CatmullRomCurve3([[-span, 0, 0], [-span, 0.08, 0], [-0.045, 0.14, 0], [0.045, 0.14, 0], [span, 0.08, 0], [span, 0, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const wire = new THREE.Mesh(new THREE.TubeGeometry(arch, 40, 0.0035, 6), steel); wire.castShadow = true; bail.add(wire);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.075, 12), s.material('#9a6a3c', { roughness: 0.7 }));
      grip.rotation.z = Math.PI / 2; grip.position.y = 0.143; grip.castShadow = true; bail.add(grip);
      bail.rotation.x = (random() < 0.5 ? -1 : 1) * mix(0.25, 0.7, random());
      for (const x of [-span, span]) solid(new THREE.SphereGeometry(0.008, 8, 6), steel).position.set(x, shape.top - 0.03, 0);
    } else {
      const arch = new THREE.CatmullRomCurve3([[-0.07, shape.top - 0.02, 0], [-0.085, shape.top + 0.06, 0], [-0.04, handleTop - 0.01, 0], [0.04, handleTop - 0.01, 0], [0.085, shape.top + 0.06, 0], [0.07, shape.top - 0.02, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const strap = solid(new THREE.TubeGeometry(arch, 40, 0.008, 8), trim);
      strap.scale.z = 1.6;
      const cloth = new THREE.CatmullRomCurve3([[-0.05, handleTop - 0.016, 0], [-0.02, handleTop - 0.008, 0], [0.02, handleTop - 0.008, 0], [0.05, handleTop - 0.016, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      solid(new THREE.TubeGeometry(cloth, 20, 0.016, 8), s.material(mood.cheer > 0.5 ? '#c9534a' : '#7d8794', { roughness: 0.95 }));
    }
    // turn the whole kettle a little so the spout is seen in profile but not dead flat
    kettle.rotation.y = mix(-0.5, 0.35, random());

    // ---- what waits beside it -----------------------------------------------------------
    const china = s.material('#f3efe4', { roughness: 0.35 });
    const cup = (x: number, z: number, colour: string, mug: boolean) => {
      const paint = s.material(colour, { roughness: 0.4 });
      if (mug) {
        s.lathe([[0, 0], [0.036, 0], [0.038, 0.004], [0.038, 0.085], [0.034, 0.085], [0.034, 0.008], [0, 0.008]], paint, [x, 0, z]);
        s.ring(0.022, 0.005, [x + 0.045, 0.045, z], paint).rotation.y = 0;
        s.cylinder(0.033, 0.033, 0.002, [x, 0.07, z], s.material('#6b3a1c', { roughness: 0.2 }), 18);
      } else {
        s.lathe([[0, 0], [0.07, 0.004], [0.078, 0.014], [0.074, 0.014], [0.04, 0.006], [0, 0.006]], china, [x, 0, z]);
        s.lathe([[0, 0.008], [0.022, 0.008], [0.026, 0.014], [0.042, 0.06], [0.039, 0.06], [0.024, 0.018], [0, 0.014]], paint, [x, 0, z]);
        s.ring(0.016, 0.004, [x + 0.05, 0.038, z], paint);
        s.rod([x - 0.06, 0.016, z + 0.03], [x + 0.01, 0.018, z + 0.068], 0.003, steel);
      }
    };
    const sideX = -0.3, sideZ = 0.12;
    if (a.beside === 'cup') cup(sideX + 0.04, sideZ, mood.cheer > 0.5 ? '#f3efe4' : '#dcd7c8', false);
    else if (a.beside === 'pair') { cup(sideX + 0.02, sideZ + 0.05, '#c9a23a', true); cup(sideX + 0.12, sideZ - 0.07, '#5d7f9c', true); }
    else if (a.beside === 'matches') {
      const box = s.box([0.055, 0.016, 0.036], [sideX + 0.06, 0.008, sideZ], s.material('#c53a2e'));
      box.rotation.y = random() * 1.2;
      s.box([0.045, 0.0165, 0.02], [sideX + 0.06, 0.008, sideZ], s.material('#f0d04a')).rotation.y = box.rotation.y;
      const wood = s.material('#d9b98a'), burnt = s.material('#1c1a19');
      for (let i = 0; i < 3 + Math.floor(random() * 4); i++) {
        const x = sideX + random() * 0.16, z = sideZ + 0.05 + random() * 0.08, t = random() * Math.PI;
        s.rod([x, 0.002, z], [x + Math.cos(t) * 0.04, 0.002, z + Math.sin(t) * 0.04], 0.0016, wood);
        s.ball([0.003, 0.003, 0.003], [x + Math.cos(t) * 0.04, 0.003, z + Math.sin(t) * 0.04], burnt, 6);
      }
    } else if (a.beside === 'caddy') {
      const tin = s.material(mood.cheer > 0.5 ? '#b8323a' : '#2f5a4a', { metalness: 0.5, roughness: 0.4 });
      s.box([0.085, 0.11, 0.085], [sideX + 0.06, 0.055, sideZ - 0.02], tin);
      s.label('TEA', 0.07, 0.04, [sideX + 0.06, 0.06, sideZ + 0.0235], '#3a2a18', '#e9d9a8');
      s.cylinder(0.034, 0.034, 0.012, [sideX + 0.15, 0.006, sideZ + 0.08], s.material('#c9b26a', { metalness: 0.6, roughness: 0.4 }), 20);
      s.cylinder(0.03, 0.03, 0.006, [sideX + 0.06, 0.113, sideZ - 0.02], s.material('#3c2a1a'), 18);
    }

    // ---- steam --------------------------------------------------------------------------
    const amount = { cold: 0, warming: 5, boiling: 24, dry: 0 }[a.state];
    const steamMaterial = new THREE.MeshStandardMaterial({ color: '#f7fafb', transparent: true, opacity: a.state === 'boiling' ? 0.62 : 0.4, depthWrite: false, roughness: 1 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const puffs: { mesh: THREE.Mesh; phase: number; sway: number; wide: number }[] = [];
    const steamOrigin = new THREE.Vector3(), steamAim = new THREE.Vector3();
    for (let i = 0; i < amount; i++) {
      const mesh = new THREE.Mesh(puffGeometry, steamMaterial);
      s.root.add(mesh);
      puffs.push({ mesh, phase: (i + random() * 0.6) / amount, sway: random() * Math.PI * 2, wide: mix(0.7, 1.3, random()) });
    }
    const plume = a.state === 'boiling' ? mix(0.2, 0.3, mood.energy) : 0.12;
    const speed = a.state === 'boiling' ? mix(0.35, 1.1, mood.energy) : mix(0.12, 0.3, mood.energy);
    const pose = (time: number) => {
      kettle.updateMatrixWorld(true);
      steamOrigin.set(0, a.whistle === 'lost' || a.whistle === 'flipped' ? 0.004 : 0.024, 0);
      capMount.localToWorld(steamOrigin);
      s.root.worldToLocal(steamOrigin);
      steamAim.copy(tipDirection).applyQuaternion(kettle.quaternion);
      for (const puff of puffs) {
        const t = (puff.phase + time * speed) % 1;
        // jets out along the spout first, then buoyancy takes it straight up and it spreads
        const along = Math.min(t, 0.22) * plume * 1.1;
        const rise = t * t * plume * 1.6 + t * plume * 0.5;
        puff.mesh.position.copy(steamOrigin).addScaledVector(steamAim, along);
        puff.mesh.position.y += rise;
        puff.mesh.position.x += Math.sin(puff.sway + t * 5 + time * 0.7) * 0.07 * t;
        puff.mesh.position.z += Math.cos(puff.sway * 1.7 + t * 4) * 0.07 * t;
        const size = (0.012 + t * 0.075) * puff.wide * Math.min(1, (1 - t) * 3.5);
        puff.mesh.scale.setScalar(Math.max(size, 0.0001));
      }
    };
    pose(0);

    const rattle = a.state === 'boiling' ? mix(0.03, 0.1, mood.energy) : 0;
    return s.finish({
      update: (_dt, time) => {
        pose(time);
        if (rattle) {
          lid.rotation.z = lidRest + Math.sin(time * 31) * rattle;
          lid.position.y = shape.top + Math.abs(Math.sin(time * 23)) * 0.004;
        }
        flames.forEach((flame, index) => { flame.scale.y = 1 + Math.sin(time * 17 + index * 2.1) * 0.22 * mix(0.4, 1, mood.energy); });
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

type Profile = readonly (readonly [number, number])[];
const BOTTLES = {
  wine: 'A tall straight-sided wine bottle with square shoulders.',
  rum: 'A squat, wide-bellied old rum bottle with a short neck, a pirate shape.',
  soda: 'A small waisted soda-pop bottle, cheap and cheerful.',
  flask: 'A flat-sided pocket flask or medicine bottle.',
  hock: 'A slender bottle tapering into a very long neck.',
  demijohn: 'A fat round jug in a woven wicker jacket.',
} as const;
// Each profile is [radius, height] from the base to the lip, in metres.
const PROFILES: Record<keyof typeof BOTTLES, { profile: Profile; squash: number; body: number }> = {
  wine: { profile: [[0, 0.004], [0.03, 0], [0.037, 0.008], [0.037, 0.17], [0.033, 0.195], [0.017, 0.225], [0.0135, 0.24], [0.0135, 0.288], [0.017, 0.29], [0.017, 0.302], [0.011, 0.302]], squash: 1, body: 0.17 },
  rum: { profile: [[0, 0.004], [0.05, 0], [0.07, 0.02], [0.076, 0.06], [0.066, 0.1], [0.032, 0.135], [0.017, 0.15], [0.016, 0.205], [0.021, 0.208], [0.021, 0.22], [0.012, 0.22]], squash: 1, body: 0.11 },
  soda: { profile: [[0, 0.003], [0.026, 0], [0.031, 0.01], [0.029, 0.04], [0.025, 0.07], [0.031, 0.11], [0.03, 0.14], [0.016, 0.19], [0.013, 0.212], [0.016, 0.215], [0.016, 0.228], [0.01, 0.228]], squash: 1, body: 0.14 },
  flask: { profile: [[0, 0.003], [0.05, 0], [0.056, 0.01], [0.056, 0.135], [0.046, 0.16], [0.017, 0.176], [0.015, 0.205], [0.019, 0.208], [0.019, 0.22], [0.011, 0.22]], squash: 0.5, body: 0.14 },
  hock: { profile: [[0, 0.004], [0.028, 0], [0.033, 0.01], [0.033, 0.12], [0.026, 0.17], [0.014, 0.25], [0.012, 0.318], [0.016, 0.32], [0.016, 0.332], [0.01, 0.332]], squash: 1, body: 0.13 },
  demijohn: { profile: [[0, 0.005], [0.07, 0], [0.105, 0.03], [0.12, 0.1], [0.108, 0.17], [0.06, 0.225], [0.026, 0.25], [0.022, 0.3], [0.03, 0.304], [0.03, 0.318], [0.018, 0.318]], squash: 1, body: 0.17 },
};
const GLASS = {
  clear: 'Clear glass, everything inside plainly visible.',
  green: 'Deep bottle green.',
  amber: 'Brown amber, like a beer or medicine bottle.',
  cobalt: 'Rich cobalt blue, an apothecary colour.',
  aqua: 'Pale sea-green aqua, old hand-blown glass with bubbles.',
  frosted: 'Milky white, sand-blasted nearly opaque by years of surf.',
} as const;
const GLASS_COLOUR: Record<keyof typeof GLASS, string> = { clear: '#dfeef0', green: '#2f7d4a', amber: '#a8641f', cobalt: '#2545b8', aqua: '#8fd0c0', frosted: '#eef2ee' };

export default defineThing({
  questions: {
    bottle: choice('What kind of bottle is it?', BOTTLES),
    glass: choice('What colour is the glass?', GLASS),
    paper: choice('What is rolled up inside?', {
      letter: 'A cream letter rolled tight and tied with a red ribbon.',
      map: 'A tan map with scorched edges, a dotted route and a red cross.',
      photograph: 'A curled photograph of people on a bright day.',
      plea: 'A torn scrap with HELP scrawled on it in thick dark strokes.',
      drawing: 'A child’s crayon drawing: a yellow sun, a house, a stick family.',
      banknotes: 'A tight roll of green banknotes, somebody’s savings.',
      nothing: 'Nothing: the message is gone, or was never written.',
    }),
    seal: choice('How is it stopped?', {
      cork: 'A plain cork pushed in flush.',
      wax: 'A cork buried under a thick blob of red sealing wax with drips.',
      twine: 'A cork lashed down with turns of twine and a trailing end.',
      swingtop: 'A white ceramic swing-top stopper on a wire bail.',
      rag: 'A twist of rag stuffed in the neck.',
      open: 'Nothing: the stopper is lost and the sea is getting in.',
    }),
    afloat: score('How long has it been adrift?', ['Thrown in this morning, label still on', 'A season at sea', 'Years: scoured, bearded with weed', 'Decades: crusted with barnacles']),
    ride: score('How does it sit in the water?', ['Lying nearly flat on the surface', 'Bobbing at a slant', 'Standing almost upright, neck in the air']),
    company: choice('What travels with it?', {
      nothing: 'Nothing but ripples.',
      crab: 'A tiny crab riding the neck.',
      weed: 'A garland of brown seaweed caught around it.',
      feather: 'A white seabird feather stuck to the wet glass.',
      driftwood: 'A grey stick of driftwood it has nudged up against.',
      petals: 'A scatter of flower petals on the water around it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const { profile, squash, body } = PROFILES[a.bottle];
    const height = profile.at(-1)![1];
    const radiusAt = (y: number) => {
      for (let i = 1; i < profile.length; i++) {
        const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
        if (y >= y0 && y <= y1 && y1 > y0) return mix(r0, r1, (y - y0) / (y1 - y0));
      }
      return profile.at(-1)![0];
    };
    const belly = Math.max(...profile.map(([r]) => r));
    const neck = profile.at(-2)![0];
    const old = a.afloat;
    const flooded = a.seal === 'open';

    const bottle = new THREE.Group();
    const put = (mesh: THREE.Object3D) => { bottle.add(mesh); return mesh; };
    bottle.scale.z = squash;

    // Contents go in first so the glass blends over them.
    const sodden = flooded ? 0.45 : 0;
    const rollR = Math.min(belly * 0.6, neck * 2.3), rollL = body * 0.82;
    const paperTint = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#6d6a55'), sodden + old * 0.15);
    const sheet = (map: THREE.Texture | null, tint: string, from = 0, sweep = Math.PI * 2) =>
      new THREE.Mesh(new THREE.CylinderGeometry(rollR, rollR * 0.92, rollL, 24, 1, true, from, sweep), new THREE.MeshStandardMaterial({ map, color: paperTint(tint), roughness: 0.9, side: THREE.DoubleSide }));
    const inside = new THREE.Group();
    inside.position.set(belly * 0.12, body * 0.52 + 0.012, 0);
    inside.rotation.set((random() - 0.5) * 0.25, random() * 6, (random() - 0.5) * 0.3);
    if (a.paper === 'letter') {
      const lines = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f3ead2'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4a4f6a';
        for (let row = 0; row < 14; row++) ctx.fillRect(14, 16 + row * 17, mix(120, 225, random()), 3);
      });
      inside.add(sheet(lines, '#ffffff'));
      const core = new THREE.Mesh(new THREE.CylinderGeometry(rollR * 0.55, rollR * 0.55, rollL * 0.99, 16, 1, true), new THREE.MeshStandardMaterial({ color: paperTint('#e2d7b9'), side: THREE.DoubleSide }));
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(rollR * 1.06, rollR * 1.06, rollL * 0.1, 20), new THREE.MeshStandardMaterial({ color: '#c62b36', roughness: 0.6 }));
      const bow = new THREE.Mesh(new THREE.TorusGeometry(rollR * 0.5, rollR * 0.12, 6, 14), ribbon.material);
      bow.position.set(rollR * 1.2, 0, 0);
      inside.add(core, ribbon, bow);
    } else if (a.paper === 'map') {
      const chart = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#d9b97a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5b3a1c'; ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h - 14, w, 14);
        ctx.strokeStyle = '#6b4a25'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(20, 60);
        for (let i = 1; i < 8; i++) ctx.lineTo(20 + i * 30, 60 + Math.sin(i * 1.7) * 30 + i * 12);
        ctx.stroke();
        ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(30, 200); ctx.quadraticCurveTo(120, 90, 210, 150); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = '#c0281f'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(196, 136); ctx.lineTo(226, 166); ctx.moveTo(226, 136); ctx.lineTo(196, 166); ctx.stroke();
      });
      inside.add(sheet(chart, '#ffffff'));
      inside.add(new THREE.Mesh(new THREE.CylinderGeometry(rollR * 0.6, rollR * 0.6, rollL * 1.02, 16, 1, true), new THREE.MeshStandardMaterial({ color: paperTint('#b8935a'), side: THREE.DoubleSide })));
    } else if (a.paper === 'photograph') {
      const photo = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7fb8dc'; ctx.fillRect(18, 18, w - 36, 130);
        ctx.fillStyle = '#d6c08a'; ctx.fillRect(18, 148, w - 36, 60);
        ctx.fillStyle = '#f3d04a'; ctx.beginPath(); ctx.arc(200, 54, 20, 0, 7); ctx.fill();
        for (const [x, c] of [[90, '#c8443a'], [128, '#2f4f8a'], [160, '#e8a43a']] as const) {
          ctx.fillStyle = c; ctx.fillRect(x - 11, 112, 22, 70);
          ctx.fillStyle = '#e3b48f'; ctx.beginPath(); ctx.arc(x, 100, 12, 0, 7); ctx.fill();
        }
      });
      inside.add(sheet(photo, '#ffffff', -1.9, 3.8));
    } else if (a.paper === 'plea') {
      const scrap = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2a1c18'; ctx.font = 'bold 92px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('HELP', 0, 0, 230); ctx.restore();
      });
      inside.add(sheet(scrap, '#ffffff', -1.6, 3.2));
    } else if (a.paper === 'drawing') {
      const crayon = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f6c21f'; ctx.beginPath(); ctx.arc(60, 60, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#d8432e'; ctx.fillRect(120, 120, 90, 80);
        ctx.fillStyle = '#3a66c4'; ctx.beginPath(); ctx.moveTo(108, 122); ctx.lineTo(165, 70); ctx.lineTo(222, 122); ctx.fill();
        ctx.fillStyle = '#3f9c4a'; ctx.fillRect(0, 205, w, 51);
        ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 6;
        for (const x of [40, 72]) { ctx.beginPath(); ctx.arc(x, 150, 10, 0, 7); ctx.moveTo(x, 160); ctx.lineTo(x, 196); ctx.stroke(); }
      });
      inside.add(sheet(crayon, '#ffffff', -1.9, 3.8));
    } else if (a.paper === 'banknotes') {
      const note = painted(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#7fa377'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3f6a46'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, 7); ctx.stroke();
      });
      inside.add(sheet(note, '#ffffff'));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(rollR * 1.05, rollR * 1.05, rollL * 0.07, 18), new THREE.MeshStandardMaterial({ color: '#b5533a' }));
      inside.add(band, new THREE.Mesh(new THREE.CylinderGeometry(rollR * 0.7, rollR * 0.7, rollL * 1.01, 14, 1, true), new THREE.MeshStandardMaterial({ color: paperTint('#6d9468'), side: THREE.DoubleSide })));
    }
    inside.traverse((node) => { node.castShadow = true; });
    put(inside);
    if (flooded) {
      // Sea water sloshing in the belly.
      const level = body * 0.55;
      const slosh = profile.filter(([, y]) => y <= level).map(([r, y]) => new THREE.Vector2(Math.max(0, r - 0.004), y + 0.003));
      slosh.push(new THREE.Vector2(Math.max(0, radiusAt(level) - 0.004), level), new THREE.Vector2(0, level));
      put(new THREE.Mesh(new THREE.LatheGeometry(slosh, 24), new THREE.MeshStandardMaterial({ color: '#3d7f86', roughness: 0.2, transparent: true, opacity: 0.6 })));
    }

    // The glass itself.
    const frost = a.glass === 'frosted' ? 1 : old * 0.55;
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(GLASS_COLOUR[a.glass]).lerp(new THREE.Color('#dfe6df'), old * 0.25),
      transparent: true, opacity: mix(a.glass === 'clear' ? 0.36 : 0.62, 0.85, frost), roughness: mix(0.06, 0.7, frost), metalness: 0, clearcoat: 1 - frost,
    });
    const shell = put(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 36), glass));
    shell.castShadow = true;
    const lip = put(new THREE.Mesh(new THREE.TorusGeometry(neck, neck * 0.18, 8, 24), glass));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = height - neck * 0.4;

    if (a.bottle === 'demijohn') {
      const wicker = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#a57c45'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#6f4f28';
        for (let row = 0; row < 12; row++) for (let col = 0; col < 24; col++) if ((row + col) % 2) ctx.fillRect(col * (w / 24), row * (h / 12), w / 24 - 2, h / 12 - 2);
      });
      const jacket = profile.filter(([, y]) => y <= 0.13).map(([r, y]) => new THREE.Vector2(r + 0.004, y - 0.002));
      jacket.push(new THREE.Vector2(radiusAt(0.13) + 0.004, 0.13));
      put(new THREE.Mesh(new THREE.LatheGeometry(jacket, 32), new THREE.MeshStandardMaterial({ map: wicker, roughness: 0.95, side: THREE.DoubleSide }))).castShadow = true;
      const handle = put(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#8a6535', roughness: 0.9 })));
      handle.position.set(0.055, 0.215, 0);
      handle.rotation.z = -0.9;
    } else if (old < 0.4) {
      // A paper label that has not yet soaked off.
      const labelY = body * 0.5, r = radiusAt(labelY) + 0.0008;
      const label = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#efe6cc'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#7a2e2a'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#7a2e2a'; ctx.fillRect(50, 40, 156, 14); ctx.fillRect(80, 70, 96, 8); ctx.fillRect(96, 90, 64, 6);
      });
      const sweep = mix(1.9, 0.9, old / 0.4);
      const paper = put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, body * 0.42, 24, 1, true, Math.PI / 2 - sweep / 2, sweep), new THREE.MeshStandardMaterial({ map: label, roughness: 0.9, side: THREE.DoubleSide })));
      paper.position.y = labelY;
    }

    // Stopper.
    const corkMaterial = s.material('#b98d5a', { roughness: 0.95 });
    const top = height;
    if (a.seal !== 'open' && a.seal !== 'rag') {
      const cork = put(new THREE.Mesh(new THREE.CylinderGeometry(neck * 0.85, neck * 0.7, neck * 2.6, 14), corkMaterial));
      cork.position.y = top - neck * 0.5 + (a.seal === 'cork' ? neck * 0.4 : 0);
      cork.castShadow = true;
    }
    if (a.seal === 'wax') {
      const wax = new THREE.MeshStandardMaterial({ color: '#b0222c', roughness: 0.35 });
      const cap = put(new THREE.Mesh(new THREE.SphereGeometry(neck * 1.2, 16, 10), wax));
      cap.scale.y = 0.75;
      cap.position.y = top + neck * 0.2;
      for (let i = 0; i < 5; i++) {
        const angle = random() * 6, drop = neck * mix(1.5, 4.5, random());
        const drip = put(new THREE.Mesh(new THREE.CapsuleGeometry(neck * 0.22, drop, 3, 8), wax));
        drip.position.set(Math.cos(angle) * neck * 1.1, top - drop / 2, Math.sin(angle) * neck * 1.1);
      }
    } else if (a.seal === 'twine') {
      const twine = new THREE.MeshStandardMaterial({ color: '#cdb98a', roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const turn = put(new THREE.Mesh(new THREE.TorusGeometry(neck * 1.12, neck * 0.13, 5, 16), twine));
        turn.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
        turn.position.y = top - neck * (1.2 + i * 0.5);
      }
      const over = put(new THREE.Mesh(new THREE.TorusGeometry(neck * 1.25, neck * 0.11, 5, 16), twine));
      over.position.y = top - neck * 0.2;
      const tail = put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(neck, top - neck * 2, 0), new THREE.Vector3(neck * 2.6, top - neck * 3, neck), new THREE.Vector3(neck * 3.2, top - neck * 6, neck * 0.5)]), 12, neck * 0.1, 5), twine));
      tail.castShadow = true;
    } else if (a.seal === 'swingtop') {
      const china = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.3 });
      const wire = new THREE.MeshStandardMaterial({ color: '#8d9496', metalness: 0.8, roughness: 0.35 });
      put(new THREE.Mesh(new THREE.SphereGeometry(neck * 1.15, 14, 10), china)).position.y = top + neck * 0.9;
      put(new THREE.Mesh(new THREE.CylinderGeometry(neck * 1.1, neck * 1.1, neck * 0.3, 14), new THREE.MeshStandardMaterial({ color: '#c2412f' }))).position.y = top + neck * 0.1;
      const bail = put(new THREE.Mesh(new THREE.TorusGeometry(neck * 1.5, neck * 0.1, 5, 18), wire));
      bail.position.y = top - neck * 0.3;
      const ring = put(new THREE.Mesh(new THREE.TorusGeometry(neck * 1.25, neck * 0.1, 5, 18), wire));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = top - neck * 1.6;
    } else if (a.seal === 'rag') {
      const cloth = s.material(mood.cheer > 0.5 ? '#c9483c' : '#8f8c7c', { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const fold = put(new THREE.Mesh(new THREE.ConeGeometry(neck * mix(0.7, 1.2, random()), neck * mix(2.5, 4.5, random()), 6), cloth));
        fold.position.set((random() - 0.5) * neck, top + neck * 0.8, (random() - 0.5) * neck);
        fold.rotation.set((random() - 0.5) * 1.2, random() * 3, Math.PI + (random() - 0.5) * 1.2);
        fold.castShadow = true;
      }
    }

    // Growth: a green beard near the base, then barnacles.
    if (old > 0.3) {
      const beard = profile.filter(([, y]) => y <= body * mix(0.2, 0.7, old)).map(([r, y]) => new THREE.Vector2(r + 0.0015, y - 0.001));
      if (beard.length > 1) put(new THREE.Mesh(new THREE.LatheGeometry(beard, 28), new THREE.MeshStandardMaterial({ color: '#4d6b3a', roughness: 1, transparent: true, opacity: mix(0.3, 0.8, old) })));
    }
    const barnacles = Math.round(Math.max(0, old - 0.45) * mix(40, 110, random()));
    if (barnacles > 0) {
      const cone = new THREE.CylinderGeometry(0.25, 1, 1, 7);
      const mesh = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ color: '#d9d4c4', roughness: 0.95 }), barnacles);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < barnacles; i++) {
        const y = mix(0.01, body * 1.15, random() ** 1.6), angle = random() * Math.PI * 2, r = radiusAt(y);
        dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
        dummy.scale.setScalar(mix(0.004, 0.011, random()));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = true;
      put(mesh);
    }

    if (a.company === 'crab') {
      const shell2 = s.material('#d2553a', { roughness: 0.6 });
      const crab = new THREE.Group();
      const carapace = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), shell2);
      carapace.scale.set(1.3, 0.55, 1);
      crab.add(carapace);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.001, 0.02, 5), shell2);
          leg.position.set(side * 0.02, -0.004, (i - 1) * 0.008);
          leg.rotation.z = side * 0.9;
          crab.add(leg);
        }
        const claw = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), shell2);
        claw.position.set(side * 0.016, 0.004, 0.014);
        crab.add(claw);
      }
      const y = body + (height - body) * 0.45;
      crab.position.set(-radiusAt(y) - 0.006, y, 0);
      crab.rotation.z = Math.PI / 2;
      crab.traverse((node) => { node.castShadow = true; });
      put(crab);
    } else if (a.company === 'feather') {
      const vane = new THREE.Shape();
      vane.moveTo(0, 0); vane.quadraticCurveTo(0.018, 0.04, 0, 0.1); vane.quadraticCurveTo(-0.016, 0.04, 0, 0);
      const feather = put(new THREE.Mesh(new THREE.ShapeGeometry(vane), new THREE.MeshStandardMaterial({ color: '#f7f6f0', roughness: 0.9, side: THREE.DoubleSide })));
      const y = body * 0.75;
      feather.position.set(0, y, radiusAt(y) / squash + 0.002);
      feather.rotation.z = 0.5;
      feather.castShadow = true;
    }

    // Pose: tilt in the picture plane, with the waterline about a third of the way up.
    const lean = mix(1.12, 0.15, a.ride) * (flooded ? 0.35 : 1) + (random() - 0.5) * 0.15;
    const pose = new THREE.Group();
    pose.add(bottle);
    pose.rotation.z = -lean;
    pose.rotation.y = (random() - 0.5) * 0.5;
    const sunk = flooded ? 0.58 : mix(0.3, 0.42, a.ride);
    pose.position.set(0, -height * sunk * Math.cos(lean) + belly * Math.sin(lean) * 0.5, 0);
    s.root.add(pose);

    const reach = height * Math.sin(lean) * 0.5 + belly;
    const patchR = Math.max(0.13, reach * 1.15 + 0.03);
    const cx = height * Math.sin(lean) * 0.3;
    waterPatch(s, patchR, patchR * 0.82, { rings: 3, foam: 0, at: [cx, 0] });
    if (a.company === 'weed') {
      const weed = s.material('#5a4a24', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) {
        const start = random() * 6, r = belly * mix(1.3, 2.2, random());
        const points = Array.from({ length: 7 }, (_unused, k) => {
          const angle = start + k * 0.5;
          return [cx * 0.4 + Math.cos(angle) * r * (1 + k * 0.12), 0.004 + Math.sin(k * 2.1) * 0.004, Math.sin(angle) * r * (1 + k * 0.12)] as const;
        });
        s.tube(points, 0.006, weed);
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#7a6a2c'), Array.from({ length: 12 }, () => {
        const angle = random() * 6, r = belly * mix(1.3, 2.6, random());
        return { at: [cx * 0.4 + Math.cos(angle) * r, 0.006, Math.sin(angle) * r] as const, size: mix(0.006, 0.012, random()) };
      }));
    } else if (a.company === 'driftwood') {
      const stick = s.rod([cx - patchR * 0.55, 0.008, patchR * 0.38], [cx + patchR * 0.5, 0.012, patchR * 0.5], 0.018, s.material('#9a9488', { roughness: 1 }), 0.011);
      stick.rotation.x += 0.05;
      s.rod([cx + patchR * 0.1, 0.012, patchR * 0.45], [cx + patchR * 0.22, 0.05, patchR * 0.58], 0.007, s.material('#9a9488', { roughness: 1 }), 0.003);
    } else if (a.company === 'petals') {
      const petal = new THREE.SphereGeometry(1, 8, 6);
      petal.scale(1, 0.12, 0.6);
      const tints = mood.cheer > 0.5 ? ['#f2a7b8', '#f6d7de', '#e86d8a'] : ['#f1ede2', '#d9c9cf', '#b9a1b3'];
      s.scatter(petal, new THREE.MeshStandardMaterial({ roughness: 0.8 }), Array.from({ length: 16 }, () => {
        const angle = random() * 6, r = patchR * mix(0.25, 0.85, random());
        return { at: [cx + Math.cos(angle) * r, 0.004, Math.sin(angle) * r * 0.82] as const, size: mix(0.012, 0.02, random()), color: tints[Math.floor(random() * tints.length)] };
      }));
    }

    const restY = pose.position.y, swing = mix(0.02, 0.16, mood.energy), speed = mix(0.6, 2.2, mood.energy);
    return afloat(s, {
      update: (_dt, time) => {
        pose.rotation.z = -lean + Math.sin(time * speed) * swing;
        pose.position.y = restY + Math.sin(time * speed * 1.3 + 1) * height * 0.03 * mix(0.3, 1, mood.energy);
      },
    });
  },
});

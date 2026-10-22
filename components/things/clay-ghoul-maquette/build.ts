import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Head, type HeadSpec, noise3, painted, taperTube } from './fx';

const CREATURES = {
  ghoul: 'A gaunt ghoul: sunken cheeks, a hole where the nose was, lipless teeth.',
  'fish-man': 'A fish-man: wide frog mouth, bulging side eyes, fins for ears and a crest.',
  bat: 'A bat-faced vampire: huge pointed ears, a pushed-up leaf nose, needle fangs.',
  ogre: 'A tusked ogre: slab jaw, heavy brow shelf, small mean eyes.',
  'three-eyed': 'A three-eyed thing with a domed skull and a beard of short tentacles.',
} as const;

const SPECS: Record<keyof typeof CREATURES, Partial<HeadSpec>> = {
  ghoul: { jaw: 0.15, cheek: -0.9, socket: 1, nose: -0.7, brow: 0.7, chin: 0.5, height: 1.08, width: 0.92 },
  'fish-man': { jaw: 0.9, cheek: 0.5, socket: 0.2, nose: 0.05, brow: 0.15, chin: 0.05, snout: 0.22, width: 1.12, height: 0.95, eyeSpread: 0.56, eyeHeight: 0.2, mouth: 1 },
  bat: { jaw: 0.3, cheek: 0.5, socket: 0.7, nose: 0.25, brow: 0.9, chin: 0.2, snout: 0.16, width: 1.02, height: 0.94 },
  ogre: { jaw: 1, cheek: 0.6, socket: 0.8, nose: 0.9, brow: 1.5, chin: 0.9, width: 1.18, height: 1.02, depth: 1.08, eyeSpread: 0.33 },
  'three-eyed': { jaw: 0.4, cheek: 0.1, socket: 0.7, nose: 0.2, brow: 0.3, chin: 0.2, crown: 1.1, third: 1, height: 1.05 },
};

export default defineThing({
  questions: {
    creature: choice('What creature is being sculpted?', CREATURES),
    progress: score('How far along is the sculpture?', [
      'Bare wire armature with a few lumps of clay pressed on',
      'Blocked in: rough masses, no detail',
      'One side finished and smooth, the other still rough lumps',
      'Fully finished and polished, ready to mould',
    ]),
    expression: choice('What expression does the face have?', {
      snarl: 'A lopsided snarl with brows pulled down.',
      scream: 'Mouth stretched wide open in a scream.',
      sorrow: 'Brows tilted up and mouth turned down, a sad monster.',
      grin: 'A wide delighted grin.',
      blank: 'Slack and expressionless, a dead stare.',
    }),
    clay: choice('What clay is it?', {
      'grey-green': 'Grey-green oil clay, the classic studio plasteline.',
      terracotta: 'Warm terracotta-brown sculpting wax.',
      tan: 'Pale tan industrial clay.',
      'mixed-scrap': 'Recycled scrap clay, marbled patches of brown, grey and green.',
    }),
    reference: choice('What reference is pinned up beside it?', {
      none: 'Nothing: sculpted from imagination.',
      skull: 'A small plaster skull on the base for anatomy.',
      photo: 'A black and white photograph clipped to a wire stand.',
      drawing: "A child's bright crayon drawing of the monster, clipped up with pride.",
      'film-still': 'A lurid colour film still of a classic movie monster.',
    }),
    mishap: choice('What has happened to it?', {
      nothing: 'Nothing: it is intact.',
      thumbprints: 'Fresh deep thumbprints pressed into the forehead and cheek.',
      fallen: 'It fell: one side of the face is squashed flat and leaning.',
      'nose-off': 'A chunk has dropped off the face and lies on the board.',
      wrapped: 'Half covered with a damp plastic sheet to keep it soft overnight.',
    }),
    tools: choice('What tools are left in or around it?', {
      none: 'None: the bench is cleared.',
      loop: 'A single wire loop tool stuck in the top of the head.',
      several: 'Several loop tools and a wooden knife stuck in like pins.',
      rake: 'A wooden spatula jabbed in the cheek and a rake tool on the board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stage = a.progress < 0.2 ? 0 : a.progress < 0.5 ? 1 : a.progress < 0.82 ? 2 : 3;
    const base = { 'grey-green': '#7f8a72', terracotta: '#9a5a3c', tan: '#c2a57e', 'mixed-scrap': '#857763' }[a.clay];
    const baseColour = new THREE.Color(base);
    const spec: Partial<HeadSpec> = { ...SPECS[a.creature] };
    spec.lump = [0, 0.085, 0.07, 0.008][stage];
    spec.lumpScale = stage === 3 ? 14 : 5.5;
    spec.lumpSide = stage === 2 ? -1 : 0;
    if (stage === 1) { spec.socket = (spec.socket ?? 0.6) * 0.6; spec.nose = (spec.nose ?? 0.6) * 0.7; }
    const head = new Head(spec);
    const squash = a.mishap === 'fallen';
    const paint = (p: THREE.Vector3, d: THREE.Vector3) => {
      const c = baseColour.clone();
      const n = noise3(p.x * 60, p.y * 60, p.z * 60);
      c.offsetHSL(0, 0, n * 0.035);
      if (a.clay === 'mixed-scrap') {
        const m = noise3(d.x * 3 + 9, d.y * 3, d.z * 3);
        c.lerp(new THREE.Color(m > 0.15 ? '#6f7d68' : m < -0.2 ? '#8c5a40' : '#857763'), 0.75);
      }
      // Rough clay is drier and paler; smoothed clay darker with a sheen of colour.
      const rough = stage === 3 ? 0 : stage === 2 ? (d.x < 0 ? 1 : 0) : 1;
      c.offsetHSL(0, -0.03 * rough, 0.03 * rough - 0.02);
      return c;
    };
    const clay = s.material('#ffffff', { vertexColors: true, roughness: stage === 3 ? 0.42 : 0.72 });
    const clayFlat = s.material(base, { roughness: 0.7 });
    const dark = s.material(new THREE.Color(base).multiplyScalar(0.32), { roughness: 0.9 });
    const steel = s.material('#8d9296', { metalness: 0.8, roughness: 0.35 });
    const wire = s.material('#b9b3a4', { metalness: 0.7, roughness: 0.4 });
    const wood = s.material('#b98d5a', { roughness: 0.7 });
    const woodDark = s.material('#7a5632', { roughness: 0.75 });

    // Stand: plywood board, floor flange, pipe.
    const boardW = 0.28, headY = 0.27;
    s.box([boardW, 0.02, boardW], [0, 0.01, 0], wood);
    s.box([boardW + 0.004, 0.004, boardW + 0.004], [0, 0.002, 0], woodDark);
    s.cylinder(0.035, 0.038, 0.012, [0, 0.026, 0], steel, 20);
    for (let i = 0; i < 4; i++) s.cylinder(0.005, 0.005, 0.006, [Math.cos(i * 1.57 + 0.78) * 0.028, 0.034, Math.sin(i * 1.57 + 0.78) * 0.028], wire, 6);
    s.cylinder(0.011, 0.011, headY - 0.02, [0, 0.03 + (headY - 0.02) / 2, 0], steel, 12);

    const group = new THREE.Group();
    group.position.set(0, headY, 0);
    s.root.add(group);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at?: THREE.Vector3) => {
      const mesh = new THREE.Mesh(geometry, material);
      if (at) mesh.position.copy(at);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const size = 1.12;
    group.scale.setScalar(size);

    if (stage === 0) {
      // Armature: wire loops making an egg, with clay lumps squeezed on.
      for (let i = 0; i < 4; i++) {
        const loop: THREE.Vector3[] = [];
        for (let k = 0; k < 14; k++) {
          const t = (k / 14) * Math.PI * 2;
          loop.push(new THREE.Vector3(Math.sin(t) * 0.062 * Math.cos(i * 0.785), Math.cos(t) * 0.1, Math.sin(t) * 0.075 * Math.sin(i * 0.785) + Math.sin(t) * 0.02));
        }
        add(taperTube(loop, () => 0.0022, 60, 5, true), wire);
      }
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.05 + k * 0.012, 0.002, 5, 28), wire, new THREE.Vector3(0, 0.06 - k * 0.06, 0.008)).rotation.x = Math.PI / 2;
      const lumps = 12 + Math.floor(a.progress * 60) + Math.floor(random() * 4);
      const rough = new Head({ ...SPECS[a.creature], socket: 0, nose: 0, size: 0.82 });
      for (let i = 0; i < lumps; i++) {
        const dir = new THREE.Vector3(random() - 0.5, random() * 1.4 - 0.9, random() - 0.2).normalize();
        const r = 0.02 + random() * 0.018;
        const lump = add(new THREE.SphereGeometry(1, 9, 7), clayFlat, rough.point(dir));
        lump.scale.set(r, r * (0.6 + random() * 0.5), r);
        lump.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    } else {
      const skin = add(head.geometry(64, paint), clay);
      // Neck plug of clay round the pipe.
      add(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 14), clayFlat, new THREE.Vector3(0, -0.125, -0.012));

      const detail = stage >= 2;
      const mouthOpen = { snarl: 0.35, scream: 1, sorrow: 0.12, grin: 0.4, blank: 0.2 }[a.expression];
      const curve = { snarl: -0.25, scream: 0, sorrow: -0.7, grin: 1, blank: -0.05 }[a.expression];
      const browTilt = { snarl: -0.11, scream: 0.05, sorrow: 0.12, grin: 0.02, blank: 0 }[a.expression];
      const wide = (a.creature === 'fish-man' ? 0.5 : a.creature === 'ogre' ? 0.4 : 0.32) * (a.expression === 'grin' ? 1.2 : a.expression === 'scream' ? 0.8 : 1);
      const my = a.creature === 'fish-man' ? -0.4 : -0.47;
      const lipY = (x: number, upper: boolean) => {
        const t = x / wide;
        const skew = a.expression === 'snarl' ? 0.07 * t : 0;
        return my + curve * 0.09 * t * t + skew + (upper ? 1 : -1) * mouthOpen * 0.16 * (1 - t * t);
      };
      // Mouth: a dark cavity, clay lips round it and teeth by creature.
      const cavity = add(new THREE.SphereGeometry(1, 16, 10), dark, head.face(0, my, -0.012));
      cavity.scale.set(wide * 0.085, 0.006 + mouthOpen * 0.021, 0.02);
      if (stage >= 1) {
        const lip: THREE.Vector3[] = [];
        for (let k = 0; k <= 10; k++) { const x = mix(-wide, wide, k / 10); lip.push(head.face(x, lipY(x, true), 0.003)); }
        for (let k = 9; k >= 1; k--) { const x = mix(-wide, wide, k / 10); lip.push(head.face(x, lipY(x, false), 0.003)); }
        add(taperTube(lip, () => (stage === 1 ? 0.009 : 0.0065), 48, 7, true), clay.clone()).material = clayFlat;
      }
      if (detail) {
        const tooth = new THREE.ConeGeometry(1, 1, 6);
        const teeth = a.creature === 'ghoul' ? 9 : a.creature === 'fish-man' ? 13 : a.creature === 'bat' ? 6 : a.creature === 'ogre' ? 6 : 7;
        for (const upper of [true, false])
          for (let k = 0; k < teeth; k++) {
            const x = mix(-wide * 0.82, wide * 0.82, (k + 0.5) / teeth);
            const fang = (a.creature === 'bat' && upper && (k === 1 || k === teeth - 2)) || (a.creature === 'ogre' && !upper && (k === 0 || k === teeth - 1));
            const len = (fang ? 0.03 : a.creature === 'fish-man' ? 0.011 : 0.009) * (0.8 + random() * 0.4);
            const t = add(tooth, clayFlat, head.face(x, lipY(x, upper) + (upper ? -1 : 1) * len * 3.2, fang ? 0.004 : -0.002));
            t.scale.set(fang ? 0.007 : 0.0048, len, fang ? 0.007 : 0.0048);
            t.rotation.x = upper ? Math.PI : 0;
            if (a.creature === 'ogre' && fang) { t.scale.set(0.011, 0.045, 0.011); t.position.y += 0.012; t.rotation.z = (k === 0 ? 1 : -1) * 0.25; }
          }
      }

      // Eyes: clay balls in the sockets with lids, brows as rolled sausages.
      const e = head.spec.eyeSpread, eh = head.spec.eyeHeight;
      const eyes: [number, number][] = [[-e, eh], [e, eh]];
      if (a.creature === 'three-eyed') eyes.push([0, eh + 0.42]);
      const eyeR = { ghoul: 0.013, 'fish-man': 0.021, bat: 0.012, ogre: 0.01, 'three-eyed': 0.014 }[a.creature];
      for (const [x, y] of eyes) {
        const rough = stage === 1 || (stage === 2 && x < 0);
        const at = head.face(x, y, a.creature === 'fish-man' ? 0.004 : -0.002);
        add(new THREE.SphereGeometry(eyeR, 14, 10), clayFlat, at);
        if (!rough) {
          const pupil = add(new THREE.SphereGeometry(eyeR * 0.42, 8, 6), dark, at.clone().add(new THREE.Vector3(0, 0, eyeR * 0.78)));
          pupil.scale.z = 0.5;
          const lid = add(new THREE.SphereGeometry(eyeR * 1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * (a.expression === 'scream' ? 0.3 : a.expression === 'blank' ? 0.5 : 0.4)), clayFlat, at);
          lid.rotation.x = -0.5;
        }
        if (y === eh && stage >= 1) {
          const sign = Math.sign(x);
          const brow = [0.5, 1, 1.5].map((k, i) => head.face(x + sign * (k - 1) * 0.17, y + 0.2 + (i === 0 ? -browTilt : i === 2 ? browTilt * 0.6 - 0.03 : 0.02), 0.004));
          add(taperTube(brow, (t) => (rough ? 0.011 : 0.008) * (1 - Math.abs(t - 0.4) * 0.9), 12, 7), clayFlat);
        }
      }

      // Creature add-ons.
      const sheet = (shape: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 1 });
      if (a.creature === 'bat') {
        for (const side of [-1, 1]) {
          const ear = new THREE.Shape();
          ear.moveTo(-0.022, 0); ear.quadraticCurveTo(-0.04, 0.07, 0.006, 0.135); ear.quadraticCurveTo(0.03, 0.06, 0.024, 0); ear.closePath();
          const m = add(sheet(ear, 0.006), clayFlat, head.point(new THREE.Vector3(side * 0.86, 0.35, -0.1)).add(new THREE.Vector3(0, -0.012, 0)));
          m.rotation.set(-0.15, side * 0.55, -side * 0.42);
          if (side < 0) m.scale.x = -1;
        }
        const leaf = add(new THREE.ConeGeometry(0.017, 0.034, 5), clayFlat, head.face(0, -0.1, 0.008));
        leaf.rotation.x = -0.5; leaf.scale.z = 0.5;
      }
      if (a.creature === 'fish-man') {
        for (const side of [-1, 1]) {
          const fin = new THREE.Shape();
          fin.moveTo(0, -0.04);
          for (let k = 0; k <= 5; k++) { const t = -0.7 + k * 0.32; fin.lineTo(Math.cos(t) * 0.075, Math.sin(t) * 0.075); fin.lineTo(Math.cos(t + 0.16) * 0.05, Math.sin(t + 0.16) * 0.05); }
          fin.lineTo(0, 0.04); fin.closePath();
          const m = add(sheet(fin, 0.004), clayFlat, head.point(new THREE.Vector3(side * 0.97, -0.05, -0.1)).multiplyScalar(0.95));
          m.rotation.y = side > 0 ? -0.5 : Math.PI + 0.5;
        }
        const crest = new THREE.Shape();
        crest.moveTo(-0.07, 0);
        for (let k = 0; k <= 6; k++) { const t = k / 6; crest.lineTo(-0.07 + t * 0.14, 0.02 + Math.sin(t * Math.PI) * 0.04); crest.lineTo(-0.06 + t * 0.14, 0.008 + Math.sin(t * Math.PI) * 0.02); }
        crest.lineTo(0.08, 0); crest.closePath();
        const c = add(sheet(crest, 0.004), clayFlat, head.point(new THREE.Vector3(0, 1, -0.1)).add(new THREE.Vector3(0, -0.012, -0.012)));
        c.rotation.y = -Math.PI / 2;
      }
      if (a.creature === 'ogre' || a.creature === 'ghoul' || a.creature === 'three-eyed') {
        for (const side of [-1, 1]) {
          const ear = add(new THREE.SphereGeometry(1, 10, 8), clayFlat, head.point(new THREE.Vector3(side * 0.98, 0, -0.12)));
          ear.scale.set(0.008, a.creature === 'ghoul' ? 0.036 : 0.026, 0.017);
          ear.rotation.set(0, side * 0.5, -side * (a.creature === 'ghoul' ? 0.35 : 0.1));
        }
      }
      if (a.creature === 'three-eyed') {
        for (let k = 0; k < 6; k++) {
          const x = mix(-0.3, 0.3, k / 5);
          const from = head.face(x, -0.72);
          const sway = (random() - 0.5) * 0.03;
          const len = 0.05 + random() * 0.035;
          add(taperTube([from, from.clone().add(new THREE.Vector3(sway, -len * 0.5, 0.012)), from.clone().add(new THREE.Vector3(sway * 2.5, -len, 0.004 + random() * 0.02))], (t) => 0.0085 * (1 - t * 0.75), 12, 7), clayFlat);
        }
      }
      if (a.creature === 'ghoul' && detail) {
        for (const side of [-1, 1]) {
          const hole = add(new THREE.SphereGeometry(1, 8, 6), dark, head.face(side * 0.05, -0.15, 0.001));
          hole.scale.set(0.005, 0.011, 0.004);
        }
      }
      // Tool marks: rake strokes on the rough side, forehead wrinkles on the finished side.
      if (stage === 3 || stage === 2) {
        for (let k = 0; k < 3; k++) {
          const y = 0.5 + k * 0.09;
          const from = stage === 2 ? 0.02 : -0.4;
          const pts = [0, 1, 2, 3, 4].map((i) => head.face(mix(from, 0.42, i / 4), y + Math.sin(i * 1.3 + k) * 0.015 - (a.creature === 'three-eyed' ? -0.2 : 0), 0.0005));
          add(taperTube(pts, (t) => 0.0022 * Math.sin(Math.PI * t), 14, 4), dark);
        }
      }

      // Mishaps.
      if (a.mishap === 'thumbprints') {
        for (const [x, y] of [[0.2, 0.55], [-0.52, -0.2], [0.42, -0.3], [-0.15, 0.72]] as const) {
          const print = add(new THREE.SphereGeometry(1, 12, 8), dark.clone(), head.face(x + (random() - 0.5) * 0.08, y, 0.0015));
          (print.material as THREE.MeshStandardMaterial).color.set(base).multiplyScalar(0.62);
          print.scale.set(0.012, 0.016, 0.004);
          print.lookAt(group.localToWorld(head.face(x, y, 0.1)));
        }
      }
      if (squash) {
        group.scale.set(size * 1.08, size * 0.94, size * 0.8);
        group.rotation.set(0, 0, -0.2);
        const flat = add(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 18), dark.clone(), head.face(-0.5, 0.25, -0.004));
        (flat.material as THREE.MeshStandardMaterial).color.set(base).multiplyScalar(0.7);
        flat.lookAt(group.localToWorld(head.face(-0.5, 0.25, 0.2)));
        flat.rotateX(Math.PI / 2);
      }
      if (a.mishap === 'nose-off') {
        const scar = add(new THREE.SphereGeometry(1, 10, 8), dark, head.face(0.02, -0.12, -0.004));
        scar.scale.set(0.02, 0.026, 0.012);
        const chunk = s.ball([0.022, 0.016, 0.026], [0.05 + random() * 0.03, 0.034, 0.105], clayFlat, 10);
        chunk.rotation.y = random() * 3;
        for (let k = 0; k < 4; k++) s.ball([0.006, 0.004, 0.006], [0.02 + random() * 0.09, 0.023, 0.08 + random() * 0.05], clayFlat, 6);
      }
      if (a.mishap === 'wrapped') {
        const film = new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.5, roughness: 0.15, side: THREE.DoubleSide });
        const wrap = new Head({ ...spec, lump: 0.05, lumpScale: 9, lumpSide: 0, socket: 0.1, nose: 0.3, size: 1.07 });
        const geometry = wrap.geometry(40);
        const cut = add(geometry, film);
        cut.rotation.z = 0.5;
        const clip = new THREE.Plane(new THREE.Vector3(0.5, 0.8, 0.1).normalize(), 0);
        void clip;
        // Keep only the upper back half by scaling the sheet down onto one side.
        cut.scale.set(1, 1, 1);
        cut.position.set(-0.004, 0.006, -0.004);
        const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) if (pos.getX(i) * 0.6 + pos.getY(i) * 0.9 < -0.01) pos.setXYZ(i, pos.getX(i) * 0.9, Math.max(pos.getY(i), -0.02 - pos.getX(i) * 0.6) , pos.getZ(i) * 0.9);
        geometry.computeVertexNormals();
      }
      void skin;
    }

    // Tools stuck in the clay.
    const loopTool = (at: THREE.Vector3, direction: THREE.Vector3, parent: THREE.Object3D) => {
      const tool = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0035, 0.11, 8), woodDark);
      handle.position.y = 0.075;
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.014, 8), wire);
      ferrule.position.y = 0.024;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0012, 5, 16), wire);
      ring.position.y = 0.008;
      const ring2 = ring.clone(); ring2.position.y = 0.14; ring2.scale.setScalar(0.7);
      tool.add(handle, ferrule, ring, ring2);
      tool.traverse((o) => { o.castShadow = true; });
      tool.position.copy(at);
      tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      parent.add(tool);
    };
    const knife = (at: THREE.Vector3, direction: THREE.Vector3, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.004), wood);
      m.geometry.translate(0, 0.07, 0);
      m.position.copy(at);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      m.castShadow = true;
      parent.add(m);
    };
    const dirOf = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
    if (a.tools !== 'none') {
      const spots = a.tools === 'loop' ? [dirOf(0.15, 1, -0.1)] : a.tools === 'several' ? [dirOf(0.2, 1, 0), dirOf(-0.5, 0.8, -0.2), dirOf(0.8, 0.5, -0.3), dirOf(-0.2, 0.7, -0.7)] : [dirOf(0.9, -0.1, 0.3)];
      spots.forEach((d, i) => {
        const jitter = d.clone().add(new THREE.Vector3((random() - 0.5) * 0.5, 0.2, (random() - 0.5) * 0.5));
        const at = stage === 0 ? d.clone().multiplyScalar(0.06) : head.point(d).multiplyScalar(0.9);
        if (a.tools === 'rake' || (a.tools === 'several' && i === 2)) knife(at, jitter, group); else loopTool(at, jitter, group);
      });
      if (a.tools === 'rake') {
        const lying = new THREE.Group();
        loopTool(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), lying);
        lying.position.set(-0.12, 0.026, 0.1); lying.rotation.y = 0.4 + random();
        s.root.add(lying);
      }
    }

    // Reference material.
    if (a.reference === 'skull') {
      const bone = s.material('#ebe4d0', { roughness: 0.8 });
      const sk = new Head({ size: 0.36, jaw: 0.25, cheek: 0.5, socket: 1.5, nose: -0.9, brow: 0.5, chin: 0.3, mouth: 0.8 });
      const skull = s.mesh(sk.geometry(36), bone, [0.095, 0.02 + 0.037, 0.095]);
      skull.rotation.y = -0.5;
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), s.material('#2b2622'));
        eye.position.copy(sk.face(side * 0.36, 0.12, -0.002));
        skull.add(eye);
      }
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.004), s.material('#2b2622'));
      teeth.position.copy(sk.face(0, -0.5, 0)); skull.add(teeth);
    } else if (a.reference !== 'none') {
      const kind = a.reference;
      const texture = painted(256, 320, (ctx, w, h) => {
        ctx.fillStyle = kind === 'drawing' ? '#fbf7ea' : kind === 'photo' ? '#d9d6cf' : '#1d1430';
        ctx.fillRect(0, 0, w, h);
        if (kind === 'drawing') {
          ctx.lineWidth = 9; ctx.lineCap = 'round';
          ctx.strokeStyle = '#3aa04a'; ctx.beginPath(); ctx.ellipse(128, 150, 70, 88, 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#3aa04a'; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = '#e03a2a'; for (const x of [98, 158]) { ctx.beginPath(); ctx.arc(x, 125, 14, 0, 7); ctx.fill(); }
          ctx.strokeStyle = '#27221f'; ctx.beginPath();
          for (let k = 0; k < 8; k++) ctx.lineTo(80 + k * 14, 195 + (k % 2) * 20);
          ctx.stroke();
          ctx.strokeStyle = '#7a3fc0'; for (const x of [70, 186]) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x + (x < 128 ? -22 : 22), 28); ctx.stroke(); }
          ctx.strokeStyle = '#f0b020'; ctx.beginPath(); ctx.arc(215, 40, 18, 0, 7); ctx.stroke();
        } else {
          const tone = kind === 'photo' ? ['#8a8782', '#34322f', '#f1eee8'] : ['#6fb04a', '#16101f', '#f6e45a'];
          ctx.fillStyle = kind === 'photo' ? '#55524e' : '#b3202c'; ctx.fillRect(14, 14, w - 28, h - 60);
          ctx.fillStyle = tone[0]; ctx.beginPath(); ctx.ellipse(128, 140, 62, 84, 0, 0, 7); ctx.fill();
          ctx.fillStyle = tone[1]; for (const x of [102, 154]) { ctx.beginPath(); ctx.ellipse(x, 122, 16, 12, 0, 0, 7); ctx.fill(); }
          ctx.beginPath(); ctx.ellipse(128, 190, 28, 16, 0, 0, 7); ctx.fill();
          ctx.fillStyle = tone[2]; for (let k = 0; k < 5; k++) ctx.fillRect(106 + k * 10, 180, 6, 9);
          ctx.fillStyle = kind === 'photo' ? '#f1eee8' : '#f6e45a'; ctx.fillRect(14, h - 40, w - 28, 26);
        }
      });
      const card = s.mesh(new THREE.PlaneGeometry(0.1, 0.125), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }), [0.115, 0.3, 0.06]);
      card.rotation.set(-0.08, -0.35, (random() - 0.5) * 0.12);
      s.rod([0.12, 0.02, 0.05], [0.12, 0.37, 0.05], 0.003, wire);
      s.box([0.016, 0.012, 0.01], [0.117, 0.365, 0.06], steel);
      s.cylinder(0.02, 0.022, 0.008, [0.12, 0.024, 0.05], steel, 12);
    }

    // Bench litter scales with density: clay balls and shavings on the board.
    const crumbs = Math.round(mix(2, 22, mood.density));
    const bits = [];
    for (let i = 0; i < crumbs; i++) {
      const ang = random() * Math.PI * 2, r = 0.06 + random() * 0.085;
      bits.push({ at: [Math.cos(ang) * r, 0.021 + random() * 0.003, Math.sin(ang) * r] as [number, number, number], size: 0.004 + random() * 0.007 });
    }
    s.scatter(new THREE.SphereGeometry(1, 6, 4), clayFlat, bits);
    if (mood.density > 0.45) {
      const block = s.box([0.07, 0.03, 0.045], [-0.1, 0.035, -0.09], clayFlat);
      block.rotation.y = random();
    }
    return s.finish();
  },
});

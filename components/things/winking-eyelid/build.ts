import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { makeEye } from './eye';
import { SKIN_COLOUR, SKIN_TONES, almond, crease, makeSocket, skinPlate } from './face';

export default defineThing({
  questions: {
    lid: choice('What is the lid doing?', {
      shut: 'Fully shut in a clean wink.',
      half: 'Drooping half closed, the wink only half meant.',
      flutter: 'Fluttering, batting open and shut.',
      pried: 'Pried wide open by a wire lid-holder, unable to wink at all.',
    }),
    feeling: choice('What does the wink mean?', {
      flirting: 'Flirting: the lid curves up in a smile and the brow lifts.',
      conspiratorial: 'Conspiratorial: a flat sly line under a lowered brow.',
      exhausted: 'Exhausted: the lid has simply fallen, with a bag beneath.',
      pain: 'In pain: screwed tight shut with creases radiating from the corner.',
    }),
    makeup: choice('What make-up is on it?', {
      bare: 'Bare skin, nothing.',
      liner: 'A sharp black winged liner flicking out past the corner.',
      smoky: 'Smoky charcoal shadow smudged all round.',
      glitter: 'Glitter: a bright lid crusted with sparkling flecks.',
      stage: 'Stage paint: a teal lid, a white mask of greasepaint, a red cheek spot and a black diamond.',
    }),
    lashes: choice('What are the lashes like?', {
      sparse: 'Sparse and short.',
      natural: 'Natural and dark.',
      falsies: 'Heavy false lashes, long black fans.',
    }),
    age: choice('How old is the skin?', {
      young: 'Young and smooth.',
      middle: 'Middle-aged, a few lines at the corner.',
      old: 'Old: deep creases, a hooded fold, a paler brow.',
    }),
    skin: choice('What is the skin tone?', SKIN_TONES),
    brow: choice('What is the eyebrow like?', {
      natural: 'A natural brow of soft hairs.',
      thick: 'A thick dark brow.',
      thin: 'A thin plucked line.',
      none: 'No brow at all, shaved or lost.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 0.013;
    const old = { young: 0, middle: 0.5, old: 1 }[a.age];
    const tone = new THREE.Color(SKIN_COLOUR[a.skin]);
    const skin = new THREE.MeshStandardMaterial({ color: tone, roughness: mix(0.55, 0.8, old) });
    const shade = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.6), roughness: 0.8 });
    const face = new THREE.Group();

    // Where the closed lids meet, how the lid slants, and where the brow sits, per feeling.
    const feel = {
      flirting: { line: -0.14, tilt: -0.08, browY: 2.25, browTilt: -0.12, arch: 0.5 },
      conspiratorial: { line: 0.1, tilt: 0.1, browY: 1.62, browTilt: 0.16, arch: 0.12 },
      exhausted: { line: 0.38, tilt: -0.22, browY: 1.9, browTilt: -0.24, arch: 0.2 },
      pain: { line: 0.02, tilt: 0.3, browY: 1.38, browTilt: 0.4, arch: 0.05 },
    }[a.feeling];
    const open = a.lid === 'pried' ? -0.72 : -0.34;
    const upper = a.lid === 'shut' ? feel.line : a.lid === 'half' ? mix(open, feel.line, 0.62) : a.lid === 'flutter' ? mix(open, feel.line, 0.5) : open;
    const lower = a.lid === 'pried' ? 0.62 : feel.line;

    const outline = new THREE.Shape();
    outline.absellipse(r * 0.25, r * 0.4, r * 3.0, r * 2.9, 0, Math.PI * 2);
    outline.holes.push(almond(0, 0, r * 1.2, r * 0.74, r * 0.6));
    const paint = a.makeup === 'stage' ? new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.75 }) : skin;
    face.add(skinPlate(outline, 0.004, paint));

    const lidColour = { bare: null, liner: null, smoky: '#3a3140', glitter: mood.warmth > 0.5 ? '#d9a13a' : '#b58be0', stage: '#25aebf' }[a.makeup];
    const lidPaint = lidColour ? new THREE.MeshStandardMaterial({ color: lidColour, roughness: a.makeup === 'glitter' ? 0.3 : 0.6, metalness: a.makeup === 'glitter' ? 0.5 : 0 }) : paint;
    const lash = { sparse: { count: 12, length: 0.24, colour: '#6e5646', curl: 0.3, clump: 0 }, natural: { count: 24, length: 0.4, colour: '#22160f', curl: 0.5, clump: 0 }, falsies: { count: 34, length: 0.85, colour: '#0a0909', curl: 0.9, clump: 0.5 } }[a.lashes];
    const eye = makeEye({
      r,
      iris: ['#6b3d1c', '#5b9bd0', '#5f9040', '#9a7a30', '#8794a0'][Math.floor(random() * 5)],
      pupil: a.lid === 'pried' ? 'pinpoint' : 'normal',
      veins: a.lid === 'pried' ? 0.9 : a.feeling === 'exhausted' ? 0.6 : 0.1 + mood.wear * 0.4,
      random,
    });
    eye.ball.rotation.set(-0.3, (random() - 0.5) * 0.3, 0, 'YXZ');
    const socket = makeSocket({
      r,
      skin: paint,
      lid: lidPaint,
      eye,
      upper,
      lower,
      tilt: -feel.tilt,
      lash: { ...lash, curl: a.lid === 'shut' ? -0.55 : a.lid === 'half' || a.lid === 'flutter' ? lash.curl * 0.3 : lash.curl, length: lash.length * (a.lid === 'pried' ? 1 : 1.35), thick: a.lashes === 'falsies' ? 0.055 : 0.04 },
      lowerLash: a.lashes === 'sparse' ? undefined : { count: 10, length: 0.16, colour: lash.colour, curl: 0.1 },
      rim: a.makeup === 'liner' || a.makeup === 'smoky' || a.makeup === 'stage' ? '#0c0b0d' : a.lid === 'pried' ? undefined : a.lashes === 'sparse' ? '#7a5648' : '#241712',
      rimThick: a.lid === 'pried' ? 0.055 : a.makeup === 'liner' || a.makeup === 'smoky' ? 0.12 : 0.085,
      nose: -1,
      random,
    });
    face.add(socket.group);
    const add = (mesh: THREE.Object3D) => { face.add(mesh); return mesh; };
    const pad = (colour: THREE.Material, size: [number, number, number], at: [number, number, number], turn = 0) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), colour);
      mesh.scale.set(...size);
      mesh.position.set(...at);
      mesh.rotation.z = turn;
      mesh.castShadow = true;
      return add(mesh);
    };

    // The crease above the lid, any shadow painted up to it, and the cheek pushed up beneath.
    const foldY = mix(1.12, 0.95, old);
    add(crease([[-r * 1.15, r * (foldY - 0.45) + r * feel.tilt * 1.1, r * 0.04], [-r * 0.4, r * (foldY - 0.02), r * 0.3], [r * 0.5, r * foldY, r * 0.3], [r * 1.4, r * (foldY - 0.5) - r * feel.tilt * 1.1, r * 0.04]], r * (0.05 + old * 0.03), shade));
    if (lidColour && a.makeup !== 'stage') pad(lidPaint, [r * 1.7, r * 0.85, r * 0.07], [r * 0.15, r * 0.85, 0], feel.tilt * 0.5);
    const squeeze = a.feeling === 'pain' ? 1 : a.feeling === 'flirting' ? 0.6 : 0.25;
    if (a.lid !== 'pried' && squeeze > 0.5) pad(paint, [r * 1.7, r * 0.5, r * (0.08 + squeeze * 0.1)], [r * 0.2, -r * 1.45, 0], 0.1);
    // Lines at the outer corner: laughter in one case, a flinch in another.
    const lines = a.lid === 'pried' ? 0 : Math.round(1 + old * 2 + squeeze * 3);
    for (let i = 0; i < lines; i++) {
      const fan = (i - (lines - 1) / 2) * (0.34 + squeeze * 0.12);
      const long = 0.9 + squeeze * 0.9 + random() * 0.3;
      add(crease([[r * 1.22, r * fan * 0.25, r * 0.03], [r * (1.22 + long * 0.5), r * (fan * 0.8 + 0.05), r * 0.05], [r * (1.22 + long), r * fan * 1.7, r * 0.02]], r * (0.04 + squeeze * 0.025), shade));
    }
    if (a.feeling === 'pain' && a.lid !== 'pried') for (const x of [-0.5, 0.3]) add(crease([[r * x, r * 0.75, r * 0.5], [r * (x + 0.1), r * 0.5, r * 0.62], [r * (x - 0.05), r * 0.25, r * 0.56]], r * 0.04, shade));
    if (a.feeling === 'exhausted' || old > 0.8) add(crease([[-r * 0.95, -r * 1.05, r * 0.05], [0, -r * 1.5, r * 0.1], [r * 1.0, -r * 1.0, r * 0.05]], r * 0.07, shade));

    // Make-up beyond the lid itself.
    const black = new THREE.MeshStandardMaterial({ color: '#0c0b0d', roughness: 0.5 });
    if (a.makeup === 'liner') add(crease([[r * 0.9, r * 0.02, r * 0.3], [r * 1.5, r * 0.3, r * 0.08], [r * 2.2, r * 0.95, r * 0.03]], r * 0.1, black));
    if (a.makeup === 'smoky') pad(new THREE.MeshStandardMaterial({ color: '#4b414f', roughness: 0.9 }), [r * 1.95, r * 1.5, r * 0.1], [r * 0.15, r * 0.2, 0], feel.tilt * 0.4);
    if (a.makeup === 'glitter') {
      const flecks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(r * 0.05), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.2 }), 70);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 70; i++) {
        const turn = random() * Math.PI * 2, far = Math.sqrt(random());
        matrix.makeRotationZ(random() * 3).setPosition(r * 0.15 + Math.cos(turn) * far * r * 1.9, r * 0.75 + Math.sin(turn) * far * r * 1.05, r * (0.03 + (far < 0.5 ? 0.42 : 0.04)));
        flecks.setMatrixAt(i, matrix);
      }
      add(flecks);
    }
    if (a.makeup === 'stage') {
      pad(new THREE.MeshStandardMaterial({ color: '#d8273a', roughness: 0.6 }), [r * 0.7, r * 0.7, r * 0.05], [r * 1.5, -r * 1.75, 0]);
      const diamond = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, r * 0.5, r * 0.04), black);
      diamond.position.set(-r * 0.1, -r * 1.45, r * 0.3);
      diamond.rotation.z = Math.PI / 4;
      diamond.scale.y = 1.6;
      add(diamond);
    }

    // Eyebrow.
    if (a.brow !== 'none') {
      const grey = old > 0.8 ? '#b9b3a8' : a.skin === 'porcelain' || a.skin === 'fair' ? '#6a4a30' : '#1c1410';
      const browPaint = new THREE.MeshStandardMaterial({ color: a.makeup === 'stage' ? '#0c0b0d' : grey, roughness: 0.6 });
      const at = (t: number): [number, number, number] => {
        const x = mix(-1.25, 1.75, t);
        const y = feel.browY + Math.sin(t * Math.PI) * feel.arch - (x - 0.25) * Math.tan(feel.browTilt) - (t > 0.7 ? (t - 0.7) * 1.1 : 0);
        return [r * x, r * y, r * 0.06];
      };
      if (a.brow === 'thin' || a.makeup === 'stage') add(crease([at(0), at(0.3), at(0.6), at(1)], r * (a.makeup === 'stage' ? 0.11 : 0.06), browPaint));
      else {
        const count = a.brow === 'thick' ? 150 : 80;
        const hair = new THREE.ConeGeometry(r * 0.03, r * 0.5, 4);
        hair.translate(0, r * 0.25, 0);
        const hairs = new THREE.InstancedMesh(hair, browPaint, count);
        const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), size = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < count; i++) {
          const t = random();
          const [x, y, z] = at(t);
          const band = r * (a.brow === 'thick' ? 0.36 : 0.22) * (1 - t * 0.7);
          const grow = new THREE.Vector3(1, mix(1.1, -0.25, Math.min(1, t * 1.6)) + (random() - 0.5) * 0.3, 0.12).normalize();
          matrix.compose(new THREE.Vector3(x, y + (random() - 0.5) * 2 * band, z), turn.setFromUnitVectors(up, grow), size.setScalar(0.7 + random() * 0.6));
          hairs.setMatrixAt(i, matrix);
        }
        hairs.castShadow = true;
        add(hairs);
      }
    }

    if (a.lid === 'pried') {
      // A wire speculum hooks both lids apart.
      const wire = new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: 0.9, roughness: 0.25 });
      for (const side of [1, -1]) {
        const y = side === 1 ? r * 0.78 : -r * 0.66;
        const hook = crease([[-r * 0.5, y - side * r * 0.12, r * 0.42], [-r * 0.5, y + side * r * 0.05, r * 0.62], [0, y + side * r * 0.1, r * 0.66], [r * 0.5, y + side * r * 0.05, r * 0.62], [r * 0.5, y - side * r * 0.12, r * 0.42]], r * 0.05, wire);
        hook.scale.z = 1;
        add(hook);
        const arm = crease([[r * 0.5, y + side * r * 0.05, r * 0.62], [r * 1.5, y + side * r * 0.5, r * 0.5], [r * 2.6, side * r * 0.35, r * 0.4]], r * 0.05, wire);
        arm.scale.z = 1;
        add(arm);
      }
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.9, 10), wire);
      screw.position.set(r * 2.6, 0, r * 0.4);
      add(screw);
    }

    const brass = s.material('#a8873f', { metalness: 0.8, roughness: 0.35 });
    const high = r * 4.3;
    face.position.y = high;
    face.rotation.x = -0.24;
    if (random() < 0.5) face.scale.x = -1;
    s.root.add(face);
    s.lathe([[0, 0], [r * 1.9, 0], [r * 1.9, r * 0.18], [r * 0.5, r * 0.4], [r * 0.2, r * 0.6], [0, r * 0.6]], brass, [0, 0, -r * 1.2]);
    s.rod([0, r * 0.4, -r * 1.2], [0, high + r * 0.4, -r * 0.6], r * 0.14, brass);

    const pace = mix(2.5, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (a.lid !== 'flutter') return;
        socket.setUpper(mix(feel.line, open, Math.max(0, Math.sin(time * pace)) ** 2));
      },
    });
  },
});

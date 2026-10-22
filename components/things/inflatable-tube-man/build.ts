import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const COLOURS = {
  red: 'Fire-engine red, the classic car-lot dancer.',
  yellow: 'Loud lemon yellow.',
  blue: 'Royal blue, a little more corporate.',
  green: 'Lime green, the colour of money and mattress sales.',
  orange: 'Traffic-cone orange.',
  pink: 'Hot pink, party-store bright.',
  striped: 'Red, white and blue bands, a patriotic sale special.',
  ghost: 'Sun-bleached white that was once some other colour.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  red: '#e02a25', yellow: '#ffd21f', blue: '#1f55d8', green: '#5fd130', orange: '#ff7a1a', pink: '#ff4fa6', striped: '#e02a25', ghost: '#e9e4d6',
};
const WORDS = { sale: 'SALE', open: 'OPEN', wow: 'WOW!', deal: 'DEAL', cash: '$$$$', none: '' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the tube man?', COLOURS),
    face: choice('What face is painted on it?', {
      grin: 'A huge dumb open-mouthed grin with round eyes.',
      manic: 'Wide staring eyes and gritted teeth, selling too hard.',
      shades: 'Cool sunglasses and a smirk.',
      angry: 'Slanted brows and a shouting mouth.',
      sad: 'Drooping eyes and a downturned mouth, a clown having a bad day.',
      blank: 'No face at all, just a tube.',
    }),
    state: choice('What is it doing right now?', {
      flailing: 'Fully inflated and whipping about, arms thrown skyward.',
      bowing: 'Folded sharply at the waist mid-collapse, about to snap upright again.',
      sagging: 'Half-inflated, the top half hanging limp over one side as the fan struggles.',
      collapsed: 'Fan off: an empty skin slumped in a heap over the blower and across the ground.',
    }),
    arms: choice('What are its arms like?', {
      long: 'Two long noodle arms that whip around.',
      stubby: 'Short stubby arms that just wiggle.',
      streamers: 'Long arms ending in ribbon fingers.',
      none: 'No arms: a plain sky-dancer column.',
    }),
    topper: choice('What is on top of its head?', {
      fringe: 'A tuft of ribbon hair streaming from the open top.',
      open: 'Nothing, just the open mouth of the tube.',
      hat: 'A printed top-hat band, like a showman.',
    }),
    word: choice('If a word is printed down its chest, which?', {
      sale: 'SALE', open: 'OPEN', wow: 'WOW!', deal: 'DEAL', cash: 'Dollar signs.', none: 'Nothing printed.',
    }),
    base: choice('What blower does it stand on?', {
      drum: 'A round yellow drum fan with a caged intake.',
      box: 'A black box blower with a carry handle.',
      weighted: 'A blower pinned down with sandbags and an orange extension cord.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = new THREE.Color(TINT[a.colour]).lerp(new THREE.Color('#cfc8b8'), mood.wear * 0.2);
    const skin = (c: THREE.ColorRepresentation) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, emissive: c, emissiveIntensity: mix(0.0, 0.08, mood.cheer) });
    const main = skin(tint);
    const white = skin(new THREE.Color('#f4f1e8').lerp(new THREE.Color('#bdb5a2'), mood.wear * 0.4));
    const navy = skin('#23408f');
    const band = (index: number) => (a.colour !== 'striped' ? main : [main, white, navy][index % 3]);
    const dark = s.material('#1c1d20');
    const steel = s.material('#8d9397', { metalness: 0.6, roughness: 0.4 });

    // ---- blower base -------------------------------------------------------
    const baseTop = 0.62;
    const blowerColour = a.base === 'drum' ? '#f2c318' : a.base === 'box' ? '#26282c' : '#d9541e';
    const shell = s.material(blowerColour, { roughness: 0.45 });
    if (a.base === 'drum') {
      s.cylinder(0.46, 0.5, 0.5, [0, 0.31, 0], shell, 28);
      s.cylinder(0.5, 0.5, 0.04, [0, 0.06, 0], dark, 28);
    } else {
      s.box([0.9, 0.5, 0.9], [0, 0.31, 0], shell);
      s.rod([-0.3, 0.56, 0.4], [0.3, 0.56, 0.4], 0.02, steel);
    }
    for (const x of [-0.36, 0.36]) for (const z of [-0.36, 0.36]) s.cylinder(0.05, 0.06, 0.07, [x, 0.035, z], dark, 10);
    // caged side intake facing the viewer
    const cage = s.ring(0.19, 0.018, [0, 0.31, a.base === 'drum' ? 0.5 : 0.455], steel);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI;
      s.rod([Math.cos(angle) * 0.19, 0.31 + Math.sin(angle) * 0.19, cage.position.z], [-Math.cos(angle) * 0.19, 0.31 - Math.sin(angle) * 0.19, cage.position.z], 0.008, steel);
    }
    s.cylinder(0.17, 0.17, 0.02, [0, 0.31, cage.position.z - 0.02], dark, 20).rotation.x = Math.PI / 2;
    s.cylinder(0.36, 0.44, 0.1, [0, baseTop - 0.04, 0], dark, 24);
    // power cord
    const cord = s.material(a.base === 'weighted' ? '#ff7a1a' : '#202225');
    const cordPath: [number, number, number][] = [[0.45, 0.12, -0.2], [0.75, 0.02, -0.3]];
    for (let i = 0; i < 4; i++) cordPath.push([0.95 + i * 0.22, 0.02, -0.3 + (random() - 0.5) * 0.5]);
    s.tube(cordPath, 0.018, cord);
    if (a.base === 'weighted') {
      const sack = s.material('#b9a37a', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.6 + random() * 0.5 + 0.9;
        const bag = s.ball([0.3, 0.1, 0.19], [Math.cos(angle) * 0.62, 0.09, Math.sin(angle) * 0.62], sack, 12);
        bag.rotation.y = -angle + Math.PI / 2;
      }
    }

    const radius = 0.3;
    const segments = 9;
    const length = 0.56;
    const headLength = 1.05;
    const collapsed = a.state === 'collapsed';

    // ---- face ---------------------------------------------------------------
    const faceMap = paint(512, 256, (ctx) => {
      ctx.fillStyle = `#${(a.colour === 'striped' ? new THREE.Color('#f4f1e8') : tint).getHexString()}`;
      ctx.fillRect(0, 0, 512, 256);
      if (a.topper === 'hat') {
        ctx.fillStyle = '#17181c'; ctx.fillRect(0, 0, 512, 62);
        ctx.fillStyle = '#d3a321'; ctx.fillRect(0, 62, 512, 14);
      }
      if (a.face === 'blank') return;
      const cx = 256, ink = '#141414';
      ctx.lineCap = 'round';
      ctx.lineWidth = 9;
      ctx.strokeStyle = ink;
      for (const side of [-1, 1]) {
        const ex = cx + side * 42, ey = 118;
        if (a.face === 'shades') {
          ctx.fillStyle = ink;
          ctx.fillRect(ex - 30, ey - 18, 60, 34);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(ex, ey, a.face === 'manic' ? 30 : 24, a.face === 'sad' ? 18 : a.face === 'manic' ? 32 : 26, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(ex + (a.face === 'manic' ? side * -6 : 0), ey + (a.face === 'sad' ? 6 : 0), a.face === 'manic' ? 7 : 11, 0, Math.PI * 2);
          ctx.fill();
        }
        if (a.face === 'angry' || a.face === 'sad') {
          const tilt = a.face === 'angry' ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(ex - side * 30, ey - 34 - tilt * 14); ctx.lineTo(ex + side * 28, ey - 34 + tilt * 14);
          ctx.lineWidth = 12; ctx.stroke(); ctx.lineWidth = 9;
        }
      }
      if (a.face === 'shades') { ctx.fillStyle = ink; ctx.fillRect(cx - 20, 106, 40, 8); }
      // mouth
      ctx.fillStyle = a.face === 'manic' ? '#ffffff' : '#7a0f16';
      ctx.beginPath();
      if (a.face === 'grin') { ctx.arc(cx, 172, 52, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (a.face === 'manic') {
        ctx.rect(cx - 56, 172, 112, 36); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 5;
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - 56 + i * 18.6, 172); ctx.lineTo(cx - 56 + i * 18.6, 208); ctx.stroke(); }
      } else if (a.face === 'shades') { ctx.arc(cx + 8, 168, 40, 0.15, Math.PI * 0.75); ctx.stroke(); }
      else if (a.face === 'angry') { ctx.ellipse(cx, 196, 40, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else { ctx.arc(cx, 232, 44, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    });
    const headMaterial = new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.55, emissive: '#ffffff', emissiveMap: faceMap, emissiveIntensity: mix(0.04, 0.14, mood.cheer) });

    const letters = WORDS[a.word].split('');
    const letterMaterial = (letter: string) => new THREE.MeshStandardMaterial({
      map: paint(128, 128, (ctx) => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.font = 'bold 112px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 10; ctx.strokeStyle = '#151515'; ctx.strokeText(letter, 64, 70);
        ctx.fillStyle = a.colour === 'yellow' || a.colour === 'ghost' ? '#d2231f' : '#fff6cf'; ctx.fillText(letter, 64, 70);
      }),
      transparent: true, alphaTest: 0.4, roughness: 0.6, side: THREE.DoubleSide,
    });

    const hair = (parent: THREE.Object3D, y: number, r: number, limp: number) => {
      if (a.topper !== 'fringe') return;
      const colours = ['#ffd21f', '#ffffff', '#ff4fa6', '#35b8ff'];
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2 + random() * 0.3;
        const strand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5 + random() * 0.35, 0.008), skin(a.colour === 'striped' || a.colour === 'ghost' ? colours[i % 4] : i % 3 ? tint : '#fff3c2'));
        strand.geometry.translate(0, (strand.geometry.parameters.height) / 2, 0);
        strand.position.set(Math.cos(angle) * r * 0.85, y, Math.sin(angle) * r * 0.85);
        strand.rotation.set(0, -angle, 0);
        strand.rotateZ(-(0.25 + random() * 0.5 + limp));
        strand.castShadow = true;
        parent.add(strand);
      }
    };

    if (collapsed) {
      // An empty skin: a short stub puckered over the blower, then a flattened tube snaking away.
      s.cylinder(radius * 0.55, radius * 1.1, 0.28, [0, baseTop + 0.12, 0], main, 16);
      const direction = random() * 0.8 + 0.2;
      const path: [number, number, number][] = [[0, baseTop + 0.2, 0], [0.35, baseTop + 0.08, 0.2], [0.75, 0.25, 0.42]];
      let px = 0.75, pz = 0.42, heading = direction;
      for (let i = 0; i < 6; i++) {
        heading += (random() - 0.5) * 1.5;
        px += Math.cos(heading) * 0.62; pz += Math.sin(heading) * 0.42 + 0.12;
        path.push([px, 0.07, pz]);
      }
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      const skinMesh = s.mesh(new THREE.TubeGeometry(curve, 60, radius * 1.15, 10), a.colour === 'striped' ? white : main);
      skinMesh.geometry.scale(1, 1, 1);
      // flatten toward the ground without lifting the path
      const pos = skinMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = Math.min(1, Math.floor(i / 11) / 14);
        const y = pos.getY(i);
        const centre = curve.getPoint(Math.floor(i / 11) / 60).y;
        pos.setY(i, Math.max(0.012, centre + (y - centre) * mix(0.8, 0.2, t) + (random() - 0.5) * 0.04));
      }
      pos.needsUpdate = true;
      skinMesh.geometry.computeVertexNormals();
      // head lying face-up at the end
      const end = curve.getPoint(1), before = curve.getPoint(0.94);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, headLength, 20, 1, true, Math.PI, Math.PI * 2), headMaterial);
      head.scale.set(1, 1, 0.22);
      head.position.set(end.x, 0.09, end.z);
      head.rotation.order = 'YXZ';
      head.rotation.y = Math.atan2(end.x - before.x, end.z - before.z);
      head.rotation.x = Math.PI / 2;
      head.position.x += Math.sin(head.rotation.y) * headLength * 0.45;
      head.position.z += Math.cos(head.rotation.y) * headLength * 0.45;
      head.castShadow = head.receiveShadow = true;
      s.root.add(head);
      if (a.arms !== 'none') {
        for (const side of [-1, 1]) {
          const mid = curve.getPoint(0.62);
          const arm = s.tube([[mid.x, 0.06, mid.z], [mid.x + side * 0.5, 0.05, mid.z + 0.3 * random()], [mid.x + side * (a.arms === 'stubby' ? 0.8 : 1.5), 0.04, mid.z + (random() - 0.5)]], 0.13, main);
          arm.scale.y = 0.3;
        }
      }
      return s.finish();
    }

    // ---- inflated body: a chain of joints so it can whip about ----------------
    const joints: { node: THREE.Group; restX: number; restZ: number; phase: number; gain: number }[] = [];
    const makeChain = (parent: THREE.Object3D, count: number, len: number, r0: number, r1: number, paintFor: (index: number) => THREE.Material, gain: number) => {
      let current = parent;
      const made: THREE.Group[] = [];
      for (let i = 0; i < count; i++) {
        const node = new THREE.Group();
        if (i > 0) node.position.y = len;
        const ra = mix(r0, r1, i / count), rb = mix(r0, r1, (i + 1) / count);
        const piece = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 16, 1, true), paintFor(i));
        piece.position.y = len / 2;
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(ra * 0.99, 14, 8), paintFor(i));
        piece.castShadow = knuckle.castShadow = true;
        node.add(piece, knuckle);
        current.add(node);
        current = node;
        made.push(node);
        joints.push({ node, restX: 0, restZ: 0, phase: random() * 6.28, gain });
      }
      return made;
    };

    const spine = new THREE.Group();
    spine.position.y = baseTop;
    s.root.add(spine);
    const body = makeChain(spine, segments, length, radius, radius, band, 1);
    const first = joints.length - segments;
    const lean = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < segments; i++) {
      const joint = joints[first + i];
      if (a.state === 'flailing') { joint.restZ = lean * 0.13 * Math.sin(i * 0.9 + 1); joint.restX = 0.04 * Math.cos(i * 1.3); }
      if (a.state === 'bowing') { joint.restZ = i === 4 ? lean * 1.0 : i === 5 ? lean * 0.6 : i > 5 ? -lean * 0.12 : lean * -0.04; }
      if (a.state === 'sagging') { joint.restZ = i >= 4 && i <= 7 ? lean * 0.62 : i < 4 ? -lean * 0.03 : lean * 0.2; joint.restX = i >= 4 ? 0.1 : 0; joint.gain = i < 4 ? 0.5 : 0.25; }
    }
    // chest letters ride on the segments so they bend with the body
    letters.forEach((letter, index) => {
      const segment = body[Math.min(segments - 1, 6 - index)];
      if (!segment || letter === ' ') return;
      const decal = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.006, radius + 0.006, length * 0.86, 12, 1, true, Math.PI * 2 - 0.62, 1.24), letterMaterial(letter));
      decal.position.y = length / 2;
      segment.add(decal);
    });
    // wear: duct tape patches
    const tape = s.material('#9aa0a3', { metalness: 0.3 });
    for (let i = 0; i < Math.round(mood.wear * 6); i++) {
      const patch = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.008, radius + 0.008, 0.09, 8, 1, true, random() * 6.28, 0.7), tape);
      patch.position.y = random() * length;
      patch.rotation.z = (random() - 0.5) * 0.5;
      body[Math.floor(random() * segments)].add(patch);
    }

    // head
    const top = body[segments - 1];
    const neck = new THREE.Group();
    neck.position.y = length;
    top.add(neck);
    joints.push({ node: neck, restX: a.state === 'sagging' ? 0.2 : -0.05, restZ: 0, phase: random() * 6.28, gain: a.state === 'sagging' ? 0.3 : 1 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, headLength, 24, 1, true, Math.PI, Math.PI * 2), headMaterial);
    head.position.y = headLength / 2;
    head.castShadow = true;
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.99, 14, 8), band(segments - 1));
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.97, 20), dark);
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.y = headLength - 0.03;
    neck.add(head, knuckle, mouth);
    hair(neck, headLength - 0.04, radius, a.state === 'sagging' ? 1.2 : 0);

    // arms
    if (a.arms !== 'none') {
      const shoulder = body[segments - 2];
      const count = a.arms === 'stubby' ? 3 : 6;
      for (const side of [-1, 1]) {
        const mount = new THREE.Group();
        mount.position.set(side * radius * 0.8, length * 0.6, 0);
        const raise = a.state === 'flailing' ? 0.5 + random() * 0.9 : a.state === 'bowing' ? 1.4 + random() * 0.5 : 2.6;
        mount.rotation.z = -side * raise;
        shoulder.add(mount);
        const start = joints.length;
        const arm = makeChain(mount, count, 0.42, 0.14, 0.11, () => (a.colour === 'striped' ? white : main), a.state === 'sagging' ? 0.4 : 2.2);
        for (let i = 1; i < count; i++) joints[start + i].restZ = side * (a.state === 'sagging' ? 0.08 : (random() - 0.35) * 0.5);
        if (a.arms === 'streamers') {
          const tip = arm[count - 1];
          for (let i = 0; i < 5; i++) {
            const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.006), i % 2 ? white : main);
            ribbon.geometry.translate(0, 0.3, 0);
            ribbon.position.set((i - 2) * 0.045, 0.42, 0);
            ribbon.rotation.z = (i - 2) * 0.16 + (random() - 0.5) * 0.3;
            ribbon.castShadow = true;
            tip.add(ribbon);
          }
        } else {
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), a.colour === 'striped' ? white : main);
          cap.position.y = 0.42;
          arm[count - 1].add(cap);
        }
      }
    }

    const swing = mix(0.06, 0.24, mood.energy) * (a.state === 'flailing' ? 1 : 0.7);
    const speed = mix(1.2, 5.5, mood.energy);
    const pose = (time: number) => {
      for (const joint of joints) {
        joint.node.rotation.z = joint.restZ + Math.sin(time * speed + joint.phase) * swing * joint.gain;
        joint.node.rotation.x = joint.restX + Math.cos(time * speed * 0.83 + joint.phase * 1.7) * swing * 0.6 * joint.gain;
      }
    };
    pose(0);
    const thing = s.finish({ footprint: 0.9, update: (_dt, time) => pose(time) });
    return thing;
  },
});

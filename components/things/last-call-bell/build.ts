import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[];
const BELL: Profile = [[0, -0.018], [0.016, -0.02], [0.034, -0.028], [0.046, -0.046], [0.051, -0.085], [0.058, -0.122], [0.074, -0.152], [0.092, -0.17], [0.096, -0.178], [0.09, -0.18], [0.084, -0.172]];
const radiusAt = (y: number) => {
  for (let i = 1; i < BELL.length; i++) if (y >= BELL[i][1]) return mix(BELL[i - 1][0], BELL[i][0], (BELL[i - 1][1] - y) / (BELL[i - 1][1] - BELL[i][1]));
  return 0.09;
};
const WORDS = {
  last: 'LAST CALL',
  time: 'TIME PLEASE',
  ship: 'S.S. MERIDIAN 1924',
  round: 'RING FOR A ROUND',
  road: 'ONE FOR THE ROAD',
  blank: '',
} as const;

function texture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    mount: choice('How is the bell mounted?', {
      plaque: 'On a gooseneck bracket screwed to a varnished wooden backboard.',
      post: 'From a scrolled arm on a turned post standing on the bar.',
      gallows: 'From a rough timber gallows: an upright, a beam and a brace.',
      arch: 'Inside a polished metal arch on two feet, a desk-bell stand grown large.',
    }),
    metal: choice('What is the bell made of?', {
      brass: 'Bright polished brass.',
      bronze: 'Old bronze gone brown with green verdigris.',
      nickel: 'Silvery nickel plate.',
      black: 'Painted black with a bare brass lip.',
    }),
    words: choice('What is engraved around it?', {
      last: 'LAST CALL.',
      time: 'TIME PLEASE, the British shout.',
      ship: "A ship's name and year: it was salvaged from a wreck or a breaker's yard.",
      round: 'RING FOR A ROUND: whoever rings it buys for the whole bar.',
      road: 'ONE FOR THE ROAD.',
      blank: 'Nothing: plain metal.',
    }),
    state: choice('What is the bell doing right now?', {
      rest: 'Hanging dead still.',
      ringing: 'Mid-ring: swung hard to one side with the clapper striking.',
      swaying: 'Swaying gently, as if just rung or caught by a draught.',
      muffled: 'Silenced: a bar towel is knotted round the clapper so it cannot ring.',
    }),
    rope: choice('What is the pull?', {
      sailor: "A white sailor's bell rope with fancy knots and a tassel.",
      leather: 'A plain dark leather thong with a wooden bead.',
      cord: 'A red silk cord with a gold tassel.',
      frayed: 'A length of frayed string, a replacement for something lost.',
    }),
    extra: choice('What is with the bell?', {
      nothing: 'Nothing else.',
      slate: 'A small chalk slate propped at its foot giving the hour of last orders.',
      lifering: 'A red and white life ring leaning behind it.',
      glass: 'An upturned shot glass and a few coins at its foot: somebody paid for ringing it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = { brass: '#d7a93c', bronze: '#8a6238', nickel: '#cdd3d5', black: '#1d1e21' }[a.metal];
    const bellMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tone).lerp(new THREE.Color(a.metal === 'bronze' ? '#4f8a72' : '#6b5d42'), (a.metal === 'bronze' ? 0.15 : 0) + mood.wear * 0.3),
      metalness: a.metal === 'black' ? 0.3 : 0.92, roughness: (a.metal === 'black' ? 0.45 : 0.24) + mood.wear * 0.3, side: THREE.DoubleSide,
    });
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d7a93c').lerp(new THREE.Color('#6b5d42'), mood.wear * 0.3), metalness: 0.92, roughness: 0.25 + mood.wear * 0.3 });
    const fitting = a.metal === 'nickel' ? new THREE.MeshStandardMaterial({ color: '#cdd3d5', metalness: 0.92, roughness: 0.25 + mood.wear * 0.3 }) : brass;
    const wood = s.material('#6b4226', { roughness: 0.55 });
    const darkWood = s.material('#4a2d1a', { roughness: 0.6 });

    // The mount, and where the bell hangs from.
    let hang: [number, number, number] = [0, 0.4, 0];
    if (a.mount === 'plaque') {
      hang = [0, 0.4, 0.04];
      s.box([0.26, 0.5, 0.024], [0, 0.26, -0.11], wood);
      s.box([0.3, 0.02, 0.1], [0, 0.01, -0.09], darkWood);
      s.box([0.22, 0.46, 0.004], [0, 0.26, -0.097], s.material('#7a4d2c', { roughness: 0.45 }));
      for (const [x, y] of [[-0.11, 0.48], [0.11, 0.48], [-0.11, 0.05], [0.11, 0.05]] as const) s.cylinder(0.006, 0.006, 0.004, [x, y, -0.096], fitting, 10).rotation.x = Math.PI / 2;
      s.cylinder(0.035, 0.035, 0.008, [0, 0.44, -0.094], fitting, 20).rotation.x = Math.PI / 2;
      s.tube([[0, 0.44, -0.095], [0, 0.475, -0.04], [0, 0.47, 0.02], [0, 0.425, 0.04]], 0.009, fitting);
    } else if (a.mount === 'post') {
      hang = [0.03, 0.41, 0];
      s.lathe([[0, 0], [0.075, 0], [0.078, 0.012], [0.04, 0.022], [0.022, 0.04], [0.018, 0.2], [0.026, 0.22], [0.018, 0.24], [0.016, 0.44], [0.024, 0.455], [0.02, 0.48], [0, 0.49]], darkWood, [-0.125, 0, 0]);
      s.tube([[-0.125, 0.46, 0], [-0.08, 0.5, 0], [-0.01, 0.5, 0], [0.035, 0.47, 0], [0.03, 0.435, 0]], 0.008, fitting);
      s.tube([[-0.11, 0.36, 0], [-0.07, 0.4, 0], [-0.05, 0.455, 0], [-0.07, 0.49, 0]], 0.005, fitting);
    } else if (a.mount === 'gallows') {
      hang = [0.04, 0.43, 0];
      const timber = s.material('#7a5a3a', { roughness: 0.85 });
      s.box([0.055, 0.56, 0.055], [-0.15, 0.28, 0], timber);
      s.box([0.34, 0.05, 0.05], [-0.01, 0.535, 0], timber);
      s.box([0.2, 0.035, 0.035], [-0.085, 0.455, 0], timber).rotation.z = -Math.PI / 4;
      s.box([0.22, 0.03, 0.2], [-0.15, 0.015, 0], timber);
      for (let i = 0; i < 4; i++) s.ring(0.008, 0.0022, [0.04, 0.5 - i * 0.017, 0], fitting).rotation.y = i % 2 ? Math.PI / 2 : 0;
    } else {
      hang = [0, 0.4, 0];
      const arch = s.ring(0.14, 0.009, [0, 0.3, 0], fitting, Math.PI);
      arch.geometry.rotateZ(0);
      for (const x of [-1, 1]) {
        s.rod([x * 0.14, 0.3, 0], [x * 0.14, 0.02, 0], 0.009, fitting);
        s.lathe([[0, 0], [0.04, 0], [0.042, 0.008], [0.016, 0.02], [0.01, 0.035]], fitting, [x * 0.14, 0, 0]);
      }
      s.box([0.34, 0.012, 0.06], [0, 0.006, 0], darkWood);
      s.rod([0, 0.44, 0], [0, 0.41, 0], 0.005, fitting);
    }

    // The bell swings as one body about its hanging point; the clapper swings inside it.
    const swing = new THREE.Group();
    swing.position.set(...hang);
    s.root.add(swing);
    const part = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = swing) => { node.traverse((n) => { n.castShadow = true; }); parent.add(node); return node; };
    const loop = part(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 20), fitting));
    loop.position.y = -0.008;
    part(new THREE.Mesh(new THREE.LatheGeometry(BELL.map(([x, y]) => new THREE.Vector2(x, y)), 44), bellMat));
    for (const y of [-0.05, -0.058, -0.136, -0.144]) {
      const band = part(new THREE.Mesh(new THREE.TorusGeometry(radiusAt(y) + 0.0006, 0.0016, 5, 44), a.metal === 'black' ? brass : bellMat));
      band.rotation.x = Math.PI / 2; band.position.y = y;
    }
    if (a.metal === 'black') {
      const lip = part(new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.0045, 6, 44), brass));
      lip.rotation.x = Math.PI / 2; lip.position.y = -0.177;
    }
    if (a.metal === 'bronze' || mood.wear > 0.6) {
      // Verdigris streaks running down from the shoulder.
      const green = new THREE.MeshStandardMaterial({ color: '#5c8a76', roughness: 0.95 });
      for (let i = 0; i < 9; i++) {
        const t = random() * Math.PI * 2, y0 = -0.03 - random() * 0.05, y1 = y0 - 0.03 - random() * 0.06;
        const from = new THREE.Vector3(Math.sin(t) * (radiusAt(y0) + 0.0006), y0, Math.cos(t) * (radiusAt(y0) + 0.0006));
        const to = new THREE.Vector3(Math.sin(t) * (radiusAt(y1) + 0.0006), y1, Math.cos(t) * (radiusAt(y1) + 0.0006));
        const streak = part(new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.0028, from.distanceTo(to), 5), green));
        streak.position.copy(from).add(to).multiplyScalar(0.5);
        streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
        streak.castShadow = false;
      }
    }
    const words = WORDS[a.words];
    if (words) {
      const light = a.metal === 'black';
      const map = texture(512, 96, (c) => {
        c.clearRect(0, 0, 512, 96);
        c.fillStyle = light ? '#e8c45a' : a.metal === 'nickel' ? '#3c4246' : '#4a3210';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 58px serif';
        c.fillText(words, 256, 50, 492);
      });
      const y0 = -0.07, y1 = -0.115, arc = 2.5;
      const text = part(new THREE.Mesh(new THREE.CylinderGeometry(radiusAt(y0) + 0.001, radiusAt(y1) + 0.001, y0 - y1, 24, 1, true, -arc / 2, arc), new THREE.MeshStandardMaterial({ map, alphaTest: 0.35, roughness: 0.7, metalness: light ? 0.6 : 0.2 })));
      text.position.y = (y0 + y1) / 2;
      text.castShadow = false;
    }

    const clapper = new THREE.Group();
    clapper.position.y = -0.03;
    swing.add(clapper);
    part(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.12, 8), fitting), clapper).position.y = -0.06;
    part(new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 10), fitting), clapper).position.y = -0.128;
    const eye = part(new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0022, 5, 14), fitting), clapper);
    eye.position.y = -0.153;

    // The pull hangs from the clapper, below the mouth.
    const ropeTop = -0.16, ropeLen = { sailor: 0.15, leather: 0.13, cord: 0.14, frayed: 0.1 }[a.rope];
    const ropeTint = { sailor: '#efe9d8', leather: '#3d2718', cord: '#b3202c', frayed: '#c9b38a' }[a.rope];
    const ropeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(ropeTint).lerp(new THREE.Color('#7a6a55'), mood.wear * 0.35), roughness: 0.9 });
    const thick = { sailor: 0.0075, leather: 0.003, cord: 0.004, frayed: 0.0018 }[a.rope];
    part(new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, ropeLen, 8), ropeMat), clapper).position.y = ropeTop - ropeLen / 2;
    if (a.rope === 'sailor') {
      for (const [t, r] of [[0.12, 0.012], [0.45, 0.014], [0.8, 0.017]] as const) { const knot = part(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), ropeMat), clapper); knot.scale.y = 0.8; knot.position.y = ropeTop - ropeLen * t; }
      for (let i = 0; i < 10; i++) { const strand = part(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0016, 0.045, 4), ropeMat), clapper); const t = i * 0.63; strand.position.set(Math.cos(t) * 0.007, ropeTop - ropeLen - 0.012, Math.sin(t) * 0.007); strand.rotation.set(Math.sin(t) * 0.3, 0, -Math.cos(t) * 0.3); }
      for (let i = 0; i < 9; i++) { const wrap = part(new THREE.Mesh(new THREE.TorusGeometry(thick + 0.0006, 0.0014, 4, 12), ropeMat), clapper); wrap.rotation.x = Math.PI / 2 + 0.25; wrap.position.y = ropeTop - ropeLen * (0.18 + i * 0.027); }
    } else if (a.rope === 'leather') {
      part(new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshStandardMaterial({ color: '#a8743c', roughness: 0.5 })), clapper).position.y = ropeTop - ropeLen;
    } else if (a.rope === 'cord') {
      const gold = new THREE.MeshStandardMaterial({ color: '#dcb23e', roughness: 0.5, metalness: 0.4 });
      part(new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), gold), clapper).position.y = ropeTop - ropeLen;
      part(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 12, 1, true), gold), clapper).position.y = ropeTop - ropeLen - 0.026;
    } else {
      for (let i = 0; i < 5; i++) { const fray = part(new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0008, 0.022, 3), ropeMat), clapper); fray.position.set((i - 2) * 0.002, ropeTop - ropeLen - 0.008, 0); fray.rotation.z = (i - 2) * 0.22; }
      part(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), ropeMat), clapper).position.y = ropeTop - ropeLen * 0.3;
    }
    if (a.state === 'muffled') {
      const cloth = new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: 1, flatShading: true });
      const g = new THREE.IcosahedronGeometry(0.03, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.8 + Math.abs(Math.sin(i * 5.3)) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 1.2, p.getZ(i) * k); }
      g.computeVertexNormals();
      part(new THREE.Mesh(g, cloth), clapper).position.y = -0.135;
      for (const x of [-1, 1]) { const tail = part(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.004), cloth), clapper); tail.position.set(x * 0.016, -0.2, 0.004 * x); tail.rotation.z = x * 0.22; }
      const stripe = part(new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.008, 0.0045), new THREE.MeshStandardMaterial({ color: '#b3382e' })), clapper);
      stripe.position.set(0.02, -0.22, 0.004); stripe.rotation.z = 0.22;
    }

    // Company at the foot.
    const fx = a.mount === 'post' || a.mount === 'gallows' ? 0.12 : 0.17, fz = a.mount === 'plaque' ? 0.06 : 0.08;
    if (a.extra === 'slate') {
      const hour = ['11', '10:30', '12', '2 AM', '1 AM'][Math.floor(random() * 5)];
      const map = texture(192, 256, (c) => {
        c.fillStyle = '#24292a'; c.fillRect(0, 0, 192, 256);
        c.fillStyle = 'rgba(240,238,228,0.08)'; for (let i = 0; i < 30; i++) c.fillRect(random() * 192, random() * 256, 40, 3);
        c.fillStyle = '#f1efe6'; c.textAlign = 'center'; c.font = 'bold 40px cursive';
        c.fillText('LAST', 96, 60); c.fillText('ORDERS', 96, 108, 170);
        c.fillStyle = mood.cheer > 0.5 ? '#f4d35e' : '#f1efe6'; c.font = 'bold 76px cursive'; c.fillText(hour, 96, 200, 170);
      });
      const slate = new THREE.Group();
      slate.position.set(fx, 0, fz); slate.rotation.set(-0.3, -0.35, 0, 'YXZ');
      s.root.add(slate);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.15, 0.01), wood); frame.position.y = 0.075; frame.castShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.098, 0.132), new THREE.MeshStandardMaterial({ map, roughness: 0.95 })); face.position.set(0, 0.075, 0.0055);
      slate.add(frame, face);
      s.rod([fx + 0.02, 0.11, fz - 0.04], [fx + 0.035, 0, fz - 0.085], 0.004, wood);
    } else if (a.extra === 'lifering') {
      const ring = new THREE.Group();
      ring.position.set(a.mount === 'plaque' ? 0.2 : -0.02, 0.16, a.mount === 'plaque' ? -0.06 : -0.1); ring.rotation.set(-0.22, a.mount === 'plaque' ? -0.5 : 0, 0);
      s.root.add(ring);
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.034, 10, 14, Math.PI / 2), new THREE.MeshStandardMaterial({ color: i % 2 ? '#c8372c' : '#f2efe6', roughness: 0.6 + mood.wear * 0.3 }));
        seg.rotation.z = i * Math.PI / 2 + Math.PI / 4; seg.castShadow = true;
        ring.add(seg);
      }
      const line = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.003, 5, 40), new THREE.MeshStandardMaterial({ color: '#d8cfb4', roughness: 1 }));
      ring.add(line);
    } else if (a.extra === 'glass') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e2f0f3', transparent: true, opacity: 0.42, roughness: 0.05, side: THREE.DoubleSide });
      const shot = s.lathe([[0, 0], [0.018, 0], [0.024, 0.06], [0.022, 0.06], [0.016, 0.01], [0, 0.01]], glass, [fx, 0.06, fz]);
      shot.rotation.x = Math.PI;
      s.ring(0.0235, 0.0014, [fx, 0.001, fz], new THREE.MeshStandardMaterial({ color: '#f4fcff', transparent: true, opacity: 0.8 })).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) s.cylinder(0.011, 0.011, 0.0018, [fx - 0.05 + random() * 0.09, 0.001 + i * 0.0003, fz + 0.035 + random() * 0.04], new THREE.MeshStandardMaterial({ color: i % 3 ? '#c9ccce' : '#b87a4a', metalness: 0.85, roughness: 0.3 }), 14);
    }

    // Pose and motion.
    const amplitude = { rest: 0.012, ringing: 0.5, swaying: 0.16, muffled: 0 }[a.state] * (a.state === 'ringing' ? mix(0.8, 1.15, mood.energy) : 1);
    const speed = a.state === 'ringing' ? mix(5, 11, mood.energy) : mix(1.2, 2.6, mood.energy);
    const sign = a.mount === 'post' || a.mount === 'gallows' || random() < 0.5 ? 1 : -1;
    const arcs: THREE.Mesh[] = [];
    if (a.state === 'ringing') {
      const air = new THREE.MeshBasicMaterial({ color: a.metal === 'nickel' ? '#9fb0b8' : '#d9a93c', transparent: true, opacity: 0.55, depthWrite: false });
      for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.13 + i * 0.035, 0.003, 4, 20, 0.9), air);
        arc.position.set(hang[0], hang[1] - 0.13, hang[2]);
        arc.rotation.z = side > 0 ? -0.45 : Math.PI - 0.45;
        s.root.add(arc);
        arcs.push(arc);
      }
    }
    const pose = (time: number) => {
      const angle = sign * amplitude * Math.cos(time * speed);
      swing.rotation.z = angle;
      clapper.rotation.z = a.state === 'muffled' ? 0 : a.state === 'ringing' ? -sign * 0.42 * Math.cos(time * speed - 0.9) - angle * 0.2 : -angle * 0.6;
      arcs.forEach((arc, i) => { arc.scale.setScalar(1 + ((time * speed * 0.25 + i * 0.13) % 0.4)); });
    };
    pose(0);
    // Measure it hanging straight so a hard swing does not shift where it stands.
    swing.rotation.z = 0;
    for (const arc of arcs) arc.visible = false;
    const thing = s.finish({ update: amplitude > 0 ? (_dt, time) => pose(time) : undefined });
    for (const arc of arcs) arc.visible = true;
    pose(0);
    return thing;
  },
});

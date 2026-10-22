import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  black: 'Natural jet black with a blue sheen.',
  chestnut: 'Warm everyday chestnut brown.',
  honey: 'Honey blonde, salon bright.',
  copper: 'Coppery red, bold but believable.',
  silver: 'Silver grey to powder white.',
  pink: 'Hot neon pink, plainly synthetic.',
  blue: 'Electric cobalt blue.',
  green: 'Acid lime green, a dare.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  black: '#1d1b22', chestnut: '#6a3d24', honey: '#d9a94e', copper: '#b8491f', silver: '#d9d8d2', pink: '#ff3fa0', blue: '#2456e6', green: '#9be321',
};

const A = 0.078, B = 0.105, C = 0.092; // head half-widths: x, y, z

function strandTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    const shade = 120 + Math.floor(random() * 135);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 0.6 + random() * 1.8;
    const x = random() * 128;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (random() - 0.5) * 8, 40, x + (random() - 0.5) * 8, 90, x + (random() - 0.5) * 6, 128);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

export default defineThing({
  questions: {
    style: choice('What style is the wig?', {
      bob: 'A sleek chin-length bob with a straight fringe.',
      afro: 'A big round afro, a soft halo of curls.',
      beehive: 'A towering sixties beehive, lacquered and swirled.',
      mullet: 'A spiky-topped mullet with a long tail down the back.',
      braids: 'Long box braids hanging in ropes with beads at the ends.',
      judge: "A powdered judge's or barrister's wig with rows of tight rolled curls and two lappets.",
    }),
    colour: choice('What colour is the hair?', COLOURS),
    length: score('How much hair is there?', ['Cropped and modest', 'Ordinary', 'Generous', 'Enormous, far more hair than head']),
    purpose: choice('Who is the wig for?', {
      stage: 'A performer: a glittering tiara, a feather plume and painted lips.',
      chemo: 'Someone who has lost their hair: a soft pastel cap liner under it and a care leaflet beside the stand.',
      disguise: 'Someone who does not want to be recognised: dark glasses and a false moustache on the foam face.',
      sunday: 'Sunday best: a little pillbox hat with a flower pinned on top.',
      nobody: 'Nobody yet. It simply waits on the shelf.',
    }),
    state: choice('What state is it in?', {
      fresh: 'Freshly styled, glossy and perfectly set.',
      askew: 'Knocked askew, sliding off to show bare foam scalp.',
      halfcombed: 'Half combed: one side smooth, the other a frizz, with the comb still stuck in it.',
      tagged: 'Pinned to the head with T-pins and a dangling price tag.',
    }),
    face: choice('What is the foam face like?', {
      blank: 'A smooth egg with no features at all.',
      moulded: 'Faint moulded nose, brow and closed lips, the usual shop head.',
      marker: 'Someone has drawn eyes and a smile on it in marker pen.',
      madeup: 'Painted like a mannequin: lowered lashes and red lips.',
    }),
    head: choice('What is the head made of?', {
      foam: 'Plain white polystyrene.',
      velvet: 'Black velvet flocking, boutique style.',
      mannequin: 'Glossy flesh-pink fibreglass from an old department store.',
    }),
    stand: choice('What does the head sit on?', {
      wire: 'A spindly three-legged wire stand.',
      dowel: 'A wooden disc with a dowel spike.',
      riser: 'A white display block with a price strip.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const add = (group: THREE.Object3D, mesh: THREE.Object3D) => { group.add(mesh); return mesh; };

    // ---- materials
    const hairTint = new THREE.Color(TINT[a.colour]);
    const hsl = { h: 0, s: 0, l: 0 };
    hairTint.getHSL(hsl);
    hairTint.setHSL(hsl.h, hsl.s * mix(0.6, 1.1, mood.cheer), hsl.l * mix(0.92, 1.05, mood.cheer));
    hairTint.lerp(new THREE.Color('#8a8172'), mood.wear * 0.25);
    const strands = strandTexture(random);
    const gloss = a.state === 'fresh' ? 0.35 : 0.6;
    const hair = new THREE.MeshStandardMaterial({ color: hairTint, map: strands, roughness: gloss + mood.wear * 0.3, side: THREE.DoubleSide });
    const curl = new THREE.MeshStandardMaterial({ color: hairTint, roughness: 0.9 });
    const foamColour = { foam: '#f4f2ea', velvet: '#1c1a1f', mannequin: '#e8b49a' }[a.head];
    const foam = s.material(foamColour, { roughness: a.head === 'mannequin' ? 0.25 : 0.95 });
    if (a.head === 'foam') foam.color.lerp(new THREE.Color('#d8c690'), mood.wear * 0.5);
    const ink = s.material(a.head === 'velvet' ? '#f1ede2' : '#1b1b20', { roughness: 0.7 });
    const wire = s.material('#aab0b3', { metalness: 0.85, roughness: 0.3 });
    const red = s.material('#c8182f', { roughness: 0.35 });

    // ---- stand
    let h0 = 0.14;
    if (a.stand === 'wire') {
      s.ring(0.075, 0.004, [0, 0.004, 0], wire).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + 0.5;
        s.tube([[Math.sin(t) * 0.075, 0.004, Math.cos(t) * 0.075], [Math.sin(t) * 0.05, 0.06, Math.cos(t) * 0.05], [Math.sin(t) * 0.012, 0.11, Math.cos(t) * 0.012], [0, 0.14, 0]], 0.003, wire);
      }
      s.cylinder(0.035, 0.035, 0.006, [0, 0.139, 0], wire, 18);
    } else if (a.stand === 'dowel') {
      h0 = 0.09;
      const wood = s.material('#b98850');
      s.cylinder(0.075, 0.08, 0.022, [0, 0.011, 0], wood, 28);
      s.cylinder(0.011, 0.011, 0.14, [0, 0.09, 0], wood, 10);
    } else {
      h0 = 0.1;
      s.box([0.18, 0.1, 0.18], [0, 0.05, 0], s.material('#f1f0ec', { roughness: 0.4 }));
      s.label(['19.99', '24.50', '45.00', '2 FOR 30', '9.99'][Math.floor(random() * 5)], 0.11, 0.035, [0, 0.045, 0.0905], '#b3121f', '#fff6c8');
    }

    // ---- head
    const H = new THREE.Group();
    H.position.y = h0;
    H.rotation.y = jitter(0.12);
    s.root.add(H);
    const hy = 0.215;
    add(H, s.lathe([[0.001, 0], [0.066, 0], [0.068, 0.018], [0.05, 0.05], [0.04, 0.085], [0.041, 0.13], [0.03, 0.15]], foam));
    add(H, s.ball([A, B, C], [0, hy, 0.004], foam, 32));
    add(H, s.ball([0.058, 0.062, 0.066], [0, hy - 0.052, 0.024], foam, 24));
    const surf = (x: number, dy: number) => 0.004 + C * Math.sqrt(Math.max(0.05, 1 - (x / A) ** 2 - (dy / B) ** 2));
    if (a.face !== 'blank') {
      const nose = add(H, s.mesh(new THREE.ConeGeometry(0.013, 0.04, 10), foam, [0, hy - 0.012, surf(0, -0.012) + 0.004]));
      nose.rotation.x = 0.5;
      for (const x of [-1, 1]) add(H, s.ball([0.012, 0.024, 0.008], [x * (A - 0.001), hy - 0.005, 0.0], foam, 12));
    }
    if (a.face === 'moulded') {
      add(H, s.ball([0.05, 0.012, 0.012], [0, hy + 0.022, surf(0, 0.022) - 0.006], foam, 14));
      add(H, s.ball([0.02, 0.007, 0.008], [0, hy - 0.05, surf(0, -0.05) + 0.006], foam, 12));
    }
    if (a.face === 'marker') {
      for (const x of [-1, 1]) add(H, s.ball([0.009, 0.013 + jitter(0.003), 0.003], [x * 0.03 + jitter(0.003), hy + 0.008 + jitter(0.004), surf(0.03, 0.008) + 0.001], ink, 10));
      const smile = add(H, s.ring(0.026, 0.0028, [0, hy - 0.034, surf(0, -0.05) + 0.004], ink, 2.1));
      smile.rotation.z = -Math.PI / 2 - 1.05 + jitter(0.15);
    }
    if (a.face === 'madeup' || a.purpose === 'stage') {
      for (const x of [-1, 1]) {
        const lash = add(H, s.ring(0.014, 0.0025, [x * 0.031, hy + 0.016, surf(0.031, 0.006) + 0.002], ink, 2.2));
        lash.rotation.z = -Math.PI / 2 - 1.1;
      }
      add(H, s.ball([0.019, 0.008, 0.006], [0, hy - 0.052, surf(0, -0.052) + 0.008], red, 12));
    }
    // Pin holes and dents on a tired head.
    if (a.head === 'foam') {
      const holes = Array.from({ length: Math.round(mood.wear * 26) }, () => {
        const x = jitter(0.05), dy = jitter(0.07);
        return { at: [x, hy + dy, surf(x, dy) + 0.0005] as const, size: 0.0022 + random() * 0.002 };
      });
      if (holes.length) add(H, s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#8d8672'), holes));
    }

    // ---- wig
    const W = new THREE.Group();
    W.position.set(0, hy, 0.004);
    H.add(W);
    const L = a.length;
    const cap = add(W, s.mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hair));
    cap.scale.set(A + 0.013, B + 0.013, C + 0.015);
    cap.rotation.x = -0.36;
    const curtain = (rTop: number, rBot: number, yTop: number, yBot: number, gap: number, ragged = 0.012) => {
      const geometry = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 36, 3, true, gap / 2, Math.PI * 2 - gap);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) if (position.getY(i) < -(yTop - yBot) / 2 + 0.001) position.setY(i, position.getY(i) + jitter(ragged));
      geometry.computeVertexNormals();
      const mesh = add(W, s.mesh(geometry, hair, [0, (yTop + yBot) / 2, 0]));
      mesh.scale.z = (C + 0.016) / (A + 0.014);
      return mesh;
    };
    const fringe = (low: number) => {
      const patch = add(W, s.mesh(new THREE.SphereGeometry(1, 14, 6, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.16, Math.PI * low), hair));
      patch.scale.set(A + 0.017, B + 0.016, C + 0.02);
    };
    let topY = B + 0.02, topZ = -0.01;
    const minY = -(hy + h0) + 0.012; // W-local height of the counter

    if (a.style === 'bob') {
      const bottom = Math.max(minY, -mix(0.06, 0.2, L));
      curtain(A + 0.014, A + mix(0.02, 0.04, L), 0.045, bottom, 1.75);
      fringe(0.24);
    } else if (a.style === 'afro') {
      const thick = mix(0.035, 0.105, L);
      const points = [];
      for (let tries = 0; points.length < 240 && tries < 4000; tries++) {
        const d = new THREE.Vector3(jitter(1), jitter(1), jitter(1));
        if (d.lengthSq() > 1 || d.lengthSq() < 0.01) continue;
        d.normalize();
        if (d.y < -0.32 || (d.z > 0.3 && d.y < 0.5)) continue;
        const t = thick * mix(0.45, 0.72, random());
        const shade = hairTint.clone().multiplyScalar(mix(0.72, 1.12, random()));
        points.push({ at: [d.x * (A + t), d.y * (B + t) + thick * 0.15, d.z * (C + t) - 0.004] as const, size: thick * mix(0.4, 0.62, random()), color: shade });
      }
      curl.color.set('#ffffff');
      add(W, s.scatter(new THREE.SphereGeometry(1, 8, 6), curl, points));
      topY = B + thick * 1.25;
    } else if (a.style === 'beehive') {
      const rise = mix(0.09, 0.3, L);
      const hive = add(W, s.lathe([[A + 0.016, 0.03], [A + 0.03, 0.075], [A + 0.022, 0.08 + rise * 0.45], [A * 0.82, 0.08 + rise * 0.82], [A * 0.4, 0.08 + rise], [0.001, 0.085 + rise]], hair));
      hive.scale.z = 1.1;
      hive.position.z = -0.03;
      hive.rotation.x = -0.2;
      const coils = 3 + Math.round(L * 4);
      for (let i = 0; i < coils; i++) {
        const y = 0.07 + rise * (i + 0.5) / coils * 0.9;
        const r = mix(A + 0.028, A * 0.62, ((i + 0.5) / coils) ** 1.6);
        const coil = new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 6, 40), curl);
        coil.position.set(0, y, 0);
        coil.rotation.set(Math.PI / 2 + jitter(0.12), 0, 0);
        coil.scale.y = 1.1;
        coil.castShadow = true;
        hive.add(coil);
      }
      curtain(A + 0.014, A + 0.02, 0.04, -0.05, 1.9, 0.006);
      fringe(0.2);
      topY = (0.085 + rise) * 0.97;
      topZ = -0.03 - (0.085 + rise) * 0.2;
    } else if (a.style === 'mullet') {
      const spikes = Array.from({ length: 70 }, () => {
        const d = new THREE.Vector3(jitter(1), mix(0.25, 1, random()), jitter(1) - 0.1).normalize();
        return d;
      });
      const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(0.011, 1, 5), hair, spikes.length);
      const dummy = new THREE.Object3D();
      spikes.forEach((d, index) => {
        const length = mix(0.03, 0.075, random()) * mix(0.8, 1.5, L);
        dummy.position.set(d.x * (A + 0.01) + d.x * length / 2, d.y * (B + 0.01) + d.y * length / 2, d.z * (C + 0.012) + d.z * length / 2);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        dummy.scale.set(1, length, 1);
        dummy.updateMatrix();
        cone.setMatrixAt(index, dummy.matrix);
      });
      cone.castShadow = true;
      W.add(cone);
      curtain(A + 0.014, A + 0.016, 0.04, -0.035, 1.9, 0.01);
      const tail = Math.max(minY, -mix(0.12, 0.32, L));
      curtain(A + 0.016, A + mix(0.03, 0.06, L), 0.03, tail, 3.9, 0.035);
      topY = B + 0.05;
    } else if (a.style === 'braids') {
      const drop = mix(0.17, 0.36, L);
      const beads: { at: readonly [number, number, number]; size: number; color: THREE.Color }[] = [];
      const count = 24 + Math.round(L * 8);
      const trims = ['#f1c232', '#f4f1e6', '#d42a2a', '#1fa37a', '#3b6fe0'];
      const trim = trims[Math.floor(random() * trims.length)];
      for (let i = 0; i < count; i++) {
        const t = 0.85 + (i / (count - 1)) * (Math.PI * 2 - 1.7) + jitter(0.03);
        const length = drop * mix(0.82, 1.05, random());
        const lean = jitter(0.02), swing = jitter(0.015);
        const steps = Math.ceil(length / 0.011);
        const shade = hairTint.clone().multiplyScalar(mix(0.8, 1.15, random()));
        for (let k = 0; k <= steps; k++) {
          const f = k / steps;
          const out = 1 + Math.sin(Math.min(1, f * 3) * Math.PI / 2) * 0.16;
          const y = Math.max(minY, 0.055 - f * length);
          const end = k >= steps - 1;
          beads.push({
            at: [Math.sin(t) * (A + 0.012) * out + lean * f + (k % 2 ? 0.0015 : -0.0015), y, Math.cos(t) * (C + 0.014) * out + swing * f],
            size: end ? 0.0105 : 0.0082,
            color: end ? new THREE.Color(trim) : shade,
          });
        }
      }
      curl.color.set('#ffffff');
      curl.roughness = 0.65;
      add(W, s.scatter(new THREE.SphereGeometry(1, 7, 5), curl, beads));
    } else {
      const rows = 3 + Math.round(L * 3);
      const rolls = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.04, 10), hair, rows * 14 + 2 * (4 + Math.round(L * 5)));
      const dummy = new THREE.Object3D();
      let index = 0;
      for (let row = 0; row < rows; row++) {
        const y = 0.035 - row * 0.032;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const t = 1.0 + (i / (n - 1)) * (Math.PI * 2 - 2.0);
          const r = 1 + Math.max(0, -y) * 1.2;
          dummy.position.set(Math.sin(t) * (A + 0.024) * r, y, Math.cos(t) * (C + 0.026) * r);
          dummy.rotation.set(0, t, Math.PI / 2);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          rolls.setMatrixAt(index++, dummy.matrix);
        }
      }
      const lappet = 4 + Math.round(L * 5);
      for (const x of [-1, 1]) for (let k = 0; k < lappet; k++) {
        dummy.position.set(x * (A + 0.004), Math.max(minY + 0.01, -0.02 - k * 0.03), C * 0.78 + k * 0.002);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        rolls.setMatrixAt(index++, dummy.matrix);
      }
      rolls.count = index;
      rolls.castShadow = true;
      W.add(rolls);
      curtain(A + 0.016, A + 0.03, 0.04, -0.01 - rows * 0.03, 2.0, 0.003);
      // A little tied tail at the nape.
      add(W, s.cylinder(0.012, 0.02, 0.06, [0, -0.04 - rows * 0.03, -(C + 0.02)], hair, 10));
      add(W, s.ball([0.02, 0.01, 0.01], [0, -0.012 - rows * 0.03, -(C + 0.03)], s.material('#17171c'), 10));
    }

    // Flyaways on a worn wig.
    for (let i = 0; i < Math.round(mood.wear * 8); i++) {
      const d = new THREE.Vector3(jitter(1), mix(-0.2, 1, random()), jitter(1) - 0.3).normalize();
      const from = [d.x * (A + 0.01), d.y * (B + 0.01), d.z * (C + 0.01)] as const;
      const reach = 0.012 + random() * 0.022;
      add(W, s.rod(from, [from[0] + d.x * reach + jitter(0.008), from[1] + d.y * reach + jitter(0.008), from[2] + d.z * reach], 0.0012, curl.color.getHex() === 0xffffff ? hair : curl));
    }

    // ---- state
    const swinging: THREE.Object3D[] = [];
    if (a.state === 'askew') {
      const side = random() < 0.5 ? -1 : 1;
      W.rotation.set(jitter(0.1) + 0.12, side * mix(0.35, 0.8, random()), side * mix(0.2, 0.34, random()));
      W.position.x += side * 0.022;
      W.position.y -= 0.004;
    }
    if (a.state === 'halfcombed') {
      const side = random() < 0.5 ? -1 : 1;
      const frizz = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0035, 1, 4), hair, 110);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 110; i++) {
        const d = new THREE.Vector3(side * mix(0.35, 1, random()), jitter(0.9), jitter(0.8) - 0.15).normalize();
        const length = mix(0.03, 0.09, random());
        const base = mix(1.05, 1.25, random());
        dummy.position.set(d.x * (A * base + length / 2), d.y * (B * base + length / 2), d.z * (C * base + length / 2));
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(jitter(0.5), jitter(0.5), jitter(0.5))).normalize());
        dummy.scale.set(1, length, 1);
        dummy.updateMatrix();
        frizz.setMatrixAt(i, dummy.matrix);
      }
      frizz.castShadow = true;
      W.add(frizz);
      const comb = new THREE.Group();
      const plastic = s.material(['#e23b6d', '#1c1c22', '#2f8f83', '#f0b12b'][Math.floor(random() * 4)], { roughness: 0.35 });
      add(comb, s.box([0.1, 0.014, 0.005], [0, 0, 0], plastic));
      for (let i = 0; i < 16; i++) add(comb, s.box([0.0028, 0.034, 0.004], [-0.046 + i * 0.006, -0.022, 0], plastic));
      comb.position.set(-side * (A + 0.035), 0.03, 0.03);
      comb.rotation.set(0.3, -side * 1.1, -side * 0.5);
      W.add(comb);
    }
    if (a.state === 'tagged') {
      const pin = s.material('#d9dde0', { metalness: 0.9, roughness: 0.2 });
      for (let i = 0; i < 4; i++) {
        const d = new THREE.Vector3(jitter(0.6), 0.75, jitter(0.6) - 0.1).normalize();
        const p = [d.x * (A + 0.012), Math.max(d.y * (B + 0.012), topY - 0.03), d.z * (C + 0.012) + topZ * 0.5] as const;
        add(W, s.rod(p, [p[0] + d.x * 0.035, p[1] + d.y * 0.035, p[2] + d.z * 0.035], 0.0012, pin));
        const bar = add(W, s.rod([p[0] + d.x * 0.035 - 0.007, p[1] + d.y * 0.035, p[2] + d.z * 0.035], [p[0] + d.x * 0.035 + 0.007, p[1] + d.y * 0.035, p[2] + d.z * 0.035], 0.0014, pin));
        bar.rotation.y = jitter(1);
      }
      const tag = new THREE.Group();
      const side = random() < 0.5 ? -1 : 1;
      tag.position.set(side * (A + 0.03), 0.01, C * 0.75);
      add(tag, s.rod([0, 0, 0], [0, -0.05, 0], 0.0008, s.material('#e9e2d0')));
      const price = add(tag, s.label(['£12', '£19.99', '£35', '$8.50', 'SALE', '£60'][Math.floor(random() * 6)], 0.062, 0.04, [0, -0.07, 0], '#b3121f', '#fff3b8'));
      price.rotation.z = jitter(0.2);
      tag.rotation.y = side * 0.4;
      W.add(tag);
      swinging.push(tag);
    }

    // ---- who it is for
    if (a.purpose === 'stage') {
      const gold = s.material('#e8c24a', { metalness: 0.9, roughness: 0.25, emissive: '#7a5a10', emissiveIntensity: 0.3 });
      const tiara = new THREE.Group();
      const baseY = a.style === 'afro' || a.style === 'beehive' ? 0.085 : 0.075;
      const reach = a.style === 'afro' ? mix(0.035, 0.105, L) * 0.9 : 0.02;
      for (let i = -4; i <= 4; i++) {
        const t = i * 0.17;
        const peak = 0.045 - Math.abs(i) * 0.008;
        const p = [Math.sin(t) * (A * 0.8 + reach), baseY, Math.cos(t) * (C * 0.72 + reach)] as const;
        add(tiara, s.rod(p, [p[0], p[1] + peak, p[2]], 0.004, gold, 0.0015));
        add(tiara, s.ball([0.006, 0.006, 0.006], [p[0], p[1] + peak, p[2]], s.material(i % 2 ? '#ff4fb0' : '#7ff0ff', { emissive: i % 2 ? '#ff4fb0' : '#7ff0ff', emissiveIntensity: 0.6, roughness: 0.2 }), 8));
      }
      W.add(tiara);
      const plume = new THREE.Group();
      const featherTint = new THREE.Color().setHSL(random(), 0.75, 0.6);
      const feather = s.material(featherTint, { roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) {
        const f = add(plume, s.ball([0.022, 0.1, 0.006], [(i - 1) * 0.02, 0.1, 0], feather, 12));
        f.rotation.z = -(i - 1) * 0.28;
      }
      plume.position.set(0.02, topY - 0.02, topZ - 0.02);
      plume.rotation.x = -0.25;
      W.add(plume);
      swinging.push(plume);
    }
    if (a.purpose === 'sunday') {
      const cloth = s.material(new THREE.Color().setHSL(mix(0.62, 0.92, random()), mix(0.3, 0.6, mood.cheer), mix(0.28, 0.6, mood.cheer)), { roughness: 0.85 });
      const hat = new THREE.Group();
      add(hat, s.cylinder(0.05, 0.054, 0.034, [0, 0.017, 0], cloth, 24));
      add(hat, s.cylinder(0.056, 0.056, 0.006, [0, 0.004, 0], s.material('#f6f1e4'), 24));
      const petal = s.material('#f3ead8', { roughness: 0.8 });
      for (let i = 0; i < 6; i++) add(hat, s.ball([0.012, 0.006, 0.012], [0.038 + Math.cos(i * 1.05) * 0.013, 0.036, 0.02 + Math.sin(i * 1.05) * 0.013], petal, 8));
      add(hat, s.ball([0.008, 0.008, 0.008], [0.038, 0.04, 0.02], s.material('#e7b52c'), 8));
      hat.position.set(-0.012, topY - 0.012, topZ + 0.012);
      hat.rotation.set(0.14, jitter(0.5), 0.2);
      W.add(hat);
    }
    if (a.purpose === 'chemo') {
      const soft = s.material(['#f4c7d3', '#c9dcf2', '#d8ecd2', '#efe2c4'][Math.floor(random() * 4)], { roughness: 1 });
      const liner = add(H, s.mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), soft, [0, hy, 0.004]));
      liner.scale.set(A + 0.006, B + 0.006, C + 0.007);
      liner.rotation.x = -0.36;
      const leaflet = new THREE.Group();
      const page = add(leaflet, s.label('CARING FOR YOUR WIG', 0.07, 0.1, [0, 0.05, 0], '#5c4a6e', '#f7f1f6'));
      page.rotation.x = -0.22;
      add(leaflet, s.box([0.07, 0.003, 0.03], [0, 0.0015, -0.012], s.material('#f7f1f6')));
      leaflet.position.set(0.12, 0, 0.05);
      leaflet.rotation.y = -0.45 + jitter(0.2);
      s.root.add(leaflet);
      const ribbon = add(H, s.ring(0.008, 0.0028, [0.012, 0.1, 0.045], s.material('#ee6f9d')));
      ribbon.scale.set(0.7, 1.3, 1);
    }
    if (a.purpose === 'disguise') {
      const shade = s.material('#0e0e12', { roughness: 0.12, metalness: 0.4 });
      const z = surf(0.03, 0.008) + 0.013;
      for (const x of [-1, 1]) {
        const lens = add(H, s.cylinder(0.026, 0.026, 0.004, [x * 0.033, hy + 0.008, z], shade, 20));
        lens.rotation.x = Math.PI / 2;
        lens.scale.z = 0.82;
        add(H, s.rod([x * 0.058, hy + 0.012, z], [x * (A + 0.004), hy + 0.012, 0.0], 0.0022, shade));
      }
      add(H, s.rod([-0.01, hy + 0.014, z], [0.01, hy + 0.014, z], 0.003, shade));
      const tash = s.material('#2a1c14', { roughness: 1 });
      for (const x of [-1, 1]) {
        const half = add(H, s.ball([0.02, 0.007, 0.007], [x * 0.015, hy - 0.037, surf(0.012, -0.037) + 0.012], tash, 10));
        half.rotation.z = -x * 0.3;
      }
    }

    // ---- counter clutter
    const pinMetal = s.material('#3a3a40', { metalness: 0.7, roughness: 0.4 });
    for (let i = 0; i < Math.round(mood.density * 9); i++) {
      const t = random() * Math.PI * 2, r = 0.105 + random() * 0.05, turn = random() * Math.PI;
      const x = Math.sin(t) * r, z = Math.cos(t) * r;
      s.rod([x - Math.cos(turn) * 0.022, 0.0015, z - Math.sin(turn) * 0.022], [x + Math.cos(turn) * 0.022, 0.0015, z + Math.sin(turn) * 0.022], 0.0013, pinMetal);
    }

    const sway = mix(0.02, 0.22, mood.energy);
    const phases = swinging.map(() => random() * 6);
    const rest = swinging.map((node) => node.rotation.z);
    return s.finish({
      update: (_dt, time) => {
        swinging.forEach((node, index) => { node.rotation.z = rest[index] + Math.sin(time * 1.7 + phases[index]) * sway; });
      },
    });
  },
});

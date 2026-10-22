import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const WAX = { beeswax: '#e9d2a2', yellowed: '#cf9f45', red: '#b1222c', paraffin: '#f2efe6' } as const;
const RIBBON = { red: '#b8232f', blue: '#2f5fae', white: '#efe9dc', black: '#26221f', gold: '#c99a2e', pink: '#e08aa6' } as const;
const NAMES = ['Maria', 'José', 'Anna', 'Luzia', 'Kostas', 'Rosa', 'Sepp', 'Inês', 'Elena', 'Tomás'];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One ear, 1 unit tall, outer face toward +z, front of the head toward -x. */
function earGeometries() {
  const outline: [number, number][] = [
    [0.3, 1.0], [0.5, 0.94], [0.6, 0.76], [0.58, 0.52], [0.48, 0.3], [0.38, 0.15], [0.3, 0.03],
    [0.2, 0.0], [0.12, 0.07], [0.11, 0.22], [0.16, 0.35], [0.09, 0.45], [0.14, 0.56], [0.07, 0.7], [0.09, 0.88], [0.18, 0.97],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(...outline[0]);
  shape.splineThru([...outline.slice(1), outline[0]].map(([x, y]) => new THREE.Vector2(x, y)));
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3, curveSegments: 20 });
  const tube = (points: [number, number, number][], radius: number) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 40, radius, 8, false);
  const helix = tube([[0.2, 0.6, 0.08], [0.13, 0.8, 0.1], [0.2, 0.93, 0.11], [0.36, 0.96, 0.11], [0.5, 0.86, 0.11], [0.555, 0.68, 0.11], [0.53, 0.5, 0.1], [0.45, 0.33, 0.09], [0.36, 0.2, 0.08]], 0.05);
  const anti = tube([[0.3, 0.27, 0.085], [0.4, 0.4, 0.1], [0.43, 0.58, 0.1], [0.37, 0.73, 0.1], [0.26, 0.82, 0.09]], 0.04);
  const crus = tube([[0.4, 0.66, 0.1], [0.3, 0.68, 0.095], [0.2, 0.7, 0.085]], 0.032);
  const concha = new THREE.SphereGeometry(1, 16, 10);
  concha.scale(0.1, 0.14, 0.03);
  concha.translate(0.27, 0.48, 0.085);
  const tragus = new THREE.SphereGeometry(1, 12, 8);
  tragus.scale(0.055, 0.075, 0.05);
  tragus.translate(0.15, 0.46, 0.09);
  const lobe = new THREE.SphereGeometry(1, 14, 10);
  lobe.scale(0.11, 0.12, 0.06);
  lobe.translate(0.23, 0.12, 0.06);
  return { solid: [plate, helix, anti, crus, tragus, lobe], concha };
}

export default defineThing({
  questions: {
    wax: choice('What wax are the ears cast in?', {
      beeswax: 'Cream beeswax, warm and faintly translucent.',
      yellowed: 'Old wax gone deep amber-yellow with years of candle smoke.',
      red: 'Blood-red wax, urgent and festive.',
      paraffin: 'Cold white paraffin, cheap and clean.',
    }),
    count: choice('How many ears were left?', {
      one: 'A single ear on its own ribbon.',
      pair: 'A matched left and right ear tied on one ribbon.',
      string: 'A long swag of many ears, one after another, years of thanks.',
    }),
    state: choice('What state is the wax in?', {
      crisp: 'Crisp from the mould, every fold sharp.',
      drooping: 'Softened by the candle beneath: sagging, bent forward, dripping from the lobe.',
      cracked: 'Dusty, grey and cracked, a piece broken away, long forgotten.',
    }),
    ribbon: choice('What colour is the ribbon?', {
      red: 'Red silk.', blue: 'Marian blue.', white: 'White, bridal or baptismal.', black: 'Black mourning ribbon.', gold: 'Gold braid.', pink: 'Faded pink.',
    }),
    note: choice('What was left with them?', {
      none: 'Nothing: the ears speak for themselves.',
      tag: 'A paper tag with a name and a date in ink.',
      photo: 'A small sepia photograph of the person healed.',
      wristband: 'A plastic hospital wristband looped over the nail.',
      coins: 'A few coins on the ledge below.',
    }),
    mount: choice('What do they hang on?', {
      wood: 'A soot-dark wooden board with iron nails.',
      plaster: 'A slab of cracked whitewashed chapel wall.',
      velvet: 'A panel of worn crimson velvet in a gilt frame.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusty = a.state === 'cracked';
    const waxTint = new THREE.Color(WAX[a.wax]);
    if (dusty) waxTint.lerp(new THREE.Color('#a39c8c'), 0.3);
    waxTint.lerp(new THREE.Color('#7d7568'), mood.wear * 0.25);
    const wax = new THREE.MeshStandardMaterial({ color: waxTint, roughness: dusty ? 0.95 : 0.38, emissive: waxTint, emissiveIntensity: dusty ? 0.02 : 0.12, side: THREE.DoubleSide });
    const hollow = new THREE.MeshStandardMaterial({ color: waxTint.clone().multiplyScalar(0.5), roughness: 0.7, side: THREE.DoubleSide });
    const crack = new THREE.MeshStandardMaterial({ color: '#2b2520', roughness: 1 });
    const ribbon = s.material(RIBBON[a.ribbon], { roughness: 0.55, side: THREE.DoubleSide });
    const iron = s.material('#2a2724', { metalness: 0.6, roughness: 0.55 });

    const n = a.count === 'one' ? 1 : a.count === 'pair' ? 2 : 5 + Math.floor(random() * 3 + mood.density * 2.99);
    const earH = 0.11;
    const W = a.count === 'one' ? 0.2 : a.count === 'pair' ? 0.3 : 0.095 * n + 0.08;
    const H = a.count === 'string' ? 0.36 : 0.31;

    // The mount: board, ledge and a hint of what the chapel wall is.
    if (a.mount === 'wood') {
      const wood = s.material('#3d2c21', { roughness: 0.9 });
      const planks = 3;
      for (let i = 0; i < planks; i++) s.box([W / planks - 0.004, H, 0.02], [(i - (planks - 1) / 2) * (W / planks), H / 2 + 0.02, 0], i % 2 ? wood : s.material('#46332a', { roughness: 0.9 }));
      s.box([W + 0.03, 0.02, 0.07], [0, 0.01, 0.02], s.material('#2f221a'));
    } else if (a.mount === 'plaster') {
      const wall = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#ddd6c6';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = `rgba(${90 + random() * 60},${80 + random() * 50},${60 + random() * 40},${0.04 + random() * 0.08})`;
          ctx.beginPath();
          ctx.arc(random() * 256, random() * 256, 4 + random() * 22, 0, 7);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(40,34,28,0.7)';
        ctx.lineWidth = 1.5;
        for (let c = 0; c < 3; c++) {
          let x = random() * 256, y = 0;
          ctx.beginPath();
          ctx.moveTo(x, y);
          while (y < 256) { x += (random() - 0.5) * 40; y += 12 + random() * 30; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        // soot rising from the candles
        const g = ctx.createLinearGradient(0, 256, 0, 60);
        g.addColorStop(0, `rgba(30,24,20,${0.25 + mood.wear * 0.4})`);
        g.addColorStop(1, 'rgba(30,24,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
      });
      s.box([W, H, 0.035], [0, H / 2 + 0.02, -0.008], new THREE.MeshStandardMaterial({ map: wall, roughness: 0.95 }));
      s.box([W + 0.03, 0.02, 0.08], [0, 0.01, 0.015], s.material('#a9a294', { roughness: 0.95 }));
    } else {
      s.box([W, H, 0.016], [0, H / 2 + 0.02, 0], s.material('#7a1f2b', { roughness: 1 }));
      const gilt = s.material('#c79a3a', { metalness: 0.7, roughness: 0.35 });
      for (const x of [-1, 1]) s.box([0.016, H + 0.016, 0.028], [x * W / 2, H / 2 + 0.02, 0.002], gilt);
      for (const y of [0.02, H + 0.02]) s.box([W + 0.016, 0.016, 0.028], [0, y, 0.002], gilt);
      s.box([W + 0.04, 0.02, 0.07], [0, 0.01, 0.02], gilt);
    }
    const face = 0.012;

    const strip = (from: P3, to: P3, width: number) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
      const m = s.box([width, A.distanceTo(B), 0.0012], A.clone().add(B).multiplyScalar(0.5).toArray() as P3, ribbon);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
      return m;
    };
    const nail = (x: number, y: number) => {
      s.rod([x, y, face - 0.004], [x, y + 0.004, face + 0.016], 0.0022, iron);
      s.cylinder(0.006, 0.006, 0.002, [x, y + 0.004, face + 0.017], iron, 10).rotation.x = Math.PI / 2;
    };
    const bow = (x: number, y: number, size: number) => {
      for (const side of [-1, 1]) {
        const loop = s.ring(size, size * 0.28, [x + side * size * 1.05, y + size * 0.2, face + 0.02], ribbon);
        loop.scale.set(1, 0.62, 0.5);
        loop.rotation.z = side * 0.35;
        strip([x, y, face + 0.02], [x + side * size * (0.6 + random() * 0.6), y - size * (2.2 + random()), face + 0.016], size * 0.5);
      }
      s.ball([size * 0.36, size * 0.36, size * 0.3], [x, y, face + 0.022], ribbon, 10);
    };

    const drips: THREE.Mesh[] = [];
    const ear = (x: number, top: number, left: boolean, tilt: number) => {
      const group = new THREE.Group();
      const parts = earGeometries();
      const bend = a.state === 'drooping' ? 0.25 + random() * 0.3 + mood.warmth * 0.2 : 0;
      const all = [...parts.solid, parts.concha];
      for (const geometry of all) {
        geometry.translate(-0.33, -1, 0);
        if (bend) {
          const position = geometry.attributes.position;
          for (let i = 0; i < position.count; i++) {
            const y = position.getY(i), d = -y; // 0 at the top where it hangs, 1 at the lobe
            position.setXYZ(i, position.getX(i) * (1 + d * bend * 0.35) + d * d * bend * 0.12, y * (1 + bend * 0.22), position.getZ(i) * (1 - d * bend * 0.5) + d * d * bend * 0.3);
          }
          geometry.computeVertexNormals();
        }
        const mesh = new THREE.Mesh(geometry, geometry === parts.concha ? hollow : wax);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
      if (dusty) {
        for (let c = 0; c < 2 + Math.floor(random() * 2); c++) {
          let px = -0.2 + random() * 0.35, py = -0.15 - random() * 0.5;
          for (let k = 0; k < 4; k++) {
            const length = 0.07 + random() * 0.1, angle = random() * Math.PI;
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, length, 0.012), crack);
            line.position.set(px, py, 0.135);
            line.rotation.z = angle;
            group.add(line);
            px += -Math.sin(angle) * length * 0.8;
            py += Math.cos(angle) * length * 0.8 * (random() < 0.5 ? 1 : -1);
          }
        }
        if (random() < 0.6) {
          const bite = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), crack);
          bite.position.set(0.25, -0.25 - random() * 0.3, 0.08);
          group.add(bite);
        }
      }
      group.scale.set(left ? -earH : earH, earH, earH);
      group.position.set(x, top, face + 0.012);
      group.rotation.z = tilt;
      s.root.add(group);
      if (bend) {
        const lobeX = x + (left ? 1 : -1) * 0.1 * earH * (1 - bend), lobeY = top - earH * (1 + bend * 0.22) * 0.97;
        for (let k = 0; k < 2; k++) {
          const length = 0.008 + random() * 0.02;
          const dx = (random() - 0.5) * 0.012;
          s.rod([lobeX + dx, lobeY + 0.006, face + 0.02 + bend * 0.02], [lobeX + dx, lobeY - length, face + 0.02 + bend * 0.02], 0.003, wax, 0.0018);
          drips.push(s.ball([0.0032, 0.0045, 0.0032], [lobeX + dx, lobeY - length, face + 0.02 + bend * 0.02], wax, 8));
        }
      }
    };

    const topY = H - 0.02;
    let noteAt: P3 = [W * 0.28, 0.1, face + 0.004];
    if (n === 1) {
      nail(0, topY);
      const earTop = topY - 0.07;
      strip([0, topY, face + 0.018], [-0.004, earTop - 0.004, face + 0.02], 0.008);
      bow(0, topY - 0.004, 0.014);
      ear(-0.006, earTop, random() < 0.5, (random() - 0.5) * 0.25);
      noteAt = [0.055, 0.06, face + 0.004];
    } else if (n === 2) {
      nail(0, topY);
      for (const side of [-1, 1]) {
        const earTop = topY - 0.075 - random() * 0.02;
        const x = side * 0.072;
        strip([0, topY, face + 0.018], [x, earTop - 0.004, face + 0.02], 0.008);
        ear(x, earTop, side > 0, side * -0.12 + (random() - 0.5) * 0.15);
      }
      bow(0, topY - 0.004, 0.015);
      noteAt = [0, 0.055, face + 0.004];
    } else {
      const half = W / 2 - 0.03;
      nail(-half, topY);
      nail(half, topY);
      const sag = 0.03 + random() * 0.015;
      const swag: P3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = mix(-half, half, t);
        swag.push([x, topY - sag * (1 - (2 * t - 1) ** 2), face + 0.018]);
      }
      const cord = s.tube(swag, 0.003, ribbon);
      cord.scale.z = 0.4;
      cord.position.z = (face + 0.018) * 0.6;
      bow(-half, topY - 0.003, 0.011);
      bow(half, topY - 0.003, 0.011);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = mix(-half, half, t);
        const y = topY - sag * (1 - (2 * t - 1) ** 2);
        const drop = 0.02 + random() * 0.03 + (i % 2) * 0.03;
        strip([x, y, face + 0.018], [x, y - drop - 0.004, face + 0.02], 0.006);
        ear(x, y - drop, i % 2 === 0, (random() - 0.5) * 0.35);
      }
      noteAt = [(random() - 0.5) * W * 0.5, 0.055, face + 0.004];
    }

    // What was left with them.
    if (a.note === 'tag') {
      const name = NAMES[Math.floor(random() * NAMES.length)], year = 1921 + Math.floor(random() * 95);
      const map = paint(256, 150, (ctx) => {
        ctx.fillStyle = '#eadfc2';
        ctx.fillRect(0, 0, 256, 150);
        ctx.fillStyle = '#2a2a5a';
        ctx.textAlign = 'center';
        ctx.font = 'italic 54px serif';
        ctx.fillText(name, 128, 66);
        ctx.font = 'italic 44px serif';
        ctx.fillText(String(year), 128, 122);
        ctx.strokeStyle = '#2a2a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 240, 134);
      });
      const tag = s.mesh(new THREE.PlaneGeometry(0.075, 0.044), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), noteAt);
      tag.rotation.z = (random() - 0.5) * 0.4;
      s.cylinder(0.0035, 0.0035, 0.003, [noteAt[0], noteAt[1] + 0.016, noteAt[2] + 0.002], iron, 8).rotation.x = Math.PI / 2;
    } else if (a.note === 'photo') {
      const map = paint(160, 200, (ctx) => {
        ctx.fillStyle = '#efe6d2';
        ctx.fillRect(0, 0, 160, 200);
        ctx.fillStyle = '#9a7a55';
        ctx.fillRect(12, 12, 136, 160);
        ctx.fillStyle = '#3a2a1c';
        ctx.beginPath();
        ctx.ellipse(80, 78, 30, 38, 0, 0, 7);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(80, 185, 62, 62, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#c9a77c';
        ctx.beginPath();
        ctx.ellipse(80, 84, 21, 27, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#efe6d2';
        ctx.fillRect(0, 172, 160, 28);
      });
      const photo = s.mesh(new THREE.PlaneGeometry(0.052, 0.065), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), [noteAt[0], noteAt[1] + 0.012, noteAt[2]]);
      photo.rotation.z = (random() - 0.5) * 0.3;
      s.cylinder(0.003, 0.003, 0.003, [noteAt[0], noteAt[1] + 0.038, noteAt[2] + 0.002], iron, 8).rotation.x = Math.PI / 2;
    } else if (a.note === 'wristband') {
      const nx = n > 2 ? -(W / 2 - 0.03) : 0;
      const band = s.ring(0.03, 0.0012, [nx + 0.012, topY - 0.03, face + 0.03], s.material('#f4f4ef', { roughness: 0.4 }));
      band.scale.set(0.7, 1, 6);
      band.rotation.z = 0.25;
      const label = s.label('ID 0' + Math.floor(1000 + random() * 8999), 0.03, 0.01, [nx + 0.021, topY - 0.058, face + 0.036], '#1c4f9c', '#ffffff');
      label.rotation.z = 0.25 + Math.PI / 2;
    } else if (a.note === 'coins') {
      const coin = s.material('#b98b3e', { metalness: 0.8, roughness: 0.35 });
      for (let i = 0; i < 3 + Math.floor(random() * 4); i++) s.cylinder(0.009, 0.009, 0.0016, [(random() - 0.5) * W * 0.7, 0.021 + (i % 2) * 0.0016, 0.035 + random() * 0.012], i % 3 ? coin : s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 }), 14);
    }

    // A candle stub explains the melting; it also burns low in warm, lively moods.
    let flame: THREE.Mesh | null = null;
    if (a.state === 'drooping' || mood.warmth > 0.7) {
      const cx = n === 2 ? 0.1 : n === 1 ? -0.06 : (random() - 0.5) * W * 0.6;
      const stub = 0.02 + random() * 0.03;
      s.cylinder(0.009, 0.01, stub, [cx, 0.02 + stub / 2, 0.038], new THREE.MeshStandardMaterial({ color: '#efe3c2', roughness: 0.4, emissive: '#e8b060', emissiveIntensity: 0.25 }), 12);
      s.cylinder(0.016, 0.02, 0.003, [cx, 0.0215, 0.038], wax, 12);
      flame = s.ball([0.005, 0.012, 0.005], [cx, 0.02 + stub + 0.014, 0.038], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.2 }), 10);
      flame.castShadow = false;
    }

    return s.finish({
      update: (_dt, time) => {
        if (flame) flame.scale.y = 0.012 * (1 + Math.sin(time * (6 + mood.energy * 14)) * 0.12 * (0.4 + mood.energy));
      },
    });
  },
});

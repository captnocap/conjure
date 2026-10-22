import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const FRUITS = {
  watermelon: 'Red watermelon with a dark-striped green rind and black seeds.',
  yellow: 'Yellow-fleshed watermelon, a surprise inside an ordinary striped rind.',
  cantaloupe: 'Orange cantaloupe with a netted tan rind and a seedy hollow.',
  honeydew: 'Pale green honeydew with a smooth cream rind, cool and mild.',
} as const;
const SPEC: Record<keyof typeof FRUITS, { r: number; long: number; flesh: string; deep: string; pith: string; rind: string; seed: string }> = {
  watermelon: { r: 0.105, long: 1.28, flesh: '#e63a45', deep: '#c81f38', pith: '#eef2d2', rind: '#2f6b33', seed: '#17120f' },
  yellow: { r: 0.105, long: 1.28, flesh: '#f6cf3a', deep: '#eeb21c', pith: '#f2f2d2', rind: '#2f6b33', seed: '#17120f' },
  cantaloupe: { r: 0.078, long: 1.06, flesh: '#f59a45', deep: '#e87a26', pith: '#b9c77a', rind: '#bfae82', seed: '#ecd9a0' },
  honeydew: { r: 0.086, long: 1.14, flesh: '#cfe59a', deep: '#b6d67a', pith: '#e3efb8', rind: '#ece6b0', seed: '#ecd9a0' },
};

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    fruit: choice('What kind of melon is it?', FRUITS),
    cut: choice('How has it been cut?', {
      half: 'Half the melon stands at the back, cut face showing, with wedges fanned out in front.',
      notched: 'A whole melon with one fat wedge cut out and lying beside it: just started.',
      wedges: 'All cut up: a long row of crescent wedges and nothing else.',
      quarters: 'Hacked into big rough quarters, generous and careless.',
    }),
    eaten: score('How much has been eaten?', ['Untouched', 'One wedge has a bite out of it', 'Half the wedges gnawed down', 'Nothing left but rinds']),
    seeds: score('How many seeds have been spat around it?', ['None', 'A few', 'Spat everywhere']),
    board: choice('What is it on?', {
      round: 'A round wooden chopping board.',
      paddle: 'A long wooden paddle board with a handle.',
      newspaper: 'Spread sheets of newspaper, soaked pink.',
      enamel: 'A white enamel tray with a blue rim.',
      slab: 'A thick dark butcher-block slab.',
    }),
    knife: choice('Where is the knife?', {
      lying: 'A big kitchen knife lying on the board, blade wet.',
      stuck: 'Stuck upright in the melon, left mid-cut.',
      cleaver: 'A heavy cleaver lying beside the fruit.',
      pocket: 'A small folding pocket knife, open.',
      none: 'No knife: it was broken open or the knife was taken away.',
    }),
    visitors: choice('What has the sweetness attracted?', {
      nothing: 'Nothing yet.',
      flies: 'A few black flies settled on the flesh.',
      wasps: 'Wasps crawling over it and hovering.',
      ants: 'A line of ants working at the juice.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = SPEC[a.fruit];
    const R = f.r * mix(0.94, 1.06, random()), long = f.long;
    const hollow = a.fruit === 'cantaloupe' || a.fruit === 'honeydew';

    // The cut face: half an ellipse painted rind, pith, flesh and seeds.
    const faceMap = canvasTexture(256, 512, (ctx) => {
      const disc = (radius: number, colour: string) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(0, 256, radius, 0, 7); ctx.fill(); };
      ctx.fillStyle = f.rind; ctx.fillRect(0, 0, 256, 512);
      disc(246, f.pith);
      const flesh = ctx.createRadialGradient(0, 256, 30, 0, 256, 226);
      flesh.addColorStop(0, f.deep); flesh.addColorStop(0.75, f.flesh); flesh.addColorStop(1, new THREE.Color(f.flesh).lerp(new THREE.Color(f.pith), 0.45).getStyle());
      ctx.fillStyle = flesh; ctx.beginPath(); ctx.arc(0, 256, 228, 0, 7); ctx.fill();
      if (hollow) {
        ctx.save(); ctx.translate(0, 256); ctx.scale(0.42, 1);
        ctx.fillStyle = new THREE.Color(f.deep).offsetHSL(0, 0, -0.1).getStyle(); ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7); ctx.fill(); ctx.restore();
        for (let i = 0; i < 46; i++) { ctx.fillStyle = f.seed; ctx.beginPath(); ctx.ellipse(random() * 52, 256 + (random() - 0.5) * 250, 7, 3.5, random() * 3, 0, 7); ctx.fill(); }
      } else {
        for (const [ring, count] of [[150, 13], [100, 8]] as const)
          for (let i = 0; i < count; i++) {
            const angle = -1.35 + (i + random() * 0.6) * (2.7 / count), r = ring + (random() - 0.5) * 34;
            ctx.save(); ctx.translate(Math.cos(angle) * r, 256 + Math.sin(angle) * r); ctx.rotate(angle);
            ctx.fillStyle = f.seed; ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, 7); ctx.fill(); ctx.restore();
          }
      }
    });
    const face = new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.32, side: THREE.DoubleSide });
    const rindPaint = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = f.rind; ctx.fillRect(0, 0, 512, 256);
      if (!hollow) {
        for (let i = 0; i < 12; i++) {
          ctx.strokeStyle = '#163d22'; ctx.lineWidth = 12 + random() * 12; ctx.beginPath();
          const x = (i + 0.5) * (512 / 12);
          for (let y = 0; y <= 256; y += 8) ctx.lineTo(x + Math.sin(y * 0.11 + i * 2) * 7 + (random() - 0.5) * 5, y);
          ctx.stroke();
        }
      } else if (a.fruit === 'cantaloupe') {
        ctx.strokeStyle = '#e9dfbd'; ctx.lineWidth = 2.2;
        for (let i = 0; i < 260; i++) { const x = random() * 512, y = random() * 256; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 44); ctx.stroke(); }
        ctx.strokeStyle = '#7f9a55'; ctx.lineWidth = 4;
        for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * 51.2, 0); ctx.lineTo(i * 51.2, 256); ctx.stroke(); }
      }
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = 'rgba(190,170,90,0.5)'; ctx.beginPath(); ctx.ellipse(random() * 512, 60 + random() * 140, 6 + random() * 22, 4 + random() * 10, 0, 0, 7); ctx.fill(); }
    };
    const rindMap = canvasTexture(512, 256, rindPaint);
    const inner = new THREE.MeshStandardMaterial({ color: f.pith, roughness: 0.5, side: THREE.DoubleSide });

    const faceGeometry = (eaten: number) => {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 40; i++) { const t = -Math.PI / 2 + (i / 40) * Math.PI; points.push(new THREE.Vector2(Math.cos(t) * R, Math.sin(t) * R * long)); }
      const rb = eaten * R * 0.98, offset = (random() - 0.5) * 0.5 * (1 - eaten);
      for (let i = 1; i < 60; i++) {
        const y = R * long * (1 - (2 * i) / 60), yn = y / (R * long);
        let x = 0;
        for (const c of [-1, 0, 1]) { const d = (yn - offset - c * eaten * 0.62) * R; x = Math.max(x, Math.sqrt(Math.max(0, rb * rb - d * d))); }
        // Teeth marks along the bitten edge.
        if (x > 0) x += Math.abs(Math.sin(yn * 26)) * R * 0.035;
        const limit = Math.abs(yn) < 0.83 ? 0.83 * R * Math.sqrt(1 - (yn / 0.83) ** 2) : 0;
        points.push(new THREE.Vector2(Math.min(x, limit), y));
      }
      const geometry = new THREE.ShapeGeometry(new THREE.Shape(points));
      const pos = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / R, (pos.getY(i) / (R * long) + 1) / 2);
      return geometry;
    };
    /** A slice of melon spanning `arc` radians about its long axis, eaten from the thin edge inward. */
    const piece = (arc: number, eaten = 0) => {
      const group = new THREE.Group();
      const map = rindMap.clone();
      map.repeat.set(arc / (Math.PI * 2), 1); map.offset.x = random();
      const skin = new THREE.Mesh(new THREE.SphereGeometry(R, Math.max(6, Math.round(arc * 8)), 20, 0, arc), new THREE.MeshStandardMaterial({ map, roughness: 0.45, side: THREE.DoubleSide }));
      skin.scale.y = long;
      group.add(skin);
      if (arc < Math.PI * 1.99) {
        const geometry = faceGeometry(eaten);
        for (const phi of [0, arc]) { const cut = new THREE.Mesh(geometry, face); cut.rotation.y = phi + Math.PI; group.add(cut); }
        if (eaten > 0.02) {
          const lining = new THREE.Mesh(new THREE.SphereGeometry(R * 0.93, 6, 16, 0, arc), inner);
          lining.scale.y = long;
          group.add(lining);
        }
      }
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      return group;
    };
    /** Lay a piece on one cut face: rind toward -x, long axis along z. */
    const laid = (arc: number, eaten: number, x: number, z: number, turn: number, tilt = 0) => {
      const holder = new THREE.Group(), tip = new THREE.Group();
      const body = piece(arc, eaten);
      body.rotation.x = -Math.PI / 2;
      tip.add(body);
      tip.rotation.z = -tilt;
      holder.add(tip);
      holder.position.set(x, 0, z);
      holder.rotation.y = turn;
      s.root.add(holder);
      return holder;
    };
    /** Stand a big piece with its opening tipped up toward the viewer. */
    const standing = (arc: number, x: number, z: number, lean: number, turn: number) => {
      const outer = new THREE.Group(), mid = new THREE.Group();
      const body = piece(arc);
      body.rotation.y = Math.PI / 2 - arc / 2;
      mid.rotation.z = Math.PI / 2;
      mid.add(body);
      outer.rotation.order = 'YXZ';
      outer.rotation.set(lean, turn, 0);
      outer.add(mid);
      outer.position.set(x, R, z);
      s.root.add(outer);
      return outer;
    };

    const wedgeArc = 0.52;
    const spots: THREE.Vector3[] = [];
    let extent = { x: 0.3, z: 0.25 }, knifeTop: THREE.Vector3 | null = null;
    const row = (count: number, cx: number, cz: number) => {
      for (let i = 0; i < count; i++) {
        const order = count - 1 - i;
        const eaten = clamp01(a.eaten * 3 * Math.max(1, count / 3) - order * 1.0) ** 1.5;
        const x = cx + (i - (count - 1) / 2) * R * 0.66 + R * 0.5;
        const gnawed = eaten > 0.8;
        laid(wedgeArc, eaten, x + (gnawed ? (random() - 0.5) * 0.04 : 0), cz + (random() - 0.5) * 0.02 + (gnawed ? (random() - 0.5) * 0.06 : 0), (random() - 0.5) * (gnawed ? 1.2 : 0.16), i === 0 ? 0 : 0.2);
        spots.push(new THREE.Vector3(x - R * 0.45, R * 0.3, cz + (random() - 0.5) * R));
      }
    };
    if (a.cut === 'half') {
      standing(Math.PI, -R * 0.1, -R * 0.95, 2.5, (random() - 0.5) * 0.3);
      row(3 + Math.floor(mood.density * 2.99), 0, R * 1.05);
      spots.push(new THREE.Vector3(-R * 0.3, R * 1.75, -R * 0.75), new THREE.Vector3(R * 0.5, R * 1.7, -R * 0.75));
      knifeTop = new THREE.Vector3(R * 0.3, R * 1.55, -R * 0.75);
      extent = { x: R * 3.4, z: R * 5 };
    } else if (a.cut === 'notched') {
      standing(Math.PI * 2 - 1.15, -R * 0.5, -R * 0.4, 2.05, 0.25 + (random() - 0.5) * 0.3);
      laid(1.15, clamp01(a.eaten * 1.4 - 0.15), R * 1.5, R * 0.9, -0.5 + random() * 0.3);
      spots.push(new THREE.Vector3(R * 1.3, R * 0.4, R * 0.9), new THREE.Vector3(-R * 0.5, R * 1.9, -R * 0.1));
      knifeTop = new THREE.Vector3(-R * 0.2, R * 1.9, -R * 0.4);
      extent = { x: R * 4.6, z: R * 4 };
    } else if (a.cut === 'wedges') {
      const count = 4 + Math.floor(mood.density * 3.99);
      row(count, 0, 0);
      extent = { x: R * (count * 0.66 + 1.4), z: R * 3.4 };
    } else {
      laid(Math.PI / 2, 0, -R * 0.3, -R * 0.9, Math.PI / 2 + (random() - 0.5) * 0.4);
      laid(Math.PI / 2, 0, R * 1.5, -R * 0.2, -0.35 + (random() - 0.5) * 0.4);
      row(2, -R * 0.6, R * 1.5);
      spots.push(new THREE.Vector3(-R * 0.3, R * 1.02, -R * 0.5), new THREE.Vector3(R * 1.1, R * 1.02, -R * 0.2));
      knifeTop = new THREE.Vector3(-R * 0.3, R * 0.9, -R * 0.6);
      extent = { x: R * 4.6, z: R * 5.2 };
    }

    // What it sits on.
    const wood = (base: string) => new THREE.MeshStandardMaterial({ roughness: 0.7, map: canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(60,35,15,${0.06 + random() * 0.14})`; ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); const y = random() * 256; ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + (random() - 0.5) * 16, 170, y + (random() - 0.5) * 16, 256, y); ctx.stroke(); }
      for (let i = 0; i < 10 + mood.wear * 50; i++) { ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); const x = random() * 256, y = random() * 256; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 90); ctx.stroke(); }
    }) });
    const fruitBox = new THREE.Box3().setFromObject(s.root);
    const knifeRoom = a.knife === 'none' || (a.knife === 'stuck' && knifeTop) ? 0 : a.knife === 'cleaver' ? 0.1 : 0.06;
    const cx = (fruitBox.min.x + fruitBox.max.x) / 2, cz = (fruitBox.min.z + fruitBox.max.z) / 2 + knifeRoom / 2;
    const half = { x: Math.max(0.17, (fruitBox.max.x - fruitBox.min.x) / 2 + 0.03), z: (fruitBox.max.z - fruitBox.min.z) / 2 + 0.035 + knifeRoom / 2 };
    extent = { x: half.x * 2 - 0.04, z: half.z * 2 - 0.04 };
    if (a.board === 'round') s.cylinder(Math.max(half.x, half.z), Math.max(half.x, half.z) - 0.004, 0.018, [cx, -0.009, cz], wood('#c99a62'), 48);
    else if (a.board === 'paddle') {
      const paint = wood('#b98552');
      s.box([half.x * 2, 0.018, half.z * 2], [cx, -0.009, cz], paint);
      s.box([0.12, 0.018, 0.045], [cx + half.x + 0.06, -0.009, cz], paint);
      s.cylinder(0.011, 0.011, 0.019, [cx + half.x + 0.09, -0.009, cz], s.material('#2a2018'), 12);
    } else if (a.board === 'slab') s.box([half.x * 2, 0.045, half.z * 2], [cx, -0.0225, cz], wood('#5a3a26'));
    else if (a.board === 'enamel') {
      s.box([half.x * 2 + 0.03, 0.01, half.z * 2 + 0.03], [cx, -0.005, cz], s.material('#f4f2ea', { roughness: 0.25 }));
      const rim = s.material('#27468a', { roughness: 0.3 });
      for (const side of [-1, 1]) {
        s.box([half.x * 2 + 0.05, 0.016, 0.012], [cx, 0, cz + side * (half.z + 0.02)], rim);
        s.box([0.012, 0.016, half.z * 2 + 0.05], [cx + side * (half.x + 0.02), 0, cz], rim);
      }
    } else {
      const sheet = () => new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#e4dfcf'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#2b2a28'; ctx.fillRect(12, 12, 232, 22);
        for (let column = 0; column < 4; column++) for (let line = 0; line < 34; line++) if (random() > 0.08) { ctx.fillStyle = `rgba(50,48,45,${0.45 + random() * 0.3})`; ctx.fillRect(12 + column * 59, 46 + line * 6, 30 + random() * 22, 2.5); }
        ctx.fillStyle = '#8f8c84'; ctx.fillRect(130, 120, 110, 70);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(230,70,90,${0.18 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 20 + random() * 50, 15 + random() * 40, random() * 3, 0, 7); ctx.fill(); }
      }) });
      for (let i = 0; i < 2; i++) s.box([half.x * 2 + 0.06, 0.002, half.z * 2 + 0.06], [cx + (i - 0.5) * 0.04, -0.001 - i * 0.002, cz + (i - 0.5) * 0.03], sheet()).rotation.y = (random() - 0.5) * 0.3 + i * 0.25;
    }

    // Juice.
    const juice = new THREE.MeshStandardMaterial({ color: new THREE.Color(f.flesh).lerp(new THREE.Color('#ffffff'), 0.25), roughness: 0.05, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 2 + a.eaten * 6 + mood.wear * 4; i++) {
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.0012, 16), juice);
      pool.scale.set(0.012 + random() * 0.03, 1, 0.01 + random() * 0.025);
      pool.position.set(cx + (random() - 0.5) * extent.x * 0.9, 0.001, cz + (random() - 0.5) * extent.z * 0.9);
      pool.receiveShadow = true;
      s.root.add(pool);
    }
    // Spat seeds.
    if (!hollow || a.seeds > 0.5) {
      const count = Math.round(a.seeds * a.seeds * 70 + a.seeds * 8);
      const seeds = Array.from({ length: count }, () => {
        const far = random() < 0.3;
        return { x: cx + (random() - 0.5) * extent.x * (far ? 1.15 : 1), z: far ? half.z + 0.01 + random() * 0.06 : (random() - 0.5) * extent.z, turn: random() * 6.28 };
      });
      if (count) {
        const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: f.seed, roughness: 0.25 }), count);
        const dummy = new THREE.Object3D();
        seeds.forEach((seed, i) => {
          dummy.position.set(seed.x, Math.abs(seed.z) > half.z || Math.abs(seed.x - cx) > half.x ? (a.board === 'slab' ? -0.043 : a.board === 'newspaper' ? -0.003 : -0.016) : 0.002, cz + seed.z);
          dummy.rotation.y = seed.turn; dummy.scale.set(0.0062, 0.0022, 0.0038); dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.castShadow = true;
        s.root.add(mesh);
      }
    }

    // The knife.
    if (a.knife !== 'none') {
      const knife = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: '#d5d9da', metalness: 0.9, roughness: 0.22, side: THREE.DoubleSide });
      const grip = s.material(a.knife === 'pocket' ? '#a4322a' : '#2b2019', { roughness: 0.55 });
      const scale = a.knife === 'pocket' ? 0.5 : 1;
      const blade = new THREE.Shape();
      if (a.knife === 'cleaver') { blade.moveTo(0, 0.012); blade.lineTo(0.17, 0.012); blade.lineTo(0.17, -0.07); blade.lineTo(0.005, -0.07); blade.lineTo(0, -0.05); }
      else { blade.moveTo(0, 0.012); blade.lineTo(0.14, 0.008); blade.quadraticCurveTo(0.2, 0.002, 0.215, -0.012); blade.quadraticCurveTo(0.12, -0.034, 0, -0.03); }
      const bladeMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.002, bevelEnabled: false }), steel);
      bladeMesh.position.z = -0.001;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.016), grip);
      handle.position.set(-0.055, -0.004, 0);
      knife.add(bladeMesh, handle);
      for (const x of [-0.025, -0.055, -0.085]) { const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.018, 8), steel); rivet.rotation.x = Math.PI / 2; rivet.position.set(x, -0.004, 0); knife.add(rivet); }
      knife.traverse((node) => { node.castShadow = true; });
      knife.scale.setScalar(scale);
      if (a.knife === 'stuck' && knifeTop) {
        knife.rotation.set(0, 0.5, -Math.PI / 2 + 0.12);
        knife.position.copy(knifeTop).add(new THREE.Vector3(0, 0.1, 0));
      } else {
        knife.rotation.set(Math.PI / 2, 0, 0.25 + random() * 0.5);
        knife.position.set(cx + half.x - 0.2 * scale - 0.01, 0.009 * scale, cz + half.z - (a.knife === 'cleaver' ? 0.03 : 0.035));
        knife.rotation.z = 0.05 + random() * 0.2;
      }
      s.root.add(knife);
    }

    // Visitors.
    const fliers: { node: THREE.Object3D; home: THREE.Vector3; phase: number }[] = [];
    if (a.visitors !== 'nothing') {
      const dark = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 0.4 });
      const yellow = new THREE.MeshStandardMaterial({ color: '#edbb18', roughness: 0.4 });
      const wing = new THREE.MeshStandardMaterial({ color: '#eef3f4', roughness: 0.2, side: THREE.DoubleSide });
      const bug = (kind: 'flies' | 'wasps' | 'ants') => {
        const g = new THREE.Group();
        const parts = kind === 'ants' ? 3 : kind === 'wasps' ? 4 : 2;
        for (let i = 0; i < parts; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(kind === 'wasps' ? 0.004 : 0.003, 6, 5), kind === 'wasps' && i % 2 ? yellow : dark); m.position.x = i * (kind === 'wasps' ? 0.0048 : 0.0042); m.castShadow = true; g.add(m); }
        if (kind !== 'ants') for (const side of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.006, 6), wing); w.scale.y = 0.45; w.position.set(0.004, 0.004, side * 0.005); w.rotation.x = side * 1.2; g.add(w); }
        g.rotation.y = random() * 6.28;
        return g;
      };
      if (a.visitors === 'ants') {
        const count = 16 + Math.floor(mood.density * 20);
        for (let i = 0; i < count; i++) {
          const t = i / count, ant = bug('ants');
          ant.position.set(cx + half.x * 0.95 - t * half.x * 1.3 + (random() - 0.5) * 0.012, 0.003, cz + half.z * (0.9 - t * 0.9) + Math.sin(t * 9) * 0.02);
          ant.rotation.y = 0.5 + Math.cos(t * 9) * 0.5;
          ant.scale.setScalar(1.25);
          s.root.add(ant);
        }
      } else {
        const count = (a.visitors === 'wasps' ? 5 : 4) + Math.floor(mood.density * 5);
        for (let i = 0; i < count; i++) {
          const b = bug(a.visitors);
          b.scale.setScalar(1.5);
          const home = spots.length ? spots[i % spots.length].clone() : new THREE.Vector3(0, 0.05, 0);
          home.x += (random() - 0.5) * 0.03; home.z += (random() - 0.5) * 0.03;
          const flying = a.visitors === 'wasps' && i % 2 === 1;
          if (flying) { home.y += 0.05 + random() * 0.08; fliers.push({ node: b, home, phase: random() * 6 }); }
          b.position.copy(home);
          s.root.add(b);
        }
      }
    }
    const speed = mix(1.5, 7, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const flier of fliers) flier.node.position.set(flier.home.x + Math.sin(time * speed + flier.phase) * 0.015, flier.home.y + Math.sin(time * speed * 1.4 + flier.phase) * 0.008, flier.home.z + Math.cos(time * speed + flier.phase) * 0.015); },
    });
  },
});

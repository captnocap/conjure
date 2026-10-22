import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

const TARS = {
  black: 'Freshly tarred, near black and faintly glossy.',
  brown: 'Sun-baked tar gone a deep warm brown.',
  silver: 'Untarred for decades: weathered silver-grey wood.',
  ochre: 'Painted red ochre in a later century, tar showing through.',
} as const;
const TAR: Record<keyof typeof TARS, string> = { black: '#2a211c', brown: '#5a3a26', silver: '#8b8780', ochre: '#8a3a26' };

function paint(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('How elaborate is the church?', {
      chapel: 'A small single-roofed chapel with one ridge turret, humble and remote.',
      double: 'A nave with a covered walkway around it: two tiers of roof.',
      cascade: 'The full cascade, roof upon roof upon roof like a pagoda of the north.',
    }),
    tar: choice('What colour is the timber?', TARS),
    finials: choice('What rears from the gable peaks?', {
      dragons: 'Carved dragon heads with open jaws, straight off a longship.',
      crosses: 'Plain wooden crosses, the dragons long since taken down.',
      both: 'Dragons on the high gables and crosses on the low ones, the old and new faith sharing a roof.',
      stumps: 'Only broken stumps where something used to be.',
    }),
    spire: choice('What crowns the ridge?', {
      needle: 'A tall thin shingled needle spire.',
      squat: 'A short blunt pyramid cap.',
      leaning: 'A needle spire that has begun to lean out of true.',
      lost: 'Nothing: the spire came down in a storm and the turret is capped with boards.',
    }),
    portal: choice('What is the west door like?', {
      carved: 'A pale carved portal of twisting vines and beasts around a narrow door.',
      red: 'A plain door painted ox-blood red.',
      open: 'The door stands open on a warm candle-lit dark.',
      barred: 'Boarded over with crossed planks.',
    }),
    moment: choice('What is happening here?', {
      empty: 'Nothing. It stands alone and silent.',
      service: 'A service: the small windows glow and lanterns line the path.',
      burial: 'A fresh grave has been dug beside it, with a spade and a new wooden cross.',
      wedding: 'A wedding: birch saplings and pennants dress the porch.',
      ravens: 'Ravens have settled along the ridges.',
    }),
    yard: noul('Is it ringed by a dry-stone wall with leaning grave markers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const snowy = mood.warmth < 0.25;
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const tar = new THREE.Color(TAR[a.tar]);

    const staveTex = paint((ctx) => {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `#${tar.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06).getHexString()}`;
        ctx.fillRect(i * 32, 0, 32, 256);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(i * 32, 0, 3, 256);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(i * 32 + 4, 0, 3, 256);
      }
      for (let i = 0; i < wear * 60; i++) {
        ctx.fillStyle = 'rgba(160,155,145,0.35)';
        ctx.fillRect(random() * 256, random() * 256, 5 + random() * 12, 20 + random() * 60);
      }
    });
    const roofBase = tar.clone().offsetHSL(0.01, -0.05, a.tar === 'black' ? 0.05 : -0.04);
    const shingleTex = paint((ctx) => {
      ctx.fillStyle = `#${roofBase.clone().multiplyScalar(0.5).getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      for (let row = 8; row >= 0; row--)
        for (let col = -1; col < 8; col++) {
          const missing = random() < wear * 0.07;
          ctx.fillStyle = missing ? `#${roofBase.clone().multiplyScalar(0.55).getHexString()}` : `#${roofBase.clone().offsetHSL(0, 0, (random() - 0.5) * 0.09).getHexString()}`;
          const x = col * 32 + (row % 2) * 16, y = 256 - row * 32;
          ctx.beginPath();
          ctx.moveTo(x + 1, y - 32);
          ctx.lineTo(x + 31, y - 32);
          ctx.lineTo(x + 31, y - 10);
          ctx.lineTo(x + 16, y);
          ctx.lineTo(x + 1, y - 10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
    });
    const wallMat = (u: number, v: number) => { const map = staveTex.clone(); map.repeat.set(u / 1.6, v / 1.6); return new THREE.MeshStandardMaterial({ map, roughness: a.tar === 'black' ? 0.6 : 0.9 }); };
    const roofMat = (u: number, v: number) => { const map = shingleTex.clone(); map.repeat.set(Math.max(1, Math.round(u / 1.5)), Math.max(1, Math.round(v / 1.5))); return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide }); };
    const beam = s.material(tar.clone().multiplyScalar(0.8), { roughness: 0.8 });
    const snow = s.material('#f3f5f7', { roughness: 1 });
    const glowOn = a.moment === 'service' || a.portal === 'open';
    const glow = s.material('#f6c56a', { emissive: '#f2a53c', emissiveIntensity: mix(0.9, 2.4, dusk), roughness: 0.4 });
    const dead = s.material('#0e0c0b', { roughness: 1 });

    const dragonAt = (x: number, y: number, z: number, facing: number, scale: number) => {
      const group = new THREE.Group();
      const neck = new THREE.CatmullRomCurve3([[0, -0.2, -0.3], [0, 0.25, 0.25], [0, 0.85, 0.5], [0, 1.25, 0.95], [0, 1.2, 1.4]].map((p) => new THREE.Vector3(...p)));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 20, 0.11, 6), beam));
      const upper = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), beam);
      upper.rotation.x = Math.PI / 2 - 0.25;
      upper.position.set(0, 1.27, 1.7);
      const lower = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 5), beam);
      lower.rotation.x = Math.PI / 2 + 0.45;
      lower.position.set(0, 1.02, 1.6);
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.6, 4), s.material('#9c2a1e'));
      tongue.rotation.x = Math.PI / 2 + 0.1;
      tongue.position.set(0, 1.13, 1.78);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 4), beam);
      crest.position.set(0, 1.5, 1.25);
      crest.rotation.x = -0.6;
      group.add(upper, lower, tongue, crest);
      group.position.set(x, y, z);
      group.rotation.y = facing;
      group.scale.setScalar(scale);
      group.traverse((node) => { node.castShadow = true; });
      s.root.add(group);
    };
    const crossAt = (x: number, y: number, z: number, scale: number) => {
      s.box([0.09 * scale, 1.1 * scale, 0.09 * scale], [x, y + 0.5 * scale, z], beam);
      s.box([0.6 * scale, 0.09 * scale, 0.09 * scale], [x, y + 0.72 * scale, z], beam);
    };
    const finial = (x: number, y: number, z: number, facing: number, scale: number, high: boolean) => {
      const kind = a.finials === 'both' ? (high ? 'dragons' : 'crosses') : a.finials;
      if (kind === 'dragons') dragonAt(x, y, z, facing, scale);
      else if (kind === 'crosses') crossAt(x, y, z, scale * 1.1);
      else s.rod([x, y - 0.1, z], [x + (random() - 0.5) * 0.1, y + 0.3 * scale, z], 0.07 * scale, beam);
    };

    const ridges: { y: number; z0: number; z1: number }[] = [];
    /** A steep gable roof running along z, with both end triangles. */
    const gable = (w: number, l: number, rise: number, y: number, z: number, fin: null | { scale: number; high: boolean; ends: number[] }) => {
      const slope = Math.atan2(rise, w / 2), over = 0.3;
      const run = Math.hypot(w / 2, rise) + over;
      const mat = roofMat(l + 0.6, run);
      for (const side of [-1, 1]) {
        const slab = s.box([run, 0.1, l + 0.6], [side * Math.cos(slope) * run / 2, y + rise - Math.sin(slope) * run / 2 + 0.05, z], mat);
        slab.rotation.z = -side * slope;
        if (snowy) {
          const cover = run * 0.6;
          const cap = s.box([cover, 0.1, l + 0.5], [side * Math.cos(slope) * (cover / 2 + 0.2), y + rise - Math.sin(slope) * (cover / 2 + 0.2) + 0.13, z], snow);
          cap.rotation.z = -side * slope;
        }
      }
      (mat.map as THREE.Texture).rotation = Math.PI / 2;
      const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
      const endMat = wallMat(1.6, 1.6);
      (endMat.map as THREE.Texture).repeat.set(1 / 1.6, 1 / 1.6);
      for (const end of [-1, 1]) s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), endMat, [0, y, z + end * (l / 2 - 0.05) - 0.05]);
      s.rod([0, y + rise + 0.08, z - l / 2 - 0.3], [0, y + rise + 0.08, z + l / 2 + 0.3], 0.07, beam);
      if (fin) for (const end of fin.ends) finial(0, y + rise + 0.05, z + end * (l / 2 + 0.25), end > 0 ? 0 : Math.PI, fin.scale, fin.high);
      ridges.push({ y: y + rise + 0.15, z0: z - l / 2, z1: z + l / 2 });
    };
    /** Four walls. */
    const walls = (w: number, l: number, h: number, y: number, z: number) => {
      s.box([w, h, l], [0, y + h / 2, z], [wallMat(l, h), wallMat(l, h), dead, dead, wallMat(w, h), wallMat(w, h)] as unknown as THREE.Material);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.cylinder(0.14, 0.16, h, [sx * w / 2, y + h / 2, z + sz * l / 2], beam, 8);
    };
    /** A pent roof skirting a core: wide at the eaves, rising to meet the wall above. */
    const skirt = (w: number, l: number, k: number, rise: number, y: number, z: number) => {
      const geometry = new THREE.CylinderGeometry(k * Math.SQRT1_2, Math.SQRT1_2 * 1.06, rise, 4, 1, true);
      geometry.rotateY(Math.PI / 4);
      const mesh = s.mesh(geometry, roofMat((w + l) * 2, Math.hypot(rise, (w * (1 - k)) / 2)), [0, y + rise / 2, z]);
      mesh.scale.set(w, 1, l);
      if (snowy) {
        const cap = new THREE.CylinderGeometry(k * Math.SQRT1_2 * 1.04, Math.SQRT1_2 * (k + (1.06 - k) * 0.55), rise * 0.55, 4, 1, true);
        cap.rotateY(Math.PI / 4);
        const white = s.mesh(cap, new THREE.MeshStandardMaterial({ color: '#f3f5f7', roughness: 1, side: THREE.DoubleSide }), [0, y + rise * 0.725 + 0.08, z]);
        white.scale.set(w, 1, l);
      }
    };

    // The body, bottom to top.
    const big = a.form === 'chapel' ? 0.78 : 1;
    const nw = 5.6 * big, nl = 7.6 * big;
    let y = 0.3;
    s.box([nw * (a.form === 'chapel' ? 1.08 : 1.62), 0.3, nl * (a.form === 'chapel' ? 1.06 : 1.62)], [0, 0.15, 0], s.material('#84847f', { roughness: 1 }));
    if (a.form !== 'chapel') {
      const k = 1 / 1.55;
      walls(nw * 1.55, nl * 1.55, 1.7, y, 0);
      // The open arcade of the walkway: a pale band of small arches.
      for (const sx of [-1, 1]) s.box([0.06, 0.45, nl * 1.5], [sx * (nw * 1.55 / 2 + 0.01), y + 1.35, 0], dead);
      y += 1.7;
      skirt(nw * 1.55, nl * 1.55, k, 3, y, 0);
      y += 3;
      if (a.form === 'cascade') {
        walls(nw, nl, 0.9, y - 0.2, 0);
        y += 0.7;
        skirt(nw * 1.04, nl * 1.04, 0.74, 2.5, y, 0);
        y += 2.5;
        walls(nw * 0.74, nl * 0.74, 1.1, y - 0.2, 0);
      } else walls(nw, nl, 1.6, y - 0.2, 0);
    } else walls(nw, nl, 3.1, y, 0);
    const coreW = a.form === 'cascade' ? nw * 0.74 : nw, coreL = a.form === 'cascade' ? nl * 0.74 : nl;
    y += a.form === 'chapel' ? 3.1 : a.form === 'cascade' ? 0.9 : 1.4;
    // Small windows high in the nave wall.
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) s.cylinder(0.14, 0.14, 0.08, [sx * (coreW / 2 + 0.01), y - 0.45, (i - 1.5) * coreL * 0.22], glowOn ? glow : dead, 10).rotation.z = Math.PI / 2;
    const rise = coreW * 0.86;
    gable(coreW, coreL, rise, y, 0, { scale: 1.7, high: true, ends: [-1, 1] });
    const ridge = y + rise;

    // Ridge turret and spire.
    const tw = coreW * 0.3;
    walls(tw, tw * 1.25, 1.5, ridge - 0.9, 0);
    gable(tw + 0.2, tw * 1.25 + 0.2, tw * 0.95, ridge + 0.6, 0, a.form === 'chapel' ? null : { scale: 0.9, high: true, ends: [-1, 1] });
    const top = ridge + 0.6 + tw * 0.95;
    const spireMat = roofMat(4, 5);
    if (a.spire === 'lost') {
      s.box([tw * 0.7, 0.14, tw * 0.7], [0, top + 0.02, 0], s.material('#b9a47c'));
      s.rod([0.1, top, 0], [0.25, top + 0.55, 0.1], 0.05, beam);
    } else {
      const height = a.spire === 'squat' ? 1.6 : mix(4.2, 5.4, random());
      const pivot = new THREE.Group();
      pivot.position.set(0, top - 0.6, 0);
      const box = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.62, 1.1, tw * 0.62), wallMat(1, 1));
      box.position.y = 0.55;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(tw * (a.spire === 'squat' ? 0.62 : 0.5), height, 8), spireMat);
      cone.position.y = 1.1 + height / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), beam);
      post.position.y = 1.1 + height + 0.4;
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.04), s.material('#b8963a', { metalness: 0.7, roughness: 0.4 }));
      vane.position.y = 1.1 + height + 0.55;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), vane.material);
      ball.position.y = 1.1 + height + 0.05;
      pivot.add(box, cone, post, vane, ball);
      if (a.spire === 'leaning') pivot.rotation.set(0.05, 0, mix(0.1, 0.2, random()) * (random() < 0.5 ? -1 : 1));
      else pivot.rotation.z = (random() - 0.5) * wear * 0.08;
      pivot.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(pivot);
    }

    // Chancel and round apse behind.
    const outer = a.form === 'chapel' ? nl / 2 : nl * 1.55 / 2;
    const cw = nw * 0.62, cl = 3.2 * big, ch = a.form === 'chapel' ? 2.4 : 3.6;
    walls(cw, cl, ch, 0.3, -outer - cl / 2 + 0.3);
    gable(cw, cl, cw * 0.8, 0.3 + ch, -outer - cl / 2 + 0.3, { scale: 1.1, high: false, ends: [-1] });
    const az = -outer - cl + 0.3;
    s.cylinder(cw * 0.42, cw * 0.42, ch * 0.8, [0, 0.3 + ch * 0.4, az], wallMat(6, ch * 0.8), 14);
    s.mesh(new THREE.ConeGeometry(cw * 0.5, cw * 0.9, 12), roofMat(6, 2), [0, 0.3 + ch * 0.8 + cw * 0.45, az]);
    if (snowy) s.mesh(new THREE.ConeGeometry(cw * 0.3, cw * 0.55, 12), snow, [0, 0.3 + ch * 0.8 + cw * 0.66, az]);

    // West porch and door.
    const pz = outer + 0.9;
    const pw = 2.3 * big, ph = 2.3;
    walls(pw, 1.8, ph, 0.3, pz);
    gable(pw + 0.2, 2, pw * 0.8, 0.3 + ph, pz, { scale: 0.9, high: false, ends: [1] });
    const dz = pz + 0.92, dw = 0.95, dh = 1.95;
    if (a.portal === 'carved') {
      const carved = paint((ctx) => {
        ctx.fillStyle = '#b89b6c';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#5c4326';
        ctx.lineWidth = 7;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          for (let t = 0; t <= 40; t++) {
            const yy = (t / 40) * 256;
            const xx = 20 + i * 27 + Math.sin(yy * 0.07 + i * 1.7) * 14;
            if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
      });
      s.box([dw + 0.8, dh + 0.5, 0.08], [0, 0.3 + (dh + 0.5) / 2, dz], new THREE.MeshStandardMaterial({ map: carved, roughness: 0.8 }));
    }
    const doorMat = a.portal === 'open' ? glow : a.portal === 'red' ? s.material('#7a1f1a') : a.portal === 'carved' ? s.material('#3a2a1e') : beam;
    s.box([dw, dh, 0.06], [0, 0.3 + dh / 2, dz + 0.04], doorMat);
    s.cylinder(dw / 2, dw / 2, 0.06, [0, 0.3 + dh, dz + 0.04], doorMat, 16).rotation.x = Math.PI / 2;
    if (a.portal === 'open') {
      const leaf = s.box([dw, dh + 0.3, 0.06], [dw * 0.95, 0.3 + dh / 2 + 0.15, dz + 0.4], beam);
      leaf.rotation.y = 1.2;
    }
    if (a.portal === 'barred') for (const turn of [-0.5, 0.5]) s.box([1.9, 0.16, 0.05], [0, 0.3 + dh * 0.55, dz + 0.1], s.material('#b3a07c')).rotation.z = turn;
    for (let i = 0; i < 3; i++) s.box([pw - 0.2 + i * 0.3, 0.1, 0.5 + i * 0.3], [0, 0.25 - i * 0.1, dz + 0.25 + i * 0.15], s.material('#8b8b86', { roughness: 1 }));

    // What is happening.
    const pathZ = dz + 1.1;
    if (a.moment === 'service') {
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++)
        for (const sx of [-1, 1]) {
          const z = pathZ + i * 1.05;
          s.rod([sx * 0.9, 0, z], [sx * 0.9, 0.8, z], 0.025, beam);
          s.box([0.16, 0.2, 0.16], [sx * 0.9, 0.9, z], glow);
          s.mesh(new THREE.ConeGeometry(0.15, 0.12, 4), beam, [sx * 0.9, 1.06, z]);
        }
    } else if (a.moment === 'burial') {
      const gx = nw * 1.1 + 0.6;
      s.ball([0.55, 0.3, 1.1], [gx, 0.02, outer * 0.3], s.material('#4a3a2c', { roughness: 1 }), 12);
      s.box([0.8, 0.05, 1.9], [gx + 1.2, 0.02, outer * 0.3], dead);
      crossAt(gx + 1.2, 0, outer * 0.3 - 1.15, 1);
      s.rod([gx + 0.3, 0.25, outer * 0.3 + 0.6], [gx + 0.15, 1.45, outer * 0.3 + 0.75], 0.025, s.material('#c0a377'));
      s.box([0.2, 0.3, 0.03], [gx + 0.31, 0.18, outer * 0.3 + 0.59], s.material('#777c80', { metalness: 0.6 })).rotation.x = 0.12;
    } else if (a.moment === 'wedding') {
      for (const sx of [-1, 1]) {
        s.rod([sx * (pw / 2 + 0.3), 0, dz + 0.3], [sx * (pw / 2 + 0.3), 2.6, dz + 0.3], 0.03, s.material('#e9e6dc'));
        for (let i = 0; i < 9; i++) s.ball([0.3, 0.26, 0.3], [sx * (pw / 2 + 0.3) + (random() - 0.5) * 0.5, 1.5 + random() * 1.4, dz + 0.3 + (random() - 0.5) * 0.5], s.material(['#8fc04a', '#a9d065', '#6fa43a'][i % 3]), 7);
      }
      const colours = ['#c8202f', '#f2f0e8', '#2a4f9a'];
      for (let i = 0; i < 9; i++) {
        const t = i / 8, x = mix(-pw / 2 - 0.3, pw / 2 + 0.3, t);
        const flag = s.mesh(new THREE.ConeGeometry(0.13, 0.3, 3), new THREE.MeshStandardMaterial({ color: colours[i % 3], roughness: 0.8, side: THREE.DoubleSide }), [x, 2.45 - Math.sin(t * Math.PI) * 0.35, dz + 0.3]);
        flag.rotation.z = Math.PI;
        flag.scale.z = 0.15;
      }
    } else if (a.moment === 'ravens') {
      const birds = 5 + Math.round(mood.density * 9);
      for (let i = 0; i < birds; i++) {
        const r = ridges[Math.floor(random() * ridges.length)];
        const z = mix(r.z0, r.z1, random());
        const bird = s.ball([0.09, 0.11, 0.2], [0, r.y + 0.08, z], dead, 8);
        bird.rotation.y = random() * Math.PI * 2;
        s.ball([0.06, 0.06, 0.07], [Math.sin(bird.rotation.y) * 0.13, r.y + 0.2, z + Math.cos(bird.rotation.y) * 0.13], dead, 6);
      }
    }

    if (a.yard) {
      // A dry-stone ring wall with a gap at the gate, and markers inside it.
      const rx = nw * 1.55 / 2 + 3.2, rz0 = az - 2.6, rz1 = dz + 4;
      const stones: { at: [number, number, number]; size: number; color: string }[] = [];
      const greys = ['#8e8e89', '#a09f98', '#77797a', '#8a8378'];
      const along = (x0: number, z0: number, x1: number, z1: number) => {
        const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.42);
        for (let i = 0; i <= n; i++) {
          const x = mix(x0, x1, i / n), z = mix(z0, z1, i / n);
          if (Math.abs(x) < 1.1 && z > rz1 - 0.1) continue;
          for (let layer = 0; layer < 2; layer++) {
            if (layer === 1 && random() < wear * 0.5) continue;
            stones.push({ at: [x + (random() - 0.5) * 0.12, 0.16 + layer * 0.3, z + (random() - 0.5) * 0.12], size: 0.2 + random() * 0.09, color: greys[Math.floor(random() * greys.length)] });
          }
        }
      };
      along(-rx, rz0, rx, rz0); along(rx, rz0, rx, rz1); along(rx, rz1, -rx, rz1); along(-rx, rz1, -rx, rz0);
      const rock = new THREE.IcosahedronGeometry(1, 1);
      rock.scale(1.15, 0.8, 1.15);
      s.scatter(rock, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), stones);
      const markers = 6 + Math.round(mood.density * 12);
      const slate = s.material('#6a6d6c', { roughness: 0.95 });
      for (let i = 0; i < markers; i++) {
        const sx = random() < 0.5 ? -1 : 1;
        const x = sx * mix(nw * 1.55 / 2 + 0.9, rx - 0.7, random()), z = mix(rz0 + 1, rz1 - 1, random());
        const wooden = random() < 0.3;
        if (wooden) { crossAt(x, 0, z, 0.8); continue; }
        const stoneMarker = s.box([0.5, 0.75 + random() * 0.4, 0.1], [x, 0.4, z], slate);
        stoneMarker.rotation.set((random() - 0.5) * (0.15 + wear * 0.5), (random() - 0.5) * 0.4, (random() - 0.5) * (0.1 + wear * 0.5));
      }
    }

    return s.finish({ footprint: Math.max(nw, nl) * (a.yard ? 1.5 : 1.1) });
  },
});

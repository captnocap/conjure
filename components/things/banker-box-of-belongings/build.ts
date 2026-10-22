import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PLATES = {
  none: 'There is no name plate.',
  manager: 'MANAGER',
  assistant: 'ASSISTANT',
  month: 'EMPLOYEE OF THE MONTH',
  intern: 'INTERN',
  vp: 'VICE PRESIDENT',
  accounts: 'ACCOUNTS',
} as const;

export default defineThing({
  questions: {
    occasion: choice('Why has the desk been packed into a box?', {
      laidoff: 'Laid off this morning: packed in ten minutes, a tie and a pink slip thrown on top.',
      retired: 'Retirement after decades: a gilt carriage clock and a signed card among the things.',
      firstday: 'A first day: everything new, neat and hopeful, a welcome folder and a lanyard.',
      moving: 'Only moving desks: a phone, a keyboard and a tangle of cable.',
      cleared: 'Cleared by someone else for a person who is not coming back: sealed with tape and labelled.',
    }),
    carton: choice('What kind of box is it?', {
      banker: 'A white banker box with printed panels and hand holes.',
      brown: 'A plain brown carton with its flaps standing open.',
      crate: 'A blue plastic storage crate.',
      liquor: 'A reused supermarket box with a loud red brand panel.',
    }),
    lid: choice('If it has a lid, where is the lid?', {
      leaning: 'Off, leaning against the side.',
      under: 'Off, tucked underneath the box.',
      on: 'On: the box is closed, with a couple of things riding on top.',
      lost: 'Nowhere to be seen.',
    }),
    plant: choice('Which plant came off the desk?', {
      none: 'No plant.',
      fern: 'A leafy spider plant spilling over the rim.',
      cactus: 'A small stubborn cactus.',
      lily: 'A drooping peace lily with one white flower.',
      bonsai: 'A tiny clipped bonsai.',
      orchid: 'A gift orchid on a thin stem.',
    }),
    keepsake: choice('What treasured thing stands up out of the box?', {
      none: 'Nothing sentimental.',
      photo: 'A framed family photograph.',
      diploma: 'A framed certificate.',
      drawing: "A child's crayon drawing in a clip frame.",
      trophy: 'A small sales trophy.',
      bear: 'A worn teddy bear mascot.',
      globe: 'A snow globe.',
    }),
    mug: choice('What mug is in there?', {
      none: 'No mug.',
      white: 'A plain white mug full of pens.',
      boss: "A novelty mug reading WORLD'S BEST BOSS.",
      red: 'A big chipped red mug.',
      travel: 'A steel travel tumbler.',
    }),
    plate: choice('What does the desk name plate say?', PLATES),
    scrawl: choice('What is written on the side of the box?', {
      blank: 'Nothing.',
      desk: 'DESK',
      personal: 'PERSONAL',
      fragile: 'FRAGILE',
      mine: 'MY STUFF',
      keep: 'KEEP',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const w = 0.4, d = 0.32, h = 0.26, t = 0.007;
    const cartonHex = { banker: '#ddd3b8', brown: '#b58f5e', crate: '#3d74b8', liquor: '#c2a073' }[a.carton];
    const card = s.material(cartonHex, { roughness: a.carton === 'crate' ? 0.4 : 0.95 });
    const cardDark = s.material(new THREE.Color(cartonHex).multiplyScalar(0.72), { roughness: 0.95 });
    const dark = s.material('#2a2623');
    const white = s.material('#f5f2e8', { roughness: 0.9 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = Math.round(256 * height / width);
      draw(canvas.getContext('2d')!, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    };

    const hasLid = a.carton === 'banker' || a.carton === 'crate';
    const sealed = a.occasion === 'cleared' || (hasLid && a.lid === 'on');
    const lidUnder = hasLid && a.lid === 'under' && !sealed;
    const floorY = lidUnder ? 0.012 : 0;
    const box = new THREE.Group();
    box.position.y = floorY;
    box.rotation.y = (random() - 0.5) * 0.3;
    s.root.add(box);

    // Carton: a tray of four walls so the contents show.
    add(box, new THREE.BoxGeometry(w, t, d), cardDark, [0, t / 2, 0]);
    for (const side of [-1, 1]) {
      add(box, new THREE.BoxGeometry(w, h, t), card, [0, h / 2, side * (d / 2 - t / 2)]);
      add(box, new THREE.BoxGeometry(t, h, d), card, [side * (w / 2 - t / 2), h / 2, 0]);
      // Hand holes on the short ends.
      add(box, new THREE.BoxGeometry(0.003, 0.03, 0.09), dark, [side * (w / 2 + 0.0005), h * 0.72, 0]);
    }
    if (a.carton === 'banker') {
      const print = s.material('#8a6a48');
      for (const side of [-1, 1]) add(box, new THREE.BoxGeometry(0.002, 0.012, d * 0.9), print, [side * (w / 2 + 0.001), h * 0.9, 0]);
      for (const side of [-1, 1]) {
        add(box, new THREE.BoxGeometry(w * 0.9, 0.012, 0.002), print, [0, h * 0.9, side * (d / 2 + 0.001)]);
        add(box, new THREE.BoxGeometry(w * 0.9, 0.012, 0.002), print, [0, h * 0.1, side * (d / 2 + 0.001)]);
      }
      add(box, new THREE.BoxGeometry(w * 0.5, h * 0.4, 0.002), white, [-w * 0.15, h * 0.5, d / 2 + 0.001]);
      for (let i = 0; i < 3; i++) add(box, new THREE.BoxGeometry(w * 0.42, 0.003, 0.002), print, [-w * 0.15, h * 0.4 + i * 0.035, d / 2 + 0.0022]);
    } else if (a.carton === 'crate') {
      for (let i = 0; i < 7; i++) for (const side of [-1, 1]) add(box, new THREE.BoxGeometry(0.014, h * 0.85, 0.008), cardDark, [-w / 2 + 0.035 + i * 0.055, h * 0.48, side * (d / 2 + 0.002)]);
      for (const side of [-1, 1]) {
        add(box, new THREE.BoxGeometry(w + 0.024, 0.02, 0.016), card, [0, h - 0.01, side * (d / 2 + 0.004)]);
        add(box, new THREE.BoxGeometry(0.016, 0.02, d + 0.024), card, [side * (w / 2 + 0.004), h - 0.01, 0]);
      }
    } else if (a.carton === 'liquor') {
      add(box, new THREE.BoxGeometry(w * 0.86, h * 0.5, 0.002), s.material('#c7352b'), [0, h * 0.55, d / 2 + 0.001]);
      const brand = s.label(['FINEST', 'PRODUCE', 'BANANAS', 'EXPORT'][Math.floor(random() * 4)], w * 0.7, h * 0.3, [0, h * 0.55, d / 2 + 0.003], '#fff3d6', '#c7352b');
      brand.removeFromParent(); box.add(brand);
    }
    if (a.carton === 'brown' || a.carton === 'liquor') {
      // Flaps standing open, or folded shut and taped.
      for (const side of [-1, 1]) {
        const long = new THREE.Group();
        long.position.set(0, h, side * (d / 2 - t / 2));
        add(long, new THREE.BoxGeometry(w, 0.004, d / 2), card, [0, 0, -side * d / 4]);
        long.rotation.x = sealed ? 0 : side * mix(2.45, 3.0, random());
        box.add(long);
        const short = new THREE.Group();
        short.position.set(side * (w / 2 - t / 2), h - 0.004, 0);
        add(short, new THREE.BoxGeometry(d / 2, 0.004, d - 0.02), card, [-side * d / 4, 0, 0]);
        short.rotation.z = sealed ? 0 : -side * mix(2.45, 3.0, random());
        box.add(short);
      }
    }
    if (a.scrawl !== 'blank') {
      const text = { desk: 'DESK', personal: 'PERSONAL', fragile: 'FRAGILE', mine: 'MY STUFF', keep: 'KEEP' }[a.scrawl];
      const onPanel = a.carton === 'banker';
      const mark = s.label(text, w * 0.42, h * 0.26, [0, 0, 0], a.scrawl === 'fragile' ? '#c0271d' : '#1d2433', onPanel ? '#f5f2e8' : cartonHex);
      mark.removeFromParent(); box.add(mark);
      if (a.carton === 'liquor') { mark.position.set(w / 2 + 0.002, h * 0.45, 0); mark.rotation.y = Math.PI / 2; mark.scale.setScalar(0.7); }
      else mark.position.set(onPanel ? -w * 0.15 : 0, h * 0.5, d / 2 + 0.004);
      mark.rotation.z = (random() - 0.5) * 0.14;
      mark.castShadow = false;
    }

    // Lid.
    const lidGeometry = () => new THREE.BoxGeometry(w + 0.024, 0.05, d + 0.024);
    const lidMat = a.carton === 'crate' ? s.material('#2f5d96', { roughness: 0.4 }) : card;
    let topY = h;
    if (hasLid && sealed) { add(box, lidGeometry(), lidMat, [0, h - 0.012, 0]); topY = h + 0.013; }
    else if (lidUnder) { const under = s.box([w + 0.03, 0.045, d + 0.03], [0, 0.0225, 0], lidMat); under.rotation.y = box.rotation.y; }
    else if (hasLid && a.lid === 'leaning') {
      const lid = s.mesh(lidGeometry(), lidMat, [-w / 2 - 0.085, (w + 0.024) / 2 * Math.cos(0.28) + 0.01, 0.02]);
      lid.rotation.set(0, box.rotation.y + (random() - 0.5) * 0.2, Math.PI / 2 - 0.28);
    }
    if (sealed) {
      const tape = s.material(a.occasion === 'cleared' ? '#b08a4a' : '#c9b06a', { roughness: 0.35 });
      add(box, new THREE.BoxGeometry(w + 0.03, 0.002, 0.05), tape, [0, topY + 0.001, 0]);
      for (const side of [-1, 1]) add(box, new THREE.BoxGeometry(0.002, 0.11, 0.05), tape, [side * (w / 2 + 0.014), topY - 0.055, 0]);
      if (a.occasion === 'cleared') {
        const tag = s.label('RETURN TO FAMILY', 0.18, 0.07, [0, 0, 0], '#1d2433', '#f5f2e8');
        tag.removeFromParent(); box.add(tag);
        tag.rotation.x = -Math.PI / 2; tag.rotation.z = 0.1; tag.position.set(0.08, topY + 0.003, 0.09); tag.castShadow = false;
      }
    }

    // --- The things. Each builder returns a group standing on y = 0.
    const group = () => new THREE.Group();
    const pot = (g: THREE.Group, radius = 0.045, height = 0.08) => {
      const clay = s.material(mood.cheer > 0.6 ? '#d2693f' : '#a8573a');
      add(g, new THREE.LatheGeometry([[0, 0], [radius * 0.7, 0], [radius, height], [radius * 1.1, height], [radius * 1.1, height + 0.012], [0, height + 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 18), clay, [0, 0, 0]);
      add(g, new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.004, 14), s.material('#3b2c20'), [0, height + 0.012, 0]);
      return height + 0.012;
    };
    const frond = (g: THREE.Group, points: [number, number, number][], radius: number, material: THREE.Material, flat = 1) => {
      const mesh = add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 10, radius, 5), material, [0, 0, 0]);
      mesh.scale.y = flat;
      return mesh;
    };
    const health = mix(1, 0.35, mood.wear) * mix(0.7, 1, mood.cheer);
    const leafColour = new THREE.Color('#8c7a3c').lerp(new THREE.Color('#3f9447'), health);
    const makePlant = () => {
      const g = group();
      const leaf = s.material(leafColour);
      if (a.plant === 'fern') {
        const y = pot(g);
        const n = Math.round(mix(8, 18, health));
        for (let i = 0; i < n; i++) {
          const angle = random() * Math.PI * 2, reach = mix(0.07, 0.17, random()), rise = mix(0.09, 0.2, random()) * mix(0.6, 1, health);
          const cx = Math.cos(angle), cz = Math.sin(angle);
          frond(g, [[0, y, 0], [cx * reach * 0.45, y + rise, cz * reach * 0.45], [cx * reach, y + rise * 0.55, cz * reach], [cx * reach * 1.2, y + rise * 0.05, cz * reach * 1.2]], 0.006, leaf);
        }
      } else if (a.plant === 'cactus') {
        const y = pot(g, 0.04, 0.06);
        const skin = s.material('#5d9a55');
        add(g, new THREE.CapsuleGeometry(0.028, 0.1, 4, 10), skin, [0, y + 0.075, 0]);
        add(g, new THREE.CapsuleGeometry(0.014, 0.035, 4, 8), skin, [0.04, y + 0.09, 0]);
        add(g, new THREE.CapsuleGeometry(0.014, 0.02, 4, 8), skin, [0.03, y + 0.07, 0]).rotation.z = Math.PI / 2;
        add(g, new THREE.SphereGeometry(0.014, 8, 6), s.material(mood.cheer > 0.4 ? '#ff5d8f' : '#d9c26a'), [0, y + 0.16, 0]);
      } else if (a.plant === 'lily') {
        const y = pot(g, 0.05, 0.085);
        const droop = mix(0.03, 0.14, 1 - health);
        for (let i = 0; i < 7; i++) {
          const angle = i * 0.9 + random() * 0.4, cx = Math.cos(angle), cz = Math.sin(angle), rise = mix(0.12, 0.2, random());
          frond(g, [[0, y, 0], [cx * 0.04, y + rise, cz * 0.04], [cx * 0.12, y + rise - droop, cz * 0.12]], 0.004, leaf);
          const blade = add(g, new THREE.SphereGeometry(1, 10, 6), leaf, [cx * 0.1, y + rise - droop * 0.7, cz * 0.1]);
          blade.scale.set(0.055, 0.006, 0.026); blade.rotation.set(0, -angle, -0.5 - droop * 3);
        }
        frond(g, [[0, y, 0], [0.01, y + 0.24, 0.01]], 0.003, leaf);
        const spathe = add(g, new THREE.SphereGeometry(1, 10, 6), s.material('#f7f5ea', { emissive: '#f7f5ea', emissiveIntensity: 0.15 }), [0.012, y + 0.26, 0.012]);
        spathe.scale.set(0.022, 0.04, 0.008);
      } else if (a.plant === 'bonsai') {
        const dish = s.material('#3d5873');
        add(g, new THREE.BoxGeometry(0.13, 0.03, 0.09), dish, [0, 0.015, 0]);
        const bark = s.material('#5b4030');
        frond(g, [[0, 0.03, 0], [0.02, 0.08, 0], [-0.015, 0.12, 0.01], [0.02, 0.16, 0]], 0.009, bark);
        frond(g, [[0.01, 0.09, 0], [0.06, 0.11, 0.01]], 0.005, bark);
        for (const [x, y, z, r] of [[0.02, 0.18, 0, 0.045], [-0.03, 0.14, 0.015, 0.03], [0.07, 0.125, 0.01, 0.03]] as const) add(g, new THREE.IcosahedronGeometry(r, 1), leaf, [x, y, z]).scale.y = 0.6;
      } else {
        const y = pot(g, 0.038, 0.07);
        frond(g, [[0, y, 0], [0.01, y + 0.15, 0], [0.05, y + 0.27, 0.01], [0.1, y + 0.29, 0.02]], 0.003, leaf);
        for (let i = 0; i < 2; i++) { const blade = add(g, new THREE.SphereGeometry(1, 10, 6), leaf, [(i ? -1 : 1) * 0.04, y + 0.012, 0]); blade.scale.set(0.05, 0.006, 0.022); }
        const petal = s.material(mood.cheer > 0.5 ? '#e36bb0' : '#f3eef2', { emissive: '#e36bb0', emissiveIntensity: 0.12 });
        const blooms = Math.max(1, Math.round(mix(1, 4, health)));
        for (let i = 0; i < blooms; i++) add(g, new THREE.IcosahedronGeometry(0.022, 1), petal, [0.035 + i * 0.024, y + 0.25 + i * 0.012, 0.012]).scale.z = 0.4;
      }
      return g;
    };
    const frame = (width: number, height: number, picture: THREE.Material, rim: string) => {
      const g = group();
      add(g, new THREE.BoxGeometry(width, height, 0.014), s.material(rim), [0, height / 2, 0]);
      add(g, new THREE.BoxGeometry(width * 0.84, height * 0.84, 0.004), picture, [0, height / 2, 0.0065]);
      return g;
    };
    const makeKeepsake = () => {
      if (a.keepsake === 'photo') {
        return frame(0.19, 0.15, paint(0.19, 0.15, (ctx, cw, ch) => {
          const sky = ctx.createLinearGradient(0, 0, 0, ch);
          sky.addColorStop(0, mood.cheer > 0.4 ? '#9fd0ee' : '#b9bcc0'); sky.addColorStop(1, mood.cheer > 0.4 ? '#f1d9a4' : '#8f9296');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
          const people = 2 + Math.floor(random() * 3);
          for (let i = 0; i < people; i++) {
            const x = cw * (0.5 + (i - (people - 1) / 2) * 0.2), tall = ch * mix(0.3, 0.55, random());
            ctx.fillStyle = ['#b5503c', '#3d5f8a', '#5a8a55', '#d0a03a', '#7a4a80'][i % 5];
            ctx.beginPath(); ctx.ellipse(x, ch, cw * 0.09, tall, 0, Math.PI, 0); ctx.fill();
            ctx.fillStyle = ['#e9c4a2', '#c99672', '#8a5a3c'][Math.floor(random() * 3)];
            ctx.beginPath(); ctx.arc(x, ch - tall - ch * 0.07, ch * 0.09, 0, Math.PI * 2); ctx.fill();
          }
        }), '#2c2622');
      }
      if (a.keepsake === 'diploma') {
        return frame(0.2, 0.16, paint(0.2, 0.16, (ctx, cw, ch) => {
          ctx.fillStyle = '#f4ecd4'; ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = '#b0903c'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, cw - 20, ch - 20);
          ctx.fillStyle = '#3a3528'; ctx.fillRect(cw * 0.25, ch * 0.2, cw * 0.5, ch * 0.07);
          for (let i = 0; i < 4; i++) ctx.fillRect(cw * 0.2, ch * (0.38 + i * 0.09), cw * 0.6, ch * 0.02);
          ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(cw * 0.76, ch * 0.78, ch * 0.09, 0, Math.PI * 2); ctx.fill();
        }), '#7a5a2c');
      }
      if (a.keepsake === 'drawing') {
        return frame(0.2, 0.15, paint(0.2, 0.15, (ctx, cw, ch) => {
          ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, cw, ch);
          ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.strokeStyle = '#f2b01e'; ctx.beginPath(); ctx.arc(cw * 0.8, ch * 0.22, ch * 0.11, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#d9534a'; ctx.strokeRect(cw * 0.15, ch * 0.5, cw * 0.3, ch * 0.34);
          ctx.beginPath(); ctx.moveTo(cw * 0.12, ch * 0.5); ctx.lineTo(cw * 0.3, ch * 0.25); ctx.lineTo(cw * 0.48, ch * 0.5); ctx.stroke();
          ctx.strokeStyle = '#3f8fe0';
          for (const x of [0.6, 0.72]) { ctx.beginPath(); ctx.arc(cw * x, ch * 0.55, ch * 0.06, 0, Math.PI * 2); ctx.moveTo(cw * x, ch * 0.61); ctx.lineTo(cw * x, ch * 0.82); ctx.stroke(); }
          ctx.strokeStyle = '#44b56b'; ctx.beginPath(); ctx.moveTo(0, ch * 0.9); ctx.lineTo(cw, ch * 0.88); ctx.stroke();
        }), '#d9d4c4');
      }
      const g = group();
      if (a.keepsake === 'trophy') {
        const gold = s.material('#d9b13b', { metalness: 0.55, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: mix(0.05, 0.3, mood.cheer) });
        add(g, new THREE.BoxGeometry(0.07, 0.04, 0.07), s.material('#3a2a20'), [0, 0.02, 0]);
        add(g, new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.01, 0.025], [0.01, 0.07], [0.04, 0.1], [0.052, 0.18], [0.046, 0.18], [0.035, 0.11], [0, 0.095]].map(([x, y]) => new THREE.Vector2(x, y)), 18), gold, [0, 0.04, 0]);
        for (const side of [-1, 1]) add(g, new THREE.TorusGeometry(0.024, 0.005, 6, 14), gold, [side * 0.056, 0.17, 0]);
      } else if (a.keepsake === 'bear') {
        const fur = s.material(new THREE.Color('#b0834f').lerp(new THREE.Color('#8f8271'), mood.wear * 0.6), { roughness: 1 });
        add(g, new THREE.SphereGeometry(0.06, 14, 10), fur, [0, 0.06, 0]).scale.set(1, 1.1, 0.9);
        add(g, new THREE.SphereGeometry(0.048, 14, 10), fur, [0, 0.16, 0.005]);
        for (const side of [-1, 1]) {
          add(g, new THREE.SphereGeometry(0.02, 8, 6), fur, [side * 0.038, 0.2, 0]);
          add(g, new THREE.SphereGeometry(0.024, 8, 6), fur, [side * 0.062, 0.09, 0.02]).scale.set(1, 1.5, 1);
          add(g, new THREE.SphereGeometry(0.007, 6, 4), dark, [side * 0.018, 0.17, 0.045]);
        }
        add(g, new THREE.SphereGeometry(0.02, 8, 6), s.material('#e3cfa8'), [0, 0.15, 0.043]);
      } else if (a.keepsake === 'globe') {
        add(g, new THREE.CylinderGeometry(0.045, 0.055, 0.035, 18), s.material('#7a2f38'), [0, 0.0175, 0]);
        add(g, new THREE.SphereGeometry(0.05, 18, 12), new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.45, roughness: 0.05 }), [0, 0.075, 0]);
        add(g, new THREE.ConeGeometry(0.02, 0.05, 8), s.material('#3f7a4a'), [0, 0.065, 0]);
        add(g, new THREE.CylinderGeometry(0.042, 0.042, 0.008, 14), white, [0, 0.04, 0]);
      }
      return g;
    };
    const makeMug = () => {
      const g = group();
      const hex = { none: '#fff', white: '#f2f0e8', boss: '#f2f0e8', red: '#c8382e', travel: '#9aa1a5' }[a.mug];
      const glaze = s.material(hex, { roughness: 0.3, metalness: a.mug === 'travel' ? 0.5 : 0 });
      if (a.mug === 'travel') {
        add(g, new THREE.CylinderGeometry(0.038, 0.03, 0.17, 16), glaze, [0, 0.085, 0]);
        add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), dark, [0, 0.18, 0]);
        return g;
      }
      const big = a.mug === 'red' ? 1.2 : 1;
      add(g, new THREE.CylinderGeometry(0.04 * big, 0.037 * big, 0.095 * big, 18), glaze, [0, 0.0475 * big, 0]);
      add(g, new THREE.TorusGeometry(0.027 * big, 0.007, 6, 14), glaze, [0.045 * big, 0.05 * big, 0]);
      add(g, new THREE.CylinderGeometry(0.034 * big, 0.034 * big, 0.003, 14), dark, [0, 0.095 * big, 0]);
      if (a.mug === 'boss') {
        const text = s.label("WORLD'S BEST BOSS", 0.07, 0.045, [0, 0, 0], '#1d2433', '#f2f0e8');
        text.removeFromParent(); g.add(text); text.position.set(0, 0.05, 0.0405); text.castShadow = false;
      }
      if (a.mug === 'white') {
        const inks = ['#2b4c9b', '#c0392b', '#222', '#e3b020'];
        for (let i = 0; i < 4; i++) {
          const pen = add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), s.material(inks[i]), [(random() - 0.5) * 0.03, 0.11, (random() - 0.5) * 0.03]);
          pen.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
        }
      }
      return g;
    };
    const makeStapler = () => {
      const g = group();
      const shell = s.material(mood.cheer > 0.55 ? '#c8382e' : '#2c2f33', { roughness: 0.35 });
      add(g, new THREE.BoxGeometry(0.15, 0.012, 0.04), dark, [0, 0.006, 0]);
      const arm = add(g, new THREE.BoxGeometry(0.15, 0.028, 0.036), shell, [0.004, 0.04, 0]);
      arm.rotation.z = 0.13;
      add(g, new THREE.BoxGeometry(0.02, 0.03, 0.036), dark, [-0.065, 0.02, 0]);
      return g;
    };
    const makePlate = () => {
      const g = group();
      const prism = new THREE.Shape([new THREE.Vector2(-0.025, 0), new THREE.Vector2(0.025, 0), new THREE.Vector2(0, 0.055)]);
      const geo = new THREE.ExtrudeGeometry(prism, { depth: 0.24, bevelEnabled: false });
      geo.translate(0, 0, -0.12); geo.rotateY(Math.PI / 2);
      add(g, geo, s.material('#5b3a24', { roughness: 0.5 }), [0, 0, 0]);
      const text = s.label(PLATES[a.plate], 0.22, 0.045, [0, 0, 0], '#2a2118', '#d8b659');
      text.removeFromParent(); g.add(text);
      text.position.set(0, 0.0285, 0.0135); text.rotation.x = -Math.atan2(0.025, 0.055); text.castShadow = false;
      (text.material as THREE.MeshStandardMaterial).metalness = 0.4;
      return g;
    };

    // --- Packing.
    const drop = (item: THREE.Group, x: number, y: number, z: number, turn = 0, tiltX = 0, tiltZ = 0) => {
      item.position.set(x, y, z);
      item.rotation.set(tiltX, turn, tiltZ);
      box.add(item);
      return item;
    };
    const messy = a.occasion === 'laidoff' ? 1 : a.occasion === 'firstday' ? 0.15 : 0.5;
    const jig = (amount: number) => (random() - 0.5) * amount * (0.4 + messy);
    if (sealed) {
      // Only a couple of things ride on the lid.
      if (a.plant !== 'none') drop(makePlant(), -0.1, topY, -0.03, random() * 6);
      if (a.keepsake !== 'none') drop(makeKeepsake(), 0.1, topY + 0.004, -0.06, jig(0.5), a.keepsake === 'bear' || a.keepsake === 'trophy' || a.keepsake === 'globe' ? 0 : -1.45);
      if (a.occasion === 'cleared') {
        const stem = s.material('#4c7a3f');
        const flower = group();
        add(flower, new THREE.CylinderGeometry(0.003, 0.003, 0.22, 6), stem, [0, 0.004, 0]).rotation.z = Math.PI / 2;
        add(flower, new THREE.IcosahedronGeometry(0.022, 1), s.material('#f3efe6', { emissive: '#f3efe6', emissiveIntensity: 0.2 }), [0.115, 0.012, 0]);
        drop(flower, -0.05, topY + 0.002, 0.09, 0.4);
      }
    } else {
      // Filler: binders and folders laid flat, with a few standing along the back.
      const fill = h * mix(0.5, 0.78, mood.density);
      const spines = ['#3d5f8a', '#8a3d3d', '#d8c48a', '#4f7a5a', '#e9e4d2', '#2c2f33', '#c98a2b'];
      let y = t;
      while (y < fill) {
        const thick = mix(0.018, 0.05, random());
        const slab = add(box, new THREE.BoxGeometry(mix(0.26, 0.36, random()), thick, mix(0.22, 0.28, random())), s.material(spines[Math.floor(random() * spines.length)]), [jig(0.04), y + thick / 2, jig(0.03)]);
        slab.rotation.y = jig(0.25);
        y += thick;
      }
      const standing = Math.round(mix(1, 5, mood.density));
      for (let i = 0; i < standing; i++) {
        const folder = add(box, new THREE.BoxGeometry(mix(0.22, 0.3, random()), mix(0.2, 0.3, random()), 0.008), s.material(spines[Math.floor(random() * spines.length)]), [0.03 + jig(0.08), y + 0.07, -d / 2 + 0.025 + i * 0.012]);
        folder.rotation.set(-0.12 + jig(0.15), 0, jig(0.2));
      }
      if (a.plant !== 'none') drop(makePlant(), -0.115 + jig(0.03), y, -0.03 + jig(0.03), random() * 6, jig(0.25), jig(0.25));
      if (a.keepsake !== 'none') {
        const flat = a.keepsake === 'photo' || a.keepsake === 'diploma' || a.keepsake === 'drawing';
        drop(makeKeepsake(), 0.09 + jig(0.03), y - (flat ? 0.02 : 0), -0.075 + (flat ? 0 : 0.03), jig(0.5), flat ? -0.22 + jig(0.2) : jig(0.2), jig(0.3) * messy);
      }
      if (a.mug !== 'none') drop(makeMug(), -0.12 + jig(0.03), y, 0.095 + jig(0.02), random() * 6, messy > 0.8 ? 0.5 : 0, 0);
      drop(makeStapler(), 0.1 + jig(0.03), y, 0.1 + jig(0.02), jig(1.2), 0, jig(0.3));
      if (a.plate !== 'none') drop(makePlate(), 0.0 + jig(0.03), y + 0.002, 0.03 + jig(0.02), jig(0.5) + (messy > 0.8 ? 0.6 : 0), jig(0.3), 0);

      // The occasion leaves its own mark.
      if (a.occasion === 'laidoff') {
        const silk = s.material(['#8a2f3d', '#2f4a8a', '#3d6b4a'][Math.floor(random() * 3)], { roughness: 0.5 });
        const tx = 0.02 + jig(0.1);
        add(box, new THREE.BoxGeometry(0.045, 0.006, 0.13), silk, [tx, y + 0.07, d / 2 - 0.07]).rotation.x = 0.35;
        add(box, new THREE.BoxGeometry(0.05, 0.19, 0.006), silk, [tx, h - 0.09, d / 2 + 0.006]);
        const tip = add(box, new THREE.ConeGeometry(0.035, 0.04, 4), silk, [tx, h - 0.2, d / 2 + 0.006]);
        tip.rotation.set(Math.PI, Math.PI / 4, 0); tip.scale.z = 0.15;
        const slip = add(box, new THREE.BoxGeometry(0.1, 0.16, 0.002), s.material('#f2a7b8'), [0.15, y + 0.11, -0.01]);
        slip.rotation.set(-0.3, 0.5, 0.25);
      } else if (a.occasion === 'retired') {
        const clock = group();
        const gilt = s.material('#d9b13b', { metalness: 0.55, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: 0.2 });
        add(clock, new THREE.BoxGeometry(0.09, 0.12, 0.06), gilt, [0, 0.06, 0]);
        add(clock, new THREE.CylinderGeometry(0.034, 0.034, 0.004, 20), white, [0, 0.07, 0.031]).rotation.x = Math.PI / 2;
        add(clock, new THREE.BoxGeometry(0.004, 0.026, 0.002), dark, [0, 0.082, 0.034]);
        add(clock, new THREE.BoxGeometry(0.018, 0.004, 0.002), dark, [0.009, 0.07, 0.034]);
        add(clock, new THREE.TorusGeometry(0.022, 0.004, 6, 14, Math.PI), gilt, [0, 0.12, 0]);
        drop(clock, 0.0 + jig(0.03), y + (a.plate !== 'none' ? 0.05 : 0), -0.02, jig(0.4), 0, 0);
        const cardMat = paint(0.12, 0.16, (ctx, cw, ch) => {
          ctx.fillStyle = '#fdf6e6'; ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = '#c0392b'; ctx.font = `bold ${ch * 0.13}px monospace`; ctx.textAlign = 'center';
          ctx.fillText('HAPPY', cw / 2, ch * 0.3); ctx.fillText('RETIREMENT', cw / 2, ch * 0.46, cw * 0.9);
          ctx.strokeStyle = '#3d5f8a'; ctx.lineWidth = 2;
          for (let i = 0; i < 9; i++) { ctx.beginPath(); const x = cw * mix(0.1, 0.6, random()), yy = ch * mix(0.58, 0.92, random()); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 20, yy - 8, x + cw * 0.3, yy + 3); ctx.stroke(); }
        });
        const greeting = add(box, new THREE.BoxGeometry(0.12, 0.16, 0.003), cardMat, [0.16, y + 0.08, 0.02]);
        greeting.rotation.set(-0.2, -0.9, 0.1);
      } else if (a.occasion === 'firstday') {
        const folder = add(box, new THREE.BoxGeometry(0.23, 0.3, 0.008), s.material('#2f8a86'), [-0.01, y + 0.1, -d / 2 + 0.07]);
        folder.rotation.x = -0.15;
        const welcome = s.label('WELCOME', 0.18, 0.05, [0, 0, 0], '#ffffff', '#2f8a86');
        welcome.removeFromParent(); folder.add(welcome); welcome.position.set(0, 0.08, 0.005); welcome.castShadow = false;
        const strap = s.material('#e0563a');
        add(box, new THREE.TorusGeometry(0.06, 0.004, 5, 20), strap, [0.14, h - 0.04, d / 2 + 0.008]).scale.set(0.5, 1.3, 1);
        add(box, new THREE.BoxGeometry(0.055, 0.085, 0.004), white, [0.14, h - 0.15, d / 2 + 0.008]);
        add(box, new THREE.BoxGeometry(0.03, 0.03, 0.002), s.material('#8d99a8'), [0.14, h - 0.135, d / 2 + 0.011]);
      } else if (a.occasion === 'moving') {
        const beige = s.material('#d5cdb6');
        const board = add(box, new THREE.BoxGeometry(0.42, 0.03, 0.15), beige, [0.03, y + 0.14, -0.1]);
        board.rotation.set(-1.2, 0.2, 0.5);
        const keys = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) keys.push({ at: [-0.18 + c * 0.03, 0.018, -0.045 + r * 0.03] as [number, number, number], size: 1 });
        const caps = s.scatter(new THREE.BoxGeometry(0.022, 0.008, 0.022), s.material('#ece6d2'), keys);
        caps.removeFromParent(); board.add(caps);
        const cable = s.material('#2c2f33');
        frond(box, [[-0.15, y + 0.2, -0.12], [-0.2, h + 0.02, -0.02], [-0.215, h * 0.6, 0.06], [-0.21, h * 0.2, 0.02], [-0.24, 0.01, 0.1]], 0.005, cable);
        const handset = add(box, new THREE.CapsuleGeometry(0.022, 0.15, 4, 8), beige, [0.13, y + 0.03, 0.0]);
        handset.rotation.set(0, 0.4, Math.PI / 2);
      }
    }

    return s.finish();
  },
});

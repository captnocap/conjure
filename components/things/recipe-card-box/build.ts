import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const RECIPES = {
  soup: { title: 'Chicken Soup', lines: ['1 old hen, not a young one', '3 carrots, parsley root', 'onion, burnt on the flame', 'simmer 3 hrs - do not boil!', 'noodles made separate'] },
  cake: { title: 'Apple Cake', lines: ['6 sour apples, sliced thin', '2 cups flour, 1 of sugar', '3 eggs, glass of oil', 'cinnamon, as you like', 'bake till it smells done'] },
  cabbage: { title: 'Stuffed Cabbage', lines: ['1 big head, scalded', 'pork + rice, half & half', 'roll tight, seam down', 'tomato, bay, 2 hrs low', 'better the second day'] },
  bread: { title: 'Sunday Bread', lines: ['1 kg flour, warm room', 'yeast in milk w/ sugar', 'knead until it lets go', 'rise twice, cover w/ cloth', 'hot oven, knock = hollow'] },
  jam: { title: 'Plum Jam', lines: ['5 kg plums, the late ones', 'no water. no sugar!', 'stir all day, wooden spoon', 'ready when spoon stands', 'jars hot, lids tight'] },
  dumplings: { title: 'Dumplings', lines: ['3 cups flour, 1 egg', 'hot water, pinch of salt', 'potato + cheese + onion', 'pinch edges, no gaps', 'boil till they float'] },
} as const;

export default defineThing({
  questions: {
    dish: choice('Which recipe is on the card out front?', {
      soup: 'Chicken soup: the cure for everything.',
      cake: 'Apple cake for when people come.',
      cabbage: 'Stuffed cabbage rolls, a whole afternoon of work.',
      bread: 'The Sunday bread.',
      jam: 'Plum jam, cooked down all day in autumn.',
      dumplings: 'Filled dumplings, pinched shut by hand.',
    }),
    complete: score('How complete is the box?', ['Nearly empty: a handful of cards left', 'Thinned out, gaps between the dividers', 'A full orderly set', 'Crammed past closing with clippings stuffed in']),
    box: choice('What is the box like?', {
      pine: 'Pale pine with finger joints and a hinged lid standing open.',
      painted: 'Painted sage green with a flower decal on the front, chipped at the corners.',
      tin: 'A yellow lithographed tin with red tulips, its lid long gone.',
      oak: 'Dark varnished oak with a brass label frame, serious as a library drawer.',
    }),
    hand: choice('What is the handwriting like?', {
      loops: 'Neat schoolroom loops in blue ink, every line straight.',
      scrawl: 'A fast slanted scrawl that runs uphill, written while stirring.',
      capitals: 'Careful block capitals in pencil, written for a child to follow.',
      typed: 'Typed on a manual typewriter with a worn ribbon.',
    }),
    marks: choice('What has happened to that card?', {
      grease: 'Translucent grease spots and a buttery thumbprint: used every week.',
      notes: 'Red-pencil corrections in the margin: more butter, less salt, an underline.',
      torn: 'Torn across and mended with yellowed tape.',
      scorched: 'One corner scorched brown from standing too near the stove.',
      clean: 'Clean: a fresh copy written out to be given away.',
    }),
    where: choice('Where is that card?', {
      propped: 'Propped against the front of the box, facing the cook.',
      raised: 'Pulled up proud from its place among the others, sticking out of the box.',
      flat: 'Lying flat on the table in front of the box.',
      pegged: 'Held upright by a wooden clothes peg clipped to the box.',
    }),
    beside: choice('What lies beside the box?', {
      nothing: 'Nothing.',
      spoon: 'A worn wooden spoon.',
      pencil: 'A pencil stub and a blank card, a recipe about to be written down.',
      clippings: 'Loose newspaper clippings and a rubber band.',
      glasses: 'A pair of reading glasses.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const recipe = RECIPES[a.dish];
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const paint = (width: number, height: number, draw: (ctx: Ctx) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };

    const CW = 0.127, CH = 0.078; // a 5 x 3 inch index card
    const W = 0.145, D = 0.105, H = 0.085, T = 0.007;

    // ---- the handwritten card -----------------------------------------------------------
    const ink = { loops: '#22408f', scrawl: '#1f2330', capitals: '#55575c', typed: '#2a2a2e' }[a.hand];
    const doodle = (ctx: Ctx) => {
      ctx.strokeStyle = ink; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.save(); ctx.translate(430, 150);
      ctx.beginPath();
      if (a.dish === 'soup') { ctx.arc(0, 0, 44, 0, Math.PI); ctx.moveTo(-50, 0); ctx.lineTo(50, 0); for (const x of [-18, 2, 22]) { ctx.moveTo(x, -12); ctx.bezierCurveTo(x - 12, -28, x + 12, -40, x, -58); } }
      else if (a.dish === 'cake') { ctx.moveTo(-48, 30); ctx.lineTo(48, 30); ctx.lineTo(48, -6); ctx.lineTo(-48, 14); ctx.closePath(); ctx.moveTo(-48, 14); ctx.lineTo(8, -34); ctx.lineTo(48, -6); for (const x of [-20, 4, 28]) { ctx.moveTo(x, 20); ctx.arc(x - 5, 20, 5, 0, 7); } }
      else if (a.dish === 'cabbage') { for (const [x, y] of [[-26, 10], [22, 14], [-2, -18]]) { ctx.moveTo(x + 30, y); ctx.ellipse(x, y, 30, 15, 0.2, 0, 7); ctx.moveTo(x - 24, y - 2); ctx.quadraticCurveTo(x, y - 12, x + 24, y + 2); } }
      else if (a.dish === 'bread') { ctx.moveTo(52, 20); ctx.ellipse(0, 20, 52, 14, 0, 0, Math.PI); ctx.moveTo(-52, 20); ctx.bezierCurveTo(-56, -36, 56, -36, 52, 20); for (const x of [-24, 0, 24]) { ctx.moveTo(x - 8, -14); ctx.lineTo(x + 8, 6); } }
      else if (a.dish === 'jam') { ctx.rect(-30, -22, 60, 58); ctx.rect(-34, -36, 68, 14); ctx.rect(-18, -4, 36, 22); }
      else { for (const [x, y] of [[-22, 18], [26, 8], [-6, -24]]) { ctx.moveTo(x + 28, y); ctx.arc(x, y, 28, 0, Math.PI, true); ctx.closePath(); for (let i = 0; i < 5; i++) { ctx.moveTo(x - 22 + i * 11, y - 16 - Math.sin((i / 4) * Math.PI) * 9); ctx.lineTo(x - 20 + i * 11, y - 8 - Math.sin((i / 4) * Math.PI) * 9); } } }
      ctx.stroke(); ctx.restore();
    };
    const cardArt = paint(640, 392, (ctx) => {
      const aged = mix(0, 1, mood.wear);
      ctx.fillStyle = a.marks === 'clean' ? '#fbf8ee' : `rgb(${246 - aged * 14},${238 - aged * 22},${214 - aged * 44})`;
      ctx.fillRect(0, 0, 640, 392);
      ctx.strokeStyle = '#d8534a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(640, 78); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,140,200,0.55)'; ctx.lineWidth = 2;
      for (let y = 126; y < 380; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
      const face = { loops: 'italic', scrawl: 'italic', capitals: 'bold', typed: '' }[a.hand];
      const family = { loops: 'Georgia, "Times New Roman", serif', scrawl: 'Georgia, "Times New Roman", serif', capitals: 'Arial, Helvetica, sans-serif', typed: '"Courier New", Courier, monospace' }[a.hand];
      const write = (text: string, x: number, y: number, size: number, colour = ink) => {
        ctx.save(); ctx.translate(x, y);
        if (a.hand === 'scrawl') { ctx.transform(1, -0.035 - random() * 0.03, -0.32, 1, 0, 0); }
        else ctx.rotate((random() - 0.5) * (a.hand === 'typed' ? 0.004 : 0.02));
        ctx.fillStyle = colour; ctx.font = `${face} ${size}px ${family}`; ctx.textBaseline = 'alphabetic';
        const shown = a.hand === 'capitals' ? text.toUpperCase() : text;
        if (a.hand === 'typed') {
          // uneven strikes from a tired ribbon
          let cursor = 0;
          for (const letter of shown) { ctx.globalAlpha = 0.55 + random() * 0.45; ctx.fillText(letter, cursor, (random() - 0.5) * 2.4); cursor += size * 0.6; }
        } else ctx.fillText(shown, 0, 0, 380 - (x - 30));
        ctx.restore();
      };
      write(recipe.title, 30, 60, a.hand === 'capitals' ? 44 : 52);
      ctx.fillStyle = ink; ctx.globalAlpha = 0.8;
      if (a.hand !== 'typed') { ctx.fillRect(30, 68, ctx.measureText(recipe.title).width * 4.2 + 60, 2.5); }
      ctx.globalAlpha = 1;
      recipe.lines.forEach((line, index) => write(line, 30 + (a.hand === 'scrawl' ? 18 : 0), 120 + index * 48, a.hand === 'capitals' ? 25 : a.hand === 'typed' ? 26 : 31));
      doodle(ctx);
      if (a.marks === 'grease' || mood.wear > 0.6) {
        for (let i = 0; i < 6 + Math.round(mood.wear * 8); i++) {
          const x = random() * 640, y = random() * 392, r = 14 + random() * 42;
          const spot = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
          spot.addColorStop(0, 'rgba(214,170,70,0.4)'); spot.addColorStop(0.8, 'rgba(190,140,50,0.34)'); spot.addColorStop(0.92, 'rgba(150,100,30,0.5)'); spot.addColorStop(1, 'rgba(150,100,30,0)');
          ctx.fillStyle = spot; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + random() * 0.4), random() * 3, 0, 7); ctx.fill();
        }
        // a thumbprint at the lower right, where it is always picked up
        ctx.strokeStyle = 'rgba(120,80,30,0.4)'; ctx.lineWidth = 2;
        for (let ring = 0; ring < 6; ring++) { ctx.beginPath(); ctx.ellipse(575, 322, 9 + ring * 6, 13 + ring * 8, 0.4, 0, 7); ctx.stroke(); }
      }
      if (a.marks === 'notes') {
        ctx.strokeStyle = '#c8322c'; ctx.fillStyle = '#c8322c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.font = 'italic bold 30px Georgia, serif';
        ctx.save(); ctx.translate(400, 258); ctx.rotate(-0.12); ctx.fillText('more butter!', 0, 0); ctx.restore();
        ctx.save(); ctx.translate(430, 310); ctx.rotate(-0.08); ctx.fillText('less salt', 0, 0); ctx.restore();
        ctx.beginPath(); ctx.moveTo(30, 180); ctx.lineTo(300, 174); ctx.moveTo(30, 186); ctx.lineTo(300, 180); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(170, 258, 150, 24, -0.03, 0, 7); ctx.stroke();
      } else if (a.marks === 'torn') {
        ctx.strokeStyle = 'rgba(60,50,40,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(250, 0);
        for (let y = 0; y <= 392; y += 20) ctx.lineTo(250 + (y / 392) * 110 + (random() - 0.5) * 16, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(214,180,90,0.5)';
        for (const y of [70, 290]) { ctx.save(); ctx.translate(250 + (y / 392) * 110, y); ctx.rotate(1.3 + random() * 0.3); ctx.fillRect(-28, -70, 56, 140); ctx.restore(); }
      } else if (a.marks === 'scorched') {
        const burn = ctx.createRadialGradient(640, 392, 10, 640, 392, 250);
        burn.addColorStop(0, 'rgba(25,14,8,1)'); burn.addColorStop(0.35, 'rgba(70,38,14,0.92)'); burn.addColorStop(0.7, 'rgba(150,96,40,0.5)'); burn.addColorStop(1, 'rgba(170,120,60,0)');
        ctx.fillStyle = burn; ctx.fillRect(0, 0, 640, 392);
      }
      ctx.strokeStyle = 'rgba(120,100,70,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 640, 392);
    });
    const paper = new THREE.MeshStandardMaterial({ color: '#f1ead6', roughness: 0.9 });
    const cardFace = new THREE.MeshStandardMaterial({ map: cardArt, roughness: 0.85 });
    const hero = group();
    part(hero, new THREE.BoxGeometry(CW, CH, 0.0009), [paper, paper, paper, paper, cardFace, paper], 0, CH / 2, 0);

    // ---- the box ------------------------------------------------------------------------
    const grainArt = (base: string, dark: string) => paint(256, 256, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = dark; ctx.globalAlpha = 0.12 + random() * 0.22; ctx.lineWidth = 1 + random() * 2.5;
        const y = random() * 256; ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + (random() - 0.5) * 16, 170, y + (random() - 0.5) * 16, 256, y + (random() - 0.5) * 10); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (a.box === 'painted') for (let i = 0; i < 6 + mood.wear * 40; i++) { ctx.fillStyle = '#b89a6a'; ctx.beginPath(); ctx.ellipse(random() < 0.5 ? random() * 26 : 256 - random() * 26, random() * 256, 3 + random() * 9, 2 + random() * 6, random() * 3, 0, 7); ctx.fill(); }
    });
    const skin = a.box === 'pine' ? new THREE.MeshStandardMaterial({ map: grainArt('#e2c391', '#a9793c'), roughness: 0.7 })
      : a.box === 'painted' ? new THREE.MeshStandardMaterial({ map: grainArt('#93ad8c', '#6f8a6a'), roughness: 0.6 })
      : a.box === 'oak' ? new THREE.MeshStandardMaterial({ map: grainArt('#6a4526', '#2e1a0c'), roughness: 0.45 })
      : new THREE.MeshStandardMaterial({ color: '#e9c545', metalness: 0.5, roughness: 0.35 + mood.wear * 0.3 });
    const wall = a.box === 'tin' ? 0.0015 : T;
    const box = group();
    box.rotation.y = mix(-0.22, 0.22, random());
    part(box, new THREE.BoxGeometry(W, wall, D), skin, 0, wall / 2, 0);
    part(box, new THREE.BoxGeometry(W, H, wall), skin, 0, H / 2, -D / 2 + wall / 2);
    const frontHeight = H * 0.8;
    const front = part(box, new THREE.BoxGeometry(W, frontHeight, wall), skin, 0, frontHeight / 2, D / 2 - wall / 2);
    for (const x of [-1, 1]) {
      // side walls slope down toward the front so the cards can be thumbed
      const side = new THREE.Shape();
      side.moveTo(-D / 2, 0); side.lineTo(D / 2, 0); side.lineTo(D / 2, frontHeight); side.lineTo(-D / 2 + 0.02, H); side.lineTo(-D / 2, H); side.closePath();
      const geometry = new THREE.ExtrudeGeometry(side, { depth: wall, bevelEnabled: false });
      geometry.rotateY(-Math.PI / 2);
      geometry.computeBoundingBox();
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / D + 0.5, uv.getY(i) / H);
      part(box, geometry, skin, x * (W / 2 - wall / 2) + wall / 2, 0, 0);
    }
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a64e', metalness: 0.85, roughness: 0.3 });
    const faceZ = D / 2 + 0.0006;
    if (a.box === 'pine') {
      const dark = new THREE.MeshStandardMaterial({ color: '#b98d54', roughness: 0.7 });
      for (const x of [-1, 1]) for (let i = 0; i < 4; i++) part(box, new THREE.BoxGeometry(0.0072, 0.008, 0.0012), dark, x * (W / 2 - 0.0036), 0.01 + i * 0.017, faceZ);
    } else if (a.box === 'painted') {
      const decal = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#93ad8c'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#2f6a3f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(64, 120); ctx.quadraticCurveTo(54, 90, 64, 62); ctx.stroke();
        ctx.fillStyle = '#2f6a3f'; ctx.beginPath(); ctx.ellipse(44, 96, 18, 8, 0.6, 0, 7); ctx.ellipse(84, 90, 18, 8, -0.6, 0, 7); ctx.fill();
        ctx.fillStyle = mood.cheer > 0.5 ? '#e0483f' : '#d9a0a8';
        for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.arc(64 + Math.cos(p * 1.047) * 20, 44 + Math.sin(p * 1.047) * 20, 14, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#f2c84a'; ctx.beginPath(); ctx.arc(64, 44, 11, 0, 7); ctx.fill();
      });
      part(box, new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshStandardMaterial({ map: decal, roughness: 0.6 }), 0, frontHeight * 0.48, faceZ);
    } else if (a.box === 'oak') {
      part(box, new THREE.BoxGeometry(0.062, 0.026, 0.002), brass, 0, frontHeight * 0.55, faceZ);
      const tag = s.label('RECIPES', 0.054, 0.018, [0, 0, 0], '#3a2a18', '#efe6cf');
      box.add(tag); tag.position.set(0, frontHeight * 0.55, faceZ + 0.0012);
      part(box, new THREE.SphereGeometry(0.006, 12, 8), brass, 0, frontHeight * 0.22, faceZ + 0.003);
    } else {
      const tulips = paint(512, 256, (ctx) => {
        ctx.fillStyle = '#e9c545'; ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#b8322c'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, 484, 228);
        for (let i = 0; i < 5; i++) {
          const x = 76 + i * 90;
          ctx.strokeStyle = '#2f7a3c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, 226); ctx.lineTo(x, 120); ctx.stroke();
          ctx.fillStyle = '#2f7a3c'; ctx.beginPath(); ctx.ellipse(x - 18, 186, 9, 34, -0.4, 0, 7); ctx.ellipse(x + 18, 186, 9, 34, 0.4, 0, 7); ctx.fill();
          ctx.fillStyle = '#cf2f2a'; ctx.beginPath(); ctx.moveTo(x - 26, 70); ctx.quadraticCurveTo(x - 30, 130, x, 132); ctx.quadraticCurveTo(x + 30, 130, x + 26, 70); ctx.lineTo(x + 12, 96); ctx.lineTo(x, 66); ctx.lineTo(x - 12, 96); ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = `rgba(110,62,28,${0.4 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 256, 3 + random() * 12, 2 + random() * 7, random() * 3, 0, 7); ctx.fill(); }
      });
      part(box, new THREE.PlaneGeometry(W - 0.004, frontHeight - 0.004), new THREE.MeshStandardMaterial({ map: tulips, metalness: 0.4, roughness: 0.4 }), 0, frontHeight / 2, faceZ);
      front.visible = true;
    }
    if (a.box !== 'tin') {
      // hinged lid standing open behind
      const lid = group(box);
      lid.position.set(0, H, -D / 2);
      lid.rotation.x = -mix(1.75, 2.05, random());
      part(lid, new THREE.BoxGeometry(W + 0.004, T, D + 0.004), skin, 0, T / 2, (D + 0.004) / 2);
      part(lid, new THREE.BoxGeometry(W + 0.004, 0.018, T), skin, 0, -0.009 + T, D + 0.004 - T / 2);
      for (const x of [-1, 1]) part(box, new THREE.CylinderGeometry(0.003, 0.003, 0.022, 8), brass, x * W * 0.3, H, -D / 2 - 0.001).rotation.z = Math.PI / 2;
    }

    // ---- cards and dividers -------------------------------------------------------------
    const inside = D - wall * 2 - 0.004;
    const pitch = 0.00135;
    const count = Math.max(4, Math.round(mix(0.07, 1, a.complete) * inside / pitch));
    const lean = mix(0.62, 0.06, Math.min(1, a.complete * 1.15));
    const tones = ['#f6f1e0', '#efe6cc', '#f8f6ee', '#e9dcb8', '#e6ead8', '#f1dcd4'];
    const cards = new THREE.InstancedMesh(new THREE.BoxGeometry(CW, CH, 0.001), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const backZ = -D / 2 + wall + 0.003;
    const dividers = 5, tabs = ['#d9a441', '#c9655a', '#6f9a8a', '#7a8fc0', '#b98ab0'];
    let heroSlot = 0;
    for (let i = 0; i < count; i++) {
      const z = backZ + i * pitch;
      const up = (random() - 0.5) * 0.004;
      e.set(-lean + (random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.02 * (1 + mood.wear * 2));
      q.setFromEuler(e);
      // pivot at the bottom edge so leaning cards stay on the floor of the box
      const centre = new THREE.Vector3(0, CH / 2 + up, 0).applyQuaternion(q).add(new THREE.Vector3((random() - 0.5) * 0.004, wall + 0.001, z));
      matrix.compose(centre, q, new THREE.Vector3(1, 1, 1));
      cards.setMatrixAt(i, matrix);
      cards.setColorAt(i, new THREE.Color(tones[Math.floor(random() * (1 + mood.wear * (tones.length - 1)))]));
      const slot = Math.floor((i / count) * dividers);
      if (i === Math.floor((slot / dividers) * count) + (slot === 0 ? 0 : 0) && count > 8) {
        const divider = group(box);
        divider.position.set(0, wall + 0.001, z + pitch * 0.5);
        divider.rotation.x = -lean;
        const manila = new THREE.MeshStandardMaterial({ color: '#d9b877', roughness: 0.85 });
        part(divider, new THREE.BoxGeometry(CW + 0.002, CH + 0.003, 0.0012), manila, 0, (CH + 0.003) / 2, 0);
        part(divider, new THREE.BoxGeometry(0.03, 0.012, 0.0014), new THREE.MeshStandardMaterial({ color: tabs[slot % tabs.length], roughness: 0.7 }), -CW / 2 + 0.018 + slot * 0.0235, CH + 0.008, 0);
      }
      if (i === Math.floor(count * 0.55)) heroSlot = z;
    }
    cards.castShadow = cards.receiveShadow = true;
    box.add(cards);
    if (a.complete > 0.85) {
      // clippings and extra cards jammed in at angles
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const clip = part(box, new THREE.BoxGeometry(CW * mix(0.5, 0.9, random()), CH * mix(0.7, 1.1, random()), 0.0008), new THREE.MeshStandardMaterial({ color: i % 2 ? '#e3dcc6' : '#f3ecd6', roughness: 0.9 }), (random() - 0.5) * 0.03, CH * 0.62 + random() * 0.02, backZ + random() * inside * 0.9);
        clip.rotation.set(-lean + (random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.5);
      }
    }

    // ---- place the featured card ---------------------------------------------------------
    const peg = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      const wood = new THREE.MeshStandardMaterial({ color: '#d7b27a', roughness: 0.8 });
      const g = group(parent); g.position.set(x, y, z);
      for (const side of [-1, 1]) part(g, new THREE.BoxGeometry(0.008, 0.044, 0.004), wood, 0, 0.004, side * 0.004).rotation.x = side * -0.08;
      part(g, new THREE.TorusGeometry(0.005, 0.0012, 6, 12), new THREE.MeshStandardMaterial({ color: '#b9bcc0', metalness: 0.8, roughness: 0.3 }), 0, 0.012, 0).rotation.y = Math.PI / 2;
      return g;
    };
    if (a.where === 'propped') {
      const tilt = mix(0.26, 0.4, random());
      hero.rotation.set(-tilt, box.rotation.y + mix(-0.12, 0.12, random()), 0);
      hero.rotation.order = 'YXZ';
      const out = D / 2 + 0.004 + Math.sin(tilt) * CH * 0.92;
      hero.position.set(Math.sin(box.rotation.y) * out + mix(-0.01, 0.01, random()), 0.0005, Math.cos(box.rotation.y) * out);
    } else if (a.where === 'raised') {
      box.add(hero);
      hero.position.set(mix(-0.004, 0.004, random()), wall + CH * 0.5, heroSlot + 0.001);
      hero.rotation.set(-lean * 0.85, 0, mix(-0.12, 0.12, random()));
    } else if (a.where === 'flat') {
      hero.rotation.set(-Math.PI / 2, 0, mix(-0.3, 0.3, random()));
      hero.position.set(mix(-0.02, 0.02, random()), 0.001, D / 2 + 0.02 + CH);
      hero.rotation.order = 'YXZ';
    } else {
      // clipped to the top edge of the front wall and standing above it
      box.add(hero);
      const side = random() < 0.5 ? -1 : 1;
      hero.position.set(side * 0.004, frontHeight - 0.012, D / 2 + 0.0016);
      hero.rotation.set(0.1, 0, side * 0.04);
      peg(box, -side * 0.05, frontHeight - 0.006, D / 2 + 0.001).rotation.x = 0.1;
    }

    // ---- beside -------------------------------------------------------------------------
    const sideX = W / 2 + 0.05;
    if (a.beside === 'spoon') {
      const wood = new THREE.MeshStandardMaterial({ color: mix(0, 1, mood.wear) > 0.5 ? '#9a6f42' : '#c99c62', roughness: 0.85 });
      const spoon = group(); spoon.position.set(sideX + 0.01, 0.006, 0.02); spoon.rotation.y = mix(1.2, 1.9, random());
      part(spoon, new THREE.CylinderGeometry(0.005, 0.006, 0.2, 10), wood, 0, 0, 0).rotation.z = Math.PI / 2;
      part(spoon, new THREE.SphereGeometry(0.024, 14, 10), wood, 0.115, 0, 0).scale.set(1.35, 0.3, 1);
    } else if (a.beside === 'pencil') {
      const pencil = group(); pencil.position.set(sideX, 0.004, 0.05); pencil.rotation.y = mix(0.3, 1.2, random());
      part(pencil, new THREE.CylinderGeometry(0.0038, 0.0038, 0.07, 6), new THREE.MeshStandardMaterial({ color: '#e0b12e', roughness: 0.5 }), 0, 0, 0).rotation.z = Math.PI / 2;
      part(pencil, new THREE.ConeGeometry(0.0038, 0.012, 6), new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.8 }), 0.041, 0, 0).rotation.z = -Math.PI / 2;
      part(pencil, new THREE.CylinderGeometry(0.004, 0.004, 0.009, 8), new THREE.MeshStandardMaterial({ color: '#d98a8a', roughness: 0.8 }), -0.039, 0, 0).rotation.z = Math.PI / 2;
      const blank = paint(256, 160, (ctx) => {
        ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, 256, 160);
        ctx.strokeStyle = '#d8534a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(256, 32); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,140,200,0.55)'; for (let y = 52; y < 160; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
      });
      const card = part(s.root, new THREE.BoxGeometry(CW, 0.0009, CH), [paper, paper, new THREE.MeshStandardMaterial({ map: blank, roughness: 0.9 }), paper, paper, paper], sideX + 0.03, 0.0006, -0.02);
      card.rotation.y = mix(-0.4, 0.4, random());
    } else if (a.beside === 'clippings') {
      const news = paint(128, 192, (ctx) => {
        ctx.fillStyle = '#e4dcc4'; ctx.fillRect(0, 0, 128, 192);
        ctx.fillStyle = '#3a3835'; ctx.fillRect(10, 10, 108, 12);
        ctx.fillStyle = 'rgba(58,56,53,0.6)'; for (let y = 32; y < 184; y += 7) { ctx.fillRect(10, y, 50 - random() * 8, 3); ctx.fillRect(68, y, 50 - random() * 8, 3); }
      });
      const clipMaterial = new THREE.MeshStandardMaterial({ map: news, roughness: 0.95 });
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) {
        const clip = part(s.root, new THREE.BoxGeometry(0.07, 0.0005, 0.1), [paper, paper, clipMaterial, paper, paper, paper], sideX + 0.02 + random() * 0.03, 0.0006 + i * 0.0007, random() * 0.06 - 0.03);
        clip.rotation.y = random() * 3;
      }
      part(s.root, new THREE.TorusGeometry(0.016, 0.0014, 6, 20), new THREE.MeshStandardMaterial({ color: '#c8a05a', roughness: 0.7 }), -sideX - 0.01, 0.0016, 0.05).rotation.x = Math.PI / 2;
    } else if (a.beside === 'glasses') {
      const specs = group(); specs.position.set(-sideX - 0.02, 0, 0.05); specs.rotation.y = mix(-0.6, 0.6, random());
      const frame = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#8a4a2a' : '#2a2a2e', roughness: 0.4 });
      for (const x of [-1, 1]) {
        part(specs, new THREE.TorusGeometry(0.021, 0.0024, 6, 18), frame, x * 0.027, 0.023, 0);
        part(specs, new THREE.BoxGeometry(0.0024, 0.0024, 0.12), frame, x * 0.05, 0.026, -0.06).rotation.x = 0.2;
      }
      part(specs, new THREE.BoxGeometry(0.012, 0.0024, 0.0024), frame, 0, 0.03, 0);
    }

    return s.finish();
  },
});

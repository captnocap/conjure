import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PAINT = {
  black: 'Glossy black japan, the army-surplus standard.',
  green: 'Sea green, chipped at every corner.',
  blue: 'Deep navy blue.',
  maroon: 'Dark maroon, a wedding trunk.',
  silver: 'Unpainted galvanised steel with a spangled sheen.',
  floral: 'Sky blue with hand-painted roses on the front and lid.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINT, string> = { black: '#1d1f22', green: '#3f8a78', blue: '#1f3566', maroon: '#6e1f24', silver: '#aab0b2', floral: '#5fa4cf' };
const WHO = {
  migrant: 'A full name with village and post office, lettered by a signwriter for the journey to the city.',
  soldier: 'A rank, a name and a service number in stencilled white.',
  student: 'A name and a hostel room number in careful capitals.',
  bride: 'Two names joined by WEDS, with a little flourish, part of a dowry.',
  number: 'Only a painted number and a destination station.',
  blank: 'Nothing: the lettering has been painted out or never done.',
} as const;
const WHO_TEXT: Record<keyof typeof WHO, string[][]> = {
  migrant: [['RAMESH YADAV', 'VILL. & P.O. SITAPUR', 'DIST. GONDA  U.P.'], ['MD. SALIM SHAIKH', 'VILL. RAMPUR KALAN', 'P.O. BARHI  BIHAR'], ['S. B. PAWAR', 'AT POST KHED', 'DIST. RATNAGIRI']],
  soldier: [['No. 4471382', 'SEP. RAM SINGH', '9 KUMAON'], ['HAV. D. THAPA', 'No. 2290714', '3/4 G.R.']],
  student: [['S. KUMAR', 'HOSTEL No. 3', 'ROOM 117'], ['ANITA D\'SOUZA', 'GIRLS HOSTEL', 'ROOM 24']],
  bride: [['SUNITA', 'WEDS', 'RAJENDRA'], ['FARIDA', 'WEDS', 'IMRAN']],
  number: [['No. 17', 'TO: BOMBAY V.T.', '']],
  blank: [['', '', '']],
};

export default defineThing({
  questions: {
    colour: choice('What colour is the trunk?', PAINT),
    lettering: choice('Whose trunk is it, by the lettering?', WHO),
    piled: score('How much is piled on it?', ['Nothing', 'Just a water bottle', 'A bedroll and a water bottle', 'Bedroll, bundles, a bucket and an umbrella: a whole household']),
    state: choice('What state is the trunk in?', {
      locked: 'Shut and padlocked, ready to travel.',
      latched: 'Shut but unlocked, the hasp hanging loose.',
      open: 'Lid propped open, neatly packed, a picture pasted inside the lid.',
      burst: 'Burst open, lid thrown back and clothes spilling over the side.',
    }),
    rope: choice('How is it bound?', {
      none: 'No rope at all.',
      once: 'One loop of rope round the middle.',
      cross: 'Tightly cross-bound with rope, knotted on top.',
    }),
    size: choice('How big is it?', {
      small: 'A small tin box you could carry under one arm.',
      medium: 'A proper trunk for one person.',
      large: 'A huge family trunk that takes two to lift.',
    }),
    cornerFinish: choice('How are the body corners protected?', { plain: 'The original brass corner caps.', iron: 'Long dark iron angle plates.', rivets: 'Brass plates with large rivets.', leather: 'Brown leather corner patches with stitches.' }),
    handleForm: choice('What handles are fitted at the ends?', { rings: 'Hinged semicircular iron handles.', leather: 'Curved leather strap handles.', squared: 'Squared wire carrying handles.', rope: 'Knotted rope replacements.' }),
    hinges: choice('What hinges carry the lid?', { small: 'Two short strap hinges.', broad: 'Two broad hinge plates.', piano: 'A long continuous piano hinge.', triple: 'Three narrow brass hinges.' }),
    lidRibs: choice('What additional pressed ribs are on the outer lid?', { plain: 'The original edge ribs.', crosswise: 'Three narrow crosswise ribs.', centre: 'Two long central ribs.', diamond: 'A shallow diamond-shaped strengthening rib.' }),
    edgeBinding: choice('What finishes the body’s lower edge?', { plain: 'Plain painted steel.', iron: 'A broad dark iron band.', brass: 'A narrow bright brass strip.', studs: 'A line of closely spaced metal studs.' }),
    labelHolder: choice('What holder is fixed to the back?', { none: 'No label holder.', brass: 'A framed brass address window.', canvas: 'A canvas document pocket.', wire: 'A rectangular wire luggage-card holder.' }),
    lidStay: choice('If open, what supports the raised lid?', { straps: 'Two plain fabric retaining straps.', chain: 'Two short linked chains.', rods: 'A folding iron stay on each side.', one: 'A single leather strap on the right.' }),
    sidePocket: choice('What is attached to the lower end of the trunk?', { none: 'No attached storage.', pouch: 'A small buckled leather pouch.', mesh: 'A shallow mesh pocket.', brackets: 'Two empty metal bottle brackets.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const k = { small: 0.72, medium: 1, large: 1.3 }[a.size];
    const W = 0.9 * k, D = 0.5 * k, HB = 0.3 * k, HL = 0.09 * k, top = HB + HL;
    const shut = a.state === 'locked' || a.state === 'latched';

    const hex = PAINT_HEX[a.colour];
    const metal = a.colour === 'silver';
    const paint = s.material(hex, { metalness: metal ? 0.7 : 0.25, roughness: metal ? 0.4 : 0.42 });
    const inside = s.material('#b8b29e', { metalness: 0.3, roughness: 0.6 });
    const edge = s.material(new THREE.Color(hex).multiplyScalar(metal ? 0.75 : 0.6), { metalness: 0.5, roughness: 0.45 });
    const brass = s.material('#c09a3e', { metalness: 0.8, roughness: 0.3 });
    const iron = s.material('#3a3836', { metalness: 0.6, roughness: 0.5 });
    const ropeMaterial = s.material('#c2a468', { roughness: 1 });
    const textures: THREE.Texture[] = [];
    const lines = pick(WHO_TEXT[a.lettering]);
    const ink = a.colour === 'silver' ? '#1b1b1b' : a.lettering === 'bride' ? '#f2cf5a' : '#f3efe2';

    const face = (lid: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = lid ? 284 : 192;
      const ctx = canvas.getContext('2d')!;
      const h = canvas.height;
      ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, h);
      if (metal) for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '60,70,75'},${rnd(0.05, 0.22)})`; ctx.beginPath(); ctx.arc(random() * 512, random() * h, rnd(3, 12), 0, Math.PI * 2); ctx.fill(); }
      const rose = (x: number, y: number, r: number) => {
        ctx.fillStyle = '#2f7a3c';
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + d * r * 1.3, y + r * 0.5, r * 0.9, r * 0.4, d * 0.5, 0, Math.PI * 2); ctx.fill(); }
        for (let i = 4; i > 0; i--) { ctx.fillStyle = i % 2 ? '#d83a50' : '#f3a0ac'; ctx.beginPath(); ctx.arc(x + (i % 2) * 2, y, r * i / 4, 0, Math.PI * 2); ctx.fill(); }
      };
      if (a.colour === 'floral') { rose(40, h / 2, 26); rose(472, h / 2, 26); if (lid) { rose(256, 44, 24); rose(256, h - 44, 24); } }
      if (a.lettering === 'bride') { ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(100, 14, 312, h - 28); }
      // Hand lettering: every character brushed slightly out of true.
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const rows = lines.filter((line) => line);
      rows.forEach((line, row) => {
        const size = Math.min((lid ? 62 : 44) * (row === 0 || a.lettering === 'bride' ? 1 : 0.72), 560 / line.length);
        ctx.font = `bold ${size}px ${a.lettering === 'soldier' || a.lettering === 'number' ? 'monospace' : 'sans-serif'}`;
        const step = Math.min(size * 0.68, 360 / line.length), y = h / 2 + (row - (rows.length - 1) / 2) * (h / (rows.length + 0.6));
        [...line].forEach((char, i) => {
          ctx.save();
          ctx.translate(256 + (i - (line.length - 1) / 2) * step, y + rnd(-2.5, 2.5));
          ctx.rotate(rnd(-0.07, 0.07));
          ctx.fillText(char, 0, 0);
          ctx.restore();
        });
      });
      // Chips, scratches and rust, by wear.
      for (let i = 0; i < 12 + mood.wear * 160; i++) {
        ctx.fillStyle = random() < 0.55 ? `rgba(118,70,38,${rnd(0.3, 0.8)})` : `rgba(200,200,195,${rnd(0.2, 0.6)})`;
        const edgeBias = random() < 0.6;
        ctx.fillRect(edgeBias ? pick([rnd(0, 26), rnd(486, 512)]) : random() * 512, random() * h, rnd(2, 5 + mood.wear * 16), rnd(2, 4 + mood.wear * 10));
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, metalness: metal ? 0.6 : 0.2, roughness: 0.45 });
    };

    // ---- body --------------------------------------------------------------
    const wall = 0.012;
    if (shut) s.box([W, HB, D], [0, HB / 2, 0], paint);
    else {
      s.box([W, wall, D], [0, wall / 2 + 0.004, 0], inside);
      for (const z of [-1, 1]) s.box([W, HB, wall], [0, HB / 2, z * (D / 2 - wall / 2)], paint);
      for (const x of [-1, 1]) s.box([wall, HB, D], [x * (W / 2 - wall / 2), HB / 2, 0], paint);
    }
    s.mesh(new THREE.PlaneGeometry(W - 0.03 * k, HB - 0.03 * k), face(false), [0, HB / 2, D / 2 + 0.002]);
    // Pressed ribs, edge strips and corner caps.
    for (const x of [-0.43, 0.43]) { s.box([0.03 * k, HB, 0.008], [x * W, HB / 2, D / 2 + 0.004], edge); s.box([0.03 * k, HB, 0.008], [x * W, HB / 2, -D / 2 - 0.004], edge); }
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.022 * k, HB, 0.022 * k], [x * (W / 2), HB / 2, z * (D / 2)], edge);
      s.box([0.07 * k, 0.05 * k, 0.07 * k], [x * (W / 2 - 0.02 * k), 0.025 * k, z * (D / 2 - 0.02 * k)], brass);
    }
    for (const z of [-1, 1]) s.box([W + 0.01, 0.02 * k, 0.014], [0, HB - 0.012 * k, z * (D / 2 + 0.004)], edge);
    // End handles.
    for (const x of [-1, 1]) {
      const hx=x*(W/2+.012),hy=HB*.62;
      if(a.handleForm==='rings'){const handle=s.ring(.07*k,.009*k,[hx,hy,0],iron,Math.PI);handle.rotation.set(0,Math.PI/2,0);handle.rotation.z=Math.PI;handle.rotation.x=x*.5;}
      else if(a.handleForm==='squared')s.tube([[hx,hy,-.07*k],[hx+x*.055,hy-.05*k,-.07*k],[hx+x*.055,hy-.05*k,.07*k],[hx,hy,.07*k]],.008*k,iron);
      else{s.tube([[hx,hy,-.07*k],[hx+x*.06,hy-.065*k,0],[hx,hy,.07*k]],a.handleForm==='rope'?.012*k:.016*k,a.handleForm==='rope'?ropeMaterial:s.material('#865c39'));if(a.handleForm==='rope')for(const z of[-.07,.07])s.ball([.019*k,.019*k,.019*k],[hx,hy,z*k],ropeMaterial,8);}
      s.box([0.012, 0.03 * k, 0.2 * k], [x * (W / 2 + 0.006), HB * 0.64, 0], iron);
    }

    // ---- lid ---------------------------------------------------------------
    const lid = new THREE.Group();
    lid.position.set(0, HB, -D / 2);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D) => { parent.add(mesh); return mesh; };
    add(s.box([W + 0.016, HL, D + 0.016], [0, HL / 2, D / 2], paint), lid);
    const lidFace = add(s.mesh(new THREE.PlaneGeometry(W - 0.03 * k, D - 0.03 * k), face(true), [0, HL + 0.002, D / 2]), lid);
    lidFace.rotation.x = -Math.PI / 2;
    for (const x of [-0.43, 0.43]) add(s.box([0.03 * k, 0.01, D + 0.02], [x * W, HL + 0.004, D / 2], edge), lid);
    for (const x of [-1, 1]) for (const z of [0, 1]) add(s.box([0.06 * k, HL + 0.012, 0.06 * k], [x * (W / 2 - 0.016 * k), HL / 2, z * D + (z ? -0.016 : 0.016) * k], brass), lid);
    // Hasp on the lid front.
    const haspLoose = a.state !== 'locked';
    const hasp = add(s.box([0.05 * k, 0.11 * k, 0.008], [0, haspLoose && shut ? 0.03 * k : -0.01 * k, D + 0.014], brass), lid);
    if (haspLoose && shut) hasp.rotation.x = -0.5;
    if (!shut) {
      // Inside of the lid: bare metal with a pasted picture.
      const under = add(s.box([W - 0.03, 0.004, D - 0.03], [0, -0.001, D / 2], inside), lid);
      void under;
      if (a.state === 'open') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#f0e2b6'; ctx.fillRect(0, 0, 96, 96);
        ctx.fillStyle = pick(['#d8572f', '#3f6fb0', '#c23a6a']); ctx.fillRect(8, 8, 80, 80);
        ctx.fillStyle = '#f2c98a'; ctx.beginPath(); ctx.arc(48, 40, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4e9c8'; ctx.beginPath(); ctx.ellipse(48, 82, 26, 24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f2cf5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(48, 40, 24, 0, Math.PI * 2); ctx.stroke();
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
        const picture = add(s.mesh(new THREE.PlaneGeometry(0.16 * k, 0.16 * k), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [rnd(-0.2, 0.2) * W, -0.005, D / 2]), lid);
        picture.rotation.x = Math.PI / 2; picture.rotation.z = rnd(-0.1, 0.1);
      }
    }
    lid.rotation.x = a.state === 'open' ? -1.75 : a.state === 'burst' ? -2.35 + rnd(-0.2, 0.2) : 0;
    s.root.add(lid);
    // Staple, padlock and side latches on the body.
    s.box([0.03 * k, 0.03 * k, 0.02], [0, HB - 0.045 * k, D / 2 + 0.012], iron);
    if (a.state === 'locked') {
      s.box([0.055 * k, 0.05 * k, 0.022 * k], [0, HB - 0.1 * k, D / 2 + 0.026], brass);
      s.ring(0.02 * k, 0.006 * k, [0, HB - 0.07 * k, D / 2 + 0.026], iron, Math.PI);
    }
    for (const x of [-0.37, 0.37]) s.box([0.035 * k, 0.07 * k, 0.01], [x * W, HB - 0.02 * k, D / 2 + 0.008], iron);

    // ---- rope --------------------------------------------------------------
    const rr = 0.011 * k;
    const loopAcross = (x: number, h: number) => {
      const y1 = h + rr, z1 = D / 2 + 0.014 + rr;
      s.box([rr * 2, rr * 2, z1 * 2], [x, y1, 0], ropeMaterial);
      for (const z of [-1, 1]) s.box([rr * 2, y1, rr * 2], [x, y1 / 2, z * z1], ropeMaterial);
    };
    if (shut && a.rope !== 'none') {
      if (a.rope === 'once') loopAcross(rnd(-0.05, 0.05), top);
      else {
        loopAcross(-W * 0.2, top); loopAcross(W * 0.2, top);
        s.box([W + 0.06, rr * 2, rr * 2], [0, top + rr * 3, 0.02], ropeMaterial);
        for (const x of [-1, 1]) s.box([rr * 2, top + rr * 3, rr * 2], [x * (W / 2 + 0.03), (top + rr * 3) / 2, 0.02], ropeMaterial);
        s.ball([0.03 * k, 0.022 * k, 0.03 * k], [W * 0.2, top + rr * 3.4, 0.02], ropeMaterial, 8);
        s.rod([W * 0.2, top + rr * 3, 0.02], [W * 0.2 + 0.08 * k, top + 0.004, 0.1 * k], rr * 0.8, ropeMaterial);
      }
    } else if (!shut && a.rope !== 'none') {
      // Untied, the rope lies in a loose coil on the ground.
      for (let i = 0; i < 3; i++) s.ring((0.1 - i * 0.012) * k, rr, [-W / 2 - 0.2 * k, rr + i * rr * 1.6, D / 2 + 0.05], ropeMaterial).rotation.x = Math.PI / 2;
    }

    // ---- contents when open ------------------------------------------------
    const cloths = mood.cheer > 0.5 ? ['#d8402f', '#e9a820', '#2f7fc8', '#f1ece0', '#3c9a5c', '#c2479a'] : ['#7c4a40', '#8a7a52', '#48607a', '#b9b3a2', '#566b58', '#6a5568'];
    if (a.state === 'open') {
      for (let col = 0; col < 3; col++) {
        const n = 2 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) s.box([W * 0.27, HB * 0.2, D * 0.74], [(col - 1) * W * 0.3, wall+.004+HB*.2*(i+.5), rnd(-0.01, 0.01)], s.material(pick(cloths), { roughness: 1 }));
      }
    } else if (a.state === 'burst') {
      for (let i = 0; i < 7; i++) {
        const heap = s.ball([rnd(0.12, 0.2) * k, rnd(0.05, 0.09) * k, rnd(0.1, 0.16) * k], [rnd(-0.34, 0.34) * W, HB * rnd(0.55, 0.95), rnd(-0.1, 0.1) * D], s.material(pick(cloths), { roughness: 1 }), 10);
        heap.rotation.y = rnd(0, 3);
      }
      // A sleeve and a sari end trailing over the front and onto the ground.
      const trail = (x: number, colour: string, reach: number) => {
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(x, HB * 0.9, 0.05), new THREE.Vector3(x + 0.02, HB + 0.03, D / 2 + 0.01), new THREE.Vector3(x + 0.05, HB * 0.4, D / 2 + 0.05), new THREE.Vector3(x + 0.1, 0.012, D / 2 + 0.12), new THREE.Vector3(x + reach, 0.012, D / 2 + 0.3 * k + Math.abs(reach))]);
        const geometry = new THREE.TubeGeometry(path, 30, 0.05 * k, 6);
        const positions=geometry.getAttribute('position');for(let n=0;n<positions.count;n++)positions.setY(n,Math.max(.001,positions.getY(n)));positions.needsUpdate=true;geometry.computeVertexNormals();
        const mesh = s.mesh(geometry, s.material(colour, { roughness: 1 }));
        mesh.scale.set(1, 1, 1);
      };
      trail(-W * 0.22, pick(cloths), -0.2 * k); trail(W * 0.18, pick(cloths), 0.25 * k);
      // Small things flung out: a steel tumbler, a comb, a shoe.
      const tumbler = s.cylinder(0.035 * k, 0.03 * k, 0.09 * k, [W * 0.3 + 0.2 * k, 0.035 * k, D / 2 + 0.25 * k], s.material('#cfd4d4', { metalness: 0.85, roughness: 0.25 }), 12);
      tumbler.rotation.z = Math.PI / 2; tumbler.rotation.y = rnd(0, 3);
      s.box([0.1 * k, 0.045 * k, 0.26 * k], [-W * 0.4, 0.0225 * k, D / 2 + 0.3 * k], s.material('#3b2a20', { roughness: 0.7 })).rotation.y = rnd(-1, 1);
    }

    // ---- the pile ----------------------------------------------------------
    const level = a.piled < 0.17 ? 0 : a.piled < 0.42 ? 1 : a.piled < 0.78 ? 2 : 3;
    // Shut, things ride on the lid; open, they wait on the ground beside it.
    const px = shut ? 0 : W / 2 + 0.34, py = shut ? top+(a.rope==='cross'?rr*4:a.rope==='once'?rr*2:.002) : 0, pz = shut ? 0 : 0;
    const stripeTexture = () => {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const [c0, c1] = mood.cheer > 0.5 ? pick([['#d94b3a', '#f3ead2'], ['#2f6fb5', '#f3ead2'], ['#3f9a66', '#f1d77a']]) : pick([['#6a4a40', '#b3aa94'], ['#44566c', '#a9a694']]);
      ctx.fillStyle = c1; ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = c0; for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, rnd(5, 10), 64);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.repeat.set(3, 1); textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    };
    if (level >= 2) {
      const r = Math.min(0.15, D * 0.3), len = Math.min(0.78, W * 0.86);
      const roll = s.cylinder(r, r, len, [px, py + r, pz - (shut ? D * 0.12 : 0.1)], stripeTexture(), 20);
      roll.rotation.z = Math.PI / 2; roll.rotation.y = rnd(-0.08, 0.08);
      for (const x of [-0.28, 0.28]) { const strap = s.ring(r + 0.004, 0.008, [px + x * len, py + r, roll.position.z], ropeMaterial); strap.rotation.y = Math.PI / 2; }
      // The end of the roll shows its spiral.
      for (const x of [-1, 1]) s.ring(r * 0.5, 0.01, [px + x * (len / 2 + 0.002), py + r, roll.position.z], s.material('#d9d0b8', { roughness: 1 })).rotation.y = Math.PI / 2;
    }
    if (level >= 1) {
      const bx = px + (shut ? W * 0.32 : 0.05), bz = pz + (shut ? D * 0.26 : 0.2), bh = 0.24;
      s.cylinder(0.045, 0.045, bh, [bx, py + bh / 2, bz], s.material(mood.cheer > 0.5 ? '#3f8fd0' : '#7b8c96', { roughness: 0.35, metalness: 0.2 }), 14);
      s.cylinder(0.02, 0.04, 0.05, [bx, py + bh + 0.025, bz], s.material('#3f8fd0', { roughness: 0.4 }), 12);
      s.cylinder(0.024, 0.024, 0.03, [bx, py + bh + 0.06, bz], s.material('#f1eee4'), 12);
      s.ring(0.05, 0.006, [bx, py + bh + 0.03, bz], iron, Math.PI);
    }
    if (level >= 3) {
      const baseY = shut ? py + Math.min(0.15, D * 0.3) * 2 : 0;
      // A cloth bundle knotted at the top, a bucket of vessels and an umbrella.
      const bundle = s.ball([0.2, 0.16, 0.18], [px - (shut ? W * 0.12 : -0.05), baseY + 0.15, pz - (shut ? D * 0.1 : 0.45)], s.material(pick(cloths), { roughness: 1 }), 12);
      s.ball([0.05, 0.06, 0.05], [bundle.position.x, bundle.position.y + 0.17, bundle.position.z], bundle.material as THREE.Material, 8);
      const ux = shut ? -W / 2 - 0.26 : px + 0.45, uz = shut ? 0.08 : -0.1;
      s.cylinder(0.16, 0.12, 0.26, [ux, 0.13, uz], s.material('#cfd4d4', { metalness: 0.7, roughness: 0.35 }), 16);
      s.ring(0.15, 0.006, [ux, 0.3, uz], iron, Math.PI);
      s.ball([0.1, 0.06, 0.1], [ux, 0.27, uz], s.material('#b9bdbb', { metalness: 0.8, roughness: 0.3 }), 10);
      s.rod([shut ? -W * 0.42 : px - 0.2, py + 0.03, shut ? D * 0.36 : 0.36], [shut ? W * 0.1 : px + 0.45, py + 0.03, shut ? D * 0.4 : 0.42], 0.022, s.material('#17171a', { roughness: 0.8 }), 0.01);
      s.ring(0.03, 0.007, [shut ? -W * 0.42 - 0.03 : px - 0.23, py + 0.03, shut ? D * 0.36 : 0.36], s.material('#6b4a2c'), Math.PI).rotation.x = Math.PI / 2;
    }
    // A railway luggage label tied to the handle.
    if (mood.density > 0.4 || a.lettering === 'number') {
      const tag = s.box([0.07 * k, 0.11 * k, 0.003], [W / 2 + 0.03, HB * 0.36, 0.06], s.material('#e9d7a0', { roughness: 0.9 }));
      tag.rotation.set(0.1, Math.PI / 2 - 0.3, rnd(-0.3, 0.3));
    }

    if(a.cornerFinish!=='plain')for(const side of[-1,1])for(const face of[-1,1]){
      const mat=a.cornerFinish==='leather'?s.material('#8c6544'):a.cornerFinish==='iron'?iron:brass,x=side*(W/2-.035*k),z=face*(D/2+.012);
      s.box([.07*k,HB*.8,.012],[x,HB*.4,z],mat);
      if(a.cornerFinish==='rivets')for(const y of[.05,.18])s.ball([.009,.009,.006],[x,y*k,z+face*.008],brass,6);
      if(a.cornerFinish==='leather')for(let i=0;i<6;i++)s.box([.008,.003,.003],[x,HB*.1+i*HB*.11,z+face*.008],ropeMaterial);
    }
    const hn=a.hinges==='piano'?1:a.hinges==='triple'?3:2;
    for(let i=0;i<hn;i++){const x=hn===1?0:(i/(hn-1)-.5)*W*.65,w=a.hinges==='piano'?W*.9:a.hinges==='broad'?.13*k:.06*k;s.box([w,.075*k,.018],[x,HB,-D/2-.014],a.hinges==='triple'?brass:iron);s.cylinder(.015*k,.015*k,w,[x,HB,-D/2-.02],iron,10).rotation.z=Math.PI/2;}
    if(a.lidRibs==='crosswise')for(const z of[.2,.5,.8])lid.add(s.box([W*.82,.012,D*.035],[0,HL+.012,D*z],edge));
    else if(a.lidRibs==='centre')for(const x of[-.16,.16])lid.add(s.box([.025*k,.012,D*.92],[W*x,HL+.012,D/2],edge));
    else if(a.lidRibs==='diamond')lid.add(s.tube([[0,HL+.012,D*.08],[W*.34,HL+.012,D/2],[0,HL+.012,D*.92],[-W*.34,HL+.012,D/2],[0,HL+.012,D*.08]],.009*k,edge));
    if(a.edgeBinding!=='plain')for(const z of[-1,1]){
      const mat=a.edgeBinding==='brass'?brass:iron;s.box([W,.04*k,.012],[0,.035*k,z*(D/2+.014)],mat);
      if(a.edgeBinding==='studs')for(let i=0;i<16;i++)s.ball([.006*k,.006*k,.006*k],[-W*.45+i*W*.9/15,.035*k,z*(D/2+.024)],brass,6);
    }
    if(a.labelHolder!=='none'){
      const w=.24*k,h=.13*k,z=-D/2-.025,y=HB*.5;
      if(a.labelHolder==='canvas')s.box([w,h,.018],[0,y,z],s.material('#b2a082'));
      else{for(const dx of[-w/2,w/2])s.rod([dx,y-h/2,z],[dx,y+h/2,z],.005*k,a.labelHolder==='brass'?brass:iron);for(const dy of[-h/2,h/2])s.rod([-w/2,y+dy,z],[w/2,y+dy,z],.005*k,a.labelHolder==='brass'?brass:iron);}
      const card=s.label('BOMBAY',w*.85,h*.65,[0,y,z-.01],'#333a30','#ded3b4');card.rotation.y=Math.PI;
    }
    if(!shut)for(const side of(a.lidStay==='one'?[1]:[-1,1])){
      const x=side*(W/2-.025),start=new THREE.Vector3(x,HB-.025,D*.15),end=new THREE.Vector3(x,0,D*.72).applyEuler(lid.rotation).add(lid.position);
      if(a.lidStay==='chain'){for(let i=0;i<11;i++){const p=start.clone().lerp(end,i/10);const ring=s.ring(.012*k,.003*k,[p.x,p.y,p.z],iron);ring.rotation.y=i%2?Math.PI/2:0;}}
      else s.rod(start.toArray() as [number,number,number],end.toArray() as [number,number,number],a.lidStay==='rods'?.006*k:.009*k,a.lidStay==='rods'?iron:ropeMaterial);
    }
    if(a.sidePocket!=='none'){
      const x=-W/2-.025,y=HB*.3;
      if(a.sidePocket==='pouch'){s.box([.05,.12*k,.2*k],[x-.025,y,0],s.material('#795336'));s.box([.012,.1*k,.025*k],[x-.058,y,0],brass);}
      else if(a.sidePocket==='mesh'){for(let i=0;i<6;i++)s.rod([x-.045,y-.05*k,-.09*k+i*.036*k],[x-.045,y+.05*k,-.09*k+i*.036*k],.003,iron);for(const dy of[-.05,0,.05])s.rod([x-.045,y+dy*k,-.09*k],[x-.045,y+dy*k,.09*k],.003,iron);for(const z of[-.09,.09])s.rod([x,y-.05*k,z*k],[x-.045,y-.05*k,z*k],.004,iron);}
      else for(const z of[-.07,.07]){const ring=s.ring(.035*k,.006*k,[x-.04,y,z*k],iron);ring.rotation.x=Math.PI/2;s.rod([x,y,z*k],[x-.04,y,z*k],.006*k,iron);}
    }

    const thing = s.finish();
    return { ...thing, dispose: () => { thing.dispose(); for (const t of textures) t.dispose(); } };
  },
});

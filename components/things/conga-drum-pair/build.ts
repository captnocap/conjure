import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];
const PROFILE: readonly (readonly [number, number])[] = [[0.7, 0], [0.8, 0.12], [0.98, 0.3], [1.12, 0.5], [1.16, 0.64], [1.1, 0.8], [1.01, 0.93], [0.99, 1]];
const widthAt = (v: number) => { for (let i = 1; i < PROFILE.length; i++) if (v <= PROFILE[i][1]) { const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i]; return mix(r0, r1, (v - y0) / (y1 - y0)); } return 1; };

export default defineThing({
  questions: {
    finish: choice('How are the drums finished?', {
      natural: 'Varnished wooden staves, honey brown, every joint showing.',
      red: 'Fire-engine red lacquer with chrome hardware.',
      sunburst: 'Amber sunburst fading to black at head and foot.',
      painted: 'Hand-painted bands of zigzags and triangles in red, yellow, green and black.',
      blue: 'Sky-blue house paint with a white stripe, done at home.',
      black: 'Black fibreglass, a touring band\'s workhorses.',
    }),
    state: choice('What is happening with the drums?', {
      playing: 'Being played hard: the skins are a blur and the stand is shaking.',
      resting: 'Resting between sets, the claves laid across one skin.',
      split: 'One skin has split; a new hide and a tuning wrench wait on the ground.',
      lying: 'Packing up: one drum is off the stand and lying on its side.',
    }),
    stand: choice('What are they standing on?', {
      basket: 'A chrome double stand that lifts both drums off the ground.',
      floor: 'Straight on the ground, one tipped toward the player to let the sound out.',
      crates: 'Propped up on bricks and a plastic crate.',
    }),
    stool: choice('What does the player sit on?', {
      stool: 'A round wooden stool.',
      cajon: 'A cajon box drum, played between songs.',
      crate: 'An upturned beer crate with a folded cloth on it.',
      chair: 'A folding metal chair.',
    }),
    coins: choice('Is anything out for money?', {
      none: 'No; nobody is asking.',
      hat: 'A straw hat upturned on the ground with coins and a few notes in it.',
      tin: 'A dented tin can with a few coins.',
      cloth: 'A square of bright cloth with coins thrown onto it.',
    }),
    extra: choice('What else has been brought along?', {
      none: 'Only the cowbell and claves.',
      bongos: 'A pair of bongos.',
      shakers: 'Maracas and a ribbed gourd guiro with its scraper.',
      offering: 'An offering at the foot of the drums: a glass of rum, a cigar, flowers and a candle.',
    }),
    headMaterial: choice('What kind of heads are stretched over the drums?', {
      hide: 'Pale natural hide with a darker playing patch.',
      amber: 'Dark amber hide, translucent in the light.',
      synthetic: 'Smooth white synthetic heads with narrow dark perimeter lines.',
      mottled: 'Mottled natural skins with uneven darker patches.',
    }),
    tensionLugs: choice('How many tuning lugs tighten each head?', {
      four: 'Four widely spaced tension rods.',
      six: 'Six standard tuning lugs.',
      eight: 'Eight closely spaced tuning lugs.',
      ten: 'Ten fine rods make a dense hardware ring.',
    }),
    rim: choice('How is each head rim finished?', {
      rolled: 'A narrow rolled chrome hoop.',
      comfort: 'A broad rounded comfort rim.',
      low: 'A flat low-profile metal ring.',
      timber: 'A dark wooden counterhoop.',
    }),
    shellBands: choice('What reinforces the lower drum shells?', {
      pair: 'Two narrow metal bands around each shell.',
      triple: 'Three evenly separated reinforcing bands.',
      broad: 'A broad metal band encircles the waist.',
      bare: 'Bare staves with no extra bands.',
    }),
    bellRig: choice('How is the cowbell rig arranged?', {
      single: 'One cowbell on a plain upright post.',
      twin: 'A smaller second bell is clamped beside the first.',
      crossbar: 'A short crossbar carries the bell and a wooden block.',
      low: 'A compact bell rig sits lower beside the drums.',
    }),
    beaterStorage: choice('What holds the spare beaters?', {
      bare: 'Only the single beater rests against the bell stand.',
      cup: 'A narrow cylindrical stick cup clamps to the stand.',
      sling: 'A cloth stick sling hangs from the stand.',
      hooks: 'A pair of hooks hold two spare beaters.',
    }),
    carryingCase: choice('What carrying case is nearby?', {
      none: 'The cases have been left elsewhere.',
      padded: 'A soft upright padded drum bag.',
      roll: 'An empty canvas cover is rolled on the ground.',
      flight: 'A low metal-edged flight case with two latches.',
    }),
    playingSurface: choice('What defines the little performance space?', {
      ground: 'The instruments stand directly on the ground.',
      rug: 'A dark rectangular woven rug holds the arrangement.',
      boards: 'A low platform of close timber boards.',
      round: 'A shallow round mat with a bright woven border.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const chrome = s.material(a.finish === 'black' || mood.wear > 0.65 ? '#3a3c3e' : '#dfe3e4', { metalness: 0.85, roughness: mix(0.2, 0.6, mood.wear) });
    const steel = s.material('#c9cdd0', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1c1c1e', { roughness: 0.8 }), wood = s.material('#8a5a34'), brass = s.material('#c9a548', { metalness: 0.8, roughness: 0.35 });

    // Shell paint: staves, bursts and patterns live in one small canvas.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const base = { natural: '#b9772e', red: '#c81e1e', sunburst: '#e08a1e', painted: '#e9d9a8', blue: '#6fb4dc', black: '#1e1f22' }[a.finish];
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
    if (a.finish === 'natural' || a.finish === 'sunburst') for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${random() < 0.5 ? '255,220,160' : '60,30,10'},${random() * 0.16})`; ctx.fillRect(i * 25.6, 0, 25.6, 256);
      ctx.fillStyle = 'rgba(50,25,10,0.55)'; ctx.fillRect(i * 25.6, 0, 2, 256);
    }
    if (a.finish === 'sunburst') { const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(20,10,5,0.95)'); g.addColorStop(0.35, 'rgba(20,10,5,0)'); g.addColorStop(0.65, 'rgba(20,10,5,0)'); g.addColorStop(1, 'rgba(20,10,5,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256); }
    if (a.finish === 'blue') { ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 96, 512, 22); ctx.fillStyle = '#cf2027'; ctx.fillRect(0, 124, 512, 8); }
    if (a.finish === 'painted') {
      const hues = ['#c8201e', '#f0c020', '#2f8f4a', '#1c1c1e', '#2a5aa8'];
      [[20, 44], [84, 60], [164, 40], [210, 30]].forEach(([y, h], band) => {
        ctx.fillStyle = hues[(band + 3) % 5]; ctx.fillRect(0, y, 512, h);
        ctx.fillStyle = hues[band % 5];
        for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, y + h); ctx.lineTo(i * 32 + 16, y); ctx.lineTo(i * 32 + 32, y + h); ctx.fill(); }
      });
    }
    for (let i = 0; i < mood.wear * 50; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '230,220,200' : '40,30,20'},${0.15 + random() * 0.3})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() < 0.5 ? 200 + random() * 56 : random() * 256, 3 + random() * 16, 2 + random() * 9, random() * 3, 0, 6.3); ctx.fill(); }
    const skinMap = new THREE.CanvasTexture(canvas);
    skinMap.colorSpace = THREE.SRGBColorSpace;
    const shellPaint = new THREE.MeshStandardMaterial({ map: skinMap, roughness: a.finish === 'blue' || a.finish === 'painted' ? 0.7 : mix(0.2, 0.6, mood.wear), metalness: 0.05 });
    const hide = s.material({hide:'#e9dcba',amber:'#b07c39',synthetic:'#efefdf',mottled:'#d3bc91'}[a.headMaterial], { roughness: a.headMaterial==='synthetic'?0.45:0.8 }), palm = s.material(a.headMaterial==='amber'?'#86602e':a.headMaterial==='synthetic'?'#e5e6df':'#c9b48a', { roughness: 0.9 });

    interface Drum { root: THREE.Group; head: THREE.Mesh; r: number; h: number; hits: readonly number[] }
    const drum = (r: number, h: number, hits: readonly number[], torn: boolean): Drum => {
      const d = new Sculpture(context);
      d.lathe(PROFILE.map(([w, y]) => [w * r, y * h] as const), shellPaint);
      d.cylinder(r * 0.69, r * 0.69, 0.01, [0, 0.005, 0], dark, 20);
      const bands=a.shellBands==='bare'?[]:a.shellBands==='triple'?[.18,.44,.7]:a.shellBands==='broad'?[.5]:[.22,.6];
      for (const v of bands) d.mesh(new THREE.TorusGeometry(widthAt(v) * r + 0.002, a.shellBands==='broad'?.018:.006, 6, 32), chrome, [0, v * h, 0]).rotation.x = Math.PI / 2;
      const head = d.cylinder(r * 1.01, r * 1.01, 0.014, [0, h + 0.004, 0], hide, 28);
      const patch = d.cylinder(r * 0.55, r * 0.55, 0.002, [0, h + 0.012, 0], palm, 20);
      head.add(patch); patch.position.set(0, 0.008, 0);
      const rim=d.mesh(new THREE.TorusGeometry(r * 1.01 + 0.012, a.rim==='comfort'?.022:a.rim==='timber'?.016:.011, 8, 32), a.rim==='timber'?wood:chrome, [0, h - 0.012, 0]);rim.rotation.x = Math.PI / 2;if(a.rim==='low')rim.scale.z=.45;
      if(a.headMaterial==='synthetic'){const line=d.mesh(new THREE.TorusGeometry(r*.9,.002,4,32),dark,[0,h+.012,0]);line.rotation.x=Math.PI/2;}
      if(a.headMaterial==='mottled')for(let i=0;i<7;i++){const t=i*2.4,rr=r*(.25+(i%3)*.18);const mark=d.cylinder(.015+(i%2)*.008,.015,.001,[Math.cos(t)*rr,h+.012,Math.sin(t)*rr],palm,7);mark.rotation.y=t;}
      const lugs={four:4,six:6,eight:8,ten:10}[a.tensionLugs];
      for (let i = 0; i < lugs; i++) {
        const t = i / lugs * 6.283 + 0.3, top = r * 1.01 + 0.022, low = widthAt(0.76) * r + 0.012;
        d.rod([Math.cos(t) * top, h - 0.012, Math.sin(t) * top], [Math.cos(t) * low, h * 0.76, Math.sin(t) * low], 0.005, chrome);
        const plate = d.box([0.03, 0.07, 0.012], [Math.cos(t) * low, h * 0.74, Math.sin(t) * low], chrome);
        plate.rotation.y = Math.PI / 2 - t;
      }
      if (torn) {
        const rip = d.box([r * 1.3, 0.003, 0.018], [0.01, h + 0.013, 0.02], dark);
        rip.rotation.y = random() * 3;
        d.box([r * 0.5, 0.003, 0.012], [0.03, h + 0.013, -0.02], dark).rotation.y = rip.rotation.y + 0.9;
      }
      return { root: d.root, head, r, h, hits };
    };

    const lift = { basket: 0.24, floor: 0, crates: 0.3 }[a.stand];
    const small = drum(0.142, 0.74, [1, 0, 0, 1, 0, 0, 1, 0], false), big = drum(0.165, 0.77, [0, 0, 1, 0, 0, 1, 0, 1], a.state === 'split');
    const swap = random() < 0.5 ? -1 : 1;
    const spots: Record<'small' | 'big', P> = { small: [swap * -0.2, lift, 0.02], big: [swap * 0.21, lift, 0] };
    big.root.position.set(...spots.big);
    big.root.rotation.y = random() * 6;
    s.root.add(big.root);
    if (a.state === 'lying') {
      const holder = new THREE.Group();
      holder.position.set(swap * -0.75, 0.142 * 1.16, 0.45); holder.rotation.y = mix(0.3, 1.2, random()) * swap;
      small.root.rotation.z = Math.PI / 2; small.root.position.set(0.37, 0, 0);
      holder.add(small.root); s.root.add(holder);
      holder.updateMatrixWorld(true);holder.position.y-=new THREE.Box3().setFromObject(holder,true).min.y;
      s.box([0.1, 0.05, 0.08], [swap * -0.75, 0.025, 0.62], s.material('#a5553a'));
    } else {
      small.root.position.set(...spots.small);
      small.root.rotation.y = random() * 6;
      if (a.stand === 'floor') { small.root.rotation.set(0.12, 0, 0); small.root.position.y += 0.012; s.box([0.12, 0.03, 0.05], [spots.small[0], 0.012, 0.1], wood); }
      s.root.add(small.root);
      if(a.stand==='floor'){small.root.updateMatrixWorld(true);small.root.position.y-=new THREE.Box3().setFromObject(small.root,true).min.y;}
    }

    // Stand.
    if (a.stand === 'basket') {
      for (const key of ['small', 'big'] as const) {
        const [x, , z] = spots[key], r = key === 'small' ? 0.142 : 0.165;
        s.mesh(new THREE.TorusGeometry(widthAt(0.3) * r + 0.012, 0.011, 6, 28), chrome, [x, lift + 0.3 * 0.75, z]).rotation.x = Math.PI / 2;
        s.mesh(new THREE.TorusGeometry(r * 0.7, 0.011, 6, 24), chrome, [x, lift - 0.01, z]).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const t = i * 2.094 + (key === 'small' ? 0.5 : 1.6), ring = widthAt(0.3) * r + 0.012;
          s.rod([x + Math.cos(t) * ring, lift + 0.225, z + Math.sin(t) * ring], [x + Math.cos(t) * r * 0.7, lift - 0.01, z + Math.sin(t) * r * 0.7], 0.009, chrome);
          s.rod([x + Math.cos(t) * r * 0.7, lift - 0.01, z + Math.sin(t) * r * 0.7], [x + Math.cos(t) * (r + 0.16), 0.015, z + Math.sin(t) * (r + 0.16)], 0.011, chrome);
          s.ball([0.02, 0.016, 0.02], [x + Math.cos(t) * (r + 0.16), 0.014, z + Math.sin(t) * (r + 0.16)], dark, 8);
        }
      }
      s.rod([spots.small[0], lift - 0.01, 0], [spots.big[0], lift - 0.01, 0], 0.012, chrome);
    } else if (a.stand === 'crates') {
      const [bx, , bz] = spots.big, [sx, , sz] = spots.small;
      const crate = s.material(pick(['#c22d2a', '#e0a81c', '#1d4f9a', '#2b6a3c']), { roughness: 0.7 });
      s.box([0.42, 0.3, 0.32], [bx, 0.15, bz], crate);
      for (const dx of [-0.13, 0, 0.13]) s.box([0.09, 0.08, 0.325], [bx + dx, 0.17, bz], dark);
      for (let level = 0; level < 4; level++) for (const k of [-1, 1]) s.box([0.22, 0.073, 0.1], level % 2 ? [sx + k * 0.07, 0.037 + level * 0.075, sz] : [sx, 0.037 + level * 0.075, sz + k * 0.07], s.material(pick(['#a5553a', '#b8654a', '#9a4a34']), { roughness: 1 })).rotation.y = (level % 2 ? Math.PI / 2 : 0) + (random() - 0.5) * 0.1;
    }

    // Cowbell on a post, with its beater.
    const cx = swap * 0.55, cz = 0.12, bellY = lift + (a.bellRig==='low'?.62:.84);
    s.cylinder(0.012, 0.012, bellY, [cx, bellY / 2, cz], chrome, 8);
    for (let i = 0; i < 3; i++) s.rod([cx, 0.2, cz], [cx + Math.cos(i * 2.094 + 0.4) * 0.22, 0.01, cz + Math.sin(i * 2.094 + 0.4) * 0.22], 0.009, chrome);
    const bell = new Sculpture(context);
    bell.root.position.set(cx, bellY, cz);
    const bellBody = bell.mesh(new THREE.CylinderGeometry(0.058, 0.03, 0.2, 4, 1, false), bell.material(mood.wear > 0.5 ? '#5a4a3a' : '#2a2a2c', { metalness: 0.7, roughness: 0.5 }), [0, 0.02, 0.1]);
    bellBody.rotation.set(Math.PI / 2 + 0.25, Math.PI / 4, 0, 'YXZ'); bellBody.scale.set(1, 1, 0.55);
    bell.rod([0, 0, 0], [0, 0.02, 0.03], 0.012, chrome);
    s.root.add(bell.root);
    if(a.bellRig==='twin'){
      s.rod([cx,bellY-.04,cz],[cx+swap*.18,bellY-.04,cz],.012,chrome);
      const second=s.mesh(new THREE.CylinderGeometry(.045,.025,.15,4),dark,[cx+swap*.18,bellY,cz+.08]);second.rotation.set(Math.PI/2+.25,Math.PI/4,0,'YXZ');second.scale.z=.6;
    }else if(a.bellRig==='crossbar'){
      s.rod([cx-swap*.12,bellY-.04,cz],[cx+swap*.29,bellY-.04,cz],.012,chrome);
      s.box([.14,.07,.11],[cx+swap*.22,bellY+.005,cz],wood);s.box([.12,.016,.012],[cx+swap*.22,bellY+.006,cz+.061],dark);
    }
    if(a.beaterStorage!=='bare'){
      const x=cx+swap*.1,y=bellY-.38;
      s.rod([cx,y,cz],[x,y,cz],.01,chrome);
      if(a.beaterStorage==='cup')s.lathe([[0,0],[.04,0],[.044,.19],[.038,.19],[.034,.012],[0,.012]],dark,[x,y-.08,cz]);
      else if(a.beaterStorage==='sling'){s.box([.075,.19,.05],[x,y+.015,cz],s.material('#817250'));s.tube([[x-.025,y+.11,cz],[cx,y+.18,cz],[x+.025,y+.11,cz]],.005,wood);}
      else for(const dz of[-.04,.04]){
        s.tube([[cx,y+.12,cz+dz],[x,y+.12,cz+dz],[x,y+.08,cz+dz],[x+swap*.024,y+.08,cz+dz],[x+swap*.024,y+.11,cz+dz]],.008,chrome);
        s.rod([x+swap*.012,y+.096,cz+dz-.14],[x+swap*.012,y+.096,cz+dz+.14],.008,wood);
      }
      if(a.beaterStorage!=='hooks')for(const dz of[-.014,.014])s.rod([x,y-.06,cz+dz],[x+swap*.015,y+.28,cz+dz],.007,wood);
    }
    s.rod([cx - swap * 0.08, lift + 0.5, cz + 0.02], [cx - swap * 0.02, bellY - 0.06, cz + 0.03], 0.009, wood);

    // Claves.
    const claveWood = s.material('#7a3a1e', { roughness: 0.35 });
    const clavesAt = (x: number, y: number, z: number) => {
      const yaw = random() * 3;
      s.rod([x - Math.cos(yaw) * 0.1, y + 0.012, z - Math.sin(yaw) * 0.1], [x + Math.cos(yaw) * 0.1, y + 0.012, z + Math.sin(yaw) * 0.1], 0.012, claveWood);
      s.rod([x - Math.cos(yaw + 1.1) * 0.1, y + 0.034, z - Math.sin(yaw + 1.1) * 0.1], [x + Math.cos(yaw + 1.1) * 0.1, y + 0.036, z + Math.sin(yaw + 1.1) * 0.1], 0.012, claveWood);
    };

    // The player's seat.
    const sz = -0.62, sx = (random() - 0.5) * 0.12, seatStart=s.root.children.length;
    let seatY = 0.5;
    if (a.stool === 'stool') {
      s.cylinder(0.17, 0.17, 0.04, [sx, 0.5, sz], wood, 20);
      for (let i = 0; i < 4; i++) { const t = i * 1.571 + 0.6; s.rod([sx + Math.cos(t) * 0.2, 0, sz + Math.sin(t) * 0.2], [sx + Math.cos(t) * 0.11, 0.49, sz + Math.sin(t) * 0.11], 0.018, wood); }
      s.mesh(new THREE.TorusGeometry(0.15, 0.01, 6, 20), wood, [sx, 0.2, sz]).rotation.x = Math.PI / 2;
      seatY = 0.52;
    } else if (a.stool === 'cajon') {
      s.box([0.3, 0.48, 0.3], [sx, 0.24, sz], s.material('#b98a52'));
      s.box([0.3, 0.48, 0.006], [sx, 0.24, sz + 0.153], s.material(pick(['#d9b77a', '#8a2f2a', '#2f5a6a'])));
      s.cylinder(0.055, 0.055, 0.004, [sx + 0.152, 0.3, sz], dark, 16).rotation.z = Math.PI / 2;
      seatY = 0.48;
    } else if (a.stool === 'crate') {
      s.box([0.42, 0.3, 0.32], [sx, 0.15, sz], s.material(pick(['#c22d2a', '#e0a81c', '#1d4f9a'])));
      for (const dx of [-0.13, 0, 0.13]) s.box([0.09, 0.08, 0.325], [sx + dx, 0.17, sz], dark);
      s.box([0.36, 0.04, 0.28], [sx, 0.32, sz], s.material(pick(['#b89a6a', '#7d8a5c', '#a84a4a']), { roughness: 1 }));
      seatY = 0.34;
    } else {
      const metal = s.material('#6f7f8c', { metalness: 0.5, roughness: 0.5 });
      s.box([0.38, 0.02, 0.36], [sx, 0.44, sz], metal);
      s.box([0.38, 0.16, 0.02], [sx, 0.78, sz - 0.2], metal).rotation.x = -0.12;
      for (const x of [-0.2, 0.2]) { s.rod([sx + x, 0, sz + 0.22], [sx + x, 0.88, sz - 0.22], 0.011, steel); s.rod([sx + x, 0, sz - 0.24], [sx + x, 0.44, sz + 0.18], 0.011, steel); }
      seatY = 0.45;
    }

    const seatGroup=new THREE.Group();for(const child of s.root.children.slice(seatStart))seatGroup.add(child);s.root.add(seatGroup);
    seatGroup.updateMatrixWorld(true);const seatCorrection=-new THREE.Box3().setFromObject(seatGroup,true).min.y;seatGroup.position.y+=seatCorrection;seatY+=seatCorrection;
    if (a.state === 'resting') clavesAt(spots.big[0], lift + 0.77 + 0.012, spots.big[2]);
    else if (a.extra === 'bongos') clavesAt(-swap * 0.45, 0, -0.35);
    else clavesAt(sx, seatY, sz);
    if (a.state === 'split') {
      s.cylinder(0.05, 0.05, 0.42, [swap * 0.75, 0.05, 0.5], hide, 14).rotation.set(0, 0.5, Math.PI / 2);
      s.cylinder(0.02, 0.02, 0.425, [swap * 0.75, 0.05, 0.5], palm, 10).rotation.set(0, 0.5, Math.PI / 2);
      s.rod([swap * 0.45, 0.012, 0.55], [swap * 0.6, 0.012, 0.68], 0.008, steel);
      s.rod([swap * 0.43, 0.012, 0.58], [swap * 0.48, 0.012, 0.52], 0.008, steel);
    }

    // Money.
    const mx = -swap * 0.15 + (random() - 0.5) * 0.2, mz = 0.72;
    const coins = (count: number, y: number, spread: number) => { for (let i = 0; i < count; i++) s.cylinder(0.013, 0.013, 0.003, [mx + (random() - 0.5) * spread, y + i * 0.0005, mz + (random() - 0.5) * spread], random() < 0.6 ? brass : steel, 10); };
    const tips = Math.round(mix(2, 14, mood.cheer * 0.6 + mood.density * 0.4));
    if (a.coins === 'hat') {
      const straw = new THREE.MeshStandardMaterial({ color: '#dcc48a', roughness: 1, side: THREE.DoubleSide });
      s.lathe([[0, 0.005], [0.085, 0.005], [0.105, 0.1], [0.2, 0.115], [0.215, 0.125]], straw, [mx, 0, mz]);
      s.mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 20), s.material('#2a2a2c'), [mx, 0.09, mz]).rotation.x = Math.PI / 2;
      coins(tips, 0.012, 0.11);
      for (let i = 0; i < Math.floor(tips / 5); i++) s.box([0.11, 0.003, 0.05], [mx + (random() - 0.5) * 0.06, 0.02 + i * 0.004, mz + (random() - 0.5) * 0.06], s.material(pick(['#9cc7a0', '#d99aa0', '#a9b9d8']))).rotation.y = random() * 3;
    } else if (a.coins === 'tin') {
      s.lathe([[0, 0.004], [0.05, 0.004], [0.052, 0.12]], new THREE.MeshStandardMaterial({ color: '#b9bdbd', metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide }), [mx, 0, mz]);
      s.cylinder(0.0525, 0.0525, 0.07, [mx, 0.06, mz], s.material(pick(['#b3352b', '#e3b62c', '#2f6f8f'])), 16);
      coins(Math.min(tips, 4), 0.006, 0.07);
    } else if (a.coins === 'cloth') {
      s.box([0.42, 0.006, 0.42], [mx, 0.003, mz], s.material(pick(['#c8201e', '#f0c020', '#2a5aa8', '#f4f1e8']), { roughness: 1 })).rotation.y = random();
      coins(tips, 0.008, 0.3);
    }

    // Extras.
    if (a.extra === 'bongos') {
      const onStool = a.state !== 'playing';
      const bx = onStool ? sx : -swap * 0.7, by = onStool ? seatY : 0, bz = onStool ? sz : -0.1;
      for (const [k, r] of [[-1, 0.09], [1, 0.11]] as const) {
        s.cylinder(r, r * 0.86, 0.17, [bx + k * 0.115, by + 0.085, bz], shellPaint, 20);
        s.cylinder(r * 1.02, r * 1.02, 0.012, [bx + k * 0.115, by + 0.172, bz], hide, 20);
        s.mesh(new THREE.TorusGeometry(r * 1.03, 0.007, 6, 20), chrome, [bx + k * 0.115, by + 0.16, bz]).rotation.x = Math.PI / 2;
      }
      s.box([0.06, 0.08, 0.06], [bx, by + 0.1, bz], wood);
    } else if (a.extra === 'shakers') {
      const gx = -swap * 0.7, gz = 0.05;
      for (const k of [0, 1]) {
        const t = random() * 3, x = gx + k * 0.16, z = gz + k * 0.12;
        s.ball([0.05, 0.05, 0.062], [x, 0.05, z], s.material(pick(['#c8201e', '#f0c020', '#2f8f4a', '#8a5a34'])), 12).rotation.y = t;
        s.rod([x, 0.04, z], [x + Math.cos(t) * 0.16, 0.02, z + Math.sin(t) * 0.16], 0.011, wood);
      }
      const gourd = s.lathe([[0, 0], [0.03, 0.02], [0.055, 0.12], [0.05, 0.24], [0.022, 0.34], [0.012, 0.4], [0, 0.4]], s.material('#c99a4a', { roughness: 0.5 }), [gx - 0.1, 0.055, gz - 0.25]);
      gourd.rotation.set(0, 0.4, Math.PI / 2);
      for (let i = 0; i < 9; i++) s.mesh(new THREE.TorusGeometry(0.053, 0.004, 4, 14), dark, [gx - 0.1 - 0.1 - i * 0.017, 0.055, gz - 0.25 + 0.045 + i * 0.0072]).rotation.y = Math.PI / 2 + 0.4;
      s.rod([gx - 0.3, 0.008, gz - 0.05], [gx - 0.05, 0.008, gz - 0.1], 0.004, steel);
    } else if (a.extra === 'offering') {
      const ox = swap * 0.05, oz = 0.42;
      s.cylinder(0.03, 0.024, 0.07, [ox, 0.035, oz], s.material('#dfe9ea', { roughness: 0.15 }), 12);
      s.cylinder(0.027, 0.024, 0.04, [ox, 0.03, oz], s.material('#a8581c', { roughness: 0.3 }), 12);
      s.rod([ox + 0.1, 0.012, oz + 0.02], [ox + 0.22, 0.012, oz - 0.04], 0.011, s.material('#5c3a1e'));
      s.cylinder(0.018, 0.02, 0.12, [ox - 0.12, 0.06, oz + 0.03], s.material('#f1ead4'), 10);
      s.ball([0.012, 0.022, 0.012], [ox - 0.12, 0.14, oz + 0.03], s.material('#ffb02a', { emissive: '#ff8a10', emissiveIntensity: 2 }), 8);
      for (let i = 0; i < 7; i++) s.ball([0.03, 0.022, 0.03], [ox + (random() - 0.5) * 0.3, 0.02, oz + 0.1 + random() * 0.1], s.material(pick(['#f4f1e8', '#f0c020', '#e8322a', '#e83fa0'])), 8);
    }
    if(a.carryingCase!=='none'){
      const x=1.05,z=-.5,cloth=s.material('#5c655b'),caseStart=s.root.children.length;
      if(a.carryingCase==='padded'){
        s.cylinder(.22,.2,.74,[x,.37,z],cloth,16);for(const y of[.08,.65])s.ring(.2+.02*y/.74,.008,[x,y,z],dark).rotation.x=Math.PI/2;
        s.tube([[x-.07,.72,z],[x-.07,.81,z],[x+.07,.81,z],[x+.07,.72,z]],.012,dark);
      }else if(a.carryingCase==='roll'){
        s.cylinder(.09,.09,.55,[x,.09,z],cloth,16).rotation.z=Math.PI/2;
        for(const dx of[-.17,.17])s.ring(.092,.009,[x+dx,.09,z],dark).rotation.y=Math.PI/2;
      }else{
        s.box([.65,.32,.43],[x,.16,z],dark);
        for(const y of[.015,.305])for(const side of[-1,1])s.box([.65,.025,.018],[x,y,z+side*.212],steel);
        for(const dx of[-.315,.315])for(const side of[-1,1])s.box([.025,.32,.018],[x+dx,.16,z+side*.212],steel);
        for(const dx of[-.2,.2])s.box([.045,.075,.018],[x+dx,.25,z+.225],chrome);
        s.tube([[x-.08,.32,z],[x-.08,.38,z],[x+.08,.38,z],[x+.08,.32,z]],.009,chrome);
      }
      const carryingCase=new THREE.Group();for(const child of s.root.children.slice(caseStart))carryingCase.add(child);s.root.add(carryingCase);carryingCase.updateMatrixWorld(true);carryingCase.position.y-=new THREE.Box3().setFromObject(carryingCase,true).min.y;
    }
    if(a.playingSurface!=='ground'){
      const group=new THREE.Group();for(const child of[...s.root.children])group.add(child);s.root.add(group);
      group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group,true),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      const height=a.playingSurface==='boards'?.045:.015;group.position.y+=height-box.min.y;
      if(a.playingSurface==='round'){
        const radius=Math.hypot(size.x/2,size.z/2)+.08;s.cylinder(radius,radius,height,[center.x,height/2,center.z],s.material('#677462'),40);
        s.ring(radius-.035,.012,[center.x,height,center.z],s.material('#b18e55')).rotation.x=Math.PI/2;
      }else if(a.playingSurface==='rug'){
        s.box([size.x+.16,height,size.z+.16],[center.x,height/2,center.z],s.material('#765649'));
        for(const side of[-1,1])s.box([size.x+.12,.002,.022],[center.x,height+.001,center.z+side*(size.z/2+.045)],s.material('#c2ac75'));
      }else{
        const count=Math.ceil((size.x+.16)/.16),width=(size.x+.16)/count;
        for(let i=0;i<count;i++)s.box([width-.005,height,size.z+.16],[center.x-size.x/2-.08+width*(i+.5),height/2,center.z],s.material(i%3?'#9e855c':'#857454'));
      }
    }

    const playing = a.state === 'playing', tempo = mix(1.4, 3.6, mood.energy), bellRest = bell.root.rotation.z;
    const drums = [small, big];
    const rest = drums.map((d) => ({ y: d.head.position.y, rz: d.root.rotation.z, rx: d.root.rotation.x }));
    return s.finish({
      update: playing ? (_dt, time) => {
        const beat = time * tempo * 2;
        drums.forEach((d, index) => {
          const step = Math.floor(beat) % 8, since = beat - Math.floor(beat);
          const pulse = d.hits[step] ? Math.exp(-since * 5) : d.hits[(step + 7) % 8] ? Math.exp(-(since + 1) * 5) : 0;
          d.head.position.y = rest[index].y + Math.sin(time * 90 + index) * 0.006 * pulse;
          d.head.scale.set(1 + pulse * 0.03, 1 + pulse * 1.5, 1 + pulse * 0.03);
          d.root.rotation.z = rest[index].rz + Math.sin(time * 40) * 0.012 * pulse;
        });
        bell.root.rotation.z = bellRest + Math.sin(time * tempo * Math.PI) * 0.05;
      } : undefined,
    });
  },
});

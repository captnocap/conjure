import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SHAPES = {
  mixed: 'A jumble of every shape the workshop makes.',
  teardrop: 'Onion-domed teardrops, swelling low and tapering to a point.',
  cylinder: 'Straight pierced drums under little domes.',
  square: 'Four-sided glass-paned lanterns with pyramid roofs.',
  star: 'Many-pointed glass stars, all spikes.',
  globe: 'Round pierced balls like metal fruit.',
} as const;
type Shape = Exclude<keyof typeof SHAPES, 'mixed'>;
const ALL: Shape[] = ['teardrop', 'cylinder', 'square', 'star', 'globe'];

const GLASS = { amber: '#ffab2e', ruby: '#e62a3c', cobalt: '#2f66ea', emerald: '#1fb46c', clear: '#ffe9b8' };
const JEWELS = ['#ffab2e', '#e62a3c', '#2f66ea', '#1fb46c', '#b24ae0', '#19b9c4'];
const METAL = { brass: '#c9973a', copper: '#b8693d', silver: '#c5c9cc', iron: '#45413d' };

export default defineThing({
  questions: {
    shape: choice('What shape are the lanterns?', SHAPES),
    piercing: choice('What pattern is cut through the metal skins?', {stars:'Rows of eight-point star openings.',dots:'Bands of small round punched holes.',diamonds:'A lattice of elongated diamond openings.',slots:'Narrow vertical slits with round end holes.'}),
    crown: choice('What ornament tops each lantern?', {point:'A pointed metal finial.',ball:'A small round bead finial.',leaf:'A paired leaf-shaped finial.',disc:'A small perforated disk finial.'}),
    foot: choice('What supports each lantern base?', {ring:'A broad circular foot ring.',pads:'Three small rounded foot pads.',legs:'Three short splayed metal feet.',plinth:'A low polygonal base plate.'}),
    joinery: choice('How are the metal skins joined?', {rolled:'A rolled seam along one side.',rivets:'A line of small round rivet heads.',straps:'Two slim metal reinforcing straps.',plain:'Plain joined edges with no extra hardware.'}),
    suspension: choice('If lanterns hang, what suspends them?', {wire:'A single slim dark wire.',chain:'A chain of linked metal rings.',cord:'A pale knotted cord.',double:'Two parallel suspension wires.'}),
    rank: choice('How are the floor lanterns arranged?', {straight:'Even ranks facing the viewer.',arc:'A shallow arc of lanterns.',stagger:'Alternating forward and backward positions.',pairs:'Small pairs gather with gaps between them.'}),
    surface: choice('What surface carries the display?', {bare:'The bare ground.',rug:'A low woven display mat.',stone:'A shallow stone display slab.',boards:'A low platform of individual wooden boards.'}),
    glass: choice('What colour is the glass and the glow behind the piercing?', {
      amber: 'Honey amber, candle-warm.',
      ruby: 'Deep ruby red.',
      cobalt: 'Majorelle cobalt blue.',
      emerald: 'Bottle emerald green.',
      jewel: 'Every lantern a different jewel colour.',
      clear: 'Plain clear glass with a pale flame glow.',
    }),
    metal: choice('What metal are they made of?', {
      brass: 'Bright yellow brass.',
      copper: 'Reddish hammered copper.',
      silver: 'Pale nickel silver.',
      iron: 'Blackened iron, heavy and plain.',
    }),
    lit: score('How many of the lanterns are lit?', ['None, cold metal in daylight', 'One alone', 'About half', 'Every one glowing']),
    hung: score('Where are most of them?', ['All standing on the ground', 'Half hung, half standing', 'Nearly all hanging overhead']),
    flaw: choice('Is one of them different from the rest?', {
      none: 'No, all finished and whole.',
      dented: 'One is dented and leaning, knocked about and unsold.',
      unfinished: 'One is unfinished: blank unpierced metal with the hammer and punch left beside it.',
      fallen: 'One has dropped from its chain and lies on its side.',
    }),
    stand: choice('What do the hanging ones hang from?', {
      iron: 'A black wrought-iron rack with scrolled corners.',
      cedar: 'A rough cedar beam on two posts.',
      bamboo: 'Pale bamboo poles lashed together.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metalColour = new THREE.Color(METAL[a.metal]).lerp(new THREE.Color('#5d6b55'), mood.wear * 0.35);
    const plain = new THREE.MeshStandardMaterial({ color: metalColour, metalness: 0.75, roughness: mix(0.3, 0.7, mood.wear) });
    const blank = new THREE.MeshStandardMaterial({ color: metalColour.clone().multiplyScalar(0.8), metalness: 0.5, roughness: 0.75 });
    const glowPower = mix(1.1, 2.2, mood.cheer);

    const sheet = (glow: boolean, hole: string, inverse=false) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = inverse?'#ffffff':glow ? '#000000' : `#${metalColour.getHexString()}`;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = inverse?'#000000':glow ? '#ffffff' : hole;
      const dot = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
      for (let i = 0; i < 8; i++) {
        const x = i * 32 + 16;
        for (const y of [20, 236]) dot(x, y, 7);
        for (const y of [52, 204]) dot(x + 16, y, 9);
        if(a.piercing==='stars'){g.save();g.translate(x,128);for(let k=0;k<2;k++){g.rotate(Math.PI/4);g.fillRect(-13,-13,26,26);}g.restore();dot(x+16,92,6);dot(x+16,164,6);}
        else if(a.piercing==='dots')for(const y of[82,108,134,160,182])dot(x+(y%3?0:14),y,5);
        else if(a.piercing==='diamonds')for(const y of[90,128,166]){g.beginPath();g.moveTo(x,y-15);g.lineTo(x+8,y);g.lineTo(x,y+15);g.lineTo(x-8,y);g.closePath();g.fill();}
        else{g.fillRect(x-3,86,6,82);dot(x,80,5);dot(x,174,5);}
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      if (!glow) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const glowMap = sheet(true, '#fff'),cutMap=sheet(true,'#fff',true);
    const skins = new Map<string, THREE.MeshStandardMaterial>();
    const litSkins: THREE.MeshStandardMaterial[] = [];
    const skin = (glass: string, lit: boolean) => {
      const key = glass + lit;
      let found = skins.get(key);
      if (!found) {
        const dark = new THREE.Color(glass).multiplyScalar(0.28);
        found = new THREE.MeshStandardMaterial({
          map: sheet(false, `#${dark.getHexString()}`), alphaMap:cutMap,alphaTest:.5, metalness: 0.55, roughness: mix(0.35, 0.7, mood.wear),
          emissiveMap: glowMap, emissive: new THREE.Color(glass), emissiveIntensity: lit ? glowPower : 0, side: THREE.DoubleSide,
        });
        skins.set(key, found);
        if (lit) litSkins.push(found);
      }
      return found;
    };
    const panes = new Map<string, THREE.MeshStandardMaterial>();
    const pane = (glass: string, lit: boolean) => {
      const key = glass + lit;
      let found = panes.get(key);
      if (!found) {
        found = new THREE.MeshStandardMaterial({
          color: new THREE.Color(glass).multiplyScalar(lit ? 1 : 0.6), roughness: 0.2, flatShading: true,
          emissive: new THREE.Color(glass), emissiveIntensity: lit ? glowPower * 0.75 : 0.04,
        });
        panes.set(key, found);
        if (lit) litSkins.push(found);
      }
      return found;
    };

    /** A lantern standing on y = 0 of its own group; returns its height to the hanging ring. */
    const make = (shape: Shape, r: number, lit: boolean, glass: string, bare = false) => {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.castShadow = true;
        group.add(mesh);
        if(!bare&&material===body){const liner=new THREE.Mesh(geometry,pane(glass,lit));liner.position.y=y;liner.scale.setScalar(.967);liner.castShadow=true;group.add(liner);}
        return mesh;
      };
      const body = bare ? blank : skin(glass, lit);
      let h = r * 3;
      if (shape === 'teardrop') {
        h = r * 3.3;
        const profile = [[0.3, 0], [0.34, 0.04], [0.6, 0.1], [0.95, 0.24], [1, 0.36], [0.86, 0.5], [0.52, 0.66], [0.27, 0.8], [0.14, 0.9], [0.2, 0.93], [0.04, 1]];
        add(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * r, y * h)), 20), body);
        add(new THREE.CylinderGeometry(r * 0.36, r * 0.45, h * 0.04, 12), plain, h * 0.02);
      } else if (shape === 'cylinder') {
        h = r * 3;
        add(new THREE.CylinderGeometry(r * 0.75, r * 0.9, h * 0.08, 16), plain, h * 0.04);
        add(new THREE.CylinderGeometry(r * 0.82, r * 0.82, h * 0.52, 20, 1, true), body, h * 0.34);
        for (const y of [0.09, 0.6]) add(new THREE.CylinderGeometry(r, r, h * 0.035, 20), plain, h * y);
        add(new THREE.SphereGeometry(r * 0.85, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), body, h * 0.61).scale.y = 0.95;
        add(new THREE.ConeGeometry(r * 0.16, h * 0.14, 8), plain, h * 0.93);
      } else if (shape === 'globe') {
        h = r * 2.7;
        add(new THREE.CylinderGeometry(r * 0.3, r * 0.6, h * 0.1, 12), plain, h * 0.05);
        add(new THREE.SphereGeometry(r, 20, 12), body, h * 0.08 + r);
        add(new THREE.TorusGeometry(r * 1.01, r * 0.05, 6, 24), plain, h * 0.08 + r).rotation.x = Math.PI / 2;
        add(new THREE.ConeGeometry(r * 0.3, h * 0.16, 10), plain, h * 0.9);
      } else if (shape === 'square') {
        h = r * 3.2;
        const w = r * 1.5;
        add(new THREE.BoxGeometry(w * 1.1, h * 0.07, w * 1.1), plain, h * 0.035);
        add(new THREE.BoxGeometry(w * 0.92, h * 0.5, w * 0.92), bare ? blank : pane(glass, lit), h * 0.32);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          const post = add(new THREE.BoxGeometry(w * 0.1, h * 0.52, w * 0.1), plain, h * 0.32);
          post.position.x = x * w * 0.47; post.position.z = z * w * 0.47;
        }
        add(new THREE.BoxGeometry(w * 1.12, h * 0.05, w * 1.12), plain, h * 0.595);
        add(new THREE.ConeGeometry(w * 0.78, h * 0.3, 4), bare ? blank : body, h * 0.77).rotation.y = Math.PI / 4;
        add(new THREE.SphereGeometry(r * 0.16, 8, 6), plain, h * 0.94);
      } else {
        h = r * 2.7;
        const spikes: THREE.BufferGeometry[] = [new THREE.OctahedronGeometry(r * 0.62, 1).toNonIndexed()];
        const up = new THREE.Vector3(0, 1, 0);
        for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
          const order = Math.abs(x) + Math.abs(y) + Math.abs(z);
          if (order !== 1 && order !== 3) continue;
          const length = r * (order === 1 ? 0.95 : 0.7);
          const cone = new THREE.ConeGeometry(r * 0.36, length, 4).toNonIndexed();
          cone.translate(0, r * 0.4 + length / 2, 0);
          cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(x, y, z).normalize()));
          spikes.push(cone);
        }
        const merged = mergeGeometries(spikes)!;
        for (const part of spikes) part.dispose();
        add(merged, bare ? blank : pane(glass, lit), h / 2);
        add(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 0.12, 8), plain, h - r * 0.03);
      }
      const skinRadius=(t:number)=>{if(shape==='teardrop'){const keys=[[0,.3],[.04,.34],[.1,.6],[.24,.95],[.36,1],[.5,.86],[.66,.52],[.8,.27],[.9,.14],[.93,.2],[1,.04]];for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return r*mix(keys[i-1][1],keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return r*.04;}if(shape==='globe')return Math.sqrt(Math.max(r*r*.01,r*r-(t*h-(h*.08+r))**2));return shape==='square'?r*.75:shape==='cylinder'?r*.82:r*.34;};
      if(a.joinery==='rolled'&&shape!=='star')for(let i=0;i<8;i++){const t=.2+i*.05,tt=t+.05,start=new THREE.Vector3(0,h*t,skinRadius(t)+r*.015),end=new THREE.Vector3(0,h*tt,skinRadius(tt)+r*.015),delta=end.clone().sub(start),seam=add(new THREE.CylinderGeometry(r*.018,r*.018,delta.length(),6),plain,0);seam.position.copy(start.add(end).multiplyScalar(.5));seam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
      if(a.joinery==='rivets'&&shape!=='star')for(let i=0;i<7;i++){const t=.2+i*.07,rivet=add(new THREE.SphereGeometry(r*.045,8,5),plain,h*t);rivet.position.z=skinRadius(t)+r*.015;}
      if(a.joinery==='straps'&&shape!=='star')for(const y of[.25,.55]){if(shape==='square')for(const side of[-1,1]){const front=add(new THREE.BoxGeometry(r*1.52,r*.045,r*.03),plain,h*y);front.position.z=side*r*.76;const edge=add(new THREE.BoxGeometry(r*.03,r*.045,r*1.52),plain,h*y);edge.position.x=side*r*.76;}else add(new THREE.TorusGeometry(skinRadius(y)+r*.015,r*.025,6,32),plain,h*y).rotateX(Math.PI/2);}
      if(a.crown==='point')add(new THREE.ConeGeometry(r*.1,r*.32,10),plain,h+r*.12);
      if(a.crown==='ball')add(new THREE.SphereGeometry(r*.12,12,8),plain,h+r*.1);
      if(a.crown==='leaf')for(const side of[-1,1]){const leaf=add(new THREE.SphereGeometry(r*.13,10,6),plain,h+r*.12);leaf.scale.set(.5,1.4,.3);leaf.rotation.z=side*.5;leaf.position.x=side*r*.07;}
      if(a.crown==='disc')add(new THREE.TorusGeometry(r*.12,r*.03,6,16),plain,h+r*.13);
      add(new THREE.CylinderGeometry(r*.028,r*.028,r*.4,8),plain,h+r*.24);
      const ring = add(new THREE.TorusGeometry(r * 0.13, r * 0.03, 6, 12), plain, h + r * 0.42);
      ring.rotation.y = random() * 3;
      // Raise the shell onto its selected foot; all supports start at the same floor.
      const footLift=r*.12;for(const part of group.children)part.position.y+=footLift;
      if(a.foot==='ring')add(new THREE.CylinderGeometry(r*.4,r*.46,footLift,16),plain,footLift/2);
      else if(a.foot==='plinth')add(new THREE.CylinderGeometry(r*.45,r*.5,footLift,6),plain,footLift/2);
      else for(let i=0;i<3;i++){const t=i*Math.PI*2/3,foot=add(a.foot==='pads'?new THREE.SphereGeometry(r*.1,10,6):new THREE.CylinderGeometry(r*.04,r*.08,footLift*1.2,8),plain,footLift/2);foot.position.x=Math.cos(t)*r*.3;foot.position.z=Math.sin(t)*r*.3;if(a.foot==='legs')foot.rotation.z=Math.cos(t)*.25;}
      group.updateMatrixWorld(true);let bounds=new THREE.Box3().setFromObject(group,true);for(const part of group.children)part.position.y-=bounds.min.y;group.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(group,true);
      return {group,h:bounds.max.y};
    };

    const total = 5 + Math.round(mood.density * 5);
    const hanging = Math.round(total * a.hung * 0.9);
    const standing = total - hanging;
    const litCount = Math.round(a.lit * total);
    const order = Array.from({ length: total }, (_unused, index) => index).sort(() => random() - 0.5);
    const isLit = (index: number) => order.indexOf(index) < litCount;
    const glassOf = () => a.glass === 'jewel' ? JEWELS[Math.floor(random() * JEWELS.length)] : GLASS[a.glass];
    const shapeOf = () => a.shape === 'mixed' ? ALL[Math.floor(random() * ALL.length)] : a.shape;

    const width = mix(1.9, 2.8, mood.density);
    const top = 2.1;
    const frame = a.stand === 'iron' ? s.material('#2b2a2c', { metalness: 0.6, roughness: 0.55 })
      : a.stand === 'cedar' ? s.material('#7a4a2b', { roughness: 0.85 }) : s.material('#d2b877', { roughness: 0.6 });
    const thick = { iron: 0.022, cedar: 0.05, bamboo: 0.03 }[a.stand];
    if (hanging > 0 || a.flaw === 'fallen') {
      for (const x of [-1, 1]) {
        const px = x * width / 2;
        if (a.stand === 'cedar') s.box([thick * 2, top, thick * 2], [px, top / 2, 0], frame);
        else s.rod([px, 0, 0], [px, top, 0], thick, frame);
        s.rod([px, 0.02, -0.38], [px, 0.02, 0.38], thick, frame);
        for (const z of [-1, 1]) s.rod([px, 0.02, z * 0.36], [px, 0.5, 0], thick * 0.7, frame);
        if (a.stand === 'iron') {
          const scroll = s.ring(0.16, 0.012, [px - x * 0.16, top - 0.16, 0], frame, Math.PI * 1.5);
          scroll.rotation.z = x > 0 ? Math.PI / 2 : Math.PI;
        } else s.rod([px, top - 0.4, 0], [px - x * 0.4, top, 0], thick * 0.7, frame);
        if (a.stand === 'bamboo') for (const y of [0.5, 1.1, 1.7]) s.cylinder(thick * 1.25, thick * 1.25, 0.02, [px, y, 0], frame, 8);
      }
      if (a.stand === 'cedar') s.box([width + 0.3, thick * 2, thick * 2.4], [0, top, 0], frame);
      else s.rod([-width / 2 - 0.12, top, 0], [width / 2 + 0.12, top, 0], thick, frame);
    }

    const chain = s.material('#3a3632', { metalness: 0.6 });
    const dots: { at: [number, number, number]; size: number; color: string }[] = [];
    const spill = (x: number, z: number, glass: string, reach: number) => {
      for (let i = 0; i < 16; i++) {
        const angle = random() * Math.PI * 2, d = reach * (0.35 + random() * 0.75);
        dots.push({ at: [x + Math.cos(angle) * d, 0.004, z + Math.sin(angle) * d * 0.8], size: 0.014 + random() * 0.02, color: glass });
      }
    };
    const pivots: { pivot: THREE.Group; phase: number }[] = [];
    let index = 0;
    for (let i = 0; i < hanging; i++, index++) {
      const lit = isLit(index), glass = glassOf();
      const r = Math.min(0.12 + random() * 0.08, hanging > 1 ? (width - 0.44) / (hanging - 1) * 0.8 : 1);
      const lantern = make(shapeOf(), r, lit, glass);
      const x = hanging === 1 ? 0 : mix(-width / 2 + 0.22, width / 2 - 0.22, i / (hanging - 1)) + (random() - 0.5) * 0.06;
      const drop = (i % 2 ? 0.5 : 0.12) + random() * 0.32;
      const pivot = new THREE.Group();
      pivot.position.set(x, top - thick, (i % 2 ? 0.07 : -0.07));
      const link=new THREE.Group();
      if(a.suspension==='chain'){const count=Math.max(3,Math.ceil(drop/.032)),step=drop/count;for(let j=0;j<count;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(step*.55,.003,5,10),chain);ring.position.y=-step*(j+.5);ring.rotation.y=j%2?Math.PI/2:0;link.add(ring);}}
      else{const mat=a.suspension==='cord'?s.material('#c9b389'):chain;for(const offset of(a.suspension==='double'?[-.012,.012]:[0])){const cord=new THREE.Mesh(new THREE.CylinderGeometry(a.suspension==='cord'?.009:.006,a.suspension==='cord'?.009:.006,drop,6),mat);cord.position.set(offset,-drop/2,0);link.add(cord);}if(a.suspension==='cord')for(const yy of[-.035,-drop+.035]){const knot=new THREE.Mesh(new THREE.SphereGeometry(.016,8,5),mat);knot.position.y=yy;link.add(knot);}}
      lantern.group.position.y = -drop - lantern.h;
      lantern.group.rotation.y = random() * 6;
      pivot.add(link, lantern.group);
      s.root.add(pivot);
      pivots.push({ pivot, phase: random() * 6 });
      if (lit) spill(x, 0, glass, 0.45);
    }
    const rows = standing > 5 ? 2 : 1;
    for (let i = 0; i < standing; i++, index++) {
      const lit = isLit(index), glass = glassOf();
      const row = i % rows, perRow = Math.ceil(standing / rows), col = Math.floor(i / rows);
      const flawed = i === 0 && (a.flaw === 'dented' || a.flaw === 'unfinished');
      const r = (hanging === 0 ? 0.17 : 0.14) + random() * 0.09;
      const lantern = make(shapeOf(), r, lit && !flawed, glass, flawed && a.flaw === 'unfinished');
      const x = (perRow === 1 ? 0 : mix(-width / 2 + 0.3, width / 2 - 0.3, col / (perRow - 1)) + (row ? 0.14 : 0) + (random() - 0.5) * 0.1)+(a.rank==='pairs'?(col%2?-.07:.07):0);
      const z = (hanging === 0 ? 0 : 0.5) + row * 0.6 + (random() - 0.5) * 0.12+(a.rank==='arc'?.3*(x/(width/2))**2:a.rank==='stagger'?(col%2?.2:-.1):0);
      lantern.group.position.set(x, 0, z);
      lantern.group.rotation.y = a.rank==='straight'?(random()-.5)*.15:random()*6;
      if (flawed && a.flaw === 'dented') {
        lantern.group.scale.set(1.08, 0.78, 0.7);
        lantern.group.rotation.z = 0.24;
        lantern.group.position.y = r * 0.12;
      }
      if (flawed && a.flaw === 'unfinished') {
        // The maker's hammer and punch, left where the work stopped.
        s.rod([x + r * 1.5, 0.02, z + 0.1], [x + r * 1.5 + 0.24, 0.02, z + 0.2], 0.012, s.material('#8a5a34'));
        s.box([0.045, 0.045, 0.1], [x + r * 1.5 + 0.24, 0.025, z + 0.2], s.material('#55585c', { metalness: 0.7 })).rotation.y = 0.4;
        s.rod([x - r * 1.6, 0.01, z + 0.16], [x - r * 1.6 - 0.14, 0.01, z + 0.1], 0.007, s.material('#55585c', { metalness: 0.7 }));
      }
      s.root.add(lantern.group);lantern.group.updateMatrixWorld(true);lantern.group.position.y-=new THREE.Box3().setFromObject(lantern.group,true).min.y;
      if (lit && !flawed) spill(x, z, glass, r * 3.4);
    }
    if (a.flaw === 'fallen') {
      const r = 0.15;
      const lantern = make(shapeOf(), r, false, glassOf());
      const x = (random() - 0.5) * width * 0.5;
      lantern.group.rotation.set(0, random() * 6, Math.PI / 2 - 0.12, 'YXZ');
      lantern.group.position.set(x + lantern.h / 2, r * 1.02, 1.5);
      s.root.add(lantern.group);lantern.group.updateMatrixWorld(true);lantern.group.position.y-=new THREE.Box3().setFromObject(lantern.group,true).min.y;
      s.rod([x * 0.5, top - thick, 0], [x * 0.5 + 0.03, top - 0.55, 0], 0.006, chain);
      s.tube([[x - 0.1, 0.008, 1.47], [x - 0.22, 0.008, 1.4], [x - 0.3, 0.008, 1.51], [x - 0.42, 0.008, 1.45]], 0.006, chain);
    }
    if(a.surface!=='bare')for(let i=dots.length-1;i>=0;i--)if(Math.abs(dots[i].at[0])>width/2+.32||dots[i].at[2]<-.57||dots[i].at[2]>1.87)dots.splice(i,1);
    if (dots.length) {
      const disc = new THREE.CircleGeometry(1, 10);
      disc.rotateX(-Math.PI / 2);
      const glow = s.scatter(disc, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }), dots);
      glow.castShadow = glow.receiveShadow = false;
    }

    if(a.surface!=='bare'){const floor=a.surface==='rug'?.012:a.surface==='stone'?.07:.08;for(const part of s.root.children)part.position.y+=floor;
      if(a.surface==='boards'){const wood=s.material('#9c7850');for(let i=0;i<10;i++)s.box([(width+.7)/10-.008,floor,2.5],[-(width+.7)/2+(i+.5)*(width+.7)/10,floor/2,.65],wood);}
      else s.box([width+.7,floor,2.5],[0,floor/2,.65],s.material(a.surface==='rug'?'#a97757':'#a7a48e'));
    }
    const sway = mix(0.01, 0.07, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const { pivot, phase } of pivots) pivot.rotation.z = Math.sin(time * 1.3 + phase) * sway;
        const flicker = 1 + Math.sin(time * 9) * 0.05 * mood.energy;
        for (const material of litSkins) material.emissiveIntensity = glowPower * flicker;
      },
    });
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drawColumn } from './glyphs';

const PAPERS = {
  red: 'Classic akachochin red with black lettering: drinks served here.',
  white: 'White paper with black brushwork, a restaurant or a shrine stall.',
  amber: 'Oiled amber-yellow paper, old and warm.',
  black: 'Black lacquered paper with red lettering, a serious bar.',
  indigo: 'Deep indigo with white lettering, cool and a little formal.',
} as const;
const PAPER: Record<keyof typeof PAPERS, { paper: string; ink: string; glow: string }> = {
  red: { paper: '#d8322a', ink: '#17110f', glow: '#ff7a3c' },
  white: { paper: '#f3ead6', ink: '#1a1614', glow: '#ffd89a' },
  amber: { paper: '#e9a83a', ink: '#2a1608', glow: '#ffb84a' },
  black: { paper: '#2a2426', ink: '#e2342c', glow: '#ff5a3a' },
  indigo: { paper: '#27407e', ink: '#f2eee0', glow: '#8fb4ff' },
};
const WORDS = { sake: '酒', luck: '大吉', ramen: 'ラーメン', draft: '生', heaven: '天', name: '山本', blank: '' } as const;

export default defineThing({
  questions: {
    ribs: choice('How are the bamboo hoops spaced?', { coarse: 'Fourteen widely spaced hoops.', regular: 'Twenty-two evenly spaced hoops.', fine: 'Thirty-two closely spaced hoops.', handmade: 'Uneven pairs of hoops with broader gaps between.' }),
    paperSurface: choice('What texture does the lantern paper show?', { mulberry: 'Long scattered mulberry-paper fibres.', smooth: 'Smooth opaque paper.', oiled: 'Translucent oiled paper with soft mottling.', silk: 'A fine woven silk-paper grid.' }),
    capFinish: choice('What finishes the top and bottom caps?', { black: 'Black lacquered wood.', red: 'Deep red lacquer.', brass: 'Thin brushed brass.', bamboo: 'Plain pale bamboo.' }),
    letteringFrame: choice('How is the lettering framed?', { plain: 'Unframed brush lettering.', border: 'A thin rectangular border.', oval: 'An elongated oval cartouche.', double: 'Two narrow vertical rules beside the characters.' }),
    suspension: choice('What hangs the lantern from its support?', { cord: 'A plain pale cord.', chain: 'A short chain of alternating metal links.', hook: 'A dark iron suspension rod.', braid: 'A braided red-and-cream cord.' }),
    pendant: choice('If an ornament hangs beneath the lantern, what is it?', { tablet: 'A small wooden tablet.', tassel: 'A bundle of fine coloured tassel threads.', bell: 'A small hollow brass bell.', strips: 'Three narrow paper streamers.' }),
    shape: choice('What shape is the lantern?', {
      round: 'A fat round globe, the friendly neighbourhood kind.',
      long: 'A tall cylinder, slim and elegant.',
      barrel: 'A squat wide barrel, heavy and imposing.',
      egg: 'An egg that swells toward the bottom, hand-made and a little uneven.',
    }),
    size: score('How big is it?', ['Small enough to carry', 'The size of a beach ball', 'As big as a person\'s torso', 'A giant that fills the doorway']),
    mount: choice('How is it hung?', {
      bracket: 'From an iron arm on a tall timber wall post under a scrap of tiled eave.',
      post: 'From a hooked arm on a short free-standing post by the kerb.',
      frame: 'Inside a small wooden gate-like frame that stands on the ground.',
      row: 'One of three in a row under a timber beam, like a festival stall.',
      bamboo: 'Tied to a leaning bamboo pole.',
    }),
    paper: choice('What colour is the paper?', PAPERS),
    words: choice('What is painted on it?', {
      sake: 'The single character for sake: drink here.',
      luck: 'Two characters for great good fortune.',
      ramen: 'Ramen, spelled down the side in angular katakana.',
      draft: 'The character for draft beer, raw and fresh.',
      heaven: 'The character for heaven, perhaps tempura.',
      name: 'A family name, Yamamoto: somebody\'s own place.',
      blank: 'Nothing: bare paper and ribs.',
    }),
    lit: choice('Is it lit?', {
      glowing: 'Glowing steadily from within.',
      flicker: 'Lit but guttering, the bulb failing.',
      dark: 'Dark: closed, or not yet evening.',
    }),
    damage: choice('What has happened to the paper?', {
      whole: 'Nothing, it is intact.',
      torn: 'A panel is torn open so the ribs and bulb show.',
      patched: 'Patched with squares of mismatched paper.',
      sagging: 'It has got wet and sags lopsided on its ribs.',
    }),
    tag: noul('Does a wooden tag or tassel hang beneath it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = PAPER[a.paper];
    const text = WORDS[a.words];
    const lit = a.lit !== 'dark';
    const size = mix(0.28, 1.1, a.size);
    const [wide, tall] = ({ round: [1, 1.05], long: [0.62, 1.7], barrel: [1.25, 0.95], egg: [0.95, 1.25] } as const)[a.shape];
    const R = size * wide / 2, H = size * tall;
    const count = a.mount === 'row' ? 3 : 1;
    const wood = s.material('#5a3d2a', { roughness: 0.8 });
    const darkWood = s.material('#2b211c', { roughness: 0.7 });
    const iron = s.material('#26272a', { metalness: 0.5, roughness: 0.55 });
    const capMat=s.material(a.capFinish==='black'?'#231e1b':a.capFinish==='red'?'#962e29':a.capFinish==='brass'?'#ba9448':'#b69a64',{roughness:a.capFinish==='black'||a.capFinish==='red'?.3:.55,metalness:a.capFinish==='brass'?.65:0});
    const hanging=(from:[number,number,number],to:[number,number,number])=>{
      const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),len=A.distanceTo(B),axis=B.clone().sub(A).normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
      if(a.suspension==='chain'){const n=Math.max(2,Math.ceil(len/.025));for(let i=0;i<=n;i++){const at=A.clone().lerp(B,i/n),link=s.ring(.009,.0022,at.toArray() as [number,number,number],iron);link.scale.y=1.35;link.quaternion.copy(rotation);link.rotateY(i%2?Math.PI/2:0);}}
      else if(a.suspension==='braid')for(const side of [-1,1]){const pts:[number,number,number][]=[];for(let i=0;i<=24;i++){const t=i/24,offset=new THREE.Vector3(Math.cos(t*Math.PI*12)*.002*side,0,Math.sin(t*Math.PI*12)*.002*side).applyQuaternion(rotation);pts.push(A.clone().lerp(B,t).add(offset).toArray() as [number,number,number]);}s.tube(pts,.002,s.material(side<0?'#b2382e':'#d8cfae'));}
      else s.rod(from,to,a.suspension==='cord'?.003:.006,a.suspension==='cord'?s.material('#d8cfae'):iron);
    };
    const glowStrength = lit ? mix(0.75, 1.35, mood.cheer) * (a.paper === 'black' ? 0.3 : a.paper === 'indigo' ? 0.6 : 1) : 0;
    const bodies: { pivot: THREE.Group; material: THREE.MeshStandardMaterial; phase: number }[] = [];

    const lantern = (at: readonly [number, number, number], word: string, scale = 1) => {
      const l = new Sculpture(context);
      const r = R * scale, h = H * scale;
      const paperTone = new THREE.Color(tone.paper).lerp(new THREE.Color('#b8a48c'), mood.wear * 0.4);
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = `#${paperTone.getHexString()}`; g.fillRect(0, 0, 512, 256);
      // Inner glow reads as a paler belly; bamboo hoops read as thin darker lines.
      const belly = g.createLinearGradient(0, 0, 0, 256);
      belly.addColorStop(0, 'rgba(0,0,0,0.22)'); belly.addColorStop(0.5, lit ? `rgba(255,235,170,${a.paper === 'black' ? 0.06 : 0.28})` : 'rgba(0,0,0,0)'); belly.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = belly; g.fillRect(0, 0, 512, 256);
      if(a.paperSurface==='mulberry'){g.strokeStyle='rgba(245,230,201,.2)';g.lineWidth=.6;for(let i=0;i<900;i++){const x=random()*512,y=random()*256;g.beginPath();g.moveTo(x,y);g.lineTo(x+(random()-.5)*12,y+random()*7);g.stroke();}}
      if(a.paperSurface==='oiled')for(let i=0;i<180;i++){g.fillStyle='rgba(255,237,192,.035)';g.beginPath();g.ellipse(random()*512,random()*256,12+random()*20,7+random()*12,0,0,7);g.fill();}
      if(a.paperSurface==='silk'){g.strokeStyle='rgba(20,16,12,.09)';g.lineWidth=.7;for(let x=0;x<512;x+=4){g.beginPath();g.moveTo(x,0);g.lineTo(x,256);g.stroke();}for(let y=0;y<256;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();}}
      const hoops=a.ribs==='coarse'?14:a.ribs==='fine'?32:22;
      g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=1.5;for(let i=1;i<hoops;i++){const y=(i+(a.ribs==='handmade'?(i%2?.25:-.25):0))*256/hoops;g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();}
      if (a.damage === 'patched') for (let i = 0; i < 4 + Math.floor(random() * 3); i++) {
        g.fillStyle = ['#efe6cf', '#c9b48a', '#e2c8b8', '#9fb0b4'][Math.floor(random() * 4)];
        g.save(); g.translate(random() * 512, 50 + random() * 150); g.rotate(random() - 0.5); g.fillRect(-22, -18, 44 + random() * 20, 36 + random() * 14); g.restore();
      }
      // Stains gather at the bottom of old lanterns.
      for (let i = 0; i < mood.wear * 14; i++) { g.fillStyle = `rgba(40,30,20,${0.08 + random() * 0.12})`; g.beginPath(); g.ellipse(random() * 512, 170 + random() * 80, 20 + random() * 40, 12 + random() * 30, 0, 0, Math.PI * 2); g.fill(); }
      if (word) {
        const chars = [...word].length;
        const glyph = Math.min(190 / chars, a.shape === 'long' ? 70 : 120);
        const top = 128 - (chars * glyph * 1.08) / 2;
        // Canvas x = 256 faces the street; the seam at 0/512 faces the wall and gets a second copy.
        for (const cx of [256, 0, 512]) drawColumn(g, word, cx, top, glyph, tone.ink, 0.13);
      }
      if(a.letteringFrame!=='plain'){g.strokeStyle=tone.ink;g.lineWidth=2.5;for(const cx of [0,256,512]){if(a.letteringFrame==='border')g.strokeRect(cx-55,23,110,210);else if(a.letteringFrame==='oval'){g.beginPath();g.ellipse(cx,128,60,108,0,0,Math.PI*2);g.stroke();}else for(const side of [-1,1]){g.beginPath();g.moveTo(cx+side*58,24);g.lineTo(cx+side*58,232);g.stroke();}}}
      if (a.damage === 'torn') {
        const cx = 256 + (random() > 0.5 ? 1 : -1) * (45 + random() * 25), cy = 95 + random() * 60;
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        for (let i = 0; i < 9; i++) { const angle = i / 9 * Math.PI * 2, reach = 32 + random() * 34; g.lineTo(cx + Math.cos(angle) * reach * 0.8, cy + Math.sin(angle) * reach * 1.3); }
        g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping; map.offset.x = 0.5;
      const material = new THREE.MeshStandardMaterial({
        map,roughness:a.paperSurface==='oiled'?.45:a.paperSurface==='silk'?.6:.85,side: THREE.DoubleSide, alphaTest: 0.5,
        emissive: new THREE.Color(tone.glow).lerp(new THREE.Color('#ffd9a0'), mood.warmth * 0.3), emissiveMap: map, emissiveIntensity: glowStrength,
      });
      // The body hangs below the pivot: a ribbed profile between two lacquered caps.
      const neck = r * (a.shape === 'long' ? 0.72 : 0.42);
      const profile: [number, number][] = [];
      const sag = a.damage === 'sagging' ? 0.16 : 0;
      for(let i=0;i<=hoops*2;i++){
        const t=i/(hoops*2);
        const swell = a.shape === 'long' ? Math.sin(t * Math.PI) ** 0.35 : a.shape === 'egg' ? Math.sin((t ** 1.35) * Math.PI) ** 0.75 : a.shape === 'barrel' ? Math.sin(t * Math.PI) ** 0.5 : Math.sin(t * Math.PI) ** 0.8;
        const egg = a.shape === 'egg' ? 1 - t * 0.12 : 1;
        profile.push([mix(neck, r, swell * egg) + (i % 2 ? r * 0.012 : 0), -h + (t ** (1 + sag)) * h]);
      }
      const body = l.lathe(profile, material);
      if (a.damage === 'sagging') { body.rotation.z = 0.07; body.scale.x = 1.06; }
      const cap = neck * 1.08;
      l.cylinder(cap,cap,h*.06,[0,.005,0],capMat,24);
      l.cylinder(cap,cap,h*.07,[0,-h-h*.02,0],capMat,24);
      const capTop=.005+h*.03,hangerTop=capTop+cap*.65;l.tube([[-cap*.55,capTop,0],[-cap*.45,capTop+cap*.45,0],[0,hangerTop,0],[cap*.45,capTop+cap*.45,0],[cap*.55,capTop,0]],r*.025,iron);
      if (a.damage === 'torn') {
        for (let i = 1; i < 5; i++) l.ring(mix(neck, r, Math.sin(i / 5 * Math.PI) ** 0.8) * 0.97, r * 0.012, [0, -h + (i / 5) * h, 0], s.material('#c9a86a')).rotation.x = Math.PI / 2;
        l.ball([r * 0.16, r * 0.2, r * 0.16], [0, -h * 0.45, 0], new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffd27a', emissiveIntensity: lit ? 1.6 : 0 }), 12);
      }
      if (a.tag) {
        l.rod([0, -h * 1.05, 0], [0, -h * 1.05 - r * 0.3, 0], r * 0.012, iron);
        const y=-h*1.05-r*.3;
        if(a.pendant==='tablet')l.box([r*.34,r*.6,r*.04],[0,y-r*.3,0],s.material('#c9a877',{roughness:.8}));
        if(a.pendant==='tassel'){const mat=s.material(tone.ink==='#17110f'?'#d8a02a':tone.ink);l.ball([r*.07,r*.08,r*.07],[0,y,0],mat,8);for(let j=0;j<18;j++){const t=j*Math.PI/9;l.rod([Math.cos(t)*r*.05,y,Math.sin(t)*r*.05],[Math.cos(t)*r*.12,y-r*.52,Math.sin(t)*r*.12],r*.007,mat);}}
        if(a.pendant==='bell'){l.lathe([[r*.18,0],[r*.16,r*.09],[r*.1,r*.3],[0,r*.36]],s.material('#c6a355',{metalness:.7,roughness:.3}),[0,y-r*.36,0]);l.ball([r*.04,r*.04,r*.04],[0,y-r*.32,0],iron,8);}
        if(a.pendant==='strips')for(let j=0;j<3;j++){const geo=new THREE.PlaneGeometry(r*.11,r*.6,1,10),p=geo.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getY(i)/r*8+j)*r*.05);geo.computeVertexNormals();l.mesh(geo,s.material(j%2?'#eadfc4':tone.paper,{side:THREE.DoubleSide}),[(j-1)*r*.12,y-r*.3,0]);}
      }
      for(const child of l.root.children)child.position.y-=hangerTop;
      l.root.position.set(...at);
      s.root.add(l.root);
      bodies.push({ pivot: l.root, material, phase: random() * 6 });
      return l.root;
    };

    const drop = size * 0.1;
    const hangLength = H * (a.tag ? 1.5 : 1.12) + drop;
    if (a.mount === 'bracket') {
      const top = Math.max(2.5, hangLength + 1.5);
      s.box([0.14, top, 0.14], [0, top / 2, -R - 0.25], wood);
      s.box([0.2, 0.1, 0.2], [0, 0.05, -R - 0.25], s.material('#8f8a80'));
      // A scrap of tiled eave over the arm.
      const eave = s.box([Math.max(1.1, R * 2.6), 0.05, R + 0.75], [0, top + 0.08, -R * 0.35], s.material('#3d4650', { roughness: 0.6 }));
      eave.rotation.x = 0.22;
      for (let i = 0; i < 7; i++) { const tile = s.cylinder(0.035, 0.035, R + 0.75, [(i - 3) * Math.max(1.1, R * 2.6) / 7, top + 0.115, -R * 0.35], s.material('#2f373f'), 8); tile.rotation.x = Math.PI / 2 + 0.22; }
      s.rod([0, top - 0.3, -R - 0.2], [0, top - 0.3, 0.05], 0.018, iron);
      s.rod([0, top - 0.75, -R - 0.2], [0, top - 0.3, -R * 0.2], 0.012, iron);
      hanging([0,top-.3,0],[0,top-.3-drop,0]);
      lantern([0, top - 0.3 - drop, 0], text);
    } else if (a.mount === 'post') {
      const top = hangLength + mix(0.5, 0.9, random());
      s.cylinder(0.045, 0.06, top, [-R - 0.2, top / 2, 0], wood, 12);
      s.cylinder(0.14, 0.18, 0.12, [-R - 0.2, 0.06, 0], s.material('#8f8a80'), 16);
      s.tube([[-R - 0.2, top - 0.05, 0], [-R * 0.6, top + 0.12, 0], [0, top, 0], [0.03, top - 0.08, 0]], 0.014, iron);
      hanging([0,top-.02,0],[0,top-.09,0]);lantern([0,top-.09,0],text);
    } else if (a.mount === 'frame') {
      const top = hangLength + 0.25, half = R + 0.18;
      for (const side of [-1, 1]) {
        s.box([0.07, top, 0.07], [side * half, top / 2, 0], wood);
        s.box([0.1, 0.06, 0.5], [side * half, 0.03, 0], wood);
      }
      s.box([half * 2 + 0.34, 0.08, 0.1], [0, top, 0], darkWood);
      s.box([half * 2 + 0.1, 0.05, 0.07], [0, top - 0.16, 0], wood);
      hanging([0,top-.185,0],[0,top-.19-drop*.3,0]);lantern([0,top-.19-drop*.3,0],text);
    } else if (a.mount === 'row') {
      const span = R * 2 * 1.3 + H * 0.12, top = hangLength + 1.35;
      for (const side of [-1, 1]) s.box([0.1, top, 0.1], [side * (span * 1.5 + 0.05), top / 2, 0], wood);
      s.box([span * 3 + 0.5, 0.12, 0.12], [0, top, 0], darkWood);
      const others = ['酒', '生', '大吉', '天', ''].filter((word) => word !== text);
      for (let i = -1; i <= 1; i++) {
        hanging([i*span,top,0],[i*span,top-.06-drop,0]);
        lantern([i * span, top - 0.06 - drop, 0], i === 0 ? text : others[Math.floor(random() * others.length)], i === 0 ? 1 : mix(0.8, 1, random()));
      }
    } else {
      const top = hangLength + 1.1, lean = 0.5 + R;
      const bamboo = s.material('#9aa45a', { roughness: 0.6 });
      s.rod([-lean, 0, -0.1], [0.12, top + 0.25, 0], 0.028, bamboo, 0.018);
      for (let i = 1; i < 6; i++) { const t = i / 6; s.ring(0.03 - t * 0.008, 0.006, [mix(-lean, 0.12, t), t * (top + 0.25), mix(-0.1, 0, t)], s.material('#6f7a3c')).rotation.x = Math.PI / 2; }
      s.box([0.3, 0.16, 0.3], [-lean, 0.08, -0.1], s.material('#8f8a80'));
      hanging([0,top,0],[0,top-drop,0]);
      lantern([0, top - drop, 0], text);
    }

    const sway = mix(0.01, 0.09, mood.energy), speed = mix(0.5, 1.8, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const body of bodies) {
          body.pivot.rotation.z = Math.sin(time * speed + body.phase) * sway;
          body.pivot.rotation.x = Math.sin(time * speed * 0.7 + body.phase * 2) * sway * 0.5;
          if (a.lit === 'flicker') body.material.emissiveIntensity = glowStrength * (0.55 + 0.45 * Math.sin(time * 9 + body.phase) * Math.sin(time * 23.7 + body.phase * 3));
        }
      },
    });
  },
});

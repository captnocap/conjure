import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SPIRITS = {
  bourbon: 'Deep amber bourbon, warm and glowing.',
  scotch: 'Pale straw-gold scotch.',
  rye: 'Dark red-brown rye, almost mahogany.',
  clear: 'Clear moonshine or vodka, water-white.',
} as const;
const SPIRIT_TINT: Record<keyof typeof SPIRITS, string> = { bourbon: '#c06a18', scotch: '#dfae45', rye: '#7d3312', clear: '#d7e6e8' };

function labelTexture(kind: 'black' | 'cream' | 'gold' | 'tape', wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = kind === 'tape' ? 96 : 224;
  const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height;
  const [paper, ink, accent] = { black: ['#17171a', '#efe8d6', '#c9a646'], cream: ['#e9dfc2', '#3a2418', '#a3261f'], gold: ['#c9a646', '#1f1a14', '#7a1d1a'], tape: ['#d9cfae', '#1d2a66', '#1d2a66'] }[kind];
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink; ctx.strokeStyle = accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (kind === 'tape') {
    ctx.font = 'bold 64px cursive'; ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.06); ctx.fillText('XXX', 0, 4); ctx.restore();
  } else {
    ctx.lineWidth = 5; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.lineWidth = 2; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.font = 'italic bold 30px serif'; ctx.fillText('Old', w / 2, 48);
    ctx.font = 'bold 44px serif'; ctx.fillText(kind === 'black' ? 'No. 9' : kind === 'gold' ? 'RESERVE' : 'HOUND', w / 2, 94, w - 50);
    ctx.fillStyle = accent; ctx.fillRect(40, 124, w - 80, 5);
    ctx.fillStyle = ink; ctx.font = '20px serif'; ctx.fillText('STRAIGHT WHISKEY', w / 2, 152, w - 50);
    ctx.font = 'bold 26px serif'; ctx.fillText('90 PROOF', w / 2, 186);
  }
  // Wear scuffs and peels the label.
  ctx.fillStyle = 'rgba(120,105,80,0.5)';
  for (let i = 0; i < wear * 40; i++) ctx.fillRect(random() * w, random() * h, 3 + random() * 26, 1 + random() * 4);
  if (wear > 0.6) { ctx.clearRect(0, 0, w * random() * 0.6, h * random() * 0.5); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.8, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    glassForm: choice('What shape is the tumbler?', { standard: 'A standard gently flared rocks glass.', straight: 'A straight-sided tumbler.', wide: 'A broad low tumbler.', tall: 'A taller narrow tumbler.' }),
    cutting: choice('How is the glass decorated?', { diamonds: 'Cut diamonds around the lower half.', ribs: 'Long fine vertical ribs.', flutes: 'Broad shallow lower flutes.', plain: 'Plain smooth glass.' }),
    iceFinish: choice('How clear is the ice?', { clear: 'Clear polished ice.', frosted: 'White frosted ice.', cloudy: 'Cloudy pale blue ice.', cracked: 'Clear ice with fine white fracture lines.' }),
    garnish: choice('What garnish is set beside the drink?', { lemon: 'A curl of lemon peel.', orange: 'A round orange slice.', cherry: 'A red cherry with its stem.', none: 'No garnish.' }),
    neckMark: choice('What decorates the bottle neck?', { seal: 'A small round wax seal.', string: 'A tied string bow.', tag: 'A paper neck tag on a cord.', band: 'A narrow engraved metal collar.' }),
    coaster: choice('What coaster accompanies the tumbler?', { cork: 'A thick round cork coaster.', slate: 'A thin square slate coaster.', tin: 'A shallow round metal coaster.', felt: 'A soft dark green felt coaster.' }),
    fill: score('How much is in the glass?', ['Drained, only a film left', 'One finger', 'A generous double', 'Poured to the brim by a shaking hand']),
    ice: choice('What is in the glass with it?', {
      neat: 'Nothing, served neat.',
      cubes: 'Several ice cubes, half melted and rounded.',
      rock: 'One big clear block of ice.',
      butt: 'A drowned cigarette butt floating in it.',
    }),
    spirit: choice('What is the liquor?', SPIRITS),
    bottle: choice('What is the bottle like?', {
      square: 'A square-shouldered bottle with a black label, the famous kind.',
      round: 'A tall round bottle with a cream paper label and a red wax-dipped neck.',
      decanter: 'A faceted crystal decanter with a ball stopper, no label, old money.',
      flask: 'A flat pint bottle with a gold label, the kind bought at a liquor-store window.',
      jug: 'An unlabelled bottle with a strip of masking tape marked XXX and a cork: bootleg.',
    }),
    level: score('How much is left in the bottle?', ['Empty', 'A last inch', 'Half gone', 'Barely touched']),
    scene: choice('What has happened here?', {
      waiting: 'Glass and bottle stand side by side, composed, a drink about to be taken.',
      tipped: 'The glass has been knocked onto its side and the liquor has pooled across the table.',
      pair: 'Two glasses: one drained, one poured and never touched. Someone did not come, or left.',
      fallen: 'The bottle lies on its side, cap gone, a trickle spilling from the neck.',
      open: 'The bottle stands uncapped, the cap tossed aside: the pouring is not finished.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = SPIRIT_TINT[a.spirit];
    const liquor = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: mix(0.25, 0.6, mood.warmth), roughness: 0.15 });
    const crystal = new THREE.MeshPhysicalMaterial({ color: '#dfeaec', transparent: true, opacity: 0.4, roughness: 0.06 + mood.wear * 0.25, flatShading: true, clearcoat: 1, side: THREE.DoubleSide });
    const iceMaterial = new THREE.MeshPhysicalMaterial({ color: a.iceFinish==='cloudy'?'#cbdfe5':'#f2fafc', transparent: true, opacity: a.iceFinish==='frosted'?1:a.iceFinish==='cloudy'?.92:.76, roughness: a.iceFinish==='frosted'?.75:.2, emissive: '#bfd8e0', emissiveIntensity: 0.25 });
    if(a.iceFinish==='cracked'){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d8edf0';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;for(let i=0;i<8;i++){const x=random()*128,y=random()*128;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+20-random()*40,y+30);ctx.lineTo(x-10,y+50);ctx.stroke();}iceMaterial.map=new THREE.CanvasTexture(canvas);iceMaterial.map.colorSpace=THREE.SRGBColorSpace;}
    const melt = mix(0.75, 0.3, 1 - mood.warmth * 0.7);
    const add = (parent: THREE.Object3D, mesh: THREE.Object3D) => { parent.add(mesh); return mesh; };

    // A tumbler in its own group so it can be tipped.
    const tumbler = (fill: number, ice: typeof a.ice, tipped: boolean) => {
      const glass = new THREE.Group();
      const [RB,RT,TALL]= {standard:[.034,.04,.088],straight:[.037,.038,.088],wide:[.041,.047,.071],tall:[.031,.035,.112]}[a.glassForm], BASE=.016;
      const profile = [[0, 0], [RB, 0], [RB + 0.001, BASE], [RT, TALL], [RT - 0.003, TALL], [RB - 0.002, BASE], [0, BASE]].map(([x, y]) => new THREE.Vector2(x, y));
      add(glass, s.mesh(new THREE.LatheGeometry(profile, a.cutting==='plain'?32:12), crystal));
      // Cut diamonds round the lower half.
      const cut = new THREE.MeshStandardMaterial({ color: '#f4fbfc', roughness: 0.1, emissive: '#cfe3e6', emissiveIntensity: 0.3 });
      for (let i = 0; i < (a.cutting==='diamonds'?12:0); i++) {
        const angle = (i + 0.5) / 12 * Math.PI * 2, r = RB + 0.0022;
        const facet = s.box([0.011, 0.03, 0.0012], [Math.sin(angle) * r, 0.036, Math.cos(angle) * r], cut);
        facet.rotation.set(0.07, angle, Math.PI / 4, 'YXZ');
        facet.scale.set(0.6, 0.6, 1);
        add(glass, facet);
      }
      if(a.cutting==='ribs'||a.cutting==='flutes')for(let i=0;i<(a.cutting==='ribs'?18:10);i++){const t=i*Math.PI*2/(a.cutting==='ribs'?18:10),height=a.cutting==='ribs'?TALL*.78:TALL*.45,rad=RB+(RT-RB)*.45;const rib=s.rod([Math.sin(t)*rad,BASE,Math.cos(t)*rad],[Math.sin(t)*(rad+.002),BASE+height,Math.cos(t)*(rad+.002)],a.cutting==='ribs'?.0009:.0022,cut);add(glass,rib);}
      const level = BASE + mix(0.002, TALL - BASE - 0.004, fill);
      if (!tipped) {
        const rAt = (y: number) => mix(RB - 0.002, RT - 0.003, (y - BASE) / (TALL - BASE)) - 0.0008;
        add(glass, s.cylinder(rAt(level), rAt(BASE), level - BASE, [0, (level + BASE) / 2, 0], liquor, 24));
        if (ice === 'cubes') {
          const count = 3 + Math.floor(random() * 3);
          for (let i = 0; i < count; i++) {
            const size = 0.024 * melt * mix(0.8, 1.2, random()) + 0.006, angle = random() * 6.28, d = random() * 0.014;
            const cube = s.mesh(new THREE.BoxGeometry(size, size, size, 1, 1, 1), iceMaterial, [Math.cos(angle) * d, Math.max(BASE + size / 2, level - size * 0.25 + i * 0.004), Math.sin(angle) * d]);
            cube.rotation.set(random() * 2, random() * 2, random() * 2);
            add(glass, cube);
          }
        } else if (ice === 'rock') {
          const size = 0.046 * mix(0.75, 1, melt + 0.2);
          const rock = s.box([size, size, size], [0, Math.max(BASE + size / 2, level - size * 0.3), 0], iceMaterial);
          rock.rotation.set(0.2, random() * 2, 0.15);
          add(glass, rock);
        } else if (ice === 'butt') {
          const butt = s.cylinder(0.004, 0.004, 0.03, [0.006, level + 0.002, -0.004], s.material('#e8e0cc'), 9);
          butt.rotation.set(Math.PI / 2, 0, random() * 3, 'ZYX');
          const tip = s.cylinder(0.0042, 0.0042, 0.012, [0, 0.02, 0], s.material('#c98f4c'), 9);
          butt.add(tip);
          add(glass, butt);
        }
      }
      if (tipped) {
        glass.rotation.set(0, 0, 0);
        const roll = new THREE.Group();
        glass.rotation.z = -Math.PI / 2 - Math.atan2(RT - RB, TALL);
        glass.position.y = RB + 0.001;
        roll.add(glass);
        s.root.add(roll);
        return roll;
      }
      s.root.add(glass);
      return glass;
    };

    const tipped = a.scene === 'tipped';
    const main = tumbler(a.fill, a.ice, tipped);
    main.position.set(0.055, 0, 0.045);
    if (tipped) {
      main.rotation.y = mix(-0.5, 0.9, random());
      // The spill: overlapping pools fanning from the mouth, and ice that slid out.
      const dir = new THREE.Vector3(Math.cos(main.rotation.y), 0, -Math.sin(main.rotation.y));
      const mouth = main.position.clone().addScaledVector(dir, 0.09);
      const amount = mix(0.35, 1, a.fill);
      const pool = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, roughness: 0.05, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 6; i++) {
        const along = i * 0.022 * amount, r = mix(0.03, 0.055, random()) * amount * (1 - i * 0.09);
        const blob = s.cylinder(r, r, 0.0012, [mouth.x + dir.x * along + (random() - 0.5) * 0.03, 0.0006 + i * 0.00005, mouth.z + dir.z * along + (random() - 0.5) * 0.03], pool, 22);
        blob.scale.set(1, 1, mix(0.6, 1, random()));
        blob.rotation.y = random() * 3;
      }
      if (a.ice === 'cubes' || a.ice === 'rock') for (let i = 0; i < (a.ice === 'rock' ? 1 : 3); i++) {
        const size = a.ice === 'rock' ? 0.04 : 0.02 * mix(0.8, 1.2, random());
        s.box([size, size, size], [mouth.x + dir.x * (0.03 + i * 0.03) + (random() - 0.5) * 0.04, size / 2, mouth.z + dir.z * (0.03 + i * 0.03) + (random() - 0.5) * 0.04], iceMaterial).rotation.y = random() * 3;
      }
    }
    if (a.scene === 'pair') {
      const other = tumbler(0, 'neat', false);
      other.position.set(0.15, 0, 0.0);
    }
    // A wet ring where the glass stood.
    if (mood.wear > 0.3 || tipped) s.ring(0.036, 0.0012, [tipped ? 0.0 : 0.11, 0.0007, tipped ? 0.1 : 0.1], new THREE.MeshStandardMaterial({ color: '#8c7a5c', transparent: true, opacity: 0.55, roughness: 0.2 })).rotation.x = Math.PI / 2;

    // The bottle.
    const bottle = new THREE.Group();
    s.root.add(bottle);
    const glassTint = a.bottle === 'decanter' ? '#dfeaec' : a.bottle === 'jug' ? '#9fb5a2' : a.spirit === 'clear' ? '#dfeaec' : '#a8702c';
    const bottleGlass = new THREE.MeshPhysicalMaterial({ color: glassTint, transparent: true, opacity: 0.46, roughness: 0.08 + mood.wear * 0.2, flatShading: a.bottle === 'decanter', clearcoat: 1 });
    const inBottle = (mesh: THREE.Mesh) => { bottle.add(mesh); return mesh; };
    let bodyR = 0.04, bodyH = 0.17, neckTop = 0.285, neckR = 0.0135;
    const fallen = a.scene === 'fallen';
    const left = fallen ? Math.min(a.level, 0.25) : a.level;
    if (a.bottle === 'square' || a.bottle === 'flask') {
      const depth = a.bottle === 'flask' ? 0.034 : 0.074, width = a.bottle === 'flask' ? 0.092 : 0.074;
      bodyH = a.bottle === 'flask' ? 0.15 : 0.165; neckTop = bodyH + 0.085; bodyR = width / 2;
      inBottle(s.box([width, bodyH, depth], [0, bodyH / 2, 0], bottleGlass));
      if (a.bottle === 'square') inBottle(s.cylinder(neckR, width * 0.62, 0.03, [0, bodyH + 0.015, 0], bottleGlass, 4)).rotation.y = Math.PI / 4;
      else inBottle(s.cylinder(neckR / (width / 2) * (depth / 2) * 2.4, depth / 2, 0.03, [0, bodyH + 0.015, 0], bottleGlass, 18)).scale.set(width / depth, 1, 1);
      inBottle(s.cylinder(neckR, neckR, neckTop - bodyH - 0.03, [0, (neckTop + bodyH + 0.03) / 2, 0], bottleGlass, 14));
      if (left > 0.02) inBottle(s.box([width - 0.008, bodyH * left * 0.96, depth - 0.008], [0, 0.004 + bodyH * left * 0.48, 0], liquor));
      const label = inBottle(s.mesh(new THREE.PlaneGeometry(width * 0.8, bodyH * (a.bottle === 'flask' ? 0.48 : 0.6)), labelTexture(a.bottle === 'flask' ? 'gold' : 'black', mood.wear, random), [0, bodyH * (a.bottle === 'flask' ? 0.38 : 0.45), depth / 2 + 0.0008]));
      label.castShadow = false;
    } else {
      const decanter = a.bottle === 'decanter';
      if (decanter) { bodyR = 0.052; bodyH = 0.13; neckTop = 0.19; neckR = 0.016; }
      const profile = decanter
        ? [[0, 0], [bodyR * 0.8, 0], [bodyR, 0.012], [bodyR, bodyH * 0.6], [neckR * 1.2, bodyH + 0.02], [neckR, neckTop - 0.01], [neckR * 1.5, neckTop]]
        : [[0, 0], [bodyR * 0.95, 0], [bodyR, 0.006], [bodyR, bodyH], [bodyR * 0.8, bodyH + 0.025], [neckR, bodyH + 0.055], [neckR, neckTop - 0.012], [neckR * 1.2, neckTop - 0.01], [neckR * 1.2, neckTop]];
      inBottle(s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), decanter ? 8 : 28), bottleGlass));
      const usable = decanter ? bodyH * 0.6 : bodyH;
      if (left > 0.02) inBottle(s.cylinder(bodyR - 0.005, bodyR - 0.005, usable * left * 0.96, [0, 0.005 + usable * left * 0.48, 0], liquor, decanter ? 8 : 24));
      if (!decanter) {
        const kind = a.bottle === 'jug' ? 'tape' : 'cream';
        const high = kind === 'tape' ? 0.03 : bodyH * 0.58, arc = kind === 'tape' ? 1.5 : 2.3;
        const label = inBottle(s.mesh(new THREE.CylinderGeometry(bodyR + 0.0008, bodyR + 0.0008, high, 24, 1, true, -arc / 2, arc), labelTexture(kind, mood.wear, random), [0, bodyH * 0.5, 0]));
        label.castShadow = false;
        if (a.bottle === 'round') inBottle(s.cylinder(neckR * 1.25, neckR * 1.15, 0.05, [0, neckTop - 0.03, 0], s.material('#9c1f1c', { roughness: 0.35 }), 14));
      }
    }
    const neckY=neckTop-.028;
    if(a.neckMark==='band'){inBottle(s.cylinder(neckR*1.08,neckR*1.08,.012,[0,neckY,0],s.material('#ba9b51',{metalness:.8,roughness:.4}),20));}
    else if(a.neckMark==='seal'){const seal=inBottle(s.cylinder(.011,.011,.004,[0,neckY,neckR+.002],s.material('#8c2931'),14));seal.rotation.x=Math.PI/2;}
    else{const thread=s.material('#c0ab7b');const hoop=s.ring(neckR*1.08,.001,[0,neckY,0],thread);hoop.rotation.x=Math.PI/2;bottle.add(hoop);if(a.neckMark==='tag'){bottle.add(s.rod([0,neckY,neckR],[0,neckY-.024,neckR+.009],.0008,thread));const tag=s.label('RESERVE',.029,.018,[0,neckY-.031,neckR+.01],'#473d2b','#e6d9b7');bottle.add(tag);}else for(const side of [-1,1])bottle.add(s.tube([[0,neckY,neckR+.002],[side*.012,neckY+.006,neckR+.003],[side*.02,neckY-.002,neckR+.004],[0,neckY,neckR+.002],[side*.015,neckY-.024,neckR+.005]],.001,thread));}
    // Cap, cork or stopper: on the bottle, or tossed aside.
    const off = a.scene === 'open' || fallen;
    const capGroup = new THREE.Group();
    if (a.bottle === 'decanter') {
      capGroup.add(s.ball([0.02, 0.02, 0.02], [0, 0.03, 0], crystal, 8), s.cylinder(0.012, 0.009, 0.03, [0, 0.005, 0], crystal, 8));
    } else if (a.bottle === 'jug') {
      capGroup.add(s.cylinder(0.012, 0.01, 0.028, [0, 0.006, 0], s.material('#b98d5a', { roughness: 1 }), 12));
    } else {
      capGroup.add(s.cylinder(neckR * 1.3, neckR * 1.3, 0.022, [0, 0.011, 0], s.material(a.bottle === 'round' ? '#9c1f1c' : '#1b1b1d', { metalness: 0.4, roughness: 0.4 }), 16));
    }
    if (off) {
      capGroup.position.set(-0.03 + random() * 0.05, a.bottle === 'decanter' ? 0.012 : 0, 0.11 + random() * 0.03);
      if (a.bottle === 'decanter') capGroup.rotation.z = 1.5;
      s.root.add(capGroup);
    } else {
      capGroup.position.y = neckTop - (a.bottle === 'decanter' || a.bottle === 'jug' ? 0.008 : 0.016);
      bottle.add(capGroup);
    }
    if (fallen) {
      const lie = new THREE.Group();
      s.root.remove(bottle);
      bottle.rotation.z = -Math.PI / 2;
      bottle.position.y = a.bottle === 'flask' ? 0.017 : bodyR;
      if (a.bottle === 'flask') bottle.rotation.x = Math.PI / 2;
      lie.add(bottle);
      lie.position.set(-0.1, 0, -0.05);
      lie.rotation.y = mix(-0.5, 0.2, random());
      s.root.add(lie);
      // Trickle from the neck.
      const dir = new THREE.Vector3(Math.cos(lie.rotation.y), 0, -Math.sin(lie.rotation.y));
      const pool = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, roughness: 0.05, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 4; i++) {
        const r = mix(0.02, 0.045, random()) * mix(0.5, 1, a.level);
        s.cylinder(r, r, 0.0012, [lie.position.x + dir.x * (neckTop + 0.02 + i * 0.012) + (random() - 0.5) * 0.02, 0.0006 + i * 0.00005, lie.position.z + dir.z * (neckTop + 0.02 + i * 0.012) + (random() - 0.5) * 0.02], pool, 20);
      }
      main.position.set(0.1, 0, 0.12);
    } else {
      bottle.position.set(-0.06, 0, -0.03);
      bottle.rotation.y = mix(-0.35, 0.35, random());
    }
    // The tumbler rests on its coaster; in the spill scene the coaster remains beside it.
    const coasterY=a.coaster==='cork'?.005:a.coaster==='tin'?.003:.002,cx=tipped?main.position.x-.065:main.position.x,cz=tipped?main.position.z-.06:main.position.z;
    const coasterPaint=s.material({cork:'#a87c47',slate:'#555d60',tin:'#bcc0bc',felt:'#355e45'}[a.coaster],{roughness:a.coaster==='tin'?.3:.9,metalness:a.coaster==='tin'?.65:0});
    if(a.coaster==='slate')s.box([.106,coasterY,.106],[cx,coasterY/2,cz],coasterPaint);else s.cylinder(.055,.055,coasterY,[cx,coasterY/2,cz],coasterPaint,32);
    if(a.coaster==='tin'){const rim=s.ring(.053,.0015,[cx,coasterY+.001,cz],coasterPaint);rim.rotation.x=Math.PI/2;}
    if(!tipped)main.position.y+=coasterY;
    if(a.garnish==='lemon'){s.tube([[.16,.003,.09],[.175,.006,.083],[.184,.009,.098],[.174,.006,.11],[.16,.003,.104]],.003,s.material('#d9b72c'));}
    if(a.garnish==='orange'){s.cylinder(.026,.026,.004,[.17,.002,.105],s.material('#d77a24'),24);s.cylinder(.022,.022,.0008,[.17,.0044,.105],s.material('#f3bb62'),24);for(let i=0;i<8;i++){const t=i*Math.PI/4;s.rod([.17,.0049,.105],[.17+Math.cos(t)*.021,.0049,.105+Math.sin(t)*.021],.0005,s.material('#f5ddb1'));}}
    if(a.garnish==='cherry'){s.ball([.009,.009,.009],[.17,.009,.105],s.material('#aa2730',{roughness:.3}),14);s.tube([[.17,.017,.105],[.174,.03,.106],[.18,.033,.107]],.0008,s.material('#596936'));}
    for(const item of [main,...(off?[capGroup]:[])]){item.updateMatrixWorld(true);const support=item===main&&!tipped?coasterY:0;item.position.y+=support-new THREE.Box3().setFromObject(item,true).min.y;}
    return s.finish();
  },
});

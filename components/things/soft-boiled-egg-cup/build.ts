import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CUP: readonly (readonly [number, number])[] = [
  [0, 0], [0.024, 0], [0.0235, 0.004], [0.011, 0.012], [0.0085, 0.02], [0.012, 0.027], [0.02, 0.035], [0.0245, 0.046], [0.0258, 0.058],
];
const cupRadius = (y: number) => {
  for (let i = 1; i < CUP.length; i++)
    if (y <= CUP[i][1]) return mix(CUP[i - 1][0], CUP[i][0], (y - CUP[i - 1][1]) / Math.max(CUP[i][1] - CUP[i - 1][1], 1e-6));
  return CUP[CUP.length - 1][0];
};
const EGG_H = 0.064, EGG_R = 0.0232, CUT = 0.74;
const eggRadius = (t: number) => EGG_R * Math.sqrt(Math.max(0, 4 * t * (1 - t))) * (1 + 0.2 * (0.5 - t));

export default defineThing({
  questions: {
    form: choice('What is the shape of the egg cup?',{footed:'A narrow stem above a broad round foot.',barrel:'A compact straight-sided barrel cup.',cone:'A simple tapered cup without a separate stem.',ribbed:'A footed cup with gently fluted sides.'}),
    breakEdge: choice('How was the eggshell top removed?',{tapped:'An uneven rim from tapping with a spoon.',cut:'A clean level rim from an egg-top cutter.',scallop:'A ring of small rounded chips.',chip:'One larger missing chip at the front.'}),
    spoonHandle: choice('What handle does the egg spoon have?',{steel:'A plain polished steel handle.',ivory:'A cream resin handle with a metal collar.',wood:'A warm turned wooden handle.',blue:'A blue painted handle with pale dots.'}),
    seasoning: choice('What seasoning is visible on the egg?',{pepper:'A few dark cracked pepper grains.',paprika:'A light dusting of red paprika.',chives:'Several short green chive pieces.',salt:'Tiny pale flakes of salt.'}),
    soldierCut: choice('How were the toast soldiers cut?',{slim:'Narrow delicate fingers.',broad:'Broad thick fingers for dipping.',square:'Regular square-edged sticks.',crinkle:'Wavy crinkle-cut sides.'}),
    companion: choice('Which small breakfast accessory sits nearby?',{sand:'A tiny wooden three-minute sand timer.',dial:'A round mechanical kitchen timer.',napkin:'A neatly folded linen napkin.',rest:'A small ceramic spoon rest.'}),
    pattern: choice('What is the egg cup like?', {
      white: 'Plain white china, a hotel or hospital cup.',
      cornish: 'Broad blue and white bands, classic kitchen stripeware.',
      dots: 'White with fat red polka dots, cheerful and a bit silly.',
      chick: 'A yellow novelty cup with a painted chick face, bought for a child.',
      willow: 'Blue-and-white transfer print, flowers and scrolls, from a grandmother’s set.',
      gold: 'Fine bone china with a gold rim, used on Sundays.',
      wood: 'A turned wooden cup, plain and Scandinavian.',
    }),
    eaten: score('How much of the egg has been eaten?', [
      'Top only just cracked off, untouched',
      'A few spoonfuls gone',
      'Half scooped out',
      'Scraped to an empty shell',
    ]),
    yolk: score('How runny is the yolk?', [
      'Boiled hard, pale and chalky',
      'Just set, fudgy',
      'Soft and glossy',
      'Running over the rim and down the cup',
    ]),
    soldiers: choice('What toast is alongside?', {
      stack: 'A neat log-pile of buttered white soldiers, cut by someone careful.',
      scattered: 'A few soldiers left, scattered, one bitten short.',
      marmite: 'Soldiers spread dark with yeast extract.',
      crusts: 'Only the crusts are left, lined up and refused.',
      none: 'No toast at all.',
    }),
    dipped: noul('Is a soldier left standing, dipped in the egg?'),
    shell: choice('What colour is the eggshell?', {
      brown: 'Ordinary warm brown.',
      white: 'Chalk white.',
      speckled: 'Buff with dark speckles, from someone’s own hens.',
      blue: 'Pale blue-green, a fancy breed.',
    }),
    plate: choice('What does it all sit on?', {
      saucer: 'A plain white tea plate.',
      enamel: 'A white enamel plate with a blue rim.',
      melamine: 'A bright plastic child’s plate.',
      board: 'A small round wooden board.',
    }),
    extra: choice('What else has been left beside it?', {
      none: 'Nothing else.',
      cosy: 'A little knitted egg cosy with a pompom, taken off and set down.',
      second: 'A second egg waiting in its cup, still under its knitted cosy.',
      salt: 'A salt cellar and a spilled pinch of salt.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;

    const cupProfile: [number,number][]=CUP.map(([r,y])=>[a.form==='barrel'&&y>.003?mix(.021,.0258,y/.058):a.form==='cone'&&y>.003?mix(.016,.0258,y/.058):r,y]);
    const actualCupRadius=(y:number)=>{for(let i=1;i<cupProfile.length;i++)if(y<=cupProfile[i][1])return mix(cupProfile[i-1][0],cupProfile[i][0],(y-cupProfile[i-1][1])/Math.max(.0001,cupProfile[i][1]-cupProfile[i-1][1]));return .0258;};
    // Plate.
    const plateTint = { saucer: '#f3f0e6', enamel: '#f4f3ee', melamine: ['#f2c230', '#e85d4a', '#4aa3d8', '#6cc070'][Math.floor(random() * 4)], board: '#b98852' }[a.plate];
    const plateSkin = s.material(plateTint, { roughness: a.plate === 'board' ? 0.8 : 0.3, side: THREE.DoubleSide });
    let top = 0.007;
    if (a.plate === 'board') {
      s.cylinder(0.105, 0.102, 0.014, [0, 0.007, 0], plateSkin, 40);
      top = 0.014;
    } else {
      s.lathe([[0, 0.006], [0.062, 0.006], [0.07, 0.007], [0.098, 0.015], [0.1, 0.0125], [0.07, 0.003], [0.06, 0], [0, 0]], plateSkin);
      if (a.plate === 'enamel') s.ring(0.099, 0.0022, [0, 0.0142, 0], s.material('#1f3f8a', { roughness: 0.3 })).rotation.x = Math.PI / 2;
      top = 0.0065;
    }

    // Cup skin.
    const cupTexture = paint(512, 256, (g, w, h) => {
      const base = { white: '#f6f4ee', cornish: '#f6f4ee', dots: '#f8f5ee', chick: '#f6cf3a', willow: '#f4f5f4', gold: '#fbf8f0', wood: '#c69a63' }[a.pattern];
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      // v runs foot (bottom of canvas) to rim (top); the bowl of the cup is the top half.
      if (a.pattern === 'cornish') {
        g.fillStyle = '#2f61b5';
        for (const [y, t] of [[14, 30], [62, 30], [110, 22], [200, 30]] as const) g.fillRect(0, y, w, t);
      } else if (a.pattern === 'dots') {
        g.fillStyle = '#d6332b';
        for (let row = 0; row < 3; row++)
          for (let i = 0; i < 8; i++) {
            g.beginPath();
            g.ellipse((i + (row % 2) * 0.5) * 64 + 20, 24 + row * 44, 15, 13, 0, 0, Math.PI * 2);
            g.fill();
          }
      } else if (a.pattern === 'chick') {
        g.fillStyle = '#2a2018';
        for (const x of [-34, 34]) { g.beginPath(); g.arc(w / 2 + x, 46, 9, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f08020';
        g.beginPath(); g.moveTo(w / 2 - 16, 66); g.lineTo(w / 2 + 16, 66); g.lineTo(w / 2, 92); g.fill();
        g.fillStyle = '#f59aa0';
        for (const x of [-62, 62]) { g.beginPath(); g.arc(w / 2 + x, 76, 12, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f08020';
        g.fillRect(0, 232, w, 24);
      } else if (a.pattern === 'willow') {
        g.strokeStyle = g.fillStyle = '#2d55a8';
        g.lineWidth = 4;
        g.fillRect(0, 4, w, 7);
        g.fillRect(0, 122, w, 5);
        for (let i = 0; i < 6; i++) {
          const x = i * 85 + 40;
          for (let p = 0; p < 6; p++) { g.beginPath(); g.ellipse(x + Math.cos(p) * 15, 64 + Math.sin(p) * 15, 11, 6, p, 0, Math.PI * 2); g.fill(); }
          g.beginPath(); g.moveTo(x + 20, 64); g.bezierCurveTo(x + 40, 30, x + 50, 100, x + 66, 64); g.stroke();
        }
        g.fillRect(0, 236, w, 10);
      } else if (a.pattern === 'gold') {
        g.fillStyle = '#c9a03a';
        g.fillRect(0, 0, w, 12);
        g.fillRect(0, 24, w, 3);
        g.fillRect(0, 238, w, 8);
      } else if (a.pattern === 'wood') {
        g.strokeStyle = 'rgba(90,55,20,0.35)';
        for (let y = 4; y < h; y += 7 + ((y * 7) % 5)) { g.lineWidth = 1 + (y % 3); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 2); g.stroke(); }
      }
    });
    const cupSkin = new THREE.MeshStandardMaterial({ map: cupTexture, roughness: a.pattern === 'wood' ? 0.75 : 0.22 + mood.wear * 0.3, side: THREE.DoubleSide });
    const shellTint = { brown: '#c98a5a', white: '#f3efe6', speckled: '#d8b98e', blue: '#b9d6cf' }[a.shell];
    const shellTexture = a.shell === 'speckled'
      ? paint(256, 256, (g, w, h) => {
        g.fillStyle = shellTint; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(70,40,20,0.75)';
        for (let i = 0; i < 150; i++) { g.beginPath(); g.arc(random() * w, random() * h, 1 + random() * 3.5, 0, Math.PI * 2); g.fill(); }
      })
      : null;
    const shellSkin = new THREE.MeshStandardMaterial({ color: shellTexture ? '#ffffff' : shellTint, map: shellTexture, roughness: 0.7, side: THREE.DoubleSide });
    const white = s.material('#fbf9f1', { roughness: 0.35 });
    const yolkTint = new THREE.Color('#ecd27a').lerp(new THREE.Color('#f39a12'), Math.min(1, a.yolk * 1.25));
    const yolkSkin = new THREE.MeshStandardMaterial({ color: yolkTint, roughness: mix(0.85, 0.12, a.yolk), emissive: yolkTint, emissiveIntensity: mix(0.02, 0.28, a.yolk) });
    const steel = s.material('#d9dcdc', { metalness: 0.85, roughness: 0.25 });

    const eggProfile = (from: number, to: number, steps: number) =>
      Array.from({ length: steps + 1 }, (_unused, i) => {
        const t = mix(from, to, i / steps);
        return [Math.max(eggRadius(t), 0.0001), t * EGG_H] as const;
      });

    const cupAt = (x: number, z: number, open: boolean) => {
      const cup = s.lathe(cupProfile, cupSkin, [x, top, z]);
      if(a.form==='ribbed'){const pos=cup.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){const xx=pos.getX(i),zz=pos.getZ(i),f=1+.055*Math.cos(Math.atan2(zz,xx)*12);if(pos.getY(i)>.026)pos.setXYZ(i,xx*f,pos.getY(i),zz*f);}cup.geometry.computeVertexNormals();}
      cup.rotation.y = Math.PI;
      const base = top + 0.03;
      if (!open) {
        s.lathe(eggProfile(0, 1, 18), shellSkin, [x, base, z]);
        return base;
      }
      const shell = s.lathe(eggProfile(0, CUT, 14), shellSkin, [x, base, z]);
      // A ragged edge where the top was tapped off.
      const position = shell.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++)
        if (position.getY(i) > CUT * EGG_H - 0.0005) {const theta=Math.atan2(position.getZ(i),position.getX(i));const delta=a.breakEdge==='cut'?0:a.breakEdge==='scallop'?-.0015*Math.abs(Math.sin(theta*9)):a.breakEdge==='chip'?(Math.cos(theta-Math.PI/2)>.83?-.006:0):wobble(.0022);position.setY(i,position.getY(i)+delta);}
      shell.geometry.computeVertexNormals();
      return base;
    };

    const cx = 0.03, cz = -0.005;
    const base = cupAt(cx, cz, true);
    const level = CUT - 0.004 - a.eaten * 0.5;
    const inner = eggRadius(level) * 0.97;
    const surface = s.mesh(new THREE.CircleGeometry(inner, 28), a.eaten > 0.93 ? s.material('#efe6d2', { roughness: 0.8 }) : white, [cx, base + level * EGG_H, cz]);
    surface.rotation.x = -Math.PI / 2;
    const yolkLeft = Math.max(0, 1 - a.eaten * 1.05);
    if (yolkLeft > 0.03) {
      const dome = s.ball([inner * 0.78 * mix(0.55, 1, yolkLeft), 0.003 + 0.004 * yolkLeft * (1 - a.yolk * 0.5), inner * 0.78 * mix(0.55, 1, yolkLeft)], [cx + wobble(0.002), base + level * EGG_H, cz + wobble(0.002)], yolkSkin, 20);
      dome.castShadow = false;
    }
    // Seasoning follows the exposed edible surface, with only residue in an empty shell.
    const seasoning=s.material({pepper:'#4e3b2d',paprika:'#a74526',chives:'#5b793c',salt:'#fffdf2'}[a.seasoning],{roughness:1});
    for(let i=0;i<(a.seasoning==='paprika'?32:12);i++){const t=random()*Math.PI*2,r=Math.sqrt(random())*inner*.65;const y=base+level*EGG_H+(yolkLeft>.03?.0035:0);
      if(a.seasoning==='chives')s.rod([cx+Math.cos(t)*r,y,cz+Math.sin(t)*r],[cx+Math.cos(t)*r+.003,y+.0003,cz+Math.sin(t)*r+.001],.00045,seasoning);
      else s.ball([a.seasoning==='paprika'?.00055:.0008,.0004,.0008],[cx+Math.cos(t)*r,y+.0003,cz+Math.sin(t)*r],seasoning,6);
    }
    // Yolk escaping down the shell and the cup.
    const runs = a.yolk > 0.5 && a.eaten < 0.9 ? Math.round((a.yolk - 0.45) * 6 + random()) : 0;
    for (let i = 0; i < runs; i++) {
      const angle = wobble(1.5) + (i % 2 ? 0.5 : -0.4);
      const reach = mix(0.012, 0.062, (a.yolk - 0.5) * 2) * mix(0.6, 1, random());
      const points: [number, number, number][] = [];
      const cutY = base + CUT * EGG_H;
      for (let d = -0.002; d <= reach; d += 0.004) {
        const y = cutY - d;
        const r = d < 0 ? eggRadius(CUT) * 0.85 : Math.max(eggRadius((y - base) / EGG_H), y - top < 0.058 ? actualCupRadius(y - top) : 0) + 0.0008;
        const drift = angle + Math.sin(d * 60 + i) * 0.04;
        points.push([cx + Math.sin(drift) * r, y, cz + Math.cos(drift) * r]);
      }
      if (points.length < 3) continue;
      s.tube(points, 0.0026, yolkSkin);
      const end = points[points.length - 1];
      s.ball([0.0031, 0.0042, 0.0031], end, yolkSkin, 10);
    }
    if (a.yolk > 0.85 && a.eaten < 0.9) s.ball([0.012, 0.0012, 0.009], [cx + 0.012, top + 0.001, cz + 0.03], yolkSkin, 16);

    // The cracked-off top, upturned on the plate like a tiny bowl, and stray shell.
    const cap = new THREE.Group();
    const capShell = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(CUT, 1, 8).map(([x, y]) => new THREE.Vector2(x, y - EGG_H)), 24), shellSkin);
    const capWhite = new THREE.Mesh(new THREE.CircleGeometry(eggRadius(CUT) * 0.95, 20), white);
    capWhite.rotation.x = Math.PI / 2;
    capWhite.position.y = (CUT - 1) * EGG_H + 0.002;
    capShell.castShadow = capWhite.receiveShadow = true;
    cap.add(capShell, capWhite);
    cap.rotation.set(Math.PI + wobble(0.25), wobble(3), wobble(0.25));
    cap.position.set(cx + 0.035 + wobble(0.006), top + 0.0005, cz + 0.045 + wobble(0.006));
    cap.updateMatrixWorld(true);cap.position.y+=top-new THREE.Box3().setFromObject(cap,true).min.y;
    s.root.add(cap);
    const bits = Math.round(mix(1, 9, a.eaten) * mix(0.6, 1.5, mood.density));
    s.scatter(new THREE.TetrahedronGeometry(1), shellSkin, Array.from({ length: bits }, () => {
      const angle = random() * Math.PI * 2, r = 0.03 + random() * 0.035;
      return { at: [cx + Math.sin(angle) * r, top + 0.0012, cz + Math.cos(angle) * r * 0.9] as const, size: 0.0022 + random() * 0.003 };
    }));

    // Spoon: resting in the shell once eating has begun, otherwise laid on the plate.
    const spoon = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), steel);
    bowl.scale.set(0.0085, 0.0028, 0.0125);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0026, 0.078, 8), steel);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.05;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steel);
    tip.scale.set(0.0042, 0.0018, 0.006);
    tip.position.z = 0.09;
    bowl.castShadow = handle.castShadow = tip.castShadow = true;
    spoon.add(bowl, handle, tip);
    if(a.spoonHandle!=='steel'){
      const grip=new THREE.Mesh(new THREE.CylinderGeometry(.003,.004,.055,12),s.material({ivory:'#e6d9b9',wood:'#a66f39',blue:'#4e7194'}[a.spoonHandle]));grip.rotation.x=Math.PI/2;grip.position.z=.066;spoon.add(grip);
      if(a.spoonHandle==='blue')for(let i=0;i<5;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.0009,6,4),white);dot.position.set(0,.0038,.046+i*.01);spoon.add(dot);}
    }
    if (a.eaten > 0.2 && a.eaten < 0.85 && !a.dipped) {
      spoon.position.set(cx, base + level * EGG_H + 0.003, cz);
      spoon.rotation.set(-0.95, 0.7 + wobble(0.5), 0);
    } else {
      spoon.position.set(cx + 0.058, top + 0.006, cz - 0.03 + wobble(0.01));
      spoon.rotation.set(-0.06, 0.25 + wobble(0.3), 0);
    }
    s.root.add(spoon);

    // Toast soldiers.
    const crust = s.material('#9a5f2a', { roughness: 0.9 });
    const crumb = s.material(a.soldiers === 'marmite' ? '#3d2412' : '#e9c47c', { roughness: 0.85 });
    const butter = s.material('#f6dc7a', { roughness: 0.3 });
    const soldierWidth={slim:.014,broad:.027,square:.02,crinkle:.021}[a.soldierCut];
    const soldier = (x: number, y: number, z: number, turn: number, length = 0.082, tilt = 0) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(soldierWidth, 0.011, length), crust);
      const face = new THREE.Mesh(new THREE.BoxGeometry(soldierWidth-.0035, 0.0115, length - 0.004), crumb);
      face.position.y = 0.0006;
      const melt = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0122, length * 0.6), a.soldiers === 'marmite' ? crumb : butter);
      melt.position.set(0.001, 0.0004, 0.004);
      body.castShadow = body.receiveShadow = true;
      group.add(body, face, melt);
      if(a.soldierCut==='crinkle')for(const side of [-1,1])for(let i=0;i<10;i++){const nub=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.011,8),crust);nub.position.set(side*soldierWidth/2,0,-length/2+.004+i*(length-.008)/9);group.add(nub);}
      group.position.set(x, y, z);
      group.rotation.set(tilt, turn, 0);
      s.root.add(group);
      return group;
    };
    const sx = -0.052;
    if (a.soldiers === 'stack' || a.soldiers === 'marmite') {
      for (let i = 0; i < 3; i++) soldier(sx - 0.022 + i * 0.023, top + 0.0056, 0.004 + wobble(0.003), wobble(0.05));
      for (let i = 0; i < 2; i++) soldier(sx + wobble(0.004), top + 0.0168, -0.022 + i * 0.05, Math.PI / 2 + wobble(0.08), 0.07);
      if (a.soldiers === 'stack') soldier(sx + 0.002, top + 0.028, 0.004, 0.3 + wobble(0.2));
    } else if (a.soldiers === 'scattered') {
      soldier(sx - 0.012, top + 0.0056, 0.01, 0.5 + wobble(0.3));
      soldier(sx + 0.012, top + 0.0056, -0.03, -0.7 + wobble(0.3), 0.045);
      soldier(sx + 0.02, top + 0.0056, 0.045, 1.3 + wobble(0.3));
    } else if (a.soldiers === 'crusts') {
      for (let i = 0; i < 4; i++) s.box([0.006, 0.009, 0.07 + wobble(0.012)], [sx - 0.02 + i * 0.013, top + 0.0045, wobble(0.006)], crust).rotation.y = wobble(0.12);
    }
    if (a.soldiers !== 'none') {
      const crumbs = Math.round(mix(6, 40, mood.density));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), crust, Array.from({ length: crumbs }, () => {
        const angle = random() * Math.PI * 2, r = random() * 0.045;
        return { at: [sx + Math.sin(angle) * r, top + 0.001, Math.cos(angle) * r * 1.3] as const, size: 0.001 + random() * 0.0018, color: random() > 0.5 ? '#e0b46a' : '#8a5425' };
      }));
    }
    if (a.dipped && a.eaten < 0.9) {
      const dunk = soldier(cx - 0.006, base + level * EGG_H + 0.026, cz + 0.004, wobble(0.6), 0.08, Math.PI / 2 - 0.3);
      const smear = new THREE.Mesh(new THREE.BoxGeometry(0.0215, 0.0125, 0.018), yolkSkin);
      smear.position.z = 0.032;
      dunk.add(smear);
    }

    // What was left beside it.
    const cosy = (x: number, y: number, z: number, lying: boolean) => {
      const group = new THREE.Group();
      const hues = mood.cheer > 0.5 ? ['#d8443a', '#f3ead6'] : ['#5a6f8a', '#d9d4c4'];
      const knit = paint(64, 64, (g) => {
        for (let i = 0; i < 8; i++) { g.fillStyle = hues[i % 2]; g.fillRect(0, i * 8, 64, 8); }
        g.strokeStyle = 'rgba(0,0,0,0.18)';
        for (let x2 = 0; x2 < 64; x2 += 4) { g.beginPath(); g.moveTo(x2, 0); g.lineTo(x2, 64); g.stroke(); }
      });
      const wool = new THREE.MeshStandardMaterial({ map: knit, roughness: 1, side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0.029, 0], [0.03, 0.012], [0.028, 0.03], [0.02, 0.046], [0.008, 0.056], [0.0005, 0.058]].map(([r, h]) => new THREE.Vector2(r, h)), 24), wool);
      const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.011, 1), new THREE.MeshStandardMaterial({ color: hues[0], roughness: 1, flatShading: true }));
      pom.position.y = 0.064;
      body.castShadow = pom.castShadow = true;
      group.add(body, pom);
      group.position.set(x, y, z);
      if (lying) group.rotation.set(0, wobble(1), Math.PI / 2 - 0.12);
      s.root.add(group);
    };
    if (a.extra === 'cosy') cosy(0.02, 0.03, 0.125, true);
    if (a.extra === 'second') {
      const tableTop = top;
      top = 0;
      const second = cupAt(-0.09, 0.115, false);
      cosy(-0.09, second + 0.012, 0.115, false);
      top = tableTop;
    }
    if (a.extra === 'salt') {
      const glass = s.material('#e9eef0', { roughness: 0.15 });
      s.lathe([[0, 0], [0.016, 0], [0.018, 0.006], [0.013, 0.03], [0.014, 0.045]], glass, [0.115, 0, 0.075]);
      s.cylinder(0.011, 0.0145, 0.012, [0.115, 0.051, 0.075], steel, 16);
      s.ball([0.011, 0.005, 0.011], [0.115, 0.057, 0.075], steel, 14);
      s.scatter(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff'), Array.from({ length: 70 }, () => {
        const angle = random() * Math.PI * 2, r = random() * random() * 0.03;
        return { at: [0.085 + Math.sin(angle) * r, 0.0008, 0.115 + Math.cos(angle) * r] as const, size: 0.0012 + random() * 0.001 };
      }));
    }

    const accessory=new Sculpture(context),wood=accessory.material('#b58a56'),linen=accessory.material('#eee6d1');
    if(a.companion==='sand'){
      for(const y of [.004,.077])accessory.cylinder(.024,.024,.008,[0,y,0],wood,20);
      for(let i=0;i<3;i++){const t=i*Math.PI*2/3;accessory.rod([Math.cos(t)*.02,.008,Math.sin(t)*.02],[Math.cos(t)*.02,.073,Math.sin(t)*.02],.002,wood);}
      accessory.lathe([[.015,.009],[.016,.018],[.009,.03],[.002,.04],[.009,.05],[.016,.065],[.015,.072]],new THREE.MeshPhysicalMaterial({color:'#e2ece8',transparent:true,opacity:.28,roughness:.08,side:THREE.DoubleSide}));
      accessory.cylinder(.003,.013,.018,[0,.018,0],accessory.material('#d4b56c'),20);accessory.cylinder(.011,.002,.014,[0,.061,0],accessory.material('#d4b56c'),20);accessory.rod([0,.031,0],[0,.052,0],.00055,accessory.material('#d4b56c'));
    }
    if(a.companion==='dial'){
      accessory.cylinder(.027,.03,.025,[0,.0125,0],accessory.material('#ece6d6'),32);
      const face=paint(128,128,(g)=>{g.fillStyle='#f5f0dd';g.fillRect(0,0,128,128);g.strokeStyle='#34444b';for(let i=0;i<12;i++){const t=i*Math.PI/6;g.lineWidth=i%3?2:4;g.beginPath();g.moveTo(64+Math.sin(t)*45,64-Math.cos(t)*45);g.lineTo(64+Math.sin(t)*54,64-Math.cos(t)*54);g.stroke();}g.lineWidth=4;g.beginPath();g.moveTo(64,64);g.lineTo(92,40);g.stroke();});
      accessory.mesh(new THREE.CircleGeometry(.026,32),new THREE.MeshStandardMaterial({map:face}),[0,.0253,0]).rotation.x=-Math.PI/2;accessory.box([.012,.009,.027],[0,.03,0],accessory.material('#567d8c'));
    }
    if(a.companion==='napkin'){accessory.box([.075,.003,.065],[0,.0015,0],linen);const fold=accessory.box([.037,.003,.065],[-.015,.0045,0],linen);fold.rotation.y=.08;for(let i=0;i<12;i++)accessory.rod([-.034+i*.006,.002,.033],[-.034+i*.006,.002,.038],.0004,linen);}
    if(a.companion==='rest'){const dish=accessory.lathe([[0,0],[.014,0],[.022,.004],[.024,.008],[.021,.009],[.014,.003],[0,.003]],s.material('#c8d9d9',{roughness:.3,side:THREE.DoubleSide}));dish.scale.z=1.8;}
    accessory.root.position.set(-.13,0,-.075);accessory.root.rotation.y=.24;s.root.add(accessory.root);
    return s.finish();
  },
});
